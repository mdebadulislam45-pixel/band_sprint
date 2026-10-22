import React, { useState, useEffect, useCallback } from 'react';
import { 
  Download, Volume2, Play, Pause, RotateCcw, Sparkles, Mic, FileText, 
  BookOpen, CheckCircle, Award, Compass, MessageSquare, Globe, ArrowRight,
  ShieldCheck, AlertCircle, RefreshCw, X, ChevronRight
} from 'lucide-react';
import { UserProfile } from './types';
import { getCurrentUser, createDefaultProgress } from './utils/userStorage';
import { getMistakes } from './utils/vaultStorage';

// Top-Level Navigation & Layout
import { AppHeader } from './components/navigation/AppHeader';
import { BottomNav, BottomNavTab } from './components/navigation/BottomNav';
import { DesktopSidebar } from './components/navigation/DesktopSidebar';

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

  // Modal States
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isBandModalOpen, setIsBandModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Commercial & Legal Modal States (Subscription option paused for 1 month)
  const [isShowcaseOpen, setIsShowcaseOpen] = useState(false);
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'terms' | 'privacy'>('terms');
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isSeoGuideOpen, setIsSeoGuideOpen] = useState(false);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ZIP download state
  const [downloadingZip, setDownloadingZip] = useState(false);

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

    window.addEventListener('open_vault_modal', handleOpenVaultModal);
    window.addEventListener('open_band_modal', handleOpenBandModal);
    window.addEventListener('open_ai_tutor', handleOpenAiTutor);
    window.addEventListener('open_premium_modal', handleOpenPremiumModal);
    window.addEventListener('open_subscription_modal', handleOpenPremiumModal);
    window.addEventListener('open_commercial_showcase', handleOpenShowcase);
    window.addEventListener('open_legal_modal', handleOpenLegal);
    window.addEventListener('open_contact_modal', handleOpenContact);
    window.addEventListener('open_seo_guide', handleOpenSeoGuide);

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

  const handleDownloadSourceZip = () => {
    setDownloadingZip(true);
    showToast('Packaging complete source code archive...');
    const link = document.createElement('a');
    link.href = '/api/download-source-zip';
    link.download = 'ielts-sprint-source-code.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      setDownloadingZip(false);
      showToast('Source code ZIP downloaded!');
    }, 1800);
  };

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
      case 'source':
        return (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Download className="w-6 h-6 text-emerald-500" />
                  Source Code & Project Downloads
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
                  Full production repository with Express backend API routes, multi-accent audio engines, and Cambridge exam simulators.
                </p>
              </div>

              <button
                onClick={handleDownloadSourceZip}
                disabled={downloadingZip}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 text-sm shrink-0"
              >
                <Download className="w-4 h-4" />
                {downloadingZip ? 'Packaging ZIP...' : 'Download Full Source ZIP'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Full Repository Contents</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Includes complete Express TypeScript server, Vite configuration, Cambridge Question Engine, and 16 native audio characters.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Direct Express Endpoints</h3>
                <div className="font-mono text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <div>GET /api/download-source-zip</div>
                  <div>POST /api/tts/stream</div>
                  <div>POST /api/evaluate-speaking-turn</div>
                  <div>POST /api/evaluate-writing</div>
                </div>
              </div>
            </div>
          </div>
        );
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070D1B] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top App Header Navigation Bar */}
      <AppHeader
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onBack={handleBack}
        canGoBack={navHistory.length > 1 && currentPage !== 'home'}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenVault={() => setIsVaultOpen(true)}
        onOpenProfile={() => setIsAuthModalOpen(true)}
        mistakeCount={mistakeCount}
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
