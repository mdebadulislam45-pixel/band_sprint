import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Brain,
  Clock,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import {
  readCachedSmartCoachBrief,
  requestSmartCoachBrief,
  type SmartCoachBrief,
  type SmartCoachFocusMode
} from '../../services/smartCoachService';
import { audioManager } from '../../services/AudioManager';

export interface AISmartCoachCardProps {
  candidateName: string;
  examTrack: 'Academic' | 'General Training';
  currentBand: number | null;
  targetBand: number;
  daysRemaining: number;
  weakestSkill: string | null;
  unresolvedMistakes: number;
  topMistakeTopics: string[];
  todayCompletedTasks: number;
  todayTotalTasks: number;
  streakDays: number;
  onNavigate: (path: string) => void;
}

const FOCUS_TABS: Array<{ id: SmartCoachFocusMode; label: string }> = [
  { id: 'daily_plan', label: 'Today’s Plan' },
  { id: 'weakness_fix', label: 'Fix Weakness' },
  { id: 'band8_push', label: 'Band 8+ Push' },
  { id: 'exam_strategy', label: 'Exam Strategy' }
];

const QUICK_PROMPTS = [
  'How do I stop losing marks on True/False/Not Given?',
  'Give me a 20-minute Band 8 Writing Task 2 drill.',
  'How should I structure my final 2 weeks before exam day?'
];

