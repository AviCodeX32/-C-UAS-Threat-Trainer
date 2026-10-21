import {
  DroneTelemetry,
  JammerState,
  GNSSSpoofingState,
  KineticDefenseState,
  StationVitals,
  AuditEvent,
  ScenarioDefinition,
  AARScorecard,
  FrequencyBand,
  ThreatType,
  SCENARIO_PRESETS,
  JAMMER_CONFIG,
  KINETIC_CONFIG,
  TRENCH_SECTOR
} from '../shared/index.js';
import { computeBoidForces } from './boids.js';
import { evaluateJammerOnDrone, evaluateSpoofingOnDrone } from './ewPhysics.js';
import { resolveKineticBurst } from './kinetic.js';
import { evaluateAARScore, CombatStats } from './aar.js';
import { saveSession, saveAuditEvent, saveAARScorecard } from '../db/index.js';

export class SimulationEngine {
  public sessionId: string;
  public scenario: ScenarioDefinition;
  public status: 'running' | 'completed' | 'failed' = 'running';
  public isPaused: boolean = false;
  public simTimeSeconds: number = 0;
  
  public drones: DroneTelemetry[] = [];
  public jammer: JammerState;
  public spoof: GNSSSpoofingState;
  public kinetic: KineticDefenseState;
  public vitals: StationVitals;
  
  public recentEvents: AuditEvent[] = [];
  private swarmLeaderKilled: boolean = false;
  
  // Tracking metrics for AAR
  private detectionLatenciesMs: number[] = [];
  private correctClassifications: number = 0;
  private effectiveJams: number = 0;
  private wastedJams: number = 0;
  private analogSpoofAttempts: number = 0;
  private kineticShotsFired: number = 0;
  private kineticHits: number = 0;
  private longRangeKineticWasted: number = 0;
  private friendlyFireIncidents: number = 0;
  private peakTemperature: number = 0;
  private thermalLockoutOccurred: boolean = false;
  private casualtiesAvoided: number = 0;
  private aarScorecard: AARScorecard | null = null;

  // 20 Hz loop timer reference
  private intervalHandle: NodeJS.Timeout | null = null;
  private lastTickHrtime: bigint = process.hrtime.bigint();
  private onBroadcast?: (engine: SimulationEngine) => void;
  private onScenarioComplete?: (engine: SimulationEngine, scorecard: AARScorecard) => void;

  constructor(
    scenarioId?: string,
    onBroadcast?: (engine: SimulationEngine) => void,
    onScenarioComplete?: (engine: SimulationEngine, scorecard: AARScorecard) => void
  ) {
    this.sessionId = `session_${Date.now()}`;
    const foundScenario = SCENARIO_PRESETS.find(s => s.id === scenarioId) || SCENARIO_PRESETS[0];
    this.scenario = foundScenario;
    this.onBroadcast = onBroadcast;
    this.onScenarioComplete = onScenarioComplete;

    this.jammer = {
      azimuth: 0,
      beamWidth: JAMMER_CONFIG.DEFAULT_BEAM_WIDTH,
      maxRange: JAMMER_CONFIG.MAX_RANGE,
      active: false,
      enabledBands: {
        '433MHz': false,
        '868MHz': false,
        '1.2GHz': false,
        '2.4GHz': false,
        '5.8GHz': false
      },
      widebandBarrage: false,
      temperature: 0,
      overheated: false,
      lockoutRemaining: 0
    };

    this.spoof = {
      active: false,
      mode: 'drift'
    };

    this.kinetic = {
      ammo: KINETIC_CONFIG.MAX_AMMO,
      maxAmmo: KINETIC_CONFIG.MAX_AMMO,
      burstSize: KINETIC_CONFIG.BURST_ROUNDS,
      effectiveRange: KINETIC_CONFIG.EFFECTIVE_RANGE,
      lastFireResult: null
    };

    this.vitals = {
      power: 100,
      takeCoverActive: false,
      takeCoverExpiresAt: null,
      baseHealth: 100,
      casualties: 0,
      friendlyTrenchSector: TRENCH_SECTOR
    };

    this.logEvent('RADAR_DETECT', `Initialized scenario "${this.scenario.name}" (${this.scenario.codename}).`, 'info');
  }

