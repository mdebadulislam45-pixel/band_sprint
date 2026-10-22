import React from 'react';
import {
  Sparkles,
  Flame,
  Award,
  CheckCircle2,
  Clock,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Lightbulb,
  Compass,
  AlertCircle
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';

interface VocabSprintHeaderProps {
  todayCompleted: number;
  todayTarget: number;
  reviewDueCount: number;
  masteredCount: number;
  totalCards: number;
  weakAreaNote?: string;
  onStartSprint: () => void;
  onStartReview: () => void;
  activeTab: 'sprint' | 'vocab' | 'idioms' | 'phrases' | 'review';
  onSelectTab: (tab: 'sprint' | 'vocab' | 'idioms' | 'phrases' | 'review') => void;
}

export const VocabSprintHeader: React.FC<VocabSprintHeaderProps> = ({
  todayCompleted,
  todayTarget = 10,
  reviewDueCount = 0,
  masteredCount = 0,
  totalCards = 100,
  weakAreaNote = 'Academic Collocations need practice',
  onStartSprint,
  onStartReview,
  activeTab,
  onSelectTab
}) => {
  const percentComplete = Math.min(100, Math.round((todayCompleted / todayTarget) * 100));

  return (
    <div className="w-full space-y-4">
      {/* ================= HERO SPRINT BANNER ================= */}
      <div className="w-full bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-3xl p-5 sm:p-7 shadow-md border border-indigo-800/60 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-mono font-bold">
                <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>DAILY IELTS SPRINT</span>
              </span>

              <span className="text-xs text-indigo-200 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-300" /> ~12 mins
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Master Band 7–9 Lexical Resource
            </h1>

            <p className="text-xs sm:text-sm text-indigo-200/90 leading-relaxed">
              Targeted high-frequency academic vocabulary, natural British discourse phrases, and contextual idioms with active recall.
            </p>

            {/* Weak Area Insight Pill */}
            {weakAreaNote && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-indigo-200 text-xs font-medium border border-white/10 mt-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="truncate">Focus: {weakAreaNote}</span>
              </div>
            )}
          </div>

          {/* Quick Action Box */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0 min-w-[200px]">
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(650, 0.08);
                onStartSprint();
              }}
              className="min-h-[46px] w-full px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm shadow-md transition active:scale-95 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 fill-slate-950" />
              <span>Start Today's Sprint</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {reviewDueCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  soundManager.playBeep(550, 0.05);
                  onStartReview();
                }}
                className="min-h-[42px] w-full px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
                <span>Review Due ({reviewDueCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Today's Sprint Mini Telemetry Bar */}
        <div className="mt-5 pt-4 border-t border-indigo-800/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center sm:text-left">
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase font-mono text-indigo-300 font-bold">Today's Progress</div>
            <div className="text-sm font-black text-white font-mono">
              {todayCompleted} / {todayTarget} completed
            </div>
            <div className="w-full bg-indigo-950 rounded-full h-1.5 overflow-hidden mt-1 border border-indigo-800/40">
              <div
                className="bg-amber-400 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[10px] uppercase font-mono text-indigo-300 font-bold">Total Mastered</div>
            <div className="text-sm font-black text-emerald-400 font-mono">
              {masteredCount} words ({Math.round((masteredCount / (totalCards || 1)) * 100)}%)
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[10px] uppercase font-mono text-indigo-300 font-bold">Review Queue</div>
            <div className="text-sm font-black text-amber-300 font-mono">
              {reviewDueCount} items ready
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[10px] uppercase font-mono text-indigo-300 font-bold">Daily Streak</div>
            <div className="text-sm font-black text-white flex items-center justify-center sm:justify-start gap-1 font-mono">
              <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>3 Days Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= PRIMARY NAVIGATION SEGMENT TABS ================= */}
      <div className="w-full bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 flex items-center gap-1 overflow-x-auto scrollbar-none">
        {[
          { id: 'sprint' as const, label: "Today's Sprint", icon: Flame, badge: `${todayCompleted}/${todayTarget}` },
          { id: 'vocab' as const, label: 'Vocabulary', icon: BookOpen, badge: 'Words' },
          { id: 'idioms' as const, label: 'Idioms', icon: Lightbulb, badge: 'Speaking' },
          { id: 'phrases' as const, label: 'Phrases', icon: Sparkles, badge: 'Discourse' },
          { id: 'review' as const, label: 'Review & Mastery', icon: RotateCcw, badge: reviewDueCount > 0 ? `${reviewDueCount}` : undefined }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                soundManager.playBeep(600, 0.04);
                onSelectTab(tab.id);
              }}
              className={`min-h-[42px] px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 flex-1 justify-center ${
                isActive
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 shrink-0 ${
                  isActive ? 'text-indigo-600' : 'text-slate-400'
                }`}
              />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono shrink-0 ${
                    isActive
                      ? 'bg-indigo-100 text-indigo-800 font-bold'
                      : tab.id === 'review' && reviewDueCount > 0
                      ? 'bg-amber-100 text-amber-800 font-bold'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
