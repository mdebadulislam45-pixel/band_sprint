/**
 * IELTS SPRINT — PRIVATE PDF VAULT DATA CONTRACTS
 *
 * Defines strictly typed structures for the client-side local PDF Vault:
 * - Decoupled metadata vs binary blob records
 * - Genuine full-file SHA-256 fingerprinting
 * - User account isolation
 * - Volume, edition, and structural inspection models
 */

import { CanonicalURN } from './contentRegistry';

/**
 * Metadata record stored in "pdf_documents_meta" object store.
 * Lightweight, fast to enumerate, never contains heavy binary blobs.
 */
export interface PrivatePdfDocumentMetadata {
  docId: string;
  urn: CanonicalURN;
  userId: string; // Authenticated candidate UID or 'local_guest'
  fileName: string;
  fileSize: number; // In bytes
  fileHash: string; // Full-file SHA-256 hex digest
  pageCount: number;
  detectedVolume?: number; // e.g. 1 to 19
  detectedEdition?: 'Academic' | 'General Training';
  detectedModules?: Array<'listening' | 'reading' | 'writing' | 'speaking'>;
  tableOfContents?: Array<{
    title: string;
    pageNumber: number;
    testNumber?: 1 | 2 | 3 | 4;
    module?: 'listening' | 'reading' | 'writing' | 'speaking';
  }>;
  createdAt: number;
  lastOpenedAt: number;
  inspection?: SprintPdfInspectionResult;
}

/**
 * Binary blob record stored in "pdf_binary_blobs" object store.
 * Loaded only on-demand when opening or viewing the document.
 */
export interface PrivatePdfBinaryRecord {
  docId: string;
  pdfBlob: Blob;
  byteLength: number;
  mimeType: 'application/pdf';
}

/**
 * Pre-flight validation output before committing to IndexedDB.
 */
export interface PdfValidationResult {
  valid: boolean;
  error?: string;
  pageCount?: number;
  isPasswordProtected?: boolean;
  fileHash?: string;
  detectedVolume?: number;
  detectedEdition?: 'Academic' | 'General Training';
}

/**
 * Storage quota estimate for device/browser capacity management.
 */
export interface VaultStorageEstimate {
  usageBytes: number;
  quotaBytes: number;
  usagePercent: number;
  documentCount: number;
  vaultPdfBytes: number; // Candidate-specific total PDF bytes in this vault partition
}

/**
 * Options provided when importing a PDF file into the vault.
 */
export interface ImportPdfOptions {
  userId?: string;
  fileName?: string;
  overwriteDuplicate?: boolean;
  onProgress?: (stage: 'validating' | 'hashing' | 'inspecting' | 'storing', percent: number) => void;
}

/**
 * Result returned by the PDF vault ingestion engine.
 */
export interface ImportPdfResult {
  success: boolean;
  metadata?: PrivatePdfDocumentMetadata;
  isDuplicate?: boolean;
  existingDoc?: PrivatePdfDocumentMetadata;
  error?: string;
}

// ============================================================================
// PHASE 4.1: CLIENT-SIDE CAMBRIDGE PDF INSPECTION & STRUCTURAL INVENTORY TYPES
// ============================================================================

export type SprintTrack = 'Academic' | 'General Training' | 'Combined_AC_GT' | 'unknown';
export type CambridgeTrack = SprintTrack;

export type SprintDocumentType = 'complete_book' | 'split_edition' | 'individual_test' | 'supplemental_extract' | 'unknown';
export type CambridgeDocumentType = SprintDocumentType;

export type InspectionClassificationConfidence = 'high' | 'medium' | 'low' | 'none';

export type InspectionStatus = 'complete' | 'partial' | 'failed' | 'scanned_no_text' | 'cancelled';

/**
 * References a specific page in a PDF, distinguishing 1-based human page numbers from 0-based PDF.js indices.
 */
export interface PagePositionRef {
  /** 1-based human readable page number (1 .. totalPages) */
  pageNumber: number;
  /** 0-based PDF.js array index (0 .. totalPages - 1) */
  pageIndex: number;
}

export interface DetectedHeading {
  title: string;
  page: PagePositionRef;
  level?: 1 | 2 | 3;
}

export interface DetectedModuleBoundary {
  module: 'listening' | 'reading' | 'writing' | 'speaking';
  pageRange: {
    start: PagePositionRef;
    end?: PagePositionRef;
  };
  subComponents?: Array<{
    subComponentNumber: number; // e.g. Section 1..4, Passage 1..3, Task 1..2, Part 1..3
    label: string;
    page: PagePositionRef;
  }>;
}

export interface DetectedTestBoundary {
  testNumber: 1 | 2 | 3 | 4 | 'GT_A' | 'GT_B';
  testLabel: string;
  track: 'Academic' | 'General Training' | 'unknown';
  pageRange: {
    start: PagePositionRef;
    end?: PagePositionRef;
  };
  modules: {
    listening?: DetectedModuleBoundary;
    reading?: DetectedModuleBoundary;
    writing?: DetectedModuleBoundary;
    speaking?: DetectedModuleBoundary;
  };
}

