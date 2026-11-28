import React, { useState } from 'react';
import {
  BarChart3,
  History,
  BookmarkCheck,
  Calendar,
  ArrowRight,
  Target,
  Printer,
  LucideIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { soundManager } from '../../utils/audioEffects';
import { UserProfile } from '../../types';
import { loadDiagnosticResult } from '../../services/diagnosticResultStore';
import { PrintablePracticeReportModal } from '../reports/PrintablePracticeReportModal';
import { aggregateExamHistory, validateOptionalHalfBand } from '../../utils/historyAggregation';
import { BarnabyCompanion } from '../BarnabyCompanion';
import { getTopWeakness } from '../../utils/userStorage';
import { computeDaysInactive } from '../../utils/getBarnabyState';
import { sanitizeCandidateName } from '../../utils/nameSanitizer';
import {
  DAILY_SPRINT_SYNCED_EVENT,
  isReviewItemDueToday,
  loadDailySprintProgress
} from '../../utils/dailySprintProgressStore';
import {
  AnimatedNumber,
  StaggerGroup,
  StaggerItem,
  SPRING_SNAPPY,
  EASE_EDITORIAL
} from '../common/MotionPrimitives';

// Embedded Performance & Quick-Tool Widgets
import { AIBandScorecard } from '../home/AIBandScorecard';
import { AISpeakingPartnerCard } from '../home/AISpeakingPartnerCard';
import { AIWritingQuickEvaluator } from '../home/AIWritingQuickEvaluator';
import { ProgressDonutCard } from '../home/ProgressDonutCard';
import { SkillMasteryMatrix } from '../home/SkillMasteryMatrix';
import { BandProjectorCard } from '../home/BandProjectorCard';
import { MistakeVaultWidget } from '../home/MistakeVaultWidget';
import { ExamPacingStrategyCard } from '../home/ExamPacingStrategyCard';
import { AcademicCollocationFinder } from '../home/AcademicCollocationFinder';
import { PracticeHeatmap } from '../home/PracticeHeatmap';
import { AITutorWidget } from '../home/AITutorWidget';
import { SmartRecommendationBanner } from '../home/SmartRecommendationBanner';
import { DailyBandTrendChart } from '../progress/DailyBandTrendChart';
import { ExamReadinessCurveCard } from '../progress/ExamReadinessCurveCard';

interface ProgressItem {
  id: string;
  path: string;
  title: string;
  shortName: string;
  description: string;
  icon: LucideIcon;
  meta: string;
}

interface ProgressPageProps {
  onNavigate: (path: string) => void;
  onShowToast: (msg: string) => void;
  onOpenBandModal: () => void;
  onOpenVault?: () => void;
  user?: UserProfile | null;
  mistakeCount?: number;
}

type ProgressTab = 'readiness' | 'skills' | 'tools';

export const ProgressPage: React.FC<ProgressPageProps> = ({
  onNavigate,
  onShowToast,
  onOpenBandModal,
  onOpenVault,
  user,
  mistakeCount = 0
}) => {
  const [activeTab, setActiveTab] = useState<ProgressTab>('readiness');
  const [showPrintReport, setShowPrintReport] = useState(false);
  const [sprintState, setSprintState] = useState(() => loadDailySprintProgress());
  const diagnostic = loadDiagnosticResult();

  React.useEffect(() => {
    const syncSprint = () => setSprintState(loadDailySprintProgress());
    window.addEventListener(DAILY_SPRINT_SYNCED_EVENT, syncSprint);
    window.addEventListener('bandsprint_cloud_sync_updated', syncSprint);
    return () => {
      window.removeEventListener(DAILY_SPRINT_SYNCED_EVENT, syncSprint);
      window.removeEventListener('bandsprint_cloud_sync_updated', syncSprint);
    };
  }, []);

  const examMode = user?.progress?.intendedFormat || 'Academic';
  const targetBand = user?.progress?.targetBand || 7.5;
  const streakDays = user?.progress?.streakDays || 0;
  const examHistory = user?.progress?.examHistory || [];
  const agg = aggregateExamHistory(examHistory);

  const diagnosticOverall = validateOptionalHalfBand(diagnostic?.scores?.overall, 1.0);
  const overallBand = agg.overall.latest ?? diagnosticOverall;
  const overallSourceLabel =
    agg.overall.latest !== null
      ? 'Full Mock Band'
      : diagnosticOverall !== null
      ? 'Diagnostic Est.'
      : 'Overall Band';

  const skillBands = {
    listening: agg.skills.listening.latest ?? validateOptionalHalfBand(diagnostic?.scores?.listening, 0.0),
    reading: agg.skills.reading.latest ?? validateOptionalHalfBand(diagnostic?.scores?.reading, 0.0),
    writing: agg.skills.writing.latest ?? validateOptionalHalfBand(diagnostic?.scores?.writing, 1.0),
    speaking: agg.skills.speaking.latest ?? validateOptionalHalfBand(diagnostic?.scores?.speaking, 1.0)
  };

  const assessedSkillCount = [
    skillBands.listening,
    skillBands.reading,
    skillBands.writing,
    skillBands.speaking
  ].filter((v) => v !== null).length;

  const overallPercentage =
    overallBand !== null
      ? Math.min(100, Math.round((overallBand / targetBand) * 100))
      : Math.round((assessedSkillCount / 4) * 100);

  const bandDelta = agg.overall.trend?.delta ?? null;
  const progressTopWeakness = (() => {
    const stored = getTopWeakness();
    if (stored) return stored;
    const entries = (
      [
        ['Listening', skillBands.listening],
        ['Reading', skillBands.reading],
        ['Writing', skillBands.writing],
        ['Speaking', skillBands.speaking],
      ] as Array<[string, number | null]>
    ).filter((entry): entry is [string, number] => entry[1] !== null);
    if (entries.length > 0) {
      entries.sort((a, b) => a[1] - b[1]);
      return entries[0][0];
    }
    return diagnostic?.weakest || user?.progress?.weakestSkill || null;
  })();

  const bandTrendSummary =
    agg.overall.trend?.status === 'up' && bandDelta !== null
      ? `Latest overall trend +${bandDelta.toFixed(1)} across ${agg.overall.sampleCount} sittings`
      : agg.overall.trend?.status === 'down' && bandDelta !== null
      ? `Latest overall trend ${bandDelta.toFixed(1)} across ${agg.overall.sampleCount} sittings`
      : overallBand !== null
      ? `Current overall Band ${overallBand.toFixed(1)}`
      : 'No verified 4-skill mock sitting yet';

  const latestExamTs = examHistory.reduce<number | null>(
    (maxTs, item) =>
      typeof item.timestamp === 'number' && (maxTs === null || item.timestamp > maxTs)
        ? item.timestamp
        : maxTs,
    null
  );
  const daysInactive = computeDaysInactive(user?.progress?.lastActiveDate, latestExamTs);
  const userName = user ? sanitizeCandidateName(user.name, user.email) : 'Candidate';

  const destinations: ProgressItem[] = [
    {
      id: 'analytics',
      path: '/progress/analytics',
      title: 'Candidate Analytics',
      shortName: 'Analytics',
      description: 'Skill-by-skill score breakdown across Listening, Reading, Writing & Speaking.',
      icon: BarChart3,
      meta: 'Band Trends'
    },
    {
      id: 'history',
      path: '/progress/history',
      title: 'Practice History',
      shortName: 'History',
      description: 'Archive of completed mock exams, drills, and AI evaluation feedback.',
      icon: History,
      meta: 'Attempt Log'
    },
    {
      id: 'saved',
      path: '/progress/saved',
      title: 'Mistake Vault',
      shortName: 'Vault',
      description: 'Spaced-repetition review queue of missed questions and weak grammar patterns.',
      icon: BookmarkCheck,
      meta: mistakeCount > 0 ? `${mistakeCount} Unmastered` : 'All Clear'
    },
    {
      id: 'calendar',
      path: '/progress/calendar',
      title: 'Sprint Calendar',
      shortName: 'Calendar',
      description: 'Daily study activity log, active streak history, and exam countdown.',
      icon: Calendar,
      meta: `${streakDays}d Streak`
    }
  ];

  const tabs: Array<{ id: ProgressTab; label: string }> = [
    { id: 'readiness', label: 'Band & Readiness' },
    { id: 'skills', label: 'Skills & Activity' },
    { id: 'tools', label: 'Quick AI & Drills' }
  ];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Unified BandSprint Pine Header */}
      <section className="rounded-2xl bg-[#0F4C45] text-white p-5 sm:p-7 border border-[#0B3833] space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#F4A62A] font-semibold">
              Progress &amp; Diagnostics · {examMode}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Track your gap to Band {targetBand.toFixed(1)}
            </h1>
            <p className="text-xs sm:text-sm text-[#EEF3F1]/80 leading-relaxed">
              Review score trends, revisit logged mistakes in your spaced-repetition vault, and keep daily momentum steady.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(620, 0.035);
                setShowPrintReport(true);
              }}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#F4A62A] hover:bg-[#D0891F] text-[#0E1F1E] font-bold text-xs transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              <span>Export Practice Report (PDF)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(600, 0.035);
                onOpenBandModal();
              }}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-xs transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Target className="w-4 h-4 text-[#F4A62A]" />
              <span>Update Target Band</span>
            </button>
          </div>
        </div>

        {/* Clean Tabular Summary Strip */}
        <div className="pt-4 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#EEF3F1]/65">
              Target Band
            </div>
            <div className="font-mono font-bold text-base text-[#F4A62A] tabular-nums">
              <AnimatedNumber value={targetBand} decimals={1} />
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#EEF3F1]/65">
              {overallSourceLabel}
            </div>
            <div className="font-mono font-bold text-base text-white tabular-nums">
              {overallBand !== null ? <AnimatedNumber value={overallBand} decimals={1} /> : 'Not assessed'}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#EEF3F1]/65">
              Mistake Vault
            </div>
            <div className="font-mono font-bold text-base text-white tabular-nums">
              <AnimatedNumber value={mistakeCount} decimals={0} /> {mistakeCount === 1 ? 'item' : 'items'}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#EEF3F1]/65">
              Current Streak
            </div>
            <div className="font-mono font-bold text-base text-white tabular-nums">
              <AnimatedNumber value={streakDays} decimals={0} /> {streakDays === 1 ? 'day' : 'days'}
            </div>
          </div>
        </div>
      </section>

      {/* Barnaby Progress Analyst (Zero Overlap, Analyzing Pose) */}
      <BarnabyCompanion
        pose="analyzing"
        screen="progress"
        userName={userName}
        currentEstimate={overallBand}
        targetBand={targetBand}
        examDate={user?.progress?.examDate || diagnostic?.examDate || null}
        daysInactive={daysInactive}
        topWeakness={progressTopWeakness}
        bandDelta={bandDelta}
        mistakeCount={mistakeCount}
        screenContext={{
          bandTrendSummary,
          skillBands,
        }}
        currentPath="/progress"
        examMode={examMode}
        compactStrip
        onNavigate={onNavigate}
      />

      {/* 4 Dedicated Progress Views */}
      <StaggerGroup className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5" stagger={0.055}>
        {destinations.map((item) => {
          const Icon = item.icon;
          return (
            <StaggerItem key={item.id}>
              <button
                type="button"
                onClick={() => {
                  soundManager.playBeep(600, 0.035);
                  onNavigate(item.path);
                }}
                className="w-full h-full p-4 rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 hover:border-[#0F4C45] dark:hover:border-[#F4A62A]/70 card-interactive text-left flex flex-col justify-between space-y-3 group cursor-pointer min-h-[136px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C45]"
              >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="w-9 h-9 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 flex items-center justify-center text-[#0F4C45] dark:text-[#F4A62A]">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-[#566664] dark:text-slate-400 tabular-nums">
                    {item.meta}
                  </span>
                </div>
                <div className="space-y-1">
                  <h2 className="font-display text-sm font-bold text-[#0E1F1E] dark:text-white group-hover:text-[#0F4C45] dark:group-hover:text-[#F4A62A] transition">
                    {item.title}
                  </h2>
                  <p className="text-xs text-[#566664] dark:text-slate-400 leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                </div>
              </div>
              <div className="text-xs font-semibold text-[#0F4C45] dark:text-[#F4A62A] flex items-center gap-1">
                <span>View {item.shortName}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
              </button>
            </StaggerItem>
          );
        })}
      </StaggerGroup>

      {/* Segmented Workspace for Embedded Diagnostic Widgets */}
      <section className="space-y-5 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D3DDDA] dark:border-[#1F8A70]/25 pb-3">
          <h2 className="font-display text-base font-bold text-[#0E1F1E] dark:text-white">
            Diagnostic Workspace
          </h2>
          <div className="inline-flex rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] p-1 border border-[#D3DDDA] dark:border-[#1F8A70]/25">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    soundManager.playBeep(560, 0.03);
                    setActiveTab(tab.id);
                  }}
                  className={`relative px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'text-white'
                      : 'text-[#566664] dark:text-slate-300 hover:text-[#0E1F1E] dark:hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="progress-workspace-tab-pill"
                      transition={SPRING_SNAPPY}
                      className="absolute inset-0 rounded-lg bg-[#0F4C45]"
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: EASE_EDITORIAL }}
          >

        {activeTab === 'readiness' && (
          <div className="space-y-5 animate-fade-in">
            <DailyBandTrendChart
              examHistory={examHistory}
              diagnostic={diagnostic}
              targetBand={targetBand}
              onNavigate={onNavigate}
            />

            <ExamReadinessCurveCard
              examDate={user?.progress?.examDate || diagnostic?.examDate || null}
              currentBand={overallBand}
              targetBand={targetBand}
              streakDays={streakDays}
              onNavigate={onNavigate}
              onOpenBandModal={onOpenBandModal}
            />

            <SmartRecommendationBanner
              onNavigate={onNavigate}
              onShowToast={onShowToast}
              targetBand={targetBand}
              estimatedBand={overallBand ?? 0}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ProgressDonutCard
                overallPercentage={overallPercentage}
                estimatedBand={overallBand}
                targetBand={targetBand}
                completedCount={agg.completedFullMockCount}
                examHistory={examHistory}
                onViewAnalytics={() => onNavigate('/progress/analytics')}
                onNavigate={onNavigate}
              />
              <AIBandScorecard
                estimatedBand={overallBand}
                targetBand={targetBand}
                overallPercentage={overallPercentage}
                skillBands={skillBands}
                onNavigate={onNavigate}
                onOpenBandModal={onOpenBandModal}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BandProjectorCard
                currentTargetBand={targetBand}
                examMode={examMode}
                onOpenBandModal={onOpenBandModal}
              />
              <MistakeVaultWidget
                onNavigate={onNavigate}
                onOpenVault={onOpenVault || (() => onNavigate('/progress/saved'))}
              />
            </div>

            {/* IELTS Examiner Rubric Breakdown & Daily Sprint Retention */}
            {(() => {
              const quotaStd = sprintState.quotaTier === 'standard';
              const vocabPct = Math.min(
                100,
                Math.round((sprintState.masteredVocabIds.length / (quotaStd ? 20 : 10)) * 100)
              );
              const grammarPct = Math.min(
                100,
                Math.round((sprintState.masteredGrammarIds.length / (quotaStd ? 6 : 4)) * 100)
              );
              const phraseIdiomPct = Math.min(
                100,
                Math.round(
                  ((sprintState.masteredIdiomIds.length + sprintState.masteredPhraseIds.length) /
                    (quotaStd ? 20 : 10)) *
                    100
                )
              );
              const spellingPct = Math.min(
                100,
                Math.round((sprintState.masteredSpellingIds.length / (quotaStd ? 40 : 20)) * 100)
              );
              const dueSrCount = sprintState.reviewQueueIds.filter((id) =>
                isReviewItemDueToday(sprintState.reviewSchedule[id])
              ).length;

              const toBandPct = (band: number | null, sprintPct: number) => {
                if (band !== null) {
                  return Math.min(100, Math.round((band / 9) * 80 + sprintPct * 0.2));
                }
                return Math.max(15, Math.min(100, Math.round(45 + sprintPct * 0.55)));
              };

              const rubricRows = [
                {
                  label: 'Lexical Resource (Vocab & Idioms)',
                  sub: `${vocabPct}% daily vocab · ${sprintState.lastExamSummary ? `${sprintState.lastExamSummary.scorePct}% mastery exam` : 'Ready for exam'}`,
                  pct: toBandPct(skillBands.writing ?? skillBands.speaking, vocabPct)
                },
                {
                  label: 'Grammatical Range & Accuracy',
                  sub: `${grammarPct}% Band 8+ rules mastered today`,
                  pct: toBandPct(skillBands.writing, grammarPct)
                },
                {
                  label: 'Coherence, Fluency & Idiomatic Delivery',
                  sub: `${phraseIdiomPct}% idioms & collocations practised`,
                  pct: toBandPct(skillBands.speaking, phraseIdiomPct)
                },
                {
                  label: 'Listening & Spelling Precision',
                  sub: `${spellingPct}% spelling targets · ${dueSrCount} due in SR recall`,
                  pct: toBandPct(skillBands.listening ?? skillBands.reading, spellingPct)
                }
              ];

              return (
                <section
                  data-testid="examiner-rubric-breakdown"
                  className="rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/35 p-5 sm:p-6 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EEF3F1] dark:border-[#1F8A70]/25">
                    <div>
                      <h3 className="font-display text-base font-bold text-[#0E1F1E] dark:text-white">
                        Examiner Rubric Breakdown &amp; Daily Retention
                      </h3>
                      <p className="text-xs text-[#566664] dark:text-slate-400">
                        Combines your assessed Band scores with today’s Daily Sprint mastery ({sprintState.pomodoroBlocksCompleted} Pomodoro blocks · {sprintState.pomodoroFocusMinutesLogged}m focus).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playBeep(540, 0.04);
                        onNavigate('/learn/daily-sprint');
                      }}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <span>Open Daily Sprint</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#F4A62A]" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {rubricRows.map((row) => (
                      <div key={row.label} className="space-y-1.5">
                        <div className="flex items-baseline justify-between gap-2 text-xs">
                          <span className="font-semibold text-[#0E1F1E] dark:text-[#EEF3F1]">
                            {row.label}
                          </span>
                          <span className="font-mono font-bold text-[#0F4C45] dark:text-[#6EE7B7] tabular-nums">
                            {row.pct}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#EEF3F1] dark:bg-[#0B1514] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#0F4C45] dark:bg-[#1F8A70] transition-all duration-300"
                            style={{ width: `${row.pct}%` }}
                          />
                        </div>
                        <div className="text-[11px] text-[#566664] dark:text-slate-400">
                          {row.sub}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })()}
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="space-y-5 animate-fade-in">
            <SkillMasteryMatrix onNavigate={onNavigate} examMode={examMode} />
            <PracticeHeatmap
              user={user}
              examHistory={examHistory}
              streakDays={streakDays}
              onNavigate={onNavigate}
              onShowToast={onShowToast}
            />
            <ExamPacingStrategyCard
              onNavigate={onNavigate}
              onShowToast={onShowToast}
            />
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="space-y-5 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AISpeakingPartnerCard
                onNavigate={onNavigate}
                onShowToast={onShowToast}
              />
              <AIWritingQuickEvaluator
                onNavigate={onNavigate}
                onShowToast={onShowToast}
              />
            </div>

            <AcademicCollocationFinder
              onNavigate={onNavigate}
              onShowToast={onShowToast}
            />

            <AITutorWidget
              userName={user?.name || 'Candidate'}
              onNavigateToAITools={() => onNavigate('/practice/ai-tools')}
              onShowToast={onShowToast}
            />
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </section>

      <PrintablePracticeReportModal
        isOpen={showPrintReport}
        onClose={() => setShowPrintReport(false)}
        user={user}
        onShowToast={onShowToast}
      />
    </div>
  );
};
