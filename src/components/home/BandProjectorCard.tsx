import React, { useState } from 'react';
import { Target, CheckCircle2, ArrowRight, HelpCircle, Sparkles } from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { updateCurrentUserProfile } from '../../utils/userStorage';

interface BandProjectorCardProps {
  currentTargetBand: number;
  examMode: 'Academic' | 'General Training';
  onUpdateTargetBand?: (band: number) => void;
  onOpenBandModal: () => void;
}

interface BandRequirement {
  listeningRaw: string;
  readingRaw: string;
  writingFocus: string;
  speakingFocus: string;
  studyHoursWeek: number;
}

const BAND_DATA: Record<string, BandRequirement> = {
  '6.5': {
    listeningRaw: '26 - 29 / 40',
    readingRaw: '27 - 29 / 40',
    writingFocus: 'Clear thesis & paragraphing; avoid run-ons',
    speakingFocus: 'Speak at length without unnatural hesitation',
    studyHoursWeek: 6
  },
  '7.0': {
    listeningRaw: '30 - 31 / 40',
    readingRaw: '30 - 32 / 40',
    writingFocus: 'Logical cohesion linkers & varied complex clauses',
    speakingFocus: 'Flexible idiom use & natural self-correction',
    studyHoursWeek: 8
  },
  '7.5': {
    listeningRaw: '32 - 34 / 40',
    readingRaw: '33 - 34 / 40',
    writingFocus: 'Nuanced topic stance, high-level academic collocations',
    speakingFocus: 'Effortless discourse flow with varied pitch stress',
    studyHoursWeek: 10
  },
  '8.0': {
    listeningRaw: '35 - 36 / 40',
    readingRaw: '35 - 36 / 40',
    writingFocus: 'Flawless paragraph progression & rare minor slips',
    speakingFocus: 'Accurate nuanced idioms & idiomatic phrasing',
    studyHoursWeek: 14
  },
  '8.5': {
    listeningRaw: '37 - 38 / 40',
    readingRaw: '37 - 38 / 40',
    writingFocus: 'Sophisticated natural academic style with zero lapses',
    speakingFocus: 'Native-like precision, subtle connotations',
    studyHoursWeek: 18
  }
};

export const BandProjectorCard: React.FC<BandProjectorCardProps> = ({
  currentTargetBand,
  examMode,
  onUpdateTargetBand,
  onOpenBandModal
}) => {
  const [selectedBand, setSelectedBand] = useState<string>(() => {
    const formatted = currentTargetBand.toFixed(1);
    return BAND_DATA[formatted] ? formatted : '7.5';
  });

  const req = BAND_DATA[selectedBand] || BAND_DATA['7.5'];

  const handleSelect = (bandKey: string) => {
    setSelectedBand(bandKey);
    soundManager.playBeep(600, 0.04);
  };

  const handleApplyTarget = () => {
    const numeric = parseFloat(selectedBand);
    updateCurrentUserProfile({ targetBand: numeric });
    onUpdateTargetBand?.(numeric);
    soundManager.playSuccess();
  };

  return (
    <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0B1224] border border-slate-200/90 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              Target Band Projector
            </h3>
            <span className="text-[10px] text-slate-400">
              Raw score requirements for Practice {examMode}
            </span>
          </div>
        </div>

        <button
          onClick={onOpenBandModal}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
          title="Open Calculator"
        >
          Calculator
        </button>
      </div>

      {/* Target Selector Buttons */}
      <div className="grid grid-cols-5 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/60 rounded-xl">
        {['6.5', '7.0', '7.5', '8.0', '8.5'].map((bandKey) => {
          const isSelected = selectedBand === bandKey;
          return (
            <button
              key={bandKey}
              onClick={() => handleSelect(bandKey)}
              className={`py-1.5 text-xs font-mono font-bold rounded-lg transition cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {bandKey}
            </button>
          );
        })}
      </div>

      {/* Breakdown Metrics */}
      <div className="space-y-2.5 text-xs">
        {/* Listening & Reading Raw Target */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">
              Listening Raw
            </span>
            <span className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-0.5 block">
              {req.listeningRaw}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">
              Reading Raw
            </span>
            <span className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-0.5 block">
              {req.readingRaw}
            </span>
          </div>
        </div>

        {/* Writing Focus */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
          <div className="text-[10px] font-bold text-slate-400 uppercase font-mono">
            Writing Key Milestone
          </div>
          <div className="text-[11px] text-slate-700 dark:text-slate-300 font-medium mt-0.5">
            {req.writingFocus}
          </div>
        </div>

        {/* Speaking Focus */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
          <div className="text-[10px] font-bold text-slate-400 uppercase font-mono">
            Speaking Key Milestone
          </div>
          <div className="text-[11px] text-slate-700 dark:text-slate-300 font-medium mt-0.5">
            {req.speakingFocus}
          </div>
        </div>
      </div>

      {/* Save as Target Band Button */}
      {parseFloat(selectedBand) !== currentTargetBand && (
        <button
          onClick={handleApplyTarget}
          className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
        >
          <span>Set Band {selectedBand} as My Goal</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
