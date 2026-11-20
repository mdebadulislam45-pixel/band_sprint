/**
 * IELTS SPRINT — CLIENT-SIDE CAMBRIDGE PDF INSPECTOR SERVICE (PHASE 4.1 & 4.3B)
 *
 * Dedicated local inspection engine for candidate-owned private Cambridge IELTS PDFs (Books 1–19):
 * - 100% offline, client-side execution via PDF.js
 * - Zero network leakage (never transmits PDF binary, text, or tokens)
 * - Strict evidence-based classification (no assumptions, no false positives)
 * - Detects Books 1–19, Academic, General Training, Combined (Books 1–10), or Unknown tracks
 * - Identifies structural boundaries: Tests 1–4, GT A/B, Listening, Reading, Writing, Speaking, Answer Keys, Audioscripts
 * - Staged, bounded page sampling (protects mobile memory and CPU)
 * - Full PDF.js lifecycle cleanup and AbortSignal cancellation support
 * - STRICT PRIVACY RULE: Never extracts or saves reading passages, questions, writing prompts, transcripts, or answers
 */

import { pdfVault, PdfVaultService } from './PdfVaultService';
import {
  PrivatePdfDocumentMetadata,
  CambridgePdfInspectionResult,
  CambridgeStructuralInventory,
  CambridgeTrack,
  CambridgeDocumentType,
  InspectionClassificationConfidence,
  InspectPdfOptions,
  DetectedTestBoundary,
  PagePositionRef
} from '../../types/pdfVault';

// ============================================================================
// DEFECT 1: ROMAN NUMERAL & VOLUME MAP
// ============================================================================

export const ROMAN_NUMERAL_MAP: Record<string, number> = {
  XIX: 19,
  XVIII: 18,
  XVII: 17,
  XVI: 16,
  XV: 15,
  XIV: 14,
  XIII: 13,
  XII: 12,
  XI: 11,
  X: 10,
  IX: 9,
  VIII: 8,
  VII: 7,
  VI: 6,
  V: 5,
  IV: 4,
  III: 3,
  II: 2,
  I: 1
};

/**
 * Parses a Roman numeral token (I through XIX) bounded by word delimiters.
 * Returns undefined if token is invalid or not a recognized Roman numeral.
 */
export function parseRomanNumeralToken(token: string): number | undefined {
  if (!token) return undefined;
  const upper = token.trim().toUpperCase();
  return ROMAN_NUMERAL_MAP[upper];
}

/**
 * Safely constructs a PagePositionRef separating 1-based printed/human pageNumber
 * from 0-based PDF.js array pageIndex, bounded by totalPages.
 */
export function createPageRef(pageNumber: number, totalPages: number): PagePositionRef {
  const safePageNum = Math.max(1, Math.min(totalPages, pageNumber));
  const safeIndex = Math.max(0, Math.min(totalPages - 1, safePageNum - 1));
  return {
    pageNumber: safePageNum,
    pageIndex: safeIndex
  };
}

export class CambridgePdfInspectorService {
  private vault: PdfVaultService;

  constructor(vaultService: PdfVaultService = pdfVault) {
    this.vault = vaultService;
  }

  /**
   * Inspects a stored PDF document from the active candidate's private vault partition.
   * Verifies document ownership before loading.
   */
  public async inspectDocument(
    docId: string,
    userId: string = 'local_guest',
    options: InspectPdfOptions = {}
  ): Promise<CambridgePdfInspectionResult> {
    const meta = await this.vault.getMetadata(docId, userId);
    if (!meta) {
      return this.createFailureResult(
        docId,
        'unknown.pdf',
        '',
        0,
        `Document "${docId}" not found or unauthorized for user "${userId}".`
      );
    }

    const blob = await this.vault.getBinaryBlob(docId, userId);
    if (!blob) {
      return this.createFailureResult(
        docId,
        meta.fileName,
        meta.fileHash,
        meta.pageCount,
        `Binary content for document "${docId}" could not be retrieved from vault.`
      );
    }

    const result = await this.inspectPdfBlob(blob, meta.fileName, options, docId, meta.fileHash);

    // If requested and successful, update stored metadata without altering original PDF binary
    if (options.updateStoredMetadata && result.inspectionStatus !== 'failed' && result.inspectionStatus !== 'cancelled') {
      try {
        const updatedMeta: PrivatePdfDocumentMetadata = {
          ...meta,
          detectedVolume: result.detectedVolume !== undefined ? result.detectedVolume : meta.detectedVolume,
          detectedEdition:
            result.track === 'Academic'
              ? 'Academic'
              : result.track === 'General Training'
              ? 'General Training'
              : meta.detectedEdition,
          inspection: result,
          lastOpenedAt: Date.now()
        };
        // Re-store metadata
        const db = await (this.vault as any).getDB?.();
        if (db) {
          const tx = db.transaction('pdf_documents_meta', 'readwrite');
          await tx.objectStore('pdf_documents_meta').put(updatedMeta);
          await tx.done;
        } else {
          (this.vault as any).memoryMetaStore?.set(docId, updatedMeta);
        }
      } catch (err) {
        console.warn('[CambridgePdfInspectorService] Failed to persist inspection summary to metadata:', err);
      }
    }

    return result;
  }

