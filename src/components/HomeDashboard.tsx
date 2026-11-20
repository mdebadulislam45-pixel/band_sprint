import React, { useEffect, useMemo, useState } from 'react';
import {
  Target,
  Calendar,
  ArrowRight,
  RotateCcw,
  ClipboardCheck,
  Award,
  Zap
} from 'lucide-react';
import { UserProfile } from '../types';
import { soundManager } from '../utils/audioEffects';
import { sanitizeCandidateName } from '../utils/nameSanitizer';
import { loadDiagnosticResult } from '../services/diagnosticResultStore';
import { loadOnboardingSurvey, WEAK_SKILL_META } from '../services/onboardingSurveyStore';
import { DailySprintMissionHub } from './home/DailySprintMissionHub';
import { AIWeaknessDetector } from './home/AIWeaknessDetector';
import { HomeExtendedBlocks } from './home/HomeExtendedBlocks';
import { AnimatedNumber, FadeInSection, StaggerGroup, StaggerItem } from './common/MotionPrimitives';
import { QuickSmartDrillModal } from './daily/QuickSmartDrillModal';

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
  const [isSmartDrillOpen, setIsSmartDrillOpen] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setDiagnostic(loadDiagnosticResult());
      setSurvey(loadOnboardingSurvey());
    };
    window.addEventListener('bandsprint_cloud_sync_updated', refresh);
    window.addEventListener('bandsprint_diagnostic_saved', refresh);
    window.addEventListener('bandsprint_onboarding_survey_saved', refresh);
    return () => {
      window.removeEventListener('bandsprint_cloud_sync_updated', refresh);
      window.removeEventListener('bandsprint_diagnostic_saved', refresh);
      window.removeEventListener('bandsprint_onboarding_survey_saved', refresh);
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

  // Compute current band estimate from latest examHistory, diagnostic baseline, or onboarding self-estimate
  const currentBandEstimate = useMemo(() => {
    const history = user?.progress?.examHistory || [];
    const sorted = [...history].sort((a, b) => b.timestamp - a.timestamp);
    const latestWithBand = sorted.find((r) => typeof r.overallBand === 'number' && r.overallBand > 0);
    if (latestWithBand && typeof latestWithBand.overallBand === 'number') {
      return { value: latestWithBand.overallBand, source: 'Latest mock est.' };
    }
    if (diagnostic?.scores?.overall) {
      return { value: diagnostic.scores.overall, source: 'Diagnostic est.' };
    }
    const selfEst =
      typeof user?.progress?.currentBandEstimate === 'number'
        ? user.progress.currentBandEstimate
        : typeof survey?.currentBand === 'number'
        ? survey.currentBand
        : null;
    if (selfEst) {
      return { value: selfEst, source: 'Survey baseline' };
    }
    return null;
  }, [user?.progress?.examHistory, user?.progress?.currentBandEstimate, diagnostic, survey]);

  const weakestLabel = useMemo(() => {
    const key = diagnostic?.weakest || surveyWeakest;
    if (!key) return null;
    return WEAK_SKILL_META[key]?.label || null;
  }, [diagnostic, surveyWeakest]);

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
    return {
      label: 'Open My Study Plan',
      hint: `Starting band ${diagnostic.scores.overall.toFixed(1)} · Priority focus: ${weakestLabel} · ${dailyPaceMins} min/day.`,
      path: '/learn/study-plan',
      isResume: false
    };
  }, [diagnostic, activeSession, weakestLabel, targetBand, surveyWeakest, dailyPaceMins]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-24 md:pb-16 select-none animate-fade-in">
      {/* =====================================================================
          1. FOCUSED COMMAND HEADER (Single Dominant Focal Anchor)
      ===================================================================== */}
      <section className="rounded-2xl bg-[#0F4C45] text-white border border-[#1F8A70]/40 p-5 sm:p-7">
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
                  soundManager.playSuccess();
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
                  soundManager.playBeep(640, 0.04);
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
                  soundManager.playBeep(520, 0.04);
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
          <StaggerGroup className="grid grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-2.5 shrink-0" stagger={0.06}>
            <StaggerItem>
              <button
                type="button"
                onClick={() => {
                  soundManager.playBeep(520, 0.04);
                  onNavigate(diagnostic ? '/progress' : '/learn/diagnostic');
                }}
                className="w-full px-3.5 py-3 rounded-xl bg-[#0B3833] hover:bg-[#082B27] border border-white/10 hover:border-[#F4A62A]/40 text-left transition-all duration-150 hover:-translate-y-0.5 cursor-pointer min-h-[44px]"
                title="View Band Progress"
              >
                <div className="flex items-center gap-1.5 text-[11px] text-[#EEF3F1]/75 font-medium whitespace-nowrap">
                  <Award className="w-3.5 h-3.5 text-[#F4A62A] shrink-0" />
                  <span>Current Est.</span>
                </div>
                <div className="text-lg font-bold text-white font-mono tabular-nums mt-0.5">
                  {currentBandEstimate ? <AnimatedNumber value={currentBandEstimate.value} decimals={1} /> : '—'}
                </div>
                <div className="text-[10px] text-[#EEF3F1]/65 truncate">
                  {currentBandEstimate ? currentBandEstimate.source : 'Take diagnostic'}
                </div>
              </button>
            </StaggerItem>

            <StaggerItem>
              <button
                type="button"
                onClick={() => {
                  soundManager.playBeep(520, 0.04);
                  onOpenBandModal();
                }}
                className="w-full px-3.5 py-3 rounded-xl bg-[#0B3833] hover:bg-[#082B27] border border-white/10 hover:border-[#F4A62A]/40 text-left transition-all duration-150 hover:-translate-y-0.5 cursor-pointer min-h-[44px]"
                title="Click to edit Target Band"
              >
                <div className="flex items-center gap-1.5 text-[11px] text-[#EEF3F1]/75 font-medium whitespace-nowrap">
                  <Target className="w-3.5 h-3.5 text-[#F4A62A] shrink-0" />
                  <span>Target Band</span>
                </div>
                <div className="text-lg font-bold text-white font-mono tabular-nums mt-0.5">
                  <AnimatedNumber value={targetBand} decimals={1} />
                </div>
                <div className="text-[10px] text-[#EEF3F1]/65 truncate">Click to adjust</div>
              </button>
            </StaggerItem>

            <StaggerItem>
              <button
                type="button"
                onClick={() => {
                  soundManager.playBeep(520, 0.04);
                  onOpenBandModal();
                }}
                className="w-full px-3.5 py-3 rounded-xl bg-[#0B3833] hover:bg-[#082B27] border border-white/10 hover:border-[#F4A62A]/40 text-left transition-all duration-150 hover:-translate-y-0.5 cursor-pointer min-h-[44px]"
                title="Click to edit Exam Date"
              >
                <div className="flex items-center gap-1.5 text-[11px] text-[#EEF3F1]/75 font-medium whitespace-nowrap">
                  <Calendar className="w-3.5 h-3.5 text-[#F4A62A] shrink-0" />
                  <span>Exam Day</span>
                </div>
                <div className="text-lg font-bold text-[#F4A62A] font-mono tabular-nums mt-0.5">
                  <AnimatedNumber value={daysRemaining} decimals={0} suffix="d" />
                </div>
                <div className="text-[10px] text-[#EEF3F1]/65 truncate">Days remaining</div>
              </button>
            </StaggerItem>
          </StaggerGroup>
        </div>
      </section>

      {/* =====================================================================
          2. MAIN 12-COLUMN WORKSPACE (IELTSly.ai Action Center + Sidebar)
      ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Columns: Today's Study Sprint + Unified 4-Skill Matrix */}
        <FadeInSection immediate delay={0.08} y={10} className="lg:col-span-8 space-y-6">
          <DailySprintMissionHub
            onNavigate={onNavigate}
            onShowToast={onShowToast}
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

        {/* Right 4 Columns: Weekly Rhythm & Goal + Study Plan + Mistake Vault + Word of Day */}
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
    </div>
  );
});
