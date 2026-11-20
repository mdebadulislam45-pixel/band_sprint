import React from 'react';
import {
  BookOpen,
  MessageSquareQuote,
  Lightbulb,
  Sparkles,
  PenTool,
  Mic,
  Award,
  Calendar,
  Layers,
  Globe,
  Sliders,
  FileText,
  Target,
  ArrowRight,
  LucideIcon
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { loadDiagnosticResult } from '../../services/diagnosticResultStore';
import { IELTS_SPELLING_TRAPS } from '../../data/ieltsSpellingData';

interface LearnItem {
  id: string;
  path: string;
  title: string;
  shortName: string;
  description: string;
  icon: LucideIcon;
  meta: string;
}

interface LearnPageProps {
  onNavigate: (path: string) => void;
  onShowToast?: (msg: string) => void;
}

export const LearnPage: React.FC<LearnPageProps> = ({ onNavigate }) => {
  const diagnostic = loadDiagnosticResult();

  const lexicalItems: LearnItem[] = [
    {
      id: 'vocabulary',
      path: '/learn/vocabulary',
      title: 'Vocabulary Deck',
      shortName: 'Vocabulary',
      description: 'High-yield B2–C2 academic word lists with Bangla meanings and spaced review.',
      icon: BookOpen,
      meta: '1,000+ Words'
    },
    {
      id: 'phrases',
      path: '/learn/phrases',
      title: 'Useful Phrases',
      shortName: 'Phrases',
      description: 'Academic transitions, discourse markers, and cohesive connectors for essays & speaking.',
      icon: MessageSquareQuote,
      meta: 'Discourse'
    },
    {
      id: 'idioms',
      path: '/learn/idioms',
      title: 'Idiom Lab (B1–C2)',
      shortName: 'Idioms',
      description: 'Natural English idiomatic expressions calibrated for Speaking Parts 2 & 3.',
      icon: Lightbulb,
      meta: 'B1–C2 Idioms'
    },
    {
      id: 'collocations',
      path: '/learn/collocations',
      title: 'Academic Collocations',
      shortName: 'Collocations',
      description: 'Natural verb-noun and adjective-noun pairings to lift Lexical Resource scores.',
      icon: Sparkles,
      meta: 'Word Pairs'
    },
    {
      id: 'grammar',
      path: '/learn/grammar',
      title: 'Grammar Lab',
      shortName: 'Grammar',
      description: 'Complex clauses, passive voice, conditionals, and common error drills.',
      icon: PenTool,
      meta: 'GRA Rules'
    },
    {
      id: 'spelling',
      path: '/learn/spelling',
      title: 'Spelling & Dictation Lab',
      shortName: 'Spelling',
      description: 'British voice dictation across top examiner traps and the full academic word bank.',
      icon: Layers,
      meta: `${IELTS_SPELLING_TRAPS.length.toLocaleString()} Words`
    }
  ];

  const strategyItems: LearnItem[] = [
    {
      id: 'shadowing',
      path: '/learn/shadowing',
      title: 'Shadowing & Pronunciation',
      shortName: 'Shadowing',
      description: 'British cadence shadowing, word stress drills, and connected speech practice.',
      icon: Mic,
      meta: 'Pronunciation'
    },
    {
      id: 'model-answers',
      path: '/learn/model-answers',
      title: 'Band 9 Model Answers',
      shortName: 'Model Answers',
      description: 'Annotated high-band sample responses for Writing Task 1, Task 2, and Speaking.',
      icon: Award,
      meta: 'Band 8–9'
    },
    {
      id: 'band-descriptors',
      path: '/learn/band-descriptors',
      title: 'Band Descriptors',
      shortName: 'Descriptors',
      description: 'Clear breakdown of TR/TA, CC, LR, GRA, Fluency, and Pronunciation criteria.',
      icon: FileText,
      meta: 'Rubrics'
    },
    {
      id: 'bangla-guide',
      path: '/learn/bangla-guide',
      title: 'Bangla IELTS Guide',
      shortName: 'Bangla Guide',
      description: 'Bilingual strategies and clear exam explanations written for Bangladeshi learners.',
      icon: Globe,
      meta: 'বাংলা গাইড'
    },
    {
      id: 'beginner-101',
      path: '/learn/beginner-101',
      title: 'Beginner 101 Guide',
      shortName: 'Beginner 101',
      description: 'First-time test orientation: paper format, timing rules, and band scaling.',
      icon: Sliders,
      meta: 'Orientation'
    }
  ];

  const renderCard = (item: LearnItem) => {
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          soundManager.playBeep(600, 0.035);
          onNavigate(item.path);
        }}
        className="p-5 rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 hover:border-[#0F4C45] dark:hover:border-[#F4A62A]/70 transition text-left flex flex-col justify-between space-y-4 group cursor-pointer min-h-[146px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C45]"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 flex items-center justify-center text-[#0F4C45] dark:text-[#F4A62A]">
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-mono font-semibold text-[#566664] dark:text-slate-400 tabular-nums">
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
      {/* Unified BandSprint Pine Header */}
      <section className="rounded-2xl bg-[#0F4C45] text-white p-5 sm:p-7 border border-[#0B3833] space-y-2">
        <div className="text-[11px] font-mono uppercase tracking-wider text-[#F4A62A] font-semibold">
          Free Learning Library · Bilingual EN / বাংলা
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Build the vocabulary, grammar, and habits behind Band 8+
        </h1>
        <p className="text-xs sm:text-sm text-[#EEF3F1]/80 leading-relaxed max-w-2xl">
          Every deck, grammar rule, spelling drill, and bilingual guide is free to study at your own pace. Start with the 10-minute diagnostic if you have not mapped your weakest skill yet.
        </p>
      </section>

      {/* Featured Start Strip: Diagnostic + Study Plan */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => {
            soundManager.playSuccess();
            onNavigate('/learn/diagnostic');
          }}
          className="p-5 rounded-2xl bg-white dark:bg-[#11201E] border border-[#0F4C45]/40 dark:border-[#F4A62A]/40 hover:border-[#0F4C45] dark:hover:border-[#F4A62A] transition text-left flex flex-col justify-between gap-4 group cursor-pointer"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#0F4C45] dark:text-[#F4A62A]">
                <Target className="w-4 h-4" />
                <span>{diagnostic ? 'Diagnostic Completed' : 'Start Here · 10 Minutes'}</span>
              </div>
              {diagnostic && (
                <span className="font-mono text-xs font-bold text-[#0E1F1E] dark:text-white tabular-nums">
                  Est. Band {diagnostic.scores.overall.toFixed(1)}
                </span>
              )}
            </div>
            <h2 className="font-display text-lg font-bold text-[#0E1F1E] dark:text-white">
              4-Skill Diagnostic Test
            </h2>
            <p className="text-xs text-[#566664] dark:text-slate-400 leading-relaxed">
              {diagnostic
                ? `Your current priority skill is ${diagnostic.weakest.charAt(0).toUpperCase() + diagnostic.weakest.slice(1)}. Retake any time to re-benchmark your progress.`
                : 'A short real test across Listening, Reading, Writing, and Speaking to pinpoint your starting band and weakest skill.'}
            </p>
          </div>
          <div className="text-xs font-bold text-[#0F4C45] dark:text-[#F4A62A] flex items-center gap-1">
            <span>{diagnostic ? 'Review or Retake Diagnostic' : 'Take 10-Min Diagnostic'}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(600, 0.035);
            onNavigate('/learn/study-plan');
          }}
          className="p-5 rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 hover:border-[#0F4C45] dark:hover:border-[#F4A62A] transition text-left flex flex-col justify-between gap-4 group cursor-pointer"
        >
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#566664] dark:text-slate-400">
              <Calendar className="w-4 h-4 text-[#0F4C45] dark:text-[#F4A62A]" />
              <span>Daily Roadmap</span>
            </div>
            <h2 className="font-display text-lg font-bold text-[#0E1F1E] dark:text-white">
              30-Day Personal Study Plan
            </h2>
            <p className="text-xs text-[#566664] dark:text-slate-400 leading-relaxed">
              Day-by-day checklist calibrated to your target band, daily study minutes, and exam countdown.
            </p>
          </div>
          <div className="text-xs font-bold text-[#0F4C45] dark:text-[#F4A62A] flex items-center gap-1">
            <span>Open Study Plan</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      </section>

      {/* Group 1: Language & Lexical Foundations */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-[#0E1F1E] dark:text-white">
            Vocabulary, Grammar &amp; Spelling
          </h2>
          <span className="text-xs text-[#566664] dark:text-slate-400">
            6 core language labs
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {lexicalItems.map(renderCard)}
        </div>
      </section>

      {/* Group 2: Speaking, Rubrics & Guides */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-[#0E1F1E] dark:text-white">
            Model Answers, Speaking &amp; Guides
          </h2>
          <span className="text-xs text-[#566664] dark:text-slate-400">
            Examiner criteria and bilingual orientation
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {strategyItems.map(renderCard)}
        </div>
      </section>
    </div>
  );
};
