import React, { useState, useEffect } from 'react';
import { CheckCircle2, ArrowRight, Clock, Zap } from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { dispatchBarnabyEvent } from '../../services/barnabyRoamEngine';
import { DailySprintChallengeModal } from '../daily/DailySprintChallengeModal';
import {
  recordMissionComplete,
  recordAllMissionsBonus,
  recordDailyChallengeComplete,
  XP_PER_MISSION,
  XP_ALL_MISSIONS_BONUS
} from '../../services/streakService';

interface DailySprintMissionHubProps {
  onNavigate: (module: string) => void;
  onShowToast: (msg: string) => void;
}

interface Mission {
  id: string;
  skill: string;
  title: string;
  subtitle: string;
  duration: string;
  route: string;
  focusTag: string;
}

const DEFAULT_MISSIONS: Mission[] = [
  {
    id: 'mission_listening',
    skill: 'Listening',
    title: 'Section 2 Audio Simulation',
    subtitle: 'Multiple choice & map directional cues in a campus context',
    duration: '10 min',
    route: '/practice/listening',
    focusTag: 'Distractor accuracy'
  },
  {
    id: 'mission_writing',
    skill: 'Writing',
    title: 'Task 2 Thesis & Cohesion Drill',
    subtitle: 'Build a 4-paragraph essay plan with natural contrastive linkers',
    duration: '15 min',
    route: '/practice/writing',
    focusTag: 'Coherence & Cohesion'
  },
  {
    id: 'mission_speaking',
    skill: 'Speaking',
    title: 'Part 2 Cue Card & Fluency Run',
    subtitle: 'Practise structured 2-minute delivery with British prompts',
    duration: '8 min',
    route: '/practice/speaking',
    focusTag: 'Fluency & Pacing'
  }
];

