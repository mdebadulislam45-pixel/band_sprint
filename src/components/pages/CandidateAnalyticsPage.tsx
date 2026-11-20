import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Award,
  Headphones,
  BookOpen,
  Mic,
  PenTool,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  Sparkles,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldAlert,
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
  Tooltip,
  Legend
} from 'recharts';
import { UserProfile } from '../../types';

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
    overallBandScore?: number;
    criterionScores?: Record<string, number>;
    sectionScores?: Record<string, number>;
    durationSeconds?: number;
    questionCount?: number;
    answeredCount?: number;
    isAiPilot?: boolean;
  };
}

interface CandidateAnalyticsPageProps {
  user?: UserProfile | null;
  onNavigate: (page: string) => void;
  onShowToast?: (msg: string) => void;
}

export const CandidateAnalyticsPage: React.FC<CandidateAnalyticsPageProps> = ({
  user,
  onNavigate,
  onShowToast
}) => {
  const [events, setEvents] = useState<AnalyticsEventItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<'All' | 'Academic' | 'General Training'>('All');

  const buildHistoryFallbackEvents = (): AnalyticsEventItem[] => {
    const history = user?.progress?.examHistory || [];
    return history.map((h, idx) => {
      const lower = (h.examType || '').toLowerCase();
      const moduleId: 'reading' | 'listening' | 'writing' | 'speaking' = lower.includes('listen')
        ? 'listening'
        : lower.includes('writ')
        ? 'writing'
        : lower.includes('speak')
        ? 'speaking'
        : 'reading';
      return {
        id: h.id || `hist_${idx}`,
        schemaVersion: '1.0',
        category: 'candidate',
        eventType: 'module_evaluated',
        userId: user?.id,
        serverTimestamp: h.timestamp || Date.now(),
        payload: {
          moduleId,
          format: user?.progress?.intendedFormat || 'Academic',
          completionStatus: 'completed',
          overallBandScore: h.overallBand
        }
      };
    });
  };

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analytics/candidate/events?limit=200');
      if (!res.ok) {
        setEvents(buildHistoryFallbackEvents());
        setIsLoading(false);
        return;
      }
      const data = await res.json();
      if (data && Array.isArray(data.events) && data.events.length > 0) {
        setEvents(data.events);
      } else {
        setEvents(buildHistoryFallbackEvents());
      }
    } catch {
      setEvents(buildHistoryFallbackEvents());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [user?.id, user?.progress?.examHistory?.length]);

  // Filter events by selected format
  const filteredEvents = useMemo(() => {
    if (selectedFormat === 'All') return events;
    return events.filter(e => !e.payload.format || e.payload.format === selectedFormat);
  }, [events, selectedFormat]);

  // Derived statistics (Using genuine recorded events only — 0 demo or baseline fallback)
  const stats = useMemo(() => {
    const totalRecorded = filteredEvents.length;
    const completedEvents = filteredEvents.filter(e => e.eventType === 'practice_completed' || e.payload.completionStatus === 'completed');
    const evaluatedEvents = filteredEvents.filter(e => e.eventType === 'module_evaluated' || (typeof e.payload.overallBandScore === 'number' && e.payload.overallBandScore > 0));
    const exitedEvents = filteredEvents.filter(e => e.eventType === 'practice_exited' || e.payload.completionStatus === 'abandoned');

    // Module-wise breakdown
    const readingEvents = filteredEvents.filter(e => e.payload.moduleId === 'reading');
    const listeningEvents = filteredEvents.filter(e => e.payload.moduleId === 'listening');
    const writingEvents = filteredEvents.filter(e => e.payload.moduleId === 'writing');
    const speakingEvents = filteredEvents.filter(e => e.payload.moduleId === 'speaking');

    // Extract genuine score progression chronologically (oldest to newest)
    const scorePoints = evaluatedEvents
      .filter(e => typeof e.payload.overallBandScore === 'number')
      .sort((a, b) => a.serverTimestamp - b.serverTimestamp)
      .map((e, idx) => ({
        index: idx + 1,
        date: new Date(e.serverTimestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        band: e.payload.overallBandScore,
        module: e.payload.moduleId.toUpperCase(),
        format: e.payload.format || 'Academic'
      }));

    // Latest score & previous score
    const latestScorePoint = scorePoints.length > 0 ? scorePoints[scorePoints.length - 1] : null;
    const previousScorePoint = scorePoints.length > 1 ? scorePoints[scorePoints.length - 2] : null;

    // Latest module scores
    const getLatestModuleScore = (moduleEvents: AnalyticsEventItem[]) => {
      const scored = moduleEvents
        .filter(e => typeof e.payload.overallBandScore === 'number')
        .sort((a, b) => b.serverTimestamp - a.serverTimestamp);
      return scored.length > 0 ? scored[0].payload.overallBandScore : null;
    };

    const latestReadingBand = getLatestModuleScore(readingEvents);
    const latestListeningBand = getLatestModuleScore(listeningEvents);
    const latestWritingBand = getLatestModuleScore(writingEvents);
    const latestSpeakingBand = getLatestModuleScore(speakingEvents);

    // Latest criteria averages for Speaking & Writing
    const speakingCriterionAgg = { fc: 0, lr: 0, gra: 0, pr: 0, count: 0 };
    speakingEvents.forEach(e => {
      if (e.payload.criterionScores) {
        if (typeof e.payload.criterionScores.fc === 'number') speakingCriterionAgg.fc += e.payload.criterionScores.fc;
        if (typeof e.payload.criterionScores.lr === 'number') speakingCriterionAgg.lr += e.payload.criterionScores.lr;
        if (typeof e.payload.criterionScores.gra === 'number') speakingCriterionAgg.gra += e.payload.criterionScores.gra;
        if (typeof e.payload.criterionScores.pr === 'number') speakingCriterionAgg.pr += e.payload.criterionScores.pr;
        speakingCriterionAgg.count++;
      }
    });

    const writingCriterionAgg = { ta: 0, cc: 0, lr: 0, gra: 0, count: 0 };
    writingEvents.forEach(e => {
      if (e.payload.criterionScores) {
        if (typeof e.payload.criterionScores.ta === 'number') writingCriterionAgg.ta += e.payload.criterionScores.ta;
        if (typeof e.payload.criterionScores.cc === 'number') writingCriterionAgg.cc += e.payload.criterionScores.cc;
        if (typeof e.payload.criterionScores.lr === 'number') writingCriterionAgg.lr += e.payload.criterionScores.lr;
        if (typeof e.payload.criterionScores.gra === 'number') writingCriterionAgg.gra += e.payload.criterionScores.gra;
        writingCriterionAgg.count++;
      }
    });

    // Module comparison bar data
    const moduleComparisonData = [
      { name: 'Listening', attempts: listeningEvents.length, latestBand: latestListeningBand ?? 0 },
      { name: 'Reading', attempts: readingEvents.length, latestBand: latestReadingBand ?? 0 },
      { name: 'Writing', attempts: writingEvents.length, latestBand: latestWritingBand ?? 0 },
      { name: 'Speaking', attempts: speakingEvents.length, latestBand: latestSpeakingBand ?? 0 }
    ];

    // Diagnostic Strengths and Weaknesses
    const scoredModules = [
      { name: 'Listening', band: latestListeningBand },
      { name: 'Reading', band: latestReadingBand },
      { name: 'Writing', band: latestWritingBand },
      { name: 'Speaking', band: latestSpeakingBand }
    ].filter(m => m.band !== null) as { name: string; band: number }[];

    let strongestModule = null;
    let weakestModule = null;
    if (scoredModules.length >= 2) {
      scoredModules.sort((a, b) => b.band - a.band);
      strongestModule = scoredModules[0];
      weakestModule = scoredModules[scoredModules.length - 1];
    }

    return {
      totalRecorded,
      completedCount: completedEvents.length,
      evaluatedCount: evaluatedEvents.length,
      exitedCount: exitedEvents.length,
      readingCount: readingEvents.length,
      listeningCount: listeningEvents.length,
      writingCount: writingEvents.length,
      speakingCount: speakingEvents.length,
      scorePoints,
      latestScorePoint,
      previousScorePoint,
      latestReadingBand,
      latestListeningBand,
      latestWritingBand,
      latestSpeakingBand,
      speakingCriterionAgg,
      writingCriterionAgg,
      moduleComparisonData,
      strongestModule,
      weakestModule
    };
  }, [filteredEvents]);

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-6 animate-pulse">
        <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
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

  return (
    <div className="w-full max-w-6xl mx-auto p-2 sm:p-4 space-y-6 pb-24">
      {/* 1. Header Banner & Exam Format Filter */}
      <div className="bg-[#0F4C45] dark:bg-[#0D3833] text-white rounded-2xl p-6 sm:p-8 border border-[#1F8A70]/35 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[#F4A62A] font-mono text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Candidate Performance Analytics</span>
          </div>

          {/* Academic / General Training Filter */}
          <div className="flex items-center bg-white/10 p-1 rounded-xl border border-white/15 text-xs">
            {(['All', 'Academic', 'General Training'] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setSelectedFormat(f)}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  selectedFormat === f ? 'bg-[#F4A62A] text-[#0E1F1E]' : 'text-white/80 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Performance &amp; Progress Analytics
          </h1>
          <p className="text-xs sm:text-sm text-white/80 max-w-2xl leading-relaxed mt-1">
            Score trends and module breakdowns derived from your recorded IELTS practice sessions and synced cloud history.
          </p>
        </div>
      </div>

      {/* 2. Top-Level Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Latest Band */}
        <div className="bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1E3330] p-4 rounded-xl space-y-1">
          <span className="text-[11px] font-mono font-semibold text-[#566664] dark:text-[#96B0AC] uppercase tracking-wider block">Latest Band</span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl sm:text-3xl font-bold text-[#0E1F1E] dark:text-[#EEF3F1] tabular-nums">
              {stats.latestScorePoint ? stats.latestScorePoint.band.toFixed(1) : '—'}
            </span>
            {stats.previousScorePoint && stats.latestScorePoint && (
              <span className={`text-xs font-mono font-bold tabular-nums ${
                stats.latestScorePoint.band >= stats.previousScorePoint.band ? 'text-[#0F4C45] dark:text-[#4DB6A4]' : 'text-rose-600'
              }`}>
                {stats.latestScorePoint.band >= stats.previousScorePoint.band ? '+' : ''}
                {(stats.latestScorePoint.band - stats.previousScorePoint.band).toFixed(1)}
              </span>
            )}
          </div>
          <span className="text-[11px] text-[#566664] dark:text-[#96B0AC] block truncate">
            {stats.latestScorePoint ? `${stats.latestScorePoint.module} · ${stats.latestScorePoint.date}` : 'No evaluations yet'}
          </span>
        </div>

        {/* Total Sessions Recorded */}
        <div className="bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1E3330] p-4 rounded-xl space-y-1">
          <span className="text-[11px] font-mono font-semibold text-[#566664] dark:text-[#96B0AC] uppercase tracking-wider block">Total Attempts</span>
          <span className="font-mono text-2xl sm:text-3xl font-bold text-[#0E1F1E] dark:text-[#EEF3F1] tabular-nums block">
            {stats.totalRecorded}
          </span>
          <span className="text-[11px] text-[#566664] dark:text-[#96B0AC] block truncate">
            {stats.completedCount} completed · {stats.exitedCount} exited
          </span>
        </div>

        {/* Evaluated Sessions */}
        <div className="bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1E3330] p-4 rounded-xl space-y-1">
          <span className="text-[11px] font-mono font-semibold text-[#566664] dark:text-[#96B0AC] uppercase tracking-wider block">Evaluations</span>
          <span className="font-mono text-2xl sm:text-3xl font-bold text-[#0F4C45] dark:text-[#4DB6A4] tabular-nums block">
            {stats.evaluatedCount}
          </span>
          <span className="text-[11px] text-[#566664] dark:text-[#96B0AC] block truncate">
            Scored practice records
          </span>
        </div>

        {/* Completion Rate */}
        <div className="bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1E3330] p-4 rounded-xl space-y-1">
          <span className="text-[11px] font-mono font-semibold text-[#566664] dark:text-[#96B0AC] uppercase tracking-wider block">Completion Rate</span>
          <span className="font-mono text-2xl sm:text-3xl font-bold text-[#0F4C45] dark:text-[#4DB6A4] tabular-nums block">
            {stats.totalRecorded > 0 ? `${Math.round((stats.completedCount / stats.totalRecorded) * 100)}%` : '—'}
          </span>
          <span className="text-[11px] text-slate-400 block truncate">
            Practice discipline index
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
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Analytics Recorded Yet</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Complete your first Listening, Reading, Writing, or Speaking practice session to start seeing your genuine band trends and diagnostic analytics here.
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

      {/* 4. Score Progression Chart (Only rendered when evaluated score points exist) */}
      {stats.scorePoints.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 rounded-3xl shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Band Score Progression
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              {stats.scorePoints.length} point{stats.scorePoints.length !== 1 ? 's' : ''} recorded
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.scorePoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 9]} ticks={[0, 2, 4, 6, 7, 8, 9]} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [`Band ${Number(val).toFixed(1)}`, 'Score']}
                  labelFormatter={(lbl) => `Session Date: ${lbl}`}
                />
                <Line
                  type="monotone"
                  dataKey="band"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#4f46e5' }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
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
                <span className="text-xs text-slate-500">{stats.listeningCount} attempts recorded</span>
              </div>
            </div>
            <span className="text-lg font-black text-slate-900 dark:text-white">
              {stats.latestListeningBand !== null ? `Band ${stats.latestListeningBand.toFixed(1)}` : '—'}
            </span>
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
                <span className="text-xs text-slate-500">{stats.readingCount} attempts recorded</span>
              </div>
            </div>
            <span className="text-lg font-black text-slate-900 dark:text-white">
              {stats.latestReadingBand !== null ? `Band ${stats.latestReadingBand.toFixed(1)}` : '—'}
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Measures 3-passage passage navigation, academic reading comprehension, and speed discipline.
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
                <span className="text-xs text-slate-500">{stats.writingCount} attempts recorded</span>
              </div>
            </div>
            <span className="text-lg font-black text-slate-900 dark:text-white">
              {stats.latestWritingBand !== null ? `Band ${stats.latestWritingBand.toFixed(1)}` : '—'}
            </span>
          </div>
          {stats.writingCriterionAgg.count > 0 ? (
            <div className="grid grid-cols-4 gap-2 pt-1 text-center">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">TA / TR</span>
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  {(stats.writingCriterionAgg.ta / stats.writingCriterionAgg.count).toFixed(1)}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">CC</span>
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  {(stats.writingCriterionAgg.cc / stats.writingCriterionAgg.count).toFixed(1)}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">LR</span>
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  {(stats.writingCriterionAgg.lr / stats.writingCriterionAgg.count).toFixed(1)}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">GRA</span>
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  {(stats.writingCriterionAgg.gra / stats.writingCriterionAgg.count).toFixed(1)}
                </span>
              </div>
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
                <span className="text-xs text-slate-500">{stats.speakingCount} attempts recorded</span>
              </div>
            </div>
            <span className="text-lg font-black text-slate-900 dark:text-white">
              {stats.latestSpeakingBand !== null ? `Band ${stats.latestSpeakingBand.toFixed(1)}` : '—'}
            </span>
          </div>
          {stats.speakingCriterionAgg.count > 0 ? (
            <div className="grid grid-cols-4 gap-2 pt-1 text-center">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">FC</span>
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  {(stats.speakingCriterionAgg.fc / stats.speakingCriterionAgg.count).toFixed(1)}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">LR</span>
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  {(stats.speakingCriterionAgg.lr / stats.speakingCriterionAgg.count).toFixed(1)}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">GRA</span>
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  {(stats.speakingCriterionAgg.gra / stats.speakingCriterionAgg.count).toFixed(1)}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">PR</span>
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  {(stats.speakingCriterionAgg.pr / stats.speakingCriterionAgg.count).toFixed(1)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 leading-relaxed">
              Examiner interview assessments across Fluency, Lexical Resource, Grammar, and Pronunciation.
            </p>
          )}
        </div>
      </div>

      {/* 6. Diagnostic Strengths and Weaknesses */}
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
              <span className="text-base font-black text-emerald-700 dark:text-emerald-300">Band {stats.strongestModule.band.toFixed(1)}</span>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase block">Focus Opportunity</span>
                <span className="text-sm font-black text-amber-900 dark:text-amber-200">{stats.weakestModule.name}</span>
              </div>
              <span className="text-base font-black text-amber-700 dark:text-amber-300">Band {stats.weakestModule.band.toFixed(1)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
