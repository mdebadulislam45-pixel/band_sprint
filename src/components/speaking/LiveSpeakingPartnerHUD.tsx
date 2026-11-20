import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Award,
  BookmarkPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Gauge,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Wand2,
  Zap
} from 'lucide-react';
import { AcousticTelemetry } from '../../types/speakingTypes';
import { DetectedGrammarMistake } from './LiveAvatarSpeakingPartner';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { speechRecognitionService } from '../../services/SpeechRecognitionService';

export interface LiveFluencyMetrics {
  wpm: number;
  paceStatus: 'OPTIMAL' | 'SLOW' | 'FAST' | 'STANDBY';
  wordCount: number;
  lexicalDiversityPct: number;
  fillerCount: number;
  detectedFillers: string[];
  pitchVarianceHz: number;
  expressivenessScore: number;
}

interface LiveSpeakingPartnerHUDProps {
  partnerMode: 'part1_drill' | 'ai_live_partner';
  onSwitchToLivePartner: () => void;
  candidateInput: string;
  lastCandidateTranscript: string;
  liveInputErrors: DetectedGrammarMistake[];
  recentTurnErrors: DetectedGrammarMistake[];
  allSessionErrorsCount: number;
  liveAcoustic: AcousticTelemetry;
  isListeningMic: boolean;
  turnStartTimeMs: number;
  lastTurnWpm?: number;
  savedErrorIds: Record<string, boolean>;
  onApplyInlineGrammarFix: (observed: string, corrected: string) => void;
  onSaveErrorToVault: (err: DetectedGrammarMistake) => void;
  onLoadDemoStream: (sampleText: string) => void;
  modelAnswer?: string;
  onRetryQuestion?: () => void;
  avatarGender?: 'female' | 'male';
  regionalAccent?: any;
}

/**
 * HTML5 Canvas Live Audio Waveform Visualizer.
 * Driven purely via requestAnimationFrame loop reading AnalyserNode frequency data,
 * with zero React setState calls during animation.
 */
export const CanvasAudioWaveform: React.FC<{
  isListening: boolean;
  width?: number;
  height?: number;
}> = ({ isListening, width = 140, height = 28 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isListening) return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const freqData = new Uint8Array(32);

    const render = () => {
      const analyser = speechRecognitionService.getAnalyserNode();
      if (analyser) {
        analyser.getByteFrequencyData(freqData);
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barCount = 18;
      const barWidth = 4;
      const gap = 3;
      const startX = (canvas.width - barCount * (barWidth + gap)) / 2;

      for (let i = 0; i < barCount; i++) {
        let val = freqData[i % freqData.length] || 0;
        if (!analyser) {
          // Fallback smooth sinusoidal wave when analyser is initializing
          val = Math.round(120 + Math.sin(Date.now() / 150 + i * 0.8) * 90);
        }
        const barHeight = Math.max(3, Math.min(canvas.height, (val / 255) * canvas.height));
        const x = startX + i * (barWidth + gap);
        const y = (canvas.height - barHeight) / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, '#34d399');
        gradient.addColorStop(1, '#0284c7');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, barWidth, barHeight, 2);
        } else {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isListening]);

  if (!isListening) return null;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-md shrink-0 block"
    />
  );
};

const FILLER_REGEX = /\b(um+|uh+|er+|ah+|like|you know|basically|literally|i mean)\b/gi;

/**
 * Splits a transcript string into segments, marking exact spans that match detected grammar errors
 * so the HUD can render non-occluding real-time inline grammar markers.
 */
function buildAnnotatedTranscriptSegments(
  text: string,
  errors: DetectedGrammarMistake[]
): Array<{
  text: string;
  error?: DetectedGrammarMistake;
}> {
  if (!text) return [];
  if (errors.length === 0) return [{ text }];

  interface MatchSpan {
    start: number;
    end: number;
    error: DetectedGrammarMistake;
  }

  const spans: MatchSpan[] = [];
  const lowerText = text.toLowerCase();

  errors.forEach((err) => {
    const target = err.observed.trim().toLowerCase();
    if (!target) return;
    let searchIdx = 0;
    while (searchIdx < lowerText.length) {
      const foundIdx = lowerText.indexOf(target, searchIdx);
      if (foundIdx === -1) break;
      const endIdx = foundIdx + target.length;
      const overlaps = spans.some((s) => !(endIdx <= s.start || foundIdx >= s.end));
      if (!overlaps) {
        spans.push({ start: foundIdx, end: endIdx, error: err });
      }
      searchIdx = endIdx;
    }
  });

  if (spans.length === 0) return [{ text }];
  spans.sort((a, b) => a.start - b.start);

  const segments: Array<{ text: string; error?: DetectedGrammarMistake }> = [];
  let cursor = 0;

  spans.forEach((span) => {
    if (span.start > cursor) {
      segments.push({ text: text.slice(cursor, span.start) });
    }
    segments.push({
      text: text.slice(span.start, span.end),
      error: span.error
    });
    cursor = span.end;
  });

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return segments;
}

