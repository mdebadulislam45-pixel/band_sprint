import React, { useEffect } from 'react';
import {
  X,
  Home,
  Target,
  BookMarked,
  Sparkles,
  BookOpen,
  MessageSquareQuote,
  Lightbulb,
  Mic,
  PenTool,
  BarChart3,
  BookmarkCheck,
  History,
  Sun,
  Moon,
  Briefcase,
  GraduationCap,
  Mail,
  ShieldCheck,
  Flame,
  Award
} from 'lucide-react';
import { UserProfile } from '../../types';
import { soundManager } from '../../utils/audioEffects';
import { IELTSSprintLogo } from '../common/IELTSSprintLogo';
import { useTheme } from '../../context/ThemeContext';
import { sanitizeCandidateName } from '../../utils/nameSanitizer';

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
  onExamModeChange
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

  if (!isOpen) return null;

  const navItems = [
    { id: 'home', label: 'Command Center', icon: Home, route: 'home' },
    { id: 'cdielts', label: 'CD-IELTS Exam Room', icon: Target, route: 'cdielts', badge: 'LAB' },
    { id: 'practice', label: 'Practice Arena', icon: Target, route: 'practice' },
    { id: 'cambridge', label: 'Cambridge 11–21', icon: BookMarked, route: 'cambridge' },
    { id: 'aitools', label: 'AI Tools & Evaluators', icon: Sparkles, route: 'aitools' },
    { id: 'vocab', label: 'High-Freq Vocabulary', icon: BookOpen, route: 'vocab' },
    { id: 'phrases', label: 'Discourse & Phrases', icon: MessageSquareQuote, route: 'phrases' },
    { id: 'idioms', label: 'Idiom Mastery Lab', icon: Lightbulb, route: 'idioms' },
    { id: 'shadowing', label: 'Speaking Shadowing', icon: Mic, route: 'shadowing' },
    { id: 'grammar', label: 'Grammar Essentials', icon: PenTool, route: 'grammar' },
    { id: 'progress', label: 'Band Analytics', icon: BarChart3, route: 'progress' },
    { id: 'saved', label: 'Mistake Vault', icon: BookmarkCheck, route: 'saved', isAction: true },
    { id: 'history', label: 'Exam History', icon: History, route: 'history' }
  ];

  const sanitizedName = user ? sanitizeCandidateName(user.name, user.email) : 'Candidate';
  const targetBand = user?.progress?.targetBand || 7.5;
  const streakDays = user?.progress?.streakDays || 1;

  const handleModeSwitch = (mode: 'Academic' | 'General Training') => {
    if (mode === examMode) return;
    soundManager.playBeep(mode === 'Academic' ? 580 : 660, 0.04);
    if (onExamModeChange) {
      onExamModeChange(mode);
    }
    try {
      localStorage.setItem('ielts_exam_mode', mode);
      window.dispatchEvent(new CustomEvent('ielts_exam_mode_changed', { detail: mode }));
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 md:hidden flex">
      {/* Backdrop */}
      <div
        onClick={() => {
          soundManager.playBeep(480, 0.03);
          onClose();
        }}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fade-in"
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <aside
        className="relative w-80 max-w-[85vw] h-full bg-white dark:bg-[#0B1224] text-slate-900 dark:text-slate-100 shadow-2xl flex flex-col justify-between p-4 overflow-y-auto z-10 transition-transform duration-300 ease-out border-r border-slate-200 dark:border-slate-800 select-none"
        aria-label="Mobile Navigation Menu"
      >
        <div className="space-y-4">
          {/* Top Header: Brand + Close Button */}
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                onNavigate('home');
                onClose();
              }}
              className="flex items-center gap-2 cursor-pointer text-left"
            >
              <IELTSSprintLogo variant="symbol" size="sm" />
              <div className="flex flex-col leading-none">
                <span className="font-black text-slate-900 dark:text-white text-base tracking-tight">
                  IELTS <span className="text-blue-600 dark:text-blue-400">SPRINT</span>
                </span>
                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                  Cambridge Masterguide
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(480, 0.03);
                onClose();
              }}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition cursor-pointer"
              aria-label="Close navigation menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Candidate Profile Summary Banner */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
              {sanitizedName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {sanitizedName}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-bold">
                  <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                  {streakDays}d streak
                </span>
                <span>•</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  Target Band {targetBand}
                </span>
              </div>
            </div>
          </div>



          {/* Primary Navigation Links */}
          <nav className="space-y-1 pt-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                currentPage === item.id ||
                (item.id === 'practice' && ['listening', 'reading', 'speaking', 'writing'].includes(currentPage)) ||
                (item.id === 'cdielts' && currentPage === 'cdielts');

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.isAction) {
                      onOpenVault();
                    } else {
                      onNavigate(item.route);
                    }
                    soundManager.playBeep(isActive ? 500 : 650, 0.04);
                    onClose();
                  }}
                  className={`w-full p-2.5 rounded-2xl text-left transition flex items-center gap-3 group min-h-[44px] cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md font-bold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 font-medium'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-blue-50 dark:group-hover:bg-slate-700 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <span className="text-xs truncate">{item.label}</span>
                    {item.badge && (
                      <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-600 dark:text-blue-300 font-mono text-[9px] font-black uppercase">
                        {item.badge}
                      </span>
                    )}
                    {item.id === 'saved' && mistakeCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-mono text-[10px] font-bold">
                        {mistakeCount}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Controls & Quick Links */}
        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          {/* Quick Theme Switcher */}
          <button
            type="button"
            onClick={() => {
              toggleTheme();
              soundManager.playBeep(700, 0.035);
            }}
            className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-left text-xs font-bold flex items-center justify-between transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
              <span>{resolvedTheme === 'dark' ? 'Light Appearance' : 'Dark Appearance'}</span>
            </div>
            <span className="text-[10px] font-mono uppercase text-slate-400">
              {resolvedTheme}
            </span>
          </button>

          {/* Cambridge Tutor Launcher */}
          <button
            type="button"
            onClick={() => {
              onClose();
              soundManager.playBeep(640, 0.04);
              window.dispatchEvent(new CustomEvent('open_ai_tutor'));
            }}
            className="w-full p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center gap-2 transition cursor-pointer border border-blue-200/70 dark:border-blue-800/60"
          >
            <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Open Cambridge Study Tutor</span>
          </button>

          {/* Legal & Support Links */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-semibold px-1 pt-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                window.dispatchEvent(new CustomEvent('open_commercial_showcase'));
              }}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
            >
              About
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => {
                onClose();
                window.dispatchEvent(new CustomEvent('open_legal_modal', { detail: { tab: 'terms' } }));
              }}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
            >
              Terms
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => {
                onClose();
                window.dispatchEvent(new CustomEvent('open_legal_modal', { detail: { tab: 'privacy' } }));
              }}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
            >
              Privacy
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => {
                onClose();
                window.dispatchEvent(new CustomEvent('open_contact_modal'));
              }}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
            >
              Support
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};
