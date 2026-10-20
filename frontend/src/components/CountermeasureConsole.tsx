import React, { useState, useEffect } from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { FrequencyBand } from '@cuas/shared';
import { 
  Radio, 
  Target, 
  ShieldAlert, 
  Zap, 
  Flame, 
  Globe2, 
  AlertTriangle, 
  Crosshair, 
  BatteryCharging, 
  HeartPulse, 
  AlertOctagon,
  Check,
  ChevronRight
} from 'lucide-react';

export const CountermeasureConsole: React.FC = () => {
  const {
    jammer,
    spoof,
    kinetic,
    vitals,
    drones,
    selectedDroneId,
    fireJammer,
    toggleJammerBand,
    toggleWideband,
    engageSpoof,
    fireKinetic,
    takeCover
  } = useSimulatorStore();

  const [activeTab, setActiveTab] = useState<'ew' | 'kinetic' | 'bunker'>('ew');

  const activeDrones = drones.filter(d => d.status === 'flying');
  const target = drones.find(d => d.id === selectedDroneId && d.status === 'flying') ||
                 activeDrones.sort((a, b) => a.distance - b.distance)[0] ||
                 null;

  // Auto-suggest tab if target is dangerously close
  const isTargetInDive = target && target.type === 'fpv_kamikaze' && target.distance < 200;

  useEffect(() => {
    if (isTargetInDive && target.distance < 120 && activeTab === 'ew') {
      setActiveTab('kinetic');
    }
  }, [isTargetInDive, target?.distance]);

  // Thermals & Power
  const temp = Math.round(jammer.temperature);
  const power = Math.round(vitals.power);
  const isOverheated = jammer.overheated;
  const isJamming = jammer.active;

  // Kinetic Calculations
  const distance = target ? target.distance : 0;
  let hitProbPercent = 0;
  let rangeStatus: 'optimal' | 'marginal' | 'out_of_range' = 'out_of_range';

  if (target) {
    if (distance <= 100) {
      hitProbPercent = Math.round(Math.max(65, 92 - (distance / 100) * 20));
      rangeStatus = 'optimal';
    } else if (distance <= 150) {
      hitProbPercent = Math.round(Math.max(0, 50 * (1 - (distance - 100) / 50)));
      rangeStatus = 'marginal';
    } else {
      hitProbPercent = 0;
      rangeStatus = 'out_of_range';
    }
  }

  const isInFriendlyTrench = target
    ? (target.azimuth >= vitals.friendlyTrenchSector.minAzimuth && target.azimuth <= vitals.friendlyTrenchSector.maxAzimuth)
    : false;

  const handleMatchTargetFreq = () => {
    if (target) {
      if (target.isFhss) {
        toggleWideband(true);
      } else {
        toggleJammerBand(target.frequency, true);
      }
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col h-full overflow-hidden shadow-lg select-none">
      {/* Header & Quick Telemetry HUD */}
      <div className="p-3 bg-slate-950/90 border-b border-slate-800 flex-shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white tracking-wider uppercase font-sans">
              DEFENSE CONSOLE
            </span>
          </div>

          <div className="flex items-center space-x-2 text-[11px] font-mono">
            {isOverheated ? (
              <span className="text-red-400 font-bold flex items-center gap-1 animate-pulse">
                <Flame className="w-3.5 h-3.5" />
                LOCKOUT ({Math.ceil(jammer.lockoutRemaining)}s)
              </span>
            ) : isJamming ? (
              <span className="text-cyan-400 font-bold flex items-center gap-1 animate-pulse">
                <Zap className="w-3.5 h-3.5" />
                TRANSMITTING
              </span>
            ) : (
              <span className="text-slate-400">STANDBY</span>
            )}
          </div>
        </div>

        {/* Vital Gauges Mini-HUD */}
        <div className="grid grid-cols-3 gap-2 text-[10px] font-mono pt-0.5">
          {/* Thermal Meter */}
          <div className="bg-slate-900 p-1.5 rounded-lg border border-slate-800">
            <div className="flex justify-between text-slate-400 mb-0.5">
              <span>THERMAL</span>
              <span className={temp > 80 ? 'text-red-400 font-bold' : temp > 50 ? 'text-amber-400' : 'text-slate-200'}>
                {temp}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${
                  temp >= 100 ? 'bg-red-500' : temp > 80 ? 'bg-red-400' : temp > 50 ? 'bg-amber-400' : 'bg-cyan-500'
                }`}
                style={{ width: `${temp}%` }}
              />
            </div>
          </div>

          {/* Generator Power */}
          <div className="bg-slate-900 p-1.5 rounded-lg border border-slate-800">
            <div className="flex justify-between text-slate-400 mb-0.5">
              <span>POWER</span>
              <span className="text-slate-200 font-bold">{power}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-400 transition-all duration-200"
                style={{ width: `${power}%` }}
              />
            </div>
          </div>

          {/* Kinetic Magazine */}
          <div className="bg-slate-900 p-1.5 rounded-lg border border-slate-800">
            <div className="flex justify-between text-slate-400 mb-0.5">
              <span>AMMO</span>
              <span className="text-slate-200 font-bold">{kinetic.ammo} RDS</span>
            </div>
            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-200"
                style={{ width: `${(kinetic.ammo / kinetic.maxAmmo) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Countermeasure Category Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('ew')}
            className={`py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'ew'
                ? 'bg-slate-800 text-cyan-300 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>RF Jammer</span>
          </button>

          <button
            onClick={() => setActiveTab('kinetic')}
            className={`py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 relative ${
              activeTab === 'kinetic'
                ? 'bg-slate-800 text-red-300 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Kinetic</span>
            {isTargetInDive && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping absolute top-1 right-1" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('bunker')}
            className={`py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'bunker'
                ? 'bg-slate-800 text-amber-300 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Bunker</span>
          </button>
        </div>
      </div>

      {/* Main Tab Body */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 min-h-0">
        {activeTab === 'ew' && (
          <div className="space-y-3.5">
            {/* Frequency Bands */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">FREQUENCY CHANNELS:</span>
                {target && (
                  <button
                    onClick={handleMatchTargetFreq}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    Match Target ({target.frequency})
                  </button>
                )}
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {(['433MHz', '868MHz', '2.4GHz', '5.8GHz'] as FrequencyBand[]).map((band) => {
                  const isEnabled = jammer.enabledBands[band];
                  const isTargetBand = target && target.frequency === band;
                  return (
                    <button
                      key={band}
                      disabled={isOverheated || jammer.widebandBarrage}
                      onClick={() => toggleJammerBand(band, !isEnabled)}
                      className={`py-2 px-1 rounded-lg text-xs font-mono font-bold border transition-all btn-tactile ${
                        jammer.widebandBarrage
                          ? 'bg-slate-950/40 text-slate-600 border-slate-800 cursor-not-allowed'
                          : isEnabled
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-sm'
                          : isTargetBand
                          ? 'bg-slate-950 text-cyan-400 border-cyan-600/60 ring-1 ring-cyan-500/30'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {band}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Wideband Barrage */}
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Wideband Barrage</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded">
                    FHSS
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Suppresses frequency-hopping swarms (3x heat)
                </div>
              </div>

              <button
                disabled={isOverheated}
                onClick={() => toggleWideband(!jammer.widebandBarrage)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all btn-tactile ${
                  jammer.widebandBarrage
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                {jammer.widebandBarrage ? 'ENGAGED' : 'OFF'}
              </button>
            </div>

            {/* Jammer Fire Trigger */}
            <button
              disabled={isOverheated}
              onClick={() => fireJammer(!jammer.active)}
              className={`w-full py-3 rounded-lg font-bold text-xs tracking-wider transition-all border flex items-center justify-center gap-2 btn-tactile ${
                isOverheated
                  ? 'bg-slate-950 text-red-500 border-red-900/60 cursor-not-allowed opacity-60'
                  : isJamming
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-lg shadow-cyan-500/40 animate-pulse'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-500 shadow-md'
              }`}
            >
              <Zap className={`w-4 h-4 ${isJamming ? 'text-slate-950' : 'text-white'}`} />
              <span>
                {isOverheated
                  ? `THERMAL LOCKOUT (${Math.ceil(jammer.lockoutRemaining)}s)`
                  : isJamming
                  ? 'CEASE JAMMING EMISSION [ACTIVE]'
                  : 'TRANSMIT DIRECTIONAL JAMMER'}
              </span>
            </button>

            {/* GNSS Spoofing Sub-Section */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Globe2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200">GNSS Coordinate Spoofing</span>
                </div>
                <button
                  onClick={() => engageSpoof(!spoof.active, spoof.mode)}
                  className={`px-3 py-1 rounded-md text-xs font-bold border transition-all ${
                    spoof.active
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-950 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                >
                  {spoof.active ? 'ENGAGED' : 'ENGAGE'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => engageSpoof(spoof.active, 'drift')}
                  className={`py-1.5 px-2 rounded-lg text-center border font-semibold transition-all ${
                    spoof.mode === 'drift'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  Course Drift
                </button>
                <button
                  onClick={() => engageSpoof(spoof.active, 'geofence_lock')}
                  className={`py-1.5 px-2 rounded-lg text-center border font-semibold transition-all ${
                    spoof.mode === 'geofence_lock'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  Geofence Lock
                </button>
              </div>

              {target && !target.hasGps && (
                <div className="flex items-center gap-2 p-2 bg-slate-950 text-amber-300 text-[11px] rounded-lg border border-amber-900/60">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Target has no GPS receiver. Spoofing has 0 effect.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'kinetic' && (
          <div className="space-y-3.5">
            {/* Target Range & Hit Probability */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Target Range:</span>
                <span className="text-white font-mono font-bold text-sm">
                  {target ? `${Math.round(distance)}m` : 'NO TARGET'}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Hit Probability:</span>
                <span className={`font-mono font-bold ${
                  rangeStatus === 'optimal' ? 'text-emerald-400' : rangeStatus === 'marginal' ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {hitProbPercent}% {rangeStatus === 'optimal' ? '[OPTIMAL <100m]' : rangeStatus === 'marginal' ? '[MARGINAL]' : '[OUT OF RANGE]'}
                </span>
              </div>

              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    rangeStatus === 'optimal' ? 'bg-emerald-500' : rangeStatus === 'marginal' ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${hitProbPercent}%` }}
                />
              </div>
            </div>

            {/* Trench warning */}
            {isInFriendlyTrench && (
              <div className="flex items-center gap-2 p-2.5 bg-red-950/80 border border-red-700 text-red-300 text-xs rounded-lg animate-pulse">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>SAFETY WARNING: Aim vector crosses southern friendly trench sector! Hold fire to prevent casualties.</span>
              </div>
            )}

            {/* Kinetic Burst Button */}
            <button
              disabled={kinetic.ammo < 5 || !target}
              onClick={() => fireKinetic(target?.id)}
              className={`w-full py-3.5 rounded-lg font-bold text-xs tracking-wider transition-all border flex items-center justify-center gap-2 btn-tactile ${
                kinetic.ammo < 5
                  ? 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed'
                  : isInFriendlyTrench
                  ? 'bg-red-950 text-red-400 border-red-700 hover:bg-red-900/60'
                  : 'bg-red-600 hover:bg-red-500 text-white border-red-500 shadow-lg shadow-red-600/30 active:scale-[0.98]'
              }`}
            >
              <Crosshair className="w-4 h-4" />
              <span>FIRE 5-ROUND KINETIC BURST</span>
            </button>

            <p className="text-[11px] text-slate-400 text-center">
              Small-arms point defense is effective at &lt;100m. Firing past 150m wastes ammunition.
            </p>
          </div>
        )}

        {activeTab === 'bunker' && (
          <div className="space-y-3.5">
            {/* Bunker Alarm Drill */}
            <button
              onClick={takeCover}
              disabled={vitals.takeCoverActive}
              className={`w-full py-4 rounded-xl font-bold text-xs tracking-wider border transition-all flex items-center justify-center gap-2.5 btn-tactile ${
                vitals.takeCoverActive
                  ? 'bg-red-600 text-white border-red-400 shadow-xl shadow-red-600/60 animate-pulse'
                  : 'bg-slate-950 text-red-400 border-red-600/60 hover:bg-red-600 hover:text-white shadow-md active:scale-[0.98]'
              }`}
            >
              <AlertOctagon className="w-5 h-5" />
              <span>{vitals.takeCoverActive ? '🚨 BUNKER SHELTER ACTIVE 🚨' : 'SOUND "TAKE COVER" ALARM'}</span>
            </button>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-2">
              <span className="font-bold text-white block">DOCTRINAL DIRECTIVE:</span>
              <p className="leading-relaxed">
                When a high-speed kamikaze FPV breaches 100 meters at dive speed and soft-kill countermeasures have failed, sounding "Take Cover" moves all forward post personnel into fortified underground cover, preventing casualties upon impact.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
