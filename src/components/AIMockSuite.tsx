import React, { useState, useEffect, useRef } from 'react';
import { Timer, Award, CheckCircle2, AlertTriangle, Sparkles, RefreshCw, Flame, BookOpen, Layers, Save, Volume2, VolumeX, Copy, Check, Headphones } from 'lucide-react';
import { ExamEvaluation } from '../types';
import { soundManager } from '../utils/audioEffects';
import { addMistake } from '../utils/vaultStorage';
import { speakBritish, stopSpeech } from '../utils/britishVoice';
import { checkWritingWordThreshold } from '../services/WritingEvaluationService';
import { checkSpeakingInputGate } from '../services/SpeakingEvaluationService';
import { getStoredSessionToken } from '../services/authService';
import {
  formatNullableBand,
  validateClientWritingEvaluation
} from '../utils/scoringIntegrity';

/**
 * Pure parser for /api/evaluate-writing responses used by AIMockSuite.
 * Strictly enforces the Phase 3B.1/3B.4 nullable Writing contract and NEVER fabricates fallback scores.
 */
export function parseAIMockWritingResponse(params: {
  httpOk: boolean;
  httpStatus: number;
  data: any;
  testType: 'task1' | 'task2' | 'speaking';
}): ExamEvaluation {
  const { httpOk, httpStatus, data, testType } = params;

  if (httpStatus === 401) {
    return {
      isValidAttempt: false,
      assessmentStatus: 'unavailable',
      overallBand: null,
      proficiencyTitle: 'Sign In Required for AI Evaluation',
      trScore: null,
      trComment: '',
      ccScore: null,
      ccComment: '',
      lrScore: null,
      lrComment: '',
      graScore: null,
      graComment: '',
      strengths: [],
      weaknesses: [],
      vocabUpgrades: [],
      grammaticalErrors: [],
      betterAnswerBand8: '',
      verdict: 'Please sign in to run a live AI Writing evaluation. No fallback band score was generated.',
      error: data?.error || 'Authentication required to evaluate writing. Please sign in.',
      canRetry: true
    };
  }

  if (!httpOk) {
    if (data?.assessmentStatus === 'insufficient_evidence') {
      return {
        isValidAttempt: false,
        assessmentStatus: 'insufficient_evidence',
        overallBand: null,
        proficiencyTitle: data?.proficiencyTitle || 'Submission Too Short or Unassessable',
        trScore: null,
        trComment: data?.trComment || data?.error || 'Insufficient writing evidence for IELTS evaluation.',
        ccScore: null,
        ccComment: data?.ccComment || '',
        lrScore: null,
        lrComment: '',
        graScore: null,
        graComment: '',
        strengths: [],
        weaknesses: Array.isArray(data?.weaknesses) ? data.weaknesses : [],
        vocabUpgrades: [],
        grammaticalErrors: [],
        betterAnswerBand8: '',
        verdict: data?.verdict || data?.error || 'Not assessed due to insufficient evidence.',
        error: data?.error,
        canRetry: false
      };
    }

    return {
      isValidAttempt: false,
      assessmentStatus: 'unavailable',
      overallBand: null,
      proficiencyTitle: 'AI Evaluation Temporarily Unavailable',
      trScore: null,
      trComment: '',
      ccScore: null,
      ccComment: '',
      lrScore: null,
      lrComment: '',
      graScore: null,
      graComment: '',
      strengths: [],
      weaknesses: [],
      vocabUpgrades: [],
      grammaticalErrors: [],
      betterAnswerBand8: '',
      verdict:
        data?.error ||
        `AI evaluation service responded with HTTP ${httpStatus}. No fallback IELTS band score was fabricated.`,
      error: data?.error || `AI evaluation service unavailable (HTTP ${httpStatus}).`,
      canRetry: true
    };
  }

  // Speaking transcript in AIMockSuite cannot receive an acoustic IELTS Writing/Speaking score via /api/evaluate-writing
  if (testType === 'speaking') {
    return {
      isValidAttempt: false,
      assessmentStatus: 'unavailable',
      overallBand: null,
      proficiencyTitle: 'Speaking Transcript Requires Speaking Studio',
      trScore: null,
      trComment: '',
      ccScore: null,
      ccComment: '',
      lrScore: null,
      lrComment: '',
      graScore: null,
      graComment: '',
      strengths: [],
      weaknesses: [],
      vocabUpgrades: [],
      grammaticalErrors: [],
      betterAnswerBand8: '',
      verdict:
        'Speaking transcripts cannot be scored through the Writing evaluator. Use the Speaking Lab for dedicated Speaking diagnostics.',
      error: 'Use Speaking Lab for Speaking assessments.',
      canRetry: false
    };
  }

  const validated = validateClientWritingEvaluation(data);
  if (!validated.valid || validated.overallBand === null) {
    const isInsufficient = validated.assessmentStatus === 'insufficient_evidence';
    return {
      isValidAttempt: false,
      assessmentStatus: isInsufficient ? 'insufficient_evidence' : 'unavailable',
      overallBand: null,
      proficiencyTitle: isInsufficient
        ? data?.proficiencyTitle || 'Submission Too Short or Unassessable'
        : 'AI Evaluation Could Not Be Verified',
      trScore: null,
      trComment: isInsufficient ? data?.trComment || validated.reason || '' : '',
      ccScore: null,
      ccComment: isInsufficient ? data?.ccComment || '' : '',
      lrScore: null,
      lrComment: '',
      graScore: null,
      graComment: '',
      strengths: [],
      weaknesses: Array.isArray(data?.weaknesses) ? data.weaknesses : [],
      vocabUpgrades: [],
      grammaticalErrors: [],
      betterAnswerBand8: '',
      verdict: validated.reason || data?.error || 'Writing evaluation unavailable. No fallback score was generated.',
      error: validated.reason || data?.error,
      canRetry: !isInsufficient
    };
  }

  return {
    isValidAttempt: true,
    assessmentStatus: 'evaluated',
    overallBand: validated.overallBand,
    proficiencyTitle:
      typeof data?.proficiencyTitle === 'string' && data.proficiencyTitle.trim()
        ? data.proficiencyTitle
        : validated.overallBand >= 8.0
        ? 'Very Good User'
        : validated.overallBand >= 7.0
        ? 'Good User'
        : validated.overallBand >= 6.0
        ? 'Competent User'
        : 'Developing User',
    trScore: validated.criteria.ta,
    trComment: typeof data?.trComment === 'string' ? data.trComment : '',
    ccScore: validated.criteria.cc,
    ccComment: typeof data?.ccComment === 'string' ? data.ccComment : '',
    lrScore: validated.criteria.lr,
    lrComment: typeof data?.lrComment === 'string' ? data.lrComment : '',
    graScore: validated.criteria.gra,
    graComment: typeof data?.graComment === 'string' ? data.graComment : '',
    strengths: Array.isArray(data?.strengths) ? data.strengths : [],
    weaknesses: Array.isArray(data?.weaknesses) ? data.weaknesses : [],
    vocabUpgrades: Array.isArray(data?.vocabUpgrades) ? data.vocabUpgrades : [],
    grammaticalErrors: Array.isArray(data?.grammaticalErrors) ? data.grammaticalErrors : [],
    betterAnswerBand8: typeof data?.betterAnswerBand8 === 'string' ? data.betterAnswerBand8 : '',
    verdict:
      typeof data?.verdict === 'string' && data.verdict.trim()
        ? data.verdict
        : `AI diagnostic writing assessment complete: Band ${validated.overallBand.toFixed(1)}.`,
    disclaimer:
      data?.disclaimer ||
      'AI diagnostic estimate aligned with IELTS descriptors. Not an official IELTS test result.'
  };
}

