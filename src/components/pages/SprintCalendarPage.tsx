import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Headphones,
  Mic,
  PenTool,
  Archive,
  Award,
  Zap
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';

interface DayPlan {
  day: number;
  title: string;
  skill: 'listening' | 'reading' | 'writing' | 'speaking' | 'vault' | 'mock';
  targetMinutes: number;
  tasks: string[];
  moduleRoute: string;
  isSpacedRepetition?: boolean;
}

const DEFAULT_14_DAY_PLAN: DayPlan[] = [
  {
    day: 1,
    title: 'Diagnostic Baseline & Listening Section 1',
    skill: 'listening',
    targetMinutes: 45,
    tasks: ['Complete Listening Section 1 (Form Completion)', 'Review numbers, dates, and spelling traps', 'Save incorrect answers to Mistake Vault'],
    moduleRoute: 'listening'
  },
  {
    day: 2,
    title: 'Reading True / False / Not Given Strategy',
    skill: 'reading',
    targetMinutes: 50,
    tasks: ['Analyze 3 TFNG Practice passages', 'Practice scanning without full translation', 'Master contrastive discourse markers'],
    moduleRoute: 'reading'
  },
  {
    day: 3,
    title: 'Day 3 Spaced Repetition & Writing Task 1',
    skill: 'vault',
    targetMinutes: 45,
    tasks: ['Spaced Repetition: Re-test Day 1 Mistake Vault questions', 'Master Task 1 dynamic trends vocabulary ("surged", "plateaued")', 'Write 1 Task 1 line graph summary'],
    moduleRoute: 'writing',
    isSpacedRepetition: true
  },
  {
    day: 4,
    title: 'Speaking Part 2 Monologue & 60s Scratchpad',
    skill: 'speaking',
    targetMinutes: 40,
    tasks: ['Practice 3 cue cards with 60-second prep timer', 'Incorporate 4 academic idioms into conclusion', 'Check fluency pace (130–150 WPM)'],
    moduleRoute: 'speaking'
  },
  {
    day: 5,
    title: 'Writing Task 2 Academic Nominalization',
    skill: 'writing',
    targetMinutes: 60,
    tasks: ['Study Band 9 nominalization structures in Transformer Studio', 'Draft 4-paragraph opinion essay', 'Check Lexical Resource criteria with Writing Coach'],
    moduleRoute: 'writing'
  },
  {
    day: 6,
    title: 'Listening Map Labeling & Directional Prepositions',
    skill: 'listening',
    targetMinutes: 45,
    tasks: ['Complete Campus Map Diagram Lab', 'Drill spatial prepositions ("adjacent to", "bearing north")', 'Dictation practice for letter sequences'],
    moduleRoute: 'listening'
  },
  {
    day: 7,
    title: 'Day 7 Spaced Repetition & Mid-Sprint Review',
    skill: 'vault',
    targetMinutes: 55,
    tasks: ['Clear all unmastered items from Mistake Vault', 'Review 20 Academic Collocations', 'Audit overall band trajectory in Analytics'],
    moduleRoute: 'progress',
    isSpacedRepetition: true
  },
  {
    day: 8,
    title: 'Reading Headings & Passage Speed Pacing',
    skill: 'reading',
    targetMinutes: 50,
    tasks: ['Matching Headings trap elimination technique', 'Speed Reader drill at 250 WPM', 'Identify paragraph topic sentences in under 45s'],
    moduleRoute: 'reading'
  },
  {
    day: 9,
    title: 'Speaking Part 3 Abstract Discussion & Inversions',
    skill: 'speaking',
    targetMinutes: 45,
    tasks: ['Practice 5 Part 3 social impact questions with Voice Examiner', 'Use inverted conditionals: "Were governments to intervene..."', 'Check syllable stress on multisyllabic terms'],
    moduleRoute: 'speaking'
  },
  {
    day: 10,
    title: 'Writing Task 2 Discussion & Balanced Viewpoints',
    skill: 'writing',
    targetMinutes: 60,
    tasks: ['Use PESTLE Idea Matrix for balanced arguments', 'Write Discussion essay (Both Views + Opinion)', 'Audit paragraph topic cohesion'],
    moduleRoute: 'writing'
  },
  {
    day: 11,
    title: 'Listening Section 3 & 4 Academic Monologue',
    skill: 'listening',
    targetMinutes: 50,
    tasks: ['Section 4 continuous lecture audio note-taking', 'Anticipate synonyms before the speaker articulates them', 'Review spelling bank for academic Latinates'],
    moduleRoute: 'listening'
  },
  {
    day: 12,
    title: 'Full Computer-Delivered IELTS Simulation',
    skill: 'mock',
    targetMinutes: 120,
    tasks: ['Run full CD-IELTS Exam Mode with 60-minute countdown', 'Test high-contrast accessibility mode', 'Review flagged questions in palette'],
    moduleRoute: 'mocktest'
  },
  {
    day: 13,
    title: 'Day 14 Final Spaced Repetition Polish',
    skill: 'vault',
    targetMinutes: 45,
    tasks: ['Final sweep of Mistake Vault (zero errors goal)', 'Memorize 10 emergency discourse markers', 'Print Diagnostic Performance Scorecard'],
    moduleRoute: 'progress',
    isSpacedRepetition: true
  },
  {
    day: 14,
    title: 'Exam Day Readiness & Calm Mindset',
    skill: 'mock',
    targetMinutes: 30,
    tasks: ['Check candidate ID & passport requirements', 'Listen to 10 minutes of British male accent warm-up', 'Verify target band roadmap is finalized'],
    moduleRoute: 'home'
  }
];

