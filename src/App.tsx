import React, { useState, useEffect, useCallback } from 'react';
import { 
  Download, Volume2, Play, Pause, RotateCcw, Sparkles, Mic, FileText, 
  BookOpen, CheckCircle, Award, Compass, MessageSquare, Globe, ArrowRight,
  ShieldCheck, AlertCircle, RefreshCw, X, ChevronRight
} from 'lucide-react';
import { UserProfile } from './types';
import { getCurrentUser, createDefaultProgress, switchActiveUser, saveUser } from './utils/userStorage';
import { getMistakes } from './utils/vaultStorage';
import { PreLoginLanding } from './components/landing/PreLoginLanding';
import { ProductionAuthModal } from './components/auth/ProductionAuthModal';

// Top-Level Navigation & Layout
import { AppHeader } from './components/navigation/AppHeader';
import { BottomNav, BottomNavTab } from './components/navigation/BottomNav';
import { DesktopSidebar } from './components/navigation/DesktopSidebar';
import { MobileSidebarDrawer } from './components/navigation/MobileSidebarDrawer';

// Main Dashboard & Labs
import { HomeDashboard } from './components/HomeDashboard';
import { ListeningLab } from './components/ListeningLab';
import { ReadingLab } from './components/ReadingLab';
import { LiveMockTest } from './components/LiveMockTest';
import { VocabDeck } from './components/VocabDeck';
import { BanglaIELTSGuide } from './components/BanglaIELTSGuide';
import { Beginner101 } from './components/Beginner101';
import { SlideGuide } from './components/SlideGuide';
import { Task1Visualizer } from './components/Task1Visualizer';
import { ArgumentMatrix } from './components/ArgumentMatrix';

// Pages
import { PracticePage } from './components/pages/PracticePage';
import { SpeakingLabPage } from './components/pages/SpeakingLabPage';
import { WritingLabPage } from './components/pages/WritingLabPage';
import { AIToolsPage } from './components/pages/AIToolsPage';
import { LearnPage } from './components/pages/LearnPage';
import { ProgressPage } from './components/pages/ProgressPage';
import { ProfilePage } from './components/pages/ProfilePage';
import { MockTestPage } from './components/pages/MockTestPage';
import { CDIELTSExamMode } from './components/cdielts/CDIELTSExamMode';
import { CDIELTSSpeakingSuite } from './components/cdielts/CDIELTSSpeakingSuite';
import { PreExamHardwareCheck } from './components/cdielts/PreExamHardwareCheck';
import { OnboardingDiagnosticFunnel } from './components/onboarding/OnboardingDiagnosticFunnel';
import { UsefulPhrasesPage } from './components/pages/UsefulPhrasesPage';
import { IdiomLabPage } from './components/pages/IdiomLabPage';
import { C1IdiomsPage } from './components/pages/C1IdiomsPage';
import { GrammarLabPage } from './components/pages/GrammarLabPage';
import { ModelAnswersPage } from './components/pages/ModelAnswersPage';
import { SpellingLabPage } from './components/pages/SpellingLabPage';
import { CollocationLabPage } from './components/pages/CollocationLabPage';
import { StudyPlanPage } from './components/pages/StudyPlanPage';
import { BandDescriptorsPage } from './components/pages/BandDescriptorsPage';
import { QuestionBankPage } from './components/pages/QuestionBankPage';
import { QuestionHistoryPage } from './components/pages/QuestionHistoryPage';
import { SpeakingVaultPage } from './components/pages/SpeakingVaultPage';
import { SpeedReadingPage } from './components/pages/SpeedReadingPage';
import { SprintCalendarPage } from './components/pages/SprintCalendarPage';
import { CambridgeLibraryPage } from './components/cambridge/CambridgeLibraryPage';
import { ContextualAITutor } from './components/common/ContextualAITutor';
import { OfflineStatusIndicator } from './components/common/OfflineStatusIndicator';
import { audioManager } from './services/AudioManager';

// Modals
import { GlobalSearchModal } from './components/modals/GlobalSearchModal';
import { MistakeVault } from './components/MistakeVault';
import { BandCalculatorModal } from './components/BandCalculatorModal';
import { AuthModal } from './components/AuthModal';
import { CommercialShowcaseModal } from './components/commercial/CommercialShowcaseModal';
import { TermsAndPrivacyModal } from './components/commercial/TermsAndPrivacyModal';
import { ContactSupportModal } from './components/commercial/ContactSupportModal';
import { LaunchSeoGuideModal } from './components/commercial/LaunchSeoGuideModal';

