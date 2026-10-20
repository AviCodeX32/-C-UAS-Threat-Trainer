import React, { useEffect, useRef, useState } from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { RADAR_MAX_RANGE, RADAR_RINGS } from '@cuas/shared';
import { Compass, RotateCw, Crosshair, ChevronLeft, ChevronRight, Zap } from 'lucide-react';

export const RadarCanvas: React.FC = () => {
  const {
    drones,
    jammer,
    vitals,
    selectedDroneId,
    setJammerAngle,
    setSelectedDrone,
    autoAimAtTarget
  } = useSimulatorStore();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const sweepAngleRef = useRef(0);

  // Keyboard controls for A/D or Arrow keys to steer Jammer Cone
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        setJammerAngle((jammer.azimuth - 5 + 360) % 360);
      } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        setJammerAngle((jammer.azimuth + 5) % 360);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jammer.azimuth, setJammerAngle]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    handlePointerMove(e);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - canvas.width / 2;
    const y = e.clientY - rect.top - canvas.height / 2;

    const angleRad = Math.atan2(x, -y);
    const azimuthDeg = (angleRad * 180 / Math.PI + 360) % 360;

    if (isDragging) {
      setJammerAngle(azimuthDeg);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const maxRadius = Math.min(cx, cy) - 30;
    const scale = maxRadius / RADAR_MAX_RANGE;

    let clickedDroneId: string | null = null;
    let closestDist = 25; // 25px tolerance

    for (const d of drones) {
      const droneCanvasX = cx + d.x * scale;
      const droneCanvasY = cy - d.y * scale;
      const dist = Math.hypot(clickX - droneCanvasX, clickY - droneCanvasY);
      if (dist < closestDist) {
        closestDist = dist;
        clickedDroneId = d.id;
      }
    }

    if (clickedDroneId) {
      setSelectedDrone(clickedDroneId);
    } else {
      // If clicked empty space, re-align jammer cone to click angle!
      const clickAngleRad = Math.atan2(clickX - cx, -(clickY - cy));
      const clickAzimuth = (clickAngleRad * 180 / Math.PI + 360) % 360;
      setJammerAngle(clickAzimuth);
    }
  };

  // 60 FPS Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const maxRadius = Math.min(cx, cy) - 32;
      const scale = maxRadius / RADAR_MAX_RANGE;

      // 1. Deep radar background
      ctx.fillStyle = '#080C14';
      ctx.fillRect(0, 0, w, h);

      // 2. Polar Grid Rings (500m, 1000m, 2000m)
      ctx.lineWidth = 1;
      for (const ringDist of RADAR_RINGS) {
        const ringR = ringDist * scale;
        ctx.strokeStyle = ringDist === 1000 ? '#10B98125' : '#1E293B';
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.stroke();

        // Distance label with background pill
        ctx.fillStyle = '#64748B';
        ctx.font = '10px "Inter", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${ringDist.toLocaleString()}m`, cx + 8, cy - ringR + 12);
      }

      // Outer radar boundary
      ctx.strokeStyle = '#065F46';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, maxRadius, 0, Math.PI * 2);
      ctx.stroke();

      // 3. Compass Crosshairs
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy - maxRadius);
      ctx.lineTo(cx, cy + maxRadius);
      ctx.moveTo(cx - maxRadius, cy);
      ctx.lineTo(cx + maxRadius, cy);
      ctx.stroke();

      // Cardinal direction letters
      ctx.font = 'bold 11px "Inter", sans-serif';
      ctx.fillStyle = '#10B981';
      ctx.textAlign = 'center';
      ctx.fillText('N 000°', cx, cy - maxRadius - 12);
      ctx.fillText('S 180°', cx, cy + maxRadius + 20);
      ctx.fillText('E 090°', cx + maxRadius + 24, cy + 4);
      ctx.fillText('W 270°', cx - maxRadius - 24, cy + 4);

      // Degree ticks every 30 degrees
      for (let deg = 0; deg < 360; deg += 30) {
        if (deg % 90 === 0) continue;
        const rad = (deg - 90) * Math.PI / 180;
        const x1 = cx + Math.cos(rad) * (maxRadius - 8);
        const y1 = cy + Math.sin(rad) * (maxRadius - 8);
        const x2 = cx + Math.cos(rad) * maxRadius;
        const y2 = cy + Math.sin(rad) * maxRadius;
        ctx.strokeStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // 4. Southern Friendly Trench Sector (150° to 210°, range 350m)
      const trench = vitals.friendlyTrenchSector;
      const startAngleRad = (trench.minAzimuth - 90) * Math.PI / 180;
      const endAngleRad = (trench.maxAzimuth - 90) * Math.PI / 180;
      const trenchR = trench.distance * scale * 2.2;

      ctx.save();
      ctx.fillStyle = 'rgba(225, 29, 72, 0.08)';
      ctx.strokeStyle = 'rgba(225, 29, 72, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, trenchR, startAngleRad, endAngleRad);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);

      const trenchMidRad = ((trench.minAzimuth + trench.maxAzimuth) / 2 - 90) * Math.PI / 180;
      ctx.fillStyle = '#FB7185';
      ctx.font = '500 9px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FRIENDLY TRENCH', cx + Math.cos(trenchMidRad) * (trenchR * 0.72), cy + Math.sin(trenchMidRad) * (trenchR * 0.72));
      ctx.fillText('[NO-FIRE ZONE]', cx + Math.cos(trenchMidRad) * (trenchR * 0.72), cy + Math.sin(trenchMidRad) * (trenchR * 0.72) + 11);
      ctx.restore();

      // 5. Directional EW Jammer Cone (30° - 45° width)
      const halfBeamRad = (jammer.beamWidth / 2) * Math.PI / 180;
      const jammerCenterRad = (jammer.azimuth - 90) * Math.PI / 180;
      const coneStartRad = jammerCenterRad - halfBeamRad;
      const coneEndRad = jammerCenterRad + halfBeamRad;
      const jammerRadius = (jammer.maxRange / RADAR_MAX_RANGE) * maxRadius;

      ctx.save();
      const coneGrad = ctx.createRadialGradient(cx, cy, 15, cx, cy, jammerRadius);
      if (jammer.active && !jammer.overheated) {
        if (jammer.widebandBarrage) {
          coneGrad.addColorStop(0, 'rgba(245, 158, 11, 0.5)');
          coneGrad.addColorStop(1, 'rgba(245, 158, 11, 0.08)');
          ctx.strokeStyle = '#F59E0B';
        } else {
          coneGrad.addColorStop(0, 'rgba(6, 182, 212, 0.5)');
          coneGrad.addColorStop(1, 'rgba(6, 182, 212, 0.08)');
          ctx.strokeStyle = '#06B6D4';
        }
      } else {
        coneGrad.addColorStop(0, 'rgba(6, 182, 212, 0.15)');
        coneGrad.addColorStop(1, 'rgba(6, 182, 212, 0.02)');
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      }

      ctx.fillStyle = coneGrad;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, jammerRadius, coneStartRad, coneEndRad);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.stroke();

      // Jammer center pointer line
      ctx.strokeStyle = jammer.active ? '#06B6D4' : 'rgba(6, 182, 212, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(jammerCenterRad) * jammerRadius, cy + Math.sin(jammerCenterRad) * jammerRadius);
      ctx.stroke();

      // Azimuth text pill
      const labelX = cx + Math.cos(jammerCenterRad) * (jammerRadius + 18);
      const labelY = cy + Math.sin(jammerCenterRad) * (jammerRadius + 18);
      ctx.fillStyle = '#06B6D4';
      ctx.font = 'bold 10px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`BEAM ${Math.round(jammer.azimuth)}°`, labelX, labelY);
      ctx.restore();

      // 6. Phosphor Radar Sweep Line
      sweepAngleRef.current = (sweepAngleRef.current + 0.025) % (Math.PI * 2);
      const sweepRad = sweepAngleRef.current;

      ctx.save();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweepRad) * maxRadius, cy + Math.sin(sweepRad) * maxRadius);
      ctx.stroke();
      ctx.restore();

      // 7. Outpost Center Bunker (0, 0)
      ctx.save();
      ctx.fillStyle = vitals.baseHealth < 50 ? '#EF4444' : '#10B981';
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = vitals.takeCoverActive ? '#EF4444' : '#10B981';
      ctx.lineWidth = vitals.takeCoverActive ? 3.5 : 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 16, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#CBD5E1';
      ctx.font = 'bold 9px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('OUTPOST [0,0]', cx, cy + 28);
      ctx.restore();

      // 8. Render Drone Blips and Velocity Leader Lines
      for (const drone of drones) {
        const droneCanvasX = cx + drone.x * scale;
        const droneCanvasY = cy - drone.y * scale;

        const isSelected = drone.id === selectedDroneId;
        const isFlying = drone.status === 'flying';

        // Check if currently inside jammer cone
        const inCone = Math.abs(((drone.azimuth - jammer.azimuth + 180) % 360 + 360) % 360 - 180) <= jammer.beamWidth / 2;

        ctx.save();

        if (isFlying) {
          // Velocity Leader Line
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(droneCanvasX, droneCanvasY);
          ctx.lineTo(droneCanvasX + drone.vx * scale * 2.5, droneCanvasY - drone.vy * scale * 2.5);
          ctx.stroke();

          // Selection highlight circle
          if (isSelected) {
            ctx.strokeStyle = '#10B981';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(droneCanvasX, droneCanvasY, 16, 0, Math.PI * 2);
            ctx.stroke();
          }

          // In-Cone Jamming beam indicator sparks
          if (inCone && jammer.active && !jammer.overheated) {
            ctx.strokeStyle = '#06B6D4';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(droneCanvasX, droneCanvasY, 20 + Math.random() * 4, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Threat Icon
          if (drone.designatedType === null) {
            // Unidentified Blip: '?' mark with white circle
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(droneCanvasX, droneCanvasY, 7, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#080C14';
            ctx.font = 'bold 10px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('?', droneCanvasX, droneCanvasY + 3.5);
          } else if (drone.designatedType === 'commercial_quad') {
            // Amber Diamond
            ctx.fillStyle = '#F59E0B';
            ctx.beginPath();
            ctx.moveTo(droneCanvasX, droneCanvasY - 8);
            ctx.lineTo(droneCanvasX + 8, droneCanvasY);
            ctx.lineTo(droneCanvasX, droneCanvasY + 8);
            ctx.lineTo(droneCanvasX - 8, droneCanvasY);
            ctx.closePath();
            ctx.fill();
          } else if (drone.designatedType === 'fpv_kamikaze') {
            // Red Chevron
            ctx.fillStyle = '#EF4444';
            const headingRad = Math.atan2(drone.vx, drone.vy);
            ctx.translate(droneCanvasX, droneCanvasY);
            ctx.rotate(headingRad);
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.lineTo(7, 7);
            ctx.lineTo(0, 3);
            ctx.lineTo(-7, 7);
            ctx.closePath();
            ctx.fill();
            ctx.rotate(-headingRad);
            ctx.translate(-droneCanvasX, -droneCanvasY);
          } else {
            // Swarm Node Triangles
            ctx.fillStyle = drone.isLeader ? '#F59E0B' : '#06B6D4';
            ctx.beginPath();
            ctx.moveTo(droneCanvasX, droneCanvasY - 7);
            ctx.lineTo(droneCanvasX + 7, droneCanvasY + 6);
            ctx.lineTo(droneCanvasX - 7, droneCanvasY + 6);
            ctx.closePath();
            ctx.fill();
          }

          // Label
          ctx.fillStyle = '#E2E8F0';
          ctx.font = 'bold 9px "Inter", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(drone.callsign, droneCanvasX, droneCanvasY - 12);
          ctx.fillStyle = '#94A3B8';
          ctx.font = '8px "Inter", sans-serif';
          ctx.fillText(`${Math.round(drone.distance)}m`, droneCanvasX, droneCanvasY + 18);
        } else {
          // Neutralized blip
          ctx.strokeStyle = '#64748B';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(droneCanvasX - 4, droneCanvasY - 4);
          ctx.lineTo(droneCanvasX + 4, droneCanvasY + 4);
          ctx.moveTo(droneCanvasX + 4, droneCanvasY - 4);
          ctx.lineTo(droneCanvasX - 4, droneCanvasY + 4);
          ctx.stroke();

          ctx.fillStyle = '#64748B';
          ctx.font = '8px "Inter", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(drone.status === 'jammed_lost_link' ? 'JAMMED' : (drone.status === 'spoofed_diverting' ? 'SPOOFED' : 'DOWN'), droneCanvasX, droneCanvasY + 12);
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [drones, jammer, vitals, selectedDroneId]);

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl flex flex-col relative overflow-hidden shadow-lg"
    >
      {/* Top Controls Strip */}
      <div className="px-4 py-2.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between z-10 flex-shrink-0 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <Compass className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-white tracking-wider">TACTICAL POLAR RADAR</span>
          <span className="text-[11px] text-slate-400 font-medium">• 2.5 KM DEFENSE AIRSPACE</span>
        </div>

        {/* Interactive Steering Controls */}
        <div className="flex items-center space-x-2 text-xs">
          <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 p-0.5">
            <button
              onClick={() => setJammerAngle((jammer.azimuth - 5 + 360) % 360)}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
              title="Rotate Jammer Left (Key: A)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono font-bold text-cyan-400 text-xs">
              {Math.round(jammer.azimuth)}°
            </span>
            <button
              onClick={() => setJammerAngle((jammer.azimuth + 5) % 360)}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
              title="Rotate Jammer Right (Key: D)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={autoAimAtTarget}
            className="flex items-center space-x-1 px-3 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded-lg text-xs font-semibold transition-colors"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>AUTO-AIM CONE</span>
          </button>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="flex-1 relative flex items-center justify-center p-2 min-h-0 bg-[#070A10]">
        <canvas
          ref={canvasRef}
          width={680}
          height={680}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={handleClick}
          className="max-h-full max-w-full aspect-square cursor-crosshair block rounded-lg border border-slate-800/80 shadow-2xl"
        />
      </div>

      {/* Docked Radar HUD Footer Bar */}
      <div className="px-3.5 py-1.5 bg-slate-950/95 border-t border-slate-800 flex items-center justify-between text-xs z-10 flex-shrink-0">
        <div className="flex items-center space-x-3 text-[11px]">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-sans">THREAT SYMBOLS:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-200 flex items-center justify-center text-[7px] text-slate-950 font-bold">?</span>
            <span className="text-slate-300">Unidentified</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-amber-400 transform rotate-45 inline-block" />
            <span className="text-slate-300">Commercial Quad</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-rose-500 inline-block clip-triangle" />
            <span className="text-slate-300">Kamikaze FPV</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-cyan-400 inline-block" />
            <span className="text-slate-300">Swarm Node</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-[10px] font-mono text-slate-400">
          <span>AIRSPACE: 2500m</span>
          <span>•</span>
          <span>DOPPLER: 20Hz</span>
        </div>
      </div>
    </div>
  );
};
