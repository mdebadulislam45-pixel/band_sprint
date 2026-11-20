import React, { useEffect, useState, useRef } from 'react';
import {
  Menu,
  ArrowLeft,
  Search,
  ChevronRight,
  ChevronDown,
  Flame,
  Sun,
  Moon,
  Download,
  LogOut,
  User as UserIcon,
  Target
} from 'lucide-react';
import { UserProfile } from '../../types';
import { soundManager } from '../../utils/audioEffects';
import { BandSprintMark } from '../common/BandSprintMark';
import { sanitizeCandidateName } from '../../utils/nameSanitizer';
import { useTheme } from '../../context/ThemeContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallModal } from '../common/PWAInstallModal';

export interface AppHeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onBack: () => void;
  canGoBack: boolean;
  backLabel?: string;
  onOpenSearch: () => void;
  onOpenVault: () => void;
  onOpenProfile: () => void;
  onSignOut?: () => void;
  onOpenMobileMenu?: () => void;
  mistakeCount: number;
  user: UserProfile | null;
  streakDays?: number;
  examMode?: 'Academic' | 'General Training';
  onExamModeChange?: (mode: 'Academic' | 'General Training') => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentPage,
  onNavigate,
  onBack,
  canGoBack,
  backLabel,
  onOpenSearch,
  onOpenProfile,
  onSignOut,
  onOpenMobileMenu,
  streakDays: propStreakDays = 1,
  user,
  examMode: propExamMode,
  onExamModeChange
}) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const [showPwaModal, setShowPwaModal] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [examMode, setExamMode] = useState<'Academic' | 'General Training'>(() => {
    if (propExamMode) return propExamMode;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ielts_exam_mode');
      if (stored === 'Academic' || stored === 'General Training') return stored;
    }
    return user?.progress?.intendedFormat || 'Academic';
  });

  useEffect(() => {
    if (propExamMode) {
      setExamMode(propExamMode);
    }
  }, [propExamMode]);

  useEffect(() => {
    const handleStorageChange = (e: any) => {
      if (e.detail && (e.detail === 'Academic' || e.detail === 'General Training')) {
        setExamMode(e.detail);
      }
    };
    window.addEventListener('ielts_exam_mode_changed', handleStorageChange);
    return () => window.removeEventListener('ielts_exam_mode_changed', handleStorageChange);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowAccountMenu(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAccountMenu(false);
      }
    };

    if (showAccountMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showAccountMenu]);

  const streakDays = user?.progress?.streakDays || propStreakDays || 1;
  const sanitizedName = user ? sanitizeCandidateName(user.name, user.email) : 'Candidate';
  const isDark = resolvedTheme === 'dark';

  const getPageTitle = (page: string): string => {
    const clean = page.replace(/\/+$/, '') || '/';
    if (clean === '/' || clean === '/home') return 'Command Center';
    if (clean === '/practice') return 'Practice Hub';
    if (clean === '/practice/listening') return 'Listening Lab';
    if (clean === '/practice/reading') return 'Reading Lab';
    if (clean === '/practice/writing') return 'Writing Lab';
    if (clean === '/practice/speaking') return 'Speaking Lab';
    if (clean === '/practice/mock-tests') return 'Mock Tests';
    if (clean === '/practice/question-bank') return 'Question Bank';
    if (clean === '/practice/sprint') return 'Practice Library';
    if (clean === '/practice/ai-tools') return 'AI Studio';
    if (clean === '/learn') return 'Learning Library';
    if (clean === '/learn/diagnostic') return 'Diagnostic Test';
    if (clean === '/learn/study-plan') return '30-Day Study Plan';
    if (clean === '/learn/spelling') return 'Spelling Lab';
    if (clean === '/learn/vocabulary') return 'Vocabulary Deck';
    if (clean === '/progress') return 'Progress Hub';
    if (clean === '/profile') return 'Candidate Profile';
    return 'BandSprint';
  };

  const getParentSection = (page: string): { label: string; path: string } | null => {
    if (page.startsWith('/practice/')) return { label: 'Practice', path: '/practice' };
    if (page.startsWith('/learn/')) return { label: 'Learn', path: '/learn' };
    if (page.startsWith('/progress/')) return { label: 'Progress', path: '/progress' };
    if (page.startsWith('/profile/')) return { label: 'Profile', path: '/profile' };
    return null;
  };

  const parentSection = getParentSection(currentPage);
  const currentTitle = getPageTitle(currentPage);

  return (
    <header className="sticky top-0 z-40 w-full h-14 sm:h-16 bg-[#EEF3F1]/98 dark:bg-[#11201E]/98 border-b border-[#D3DDDA] dark:border-[#1F8A70]/35 px-2.5 sm:px-5 lg:px-7 flex items-center justify-between gap-2 transition-colors select-none pt-[env(safe-area-inset-top)]">
      {/* ================= LEFT: BRANDING / HAMBURGER / BACK / BREADCRUMB ================= */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 shrink-0">
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(520, 0.03);
            if (onOpenMobileMenu) {
              onOpenMobileMenu();
            }
          }}
          className="min-w-[44px] min-h-[44px] rounded-xl bg-white dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/35 text-[#0E1F1E] dark:text-[#EEF3F1] md:hidden flex items-center justify-center transition cursor-pointer shrink-0"
          aria-label="Open mobile navigation drawer"
          title="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {canGoBack && (
          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(480, 0.04);
              onBack();
            }}
            className="min-h-[44px] px-2.5 sm:px-3 rounded-xl bg-white dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/35 text-[#0E1F1E] dark:text-[#EEF3F1] text-xs font-semibold transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap"
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline font-semibold">{backLabel || 'Back'}</span>
          </button>
        )}

        {/* Brand Identity */}
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(520, 0.04);
            onNavigate('/');
          }}
          className="flex items-center gap-2 cursor-pointer group py-1 shrink-0 text-left focus-visible:outline-none whitespace-nowrap min-h-[44px]"
          title="BandSprint Home"
        >
          <BandSprintMark size={32} />
          <span className="font-display font-bold text-[#0E1F1E] dark:text-[#EEF3F1] tracking-tight text-sm sm:text-base lg:text-lg whitespace-nowrap">
            BandSprint
          </span>
        </button>

        {/* Desktop Breadcrumb */}
        {parentSection && (
          <div className="hidden xl:flex items-center gap-1.5 text-xs text-[#566664] dark:text-slate-400 pl-3 border-l border-[#D3DDDA] dark:border-[#1F8A70]/35 whitespace-nowrap">
            <button
              type="button"
              onClick={() => onNavigate(parentSection.path)}
              className="hover:text-[#0E1F1E] dark:hover:text-white font-medium transition-colors cursor-pointer"
            >
              {parentSection.label}
            </button>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            <span className="text-[#0E1F1E] dark:text-[#EEF3F1] font-semibold truncate max-w-[160px]">
              {currentTitle}
            </span>
          </div>
        )}
      </div>

      {/* ================= RIGHT: THEME TOGGLE, SEARCH & CONTROLS ================= */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 relative" ref={menuRef}>
        <div
          className="h-9 px-2.5 rounded-xl bg-white dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/35 text-[#0E1F1E] dark:text-[#EEF3F1] hidden sm:flex items-center gap-1.5 text-xs font-semibold shrink-0 whitespace-nowrap"
          title={`Active Daily Practice Streak: ${streakDays} days`}
        >
          <Flame className="w-3.5 h-3.5 text-[#F4A62A] fill-[#F4A62A] shrink-0" />
          <span className="font-mono tabular-nums">{streakDays}d</span>
        </div>

        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(600, 0.04);
            onOpenSearch();
          }}
          className="min-w-[44px] min-h-[44px] px-2.5 rounded-xl bg-white dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/35 text-[#566664] dark:text-slate-300 transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
          title="Search materials (⌘K)"
          aria-label="Search materials"
        >
          <Search className="w-4 h-4" />
          <span className="hidden xl:inline text-[11px] font-mono text-[#566664]">⌘K</span>
        </button>

        <button
          type="button"
          onClick={() => {
            toggleTheme();
            soundManager.playBeep(isDark ? 740 : 580, 0.035);
          }}
          className="min-w-[44px] min-h-[44px] px-2.5 rounded-xl bg-white dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/35 text-[#0E1F1E] dark:text-[#EEF3F1] transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-[#0E1F1E]" />
          )}
          <span className="hidden sm:inline text-xs font-semibold text-[#0E1F1E] dark:text-[#EEF3F1]">
            {isDark ? 'Light' : 'Dark'}
          </span>
        </button>

        {!isInstalled && (
          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(680, 0.04);
              setShowPwaModal(true);
            }}
            className="h-9 px-2.5 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white font-semibold text-xs hidden lg:flex items-center gap-1.5 transition cursor-pointer shrink-0 whitespace-nowrap"
            title="Install BandSprint for Offline Study"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(640, 0.04);
              if (user) {
                setShowAccountMenu((v) => !v);
              } else {
                onOpenProfile();
              }
            }}
            aria-expanded={showAccountMenu}
            aria-haspopup="menu"
            className={`relative min-h-[44px] px-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 whitespace-nowrap ${
              user
                ? 'bg-white dark:bg-[#0B1514] border-[#D3DDDA] dark:border-[#1F8A70]/35 hover:border-[#0F4C45] text-[#0E1F1E] dark:text-[#EEF3F1]'
                : 'bg-[#0F4C45] text-white border-[#0F4C45]'
            }`}
            title={user ? `Account menu (${sanitizedName})` : 'Sign In or Create Account'}
          >
            {user ? (
              <>
                <div className="w-6 h-6 rounded-lg bg-[#0F4C45] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                  {sanitizedName.slice(0, 1).toUpperCase()}
                </div>
                <span className="hidden xl:inline text-xs font-semibold max-w-[95px] truncate">
                  {sanitizedName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#566664] dark:text-slate-400 hidden sm:inline" />
              </>
            ) : (
              <span className="text-xs font-semibold whitespace-nowrap px-0.5">
                Sign In
              </span>
            )}
          </button>

          {showAccountMenu && user && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-60 rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/40 shadow-lg py-2 z-50"
            >
              <div className="px-4 py-2.5 border-b border-[#EEF3F1] dark:border-[#1F8A70]/20">
                <div className="text-xs font-bold text-[#0E1F1E] dark:text-white truncate">
                  {sanitizedName}
                </div>
                <div className="text-[11px] text-[#566664] dark:text-slate-400 truncate">
                  {user.email}
                </div>
                <div className="text-[10px] font-mono font-semibold text-[#0F4C45] dark:text-[#F4A62A] mt-1 tabular-nums">
                  Target Band {(user.progress?.targetBand || 7.5).toFixed(1)} · {examMode}
                </div>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowAccountMenu(false);
                    onOpenProfile();
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-semibold text-[#0E1F1E] dark:text-[#EEF3F1] hover:bg-[#EEF3F1] dark:hover:bg-[#0B1514] flex items-center gap-2.5 transition cursor-pointer"
                >
                  <UserIcon className="w-4 h-4 text-[#0F4C45] dark:text-[#F4A62A]" />
                  <span>Profile &amp; Settings</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowAccountMenu(false);
                    onNavigate('/learn/diagnostic');
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-semibold text-[#0E1F1E] dark:text-[#EEF3F1] hover:bg-[#EEF3F1] dark:hover:bg-[#0B1514] flex items-center gap-2.5 transition cursor-pointer"
                >
                  <Target className="w-4 h-4 text-[#0F4C45] dark:text-[#F4A62A]" />
                  <span>10-Minute Diagnostic</span>
                </button>
              </div>

              {onSignOut && (
                <div className="pt-1 border-t border-[#EEF3F1] dark:border-[#1F8A70]/20">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowAccountMenu(false);
                      onSignOut();
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <PWAInstallModal
        isOpen={showPwaModal}
        onClose={() => setShowPwaModal(false)}
        onInstall={promptInstall}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
      />
    </header>
  );
};
