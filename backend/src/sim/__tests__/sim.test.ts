import { evaluateJammerCone, evaluateJammerOnDrone, evaluateSpoofingOnDrone } from '../ewPhysics.js';
import { calculateHitProbability, isTargetInFriendlyTrenchSector } from '../kinetic.js';
import { computeBoidForces } from '../boids.js';
import { evaluateAARScore } from '../aar.js';
import { DroneTelemetry, JammerState, SCENARIO_PRESETS, TRENCH_SECTOR } from '@cuas/shared';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${msg}`);
  }
}

console.log('=== RUNNING C-UAS SIMULATOR ENGINE TESTS ===\n');

// 1. Jammer Cone Intersection Tests
const dummyJammer: JammerState = {
  azimuth: 90, // East
  beamWidth: 40, // 70 to 110 deg
  maxRange: 2500,
  active: true,
  enabledBands: {
    '433MHz': false,
    '868MHz': false,
    '1.2GHz': false,
    '2.4GHz': true,
    '5.8GHz': false
  },
  widebandBarrage: false,
  temperature: 20,
  overheated: false,
  lockoutRemaining: 0
};

const insideDrone: DroneTelemetry = {
  id: 'd1',
  callsign: 'TEST-1',
  type: 'commercial_quad',
  designatedType: null,
  x: 1000,
  y: 0,
  z: 150,
  vx: 0,
  vy: 0,
  vz: 0,
  speed: 15,
  distance: 1000,
  azimuth: 90, // Exactly east
  elevation: 8,
  frequency: '2.4GHz',
  isFhss: false,
  hasGps: true,
  isLeader: false,
  swarmId: null,
  status: 'flying',
  signalStrength: -75,
  operatorDistance: 2500,
  firstDetectedTime: Date.now(),
  designatedTime: null,
  neutralizedTime: null
};

assert(evaluateJammerCone(insideDrone, dummyJammer) === true, 'Drone at 90 deg is inside jammer cone centered at 90 deg');

const outsideDrone = { ...insideDrone, azimuth: 150 };
assert(evaluateJammerCone(outsideDrone, dummyJammer) === false, 'Drone at 150 deg is outside jammer cone centered at 90 deg (beam 40 deg)');

// 2. FHSS Edge Case
const fhssDrone: DroneTelemetry = {
  ...insideDrone,
  isFhss: true,
  frequency: '2.4GHz'
};
const spotJamResult = evaluateJammerOnDrone(fhssDrone, dummyJammer);
assert(spotJamResult.severedLink === false && spotJamResult.failureReason === 'FHSS_REQUIRES_WIDEBAND', 'Spot jamming fails against FHSS drone');

const widebandJammer: JammerState = {
  ...dummyJammer,
  widebandBarrage: true
};
const widebandResult = evaluateJammerOnDrone(fhssDrone, widebandJammer);
assert(widebandResult.severedLink === true, 'Wideband barrage jamming successfully suppresses FHSS drone');

// 3. GNSS Spoofing on Pure Analog FPV Edge Case
const analogDrone: DroneTelemetry = {
  ...insideDrone,
  type: 'fpv_kamikaze',
  hasGps: false
};
const spoofAnalogResult = evaluateSpoofingOnDrone(analogDrone, { active: true, mode: 'drift' });
assert(spoofAnalogResult.effective === false && spoofAnalogResult.reason === 'NO_GPS_RECEIVER', 'GNSS spoofing fails on pure analog FPV drones');

const gpsDrone: DroneTelemetry = {
  ...insideDrone,
  hasGps: true
};
const spoofGpsResult = evaluateSpoofingOnDrone(gpsDrone, { active: true, mode: 'drift' });
assert(spoofGpsResult.effective === true, 'GNSS spoofing succeeds on commercial quad with GPS');

// 4. Kinetic Range Falloff & Friendly Trench Sector
assert(calculateHitProbability(50) > 0.8, 'Kinetic hit probability is high at 50m');
assert(calculateHitProbability(200) === 0, 'Kinetic hit probability is 0% beyond 150m');

const trenchVitals = {
  power: 100,
  takeCoverActive: false,
  takeCoverExpiresAt: null,
  baseHealth: 100,
  casualties: 0,
  friendlyTrenchSector: TRENCH_SECTOR // 150 - 210 deg
};
assert(isTargetInFriendlyTrenchSector(180, trenchVitals) === true, 'Azimuth 180 deg is inside friendly trench sector (150-210 deg)');
assert(isTargetInFriendlyTrenchSector(45, trenchVitals) === false, 'Azimuth 45 deg is outside friendly trench sector');

// 5. Swarm Flocking & Leader Scatter
const boidForces = computeBoidForces(insideDrone, [insideDrone], false);
assert(typeof boidForces.fx === 'number' && typeof boidForces.fy === 'number', 'Boid forces return valid vectors');

const scatterForces = computeBoidForces(insideDrone, [insideDrone], true);
assert(Math.abs(scatterForces.fx) > 0 || Math.abs(scatterForces.fy) > 0, 'Swarm leader neutralization triggers scatter forces');

// 6. AAR Scoring Calculation
const aarScore = evaluateAARScore({
  sessionId: 'test_session',
  scenario: SCENARIO_PRESETS[0],
  drones: [insideDrone],
  elapsedTimeSeconds: 30,
  totalThreats: 1,
  neutralizedCount: 1,
  correctClassifications: 1,
  detectionLatenciesMs: [2500],
  effectiveJams: 1,
  wastedJams: 0,
  analogSpoofAttempts: 0,
  kineticShotsFired: 0,
  kineticHits: 0,
  longRangeKineticWasted: 0,
  friendlyFireIncidents: 0,
  peakTemperature: 35,
  thermalLockoutOccurred: false,
  ammoRemaining: 150,
  maxAmmo: 150,
  baseHealth: 100,
  baseDamageTaken: 0,
  casualties: 0,
  casualtiesAvoided: 0
});

assert(aarScore.overallScore >= 90 && aarScore.grade === 'S', 'Pristine D-TID-A drill achieves Grade S');

console.log('\n✨ ALL SIMULATION AND EW LOGIC TESTS PASSED SUCCESSFULLY! ✨');
