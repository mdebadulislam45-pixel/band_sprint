import React, { useState, useEffect, useMemo } from 'react';
import {
  Archive,
  Trash2,
  CheckCircle2,
  Download,
  Sparkles,
  X,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Globe,
  Zap,
  Target,
  Check,
  ShieldCheck,
  Clock,
  Volume2,
  Brain,
  PenTool,
  Mic
} from 'lucide-react';
import { MistakeItem } from '../types';
import {
  getMistakes,
  toggleMastery,
  clearMistakes,
  recordSM2Review,
  seedHighYieldSampleMistakes
} from '../utils/vaultStorage';
import { soundManager } from '../utils/audioEffects';
import { speakBritish } from '../utils/britishVoice';
import { ResponsiveModal } from './common/ResponsiveModal';

interface MistakeVaultProps {
  onShowToast: (msg: string) => void;
  isModal?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

type VaultTabFilter = 'unresolved' | 'sm2_due' | 'listening' | 'reading' | 'writing_speaking' | 'mastered';

export const MistakeVault: React.FC<MistakeVaultProps> = ({
  onShowToast,
  isModal = false,
  isOpen = false,
  onClose
}) => {
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [tabFilter, setTabFilter] = useState<VaultTabFilter>('unresolved');
  const [langPreference, setLangPreference] = useState<Record<string, 'en' | 'bn'>>({});
  const [activeDrillItem, setActiveDrillItem] = useState<MistakeItem | null>(null);
  const [drillInput, setDrillInput] = useState<string>('');
  const [drillFeedback, setDrillFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);
  const [hasRenderError, setHasRenderError] = useState<boolean>(false);

  // SM-2 Rapid Flashcard Workout State
  const [sm2WorkoutActive, setSm2WorkoutActive] = useState<boolean>(false);
  const [sm2Index, setSm2Index] = useState<number>(0);
  const [sm2AnswerRevealed, setSm2AnswerRevealed] = useState<boolean>(false);

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
    window.addEventListener('ielts_mistakes_updated', handleVaultUpdated);
    return () => {
      window.removeEventListener('vault_updated', handleVaultUpdated);
      window.removeEventListener('ielts_mistakes_updated', handleVaultUpdated);
    };
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

  const handleSeedSamples = () => {
    try {
      seedHighYieldSampleMistakes();
      soundManager.playSuccess();
      loadData();
      onShowToast('Tutorial / Walkthrough Mode: Loaded 4 sample Practice traps.');
    } catch (err) {
      console.error('[MistakeVault] Seed samples failed:', err);
    }
  };

  const handleClearAll = () => {
    try {
      clearMistakes();
      loadData();
      setConfirmClear(false);
      setSm2WorkoutActive(false);
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
      dlAnchorElem.setAttribute('download', 'ielts_sprint_mistake_vault.json');
      dlAnchorElem.click();
      onShowToast('Exported Mistake Vault JSON!');
    } catch {
      onShowToast('Export failed.');
    }
  };

  const now = Date.now();
  const dueMistakes = useMemo(
    () => (mistakes || []).filter((m) => !m.mastered && (m.nextReviewAt ?? 0) <= now),
    [mistakes, now]
  );

  const unresolvedCount = (mistakes || []).filter((m) => !m.mastered).length;
  const listeningTrapsCount = (mistakes || []).filter((m) => !m.mastered && m.module === 'listening').length;
  const readingTrapsCount = (mistakes || []).filter((m) => !m.mastered && m.module === 'reading').length;
  const writingSpeakingCount = (mistakes || []).filter(
    (m) => !m.mastered && (m.module === 'writing' || m.module === 'speaking')
  ).length;
  const masteredCount = (mistakes || []).filter((m) => m.mastered).length;

  // Filter items according to active tab
  const filteredMistakes = (mistakes || []).filter((m) => {
    if (!m) return false;
    if (tabFilter === 'mastered') return m.mastered;
    if (tabFilter === 'sm2_due') return !m.mastered && (m.nextReviewAt ?? 0) <= now;
    if (tabFilter === 'listening') return !m.mastered && m.module === 'listening';
    if (tabFilter === 'reading') return !m.mastered && m.module === 'reading';
    if (tabFilter === 'writing_speaking') return !m.mastered && (m.module === 'writing' || m.module === 'speaking');
    return !m.mastered;
  });

  const toggleLang = (id: string) => {
    setLangPreference((prev) => ({
      ...prev,
      [id]: prev[id] === 'bn' ? 'en' : 'bn'
    }));
  };

  const handleStartDrill = (item: MistakeItem) => {
    setActiveDrillItem(item);
    setDrillInput('');
    setDrillFeedback(null);
    soundManager.playBeep(560, 0.03);
  };

  const handleVerifyDrill = () => {
    if (!activeDrillItem) return;
    const userVal = drillInput.trim().toLowerCase();
    const correctVal = activeDrillItem.correctAnswer.trim().toLowerCase();

    if (
      userVal.length > 0 &&
      (userVal === correctVal ||
        correctVal.includes(userVal) ||
        userVal.replace(/\s+/g, '') === correctVal.replace(/\s+/g, ''))
    ) {
      soundManager.playSuccess();
      setDrillFeedback('correct');
      recordSM2Review(activeDrillItem.id, 5);
      onShowToast('Perfect! SM-2 interval upgraded and item mastered.');
      loadData();
      setTimeout(() => {
        setActiveDrillItem(null);
        setDrillFeedback(null);
      }, 1500);
    } else {
      soundManager.playWarning();
      recordSM2Review(activeDrillItem.id, 1);
      setDrillFeedback('incorrect');
      loadData();
    }
  };

  const handleSM2Rate = (item: MistakeItem, quality: 1 | 3 | 4 | 5) => {
    const updated = recordSM2Review(item.id, quality);
    soundManager.playBeep(quality >= 4 ? 660 : 480, 0.04);
    loadData();
    if (updated?.mastered) {
      onShowToast(`Graduated "${item.title}" to Mastered via SM-2!`);
    } else if (updated) {
      onShowToast(
        quality === 1
          ? 'Scheduled for immediate re-review (1m)'
          : `Next SM-2 review scheduled in ${updated.intervalDays} day(s)`
      );
    }

    if (sm2WorkoutActive) {
      setSm2AnswerRevealed(false);
      if (sm2Index + 1 < dueMistakes.length) {
        setSm2Index((prev) => prev + 1);
      } else {
        setSm2WorkoutActive(false);
        setSm2Index(0);
        soundManager.playSuccess();
        onShowToast('SM-2 Due Queue Completed! Great memory retention.');
      }
    }
  };

  const formatDate = (ts: any): string => {
    try {
      const num = typeof ts === 'number' && !isNaN(ts) ? ts : Date.now();
      return new Date(num).toLocaleDateString();
    } catch {
      return 'Recent';
    }
  };

  const formatNextReview = (item: MistakeItem): string => {
    if (item.mastered) return 'Graduated (Mastered)';
    const next = item.nextReviewAt ?? 0;
    if (next <= Date.now()) return 'Due Now';
    const diffHours = Math.max(1, Math.round((next - Date.now()) / (1000 * 60 * 60)));
    if (diffHours < 24) return `In ${diffHours}h`;
    return `In ${Math.round(diffHours / 24)}d`;
  };

  const currentWorkoutCard = dueMistakes[sm2Index] || dueMistakes[0] || null;

  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            <Archive className="w-3.5 h-3.5" />
            <span>SuperMemo SM-2 Mistake Vault &amp; Bilingual Trap Engine</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            IELTS Mistake Vault &amp; Active Recall Arena
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Every incorrect response across Listening, Reading, Writing, and Speaking is scheduled via SM-2 spaced repetition.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleSeedSamples}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="Load 4 High-Yield Practice Traps across all 4 skills"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Load Practice Traps</span>
          </button>

