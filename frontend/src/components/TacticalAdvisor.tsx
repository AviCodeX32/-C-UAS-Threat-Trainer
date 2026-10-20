import React from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { Crosshair, Zap, ShieldAlert } from 'lucide-react';

export const TacticalAdvisor: React.FC = () => {
  const { 
    drones, 
    selectedDroneId, 
    jammer, 
    autoAimAtTarget, 
    fireJammer, 
    takeCover 
  } = useSimulatorStore();

  const activeDrones = drones.filter(d => d.status === 'flying');
  const target = drones.find(d => d.id === selectedDroneId && d.status === 'flying') || activeDrones[0] || null;

  let directiveStep = 'STANDBY';
  let directiveText = 'Perimeter surveillance active. Scanning for hostile UAS telemetry.';
  let dotColor = 'bg-[#5D728E]';
  let showAutoAim = false;
  let showJamQuickAction = false;
  let showTakeCoverAction = false;

  if (activeDrones.length > 0 && target) {
    const isInsideCone = Math.abs(((target.azimuth - jammer.azimuth + 180) % 360 + 360) % 360 - 180) <= jammer.beamWidth / 2;
    const isTargetDesignated = target.designatedType !== null;

    if (target.type === 'fpv_kamikaze' && target.distance < 150) {
      directiveStep = 'CRITICAL DRILL';
      directiveText = `Terminal dive breach at ${Math.round(target.distance)}m! Pure analog link (NO GPS). Fire kinetic burst or SOUND TAKE COVER immediately!`;
      dotColor = 'bg-[#FF1E56] animate-ping';
      showTakeCoverAction = true;
    } else if (!isTargetDesignated) {
      directiveStep = 'STEP 1: IDENTIFY';
      directiveText = `Radar track ${target.callsign} detected at ${Math.round(target.distance)}m (Bearing ${Math.round(target.azimuth)}°). Click the target card to classify.`;
      dotColor = 'bg-[#FFB703]';
      showAutoAim = true;
    } else if (target.isFhss && !jammer.widebandBarrage) {
      directiveStep = 'STEP 2: COUNTERMEASURE';
      directiveText = `${target.callsign} uses Frequency-Hopping (FHSS). Spot jamming will fail. Enable Wideband Barrage on the defense console.`;
      dotColor = 'bg-[#FFB703]';
      showAutoAim = true;
    } else if (!isInsideCone) {
      directiveStep = 'STEP 2: ALIGN BEAM';
      directiveText = `Target bearing is ${Math.round(target.azimuth)}° (Jammer at ${Math.round(jammer.azimuth)}°). Orient the EW cone or click Auto-Aim.`;
      dotColor = 'bg-[#00E5FF]';
      showAutoAim = true;
    } else if (!jammer.active) {
      directiveStep = 'STEP 3: TRANSMIT';
      directiveText = `Beam aligned on ${target.callsign} (${target.frequency}). Engage Jammer trigger to sever command link.`;
      dotColor = 'bg-[#00FF88]';
      showJamQuickAction = true;
    } else {
      directiveStep = 'SUPPRESSING';
      directiveText = `Broadcasting jamming radiation into ${target.callsign}. Monitor thermal core gauge.`;
      dotColor = 'bg-[#00E5FF] animate-pulse';
    }
  } else if (drones.length > 0 && activeDrones.length === 0) {
    directiveStep = 'SECURED';
    directiveText = 'All perimeter threats neutralized. Awaiting flight controller mission debrief assessment.';
    dotColor = 'bg-[#00FF88]';
  }

  return (
    <div className="bg-[#0A0D12] border border-[#243042] px-3.5 py-1.5 flex items-center justify-between gap-3 flex-shrink-0 relative">
      <span className="corner-bracket-tl" />
      <span className="corner-bracket-tr" />
      <span className="corner-bracket-bl" />
      <span className="corner-bracket-br" />

      {/* Directive text */}
      <div className="flex items-center space-x-2.5 min-w-0">
        <div className="flex items-center space-x-2 flex-shrink-0">
          <span className={`w-2 h-2 rounded-full ${dotColor}`} />
          <span className="text-[11px] font-bold text-[#00E5FF] font-display uppercase tracking-widest">
            {directiveStep}:
          </span>
        </div>

        <p className="text-xs text-[#E6EDF5] font-mono truncate">
          {directiveText}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center space-x-2 flex-shrink-0">
        {showAutoAim && (
          <button
            onClick={autoAimAtTarget}
            className="flex items-center space-x-1.5 px-2.5 py-0.5 bg-[#0F141C] hover:bg-[#161D27] text-[#00E5FF] border border-[#243042] hover:border-[#00E5FF] text-[11px] font-mono font-semibold transition-all btn-tactile"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>AUTO-AIM CONE</span>
          </button>
        )}

        {showJamQuickAction && (
          <button
            onClick={() => fireJammer(true)}
            className="flex items-center space-x-1.5 px-2.5 py-0.5 bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF] text-[11px] font-mono font-bold transition-all btn-tactile animate-pulse"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>TRANSMIT JAMMER</span>
          </button>
        )}

        {showTakeCoverAction && (
          <button
            onClick={takeCover}
            className="flex items-center space-x-1.5 px-3 py-0.5 bg-[#FF1E56] text-white font-mono font-bold text-[11px] border border-[#FF1E56] transition-all btn-tactile animate-pulse"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>TAKE COVER!</span>
          </button>
        )}
      </div>
    </div>
  );
};
