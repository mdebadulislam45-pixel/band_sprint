import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineStatusIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showReconnected, setShowReconnected] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setShowReconnected(false), 4000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-20 md:bottom-6 left-4 md:left-72 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold transition-all duration-300 animate-fade-in max-w-sm ${
        !isOnline
          ? 'bg-[#66410B] text-white border border-[#F4A62A]/60'
          : 'bg-[#0F4C45] text-white border border-[#1F8A70]/60'
      }`}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4 shrink-0 text-[#F4A62A] animate-pulse" />
          <span>Offline Study Mode: Spelling Lab, Mistake Vault &amp; Drills stay ready.</span>
        </>
      ) : (
        <>
          <Wifi className="w-4 h-4 shrink-0 text-[#F4A62A]" />
          <span>Back online — cloud progress sync active.</span>
        </>
      )}
    </div>
  );
};