// Theme Provider
import { ThemeProvider } from './context/ThemeContext';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [navHistory, setNavHistory] = useState<string[]>(['home']);
  const [user, setUser] = useState<UserProfile | null>(() => getCurrentUser());
  const [mistakeCount, setMistakeCount] = useState<number>(0);
  const [examMode, setExamMode] = useState<'Academic' | 'General Training'>('Academic');

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Toast Notification Handler
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3200);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const [isGoogleAuthOpen, setIsGoogleAuthOpen] = useState(false);
  const isLoggedIn = !!user || !!localStorage.getItem('ielts_auth_session');

  const handleSignOut = useCallback(() => {
    try {
      localStorage.removeItem('ielts_auth_session');
      localStorage.removeItem('ielts_active_user_id_v1');
    } catch {}
    setUser(null);
    showToast('Signed out successfully. Returning to pre-login welcome.');
  }, [showToast]);

  useEffect(() => {
    const handleSignOutEvent = () => handleSignOut();
    window.addEventListener('sign_out_candidate', handleSignOutEvent);
    return () => window.removeEventListener('sign_out_candidate', handleSignOutEvent);
  }, [handleSignOut]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500 selection:text-white">
        <PreLoginLanding
          onOpenGoogleAuth={() => setIsGoogleAuthOpen(true)}
          onPreviewExamRoom={() => {
            setIsGoogleAuthOpen(true);
            showToast('Please authenticate with Google and link your mobile number to access the exam room preview.');
          }}
          onShowToast={showToast}
        />
        <ProductionAuthModal
          isOpen={isGoogleAuthOpen}
          onClose={() => setIsGoogleAuthOpen(false)}
          onShowToast={showToast}
          onSuccess={() => {
            const active = getCurrentUser();
            setUser(active);
          }}
        />
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white border border-slate-700 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-semibold">
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    );
  }

  // Modal States
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isBandModalOpen, setIsBandModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isHardwareCheckOpen, setIsHardwareCheckOpen] = useState(false);
  const [preflightModule, setPreflightModule] = useState<'reading' | 'listening' | 'speaking' | 'full_mock'>('listening');

  // Commercial & Legal Modal States (Subscription option paused for 1 month)
  const [isShowcaseOpen, setIsShowcaseOpen] = useState(false);
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'terms' | 'privacy'>('terms');
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isSeoGuideOpen, setIsSeoGuideOpen] = useState(false);



  // Route Change Global Audio Killswitch: stops any ongoing audio/speech whenever currentPage changes
  useEffect(() => {
    audioManager.killAllAudio();
  }, [currentPage]);

  // Sync user and mistakes
  const syncUserData = useCallback(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    const mistakes = getMistakes();
    setMistakeCount(mistakes.filter((m) => !m.mastered).length);
  }, []);

  // Explicitly observe user authentication state changes and trigger UI re-render when getCurrentUser() returns populated data
  useEffect(() => {
    const observeAuthChanges = () => {
      const activeUser = getCurrentUser();
      if (activeUser && activeUser.id && activeUser.email) {
        setUser((prev) => {
          if (!prev || prev.id !== activeUser.id || prev.email !== activeUser.email || prev.progress?.streakDays !== activeUser.progress?.streakDays) {
            return { ...activeUser };
          }
          return prev;
        });
      }
    };

    observeAuthChanges();
    window.addEventListener('user_auth_updated', observeAuthChanges);
    window.addEventListener('user_progress_updated', observeAuthChanges);

    return () => {
      window.removeEventListener('user_auth_updated', observeAuthChanges);
      window.removeEventListener('user_progress_updated', observeAuthChanges);
    };
  }, []);

  useEffect(() => {
    syncUserData();
    const handleAuth = () => syncUserData();
    const handleVault = () => {
      const mistakes = getMistakes();
      setMistakeCount(mistakes.filter((m) => !m.mastered).length);
    };

    window.addEventListener('user_auth_updated', handleAuth);
    window.addEventListener('user_progress_updated', handleAuth);
    window.addEventListener('vault_updated', handleVault);
    window.addEventListener('ielts_mistakes_updated', handleVault);

    const handleOpenVaultModal = () => setIsVaultOpen(true);
    const handleOpenBandModal = () => setIsBandModalOpen(true);
    const handleOpenAiTutor = () => handleNavigate('aitools');
    // Subscription paused: announce 100% free access
    const handleOpenPremiumModal = () => {
      showToast('🎉 All IELTS Sprint features are 100% Free! AI British examiners, mock tests & model answers are fully unlocked.');
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
      window.removeEventListener('user_auth_updated', handleAuth);
      window.removeEventListener('user_progress_updated', handleAuth);
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
  }, [syncUserData]);

  // Handle navigation
  const handleNavigate = useCallback((page: string) => {
    if (page === currentPage) return;
    setNavHistory((prev) => [...prev, page]);
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const handleBack = useCallback(() => {
    if (navHistory.length > 1) {
      const newHistory = [...navHistory];
      newHistory.pop();
      const prevPage = newHistory[newHistory.length - 1];
      setNavHistory(newHistory);
      setCurrentPage(prevPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handleNavigate('home');
    }
  }, [navHistory, handleNavigate]);



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

  // Compute bottom nav tab mapping
  const getBottomNavTab = (page: string): BottomNavTab => {
    if (page === 'home') return 'home';
    if (['practice', 'listening', 'reading', 'speaking', 'writing', 'shadowing', 'cdielts', 'livemock', 'mocktest', 'cambridge', 'maplab', 'listeningmap', 'questionbank', 'speakingvault', 'speedreading'].includes(page)) {
      return 'practice';
    }
    if (['aitools', 'tutor'].includes(page)) return 'aitools';
    if (['progress', 'analytics', 'history'].includes(page)) return 'analytics';
    if (['profile'].includes(page)) return 'profile';
    return 'home';
  };

  const handleBottomTabSelect = (tab: BottomNavTab) => {
    if (tab === 'home') handleNavigate('home');
    else if (tab === 'practice') handleNavigate('practice');
    else if (tab === 'aitools') handleNavigate('aitools');
    else if (tab === 'analytics') handleNavigate('progress');
    else if (tab === 'profile') handleNavigate('profile');
  };

  const activeUser = user || {
    id: 'default_candidate',
    name: 'Candidate',
    email: 'candidate@ieltssprint.com',
    createdAt: Date.now(),
    progress: createDefaultProgress(7.5, 'Candidate')
  };

  // Page View Switcher
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <HomeDashboard
            user={user}
            onNavigate={handleNavigate}
            onShowToast={showToast}
            onOpenBandModal={() => setIsBandModalOpen(true)}
            examMode={examMode}
          />
        );
      case 'practice':
        return <PracticePage onNavigate={handleNavigate} onShowToast={showToast} user={user} />;
      case 'listening':
        return <ListeningLab onShowToast={showToast} />;
      case 'reading':
        return <ReadingLab onShowToast={showToast} />;
      case 'speaking':
      case 'shadowing':
        return (
          <SpeakingLabPage
            onBack={handleBack}
            onGradeInMock={() => handleNavigate('writing')}
            onShowToast={showToast}
            onNavigateToVault={() => setIsVaultOpen(true)}
          />
        );
      case 'writing':
        return (
          <WritingLabPage
            onBack={handleBack}
            onShowToast={showToast}
            onTransferToMock={() => handleNavigate('writing')}
          />
        );
      case 'aitools':
      case 'tutor':
        return <AIToolsPage onNavigate={handleNavigate} onShowToast={showToast} />;
      case 'learn':
        return <LearnPage onNavigate={handleNavigate} onShowToast={showToast} />;
      case 'progress':
      case 'analytics':
        return (
          <ProgressPage
            user={user}
            mistakeCount={mistakeCount}
            onNavigate={handleNavigate}
            onOpenVault={() => setIsVaultOpen(true)}
            onOpenBandModal={() => setIsBandModalOpen(true)}
          />
        );
      case 'profile':
        return (
          <ProfilePage
            user={user}
            mistakeCount={mistakeCount}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onOpenBandModal={() => setIsBandModalOpen(true)}
            onOpenVault={() => setIsVaultOpen(true)}
            onNavigate={handleNavigate}
            onShowToast={showToast}
          />
        );
      case 'mocktest':
        return (
          <MockTestPage
            user={activeUser}
            onNavigate={handleNavigate}
            onShowToast={showToast}
            onOpenBandModal={() => setIsBandModalOpen(true)}
          />
        );
      case 'cdielts':
        return <CDIELTSExamMode onExit={handleBack} onShowToast={showToast} />;
      case 'cdieltsspeaking':
        return <CDIELTSSpeakingSuite onExit={handleBack} onShowToast={showToast} candidateName={user?.name || 'Candidate'} />;
      case 'livemock':
        return <LiveMockTest onShowToast={showToast} onNavigateToVault={() => setIsVaultOpen(true)} />;
      case 'vocab':
        return <VocabDeck onShowToast={showToast} />;
      case 'vocabflashcards':
        return <VocabDeck onShowToast={showToast} />;
      case 'phrases':
        return <UsefulPhrasesPage onBack={handleBack} onShowToast={showToast} />;
      case 'idioms':
        return <IdiomLabPage onBack={handleBack} onShowToast={showToast} />;
      case 'c1idioms':
        return <C1IdiomsPage onBack={handleBack} onShowToast={showToast} />;
      case 'grammar':
        return <GrammarLabPage onBack={handleBack} onShowToast={showToast} />;
      case 'modelanswers':
        return <ModelAnswersPage onBack={handleBack} onShowToast={showToast} />;
      case 'spelling':
        return <SpellingLabPage onBack={handleBack} onShowToast={showToast} />;
      case 'collocations':
        return <CollocationLabPage onBack={handleBack} onShowToast={showToast} />;
      case 'studyplan':
        return <StudyPlanPage onBack={handleBack} onNavigateToModule={handleNavigate} onShowToast={showToast} />;
      case 'banddescriptors':
        return <BandDescriptorsPage onBack={handleBack} onShowToast={showToast} />;
      case 'bangla':
        return <BanglaIELTSGuide onNavigateToModule={handleNavigate} onShowToast={showToast} />;
      case 'beginner':
        return <Beginner101 onNavigate={handleNavigate} />;
      case 'slides':
        return <SlideGuide onNavigate={handleNavigate} />;
      case 'arguments':
        return <ArgumentMatrix onTransferToMock={() => handleNavigate('writing')} onShowToast={showToast} />;
      case 'task1':
        return <Task1Visualizer onShowToast={showToast} />;
      case 'questionbank':
        return <QuestionBankPage onBack={handleBack} onShowToast={showToast} />;
      case 'history':
        return <QuestionHistoryPage onBack={handleBack} onNavigate={handleNavigate} onShowToast={showToast} />;
      case 'speakingvault':
        return <SpeakingVaultPage onBack={handleBack} onShowToast={showToast} />;
      case 'speedreading':
        return <SpeedReadingPage onBack={handleBack} onShowToast={showToast} />;
      case 'cambridge':
        return (
          <CambridgeLibraryPage
            onBack={handleBack}
            onShowToast={showToast}
            user={user}
            onNavigate={handleNavigate}
          />
        );
      case 'calendar':
        return <SprintCalendarPage onNavigate={handleNavigate} onShowToast={showToast} />;
      default:
        return (
          <HomeDashboard
            user={user}
            onNavigate={handleNavigate}
            onShowToast={showToast}
            onOpenBandModal={() => setIsBandModalOpen(true)}
            examMode={examMode}
          />
        );
    }
  };

  const isExamRoomMode = currentPage === 'cdielts' || currentPage === 'cdieltsspeaking';

  if (isExamRoomMode) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070D1B] text-slate-900 dark:text-slate-100 flex flex-col font-sans">
        <main className="w-full flex-1 min-h-screen p-0 m-0 overflow-x-hidden">
          {renderCurrentPage()}
        </main>

        {/* Global Modals accessible even in exam mode if needed */}
        <BandCalculatorModal
          isOpen={isBandModalOpen}
          onClose={() => setIsBandModalOpen(false)}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onShowToast={showToast}
          onNavigateToModule={handleNavigate}
        />
        <OfflineStatusIndicator />
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 text-white border border-slate-700 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-semibold">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="flex-1">{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  const isCDIELTSMode = currentPage === 'cdielts' || currentPage === 'cdieltsspeaking';

  if (isCDIELTSMode) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-slate-900 text-white flex flex-col font-sans">
        <main className="flex-1 w-full h-full overflow-hidden">
          {renderCurrentPage()}
        </main>
        {/* Offline / Online Status Indicator Banner */}
        <OfflineStatusIndicator />
        {/* Toast Notification Bar */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 text-white border border-slate-700 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-semibold max-w-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="flex-1">{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#080D1A] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top App Header Navigation Bar */}
      <AppHeader
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onBack={handleBack}
        canGoBack={navHistory.length > 1 && currentPage !== 'home'}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenVault={() => setIsVaultOpen(true)}
        onOpenProfile={() => setIsAuthModalOpen(true)}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        mistakeCount={mistakeCount}
        user={user}
        examMode={examMode}
        onExamModeChange={(mode) => setExamMode(mode)}
      />

      {/* Mobile Navigation Sliding Drawer (<md) */}
      <MobileSidebarDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        mistakeCount={mistakeCount}
        onOpenVault={() => setIsVaultOpen(true)}
        onOpenBandModal={() => setIsBandModalOpen(true)}
        user={user}
        examMode={examMode}
        onExamModeChange={(mode) => setExamMode(mode)}
      />

      {/* Main Content Layout with Desktop Sidebar & Main Content Canvas */}
      <div className="flex-1 flex w-full max-w-[1600px] mx-auto">
        {/* Desktop Sidebar (visible on md: and larger) */}
        <DesktopSidebar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          mistakeCount={mistakeCount}
          onOpenVault={() => setIsVaultOpen(true)}
          onOpenBandModal={() => setIsBandModalOpen(true)}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 py-5 sm:py-7 overflow-x-hidden min-w-0 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8">
          {renderCurrentPage()}
        </main>
      </div>

      {/* Barnaby Chubby Cambridge Live AI Companion Floating Button & Drawer */}
      <ContextualAITutor
        currentPage={currentPage}
        examMode={examMode}
        onNavigate={handleNavigate}
        onShowToast={showToast}
      />

      {/* Mobile Bottom Bar Navigation (<md) */}
      <BottomNav
        currentTab={getBottomNavTab(currentPage)}
        onSelectTab={handleBottomTabSelect}
        mistakeCount={mistakeCount}
      />

      {/* Global Modals */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={handleNavigate}
      />

      <MistakeVault
        isModal={true}
        isOpen={isVaultOpen}
        onClose={() => setIsVaultOpen(false)}
        onShowToast={showToast}
      />

      <BandCalculatorModal
        isOpen={isBandModalOpen}
        onClose={() => setIsBandModalOpen(false)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onShowToast={showToast}
        onNavigateToModule={handleNavigate}
      />

      {/* High-Converting Pre-Login Diagnostic Funnel (Inspired by ieltsly.ai) */}
      <OnboardingDiagnosticFunnel
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onCompleted={(newProfile) => {
          setUser(newProfile);
          showToast(`Welcome ${newProfile.name}! Your 8-week Band ${newProfile.progress.targetBand} sprint is activated.`);
        }}
        onOpenAuthModal={() => {
          setIsOnboardingOpen(false);
          setIsAuthModalOpen(true);
        }}
      />

      {/* Official CD-IELTS Pre-Exam Device Check (Headphones, Mic & Lockdown) */}
      <PreExamHardwareCheck
        isOpen={isHardwareCheckOpen}
        onClose={() => setIsHardwareCheckOpen(false)}
        onProceedToExam={() => {
          setIsHardwareCheckOpen(false);
          if (preflightModule === 'speaking') {
            handleNavigate('cdieltsspeaking');
          } else {
            handleNavigate('cdielts');
          }
        }}
        moduleType={preflightModule}
      />

      {/* Commercial Showcase & Trust Modals (Subscription paused for 1 month) */}
      <CommercialShowcaseModal
        isOpen={isShowcaseOpen}
        onClose={() => setIsShowcaseOpen(false)}
        onNavigateToPractice={() => handleNavigate('practice')}
      />

      <TermsAndPrivacyModal
        isOpen={isLegalOpen}
        onClose={() => setIsLegalOpen(false)}
        initialTab={legalTab}
      />

      <ContactSupportModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
        onShowToast={showToast}
      />

      <LaunchSeoGuideModal
        isOpen={isSeoGuideOpen}
        onClose={() => setIsSeoGuideOpen(false)}
        onShowToast={showToast}
      />

      {/* Offline / Online Status Indicator Banner */}
      <OfflineStatusIndicator />

      {/* Toast Notification Bar */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 bg-slate-900/95 dark:bg-slate-800/95 text-white border border-slate-700/80 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in text-xs font-semibold max-w-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span className="flex-1">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
