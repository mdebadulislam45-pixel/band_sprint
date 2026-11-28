import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  FileText,
  Headphones,
  PenTool,
  Mic,
  ShieldCheck,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Eye,
  Clock,
  Check,
  Ban,
  Info,
  Play,
  BarChart3,
  Sparkles,
  Flag,
  Database,
  Layers,
  HelpCircle,
  CheckCheck,
  AlertCircle
} from 'lucide-react';
import { sanitizeSvgMarkup } from '../../utils/sanitizeSvg';

export interface AdminDraftSummaryItem {
  id: string;
  safeId: string;
  examType: 'academic_reading' | 'listening' | 'writing' | 'speaking';
  module: 'reading' | 'listening' | 'writing' | 'speaking';
  format: 'Academic' | 'General Training';
  title: string;
  difficulty: string;
  targetBand: number;
  createdAt: number;
  updatedAt: number;
  model?: string;
  status: 'GENERATING' | 'PENDING_REVIEW' | 'VALIDATION_FAILED' | 'APPROVED' | 'REJECTED' | 'FAILED';
  pipelineStatus?: 'draft' | 'checked' | 'reviewed' | 'published';
  origin?: {
    model: string;
    date: string;
    promptVersion: string;
    topicId?: string;
    topicTitle?: string;
  };
  validationStatus?: 'PASSED' | 'FAILED' | 'REPAIRED';
  repairAttempts: number;
  errorCount: number;
  warningCount: number;
  isReviewed: boolean;
  reviewer?: string | null;
  reviewedAt: number | null;
  rejectionReason: string | null;
  isBeta?: boolean;
  solverResult?: {
    solverModel: string;
    testedAt: number;
    passed: boolean;
    matchCount: number;
    mismatchCount: number;
    needsReview: boolean;
    summary: string;
    details: any[];
  } | null;
}

export interface AdminDraftDetailItem extends AdminDraftSummaryItem {
  validationReport: {
    isValid: boolean;
    structuralOk: boolean;
    answersOk: boolean;
    evidenceOk: boolean;
    qualityOk: boolean;
    errors: string[];
    warnings: string[];
  } | null;
  content: any;
  canApprove: boolean;
  approvalBlockedReason: string | null;
}

export interface BankTargetMetric {
  target: number;
  unit?: string;
  label?: string;
  current: number;
  published: number;
  reviewed: number;
  checked: number;
  draft: number;
  needsReview: number;
}

export interface BankSizeDashboardData {
  targets: {
    academic_reading: BankTargetMetric;
    listening: BankTargetMetric;
    writing_task2: BankTargetMetric;
    writing_task1: BankTargetMetric;
    speaking_part1: BankTargetMetric;
    speaking_cue_cards?: BankTargetMetric;
    speaking_part3_sets?: BankTargetMetric;
    speaking_part2_3?: BankTargetMetric;
  };
  totalItems: number;
  publishedTotal: number;
  pendingReviewTotal: number;
  reportedProblemsCount: number;
}

export interface QuestionProblemReport {
  id: string;
  questionId: string | number;
  moduleId: 'reading' | 'listening' | 'writing' | 'speaking';
  examId?: string;
  examTitle?: string;
  issueType: string;
  comment?: string;
  studentUserId?: string;
  studentEmail?: string;
  reportedAt: number;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
}

interface AdminDraftReviewPanelProps {
  onShowToast?: (msg: string) => void;
}

function getAdminAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  try {
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('ielts_session_token_v2');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch {}
  return headers;
}

function formatModuleBadge(examType: string): { label: string; colorClass: string } {
  switch (examType) {
    case 'academic_reading':
      return {
        label: 'Reading',
        colorClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border-sky-200 dark:border-sky-800'
      };
    case 'listening':
      return {
        label: 'Listening',
        colorClass: 'bg-violet-100 text-violet-800 dark:bg-violet-950/70 dark:text-violet-300 border-violet-200 dark:border-violet-800'
      };
    case 'writing':
      return {
        label: 'Writing',
        colorClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800'
      };
    case 'speaking':
      return {
        label: 'Speaking',
        colorClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
      };
    default:
      return {
        label: examType,
        colorClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
      };
  }
}

