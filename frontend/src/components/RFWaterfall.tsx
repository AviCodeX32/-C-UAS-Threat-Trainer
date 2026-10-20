import React, { useEffect, useRef } from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { FREQUENCY_BANDS, FrequencyBand } from '@cuas/shared';
import { Activity } from 'lucide-react';

const BANDS_ORDER: FrequencyBand[] = ['433MHz', '868MHz', '1.2GHz', '2.4GHz', '5.8GHz'];

export const RFWaterfall: React.FC = () => {
  const { drones, jammer } = useSimulatorStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fftCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const fftCanvas = fftCanvasRef.current;
    if (!canvas || !fftCanvas) return;

    const ctx = canvas.getContext('2d');
    const fftCtx = fftCanvas.getContext('2d');
    if (!ctx || !fftCtx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const fftW = fftCanvas.width;
      const fftH = fftCanvas.height;

      // 1. Calculate energy per band
      const activeFrequencies = new Map<FrequencyBand, { strength: number; isFhss: boolean }>();
      for (const d of drones) {
        if (d.status === 'flying') {
          const current = activeFrequencies.get(d.frequency) || { strength: 0, isFhss: false };
          const dronePower = Math.max(0.2, 1 - d.distance / 2500);
          activeFrequencies.set(d.frequency, {
            strength: Math.min(1.0, current.strength + dronePower),
            isFhss: current.isFhss || d.isFhss
          });
        }
      }

      // 2. Draw FFT Power Trace
      fftCtx.fillStyle = '#080C14';
      fftCtx.fillRect(0, 0, fftW, fftH);

      // Grid lines
      fftCtx.strokeStyle = 'rgba(30, 41, 59, 0.6)';
      fftCtx.lineWidth = 1;
      fftCtx.beginPath();
      for (let y = 10; y < fftH; y += 12) {
        fftCtx.moveTo(0, y);
        fftCtx.lineTo(fftW, y);
      }
      fftCtx.stroke();

      // Spectral trace line
      fftCtx.beginPath();
      fftCtx.moveTo(0, fftH - 4);

      const bandWidthPx = fftW / BANDS_ORDER.length;
      for (let i = 0; i < BANDS_ORDER.length; i++) {
        const band = BANDS_ORDER[i];
        const data = activeFrequencies.get(band);
        const centerX = (i + 0.5) * bandWidthPx;
        const noise = (Math.random() * 2.5);

        if (data && data.strength > 0) {
          const peakHeight = data.strength * (fftH - 10);
          const jitterX = data.isFhss ? (Math.random() * 14 - 7) : 0;
          fftCtx.lineTo(centerX - 10 + jitterX, fftH - 4 - noise);
          fftCtx.lineTo(centerX + jitterX, fftH - 4 - peakHeight);
          fftCtx.lineTo(centerX + 10 + jitterX, fftH - 4 - noise);
        } else {
          fftCtx.lineTo(centerX, fftH - 4 - noise);
        }
      }
      fftCtx.lineTo(fftW, fftH - 4);
      fftCtx.strokeStyle = '#38BDF8';
      fftCtx.lineWidth = 1.5;
      fftCtx.stroke();

      // 3. Scroll Waterfall
      ctx.drawImage(canvas, 0, 0, width, height - 2, 0, 2, width, height - 2);

      const scanlineData = ctx.createImageData(width, 2);
      const pixels = scanlineData.data;

      for (let x = 0; x < width; x++) {
        const bandIndex = Math.floor((x / width) * BANDS_ORDER.length);
        const band = BANDS_ORDER[bandIndex];
        const bandData = activeFrequencies.get(band);
        const isJammerOnBand = jammer.active && (jammer.widebandBarrage || jammer.enabledBands[band]);

        let r = 8, g = 12, b = 20;
        const noiseVal = Math.random() * 16;

        if (bandData && bandData.strength > 0) {
          const bandCenter = (bandIndex + 0.5) * (width / BANDS_ORDER.length);
          const distToCenter = Math.abs(x - bandCenter);
          if (distToCenter < 14) {
            const intensity = (1 - distToCenter / 14) * bandData.strength;
            if (intensity > 0.65) {
              r = 244; g = 63; b = 94; // Tactical Rose
            } else if (intensity > 0.35) {
              r = 245; g = 158; b = 11; // Amber
            } else {
              r = 16; g = 185; b = 129; // Emerald
            }
          }
        }

        if (isJammerOnBand) {
          r = Math.min(255, r + 20);
          g = Math.min(255, g + 120);
          b = Math.min(255, b + 180);
        }

        r = Math.min(255, r + noiseVal);
        g = Math.min(255, g + noiseVal);
        b = Math.min(255, b + noiseVal);

        for (let row = 0; row < 2; row++) {
          const idx = (row * width + x) * 4;
          pixels[idx] = r;
          pixels[idx + 1] = g;
          pixels[idx + 2] = b;
          pixels[idx + 3] = 255;
        }
      }

      ctx.putImageData(scanlineData, 0, 0);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [drones, jammer]);

  return (
    <div className="bg-[#0F141C] border border-[#243042] flex flex-col flex-shrink-0 relative">
      <span className="corner-bracket-tl" />
      <span className="corner-bracket-tr" />
      <span className="corner-bracket-bl" />
      <span className="corner-bracket-br" />

      {/* Header */}
      <div className="px-3 py-2 bg-[#0A0D12] border-b border-[#243042] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Activity className="w-3.5 h-3.5 text-[#00E5FF]" />
          <span className="text-[11px] font-bold text-[#E6EDF5] tracking-wider uppercase font-display">
            SIGINT RF SPECTRUM
          </span>
        </div>
        <span className="text-[9px] text-[#5D728E] font-mono tracking-wider">
          WATERFALL FFT
        </span>
      </div>

      {/* FFT Instantaneous Spectrum */}
      <div className="p-2.5 pb-0 bg-[#06080B]">
        <div className="text-[9px] text-[#5D728E] font-mono mb-0.5 flex justify-between">
          <span>0 dBm</span>
          <span className="text-[#00E5FF]/70 uppercase">INSTANTANEOUS SPECTRUM</span>
          <span>-90 dBm</span>
        </div>
        <canvas
          ref={fftCanvasRef}
          width={300}
          height={38}
          className="w-full h-9 bg-[#06080B] border border-[#243042] block"
        />
      </div>

      {/* Waterfall Display */}
      <div className="p-2.5 pt-1 bg-[#06080B] flex flex-col">
        <div className="relative overflow-hidden border border-[#243042] crt-scanline">
          <canvas
            ref={canvasRef}
            width={300}
            height={90}
            className="w-full h-22 block bg-[#06080B]"
          />

          {/* Frequency Column Grid Overlay */}
          <div className="absolute inset-0 grid grid-cols-5 pointer-events-none">
            {BANDS_ORDER.map((band, idx) => (
              <div
                key={band}
                className={`border-r border-[#243042]/50 flex items-end justify-center pb-0.5 ${
                  idx === BANDS_ORDER.length - 1 ? 'border-r-0' : ''
                }`}
              >
                <span className="text-[8px] font-mono text-[#5D728E] bg-[#06080B]/90 px-1 border border-[#243042]">
                  {band}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
