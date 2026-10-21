import { DroneTelemetry, KineticDefenseState, StationVitals, KINETIC_CONFIG } from '../shared/index.js';

export interface KineticShotResult {
  hit: boolean;
  hitProbability: number;
  friendlyFire: boolean;
  ammoSpent: number;
  targetId: string | null;
  distance: number;
}

export function calculateHitProbability(distance: number): number {
  if (distance > KINETIC_CONFIG.EFFECTIVE_RANGE) {
    return 0.0;
  }
  if (distance <= KINETIC_CONFIG.OPTIMAL_RANGE) {
    // 92% at 0m down to 78% at 100m
    return Math.max(0.65, 0.92 - (distance / 100) * 0.20);
  }
  // 100m to 150m: steep drop-off to 0
  const normalized = (distance - KINETIC_CONFIG.OPTIMAL_RANGE) / (KINETIC_CONFIG.EFFECTIVE_RANGE - KINETIC_CONFIG.OPTIMAL_RANGE);
  return Math.max(0.0, 0.50 * (1.0 - normalized));
}

export function isTargetInFriendlyTrenchSector(azimuth: number, vitals: StationVitals): boolean {
  const { minAzimuth, maxAzimuth } = vitals.friendlyTrenchSector;
  // Check if azimuth is inside minAzimuth..maxAzimuth
  if (minAzimuth <= maxAzimuth) {
    return azimuth >= minAzimuth && azimuth <= maxAzimuth;
  } else {
    // Wrap around 360
    return azimuth >= minAzimuth || azimuth <= maxAzimuth;
  }
}

export function resolveKineticBurst(
  target: DroneTelemetry | null,
  kineticState: KineticDefenseState,
  vitals: StationVitals
): KineticShotResult {
  const ammoSpent = Math.min(kineticState.ammo, KINETIC_CONFIG.BURST_ROUNDS);
  if (ammoSpent <= 0 || !target) {
    return {
      hit: false,
      hitProbability: 0,
      friendlyFire: false,
      ammoSpent: 0,
      targetId: null,
      distance: 0
    };
  }

  const distance = target.distance;
  const hitProb = calculateHitProbability(distance);
  const friendlyFire = isTargetInFriendlyTrenchSector(target.azimuth, vitals);

  // Roll dice for hit
  const roll = Math.random();
  const hit = roll < hitProb;

  return {
    hit,
    hitProbability: hitProb,
    friendlyFire,
    ammoSpent,
    targetId: target.id,
    distance
  };
}
