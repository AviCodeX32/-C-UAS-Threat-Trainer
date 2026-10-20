import { FrequencyBand, ScenarioDefinition } from './types.js';

export const FREQUENCY_BANDS: FrequencyBand[] = [
  '433MHz',
  '868MHz',
  '1.2GHz',
  '2.4GHz',
  '5.8GHz'
];

export const FREQUENCY_DETAILS: Record<FrequencyBand, { label: string; typicalUse: string; centerFreqMHz: number }> = {
  '433MHz': { label: '433 MHz', typicalUse: 'Long-range telemetry / LRS control', centerFreqMHz: 433 },
  '868MHz': { label: '868 MHz', typicalUse: 'ELRS / Crossfire digital control link', centerFreqMHz: 868 },
  '1.2GHz': { label: '1.2 GHz', typicalUse: 'Analog long-range video feed', centerFreqMHz: 1280 },
  '2.4GHz': { label: '2.4 GHz', typicalUse: 'Commercial quad / C2 telemetry & Wi-Fi link', centerFreqMHz: 2440 },
  '5.8GHz': { label: '5.8 GHz', typicalUse: 'Analog FPV high-rate video downlink', centerFreqMHz: 5800 }
};

export const RADAR_MAX_RANGE = 2500; // meters
export const RADAR_RINGS = [500, 1000, 2000]; // meters

export const JAMMER_CONFIG = {
  DEFAULT_BEAM_WIDTH: 40, // degrees (+/- 20)
  MAX_RANGE: 2500, // meters
  HEAT_RATE_NORMAL: 6.67, // % per second (15s to 100%)
  HEAT_RATE_WIDEBAND: 20.0, // % per second (3x power/heat -> 5s to 100%)
  COOL_RATE: 12.5, // % per second when idle
  LOCKOUT_DURATION: 8.0, // seconds
  POWER_DRAIN_NORMAL: 4.0, // % per second
  POWER_DRAIN_WIDEBAND: 12.0, // % per second
  POWER_REGEN: 3.0, // % per second
  JAMMER_POWER_DBM: 52, // Jammer transmitter output power
  WIDEBAND_POWER_DBM: 57,
  CONTROLLER_POWER_DBM: 30, // Remote pilot controller output power
  LINK_MARGIN_THRESHOLD_DB: 6.0 // Required J/S ratio to break link
};

export const KINETIC_CONFIG = {
  MAX_AMMO: 150,
  BURST_ROUNDS: 5,
  EFFECTIVE_RANGE: 150, // meters
  OPTIMAL_RANGE: 100 // meters
};

export const TRENCH_SECTOR = {
  minAzimuth: 150, // degrees (South-Southeast)
  maxAzimuth: 210, // degrees (South-Southwest)
  distance: 350    // meters
};

