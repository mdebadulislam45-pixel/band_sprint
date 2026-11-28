import React, { useEffect, useMemo, useState } from 'react';
import {
  Target,
  Calendar,
  ArrowRight,
  RotateCcw,
  ClipboardCheck,
  Award,
  Zap,
  Flame,
  Clock
} from 'lucide-react';
import { UserProfile } from '../types';
import { audioManager } from '../services/AudioManager';
import { sanitizeCandidateName } from '../utils/nameSanitizer';
import { loadDiagnosticResult } from '../services/diagnosticResultStore';
import { loadOnboardingSurvey, WEAK_SKILL_META } from '../services/onboardingSurveyStore';
import { AIWeaknessDetector } from './home/AIWeaknessDetector';
import { HomeExtendedBlocks } from './home/HomeExtendedBlocks';
import { BarnabyCompanion } from './BarnabyCompanion';
import { AnimatedNumber, FadeInSection, StaggerGroup, StaggerItem } from './common/MotionPrimitives';
import { QuickSmartDrillModal } from './daily/QuickSmartDrillModal';
import { aggregateExamHistory, validateOptionalHalfBand } from '../utils/historyAggregation';
import { computeDaysInactive } from '../utils/getBarnabyState';
import { getCompletedMissionsToday, getStreakState } from '../services/streakService';
import { getMistakes } from '../utils/vaultStorage';
import { getTopWeakness, TOP_WEAKNESS_UPDATED_EVENT } from '../utils/userStorage';
import {
  DAILY_SPRINT_SYNCED_EVENT,
  getTodayDateKey,
  loadDailySprintProgress
} from '../utils/dailySprintProgressStore';
import {
  computeSmartSprintBrief,
  getRotatedDailySprintPools
} from '../utils/smartSprintEngine';
import {
  ADAPTIVE_DIFFICULTY_UPDATED_EVENT,
  computeSmartSprintIntelligence,
  DifficultyModePreference,
  loadDifficultyPreference
} from '../utils/adaptiveLearningPath';
import { SprintVelocityCard } from './home/SprintVelocityCard';
import { DailySprintProgressRingCard } from './home/DailySprintProgressRingCard';
import { AISmartCoachCard } from './home/AISmartCoachCard';
import { SmartSprintIntelligenceOverlay } from './daily/SmartSprintIntelligenceOverlay';

interface HomeDashboardProps {
  user?: UserProfile | null;
  onNavigate: (path: string) => void;
  onShowToast: (msg: string) => void;
  onOpenBandModal: () => void;
  examMode?: 'Academic' | 'General Training';
}

