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
import { getCurrentUser, saveUser, createDefaultProgress } from '../utils/userStorage';

class FirebaseSyncService {
  private currentUser: FirebaseUser | null = null;
  private unsubscribeMistakes: (() => void) | null = null;
  private listeners: Set<(user: FirebaseUser | null) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
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
      return result.user;
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      throw error;
    }
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
   * Sync user profile to Firestore
   */
  public async syncUserProfile(fbUser: FirebaseUser): Promise<void> {
    const userDocRef = doc(db, 'users', fbUser.uid);
    const path = `users/${fbUser.uid}`;

    try {
      const localUser = getCurrentUser();
      const existingDoc = await getDoc(userDocRef);

      const profileData = {
        uid: fbUser.uid,
        email: fbUser.email || localUser?.email || '',
        displayName: fbUser.displayName || localUser?.name || 'IELTS Candidate',
        photoURL: fbUser.photoURL || '',
        targetBand: localUser?.progress?.targetBand || 7.5,
        testDate: localUser?.progress?.examDate || '',
        streakDays: localUser?.progress?.streakDays || 1,
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

      // Also ensure local userStorage reflects logged in Firebase candidate
      if (localUser) {
        saveUser({
          ...localUser,
          id: fbUser.uid,
          name: profileData.displayName,
          email: profileData.email,
          progress: {
            ...createDefaultProgress(profileData.targetBand, profileData.displayName),
            ...(localUser.progress || {}),
            targetBand: profileData.targetBand
          }
        });
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
              title: data.item || data.title || 'IELTS Question',
              userAnswer: data.userAnswer || '—',
              correctAnswer: data.correctAnswer || 'Correct answer required',
              explanation: data.notes || data.explanation || '',
              mastered: Boolean(data.mastered)
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
          notes: mistake.explanation,
          mastered: mistake.mastered,
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
}

export const firebaseSyncService = new FirebaseSyncService();
