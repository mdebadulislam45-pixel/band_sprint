import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
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
import { ExamHistoryRecord, MistakeItem, UserProfile } from '../types';
import { getMistakes, saveMistakes } from '../utils/vaultStorage';
import {
  getCurrentUser,
  saveUser,
  createDefaultProgress,
  ACTIVE_USER_KEY,
  checkAndUpdateStreak,
  getAllUsers
} from '../utils/userStorage';
import {
  bridgeFirebaseSessionWithServer,
  logoutCandidate
} from './authService';
import {
  DiagnosticResult,
  loadDiagnosticResult,
  saveDiagnosticResult
} from './diagnosticResultStore';
import {
  ExamSetup,
  loadExamSetup,
  saveExamSetup
} from './examSetupService';
import {
  SpellingProgressState,
  loadSpellingProgress,
  saveSpellingProgress,
  sanitizeSpellingProgress
} from '../utils/spellingProgressStore';

type StudyStateKind = 'diagnostic' | 'examSetup' | 'spellingProgress';

class FirebaseSyncService {
  private currentUser: FirebaseUser | null = null;
  private unsubscribeMistakes: (() => void) | null = null;
  private unsubscribeStudyState: (() => void) | null = null;
  private listeners: Set<(user: FirebaseUser | null) => void> = new Set();
  private inFlightSyncs: Map<string, Promise<void>> = new Map();
  private lastSyncedProfileAt: Map<string, number> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      // Handle OAuth redirect result if returning from explicit full-page redirect fallback
      getRedirectResult(auth)
        .then(async (result) => {
          if (result && result.user) {
            this.currentUser = result.user;
            await this.syncUserProfile(result.user);
          }
        })
        .catch(() => {});

      // Listen for local store updates and push them to Firestore when signed in
      window.addEventListener('bandsprint_diagnostic_saved', (e: Event) => {
        const detail = (e as CustomEvent<DiagnosticResult>).detail;
        if (this.currentUser && detail) {
          this.saveStudyStateToFirestore(this.currentUser.uid, 'diagnostic', detail).catch(() => {});
        }
      });

      window.addEventListener('bandsprint_exam_setup_saved', (e: Event) => {
        const detail = (e as CustomEvent<ExamSetup>).detail;
        if (this.currentUser && detail) {
          this.saveStudyStateToFirestore(this.currentUser.uid, 'examSetup', detail).catch(() => {});
        }
      });

      window.addEventListener('bandsprint_spelling_progress_saved', (e: Event) => {
        const detail = (e as CustomEvent<SpellingProgressState>).detail;
        if (this.currentUser && detail) {
          this.saveStudyStateToFirestore(this.currentUser.uid, 'spellingProgress', detail).catch(() => {});
        }
      });

      window.addEventListener('bandsprint_mistake_upserted', (e: Event) => {
        const detail = (e as CustomEvent<MistakeItem>).detail;
        if (this.currentUser && detail?.id) {
          this.saveMistakeToFirestore(this.currentUser.uid, detail).catch(() => {});
        }
      });

      window.addEventListener('bandsprint_mistake_deleted', (e: Event) => {
        const detail = (e as CustomEvent<{ id?: string }>).detail;
        if (this.currentUser && detail?.id) {
          this.deleteMistakeFromFirestore(this.currentUser.uid, detail.id).catch(() => {});
        }
      });