export const HomeDashboard: React.FC<HomeDashboardProps> = React.memo(({
  user,
  onNavigate,
  onShowToast,
  onOpenBandModal,
  examMode
}) => {
  const sanitizedFirstName = user ? sanitizeCandidateName(user.name, user.email) : 'Candidate';
  const [diagnostic, setDiagnostic] = useState(() => loadDiagnosticResult());
  const [survey, setSurvey] = useState(() => loadOnboardingSurvey());
  const [streakState, setStreakState] = useState(() => getStreakState());
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>(() => getCompletedMissionsToday());
  const [storedTopWeakness, setStoredTopWeakness] = useState<string | null>(() => getTopWeakness());
  const [sprintProgress, setSprintProgress] = useState(() => loadDailySprintProgress());
  const [difficultyPref, setDifficultyPref] = useState<DifficultyModePreference>(() =>
    loadDifficultyPreference()
  );
  const [vaultVersion, setVaultVersion] = useState<number>(0);
  const [isSmartDrillOpen, setIsSmartDrillOpen] = useState(false);
  const [isIntelligenceOverlayOpen, setIsIntelligenceOverlayOpen] = useState(false);

  const smartBrief = useMemo(
    () => computeSmartSprintBrief(user, sprintProgress),
    [sprintProgress, user, vaultVersion]
  );

  const sprintIntelligence = useMemo(
    () =>
      computeSmartSprintIntelligence(sprintProgress, {
        user,
        streakState,
        difficultyPreference: difficultyPref
      }),
    [difficultyPref, sprintProgress, streakState, user, vaultVersion]
  );

  const adaptivePools = useMemo(
    () =>
      getRotatedDailySprintPools(sprintProgress.quotaTier, getTodayDateKey(), 0, {
        difficultyTier: sprintIntelligence.activeDifficulty,
        reviewSchedule: sprintProgress.reviewSchedule
      }),
    [sprintIntelligence.activeDifficulty, sprintProgress.quotaTier, sprintProgress.reviewSchedule, vaultVersion]
  );

  useEffect(() => {
    const refresh = () => {
      setDiagnostic(loadDiagnosticResult());
      setSurvey(loadOnboardingSurvey());
      const nextStreak = getStreakState();
      setStreakState(nextStreak);
      setCompletedTaskIds(getCompletedMissionsToday(nextStreak));
      setStoredTopWeakness(getTopWeakness());
      setSprintProgress(loadDailySprintProgress());
      setDifficultyPref(loadDifficultyPreference());
      setVaultVersion((v) => v + 1);
    };
    window.addEventListener('bandsprint_cloud_sync_updated', refresh);
    window.addEventListener('bandsprint_diagnostic_saved', refresh);
    window.addEventListener('bandsprint_onboarding_survey_saved', refresh);
    window.addEventListener('bandsprint_streak_updated', refresh);
    window.addEventListener('bandsprint_tasks_updated', refresh);
    window.addEventListener(DAILY_SPRINT_SYNCED_EVENT, refresh);
    window.addEventListener(TOP_WEAKNESS_UPDATED_EVENT, refresh);
    window.addEventListener('vault_updated', refresh);
    window.addEventListener(ADAPTIVE_DIFFICULTY_UPDATED_EVENT, refresh);
    return () => {
      window.removeEventListener('bandsprint_cloud_sync_updated', refresh);
      window.removeEventListener('bandsprint_diagnostic_saved', refresh);
      window.removeEventListener('bandsprint_onboarding_survey_saved', refresh);
      window.removeEventListener('bandsprint_streak_updated', refresh);
      window.removeEventListener('bandsprint_tasks_updated', refresh);
      window.removeEventListener(DAILY_SPRINT_SYNCED_EVENT, refresh);
      window.removeEventListener(TOP_WEAKNESS_UPDATED_EVENT, refresh);
      window.removeEventListener('vault_updated', refresh);
      window.removeEventListener(ADAPTIVE_DIFFICULTY_UPDATED_EVENT, refresh);
    };
  }, []);

  const targetBand = diagnostic?.targetBand || user?.progress?.targetBand || survey?.targetBand || 7.5;
  const testDate = diagnostic?.examDate || user?.progress?.examDate || survey?.examDate || '';
  const activeSession = user?.progress?.activeSession;
  const intendedFormat =
    examMode || diagnostic?.examType || user?.progress?.intendedFormat || survey?.examTrack || 'Academic';
  const surveyWeakest = user?.progress?.weakestSkill || survey?.weakestSkill || null;
  const dailyPaceMins = diagnostic?.dailyMinutes || user?.progress?.dailyMinutes || survey?.dailyMinutes || 30;

  // Calculate days remaining until exam
  const daysRemaining = useMemo(() => {
    if (!testDate) return 42;
    try {
      const exam = new Date(testDate);
      const now = new Date();
      const diff = exam.getTime() - now.getTime();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return isNaN(days) || days < 0 ? 42 : days;
    } catch {
      return 42;
    }
  }, [testDate]);

  // Compute current band estimate strictly from verified 4-skill Full Mocks, valid diagnostic baseline, or valid self-estimate
  const currentBandEstimate = useMemo(() => {
    const agg = aggregateExamHistory(user?.progress?.examHistory || []);
    if (agg.overall.latest !== null) {
      return { value: agg.overall.latest, source: 'Latest full mock' };
    }
    const diagOverall = validateOptionalHalfBand(diagnostic?.scores?.overall, 1.0);
    if (diagOverall !== null) {
      return { value: diagOverall, source: 'Diagnostic' };
    }
    const selfEst =
      validateOptionalHalfBand(user?.progress?.currentBandEstimate, 1.0) ??
      validateOptionalHalfBand(survey?.currentBand, 1.0);
    if (selfEst !== null) {
      return { value: selfEst, source: 'Survey est.' };
    }
    return null;
  }, [user?.progress?.examHistory, user?.progress?.currentBandEstimate, diagnostic, survey]);

  const weakestLabel = useMemo(() => {
    const key = diagnostic?.weakest || surveyWeakest;
    if (!key) return null;
    return WEAK_SKILL_META[key]?.label || null;
  }, [diagnostic, surveyWeakest]);

  const topWeakness = useMemo(() => {
    if (storedTopWeakness) {
      return storedTopWeakness;
    }
    try {
      const unresolved = getMistakes().filter((m) => !m.mastered);
      if (unresolved.length > 0) {
        const counts = new Map<string, number>();
        for (const item of unresolved) {
          const label = (item.questionType || item.module || '').trim();
          if (!label) continue;
          counts.set(label, (counts.get(label) || 0) + 1);
        }
        let bestLabel: string | null = null;
        let bestCount = 0;
        counts.forEach((count, label) => {
          if (count > bestCount) {
            bestCount = count;
            bestLabel = label;
          }
        });
        if (bestLabel) return bestLabel;
      }
    } catch {
      // ignore storage errors
    }
    return weakestLabel;
  }, [storedTopWeakness, weakestLabel, completedTaskIds.length]);

  const daysInactive = useMemo(() => {
    const history = user?.progress?.examHistory || [];
    const latestExamTs = history.reduce<number | null>(
      (maxTs, item) =>
        typeof item.timestamp === 'number' && (maxTs === null || item.timestamp > maxTs)
          ? item.timestamp
          : maxTs,
      null
    );
    return computeDaysInactive(streakState.lastActiveDate, latestExamTs);
  }, [streakState.lastActiveDate, user?.progress?.examHistory]);

  const allDailyTasksCompleted = completedTaskIds.length >= 3;
  const { unresolvedMistakeCount, topMistakeTopics } = useMemo(() => {
    try {
      const unresolved = getMistakes().filter((m) => !m.mastered);
      const topicCounts = new Map<string, number>();
      for (const item of unresolved) {
        const label = (item.questionType || item.module || '').trim();
        if (!label) continue;
        topicCounts.set(label, (topicCounts.get(label) || 0) + 1);
      }
      const sortedTopics = Array.from(topicCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([label]) => label);
      return {
        unresolvedMistakeCount: unresolved.length,
        topMistakeTopics: sortedTopics
      };
    } catch {
      return { unresolvedMistakeCount: 0, topMistakeTopics: [] };
    }
  }, [completedTaskIds.length, vaultVersion]);

  // Primary action decision: Diagnostic first (contextualized to survey goals), or Priority Weak Skill / Resume / Study Plan
  const primaryHeroAction = useMemo(() => {
    if (!diagnostic) {
      if (surveyWeakest) {
        const meta = WEAK_SKILL_META[surveyWeakest];
        return {
          label: meta.actionLabel,
          hint: `Aiming for Band ${targetBand.toFixed(1)} · Priority #1: ${meta.label} · ${dailyPaceMins} min/day plan ready.`,
          path: meta.route,
          isResume: false
        };
      }
      return {
        label: 'Start 10-min Diagnostic',
        hint: `Get your starting band across all 4 skills and lock in your Band ${targetBand.toFixed(1)} study plan.`,
        path: '/learn/diagnostic',
        isResume: false
      };
    }
    if (activeSession?.title && activeSession?.module) {
      return {
        label: `Resume ${activeSession.title}`,
        hint: activeSession.subtitle || `Focus area: ${weakestLabel || 'Daily Sprint'} · Target Band ${targetBand.toFixed(1)}.`,
        path: activeSession.module,
        isResume: true
      };
    }
    const diagBand = validateOptionalHalfBand(diagnostic.scores?.overall, 1.0);
    return {
      label: 'Open My Study Plan',
      hint: `${diagBand !== null ? `Starting band ${diagBand.toFixed(1)}` : 'Diagnostic baseline recorded'} · Priority focus: ${weakestLabel || 'All skills'} · ${dailyPaceMins} min/day.`,
      path: '/learn/study-plan',
      isResume: false
    };
  }, [diagnostic, activeSession, weakestLabel, targetBand, surveyWeakest, dailyPaceMins]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-24 md:pb-16 select-none animate-fade-in">
      {/* =====================================================================
          1. FOCUSED COMMAND HEADER (Single Dominant Focal Anchor)
      ===================================================================== */}
      <section
        data-testid="daily-command-center-hero"
        className="rounded-2xl bg-[#0F4C45] text-white border border-[#1F8A70]/40 p-5 sm:p-7"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Greeting + Next Best Action */}
          <div className="space-y-3 max-w-2xl">
            <p className="text-xs font-medium text-[#EEF3F1]/80">
              {intendedFormat} Track · Daily Command Center
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Welcome back, {sanitizedFirstName}
            </h1>
            <p className="text-xs sm:text-sm text-[#EEF3F1]/85 leading-relaxed max-w-xl">
              {primaryHeroAction.hint}
            </p>

            <div className="pt-1 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  audioManager.playUiClick('check');
                  onNavigate(primaryHeroAction.path);
                }}
                className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#F4A62A] hover:bg-[#d98f1d] active:scale-[0.99] text-[#0E1F1E] font-bold text-sm transition flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                {primaryHeroAction.isResume ? (
                  <RotateCcw className="w-4 h-4 shrink-0" />
                ) : (
                  <ArrowRight className="w-4 h-4 shrink-0" />
                )}
                <span>{primaryHeroAction.label}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  audioManager.playUiClick('soft');
                  setIsSmartDrillOpen(true);
                }}
                className="min-h-[46px] px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/20 border border-[#F4A62A]/45 text-white font-semibold text-sm transition flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <Zap className="w-4 h-4 text-[#F4A62A] shrink-0" />
                <span>5-Min Smart Drill</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  audioManager.playUiClick('soft');
                  onNavigate('/practice/mock-tests');
                }}
                className="min-h-[46px] px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-sm transition flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <ClipboardCheck className="w-4 h-4 text-[#F4A62A] shrink-0" />
                <span>5 Full Mock Tests</span>
              </button>
            </div>
          </div>

          {/* Right: Clean Tabular Band & Countdown Metrics */}
          <StaggerGroup className="grid grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-2 sm:gap-2.5 shrink-0" stagger={0.06}>
            <StaggerItem>
              <button
                type="button"
                onClick={() => {
                  audioManager.playUiClick('soft');
                  onNavigate(diagnostic ? '/progress' : '/learn/diagnostic');
                }}
                className="w-full px-2.5 sm:px-3.5 py-3 rounded-xl bg-[#0B3833] hover:bg-[#082B27] border border-white/10 hover:border-[#F4A62A]/40 text-left transition-all duration-150 hover:-translate-y-0.5 cursor-pointer min-h-[44px]"
                title="View Band Progress"
              >
                <div className="flex items-center gap-1 text-[11px] text-[#EEF3F1]/75 font-medium whitespace-nowrap">
                  <Award className="w-3.5 h-3.5 text-[#F4A62A] shrink-0" />
                  <span>Current Est.</span>
                </div>
                <div className="text-lg font-bold text-white font-mono tabular-nums mt-0.5">
                  {currentBandEstimate ? <AnimatedNumber value={currentBandEstimate.value} decimals={1} /> : '—'}
                </div>
                <div className="text-[10px] text-[#EEF3F1]/65 whitespace-nowrap">
                  {currentBandEstimate ? currentBandEstimate.source : 'Not assessed'}
                </div>
              </button>
            </StaggerItem>

            <StaggerItem>
              <button
                type="button"
                onClick={() => {
                  audioManager.playUiClick('soft');
                  onOpenBandModal();
                }}
                className="w-full px-2.5 sm:px-3.5 py-3 rounded-xl bg-[#0B3833] hover:bg-[#082B27] border border-white/10 hover:border-[#F4A62A]/40 text-left transition-all duration-150 hover:-translate-y-0.5 cursor-pointer min-h-[44px]"
                title="Click to edit Target Band"
              >
                <div className="flex items-center gap-1 text-[11px] text-[#EEF3F1]/75 font-medium whitespace-nowrap">
                  <Target className="w-3.5 h-3.5 text-[#F4A62A] shrink-0" />
                  <span>Target Band</span>
                </div>
                <div className="text-lg font-bold text-white font-mono tabular-nums mt-0.5">
                  <AnimatedNumber value={targetBand} decimals={1} />
                </div>
                <div className="text-[10px] text-[#EEF3F1]/65 whitespace-nowrap">Tap to set</div>
              </button>
            </StaggerItem>

            <StaggerItem>
              <button
                type="button"
                onClick={() => {
                  audioManager.playUiClick('soft');
                  onOpenBandModal();
                }}
                className="w-full px-2.5 sm:px-3.5 py-3 rounded-xl bg-[#0B3833] hover:bg-[#082B27] border border-white/10 hover:border-[#F4A62A]/40 text-left transition-all duration-150 hover:-translate-y-0.5 cursor-pointer min-h-[44px]"
                title="Click to edit Exam Date"
              >
                <div className="flex items-center gap-1 text-[11px] text-[#EEF3F1]/75 font-medium whitespace-nowrap">
                  <Calendar className="w-3.5 h-3.5 text-[#F4A62A] shrink-0" />
                  <span>Exam Day</span>
                </div>
                <div className="text-lg font-bold text-[#F4A62A] font-mono tabular-nums mt-0.5">
                  <AnimatedNumber value={daysRemaining} decimals={0} suffix="d" />
                </div>
                <div className="text-[10px] text-[#EEF3F1]/65 whitespace-nowrap">Days left</div>
              </button>
            </StaggerItem>
          </StaggerGroup>
        </div>
      </section>

      {/* =====================================================================
          1.5 BARNABY BRIEFING STRIP (Text-only on Home; rig lives in FloatingBarnaby)
      ===================================================================== */}
      <FadeInSection immediate delay={0.04} y={8}>
        <BarnabyCompanion
          screen="home"
          userName={sanitizedFirstName}
          currentEstimate={currentBandEstimate ? currentBandEstimate.value : null}
          targetBand={targetBand}
          examDate={testDate || null}
          daysRemaining={daysRemaining}
          daysInactive={daysInactive}
          allDailyTasksCompleted={allDailyTasksCompleted}
          topWeakness={topWeakness}
          mistakeCount={unresolvedMistakeCount}
          currentPath="/"
          examMode={intendedFormat}
          compactStrip
          hideRig
          onNavigate={onNavigate}
        />
      </FadeInSection>

      {/* =====================================================================
          2. MAIN 12-COLUMN WORKSPACE (Compact Daily Sprint Launcher + 4-Skill Matrix + Right Sidebar)
      ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Columns: Executive Daily Sprint Launcher Card + Unified 4-Skill Matrix */}
        <FadeInSection immediate delay={0.08} y={10} className="lg:col-span-8 space-y-6">
          <section
            data-testid="home-daily-sprint-launcher"
            className="rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/35 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start sm:items-center gap-4 min-w-0">
              {/* Homescreen App Icon Shortcut for Daily Sprint */}
              <button
                type="button"
                data-testid="homescreen-daily-sprint-icon"
                onClick={() => {
                  audioManager.playUiClick('check');
                  onNavigate('/learn/daily-sprint');
                }}
                className="group flex flex-col items-center gap-1 shrink-0 cursor-pointer focus-visible:outline-none"
                title="Tap to practise Daily IELTS Sprint"
                aria-label="Open Daily Sprint Hub"
              >
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-[#1F8A70]/40 bg-[#0F4C45] shadow-xs group-hover:-translate-y-0.5 transition-transform">
                  <img
                    src="/daily-sprint-icon.svg"
                    alt="Daily IELTS Sprint"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-[10px] font-bold tracking-tight text-[#0F4C45] dark:text-[#6EE7B7]">
                  Daily Sprint
                </span>
              </button>

              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono text-[#566664] dark:text-slate-400">
                  <span className="font-bold uppercase tracking-wide text-[#0F4C45] dark:text-[#6EE7B7] inline-flex items-center gap-1">
                    <Flame className="w-3 h-3 text-[#F4A62A]" />
                    <span>Smart Pomodoro Hub</span>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {sprintProgress.pomodoroBlocksCompleted} blocks · {sprintProgress.pomodoroFocusMinutesLogged}m today
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums font-semibold text-[#0F4C45] dark:text-[#6EE7B7]">
                    {smartBrief.todayReadinessPct}% ready
                  </span>
                  {smartBrief.dueReviewCount > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-[#9B6314] dark:text-[#F4A62A]">
                        {smartBrief.dueReviewCount} due review
                      </span>
                    </>
                  )}
                </div>
                <h2 className="font-display text-base sm:text-lg font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                  Daily IELTS Sprint, 5 Bangla Targets &amp; Mastery Exam
                </h2>
                <p className="text-xs text-[#566664] dark:text-slate-400 leading-relaxed">
                  {smartBrief.coachHeadline}
                </p>
              </div>
            </div>

            <button
              type="button"
              data-testid="open-daily-sprint-page-btn"
              onClick={() => {
                audioManager.playUiClick('check');
                onNavigate('/learn/daily-sprint');
              }}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white font-bold text-xs sm:text-sm transition inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Open Daily Sprint</span>
              <ArrowRight className="w-4 h-4 text-[#F4A62A]" />
            </button>
          </section>

          <DailySprintProgressRingCard
            onNavigate={onNavigate}
            onShowToast={onShowToast}
            weakestSkillLabel={weakestLabel}
            unresolvedMistakes={unresolvedMistakeCount}
          />

          <AISmartCoachCard
            candidateName={sanitizedFirstName}
            examTrack={intendedFormat}
            currentBand={currentBandEstimate ? currentBandEstimate.value : null}
            targetBand={targetBand}
            daysRemaining={daysRemaining}
            weakestSkill={topWeakness}
            unresolvedMistakes={unresolvedMistakeCount}
            topMistakeTopics={topMistakeTopics}
            todayCompletedTasks={completedTaskIds.length}
            todayTotalTasks={4}
            streakDays={Math.max(streakState.currentStreak, user?.progress?.streakDays || 0)}
            onNavigate={onNavigate}
          />

          <SprintVelocityCard
            intelligence={sprintIntelligence}
            adaptivePath={adaptivePools.adaptivePath}
            onOpenIntelligenceOverlay={() => setIsIntelligenceOverlayOpen(true)}
            onNavigate={onNavigate}
          />

          <HomeExtendedBlocks
            section="skills"
            user={user}
            diagnostic={diagnostic}
            targetBand={targetBand}
            onNavigate={onNavigate}
            onShowToast={onShowToast}
          />
        </FadeInSection>

        {/* Right 4 Columns: Weekly Momentum + Study Plan + Mistake Vault + Word of Day */}
        <FadeInSection immediate delay={0.14} y={10} className="lg:col-span-4 space-y-6">
          <HomeExtendedBlocks
            section="sidebar"
            user={user}
            diagnostic={diagnostic}
            targetBand={targetBand}
            onNavigate={onNavigate}
            onShowToast={onShowToast}
          />
        </FadeInSection>
      </div>

      {/* =====================================================================
          3. TARGETED EXAM TRAP GUIDE (Prioritized to Weakest Skill)
      ===================================================================== */}
      <section>
        <AIWeaknessDetector
          onNavigate={onNavigate}
          onShowToast={onShowToast}
          weakestSkill={diagnostic?.weakest}
        />
      </section>

      <QuickSmartDrillModal
        isOpen={isSmartDrillOpen}
        onClose={() => setIsSmartDrillOpen(false)}
        onShowToast={onShowToast}
      />

      <SmartSprintIntelligenceOverlay
        isOpen={isIntelligenceOverlayOpen}
        onClose={() => setIsIntelligenceOverlayOpen(false)}
        intelligence={sprintIntelligence}
        adaptivePath={adaptivePools.adaptivePath}
        topVocabItems={adaptivePools.vocabulary}
        topGrammarRules={adaptivePools.grammar}
        onDifficultyApplied={(pref) => setDifficultyPref(pref)}
        onNavigate={onNavigate}
        onShowToast={onShowToast}
      />
    </div>
  );
});
