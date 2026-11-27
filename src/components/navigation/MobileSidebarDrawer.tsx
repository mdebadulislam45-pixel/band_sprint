import React, { useEffect } from 'react';
import {
  X,
  Home,
  Target,
  BookOpen,
  Sparkles,
  BarChart3,
  BookmarkCheck,
  History,
  Sun,
  Moon,
  Briefcase,
  GraduationCap,
  Flame,
  LogOut,
  Compass,
  SpellCheck,
  UserCircle2,
} from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { UserProfile } from '../../types';
import { audioManager } from '../../services/AudioManager';
import { BandSprintLogo } from '../common/BandSprintLogo';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { EASE_EDITORIAL } from '../common/MotionPrimitives';
import { useTheme } from '../../context/ThemeContext';
import { sanitizeCandidateName } from '../../utils/nameSanitizer';
import { prefetchRoute } from '../../router/useAppRouter';
import {
  ACTIVE_ACCENT_BAR_VARIANTS,
  ACTIVE_PILL_VARIANTS,
  SIDEBAR_LAYOUT_SPRING
} from './DesktopSidebar';

interface MobileSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: string;
  onNavigate: (page: string) => void;
  mistakeCount: number;
  onOpenVault: () => void;
  onOpenBandModal: () => void;
  user: UserProfile | null;
  examMode?: 'Academic' | 'General Training';
  onExamModeChange?: (mode: 'Academic' | 'General Training') => void;
  onSignOut?: () => void;
}

