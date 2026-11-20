/**
 * IELTS SPRINT — PRIVATE PDF VAULT CONTENT REGISTRY ADAPTER (PHASE 4.5)
 *
 * Connects the Central Content Registry to candidate-owned private PDFs stored
 * in the local IndexedDB vault ("ielts_sprint_pdf_vault_v1"):
 * - Handles only "urn:ielts:sprint_private:*" URNs
 * - Uses PdfVaultService as the sole source of private PDF metadata and binary access
 * - Never loads PDF binary data during ordinary metadata resolution (rawRef is metadata-only)
 * - Strict user/account isolation: requests resolve only within the active user's partition
 * - Explicit not-found results: returns null when a private document is missing or deleted
 * - Strict anti-fallback rule: NEVER falls back to public Sprint catalogue data
 * - Structured inspection integration: extracts verified page position references from doc.inspection
 * - Copyright protection: returns neutral visual reference descriptions without reproducing text
 */

import {
  IContentAdapter,
  ParsedURN,
  RegistryResolutionResult,
  AdaptedListeningView,
  AdaptedReadingView,
  AdaptedWritingView,
  AdaptedSpeakingView,
  CanonicalURN
} from '../../../types/contentRegistry';
import {
  PrivatePdfDocumentMetadata,
  PdfVaultService,
  pdfVault,
  DetectedTestBoundary
} from '../../pdfVault';
import { getActiveUser } from '../../../utils/userStorage';

export class PrivatePdfVaultAdapter implements IContentAdapter {
  readonly adapterId = 'private_pdf_vault_adapter';
  private vaultService: PdfVaultService;
  private userIdResolver: () => string;

  constructor(
    vaultService: PdfVaultService = pdfVault,
    userIdResolver: () => string = () => getActiveUser()?.id || 'local_guest'
  ) {
    this.vaultService = vaultService;
    this.userIdResolver = userIdResolver;
  }

  /**
   * Handles exclusively URNs with provenance "sprint_private".
   */
  public canHandle(urn: ParsedURN): boolean {
    return urn.provenance === 'sprint_private';
  }

  /**
   * Resolves a document from the private vault matching the URN.
   * Matches by docId, subId, or detected volume number for the active candidate.
   * Returns null if not found (strictly zero fallback to public catalogue).
   */
  private async findPrivateDocument(urn: ParsedURN): Promise<PrivatePdfDocumentMetadata | null> {
    const currentUserId = this.userIdResolver();

    // 1. Direct docId lookup if specified in subId (e.g. urn:ielts:sprint_private:sprint_test:sprint-18:doc:<docId>)
    const targetDocId = urn.subType === 'doc' && urn.subId ? urn.subId : urn.setId;
    const directMeta = await this.vaultService.getMetadata(targetDocId, currentUserId);
    if (directMeta) {
      return directMeta;
    }

    // 2. Lookup candidate's private documents for a matching volume / slug
    const userDocs = await this.vaultService.listDocuments(currentUserId);
    if (!userDocs || userDocs.length === 0) {
      return null;
    }

    // Direct docId match in user's list
    const docIdMatch = userDocs.find((d) => d.docId === targetDocId);
    if (docIdMatch) {
      return docIdMatch;
    }

    // Volume-based match (e.g. setId === 'sprint-18' or 'sprint-18-academic-test-1')
    const volMatch = urn.setId.match(/^sprint-(\d+)/i);
    if (volMatch && volMatch[1]) {
      const volumeNum = parseInt(volMatch[1], 10);
      const isGt = /general[\s_-]*training|\bgt\b/i.test(urn.setId);
      const isAcad = /academic|\bac\b/i.test(urn.setId);

      const matchedDoc = userDocs.find((d) => {
        if (d.detectedVolume !== volumeNum) return false;
        if (isGt && d.detectedEdition === 'Academic') return false;
        if (isAcad && d.detectedEdition === 'General Training') return false;
        return true;
      });

      if (matchedDoc) {
        return matchedDoc;
      }
    }

    // Explicitly return null if document is missing from user's vault
    return null;
  }

