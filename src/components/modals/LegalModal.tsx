import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  FileText,
  RefreshCw,
  Mail,
  Lock,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  Building
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';

export type LegalModalTab = 'privacy' | 'terms' | 'refund' | 'contact';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalModalTab;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'terms'
}) => {
  const [activeTab, setActiveTab] = useState<LegalModalTab>(initialTab);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#0E1626] rounded-3xl max-w-2xl w-full p-5 sm:p-7 space-y-5 shadow-2xl border border-slate-200 dark:border-slate-800 relative my-auto animate-fade-in text-slate-900 dark:text-slate-100 max-h-[90vh] flex flex-col"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Legal & Candidate Protection
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                BandSprint · Practice AI Platform Policies
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center transition active:scale-95 cursor-pointer"
            aria-label="Close legal modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl shrink-0 overflow-x-auto">
          {[
            { id: 'terms', label: 'Terms of Service', icon: FileText },
            { id: 'privacy', label: 'Privacy Policy', icon: Lock },
            { id: 'refund', label: 'Refund Policy', icon: RefreshCw },
            { id: 'contact', label: 'Support & Contact', icon: Mail }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  soundManager.playBeep(isActive ? 500 : 640, 0.03);
                  setActiveTab(tab.id as LegalModalTab);
                }}
                className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {/* TAB 1: TERMS OF SERVICE */}
          {activeTab === 'terms' && (
            <div className="space-y-3.5 animate-fade-in">
              <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-950 dark:text-blue-200 text-xs">
                <strong>Effective Date:</strong> January 2026 · Governing IELTS Preparation Services
              </div>

              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">1. Educational Nature of the Service</h3>
                <p>
                  BandSprint is an independent educational diagnostic web application engineered to assist candidates preparing for the IELTS Academic and General Training examinations. BandSprint is not officially affiliated with or endorsed by Cambridge Assessment English, IDP: IELTS Australia, or the British Council.
                </p>
              </div>

              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">2. AI Diagnostics & Band Score Estimates</h3>
                <p>
                  Automated band scores generated by the AI Voice Examiner and Writing Evaluator reflect algorithmic alignment with the official IELTS public band descriptors. While calibrated to high fidelity, these scores serve as pedagogical diagnostics rather than official test results.
                </p>
              </div>

              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">3. Acceptable Use</h3>
                <p>
                  Candidates agree to use BandSprint solely for personal academic practice. Automated scraping of question banks, audio stems, or reverse engineering of the Zero-Repetition Engine without express written consent is strictly prohibited.
                </p>
              </div>

              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">4. Account Responsibility</h3>
                <p>
                  Users are responsible for maintaining the confidentiality of their session tokens and local study progress. BandSprint reserves the right to terminate accounts that attempt to bypass rate limits or compromise server integrity.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: PRIVACY POLICY */}
          {activeTab === 'privacy' && (
            <div className="space-y-3.5 animate-fade-in">
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-950 dark:text-emerald-200 text-xs">
                <strong>Your Privacy is Sacred:</strong> Zero data reselling, encrypted telemetry, and strict GDPR-compliant data processing.
              </div>

              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">1. Audio Recordings & Voice Data</h3>
                <p>
                  Microphone input captured during Speaking Lab simulations is processed in real-time strictly for pronunciation analysis and syllable stress calibration. Voice audio streams are never sold to data brokers or used to train third-party advertising algorithms.
                </p>
              </div>

              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">2. Candidate Essay Submissions</h3>
                <p>
                  Written responses submitted to Writing Task 1 and Task 2 are evaluated by our secure server proxy. Essays are stored locally within the candidate's browser storage and synchronized securely with our encrypted database for progress tracking.
                </p>
              </div>

              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">3. Analytics & Cookies</h3>
                <p>
                  We store essential session cookies to remember dark/light mode preferences, target band scores, and study streak counts. We do not employ intrusive tracking cookies across external websites.
                </p>
              </div>

              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">4. Data Deletion Rights</h3>
                <p>
                  Candidates may reset their entire study record, mistake vault, and profile history at any time through the Profile Settings tab with 1-click irreversible deletion.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: REFUND POLICY */}
          {activeTab === 'refund' && (
            <div className="space-y-3.5 animate-fade-in">
              <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-950 dark:text-amber-200 text-xs">
                <strong>Customer Satisfaction Guarantee:</strong> Clear, candidate-first billing policies for all premium packages.
              </div>

              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">1. Three-Day Free Trial Protection</h3>
                <p>
                  All candidates are entitled to a full 72-hour Free Trial upon account creation or voucher activation. You will never be charged without explicit checkout authorization.
                </p>
              </div>

              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">2. 7-Day Refund Policy</h3>
                <p>
                  If you purchase a paid plan (such as Sprint Premium at ৳150/month) and experience verifiable technical outages or service interruptions, you may request a 100% refund within 7 days of payment.
                </p>
              </div>

              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">3. Payment Methods & Processing</h3>
                <p>
                  Refunds for bKash, Nagad, and Card transactions are credited directly to the original funding source within 3–5 business days following verification by our billing desk.
                </p>
              </div>

              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">4. How to Request a Refund</h3>
                <p>
                  Send your Transaction ID (TrxID) and account email to <span className="font-mono font-bold text-blue-600 dark:text-blue-400">billing@bandsprint.app</span> with the subject line "Refund Request".
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: SUPPORT & CONTACT */}
          {activeTab === 'contact' && (
            <div className="space-y-3.5 animate-fade-in">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-black text-slate-900 dark:text-white text-sm">BandSprint Academic Hub</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Dedicated candidate support for test-takers across Bangladesh, South Asia, and global international study applicants.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="font-mono text-[10px] uppercase text-slate-400 block mb-0.5">General Inquiries:</span>
                    <a href="mailto:support@bandsprint.app" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
                      support@bandsprint.app
                    </a>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="font-mono text-[10px] uppercase text-slate-400 block mb-0.5">Billing & Refunds:</span>
                    <a href="mailto:billing@bandsprint.app" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
                      billing@bandsprint.app
                    </a>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs">WhatsApp Candidate Helpline</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Direct assistance for practice, mock exams & vouchers</p>
                  </div>
                </div>

                <a
                  href="https://wa.me/8801700000000?text=Hello%20IELTS%20Sprint%20Support%2C%20I%20need%20help%20with%20my%20IELTS%20preparation."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span>Chat on WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-150 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-slate-400 font-mono">
            SSL 256-Bit Encrypted · Practice Standard
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-xs transition active:scale-95 cursor-pointer"
          >
            Close Policy Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
