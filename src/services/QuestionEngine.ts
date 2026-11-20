/**
 * IELTS SPRINT — CENTRALIZED QUESTION ENGINE & ADAPTIVE LEARNING SYSTEM
 * 
 * Features:
 * 1. Normalized Question Schema across all 4 IELTS modules + Vocab & Grammar
 * 2. Uniqueness & Semantic Similarity Engine (Levenshtein + Token Jaccard + Crypto Hashing)
 * 3. Intelligent Spaced Repetition & Weakness Prioritization
 * 4. User Attempt History & Mistake Vault Integration
 * 5. Adaptive Question Selection Algorithm
 */

import { addMistake } from '../utils/vaultStorage';
import { ALL_INITIAL_QUESTIONS } from '../data/comprehensiveQuestionBank';
import {
  PART_1_SPEAKING_BANK,
  PART_2_CUE_CARD_BANK,
  PART_3_DISCUSSION_BANK
} from '../data/speakingComprehensiveBank';

export type IELTSModuleType = 'listening' | 'reading' | 'speaking' | 'writing' | 'vocabulary' | 'grammar';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface IELTSQuestion {
  id: string;
  audioId?: string;
  module: IELTSModuleType;
  section?: 1 | 2 | 3 | 4;
  questionType: string;
  difficulty: QuestionDifficulty;
  topic: string;
  subtopic?: string;
  skillTags: string[];
  prompt: string;
  options?: string[];
  correctAnswer?: string | string[];
  acceptableAnswers?: string[];
  explanation?: string;
  audioScript?: string;
  dialogue?: Array<{
    speaker: string;
    text: string;
    gender?: 'female' | 'male';
    pauseAfterMs?: number;
    speakerId?: string;
    speakerName?: string;
    accent?: string;
  }>;
  passage?: string;
  passageTitle?: string;
  cueCardBulletPoints?: string[];
  distractors?: string[];
  wordLimit?: number;
  maxWords?: number;
  estimatedTimeSec?: number;
  source: 'sprint_standard' | 'original' | 'generated';
  version: number;
  createdAt: number;
}

export interface QuestionAttempt {
  id: string;
  questionId: string;
  module: IELTSModuleType;
  questionType: string;
  topic: string;
  userAnswer: string | string[];
  isCorrect: boolean;
  score?: number; // 0 to 9 or 0 to 1
  timeSpentSec?: number;
  timestamp: number;
  mistakeType?: string;
  explanation?: string;
  reviewed?: boolean;
  nextReviewDate?: number;
}

export interface QuestionStats {
  timesAttempted: number;
  timesCorrect: number;
  accuracy: number;
  lastAttemptedAt: number;
  isMastered: boolean;
  nextReviewAt: number;
  mistakeTypes: string[];
}

export interface ModuleProgressStats {
  module: IELTSModuleType;
  totalAttempted: number;
  totalCorrect: number;
  overallAccuracy: number;
  estimatedBand: number;
  weakestTopics: string[];
  weakestQuestionTypes: string[];
  dueReviewsCount: number;
}

const STORAGE_KEY_ATTEMPTS = 'ielts_sprint_question_attempts_v2';
const STORAGE_KEY_SEEN = 'ielts_seen_question_ids_v1';

/**
 * Text normalization helper for duplicate & similarity analysis
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^\w\s]/g, ' ') // replace punctuation with space
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Compute simple fast hash for exact duplicate detection
 */
export function computeStringHash(text: string): string {
  const normalized = normalizeText(text);
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return 'h_' + Math.abs(hash).toString(16);
}

/**
 * Computes Levenshtein Distance between two strings
 */
export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  if (m === 0) return n;
  if (n === 0) return m;

  // Use two rows for O(min(m, n)) memory
  let prevRow = new Array(n + 1).fill(0).map((_, i) => i);
  let currRow = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    currRow[0] = i;
    const char1 = s1.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const char2 = s2.charCodeAt(j - 1);
      const cost = char1 === char2 ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1, // deletion
        currRow[j - 1] + 1, // insertion
        prevRow[j - 1] + cost // substitution
      );
    }
    const temp = prevRow;
    prevRow = currRow;
    currRow = temp;
  }

  return prevRow[n];
}

/**
 * Normalized Levenshtein similarity: 1 = identical, 0 = completely different
 */