export const MobileSidebarDrawer: React.FC<MobileSidebarDrawerProps> = ({
  isOpen,
  onClose,
  currentPage,
  onNavigate,
  mistakeCount,
  onOpenVault,
  onOpenBandModal,
  user,
  examMode = 'Academic',
  onExamModeChange,
  onSignOut,
}) => {
  const { resolvedTheme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const navItems: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    route: string;
    badge?: string;
    isAction?: boolean;
  }> = [
    { id: 'home', label: 'Home Dashboard', icon: Home, route: '/' },
    { id: 'daily-sprint', label: 'Pomodoro Daily Sprint', icon: Flame, route: '/learn/daily-sprint', badge: 'বাংলা' },
    { id: 'diagnostic', label: '10-Min Diagnostic', icon: Compass, route: '/learn/diagnostic', badge: 'START' },
    { id: 'mock-tests', label: 'CD-IELTS Mock Room', icon: Target, route: '/practice/mock-tests' },
    { id: 'practice', label: 'Practice Hub', icon: Sparkles, route: '/practice' },
    { id: 'learn', label: 'Learn Library', icon: BookOpen, route: '/learn' },
    { id: 'spelling', label: 'Spelling Lab (683)', icon: SpellCheck, route: '/learn/spelling' },
    { id: 'progress', label: 'Progress & Analytics', icon: BarChart3, route: '/progress' },
    { id: 'history', label: 'Exam History', icon: History, route: '/progress/history' },
    { id: 'saved', label: 'Mistake Vault', icon: BookmarkCheck, route: '/progress/saved', isAction: true },
    { id: 'profile', label: 'Profile & Settings', icon: UserCircle2, route: '/profile' },
  ];

  const sanitizedName = user ? sanitizeCandidateName(user.name, user.email) : 'Candidate';
  const targetBand = user?.progress?.targetBand || 7.5;
  const streakDays = user?.progress?.streakDays || 1;

  const handleModeSwitch = (mode: 'Academic' | 'General Training') => {
    if (mode === examMode) return;
    audioManager.playUiClick('toggle');
    if (onExamModeChange) {
      onExamModeChange(mode);
    }
    try {
      localStorage.setItem('ielts_exam_mode', mode);
      window.dispatchEvent(new CustomEvent('ielts_exam_mode_changed', { detail: mode }));
    } catch {}
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={() => {
              audioManager.playUiClick('soft');
              onClose();
            }}
            className="fixed inset-0 bg-[#071110]/65 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Steady Drawer Container: Pinned Header + Scrollable Nav Body + Pinned Footer */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.26, ease: EASE_EDITORIAL }}
            data-testid="mobile-sidebar-drawer"
            className="relative w-80 max-w-[85vw] h-dvh bg-[#F7F9F8] dark:bg-[#0B1514] text-[#0E1F1E] dark:text-[#EEF3F1] shadow-2xl flex flex-col justify-between overflow-hidden z-10 border-r border-[#D3DDDA] dark:border-[#1E3330] select-none"
            aria-label="Mobile Navigation Menu"
          >
            {/* 1. Pinned Top Brand, Candidate Summary & Format Switcher */}
            <div className="p-4 pb-3 space-y-3 shrink-0 border-b border-[#D3DDDA] dark:border-[#1E3330]">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('/');
                    onClose();
                  }}
                  className="flex items-center gap-2 cursor-pointer text-left"
                >
                  <BandSprintLogo variant="symbol" size="sm" />
                  <div className="flex flex-col leading-none">
                    <span className="font-bold text-[#0E1F1E] dark:text-[#EEF3F1] text-base tracking-tight">
                      Band<span className="text-[#0F4C45] dark:text-[#4DB6A4]">Sprint</span>
                    </span>
                    <span className="text-[10px] font-medium text-[#546B68] dark:text-[#96B0AC] mt-0.5">
                      IELTS Preparation
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    audioManager.playUiClick('soft');
                    onClose();
                  }}
                  className="w-8 h-8 rounded-lg bg-[#EEF3F1] hover:bg-[#E1ECE9] dark:bg-[#11201E] dark:hover:bg-[#182C29] text-[#546B68] dark:text-[#96B0AC] flex items-center justify-center transition cursor-pointer"
                  aria-label="Close navigation menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Candidate Summary */}
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1E3330] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('/profile');
                    onClose();
                  }}
                  className="flex items-center gap-2.5 text-left min-w-0 flex-1 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#0F4C45] text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {sanitizedName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-[#0E1F1E] dark:text-[#EEF3F1] truncate">
                      {sanitizedName}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#546B68] dark:text-[#96B0AC] mt-0.5 tabular-nums">
                      <span className="flex items-center gap-0.5 text-[#B45309] dark:text-[#F4A62A] font-semibold">
                        <Flame className="w-3 h-3 fill-current" />
                        {streakDays}d
                      </span>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    audioManager.playUiClick('soft');
                    onOpenBandModal();
                    onClose();
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#EEF3F1] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/35 text-[11px] font-bold text-[#0F4C45] dark:text-[#4DB6A4] hover:border-[#0F4C45] transition cursor-pointer shrink-0"
                  title="Edit Target Band & Exam Date"
                >
                  Band {targetBand}
                </button>
              </div>

              {/* Academic / General Training Switch */}
              <div className="p-1 bg-[#EEF3F1] dark:bg-[#11201E] rounded-lg flex items-center gap-1 border border-[#D3DDDA] dark:border-[#1E3330]">
                <button
                  type="button"
                  onClick={() => handleModeSwitch('Academic')}
                  className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px] ${
                    examMode === 'Academic'
                      ? 'bg-white dark:bg-[#0B1514] text-[#0F4C45] dark:text-[#4DB6A4] shadow-xs'
                      : 'text-[#546B68] dark:text-[#96B0AC]'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Academic</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleModeSwitch('General Training')}
                  className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[36px] ${
                    examMode === 'General Training'
                      ? 'bg-white dark:bg-[#0B1514] text-[#0F4C45] dark:text-[#4DB6A4] shadow-xs'
                      : 'text-[#546B68] dark:text-[#96B0AC]'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>General</span>
                </button>
              </div>
            </div>

            {/* 2. Steady Scrollable Navigation Body with Framer Motion LayoutGroup */}
            <div className="flex-1 overflow-y-auto overscroll-contain sidebar-scroll px-4 py-3">
              <LayoutGroup id="mobile-drawer-nav">
                <motion.nav
                  layout
                  transition={SIDEBAR_LAYOUT_SPRING}
                  className="space-y-1"
                  aria-label="Mobile Primary Navigation"
                >
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      item.route === '/'
                        ? currentPage === '/' || currentPage === '/home'
                        : currentPage === item.route;

                    return (
                      <motion.button
                        key={item.id}
                        layout="position"
                        transition={SIDEBAR_LAYOUT_SPRING}
                        whileTap={{ scale: 0.985 }}
                        type="button"
                        data-testid={`mobile-drawer-nav-${item.id}`}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => {
                          if (item.isAction) {
                            onOpenVault();
                          } else {
                            onNavigate(item.route);
                          }
                          audioManager.playUiClick('tab');
                          onClose();
                        }}
                        onMouseEnter={() => prefetchRoute(item.route)}
                        onFocus={() => prefetchRoute(item.route)}
                        className={`relative w-full px-3 py-2.5 rounded-xl text-left transition-colors flex items-center gap-3 min-h-[42px] cursor-pointer overflow-hidden ${
                          isActive
                            ? 'text-white font-semibold'
                            : 'text-[#0E1F1E] dark:text-[#EEF3F1] hover:bg-[#EEF3F1] dark:hover:bg-[#11201E] font-medium'
                        }`}
                      >
                        <AnimatePresence initial={false}>
                          {isActive && (
                            <motion.span
                              key="mobile-drawer-active-pill"
                              layoutId="mobile-drawer-active-pill"
                              variants={ACTIVE_PILL_VARIANTS}
                              initial="initial"
                              animate="animate"
                              exit="exit"
                              transition={SIDEBAR_LAYOUT_SPRING}
                              className="absolute inset-0 rounded-xl bg-[#0F4C45] shadow-xs"
                              aria-hidden="true"
                            />
                          )}
                        </AnimatePresence>

                        <AnimatePresence initial={false}>
                          {isActive && (
                            <motion.span
                              key="mobile-drawer-active-bar"
                              layoutId="mobile-drawer-active-bar"
                              variants={ACTIVE_ACCENT_BAR_VARIANTS}
                              initial="initial"
                              animate="animate"
                              exit="exit"
                              className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-[#F4A62A] z-10 origin-center"
                              aria-hidden="true"
                            />
                          )}
                        </AnimatePresence>

                        <motion.div
                          layout="position"
                          animate={{ scale: isActive ? 1.05 : 1 }}
                          transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                          className="relative z-10 shrink-0"
                        >
                          <Icon
                            className={`w-4 h-4 ${
                              isActive ? 'text-white' : 'text-[#546B68] dark:text-[#96B0AC]'
                            }`}
                          />
                        </motion.div>

                        <div className="relative z-10 flex-1 flex items-center justify-between min-w-0">
                          <span className="text-xs truncate">{item.label}</span>
                          {item.badge && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase ${
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : 'bg-[#0F4C45]/10 dark:bg-[#4DB6A4]/15 text-[#0F4C45] dark:text-[#4DB6A4]'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                          {item.id === 'saved' && mistakeCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-[#F4A62A]/20 text-[#9A5B00] dark:text-[#F4A62A] font-mono text-[10px] font-bold tabular-nums">
                              {mistakeCount}
                            </span>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </motion.nav>
              </LayoutGroup>
            </div>

            {/* 3. Pinned Bottom Footer Controls */}
            <div className="p-4 pt-3 shrink-0 border-t border-[#D3DDDA] dark:border-[#1E3330] bg-[#F7F9F8] dark:bg-[#0B1514] space-y-2">
              {/* Install Offline PWA Button */}
              <PWAInstallButton variant="drawer" />

              {/* Theme Switcher */}
              <button
                type="button"
                onClick={() => {
                  toggleTheme();
                  audioManager.playUiClick('toggle');
                }}
                className="w-full px-3 py-2.5 rounded-lg bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1E3330] text-[#0E1F1E] dark:text-[#EEF3F1] text-left text-xs font-semibold flex items-center justify-between transition cursor-pointer min-h-[40px]"
              >
                <div className="flex items-center gap-2">
                  {resolvedTheme === 'dark' ? (
                    <Sun className="w-4 h-4 text-[#F4A62A]" />
                  ) : (
                    <Moon className="w-4 h-4 text-[#0F4C45]" />
                  )}
                  <span>{resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </div>
                <span className="text-[10px] font-mono uppercase text-[#546B68] dark:text-[#96B0AC]">
                  {resolvedTheme}
                </span>
              </button>

              {/* 1-Click Sign Out */}
              {onSignOut && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSignOut();
                  }}
                  className="w-full px-3 py-2.5 rounded-lg bg-[#FDF2F2] hover:bg-[#FCE4E4] dark:bg-rose-950/35 dark:hover:bg-rose-950/55 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer min-h-[40px]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
