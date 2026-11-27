import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { MotionConfig, motion, AnimatePresence } from 'framer-motion';
import { UserProfile } from './types';
import { getCurrentUser, saveUser } from './utils/userStorage';
import { getMistakes } from './utils/vaultStorage';
import {
  validateCurrentServerSession,
  storeSessionToken,
  logoutCandidate
} from './services/authService';
import { firebaseSyncService } from './services/firebaseSyncService';

// Router & Common UI
import { useAppRouter } from './router/useAppRouter';
import { Breadcrumbs } from './components/common/Breadcrumbs';
import { NotFoundPage } from './components/common/NotFoundPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { PageLoader } from './components/common/LoadingStates';
import { OfflineStatusIndicator } from './components/common/OfflineStatusIndicator';

// Top-Level Navigation & Layout
import { AppHeader } from './components/navigation/AppHeader';
import { BottomNav } from './components/navigation/BottomNav';
import { DesktopSidebar } from './components/navigation/DesktopSidebar';
import { MobileSidebarDrawer } from './components/navigation/MobileSidebarDrawer';
import { FloatingBarnaby } from './components/FloatingBarnaby';

// Theme Provider
import { ThemeProvider } from './context/ThemeContext';
import { audioManager } from './services/AudioManager';

// Primary Dashboard (Eagerly loaded so initial authenticated view never fails dynamic chunk fetch)
import { HomeDashboard } from './components/HomeDashboard';

function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 2
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await factory();
      } catch (err) {
        lastError = err;
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
        }
      }
    }
    throw lastError;
  });
}

// Lazy-Loaded Pre-Login Landing & Modals (Excluded from Main Initial Chunk)
const PreLoginLanding = lazyWithRetry(() => import('./components/landing/PreLoginLanding').then(m => ({ default: m.PreLoginLanding })));
const ProductionAuthModal = lazyWithRetry(() => import('./components/auth/ProductionAuthModal').then(m => ({ default: m.ProductionAuthModal })));
const GlobalSearchModal = lazyWithRetry(() => import('./components/modals/GlobalSearchModal').then(m => ({ default: m.GlobalSearchModal })));
const MistakeVault = lazyWithRetry(() => import('./components/MistakeVault').then(m => ({ default: m.MistakeVault })));
const BandCalculatorModal = lazyWithRetry(() => import('./components/BandCalculatorModal').then(m => ({ default: m.BandCalculatorModal })));
const AuthModal = lazyWithRetry(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })));
const CommercialShowcaseModal = lazyWithRetry(() => import('./components/commercial/CommercialShowcaseModal').then(m => ({ default: m.CommercialShowcaseModal })));
const TermsAndPrivacyModal = lazyWithRetry(() => import('./components/commercial/TermsAndPrivacyModal').then(m => ({ default: m.TermsAndPrivacyModal })));
const ContactSupportModal = lazyWithRetry(() => import('./components/commercial/ContactSupportModal').then(m => ({ default: m.ContactSupportModal })));
const LaunchSeoGuideModal = lazyWithRetry(() => import('./components/commercial/LaunchSeoGuideModal').then(m => ({ default: m.LaunchSeoGuideModal })));
const PreExamHardwareCheck = lazyWithRetry(() => import('./components/cdielts/PreExamHardwareCheck').then(m => ({ default: m.PreExamHardwareCheck })));
const OnboardingDiagnosticFunnel = lazyWithRetry(() => import('./components/onboarding/OnboardingDiagnosticFunnel').then(m => ({ default: m.OnboardingDiagnosticFunnel })));
const PreAuthOnboardingFunnel = lazyWithRetry(() => import('./components/onboarding/PreAuthOnboardingFunnel').then(m => ({ default: m.PreAuthOnboardingFunnel })));

// Lazy-Loaded Main Hubs & Pages for Maximum Mobile Performance
const PracticePage = lazyWithRetry(() => import('./components/pages/PracticePage').then(m => ({ default: m.PracticePage })));
const LearnPage = lazyWithRetry(() => import('./components/pages/LearnPage').then(m => ({ default: m.LearnPage })));
const ProgressPage = lazyWithRetry(() => import('./components/pages/ProgressPage').then(m => ({ default: m.ProgressPage })));
const ProfilePage = lazyWithRetry(() => import('./components/pages/ProfilePage').then(m => ({ default: m.ProfilePage })));

