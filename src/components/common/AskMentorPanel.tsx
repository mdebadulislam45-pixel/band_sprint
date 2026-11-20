import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  X,
  Send,
  Volume2,
  VolumeX,
  Lightbulb,
  ShieldAlert,
  BookOpen,
  RefreshCw,
  MessageSquare,
  Compass
} from 'lucide-react';
import {
  requestMentorExplanation,
  MentorExplanationRequest,
  MentorExplanationResponse
} from '../../services/mentorService';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';

export interface AskMentorContextProps {
  module: 'reading' | 'listening';
  questionPrompt: string;
  questionType?: string;
  topic?: string;
  evidenceContext?: string;
  userAnswer?: string;
  correctAnswer?: string;
  trapNote?: string;
  isAnswerRevealed?: boolean;
  buttonLabel?: string;
  compact?: boolean;
}

export const AskMentorContextualWidget: React.FC<AskMentorContextProps> = ({
  module,
  questionPrompt,
  questionType,
  topic,
  evidenceContext,
  userAnswer,
  correctAnswer,
  trapNote,
  isAnswerRevealed = false,
  buttonLabel = 'Ask Mentor',
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [explanation, setExplanation] = useState<MentorExplanationResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [customQuery, setCustomQuery] = useState('');
  const [activePromptLabel, setActivePromptLabel] = useState<string | null>(null);
  const [showBangla, setShowBangla] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Reset cached explanation if the underlying question changes
  useEffect(() => {
    setExplanation(null);
    setErrorMessage(null);
    setActivePromptLabel(null);
    setCustomQuery('');
    setIsOpen(false);
  }, [questionPrompt, module]);

  useEffect(() => {
    return () => {
      if (isSpeaking) {
        stopSpeech();
      }
    };
  }, [isSpeaking]);

  const fetchExplanation = useCallback(
    async (overrideQuery?: string, chipLabel?: string) => {
      setIsLoading(true);
      setErrorMessage(null);
      if (chipLabel) {
        setActivePromptLabel(chipLabel);
      }
      soundManager.playBeep(620, 0.03);

      const reqPayload: MentorExplanationRequest = {
        module,
        questionPrompt,
        questionType,
        topic,
        evidenceContext,
        userAnswer,
        correctAnswer,
        trapNote,
        isAnswerRevealed,
        customQuery: overrideQuery !== undefined ? overrideQuery : customQuery.trim() || undefined
      };

      try {
        const res = await requestMentorExplanation(reqPayload);
        setExplanation(res);
      } catch (err: any) {
        setErrorMessage(err?.message || 'Could not reach IELTS Mentor right now.');
      } finally {
        setIsLoading(false);
      }
    },
    [
      module,
      questionPrompt,
      questionType,
      topic,
      evidenceContext,
      userAnswer,
      correctAnswer,
      trapNote,
      isAnswerRevealed,
      customQuery
    ]
  );

  const handleToggleOpen = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen && !explanation && !isLoading) {
      fetchExplanation('', 'Explain Answer & Strategy');
    } else if (!nextOpen && isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customQuery.trim();
    if (!trimmed || isLoading) return;
    fetchExplanation(trimmed, `Q: "${trimmed}"`);
    setCustomQuery('');
  };

  const handleListenExplanation = () => {
    if (!explanation) return;
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    speakBritish(
      `${explanation.headline}. ${explanation.stepByStepExplanation} Trap alert: ${explanation.distractorTrapAnalysis}`,
      {
        speakerId: 'speaker_04',
        gender: 'male',
        rate: 1.0,
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false)
      }
    );
  };

  const handleOpenGlobalTutor = () => {
    window.dispatchEvent(
      new CustomEvent('open_ai_tutor', {
        detail: {
          module,
          currentQuestion: questionPrompt,
          questionType,
          userAnswer,
          correctAnswer: isAnswerRevealed ? correctAnswer : undefined
        }
      })
    );
  };

  const quickConceptChips =
    module === 'reading'
      ? [
          {
            label: 'Explain Paraphrase & Evidence',
            query: 'Break down the exact paraphrase mapping between this question statement and the passage.'
          },
          {
            label: questionType === 'tfng' ? 'Why FALSE vs NOT GIVEN?' : 'Explain Distractor Trap',
            query:
              questionType === 'tfng'
                ? 'Clarify why this statement is TRUE, FALSE, or NOT GIVEN and how to avoid the qualifier trap.'
                : 'What is the main distractor trap in this paragraph matching question?'
          },
          {
            label: 'Clarify Academic Concept',
            query: 'Explain the difficult academic terminology and core concept in this passage in simple terms.'
          }
        ]
      : [
          {
            label: 'Spot the Audio Trap',
            query: 'Explain the self-correction or distractor trap in this Listening question and how to hear the cue.'
          },
          {
            label: 'Predict Word Class & Clues',
            query: 'What grammatical word class, signpost words, or synonyms should I listen for in this question?'
          },
          {
            label: 'Clarify IELTS Rule',
            query: 'Explain the official Practice marking rule (spelling, word limit, or option elimination) for this item.'
          }
        ];

  return (
    <div className="w-full">
      {/* Trigger Button */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={handleToggleOpen}
          aria-expanded={isOpen}
          className={`inline-flex items-center gap-1.5 font-bold transition cursor-pointer active:scale-95 ${
            compact
              ? 'px-2.5 py-1 rounded-lg text-[11px]'
              : 'min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs'
          } ${
            isOpen
              ? 'bg-[#0F172A] text-amber-300 border border-slate-700 shadow-xs'
              : 'bg-blue-50 hover:bg-blue-100/90 dark:bg-blue-950/60 dark:hover:bg-blue-900/70 text-[#1E3A8A] dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 shadow-2xs'
          }`}
          title="Ask Gemini IELTS Mentor to explain this answer or concept on demand"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#B45309] dark:text-amber-400 shrink-0" />
          <span>{isOpen ? 'Hide Mentor' : buttonLabel}</span>
        </button>
      </div>

      {/* Expandable Contextual Mentor Panel */}
      {isOpen && (
        <div className="mt-3 rounded-2xl bg-white dark:bg-[#0B1224] border border-blue-200 dark:border-slate-700/90 shadow-md overflow-hidden animate-fade-in text-left">
          {/* Header Bar */}
          <div className="px-4 py-2.5 bg-[#0F172A] text-white flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-6 h-6 rounded-lg bg-blue-600/25 border border-blue-400/40 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold tracking-tight text-white">
                    IELTS Mentor
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                    {module === 'listening' ? 'Listening Lab' : 'Reading Lab'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {explanation && (
                <>
                  <button
                    type="button"
                    onClick={handleListenExplanation}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                    title="Listen to Mentor explanation in British RP"
                  >
                    {isSpeaking ? (
                      <>
                        <VolumeX className="w-3 h-3 text-amber-400" />
                        <span>Stop</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3 h-3 text-blue-400" />
                        <span>Listen</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowBangla((prev) => !prev)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                      showBangla
                        ? 'bg-emerald-700 text-white border-emerald-500'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                    title="Toggle Bengali summary"
                  >
                    🇧🇩 বাংলা
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                aria-label="Close Mentor Panel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Concept Clarification Chips */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mr-1">
              Clarify:
            </span>
            {quickConceptChips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                disabled={isLoading}
                onClick={() => fetchExplanation(chip.query, chip.label)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer border ${
                  activePromptLabel === chip.label
                    ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Body Content */}
          <div className="p-4 space-y-3 text-xs">
            {isLoading ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
                <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                <span className="text-xs font-semibold">
                  Analyzing {module === 'listening' ? 'audio cues & distractors' : 'passage evidence & logic'} with Gemini...
                </span>
              </div>
            ) : errorMessage ? (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-center justify-between gap-2">
                <span>{errorMessage}</span>
                <button
                  type="button"
                  onClick={() => fetchExplanation()}
                  className="px-2.5 py-1 rounded-lg bg-rose-700 text-white text-[11px] font-bold cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : explanation ? (
              <div className="space-y-3">
                {/* Headline */}
                <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/70">
                  <div className="flex items-start gap-2">
                    <Compass className="w-4 h-4 text-[#1E3A8A] dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h5 className="font-bold text-[#0F172A] dark:text-white text-xs sm:text-[13px] leading-snug">
                        {explanation.headline}
                      </h5>
                      <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                        {explanation.stepByStepExplanation}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Distractor / Trap Breakdown & Transferable Rule */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Distractor & Trap Analysis</span>
                    </div>
                    <p className="text-[11px] text-amber-950 dark:text-amber-100 leading-relaxed">
                      {explanation.distractorTrapAnalysis}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      <Lightbulb className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Core IELTS Concept Rule</span>
                    </div>
                    <p className="text-[11px] text-emerald-950 dark:text-emerald-100 leading-relaxed">
                      {explanation.keyConceptRule}
                    </p>
                  </div>
                </div>

                {/* Lexical Takeaways */}
                {explanation.lexicalTakeaways && explanation.lexicalTakeaways.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <BookOpen className="w-3 h-3 text-[#1E3A8A] dark:text-blue-400" />
                      <span>Key C1/C2 Paraphrase & Lexical Cues</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {explanation.lexicalTakeaways.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-lg bg-white dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700 text-[11px]"
                        >
                          <span className="font-bold text-[#1E3A8A] dark:text-amber-300 block">
                            {item.term}
                          </span>
                          <span className="text-slate-600 dark:text-slate-300">{item.meaning}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Optional Bengali Summary */}
                {showBangla && explanation.banglaSummary && (
                  <div className="p-3 rounded-xl bg-emerald-950 text-emerald-100 border border-emerald-700/60 text-xs leading-relaxed">
                    <span className="text-[10px] font-mono uppercase font-bold text-amber-300 block mb-0.5">
                      বাংলা সারসংক্ষেপ (Mentor Summary):
                    </span>
                    {explanation.banglaSummary}
                  </div>
                )}
              </div>
            ) : null}

            {/* Follow-up Question Input Bar */}
            <form
              onSubmit={handleCustomSubmit}
              className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
            >
              <input
                type="text"
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                placeholder={
                  module === 'reading'
                    ? 'Ask a follow-up (e.g. "Why does this not contradict paragraph B?")...'
                    : 'Ask a follow-up (e.g. "How do I catch the self-correction here?")...'
                }
                className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="submit"
                  disabled={isLoading || !customQuery.trim()}
                  className="px-3.5 py-2 rounded-xl bg-[#1E3A8A] hover:bg-[#172E6E] disabled:opacity-40 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Ask Gemini</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenGlobalTutor}
                  className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                  title="Continue conversation in full AI Tutor drawer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="hidden md:inline">Full Chat</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
