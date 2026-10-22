import React from 'react';
import { Download, Smartphone, Laptop, CheckCircle2, X, Sparkles, WifiOff } from 'lucide-react';
import { IELTSSprintLogo } from './IELTSSprintLogo';
import { soundManager } from '../../utils/audioEffects';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => void;
  isInstallable: boolean;
  isInstalled: boolean;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  onInstall,
  isInstallable,
  isInstalled
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-slate-900 dark:text-white">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <IELTSSprintLogo variant="symbol" size="md" />
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">Install IELTS SPRINT</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Desktop & Mobile Standalone App</p>
            </div>
          </div>
          <button
            onClick={() => {
              soundManager.playBeep(450, 0.04);
              onClose();
            }}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Features Checklist */}
        <div className="space-y-2.5 p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/60 text-xs">
          <div className="flex items-center gap-2 font-bold text-blue-950 dark:text-blue-200">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Why Install IELTS SPRINT?</span>
          </div>
          <ul className="space-y-2 text-slate-700 dark:text-slate-300">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span><strong>Instant Audio Playback</strong>: 0ms audio buffering directly from device storage.</span>
            </li>
            <li className="flex items-center gap-2">
              <WifiOff className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span><strong>100% Offline Access</strong>: Practice vocabulary and drills without active Wi-Fi.</span>
            </li>
            <li className="flex items-center gap-2">
              <Smartphone className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span><strong>Full Screen Exam Mode</strong>: Distraction-free interface matching IDP/British Council centers.</span>
            </li>
          </ul>
        </div>

        {/* Action Button */}
        {isInstalled ? (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>IELTS SPRINT is already installed on this device!</span>
          </div>
        ) : isInstallable ? (
          <button
            onClick={async () => {
              soundManager.playSuccess();
              await onInstall();
              onClose();
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-sm transition shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Install App Now</span>
          </button>
        ) : (
          <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
            <p className="font-semibold">To install manually from your browser:</p>
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 space-y-1.5 font-mono text-[11px]">
              <div><strong>Chrome / Edge</strong>: Click the install icon in address bar or Menu (⋮) → "Install IELTS SPRINT"</div>
              <div><strong>Safari (iOS)</strong>: Tap Share (<span className="text-blue-500">↑</span>) → "Add to Home Screen"</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
