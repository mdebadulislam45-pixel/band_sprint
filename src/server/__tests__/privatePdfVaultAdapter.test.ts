/**
 * IELTS SPRINT — PHASE 3.2: PRIVATE PDF VAULT CONTENT REGISTRY ADAPTER REGRESSION SUITE
 *
 * Comprehensive automated regression tests verifying:
 * 1. Private book URN resolution (urn:ielts:sprint_private:sprint_test:sprint-18)
 * 2. Private test URN resolution (urn:ielts:sprint_private:sprint_test:sprint-18:doc:<docId>)
 * 3. Deleted-document behavior (explicit null, zero errors)
 * 4. Unknown private document behavior (explicit null, never manufactures data)
 * 5. Cross-account access rejection (Candidate A cannot resolve Candidate B's private PDF)
 * 6. Metadata-only resolution without binary loading (rawRef contains only metadata, no binary)
 * 7. Binary retrieval only through the authorized private vault service path
 * 8. Strict anti-fallback rule: NO fallback to public Sprint catalogue data
 * 9. Existing adapter routing compatibility (mock exams, writing rooms, question bank unaffected)
 * 10. Legacy alias preservation (cam18_mock_test1 still resolves to sprint-18)
 * 11. Zero PDF network transfer (no fetch / HTTP calls during adapter resolution)
 * 12. Zero mutation of existing source content (MOCK_EXAM_SETS and CAMBRIDGE_VOLUMES untouched)
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  ContentRegistryService,
  contentRegistry
} from '../../services/contentRegistry';
import { PrivatePdfVaultAdapter } from '../../services/contentRegistry/adapters/PrivatePdfVaultAdapter';
import { PdfVaultService } from '../../services/pdfVault/PdfVaultService';
import { MOCK_EXAM_SETS } from '../../data/mockExams';
import { CAMBRIDGE_VOLUMES_CATALOGUE } from '../../data/sprintLibraryData';

// Helper to create a minimal valid PDF buffer
function createMinimalPdfBuffer(customMarker = 'sample_marker'): Buffer {
  const content = `%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\n% Marker: ${customMarker}\nxref\n0 3\n0000000000 65535 f \n0000000015 00000 n \n0000000068 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n116\n%%EOF\n`;
  return Buffer.from(content, 'utf-8');
}

describe('Phase 3.2: Private PDF Vault Content Registry Adapter', () => {
  let customVault: PdfVaultService;
  let activeCandidateId: string;
  let adapter: PrivatePdfVaultAdapter;
  let registry: ContentRegistryService;

  beforeEach(() => {
    customVault = new PdfVaultService();
    customVault.clearMemoryStoreForTesting();
    activeCandidateId = 'candidate_alice_101';

    // Create adapter bound to customVault and active candidate resolver
    adapter = new PrivatePdfVaultAdapter(customVault, () => activeCandidateId);

    // Create fresh registry with all default adapters, replacing private adapter with custom bound adapter
    registry = new ContentRegistryService();
    registry.registerAdapter(adapter);
  });

  it('1. Private book URN resolution', async () => {
    const pdfBuf = createMinimalPdfBuffer('Sprint Practice Set 18 Academic Book');
    const importRes = await customVault.importPdf(
      new Blob([pdfBuf], { type: 'application/pdf' }),
      { userId: activeCandidateId, fileName: 'Sprint_IELTS_18_Academic.pdf' }
    );
    assert.ok(importRes.success && importRes.metadata);

    // Resolve via book-level canonical URN
    const urn = 'urn:ielts:sprint_private:sprint_test:sprint-18';
    const result = await registry.resolve(urn);

    assert.ok(result, 'Private book URN must resolve for authorized candidate');
    assert.strictEqual(result.provenance, 'sprint_private');
    assert.strictEqual(result.family, 'sprint_test');
    assert.strictEqual(result.canonicalId, importRes.metadata!.docId);
    assert.strictEqual(result.title, 'Sprint_IELTS_18_Academic.pdf');
    assert.strictEqual(result.format, 'Academic');
    assert.strictEqual((result.rawRef as { fileSize: number }).fileSize, pdfBuf.length);
  });

  it('2. Private test URN resolution', async () => {
    const pdfBuf = createMinimalPdfBuffer('Sprint Practice Set 17 GT Book');
    const importRes = await customVault.importPdf(
      new Blob([pdfBuf], { type: 'application/pdf' }),
      { userId: activeCandidateId, fileName: 'Sprint_17_General_Training.pdf' }
    );
    assert.ok(importRes.success && importRes.metadata);
    const docId = importRes.metadata!.docId;

    // Resolve via sub-document URN format
    const testUrn = `urn:ielts:sprint_private:sprint_test:sprint-17:doc:${docId}`;
    const result = await registry.resolve(testUrn);

    assert.ok(result, 'Direct docId private test URN must resolve');
    assert.strictEqual(result.canonicalId, docId);
    assert.strictEqual(result.format, 'General Training');
    assert.strictEqual(result.requestedLegacyId, testUrn);
  });

  it('3. Deleted-document behavior (explicit null, zero errors)', async () => {
    const pdfBuf = createMinimalPdfBuffer('Sprint Practice Set 16 Book To Delete');
    const importRes = await customVault.importPdf(
      new Blob([pdfBuf], { type: 'application/pdf' }),
      { userId: activeCandidateId, fileName: 'Sprint_16_Academic.pdf' }
    );
    assert.ok(importRes.success && importRes.metadata);
    const docId = importRes.metadata!.docId;

    // Verify it resolves before deletion
    const beforeDel = await registry.resolve(`urn:ielts:sprint_private:sprint_test:sprint-16:doc:${docId}`);
    assert.ok(beforeDel);

    // Delete document
    const deleted = await customVault.deleteDocument(docId, activeCandidateId);
    assert.strictEqual(deleted, true);

    // Verify it returns null explicitly after deletion
    const afterDel = await registry.resolve(`urn:ielts:sprint_private:sprint_test:sprint-16:doc:${docId}`);
    assert.strictEqual(afterDel, null, 'Deleted document must return null, never throw or fabricate');

    const readingAfterDel = await registry.getReading(`urn:ielts:sprint_private:sprint_test:sprint-16:doc:${docId}`);
    assert.strictEqual(readingAfterDel, null, 'Reading view for deleted doc must return null');
  });

  it('4. Unknown private document behavior (explicit null, never manufactures data)', async () => {
    // Non-existent private docId
    const unknownDoc = await registry.resolve('urn:ielts:sprint_private:sprint_test:sprint-99');
    assert.strictEqual(unknownDoc, null, 'Unknown private volume must return null');

    const unknownDocWithId = await registry.resolve(
      'urn:ielts:sprint_private:sprint_test:sprint-18:doc:non_existent_doc_id_999'
    );
    assert.strictEqual(unknownDocWithId, null, 'Unknown private docId must return null');
  });

  it('5. Cross-account access rejection (Candidate A cannot resolve Candidate B\'s private PDF)', async () => {
    const pdfBob = createMinimalPdfBuffer('Bob Private Book 15');
    const importBob = await customVault.importPdf(
      new Blob([pdfBob], { type: 'application/pdf' }),
      { userId: 'candidate_bob_999', fileName: 'Sprint_15_Bob_Personal.pdf' }
    );
    assert.ok(importBob.success && importBob.metadata);
    const bobDocId = importBob.metadata!.docId;

    // Active candidate is Alice ('candidate_alice_101')
    assert.strictEqual(activeCandidateId, 'candidate_alice_101');

    // Alice attempts to resolve Bob's private PDF
    const aliceQueryByDoc = await registry.resolve(`urn:ielts:sprint_private:sprint_test:sprint-15:doc:${bobDocId}`);
    assert.strictEqual(aliceQueryByDoc, null, 'Alice must NOT resolve Bob private document by docId');

    const aliceQueryByVol = await registry.resolve('urn:ielts:sprint_private:sprint_test:sprint-15');
    assert.strictEqual(aliceQueryByVol, null, 'Alice must NOT resolve Bob private document by volume slug');
  });

  it('6. Metadata-only resolution without binary loading', async () => {
    const pdfBuf = createMinimalPdfBuffer('Heavy Metadata Test Book');
    const importRes = await customVault.importPdf(
      new Blob([pdfBuf], { type: 'application/pdf' }),
      { userId: activeCandidateId, fileName: 'Sprint_18_Heavy.pdf' }
    );
    assert.ok(importRes.success && importRes.metadata);

    const result = await registry.resolve('urn:ielts:sprint_private:sprint_test:sprint-18');
    assert.ok(result);

    // rawRef must be the metadata envelope, NOT the binary blob
    const rawRef = result.rawRef as any;
    assert.ok(rawRef.docId);
    assert.ok(rawRef.fileHash);
    assert.strictEqual(rawRef.pdfBlob, undefined, 'rawRef must NEVER embed heavy binary blob in metadata envelope');
  });

  it('7. Binary retrieval only through authorized private vault service path', async () => {
    const pdfBuf = createMinimalPdfBuffer('Authorized Binary Access Test');
    const importRes = await customVault.importPdf(
      new Blob([pdfBuf], { type: 'application/pdf' }),
      { userId: activeCandidateId, fileName: 'Sprint_18_Binary.pdf' }
    );
    assert.ok(importRes.success && importRes.metadata);
    const docId = importRes.metadata!.docId;

    // Authorized candidate retrieves binary from vault service
    const blob = await customVault.getBinaryBlob(docId, activeCandidateId);
    assert.ok(blob, 'Authorized candidate must retrieve binary blob');
    assert.strictEqual(blob.size, pdfBuf.length);

    // Unauthorized candidate cannot retrieve binary
    const unauthorizedBlob = await customVault.getBinaryBlob(docId, 'intruder_user_xyz');
    assert.strictEqual(unauthorizedBlob, null, 'Unauthorized user must be blocked from binary blob retrieval');
  });

  it('8. Strict anti-fallback rule: NO fallback to public Sprint catalogue data', async () => {
    // Sprint Practice Set 18 Academic Test 1 exists in the PUBLIC catalogue:
    // 'urn:ielts:sprint_catalogue:sprint_test:sprint-18-academic-test-1'
    const publicTest = await registry.resolve('urn:ielts:sprint_catalogue:sprint_test:sprint-18-academic-test-1');
    assert.ok(publicTest, 'Public catalogue test must exist');
    assert.strictEqual(publicTest.provenance, 'sprint_catalogue');

    // Querying the PRIVATE URN for Sprint Practice Set 18 when Candidate Alice has NO private PDF in vault:
    // Must return NULL, NEVER fall back to public catalogue data
    const privateQueryWithoutDoc = await registry.resolve('urn:ielts:sprint_private:sprint_test:sprint-18');
    assert.strictEqual(
      privateQueryWithoutDoc,
      null,
      'Private URN must NEVER fall back to public Sprint catalogue data when private PDF is absent'
    );
  });

  it('9. Existing adapter routing compatibility', async () => {
    // 9.1 Mock Exam Set (sprint-18)
    const mockRes = await registry.resolve('sprint-18');
    assert.ok(mockRes);
    assert.strictEqual(mockRes.provenance, 'sprint_original');
    assert.strictEqual(mockRes.family, 'mock_exam');

    // 9.2 Writing Set (gt_set1_formal_repair)
    const writingRes = await registry.resolve('gt_set1_formal_repair');
    assert.ok(writingRes);
    assert.strictEqual(writingRes.provenance, 'sprint_original');
    assert.strictEqual(writingRes.family, 'writing_set');

    // 9.3 Question Bank item (lis_s1_01)
    const qbRes = await registry.resolve('lis_s1_01');
    assert.ok(qbRes);
    assert.strictEqual(qbRes.provenance, 'sprint_original');
    assert.strictEqual(qbRes.family, 'question_bank');

    // 9.4 Sprint Catalogue Test (sprint-18-academic-test-1)
    const camRes = await registry.resolve('sprint-18-academic-test-1');
    assert.ok(camRes);
    assert.strictEqual(camRes.provenance, 'sprint_catalogue');
    assert.strictEqual(camRes.family, 'sprint_test');
  });

  it('10. Legacy alias preservation', async () => {
    // cam18_mock_test1 must still resolve to canonical mock set sprint-18
    const aliasRes = await registry.resolve('cam18_mock_test1');
    assert.ok(aliasRes);
    assert.strictEqual(aliasRes.requestedLegacyId, 'cam18_mock_test1');
    assert.strictEqual(aliasRes.canonicalId, 'sprint-18');
    assert.strictEqual(aliasRes.urn, 'urn:ielts:sprint_original:mock_exam:sprint-18');
  });

  it('11. Zero PDF network transfer during adapter operations', async () => {
    let networkCallAttempted = false;
    const origFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      networkCallAttempted = true;
      throw new Error('Network call forbidden during private vault operations');
    };

    try {
      const pdfBuf = createMinimalPdfBuffer('Network Audit Book');
      await customVault.importPdf(
        new Blob([pdfBuf], { type: 'application/pdf' }),
        { userId: activeCandidateId, fileName: 'Sprint_18_Net.pdf' }
      );

      // Perform all adapter query methods
      const urn = 'urn:ielts:sprint_private:sprint_test:sprint-18';
      await registry.resolve(urn);
      await registry.getListening(urn);
      await registry.getReading(urn);
      await registry.getWriting(urn);
      await registry.getSpeaking(urn);

      assert.strictEqual(networkCallAttempted, false, 'Zero network calls must occur during private adapter operations');
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('12. Zero mutation of existing authoritative source content', async () => {
    const originalMockLength = MOCK_EXAM_SETS.length;
    const originalMockTitle = MOCK_EXAM_SETS[0].title;
    const originalSprintVols = CAMBRIDGE_VOLUMES_CATALOGUE.length;

    const pdfBuf = createMinimalPdfBuffer('Source Mutation Audit');
    await customVault.importPdf(
      new Blob([pdfBuf], { type: 'application/pdf' }),
      { userId: activeCandidateId, fileName: 'Sprint_18_Mut.pdf' }
    );

    await registry.resolve('urn:ielts:sprint_private:sprint_test:sprint-18');
    await registry.resolve('sprint-18');
    await registry.resolve('sprint-18-academic-test-1');

    assert.strictEqual(MOCK_EXAM_SETS.length, originalMockLength);
    assert.strictEqual(MOCK_EXAM_SETS[0].title, originalMockTitle);
    assert.strictEqual(CAMBRIDGE_VOLUMES_CATALOGUE.length, originalSprintVols);
  });
});