// Lazy-Loaded Practice Labs & Tools
const ListeningLab = lazyWithRetry(() => import('./components/ListeningLab').then(m => ({ default: m.ListeningLab })));
const ReadingLab = lazyWithRetry(() => import('./components/ReadingLab').then(m => ({ default: m.ReadingLab })));
const SpeakingLabPage = lazyWithRetry(() => import('./components/pages/SpeakingLabPage').then(m => ({ default: m.SpeakingLabPage })));
const WritingLabPage = lazyWithRetry(() => import('./components/pages/WritingLabPage').then(m => ({ default: m.WritingLabPage })));
const MockTestPage = lazyWithRetry(() => import('./components/pages/MockTestPage').then(m => ({ default: m.MockTestPage })));
const QuestionBankPage = lazyWithRetry(() => import('./components/pages/QuestionBankPage').then(m => ({ default: m.QuestionBankPage })));
const AIToolsPage = lazyWithRetry(() => import('./components/pages/AIToolsPage').then(m => ({ default: m.AIToolsPage })));
const DailySprintPage = lazyWithRetry(() => import('./components/pages/DailySprintPage').then(m => ({ default: m.DailySprintPage })));

// Lazy-Loaded Learning Labs & Decks
const VocabDeck = lazyWithRetry(() => import('./components/VocabDeck').then(m => ({ default: m.VocabDeck })));
const UsefulPhrasesPage = lazyWithRetry(() => import('./components/pages/UsefulPhrasesPage').then(m => ({ default: m.UsefulPhrasesPage })));
const IdiomLabPage = lazyWithRetry(() => import('./components/pages/IdiomLabPage').then(m => ({ default: m.IdiomLabPage })));
const CollocationLabPage = lazyWithRetry(() => import('./components/pages/CollocationLabPage').then(m => ({ default: m.CollocationLabPage })));
const GrammarLabPage = lazyWithRetry(() => import('./components/pages/GrammarLabPage').then(m => ({ default: m.GrammarLabPage })));
const SpellingLabPage = lazyWithRetry(() => import('./components/pages/SpellingLabPage').then(m => ({ default: m.SpellingLabPage })));
const SpeakingVaultPage = lazyWithRetry(() => import('./components/pages/SpeakingVaultPage').then(m => ({ default: m.SpeakingVaultPage })));
const ModelAnswersPage = lazyWithRetry(() => import('./components/pages/ModelAnswersPage').then(m => ({ default: m.ModelAnswersPage })));
const BandDescriptorsPage = lazyWithRetry(() => import('./components/pages/BandDescriptorsPage').then(m => ({ default: m.BandDescriptorsPage })));
const StudyPlanPage = lazyWithRetry(() => import('./components/pages/StudyPlanPage').then(m => ({ default: m.StudyPlanPage })));
const DiagnosticTestPage = lazyWithRetry(() => import('./components/pages/DiagnosticTestPage').then(m => ({ default: m.DiagnosticTestPage })));
const BanglaIELTSGuide = lazyWithRetry(() => import('./components/BanglaIELTSGuide').then(m => ({ default: m.BanglaIELTSGuide })));
const Beginner101 = lazyWithRetry(() => import('./components/Beginner101').then(m => ({ default: m.Beginner101 })));
const SlideGuide = lazyWithRetry(() => import('./components/SlideGuide').then(m => ({ default: m.SlideGuide })));
const Task1Visualizer = lazyWithRetry(() => import('./components/Task1Visualizer').then(m => ({ default: m.Task1Visualizer })));
const ArgumentMatrix = lazyWithRetry(() => import('./components/ArgumentMatrix').then(m => ({ default: m.ArgumentMatrix })));

// Lazy-Loaded Progress Subpages
const CandidateAnalyticsPage = lazyWithRetry(() => import('./components/pages/CandidateAnalyticsPage').then(m => ({ default: m.CandidateAnalyticsPage })));
const QuestionHistoryPage = lazyWithRetry(() => import('./components/pages/QuestionHistoryPage').then(m => ({ default: m.QuestionHistoryPage })));
const SprintCalendarPage = lazyWithRetry(() => import('./components/pages/SprintCalendarPage').then(m => ({ default: m.SprintCalendarPage })));
const AdminAnalyticsPage = lazyWithRetry(() => import('./components/pages/AdminAnalyticsPage').then(m => ({ default: m.AdminAnalyticsPage })));