  public start() {
    this.lastTickHrtime = process.hrtime.bigint();
    // 20 Hz loop = 50ms interval
    this.intervalHandle = setInterval(() => {
      this.tick();
    }, 50);

    saveSession({
      id: this.sessionId,
      scenarioId: this.scenario.id,
      status: 'active',
      startTime: new Date()
    });
  }

  public stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  public tick() {
    if (this.isPaused) {
      this.lastTickHrtime = process.hrtime.bigint();
      if (this.onBroadcast) {
        this.onBroadcast(this);
      }
      return;
    }

    const nowHr = process.hrtime.bigint();
    const dtSeconds = Number(nowHr - this.lastTickHrtime) / 1e9;
    this.lastTickHrtime = nowHr;

    // Guard dt in reasonable bounds (e.g., in case of process lag)
    const dt = Math.max(0.01, Math.min(0.1, dtSeconds));
    this.simTimeSeconds += dt;

    if (this.status !== 'running') {
      if (this.onBroadcast) {
        this.onBroadcast(this);
      }
      return;
    }

    // 1. Check Take Cover expiry
    if (this.vitals.takeCoverActive && this.vitals.takeCoverExpiresAt) {
      if (Date.now() > this.vitals.takeCoverExpiresAt) {
        this.vitals.takeCoverActive = false;
        this.vitals.takeCoverExpiresAt = null;
      }
    }

    // 2. Handle Jammer thermals & lockout
    this.updateJammerThermals(dt);

    // 3. Spawn scheduled drones
    this.spawnDrones();

    // 4. Update Drone kinematics, flocking, and countermeasures
    this.updateDrones(dt);

    // 5. Check victory or defeat conditions
    this.checkGameCompletion();

    // 6. Broadcast telemetry
    if (this.onBroadcast) {
      this.onBroadcast(this);
    }
  }

  private updateJammerThermals(dt: number) {
    if (this.jammer.overheated) {
      this.jammer.lockoutRemaining = Math.max(0, this.jammer.lockoutRemaining - dt);
      if (this.jammer.lockoutRemaining <= 0) {
        this.jammer.overheated = false;
        this.jammer.temperature = 40; // cooled to safe threshold
        this.logEvent('THERMAL_RECOVERED', 'Jammer emitter core cooled to safe operating limits. Thermal lockout cleared.', 'success');
      }
      return;
    }

    if (this.jammer.active) {
      const heatRate = this.jammer.widebandBarrage
        ? JAMMER_CONFIG.HEAT_RATE_WIDEBAND
        : JAMMER_CONFIG.HEAT_RATE_NORMAL;
      
      this.jammer.temperature = Math.min(100, this.jammer.temperature + heatRate * dt);
      this.peakTemperature = Math.max(this.peakTemperature, this.jammer.temperature);

      // Power drain
      const powerDrainRate = this.jammer.widebandBarrage
        ? JAMMER_CONFIG.POWER_DRAIN_WIDEBAND
        : JAMMER_CONFIG.POWER_DRAIN_NORMAL;
      this.vitals.power = Math.max(0, this.vitals.power - powerDrainRate * dt);

      // Edge Case: 15s continuous (or 5s wideband) triggers 100% overheat -> 8s lockout!
      if (this.jammer.temperature >= 100) {
        this.jammer.overheated = true;
        this.jammer.active = false;
        this.jammer.lockoutRemaining = JAMMER_CONFIG.LOCKOUT_DURATION;
        this.thermalLockoutOccurred = true;
        this.logEvent('THERMAL_LOCKOUT', 'CRITICAL OVERHEAT! Emitter core reached 100%. Automatic 8-second thermal lockout engaged!', 'danger');
      }
    } else {
      // Passive cooling
      if (this.jammer.temperature > 0) {
        this.jammer.temperature = Math.max(0, this.jammer.temperature - JAMMER_CONFIG.COOL_RATE * dt);
      }
      // Power regeneration
      if (this.vitals.power < 100) {
        this.vitals.power = Math.min(100, this.vitals.power + JAMMER_CONFIG.POWER_REGEN * dt);
      }
    }
  }

