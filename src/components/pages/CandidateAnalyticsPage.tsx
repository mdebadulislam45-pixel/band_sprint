import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Award,
  Headphones,
  BookOpen,
  Mic,
  PenTool,
  Sparkles,
  BarChart3,
  ShieldAlert,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { UserProfile } from '../../types';
import {
  aggregateCandidateAnalyticsEvents,
  aggregateExamHistory,
  buildSafeHistoryFallbackEvents,
  paginateRecords,
  type CandidateAnalyticsEventLike,
  type DateRangeFilter
} from '../../utils/historyAggregation';
import { describeExamHistoryDisplay } from '../../utils/userStorage';
import { getStoredSessionToken } from '../../services/authService';

export interface AnalyticsEventItem {
  id: string;
  schemaVersion: '1.0';
  category: 'candidate' | 'factory_operational';
  eventType: 'practice_started' | 'practice_completed' | 'practice_exited' | 'module_evaluated';
  userId?: string;
  serverTimestamp: number;
  clientTimestamp?: number;
  payload: {
    moduleId: 'reading' | 'listening' | 'writing' | 'speaking';
    format?: 'Academic' | 'General Training';
    completionStatus?: 'completed' | 'abandoned' | 'in_progress';
    overallBandScore?: number | null;
    criterionScores?: Record<string, number | null | undefined>;
    sectionScores?: Record<string, number>;
    durationSeconds?: number;
    questionCount?: number;
    answeredCount?: number;
    isAiPilot?: boolean;
    assessmentStatus?: string;
    isPartialAssessment?: boolean;
    pronunciationObservable?: boolean;
    evidenceMode?: string;
  };
}

interface CandidateAnalyticsPageProps {
  user?: UserProfile | null;
  onNavigate: (page: string) => void;
  onShowToast?: (msg: string) => void;
}

type DateRangePreset = 'all' | '7d' | '30d';

export async function fetchCandidateAnalyticsEvents(params: {
  fallbackEvents: CandidateAnalyticsEventLike[];
  getToken?: () => string | null;
  fetcher?: typeof fetch;
}): Promise<{ events: CandidateAnalyticsEventLike[]; usedFallback: boolean; unauthorized: boolean }> {
  const {
    fallbackEvents,
    getToken = getStoredSessionToken,
    fetcher = fetch
  } = params;

  const token = getToken();
  if (!token) {
    return { events: fallbackEvents, usedFallback: true, unauthorized: false };
  }

  try {
    const res = await fetcher('/api/analytics/candidate/events?limit=200', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!res.ok) {
      return {
        events: fallbackEvents,
        usedFallback: true,
        unauthorized: res.status === 401
      };
    }
    const data = await res.json();
    if (data && Array.isArray(data.events) && data.events.length > 0) {
      return { events: data.events, usedFallback: false, unauthorized: false };
    }
    return { events: fallbackEvents, usedFallback: true, unauthorized: false };
  } catch {
    return { events: fallbackEvents, usedFallback: true, unauthorized: false };
  }
}

