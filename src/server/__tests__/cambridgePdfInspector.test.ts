/**
 * IELTS SPRINT — PHASE 4.1: CLIENT-SIDE CAMBRIDGE PDF INSPECTOR TEST SUITE
 *
 * Automated regression suite testing all 15 requirements from Phase 4.1 specification:
 * 1.  Verified Academic document
 * 2.  Verified General Training document
 * 3.  Verified Combined document (Academic + General Training Tests A/B)
 * 4.  Unknown track (refuses to assume Academic when unproven)
 * 5.  Individual test PDF (contains only Test 1)
 * 6.  Split edition (single track 4-test compilation)
 * 7.  Filename-only false positive (filename hints Cambridge 18 but text lacks proof)
 * 8.  Missing or misleading headings (evidence-based classification)
 * 9.  Scanned PDF with no text layer (hasTextLayer: false, scanned_no_text)
 * 10. Answer-key heading detection (Answer key & Audioscripts location)
 * 11. Cancellation and cleanup (AbortController cancellation & resource release)
 * 12. Large PDF bounded inspection (150-page PDF with selective sampling)
 * 13. Account isolation (unauthorized candidate access rejection)
 * 14. Zero network transmission (zero HTTP/fetch/websocket activity)
 * 15. Zero question or answer content extraction (metadata-only invariant)
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  CambridgePdfInspectorService,
  cambridgePdfInspector
} from '../../services/pdfVault/CambridgePdfInspectorService';
import { PdfVaultService } from '../../services/pdfVault/PdfVaultService';

/**
 * Creates a valid, syntactically authentic multi-page PDF buffer in memory with specified page texts.
 * Purely synthetic fixtures — zero copyrighted content.
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

describe('Phase 4.1: Client-Side Cambridge PDF Inspector Service', () => {
  let vault: PdfVaultService;
  let inspector: CambridgePdfInspectorService;

  beforeEach(() => {
    vault = new PdfVaultService();
    vault.clearMemoryStoreForTesting();
    inspector = new CambridgePdfInspectorService(vault);
  });

  it('1. Verified Academic document (Books 11-19 split format)', async () => {
    const pdfBuf = createSyntheticPdf([
      { pageText: 'Cambridge IELTS 18 Academic with Answers' }, // Page 1: Title
      { pageText: 'Contents Test 1 4 Test 2 8 Test 3 12 Test 4 16 Audioscripts 20 Answer key 24' }, // Page 2: TOC
      { pageText: 'Introduction and examination format' }, // Page 3
      { pageText: 'Test 1 Listening Section 1 Academic Reading Writing Task 1 Speaking Part 1' }, // Page 4
      { pageText: 'Test 1 questions details' }, // Page 5
      { pageText: 'Test 1 continued' }, // Page 6
      { pageText: 'Test 1 end' }, // Page 7
      { pageText: 'Test 2 Listening Academic Reading Writing Speaking' }, // Page 8
      { pageText: 'Test 2 details' }, // Page 9
      { pageText: 'Test 2 continued' }, // Page 10
      { pageText: 'Test 2 end' }, // Page 11
      { pageText: 'Test 3 Listening Academic Reading Writing Speaking' }, // Page 12
      { pageText: 'Test 3 details' }, // Page 13
      { pageText: 'Test 3 continued' }, // Page 14
      { pageText: 'Test 3 end' }, // Page 15
      { pageText: 'Test 4 Listening Academic Reading Writing Speaking' }, // Page 16
      { pageText: 'Test 4 details' }, // Page 17
      { pageText: 'Test 4 continued' }, // Page 18
      { pageText: 'Test 4 end' }, // Page 19
      { pageText: 'Audioscripts for Tests 1 to 4' }, // Page 20
      { pageText: 'Audioscripts continued' }, // Page 21
      { pageText: 'Audioscripts continued' }, // Page 22
      { pageText: 'Audioscripts end' }, // Page 23
      { pageText: 'Answer keys for Tests 1 to 4 and sample candidate writing' }, // Page 24
      { pageText: 'Answer key end' } // Page 25
    ]);

    const blob = new Blob([pdfBuf], { type: 'application/pdf' });
    const result = await inspector.inspectPdfBlob(blob, 'Cambridge_18_Academic.pdf');

    assert.strictEqual(result.hasTextLayer, true);
    assert.strictEqual(result.inspectionStatus, 'complete');
    assert.strictEqual(result.detectedVolume, 18);
    assert.strictEqual(result.track, 'Academic');
    assert.strictEqual(result.documentType, 'split_edition');
    assert.strictEqual(result.classificationConfidence, 'high');
    assert.ok(result.inventory.tableOfContents?.present);
    assert.strictEqual(result.inventory.tests.length, 4);
    assert.ok(result.inventory.answerKeySection?.present);
    assert.ok(result.inventory.listeningScriptsSection?.present);
  });

  it('2. Verified General Training document', async () => {
    const pdfBuf = createSyntheticPdf([
      { pageText: 'Cambridge IELTS 16 General Training' },
      { pageText: 'Contents Test 1 3 Test 2 6 Test 3 9 Test 4 12 Audioscripts 15 Answer key 18' },
      { pageText: 'Test 1 Listening General Training Reading Writing Speaking' },
      { pageText: 'Test 1 details' },
      { pageText: 'Test 1 continued' },
      { pageText: 'Test 2 Listening General Training Reading Writing Speaking' },
      { pageText: 'Test 2 details' },
      { pageText: 'Test 2 continued' },
      { pageText: 'Test 3 Listening General Training Reading Writing Speaking' },
      { pageText: 'Test 3 details' },
      { pageText: 'Test 3 continued' },
      { pageText: 'Test 4 Listening General Training Reading Writing Speaking' },
      { pageText: 'Test 4 details' },
      { pageText: 'Test 4 continued' },
      { pageText: 'Audioscripts' },
      { pageText: 'Audioscripts continued' },
      { pageText: 'Audioscripts end' },
      { pageText: 'Answer key for General Training tests' }
    ]);

    const blob = new Blob([pdfBuf], { type: 'application/pdf' });
    const result = await inspector.inspectPdfBlob(blob, 'Cam16_General_Training.pdf');

    assert.strictEqual(result.inspectionStatus, 'complete');
    assert.strictEqual(result.detectedVolume, 16);
    assert.strictEqual(result.track, 'General Training');
    assert.strictEqual(result.documentType, 'split_edition');
    assert.strictEqual(result.classificationConfidence, 'high');
    assert.strictEqual(result.inventory.tests.length, 4);
  });

  it('3. Verified Combined document (Academic + General Training Tests A/B in Books 1-10 style)', async () => {
    const pdfBuf = createSyntheticPdf([
      { pageText: 'Cambridge IELTS 7 with Answers' },
      {
        pageText:
          'Contents Test 1 4 Test 2 7 Test 3 10 Test 4 13 General Training: Reading and Writing Test A 16 General Training: Reading and Writing Test B 19 Audioscripts 22 Answer key 25'
      },
      { pageText: 'Introduction' },
      { pageText: 'Test 1 Listening Academic Reading Writing Speaking' },
      { pageText: 'Test 1 questions' },
      { pageText: 'Test 1 continued' },
      { pageText: 'Test 2 Listening Academic Reading Writing Speaking' },
      { pageText: 'Test 2 questions' },
      { pageText: 'Test 2 continued' },
      { pageText: 'Test 3 Listening Academic Reading Writing Speaking' },
      { pageText: 'Test 3 questions' },
      { pageText: 'Test 3 continued' },
      { pageText: 'Test 4 Listening Academic Reading Writing Speaking' },
      { pageText: 'Test 4 questions' },
      { pageText: 'Test 4 continued' },
      { pageText: 'General Training Test A Reading and Writing' },
      { pageText: 'GT A details' },
      { pageText: 'GT A continued' },
      { pageText: 'General Training Test B Reading and Writing' },
      { pageText: 'GT B details' },
      { pageText: 'GT B continued' },
      { pageText: 'Audioscripts' },
      { pageText: 'Audioscripts continued' },
      { pageText: 'Audioscripts end' },
      { pageText: 'Answer key for Academic and General Training' }
    ]);

    const blob = new Blob([pdfBuf], { type: 'application/pdf' });
    const result = await inspector.inspectPdfBlob(blob, 'Cambridge_IELTS_7.pdf');

    assert.strictEqual(result.inspectionStatus, 'complete');
    assert.strictEqual(result.detectedVolume, 7);
    assert.strictEqual(result.track, 'Combined_AC_GT', 'Must detect Combined_AC_GT track');
    assert.strictEqual(result.documentType, 'complete_book', 'Must classify as complete_book');
    assert.strictEqual(result.classificationConfidence, 'high');
    assert.ok(result.inventory.tests.length >= 4, 'Must identify all tests');
    assert.ok(result.evidence.some((e) => e.includes('Combined format')));
  });

  it('4. Unknown track (refuses to assume Academic when unproven)', async () => {
    const pdfBuf = createSyntheticPdf([
      { pageText: 'Cambridge IELTS 5 Practice Tests' },
      { pageText: 'Table of Contents Test 1 3 Test 2 5 Test 3 7 Test 4 9' },
      { pageText: 'Test 1 Section 1' },
      { pageText: 'Test 1 continued' },
      { pageText: 'Test 2 Section 1' },
      { pageText: 'Test 2 continued' },
      { pageText: 'Test 3 Section 1' },
      { pageText: 'Test 3 continued' },
      { pageText: 'Test 4 Section 1' }
    ]);

    const blob = new Blob([pdfBuf], { type: 'application/pdf' });
    const result = await inspector.inspectPdfBlob(blob, 'Cambridge_IELTS_5.pdf');

    assert.strictEqual(result.detectedVolume, 5);
    assert.strictEqual(result.track, 'unknown', 'Must refuse to guess Academic without explicit text evidence');
    assert.ok(result.unresolvedFields.includes('track'));
  });

  it('5. Individual test PDF (contains only Test 1)', async () => {
    const pdfBuf = createSyntheticPdf([
      { pageText: 'Cambridge IELTS 17 Academic Test 1' },
      { pageText: 'Test 1 Listening Section 1 Academic Reading Writing Task 1 Speaking Part 1' },
      { pageText: 'Test 1 Section 2' },
      { pageText: 'Test 1 Section 3' },
      { pageText: 'Test 1 Section 4' },
      { pageText: 'Answer key for Test 1' }
    ]);

    const blob = new Blob([pdfBuf], { type: 'application/pdf' });
    const result = await inspector.inspectPdfBlob(blob, 'Cam17_Test1.pdf');

    assert.strictEqual(result.detectedVolume, 17);
    assert.strictEqual(result.track, 'Academic');
    assert.strictEqual(result.documentType, 'individual_test', 'Must classify single test as individual_test');
    assert.strictEqual(result.inventory.tests.length, 1);
  });

  it('6. Split edition (Books 11–19 standard 4-test track edition)', async () => {
    const pdfBuf = createSyntheticPdf([
      { pageText: 'Cambridge IELTS 19 Academic' },
      { pageText: 'Contents Test 1 3 Test 2 5 Test 3 7 Test 4 9 Answer key 11' },
      { pageText: 'Test 1 Listening Academic Reading' },
      { pageText: 'Test 1 end' },
      { pageText: 'Test 2 Listening Academic Reading' },
      { pageText: 'Test 2 end' },
      { pageText: 'Test 3 Listening Academic Reading' },
      { pageText: 'Test 3 end' },
      { pageText: 'Test 4 Listening Academic Reading' },
      { pageText: 'Test 4 end' },
      { pageText: 'Answer key' }
    ]);

    const blob = new Blob([pdfBuf], { type: 'application/pdf' });
    const result = await inspector.inspectPdfBlob(blob, 'Cambridge_19_Academic.pdf');

    assert.strictEqual(result.detectedVolume, 19);
    assert.strictEqual(result.track, 'Academic');
    assert.strictEqual(result.documentType, 'split_edition');
  });

  it('7. Filename-only false positive (filename hints Cambridge 18 but text lacks proof)', async () => {
    const pdfBuf = createSyntheticPdf([
      { pageText: 'University English Syllabus 2024' },
      { pageText: 'Course Outline and Grading Policy' },
      { pageText: 'Weekly Readings and Assignments' }
    ]);

    const blob = new Blob([pdfBuf], { type: 'application/pdf' });
    // Misleading file name
    const result = await inspector.inspectPdfBlob(blob, 'Cambridge_IELTS_18_Academic_Full.pdf');

    // System should report volume 18 as inferred from filename, but confidence must not be high
    assert.strictEqual(result.track, 'unknown', 'Track must remain unknown');
    assert.notStrictEqual(result.classificationConfidence, 'high');
    assert.ok(result.evidence.some((e) => e.includes('Inferred volume 18 from file name')));
  });

  it('8. Missing or misleading headings (evidence-based classification)', async () => {
    const pdfBuf = createSyntheticPdf([
      { pageText: 'Practice Test Materials' },
      { pageText: 'Section One - Conversation' },
      { pageText: 'Section Two - Campus Tour' }
    ]);

    const blob = new Blob([pdfBuf], { type: 'application/pdf' });
    const result = await inspector.inspectPdfBlob(blob, 'my_practice.pdf');

    assert.strictEqual(result.track, 'unknown');
    assert.strictEqual(result.documentType, 'unknown');
    assert.strictEqual(result.classificationConfidence, 'none');
    assert.ok(result.unresolvedFields.includes('detectedVolume'));
    assert.ok(result.unresolvedFields.includes('track'));
  });

  it('9. Scanned PDF with no text layer (hasTextLayer: false, scanned_no_text)', async () => {
    // Generate PDF with empty text streams (simulating scanned raster bitmaps)
    const pdfBuf = createSyntheticPdf([
      { pageText: '' },
      { pageText: '' },
      { pageText: '' }
    ]);

    const blob = new Blob([pdfBuf], { type: 'application/pdf' });
    const result = await inspector.inspectPdfBlob(blob, 'Scanned_Cam_10.pdf');

    assert.strictEqual(result.hasTextLayer, false);
    assert.strictEqual(result.inspectionStatus, 'scanned_no_text');
    assert.strictEqual(result.classificationConfidence, 'none');
    assert.ok(result.evidence.some((e) => e.includes('No usable text layer')));
  });

  it('10. Answer-key heading detection (Answer key & Audioscripts location)', async () => {
    const pdfBuf = createSyntheticPdf([
      { pageText: 'Cambridge IELTS 15 Academic' },
      { pageText: 'Contents Test 1 3 Audioscripts 4 Answer key 5' },
      { pageText: 'Test 1 Academic Reading' },
      { pageText: 'Audioscripts for Test 1' },
      { pageText: 'Answer key and model answers for writing' }
    ]);

    const blob = new Blob([pdfBuf], { type: 'application/pdf' });
    const result = await inspector.inspectPdfBlob(blob, 'Cam15.pdf');

    assert.ok(result.inventory.answerKeySection?.present);
    assert.strictEqual(result.inventory.answerKeySection?.pageRange.start.pageNumber, 5);
    assert.strictEqual(result.inventory.answerKeySection?.pageRange.start.pageIndex, 4);
    assert.ok(result.inventory.answerKeySection?.hasSampleWritingAnswers);
    assert.ok(result.inventory.listeningScriptsSection?.present);
  });

  it('11. Cancellation and cleanup (AbortController cancellation & resource release)', async () => {
    const pdfBuf = createSyntheticPdf([
      { pageText: 'Cambridge IELTS 18' },
      { pageText: 'Test 1' },
      { pageText: 'Test 2' }
    ]);

    const blob = new Blob([pdfBuf], { type: 'application/pdf' });
    const abortController = new AbortController();
    abortController.abort(); // Pre-aborted signal

    const result = await inspector.inspectPdfBlob(blob, 'Cam18.pdf', { signal: abortController.signal });
    assert.strictEqual(result.inspectionStatus, 'cancelled');
    assert.ok(result.evidence.some((e) => e.includes('cancelled by user request')));
  });

  it('12. Large PDF bounded inspection (150-page PDF with selective sampling)', async () => {
    // Generate a 150-page synthetic PDF
    const pages: Array<{ pageText: string }> = [];
    for (let p = 1; p <= 150; p++) {
      if (p === 1) pages.push({ pageText: 'Cambridge IELTS 18 Academic' });
      else if (p === 2) pages.push({ pageText: 'Contents Test 1 10 Test 2 30 Test 3 50 Test 4 70 Audioscripts 110 Answer key 130' });
      else if (p === 10) pages.push({ pageText: 'Test 1 Listening Academic Reading Writing Speaking' });
      else if (p === 30) pages.push({ pageText: 'Test 2 Listening Academic Reading Writing Speaking' });
      else if (p === 50) pages.push({ pageText: 'Test 3 Listening Academic Reading Writing Speaking' });
      else if (p === 70) pages.push({ pageText: 'Test 4 Listening Academic Reading Writing Speaking' });
      else if (p === 110) pages.push({ pageText: 'Audioscripts' });
      else if (p === 130) pages.push({ pageText: 'Answer key with model answers' });
      else pages.push({ pageText: `Page ${p} general body text` });
    }

    const pdfBuf = createSyntheticPdf(pages);
    const blob = new Blob([pdfBuf], { type: 'application/pdf' });

    let progressReported = false;
    const result = await inspector.inspectPdfBlob(blob, 'Large_Cam_18.pdf', {
      onProgress: (stage, percent) => {
        if (percent > 0) progressReported = true;
      }
    });

    assert.strictEqual(result.totalPages, 150);
    assert.strictEqual(result.inspectionStatus, 'complete');
    assert.strictEqual(result.detectedVolume, 18);
    assert.strictEqual(result.track, 'Academic');
    assert.ok(progressReported, 'Progress callback must be invoked');
    // Ensure we did not scan all 150 pages unnecessarily
    assert.ok(result.inspectedPageCount < 150, `Expected bounded scan, inspected ${result.inspectedPageCount}`);
  });

  it('13. Account isolation (unauthorized candidate access rejection)', async () => {
    const pdfBuf = createSyntheticPdf([
      { pageText: 'Cambridge IELTS 18 Academic' },
      { pageText: 'Test 1' }
    ]);
    const blob = new Blob([pdfBuf], { type: 'application/pdf' });

    // Alice imports the document into her partition
    const importRes = await vault.importPdf(blob, {
      userId: 'candidate_alice_123',
      fileName: 'Alice_Cam18.pdf'
    });
    assert.strictEqual(importRes.success, true);
    const docId = importRes.metadata!.docId;

    // Bob attempts to inspect Alice's document
    const bobResult = await inspector.inspectDocument(docId, 'candidate_bob_999');
    assert.strictEqual(bobResult.inspectionStatus, 'failed');
    assert.ok(bobResult.errorMessage?.includes('not found or unauthorized'));

    // Alice inspects her own document successfully
    const aliceResult = await inspector.inspectDocument(docId, 'candidate_alice_123');
    assert.strictEqual(aliceResult.inspectionStatus, 'complete');
    assert.strictEqual(aliceResult.detectedVolume, 18);
  });

  it('14. Zero network transmission during inspection', async () => {
    // Intercept global fetch to verify zero outbound requests
    const originalFetch = globalThis.fetch;
    let fetchCallCount = 0;
    globalThis.fetch = async () => {
      fetchCallCount++;
      throw new Error('Network violation: unexpected fetch during local PDF inspection');
    };

    try {
      const pdfBuf = createSyntheticPdf([
        { pageText: 'Cambridge IELTS 17 Academic' },
        { pageText: 'Test 1 Listening Reading' }
      ]);
      const blob = new Blob([pdfBuf], { type: 'application/pdf' });
      const result = await inspector.inspectPdfBlob(blob, 'Cam17.pdf');

      assert.strictEqual(fetchCallCount, 0, 'Zero network fetch calls must occur during local inspection');
      assert.strictEqual(result.inspectionStatus, 'complete');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('15. Zero question or answer content extraction (metadata-only invariant)', async () => {
    const sensitivePrompt = 'Do you agree or disagree that artificial intelligence will replace teachers?';
    const sensitivePassage = 'In the early 19th century, industrial automation transformed rural agriculture...';
    const sensitiveAnswer = '1. B, 2. FALSE, 3. NOT GIVEN, 4. 250 words';

    const pdfBuf = createSyntheticPdf([
      { pageText: 'Cambridge IELTS 18 Academic' },
      { pageText: `Test 1 Academic Reading ${sensitivePassage} Writing Task 2 ${sensitivePrompt}` },
      { pageText: `Answer key ${sensitiveAnswer}` }
    ]);
    const blob = new Blob([pdfBuf], { type: 'application/pdf' });
    const result = await inspector.inspectPdfBlob(blob, 'Cam18_Privacy.pdf');

    // Serialize entire inspection result to JSON
    const serialized = JSON.stringify(result);

    // Verify none of the sensitive test questions, reading passages, or answers leaked into metadata
    assert.strictEqual(serialized.includes(sensitivePrompt), false, 'Writing prompt must not be stored');
    assert.strictEqual(serialized.includes(sensitivePassage), false, 'Reading passage must not be stored');
    assert.strictEqual(serialized.includes(sensitiveAnswer), false, 'Answer key content must not be stored');
  });
});
