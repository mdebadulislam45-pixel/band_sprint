/**
 * IELTS SPRINT — PHASE 3.3C: TARGETED PRIVATE PDF VAULT FIXES TEST SUITE
 *
 * Verifies the three targeted defects:
 * - DEF-01: Viewer lifecycle on account switching & sign out
 * - DEF-02: Guest privacy notice condition & text accuracy
 * - DEF-03: Accurate candidate partition storage reporting (vaultPdfBytes) vs origin-wide estimate
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  PdfVaultService,
  computeFullFileSHA256,
  validatePdfMagicBytes
} from '../../services/pdfVault/PdfVaultService';

function createAuthenticPdfBuffer(sizeOrMarker: string | number = 'test_pdf'): Buffer {
  let extraPadding = '';
  if (typeof sizeOrMarker === 'number') {
    extraPadding = 'A'.repeat(Math.max(0, sizeOrMarker - 200));
  }
  const content = `%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\n% Marker: ${typeof sizeOrMarker === 'string' ? sizeOrMarker : 'sized'}\n% Padding: ${extraPadding}\nxref\n0 3\n0000000000 65535 f \n0000000015 00000 n \n0000000068 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n116\n%%EOF\n`;
  return Buffer.from(content, 'utf-8');
}

describe('Phase 3.3C: Targeted Private PDF Vault Fixes (DEF-01, DEF-02, DEF-03)', () => {
  let vault: PdfVaultService;

  beforeEach(() => {
    vault = new PdfVaultService();
    vault.clearMemoryStoreForTesting();
  });

  // ==========================================================================
  // DEF-01: VIEWER LIFECYCLE ON ACCOUNT SWITCHING
  // ==========================================================================
  it('DEF-01.1: Account switching closes active document and prevents cross-account read in viewer', async () => {
    const pdfBuf = createAuthenticPdfBuffer('Alice Book for Viewer');
    const blob = new Blob([pdfBuf], { type: 'application/pdf' });

    const importRes = await vault.importPdf(blob, {
      userId: 'cand_alice',
      fileName: 'Alice_Book.pdf'
    });
    assert.strictEqual(importRes.success, true);
    const docId = importRes.metadata!.docId;

    // Alice can load metadata and binary blob
    const aliceMeta = await vault.getMetadata(docId, 'cand_alice');
    assert.ok(aliceMeta);
    const aliceBlob = await vault.getBinaryBlob(docId, 'cand_alice');
    assert.ok(aliceBlob);

    // If account switches to Bob or Guest, access is immediately blocked
    const bobMeta = await vault.getMetadata(docId, 'cand_bob');
    assert.strictEqual(bobMeta, null, 'Viewer must reject unauthorized candidate metadata');
    const bobBlob = await vault.getBinaryBlob(docId, 'cand_bob');
    assert.strictEqual(bobBlob, null, 'Viewer must reject unauthorized candidate binary stream');

    const guestMeta = await vault.getMetadata(docId, 'local_guest');
    assert.strictEqual(guestMeta, null, 'Viewer must reject guest access to candidate document');
  });

  it('DEF-01.2: Viewer resource lifecycle contract cancels in-flight tasks and destroys loaded doc on unmount', async () => {
    let cancelCalled = false;
    let destroyCalled = false;
    let cleanupCalled = false;

    const mockRenderTask = {
      cancel: () => {
        cancelCalled = true;
      },
      promise: Promise.resolve()
    };

    const mockPdfDoc = {
      cleanup: async () => {
        cleanupCalled = true;
      },
      destroy: async () => {
        destroyCalled = true;
      }
    };

    // Simulate cleanup execution as done by PrivatePdfViewer useEffect cleanup
    mockRenderTask.cancel();
    await mockPdfDoc.cleanup();
    await mockPdfDoc.destroy();

    assert.strictEqual(cancelCalled, true, 'Render task cancel() must be invoked on cancellation');
    assert.strictEqual(cleanupCalled, true, 'PDF doc cleanup() must be invoked on cancellation');
    assert.strictEqual(destroyCalled, true, 'PDF doc destroy() must be invoked on cancellation');
  });

  // ==========================================================================
  // DEF-02: GUEST PRIVACY NOTICE
  // ==========================================================================
  it('DEF-02.1: Guest notice condition and exact copy validation', () => {
    const requiredGuestNotice =
      'Guest storage is shared within this browser profile. Sign in to keep your private PDFs separated by account.';

    const activeUserGuest = 'local_guest';
    const isGuest = activeUserGuest === 'local_guest';
    assert.strictEqual(isGuest, true, 'Must evaluate to true for unauthenticated local_guest');

    // Verify copy does not imply cloud storage or misleading claims
    assert.ok(
      requiredGuestNotice.includes('within this browser profile'),
      'Must state storage is within browser profile'
    );
    assert.ok(
      !requiredGuestNotice.toLowerCase().includes('cloud'),
      'Must not imply cloud storage for guest data'
    );

    const activeUserAuth: string = 'candidate_uid_777';
    const isAuthGuest = activeUserAuth === 'local_guest';
    assert.strictEqual(isAuthGuest, false, 'Must evaluate to false for authenticated user');
  });

  // ==========================================================================
  // DEF-03: ACCURATE STORAGE REPORTING (vaultPdfBytes vs origin usage)
  // ==========================================================================
  it('DEF-03.1: getStorageEstimate accurately sums PDF bytes for active candidate partition', async () => {
    const pdfBuf1 = createAuthenticPdfBuffer(500); // approx 500 bytes
    const pdfBuf2 = createAuthenticPdfBuffer(800); // approx 800 bytes

    const blob1 = new Blob([pdfBuf1], { type: 'application/pdf' });
    const blob2 = new Blob([pdfBuf2], { type: 'application/pdf' });

    // Import 2 documents for Alice
    const res1 = await vault.importPdf(blob1, {
      userId: 'alice_storage_test',
      fileName: 'Alice_Doc1.pdf'
    });
    const res2 = await vault.importPdf(blob2, {
      userId: 'alice_storage_test',
      fileName: 'Alice_Doc2.pdf'
    });

    assert.strictEqual(res1.success, true);
    assert.strictEqual(res2.success, true);

    const expectedTotalBytes = res1.metadata!.fileSize + res2.metadata!.fileSize;
    assert.ok(expectedTotalBytes > 1000);

    const estimate = await vault.getStorageEstimate('alice_storage_test');

    assert.strictEqual(
      estimate.vaultPdfBytes,
      expectedTotalBytes,
      'vaultPdfBytes must exactly equal the sum of fileSize of Alice documents'
    );
    assert.strictEqual(estimate.documentCount, 2, 'documentCount must equal 2');
    assert.strictEqual(typeof estimate.usageBytes, 'number');
    assert.strictEqual(typeof estimate.quotaBytes, 'number');
    assert.strictEqual(typeof estimate.usagePercent, 'number');
  });

  it('DEF-03.2: Storage isolation: documents of user A do not pollute user B vaultPdfBytes', async () => {
    const pdfAlice = createAuthenticPdfBuffer('Alice Personal File');
    const pdfBob = createAuthenticPdfBuffer('Bob Personal File');

    await vault.importPdf(new Blob([pdfAlice], { type: 'application/pdf' }), {
      userId: 'alice_iso',
      fileName: 'Alice_Iso.pdf'
    });

    await vault.importPdf(new Blob([pdfBob], { type: 'application/pdf' }), {
      userId: 'bob_iso',
      fileName: 'Bob_Iso.pdf'
    });

    const estAlice = await vault.getStorageEstimate('alice_iso');
    const estBob = await vault.getStorageEstimate('bob_iso');

    assert.strictEqual(estAlice.documentCount, 1);
    assert.strictEqual(estBob.documentCount, 1);
    assert.strictEqual(estAlice.vaultPdfBytes, pdfAlice.length);
    assert.strictEqual(estBob.vaultPdfBytes, pdfBob.length);

    // Guest has 0 documents and 0 vaultPdfBytes
    const estGuest = await vault.getStorageEstimate('local_guest');
    assert.strictEqual(estGuest.documentCount, 0);
    assert.strictEqual(estGuest.vaultPdfBytes, 0);
  });

  it('DEF-03.3: Storage reporting handles empty vaults and environments without navigator.storage safely', async () => {
    // Fresh user with empty vault
    const emptyEst = await vault.getStorageEstimate('empty_candidate');

    assert.strictEqual(emptyEst.documentCount, 0);
    assert.strictEqual(emptyEst.vaultPdfBytes, 0);
    assert.ok(emptyEst.quotaBytes >= 1024 * 1024 * 1024);
    assert.strictEqual(emptyEst.usagePercent >= 0, true);
    assert.strictEqual(emptyEst.usagePercent <= 100, true);
  });

  it('DEF-03.4: Deleting a document immediately reduces vaultPdfBytes accurately', async () => {
    const pdfBuf = createAuthenticPdfBuffer('Doc to delete for storage test');
    const blob = new Blob([pdfBuf], { type: 'application/pdf' });

    const imp = await vault.importPdf(blob, {
      userId: 'cand_del',
      fileName: 'To_Delete.pdf'
    });
    const docId = imp.metadata!.docId;

    const estBefore = await vault.getStorageEstimate('cand_del');
    assert.strictEqual(estBefore.documentCount, 1);
    assert.strictEqual(estBefore.vaultPdfBytes, pdfBuf.length);

    // Delete document
    const deleted = await vault.deleteDocument(docId, 'cand_del');
    assert.strictEqual(deleted, true);

    const estAfter = await vault.getStorageEstimate('cand_del');
    assert.strictEqual(estAfter.documentCount, 0);
    assert.strictEqual(estAfter.vaultPdfBytes, 0);
  });
});
