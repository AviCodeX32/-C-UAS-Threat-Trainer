import React from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { Shield, Crosshair, CheckCircle2, HelpCircle, Radio } from 'lucide-react';

export const ClassificationCard: React.FC = () => {
  const { drones, selectedDroneId, setSelectedDrone, designateTarget } = useSimulatorStore();

  const activeDrones = drones.filter(d => d.status === 'flying');
  const selected = drones.find(d => d.id === selectedDroneId) || activeDrones[0] || null;

  const isDesignated = selected && selected.designatedType !== null;
  const isCorrect = isDesignated && selected?.designatedType === selected?.type;

  return (
    <div className="bg-[#0F141C] border border-[#243042] flex flex-col flex-shrink-0 relative">
      <span className="corner-bracket-tl" />
      <span className="corner-bracket-tr" />
      <span className="corner-bracket-bl" />
      <span className="corner-bracket-br" />

      {/* Header */}
      <div className="px-3 py-2 bg-[#0A0D12] border-b border-[#243042] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="w-3.5 h-3.5 text-[#00E5FF]" />
          <span className="text-[11px] font-bold text-[#E6EDF5] tracking-wider uppercase font-display">
            TARGET INTELLIGENCE & ID
          </span>
        </div>

        {/* Threat Track Selector */}
        {activeDrones.length > 1 && (
          <select
            value={selected?.id || ''}
            onChange={(e) => setSelectedDrone(e.target.value)}
            className="bg-[#06080B] text-[10px] text-[#00E5FF] px-2 py-0.5 border border-[#243042] font-mono cursor-pointer focus:outline-none focus:border-[#00E5FF]"
          >
            {activeDrones.map(d => (
              <option key={d.id} value={d.id}>
                {d.callsign} ({Math.round(d.distance)}m)
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="p-2.5 space-y-2">
        {selected ? (
          <>
            {/* Target Identity Strip */}
            <div className="flex items-center justify-between bg-[#0A0D12] p-2 border border-[#243042]">
              <div className="min-w-0 pr-2">
                <div className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                  <span>{selected.callsign}</span>
                  {selected.isLeader && (
                    <span className="px-1 py-0.2 bg-[#FF1E56]/20 text-[#FF1E56] border border-[#FF1E56]/50 text-[9px] font-bold">
                      SWARM LEADER
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-[#5D728E] mt-0.5 font-mono">
                  RNG: <span className="text-[#E6EDF5] font-semibold">{Math.round(selected.distance)}m</span> • BRG: <span className="text-[#E6EDF5] font-semibold">{Math.round(selected.azimuth)}°</span>
                </div>
              </div>

              {/* Identification Status */}
              <div className="flex-shrink-0">
                {isDesignated ? (
                  <div className={`px-2 py-0.5 text-[10px] font-bold font-mono flex items-center gap-1 border ${
                    isCorrect 
                      ? 'bg-[#00FF88]/15 text-[#00FF88] border-[#00FF88]/50' 
                      : 'bg-[#FF1E56]/15 text-[#FF1E56] border-[#FF1E56]/50'
                  }`}>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{selected.designatedType?.replace('_', ' ').toUpperCase()}</span>
                  </div>
                ) : (
                  <div className="px-2 py-0.5 bg-[#FFB703]/15 text-[#FFB703] border border-[#FFB703]/50 text-[10px] font-mono flex items-center gap-1">
                    <HelpCircle className="w-3 h-3 text-[#FFB703]" />
                    <span>UNCLASSIFIED</span>
                  </div>
                )}
              </div>
            </div>

            {/* Telemetry Metrics Grid (2x2) */}
            <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
              <div className="bg-[#0A0D12] p-1.5 border border-[#243042]">
                <span className="text-[#5D728E] text-[9px] block font-mono uppercase">VELOCITY</span>
                <span className="text-white font-bold text-xs">{Math.round(selected.speed)} m/s</span>
                <span className="text-[#5D728E] text-[9px] block">({Math.round(selected.speed * 3.6)} km/h)</span>
              </div>

              <div className="bg-[#0A0D12] p-1.5 border border-[#243042]">
                <span className="text-[#5D728E] text-[9px] block font-mono uppercase">ALTITUDE MSL</span>
                <span className="text-white font-bold text-xs">{Math.round(selected.z)} m</span>
                <span className="text-[#5D728E] text-[9px] block">El: {Math.round(selected.elevation)}°</span>
              </div>

              <div className="bg-[#0A0D12] p-1.5 border border-[#243042]">
                <span className="text-[#5D728E] text-[9px] block font-mono uppercase">RF CARRIER</span>
                <span className="text-[#00E5FF] font-bold text-xs">{selected.frequency}</span>
                <span className="text-[#5D728E] text-[9px] block">{selected.isFhss ? '⚡ FHSS ACTIVE' : 'FIXED BAND'}</span>
              </div>

              <div className="bg-[#0A0D12] p-1.5 border border-[#243042]">
                <span className="text-[#5D728E] text-[9px] block font-mono uppercase">NAVIGATION</span>
                <span className={`font-bold text-xs ${selected.hasGps ? 'text-[#00FF88]' : 'text-[#E6EDF5]'}`}>
                  {selected.hasGps ? 'GPS LINK' : 'ANALOG MANUAL'}
                </span>
                <span className="text-[#5D728E] text-[9px] block">{selected.hasGps ? 'SPOOFABLE' : 'SPOOF IMMUNE'}</span>
              </div>
            </div>

            {/* D-TID-A Manual Classification Action */}
            <div className="space-y-1 pt-0.5">
              <div className="text-[9px] font-bold text-[#5D728E] uppercase tracking-wider flex items-center gap-1 font-mono">
                <Crosshair className="w-3 h-3 text-[#00E5FF]" />
                <span>CLASSIFY THREAT DOCTRINE:</span>
              </div>

              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => designateTarget(selected.id, 'commercial_quad')}
                  className={`py-1.5 px-1 text-[10px] font-mono font-bold border transition-all btn-tactile ${
                    selected.designatedType === 'commercial_quad'
                      ? 'bg-[#FFB703]/25 text-[#FFB703] border-[#FFB703]'
                      : 'bg-[#0A0D12] text-[#FFB703]/80 border-[#243042] hover:border-[#FFB703]'
                  }`}
                >
                  QUAD
                </button>

                <button
                  onClick={() => designateTarget(selected.id, 'fpv_kamikaze')}
                  className={`py-1.5 px-1 text-[10px] font-mono font-bold border transition-all btn-tactile ${
                    selected.designatedType === 'fpv_kamikaze'
                      ? 'bg-[#FF1E56]/25 text-[#FF1E56] border-[#FF1E56]'
                      : 'bg-[#0A0D12] text-[#FF1E56]/80 border-[#243042] hover:border-[#FF1E56]'
                  }`}
                >
                  KAMIKAZE
                </button>

                <button
                  onClick={() => designateTarget(selected.id, 'swarm_node')}
                  className={`py-1.5 px-1 text-[10px] font-mono font-bold border transition-all btn-tactile ${
                    selected.designatedType === 'swarm_node'
                      ? 'bg-[#00E5FF]/25 text-[#00E5FF] border-[#00E5FF]'
                      : 'bg-[#0A0D12] text-[#00E5FF]/80 border-[#243042] hover:border-[#00E5FF]'
                  }`}
                >
                  SWARM
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-4 text-center text-[#5D728E] text-xs font-mono">
            <Radio className="w-6 h-6 text-[#243042] mx-auto mb-1 animate-pulse" />
            <p>Scanning forward airspace perimeter.</p>
          </div>
        )}
      </div>
    </div>
  );
};