interface AIMockSuiteProps {
  initialPrompt?: string;
  initialText?: string;
  userApiKey?: string;
  onShowToast: (msg: string) => void;
}

export const AIMockSuite: React.FC<AIMockSuiteProps> = ({
  initialPrompt,
  initialText = '',
  onShowToast
}) => {
  const [testType, setTestType] = useState<'task2' | 'task1' | 'speaking'>('task2');
  const [prompt, setPrompt] = useState(initialPrompt || 'Some people believe that university education should be free for all citizens. To what extent do you agree or disagree?');
  const [essayText, setEssayText] = useState(initialText);
  const [timeLeft, setTimeLeft] = useState(40 * 60); // 40 mins
  const [timerActive, setTimerActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'heatmap' | 'evaluation'>('editor');
  const [isEvaluating, setIsEvaluating] = useState(false);
  // Keep attempt submission state strictly separate from verified AI evaluation completion state
  const [hasSubmittedAttempt, setHasSubmittedAttempt] = useState(false);
  const [evaluation, setEvaluation] = useState<ExamEvaluation | null>(null);

  const isWritingEvaluationComplete =
    evaluation?.assessmentStatus === 'evaluated' &&
    evaluation.isValidAttempt !== false &&
    typeof evaluation.overallBand === 'number' &&
    Number.isFinite(evaluation.overallBand);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync initialText if passed from VoiceExaminer or ArgumentMatrix
  useEffect(() => {
    if (initialText) {
      setEssayText(initialText);
    }
  }, [initialText]);

  // Timer logic
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setTimerActive(false);
            if (timerRef.current) clearInterval(timerRef.current);
            soundManager.playChimeTimeUp();
            onShowToast('Time is up for this mock session!');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive]);

  const setTestMode = (mode: 'task2' | 'task1' | 'speaking') => {
    setTestType(mode);
    setTimerActive(false);
    if (mode === 'task2') {
      setTimeLeft(40 * 60);
      setPrompt('Some people believe that university education should be free for all citizens. To what extent do you agree or disagree?');
    } else if (mode === 'task1') {
      setTimeLeft(20 * 60);
      setPrompt('The line graph delineates the proportion of electricity generated from renewable sources in Norway and Germany across a 24-year timeframe from 2000 to 2024. Summarize the information.');
    } else {
      setTimeLeft(15 * 60);
      setPrompt('Describe an ambitious project or goal you successfully achieved. Talk about what the goal was, what obstacles you overcame, and why it was memorable.');
    }
  };

  const wordCount = essayText.trim() ? essayText.trim().split(/\s+/).length : 0;
  const targetWords = testType === 'task2' ? 250 : testType === 'task1' ? 150 : 180;
  const isWordTargetMet = wordCount >= targetWords;

  // Syntax & Cohesion Heatmap Parser
  const parseHeatmap = () => {
    if (!essayText.trim()) return [];
    // Split into sentences
    const rawSentences = essayText.match(/[^.!?]+[.!?]+|\s*[^.!?]+/g) || [essayText];

    const linkers = ['furthermore', 'moreover', 'consequently', 'however', 'nevertheless', 'in contrast', 'on the other hand', 'hence', 'therefore', 'overall', 'specifically', 'in addition', 'subsequently'];
    const complexWords = ['although', 'while', 'whereas', 'because', 'since', 'despite', 'in spite of', 'provided that', 'unless', 'which', 'who', 'whose', 'whereby'];
    const compoundWords = [' and ', ' but ', ' or ', ' so ', ' yet '];

    return rawSentences.map((sent, idx) => {
      const lower = sent.toLowerCase();
      let type: 'simple' | 'compound' | 'complex' = 'simple';
      const hasComplex = complexWords.some(w => lower.includes(w));
      const hasCompound = compoundWords.some(w => lower.includes(w));

      if (hasComplex) {
        type = 'complex';
      } else if (hasCompound) {
        type = 'compound';
      }

      const foundLinkers = linkers.filter(l => lower.includes(l));

      return {
        id: idx,
        text: sent.trim(),
        type,
        foundLinkers
      };
    });
  };

  // Repeated words check
  const getRepetitions = () => {
    const words = essayText.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'that', 'this', 'it', 'as', 'by']);
    const counts: { [key: string]: number } = {};
    for (const w of words) {
      if (w.length > 3 && !stopWords.has(w)) {
        counts[w] = (counts[w] || 0) + 1;
      }
    }
    return Object.entries(counts).filter(([_, count]) => count >= 3).sort((a, b) => b[1] - a[1]);
  };

  // Live Server-Side AI Examiner Evaluation (Strictly fail-closed — ZERO local fallback IELTS scoring)
  const handleEvaluate = async () => {
    setHasSubmittedAttempt(true);

    if (testType === 'speaking') {
      const spkGate = checkSpeakingInputGate(essayText);
      const spkResult = !spkGate.isValidAttempt
        ? {
            isValidAttempt: false,
            assessmentStatus: 'insufficient_evidence' as const,
            overallBand: null,
            proficiencyTitle: spkGate.feedbackTitle,
            trScore: null,
            trComment: spkGate.feedbackEn,
            ccScore: null,
            ccComment: spkGate.feedbackBn,
            lrScore: null,
            lrComment: '',
            graScore: null,
            graComment: '',
            strengths: [],
            weaknesses: [spkGate.feedbackEn, spkGate.feedbackBn],
            vocabUpgrades: [],
            grammaticalErrors: [],
            betterAnswerBand8: '',
            verdict: `${spkGate.feedbackEn} ${spkGate.feedbackBn}`,
            canRetry: false
          }
        : parseAIMockWritingResponse({ httpOk: true, httpStatus: 200, data: {}, testType: 'speaking' });
      setEvaluation(spkResult);
      setActiveTab('evaluation');
      soundManager.playBeep(360, 0.1);
      return;
    }

    const wrtGate = checkWritingWordThreshold(essayText, testType === 'task1' ? 'task1' : 'task2');
    if (!wrtGate.isValidAttempt) {
      setEvaluation({
        isValidAttempt: false,
        assessmentStatus: 'insufficient_evidence',
        overallBand: null,
        proficiencyTitle: wrtGate.feedbackTitle,
        trScore: null,
        trComment: wrtGate.feedbackEn,
        ccScore: null,
        ccComment: wrtGate.feedbackBn,
        lrScore: null,
        lrComment: '',
        graScore: null,
        graComment: '',
        strengths: [],
        weaknesses: [wrtGate.feedbackEn, wrtGate.feedbackBn],
        vocabUpgrades: [],
        grammaticalErrors: [],
        betterAnswerBand8: '',
        verdict: `${wrtGate.feedbackEn} ${wrtGate.feedbackBn}`,
        canRetry: false
      });
      setActiveTab('evaluation');
      soundManager.playBeep(360, 0.1);
      return;
    }

    setIsEvaluating(true);
    soundManager.playBeep(580, 0.1);

    let result: ExamEvaluation;

    try {
      const token = getStoredSessionToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const resp = await fetch('/api/evaluate-writing', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          essayText,
          prompt,
          testType
        })
      });

      const data = await resp.json().catch(() => null);
      result = parseAIMockWritingResponse({
        httpOk: resp.ok,
        httpStatus: resp.status,
        data,
        testType
      });
    } catch {
      result = {
        isValidAttempt: false,
        assessmentStatus: 'unavailable',
        overallBand: null,
        proficiencyTitle: 'AI Evaluation Service Unreachable',
        trScore: null,
        trComment: '',
        ccScore: null,
        ccComment: '',
        lrScore: null,
        lrComment: '',
        graScore: null,
        graComment: '',
        strengths: [],
        weaknesses: [],
        vocabUpgrades: [],
        grammaticalErrors: [],
        betterAnswerBand8: '',
        verdict:
          'Unable to reach the AI Writing evaluation server. No fallback IELTS band score was fabricated. Your draft is preserved — please retry.',
        error: 'Network error reaching /api/evaluate-writing.',
        canRetry: true
      };
    }

    setEvaluation(result);
    setIsEvaluating(false);
    setActiveTab('evaluation');

    if (result.assessmentStatus === 'evaluated' && typeof result.overallBand === 'number') {
      soundManager.playSuccess();
      onShowToast(`AI Diagnostic Evaluation complete: Band ${result.overallBand.toFixed(1)}.`);
    } else {
      soundManager.playBeep(340, 0.09);
      onShowToast(result.error || 'Writing evaluation unavailable — no band score was generated.');
    }
  };

  const [isPlayingModelAudio, setIsPlayingModelAudio] = useState(false);
  const [copiedModelAnswer, setCopiedModelAnswer] = useState(false);
  const [savedVocabMap, setSavedVocabMap] = useState<Record<string, boolean>>({});
  const [savedGrammarErrorMap, setSavedGrammarErrorMap] = useState<Record<string, boolean>>({});

  const handleSaveUpgradeToVault = (item: { original: string; upgraded: string; explanation: string }, idx?: number) => {
    const key = typeof idx === 'number' ? `vocab_${idx}` : `vocab_${item.original}`;
    if (savedVocabMap[key]) return;
    addMistake({
      module: 'vocab',
      title: `Vocab Upgrade: "${item.original}" ➔ "${item.upgraded}"`,
      userAnswer: item.original,
      correctAnswer: item.upgraded,
      explanation: item.explanation,
      trapExplanationBn: `সাধারণ শব্দ "${item.original}" এর বদলে Band 8.5+ একাডেমিক শব্দ "${item.upgraded}" ব্যবহার করলে Lexical Resource স্কোর বাড়ে। (${item.explanation})`
    });
    setSavedVocabMap((prev) => ({ ...prev, [key]: true }));
    soundManager.playSuccess();
    onShowToast(`Queued "${item.upgraded}" into Daily Sprint & Mistake Vault!`);
  };

  const handlePlayModelAudio = (text: string) => {
    if (isPlayingModelAudio) {
      stopSpeech();
      setIsPlayingModelAudio(false);
      return;
    }
    stopSpeech();
    setIsPlayingModelAudio(true);
    soundManager.playBeep(620, 0.05);
    speakBritish(text, {
      speakerId: 'speaker_04',
      rate: 0.96,
      onEnd: () => setIsPlayingModelAudio(false),
      onError: () => setIsPlayingModelAudio(false)
    });
  };

  const handleCopyModelAnswer = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedModelAnswer(true);
    soundManager.playSuccess();
    onShowToast('Band 8.5+ Model Answer copied to clipboard!');
    setTimeout(() => setCopiedModelAnswer(false), 2000);
  };

  const handleSaveGrammarError = (err: { observed: string; corrected: string; explanation: string; ruleCategory?: string }, idx: number) => {
    if (savedGrammarErrorMap[`err_${idx}`]) return;
    addMistake({
      module: testType === 'speaking' ? 'speaking' : 'writing',
      title: `Grammar Correction: ${err.ruleCategory || 'Grammar Rule'}`,
      userAnswer: err.observed,
      correctAnswer: err.corrected,
      explanation: err.explanation,
      trapExplanationBn: `${err.ruleCategory || 'গ্রামার নিয়ম'}: "${err.observed}" এর সঠিক একাডেমিক রূপ হলো "${err.corrected}"। (${err.explanation})`
    });
    setSavedGrammarErrorMap(prev => ({ ...prev, [`err_${idx}`]: true }));
    soundManager.playSuccess();
    onShowToast(`Queued "${err.corrected}" into Daily Sprint & Mistake Vault!`);
  };

  const handlePushAllEvaluationFixesToSprint = () => {
    if (!evaluation) return;
    let added = 0;
    const nextVocab = { ...savedVocabMap };
    const nextGrammar = { ...savedGrammarErrorMap };

    (evaluation.vocabUpgrades || []).forEach((item, idx) => {
      const key = `vocab_${idx}`;
      if (!nextVocab[key]) {
        addMistake({
          module: 'vocab',
          title: `Vocab Upgrade: "${item.original}" ➔ "${item.upgraded}"`,
          userAnswer: item.original,
          correctAnswer: item.upgraded,
          explanation: item.explanation,
          trapExplanationBn: `সাধারণ শব্দ "${item.original}" এর বদলে Band 8.5+ একাডেমিক শব্দ "${item.upgraded}" ব্যবহার করলে Lexical Resource স্কোর বাড়ে। (${item.explanation})`
        });
        nextVocab[key] = true;
        added++;
      }
    });

    (evaluation.grammaticalErrors || []).forEach((err, idx) => {
      const key = `err_${idx}`;
      if (!nextGrammar[key]) {
        addMistake({
          module: testType === 'speaking' ? 'speaking' : 'writing',
          title: `Grammar Correction: ${err.ruleCategory || 'Grammar Rule'}`,
          userAnswer: err.observed,
          correctAnswer: err.corrected,
          explanation: err.explanation,
          trapExplanationBn: `${err.ruleCategory || 'গ্রামার নিয়ম'}: "${err.observed}" এর সঠিক একাডেমিক রূপ হলো "${err.corrected}"। (${err.explanation})`
        });
        nextGrammar[key] = true;
        added++;
      }
    });

    setSavedVocabMap(nextVocab);
    setSavedGrammarErrorMap(nextGrammar);

    if (added > 0) {
      soundManager.playSuccess();
      onShowToast(`Pushed ${added} upgrade${added > 1 ? 's' : ''} into your Daily Sprint & Mistake Vault.`);
    } else {
      onShowToast('All vocabulary upgrades & grammar fixes are already queued in your Daily Sprint.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" /> Practice Rubric Diagnostic & Gemini AI Examiner
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            Module 9: AI Mock Exam Suite with Syntax & Cohesion Heatmap
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Timed test station, live sentence complexity heatmap, and instant Band 1.0–9.0 rubric scoring.
          </p>
        </div>

        {/* Test Mode Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setTestMode('task2')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${testType === 'task2' ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}
          >
            Task 2 Essay (40m)
          </button>
          <button
            onClick={() => setTestMode('task1')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${testType === 'task1' ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}
          >
            Task 1 Report (20m)
          </button>
          <button
            onClick={() => setTestMode('speaking')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${testType === 'speaking' ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}
          >
            Speaking Transcript
          </button>
        </div>
      </div>

      {/* Timer & Word Count Bar */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          {/* Timer */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
              <Timer className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Test Clock</div>
              <div className="font-mono text-xl font-bold text-white">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
            </div>
            <button
              onClick={() => setTimerActive(!timerActive)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ml-2 ${timerActive ? 'bg-amber-500 text-slate-950' : 'bg-blue-600 text-white'}`}
            >
              {timerActive ? 'Pause' : 'Start Timer'}
            </button>
          </div>

          {/* Word Count */}
          <div className="flex items-center gap-3 border-l border-slate-800 pl-6">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Word Volume</div>
              <div className="font-mono text-xl font-bold text-white flex items-center gap-2">
                <span>{wordCount}</span>
                <span className="text-xs text-slate-400 font-normal">/ {targetWords} min</span>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isWordTargetMet ? 'bg-emerald-900 text-emerald-300 border border-emerald-600' : 'bg-rose-900 text-rose-300 border border-rose-600'}`}>
              {isWordTargetMet ? 'Threshold Met' : 'Underlength'}
            </span>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${activeTab === 'editor' ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-300 hover:text-white'}`}
          >
            Essay Editor
          </button>
          <button
            onClick={() => setActiveTab('heatmap')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${activeTab === 'heatmap' ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-300 hover:text-white'}`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Syntax Heatmap</span>
          </button>
          {evaluation && (
            <button
              onClick={() => setActiveTab('evaluation')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${activeTab === 'evaluation' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300 hover:text-white'}`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>
                {isWritingEvaluationComplete
                  ? `Scorecard (Band ${formatNullableBand(evaluation.overallBand)})`
                  : evaluation.assessmentStatus === 'unavailable'
                  ? 'Evaluation Unavailable'
                  : 'Unassessed Draft'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Editor Tab */}
      {activeTab === 'editor' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Assigned Exam Task Prompt:</span>
            <p className="text-sm font-serif font-bold text-slate-900 leading-relaxed">
              "{prompt}"
            </p>
          </div>

          <textarea
            value={essayText}
            onChange={(e) => setEssayText(e.target.value)}
            placeholder="Compose your response here. Type naturally or paste from Voice Examiner / PESTLE Argument Generator..."
            rows={14}
            className="w-full p-4 rounded-2xl border border-slate-200 font-serif text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 leading-relaxed"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div className="text-xs text-slate-500">
              <span className="text-blue-700 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Practice Set 4-Criteria Diagnostic Engine (TR · CC · LR · GRA)
              </span>
            </div>

            <button
              onClick={handleEvaluate}
              disabled={isEvaluating}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-700 to-blue-700 hover:from-indigo-800 hover:to-blue-800 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isEvaluating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Evaluating Rubric...</span>
                </>
              ) : (
                <>
                  <Award className="w-4 h-4" />
                  <span>Grade Essay & Generate Scorecard</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Syntax Heatmap Tab */}
      {activeTab === 'heatmap' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Grammar Complexity & Cohesion Visual Heatmap</h3>
            <p className="text-xs text-slate-500 mt-0.5">Examiners look for a balanced distribution of simple, compound, and complex sentence structures.</p>
          </div>

          <div className="flex flex-wrap gap-4 text-xs font-semibold p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-400 inline-block"></span> Simple Clauses</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-400 inline-block"></span> Compound (and, but, so)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-100 border border-purple-400 inline-block"></span> Complex (although, because, which)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-200 text-amber-950 inline-block text-[9px] text-center font-bold">L</span> Cohesive Linkers</span>
          </div>

          {/* Parsed Sentences List */}
          <div className="space-y-2">
            {parseHeatmap().map((s) => (
              <div
                key={s.id}
                className={`p-3 rounded-xl border text-xs sm:text-sm leading-relaxed transition ${
                  s.type === 'complex'
                    ? 'bg-purple-50/70 border-purple-200 text-purple-950'
                    : s.type === 'compound'
                    ? 'bg-blue-50/70 border-blue-200 text-blue-950'
                    : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono font-bold mb-1 opacity-70">
                  <span className="uppercase">{s.type} sentence</span>
                  {s.foundLinkers.length > 0 && (
                    <span className="bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">
                      Linkers: {s.foundLinkers.join(', ')}
                    </span>
                  )}
                </div>
                <span>{s.text}</span>
              </div>
            ))}
          </div>

          {/* Lexical Repetition Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Lexical Repetition Detector</h4>
            <div className="flex flex-wrap gap-2">
              {getRepetitions().length > 0 ? (
                getRepetitions().map(([word, count]) => (
                  <span key={word} className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-800 text-xs font-mono font-bold">
                    "{word}": {count}x
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">No repetitive words (3+ occurrences) detected. Good lexical variety!</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Evaluation Scorecard Tab */}
      {activeTab === 'evaluation' && evaluation && (
        <div className="space-y-6">
          {/* Overall Band Banner or Explicit Unassessed / Unavailable Card */}
          {!isWritingEvaluationComplete ? (
            <div
              className={`${
                evaluation.assessmentStatus === 'unavailable'
                  ? 'bg-amber-950 border-amber-500/40'
                  : 'bg-rose-950 border-rose-500/40'
              } text-white rounded-3xl p-6 sm:p-8 shadow-xl border-2 space-y-4`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                    evaluation.assessmentStatus === 'unavailable'
                      ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                      : 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                  }`}
                >
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <span
                    className={`text-xs font-bold uppercase tracking-widest font-mono ${
                      evaluation.assessmentStatus === 'unavailable' ? 'text-amber-300' : 'text-rose-300'
                    }`}
                  >
                    {evaluation.assessmentStatus === 'unavailable'
                      ? 'AI Evaluation Unavailable · No Band Assigned'
                      : 'Insufficient Evidence · Not Assessed (No Band Assigned)'}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-extrabold mt-0.5">{evaluation.proficiencyTitle}</h3>
                </div>
              </div>
              <p className="text-sm text-slate-100 leading-relaxed">
                {evaluation.trComment || evaluation.verdict}
              </p>
              {evaluation.ccComment && (
                <p className="text-xs text-slate-200 leading-relaxed pt-2 border-t border-white/15">
                  {evaluation.ccComment}
                </p>
              )}
              {hasSubmittedAttempt && (
                <p className="text-[11px] text-slate-300 font-mono">
                  Draft submitted ({wordCount} words) — evaluation status: Incomplete (not counted toward Full Mock scoring).
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                {evaluation.canRetry && (
                  <button
                    onClick={handleEvaluate}
                    disabled={isEvaluating}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md transition inline-flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${isEvaluating ? 'animate-spin' : ''}`} />
                    <span>Retry AI Evaluation</span>
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('editor')}
                  className="px-5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold shadow-md transition inline-flex items-center gap-2 cursor-pointer"
                >
                  <span>Return to Editor</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-400 font-mono">
                    AI Diagnostic Practice Scorecard
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold mt-1">{evaluation.proficiencyTitle}</h3>
                  <p className="text-xs sm:text-sm text-blue-200 mt-2 max-w-xl leading-relaxed">{evaluation.verdict}</p>
                </div>

                <div className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-3xl text-center shrink-0 w-36">
                  <span className="text-[11px] uppercase tracking-wider text-blue-200 font-bold block">Overall Band</span>
                  <span className="font-mono text-5xl font-black text-amber-300 my-1 block">
                    {formatNullableBand(evaluation.overallBand)}
                  </span>
                  <span className="text-[10px] text-emerald-300 font-semibold">Scale: 1.0 - 9.0</span>
                </div>
              </div>

              {/* 4 Criteria Sub-scores */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-slate-500">TR / TA</span>
                    <span className="font-mono text-lg font-black text-blue-700">{formatNullableBand(evaluation.trScore)}</span>
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm">Task Response</h5>
                  <p className="text-xs text-slate-600 leading-relaxed">{evaluation.trComment}</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-slate-500">CC</span>
                    <span className="font-mono text-lg font-black text-blue-700">{formatNullableBand(evaluation.ccScore)}</span>
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm">Coherence &amp; Cohesion</h5>
                  <p className="text-xs text-slate-600 leading-relaxed">{evaluation.ccComment}</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-slate-500">LR</span>
                    <span className="font-mono text-lg font-black text-blue-700">{formatNullableBand(evaluation.lrScore)}</span>
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm">Lexical Resource</h5>
                  <p className="text-xs text-slate-600 leading-relaxed">{evaluation.lrComment}</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-slate-500">GRA</span>
                    <span className="font-mono text-lg font-black text-blue-700">{formatNullableBand(evaluation.graScore)}</span>
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm">Grammatical Accuracy</h5>
                  <p className="text-xs text-slate-600 leading-relaxed">{evaluation.graComment}</p>
                </div>
              </div>
            </>
          )}

          {/* Strengths & Weaknesses */}
          {isWritingEvaluationComplete && (evaluation.strengths.length > 0 || evaluation.weaknesses.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl border border-emerald-200 p-6 shadow-sm space-y-3">
                <h4 className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Examiner Commendations (Strengths)
                </h4>
                <ul className="space-y-2 text-xs text-slate-700">
                  {evaluation.strengths.map((str, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5"></span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white rounded-3xl border border-rose-200 p-6 shadow-sm space-y-3">
                <h4 className="font-bold text-rose-900 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Priority Weaknesses to Fix for Next Band
                </h4>
                <ul className="space-y-2 text-xs text-slate-700">
                  {evaluation.weaknesses.map((w, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5"></span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Side-by-side Vocabulary Upgrades */}
          {isWritingEvaluationComplete && evaluation.vocabUpgrades.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-base">Examiner Vocabulary Upgrades</h4>
                  <p className="text-xs text-slate-500">Transform everyday phrases into Band 8.5+ academic collocations.</p>
                </div>
                <button
                  type="button"
                  onClick={handlePushAllEvaluationFixesToSprint}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Push All to Daily Sprint</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {evaluation.vocabUpgrades.map((item, idx) => {
                  const isSaved = !!savedVocabMap[`vocab_${idx}`];
                  return (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 flex flex-col justify-between">
                      <div>
                        <div className="text-xs text-slate-500 line-through">"{item.original}"</div>
                        <div className="font-bold text-indigo-900 text-sm mt-0.5">➔ "{item.upgraded}"</div>
                        <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">{item.explanation}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSaveUpgradeToVault(item, idx)}
                        disabled={isSaved}
                        className={`mt-3 text-xs font-bold flex items-center gap-1.5 pt-2 border-t border-slate-200 transition ${
                          isSaved
                            ? 'text-emerald-700 cursor-default'
                            : 'text-indigo-700 hover:text-indigo-900 cursor-pointer'
                        }`}
                      >
                        {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                        <span>{isSaved ? 'Queued in Daily Sprint' : 'Save to Vault & Sprint'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Examiner Grammatical Errors & Sentence Corrections */}
          {evaluation.grammaticalErrors && evaluation.grammaticalErrors.length > 0 && (
            <div className="bg-white rounded-3xl border border-rose-200 p-6 sm:p-8 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-base">
                    Examiner Grammatical Errors &amp; Corrections
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {evaluation.grammaticalErrors.length} issue{evaluation.grammaticalErrors.length > 1 ? 's' : ''} identified · Save directly to your Mistake Vault &amp; Daily Sprint queue.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePushAllEvaluationFixesToSprint}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Push All to Daily Sprint</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {evaluation.grammaticalErrors.map((err, idx) => {
                  const isSaved = !!savedGrammarErrorMap[`err_${idx}`];
                  return (
                    <div key={idx} className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200 space-y-2 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-200 text-rose-900">
                            {err.ruleCategory || 'Grammar Rule'}
                          </span>
                        </div>
                        <div className="text-xs text-rose-700 line-through font-mono">
                          "{err.observed}"
                        </div>
                        <div className="text-sm font-bold text-emerald-800 font-mono flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>"{err.corrected}"</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed pt-1">
                          {err.explanation}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSaveGrammarError(err, idx)}
                        disabled={isSaved}
                        className={`mt-3 text-xs font-bold flex items-center gap-1.5 pt-2 border-t border-rose-200 transition ${
                          isSaved
                            ? 'text-emerald-700 cursor-default'
                            : 'text-rose-700 hover:text-rose-900 cursor-pointer'
                        }`}
                      >
                        {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                        <span>{isSaved ? 'Queued in Daily Sprint' : 'Save to Vault & Sprint'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Band 8+ Benchmark Model Answer */}
          {evaluation.betterAnswerBand8 && (
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-5 border border-indigo-800/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-xs font-extrabold font-mono uppercase">
                      Band 8.5+ Benchmark
                    </span>
                    <span className="text-xs text-blue-200 font-mono">Senior Examiner Model</span>
                  </div>
                  <h4 className="text-lg sm:text-xl font-extrabold text-white mt-1">
                    Practice Better Answer Demonstration
                  </h4>
                  <p className="text-xs text-slate-300">
                    Observe high-level cohesive discourse, natural topic collocations, and grammatical range.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <button
                    onClick={() => handlePlayModelAudio(evaluation.betterAnswerBand8!)}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
                  >
                    {isPlayingModelAudio ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5" />
                        <span>Stop Audio</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Listen (British Voice)</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleCopyModelAnswer(evaluation.betterAnswerBand8!)}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition flex items-center gap-1.5 active:scale-95"
                  >
                    {copiedModelAnswer ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedModelAnswer ? 'Copied!' : 'Copy Model'}</span>
                  </button>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-xs sm:text-sm text-slate-200 leading-relaxed font-serif whitespace-pre-wrap">
                {evaluation.betterAnswerBand8}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
