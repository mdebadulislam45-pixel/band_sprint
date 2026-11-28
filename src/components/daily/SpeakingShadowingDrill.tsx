import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AudioWaveform,
  BookmarkPlus,
  Check,
  CheckCircle2,
  Loader2,
  Mic,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Volume2
} from 'lucide-react';
import { DailySpeakingConfidenceCard } from '../../data/dailyBanglaSprintData';
import { SpeechRecognitionService } from '../../services/SpeechRecognitionService';
import { audioManager } from '../../services/AudioManager';
import { addMistake } from '../../utils/vaultStorage';
import { speakBritish } from '../../utils/britishVoice';
import { getStoredSessionToken } from '../../services/authService';

export interface PronunciationWordIssue {
  word: string;
  observedIssue: string;
  ipaTarget: string;
  fixTipBn: string;
}

export interface AcousticPronunciationAudit {
  pronunciationBand: number;
  wordStressScore: number;
  intonationScore: number;
  claritySummaryEn: string;
  claritySummaryBn: string;
  band8TipEn: string;
  mispronouncedWords: PronunciationWordIssue[];
}

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

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error('Failed to encode audio recording.'));
    reader.readAsDataURL(blob);
  });
}

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
  const recordedBlobRef = useRef<Blob | null>(null);
  const timerRef = useRef<number | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [sttError, setSttError] = useState<string | null>(null);
  const [savedTrap, setSavedTrap] = useState(false);

  // Real AI Acoustic Pronunciation & Phoneme Audit State
  const [isAuditingPronunciation, setIsAuditingPronunciation] = useState(false);
  const [pronunciationAudit, setPronunciationAudit] = useState<AcousticPronunciationAudit | null>(null);
  const [pronunciationError, setPronunciationError] = useState<string | null>(null);
  const [savedPhonemeWords, setSavedPhonemeWords] = useState<Record<string, boolean>>({});

  const sttSupported = useMemo(() => new SpeechRecognitionService().checkSupport(), []);
  const micSupported = useMemo(
    () =>
      typeof navigator !== 'undefined' &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== 'undefined',
    []
  );

  useEffect(() => {
    setTranscript('');
    setInterimText('');
    setElapsedSec(0);
    setSttError(null);
    setSavedTrap(false);
    setPronunciationAudit(null);
    setPronunciationError(null);
    setSavedPhonemeWords({});
    recordedBlobRef.current = null;
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
    setPronunciationAudit(null);
    setPronunciationError(null);
    setSavedPhonemeWords({});
    setElapsedSec(0);
    setTranscript('');
    setInterimText('');
    recordedBlobRef.current = null;
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }

    let startedAnyCapture = false;

    if (sttSupported) {
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
        }
      });
      if (ok) startedAnyCapture = true;
    }

    // Real audio recording for playback + Gemini multimodal acoustic pronunciation audit
    try {
      if (micSupported) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
        const mr = preferredMime
          ? new MediaRecorder(stream, { mimeType: preferredMime })
          : new MediaRecorder(stream);
        chunksRef.current = [];
        mr.ondataavailable = (ev) => {
          if (ev.data.size > 0) chunksRef.current.push(ev.data);
        };
        mr.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          if (chunksRef.current.length > 0) {
            const finalMime = mr.mimeType || 'audio/webm';
            const blob = new Blob(chunksRef.current, { type: finalMime });
            recordedBlobRef.current = blob;
            setRecordedAudioUrl(URL.createObjectURL(blob));
          }
        };
        recorderRef.current = mr;
        mr.start();
        startedAnyCapture = true;
      }
    } catch {
      if (!startedAnyCapture) {
        setSttError('Microphone permission was denied or unavailable on this device.');
      }
    }

    if (startedAnyCapture) {
      setIsRecording(true);
      timerRef.current = window.setInterval(() => {
        setElapsedSec((prev) => prev + 1);
      }, 1000);
    }
  };

  const handleRunPronunciationAudit = async () => {
    const blob = recordedBlobRef.current;
    if (!blob || blob.size < 200) {
      setPronunciationError(
        'Record at least 3–5 seconds of your voice first so the AI examiner can inspect your real audio.'
      );
      return;
    }

    setIsAuditingPronunciation(true);
    setPronunciationError(null);
    audioManager.playUiClick('soft');

    try {
      const audioBase64 = await blobToBase64(blob);
      const token = getStoredSessionToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const resp = await fetch('/api/evaluate-pronunciation', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          audioBase64,
          mimeType: blob.type || 'audio/webm',
          transcript: `${transcript} ${interimText}`.trim(),
          targetPhrases: card.targetPhrases,
          prompt: `${card.topicTitle}: ${card.cuePrompt}`
        })
      });

      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data?.ok || typeof data.pronunciationBand !== 'number') {
        setPronunciationAudit(null);
        setPronunciationError(
          data?.error ||
            'AI acoustic pronunciation evaluation is unavailable right now. No score was generated.'
        );
        return;
      }

      setPronunciationAudit({
        pronunciationBand: data.pronunciationBand,
        wordStressScore: Number(data.wordStressScore) || 0,
        intonationScore: Number(data.intonationScore) || 0,
        claritySummaryEn: data.claritySummaryEn || '',
        claritySummaryBn: data.claritySummaryBn || '',
        band8TipEn: data.band8TipEn || '',
        mispronouncedWords: Array.isArray(data.mispronouncedWords) ? data.mispronouncedWords : []
      });
      onShowToast?.(`Acoustic Pronunciation Band ${data.pronunciationBand.toFixed(1)} audited!`);
    } catch {
      setPronunciationAudit(null);
      setPronunciationError(
        'Unable to reach the pronunciation audit server. Your recording is preserved — please retry.'
      );
    } finally {
      setIsAuditingPronunciation(false);
    }
  };

  const handleSavePhonemeTrap = (issue: PronunciationWordIssue) => {
    if (savedPhonemeWords[issue.word]) return;
    addMistake({
      module: 'speaking',
      title: `Pronunciation & IPA: "${issue.word}" ${issue.ipaTarget}`,
      prompt: card.cuePrompt,
      questionType: 'Phoneme & Word Stress Audit',
      userAnswer: issue.observedIssue,
      userWrongAnswer: issue.observedIssue,
      correctAnswer: `${issue.word} ${issue.ipaTarget}`,
      explanation: `Target RP pronunciation ${issue.ipaTarget}. Observed issue: ${issue.observedIssue}`,
      trapExplanationEn: `Stress and articulate "${issue.word}" as ${issue.ipaTarget}.`,
      trapExplanationBn: issue.fixTipBn
    });
    setSavedPhonemeWords((prev) => ({ ...prev, [issue.word]: true }));
    audioManager.playUiClick('check');
    onShowToast?.(`Saved "${issue.word}" IPA drill to Mistake Vault & Daily Sprint!`);
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

  const canRecord = sttSupported || micSupported;

  return (
    <div
      data-testid="speaking-shadowing-drill"
      className="p-4 sm:p-5 rounded-2xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/35 space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D3DDDA]/60 dark:border-[#1F8A70]/25">
        <div className="space-y-0.5">
          <div className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#0F4C45] dark:text-[#6EE7B7]">
            1-Tap Active Mic Shadowing &amp; AI Phoneme Audit
          </div>
          <p className="text-xs text-[#566664] dark:text-slate-400">
            Record your Band 8.5 opener aloud — checks WPM pace, fillers, C1 targets, and runs live Gemini acoustic pronunciation &amp; IPA scoring.
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
              disabled={!canRecord}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5 text-[#F4A62A]" />
              <span>{combinedText || recordedAudioUrl ? 'Re-Record Shadowing' : '1-Tap Record & Check'}</span>
            </button>
          )}

          {(combinedText || recordedAudioUrl) && !isRecording && (
            <button
              type="button"
              onClick={() => {
                setTranscript('');
                setElapsedSec(0);
                setSavedTrap(false);
                setPronunciationAudit(null);
                setPronunciationError(null);
                recordedBlobRef.current = null;
                if (recordedAudioUrl) {
                  URL.revokeObjectURL(recordedAudioUrl);
                  setRecordedAudioUrl(null);
                }
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

      {(!canRecord || sttError) && (
        <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-500/35 text-xs text-amber-900 dark:text-amber-200">
          {sttError || 'Live browser microphone capture is unavailable in this environment — type or paste a quick practice response below to test your C1 phrase coverage & filler check.'}
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

        {recordedAudioUrl && !isRecording && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Volume2 className="w-4 h-4 text-[#0F4C45] dark:text-[#6EE7B7] shrink-0" />
              <span className="text-[11px] font-semibold text-[#566664] dark:text-slate-300 shrink-0">
                Your Audio:
              </span>
              <audio controls src={recordedAudioUrl} className="h-8 flex-1 min-w-0" />
            </div>

            <button
              type="button"
              data-testid="run-pronunciation-audit-btn"
              onClick={handleRunPronunciationAudit}
              disabled={isAuditingPronunciation}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#F4A62A] hover:bg-[#d98f1d] disabled:opacity-60 text-[#0E1F1E] text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isAuditingPronunciation ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <AudioWaveform className="w-3.5 h-3.5" />
              )}
              <span>
                {isAuditingPronunciation ? 'Auditing Audio…' : 'AI Pronunciation & IPA Audit'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Explicit Acoustic Error Banner (Never Fabricates Scores) */}
      {pronunciationError && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-500/35 text-xs text-rose-800 dark:text-rose-200">
          {pronunciationError}
        </div>
      )}

      {/* Real Gemini Acoustic Pronunciation & Phoneme Scorecard */}
      {pronunciationAudit && (
        <div
          data-testid="acoustic-pronunciation-scorecard"
          className="p-4 rounded-xl bg-white dark:bg-[#11201E] border border-[#0F4C45]/40 dark:border-[#1F8A70]/45 space-y-3.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EEF3F1] dark:border-[#1F8A70]/25">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#F4A62A]" />
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#0F4C45] dark:text-[#6EE7B7]">
                  Acoustic Pronunciation &amp; Phoneme Report
                </div>
                <div className="text-[11px] text-[#566664] dark:text-slate-400">
                  Evaluated directly from your microphone recording
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 font-mono tabular-nums text-xs">
              <div className="text-right">
                <div className="text-[10px] text-[#566664] dark:text-slate-400">Band</div>
                <div className="text-base font-bold text-[#0F4C45] dark:text-[#F4A62A]">
                  {pronunciationAudit.pronunciationBand.toFixed(1)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-[#566664] dark:text-slate-400">Stress</div>
                <div className="text-sm font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                  {pronunciationAudit.wordStressScore}%
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-[#566664] dark:text-slate-400">Intonation</div>
                <div className="text-sm font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                  {pronunciationAudit.intonationScore}%
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 text-xs">
            <p className="text-[#0E1F1E] dark:text-[#EEF3F1] leading-relaxed">
              {pronunciationAudit.claritySummaryEn}
            </p>
            {pronunciationAudit.claritySummaryBn && (
              <p className="text-[#0F4C45] dark:text-[#6EE7B7] font-medium leading-relaxed">
                <strong>বাংলা উচ্চারণ বিশ্লেষণ:</strong> {pronunciationAudit.claritySummaryBn}
              </p>
            )}
          </div>

          {pronunciationAudit.mispronouncedWords.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#566664] dark:text-slate-400">
                Phoneme &amp; Word Stress Targets
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {pronunciationAudit.mispronouncedWords.map((item) => {
                  const isSaved = Boolean(savedPhonemeWords[item.word]);
                  return (
                    <div
                      key={item.word}
                      className="p-3 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                          {item.word}{' '}
                          <span className="font-mono text-[11px] font-semibold text-[#0F4C45] dark:text-[#F4A62A]">
                            {item.ipaTarget}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => speakBritish(item.word, { rate: 0.88 })}
                          className="p-1.5 rounded-lg bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-[#0F4C45] dark:text-[#6EE7B7] cursor-pointer"
                          title={`Hear British RP pronunciation of ${item.word}`}
                          aria-label={`Listen to ${item.word}`}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[11px] text-[#566664] dark:text-slate-300">
                        {item.observedIssue}
                      </p>
                      <p className="text-[11px] text-[#0F4C45] dark:text-[#6EE7B7] font-medium">
                        {item.fixTipBn}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleSavePhonemeTrap(item)}
                        disabled={isSaved}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[#0F4C45] dark:text-[#F4A62A] hover:underline disabled:opacity-60 cursor-pointer"
                      >
                        {isSaved ? <Check className="w-3 h-3" /> : <BookmarkPlus className="w-3 h-3" />}
                        <span>{isSaved ? 'Saved to Daily Sprint' : 'Save Phoneme Trap to Sprint'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {pronunciationAudit.band8TipEn && (
            <div className="p-2.5 rounded-lg bg-[#EEF3F1] dark:bg-[#0B1514] text-[11px] text-[#0E1F1E] dark:text-slate-200">
              <strong className="text-[#0F4C45] dark:text-[#F4A62A]">Band 8+ Upgrade:</strong>{' '}
              {pronunciationAudit.band8TipEn}
            </div>
          )}
        </div>
      )}

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
