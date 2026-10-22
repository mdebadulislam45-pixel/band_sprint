import React, { useState } from 'react';
import {
  Sparkles,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Save,
  BookOpen,
  Award,
  Clock,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Headphones,
  Flame,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { InstantSpeakingFeedback, DetailedGrammarError } from '../../types/speakingTypes';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';
import { addMistake } from '../../utils/vaultStorage';

interface InstantSpeakingFeedbackModalProps {
  feedback: InstantSpeakingFeedback;
  isOpen: boolean;
  onClose: () => void;
  onNextQuestion?: () => void;
  onRetakeTurn?: () => void;
  nextActionLabel?: string;
  isFinalTurn?: boolean;
  onShowToast: (msg: string) => void;
}

export const InstantSpeakingFeedbackModal: React.FC<InstantSpeakingFeedbackModalProps> = ({
  feedback,
  isOpen,
  onClose,
  onNextQuestion,
  onRetakeTurn,
  nextActionLabel = 'Next Question →',
  isFinalTurn = false,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'errors' | 'pronunciation' | 'model'>('model');
  const [isPlayingModelAudio, setIsPlayingModelAudio] = useState(false);
  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const [savedErrors, setSavedErrors] = useState<Record<string, boolean>>({});

  if (!isOpen || !feedback) return null;

  const handlePlayModelAnswer = () => {
    if (isPlayingModelAudio) {
      stopSpeech();
      setIsPlayingModelAudio(false);
      return;
    }

    soundManager.playBeep(640, 0.05);
    setIsPlayingModelAudio(true);

    const textToRead = feedback.band8Answer.modelAnswer;
    speakBritish(textToRead, {
      speakerId: 'speaker_04', // Arthur (British Examiner Fenrir)
      rate: 0.96,
      onEnd: () => setIsPlayingModelAudio(false),
      onError: () => setIsPlayingModelAudio(false)
    });
  };

  const handlePlayWordPronunciation = (word: string) => {
    soundManager.playBeep(700, 0.05);
    setPlayingWord(word);
    speakBritish(word, {
      speakerId: 'speaker_04',
      rate: 0.85,
      onEnd: () => setPlayingWord(null),
      onError: () => setPlayingWord(null)
    });
  };

  const handleSaveGrammarError = (err: DetailedGrammarError, idx: number) => {
    const key = `err_${idx}_${err.observed}`;
    if (savedErrors[key]) return;

    addMistake({
      module: 'speaking',
      title: `Speaking Grammar: ${err.ruleCategory}`,
      userAnswer: err.observed,
      correctAnswer: err.corrected,
      explanation: err.explanation
    });

    setSavedErrors(prev => ({ ...prev, [key]: true }));
    soundManager.playSuccess();
    onShowToast(`Saved grammar rule to Mistake Vault!`);
  };

  const handleModalClose = () => {
    stopSpeech();
    setIsPlayingModelAudio(false);
    onClose();
  };

  const bands = feedback.estimatedBands;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 shrink-0 relative">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black uppercase tracking-wide">
                  <Zap className="w-3 h-3 fill-slate-950" />
                  INSTANT FEEDBACK · BAND 8+ COACH
                </span>
                <span className="text-xs text-indigo-200 font-mono">
                  Part {feedback.part} · {feedback.topic}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-1 leading-snug">
                "{feedback.questionText}"
              </h2>
            </div>

            <button
              onClick={handleModalClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition shrink-0"
              title="Close Feedback"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Score Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-4 mt-2 border-t border-white/10 text-center">
            <div className="p-2 rounded-xl bg-white/10 border border-white/10">
              <div className="text-[10px] text-indigo-200 uppercase font-bold">Overall Band</div>
              <div className="text-base sm:text-lg font-black text-amber-300 font-mono">
                {bands.overall.toFixed(1)}
              </div>
            </div>
            <div className="p-2 rounded-xl bg-white/10 border border-white/10">
              <div className="text-[10px] text-indigo-200 uppercase font-bold">Fluency & Coherence</div>
              <div className="text-sm sm:text-base font-bold text-white font-mono">
                {bands.fluency.toFixed(1)}
              </div>
            </div>
            <div className="p-2 rounded-xl bg-white/10 border border-white/10">
              <div className="text-[10px] text-indigo-200 uppercase font-bold">Lexical Resource</div>
              <div className="text-sm sm:text-base font-bold text-white font-mono">
                {bands.lexical.toFixed(1)}
              </div>
            </div>
            <div className="p-2 rounded-xl bg-white/10 border border-white/10">
              <div className="text-[10px] text-indigo-200 uppercase font-bold">Grammar Accuracy</div>
              <div className="text-sm sm:text-base font-bold text-white font-mono">
                {bands.grammar.toFixed(1)}
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1 p-2 rounded-xl bg-white/10 border border-white/10">
              <div className="text-[10px] text-indigo-200 uppercase font-bold">Pronunciation</div>
              <div className="text-sm sm:text-base font-bold text-emerald-300 font-mono">
                {bands.pronunciation.toFixed(1)}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-3 shrink-0 gap-2 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('model');
              soundManager.playBeep(600, 0.04);
            }}
            className={`pb-2.5 px-3.5 text-xs font-extrabold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'model'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Better Answer (Band 8.5+)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('errors');
              soundManager.playBeep(600, 0.04);
            }}
            className={`pb-2.5 px-3.5 text-xs font-extrabold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'errors'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <span>Grammar Errors & Corrections</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              feedback.grammaticalErrors.length > 0 ? 'bg-rose-100 text-rose-700 font-bold' : 'bg-slate-200 text-slate-600'
            }`}>
              {feedback.grammaticalErrors.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('pronunciation');
              soundManager.playBeep(600, 0.04);
            }}
            className={`pb-2.5 px-3.5 text-xs font-extrabold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'pronunciation'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Headphones className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pronunciation & Stress</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Candidate Spoken Transcript Strip */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <span>Your Spoken Answer</span>
              <span className="font-mono text-slate-600">
                {feedback.wordCount} words · {feedback.wordsPerMinute} WPM
              </span>
            </div>
            <p className="font-medium text-slate-900 leading-relaxed italic">
              "{feedback.candidateTranscript}"
            </p>
          </div>

          {/* TAB 1: BETTER ANSWER BAND 8+ */}
          {activeTab === 'model' && (
            <div className="space-y-4 animate-fade-in">
              {/* Model Header & Audio Player */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-blue-50/60 to-purple-50/80 border border-indigo-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-200/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-700 text-white font-mono text-xs font-extrabold">
                      Band {feedback.band8Answer.bandScore.toFixed(1)} Model Response
                    </span>
                    <span className="text-[11px] text-indigo-700 font-bold">
                      🇬🇧 British Received Pronunciation
                    </span>
                  </div>

                  <button
                    onClick={handlePlayModelAnswer}
                    className={`min-h-[38px] px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs ${
                      isPlayingModelAudio
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {isPlayingModelAudio ? (
                      <>
                        <VolumeX className="w-4 h-4 animate-pulse" />
                        <span>Stop Audio</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4" />
                        <span>Listen to Band 8+ Answer</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-xs sm:text-sm text-slate-900 font-serif leading-relaxed space-y-2 select-text">
                  <p className="whitespace-pre-wrap">{feedback.band8Answer.modelAnswer}</p>
                </div>

                {/* Examiner Rationale */}
                <div className="pt-2 border-t border-indigo-200/60 text-xs text-indigo-950 leading-relaxed flex items-start gap-2">
                  <Award className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Examiner Note:</strong> {feedback.band8Answer.examinerRationale}
                  </div>
                </div>
              </div>

              {/* Highlighted C1/C2 Collocations */}
              {feedback.band8Answer.highlightedCollocations.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    High-Yield Collocations in Model Answer
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {feedback.band8Answer.highlightedCollocations.map((col, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-indigo-950 font-serif">
                            "{col.phrase}"
                          </span>
                          <span className="px-1.5 py-0.2 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold">
                            {col.bandLevel}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          {col.meaning}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Spoken Discourse Markers */}
              {feedback.band8Answer.keyDiscourseMarkers.length > 0 && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    Discourse Anchors:
                  </span>
                  {feedback.band8Answer.keyDiscourseMarkers.map((marker, mIdx) => (
                    <span
                      key={mIdx}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-bold"
                    >
                      {marker}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GRAMMAR ERRORS & CORRECTIONS */}
          {activeTab === 'errors' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900">
                  Targeted Grammatical Error Corrections
                </h3>
                <span className="text-xs text-slate-500">
                  {feedback.grammaticalErrors.length} observation{feedback.grammaticalErrors.length !== 1 ? 's' : ''}
                </span>
              </div>

              {feedback.grammaticalErrors.length === 0 ? (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="text-sm font-extrabold text-emerald-900">
                    No Critical Grammatical Errors Detected!
                  </h4>
                  <p className="text-xs text-emerald-700 max-w-md mx-auto">
                    Your response maintained strong grammatical accuracy across simple and compound sentences. Continue incorporating advanced modal structures and inverted conditionals.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {feedback.grammaticalErrors.map((err, idx) => {
                    const isSaved = savedErrors[`err_${idx}_${err.observed}`];
                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-mono text-[11px] font-bold">
                            {err.ruleCategory}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            err.severity === 'critical'
                              ? 'bg-rose-100 text-rose-800'
                              : err.severity === 'moderate'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {err.severity} impact
                          </span>
                        </div>

                        {/* Observed vs Corrected comparison */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                            <span className="text-[10px] font-bold uppercase text-rose-700 block mb-0.5">
                              Observed in Candidate Speech:
                            </span>
                            <span className="font-mono text-rose-950 font-bold line-through">
                              "{err.observed}"
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                            <span className="text-[10px] font-bold uppercase text-emerald-700 block mb-0.5">
                              Band 8+ Accurate Correction:
                            </span>
                            <span className="font-mono text-emerald-950 font-bold">
                              "{err.corrected}"
                            </span>
                          </div>
                        </div>

                        {/* Explanation & Save button */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {err.explanation}
                          </p>

                          <button
                            onClick={() => handleSaveGrammarError(err, idx)}
                            disabled={isSaved}
                            className={`min-h-[32px] px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto ${
                              isSaved
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                            <span>{isSaved ? 'Saved to Vault' : 'Save to Mistake Vault'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PRONUNCIATION & PHONETICS */}
          {activeTab === 'pronunciation' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-emerald-900 uppercase">
                    Pronunciation Clarity & Cadence
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-950 font-mono text-xs font-bold">
                    Band {feedback.pronunciation.clarityBand.toFixed(1)}
                  </span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  {feedback.pronunciation.rhythmVerdict}
                </p>
              </div>

              {/* Tricky Words with Syllable Stress */}
              {feedback.pronunciation.trickyWords.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Headphones className="w-3.5 h-3.5 text-emerald-600" />
                    Syllable Stress & Phonetics Coach
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {feedback.pronunciation.trickyWords.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-slate-900">
                              {item.word}
                            </span>
                            <button
                              onClick={() => handlePlayWordPronunciation(item.word)}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition"
                              title="Listen to pronunciation"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-bold">
                              {item.ipa}
                            </span>
                            <span className="font-mono text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                              {item.syllableStress}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                            {item.tip}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Connected Speech & Intonation */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Connected Speech & Intonation Guidance
                </h4>

                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0 mt-1.5"></span>
                    <p>
                      <strong>Intonation Pattern:</strong> {feedback.pronunciation.intonationPattern}
                    </p>
                  </div>
                  {feedback.pronunciation.connectedSpeechTips.map((tip, tIdx) => (
                    <div key={tIdx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-1.5"></span>
                      <p>{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 shrink-0 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onRetakeTurn && (
              <button
                onClick={() => {
                  stopSpeech();
                  onRetakeTurn();
                }}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Practice Turn Again</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleModalClose}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition"
            >
              Close
            </button>

            {onNextQuestion && (
              <button
                onClick={() => {
                  stopSpeech();
                  onNextQuestion();
                }}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md transition flex items-center gap-1.5 active:scale-95"
              >
                <span>{nextActionLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
