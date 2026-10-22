import React, { useEffect, useRef } from 'react';

export interface AudioPlaybackWaveformProps {
  isPlaying: boolean;
  isLoading?: boolean;
  height?: number;
  barCount?: number;
  variant?: 'bars' | 'wave' | 'compact' | 'glow';
  color?: string; // Tailwind color class or hex
  label?: string;
  showLabel?: boolean;
  className?: string;
}

/**
 * AudioPlaybackWaveform - Studio-grade Frequency Waveform Animation
 * Provides clear, immediate visual feedback that audio is processing, buffering, or actively playing.
 */
export const AudioPlaybackWaveform: React.FC<AudioPlaybackWaveformProps> = ({
  isPlaying,
  isLoading = false,
  height = 32,
  barCount = 20,
  variant = 'bars',
  color = '#2563EB',
  label,
  showLabel = false,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const barHeightsRef = useRef<number[]>([]);
  const targetHeightsRef = useRef<number[]>([]);
  const phaseRef = useRef<number>(0);

  // Initialize bar heights
  useEffect(() => {
    const count = variant === 'compact' ? 8 : barCount;
    barHeightsRef.current = new Array(count).fill(2);
    targetHeightsRef.current = new Array(count).fill(2);
  }, [barCount, variant]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;
    const count = variant === 'compact' ? 8 : barCount;

    // Render loop
    const render = () => {
      if (!isRunning) return;

      const width = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, width, h);

      phaseRef.current += isPlaying ? 0.08 : isLoading ? 0.04 : 0.01;
      const phase = phaseRef.current;

      // Update target heights based on simulated vocal frequency bands
      if (isPlaying) {
        for (let i = 0; i < count; i++) {
          const normIdx = i / count;
          // Human vocal formant simulation (peaks in mid-range 300Hz-2500Hz)
          const formantEnvelope = Math.sin(normIdx * Math.PI);
          const wave1 = Math.sin(phase * 2.2 + i * 0.45);
          const wave2 = Math.cos(phase * 1.5 - i * 0.3);
          const wave3 = Math.sin(phase * 3.7 + i * 0.8);
          
          const energy = Math.abs((wave1 * 0.5 + wave2 * 0.35 + wave3 * 0.15) * formantEnvelope);
          // Scale between 4px and (h - 2)px
          targetHeightsRef.current[i] = Math.max(4, energy * (h - 4));
        }
      } else if (isLoading) {
        // Scanning pulse wave indicating audio generation/processing
        for (let i = 0; i < count; i++) {
          const pulse = Math.sin(phase * 3 - i * 0.4);
          const energy = Math.max(0, pulse);
          targetHeightsRef.current[i] = Math.max(3, energy * (h * 0.7));
        }
      } else {
        // Resting baseline
        for (let i = 0; i < count; i++) {
          targetHeightsRef.current[i] = 3;
        }
      }

      // Smooth interpolation (lerp) for organic vocal fluid movement
      const lerpSpeed = isPlaying ? 0.22 : 0.12;
      for (let i = 0; i < count; i++) {
        const cur = barHeightsRef.current[i] || 3;
        const target = targetHeightsRef.current[i] || 3;
        barHeightsRef.current[i] = cur + (target - cur) * lerpSpeed;
      }

      // Draw Waveform or Bars
      if (variant === 'wave') {
        // Continuous harmonic spline curve
        ctx.beginPath();
        const step = width / (count - 1);
        ctx.moveTo(0, h / 2);

        for (let i = 0; i < count; i++) {
          const x = i * step;
          const barH = barHeightsRef.current[i];
          const y = (h / 2) + (i % 2 === 0 ? barH * 0.5 : -barH * 0.5);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.strokeStyle = isPlaying ? '#06B6D4' : isLoading ? '#F59E0B' : '#94A3B8';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      } else {
        // Multi-band frequency bars
        const totalGap = (count - 1) * 2.5;
        const barWidth = Math.max(2, (width - totalGap) / count);

        for (let i = 0; i < count; i++) {
          const x = i * (barWidth + 2.5);
          const barH = Math.max(2, barHeightsRef.current[i]);
          const y = (h - barH) / 2;

          // Gradient color: Cyan to Electric Blue to Amber highlights
          const grad = ctx.createLinearGradient(0, y, 0, y + barH);
          if (isPlaying) {
            grad.addColorStop(0, '#38BDF8'); // Sky blue peak
            grad.addColorStop(0.5, '#2563EB'); // Royal blue mid
            grad.addColorStop(1, '#06B6D4'); // Cyan base
          } else if (isLoading) {
            grad.addColorStop(0, '#FBBF24'); // Amber peak
            grad.addColorStop(1, '#D97706'); // Warm gold
          } else {
            grad.addColorStop(0, '#CBD5E1'); // Slate idle
            grad.addColorStop(1, '#94A3B8');
          }

          ctx.fillStyle = grad;
          // Rounded rect
          const radius = Math.min(barWidth / 2, 2);
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barH, radius);
          ctx.fill();
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isRunning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, isLoading, barCount, variant]);

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <div
        className="relative flex items-center justify-center overflow-hidden rounded-lg px-1.5 py-0.5 bg-slate-900/5 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50"
        style={{ height }}
      >
        <canvas
          ref={canvasRef}
          width={variant === 'compact' ? 56 : variant === 'bars' ? 120 : 160}
          height={height - 4}
          className="block"
        />

        {/* Glowing aura overlay when playing */}
        {isPlaying && (
          <div className="absolute inset-0 pointer-events-none bg-blue-500/10 dark:bg-cyan-500/10 blur-sm rounded-lg" />
        )}
      </div>

      {showLabel && (
        <div className="flex items-center gap-1.5 text-xs font-mono font-bold tracking-tight">
          {isLoading ? (
            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              <span>{label || 'Processing Audio...'}</span>
            </span>
          ) : isPlaying ? (
            <span className="text-blue-600 dark:text-cyan-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>{label || 'Live Audio Processing'}</span>
            </span>
          ) : (
            <span className="text-slate-400 font-normal">
              <span>{label || 'Ready'}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
