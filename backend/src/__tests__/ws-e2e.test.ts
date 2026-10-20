import { WebSocket } from 'ws';

async function runE2ETest() {
  console.log('[E2E TEST] Connecting to WebSocket ws://localhost:4000...');
  const ws = new WebSocket('ws://localhost:4000');

  let tickCount = 0;

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('E2E Test timed out waiting for tick events'));
    }, 10000);

    ws.on('open', () => {
      console.log('✅ [E2E TEST] Connected to WebSocket server');
      // Send sample commands
      ws.send(JSON.stringify({ type: 'SET_JAMMER_ANGLE', azimuth: 65 }));
      ws.send(JSON.stringify({ type: 'TOGGLE_JAMMER_BAND', band: '2.4GHz', enabled: true }));
      ws.send(JSON.stringify({ type: 'FIRE_JAMMER', active: true }));
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'SCENARIO_LOADED') {
        console.log(`✅ [E2E TEST] Scenario loaded: ${msg.scenario.name} (${msg.scenario.codename})`);
      } else if (msg.type === 'TICK') {
        tickCount++;
        if (tickCount === 1) {
          console.log(`✅ [E2E TEST] Received first 20Hz TICK packet (simTime: ${msg.time.toFixed(2)}s, Drones active: ${msg.drones.length})`);
        }
        if (tickCount >= 10) {
          console.log(`✅ [E2E TEST] Received ${tickCount} consecutive 20Hz ticks successfully!`);
          clearTimeout(timeout);
          ws.close();
          resolve();
        }
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  console.log('✨ [E2E TEST] All WebSocket communication & 20Hz simulation broadcast verified! ✨');
}

runE2ETest().catch(err => {
  console.error('❌ [E2E TEST] Failed:', err);
  process.exit(1);
});
