import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Cpu,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
  Zap,
  RefreshCw,
  ShieldAlert,
  Server,
  ArrowRight,
  TrendingUp,
  FileCheck2,
  HardDrive
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { UserProfile } from '../../types';
import { AdminDraftReviewPanel } from '../admin/AdminDraftReviewPanel';

export interface FactoryOperationalEventItem {
  id: string;
  schemaVersion: '1.0';
  category: 'factory_operational';
  eventType: 'ai_generation_completed' | 'ai_generation_failed' | 'ai_validation_completed';
  serverTimestamp: number;
  payload: {
    moduleId: 'reading' | 'listening' | 'writing' | 'speaking';
    format?: 'Academic' | 'General Training';
    success: boolean;
    status: string;
    validationStatus?: 'PASSED' | 'FAILED' | 'REPAIRED';
    repairAttempts?: number;
    durationMs: number;
    sanitizedErrorCategory?: string;
    tokenUsage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
      thoughtsTokens?: number;
    };
  };
}

export function getFactoryCoverageStatus(observedCount: number): {
  instrumentationBadge: 'INSTRUMENTED';
  hasObservedActivity: boolean;
  observedEventsLabel: string;
  statusDescription: string;
} {
  const safeCount = typeof observedCount === 'number' && Number.isFinite(observedCount) && observedCount > 0
    ? Math.floor(observedCount)
    : 0;
  const hasObservedActivity = safeCount > 0;
  return {
    instrumentationBadge: 'INSTRUMENTED',
    hasObservedActivity,
    observedEventsLabel: `${safeCount} observed event${safeCount === 1 ? '' : 's'}`,
    statusDescription: hasObservedActivity
      ? 'Telemetry hooks installed · Observed generation latency, validation, and token metrics recorded.'
      : 'Telemetry hooks installed · No generation events observed yet in current store.'
  };
}

