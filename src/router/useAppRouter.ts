import { useState, useEffect, useCallback } from 'react';

export type MainDestination = 'home' | 'practice' | 'learn' | 'progress' | 'profile';

export interface RouteInfo {
  path: string;
  hub: MainDestination;
  subpage?: string;
  title: string;
  isHub: boolean;
}

const ROUTE_MAP: Record<string, RouteInfo> = {
  '/': { path: '/', hub: 'home', title: 'Home', isHub: true },
  '/home': { path: '/home', hub: 'home', title: 'Home', isHub: true },

  // Practice Hub & Subpages
  '/practice': { path: '/practice', hub: 'practice', title: 'Practice Hub', isHub: true },
  '/practice/listening': { path: '/practice/listening', hub: 'practice', subpage: 'listening', title: 'Listening Lab', isHub: false },
  '/practice/reading': { path: '/practice/reading', hub: 'practice', subpage: 'reading', title: 'Reading Lab', isHub: false },
  '/practice/writing': { path: '/practice/writing', hub: 'practice', subpage: 'writing', title: 'Writing Lab', isHub: false },
  '/practice/speaking': { path: '/practice/speaking', hub: 'practice', subpage: 'speaking', title: 'Speaking Lab', isHub: false },
  '/practice/mock-tests': { path: '/practice/mock-tests', hub: 'practice', subpage: 'mock-tests', title: 'Mock Tests & Exam Room', isHub: false },
  '/practice/question-bank': { path: '/practice/question-bank', hub: 'practice', subpage: 'question-bank', title: 'Question Bank', isHub: false },
  '/practice/sprint': { path: '/practice/sprint', hub: 'practice', subpage: 'sprint', title: 'Pomodoro & Daily IELTS Sprint Hub', isHub: false },
  '/practice/ai-tools': { path: '/practice/ai-tools', hub: 'practice', subpage: 'ai-tools', title: 'AI Tools', isHub: false },

  // Learn Hub & Subpages
  '/learn': { path: '/learn', hub: 'learn', title: 'Learn Hub', isHub: true },
  '/learn/daily-sprint': { path: '/learn/daily-sprint', hub: 'learn', subpage: 'daily-sprint', title: 'Pomodoro & Daily IELTS Sprint Hub', isHub: false },
  '/learn/vocabulary': { path: '/learn/vocabulary', hub: 'learn', subpage: 'vocabulary', title: 'Vocabulary Deck', isHub: false },
  '/learn/phrases': { path: '/learn/phrases', hub: 'learn', subpage: 'phrases', title: 'Useful Phrases', isHub: false },
  '/learn/idioms': { path: '/learn/idioms', hub: 'learn', subpage: 'idioms', title: 'Idiom Lab', isHub: false },
  '/learn/collocations': { path: '/learn/collocations', hub: 'learn', subpage: 'collocations', title: 'Academic Collocations', isHub: false },
  '/learn/grammar': { path: '/learn/grammar', hub: 'learn', subpage: 'grammar', title: 'Grammar Lab', isHub: false },
  '/learn/spelling': { path: '/learn/spelling', hub: 'learn', subpage: 'spelling', title: 'Spelling Lab', isHub: false },
  '/learn/shadowing': { path: '/learn/shadowing', hub: 'learn', subpage: 'shadowing', title: 'Shadowing & Pronunciation', isHub: false },
  '/learn/model-answers': { path: '/learn/model-answers', hub: 'learn', subpage: 'model-answers', title: 'Band 9 Model Answers', isHub: false },
  '/learn/band-descriptors': { path: '/learn/band-descriptors', hub: 'learn', subpage: 'band-descriptors', title: 'Band Descriptors', isHub: false },
  '/learn/diagnostic': { path: '/learn/diagnostic', hub: 'learn', subpage: 'diagnostic', title: 'Diagnostic Test', isHub: false },
  '/learn/study-plan': { path: '/learn/study-plan', hub: 'learn', subpage: 'study-plan', title: '30-Day Study Plan', isHub: false },
  '/learn/bangla-guide': { path: '/learn/bangla-guide', hub: 'learn', subpage: 'bangla-guide', title: 'Bangla IELTS Guide', isHub: false },
  '/learn/beginner-101': { path: '/learn/beginner-101', hub: 'learn', subpage: 'beginner-101', title: 'Beginner 101', isHub: false },
  '/learn/slide-guide': { path: '/learn/slide-guide', hub: 'learn', subpage: 'slide-guide', title: 'Visual Slide Guide', isHub: false },
  '/learn/task1-visualizer': { path: '/learn/task1-visualizer', hub: 'learn', subpage: 'task1-visualizer', title: 'Task 1 Visualizer', isHub: false },
  '/learn/argument-matrix': { path: '/learn/argument-matrix', hub: 'learn', subpage: 'argument-matrix', title: 'Task 2 Argument Matrix', isHub: false },

  // Progress Hub & Subpages
  '/progress': { path: '/progress', hub: 'progress', title: 'Progress Hub', isHub: true },
  '/progress/analytics': { path: '/progress/analytics', hub: 'progress', subpage: 'analytics', title: 'Candidate Analytics', isHub: false },
  '/progress/history': { path: '/progress/history', hub: 'progress', subpage: 'history', title: 'Practice History', isHub: false },
  '/progress/saved': { path: '/progress/saved', hub: 'progress', subpage: 'saved', title: 'Saved Items & Mistake Vault', isHub: false },
  '/progress/mistakes': { path: '/progress/mistakes', hub: 'progress', subpage: 'saved', title: 'Mistake Vault', isHub: false },
  '/progress/calendar': { path: '/progress/calendar', hub: 'progress', subpage: 'calendar', title: 'Sprint Calendar', isHub: false },
  '/progress/admin-analytics': { path: '/progress/admin-analytics', hub: 'progress', subpage: 'admin-analytics', title: 'Operational Analytics', isHub: false },

  // Profile Hub & Subpages
  '/profile': { path: '/profile', hub: 'profile', title: 'Profile Hub', isHub: true },
  '/profile/details': { path: '/profile/details', hub: 'profile', subpage: 'details', title: 'Candidate Profile', isHub: false },
  '/profile/settings': { path: '/profile/settings', hub: 'profile', subpage: 'settings', title: 'App Settings', isHub: false },
  '/profile/subscription': { path: '/profile/subscription', hub: 'profile', subpage: 'subscription', title: 'Subscription & Billing', isHub: false },
  '/profile/help': { path: '/profile/help', hub: 'profile', subpage: 'help', title: 'Help & Support', isHub: false }
};

