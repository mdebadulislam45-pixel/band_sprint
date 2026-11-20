import React, { useState, useMemo } from 'react';
import {
  Check,
  CheckCircle2,
  BookmarkPlus,
  BookmarkCheck,
  SplitSquareVertical,
  ArrowRight,
  Filter,
  Sparkles,
  FileDiff,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SentenceAnnotation, WritingDiagnosticResult, WritingExamFormat } from '../cdielts/CDIELTSWritingExamRoom';
import { addMistake } from '../../utils/vaultStorage';
import { soundManager } from '../../utils/audioEffects';
import { EASE_EDITORIAL } from '../common/MotionPrimitives';

export type DiffCriterionFilter = 'all' | 'grammar' | 'lexical' | 'cohesion';

interface WritingBandDiffStudioProps {
  diagnosticResult: WritingDiagnosticResult;
  examFormat: WritingExamFormat;
  testTitle: string;
  onApplySingleFix: (ann: SentenceAnnotation) => void;
  onApplyAllFixes: () => void;
  onShowToast: (msg: string) => void;
  onRunGeminiDeepEvaluation?: () => void;
  isRunningGeminiEval?: boolean;
  geminiEvalError?: string | null;
}

const CRITERION_META: Record<
  'grammar' | 'lexical' | 'cohesion',
  {
    code: string;
    label: string;
    badgeClass: string;
    highlightClass: string;
    borderClass: string;
  }
> = {
  grammar: {
    code: 'GRA',
    label: 'Grammar (GRA)',
    badgeClass: 'bg-[#FDF2F2] dark:bg-rose-950/50 text-[#B3261E] dark:text-rose-300 border-[#F5B8B8] dark:border-rose-800',
    highlightClass: 'bg-rose-500/15 text-[#8C1D18] dark:text-rose-200 border-b-2 border-[#CC3333]',
    borderClass: 'border-l-[#CC3333]'
  },
  lexical: {
    code: 'LR',
    label: 'Lexical (LR)',
    badgeClass: 'bg-[#EEF3F1] dark:bg-[#0F4C45]/40 text-[#0F4C45] dark:text-emerald-300 border-[#9EBEB8] dark:border-[#1F8A70]/60',
    highlightClass: 'bg-[#1F8A70]/15 text-[#0F4C45] dark:text-emerald-200 border-b-2 border-[#1F8A70]',
    borderClass: 'border-l-[#0F4C45]'
  },
  cohesion: {
    code: 'CC',
    label: 'Cohesion (CC)',
    badgeClass: 'bg-[#FEF6E8] dark:bg-amber-950/50 text-[#9B6314] dark:text-amber-300 border-[#F9D590] dark:border-amber-800',
    highlightClass: 'bg-[#F4A62A]/20 text-[#66410B] dark:text-amber-200 border-b-2 border-[#D0891F]',
    borderClass: 'border-l-[#D0891F]'
  }
};

function computeSimpleWordDiff(original: string, upgraded: string): {
  removedWords: Set<string>;
  addedWords: Set<string>;
} {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9'-]/g, '')
      .trim();
  const origTokens = original.split(/\s+/).map(norm).filter(Boolean);
  const upgTokens = upgraded.split(/\s+/).map(norm).filter(Boolean);
  const origSet = new Set(origTokens);
  const upgSet = new Set(upgTokens);

  const removedWords = new Set<string>();
  origSet.forEach((w) => {
    if (!upgSet.has(w)) removedWords.add(w);
  });

  const addedWords = new Set<string>();
  upgSet.forEach((w) => {
    if (!origSet.has(w)) addedWords.add(w);
  });

  return { removedWords, addedWords };
}

