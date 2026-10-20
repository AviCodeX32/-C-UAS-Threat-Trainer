import React from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { FrequencyBand } from '@cuas/shared';
import { Radio, Zap, Flame } from 'lucide-react';

export const JammerControls: React.FC = () => {
  const {
    jammer,
    drones,
    selectedDroneId,
    fireJammer,
    toggleJammerBand,
    toggleWideband
  } = useSimulatorStore();

  const isFiring = jammer.active;
  const isOverheated = jammer.overheated;

  const target = drones.find(d => d.id === selectedDroneId && d.status === 'flying') ||
                 drones.find(d => d.status === 'flying') || null;

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
    <div className="bg-[#0F141C] border border-[#243042] flex flex-col flex-shrink-0 relative">
      <span className="corner-bracket-tl" />
      <span className="corner-bracket-tr" />
      <span className="corner-bracket-bl" />
      <span className="corner-bracket-br" />

      {/* Header */}
      <div className="px-3 py-2 bg-[#0A0D12] border-b border-[#243042] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Radio className="w-3.5 h-3.5 text-[#00E5FF]" />
          <span className="text-[11px] font-bold text-[#E6EDF5] tracking-wider uppercase font-display">
            DIRECTIONAL RF JAMMER
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono">
          {isOverheated ? (
            <span className="text-[#FF1E56] font-bold flex items-center gap-1">
              <Flame className="w-3 h-3 animate-pulse" />
              LOCKOUT ({Math.ceil(jammer.lockoutRemaining)}s)
            </span>
          ) : isFiring ? (
            <span className="text-[#00E5FF] font-bold flex items-center gap-1">
              <Zap className="w-3 h-3 animate-pulse" />
              TRANSMITTING
            </span>
          ) : (
            <span className="text-[#5D728E]">STANDBY</span>
          )}
        </div>
      </div>

      <div className="p-2.5 space-y-2">
        {/* Frequency Band Selector Chips */}
        <div>
          <div className="flex items-center justify-between mb-1 text-[10px] font-mono">
            <span className="text-[#5D728E] uppercase font-bold">
              FREQUENCY CHANNELS:
            </span>
            {target && (
              <button
                onClick={handleMatchTargetFreq}
                className="text-[10px] text-[#00E5FF] hover:underline font-semibold"
              >
                Match Target ({target.frequency})
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 gap-1">
            {(['433MHz', '868MHz', '2.4GHz', '5.8GHz'] as FrequencyBand[]).map((band) => {
              const isEnabled = jammer.enabledBands[band];
              const isTargetBand = target && target.frequency === band;
              return (
                <button
                  key={band}
                  disabled={isOverheated || jammer.widebandBarrage}
                  onClick={() => toggleJammerBand(band, !isEnabled)}
                  className={`py-1.5 px-1 text-[10px] font-mono font-bold border transition-all btn-tactile ${
                    jammer.widebandBarrage
                      ? 'bg-[#0A0D12]/50 text-[#5D728E] border-[#243042] cursor-not-allowed'
                      : isEnabled
                      ? 'bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]'
                      : isTargetBand
                      ? 'bg-[#0A0D12] text-[#00E5FF] border-[#00E5FF]/60'
                      : 'bg-[#0A0D12] text-[#5D728E] border-[#243042] hover:text-[#E6EDF5]'
                  }`}
                >
                  {band}
                </button>
              );
            })}
          </div>
        </div>

        {/* Wideband Barrage Toggle with Hazard Border */}
        <div className="bg-[#0A0D12] p-2 border border-[#243042] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-white flex items-center gap-1.5 font-mono">
              <span>WIDEBAND BARRAGE</span>
              <span className="text-[9px] px-1 py-0.2 bg-[#FFB703]/20 text-[#FFB703] border border-[#FFB703]/50 font-bold">
                FHSS
              </span>
            </div>
            <div className="text-[9px] text-[#5D728E] font-mono">
              All frequencies simultaneously (3x core thermal gain)
            </div>
          </div>

          <button
            disabled={isOverheated}
            onClick={() => toggleWideband(!jammer.widebandBarrage)}
            className={`px-2.5 py-1 text-[10px] font-mono font-bold border transition-all btn-tactile ${
              jammer.widebandBarrage
                ? 'bg-[#FFB703]/25 text-[#FFB703] border-[#FFB703]'
                : 'bg-[#0F141C] text-[#5D728E] border-[#243042] hover:text-white'
            }`}
          >
            {jammer.widebandBarrage ? 'ACTIVE' : 'OFF'}
          </button>
        </div>

        {/* Big Jammer Fire Trigger Button */}
        <button
          disabled={isOverheated}
          onClick={() => fireJammer(!jammer.active)}
          className={`w-full py-2.5 font-mono font-bold text-[11px] tracking-wider transition-all border flex items-center justify-center gap-1.5 btn-tactile ${
            isOverheated
              ? 'bg-[#0A0D12] text-[#5D728E] border-[#243042] cursor-not-allowed opacity-60'
              : isFiring
              ? 'bg-[#00E5FF] text-[#06080B] border-[#00E5FF] shadow-lg shadow-[#00E5FF]/30'
              : 'bg-[#0A0D12] text-[#00E5FF] border-[#00E5FF]/60 hover:bg-[#00E5FF]/10'
          }`}
        >
          <Zap className={`w-3.5 h-3.5 ${isFiring ? 'text-[#06080B]' : 'text-[#00E5FF]'}`} />
          <span>
            {isOverheated
              ? `THERMAL LOCKOUT (${Math.ceil(jammer.lockoutRemaining)}s)`
              : isFiring
              ? 'CEASE TRANSMISSION [ACTIVE]'
              : 'TRANSMIT DIRECTIONAL JAMMER'}
          </span>
        </button>
      </div>
    </div>
  );
};
