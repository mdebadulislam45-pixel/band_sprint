import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Flame,
  Keyboard,
  LayoutGrid,
  Lightbulb,
  List,
  Maximize2,
  MessageSquareQuote,
  Minimize2,
  Pause,
  PenTool,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Volume2,
  VolumeX
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { SprintQuotaTier } from '../../data/dailyBanglaSprintData';
import {
  DailyMasteryExamModal,
  DailyMasteryExamSummary,
  loadTodayMasteryExamSummary
} from './DailyMasteryExamModal';
import { audioManager } from '../../services/AudioManager';
import { triggerBarnabyCelebration } from '../../utils/barnabyStateEngine';
import { PomodoroStarConfettiOverlay } from './PomodoroStarConfettiOverlay';
import {
  DailySprintProgressState,
  DAILY_SPRINT_SYNCED_EVENT,
  getTodayDateKey,
  loadDailySprintProgress,
  saveDailySprintProgress
} from '../../utils/dailySprintProgressStore';
import {
  countOfflineAudioPackClips,
  precacheDailyAudioPack,
  speakBanglaCue,
  speakEnglishTerm
} from '../../utils/banglaSpeech';
import {
  computeSmartSprintBrief,
  DailySprintRotatedPools,
  getRotatedDailySprintPools,
  SmartSprintBrief
} from '../../utils/smartSprintEngine';
import { UserProfile } from '../../types';

export type DailySprintTabId = 'vocabulary' | 'idioms' | 'phrases' | 'spelling' | 'grammar';

interface PomodoroPreset {
  id: '25_5' | '15_5' | '50_10';
  label: string;
  focusMinutes: number;
  breakMinutes: number;
}

const POMODORO_PRESETS: PomodoroPreset[] = [
  { id: '15_5', label: '15 / 5 min', focusMinutes: 15, breakMinutes: 5 },
  { id: '25_5', label: '25 / 5 min', focusMinutes: 25, breakMinutes: 5 },
  { id: '50_10', label: '50 / 10 min', focusMinutes: 50, breakMinutes: 10 }
];

export interface PomodoroDailySprintHubProps {
  user?: UserProfile | null;
  onShowToast?: (msg: string) => void;
  onNavigate?: (path: string) => void;
  compactHeader?: boolean;
  pools?: DailySprintRotatedPools;
  smartBrief?: SmartSprintBrief;
  cycleOffset?: number;
  onCycleOffsetChange?: (offset: number) => void;
  initialTab?: DailySprintTabId;
}

