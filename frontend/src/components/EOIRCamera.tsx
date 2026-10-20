import React, { useState, useEffect, useRef } from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { Eye, Crosshair } from 'lucide-react';

export const EOIRCamera: React.FC = () => {
  const { drones, selectedDroneId, flirZoom, setFlirZoom } = useSimulatorStore();
  const [thermalMode, setThermalMode] = useState<'flir_white_hot' | 'flir_black_hot' | 'optical'>('flir_white_hot');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const selectedDrone = drones.find(d => d.id === selectedDroneId) || drones.find(d => d.status === 'flying') || null;

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

      // 1. Sky & terrain background gradient
      if (thermalMode === 'flir_white_hot') {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#0F172A');
        grad.addColorStop(0.68, '#1E293B');
        grad.addColorStop(1, '#334155');
        ctx.fillStyle = grad;
      } else if (thermalMode === 'flir_black_hot') {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#CBD5E1');
        grad.addColorStop(0.68, '#94A3B8');
        grad.addColorStop(1, '#475569');
        ctx.fillStyle = grad;
      } else {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#070C16');
        grad.addColorStop(0.68, '#0B132B');
        grad.addColorStop(1, '#1C2541');
        ctx.fillStyle = grad;
      }
      ctx.fillRect(0, 0, w, h);

      // 2. Horizon reference line
      ctx.strokeStyle = thermalMode === 'flir_black_hot' ? '#475569' : 'rgba(100, 116, 139, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.70);
      ctx.lineTo(w, h * 0.70);
      ctx.stroke();

      // 3. Drone silhouette & thermal signature
      if (selectedDrone && selectedDrone.status === 'flying') {
        const rawSize = Math.max(10, Math.min(80, (2500 / Math.max(40, selectedDrone.distance)) * flirZoom * 3.4));
        
        const jitterX = (Math.random() - 0.5) * 1.0;
        const jitterY = (Math.random() - 0.5) * 1.0;
        const targetX = cx + jitterX;
        const targetY = cy + jitterY - 4;

        ctx.save();
        ctx.translate(targetX, targetY);

        const droneHotColor = thermalMode === 'flir_white_hot' 
          ? '#FFFFFF' 
          : (thermalMode === 'flir_black_hot' ? '#0F172A' : '#38BDF8');
        const heatGlow = thermalMode === 'flir_white_hot' 
          ? '#FDE047' 
          : (thermalMode === 'flir_black_hot' ? '#DC2626' : '#F59E0B');

        ctx.fillStyle = droneHotColor;

        if (selectedDrone.type === 'commercial_quad') {
          // Quadcopter body
          ctx.fillRect(-rawSize * 0.4, -rawSize * 0.15, rawSize * 0.8, rawSize * 0.3);
          // Arms
          ctx.strokeStyle = droneHotColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-rawSize * 0.6, -rawSize * 0.35);
          ctx.lineTo(rawSize * 0.6, rawSize * 0.35);
          ctx.moveTo(-rawSize * 0.6, rawSize * 0.35);
          ctx.lineTo(rawSize * 0.6, -rawSize * 0.35);
          ctx.stroke();

          // Heat-emitting rotors/motors
          ctx.fillStyle = heatGlow;
          ctx.beginPath();
          ctx.arc(-rawSize * 0.6, -rawSize * 0.35, rawSize * 0.16, 0, Math.PI * 2);
          ctx.arc(rawSize * 0.6, -rawSize * 0.35, rawSize * 0.16, 0, Math.PI * 2);
          ctx.arc(-rawSize * 0.6, rawSize * 0.35, rawSize * 0.16, 0, Math.PI * 2);
          ctx.arc(rawSize * 0.6, rawSize * 0.35, rawSize * 0.16, 0, Math.PI * 2);
          ctx.fill();
        } else if (selectedDrone.type === 'fpv_kamikaze') {
          // Fixed-wing / Chevron kamikaze dart
          ctx.beginPath();
          ctx.moveTo(rawSize * 0.7, 0);
          ctx.lineTo(-rawSize * 0.5, -rawSize * 0.42);
          ctx.lineTo(-rawSize * 0.2, 0);
          ctx.lineTo(-rawSize * 0.5, rawSize * 0.42);
          ctx.closePath();
          ctx.fill();

          // High thermal emission on rear battery / ESC
          ctx.fillStyle = heatGlow;
          ctx.beginPath();
          ctx.arc(-rawSize * 0.15, 0, rawSize * 0.22, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Swarm autonomous node
          ctx.beginPath();
          ctx.arc(0, 0, rawSize * 0.45, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = heatGlow;
          ctx.beginPath();
          ctx.arc(0, 0, rawSize * 0.25, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        // Target Tracking Reticle
        const reticleColor = thermalMode === 'flir_black_hot' ? '#0F172A' : '#10B981';
        ctx.strokeStyle = reticleColor;
        ctx.lineWidth = 1.5;
        const boxSize = Math.max(24, rawSize * 1.4);
        
        // Corner brackets
        const b = boxSize / 2;
        const arm = 6;
        ctx.beginPath();
        // Top Left
        ctx.moveTo(cx - b, cy - b + arm);
        ctx.lineTo(cx - b, cy - b);
        ctx.lineTo(cx - b + arm, cy - b);
        // Top Right
        ctx.moveTo(cx + b - arm, cy - b);
        ctx.lineTo(cx + b, cy - b);
        ctx.lineTo(cx + b, cy - b + arm);
        // Bottom Left
        ctx.moveTo(cx - b, cy + b - arm);
        ctx.lineTo(cx - b, cy + b);
        ctx.lineTo(cx - b + arm, cy + b);
        // Bottom Right
        ctx.moveTo(cx + b - arm, cy + b);
        ctx.lineTo(cx + b, cy + b);
        ctx.lineTo(cx + b, cy + b - arm);
        ctx.stroke();

        // Target tracking readout
        ctx.fillStyle = reticleColor;
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`TRK: ${selectedDrone.callsign}`, cx - b, cy - b - 4);
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.round(selectedDrone.distance)}m`, cx + b, cy + b + 12);
      } else {
        // No target in sight
        ctx.fillStyle = thermalMode === 'flir_black_hot' ? '#475569' : '#64748B';
        ctx.font = '10px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SEARCHING AIRSPACE SECTOR', cx, cy - 6);
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillText('NO LOCK', cx, cy + 10);
      }

      // 4. Optical Center Crosshairs
      const hudColor = thermalMode === 'flir_black_hot' ? 'rgba(15, 23, 42, 0.4)' : 'rgba(56, 189, 248, 0.35)';
      ctx.strokeStyle = hudColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Center pip
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      // Cross lines
      ctx.moveTo(cx - 30, cy);
      ctx.lineTo(cx - 8, cy);
      ctx.moveTo(cx + 8, cy);
      ctx.lineTo(cx + 30, cy);
      ctx.moveTo(cx, cy - 25);
      ctx.lineTo(cx, cy - 8);
      ctx.moveTo(cx, cy + 8);
      ctx.lineTo(cx, cy + 25);
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [selectedDrone, thermalMode, flirZoom]);

  return (
    <div className="bg-[#0F141C] border border-[#243042] flex flex-col flex-shrink-0 relative">
      <span className="corner-bracket-tl" />
      <span className="corner-bracket-tr" />
      <span className="corner-bracket-bl" />
      <span className="corner-bracket-br" />

      {/* Header */}
      <div className="px-3 py-2 bg-[#0A0D12] border-b border-[#243042] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Eye className="w-3.5 h-3.5 text-[#00FF88]" />
          <span className="text-[11px] font-bold text-[#E6EDF5] tracking-wider uppercase font-display">
            EO-IR OPTICAL / THERMAL
          </span>
        </div>

        {/* Thermal Palette Toggle Buttons */}
        <div className="flex items-center bg-[#06080B] border border-[#243042]">
          <button
            onClick={() => setThermalMode('flir_white_hot')}
            className={`px-2 py-0.5 text-[9px] font-mono transition-colors ${
              thermalMode === 'flir_white_hot' 
                ? 'bg-[#161D27] text-[#00E5FF] font-bold' 
                : 'text-[#5D728E] hover:text-white'
            }`}
          >
            W-HOT
          </button>
          <button
            onClick={() => setThermalMode('flir_black_hot')}
            className={`px-2 py-0.5 text-[9px] font-mono transition-colors ${
              thermalMode === 'flir_black_hot' 
                ? 'bg-[#161D27] text-[#00E5FF] font-bold' 
                : 'text-[#5D728E] hover:text-white'
            }`}
          >
            B-HOT
          </button>
          <button
            onClick={() => setThermalMode('optical')}
            className={`px-2 py-0.5 text-[9px] font-mono transition-colors ${
              thermalMode === 'optical' 
                ? 'bg-[#00FF88]/20 text-[#00FF88] font-bold' 
                : 'text-[#5D728E] hover:text-white'
            }`}
          >
            OPT
          </button>
        </div>
      </div>

      {/* Feed Canvas */}
      <div className="p-2.5 bg-[#06080B]">
        <div className="relative overflow-hidden border border-[#243042] crt-scanline">
          <canvas
            ref={canvasRef}
            width={300}
            height={140}
            className="w-full h-34 block bg-[#06080B]"
          />

          {/* OSD Telemetry Overlays */}
          <div className="absolute top-1 left-1.5 text-[9px] font-mono text-[#00FF88] bg-[#06080B]/90 px-1.5 py-0.2 border border-[#243042]">
            <span>FOV: {flirZoom}X</span>
          </div>

          <div className="absolute top-1 right-1.5 text-[9px] font-mono text-[#00E5FF] bg-[#06080B]/90 px-1.5 py-0.2 border border-[#243042]">
            <span>FLIR-09 GYRO-LOCK</span>
          </div>

          {/* Zoom Buttons Row */}
          <div className="absolute bottom-1 right-1.5 flex items-center space-x-0.5">
            {[1, 2, 4, 8].map((z) => (
              <button
                key={z}
                onClick={() => setFlirZoom(z)}
                className={`px-1.5 py-0.2 text-[9px] font-mono font-bold border transition-colors btn-tactile ${
                  flirZoom === z
                    ? 'bg-[#00E5FF]/25 text-[#00E5FF] border-[#00E5FF]'
                    : 'bg-[#06080B]/90 text-[#5D728E] border-[#243042] hover:text-white'
                }`}
              >
                {z}X
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
