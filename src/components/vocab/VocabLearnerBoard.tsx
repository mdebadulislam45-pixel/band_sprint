import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  CheckCircle2,
  UserPlus,
  Edit3,
  Check,
  X,
  Flame,
  TrendingUp,
  Award,
  Users,
  ChevronDown,
  ChevronUp,
  RotateCcw
} from 'lucide-react';
import { getActiveUser, getAllUsers } from '../../utils/userStorage';
import { soundManager } from '../../utils/audioEffects';

export const VOCAB_LEARNER_BOARD_STORAGE_KEY = 'ielts_vocab_learner_board_v1';
export const VOCAB_ACTIVE_LEARNER_ID_KEY = 'ielts_vocab_active_learner_id_v1';

export interface VocabLearnerEntry {
  id: string;
  name: string;
  masteredCount: number;
  c1c2MasteredCount: number;
  targetBand: number;
  streakDays: number;
  updatedAt: number;
  isCurrentUser?: boolean;
}

interface VocabLearnerBoardProps {
  masteredCount: number;
  c1c2MasteredCount: number;
  totalCards: number;
  onStartQuiz?: () => void;
  onStartSprint?: () => void;
  onShowToast?: (msg: string) => void;
}

function getCefrMasteryLabel(mastered: number): { tier: string; bandEstimate: string } {
  if (mastered >= 40) return { tier: 'C2 Lexical Master', bandEstimate: 'Band 8.5+' };
  if (mastered >= 24) return { tier: 'C1 Advanced Scholar', bandEstimate: 'Band 7.5–8.0' };
  if (mastered >= 12) return { tier: 'B2 Upper-Intermediate', bandEstimate: 'Band 6.5–7.0' };
  return { tier: 'Building Core Lexicon', bandEstimate: 'Band 6.0+' };
}

