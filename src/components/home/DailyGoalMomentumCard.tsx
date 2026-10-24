import React, { useState, useEffect } from 'react';
import {
  Flame,
  Clock,
  Shield,
  CheckCircle2,
  Circle,
  Plus,
  Sparkles,
  Trophy,
  Calendar,
  Zap
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';

interface DailyGoalMomentumCardProps {
  streakDays?: number;
  examDate?: string;
  onNavigate: (module: string) => void;
  onShowToast?: (msg: string) => void;
}

interface ChecklistItem {
  id: string;
  title: string;
  mins: number;
  module: string;
  completed: boolean;
}

export const DailyGoalMomentumCard: React.FC<DailyGoalMomentumCardProps> = ({
  streakDays = 5,
  examDate = 'Nov 15, 2025',
  onNavigate,
  onShowToast
}) => {
  const [studiedMins, setStudiedMins] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ielts_daily_studied_mins');
      if (stored) return parseInt(stored, 10) || 30;
    }
    return 30;
  });

  const dailyGoalMins = 45;
  const progressPercent = Math.min(100, Math.round((studiedMins / dailyGoalMins) * 100));

  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: '1', title: '1 Cambridge Listening Section', mins: 12, module: 'listening', completed: true },
    { id: '2', title: '5 C1 Academic Collocations', mins: 8, module: 'practice', completed: true },
    { id: '3', title: '1 AI Speaking Part 2 Run', mins: 10, module: 'speaking', completed: studiedMins >= 30 },
    { id: '4', title: 'Task 2 Body Paragraph Review', mins: 15, module: 'writing', completed: studiedMins >= 45 }
  ]);

  const toggleCheck = (id: string) => {
    soundManager.playBeep(520, 0.03);
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const handleLogQuickStudy = () => {
    soundManager.playCelebration();
    const nextMins = Math.min(120, studiedMins + 15);
    setStudiedMins(nextMins);
    try {
      localStorage.setItem('ielts_daily_studied_mins', nextMins.toString());
    } catch {}

    setChecklist((prev) =>
      prev.map((item, idx) => (idx < Math.ceil(nextMins / 12) ? { ...item, completed: true } : item))
    );

    if (onShowToast) {
      onShowToast(`+15 minutes logged! Today's total: ${nextMins} / ${dailyGoalMins} mins.`);
    }
  };

  // Compute days until exam
  const daysUntilExam = (() => {
    try {
      const target = new Date(examDate).getTime();
      const now = new Date().getTime();
      const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
      return isNaN(diff) || diff < 1 ? 42 : diff;
    } catch {
      return 42;
    }
  })();

  return (
    <div className="rounded-2xl bg-white dark:bg-[#0B1224] border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
              Daily Goal & Momentum Hub
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              Streak Multiplier: <span className="text-amber-500 font-bold">+20% XP</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono font-bold">
          <Shield className="w-3 h-3 text-emerald-500" />
          <span>Freeze Active</span>
        </div>
      </div>

      {/* Progress Ring & Countdown Grid */}
      <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80">
        {/* Study Time Progress */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-200 dark:text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-blue-600 dark:text-blue-500 transition-all duration-700"
                strokeDasharray={`${progressPercent}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute font-mono font-black text-[10px] text-slate-900 dark:text-white">
              {progressPercent}%
            </span>
          </div>

          <div className="min-w-0">
            <div className="text-[9px] font-mono uppercase text-slate-400 font-bold">Daily Study</div>
            <div className="text-xs font-mono font-black text-slate-900 dark:text-white truncate">
              {studiedMins} <span className="text-slate-400 font-normal">/ {dailyGoalMins}m</span>
            </div>
            <div className="text-[9px] text-slate-500 dark:text-slate-400 truncate">
              {studiedMins >= dailyGoalMins ? 'Goal completed! 🎉' : `${dailyGoalMins - studiedMins}m remaining`}
            </div>
          </div>
        </div>

        {/* Official Exam Countdown */}
        <div className="flex items-center gap-2.5 border-l border-slate-200/80 dark:border-slate-800/80 pl-2.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex flex-col items-center justify-center font-mono shrink-0">
            <span className="text-xs font-black leading-none">{daysUntilExam}</span>
            <span className="text-[8px] uppercase tracking-wider font-bold">Days</span>
          </div>

          <div className="min-w-0">
            <div className="text-[9px] font-mono uppercase text-slate-400 font-bold">Exam Date</div>
            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {examDate}
            </div>
            <div className="text-[9px] text-slate-500 dark:text-slate-400 truncate">
              Sprint Week 2
            </div>
          </div>
        </div>
      </div>

      {/* Today's Sprint Checklist */}
      <div className="space-y-1.5">
        <div className="text-[10px] font-mono uppercase font-bold text-slate-400 flex items-center justify-between">
          <span>Today's Milestone Targets</span>
          <span>{checklist.filter((c) => c.completed).length}/{checklist.length}</span>
        </div>

        <div className="space-y-1">
          {checklist.map((item) => (
            <div
              key={item.id}
              onClick={() => toggleCheck(item.id)}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition cursor-pointer select-none text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                {item.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span
                  className={`truncate font-medium ${
                    item.completed
                      ? 'line-through text-slate-400 dark:text-slate-500'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {item.title}
                </span>
              </div>

              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                {item.mins}m
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Add Study Session */}
      <button
        type="button"
        onClick={handleLogQuickStudy}
        className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Log 15-Min Study Session (+25 XP)</span>
      </button>
    </div>
  );
};
