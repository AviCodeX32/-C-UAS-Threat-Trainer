import { SimulationEngine } from '../sim/engine.js';
import { SCENARIO_PRESETS } from '../shared/index.js';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ TEST FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ ${msg}`);
  }
}

async function testScenario1_Recon() {
  console.log('\n--- TESTING SCENARIO 1: RECON INFILTRATION ---');
  let completedScorecard: any = null;

  const engine = new SimulationEngine(
    'scenario_recon_infil',
    undefined,
    (eng, scorecard) => {
      completedScorecard = scorecard;
    }
  );

  // Run until quad 1 spawns (spawnDelaySec = 1)
  while (engine.drones.length === 0 && engine.simTimeSeconds < 5) {
    engine.tick();
  }

  assert(engine.drones.length >= 1, 'Commercial quad spawned on schedule');
  const d = engine.drones[0];
  // Designate target
  engine.designateTarget(d.id, 'commercial_quad');
  assert(d.designatedType === 'commercial_quad', 'Designated quad correctly');

  // Aim Jammer at drone azimuth and toggle 2.4 GHz
  engine.setJammerAngle(d.azimuth);
  engine.toggleJammerBand('2.4GHz', true);
  engine.fireJammer(true);

  // Tick until jammer severs link
  for (let i = 0; i < 20; i++) {
    engine.tick();
    if (engine.drones[0].status === 'jammed_lost_link') break;
  }

  assert(engine.drones[0].status === 'jammed_lost_link', 'Directional jammer at 2.4 GHz successfully severed quadcopter RF link');
  engine.stop();
}

async function testScenario2_DiveAmbush() {
  console.log('\n--- TESTING SCENARIO 2: TERMINAL DIVE AMBUSH & ANALOG SPOOF IMMUNITY ---');
  const engine = new SimulationEngine('scenario_dive_ambush');

  // Run until FPV spawns (spawnDelaySec = 2)
  while (engine.drones.length === 0 && engine.simTimeSeconds < 5) {
    engine.tick();
  }

  const fpv = engine.drones[0];
  assert(fpv !== undefined && fpv.type === 'fpv_kamikaze', 'Kamikaze FPV spawned');
  assert(fpv.hasGps === false, 'FPV drone has no GPS receiver');

  // Attempt GNSS spoofing
  engine.engageSpoof(true, 'drift');
  engine.tick();
  assert(fpv.status === 'flying', 'GNSS spoofing had 0 effect on analog FPV (immune to spoofing)');
  assert(engine.recentEvents.some(e => e.type === 'SPOOF_INEFFECTIVE_ANALOG'), 'Logged SPOOF_INEFFECTIVE_ANALOG penalty audit event');

  // Test Take Cover drill
  engine.takeCover();
  assert(engine.vitals.takeCoverActive === true, 'Take cover bunker drill activated');

  engine.stop();
}

async function testScenario3_SaturationSwarm() {
  console.log('\n--- TESTING SCENARIO 3: SATURATION SWARM & LEADER NEUTRALIZATION ---');
  const engine = new SimulationEngine('scenario_saturation_swarm');

  // Spawn swarm
  while (engine.drones.length < 5 && engine.simTimeSeconds < 10) {
    engine.tick();
  }

  assert(engine.drones.length > 5, 'Swarm flock spawned multiple nodes');
  const leader = engine.drones.find(d => d.isLeader);
  assert(leader !== undefined, 'Swarm leader identified in flock');
  if (!leader) throw new Error('Swarm leader not found');

  // Test FHSS resilience: single band fails
  engine.setJammerAngle(leader.azimuth);
  engine.toggleJammerBand('868MHz', true);
  engine.toggleWideband(false);
  engine.fireJammer(true);
  engine.tick();
  assert(leader.status === 'flying', 'Single-channel spot jamming fails against FHSS link');

  // Engage Wideband Barrage
  engine.toggleWideband(true);
  engine.tick();
  assert(leader.status === 'jammed_lost_link', 'Wideband barrage jamming successfully severed FHSS swarm leader link');
  assert(engine.recentEvents.some(e => e.type === 'SWARM_LEADER_KILLED'), 'Swarm leader kill event broadcast to scramble flock cohesion');

  engine.stop();
}

async function runAll() {
  await testScenario1_Recon();
  await testScenario2_DiveAmbush();
  await testScenario3_SaturationSwarm();
  console.log('\n🎉 ALL INTEGRATION SCENARIO TESTS PASSED WITH 100% SUCCESS! 🎉\n');
}

runAll().catch(err => {
  console.error(err);
  process.exit(1);
});
