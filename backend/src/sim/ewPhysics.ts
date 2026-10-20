import { DroneTelemetry, JammerState, GNSSSpoofingState, JAMMER_CONFIG } from '@cuas/shared';

export interface JammerEvaluationResult {
  inCone: boolean;
  frequencyMatched: boolean;
  effectiveMarginDb: number;
  severedLink: boolean;
  failureReason?: 'OUT_OF_CONE' | 'WRONG_BAND' | 'FHSS_REQUIRES_WIDEBAND' | 'INSUFFICIENT_POWER';
}

export function evaluateJammerCone(
  drone: DroneTelemetry,
  jammer: JammerState
): boolean {
  if (drone.distance > jammer.maxRange) {
    return false;
  }

  // Angular difference between drone azimuth and jammer beam center (-180 to +180)
  const diff = Math.abs(((drone.azimuth - jammer.azimuth + 180) % 360 + 360) % 360 - 180);
  const halfBeam = jammer.beamWidth / 2;

  return diff <= halfBeam;
}

export function calculateEffectiveMargin(
  droneDistance: number,
  operatorDistance: number,
  isWideband: boolean
): number {
  const pJammer = isWideband ? JAMMER_CONFIG.WIDEBAND_POWER_DBM : JAMMER_CONFIG.JAMMER_POWER_DBM;
  const pController = JAMMER_CONFIG.CONTROLLER_POWER_DBM;

  // Free Space Path Loss (FSPL) ~ 20 * log10(d)
  const jammerPathLoss = 20 * Math.log10(Math.max(1, droneDistance));
  const controllerPathLoss = 20 * Math.log10(Math.max(1, operatorDistance));

  const pJammerRx = pJammer - jammerPathLoss;
  const pControllerRx = pController - controllerPathLoss;

  return pJammerRx - pControllerRx;
}

export function evaluateJammerOnDrone(
  drone: DroneTelemetry,
  jammer: JammerState
): JammerEvaluationResult {
  if (!jammer.active || jammer.overheated) {
    return {
      inCone: false,
      frequencyMatched: false,
      effectiveMarginDb: 0,
      severedLink: false
    };
  }

  const inCone = evaluateJammerCone(drone, jammer);
  if (!inCone) {
    return {
      inCone: false,
      frequencyMatched: false,
      effectiveMarginDb: 0,
      severedLink: false,
      failureReason: 'OUT_OF_CONE'
    };
  }

  // Check frequency match or wideband coverage
  const hasBand = jammer.widebandBarrage || !!jammer.enabledBands[drone.frequency];
  if (!hasBand) {
    return {
      inCone: true,
      frequencyMatched: false,
      effectiveMarginDb: 0,
      severedLink: false,
      failureReason: 'WRONG_BAND'
    };
  }

  // Edge Case: FHSS requires Wideband Barrage Jamming
  if (drone.isFhss && !jammer.widebandBarrage) {
    return {
      inCone: true,
      frequencyMatched: true,
      effectiveMarginDb: 0,
      severedLink: false,
      failureReason: 'FHSS_REQUIRES_WIDEBAND'
    };
  }

  const margin = calculateEffectiveMargin(drone.distance, drone.operatorDistance, jammer.widebandBarrage);
  const severedLink = margin >= JAMMER_CONFIG.LINK_MARGIN_THRESHOLD_DB;

  return {
    inCone: true,
    frequencyMatched: true,
    effectiveMarginDb: margin,
    severedLink,
    failureReason: severedLink ? undefined : 'INSUFFICIENT_POWER'
  };
}

export function evaluateSpoofingOnDrone(
  drone: DroneTelemetry,
  spoof: GNSSSpoofingState
): { effective: boolean; reason?: 'NO_GPS_RECEIVER' } {
  if (!spoof.active) {
    return { effective: false };
  }

  // Edge Case: Analog FPV drones have no GPS receiver
  if (!drone.hasGps) {
    return {
      effective: false,
      reason: 'NO_GPS_RECEIVER'
    };
  }

  return { effective: true };
}