export const AISmartCoachCard: React.FC<AISmartCoachCardProps> = ({
  candidateName,
  examTrack,
  currentBand,
  targetBand,
  daysRemaining,
  weakestSkill,
  unresolvedMistakes,
  topMistakeTopics,
  todayCompletedTasks,
  todayTotalTasks,
  streakDays,
  onNavigate
}) => {
  const [focusMode, setFocusMode] = useState<SmartCoachFocusMode>('daily_plan');
  const [brief, setBrief] = useState<SmartCoachBrief | null>(() =>
    readCachedSmartCoachBrief('daily_plan')
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [questionInput, setQuestionInput] = useState<string>('');
  const [activeQuestionLabel, setActiveQuestionLabel] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const fetchCoaching = useCallback(
    async (
      mode: SmartCoachFocusMode,
      options?: { forceRefresh?: boolean; customQuestion?: string }
    ) => {
      const cleanQuestion = options?.customQuestion?.trim() || '';
      if (!options?.forceRefresh && !cleanQuestion) {
        const cached = readCachedSmartCoachBrief(mode);
        if (cached) {
          setBrief(cached);
          setError(null);
          setActiveQuestionLabel(null);
          return;
        }
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);
      if (cleanQuestion) {
        setActiveQuestionLabel(cleanQuestion);
      } else {
        setActiveQuestionLabel(null);
      }

      try {
        const result = await requestSmartCoachBrief(
          {
            candidateName,
            examTrack,
            currentBand,
            targetBand,
            daysRemaining,
            weakestSkill,
            unresolvedMistakes,
            topMistakeTopics,
            todayCompletedTasks,
            todayTotalTasks,
            streakDays,
            focusMode: mode,
            customQuestion: cleanQuestion || undefined
          },
          controller.signal
        );
        if (!controller.signal.aborted) {
          setBrief(result);
        }
      } catch (err: any) {
        if (!controller.signal.aborted) {
          setError(err?.message || 'AI Smart Coach is temporarily unavailable. Please retry.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [
      candidateName,
      currentBand,
      daysRemaining,
      examTrack,
      streakDays,
      targetBand,
      todayCompletedTasks,
      todayTotalTasks,
      topMistakeTopics,
      unresolvedMistakes,
      weakestSkill
    ]
  );

  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      fetchCoaching('daily_plan');
    }
  }, [fetchCoaching]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleSelectMode = (mode: SmartCoachFocusMode) => {
    audioManager.playUiClick('soft');
    setFocusMode(mode);
    setQuestionInput('');
    fetchCoaching(mode);
  };

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = questionInput.trim();
    if (!trimmed || isLoading) return;
    audioManager.playUiClick('check');
    fetchCoaching(focusMode, { forceRefresh: true, customQuestion: trimmed });
  };

  return (
    <section
      data-testid="ai-smart-coach-card"
      className="rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/35 p-5 sm:p-6 space-y-4"
    >
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[#566664] dark:text-slate-400">
            <span className="font-bold uppercase tracking-wider text-[#0F4C45] dark:text-[#6EE7B7] inline-flex items-center gap-1">
              <Brain className="w-3.5 h-3.5 text-[#F4A62A]" />
              <span>AI Smart Coach</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              Target Band {targetBand.toFixed(1)} · {daysRemaining}d left
            </span>
            {weakestSkill && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-[#9B6314] dark:text-[#F4A62A]">
                  Focus: {weakestSkill}
                </span>
              </>
            )}
          </div>
          <h2 className="font-display text-base sm:text-lg font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
            Personalised Band Strategy &amp; Live Examiner Coaching
          </h2>
        </div>

        <button
          type="button"
          data-testid="ai-smart-coach-refresh-btn"
          onClick={() => {
            audioManager.playUiClick('soft');
            fetchCoaching(focusMode, {
              forceRefresh: true,
              customQuestion: activeQuestionLabel || undefined
            });
          }}
          disabled={isLoading}
          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] hover:bg-[#D3DDDA] dark:hover:bg-[#17302C] border border-[#D3DDDA] dark:border-[#1F8A70]/35 text-[#0F4C45] dark:text-[#6EE7B7] text-xs font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Analysing...' : 'Refresh Plan'}</span>
        </button>
      </div>

      {/* Focus Mode Segmented Controls */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA]/80 dark:border-[#1F8A70]/25">
        {FOCUS_TABS.map((tab) => {
          const isActive = focusMode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              data-testid={`ai-smart-coach-tab-${tab.id}`}
              onClick={() => handleSelectMode(tab.id)}
              className={`flex-1 min-w-[100px] min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-[#0F4C45] text-white shadow-xs'
                  : 'text-[#566664] dark:text-slate-300 hover:text-[#0E1F1E] dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Interactive Coach Body */}
      {isLoading && !brief ? (
        <div className="p-5 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/25 flex items-center gap-3 text-xs text-[#566664] dark:text-slate-300">
          <Loader2 className="w-4 h-4 animate-spin text-[#0F4C45] dark:text-[#6EE7B7] shrink-0" />
          <span>Reviewing your Band history, Mistake Vault patterns, and daily sprint pace...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() =>
              fetchCoaching(focusMode, {
                forceRefresh: true,
                customQuestion: activeQuestionLabel || undefined
              })
            }
            className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : brief ? (
        <div className={`space-y-4 transition-opacity ${isLoading ? 'opacity-60' : 'opacity-100'}`}>
          {/* Diagnosis & Primary Action */}
          <div className="p-4 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/25 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              {activeQuestionLabel && (
                <div className="text-[11px] font-mono text-[#0F4C45] dark:text-[#6EE7B7] font-semibold">
                  Answer for: “{activeQuestionLabel}”
                </div>
              )}
              <h3 className="font-display text-sm sm:text-base font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                {brief.headline}
              </h3>
              <p className="text-xs text-[#566664] dark:text-slate-300 leading-relaxed">
                {brief.diagnosis}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] font-mono text-[#566664] dark:text-slate-400">
                <span className="inline-flex items-center gap-1 font-semibold text-[#0F4C45] dark:text-[#6EE7B7]">
                  <TrendingUp className="w-3.5 h-3.5 text-[#F4A62A]" />
                  <span>{brief.bandImpactNote}</span>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                audioManager.playUiClick('check');
                onNavigate(brief.priorityAction.route || '/learn/daily-sprint');
              }}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white font-bold text-xs inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition"
            >
              <span>{brief.priorityAction.label}</span>
              <span className="text-[11px] font-mono text-[#F4A62A] tabular-nums">
                {brief.priorityAction.durationMinutes}m
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-[#F4A62A]" />
            </button>
          </div>

          {/* 3 Actionable Micro-Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {brief.microSteps.slice(0, 3).map((step, index) => (
              <button
                key={`${step.title}-${index}`}
                type="button"
                onClick={() => {
                  audioManager.playUiClick('soft');
                  onNavigate(step.route || '/practice/question-bank');
                }}
                className="p-3.5 rounded-xl bg-white dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/25 hover:border-[#0F4C45] dark:hover:border-[#1F8A70] text-left flex flex-col justify-between gap-2.5 cursor-pointer transition group"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-[#566664] dark:text-slate-400">
                    <span className="font-bold text-[#0F4C45] dark:text-[#6EE7B7]">
                      0{index + 1}.
                    </span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Clock className="w-3 h-3" />
                      {step.durationMinutes}m
                    </span>
                  </div>
                  <div className="text-xs font-bold text-[#0E1F1E] dark:text-[#EEF3F1] leading-snug">
                    {step.title}
                  </div>
                  <p className="text-[11px] text-[#566664] dark:text-slate-400 leading-relaxed">
                    {step.detail}
                  </p>
                </div>

                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F4C45] dark:text-[#6EE7B7] group-hover:translate-x-0.5 transition">
                  <span>Start step</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </button>
            ))}
          </div>

          {/* Bangla Examiner Tip */}
          {brief.banglaInsight && (
            <div className="px-4 py-3 rounded-xl bg-[#FEF6E8]/75 dark:bg-[#F4A62A]/10 border border-[#F4A62A]/40 flex items-start gap-2.5 text-xs text-[#0E1F1E] dark:text-[#FEF3C7]">
              <Sparkles className="w-4 h-4 text-[#D97706] dark:text-[#F4A62A] shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold mr-1.5">বাংলা কোচ টিপস:</span>
                <span>{brief.banglaInsight}</span>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Direct Ask Coach Form */}
      <div className="pt-3 border-t border-[#EEF3F1] dark:border-[#1F8A70]/25 space-y-2.5">
        <form onSubmit={handleAskSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            maxLength={220}
            placeholder="Ask your AI Smart Coach (e.g., How can I jump from Band 6.5 to 7.5 in Reading?)"
            className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl border border-[#D3DDDA] dark:border-[#1F8A70]/35 bg-[#F7F9F8] dark:bg-[#0B1514] text-xs sm:text-sm text-[#0E1F1E] dark:text-[#EEF3F1] placeholder:text-[#566664]/75 focus:outline-none focus:border-[#0F4C45]"
          />
          <button
            type="submit"
            disabled={isLoading || !questionInput.trim()}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#F4A62A] hover:bg-[#d98f1d] text-[#0E1F1E] font-bold text-xs inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Ask Coach</span>
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#566664] dark:text-slate-400">
          <span className="font-mono font-semibold">Quick asks:</span>
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                setQuestionInput(prompt);
                fetchCoaching(focusMode, { forceRefresh: true, customQuestion: prompt });
              }}
              className="text-left underline decoration-[#D3DDDA] dark:decoration-[#1F8A70]/50 hover:text-[#0F4C45] dark:hover:text-[#6EE7B7] cursor-pointer transition"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
