import React from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { SCENARIO_PRESETS } from '@cuas/shared';
import { 
  Shield, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Wifi, 
  WifiOff, 
  Clock, 
  Radio,
  Layers,
  Crosshair
} from 'lucide-react';

export const Header: React.FC = () => {
  const { 
    wsConnected, 
    scenario, 
    simTime, 
    drones, 
    audioMuted, 
    vitals, 
    selectScenario, 
    restartScenario, 
    toggleMute 
  } = useSimulatorStore();

  const minutes = Math.floor(simTime / 60);
  const seconds = Math.floor(simTime % 60);
  const formattedTime = `T+${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const activeThreats = drones.filter(d => d.status === 'flying').length;

  return (
    <header className="h-13 bg-[#0A0D12] border-b border-[#243042] flex items-center justify-between px-3 select-none flex-shrink-0 z-20">
      {/* Left: Brand & Command Node */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-[#0F141C] border border-[#243042] flex items-center justify-center relative">
            <span className="corner-bracket-tl" />
            <span className="corner-bracket-br" />
            <Crosshair className="w-4 h-4 text-[#00E5FF] animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-bold tracking-widest text-[#E6EDF5] flex items-center gap-2 font-display uppercase">
              <span>AEGIS C-UAS COMMAND</span>
              <span className="text-[9px] px-1.5 py-0.2 bg-[#0F141C] text-[#00E5FF] border border-[#243042] font-mono">
                MIL-SPEC C2
              </span>
            </div>
            <div className="text-[10px] text-[#5D728E] font-mono flex items-center gap-1.5">
              <span>AIR DEFENSE SECTOR ECHO</span>
              <span>•</span>
              <span className="text-[#00FF88]">GRID ACTIVE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Center: Mission Scenario Selector & Tactical Telemetry */}
      <div className="flex items-center space-x-2.5">
        {/* Scenario Switcher */}
        <div className="flex items-center space-x-1.5 bg-[#0F141C] px-2.5 py-1 border border-[#243042]">
          <Layers className="w-3.5 h-3.5 text-[#5D728E]" />
          <span className="text-[10px] text-[#5D728E] font-mono uppercase">DRIVE:</span>
          <select
            value={scenario.id}
            onChange={(e) => selectScenario(e.target.value)}
            className="bg-[#06080B] text-xs text-[#E6EDF5] px-2 py-0.5 border border-[#243042] focus:outline-none focus:border-[#00E5FF] font-mono font-medium cursor-pointer"
          >
            {SCENARIO_PRESETS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.codename} — {s.name} ({s.difficulty})
              </option>
            ))}
          </select>
        </div>

        {/* Mission Clock */}
        <div className="flex items-center space-x-1.5 bg-[#0F141C] px-2.5 py-1 border border-[#243042]">
          <Clock className="w-3.5 h-3.5 text-[#00E5FF]" />
          <span className="text-xs font-bold text-[#E6EDF5] font-mono tracking-wider">{formattedTime}</span>
        </div>

        {/* Threat Indicator */}
        <div className="px-2.5 py-1 text-xs font-mono bg-[#0F141C] border border-[#243042] text-[#E6EDF5] flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${activeThreats > 0 ? 'bg-[#FF1E56] animate-ping' : 'bg-[#00FF88]'}`} />
          <span className="text-[11px] font-bold">
            {activeThreats > 0 ? `${activeThreats} HOSTILE TRACKS` : 'AIRSPACE CLEAR'}
          </span>
        </div>

        {/* Base Health Pill */}
        <div className="flex items-center space-x-1.5 bg-[#0F141C] px-2.5 py-1 border border-[#243042] text-xs font-mono">
          <Shield className="w-3.5 h-3.5 text-[#5D728E]" />
          <span className="text-[#E6EDF5] text-[11px]">
            OUTPOST: <span className={vitals.baseHealth < 50 ? 'text-[#FF1E56] font-bold' : 'text-[#00FF88] font-bold'}>{Math.round(vitals.baseHealth)}%</span>
          </span>
        </div>
      </div>

      {/* Right: Controls & Network Status */}
      <div className="flex items-center space-x-2">
        {/* Reset Button */}
        <button
          onClick={restartScenario}
          className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#0F141C] hover:bg-[#161D27] border border-[#243042] hover:border-[#00E5FF] text-[11px] font-mono font-medium text-[#E6EDF5] transition-colors btn-tactile"
          title="Restart Current Scenario"
        >
          <RotateCcw className="w-3 h-3 text-[#FFB703]" />
          <span>RESET</span>
        </button>

        {/* Audio Mute Toggle */}
        <button
          onClick={toggleMute}
          className={`p-1.5 border transition-colors btn-tactile ${
            audioMuted 
              ? 'bg-[#0F141C] text-[#5D728E] border-[#243042]' 
              : 'bg-[#0F141C] text-[#00E5FF] border-[#243042] hover:border-[#00E5FF]'
          }`}
          title={audioMuted ? 'Unmute Audio Synthesizer' : 'Mute Audio Synthesizer'}
        >
          {audioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>

        {/* Connection Status */}
        <div className="flex items-center space-x-1.5 text-xs font-mono px-2 py-1 bg-[#0F141C] border border-[#243042]">
          {wsConnected ? (
            <>
              <Wifi className="w-3 h-3 text-[#00FF88]" />
              <span className="text-[#00FF88] text-[10px] font-semibold">20Hz SYNC</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-[#FF1E56] animate-pulse" />
              <span className="text-[#FF1E56] text-[10px] font-semibold">OFFLINE</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