export const DailySprintMissionHub: React.FC<DailySprintMissionHubProps> = ({
  onNavigate,
  onShowToast
}) => {
  const todayKey = new Date().toISOString().split('T')[0];
  const storageKey = `ielts_sprint_missions_${todayKey}`;

  const [completedIds, setCompletedIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(completedIds));
    } catch {
      // storage unavailable
    }
  }, [completedIds, storageKey]);

  const [isChallengeOpen, setIsChallengeOpen] = useState(false);

  const toggleMission = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (completedIds.includes(id)) {
      setCompletedIds((prev) => prev.filter((item) => item !== id));
      soundManager.playBeep(440, 0.04);
    } else {
      const next = [...completedIds, id];
      setCompletedIds(next);
      soundManager.playSuccess();
      recordMissionComplete(id);
      if (next.length === DEFAULT_MISSIONS.length) {
        recordAllMissionsBonus();
        onShowToast(
          `All 3 daily tasks completed! +${XP_PER_MISSION * 3 + XP_ALL_MISSIONS_BONUS} XP earned.`
        );
        dispatchBarnabyEvent('achievement', {
          message: 'All 3 daily study tasks complete! Brilliant consistency — better than yesterday!'
        });
      } else {
        onShowToast(`Task completed! +${XP_PER_MISSION} XP recorded.`);
        dispatchBarnabyEvent('task_completed', {
          message: 'Nice work completing a study task! Keep that steady rhythm going.'
        });
      }
      window.dispatchEvent(new CustomEvent('bandsprint_streak_updated'));
    }
  };

  const progressPercent = Math.round((completedIds.length / DEFAULT_MISSIONS.length) * 100);

  return (
    <section className="rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 p-5 sm:p-6 space-y-5">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EEF3F1] dark:border-[#1F8A70]/25">
        <div>
          <h2 className="font-display text-lg font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
            Today’s Study Tasks
          </h2>
          <p className="text-xs text-[#566664] dark:text-slate-400 mt-0.5">
            Time-boxed daily drills to build steady momentum across Listening, Writing, and Speaking.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-xs font-mono font-bold text-[#0E1F1E] dark:text-[#EEF3F1] tabular-nums">
              {completedIds.length} / {DEFAULT_MISSIONS.length} done
            </div>
            <div className="text-[11px] text-[#566664] dark:text-slate-400 font-mono tabular-nums">
              {progressPercent}%
            </div>
          </div>
          <div className="w-20 h-2 bg-[#EEF3F1] dark:bg-[#0B1514] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0F4C45] dark:bg-[#1F8A70] rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Checklist Rows */}
      <div className="divide-y divide-[#EEF3F1] dark:divide-[#1F8A70]/20 -mx-2">
        {DEFAULT_MISSIONS.map((mission) => {
          const isDone = completedIds.includes(mission.id);
          return (
            <div
              key={mission.id}
              onClick={() => {
                soundManager.playBeep(560, 0.04);
                onNavigate(mission.route);
              }}
              className={`px-2 py-3.5 rounded-xl transition flex items-center justify-between gap-3 cursor-pointer group ${
                isDone
                  ? 'opacity-70 hover:bg-[#F7F9F8] dark:hover:bg-[#0B1514]/50'
                  : 'hover:bg-[#F7F9F8] dark:hover:bg-[#0B1514]/70'
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <button
                  type="button"
                  onClick={(e) => toggleMission(mission.id, e)}
                  className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition cursor-pointer ${
                    isDone
                      ? 'bg-[#0F4C45] dark:bg-[#1F8A70] text-white'
                      : 'border-2 border-[#D3DDDA] dark:border-[#1F8A70]/50 hover:border-[#0F4C45] text-transparent'
                  }`}
                  aria-label={isDone ? 'Mark task incomplete' : 'Mark task complete'}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>

                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 text-xs text-[#566664] dark:text-slate-400 flex-wrap">
                    <span className="font-semibold text-[#0F4C45] dark:text-[#1F8A70]">
                      {mission.skill}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                      <Clock className="w-3 h-3" />
                      {mission.duration}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{mission.focusTag}</span>
                  </div>
                  <h3
                    className={`text-sm font-semibold text-[#0E1F1E] dark:text-[#EEF3F1] group-hover:text-[#0F4C45] dark:group-hover:text-[#1F8A70] transition truncate ${
                      isDone ? 'line-through text-[#566664] dark:text-slate-500' : ''
                    }`}
                  >
                    {mission.title}
                  </h3>
                  <p className="text-xs text-[#566664] dark:text-slate-400 truncate">
                    {mission.subtitle}
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 shrink-0 text-xs font-semibold text-[#0F4C45] dark:text-[#1F8A70] group-hover:translate-x-0.5 transition">
                <span className="hidden sm:inline">Start</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          );
        })}
      </div>

      {/* 5-Minute Rapid Sprint Blitz Strip */}
      <div className="pt-4 border-t border-[#EEF3F1] dark:border-[#1F8A70]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="text-sm font-semibold text-[#0E1F1E] dark:text-[#EEF3F1]">
            Short on time? Run the 5-Minute Daily Blitz
          </div>
          <p className="text-xs text-[#566664] dark:text-slate-400">
            5 rapid drills covering Listening traps, Reading inference, C1 collocations, grammar, and Speaking.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(640, 0.04);
            setIsChallengeOpen(true);
          }}
          className="min-h-[42px] px-4 py-2 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] hover:bg-[#D3DDDA] dark:hover:bg-[#1F8A70]/20 text-[#0F4C45] dark:text-[#EEF3F1] border border-[#D3DDDA] dark:border-[#1F8A70]/35 font-semibold text-xs transition flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5 text-[#F4A62A]" />
          <span>Start 5-Min Blitz</span>
        </button>
      </div>

      {completedIds.length === DEFAULT_MISSIONS.length && (
        <div className="p-3.5 rounded-xl bg-[#EEF3F1] dark:bg-[#0F4C45]/30 border border-[#1F8A70]/40 flex flex-wrap items-center justify-between gap-3 text-xs text-[#0E1F1E] dark:text-[#EEF3F1]">
          <div>
            <span className="font-bold">Daily Sprint completed.</span>{' '}
            <span className="text-[#566664] dark:text-slate-300">
              +{XP_PER_MISSION * 3 + XP_ALL_MISSIONS_BONUS} XP recorded today. Ready for a full timed sitting?
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/practice/mock-tests')}
            className="px-3.5 py-2 rounded-lg bg-[#0F4C45] hover:bg-[#0B3833] text-white font-semibold text-xs transition whitespace-nowrap cursor-pointer"
          >
            Open Mock Tests
          </button>
        </div>
      )}

      <DailySprintChallengeModal
        isOpen={isChallengeOpen}
        onClose={() => setIsChallengeOpen(false)}
        onShowToast={onShowToast}
        onStreakUpdate={() => {
          recordDailyChallengeComplete();
          window.dispatchEvent(new CustomEvent('bandsprint_streak_updated'));
        }}
      />
    </section>
  );
};