/**
 * Non-Occluding Perimeter Frame Overlay for the Humanoid Examiner Canvas.
 * Positioned strictly along the top-outer and bottom-outer bezel edges so the humanoid
 * avatar's head, eyes, lip-sync mouth, and shoulders remain 100% unobstructed.
 */
export const AvatarPerimeterMiniHUD: React.FC<{
  fluency: LiveFluencyMetrics;
  activeErrorCount: number;
  isListeningMic: boolean;
  partnerMode: 'part1_drill' | 'ai_live_partner';
}> = ({ fluency, activeErrorCount, isListeningMic, partnerMode }) => {
  return (
    <div
      className="pointer-events-none absolute inset-x-2.5 bottom-2.5 z-20 flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-700/70 text-[10px] font-mono text-slate-200 shadow-lg"
      aria-label="Non-occluding perimeter fluency and grammar HUD"
    >
      {/* Left: Live Pace & Mode Readout */}
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span className="text-sky-400 font-bold">
          {partnerMode === 'ai_live_partner' ? 'HUD · LIVE PARTNER' : 'HUD · DRILL'}
        </span>
        <span className="text-slate-600">·</span>
        <span className="tabular-nums font-bold text-white">{fluency.wpm} WPM</span>
        <span
          className={`font-bold ${
            fluency.paceStatus === 'OPTIMAL'
              ? 'text-emerald-400'
              : fluency.paceStatus === 'STANDBY'
              ? 'text-slate-400'
              : 'text-amber-400'
          }`}
        >
          {fluency.paceStatus === 'OPTIMAL'
            ? '● NOMINAL'
            : fluency.paceStatus === 'STANDBY'
            ? '○ READY'
            : `▲ ${fluency.paceStatus}`}
        </span>
      </div>

      {/* Right: Grammar Marker Counter & Filler Telemetry */}
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span className="tabular-nums text-slate-300">
          Lexical: <strong className="text-white">{fluency.lexicalDiversityPct}%</strong>
        </span>
        <span className="text-slate-600">·</span>
        {activeErrorCount > 0 ? (
          <span className="text-amber-300 font-bold tabular-nums">
            ▲ {activeErrorCount} Grammar Marker{activeErrorCount > 1 ? 's' : ''}
          </span>
        ) : (
          <span className="text-emerald-400 font-bold tabular-nums">
            {isListeningMic ? '● Scanning Speech' : '● 0 Errors'}
          </span>
        )}
      </div>
    </div>
  );
};