  private spawnDrones() {
    for (const cfg of this.scenario.droneConfigs) {
      if (this.simTimeSeconds >= cfg.spawnDelaySec) {
        const existing = this.drones.find(d => d.id === cfg.id);
        if (!existing) {
          const dx = cfg.initialPos[0];
          const dy = cfg.initialPos[1];
          const dz = cfg.initialPos[2];
          const dist = Math.sqrt(dx * dx + dy * dy);
          const az = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;

          const newDrone: DroneTelemetry = {
            id: cfg.id,
            callsign: cfg.callsign,
            type: cfg.type,
            designatedType: null,
            x: dx,
            y: dy,
            z: dz,
            vx: cfg.initialVel[0],
            vy: cfg.initialVel[1],
            vz: cfg.initialVel[2],
            speed: Math.hypot(cfg.initialVel[0], cfg.initialVel[1], cfg.initialVel[2]),
            distance: dist,
            azimuth: az,
            elevation: Math.atan2(dz, dist) * 180 / Math.PI,
            frequency: cfg.frequency,
            isFhss: cfg.isFhss,
            hasGps: cfg.hasGps,
            isLeader: !!cfg.isLeader,
            swarmId: cfg.swarmId || null,
            status: 'flying',
            signalStrength: -65 - (dist / 100),
            operatorDistance: cfg.operatorDistance,
            firstDetectedTime: Date.now(),
            designatedTime: null,
            neutralizedTime: null
          };

          this.drones.push(newDrone);
          this.logEvent('RADAR_DETECT', `Radar contact acquired: Unknown target bearing ${Math.round(az)}° at ${Math.round(dist)}m.`, 'warning', cfg.id);
        }
      }
    }
  }

