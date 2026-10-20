export type ThreatType = 'commercial_quad' | 'fpv_kamikaze' | 'swarm_node';

export type DroneStatus = 
  | 'flying' 
  | 'jammed_lost_link' 
  | 'spoofed_diverting' 
  | 'neutralized_crashed' 
  | 'impacted_post';

export type FrequencyBand = '433MHz' | '868MHz' | '1.2GHz' | '2.4GHz' | '5.8GHz';

export interface DroneTelemetry {
  id: string;
  callsign: string;
  type: ThreatType;
  designatedType: ThreatType | null;
  x: number; // meters from post (east)
  y: number; // meters from post (north)
  z: number; // altitude in meters
  vx: number;
  vy: number;
  vz: number;
  speed: number;
  distance: number;
  azimuth: number; // 0 to 360 deg (0 = North, 90 = East)
  elevation: number;
  frequency: FrequencyBand;
  isFhss: boolean;
  hasGps: boolean;
  isLeader: boolean;
  swarmId: string | null;
  status: DroneStatus;
  signalStrength: number; // dBm at outpost
  operatorDistance: number;
  firstDetectedTime: number;
  designatedTime: number | null;
  neutralizedTime: number | null;
  diveSpeed?: number;
}

export interface JammerState {
  azimuth: number; // 0 - 360
  beamWidth: number; // default 40 deg (+/- 20)
  maxRange: number; // default 2500m
  active: boolean;
  enabledBands: Record<FrequencyBand, boolean>;
  widebandBarrage: boolean;
  temperature: number; // 0 - 100 %
  overheated: boolean;
  lockoutRemaining: number; // seconds
}

export interface GNSSSpoofingState {
  active: boolean;
  mode: 'drift' | 'geofence_lock';
}

export interface KineticDefenseState {
  ammo: number;
  maxAmmo: number;
  burstSize: number;
  effectiveRange: number; // 150m (optimal < 100m)
  lastFireResult: {
    targetId: string | null;
    hit: boolean;
    distance: number;
    friendlyFire: boolean;
  } | null;
}

export interface FriendlyTrenchSector {
  minAzimuth: number; // e.g. 150
  maxAzimuth: number; // e.g. 210
  distance: number;   // e.g. 200m
}

export interface StationVitals {
  power: number; // 0 - 100 %
  takeCoverActive: boolean;
  takeCoverExpiresAt: number | null;
  baseHealth: number; // 0 - 100 %
  casualties: number;
  friendlyTrenchSector: FriendlyTrenchSector;
}

export type AuditEventType =
  | 'RADAR_DETECT'
  | 'DESIGNATE'
  | 'JAMMER_FIRED'
  | 'JAMMER_SEVERED_LINK'
  | 'JAMMER_INEFFECTIVE_FHSS'
  | 'JAMMER_OUT_OF_CONE'
  | 'JAMMER_WRONG_BAND'
  | 'SPOOF_ENGAGED'
  | 'SPOOF_SUCCESS'
  | 'SPOOF_INEFFECTIVE_ANALOG'
  | 'KINETIC_FIRED'
  | 'KINETIC_HIT'
  | 'KINETIC_MISSED'
  | 'FRIENDLY_FIRE_INCIDENT'
  | 'TAKE_COVER_SOUNDED'
  | 'TAKE_COVER_SUCCESS'
  | 'BASE_STRUCK'
  | 'THERMAL_LOCKOUT'
  | 'THERMAL_RECOVERED'
  | 'SWARM_LEADER_KILLED';

export interface AuditEvent {
  id: string;
  timestamp: number;
  type: AuditEventType;
  description: string;
  severity: 'info' | 'warning' | 'danger' | 'success';
  targetId?: string;
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  codename: string;
  difficulty: 'Standard' | 'Elevated' | 'Hostile';
  description: string;
  doctrineObjective: string;
  recommendedTactic: string;
  threatCount: number;
  durationSeconds: number;
  droneConfigs: Array<{
    id: string;
    callsign: string;
    type: ThreatType;
    spawnDelaySec: number;
    initialPos: [number, number, number]; // x, y, z
    initialVel: [number, number, number];
    frequency: FrequencyBand;
    isFhss: boolean;
    hasGps: boolean;
    isLeader?: boolean;
    swarmId?: string;
    operatorDistance: number;
  }>;
}

export interface AARScorecard {
  id: string;
  sessionId: string;
  scenarioId: string;
  grade: 'S' | 'A' | 'B' | 'C' | 'F';
  overallScore: number;
  breakdown: {
    detectionLatencyScore: number; // 0 - 25
    countermeasureScore: number;   // 0 - 30
    resourceManagementScore: number; // 0 - 20
    baseIntegrityScore: number;    // 0 - 25
  };
  metrics: {
    avgDetectionLatencyMs: number;
    correctClassifications: number;
    totalThreats: number;
    neutralizedCount: number;
    effectiveJams: number;
    wastedJams: number;
    kineticShotsFired: number;
    kineticHits: number;
    friendlyFireIncidents: number;
    peakTemperature: number;
    thermalLockoutOccurred: boolean;
    baseDamageTaken: number;
    casualties: number;
    elapsedTimeSeconds: number;
  };
  tacticalTips: string[];
}

// Client -> Server WebSocket Messages
export type ClientMessage =
  | { type: 'SELECT_SCENARIO'; scenarioId: string }
  | { type: 'START_SIMULATION' }
  | { type: 'SET_JAMMER_ANGLE'; azimuth: number }
  | { type: 'FIRE_JAMMER'; active: boolean }
  | { type: 'TOGGLE_JAMMER_BAND'; band: FrequencyBand; enabled: boolean }
  | { type: 'TOGGLE_WIDEBAND'; enabled: boolean }
  | { type: 'ENGAGE_SPOOF'; active: boolean; mode?: 'drift' | 'geofence_lock' }
  | { type: 'FIRE_KINETIC'; targetDroneId?: string }
  | { type: 'TAKE_COVER' }
  | { type: 'DESIGNATE_TARGET'; droneId: string; classification: ThreatType }
  | { type: 'RESTART_SCENARIO' };

// Server -> Client WebSocket Messages
export type ServerMessage =
  | {
      type: 'TICK';
      time: number;
      drones: DroneTelemetry[];
      jammer: JammerState;
      spoof: GNSSSpoofingState;
      kinetic: KineticDefenseState;
      vitals: StationVitals;
      recentEvents: AuditEvent[];
      scenarioStatus: 'running' | 'completed' | 'failed';
    }
  | {
      type: 'SCENARIO_LOADED';
      scenario: ScenarioDefinition;
      drones: DroneTelemetry[];
      jammer: JammerState;
      spoof: GNSSSpoofingState;
      kinetic: KineticDefenseState;
      vitals: StationVitals;
    }
  | {
      type: 'SCENARIO_COMPLETE';
      aarScorecard: AARScorecard;
    }
  | {
      type: 'EVENT';
      event: AuditEvent;
    };