export function computeFactoryDashboardMetrics(
  events: FactoryOperationalEventItem[],
  selectedModule: 'All' | 'speaking' | 'writing' | 'reading' | 'listening' = 'All'
) {
  const filteredEvents = selectedModule === 'All'
    ? events
    : events.filter(e => e.payload.moduleId === selectedModule);

  const totalRecorded = filteredEvents.length;
  const completedEvents = filteredEvents.filter(e => e.payload.success === true || e.eventType === 'ai_generation_completed');
  const failedEvents = filteredEvents.filter(e => e.payload.success === false || e.eventType === 'ai_generation_failed');

  const successCount = completedEvents.length;
  const failureCount = failedEvents.length;

  // Validation outcomes
  const passedValidationCount = filteredEvents.filter(e => e.payload.validationStatus === 'PASSED').length;
  const repairedValidationCount = filteredEvents.filter(e => e.payload.validationStatus === 'REPAIRED').length;
  const failedValidationCount = filteredEvents.filter(e => e.payload.validationStatus === 'FAILED').length;

  // Latency calculation (only where valid durationMs > 0 exists)
  const validDurations = filteredEvents
    .map(e => e.payload.durationMs)
    .filter((d): d is number => typeof d === 'number' && Number.isFinite(d) && d > 0);

  const avgDurationMs = validDurations.length > 0
    ? Math.round(validDurations.reduce((sum, d) => sum + d, 0) / validDurations.length)
    : null;

  // Repair attempts calculation (only where recorded)
  const validRepairs = filteredEvents
    .map(e => e.payload.repairAttempts)
    .filter((r): r is number => typeof r === 'number' && Number.isFinite(r) && r >= 0);

  const avgRepairAttempts = validRepairs.length > 0
    ? Number((validRepairs.reduce((sum, r) => sum + r, 0) / validRepairs.length).toFixed(1))
    : null;

  // Authoritative Provider Token Accounting (never overwrites totalTokens with calculated subtotals)
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalThoughtsTokens = 0;
  let totalTokens = 0;
  let promptDataAvailable = false;
  let completionDataAvailable = false;
  let thoughtsDataAvailable = false;
  let tokenDataAvailable = false;

  filteredEvents.forEach(e => {
    const usage = e.payload.tokenUsage;
    if (usage && typeof usage === 'object') {
      if (typeof usage.promptTokens === 'number' && Number.isFinite(usage.promptTokens)) {
        totalPromptTokens += usage.promptTokens;
        promptDataAvailable = true;
      }
      if (typeof usage.completionTokens === 'number' && Number.isFinite(usage.completionTokens)) {
        totalCompletionTokens += usage.completionTokens;
        completionDataAvailable = true;
      }
      if (typeof usage.thoughtsTokens === 'number' && Number.isFinite(usage.thoughtsTokens)) {
        totalThoughtsTokens += usage.thoughtsTokens;
        thoughtsDataAvailable = true;
      }
      if (typeof usage.totalTokens === 'number' && Number.isFinite(usage.totalTokens)) {
        totalTokens += usage.totalTokens;
        tokenDataAvailable = true;
      }
    }
  });

  const reportedComponentSum =
    (promptDataAvailable ? totalPromptTokens : 0) +
    (completionDataAvailable ? totalCompletionTokens : 0) +
    (thoughtsDataAvailable ? totalThoughtsTokens : 0);

  const hasUnreportedTokenDelta =
    tokenDataAvailable && reportedComponentSum !== totalTokens;

  // Sanitized Error Categories
  const errorMap: Record<string, number> = {};
  failedEvents.forEach(e => {
    const cat = e.payload.sanitizedErrorCategory || 'UncategorizedError';
    errorMap[cat] = (errorMap[cat] || 0) + 1;
  });

  const errorCategories = Object.entries(errorMap).map(([category, count]) => ({
    category,
    count
  }));

  // Factory Telemetry Coverage Matrix
  const moduleCounts = {
    speaking: events.filter(e => e.payload.moduleId === 'speaking').length,
    writing: events.filter(e => e.payload.moduleId === 'writing').length,
    reading: events.filter(e => e.payload.moduleId === 'reading').length,
    listening: events.filter(e => e.payload.moduleId === 'listening').length
  };

  return {
    totalRecorded,
    successCount,
    failureCount,
    passedValidationCount,
    repairedValidationCount,
    failedValidationCount,
    avgDurationMs,
    avgRepairAttempts,
    tokenDataAvailable,
    promptDataAvailable,
    completionDataAvailable,
    thoughtsDataAvailable,
    totalPromptTokens,
    totalCompletionTokens,
    totalThoughtsTokens,
    totalTokens,
    hasUnreportedTokenDelta,
    errorCategories,
    moduleCounts
  };
}

interface AdminAnalyticsPageProps {
  user?: UserProfile | null;
  onNavigate: (page: string) => void;
  onShowToast?: (msg: string) => void;
  initialSection?: 'telemetry' | 'review';
}