export const LiveSpeakingPartnerHUD: React.FC<LiveSpeakingPartnerHUDProps> = ({
  partnerMode,
  onSwitchToLivePartner,
  candidateInput,
  lastCandidateTranscript,
  liveInputErrors,
  recentTurnErrors,
  allSessionErrorsCount,
  liveAcoustic,
  isListeningMic,
  turnStartTimeMs,
  lastTurnWpm,
  savedErrorIds,
  onApplyInlineGrammarFix,
  onSaveErrorToVault,
  onLoadDemoStream,
  modelAnswer,
  onRetryQuestion,
  avatarGender,
  regionalAccent
}) => {
  const [selectedErrorId, setSelectedErrorId] = useState<string | null>(null);
  const [isCompactMode, setIsCompactMode] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );

  // Determine whether we are inspecting live active input or the most recent spoken turn
  const isInspectingLiveDraft = candidateInput.trim().length > 0;
  const activeTranscript = isInspectingLiveDraft
    ? candidateInput
    : lastCandidateTranscript;
  const activeErrors = isInspectingLiveDraft ? liveInputErrors : recentTurnErrors;

  // Compute real-time speech fluency metrics
  const fluencyMetrics: LiveFluencyMetrics = useMemo(() => {
    const cleanText = activeTranscript.trim();
    const words = cleanText
      ? cleanText
          .replace(/[^a-zA-Z'\s]/g, ' ')
          .split(/\s+/)
          .filter(Boolean)
      : [];
    const wordCount = words.length;

    // Unique word ratio (Lexical Diversity)
    const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
    const lexicalDiversityPct =
      wordCount > 0 ? Math.min(100, Math.round((uniqueWords.size / wordCount) * 100)) : 0;

    // Filler / Hesitation detection
    const fillerMatches = cleanText ? Array.from(cleanText.matchAll(FILLER_REGEX)).map((m) => m[0].toLowerCase()) : [];
    const fillerCount = fillerMatches.length;

    // Live WPM calculation
    let wpm = lastTurnWpm || 0;
    if (isInspectingLiveDraft && wordCount > 0) {
      const elapsedSec = Math.max(5, (Date.now() - turnStartTimeMs) / 1000);
      wpm = Math.min(195, Math.max(75, Math.round((wordCount / elapsedSec) * 60)));
    } else if (!isInspectingLiveDraft && lastTurnWpm) {
      wpm = lastTurnWpm;
    }

    let paceStatus: LiveFluencyMetrics['paceStatus'] = 'STANDBY';
    if (wpm > 0) {
      if (wpm >= 115 && wpm <= 155) {
        paceStatus = 'OPTIMAL';
      } else if (wpm < 115) {
        paceStatus = 'SLOW';
      } else {
        paceStatus = 'FAST';
      }
    }

    return {
      wpm,
      paceStatus,
      wordCount,
      lexicalDiversityPct,
      fillerCount,
      detectedFillers: Array.from(new Set(fillerMatches)),
      pitchVarianceHz: liveAcoustic.pitchVarianceHz || 24,
      expressivenessScore: liveAcoustic.expressivenessScore || 76
    };
  }, [
    activeTranscript,
    isInspectingLiveDraft,
    lastTurnWpm,
    turnStartTimeMs,
    liveAcoustic.pitchVarianceHz,
    liveAcoustic.expressivenessScore
  ]);

  const annotatedSegments = useMemo(
    () => buildAnnotatedTranscriptSegments(activeTranscript, activeErrors),
    [activeTranscript, activeErrors]
  );

  const focusedError =
    activeErrors.find((e) => e.id === selectedErrorId) || activeErrors[0] || null;

  // Model answer audio playback & analysis expansion state
  const [isModelAudioPlaying, setIsModelAudioPlaying] = useState<boolean>(false);
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState<boolean>(false);

  const modelAnswerText =
    modelAnswer ||
    'I come from Dhaka, a vibrant metropolitan city in Bangladesh. Over the past decade, rapid urban modernization and new elevated expressway projects have dramatically transformed our commuting infrastructure, creating abundant economic opportunities for young graduates.';

  const handleToggleModelAudio = () => {
    if (isModelAudioPlaying) {
      stopSpeech();
      setIsModelAudioPlaying(false);
    } else {
      stopSpeech();
      setIsModelAudioPlaying(true);
      speakBritish(modelAnswerText, {
        gender: avatarGender || 'female',
        regionalAccent: regionalAccent || 'london_rp',
        onEnd: () => setIsModelAudioPlaying(false),
        onError: () => setIsModelAudioPlaying(false)
      });
    }
  };

  const [isManualExpanded, setIsManualExpanded] = useState<boolean>(false);

  // Calculate WPM gauge percentage (scale 60 WPM -> 200 WPM)
  const wpmGaugePct =
    fluencyMetrics.wpm > 0
      ? Math.min(100, Math.max(8, Math.round(((fluencyMetrics.wpm - 60) / 140) * 100)))
      : 0;

  // Auto-collapse during active recording to reduce cognitive load; auto-expand granular metrics when turn ends
  const isSpeakingActive = isListeningMic && !isManualExpanded;

  return (
    <div className="bg-[#0B1514] text-slate-100 border-b border-[#1E3533] px-3 sm:px-5 py-3 space-y-3 transition-all duration-200 ease-out overflow-x-hidden">
      {/* Active Recording Minimal Compact Bar */}
      {isSpeakingActive ? (
        <div className="bg-[#11201F] border border-emerald-500/40 rounded-xl px-3.5 py-2.5 h-14 flex items-center justify-between gap-3 text-xs font-mono text-emerald-300">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="font-bold text-white whitespace-nowrap">Recording Live</span>
            <span className="text-slate-500 hidden sm:inline">·</span>
            <span className="text-slate-400 text-[11px] truncate hidden sm:inline">
              Speak naturally — feedback updates when you finish
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <CanvasAudioWaveform isListening={isListeningMic} width={110} height={24} />
            <button
              type="button"
              onClick={() => setIsManualExpanded(true)}
              className="min-h-[34px] px-2.5 py-1 rounded-lg bg-[#19302E] hover:bg-[#22403D] text-slate-200 border border-[#2A4B47] text-[11px] font-semibold transition cursor-pointer whitespace-nowrap"
            >
              Show Metrics
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Clean Top Feedback Header */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <Gauge className="w-4 h-4 text-[#F4A62A] shrink-0" />
              <span className="text-xs font-bold tracking-tight text-white">
                Fluency &amp; Grammar Feedback
              </span>
              {partnerMode !== 'ai_live_partner' && (
                <button
                  type="button"
                  onClick={onSwitchToLivePartner}
                  className="text-xs font-semibold text-[#F4A62A] hover:underline underline-offset-2 cursor-pointer whitespace-nowrap"
                >
                  Switch to Free-Talk →
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onLoadDemoStream(
                    'Actually I am living in Dhaka since my childhood and many people is working in technology startups because it is more better for career growth.'
                  )
                }
                className="min-h-[34px] px-2.5 py-1 rounded-lg bg-[#11201F] hover:bg-[#19302E] text-slate-200 border border-[#24413E] text-[11px] font-semibold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                title="Load a sample spoken answer with common mistakes to preview instant grammar corrections"
              >
                <Wand2 className="w-3 h-3 text-[#F4A62A]" />
                <span>Sample Grammar Check</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsCompactMode(!isCompactMode);
                  setIsManualExpanded(false);
                }}
                className="min-h-[34px] px-2.5 py-1 rounded-lg bg-[#11201F] hover:bg-[#19302E] text-slate-300 border border-[#24413E] text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                {isCompactMode ? (
                  <>
                    <Eye className="w-3 h-3 text-[#F4A62A]" />
                    <span>Show Details</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3 h-3 text-slate-400" />
                    <span>Hide Details</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 4-Column Real-Time Speech Fluency Metrics Deck */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Metric 1: Speech Cadence & WPM Target Zone */}
            <div className="p-2.5 rounded-xl bg-[#11201F] border border-[#1E3533] space-y-1.5 min-w-0">
              <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-slate-400">
                <span className="truncate">PACE</span>
                <span
                  className={`font-bold shrink-0 ${
                    fluencyMetrics.paceStatus === 'OPTIMAL'
                      ? 'text-emerald-400'
                      : fluencyMetrics.paceStatus === 'STANDBY'
                      ? 'text-slate-400'
                      : 'text-amber-400'
                  }`}
                >
                  {fluencyMetrics.paceStatus === 'OPTIMAL'
                    ? 'OPTIMAL'
                    : fluencyMetrics.paceStatus === 'STANDBY'
                    ? 'READY'
                    : fluencyMetrics.paceStatus}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-1 flex-wrap">
                <span className="text-sm sm:text-base font-bold font-mono tabular-nums text-white">
                  {fluencyMetrics.wpm > 0 ? `${fluencyMetrics.wpm} WPM` : '— WPM'}
                </span>
                <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                  115–150
                </span>
              </div>
              <div className="relative h-1.5 w-full rounded-full bg-[#1C3230] overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 bg-emerald-500/25 border-x border-emerald-500/40"
                  style={{ left: '39%', width: '26%' }}
                />
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    fluencyMetrics.paceStatus === 'OPTIMAL'
                      ? 'bg-emerald-400'
                      : fluencyMetrics.paceStatus === 'STANDBY'
                      ? 'bg-slate-600'
                      : 'bg-amber-400'
                  }`}
                  style={{ width: `${wpmGaugePct}%` }}
                />
              </div>
            </div>

            {/* Metric 2: Real-Time Grammar Counter */}
            <div className="p-2.5 rounded-xl bg-[#11201F] border border-[#1E3533] space-y-1.5 min-w-0">
              <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-slate-400">
                <span className="truncate">GRAMMAR</span>
                <span
                  className={`font-bold shrink-0 ${
                    activeErrors.length === 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {activeErrors.length === 0 ? 'CLEAN' : `${activeErrors.length} FIX`}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-1 flex-wrap">
                <span className="text-sm sm:text-base font-bold font-mono tabular-nums text-white">
                  {activeErrors.length} Active
                </span>
                <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                  Total: {allSessionErrorsCount}
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 truncate">
                {activeErrors.length > 0
                  ? activeErrors[0].category
                  : 'No errors flagged'}
              </div>
            </div>

            {/* Metric 3: Vocabulary Variety & Fillers */}
            <div className="p-2.5 rounded-xl bg-[#11201F] border border-[#1E3533] space-y-1.5 min-w-0">
              <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-slate-400">
                <span className="truncate">VARIETY</span>
                <span
                  className={`font-bold shrink-0 ${
                    fluencyMetrics.fillerCount === 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {fluencyMetrics.fillerCount === 0
                    ? '0 FILLERS'
                    : `${fluencyMetrics.fillerCount} FILLER${fluencyMetrics.fillerCount > 1 ? 'S' : ''}`}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-1 flex-wrap">
                <span className="text-sm sm:text-base font-bold font-mono tabular-nums text-white">
                  {fluencyMetrics.lexicalDiversityPct}%
                </span>
                <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                  {fluencyMetrics.wordCount} words
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 truncate">
                {fluencyMetrics.detectedFillers.length > 0
                  ? `Fillers: ${fluencyMetrics.detectedFillers.join(', ')}`
                  : 'Goal: 25–45 words'}
              </div>
            </div>

            {/* Metric 4: Voice Intonation */}
            <div className="p-2.5 rounded-xl bg-[#11201F] border border-[#1E3533] space-y-1.5 min-w-0">
              <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-slate-400">
                <span className="truncate">TONE</span>
                <span
                  className={`font-bold shrink-0 ${
                    fluencyMetrics.expressivenessScore >= 70
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}
                >
                  {fluencyMetrics.expressivenessScore >= 70 ? 'NATURAL' : 'FLAT'}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-1 flex-wrap">
                <span className="text-sm sm:text-base font-bold font-mono tabular-nums text-white">
                  {fluencyMetrics.expressivenessScore}%
                </span>
                <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                  {fluencyMetrics.pitchVarianceHz} Hz
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#1C3230] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#1F8A70] transition-all duration-300"
                  style={{ width: `${Math.min(100, fluencyMetrics.expressivenessScore)}%` }}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Expandable Live Grammar Corrections Inspector */}
      {!isCompactMode && (
        <div className="rounded-xl bg-[#11201F] border border-[#1E3533] p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs">
              <Activity className="w-3.5 h-3.5 text-[#F4A62A] shrink-0" />
              <span className="font-bold text-slate-100">
                {isInspectingLiveDraft ? 'Live Grammar Check' : 'Last Spoken Answer'}
              </span>
              {isListeningMic && (
                <span className="text-rose-400 text-[11px] font-semibold">· Recording</span>
              )}
            </div>

            <span className="text-[11px] text-slate-400">
              {activeErrors.length > 0
                ? 'Tap any highlighted phrase to apply a Band 8.5 fix'
                : 'Speak or type below to check grammar in real time'}
            </span>
          </div>

          {activeTranscript ? (
            <div className="p-2.5 rounded-lg bg-[#0B1514] border border-[#1E3533] text-xs sm:text-sm leading-relaxed text-slate-200 break-words">
              {annotatedSegments.map((seg, idx) => {
                if (!seg.error) {
                  return <span key={idx}>{seg.text}</span>;
                }
                const err = seg.error;
                const isSelected = focusedError?.id === err.id;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedErrorId(err.id)}
                    className={`mx-0.5 px-1.5 py-0.5 rounded-md font-semibold transition inline-flex items-center gap-1 cursor-pointer border ${
                      isSelected
                        ? 'bg-rose-500/25 border-rose-400 text-rose-200 ring-1 ring-rose-400/50'
                        : 'bg-amber-500/20 border-amber-500/50 text-amber-200 hover:bg-rose-500/20'
                    }`}
                    title={`${err.category}: Replace "${err.observed}" with "${err.corrected}"`}
                  >
                    <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                    <span className="underline decoration-wavy decoration-rose-400">
                      {seg.text}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/90 px-1 rounded">
                      → {err.corrected}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-2.5 rounded-lg bg-[#0B1514] border border-[#1E3533] text-xs text-slate-400">
              Tap <strong className="text-slate-200">Speak Live</strong> or type your response below to see instant grammar fixes and pacing feedback.
            </div>
          )}

          {focusedError ? (
            <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
                  <span className="font-bold uppercase text-amber-300">
                    {focusedError.category}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-rose-300 line-through">“{focusedError.observed}”</span>
                  <span className="text-emerald-300 font-bold">
                    → “{focusedError.corrected}”
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-snug">
                  {focusedError.explanationEn}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {isInspectingLiveDraft && (
                  <button
                    type="button"
                    onClick={() =>
                      onApplyInlineGrammarFix(focusedError.observed, focusedError.corrected)
                    }
                    className="min-h-[36px] px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Apply Fix</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onSaveErrorToVault(focusedError)}
                  disabled={Boolean(savedErrorIds[focusedError.id])}
                  className={`min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                    savedErrorIds[focusedError.id]
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                      : 'bg-[#19302E] hover:bg-[#22403D] text-white border border-[#2A4B47]'
                  }`}
                >
                  {savedErrorIds[focusedError.id] ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="w-3.5 h-3.5 text-[#F4A62A]" />
                      <span>Save to Vault</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            activeTranscript.trim().length > 0 && (
              <div className="px-3 py-2 rounded-lg bg-emerald-950/30 border border-emerald-700/40 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-300">
                <span className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>No grammar errors detected</span>
                </span>
                <span className="text-[11px] font-mono text-emerald-400/90">Band 8.0+ Syntax</span>
              </div>
            )
          )}
        </div>
      )}

      {/* Band 8+ Examiner Benchmark Card (Mobile-safe wrapping actions) */}
      {!isSpeakingActive && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-[#11201F] border border-[#1F8A70]/40 space-y-3 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[#1E3533] pb-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <Award className="w-5 h-5 text-[#F4A62A] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                  Band 8+ Model Answer
                </h3>
                <p className="text-[11px] text-[#9AAEA9] leading-snug">
                  IELTS Speaking Exemplar · Cohesion &amp; Lexical Resource
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleModelAudio}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  isModelAudioPlaying
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-[#0F4C45] hover:bg-[#15635A] text-white border border-[#1F8A70]/50'
                }`}
              >
                {isModelAudioPlaying ? <VolumeX className="w-3.5 h-3.5 shrink-0" /> : <Volume2 className="w-3.5 h-3.5 shrink-0" />}
                <span>{isModelAudioPlaying ? 'Stop Audio' : 'Listen to Model Answer'}</span>
              </button>

              {onRetryQuestion && (
                <button
                  type="button"
                  onClick={onRetryQuestion}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#19302E] hover:bg-[#22403D] text-slate-100 border border-[#2A4B47] text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  title="Clear current turn and retake this question"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#F4A62A] shrink-0" />
                  <span>Retry Question</span>
                </button>
              )}
            </div>
          </div>

          {/* Model Response Transcript */}
          <div className="p-3 rounded-xl bg-[#0B1514] border border-[#1E3533] text-xs sm:text-sm leading-relaxed text-[#EEF3F1] font-serif italic">
            “{modelAnswerText}”
          </div>

          {/* Expandable Examiner Analysis */}
          <div>
            <button
              type="button"
              onClick={() => setIsAnalysisExpanded(!isAnalysisExpanded)}
              className="min-h-[36px] text-xs font-semibold text-[#F4A62A] hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F4A62A] shrink-0" />
              <span>{isAnalysisExpanded ? 'Hide Examiner Notes' : 'Why this scores Band 8+'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isAnalysisExpanded ? 'rotate-180' : ''}`} />
            </button>

            {isAnalysisExpanded && (
              <div className="mt-2 p-3 rounded-xl bg-[#0B1514] border border-[#1E3533] space-y-2.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-800/50 space-y-1">
                    <span className="font-mono font-bold text-rose-300 text-[10px] uppercase block">
                      Common Pitfall to Avoid
                    </span>
                    <p className="text-slate-300 text-[11px]">
                      {activeErrors.length > 0
                        ? `"${activeErrors[0].observed}" (${activeErrors[0].category})`
                        : 'Using repetitive basic vocabulary or tense slips ("I am living since...").'}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/50 space-y-1">
                    <span className="font-mono font-bold text-emerald-300 text-[10px] uppercase block">
                      Band 8+ Upgrade
                    </span>
                    <p className="text-emerald-200 font-semibold text-[11px]">
                      {activeErrors.length > 0
                        ? `"${activeErrors[0].corrected}"`
                        : 'Use natural collocations, accurate present perfect tenses, and clear linking.'}
                    </p>
                  </div>
                </div>

                <p className="text-[11px] leading-relaxed text-[#9AAEA9]">
                  Read this model response aloud after listening to build rhythm, stress, and accurate grammatical control.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
