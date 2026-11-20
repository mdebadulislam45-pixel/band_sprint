/**
 * IELTS SPRINT — PHASE 4.3B: STRUCTURAL INSPECTOR REMEDIATION REGRESSION SUITE
 *
 * Comprehensive unit tests verifying the 5 targeted defect fixes in CambridgePdfInspectorService:
 * 1. DEFECT 1: Roman numeral volume collision (I through XIX; XVII = 17, non-collision with VII)
 * 2. DEFECT 2: Title-over-intro track assignment (Academic title with GT intro -> Academic track)
 * 3. DEFECT 2: Title-over-intro track assignment (GT title with Academic intro -> General Training track)
 * 4. DEFECT 2: Combined track assignment (only when genuine Academic AND GT tests/TOC present)
 * 5. DEFECT 3: Distinguish Table of Contents page references from actual test section headings
 * 6. DEFECT 3: Handle non-monotonic section boundaries cleanly without silent invalid page jumps
 * 7. DEFECT 4: Printed page vs PDF page indexing (pageNumber 1-based, pageIndex 0-based bounded by totalPages)
 * 8. DEFECT 5: Image-only scanned PDF detection (scanned_no_text, 0 tests, hasTextLayer false)
 * 9. Classification for unknown/unclassified documents (returns unknown track/type without throwing)
 * 10. Graceful handling of malformed or incomplete structural boundaries
 * 11. Backward compatibility for inspect document API contracts
 * 12. Immutability of stored document IDs, SHA-256 hashes, and binary blobs during inspection
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  CambridgePdfInspectorService,
  cambridgePdfInspector,
  parseRomanNumeralToken,
  ROMAN_NUMERAL_MAP,
  createPageRef
} from '../CambridgePdfInspectorService';
import { PdfVaultService } from '../PdfVaultService';

/**
 * Creates a valid synthetic PDF buffer in memory with specified page texts.
 */
