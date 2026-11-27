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
  Flame,
  BookmarkCheck,
  SlidersHorizontal,
  ChevronRight,
  LucideIcon
} from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion, Transition, Variants } from 'framer-motion';
import { audioManager } from '../../services/AudioManager';
import { BandSprintMark } from '../common/BandSprintMark';
import { BarnabyRig } from '../BarnabyRig';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { useTheme } from '../../context/ThemeContext';
import { MainDestination, prefetchRoute } from '../../router/useAppRouter';

interface DesktopSidebarProps {
  activeHub: MainDestination;
  currentPath?: string;
  onNavigate: (path: string) => void;
  mistakeCount?: number;
  onOpenVault?: () => void;
  onOpenBandModal?: () => void;
  onSignOut?: () => void;
}

interface SubNavItem {
  label: string;
  path: string;
  badge?: string;
}

interface NavDestination {
  id: MainDestination;
  label: string;
  icon: LucideIcon;
  path: string;
  subItems?: SubNavItem[];
}

export const SIDEBAR_LAYOUT_SPRING: Transition = {
  layout: { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 },
  opacity: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
  scale: { type: 'spring', stiffness: 440, damping: 28 }
};

export const ACTIVE_PILL_VARIANTS: Variants = {
  initial: { opacity: 0, scale: 0.92 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: SIDEBAR_LAYOUT_SPRING
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    transition: { duration: 0.15, ease: 'easeOut' }
  }
};