export const CandidateAnalyticsPage: React.FC<CandidateAnalyticsPageProps> = ({
  user,
  onNavigate
}) => {
  const [events, setEvents] = useState<CandidateAnalyticsEventLike[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<'All' | 'Academic' | 'General Training'>('All');
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('all');
  const [historyPage, setHistoryPage] = useState<number>(1);

  const examHistory = user?.progress?.examHistory || [];
  const intendedFormat = user?.progress?.intendedFormat || 'Academic';

  const fallbackEvents = useMemo(
    () => buildSafeHistoryFallbackEvents(examHistory, intendedFormat, user?.id),
    [examHistory, intendedFormat, user?.id]
  );

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchCandidateAnalyticsEvents({ fallbackEvents });
      setEvents(result.events);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setEvents(fallbackEvents);
    fetchAnalytics();
  }, [user?.id, examHistory.length]);

  useEffect(() => {
    setHistoryPage(1);
  }, [dateRangePreset, selectedFormat]);

  const dateRange = useMemo<DateRangeFilter | undefined>(() => {
    if (dateRangePreset === 'all') return undefined;
    const days = dateRangePreset === '7d' ? 7 : 30;
    return { fromTimestamp: Date.now() - days * 24 * 60 * 60 * 1000 };
  }, [dateRangePreset]);

  const activeEvents = events.length > 0 ? events : fallbackEvents;

  const stats = useMemo(
    () =>
      aggregateCandidateAnalyticsEvents(activeEvents, {
        format: selectedFormat,
        dateRange
      }),
    [activeEvents, selectedFormat, dateRange]
  );

  const historyAgg = useMemo(
    () => aggregateExamHistory(examHistory, { dateRange }),
    [examHistory, dateRange]
  );

  const paginatedHistory = useMemo(
    () => paginateRecords(historyAgg.evaluatedRecords, { page: historyPage, pageSize: 5 }),
    [historyAgg.evaluatedRecords, historyPage]
  );

  const evaluatedComparisonBars = useMemo(
    () =>
      stats.moduleComparisonData.filter(
        (m): m is typeof m & { latestBand: number } => m.latestBand !== null
      ),
    [stats.moduleComparisonData]
  );

  if (isLoading && activeEvents.length === 0) {
    return (
      <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-6 animate-pulse">
        <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 text-center space-y-4 my-12">
        <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Analytics Unavailable</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const comparableTrend = stats.latestComparableTrend;
  const showTrendDelta =
    comparableTrend.trend.status !== 'insufficient_data' &&
    comparableTrend.trend.delta !== null;

  return (
    <div className="w-full max-w-6xl mx-auto p-2 sm:p-4 space-y-6 pb-24">
      {/* 1. Header Banner & Exam Format / Date Filters */}
      <div className="bg-[#0F4C45] dark:bg-[#0D3833] text-white rounded-2xl p-6 sm:p-8 border border-[#1F8A70]/35 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[#F4A62A] font-mono text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Candidate Performance Analytics</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Date Range Filter */}
            <div className="flex items-center bg-white/10 p-1 rounded-xl border border-white/15 text-xs">
              {(
                [
                  { id: 'all', label: 'All Time' },
                  { id: '30d', label: '30 Days' },
                  { id: '7d', label: '7 Days' }
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setDateRangePreset(preset.id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    dateRangePreset === preset.id
                      ? 'bg-white text-[#0E1F1E]'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Academic / General Training Filter */}
            <div className="flex items-center bg-white/10 p-1 rounded-xl border border-white/15 text-xs">
              {(['All', 'Academic', 'General Training'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setSelectedFormat(f)}
                  className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    selectedFormat === f
                      ? 'bg-[#F4A62A] text-[#0E1F1E]'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Performance &amp; Progress Analytics
          </h1>
          <p className="text-xs sm:text-sm text-white/80 max-w-2xl leading-relaxed mt-1">
            Verified score trends and module breakdowns derived strictly from evaluated IELTS assessments. Incomplete, diagnostic, or unverified attempts are never averaged as band scores.
          </p>
        </div>
      </div>

      {/* 2. Top-Level Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Latest Evaluated Band */}
        <div className="bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1E3330] p-4 rounded-xl space-y-1">
          <span className="text-[11px] font-mono font-semibold text-[#566664] dark:text-[#96B0AC] uppercase tracking-wider block">
            Latest Evaluated Band
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl sm:text-3xl font-bold text-[#0E1F1E] dark:text-[#EEF3F1] tabular-nums">
              {comparableTrend.latestBand !== null ? comparableTrend.latestBand.toFixed(1) : '—'}
            </span>
            {showTrendDelta && comparableTrend.trend.delta !== null && (
              <span
                className={`text-xs font-mono font-bold tabular-nums ${
                  comparableTrend.trend.delta >= 0
                    ? 'text-[#0F4C45] dark:text-[#4DB6A4]'
                    : 'text-rose-600'
                }`}
              >
                {comparableTrend.trend.delta >= 0 ? '+' : ''}
                {comparableTrend.trend.delta.toFixed(1)}
              </span>
            )}
          </div>
          <span className="text-[11px] text-[#566664] dark:text-[#96B0AC] block truncate">
            {comparableTrend.latestBand !== null
              ? `${comparableTrend.latestModule} · ${comparableTrend.latestDate}${
                  showTrendDelta ? ' (same-skill trend)' : ' · Need 2+ same-skill scores for trend'
                }`
              : 'Not assessed'}
          </span>
        </div>

        {/* Completed Full Mocks vs Total Attempts */}
        <div className="bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1E3330] p-4 rounded-xl space-y-1">
          <span className="text-[11px] font-mono font-semibold text-[#566664] dark:text-[#96B0AC] uppercase tracking-wider block">
            Completed Full Mocks
          </span>
          <span className="font-mono text-2xl sm:text-3xl font-bold text-[#0E1F1E] dark:text-[#EEF3F1] tabular-nums block">
            {historyAgg.completedFullMockCount}
          </span>
          <span className="text-[11px] text-[#566664] dark:text-[#96B0AC] block truncate">
            {historyAgg.overall.best !== null
              ? `Best Overall: ${historyAgg.overall.best.toFixed(1)} · Avg: ${historyAgg.overall.average?.toFixed(1)}`
              : `${stats.totalRecorded} recorded session${stats.totalRecorded === 1 ? '' : 's'}`}
          </span>
        </div>

        {/* Evaluated Sessions */}
        <div className="bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1E3330] p-4 rounded-xl space-y-1">
          <span className="text-[11px] font-mono font-semibold text-[#566664] dark:text-[#96B0AC] uppercase tracking-wider block">
            Evaluated Scores
          </span>
          <span className="font-mono text-2xl sm:text-3xl font-bold text-[#0F4C45] dark:text-[#4DB6A4] tabular-nums block">
            {stats.evaluatedCount}
          </span>
          <span className="text-[11px] text-[#566664] dark:text-[#96B0AC] block truncate">
            {stats.incompleteOrUnassessedCount > 0
              ? `${stats.incompleteOrUnassessedCount} unassessed / incomplete excluded`
              : 'Verified scored records'}
          </span>
        </div>

        {/* Completion Rate */}
        <div className="bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1E3330] p-4 rounded-xl space-y-1">
          <span className="text-[11px] font-mono font-semibold text-[#566664] dark:text-[#96B0AC] uppercase tracking-wider block">
            Completion Rate
          </span>
          <span className="font-mono text-2xl sm:text-3xl font-bold text-[#0F4C45] dark:text-[#4DB6A4] tabular-nums block">
            {stats.totalRecorded > 0
              ? `${Math.round((stats.completedCount / stats.totalRecorded) * 100)}%`
              : '—'}
          </span>
          <span className="text-[11px] text-slate-400 block truncate">
            {stats.completedCount} completed · {stats.exitedCount} exited
          </span>
        </div>
      </div>

      {/* 3. Empty State Banner if 0 Events */}
      {stats.totalRecorded === 0 && (
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-8 sm:p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Evaluated Sessions Yet</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Complete your first evaluated Listening, Reading, Writing, or Speaking practice session to see genuine band trends and skill comparisons here.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('speaking')}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition cursor-pointer"
            >
              Start Speaking Lab
            </button>
            <button
              onClick={() => onNavigate('writing')}
              className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition cursor-pointer"
            >
              Start Writing Lab
            </button>
          </div>
        </div>
      )}

      {/* 4. Score Progression Chart (Only rendered when >= 2 evaluated score points exist — never plots missing as 0) */}
      {stats.scorePoints.length >= 2 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 rounded-3xl shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Evaluated Band Progression
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              {stats.scorePoints.length} evaluated score{stats.scorePoints.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.scorePoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 9]} ticks={[0, 2, 4, 6, 7, 8, 9]} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [`Band ${Number(val).toFixed(1)}`, 'Evaluated Band']}
                  labelFormatter={(lbl) => `Session Date: ${lbl}`}
                />
                <Line
                  type="monotone"
                  dataKey="band"
                  connectNulls={false}
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#4f46e5' }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : stats.scorePoints.length === 1 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-2xs text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between gap-3">
          <span>
            1 evaluated score recorded ({stats.scorePoints[0].module}: Band {stats.scorePoints[0].band.toFixed(1)}). Complete at least 2 evaluated sessions to plot a score trend.
          </span>
        </div>
      ) : null}

      {/* 4B. Evaluated Skill Comparison Bar Chart (only plots evaluated modules — never plots unassessed skills as 0) */}
      {evaluatedComparisonBars.length >= 2 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 rounded-3xl shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Evaluated Skill Comparison (Latest Band)
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              {evaluatedComparisonBars.length} of 4 skills assessed
            </span>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evaluatedComparisonBars} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 9]} ticks={[0, 3, 5, 7, 9]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val: any) => [`Band ${Number(val).toFixed(1)}`, 'Latest Band']} />
                <Bar dataKey="latestBand" fill="#0F4C45" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 5. Four Modules Grid & Criterion Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Listening Performance Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Listening Lab</h3>
                <span className="text-xs text-slate-500">
                  {stats.moduleEvaluatedCounts.listening} evaluated · {stats.moduleAttemptCounts.listening} attempted
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-slate-900 dark:text-white block">
                {stats.latestModuleBand.listening !== null ? `Band ${stats.latestModuleBand.listening.toFixed(1)}` : '—'}
              </span>
              {stats.bestModuleBand.listening !== null && (
                <span className="text-[10px] font-mono text-slate-500">
                  Best {stats.bestModuleBand.listening.toFixed(1)}
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Tracks CD-IELTS 4-section listening practice, speech comprehension, and audio completion discipline.
          </p>
        </div>

        {/* Reading Performance Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Reading Lab</h3>
                <span className="text-xs text-slate-500">
                  {stats.moduleEvaluatedCounts.reading} evaluated · {stats.moduleAttemptCounts.reading} attempted
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-slate-900 dark:text-white block">
                {stats.latestModuleBand.reading !== null ? `Band ${stats.latestModuleBand.reading.toFixed(1)}` : '—'}
              </span>
              {stats.bestModuleBand.reading !== null && (
                <span className="text-[10px] font-mono text-slate-500">
                  Best {stats.bestModuleBand.reading.toFixed(1)}
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Measures 3-passage navigation, academic reading comprehension, and speed discipline.
          </p>
        </div>

        {/* Writing Performance Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
                <PenTool className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Writing Lab</h3>
                <span className="text-xs text-slate-500">
                  {stats.moduleEvaluatedCounts.writing} evaluated · {stats.moduleAttemptCounts.writing} attempted
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-slate-900 dark:text-white block">
                {stats.latestModuleBand.writing !== null ? `Band ${stats.latestModuleBand.writing.toFixed(1)}` : '—'}
              </span>
              {stats.bestModuleBand.writing !== null && (
                <span className="text-[10px] font-mono text-slate-500">
                  Best {stats.bestModuleBand.writing.toFixed(1)}
                </span>
              )}
            </div>
          </div>
          {stats.writingCriteria.hasAnyCriterion ? (
            <div className="grid grid-cols-4 gap-2 pt-1 text-center">
              {(
                [
                  { key: 'ta', label: 'TA / TR' },
                  { key: 'cc', label: 'CC' },
                  { key: 'lr', label: 'LR' },
                  { key: 'gra', label: 'GRA' }
                ] as const
              ).map((c) => (
                <div key={c.key} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">{c.label}</span>
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {stats.writingCriteria.values[c.key] !== null
                      ? stats.writingCriteria.values[c.key]!.toFixed(1)
                      : '—'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 leading-relaxed">
              Task 1 and Task 2 response assessment across Task Achievement, Coherence, Lexical Resource, and Grammar.
            </p>
          )}
        </div>

        {/* Speaking Performance Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Speaking Lab</h3>
                <span className="text-xs text-slate-500">
                  {stats.moduleEvaluatedCounts.speaking} evaluated · {stats.moduleAttemptCounts.speaking} attempted
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-slate-900 dark:text-white block">
                {stats.latestModuleBand.speaking !== null ? `Band ${stats.latestModuleBand.speaking.toFixed(1)}` : '—'}
              </span>
              {stats.bestModuleBand.speaking !== null && (
                <span className="text-[10px] font-mono text-slate-500">
                  Best {stats.bestModuleBand.speaking.toFixed(1)}
                </span>
              )}
            </div>
          </div>
          {stats.speakingCriteria.hasAnyCriterion ? (
            <div className="grid grid-cols-4 gap-2 pt-1 text-center">
              {(
                [
                  { key: 'fc', label: 'FC' },
                  { key: 'lr', label: 'LR' },
                  { key: 'gra', label: 'GRA' },
                  { key: 'pr', label: 'PR' }
                ] as const
              ).map((c) => (
                <div key={c.key} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">{c.label}</span>
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {stats.speakingCriteria.values[c.key] !== null
                      ? stats.speakingCriteria.values[c.key]!.toFixed(1)
                      : '—'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 leading-relaxed">
              Examiner interview assessments across Fluency, Lexical Resource, Grammar, and Pronunciation.
            </p>
          )}
        </div>
      </div>

      {/* 6. Diagnostic Strengths and Weaknesses (only when >= 2 evaluated skills exist) */}
      {stats.strongestModule && stats.weakestModule && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Diagnostic Insights</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase block">Strongest Skill</span>
                <span className="text-sm font-black text-emerald-900 dark:text-emerald-200">{stats.strongestModule.name}</span>
              </div>
              <span className="text-base font-black text-emerald-700 dark:text-emerald-300">
                Band {stats.strongestModule.band.toFixed(1)}
              </span>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase block">Focus Opportunity</span>
                <span className="text-sm font-black text-amber-900 dark:text-amber-200">{stats.weakestModule.name}</span>
              </div>
              <span className="text-base font-black text-amber-700 dark:text-amber-300">
                Band {stats.weakestModule.band.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 7. Paginated Assessment History Breakdown */}
      {historyAgg.evaluatedRecords.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Recorded Assessment History
              </h3>
              <p className="text-[11px] text-slate-500">
                {historyAgg.completedFullMockCount} completed full mock{historyAgg.completedFullMockCount === 1 ? '' : 's'} ·{' '}
                {historyAgg.singleSkillEvaluatedCount} single-skill ·{' '}
                {historyAgg.incompleteMockCount} incomplete ·{' '}
                {historyAgg.diagnosticOrUnassessedCount} diagnostic / unassessed
              </p>
            </div>
            {paginatedHistory.totalPages > 1 && (
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <button
                  type="button"
                  disabled={paginatedHistory.page <= 1}
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                  aria-label="Previous history page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-slate-500 px-1">
                  {paginatedHistory.page} / {paginatedHistory.totalPages}
                </span>
                <button
                  type="button"
                  disabled={paginatedHistory.page >= paginatedHistory.totalPages}
                  onClick={() => setHistoryPage((p) => Math.min(paginatedHistory.totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                  aria-label="Next history page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {paginatedHistory.items.map((ev, idx) => {
              const globalIndex = (paginatedHistory.page - 1) * paginatedHistory.pageSize + idx;
              const attemptNumber = historyAgg.evaluatedRecords.length - globalIndex;
              const desc = describeExamHistoryDisplay(ev.record, attemptNumber);
              return (
                <div
                  key={ev.record.id || globalIndex}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{desc.title}</span>
                      {desc.statusNote && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-mono">
                          {desc.statusNote}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      {new Date(ev.record.timestamp).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}{' '}
                      · {desc.skillSummaryParts.join(' · ')}
                    </div>
                  </div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    {desc.badgeScore}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