          <button
            onClick={handleExportJSON}
            disabled={mistakes.length === 0}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-40 cursor-pointer"
            title="Export Mistakes JSON"
          >
            <Download className="w-4 h-4" />
          </button>

          {confirmClear ? (
            <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 rounded-xl p-1">
              <span className="text-[11px] text-rose-700 dark:text-rose-300 font-bold px-1.5">Clear all?</span>
              <button
                onClick={handleClearAll}
                className="px-2 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px] hover:bg-rose-700 cursor-pointer"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] hover:bg-slate-300 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              disabled={mistakes.length === 0}
              className="p-2 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 transition disabled:opacity-40 cursor-pointer"
              title="Clear Vault"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {isModal && onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition ml-1 cursor-pointer"
              title="Close Vault"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* SM-2 Spaced Repetition Telemetry & Rapid Workout Launcher */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
            <Brain className="w-4 h-4" />
            <span>SM-2 Spaced Repetition Queue</span>
          </div>
          <div className="text-sm sm:text-base font-bold">
            {dueMistakes.length > 0
              ? `${dueMistakes.length} Weak Item${dueMistakes.length > 1 ? 's' : ''} Due for Active Recall Now`
              : 'All Scheduled SM-2 Reviews Up to Date'}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
            <span>Due Now: {dueMistakes.length}</span>
            <span aria-hidden="true">·</span>
            <span>Unresolved: {unresolvedCount}</span>
            <span aria-hidden="true">·</span>
            <span>Mastered: {masteredCount}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {dueMistakes.length > 0 ? (
            <button
              onClick={() => {
                setSm2Index(0);
                setSm2AnswerRevealed(false);
                setSm2WorkoutActive(!sm2WorkoutActive);
                soundManager.playBeep(620, 0.04);
              }}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>{sm2WorkoutActive ? 'Exit SM-2 Workout' : `Start 5-Min SM-2 Workout (${dueMistakes.length})`}</span>
            </button>
          ) : (
            <button
              onClick={handleSeedSamples}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Tutorial / Walkthrough Mode: Preview Sample Traps</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive SM-2 Flashcard Active Recall Workout Deck */}
      {sm2WorkoutActive && currentWorkoutCard && (
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-950 text-white border border-slate-800 space-y-5 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-amber-400 font-bold uppercase">
                SM-2 Active Recall Card {sm2Index + 1} of {dueMistakes.length}
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-400 uppercase">{currentWorkoutCard.module}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-400">Ease: {(currentWorkoutCard.easeFactor ?? 2.5).toFixed(2)}x</span>
            </div>
            <button
              onClick={() => setSm2WorkoutActive(false)}
              className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer"
            >
              Close Deck
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-white">{currentWorkoutCard.title}</h3>
            {currentWorkoutCard.prompt && (
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-slate-200 font-serif italic">
                &ldquo;{currentWorkoutCard.prompt}&rdquo;
              </div>
            )}
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-xs text-rose-200 font-mono">
              <span className="text-[10px] uppercase text-rose-400 block font-sans font-bold">
                Your Previous Error Trap:
              </span>
              <span className="line-through font-bold">{currentWorkoutCard.userWrongAnswer || currentWorkoutCard.userAnswer}</span>
            </div>
          </div>

          {!sm2AnswerRevealed ? (
            <button
              onClick={() => {
                setSm2AnswerRevealed(true);
                soundManager.playBeep(580, 0.03);
              }}
              className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer"
            >
              Reveal Band 8.5+ Target &amp; Bilingual Trap Logic
            </button>
          ) : (
            <div className="space-y-4 pt-2 border-t border-slate-800 animate-fade-in">
              <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">
                    Correct Target / Band 8.5 Upgrade:
                  </span>
                  <button
                    onClick={() => speakBritish(currentWorkoutCard.correctAnswer)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>Listen (RP)</span>
                  </button>
                </div>
                <div className="text-sm sm:text-base font-bold text-emerald-200 font-mono">
                  {currentWorkoutCard.correctAnswer}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-blue-400 font-bold block">
                    🇬🇧 Practice Examiner Logic
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    {currentWorkoutCard.trapExplanationEn || currentWorkoutCard.explanation}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block">
                    🇧🇩 বাংলা ট্র্যাপ বিশ্লেষণ
                  </span>
                  <p className="text-emerald-200 leading-relaxed">
                    {currentWorkoutCard.trapExplanationBn ||
                      currentWorkoutCard.explanation ||
                      'সঠিক নিয়ম ও কী-ওয়ার্ড মিলিয়ে উত্তরটি যাচাই করুন।'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-mono text-slate-400 text-center">
                  Rate your recall to schedule next SuperMemo SM-2 interval:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => handleSM2Rate(currentWorkoutCard, 1)}
                    className="py-2.5 px-3 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-200 text-xs font-bold transition cursor-pointer"
                  >
                    Again · 1m
                  </button>
                  <button
                    onClick={() => handleSM2Rate(currentWorkoutCard, 3)}
                    className="py-2.5 px-3 rounded-xl bg-amber-950 hover:bg-amber-900 border border-amber-800 text-amber-200 text-xs font-bold transition cursor-pointer"
                  >
                    Hard · 1d
                  </button>
                  <button
                    onClick={() => handleSM2Rate(currentWorkoutCard, 4)}
                    className="py-2.5 px-3 rounded-xl bg-blue-950 hover:bg-blue-900 border border-blue-800 text-blue-200 text-xs font-bold transition cursor-pointer"
                  >
                    Good · 3d
                  </button>
                  <button
                    onClick={() => handleSM2Rate(currentWorkoutCard, 5)}
                    className="py-2.5 px-3 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-200 text-xs font-bold transition cursor-pointer"
                  >
                    Easy · Graduate
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {hasRenderError && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Recovered from corrupted entries. Your valid mistakes are preserved safely.</span>
          </div>
          <button
            onClick={loadData}
            className="px-3 py-1 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 cursor-pointer"
          >
            Refresh
          </button>
        </div>
      )}

      {/* Interactive Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto scrollbar-none">
        {[
          { id: 'unresolved', label: `All Unresolved (${unresolvedCount})`, icon: AlertTriangle },
          { id: 'sm2_due', label: `Due Now (${dueMistakes.length})`, icon: Clock },
          { id: 'listening', label: `Listening (${listeningTrapsCount})`, icon: Zap },
          { id: 'reading', label: `Reading (${readingTrapsCount})`, icon: BookOpen },
          { id: 'writing_speaking', label: `Writing & Speaking (${writingSpeakingCount})`, icon: PenTool },
          { id: 'mastered', label: `Mastered (${masteredCount})`, icon: CheckCircle2 }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = tabFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                soundManager.playBeep(520, 0.03);
                setTabFilter(tab.id as VaultTabFilter);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mistakes Grid */}
      {filteredMistakes.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 space-y-4">
          <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto" />
          <div className="space-y-1">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base">
              {tabFilter === 'mastered' ? 'No Mastered Items Yet' : 'No Mistakes in This View'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              {tabFilter === 'mastered'
                ? 'Complete targeted SM-2 reviews or 1-question re-drills to graduate items to Mastered.'
                : 'Any incorrect questions from Listening, Reading, Writing, or Speaking automatically sync here.'}
            </p>
          </div>
          {mistakes.length === 0 && (
            <button
              onClick={handleSeedSamples}
              className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 text-white text-xs font-bold transition inline-flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Tutorial / Walkthrough Mode: Preview 4 Sample Traps</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredMistakes.map((item, idx) => {
            if (!item) return null;
            const itemId = item.id || `m_idx_${idx}`;
            const isMastered = Boolean(item.mastered);
            const lang = langPreference[itemId] || 'en';

            return (
              <div
                key={itemId}
                className={`p-5 rounded-3xl border transition-all duration-200 flex flex-col justify-between space-y-4 ${
                  isMastered
                    ? 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-75'
                    : 'bg-white dark:bg-[#0B1224] border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-700'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Unboxed Metadata Strip */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <strong className="text-blue-600 dark:text-blue-400 uppercase">
                        {item.module || 'EXAM'}
                      </strong>
                      {item.questionType && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{item.questionType}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span className="text-amber-600 dark:text-amber-400 font-bold">
                        {formatNextReview(item)}
                      </span>
                    </div>

                    <span className="shrink-0">{formatDate(item.timestamp)}</span>
                  </div>

                  {/* Title / Question Prompt */}
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-snug">
                      {item.title}
                    </h4>
                    {item.prompt && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-serif italic mt-1 leading-relaxed">
                        &ldquo;{item.prompt}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Candidate Input (Red) vs Official Target (Green) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300">
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase block font-sans">
                        Your Past Error:
                      </span>
                      <span className="font-bold text-xs line-through block truncate mt-0.5">
                        {item.userWrongAnswer || item.userAnswer || '—'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase block font-sans">
                          Correct Target:
                        </span>
                        <button
                          onClick={() => speakBritish(item.correctAnswer)}
                          className="text-emerald-700 dark:text-emerald-300 hover:underline text-[10px] font-sans font-bold flex items-center gap-0.5 cursor-pointer"
                          title="Listen in British RP"
                        >
                          <Volume2 className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="font-bold text-xs block truncate mt-0.5">
                        {item.correctAnswer || 'Required form'}
                      </span>
                    </div>
                  </div>

                  {/* Bilingual Trap Explanation Toggle */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {lang === 'bn' ? '🇧🇩 বাংলা ট্র্যাপ ব্যাখ্যা' : '🇬🇧 English Trap Explanation'}
                      </span>
                      <button
                        onClick={() => toggleLang(itemId)}
                        className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Globe className="w-3 h-3" />
                        <span>{lang === 'bn' ? 'Switch to 🇬🇧' : 'Switch to 🇧🇩'}</span>
                      </button>
                    </div>

                    <p
                      className={`leading-relaxed ${
                        lang === 'bn'
                          ? 'text-emerald-700 dark:text-emerald-300 font-sans text-xs'
                          : 'text-slate-700 dark:text-slate-300 font-serif'
                      }`}
                    >
                      {lang === 'bn'
                        ? item.trapExplanationBn ||
                          item.explanation ||
                          'এই উত্তরটি সঠিক নিয়মানুযায়ী যাচাই করা হয়েছে।'
                        : item.trapExplanationEn || item.explanation}
                    </p>
                  </div>
                </div>

                {/* Card Actions Footer with Quick SM-2 Intervals */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggle(itemId)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        isMastered
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {isMastered ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : null}
                      <span>{isMastered ? 'Mastered' : 'Mark Mastered'}</span>
                    </button>

                    {!isMastered && (
                      <button
                        onClick={() => handleSM2Rate(item, 4)}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                        title="Schedule next SM-2 review"
                      >
                        SM-2 +3d
                      </button>
                    )}
                  </div>

                  {!isMastered && (
                    <button
                      onClick={() => handleStartDrill(item)}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-slate-950 fill-current" />
                      <span>Re-drill Question</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive 1-Question Re-drill Challenge Modal */}
      {activeDrillItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white">1-Question Re-drill Arena</h3>
              </div>
              <button
                onClick={() => setActiveDrillItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-300">
                {activeDrillItem.module.toUpperCase()} DRILL · SM-2 VERIFICATION
              </span>

              <h4 className="text-sm font-bold text-slate-100">{activeDrillItem.title}</h4>
              {activeDrillItem.prompt && (
                <p className="text-xs text-amber-200 font-serif italic bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                  &ldquo;{activeDrillItem.prompt}&rdquo;
                </p>
              )}

              <p className="text-xs text-slate-300 leading-relaxed font-serif">
                {activeDrillItem.explanation}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <label className="text-xs font-bold text-slate-300 block">
                Type the official correct target answer:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={drillInput}
                  onChange={(e) => setDrillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleVerifyDrill();
                  }}
                  placeholder="Type correct answer..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono"
                  autoFocus
                />
                <button
                  onClick={handleVerifyDrill}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer"
                >
                  Verify &amp; Master
                </button>
              </div>

              {drillFeedback === 'correct' && (
                <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-700 text-emerald-200 text-xs flex items-center justify-between animate-fade-in">
                  <span className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Correct! SM-2 graduated &amp; marked as mastered!
                  </span>
                </div>
              )}

              {drillFeedback === 'incorrect' && (
                <div className="p-3 rounded-xl bg-rose-950 border border-rose-700 text-rose-200 text-xs flex items-center justify-between animate-fade-in">
                  <span>
                    ✗ Not quite. Target answer is: <strong>{activeDrillItem.correctAnswer}</strong>
                  </span>
                  <button
                    onClick={() => setDrillInput(activeDrillItem.correctAnswer)}
                    className="text-[10px] text-amber-300 underline font-mono cursor-pointer"
                  >
                    Auto-fill
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

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
    <div className="bg-white dark:bg-[#0B1224] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
      {content}
    </div>
  );
};