export const ACTIVE_ACCENT_BAR_VARIANTS: Variants = {
  initial: { opacity: 0, scaleY: 0.25 },
  animate: {
    opacity: 1,
    scaleY: 1,
    transition: { type: 'spring', stiffness: 460, damping: 28 }
  },
  exit: {
    opacity: 0,
    scaleY: 0.25,
    transition: { duration: 0.14 }
  }
};

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeHub,
  currentPath = '/',
  onNavigate,
  mistakeCount = 0,
  onOpenVault,
  onOpenBandModal,
  onSignOut
}) => {
  const { resolvedTheme, toggleTheme } = useTheme();

  const navItems: NavDestination[] = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      path: '/'
    },
    {
      id: 'practice',
      label: 'Practice',
      icon: Target,
      path: '/practice',
      subItems: [
        { label: 'Listening Lab', path: '/practice/listening' },
        { label: 'Reading Lab', path: '/practice/reading' },
        { label: 'Writing Lab', path: '/practice/writing' },
        { label: 'Speaking Lab', path: '/practice/speaking' },
        { label: 'Mock Exam Room', path: '/practice/mock-tests', badge: 'CD' },
        { label: 'Question Bank', path: '/practice/question-bank' }
      ]
    },
    {
      id: 'learn',
      label: 'Learn',
      icon: BookOpen,
      path: '/learn',
      subItems: [
        { label: 'Pomodoro Daily Sprint', path: '/learn/daily-sprint', badge: 'BANGLA' },
        { label: 'Vocabulary Deck', path: '/learn/vocabulary' },
        { label: 'Idiom Lab', path: '/learn/idioms' },
        { label: 'Phrases & Collocations', path: '/learn/phrases' },
        { label: 'Spelling Lab (683)', path: '/learn/spelling' },
        { label: 'Grammar Lab', path: '/learn/grammar' },
        { label: '10-Min Diagnostic', path: '/learn/diagnostic' }
      ]
    },
    {
      id: 'progress',
      label: 'Progress',
      icon: BarChart3,
      path: '/progress',
      subItems: [
        { label: 'Candidate Analytics', path: '/progress/analytics' },
        { label: 'Practice History', path: '/progress/history' },
        { label: 'Sprint Calendar', path: '/progress/calendar' },
        { label: 'Mistake Vault', path: '/progress/saved' }
      ]
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      path: '/profile',
      subItems: [
        { label: 'Candidate Details', path: '/profile/details' },
        { label: 'App Settings', path: '/profile/settings' },
        { label: 'Help & Support', path: '/profile/help' }
      ]
    }
  ];

  const isDailySprintActive =
    currentPath === '/learn/daily-sprint' || currentPath === '/practice/sprint';

  return (
    <aside
      role="navigation"
      aria-label="Sidebar Navigation"
      data-testid="desktop-sidebar"
      className="hidden md:flex flex-col w-64 lg:w-72 fixed inset-y-0 left-0 h-dvh bg-[#EEF3F1] dark:bg-[#11201E] border-r border-[#D3DDDA] dark:border-[#1F8A70]/35 z-30 transition-colors select-none overflow-hidden"
    >
      {/* 1. Pinned Top Brand Header (never scrolls away) */}
      <div className="px-5 pt-5 pb-3 shrink-0 border-b border-[#D3DDDA]/60 dark:border-[#1F8A70]/25">
        <div
          onClick={() => {
            audioManager.playUiClick('soft');
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
      </div>

      {/* 2. Steady Scrollable Navigation Zone with Framer Motion LayoutGroup */}
      <div className="flex-1 overflow-y-auto overscroll-contain sidebar-scroll px-5 py-4 space-y-4">
        <LayoutGroup id="desktop-sidebar-nav">
          <motion.nav
            layout
            transition={SIDEBAR_LAYOUT_SPRING}
            className="space-y-1.5"
            aria-label="Main Destinations"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeHub === item.id;
              const isExactHubRoot =
                currentPath === item.path || (item.path === '/' && currentPath === '/home');

              return (
                <motion.div
                  key={item.id}
                  layout="position"
                  transition={SIDEBAR_LAYOUT_SPRING}
                  className="space-y-1"
                >
                  <motion.button
                    layout="position"
                    transition={SIDEBAR_LAYOUT_SPRING}
                    whileTap={{ scale: 0.985 }}
                    type="button"
                    data-testid={`desktop-nav-${item.id}`}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={item.label}
                    onClick={() => {
                      audioManager.playUiClick('tab');
                      onNavigate(item.path);
                    }}
                    onMouseEnter={() => prefetchRoute(item.path)}
                    onFocus={() => prefetchRoute(item.path)}
                    className={`relative w-full px-3 py-2.5 rounded-xl text-left transition-colors flex items-center gap-3 group min-h-[44px] cursor-pointer whitespace-nowrap overflow-hidden ${
                      isActive
                        ? 'text-white font-semibold'
                        : 'text-[#566664] dark:text-slate-300 hover:bg-[#D3DDDA]/40 dark:hover:bg-[#1F8A70]/20 hover:text-[#0E1F1E] dark:hover:text-white font-medium'
                    }`}
                  >
                    <AnimatePresence initial={false}>
                      {isActive && (
                        <motion.span
                          key="desktop-active-pill"
                          layoutId="desktop-sidebar-active-pill"
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
                          key="desktop-active-bar"
                          layoutId="desktop-sidebar-active-bar"
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
                      animate={{ scale: isActive ? 1.04 : 1 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                      className={`relative z-10 w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-white dark:bg-[#11201E] text-[#566664] dark:text-slate-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </motion.div>

                    <div className="relative z-10 flex-1 flex items-center justify-between min-w-0">
                      <span className="text-xs font-semibold truncate">{item.label}</span>
                      {item.subItems && (
                        <motion.span
                          animate={{ rotate: isActive ? 90 : 0 }}
                          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                          className="inline-flex"
                        >
                          <ChevronRight
                            className={`w-3.5 h-3.5 ${
                              isActive
                                ? 'text-white/85'
                                : 'text-[#566664]/60 dark:text-slate-500'
                            }`}
                          />
                        </motion.span>
                      )}
                    </div>
                  </motion.button>

                  {/* Contextual Sub-Links when hub is active */}
                  <AnimatePresence initial={false}>
                    {isActive && item.subItems && item.subItems.length > 0 && (
                      <motion.div
                        key={`subnav-${item.id}`}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{
                          height: { type: 'spring', stiffness: 400, damping: 34 },
                          opacity: { duration: 0.18 }
                        }}
                        data-testid={`desktop-subnav-${item.id}`}
                        className="overflow-hidden"
                      >
                        <div className="pl-5 pr-1 py-1 space-y-0.5 border-l-2 border-[#0F4C45]/25 dark:border-[#1F8A70]/35 ml-4">
                          {item.subItems.map((sub) => {
                            const isSubActive =
                              currentPath === sub.path && !isExactHubRoot;
                            return (
                              <motion.button
                                key={sub.path}
                                layout="position"
                                transition={SIDEBAR_LAYOUT_SPRING}
                                whileTap={{ scale: 0.98 }}
                                type="button"
                                onClick={() => {
                                  audioManager.playUiClick('tab');
                                  onNavigate(sub.path);
                                }}
                                onMouseEnter={() => prefetchRoute(sub.path)}
                                className={`relative w-full px-2.5 py-1.5 rounded-lg text-left text-[11px] flex items-center justify-between gap-2 transition cursor-pointer overflow-hidden ${
                                  isSubActive
                                    ? 'text-[#0F4C45] dark:text-[#FDE68A] font-bold'
                                    : 'text-[#566664] dark:text-slate-400 hover:text-[#0E1F1E] dark:hover:text-white hover:bg-[#D3DDDA]/35 dark:hover:bg-white/5 font-medium'
                                }`}
                              >
                                <AnimatePresence initial={false}>
                                  {isSubActive && (
                                    <motion.span
                                      key="subnav-active-pill"
                                      layoutId="desktop-subnav-active-pill"
                                      variants={ACTIVE_PILL_VARIANTS}
                                      initial="initial"
                                      animate="animate"
                                      exit="exit"
                                      transition={SIDEBAR_LAYOUT_SPRING}
                                      className="absolute inset-0 rounded-lg bg-[#0F4C45]/12 dark:bg-[#1F8A70]/25"
                                      aria-hidden="true"
                                    />
                                  )}
                                </AnimatePresence>

                                <span className="relative z-10 truncate">{sub.label}</span>
                                {sub.badge && (
                                  <span className="relative z-10 px-1.5 py-0.5 rounded bg-[#F4A62A]/20 text-[#9A5B00] dark:text-[#F4A62A] text-[9px] font-bold uppercase tracking-wider shrink-0">
                                    {sub.badge}
                                  </span>
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.nav>

          {/* Quick Actions: Daily Sprint Hub, Mistake Vault & Target Band */}
          <motion.div
            layout="position"
            transition={SIDEBAR_LAYOUT_SPRING}
            className="pt-3 border-t border-[#D3DDDA] dark:border-[#1F8A70]/30 space-y-1.5"
          >
            <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-[#566664] dark:text-slate-400">
              Quick Access
            </div>

            {/* Pomodoro & Daily Sprint Hub Quick Button */}
            <motion.button
              layout="position"
              transition={SIDEBAR_LAYOUT_SPRING}
              whileTap={{ scale: 0.985 }}
              type="button"
              data-testid="sidebar-quick-daily-sprint"
              onClick={() => {
                audioManager.playUiClick('soft');
                onNavigate('/learn/daily-sprint');
              }}
              className={`relative w-full px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between gap-2 transition cursor-pointer min-h-[40px] overflow-hidden ${
                isDailySprintActive
                  ? 'text-[#0E1F1E] font-bold'
                  : 'bg-white dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-[#0E1F1E] dark:text-[#EEF3F1] hover:border-[#0F4C45] font-semibold'
              }`}
            >
              <AnimatePresence initial={false}>
                {isDailySprintActive && (
                  <motion.span
                    key="quick-sprint-pill"
                    variants={ACTIVE_PILL_VARIANTS}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="absolute inset-0 rounded-xl bg-[#F4A62A]"
                    aria-hidden="true"
                  />
                )}
              </AnimatePresence>
              <div className="relative z-10 flex items-center gap-2 min-w-0">
                <Flame
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isDailySprintActive
                      ? 'text-[#0E1F1E]'
                      : 'text-[#D97706] dark:text-[#F4A62A]'
                  }`}
                />
                <span className="truncate">Pomodoro Daily Sprint</span>
              </div>
              <span
                className={`relative z-10 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                  isDailySprintActive
                    ? 'bg-[#0E1F1E]/15 text-[#0E1F1E]'
                    : 'bg-[#0F4C45]/12 dark:bg-[#1F8A70]/25 text-[#0F4C45] dark:text-[#FDE68A]'
                }`}
              >
                বাংলা
              </span>
            </motion.button>

            {/* Mistake Vault Button */}
            <motion.button
              layout="position"
              transition={SIDEBAR_LAYOUT_SPRING}
              whileTap={{ scale: 0.985 }}
              type="button"
              data-testid="sidebar-quick-mistake-vault"
              onClick={() => {
                audioManager.playUiClick('soft');
                if (onOpenVault) {
                  onOpenVault();
                } else {
                  onNavigate('/progress/saved');
                }
              }}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 hover:border-[#0F4C45] text-[#0E1F1E] dark:text-[#EEF3F1] text-left text-xs font-semibold flex items-center justify-between gap-2 transition cursor-pointer min-h-[40px]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <BookmarkCheck className="w-3.5 h-3.5 text-[#0F4C45] dark:text-[#4DB6A4] shrink-0" />
                <span className="truncate">Mistake Vault</span>
              </div>
              {mistakeCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-[#F4A62A]/20 text-[#9A5B00] dark:text-[#F4A62A] font-mono text-[10px] font-bold tabular-nums shrink-0">
                  {mistakeCount}
                </span>
              )}
            </motion.button>

            {/* Target Band & Exam Date Button */}
            {onOpenBandModal && (
              <motion.button
                layout="position"
                transition={SIDEBAR_LAYOUT_SPRING}
                whileTap={{ scale: 0.985 }}
                type="button"
                data-testid="sidebar-quick-band-target"
                onClick={() => {
                  audioManager.playUiClick('soft');
                  onOpenBandModal();
                }}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 hover:border-[#0F4C45] text-[#566664] dark:text-slate-300 hover:text-[#0E1F1E] dark:hover:text-white text-left text-xs font-semibold flex items-center gap-2 transition cursor-pointer min-h-[40px]"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#0F4C45] dark:text-[#F4A62A] shrink-0" />
                <span className="truncate">Target Band &amp; Exam Date</span>
              </motion.button>
            )}
          </motion.div>

          {/* Editorial Note inside scrollable body */}
          <motion.div
            layout="position"
            transition={SIDEBAR_LAYOUT_SPRING}
            className="rounded-xl bg-white dark:bg-[#0B1514] p-3 border border-[#134E41]/15 dark:border-[#1F8A70]/30"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-transparent flex items-center justify-center overflow-hidden shrink-0 p-0.5">
                <BarnabyRig
                  expression="focused"
                  mode="ambient"
                  interactive={false}
                  className="w-full h-full"
                  ariaLabel="Barnaby study tip badge"
                />
              </div>
              <div className="text-[11px] font-semibold text-[#134E41] dark:text-[#EEF3F1] tracking-wide">
                Study Tip
              </div>
            </div>
            <p className="font-display text-[11px] font-medium text-[#0E1F1E] dark:text-[#EEF3F1] leading-relaxed italic mt-1.5">
              “Precision in vocabulary and clarity of thought outscore memorized complexity every time.”
            </p>
          </motion.div>
        </LayoutGroup>
      </div>

      {/* 3. Pinned Bottom Appearance & Account Controls (never scrolls away) */}
      <div className="px-5 py-3.5 shrink-0 border-t border-[#D3DDDA] dark:border-[#1F8A70]/35 bg-[#EEF3F1] dark:bg-[#11201E] space-y-2">
        {/* Install Offline PWA Button (auto-hides in standalone mode) */}
        <PWAInstallButton variant="sidebar" />

        {/* Quick Theme Switcher */}
        <button
          type="button"
          onClick={() => {
            toggleTheme();
            audioManager.playUiClick('toggle');
          }}
          className="w-full p-2 rounded-xl text-[#566664] dark:text-slate-400 hover:text-[#0E1F1E] dark:hover:text-white hover:bg-white dark:hover:bg-[#0B1514] text-left text-xs font-medium flex items-center justify-between transition cursor-pointer min-h-[40px]"
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
              audioManager.playUiClick('soft');
              onSignOut();
            }}
            className="w-full p-2 rounded-xl text-[#566664] dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-left text-xs font-semibold flex items-center gap-2 transition cursor-pointer min-h-[40px]"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        )}

        {/* Legal Links */}
        <div className="pt-1.5 border-t border-[#D3DDDA] dark:border-[#1F8A70]/30 flex items-center justify-between text-[10px] text-[#566664] dark:text-slate-400 font-semibold px-1">
          <button
            type="button"
            onClick={() => {
              audioManager.playUiClick('soft');
              onNavigate('/profile/help');
            }}
            className="hover:text-[#0F4C45] dark:hover:text-[#1F8A70] transition cursor-pointer py-1 flex items-center"
          >
            Support
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => {
              audioManager.playUiClick('soft');
              window.dispatchEvent(new CustomEvent('open_legal_modal', { detail: { tab: 'terms' } }));
            }}
            className="hover:text-[#0F4C45] dark:hover:text-[#1F8A70] transition cursor-pointer py-1 flex items-center"
          >
            Terms
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => {
              audioManager.playUiClick('soft');
              window.dispatchEvent(new CustomEvent('open_legal_modal', { detail: { tab: 'privacy' } }));
            }}
            className="hover:text-[#0F4C45] dark:hover:text-[#1F8A70] transition cursor-pointer py-1 flex items-center"
          >
            Privacy
          </button>
        </div>
      </div>
    </aside>
  );
};
