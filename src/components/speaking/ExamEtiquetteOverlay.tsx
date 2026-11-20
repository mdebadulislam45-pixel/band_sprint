import React, { useState, useEffect } from 'react';
import {
  Eye,
  UserCheck,
  CheckCircle2,
  X,
  Camera,
  Mic,
  ArrowRight,
  ShieldCheck,
  Volume2,
  Sparkles,
  Info
} from 'lucide-react';

export interface ExamEtiquetteOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onDismissForever?: () => void;
  onEnableCamera?: () => void;
  isCameraActive?: boolean;
}

const ETIQUETTE_TIPS = [
  {
    id: 'eye_contact',
    icon: Eye,
    title: 'Camera at Eye Level & Direct Gaze',
    badge: 'Eye Contact',
    description:
      'Elevate your laptop or webcam to eye level. In Practice video assessments, looking directly into the camera or examiner’s eyes conveys natural confidence and sustained communicative presence.',
    checklist: [
      'Position webcam at or slightly above eye level (avoid looking downward)',
      'Look at the examiner when framing thoughts, not at floor or notes',
      'Natural glances away while thinking are expected—avoid staring blankly'
    ]
  },
  {
    id: 'posture',
    icon: UserCheck,
    title: 'Upright, Open Thoracic Posture',
    badge: 'Posture & Breath',
    description:
      'Sit comfortably upright with shoulders gently back and both feet grounded. Good seated posture expands your diaphragm, providing steady airflow for crisp multisyllabic pronunciation and 2-minute Part 2 monologues.',
    checklist: [
      'Keep head and upper shoulders centered in the candidate booth',
      'Rest forearms lightly on desk; avoid leaning on hands or slumping',
      'Inhale from your diaphragm to maintain steady volume across long turns'
    ]
  },
  {
    id: 'acoustics',
    icon: Mic,
    title: 'Optimal Microphone Distance (15–30 cm)',
    badge: 'Vocal Clarity',
    description:
      'Speak at an even, conversational tempo with distinct sentence stress. The AI examiner evaluates audible connected speech; keep your microphone within 15–30 cm and enunciate final consonant sounds.',
    checklist: [
      'Test your room for background echo, street noise, or fan hum',
      'Speak in sustained sentences (the examiner requires >= 5 words per turn)',
      'Pause at clause boundaries instead of filler sounds like "um" or "uh"'
    ]
  },
  {
    id: 'lighting',
    icon: Sparkles,
    title: 'Frontal Diffused Room Lighting',
    badge: 'Video Presence',
    description:
      'Place a gentle light source directly in front of your face rather than behind you. Strong backlighting casts silhouettes and makes posture tracking and eye-contact metrics unreliable.',
    checklist: [
      'Avoid sitting directly in front of bright windows or unshaded lamps',
      'Ensure your facial expressions and mouth movements are clearly visible',
      'Maintain an uncluttered, distraction-free examination space'
    ]
  }
];

export const ExamEtiquetteOverlay: React.FC<ExamEtiquetteOverlayProps> = ({
  isOpen,
  onClose,
  onDismissForever,
  onEnableCamera,
  isCameraActive = false
}) => {
  const [selectedTipIndex, setSelectedTipIndex] = useState<number>(0);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(true);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        handleConfirmDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, dontShowAgain]);

  if (!isOpen) return null;

  const handleToggleCheck = (key: string) => {
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConfirmDismiss = () => {
    if (dontShowAgain && onDismissForever) {
      onDismissForever();
    }
    onClose();
  };

  const currentTip = ETIQUETTE_TIPS[selectedTipIndex];
  const totalChecklistItems = ETIQUETTE_TIPS.reduce((acc, t) => acc + t.checklist.length, 0);
  const completedCount = Object.values(checkedItems).filter(Boolean).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="etiquette-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/80 shadow-2xl shadow-cyan-950/40 text-slate-100 overflow-hidden">
        {/* Header Bar */}
        <div className="px-5 sm:px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="etiquette-title" className="text-base sm:text-lg font-black text-white tracking-tight">
                  Official Exam Etiquette & Posture Guide
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-[10px] font-bold text-cyan-300">
                  Practice Video-Call Standards
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Optimize your posture, gaze, and acoustic setup for maximum fluency and scoring performance.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleConfirmDismiss}
            aria-label="Close etiquette briefing"
            className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 sm:px-6 pt-3 pb-1 bg-slate-900/50 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          {ETIQUETTE_TIPS.map((tip, idx) => {
            const Icon = tip.icon;
            const isSelected = idx === selectedTipIndex;
            return (
              <button
                key={tip.id}
                type="button"
                onClick={() => setSelectedTipIndex(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/40 shadow-xs'
                    : 'bg-slate-800/50 text-slate-400 hover:text-slate-200 border border-slate-700/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{tip.badge}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-sm">
          {/* Active Tip Card */}
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/60 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-300 shrink-0">
                <currentTip.icon className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm sm:text-base font-bold text-white">{currentTip.title}</h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{currentTip.description}</p>
              </div>
            </div>

            {/* Interactive Checklist for this Tip */}
            <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Action Checklist (Click to verify)</span>
              </div>
              <div className="space-y-2">
                {currentTip.checklist.map((item, itemIdx) => {
                  const checkKey = `${currentTip.id}_${itemIdx}`;
                  const isChecked = !!checkedItems[checkKey];
                  return (
                    <button
                      key={checkKey}
                      type="button"
                      onClick={() => handleToggleCheck(checkKey)}
                      className={`w-full text-left p-2.5 rounded-lg border transition flex items-start gap-2.5 cursor-pointer text-xs ${
                        isChecked
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center mt-0.5 shrink-0 transition ${
                          isChecked
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                            : 'border-slate-600 bg-slate-800'
                        }`}
                      >
                        {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                      <span className={isChecked ? 'line-through opacity-85' : ''}>{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Camera Booth Integration CTA */}
          <div className="rounded-xl bg-gradient-to-r from-blue-950/40 to-slate-900/80 border border-blue-800/40 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Camera className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="font-bold text-white">Candidate Camera Preview: </span>
                <span className={isCameraActive ? 'text-emerald-300 font-semibold' : 'text-slate-300'}>
                  {isCameraActive ? 'Active and tracking posture' : 'Off (Camera preview is optional & 100% in-browser)'}
                </span>
              </div>
            </div>
            {!isCameraActive && onEnableCamera && (
              <button
                type="button"
                onClick={onEnableCamera}
                className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition cursor-pointer text-[11px]"
              >
                Enable Camera Now
              </button>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-900/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <label className="flex items-center gap-2 text-xs text-slate-400 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
            />
            <span>Don&apos;t show again automatically on entry</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConfirmDismiss}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm transition flex items-center gap-1.5 shadow-md shadow-cyan-600/20 cursor-pointer"
            >
              <span>I&apos;m Ready — Enter Studio</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
