import React, { useState } from 'react';
import {
  ArrowLeft,
  PenTool,
  BarChart3,
  Lightbulb,
  Clock,
  Sparkles,
  BookOpen,
  Award
} from 'lucide-react';
import { AIMockSuite } from '../AIMockSuite';
import { Task1Visualizer } from '../Task1Visualizer';
import { ArgumentMatrix } from '../ArgumentMatrix';
import { soundManager } from '../../utils/audioEffects';

interface WritingLabPageProps {
  onBack: () => void;
  userApiKey?: string;
  initialText?: string;
  initialPrompt?: string;
  onShowToast: (msg: string) => void;
  onTransferToMock: (text: string, title: string) => void;
}

export const WritingLabPage: React.FC<WritingLabPageProps> = ({
  onBack,
  initialText,
  initialPrompt,
  onShowToast,
  onTransferToMock
}) => {
  const [activeTab, setActiveTab] = useState<'task2' | 'task1' | 'pestle'>('task2');

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 animate-fade-in pb-16">
      {/* Top Bar with Back Button & Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Practice</span>
        </button>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('task2');
              soundManager.playBeep(600, 0.04);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'task2'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PenTool className="w-3.5 h-3.5 text-purple-600" />
            <span>Task 2 Essay Suite</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('task1');
              soundManager.playBeep(600, 0.04);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'task1'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
            <span>Task 1 Visualizer</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('pestle');
              soundManager.playBeep(600, 0.04);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'pestle'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
            <span>Idea Generator</span>
          </button>
        </div>
      </div>

      {/* Main Mode View */}
      {activeTab === 'task2' && (
        <AIMockSuite
          initialPrompt={initialPrompt}
          initialText={initialText || ''}
          onShowToast={onShowToast}
        />
      )}

      {activeTab === 'task1' && (
        <Task1Visualizer onShowToast={onShowToast} />
      )}

      {activeTab === 'pestle' && (
        <ArgumentMatrix
          onTransferToMock={(paragraph) => {
            onTransferToMock(paragraph, 'PESTLE Matrix Essay Arguments');
            setActiveTab('task2');
          }}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
