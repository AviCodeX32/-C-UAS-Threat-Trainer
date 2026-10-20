import React from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { Target, AlertTriangle, Crosshair } from 'lucide-react';

export const KineticDefense: React.FC = () => {
  const {
    kinetic,
    drones,
    selectedDroneId,
    vitals,
    fireKinetic
  } = useSimulatorStore();

  const activeDrones = drones.filter(d => d.status === 'flying');
  const target = drones.find(d => d.id === selectedDroneId && d.status === 'flying') ||
                 activeDrones.sort((a, b) => a.distance - b.distance)[0] ||
                 null;

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

  const ammoPercent = (kinetic.ammo / kinetic.maxAmmo) * 100;

  return (
    <div className="bg-[#0F141C] border border-[#243042] flex flex-col flex-shrink-0 relative">
      <span className="corner-bracket-tl" />
      <span className="corner-bracket-tr" />
      <span className="corner-bracket-bl" />
      <span className="corner-bracket-br" />

      {/* Header */}
      <div className="px-3 py-2 bg-[#0A0D12] border-b border-[#243042] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Target className="w-3.5 h-3.5 text-[#FF1E56]" />
          <span className="text-[11px] font-bold text-[#E6EDF5] tracking-wider uppercase font-display">
            CIWS KINETIC POINT-DEFENSE (7.62mm)
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold text-[#E6EDF5]">
          {kinetic.ammo}/{kinetic.maxAmmo} RDS
        </span>
      </div>

      <div className="p-2.5 space-y-2">
        {/* Ammo Gauge */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-[9px] font-mono text-[#5D728E]">
            <span>DRUM MAGAZINE</span>
            <span className="text-[#E6EDF5] font-bold">{Math.round(ammoPercent)}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#06080B] border border-[#243042] overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ${
                ammoPercent > 40 ? 'bg-[#00FF88]' : ammoPercent > 15 ? 'bg-[#FFB703]' : 'bg-[#FF1E56]'
              }`}
              style={{ width: `${ammoPercent}%` }}
            />
          </div>
        </div>

        {/* Dynamic Hit Probability Gauge */}
        <div className="bg-[#0A0D12] p-2 border border-[#243042] space-y-1 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-[#5D728E] text-[9px] uppercase font-bold">TARGET RNG:</span>
            <span className="text-white font-bold">
              {target ? `${Math.round(distance)}m` : 'NONE'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#5D728E] text-[9px] uppercase font-bold">KILL PROB:</span>
            {rangeStatus === 'optimal' ? (
              <span className="text-[#00FF88] font-bold">{hitProbPercent}% [OPTIMAL &lt;100m]</span>
            ) : rangeStatus === 'marginal' ? (
              <span className="text-[#FFB703] font-bold">{hitProbPercent}% [MARGINAL]</span>
            ) : (
              <span className="text-[#5D728E]">0% [OUT OF RANGE &gt;150m]</span>
            )}
          </div>
        </div>

        {/* Friendly Trench Warning if Aimed Towards Trench */}
        {isInFriendlyTrench && (
          <div className="flex items-center gap-1.5 p-1.5 bg-[#FF1E56]/15 border border-[#FF1E56]/50 text-[#FF1E56] text-[9px] font-mono">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>INTERLOCK ACTIVE: Southern trench sector safe-fire lock.</span>
          </div>
        )}

        {/* Fire Trigger */}
        <button
          disabled={kinetic.ammo < 5 || !target}
          onClick={() => fireKinetic(target?.id)}
          className={`w-full py-2 font-mono font-bold text-[11px] tracking-wider transition-all border flex items-center justify-center gap-1.5 btn-tactile ${
            kinetic.ammo < 5 || !target
              ? 'bg-[#0A0D12] text-[#5D728E] border-[#243042] cursor-not-allowed opacity-60'
              : isInFriendlyTrench
              ? 'bg-[#FF1E56]/20 text-[#FF1E56] border-[#FF1E56]'
              : 'bg-[#FF1E56] hover:bg-[#FF1E56]/90 text-white border-[#FF1E56]'
          }`}
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>FIRE 5-ROUND 7.62mm BURST</span>
        </button>
      </div>
    </div>
  );
};
