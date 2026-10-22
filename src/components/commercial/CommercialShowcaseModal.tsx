import React from 'react';
import {
  X,
  Sparkles,
  Award,
  CheckCircle2,
  Mic,
  Headphones,
  BookOpen,
  PenTool,
  Globe2,
  ShieldCheck,
  Star,
  Users,
  Compass,
  ArrowRight
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';

interface CommercialShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToPractice: () => void;
}

export const CommercialShowcaseModal: React.FC<CommercialShowcaseModalProps> = ({
  isOpen,
  onClose,
  onNavigateToPractice
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="commercial-showcase-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#0B1224] border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-7 space-y-6 text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(450, 0.03);
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
          aria-label="Close Showcase"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Header */}
        <div className="space-y-2 pr-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Official Commercial Overview</span>
          </div>
          <h2
            id="commercial-showcase-title"
            className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight"
          >
            IELTS Sprint™ — The Premier AI-Powered Cambridge IELTS Platform
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Engineered for ambitious candidates targeting <strong>Band 7.5 to 9.0</strong> in both Academic and General Training modules. Combines authentic Cambridge syllabus standards with cutting-edge British voice examiners and instant scoring.
          </p>
        </div>

        {/* Free Access Notice */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                100% Free Launch Community Access
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300">
                All mock tests, AI speech evaluations, and Band 9 model answers are currently unlocked for every candidate.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(650, 0.04);
              onClose();
              onNavigateToPractice();
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow cursor-pointer"
          >
            <span>Start Practice</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 4 Core Pillars */}
        <div className="space-y-3">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Why IELTS Sprint Leads Cambridge Preparation
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Pillar 1 */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm">
                <Mic className="w-4 h-4 shrink-0" />
                <span>AI Cambridge Voice Examiner</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Experience authentic speaking interviews with British RP pronunciation, structured Part 1-3 prompts, and real-time fluency & vocabulary diagnostics.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                <Headphones className="w-4 h-4 shrink-0" />
                <span>Authentic 4-Section Listening Lab</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                40-question timed exams with realistic multi-accent audio, live transcript toggles, and instant Cambridge raw-to-band conversion.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-sm">
                <PenTool className="w-4 h-4 shrink-0" />
                <span>Band 9 Writing Diagnostic</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                In-depth automated assessment scored against official IELTS descriptors: Task Achievement, Coherence & Cohesion, Lexical Resource, and GRA.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>C1/C2 Lexical Vault with Bangla</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                1,000+ academic words, high-scoring idioms, and collocations with precise Bengali explanations for swift comprehension and retention.
              </p>
            </div>
          </div>
        </div>

        {/* Cambridge Alignment & Trust Badges */}
        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Strict Cambridge Standard Alignment</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Cambridge 1–19 Syllabus</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>British Council & IDP Format</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Academic & General</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>PWA Offline Ready</span>
            </div>
          </div>
        </div>

        {/* Student Testimonials */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Candidate Success Stories
            </span>
            <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-500" />
              <span>4.9 / 5.0 (1,240+ Candidate Reviews)</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">Tanvir H. (Dhaka)</span>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-mono font-bold text-[10px]">Band 8.0</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] italic">
                "The AI Speaking examiner cured my hesitation. Practiced 40+ mock interviews and got an 8.0 in Speaking on my first attempt!"
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">Sumaiya K. (Chittagong)</span>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-mono font-bold text-[10px]">Band 8.5</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] italic">
                "Having the C1/C2 idioms explained in Bangla alongside Cambridge example sentences made all the difference in Writing Task 2."
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(650, 0.04);
              onClose();
              onNavigateToPractice();
            }}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer"
          >
            <span>Start IELTS Sprint Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
