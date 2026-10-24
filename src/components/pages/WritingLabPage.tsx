import React, { useState } from 'react';
import {
  ArrowLeft,
  PenTool,
  BarChart3,
  Lightbulb,
  MonitorCheck
} from 'lucide-react';
import { AIMockSuite } from '../AIMockSuite';
import { Task1Visualizer } from '../Task1Visualizer';
import { ArgumentMatrix } from '../ArgumentMatrix';
import { CDIELTSWritingExamRoom } from '../cdielts/CDIELTSWritingExamRoom';
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
  const [activeTab, setActiveTab] = useState<'cd_exam_room' | 'task2' | 'task1' | 'pestle'>('cd_exam_room');

  // Default 100vh Official CD-IELTS Writing Examination Room
  if (activeTab === 'cd_exam_room') {
    return (
      <div className="fixed inset-0 z-40 bg-slate-100 dark:bg-slate-950 overflow-hidden">
        <CDIELTSWritingExamRoom
          onExit={onBack}
          onShowToast={onShowToast}
          initialText={initialText}
          initialPrompt={initialPrompt}
          onOpenAuxiliaryLabs={() => {
            setActiveTab('task1');
            soundManager.playBeep(600, 0.04);
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 animate-fade-in pb-16">
      {/* Top Bar with Back Button & Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('cd_exam_room');
              soundManager.playBeep(600, 0.04);
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 cursor-pointer"
          >
            <MonitorCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Official CD-IELTS Writing Room</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('task1');
              soundManager.playBeep(600, 0.04);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'task1'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
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
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'pestle'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
            <span>Idea Generator</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('task2');
              soundManager.playBeep(600, 0.04);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'task2'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <PenTool className="w-3.5 h-3.5 text-purple-600" />
            <span>Practice Sandbox</span>
          </button>
        </div>
      </div>

      {/* Auxiliary Practice Views */}
      {activeTab === 'task2' && (
        <AIMockSuite
          initialPrompt={initialPrompt}
          initialText={initialText || ''}
          onShowToast={onShowToast}
        />
      )}

      {activeTab === 'task1' && <Task1Visualizer onShowToast={onShowToast} />}

      {activeTab === 'pestle' && (
        <ArgumentMatrix
          onTransferToMock={(paragraph) => {
            onTransferToMock(paragraph, 'PESTLE Matrix Essay Arguments');
            setActiveTab('cd_exam_room');
          }}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
