import React, { useState } from 'react';
import {
  ArrowLeft,
  PenTool,
  BarChart3,
  Lightbulb,
  MonitorCheck,
  Sparkles
} from 'lucide-react';
import { AIMockSuite } from '../AIMockSuite';
import { Task1Visualizer } from '../Task1Visualizer';
import { ArgumentMatrix } from '../ArgumentMatrix';
import { CDIELTSWritingExamRoom, convertDraftToWritingTestSet } from '../cdielts/CDIELTSWritingExamRoom';
import { CandidateAiPilotPanel } from '../common/CandidateAiPilotPanel';
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
  const [activeTab, setActiveTab] = useState<'cd_exam_room' | 'task2' | 'task1' | 'pestle' | 'ai_pilots'>('cd_exam_room');
  const [customPilotSet, setCustomPilotSet] = useState<any>(null);

  // Default 100vh CD-IELTS Writing Practice Room
  if (activeTab === 'cd_exam_room') {
    return (
      <div className="fixed inset-0 z-40 bg-[#F7F9F8] dark:bg-[#0B1514] overflow-hidden">
        <CDIELTSWritingExamRoom
          onExit={onBack}
          onShowToast={onShowToast}
          initialText={initialText}
          initialPrompt={initialPrompt}
          customPilotSet={customPilotSet}
          onExitPilot={() => {
            setCustomPilotSet(null);
            onShowToast('Exited AI Writing Pilot and restored standard Writing sets.');
          }}
          onOpenAiPilots={() => {
            setActiveTab('ai_pilots');
            soundManager.playBeep(620, 0.04);
          }}
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
          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 hover:border-[#0F4C45] text-[#0E1F1E] dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <div className="flex items-center gap-1 p-1 bg-[#EEF3F1] dark:bg-[#0B1514] rounded-xl border border-[#D3DDDA] dark:border-[#1F8A70]/30 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('cd_exam_room');
              soundManager.playBeep(600, 0.04);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 text-[#0F4C45] dark:text-[#F4A62A] hover:bg-white/70 dark:hover:bg-[#11201E] cursor-pointer"
          >
            <MonitorCheck className="w-3.5 h-3.5" />
            <span>CD-IELTS Writing Room</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('ai_pilots');
              soundManager.playBeep(620, 0.04);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ai_pilots'
                ? 'bg-[#0F4C45] text-white'
                : 'text-[#566664] dark:text-slate-300 hover:text-[#0E1F1E]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Pilots</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('task1');
              soundManager.playBeep(600, 0.04);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'task1'
                ? 'bg-[#0F4C45] text-white'
                : 'text-[#566664] dark:text-slate-300 hover:text-[#0E1F1E]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Task 1 Visualizer</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('pestle');
              soundManager.playBeep(600, 0.04);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'pestle'
                ? 'bg-[#0F4C45] text-white'
                : 'text-[#566664] dark:text-slate-300 hover:text-[#0E1F1E]'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Idea Generator</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('task2');
              soundManager.playBeep(600, 0.04);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'task2'
                ? 'bg-[#0F4C45] text-white'
                : 'text-[#566664] dark:text-slate-300 hover:text-[#0E1F1E]'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Practice Sandbox</span>
          </button>
        </div>
      </div>

      {/* Auxiliary Practice Views */}
      {activeTab === 'ai_pilots' && (
        <CandidateAiPilotPanel
          module="writing"
          moduleTitle="Writing"
          onLaunchApprovedPilot={(examSet) => {
            const converted = convertDraftToWritingTestSet(examSet);
            setCustomPilotSet(converted);
            soundManager.playSuccess();
            onShowToast(`Launched Approved AI Writing Pilot: "${converted.title}"`);
            setActiveTab('cd_exam_room');
          }}
        />
      )}

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

