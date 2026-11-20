import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../types';
import { SplashScreen } from './SplashScreen';
import { OnboardingFlow } from './OnboardingFlow';
import { WelcomeScreen } from './WelcomeScreen';
import { RegisterScreen } from './RegisterScreen';
import { LoginScreen } from './LoginScreen';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';
import { EmailVerificationScreen } from './EmailVerificationScreen';
import { PersonalizationFlow } from './PersonalizationFlow';
import { getCurrentUser } from '../../utils/userStorage';
import { soundManager } from '../../utils/audioEffects';
import { handleGoogleSignInAction } from '../../utils/googleAuth';
import { GoogleSignInModal } from './GoogleSignInModal';

import {
  storeSessionToken,
  validateCurrentServerSession,
  getStoredSessionToken
} from '../../services/authService';
import { fetchSubscriptionStatus } from '../../services/billingService';

interface AuthGateProps {
  onAuthSuccess: (user: UserProfile) => void;
  onShowToast: (msg: string) => void;
}

type AuthRoute =
  | 'splash'
  | 'onboarding'
  | 'welcome'
  | 'register'
  | 'login'
  | 'forgot_password'
  | 'verify_email'
  | 'personalize';

const ONBOARDING_COMPLETED_KEY = 'ielts_sprint_onboarding_completed_v1';

