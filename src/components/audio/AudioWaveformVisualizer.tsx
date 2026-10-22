import React, { useEffect, useRef, useState } from 'react';
import { Mic, Activity, Volume2 } from 'lucide-react';

interface AudioWaveformVisualizerProps {
  isRecording: boolean;
  height?: number;
  barColor?: string;
  showMetrics?: boolean;
  className?: string;
}

export const AudioWaveformVisualizer: React.FC<AudioWaveformVisualizerProps> = ({
  isRecording,
  height = 54,
  showMetrics = true,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [vocalStatus, setVocalStatus] = useState<'silent' | 'moderate' | 'optimal' | 'loud'>('silent');
  const [micActive, setMicActive] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    if (!isRecording) {
      // Clean up Web Audio nodes
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch {}
        sourceRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch {}
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      setMicActive(false);
      setVolumeLevel(0);
      setVocalStatus('silent');

      // Clear canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          // Draw subtle flat center line
          ctx.beginPath();
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 2;
          ctx.moveTo(0, canvas.height / 2);
          ctx.lineTo(canvas.width, canvas.height / 2);
          ctx.stroke();
        }
      }
      return;
    }

    // Start Web Audio API capture
    const setupAudio = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.warn('getUserMedia is not supported on this browser.');
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        const AudioCtx =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.75;
        analyserRef.current = analyser;

        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);
        sourceRef.current = source;

        setMicActive(true);

        const canvas = canvasRef.current;
        if (!canvas) return;

        const canvasCtx = canvas.getContext('2d');
        if (!canvasCtx) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const timeDataArray = new Uint8Array(analyser.fftSize);

        let smoothVolume = 0;

        const renderFrame = () => {
          if (!analyserRef.current || isCancelled) return;

          analyser.getByteFrequencyData(dataArray);
          analyser.getByteTimeDomainData(timeDataArray);

          // Calculate RMS volume
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const currentAvg = sum / bufferLength;
          smoothVolume = smoothVolume * 0.7 + (currentAvg / 255) * 0.3;
          const pct = Math.min(100, Math.round(smoothVolume * 150));
          setVolumeLevel(pct);

          if (pct < 6) {
            setVocalStatus('silent');
          } else if (pct < 28) {
            setVocalStatus('moderate');
          } else if (pct < 75) {
            setVocalStatus('optimal');
          } else {
            setVocalStatus('loud');
          }

          const width = canvas.width;
          const height = canvas.height;

          canvasCtx.clearRect(0, 0, width, height);

          // Draw dual layer: Waveform curve + frequency bars
          const numBars = 36;
          const barWidth = (width / numBars) - 2;
          const step = Math.floor(bufferLength / numBars);

          for (let i = 0; i < numBars; i++) {
            const freqValue = dataArray[i * step] || 0;
            const barHeight = Math.max(3, (freqValue / 255) * (height - 6));
            const x = i * (barWidth + 2);
            const y = (height - barHeight) / 2;

            // Gradient based on frequency intensity
            const gradient = canvasCtx.createLinearGradient(0, y, 0, y + barHeight);
            if (pct < 6) {
              gradient.addColorStop(0, '#94a3b8');
              gradient.addColorStop(1, '#cbd5e1');
            } else if (pct < 65) {
              gradient.addColorStop(0, '#4f46e5'); // Indigo
              gradient.addColorStop(0.5, '#06b6d4'); // Cyan
              gradient.addColorStop(1, '#10b981'); // Emerald
            } else {
              gradient.addColorStop(0, '#f43f5e'); // Rose
              gradient.addColorStop(1, '#8b5cf6'); // Purple
            }

            canvasCtx.fillStyle = gradient;
            // Rounded bars
            const radius = Math.min(2, barWidth / 2);
            canvasCtx.beginPath();
            canvasCtx.roundRect(x, y, barWidth, barHeight, radius);
            canvasCtx.fill();
          }

          // Draw fluid center connecting wave line
          canvasCtx.beginPath();
          canvasCtx.lineWidth = 2;
          canvasCtx.strokeStyle = pct > 10 ? 'rgba(99, 102, 241, 0.7)' : 'rgba(148, 163, 184, 0.4)';

          const sliceWidth = width / bufferLength;
          let waveX = 0;
          for (let i = 0; i < bufferLength; i++) {
            const v = timeDataArray[i] / 128.0;
            const waveY = (v * height) / 2;
            if (i === 0) {
              canvasCtx.moveTo(waveX, waveY);
            } else {
              canvasCtx.lineTo(waveX, waveY);
            }
            waveX += sliceWidth;
          }
          canvasCtx.stroke();

          animationFrameRef.current = requestAnimationFrame(renderFrame);
        };

        renderFrame();
      } catch (err) {
        console.warn('Microphone access denied or Web Audio error:', err);
        setMicActive(false);
      }
    };

    setupAudio();

    return () => {
      isCancelled = true;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch {}
      }
    };
  }, [isRecording]);

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Canvas Waveform */}
      <div className="relative bg-slate-900 rounded-2xl p-2.5 shadow-inner border border-slate-800 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={400}
          height={height}
          className="w-full block rounded-xl"
          style={{ height: `${height}px` }}
        />

        {!micActive && isRecording && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs text-slate-400 text-xs font-mono">
            Connecting microphone audio stream...
          </div>
        )}
      </div>

      {/* Real-time volume and flow indicators */}
      {showMetrics && isRecording && (
        <div className="flex items-center justify-between text-[11px] font-mono px-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <Activity className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
              <span>Flow Level:</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase transition-colors ${
                vocalStatus === 'optimal'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : vocalStatus === 'moderate'
                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                  : vocalStatus === 'loud'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-slate-200 text-slate-600 border border-slate-300'
              }`}
            >
              {vocalStatus === 'optimal' && 'Optimal Cadence'}
              {vocalStatus === 'moderate' && 'Speaking Detected'}
              {vocalStatus === 'loud' && 'High Volume'}
              {vocalStatus === 'silent' && 'Listening (Pause)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Volume2 className="w-3.5 h-3.5 text-slate-400" />
            <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-100 rounded-full ${
                  volumeLevel > 70 ? 'bg-amber-500' : volumeLevel > 20 ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(4, volumeLevel))}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 w-7 text-right">{volumeLevel}%</span>
          </div>
        </div>
      )}
    </div>
  );
};
