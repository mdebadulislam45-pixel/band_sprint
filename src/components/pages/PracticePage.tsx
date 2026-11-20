import React, { useState } from 'react';
import {
  Headphones,
  BookOpen,
  Mic,
  PenTool,
  Award,
  BookMarked,
  Sparkles,
  FileText,
  LucideIcon,
  Play,
  Settings2,
  ArrowRight
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { ExamSetup } from '../cdielts/ExamSetup';
import {
  daysUntilExam,
  formatExamDate,
  loadExamSetup,
  type ExamSetup as ExamSetupData
} from '../../services/examSetupService';

interface PracticeItem {
  id: string;
  path: string;
  title: string;
  shortName: string;
  description: string;
  icon: LucideIcon;
  meta: string;
}

interface PracticePageProps {
  onNavigate: (path: string) => void;
  onShowToast?: (msg: string) => void;
}

const CORE_SKILL_LABS: PracticeItem[] = [
  {
    id: 'listening',
    path: '/practice/listening',
    title: 'Listening Lab',
    shortName: 'Listening',
    description: 'British voice audio scripts, full transcripts, and Sections 1–4 drills.',
    icon: Headphones,
    meta: '4 Sections'
  },
  {
    id: 'reading',
    path: '/practice/reading',
    title: 'Reading Lab',
    shortName: 'Reading',
    description: 'Split-screen Academic & GT passages with True/False/Not Given explanations.',
    icon: BookOpen,
    meta: '3 Passages'
  },
  {
    id: 'writing',
    path: '/practice/writing',
    title: 'Writing Lab',
    shortName: 'Writing',
    description: 'Task 1 data summaries and Task 2 essays scored against all four criteria.',
    icon: PenTool,
    meta: 'Task 1 & 2'
  },
  {
    id: 'speaking',
    path: '/practice/speaking',
    title: 'Speaking Lab',
    shortName: 'Speaking',
    description: 'Interactive AI voice examiner for Parts 1–3 with structured model answers.',
    icon: Mic,
    meta: 'Parts 1–3'
  }
];

const EXAM_AND_DRILL_ROOMS: PracticeItem[] = [
  {
    id: 'mock-tests',
    path: '/practice/mock-tests',
    title: 'Full Mock Tests',
    shortName: 'Mock Tests',
    description: '5 full-length timed CD-IELTS practice sets with 40 Listening & 40 Reading items.',
    icon: Award,
    meta: '5 Full Sets'
  },
  {
    id: 'question-bank',
    path: '/practice/question-bank',
    title: 'Question Bank',
    shortName: 'Question Bank',
    description: 'Focused practice repository filtered by skill, question type, and topic.',
    icon: FileText,
    meta: 'Topic Drills'
  },
  {
    id: 'sprint',
    path: '/practice/sprint',
    title: 'IELTS Practice Library',
    shortName: 'Practice Library',
    description: 'Structured practice sets with full transcripts, passages, and answer keys.',
    icon: BookMarked,
    meta: 'Full Library'
  },
  {
    id: 'ai-tools',
    path: '/practice/ai-tools',
    title: 'AI Evaluation Studio',
    shortName: 'AI Tools',
    description: 'AI Band score evaluator, live voice partner, essay corrector & error analyzer.',
    icon: Sparkles,
    meta: 'AI Studio'
  }
];

export const PracticePage: React.FC<PracticePageProps> = ({ onNavigate }) => {
  const [setup, setSetup] = useState<ExamSetupData>(() => loadExamSetup());
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const daysLeft = daysUntilExam(setup.examDate);

  const refreshSetup = () => setSetup(loadExamSetup());

  const renderCard = (item: PracticeItem) => {
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          soundManager.playBeep(600, 0.035);
          onNavigate(item.path);
        }}
        className="p-5 rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 hover:border-[#0F4C45] dark:hover:border-[#F4A62A]/70 transition text-left flex flex-col justify-between space-y-4 group cursor-pointer min-h-[150px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C45]"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 flex items-center justify-center text-[#0F4C45] dark:text-[#F4A62A]">
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-mono font-semibold text-[#566664] dark:text-slate-400">
              {item.meta}
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="font-display text-base font-bold text-[#0E1F1E] dark:text-white group-hover:text-[#0F4C45] dark:group-hover:text-[#F4A62A] transition">
              {item.title}
            </h3>
            <p className="text-xs text-[#566664] dark:text-slate-400 leading-relaxed line-clamp-2">
              {item.description}
            </p>
          </div>
        </div>

        <div className="text-xs font-semibold text-[#0F4C45] dark:text-[#F4A62A] flex items-center gap-1">
          <span>Open {item.shortName}</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </button>
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-7 animate-fade-in pb-16">
      {/* Unified BandSprint Pine Exam Room Header */}
      <section className="rounded-2xl bg-[#0F4C45] text-white p-5 sm:p-7 border border-[#0B3833] space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#F4A62A] font-semibold">
              BandSprint Exam Room · {setup.examMode} Track
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Timed practice built for test-day pacing
            </h1>
            <p className="text-xs sm:text-sm text-[#EEF3F1]/80 leading-relaxed">
              Choose a full timed mock exam or drill a single skill under computer-delivered IELTS timing.
            </p>
          </div>

          {/* Primary Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                soundManager.playSuccess();
                setIsSetupOpen(true);
              }}
              className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#F4A62A] hover:bg-[#d98f1d] text-[#0E1F1E] font-bold text-sm transition inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Play className="w-4 h-4 fill-[#0E1F1E]" />
              <span>Start Timed Exam</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(600, 0.035);
                setIsSetupOpen(true);
              }}
              className="min-h-[46px] px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-xs transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Settings2 className="w-4 h-4 text-[#F4A62A]" />
              <span>Edit Setup</span>
            </button>
          </div>
        </div>

        {/* Clean Tabular Exam Setup Readout Strip */}
        <div className="pt-4 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#EEF3F1]/65">
              Target Band
            </div>
            <div className="font-mono font-bold text-base text-[#F4A62A] tabular-nums">
              Band {setup.targetBand.toFixed(1)}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#EEF3F1]/65">
              Test Format
            </div>
            <div className="font-semibold text-sm text-white">{setup.examMode}</div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#EEF3F1]/65">
              Exam Countdown
            </div>
            <div className="font-semibold text-sm text-white tabular-nums">
              {setup.examDate
                ? `${formatExamDate(setup.examDate)}${daysLeft !== null ? ` (${daysLeft}d)` : ''}`
                : 'Not scheduled'}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#EEF3F1]/65">
              Active Scope
            </div>
            <div className="font-semibold text-sm text-white capitalize">
              {setup.scope === 'full' ? 'Full Mock Test' : `${setup.scope} Focus`}
            </div>
          </div>
        </div>
      </section>

      {/* Section 1: Four-Skill Practice Labs */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-[#0E1F1E] dark:text-white">
            Skill Practice Labs
          </h2>
          <span className="text-xs text-[#566664] dark:text-slate-400">
            Targeted drills across all four modules
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {CORE_SKILL_LABS.map(renderCard)}
        </div>
      </section>

      {/* Section 2: Full Exams, Libraries & AI Studio */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-[#0E1F1E] dark:text-white">
            Full Mock Exams &amp; Evaluation Tools
          </h2>
          <span className="text-xs text-[#566664] dark:text-slate-400">
            Timed sittings and automated scoring
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {EXAM_AND_DRILL_ROOMS.map(renderCard)}
        </div>
      </section>

      {/* Honest Non-Affiliation Disclaimer */}
      <p className="text-[11px] text-[#566664] dark:text-slate-400 text-center pt-2">
        Practice simulation — not the official IELTS test. BandSprint is not affiliated with Cambridge, British Council, or IDP.
      </p>

      <ExamSetup
        isOpen={isSetupOpen}
        onClose={() => {
          setIsSetupOpen(false);
          refreshSetup();
        }}
        onNavigate={onNavigate}
      />
    </div>
  );
};
