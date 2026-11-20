import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  BookmarkPlus,
  Check,
  Volume2,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { addMistake } from '../../utils/vaultStorage';
import { soundManager } from '../../utils/audioEffects';

const FILLER_PHRASES = [
  'you know',
  'i mean',
  'sort of',
  'kind of',
  'to be honest',
  'at the end of the day'
];

const FILLER_WORDS = new Set([
  'um',
  'uh',
  'uhh',
  'umm',
  'er',
  'erm',
  'ah',
  'ahh',
  'hmm',
  'like',
  'basically',
  'actually',
  'literally',
  'obviously',
  'stuff',
  'things'
]);

const BAND8_MARKERS = new Set([
  'however',
  'furthermore',
  'moreover',
  'consequently',
  'nevertheless',
  'nonetheless',
  'admittedly',
  'conversely',
  'predominantly',
  'specifically',
  'ultimately',
  'notably',
  'arguably',
  'undoubtedly',
  'meanwhile',
  'therefore',
  'whereas',
  'although',
  'despite',
  'particularly',
  'significantly',
  'substantially',
  'primarily'
]);

const REPETITIVE_LINKERS = new Set(['and', 'so', 'but', 'then']);

interface SpeakingTranscriptHighlighterProps {
  transcript: string;
  audioUrl?: string | null;
  contextLabel?: string;
  onShowToast?: (msg: string) => void;
  compact?: boolean;
}

interface HighlightToken {
  text: string;
  kind: 'filler' | 'repetitive' | 'marker' | 'normal';
  note?: string;
}

