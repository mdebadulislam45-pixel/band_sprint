/**
 * IELTS SPRINT — PHASE 4.2B: BROWSER-BASED PRIVATE PDF VAULT VERIFICATION TEST SUITE
 *
 * Automated regression suite testing all 8 requirements from Phase 4.2B specification:
 * 1. Verification runner executes against IndexedDB-stored documents.
 * 2. Missing binary blob is detected and reported.
 * 3. Corrupted hash (SHA-256 mismatch) is detected and reported.
 * 4. Page count mismatch is detected and reported.
 * 5. Duplicate SHA-256 hashes across multiple documents are detected and flagged.
 * 6. User isolation: documents belonging to another user are not accessed.
 * 7. Cancellation via AbortSignal terminates cleanly and cleans up resources.
 * 8. Zero network calls during verification.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { runVaultVerification } from '../../services/pdfVault/VaultVerificationRunner';
import { PdfVaultService, computeFullFileSHA256 } from '../../services/pdfVault/PdfVaultService';
import { PdfInspectorService } from '../../services/pdfVault/PdfInspectorService';
import { PrivatePdfDocumentMetadata, PrivatePdfBinaryRecord } from '../../types/pdfVault';

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

describe('Phase 4.2B: Browser-Based Private PDF Vault Verification Runner', () => {
  let vault: PdfVaultService;
  let inspector: PdfInspectorService;

  beforeEach(() => {
    vault = new PdfVaultService();
    vault.clearMemoryStoreForTesting();
    inspector = new PdfInspectorService(vault);
  });

  it('1. Verification runner executes against stored documents and verifies identity & structure', async () => {
    const pdfBuf = createSyntheticPdf([
      { pageText: 'IELTS 18 Academic with Answers' }, // Page 1: Title
      { pageText: 'Contents Test 1 4 Test 2 8 Audioscripts 12 Answer key 14' }, // Page 2: TOC
      { pageText: 'Introduction to IELTS 18' }, // Page 3
      { pageText: 'Test 1 Listening Section 1 Academic Reading Writing Speaking' }, // Page 4
      { pageText: 'Test 1 questions' }, // Page 5
      { pageText: 'Test 1 continued' }, // Page 6
      { pageText: 'Test 1 end' }, // Page 7
      { pageText: 'Test 2 Listening Academic Reading Writing Speaking' }, // Page 8
      { pageText: 'Test 2 details' }, // Page 9
      { pageText: 'Test 2 end' }, // Page 10
      { pageText: 'Test 2 more' }, // Page 11
      { pageText: 'Audioscripts Test 1 Test 2' }, // Page 12
      { pageText: 'Audioscripts continued' }, // Page 13
      { pageText: 'Answer key Test 1 Test 2' } // Page 14
    ]);

    const blob = new Blob([pdfBuf], { type: 'application/pdf' });
    const importRes = await vault.importPdf(blob, {
      userId: 'test_candidate_1',
      fileName: 'Sprint_18_Academic.pdf'
    });
    assert.strictEqual(importRes.success, true, 'Import should succeed');
    assert(importRes.metadata, 'Metadata must exist');

    const report = await runVaultVerification({
      userId: 'test_candidate_1',
      vaultService: vault,
      inspectorService: inspector
    });

    assert.strictEqual(report.summary.totalDocs, 1);
    assert.strictEqual(report.summary.identityVerifiedCount, 1);
    assert.strictEqual(report.summary.missingBinaryCount, 0);
    assert.strictEqual(report.summary.hashMismatchCount, 0);
    assert.strictEqual(report.summary.duplicateCount, 0);

    const item = report.items[0];
    assert.strictEqual(item.docId, importRes.metadata.docId);
    assert.strictEqual(item.fileName, 'Sprint_18_Academic.pdf');
    assert.strictEqual(item.userPartition, 'test_candidate_1');
    assert.strictEqual(item.identityStatus, 'verified');
    assert.strictEqual(item.hashMatched, true);
    assert.strictEqual(item.pageCountMatched, true);
    assert.strictEqual(item.actualPageCount, 14);
    assert.strictEqual(item.binaryFound, true);
    assert.strictEqual(item.detectedVolume, 18);
    assert.strictEqual(item.track, 'Academic');
    assert.strictEqual(item.pageBoundsValid, true);
    assert.strictEqual(item.errors.length, 0);
  });

  it('2. Missing binary blob in IndexedDB is detected and reported', async () => {
    // Manually insert metadata without corresponding binary blob record
    const orphanDocId = 'orphan_doc_no_blob';
    const fakeMeta: PrivatePdfDocumentMetadata = {
      docId: orphanDocId,
      urn: 'urn:ielts:sprint:book18:test1' as any,
      userId: 'test_candidate_orphan',
      fileName: 'MissingBlob.pdf',
      fileSize: 1024,
      fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      pageCount: 10,
      createdAt: Date.now(),
      lastOpenedAt: Date.now()
    };

    (vault as any).memoryMetaStore.set(orphanDocId, fakeMeta);

    const report = await runVaultVerification({
      userId: 'test_candidate_orphan',
      vaultService: vault,
      inspectorService: inspector
    });

    assert.strictEqual(report.summary.totalDocs, 1);
    assert.strictEqual(report.summary.missingBinaryCount, 1);
    assert.strictEqual(report.summary.identityVerifiedCount, 0);

    const item = report.items[0];
    assert.strictEqual(item.binaryFound, false);
    assert.strictEqual(item.identityStatus, 'missing_blob');
    assert.strictEqual(item.structuralStatus, 'skipped');
    assert(item.errors.some((e) => e.includes('Missing binary')));
  });

  it('3. Corrupted hash (SHA-256 mismatch) is detected and reported', async () => {
    const pdfBuf = createSyntheticPdf([{ pageText: 'Hello world' }]);
    const blob = new Blob([pdfBuf], { type: 'application/pdf' });
    const realHash = await computeFullFileSHA256(blob);

    const docId = 'tampered_hash_doc';
    const tamperedHash = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

    const fakeMeta: PrivatePdfDocumentMetadata = {
      docId,
      urn: 'urn:ielts:custom:tampered' as any,
      userId: 'test_candidate_tamper',
      fileName: 'Tampered.pdf',
      fileSize: blob.size,
      fileHash: tamperedHash,
      pageCount: 1,
      createdAt: Date.now(),
      lastOpenedAt: Date.now()
    };

    const binaryRecord: PrivatePdfBinaryRecord = {
      docId,
      pdfBlob: blob,
      byteLength: blob.size,
      mimeType: 'application/pdf'
    };

    (vault as any).memoryMetaStore.set(docId, fakeMeta);
    (vault as any).memoryBlobStore.set(docId, binaryRecord);

    const report = await runVaultVerification({
      userId: 'test_candidate_tamper',
      vaultService: vault,
      inspectorService: inspector
    });

    assert.strictEqual(report.summary.hashMismatchCount, 1);
    const item = report.items[0];
    assert.strictEqual(item.hashMatched, false);
    assert.strictEqual(item.identityStatus, 'mismatch');
    assert.strictEqual(item.computedHash, realHash);
    assert(item.errors.some((e) => e.includes('SHA-256 hash mismatch')));
  });

  it('4. Page count mismatch is detected and reported', async () => {
    const pdfBuf = createSyntheticPdf([{ pageText: 'Page 1' }, { pageText: 'Page 2' }]);
    const blob = new Blob([pdfBuf], { type: 'application/pdf' });
    const realHash = await computeFullFileSHA256(blob);

    const docId = 'page_mismatch_doc';
    const fakeMeta: PrivatePdfDocumentMetadata = {
      docId,
      urn: 'urn:ielts:custom:page_mismatch' as any,
      userId: 'test_candidate_page',
      fileName: 'PageMismatch.pdf',
      fileSize: blob.size,
      fileHash: realHash,
      pageCount: 99, // Stored as 99, actual is 2
      createdAt: Date.now(),
      lastOpenedAt: Date.now()
    };

    const binaryRecord: PrivatePdfBinaryRecord = {
      docId,
      pdfBlob: blob,
      byteLength: blob.size,
      mimeType: 'application/pdf'
    };

    (vault as any).memoryMetaStore.set(docId, fakeMeta);
    (vault as any).memoryBlobStore.set(docId, binaryRecord);

    const report = await runVaultVerification({
      userId: 'test_candidate_page',
      vaultService: vault,
      inspectorService: inspector
    });

    assert.strictEqual(report.summary.pageMismatchCount, 1);
    const item = report.items[0];
    assert.strictEqual(item.pageCountMatched, false);
    assert.strictEqual(item.actualPageCount, 2);
    assert.strictEqual(item.storedPageCount, 99);
    assert(item.errors.some((e) => e.includes('Page count mismatch')));
  });

  it('5. Duplicate SHA-256 hashes across multiple documents are detected and flagged', async () => {
    const pdfBuf = createSyntheticPdf([{ pageText: 'Common Shared Sprint PDF Content' }]);
    const blob = new Blob([pdfBuf], { type: 'application/pdf' });
    const realHash = await computeFullFileSHA256(blob);

    const doc1: PrivatePdfDocumentMetadata = {
      docId: 'dup_doc_1',
      urn: 'urn:ielts:custom:dup1' as any,
      userId: 'test_candidate_dup',
      fileName: 'Copy1.pdf',
      fileSize: blob.size,
      fileHash: realHash,
      pageCount: 1,
      createdAt: Date.now(),
      lastOpenedAt: Date.now()
    };
    const doc2: PrivatePdfDocumentMetadata = {
      docId: 'dup_doc_2',
      urn: 'urn:ielts:custom:dup2' as any,
      userId: 'test_candidate_dup',
      fileName: 'Copy2.pdf',
      fileSize: blob.size,
      fileHash: realHash,
      pageCount: 1,
      createdAt: Date.now(),
      lastOpenedAt: Date.now()
    };

    (vault as any).memoryMetaStore.set('dup_doc_1', doc1);
    (vault as any).memoryMetaStore.set('dup_doc_2', doc2);
    (vault as any).memoryBlobStore.set('dup_doc_1', { docId: 'dup_doc_1', pdfBlob: blob, byteLength: blob.size, mimeType: 'application/pdf' });
    (vault as any).memoryBlobStore.set('dup_doc_2', { docId: 'dup_doc_2', pdfBlob: blob, byteLength: blob.size, mimeType: 'application/pdf' });

    const report = await runVaultVerification({
      userId: 'test_candidate_dup',
      vaultService: vault,
      inspectorService: inspector
    });

    assert.strictEqual(report.summary.totalDocs, 2);
    assert.strictEqual(report.summary.duplicateCount, 2);

    const item1 = report.items.find((i) => i.docId === 'dup_doc_1')!;
    const item2 = report.items.find((i) => i.docId === 'dup_doc_2')!;

    assert.strictEqual(item1.isDuplicateHash, true);
    assert.deepStrictEqual(item1.duplicateWithDocIds, ['dup_doc_2']);
    assert(item1.warnings.some((w) => w.includes('Duplicate file: SHA-256 identical')));

    assert.strictEqual(item2.isDuplicateHash, true);
    assert.deepStrictEqual(item2.duplicateWithDocIds, ['dup_doc_1']);
  });

  it('6. User isolation: documents belonging to another user are not accessed', async () => {
    const pdfBuf = createSyntheticPdf([{ pageText: 'Alice Sprint PDF' }]);
    const blobAlice = new Blob([pdfBuf], { type: 'application/pdf' });
    await vault.importPdf(blobAlice, {
      userId: 'user_alice',
      fileName: 'AliceDoc.pdf'
    });

    const pdfBufBob = createSyntheticPdf([{ pageText: 'Bob Sprint PDF' }]);
    const blobBob = new Blob([pdfBufBob], { type: 'application/pdf' });
    await vault.importPdf(blobBob, {
      userId: 'user_bob',
      fileName: 'BobDoc.pdf'
    });

    const reportAlice = await runVaultVerification({
      userId: 'user_alice',
      vaultService: vault,
      inspectorService: inspector
    });

    assert.strictEqual(reportAlice.summary.totalDocs, 1);
    assert.strictEqual(reportAlice.summary.userPartition, 'user_alice');
    assert.strictEqual(reportAlice.items[0].fileName, 'AliceDoc.pdf');

    const reportBob = await runVaultVerification({
      userId: 'user_bob',
      vaultService: vault,
      inspectorService: inspector
    });

    assert.strictEqual(reportBob.summary.totalDocs, 1);
    assert.strictEqual(reportBob.summary.userPartition, 'user_bob');
    assert.strictEqual(reportBob.items[0].fileName, 'BobDoc.pdf');
  });

  it('7. Cancellation via AbortSignal terminates cleanly and cleans up resources', async () => {
    const pdfBuf = createSyntheticPdf([{ pageText: 'Cancel Test Page' }]);
    const blob = new Blob([pdfBuf], { type: 'application/pdf' });
    await vault.importPdf(blob, {
      userId: 'test_candidate_cancel',
      fileName: 'CancelDoc.pdf'
    });

    const abortController = new AbortController();
    abortController.abort(); // Pre-abort signal

    const report = await runVaultVerification({
      userId: 'test_candidate_cancel',
      signal: abortController.signal,
      vaultService: vault,
      inspectorService: inspector
    });

    assert.strictEqual(report.summary.cancelled, true);
    assert.strictEqual(report.items.length, 0);
  });

  it('8. Zero network calls during verification execution', async () => {
    const pdfBuf = createSyntheticPdf([
      { pageText: 'IELTS 17 Academic' },
      { pageText: 'Contents Test 1 4' },
      { pageText: 'Intro' },
      { pageText: 'Test 1 Listening' }
    ]);
    const blob = new Blob([pdfBuf], { type: 'application/pdf' });
    await vault.importPdf(blob, {
      userId: 'candidate_privacy_guard',
      fileName: 'Sprint17.pdf'
    });

    let networkCallAttempted = false;
    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = () => {
      networkCallAttempted = true;
      return Promise.reject(new Error('Network access forbidden during vault verification'));
    };

    try {
      const report = await runVaultVerification({
        userId: 'candidate_privacy_guard',
        vaultService: vault,
        inspectorService: inspector
      });

      assert.strictEqual(networkCallAttempted, false, 'Zero network fetch calls should occur during verification');
      assert.strictEqual(report.summary.totalDocs, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