export const WritingBandDiffStudio: React.FC<WritingBandDiffStudioProps> = ({
  diagnosticResult,
  examFormat,
  testTitle,
  onApplySingleFix,
  onApplyAllFixes,
  onShowToast,
  onRunGeminiDeepEvaluation,
  isRunningGeminiEval = false,
  geminiEvalError = null
}) => {
  const [criterionFilter, setCriterionFilter] = useState<DiffCriterionFilter>('all');
  const [rationaleLang, setRationaleLang] = useState<'en' | 'bn'>('en');
  const [showInlineDiff, setShowInlineDiff] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'sentence_diff' | 'paragraph_model'>('sentence_diff');
  const [selectedAnnId, setSelectedAnnId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const [appliedIds, setAppliedIds] = useState<Record<string, boolean>>({});

  const flaggedAnnotations = useMemo(
    () => diagnosticResult.annotations.filter((a) => a.category !== 'clean'),
    [diagnosticResult.annotations]
  );

  const counts = useMemo(() => {
    return {
      all: flaggedAnnotations.length,
      grammar: flaggedAnnotations.filter((a) => a.category === 'grammar').length,
      lexical: flaggedAnnotations.filter((a) => a.category === 'lexical').length,
      cohesion: flaggedAnnotations.filter((a) => a.category === 'cohesion').length
    };
  }, [flaggedAnnotations]);

  const filteredFlagged = useMemo(() => {
    if (criterionFilter === 'all') return flaggedAnnotations;
    return flaggedAnnotations.filter((a) => a.category === criterionFilter);
  }, [flaggedAnnotations, criterionFilter]);

  const handleSaveSentenceToVault = (ann: SentenceAnnotation) => {
    if (ann.category === 'clean') return;
    const meta = CRITERION_META[ann.category];
    addMistake({
      module: 'writing',
      title: `${meta.code} · Task ${diagnosticResult.taskType}: ${ann.errorTitle || ann.identifiedIssue || 'Writing Upgrade'}`,
      prompt: `${testTitle} (${examFormat} Writing Task ${diagnosticResult.taskType})`,
      questionType: `${meta.label} — Band 8.5 Upgrade`,
      userAnswer: ann.sentence,
      userWrongAnswer: ann.sentence,
      correctAnswer: ann.suggestedCorrection || ann.sentence,
      explanation: ann.rationaleEn || 'Apply Band 8.5+ academic lexical and grammatical precision.',
      trapExplanationEn: ann.rationaleEn,
      trapExplanationBn: ann.rationaleBn,
      sourceContext: `${testTitle} · Task ${diagnosticResult.taskType}`
    });
    setSavedIds((prev) => ({ ...prev, [ann.id]: true }));
    soundManager.playSuccess();
    onShowToast(`Saved ${meta.code} sentence upgrade to your Mistake Vault (synced to cloud).`);
  };

  const handleApplyFixWithTracking = (ann: SentenceAnnotation) => {
    onApplySingleFix(ann);
    setAppliedIds((prev) => ({ ...prev, [ann.id]: true }));
  };

  const handleApplyAllWithTracking = () => {
    onApplyAllFixes();
    const next: Record<string, boolean> = {};
    flaggedAnnotations.forEach((a) => {
      next[a.id] = true;
    });
    setAppliedIds(next);
  };

  const renderHighlightedWords = (text: string, targetWords: Set<string>, mode: 'removed' | 'added') => {
    if (!showInlineDiff || targetWords.size === 0) return text;
    return text.split(/(\s+)/).map((chunk, i) => {
      const cleaned = chunk
        .toLowerCase()
        .replace(/[^a-z0-9'-]/g, '')
        .trim();
      if (!cleaned || !targetWords.has(cleaned)) {
        return <React.Fragment key={i}>{chunk}</React.Fragment>;
      }
      if (mode === 'removed') {
        return (
          <span
            key={i}
            className="line-through decoration-[#CC3333] decoration-2 bg-[#FDF2F2] dark:bg-rose-950/60 text-[#8C1D18] dark:text-rose-200 px-0.5 rounded-xs"
          >
            {chunk}
          </span>
        );
      }
      return (
        <mark
          key={i}
          className="bg-[#1F8A70]/20 text-[#0F4C45] dark:text-emerald-200 font-semibold px-0.5 rounded-xs border-b border-[#1F8A70]"
        >
          {chunk}
        </mark>
      );
    });
  };

  const filterOptions: Array<{ id: DiffCriterionFilter; label: string; count: number }> = [
    { id: 'all', label: 'All Criteria', count: counts.all },
    { id: 'grammar', label: 'Grammar (GRA)', count: counts.grammar },
    { id: 'lexical', label: 'Lexical (LR)', count: counts.lexical },
    { id: 'cohesion', label: 'Cohesion (CC)', count: counts.cohesion }
  ];

  const isGeminiEvaluated = diagnosticResult.evaluationSource === 'gemini-4-hydrogen';

  return (
    <div className="space-y-5">
      {/* Live Gemini Examiner Deep-Evaluation Bar */}
      {onRunGeminiDeepEvaluation && (
        <div className="rounded-2xl border border-[#D3DDDA] dark:border-[#1F8A70]/40 bg-white dark:bg-[#11201E] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-[#0F4C45] dark:text-[#4DB6A4]">
                <Sparkles className="w-3.5 h-3.5 text-[#F4A62A]" />
                <span>{isGeminiEvaluated ? 'Live Gemini Examiner Evaluation Active' : 'Deep AI Examiner Upgrade'}</span>
              </span>
              {isGeminiEvaluated && (
                <span className="px-2 py-0.5 rounded-md bg-[#EEF3F1] dark:bg-[#0F4C45]/40 text-[#0F4C45] dark:text-emerald-300 border border-[#9EBEB8] dark:border-[#1F8A70]/50 font-mono text-[10px] font-bold">
                  Verified Live Model Output
                </span>
              )}
            </div>
            <p className="text-xs text-[#566664] dark:text-slate-300 leading-relaxed">
              {isGeminiEvaluated
                ? 'Your 4-criteria scores, sentence diffs, and English + বাংলা rationales below were freshly evaluated on your exact essay.'
                : 'Run live server-side Gemini scoring on your custom essay for authentic sentence-by-sentence Band 8.5+ rewrites and bilingual examiner notes.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onRunGeminiDeepEvaluation}
            disabled={isRunningGeminiEval}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] disabled:opacity-60 text-white text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            {isRunningGeminiEval ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#F4A62A]" />
                <span>Evaluating Essay with Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#F4A62A]" />
                <span>{isGeminiEvaluated ? 'Re-Run Deep AI Evaluation' : 'Run Deep AI Evaluation (Gemini)'}</span>
              </>
            )}
          </button>
        </div>
      )}

      {geminiEvalError && (
        <div
          role="alert"
          className="rounded-xl border border-[#F5B8B8] dark:border-rose-800 bg-[#FDF2F2] dark:bg-rose-950/40 px-4 py-3 text-xs text-[#8C1D18] dark:text-rose-200 flex items-start gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#CC3333] dark:text-rose-400" />
          <div>
            <div className="font-bold">Live Gemini Evaluation Unavailable</div>
            <p className="mt-0.5">{geminiEvalError}</p>
          </div>
        </div>
      )}

      {/* Studio Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#EEF3F1] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30">
        {/* Criterion Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#566664] dark:text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-[#0F4C45] dark:text-[#F4A62A]" />
            <span>Filter:</span>
          </span>
          {filterOptions.map((opt) => {
            const isActive = criterionFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  soundManager.playBeep(560, 0.025);
                  setCriterionFilter(opt.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border ${
                  isActive
                    ? 'bg-[#0F4C45] text-white border-[#0F4C45]'
                    : 'bg-white dark:bg-[#11201E] text-[#384543] dark:text-slate-300 border-[#D3DDDA] dark:border-[#1F8A70]/25 hover:border-[#0F4C45]'
                }`}
              >
                <span>{opt.label}</span>
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#EEF3F1] dark:bg-[#0B1514] text-[#566664] dark:text-slate-400'
                  }`}
                >
                  {opt.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Controls: View Sub-mode, Diff Toggle, Language */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-0.5 rounded-lg bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/25 text-[11px]">
            <button
              type="button"
              onClick={() => setViewMode('sentence_diff')}
              className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer flex items-center gap-1 ${
                viewMode === 'sentence_diff'
                  ? 'bg-[#0F4C45] text-white'
                  : 'text-[#566664] dark:text-slate-300 hover:text-[#0E1F1E]'
              }`}
            >
              <FileDiff className="w-3 h-3" />
              <span>Full Diff Studio</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('paragraph_model')}
              className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer flex items-center gap-1 ${
                viewMode === 'paragraph_model'
                  ? 'bg-[#0F4C45] text-white'
                  : 'text-[#566664] dark:text-slate-300 hover:text-[#0E1F1E]'
              }`}
            >
              <SplitSquareVertical className="w-3 h-3" />
              <span>Paragraph Model ({diagnosticResult.upgradedModelParagraphs.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowInlineDiff((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
              showInlineDiff
                ? 'bg-[#FEF6E8] dark:bg-amber-950/40 text-[#9B6314] dark:text-amber-300 border-[#F9D590] dark:border-amber-700'
                : 'bg-white dark:bg-[#11201E] text-[#566664] dark:text-slate-300 border-[#D3DDDA] dark:border-[#1F8A70]/25'
            }`}
          >
            {showInlineDiff ? 'Word Diff: ON' : 'Word Diff: OFF'}
          </button>

          <div className="inline-flex p-0.5 rounded-lg bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/25 text-[11px]">
            <button
              type="button"
              onClick={() => setRationaleLang('en')}
              className={`px-2 py-1 rounded-md font-bold transition cursor-pointer ${
                rationaleLang === 'en' ? 'bg-[#0E1F1E] text-white' : 'text-[#566664] dark:text-slate-400'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setRationaleLang('bn')}
              className={`px-2 py-1 rounded-md font-bold transition cursor-pointer ${
                rationaleLang === 'bn' ? 'bg-[#0F4C45] text-white' : 'text-[#566664] dark:text-slate-400'
              }`}
            >
              বাংলা
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'sentence_diff' ? (
        <>
          {/* SIDE-BY-SIDE FULL ESSAY DIFF CANVAS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Candidate Original Draft */}
            <div className="rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 overflow-hidden flex flex-col">
              <div className="px-4 py-3 bg-[#F7F9F8] dark:bg-[#0B1514] border-b border-[#D3DDDA] dark:border-[#1F8A70]/25 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#566664] dark:text-slate-400">
                    Original Candidate Draft
                  </div>
                  <div className="text-xs font-bold text-[#0E1F1E] dark:text-white font-mono tabular-nums">
                    Estimated Band {diagnosticResult.overallBand.toFixed(1)} · {diagnosticResult.wordCount} words
                  </div>
                </div>
                <span className="text-[11px] font-mono font-semibold text-[#566664] dark:text-slate-400">
                  Click highlight to focus
                </span>
              </div>

              <div className="p-4 sm:p-5 text-sm sm:text-[15px] leading-relaxed font-serif text-[#0E1F1E] dark:text-slate-200 space-x-1">
                {diagnosticResult.annotations.map((ann) => {
                  const matchesFilter =
                    ann.category !== 'clean' &&
                    (criterionFilter === 'all' || ann.category === criterionFilter);
                  if (!matchesFilter) {
                    return <span key={ann.id}>{ann.sentence} </span>;
                  }
                  const meta = CRITERION_META[ann.category as 'grammar' | 'lexical' | 'cohesion'];
                  const isFocused = selectedAnnId === ann.id;
                  return (
                    <span
                      key={ann.id}
                      onClick={() => {
                        setSelectedAnnId(ann.id);
                        const el = document.getElementById(`diff-card-${ann.id}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                      }}
                      className={`inline px-1 py-0.5 rounded-xs cursor-pointer transition ${meta.highlightClass} ${
                        isFocused ? 'ring-2 ring-[#0E1F1E] dark:ring-[#F4A62A]' : ''
                      }`}
                      title={`${meta.label}: ${ann.errorTitle || 'Click to inspect upgrade'}`}
                    >
                      {ann.sentence}{' '}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Right: Reconstructed Band 8.5+ Rewrite */}
            <div className="rounded-2xl bg-white dark:bg-[#11201E] border-2 border-[#0F4C45]/35 dark:border-[#1F8A70]/50 overflow-hidden flex flex-col">
              <div className="px-4 py-3 bg-[#0F4C45] text-white flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#F4A62A] flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Band 8.5+ Upgraded Version</span>
                  </div>
                  <div className="text-xs font-semibold text-[#EEF3F1]/90">
                    {filteredFlagged.length} targeted {criterionFilter === 'all' ? '4-criteria' : criterionFilter.toUpperCase()} rewrite
                    {filteredFlagged.length === 1 ? '' : 's'} previewed live
                  </div>
                </div>
                {flaggedAnnotations.length > 0 && (
                  <button
                    type="button"
                    onClick={handleApplyAllWithTracking}
                    className="px-3 py-1.5 rounded-lg bg-[#F4A62A] hover:bg-[#D0891F] text-[#0E1F1E] font-bold text-[11px] transition cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Apply All ({flaggedAnnotations.length})</span>
                  </button>
                )}
              </div>

              <div className="p-4 sm:p-5 text-sm sm:text-[15px] leading-relaxed font-serif text-[#0E1F1E] dark:text-slate-100 space-x-1">
                {diagnosticResult.annotations.map((ann) => {
                  const matchesFilter =
                    ann.category !== 'clean' &&
                    (criterionFilter === 'all' || ann.category === criterionFilter) &&
                    Boolean(ann.suggestedCorrection);
                  if (!matchesFilter) {
                    return <span key={ann.id}>{ann.sentence} </span>;
                  }
                  const upgraded = ann.suggestedCorrection || ann.sentence;
                  const { addedWords } = computeSimpleWordDiff(ann.sentence, upgraded);
                  const isFocused = selectedAnnId === ann.id;
                  return (
                    <span
                      key={ann.id}
                      onClick={() => {
                        setSelectedAnnId(ann.id);
                        const el = document.getElementById(`diff-card-${ann.id}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                      }}
                      className={`inline px-1 py-0.5 rounded-xs bg-[#EEF3F1] dark:bg-[#0F4C45]/30 cursor-pointer transition ${
                        isFocused ? 'ring-2 ring-[#0F4C45] dark:ring-[#F4A62A]' : ''
                      }`}
                    >
                      {renderHighlightedWords(upgraded, addedWords, 'added')}{' '}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SENTENCE-BY-SENTENCE ACTIONABLE DIFF CARDS */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-sm font-bold text-[#0E1F1E] dark:text-white">
                Inline Corrections &amp; Mistake Vault Actions ({filteredFlagged.length})
              </h3>
              <span className="text-[11px] font-mono text-[#566664] dark:text-slate-400">
                Save individual sentences to your cloud-synced Mistake Vault or apply directly to your draft
              </span>
            </div>

            {filteredFlagged.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/25 text-center space-y-1.5">
                <CheckCircle2 className="w-6 h-6 text-[#1F8A70] mx-auto" />
                <p className="text-sm font-bold text-[#0E1F1E] dark:text-white">
                  No flagged issues in this criterion filter
                </p>
                <p className="text-xs text-[#566664] dark:text-slate-400">
                  Switch back to &ldquo;All Criteria&rdquo; to inspect every upgrade across Grammar, Lexical Resource, and Cohesion.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                {filteredFlagged.map((ann, idx) => {
                  const meta = CRITERION_META[ann.category as 'grammar' | 'lexical' | 'cohesion'];
                  const upgraded = ann.suggestedCorrection || ann.sentence;
                  const { removedWords, addedWords } = computeSimpleWordDiff(ann.sentence, upgraded);
                  const isSaved = Boolean(savedIds[ann.id]);
                  const isApplied = Boolean(appliedIds[ann.id]);
                  const isSelected = selectedAnnId === ann.id;

                  return (
                    <motion.div
                      key={ann.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.22, delay: Math.min(idx * 0.03, 0.18), ease: EASE_EDITORIAL }}
                      id={`diff-card-${ann.id}`}
                      className={`rounded-2xl bg-white dark:bg-[#11201E] border border-l-4 ${meta.borderClass} ${
                        isSelected
                          ? 'border-[#0F4C45] dark:border-[#F4A62A] ring-1 ring-[#0F4C45]/25'
                          : 'border-[#D3DDDA] dark:border-[#1F8A70]/25'
                      } p-4 space-y-3 transition-colors`}
                    >
                      {/* Card Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-[#566664] dark:text-slate-400">
                            #{idx + 1}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${meta.badgeClass}`}>
                            {meta.label}
                          </span>
                          <span className="text-xs font-bold text-[#0E1F1E] dark:text-white">
                            {ann.errorTitle || ann.identifiedIssue}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveSentenceToVault(ann)}
                            disabled={isSaved}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 border ${
                              isSaved
                                ? 'bg-[#EEF3F1] dark:bg-[#0F4C45]/30 text-[#0F4C45] dark:text-emerald-300 border-[#9EBEB8]'
                                : 'bg-white dark:bg-[#0B1514] hover:bg-[#EEF3F1] text-[#0E1F1E] dark:text-slate-200 border-[#D3DDDA] dark:border-[#1F8A70]/35'
                            }`}
                          >
                            {isSaved ? (
                              <>
                                <BookmarkCheck className="w-3.5 h-3.5 text-[#1F8A70]" />
                                <span>Saved to Vault</span>
                              </>
                            ) : (
                              <>
                                <BookmarkPlus className="w-3.5 h-3.5 text-[#0F4C45] dark:text-[#F4A62A]" />
                                <span>Save Sentence to Vault</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApplyFixWithTracking(ann)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                              isApplied
                                ? 'bg-[#1F8A70]/15 text-[#0F4C45] dark:text-emerald-300 border border-[#1F8A70]/40'
                                : 'bg-[#0F4C45] hover:bg-[#0B3A35] text-white'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isApplied ? 'Applied to Draft' : 'Apply Fix'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Side-by-Side Original vs Upgraded Sentence */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
                        <div className="p-3 rounded-xl bg-[#FDF2F2]/70 dark:bg-rose-950/20 border border-[#FADCDC] dark:border-rose-900/50 space-y-1">
                          <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#B3261E] dark:text-rose-400">
                            Original Sentence
                          </div>
                          <p className="text-xs sm:text-sm font-serif leading-relaxed text-[#0E1F1E] dark:text-slate-200">
                            {renderHighlightedWords(ann.sentence, removedWords, 'removed')}
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-[#EEF3F1]/80 dark:bg-[#0F4C45]/20 border border-[#9EBEB8] dark:border-[#1F8A70]/40 space-y-1">
                          <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#0F4C45] dark:text-emerald-400 flex items-center gap-1">
                            <ArrowRight className="w-3 h-3" />
                            <span>Band 8.5+ Upgrade</span>
                          </div>
                          <p className="text-xs sm:text-sm font-serif leading-relaxed text-[#0E1F1E] dark:text-slate-100">
                            {renderHighlightedWords(upgraded, addedWords, 'added')}
                          </p>
                        </div>
                      </div>

                      {/* Rationale */}
                      {(ann.rationaleEn || ann.rationaleBn) && (
                        <div className="px-3 py-2 rounded-lg bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA]/70 dark:border-[#1F8A70]/20 text-xs text-[#384543] dark:text-slate-300 leading-relaxed">
                          <span className="font-mono text-[10px] font-bold uppercase text-[#566664] dark:text-slate-400 mr-1.5">
                            Examiner Note ({rationaleLang === 'bn' ? 'বাংলা' : 'EN'}):
                          </span>
                          <span className={rationaleLang === 'bn' ? 'font-bengali' : ''}>
                            {rationaleLang === 'bn' ? ann.rationaleBn || ann.rationaleEn : ann.rationaleEn}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </>
      ) : (
        /* PARAGRAPH-LEVEL MODEL COMPARISON VIEW */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#566664] dark:text-slate-400">
            <span>
              Side-by-side paragraph comparison showing how your draft scales to Band 8.5+ academic prose.
            </span>
            <span className="font-semibold text-[#0F4C45] dark:text-emerald-400">
              Highlighted phrases = C1/C2 academic collocations &amp; complex syntax
            </span>
          </div>

          <div className="space-y-4">
            {diagnosticResult.upgradedModelParagraphs.map((pair, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/25"
              >
                <div className="space-y-2 md:pr-4 md:border-r border-[#D3DDDA] dark:border-[#1F8A70]/25">
                  <div className="text-[11px] font-mono font-bold uppercase text-[#566664] dark:text-slate-400">
                    Original Draft · Paragraph {idx + 1} (Est. Band {diagnosticResult.overallBand.toFixed(1)})
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed text-[#384543] dark:text-slate-300 font-serif">
                    {pair.original}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-mono font-bold uppercase text-[#0F4C45] dark:text-emerald-400">
                    Band 8.5+ Model Rewrite · Paragraph {idx + 1}
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed text-[#0E1F1E] dark:text-slate-100 font-serif">
                    {pair.upgradedHtml.map((seg, sIdx) =>
                      seg.isUpgrade ? (
                        <mark
                          key={sIdx}
                          className="bg-[#1F8A70]/20 text-[#0F4C45] dark:text-emerald-200 font-semibold px-1 py-0.5 rounded-xs"
                        >
                          {seg.text}
                        </mark>
                      ) : (
                        <span key={sIdx}>{seg.text}</span>
                      )
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
