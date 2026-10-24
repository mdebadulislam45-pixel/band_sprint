import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BookmarkPlus,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Gauge,
  Sparkles,
  Wand2,
  Zap
} from 'lucide-react';
import { AcousticTelemetry } from '../../types/speakingTypes';
import { DetectedGrammarMistake } from './LiveAvatarSpeakingPartner';

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
}

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
  onLoadDemoStream
}) => {
  const [selectedErrorId, setSelectedErrorId] = useState<string | null>(null);
  const [isCompactMode, setIsCompactMode] = useState<boolean>(false);

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

  // Calculate WPM gauge percentage (scale 60 WPM -> 200 WPM)
  const wpmGaugePct =
    fluencyMetrics.wpm > 0
      ? Math.min(100, Math.max(8, Math.round(((fluencyMetrics.wpm - 60) / 140) * 100)))
      : 0;

  return (
    <div className="bg-slate-950 text-slate-100 border-b border-slate-800/90 px-4 sm:px-6 py-3.5 space-y-3">
      {/* Top HUD Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Gauge className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="text-xs font-black tracking-tight text-white uppercase">
            AI Live Speaking Partner HUD
          </span>
          <span className="text-slate-600 font-mono text-xs">·</span>
          <span className="text-[11px] font-mono text-emerald-400 font-semibold">
            Non-Occluding Telemetry Dock (Avatar Clear)
          </span>
          {partnerMode !== 'ai_live_partner' && (
            <>
              <span className="text-slate-600 font-mono text-xs">·</span>
              <button
                type="button"
                onClick={onSwitchToLivePartner}
                className="text-[11px] font-mono font-bold text-amber-300 hover:text-amber-200 underline cursor-pointer whitespace-nowrap"
              >
                Switch to AI Free-Talk Partner Mode →
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Quick-Test Live HUD Stream Button */}
          <button
            type="button"
            onClick={() =>
              onLoadDemoStream(
                'Actually I am living in Dhaka since my childhood and many people is working in technology startups because it is more better for career growth.'
              )
            }
            className="px-2.5 py-1 rounded-lg bg-indigo-950/90 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/60 text-[11px] font-mono font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            title="Load a sample spoken stream with grammar traps to test real-time HUD markers"
          >
            <Wand2 className="w-3 h-3 text-indigo-400" />
            <span>Test Live HUD Markers</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCompactMode(!isCompactMode)}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] font-mono font-semibold transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            {isCompactMode ? (
              <>
                <Eye className="w-3 h-3 text-sky-400" />
                <span>Expand HUD</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3 h-3 text-slate-400" />
                <span>Compact HUD</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4-Column Real-Time Speech Fluency Metrics Deck */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Metric 1: Speech Cadence & WPM Target Zone */}
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/90 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>SPEECH PACE</span>
            <span
              className={`font-bold ${
                fluencyMetrics.paceStatus === 'OPTIMAL'
                  ? 'text-emerald-400'
                  : fluencyMetrics.paceStatus === 'STANDBY'
                  ? 'text-slate-400'
                  : 'text-amber-400'
              }`}
            >
              {fluencyMetrics.paceStatus === 'OPTIMAL'
                ? '● OPTIMAL'
                : fluencyMetrics.paceStatus === 'STANDBY'
                ? '○ STANDBY'
                : `▲ ${fluencyMetrics.paceStatus}`}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-base sm:text-lg font-black font-mono tabular-nums text-white">
              {fluencyMetrics.wpm > 0 ? `${fluencyMetrics.wpm} WPM` : '— WPM'}
            </span>
            <span className="text-[10px] font-mono text-slate-400 tabular-nums">
              Target: 115–150
            </span>
          </div>
          {/* Visual WPM Target Band Bar */}
          <div className="relative h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            {/* Optimal 115-150 WPM zone highlight */}
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

        {/* Metric 2: Real-Time Grammar Error Markers Counter */}
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/90 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>GRAMMAR MARKERS</span>
            <span
              className={`font-bold ${
                activeErrors.length === 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {activeErrors.length === 0 ? '● NOMINAL' : `▲ ${activeErrors.length} FLAGGED`}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-base sm:text-lg font-black font-mono tabular-nums text-white">
              {activeErrors.length} Live
            </span>
            <span className="text-[10px] font-mono text-slate-400 tabular-nums">
              Session: {allSessionErrorsCount}
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 truncate">
            {activeErrors.length > 0
              ? activeErrors[0].category
              : 'Cambridge C1 syntax clean'}
          </div>
        </div>

        {/* Metric 3: Filler & Hesitation Radar + Lexical Variety */}
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/90 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>FLUENCY & LEXIS</span>
            <span
              className={`font-bold ${
                fluencyMetrics.fillerCount === 0 ? 'text-sky-400' : 'text-amber-400'
              }`}
            >
              {fluencyMetrics.fillerCount === 0
                ? '● 0 FILLERS'
                : `▲ ${fluencyMetrics.fillerCount} FILLER${fluencyMetrics.fillerCount > 1 ? 'S' : ''}`}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-base sm:text-lg font-black font-mono tabular-nums text-white">
              {fluencyMetrics.lexicalDiversityPct}% Variety
            </span>
            <span className="text-[10px] font-mono text-slate-400 tabular-nums">
              {fluencyMetrics.wordCount}w
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 truncate">
            {fluencyMetrics.detectedFillers.length > 0
              ? `Fillers: "${fluencyMetrics.detectedFillers.join('", "')}"`
              : 'Target turn length: 25–45 words'}
          </div>
        </div>

        {/* Metric 4: Acoustic Intonation & Expressiveness */}
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/90 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>PROSODY & PITCH</span>
            <span
              className={`font-bold ${
                fluencyMetrics.expressivenessScore >= 70
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}
            >
              {fluencyMetrics.expressivenessScore >= 70 ? '● EXPRESSIVE' : '▲ FLAT TONE'}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-base sm:text-lg font-black font-mono tabular-nums text-white">
              {fluencyMetrics.pitchVarianceHz} Hz
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold tabular-nums">
              {fluencyMetrics.expressivenessScore}% Score
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-sky-400 transition-all duration-300"
              style={{ width: `${Math.min(100, fluencyMetrics.expressivenessScore)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Expandable Live Grammar Error Markers & Stream Inspector */}
      {!isCompactMode && (
        <div className="rounded-2xl bg-slate-900/95 border border-slate-800 p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-bold text-slate-200 uppercase">
                {isInspectingLiveDraft
                  ? 'Live Speech Buffer · Real-Time Grammar Error Markers'
                  : 'Last Spoken Turn · Grammar & Fluency Telemetry'}
              </span>
              {isListeningMic && (
                <span className="text-rose-400 font-bold">· ● MIC STREAMING</span>
              )}
            </div>

            <span className="text-[10px] font-mono text-slate-400">
              {activeErrors.length > 0
                ? 'Click any highlighted marker below to apply instant Band 8.5 repair'
                : 'Speak or type below — grammar markers appear here in real time'}
            </span>
          </div>

          {/* Annotated Stream with Real-Time Inline Grammar Markers */}
          {activeTranscript ? (
            <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800/90 text-xs sm:text-sm leading-relaxed text-slate-200">
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
                    title={`${err.category}:Replace "${err.observed}" with "${err.corrected}"`}
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
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/70 text-xs text-slate-400 flex items-center justify-between gap-2">
              <span>
                Start speaking with <strong>Speak Live</strong> or type in the input box below to see real-time grammar error markers and WPM cadence.
              </span>
              <span className="text-[10px] font-mono text-sky-400 whitespace-nowrap">
                ● HUD Ready
              </span>
            </div>
          )}

          {/* Active Grammar Marker Inspector & 1-Click Inline Repair Bar */}
          {focusedError ? (
            <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
                  <span className="font-bold uppercase text-amber-300">
                    ▲ MARKER: {focusedError.category}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-rose-300 line-through">“{focusedError.observed}”</span>
                  <span className="text-emerald-300 font-bold">
                    → “{focusedError.corrected}”
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  {focusedError.explanationEn}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isInspectingLiveDraft && (
                  <button
                    type="button"
                    onClick={() =>
                      onApplyInlineGrammarFix(focusedError.observed, focusedError.corrected)
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-mono font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-xs"
                  >
                    <Zap className="w-3 h-3" />
                    <span>Apply Fix in Input</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onSaveErrorToVault(focusedError)}
                  disabled={Boolean(savedErrorIds[focusedError.id])}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                    savedErrorIds[focusedError.id]
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                      : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                  }`}
                >
                  {savedErrorIds[focusedError.id] ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Saved</span>
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="w-3 h-3 text-amber-400" />
                      <span>Save to Vault</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            activeTranscript.trim().length > 0 && (
              <div className="px-3 py-1.5 rounded-xl bg-emerald-950/30 border border-emerald-700/40 flex items-center justify-between text-[11px] font-mono text-emerald-300">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>● ZERO GRAMMAR ERRORS DETECTED IN ACTIVE STREAM</span>
                </span>
                <span className="tabular-nums text-emerald-400/90">Band 8.0+ Syntactic Control</span>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};