function AppContent() {
  const { currentPath, routeInfo, hub, isNotFound, navigate, goBack } = useAppRouter();
  const [user, setUser] = useState<UserProfile | null>(() => getCurrentUser());
  const [mistakeCount, setMistakeCount] = useState<number>(() => {
    try {
      return getMistakes().filter((m) => !m.mastered).length;
    } catch {
      return 0;
    }
  });
  const [examMode, setExamMode] = useState<'Academic' | 'General Training'>('Academic');
  const [isDashboardLoading, setIsDashboardLoading] = useState<boolean>(true);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setTimeout(() => {
      setToastMessage(msg);
    }, 0);
  }, []);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3200);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const [isGoogleAuthOpen, setIsGoogleAuthOpen] = useState(false);
  const [isPreAuthSurveyOpen, setIsPreAuthSurveyOpen] = useState(false);
  const [authModalInitialMode, setAuthModalInitialMode] = useState<'signin' | 'register'>('signin');
  const [pendingPostAuthRoute, setPendingPostAuthRoute] = useState<string | null>(null);

  // Modal States
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isBandModalOpen, setIsBandModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isHardwareCheckOpen, setIsHardwareCheckOpen] = useState(false);
  const [preflightModule, setPreflightModule] = useState<'reading' | 'listening' | 'speaking' | 'full_mock'>('listening');

  // Commercial & Legal Modal States
  const [isShowcaseOpen, setIsShowcaseOpen] = useState(false);
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'terms' | 'privacy'>('terms');
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isSeoGuideOpen, setIsSeoGuideOpen] = useState(false);

  const isLoggedIn = Boolean(user && user.id && user.id !== 'default_candidate');

  const handleSignOut = useCallback(async () => {
    try {
      await firebaseSyncService.signOut();
    } catch {}
    try {
      await logoutCandidate();
    } catch {}
    try {
      localStorage.removeItem('ielts_auth_session');
      localStorage.removeItem('ielts_active_user_id_v1');
      localStorage.removeItem('ielts_session_token_v2');
      localStorage.removeItem('ielts_user_subscription_v2');
      localStorage.removeItem('bandsprint_onboarding_survey_v1');
      localStorage.removeItem('bandsprint_exam_setup_v1');
      localStorage.removeItem('bandsprint_diagnostic_result_v1');
      localStorage.removeItem('ielts_voice_examiner_session_v1');
    } catch {}
    setPendingPostAuthRoute(null);
    setIsGoogleAuthOpen(false);
    setIsPreAuthSurveyOpen(false);
    setUser(null);
    navigate('/');
    showToast('Signed out successfully.');
  }, [navigate, showToast]);

  useEffect(() => {
    const handleSignOutEvent = () => {
      handleSignOut();
    };
    window.addEventListener('sign_out_candidate', handleSignOutEvent);
    return () => window.removeEventListener('sign_out_candidate', handleSignOutEvent);
  }, [handleSignOut]);

  // Sync canonical document title
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'BandSprint — AI IELTS Preparation';
    }
  }, []);

  // Sync session on startup
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSessionToken = params.get('sessionToken');
    const urlAuthError = params.get('authError');

    if (urlAuthError) {
      showToast(urlAuthError);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (urlSessionToken) {
      storeSessionToken(urlSessionToken);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    let active = true;
    const bootSafetyTimer = window.setTimeout(() => {
      if (active) setIsDashboardLoading(false);
    }, 450);

    validateCurrentServerSession()
      .then((res) => {
        const cachedUser = getCurrentUser();
        if (res.success && res.user) {
          // Merge with local cached user progress to ensure no exam records or streaks are lost
          const mergedUser = cachedUser && cachedUser.progress && cachedUser.progress.examHistory && cachedUser.progress.examHistory.length > (res.user.progress?.examHistory?.length || 0)
            ? {
                ...res.user,
                progress: {
                  ...res.user.progress,
                  examHistory: cachedUser.progress.examHistory,
                  streakDays: Math.max(res.user.progress?.streakDays || 1, cachedUser.progress.streakDays || 1)
                }
              }
            : res.user;
          setUser((prev) => {
            if (
              prev &&
              prev.id === mergedUser.id &&
              prev.email === mergedUser.email &&
              prev.name === mergedUser.name &&
              prev.progress?.streakDays === mergedUser.progress?.streakDays &&
              (prev.progress?.examHistory?.length || 0) === (mergedUser.progress?.examHistory?.length || 0)
            ) {
              return prev;
            }
            return mergedUser;
          });
          saveUser(mergedUser);
        } else {
          // If server validation fails (e.g., server restart), preserve local cached user instead of logging out or wiping progress!
          if (cachedUser && cachedUser.id && cachedUser.id !== 'default_candidate') {
            setUser((prev) => (prev && prev.id === cachedUser.id ? prev : cachedUser));
          } else {
            setUser((prev) => (prev === null ? prev : null));
          }
        }
      })
      .finally(() => {
        window.clearTimeout(bootSafetyTimer);
        if (active) setIsDashboardLoading(false);
      });

    return () => {
      active = false;
      window.clearTimeout(bootSafetyTimer);
    };
  }, [showToast]);

  // Stop audio and reset scroll position on path or pre-auth overlay change
  useEffect(() => {
    audioManager.killAllAudio();
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [currentPath]);

  useEffect(() => {
    if (isPreAuthSurveyOpen || isGoogleAuthOpen) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [isPreAuthSurveyOpen, isGoogleAuthOpen]);

  useEffect(() => {
    const handleOpenLegalEvent = (e: Event) => {
      const detail = (e as CustomEvent<'terms' | 'privacy'>).detail;
      setLegalTab(detail === 'privacy' ? 'privacy' : 'terms');
      setIsLegalOpen(true);
    };
    const handleOpenContactEvent = () => {
      setIsContactOpen(true);
    };
    window.addEventListener('open_legal_modal', handleOpenLegalEvent);
    window.addEventListener('open_contact_modal', handleOpenContactEvent);
    return () => {
      window.removeEventListener('open_legal_modal', handleOpenLegalEvent);
      window.removeEventListener('open_contact_modal', handleOpenContactEvent);
    };
  }, []);

  // Sync user and mistakes (single consolidated listener for auth/progress/vault events)
  const syncUserData = useCallback(() => {
    const activeUser = getCurrentUser();
    if (activeUser && activeUser.id && activeUser.id !== 'default_candidate') {
      setUser((prev) => {
        if (
          !prev ||
          prev.id !== activeUser.id ||
          prev.email !== activeUser.email ||
          prev.name !== activeUser.name ||
          prev.progress?.streakDays !== activeUser.progress?.streakDays ||
          (prev.progress?.examHistory?.length || 0) !== (activeUser.progress?.examHistory?.length || 0)
        ) {
          return { ...activeUser };
        }
        return prev;
      });
    } else {
      setUser((prev) => (prev === null ? prev : null));
    }
    const nextCount = getMistakes().filter((m) => !m.mastered).length;
    setMistakeCount((prev) => (prev === nextCount ? prev : nextCount));
  }, []);

  useEffect(() => {
    const handleVault = () => {
      const nextCount = getMistakes().filter((m) => !m.mastered).length;
      setMistakeCount((prev) => (prev === nextCount ? prev : nextCount));
    };

    window.addEventListener('user_auth_updated', syncUserData);
    window.addEventListener('user_progress_updated', syncUserData);
    window.addEventListener('vault_updated', handleVault);
    window.addEventListener('ielts_mistakes_updated', handleVault);

    const handleOpenVaultModal = () => setIsVaultOpen(true);
    const handleOpenBandModal = () => setIsBandModalOpen(true);
    const handleOpenAiTutor = () => navigate('/practice/ai-tools');
    const handleOpenPremiumModal = () => {
      showToast('Free tier: 5 full mocks, 2 AI Speaking + 1 AI Writing every day — no card needed.');
    };

    const handleOpenShowcase = () => setIsShowcaseOpen(true);
    const handleOpenLegal = (e: any) => {
      setLegalTab(e?.detail?.tab || 'terms');
      setIsLegalOpen(true);
    };
    const handleOpenContact = () => setIsContactOpen(true);
    const handleOpenSeoGuide = () => setIsSeoGuideOpen(true);
    const handleOpenOnboarding = () => setIsOnboardingOpen(true);
    const handleOpenCdIeltsPreflight = (e: any) => {
      if (e?.detail?.module) setPreflightModule(e.detail.module);
      setIsHardwareCheckOpen(true);
    };

    window.addEventListener('open_vault_modal', handleOpenVaultModal);
    window.addEventListener('open_band_modal', handleOpenBandModal);
    window.addEventListener('open_ai_tutor', handleOpenAiTutor);
    window.addEventListener('open_premium_modal', handleOpenPremiumModal);
    window.addEventListener('open_subscription_modal', handleOpenPremiumModal);
    window.addEventListener('open_commercial_showcase', handleOpenShowcase);
    window.addEventListener('open_legal_modal', handleOpenLegal);
    window.addEventListener('open_contact_modal', handleOpenContact);
    window.addEventListener('open_seo_guide', handleOpenSeoGuide);
    window.addEventListener('open_onboarding_diagnostic', handleOpenOnboarding);
    window.addEventListener('open_cdielts_preflight', handleOpenCdIeltsPreflight);

    return () => {
      window.removeEventListener('user_auth_updated', syncUserData);
      window.removeEventListener('user_progress_updated', syncUserData);
      window.removeEventListener('vault_updated', handleVault);
      window.removeEventListener('ielts_mistakes_updated', handleVault);
      window.removeEventListener('open_vault_modal', handleOpenVaultModal);
      window.removeEventListener('open_band_modal', handleOpenBandModal);
      window.removeEventListener('open_ai_tutor', handleOpenAiTutor);
      window.removeEventListener('open_premium_modal', handleOpenPremiumModal);
      window.removeEventListener('open_subscription_modal', handleOpenPremiumModal);
      window.removeEventListener('open_commercial_showcase', handleOpenShowcase);
      window.removeEventListener('open_legal_modal', handleOpenLegal);
      window.removeEventListener('open_contact_modal', handleOpenContact);
      window.removeEventListener('open_seo_guide', handleOpenSeoGuide);
      window.removeEventListener('open_onboarding_diagnostic', handleOpenOnboarding);
      window.removeEventListener('open_cdielts_preflight', handleOpenCdIeltsPreflight);
    };
  }, [syncUserData, navigate, showToast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isDirectLoginRoute = currentPath === '/login' || currentPath === '/signin';
  const isDirectSignupRoute = currentPath === '/signup' || currentPath === '/register';

  // Redirect already-authenticated users away from auth URLs instead of showing 404
  useEffect(() => {
    if (isLoggedIn && (isDirectLoginRoute || isDirectSignupRoute)) {
      navigate('/', true);
    }
  }, [isLoggedIn, isDirectLoginRoute, isDirectSignupRoute, navigate]);

  if (!isLoggedIn) {
    const showAuthPage = isGoogleAuthOpen || isDirectLoginRoute || isDirectSignupRoute;
    const effectiveAuthMode: 'signin' | 'register' = isGoogleAuthOpen
      ? authModalInitialMode
      : isDirectSignupRoute
      ? 'register'
      : 'signin';

    return (
      <div className="min-h-screen bg-[#F7F9F8] text-[#0E1F1E] font-sans selection:bg-[#0F4C45] selection:text-white">
        <ErrorBoundary label="landing page">
          <Suspense fallback={<PageLoader label="Loading BandSprint…" />}>
            <PreLoginLanding
              onOpenGoogleAuth={(mode = 'signin', targetRoute?: string) => {
                setAuthModalInitialMode(mode);
                setPendingPostAuthRoute(targetRoute || '/');
                setIsPreAuthSurveyOpen(false);
                setIsGoogleAuthOpen(true);
              }}
              onStartOnboardingSurvey={(targetRoute?: string) => {
                setPendingPostAuthRoute(targetRoute || '/');
                setIsGoogleAuthOpen(false);
                setIsPreAuthSurveyOpen(true);
              }}
              onPreviewExamRoom={() => {
                setAuthModalInitialMode('register');
                setPendingPostAuthRoute('/practice/mock-tests');
                setIsPreAuthSurveyOpen(false);
                setIsGoogleAuthOpen(true);
                showToast('Sign in or create your free account to open the timed exam simulator.');
              }}
              onShowToast={showToast}
              onOpenLegal={(tab) => {
                setLegalTab(tab);
                setIsLegalOpen(true);
              }}
              onOpenContact={() => setIsContactOpen(true)}
            />
          </Suspense>
        </ErrorBoundary>
        {isPreAuthSurveyOpen && (
          <Suspense fallback={<div className="fixed inset-0 z-50 bg-[#F7F9F8]" />}>
            <PreAuthOnboardingFunnel
              isOpen={isPreAuthSurveyOpen}
              onClose={() => setIsPreAuthSurveyOpen(false)}
              onSkipToLogin={() => {
                setIsPreAuthSurveyOpen(false);
                setAuthModalInitialMode('signin');
                setIsGoogleAuthOpen(true);
              }}
              onCompleteToAuth={(mode) => {
                setIsPreAuthSurveyOpen(false);
                setAuthModalInitialMode(mode);
                setIsGoogleAuthOpen(true);
              }}
            />
          </Suspense>
        )}
        {showAuthPage && !isPreAuthSurveyOpen && (
          <Suspense fallback={<div className="fixed inset-0 z-50 bg-[#F7F9F8]" />}>
            <ProductionAuthModal
              isOpen={showAuthPage}
              initialMode={effectiveAuthMode}
              onOpenOnboardingSurvey={() => {
                setIsGoogleAuthOpen(false);
                setIsPreAuthSurveyOpen(true);
              }}
              onClose={() => {
                setIsGoogleAuthOpen(false);
                if (isDirectLoginRoute || isDirectSignupRoute) {
                  navigate('/');
                }
              }}
              onShowToast={showToast}
              onSuccess={() => {
                const active = getCurrentUser();
                setUser(active);
                const destination =
                  pendingPostAuthRoute &&
                  pendingPostAuthRoute !== '/login' &&
                  pendingPostAuthRoute !== '/signup'
                    ? pendingPostAuthRoute
                    : '/';
                setPendingPostAuthRoute(null);
                navigate(destination);
              }}
            />
          </Suspense>
        )}
        {isLegalOpen && (
          <Suspense fallback={null}>
            <TermsAndPrivacyModal
              isOpen={isLegalOpen}
              onClose={() => setIsLegalOpen(false)}
              initialTab={legalTab}
            />
          </Suspense>
        )}
        {isContactOpen && (
          <Suspense fallback={null}>
            <ContactSupportModal
              isOpen={isContactOpen}
              onClose={() => setIsContactOpen(false)}
              onShowToast={showToast}
            />
          </Suspense>
        )}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#0E1F1E] text-white border border-[#1F8A70]/40 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 text-xs font-semibold">
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    );
  }

  // Render Breadcrumb Items for inner pages
  const breadcrumbItems = routeInfo && !routeInfo.isHub ? [
    { label: routeInfo.hub.charAt(0).toUpperCase() + routeInfo.hub.slice(1), path: `/${routeInfo.hub}` },
    { label: routeInfo.title }
  ] : [];

  const renderActiveRoute = () => {
    if (isNotFound) {
      return (
        <NotFoundPage
          onNavigateHome={() => navigate('/')}
          onGoBack={goBack}
          currentPath={currentPath}
        />
      );
    }

    switch (currentPath) {
      // Home
      case '/':
      case '/home':
        return (
          <HomeDashboard
            user={user}
            onNavigate={navigate}
            onShowToast={showToast}
            onOpenBandModal={() => setIsBandModalOpen(true)}
            examMode={examMode}
          />
        );

      // Practice Hub & Subpages
      case '/practice':
        return <PracticePage onNavigate={navigate} onShowToast={showToast} />;
      case '/practice/listening':
        return <ListeningLab onShowToast={showToast} onBack={goBack} />;
      case '/practice/reading':
        return <ReadingLab onShowToast={showToast} onBack={goBack} />;
      case '/practice/writing':
        return (
          <WritingLabPage
            onBack={goBack}
            onShowToast={showToast}
            onTransferToMock={() => navigate('/practice/writing')}
          />
        );
      case '/practice/speaking':
        return (
          <SpeakingLabPage
            onBack={goBack}
            onGradeInMock={() => navigate('/practice/writing')}
            onShowToast={showToast}
            onNavigateToVault={() => setIsVaultOpen(true)}
          />
        );
      case '/practice/mock-tests':
        return <MockTestPage user={user || getCurrentUser()} onNavigate={navigate} onShowToast={showToast} onOpenBandModal={() => setIsBandModalOpen(true)} />;
      case '/practice/question-bank':
        return <QuestionBankPage onBack={goBack} onShowToast={showToast} />;
      case '/practice/sprint':
        return <DailySprintPage user={user} onNavigate={navigate} onShowToast={showToast} />;
      case '/practice/ai-tools':
        return <AIToolsPage onNavigate={navigate} onShowToast={showToast} />;

      // Learn Hub & Subpages
      case '/learn':
        return <LearnPage onNavigate={navigate} onShowToast={showToast} />;
      case '/learn/daily-sprint':
        return <DailySprintPage user={user} onNavigate={navigate} onShowToast={showToast} />;
      case '/learn/vocabulary':
        return <VocabDeck onShowToast={showToast} />;
      case '/learn/phrases':
        return <UsefulPhrasesPage onBack={goBack} onShowToast={showToast} />;
      case '/learn/idioms':
        return <IdiomLabPage onBack={goBack} onShowToast={showToast} />;
      case '/learn/collocations':
        return <CollocationLabPage onBack={goBack} onShowToast={showToast} />;
      case '/learn/grammar':
        return <GrammarLabPage onBack={goBack} onShowToast={showToast} />;
      case '/learn/spelling':
        return <SpellingLabPage onBack={goBack} onShowToast={showToast} />;
      case '/learn/shadowing':
        return <SpeakingVaultPage onBack={goBack} onShowToast={showToast} />;
      case '/learn/model-answers':
        return <ModelAnswersPage onBack={goBack} onShowToast={showToast} />;
      case '/learn/band-descriptors':
        return <BandDescriptorsPage onBack={goBack} onShowToast={showToast} />;
      case '/learn/diagnostic':
        return <DiagnosticTestPage onBack={goBack} onNavigate={navigate} onShowToast={showToast} />;
      case '/learn/study-plan':
        return <StudyPlanPage onBack={goBack} onNavigateToModule={(m) => navigate(`/practice/${m}`)} onShowToast={showToast} onOpenDiagnostic={() => navigate('/learn/diagnostic')} />;
      case '/learn/bangla-guide':
        return <BanglaIELTSGuide onNavigateToModule={(m) => navigate(`/practice/${m}`)} onShowToast={showToast} />;
      case '/learn/beginner-101':
        return <Beginner101 onNavigate={(m) => navigate(`/practice/${m}`)} />;
      case '/learn/slide-guide':
        return <SlideGuide onNavigate={(m) => navigate(`/practice/${m}`)} />;
      case '/learn/task1-visualizer':
        return <Task1Visualizer onShowToast={showToast} />;
      case '/learn/argument-matrix':
        return <ArgumentMatrix onTransferToMock={() => navigate('/practice/writing')} onShowToast={showToast} />;

      // Progress Hub & Subpages
      case '/progress':
        return (
          <ProgressPage
            onNavigate={navigate}
            onShowToast={showToast}
            onOpenBandModal={() => setIsBandModalOpen(true)}
            onOpenVault={() => setIsVaultOpen(true)}
            user={user}
            mistakeCount={mistakeCount}
          />
        );
      case '/progress/analytics':
        return <CandidateAnalyticsPage user={user} onNavigate={navigate} onShowToast={showToast} />;
      case '/progress/history':
        return <QuestionHistoryPage onBack={goBack} onNavigate={navigate} onShowToast={showToast} />;
      case '/progress/saved':
      case '/progress/mistakes':
        return (
          <ProgressPage
            onNavigate={navigate}
            onShowToast={showToast}
            onOpenBandModal={() => setIsBandModalOpen(true)}
            onOpenVault={() => setIsVaultOpen(true)}
            user={user}
            mistakeCount={mistakeCount}
          />
        );
      case '/progress/calendar':
        return <SprintCalendarPage onNavigate={navigate} onShowToast={showToast} />;
      case '/progress/admin-analytics':
        return <AdminAnalyticsPage user={user} onNavigate={navigate} onShowToast={showToast} initialSection="telemetry" />;

      // Profile Hub & Subpages
      case '/profile':
        return (
          <ProfilePage
            user={user}
            mistakeCount={mistakeCount}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onOpenBandModal={() => setIsBandModalOpen(true)}
            onOpenVault={() => setIsVaultOpen(true)}
            onNavigate={navigate}
            onShowToast={showToast}
            onLogout={handleSignOut}
          />
        );
      case '/profile/details':
        return (
          <ProfilePage
            subpage="details"
            user={user}
            mistakeCount={mistakeCount}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onOpenBandModal={() => setIsBandModalOpen(true)}
            onOpenVault={() => setIsVaultOpen(true)}
            onNavigate={navigate}
            onShowToast={showToast}
            onLogout={handleSignOut}
          />
        );
      case '/profile/settings':
        return (
          <ProfilePage
            subpage="settings"
            user={user}
            mistakeCount={mistakeCount}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onOpenBandModal={() => setIsBandModalOpen(true)}
            onOpenVault={() => setIsVaultOpen(true)}
            onNavigate={navigate}
            onShowToast={showToast}
            onLogout={handleSignOut}
          />
        );
      case '/profile/subscription':
        return (
          <ProfilePage
            subpage="subscription"
            user={user}
            mistakeCount={mistakeCount}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onOpenBandModal={() => setIsBandModalOpen(true)}
            onOpenVault={() => setIsVaultOpen(true)}
            onNavigate={navigate}
            onShowToast={showToast}
            onLogout={handleSignOut}
          />
        );
      case '/profile/help':
        return (
          <ProfilePage
            subpage="help"
            user={user}
            mistakeCount={mistakeCount}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onOpenBandModal={() => setIsBandModalOpen(true)}
            onOpenVault={() => setIsVaultOpen(true)}
            onNavigate={navigate}
            onShowToast={showToast}
            onLogout={handleSignOut}
          />
        );

      default:
        return (
          <NotFoundPage
            onNavigateHome={() => navigate('/')}
            onGoBack={goBack}
            currentPath={currentPath}
          />
        );
    }
  };

  const canGoBack = currentPath !== '/' && currentPath !== '/home';

  return (
    <>
      <div className="min-h-screen bg-[#F7F9F8] dark:bg-[#0B1514] text-[#0E1F1E] dark:text-[#EEF3F1] flex flex-col md:flex-row font-sans selection:bg-[#0F4C45] selection:text-white transition-colors">
      {/* 1. Desktop Sidebar */}
      <DesktopSidebar
        activeHub={hub}
        currentPath={currentPath}
        onNavigate={navigate}
        mistakeCount={mistakeCount}
        onOpenVault={() => setIsVaultOpen(true)}
        onOpenBandModal={() => setIsBandModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Mobile Drawer */}
      <MobileSidebarDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        currentPage={currentPath}
        onNavigate={navigate}
        mistakeCount={mistakeCount}
        onOpenVault={() => setIsVaultOpen(true)}
        onOpenBandModal={() => setIsBandModalOpen(true)}
        user={user}
        examMode={examMode}
        onExamModeChange={setExamMode}
        onSignOut={handleSignOut}
      />

      {/* Main Viewport Workspace (offset on desktop for fixed rock-steady sidebar) */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen md:pl-64 lg:pl-72 pb-20 md:pb-8">
        {/* App Header */}
        <AppHeader
          currentPage={currentPath}
          onNavigate={navigate}
          onBack={goBack}
          canGoBack={canGoBack}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenVault={() => setIsVaultOpen(true)}
          onOpenProfile={() => navigate('/profile')}
          onSignOut={handleSignOut}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          mistakeCount={mistakeCount}
          user={user}
          examMode={examMode}
          onExamModeChange={setExamMode}
        />

        {/* Content Container */}
        <main className="flex-1 px-3 sm:px-6 pt-4 sm:pt-6">
          {/* Breadcrumb Navigation on Inner Pages */}
          {breadcrumbItems.length > 0 && (
            <div className="max-w-5xl mx-auto">
              <Breadcrumbs
                items={breadcrumbItems}
                onNavigate={navigate}
                onBack={goBack}
              />
            </div>
          )}

          {/* Lazy-Loaded Route Content with crisp editorial transition */}
          <ErrorBoundary key={currentPath} label="this page">
            <Suspense fallback={<PageLoader />}>
              <motion.div
                key={currentPath}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                {renderActiveRoute()}
              </motion.div>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      {/* 2. Mobile Bottom Navigation (Hidden during active full-screen IELTS exams) */}
      {!['/practice/listening', '/practice/reading', '/practice/writing', '/practice/speaking'].includes(currentPath) && (
        <BottomNav
          activeHub={hub}
          onNavigate={navigate}
          mistakeCount={mistakeCount}
        />
      )}

      {/* Conditionally Mounted & Lazy-Loaded Modals */}
      {isSearchOpen && (
        <Suspense fallback={null}>
          <GlobalSearchModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            onNavigate={navigate}
          />
        </Suspense>
      )}

      {isVaultOpen && (
        <Suspense fallback={null}>
          <MistakeVault
            isOpen={isVaultOpen}
            onClose={() => setIsVaultOpen(false)}
            onShowToast={showToast}
          />
        </Suspense>
      )}

      {isBandModalOpen && (
        <Suspense fallback={null}>
          <BandCalculatorModal
            isOpen={isBandModalOpen}
            onClose={() => setIsBandModalOpen(false)}
          />
        </Suspense>
      )}

      {isAuthModalOpen && (
        <Suspense fallback={null}>
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onShowToast={showToast}
          />
        </Suspense>
      )}

      {isShowcaseOpen && (
        <Suspense fallback={null}>
          <CommercialShowcaseModal
            isOpen={isShowcaseOpen}
            onClose={() => setIsShowcaseOpen(false)}
            onNavigateToPractice={() => navigate('/practice')}
          />
        </Suspense>
      )}

      {isLegalOpen && (
        <Suspense fallback={null}>
          <TermsAndPrivacyModal
            isOpen={isLegalOpen}
            onClose={() => setIsLegalOpen(false)}
            initialTab={legalTab}
          />
        </Suspense>
      )}

      {isContactOpen && (
        <Suspense fallback={null}>
          <ContactSupportModal
            isOpen={isContactOpen}
            onClose={() => setIsContactOpen(false)}
            onShowToast={showToast}
          />
        </Suspense>
      )}

      {isSeoGuideOpen && (
        <Suspense fallback={null}>
          <LaunchSeoGuideModal
            isOpen={isSeoGuideOpen}
            onClose={() => setIsSeoGuideOpen(false)}
            onShowToast={showToast}
          />
        </Suspense>
      )}

      {isOnboardingOpen && (
        <Suspense fallback={null}>
          <OnboardingDiagnosticFunnel
            isOpen={isOnboardingOpen}
            onClose={() => setIsOnboardingOpen(false)}
            onCompleted={(profile) => {
              setUser(profile);
              setIsOnboardingOpen(false);
              showToast('Onboarding complete! Target calibration updated.');
            }}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        </Suspense>
      )}

      {isHardwareCheckOpen && (
        <Suspense fallback={null}>
          <PreExamHardwareCheck
            isOpen={isHardwareCheckOpen}
            onClose={() => setIsHardwareCheckOpen(false)}
            onProceedToExam={() => {
              setIsHardwareCheckOpen(false);
              navigate('/practice/mock-tests');
            }}
            moduleType={preflightModule as any}
          />
        </Suspense>
      )}

      {/* Toast Notification Container */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            key={toastMessage}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.7 }}
            className="fixed bottom-20 md:bottom-6 right-6 z-50 bg-[#0F4C45] dark:bg-[#EEF3F1] text-white dark:text-[#0E1F1E] border border-[#1F8A70]/60 dark:border-[#D3DDDA] px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold select-none max-w-sm"
          >
            <span className="w-2 h-2 rounded-full bg-[#F4A62A] shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline / Reconnected Study Pack Indicator */}
      <OfflineStatusIndicator />
      </div>

      {/* Root-Level Persistent Draggable Floating 3D Barnaby Companion (Auto-unmounts in timed exams) */}
      <FloatingBarnaby
        currentPath={currentPath}
        user={user}
        examMode={examMode}
        onNavigate={navigate}
        isLoading={isDashboardLoading}
      />
    </>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <ErrorBoundary label="BandSprint">
          <AppContent />
        </ErrorBoundary>
      </ThemeProvider>
    </MotionConfig>
  );
}