export interface SprintStructuralInventory {
  tableOfContents?: {
    present: boolean;
    pageRange: {
      start: PagePositionRef;
      end: PagePositionRef;
    };
    rawEntries: string[];
  };
  tests: DetectedTestBoundary[];
  answerKeySection?: {
    present: boolean;
    pageRange: {
      start: PagePositionRef;
      end?: PagePositionRef;
    };
    hasListeningScripts: boolean;
    hasSampleWritingAnswers: boolean;
  };
  listeningScriptsSection?: {
    present: boolean;
    pageRange: {
      start: PagePositionRef;
      end?: PagePositionRef;
    };
  };
  candidateWritingSamplesSection?: {
    present: boolean;
    pageRange: {
      start: PagePositionRef;
      end?: PagePositionRef;
    };
  };
}

export interface SprintPdfInspectionResult {
  docId: string;
  fileName: string;
  fileHash: string;
  totalPages: number;
  hasTextLayer: boolean;
  inspectionStatus: InspectionStatus;
  classificationConfidence: InspectionClassificationConfidence;

  // Classified metadata (strictly evidence-based)
  detectedVolume?: number; // 1 to 19
  track: SprintTrack;
  documentType: SprintDocumentType;

  // Evidence and provenance tracking
  evidence: string[];
  unresolvedFields: string[];

  // Structural inventory (headings & page positions only, NEVER questions, answers, or reading texts)
  inventory: SprintStructuralInventory;

  // Diagnostic metrics
  inspectedPageCount: number;
  durationMs: number;
  errorMessage?: string;
}

export type CambridgeStructuralInventory = SprintStructuralInventory;
export type CambridgePdfInspectionResult = SprintPdfInspectionResult;

export interface InspectPdfOptions {
  userId?: string;
  signal?: AbortSignal;
  maxPagesToInspect?: number;
  onProgress?: (stage: string, percent: number) => void;
  /** Whether to update the stored document metadata with the detected volume and structural summary */
  updateStoredMetadata?: boolean;
}

// ============================================================================
// PHASE 4.2B: BROWSER-BASED PRIVATE PDF VERIFICATION CONTRACTS
// ============================================================================

export type VaultIdentityStatus = 'verified' | 'mismatch' | 'missing_blob' | 'corrupted';

export type VaultStructuralStatus =
  | 'verified'
  | 'partial'
  | 'failed'
  | 'scanned_no_text'
  | 'cancelled'
  | 'skipped';

export interface VerifiedDetectedTestSummary {
  testNumber: 1 | 2 | 3 | 4 | 'GT_A' | 'GT_B';
  testLabel: string;
  track: 'Academic' | 'General Training' | 'unknown';
  listeningStartPage?: number;
  readingStartPage?: number;
  writingStartPage?: number;
  speakingStartPage?: number;
}

export interface VaultVerificationItem {
  docId: string;
  fileName: string;
  userPartition: string;
  fileSize: number; // in bytes
  storedHash: string;
  computedHash: string | null;
  hashMatched: boolean;
  storedPageCount: number;
  actualPageCount: number;
  pageCountMatched: boolean;
  binaryFound: boolean;
  isDuplicateHash: boolean;
  duplicateWithDocIds: string[];

  // Verification classification
  identityStatus: VaultIdentityStatus;
  structuralStatus: VaultStructuralStatus;

  // Sprint classification
  detectedVolume?: number | null;
  track: SprintTrack;
  documentType: SprintDocumentType;
  confidence: InspectionClassificationConfidence;

  // Structural boundaries (metadata & page numbers only, NO question text)
  detectedTests: VerifiedDetectedTestSummary[];
  answerKeyPage?: number | null;
  audioscriptsPage?: number | null;
  candidateWritingSamplesPage?: number | null;
  pageBoundsValid: boolean;

  warnings: string[];
  errors: string[];
  durationMs: number;
}

export interface VaultVerificationSummary {
  totalDocs: number;
  identityVerifiedCount: number;
  structuralVerifiedCount: number;
  missingBinaryCount: number;
  hashMismatchCount: number;
  pageMismatchCount: number;
  duplicateCount: number;
  issuesCount: number;
  allPassed: boolean;
  completedAt: number;
  cancelled: boolean;
  userPartition: string;
}

export interface VaultVerificationReport {
  summary: VaultVerificationSummary;
  items: VaultVerificationItem[];
}

export interface RunVaultVerificationOptions {
  userId: string;
  signal?: AbortSignal;
  onProgress?: (progress: {
    current: number;
    total: number;
    currentFileName: string;
    stage: string;
    percent: number;
  }) => void;
  vaultService?: any;
  inspectorService?: any;
}

