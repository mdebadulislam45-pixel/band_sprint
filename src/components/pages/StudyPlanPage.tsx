import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Award,
  BookOpen,
  Download,
  Printer,
  Target,
  TrendingUp,
  Sliders,
  ChevronRight,
  Filter,
  Check,
  Flame,
  Zap,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { THIRTY_DAY_STUDY_PLAN, DailyStudyTask } from '../../data/studyPlanData';
import {
  StudyPlanConfig,
  GeneratedCustomPlan,
  DEFAULT_PLAN_CONFIG,
  calculateDaysUntilExam,
  generatePersonalizedStudyPlan,
  getSavedStudyPlan,
  getSavedPlanConfig,
  exportStudyPlanToICS
} from '../../services/aiStudyPlanService';
import { soundManager } from '../../utils/audioEffects';
import { loadDiagnosticResult } from '../../services/diagnosticResultStore';
import {
  DAILY_SPRINT_SYNCED_EVENT,
  loadDailySprintProgress
} from '../../utils/dailySprintProgressStore';
import { computeSmartSprintBrief } from '../../utils/smartSprintEngine';

interface StudyPlanPageProps {
  onBack: () => void;
  onNavigateToModule: (module: string) => void;
  onShowToast: (msg: string) => void;
  onOpenDiagnostic?: () => void;
}

const STORAGE_COMPLETED_DAYS = 'ielts_study_plan_completed_days_v2';
const STORAGE_COMPLETED_SUBTASKS = 'ielts_study_plan_completed_subtasks_v2';

