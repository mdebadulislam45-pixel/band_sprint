import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Headphones,
  BookOpen,
  Mic,
  PenTool,
  ArrowRight,
  ChevronRight,
  Target,
  Flame,
  Clock,
  CheckCircle2,
  Zap,
  History,
  LayoutGrid,
  Layers,
  BarChart3,
  ShieldAlert,
  ShieldCheck,
  Briefcase,
  Crown,
  Sparkles
} from 'lucide-react';
import { UserProfile } from '../types';
import { soundManager } from '../utils/audioEffects';
import { sanitizeCandidateName } from '../utils/nameSanitizer';
import { getMistakes, getVaultRetentionStats } from '../utils/vaultStorage';
import { isFullMockExamRecord } from '../utils/userStorage';
import { LondonSunsetHeroBanner } from './home/LondonSunsetHeroBanner';
import { SmartRecommendationBanner } from './home/SmartRecommendationBanner';
import { AIBandScorecard } from './home/AIBandScorecard';
import { AISpeakingPartnerCard } from './home/AISpeakingPartnerCard';
import { AIWritingQuickEvaluator } from './home/AIWritingQuickEvaluator';
import { AIWeaknessDetector } from './home/AIWeaknessDetector';
import { DailyGoalMomentumCard } from './home/DailyGoalMomentumCard';
import { AITutorWidget } from './home/AITutorWidget';
import { ProgressDonutCard } from './home/ProgressDonutCard';
import { QuickActionsCard } from './home/QuickActionsCard';
import { DailySprintMissionHub } from './home/DailySprintMissionHub';
import { SkillMasteryMatrix } from './home/SkillMasteryMatrix';
import { LearningToolsCard } from './home/LearningToolsCard';
import { AdvancedLabsDock } from './home/AdvancedLabsDock';
import { BandProjectorCard } from './home/BandProjectorCard';
import { MistakeVaultWidget } from './home/MistakeVaultWidget';
import { ExamPacingStrategyCard } from './home/ExamPacingStrategyCard';
import { AcademicCollocationFinder } from './home/AcademicCollocationFinder';
import { PracticeHeatmap } from './home/PracticeHeatmap';
import { CommercialFooter } from './commercial/CommercialFooter';

interface HomeDashboardProps {
  user?: UserProfile | null;
  onNavigate: (module: string) => void;
  onShowToast: (msg: string) => void;
  onOpenBandModal: () => void;
  examMode?: 'Academic' | 'General Training';
}

type DashboardViewFilter = 'overview' | 'skills' | 'labs' | 'strategy';