  private updateDrones(dt: number) {
    for (const drone of this.drones) {
      if (drone.status !== 'flying') {
        // If falling/diverting, animate descent
        if (drone.status === 'jammed_lost_link' || drone.status === 'neutralized_crashed') {
          drone.z = Math.max(0, drone.z - 25 * dt);
          drone.x += drone.vx * 0.4 * dt;
          drone.y += drone.vy * 0.4 * dt;
        } else if (drone.status === 'spoofed_diverting') {
          // Diverting outward
          drone.x += drone.vx * dt;
          drone.y += drone.vy * dt;
          drone.z = Math.max(0, drone.z - 8 * dt);
        }
        drone.distance = Math.sqrt(drone.x * drone.x + drone.y * drone.y);
        drone.azimuth = (Math.atan2(drone.x, drone.y) * 180 / Math.PI + 360) % 360;
        continue;
      }

      // Check Soft-kill: Directional Jammer
      const jammerResult = evaluateJammerOnDrone(drone, this.jammer);
      if (jammerResult.severedLink) {
        drone.status = 'jammed_lost_link';
        drone.neutralizedTime = Date.now();
        this.effectiveJams++;
        this.logEvent('JAMMER_SEVERED_LINK', `RF Link severed on ${drone.callsign}! C2 lost at ${Math.round(drone.distance)}m.`, 'success', drone.id);

        if (drone.isLeader) {
          this.swarmLeaderKilled = true;
          this.logEvent('SWARM_LEADER_KILLED', `SWARM LEADER ${drone.callsign} NEUTRALIZED! Follower drones scattering.`, 'danger', drone.id);
        }
        continue;
      }

      // Check Soft-kill: GNSS Spoofing
      if (this.spoof.active) {
        const spoofResult = evaluateSpoofingOnDrone(drone, this.spoof);
        if (spoofResult.effective) {
          drone.status = 'spoofed_diverting';
          drone.neutralizedTime = Date.now();
          // Redirect velocity 180 degrees away from outpost
          drone.vx = -drone.vx * 1.2;
          drone.vy = -drone.vy * 1.2;
          this.logEvent('SPOOF_SUCCESS', `False GPS injected into ${drone.callsign}. Autopilot geofence emergency diversion triggered!`, 'success', drone.id);
          continue;
        }
      }

      // Kinematic update based on threat type
      if (drone.type === 'swarm_node') {
        const boid = computeBoidForces(drone, this.drones, this.swarmLeaderKilled);
        drone.vx += boid.fx * dt;
        drone.vy += boid.fy * dt;
        drone.vz += boid.fz * dt;

        // Speed limit
        const curSpeed = Math.hypot(drone.vx, drone.vy, drone.vz);
        const maxSpeed = this.swarmLeaderKilled ? 35 : 22;
        if (curSpeed > maxSpeed) {
          drone.vx = (drone.vx / curSpeed) * maxSpeed;
          drone.vy = (drone.vy / curSpeed) * maxSpeed;
          drone.vz = (drone.vz / curSpeed) * maxSpeed;
        }
      } else if (drone.type === 'fpv_kamikaze') {
        // High speed terminal dive toward (0, 0, 0)
        const distToPost = Math.hypot(drone.x, drone.y);
        const steerDirX = -drone.x / Math.max(1, distToPost);
        const steerDirY = -drone.y / Math.max(1, distToPost);
        
        // Acceleration into dive
        const diveAccel = 18;
        drone.vx += steerDirX * diveAccel * dt;
        drone.vy += steerDirY * diveAccel * dt;
        
        // Fast altitude plunge
        drone.vz = -Math.min(60, Math.abs(drone.z / (distToPost / 40)));
      } else {
        // Commercial quad: steady reconnaissance transit toward perimeter
        const distToPost = Math.hypot(drone.x, drone.y);
        if (distToPost > 400) {
          const steerX = -drone.x / distToPost;
          const steerY = -drone.y / distToPost;
          drone.vx = steerX * 16;
          drone.vy = steerY * 16;
        } else {
          // Loiter / orbit
          const orbitAngle = Math.atan2(drone.y, drone.x) + 0.02;
          drone.x = Math.cos(orbitAngle) * 400;
          drone.y = Math.sin(orbitAngle) * 400;
        }
      }

      // Position update
      drone.x += drone.vx * dt;
      drone.y += drone.vy * dt;
      drone.z = Math.max(0, drone.z + drone.vz * dt);

      drone.speed = Math.hypot(drone.vx, drone.vy, drone.vz);
      drone.distance = Math.hypot(drone.x, drone.y);
      drone.azimuth = (Math.atan2(drone.x, drone.y) * 180 / Math.PI + 360) % 360;
      drone.elevation = Math.atan2(drone.z, drone.distance) * 180 / Math.PI;

      // Check Impact with Outpost (< 20m)
      if (drone.distance < 20 && drone.z < 30) {
        drone.status = 'impacted_post';
        if (this.vitals.takeCoverActive) {
          // Protected bunker!
          this.vitals.baseHealth = Math.max(0, this.vitals.baseHealth - 10);
          this.casualtiesAvoided++;
          this.logEvent('TAKE_COVER_SUCCESS', `IMPACT! Threat detonated against fortified bunker perimeter. 0 casualties sustained due to TAKE COVER drill!`, 'warning', drone.id);
        } else {
          // Direct casualty
          this.vitals.baseHealth = Math.max(0, this.vitals.baseHealth - 35);
          this.vitals.casualties += 1;
          this.logEvent('BASE_STRUCK', `DIRECT HIT! Unmitigated drone detonation on forward post! Personnel casualties sustained!`, 'danger', drone.id);
        }
      }
    }
  }

  private checkGameCompletion() {
    if (this.status !== 'running') return;

    const allResolved = this.drones.length >= this.scenario.threatCount &&
      this.drones.every(d => d.status !== 'flying');

    const baseDestroyed = this.vitals.baseHealth <= 0;
    const timeExpired = this.simTimeSeconds >= this.scenario.durationSeconds + 5;

    if (allResolved || baseDestroyed || timeExpired) {
      this.status = baseDestroyed ? 'failed' : 'completed';
      this.completeScenario();
    }
  }

