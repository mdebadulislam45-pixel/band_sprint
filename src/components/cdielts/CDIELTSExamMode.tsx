import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Flag,
  Highlighter,
  FileText,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  X,
  Volume2,
  Eye,
  Sliders,
  Sparkles,
  HelpCircle,
  StickyNote
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';

interface NoteItem {
  id: string;
  text: string;
  selectedQuote: string;
  timestamp: string;
}

interface CDIELTSExamModeProps {
  onExit: () => void;
  onShowToast: (msg: string) => void;
}

type ColorScheme = 'standard' | 'yellow-on-black' | 'black-on-yellow' | 'cream';
type ZoomLevel = '100%' | '125%' | '150%';

export const CDIELTSExamMode: React.FC<CDIELTSExamModeProps> = ({
  onExit,
  onShowToast
}) => {
  // Test State
  const [activeSkill, setActiveSkill] = useState<'reading' | 'listening'>('reading');
  const [activeQuestion, setActiveQuestion] = useState(1);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [timeRemainingSec, setTimeRemainingSec] = useState<number>(60 * 60); // 60 minutes
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);

  // CD-IELTS Display Options
  const [colorScheme, setColorScheme] = useState<ColorScheme>('standard');
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('100%');
  const [showPalette, setShowPalette] = useState<boolean>(true);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [newNoteInput, setNewNoteInput] = useState('');
  const [activeQuote, setActiveQuote] = useState('');
  const [showNotesDrawer, setShowNotesDrawer] = useState(false);

  // Warnings tracking (10m and 5m warnings per official British Council rules)
  const [hasShown10mWarning, setHasShown10mWarning] = useState(false);
  const [hasShown5mWarning, setHasShown5mWarning] = useState(false);
  const [warningModalText, setWarningModalText] = useState<string | null>(null);

  const passageRef = useRef<HTMLDivElement | null>(null);

  // Timer countdown
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setTimeRemainingSec((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          soundManager.playBeep(440, 0.4);
          setWarningModalText('TIME EXPIRED: The 60-minute test duration has concluded. Your responses have been saved.');
          return 0;
        }

        // 10-Minute Warning
        if (prev === 600 && !hasShown10mWarning) {
          setHasShown10mWarning(true);
          soundManager.playBeep(520, 0.2);
          setWarningModalText('10-MINUTE WARNING: You have 10 minutes remaining to complete this test section. Check all flagged questions.');
        }

        // 5-Minute Warning
        if (prev === 300 && !hasShown5mWarning) {
          setHasShown5mWarning(true);
          soundManager.playBeep(580, 0.25);
          setWarningModalText('5-MINUTE WARNING: You have 5 minutes remaining. No extra transfer time is provided in Computer-Delivered IELTS.');
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, hasShown10mWarning, hasShown5mWarning]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleFlag = (qNum: number) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(qNum)) {
        next.delete(qNum);
        onShowToast(`Question ${qNum} unflagged`);
      } else {
        next.add(qNum);
        onShowToast(`Question ${qNum} flagged for review`);
      }
      return next;
    });
    soundManager.playBeep(640, 0.03);
  };

  const handleTextSelection = () => {
    if (typeof window === 'undefined') return;
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 3) {
      setActiveQuote(selection.toString().trim());
      setShowNotesDrawer(true);
    }
  };

  const handleAddNote = () => {
    if (!newNoteInput.trim()) return;
    const item: NoteItem = {
      id: 'note_' + Date.now(),
      text: newNoteInput.trim(),
      selectedQuote: activeQuote,
      timestamp: formatTimer(timeRemainingSec)
    };
    setNotes((prev) => [item, ...prev]);
    setNewNoteInput('');
    setActiveQuote('');
    soundManager.playSuccess();
    onShowToast('Note saved to test scratchpad');
  };

  // Color scheme class resolver
  const getColorSchemeClasses = () => {
    switch (colorScheme) {
      case 'yellow-on-black':
        return 'bg-black text-yellow-300 border-yellow-500';
      case 'black-on-yellow':
        return 'bg-amber-100 text-slate-950 border-amber-400';
      case 'cream':
        return 'bg-[#FFFDF7] text-[#2C2416] border-[#E8DFC8]';
      case 'standard':
      default:
        return 'bg-white text-slate-900 border-slate-300';
    }
  };

  const getZoomClass = () => {
    switch (zoomLevel) {
      case '125%':
        return 'text-[17px] leading-relaxed';
      case '150%':
        return 'text-[19px] leading-loose';
      case '100%':
      default:
        return 'text-sm sm:text-base leading-relaxed';
    }
  };

  // Mock questions (1-40)
  const totalQuestions = 40;

  return (
    <div className={`min-h-screen w-full flex flex-col select-none transition-colors duration-150 ${getColorSchemeClasses()}`}>
      {/* ================= 1. OFFICIAL CD-IELTS TOP TEST HEADER ================= */}
      <header className="sticky top-0 z-50 w-full border-b border-inherit px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 bg-inherit backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-xs sm:text-sm tracking-wider uppercase px-2 py-0.5 rounded bg-blue-600 text-white">
              CD-IELTS
            </span>
            <span className="text-xs sm:text-sm font-bold tracking-tight">
              Academic {activeSkill === 'reading' ? 'Reading' : 'Listening'} Test
            </span>
          </div>

          {/* Accessibility Color Schemes */}
          <div className="hidden lg:flex items-center gap-1 border-l border-inherit pl-3">
            <button
              onClick={() => setColorScheme('standard')}
              className={`px-2 py-1 rounded text-[11px] font-bold border ${colorScheme === 'standard' ? 'bg-blue-600 text-white' : 'border-slate-300'}`}
              title="Standard Black on White"
            >
              Standard
            </button>
            <button
              onClick={() => setColorScheme('cream')}
              className={`px-2 py-1 rounded text-[11px] font-bold border ${colorScheme === 'cream' ? 'bg-[#5A4A32] text-white' : 'border-[#E8DFC8]'}`}
              title="Soft Cream / Paper"
            >
              Cream
            </button>
            <button
              onClick={() => setColorScheme('yellow-on-black')}
              className={`px-2 py-1 rounded text-[11px] font-bold border ${colorScheme === 'yellow-on-black' ? 'bg-yellow-400 text-black' : 'border-yellow-500'}`}
              title="High Contrast: Yellow on Black"
            >
              Yellow/Black
            </button>
          </div>

          {/* Text Zoom */}
          <div className="hidden md:flex items-center gap-1 border-l border-inherit pl-2">
            <button
              onClick={() => {
                const levels: ZoomLevel[] = ['100%', '125%', '150%'];
                const nextIdx = (levels.indexOf(zoomLevel) + 1) % levels.length;
                setZoomLevel(levels[nextIdx]);
                soundManager.playBeep(600, 0.03);
              }}
              className="px-2 py-1 rounded border border-inherit text-xs font-mono font-bold flex items-center gap-1"
              title="Adjust text magnification"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>{zoomLevel}</span>
            </button>
          </div>
        </div>

        {/* Center: Countdown Clock */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-inherit font-mono font-black text-sm sm:text-base tracking-widest shadow-2xs">
          <Clock className={`w-4 h-4 ${timeRemainingSec < 600 ? 'text-red-500 animate-pulse' : 'text-blue-500'}`} />
          <span>{formatTimer(timeRemainingSec)}</span>
        </div>

        {/* Right: Notes, Review & Exit */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNotesDrawer(!showNotesDrawer)}
            className="px-2.5 py-1.5 rounded-lg border border-inherit text-xs font-bold flex items-center gap-1.5 hover:bg-slate-500/10 transition"
            title="Candidate Margin Notes & Highlighting"
          >
            <StickyNote className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">Notes ({notes.length})</span>
          </button>

          <button
            onClick={() => {
              if (confirm('Are you sure you want to exit the Computer-Delivered exam simulation?')) {
                onExit();
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exit Exam</span>
          </button>
        </div>
      </header>

      {/* ================= 2. MAIN SPLIT SCREEN: PASSAGE & QUESTIONS ================= */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Column: Official Passage with Text Selection Listener */}
        <div
          ref={passageRef}
          onMouseUp={handleTextSelection}
          className={`flex-1 p-5 sm:p-8 overflow-y-auto border-r border-inherit scrollbar-thin ${getZoomClass()}`}
        >
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="border-b border-inherit pb-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600">
                READING PASSAGE 1 · QUESTIONS 1–13
              </span>
              <h1 className="text-xl sm:text-2xl font-black mt-1">
                The Origins of Modern Environmental Architecture
              </h1>
              <p className="text-xs opacity-75 mt-1 italic">
                You should spend about 20 minutes on Questions 1–13, which are based on Reading Passage 1 below.
              </p>
            </div>

            <div className="space-y-4 text-justify">
              <p>
                <strong>Paragraph A:</strong> During the mid-twentieth century, the rapid industrialization of urban centers prompted architectural theorists to fundamentally reconsider the relationship between human habitats and their surrounding ecosystems. Early advocates posited that conventional construction practices expended disproportionate energy resources, resulting in excessive carbon footprints and thermal inefficiencies.
              </p>
              <p>
                <strong>Paragraph B:</strong> In response, pioneer architects initiated the integration of passive solar design principles. Rather than relying entirely on mechanical HVAC systems, modern ecological structures employ strategic orientations to optimize natural airflow and daylit interiors. High thermal-mass materials such as rammed earth and insulated cross-laminated timber were introduced to regulate diurnal temperature fluctuations.
              </p>
              <p>
                <strong>Paragraph C:</strong> Crucially, contemporary assessments suggest that sustainable architectural interventions extend beyond immediate energy reduction. Bio-climatic designs contribute substantially to psychological well-being, employee productivity, and the mitigation of urban heat-island phenomena across high-density metropolitan areas.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-dashed border-inherit bg-slate-500/5 text-xs">
              <div className="flex items-center gap-2 font-bold mb-1">
                <Highlighter className="w-4 h-4 text-amber-500" />
                <span>Text Highlighting & Sticky Notes Active</span>
              </div>
              <p className="opacity-80">
                Highlight any text in the reading passage to automatically create an official margin note or highlight quotation.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Question Panel */}
        <div className="w-full md:w-[420px] lg:w-[480px] p-5 sm:p-6 overflow-y-auto flex flex-col justify-between bg-inherit border-inherit">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-inherit pb-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600">
                Question {activeQuestion} of {totalQuestions}
              </span>
              <button
                onClick={() => toggleFlag(activeQuestion)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition ${
                  flaggedQuestions.has(activeQuestion)
                    ? 'bg-amber-500 text-black border-amber-600'
                    : 'border-inherit opacity-80 hover:opacity-100'
                }`}
              >
                <Flag className="w-3.5 h-3.5 fill-current" />
                <span>{flaggedQuestions.has(activeQuestion) ? 'Flagged' : 'Review Later'}</span>
              </button>
            </div>

            {/* Current Question Stem */}
            <div className="space-y-3">
              <p className="text-sm sm:text-base font-bold">
                Do the following statements agree with the information given in Reading Passage 1?
              </p>
              <div className="p-4 rounded-xl border border-inherit bg-slate-500/5 text-xs sm:text-sm space-y-1.5">
                <div className="font-mono font-bold text-blue-600">Question {activeQuestion}:</div>
                <div className="font-medium">
                  {activeQuestion === 1
                    ? 'Mid-twentieth-century industrialization forced architects to re-evaluate traditional building methods.'
                    : activeQuestion === 2
                    ? 'Passive solar architecture requires complete reliance on mechanical ventilation systems.'
                    : 'Sustainable buildings improve cognitive productivity among office occupants.'}
                </div>
              </div>

              {/* Radio Answer Choices (TRUE / FALSE / NOT GIVEN) */}
              <div className="space-y-2 pt-2">
                {['TRUE', 'FALSE', 'NOT GIVEN'].map((opt) => (
                  <label
                    key={opt}
                    onClick={() => {
                      setUserAnswers((prev) => ({ ...prev, [activeQuestion]: opt }));
                      soundManager.playBeep(540, 0.03);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl border border-inherit cursor-pointer transition ${
                      userAnswers[activeQuestion] === opt
                        ? 'bg-blue-600 text-white font-bold'
                        : 'hover:bg-slate-500/10 font-medium'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q_${activeQuestion}`}
                      checked={userAnswers[activeQuestion] === opt}
                      onChange={() => {}}
                      className="accent-blue-600"
                    />
                    <span className="text-xs sm:text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Question Navigation Buttons */}
          <div className="pt-6 border-t border-inherit flex items-center justify-between gap-3 mt-6">
            <button
              disabled={activeQuestion <= 1}
              onClick={() => {
                setActiveQuestion((q) => Math.max(1, q - 1));
                soundManager.playBeep(480, 0.03);
              }}
              className="px-4 py-2 rounded-xl border border-inherit text-xs font-bold disabled:opacity-30 flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <span className="text-xs font-mono font-bold opacity-75">
              Answered: {Object.keys(userAnswers).length} / {totalQuestions}
            </span>

            <button
              disabled={activeQuestion >= totalQuestions}
              onClick={() => {
                setActiveQuestion((q) => Math.min(totalQuestions, q + 1));
                soundManager.playBeep(520, 0.03);
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold disabled:opacity-30 flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ================= 3. BOTTOM QUESTION PALETTE & STATUS BAR ================= */}
      <footer className="w-full border-t border-inherit p-3 bg-inherit backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 mb-2 px-1 text-xs font-mono font-bold">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-600" /> Answered ({Object.keys(userAnswers).length})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border border-inherit" /> Unanswered ({totalQuestions - Object.keys(userAnswers).length})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500" /> Flagged ({flaggedQuestions.size})
            </span>
          </div>

          <button
            onClick={() => setShowPalette(!showPalette)}
            className="text-xs text-blue-500 hover:underline"
          >
            {showPalette ? 'Hide Palette' : 'Show Palette'}
          </button>
        </div>

        {/* 40-Question Circular Button Matrix */}
        {showPalette && (
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 scrollbar-none">
            {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((qNum) => {
              const isAnswered = Boolean(userAnswers[qNum]);
              const isFlagged = flaggedQuestions.has(qNum);
              const isActive = activeQuestion === qNum;

              return (
                <button
                  key={qNum}
                  onClick={() => {
                    setActiveQuestion(qNum);
                    soundManager.playBeep(550, 0.025);
                  }}
                  className={`relative w-8 h-8 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center border ${
                    isActive
                      ? 'ring-2 ring-blue-500 scale-105 z-10'
                      : ''
                  } ${
                    isAnswered
                      ? 'bg-blue-600 text-white border-blue-700'
                      : 'border-inherit bg-slate-500/10'
                  }`}
                  title={`Question ${qNum}${isFlagged ? ' (Flagged)' : ''}${isAnswered ? ' (Answered)' : ''}`}
                >
                  <span>{qNum}</span>
                  {isFlagged && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border border-white" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </footer>

      {/* ================= 4. SLIDE-OUT NOTES DRAWER ================= */}
      {showNotesDrawer && (
        <aside className="fixed top-12 right-0 bottom-0 w-80 bg-inherit border-l border-inherit p-4 z-50 shadow-2xl flex flex-col justify-between animate-fade-in">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-inherit pb-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <StickyNote className="w-4 h-4 text-amber-500" />
                <span>Margin Notes Scratchpad</span>
              </div>
              <button
                onClick={() => setShowNotesDrawer(false)}
                className="p-1 rounded hover:bg-slate-500/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activeQuote && (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                <div className="font-bold text-[10px] uppercase font-mono text-amber-600">Selected Quote:</div>
                <div className="italic mt-1 line-clamp-3">"{activeQuote}"</div>
              </div>
            )}

            <div className="space-y-2">
              <textarea
                value={newNoteInput}
                onChange={(e) => setNewNoteInput(e.target.value)}
                placeholder="Type note or synonym observation..."
                className="w-full h-24 p-2.5 rounded-lg border border-inherit bg-transparent text-xs outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleAddNote}
                className="w-full py-2 rounded-lg bg-blue-600 text-white text-xs font-bold transition hover:bg-blue-700"
              >
                Save Note
              </button>
            </div>

            {/* List of saved notes */}
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
              {notes.map((n) => (
                <div key={n.id} className="p-2 rounded-lg border border-inherit text-xs space-y-1">
                  <div className="flex items-center justify-between font-mono text-[10px] opacity-70">
                    <span>At {n.timestamp}</span>
                  </div>
                  {n.selectedQuote && (
                    <div className="text-[11px] opacity-80 italic">"{n.selectedQuote}"</div>
                  )}
                  <div className="font-semibold">{n.text}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}

      {/* ================= 5. OFFICIAL WARNING MODAL (10m / 5m) ================= */}
      {warningModalText && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-[#101B32] border border-slate-300 dark:border-slate-700 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Official Test Administration Alert
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {warningModalText}
            </p>
            <button
              onClick={() => {
                setWarningModalText(null);
                soundManager.playBeep(640, 0.03);
              }}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition"
            >
              Acknowledge & Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
