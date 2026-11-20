/**
 * IELTS SPRINT — CENTRAL CONTENT REGISTRY TYPE DEFINITIONS
 *
 * Provides strongly-typed data contracts for the Central Content Registry:
 * - Canonical URN taxonomy and segment parsing models
 * - Provenance and content classification tiers
 * - Adapter interfaces for non-mutating, zero-duplication access to existing content
 * - Standardized adapted views for Listening, Reading, Writing, and Speaking
 */

import { MockExamSet, QuestionItem, ListeningSectionDetail } from '../data/mockExams';
import {
  SprintTestSet,
  SprintListeningContent,
  SprintReadingContent,
  SprintWritingContent,
  SprintSpeakingContent,
  SprintQuestionItem
} from './sprintLibrary';
import { WritingTestSet } from '../components/cdielts/CDIELTSWritingExamRoom';
import { IELTSQuestion } from '../services/QuestionEngine';

/**
 * Standardized Provenance Tiers:
 * - 'sprint_original': In-house calibrated SPRINT content (mock sets, writing rooms, question banks)
 * - 'sprint_catalogue': Pre-configured Sprint 11-21 catalogue items (in-app test generator)
 * - 'sprint_private': Reserved for future private user-supplied PDF imports (client-side only)
 * - 'public_authorized': Official public domain descriptors and public rubrics
 */
export type ContentProvenance =
  | 'sprint_original'
  | 'sprint_catalogue'
  | 'sprint_private'
  | 'public_authorized';

/**
 * Content Family:
 * Categorizes the data source and structural format.
 */
export type ContentFamily =
  | 'mock_exam'
  | 'writing_set'
  | 'sprint_test'
  | 'question_bank'
  | 'speaking_bank';

/**
 * Canonical Uniform Resource Name (URN):
 * Format: urn:ielts:<provenance>:<family>:<setId>[:<subType>:<subId>]
 *
 * Examples:
 * - urn:ielts:sprint_original:mock_exam:sprint-18
 * - urn:ielts:sprint_original:mock_exam:sprint-18:q:1
 * - urn:ielts:sprint_original:writing_set:gt_set1_formal_repair
 * - urn:ielts:sprint_original:writing_set:gt_set1_formal_repair:task:1
 * - urn:ielts:sprint_catalogue:sprint_test:sprint-18-academic-test-1
 * - urn:ielts:sprint_original:question_bank:comprehensive:item:lis_s1_01
 */
export type CanonicalURN = string;

/**
 * Parsed representation of a validated Canonical URN.
 */
export interface ParsedURN {
  raw: CanonicalURN;
  nid: 'ielts';
  provenance: ContentProvenance;
  family: ContentFamily;
  setId: string;
  subType?: 'q' | 'section' | 'passage' | 'task' | 'item' | string;
  subId?: string;
  requestedLegacyId?: string;
}

/**
 * High-level envelope returned when resolving a test or content set.
 */
export interface RegistryResolutionResult<T = unknown> {
  urn: CanonicalURN;
  canonicalId: string;
  requestedLegacyId?: string;
  provenance: ContentProvenance;
  family: ContentFamily;
  setId: string;
  title: string;
  format?: 'Academic' | 'General Training' | 'Universal';
  level?: string;
  supportedModules: Array<'listening' | 'reading' | 'writing' | 'speaking'>;
  rawRef: T;
}

/**
 * Adapted Listening View:
 * Standardized read-only representation across mock sets and Sprint sets.
 */
export interface AdaptedListeningView {
  urn: CanonicalURN;
  title: string;
  sections: Array<{
    sectionNumber: 1 | 2 | 3 | 4;
    title: string;
    isAvailable: boolean;
    audioScript?: string;
    missingReason?: string;
    questions?: Array<QuestionItem | SprintQuestionItem>;
    dialogue?: Array<{
      speaker: string;
      text: string;
      gender?: 'male' | 'female';
      pauseAfterMs?: number;
    }>;
  }>;
}

/**
 * Adapted Reading View:
 * Standardized read-only representation across mock sets and Sprint passages.
 */
export interface AdaptedReadingView {
  urn: CanonicalURN;
  title: string;
  passages: Array<{
    passageNumber: 1 | 2 | 3;
    title: string;
    subheading?: string;
    text: string;
    questions: Array<QuestionItem | SprintQuestionItem>;
  }>;
}

/**
 * Adapted Writing View:
 * Standardized read-only representation across writing exam rooms and Sprint sets.
 */
export interface AdaptedWritingView {
  urn: CanonicalURN;
  title: string;
  format: 'Academic' | 'General Training';
  task1: {
    prompt: string;
    type: string;
    minimumWords: number;
    bulletPoints?: string[];
    letterType?: 'Formal' | 'Semi-Formal' | 'Informal';
    chartTitle?: string;
    chartSubtitle?: string;
    sampleDraft?: string;
    series?: Array<{ name: string; color: string; values: number[] }>;
    categories?: string[];
    tableSummary?: Array<{ country: string; y2010: string; y2018: string; y2025: string; growth: string }>;
  };
  task2: {
    prompt: string;
    title?: string;
    minimumWords: number;
    sampleDraft?: string;
  };
}

/**
 * Adapted Speaking View:
 * Standardized read-only representation across speaking banks and Sprint sets.
 */
export interface AdaptedSpeakingView {
  urn: CanonicalURN;
  title: string;
  part1?: {
    topic: string;
    questions: Array<{ question: string; suggestedIdeas?: string[] }>;
  };
  part2?: {
    topic: string;
    cueCardBulletPoints: string[];
    followUpPrompt?: string;
  };
  part3?: {
    theme: string;
    questions: Array<{ question: string; sampleResponse?: string }>;
  };
}

/**
 * Content Adapter Interface:
 * Each adapter handles a specific family without mutating the underlying data.
 */
export interface IContentAdapter {
  readonly adapterId: string;
  canHandle(urn: ParsedURN): boolean;
  resolve(urn: ParsedURN): Promise<RegistryResolutionResult | null>;
  getListening(urn: ParsedURN): Promise<AdaptedListeningView | null>;
  getReading(urn: ParsedURN): Promise<AdaptedReadingView | null>;
  getWriting(urn: ParsedURN): Promise<AdaptedWritingView | null>;
  getSpeaking(urn: ParsedURN): Promise<AdaptedSpeakingView | null>;
  listAvailableURNs(): CanonicalURN[];
}
