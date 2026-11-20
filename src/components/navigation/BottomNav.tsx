import React from 'react';
import {
  Home,
  Target,
  BookOpen,
  BarChart3,
  User,
  LucideIcon
} from 'lucide-react';
import { motion } from 'framer-motion';
import { soundManager } from '../../utils/audioEffects';
import { SPRING_SNAPPY } from '../common/MotionPrimitives';
import { MainDestination, prefetchRoute } from '../../router/useAppRouter';

interface BottomNavProps {
  activeHub: MainDestination;
  onNavigate: (path: string) => void;
  mistakeCount?: number;
}

interface NavDestination {
  id: MainDestination;
  label: string;
  icon: LucideIcon;
  path: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeHub,
  onNavigate
}) => {
  const items: NavDestination[] = [
    { id: 'home', label: 'Home', icon: Home, path: '/' },
    { id: 'practice', label: 'Practice', icon: Target, path: '/practice' },
    { id: 'learn', label: 'Learn', icon: BookOpen, path: '/learn' },
    { id: 'progress', label: 'Progress', icon: BarChart3, path: '/progress' },
    { id: 'profile', label: 'Profile', icon: User, path: '/profile' }
  ];

  const handleTabClick = (path: string, isActive: boolean) => {
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate(6);
      } catch {}
    }
    soundManager.playBeep(isActive ? 500 : 640, 0.035);
    onNavigate(path);
  };

  return (
    <nav
      role="navigation"
      aria-label="Main Bottom Navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#EEF3F1] dark:bg-[#11201E] border-t border-[#D3DDDA] dark:border-[#1F8A70]/35 py-1 px-1.5 flex items-center justify-around pb-[max(0.5rem,env(safe-area-inset-bottom))] select-none"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeHub === item.id;

        return (
          <button
            key={item.id}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            aria-label={item.label}
            onClick={() => handleTabClick(item.path, isActive)}
            onMouseEnter={() => prefetchRoute(item.path)}
            onFocus={() => prefetchRoute(item.path)}
            className="relative flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl min-w-0 min-h-[44px] transition-colors cursor-pointer"
          >
            {isActive && (
              <motion.div
                layoutId="mobile-bottomnav-active-bar"
                transition={SPRING_SNAPPY}
                className="absolute top-0 h-[2.5px] w-7 rounded-full bg-[#0F4C45] dark:bg-[#F4A62A]"
              />
            )}

            <div
              className={`w-8 h-6 flex items-center justify-center rounded-lg transition-all duration-150 ${
                isActive
                  ? 'text-[#0F4C45] dark:text-[#EEF3F1] font-bold scale-105'
                  : 'text-[#566664] dark:text-slate-400 hover:text-[#0E1F1E]'
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>

            <span
              className={`text-[10px] tracking-tight transition-colors duration-150 truncate max-w-full mt-0.5 ${
                isActive
                  ? 'text-[#0F4C45] dark:text-[#EEF3F1] font-bold'
                  : 'text-[#566664] dark:text-slate-400 font-medium'
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
