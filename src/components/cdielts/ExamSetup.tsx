import React, { useMemo, useState } from 'react';
import {
  X,
  CalendarDays,
  Target,
  BookOpen,
  Headphones,
  PenTool,
  Mic,
  Award,
  Sparkles,
  Play,
  Check
} from 'lucide-react';
import { MOCK_EXAM_SETS } from '../../data/mockExams';
import {
  AIM_BANDS,
  BAND_RAW_SCORE,
  MODULE_TIMINGS,
  correctAnswersNeeded,
  daysUntilExam,
  formatExamDate,
  loadExamSetup,
  saveExamSetup,
  type ExamMode,
  type ExamScope,
  type ExamSetup as ExamSetupData
} from '../../services/examSetupService';
import { soundManager } from '../../utils/audioEffects';

interface ExamSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

const SCOPE_OPTIONS: { id: ExamScope; label: string; detail: string; icon: typeof Award }[] = [
  { id: 'full', label: 'Full mock test', detail: 'All 4 modules, timed like test day', icon: Award },
  { id: 'listening', label: 'Listening only', detail: '40 questions · 4 sections', icon: Headphones },
  { id: 'reading', label: 'Reading only', detail: '3 passages · 40 questions', icon: BookOpen },
  { id: 'writing', label: 'Writing only', detail: 'Task 1 + Task 2', icon: PenTool },
  { id: 'speaking', label: 'Speaking only', detail: 'Part 1, 2 & 3 with the examiner', icon: Mic },
];

function BarnabyBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left">
      <div className="w-9 h-9 shrink-0 rounded-full bg-[#0F4C45] text-amber-300 flex items-center justify-center font-black text-sm">
        B
      </div>
      <div>
        <div className="text-[11px] font-black uppercase tracking-wider text-[#0F4C45] flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Barnaby says
        </div>
        <p className="text-xs text-slate-700 leading-relaxed mt-1">{children}</p>
      </div>
    </div>
  );
}

function bandTip(band: number): string {
  if (band >= 8) return 'Band 8+ means near-perfect accuracy and natural, precise English. Aim for 35+ correct in Listening and Reading, and use a wide range of vocabulary in Writing and Speaking.';
  if (band >= 7) return 'Band 7 is the most common target for university and migration. You need about 30 correct out of 40 in Listening and Reading — and clear, well-organised answers in Writing and Speaking.';
  if (band >= 6) return 'Band 6 means you can handle everyday English but still make frequent mistakes. Focus on understanding the main ideas first, then work on accuracy.';
  return 'Band 4–5 is a starting point. Build your foundation first: everyday vocabulary, basic grammar, and understanding simple recordings and passages.';
}

