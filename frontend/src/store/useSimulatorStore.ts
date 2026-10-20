import { create } from 'zustand';
import {
  DroneTelemetry,
  JammerState,
  GNSSSpoofingState,
  KineticDefenseState,
  StationVitals,
  AuditEvent,
  ScenarioDefinition,
  AARScorecard,
  ClientMessage,
  ServerMessage,
  FrequencyBand,
  ThreatType,
  SCENARIO_PRESETS,
  JAMMER_CONFIG,
  KINETIC_CONFIG,
  TRENCH_SECTOR
} from '@cuas/shared';
import { audioEngine } from '../audio/synth';

interface SimulatorState {
  wsConnected: boolean;
  scenario: ScenarioDefinition;
  simTime: number;
  drones: DroneTelemetry[];
  selectedDroneId: string | null;
  jammer: JammerState;
  spoof: GNSSSpoofingState;
  kinetic: KineticDefenseState;
  vitals: StationVitals;
  recentEvents: AuditEvent[];
  scenarioStatus: 'running' | 'completed' | 'failed';
  aarScorecard: AARScorecard | null;
  showAARModal: boolean;
  audioMuted: boolean;
  flirZoom: number; // 1, 2, 4, 8

  // Actions
  initWebSocket: () => void;
  selectScenario: (scenarioId: string) => void;
  restartScenario: () => void;
  setSelectedDrone: (id: string | null) => void;
  setJammerAngle: (azimuth: number) => void;
  fireJammer: (active: boolean) => void;
  toggleJammerBand: (band: FrequencyBand, enabled: boolean) => void;
  toggleWideband: (enabled: boolean) => void;
  engageSpoof: (active: boolean, mode?: 'drift' | 'geofence_lock') => void;
  fireKinetic: (targetDroneId?: string) => void;
  takeCover: () => void;
  designateTarget: (droneId: string, classification: ThreatType) => void;
  autoAimAtTarget: () => void;
  setFlirZoom: (zoom: number) => void;
  toggleMute: () => void;
  closeAARModal: () => void;
}

let socket: WebSocket | null = null;
let reconnectTimer: any = null;

