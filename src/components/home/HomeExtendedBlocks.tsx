import React, { useMemo, useState, useEffect } from 'react';
import {
  Headphones,
  BookOpen,
  PenTool,
  Mic,
  Flame,
  AlertCircle,
  Volume2,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Compass
} from 'lucide-react';
import { UserProfile, VocabCard } from '../../types';
import { DiagnosticResult, DiagnosticSkill } from '../../services/diagnosticResultStore';
import { getMistakes } from '../../utils/vaultStorage';
import { speakBritish } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';
import { getStreakState, getWeeklyXp, localDateKey, WEEKLY_XP_GOAL, type StreakState } from '../../services/streakService';

interface HomeExtendedBlocksProps {
  section?: 'all' | 'skills' | 'sidebar';
  user?: UserProfile | null;
  diagnostic?: DiagnosticResult | null;
  targetBand?: number;
  onNavigate: (path: string) => void;
  onShowToast: (msg: string) => void;
}

export const HomeExtendedBlocks: React.FC<HomeExtendedBlocksProps> = ({
  section = 'all',
  user,
  diagnostic = null,
  targetBand = 7.5,
  onNavigate,
  onShowToast
}) => {
  const examHistory = user?.progress?.examHistory || [];

  // Real persisted streak & XP (syncs immediately when missions or blitz complete)
  const [streakState, setStreakState] = useState<StreakState>(() => getStreakState());

  useEffect(() => {
    const refreshStreak = () => setStreakState(getStreakState());
    window.addEventListener('bandsprint_streak_updated', refreshStreak);
    return () => window.removeEventListener('bandsprint_streak_updated', refreshStreak);
  }, []);

  const streakDays = Math.max(streakState.currentStreak, user?.progress?.streakDays || 0);
  const weeklyXp = getWeeklyXp(streakState);
  const weeklyXpPercent = Math.min(100, Math.round((weeklyXp / WEEKLY_XP_GOAL) * 100));

  // Determine current week days (Sat to Fri) and check real study activity
  const weekDays = useMemo(() => {
    const days = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const now = new Date();
    const currentDayOfWeek = now.getDay();
    const diffToSat = (currentDayOfWeek + 1) % 7;
    const sat = new Date(now);
    sat.setDate(now.getDate() - diffToSat);
    sat.setHours(0, 0, 0, 0);

    return days.map((dayName, idx) => {
      const targetDate = new Date(sat);
      targetDate.setDate(sat.getDate() + idx);
      targetDate.setHours(0, 0, 0, 0);
      const dateKey = localDateKey(targetDate);

      const studiedInHistory = examHistory.some((rec) => {
        const recDate = new Date(rec.timestamp);
        return recDate.toDateString() === targetDate.toDateString();
      });
      const studiedInStreak = Boolean(streakState.xpByDate?.[dateKey] && streakState.xpByDate[dateKey] > 0);
      const isToday = targetDate.toDateString() === now.toDateString();

      return {
        dayName,
        studied: studiedInHistory || studiedInStreak,
        isToday
      };
    });
  }, [examHistory, streakState]);

  // Unified Skill Band Estimates (latest practice history → fallback to diagnostic baseline)
  const skillCards = useMemo(() => {
    const sorted = [...examHistory].sort((a, b) => b.timestamp - a.timestamp);
    const findLatest = (key: 'listeningBand' | 'readingBand' | 'writingBand' | 'speakingBand') => {
      for (const rec of sorted) {
        const val = rec[key];
        if (typeof val === 'number' && val > 0) return val;
      }
      return null;
    };

    const items: Array<{
      id: DiagnosticSkill;
      name: string;
      icon: typeof Headphones;
      path: string;
      desc: string;
      band: number | null;
      source: string;
    }> = [
      {
        id: 'listening',
        name: 'Listening',
        icon: Headphones,
        path: '/practice/listening',
        desc: '4-section audio & map drills',
        band: findLatest('listeningBand') ?? diagnostic?.scores?.listening ?? null,
        source: findLatest('listeningBand') ? 'Latest practice' : diagnostic ? 'Diagnostic' : 'Not tested'
      },
      {
        id: 'reading',
        name: 'Reading',
        icon: BookOpen,
        path: '/practice/reading',
        desc: 'Split-screen passages & TFNG',
        band: findLatest('readingBand') ?? diagnostic?.scores?.reading ?? null,
        source: findLatest('readingBand') ? 'Latest practice' : diagnostic ? 'Diagnostic' : 'Not tested'
      },
      {
        id: 'writing',
        name: 'Writing',
        icon: PenTool,
        path: '/practice/writing',
        desc: 'Task 1 & 2 AI rubric feedback',
        band: findLatest('writingBand') ?? diagnostic?.scores?.writing ?? null,
        source: findLatest('writingBand') ? 'Latest practice' : diagnostic ? 'Diagnostic' : 'Not tested'
      },
      {
        id: 'speaking',
        name: 'Speaking',
        icon: Mic,
        path: '/practice/speaking',
        desc: 'British voice examiner & Parts 1–3',
        band: findLatest('speakingBand') ?? diagnostic?.scores?.speaking ?? null,
        source: findLatest('speakingBand') ? 'Latest practice' : diagnostic ? 'Diagnostic' : 'Not tested'
      }
    ];

    return items;
  }, [examHistory, diagnostic]);

  // Today's study minutes estimate
  const dailyGoalMinutes = diagnostic?.dailyMinutes || 30;
  const todayMinutesStudied = useMemo(() => {
    const nowStr = new Date().toDateString();
    const todayKey = localDateKey(new Date());
    const todayRecs = examHistory.filter((rec) => new Date(rec.timestamp).toDateString() === nowStr);
    const xpToday = streakState.xpByDate?.[todayKey] || 0;
    const fromHistory = todayRecs.length * 15;
    const fromXp = Math.round(xpToday / 5) * 3;
    return Math.max(fromHistory, fromXp);
  }, [examHistory, streakState]);

  const goalPercent = Math.min(100, Math.round((todayMinutesStudied / dailyGoalMinutes) * 100));

  // Unmastered mistakes count
  const mistakeCount = useMemo(() => {
    try {
      return getMistakes().filter((m) => !m.mastered).length;
    } catch {
      return 0;
    }
  }, []);

  // Word of the Day (lazy loaded so Home bundle stays lean)
  const [wordOfTheDay, setWordOfTheDay] = useState<{
    word: string;
    meaning: string;
    bangla?: string;
    partOfSpeech: string;
  }>({
    word: 'Eloquent',
    meaning: 'Fluent or persuasive in speaking or writing.',
    bangla: 'বাকপটু / প্রাঞ্জলভাবে কথা বলা বা লেখায় দক্ষ',
    partOfSpeech: 'adjective'
  });

  useEffect(() => {
    let active = true;
    import('../../data/masterVocabDatabase')
      .then((mod) => {
        if (!active || !mod.MASTER_1000_VOCAB_DATABASE?.length) return;
        const dayOfYear = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
        const item: VocabCard = mod.MASTER_1000_VOCAB_DATABASE[dayOfYear % mod.MASTER_1000_VOCAB_DATABASE.length];
        setWordOfTheDay({
          word: item.item || 'Eloquent',
          meaning: item.definition || 'Advanced academic vocabulary item.',
          bangla: item.banglaMeaning || undefined,
          partOfSpeech: item.partOfSpeech || 'academic'
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const renderSkillsSection = () => (
    <section className="rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
            Four-Skill Practice &amp; Band Estimates
          </h2>
          <p className="text-xs text-[#566664] dark:text-slate-400 mt-0.5">
            Click any skill to practise. Practice estimates update as you complete drills and mock tests.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(500, 0.04);
            onNavigate('/progress');
          }}
          className="text-xs font-semibold text-[#0F4C45] dark:text-[#1F8A70] hover:underline whitespace-nowrap cursor-pointer self-start sm:self-auto"
        >
          Full analytics →
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {skillCards.map((skill) => {
          const Icon = skill.icon;
          const isPriority = diagnostic?.weakest === skill.id;
          const progressPct =
            skill.band !== null ? Math.min(100, Math.round((skill.band / targetBand) * 100)) : 0;

          return (
            <button
              key={skill.id}
              type="button"
              onClick={() => {
                soundManager.playBeep(480, 0.04);
                onNavigate(skill.path);
              }}
              className={`p-4 rounded-xl border text-left transition flex flex-col justify-between gap-3.5 cursor-pointer group ${
                isPriority
                  ? 'bg-[#FEF6E8]/60 dark:bg-[#F4A62A]/10 border-[#F4A62A]/60 hover:border-[#F4A62A]'
                  : 'bg-[#F7F9F8] dark:bg-[#0B1514] border-[#D3DDDA] dark:border-[#1F8A70]/25 hover:border-[#0F4C45] dark:hover:border-[#1F8A70]'
              }`}
            >
              <div className="flex items-start justify-between gap-3 w-full">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 flex items-center justify-center text-[#0F4C45] dark:text-[#1F8A70] shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-bold text-sm text-[#0E1F1E] dark:text-[#EEF3F1]">
                        {skill.name}
                      </h3>
                      {isPriority && (
                        <span className="text-[11px] font-semibold text-[#9B6314] dark:text-[#F4A62A]">
                          · Priority
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#566664] dark:text-slate-400 truncate">
                      {skill.desc}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono text-lg font-bold text-[#0E1F1E] dark:text-[#EEF3F1] tabular-nums leading-none">
                    {skill.band !== null ? skill.band.toFixed(1) : '—'}
                  </div>
                  <div className="text-[10px] text-[#566664] dark:text-slate-400 mt-1 whitespace-nowrap">
                    {skill.source}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 w-full">
                <div className="w-full h-1.5 rounded-full bg-[#D3DDDA]/70 dark:bg-[#11201E] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isPriority ? 'bg-[#F4A62A]' : 'bg-[#0F4C45] dark:bg-[#1F8A70]'
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#566664] dark:text-slate-400">
                  <span className="font-mono tabular-nums">
                    {skill.band !== null ? `Goal: ${targetBand.toFixed(1)}` : 'No attempts yet'}
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-[#0F4C45] dark:text-[#1F8A70] group-hover:translate-x-0.5 transition">
                    <span>Practise</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Full Mock Test Quick Strip */}
      <div className="pt-4 border-t border-[#EEF3F1] dark:border-[#1F8A70]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#EEF3F1] dark:bg-[#0B1514] flex items-center justify-center text-[#0F4C45] dark:text-[#1F8A70] shrink-0">
            <ClipboardCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-[#0E1F1E] dark:text-[#EEF3F1]">
              Full Computer-Delivered Mock Tests (5 Sets)
            </div>
            <p className="text-xs text-[#566664] dark:text-slate-400">
              Timed 40-question Listening &amp; Reading sittings with full post-test review.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(520, 0.04);
            onNavigate('/practice/mock-tests');
          }}
          className="min-h-[42px] px-4 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span>Open Mock Room</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </section>
  );

  const renderSidebarSection = () => (
    <>
      {/* 1. UNIFIED WEEKLY CONSISTENCY, STREAK & DAILY GOAL */}
      <section className="p-5 rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-base font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
            Weekly Momentum
          </h2>
          <div className="inline-flex items-center gap-1 text-xs font-mono font-bold text-[#9B6314] dark:text-[#F4A62A] tabular-nums">
            <Flame className="w-4 h-4 fill-[#F4A62A] text-[#F4A62A]" />
            <span>{streakDays}d streak</span>
          </div>
        </div>

        {/* 7-Day Activity Strip */}
        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((d) => (
            <div
              key={d.dayName}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition ${
                d.studied
                  ? 'bg-[#0F4C45] text-white border-[#0F4C45]'
                  : d.isToday
                  ? 'bg-[#EEF3F1] dark:bg-[#0B1514] text-[#0E1F1E] dark:text-[#EEF3F1] border-[#0F4C45]/50 dark:border-[#1F8A70]'
                  : 'bg-[#F7F9F8] dark:bg-[#0B1514] text-[#566664] dark:text-slate-400 border-[#EEF3F1] dark:border-[#1F8A70]/15'
              }`}
            >
              <span className="text-[10px] font-medium">{d.dayName}</span>
              <div className="mt-1">
                {d.studied ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#F4A62A]" />
                ) : (
                  <span className="block w-1.5 h-1.5 rounded-full bg-[#D3DDDA] dark:bg-slate-700 my-1" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Today's Study Goal */}
        <div className="pt-3 border-t border-[#EEF3F1] dark:border-[#1F8A70]/25 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#0E1F1E] dark:text-[#EEF3F1]">Today’s Goal</span>
            <span className="font-mono font-semibold text-[#0F4C45] dark:text-[#1F8A70] tabular-nums">
              {todayMinutesStudied} / {dailyGoalMinutes} min
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#EEF3F1] dark:bg-[#0B1514] overflow-hidden">
            <div
              className="h-full bg-[#1F8A70] rounded-full transition-all duration-300"
              style={{ width: `${goalPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#566664] dark:text-slate-400 font-mono tabular-nums">
            <span>Weekly XP: {weeklyXp} / {WEEKLY_XP_GOAL}</span>
            <span>{weeklyXpPercent}%</span>
          </div>
        </div>
      </section>

      {/* 2. DIAGNOSTIC & STUDY PLAN CARD */}
      <section className="p-5 rounded-2xl bg-[#EEF3F1] dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#0F4C45] dark:text-[#1F8A70]">
          <Compass className="w-4 h-4 shrink-0" />
          <span>{diagnostic ? 'Study Plan Active' : 'Diagnostic Baseline'}</span>
        </div>
        <h3 className="font-display text-base font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
          {diagnostic
            ? `Baseline ${diagnostic.scores.overall.toFixed(1)} → Target ${diagnostic.targetBand.toFixed(1)}`
            : 'Map your 4-skill baseline'}
        </h3>
        <p className="text-xs text-[#566664] dark:text-slate-400 leading-relaxed">
          {diagnostic
            ? `Your roadmap prioritises ${diagnostic.weakest} at ${diagnostic.dailyMinutes} min/day.`
            : 'Finish the 10-minute diagnostic to unlock a custom day-by-day study roadmap.'}
        </p>
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(520, 0.04);
              onNavigate(diagnostic ? '/learn/study-plan' : '/learn/diagnostic');
            }}
            className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>{diagnostic ? 'View Study Plan' : 'Start Diagnostic'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          {diagnostic && (
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(500, 0.04);
                onNavigate('/learn/diagnostic');
              }}
              className="min-h-[42px] px-3 py-2 rounded-xl bg-white dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-[#0E1F1E] dark:text-[#EEF3F1] font-semibold text-xs hover:border-[#0F4C45] transition cursor-pointer"
            >
              Retake
            </button>
          )}
        </div>
      </section>

      {/* 3. MISTAKE VAULT SUMMARY */}
      <section className="p-5 rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#F4A62A]" />
            <h3 className="font-display text-sm font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
              Mistake Vault
            </h3>
          </div>
          <span className="font-mono text-xs font-bold text-[#0F4C45] dark:text-[#1F8A70] tabular-nums">
            {mistakeCount} pending
          </span>
        </div>
        <p className="text-xs text-[#566664] dark:text-slate-400 leading-relaxed">
          {mistakeCount > 0
            ? `You have ${mistakeCount} missed ${mistakeCount === 1 ? 'item' : 'items'} queued for review.`
            : 'No unresolved mistakes logged yet. Missed drill questions are saved here automatically.'}
        </p>
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(520, 0.04);
            onNavigate('/progress/mistakes');
          }}
          className="w-full min-h-[40px] px-3.5 py-2 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] hover:bg-[#EEF3F1] dark:hover:bg-[#1F8A70]/20 border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-[#0E1F1E] dark:text-[#EEF3F1] font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>Open Mistake Vault</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </section>

      {/* 4. WORD OF THE DAY (With British Audio & বাংলা) */}
      <section className="p-5 rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 space-y-3">
        <div className="flex items-center justify-between text-xs text-[#566664] dark:text-slate-400">
          <span className="font-semibold text-[#0F4C45] dark:text-[#1F8A70]">Word of the Day</span>
          <span>{wordOfTheDay.partOfSpeech}</span>
        </div>

        <div className="space-y-1">
          <h3 className="font-display text-xl font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
            {wordOfTheDay.word}
          </h3>
          <p className="text-xs text-[#566664] dark:text-slate-300 leading-relaxed">
            {wordOfTheDay.meaning}
          </p>
          {wordOfTheDay.bangla && (
            <p className="text-xs font-medium text-[#0F4C45] dark:text-[#1F8A70] leading-relaxed">
              {wordOfTheDay.bangla}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(600, 0.04);
              speakBritish(wordOfTheDay.word);
              onShowToast(`Pronouncing "${wordOfTheDay.word}"`);
            }}
            className="flex-1 min-h-[40px] px-3 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Listen</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(480, 0.04);
              onNavigate('/learn/vocabulary');
            }}
            className="flex-1 min-h-[40px] px-3 py-2 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] hover:bg-[#EEF3F1] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-[#0E1F1E] dark:text-[#EEF3F1] font-semibold text-xs transition flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>Vocab Deck</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>
    </>
  );

  if (section === 'skills') {
    return renderSkillsSection();
  }
  if (section === 'sidebar') {
    return <div className="space-y-6">{renderSidebarSection()}</div>;
  }

  return (
    <div className="space-y-6">
      {renderSkillsSection()}
      {renderSidebarSection()}
    </div>
  );
};
