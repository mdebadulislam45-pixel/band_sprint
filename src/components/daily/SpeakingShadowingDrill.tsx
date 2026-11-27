import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookmarkPlus,
  Check,
  CheckCircle2,
  Mic,
  Play,
  RotateCcw,
  Square,
  Volume2
} from 'lucide-react';
import { DailySpeakingConfidenceCard } from '../../data/dailyBanglaSprintData';
import { SpeechRecognitionService } from '../../services/SpeechRecognitionService';
import { audioManager } from '../../services/AudioManager';
import { addMistake } from '../../utils/vaultStorage';

export interface ShadowingAnalysisResult {
  wordCount: number;
  wpm: number;
  fillerCount: number;
  fillerWordsFound: string[];
  matchedPhrases: string[];
  missedPhrases: string[];
  paceLabel: 'Too Slow' | 'Optimal Band 8+' | 'Rushed' | 'Short Sample';
  banglaFeedback: string;
}

const SHADOWING_FILLERS = new Set([
  'um',
  'uh',
  'umm',
  'uhh',
  'er',
  'erm',
  'like',
  'basically',
  'actually',
  'literally'
]);

export function analyzeSpeakingShadowing(
  transcript: string,
  durationSec: number,
  targetPhrases: string[]
): ShadowingAnalysisResult {
  const clean = transcript.trim();
  const words = clean
    ? clean
        .toLowerCase()
        .replace(/[^a-z'\s-]/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
    : [];
  const wordCount = words.length;
  const safeSecs = Math.max(4, durationSec || Math.max(10, Math.round((wordCount / 130) * 60)));
  const wpm = wordCount >= 4 ? Math.round((wordCount / safeSecs) * 60) : 0;

  const fillerCounts: string[] = [];
  const uniqueFillers = new Set<string>();
  for (const w of words) {
    if (SHADOWING_FILLERS.has(w)) {
      fillerCounts.push(w);
      uniqueFillers.add(w);
    }
  }
  const fillerCount = fillerCounts.length;
  const fillerWordsFound = Array.from(uniqueFillers);

  const lowerFull = clean.toLowerCase();
  const matchedPhrases: string[] = [];
  const missedPhrases: string[] = [];
  for (const phrase of targetPhrases) {
    const cleanPhrase = phrase.trim().toLowerCase();
    if (!cleanPhrase) continue;
    const headWord = cleanPhrase.split(/\s+/).slice(0, 2).join(' ');
    if (lowerFull.includes(cleanPhrase) || (headWord.length >= 5 && lowerFull.includes(headWord))) {
      matchedPhrases.push(phrase);
    } else {
      missedPhrases.push(phrase);
    }
  }

  let paceLabel: ShadowingAnalysisResult['paceLabel'] = 'Short Sample';
  if (wordCount >= 12) {
    if (wpm < 100) paceLabel = 'Too Slow';
    else if (wpm > 168) paceLabel = 'Rushed';
    else paceLabel = 'Optimal Band 8+';
  }

  let banglaFeedback = '';
  if (wordCount < 10) {
    banglaFeedback =
      'অন্তত ২০–৩০ সেকেন্ড পূর্ণ বাক্যে কথা বলুন এবং টার্গেট C1 ফ্রেজগুলো ব্যবহার করুন।';
  } else if (fillerCount > 2) {
    banglaFeedback = `${fillerCount}টি hesitation filler ("${fillerWordsFound.slice(0, 2).join(', ')}") ধরা পড়েছে। কথার মাঝে চুপচাপ আধা সেকেন্ড শ্বাস নিন, কিন্তু "um/like" বলবেন না।`;
  } else if (paceLabel === 'Too Slow') {
    banglaFeedback = `গতি একটু কম (${wpm} WPM)। মডেল অডিওর সাথে ছন্দ মিলিয়ে আরেকটু সাবলীলভাবে (১১৫–১৫০ WPM) বলার চেষ্টা করুন।`;
  } else if (paceLabel === 'Rushed') {
    banglaFeedback = `কথার গতি বেশ দ্রুত (${wpm} WPM)। শব্দগুলো স্পষ্ট করে শেষ করুন যেন উচ্চারণের স্বচ্ছতা বজায় থাকে।`;
  } else if (missedPhrases.length > 0) {
    banglaFeedback = `গতি চমৎকার (${wpm} WPM)! পরের বারে "${missedPhrases[0]}" ফ্রেজটি উত্তরটিতে যোগ করলে Lexical স্কোর আরও বাড়বে।`;
  } else {
    banglaFeedback = `অসাধারণ সাবলীলতা (${wpm} WPM) এবং সবগুলো C1 ফ্রেজ সঠিকভাবে ব্যবহৃত হয়েছে!`;
  }

  return {
    wordCount,
    wpm,
    fillerCount,
    fillerWordsFound,
    matchedPhrases,
    missedPhrases,
    paceLabel,
    banglaFeedback
  };
}

interface SpeakingShadowingDrillProps {
  card: DailySpeakingConfidenceCard;
  onShowToast?: (msg: string) => void;
}

export const SpeakingShadowingDrill: React.FC<SpeakingShadowingDrillProps> = ({
  card,
  onShowToast
}) => {
  const sttRef = useRef<SpeechRecognitionService | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [sttError, setSttError] = useState<string | null>(null);
  const [savedTrap, setSavedTrap] = useState(false);

  const sttSupported = useMemo(() => new SpeechRecognitionService().checkSupport(), []);

  useEffect(() => {
    setTranscript('');
    setInterimText('');
    setElapsedSec(0);
    setSttError(null);
    setSavedTrap(false);
    setRecordedAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [card.id]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      sttRef.current?.stopListening(true);
      try {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
          recorderRef.current.stop();
        }
      } catch {}
    };
  }, []);

  const stopRecording = () => {
    setIsRecording(false);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    sttRef.current?.stopListening(true);
    setInterimText('');
    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
    } catch {}
    audioManager.playUiClick('soft');
  };

  const startRecording = async () => {
    audioManager.playUiClick('check');
    setSttError(null);
    setSavedTrap(false);
    setElapsedSec(0);
    setTranscript('');
    setInterimText('');
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }

    const svc = new SpeechRecognitionService();
    sttRef.current = svc;
    const ok = svc.startListening({
      onInterimResult: (txt) => setInterimText(txt),
      onFinalResult: (txt) => {
        setTranscript(txt);
        setInterimText('');
      },
      onError: (errMsg) => {
        setSttError(errMsg);
        setIsRecording(false);
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    });

    if (!ok) {
      return;
    }

    setIsRecording(true);
    timerRef.current = window.setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);

    // Optional MediaRecorder capture so learner can hear their own voice back
    try {
      if (typeof MediaRecorder !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(stream);
        chunksRef.current = [];
        mr.ondataavailable = (ev) => {
          if (ev.data.size > 0) chunksRef.current.push(ev.data);
        };
        mr.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          if (chunksRef.current.length > 0) {
            const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
            setRecordedAudioUrl(URL.createObjectURL(blob));
          }
        };
        recorderRef.current = mr;
        mr.start();
      }
    } catch {
      // SpeechRecognition works independently even if second stream is unavailable
    }
  };

  const combinedText = `${transcript} ${interimText}`.trim();
  const analysis = useMemo(
    () => analyzeSpeakingShadowing(combinedText, elapsedSec, card.targetPhrases),
    [card.targetPhrases, combinedText, elapsedSec]
  );

  const handleSaveFluencyGap = () => {
    if (savedTrap) return;
    const focusPhrase = analysis.missedPhrases[0] || card.targetPhrases[0] || 'C1 discourse opener';
    addMistake({
      module: 'speaking',
      title: `Speaking Shadowing · ${card.topicTitle} (${focusPhrase})`,
      prompt: card.cuePrompt,
      questionType: 'Fluency & Target C1 Phrase Drill',
      userAnswer: combinedText.slice(0, 240) || `Fillers: ${analysis.fillerCount}, Missed: ${focusPhrase}`,
      userWrongAnswer: combinedText.slice(0, 240) || 'Missed target phrase or used hesitation fillers',
      correctAnswer: card.band8OpenerEnglish,
      explanation: `Recorded ${analysis.wordCount} words (${analysis.wpm} WPM, ${analysis.fillerCount} fillers). Practise weaving "${focusPhrase}" naturally.`,
      trapExplanationEn: `Target ${card.targetPhrases.join(', ')} while keeping WPM around 120–150 without hesitation fillers.`,
      trapExplanationBn: analysis.banglaFeedback
    });
    setSavedTrap(true);
    audioManager.playUiClick('check');
    onShowToast?.('Saved speaking drill feedback to Mistake Vault & Daily Sprint Review!');
  };

  return (
    <div
      data-testid="speaking-shadowing-drill"
      className="p-4 sm:p-5 rounded-2xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/35 space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D3DDDA]/60 dark:border-[#1F8A70]/25">
        <div className="space-y-0.5">
          <div className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#0F4C45] dark:text-[#6EE7B7]">
            1-Tap Active Mic Shadowing &amp; Fluency Check
          </div>
          <p className="text-xs text-[#566664] dark:text-slate-400">
            Shadow the Band 8.5 opener aloud or give your 30-second answer — checks WPM pace, hesitation fillers, and C1 phrase usage.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isRecording ? (
            <button
              type="button"
              data-testid="shadowing-stop-btn"
              onClick={stopRecording}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span className="font-mono tabular-nums">Stop ({elapsedSec}s)</span>
            </button>
          ) : (
            <button
              type="button"
              data-testid="shadowing-record-btn"
              onClick={startRecording}
              disabled={!sttSupported}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5 text-[#F4A62A]" />
              <span>{combinedText ? 'Re-Record Shadowing' : '1-Tap Record & Check'}</span>
            </button>
          )}

          {combinedText && !isRecording && (
            <button
              type="button"
              onClick={() => {
                setTranscript('');
                setElapsedSec(0);
                setSavedTrap(false);
              }}
              className="min-h-[42px] px-3 py-2 rounded-xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-xs font-semibold text-[#566664] dark:text-slate-300 inline-flex items-center gap-1 cursor-pointer"
              aria-label="Reset speaking drill"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {(!sttSupported || sttError) && (
        <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-500/35 text-xs text-amber-900 dark:text-amber-200">
          {sttError || 'Live browser Speech Recognition is unavailable in this environment — type or paste a quick practice response below to test your C1 phrase coverage & filler check.'}
        </div>
      )}

      {/* Transcript / Typed Practice Area */}
      <div className="space-y-2">
        <textarea
          value={isRecording ? combinedText : transcript}
          onChange={(e) => {
            if (!isRecording) setTranscript(e.target.value);
          }}
          rows={3}
          placeholder={`Speak with the mic or type your opening for "${card.topicTitle}" using: ${card.targetPhrases.join(', ')}...`}
          className="w-full p-3 rounded-xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-xs sm:text-sm text-[#0E1F1E] dark:text-[#EEF3F1] focus:outline-none focus:ring-2 focus:ring-[#0F4C45]"
        />

        {recordedAudioUrl && (
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30">
            <Volume2 className="w-4 h-4 text-[#0F4C45] dark:text-[#6EE7B7] shrink-0" />
            <span className="text-[11px] font-semibold text-[#566664] dark:text-slate-300 shrink-0">
              Your Recording:
            </span>
            <audio controls src={recordedAudioUrl} className="h-8 flex-1 min-w-0" />
          </div>
        )}
      </div>

      {/* Live Fluency & Target Phrase Telemetry */}
      {combinedText && (
        <div className="space-y-3 pt-1">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-mono tabular-nums text-[#0E1F1E] dark:text-[#EEF3F1]">
            <span>
              Words: <strong>{analysis.wordCount}</strong>
            </span>
            <span aria-hidden="true" className="text-[#D3DDDA]">·</span>
            <span>
              Pace: <strong>{analysis.wpm > 0 ? `${analysis.wpm} WPM` : '—'}</strong> ({analysis.paceLabel})
            </span>
            <span aria-hidden="true" className="text-[#D3DDDA]">·</span>
            <span className={analysis.fillerCount > 0 ? 'text-rose-700 dark:text-rose-300 font-bold' : 'text-emerald-700 dark:text-emerald-300 font-bold'}>
              Fillers: {analysis.fillerCount}
            </span>
            <span aria-hidden="true" className="text-[#D3DDDA]">·</span>
            <span className="text-[#0F4C45] dark:text-[#6EE7B7] font-bold">
              C1 Targets: {analysis.matchedPhrases.length}/{card.targetPhrases.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {card.targetPhrases.map((phrase) => {
              const hit = analysis.matchedPhrases.includes(phrase);
              return (
                <span
                  key={phrase}
                  className={`inline-flex items-center gap-1 font-medium ${
                    hit
                      ? 'text-emerald-700 dark:text-emerald-300 font-bold'
                      : 'text-[#566664] dark:text-slate-400'
                  }`}
                >
                  {hit ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Play className="w-3 h-3 opacity-50" />}
                  <span>{phrase}</span>
                </span>
              );
            })}
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-[#11201E] border border-[#1F8A70]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <p className="text-[#0F4C45] dark:text-[#6EE7B7] font-medium leading-relaxed">
              <strong>বাংলা কোচ:</strong> {analysis.banglaFeedback}
            </p>
            <button
              type="button"
              onClick={handleSaveFluencyGap}
              disabled={savedTrap}
              className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[#EEF3F1] dark:bg-[#0B1514] hover:bg-[#D3DDDA] disabled:opacity-60 text-[#0F4C45] dark:text-[#6EE7B7] font-bold inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              {savedTrap ? <Check className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
              <span>{savedTrap ? 'Queued in Daily Sprint' : 'Save to Daily Sprint'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
