import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Calendar,
  Flame,
  Clock,
  Sparkles,
  TrendingUp,
  Plus,
  Activity,
  CheckCircle2,
  ChevronRight,
  Zap,
  Info
} from 'lucide-react';
import { UserProfile, ExamHistoryRecord } from '../../types';
import { soundManager } from '../../utils/audioEffects';

interface PracticeHeatmapProps {
  user?: UserProfile | null;
  examHistory?: ExamHistoryRecord[];
  streakDays?: number;
  onNavigate?: (module: string) => void;
  onShowToast?: (msg: string) => void;
}

export interface DayActivity {
  dateStr: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "Oct 22"
  dayOfWeek: number; // 0 (Sun) to 6 (Sat)
  weekdayName: string; // 'Sun', 'Mon', etc.
  minutes: number;
  drillsCount: number;
  mockTestsCount: number;
  intensity: 0 | 1 | 2 | 3 | 4;
  activities: string[];
  isToday: boolean;
  isFuture: boolean;
}

const STORAGE_KEY = 'ielts_practice_heatmap_v2';

export const PracticeHeatmap: React.FC<PracticeHeatmapProps> = ({
  user,
  examHistory = [],
  streakDays = 5,
  onNavigate,
  onShowToast
}) => {
  const [viewMode, setViewMode] = useState<'github' | 'calendar'>('github');
  const [hoveredDay, setHoveredDay] = useState<DayActivity | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayActivity | null>(null);
  const [customLogs, setCustomLogs] = useState<Record<string, { minutes: number; activities: string[] }>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return {};
  });

  // Calculate the 30-day date series up to today
  const daysData = useMemo<DayActivity[]>(() => {
    const days: DayActivity[] = [];
    const now = new Date();
    // Normalize to midnight
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Map exam history to date strings
    const examByDate: Record<string, ExamHistoryRecord[]> = {};
    examHistory.forEach((rec) => {
      const d = new Date(rec.timestamp);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!examByDate[ds]) examByDate[ds] = [];
      examByDate[ds].push(rec);
    });

    // Generate last 30 days (from 29 days ago up to today)
    for (let i = 29; i >= 0; i--) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - i);

      const yyyy = targetDate.getFullYear();
      const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
      const dd = String(targetDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const monthName = targetDate.toLocaleDateString('en-US', { month: 'short' });
      const dayNum = targetDate.getDate();
      const dayLabel = `${monthName} ${dayNum}`;
      const dayOfWeek = targetDate.getDay(); // 0 is Sun, 1 is Mon, etc.
      const weekdayName = targetDate.toLocaleDateString('en-US', { weekday: 'short' });
      const isToday = i === 0;

      // Realistic activity simulation seeded with user's streak & completed history
      const examsThisDay = examByDate[dateStr] || [];
      const customThisDay = customLogs[dateStr];

      let minutes = 0;
      let drillsCount = 0;
      let mockTestsCount = examsThisDay.length;
      const activities: string[] = [];

      // Add real exam attempts
      if (mockTestsCount > 0) {
        examsThisDay.forEach((e) => {
          minutes += 45;
          activities.push(
            e.examType === 'full_mock'
              ? `Full Mock Exam (Band ${e.overallBand ?? 7.0})`
              : `Listening Section Test (${e.correctCount}/${e.totalQuestions})`
          );
        });
      }

      // Add custom or logged daily study minutes
      if (customThisDay) {
        minutes += customThisDay.minutes;
        activities.push(...customThisDay.activities);
      }

      // If within current streak (e.g. past N days), guarantee active habit data
      const effectiveStreak = streakDays || 5;
      if (i < effectiveStreak) {
        // Seeded realistic past habit within current streak if not already populated
        if (minutes === 0) {
          const pseudoMins = [35, 45, 25, 50, 40, 30][i % 6];
          minutes = pseudoMins;
          drillsCount = Math.max(1, Math.floor(pseudoMins / 15));
          if (i === 0) {
            // Check localStorage for today's studied minutes
            const storedTodayMins = typeof window !== 'undefined' ? parseInt(localStorage.getItem('ielts_daily_studied_mins') || '30', 10) : 30;
            minutes = Math.max(minutes, storedTodayMins);
            activities.push('Today\'s Active Study Session');
            activities.push('Vocabulary Flashcard Review');
          } else {
            activities.push('Cambridge Listening Section Drill');
            activities.push('C1 Academic Lexicon Practice');
          }
        }
      } else {
        // Prior days outside streak: spaced practice pattern (every 2-3 days)
        // Pseudo-random deterministic distribution based on day number
        const hash = (dayNum * 13 + (targetDate.getMonth() + 1) * 7) % 10;
        if (hash > 4 && minutes === 0) {
          minutes = [20, 30, 40, 25][hash % 4];
          drillsCount = 2;
          activities.push('Task 2 Skeleton Planning');
          activities.push('Fluency Shadowing Drill');
        }
      }

      // Intensity rating from 0 to 4 (GitHub contribution level)
      let intensity: 0 | 1 | 2 | 3 | 4 = 0;
      if (minutes >= 50 || mockTestsCount >= 1) {
        intensity = 4;
      } else if (minutes >= 35) {
        intensity = 3;
      } else if (minutes >= 20) {
        intensity = 2;
      } else if (minutes > 0) {
        intensity = 1;
      }

      days.push({
        dateStr,
        dayLabel,
        dayOfWeek,
        weekdayName,
        minutes,
        drillsCount: drillsCount + mockTestsCount,
        mockTestsCount,
        intensity,
        activities,
        isToday,
        isFuture: false
      });
    }

    return days;
  }, [examHistory, streakDays, customLogs]);

  // Keep selectedDay synced to today by default
  useEffect(() => {
    if (!selectedDay) {
      const today = daysData.find((d) => d.isToday) || daysData[daysData.length - 1];
      if (today) setSelectedDay(today);
    }
  }, [daysData, selectedDay]);

  // Aggregate 30-day stats
  const stats = useMemo(() => {
    let totalMinutes = 0;
    let activeDaysCount = 0;
    let maxMinutesDay = daysData[0];

    daysData.forEach((d) => {
      totalMinutes += d.minutes;
      if (d.intensity > 0) {
        activeDaysCount++;
      }
      if (!maxMinutesDay || d.minutes > maxMinutesDay.minutes) {
        maxMinutesDay = d;
      }
    });

    const consistencyPercent = Math.round((activeDaysCount / daysData.length) * 100);
    const totalHours = (totalMinutes / 60).toFixed(1);

    return {
      activeDaysCount,
      totalDays: daysData.length,
      consistencyPercent,
      totalHours,
      totalMinutes,
      maxMinutesDay
    };
  }, [daysData]);

  // Log today's quick practice
  const handleQuickLog = useCallback(() => {
    soundManager.playCelebration();
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const updated = {
      ...customLogs,
      [todayStr]: {
        minutes: (customLogs[todayStr]?.minutes || 30) + 15,
        activities: [
          ...(customLogs[todayStr]?.activities || ['Core Study Sprint']),
          'Quick 15-min Retention Sprint'
        ]
      }
    };

    setCustomLogs(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      const currentStored = parseInt(localStorage.getItem('ielts_daily_studied_mins') || '30', 10);
      localStorage.setItem('ielts_daily_studied_mins', String(currentStored + 15));
    } catch {}

    if (onShowToast) {
      onShowToast('+15m added to your practice heatmap! High consistency boosts retention.');
    }
  }, [customLogs, onShowToast]);

  // Intensity color map (GitHub style emerald shades with dark mode support)
  const getIntensityClass = (level: number, isToday: boolean, isSelected: boolean) => {
    const baseBorder = isSelected
      ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-[#0B1224] scale-110 z-10'
      : isToday
      ? 'ring-1.5 ring-emerald-500/80 ring-offset-0.5 dark:ring-offset-[#0B1224]'
      : 'border';

    switch (level) {
      case 4:
        return `bg-emerald-500 hover:bg-emerald-400 dark:bg-emerald-500 dark:hover:bg-emerald-400 border-emerald-600 dark:border-emerald-400 text-white shadow-xs shadow-emerald-500/30 ${baseBorder}`;
      case 3:
        return `bg-emerald-400 hover:bg-emerald-300 dark:bg-emerald-600 dark:hover:bg-emerald-500 border-emerald-500 dark:border-emerald-500 text-white ${baseBorder}`;
      case 2:
        return `bg-emerald-300 hover:bg-emerald-200 dark:bg-emerald-800 dark:hover:bg-emerald-700 border-emerald-400/80 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 ${baseBorder}`;
      case 1:
        return `bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 ${baseBorder}`;
      default:
        return `bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-700/80 border-slate-200/80 dark:border-slate-800 text-slate-400 ${baseBorder}`;
    }
  };

  // Organize daysData for GitHub layout (columns = weeks, rows = 7 days Sun..Sat)
  const githubWeeks = useMemo(() => {
    if (daysData.length === 0) return [];
    // Group into 5 columns
    const weeks: (DayActivity | null)[][] = [];
    const firstDay = daysData[0];
    const leadingNulls = firstDay.dayOfWeek; // 0 to 6

    const padded: (DayActivity | null)[] = Array(leadingNulls).fill(null).concat(daysData);
    
    // Group into chunks of 7
    for (let i = 0; i < padded.length; i += 7) {
      const weekChunk = padded.slice(i, i + 7);
      while (weekChunk.length < 7) {
        weekChunk.push(null);
      }
      weeks.push(weekChunk);
    }
    return weeks;
  }, [daysData]);

  const activeHover = hoveredDay || selectedDay;

  return (
    <div className="rounded-2xl bg-white dark:bg-[#0B1224] border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-4">
      {/* Header with Title and Mode Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                30-Day Practice Heatmap
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                {stats.consistencyPercent}% Habit
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Visualizing daily test drills, mock sessions, and study frequency
            </p>
          </div>
        </div>

        {/* View Mode & Quick Log Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800/80 p-0.5 border border-slate-200/60 dark:border-slate-700/60 text-xs">
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(520, 0.03);
                setViewMode('github');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                viewMode === 'github'
                  ? 'bg-white dark:bg-[#0B1224] text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              GitHub Flow
            </button>
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(520, 0.03);
                setViewMode('calendar');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-white dark:bg-[#0B1224] text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Calendar Grid
            </button>
          </div>

          <button
            type="button"
            onClick={handleQuickLog}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs transition flex items-center gap-1 shadow-2xs cursor-pointer"
            title="Log a 15-minute practice session for today"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Log Session</span>
            <span className="sm:hidden">+15m</span>
          </button>
        </div>
      </div>

      {/* 4 Retention Metric Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase font-bold text-slate-400 dark:text-slate-500">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>Active Days</span>
          </div>
          <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5 font-mono">
            {stats.activeDaysCount} <span className="text-xs font-normal text-slate-400">/ {stats.totalDays}</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase font-bold text-slate-400 dark:text-slate-500">
            <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span>Streak</span>
          </div>
          <div className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400 mt-0.5 font-mono">
            {streakDays} <span className="text-xs font-normal text-slate-400">Days</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase font-bold text-slate-400 dark:text-slate-500">
            <Clock className="w-3 h-3 text-blue-500" />
            <span>Total Studied</span>
          </div>
          <div className="text-sm sm:text-base font-black text-blue-600 dark:text-blue-400 mt-0.5 font-mono">
            {stats.totalHours} <span className="text-xs font-normal text-slate-400">Hours</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase font-bold text-slate-400 dark:text-slate-500">
            <TrendingUp className="w-3 h-3 text-purple-500" />
            <span>Peak Session</span>
          </div>
          <div className="text-sm sm:text-base font-black text-purple-600 dark:text-purple-400 mt-0.5 font-mono truncate">
            {stats.maxMinutesDay?.minutes || 45}m{' '}
            <span className="text-xs font-normal text-slate-400">({stats.maxMinutesDay?.dayLabel || 'Oct'})</span>
          </div>
        </div>
      </div>

      {/* ================= HEATMAP CANVAS ================= */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 overflow-x-auto scrollbar-none">
        {viewMode === 'github' ? (
          /* GitHub Contribution Flow: Week columns, Weekday rows */
          <div className="min-w-[480px]">
            {/* Top Month Header Markers */}
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 pb-2 px-6">
              <span>30 Days Ago</span>
              <span>2 Weeks Ago</span>
              <span>Last Week</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-black">Today ({daysData[daysData.length - 1]?.dayLabel})</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Day-of-week labels on left (Mon, Wed, Fri) */}
              <div className="flex flex-col justify-between h-[130px] sm:h-[145px] text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500 pr-1 shrink-0">
                <span>Sun</span>
                <span>Tue</span>
                <span>Thu</span>
                <span>Sat</span>
              </div>

              {/* Matrix of Columns (Weeks) */}
              <div className="flex items-center gap-1.5 flex-1 justify-between">
                {githubWeeks.map((week, wIdx) => (
                  <div key={`week-${wIdx}`} className="flex flex-col gap-1.5">
                    {week.map((day, dIdx) => {
                      if (!day) {
                        return (
                          <div
                            key={`empty-${wIdx}-${dIdx}`}
                            className="w-5 h-5 sm:w-6 sm:h-6 rounded-md opacity-0 pointer-events-none"
                          />
                        );
                      }
                      const isSelected = selectedDay?.dateStr === day.dateStr;
                      return (
                        <button
                          key={day.dateStr}
                          type="button"
                          onMouseEnter={() => setHoveredDay(day)}
                          onMouseLeave={() => setHoveredDay(null)}
                          onClick={() => {
                            soundManager.playBeep(480 + day.intensity * 60, 0.03);
                            setSelectedDay(day);
                          }}
                          className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md transition-all duration-150 cursor-pointer relative group ${getIntensityClass(
                            day.intensity,
                            day.isToday,
                            isSelected
                          )}`}
                          aria-label={`${day.dayLabel}: ${day.minutes} minutes practiced, ${day.drillsCount} activities`}
                        >
                          {day.isToday && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Calendar Grid Mode: 7 Columns (Sun to Sat) × Rows */
          <div className="space-y-2">
            {/* Weekday labels */}
            <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Continuous 30-day chronological grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {/* Optional leading spaces for first day */}
              {Array.from({ length: daysData[0]?.dayOfWeek || 0 }).map((_, i) => (
                <div key={`pad-${i}`} className="h-9 sm:h-10 rounded-lg opacity-0" />
              ))}

              {daysData.map((day) => {
                const isSelected = selectedDay?.dateStr === day.dateStr;
                return (
                  <button
                    key={day.dateStr}
                    type="button"
                    onMouseEnter={() => setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    onClick={() => {
                      soundManager.playBeep(480 + day.intensity * 60, 0.03);
                      setSelectedDay(day);
                    }}
                    className={`h-9 sm:h-10 rounded-lg p-1 flex flex-col justify-between items-center transition-all duration-150 cursor-pointer ${getIntensityClass(
                      day.intensity,
                      day.isToday,
                      isSelected
                    )}`}
                  >
                    <span className="text-[10px] font-mono font-bold leading-none">
                      {day.dateStr.split('-')[2]}
                    </span>
                    <span className="text-[9px] font-bold leading-none truncate opacity-90">
                      {day.minutes > 0 ? `${day.minutes}m` : '—'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Legend & Tooltip Summary Strip */}
        <div className="mt-3 pt-3 border-t border-slate-200/70 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          {/* Active Hover / Selected Quick Preview */}
          <div className="flex items-center gap-2 min-w-0">
            {activeHover ? (
              <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                <span className="font-bold text-slate-900 dark:text-white">
                  {activeHover.weekdayName}, {activeHover.dayLabel}
                  {activeHover.isToday ? ' (Today)' : ''}:
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {activeHover.minutes} min{activeHover.minutes === 1 ? '' : 's'}
                </span>
                <span className="text-slate-400 hidden md:inline">
                  • {activeHover.activities.length} session{activeHover.activities.length === 1 ? '' : 's'} completed
                </span>
              </div>
            ) : (
              <span className="text-slate-400 text-xs">
                Hover or click any square to inspect study duration and drills
              </span>
            )}
          </div>

          {/* GitHub Style Legend */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto text-[11px] font-mono text-slate-400">
            <span>Less</span>
            <span className="w-3.5 h-3.5 rounded-sm bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700" title="0 min (Rest day)" />
            <span className="w-3.5 h-3.5 rounded-sm bg-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800/60" title="1-19 min" />
            <span className="w-3.5 h-3.5 rounded-sm bg-emerald-300 dark:bg-emerald-800 border border-emerald-400 dark:border-emerald-700" title="20-34 min" />
            <span className="w-3.5 h-3.5 rounded-sm bg-emerald-400 dark:bg-emerald-600 border border-emerald-500" title="35-49 min" />
            <span className="w-3.5 h-3.5 rounded-sm bg-emerald-500 dark:bg-emerald-500 border border-emerald-600 shadow-2xs" title="50+ min / Mock Exam" />
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Selected Day Expanded Activity Breakdown Drawer */}
      {selectedDay && (
        <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                {selectedDay.weekdayName}, {selectedDay.dayLabel} Breakdown
              </span>
              {selectedDay.isToday && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                  Current Session
                </span>
              )}
            </div>
            <div className="text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>
                ⏱ Total Time: <strong className="text-slate-900 dark:text-white font-mono">{selectedDay.minutes} mins</strong>
              </span>
              <span>
                🎯 Completed:{' '}
                <strong className="text-slate-900 dark:text-white font-mono">
                  {selectedDay.activities.length > 0 ? selectedDay.activities.join(' • ') : 'Rest & Recovery Day'}
                </strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onNavigate && (
              <button
                type="button"
                onClick={() => {
                  soundManager.playBeep(560, 0.04);
                  onNavigate('practice');
                }}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B1224] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200/90 dark:border-slate-700 transition flex items-center gap-1 cursor-pointer"
              >
                <span>Jump to Practice</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