// Legacy page key map for backwards compatibility with onNavigate('listening') style calls
const LEGACY_PAGE_KEY_MAP: Record<string, string> = {
  'home': '/',
  'practice': '/practice',
  'listening': '/practice/listening',
  'reading': '/practice/reading',
  'writing': '/practice/writing',
  'speaking': '/practice/speaking',
  'mock-tests': '/practice/mock-tests',
  'cdielts': '/practice/mock-tests',
  'question-bank': '/practice/question-bank',
  'sprint': '/practice/sprint',
  'aitools': '/practice/ai-tools',
  'learn': '/learn',
  'daily-sprint': '/learn/daily-sprint',
  'pomodoro': '/learn/daily-sprint',
  'mastery-exam': '/learn/daily-sprint',
  'vocab': '/learn/vocabulary',
  'vocabulary': '/learn/vocabulary',
  'phrases': '/learn/phrases',
  'idioms': '/learn/idioms',
  'collocations': '/learn/collocations',
  'grammar': '/learn/grammar',
  'spelling': '/learn/spelling',
  'shadowing': '/learn/shadowing',
  'model-answers': '/learn/model-answers',
  'band-descriptors': '/learn/band-descriptors',
  'diagnostic': '/learn/diagnostic',
  'study-plan': '/learn/study-plan',
  'bangla-guide': '/learn/bangla-guide',
  'beginner-101': '/learn/beginner-101',
  'slide-guide': '/learn/slide-guide',
  'task1-visualizer': '/learn/task1-visualizer',
  'argument-matrix': '/learn/argument-matrix',
  'progress': '/progress',
  'analytics': '/progress/analytics',
  'history': '/progress/history',
  'saved': '/progress/saved',
  'mistakes': '/progress/saved',
  'vault': '/progress/saved',
  'calendar': '/progress/calendar',
  'admin-analytics': '/progress/admin-analytics',
  'profile': '/profile',
  'details': '/profile/details',
  'settings': '/profile/settings',
  'subscription': '/profile/subscription',
  'help': '/profile/help'
};