  private completeScenario() {
    this.stop();

    const neutralized = this.drones.filter(d => d.status === 'jammed_lost_link' || d.status === 'spoofed_diverting' || d.status === 'neutralized_crashed').length;

    const stats: CombatStats = {
      sessionId: this.sessionId,
      scenario: this.scenario,
      drones: this.drones,
      elapsedTimeSeconds: this.simTimeSeconds,
      totalThreats: this.scenario.threatCount,
      neutralizedCount: neutralized,
      correctClassifications: this.correctClassifications,
      detectionLatenciesMs: this.detectionLatenciesMs,
      effectiveJams: this.effectiveJams,
      wastedJams: this.wastedJams,
      analogSpoofAttempts: this.analogSpoofAttempts,
      kineticShotsFired: this.kineticShotsFired,
      kineticHits: this.kineticHits,
      longRangeKineticWasted: this.longRangeKineticWasted,
      friendlyFireIncidents: this.friendlyFireIncidents,
      peakTemperature: this.peakTemperature,
      thermalLockoutOccurred: this.thermalLockoutOccurred,
      ammoRemaining: this.kinetic.ammo,
      maxAmmo: this.kinetic.maxAmmo,
      baseHealth: this.vitals.baseHealth,
      baseDamageTaken: 100 - this.vitals.baseHealth,
      casualties: this.vitals.casualties,
      casualtiesAvoided: this.casualtiesAvoided
    };

    this.aarScorecard = evaluateAARScore(stats);

    saveSession({
      id: this.sessionId,
      scenarioId: this.scenario.id,
      status: this.status,
      startTime: new Date(Date.now() - this.simTimeSeconds * 1000),
      endTime: new Date(),
      finalScore: this.aarScorecard.overallScore,
      grade: this.aarScorecard.grade,
      metrics: this.aarScorecard.metrics
    });

    saveAARScorecard(this.aarScorecard);

    if (this.onScenarioComplete) {
      this.onScenarioComplete(this, this.aarScorecard);
    }
  }

  // --- Operator Actions ---

  public setJammerAngle(azimuth: number) {
    this.jammer.azimuth = (azimuth + 360) % 360;
  }

  public fireJammer(active: boolean) {
    if (this.jammer.overheated) {
      this.logEvent('JAMMER_FIRED', 'Cannot transmit: Jammer core in thermal lockout!', 'danger');
      return;
    }
    this.jammer.active = active;
    if (active) {
      this.logEvent('JAMMER_FIRED', `Jammer emitting RF energy at azimuth ${Math.round(this.jammer.azimuth)}°.`, 'info');
      // Evaluate if jammer fired with no valid target in cone
      const targetInCone = this.drones.some(d => d.status === 'flying' && evaluateJammerOnDrone(d, this.jammer).inCone);
      if (!targetInCone) {
        this.wastedJams++;
      }
    }
  }

  public toggleJammerBand(band: FrequencyBand, enabled: boolean) {
    this.jammer.enabledBands[band] = enabled;
  }

  public toggleWideband(enabled: boolean) {
    this.jammer.widebandBarrage = enabled;
    if (enabled) {
      this.logEvent('JAMMER_FIRED', 'Wideband Barrage Jamming ENGAGED (3x RF output, 3x heat rate).', 'warning');
    }
  }

  public engageSpoof(active: boolean, mode: 'drift' | 'geofence_lock' = 'drift') {
    this.spoof.active = active;
    this.spoof.mode = mode;
    if (active) {
      this.logEvent('SPOOF_ENGAGED', `GNSS Satellite coordinate spoofing broadcasting (${mode.toUpperCase()}).`, 'info');
      // Edge Case: Operator engages spoofing while facing pure analog FPVs
      const activeAnalog = this.drones.some(d => d.status === 'flying' && !d.hasGps);
      if (activeAnalog) {
        this.analogSpoofAttempts++;
        this.logEvent('SPOOF_INEFFECTIVE_ANALOG', 'Spoofing ineffective: Analog FPV lacks GNSS chip! Wasted emitter energy.', 'danger');
      }
    }
  }

