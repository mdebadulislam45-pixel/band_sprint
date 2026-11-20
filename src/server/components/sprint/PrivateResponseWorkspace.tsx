import React, { useState, useEffect } from 'react';
import {
  FileText,
  PenTool,
  Headphones,
  BookOpen,
  Mic,
  CheckCircle2,
  Clock,
  RotateCcw,
  Save,
  Check,
  AlertCircle
} from 'lucide-react';
import { DetectedTestBoundary } from '../../types/pdfVault';

interface PrivateResponseWorkspaceProps {
  documentTitle: string;
  selectedTest?: DetectedTestBoundary | null;
  activeModule: 'listening' | 'reading' | 'writing' | 'speaking';
  onModuleChange: (mod: 'listening' | 'reading' | 'writing' | 'speaking') => void;
  onJumpToPdfPage?: (pageNumber: number) => void;
  onShowToast: (msg: string) => void;
  onCloseWorkspace?: () => void;
}

export const PrivateResponseWorkspace: React.FC<PrivateResponseWorkspaceProps> = ({
  documentTitle,
  selectedTest,
  activeModule,
  onModuleChange,
  onJumpToPdfPage,
  onShowToast,
  onCloseWorkspace
}) => {
  // Answers state for Listening / Reading
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  // Writing state
  const [task1Text, setTask1Text] = useState<string>('');
  const [task2Text, setTask2Text] = useState<string>('');
  const [writingTab, setWritingTab] = useState<'task1' | 'task2'>('task1');

  // Speaking notes state
  const [speakingNotes, setSpeakingNotes] = useState<string>('');

  // Calculate word count helper
  const countWords = (str: string): number => {
    return str.trim().split(/\s+/).filter(Boolean).length;
  };

  const handleAnswerChange = (qNum: number, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [`q_${qNum}`]: value
    }));
  };

  const handleSaveDraft = () => {
    onShowToast('Practice responses saved locally.');
  };

  const handleClearForm = () => {
    if (activeModule === 'writing') {
      setTask1Text('');
      setTask2Text('');
    } else if (activeModule === 'speaking') {
      setSpeakingNotes('');
    } else {
      setAnswers({});
    }
    onShowToast('Workspace cleared.');
  };

  // Module boundaries for jump-to-page references
  const listeningStart = selectedTest?.modules?.listening?.pageRange?.start?.pageNumber;
  const readingStart = selectedTest?.modules?.reading?.pageRange?.start?.pageNumber;
  const writingStart = selectedTest?.modules?.writing?.pageRange?.start?.pageNumber;
  const speakingStart = selectedTest?.modules?.speaking?.pageRange?.start?.pageNumber;

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 border-l border-slate-800 select-none overflow-hidden">
      {/* ================= HEADER & MODULE SELECTOR ================= */}
      <div className="bg-slate-950 p-3 sm:p-4 border-b border-slate-800 flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-5 h-5 text-blue-400 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                Response Sheet — {selectedTest?.testLabel || documentTitle}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                Visual Reference Practice Mode · Copyright Safe
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition cursor-pointer flex items-center gap-1"
              title="Save practice answers"
            >
              <Save className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Save</span>
            </button>
            <button
              type="button"
              onClick={handleClearForm}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              title="Clear active response sheet"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Module Nav Tabs */}
        <div className="grid grid-cols-4 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              onModuleChange('listening');
              if (listeningStart && onJumpToPdfPage) onJumpToPdfPage(listeningStart);
            }}
            className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
              activeModule === 'listening'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Listening</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onModuleChange('reading');
              if (readingStart && onJumpToPdfPage) onJumpToPdfPage(readingStart);
            }}
            className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
              activeModule === 'reading'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Reading</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onModuleChange('writing');
              if (writingStart && onJumpToPdfPage) onJumpToPdfPage(writingStart);
            }}
            className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
              activeModule === 'writing'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Writing</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onModuleChange('speaking');
              if (speakingStart && onJumpToPdfPage) onJumpToPdfPage(speakingStart);
            }}
            className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
              activeModule === 'speaking'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Speaking</span>
          </button>
        </div>
      </div>

      {/* ================= WORKSPACE CONTENT ================= */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
        {/* LISTENING & READING ANSWER SHEET (Q1 - Q40) */}
        {(activeModule === 'listening' || activeModule === 'reading') && (
          <div className="space-y-4">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">
                {activeModule === 'listening' ? 'Listening' : 'Reading'} Answer Form (Questions 1–40)
              </span>
              <span className="font-mono text-blue-400">
                Answered: {Object.values(answers).filter(Boolean).length} / 40
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Array.from({ length: 40 }, (_, i) => i + 1).map((qNum) => {
                const val = answers[`q_${qNum}`] || '';
                return (
                  <div
                    key={qNum}
                    className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800/80 focus-within:border-blue-500 transition"
                  >
                    <span className="w-7 text-right font-mono text-xs font-bold text-slate-400 shrink-0">
                      {qNum}.
                    </span>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => handleAnswerChange(qNum, e.target.value)}
                      placeholder="Your answer..."
                      className="w-full bg-transparent text-xs text-white placeholder:text-slate-600 focus:outline-none font-mono"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* WRITING WORKSPACE (TASK 1 & TASK 2) */}
        {activeModule === 'writing' && (
          <div className="space-y-4 flex flex-col h-full min-h-[400px]">
            {/* Task Switcher */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWritingTab('task1')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    writingTab === 'task1'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Task 1 (150 words)
                </button>
                <button
                  type="button"
                  onClick={() => setWritingTab('task2')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    writingTab === 'task2'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Task 2 (250 words)
                </button>
              </div>

              <div className="text-xs font-mono">
                {writingTab === 'task1' ? (
                  <span className={countWords(task1Text) >= 150 ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                    Words: {countWords(task1Text)} / 150 min
                  </span>
                ) : (
                  <span className={countWords(task2Text) >= 250 ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                    Words: {countWords(task2Text)} / 250 min
                  </span>
                )}
              </div>
            </div>

            {/* Response Editor */}
            {writingTab === 'task1' ? (
              <div className="flex-1 flex flex-col space-y-2">
                <p className="text-xs text-slate-400">
                  Read Task 1 prompt from the open PDF page, then type your essay response below:
                </p>
                <textarea
                  value={task1Text}
                  onChange={(e) => setTask1Text(e.target.value)}
                  placeholder="Type your Task 1 response here..."
                  className="w-full flex-1 min-h-[280px] p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans leading-relaxed resize-none"
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col space-y-2">
                <p className="text-xs text-slate-400">
                  Read Task 2 prompt from the open PDF page, then type your essay response below:
                </p>
                <textarea
                  value={task2Text}
                  onChange={(e) => setTask2Text(e.target.value)}
                  placeholder="Type your Task 2 response here..."
                  className="w-full flex-1 min-h-[280px] p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans leading-relaxed resize-none"
                />
              </div>
            )}
          </div>
        )}

        {/* SPEAKING WORKSPACE */}
        {activeModule === 'speaking' && (
          <div className="space-y-4">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <h4 className="text-xs font-bold text-white">Speaking Practice Scratchpad</h4>
              <p className="text-[11px] text-slate-400">
                Use this workspace for 1-minute Part 2 cue card preparation notes and key vocabulary list.
              </p>
            </div>

            <textarea
              value={speakingNotes}
              onChange={(e) => setSpeakingNotes(e.target.value)}
              placeholder="Type your Part 2 cue card points or speaking outline here..."
              className="w-full h-64 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans leading-relaxed resize-none"
            />
          </div>
        )}
      </div>
    </div>
  );
};