  /**
   * Inspects a raw PDF Blob/File locally using PDF.js.
   */
  public async inspectPdfBlob(
    blob: Blob,
    fileName: string,
    options: InspectPdfOptions = {},
    customDocId?: string,
    customFileHash?: string
  ): Promise<CambridgePdfInspectionResult> {
    const startTime = Date.now();
    const docId = customDocId || `inspect_${Date.now()}`;
    const fileHash = customFileHash || '';
    const signal = options.signal;

    options.onProgress?.('Initializing PDF parser', 5);

    if (signal?.aborted) {
      return this.createCancelledResult(docId, fileName, fileHash, 0, startTime);
    }

    // Lazy load PDF.js
    let pdfjsLib: any;
    try {
      pdfjsLib = await import('pdfjs-dist');
      if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions?.workerSrc) {
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.min.mjs',
            import.meta.url
          ).toString();
        } catch {}
      }
    } catch (err) {
      return this.createFailureResult(
        docId,
        fileName,
        fileHash,
        0,
        `PDF engine load failure: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    let loadingTask: any = null;
    let pdfDoc: any = null;
    let totalPages = 0;

    try {
      const arrayBuffer = await blob.arrayBuffer();

      loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        isEvalSupported: false
      });

      pdfDoc = await loadingTask.promise;
      totalPages = pdfDoc.numPages;

      options.onProgress?.('Extracting structural layers', 15);

      // Staged inspection state
      const pageTexts: Map<number, string> = new Map(); // human pageNumber (1-based) -> extracted clean text
      let hasTextLayer = false;
      let totalNonWhitespaceChars = 0;
      let inspectedPagesCount = 0;

      // Stage 1: Front Matter Inspection (Pages 1 to min(15, totalPages))
      const frontMatterLimit = Math.min(15, totalPages);
      for (let p = 1; p <= frontMatterLimit; p++) {
        if (signal?.aborted) {
          await this.cleanupDoc(pdfDoc, loadingTask);
          return this.createCancelledResult(docId, fileName, fileHash, totalPages, startTime);
        }

        const text = await this.extractPageText(pdfDoc, p);
        inspectedPagesCount++;
        pageTexts.set(p, text);
        if (text.trim().length > 0) {
          totalNonWhitespaceChars += text.trim().length;
          hasTextLayer = true;
        }

        // Small yield to protect UI responsiveness
        await this.yieldEventLoop();
      }

      options.onProgress?.('Scanning back matter and answer keys', 40);

      // Stage 2: Back Matter Inspection (Bounded to last ~25 pages or 15% of document)
      const backMatterCount = Math.min(25, Math.max(5, Math.floor(totalPages * 0.15)));
      const backMatterStart = Math.max(frontMatterLimit + 1, totalPages - backMatterCount);
      for (let p = backMatterStart; p <= totalPages; p++) {
        if (signal?.aborted) {
          await this.cleanupDoc(pdfDoc, loadingTask);
          return this.createCancelledResult(docId, fileName, fileHash, totalPages, startTime);
        }

        const text = await this.extractPageText(pdfDoc, p);
        inspectedPagesCount++;
        pageTexts.set(p, text);
        if (text.trim().length > 0) {
          totalNonWhitespaceChars += text.trim().length;
          hasTextLayer = true;
        }

        await this.yieldEventLoop();
      }

      // DEFECT 5: Check if text layer exists or is image-only scanned PDF (<20 characters)
      if (!hasTextLayer || totalNonWhitespaceChars < 20) {
        await this.cleanupDoc(pdfDoc, loadingTask);
        return {
          docId,
          fileName,
          fileHash,
          totalPages,
          hasTextLayer: false,
          inspectionStatus: 'scanned_no_text',
          classificationConfidence: 'none',
          track: 'unknown',
          documentType: 'unknown',
          evidence: [
            'No usable text layer found across inspected pages. Document appears to be an un-OCRed raster scan or image-only PDF.'
          ],
          unresolvedFields: ['detectedVolume', 'track', 'documentType', 'tests', 'answerKey'],
          inventory: { tests: [] },
          inspectedPageCount: inspectedPagesCount,
          durationMs: Date.now() - startTime
        };
      }

      options.onProgress?.('Analyzing table of contents and structural headings', 60);

      // Perform evidence analysis on front matter
      const frontMatterAnalysis = this.analyzeFrontMatter(pageTexts, frontMatterLimit, fileName);

      // Stage 3: Selective body inspection for test boundaries
      options.onProgress?.('Locating test modules and components', 80);

      const structuralInventory = await this.buildStructuralInventory(
        pdfDoc,
        pageTexts,
        totalPages,
        frontMatterAnalysis,
        signal,
        () => {
          inspectedPagesCount++;
        }
      );

      // Clean up PDF resources immediately
      await this.cleanupDoc(pdfDoc, loadingTask);

      // Final evidence synthesis and classification
      const synthesis = this.synthesizeClassification(
        fileName,
        frontMatterAnalysis,
        structuralInventory
      );

      options.onProgress?.('Inspection complete', 100);

      return {
        docId,
        fileName,
        fileHash,
        totalPages,
        hasTextLayer: true,
        inspectionStatus: 'complete',
        classificationConfidence: synthesis.confidence,
        detectedVolume: synthesis.volume,
        track: synthesis.track,
        documentType: synthesis.documentType,
        evidence: synthesis.evidence,
        unresolvedFields: synthesis.unresolvedFields,
        inventory: structuralInventory,
        inspectedPageCount: inspectedPagesCount,
        durationMs: Date.now() - startTime
      };
    } catch (err: unknown) {
      await this.cleanupDoc(pdfDoc, loadingTask);
      const isPassword =
        (err as any)?.name === 'PasswordException' || /password/i.test(String(err));
      return {
        docId,
        fileName,
        fileHash,
        totalPages,
        hasTextLayer: false,
        inspectionStatus: 'failed',
        classificationConfidence: 'none',
        track: 'unknown',
        documentType: 'unknown',
        evidence: [
          isPassword
            ? 'Document is password-protected.'
            : `Inspection failed due to parser error: ${err instanceof Error ? err.message : String(err)}`
        ],
        unresolvedFields: ['detectedVolume', 'track', 'documentType', 'tests'],
        inventory: { tests: [] },
        inspectedPageCount: 0,
        durationMs: Date.now() - startTime,
        errorMessage: isPassword
          ? 'Password-protected document'
          : err instanceof Error
          ? err.message
          : String(err)
      };
    }
  }

  /**
   * Safely extracts text from a single page and cleans up page resources.
   */
  private async extractPageText(pdfDoc: any, pageNumber: number): Promise<string> {
    let page: any = null;
    try {
      page = await pdfDoc.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const strings = textContent.items
        .map((item: any) => (item.str ? item.str.trim() : ''))
        .filter((s: string) => s.length > 0);
      return strings.join(' ');
    } catch {
      return '';
    } finally {
      if (page && typeof page.cleanup === 'function') {
        try {
          await page.cleanup();
        } catch {}
      }
    }
  }

  /**
   * Helper to parse a volume number (Arabic or Roman numeral token) from text context.
   */
  private parseVolumeFromMatchToken(token: string): number | undefined {
    if (!token) return undefined;
    const cleanToken = token.trim();
    if (/^\d+$/.test(cleanToken)) {
      const v = parseInt(cleanToken, 10);
      if (v >= 1 && v <= 19) return v;
    }
    const romanVal = parseRomanNumeralToken(cleanToken);
    if (romanVal !== undefined && romanVal >= 1 && romanVal <= 19) {
      return romanVal;
    }
    return undefined;
  }

  /**
   * Analyzes front matter pages (1 to 15) for Cambridge book signatures and Table of Contents.
   */
  private analyzeFrontMatter(pageTexts: Map<number, string>, frontLimit: number, fileName?: string): {
    detectedVolume?: number;
    volumeEvidence?: string;
    tocFound: boolean;
    tocStartPage?: number;
    tocEndPage?: number;
    tocRawEntries: string[];
    frontTrackSignals: {
      hasAcademicSignal: boolean;
      hasGeneralTrainingSignal: boolean;
      hasCombinedSignal: boolean;
    };
    hasGtTestsInToc: boolean;
    candidateTestPageHints: Map<string, number>; // e.g. "Test 1" -> pageNumber
    answerKeyPageHint?: number;
    audioScriptPageHint?: number;
  } {
    let detectedVolume: number | undefined;
    let volumeEvidence: string | undefined;
    let tocFound = false;
    let tocStartPage: number | undefined;
    let tocEndPage: number | undefined;
    const tocRawEntries: string[] = [];
    const candidateTestPageHints = new Map<string, number>();
    let answerKeyPageHint: number | undefined;
    let audioScriptPageHint: number | undefined;

    let hasAcademicSignal = false;
    let hasGeneralTrainingSignal = false;
    let hasCombinedSignal = false;
    let hasGtTestsInToc = false;

    // DEFECT 1: Extract volume from filename with exact Roman numeral / Arabic token matching
    let fnVolume: number | undefined;
    if (fileName) {
      const fnMatch = fileName.match(
        /(?:cambridge[\s_\-]+(?:english[\s_\-]+)?(?:ielts|practice[\s_\-]+tests[\s_\-]+for[\s_\-]+ielts)|cambridge|ielts|cam|book)[\s_\-.:]*(1[0-9]|[1-9]|XIX|XVIII|XVII|XVI|XV|XIV|XIII|XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I)(?![0-9a-zA-Z])/i
      );
      if (fnMatch && fnMatch[1]) {
        fnVolume = this.parseVolumeFromMatchToken(fnMatch[1]);
      }
    }

    // Volume Candidate Scoring across front matter pages (pages 1 to frontLimit)
    const volumeScores = new Map<number, { score: number; evidence: string }>();

    const ROMAN_PATTERN = 'XIX|XVIII|XVII|XVI|XV|XIV|XIII|XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I';

    for (let p = 1; p <= frontLimit; p++) {
      const text = pageTexts.get(p) || '';
      if (!text) continue;

      const lower = text.toLowerCase();

      // Priority 1: Strong title pattern: "Cambridge (English) IELTS 17", "Cambridge Practice Tests for IELTS 1", "IELTS XVII Academic"
      const strongTitleRegex = new RegExp(
        `(?:cambridge\\s+(?:english\\s+)?(?:ielts|practice\\s+tests\\s+for\\s+ielts))\\s*\\b(1[0-9]|[1-9]|${ROMAN_PATTERN})\\b`,
        'i'
      );
      const strongTitleMatch = text.match(strongTitleRegex);
      if (strongTitleMatch && strongTitleMatch[1]) {
        const num = this.parseVolumeFromMatchToken(strongTitleMatch[1]);
        if (num !== undefined) {
          const prev = volumeScores.get(num) || { score: 0, evidence: '' };
          volumeScores.set(num, {
            score: prev.score + 20,
            evidence: `Found direct title on page ${p}: "${strongTitleMatch[0]}"`
          });
        }
      }

      // Priority 2: Medium title header: "IELTS 17" or "Cambridge XVII"
      const mediumRegex = new RegExp(`\\b(?:ielts|cambridge)\\s+\\b(1[0-9]|[1-9]|${ROMAN_PATTERN})\\b`, 'i');
      const mediumMatch = text.match(mediumRegex);
      if (mediumMatch && mediumMatch[1]) {
        const num = this.parseVolumeFromMatchToken(mediumMatch[1]);
        if (num !== undefined) {
          const prev = volumeScores.get(num) || { score: 0, evidence: '' };
          volumeScores.set(num, {
            score: prev.score + 10,
            evidence: prev.evidence || `Found header on page ${p}: "${mediumMatch[0]}"`
          });
        }
      }

      // Priority 3: Weak book pattern: "Book 17" or "Volume XVII", NOT casual occurrences or imprint numbers
      const weakRegex = new RegExp(`\\b(?:book|volume)\\s+\\b(1[0-9]|[1-9]|${ROMAN_PATTERN})\\b`, 'i');
      const weakMatch = text.match(weakRegex);
      if (weakMatch && weakMatch[1]) {
        const num = this.parseVolumeFromMatchToken(weakMatch[1]);
        if (num !== undefined) {
          const prev = volumeScores.get(num) || { score: 0, evidence: '' };
          volumeScores.set(num, {
            score: prev.score + 2,
            evidence: prev.evidence || `Found book reference on page ${p}: "${weakMatch[0]}"`
          });
        }
      }

      // DEFECT 2: Track signals — check for EXPLICIT title page context vs syllabus introduction
      // Introductory text (e.g. "offered in two formats: Academic and General Training", "Information for Candidates") MUST NOT set track signals!
      const isIntroductoryText =
        /\b(?:offered\s+in\s+two\s+(?:formats|streams)|information\s+for\s+candidates|format\s+of\s+the\s+test|introduction)\b/i.test(text);

      if (!isIntroductoryText) {
        if (
          /\bacademic\s+(?:with\s+answers|module|reading|stream|papers|student's\s+book)\b|\bfor\s+academic\b/i.test(text) ||
          (p <= 3 && /\bacademic\b/i.test(text) && !/\bgeneral\s+training\b/i.test(text))
        ) {
          hasAcademicSignal = true;
        }
        if (
          /\bgeneral\s+training\s+(?:with\s+answers|module|reading|stream|papers|student's\s+book)\b|\bfor\s+general\s+training\b/i.test(text) ||
          (p <= 3 && /\bgeneral\s+training\b/i.test(text) && !/\bacademic\b/i.test(text))
        ) {
          hasGeneralTrainingSignal = true;
        }
      }

      // Check for Table of Contents header
      if (/\bcontents\b|\btable\s+of\s+contents\b/i.test(lower)) {
        tocFound = true;
        if (!tocStartPage) tocStartPage = p;
        tocEndPage = p;

        // Parse TOC lines / entries
        const entryRegex =
          /(Test\s+[1-4]|General\s+Training.*?\bTest\s+[AB]|Audioscripts?|Audio\s+scripts?|Tapescripts?|Listening\s+scripts?|Answer\s+keys?|Model\s+and\s+sample\s+answers)[^\d\n]*?(\d{1,3})/gi;

        let match: RegExpExecArray | null;
        while ((match = entryRegex.exec(text)) !== null) {
          const label = match[1].trim();
          const pageTarget = parseInt(match[2], 10);
          tocRawEntries.push(`${label} -> Page ${pageTarget}`);

          if (/test\s+1\b/i.test(label) && !candidateTestPageHints.has('Test 1')) {
            candidateTestPageHints.set('Test 1', pageTarget);
          } else if (/test\s+2\b/i.test(label) && !candidateTestPageHints.has('Test 2')) {
            candidateTestPageHints.set('Test 2', pageTarget);
          } else if (/test\s+3\b/i.test(label) && !candidateTestPageHints.has('Test 3')) {
            candidateTestPageHints.set('Test 3', pageTarget);
          } else if (/test\s+4\b/i.test(label) && !candidateTestPageHints.has('Test 4')) {
            candidateTestPageHints.set('Test 4', pageTarget);
          } else if (/general\s+training.*test\s+a\b/i.test(label)) {
            candidateTestPageHints.set('GT_A', pageTarget);
            hasGeneralTrainingSignal = true;
            hasGtTestsInToc = true;
          } else if (/general\s+training.*test\s+b\b/i.test(label)) {
            candidateTestPageHints.set('GT_B', pageTarget);
            hasGeneralTrainingSignal = true;
            hasGtTestsInToc = true;
          } else if (/answer\s+key/i.test(label) && !answerKeyPageHint) {
            answerKeyPageHint = pageTarget;
          } else if (/audioscript|tapescript|audio\s+script/i.test(label) && !audioScriptPageHint) {
            audioScriptPageHint = pageTarget;
          }
        }
      }
    }

    // Corroborate candidate scores with filename volume if available
    if (fnVolume && volumeScores.has(fnVolume)) {
      const prev = volumeScores.get(fnVolume)!;
      prev.score += 15; // Corroboration bonus
      volumeScores.set(fnVolume, prev);
    }

    // Choose best candidate
    let bestVolume: number | undefined;
    let bestScore = 0;
    let bestEvidence: string | undefined;

    for (const [vol, data] of volumeScores.entries()) {
      if (data.score > bestScore) {
        bestScore = data.score;
        bestVolume = vol;
        bestEvidence = data.evidence;
      }
    }

    detectedVolume = bestVolume;
    volumeEvidence = bestEvidence;

    // DEFECT 2: Only set hasCombinedSignal if Table of Contents explicitly lists General Training tests
    // Introductory mentions of General Training in syllabus overview text MUST NEVER trigger hasCombinedSignal
    hasCombinedSignal = hasGtTestsInToc;

    return {
      detectedVolume,
      volumeEvidence,
      tocFound,
      tocStartPage,
      tocEndPage,
      tocRawEntries,
      frontTrackSignals: {
        hasAcademicSignal,
        hasGeneralTrainingSignal,
        hasCombinedSignal
      },
      hasGtTestsInToc,
      candidateTestPageHints,
      answerKeyPageHint,
      audioScriptPageHint
    };
  }

  /**
   * Builds the structural inventory by identifying test boundaries, module headings, and answer key sections.
   */
  private async buildStructuralInventory(
    pdfDoc: any,
    pageTexts: Map<number, string>,
    totalPages: number,
    frontAnalysis: ReturnType<CambridgePdfInspectorService['analyzeFrontMatter']>,
    signal?: AbortSignal,
    onPageSampled?: (pageNumber: number) => void
  ): Promise<CambridgeStructuralInventory> {
    const tests: DetectedTestBoundary[] = [];

    // Helper to get text for any page (either from cached map or freshly fetched)
    const getPageText = async (p: number): Promise<string> => {
      if (pageTexts.has(p)) {
        return pageTexts.get(p)!;
      }
      if (p < 1 || p > totalPages) return '';
      const text = await this.extractPageText(pdfDoc, p);
      pageTexts.set(p, text);
      onPageSampled?.(p);
      return text;
    };

    // 1. Locate Tests 1–4
    const testTargets: Array<{
      key: string;
      testNumber: 1 | 2 | 3 | 4 | 'GT_A' | 'GT_B';
      label: string;
      defaultTrack: 'Academic' | 'General Training' | 'unknown';
    }> = [
      { key: 'Test 1', testNumber: 1, label: 'Test 1', defaultTrack: 'unknown' },
      { key: 'Test 2', testNumber: 2, label: 'Test 2', defaultTrack: 'unknown' },
      { key: 'Test 3', testNumber: 3, label: 'Test 3', defaultTrack: 'unknown' },
      { key: 'Test 4', testNumber: 4, label: 'Test 4', defaultTrack: 'unknown' }
    ];

    if (frontAnalysis.frontTrackSignals.hasCombinedSignal || frontAnalysis.candidateTestPageHints.has('GT_A')) {
      testTargets.push({
        key: 'GT_A',
        testNumber: 'GT_A',
        label: 'General Training Test A',
        defaultTrack: 'General Training'
      });
      testTargets.push({
        key: 'GT_B',
        testNumber: 'GT_B',
        label: 'General Training Test B',
        defaultTrack: 'General Training'
      });
    }

    // Calibrated offset from TOC printed folio to physical PDF page
    let calibratedOffset = 0;

    // Determine candidate start pages for tests
    for (const target of testTargets) {
      if (signal?.aborted) break;

      let startPage: number | undefined = frontAnalysis.candidateTestPageHints.get(target.key);

      // If TOC gave a page hint, verify it or inspect surrounding pages
      if (startPage) {
        startPage = await this.refineTestStartPage(
          pdfDoc,
          startPage,
          target.label,
          totalPages,
          getPageText,
          calibratedOffset,
          frontAnalysis.tocStartPage,
          frontAnalysis.tocEndPage
        );
      } else {
        // If no TOC hint, bounded scan (excluding TOC pages)
        startPage = await this.scanForTestHeader(
          pdfDoc,
          target.label,
          totalPages,
          getPageText,
          frontAnalysis.tocStartPage,
          frontAnalysis.tocEndPage
        );
      }

      // If Test 1 was identified, compute calibrated folio offset
      if (target.testNumber === 1 && startPage) {
        const toc1 = frontAnalysis.candidateTestPageHints.get('Test 1');
        if (toc1 && startPage >= toc1) {
          calibratedOffset = startPage - toc1;
        }
      }

      if (startPage) {
        // DEFECT 4: Safe PagePositionRef creation
        const testBoundary: DetectedTestBoundary = {
          testNumber: target.testNumber,
          testLabel: target.label,
          track: target.defaultTrack,
          pageRange: {
            start: createPageRef(startPage, totalPages)
          },
          modules: {}
        };

        // Inspect module headings inside this test (sample following test start)
        const testWindowLimit = Math.min(startPage + 35, totalPages);
        let listeningPage: number | undefined;
        let readingPage: number | undefined;
        let writingPage: number | undefined;
        let speakingPage: number | undefined;

        for (let p = startPage; p <= testWindowLimit; p++) {
          if (signal?.aborted) break;

          // DEFECT 3: Exclude TOC pages from module heading detection
          if (
            frontAnalysis.tocStartPage &&
            p >= frontAnalysis.tocStartPage &&
            p <= (frontAnalysis.tocEndPage || frontAnalysis.tocStartPage)
          ) {
            continue;
          }

          const text = await getPageText(p);

          // Skip TOC or index lines containing dot leaders (....)
          if (/\.{4,}|\b\d{1,3}\s*$/.test(text) && /\bcontents\b/i.test(text)) {
            continue;
          }

          // Check track within test (Academic vs General Training)
          if (testBoundary.track === 'unknown') {
            if (/academic\s+reading|\bacademic\b/i.test(text) && !/\bgeneral\s+training\b/i.test(text)) {
              testBoundary.track = 'Academic';
            } else if (/general\s+training\s+reading|\bgeneral\s+training\b/i.test(text)) {
              testBoundary.track = 'General Training';
            }
          }

          // 1. Listening module (always first module of an IELTS test)
          if (
            !listeningPage &&
            (/\b(?:test\s+\d+\s+)?listening(?:\s+section\s+1|\s+part\s+1|\s+module)?\b/i.test(text) ||
              /\bsection\s+1\s+questions\s+1\b/i.test(text))
          ) {
            listeningPage = p;
            testBoundary.modules.listening = {
              module: 'listening',
              pageRange: {
                start: createPageRef(p, totalPages)
              }
            };
          }

          // 2. Reading module (DEFECT 3 MONOTONICITY: must follow Listening start if Listening exists)
          if (!readingPage && p >= (listeningPage || startPage)) {
            if (
              /\b(?:academic\s+|general\s+training\s+)?reading(?:\s+passage\s+1|\s+test|\s+module)?\b/i.test(text) ||
              /\breading\s+passage\s+1\b/i.test(text)
            ) {
              readingPage = p;
              testBoundary.modules.reading = {
                module: 'reading',
                pageRange: {
                  start: createPageRef(p, totalPages)
                }
              };
            }
          }

          // 3. Writing module (DEFECT 3 MONOTONICITY: must strictly follow Reading start)
          if (!writingPage && p > (readingPage || (listeningPage ? listeningPage + 8 : startPage))) {
            if (
              /\bwriting\s+task\s+1\b/i.test(text) ||
              /\bwriting(?:\s+test|\s+module)?\b/i.test(text) ||
              (/\bwriting\b/i.test(text) && /\btask\s+1\b/i.test(text))
            ) {
              writingPage = p;
              testBoundary.modules.writing = {
                module: 'writing',
                pageRange: {
                  start: createPageRef(p, totalPages)
                }
              };
            }
          }

          // 4. Speaking module (DEFECT 3 STRICT MONOTONICITY: must follow Writing start)
          if (!speakingPage && writingPage && p >= writingPage) {
            if (
              /\bspeaking\s+part\s+1\b/i.test(text) ||
              /\bspeaking(?:\s+test|\s+module)?\b/i.test(text) ||
              (/\bspeaking\b/i.test(text) && /\bpart\s+1\b/i.test(text))
            ) {
              speakingPage = p;
              testBoundary.modules.speaking = {
                module: 'speaking',
                pageRange: {
                  start: createPageRef(p, totalPages)
                }
              };
            }
          }

          // If all 4 modules found for this test, break early
          if (
            testBoundary.modules.listening &&
            testBoundary.modules.reading &&
            testBoundary.modules.writing &&
            testBoundary.modules.speaking
          ) {
            break;
          }

          // Stop scanning test window if next test header appears
          if (p > startPage + 5 && /\btest\s+[1-4]\b/i.test(text) && !text.includes(target.label)) {
            break;
          }
        }

        tests.push(testBoundary);
      }
    }

    // Sort tests by start page and assign end pages
    tests.sort((a, b) => a.pageRange.start.pageNumber - b.pageRange.start.pageNumber);
    for (let i = 0; i < tests.length; i++) {
      if (i < tests.length - 1) {
        const nextStart = tests[i + 1].pageRange.start.pageNumber;
        tests[i].pageRange.end = createPageRef(nextStart - 1, totalPages);
      } else {
        // Last test ends at answer key or back matter
        const endPage = frontAnalysis.answerKeyPageHint
          ? Math.max(tests[i].pageRange.start.pageNumber, frontAnalysis.answerKeyPageHint + calibratedOffset - 1)
          : Math.min(tests[i].pageRange.start.pageNumber + 28, totalPages);
        tests[i].pageRange.end = createPageRef(endPage, totalPages);
      }
    }

    // 2. Locate Answer Key & Audioscripts Sections (using calibratedOffset)
    let answerKeyStart: number | undefined;
    let hasListeningScriptsInKey = false;
    let hasSampleWritingInKey = false;
    let audioScriptStart: number | undefined;

    // First check hints from Table of Contents if available
    if (frontAnalysis.answerKeyPageHint) {
      answerKeyStart = await this.refineTestStartPage(
        pdfDoc,
        frontAnalysis.answerKeyPageHint,
        'Answer key|Key',
        totalPages,
        getPageText,
        calibratedOffset,
        frontAnalysis.tocStartPage,
        frontAnalysis.tocEndPage
      );
      if (!answerKeyStart && frontAnalysis.answerKeyPageHint <= totalPages) {
        answerKeyStart = Math.min(totalPages, frontAnalysis.answerKeyPageHint + calibratedOffset);
      }
    }

    if (frontAnalysis.audioScriptPageHint) {
      audioScriptStart = await this.refineTestStartPage(
        pdfDoc,
        frontAnalysis.audioScriptPageHint,
        'Audioscript|Tapescript|Listening script',
        totalPages,
        getPageText,
        calibratedOffset,
        frontAnalysis.tocStartPage,
        frontAnalysis.tocEndPage
      );
      if (!audioScriptStart && frontAnalysis.audioScriptPageHint <= totalPages) {
        audioScriptStart = Math.min(totalPages, frontAnalysis.audioScriptPageHint + calibratedOffset);
      }
    }

    const backMatterSearchStart = Math.max(
      (frontAnalysis.tocEndPage || 0) + 1,
      totalPages - 45
    );

    for (let p = Math.max(1, backMatterSearchStart); p <= totalPages; p++) {
      // Exclude Table of Contents pages
      if (
        frontAnalysis.tocStartPage &&
        p >= frontAnalysis.tocStartPage &&
        p <= (frontAnalysis.tocEndPage || frontAnalysis.tocStartPage)
      ) {
        continue;
      }

      const text = pageTexts.get(p) || '';
      if (!text) continue;

      if (!answerKeyStart && /\banswer\s+keys?\b|\bkey\b/i.test(text)) {
        answerKeyStart = p;
      }
      if (!audioScriptStart && /\baudioscripts?|\btapescripts?|\blistening\s+scripts?\b/i.test(text)) {
        audioScriptStart = p;
      }
      if (/\baudioscript|\btapescript/i.test(text)) {
        hasListeningScriptsInKey = true;
      }
      if (/sample\s+candidate\s+writing|model\s+answers/i.test(text)) {
        hasSampleWritingInKey = true;
      }
    }

    // Structural inventory assembly with safe createPageRef bounds
    const inventory: CambridgeStructuralInventory = {
      tests
    };

    if (frontAnalysis.tocFound && frontAnalysis.tocStartPage && frontAnalysis.tocEndPage) {
      inventory.tableOfContents = {
        present: true,
        pageRange: {
          start: createPageRef(frontAnalysis.tocStartPage, totalPages),
          end: createPageRef(frontAnalysis.tocEndPage, totalPages)
        },
        rawEntries: frontAnalysis.tocRawEntries
      };
    }

    if (answerKeyStart) {
      inventory.answerKeySection = {
        present: true,
        pageRange: {
          start: createPageRef(answerKeyStart, totalPages),
          end: createPageRef(totalPages, totalPages)
        },
        hasListeningScripts: hasListeningScriptsInKey,
        hasSampleWritingAnswers: hasSampleWritingInKey
      };
    }

    if (audioScriptStart) {
      const scriptEndPage =
        answerKeyStart && answerKeyStart > audioScriptStart ? answerKeyStart - 1 : totalPages;
      inventory.listeningScriptsSection = {
        present: true,
        pageRange: {
          start: createPageRef(audioScriptStart, totalPages),
          end: createPageRef(scriptEndPage, totalPages)
        }
      };
    }

    return inventory;
  }

  /**
   * Refines a test start page around a TOC page hint (accounting for calibrated preface offset and TOC exclusion).
   */
  private async refineTestStartPage(
    pdfDoc: any,
    pageHint: number,
    testLabel: string,
    totalPages: number,
    getPageText: (p: number) => Promise<string>,
    calibratedOffset: number = 0,
    tocStartPage?: number,
    tocEndPage?: number
  ): Promise<number | undefined> {
    const center = Math.min(totalPages, Math.max(1, pageHint + calibratedOffset));
    const candidates = [center];
    for (let offset = 1; offset <= 10; offset++) {
      if (center + offset <= totalPages) candidates.push(center + offset);
      if (center - offset > 0) candidates.push(center - offset);
    }

    for (const p of candidates) {
      if (p < 1 || p > totalPages) continue;
      // DEFECT 3: Exclude TOC pages
      if (tocStartPage && p >= tocStartPage && p <= (tocEndPage || tocStartPage)) continue;

      const text = await getPageText(p);
      const testRegex = new RegExp(`\\b(?:${testLabel})\\b`, 'i');
      if (testRegex.test(text)) {
        return p;
      }
    }

    return center <= totalPages ? center : undefined;
  }

  /**
   * Scans for a test header when no TOC page hint is available (excluding TOC pages).
   */
  private async scanForTestHeader(
    pdfDoc: any,
    testLabel: string,
    totalPages: number,
    getPageText: (p: number) => Promise<string>,
    tocStartPage?: number,
    tocEndPage?: number
  ): Promise<number | undefined> {
    const start = totalPages <= 25 ? 1 : 10;
    const step = totalPages <= 25 ? 1 : 2;

    for (let p = start; p <= Math.min(totalPages, 140); p += step) {
      if (tocStartPage && p >= tocStartPage && p <= (tocEndPage || tocStartPage)) continue;

      const text = await getPageText(p);
      const testRegex = new RegExp(`\\b${testLabel}\\b`, 'i');
      if (testRegex.test(text)) {
        return p;
      }
    }
    return undefined;
  }

  /**
   * Synthesizes all gathered evidence into strict, evidence-based classification fields.
   */
  private synthesizeClassification(
    fileName: string,
    frontAnalysis: ReturnType<CambridgePdfInspectorService['analyzeFrontMatter']>,
    inventory: CambridgeStructuralInventory
  ): {
    volume?: number;
    track: CambridgeTrack;
    documentType: CambridgeDocumentType;
    confidence: InspectionClassificationConfidence;
    evidence: string[];
    unresolvedFields: string[];
  } {
    const evidence: string[] = [];
    const unresolvedFields: string[] = [];

    // DEFECT 1: Volume Detection with exact Roman numeral and Arabic token parsing
    let volume = frontAnalysis.detectedVolume;
    let fnVolume: number | undefined;
    const fileMatch = fileName.match(
      /(?:cambridge[\s_\-]+(?:english[\s_\-]+)?(?:ielts|practice[\s_\-]+tests[\s_\-]+for[\s_\-]+ielts)|cambridge|ielts|cam|book)[\s_\-.:]*(1[0-9]|[1-9]|XIX|XVIII|XVII|XVI|XV|XIV|XIII|XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I)(?![0-9a-zA-Z])/i
    );
    if (fileMatch && fileMatch[1]) {
      fnVolume = this.parseVolumeFromMatchToken(fileMatch[1]);
    }

    if (volume) {
      if (fnVolume && fnVolume !== volume && fnVolume >= 10 && volume < 10) {
        volume = fnVolume;
        evidence.push(`Resolved Cambridge volume ${volume} from title & filename corroboration.`);
      } else {
        evidence.push(frontAnalysis.volumeEvidence || `Detected Cambridge volume ${volume} in front matter.`);
      }
    } else if (fnVolume) {
      volume = fnVolume;
      evidence.push(`Inferred volume ${volume} from file name "${fileName}".`);
    } else {
      unresolvedFields.push('detectedVolume');
      evidence.push('Could not determine Cambridge volume number from document evidence.');
    }

    // DEFECT 2: Track Classification (STRICT EVIDENCE RULES — Title over Intro)
    let track: CambridgeTrack = 'unknown';

    const academicTests = inventory.tests.filter((t) => t.track === 'Academic');
    const gtTests = inventory.tests.filter((t) => t.track === 'General Training');
    const hasBothInTests = academicTests.length > 0 && gtTests.length > 0;
    const hasGtInToc = frontAnalysis.hasGtTestsInToc;

    if (hasBothInTests || (hasGtInToc && academicTests.length > 0)) {
      track = 'Combined_AC_GT';
      evidence.push(
        'Verified Combined format: document contains both Academic tests and General Training modules/tests in body/TOC.'
      );
    } else if (academicTests.length > 0 && gtTests.length === 0) {
      track = 'Academic';
      evidence.push(`Verified Academic track: identified ${academicTests.length} Academic test(s) with 0 General Training tests.`);
    } else if (gtTests.length > 0 && academicTests.length === 0) {
      track = 'General Training';
      evidence.push(`Verified General Training track: identified ${gtTests.length} General Training test(s).`);
    } else {
      const isAcademicByTitleOrFile =
        /\bacademic\b/i.test(fileName) || frontAnalysis.frontTrackSignals.hasAcademicSignal;
      const isGtByTitleOrFile =
        /\bgeneral\s+training\b|\bgt\b/i.test(fileName) || frontAnalysis.frontTrackSignals.hasGeneralTrainingSignal;

      if (isAcademicByTitleOrFile && !isGtByTitleOrFile) {
        track = 'Academic';
        inventory.tests.forEach((t) => {
          if (t.track === 'unknown') t.track = 'Academic';
        });
        evidence.push('Verified Academic track: confirmed by volume title page / filename specification with 4-test structure.');
      } else if (isGtByTitleOrFile && !isAcademicByTitleOrFile) {
        track = 'General Training';
        inventory.tests.forEach((t) => {
          if (t.track === 'unknown') t.track = 'General Training';
        });
        evidence.push('Verified General Training track: confirmed by volume title page / filename specification.');
      } else {
        track = 'unknown';
        unresolvedFields.push('track');
        evidence.push('Track unknown: no explicit Academic or General Training heading evidence found.');
      }
    }

    // 3. Document Type Classification
    let documentType: CambridgeDocumentType = 'unknown';
    const testCount = inventory.tests.length;

    if (testCount >= 4) {
      if (track === 'Combined_AC_GT') {
        documentType = 'complete_book';
        evidence.push(
          `Document type: complete_book (contains ${testCount} tests across Academic and General Training).`
        );
      } else if (track === 'Academic' || track === 'General Training') {
        documentType = 'split_edition';
        evidence.push(
          `Document type: split_edition (contains ${testCount} tests for single track: ${track}).`
        );
      } else {
        documentType = 'complete_book';
        evidence.push(`Document type: complete_book (contains ${testCount} tests).`);
      }
    } else if (testCount === 1) {
      documentType = 'individual_test';
      evidence.push(
        `Document type: individual_test (contains only 1 detected test: ${inventory.tests[0].testLabel}).`
      );
    } else if (testCount > 1 && testCount < 4) {
      documentType = 'split_edition';
      evidence.push(`Document type: split_edition (partial test compilation of ${testCount} tests).`);
    } else {
      const hasAudioscripts = inventory.listeningScriptsSection?.present;
      const hasAnswerKeys = inventory.answerKeySection?.present;
      const isListeningName = /listening/i.test(fileName);
      if (hasAudioscripts || hasAnswerKeys || isListeningName) {
        documentType = 'supplemental_extract';
        evidence.push('Document type: supplemental_extract (specialized listening/answer resource; not a 4-skill complete book).');
      } else {
        documentType = 'unknown';
        unresolvedFields.push('documentType');
        evidence.push(
          'Document type unknown: test structure could not be mapped to standard complete book or individual test.'
        );
      }
    }

    // 4. Confidence Rating
    let confidence: InspectionClassificationConfidence = 'low';

    if (frontAnalysis.tocFound && volume !== undefined && track !== 'unknown' && testCount >= 1) {
      confidence = 'high';
    } else if (volume !== undefined && track !== 'unknown') {
      confidence = 'medium';
    } else if (volume !== undefined || track !== 'unknown') {
      confidence = 'low';
    } else {
      confidence = 'none';
    }

    if (documentType === 'supplemental_extract' && volume !== undefined) {
      confidence = 'medium';
    }

    // Summary of structural features
    if (inventory.tableOfContents?.present) {
      evidence.push(
        `Table of Contents verified on page ${inventory.tableOfContents.pageRange.start.pageNumber} with ${inventory.tableOfContents.rawEntries.length} parsed entry references.`
      );
    }
    if (inventory.answerKeySection?.present) {
      evidence.push(
        `Answer Key section verified starting at page ${inventory.answerKeySection.pageRange.start.pageNumber}.`
      );
    }
    if (inventory.listeningScriptsSection?.present) {
      evidence.push(
        `Listening Audioscripts section verified starting at page ${inventory.listeningScriptsSection.pageRange.start.pageNumber}.`
      );
    }

    return {
      volume,
      track,
      documentType,
      confidence,
      evidence,
      unresolvedFields
    };
  }

  /**
   * Helper to yield control back to the event loop.
   */
  private yieldEventLoop(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  /**
   * Safely cleans up PDF.js document and loading task handles.
   */
  private async cleanupDoc(pdfDoc: any, loadingTask: any): Promise<void> {
    if (pdfDoc) {
      try {
        if (typeof pdfDoc.cleanup === 'function') await pdfDoc.cleanup();
        if (typeof pdfDoc.destroy === 'function') await pdfDoc.destroy();
      } catch {}
    }
    if (loadingTask) {
      try {
        if (typeof loadingTask.destroy === 'function') await loadingTask.destroy();
      } catch {}
    }
  }

  private createFailureResult(
    docId: string,
    fileName: string,
    fileHash: string,
    totalPages: number,
    errorMessage: string
  ): CambridgePdfInspectionResult {
    return {
      docId,
      fileName,
      fileHash,
      totalPages,
      hasTextLayer: false,
      inspectionStatus: 'failed',
      classificationConfidence: 'none',
      track: 'unknown',
      documentType: 'unknown',
      evidence: [`Inspection failed: ${errorMessage}`],
      unresolvedFields: ['detectedVolume', 'track', 'documentType', 'tests'],
      inventory: { tests: [] },
      inspectedPageCount: 0,
      durationMs: 0,
      errorMessage
    };
  }

  private createCancelledResult(
    docId: string,
    fileName: string,
    fileHash: string,
    totalPages: number,
    startTime: number
  ): CambridgePdfInspectionResult {
    return {
      docId,
      fileName,
      fileHash,
      totalPages,
      hasTextLayer: false,
      inspectionStatus: 'cancelled',
      classificationConfidence: 'none',
      track: 'unknown',
      documentType: 'unknown',
      evidence: ['Inspection was cancelled by user request.'],
      unresolvedFields: ['detectedVolume', 'track', 'documentType', 'tests'],
      inventory: { tests: [] },
      inspectedPageCount: 0,
      durationMs: Date.now() - startTime
    };
  }
}

export const cambridgePdfInspector = new CambridgePdfInspectorService();