export const AuthGate: React.FC<AuthGateProps> = ({ onAuthSuccess, onShowToast }) => {
  const [route, setRoute] = useState<AuthRoute>('splash');
  const [pendingUser, setPendingUser] = useState<UserProfile | null>(null);
  const [hasCheckedInitial, setHasCheckedInitial] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  // Initial routing decision according to user status & URL callback parameters
  useEffect(() => {
    const isFirstVisit = !localStorage.getItem(ONBOARDING_COMPLETED_KEY);

    // Check for OAuth / Billing callback URL query parameters
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionToken = urlParams.get('sessionToken');
      const authSuccess = urlParams.get('authSuccess');
      const authError = urlParams.get('authError');
      const billingStatus = urlParams.get('billingStatus');
      const plan = urlParams.get('plan');

      // Clean browser address bar query params without reload
      if (sessionToken || authSuccess || authError || billingStatus) {
        window.history.replaceState({}, '', window.location.pathname);
      }

      if (authError) {
        soundManager.playBeep(350, 0.1);
        onShowToast(`Google Sign-In: ${decodeURIComponent(authError)}`);
        setRoute('welcome');
        return;
      }

      if (billingStatus === 'success') {
        soundManager.playSuccess();
        onShowToast(`🎉 Congratulations! Your BandSprint ${plan ? plan.toUpperCase() : 'Pro'} subscription is now active!`);
      } else if (billingStatus === 'cancelled') {
        onShowToast('Checkout cancelled.');
      }

      if (sessionToken) {
        storeSessionToken(sessionToken);
        validateCurrentServerSession().then((res) => {
          if (res.success && res.user) {
            soundManager.playSuccess();
            onShowToast(`Signed in with Google as ${res.user.name}!`);
            const isPersonalized = localStorage.getItem(`ielts_personalized_${res.user.id}`);
            if (!isPersonalized) {
              setPendingUser(res.user);
              setRoute('personalize');
            } else {
              onAuthSuccess(res.user);
            }
          } else {
            setRoute('welcome');
          }
        });
        return;
      }
    }

    const existingUser = getCurrentUser();

    // Verify session with server if token exists
    if (getStoredSessionToken()) {
      validateCurrentServerSession().then((res) => {
        if (res.success && res.user) {
          const isPersonalized = localStorage.getItem(`ielts_personalized_${res.user.id}`);
          if (!isPersonalized) {
            setPendingUser(res.user);
            setRoute('personalize');
          } else {
            onAuthSuccess(res.user);
          }
        } else if (existingUser) {
          onAuthSuccess(existingUser);
        } else {
          setRoute(isFirstVisit ? 'onboarding' : 'welcome');
        }
      });
      return;
    }

    // Show splash briefly for 750ms to guarantee a smooth, elegant entrance
    const splashTimer = setTimeout(() => {
      if (existingUser) {
        const isPersonalized = localStorage.getItem(`ielts_personalized_${existingUser.id}`);
        if (!isPersonalized) {
          setPendingUser(existingUser);
          setRoute('personalize');
        } else {
          onAuthSuccess(existingUser);
        }
      } else if (isFirstVisit) {
        setRoute('onboarding');
      } else {
        setRoute('welcome');
      }
      setHasCheckedInitial(true);
    }, 750);

    return () => clearTimeout(splashTimer);
  }, [onAuthSuccess, onShowToast]);

  const handleOnboardingComplete = () => {
    try {
      localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    } catch {}
    soundManager.playBeep(520, 0.08);
    setRoute('welcome');
  };

  const handleOnboardingSkip = () => {
    try {
      localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    } catch {}
    setRoute('welcome');
  };

  const handleRegisterSuccess = (user: UserProfile, needsVerification: boolean) => {
    setPendingUser(user);
    soundManager.playSuccess();
    if (needsVerification) {
      setRoute('verify_email');
    } else {
      setRoute('personalize');
    }
  };

  const handleEmailVerified = () => {
    soundManager.playSuccess();
    onShowToast('Email verified successfully! Welcome to BandSprint.');
    setRoute('personalize');
  };

  const handleLoginSuccess = (user: UserProfile) => {
    soundManager.playSuccess();
    onShowToast(`Welcome back, ${user.name}!`);
    const isPersonalized = localStorage.getItem(`ielts_personalized_${user.id}`);
    if (!isPersonalized) {
      setPendingUser(user);
      setRoute('personalize');
    } else {
      onAuthSuccess(user);
    }
  };

  const handlePersonalizationComplete = () => {
    if (pendingUser) {
      soundManager.playSuccess();
      onShowToast(`Target Band ${pendingUser.progress.targetBand} plan activated!`);
      onAuthSuccess(pendingUser);
    }
  };

  const handleOpenGoogleModal = () => {
    soundManager.playBeep(600, 0.04);
    setIsGoogleModalOpen(true);
  };

  const handleGoogleAuthComplete = (candidateInfo: {
    uid: string;
    email: string;
    name?: string;
    targetBand?: number;
    verifiedByFirebase: boolean;
  }) => {
    const res = handleGoogleSignInAction(candidateInfo);
    if (res.success && res.user) {
      soundManager.playSuccess();
      onShowToast(res.message);
      const isPersonalized = localStorage.getItem(`ielts_personalized_${res.user.id}`);
      if (!isPersonalized) {
        setPendingUser(res.user);
        setRoute('personalize');
      } else {
        onAuthSuccess(res.user);
      }
    } else {
      soundManager.playBeep(350, 0.08);
      onShowToast(res.message || 'Google authentication could not be completed.');
    }
  };

  switch (route) {
    case 'splash':
      return <SplashScreen />;

    case 'onboarding':
      return (
        <OnboardingFlow
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      );

    case 'welcome':
      return (
        <>
          <WelcomeScreen
            onCreateAccount={() => {
              soundManager.playBeep(600, 0.05);
              setRoute('register');
            }}
            onLogin={() => {
              soundManager.playBeep(600, 0.05);
              setRoute('login');
            }}
            onGoogleSignIn={handleOpenGoogleModal}
          />
          <GoogleSignInModal
            isOpen={isGoogleModalOpen}
            onClose={() => setIsGoogleModalOpen(false)}
            onSuccess={handleGoogleAuthComplete}
          />
        </>
      );

    case 'register':
      return (
        <>
          <RegisterScreen
            onSuccess={handleRegisterSuccess}
            onSwitchToLogin={() => setRoute('login')}
            onBack={() => setRoute('welcome')}
            onGoogleSignIn={handleOpenGoogleModal}
          />
          <GoogleSignInModal
            isOpen={isGoogleModalOpen}
            onClose={() => setIsGoogleModalOpen(false)}
            onSuccess={handleGoogleAuthComplete}
          />
        </>
      );

    case 'login':
      return (
        <>
          <LoginScreen
            onSuccess={handleLoginSuccess}
            onSwitchToRegister={() => setRoute('register')}
            onForgotPassword={() => setRoute('forgot_password')}
            onBack={() => setRoute('welcome')}
            onGoogleSignIn={handleOpenGoogleModal}
          />
          <GoogleSignInModal
            isOpen={isGoogleModalOpen}
            onClose={() => setIsGoogleModalOpen(false)}
            onSuccess={handleGoogleAuthComplete}
          />
        </>
      );

    case 'forgot_password':
      return <ForgotPasswordScreen onBackToLogin={() => setRoute('login')} />;

    case 'verify_email':
      return (
        <EmailVerificationScreen
          email={pendingUser?.email || 'candidate@example.com'}
          onVerified={handleEmailVerified}
          onChangeEmail={() => setRoute('register')}
        />
      );

    case 'personalize':
      return pendingUser ? (
        <PersonalizationFlow
          user={pendingUser}
          onComplete={handlePersonalizationComplete}
        />
      ) : (
        <WelcomeScreen
          onCreateAccount={() => setRoute('register')}
          onLogin={() => setRoute('login')}
        />
      );

    default:
      return <SplashScreen />;
  }
};
