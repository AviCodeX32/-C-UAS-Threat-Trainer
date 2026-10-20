import React from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { SCENARIO_PRESETS } from '@cuas/shared';
import { 
  Award, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  ArrowRight, 
  ShieldCheck, 
  Target, 
  Flame, 
  FileText,
  X,
  Zap,
  ShieldAlert
} from 'lucide-react';

export const AARModal: React.FC = () => {
  const {
    showAARModal,
    aarScorecard,
    scenario,
    restartScenario,
    selectScenario,
    closeAARModal
  } = useSimulatorStore();

  if (!showAARModal || !aarScorecard) return null;

  const currentIdx = SCENARIO_PRESETS.findIndex(s => s.id === scenario.id);
  const nextScenario = SCENARIO_PRESETS[(currentIdx + 1) % SCENARIO_PRESETS.length];

  const handleNextMission = () => {
    selectScenario(nextScenario.id);
  };

  const handleReplayDrill = () => {
    restartScenario();
  };

  const getGradeTheme = (grade: string) => {
    switch (grade) {
      case 'S':
        return {
          badge: 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10 shadow-sm',
          title: 'FLAWLESS EXECUTION',
          subtitle: 'Pristine adherence to C-UAS doctrine. High precision & zero collateral damage.'
        };
      case 'A':
        return {
          badge: 'text-cyan-400 border-cyan-500/50 bg-cyan-500/10 shadow-sm',
          title: 'TACTICAL SUCCESS',
          subtitle: 'Airspace defended with strong kill-chain discipline and minor inefficiencies.'
        };
      case 'B':
        return {
          badge: 'text-amber-400 border-amber-500/50 bg-amber-500/10 shadow-sm',
          title: 'MARGINAL INTERCEPTION',
          subtitle: 'Threats neutralized, but excessive ammo or elevated emitter thermal stress incurred.'
        };
      case 'C':
        return {
          badge: 'text-amber-500 border-amber-500/50 bg-amber-500/10 shadow-sm',
          title: 'DEFENSIVE BREACH',
          subtitle: 'Forward post sustained perimeter damage. Reaction latency was delayed.'
        };
      default:
        return {
          badge: 'text-rose-400 border-rose-500/40 bg-rose-500/10 shadow-sm',
          title: 'MISSION FAILED: CASUALTIES SUSTAINED',
          subtitle: 'Direct kinetic strike on unshielded forward post. Replay drill to master survival protocols.'
        };
    }
  };

  const gradeInfo = getGradeTheme(aarScorecard.grade);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0F141C] border border-[#243042] w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden relative">
        <span className="corner-bracket-tl" />
        <span className="corner-bracket-tr" />
        <span className="corner-bracket-bl" />
        <span className="corner-bracket-br" />

        {/* Modal Header */}
        <div className="px-5 py-3 bg-[#0A0D12] border-b border-[#243042] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 bg-[#0F141C] border border-[#243042] flex items-center justify-center">
              <Award className="w-3.5 h-3.5 text-[#FFB703]" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-[#E6EDF5] tracking-widest uppercase font-display">
                AFTER-ACTION REVIEW (AAR) DEBRIEF
              </h2>
              <p className="text-[10px] text-[#5D728E] font-mono">
                Official Doctrinal Combat Assessment • Forward Post Echo
              </p>
            </div>
          </div>
          <button
            onClick={closeAARModal}
            className="p-1 hover:bg-[#161D27] text-[#5D728E] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 font-mono">
          {/* Mission & Grade Banner */}
          <div className="flex items-center justify-between bg-[#0A0D12] p-3.5 border border-[#243042]">
            <div>
              <span className="text-[9px] text-[#5D728E] uppercase tracking-widest font-bold block">
                COMPLETED MISSION
              </span>
              <h3 className="text-sm font-bold text-white mt-0.5 font-display">
                {scenario.codename}: {scenario.name}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Elapsed: <span className="text-slate-200 font-mono font-bold">{aarScorecard.metrics.elapsedTimeSeconds}s</span> • Neutralized: <span className="text-emerald-400 font-mono font-bold">{aarScorecard.metrics.neutralizedCount}/{aarScorecard.metrics.totalThreats}</span> threats
              </p>
              <div className="text-xs font-semibold text-slate-300 mt-1 flex items-center gap-1.5">
                <span>{gradeInfo.title}</span>
              </div>
            </div>

            {/* Glowing Grade Badge */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">FINAL SCORE</span>
                <span className="text-3xl font-black text-white font-mono tracking-tight">
                  {aarScorecard.overallScore}<span className="text-slate-500 text-lg">/100</span>
                </span>
              </div>
              <div className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center font-black text-3xl font-mono shadow-xl ${gradeInfo.badge}`}>
                {aarScorecard.grade}
              </div>
            </div>
          </div>

          {/* D-TID-A Doctrine Scoring Pillars */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>D-TID-A DOCTRINE BREAKDOWN</span>
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Detection Latency (25 pts) */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs font-medium">1. Detection & Identification</span>
                  <span className="font-bold font-mono text-white text-xs">
                    {aarScorecard.breakdown.detectionLatencyScore} / 25 pts
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${(aarScorecard.breakdown.detectionLatencyScore / 25) * 100}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-500">
                  Latency: {(aarScorecard.metrics.avgDetectionLatencyMs / 1000).toFixed(1)}s • {aarScorecard.metrics.correctClassifications} classified
                </div>
              </div>

              {/* Countermeasure Appropriateness (30 pts) */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs font-medium">2. Weapon Appropriateness</span>
                  <span className="font-bold font-mono text-white text-xs">
                    {aarScorecard.breakdown.countermeasureScore} / 30 pts
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 transition-all duration-300"
                    style={{ width: `${(aarScorecard.breakdown.countermeasureScore / 30) * 100}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-500">
                  {aarScorecard.metrics.effectiveJams} effective jams • {aarScorecard.metrics.wastedJams} wasted
                </div>
              </div>

              {/* Resource Management (20 pts) */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs font-medium">3. Resource & Thermals</span>
                  <span className="font-bold font-mono text-white text-xs">
                    {aarScorecard.breakdown.resourceManagementScore} / 20 pts
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-300"
                    style={{ width: `${(aarScorecard.breakdown.resourceManagementScore / 20) * 100}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-500">
                  Peak Temp: {aarScorecard.metrics.peakTemperature}% • Lockout: {aarScorecard.metrics.thermalLockoutOccurred ? 'YES' : 'NO'}
                </div>
              </div>

              {/* Base Integrity & Casualties (25 pts) */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs font-medium">4. Base Defense & Casualties</span>
                  <span className="font-bold font-mono text-white text-xs">
                    {aarScorecard.breakdown.baseIntegrityScore} / 25 pts
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 transition-all duration-300"
                    style={{ width: `${(aarScorecard.breakdown.baseIntegrityScore / 25) * 100}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-500">
                  Damage: {aarScorecard.metrics.baseDamageTaken}% • Casualties: {aarScorecard.metrics.casualties} KIA
                </div>
              </div>
            </div>
          </div>

          {/* Actionable Tactical Debrief Tips */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>TACTICAL DEBRIEF & INSTRUCTION</span>
            </h4>
            <div className="space-y-2">
              {aarScorecard.tacticalTips.map((tip, idx) => (
                <div
                  key={idx}
                  className="flex items-start space-x-2.5 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-200 leading-relaxed">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-mono">
            PERSISTED IN DRIZZLE / POSTGRES
          </div>

          <div className="flex items-center space-x-3">
            {/* Replay Drill Button */}
            <button
              onClick={handleReplayDrill}
              className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl border border-slate-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>Replay Drill</span>
            </button>

            {/* Next Mission Button */}
            <button
              onClick={handleNextMission}
              className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Next Mission: {nextScenario.name}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
