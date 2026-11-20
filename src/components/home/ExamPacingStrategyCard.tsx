import React, { useState, useEffect } from 'react';
import { Clock, Play, Pause, RotateCcw, AlertCircle, CheckCircle2, ChevronRight, Zap } from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';

interface ExamPacingStrategyCardProps {
  onShowToast: (msg: string) => void;
  onNavigate: (module: string) => void;
}

type PacingModule = 'reading' | 'writing' | 'listening';

interface PacingRule {
  phase: string;
  recommendedMinutes: string;
  tip: string;
}

const PACING_DATA: Record<PacingModule, { title: string; totalTime: string; rules: PacingRule[]; quickTimerSec: number }> = {
  reading: {
    title: 'Academic Reading Pacing',
    totalTime: '60 Minutes · 3 Passages · 40 Questions',
    quickTimerSec: 20 * 60, // 20 mins for 1 passage
    rules: [
      { phase: 'Passage 1 (Factual)', recommendedMinutes: '15 - 17 min', tip: 'Reserve at least 23 min for the complex Passage 3 argument.' },
      { phase: 'Passage 2 (Analytical)', recommendedMinutes: '18 - 20 min', tip: 'Scan headings before reading body paragraphs.' },
      { phase: 'Passage 3 (Academic Discussion)', recommendedMinutes: '23 - 25 min', tip: 'Watch for subtle writer tone and counter-argument nuances.' }
    ]
  },
  writing: {
    title: 'Writing Task 1 & 2 Pacing',
    totalTime: '60 Minutes · 2 Tasks · 400+ Words',
    quickTimerSec: 40 * 60, // 40 mins for Task 2
    rules: [
      { phase: 'Task 1 (Report / Chart)', recommendedMinutes: '20 min max', tip: 'Dedicate 3 min to find trends, 14 min writing, 3 min checking figures.' },
      { phase: 'Task 2 Planning & Thesis', recommendedMinutes: '5 min', tip: 'Never skip planning: brain-sketch 2 main arguments & linkers.' },
      { phase: 'Task 2 Drafting & Proofing', recommendedMinutes: '35 min', tip: 'Leave 4 min at the end to correct singular/plural and verb agreements.' }
    ]
  },
  listening: {
    title: 'Listening Protocol',
    totalTime: '30 Min Audio + 10 Min Transfer (Paper) / 2 Min (CD)',
    quickTimerSec: 10 * 60,
    rules: [
      { phase: 'Pre-Audio Preview Window', recommendedMinutes: '30 - 45 sec/section', tip: 'Underline question anchor keywords before audio starts.' },
      { phase: 'Active Audio Stream', recommendedMinutes: 'Single-play only', tip: 'If you miss an answer, move forward immediately to avoid a domino effect.' },
      { phase: 'Transfer & Grammar Check', recommendedMinutes: '10 min (Paper) / 2 min (CD)', tip: 'Verify spelling, word count restrictions, and noun plurals.' }
    ]
  }
};

export const ExamPacingStrategyCard: React.FC<ExamPacingStrategyCardProps> = ({
  onShowToast,
  onNavigate
}) => {
  const [selectedModule, setSelectedModule] = useState<PacingModule>('writing');
  const [timerSeconds, setTimerSeconds] = useState<number>(40 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  const currentData = PACING_DATA[selectedModule];

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            soundManager.playCelebration();
            onShowToast('⏰ Practice Time Up! Review your work with Practice descriptors.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSeconds, onShowToast]);

  const handleModuleSelect = (mod: PacingModule) => {
    setSelectedModule(mod);
    setIsTimerRunning(false);
    setTimerSeconds(PACING_DATA[mod].quickTimerSec);
    soundManager.playBeep(560, 0.04);
  };

  const handleToggleTimer = () => {
    soundManager.playBeep(640, 0.04);
    setIsTimerRunning(!isTimerRunning);
  };

  const handleResetTimer = (presetMins?: number) => {
    soundManager.playBeep(440, 0.04);
    setIsTimerRunning(false);
    setTimerSeconds((presetMins || currentData.quickTimerSec / 60) * 60);
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0B1224] border border-slate-200/90 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-3.5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Exam Time & Pacing Strategizer
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Practice time management benchmarks & live sprint timer
            </p>
          </div>
        </div>

        {/* Module Switcher Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900/60 rounded-xl self-start sm:self-auto">
          {(['writing', 'reading', 'listening'] as PacingModule[]).map((mod) => (
            <button
              key={mod}
              onClick={() => handleModuleSelect(mod)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition cursor-pointer ${
                selectedModule === mod
                  ? 'bg-white dark:bg-[#0B1224] text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {mod}
            </button>
          ))}
        </div>
      </div>

      {/* Grid: Strategy Breakdown (Left) + Interactive Live Practice Timer (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Pacing Rules List (8 cols) */}
        <div className="md:col-span-7 space-y-2.5">
          <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wide">
            {currentData.totalTime}
          </div>

          <div className="space-y-2">
            {currentData.rules.map((rule, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-slate-50/70 dark:bg-[#0D182E] border border-slate-200/60 dark:border-slate-800 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                  <span>{rule.phase}</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">
                    {rule.recommendedMinutes}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  💡 {rule.tip}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Sprint Stopwatch / Timer (5 cols) */}
        <div className="md:col-span-5 p-4 rounded-2xl bg-linear-to-b from-slate-50 to-indigo-50/30 dark:from-slate-900/40 dark:to-indigo-950/20 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-3">
          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-mono">
            {selectedModule.toUpperCase()} Sprint Timer
          </span>

          <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
            {formatTimer(timerSeconds)}
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-1.5">
            {[5, 15, 20, 40].map((mins) => (
              <button
                key={mins}
                onClick={() => handleResetTimer(mins)}
                className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 transition cursor-pointer"
              >
                {mins}m
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 pt-1 w-full">
            <button
              onClick={handleToggleTimer}
              className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer ${
                isTimerRunning
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isTimerRunning ? 'Pause' : 'Start Timer'}</span>
            </button>

            <button
              onClick={() => handleResetTimer()}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
              title="Reset Timer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