export const SCENARIO_PRESETS: ScenarioDefinition[] = [
  {
    id: 'scenario_recon_infil',
    name: 'Recon Infiltration',
    codename: 'OP-EAGLE-EYE',
    difficulty: 'Standard',
    description: 'High-altitude commercial quadcopters equipped with GPS autopilot performing surveillance on forward positions. Uses standard 2.4 GHz digital command link.',
    doctrineObjective: 'Intercept RF signature at 2.4 GHz, orient directional jammer within beam cone, or activate GNSS satellite spoofing to disrupt waypoint navigation.',
    recommendedTactic: 'Designate threat, align EW jammer to 2.4 GHz, engage soft-kill at >1000m. Spoofing is highly effective against GPS-dependent quadcopters.',
    threatCount: 3,
    durationSeconds: 60,
    droneConfigs: [
      {
        id: 'quad_01',
        callsign: 'PHANTOM-1',
        type: 'commercial_quad',
        spawnDelaySec: 1,
        initialPos: [700, 1400, 280],
        initialVel: [-15, -20, 0],
        frequency: '2.4GHz',
        isFhss: false,
        hasGps: true,
        operatorDistance: 2500
      },
      {
        id: 'quad_02',
        callsign: 'PHANTOM-2',
        type: 'commercial_quad',
        spawnDelaySec: 12,
        initialPos: [-1200, 1100, 320],
        initialVel: [18, -16, 0],
        frequency: '2.4GHz',
        isFhss: false,
        hasGps: true,
        operatorDistance: 2800
      },
      {
        id: 'quad_03',
        callsign: 'MATRICE-X',
        type: 'commercial_quad',
        spawnDelaySec: 25,
        initialPos: [1300, -800, 350],
        initialVel: [-18, 12, 0],
        frequency: '2.4GHz',
        isFhss: false,
        hasGps: true,
        operatorDistance: 3000
      }
    ]
  },
  {
    id: 'scenario_dive_ambush',
    name: 'Terminal Dive Ambush',
    codename: 'OP-IRON-RAIN',
    difficulty: 'Hostile',
    description: 'Two manual analog kamikaze FPV drones executing aggressive terminal dives from disparate azimuths. High velocity, pure analog video (5.8 GHz) + 868 MHz control link, zero GPS receiver onboard.',
    doctrineObjective: 'Detect high-speed signature. Jamming 868 MHz must be precise; GNSS spoofing will fail due to lack of GPS. Close-quarters kinetic fire (<100m) or "Take Cover" bunker alarm required if breach occurs.',
    recommendedTactic: 'Orient jammer to 868 MHz immediately. If FPV penetrates below 150m, engage kinetic bursts. If below 100m at dive speed, sound "TAKE COVER" immediately to preserve personnel.',
    threatCount: 2,
    durationSeconds: 45,
    droneConfigs: [
      {
        id: 'fpv_01',
        callsign: 'VIPER-01',
        type: 'fpv_kamikaze',
        spawnDelaySec: 2,
        initialPos: [950, 1150, 420],
        initialVel: [-32, -38, -10],
        frequency: '868MHz',
        isFhss: false,
        hasGps: false,
        operatorDistance: 1800
      },
      {
        id: 'fpv_02',
        callsign: 'VIPER-02',
        type: 'fpv_kamikaze',
        spawnDelaySec: 15,
        initialPos: [-1300, -600, 450],
        initialVel: [40, 18, -12],
        frequency: '868MHz',
        isFhss: true, // Uses FHSS hopping!
        hasGps: false,
        operatorDistance: 2000
      }
    ]
  },
  {
    id: 'scenario_saturation_swarm',
    name: 'Saturation Swarm',
    codename: 'OP-BLACK-CLOUD',
    difficulty: 'Hostile',
    description: '15-drone coordinated autonomous swarm utilizing Reynolds Boids flocking dynamics. Led by a tactical Swarm Leader relaying coordinate vectors over FHSS hopping links.',
    doctrineObjective: 'Suppress swarm via Wideband Barrage Jamming or neutralize the central Swarm Leader to disrupt flock cohesion and trigger erratic scatter.',
    recommendedTactic: 'Locate and classify the Swarm Leader drone (pulsing star indicator). Focus kinetic fire or Wideband Barrage to break flock coherence. Monitor jammer temperature to avoid thermal lockout.',
    threatCount: 15,
    durationSeconds: 90,
    droneConfigs: [
      // Swarm leader
      {
        id: 'swarm_leader',
        callsign: 'HIVE-PRIME',
        type: 'swarm_node',
        isLeader: true,
        swarmId: 'alpha_swarm',
        spawnDelaySec: 2,
        initialPos: [200, 1800, 260],
        initialVel: [-6, -22, -1],
        frequency: '868MHz',
        isFhss: true,
        hasGps: true,
        operatorDistance: 3200
      },
      // 14 Follower swarm nodes
      ...Array.from({ length: 14 }).map((_, i) => ({
        id: `swarm_node_${i + 1}`,
        callsign: `HIVE-${String(i + 1).padStart(2, '0')}`,
        type: 'swarm_node' as const,
        isLeader: false,
        swarmId: 'alpha_swarm',
        spawnDelaySec: 3 + (i % 3) * 0.5,
        initialPos: [
          200 + (Math.cos((i * Math.PI) / 7) * 70) + (Math.random() * 20 - 10),
          1800 + (Math.sin((i * Math.PI) / 7) * 70) + (Math.random() * 20 - 10),
          260 + (Math.random() * 30 - 15)
        ] as [number, number, number],
        initialVel: [-6 + (Math.random() * 2 - 1), -22 + (Math.random() * 2 - 1), 0] as [number, number, number],
        frequency: '868MHz' as FrequencyBand,
        isFhss: true,
        hasGps: true,
        operatorDistance: 3200
      }))
    ]
  }
];