export const AdminDraftReviewPanel: React.FC<AdminDraftReviewPanelProps> = ({ onShowToast }) => {
  // Tabs: 'review_queue' | 'bank_dashboard' | 'reported_issues'
  const [activeTab, setActiveTab] = useState<'review_queue' | 'bank_dashboard' | 'reported_issues'>('review_queue');

  // Review Queue state
  const [drafts, setDrafts] = useState<AdminDraftSummaryItem[]>([]);
  const [moduleFilter, setModuleFilter] = useState<'ALL' | 'academic_reading' | 'listening' | 'writing' | 'speaking'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'VALIDATION_FAILED' | 'FAILED' | 'ALL'>('PENDING_REVIEW');
  const [offset, setOffset] = useState<number>(0);
  const limit = 20;
  const [isLoadingQueue, setIsLoadingQueue] = useState<boolean>(true);
  const [queueError, setQueueError] = useState<string | null>(null);

  // Selected Detail state
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<AdminDraftDetailItem | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [showSolverDetails, setShowSolverDetails] = useState<boolean>(true);

  // Review action confirmation state
  const [confirmMode, setConfirmMode] = useState<'NONE' | 'APPROVE' | 'REJECT'>('NONE');
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [reviewFeedback, setReviewFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Bank stats and Daily Quota state
  const [bankStats, setBankStats] = useState<BankSizeDashboardData | null>(null);
  const [dailyQuota, setDailyQuota] = useState<{ used: number; cap: number; remaining: number } | null>(null);
  const [isGeneratingPilot, setIsGeneratingPilot] = useState<boolean>(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState<boolean>(false);
  const [selectedBatchModule, setSelectedBatchModule] = useState<string>('academic_reading');

  // Reported Problems state
  const [reportedIssues, setReportedIssues] = useState<QuestionProblemReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState<boolean>(false);

  // Load Bank Stats and Quota
  const fetchDashboardStats = useCallback(async () => {
    try {
      const [statsRes, quotaRes] = await Promise.all([
        fetch('/api/admin/pipeline/bank-stats', { headers: getAdminAuthHeaders() }),
        fetch('/api/admin/pipeline/quota', { headers: getAdminAuthHeaders() })
      ]);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setBankStats(statsData.stats || null);
      }
      if (quotaRes.ok) {
        const quotaData = await quotaRes.json();
        setDailyQuota(quotaData.quota || null);
      }
    } catch (err) {
      console.warn('[AdminReview] Error loading dashboard stats:', err);
    }
  }, []);

  // Load Review Queue
  const fetchQueue = useCallback(async () => {
    setIsLoadingQueue(true);
    setQueueError(null);
    try {
      const params = new URLSearchParams({
        module: moduleFilter,
        status: statusFilter,
        limit: String(limit),
        offset: String(offset)
      });
      const res = await fetch(`/api/admin/ai-drafts?${params.toString()}`, {
        method: 'GET',
        headers: getAdminAuthHeaders()
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Failed to load AI draft queue (HTTP ${res.status})`);
      }
      setDrafts(Array.isArray(data.drafts) ? data.drafts : []);
    } catch (err: any) {
      setQueueError(err?.message || 'Unable to load AI draft review queue.');
    } finally {
      setIsLoadingQueue(false);
    }
  }, [moduleFilter, statusFilter, offset]);

  // Load Reported Problems
  const fetchReportedIssues = useCallback(async () => {
    setIsLoadingReports(true);
    try {
      const res = await fetch('/api/admin/pipeline/reported-questions', {
        headers: getAdminAuthHeaders()
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.reports)) {
        setReportedIssues(data.reports);
      }
    } catch (err) {
      console.warn('[AdminReview] Error loading reported issues:', err);
    } finally {
      setIsLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
    fetchQueue();
    fetchReportedIssues();
  }, [fetchDashboardStats, fetchQueue, fetchReportedIssues]);

  // Load Draft Detail
  const fetchDraftDetail = useCallback(async (draftId: string) => {
    setSelectedDraftId(draftId);
    setIsLoadingDetail(true);
    setDetailError(null);
    setConfirmMode('NONE');
    setRejectionReasonInput('');
    setReviewFeedback(null);
    try {
      const res = await fetch(`/api/admin/ai-drafts/${encodeURIComponent(draftId)}`, {
        method: 'GET',
        headers: getAdminAuthHeaders()
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.draft) {
        throw new Error(data.error || `Failed to load draft details (HTTP ${res.status})`);
      }
      setSelectedDetail(data.draft);
    } catch (err: any) {
      setDetailError(err?.message || 'Unable to load draft detail.');
      setSelectedDetail(null);
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  // Run Phase A Pilot
  const handleRunPilot = async () => {
    if (isGeneratingPilot) return;
    setIsGeneratingPilot(true);
    if (onShowToast) onShowToast('Initiating Phase A Pilot generation (Reading 40Q, 5 Task 1, 5 Task 2, 10 Speaking P1)...');

    try {
      const res = await fetch('/api/admin/pipeline/run-pilot', {
        method: 'POST',
        headers: getAdminAuthHeaders()
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Pilot generation failed.');
      }
      if (onShowToast) {
        onShowToast('Phase A Pilot generation completed! Items loaded into review queue.');
      }
      await Promise.all([fetchQueue(), fetchDashboardStats()]);
      if (data.pilot?.reading?.draft?.id) {
        fetchDraftDetail(data.pilot.reading.draft.id);
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to run pilot.';
      if (onShowToast) onShowToast(msg);
    } finally {
      setIsGeneratingPilot(false);
    }
  };

  // Run Batch Generation
  const handleBatchGenerate = async () => {
    if (isBatchGenerating) return;
    setIsBatchGenerating(true);
    if (onShowToast) onShowToast(`Generating ${selectedBatchModule} item with second-pass solver verification...`);

    try {
      const res = await fetch('/api/admin/pipeline/generate', {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        body: JSON.stringify({ module: selectedBatchModule })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Generation failed.');
      }
      if (onShowToast) onShowToast(data.message || 'Item generated successfully.');
      await Promise.all([fetchQueue(), fetchDashboardStats()]);
      if (data.draft?.id) {
        fetchDraftDetail(data.draft.id);
      }
    } catch (err: any) {
      const msg = err?.message || 'Generation failed.';
      if (onShowToast) onShowToast(msg);
    } finally {
      setIsBatchGenerating(false);
    }
  };

  // Approve Draft
  const handleApproveDraft = async () => {
    if (!selectedDetail || isSubmittingReview) return;
    setIsSubmittingReview(true);
    setReviewFeedback(null);
    try {
      const res = await fetch(`/api/admin/ai-drafts/${encodeURIComponent(selectedDetail.id)}/approve`, {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        body: JSON.stringify({ module: selectedDetail.examType })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Approval failed (HTTP ${res.status})`);
      }
      setSelectedDetail(data.draft);
      setConfirmMode('NONE');
      const msg = `Draft approved and published for candidate practice.`;
      setReviewFeedback({ type: 'success', message: msg });
      if (onShowToast) onShowToast(msg);
      await Promise.all([fetchQueue(), fetchDashboardStats()]);
    } catch (err: any) {
      const errMsg = err?.message || 'Approval request failed.';
      setReviewFeedback({ type: 'error', message: errMsg });
      if (onShowToast) onShowToast(errMsg);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Reject Draft
  const handleRejectDraft = async () => {
    if (!selectedDetail || isSubmittingReview) return;
    setIsSubmittingReview(true);
    setReviewFeedback(null);
    try {
      const res = await fetch(`/api/admin/ai-drafts/${encodeURIComponent(selectedDetail.id)}/reject`, {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        body: JSON.stringify({
          module: selectedDetail.examType,
          reason: rejectionReasonInput.trim() || undefined
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Rejection failed (HTTP ${res.status})`);
      }
      setSelectedDetail(data.draft);
      setConfirmMode('NONE');
      setRejectionReasonInput('');
      const msg = `Draft rejected and excluded from candidate bank.`;
      setReviewFeedback({ type: 'success', message: msg });
      if (onShowToast) onShowToast(msg);
      await Promise.all([fetchQueue(), fetchDashboardStats()]);
    } catch (err: any) {
      const errMsg = err?.message || 'Rejection request failed.';
      setReviewFeedback({ type: 'error', message: errMsg });
      if (onShowToast) onShowToast(errMsg);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Resolve Reported Problem
  const handleResolveReport = async (reportId: string, status: 'resolved' | 'dismissed') => {
    try {
      const res = await fetch(`/api/admin/pipeline/reported-questions/${encodeURIComponent(reportId)}/resolve`, {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        if (onShowToast) onShowToast(`Report marked ${status}.`);
        fetchReportedIssues();
      }
    } catch (err) {
      console.warn('Failed to resolve report:', err);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Top Header & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Phase A Pipeline
            </span>
            <span className="text-xs text-slate-500 font-medium">Independent Solver & Quality Assurance</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            Exam Content Pipeline & Quality Audit
          </h2>
        </div>

        {/* Action Controls & Daily Quota Pill */}
        <div className="flex flex-wrap items-center gap-2.5">
          {dailyQuota && (
            <div className="px-3.5 py-1.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs flex items-center gap-2">
              <span className="text-slate-500">Daily Cap:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {dailyQuota.used} / {dailyQuota.cap}
              </span>
              <span className={`w-2 h-2 rounded-full ${dailyQuota.remaining > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            </div>
          )}

          <button
            onClick={handleRunPilot}
            disabled={isGeneratingPilot}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-60"
          >
            {isGeneratingPilot ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>Run Phase A Pilot</span>
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('review_queue')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'review_queue'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Review Queue</span>
          {drafts.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white">
              {drafts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('bank_dashboard')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'bank_dashboard'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Bank-Size Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('reported_issues')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'reported_issues'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Flag className="w-4 h-4" />
          <span>Reported Student Issues</span>
          {reportedIssues.filter((r) => r.status === 'open').length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-bold">
              {reportedIssues.filter((r) => r.status === 'open').length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: BANK SIZE DASHBOARD AGAINST TARGETS */}
      {activeTab === 'bank_dashboard' && bankStats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[
              { id: 'academic_reading', title: 'Academic Reading', unit: 'tests', metric: bankStats.targets.academic_reading },
              { id: 'listening', title: 'Listening', unit: 'tests', metric: bankStats.targets.listening },
              { id: 'writing_task2', title: 'Writing Task 2', unit: 'items', metric: bankStats.targets.writing_task2 },
              { id: 'writing_task1', title: 'Writing Task 1', unit: 'items', metric: bankStats.targets.writing_task1 },
              { id: 'speaking_part1', title: 'Speaking Part 1', unit: 'items', metric: bankStats.targets.speaking_part1 },
              { id: 'speaking_cue_cards', title: 'Speaking Cue Cards', unit: 'items', metric: bankStats.targets.speaking_cue_cards || bankStats.targets.speaking_part2_3 || { target: 40, current: 0, published: 0, reviewed: 0, checked: 0, draft: 0, needsReview: 0 } },
              { id: 'speaking_part3_sets', title: 'Speaking Part 3 Sets', unit: 'items', metric: bankStats.targets.speaking_part3_sets || { target: 40, current: 0, published: 0, reviewed: 0, checked: 0, draft: 0, needsReview: 0 } }
            ].map((item) => {
              const target = item.metric.target;
              const progressPct = Math.min(100, Math.round((item.metric.published / target) * 100));
              const checkedPct = Math.min(100, Math.round((item.metric.current / target) * 100));
              return (
                <div key={item.id} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{item.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 capitalize">Unit: {item.unit}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      Target: {item.metric.target} {item.unit}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Progress to Target:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {item.metric.current} / {item.metric.target} {item.unit} ({checkedPct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                      <div className="bg-emerald-500 h-full transition-all" style={{ width: `${progressPct}%` }} title="Published" />
                      <div className="bg-blue-400 h-full transition-all" style={{ width: `${checkedPct - progressPct}%` }} title="In Review" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Published</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{item.metric.published}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">In Review</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{item.metric.checked}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Draft / Flagged</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">{item.metric.draft + item.metric.needsReview}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: REPORTED STUDENT PROBLEMS QUEUE */}
      {activeTab === 'reported_issues' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Flag className="w-5 h-5 text-rose-500" />
              <span>Student-Reported Question Defect Log</span>
            </h3>
            <button
              onClick={fetchReportedIssues}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingReports ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {reportedIssues.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500/80 mx-auto" />
              <p className="font-semibold">No unresolved question issues reported.</p>
              <p className="text-[11px] text-slate-500">When candidates click &ldquo;Report a problem&rdquo; during exams, tickets will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {reportedIssues.map((rep) => (
                <div key={rep.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {rep.moduleId} · Q{rep.questionId}
                      </span>
                      <span className="font-semibold text-rose-600 dark:text-rose-400">
                        {rep.issueType.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${rep.status === 'open' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {rep.status}
                      </span>
                    </div>
                    {rep.comment && (
                      <p className="text-slate-700 dark:text-slate-300 font-medium pl-1">
                        &ldquo;{rep.comment}&rdquo;
                      </p>
                    )}
                    <span className="text-[10px] text-slate-400 block">
                      Reported {new Date(rep.reportedAt).toLocaleDateString()} {rep.studentEmail ? `by ${rep.studentEmail}` : ''}
                    </span>
                  </div>

                  {rep.status === 'open' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleResolveReport(rep.id, 'resolved')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition cursor-pointer"
                      >
                        Mark Resolved
                      </button>
                      <button
                        onClick={() => handleResolveReport(rep.id, 'dismissed')}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 text-[11px] font-medium transition cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REVIEW QUEUE & DETAIL INSPECTOR */}
      {activeTab === 'review_queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Draft Queue List */}
          <div className="lg:col-span-5 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            {/* Filter controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Module:</span>
                <select
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value as any)}
                  className="px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-white"
                >
                  <option value="ALL">All Modules</option>
                  <option value="academic_reading">Reading</option>
                  <option value="writing">Writing</option>
                  <option value="speaking">Speaking</option>
                  <option value="listening">Listening</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-white"
                >
                  <option value="PENDING_REVIEW">Pending Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="ALL">All Statuses</option>
                </select>
              </div>
            </div>

            {/* Batch generation bar */}
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
              <select
                value={selectedBatchModule}
                onChange={(e) => setSelectedBatchModule(e.target.value)}
                className="px-2 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-white"
              >
                <option value="academic_reading">Reading Test (40Q)</option>
                <option value="writing_task1">Writing Task 1 (with Chart)</option>
                <option value="writing_task2">Writing Task 2 (Essay)</option>
                <option value="speaking_part1">Speaking Part 1 (10Q)</option>
              </select>
              <button
                onClick={handleBatchGenerate}
                disabled={isBatchGenerating}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isBatchGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span>Generate</span>
              </button>
            </div>

            {/* List */}
            {isLoadingQueue ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                <span>Loading draft queue...</span>
              </div>
            ) : drafts.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                <p>No drafts match the selected filter.</p>
                <p className="text-[11px] text-slate-500">Click &ldquo;Run Phase A Pilot&rdquo; above to generate test material.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {drafts.map((d) => {
                  const isSelected = selectedDraftId === d.id;
                  const modBadge = formatModuleBadge(d.examType);
                  const hasSolverDiscrepancy = d.solverResult && !d.solverResult.passed;
                  return (
                    <div
                      key={d.id}
                      onClick={() => fetchDraftDetail(d.id)}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer text-left space-y-2 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 shadow-xs ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${modBadge.colorClass}`}>
                            {modBadge.label}
                          </span>
                          {d.status === 'APPROVED' ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Published
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Beta Practice Material
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                        {d.title}
                      </h4>

                      {/* Solver badge & Origin info */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                        <span className="font-mono">{d.origin?.model || d.model}</span>
                        {d.solverResult ? (
                          hasSolverDiscrepancy ? (
                            <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>{d.solverResult.mismatchCount} Discrepancies</span>
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCheck className="w-3 h-3" />
                              <span>100% Solver Match</span>
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400">Pending solver</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Detailed Draft Review & Solver Diff Inspector */}
          <div className="lg:col-span-7 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            {!selectedDetail ? (
              <div className="py-24 text-center text-slate-400 space-y-2">
                <Eye className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="font-bold text-sm text-slate-600 dark:text-slate-300">Select an item from the queue</h4>
                <p className="text-xs text-slate-500">
                  Inspect the independent solver audit, code-drawn charts, question keys, and click approve to publish.
                </p>
              </div>
            ) : (
              <>
                {/* Item Header & Governance Metadata */}
                <div className="space-y-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300">
                        {selectedDetail.safeId}
                      </span>
                      {selectedDetail.status === 'APPROVED' ? (
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Published
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          Beta practice material
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-slate-500 font-mono">
                      Target Band {selectedDetail.targetBand} · {selectedDetail.difficulty}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    {selectedDetail.title}
                  </h3>

                  {/* Origin Metadata Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Generator Model</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {selectedDetail.origin?.model || selectedDetail.model}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Prompt Version</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {selectedDetail.origin?.promptVersion || 'v1.0-phaseA'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Generated At</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {new Date(selectedDetail.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Reviewer</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {selectedDetail.reviewer || 'Unapproved'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Independent Second-Pass Solver Section */}
                <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-indigo-600" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          Independent Second-Pass Solver Audit
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Solved blindly from passage text alone without answer key (Model: {selectedDetail.solverResult?.solverModel || 'gemini-3.1-flash-lite'})
                        </p>
                      </div>
                    </div>

                    {selectedDetail.solverResult && (
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${selectedDetail.solverResult.passed ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'}`}>
                        {selectedDetail.solverResult.passed ? '100% Agreement' : `${selectedDetail.solverResult.mismatchCount} Discrepancies`}
                      </span>
                    )}
                  </div>

                  {selectedDetail.solverResult && selectedDetail.solverResult.details && (
                    <div className="space-y-2">
                      <button
                        onClick={() => setShowSolverDetails(!showSolverDetails)}
                        className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span>{showSolverDetails ? 'Hide' : 'View'} Question-by-Question Solver Comparison ({selectedDetail.solverResult.details.length} Qs)</span>
                      </button>

                      {showSolverDetails && (
                        <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                          {selectedDetail.solverResult.details.map((q: any, idx: number) => (
                            <div
                              key={idx}
                              className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                                q.isMatch
                                  ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                                  : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  Q{q.qNum}: {q.prompt?.slice(0, 80)}...
                                </span>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${q.isMatch ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-600 text-white'}`}>
                                  {q.isMatch ? 'Match' : 'Mismatch'}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                                <div>
                                  <span className="text-slate-400 block font-sans">Generator Key:</span>
                                  <span className="text-blue-600 dark:text-blue-400 font-bold">{q.generatorAnswer}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block font-sans">Solver Output:</span>
                                  <span className={q.isMatch ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>{q.solverAnswer}</span>
                                </div>
                              </div>
                              {q.solverEvidenceQuote && (
                                <p className="text-[10px] text-slate-500 italic">
                                  Quote: &ldquo;{q.solverEvidenceQuote}&rdquo;
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Writing Task 1 Code-Drawn Vector Chart Preview */}
                {selectedDetail.content?.task1 && (
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                      <span>Code-Drawn Vector Chart (Never AI Images)</span>
                    </h4>

                    {selectedDetail.content.task1.chartSvg && (
                      <div
                        className="p-3 bg-white rounded-xl shadow-xs border border-slate-200 overflow-x-auto flex justify-center"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeSvgMarkup(selectedDetail.content.task1.chartSvg)
                        }}
                      />
                    )}

                    {selectedDetail.content.task1.chartData && (
                      <div className="overflow-x-auto text-xs">
                        <table className="w-full border-collapse bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                          <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800">
                              {selectedDetail.content.task1.chartData.headers?.map((h: string, idx: number) => (
                                <th key={idx} className="p-2 border border-slate-200 dark:border-slate-800 text-left font-bold text-slate-700 dark:text-slate-300">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {selectedDetail.content.task1.chartData.rows?.map((row: any, rIdx: number) => (
                              <tr key={rIdx}>
                                <td className="p-2 border border-slate-200 dark:border-slate-800 font-medium text-slate-800 dark:text-slate-200">
                                  {row.label}
                                </td>
                                {row.values?.map((val: number, vIdx: number) => (
                                  <td key={vIdx} className="p-2 border border-slate-200 dark:border-slate-800 font-mono text-slate-600 dark:text-slate-300">
                                    {val}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Explicit Human Approval Controls */}
                <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-blue-600" />
                      <span>Explicit Human Decision Gate (Nothing published without human click)</span>
                    </span>
                  </div>

                  {confirmMode === 'NONE' && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setConfirmMode('APPROVE')}
                        disabled={selectedDetail.status === 'APPROVED' || isSubmittingReview}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>{selectedDetail.status === 'APPROVED' ? 'Already Approved' : 'Approve & Publish to Student Bank'}</span>
                      </button>

                      <button
                        onClick={() => setConfirmMode('REJECT')}
                        disabled={isSubmittingReview}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Ban className="w-4 h-4" />
                        <span>Reject Draft</span>
                      </button>
                    </div>
                  )}

                  {confirmMode === 'APPROVE' && (
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 space-y-2">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Confirm human approval of {selectedDetail.safeId}? This will remove the &ldquo;Beta practice material&rdquo; label and publish this item to student mock exams.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleApproveDraft}
                          disabled={isSubmittingReview}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs cursor-pointer"
                        >
                          Confirm & Publish
                        </button>
                        <button
                          onClick={() => setConfirmMode('NONE')}
                          className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {confirmMode === 'REJECT' && (
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 space-y-2">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Reason for rejecting {selectedDetail.safeId}:
                      </p>
                      <input
                        type="text"
                        value={rejectionReasonInput}
                        onChange={(e) => setRejectionReasonInput(e.target.value)}
                        placeholder="e.g. Question 14 is ambiguous..."
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleRejectDraft}
                          disabled={isSubmittingReview}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs cursor-pointer"
                        >
                          Confirm Rejection
                        </button>
                        <button
                          onClick={() => setConfirmMode('NONE')}
                          className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
