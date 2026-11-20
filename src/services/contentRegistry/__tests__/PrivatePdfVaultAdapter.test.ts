import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PrivatePdfVaultAdapter } from '../adapters/PrivatePdfVaultAdapter';
import { ParsedURN } from '../../../types/contentRegistry';
import { PrivatePdfDocumentMetadata } from '../../../types/pdfVault';
import { PdfVaultService } from '../../pdfVault/PdfVaultService';

describe('PrivatePdfVaultAdapter (Phase 4.5 Practice Integration)', () => {

  // Mock Vault Service
  const mockDocs: Record<string, PrivatePdfDocumentMetadata> = {
    'doc_c18_ac': {
      docId: 'doc_c18_ac',
      urn: 'urn:ielts:sprint_private:sprint_test:doc_c18_ac',
      userId: 'test_candidate_1',
      fileName: 'IELTS 18 Academic.pdf',
      fileSize: 15420000,
      fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      pageCount: 140,
      detectedVolume: 18,
      detectedEdition: 'Academic',
      detectedModules: ['listening', 'reading', 'writing', 'speaking'],
      createdAt: Date.now(),
      lastOpenedAt: Date.now(),
      inspection: {
        docId: 'doc_c18_ac',
        fileName: 'IELTS 18 Academic.pdf',
        fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        totalPages: 140,
        hasTextLayer: true,
        inspectionStatus: 'complete',
        classificationConfidence: 'high',
        detectedVolume: 18,
        track: 'Academic',
        documentType: 'complete_book',
        evidence: ['Sprint English IELTS 18 Academic'],
        unresolvedFields: [],
        inspectedPageCount: 140,
        durationMs: 120,
        inventory: {
          tests: [
            {
              testNumber: 1,
              testLabel: 'Test 1',
              track: 'Academic',
              pageRange: {
                start: { pageNumber: 10, pageIndex: 9 },
                end: { pageNumber: 50, pageIndex: 49 }
              },
              modules: {
                listening: {
                  module: 'listening',
                  pageRange: { start: { pageNumber: 10, pageIndex: 9 } },
                  subComponents: [
                    { subComponentNumber: 1, label: 'Section 1', page: { pageNumber: 10, pageIndex: 9 } },
                    { subComponentNumber: 2, label: 'Section 2', page: { pageNumber: 13, pageIndex: 12 } }
                  ]
                },
                reading: {
                  module: 'reading',
                  pageRange: { start: { pageNumber: 18, pageIndex: 17 } },
                  subComponents: [
                    { subComponentNumber: 1, label: 'Passage 1', page: { pageNumber: 18, pageIndex: 17 } }
                  ]
                },
                writing: {
                  module: 'writing',
                  pageRange: { start: { pageNumber: 32, pageIndex: 31 } },
                  subComponents: [
                    { subComponentNumber: 1, label: 'Task 1', page: { pageNumber: 32, pageIndex: 31 } },
                    { subComponentNumber: 2, label: 'Task 2', page: { pageNumber: 33, pageIndex: 32 } }
                  ]
                },
                speaking: {
                  module: 'speaking',
                  pageRange: { start: { pageNumber: 38, pageIndex: 37 } }
                }
              }
            }
          ]
        }
      }
    },
    'doc_scanned_01': {
      docId: 'doc_scanned_01',
      urn: 'urn:ielts:sprint_private:sprint_test:doc_scanned_01',
      userId: 'test_candidate_1',
      fileName: 'IELTS 01 Scanned.pdf',
      fileSize: 22000000,
      fileHash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
      pageCount: 162,
      detectedVolume: 1,
      createdAt: Date.now(),
      lastOpenedAt: Date.now(),
      inspection: {
        docId: 'doc_scanned_01',
        fileName: 'IELTS 01 Scanned.pdf',
        fileHash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
        totalPages: 162,
        hasTextLayer: false,
        inspectionStatus: 'scanned_no_text',
        classificationConfidence: 'low',
        track: 'unknown',
        documentType: 'complete_book',
        evidence: [],
        unresolvedFields: ['text_layer'],
        inspectedPageCount: 162,
        durationMs: 90,
        inventory: { tests: [] }
      }
    }
  };

  const mockVaultService = {
    getMetadata: async (docId: string, userId: string) => {
      const doc = mockDocs[docId];
      if (doc && doc.userId === userId) return doc;
      return null;
    },
    listDocuments: async (userId: string) => {
      return Object.values(mockDocs).filter((d) => d.userId === userId);
    }
  } as unknown as PdfVaultService;

  const adapter = new PrivatePdfVaultAdapter(
    mockVaultService,
    () => 'test_candidate_1'
  );

  it('1. Handles exclusively URNs with provenance "sprint_private"', () => {
    const validURN: ParsedURN = {
      raw: 'urn:ielts:sprint_private:sprint_test:sprint-18:doc:doc_c18_ac',
      nid: 'ielts',
      provenance: 'sprint_private',
      family: 'sprint_test',
      setId: 'sprint-18',
      subType: 'doc',
      subId: 'doc_c18_ac'
    };

    const invalidURN: ParsedURN = {
      raw: 'urn:ielts:sprint_catalogue:sprint_test:sprint-18',
      nid: 'ielts',
      provenance: 'sprint_catalogue',
      family: 'sprint_test',
      setId: 'sprint-18'
    };

    assert.equal(adapter.canHandle(validURN), true);
    assert.equal(adapter.canHandle(invalidURN), false);
  });

  it('2. Resolves private document metadata without loading binary blobs', async () => {
    const urn: ParsedURN = {
      raw: 'urn:ielts:sprint_private:sprint_test:doc_c18_ac',
      nid: 'ielts',
      provenance: 'sprint_private',
      family: 'sprint_test',
      setId: 'doc_c18_ac'
    };

    const result = await adapter.resolve(urn);
    assert.ok(result);
    assert.equal(result?.canonicalId, 'doc_c18_ac');
    assert.equal(result?.title, 'IELTS 18 Academic.pdf');
    assert.equal(result?.provenance, 'sprint_private');
    assert.ok(result?.rawRef);
  });

  it('3. Maps verified page position references in Listening view', async () => {
    const urn: ParsedURN = {
      raw: 'urn:ielts:sprint_private:sprint_test:doc_c18_ac:test:1',
      nid: 'ielts',
      provenance: 'sprint_private',
      family: 'sprint_test',
      setId: 'doc_c18_ac',
      subType: 'test',
      subId: '1'
    };

    const listening = await adapter.getListening(urn);
    assert.ok(listening);
    assert.equal(listening?.sections.length, 4);
    assert.equal(listening?.sections[0].isAvailable, true);
    assert.ok(listening?.sections[0].title.includes('Page 10'));
  });

  it('4. Provides copyright-safe visual reference representations in Reading view', async () => {
    const urn: ParsedURN = {
      raw: 'urn:ielts:sprint_private:sprint_test:doc_c18_ac:test:1',
      nid: 'ielts',
      provenance: 'sprint_private',
      family: 'sprint_test',
      setId: 'doc_c18_ac',
      subType: 'test',
      subId: '1'
    };

    const reading = await adapter.getReading(urn);
    assert.ok(reading);
    assert.equal(reading?.passages.length, 3);
    assert.ok(reading?.passages[0].text.includes('Visual reference document'));
    assert.equal(reading?.passages[0].questions.length, 0); // Zero extracted questions
  });

  it('5. Correctly handles scanned PDFs (scanned_no_text)', async () => {
    const urn: ParsedURN = {
      raw: 'urn:ielts:sprint_private:sprint_test:doc_scanned_01',
      nid: 'ielts',
      provenance: 'sprint_private',
      family: 'sprint_test',
      setId: 'doc_scanned_01'
    };

    const listening = await adapter.getListening(urn);
    assert.ok(listening);
    assert.equal(listening?.sections[0].isAvailable, false);
    assert.ok(listening?.sections[0].missingReason?.includes('Scanned image-only PDF'));
  });

  it('6. Enforces strict account partition isolation', async () => {
    const isolatedAdapter = new PrivatePdfVaultAdapter(
      mockVaultService,
      () => 'other_candidate_99'
    );

    const urn: ParsedURN = {
      raw: 'urn:ielts:sprint_private:sprint_test:doc_c18_ac',
      nid: 'ielts',
      provenance: 'sprint_private',
      family: 'sprint_test',
      setId: 'doc_c18_ac'
    };

    const result = await isolatedAdapter.resolve(urn);
    assert.equal(result, null); // Access denied for other candidate partition
  });
});
