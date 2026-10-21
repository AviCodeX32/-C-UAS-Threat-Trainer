import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { initDatabase, memoryStore, isPostgresConnected } from './db/index.js';
import { SimulationEngine } from './sim/engine.js';
import { ClientMessage, SCENARIO_PRESETS, ServerMessage } from './shared/index.js';

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  await initDatabase();

  const app = express();
  app.use(cors());
  app.use(express.json());

  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  let activeEngine: SimulationEngine | null = null;
  const connectedClients = new Set<WebSocket>();

  function createOrResetEngine(scenarioId?: string) {
    if (activeEngine) {
      activeEngine.stop();
    }

    activeEngine = new SimulationEngine(
      scenarioId,
      (engine) => {
        // Broadcast tick to all connected clients
        const tickPacket: ServerMessage = {
          type: 'TICK',
          time: engine.simTimeSeconds,
          drones: engine.drones,
          jammer: engine.jammer,
          spoof: engine.spoof,
          kinetic: engine.kinetic,
          vitals: engine.vitals,
          recentEvents: engine.recentEvents.slice(0, 6),
          scenarioStatus: engine.status
        };
        const serialized = JSON.stringify(tickPacket);
        for (const client of connectedClients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(serialized);
          }
        }
      },
      (engine, scorecard) => {
        // Broadcast scenario complete
        const completePacket: ServerMessage = {
          type: 'SCENARIO_COMPLETE',
          aarScorecard: scorecard
        };
        const serialized = JSON.stringify(completePacket);
        for (const client of connectedClients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(serialized);
          }
        }
      }
    );

    activeEngine.isPaused = connectedClients.size === 0;
    activeEngine.start();

    // Broadcast SCENARIO_LOADED to all clients so next scenario or reset syncs immediately
    const loadedPacket: ServerMessage = {
      type: 'SCENARIO_LOADED',
      scenario: activeEngine.scenario,
      drones: activeEngine.drones,
      jammer: activeEngine.jammer,
      spoof: activeEngine.spoof,
      kinetic: activeEngine.kinetic,
      vitals: activeEngine.vitals
    };
    const serializedLoaded = JSON.stringify(loadedPacket);
    for (const client of connectedClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(serializedLoaded);
      }
    }
  }

  // REST endpoints
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      postgresConnected: isPostgresConnected,
      activeClients: connectedClients.size,
      activeScenario: activeEngine?.scenario.codename
    });
  });

  app.get('/api/scenarios', (req, res) => {
    res.json(SCENARIO_PRESETS);
  });

  app.get('/api/history', (req, res) => {
    const sessions = Array.from(memoryStore.gameSessions.values());
    const scorecards = Array.from(memoryStore.aarScorecards.values());
    res.json({ sessions, scorecards });
  });

  // Start with default scenario
  createOrResetEngine('scenario_recon_infil');

  // WebSocket lifecycle
  wss.on('connection', (ws) => {
    connectedClients.add(ws);
    console.log(`[WS] Client connected. Total active: ${connectedClients.size}`);

    if (activeEngine) {
      if (activeEngine.status !== 'running') {
        createOrResetEngine(activeEngine.scenario.id);
      } else {
        activeEngine.isPaused = false;
      }

      // Send initial snapshot so reconnecting clients immediately sync without resetting sim clock
      const initialSnapshot: ServerMessage = {
        type: 'SCENARIO_LOADED',
        scenario: activeEngine.scenario,
        drones: activeEngine.drones,
        jammer: activeEngine.jammer,
        spoof: activeEngine.spoof,
        kinetic: activeEngine.kinetic,
        vitals: activeEngine.vitals
      };
      ws.send(JSON.stringify(initialSnapshot));

      // Also send immediate initial TICK packet
      const immediateTick: ServerMessage = {
        type: 'TICK',
        time: activeEngine.simTimeSeconds,
        drones: activeEngine.drones,
        jammer: activeEngine.jammer,
        spoof: activeEngine.spoof,
        kinetic: activeEngine.kinetic,
        vitals: activeEngine.vitals,
        recentEvents: activeEngine.recentEvents.slice(0, 6),
        scenarioStatus: activeEngine.status
      };
      ws.send(JSON.stringify(immediateTick));
    }

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as ClientMessage;
        if (!activeEngine) return;

        switch (msg.type) {
          case 'SELECT_SCENARIO':
            createOrResetEngine(msg.scenarioId);
            break;
          case 'RESTART_SCENARIO':
            createOrResetEngine(activeEngine.scenario.id);
            break;
          case 'SET_JAMMER_ANGLE':
            activeEngine.setJammerAngle(msg.azimuth);
            break;
          case 'FIRE_JAMMER':
            activeEngine.fireJammer(msg.active);
            break;
          case 'TOGGLE_JAMMER_BAND':
            activeEngine.toggleJammerBand(msg.band, msg.enabled);
            break;
          case 'TOGGLE_WIDEBAND':
            activeEngine.toggleWideband(msg.enabled);
            break;
          case 'ENGAGE_SPOOF':
            activeEngine.engageSpoof(msg.active, msg.mode);
            break;
          case 'FIRE_KINETIC':
            activeEngine.fireKinetic(msg.targetDroneId);
            break;
          case 'TAKE_COVER':
            activeEngine.takeCover();
            break;
          case 'DESIGNATE_TARGET':
            activeEngine.designateTarget(msg.droneId, msg.classification);
            break;
        }
      } catch (err: any) {
        console.error('[WS] Error processing message:', err.message);
      }
    });

    ws.on('close', () => {
      connectedClients.delete(ws);
      console.log(`[WS] Client disconnected. Total active: ${connectedClients.size}`);
      if (connectedClients.size === 0 && activeEngine) {
        activeEngine.isPaused = true;
      }
    });
  });

  server.listen(PORT, () => {
    console.log(`[SERVER] C-UAS Threat Trainer server listening on http://localhost:${PORT}`);
    console.log(`[SERVER] WebSocket endpoint ready at ws://localhost:${PORT}`);
  });
}

bootstrap().catch(err => {
  console.error('[FATAL] Failed to bootstrap server:', err);
  process.exit(1);
});
