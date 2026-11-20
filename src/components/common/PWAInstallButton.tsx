import React, { useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';
import { soundManager } from '../../utils/audioEffects';

interface PWAInstallButtonProps {
  variant?: 'sidebar' | 'drawer';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'sidebar' }) => {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [modalOpen, setModalOpen] = useState(false);

  // Automatically hide once running in installed standalone app mode
  if (isInstalled) return null;

  const handleClick = async () => {
    soundManager.playBeep(620, 0.04);
    if (isInstallable) {
      const accepted = await promptInstall();
      if (!accepted) {
        setModalOpen(true);
      }
      return;
    }
    setModalOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          variant === 'drawer'
            ? 'w-full px-3 py-2.5 rounded-lg bg-[#0F4C45] hover:bg-[#0B3833] text-white text-left text-xs font-semibold flex items-center justify-between transition cursor-pointer min-h-[42px]'
            : 'w-full p-2.5 rounded-xl bg-[#0F4C45]/10 dark:bg-[#1F8A70]/20 hover:bg-[#0F4C45] hover:text-white text-[#0F4C45] dark:text-[#EEF3F1] border border-[#0F4C45]/25 dark:border-[#1F8A70]/40 text-left text-xs font-semibold flex items-center justify-between transition cursor-pointer min-h-[44px] group'
        }
        title="Install BandSprint for offline Spelling Lab, Mistake Vault & full-screen mock tests"
      >
        <div className="flex items-center gap-2 min-w-0">
          {isIOS ? (
            <Smartphone className="w-4 h-4 shrink-0 text-[#F4A62A]" />
          ) : (
            <Download className="w-4 h-4 shrink-0 text-[#0F4C45] dark:text-[#F4A62A] group-hover:text-[#F4A62A]" />
          )}
          <span className="truncate">Install Offline App</span>
        </div>
        <span className="text-[10px] font-mono uppercase opacity-75 shrink-0">PWA</span>
      </button>

      <PWAInstallModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onInstall={promptInstall}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
      />
    </>
  );
};
