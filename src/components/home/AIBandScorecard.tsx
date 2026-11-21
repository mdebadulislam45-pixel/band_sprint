import React, { useState } from 'react';
import {
  Target,
  Award,
  Sparkles,
  ChevronRight,
  TrendingUp,
  HelpCircle,
  Headphones,
  BookOpen,
  PenTool,
  Mic,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { validateOptionalHalfBand } from '../../utils/historyAggregation';

interface AIBandScorecardProps {
  estimatedBand?: number | null;
  targetBand?: number;
  overallPercentage?: number;
  skillBands?: {
    listening?: number | null;
    reading?: number | null;
    writing?: number | null;
    speaking?: number | null;
  };
  onNavigate: (module: string) => void;
  onOpenBandModal?: () => void;
}

type CriteriaTab = 'writing' | 'speaking';

export const AIBandScorecard: React.FC<AIBandScorecardProps> = ({
  estimatedBand = null,
  targetBand = 7.5,
  overallPercentage = 0,
  skillBands,
  onNavigate,
  onOpenBandModal
}) => {
  const [activeTab, setActiveTab] = useState<CriteriaTab>('writing');
  const [selectedCriterion, setSelectedCriterion] = useState<string | null>(null);

  const validOverallBand = validateOptionalHalfBand(estimatedBand, 0.5);
  const hasScore = validOverallBand !== null;
  const delta = validOverallBand !== null ? +(targetBand - validOverallBand).toFixed(1) : null;
  const isTargetAchieved = delta !== null && delta <= 0;

  const lScore = validateOptionalHalfBand(skillBands?.listening, 0.0);
  const rScore = validateOptionalHalfBand(skillBands?.reading, 0.0);
  const wScore = validateOptionalHalfBand(skillBands?.writing, 1.0);
  const sScore = validateOptionalHalfBand(skillBands?.speaking, 1.0);

  // Strictly display real recorded per-skill bands; never coerce null to 0 or invent offsets
  const skillsData = [
    {
      id: 'listening',
      name: 'Listening',
      score: lScore,
      target: targetBand,
      icon: Headphones,
      color: 'text-blue-600 dark:text-blue-400',
      barColor: 'bg-blue-600',
      route: 'listening',
      isLagging: lScore !== null && lScore < targetBand
    },
    {
      id: 'reading',
      name: 'Reading',
      score: rScore,
      target: targetBand,
      icon: BookOpen,
      color: 'text-emerald-600 dark:text-emerald-400',
      barColor: 'bg-emerald-600',
      route: 'reading',
      isLagging: rScore !== null && rScore < targetBand
    },
    {
      id: 'writing',
      name: 'Writing',
      score: wScore,
      target: targetBand,
      icon: PenTool,
      color: 'text-purple-600 dark:text-purple-400',
      barColor: 'bg-purple-600',
      route: 'writing',
      isLagging: wScore !== null && wScore < targetBand
    },
    {
      id: 'speaking',
      name: 'Speaking',
      score: sScore,
      target: targetBand,
      icon: Mic,
      color: 'text-amber-600 dark:text-amber-400',
      barColor: 'bg-amber-600',
      route: 'speaking',
      isLagging: sScore !== null && sScore < targetBand
    }
  ];

  const writingCriteria = [
    {
      id: 'tr',
      code: 'TR / TA',
      title: 'Task Response / Achievement',
      descriptor: 'Addresses all parts of the prompt; presents a clear position throughout with developed ideas.',
      band8Tip: 'Extend and substantiate supporting points with concrete real-world evidence and balanced nuances.'
    },
    {
      id: 'cc',
      code: 'CC',
      title: 'Coherence & Cohesion',
      descriptor: 'Information flows logically; paragraphing is evident with natural referencing and cohesion.',
      band8Tip: 'Use implicit referencing (pronouns, lexical repetition, fronting) instead of mechanical transitions.'
    },
    {
      id: 'lr',
      code: 'LR',
      title: 'Lexical Resource',
      descriptor: 'Sufficient range of academic vocabulary with awareness of style and collocation; minor slips.',
      band8Tip: 'Employ topic-specific academic collocations naturally without forcing rare or archaic words.'
    },
    {
      id: 'gra',
      code: 'GRA',
      title: 'Grammatical Range & Accuracy',
      descriptor: 'Good mix of simple and complex sentence forms; majority of sentences error-free with punctuation control.',
      band8Tip: 'Introduce conditional inversions, participle clauses, and cleft sentences with sustained precision.'
    }
  ];

  const speakingCriteria = [
    {
      id: 'fc',
      code: 'FC',
      title: 'Fluency & Coherence',
      descriptor: 'Speaks at length effortlessly with rare hesitation; uses a range of connectives and discourse markers.',
      band8Tip: 'Develop Part 3 arguments comprehensively using structured discourse frameworks without stalling.'
    },
    {
      id: 'lr',
      code: 'LR',
      title: 'Lexical Resource',
      descriptor: 'Varied vocabulary to discuss abstract academic topics; uses idiomatic expressions appropriately.',
      band8Tip: 'Integrate natural colloquial phrases and precise paraphrasing when answering unpredictable questions.'
    },
    {
      id: 'gra',
      code: 'GRA',
      title: 'Grammatical Range & Accuracy',
      descriptor: 'Produces a range of complex grammatical structures with frequent error-free sentences.',
      band8Tip: 'Maintain grammatical control even during rapid, emotional, or speculative speech in Part 3.'
    },
    {
      id: 'pr',
      code: 'PR',
      title: 'Pronunciation & Intonation',
      descriptor: 'Clear phonological features; uses syllable stress and sentence intonation effectively with minor slips.',
      band8Tip: 'Master weak forms (schwa), elision, and expressive sentence stress for natural contrastive emphasis.'
    }
  ];

  const activeCriteriaList = activeTab === 'writing' ? writingCriteria : speakingCriteria;

  return (
    <div className="rounded-2xl bg-white dark:bg-[#0E1526] border border-stone-200/90 dark:border-slate-800/90 p-5 sm:p-6 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-blue-700 dark:text-blue-400">Practice Band Descriptors</span>
              <span aria-hidden="true">·</span>
              <span>Diagnostic Estimate</span>
            </div>
            <h2 className="font-display text-base sm:text-lg font-semibold text-slate-900 dark:text-white tracking-tight mt-0.5">
              AI Band Scorecard & Criteria Guide
            </h2>
          </div>
        </div>

        {onOpenBandModal && (
          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(560, 0.03);
              onOpenBandModal();
            }}
            className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer whitespace-nowrap"
          >
            <span>Adjust Target</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Main Scorecard Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl bg-[#FAF8F5] dark:bg-slate-900/60 border border-stone-200/80 dark:border-slate-800/80">
        {/* Estimated Overall Band */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 dark:bg-blue-600 text-white flex flex-col items-center justify-center font-mono font-bold tabular-nums shadow-2xs shrink-0">
            <span className="text-lg leading-none">{validOverallBand !== null ? validOverallBand.toFixed(1) : '—'}</span>
            <span className="text-[9px] tracking-wide font-sans font-semibold opacity-80 mt-0.5">
              {validOverallBand !== null ? 'Band' : 'N/A'}
            </span>
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {validOverallBand !== null ? 'Current Overall Band' : 'Overall Band'}
            </div>
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
              {validOverallBand !== null
                ? validOverallBand >= 7.5
                  ? 'C1 Advanced Proficient'
                  : validOverallBand >= 6.5
                  ? 'B2 Upper Intermediate'
                  : 'B1 Competent'
                : 'Not assessed'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              Target Band: <span className="font-semibold text-blue-700 dark:text-blue-400">{targetBand.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Delta Trajectory */}
        <div className="flex items-center gap-2.5 md:border-l md:border-stone-200/80 dark:md:border-slate-800/80 md:pl-3.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Target Trajectory
            </div>
            <div className="text-xs font-semibold mt-0.5">
              {delta === null ? (
                <span className="text-slate-700 dark:text-slate-300">
                  Not assessed
                </span>
              ) : isTargetAchieved ? (
                <span className="text-emerald-700 dark:text-emerald-400">Target Band Achieved</span>
              ) : (
                <span className="text-amber-700 dark:text-amber-400 font-mono tabular-nums">
                  +{delta.toFixed(1)} Band Needed
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {overallPercentage}% modules explored
            </div>
          </div>
        </div>

        {/* Fast Action */}
        <div className="flex items-center justify-between md:justify-end gap-2 md:border-l md:border-stone-200/80 dark:md:border-slate-800/80 md:pl-3.5">
          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(580, 0.03);
              onNavigate(hasScore ? 'progress' : 'mocktest');
            }}
            className="w-full md:w-auto px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-blue-600 dark:hover:bg-blue-500 text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
          >
            <span>{hasScore ? 'Full Analytics' : 'Take 15-Minute Diagnostic Mock to Reveal Your Band'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4 Core Skills Band Comparison Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {skillsData.map((sk) => {
          const Icon = sk.icon;
          const pct = sk.score !== null ? Math.min(100, Math.round((sk.score / sk.target) * 100)) : 0;
          return (
            <button
              key={sk.id}
              type="button"
              onClick={() => {
                soundManager.playBeep(520, 0.03);
                onNavigate(sk.route);
              }}
              className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-400 dark:hover:border-blue-500 bg-white dark:bg-[#0B1224] transition text-left group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 ${sk.color}`} />
                  {sk.name}
                </span>
                <span className="text-xs font-mono font-black text-slate-900 dark:text-white tabular-nums">
                  {sk.score !== null ? sk.score.toFixed(1) : '—'}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full ${sk.barColor} transition-all duration-500 rounded-full`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400 font-mono">
                <span>Target {sk.target.toFixed(1)}</span>
                {sk.score === null ? (
                  <span className="text-blue-500 font-bold">Not assessed →</span>
                ) : sk.isLagging ? (
                  <span className="text-amber-500 font-bold uppercase tracking-wider">Priority</span>
                ) : (
                  <span className="text-emerald-500 font-bold">On Track</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Practice Criteria Rubric Triage */}
      <div className="border-t border-slate-200/80 dark:border-slate-800/80 pt-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Practice Set 4-Criteria Diagnostic Breakdown</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/70 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(480, 0.02);
                setActiveTab('writing');
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                activeTab === 'writing'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Writing Criteria
            </button>
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(480, 0.02);
                setActiveTab('speaking');
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                activeTab === 'speaking'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Speaking Criteria
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {activeCriteriaList.map((crit) => {
            const isExpanded = selectedCriterion === crit.id;
            return (
              <div
                key={crit.id}
                onClick={() => {
                  soundManager.playBeep(500, 0.02);
                  setSelectedCriterion(isExpanded ? null : crit.id);
                }}
                className={`p-2.5 rounded-xl border transition cursor-pointer text-left ${
                  isExpanded
                    ? 'border-blue-500/50 bg-blue-50/40 dark:bg-blue-950/20'
                    : 'border-slate-200/70 dark:border-slate-800/70 bg-slate-50/50 dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {crit.code}
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {crit.title}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                    Rubric Guide
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                  {crit.descriptor}
                </p>

                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-blue-200/50 dark:border-blue-800/50 text-[10.5px] text-blue-700 dark:text-blue-300 bg-blue-50/60 dark:bg-blue-950/40 p-2 rounded-lg">
                    <span className="font-bold">Practice Band 8.0 Target: </span>
                    {crit.band8Tip}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
