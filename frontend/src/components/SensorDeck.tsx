import React, { useState } from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { ThreatType } from '@cuas/shared';
import { EOIRCamera } from './EOIRCamera';
import { RFWaterfall } from './RFWaterfall';
import { 
  Shield, 
  Crosshair, 
  CheckCircle2, 
  HelpCircle, 
  Eye, 
  Activity,
  Radio
} from 'lucide-react';

export const SensorDeck: React.FC = () => {
  const { drones, selectedDroneId, setSelectedDrone, designateTarget } = useSimulatorStore();
  const [activeSensorView, setActiveSensorView] = useState<'flir' | 'rf'>('flir');

  const activeDrones = drones.filter(d => d.status === 'flying');
  const selected = drones.find(d => d.id === selectedDroneId) || activeDrones[0] || null;

  const isDesignated = selected && selected.designatedType !== null;
  const isCorrect = isDesignated && selected?.designatedType === selected?.type;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col h-full overflow-hidden shadow-lg select-none">
      {/* Target Intelligence Card (Upper Section) */}
      <div className="p-3 bg-slate-950/90 border-b border-slate-800 flex-shrink-0 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white tracking-wider uppercase font-sans">
              TARGET INTELLIGENCE
            </span>
          </div>

          {activeDrones.length > 1 && (
            <select
              value={selected?.id || ''}
              onChange={(e) => setSelectedDrone(e.target.value)}
              className="bg-slate-900 text-xs text-slate-300 px-2 py-0.5 rounded-md border border-slate-700 font-medium cursor-pointer"
            >
              {activeDrones.map(d => (
                <option key={d.id} value={d.id}>
                  {d.callsign} ({Math.round(d.distance)}m)
                </option>
              ))}
            </select>
          )}
        </div>

        {selected ? (
          <div className="space-y-2">
            {/* Target Identity Strip */}
            <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{selected.callsign}</span>
                  {selected.isLeader && (
                    <span className="px-1.5 py-0.2 bg-red-950 text-red-400 border border-red-800 rounded text-[10px] font-bold">
                      LEADER
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Range: <span className="text-slate-200 font-mono font-bold">{Math.round(selected.distance)}m</span> • Azimuth: <span className="text-slate-200 font-mono font-bold">{Math.round(selected.azimuth)}°</span>
                </div>
              </div>

              <div>
                {isDesignated ? (
                  <div className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 ${
                    isCorrect ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' : 'bg-red-950/80 text-red-400 border border-red-800'
                  }`}>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{selected.designatedType?.replace('_', ' ').toUpperCase()}</span>
                  </div>
                ) : (
                  <div className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 text-[11px] font-semibold flex items-center gap-1">
                    <HelpCircle className="w-3 h-3 text-amber-400" />
                    <span>UNCLASSIFIED</span>
                  </div>
                )}
              </div>
            </div>

            {/* Telemetry Metrics Grid */}
            <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
              <div className="bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block font-sans">SPEED</span>
                <span className="text-white font-bold">{Math.round(selected.speed)} m/s</span>
                <span className="text-slate-500 text-[10px] block">({Math.round(selected.speed * 3.6)} km/h)</span>
              </div>

              <div className="bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block font-sans">ALTITUDE</span>
                <span className="text-white font-bold">{Math.round(selected.z)} m</span>
                <span className="text-slate-500 text-[10px] block">El: {Math.round(selected.elevation)}°</span>
              </div>

              <div className="bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block font-sans">RF CARRIER</span>
                <span className="text-cyan-400 font-bold">{selected.frequency}</span>
                <span className="text-slate-500 text-[10px] block">{selected.isFhss ? '⚡ FHSS Active' : 'Fixed'}</span>
              </div>

              <div className="bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] block font-sans">NAVIGATION</span>
                <span className={`font-bold ${selected.hasGps ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {selected.hasGps ? 'GPS Link' : 'Analog Manual'}
                </span>
                <span className="text-slate-500 text-[10px] block">{selected.hasGps ? 'Spoofable' : 'Spoof Immune'}</span>
              </div>
            </div>

            {/* D-TID-A Manual Classification Action Buttons */}
            <div className="pt-0.5 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1 font-sans">
                <Crosshair className="w-3 h-3 text-cyan-400" />
                <span>Classify Threat:</span>
              </span>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => designateTarget(selected.id, 'commercial_quad')}
                  className={`py-1.5 px-1 rounded-lg text-[11px] font-bold border transition-all btn-tactile ${
                    selected.designatedType === 'commercial_quad'
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-900 text-amber-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  Quad
                </button>

                <button
                  onClick={() => designateTarget(selected.id, 'fpv_kamikaze')}
                  className={`py-1.5 px-1 rounded-lg text-[11px] font-bold border transition-all btn-tactile ${
                    selected.designatedType === 'fpv_kamikaze'
                      ? 'bg-red-500 text-white border-red-400'
                      : 'bg-slate-900 text-red-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  Kamikaze
                </button>

                <button
                  onClick={() => designateTarget(selected.id, 'swarm_node')}
                  className={`py-1.5 px-1 rounded-lg text-[11px] font-bold border transition-all btn-tactile ${
                    selected.designatedType === 'swarm_node'
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                      : 'bg-slate-900 text-cyan-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  Swarm
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-slate-500 text-xs">
            <Radio className="w-6 h-6 text-slate-700 mx-auto mb-1 animate-pulse" />
            <p>Scanning forward airspace perimeter.</p>
          </div>
        )}
      </div>

      {/* Sensor Feeds Deck (Lower Section with Toggle) */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Sensor Feed Switcher Tabs */}
        <div className="p-2 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-1.5 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs font-semibold w-full">
            <button
              onClick={() => setActiveSensorView('flir')}
              className={`flex-1 py-1 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                activeSensorView === 'flir'
                  ? 'bg-slate-800 text-emerald-300 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>EO-IR Sight</span>
            </button>

            <button
              onClick={() => setActiveSensorView('rf')}
              className={`flex-1 py-1 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                activeSensorView === 'rf'
                  ? 'bg-slate-800 text-cyan-300 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>RF Waterfall</span>
            </button>
          </div>
        </div>

        {/* Active Sensor Feed Component */}
        <div className="flex-1 overflow-y-auto p-2 min-h-0">
          {activeSensorView === 'flir' ? <EOIRCamera /> : <RFWaterfall />}
        </div>
      </div>
    </div>
  );
};
