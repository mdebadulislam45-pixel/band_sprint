import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Gauge,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Check,
  X,
  HelpCircle,
  Eye,
  Clock
} from 'lucide-react';
import { SPEED_READING_DRILLS, ReadingDrillItem } from '../../data/speedReadingData';
import { soundManager } from '../../utils/audioEffects';

interface SpeedReadingPageProps {
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

export const SpeedReadingPage: React.FC<SpeedReadingPageProps> = ({ onBack, onShowToast }) => {
  const [selectedDrillIndex, setSelectedDrillIndex] = useState(0);
  const [wpmPace, setWpmPace] = useState<200 | 250 | 300>(250);
  const [isPacing, setIsPacing] = useState(false);
  const [highlightParagraphIdx, setHighlightParagraphIdx] = useState<number>(0);
  const [highlightTopicSentences, setHighlightTopicSentences] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showQuiz, setShowQuiz] = useState(false);

  const activeDrill: ReadingDrillItem = SPEED_READING_DRILLS[selectedDrillIndex] || SPEED_READING_DRILLS[0];

  const paceIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPacing) {
      // Calculate milliseconds per paragraph based on average words
      const wordsPerPara = Math.round(activeDrill.wordCount / activeDrill.paragraphs.length);
      const msPerPara = (wordsPerPara / wpmPace) * 60 * 1000;

      paceIntervalRef.current = setInterval(() => {
        setHighlightParagraphIdx((prev) => {
          if (prev >= activeDrill.paragraphs.length - 1) {
            setIsPacing(false);
            soundManager.playSuccess();
            onShowToast('Pacing drill complete! Test your retention below.');
            setShowQuiz(true);
            return prev;
          }
          return prev + 1;
        });
      }, msPerPara);
    } else {
      if (paceIntervalRef.current) clearInterval(paceIntervalRef.current);
    }

    return () => {
      if (paceIntervalRef.current) clearInterval(paceIntervalRef.current);
    };
  }, [isPacing, wpmPace, activeDrill]);

  const handleStartPacing = () => {
    setHighlightParagraphIdx(0);
    setIsPacing(true);
    setShowQuiz(false);
    soundManager.playBeep(600, 0.05);
    onShowToast(`Pacer started at ${wpmPace} WPM.`);
  };

  const handleStopPacing = () => {
    setIsPacing(false);
  };

  const handleSelectAnswer = (qIdx: number, optIdx: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
    const isCorrect = optIdx === activeDrill.questions[qIdx].correctIndex;
    if (isCorrect) {
      soundManager.playSuccess();
      onShowToast('Correct comprehension answer!');
    } else {
      soundManager.playBeep(350, 0.08);
      onShowToast('Incorrect option. Re-scan the topic sentence.');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Practice</span>
        </button>

        <div className="text-right">
          <div className="text-xs font-bold text-slate-900 font-mono">SPEED PACER</div>
          <div className="text-[10px] text-slate-400">Skimming & Scanning Trainer</div>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-7 rounded-3xl shadow-md border border-teal-800/40">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-mono font-bold uppercase tracking-wider border border-teal-400/30">
            SOLVE 40 QUESTIONS IN 60 MINS
          </span>
          <span className="text-[11px] text-teal-200">
            Target 250 WPM IELTS Speed
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          IELTS Speed Reading & Skimming Pacer
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
          Train your peripheral vision to locate topic sentences, contrast markers, and critical keywords in under 3 minutes per passage without getting bogged down in difficult jargon.
        </p>
      </div>

      {/* Control Strip */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* WPM Speed Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-400 uppercase">Target Speed:</span>
          {([200, 250, 300] as const).map((wpm) => {
            const isActive = wpmPace === wpm;
            return (
              <button
                key={wpm}
                onClick={() => {
                  setWpmPace(wpm);
                  setIsPacing(false);
                  soundManager.playBeep(600, 0.04);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                  isActive
                    ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {wpm} WPM
              </button>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHighlightTopicSentences((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 ${
              highlightTopicSentences
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Topic Sentences</span>
          </button>

          {!isPacing ? (
            <button
              onClick={handleStartPacing}
              className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition flex items-center gap-1.5 shadow-2xs"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Start Speed Pacer</span>
            </button>
          ) : (
            <button
              onClick={handleStopPacing}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition flex items-center gap-1.5 shadow-2xs"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
          )}
        </div>
      </div>

      {/* Reading Passage View */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
              {activeDrill.topic}
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
              {activeDrill.title}
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {activeDrill.wordCount} words · ~{activeDrill.targetMinutes} min
          </span>
        </div>

        {/* Paragraphs with Dynamic Pacer Highlighting */}
        <div className="space-y-4 text-xs sm:text-sm text-slate-800 leading-relaxed font-serif">
          {activeDrill.paragraphs.map((p, idx) => {
            const isCurrentlyPaced = isPacing && highlightParagraphIdx === idx;

            return (
              <div
                key={p.id}
                className={`p-4 rounded-2xl border transition duration-300 ${
                  isCurrentlyPaced
                    ? 'bg-teal-50/80 border-teal-500 shadow-sm ring-2 ring-teal-400/40'
                    : 'bg-white border-transparent'
                }`}
              >
                {highlightTopicSentences ? (
                  <p>
                    <span className="font-bold text-amber-950 bg-amber-100 px-1 py-0.5 rounded">
                      {p.topicSentence}
                    </span>{' '}
                    <span>{p.text.replace(p.topicSentence, '')}</span>
                  </p>
                ) : (
                  <p>{p.text}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Comprehension Check Button */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => setShowQuiz((prev) => !prev)}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
          >
            {showQuiz ? 'Hide Retention Questions' : 'Take Retention Check Quiz'}
          </button>
        </div>

        {/* Retention Quiz */}
        {showQuiz && (
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 text-xs">
            <div className="font-mono font-bold uppercase text-slate-500 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-teal-600" />
              <span>Speed Retention Comprehension Questions</span>
            </div>

            <div className="space-y-4">
              {activeDrill.questions.map((q, qIdx) => {
                const userAns = selectedAnswers[qIdx];
                const hasAnswered = userAns !== undefined;

                return (
                  <div key={qIdx} className="space-y-2 p-3 bg-white rounded-xl border border-slate-200">
                    <p className="font-bold text-slate-900">{q.question}</p>

                    <div className="space-y-1.5">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = userAns === optIdx;
                        const isCorrect = hasAnswered && optIdx === q.correctIndex;
                        const isWrongSelection = hasAnswered && isSelected && !isCorrect;

                        return (
                          <button
                            key={optIdx}
                            disabled={hasAnswered}
                            onClick={() => handleSelectAnswer(qIdx, optIdx)}
                            className={`w-full p-2.5 rounded-xl text-left font-medium transition border flex items-center justify-between ${
                              isCorrect
                                ? 'bg-emerald-100 text-emerald-950 border-emerald-400 font-bold'
                                : isWrongSelection
                                ? 'bg-rose-100 text-rose-950 border-rose-400'
                                : isSelected
                                ? 'bg-teal-50 text-teal-900 border-teal-300'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span>{opt}</span>
                            {isCorrect && <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />}
                            {isWrongSelection && <X className="w-4 h-4 text-rose-600 shrink-0 ml-2" />}
                          </button>
                        );
                      })}
                    </div>

                    {hasAnswered && (
                      <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-100">
                        {q.explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
