import React, { useEffect, useState, useRef } from 'react';
import {
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
    <header className="sticky top-0 z-40 w-full h-14 sm:h-16 bg-white/95 dark:bg-[#0B1224]/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800/80 px-2.5 sm:px-4 lg:px-6 flex items-center justify-between gap-1.5 sm:gap-3 transition-colors select-none pt-[env(safe-area-inset-top)]">
      {/* ================= LEFT: BRANDING / BACK / BREADCRUMB ================= */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink-0">
        {canGoBack && (
          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(480, 0.04);
              onBack();
            }}
            className="h-8 sm:h-9 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 active:bg-slate-300/80 dark:bg-slate-800/90 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition flex items-center justify-center gap-1 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
            <span className="hidden sm:inline font-bold">{backLabel || 'Back'}</span>
          </button>
        )}

        {/* Brand Identity */}
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(520, 0.04);
            onNavigate('home');
          }}
          className="flex items-center gap-1.5 sm:gap-2 cursor-pointer group py-1 shrink-0 text-left focus-visible:outline-none"
          title="IELTS Sprint Home"
        >
          <IELTSSprintLogo variant="symbol" size="sm" />
          <div className="flex flex-col leading-none">
            <span className="font-black text-slate-900 dark:text-white tracking-tight text-xs sm:text-sm lg:text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors whitespace-nowrap">
              IELTS <span className="text-blue-600 dark:text-blue-400">SPRINT</span>
            </span>
            <span className="hidden sm:inline text-[9px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase mt-0.5">
              Cambridge Suite
            </span>
          </div>
        </button>

        {/* Desktop Breadcrumb */}
        {parentSection && (
          <div className="hidden xl:flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 pl-2.5 border-l border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => onNavigate(parentSection.id)}
              className="hover:text-slate-700 dark:hover:text-slate-300 font-medium transition-colors cursor-pointer"
            >
              {parentSection.label}
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-700 dark:text-slate-200 font-bold truncate max-w-[150px]">
              {currentTitle}
            </span>
          </div>
        )}
      </div>

      {/* ================= CENTER: EXAM MODE SWITCHER ================= */}
      <div className="flex items-center justify-center shrink-0">
        <div
          role="radiogroup"
          aria-label="IELTS Exam Format"
          className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80"
        >
          <button
            type="button"
            role="radio"
            aria-checked={examMode === 'Academic'}
            onClick={() => handleModeSwitch('Academic')}
            className={`h-7 sm:h-8 px-2 sm:px-3 rounded-lg text-[10px] sm:text-xs font-bold transition-all duration-150 flex items-center gap-1 cursor-pointer ${
              examMode === 'Academic'
                ? 'bg-white dark:bg-[#0F172A] text-blue-600 dark:text-blue-400 shadow-2xs border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="Switch to Academic Practice Materials"
          >
            <BookOpen className="w-3 h-3 shrink-0" />
            <span className="hidden sm:inline">Academic</span>
            <span className="sm:hidden">Acad</span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={examMode === 'General Training'}
            onClick={() => handleModeSwitch('General Training')}
            className={`h-7 sm:h-8 px-2 sm:px-3 rounded-lg text-[10px] sm:text-xs font-bold transition-all duration-150 flex items-center gap-1 cursor-pointer ${
              examMode === 'General Training'
                ? 'bg-white dark:bg-[#0F172A] text-blue-600 dark:text-blue-400 shadow-2xs border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="Switch to General Training Practice Materials"
          >
            <Briefcase className="w-3 h-3 shrink-0" />
            <span className="hidden sm:inline">General</span>
            <span className="sm:hidden">GT</span>
          </button>
        </div>
      </div>

      {/* ================= RIGHT: THEME TOGGLE, SEARCH & CONTROLS ================= */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 relative" ref={menuRef}>

        {/* Daily Streak Indicator */}
        <div
          className="h-8 sm:h-9 px-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 hidden sm:flex items-center gap-1 text-[11px] sm:text-xs font-bold shrink-0"
          title={`Active Daily Practice Streak: ${streakDays} days`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
          <span className="font-mono">{streakDays}d</span>
        </div>

        {/* Global Search Button */}
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(600, 0.04);
            onOpenSearch();
          }}
          className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800/90 dark:hover:bg-slate-700 border border-slate-200/70 dark:border-slate-700/70 text-slate-600 dark:text-slate-300 transition flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
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
          className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/90 dark:hover:bg-slate-700 border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer shadow-2xs"
          title={isDark ? 'Switch to Light Mode (Saved Automatically)' : 'Switch to Dark Mode (Saved Automatically)'}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-pressed={isDark}
          data-testid="header-theme-toggle"
        >
          <span className="relative flex items-center justify-center w-4 h-4 shrink-0">
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20 transition-transform duration-200 hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600 fill-indigo-600/15 transition-transform duration-200 hover:-rotate-12" />
            )}
          </span>
          <span className="hidden sm:inline text-[11px] sm:text-xs font-bold tracking-tight text-slate-700 dark:text-slate-200">
            {isDark ? 'Light' : 'Dark'}
          </span>
        </button>

        {/* Cambridge AI Tutor Button (Desktop) */}
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(640, 0.04);
            window.dispatchEvent(new CustomEvent('open_ai_tutor'));
          }}
          className="h-8 sm:h-9 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800/90 dark:hover:bg-slate-700 border border-slate-200/70 dark:border-slate-700/70 text-slate-700 dark:text-slate-200 transition hidden md:flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
          title="Open Cambridge Study Tutor"
        >
          <GraduationCap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-bold">Tutor</span>
        </button>

        {/* Why Sprint Commercial Overview (Desktop) */}
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(640, 0.04);
            window.dispatchEvent(new CustomEvent('open_commercial_showcase'));
          }}
          className="h-8 sm:h-9 px-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 border border-blue-200/70 dark:border-blue-800/70 text-blue-700 dark:text-blue-300 transition hidden xl:flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer text-xs font-bold"
          title="About IELTS Sprint & Cambridge Syllabus"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
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
            className="h-8 sm:h-9 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs hidden lg:flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
            title="Install IELTS Sprint for Offline Study"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
        )}

        {/* Candidate Profile Avatar */}
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(640, 0.04);
            onOpenProfile();
          }}
          className="relative h-8 sm:h-9 px-1.5 sm:px-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/90 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 hidden sm:flex items-center gap-1.5 transition group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
          title={`Candidate Profile (${sanitizedName})`}
          aria-label="Candidate profile"
        >
          <div className="relative">
            <div className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-[11px] flex items-center justify-center shadow-2xs shrink-0">
              {sanitizedName.slice(0, 1).toUpperCase()}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-slate-900" />
          </div>
          <span className="hidden xl:inline text-xs font-bold text-slate-800 dark:text-slate-100 max-w-[80px] truncate">
            {sanitizedName}
          </span>
        </button>

        {/* ================= MOBILE OVERFLOW MENU TRIGGER (<sm) ================= */}
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(520, 0.04);
            setShowMobileOverflow(!showMobileOverflow);
          }}
          className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 sm:hidden flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
          aria-label="More options"
          aria-expanded={showMobileOverflow}
        >
          {showMobileOverflow ? (
            <X className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          ) : (
            <MoreVertical className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          )}
        </button>

        {/* Mobile Dropdown Overflow Menu */}
        {showMobileOverflow && (
          <div className="absolute top-full right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-[#0B1224] border border-slate-200 dark:border-slate-800 shadow-xl p-2.5 z-50 animate-fade-in space-y-1 sm:hidden">
            {/* Candidate Info */}
            <div
              onClick={() => {
                setShowMobileOverflow(false);
                onOpenProfile();
              }}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2.5 cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-xs flex items-center justify-center shadow-2xs shrink-0">
                {sanitizedName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {sanitizedName}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Band {user?.progress?.targetBand || 7.5} Target · Profile
                </div>
              </div>
            </div>


            {/* Theme Toggle in Mobile Menu */}
            <button
              type="button"
              onClick={() => {
                toggleTheme();
                soundManager.playBeep(700, 0.035);
              }}
              className="w-full p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                {isDark ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-600" />
                )}
                <span>{isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
              </div>
              <span className="text-[10px] font-mono uppercase text-slate-400">
                {resolvedTheme}
              </span>
            </button>

            {/* Cambridge Tutor */}
            <button
              type="button"
              onClick={() => {
                setShowMobileOverflow(false);
                soundManager.playBeep(640, 0.04);
                window.dispatchEvent(new CustomEvent('open_ai_tutor'));
              }}
              className="w-full p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 transition cursor-pointer"
            >
              <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Cambridge Study Tutor</span>
            </button>

            {/* Mistake Vault */}
            <button
              type="button"
              onClick={() => {
                setShowMobileOverflow(false);
                soundManager.playBeep(520, 0.04);
                onOpenVault();
              }}
              className="w-full p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Mistake Vault</span>
              </div>
              {mistakeCount > 0 && (
                <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400">
                  {mistakeCount}
                </span>
              )}
            </button>

            {/* Commercial & About Options */}
            <div className="pt-1 border-t border-slate-100 dark:border-slate-800 space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  setShowMobileOverflow(false);
                  soundManager.playBeep(640, 0.04);
                  window.dispatchEvent(new CustomEvent('open_commercial_showcase'));
                }}
                className="w-full p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Why IELTS Sprint (About)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMobileOverflow(false);
                  soundManager.playBeep(520, 0.04);
                  window.dispatchEvent(new CustomEvent('open_seo_guide'));
                }}
                className="w-full p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 transition cursor-pointer"
              >
                <Rocket className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Google SEO & Launch Guide</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMobileOverflow(false);
                  soundManager.playBeep(520, 0.04);
                  window.dispatchEvent(new CustomEvent('open_contact_modal'));
                }}
                className="w-full p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 transition cursor-pointer"
              >
                <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Student Support & Feedback</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMobileOverflow(false);
                  soundManager.playBeep(520, 0.04);
                  window.dispatchEvent(new CustomEvent('open_legal_modal', { detail: { tab: 'terms' } }));
                }}
                className="w-full p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 transition cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-slate-500" />
                <span>Terms & Privacy Policies</span>
              </button>
            </div>

            {/* PWA Install */}
            {!isInstalled && (
              <button
                type="button"
                onClick={() => {
                  setShowMobileOverflow(false);
                  setShowPwaModal(true);
                }}
                className="w-full p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-left text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Install Offline App</span>
              </button>
            )}
          </div>
        )}
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