export const ExamSetup: React.FC<ExamSetupProps> = ({ isOpen, onClose, onNavigate }) => {
  const [setup, setSetup] = useState<ExamSetupData>(() => loadExamSetup());
  const [hasDate, setHasDate] = useState<boolean>(() => loadExamSetup().examDate !== null);

  const daysLeft = useMemo(() => daysUntilExam(setup.examDate), [setup.examDate]);
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  if (!isOpen) return null;

  const update = (patch: Partial<ExamSetupData>) => {
    setSetup((prev) => ({ ...prev, ...patch }));
  };

  const handleModeChange = (mode: ExamMode) => {
    const currentSet = MOCK_EXAM_SETS.find((s) => s.id === setup.mockSetId);
    const currentFormat = currentSet?.format;
    const mismatch =
      (mode === 'General Training' && currentFormat !== 'General Training') ||
      (mode === 'Academic' && currentFormat === 'General Training');
    update({
      examMode: mode,
      mockSetId: mismatch ? (mode === 'General Training' ? 'gt-test-1' : 'practice-16') : setup.mockSetId,
    });
  };

  const handleDateToggle = (wantDate: boolean) => {
    setHasDate(wantDate);
    if (!wantDate) update({ examDate: null });
    else if (!setup.examDate) update({ examDate: new Date(Date.now() + 42 * 86400000).toISOString().split('T')[0] });
  };

  const startExam = () => {
    soundManager.playSuccess();
    saveExamSetup(setup);
    onClose();
    onNavigate(setup.scope === 'full' ? '/practice/mock-tests' : `/practice/${setup.scope}`);
  };

  const selectedSet = MOCK_EXAM_SETS.find((s) => s.id === setup.mockSetId) || MOCK_EXAM_SETS[0];

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto" role="dialog" aria-label="Exam setup">
      {/* Official-style top bar */}
      <div className="sticky top-0 z-10 bg-white border-b-2 border-[#0F4C45]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#0F4C45]">
              BandSprint Exam Room
            </div>
            <div className="text-xs text-slate-500">Set up your exam — then Barnaby guides you through it</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
            aria-label="Close exam setup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-16">
        <p className="text-[11px] text-slate-500 leading-relaxed bg-white border border-slate-200 rounded-xl px-4 py-3">
          Practice simulation — not the official IELTS test. BandSprint is not affiliated with Cambridge,
          British Council or IDP. Scores shown here are estimates to help you practise.
        </p>

        {/* Step 1 — Exam type */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#0F4C45] text-white text-xs font-black flex items-center justify-center">1</span>
            <h2 className="text-base font-black text-slate-900">Which exam are you preparing for?</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(['Academic', 'General Training'] as ExamMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleModeChange(mode)}
                className={`p-4 rounded-2xl border-2 text-left cursor-pointer transition ${
                  setup.examMode === mode
                    ? 'border-[#0F4C45] bg-[#0F4C45]/5 ring-2 ring-[#0F4C45]/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-slate-900">{mode}</span>
                  {setup.examMode === mode && <Check className="w-4 h-4 text-[#0F4C45]" />}
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {mode === 'Academic'
                    ? 'For university study and professional registration.'
                    : 'For migration, work and training below degree level.'}
                </p>
              </button>
            ))}
          </div>
          <BarnabyBox>
            {setup.examMode === 'Academic'
              ? 'Academic it is. Your Reading passages will be longer and more academic — that is where most students lose marks, so we will practise them the most.'
              : 'General Training it is. Your Reading will use everyday texts like notices and adverts — and your Writing Task 1 will be a letter, not a chart.'}
          </BarnabyBox>
        </section>

        {/* Step 2 — Aim band */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#0F4C45] text-white text-xs font-black flex items-center justify-center">2</span>
            <h2 className="text-base font-black text-slate-900">What is your aim band?</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {AIM_BANDS.map((band) => (
              <button
                key={band}
                type="button"
                onClick={() => update({ targetBand: band })}
                className={`min-w-[52px] px-3 py-2.5 rounded-xl border-2 font-mono font-black text-sm cursor-pointer transition ${
                  setup.targetBand === band
                    ? 'bg-[#0F4C45] text-white border-[#0F4C45]'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-[#0F4C45]/50'
                }`}
              >
                {band.toFixed(1)}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <Target className="w-4 h-4 text-[#0F4C45]" />
              <span className="text-xs font-black text-slate-800">
                What Band {setup.targetBand.toFixed(1)} needs — approximate
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {AIM_BANDS.map((band) => {
                const range = BAND_RAW_SCORE[band];
                const selected = band === setup.targetBand;
                return (
                  <div
                    key={band}
                    className={`flex items-center justify-between px-4 py-1.5 text-xs ${
                      selected ? 'bg-amber-50 font-black text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    <span className="font-mono">Band {band.toFixed(1)}</span>
                    <span className="font-mono">
                      {range.min}–{range.max} correct out of 40
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="px-4 py-2 text-[11px] text-slate-500 bg-slate-50 border-t border-slate-200">
              Approximate conversions for Listening &amp; Academic Reading. General Training Reading uses a
              slightly different scale. These are guide numbers, not official scores.
            </p>
          </div>

          <BarnabyBox>
            For Band {setup.targetBand.toFixed(1)} you need about {correctAnswersNeeded(setup.targetBand)} correct
            out of 40 in Listening and Reading. {bandTip(setup.targetBand)}
          </BarnabyBox>
        </section>

        {/* Step 3 — Exam date (optional) */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#0F4C45] text-white text-xs font-black flex items-center justify-center">3</span>
            <h2 className="text-base font-black text-slate-900">When is your exam? <span className="text-xs font-bold text-slate-400">(optional)</span></h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleDateToggle(true)}
              className={`px-4 py-2.5 rounded-xl border-2 text-xs font-bold cursor-pointer transition ${
                hasDate ? 'border-[#0F4C45] bg-[#0F4C45]/5 text-[#0F4C45]' : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <CalendarDays className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              I have a date
            </button>
            <button
              type="button"
              onClick={() => handleDateToggle(false)}
              className={`px-4 py-2.5 rounded-xl border-2 text-xs font-bold cursor-pointer transition ${
                !hasDate ? 'border-[#0F4C45] bg-[#0F4C45]/5 text-[#0F4C45]' : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              I don&apos;t have a date yet
            </button>
          </div>

          {hasDate ? (
            <div className="space-y-2">
              <input
                type="date"
                min={todayStr}
                value={setup.examDate || ''}
                onChange={(e) => update({ examDate: e.target.value || null })}
                className="w-full sm:w-auto px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#0F4C45] outline-none text-sm font-bold text-slate-900"
              />
              {setup.examDate && daysLeft !== null && (
                <p className="text-xs font-bold text-[#0F4C45]">
                  {daysLeft === 0
                    ? 'Your exam is today — good luck!'
                    : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left until ${formatExamDate(setup.examDate)}.`}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-600 leading-relaxed">
              No deadline — Barnaby will pace you by your target band.
            </p>
          )}

          <BarnabyBox>
            {hasDate && daysLeft !== null
              ? daysLeft <= 7
                ? 'Your exam is very close — do short timed practice every day now, and rest the day before. No new grammar, just exam habits.'
                : daysLeft <= 30
                ? `You have ${daysLeft} days. That is enough for one full mock every week plus daily module practice — I will keep you on track.`
                : `You have ${daysLeft} days — plenty of time. We will build your skills first, then switch to timed exam practice in the last two weeks.`
              : 'No date yet? No problem. Pick your aim band and practise at your own pace — set a date later whenever you are ready.'}
          </BarnabyBox>
        </section>

        {/* Step 4 — What to practise */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#0F4C45] text-white text-xs font-black flex items-center justify-center">4</span>
            <h2 className="text-base font-black text-slate-900">What do you want to practise?</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SCOPE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = setup.scope === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => update({ scope: opt.id })}
                  className={`p-3.5 rounded-2xl border-2 text-left cursor-pointer transition flex items-start gap-3 ${
                    selected ? 'border-[#0F4C45] bg-[#0F4C45]/5 ring-2 ring-[#0F4C45]/20' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${selected ? 'bg-[#0F4C45] text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Icon className="w-4.5 h-4.5" />
                  </span>
                  <span>
                    <span className="block text-sm font-black text-slate-900">{opt.label}</span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">{opt.detail}</span>
                    <span className="block text-[11px] font-bold text-[#0F4C45] mt-1">{MODULE_TIMINGS[opt.id].minutes}</span>
                  </span>
                  {selected && <Check className="w-4 h-4 text-[#0F4C45] ml-auto shrink-0 mt-1" />}
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider" htmlFor="exam-mock-set">
              Which mock test?
            </label>
            <select
              id="exam-mock-set"
              value={setup.mockSetId}
              onChange={(e) => update({ mockSetId: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#0F4C45] outline-none text-sm font-bold text-slate-900 bg-white cursor-pointer"
            >
              {MOCK_EXAM_SETS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} — {s.format || 'Academic'}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500">
              {selectedSet.title} · {MODULE_TIMINGS[setup.scope].label} · {MODULE_TIMINGS[setup.scope].minutes}
            </p>
          </div>

          <BarnabyBox>
            {setup.scope === 'full'
              ? 'A full mock takes about 2 hours 45 minutes — just like test day. Do it in one sitting, no pauses, and I will show you exactly how far you are from Band ' + setup.targetBand.toFixed(1) + ' afterwards.'
              : setup.scope === 'listening'
              ? 'Listening first — good choice. The audio plays only once, so keep your eyes on the questions while you listen.'
              : setup.scope === 'reading'
              ? 'Reading is a race against the clock: 60 minutes for 3 passages. Try 20 minutes per passage and never leave a question blank.'
              : setup.scope === 'writing'
              ? 'Writing is where Band ' + setup.targetBand.toFixed(1) + ' is won or lost. Spend 20 minutes on Task 1 and 40 minutes on Task 2 — Task 2 counts double.'
              : 'Speaking is a conversation, not an exam interrogation. Relax, speak naturally, and give full answers — one sentence is never enough.'}
          </BarnabyBox>
        </section>

        {/* Start */}
        <div className="sticky bottom-4">
          <button
            type="button"
            onClick={startExam}
            className="w-full min-h-[54px] px-6 py-3.5 rounded-2xl bg-[#F4A62A] hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg transition flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            Start my exam — Band {setup.targetBand.toFixed(1)} · {setup.examMode}
          </button>
          <p className="text-center text-[11px] text-slate-500 mt-2">
            Your setup is saved — Barnaby will use it to guide you inside the exam.
          </p>
        </div>
      </div>
    </div>
  );
};
