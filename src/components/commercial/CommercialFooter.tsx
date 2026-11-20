import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  Globe2,
  Mail,
  FileText,
  Lock,
  Rocket,
  Heart,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';

interface CommercialFooterProps {
  onOpenShowcase: () => void;
  onOpenLegal: (tab: 'terms' | 'privacy') => void;
  onOpenContact: () => void;
  onOpenSeoGuide: () => void;
  onNavigate: (page: string) => void;
}

export const CommercialFooter: React.FC<CommercialFooterProps> = ({
  onOpenShowcase,
  onOpenLegal,
  onOpenContact,
  onOpenSeoGuide,
  onNavigate
}) => {
  return (
    <footer className="w-full mt-12 pt-8 pb-16 md:pb-8 border-t border-slate-200/90 dark:border-slate-800/90 text-slate-600 dark:text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 sm:gap-8">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-sm">
                S
              </div>
              <span className="font-black text-slate-900 dark:text-white text-base tracking-tight">
                BandSprint™
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              The premier AI-driven IELTS preparation platform. High-fidelity audio labs, AI British voice examiners, and Band 9 model answers for ambitious candidates.
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Free to Start — No Card Needed</span>
            </div>
          </div>

          {/* Quick Practice Modules */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
              Practice Modules
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playBeep(520, 0.03);
                    onNavigate('listening');
                  }}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  Realistic Listening Lab
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playBeep(520, 0.03);
                    onNavigate('speaking');
                  }}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  AI Speaking Examiner
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playBeep(520, 0.03);
                    onNavigate('writing');
                  }}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  Band 9 Writing Evaluator
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playBeep(520, 0.03);
                    onNavigate('reading');
                  }}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  Academic Reading Lab
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playBeep(520, 0.03);
                    onNavigate('vocab');
                  }}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  C1/C2 Vocabulary Vault (Bangla)
                </button>
              </li>
            </ul>
          </div>

          {/* Commercial & Company */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
              Commercial & About
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playBeep(520, 0.03);
                    onOpenShowcase();
                  }}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition flex items-center gap-1"
                >
                  <span>Why BandSprint</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold">New</span>
                </button>
              </li>

              <li>
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playBeep(520, 0.03);
                    onOpenContact();
                  }}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition flex items-center gap-1"
                >
                  <Mail className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Student Support & Feedback</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Trust & Legal */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
              Trust & Legal
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playBeep(520, 0.03);
                    onOpenLegal('terms');
                  }}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Terms of Service</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playBeep(520, 0.03);
                    onOpenLegal('privacy');
                  }}
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Privacy Policy & Security</span>
                </button>
              </li>
              <li className="pt-1 text-[11px] text-slate-400 dark:text-slate-500">
                IELTS-aligned standards.
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer & Copyright */}
        <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400 dark:text-slate-500">
          <p className="text-center sm:text-left">
            IELTS® is a registered trademark of Cambridge University Press & Assessment, British Council, and IDP Education Australia. BandSprint™ is an independent diagnostic platform.
          </p>
          <div className="flex items-center gap-3 shrink-0">
            <span>© 2026 BandSprint Global. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
