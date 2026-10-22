import React from 'react';
import {
  Home,
  Target,
  Sparkles,
  BookOpen,
  MessageSquareQuote,
  Lightbulb,
  Mic,
  PenTool,
  BarChart3,
  BookmarkCheck,
  BookMarked,
  History,
  Sun,
  Moon,
  Sliders,
  Archive,
  Compass,
  Crown
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { IELTSSprintLogo } from '../common/IELTSSprintLogo';
import { useTheme } from '../../context/ThemeContext';

interface DesktopSidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  mistakeCount: number;
  onOpenVault: () => void;
  onOpenBandModal: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  currentPage,
  onNavigate,
  mistakeCount,
  onOpenVault,
  onOpenBandModal
}) => {
  const { resolvedTheme, toggleTheme } = useTheme();

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, route: 'home' },
    { id: 'practice', label: 'Practice', icon: Target, route: 'practice' },
    { id: 'cambridge', label: 'Cambridge 11–21', icon: BookMarked, route: 'cambridge' },
    { id: 'aitools', label: 'AI Tools', icon: Sparkles, route: 'aitools' },
    { id: 'vocab', label: 'Vocabulary', icon: BookOpen, route: 'vocab' },
    { id: 'phrases', label: 'Useful Phrases', icon: MessageSquareQuote, route: 'phrases' },
    { id: 'idioms', label: 'Idiom Lab', icon: Lightbulb, route: 'idioms' },
    { id: 'shadowing', label: 'Shadowing', icon: Mic, route: 'shadowing' },
    { id: 'grammar', label: 'Grammar', icon: PenTool, route: 'grammar' },
    { id: 'progress', label: 'Analytics', icon: BarChart3, route: 'progress' },
    { id: 'saved', label: 'Saved Items', icon: BookmarkCheck, route: 'saved', isAction: true },
    { id: 'history', label: 'History', icon: History, route: 'history' }
  ];

  return (
    <aside className="hidden md:flex flex-col justify-between w-64 lg:w-72 bg-white dark:bg-[#101B32] border-r border-slate-200/90 dark:border-slate-800 h-screen sticky top-0 p-5 shrink-0 z-30 transition-colors select-none overflow-y-auto">
      <div className="space-y-6">
        {/* App Logo & Branding */}
        <div
          onClick={() => onNavigate('home')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <IELTSSprintLogo variant="full" size="md" showBadge={true} />
        </div>

        {/* Primary Navigation Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentPage === item.id ||
              (item.id === 'practice' && ['listening', 'reading', 'speaking', 'writing', 'cdielts'].includes(currentPage)) ||
              (item.id === 'progress' && currentPage === 'progress');

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.isAction) {
                    onOpenVault();
                  } else {
                    onNavigate(item.route);
                  }
                  soundManager.playBeep(isActive ? 500 : 650, 0.04);
                }}
                className={`w-full p-2.5 rounded-2xl text-left transition flex items-center gap-3 group min-h-[44px] cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-[0_4px_12px_rgba(37,99,235,0.35)] font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white font-medium'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition shrink-0 icon-3d ${
                    isActive
                      ? 'bg-white/25 text-white shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.6)]'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 group-hover:bg-blue-50 dark:group-hover:bg-slate-700 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                  }`}
                >
                  <Icon className="w-4 h-4 drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.25)]" />
                </div>

                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="text-xs truncate">{item.label}</span>
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

      {/* Motivational Card at Bottom */}
      <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="relative overflow-hidden rounded-2xl bg-linear-to-b from-slate-900 via-indigo-950 to-[#0F1E36] p-4 text-white border border-slate-700/60 shadow-md">
          {/* Subtle Mountain & Night Sky Background */}
          <div className="absolute inset-0 opacity-40 pointer-events-none">
            <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="w-full h-full">
              <path d="M0,100 L40,60 L80,90 L130,40 L180,80 L200,60 L200,100 Z" fill="#3B82F6" opacity="0.3" />
              <circle cx="160" cy="25" r="8" fill="#FDE68A" opacity="0.6" />
              <circle cx="40" cy="20" r="1" fill="#FFFFFF" />
              <circle cx="90" cy="15" r="1" fill="#FFFFFF" />
              <circle cx="120" cy="30" r="1" fill="#FFFFFF" />
            </svg>
          </div>

          <div className="relative z-10 space-y-1">
            <div className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>Daily Motivation</span>
            </div>
            <p className="text-xs font-semibold text-slate-100 leading-relaxed italic">
              "Small steps every day lead to big results."
            </p>
          </div>
        </div>

        {/* Quick Theme Switcher */}
        <button
          onClick={() => {
            toggleTheme();
            soundManager.playBeep(700, 0.035);
          }}
          className="w-full p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-xs font-medium flex items-center justify-between transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-500" />
            )}
            <span>{resolvedTheme === 'dark' ? 'Light Appearance' : 'Dark Appearance'}</span>
          </div>
          <span className="text-[10px] font-mono uppercase text-slate-400">
            {resolvedTheme}
          </span>
        </button>

        {/* Commercial Legal & Support Links */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-semibold px-1">
          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(520, 0.03);
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
              soundManager.playBeep(520, 0.03);
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
              soundManager.playBeep(520, 0.03);
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
              soundManager.playBeep(520, 0.03);
              window.dispatchEvent(new CustomEvent('open_contact_modal'));
            }}
            className="hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
          >
            Support
          </button>
        </div>
      </div>
    </aside>
  );
};
