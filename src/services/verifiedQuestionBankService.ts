import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';

// Configure pdf.js browser worker cleanly via Vite asset URL
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type VerifiedModule = 'reading' | 'listening' | 'writing' | 'speaking';
export type VerifiedExamTrack = 'Academic' | 'General Training';

export interface VerifiedSubQuestion {
  number: number;
  type: 'tfng' | 'ynng' | 'mcq' | 'fill';
  prompt: string;
  options?: string[];
  correctAnswer: string;
  acceptableAnswers?: string[];
  evidenceQuote: string;
  explanationEn: string;
  explanationBn: string;
}

export interface Task1ChartData {
  chartType: 'bar' | 'line';
  title: string;
  unit: string;
  labels: string[];
  series: Array<{
    name: string;
    values: number[];
  }>;
}

export interface VerifiedQuestionSet {
  id: string;
  createdBy: string;
  module: VerifiedModule;
  examTrack: VerifiedExamTrack;
  questionType: string;
  topic: string;
  targetBand: number;
  title: string;
  passageOrScript?: string;
  prompt: string;
  modelAnswer?: string;
  keyVocab?: string[];
  questions?: VerifiedSubQuestion[];
  chartData?: Task1ChartData | null;
  qualityScore: number;
  verificationStatus: 'blind-verified';
  verificationNotes?: string;
  reportCount: number;
  createdAt: string;
  updatedAt: string;
  /** Client-only flag indicating whether this doc exists in Firestore */
  _isCloudSynced?: boolean;
}

export interface PrivatePdfExam {
  id: string;
  sourceFileName: string;
  pageRangeLabel: string;
  title: string;
  module: VerifiedModule;
  instructions: string;
  suggestedMinutes: number;
  passageOrScript: string;
  questions: VerifiedSubQuestion[];
  createdAt: string;
}

export interface GenerateDrillRequest {
  module: VerifiedModule;
  examTrack: VerifiedExamTrack;
  questionType: string;
  topic: string;
  targetBand: number;
}

export interface CompletedRecord {
  questionId: string;
  completedAt: string;
  scorePercent?: number;
}

const CACHE_VERIFIED_KEY = 'bandsprint_verified_questions_cache_v1';
const COMPLETED_PREFIX = 'bandsprint_completed_qids_v1_';
const PRIVATE_PDF_PREFIX = 'bandsprint_private_pdf_exams_v1_';

function sanitizeId(raw: string): string {
  const cleaned = String(raw || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  return cleaned || `vq_${Date.now()}`;
}

export function getActiveStorageScope(): string {
  const uid = auth?.currentUser?.uid;
  if (uid) return uid;
  try {
    const rawUser = localStorage.getItem('bandsprint_user_v1');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed?.id) return String(parsed.id).replace(/[^a-zA-Z0-9_-]/g, '_');
    }
  } catch {}
  return 'guest';
}

/* ============================================================================
 * LAYER 1: SHARED FIRESTORE BLIND-VERIFIED QUESTION BANK
 * ============================================================================ */

