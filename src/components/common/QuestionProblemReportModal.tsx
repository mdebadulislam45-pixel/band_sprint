import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flag, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';

interface QuestionProblemReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionId: number | string;
  moduleId: 'reading' | 'listening' | 'writing' | 'speaking';
  examId?: string;
  examTitle?: string;
  onShowToast?: (msg: string) => void;
}

export const QuestionProblemReportModal: React.FC<QuestionProblemReportModalProps> = ({
  isOpen,
  onClose,
  questionId,
  moduleId,
  examId,
  examTitle,
  onShowToast
}) => {
  const [issueType, setIssueType] = useState<
    'wrong_key' | 'ambiguous_wording' | 'audio_mismatch' | 'typo' | 'other'
  >('wrong_key');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      let token = '';
      try {
        if (typeof localStorage !== 'undefined') {
          token = localStorage.getItem('ielts_session_token_v2') || '';
        }
      } catch {}

      const res = await fetch('/api/feedback/report-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          questionId,
          moduleId,
          examId,
          examTitle,
          issueType,
          comment: comment.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit feedback.');
      }

      setIsSuccess(true);
      soundManager.playSuccess();
      if (onShowToast) {
        onShowToast('Problem report submitted for item review.');
      }

      setTimeout(() => {
        setIsSuccess(false);
        setComment('');
        onClose();
      }, 1400);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to submit report. Please try again.');
      soundManager.playBeep(300, 0.05);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSubmitting) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden text-slate-900 dark:text-slate-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <Flag className="w-5 h-5 shrink-0" />
              <h3 id="report-modal-title" className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                Report a Question Issue
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6">
            {isSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                <h4 className="font-bold text-base text-slate-900 dark:text-white">Report Received</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Our quality audit team has queued Question {questionId} for second-pass review.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>
                    Module: <strong className="uppercase text-slate-700 dark:text-slate-300">{moduleId}</strong>
                  </span>
                  <span>
                    Item: <strong className="text-slate-700 dark:text-slate-300">Question {questionId}</strong>
                  </span>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    What is the issue with this item?
                  </label>
                  <div className="space-y-1.5 text-xs">
                    {[
                      { id: 'wrong_key', label: 'Incorrect answer key or solution' },
                      { id: 'ambiguous_wording', label: 'Ambiguous or confusing question wording' },
                      { id: 'audio_mismatch', label: 'Audio or script transcript mismatch' },
                      { id: 'typo', label: 'Typo or grammatical error in passage/question' },
                      { id: 'other', label: 'Other problem or defect' }
                    ].map((opt) => (
                      <label
                        key={opt.id}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition cursor-pointer ${
                          issueType === opt.id
                            ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-slate-900 dark:text-white'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="issueType"
                          value={opt.id}
                          checked={issueType === opt.id}
                          onChange={() => setIssueType(opt.id as any)}
                          className="accent-rose-600"
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Additional Details (Optional)
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Describe what seemed incorrect or how you believe this should be resolved..."
                    className="w-full h-20 p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                    maxLength={1000}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="flex-1 h-10 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Flag className="w-3.5 h-3.5" />
                        <span>Submit Report</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
