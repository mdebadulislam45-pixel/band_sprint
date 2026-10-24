import {
  doc,
  setDoc,
  getDoc,
  collection,
  onSnapshot,
  deleteDoc
} from 'firebase/firestore';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import {
  auth,
  db,
  googleAuthProvider,
  handleFirestoreError,
  OperationType
} from '../lib/firebase';
import { MistakeItem, UserProfile } from '../types';
import { getMistakes, saveMistakes } from '../utils/vaultStorage';
import {
  getCurrentUser,
  saveUser,
  createDefaultProgress,
  ACTIVE_USER_KEY,
  checkAndUpdateStreak
} from '../utils/userStorage';

class FirebaseSyncService {
  private currentUser: FirebaseUser | null = null;
  private unsubscribeMistakes: (() => void) | null = null;
  private listeners: Set<(user: FirebaseUser | null) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      // Handle OAuth redirect result if returning from full-page Google Sign-In
      getRedirectResult(auth)
        .then((result) => {
          if (result && result.user) {
            this.currentUser = result.user;
            this.syncUserProfile(result.user);
          }
        })
        .catch((err) => {
          console.warn('[FirebaseSyncService] Redirect sign-in check:', err);
        });

      onAuthStateChanged(auth, (user) => {
        this.currentUser = user;
        this.listeners.forEach((cb) => cb(user));

        if (user) {
          this.syncUserProfile(user);
          this.listenToMistakeVault(user.uid);
        } else {
          if (this.unsubscribeMistakes) {
            this.unsubscribeMistakes();
            this.unsubscribeMistakes = null;
          }
        }
      });
    }
  }

  public subscribeAuth(callback: (user: FirebaseUser | null) => void): () => void {
    this.listeners.add(callback);
    callback(this.currentUser);
    return () => this.listeners.delete(callback);
  }

  public getCurrentFirebaseUser(): FirebaseUser | null {
    return this.currentUser;
  }

  /**
   * Google Sign-In with popup
   */
  public async signInWithGoogle(): Promise<FirebaseUser | null> {
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      await this.syncUserProfile(result.user);
      return result.user;
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      throw error;
    }
  }

  /**
   * Google Sign-In with full-page redirect (fallback when popup is blocked on mobile)
   */
  public async signInWithGoogleRedirect(): Promise<void> {
    await signInWithRedirect(auth, googleAuthProvider);
  }

  /**
   * Email & Password Registration via Firebase Auth
   */
  public async registerWithEmail(
    name: string,
    email: string,
    password: string,
    targetBand: number = 7.5,
    intendedFormat: 'Academic' | 'General Training' = 'Academic',
    targetCountry: string = 'United Kingdom / Canada / Australia',
    examDate?: string
  ): Promise<UserProfile> {
    const cleanEmail = email.trim().toLowerCase();
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    if (name.trim()) {
      await updateProfile(cred.user, { displayName: name.trim() });
    }

    const newProfile: UserProfile = {
      id: cred.user.uid,
      name: name.trim() || cred.user.displayName || 'IELTS Candidate',
      email: cleanEmail,
      createdAt: Date.now(),
      progress: {
        ...createDefaultProgress(targetBand, name.trim()),
        targetBand,
        intendedFormat,
        targetCountry,
        examDate: examDate || undefined
      }
    };

    saveUser(newProfile);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_USER_KEY, newProfile.id);
    }
    await this.syncUserProfile(cred.user);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('user_auth_updated', { detail: newProfile }));
    }
    return newProfile;
  }

  /**
   * Email & Password Sign-In via Firebase Auth
   */
  public async loginWithEmail(email: string, password: string): Promise<UserProfile> {
    const cleanEmail = email.trim().toLowerCase();
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
    await this.syncUserProfile(cred.user);
    const synced = getCurrentUser();
    if (synced) {
      return synced;
    }
    const fallbackProfile: UserProfile = {
      id: cred.user.uid,
      name: cred.user.displayName || cleanEmail.split('@')[0],
      email: cleanEmail,
      createdAt: Date.now(),
      progress: createDefaultProgress(7.5, cred.user.displayName || 'Candidate')
    };
    saveUser(fallbackProfile);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_USER_KEY, fallbackProfile.id);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('user_auth_updated', { detail: fallbackProfile }));
    }
    return fallbackProfile;
  }

  /**
   * Password Reset Email via Firebase Auth
   */
  public async sendResetPasswordEmail(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
  }

  /**
   * Sign out
   */
  public async signOut(): Promise<void> {
    try {
      await fbSignOut(auth);
    } catch (error) {
      console.error('Firebase Sign-Out Error:', error);
      throw error;
    }
  }

  /**
   * Sync user profile to Firestore and merge with local progress
   */
  public async syncUserProfile(fbUser: FirebaseUser): Promise<void> {
    const userDocRef = doc(db, 'users', fbUser.uid);
    const path = `users/${fbUser.uid}`;

    try {
      const localUser = getCurrentUser();
      const existingDoc = await getDoc(userDocRef);
      const remoteData = existingDoc.exists() ? existingDoc.data() : null;

      const resolvedName =
        fbUser.displayName ||
        remoteData?.displayName ||
        (localUser && localUser.id !== 'default_candidate' ? localUser.name : '') ||
        (fbUser.email ? fbUser.email.split('@')[0].replace(/[._]/g, ' ') : 'IELTS Candidate');

      const resolvedTargetBand =
        typeof remoteData?.targetBand === 'number'
          ? remoteData.targetBand
          : localUser?.progress?.targetBand || 7.5;

      const resolvedStreak = Math.max(
        remoteData?.streakDays || 1,
        localUser?.progress?.streakDays || 1
      );

      const profileData = {
        uid: fbUser.uid,
        email: fbUser.email || localUser?.email || '',
        displayName: resolvedName,
        photoURL: fbUser.photoURL || remoteData?.photoURL || '',
        targetBand: resolvedTargetBand,
        testDate: localUser?.progress?.examDate || remoteData?.testDate || '',
        streakDays: resolvedStreak,
        updatedAt: new Date().toISOString()
      };

      if (!existingDoc.exists()) {
        await setDoc(userDocRef, {
          ...profileData,
          createdAt: new Date().toISOString()
        });
      } else {
        await setDoc(userDocRef, profileData, { merge: true });
      }

      // Ensure local userStorage reflects the verified Firebase candidate
      const mergedProfile: UserProfile = {
        id: fbUser.uid,
        name: profileData.displayName,
        email: profileData.email,
        createdAt: localUser?.createdAt || Date.now(),
        progress: {
          ...createDefaultProgress(profileData.targetBand, profileData.displayName),
          ...(localUser?.progress || {}),
          targetBand: profileData.targetBand,
          streakDays: profileData.streakDays,
          examDate: profileData.testDate || localUser?.progress?.examDate
        }
      };

      saveUser(mergedProfile);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(ACTIVE_USER_KEY, mergedProfile.id);
      }
      checkAndUpdateStreak(mergedProfile);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('user_auth_updated', { detail: mergedProfile }));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Real-time sync for Mistake Vault
   */
  public listenToMistakeVault(userId: string): void {
    if (this.unsubscribeMistakes) {
      this.unsubscribeMistakes();
    }

    const mistakesColRef = collection(db, 'users', userId, 'mistakes');
    const path = `users/${userId}/mistakes`;

    this.unsubscribeMistakes = onSnapshot(
      mistakesColRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteMistakes: MistakeItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            remoteMistakes.push({
              id: docSnap.id,
              timestamp: data.timestamp || Date.now(),
              module: data.module || 'vocab',
              questionType: data.questionType || undefined,
              title: data.item || data.title || 'IELTS Question',
              userAnswer: data.userAnswer || '—',
              correctAnswer: data.correctAnswer || 'Correct answer required',
              explanation: data.notes || data.explanation || '',
              trapExplanationBn: data.trapExplanationBn || undefined,
              sourceContext: data.sourceContext || undefined,
              mastered: Boolean(data.mastered),
              repetition: typeof data.repetition === 'number' ? data.repetition : 0,
              intervalDays: typeof data.intervalDays === 'number' ? data.intervalDays : 0,
              easeFactor: typeof data.easeFactor === 'number' ? data.easeFactor : 2.5,
              nextReviewAt: typeof data.nextReviewAt === 'number' ? data.nextReviewAt : Date.now(),
              lastReviewedAt: typeof data.lastReviewedAt === 'number' ? data.lastReviewedAt : undefined
            });
          });

          // Merge with local storage
          const local = getMistakes();
          const combinedMap = new Map<string, MistakeItem>();
          remoteMistakes.forEach((m) => combinedMap.set(m.id, m));
          local.forEach((m) => {
            if (!combinedMap.has(m.id)) {
              combinedMap.set(m.id, m);
              // Push local-only mistake to Firestore
              this.saveMistakeToFirestore(userId, m);
            }
          });

          saveMistakes(Array.from(combinedMap.values()));
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  }

  /**
   * Save a single mistake item to Firestore
   */
  public async saveMistakeToFirestore(userId: string, mistake: MistakeItem): Promise<void> {
    const docRef = doc(db, 'users', userId, 'mistakes', mistake.id);
    const path = `users/${userId}/mistakes/${mistake.id}`;

    try {
      await setDoc(
        docRef,
        {
          id: mistake.id,
          userId,
          module: mistake.module,
          item: mistake.title,
          category: mistake.module,
          questionType: mistake.questionType || '',
          userAnswer: mistake.userAnswer || '—',
          correctAnswer: mistake.correctAnswer || '',
          notes: mistake.explanation,
          trapExplanationBn: mistake.trapExplanationBn || '',
          sourceContext: mistake.sourceContext || '',
          mastered: mistake.mastered,
          repetition: mistake.repetition ?? 0,
          intervalDays: mistake.intervalDays ?? 0,
          easeFactor: mistake.easeFactor ?? 2.5,
          nextReviewAt: mistake.nextReviewAt ?? Date.now(),
          lastReviewedAt: mistake.lastReviewedAt ?? Date.now(),
          createdAt: new Date(mistake.timestamp).toISOString(),
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Record a test submission in Firestore
   */
  public async recordTestSubmission(
    module: 'listening' | 'reading' | 'writing' | 'speaking' | 'full_mock',
    testId: string,
    bandScore: number,
    correctCount: number,
    totalQuestions: number,
    timeSpentSec: number
  ): Promise<void> {
    if (!this.currentUser) return;
    const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const docRef = doc(db, 'users', this.currentUser.uid, 'submissions', submissionId);
    const path = `users/${this.currentUser.uid}/submissions/${submissionId}`;

    try {
      await setDoc(docRef, {
        id: submissionId,
        userId: this.currentUser.uid,
        module,
        testId,
        bandScore,
        correctCount,
        totalQuestions,
        timeSpentSec,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Persist a multi-turn AI chat or Live Voice turn in Firestore
   */
  public async saveChatTurnToFirestore(params: {
    persona: string;
    model: string;
    userMessage: string;
    aiReply: string;
    module?: string;
  }): Promise<void> {
    if (!this.currentUser) return;
    const chatId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const docRef = doc(db, 'users', this.currentUser.uid, 'chats', chatId);
    const path = `users/${this.currentUser.uid}/chats/${chatId}`;

    try {
      await setDoc(docRef, {
        id: chatId,
        userId: this.currentUser.uid,
        persona: params.persona,
        model: params.model,
        userMessage: params.userMessage.slice(0, 3900),
        aiReply: params.aiReply.slice(0, 7900),
        module: params.module || 'general',
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
}

export const firebaseSyncService = new FirebaseSyncService();
