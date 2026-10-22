import { useState, useEffect, useCallback, useMemo } from 'react';
import { UserProfile } from '../types';
import { getCurrentUser } from '../utils/userStorage';
import {
  getStoredSessionToken,
  ACTIVE_SUBSCRIPTION_KEY,
  ServerSubscriptionInfo,
  validateCurrentServerSession
} from '../services/authService';
import { fetchSubscriptionStatus } from '../services/billingService';

export type PlanLevel = 'free' | 'pro' | 'master';

export interface RouteGuardRequirement {
  requireAuth: boolean;
  minPlan: PlanLevel;
  featureName: string;
}

/**
 * Route-level access rules for IELTS Sprint features
 */
export const RESTRICTED_ROUTES: Record<string, RouteGuardRequirement> = {
  // Premium AI Examiner & Live Mock Simulations (Unlocked via isPro: true during Launch Beta)
  livemock: { requireAuth: true, minPlan: 'pro', featureName: 'Authentic 40-Question Timed Live Mock Test' },
  voice_examiner: { requireAuth: true, minPlan: 'pro', featureName: 'AI Cambridge British Voice Examiner' },
  shadowing: { requireAuth: true, minPlan: 'free', featureName: 'British Shadowing & Pronunciation Lab' },
  modelanswers: { requireAuth: true, minPlan: 'pro', featureName: 'Band 9 Official Cambridge Model Answers' },
  aitools: { requireAuth: true, minPlan: 'free', featureName: 'AI Diagnostic Tools Suite' },
  // Core Practice & Diagnostic Labs (Free for all registered candidates)
  listening: { requireAuth: true, minPlan: 'free', featureName: 'IELTS Listening Lab & Practice' },
  reading: { requireAuth: true, minPlan: 'free', featureName: 'IELTS Reading Lab & Speed Reader' },
  speaking: { requireAuth: true, minPlan: 'free', featureName: 'Speaking Practice Lab' },
  writing: { requireAuth: true, minPlan: 'free', featureName: 'Writing Task 1 & Task 2 Lab' },
  profile: { requireAuth: true, minPlan: 'free', featureName: 'Candidate Profile & Settings' },
  progress: { requireAuth: true, minPlan: 'free', featureName: 'Band Progress & Analytics' }
};

export interface UseAuthGuardOptions {
  route?: string;
  minPlan?: PlanLevel;
  requireAuth?: boolean;
  autoRedirect?: boolean;
  onRedirectToAuth?: () => void;
  onRedirectToSubscription?: (requiredPlan: PlanLevel, featureName?: string) => void;
}

export interface UseAuthGuardResult {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  subscription: ServerSubscriptionInfo | null;
  planId: PlanLevel;
  isPro: boolean;
  isMaster: boolean;
  guardPassed: boolean;
  guardViolation: 'unauthenticated' | 'plan_insufficient' | null;
  featureName: string | null;
  checkRouteAccess: (route: string) => { allowed: boolean; violation?: 'unauthenticated' | 'plan_insufficient'; requiredPlan?: PlanLevel; featureName?: string };
  protectAction: (minPlan: PlanLevel, action: () => void, featureName?: string) => boolean;
  openAuthGate: () => void;
  openSubscriptionModal: () => void;
  refreshSubscription: () => Promise<void>;
}

/**
 * Custom React hook that checks authentication status and subscription entitlements,
 * automatically redirecting users to the AuthGate or SubscriptionPlansModal when accessing restricted features.
 */
