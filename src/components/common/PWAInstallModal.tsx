import React from 'react';
import { Download, Smartphone, CheckCircle2, X, Sparkles, WifiOff, Share } from 'lucide-react';
import { BandSprintMark } from './BandSprintMark';
import { soundManager } from '../../utils/audioEffects';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => Promise<boolean> | void;
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071110]/70 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Install BandSprint App"
    >
      <div className="w-full max-w-md bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/40 rounded-2xl p-6 shadow-2xl space-y-5 text-[#0E1F1E] dark:text-[#EEF3F1]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <BandSprintMark size={40} />
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold tracking-tight">
                Install BandSprint
              </h3>
              <p className="text-xs text-[#566664] dark:text-slate-400">
                Desktop &amp; Mobile Offline Study Pack
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(450, 0.04);
              onClose();
            }}
            aria-label="Close install dialog"
            className="p-1.5 rounded-lg bg-[#EEF3F1] dark:bg-[#0B1514] hover:bg-[#D3DDDA] dark:hover:bg-[#182C29] text-[#566664] dark:text-slate-300 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Features Checklist */}
        <div className="space-y-2.5 p-4 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-xs">
          <div className="flex items-center gap-2 font-bold text-[#0F4C45] dark:text-[#4DB6A4]">
            <Sparkles className="w-4 h-4 text-[#F4A62A] shrink-0" />
            <span>Included in Your Offline Study Pack</span>
          </div>
          <ul className="space-y-2 text-[#384543] dark:text-slate-300">
            <li className="flex items-start gap-2">
              <WifiOff className="w-3.5 h-3.5 text-[#0F4C45] dark:text-[#F4A62A] shrink-0 mt-0.5" />
              <span><strong>Offline Drills Ready:</strong> 683-word Spelling Lab, Mistake Vault, and Vocabulary Deck keep working even when your connection drops.</span>
            </li>
            <li className="flex items-start gap-2">
              <Smartphone className="w-3.5 h-3.5 text-[#0F4C45] dark:text-[#F4A62A] shrink-0 mt-0.5" />
              <span><strong>Distraction-Free Exam Mode:</strong> Launches in standalone full-screen without browser address bars.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#1F8A70] shrink-0 mt-0.5" />
              <span><strong>Auto Cloud Sync:</strong> Practice offline and sync progress automatically to your account once back online.</span>
            </li>
          </ul>
        </div>

        {/* Action Button or Manual Guided Steps */}
        {isInstalled ? (
          <div className="p-3.5 rounded-xl bg-[#EEF3F1] dark:bg-[#0F4C45]/35 border border-[#9EBEB8] dark:border-[#1F8A70]/50 text-[#0F4C45] dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>BandSprint is already installed on this device!</span>
          </div>
        ) : isInstallable ? (
          <button
            type="button"
            onClick={async () => {
              soundManager.playSuccess();
              await onInstall();
              onClose();
            }}
            className="w-full min-h-[46px] py-3 px-4 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#F4A62A]" />
            <span>Install BandSprint Now</span>
          </button>
        ) : (
          <div className="space-y-2.5 text-xs text-[#384543] dark:text-slate-300">
            <p className="font-bold text-[#0E1F1E] dark:text-white">Quick Browser Install Steps:</p>
            <div className="p-3.5 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 space-y-2 leading-relaxed">
              <div className="flex items-start gap-2">
                <Share className="w-3.5 h-3.5 text-[#0F4C45] dark:text-[#F4A62A] shrink-0 mt-0.5" />
                <span><strong>iPhone / iPad (Safari):</strong> Tap the <strong>Share</strong> icon in Safari, then choose <strong>“Add to Home Screen”</strong>.</span>
              </div>
              <div className="flex items-start gap-2">
                <Download className="w-3.5 h-3.5 text-[#0F4C45] dark:text-[#F4A62A] shrink-0 mt-0.5" />
                <span><strong>Chrome / Edge (Desktop &amp; Android):</strong> Click the install icon in the address bar or open browser menu (⋮) → <strong>“Install BandSprint”</strong>.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