function readLocalVerifiedCache(): VerifiedQuestionSet[] {
  try {
    const raw = localStorage.getItem(CACHE_VERIFIED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalVerifiedCache(items: VerifiedQuestionSet[]): void {
  try {
    localStorage.setItem(CACHE_VERIFIED_KEY, JSON.stringify(items.slice(0, 80)));
  } catch {}
}

export async function fetchSharedVerifiedQuestions(): Promise<VerifiedQuestionSet[]> {
  const localItems = readLocalVerifiedCache();
  if (!auth?.currentUser) {
    return localItems.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  try {
    // Query matches Firestore list rule: resource.data.verificationStatus == 'blind-verified'
    const q = query(
      collection(db, 'verifiedQuestions'),
      where('verificationStatus', '==', 'blind-verified'),
      limit(60)
    );
    const snap = await getDocs(q);
    const cloudItems: VerifiedQuestionSet[] = snap.docs.map((d) => ({
      ...(d.data() as VerifiedQuestionSet),
      id: d.id,
      _isCloudSynced: true
    }));

    // Merge cloud items with any offline/local-only generated items
    const byId = new Map<string, VerifiedQuestionSet>();
    for (const item of localItems) {
      byId.set(item.id, item);
    }
    for (const item of cloudItems) {
      byId.set(item.id, item);
    }

    const merged = Array.from(byId.values()).sort((a, b) =>
      String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
    );
    writeLocalVerifiedCache(merged);
    return merged;
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.LIST, 'verifiedQuestions');
    } catch {
      // Fall back gracefully to local cache so UI stays responsive
    }
    return localItems.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export async function saveVerifiedQuestionToFirestore(
  drill: Omit<VerifiedQuestionSet, 'createdBy' | '_isCloudSynced'>
): Promise<VerifiedQuestionSet> {
  const nowIso = new Date().toISOString();
  const safeId = sanitizeId(drill.id);
  const currentUser = auth?.currentUser;
  const creatorId = sanitizeId(currentUser?.uid || 'local_candidate');

  // Construct payload strictly matching firestore.rules `isValidVerifiedQuestion`
  const firestorePayload: Record<string, any> = {
    id: safeId,
    createdBy: creatorId,
    module: drill.module,
    examTrack: drill.examTrack,
    questionType: String(drill.questionType || 'Mixed Set').slice(0, 120),
    topic: String(drill.topic || 'General IELTS').slice(0, 120),
    targetBand: Math.max(4.0, Math.min(9.0, Number(drill.targetBand) || 7.5)),
    title: String(drill.title || 'Verified IELTS Drill').slice(0, 220),
    prompt: String(drill.prompt || 'Complete the drill below.').slice(0, 3000),
    qualityScore: Math.max(0, Math.min(100, Math.round(Number(drill.qualityScore) || 88))),
    verificationStatus: 'blind-verified',
    reportCount: 0,
    createdAt: String(drill.createdAt || nowIso).slice(0, 64),
    updatedAt: String(drill.updatedAt || nowIso).slice(0, 64)
  };

  if (drill.passageOrScript) {
    firestorePayload.passageOrScript = String(drill.passageOrScript).slice(0, 12000);
  }
  if (drill.modelAnswer) {
    firestorePayload.modelAnswer = String(drill.modelAnswer).slice(0, 8000);
  }
  if (Array.isArray(drill.keyVocab) && drill.keyVocab.length > 0) {
    firestorePayload.keyVocab = drill.keyVocab.map((v) => String(v).slice(0, 180)).slice(0, 15);
  }
  if (Array.isArray(drill.questions) && drill.questions.length > 0) {
    firestorePayload.questions = drill.questions.slice(0, 15).map((q) => ({
      number: Number(q.number) || 1,
      type: q.type,
      prompt: String(q.prompt || '').slice(0, 600),
      options: Array.isArray(q.options) ? q.options.map((o) => String(o).slice(0, 220)).slice(0, 6) : [],
      correctAnswer: String(q.correctAnswer || '').slice(0, 220),
      acceptableAnswers: Array.isArray(q.acceptableAnswers)
        ? q.acceptableAnswers.map((a) => String(a).slice(0, 220)).slice(0, 6)
        : [],
      evidenceQuote: String(q.evidenceQuote || '').slice(0, 500),
      explanationEn: String(q.explanationEn || '').slice(0, 700),
      explanationBn: String(q.explanationBn || '').slice(0, 700)
    }));
  }
  if (drill.chartData) {
    firestorePayload.chartData = drill.chartData;
  }
  if (drill.verificationNotes) {
    firestorePayload.verificationNotes = String(drill.verificationNotes).slice(0, 1000);
  }

  let cloudSynced = false;
  if (currentUser) {
    try {
      await setDoc(doc(db, 'verifiedQuestions', safeId), firestorePayload);
      cloudSynced = true;
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.CREATE, `verifiedQuestions/${safeId}`);
      } catch {
        // Keep local copy even if cloud write fails (e.g. offline)
      }
    }
  }

  const savedItem: VerifiedQuestionSet = {
    ...(firestorePayload as VerifiedQuestionSet),
    _isCloudSynced: cloudSynced
  };

  const existing = readLocalVerifiedCache().filter((item) => item.id !== safeId);
  writeLocalVerifiedCache([savedItem, ...existing]);
  return savedItem;
}

export async function generateVerifiedDrillViaApi(
  req: GenerateDrillRequest
): Promise<VerifiedQuestionSet> {
  const res = await fetch('/api/questions/generate-verified-drill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.drill) {
    throw new Error(data?.error || `Failed to generate verified drill (HTTP ${res.status}).`);
  }

  return saveVerifiedQuestionToFirestore(data.drill);
}

export async function reportVerifiedQuestionIssue(params: {
  questionId: string;
  module: string;
  title: string;
  issueType: string;
  comment?: string;
  currentReportCount?: number;
  isCloudSynced?: boolean;
}): Promise<{ ok: boolean; message: string }> {
  const res = await fetch('/api/feedback/report-question', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      questionId: params.questionId,
      moduleId: params.module,
      examId: params.questionId,
      examTitle: params.title,
      issueType: params.issueType,
      comment: params.comment
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || 'Could not submit issue report.');
  }

  // Safely increment reportCount by +1 in Firestore if signed in & synced
  if (auth?.currentUser && params.isCloudSynced) {
    const safeId = sanitizeId(params.questionId);
    const nextCount = Math.max(0, Number(params.currentReportCount) || 0) + 1;
    try {
      await updateDoc(doc(db, 'verifiedQuestions', safeId), {
        reportCount: nextCount,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `verifiedQuestions/${safeId}`);
      } catch {
        // Report is already logged on server endpoint
      }
    }
  }

  // Update local cache reportCount
  const cached = readLocalVerifiedCache().map((item) =>
    item.id === params.questionId
      ? { ...item, reportCount: (item.reportCount || 0) + 1 }
      : item
  );
  writeLocalVerifiedCache(cached);

  return {
    ok: true,
    message: data?.message || 'Thank you! This question has been flagged for examiner review.'
  };
}

/* ============================================================================
 * LAYER 2: NO-REPEAT ATTEMPT TRACKER (PER USER)
 * ============================================================================ */

export function getCompletedQuestionMap(userScope?: string): Record<string, CompletedRecord> {
  const scope = userScope || getActiveStorageScope();
  try {
    const raw = localStorage.getItem(`${COMPLETED_PREFIX}${scope}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function markQuestionCompleted(
  questionId: string,
  scorePercent?: number,
  userScope?: string
): Record<string, CompletedRecord> {
  const scope = userScope || getActiveStorageScope();
  const current = getCompletedQuestionMap(scope);
  const updated: Record<string, CompletedRecord> = {
    ...current,
    [questionId]: {
      questionId,
      completedAt: new Date().toISOString(),
      scorePercent
    }
  };
  try {
    localStorage.setItem(`${COMPLETED_PREFIX}${scope}`, JSON.stringify(updated));
  } catch {}
  return updated;
}

/* ============================================================================
 * LAYER 3: PRIVATE "PRACTICE YOUR OWN PDF" EXTRACTOR & LOCAL-ONLY VAULT
 * ============================================================================ */

export async function inspectPdfFile(file: File): Promise<{ pageCount: number; fileName: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;
  try {
    await pdf.destroy();
  } catch {}
  return { pageCount, fileName: file.name };
}

export async function extractTextFromPdfFile(
  file: File,
  startPage: number,
  endPage: number
): Promise<{ text: string; pagesExtracted: number; totalPages: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  const safeStart = Math.max(1, Math.min(totalPages, Math.floor(startPage)));
  const safeEnd = Math.max(safeStart, Math.min(totalPages, Math.floor(endPage)));

  // Cap at 8 pages per conversion for fast, accurate CD-IELTS parsing
  const cappedEnd = Math.min(safeEnd, safeStart + 7);
  const pageTexts: string[] = [];

  for (let p = safeStart; p <= cappedEnd; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const lines: string[] = [];
    let currentLine = '';
    let lastY: number | null = null;

    for (const rawItem of content.items as any[]) {
      const str = typeof rawItem?.str === 'string' ? rawItem.str : '';
      if (!str) continue;
      const y = Array.isArray(rawItem?.transform) ? Math.round(rawItem.transform[5]) : null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) {
        if (currentLine.trim()) lines.push(currentLine.trim());
        currentLine = str;
      } else {
        currentLine = currentLine ? `${currentLine} ${str}` : str;
      }
      lastY = y;
    }
    if (currentLine.trim()) lines.push(currentLine.trim());
    pageTexts.push(`--- Page ${p} ---\n${lines.join('\n')}`);
  }

  try {
    await pdf.destroy();
  } catch {}

  return {
    text: pageTexts.join('\n\n').slice(0, 23000),
    pagesExtracted: cappedEnd - safeStart + 1,
    totalPages
  };
}

export async function convertPrivatePdfToExam(params: {
  extractedText: string;
  fileName: string;
  pageRangeLabel: string;
  moduleHint: VerifiedModule | 'auto';
}): Promise<PrivatePdfExam> {
  const res = await fetch('/api/questions/parse-private-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.exam) {
    throw new Error(data?.error || `Failed to convert PDF excerpt (HTTP ${res.status}).`);
  }

  return data.exam as PrivatePdfExam;
}

export function loadPrivatePdfExams(userScope?: string): PrivatePdfExam[] {
  const scope = userScope || getActiveStorageScope();
  try {
    const raw = localStorage.getItem(`${PRIVATE_PDF_PREFIX}${scope}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePrivatePdfExam(exam: PrivatePdfExam, userScope?: string): PrivatePdfExam[] {
  const scope = userScope || getActiveStorageScope();
  const existing = loadPrivatePdfExams(scope).filter((e) => e.id !== exam.id);
  const next = [exam, ...existing].slice(0, 25);
  try {
    localStorage.setItem(`${PRIVATE_PDF_PREFIX}${scope}`, JSON.stringify(next));
  } catch {}
  return next;
}

export function deletePrivatePdfExam(examId: string, userScope?: string): PrivatePdfExam[] {
  const scope = userScope || getActiveStorageScope();
  const next = loadPrivatePdfExams(scope).filter((e) => e.id !== examId);
  try {
    localStorage.setItem(`${PRIVATE_PDF_PREFIX}${scope}`, JSON.stringify(next));
  } catch {}
  return next;
}