export const AdminAnalyticsPage: React.FC<AdminAnalyticsPageProps> = ({
  user,
  onNavigate,
  onShowToast,
  initialSection = 'telemetry'
}) => {
  const [activeSection, setActiveSection] = useState<'telemetry' | 'review'>(initialSection);
  const [events, setEvents] = useState<FactoryOperationalEventItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState<boolean>(false);
  const [selectedModule, setSelectedModule] = useState<'All' | 'speaking' | 'writing' | 'reading' | 'listening'>('All');

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  const fetchFactoryMetrics = async () => {
    setIsLoading(true);
    setError(null);
    setIsUnauthorized(false);
    try {
      const headers: Record<string, string> = {};
      try {
        if (typeof localStorage !== 'undefined') {
          const token = localStorage.getItem('ielts_session_token_v2');
          if (token) headers['Authorization'] = `Bearer ${token}`;
        }
      } catch {}
      const res = await fetch('/api/analytics/admin/factory-metrics?limit=300', { headers });
      if (res.status === 401 || res.status === 403) {
        setIsUnauthorized(true);
        setError('Access denied. Administrator privileges required to view AI Factory operational metrics.');
        setIsLoading(false);
        return;
      }
      if (!res.ok) {
        throw new Error(`Failed to load factory metrics: HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data && Array.isArray(data.events)) {
        setEvents(data.events);
      } else {
        setEvents([]);
      }
    } catch (err: any) {
      console.error('[AdminAnalytics] Fetch error:', err);
      setError(err?.message || 'Failed to fetch AI Factory operational metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFactoryMetrics();
  }, []);

  // Derived Factory Metrics using ONLY verified underlying data (0 mock/demo data)
  const metrics = useMemo(
    () => computeFactoryDashboardMetrics(events, selectedModule),
    [events, selectedModule]
  );

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

  if (isUnauthorized) {
    return (
      <div className="w-full max-w-lg mx-auto p-8 my-16 text-center space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-md">
        <div className="w-14 h-14 bg-rose-100 dark:bg-rose-950/60 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Admin Access Restricted</h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          AI Factory Operational Analytics require verified administrator privileges. Your current account does not have authorization to view internal model telemetry.
        </p>
        <button
          onClick={() => onNavigate('home')}
          className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-lg mx-auto p-8 my-16 text-center space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-md">
        <div className="w-14 h-14 bg-amber-100 dark:bg-amber-950/60 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Telemetry Load Error</h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">{error}</p>
        <button
          onClick={fetchFactoryMetrics}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const factoryCards: Array<{ key: 'speaking' | 'writing' | 'reading' | 'listening'; label: string; count: number }> = [
    { key: 'speaking', label: 'Speaking Factory', count: metrics.moduleCounts.speaking },
    { key: 'writing', label: 'Writing Factory', count: metrics.moduleCounts.writing },
    { key: 'reading', label: 'Reading Factory', count: metrics.moduleCounts.reading },
    { key: 'listening', label: 'Listening Factory', count: metrics.moduleCounts.listening }
  ];

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-6 pb-24">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
            <Server className="w-4 h-4 animate-pulse" />
            <span>AI FACTORY ADMIN CONSOLE · {activeSection === 'review' ? 'HUMAN DRAFT REVIEW' : 'OPERATIONAL TELEMETRY'}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Section Switcher */}
            <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                onClick={() => setActiveSection('review')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeSection === 'review'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                AI Draft Review Queue
              </button>
              <button
                onClick={() => setActiveSection('telemetry')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeSection === 'telemetry'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Operational Telemetry
              </button>
            </div>

            {/* Module Selector Filter (Telemetry View) */}
            {activeSection === 'telemetry' && (
              <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700 text-xs">
                {(['All', 'speaking', 'writing', 'reading', 'listening'] as const).map(mod => (
                  <button
                    key={mod}
                    onClick={() => setSelectedModule(mod)}
                    className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer capitalize ${
                      selectedModule === mod ? 'bg-amber-600 text-white shadow-2xs font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {mod}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {activeSection === 'review'
              ? 'AI Draft Review, Validation & Explicit Approval'
              : 'AI Question Factory Quality & Performance'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed mt-1">
            {activeSection === 'review'
              ? 'Inspect generated Reading, Listening, Writing, and Speaking drafts, verify structural validation gates, and explicitly approve or reject drafts for candidate pilot delivery.'
              : 'Real-time generation latency, schema validation repair outcomes, token consumption, and error diagnostics across BandSprint question factories.'}
          </p>
        </div>
      </div>

      {activeSection === 'review' ? (
        <AdminDraftReviewPanel onShowToast={onShowToast} />
      ) : (
        <>
          {/* 2. Top-Level Metric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Generation Events */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-2xs space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Generations</span>
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {metrics.totalRecorded}
              </span>
              <span className="text-[11px] text-slate-400 block truncate">
                {metrics.successCount} passed · {metrics.failureCount} failed
              </span>
            </div>

            {/* Success Rate */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-2xs space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Generation Success Rate</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {metrics.totalRecorded > 0 ? `${Math.round((metrics.successCount / metrics.totalRecorded) * 100)}%` : '—'}
                </span>
                {metrics.totalRecorded > 0 && (
                  <span className="text-xs text-slate-400 font-mono">
                    ({metrics.successCount}/{metrics.totalRecorded})
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 block truncate">
                Valid JSON schema compliance
              </span>
            </div>

            {/* Avg Generation Latency */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-2xs space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Avg Latency</span>
              <span className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">
                {metrics.avgDurationMs !== null ? `${(metrics.avgDurationMs / 1000).toFixed(1)}s` : '—'}
              </span>
              <span className="text-[11px] text-slate-400 block truncate">
                Server-measured API turnaround
              </span>
            </div>

            {/* Provider-Reported Total Tokens */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-2xs space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Provider Total Tokens</span>
              <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
                {metrics.tokenDataAvailable ? metrics.totalTokens.toLocaleString() : '—'}
              </span>
              <span className="text-[11px] text-slate-400 block leading-snug">
                {metrics.tokenDataAvailable ? (
                  <>
                    Prompt: {metrics.promptDataAvailable ? metrics.totalPromptTokens.toLocaleString() : '—'}
                    {' · '}
                    Completion: {metrics.completionDataAvailable ? metrics.totalCompletionTokens.toLocaleString() : '—'}
                    {metrics.thoughtsDataAvailable ? ` · Thoughts: ${metrics.totalThoughtsTokens.toLocaleString()}` : ''}
                  </>
                ) : (
                  'No token usage recorded'
                )}
              </span>
              {metrics.hasUnreportedTokenDelta && (
                <span className="text-[10px] text-slate-400/90 dark:text-slate-500 block leading-tight pt-0.5">
                  Provider total may include unreported token categories not broken out in event metadata.
                </span>
              )}
            </div>
          </div>

          {/* 3. Factory Telemetry Coverage Matrix */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 rounded-3xl shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Factory Instrumentation & Telemetry Coverage
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-400">Hooks vs. Observed Traffic</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {factoryCards.map(card => {
                const coverage = getFactoryCoverageStatus(card.count);
                return (
                  <div
                    key={card.key}
                    className={`p-4 rounded-2xl border space-y-2 ${
                      coverage.hasObservedActivity
                        ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs font-bold uppercase ${
                          coverage.hasObservedActivity
                            ? 'text-emerald-900 dark:text-emerald-300'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {card.label}
                      </span>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        {coverage.instrumentationBadge}
                      </span>
                    </div>
                    <div
                      className={`text-xl font-black ${
                        coverage.hasObservedActivity
                          ? 'text-emerald-950 dark:text-white'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {coverage.observedEventsLabel}
                    </div>
                    <p
                      className={`text-[11px] leading-tight ${
                        coverage.hasObservedActivity
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {coverage.statusDescription}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Generation Quality & Validation Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Validation Outcomes */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">Schema Validation Outcomes</h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  Avg Repairs: {metrics.avgRepairAttempts !== null ? metrics.avgRepairAttempts : '—'}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Initial Pass (0 Repairs)
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {metrics.passedValidationCount} ({metrics.totalRecorded > 0 ? Math.round((metrics.passedValidationCount / metrics.totalRecorded) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${metrics.totalRecorded > 0 ? (metrics.passedValidationCount / metrics.totalRecorded) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Repaired via Prompt Retry
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {metrics.repairedValidationCount} ({metrics.totalRecorded > 0 ? Math.round((metrics.repairedValidationCount / metrics.totalRecorded) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all"
                      style={{ width: `${metrics.totalRecorded > 0 ? (metrics.repairedValidationCount / metrics.totalRecorded) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5" /> Validation Failed
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {metrics.failedValidationCount} ({metrics.totalRecorded > 0 ? Math.round((metrics.failedValidationCount / metrics.totalRecorded) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full transition-all"
                      style={{ width: `${metrics.totalRecorded > 0 ? (metrics.failedValidationCount / metrics.totalRecorded) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sanitized Error Categories */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">Sanitized Failure Categories</h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  Total Failures: {metrics.failureCount}
                </span>
              </div>

              {metrics.errorCategories.length > 0 ? (
                <div className="space-y-2">
                  {metrics.errorCategories.map(err => (
                    <div key={err.category} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-700 dark:text-slate-300 font-medium truncate max-w-xs">{err.category}</span>
                      <span className="px-2 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-bold">
                        {err.count} incident{err.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-2xl">
                  0 failure incidents recorded in current telemetry. All active generation runs completed cleanly.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
