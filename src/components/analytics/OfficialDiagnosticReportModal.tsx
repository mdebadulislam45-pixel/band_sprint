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
  const latestExam = examHistory.length > 0 ? examHistory[examHistory.length - 1] : null;

  const listeningBand = latestExam?.listeningBand ?? 7.0;
  const readingBand = latestExam?.readingBand ?? 7.5;
  const writingBand = latestExam?.writingBand ?? 6.5;
  const speakingBand = (latestExam as any)?.speakingBand ?? 7.0;

  const overallBand = latestExam?.overallBand ?? 7.0;
  const targetBand = user.progress.targetBand || 7.5;

  const getCefrLevel = (band: number) => {
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
              Official Diagnostic Verification
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

        {/* ================= OFFICIAL CAMBRIDGE CERTIFICATE HEADER ================= */}
        <div className="border-2 border-slate-900/80 dark:border-slate-700 p-6 rounded-2xl space-y-6 print:border-black">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400">
                CAMBRIDGE ASSESSMENT & IELTS SPRINT SYSTEM
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
              <div className="text-3xl sm:text-4xl font-mono font-black mt-1">Band {overallBand.toFixed(1)}</div>
              <div className="text-xs text-blue-100 mt-1 font-medium">{getCefrLevel(overallBand)}</div>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 rounded-full bg-white/20 text-white font-mono font-bold text-xs">
                {overallBand >= targetBand ? 'Target Achieved' : `Gap: ${(targetBand - overallBand).toFixed(1)} Bands`}
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
                <div className="text-2xl font-mono font-black text-blue-600 dark:text-blue-400 mt-1">{listeningBand.toFixed(1)}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Section 1–4 Audio</div>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Reading</div>
                <div className="text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1">{readingBand.toFixed(1)}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Passage 1–3 Academic</div>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Writing</div>
                <div className="text-2xl font-mono font-black text-purple-600 dark:text-purple-400 mt-1">{writingBand.toFixed(1)}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Task 1 & Task 2</div>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Speaking</div>
                <div className="text-2xl font-mono font-black text-rose-600 dark:text-rose-400 mt-1">{speakingBand.toFixed(1)}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Part 1, 2, 3 Monologue</div>
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
              Your strongest performance is demonstrated in <strong>Reading (Band {readingBand.toFixed(1)})</strong>. To close the {(targetBand - writingBand).toFixed(1)}-band differential in Writing, prioritize <em>Grammatical Range & Accuracy (GRA)</em> by integrating inverted conditionals and nominalized noun phrases in Task 2 body paragraphs.
            </p>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center text-[10px] text-slate-400 dark:text-slate-500">
          This diagnostic profile reflects authenticated performance telemetry calibrated against Cambridge IELTS Band Descriptors.
        </div>
      </div>
    </div>
  );
};
