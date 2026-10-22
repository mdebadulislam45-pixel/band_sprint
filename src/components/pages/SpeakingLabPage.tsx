import React, { useState } from 'react';
import {
  ArrowLeft,
  Mic,
  Volume2,
  Clock,
  Sparkles,
  Award,
  FileText,
  Play,
  RotateCcw,
  Headphones
} from 'lucide-react';
import { VoiceExaminer } from '../VoiceExaminer';
import { CueScratchpad } from '../CueScratchpad';
import { ShadowingPractice } from '../speaking/ShadowingPractice';
import { soundManager } from '../../utils/audioEffects';

interface SpeakingLabPageProps {
  onBack: () => void;
  onGradeInMock: (text: string, title: string) => void;
  onShowToast: (msg: string) => void;
  onNavigateToVault?: () => void;
}

export const SpeakingLabPage: React.FC<SpeakingLabPageProps> = ({
  onBack,
  onGradeInMock,
  onShowToast,
  onNavigateToVault
}) => {
  const [activeTab, setActiveTab] = useState<'interview' | 'cuecard' | 'shadowing'>('interview');

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 animate-fade-in pb-16">
      {/* Top Bar with Back Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Practice</span>
        </button>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <button
            onClick={() => {
              setActiveTab('interview');
              soundManager.playBeep(600, 0.04);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'interview'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-rose-600" />
            <span>Examiner Interview</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('shadowing');
              soundManager.playBeep(600, 0.04);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'shadowing'
                ? 'bg-white text-rose-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Headphones className="w-3.5 h-3.5 text-rose-600" />
            <span>Shadowing Practice</span>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
          </button>

          <button
            onClick={() => {
              setActiveTab('cuecard');
              soundManager.playBeep(600, 0.04);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'cuecard'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Cue Card Scratchpad</span>
          </button>
        </div>
      </div>

      {/* Main Mode View */}
      {activeTab === 'interview' ? (
        <VoiceExaminer
          onGradeInMock={onGradeInMock}
          onShowToast={onShowToast}
        />
      ) : activeTab === 'shadowing' ? (
        <ShadowingPractice
          onShowToast={onShowToast}
          onNavigateToVault={onNavigateToVault}
        />
      ) : (
        <CueScratchpad
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