export const StudyPlanPage: React.FC<StudyPlanPageProps> = ({
  onBack,
  onNavigateToModule,
  onShowToast,
  onOpenDiagnostic
}) => {
  // Navigation tabs: 'curriculum' (30-Day Master) | 'ai-generator' (Diagnostic Calibrator) | 'weekly' (Gantt Schedule)
  const [activeTab, setActiveTab] = useState<'curriculum' | 'ai-generator' | 'weekly'>('curriculum');

  // Selected Day in the 30-day curriculum
  const [activeDayNumber, setActiveDayNumber] = useState<number>(1);

  // Filter by skill: 'all' | 'Listening' | 'Reading' | 'Writing' | 'Speaking' | 'Full Mock'
  const [skillFilter, setSkillFilter] = useState<string>('all');

  // Completed Days & Subtasks persistence
  const [completedDays, setCompletedDays] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_COMPLETED_DAYS);
      return saved ? JSON.parse(saved) : [1];
    } catch {
      return [1];
    }
  });

  const [completedSubtasks, setCompletedSubtasks] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_COMPLETED_SUBTASKS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // AI Plan Configuration & Generated Plan State
  const [planConfig, setPlanConfig] = useState<StudyPlanConfig>(() => getSavedPlanConfig());
  const [customPlan, setCustomPlan] = useState<GeneratedCustomPlan | null>(() => getSavedStudyPlan());
  const [isGenerating, setIsGenerating] = useState(false);
  const [diagnostic, setDiagnostic] = useState(() => loadDiagnosticResult());
  const [sprintProgress, setSprintProgress] = useState(() => loadDailySprintProgress());

  const smartSprintBrief = useMemo(
    () => computeSmartSprintBrief(null, sprintProgress),
    [sprintProgress]
  );

  useEffect(() => {
    const refreshDiagnostic = () => {
      setDiagnostic(loadDiagnosticResult());
      setSprintProgress(loadDailySprintProgress());
    };
    window.addEventListener('bandsprint_cloud_sync_updated', refreshDiagnostic);
    window.addEventListener('bandsprint_diagnostic_saved', refreshDiagnostic);
    window.addEventListener(DAILY_SPRINT_SYNCED_EVENT, refreshDiagnostic);
    return () => {
      window.removeEventListener('bandsprint_cloud_sync_updated', refreshDiagnostic);
      window.removeEventListener('bandsprint_diagnostic_saved', refreshDiagnostic);
      window.removeEventListener(DAILY_SPRINT_SYNCED_EVENT, refreshDiagnostic);
    };
  }, []);

  // Sync state to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_COMPLETED_DAYS, JSON.stringify(completedDays));
    } catch {}
  }, [completedDays]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_COMPLETED_SUBTASKS, JSON.stringify(completedSubtasks));
    } catch {}
  }, [completedSubtasks]);

  // Current active task from curriculum or custom plan
  const allTasks = useMemo(() => {
    if (customPlan && customPlan.customDailyTasks && customPlan.customDailyTasks.length > 0) {
      return customPlan.customDailyTasks;
    }
    return THIRTY_DAY_STUDY_PLAN;
  }, [customPlan]);

  const filteredTasks = useMemo(() => {
    if (skillFilter === 'all') return allTasks;
    return allTasks.filter((t) => t.focusSkill === skillFilter || (skillFilter === 'Vocabulary & Grammar' && t.focusSkill.includes('Grammar')));
  }, [allTasks, skillFilter]);

  const activeTask = useMemo(() => {
    return allTasks.find((d) => d.day === activeDayNumber) || allTasks[0];
  }, [allTasks, activeDayNumber]);

  const isDayCompleted = completedDays.includes(activeTask?.day || 1);

  // Progress metrics
  const totalDays = allTasks.length;
  const progressPercent = Math.round((completedDays.length / totalDays) * 100);
  const totalMinutesStudied = completedDays.reduce((acc, dayNum) => {
    const task = allTasks.find((t) => t.day === dayNum);
    return acc + (task ? task.estimatedMinutes : 60);
  }, 0);
  const totalHoursStudied = (totalMinutesStudied / 60).toFixed(1);

  const daysUntilExam = useMemo(() => {
    return calculateDaysUntilExam(planConfig.examDate);
  }, [planConfig.examDate]);

  // Toggle Day Completion
  const toggleDayCompletion = (dayNum: number) => {
    setCompletedDays((prev) => {
      const isDone = prev.includes(dayNum);
      const updated = isDone ? prev.filter((d) => d !== dayNum) : [...prev, dayNum];
      if (!isDone) {
        soundManager.playSuccess();
        onShowToast(`Day ${dayNum} completed! Keep the momentum!`);
      } else {
        onShowToast(`Day ${dayNum} marked pending.`);
      }
      return updated;
    });
  };

  // Toggle Individual Subtask
  const toggleSubtask = (dayNum: number, taskIndex: number) => {
    const key = `d${dayNum}_t${taskIndex}`;
    setCompletedSubtasks((prev) => {
      const nextState = !prev[key];
      const updated = { ...prev, [key]: nextState };
      soundManager.playBeep(nextState ? 750 : 420, 0.05);

      // Check if all tasks in activeDay are now completed
      if (activeTask && activeTask.tasks) {
        const allCompleted = activeTask.tasks.every((_, idx) => {
          const k = `d${dayNum}_t${idx}`;
          return k === key ? nextState : !!updated[k];
        });
        if (allCompleted && !completedDays.includes(dayNum)) {
          toggleDayCompletion(dayNum);
        }
      }

      return updated;
    });
  };

  // Handle AI Plan Generation
  const handleGenerateAIPlan = async () => {
    setIsGenerating(true);
    soundManager.playBeep(520, 0.1);

    try {
      const generated = await generatePersonalizedStudyPlan(planConfig);
      setCustomPlan(generated);
      soundManager.playSuccess();
      onShowToast(`Custom AI Study Plan generated for Band ${planConfig.targetBand}!`);
      setActiveTab('curriculum');
    } catch {
      onShowToast('Plan generation updated with standard Practice roadmap.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Calendar (.ICS) Export
  const handleExportCalendar = () => {
    try {
      soundManager.playBeep(620, 0.08);
      exportStudyPlanToICS(allTasks, planConfig);
      onShowToast('Calendar (.ICS) file downloaded! Import to Google Calendar or Apple Calendar.');
    } catch {
      onShowToast('Could not download calendar file.');
    }
  };

  // Handle Print Brief
  const handlePrint = () => {
    soundManager.playBeep(600, 0.08);
    window.print();
  };

  // Handle Adaptive Rebalance
  const handleAdaptiveRebalance = () => {
    soundManager.playBeep(540, 0.08);
    const uncompletedCount = totalDays - completedDays.length;
    if (uncompletedCount <= 0) {
      onShowToast('All milestone days completed! Outstanding dedication.');
      return;
    }
    const adjustedDailyMinutes = Math.min(180, Math.round((uncompletedCount * 65) / Math.max(1, daysUntilExam)));
    setPlanConfig((prev) => ({
      ...prev,
      dailyMinutes: Math.max(45, adjustedDailyMinutes)
    }));
    onShowToast(`Plan rebalanced! Remaining study calibrated to ${adjustedDailyMinutes} mins/day.`);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in pb-20 print:p-0 print:max-w-none">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-3 print:hidden">
        <button
          onClick={onBack}
          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
          <span>Learn</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCalendar}
            title="Download iCalendar file with study alarms"
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Add to Calendar (.ICS)</span>
          </button>

          <button
            onClick={handlePrint}
            title="Print or save as PDF brief"
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-300" />
            <span>Print / PDF Brief</span>
          </button>
        </div>
      </div>

      {/* Diagnostic result banner — your plan is built from your real starting band */}
      {diagnostic ? (
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Built from your diagnostic test</div>
            <p className="text-sm text-slate-700 dark:text-slate-200 mt-1">
              Starting band <strong>{diagnostic.scores.overall.toFixed(1)}</strong> · target Band {diagnostic.targetBand.toFixed(1)} · weakest skill:{' '}
              <strong>{diagnostic.weakest === 'listening' ? 'Listening' : diagnostic.weakest === 'reading' ? 'Reading' : diagnostic.weakest === 'writing' ? 'Writing' : 'Speaking'}</strong> — this plan gives that skill extra time every week.
              Taken {new Date(diagnostic.createdAt).toLocaleDateString()}.
            </p>
          </div>
          {onOpenDiagnostic && (
            <button type="button" onClick={onOpenDiagnostic} className="shrink-0 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0F4C45] text-white text-sm font-bold cursor-pointer">Retake diagnostic</button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-[#11201E] border border-slate-200 dark:border-[#1F8A70]/40 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-sm text-slate-700 dark:text-slate-200">
            <strong>No diagnostic yet.</strong> Take the 10-minute test and this plan will be rebuilt around your real starting band and weakest skill.
          </p>
          {onOpenDiagnostic && (
            <button type="button" onClick={onOpenDiagnostic} className="shrink-0 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0F4C45] text-white text-sm font-bold cursor-pointer">Take the diagnostic</button>
          )}
        </div>
      )}

      {/* Smart Daily Sprint Sync Strip */}
      <div
        data-testid="study-plan-daily-sprint-bridge"
        className="rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/35 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden"
      >
        <div className="space-y-1">
          <div className="text-[11px] font-mono text-[#0F4C45] dark:text-[#6EE7B7] font-semibold uppercase tracking-wide">
            Daily Sprint Sync · {sprintProgress.pomodoroFocusMinutesLogged}m Focus Today · {smartSprintBrief.todayReadinessPct}% Daily Targets · {smartSprintBrief.dueReviewCount} Due Review
          </div>
          <p className="text-xs sm:text-sm text-[#0E1F1E] dark:text-[#EEF3F1] font-medium">
            {smartSprintBrief.coachHeadline}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(540, 0.04);
            onNavigateToModule('/learn/daily-sprint');
          }}
          className="shrink-0 min-h-[42px] px-4 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <span>Open Daily Sprint</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#F4A62A]" />
        </button>
      </div>

      {/* Executive Hero Banner */}
      <div className="relative overflow-hidden bg-slate-900 text-white rounded-2xl border border-slate-800 p-6 sm:p-8 shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
              <Sparkles className="w-4 h-4" />
              <span>CAMBRIDGE IELTS SCIENTIFIC SYLLABUS</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-300">Target Band {planConfig.targetBand}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              AI Study Plan & Daily Exam Roadmap
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Engineered with Practice rubrics, balanced daily cognitive load, and distractor defense.
              Follow structured morning routines, evening drills, and automated Mistake Vault reviews.
            </p>
          </div>

          {/* Quick Metrics Widget */}
          <div className="flex md:flex-col items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/60 p-4 rounded-xl shrink-0">
            <div className="text-center md:text-right">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Test Countdown</div>
              <div className="text-2xl font-black text-white font-mono flex items-center justify-center md:justify-end gap-1">
                <span>{daysUntilExam}</span>
                <span className="text-xs text-emerald-400 font-bold">Days</span>
              </div>
            </div>

            <div className="text-center md:text-right">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Band Readiness</div>
              <div className="text-base font-black text-emerald-400 font-mono">
                {customPlan?.readinessProbability || 85}% On Track
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Segmented Controls */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2 print:hidden">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => {
              setActiveTab('curriculum');
              soundManager.playBeep(560, 0.04);
            }}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'curriculum'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            <span>30-Day Syllabus</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('ai-generator');
              soundManager.playBeep(560, 0.04);
            }}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'ai-generator'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-600" />
            <span>AI Calibration</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('weekly');
              soundManager.playBeep(560, 0.04);
            }}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'weekly'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
            <span>Weekly Matrix</span>
          </button>
        </div>

        {/* Adaptive Rebalance Trigger */}
        <button
          onClick={handleAdaptiveRebalance}
          title="Recalculate remaining daily schedule based on current progress"
          className="text-xs text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-slate-100 transition"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Adaptive Rebalance</span>
        </button>
      </div>

      {/* Progress & Milestone Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-700 font-bold">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>{completedDays.length} of {totalDays} Milestone Days Completed</span>
            </div>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <div className="flex items-center gap-1 text-slate-500 font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{totalHoursStudied} Hours Logged</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-mono uppercase">Overall Progress:</span>
            <span className="font-mono font-black text-emerald-600 text-sm">
              {progressPercent}%
            </span>
          </div>
        </div>

        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-600 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: 30-DAY SYLLABUS (MASTER DAY-BY-DAY EXECUTION)      */}
      {/* ======================================================== */}
      {activeTab === 'curriculum' && (
        <div className="space-y-6">
          {/* Skill Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-slate-400 font-mono flex items-center gap-1 shrink-0 mr-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            {[
              { id: 'all', label: 'All 30 Days' },
              { id: 'Listening', label: 'Listening' },
              { id: 'Reading', label: 'Reading' },
              { id: 'Writing', label: 'Writing' },
              { id: 'Speaking', label: 'Speaking' },
              { id: 'Vocabulary & Grammar', label: 'Vocab & Grammar' },
              { id: 'Full Mock', label: 'Full Mocks' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setSkillFilter(f.id);
                  soundManager.playBeep(600, 0.03);
                }}
                className={`min-h-[34px] px-3 py-1 rounded-lg font-bold shrink-0 transition ${
                  skillFilter === f.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Interactive Day Scroller (All 30 Days) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2">
            <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Select Study Day</span>
              <span>Showing {filteredTasks.length} Days</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {filteredTasks.map((d) => {
                const isSelected = activeDayNumber === d.day;
                const isDone = completedDays.includes(d.day);

                return (
                  <button
                    key={d.day}
                    onClick={() => {
                      setActiveDayNumber(d.day);
                      soundManager.playBeep(650, 0.04);
                    }}
                    className={`flex-shrink-0 w-14 h-16 rounded-xl flex flex-col items-center justify-center transition border ${
                      isSelected
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm scale-102 font-bold'
                        : isDone
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-[10px] font-mono uppercase tracking-tight">Day</span>
                    <span className="text-base font-black leading-none my-0.5">{d.day}</span>
                    <div className="h-3 flex items-center justify-center">
                      {isDone ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <span className="text-[9px] font-mono text-slate-400">
                          {d.focusSkill.slice(0, 3)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Day Detail Card */}
          {activeTask && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-2xs space-y-6">
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-emerald-700 font-bold font-mono">
                      Day {activeTask.day}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="text-slate-600 font-medium">
                      {activeTask.phase}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="text-slate-500 font-mono flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      ~{activeTask.estimatedMinutes} Mins
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                    {activeTask.title}
                  </h2>

                  <p className="text-xs font-semibold text-emerald-700">
                    🇧🇩 {activeTask.title_bn}
                  </p>
                </div>

                {/* Day Completion Toggle Button */}
                <button
                  onClick={() => toggleDayCompletion(activeTask.day)}
                  className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                    isDayCompleted
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                      : 'bg-slate-900 text-white hover:bg-slate-800 shadow-2xs'
                  }`}
                >
                  {isDayCompleted ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>Day Completed</span>
                    </>
                  ) : (
                    <>
                      <Circle className="w-4 h-4 text-slate-400" />
                      <span>Mark Day Complete</span>
                    </>
                  )}
                </button>
              </div>

              {/* Morning & Evening Split */}
              {(activeTask.morningRoutine || activeTask.eveningDrill) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeTask.morningRoutine && (
                    <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-1">
                      <div className="text-[11px] font-mono font-bold uppercase text-blue-700 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-blue-600" />
                        <span>Morning Target</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {activeTask.morningRoutine}
                      </p>
                    </div>
                  )}

                  {activeTask.eveningDrill && (
                    <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-1">
                      <div className="text-[11px] font-mono font-bold uppercase text-emerald-700 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Evening Focus</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {activeTask.eveningDrill}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Checklist */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Today's Execution Checklist:
                </div>

                <div className="space-y-2.5">
                  {activeTask.tasks.map((task, idx) => {
                    const subtaskKey = `d${activeTask.day}_t${idx}`;
                    const isTaskDone = !!completedSubtasks[subtaskKey] || isDayCompleted;

                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border transition flex items-center justify-between gap-3 ${
                          isTaskDone
                            ? 'bg-slate-50 border-slate-200 text-slate-500'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                        }`}
                      >
                        <div
                          onClick={() => toggleSubtask(activeTask.day, idx)}
                          className="flex items-center gap-3 cursor-pointer flex-1"
                        >
                          <button
                            type="button"
                            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition ${
                              isTaskDone
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'bg-white border-slate-300 text-transparent hover:border-emerald-500'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>

                          <span className={`text-xs sm:text-sm font-medium ${isTaskDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                            {task.description}
                          </span>
                        </div>

                        {task.actionModule && (
                          <button
                            onClick={() => onNavigateToModule(task.actionModule!)}
                            className="min-h-[34px] px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition shrink-0 shadow-2xs"
                          >
                            <span>Open</span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Examiner Tip & Insight */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1 text-xs text-amber-950">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 uppercase font-mono">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Examiner Strategy Tip</span>
                  </div>
                  <p className="leading-relaxed font-medium">
                    {activeTask.tipOfDay}
                  </p>
                </div>

                {activeTask.examinerInsight && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs text-slate-700">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 uppercase font-mono">
                      <Award className="w-3.5 h-3.5 text-blue-600" />
                      <span>Practice Rubric Insight</span>
                    </div>
                    <p className="leading-relaxed font-medium">
                      {activeTask.examinerInsight}
                    </p>
                  </div>
                )}
              </div>

              {/* Day Navigation Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  disabled={activeTask.day <= 1}
                  onClick={() => {
                    setActiveDayNumber((prev) => Math.max(1, prev - 1));
                    soundManager.playBeep(520, 0.04);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous Day</span>
                </button>

                <span className="text-xs font-mono text-slate-400">
                  Day {activeTask.day} of {totalDays}
                </span>

                <button
                  disabled={activeTask.day >= totalDays}
                  onClick={() => {
                    setActiveDayNumber((prev) => Math.min(totalDays, prev + 1));
                    soundManager.playBeep(520, 0.04);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5 shadow-2xs"
                >
                  <span>Next Day</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: AI CALIBRATION & PERSONAL GENERATOR                */}
      {/* ======================================================== */}
      {activeTab === 'ai-generator' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-black text-slate-900">
              Personal AI Study Plan Generator
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Calibrate your exact exam date, target band, and skill deficits to dynamically tailor your daily schedule.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Target Band */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase font-mono flex items-center gap-1.5">
                <Target className="w-4 h-4 text-emerald-600" />
                <span>Target Band Score</span>
              </label>
              <select
                value={planConfig.targetBand}
                onChange={(e) => setPlanConfig({ ...planConfig, targetBand: parseFloat(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-400"
              >
                <option value={6.0}>Band 6.0 (Competent User)</option>
                <option value={6.5}>Band 6.5 (Standard University Entry)</option>
                <option value={7.0}>Band 7.0 (Good User / Professional)</option>
                <option value={7.5}>Band 7.5 (Competitive Postgrad)</option>
                <option value={8.0}>Band 8.0 (Very Good User)</option>
                <option value={8.5}>Band 8.5 (Near Native Authority)</option>
                <option value={9.0}>Band 9.0 (Expert Practice Native)</option>
              </select>
            </div>

            {/* Current Estimated Band */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase font-mono flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Current Band Level</span>
              </label>
              <select
                value={planConfig.currentBand}
                onChange={(e) => setPlanConfig({ ...planConfig, currentBand: parseFloat(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-400"
              >
                <option value={5.0}>Band 5.0 (Modest User)</option>
                <option value={5.5}>Band 5.5 (Intermediate)</option>
                <option value={6.0}>Band 6.0 (Competent)</option>
                <option value={6.5}>Band 6.5 (Upper Intermediate)</option>
                <option value={7.0}>Band 7.0 (Advanced)</option>
                <option value={7.5}>Band 7.5 (Fluent Professional)</option>
              </select>
            </div>

            {/* Test Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase font-mono flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span>Exam Target Date</span>
              </label>
              <input
                type="date"
                value={planConfig.examDate}
                onChange={(e) => setPlanConfig({ ...planConfig, examDate: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-400"
              />
            </div>

            {/* Daily Minutes Budget */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase font-mono flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Daily Study Budget</span>
              </label>
              <select
                value={planConfig.dailyMinutes}
                onChange={(e) => setPlanConfig({ ...planConfig, dailyMinutes: parseInt(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-400"
              >
                <option value={45}>45 Mins / Day (Express Pace)</option>
                <option value={60}>60 Mins / Day (Standard Steady)</option>
                <option value={75}>75 Mins / Day (Recommended Accelerated)</option>
                <option value={90}>90 Mins / Day (Comprehensive Intensive)</option>
                <option value={120}>120 Mins / Day (Hardcore Sprint)</option>
              </select>
            </div>

            {/* Primary Weakness / Focus Area */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase font-mono flex items-center gap-1.5">
                <Target className="w-4 h-4 text-rose-600" />
                <span>Primary Deficit Focus</span>
              </label>
              <select
                value={planConfig.weakness}
                onChange={(e) => setPlanConfig({ ...planConfig, weakness: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-400"
              >
                <option value="writing">Writing (Task 1 & Task 2 Argumentation)</option>
                <option value="speaking">Speaking (Fluency & Discourse Markers)</option>
                <option value="reading">Reading (Time Management & TFNG)</option>
                <option value="listening">Listening (Section 3 & 4 Distractors)</option>
                <option value="balanced">Balanced (Uniform 4-Macro Calibration)</option>
              </select>
            </div>

            {/* Test Format */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase font-mono flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-slate-600" />
                <span>Test Format</span>
              </label>
              <select
                value={planConfig.examType}
                onChange={(e) => setPlanConfig({ ...planConfig, examType: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-400"
              >
                <option value="academic">IELTS Academic (University / Professional)</option>
                <option value="general">IELTS General Training (Migration / Work)</option>
              </select>
            </div>
          </div>

          {/* Action Trigger */}
          <div className="pt-2">
            <button
              onClick={handleGenerateAIPlan}
              disabled={isGenerating}
              className="w-full min-h-[48px] py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm transition flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-300" />
                  <span>Synthesizing Practice Schedule...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Generate Personalized AI Study Roadmap</span>
                </>
              )}
            </button>
          </div>

          {/* Generated Plan Overview if Available */}
          {customPlan && (
            <div className="mt-6 p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono font-bold text-slate-900 uppercase">
                  Executive AI Roadmap Brief:
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700">
                  Band {customPlan.config.targetBand} Target
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {customPlan.executiveSummary}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-mono uppercase">Days Left</div>
                  <div className="text-lg font-black text-slate-900 font-mono">{customPlan.daysRemaining}</div>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-mono uppercase">Total Hours</div>
                  <div className="text-lg font-black text-blue-600 font-mono">{customPlan.totalPlannedHours}h</div>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-mono uppercase">Daily Budget</div>
                  <div className="text-lg font-black text-purple-600 font-mono">{customPlan.config.dailyMinutes}m</div>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-mono uppercase">Readiness</div>
                  <div className="text-lg font-black text-emerald-600 font-mono">{customPlan.readinessProbability}%</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: WEEKLY GANTT / FOUR-WEEK MATRIX VIEW               */}
      {/* ======================================================== */}
      {activeTab === 'weekly' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                4-Week Macro Milestone Matrix
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Progressive skill building across the four core phases of preparation.
              </p>
            </div>

            <button
              onClick={handleExportCalendar}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Export Calendar</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                week: 1,
                phase: 'Phase 1: Foundation & Diagnostic',
                days: 'Days 1–7',
                focus: 'Listening Sec 1 + TFNG Strategy + Task 1 Overview + Speaking Part 1',
                milestone: 'Milestone Mock 1 Baseline',
                color: 'border-blue-200 bg-blue-50/30 text-blue-900'
              },
              {
                week: 2,
                phase: 'Phase 2: Speed & Distractor Defense',
                days: 'Days 8–14',
                focus: 'Matching Headings + Sec 3 Academic Dialogue + PEEL Writing + Cue Card',
                milestone: 'Milestone Mock 2 Speed Test',
                color: 'border-emerald-200 bg-emerald-50/30 text-emerald-900'
              },
              {
                week: 3,
                phase: 'Phase 3: Synthesis & Band 8.0+',
                days: 'Days 15–21',
                focus: 'Lecture Note-Taking + Passage 3 Claims + Inversion Grammar + Part 3 Nuance',
                milestone: 'Milestone Mock 3 Advanced',
                color: 'border-purple-200 bg-purple-50/30 text-purple-900'
              },
              {
                week: 4,
                phase: 'Phase 4: Full Exam Simulation',
                days: 'Days 22–30',
                focus: 'Full 2h 45m Practice Mocks + Mistake Vault Purge + Examiner Shadowing + Taper',
                milestone: 'Final Exam Readiness',
                color: 'border-amber-200 bg-amber-50/30 text-amber-900'
              }
            ].map((w) => (
              <div
                key={w.week}
                className={`p-5 rounded-xl border ${w.color} space-y-3 flex flex-col justify-between`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                    <span>WEEK {w.week}</span>
                    <span>{w.days}</span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900">
                    {w.phase}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {w.focus}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-500 font-mono">Milestone:</span>
                  <span className="text-emerald-700">{w.milestone}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
