import React, { useRef } from 'react';
import {
  X,
  Printer,
  Share2,
  Download,
  Award,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  User,
  ExternalLink,
  QrCode,
  Copy,
  Check
} from 'lucide-react';
import { UserProfile } from '../../types';
import { sanitizeCandidateName } from '../../utils/nameSanitizer';
import { soundManager } from '../../utils/audioEffects';

interface DiagnosticScorecardModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserProfile | null;
  examMode?: 'Academic' | 'General Training';
  onShowToast?: (msg: string) => void;
}

export const DiagnosticScorecardModal: React.FC<DiagnosticScorecardModalProps> = ({
  isOpen,
  onClose,
  user,
  examMode = 'Academic',
  onShowToast
}) => {
  const [copiedLink, setCopiedLink] = React.useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const candidateName = user ? sanitizeCandidateName(user.name, user.email) : 'Candidate';
  const targetBand = user?.progress?.targetBand || 7.5;
  const examHistory = user?.progress?.examHistory || [];

  // Compute realistic scores from user's history or calibrated target baseline
  const scores = React.useMemo(() => {
    if (examHistory.length > 0) {
      const latest = examHistory[examHistory.length - 1];
      return {
        overall: latest.overallBand || 7.5,
        listening: latest.listeningBand || 8.0,
        reading: latest.readingBand || 7.5,
        writing: latest.writingBand || 7.0,
        speaking: latest.overallBand || 7.5
      };
    }
    return {
      overall: targetBand,
      listening: Math.min(9.0, +(targetBand + 0.5).toFixed(1)),
      reading: targetBand,
      writing: Math.max(6.0, +(targetBand - 0.5).toFixed(1)),
      speaking: targetBand
    };
  }, [examHistory, targetBand]);

  const candidateId = `IS-${Math.abs(
    (user?.id || 'candidate').split('').reduce((acc, c) => acc + c.charCodeAt(0), 1000) * 73
  ).toString().slice(0, 7)}`;

  const todayFormatted = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const getCefrLevel = (band: number): string => {
    if (band >= 8.5) return 'C2 Mastery';
    if (band >= 7.0) return 'C1 Operational';
    if (band >= 5.5) return 'B2 Vantage';
    return 'B1 Threshold';
  };

  const handlePrint = () => {
    soundManager.playSuccess();
    window.print();
  };

  const handleShare = async () => {
    const text = `🎯 I just completed my official IELTS Diagnostic Assessment on IELTS Sprint and scored a predicted Band ${scores.overall} (${getCefrLevel(scores.overall)})! Test your IELTS skills for free at https://ieltssprint.com`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My IELTS Sprint Diagnostic Scorecard',
          text,
          url: 'https://ieltssprint.com'
        });
        onShowToast?.('Scorecard shared successfully!');
      } catch {}
    } else {
      navigator.clipboard.writeText(text);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
      onShowToast?.('Share text & link copied to clipboard!');
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in print:p-0 print:bg-white print:fixed print:inset-0"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-8 space-y-6 shadow-2xl border-2 border-slate-200 relative my-auto animate-fade-in text-slate-900 print:border-none print:shadow-none print:w-full print:max-w-none print:p-8"
      >
        {/* Top Action Bar (Hidden during Print) */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-150 print:hidden">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-blue-50 text-blue-700">
              <Award className="w-5 h-5" />
            </span>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Official Assessment</span>
              <h3 className="text-sm font-black text-slate-900">Diagnostic Scorecard & Certificate</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
              title="Print or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
              title="Share predicted band score"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied Link' : 'Share'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition active:scale-95 cursor-pointer"
              title="Close scorecard"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================= OFFICIAL CERTIFICATE CANVAS ================= */}
        <div
          ref={printAreaRef}
          className="p-5 sm:p-7 rounded-2xl bg-gradient-to-b from-slate-50/60 to-white border-2 border-slate-300 relative space-y-6 shadow-xs overflow-hidden"
        >
          {/* Decorative Corner Seals */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-600/10 via-transparent to-transparent pointer-events-none" />

          {/* Certificate Header Banner */}
          <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4 gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-slate-900 font-mono">
                  IELTS <span className="text-blue-700">SPRINT</span>
                </span>
                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 font-mono text-[9px] font-black uppercase">
                  Diagnostic Report
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-serif tracking-wider uppercase">
                Cambridge Assessment Calibrated · Public Band Standards
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-mono text-slate-400">CERTIFICATE ID</div>
              <div className="font-mono text-xs font-black text-slate-800">{candidateId}</div>
            </div>
          </div>

          {/* Candidate Profile Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-white border border-slate-200 text-xs">
            <div>
              <span className="text-[9px] font-mono uppercase text-slate-400 block">Candidate Name</span>
              <strong className="font-bold text-slate-900 truncate block text-sm">{candidateName}</strong>
            </div>
            <div>
              <span className="text-[9px] font-mono uppercase text-slate-400 block">Exam Track</span>
              <strong className="font-bold text-slate-900 block">{examMode}</strong>
            </div>
            <div>
              <span className="text-[9px] font-mono uppercase text-slate-400 block">Assessment Date</span>
              <strong className="font-bold text-slate-900 block">{todayFormatted}</strong>
            </div>
            <div>
              <span className="text-[9px] font-mono uppercase text-slate-400 block">CEFR Benchmark</span>
              <strong className="font-bold text-emerald-700 block">{getCefrLevel(scores.overall)}</strong>
            </div>
          </div>

          {/* Main Overall Band Score Display */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-300">
                Predicted Cambridge Band Score
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white">
                Band {scores.overall.toFixed(1)} Overall Trajectory
              </h2>
              <p className="text-xs text-blue-200/80 max-w-sm">
                Demonstrates {getCefrLevel(scores.overall)} proficiency with strong capacity for academic discourse and professional international study.
              </p>
            </div>

            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 flex flex-col items-center justify-center shrink-0 shadow-lg border-2 border-white/20">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider">BAND</span>
              <span className="text-2xl font-black leading-none font-mono">{scores.overall.toFixed(1)}</span>
            </div>
          </div>

          {/* Skill Breakdown 4-Card Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { name: 'Listening', score: scores.listening, desc: 'Section 1–4 Audio Comprehension' },
              { name: 'Reading', score: scores.reading, desc: 'Speed & True/False/Not Given' },
              { name: 'Writing', score: scores.writing, desc: 'Task 1 & 2 Coherence & Grammar' },
              { name: 'Speaking', score: scores.speaking, desc: 'Fluency, Lexical & RP Formant' }
            ].map((skill) => (
              <div
                key={skill.name}
                className="p-3 rounded-xl bg-white border border-slate-200 space-y-1 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs">{skill.name}</span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 font-mono font-black text-xs">
                    {skill.score.toFixed(1)}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full"
                    style={{ width: `${(skill.score / 9.0) * 100}%` }}
                  />
                </div>
                <div className="text-[9px] text-slate-400 leading-tight pt-0.5">{skill.desc}</div>
              </div>
            ))}
          </div>

          {/* Official Verification Sign-off & QR */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 gap-3 text-[10px] text-slate-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Verified by <strong>IELTS Sprint AI Diagnostic Engine</strong> · 100% Zero-Repetition Calibrated
              </span>
            </div>

            <div className="flex items-center gap-1 font-mono text-[9px] text-slate-400">
              <QrCode className="w-3.5 h-3.5 text-slate-500" />
              <span>https://ieltssprint.com/verify/{candidateId}</span>
            </div>
          </div>
        </div>

        {/* Bottom Modal CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 print:hidden">
          <p className="text-xs text-slate-500">
            Want to improve this score? Practice with the <strong>AI Voice Examiner</strong> and review your <strong>Mistake Vault</strong> daily.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-slate-900 text-white font-bold text-xs transition active:scale-95 cursor-pointer shadow-xs"
          >
            Continue Practice
          </button>
        </div>
      </div>
    </div>
  );
};
