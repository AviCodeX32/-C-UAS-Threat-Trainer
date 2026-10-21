import { AARScorecard, DroneTelemetry, ScenarioDefinition } from '../shared/index.js';

export interface CombatStats {
  sessionId: string;
  scenario: ScenarioDefinition;
  drones: DroneTelemetry[];
  elapsedTimeSeconds: number;
  totalThreats: number;
  neutralizedCount: number;
  correctClassifications: number;
  detectionLatenciesMs: number[];
  effectiveJams: number;
  wastedJams: number;
  analogSpoofAttempts: number;
  kineticShotsFired: number;
  kineticHits: number;
  longRangeKineticWasted: number;
  friendlyFireIncidents: number;
  peakTemperature: number;
  thermalLockoutOccurred: boolean;
  ammoRemaining: number;
  maxAmmo: number;
  baseHealth: number;
  baseDamageTaken: number;
  casualties: number;
  casualtiesAvoided: number;
}

export function evaluateAARScore(stats: CombatStats): AARScorecard {
  const tips: string[] = [];

  // 1. Detection & Identification Latency (25 pts max)
  let detectionLatencyScore = 0;
  let avgLatencyMs = 0;
  if (stats.detectionLatenciesMs.length > 0) {
    avgLatencyMs = stats.detectionLatenciesMs.reduce((a, b) => a + b, 0) / stats.detectionLatenciesMs.length;
    // Optimal latency: < 3000ms. Degrades to 0 at 18000ms
    const latencyFactor = Math.max(0, Math.min(1, 1 - (avgLatencyMs - 3000) / 15000));
    const accuracyFactor = stats.totalThreats > 0 ? stats.correctClassifications / stats.totalThreats : 0;
    detectionLatencyScore = Math.round(25 * latencyFactor * accuracyFactor);
  }

  if (stats.correctClassifications < stats.totalThreats) {
    tips.push('Early Classification: Designate radar contacts promptly in the Intel Card to prioritize correct kill-chain weapons.');
  }
  if (avgLatencyMs > 6000) {
    tips.push('Reaction Speed: Target designation latency exceeded 6.0s. Scan the RF Waterfall earlier to detect telemetry signatures before visual lock.');
  }

  // 2. Countermeasure Appropriateness (30 pts max)
  let countermeasureScore = 30;
  
  // Neutralization efficiency
  const killRatio = stats.totalThreats > 0 ? stats.neutralizedCount / stats.totalThreats : 0;
  countermeasureScore = Math.round(countermeasureScore * killRatio);

  // Penalize wasted jams
  if (stats.wastedJams > 0) {
    countermeasureScore = Math.max(0, countermeasureScore - Math.min(8, stats.wastedJams * 2));
  }

  // Penalize spoofing analog drones
  if (stats.analogSpoofAttempts > 0) {
    countermeasureScore = Math.max(0, countermeasureScore - Math.min(10, stats.analogSpoofAttempts * 5));
    tips.push('Doctrinal Rule: Pure analog FPV kamikazes lack GNSS receivers. Satellite spoofing has 0 effect—use kinetic or bunker cover.');
  }

  // Penalize long-range kinetic shots (>150m)
  if (stats.longRangeKineticWasted > 0) {
    countermeasureScore = Math.max(0, countermeasureScore - Math.min(6, stats.longRangeKineticWasted * 2));
    tips.push('Kinetic Discipline: Small-arms point defense has near-zero hit probability past 150m. Hold fire until optimal range (<100m).');
  }

  // 3. Resource Management (20 pts max)
  let resourceManagementScore = 20;

  // Thermal penalty (10 pts)
  if (stats.thermalLockoutOccurred) {
    resourceManagementScore -= 10;
    tips.push('Thermal Management: Continuous jammer emission triggered an 8-second thermal lockout. Pulse the jammer in 3-5 second bursts.');
  } else if (stats.peakTemperature > 80) {
    resourceManagementScore -= 4;
    tips.push('Emitter Warning: Jammer core exceeded 80% thermal ceiling. Manage duty cycle to avoid emergency shutdown.');
  }

  // Ammo penalty (10 pts)
  const ammoRatio = stats.ammoRemaining / stats.maxAmmo;
  const ammoScore = Math.round(10 * ammoRatio);
  resourceManagementScore = Math.max(0, resourceManagementScore - (10 - ammoScore));

  // 4. Base Integrity & Casualties (25 pts max)
  let baseIntegrityScore = 0;
  if (stats.baseHealth === 100) {
    baseIntegrityScore = 25;
  } else if (stats.casualties === 0 && stats.casualtiesAvoided > 0) {
    // Took damage but sounded Take Cover in time!
    baseIntegrityScore = 15;
    tips.push('Good Drill: "Take Cover" bunker alarm was sounded before perimeter impact, successfully averting personnel casualties.');
  } else {
    // Casualties sustained
    baseIntegrityScore = Math.max(0, Math.round(25 * (stats.baseHealth / 100)) - (stats.casualties * 10));
    tips.push('Critical Casualty: Post sustained unmitigated kamikaze impact! Sound "TAKE COVER" when high-speed FPVs breach 100m.');
  }

  // Heavy deduction for Friendly Trench incidents (-15 pts each!)
  let friendlyDeductions = 0;
  if (stats.friendlyFireIncidents > 0) {
    friendlyDeductions = stats.friendlyFireIncidents * 15;
    tips.unshift('SAFETY VIOLATION: Kinetic burst directed toward the southern friendly trench sector (150°-210°)! Check backstop before firing.');
  }

  // Final Overall Score (0 to 100)
  const rawTotal = detectionLatencyScore + countermeasureScore + resourceManagementScore + baseIntegrityScore - friendlyDeductions;
  const overallScore = Math.max(0, Math.min(100, rawTotal));

  // Grade Assignment
  let grade: 'S' | 'A' | 'B' | 'C' | 'F' = 'F';
  if (overallScore >= 90) grade = 'S';
  else if (overallScore >= 80) grade = 'A';
  else if (overallScore >= 70) grade = 'B';
  else if (overallScore >= 60) grade = 'C';
  else grade = 'F';

  if (tips.length === 0) {
    tips.push('Flawless Execution: Full D-TID-A kill chain executed with pristine doctrinal compliance, high accuracy, and zero collateral damage.');
  }

  return {
    id: `aar_${Date.now()}`,
    sessionId: stats.sessionId,
    scenarioId: stats.scenario.id,
    grade,
    overallScore,
    breakdown: {
      detectionLatencyScore,
      countermeasureScore,
      resourceManagementScore,
      baseIntegrityScore
    },
    metrics: {
      avgDetectionLatencyMs: Math.round(avgLatencyMs),
      correctClassifications: stats.correctClassifications,
      totalThreats: stats.totalThreats,
      neutralizedCount: stats.neutralizedCount,
      effectiveJams: stats.effectiveJams,
      wastedJams: stats.wastedJams,
      kineticShotsFired: stats.kineticShotsFired,
      kineticHits: stats.kineticHits,
      friendlyFireIncidents: stats.friendlyFireIncidents,
      peakTemperature: Math.round(stats.peakTemperature),
      thermalLockoutOccurred: stats.thermalLockoutOccurred,
      baseDamageTaken: stats.baseDamageTaken,
      casualties: stats.casualties,
      elapsedTimeSeconds: Math.round(stats.elapsedTimeSeconds)
    },
    tacticalTips: tips
  };
}