interface SprintCalendarPageProps {
  onNavigate: (page: string) => void;
  onShowToast: (msg: string) => void;
}

export const SprintCalendarPage: React.FC<SprintCalendarPageProps> = ({
  onNavigate,
  onShowToast
}) => {
  const [selectedDay, setSelectedDay] = useState(1);
  const [completedDays, setCompletedDays] = useState<Set<number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('ielts_sprint_calendar_days');
        if (stored) return new Set(JSON.parse(stored));
      } catch {}
    }
    return new Set([1]);
  });

  const toggleDayCompletion = (dayNum: number) => {
    setCompletedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayNum)) {
        next.delete(dayNum);
        onShowToast(`Day ${dayNum} marked as pending`);
      } else {
        next.add(dayNum);
        soundManager.playSuccess();
        onShowToast(`🎉 Day ${dayNum} marked complete! Keep the streak alive!`);
      }
      try {
        localStorage.setItem('ielts_sprint_calendar_days', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const activePlan = DEFAULT_14_DAY_PLAN.find((p) => p.day === selectedDay) || DEFAULT_14_DAY_PLAN[0];

  const getSkillIcon = (skill: DayPlan['skill']) => {
    switch (skill) {
      case 'listening': return <Headphones className="w-4 h-4 text-blue-500" />;
      case 'reading': return <BookOpen className="w-4 h-4 text-emerald-500" />;
      case 'writing': return <PenTool className="w-4 h-4 text-purple-500" />;
      case 'speaking': return <Mic className="w-4 h-4 text-rose-500" />;
      case 'vault': return <Archive className="w-4 h-4 text-amber-500" />;
      case 'mock': return <Award className="w-4 h-4 text-indigo-500" />;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-fade-in select-none">
      {/* ================= HEADER ================= */}
      <div className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-[#101B32] text-white border border-slate-700/80 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-mono font-bold border border-indigo-400/30">
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              <span>SPACED REPETITION STUDY ENGINE</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              14-Day Targeted BandSprint Calendar
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Every day calibrated with deliberate practice drills and scientifically-spaced Mistake Vault re-testing on Days 3, 7, and 13.
            </p>
          </div>

          <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-left shrink-0">
            <div className="text-[10px] text-slate-400 font-bold uppercase font-mono">Progress</div>
            <div className="text-lg font-mono font-black text-white mt-0.5">
              {completedDays.size} / 14 Days ({Math.round((completedDays.size / 14) * 100)}%)
            </div>
          </div>
        </div>
      </div>

      {/* ================= 14-DAY HORIZONTAL CALENDAR GRID ================= */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
          Select Study Day (1–14)
        </div>

        <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5">
          {DEFAULT_14_DAY_PLAN.map((item) => {
            const isCompleted = completedDays.has(item.day);
            const isSelected = selectedDay === item.day;

            return (
              <button
                key={item.day}
                onClick={() => {
                  setSelectedDay(item.day);
                  soundManager.playBeep(560, 0.03);
                }}
                className={`relative py-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                  isSelected
                    ? 'ring-2 ring-blue-600 scale-105 z-10 bg-blue-50 dark:bg-blue-950/70 border-blue-500'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400'
                }`}
              >
                <span className="text-[10px] font-mono font-bold text-slate-400">D{item.day}</span>
                <span className="text-xs font-black text-slate-900 dark:text-white">{item.day}</span>
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                )}
                {item.isSpacedRepetition && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500" title="Spaced Repetition Review Day" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= ACTIVE DAY DRILL CARD ================= */}
      <div className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold font-mono">
                Day {activePlan.day} Focus
              </span>
              {activePlan.isSpacedRepetition && (
                <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold font-mono flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Spaced Repetition Active</span>
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
              {activePlan.title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleDayCompletion(activePlan.day)}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                completedDays.has(activePlan.day)
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{completedDays.has(activePlan.day) ? 'Completed!' : 'Mark Day Complete'}</span>
            </button>

            <button
              onClick={() => {
                soundManager.playSuccess();
                onNavigate(activePlan.moduleRoute);
              }}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <span>Launch Drill</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Target Time & Specific Checklist Tasks */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <Clock className="w-4 h-4 text-blue-500" />
            <span>Recommended Session Duration: <strong>{activePlan.targetMinutes} Minutes</strong></span>
          </div>

          <div className="space-y-2">
            {activePlan.tasks.map((task, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 text-xs sm:text-sm text-slate-800 dark:text-slate-200"
              >
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{task}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
