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
import { getMistakes } from '../utils/vaultStorage';
import { isFullMockExamRecord } from '../utils/userStorage';
import { LondonSunsetHeroBanner } from './home/LondonSunsetHeroBanner';
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
  const testDate = user?.progress?.examDate || '';
  const completedModules = user?.progress?.completedModules || [];
  // examHistory is stored newest-first via unshift()
  const examHistory = user?.progress?.examHistory || [];
  const recentHistory = examHistory.slice(0, 3);
  const activeSession = user?.progress?.activeSession;

  // Readiness is based only on completed full mock exams. Never fabricate a baseline.
  const { estimatedBand, overallPercentage, hasFullMockAssessment } = useMemo(() => {
    const fullMockHistory = examHistory.filter(
      (rec) => isFullMockExamRecord(rec) && typeof rec.overallBand === 'number' && rec.overallBand > 0
    );
    if (fullMockHistory.length === 0) {
      return { estimatedBand: 0, overallPercentage: 0, hasFullMockAssessment: false };
    }
    const avg = fullMockHistory.reduce((acc, rec) => acc + (rec.overallBand ?? 0), 0) / fullMockHistory.length;
    const rounded = Math.round(avg * 2) / 2;
    const pct = Math.min(100, Math.max(0, Math.round((rounded / targetBand) * 100)));
    return { estimatedBand: rounded, overallPercentage: pct, hasFullMockAssessment: true };
  }, [examHistory, targetBand]);

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
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-5 pb-28 sm:pb-24 select-none">
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

      {/* Commercial Trust & 100% Free Launch Announcement Strip */}
      <div className="flex items-center justify-between gap-3 p-3 px-4 rounded-2xl bg-gradient-to-r from-blue-900/10 via-indigo-900/10 to-emerald-900/10 border border-blue-500/20 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
            IELTS Sprint™ Community Beta — All AI Examiners & Cambridge Mock Tests are 100% Free!
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(550, 0.03);
              window.dispatchEvent(new CustomEvent('open_commercial_showcase'));
            }}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>Why IELTS Sprint →</span>
          </button>
        </div>
      </div>

      {/* 2. Executive Command KPI Strip (4 Interactive Status Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* KPI 1: Target vs Current Trajectory */}
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(560, 0.04);
            onOpenBandModal();
          }}
          className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#0B1224] border border-slate-200/90 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition flex items-center justify-between gap-2.5 text-left group shadow-2xs cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase font-bold text-slate-400 dark:text-slate-500">
                Band Trajectory
              </div>
              <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate font-mono">
                {hasFullMockAssessment ? estimatedBand.toFixed(1) : 'Not assessed'} {hasFullMockAssessment && <span className="text-slate-400 font-normal">→</span>} {' '}
                <span className="text-blue-600 dark:text-blue-400">{targetBand.toFixed(1)}</span>
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition shrink-0" />
        </button>

        {/* KPI 2: Active Exam Format Track */}
        <button
          type="button"
          onClick={toggleExamTrack}
          className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#0B1224] border border-slate-200/90 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 transition flex items-center justify-between gap-2.5 text-left group shadow-2xs cursor-pointer"
          title="Click to switch between Academic and General Training"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              {examMode === 'Academic' ? (
                <BookOpen className="w-4 h-4" />
              ) : (
                <Briefcase className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase font-bold text-slate-400 dark:text-slate-500">
                Active Track
              </div>
              <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                {examMode === 'Academic' ? 'IELTS Academic' : 'General Training'}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline shrink-0">
            Switch
          </span>
        </button>

        {/* KPI 3: CD-IELTS Exam Simulator Direct Launch */}
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(620, 0.04);
            onNavigate('cdielts');
          }}
          className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#0B1224] border border-slate-200/90 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 transition flex items-center justify-between gap-2.5 text-left group shadow-2xs cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase font-bold text-slate-400 dark:text-slate-500">
                Exam Simulator
              </div>
              <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                CD-IELTS Mode
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition shrink-0" />
        </button>

        {/* KPI 4: Mistake Vault Status */}
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(540, 0.04);
            window.dispatchEvent(new CustomEvent('open_vault_modal'));
          }}
          className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#0B1224] border border-slate-200/90 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 transition flex items-center justify-between gap-2.5 text-left group shadow-2xs cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                unmasteredMistakeCount > 0
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {unmasteredMistakeCount > 0 ? (
                <ShieldAlert className="w-4 h-4" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase font-bold text-slate-400 dark:text-slate-500">
                Mistake Vault
              </div>
              <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                {unmasteredMistakeCount > 0
                  ? `${unmasteredMistakeCount} Error${unmasteredMistakeCount > 1 ? 's' : ''} to Fix`
                  : 'All Clear'}
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition shrink-0" />
        </button>
      </div>

      {/* 3. Streamlined Dashboard View Filter Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800/80 pb-2.5 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5">
          {[
            { id: 'overview', label: 'Complete Overview', icon: LayoutGrid },
            { id: 'skills', label: '4 Core Skills', icon: Headphones },
            { id: 'labs', label: 'Interactive Labs', icon: Layers },
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-blue-600 dark:text-white shadow-2xs'
                    : 'bg-white dark:bg-[#0B1224] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-800'
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
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0 cursor-pointer"
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
            <div className="p-3.5 sm:p-4 rounded-2xl bg-blue-50/90 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/70 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-600/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                    Resume Unfinished Session
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    {activeSession.title}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
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
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shrink-0 transition flex items-center gap-1 cursor-pointer"
              >
                <span>Resume</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : null}

          {/* Today's Study Sprint Mission Hub */}
          {(viewFilter === 'overview' || viewFilter === 'skills') && (
            <DailySprintMissionHub
              onNavigate={onNavigate}
              onShowToast={onShowToast}
            />
          )}

          {/* 4 Core IELTS Skills Matrix */}
          {(viewFilter === 'overview' || viewFilter === 'skills') && (
            <SkillMasteryMatrix
              onNavigate={onNavigate}
              examMode={examMode}
              completedModules={completedModules}
            />
          )}

          {/* Specialized Practice Labs Dock */}
          {(viewFilter === 'overview' || viewFilter === 'labs') && (
            <AdvancedLabsDock
              onNavigate={onNavigate}
              onOpenVault={() => {
                window.dispatchEvent(new CustomEvent('open_vault_modal'));
              }}
            />
          )}

          {/* Core Lexical & Grammatical Learning Tools */}
          {(viewFilter === 'overview' || viewFilter === 'labs' || viewFilter === 'skills') && (
            <LearningToolsCard onNavigate={onNavigate} />
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
                        {isFullMockExamRecord(rec) ? 'Full Mock Exam' : 'Listening Mock'}
                      </span>
                      <span className="text-xs font-black text-blue-600 dark:text-blue-400 font-mono">
                        {isFullMockExamRecord(rec)
                          ? `Band ${(rec.overallBand ?? rec.listeningBand).toFixed(1)}`
                          : `Listening ${rec.listeningBand.toFixed(1)}`}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">
                      {rec.submissionType === 'timer' ? 'Official Timed Simulation' : 'Standard Assessment'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(rec.timestamp).toLocaleDateString()} · {rec.correctCount}/{rec.totalQuestions} Correct
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Exam Time & Pacing Strategizer */}
          {(viewFilter === 'overview' || viewFilter === 'strategy') && (
            <ExamPacingStrategyCard
              onShowToast={onShowToast}
              onNavigate={onNavigate}
            />
          )}

          {/* Band 8.5+ Topic Collocation Explorer */}
          {(viewFilter === 'overview' || viewFilter === 'labs' || viewFilter === 'strategy') && (
            <AcademicCollocationFinder
              onShowToast={onShowToast}
              onNavigate={onNavigate}
            />
          )}
        </div>

        {/* ================= RIGHT COLUMN (Desktop Sidebar Widgets: lg:col-span-4) ================= */}
        <div className="lg:col-span-4 space-y-5">
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
