import React from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { BatteryCharging, Flame, HeartPulse } from 'lucide-react';

export const StationVitals: React.FC = () => {
  const { vitals, jammer } = useSimulatorStore();

  const temp = Math.round(jammer.temperature);
  const power = Math.round(vitals.power);
  const health = Math.round(vitals.baseHealth);

  return (
    <div className="bg-[#0F141C] border border-[#243042] flex flex-col flex-shrink-0 relative">
      <span className="corner-bracket-tl" />
      <span className="corner-bracket-tr" />
      <span className="corner-bracket-bl" />
      <span className="corner-bracket-br" />

      {/* Header */}
      <div className="px-3 py-2 bg-[#0A0D12] border-b border-[#243042] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <HeartPulse className="w-3.5 h-3.5 text-[#00FF88]" />
          <span className="text-[11px] font-bold text-[#E6EDF5] tracking-wider uppercase font-display">
            STATION VITALS & THERMALS
          </span>
        </div>
        <span className="text-[9px] text-[#5D728E] font-mono tracking-wider">
          TELEMETRY
        </span>
      </div>

      <div className="p-2.5 space-y-2">
        {/* Jammer Core Temperature */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#5D728E] text-[9px] uppercase font-bold flex items-center gap-1">
              <Flame className="w-3 h-3 text-[#FFB703]" />
              <span>CORE TEMP:</span>
            </span>
            <span className={`font-bold text-[10px] ${
              temp >= 100 ? 'text-[#FF1E56]' : temp > 80 ? 'text-[#FFB703]' : 'text-[#E6EDF5]'
            }`}>
              {temp}% {temp >= 100 ? '[LOCKOUT]' : temp > 80 ? '[CAUTION]' : '[NOMINAL]'}
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#06080B] border border-[#243042] overflow-hidden">
            <div
              className={`h-full transition-all duration-150 ${
                temp >= 100 ? 'bg-[#FF1E56]' : temp > 80 ? 'bg-[#FF1E56]' : temp > 60 ? 'bg-[#FFB703]' : 'bg-[#00E5FF]'
              }`}
              style={{ width: `${temp}%` }}
            />
          </div>
          <div className="flex justify-between text-[8px] text-[#5D728E] font-mono">
            <span>0°C Cold</span>
            <span className="text-[#FFB703]">80% Caution</span>
            <span className="text-[#FF1E56]">100% Lockout</span>
          </div>
        </div>

        {/* Generator Battery Bar */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#5D728E] text-[9px] uppercase font-bold flex items-center gap-1">
              <BatteryCharging className="w-3 h-3 text-[#00E5FF]" />
              <span>POWER CELL:</span>
            </span>
            <span className="font-bold text-[#E6EDF5] text-[10px]">{power}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#06080B] border border-[#243042] overflow-hidden">
            <div
              className="h-full bg-[#00E5FF] transition-all duration-200"
              style={{ width: `${power}%` }}
            />
          </div>
        </div>

        {/* Base Integrity & Casualties */}
        <div className="grid grid-cols-2 gap-1.5 pt-0.5 text-xs font-mono">
          <div className="bg-[#0A0D12] p-1.5 border border-[#243042]">
            <div className="text-[9px] text-[#5D728E] uppercase">BASE INTEGRITY</div>
            <div className={`text-xs font-bold mt-0.5 ${health < 50 ? 'text-[#FF1E56]' : health < 80 ? 'text-[#FFB703]' : 'text-[#00FF88]'}`}>
              {health}%
            </div>
          </div>

          <div className="bg-[#0A0D12] p-1.5 border border-[#243042]">
            <div className="text-[9px] text-[#5D728E] uppercase">CASUALTIES</div>
            <div className={`text-xs font-bold mt-0.5 ${vitals.casualties > 0 ? 'text-[#FF1E56]' : 'text-[#00FF88]'}`}>
              {vitals.casualties} KIA
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
