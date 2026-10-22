import React from 'react';
import {
  Sparkles,
  Play,
  Clock,
  Headphones,
  BookOpen,
  PenTool,
  Mic,
  Award,
  ArrowRight,
  CheckCircle2,
  Calendar,
  RotateCcw,
  Sliders,
  History,
  FileText
} from 'lucide-react';
import { UserProfile, ExamHistoryRecord } from '../../types';
import { soundManager } from '../../utils/audioEffects';
import { isFullMockExamRecord } from '../../utils/userStorage';

interface MockTestPageProps {
  user: UserProfile;
  onNavigate: (page: string) => void;
  onShowToast: (msg: string) => void;
  onOpenBandModal: () => void;
}

export const MockTestPage: React.FC<MockTestPageProps> = ({
  user,
  onNavigate,
  onShowToast,
  onOpenBandModal
}) => {
  // examHistory is stored newest-first via unshift()
  const history: ExamHistoryRecord[] = user.progress.examHistory || [];
  const latestExam = history.length > 0 ? history[0] : null;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* ================= 1. FULL MOCK TEST HERO ================= */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white p-6 sm:p-8 shadow-xl border border-indigo-900/60">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-56 h-56 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-mono font-bold border border-blue-400/30 uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              FULL-SIMULATION IELTS EXAM
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-mono font-bold border border-emerald-500/30">
              🇬🇧 British English Audio
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
              Full IELTS Mock Test
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/90 mt-1.5 max-w-xl leading-relaxed">
              Standard exam simulation covering Listening, Reading, Writing, and Speaking under realistic timed test conditions.
            </p>
          </div>

          {/* 4 Skill Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="p-3 rounded-2xl bg-white/10 border border-white/10 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600/60 text-blue-200 flex items-center justify-center shrink-0">
                <Headphones className="w-4 h-4 text-amber-300" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-blue-200 uppercase font-semibold">Listening</div>
                <div className="text-xs font-bold text-white truncate">40 Questions</div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/10 border border-white/10 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600/60 text-emerald-200 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-blue-200 uppercase font-semibold">Reading</div>
                <div className="text-xs font-bold text-white truncate">40 Questions</div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/10 border border-white/10 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-600/60 text-purple-200 flex items-center justify-center shrink-0">
                <PenTool className="w-4 h-4 text-purple-300" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-blue-200 uppercase font-semibold">Writing</div>
                <div className="text-xs font-bold text-white truncate">2 Tasks</div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/10 border border-white/10 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-600/60 text-rose-200 flex items-center justify-center shrink-0">
                <Mic className="w-4 h-4 text-rose-300" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-blue-200 uppercase font-semibold">Speaking</div>
                <div className="text-xs font-bold text-white truncate">3 Parts</div>
              </div>
            </div>
          </div>

          {/* Time & Band Details */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-blue-200 pt-1 font-mono">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-300" />
              Duration: <strong>2h 45m</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-300" />
              Grading: <strong>Band 0.0 – 9.0</strong>
            </span>
          </div>

          {/* Primary Action Button */}
          <div className="pt-3 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                soundManager.playSuccess();
                onNavigate('livemock');
              }}
              className="min-h-[50px] px-8 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-md transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>START NEW MOCK TEST →</span>
            </button>

            <button
              onClick={onOpenBandModal}
              className="min-h-[46px] px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/20 transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Sliders className="w-4 h-4 text-amber-300" />
              <span>Band Calculator & OSR</span>
            </button>
          </div>
        </div>
      </section>

      {/* ================= 2. INDIVIDUAL SKILL MOCKS ================= */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 font-mono">
          Individual Skill Simulations
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            onClick={() => onNavigate('listening')}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 transition shadow-2xs cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Listening Mock</div>
                <div className="text-[10px] text-slate-500">40 Questions · 30 mins</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>

          <div
            onClick={() => onNavigate('reading')}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 transition shadow-2xs cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Reading Mock</div>
                <div className="text-[10px] text-slate-500">3 Passages · 60 mins</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>

          <div
            onClick={() => onNavigate('writing')}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-purple-500 transition shadow-2xs cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <PenTool className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Writing Mock</div>
                <div className="text-[10px] text-slate-500">Task 1 & Task 2 · 60 mins</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>

          <div
            onClick={() => onNavigate('speaking')}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-rose-500 transition shadow-2xs cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Speaking Mock</div>
                <div className="text-[10px] text-slate-500">3 Interview Parts · 14 mins</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </section>

      {/* ================= 3. RECENT TESTS ================= */}
      <section className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
              <History className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Test Attempts</h2>
              <p className="text-[11px] text-slate-500">Track your past scores and performance over time</p>
            </div>
          </div>
          {history.length > 0 && (
            <span className="text-xs font-mono font-bold text-slate-500">
              {history.length} Completed
            </span>
          )}
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <Award className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-xs font-bold text-slate-700">No mock tests completed yet</div>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Take your first complete IELTS mock test to calculate your official estimated band score and identify weak areas.
            </p>
            <button
              onClick={() => onNavigate('livemock')}
              className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition inline-flex items-center gap-1.5"
            >
              Start First Mock Exam →
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 5).map((test, index) => {
              const isFullMock = isFullMockExamRecord(test);
              const testDate = new Date(test.timestamp).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              });
              return (
                <div
                  key={test.id || index}
                  className="p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-mono font-black text-sm">
                      {isFullMock
                        ? (test.overallBand ?? test.listeningBand).toFixed(1)
                        : test.listeningBand.toFixed(1)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {isFullMock
                          ? `Full Mock Test #${history.length - index}`
                          : `Listening Mock Test #${history.length - index}`}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                        <span>{testDate}</span>
                        <span>•</span>
                        {isFullMock ? (
                          <>
                            <span>L: {test.listeningBand.toFixed(1)}</span>
                            <span>R: {(test.readingBand ?? 0).toFixed(1)}</span>
                            <span>W: {(test.writingBand ?? 0).toFixed(1)}</span>
                          </>
                        ) : (
                          <span>
                            Listening Band {test.listeningBand.toFixed(1)} ({test.correctCount}/{test.totalQuestions})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onNavigate('vault')}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition"
                    >
                      Review Mistakes
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