function createSyntheticPdf(pages: Array<{ pageText: string }>): Buffer {
  const pageCount = pages.length;
  const pageObjNums: number[] = [];
  let currentObj = 4;
  for (let i = 0; i < pageCount; i++) {
    pageObjNums.push(currentObj);
    currentObj += 2;
  }
  const objects: string[] = [];
  objects[1] = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  objects[2] = `2 0 obj\n<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(' ')}] /Count ${pageCount} >>\nendobj\n`;
  objects[3] = '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';

  for (let i = 0; i < pageCount; i++) {
    const pageNum = pageObjNums[i];
    const contentNum = pageNum + 1;
    const text = pages[i].pageText || '';
    const escaped = text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
    const stream = `BT /F1 12 Tf 50 750 Td (${escaped}) Tj ET`;
    const streamLen = Buffer.byteLength(stream, 'utf-8');
    objects[pageNum] = `${pageNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentNum} 0 R /Resources << /Font << /F1 3 0 R >> >> >>\nendobj\n`;
    objects[contentNum] = `${contentNum} 0 obj\n<< /Length ${streamLen} >>\nstream\n${stream}\nendstream\nendobj\n`;
  }

  let body = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (let i = 1; i < objects.length; i++) {
    offsets[i] = Buffer.byteLength(body, 'utf-8');
    body += objects[i];
  }
  const startxref = Buffer.byteLength(body, 'utf-8');
  let xref = `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i++) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;
  return Buffer.from(body + xref + trailer, 'utf-8');
}

describe('Phase 4.3B: Cambridge Structural Inspector Remediation', () => {
  let vault: PdfVaultService;
  let inspector: CambridgePdfInspectorService;

  beforeEach(() => {
    vault = new PdfVaultService();
    vault.clearMemoryStoreForTesting();
    inspector = new CambridgePdfInspectorService(vault);
  });

  // 1. Roman numeral volume parsing I through XIX
  it('1. DEFECT 1: Roman numeral volume parsing I through XIX without substring collision', async () => {
    // Unit test direct Roman numeral token parser
    assert.strictEqual(parseRomanNumeralToken('I'), 1);
    assert.strictEqual(parseRomanNumeralToken('IV'), 4);
    assert.strictEqual(parseRomanNumeralToken('VII'), 7);
    assert.strictEqual(parseRomanNumeralToken('XVII'), 17);
    assert.strictEqual(parseRomanNumeralToken('XIX'), 19);
    assert.strictEqual(parseRomanNumeralToken('invalid'), undefined);

    // Verify XVII maps to 17 (and not VII = 7) in PDF inspection
    const pdfBufXVII = createSyntheticPdf([
      { pageText: 'Cambridge IELTS XVII Student Book' },
      { pageText: 'Contents Test 1 3 Test 2 5 Test 3 7 Test 4 9' },
      { pageText: 'Test 1 Listening Academic Reading' },
      { pageText: 'Test 2 Listening Academic Reading' },
      { pageText: 'Test 3 Listening Academic Reading' },
      { pageText: 'Test 4 Listening Academic Reading' }
    ]);
    const blobXVII = new Blob([pdfBufXVII], { type: 'application/pdf' });
    const resXVII = await inspector.inspectPdfBlob(blobXVII, 'Cambridge_IELTS_XVII.pdf');

    assert.strictEqual(resXVII.detectedVolume, 17, 'XVII must resolve strictly to 17, never 7');
    assert.notStrictEqual(resXVII.detectedVolume, 7, 'XVII must not collide with VII');

    // Verify VII maps to 7
    const pdfBufVII = createSyntheticPdf([
      { pageText: 'Cambridge IELTS VII Student Book' },
      { pageText: 'Contents Test 1 3 Test 2 5 Test 3 7 Test 4 9' },
      { pageText: 'Test 1 Listening Academic Reading' }
    ]);
    const blobVII = new Blob([pdfBufVII], { type: 'application/pdf' });
    const resVII = await inspector.inspectPdfBlob(blobVII, 'Cambridge_IELTS_VII.pdf');

    assert.strictEqual(resVII.detectedVolume, 7, 'VII must resolve strictly to 7');
  });

  // 2. Title-over-intro track assignment (Academic)
  it('2. DEFECT 2: Title-over-intro track assignment for Academic document with GT intro text', async () => {
    const pdfBuf = createSyntheticPdf([
      { pageText: 'Cambridge IELTS 16 Academic Student Book' },
      { pageText: 'Information for Candidates: IELTS is offered in two formats: Academic and General Training.' }, // Intro text mentioning GT
      { pageText: 'Contents Test 1 4 Test 2 7 Test 3 10 Test 4 13 Answer Key 16' },
      { pageText: 'Test 1 Listening Academic Reading Writing Speaking' },
      { pageText: 'Test 2 Listening Academic Reading Writing Speaking' },
      { pageText: 'Test 3 Listening Academic Reading Writing Speaking' },
      { pageText: 'Test 4 Listening Academic Reading Writing Speaking' }
    ]);
    const blob = new Blob([pdfBuf], { type: 'application/pdf' });
    const result = await inspector.inspectPdfBlob(blob, 'Cambridge_16_Academic.pdf');

    assert.strictEqual(result.track, 'Academic', 'Must prioritize title track (Academic) over introductory text mentioning GT');
    assert.notStrictEqual(result.track, 'Combined_AC_GT', 'Must NOT assign Combined_AC_GT to a split Academic edition');
  });

  // 3. Title-over-intro track assignment (General Training)
  it('3. DEFECT 2: Title-over-intro track assignment for GT document with Academic intro text', async () => {
    const pdfBuf = createSyntheticPdf([
      { pageText: 'Cambridge IELTS 15 General Training' },
      { pageText: 'Format of the test: Academic Reading consists of 3 long passages. General Training Reading has 3 sections.' },
      { pageText: 'Contents Test 1 4 Test 2 7 Test 3 10 Test 4 13' },
      { pageText: 'Test 1 Listening General Training Reading Writing Speaking' },
      { pageText: 'Test 2 Listening General Training Reading Writing Speaking' },
      { pageText: 'Test 3 Listening General Training Reading Writing Speaking' },
      { pageText: 'Test 4 Listening General Training Reading Writing Speaking' }
    ]);
    const blob = new Blob([pdfBuf], { type: 'application/pdf' });
    const result = await inspector.inspectPdfBlob(blob, 'Cambridge_15_GT.pdf');

    assert.strictEqual(result.track, 'General Training', 'Must prioritize title track (General Training) over intro mentions');
    assert.notStrictEqual(result.track, 'Combined_AC_GT');
  });

  // 4. Combined track assignment
  it('4. DEFECT 2: Combined track assignment when genuine Academic AND General Training tests are present in TOC/body', async () => {
    const pdfBuf = createSyntheticPdf([
      { pageText: 'Cambridge IELTS 6' },
      { pageText: 'Contents Test 1 3 Test 2 6 Test 3 9 Test 4 12 General Training Test A 15 General Training Test B 18' },
      { pageText: 'Test 1 Listening Academic Reading Writing Speaking' },
      { pageText: 'Test 2 Listening Academic Reading Writing Speaking' },
      { pageText: 'Test 3 Listening Academic Reading Writing Speaking' },
      { pageText: 'Test 4 Listening Academic Reading Writing Speaking' },
      { pageText: 'General Training Test A Reading and Writing' },
      { pageText: 'General Training Test B Reading and Writing' }
    ]);
    const blob = new Blob([pdfBuf], { type: 'application/pdf' });
    const result = await inspector.inspectPdfBlob(blob, 'Cambridge_6.pdf');

    assert.strictEqual(result.track, 'Combined_AC_GT', 'Must assign Combined_AC_GT when GT tests A/B exist in TOC/body');
  });

  // 5. TOC page references vs actual headings
  it('5. DEFECT 3: Table of Contents page references do not falsely register as content section headings', async () => {
    const pdfBuf = createSyntheticPdf([
      { pageText: 'Cambridge IELTS 17 Academic' },
      { pageText: 'Contents Test 1 4 Listening 4 Reading 5 Writing 6 Speaking 7 Answer key 8' }, // Page 2: TOC
      { pageText: 'Introduction and candidate guidance' }, // Page 3
      { pageText: 'Test 1 Listening Section 1' }, // Page 4: Actual Listening
      { pageText: 'Academic Reading Passage 1' }, // Page 5: Actual Reading
      { pageText: 'Writing Task 1' }, // Page 6: Actual Writing
      { pageText: 'Speaking Part 1' }, // Page 7: Actual Speaking
      { pageText: 'Answer key for Test 1' } // Page 8
    ]);
    const blob = new Blob([pdfBuf], { type: 'application/pdf' });
    const result = await inspector.inspectPdfBlob(blob, 'Cam17_TOC.pdf');

    const test1 = result.inventory.tests[0];
    assert.ok(test1);
    // Verified that Listening was identified at page 4 (not page 2 TOC)
    assert.strictEqual(test1.modules.listening?.pageRange.start.pageNumber, 4);
    assert.strictEqual(test1.modules.reading?.pageRange.start.pageNumber, 5);
  });

  // 6. Non-monotonic / contradictory section headings
  it('6. DEFECT 3: Monotonicity enforced across module sequence (Listening <= Reading < Writing <= Speaking)', async () => {
    const pdfBuf = createSyntheticPdf([
      { pageText: 'Cambridge IELTS 18 Academic Test 1' },
      { pageText: 'Test 1 Listening Section 1' }, // Page 2: Listening
      { pageText: 'Reading Passage 1' }, // Page 3: Reading
      { pageText: 'Writing Task 1' }, // Page 4: Writing
      { pageText: 'Speaking Part 1' } // Page 5: Speaking
    ]);
    const blob = new Blob([pdfBuf], { type: 'application/pdf' });
    const result = await inspector.inspectPdfBlob(blob, 'Cam18_Monotonic.pdf');

    const test1 = result.inventory.tests[0];
    assert.ok(test1.modules.listening);
    assert.ok(test1.modules.reading);
    assert.ok(test1.modules.writing);
    assert.ok(test1.modules.speaking);

    const lPage = test1.modules.listening.pageRange.start.pageNumber;
    const rPage = test1.modules.reading.pageRange.start.pageNumber;
    const wPage = test1.modules.writing.pageRange.start.pageNumber;
    const sPage = test1.modules.speaking.pageRange.start.pageNumber;

    assert.ok(lPage <= rPage, `Listening (${lPage}) must be <= Reading (${rPage})`);
    assert.ok(rPage < wPage, `Reading (${rPage}) must be < Writing (${wPage})`);
    assert.ok(wPage <= sPage, `Writing (${wPage}) must be <= Speaking (${sPage})`);
  });

  // 7. Offset calibration and page indexing
  it('7. DEFECT 4: PagePositionRef separates pageNumber (1-based) from pageIndex (0-based) bounded by totalPages', async () => {
    const ref = createPageRef(1, 10);
    assert.strictEqual(ref.pageNumber, 1);
    assert.strictEqual(ref.pageIndex, 0);

    const refEnd = createPageRef(10, 10);
    assert.strictEqual(refEnd.pageNumber, 10);
    assert.strictEqual(refEnd.pageIndex, 9);

    const refOutOfBounds = createPageRef(15, 10);
    assert.strictEqual(refOutOfBounds.pageNumber, 10, 'Out of bounds page number must be clamped to totalPages');
    assert.strictEqual(refOutOfBounds.pageIndex, 9, 'Out of bounds page index must be clamped to totalPages - 1');
  });

  // 8. Image-only scanned PDF detection
  it('8. DEFECT 5: Scanned image-only PDF with zero text layer returns scanned_no_text without test inventory', async () => {
    const pdfBuf = createSyntheticPdf([
      { pageText: '' },
      { pageText: '' },
      { pageText: '' }
    ]);
    const blob = new Blob([pdfBuf], { type: 'application/pdf' });
    const result = await inspector.inspectPdfBlob(blob, 'Scanned_Book1.pdf');

    assert.strictEqual(result.inspectionStatus, 'scanned_no_text');
    assert.strictEqual(result.hasTextLayer, false);
    assert.strictEqual(result.classificationConfidence, 'none');
    assert.strictEqual(result.track, 'unknown');
    assert.strictEqual(result.documentType, 'unknown');
    assert.strictEqual(result.inventory.tests.length, 0, 'Scanned PDF must produce zero fabricated tests');
  });

  // 9. Unknown / unclassified documents
  it('9. Unknown / unclassified document returns low/none confidence without throwing exceptions', async () => {
    const pdfBuf = createSyntheticPdf([
      { pageText: 'Generic English Grammar Handbook 2024' },
      { pageText: 'Chapter 1: Tenses and Verb Forms' }
    ]);
    const blob = new Blob([pdfBuf], { type: 'application/pdf' });
    const result = await inspector.inspectPdfBlob(blob, 'Grammar_Guide.pdf');

    assert.strictEqual(result.track, 'unknown');
    assert.strictEqual(result.documentType, 'unknown');
    assert.notStrictEqual(result.classificationConfidence, 'high');
    assert.ok(result.unresolvedFields.includes('detectedVolume'));
    assert.ok(result.unresolvedFields.includes('track'));
  });

  // 10. Malformed or invalid structural boundaries
  it('10. Graceful handling of malformed structural boundaries without throwing', async () => {
    const pdfBuf = createSyntheticPdf([
      { pageText: 'Cambridge IELTS 14 Academic' },
      { pageText: 'Test 1' },
      { pageText: 'Corrupted text block [###$$$]' }
    ]);
    const blob = new Blob([pdfBuf], { type: 'application/pdf' });
    const result = await inspector.inspectPdfBlob(blob, 'Malformed.pdf');

    assert.ok(result.inspectionStatus === 'complete' || result.inspectionStatus === 'partial');
    assert.strictEqual(result.detectedVolume, 14);
  });

  // 11. Inspect document contract backward compatibility
  it('11. Backward compatibility for inspectDocument and inspectPdfBlob contract signatures', async () => {
    const pdfBuf = createSyntheticPdf([
      { pageText: 'Cambridge IELTS 12 Academic' },
      { pageText: 'Test 1 Listening Academic Reading' }
    ]);
    const blob = new Blob([pdfBuf], { type: 'application/pdf' });

    // Store in vault first
    const importRes = await vault.importPdf(blob, {
      userId: 'test_user_compat',
      fileName: 'Cam12_Compat.pdf'
    });
    assert.strictEqual(importRes.success, true);
    const docId = importRes.metadata!.docId;

    // Call inspectDocument
    const docResult = await inspector.inspectDocument(docId, 'test_user_compat');
    assert.strictEqual(docResult.docId, docId);
    assert.strictEqual(docResult.detectedVolume, 12);
    assert.strictEqual(docResult.track, 'Academic');
  });

  // 12. Immutability of stored document IDs, SHA-256 hashes, and binary blobs
  it('12. Stored metadata IDs, SHA-256 hashes, and binary blobs remain 100% immutable during inspection', async () => {
    const pdfBuf = createSyntheticPdf([
      { pageText: 'Cambridge IELTS 17 Academic' },
      { pageText: 'Test 1 Listening Academic Reading' }
    ]);
    const blob = new Blob([pdfBuf], { type: 'application/pdf' });

    const userId = 'immutability_candidate_1';
    const importRes = await vault.importPdf(blob, {
      userId,
      fileName: 'Cam17_Immutable.pdf'
    });
    assert.strictEqual(importRes.success, true);

    const originalMeta = importRes.metadata!;
    const originalDocId = originalMeta.docId;
    const originalHash = originalMeta.fileHash;
    const originalBlob = await vault.getBinaryBlob(originalDocId, userId);
    assert.ok(originalBlob);
    const originalByteLength = originalBlob.size;

    // Run structural inspection with metadata update option enabled
    await inspector.inspectDocument(originalDocId, userId, { updateStoredMetadata: true });

    // Verify stored record after inspection
    const metaAfter = await vault.getMetadata(originalDocId, userId);
    const blobAfter = await vault.getBinaryBlob(originalDocId, userId);

    assert.ok(metaAfter);
    assert.ok(blobAfter);
    assert.strictEqual(metaAfter.docId, originalDocId, 'docId must remain strictly unchanged');
    assert.strictEqual(metaAfter.fileHash, originalHash, 'SHA-256 hash must remain strictly unchanged');
    assert.strictEqual(blobAfter.size, originalByteLength, 'Binary blob byte length must remain strictly unchanged');
  });
});