  /**
   * Extracts targeted test boundary from document structural inspection inventory.
   */
  private getTargetedTestBoundary(
    doc: PrivatePdfDocumentMetadata,
    urn: ParsedURN
  ): DetectedTestBoundary | null {
    if (!doc.inspection?.inventory?.tests || doc.inspection.inventory.tests.length === 0) {
      return null;
    }

    const tests = doc.inspection.inventory.tests;

    // Check if URN explicitly specifies a test number
    let requestedTestNum: 1 | 2 | 3 | 4 | 'GT_A' | 'GT_B' | null = null;
    if (urn.subType === 'test' && urn.subId) {
      if (urn.subId === 'gt_a' || urn.subId === 'GT_A') requestedTestNum = 'GT_A';
      else if (urn.subId === 'gt_b' || urn.subId === 'GT_B') requestedTestNum = 'GT_B';
      else {
        const num = parseInt(urn.subId, 10);
        if ([1, 2, 3, 4].includes(num)) requestedTestNum = num as 1 | 2 | 3 | 4;
      }
    }

    if (!requestedTestNum) {
      const testMatch = urn.setId.match(/test-(\d+|gt-a|gt-b)/i);
      if (testMatch && testMatch[1]) {
        const raw = testMatch[1].toLowerCase();
        if (raw === 'gt-a') requestedTestNum = 'GT_A';
        else if (raw === 'gt-b') requestedTestNum = 'GT_B';
        else {
          const num = parseInt(raw, 10);
          if ([1, 2, 3, 4].includes(num)) requestedTestNum = num as 1 | 2 | 3 | 4;
        }
      }
    }

    if (requestedTestNum) {
      const matchedTest = tests.find((t) => t.testNumber === requestedTestNum);
      if (matchedTest) return matchedTest;
    }

    // Fallback to first verified test boundary
    return tests[0] || null;
  }

  /**
   * High-level metadata resolution.
   * Never loads binary blob data into RAM.
   */
  public async resolve(urn: ParsedURN): Promise<RegistryResolutionResult<PrivatePdfDocumentMetadata> | null> {
    const doc = await this.findPrivateDocument(urn);
    if (!doc) {
      // Missing or deleted private document: return null explicitly
      return null;
    }

    return {
      urn: urn.raw,
      canonicalId: doc.docId,
      requestedLegacyId: urn.requestedLegacyId || urn.setId,
      provenance: 'sprint_private',
      family: urn.family,
      setId: doc.docId,
      title: doc.fileName || `Private IELTS ${doc.detectedVolume || ''}`,
      format: doc.detectedEdition || 'Academic',
      level: 'B2-C1',
      supportedModules: doc.detectedModules || ['listening', 'reading', 'writing', 'speaking'],
      rawRef: doc // Metadata-only envelope, never binary blob
    };
  }

  /**
   * Standardized Listening View for Private PDF.
   */
  public async getListening(urn: ParsedURN): Promise<AdaptedListeningView | null> {
    const doc = await this.findPrivateDocument(urn);
    if (!doc) return null;

    const isScanned = doc.inspection?.inspectionStatus === 'scanned_no_text';
    const testBoundary = this.getTargetedTestBoundary(doc, urn);
    const listeningBoundary = testBoundary?.modules?.listening;

    const startPage = listeningBoundary?.pageRange?.start?.pageNumber;
    const isAvailable = !isScanned && Boolean(listeningBoundary);

    return {
      urn: urn.raw,
      title: `${doc.fileName} - Listening${testBoundary ? ` (${testBoundary.testLabel})` : ''}`,
      sections: ([1, 2, 3, 4] as const).map((secNum) => {
        const subComp = listeningBoundary?.subComponents?.find((s) => s.subComponentNumber === secNum);
        const secPage = subComp?.page?.pageNumber || startPage;

        return {
          sectionNumber: secNum,
          title: isAvailable
            ? `Section ${secNum}${secPage ? ` (Page ${secPage})` : ''}`
            : `Section ${secNum} (Unavailable)`,
          isAvailable,
          missingReason: !isAvailable
            ? isScanned
              ? 'Scanned image-only PDF document — visual page navigation only.'
              : 'Listening module boundaries not verified in structural inspection.'
            : undefined,
          questions: []
        };
      })
    };
  }

