import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Play,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import {
  type CandidatePilotModule,
  type CandidateDraftSummaryItem,
  generateCandidatePilotDraft,
  fetchCandidateModuleDrafts,
  fetchCandidateDraftStatusById,
  fetchApprovedCandidatePilotExamSet,
  getCandidateDraftStatusDescriptor,
  getActiveCandidateDraftId,
  setActiveCandidateDraftId,
  isTerminalCandidateDraftStatus,
  createBoundedDraftPoller,
  shouldApplyCandidateDraftUpdate,
} from '../../services/candidateAiPilotService';
import { getStoredSessionToken } from '../../services/authService';

export interface CandidateAiPilotPanelProps {
  module: CandidatePilotModule;
  moduleTitle: string;
  defaultFormat?: 'Academic' | 'General Training';
  onLaunchApprovedPilot: (examSet: any, draft: CandidateDraftSummaryItem) => void;
  compact?: boolean;
}

export const CandidateAiPilotPanel: React.FC<CandidateAiPilotPanelProps> = ({
  module,
  moduleTitle,
  defaultFormat = 'Academic',
  onLaunchApprovedPilot,
  compact = false,
}) => {
  const [drafts, setDrafts] = useState<CandidateDraftSummaryItem[]>([]);
  const [activeDraftId, setActiveDraftIdState] = useState<string | null>(() =>
    getActiveCandidateDraftId(module)
  );
  const [format, setFormat] = useState<'Academic' | 'General Training'>(defaultFormat);
  const [difficulty, setDifficulty] = useState<'Standard' | 'Challenging'>('Standard');
  const [topicSeed, setTopicSeed] = useState('');

  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [launchingDraftId, setLaunchingDraftId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [isPollingActive, setIsPollingActive] = useState(false);

  const latestSeqRef = useRef(0);
  const hasSessionToken = Boolean(getStoredSessionToken());

  const loadDrafts = useCallback(
    async (silent = false) => {
      if (!getStoredSessionToken()) {
        setDrafts([]);
        return;
      }
      if (!silent) {
        setIsLoadingList(true);
      }
      const mySeq = ++latestSeqRef.current;
      try {
        const list = await fetchCandidateModuleDrafts(module);
        if (mySeq < latestSeqRef.current) return;
        setDrafts(list);
        setActiveDraftIdState((prevId) => {
          if (prevId && list.some((d) => d.id === prevId)) {
            return prevId;
          }
          const firstId = list[0]?.id || null;
          if (firstId) {
            setActiveCandidateDraftId(module, firstId);
          }
          return firstId;
        });
      } catch (err: any) {
        if (!silent) {
          setErrorMessage(err?.message || 'Unable to load AI Pilot draft status.');
        }
      } finally {
        if (!silent) {
          setIsLoadingList(false);
        }
      }
    },
    [module]
  );

  useEffect(() => {
    void loadDrafts(false);
  }, [loadDrafts]);

  const activeDraft =
    drafts.find((d) => d.id === activeDraftId) || (drafts.length > 0 ? drafts[0] : null);

  // Bounded polling only while activeDraft (or any recent draft) is in GENERATING or PENDING_REVIEW
  useEffect(() => {
    const targetDraft =
      activeDraft && !isTerminalCandidateDraftStatus(activeDraft.status)
        ? activeDraft
        : drafts.find((d) => !isTerminalCandidateDraftStatus(d.status)) || null;

    if (!targetDraft || !getStoredSessionToken()) {
      setIsPollingActive(false);
      return;
    }

    const poller = createBoundedDraftPoller({
      intervalMs: 8000,
      maxAttempts: 30,
      pollFn: async () => {
        return fetchCandidateDraftStatusById(module, targetDraft.id);
      },
      onUpdate: (updatedDraft, seq) => {
        setDrafts((prev) =>
          prev.map((item) => {
            if (item.id !== updatedDraft.id) return item;
            return shouldApplyCandidateDraftUpdate(item, updatedDraft, seq, 1)
              ? updatedDraft
              : item;
          })
        );
        if (updatedDraft.status === 'APPROVED') {
          setStatusNotice(
            'Your AI Pilot draft has been approved by an administrator and is ready to launch.'
          );
        }
      },
      onStop: () => {
        setIsPollingActive(false);
      },
    });

    poller.start();
    setIsPollingActive(true);

    return () => {
      poller.stop();
      setIsPollingActive(false);
    };
  }, [module, activeDraft?.id, activeDraft?.status, drafts]);

  const handleManualRefresh = async () => {
    if (isRefreshing || isGenerating) return;
    setErrorMessage(null);
    setIsRefreshing(true);
    try {
      await loadDrafts(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not refresh draft status.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleGenerateDraft = async () => {
    if (isGenerating || launchingDraftId) return;
    setErrorMessage(null);
    setStatusNotice(null);
    setIsGenerating(true);

    try {
      const result = await generateCandidatePilotDraft({
        module,
        format: module === 'writing' || module === 'speaking' ? format : 'Academic',
        difficulty: module === 'speaking' ? difficulty : undefined,
        topicSeed: topicSeed.trim() || undefined,
      });

      setActiveDraftIdState(result.draftId);
      setTopicSeed('');

      if (result.status === 'PENDING_REVIEW') {
        setStatusNotice(
          'Draft generated and validated. It is now awaiting administrator review before candidate practice access.'
        );
      } else if (result.status === 'VALIDATION_FAILED') {
        setStatusNotice(
          'The generated draft did not pass automated quality checks and cannot be launched.'
        );
      }

      await loadDrafts(true);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Generation could not be completed. Please check your session or quota.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLaunchApprovedDraft = async (draft: CandidateDraftSummaryItem) => {
    if (launchingDraftId || isGenerating) return;
    const descriptor = getCandidateDraftStatusDescriptor(draft);
    if (!descriptor.canLaunch || draft.status !== 'APPROVED') {
      setErrorMessage(
        'Only drafts that have been explicitly approved by an administrator can be launched.'
      );
      return;
    }

    setErrorMessage(null);
    setLaunchingDraftId(draft.id);
    try {
      const examSet = await fetchApprovedCandidatePilotExamSet(module, draft.id);
      setActiveCandidateDraftId(module, draft.id);
      setActiveDraftIdState(draft.id);
      onLaunchApprovedPilot(examSet, draft);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Unable to launch AI Pilot exam. Please refresh status and try again.'
      );
    } finally {
      setLaunchingDraftId(null);
    }
  };

  const renderStatusIcon = (status: CandidateDraftSummaryItem['status']) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'PENDING_REVIEW':
        return <Clock className="w-4 h-4 text-amber-600 shrink-0" />;
      case 'GENERATING':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />;
      case 'REJECTED':
      case 'VALIDATION_FAILED':
        return <XCircle className="w-4 h-4 text-rose-600 shrink-0" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-600 shrink-0" />;
    }
  };

  const getToneBorderClass = (tone: string) => {
    switch (tone) {
      case 'emerald':
        return 'border-emerald-300 bg-emerald-50/70';
      case 'amber':
        return 'border-amber-300 bg-amber-50/70';
      case 'blue':
        return 'border-blue-300 bg-blue-50/70';
      case 'rose':
        return 'border-rose-300 bg-rose-50/70';
      default:
        return 'border-slate-300 bg-slate-50';
    }
  };

  return (
    <section
      aria-label={`${moduleTitle} AI Pilot Practice`}
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${
        compact ? 'p-4' : 'p-6'
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-700">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Controlled AI Question Factory Pilot</span>
            <span aria-hidden="true">·</span>
            <span>Admin-Reviewed Lifecycle</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            {moduleTitle} — AI Pilot Practice
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            AI-generated exams undergo automated rubric validation followed by explicit administrator
            review before candidate launch.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing || isLoadingList || !hasSessionToken}
            className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-50"
            title="Refresh draft review status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Status'}</span>
          </button>
        </div>
      </div>

      {!hasSessionToken && (
        <div className="mt-4 p-4 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-sm">
          Please sign in with your candidate account to request or launch AI Pilot practice sets.
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mt-4 p-3.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-900 text-sm flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
        </div>
      )}

      {statusNotice && (
        <div
          role="status"
          className="mt-4 p-3.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-950 text-sm flex items-start gap-2.5"
        >
          <ShieldCheck className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
          <div className="flex-1">{statusNotice}</div>
        </div>
      )}

      {/* Candidate Onboarding & Guidance Card */}
      <div className="mt-4 p-3.5 rounded-lg border border-slate-200 bg-slate-50/80 text-xs text-slate-700">
        <div className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>How AI Pilot Practice Works:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-white p-2 rounded border border-slate-200">
            <span className="font-bold text-indigo-700">1. Request Draft:</span> Enter optional topic and generate a synthetic practice test.
          </div>
          <div className="bg-white p-2 rounded border border-slate-200">
            <span className="font-bold text-amber-700">2. Admin Review:</span> Automated rubric validation runs, followed by explicit admin review.
          </div>
          <div className="bg-white p-2 rounded border border-slate-200">
            <span className="font-bold text-emerald-700">3. Launch Pilot:</span> Once approved, click "Start Approved AI Pilot" to begin.
          </div>
          <div className="bg-white p-2 rounded border border-slate-200">
            <span className="font-bold text-slate-700">4. Review Results:</span> Complete the session and review detailed band-score diagnostics.
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Request New Draft */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/70 p-4">
          <div className="space-y-3.5">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Request New {moduleTitle} Draft</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                New drafts are saved in <span className="font-semibold">Awaiting Administrator Review</span>{' '}
                status after passing automated validation.
              </p>
            </div>

            {(module === 'writing' || module === 'speaking') && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  IELTS Module Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Academic', 'General Training'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setFormat(fmt)}
                      disabled={isGenerating}
                      className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                        format === fmt
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {module === 'speaking' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Complexity Tier
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Standard', 'Challenging'] as const).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setDifficulty(diff)}
                      disabled={isGenerating}
                      className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                        difficulty === diff
                          ? 'bg-indigo-700 text-white border-indigo-700'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {diff === 'Standard' ? 'Standard (Band 6.5–7.0)' : 'Challenging (Band 7.5–8.5)'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor={`pilot-topic-${module}`}
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Topic Focus (Optional)
              </label>
              <input
                id={`pilot-topic-${module}`}
                type="text"
                value={topicSeed}
                onChange={(e) => setTopicSeed(e.target.value)}
                disabled={isGenerating || !hasSessionToken}
                maxLength={100}
                placeholder="e.g., Urban Architecture, Renewable Energy, Linguistics"
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleGenerateDraft}
              disabled={isGenerating || !hasSessionToken}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating & Validating Draft...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Request AI Pilot Draft</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right column: Active Draft Lifecycle Status & Saved Drafts */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Your {moduleTitle} Drafts ({drafts.length})
            </h3>
            {isPollingActive && (
              <span className="text-xs font-medium text-amber-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Auto-checking review status</span>
              </span>
            )}
          </div>

          {isLoadingList ? (
            <div className="p-8 rounded-lg border border-slate-200 bg-slate-50 text-center text-sm text-slate-600 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span>Loading your AI Pilot drafts...</span>
            </div>
          ) : drafts.length === 0 ? (
            <div className="p-8 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 text-center">
              <p className="text-sm font-semibold text-slate-800">
                No {moduleTitle} AI Pilot drafts yet
              </p>
              <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                Request a draft on the left. Once generated and approved by an administrator, you can
                launch it directly into the exam room.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {drafts.map((draft) => {
                const descriptor = getCandidateDraftStatusDescriptor(draft);
                const isSelected = activeDraft?.id === draft.id;
                const isLaunchingThis = launchingDraftId === draft.id;

                return (
                  <div
                    key={draft.id}
                    onClick={() => {
                      setActiveDraftIdState(draft.id);
                      setActiveCandidateDraftId(module, draft.id);
                    }}
                    className={`rounded-lg border p-4 transition-all ${getToneBorderClass(
                      descriptor.tone
                    )} ${isSelected ? 'ring-2 ring-indigo-600/30' : ''}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {renderStatusIcon(draft.status)}
                          <span className="text-xs font-bold uppercase tracking-wide text-slate-900">
                            {descriptor.badgeLabel}
                          </span>
                          <span aria-hidden="true" className="text-slate-400">
                            ·
                          </span>
                          <span className="text-xs font-medium text-slate-700">
                            {draft.format || 'Academic'}
                            {draft.difficulty ? ` · ${draft.difficulty}` : ''}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 break-words">
                          {draft.title || `${moduleTitle} AI Draft (${draft.id.slice(0, 12)})`}
                        </h4>

                        <p className="text-xs text-slate-700 font-medium break-words">{descriptor.headline}</p>
                        <p className="text-xs text-slate-600 break-words">{descriptor.description}</p>
                        <p className="text-xs font-semibold text-slate-800 pt-0.5 break-words">
                          <span className="text-indigo-700">Next Action: </span>
                          <span>{descriptor.nextAction}</span>
                        </p>

                        {draft.status === 'REJECTED' && descriptor.rejectionReason && (
                          <div className="mt-2 p-2.5 rounded border border-rose-200 bg-white/90 text-xs text-rose-900 break-words">
                            <span className="font-semibold">Reviewer Note: </span>
                            <span>{descriptor.rejectionReason}</span>
                          </div>
                        )}

                        <div className="pt-1 text-[11px] text-slate-500 flex items-center gap-2 flex-wrap break-all">
                          <span className="font-mono">{draft.id}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            Created {new Date(draft.createdAt).toLocaleString()}
                          </span>
                          {draft.reviewedAt && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>
                                Reviewed {new Date(draft.reviewedAt).toLocaleString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center shrink-0 mt-2 sm:mt-0">
                        {draft.status === 'APPROVED' && descriptor.canLaunch ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleLaunchApprovedDraft(draft);
                            }}
                            disabled={Boolean(launchingDraftId) || isGenerating}
                            className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
                          >
                            {isLaunchingThis ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Launching...</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Start Approved AI Pilot</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg border border-slate-300 bg-white/80 text-slate-500 text-xs font-semibold cursor-not-allowed"
                            title={descriptor.headline}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              {draft.status === 'PENDING_REVIEW'
                                ? 'Awaiting Admin Approval'
                                : draft.status === 'GENERATING'
                                ? 'Validating...'
                                : draft.status === 'APPROVED' && !descriptor.canLaunch
                                ? 'Ineligible to Launch'
                                : 'Not Launchable'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
