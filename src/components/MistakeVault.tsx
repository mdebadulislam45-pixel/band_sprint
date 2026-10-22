import React, { useState, useEffect } from 'react';
import {
  Archive,
  Trash2,
  CheckCircle2,
  Download,
  Sparkles,
  X,
  AlertTriangle,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { MistakeItem } from '../types';
import { getMistakes, toggleMastery, clearMistakes } from '../utils/vaultStorage';
import { soundManager } from '../utils/audioEffects';
import { ResponsiveModal } from './common/ResponsiveModal';

interface MistakeVaultProps {
  onShowToast: (msg: string) => void;
  isModal?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export const MistakeVault: React.FC<MistakeVaultProps> = ({
  onShowToast,
  isModal = false,
  isOpen = false,
  onClose
}) => {
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [filterModule, setFilterModule] = useState<string>('all');
  const [reviewMode, setReviewMode] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);
  const [hasRenderError, setHasRenderError] = useState<boolean>(false);

  const loadData = () => {
    try {
      const items = getMistakes();
      setMistakes(Array.isArray(items) ? items : []);
      setHasRenderError(false);
    } catch (err) {
      console.error('[MistakeVault] Failed to load data:', err);
      setMistakes([]);
      setHasRenderError(true);
    }
  };

  useEffect(() => {
    loadData();
    const handleVaultUpdated = () => loadData();
    window.addEventListener('vault_updated', handleVaultUpdated);
    return () => window.removeEventListener('vault_updated', handleVaultUpdated);
  }, []);

  const handleToggle = (id: string) => {
    try {
      toggleMastery(id);
      soundManager.playSuccess();
      loadData();
    } catch (err) {
      console.error('[MistakeVault] Toggle mastery failed:', err);
    }
  };

  const handleClearAll = () => {
    try {
      clearMistakes();
      loadData();
      setConfirmClear(false);
      onShowToast('Mistake Vault cleared.');
    } catch (err) {
      console.error('[MistakeVault] Clear all failed:', err);
    }
  };

  const handleExportJSON = () => {
    try {
      const dataStr =
        'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(mistakes, null, 2));
      const dlAnchorElem = document.createElement('a');
      dlAnchorElem.setAttribute('href', dataStr);
      dlAnchorElem.setAttribute('download', 'ielts_mistakes_vault.json');
      dlAnchorElem.click();
      onShowToast('Exported Mistake Vault JSON file!');
    } catch (err) {
      onShowToast('Export failed. Please check browser permissions.');
    }
  };

  const filteredMistakes = (mistakes || []).filter((m) => {
    if (!m) return false;
    if (filterModule === 'all') return true;
    return m.module === filterModule;
  });

  const unmastered = (mistakes || []).filter((m) => m && !m.mastered);

  // Safe quiz question bounds
  const currentItem = unmastered[currentQuizIndex] || unmastered[0];

  const handleCheckQuizAnswer = () => {
    if (!currentItem) return;

    const userAns = (quizAnswer || '').trim().toLowerCase();
    const correctAns = (currentItem.correctAnswer || '').trim().toLowerCase();

    const isMatch = userAns.length > 0 && (userAns === correctAns || correctAns.includes(userAns));
    if (isMatch) {
      soundManager.playSuccess();
      setQuizFeedback('correct');
      onShowToast('Correct! Question marked mastered.');
      handleToggle(currentItem.id);
    } else {
      soundManager.playWarning();
      setQuizFeedback('incorrect');
    }
  };

  const nextQuizQuestion = () => {
    setQuizAnswer('');
    setQuizFeedback(null);
    if (unmastered.length <= 1) {
      setCurrentQuizIndex(0);
      setReviewMode(false);
    } else {
      setCurrentQuizIndex((prev) => (prev + 1) % unmastered.length);
    }
  };

  // Safe date formatter
  const formatDate = (ts: any): string => {
    try {
      const num = typeof ts === 'number' && !isNaN(ts) ? ts : Date.now();
      return new Date(num).toLocaleDateString();
    } catch {
      return 'Recent';
    }
  };

  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
            <Archive className="w-3.5 h-3.5" /> Browser-Persistent Error Log
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            Mistake Vault & Spaced Repetition Engine
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Never repeat an exam error. Misspelled words, TFNG traps, and vocabulary upgrades persist
            locally in your browser.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unmastered.length > 0 && (
            <button
              onClick={() => {
                setReviewMode(!reviewMode);
                setQuizFeedback(null);
                setQuizAnswer('');
                setCurrentQuizIndex(0);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs ${
                reviewMode
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{reviewMode ? 'Exit Review' : `Spaced Quiz (${unmastered.length})`}</span>
            </button>
          )}

          <button
            onClick={handleExportJSON}
            disabled={mistakes.length === 0}
            className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition disabled:opacity-40"
            title="Export Mistakes JSON"
          >
            <Download className="w-4 h-4" />
          </button>

          {confirmClear ? (
            <div className="flex items-center gap-1 bg-rose-50 border border-rose-300 rounded-xl p-1">
              <span className="text-[11px] text-rose-700 font-bold px-1.5">Clear all?</span>
              <button
                onClick={handleClearAll}
                className="px-2 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px] hover:bg-rose-700"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="px-2 py-1 rounded-lg bg-slate-200 text-slate-700 font-bold text-[11px] hover:bg-slate-300"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              disabled={mistakes.length === 0}
              className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition disabled:opacity-40"
              title="Clear Vault"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {isModal && onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition ml-2"
              title="Close Mistake Vault"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {hasRenderError && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Recovered from corrupted entries. Your valid mistakes are preserved safely.</span>
          </div>
          <button
            onClick={loadData}
            className="px-3 py-1 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700"
          >
            Refresh
          </button>
        </div>
      )}

      {/* Spaced Repetition Reviewer Mode */}
      {reviewMode && currentItem ? (
        <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between text-xs text-amber-300 pb-2 border-b border-slate-800">
            <span className="font-mono uppercase font-bold">
              Spaced Repetition Flash-Quiz · Item {Math.min(currentQuizIndex + 1, unmastered.length)} of{' '}
              {unmastered.length}
            </span>
            <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-slate-300">
              {currentItem.module || 'review'}
            </span>
          </div>

          <div className="space-y-2">
            <h4 className="text-base font-bold text-white">{currentItem.title || 'Practice Item'}</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>Context / Rule:</strong>{' '}
              {currentItem.explanation || 'Apply correct Cambridge IELTS standard conventions.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 space-y-3">
            <label className="text-xs font-bold text-slate-300 block">
              What is the correct answer / upgraded phrasing?
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={quizAnswer}
                onChange={(e) => setQuizAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCheckQuizAnswer();
                }}
                placeholder="Type the corrected term..."
                className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <button
                onClick={handleCheckQuizAnswer}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition"
              >
                Verify
              </button>
            </div>

            {quizFeedback === 'correct' && (
              <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-700 text-emerald-200 text-xs flex items-center justify-between">
                <span>
                  ✓ Perfect! Correct answer: <strong>{currentItem.correctAnswer}</strong>
                </span>
                <button
                  onClick={nextQuizQuestion}
                  className="px-3 py-1 rounded bg-emerald-800 text-white font-bold text-[10px]"
                >
                  Next Item ➔
                </button>
              </div>
            )}

            {quizFeedback === 'incorrect' && (
              <div className="p-3 rounded-xl bg-rose-950 border border-rose-700 text-rose-200 text-xs flex items-center justify-between">
                <span>
                  ✗ Expected: <strong>{currentItem.correctAnswer}</strong>{' '}
                  {quizAnswer ? `(You wrote: ${quizAnswer})` : ''}
                </span>
                <button
                  onClick={nextQuizQuestion}
                  className="px-3 py-1 rounded bg-rose-800 text-white font-bold text-[10px]"
                >
                  Next ➔
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Module Filter Tags */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'listening', 'reading', 'writing', 'speaking', 'vocab'].map((mod) => (
          <button
            key={mod}
            onClick={() => setFilterModule(mod)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize border transition ${
              filterModule === mod
                ? 'bg-blue-700 text-white border-blue-700'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {mod} (
            {mod === 'all'
              ? (mistakes || []).length
              : (mistakes || []).filter((m) => m && m.module === mod).length}
            )
          </button>
        ))}
      </div>

      {/* Mistakes Table / Cards List */}
      {filteredMistakes.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-3xl p-8 space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h4 className="font-bold text-slate-800 text-sm">Mistake Vault is Pristine!</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Any errors committed in the Listening Lab, Reading Lab, or Live Mock Examiner will
            automatically populate here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMistakes.map((item, idx) => {
            if (!item) return null;
            const itemId = item.id || `m_idx_${idx}`;
            const itemTitle = item.title || 'Untitled Exam Item';
            const isMastered = Boolean(item.mastered);

            return (
              <div
                key={itemId}
                className={`p-5 rounded-2xl border transition flex flex-col justify-between ${
                  isMastered
                    ? 'bg-slate-50/60 border-slate-200 opacity-60'
                    : 'bg-white border-rose-200 shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {item.module || 'review'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatDate(item.timestamp)}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm leading-snug">{itemTitle}</h4>

                  <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs font-mono">
                    <div className="text-rose-700">
                      <span className="font-sans font-bold text-slate-500">Your Answer: </span>
                      <span className="line-through">{item.userAnswer || '—'}</span>
                    </div>
                    <div className="text-emerald-700 font-bold">
                      <span className="font-sans font-bold text-slate-500">Correct Target: </span>
                      {item.correctAnswer || 'Required form'}
                    </div>
                  </div>

                  {item.explanation && (
                    <p className="mt-2 text-xs text-slate-600 leading-relaxed">{item.explanation}</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-4">
                  <button
                    onClick={() => handleToggle(itemId)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold border transition ${
                      isMastered
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {isMastered ? '✓ Mastered' : 'Mark Mastered'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // If used as modal OR called with isOpen/onClose
  if (isModal || isOpen !== undefined) {
    if (!isOpen) return null;
    return (
      <ResponsiveModal
        isOpen={isOpen}
        onClose={onClose || (() => {})}
        maxWidth="4xl"
        showCloseButton={false}
      >
        {content}
      </ResponsiveModal>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
      {content}
    </div>
  );
};
