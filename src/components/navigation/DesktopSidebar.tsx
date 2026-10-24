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
    <aside className="hidden md:flex flex-col justify-between w-64 lg:w-72 bg-white/90 dark:bg-[#0C1324] border-r border-stone-200/80 dark:border-slate-800/80 h-screen sticky top-0 p-5 shrink-0 z-30 transition-colors select-none overflow-y-auto">
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
                className={`w-full px-3 py-2.5 rounded-xl text-left transition flex items-center gap-3 group min-h-[42px] cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 dark:bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-stone-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white font-medium'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition shrink-0 ${
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'bg-stone-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:text-blue-700 dark:group-hover:text-blue-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="text-xs truncate">{item.label}</span>
                  {item.id === 'saved' && mistakeCount > 0 && (
                    <span className="font-mono tabular-nums text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                      {mistakeCount}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>

      </div>

      {/* Editorial Study Note & Theme Controls at Bottom */}
      <div className="space-y-3 pt-4 border-t border-stone-200/70 dark:border-slate-800/80">
        <div className="rounded-xl bg-[#FAF8F5] dark:bg-slate-900/80 p-3.5 border border-stone-200/80 dark:border-slate-800">
          <div className="text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400 tracking-wide">
            Cambridge Principle
          </div>
          <p className="font-display text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed italic mt-1">
            “Precision in vocabulary and clarity of thought outscore memorized complexity every time.”
          </p>
        </div>

        {/* Quick Theme Switcher */}
        <button
          onClick={() => {
            toggleTheme();
            soundManager.playBeep(700, 0.035);
          }}
          className="w-full p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-slate-800 text-left text-xs font-medium flex items-center justify-between transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
            <span>{resolvedTheme === 'dark' ? 'Light Appearance' : 'Dark Appearance'}</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 capitalize">
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
