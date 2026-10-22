import React, { useState, useMemo } from 'react';
import {
  Headphones,
  BookOpen,
  Mic,
  PenTool,
  ArrowRight,
  Sparkles,
  Volume2,
  Clock,
  CheckCircle2,
  Award,
  BookMarked,
  MessageSquareQuote,
  Lightbulb,
  Search,
  Filter,
  RotateCcw,
  Compass,
  FileText,
  Sliders,
  Flame,
  BrainCircuit,
  BookmarkCheck,
  Zap
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { getCurrentUser } from '../../utils/userStorage';
import { UserProfile } from '../../types';
import { Icon3D } from '../common/Icon3D';

interface PracticePageProps {
  onNavigate: (page: string) => void;
  onShowToast: (msg: string) => void;
  user?: UserProfile | null;
}

type CategoryFilter = 'all' | 'core' | 'english' | 'vaults';

export const PracticePage: React.FC<PracticePageProps> = ({
  onNavigate,
  onShowToast,
  user: propUser
}) => {
  const user = propUser || getCurrentUser();
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Genuine resumable session check
  const activeSession = user?.progress?.activeSession;
  const hasResumableSession = Boolean(
    activeSession && activeSession.module && activeSession.title
  );

  const examMode = user?.progress?.intendedFormat || 'Academic';

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-7 animate-fade-in pb-16 select-none">
      {/* ================= HEADER BANNER ================= */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-[#101B32] text-white border border-slate-700/80 shadow-md p-5 sm:p-7">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-mono font-bold border border-blue-400/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>SKILL-BY-SKILL MASTERY</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              IELTS Practice Suite
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Targeted Cambridge exam modules, foundational vocabulary drills, and specialized speed and model answer vaults.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-center shrink-0">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-left">
              <div className="text-[10px] text-slate-400 font-bold uppercase font-mono">Format Mode</div>
              <div className="text-xs font-black text-white mt-0.5">{examMode} Track</div>
            </div>
          </div>
        </div>

        {/* Continue Practising Banner (Rendered ONLY when genuine resumable session exists) */}
        {hasResumableSession && activeSession && (
          <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-white/5 p-3 rounded-xl border border-white/10">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-white">Continue Practising: </span>
                <span className="text-slate-300">{activeSession.title}</span>
                {activeSession.subtitle && (
                  <span className="text-slate-400"> · {activeSession.subtitle}</span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                soundManager.playSuccess();
                onNavigate(activeSession.module);
              }}
              className="min-h-[44px] px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs transition shrink-0 flex items-center justify-center gap-1.5 self-stretch sm:self-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Resume Session</span>
            </button>
          </div>
        )}
      </div>

      {/* ================= COMPACT FILTER & SEARCH BAR ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
        {/* Category Segmented Filter */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/90 dark:border-slate-700/80 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`min-h-[40px] px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap shrink-0 ${
              filter === 'all'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            All Resources
          </button>
          <button
            type="button"
            onClick={() => setFilter('core')}
            className={`min-h-[40px] px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap shrink-0 ${
              filter === 'core'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Core Skills (4)
          </button>
          <button
            type="button"
            onClick={() => setFilter('english')}
            className={`min-h-[40px] px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap shrink-0 ${
              filter === 'english'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Build English (4)
          </button>
          <button
            type="button"
            onClick={() => setFilter('vaults')}
            className={`min-h-[40px] px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap shrink-0 ${
              filter === 'vaults'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Vaults & Drills
          </button>
        </div>

        {/* Search input */}
        <div className="relative min-w-[200px] sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search practice modules..."
            className="w-full min-h-[40px] pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* ================= SECTION 1: IELTS CORE SKILLS (4 CORE MODULES) ================= */}
      {(filter === 'all' || filter === 'core') && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                1. IELTS Core Skills · Cambridge Exam Modules
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Authentic timed question sets with calibrated band score diagnostics
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
              4 Modules
            </span>
          </div>

          {/* Cambridge 11-21 Featured Entry Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950/70 via-indigo-950/50 to-slate-900 border border-blue-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold border border-blue-400/30">
                  VOLUMES 11–21 (2016–2026)
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/20">
                  Academic & General Training
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/20">
                  11 Editions · 44 Tests
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Cambridge Practice Library (11–21)
              </h3>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                Dedicated Cambridge volume browser with 4-part multi-speaker Listening, dual-pane Reading, timed Writing with word count, and 3-part interactive Speaking interviews.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(700, 0.05);
                onNavigate('cambridge');
              }}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 shrink-0 self-start md:self-center cursor-pointer"
            >
              <BookMarked className="w-4 h-4" />
              <span>Explore Library</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {/* 1. Listening Lab */}
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(600, 0.05);
                onNavigate('listening');
              }}
              className="group bg-white dark:bg-[#101B32] rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-blue-500 p-4 sm:p-5 shadow-2xs hover:shadow-xs active:scale-[0.99] transition cursor-pointer flex flex-col justify-between text-left min-h-[160px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Icon3D icon={Headphones} variant="blue" size="md" animateHover={true} />
                  <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono font-bold text-[10px] border border-blue-200/60 dark:border-blue-800/60">
                    40 Qs / Set
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                    Listening Lab
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Authentic British audio at native speed, varied UK regional accents, and standard 4-section Cambridge question patterns.
                  </p>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  <span className="inline-flex items-center gap-1 font-medium">
                    <Volume2 className="w-3.5 h-3.5 text-blue-600" /> British English Audio
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> ~30 mins
                  </span>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-600">
                  Open Listening Lab
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
              </div>
            </button>

            {/* 2. Reading Lab */}
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(600, 0.05);
                onNavigate('reading');
              }}
              className="group bg-white dark:bg-[#101B32] rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-emerald-500 p-4 sm:p-5 shadow-2xs hover:shadow-xs active:scale-[0.99] transition cursor-pointer flex flex-col justify-between text-left min-h-[160px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Icon3D icon={BookOpen} variant="emerald" size="md" animateHover={true} />
                  <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-[10px] border border-emerald-200/60 dark:border-emerald-800/60">
                    Academic & GT
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                    Reading Lab
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Full-length passages with True/False/Not Given, Heading Matching, and Multiple Choice questions with split-screen reading interface.
                  </p>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  <span className="inline-flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Instant Band Scoring
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> ~60 mins
                  </span>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-emerald-600">
                  Open Reading Lab
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
              </div>
            </button>

            {/* 3. Speaking Lab */}
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(600, 0.05);
                onNavigate('speaking');
              }}
              className="group bg-white dark:bg-[#101B32] rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-rose-500 p-4 sm:p-5 shadow-2xs hover:shadow-xs active:scale-[0.99] transition cursor-pointer flex flex-col justify-between text-left min-h-[160px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Icon3D icon={Mic} variant="rose" size="md" animateHover={true} />
                  <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-mono font-bold text-[10px] border border-rose-200/60 dark:border-rose-800/60">
                    Parts 1, 2 & 3
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-rose-600 transition-colors">
                    Speaking Examiner
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Examiner interview simulation with British male voice, 1-minute cue card scratchpad, live mic telemetry, and diagnostic report.
                  </p>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  <span className="inline-flex items-center gap-1 font-medium">
                    <Mic className="w-3.5 h-3.5 text-rose-600" /> Voice Recording
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> 11–14 mins
                  </span>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-rose-600">
                  Open Speaking Lab
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition" />
              </div>
            </button>

            {/* 4. Writing Lab */}
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(600, 0.05);
                onNavigate('writing');
              }}
              className="group bg-white dark:bg-[#101B32] rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-purple-500 p-4 sm:p-5 shadow-2xs hover:shadow-xs active:scale-[0.99] transition cursor-pointer flex flex-col justify-between text-left min-h-[160px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Icon3D icon={PenTool} variant="purple" size="md" animateHover={true} />
                  <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono font-bold text-[10px] border border-purple-200/60 dark:border-purple-800/60">
                    Task 1 & Task 2
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors">
                    Writing Practice Suite
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Timed essay and report editor with live word count, task requirements guide, argument matrix, and detailed criterion assessment.
                  </p>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  <span className="inline-flex items-center gap-1 font-medium">
                    <PenTool className="w-3.5 h-3.5 text-purple-600" /> Live Word Counter
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> ~60 mins
                  </span>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-purple-600">
                  Open Writing Suite
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition" />
              </div>
            </button>
          </div>
        </section>
      )}

      {/* ================= SECTION 2: BUILD YOUR ENGLISH (4 FOUNDATION TOOLS) ================= */}
      {(filter === 'all' || filter === 'english') && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-0.5">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                2. Build Your English · 4 Foundation Tools
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Lexical resource, idiomatic accuracy, discourse markers, and native pronunciation rhythm
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
              4 Tools
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {/* Tool 1: Vocabulary Lab */}
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(560, 0.04);
                onNavigate('vocab');
              }}
              className="group bg-white dark:bg-[#101B32] rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-indigo-500 p-4 sm:p-5 shadow-2xs hover:shadow-xs active:scale-[0.99] transition cursor-pointer flex flex-col justify-between text-left min-h-[150px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <BookMarked className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-[10px] border border-indigo-200/60 dark:border-indigo-800/60">
                    1,360+ Cards
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                    Vocabulary Lab
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Spaced repetition flashcards with British audio pronunciation, definitions, CEFR levels, and quizzes.
                  </p>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600">
                  Open Vocabulary Deck
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition" />
              </div>
            </button>

            {/* Tool 2: Useful Phrases */}
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(560, 0.04);
                onNavigate('phrases');
              }}
              className="group bg-white dark:bg-[#101B32] rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-sky-500 p-4 sm:p-5 shadow-2xs hover:shadow-xs active:scale-[0.99] transition cursor-pointer flex flex-col justify-between text-left min-h-[150px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <MessageSquareQuote className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-mono font-bold text-[10px] border border-sky-200/60 dark:border-sky-800/60">
                    200+ Phrases
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-sky-600 transition-colors">
                    Useful Phrases
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Natural expressions, situation contexts, IELTS examples, paraphrases, and Band 7–9 cohesive linkers.
                  </p>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-sky-600">
                  Open Useful Phrases
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition" />
              </div>
            </button>

            {/* Tool 3: Idiom Lab */}
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(560, 0.04);
                onNavigate('idioms');
              }}
              className="group bg-white dark:bg-[#101B32] rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-amber-500 p-4 sm:p-5 shadow-2xs hover:shadow-xs active:scale-[0.99] transition cursor-pointer flex flex-col justify-between text-left min-h-[150px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Lightbulb className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-mono font-bold text-[10px] border border-amber-200/60 dark:border-amber-800/60">
                    Colloquial
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors">
                    Idiom Lab
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Idiomatic expressions with authentic speaking and writing usage contexts, cautions, and recall drills.
                  </p>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-amber-600">
                  Open Idiom Lab
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition" />
              </div>
            </button>

            {/* Tool 4: Shadowing Lab */}
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(560, 0.04);
                onNavigate('shadowing');
              }}
              className="group bg-white dark:bg-[#101B32] rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-teal-500 p-4 sm:p-5 shadow-2xs hover:shadow-xs active:scale-[0.99] transition cursor-pointer flex flex-col justify-between text-left min-h-[150px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-mono font-bold text-[10px] border border-teal-200/60 dark:border-teal-800/60">
                    Audio & Mic
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
                    Shadowing Lab
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Sentence-by-sentence audio playback, replay, live recording comparison, and British accent rhythm.
                  </p>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-teal-600">
                  Open Shadowing Lab
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition" />
              </div>
            </button>
          </div>
        </section>
      )}

      {/* ================= SECTION 3: PRACTICE & RESOURCE VAULTS ================= */}
      {(filter === 'all' || filter === 'vaults') && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-0.5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                3. Practice & Resource Vaults
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Curated question banks, model essays, memory rules, and pacing drills
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
              8 Vaults &amp; Skeletons
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* 1. Question Bank */}
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(600, 0.05);
                onNavigate('questionbank');
              }}
              className="p-3.5 sm:p-4 bg-white dark:bg-[#101B32] border border-slate-200/90 dark:border-slate-800 hover:border-indigo-400 rounded-xl sm:rounded-2xl cursor-pointer transition shadow-2xs flex flex-col justify-between text-left min-h-[96px] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                  Question Bank
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Categorized Prompts & Camera
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] font-mono text-slate-400">All Modules</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition" />
              </div>
            </button>

            {/* 2. 200 C1 Idioms */}
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(600, 0.05);
                onNavigate('c1idioms');
              }}
              className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-blue-400 rounded-xl sm:rounded-2xl cursor-pointer transition shadow-2xs flex flex-col justify-between text-left min-h-[96px] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                  200 C1 Idioms
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Bangla Meaning + Audio
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] font-mono text-slate-400">Speaking C1</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition" />
              </div>
            </button>

            {/* 3. Speed Reading Pacer */}
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(600, 0.05);
                onNavigate('speedreading');
              }}
              className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-teal-400 rounded-xl sm:rounded-2xl cursor-pointer transition shadow-2xs flex flex-col justify-between text-left min-h-[96px] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
                  Speed Reading
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  WPM Pacer & Chunking
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] font-mono text-slate-400">Reading Drills</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 transition" />
              </div>
            </button>

            {/* 4. Speaking Vault */}
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(600, 0.05);
                onNavigate('speakingvault');
              }}
              className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-rose-400 rounded-xl sm:rounded-2xl cursor-pointer transition shadow-2xs flex flex-col justify-between text-left min-h-[96px] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-rose-600 transition-colors">
                  Speaking Vault
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Part 2 Cue Cards & Models
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] font-mono text-slate-400">Band 9 Audio</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600 transition" />
              </div>
            </button>

            {/* 5. Model Answers */}
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(600, 0.05);
                onNavigate('modelanswers');
              }}
              className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-amber-400 rounded-xl sm:rounded-2xl cursor-pointer transition shadow-2xs flex flex-col justify-between text-left min-h-[96px] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors">
                  Model Answers
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Band 9 Task 1 & 2 Essays
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] font-mono text-slate-400">Writing Guides</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 transition" />
              </div>
            </button>

            {/* 6. Grammar Tricks */}
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(600, 0.05);
                onNavigate('grammar');
              }}
              className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-purple-400 rounded-xl sm:rounded-2xl cursor-pointer transition shadow-2xs flex flex-col justify-between text-left min-h-[96px] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              <div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors">
                  Grammar Tricks
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Memory Rules & Accuracy
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] font-mono text-slate-400">C1 Syntax</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 transition" />
              </div>
            </button>

            {/* 7. Band 9 Essay Architect */}
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(600, 0.05);
                onNavigate('essayarchitect');
              }}
              className="p-3.5 sm:p-4 bg-white dark:bg-[#101B32] border border-slate-200/90 dark:border-slate-800 hover:border-emerald-400 rounded-xl sm:rounded-2xl cursor-pointer transition shadow-2xs flex flex-col justify-between text-left min-h-[96px] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                  Band 9 Essay Architect
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Task 1 & 2 Skeletons + Discourse
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">New Band 9</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition" />
              </div>
            </button>

            {/* 8. Spaced Repetition Flashcards */}
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(600, 0.05);
                onNavigate('vocabflashcards');
              }}
              className="p-3.5 sm:p-4 bg-white dark:bg-[#101B32] border border-slate-200/90 dark:border-slate-800 hover:border-blue-400 rounded-xl sm:rounded-2xl cursor-pointer transition shadow-2xs flex flex-col justify-between text-left min-h-[96px] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                  SRS Flashcard Deck
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Flip Cards + British Audio
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">Spaced Repetition</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition" />
              </div>
            </button>
          </div>
        </section>
      )}

      {/* ================= SECTION 4: ADVANCED EXAM SIMULATORS & MASTERY LABS ================= */}
      <section className="space-y-3 pt-3">
        <div className="flex items-center justify-between px-0.5">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              4. Advanced Exam Simulators & Mastery Labs
            </h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Official test software interfaces, directional audio maps, 60s prep timers, and Band 9 sentence nominalization
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800">
            Advanced
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
          {/* Card 1: CD-IELTS Exam Mode */}
          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(640, 0.04);
              onNavigate('cdielts');
            }}
            className="p-4 bg-white dark:bg-[#101B32] border border-slate-200/90 dark:border-slate-800 hover:border-blue-500 rounded-2xl cursor-pointer transition shadow-2xs hover:shadow-xs flex flex-col justify-between text-left min-h-[140px] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono font-bold text-[10px]">
                  Official UI
                </span>
                <span className="text-[10px] text-slate-400 font-mono">60 Min</span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                CD-IELTS Simulator
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                Computer-delivered exam software with high-contrast themes & margin notes.
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">Launch Exam</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition" />
            </div>
          </button>

          {/* Card 2: Directional Map Lab */}
          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(640, 0.04);
              onNavigate('maplab');
            }}
            className="p-4 bg-white dark:bg-[#101B32] border border-slate-200/90 dark:border-slate-800 hover:border-emerald-500 rounded-2xl cursor-pointer transition shadow-2xs hover:shadow-xs flex flex-col justify-between text-left min-h-[140px] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-[10px]">
                  Listening Sec 2
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Audio + Pins</span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                Directional Map Lab
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                Campus diagram labeling with British spatial preposition navigation.
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Start Map Tour</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition" />
            </div>
          </button>

          {/* Card 3: Sentence Transformer */}
          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(640, 0.04);
              onNavigate('transformer');
            }}
            className="p-4 bg-white dark:bg-[#101B32] border border-slate-200/90 dark:border-slate-800 hover:border-purple-500 rounded-2xl cursor-pointer transition shadow-2xs hover:shadow-xs flex flex-col justify-between text-left min-h-[140px] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono font-bold text-[10px]">
                  Writing Task 2
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Band 6 → 9</span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors">
                Sentence Transformer
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                Academic nominalization engine that upgrades spoken clauses into Band 9 syntax.
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">Transform Sentences</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 transition" />
            </div>
          </button>

          {/* Card 4: Speaking 60s Prep Scratchpad */}
          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(640, 0.04);
              window.dispatchEvent(new CustomEvent('open_speaking_prep'));
            }}
            className="p-4 bg-white dark:bg-[#101B32] border border-slate-200/90 dark:border-slate-800 hover:border-amber-500 rounded-2xl cursor-pointer transition shadow-2xs hover:shadow-xs flex flex-col justify-between text-left min-h-[140px] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-mono font-bold text-[10px]">
                  Speaking Part 2
                </span>
                <span className="text-[10px] text-slate-400 font-mono">60s Timer</span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors">
                60s Prep Scratchpad
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                4-quadrant candidate brainstorm notes with emergency idea spinner.
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">Open Scratchpad</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 transition" />
            </div>
          </button>
        </div>
      </section>
    </div>
  );
};