export const SpeakingTranscriptHighlighter: React.FC<SpeakingTranscriptHighlighterProps> = ({
  transcript,
  audioUrl,
  contextLabel = 'Speaking Lab Recording',
  onShowToast,
  compact = false
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [savedToVault, setSavedToVault] = useState(false);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setSavedToVault(false);
  }, [audioUrl, transcript]);

  const analysis = useMemo(() => {
    const clean = transcript.trim();
    if (!clean) {
      return {
        tokens: [] as HighlightToken[],
        totalWords: 0,
        fillerCount: 0,
        markerCount: 0,
        repetitiveCount: 0,
        fillerWordsFound: [] as string[],
        fillerRatePct: 0
      };
    }

    // Count repetitive coordinators first
    const rawWords = clean
      .toLowerCase()
      .replace(/[^a-z'\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
    const linkerCounts: Record<string, number> = {};
    rawWords.forEach((w) => {
      if (REPETITIVE_LINKERS.has(w)) {
        linkerCounts[w] = (linkerCounts[w] || 0) + 1;
      }
    });

    // Multi-word filler phrase detection via normalized markers
    const lower = clean.toLowerCase();
    const phraseRanges: Array<{ start: number; end: number; phrase: string }> = [];
    FILLER_PHRASES.forEach((phrase) => {
      let idx = lower.indexOf(phrase);
      while (idx !== -1) {
        phraseRanges.push({ start: idx, end: idx + phrase.length, phrase });
        idx = lower.indexOf(phrase, idx + phrase.length);
      }
    });

    const tokens: HighlightToken[] = [];
    let fillerCount = 0;
    let markerCount = 0;
    let repetitiveCount = 0;
    const fillerSet = new Set<string>();

    // Tokenize preserving whitespace and punctuation
    let cursor = 0;
    const parts = clean.split(/(\s+)/);
    for (const part of parts) {
      const start = cursor;
      cursor += part.length;

      if (!part.trim()) {
        tokens.push({ text: part, kind: 'normal' });
        continue;
      }

      const norm = part.toLowerCase().replace(/[^a-z']/g, '');
      const inPhrase = phraseRanges.find((r) => start >= r.start && start < r.end);

      if (inPhrase) {
        if (start === inPhrase.start) {
          fillerCount += 1;
          fillerSet.add(inPhrase.phrase);
        }
        tokens.push({
          text: part,
          kind: 'filler',
          note: `Hesitation filler ("${inPhrase.phrase}") — replace with a calm 0.5s pause or a Band 8 linker.`
        });
      } else if (FILLER_WORDS.has(norm)) {
        fillerCount += 1;
        fillerSet.add(norm);
        tokens.push({
          text: part,
          kind: 'filler',
          note: `Verbal filler ("${norm}") lowers Fluency & Coherence if repeated.`
        });
      } else if (BAND8_MARKERS.has(norm)) {
        markerCount += 1;
        tokens.push({
          text: part,
          kind: 'marker',
          note: `Band 8.0+ discourse marker / C1 precision modifier ("${norm}").`
        });
      } else if (REPETITIVE_LINKERS.has(norm) && (linkerCounts[norm] || 0) >= 3) {
        repetitiveCount += 1;
        tokens.push({
          text: part,
          kind: 'repetitive',
          note: `Overused coordinator ("${norm}" used ${linkerCounts[norm]}×) — vary with "whereas", "furthermore", or "consequently".`
        });
      } else {
        tokens.push({ text: part, kind: 'normal' });
      }
    }

    const totalWords = rawWords.length;
    const fillerRatePct = totalWords > 0 ? Math.round((fillerCount / totalWords) * 1000) / 10 : 0;

    return {
      tokens,
      totalWords,
      fillerCount,
      markerCount,
      repetitiveCount,
      fillerWordsFound: Array.from(fillerSet),
      fillerRatePct
    };
  }, [transcript]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleRestartAudio = () => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = 0;
    setCurrentTime(0);
    el.play().catch(() => {});
    setIsPlaying(true);
  };

  const formatSec = (s: number) => {
    if (!Number.isFinite(s) || s < 0) return '0:00';
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSaveFillerTrap = () => {
    if (savedToVault || !transcript.trim()) return;
    const found = analysis.fillerWordsFound.length > 0
      ? analysis.fillerWordsFound.join(', ')
      : 'Repetitive linkers';

    addMistake({
      module: 'speaking',
      title: `Speaking Fluency · Filler Audit (${found})`,
      prompt: contextLabel,
      questionType: 'Fluency & Filler-Word Reduction',
      userAnswer: transcript.slice(0, 260),
      userWrongAnswer: transcript.slice(0, 260),
      correctAnswer: 'Replace verbal fillers ("um", "like", "actually", "you know") with silent breath pauses and C1 discourse signposts ("predominantly", "conversely", "admittedly").',
      explanation: `Detected ${analysis.fillerCount} filler(s) (${analysis.fillerRatePct}% filler density) and ${analysis.markerCount} Band 8+ discourse markers across ${analysis.totalWords} words.`,
      trapExplanationEn: `Examiners distinguish between content-related thinking pauses and language-related hesitation fillers (${found}).`,
      trapExplanationBn: `কথার মাঝে "um", "like", "actually" বা "you know" বারবার বললে Fluency স্কোর কমে যায়। এর বদলে আধা সেকেন্ড নীরব শ্বাস নিয়ে "however" বা "specifically" ব্যবহার করুন।`
    });
    setSavedToVault(true);
    soundManager.playSuccess();
    onShowToast?.('Saved Speaking filler audit to your Mistake Vault.');
  };

  if (!transcript.trim() && !audioUrl) return null;

  return (
    <div className={`rounded-2xl border border-[#D3DDDA] dark:border-[#1F8A70]/35 bg-white dark:bg-[#11201E] ${compact ? 'p-3.5 space-y-3' : 'p-4 sm:p-5 space-y-4'}`}>
      {/* Top Header + Live Telemetry Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-[#EEF3F1] dark:border-[#1F8A70]/25">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#0F4C45] dark:text-[#F4A62A]" />
          <span className="text-xs font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
            Voice Playback &amp; Filler-Word Highlighter
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono tabular-nums">
          <span
            className={`px-2 py-0.5 rounded-md font-bold border ${
              analysis.fillerCount === 0
                ? 'bg-[#EEF3F1] dark:bg-[#0F4C45]/40 text-[#0F4C45] dark:text-emerald-300 border-[#9EBEB8] dark:border-[#1F8A70]/40'
                : 'bg-[#FDF2F2] dark:bg-rose-950/50 text-[#B3261E] dark:text-rose-300 border-[#F5B8B8] dark:border-rose-800'
            }`}
          >
            Fillers: {analysis.fillerCount} ({analysis.fillerRatePct}%)
          </span>
          <span className="px-2 py-0.5 rounded-md font-bold bg-[#FEF6E8] dark:bg-amber-950/40 text-[#9B6314] dark:text-amber-300 border border-[#F9D590] dark:border-amber-800/60">
            Repetitive Linkers: {analysis.repetitiveCount}
          </span>
          <span className="px-2 py-0.5 rounded-md font-bold bg-[#EEF3F1] dark:bg-[#0F4C45]/40 text-[#0F4C45] dark:text-emerald-300 border border-[#9EBEB8] dark:border-[#1F8A70]/40">
            Band 8+ Markers: {analysis.markerCount}
          </span>
        </div>
      </div>

      {/* Candidate Audio Replay Bar */}
      {audioUrl && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30">
          <audio
            ref={audioRef}
            src={audioUrl}
            onLoadedMetadata={(e) => setDuration((e.currentTarget as HTMLAudioElement).duration || 0)}
            onTimeUpdate={(e) => setCurrentTime((e.currentTarget as HTMLAudioElement).currentTime || 0)}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />

          <button
            type="button"
            onClick={togglePlay}
            className="w-9 h-9 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white flex items-center justify-center shrink-0 transition cursor-pointer"
            aria-label={isPlaying ? 'Pause your recording' : 'Play your recording'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={handleRestartAudio}
            className="w-8 h-8 rounded-lg bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-[#566664] dark:text-slate-300 hover:text-[#0F4C45] flex items-center justify-center shrink-0 transition cursor-pointer"
            title="Replay from start"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#0E1F1E] dark:text-[#EEF3F1]">
              <span className="flex items-center gap-1.5 truncate">
                <Volume2 className="w-3.5 h-3.5 text-[#0F4C45] dark:text-[#F4A62A] shrink-0" />
                <span>Your Recorded Voice Playback</span>
              </span>
              <span className="font-mono text-[10px] text-[#566664] dark:text-slate-400 tabular-nums shrink-0">
                {formatSec(currentTime)} / {formatSec(duration)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.05}
              value={Math.min(currentTime, duration || 1)}
              onChange={(e) => {
                const t = parseFloat(e.target.value);
                if (audioRef.current) {
                  audioRef.current.currentTime = t;
                  setCurrentTime(t);
                }
              }}
              aria-label="Seek recording playback"
              className="w-full h-1.5 accent-[#0F4C45] cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Highlighted Transcript Canvas */}
      {transcript.trim() && (
        <div className="space-y-2">
          <div className="p-3.5 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/25 text-xs sm:text-sm leading-relaxed text-[#0E1F1E] dark:text-[#EEF3F1]">
            {analysis.tokens.map((tok, i) => {
              if (tok.kind === 'filler') {
                return (
                  <span
                    key={i}
                    title={tok.note}
                    className="px-1 py-0.5 rounded bg-[#FDF2F2] dark:bg-rose-950/70 text-[#B3261E] dark:text-rose-200 border-b-2 border-[#CC3333] font-bold"
                  >
                    {tok.text}
                  </span>
                );
              }
              if (tok.kind === 'repetitive') {
                return (
                  <span
                    key={i}
                    title={tok.note}
                    className="px-1 py-0.5 rounded bg-[#FEF6E8] dark:bg-amber-950/60 text-[#9B6314] dark:text-amber-200 border-b-2 border-[#D0891F] font-semibold"
                  >
                    {tok.text}
                  </span>
                );
              }
              if (tok.kind === 'marker') {
                return (
                  <span
                    key={i}
                    title={tok.note}
                    className="px-1 py-0.5 rounded bg-[#EEF3F1] dark:bg-[#0F4C45]/50 text-[#0F4C45] dark:text-emerald-200 border-b-2 border-[#1F8A70] font-bold"
                  >
                    {tok.text}
                  </span>
                );
              }
              return <React.Fragment key={i}>{tok.text}</React.Fragment>;
            })}
          </div>

          {/* Legend & Save Action */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#566664] dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#CC3333] inline-block" />
                <span>Filler / Hesitation</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#D0891F] inline-block" />
                <span>Overused Linker (3×+)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#1F8A70] inline-block" />
                <span>Band 8+ Marker</span>
              </span>
            </div>

            {(analysis.fillerCount > 0 || analysis.repetitiveCount > 0) && (
              <button
                type="button"
                onClick={handleSaveFillerTrap}
                disabled={savedToVault}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                  savedToVault
                    ? 'bg-[#EEF3F1] dark:bg-[#0F4C45]/40 text-[#0F4C45] dark:text-emerald-300 border-[#9EBEB8]'
                    : 'bg-white dark:bg-[#0B1514] hover:bg-[#EEF3F1] dark:hover:bg-[#182C29] text-[#0E1F1E] dark:text-[#EEF3F1] border-[#D3DDDA] dark:border-[#1F8A70]/35'
                }`}
              >
                {savedToVault ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved to Mistake Vault</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="w-3.5 h-3.5 text-[#0F4C45] dark:text-[#F4A62A]" />
                    <span>Save Filler Trap to Vault</span>
                  </>
                )}
              </button>
            )}
          </div>

          {analysis.fillerCount > 0 && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[#FEF6E8] dark:bg-amber-950/30 border border-[#F9D590] dark:border-amber-800/50 text-[11px] text-[#66410B] dark:text-amber-200">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#D0891F]" />
              <span>
                <strong>Coach Tip:</strong> Replace <em>{analysis.fillerWordsFound.slice(0, 3).join(', ')}</em> with a calm half-second breath pause or natural signposts like <em>“admittedly”</em>, <em>“predominantly”</em>, or <em>“from a broader perspective”</em>.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
