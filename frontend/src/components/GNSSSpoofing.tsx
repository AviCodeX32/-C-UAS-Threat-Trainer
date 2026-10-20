import React from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { Globe2, AlertTriangle } from 'lucide-react';

export const GNSSSpoofing: React.FC = () => {
  const { spoof, drones, selectedDroneId, engageSpoof } = useSimulatorStore();

  const target = drones.find(d => d.id === selectedDroneId && d.status === 'flying') ||
                 drones.find(d => d.status === 'flying') || null;

  const isTargetAnalog = target && !target.hasGps;

  return (
    <div className="bg-[#0F141C] border border-[#243042] flex flex-col flex-shrink-0 relative">
      <span className="corner-bracket-tl" />
      <span className="corner-bracket-tr" />
      <span className="corner-bracket-bl" />
      <span className="corner-bracket-br" />

      {/* Header */}
      <div className="px-3 py-2 bg-[#0A0D12] border-b border-[#243042] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Globe2 className="w-3.5 h-3.5 text-[#00FF88]" />
          <span className="text-[11px] font-bold text-[#E6EDF5] tracking-wider uppercase font-display">
            GNSS SATELLITE SPOOFING
          </span>
        </div>
        <span className={`text-[10px] font-mono font-bold ${spoof.active ? 'text-[#00FF88]' : 'text-[#5D728E]'}`}>
          {spoof.active ? 'TRANSMITTING L1/L2' : 'OFFLINE'}
        </span>
      </div>

      <div className="p-2.5 space-y-2">
        <div className="flex items-center justify-between bg-[#0A0D12] p-2 border border-[#243042]">
          <div>
            <div className="text-[11px] font-bold text-white font-mono">
              COORDINATE INJECTION
            </div>
            <div className="text-[9px] text-[#5D728E] font-mono">
              Overrides GPS autopilot waypoint vectors
            </div>
          </div>

          <button
            onClick={() => engageSpoof(!spoof.active, spoof.mode)}
            className={`px-3 py-1 text-[10px] font-mono font-bold border transition-all btn-tactile ${
              spoof.active
                ? 'bg-[#00FF88]/20 text-[#00FF88] border-[#00FF88]'
                : 'bg-[#0F141C] text-[#5D728E] border-[#243042] hover:text-white'
            }`}
          >
            {spoof.active ? 'ENGAGED' : 'ENGAGE'}
          </button>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
          <button
            onClick={() => engageSpoof(spoof.active, 'drift')}
            className={`py-1.5 px-2 text-center border font-semibold text-[10px] transition-all btn-tactile ${
              spoof.mode === 'drift'
                ? 'bg-[#00FF88]/20 text-[#00FF88] border-[#00FF88]'
                : 'bg-[#0A0D12] text-[#5D728E] border-[#243042] hover:text-[#E6EDF5]'
            }`}
          >
            Course Drift
          </button>
          <button
            onClick={() => engageSpoof(spoof.active, 'geofence_lock')}
            className={`py-1.5 px-2 text-center border font-semibold text-[10px] transition-all btn-tactile ${
              spoof.mode === 'geofence_lock'
                ? 'bg-[#00FF88]/20 text-[#00FF88] border-[#00FF88]'
                : 'bg-[#0A0D12] text-[#5D728E] border-[#243042] hover:text-[#E6EDF5]'
            }`}
          >
            Geofence Lock
          </button>
        </div>

        {/* Warning if Target is Analog FPV */}
        {isTargetAnalog && (
          <div className="flex items-center gap-1.5 p-1.5 bg-[#FFB703]/10 border border-[#FFB703]/40 text-[#FFB703] text-[9px] font-mono">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Notice: Target uses manual analog link without GPS. Spoofing has 0 effect.</span>
          </div>
        )}
      </div>
    </div>
  );
};
