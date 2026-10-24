import React, { useEffect, useState, useRef } from 'react';
import {
  Menu,
  ArrowLeft,
  Search,
  ChevronRight,
  Flame,
  BookOpen,
  Briefcase,
  Sun,
  Moon,
  GraduationCap,
  Download,
  MoreVertical,
  X,
  BookMarked,
  Crown,
  Sparkles,
  Rocket,
  ShieldCheck,
  Mail
} from 'lucide-react';
import { UserProfile } from '../../types';
import { soundManager } from '../../utils/audioEffects';
import { IELTSSprintLogo } from '../common/IELTSSprintLogo';
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
  onOpenMobileMenu?: () => void;
  mistakeCount: number;
  user: UserProfile | null;
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
  onOpenVault,
  onOpenProfile,
  onOpenMobileMenu,
  mistakeCount,
  user,
  examMode: propExamMode,
  onExamModeChange
}) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const [showPwaModal, setShowPwaModal] = useState(false);
  const [showMobileOverflow, setShowMobileOverflow] = useState(false);
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
        setShowMobileOverflow(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMobileOverflow(false);
      }
    };

    if (showMobileOverflow) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showMobileOverflow]);

  const handleModeSwitch = (mode: 'Academic' | 'General Training') => {
    if (mode === examMode) return;
    soundManager.playBeep(mode === 'Academic' ? 580 : 660, 0.04);
    setExamMode(mode);
    try {
      localStorage.setItem('ielts_exam_mode', mode);
    } catch {}
    if (onExamModeChange) {
      onExamModeChange(mode);
    }
    window.dispatchEvent(new CustomEvent('ielts_exam_mode_changed', { detail: mode }));
  };

  const streakDays = user?.progress?.streakDays || 1;
  const sanitizedName = user ? sanitizeCandidateName(user.name, user.email) : 'Candidate';
  const isDark = resolvedTheme === 'dark';

  const getPageTitle = (page: string): string => {
    switch (page) {
      case 'home':
        return 'Command Center';
      case 'practice':
        return 'Practice Arena';
      case 'listening':
        return 'Authentic Listening Lab';
      case 'reading':
        return 'Speed Reading & TFNG';
      case 'writing':
        return 'Writing Evaluator';
      case 'speaking':
        return 'Speaking Examiner';
      case 'shadowing':
        return 'Speaking Shadowing';
      case 'speedreading':
        return 'Speed Reader & RSVP';
      case 'speakingvault':
        return 'Band 9 Speaking Vault';
      case 'questionbank':
        return 'Cambridge Question Bank';
      case 'mocktest':
      case 'livemock':
        return 'Live Mock Exam';
      case 'cdielts':
        return 'CD-IELTS Simulator';
      case 'learn':
        return 'Learning Studio';
      case 'aitools':
        return 'AI Diagnostic Tools';
      case 'progress':
      case 'analytics':
        return 'Band Analytics';
      case 'history':
        return 'Exam History';
      case 'profile':
        return 'Candidate Profile';
      case 'vocab':
        return 'High-Frequency Vocabulary';
      case 'vocabflashcards':
        return 'Spaced Repetition Deck';
      case 'phrases':
        return 'Discourse Markers & Phrases';
      case 'idioms':
        return 'Idiomatic Mastery';
      case 'c1idioms':
        return '200 C1 Idioms & Phrases';
      case 'grammar':
        return '12 Grammar Rules';
      case 'modelanswers':
        return 'Band 9 Model Answers';
      case 'essayarchitect':
        return 'Band 9 Essay Architect';
      case 'spelling':
        return 'Spelling Trap Lab';
      case 'collocations':
        return 'Academic Collocations';
      case 'studyplan':
        return 'AI Study Plan & Roadmap';
      case 'banddescriptors':
        return 'Band Descriptors Decoder';
      case 'bangla':
        return 'Bangla IELTS Master Guide';
      case 'beginner':
        return 'Beginner Zero Foundation';
      case 'slides':
        return 'Cheat Sheets & Vault';
      case 'arguments':
        return 'PESTLE Idea Matrix';
      case 'transformer':
      case 'sentencetransformer':
        return 'Sentence Transformer';
      case 'maplab':
      case 'listeningmap':
        return 'Directional Map Lab';
      case 'calendar':
        return '14-Day Sprint Calendar';
      default:
        return 'IELTS SPRINT';
    }
  };

  const getParentSection = (page: string): { label: string; id: string } | null => {
    if (
      [
        'listening',
        'reading',
        'speaking',
        'shadowing',
        'writing',
        'speedreading',
        'speakingvault',
        'questionbank',
        'maplab',
        'listeningmap'
      ].includes(page)
    ) {
      return { label: 'Practice', id: 'practice' };
    }
    if (['livemock', 'cdielts'].includes(page)) {
      return { label: 'Mock Tests', id: 'mocktest' };
    }
    if (
      [
        'vocab',
        'vocabflashcards',
        'phrases',
        'idioms',
        'grammar',
        'modelanswers',
        'essayarchitect',
        'spelling',
        'collocations',
        'studyplan',
        'banddescriptors',
        'c1idioms',
        'bangla',
        'beginner',
        'slides',
        'arguments',
        'transformer',
        'sentencetransformer',
        'calendar'
      ].includes(page)
    ) {
      return { label: 'Learning Hub', id: 'learn' };
    }
    if (['progress', 'history'].includes(page)) {
      return { label: 'Analytics', id: 'progress' };
    }
    return null;
  };

  const parentSection = getParentSection(currentPage);
  const currentTitle = getPageTitle(currentPage);

  return (
    <header className="sticky top-0 z-40 w-full h-14 sm:h-16 bg-[#FAF8F5]/95 dark:bg-[#0B1120]/95 backdrop-blur-md border-b border-stone-200/80 dark:border-slate-800/80 px-3 sm:px-5 lg:px-7 flex items-center justify-between gap-2 sm:gap-4 transition-colors select-none pt-[env(safe-area-inset-top)]">
      {/* ================= LEFT: BRANDING / HAMBURGER / BACK / BREADCRUMB ================= */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
        {/* Mobile Hamburger Menu Button (☰) */}
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(520, 0.03);
            if (onOpenMobileMenu) {
              onOpenMobileMenu();
            }
          }}
          className="w-8 h-8 rounded-xl bg-white hover:bg-stone-100 dark:bg-slate-800/90 dark:hover:bg-slate-700 border border-stone-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 md:hidden flex items-center justify-center transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shrink-0"
          aria-label="Open mobile navigation drawer"
          title="Open menu"
        >
          <Menu className="w-4 h-4 text-slate-700 dark:text-slate-200" />
        </button>

        {canGoBack && (
          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(480, 0.04);
              onBack();
            }}
            className="h-8 sm:h-9 px-2.5 rounded-xl bg-white hover:bg-stone-100 active:bg-stone-200/80 dark:bg-slate-800/90 dark:hover:bg-slate-700 border border-stone-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition flex items-center justify-center gap-1.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer whitespace-nowrap"
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
            <span className="hidden sm:inline font-semibold">{backLabel || 'Back'}</span>
          </button>
        )}

        {/* Brand Identity (Single-Line Editorial Wordmark) */}
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(520, 0.04);
            onNavigate('home');
          }}
          className="flex items-center gap-2 cursor-pointer group py-1 shrink-0 text-left focus-visible:outline-none whitespace-nowrap"
          title="IELTS Sprint Home"
        >
          <IELTSSprintLogo variant="symbol" size="sm" />
          <span className="font-display font-bold text-slate-900 dark:text-white tracking-tight text-sm sm:text-base lg:text-lg group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors whitespace-nowrap">
            IELTS <span className="text-blue-700 dark:text-blue-400">Sprint</span>
          </span>
        </button>

        {/* Desktop Breadcrumb */}
        {parentSection && (
          <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 pl-3 border-l border-stone-200 dark:border-slate-800 whitespace-nowrap">
            <button
              type="button"
              onClick={() => onNavigate(parentSection.id)}
              className="hover:text-slate-900 dark:hover:text-white font-medium transition-colors cursor-pointer"
            >
              {parentSection.label}
            </button>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            <span className="text-slate-800 dark:text-slate-200 font-semibold truncate max-w-[160px]">
              {currentTitle}
            </span>
          </div>
        )}
      </div>

      {/* ================= RIGHT: THEME TOGGLE, SEARCH & CONTROLS ================= */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 relative" ref={menuRef}>

        {/* Daily Streak Indicator (Tabular Numerals) */}
        <div
          className="h-8 sm:h-9 px-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-stone-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hidden sm:flex items-center gap-1.5 text-xs font-semibold shrink-0 whitespace-nowrap"
          title={`Active Daily Practice Streak: ${streakDays} days`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
          <span className="font-mono tabular-nums">{streakDays}d</span>
        </div>

        {/* Global Search Button */}
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(600, 0.04);
            onOpenSearch();
          }}
          className="h-8 sm:h-9 px-2.5 rounded-xl bg-white hover:bg-stone-100 dark:bg-slate-800/90 dark:hover:bg-slate-700 border border-stone-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 transition flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer shrink-0 whitespace-nowrap"
          title="Search test materials and vocabulary (⌘K)"
          aria-label="Search test materials"
        >
          <Search className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span className="hidden xl:inline text-[11px] font-mono text-slate-400">⌘K</span>
        </button>

        {/* User-Facing Theme Toggle Button (Visible on ALL devices, persisted in localStorage) */}
        <button
          type="button"
          onClick={() => {
            toggleTheme();
            soundManager.playBeep(isDark ? 740 : 580, 0.035);
          }}
          className="h-8 sm:h-9 px-2.5 rounded-xl bg-white hover:bg-stone-100 dark:bg-slate-800/90 dark:hover:bg-slate-700 border border-stone-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer shrink-0 whitespace-nowrap"
          title={isDark ? 'Switch to Light Mode (Saved Automatically)' : 'Switch to Dark Mode (Saved Automatically)'}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-pressed={isDark}
          data-testid="header-theme-toggle"
        >
          <span className="relative flex items-center justify-center w-4 h-4 shrink-0">
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20 transition-transform duration-200 hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 fill-slate-700/10 transition-transform duration-200 hover:-rotate-12" />
            )}
          </span>
          <span className="hidden sm:inline text-xs font-semibold tracking-tight text-slate-700 dark:text-slate-200">
            {isDark ? 'Light' : 'Dark'}
          </span>
        </button>

        {/* 8-Week Sprint Diagnostic Funnel Button (Desktop) */}
        <button
          type="button"
          onClick={() => {
            soundManager.playSuccess();
            window.dispatchEvent(new CustomEvent('open_onboarding_diagnostic'));
          }}
          className="h-8 sm:h-9 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold text-xs hidden lg:flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer shrink-0 whitespace-nowrap transition-colors"
          title="Personalized 8-Week Band Sprint Diagnostic"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Sprint Plan</span>
        </button>

        {/* Cambridge AI Tutor Button (Desktop) */}
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(640, 0.04);
            window.dispatchEvent(new CustomEvent('open_ai_tutor'));
          }}
          className="h-8 sm:h-9 px-2.5 rounded-xl bg-white hover:bg-stone-100 dark:bg-slate-800/90 dark:hover:bg-slate-700 border border-stone-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 transition hidden md:flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer shrink-0 whitespace-nowrap"
          title="Open Cambridge Study Tutor"
        >
          <GraduationCap className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
          <span className="text-xs font-semibold">Tutor</span>
        </button>

        {/* Why Sprint Commercial Overview (Desktop) */}
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(640, 0.04);
            window.dispatchEvent(new CustomEvent('open_commercial_showcase'));
          }}
          className="h-8 sm:h-9 px-2.5 rounded-xl bg-white hover:bg-stone-100 dark:bg-slate-800/90 dark:hover:bg-slate-700 border border-stone-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 transition hidden xl:flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer text-xs font-semibold shrink-0 whitespace-nowrap"
          title="About IELTS Sprint & Cambridge Syllabus"
        >
          <span>Why Sprint</span>
        </button>

        {/* Install PWA Button */}
        {!isInstalled && (
          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(680, 0.04);
              setShowPwaModal(true);
            }}
            className="h-8 sm:h-9 px-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs hidden lg:flex items-center gap-1.5 transition cursor-pointer shrink-0 whitespace-nowrap"
            title="Install IELTS Sprint for Offline Study"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
        )}

        {/* Candidate Profile / Sign In Button (Visible on all screens for clear auth entry) */}
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(640, 0.04);
            onOpenProfile();
          }}
          className={`relative h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl border flex items-center gap-1.5 transition group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer shrink-0 whitespace-nowrap ${
            user
              ? 'bg-white hover:bg-stone-100 dark:bg-slate-800/90 dark:hover:bg-slate-700 border-stone-200/90 dark:border-slate-700'
              : 'bg-blue-700 hover:bg-blue-800 text-white border-blue-700'
          }`}
          title={user ? `Candidate Profile (${sanitizedName})` : 'Sign In or Create Account'}
          aria-label={user ? 'Candidate profile' : 'Sign in or create account'}
        >
          {user ? (
            <>
              <div className="w-6 h-6 rounded-lg bg-slate-900 dark:bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                {sanitizedName.slice(0, 1).toUpperCase()}
              </div>
              <span className="hidden xl:inline text-xs font-semibold text-slate-800 dark:text-slate-100 max-w-[85px] truncate">
                {sanitizedName}
              </span>
            </>
          ) : (
            <span className="text-xs font-semibold whitespace-nowrap px-0.5">
              Sign In
            </span>
          )}
        </button>

        {/* Three-dot right overflow menu removed for a cleaner, uncluttered header */}
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