export function useAuthGuard(options: UseAuthGuardOptions = {}): UseAuthGuardResult {
  const {
    route,
    minPlan,
    requireAuth = true,
    autoRedirect = true,
    onRedirectToAuth,
    onRedirectToSubscription
  } = options;

  const [user, setUser] = useState<UserProfile | null>(() => getCurrentUser());
  const [subscription, setSubscription] = useState<ServerSubscriptionInfo | null>(() => {
    if (typeof localStorage === 'undefined') return null;
    try {
      const stored = localStorage.getItem(ACTIVE_SUBSCRIPTION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync user and subscription from storage and server
  const syncState = useCallback(async () => {
    const active = getCurrentUser();
    setUser(active);

    const token = getStoredSessionToken();
    if (token) {
      try {
        const statusRes = await fetchSubscriptionStatus();
        if (statusRes?.subscription) {
          setSubscription(statusRes.subscription);
        }
      } catch (err) {
        console.warn('[useAuthGuard] Subscription verification background warning:', err);
      }
    } else {
      setSubscription(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    syncState();

    const handleAuthUpdate = () => {
      setUser(getCurrentUser());
      syncState();
    };

    const handleSubUpdate = (e: any) => {
      if (e.detail) {
        setSubscription(e.detail);
      } else {
        syncState();
      }
    };

    window.addEventListener('user_auth_updated', handleAuthUpdate);
    window.addEventListener('subscription_updated', handleSubUpdate);

    return () => {
      window.removeEventListener('user_auth_updated', handleAuthUpdate);
      window.removeEventListener('subscription_updated', handleSubUpdate);
    };
  }, [syncState]);

  const isAuthenticated = useMemo(() => {
    return Boolean(user && user.id && user.email);
  }, [user]);

  const planId: PlanLevel = useMemo(() => {
    if (!subscription || subscription.status !== 'active') {
      return 'free';
    }
    return subscription.planId || 'free';
  }, [subscription]);

  const isPro = useMemo(() => {
    // Subscription option removed: all registered candidates have full access to all features
    return true;
  }, []);

  const isMaster = useMemo(() => {
    return true;
  }, []);

  // Determine requirement for the current route or explicit option
  const effectiveRequirement = useMemo((): RouteGuardRequirement => {
    if (route && RESTRICTED_ROUTES[route]) {
      return RESTRICTED_ROUTES[route];
    }
    return {
      requireAuth: requireAuth ?? true,
      minPlan: minPlan || 'free',
      featureName: route ? `Section "${route}"` : 'Restricted Feature'
    };
  }, [route, minPlan, requireAuth]);

  // Check if current user satisfies effectiveRequirement
  const { guardPassed, guardViolation, featureName } = useMemo(() => {
    if (effectiveRequirement.requireAuth && !isAuthenticated) {
      return {
        guardPassed: false,
        guardViolation: 'unauthenticated' as const,
        featureName: effectiveRequirement.featureName
      };
    }

    if (effectiveRequirement.minPlan === 'master' && !isMaster) {
      return {
        guardPassed: false,
        guardViolation: 'plan_insufficient' as const,
        featureName: effectiveRequirement.featureName
      };
    }

    if (effectiveRequirement.minPlan === 'pro' && !isPro) {
      return {
        guardPassed: false,
        guardViolation: 'plan_insufficient' as const,
        featureName: effectiveRequirement.featureName
      };
    }

    return {
      guardPassed: true,
      guardViolation: null,
      featureName: effectiveRequirement.featureName
    };
  }, [effectiveRequirement, isAuthenticated, isPro, isMaster]);

  // Open Auth Gate modal or event
  const openAuthGate = useCallback(() => {
    if (onRedirectToAuth) {
      onRedirectToAuth();
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open_auth_gate'));
    }
  }, [onRedirectToAuth]);

  // Open Subscription Modal
  const openSubscriptionModal = useCallback(() => {
    if (onRedirectToSubscription) {
      onRedirectToSubscription(effectiveRequirement.minPlan, effectiveRequirement.featureName);
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('open_subscription_modal', {
          detail: {
            requiredPlan: effectiveRequirement.minPlan,
            featureName: effectiveRequirement.featureName
          }
        })
      );
    }
  }, [onRedirectToSubscription, effectiveRequirement]);

  // Auto-redirect if requested and violation detected
  useEffect(() => {
    if (!autoRedirect || isLoading) return;

    if (guardViolation === 'unauthenticated') {
      openAuthGate();
    } else if (guardViolation === 'plan_insufficient') {
      openSubscriptionModal();
    }
  }, [autoRedirect, guardViolation, isLoading, openAuthGate, openSubscriptionModal]);

  /**
   * Helper to check access for any arbitrary route without triggering immediate redirect
   */
  const checkRouteAccess = useCallback(
    (targetRoute: string) => {
      const rule = RESTRICTED_ROUTES[targetRoute] || {
        requireAuth: true,
        minPlan: 'free',
        featureName: targetRoute
      };

      if (rule.requireAuth && !isAuthenticated) {
        return {
          allowed: false,
          violation: 'unauthenticated' as const,
          requiredPlan: rule.minPlan,
          featureName: rule.featureName
        };
      }

      if (rule.minPlan === 'master' && !isMaster) {
        return {
          allowed: false,
          violation: 'plan_insufficient' as const,
          requiredPlan: 'master' as const,
          featureName: rule.featureName
        };
      }

      if (rule.minPlan === 'pro' && !isPro) {
        return {
          allowed: false,
          violation: 'plan_insufficient' as const,
          requiredPlan: 'pro' as const,
          featureName: rule.featureName
        };
      }

      return { allowed: true };
    },
    [isAuthenticated, isPro, isMaster]
  );

  /**
   * Helper to protect an interactive user action (e.g. starting a diagnostic or full evaluation)
   */
  const protectAction = useCallback(
    (requiredPlan: PlanLevel, action: () => void, customFeatureName?: string): boolean => {
      if (!isAuthenticated) {
        openAuthGate();
        return false;
      }

      if (requiredPlan === 'master' && !isMaster) {
        if (onRedirectToSubscription) {
          onRedirectToSubscription('master', customFeatureName);
        } else if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('open_subscription_modal', {
              detail: { requiredPlan: 'master', featureName: customFeatureName }
            })
          );
        }
        return false;
      }

      if (requiredPlan === 'pro' && !isPro) {
        if (onRedirectToSubscription) {
          onRedirectToSubscription('pro', customFeatureName);
        } else if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('open_subscription_modal', {
              detail: { requiredPlan: 'pro', featureName: customFeatureName }
            })
          );
        }
        return false;
      }

      action();
      return true;
    },
    [isAuthenticated, isPro, isMaster, openAuthGate, onRedirectToSubscription]
  );

  return {
    isAuthenticated,
    isLoading,
    user,
    subscription,
    planId,
    isPro,
    isMaster,
    guardPassed,
    guardViolation,
    featureName,
    checkRouteAccess,
    protectAction,
    openAuthGate,
    openSubscriptionModal,
    refreshSubscription: syncState
  };
}