  public fireKinetic(targetDroneId?: string) {
    if (this.kinetic.ammo < KINETIC_CONFIG.BURST_ROUNDS) {
      this.logEvent('KINETIC_FIRED', 'Click! Small-arms magazine depleted! Prescribed ammo exhausted.', 'danger');
      return;
    }

    const target = this.drones.find(d => d.id === targetDroneId && d.status === 'flying') ||
                   this.drones.filter(d => d.status === 'flying').sort((a, b) => a.distance - b.distance)[0] ||
                   null;

    const result = resolveKineticBurst(target, this.kinetic, this.vitals);
    this.kinetic.ammo -= result.ammoSpent;
    this.kineticShotsFired += result.ammoSpent;
    this.kinetic.lastFireResult = {
      targetId: result.targetId,
      hit: result.hit,
      distance: result.distance,
      friendlyFire: result.friendlyFire
    };

    if (result.distance > KINETIC_CONFIG.EFFECTIVE_RANGE) {
      this.longRangeKineticWasted++;
      this.logEvent('KINETIC_MISSED', `Kinetic burst fired at ${Math.round(result.distance)}m (out of range >150m). Ballistic dispersion 100%.`, 'warning');
    }

    if (result.friendlyFire) {
      this.friendlyFireIncidents++;
      this.logEvent('FRIENDLY_FIRE_INCIDENT', `CRITICAL: Small-arms burst directed toward Friendly Personnel Trench (${Math.round(target?.azimuth || 0)}°)! Friendly fire violation!`, 'danger');
    }

    if (result.hit && target) {
      this.kineticHits++;
      target.status = 'neutralized_crashed';
      target.neutralizedTime = Date.now();
      this.logEvent('KINETIC_HIT', `DIRECT BALLISTIC HIT on ${target.callsign} at ${Math.round(result.distance)}m! Threat destroyed!`, 'success', target.id);

      if (target.isLeader) {
        this.swarmLeaderKilled = true;
        this.logEvent('SWARM_LEADER_KILLED', `SWARM LEADER ${target.callsign} SHOT DOWN! Remaining swarm broken.`, 'danger', target.id);
      }
    } else if (target) {
      this.logEvent('KINETIC_MISSED', `Kinetic burst missed ${target.callsign} at ${Math.round(result.distance)}m.`, 'info', target.id);
    }
  }

  public takeCover() {
    this.vitals.takeCoverActive = true;
    this.vitals.takeCoverExpiresAt = Date.now() + 10000; // 10s bunker drill
    this.logEvent('TAKE_COVER_SOUNDED', 'BUNKER ALARM SOUNDED: Outpost personnel into reinforced cover!', 'warning');
  }

  public designateTarget(droneId: string, classification: ThreatType) {
    const drone = this.drones.find(d => d.id === droneId);
    if (!drone) return;

    drone.designatedType = classification;
    drone.designatedTime = Date.now();

    const latencyMs = drone.designatedTime - drone.firstDetectedTime;
    this.detectionLatenciesMs.push(latencyMs);

    if (classification === drone.type) {
      this.correctClassifications++;
      this.logEvent('DESIGNATE', `Correct target classification: ${drone.callsign} identified as ${classification.toUpperCase()} (${(latencyMs / 1000).toFixed(1)}s latency).`, 'success', drone.id);
    } else {
      this.logEvent('DESIGNATE', `MISCLASSIFICATION: ${drone.callsign} designated as ${classification.toUpperCase()}, actual is ${drone.type.toUpperCase()}!`, 'danger', drone.id);
    }
  }

  public logEvent(type: AuditEvent['type'], description: string, severity: AuditEvent['severity'], targetId?: string) {
    const event: AuditEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      type,
      description,
      severity,
      targetId
    };

    this.recentEvents.unshift(event);
    if (this.recentEvents.length > 20) {
      this.recentEvents.pop();
    }

    saveAuditEvent({
      id: event.id,
      sessionId: this.sessionId,
      timestamp: new Date(event.timestamp),
      type: event.type,
      description: event.description,
      severity: event.severity,
      payload: { targetId }
    });
  }
}
