import React, { useState, useEffect } from 'react';
import { Target, CheckCircle2, Circle, ArrowRight, Sparkles, Clock, Flame, Zap } from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { DailySprintChallengeModal } from '../daily/DailySprintChallengeModal';

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
  bandImpact: string;
}

export const DailySprintMissionHub: React.FC<DailySprintMissionHubProps> = ({
  onNavigate,
  onShowToast
}) => {
  const todayKey = new Date().toISOString().split('T')[0];
  const storageKey = `ielts_sprint_missions_${todayKey}`;

  const defaultMissions: Mission[] = [
    {
      id: 'mission_listening',
      skill: 'Listening',
      title: 'Section 2 Audio Simulation',
      subtitle: 'Multiple choice & map directional cues in campus context',
      duration: '10 min',
      route: 'listening',
      bandImpact: '+0.5 Band in Section 2'
    },
    {
      id: 'mission_writing',
      skill: 'Writing',
      title: 'Task 2 Academic Thesis & Cohesion',
      subtitle: 'Construct 4-paragraph skeleton with contrastive linkers',
      duration: '15 min',
      route: 'essayarchitect',
      bandImpact: 'Coherence & Cohesion Boost'
    },
    {
      id: 'mission_speaking',
      skill: 'Speaking',
      title: 'Part 2 Cue Card Shadowing',
      subtitle: 'Practice authentic British Received Pronunciation & rhythm',
      duration: '8 min',
      route: 'shadowing',
      bandImpact: 'Fluency & Intonation'
    }
  ];

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

  const toggleMission = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (completedIds.includes(id)) {
      setCompletedIds(prev => prev.filter(item => item !== id));
      soundManager.playBeep(440, 0.04);
    } else {
      const next = [...completedIds, id];
      setCompletedIds(next);
      soundManager.playSuccess();
      if (next.length === defaultMissions.length) {
        onShowToast('🎉 Splendid work! All 3 Daily Sprints completed today!');
      } else {
        onShowToast('Sprint milestone recorded! Keep the momentum going.');
      }
    }
  };

  const [isChallengeOpen, setIsChallengeOpen] = useState(false);
  const progressPercent = Math.round((completedIds.length / defaultMissions.length) * 100);

  return (
    <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0B1224] border border-slate-200/90 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-3 sm:space-y-3.5">
      {/* Header with Title and Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Today's Study Sprint
            </h2>
            <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
              · Daily Goals
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Complete these 3 micro-drills to maintain your daily study streak and target Band 7.5+
          </p>
        </div>

        {/* Progress Bar & Counter */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="text-xs font-mono font-bold text-slate-900 dark:text-white">
              {completedIds.length} of {defaultMissions.length} Done
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              {progressPercent}% Complete
            </div>
          </div>
          <div className="w-16 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 5-Minute Daily Sprint Diagnostic Banner */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-blue-500/10 border border-amber-500/30 dark:border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 font-bold shadow-xs">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                5-Minute Daily Sprint Diagnostic
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                +1 STREAK BOOSTER
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
              5 rapid exam drills (Listening trap, Reading inference, C1 Collocation, Grammar, Speaking turn).
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(640, 0.04);
            setIsChallengeOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-black text-xs transition flex items-center justify-center gap-1.5 shrink-0 shadow-sm active:scale-95 cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
          <span>Launch Sprint Drill</span>
        </button>
      </div>

      {/* Mission Cards List */}
      <div className="space-y-2.5">
        {defaultMissions.map((mission, idx) => {
          const isDone = completedIds.includes(mission.id);
          return (
            <div
              key={mission.id}
              onClick={() => {
                soundManager.playBeep(560, 0.04);
                onNavigate(mission.route);
              }}
              className={`p-3.5 sm:p-4 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer group ${
                isDone
                  ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 opacity-80'
                  : 'bg-white dark:bg-[#13203D] hover:bg-slate-50/80 dark:hover:bg-[#17274A] border-slate-200/80 dark:border-slate-800 hover:border-blue-400/80 dark:hover:border-blue-500/80 shadow-2xs'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Interactive Checkbox */}
                <button
                  type="button"
                  onClick={(e) => toggleMission(mission.id, e)}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition cursor-pointer ${
                    isDone
                      ? 'bg-emerald-500 text-white'
                      : 'border-2 border-slate-300 dark:border-slate-600 hover:border-blue-500 text-transparent'
                  }`}
                  aria-label={isDone ? 'Mark as incomplete' : 'Mark as complete'}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>

                {/* Details */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                      {mission.skill}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {mission.duration}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      {mission.bandImpact}
                    </span>
                  </div>
                  <h3
                    className={`text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition truncate ${
                      isDone ? 'line-through text-slate-400 dark:text-slate-500' : ''
                    }`}
                  >
                    {mission.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {mission.subtitle}
                  </p>
                </div>
              </div>

              {/* Action arrow */}
              <div className="flex items-center gap-1 shrink-0 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition text-xs font-semibold">
                <span className="hidden sm:inline">Launch</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Completion Banner if all 3 done */}
      {completedIds.length === defaultMissions.length && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">🏆</span>
            <div>
              <span className="font-bold">Daily Sprint Milestone Achieved!</span>
              <span className="text-emerald-700 dark:text-emerald-400 ml-1.5">
                Target band score predictability increased by +0.3.
              </span>
            </div>
          </div>
          <button
            onClick={() => onNavigate('mocktest')}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer shrink-0"
          >
            Take Full Mock
          </button>
        </div>
      )}

      {/* 5-Minute Daily Sprint Diagnostic Modal */}
      <DailySprintChallengeModal
        isOpen={isChallengeOpen}
        onClose={() => setIsChallengeOpen(false)}
        onShowToast={onShowToast}
      />
    </section>
  );
};