export const HomeDashboard: React.FC<HomeDashboardProps> = React.memo(({
  user,
  onNavigate,
  onShowToast,
  onOpenBandModal,
  examMode: propExamMode
}) => {
  const [examMode, setExamMode] = useState<'Academic' | 'General Training'>(() => {
    if (propExamMode) return propExamMode;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ielts_exam_mode');
      if (stored === 'Academic' || stored === 'General Training') return stored;
    }
    return user?.progress?.intendedFormat || 'Academic';
  });

  const [viewFilter, setViewFilter] = useState<DashboardViewFilter>('overview');
  const [unmasteredMistakeCount, setUnmasteredMistakeCount] = useState<number>(0);
  const [sm2Stats, setSm2Stats] = useState(() => getVaultRetentionStats());

  useEffect(() => {
    if (propExamMode) setExamMode(propExamMode);
  }, [propExamMode]);

  useEffect(() => {
    const handleModeChange = (e: any) => {
      if (e.detail) setExamMode(e.detail);
    };
    window.addEventListener('ielts_exam_mode_changed', handleModeChange);
    return () => window.removeEventListener('ielts_exam_mode_changed', handleModeChange);
  }, []);

  useEffect(() => {
    const syncMistakes = () => {
      const list = getMistakes();
      setUnmasteredMistakeCount(list.filter((m) => !m.mastered).length);
      setSm2Stats(getVaultRetentionStats());
    };
    syncMistakes();
    window.addEventListener('vault_updated', syncMistakes);
    window.addEventListener('ielts_mistakes_updated', syncMistakes);
    return () => {
      window.removeEventListener('vault_updated', syncMistakes);
      window.removeEventListener('ielts_mistakes_updated', syncMistakes);
    };
  }, []);

  const sanitizedFirstName = user ? sanitizeCandidateName(user.name, user.email) : 'Candidate';
  const streakDays = user?.progress?.streakDays || 1;
  const targetBand = user?.progress?.targetBand || 7.5;
  const testDate = user?.progress?.examDate || 'Sep 20, 2025';
  const completedModules = user?.progress?.completedModules || [];
  // examHistory is stored newest-first via unshift()
  const examHistory = user?.progress?.examHistory || [];
  const recentHistory = examHistory.slice(0, 3);
  const activeSession = user?.progress?.activeSession;

  // Compute realistic readiness metrics from user's actual full-mock or practice exam history
  // Never fabricate a fake Band 6.6 when the user has completed 0 assessments
  const { estimatedBand, overallPercentage, hasAssessedBand } = useMemo(() => {
    const fullMockHistory = examHistory.filter(
      (rec) => isFullMockExamRecord(rec) && typeof rec.overallBand === 'number' && rec.overallBand > 0
    );
    if (fullMockHistory.length > 0) {
      const avg =
        fullMockHistory.reduce((acc, rec) => acc + (rec.overallBand || 6.5), 0) /
        fullMockHistory.length;
      const rounded = Math.round(avg * 2) / 2;
      const pct = Math.min(98, Math.max(25, Math.round((rounded / targetBand) * 85)));
      return { estimatedBand: rounded, overallPercentage: pct, hasAssessedBand: true };
    }
    const anyScoredExam = examHistory.filter(
      (rec) =>
        (typeof rec.overallBand === 'number' && rec.overallBand > 0) ||
        (typeof rec.listeningBand === 'number' && rec.listeningBand > 0) ||
        (typeof rec.readingBand === 'number' && rec.readingBand > 0)
    );
    if (anyScoredExam.length > 0) {
      const scores = anyScoredExam.map(
        (r) => r.overallBand || r.readingBand || r.listeningBand || 6.0
      );
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const rounded = Math.round(avg * 2) / 2;
      const pct = Math.min(95, Math.max(20, Math.round((rounded / targetBand) * 80)));
      return { estimatedBand: rounded, overallPercentage: pct, hasAssessedBand: true };
    }
    const moduleProgressPct = Math.min(85, Math.round((completedModules.length / 14) * 100));
    return { estimatedBand: 0, overallPercentage: moduleProgressPct, hasAssessedBand: false };
  }, [examHistory, completedModules.length, targetBand]);

  const toggleExamTrack = useCallback(() => {
    setExamMode((prevMode) => {
      const next = prevMode === 'Academic' ? 'General Training' : 'Academic';
      soundManager.playBeep(600, 0.04);
      try {
        localStorage.setItem('ielts_exam_mode', next);
      } catch {}
      window.dispatchEvent(new CustomEvent('ielts_exam_mode_changed', { detail: next }));
      onShowToast(`Switched curriculum to IELTS ${next}`);
      return next;
    });
  }, [onShowToast]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-5 pb-40 sm:pb-32 select-none">
      {/* 1. Compact Time-Reactive Greeting & Collocation Banner */}
      <LondonSunsetHeroBanner
        userName={sanitizedFirstName}
        targetBand={targetBand}
        testDate={testDate}
        streakDays={streakDays}
        onContinueLearning={() => onNavigate('practice')}
        onTakeDiagnostic={() => onNavigate('cdielts')}
        onOpenBandModal={onOpenBandModal}
      />

      {/* High-Clarity Editorial Action Bento: Cambridge AI Speaking Studio & CD-IELTS Exam Suite */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Single Unified Cambridge AI Speaking Studio Bento Card */}
        <AISpeakingPartnerCard
          onNavigate={onNavigate}
          onShowToast={onShowToast}
        />

        {/* Card 2: Computer-Delivered IELTS Practice Suite & Cambridge Library */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0E1526] border border-stone-200/90 dark:border-slate-800/90 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Official Exam Simulation</span>
              <span aria-hidden="true">·</span>
              <span>Cambridge Books 11–21</span>
              <span aria-hidden="true">·</span>
              <span>Timed Conditions</span>
            </div>
            <h3 className="font-display text-lg sm:text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
              CD-IELTS Exam Room & Authentic Tests
            </h3>
            <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Practise with split-screen passages, text highlighting, live timer warnings, and full Cambridge Books 11–21 simulations.
            </p>
          </div>

          <div className="pt-2 border-t border-stone-100 dark:border-slate-800/80 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(560, 0.03);
                window.dispatchEvent(new CustomEvent('open_cdielts_preflight', { detail: { module: 'listening' } }));
              }}
              className="flex-1 min-h-[42px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span>CD-IELTS Exam Room</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(560, 0.03);
                onNavigate('cambridge');
              }}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-[#FAF8F5] hover:bg-stone-200/60 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-stone-200/90 dark:border-slate-700 font-semibold text-xs text-slate-800 dark:text-slate-200 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              <span>Cambridge 11–21</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. AI Smart Recommendation Banner */}
      <SmartRecommendationBanner
        onNavigate={onNavigate}
        onShowToast={onShowToast}
        targetBand={targetBand}
        estimatedBand={hasAssessedBand ? estimatedBand : 0}
      />

      {/* Uncalibrated Candidate Diagnostic CTA Strip (Shown when candidate has not completed a diagnostic or mock test) */}
      {!hasAssessedBand && (
        <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold">
              <span>Baseline Uncalibrated</span>
              <span aria-hidden="true">·</span>
              <span>Current Estimated Band: Not Yet Assessed</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400">Target Band: {targetBand.toFixed(1)}</span>
            </div>
            <p className="text-xs text-slate-300">
              Complete a real diagnostic or mock assessment to calibrate your personal IELTS band profile across Listening, Reading, Writing, and Speaking.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(600, 0.04);
              onNavigate('mocktest');
            }}
            className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition shrink-0 cursor-pointer shadow-xs whitespace-nowrap"
          >
            Take 15-Minute Diagnostic Mock to Reveal Your Band →
          </button>
        </div>
      )}

      {/* 3. Executive Command KPI Strip (4 Interactive Status Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Target vs Current Trajectory */}
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(560, 0.04);
            onOpenBandModal();
          }}
          className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#0E1526] border border-stone-200/90 dark:border-slate-800/90 hover:border-blue-500 dark:hover:border-blue-500 transition flex items-center justify-between gap-2.5 text-left group shadow-2xs cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {hasAssessedBand ? 'Current vs Target Band' : 'Baseline Uncalibrated'}
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate font-mono tabular-nums mt-0.5">
                {hasAssessedBand ? `Band ${estimatedBand.toFixed(1)}` : 'Band: Not Yet Assessed'}{' '}
                <span className="text-slate-400 font-normal">→</span>{' '}
                <span className="text-blue-700 dark:text-blue-400">Target {targetBand.toFixed(1)}</span>
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition shrink-0" />
        </button>

        {/* KPI 2: Cambridge AI Speaking Studio Direct Launch */}
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(600, 0.04);
            onNavigate('speaking');
          }}
          className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#0E1526] border border-stone-200/90 dark:border-slate-800/90 hover:border-indigo-500 dark:hover:border-indigo-500 transition flex items-center justify-between gap-2.5 text-left group shadow-2xs cursor-pointer"
          title="Open Cambridge AI Speaking Studio"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Mic className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Speaking Studio
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5">
                Parts 1–3 Live
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 group-hover:underline shrink-0">
            Enter →
          </span>
        </button>

        {/* KPI 3: CD-IELTS Exam Simulator Direct Launch */}
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(620, 0.04);
            onNavigate('cdielts');
          }}
          className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#0E1526] border border-stone-200/90 dark:border-slate-800/90 hover:border-emerald-500 dark:hover:border-emerald-500 transition flex items-center justify-between gap-2.5 text-left group shadow-2xs cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Exam Simulator
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5">
                CD-IELTS Mode
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition shrink-0" />
        </button>

        {/* KPI 4: Mistake Vault Status (SuperMemo SM-2) */}
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(540, 0.04);
            window.dispatchEvent(new CustomEvent('open_vault_modal'));
          }}
          className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#0E1526] border border-stone-200/90 dark:border-slate-800/90 hover:border-amber-500 dark:hover:border-amber-500 transition flex items-center justify-between gap-2.5 text-left group shadow-2xs cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                sm2Stats.dueCount > 0 || unmasteredMistakeCount > 0
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {sm2Stats.dueCount > 0 || unmasteredMistakeCount > 0 ? (
                <ShieldAlert className="w-4 h-4" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                SM-2 Recall ({sm2Stats.retentionRate}%)
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5 font-mono tabular-nums">
                {sm2Stats.dueCount > 0
                  ? `${sm2Stats.dueCount} Due Today`
                  : unmasteredMistakeCount > 0
                  ? `${unmasteredMistakeCount} Learning`
                  : '100% Mastered'}
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition shrink-0" />
        </button>
      </div>

      {/* 3. Segmented Dashboard View Filter Bar */}
      <div className="flex items-center justify-between gap-3 border-b border-stone-200/80 dark:border-slate-800/80 pb-3 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-200/60 dark:bg-slate-900/90 border border-stone-200/80 dark:border-slate-800">
          {[
            { id: 'overview', label: 'Action Overview', icon: LayoutGrid },
            { id: 'skills', label: '4 Core Skills & AI Examiners', icon: Headphones },
            { id: 'labs', label: 'Interactive Labs & Tools', icon: Layers },
            { id: 'strategy', label: 'Pacing & Analytics', icon: BarChart3 }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = viewFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  soundManager.playBeep(540, 0.03);
                  setViewFilter(tab.id as DashboardViewFilter);
                }}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-white text-slate-900 dark:bg-blue-600 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(580, 0.04);
            onNavigate('calendar');
          }}
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline shrink-0 cursor-pointer whitespace-nowrap"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>14-Day Sprint Plan</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4. Responsive 12-Column Command Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* ================= MAIN / CENTER COLUMN (lg:col-span-8) ================= */}
        <div className="lg:col-span-8 space-y-5 sm:space-y-6">
          {/* Active Session Recovery Banner (If user has an unfinished session) */}
          {activeSession ? (
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1526] border border-blue-200 dark:border-blue-800/70 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                    Resume Unfinished Session
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    {activeSession.title}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono tabular-nums">
                    {activeSession.subtitle} · {activeSession.percent}% complete
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundManager.playBeep(640, 0.04);
                  onNavigate(activeSession.module);
                }}
                className="px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 active:scale-95 text-white text-xs font-semibold shrink-0 transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <span>Resume</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : null}

          {/* 4 Core IELTS Skills Matrix (Primary Action Hub on Overview & Skills) */}
          {(viewFilter === 'overview' || viewFilter === 'skills') && (
            <SkillMasteryMatrix
              onNavigate={onNavigate}
              examMode={examMode}
              completedModules={completedModules}
            />
          )}

          {/* Today's Study Sprint Mission Hub */}
          {(viewFilter === 'overview' || viewFilter === 'skills') && (
            <DailySprintMissionHub
              onNavigate={onNavigate}
              onShowToast={onShowToast}
            />
          )}

          {/* AI Band Scorecard & Criteria Diagnostic */}
          {(viewFilter === 'overview' || viewFilter === 'skills') && (
            <AIBandScorecard
              estimatedBand={estimatedBand}
              targetBand={targetBand}
              overallPercentage={overallPercentage}
              onNavigate={onNavigate}
              onOpenBandModal={onOpenBandModal}
            />
          )}

          {/* AI Writing Quick-Evaluator Dock */}
          {viewFilter === 'skills' && (
            <AIWritingQuickEvaluator
              onNavigate={onNavigate}
              onShowToast={onShowToast}
            />
          )}

          {/* Specialized Practice Labs Dock */}
          {viewFilter === 'labs' && (
            <AdvancedLabsDock
              onNavigate={onNavigate}
              onOpenVault={() => {
                window.dispatchEvent(new CustomEvent('open_vault_modal'));
              }}
            />
          )}

          {/* Core Lexical & Grammatical Learning Tools */}
          {(viewFilter === 'labs' || viewFilter === 'skills') && (
            <LearningToolsCard onNavigate={onNavigate} />
          )}

          {/* Band 8.5+ Topic Collocation Explorer */}
          {viewFilter === 'labs' && (
            <AcademicCollocationFinder
              onShowToast={onShowToast}
              onNavigate={onNavigate}
            />
          )}

          {/* 30-Day Practice Heatmap */}
          {viewFilter === 'strategy' && (
            <PracticeHeatmap
              user={user}
              examHistory={examHistory}
              streakDays={streakDays}
              onNavigate={onNavigate}
              onShowToast={onShowToast}
            />
          )}

          {/* AI Weakness Radar & Trap Alerts */}
          {viewFilter === 'strategy' && (
            <AIWeaknessDetector
              onNavigate={onNavigate}
              onShowToast={onShowToast}
              unmasteredMistakeCount={unmasteredMistakeCount}
            />
          )}

          {/* Exam Time & Pacing Strategizer */}
          {viewFilter === 'strategy' && (
            <ExamPacingStrategyCard
              onShowToast={onShowToast}
              onNavigate={onNavigate}
            />
          )}

          {/* Recent Authentic Activity (Shown when user has completed assessments) */}
          {recentHistory.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-500" />
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Recent Exam Attempts
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('history')}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 transition cursor-pointer"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {recentHistory.map((rec) => (
                  <div
                    key={rec.id}
                    onClick={() => {
                      soundManager.playBeep(520, 0.04);
                      onNavigate('history');
                    }}
                    className="p-3 rounded-2xl bg-white dark:bg-[#0B1224] border border-slate-200/90 dark:border-slate-800 hover:border-blue-400 transition cursor-pointer text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400">
                        {isFullMockExamRecord(rec) ? 'Full Mock Exam' : 'Practice Test'}
                      </span>
                      <span className="text-xs font-black text-blue-600 dark:text-blue-400 font-mono">
                        {isFullMockExamRecord(rec)
                          ? `Band ${(rec.overallBand ?? rec.listeningBand).toFixed(1)}`
                          : `Band ${(rec.overallBand || rec.readingBand || rec.listeningBand).toFixed(1)}`}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">
                      {rec.submissionType === 'timer' ? 'Timed Simulation' : 'Completed Assessment'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(rec.timestamp).toLocaleDateString()} · {rec.correctCount}/{rec.totalQuestions} Correct
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Quick Section Explorer Dock on Overview so all specialist labs & analytics are 1 tap away */}
          {viewFilter === 'overview' && (
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0B1224] border border-slate-200/90 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Explore Specialist AI Labs, Collocations & Pacing Analytics
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Switch dashboard views to access AI Speaking Partner, Writing Quick-Evaluator, 28-Day Heatmap, and Collocation Explorer.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewFilter('skills')}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 text-xs font-bold hover:bg-blue-100 transition cursor-pointer"
                >
                  AI Examiners →
                </button>
                <button
                  type="button"
                  onClick={() => setViewFilter('labs')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Interactive Labs →
                </button>
                <button
                  type="button"
                  onClick={() => setViewFilter('strategy')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Heatmap & Pacing →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ================= RIGHT COLUMN (Desktop Sidebar Widgets: lg:col-span-4) ================= */}
        <div className="lg:col-span-4 space-y-5">
          {/* Daily Goal & Momentum Hub (Benchmark: IELTSly.ai) */}
          <DailyGoalMomentumCard
            streakDays={streakDays}
            examDate={testDate}
            onNavigate={onNavigate}
            onShowToast={onShowToast}
          />

          {/* A. Band Readiness Index Donut Ring with Interactive 4-Skill Matrix */}
          <ProgressDonutCard
            overallPercentage={overallPercentage}
            estimatedBand={estimatedBand}
            targetBand={targetBand}
            completedCount={completedModules.length}
            examHistory={examHistory}
            onViewAnalytics={() => onNavigate('progress')}
            onNavigate={onNavigate}
          />

          {/* B. Target Band Raw Score Projector */}
          <BandProjectorCard
            currentTargetBand={targetBand}
            examMode={examMode}
            onOpenBandModal={onOpenBandModal}
          />

          {/* C. Live Interactive Cambridge AI Tutor Side Panel */}
          <AITutorWidget
            userName={sanitizedFirstName}
            onNavigateToAITools={() => onNavigate('aitools')}
            onShowToast={onShowToast}
          />

          {/* D. Mistake Vault Error Triage */}
          <MistakeVaultWidget
            onOpenVault={() => {
              window.dispatchEvent(new CustomEvent('open_vault_modal'));
            }}
            onNavigate={onNavigate}
          />

          {/* E. Quick Actions 3x2 Grid */}
          <QuickActionsCard
            onNavigate={onNavigate}
            onOpenVault={() => {
              window.dispatchEvent(new CustomEvent('open_vault_modal'));
            }}
            onShowMore={() => onNavigate('learn')}
          />
        </div>
      </div>

      {/* Production Commercial Footer */}
      <CommercialFooter
        onOpenShowcase={() => window.dispatchEvent(new CustomEvent('open_commercial_showcase'))}
        onOpenLegal={(tab) => window.dispatchEvent(new CustomEvent('open_legal_modal', { detail: { tab } }))}
        onOpenContact={() => window.dispatchEvent(new CustomEvent('open_contact_modal'))}
        onOpenSeoGuide={() => window.dispatchEvent(new CustomEvent('open_seo_guide'))}
        onNavigate={onNavigate}
      />
    </div>
  );
});
