import React from 'react';
import { Target, Calendar, Flame, ArrowRight, Sparkles } from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { BandSprintMark } from '../common/BandSprintMark';

interface LondonSunsetHeroBannerProps {
  userName: string;
  targetBand: number;
  testDate: string;
  streakDays: number;
  onContinueLearning: () => void;
  onTakeDiagnostic: () => void;
  onOpenBandModal: () => void;
}

export const LondonSunsetHeroBanner: React.FC<LondonSunsetHeroBannerProps> = ({
  userName,
  targetBand,
  testDate,
  streakDays,
  onContinueLearning,
  onTakeDiagnostic,
  onOpenBandModal
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#0F4C45] text-white border border-[#1F8A70]/40 shadow-sm p-6 sm:p-8 select-none">
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#F4A62A]/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <BandSprintMark size={36} variant="dark" />
            <div>
              <span className="text-xs font-mono font-semibold tracking-wide text-[#F4A62A] uppercase">
                BandSprint Education
              </span>
              <p className="text-sm font-medium text-[#EEF3F1]/90">Reach your band.</p>
            </div>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Welcome back, {userName}
          </h1>
          <p className="text-sm text-[#EEF3F1]/80 max-w-lg">
            Your personalized IELTS-style daily practice session. Maintain your momentum and reach your target band.
          </p>
        </div>

        {/* Right side actions & metrics */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(520, 0.04);
              onOpenBandModal();
            }}
            className="px-3.5 py-2.5 rounded-xl bg-[#11201E]/60 hover:bg-[#11201E]/90 border border-[#1F8A70]/40 flex items-center gap-2 transition cursor-pointer"
            title="Click to adjust Target Band"
          >
            <Target className="w-4 h-4 text-[#F4A62A]" />
            <span className="text-xs font-mono font-semibold text-white">
              Band {targetBand.toFixed(1)}
            </span>
          </button>

          <div className="px-3.5 py-2.5 rounded-xl bg-[#11201E]/60 border border-[#1F8A70]/40 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#EEF3F1]/80" />
            <span className="text-xs font-mono font-semibold text-white">
              {testDate || 'Exam Ready'}
            </span>
          </div>

          <div className="px-3.5 py-2.5 rounded-xl bg-[#11201E]/60 border border-[#1F8A70]/40 flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#F4A62A] fill-[#F4A62A]" />
            <span className="text-xs font-mono font-semibold text-[#F4A62A]">
              {streakDays}d streak
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              soundManager.playSuccess();
              onContinueLearning();
            }}
            className="px-5 py-2.5 rounded-xl bg-[#F4A62A] hover:bg-[#e09522] text-[#0E1F1E] font-bold text-xs shadow-sm transition flex items-center gap-2 cursor-pointer"
          >
            <span>Continue Practice</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