export function editSimilarity(s1: string, s2: string): number {
  const n1 = normalizeText(s1);
  const n2 = normalizeText(s2);
  if (n1 === n2) return 1.0;
  const maxLen = Math.max(n1.length, n2.length);
  if (maxLen === 0) return 1.0;
  const distance = levenshteinDistance(n1, n2);
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * Token Jaccard similarity (word tokens & 2-grams)
 */
export function tokenJaccardSimilarity(s1: string, s2: string): number {
  const n1 = normalizeText(s1);
  const n2 = normalizeText(s2);
  if (n1 === n2) return 1.0;

  const tokens1 = new Set(n1.split(' ').filter(Boolean));
  const tokens2 = new Set(n2.split(' ').filter(Boolean));
  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  let intersection = 0;
  tokens1.forEach((t) => {
    if (tokens2.has(t)) intersection++;
  });

  const union = tokens1.size + tokens2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Composite semantic similarity calculation
 * Evaluates both token overlap and sequence edit distance
 */
export function calculateSemanticSimilarity(textA: string, textB: string): number {
  const editScore = editSimilarity(textA, textB);
  const tokenScore = tokenJaccardSimilarity(textA, textB);
  // Equal weighting between token presence and sequential layout
  return 0.5 * editScore + 0.5 * tokenScore;
}

/**
 * Centralized IELTS Question Management & Adaptive Learning Engine
 */
class QuestionEngineService {
  private questions: Map<string, IELTSQuestion> = new Map();
  private attempts: QuestionAttempt[] = [];
  private questionStats: Map<string, QuestionStats> = new Map();
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.isInitialized) return;
    this.registerQuestions(ALL_INITIAL_QUESTIONS);

    // Register comprehensive Sprint speaking banks (Parts 1, 2, 3)
    const speakingToRegister: IELTSQuestion[] = [
      ...PART_1_SPEAKING_BANK.map((s) => ({
        id: s.id,
        module: 'speaking' as const,
        section: 1 as const,
        questionType: s.questionType,
        difficulty: s.difficulty || 'medium',
        topic: s.topic,
        skillTags: s.tags || ['fluency'],
        prompt: s.questionText,
        source: 'sprint_standard' as const,
        version: 1,
        createdAt: s.createdAt
      })),
      ...PART_2_CUE_CARD_BANK.map((s) => ({
        id: s.id,
        module: 'speaking' as const,
        section: 2 as const,
        questionType: s.questionType,
        difficulty: s.difficulty || 'hard',
        topic: s.topic,
        skillTags: s.tags || ['long_turn', 'narrative'],
        prompt: s.questionText,
        cueCardBulletPoints: s.cueCardBulletPoints,
        source: 'sprint_standard' as const,
        version: 1,
        createdAt: s.createdAt
      })),
      ...PART_3_DISCUSSION_BANK.map((s) => ({
        id: s.id,
        module: 'speaking' as const,
        section: 3 as const,
        questionType: s.questionType,
        difficulty: s.difficulty || 'hard',
        topic: s.topic,
        skillTags: s.tags || ['abstract_discussion'],
        prompt: s.questionText,
        source: 'sprint_standard' as const,
        version: 1,
        createdAt: s.createdAt
      }))
    ];

    this.registerQuestions(speakingToRegister);
    this.loadAttempts();
    this.isInitialized = true;
  }

  /**
   * Register a collection of questions into the central repository
   */
  public registerQuestions(items: IELTSQuestion[]): void {
    for (const q of items) {
      if (!this.questions.has(q.id)) {
        // Guarantee stable audioId bound to question id + dialogue/prompt hash
        if (!q.audioId) {
          const sig = q.dialogue && q.dialogue.length > 0
            ? q.dialogue.map(d => `${d.speaker}:${d.text}`).join('|')
            : (q.audioScript || `${q.topic}:${q.prompt}`);
          let hash = 5381;
          for (let i = 0; i < sig.length; i++) {
            hash = (hash * 33) ^ sig.charCodeAt(i);
            hash |= 0;
          }
          q.audioId = `aud_${q.id}_${Math.abs(hash).toString(36)}`;
        }
        this.questions.set(q.id, q);
      }
    }
  }

  /**
   * Retrieve a question by its unique identifier
   */
  public getQuestionById(id: string): IELTSQuestion | undefined {
    return this.questions.get(id);
  }

  /**
   * Retrieve all registered questions
   */
  public getAllQuestions(): IELTSQuestion[] {
    return Array.from(this.questions.values());
  }

  /**
   * Retrieve questions by module and optional section
   */
  public getQuestionsByModule(module: IELTSModuleType, section?: 1 | 2 | 3 | 4): IELTSQuestion[] {
    return Array.from(this.questions.values()).filter((q) => {
      if (q.module !== module) return false;
      if (section !== undefined && q.section !== section) return false;
      return true;
    });
  }

  /**
   * Check if a proposed question is an exact or near duplicate of any existing question
   */
  public checkUniqueness(
    prompt: string,
    excludeId?: string
  ): { isUnique: boolean; similarity: number; matchingQuestion?: IELTSQuestion } {
    let highestSim = 0;
    let mostSimilarQ: IELTSQuestion | undefined;

    for (const q of this.questions.values()) {
      if (excludeId && q.id === excludeId) continue;
      const sim = calculateSemanticSimilarity(prompt, q.prompt);
      if (sim > highestSim) {
        highestSim = sim;
        mostSimilarQ = q;
      }
      if (highestSim >= 0.88) {
        return { isUnique: false, similarity: highestSim, matchingQuestion: mostSimilarQ };
      }
    }

    return {
      isUnique: highestSim < 0.85,
      similarity: highestSim,
      matchingQuestion: mostSimilarQ
    };
  }

  /**
   * Record a candidate's answer attempt for a question
   */
  public recordAttempt(params: {
    questionId: string;
    module: IELTSModuleType;
    questionType?: string;
    topic?: string;
    userAnswer: string | string[];
    isCorrect: boolean;
    score?: number;
    timeSpentSec?: number;
    mistakeType?: string;
    explanation?: string;
    skipMistakeVault?: boolean;
    correctAnswerDisplay?: string;
  }): QuestionAttempt {
    const q = this.questions.get(params.questionId);
    const questionType = params.questionType || q?.questionType || 'general';
    const topic = params.topic || q?.topic || 'General IELTS';

    // Compute spaced repetition interval
    const stats = this.getStatsForQuestion(params.questionId);
    let daysUntilReview = 1;
    if (params.isCorrect) {
      if (stats.timesCorrect >= 2) daysUntilReview = 7;
      else if (stats.timesCorrect === 1) daysUntilReview = 3;
      else daysUntilReview = 2;
    } else {
      daysUntilReview = 1; // Immediate review tomorrow
    }

    const nextReviewDate = Date.now() + daysUntilReview * 24 * 60 * 60 * 1000;

    const attempt: QuestionAttempt = {
      id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      questionId: params.questionId,
      module: params.module,
      questionType,
      topic,
      userAnswer: params.userAnswer,
      isCorrect: params.isCorrect,
      score: params.score !== undefined ? params.score : params.isCorrect ? 1 : 0,
      timeSpentSec: params.timeSpentSec || 0,
      timestamp: Date.now(),
      mistakeType: params.mistakeType,
      explanation: params.explanation || q?.explanation,
      reviewed: false,
      nextReviewDate
    };

    this.attempts.unshift(attempt);
    this.saveAttempts();

    // Mark seen in existing seen IDs tracker
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SEEN);
      const seen = new Set(raw ? JSON.parse(raw) : []);
      seen.add(params.questionId);
      localStorage.setItem(STORAGE_KEY_SEEN, JSON.stringify(Array.from(seen)));
    } catch {}

    // Automatically synchronize with Mistake Vault if wrong (unless caller writes its own formatted entry)
    if (!params.isCorrect && params.explanation && !params.skipMistakeVault) {
      addMistake({
        module: params.module === 'vocabulary' ? 'vocab' : (params.module as any),
        title: `${q?.prompt || params.questionId} (${params.mistakeType || questionType})`,
        userAnswer: Array.isArray(params.userAnswer) ? params.userAnswer.join(', ') : String(params.userAnswer || '(blank)'),
        correctAnswer:
          params.correctAnswerDisplay ||
          (q?.correctAnswer
            ? Array.isArray(q.correctAnswer)
              ? q.correctAnswer.join(' / ')
              : q.correctAnswer
            : '(refer to explanation)'),
        explanation: params.explanation
      });
    }

    // Refresh aggregated stats
    this.updateStatsForQuestion(params.questionId, attempt);

    // Broadcast update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('question_attempt_recorded', { detail: attempt }));
    }

    return attempt;
  }

  /**
   * Retrieves aggregated statistics for a specific question
   */
  public getStatsForQuestion(questionId: string): QuestionStats {
    if (this.questionStats.has(questionId)) {
      return this.questionStats.get(questionId)!;
    }
    const qAttempts = this.attempts.filter((a) => a.questionId === questionId);
    const timesAttempted = qAttempts.length;
    const timesCorrect = qAttempts.filter((a) => a.isCorrect).length;
    const accuracy = timesAttempted > 0 ? (timesCorrect / timesAttempted) * 100 : 0;
    const lastAttempt = qAttempts[0];

    const stats: QuestionStats = {
      timesAttempted,
      timesCorrect,
      accuracy,
      lastAttemptedAt: lastAttempt ? lastAttempt.timestamp : 0,
      isMastered: timesAttempted >= 2 && accuracy >= 80,
      nextReviewAt: lastAttempt?.nextReviewDate || 0,
      mistakeTypes: Array.from(new Set(qAttempts.map((a) => a.mistakeType).filter(Boolean) as string[]))
    };

    this.questionStats.set(questionId, stats);
    return stats;
  }

  /**
   * Updates question stats when a new attempt is recorded
   */
  private updateStatsForQuestion(questionId: string, newAttempt: QuestionAttempt) {
    const prev = this.getStatsForQuestion(questionId);
    const timesAttempted = prev.timesAttempted + 1;
    const timesCorrect = prev.timesCorrect + (newAttempt.isCorrect ? 1 : 0);
    const accuracy = (timesCorrect / timesAttempted) * 100;

    const mistakeTypes = [...prev.mistakeTypes];
    if (newAttempt.mistakeType && !mistakeTypes.includes(newAttempt.mistakeType)) {
      mistakeTypes.push(newAttempt.mistakeType);
    }

    const updated: QuestionStats = {
      timesAttempted,
      timesCorrect,
      accuracy,
      lastAttemptedAt: newAttempt.timestamp,
      isMastered: timesAttempted >= 2 && accuracy >= 80,
      nextReviewAt: newAttempt.nextReviewDate || 0,
      mistakeTypes
    };

    this.questionStats.set(questionId, updated);
  }

  /**
   * Intelligent, adaptive question selector
   * Prioritizes:
   * 1. Fresh questions never attempted before
   * 2. Spaced review questions that are currently due
   * 3. Weak areas / low accuracy topics
   * 4. Topic diversity (avoids repeating the same topic sequentially)
   */
  public selectAdaptiveQuestions(options: {
    module: IELTSModuleType;
    section?: 1 | 2 | 3 | 4;
    questionType?: string;
    count: number;
    mode?: 'practice' | 'mock' | 'review' | 'weakness';
    excludeQuestionIds?: string[];
    excludeAudioIds?: string[];
  }): IELTSQuestion[] {
    const { module, section, questionType, count, mode = 'practice', excludeQuestionIds = [], excludeAudioIds = [] } = options;

    const excludeQSet = new Set(excludeQuestionIds);
    const excludeAudioSet = new Set(excludeAudioIds);

    const pool = Array.from(this.questions.values()).filter((q) => {
      if (q.module !== module) return false;
      if (section !== undefined && q.section !== section) return false;
      if (questionType && q.questionType !== questionType) return false;
      if (excludeQSet.has(q.id)) return false;
      if (q.audioId && excludeAudioSet.has(q.audioId)) return false;
      return true;
    });

    if (pool.length === 0) {
      // If pool was empty due to exclusions, fallback to all available in module/section rather than crashing
      const fallbackPool = Array.from(this.questions.values()).filter((q) => {
        if (q.module !== module) return false;
        if (section !== undefined && q.section !== section) return false;
        if (questionType && q.questionType !== questionType) return false;
        return true;
      });
      if (fallbackPool.length === 0) return [];
      return fallbackPool.slice(0, count);
    }
    if (pool.length <= count) return pool;

    const now = Date.now();
    const candidateScores = pool.map((q) => {
      const stats = this.getStatsForQuestion(q.id);
      let score = 0;

      // Unattempted fresh questions get high base score in practice mode
      if (stats.timesAttempted === 0) {
        score += mode === 'practice' ? 80 : 50;
      } else {
        // Check if spaced review is due
        if (stats.nextReviewAt > 0 && stats.nextReviewAt <= now) {
          score += 90; // High priority review due!
        }

        // Weakness bonus
        if (stats.accuracy < 60) {
          score += mode === 'weakness' ? 95 : 40;
        }

        // Mastered penalty in practice
        if (stats.isMastered) {
          score -= 30;
        }

        // Recency penalty: penalize questions seen in the last 2 hours
        const hoursAgo = (now - stats.lastAttemptedAt) / (1000 * 60 * 60);
        if (hoursAgo < 2) {
          score -= 60;
        } else if (hoursAgo < 24) {
          score -= 20;
        }
      }

      return { question: q, score };
    });

    // Sort descending by adaptive score
    candidateScores.sort((a, b) => b.score - a.score);

    // Apply topic diversity: avoid 3 questions in a row with identical topic
    const selected: IELTSQuestion[] = [];
    const usedTopics: Record<string, number> = {};
    const usedAudios = new Set<string>();

    for (const item of candidateScores) {
      if (selected.length >= count) break;
      const topicCount = usedTopics[item.question.topic] || 0;
      if (topicCount >= 2 && candidateScores.length > count * 2) {
        // Skip over-represented topic if alternatives exist
        continue;
      }
      // Ensure no audioId collision in the selected batch
      if (item.question.audioId && usedAudios.has(item.question.audioId)) {
        continue;
      }

      selected.push(item.question);
      usedTopics[item.question.topic] = topicCount + 1;
      if (item.question.audioId) usedAudios.add(item.question.audioId);
    }

    // Fill remaining if topic diversity or audio filter was too strict
    if (selected.length < count) {
      for (const item of candidateScores) {
        if (selected.length >= count) break;
        if (!selected.some((s) => s.id === item.question.id)) {
          selected.push(item.question);
        }
      }
    }

    return selected;
  }

  /**
   * Retrieves overall progress statistics for a given module
   */
  public getModuleStats(module: IELTSModuleType): ModuleProgressStats {
    const modAttempts = this.attempts.filter((a) => a.module === module);
    const totalAttempted = modAttempts.length;
    const totalCorrect = modAttempts.filter((a) => a.isCorrect).length;
    const overallAccuracy = totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;

    // Estimate IELTS Band (Sprint scale approximation)
    let estimatedBand = 5.0;
    if (overallAccuracy >= 90) estimatedBand = 8.5;
    else if (overallAccuracy >= 82) estimatedBand = 8.0;
    else if (overallAccuracy >= 75) estimatedBand = 7.5;
    else if (overallAccuracy >= 68) estimatedBand = 7.0;
    else if (overallAccuracy >= 60) estimatedBand = 6.5;
    else if (overallAccuracy >= 52) estimatedBand = 6.0;
    else if (overallAccuracy >= 42) estimatedBand = 5.5;

    // Identify weakest topics
    const topicMistakes: Record<string, number> = {};
    const typeMistakes: Record<string, number> = {};
    for (const a of modAttempts) {
      if (!a.isCorrect) {
        topicMistakes[a.topic] = (topicMistakes[a.topic] || 0) + 1;
        typeMistakes[a.questionType] = (typeMistakes[a.questionType] || 0) + 1;
      }
    }

    const weakestTopics = Object.entries(topicMistakes)
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k)
      .slice(0, 3);

    const weakestQuestionTypes = Object.entries(typeMistakes)
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k)
      .slice(0, 3);

    const now = Date.now();
    const dueReviewsCount = this.attempts.filter(
      (a) => a.module === module && !a.isCorrect && a.nextReviewDate && a.nextReviewDate <= now
    ).length;

    return {
      module,
      totalAttempted,
      totalCorrect,
      overallAccuracy: Math.round(overallAccuracy),
      estimatedBand,
      weakestTopics,
      weakestQuestionTypes,
      dueReviewsCount
    };
  }

  /**
   * Retrieves full attempt history with optional filter
   */
  public getHistory(filters?: {
    module?: IELTSModuleType;
    isCorrect?: boolean;
    limit?: number;
  }): QuestionAttempt[] {
    let result = this.attempts;
    if (filters?.module) {
      result = result.filter((a) => a.module === filters.module);
    }
    if (filters?.isCorrect !== undefined) {
      result = result.filter((a) => a.isCorrect === filters.isCorrect);
    }
    if (filters?.limit) {
      result = result.slice(0, filters.limit);
    }
    return result;
  }

  /**
   * Clears attempt history (for resetting practice session)
   */
  public clearHistory(): void {
    this.attempts = [];
    this.questionStats.clear();
    try {
      localStorage.removeItem(STORAGE_KEY_ATTEMPTS);
    } catch {}
  }

  private loadAttempts(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ATTEMPTS);
      if (raw) {
        this.attempts = JSON.parse(raw);
        // Pre-index stats
        for (const a of this.attempts) {
          this.updateStatsForQuestion(a.questionId, a);
        }
      }
    } catch (e) {
      this.attempts = [];
    }
  }

  private saveAttempts(): void {
    try {
      // Keep most recent 1000 attempts in localStorage to avoid storage quota issues
      const slice = this.attempts.slice(0, 1000);
      localStorage.setItem(STORAGE_KEY_ATTEMPTS, JSON.stringify(slice));
    } catch (e) {
    }
  }
}

export const questionEngine = new QuestionEngineService();
