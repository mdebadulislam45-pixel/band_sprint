import React, { useState } from 'react';
import {
  SpeakingEvaluationReport,
  SpeakingAnswerRecord,
  SpeakingTestAnalytics
} from '../../types/speakingTypes';
import {
  calculateIELTSOverallBand,
  getIELTSBandDescriptor
} from '../../services/SpeakingEvaluationService';
import {
  RotateCcw,
  Sparkles,
  HelpCircle,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Award,
  ChevronDown,
  ChevronUp,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Volume2,
  FileText,
  X
} from 'lucide-react';

export interface BritishCouncilSpeakingResultProps {
  evaluationReport: SpeakingEvaluationReport;
  analytics: SpeakingTestAnalytics;
  completedAnswers?: SpeakingAnswerRecord[];
  candidateName?: string;
  onRetakeExam: () => void;
  onNavigateToPractice?: () => void;
  onShowToast?: (msg: string) => void;
}

export const BritishCouncilSpeakingResult: React.FC<BritishCouncilSpeakingResultProps> = ({
  evaluationReport,
  analytics,
  completedAnswers = [],
  candidateName = 'Registered Candidate',
  onRetakeExam,
  onNavigateToPractice,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'result' | 'coach'>('result');
  const [showFormulaModal, setShowFormulaModal] = useState<boolean>(false);
  const [expandedCriterion, setExpandedCriterion] = useState<string | null>(null);

  const {
    overallBand,
    partialThreeCriterionIndex = null,
    criteria,
    grammarObservations = [],
    vocabUpgrades = []
  } = evaluationReport;

  const fcBand: number | null =
    typeof criteria?.fc === 'number'
      ? criteria.fc
      : typeof criteria?.fluency?.band === 'number'
      ? criteria.fluency.band
      : null;
  const graBand: number | null =
    typeof criteria?.gra === 'number'
      ? criteria.gra
      : typeof criteria?.grammar?.band === 'number'
      ? criteria.grammar.band
      : null;
  const lrBand: number | null =
    typeof criteria?.lr === 'number'
      ? criteria.lr
      : typeof criteria?.lexical?.band === 'number'
      ? criteria.lexical.band
      : null;
  const prBand: number | null =
    typeof criteria?.pr === 'number' && criteria.pr > 0
      ? criteria.pr
      : typeof criteria?.pronunciation?.band === 'number' && criteria.pronunciation.band > 0
      ? criteria.pronunciation.band
      : null;

  const hasCompleteFourCriteria =
    fcBand !== null && graBand !== null && lrBand !== null && prBand !== null && overallBand !== null;
  const isPartialTranscriptOnly = !hasCompleteFourCriteria && partialThreeCriterionIndex !== null;

  const calculation = hasCompleteFourCriteria
    ? calculateIELTSOverallBand(fcBand, graBand, lrBand, prBand)
    : null;
  const displayHeadlineBand = overallBand ?? partialThreeCriterionIndex;
  const descriptor = isPartialTranscriptOnly
    ? 'Partial Transcript Estimate (3/4 Criteria)'
    : getIELTSBandDescriptor(overallBand);

  // Circular progress math (radius = 54, circumference = 2 * PI * 54 ≈ 339.29)
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const ringRatio = typeof displayHeadlineBand === 'number' ? Math.max(0, Math.min(9, displayHeadlineBand)) / 9.0 : 0;
  const strokeDashoffset = circumference - ringRatio * circumference;

  // 9-dot score visualization component
  const renderNineDots = (score: number | null) => {
    const dots = [];
    for (let i = 1; i <= 9; i++) {
      let state: 'full' | 'half' | 'empty' = 'empty';
      if (score !== null) {
        if (score >= i) {
          state = 'full';
        } else if (score >= i - 0.5) {
          state = 'half';
        }
      }

      dots.push(
        <div
          key={i}
          className="relative w-2.5 h-2.5 rounded-full overflow-hidden transition-all duration-300"
          title={score !== null ? `Band ${i}` : 'Unassessed'}
        >
          {state === 'full' && (
            <div className="w-full h-full bg-blue-600 dark:bg-blue-400 rounded-full shadow-2xs" />
          )}
          {state === 'half' && (
            <div className="w-full h-full bg-slate-300 dark:bg-slate-700 relative">
              <div className="w-1/2 h-full bg-blue-600 dark:bg-blue-400" />
            </div>
          )}
          {state === 'empty' && (
            <div className="w-full h-full bg-slate-200 dark:bg-slate-700 rounded-full" />
          )}
        </div>
      );
    }
    return <div className="flex items-center gap-1">{dots}</div>;
  };

  const getTrendPill = (score: number | null) => {
    if (score === null) {
      return (
        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
          <span>Unassessed</span>
        </span>
      );
    }
    if (score >= 7.5) {
      return (
        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
          <TrendingUp className="w-3 h-3" />
          <span>↑ High C1/C2</span>
        </span>
      );
    }
    if (score >= 6.5) {
      return (
        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
          <span>= Good Pace</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
        <span>Focus Area</span>
      </span>
    );
  };

  const criteriaCards = [
    {
      id: 'fc',
      code: 'FC',
      name: 'Fluency & Coherence',
      weight: '25%',
      band: fcBand,
      feedback: criteria?.fluency,
      metrics: [
        `Speech Rate: ${analytics.averageWpm || 0} WPM`,
        `Fillers Detected: ${analytics.totalFillers || 0}`,
        `Words Spoken: ${analytics.totalWordsSpoken || 0}`
      ],
      strengths: criteria?.fluency?.strengths || [
        'Maintained understandable speech stream.'
      ],
      improvements: criteria?.fluency?.improvements || [
        'Use formal cohesive markers to link secondary supporting points.'
      ]
    },
    {
      id: 'gra',
      code: 'GRA',
      name: 'Grammatical Range & Accuracy',
      weight: '25%',
      band: graBand,
      feedback: criteria?.grammar,
      metrics: [
        'Complex Structures: Reviewed',
        `Observed Grammar Tags: ${grammarObservations.length}`,
        'Accuracy: Evaluated'
      ],
      strengths: criteria?.grammar?.strengths || [
        'Used appropriate subject-verb sentence patterns.'
      ],
      improvements: criteria?.grammar?.improvements || [
        'Incorporate inverted conditionals and relative clauses.'
      ]
    },
    {
      id: 'lr',
      code: 'LR',
      name: 'Lexical Resource',
      weight: '25%',
      band: lrBand,
      feedback: criteria?.lexical,
      metrics: [
        `Unique Lexicon: ${analytics.uniqueVocabularyCount || 0} words`,
        `Diversity (TTR): ${Math.round((analytics.lexicalDiversityRatio || 0) * 100)}%`,
        `Vocab Upgrades: ${vocabUpgrades.length}`
      ],
      strengths: criteria?.lexical?.strengths || [
        'Relevant topic vocabulary deployed accurately.'
      ],
      improvements: criteria?.lexical?.improvements || [
        'Replace informal high-frequency terms with precise C1 collocations.'
      ]
    },
    {
      id: 'pr',
      code: 'PR',
      name: 'Pronunciation',
      weight: '25%',
      band: prBand,
      feedback: criteria?.pronunciation,
      metrics:
        prBand !== null
          ? [
              'Audio Analysis: Measured',
              'Word Stress: Reviewed',
              'Rhythm & Cadence: Monitored'
            ]
          : [
              'Status: Unassessed',
              'Evidence Mode: Transcript-Only',
              'Requires Acoustic Audio'
            ],
      strengths: criteria?.pronunciation?.strengths || [
        prBand !== null
          ? 'Speech was clear and intelligible across recorded sections.'
          : 'Unassessed: acoustic audio recording is required for Pronunciation scoring.'
      ],
      improvements: criteria?.pronunciation?.improvements || [
        prBand !== null
          ? 'Emphasize content words to create natural English sentence stress.'
          : 'Record and submit acoustic audio once audio evaluation is available.'
      ]
    }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* ================= TOP SEGMENTED TAB SWITCHER ================= */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div
          role="tablist"
          aria-label="Result vs Coach Mode"
          className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'result'}
            onClick={() => setActiveTab('result')}
            className={`min-h-[44px] px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'result'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Result</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'coach'}
            onClick={() => setActiveTab('coach')}
            className={`min-h-[44px] px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'coach'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Coach</span>
            {grammarObservations.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">
                {grammarObservations.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRetakeExam}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retake Exam</span>
          </button>
          {onNavigateToPractice && (
            <button
              type="button"
              onClick={onNavigateToPractice}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Practice Lab</span>
            </button>
          )}
        </div>
      </div>

      {/* ================= TAB 1: RESULT MODE ================= */}
      {activeTab === 'result' && (
        <div className="space-y-6">
          {/* PRIMARY Coach HERO SCORECARD */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-2 text-center md:text-left">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-mono font-bold uppercase tracking-wider ${
                  isPartialTranscriptOnly
                    ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                    : 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                }`}>
                  {isPartialTranscriptOnly ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  )}
                  <span>
                    {isPartialTranscriptOnly
                      ? 'Partial Transcript-Only Diagnostic (3/4 Criteria)'
                      : 'Diagnostic Speaking Assessment (Unofficial)'}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {isPartialTranscriptOnly
                    ? 'Partial Speaking Index (Pronunciation Unassessed)'
                    : 'Speaking Diagnostic Band Estimate'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md">
                  Candidate: <strong>{candidateName}</strong> ·{' '}
                  {isPartialTranscriptOnly
                    ? 'Acoustic Pronunciation was not assessed from transcript alone. Not a complete IELTS Speaking band.'
                    : 'Unofficial diagnostic estimate calibrated against public 9-band descriptors.'}
                </p>

                {/* Explanatory "How is my band worked out?" Trigger */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowFormulaModal(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer group"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
                    <span>How is this score worked out?</span>
                  </button>
                </div>
              </div>

              {/* PRIMARY CIRCULAR OVERALL BAND BADGE */}
              <div className="relative flex flex-col items-center justify-center p-4">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    {/* Background Track */}
                    <circle
                      cx="60"
                      cy="60"
                      r={radius}
                      className="stroke-slate-100 dark:stroke-slate-800"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    {/* Active Accent Score Ring */}
                    <circle
                      cx="60"
                      cy="60"
                      r={radius}
                      className={`${isPartialTranscriptOnly ? 'stroke-amber-500' : 'stroke-blue-600 dark:stroke-blue-500'} transition-all duration-1000 ease-out`}
                      strokeWidth="10"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>

                  {/* Inner Score Badge Content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                      {overallBand !== null ? 'OVERALL' : 'PARTIAL 3/4'}
                    </span>
                    <span className="text-4xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                      {typeof displayHeadlineBand === 'number' ? displayHeadlineBand.toFixed(1) : 'N/A'}
                    </span>
                    <span className={`text-[10px] font-bold ${isPartialTranscriptOnly ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}>
                      {overallBand !== null ? 'Band Estimate' : '3/4 Index Only'}
                    </span>
                  </div>
                </div>

                {/* Official Descriptor Pill */}
                <div className="mt-2 text-center">
                  <span className="inline-block px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-2xs">
                    {descriptor}
                  </span>
                </div>
              </div>
            </div>

            {/* ================= 4-PILLAR CRITERION CARD GRID ================= */}
            <div className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                  Assessment Criteria Breakdown (25% each)
                </h2>
                <span className="text-xs text-slate-400 font-mono">
                  Scale: 1.0 – 9.0
                </span>
              </div>

              {/* Responsive 4-card grid (1 col on mobile, 2 col on tablet, 4 col on desktop) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {criteriaCards.map((card) => {
                  const isExpanded = expandedCriterion === card.id;
                  return (
                    <div
                      key={card.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-blue-600 transition-all flex flex-col justify-between gap-3 shadow-2xs"
                    >
                      {/* Card Header with Score and Trend */}
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">
                            {card.code} · {card.weight}
                          </span>
                          {getTrendPill(card.band)}
                        </div>

                        <div className="mt-1 flex items-baseline justify-between">
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
                            {card.name}
                          </h3>
                        </div>

                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums font-mono">
                            {card.band !== null ? card.band.toFixed(1) : 'Unassessed'}
                          </span>
                          {card.band !== null && (
                            <span className="text-[11px] text-slate-500 font-semibold">
                              / 9.0
                            </span>
                          )}
                        </div>

                        {/* 9-Dot Score Visualization */}
                        <div className="mt-2 py-1">
                          {renderNineDots(card.band)}
                        </div>
                      </div>

                      {/* Compact Telemetry Chips */}
                      <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700/60 pt-2.5">
                        {card.metrics.map((m, i) => (
                          <div key={i} className="truncate">
                            {m}
                          </div>
                        ))}
                      </div>

                      {/* Expandable Drilldown Toggle */}
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCriterion(isExpanded ? null : card.id)
                        }
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-between pt-1 cursor-pointer"
                      >
                        <span>{isExpanded ? 'Hide Details' : 'View Feedback'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs space-y-2 animate-fade-in mt-1">
                          <div>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-[10px] uppercase">
                              Strength:
                            </span>
                            <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                              {card.strengths[0]}
                            </p>
                          </div>
                          <div>
                            <span className="font-bold text-amber-600 dark:text-amber-400 block text-[10px] uppercase">
                              {card.band !== null
                                ? `To Reach Band ${Math.min(9.0, card.band + 0.5).toFixed(1)}:`
                                : 'Requirement for Assessment:'}
                            </span>
                            <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                              {card.improvements[0]}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: COACH MODE ================= */}
      {activeTab === 'coach' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="space-y-1 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-blue-600 dark:text-blue-400 uppercase">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Coach AI Diagnostic Coach</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Personalized Speech Telemetry & Band 8.5+ Upgrades
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Grounded directly in your spoken responses. No canned templates.
              </p>
            </div>

            {/* 1. Real Spoken Grammar Corrections */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                <span>Grammar Precision & Accuracy Fixes</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                  {grammarObservations.length} detected
                </span>
              </h3>

              {grammarObservations.length === 0 ? (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
                  Zero critical grammar breakdowns detected in this attempt! Great tense stability and structural accuracy.
                </div>
              ) : (
                <div className="space-y-3">
                  {grammarObservations.map((obs, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80">
                          <span className="text-[10px] font-mono font-bold uppercase text-rose-600 dark:text-rose-400 block mb-1">
                            Observed in your speech:
                          </span>
                          <p className="font-medium text-slate-900 dark:text-slate-100 line-through">
                            "{obs.observed}"
                          </p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80">
                          <span className="text-[10px] font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400 block mb-1">
                            Band 8.5+ Practice Correction:
                          </span>
                          <p className="font-bold text-emerald-900 dark:text-emerald-100">
                            "{obs.corrected}"
                          </p>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                        <strong>Rule:</strong> {obs.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Lexical Upgrades */}
            {vocabUpgrades.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
                  C1/C2 Lexical Enhancements
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {vocabUpgrades.slice(0, 4).map((up, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                        <span className="text-slate-500">"{up.original}"</span>
                        <span className="text-blue-600 dark:text-blue-400">→ "{up.upgraded}"</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        {up.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= "HOW IS MY BAND WORKED OUT?" MODAL ================= */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Award className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  How Is My Band Worked Out?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                In the IELTS Speaking test, each of the four assessment criteria carries an equal <strong>25% weighting</strong>.
              </p>

              {/* Exact Calculation Box */}
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase text-blue-700 dark:text-blue-300">
                  {calculation ? 'Your Mathematical Derivation:' : 'Partial 3-Criterion Index Derivation:'}
                </span>
                {calculation && fcBand !== null && graBand !== null && lrBand !== null && prBand !== null ? (
                  <>
                    <div className="text-sm font-mono font-black text-slate-900 dark:text-white">
                      {calculation.formulaString}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      FC ({fcBand.toFixed(1)}) + GRA ({graBand.toFixed(1)}) + LR ({lrBand.toFixed(1)}) + PR ({prBand.toFixed(1)}) ÷ 4 = {calculation.rawAverage.toFixed(3)}
                    </div>
                  </>
                ) : fcBand !== null && graBand !== null && lrBand !== null && partialThreeCriterionIndex !== null ? (
                  <>
                    <div className="text-sm font-mono font-black text-slate-900 dark:text-white">
                      ({fcBand.toFixed(1)} + {graBand.toFixed(1)} + {lrBand.toFixed(1)}) ÷ 3 = {((fcBand + graBand + lrBand) / 3).toFixed(3)} → {partialThreeCriterionIndex.toFixed(1)} (Partial Index)
                    </div>
                    <div className="text-[11px] text-amber-700 dark:text-amber-300">
                      Pronunciation was not acoustically assessed (transcript-only input). Because a complete IELTS Speaking band requires all 4 criteria, overallBand remains null.
                    </div>
                  </>
                ) : (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Insufficient criteria available to compute an overall band score.
                  </div>
                )}
              </div>

              {/* Official Rounding Convention */}
              <div className="space-y-1.5 pt-1">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] font-mono">
                  IELTS Rounding Rule:
                </h4>
                <ul className="space-y-1 list-disc pl-4 text-[11px]">
                  <li>
                    If the average ends in <strong>.25</strong>, it rounds <strong>up</strong> to the next half band (e.g., 6.25 → <strong>6.5</strong>).
                  </li>
                  <li>
                    If the average ends in <strong>.75</strong>, it rounds <strong>up</strong> to the next whole band (e.g., 6.75 → <strong>7.0</strong>).
                  </li>
                  <li>
                    If the average ends in <strong>.125</strong>, it rounds down to the nearest half band.
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