      onAuthStateChanged(auth, (user) => {
        this.currentUser = user;
        this.listeners.forEach((cb) => cb(user));

        if (user) {
          this.syncUserProfile(user);
          this.listenToMistakeVault(user.uid);
          this.listenToStudyState(user.uid);
          this.hydrateSubmissionsHistory(user.uid).catch(() => {});
        } else {
          this.cleanupListeners();
        }
      });
    }
  }

  private cleanupListeners(): void {
    if (this.unsubscribeMistakes) {
      this.unsubscribeMistakes();
      this.unsubscribeMistakes = null;
    }
    if (this.unsubscribeStudyState) {
      this.unsubscribeStudyState();
      this.unsubscribeStudyState = null;
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
   * Google Sign-In: prefers signInWithPopup on both desktop and mobile
   * so JS origin allowlisting works reliably (including inside Cloud Run / iframe previews).
   */
  public async signInWithGoogle(): Promise<FirebaseUser | null> {
    const result = await signInWithPopup(auth, googleAuthProvider);
    this.syncUserProfile(result.user, true).catch(() => {});
    return result.user;
  }

  /**
   * Google Sign-In with full-page redirect (explicit fallback when top-level browser blocks popups)
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
   * Sign out of both Firebase and Express server session
   */
  public async signOut(): Promise<void> {
    this.cleanupListeners();
    try {
      await fbSignOut(auth);
    } catch (error) {
      console.error('Firebase Sign-Out Error:', error);
    } finally {
      await logoutCandidate();
    }
  }

  /**
   * Sync user profile to Firestore, bridge Firebase ID token to Express server session,
   * and merge with local progress while preserving Firebase UID consistency.
   */
  public async syncUserProfile(fbUser: FirebaseUser, force: boolean = false): Promise<void> {
    const existingSync = this.inFlightSyncs.get(fbUser.uid);
    if (existingSync) {
      return existingSync;
    }

    const lastSynced = this.lastSyncedProfileAt.get(fbUser.uid) || 0;
    const localUser = getCurrentUser();
    if (!force && localUser && localUser.id !== 'default_candidate' && Date.now() - lastSynced < 15000) {
      return;
    }

    const syncTask = this.performSyncUserProfile(fbUser).finally(() => {
      this.inFlightSyncs.delete(fbUser.uid);
      this.lastSyncedProfileAt.set(fbUser.uid, Date.now());
    });
    this.inFlightSyncs.set(fbUser.uid, syncTask);
    return syncTask;
  }

  private async performSyncUserProfile(fbUser: FirebaseUser): Promise<void> {
    const userDocRef = doc(db, 'users', fbUser.uid);
    const path = `users/${fbUser.uid}`;
    const allUsers = getAllUsers();
    const existingByEmail = fbUser.email
      ? allUsers.find((u) => u.email.toLowerCase() === fbUser.email!.toLowerCase())
      : null;
    const localUser = getCurrentUser();
    const baseUser = existingByEmail || localUser;
    const resolvedId = fbUser.uid;

    let remoteData: Record<string, any> | null = null;
    try {
      const existingDoc = await getDoc(userDocRef);
      remoteData = existingDoc.exists() ? existingDoc.data() : null;
    } catch {
      // Non-fatal: continue with local merge
    }

    const resolvedName = (
      fbUser.displayName ||
      remoteData?.displayName ||
      baseUser?.name ||
      (fbUser.email ? fbUser.email.split('@')[0].replace(/[._]/g, ' ') : 'IELTS Candidate')
    ).slice(0, 120);

    const resolvedTargetBand =
      typeof remoteData?.targetBand === 'number'
        ? Math.min(9.0, Math.max(0, remoteData.targetBand))
        : Math.min(9.0, Math.max(0, baseUser?.progress?.targetBand || 7.5));

    const resolvedStreak = Math.min(
      36500,
      Math.max(remoteData?.streakDays || 1, baseUser?.progress?.streakDays || 1)
    );

    const profileData = {
      uid: fbUser.uid,
      email: (fbUser.email || baseUser?.email || '').slice(0, 254),
      displayName: resolvedName,
      photoURL: (fbUser.photoURL || remoteData?.photoURL || '').slice(0, 1024),
      targetBand: resolvedTargetBand,
      testDate: String(baseUser?.progress?.examDate || remoteData?.testDate || '').slice(0, 32),
      streakDays: resolvedStreak,
      updatedAt: new Date().toISOString()
    };

    try {
      if (!remoteData) {
        await setDoc(
          userDocRef,
          {
            ...profileData,
            createdAt: new Date().toISOString()
          },
          { merge: true }
        );
      } else {
        await setDoc(userDocRef, profileData, { merge: true });
      }
    } catch (error) {
      console.warn('[FirebaseSyncService] Firestore profile write warning:', path, error);
    }

    // Bridge verified Firebase ID token to Express server session so /api/auth/me and billing endpoints work seamlessly
    try {
      const idToken = await fbUser.getIdToken();
      if (idToken) {
        await bridgeFirebaseSessionWithServer(idToken, {
          name: profileData.displayName,
          targetBand: profileData.targetBand,
          intendedFormat: baseUser?.progress?.intendedFormat || 'Academic',
          targetCountry: baseUser?.progress?.targetCountry || 'United Kingdom / Canada / Australia'
        });
      }
    } catch {
      // Static hosting without Express backend — safely ignored
    }

    const baseProgress = baseUser?.progress || createDefaultProgress(resolvedTargetBand, resolvedName);
    const mergedProfile: UserProfile = {
      id: resolvedId,
      name: profileData.displayName,
      email: profileData.email,
      createdAt: baseUser?.createdAt || Date.now(),
      progress: {
        ...baseProgress,
        targetBand: profileData.targetBand,
        streakDays: Math.max(profileData.streakDays, baseProgress.streakDays || 1),
        examDate: profileData.testDate || baseProgress.examDate,
        examHistory: baseProgress.examHistory || []
      }
    };

    saveUser(mergedProfile);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_USER_KEY, mergedProfile.id);
      localStorage.removeItem('ielts_auth_session');
    }
    checkAndUpdateStreak(mergedProfile);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('user_auth_updated', { detail: mergedProfile }));
    }
  }

  /**
   * Real-time cross-device sync for Diagnostic Result, Exam Setup, and Spelling Mastery
   */
  public listenToStudyState(userId: string): void {
    if (this.unsubscribeStudyState) {
      this.unsubscribeStudyState();
    }

    const studyStateCol = collection(db, 'users', userId, 'studyState');
    const q = query(studyStateCol, where('userId', '==', userId));
    const path = `users/${userId}/studyState`;

    this.unsubscribeStudyState = onSnapshot(
      q,
      (snapshot) => {
        const remoteKinds = new Set<string>();

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const kind = data?.kind as StudyStateKind | undefined;
          const payload = data?.payload;
          if (!kind || !payload || typeof payload !== 'object') return;
          remoteKinds.add(kind);

          if (kind === 'diagnostic') {
            const localDiag = loadDiagnosticResult();
            const remoteCreated = typeof payload.createdAt === 'number' ? payload.createdAt : 0;
            if (!localDiag || remoteCreated >= (localDiag.createdAt || 0)) {
              saveDiagnosticResult(payload as DiagnosticResult, { skipCloud: true });
            } else {
              // Local diagnostic is newer — push up
              this.saveStudyStateToFirestore(userId, 'diagnostic', localDiag).catch(() => {});
            }
          } else if (kind === 'examSetup') {
            saveExamSetup(payload as ExamSetup, { skipCloud: true });
          } else if (kind === 'spellingProgress') {
            const localSp = loadSpellingProgress();
            const remoteSp = sanitizeSpellingProgress(payload);
            const mergedMastered = Array.from(
              new Set([...remoteSp.masteredWords, ...localSp.masteredWords])
            ).slice(0, 750);
            const mergedWrong = Array.from(
              new Set([...remoteSp.wrongWords, ...localSp.wrongWords])
            )
              .filter((w) => !mergedMastered.includes(w))
              .slice(0, 750);
            saveSpellingProgress(
              {
                correctCount: Math.max(remoteSp.correctCount, localSp.correctCount),
                attemptedCount: Math.max(remoteSp.attemptedCount, localSp.attemptedCount),
                masteredWords: mergedMastered,
                wrongWords: mergedWrong
              },
              { skipCloud: true }
            );
          }
        });

        // Push local-only study states to Firestore on first sign-in
        if (!remoteKinds.has('diagnostic')) {
          const localDiag = loadDiagnosticResult();
          if (localDiag) {
            this.saveStudyStateToFirestore(userId, 'diagnostic', localDiag).catch(() => {});
          }
        }
        if (!remoteKinds.has('examSetup')) {
          const localSetup = loadExamSetup();
          this.saveStudyStateToFirestore(userId, 'examSetup', localSetup).catch(() => {});
        }
        if (!remoteKinds.has('spellingProgress')) {
          const localSp = loadSpellingProgress();
          if (localSp.attemptedCount > 0 || localSp.masteredWords.length > 0) {
            this.saveStudyStateToFirestore(userId, 'spellingProgress', localSp).catch(() => {});
          }
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('bandsprint_cloud_sync_updated'));
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  }

  /**
   * Persist diagnostic, examSetup, or spellingProgress to /users/{uid}/studyState/{kind}
   */
  public async saveStudyStateToFirestore(
    userId: string,
    kind: StudyStateKind,
    rawPayload: DiagnosticResult | ExamSetup | SpellingProgressState
  ): Promise<void> {
    const docRef = doc(db, 'users', userId, 'studyState', kind);
    const path = `users/${userId}/studyState/${kind}`;
    const nowIso = new Date().toISOString();

    let payload: Record<string, unknown>;
    if (kind === 'examSetup') {
      const s = rawPayload as ExamSetup;
      payload = {
        targetBand: Math.min(9, Math.max(4, Number(s.targetBand) || 7.0)),
        examDate: s.examDate ? String(s.examDate).slice(0, 32) : null,
        examMode: s.examMode === 'General Training' ? 'General Training' : 'Academic',
        mockSetId: String(s.mockSetId || 'practice-16').slice(0, 64),
        scope: ['full', 'listening', 'reading', 'writing', 'speaking'].includes(s.scope)
          ? s.scope
          : 'full'
      };
    } else if (kind === 'diagnostic') {
      const d = rawPayload as DiagnosticResult;
      payload = {
        id: String(d.id || `diag_${Date.now()}`).slice(0, 128),
        createdAt: typeof d.createdAt === 'number' ? d.createdAt : Date.now(),
        targetBand: Math.min(9, Math.max(4, Number(d.targetBand) || 7.5)),
        examDate: String(d.examDate || '').slice(0, 32),
        dailyMinutes: Math.min(600, Math.max(5, Number(d.dailyMinutes) || 45)),
        examType: d.examType === 'General Training' ? 'General Training' : 'Academic',
        scores: d.scores,
        correct: d.correct,
        weakest: d.weakest,
        writingWords: Math.min(5000, Math.max(0, Number(d.writingWords) || 0)),
        speakingRecorded: Boolean(d.speakingRecorded)
      };
    } else {
      const sp = sanitizeSpellingProgress(rawPayload);
      payload = {
        correctCount: sp.correctCount,
        attemptedCount: sp.attemptedCount,
        masteredWords: sp.masteredWords,
        wrongWords: sp.wrongWords
      };
    }

    try {
      const existingSnap = await getDoc(docRef);
      if (existingSnap.exists()) {
        await setDoc(
          docRef,
          {
            id: kind,
            userId,
            kind,
            payload,
            updatedAt: nowIso
          },
          { merge: true }
        );
      } else {
        await setDoc(docRef, {
          id: kind,
          userId,
          kind,
          payload,
          createdAt: nowIso,
          updatedAt: nowIso
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Hydrate historical test submissions into user.progress.examHistory on sign-in
   */
  public async hydrateSubmissionsHistory(userId: string): Promise<void> {
    const colRef = collection(db, 'users', userId, 'submissions');
    const q = query(colRef, where('userId', '==', userId));
    const path = `users/${userId}/submissions`;

    try {
      const snap = await getDocs(q);
      if (snap.empty) return;

      const user = getCurrentUser();
      if (!user || user.id === 'default_candidate') return;

      const existingHistory = user.progress.examHistory || [];
      const existingIds = new Set(existingHistory.map((h) => h.id));
      const merged: ExamHistoryRecord[] = [...existingHistory];

      snap.forEach((docSnap) => {
        const d = docSnap.data();
        if (existingIds.has(docSnap.id)) return;
        const ts = d.createdAt ? new Date(d.createdAt).getTime() : Date.now();
        const rawMod = String(d.module || 'full_mock');
        const examType: ExamHistoryRecord['examType'] =
          rawMod === 'listening'
            ? 'listening_only'
            : rawMod === 'reading'
            ? 'reading_only'
            : rawMod === 'writing'
            ? 'writing_only'
            : rawMod === 'speaking'
            ? 'speaking_only'
            : 'full_mock';
        const score = typeof d.bandScore === 'number' ? d.bandScore : 6.0;
        merged.push({
          id: docSnap.id,
          timestamp: Number.isFinite(ts) ? ts : Date.now(),
          examType,
          overallBand: score,
          listeningBand: rawMod === 'listening' ? score : undefined,
          readingBand: rawMod === 'reading' ? score : undefined,
          writingBand: rawMod === 'writing' ? score : undefined,
          speakingBand: rawMod === 'speaking' ? score : undefined,
          wordCount: 0,
          submissionType: 'manual',
          correctCount: typeof d.correctCount === 'number' ? d.correctCount : 0,
          totalQuestions: typeof d.totalQuestions === 'number' ? d.totalQuestions : 0,
          completedSkills: {
            listening: rawMod === 'listening' || rawMod === 'full_mock',
            reading: rawMod === 'reading' || rawMod === 'full_mock',
            writing: rawMod === 'writing' || rawMod === 'full_mock',
            speaking: rawMod === 'speaking' || rawMod === 'full_mock'
          }
        });
      });

      if (merged.length !== existingHistory.length) {
        merged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        const updatedUser: UserProfile = {
          ...user,
          progress: {
            ...user.progress,
            examHistory: merged
          }
        };
        saveUser(updatedUser);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('user_auth_updated', { detail: updatedUser }));
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  /**
   * Real-time sync for Mistake Vault (using secure owner-filtered query)
   */
  public listenToMistakeVault(userId: string): void {
    if (this.unsubscribeMistakes) {
      this.unsubscribeMistakes();
    }

    const mistakesColRef = collection(db, 'users', userId, 'mistakes');
    const q = query(mistakesColRef, where('userId', '==', userId));
    const path = `users/${userId}/mistakes`;

    this.unsubscribeMistakes = onSnapshot(
      q,
      (snapshot) => {
        const remoteMistakes: MistakeItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const createdMs = data.createdAt ? new Date(data.createdAt).getTime() : Date.now();
          remoteMistakes.push({
            id: docSnap.id,
            timestamp: Number.isFinite(createdMs) ? createdMs : Date.now(),
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

        const local = getMistakes();
        const combinedMap = new Map<string, MistakeItem>();
        remoteMistakes.forEach((m) => combinedMap.set(m.id, m));
        local.forEach((m) => {
          if (!combinedMap.has(m.id)) {
            combinedMap.set(m.id, m);
            this.saveMistakeToFirestore(userId, m).catch(() => {});
          }
        });

        if (combinedMap.size > 0) {
          saveMistakes(Array.from(combinedMap.values()));
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  }

  /**
   * Save a single mistake item to Firestore with blueprint-enforced field bounds
   */
  public async saveMistakeToFirestore(userId: string, mistake: MistakeItem): Promise<void> {
    const safeId = mistake.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
    const docRef = doc(db, 'users', userId, 'mistakes', safeId);
    const path = `users/${userId}/mistakes/${safeId}`;
    const nowIso = new Date().toISOString();

    const baseFields = {
      id: safeId,
      userId,
      module: mistake.module,
      item: (mistake.title || 'IELTS Question').slice(0, 2000),
      category: String(mistake.module || 'vocab').slice(0, 120),
      questionType: (mistake.questionType || '').slice(0, 120),
      userAnswer: (mistake.userAnswer || '—').slice(0, 2000),
      correctAnswer: (mistake.correctAnswer || '').slice(0, 2000),
      notes: (mistake.explanation || '').slice(0, 5000),
      trapExplanationBn: (mistake.trapExplanationBn || '').slice(0, 3000),
      sourceContext: (mistake.sourceContext || '').slice(0, 2000),
      mastered: Boolean(mistake.mastered),
      repetition: Math.min(1000, Math.max(0, mistake.repetition ?? 0)),
      intervalDays: Math.min(3650, Math.max(0, mistake.intervalDays ?? 0)),
      easeFactor: Math.min(5.0, Math.max(1.0, mistake.easeFactor ?? 2.5)),
      nextReviewAt: mistake.nextReviewAt ?? Date.now(),
      lastReviewedAt: mistake.lastReviewedAt ?? Date.now(),
      updatedAt: nowIso
    };

    try {
      const existingSnap = await getDoc(docRef);
      if (existingSnap.exists()) {
        await setDoc(docRef, baseFields, { merge: true });
      } else {
        await setDoc(docRef, {
          ...baseFields,
          createdAt: new Date(mistake.timestamp || Date.now()).toISOString()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Delete a mistake item from Firestore
   */
  public async deleteMistakeFromFirestore(userId: string, mistakeId: string): Promise<void> {
    const safeId = mistakeId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
    const docRef = doc(db, 'users', userId, 'mistakes', safeId);
    const path = `users/${userId}/mistakes/${safeId}`;
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
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
        testId: String(testId || 'mock').slice(0, 128),
        bandScore: Math.min(9.0, Math.max(0, Number(bandScore) || 0)),
        correctCount: Math.min(200, Math.max(0, Math.floor(correctCount || 0))),
        totalQuestions: Math.min(200, Math.max(0, Math.floor(totalQuestions || 0))),
        timeSpentSec: Math.min(86400, Math.max(0, Math.floor(timeSpentSec || 0))),
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
        persona: (params.persona || 'BandSprint AI').slice(0, 120),
        model: (params.model || 'gemini').slice(0, 120),
        userMessage: (params.userMessage || '').slice(0, 3900),
        aiReply: (params.aiReply || '').slice(0, 7900),
        module: (params.module || 'general').slice(0, 64),
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
}

export const firebaseSyncService = new FirebaseSyncService();
