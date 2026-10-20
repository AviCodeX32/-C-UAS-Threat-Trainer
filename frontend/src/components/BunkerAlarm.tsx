import React from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { ShieldAlert, AlertOctagon } from 'lucide-react';

export const BunkerAlarm: React.FC = () => {
  const { vitals, takeCover } = useSimulatorStore();

  const isAlarmActive = vitals.takeCoverActive;

  return (
    <div className="bg-[#0F141C] border border-[#243042] flex flex-col flex-shrink-0 relative">
      <span className="corner-bracket-tl" />
      <span className="corner-bracket-tr" />
      <span className="corner-bracket-bl" />
      <span className="corner-bracket-br" />

      {/* Header */}
      <div className="px-3 py-2 bg-[#0A0D12] border-b border-[#243042] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-3.5 h-3.5 text-[#FFB703]" />
          <span className="text-[11px] font-bold text-[#E6EDF5] tracking-wider uppercase font-display">
            OUTPOST BUNKER DEFENSE
          </span>
        </div>
        <span className="text-[9px] text-[#5D728E] font-mono tracking-wider">
          EMERGENCY DRILL
        </span>
      </div>

      <div className="p-2.5 space-y-1.5">
        <button
          onClick={takeCover}
          disabled={isAlarmActive}
          className={`w-full py-2 font-mono font-bold text-[11px] tracking-wider border transition-all flex items-center justify-center gap-1.5 btn-tactile ${
            isAlarmActive
              ? 'bg-[#FFB703]/25 text-[#FFB703] border-[#FFB703]'
              : 'bg-[#0A0D12] text-[#FF1E56] border-[#FF1E56]/60 hover:bg-[#FF1E56]/15 hover:border-[#FF1E56]'
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>{isAlarmActive ? 'BUNKER SHELTER ACTIVE' : 'SOUND "TAKE COVER" ALARM'}</span>
        </button>

        <p className="text-[9px] text-[#5D728E] text-center font-mono">
          Sound when fast kamikaze breaches 100m to prevent troop casualties.
        </p>
      </div>
    </div>
  );
};