  /**
   * Standardized Reading View for Private PDF.
   */
  public async getReading(urn: ParsedURN): Promise<AdaptedReadingView | null> {
    const doc = await this.findPrivateDocument(urn);
    if (!doc) return null;

    const isScanned = doc.inspection?.inspectionStatus === 'scanned_no_text';
    const testBoundary = this.getTargetedTestBoundary(doc, urn);
    const readingBoundary = testBoundary?.modules?.reading;

    const startPage = readingBoundary?.pageRange?.start?.pageNumber;
    const isAvailable = !isScanned && Boolean(readingBoundary);

    return {
      urn: urn.raw,
      title: `${doc.fileName} - Reading${testBoundary ? ` (${testBoundary.testLabel})` : ''}`,
      passages: ([1, 2, 3] as const).map((passNum) => {
        const subComp = readingBoundary?.subComponents?.find((s) => s.subComponentNumber === passNum);
        const passPage = subComp?.page?.pageNumber || startPage;

        return {
          passageNumber: passNum,
          title: `Passage ${passNum}${passPage ? ` (Page ${passPage})` : ''}`,
          text: isAvailable
            ? `Visual reference document: Refer to PDF page ${passPage || 'viewer'} for reading passage text.`
            : isScanned
            ? 'Scanned image-only document. Open PDF viewer to read passage.'
            : 'Reading passage boundaries not verified in document inspection.',
          questions: []
        };
      })
    };
  }

  /**
   * Standardized Writing View for Private PDF.
   */
  public async getWriting(urn: ParsedURN): Promise<AdaptedWritingView | null> {
    const doc = await this.findPrivateDocument(urn);
    if (!doc) return null;

    const format = doc.detectedEdition || 'Academic';
    const testBoundary = this.getTargetedTestBoundary(doc, urn);
    const writingBoundary = testBoundary?.modules?.writing;

    const startPage = writingBoundary?.pageRange?.start?.pageNumber;
    const task1Page = writingBoundary?.subComponents?.find((s) => s.subComponentNumber === 1)?.page?.pageNumber || startPage;
    const task2Page = writingBoundary?.subComponents?.find((s) => s.subComponentNumber === 2)?.page?.pageNumber || (task1Page ? task1Page + 1 : undefined);

    return {
      urn: urn.raw,
      title: `${doc.fileName} - Writing${testBoundary ? ` (${testBoundary.testLabel})` : ''}`,
      format,
      task1: {
        prompt: task1Page
          ? `Visual reference document: Refer to PDF page ${task1Page} for Task 1 prompt.`
          : `Task 1 prompt from private document "${doc.fileName}".`,
        type: format === 'Academic' ? 'Academic Chart / Graph' : 'General Training Letter',
        minimumWords: 150
      },
      task2: {
        prompt: task2Page
          ? `Visual reference document: Refer to PDF page ${task2Page} for Task 2 prompt.`
          : `Task 2 essay question from private document "${doc.fileName}".`,
        minimumWords: 250
      }
    };
  }

  /**
   * Standardized Speaking View for Private PDF.
   */
  public async getSpeaking(urn: ParsedURN): Promise<AdaptedSpeakingView | null> {
    const doc = await this.findPrivateDocument(urn);
    if (!doc) return null;

    const testBoundary = this.getTargetedTestBoundary(doc, urn);
    const speakingBoundary = testBoundary?.modules?.speaking;
    const startPage = speakingBoundary?.pageRange?.start?.pageNumber;

    return {
      urn: urn.raw,
      title: `${doc.fileName} - Speaking${testBoundary ? ` (${testBoundary.testLabel})` : ''}`,
      part1: {
        topic: startPage ? `Speaking Part 1 (Page ${startPage})` : `Speaking Part 1 (${doc.fileName})`,
        questions: [{ question: 'Refer to private PDF viewer for Part 1 questions.' }]
      },
      part2: {
        topic: startPage ? `Speaking Part 2 Cue Card (Page ${startPage})` : `Speaking Part 2 (${doc.fileName})`,
        cueCardBulletPoints: ['Refer to private PDF viewer for cue card topic and bullet points.']
      },
      part3: {
        theme: startPage ? `Speaking Part 3 Discussion (Page ${startPage})` : `Speaking Part 3 (${doc.fileName})`,
        questions: [{ question: 'Refer to private PDF viewer for Part 3 discussion questions.' }]
      }
    };
  }

  /**
   * Private user documents must never be enumerated in the public global registry index.
   */
  public listAvailableURNs(): CanonicalURN[] {
    return [];
  }
}