export const VocabLearnerBoard: React.FC<VocabLearnerBoardProps> = ({
  masteredCount,
  c1c2MasteredCount,
  totalCards,
  onStartQuiz,
  onStartSprint,
  onShowToast
}) => {
  const activePlatformUser = getActiveUser();

  const [activeLearnerId, setActiveLearnerId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem(VOCAB_ACTIVE_LEARNER_ID_KEY);
      if (savedId) return savedId;
    } catch {}
    return activePlatformUser?.id || 'learner_current_user';
  });

  const [learners, setLearners] = useState<VocabLearnerEntry[]>(() => {
    try {
      const raw = localStorage.getItem(VOCAB_LEARNER_BOARD_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}

    const currentId = activePlatformUser?.id || 'learner_current_user';
    const currentEntry: VocabLearnerEntry = {
      id: currentId,
      name: activePlatformUser?.name || 'You (Active Learner)',
      masteredCount,
      c1c2MasteredCount,
      targetBand: activePlatformUser?.progress?.targetBand || 8.0,
      streakDays: activePlatformUser?.progress?.streakDays || 1,
      updatedAt: Date.now(),
      isCurrentUser: true
    };

    return [currentEntry];
  });

  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameInput, setEditNameInput] = useState('');
  const [showAddLearnerForm, setShowAddLearnerForm] = useState(false);
  const [newLearnerName, setNewLearnerName] = useState('');
  const [newLearnerTargetBand, setNewLearnerTargetBand] = useState<number>(8.0);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Sync live masteredCount and c1c2MasteredCount for the active learner whenever cards change
  useEffect(() => {
    setLearners((prev) => {
      const exists = prev.some((l) => l.id === activeLearnerId);
      let updated: VocabLearnerEntry[];
      if (exists) {
        updated = prev.map((l) =>
          l.id === activeLearnerId
            ? {
                ...l,
                masteredCount,
                c1c2MasteredCount,
                updatedAt: Date.now(),
                isCurrentUser: true
              }
            : { ...l, isCurrentUser: false }
        );
      } else {
        const newActive: VocabLearnerEntry = {
          id: activeLearnerId,
          name: activePlatformUser?.name || 'You (Active Learner)',
          masteredCount,
          c1c2MasteredCount,
          targetBand: activePlatformUser?.progress?.targetBand || 8.0,
          streakDays: activePlatformUser?.progress?.streakDays || 3,
          updatedAt: Date.now(),
          isCurrentUser: true
        };
        updated = [newActive, ...prev.map((l) => ({ ...l, isCurrentUser: false }))];
      }

      try {
        localStorage.setItem(VOCAB_LEARNER_BOARD_STORAGE_KEY, JSON.stringify(updated));
        localStorage.setItem(VOCAB_ACTIVE_LEARNER_ID_KEY, activeLearnerId);
      } catch {}

      return updated;
    });
  }, [masteredCount, c1c2MasteredCount, activeLearnerId, activePlatformUser?.name, activePlatformUser?.progress?.targetBand, activePlatformUser?.progress?.streakDays]);

  // Persist whenever learners array updates
  useEffect(() => {
    try {
      localStorage.setItem(VOCAB_LEARNER_BOARD_STORAGE_KEY, JSON.stringify(learners));
    } catch {}
  }, [learners]);

  // Sort all learners descending by masteredCount (tie-breaker: c1c2MasteredCount, then updatedAt)
  const sortedLearners = useMemo(() => {
    return [...learners].sort((a, b) => {
      if (b.masteredCount !== a.masteredCount) return b.masteredCount - a.masteredCount;
      if (b.c1c2MasteredCount !== a.c1c2MasteredCount) return b.c1c2MasteredCount - a.c1c2MasteredCount;
      return b.updatedAt - a.updatedAt;
    });
  }, [learners]);

  // Top 5 users based on mastered vocabulary cards
  const top5Learners = useMemo(() => sortedLearners.slice(0, 5), [sortedLearners]);

  const activeLearnerRank = useMemo(() => {
    const idx = sortedLearners.findIndex((l) => l.id === activeLearnerId);
    return idx >= 0 ? idx + 1 : sortedLearners.length;
  }, [sortedLearners, activeLearnerId]);

  const activeLearner = useMemo(() => {
    return (
      sortedLearners.find((l) => l.id === activeLearnerId) || {
        id: activeLearnerId,
        name: activePlatformUser?.name || 'You (Active Learner)',
        masteredCount,
        c1c2MasteredCount,
        targetBand: 8.0,
        streakDays: 3,
        updatedAt: Date.now(),
        isCurrentUser: true
      }
    );
  }, [sortedLearners, activeLearnerId, activePlatformUser?.name, masteredCount, c1c2MasteredCount]);

  // Calculate how many cards needed to reach next rank
  const nextRankTarget = useMemo(() => {
    if (activeLearnerRank <= 1) return null;
    const aboveLearner = sortedLearners[activeLearnerRank - 2];
    if (!aboveLearner) return null;
    const diff = Math.max(1, aboveLearner.masteredCount - activeLearner.masteredCount + 1);
    return {
      rankAbove: activeLearnerRank - 1,
      nameAbove: aboveLearner.name,
      cardsNeeded: diff
    };
  }, [activeLearnerRank, sortedLearners, activeLearner.masteredCount]);

  const handleStartEditName = () => {
    setEditNameInput(activeLearner.name.replace(/\s*\(Active Learner\)$/i, ''));
    setIsEditingName(true);
    soundManager.playBeep(580, 0.04);
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = editNameInput.trim();
    if (!trimmed) return;
    setLearners((prev) =>
      prev.map((l) => (l.id === activeLearnerId ? { ...l, name: trimmed, updatedAt: Date.now() } : l))
    );
    setIsEditingName(false);
    soundManager.playSuccess();
    onShowToast?.(`Updated Learner Board name to "${trimmed}"`);
  };

  const handleAddLocalLearner = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newLearnerName.trim();
    if (!trimmed) return;

    const newId = `local_learner_${Date.now()}`;
    const newEntry: VocabLearnerEntry = {
      id: newId,
      name: trimmed,
      masteredCount,
      c1c2MasteredCount,
      targetBand: newLearnerTargetBand,
      streakDays: 1,
      updatedAt: Date.now(),
      isCurrentUser: true
    };

    setLearners((prev) => [
      newEntry,
      ...prev.map((l) => ({ ...l, isCurrentUser: false }))
    ]);
    setActiveLearnerId(newId);
    try {
      localStorage.setItem(VOCAB_ACTIVE_LEARNER_ID_KEY, newId);
    } catch {}
    setNewLearnerName('');
    setShowAddLearnerForm(false);
    soundManager.playSuccess();
    onShowToast?.(`Switched active Learner Board profile to "${trimmed}"`);
  };

  const handleSwitchLearner = (learnerId: string) => {
    setActiveLearnerId(learnerId);
    try {
      localStorage.setItem(VOCAB_ACTIVE_LEARNER_ID_KEY, learnerId);
    } catch {}
    soundManager.playBeep(620, 0.05);
    const chosen = learners.find((l) => l.id === learnerId);
    if (chosen) {
      onShowToast?.(`Active Learner Board profile: ${chosen.name}`);
    }
  };

  const handleResetDemoBoard = () => {
    const freshCurrent: VocabLearnerEntry = {
      id: activeLearner.id,
      name: activeLearner.name,
      masteredCount,
      c1c2MasteredCount,
      targetBand: activeLearner.targetBand,
      streakDays: activeLearner.streakDays,
      updatedAt: Date.now(),
      isCurrentUser: true
    };
    const resetList = [freshCurrent];
    setLearners(resetList);
    try {
      localStorage.setItem(VOCAB_LEARNER_BOARD_STORAGE_KEY, JSON.stringify(resetList));
    } catch {}
    soundManager.playBeep(520, 0.05);
    onShowToast?.('Learner Board rankings synced with your current mastered vocabulary cards.');
  };

  const maxMasteredOnBoard = Math.max(
    totalCards || 60,
    sortedLearners[0]?.masteredCount || 1
  );

  return (
    <section
      aria-label="Local Vocabulary Learner Board"
      className="w-full bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs transition-all"
    >
      {/* Top Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="font-bold text-slate-900 uppercase tracking-wider font-mono">
                Learner Board
              </span>
              <span aria-hidden="true">·</span>
              <span>Top 5 Vocabulary Masters</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-700 font-semibold">
                Your Rank: #{activeLearnerRank} ({activeLearner.masteredCount} mastered)
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-0.5">
              Top 5 Learners by Mastered Vocabulary Cards
            </h2>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {!isEditingName ? (
            <button
              type="button"
              onClick={handleStartEditName}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Edit your display name on the Learner Board"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              <span>Edit My Name</span>
            </button>
          ) : (
            <form onSubmit={handleSaveName} className="flex items-center gap-1.5">
              <input
                type="text"
                value={editNameInput}
                onChange={(e) => setEditNameInput(e.target.value)}
                placeholder="Your learner name..."
                maxLength={32}
                autoFocus
                className="px-3 py-1.5 rounded-xl border border-indigo-300 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-40"
              />
              <button
                type="submit"
                className="p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer"
                title="Save Name"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsEditingName(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          <button
            type="button"
            onClick={() => {
              setShowAddLearnerForm((prev) => !prev);
              soundManager.playBeep(600, 0.04);
            }}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
            <span>{showAddLearnerForm ? 'Close Profile Form' : 'Add / Switch Learner'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            aria-expanded={!isCollapsed}
          >
            <span>{isCollapsed ? 'Show Board' : 'Hide'}</span>
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Add / Switch Local Learner Drawer */}
      {showAddLearnerForm && !isCollapsed && (
        <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>Local Learner Profiles (Saved in Browser Storage)</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Add a study partner or switch your active learner profile to track mastered vocabulary cards locally.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetDemoBoard}
              className="self-start sm:self-auto text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Sync & Reset Standings</span>
            </button>
          </div>

          <form onSubmit={handleAddLocalLearner} className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={newLearnerName}
              onChange={(e) => setNewLearnerName(e.target.value)}
              placeholder="Enter learner name (e.g., Mahir Rahman)..."
              maxLength={32}
              className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={newLearnerTargetBand}
              onChange={(e) => setNewLearnerTargetBand( parseFloat(e.target.value) || 8.0 )}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Target Band Score"
            >
              <option value={7.0}>Target Band 7.0</option>
              <option value={7.5}>Target Band 7.5</option>
              <option value={8.0}>Target Band 8.0</option>
              <option value={8.5}>Target Band 8.5</option>
              <option value={9.0}>Target Band 9.0</option>
            </select>
            <button
              type="submit"
              disabled={!newLearnerName.trim()}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold transition cursor-pointer shrink-0"
            >
              Save & Set Active
            </button>
          </form>

          {/* Existing Local Profiles Switcher */}
          <div className="pt-2 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">Switch Profile:</span>
            {sortedLearners.map((learner) => {
              const isSelected = learner.id === activeLearnerId;
              return (
                <button
                  key={learner.id}
                  type="button"
                  onClick={() => handleSwitchLearner(learner.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {learner.name} ({learner.masteredCount})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!isCollapsed && (
        <div className="mt-5 space-y-4">
          {/* Motivational Next Rank Callout Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center gap-2.5 text-xs text-slate-700">
              <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
              {nextRankTarget ? (
                <span>
                  Master{' '}
                  <strong className="font-black text-slate-900">
                    {nextRankTarget.cardsNeeded} more card{nextRankTarget.cardsNeeded > 1 ? 's' : ''}
                  </strong>{' '}
                  to overtake <strong className="font-bold text-slate-900">{nextRankTarget.nameAbove}</strong> for{' '}
                  <strong className="font-bold text-indigo-700">Rank #{nextRankTarget.rankAbove}</strong>!
                </span>
              ) : (
                <span className="font-semibold text-emerald-800">
                  You are #1 on the Local Learner Board with {activeLearner.masteredCount} mastered vocabulary cards!
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {onStartQuiz && (
                <button
                  type="button"
                  onClick={onStartQuiz}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5 text-amber-300" />
                  <span>C1/C2 Quiz Boost</span>
                </button>
              )}
              {onStartSprint && (
                <button
                  type="button"
                  onClick={onStartSprint}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold transition cursor-pointer"
                >
                  Daily Sprint
                </button>
              )}
            </div>
          </div>

          {/* Top 5 Learners List */}
          <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-white">
            {top5Learners.map((learner, index) => {
              const rank = index + 1;
              const isCurrent = learner.id === activeLearnerId;
              const { tier, bandEstimate } = getCefrMasteryLabel(learner.masteredCount);
              const progressPct = Math.min(
                100,
                Math.max(4, Math.round((learner.masteredCount / maxMasteredOnBoard) * 100))
              );

              const rankStyle =
                rank === 1
                  ? 'bg-amber-400 text-slate-950 font-black'
                  : rank === 2
                  ? 'bg-slate-200 text-slate-900 font-black'
                  : rank === 3
                  ? 'bg-amber-700/15 text-amber-900 font-black'
                  : 'bg-slate-100 text-slate-600 font-bold';

              return (
                <div
                  key={learner.id}
                  className={`p-3.5 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                    isCurrent ? 'bg-indigo-50/50' : 'hover:bg-slate-50/80'
                  }`}
                >
                  {/* Left: Rank + Name + Metadata */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono shrink-0 ${rankStyle}`}
                      title={`Rank #${rank}`}
                    >
                      #{rank}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {learner.name}
                        </span>
                        {isCurrent && (
                          <span className="text-[11px] font-bold text-indigo-700">
                            · You
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                        <span>{tier}</span>
                        <span aria-hidden="true">·</span>
                        <span>{bandEstimate}</span>
                        <span aria-hidden="true">·</span>
                        <span>Target {learner.targetBand.toFixed(1)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 text-slate-600">
                          <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                          {learner.streakDays}d streak
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Progress Bar & Mastered Count */}
                  <div className="flex items-center gap-4 sm:w-72 shrink-0 justify-between sm:justify-end">
                    <div className="flex-1 sm:w-32 bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          rank === 1
                            ? 'bg-amber-500'
                            : isCurrent
                            ? 'bg-indigo-600'
                            : 'bg-emerald-600'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    <div className="text-right shrink-0 min-w-[105px]">
                      <div className="text-sm font-mono font-black text-slate-900 flex items-center justify-end gap-1">
                        <CheckCircle2
                          className={`w-3.5 h-3.5 ${
                            isCurrent ? 'text-indigo-600' : 'text-emerald-600'
                          }`}
                        />
                        <span>{learner.masteredCount}</span>
                        <span className="text-xs font-normal text-slate-400">
                          / {totalCards}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {learner.c1c2MasteredCount} C1/C2 mastered
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* If the active learner is currently ranked #6 or lower, show their pinned row */}
          {activeLearnerRank > 5 && (
            <div className="p-3.5 sm:px-5 sm:py-3.5 rounded-2xl border border-indigo-200 bg-indigo-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-mono font-black shrink-0">
                  #{activeLearnerRank}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {activeLearner.name} <span className="text-xs font-semibold text-indigo-700">· Your Current Standing</span>
                  </div>
                  <div className="text-xs text-slate-600">
                    Master {Math.max(1, (top5Learners[4]?.masteredCount || 8) - activeLearner.masteredCount + 1)} more vocabulary card(s) to enter the Top 5 Learner Board!
                  </div>
                </div>
              </div>

              <div className="text-right font-mono font-black text-sm text-indigo-950">
                {activeLearner.masteredCount} / {totalCards} mastered
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