export function normalizeRoutePath(raw: string): string {
  if (!raw) return '/';
  const withoutQueryOrHash = raw.split('?')[0].split('#')[0].trim();
  if (!withoutQueryOrHash || withoutQueryOrHash === '/') return '/';
  const cleaned = withoutQueryOrHash.replace(/\/+$/, '');
  return cleaned || '/';
}

export function resolvePath(target: string): string {
  if (!target) return '/';
  const trimmed = target.trim();
  if (trimmed.startsWith('/')) {
    const normalized = normalizeRoutePath(trimmed);
    if (ROUTE_MAP[normalized]) return normalized;
    const strippedKey = normalized.slice(1);
    if (LEGACY_PAGE_KEY_MAP[strippedKey]) return LEGACY_PAGE_KEY_MAP[strippedKey];
    return normalized;
  }
  return LEGACY_PAGE_KEY_MAP[trimmed] || '/';
}

// ---------------------------------------------------------------------------
// Route prefetching (performance)
// ---------------------------------------------------------------------------

type RouteLoader = () => Promise<unknown>;

const ROUTE_PREFETCH_LOADERS: Record<string, RouteLoader> = {
  // Hubs (cheap shells; their heavy children stay on demand)
  '/practice': () => import('../components/pages/PracticePage'),
  '/learn': () => import('../components/pages/LearnPage'),
  '/progress': () => import('../components/pages/ProgressPage'),
  '/profile': () => import('../components/pages/ProfilePage'),
  // Heaviest subpages: exam mode, AI tools (3D), labs, diagnostic + plan
  '/practice/mock-tests': () => import('../components/pages/MockTestPage'),
  '/practice/ai-tools': () => import('../components/pages/AIToolsPage'),
  '/practice/listening': () => import('../components/ListeningLab'),
  '/practice/reading': () => import('../components/ReadingLab'),
  '/practice/writing': () => import('../components/pages/WritingLabPage'),
  '/practice/speaking': () => import('../components/pages/SpeakingLabPage'),
  '/practice/question-bank': () => import('../components/pages/QuestionBankPage'),
  '/practice/sprint': () => import('../components/pages/DailySprintPage'),
  '/learn/daily-sprint': () => import('../components/pages/DailySprintPage'),
  '/learn/diagnostic': () => import('../components/pages/DiagnosticTestPage'),
  '/learn/study-plan': () => import('../components/pages/StudyPlanPage'),
  '/learn/vocabulary': () => import('../components/VocabDeck'),
  '/learn/idioms': () => import('../components/pages/IdiomLabPage')
};

const prefetchedRoutes = new Set<string>();

function prefetchAllowed(): boolean {
  if (typeof navigator === 'undefined') return true;
  const conn = (navigator as unknown as {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  if (!conn) return true;
  if (conn.saveData) return false;
  if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') return false;
  return true;
}

export function prefetchRoute(target: string): void {
  const path = resolvePath(target);
  const loader = ROUTE_PREFETCH_LOADERS[path];
  if (!loader || prefetchedRoutes.has(path)) return;
  if (!prefetchAllowed()) return;
  prefetchedRoutes.add(path);
  loader().catch(() => {
    prefetchedRoutes.delete(path);
  });
}

export function useAppRouter() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return normalizeRoutePath(window.location.pathname || '/');
    }
    return '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(normalizeRoutePath(window.location.pathname || '/'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((target: string, replace = false) => {
    const path = resolvePath(target);
    if (typeof window !== 'undefined') {
      if (replace) {
        window.history.replaceState({}, '', path);
      } else {
        window.history.pushState({}, '', path);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setCurrentPath(path);
  }, []);

  const goBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/');
    }
  }, [navigate]);

  const normalizedCurrent = normalizeRoutePath(currentPath);
  const routeInfo = ROUTE_MAP[normalizedCurrent];
  const isNotFound = !routeInfo && !['/', '/home'].includes(normalizedCurrent);
  const hub: MainDestination = routeInfo ? routeInfo.hub : 'home';

  return {
    currentPath: normalizedCurrent,
    routeInfo,
    hub,
    isNotFound,
    navigate,
    goBack
  };
}
