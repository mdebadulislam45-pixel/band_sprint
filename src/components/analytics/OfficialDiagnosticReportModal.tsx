import React from 'react';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Download,
  X,
  FileText,
  TrendingUp,
  Brain,
  ShieldCheck,
  Calendar,
  Sparkles
} from 'lucide-react';
import { UserProfile } from '../../types';
import { soundManager } from '../../utils/audioEffects';
import { aggregateExamHistory } from '../../utils/historyAggregation';

interface OfficialDiagnosticReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
}

export const OfficialDiagnosticReportModal: React.FC<OfficialDiagnosticReportModalProps> = ({
  isOpen,
  onClose,
  user
}) => {
  if (!isOpen) return null;

  const examHistory = user.progress.examHistory || [];
  const agg = aggregateExamHistory(examHistory);

  // Genuine validated scores: never infer overall band from fewer than 4 valid skills
  const listeningBand = agg.skills.listening.latest;
  const readingBand = agg.skills.reading.latest;
  const writingBand = agg.skills.writing.latest;
  const speakingBand = agg.skills.speaking.latest;
  const overallBand = agg.overall.latest;

  const targetBand = user.progress.targetBand || 7.5;

  const getCefrLevel = (band: number | null) => {
    if (band === null || band < 0.5) return 'Not assessed';
    if (band >= 8.5) return 'C2 Mastery';
    if (band >= 7.0) return 'C1 Operational Proficiency';
    if (band >= 5.5) return 'B2 Independent User';
    return 'B1 Threshold';
  };

  const handlePrint = () => {
    soundManager.playBeep(640, 0.04);
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in select-none">
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-8 space-y-6 print:p-0 print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Modal Top Actions (Hidden in Print) */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Diagnostic Verification
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= BANDSPRINT DIAGNOSTIC REPORT HEADER ================= */}
        <div className="border-2 border-slate-900/80 dark:border-slate-700 p-6 rounded-2xl space-y-6 print:border-black">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400">
                BandSprint Diagnostic System
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                Candidate Diagnostic Performance Profile
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Standardized Evaluation Protocol · CEFR Equivalence Document
              </p>
            </div>

            <div className="text-left sm:text-right font-mono text-xs">
              <div className="font-bold text-slate-900 dark:text-white">Report ID: TRF-{user.id.slice(0, 8).toUpperCase()}</div>
              <div className="text-slate-500 text-[11px] mt-0.5">Issued: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            </div>
          </div>

          {/* Candidate Profile Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] font-mono text-slate-500 uppercase font-bold">Candidate</div>
              <div className="font-bold text-slate-900 dark:text-white truncate mt-0.5">{user.name}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] font-mono text-slate-500 uppercase font-bold">Exam Track</div>
              <div className="font-bold text-slate-900 dark:text-white truncate mt-0.5">{user.progress.intendedFormat || 'Academic'}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] font-mono text-slate-500 uppercase font-bold">Target Band</div>
              <div className="font-bold text-blue-600 dark:text-blue-400 font-mono mt-0.5">{targetBand.toFixed(1)}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] font-mono text-slate-500 uppercase font-bold">CEFR Rating</div>
              <div className="font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{getCefrLevel(overallBand).split(' ')[0]}</div>
            </div>
          </div>

          {/* Overall Band Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between shadow-md print:bg-black">
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-blue-200">Overall Estimated Band</div>
              <div className="text-3xl sm:text-4xl font-mono font-black mt-1">
                {overallBand !== null ? `Band ${overallBand.toFixed(1)}` : 'Unassessed'}
              </div>
              <div className="text-xs text-blue-100 mt-1 font-medium">{getCefrLevel(overallBand)}</div>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 rounded-full bg-white/20 text-white font-mono font-bold text-xs">
                {overallBand !== null
                  ? overallBand >= targetBand
                    ? 'Target Achieved'
                    : `Gap: ${(targetBand - overallBand).toFixed(1)} Bands`
                  : 'Assessment Required'}
              </span>
            </div>
          </div>

          {/* 4 Core Skills Band Grid */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Sub-Test Band Breakdown
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Listening</div>
                <div className="text-2xl font-mono font-black text-blue-600 dark:text-blue-400 mt-1">
                  {listeningBand !== null ? listeningBand.toFixed(1) : '—'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {listeningBand !== null ? 'Section 1–4 Audio' : 'Not Attempted'}
                </div>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Reading</div>
                <div className="text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {readingBand !== null ? readingBand.toFixed(1) : '—'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {readingBand !== null ? 'Passage 1–3 Academic' : 'Not Attempted'}
                </div>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Writing</div>
                <div className="text-2xl font-mono font-black text-purple-600 dark:text-purple-400 mt-1">
                  {writingBand !== null ? writingBand.toFixed(1) : '—'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {writingBand !== null ? 'Task 1 & Task 2' : 'Not Attempted'}
                </div>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Speaking</div>
                <div className="text-2xl font-mono font-black text-rose-600 dark:text-rose-400 mt-1">
                  {speakingBand !== null ? speakingBand.toFixed(1) : '—'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {speakingBand !== null ? 'Part 1, 2, 3 Monologue' : 'Not Attempted'}
                </div>
              </div>
            </div>
          </div>

          {/* Examiner Prescription & Diagnostic Advice */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Official Examiner Prescription for Band {targetBand.toFixed(1)}+</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {overallBand !== null
                ? `Based on verified assessment history, your current trajectory is Band ${overallBand.toFixed(1)}. To achieve your target Band ${targetBand.toFixed(1)}+, focus on balancing all 4 test modules with consistent practice drills and review common errors in the Mistake Vault.`
                : `Complete a verified mock exam or module test in Listening, Reading, Writing, or Speaking to generate your tailored Practice assessment prescription.`}
            </p>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center text-[10px] text-slate-400 dark:text-slate-500">
          This diagnostic profile reflects authenticated performance telemetry calibrated against IELTS Band Descriptors.
        </div>
      </div>
    </div>
  );
};