export const useSimulatorStore = create<SimulatorState>((set, get) => ({
  wsConnected: false,
  scenario: SCENARIO_PRESETS[0],
  simTime: 0,
  drones: [],
  selectedDroneId: null,
  jammer: {
    azimuth: 0,
    beamWidth: JAMMER_CONFIG.DEFAULT_BEAM_WIDTH,
    maxRange: JAMMER_CONFIG.MAX_RANGE,
    active: false,
    enabledBands: {
      '433MHz': false,
      '868MHz': false,
      '1.2GHz': false,
      '2.4GHz': true,
      '5.8GHz': false
    },
    widebandBarrage: false,
    temperature: 0,
    overheated: false,
    lockoutRemaining: 0
  },
  spoof: {
    active: false,
    mode: 'drift'
  },
  kinetic: {
    ammo: KINETIC_CONFIG.MAX_AMMO,
    maxAmmo: KINETIC_CONFIG.MAX_AMMO,
    burstSize: KINETIC_CONFIG.BURST_ROUNDS,
    effectiveRange: KINETIC_CONFIG.EFFECTIVE_RANGE,
    lastFireResult: null
  },
  vitals: {
    power: 100,
    takeCoverActive: false,
    takeCoverExpiresAt: null,
    baseHealth: 100,
    casualties: 0,
    friendlyTrenchSector: TRENCH_SECTOR
  },
  recentEvents: [],
  scenarioStatus: 'running',
  aarScorecard: null,
  showAARModal: false,
  audioMuted: false,
  flirZoom: 1,

  initWebSocket: () => {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const envWs = import.meta.env.VITE_WS_URL;
    let wsUrl: string;
    if (envWs) {
      wsUrl = envWs;
    } else {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.port === '3000' ? 'localhost:4000' : window.location.host;
      wsUrl = `${wsProtocol}//${wsHost}`;
    }

    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('[WS] Connected to tactical simulator backend.');
      set({ wsConnected: true });
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as ServerMessage;
        const state = get();

        if (msg.type === 'TICK') {
          // Update audio synthesizer with live sim physics
          const activeFlyingDrones = msg.drones.filter(d => d.status === 'flying');
          if (activeFlyingDrones.length > 0) {
            const closest = Math.min(...activeFlyingDrones.map(d => d.distance));
            const maxSpd = Math.max(...activeFlyingDrones.map(d => d.speed));
            audioEngine.updateRotorHum(closest, maxSpd, true);
          } else {
            audioEngine.updateRotorHum(2000, 0, false);
          }

          audioEngine.updateJammerNoise(msg.jammer.active, msg.jammer.widebandBarrage);
          audioEngine.updateTakeCoverSiren(msg.vitals.takeCoverActive);

          // Overheat alert sound
          if (msg.jammer.overheated && !state.jammer.overheated) {
            audioEngine.playOverheatAlarm();
          }

          set({
            simTime: msg.time,
            drones: msg.drones,
            jammer: msg.jammer,
            spoof: msg.spoof,
            kinetic: msg.kinetic,
            vitals: msg.vitals,
            recentEvents: msg.recentEvents,
            scenarioStatus: msg.scenarioStatus
          });
        } else if (msg.type === 'SCENARIO_LOADED') {
          set({
            scenario: msg.scenario,
            drones: msg.drones,
            jammer: msg.jammer,
            spoof: msg.spoof,
            kinetic: msg.kinetic,
            vitals: msg.vitals,
            showAARModal: false,
            aarScorecard: null,
            scenarioStatus: 'running'
          });
        } else if (msg.type === 'SCENARIO_COMPLETE') {
          audioEngine.updateRotorHum(2000, 0, false);
          audioEngine.updateJammerNoise(false, false);
          audioEngine.updateTakeCoverSiren(false);
          set({
            aarScorecard: msg.aarScorecard,
            showAARModal: true,
            scenarioStatus: 'completed'
          });
        }
      } catch (err: any) {
        console.error('[WS] Parse error:', err);
      }
    };

    socket.onclose = () => {
      console.warn('[WS] Tactical server disconnected. Reconnecting in 2s...');
      set({ wsConnected: false });
      socket = null;
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          get().initWebSocket();
        }, 2000);
      }
    };

    socket.onerror = (err) => {
      console.warn('[WS] Error:', err);
    };
  },

  selectScenario: (scenarioId: string) => {
    const targetPreset = SCENARIO_PRESETS.find(s => s.id === scenarioId);
    set({
      showAARModal: false,
      aarScorecard: null,
      scenarioStatus: 'running',
      scenario: targetPreset || get().scenario,
      drones: [],
      selectedDroneId: null,
      simTime: 0
    });
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'SELECT_SCENARIO', scenarioId } as ClientMessage));
    }
  },

  restartScenario: () => {
    set({
      showAARModal: false,
      aarScorecard: null,
      scenarioStatus: 'running',
      drones: [],
      selectedDroneId: null,
      simTime: 0
    });
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'RESTART_SCENARIO' } as ClientMessage));
    }
  },

  autoAimAtTarget: () => {
    const state = get();
    const activeDrones = state.drones.filter(d => d.status === 'flying');
    const target = state.drones.find(d => d.id === state.selectedDroneId && d.status === 'flying') ||
                   activeDrones[0];
    if (target) {
      state.setJammerAngle(target.azimuth);
      state.setSelectedDrone(target.id);
      state.toggleJammerBand(target.frequency, true);
    }
  },

  setSelectedDrone: (id: string | null) => {
    set({ selectedDroneId: id });
    if (id) {
      audioEngine.playTargetLocked();
    }
  },

  setJammerAngle: (azimuth: number) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'SET_JAMMER_ANGLE', azimuth } as ClientMessage));
    }
    // Optimistic local update
    set(state => ({
      jammer: { ...state.jammer, azimuth: (azimuth + 360) % 360 }
    }));
  },

  fireJammer: (active: boolean) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'FIRE_JAMMER', active } as ClientMessage));
    }
  },

  toggleJammerBand: (band: FrequencyBand, enabled: boolean) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'TOGGLE_JAMMER_BAND', band, enabled } as ClientMessage));
    }
  },

  toggleWideband: (enabled: boolean) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'TOGGLE_WIDEBAND', enabled } as ClientMessage));
    }
  },

  engageSpoof: (active: boolean, mode: 'drift' | 'geofence_lock' = 'drift') => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'ENGAGE_SPOOF', active, mode } as ClientMessage));
    }
  },

  fireKinetic: (targetDroneId?: string) => {
    audioEngine.playKineticBurst();
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'FIRE_KINETIC', targetDroneId } as ClientMessage));
    }
  },

  takeCover: () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'TAKE_COVER' } as ClientMessage));
    }
  },

  designateTarget: (droneId: string, classification: ThreatType) => {
    audioEngine.playTargetLocked();
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'DESIGNATE_TARGET', droneId, classification } as ClientMessage));
    }
  },

  setFlirZoom: (zoom: number) => {
    set({ flirZoom: zoom });
  },

  toggleMute: () => {
    const muted = audioEngine.toggleMute();
    set({ audioMuted: muted });
  },

  closeAARModal: () => {
    set({ showAARModal: false });
  }
}));
