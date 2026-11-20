import React from 'react';
import {
  Home,
  Target,
  BookOpen,
  BarChart3,
  User,
  Sun,
  Moon,
  LogOut,
  LucideIcon
} from 'lucide-react';
import { motion } from 'framer-motion';
import { soundManager } from '../../utils/audioEffects';
import { BandSprintMark } from '../common/BandSprintMark';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { SPRING_SNAPPY } from '../common/MotionPrimitives';
import { useTheme } from '../../context/ThemeContext';
import { MainDestination, prefetchRoute } from '../../router/useAppRouter';

interface DesktopSidebarProps {
  activeHub: MainDestination;
  onNavigate: (path: string) => void;
  mistakeCount?: number;
  onOpenVault?: () => void;
  onOpenBandModal?: () => void;
  onSignOut?: () => void;
}

interface NavDestination {
  id: MainDestination;
  label: string;
  icon: LucideIcon;
  path: string;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeHub,
  onNavigate,
  onSignOut
}) => {
  const { resolvedTheme, toggleTheme } = useTheme();

  const navItems: NavDestination[] = [
    { id: 'home', label: 'Home', icon: Home, path: '/' },
    { id: 'practice', label: 'Practice', icon: Target, path: '/practice' },
    { id: 'learn', label: 'Learn', icon: BookOpen, path: '/learn' },
    { id: 'progress', label: 'Progress', icon: BarChart3, path: '/progress' },
    { id: 'profile', label: 'Profile', icon: User, path: '/profile' }
  ];

  return (
    <aside
      role="navigation"
      aria-label="Sidebar Navigation"
      className="hidden md:flex flex-col justify-between w-64 lg:w-72 bg-[#EEF3F1] dark:bg-[#11201E] border-r border-[#D3DDDA] dark:border-[#1F8A70]/35 h-screen sticky top-0 p-5 shrink-0 z-30 transition-colors select-none overflow-y-auto"
    >
      <div className="space-y-6">
        {/* App Logo & Branding */}
        <div
          onClick={() => {
            soundManager.playBeep(560, 0.03);
            onNavigate('/');
          }}
          className="flex items-center gap-3 cursor-pointer group rounded-xl p-1"
        >
          <BandSprintMark size={36} />
          <div className="flex flex-col text-left leading-none">
            <span className="font-display font-bold text-lg text-[#0E1F1E] dark:text-[#EEF3F1]">
              BandSprint
            </span>
            <span className="text-[10px] font-medium text-[#566664] dark:text-slate-400 mt-1">
              Reach your band.
            </span>
          </div>
        </div>

        {/* Primary Navigation Links (5 Main Destinations Only) */}
        <nav className="space-y-1.5" aria-label="Main Destinations">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeHub === item.id;

            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
                onClick={() => {
                  soundManager.playBeep(isActive ? 500 : 650, 0.04);
                  onNavigate(item.path);
                }}
                onMouseEnter={() => prefetchRoute(item.path)}
                onFocus={() => prefetchRoute(item.path)}
                className={`relative w-full px-3 py-2.5 rounded-xl text-left transition-colors flex items-center gap-3 group min-h-[44px] cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'text-white font-semibold'
                    : 'text-[#566664] dark:text-slate-300 hover:bg-[#D3DDDA]/40 dark:hover:bg-[#1F8A70]/20 hover:text-[#0E1F1E] dark:hover:text-white font-medium'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="desktop-sidebar-active-pill"
                    transition={SPRING_SNAPPY}
                    className="absolute inset-0 rounded-xl bg-[#0F4C45]"
                    aria-hidden="true"
                  />
                )}
                <div
                  className={`relative z-10 w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-white dark:bg-[#11201E] text-[#566664] dark:text-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="relative z-10 flex-1 flex items-center justify-between min-w-0">
                  <span className="text-xs font-semibold truncate">{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Editorial Note & Appearance Controls */}
      <div className="space-y-3 pt-4 border-t border-[#D3DDDA] dark:border-[#1F8A70]/35">
        <div className="rounded-xl bg-white dark:bg-[#0B1514] p-3.5 border border-[#D3DDDA] dark:border-[#1F8A70]/30">
          <div className="text-[10px] font-mono font-semibold text-[#566664] dark:text-slate-400 tracking-wide">
            Study Tip
          </div>
          <p className="font-display text-xs font-medium text-[#0E1F1E] dark:text-[#EEF3F1] leading-relaxed italic mt-1">
            “Precision in vocabulary and clarity of thought outscore memorized complexity every time.”
          </p>
        </div>

        {/* Install Offline PWA Button (auto-hides in standalone mode) */}
        <PWAInstallButton variant="sidebar" />

        {/* Quick Theme Switcher */}
        <button
          type="button"
          onClick={() => {
            toggleTheme();
            soundManager.playBeep(700, 0.035);
          }}
          className="w-full p-2.5 rounded-xl text-[#566664] dark:text-slate-400 hover:text-[#0E1F1E] dark:hover:text-white hover:bg-white dark:hover:bg-[#11201E] text-left text-xs font-medium flex items-center justify-between transition cursor-pointer min-h-[44px]"
        >
          <div className="flex items-center gap-2">
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-[#566664]" />
            )}
            <span>{resolvedTheme === 'dark' ? 'Light Appearance' : 'Dark Appearance'}</span>
          </div>
          <span className="text-[10px] font-mono text-[#566664] capitalize">
            {resolvedTheme}
          </span>
        </button>

        {/* 1-Click Sign Out */}
        {onSignOut && (
          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(520, 0.035);
              onSignOut();
            }}
            className="w-full p-2.5 rounded-xl text-[#566664] dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-left text-xs font-semibold flex items-center gap-2 transition cursor-pointer min-h-[44px]"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        )}

        {/* Legal Links */}
        <div className="pt-2 border-t border-[#D3DDDA] dark:border-[#1F8A70]/30 flex items-center justify-between text-[10px] text-[#566664] dark:text-slate-400 font-semibold px-1">
          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(520, 0.03);
              onNavigate('/profile/help');
            }}
            className="hover:text-[#0F4C45] dark:hover:text-[#1F8A70] transition cursor-pointer min-h-[44px] flex items-center"
          >
            Support
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(520, 0.03);
              window.dispatchEvent(new CustomEvent('open_legal_modal', { detail: { tab: 'terms' } }));
            }}
            className="hover:text-[#0F4C45] dark:hover:text-[#1F8A70] transition cursor-pointer min-h-[44px] flex items-center"
          >
            Terms
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(520, 0.03);
              window.dispatchEvent(new CustomEvent('open_legal_modal', { detail: { tab: 'privacy' } }));
            }}
            className="hover:text-[#0F4C45] dark:hover:text-[#1F8A70] transition cursor-pointer min-h-[44px] flex items-center"
          >
            Privacy
          </button>
        </div>
      </div>
    </aside>
  );
};
