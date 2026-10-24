import React from 'react';
import {
  Home,
  Target,
  Sparkles,
  BarChart3,
  User,
  LucideIcon
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';

export type BottomNavTab = 'home' | 'practice' | 'aitools' | 'analytics' | 'profile';

interface BottomNavProps {
  currentTab: BottomNavTab;
  onSelectTab: (tab: BottomNavTab) => void;
  mistakeCount?: number;
}

interface NavItem {
  id: BottomNavTab;
  label: string;
  icon: LucideIcon;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab
}) => {
  const items: NavItem[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'practice', label: 'Practice', icon: Target },
    { id: 'aitools', label: 'AI Tools', icon: Sparkles },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  const handleTabClick = (tabId: BottomNavTab, isActive: boolean) => {
    // Tactile haptic pulse on mobile if supported
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate(6);
      } catch {}
    }
    soundManager.playBeep(isActive ? 500 : 640, 0.035);
    onSelectTab(tabId);
  };

  return (
    <nav
      role="tablist"
      aria-label="Bottom Navigation Bar"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 backdrop-blur-lg bg-white/95 dark:bg-slate-900/95 border-t border-slate-200/90 dark:border-slate-800 py-1.5 px-2 flex items-center justify-around shadow-[0_-4px_25px_rgba(11,18,36,0.18)] pb-[max(0.75rem,env(safe-area-inset-bottom))] select-none"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;
        const isCenterButton = item.id === 'aitools';

        if (isCenterButton) {
          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={isActive}
              aria-label={item.label}
              onClick={() => handleTabClick(item.id, isActive)}
              className="relative flex flex-col items-center justify-center -top-3 px-2 min-w-0 transition-transform active:scale-90 focus-visible:outline-none cursor-pointer group"
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 icon-3d ${
                  isActive
                    ? 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white shadow-[0_8px_20px_-4px_rgba(37,99,235,0.5),inset_0_1.5px_1px_rgba(255,255,255,0.7)] scale-110 ring-4 ring-white dark:ring-[#0B1224]'
                    : 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-[0_6px_16px_-4px_rgba(37,99,235,0.4),inset_0_1.5px_1px_rgba(255,255,255,0.6)] ring-3 ring-white dark:ring-[#0B1224]'
                }`}
              >
                <Icon className="w-5.5 h-5.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]" />
              </div>
              <span
                className={`text-[10px] tracking-tight transition-colors duration-150 truncate max-w-full mt-1 ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-black'
                    : 'text-slate-500 dark:text-slate-400 font-medium'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        }

        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={isActive}
            aria-label={item.label}
            onClick={() => handleTabClick(item.id, isActive)}
            className="relative flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl min-w-0 min-h-[48px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
          >
            {/* Top active indicator line */}
            {isActive && (
              <div className="absolute top-0 h-[3px] w-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-400 dark:to-indigo-400 shadow-[0_2px_6px_rgba(59,130,246,0.5)]" />
            )}

            {/* Icon container with 3D styling */}
            <div
              className={`w-9 h-7 flex items-center justify-center rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-400 scale-105 icon-3d'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'drop-shadow-[0_2px_3px_rgba(37,99,235,0.3)]' : ''}`} />
            </div>

            {/* Label */}
            <span
              className={`text-[10px] tracking-tight transition-colors duration-150 truncate max-w-full mt-0.5 ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 font-medium'
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
