import React, { useEffect } from 'react';
import { useSimulatorStore } from './store/useSimulatorStore';
import { Header } from './components/Header';
import { TacticalAdvisor } from './components/TacticalAdvisor';
import { ClassificationCard } from './components/ClassificationCard';
import { EOIRCamera } from './components/EOIRCamera';
import { RFWaterfall } from './components/RFWaterfall';
import { RadarCanvas } from './components/RadarCanvas';
import { JammerControls } from './components/JammerControls';
import { GNSSSpoofing } from './components/GNSSSpoofing';
import { KineticDefense } from './components/KineticDefense';
import { BunkerAlarm } from './components/BunkerAlarm';
import { StationVitals } from './components/StationVitals';
import { EventLog } from './components/EventLog';
import { AARModal } from './components/AARModal';

export const App: React.FC = () => {
  const { initWebSocket } = useSimulatorStore();

  useEffect(() => {
    initWebSocket();
  }, [initWebSocket]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0A0D14] text-slate-100 overflow-hidden select-none font-sans">
      {/* Top Tactical Command Header */}
      <Header />

      {/* Main Container */}
      <div className="flex-1 flex flex-col p-2.5 gap-2 min-h-0 overflow-hidden">
        {/* Tactical Advisor Bar (D-TID-A Kill Chain Copilot) */}
        <TacticalAdvisor />

        {/* 3-Column Command Deck */}
        <div className="flex-1 flex gap-2.5 min-h-0 overflow-hidden">
          {/* Left Column: Intelligence & Sensors (320px) - Smoothly Scrollable */}
          <div className="w-[320px] flex flex-col h-full flex-shrink-0 min-h-0 overflow-y-auto overflow-x-hidden pr-1.5 space-y-2.5 scrollbar-tactical">
            <ClassificationCard />
            <EOIRCamera />
            <RFWaterfall />
          </div>

          {/* Center Column: Tactical 2D Radar Canvas (Flexible Center) */}
          <div className="flex-1 flex flex-col min-w-0 h-full min-h-0 overflow-hidden">
            <RadarCanvas />
          </div>

          {/* Right Column: Countermeasure Controls (340px) - Smoothly Scrollable */}
          <div className="w-[340px] flex flex-col h-full flex-shrink-0 min-h-0 overflow-y-auto overflow-x-hidden pr-1.5 space-y-2.5 scrollbar-tactical">
            <JammerControls />
            <GNSSSpoofing />
            <KineticDefense />
            <BunkerAlarm />
            <StationVitals />
          </div>
        </div>
      </div>

      {/* Bottom HUD: Real-time Combat Event Log */}
      <EventLog />

      {/* After-Action Review (AAR) Debrief Modal */}
      <AARModal />
    </div>
  );
};
export default App;