export const PomodoroDailySprintHub: React.FC<PomodoroDailySprintHubProps> = ({
  user,
  onShowToast,
  pools: propPools,
  smartBrief: propSmartBrief,
  cycleOffset: propCycleOffset,
  onCycleOffsetChange,
  initialTab
}) => {
  const [sprintState, setSprintState] = useState<DailySprintProgressState>(() =>
    loadDailySprintProgress()
  );
  const [internalCycleOffset, setInternalCycleOffset] = useState<number>(0);
  const effectiveCycleOffset = propCycleOffset ?? internalCycleOffset;

  const smartBrief = useMemo(
    () => propSmartBrief ?? computeSmartSprintBrief(user, sprintState),
    [propSmartBrief, sprintState, user]
  );

  const pools = useMemo(
    () =>
      propPools ??
      getRotatedDailySprintPools(sprintState.quotaTier, getTodayDateKey(), effectiveCycleOffset),
    [effectiveCycleOffset, propPools, sprintState.quotaTier]
  );

  const [activeTab, setActiveTab] = useState<DailySprintTabId>(
    () => initialTab ?? smartBrief.recommendedTab ?? 'vocabulary'
  );
  const [viewMode, setViewMode] = useState<'flashcard' | 'list'>('flashcard');
  const [cardIndexByTab, setCardIndexByTab] = useState<Record<DailySprintTabId, number>>({
    vocabulary: 0,
    idioms: 0,
    phrases: 0,
    spelling: 0,
    grammar: 0
  });
  const [revealedFlashcardIds, setRevealedFlashcardIds] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pendingOnly, setPendingOnly] = useState<boolean>(false);

  // Pomodoro Timer State
  const [selectedPresetId, setSelectedPresetId] = useState<PomodoroPreset['id']>(
    () => smartBrief.recommendedPreset || '25_5'
  );
  const activePreset =
    POMODORO_PRESETS.find((p) => p.id === selectedPresetId) || POMODORO_PRESETS[1];
  const [pomodoroPhase, setPomodoroPhase] = useState<'focus' | 'break'>('focus');
  const [secondsLeft, setSecondsLeft] = useState<number>(activePreset.focusMinutes * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isFullscreenFocus, setIsFullscreenFocus] = useState<boolean>(false);
  const [uiSoundEnabled, setUiSoundEnabled] = useState<boolean>(() =>
    audioManager.isUiSoundEnabled()
  );

  // Spelling Quick-Check / Type-the-Word Drill State
  const [spellingDrillIdx, setSpellingDrillIdx] = useState<number>(0);
  const [spellingInput, setSpellingInput] = useState<string>('');
  const [spellingFeedback, setSpellingFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [hideSpellingTargetWord, setHideSpellingTargetWord] = useState<boolean>(false);

  // Grammar Quick-Check State (ruleId -> selected option index)
  const [grammarAnswers, setGrammarAnswers] = useState<Record<string, number>>({});

  // Daily Mastery Exam Modal State
  const [isMasteryExamOpen, setIsMasteryExamOpen] = useState<boolean>(false);
  const [confettiBurstCount, setConfettiBurstCount] = useState<number>(0);
  const [examSummary, setExamSummary] = useState<DailyMasteryExamSummary | null>(() =>
    loadTodayMasteryExamSummary()
  );

  // Offline Audio Commute Pack State
  const [audioPackStatus, setAudioPackStatus] = useState<'idle' | 'caching' | 'ready'>('idle');
  const [audioPackProgress, setAudioPackProgress] = useState<{ done: number; total: number }>({
    done: 0,
    total: 0
  });
  const [offlineClipsCount, setOfflineClipsCount] = useState<number>(0);

  useEffect(() => {
    void countOfflineAudioPackClips().then((cnt) => {
      if (cnt > 0) setOfflineClipsCount(cnt);
    });
  }, []);

  const updateSprintState = useCallback(
    (updater: (prev: DailySprintProgressState) => DailySprintProgressState) => {
      setSprintState((prev) => {
        const next = updater(prev);
        return saveDailySprintProgress(next);
      });
    },
    []
  );

  useEffect(() => {
    const syncFromStore = () => {
      setSprintState(loadDailySprintProgress());
      setExamSummary(loadTodayMasteryExamSummary());
    };
    window.addEventListener(DAILY_SPRINT_SYNCED_EVENT, syncFromStore);
    window.addEventListener('bandsprint_cloud_sync_updated', syncFromStore);
    return () => {
      window.removeEventListener(DAILY_SPRINT_SYNCED_EVENT, syncFromStore);
      window.removeEventListener('bandsprint_cloud_sync_updated', syncFromStore);
    };
  }, []);

  const exitFullscreenFocus = useCallback(() => {
    setIsFullscreenFocus(false);
    try {
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } catch {}
  }, []);

  const enterFullscreenFocus = useCallback(() => {
    setIsFullscreenFocus(true);
    try {
      if (typeof document !== 'undefined' && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {}
  }, []);

  const toggleFullscreenFocus = useCallback(() => {
    audioManager.playUiClick('toggle');
    if (isFullscreenFocus) {
      exitFullscreenFocus();
    } else {
      enterFullscreenFocus();
    }
  }, [enterFullscreenFocus, exitFullscreenFocus, isFullscreenFocus]);

  useEffect(() => {
    if (!isFullscreenFocus) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        audioManager.playUiClick('soft');
        exitFullscreenFocus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [exitFullscreenFocus, isFullscreenFocus]);

  const activeVocabList = pools.vocabulary;
  const activeIdiomList = pools.idioms;
  const activePhraseList = pools.phrases;
  const activeSpellingList = pools.spelling;
  const activeGrammarList = pools.grammar;

  const qLower = searchQuery.trim().toLowerCase();

  const filteredVocabList = useMemo(
    () =>
      activeVocabList.filter((item) => {
        if (pendingOnly && sprintState.masteredVocabIds.includes(item.id)) return false;
        if (!qLower) return true;
        return (
          item.word.toLowerCase().includes(qLower) ||
          item.banglaMeaning.toLowerCase().includes(qLower) ||
          item.englishDefinition.toLowerCase().includes(qLower)
        );
      }),
    [activeVocabList, pendingOnly, qLower, sprintState.masteredVocabIds]
  );

  const filteredIdiomList = useMemo(
    () =>
      activeIdiomList.filter((item) => {
        if (pendingOnly && sprintState.masteredIdiomIds.includes(item.id)) return false;
        if (!qLower) return true;
        return (
          item.idiom.toLowerCase().includes(qLower) ||
          item.banglaMeaning.toLowerCase().includes(qLower) ||
          item.naturalMeaning.toLowerCase().includes(qLower)
        );
      }),
    [activeIdiomList, pendingOnly, qLower, sprintState.masteredIdiomIds]
  );

  const filteredPhraseList = useMemo(
    () =>
      activePhraseList.filter((item) => {
        if (pendingOnly && sprintState.masteredPhraseIds.includes(item.id)) return false;
        if (!qLower) return true;
        return (
          item.phrase.toLowerCase().includes(qLower) ||
          item.banglaMeaning.toLowerCase().includes(qLower) ||
          item.category.toLowerCase().includes(qLower)
        );
      }),
    [activePhraseList, pendingOnly, qLower, sprintState.masteredPhraseIds]
  );

  const filteredSpellingList = useMemo(
    () =>
      activeSpellingList.filter((item) => {
        if (pendingOnly && sprintState.masteredSpellingIds.includes(item.id)) return false;
        if (!qLower) return true;
        return (
          item.word.toLowerCase().includes(qLower) ||
          item.banglaMeaning.toLowerCase().includes(qLower) ||
          item.trapNote.toLowerCase().includes(qLower)
        );
      }),
    [activeSpellingList, pendingOnly, qLower, sprintState.masteredSpellingIds]
  );

  const filteredGrammarList = useMemo(
    () =>
      activeGrammarList.filter((rule) => {
        if (pendingOnly && sprintState.masteredGrammarIds.includes(rule.id)) return false;
        if (!qLower) return true;
        return (
          rule.title.toLowerCase().includes(qLower) ||
          rule.banglaExplanation.toLowerCase().includes(qLower) ||
          rule.englishExplanation.toLowerCase().includes(qLower)
        );
      }),
    [activeGrammarList, pendingOnly, qLower, sprintState.masteredGrammarIds]
  );

  const vocabDoneCount = useMemo(
    () => activeVocabList.filter((item) => sprintState.masteredVocabIds.includes(item.id)).length,
    [activeVocabList, sprintState.masteredVocabIds]
  );
  const idiomDoneCount = useMemo(
    () => activeIdiomList.filter((item) => sprintState.masteredIdiomIds.includes(item.id)).length,
    [activeIdiomList, sprintState.masteredIdiomIds]
  );
  const phraseDoneCount = useMemo(
    () =>
      activePhraseList.filter((item) => sprintState.masteredPhraseIds.includes(item.id)).length,
    [activePhraseList, sprintState.masteredPhraseIds]
  );
  const spellingDoneCount = useMemo(
    () =>
      activeSpellingList.filter((item) => sprintState.masteredSpellingIds.includes(item.id)).length,
    [activeSpellingList, sprintState.masteredSpellingIds]
  );
  const grammarDoneCount = useMemo(
    () =>
      activeGrammarList.filter((item) => sprintState.masteredGrammarIds.includes(item.id)).length,
    [activeGrammarList, sprintState.masteredGrammarIds]
  );

  const totalTargetsCount =
    activeVocabList.length +
    activeIdiomList.length +
    activePhraseList.length +
    activeSpellingList.length +
    activeGrammarList.length;

  const totalDoneCount =
    vocabDoneCount + idiomDoneCount + phraseDoneCount + spellingDoneCount + grammarDoneCount;

  const overallSprintPct =
    totalTargetsCount > 0 ? Math.round((totalDoneCount / totalTargetsCount) * 100) : 0;

  const completedCategoriesCount = [
    vocabDoneCount >= activeVocabList.length,
    idiomDoneCount >= activeIdiomList.length,
    phraseDoneCount >= activePhraseList.length,
    spellingDoneCount >= activeSpellingList.length,
    grammarDoneCount >= activeGrammarList.length
  ].filter(Boolean).length;

  const isMasteryExamHighlighted =
    sprintState.pomodoroBlocksCompleted >= 1 ||
    completedCategoriesCount >= 1 ||
    overallSprintPct >= 25;

  const handlePomodoroBlockFinished = useCallback(() => {
    audioManager.playPomodoroComplete();
    setConfettiBurstCount((c) => c + 1);
    if (pomodoroPhase === 'focus') {
      const focusMins = activePreset.focusMinutes;
      updateSprintState((prev) => ({
        ...prev,
        pomodoroBlocksCompleted: prev.pomodoroBlocksCompleted + 1,
        pomodoroFocusMinutesLogged: prev.pomodoroFocusMinutesLogged + focusMins
      }));
      try {
        triggerBarnabyCelebration('pomodoro_sprint');
        window.dispatchEvent(
          new CustomEvent('bandsprint_pomodoro_completed', {
            detail: { minutes: focusMins }
          })
        );
      } catch {}
      onShowToast?.(
        `Pomodoro Focus Block (${focusMins}m) complete! Time for a ${activePreset.breakMinutes}m breather or the Daily Mastery Exam.`
      );
      setPomodoroPhase('break');
      setSecondsLeft(activePreset.breakMinutes * 60);
      setIsRunning(false);
    } else {
      try {
        triggerBarnabyCelebration('pomodoro_sprint');
      } catch {}
      onShowToast?.('Break finished! Ready for your next IELTS Focus Sprint.');
      setPomodoroPhase('focus');
      setSecondsLeft(activePreset.focusMinutes * 60);
      setIsRunning(false);
    }
  }, [activePreset, onShowToast, pomodoroPhase, updateSprintState]);

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          setTimeout(() => handlePomodoroBlockFinished(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRunning, handlePomodoroBlockFinished]);

  const handleToggleStartPause = () => {
    setIsRunning((prevRunning) => {
      const nextRunning = !prevRunning;
      if (nextRunning) {
        audioManager.playPomodoroStart();
        if (selectedPresetId === '25_5' && !isFullscreenFocus) {
          enterFullscreenFocus();
        }
      } else {
        audioManager.playPomodoroPause();
      }
      return nextRunning;
    });
  };

  const handleToggleUiSounds = () => {
    const next = !uiSoundEnabled;
    audioManager.setUiSoundEnabled(next);
    setUiSoundEnabled(next);
    if (next) {
      audioManager.playUiClick('toggle');
    }
  };

  const handleSelectPreset = (preset: PomodoroPreset) => {
    audioManager.playUiClick('toggle');
    setSelectedPresetId(preset.id);
    setIsRunning(false);
    setPomodoroPhase('focus');
    setSecondsLeft(preset.focusMinutes * 60);
  };

  const handleResetTimer = () => {
    audioManager.playPomodoroReset();
    setIsRunning(false);
    setSecondsLeft(
      (pomodoroPhase === 'focus' ? activePreset.focusMinutes : activePreset.breakMinutes) * 60
    );
  };

  const handleSwitchPhase = (nextPhase: 'focus' | 'break') => {
    audioManager.playUiClick('toggle');
    setIsRunning(false);
    setPomodoroPhase(nextPhase);
    setSecondsLeft(
      (nextPhase === 'focus' ? activePreset.focusMinutes : activePreset.breakMinutes) * 60
    );
  };

  const handleQuotaChange = (tier: SprintQuotaTier) => {
    audioManager.playUiClick('toggle');
    updateSprintState((prev) => ({ ...prev, quotaTier: tier }));
    setSpellingDrillIdx(0);
    setCardIndexByTab({ vocabulary: 0, idioms: 0, phrases: 0, spelling: 0, grammar: 0 });
  };

  const handleNextCycle = () => {
    audioManager.playUiClick('toggle');
    const next = (effectiveCycleOffset + 1) % 7;
    if (onCycleOffsetChange) {
      onCycleOffsetChange(next);
    } else {
      setInternalCycleOffset(next);
    }
    setCardIndexByTab({ vocabulary: 0, idioms: 0, phrases: 0, spelling: 0, grammar: 0 });
    setSpellingDrillIdx(0);
    onShowToast?.(
      next === 0 ? 'Returned to today’s primary daily set.' : `Loaded Bonus Set #${next + 1}.`
    );
  };

  const toggleItemMastered = (
    field:
      | 'masteredVocabIds'
      | 'masteredIdiomIds'
      | 'masteredPhraseIds'
      | 'masteredSpellingIds'
      | 'masteredGrammarIds',
    id: string
  ) => {
    audioManager.playUiClick('check');
    updateSprintState((prev) => {
      const exists = prev[field].includes(id);
      const nextList = exists ? prev[field].filter((x) => x !== id) : [...prev[field], id];
      return { ...prev, [field]: nextList };
    });
  };

  const markCategoryAllDone = (tab: DailySprintTabId) => {
    audioManager.playPomodoroComplete();
    updateSprintState((prev) => {
      if (tab === 'vocabulary') {
        return {
          ...prev,
          masteredVocabIds: Array.from(
            new Set([...prev.masteredVocabIds, ...activeVocabList.map((v) => v.id)])
          )
        };
      }
      if (tab === 'idioms') {
        return {
          ...prev,
          masteredIdiomIds: Array.from(
            new Set([...prev.masteredIdiomIds, ...activeIdiomList.map((i) => i.id)])
          )
        };
      }
      if (tab === 'phrases') {
        return {
          ...prev,
          masteredPhraseIds: Array.from(
            new Set([...prev.masteredPhraseIds, ...activePhraseList.map((p) => p.id)])
          )
        };
      }
      if (tab === 'spelling') {
        return {
          ...prev,
          masteredSpellingIds: Array.from(
            new Set([...prev.masteredSpellingIds, ...activeSpellingList.map((s) => s.id)])
          )
        };
      }
      return {
        ...prev,
        masteredGrammarIds: Array.from(
          new Set([...prev.masteredGrammarIds, ...activeGrammarList.map((g) => g.id)])
        )
      };
    });
    onShowToast?.(`Marked today's ${tab} targets complete!`);
  };

  const currentDrillSpellingItem =
    activeSpellingList[spellingDrillIdx % Math.max(1, activeSpellingList.length)] ||
    activeSpellingList[0];

  const handleVerifySpellingDrill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDrillSpellingItem) return;
    const cleaned = spellingInput.trim().toLowerCase();
    const expected = currentDrillSpellingItem.word.toLowerCase();
    if (cleaned === expected) {
      audioManager.playPomodoroStart();
      setSpellingFeedback('correct');
      if (!sprintState.masteredSpellingIds.includes(currentDrillSpellingItem.id)) {
        toggleItemMastered('masteredSpellingIds', currentDrillSpellingItem.id);
      }
      window.dispatchEvent(new CustomEvent('bandsprint_spelling_progress_saved'));
    } else {
      audioManager.playPomodoroPause();
      setSpellingFeedback('wrong');
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const totalPhaseSecs =
    (pomodoroPhase === 'focus' ? activePreset.focusMinutes : activePreset.breakMinutes) * 60;
  const timerProgressPct =
    totalPhaseSecs > 0
      ? Math.min(100, Math.max(0, Math.round(((totalPhaseSecs - secondsLeft) / totalPhaseSecs) * 100)))
      : 0;

  const tabs: Array<{
    id: DailySprintTabId;
    label: string;
    banglaSub: string;
    done: number;
    total: number;
    icon: React.FC<{ className?: string }>;
  }> = [
    {
      id: 'vocabulary',
      label: 'Vocabulary',
      banglaSub: 'ভোকাবুলারি',
      done: vocabDoneCount,
      total: activeVocabList.length,
      icon: BookOpen
    },
    {
      id: 'idioms',
      label: 'Idioms',
      banglaSub: 'ইডিয়ম',
      done: idiomDoneCount,
      total: activeIdiomList.length,
      icon: Lightbulb
    },
    {
      id: 'phrases',
      label: 'Phrases',
      banglaSub: 'কলোকেশন',
      done: phraseDoneCount,
      total: activePhraseList.length,
      icon: MessageSquareQuote
    },
    {
      id: 'spelling',
      label: 'Spelling',
      banglaSub: 'বানান ড্রিল',
      done: spellingDoneCount,
      total: activeSpellingList.length,
      icon: Keyboard
    },
    {
      id: 'grammar',
      label: 'Grammar',
      banglaSub: 'গ্রামার',
      done: grammarDoneCount,
      total: activeGrammarList.length,
      icon: PenTool
    }
  ];

  const stepCard = useCallback(
    (tab: DailySprintTabId, delta: number, maxLen: number) => {
      if (maxLen <= 0) return;
      audioManager.playUiClick('soft');
      setCardIndexByTab((prev) => ({
        ...prev,
        [tab]: (prev[tab] + delta + maxLen) % maxLen
      }));
    },
    []
  );

  const handleSaveOfflineAudioPack = async () => {
    if (audioPackStatus === 'caching') return;
    audioManager.playUiClick('soft');
    setAudioPackStatus('caching');
    const itemsToCache = [
      ...pools.vocabulary.slice(0, 12).map((v) => ({
        english: v.word,
        bangla: `${v.banglaMeaning}। ${v.banglaTip}`
      })),
      ...pools.idioms.slice(0, 6).map((i) => ({
        english: i.idiom,
        bangla: i.banglaMeaning
      })),
      ...pools.phrases.slice(0, 6).map((p) => ({
        english: p.phrase,
        bangla: p.banglaMeaning
      })),
      ...pools.spelling.slice(0, 10).map((s) => ({
        english: s.word
      }))
    ];
    const result = await precacheDailyAudioPack(itemsToCache, (done, total) => {
      setAudioPackProgress({ done, total });
    });
    const totalStored = await countOfflineAudioPackClips();
    setOfflineClipsCount(totalStored);
    setAudioPackStatus(result.cached > 0 ? 'ready' : 'idle');
    onShowToast?.(
      result.cached > 0
        ? `Offline Audio Commute Pack ready (${result.cached} clips saved for data-free playback).`
        : 'Offline Audio Pack could not download clips right now — browser Web Speech remains ready offline.'
    );
  };

  // Focus Card Fast Keyboard Shortcuts (Space: flip/reveal, ArrowLeft/Right: step, M: master & advance)
  useEffect(() => {
    if (viewMode !== 'flashcard' || isFullscreenFocus || isMasteryExamOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (activeTab === 'vocabulary' && filteredVocabList.length > 0) {
        const idx = Math.min(cardIndexByTab.vocabulary, filteredVocabList.length - 1);
        const item = filteredVocabList[idx];
        if (e.code === 'Space') {
          e.preventDefault();
          audioManager.playUiClick('soft');
          setRevealedFlashcardIds((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          stepCard('vocabulary', -1, filteredVocabList.length);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          stepCard('vocabulary', 1, filteredVocabList.length);
        } else if (e.key.toLowerCase() === 'm') {
          e.preventDefault();
          if (!sprintState.masteredVocabIds.includes(item.id)) {
            toggleItemMastered('masteredVocabIds', item.id);
          }
          stepCard('vocabulary', 1, filteredVocabList.length);
        }
      } else if (activeTab === 'idioms' && filteredIdiomList.length > 0) {
        const idx = Math.min(cardIndexByTab.idioms, filteredIdiomList.length - 1);
        const item = filteredIdiomList[idx];
        if (e.code === 'Space') {
          e.preventDefault();
          speakEnglishTerm(item.idiom);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          stepCard('idioms', -1, filteredIdiomList.length);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          stepCard('idioms', 1, filteredIdiomList.length);
        } else if (e.key.toLowerCase() === 'm') {
          e.preventDefault();
          if (!sprintState.masteredIdiomIds.includes(item.id)) {
            toggleItemMastered('masteredIdiomIds', item.id);
          }
          stepCard('idioms', 1, filteredIdiomList.length);
        }
      } else if (activeTab === 'phrases' && filteredPhraseList.length > 0) {
        const idx = Math.min(cardIndexByTab.phrases, filteredPhraseList.length - 1);
        const item = filteredPhraseList[idx];
        if (e.code === 'Space') {
          e.preventDefault();
          speakEnglishTerm(item.phrase);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          stepCard('phrases', -1, filteredPhraseList.length);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          stepCard('phrases', 1, filteredPhraseList.length);
        } else if (e.key.toLowerCase() === 'm') {
          e.preventDefault();
          if (!sprintState.masteredPhraseIds.includes(item.id)) {
            toggleItemMastered('masteredPhraseIds', item.id);
          }
          stepCard('phrases', 1, filteredPhraseList.length);
        }
      } else if (activeTab === 'grammar' && filteredGrammarList.length > 0) {
        const idx = Math.min(cardIndexByTab.grammar, filteredGrammarList.length - 1);
        const rule = filteredGrammarList[idx];
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          stepCard('grammar', -1, filteredGrammarList.length);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          stepCard('grammar', 1, filteredGrammarList.length);
        } else if (e.key.toLowerCase() === 'm') {
          e.preventDefault();
          if (!sprintState.masteredGrammarIds.includes(rule.id)) {
            toggleItemMastered('masteredGrammarIds', rule.id);
          }
          stepCard('grammar', 1, filteredGrammarList.length);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeTab,
    cardIndexByTab,
    filteredGrammarList,
    filteredIdiomList,
    filteredPhraseList,
    filteredVocabList,
    isFullscreenFocus,
    isMasteryExamOpen,
    sprintState.masteredGrammarIds,
    sprintState.masteredIdiomIds,
    sprintState.masteredPhraseIds,
    sprintState.masteredVocabIds,
    stepCard,
    viewMode
  ]);

  const quotaTier = sprintState.quotaTier;

  return (
    <section
      data-testid="pomodoro-daily-sprint-hub"
      className="rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/35 p-5 sm:p-6 space-y-6"
    >
      {/* =====================================================================
          1. CLEAN STUDIO HEADER & QUOTA SELECTOR
      ===================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#EEF3F1] dark:border-[#1F8A70]/25">
        <div className="space-y-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#0F4C45] dark:text-[#6EE7B7] font-semibold flex flex-wrap items-center gap-2">
            <span>{pools.cycleLabel}</span>
            <span aria-hidden="true">·</span>
            <span>Bangladeshi Learner Edition</span>
          </div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
            Timed Focus &amp; 5 Daily IELTS Targets
          </h2>
          <p className="text-xs text-[#566664] dark:text-slate-400">
            {smartBrief.recommendedTabReason}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            data-testid="save-offline-audio-pack-btn"
            onClick={handleSaveOfflineAudioPack}
            disabled={audioPackStatus === 'caching'}
            className={`min-h-[38px] px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition ${
              audioPackStatus === 'ready' || offlineClipsCount > 0
                ? 'bg-[#EEF3F1] dark:bg-[#0F4C45]/35 border-[#1F8A70]/45 text-[#0F4C45] dark:text-[#6EE7B7]'
                : 'bg-[#F7F9F8] dark:bg-[#0B1514] hover:bg-[#EEF3F1] border-[#D3DDDA] dark:border-[#1F8A70]/30 text-[#0F4C45] dark:text-[#6EE7B7]'
            }`}
            title="Cache today's British RP and Bangla coaching audio clips for offline commute study"
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {audioPackStatus === 'caching'
                ? `Caching ${audioPackProgress.done}/${audioPackProgress.total}...`
                : offlineClipsCount > 0
                ? `Offline Audio (${offlineClipsCount})`
                : 'Save Audio Offline'}
            </span>
          </button>

          <button
            type="button"
            data-testid="sprint-next-rotation-btn"
            onClick={handleNextCycle}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] hover:bg-[#EEF3F1] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-xs font-semibold text-[#0F4C45] dark:text-[#6EE7B7] inline-flex items-center gap-1.5 cursor-pointer transition"
            title="Switch to next curated word/idiom set"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Fresh Set</span>
          </button>

          <div
            role="group"
            aria-label="Daily Sprint Quota Selector"
            className="inline-flex p-1 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30"
          >
            <button
              type="button"
              data-testid="quota-standard-btn"
              onClick={() => handleQuotaChange('standard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                quotaTier === 'standard'
                  ? 'bg-[#0F4C45] text-white'
                  : 'text-[#566664] dark:text-slate-400 hover:text-[#0E1F1E]'
              }`}
            >
              Standard (20/10/10/40)
            </button>
            <button
              type="button"
              data-testid="quota-light-btn"
              onClick={() => handleQuotaChange('light')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                quotaTier === 'light'
                  ? 'bg-[#0F4C45] text-white'
                  : 'text-[#566664] dark:text-slate-400 hover:text-[#0E1F1E]'
              }`}
            >
              Light (10/5/5/20)
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. INTERACTIVE POMODORO TIMER + POST-SPRINT MASTERY EXAM LAUNCHER
      ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div
          data-testid="bandsprint-pomodoro-timer"
          className="lg:col-span-7 p-4 sm:p-5 rounded-2xl bg-[#0F4C45] text-white border border-[#1F8A70]/40 flex flex-col justify-between gap-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 flex-wrap text-xs">
              <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#EEF3F1]">
                <Clock className="w-4 h-4 text-[#F4A62A]" />
                <span>Pomodoro Timer</span>
              </span>
              <span className="text-[#EEF3F1]/60" aria-hidden="true">·</span>
              <span className="font-mono text-[#FDE68A] tabular-nums">
                {sprintState.pomodoroBlocksCompleted} blocks · {sprintState.pomodoroFocusMinutesLogged}m today
              </span>
              <button
                type="button"
                data-testid="pomodoro-sound-toggle-btn"
                onClick={handleToggleUiSounds}
                className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-[#EEF3F1] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition"
                aria-label={uiSoundEnabled ? 'Mute subtle UI sounds' : 'Enable subtle UI sounds'}
              >
                {uiSoundEnabled ? (
                  <Volume2 className="w-3 h-3 text-[#F4A62A]" />
                ) : (
                  <VolumeX className="w-3 h-3 text-white/60" />
                )}
                <span>{uiSoundEnabled ? 'SFX On' : 'SFX Off'}</span>
              </button>
            </div>

            <div className="flex items-center gap-1">
              {POMODORO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  data-testid={`pomodoro-preset-${preset.id}`}
                  onClick={() => handleSelectPreset(preset)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer ${
                    selectedPresetId === preset.id
                      ? 'bg-[#F4A62A] text-[#0E1F1E]'
                      : 'bg-white/10 hover:bg-white/20 text-[#EEF3F1]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSwitchPhase('focus')}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold cursor-pointer ${
                    pomodoroPhase === 'focus'
                      ? 'bg-[#1F8A70] text-white'
                      : 'bg-white/10 text-[#EEF3F1]/75'
                  }`}
                >
                  Focus ({activePreset.focusMinutes}m)
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchPhase('break')}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold cursor-pointer ${
                    pomodoroPhase === 'break'
                      ? 'bg-[#F4A62A] text-[#0E1F1E]'
                      : 'bg-white/10 text-[#EEF3F1]/75'
                  }`}
                >
                  Break ({activePreset.breakMinutes}m)
                </button>
              </div>
              <div
                data-testid="pomodoro-clock-display"
                className="font-mono text-3xl sm:text-4xl font-bold tracking-tight text-white tabular-nums"
              >
                {formatTimer(secondsLeft)}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                data-testid="pomodoro-start-pause-btn"
                onClick={handleToggleStartPause}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#F4A62A] hover:bg-[#d98f1d] text-[#0E1F1E] font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
              >
                {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isRunning ? 'Pause' : 'Start Timer'}</span>
              </button>

              <button
                type="button"
                data-testid="pomodoro-reset-btn"
                onClick={handleResetTimer}
                className="min-h-[44px] px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs flex items-center gap-1 cursor-pointer transition"
                title="Reset Timer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                data-testid="pomodoro-complete-block-btn"
                onClick={handlePomodoroBlockFinished}
                className="min-h-[44px] px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-[#FDE68A] font-semibold text-xs flex items-center gap-1 cursor-pointer transition"
                title="Log Pomodoro Block Now"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Complete</span>
              </button>

              <button
                type="button"
                data-testid="pomodoro-fullscreen-toggle-btn"
                aria-pressed={isFullscreenFocus}
                onClick={toggleFullscreenFocus}
                className="min-h-[44px] px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition"
                title={isFullscreenFocus ? 'Exit Full-Screen Focus View' : 'Enter Full-Screen Focus View'}
              >
                {isFullscreenFocus ? (
                  <Minimize2 className="w-3.5 h-3.5 text-[#F4A62A]" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5 text-[#F4A62A]" />
                )}
                <span>{isFullscreenFocus ? 'Exit Full' : 'Full Screen'}</span>
              </button>
            </div>
          </div>

          <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#F4A62A] transition-all duration-300"
              style={{ width: `${timerProgressPct}%` }}
            />
          </div>
        </div>

        {/* Right 5 Columns: Adaptive Post-Sprint Mastery Exam Card */}
        <div className="lg:col-span-5 p-4 sm:p-5 rounded-2xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/35 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F4C45] dark:text-[#6EE7B7] flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-[#F4A62A]" />
                <span>Post-Sprint Mastery Exam</span>
              </span>
              <span className="text-xs font-mono font-bold text-[#0E1F1E] dark:text-[#EEF3F1] tabular-nums">
                {totalDoneCount}/{totalTargetsCount} ({overallSprintPct}%)
              </span>
            </div>

            <div className="w-full h-2 bg-[#D3DDDA] dark:bg-[#11201E] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0F4C45] dark:bg-[#1F8A70] transition-all duration-300"
                style={{ width: `${overallSprintPct}%` }}
              />
            </div>

            <p className="text-xs text-[#566664] dark:text-slate-400 leading-relaxed">
              {examSummary ? (
                <>
                  Today’s Mastery Exam:{' '}
                  <strong className="text-[#0F4C45] dark:text-[#6EE7B7]">
                    {examSummary.totalCorrect}/{examSummary.totalQuestions} ({examSummary.scorePct}%) · Band{' '}
                    {examSummary.estimatedBand.toFixed(1)}
                  </strong>
                  . Adapts with your SR review queue and rotated set.
                </>
              ) : isMasteryExamHighlighted ? (
                <span className="text-[#0F4C45] dark:text-[#6EE7B7] font-semibold">
                  Milestone unlocked! Exam mixes your due review items with today’s Vocabulary, Idioms, Spelling, and Grammar.
                </span>
              ) : (
                'Smart 16-question timed check adapting to your Spaced-Repetition queue and today’s targets.'
              )}
            </p>
          </div>

          <button
            type="button"
            data-testid="start-daily-mastery-exam-btn"
            onClick={() => {
              audioManager.playUiClick('soft');
              setIsMasteryExamOpen(true);
            }}
            className={`w-full min-h-[46px] px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer ${
              isMasteryExamHighlighted
                ? 'bg-[#F4A62A] hover:bg-[#d98f1d] text-[#0E1F1E]'
                : 'bg-[#0F4C45] hover:bg-[#0B3833] text-white'
            }`}
          >
            <Award className="w-4 h-4 shrink-0" />
            <span>
              {examSummary ? 'Retake Daily Mastery Exam' : 'Start Daily Mastery Exam'}
            </span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          3. CLEAN 5-TARGET NAVIGATION TABS + VIEW / FILTER BAR
      ===================================================================== */}
      <div className="space-y-3 border-b border-[#EEF3F1] dark:border-[#1F8A70]/25 pb-4">
        <div
          role="tablist"
          aria-label="5 Daily IELTS Targets"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isRecommended = smartBrief.recommendedTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                data-testid={`daily-sprint-tab-${tab.id}`}
                onClick={() => {
                  audioManager.playUiClick('tab');
                  setActiveTab(tab.id);
                }}
                className={`px-3 py-2.5 rounded-xl text-left transition flex items-center gap-2.5 cursor-pointer border min-h-[48px] ${
                  isActive
                    ? 'bg-[#0F4C45] text-white border-[#0F4C45]'
                    : 'bg-[#F7F9F8] dark:bg-[#0B1514] text-[#0E1F1E] dark:text-[#EEF3F1] border-[#D3DDDA] dark:border-[#1F8A70]/30 hover:border-[#0F4C45]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold flex items-center justify-between gap-1">
                    <span className="truncate">{tab.label}</span>
                    <span
                      className={`font-mono text-[11px] tabular-nums ${
                        isActive ? 'text-[#FDE68A]' : 'text-[#566664] dark:text-slate-400'
                      }`}
                    >
                      {tab.done}/{tab.total}
                    </span>
                  </div>
                  <div
                    className={`text-[10px] truncate ${
                      isActive ? 'text-[#EEF3F1]/80' : 'text-[#566664] dark:text-slate-400'
                    }`}
                  >
                    {tab.banglaSub}
                    {isRecommended ? ' · Priority' : ''}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Calm Control Bar: Search + Pending Filter + Flashcard/List Toggle + Mark All */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="flex items-center gap-2 flex-1 min-w-[210px]">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-[#566664] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Filter ${activeTab} (English or বাংলা)...`}
                aria-label={`Filter ${activeTab}`}
                className="w-full min-h-[38px] pl-8 pr-3 py-1.5 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-xs text-[#0E1F1E] dark:text-[#EEF3F1] focus:outline-none focus:ring-2 focus:ring-[#0F4C45]"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                audioManager.playUiClick('toggle');
                setPendingOnly((v) => !v);
              }}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer whitespace-nowrap ${
                pendingOnly
                  ? 'bg-[#0F4C45] text-white border-[#0F4C45]'
                  : 'bg-[#F7F9F8] dark:bg-[#0B1514] text-[#566664] dark:text-slate-300 border-[#D3DDDA] dark:border-[#1F8A70]/30'
              }`}
            >
              {pendingOnly ? 'Pending Only' : 'Show All'}
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {activeTab !== 'spelling' && (
              <div
                role="group"
                aria-label="Study View Mode"
                className="inline-flex p-0.5 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30"
              >
                <button
                  type="button"
                  data-testid="sprint-view-flashcard-btn"
                  onClick={() => {
                    audioManager.playUiClick('toggle');
                    setViewMode('flashcard');
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition ${
                    viewMode === 'flashcard'
                      ? 'bg-[#0F4C45] text-white'
                      : 'text-[#566664] dark:text-slate-300'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Focus Card</span>
                </button>
                <button
                  type="button"
                  data-testid="sprint-view-list-btn"
                  onClick={() => {
                    audioManager.playUiClick('toggle');
                    setViewMode('list');
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition ${
                    viewMode === 'list'
                      ? 'bg-[#0F4C45] text-white'
                      : 'text-[#566664] dark:text-slate-300'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Clean List</span>
                </button>
              </div>
            )}

            <button
              type="button"
              data-testid="mark-category-complete-btn"
              onClick={() => markCategoryAllDone(activeTab)}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] hover:bg-[#D3DDDA] text-[#0F4C45] dark:text-[#6EE7B7] text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark All Reviewed</span>
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          4. CLEAN STUDY WORKSPACE PANELS (Focus Card vs Clean List)
      ===================================================================== */}

      {/* TAB 1: DAILY VOCABULARY */}
      {activeTab === 'vocabulary' && (
        <div data-testid="sprint-panel-vocabulary">
          {filteredVocabList.length === 0 ? (
            <div className="p-6 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] text-center text-xs text-[#566664] dark:text-slate-400">
              No matching vocabulary items left under your current filter.
            </div>
          ) : viewMode === 'flashcard' ? (
            (() => {
              const idx = Math.min(cardIndexByTab.vocabulary, filteredVocabList.length - 1);
              const item = filteredVocabList[idx];
              const isDone = sprintState.masteredVocabIds.includes(item.id);
              const isRevealed = Boolean(revealedFlashcardIds[item.id]);
              return (
                <div className="p-5 sm:p-6 rounded-2xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 space-y-5">
                  <div className="flex items-center justify-between gap-3 text-xs text-[#566664] dark:text-slate-400">
                    <span className="font-mono font-semibold tabular-nums">
                      Card {idx + 1} of {filteredVocabList.length} · {item.pos} · {item.bandLevel}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => stepCard('vocabulary', -1, filteredVocabList.length)}
                        className="p-2 rounded-lg bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 cursor-pointer"
                        aria-label="Previous word"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => stepCard('vocabulary', 1, filteredVocabList.length)}
                        className="p-2 rounded-lg bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 cursor-pointer"
                        aria-label="Next word"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                        {item.word}
                      </h3>
                      <span className="text-sm font-mono text-[#566664] dark:text-slate-400">
                        {item.phonetic}
                      </span>
                      <button
                        type="button"
                        onClick={() => speakEnglishTerm(item.word)}
                        className="px-2.5 py-1 rounded-lg bg-[#0F4C45] text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-[#F4A62A]" />
                        <span>Pronounce (UK)</span>
                      </button>
                    </div>
                    <p className="text-sm text-[#384543] dark:text-slate-300 leading-relaxed">
                      {item.englishDefinition}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#D3DDDA]/60 dark:border-[#1F8A70]/25 space-y-2.5">
                    {!isRevealed ? (
                      <button
                        type="button"
                        onClick={() => {
                          audioManager.playUiClick('soft');
                          setRevealedFlashcardIds((prev) => ({ ...prev, [item.id]: true }));
                        }}
                        className="px-4 py-2 rounded-xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-xs font-bold text-[#0F4C45] dark:text-[#6EE7B7] cursor-pointer"
                      >
                        Reveal বাংলা Meaning, Synonyms &amp; Example
                      </button>
                    ) : (
                      <div className="space-y-2.5 text-xs sm:text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-[#0F4C45] dark:text-[#6EE7B7]">
                            বাংলা অর্থ: {item.banglaMeaning}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              speakBanglaCue(
                                `${item.banglaMeaning}। ${item.banglaTip}`,
                                `${item.word}: ${item.englishDefinition}`
                              )
                            }
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-[11px] font-bold text-[#0F4C45] dark:text-[#6EE7B7] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>বাংলা অডিও</span>
                          </button>
                        </div>
                        <div className="text-xs text-[#566664] dark:text-slate-300">
                          <strong className="text-[#0E1F1E] dark:text-white">Band 8+ Synonyms:</strong>{' '}
                          {item.synonyms.join(' · ')}
                        </div>
                        <p className="text-xs italic text-[#0E1F1E] dark:text-[#EEF3F1]">
                          “{item.exampleSentence}”
                        </p>
                        <p className="text-xs text-[#566664] dark:text-slate-400">{item.banglaTip}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isDone) toggleItemMastered('masteredVocabIds', item.id);
                          stepCard('vocabulary', 1, filteredVocabList.length);
                        }}
                        className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4 text-[#F4A62A]" />
                        <span>{isDone ? 'Reviewed · Next Card' : 'Mark Mastered & Next'}</span>
                      </button>

                      <span className="hidden sm:inline text-[11px] font-mono text-[#566664] dark:text-slate-400">
                        Space Reveal · ←/→ Step · M Mastered
                      </span>
                    </div>

                    {isDone && (
                      <button
                        type="button"
                        onClick={() => toggleItemMastered('masteredVocabIds', item.id)}
                        className="text-xs text-[#566664] hover:underline cursor-pointer"
                      >
                        Unmark learned
                      </button>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
              {filteredVocabList.map((item, idx) => {
                const isDone = sprintState.masteredVocabIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition space-y-2 ${
                      isDone
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-600/30'
                        : 'bg-[#F7F9F8] dark:bg-[#0B1514] border-[#D3DDDA] dark:border-[#1F8A70]/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-[#566664] tabular-nums">
                            #{idx + 1}
                          </span>
                          <h3 className="font-display text-base font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                            {item.word}
                          </h3>
                          <span className="text-[11px] font-mono text-[#566664] dark:text-slate-400">
                            {item.pos} · {item.bandLevel}
                          </span>
                          <button
                            type="button"
                            onClick={() => speakEnglishTerm(item.word)}
                            aria-label={`Pronounce ${item.word}`}
                            className="p-1 rounded hover:bg-[#D3DDDA]/40 text-[#0F4C45] dark:text-[#6EE7B7] cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-xs font-bold text-[#0F4C45] dark:text-[#6EE7B7]">
                          বাংলা: {item.banglaMeaning}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleItemMastered('masteredVocabIds', item.id)}
                        aria-label={isDone ? `Unmark ${item.word}` : `Mark ${item.word} learned`}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition cursor-pointer ${
                          isDone
                            ? 'bg-[#0F4C45] text-white'
                            : 'border-2 border-[#D3DDDA] dark:border-[#1F8A70]/40 text-transparent hover:border-[#0F4C45]'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-[#384543] dark:text-slate-300">
                      {item.englishDefinition}
                    </p>
                    <div className="text-[11px] text-[#566664] dark:text-slate-400">
                      <strong className="text-[#0E1F1E] dark:text-slate-200">Synonyms:</strong>{' '}
                      {item.synonyms.join(' · ')}
                    </div>
                    <p className="text-xs italic text-[#0E1F1E] dark:text-[#EEF3F1] pt-1 border-t border-[#D3DDDA]/50 dark:border-[#1F8A70]/20">
                      “{item.exampleSentence}”
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DAILY IDIOMS */}
      {activeTab === 'idioms' && (
        <div data-testid="sprint-panel-idioms">
          {filteredIdiomList.length === 0 ? (
            <div className="p-6 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] text-center text-xs text-[#566664] dark:text-slate-400">
              No matching idioms left under your current filter.
            </div>
          ) : viewMode === 'flashcard' ? (
            (() => {
              const idx = Math.min(cardIndexByTab.idioms, filteredIdiomList.length - 1);
              const item = filteredIdiomList[idx];
              const isDone = sprintState.masteredIdiomIds.includes(item.id);
              return (
                <div className="p-5 sm:p-6 rounded-2xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 space-y-4">
                  <div className="flex items-center justify-between gap-2 text-xs text-[#566664] dark:text-slate-400">
                    <span className="font-mono font-semibold tabular-nums">
                      Idiom {idx + 1} of {filteredIdiomList.length} · Speaking {item.speakingPart}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => stepCard('idioms', -1, filteredIdiomList.length)}
                        className="p-2 rounded-lg bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => stepCard('idioms', 1, filteredIdiomList.length)}
                        className="p-2 rounded-lg bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-display text-2xl font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                        {item.idiom}
                      </h3>
                      <button
                        type="button"
                        onClick={() => speakEnglishTerm(item.idiom)}
                        className="px-2.5 py-1 rounded-lg bg-[#0F4C45] text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-[#F4A62A]" />
                        <span>Hear UK</span>
                      </button>
                    </div>
                    <div className="text-sm font-bold text-[#0F4C45] dark:text-[#6EE7B7]">
                      বাংলা অর্থ: {item.banglaMeaning}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-[#384543] dark:text-slate-300">
                    <p>
                      <strong>Meaning:</strong> {item.naturalMeaning}
                    </p>
                    <p className="text-[#0F4C45] dark:text-[#6EE7B7]">
                      <strong>Usage Tip:</strong> {item.usageTip}
                    </p>
                    <p className="italic text-[#0E1F1E] dark:text-[#EEF3F1] pt-1">
                      “{item.exampleSentence}”
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isDone) toggleItemMastered('masteredIdiomIds', item.id);
                        stepCard('idioms', 1, filteredIdiomList.length);
                      }}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#F4A62A]" />
                      <span>{isDone ? 'Reviewed · Next Idiom' : 'Mark Mastered & Next'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        speakBanglaCue(
                          `${item.banglaMeaning}`,
                          `${item.idiom}. ${item.naturalMeaning}`
                        )
                      }
                      className="min-h-[44px] px-3 py-2 rounded-xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-xs font-semibold text-[#0F4C45] dark:text-[#6EE7B7] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>বাংলা অর্থ শুনুন</span>
                    </button>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
              {filteredIdiomList.map((item, idx) => {
                const isDone = sprintState.masteredIdiomIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition space-y-2 ${
                      isDone
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-600/30'
                        : 'bg-[#F7F9F8] dark:bg-[#0B1514] border-[#D3DDDA] dark:border-[#1F8A70]/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-[#566664]">#{idx + 1}</span>
                          <h3 className="font-display text-base font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                            {item.idiom}
                          </h3>
                          <span className="text-[11px] font-mono text-[#92400E] dark:text-[#FDE68A]">
                            Speaking {item.speakingPart}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-[#0F4C45] dark:text-[#6EE7B7]">
                          বাংলা: {item.banglaMeaning}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleItemMastered('masteredIdiomIds', item.id)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition cursor-pointer ${
                          isDone
                            ? 'bg-[#0F4C45] text-white'
                            : 'border-2 border-[#D3DDDA] dark:border-[#1F8A70]/40 text-transparent hover:border-[#0F4C45]'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-[#384543] dark:text-slate-300">
                      <strong>Meaning:</strong> {item.naturalMeaning}
                    </p>
                    <p className="text-xs text-[#0F4C45] dark:text-[#6EE7B7]">
                      <strong>Tip:</strong> {item.usageTip}
                    </p>
                    <p className="text-xs italic text-[#0E1F1E] dark:text-[#EEF3F1] pt-1 border-t border-[#D3DDDA]/50 dark:border-[#1F8A70]/20">
                      “{item.exampleSentence}”
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DAILY PHRASES & COLLOCATIONS */}
      {activeTab === 'phrases' && (
        <div data-testid="sprint-panel-phrases">
          {filteredPhraseList.length === 0 ? (
            <div className="p-6 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] text-center text-xs text-[#566664] dark:text-slate-400">
              No matching phrases left under your current filter.
            </div>
          ) : viewMode === 'flashcard' ? (
            (() => {
              const idx = Math.min(cardIndexByTab.phrases, filteredPhraseList.length - 1);
              const item = filteredPhraseList[idx];
              const isDone = sprintState.masteredPhraseIds.includes(item.id);
              return (
                <div className="p-5 sm:p-6 rounded-2xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 space-y-4">
                  <div className="flex items-center justify-between gap-2 text-xs text-[#566664] dark:text-slate-400">
                    <span className="font-mono font-semibold tabular-nums">
                      Collocation {idx + 1} of {filteredPhraseList.length} · {item.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => stepCard('phrases', -1, filteredPhraseList.length)}
                        className="p-2 rounded-lg bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => stepCard('phrases', 1, filteredPhraseList.length)}
                        className="p-2 rounded-lg bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-display text-xl sm:text-2xl font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                        {item.phrase}
                      </h3>
                      <button
                        type="button"
                        onClick={() => speakEnglishTerm(item.phrase)}
                        className="px-2.5 py-1 rounded-lg bg-[#0F4C45] text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-[#F4A62A]" />
                        <span>Hear UK</span>
                      </button>
                    </div>
                    <div className="text-sm font-bold text-[#0F4C45] dark:text-[#6EE7B7]">
                      বাংলা অর্থ: {item.banglaMeaning}
                    </div>
                  </div>

                  <p className="text-xs text-[#384543] dark:text-slate-300">{item.englishFunction}</p>
                  <div className="text-xs text-[#566664] dark:text-slate-400">
                    <strong className="text-[#0E1F1E] dark:text-white">Equivalent C1 Forms:</strong>{' '}
                    {item.synonyms.join(' · ')}
                  </div>
                  <p className="text-xs italic text-[#0E1F1E] dark:text-[#EEF3F1]">
                    “{item.exampleSentence}”
                  </p>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isDone) toggleItemMastered('masteredPhraseIds', item.id);
                        stepCard('phrases', 1, filteredPhraseList.length);
                      }}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#F4A62A]" />
                      <span>{isDone ? 'Reviewed · Next Phrase' : 'Mark Mastered & Next'}</span>
                    </button>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
              {filteredPhraseList.map((item, idx) => {
                const isDone = sprintState.masteredPhraseIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition space-y-2 ${
                      isDone
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-600/30'
                        : 'bg-[#F7F9F8] dark:bg-[#0B1514] border-[#D3DDDA] dark:border-[#1F8A70]/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-[#566664]">#{idx + 1}</span>
                          <h3 className="font-display text-sm sm:text-base font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                            {item.phrase}
                          </h3>
                          <span className="text-[11px] font-mono text-[#0F4C45] dark:text-[#6EE7B7]">
                            {item.category}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-[#0F4C45] dark:text-[#6EE7B7]">
                          বাংলা: {item.banglaMeaning}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleItemMastered('masteredPhraseIds', item.id)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition cursor-pointer ${
                          isDone
                            ? 'bg-[#0F4C45] text-white'
                            : 'border-2 border-[#D3DDDA] dark:border-[#1F8A70]/40 text-transparent hover:border-[#0F4C45]'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-[#384543] dark:text-slate-300">{item.englishFunction}</p>
                    <div className="text-[11px] text-[#566664] dark:text-slate-400">
                      <strong className="text-[#0E1F1E] dark:text-slate-200">C1 Forms:</strong>{' '}
                      {item.synonyms.join(' · ')}
                    </div>
                    <p className="text-xs italic text-[#0E1F1E] dark:text-[#EEF3F1] pt-1 border-t border-[#D3DDDA]/50 dark:border-[#1F8A70]/20">
                      “{item.exampleSentence}”
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DAILY SPELLING TARGETS + INTERACTIVE TYPE-THE-WORD DRILL */}
      {activeTab === 'spelling' && (
        <div data-testid="sprint-panel-spelling" className="space-y-4">
          {currentDrillSpellingItem && (
            <form
              onSubmit={handleVerifySpellingDrill}
              className="p-4 sm:p-5 rounded-2xl bg-[#EEF3F1] dark:bg-[#0B1514] border border-[#1F8A70]/35 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0F4C45] dark:text-[#6EE7B7]">
                  <Sparkles className="w-4 h-4" />
                  <span>
                    Interactive Spelling Drill ({(spellingDrillIdx % activeSpellingList.length) + 1}/
                    {activeSpellingList.length})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      audioManager.playUiClick('soft');
                      speakEnglishTerm(currentDrillSpellingItem.word);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-[#0F4C45] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Hear Dictation</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      audioManager.playUiClick('toggle');
                      setHideSpellingTargetWord((v) => !v);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-xs font-semibold cursor-pointer"
                  >
                    {hideSpellingTargetWord ? 'Show Word' : 'Hide Word to Test'}
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                    বাংলা অর্থ: {currentDrillSpellingItem.banglaMeaning}{' '}
                    <span className="text-xs font-mono text-[#566664] dark:text-slate-400">
                      ({currentDrillSpellingItem.phonetic})
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#566664] dark:text-slate-400">
                    <span>Trap Cue: {currentDrillSpellingItem.trapNote}</span>
                    <button
                      type="button"
                      onClick={() => {
                        audioManager.playUiClick('soft');
                        speakBanglaCue(
                          `${currentDrillSpellingItem.banglaMeaning}। ${currentDrillSpellingItem.trapNote}`,
                          `Spelling word ${currentDrillSpellingItem.word}. Watch the double or silent letters carefully.`
                        );
                      }}
                      className="px-2 py-0.5 rounded-md bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-[#0F4C45] dark:text-[#6EE7B7] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>বাংলা টিপ</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={spellingInput}
                    onChange={(e) => {
                      setSpellingInput(e.target.value);
                      setSpellingFeedback('idle');
                    }}
                    placeholder={
                      hideSpellingTargetWord
                        ? 'Type the English spelling...'
                        : `Type "${currentDrillSpellingItem.word}"...`
                    }
                    aria-label="Type the English spelling word"
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/40 text-xs sm:text-sm font-mono text-[#0E1F1E] dark:text-[#EEF3F1] focus:outline-none focus:ring-2 focus:ring-[#0F4C45]"
                  />
                  <button
                    type="submit"
                    className="min-h-[38px] px-4 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs font-bold cursor-pointer"
                  >
                    Check
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      audioManager.playUiClick('soft');
                      setSpellingDrillIdx((i) => (i + 1) % activeSpellingList.length);
                      setSpellingInput('');
                      setSpellingFeedback('idle');
                    }}
                    className="min-h-[38px] px-3 py-2 rounded-xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-xs font-semibold cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>

              {spellingFeedback === 'correct' && (
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  ✓ সাবাশ! 100% accurate spelling ({currentDrillSpellingItem.word}) — marked mastered!
                </div>
              )}
              {spellingFeedback === 'wrong' && (
                <div className="text-xs font-bold text-red-600 dark:text-red-400">
                  ✗ Careful with the trap! Correct spelling:{' '}
                  <span className="font-mono underline">{currentDrillSpellingItem.word}</span> —{' '}
                  {currentDrillSpellingItem.trapNote}
                </div>
              )}
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
            {filteredSpellingList.map((item, idx) => {
              const isDone = sprintState.masteredSpellingIds.includes(item.id);
              const originalIdx = activeSpellingList.findIndex((s) => s.id === item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    audioManager.playUiClick('soft');
                    setSpellingDrillIdx(originalIdx >= 0 ? originalIdx : idx);
                    setSpellingInput('');
                    setSpellingFeedback('idle');
                  }}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-start justify-between gap-2 ${
                    isDone
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-600/30'
                      : 'bg-[#F7F9F8] dark:bg-[#0B1514] border-[#D3DDDA] dark:border-[#1F8A70]/30 hover:border-[#0F4C45]'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-mono text-[#566664]">#{idx + 1}</span>
                      <span className="font-mono text-sm font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                        {item.word}
                      </span>
                      <span className="text-[10px] font-mono text-[#0F4C45] dark:text-[#6EE7B7]">
                        · {item.sectionContext}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-[#0F4C45] dark:text-[#6EE7B7]">
                      {item.banglaMeaning}
                    </div>
                    <div className="text-[11px] text-[#566664] dark:text-slate-400 leading-snug">
                      {item.trapNote}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleItemMastered('masteredSpellingIds', item.id);
                    }}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition cursor-pointer ${
                      isDone
                        ? 'bg-[#0F4C45] text-white'
                        : 'border-2 border-[#D3DDDA] dark:border-[#1F8A70]/40 text-transparent hover:border-[#0F4C45]'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: IELTS GRAMMAR IMPROVEMENT */}
      {activeTab === 'grammar' && (
        <div data-testid="sprint-panel-grammar">
          {filteredGrammarList.length === 0 ? (
            <div className="p-6 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] text-center text-xs text-[#566664] dark:text-slate-400">
              No matching grammar rules left under your current filter.
            </div>
          ) : (
            <div className="space-y-4">
              {viewMode === 'flashcard' && (
                <div className="flex items-center justify-between text-xs text-[#566664] dark:text-slate-400">
                  <span className="font-mono font-semibold tabular-nums">
                    Rule {Math.min(cardIndexByTab.grammar, filteredGrammarList.length - 1) + 1} of{' '}
                    {filteredGrammarList.length}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => stepCard('grammar', -1, filteredGrammarList.length)}
                      className="p-2 rounded-lg bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => stepCard('grammar', 1, filteredGrammarList.length)}
                      className="p-2 rounded-lg bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <div
                className={
                  viewMode === 'list' ? 'space-y-4 max-h-[520px] overflow-y-auto pr-1' : 'space-y-4'
                }
              >
                {(viewMode === 'flashcard'
                  ? [
                      filteredGrammarList[
                        Math.min(cardIndexByTab.grammar, filteredGrammarList.length - 1)
                      ]
                    ]
                  : filteredGrammarList
                ).map((rule) => {
                  const isDone = sprintState.masteredGrammarIds.includes(rule.id);
                  const selectedAnswer = grammarAnswers[rule.id];
                  const isCorrect = selectedAnswer === rule.quickCheck.correctIndex;

                  return (
                    <div
                      key={rule.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition space-y-3.5 ${
                        isDone
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-600/30'
                          : 'bg-[#F7F9F8] dark:bg-[#0B1514] border-[#D3DDDA] dark:border-[#1F8A70]/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-display text-base font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                              {rule.title}
                            </h3>
                            <span className="text-xs font-mono text-[#0F4C45] dark:text-[#6EE7B7] font-semibold">
                              · {rule.bandImpact}
                            </span>
                          </div>
                          <p className="text-xs text-[#384543] dark:text-slate-300 mt-1">
                            {rule.englishExplanation}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleItemMastered('masteredGrammarIds', rule.id)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition cursor-pointer ${
                            isDone
                              ? 'bg-[#0F4C45] text-white'
                              : 'border-2 border-[#D3DDDA] dark:border-[#1F8A70]/40 text-transparent hover:border-[#0F4C45]'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="p-3 rounded-xl bg-white dark:bg-[#11201E] border border-[#1F8A70]/25 text-xs space-y-1.5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="font-bold text-[#0F4C45] dark:text-[#6EE7B7] flex-1">
                            বাংলা ব্যাখ্যা: {rule.banglaExplanation}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              audioManager.playUiClick('soft');
                              speakBanglaCue(rule.banglaExplanation, rule.englishExplanation);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#EEF3F1] dark:bg-[#0B1514] text-[#0F4C45] dark:text-[#6EE7B7] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>বাংলা ব্যাখ্যা শুনুন</span>
                          </button>
                        </div>
                        <div className="text-[#566664] dark:text-slate-400">
                          {rule.whyItMattersBangla}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                        <div className="p-3 rounded-xl bg-red-50/70 dark:bg-red-950/20 border border-red-400/30">
                          <div className="font-bold text-red-700 dark:text-red-300">
                            ✗ Common Band 6.0 Mistake:
                          </div>
                          <div className="mt-0.5 text-[#0E1F1E] dark:text-[#EEF3F1]">
                            “{rule.commonMistake}”
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-500/30">
                          <div className="font-bold text-emerald-800 dark:text-emerald-300">
                            ✓ Band 8.5 Academic Correction:
                          </div>
                          <div className="mt-0.5 text-[#0E1F1E] dark:text-[#EEF3F1]">
                            “{rule.band8Correction}”
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/25 space-y-2.5">
                        <div className="text-xs font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                          Quick Practice Check: {rule.quickCheck.question}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {rule.quickCheck.options.map((opt, optIdx) => {
                            const isChosen = selectedAnswer === optIdx;
                            const isRightOption = optIdx === rule.quickCheck.correctIndex;
                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() => {
                                  setGrammarAnswers((prev) => ({ ...prev, [rule.id]: optIdx }));
                                  if (optIdx === rule.quickCheck.correctIndex) {
                                    audioManager.playUiClick('check');
                                    if (!sprintState.masteredGrammarIds.includes(rule.id)) {
                                      toggleItemMastered('masteredGrammarIds', rule.id);
                                    }
                                  } else {
                                    audioManager.playPomodoroPause();
                                  }
                                }}
                                className={`p-2.5 rounded-lg border text-left text-xs transition cursor-pointer ${
                                  isChosen
                                    ? isRightOption
                                      ? 'bg-emerald-600 text-white border-emerald-600 font-semibold'
                                      : 'bg-red-600 text-white border-red-600 font-semibold'
                                    : 'bg-[#F7F9F8] dark:bg-[#0B1514] border-[#D3DDDA] dark:border-[#1F8A70]/30 hover:border-[#0F4C45]'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        {selectedAnswer !== undefined && (
                          <div
                            className={`text-xs font-medium pt-1 ${
                              isCorrect
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : 'text-amber-700 dark:text-amber-300'
                            }`}
                          >
                            {isCorrect ? '✓ সঠিক উত্তর! ' : '✗ লক্ষ্য করুন: '}
                            {rule.quickCheck.explanationBangla}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Minimalist Distraction-Free Full-Screen Pomodoro Focus View */}
      <AnimatePresence>
        {isFullscreenFocus && (
          <motion.div
            data-testid="pomodoro-fullscreen-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Distraction-Free Pomodoro Focus View"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[95] bg-[#061513] text-white flex flex-col justify-between p-5 sm:p-8 select-none overflow-hidden"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-45"
              style={{
                background:
                  pomodoroPhase === 'focus'
                    ? 'radial-gradient(circle at 50% 45%, rgba(31, 138, 112, 0.28) 0%, rgba(6, 21, 19, 0) 65%)'
                    : 'radial-gradient(circle at 50% 45%, rgba(244, 166, 42, 0.18) 0%, rgba(6, 21, 19, 0) 65%)'
              }}
              aria-hidden="true"
            />

            <div className="relative z-10 w-full max-w-4xl mx-auto flex items-center justify-between gap-3">
              <div className="text-xs font-mono uppercase tracking-widest text-[#EEF3F1]/65">
                {activePreset.label} · {pomodoroPhase === 'focus' ? 'Deep Focus' : 'Recovery Break'}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleUiSounds}
                  aria-label={uiSoundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
                >
                  {uiSoundEnabled ? (
                    <Volume2 className="w-3.5 h-3.5 text-[#F4A62A]" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-white/60" />
                  )}
                  <span className="hidden sm:inline">{uiSoundEnabled ? 'SFX On' : 'SFX Off'}</span>
                </button>

                <button
                  type="button"
                  data-testid="pomodoro-exit-fullscreen-btn"
                  onClick={toggleFullscreenFocus}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Minimize2 className="w-3.5 h-3.5 text-[#F4A62A]" />
                  <span>Exit Full Screen</span>
                </button>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full max-w-xl mx-auto flex flex-col items-center justify-center text-center gap-7 my-auto"
            >
              <div className="inline-flex p-1 rounded-xl bg-white/10 border border-white/10">
                <button
                  type="button"
                  onClick={() => handleSwitchPhase('focus')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                    pomodoroPhase === 'focus'
                      ? 'bg-[#1F8A70] text-white'
                      : 'text-[#EEF3F1]/70 hover:text-white'
                  }`}
                >
                  Focus ({activePreset.focusMinutes}m)
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchPhase('break')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                    pomodoroPhase === 'break'
                      ? 'bg-[#F4A62A] text-[#0E1F1E]'
                      : 'text-[#EEF3F1]/70 hover:text-white'
                  }`}
                >
                  Break ({activePreset.breakMinutes}m)
                </button>
              </div>

              <div
                data-testid="pomodoro-fullscreen-clock"
                className="font-mono text-7xl sm:text-8xl md:text-9xl font-bold tracking-tight tabular-nums text-white leading-none"
              >
                {formatTimer(secondsLeft)}
              </div>

              <div className="w-full max-w-md space-y-2">
                <div
                  role="progressbar"
                  aria-valuenow={timerProgressPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Pomodoro session progress"
                  className="w-full h-2.5 rounded-full bg-white/15 overflow-hidden"
                >
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      pomodoroPhase === 'focus' ? 'bg-[#F4A62A]' : 'bg-[#34D399]'
                    }`}
                    style={{ width: `${timerProgressPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-[#EEF3F1]/60">
                  <span>{pomodoroPhase === 'focus' ? 'Focus Sprint' : 'Rest Break'}</span>
                  <span>{timerProgressPct}% complete</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleToggleStartPause}
                  className="min-h-[48px] px-7 py-2.5 rounded-xl bg-[#F4A62A] hover:bg-[#d98f1d] text-[#0E1F1E] font-bold text-sm flex items-center gap-2 cursor-pointer transition shadow-lg"
                >
                  {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isRunning ? 'Pause' : 'Start Focus'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetTimer}
                  className="min-h-[48px] px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm flex items-center gap-1.5 cursor-pointer transition"
                  aria-label="Reset timer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset</span>
                </button>
              </div>
            </motion.div>

            <div className="relative z-10 text-center text-[11px] font-mono text-[#EEF3F1]/40">
              Press Esc anytime to return to your Daily Sprint Hub
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post-Sprint Daily Mastery Exam Modal */}
      <DailyMasteryExamModal
        isOpen={isMasteryExamOpen}
        onClose={() => setIsMasteryExamOpen(false)}
        onExamCompleted={(summary) => setExamSummary(summary)}
        onShowToast={onShowToast}
        cycleOffset={effectiveCycleOffset}
      />

      {/* Gold Star Confetti Celebration Overlay */}
      <PomodoroStarConfettiOverlay triggerKey={confettiBurstCount} />
    </section>
  );
};
