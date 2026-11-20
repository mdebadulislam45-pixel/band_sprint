import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseURN,
  tryParseURN,
  buildURN,
  resolveLegacyId,
  toLegacyId,
  contentRegistry,
  ContentRegistryService
} from '../../services/contentRegistry';
import { MOCK_EXAM_SETS } from '../../data/mockExams';
import { ACADEMIC_WRITING_SETS, GENERAL_TRAINING_WRITING_SETS } from '../../components/cdielts/CDIELTSWritingExamRoom';
import { testPersistenceService, PersistentTestProgress } from '../../services/testPersistenceService';

describe('Phase 2: Central Content Registry & Backward-Compatible Adapters', () => {
  it('1. Resolves every discovered legacy ID family to canonical URNs', () => {
    // 1.1 Mock Exam direct IDs
    assert.strictEqual(
      resolveLegacyId('sprint-18'),
      'urn:ielts:sprint_original:mock_exam:sprint-18'
    );
    assert.strictEqual(
      resolveLegacyId('bc-authentic-3'),
      'urn:ielts:sprint_original:mock_exam:bc-authentic-3'
    );
    assert.strictEqual(
      resolveLegacyId('gt-test-1'),
      'urn:ielts:sprint_original:mock_exam:gt-test-1'
    );

    // 1.2 Mock Exam legacy aliases
    assert.strictEqual(
      resolveLegacyId('cam18_mock_test1'),
      'urn:ielts:sprint_original:mock_exam:sprint-18'
    );
    assert.strictEqual(
      resolveLegacyId('cam17_mock_test2'),
      'urn:ielts:sprint_original:mock_exam:sprint-17'
    );
    assert.strictEqual(
      resolveLegacyId('mock-set-1'),
      'urn:ielts:sprint_original:mock_exam:sprint-18'
    );

    // 1.3 Sprint catalogue tests (Volumes 11-21)
    assert.strictEqual(
      resolveLegacyId('sprint-18-academic-test-1'),
      'urn:ielts:sprint_catalogue:sprint_test:sprint-18-academic-test-1'
    );
    assert.strictEqual(
      resolveLegacyId('sprint-14-general-training-test-2'),
      'urn:ielts:sprint_catalogue:sprint_test:sprint-14-general-training-test-2'
    );

    // 1.4 Writing Room sets (Academic & GT)
    assert.strictEqual(
      resolveLegacyId('cam18_writing_set1'),
      'urn:ielts:sprint_original:writing_set:cam18_writing_set1'
    );
    assert.strictEqual(
      resolveLegacyId('gt_set1_formal_repair'),
      'urn:ielts:sprint_original:writing_set:gt_set1_formal_repair'
    );
    assert.strictEqual(
      resolveLegacyId('gt_set2_semiformal_landlord'),
      'urn:ielts:sprint_original:writing_set:gt_set2_semiformal_landlord'
    );

    // 1.5 Question Bank items
    assert.strictEqual(
      resolveLegacyId('lis_s1_01'),
      'urn:ielts:sprint_original:question_bank:comprehensive:item:lis_s1_01'
    );
    assert.strictEqual(
      resolveLegacyId('spk_p1_01'),
      'urn:ielts:sprint_original:question_bank:comprehensive:item:spk_p1_01'
    );
  });

  it('2. Correctly builds and parses canonical URNs', () => {
    // Standard set-level URN
    const urn1 = buildURN({
      provenance: 'sprint_original',
      family: 'mock_exam',
      setId: 'sprint-18'
    });
    assert.strictEqual(urn1, 'urn:ielts:sprint_original:mock_exam:sprint-18');

    const parsed1 = parseURN(urn1);
    assert.strictEqual(parsed1.nid, 'ielts');
    assert.strictEqual(parsed1.provenance, 'sprint_original');
    assert.strictEqual(parsed1.family, 'mock_exam');
    assert.strictEqual(parsed1.setId, 'sprint-18');
    assert.strictEqual(parsed1.subType, undefined);
    assert.strictEqual(parsed1.subId, undefined);

    // Sub-item level URN
    const urn2 = buildURN({
      provenance: 'sprint_original',
      family: 'writing_set',
      setId: 'gt_set1_formal_repair',
      subType: 'task',
      subId: '1'
    });
    assert.strictEqual(urn2, 'urn:ielts:sprint_original:writing_set:gt_set1_formal_repair:task:1');

    const parsed2 = parseURN(urn2);
    assert.strictEqual(parsed2.provenance, 'sprint_original');
    assert.strictEqual(parsed2.family, 'writing_set');
    assert.strictEqual(parsed2.setId, 'gt_set1_formal_repair');
    assert.strictEqual(parsed2.subType, 'task');
    assert.strictEqual(parsed2.subId, '1');
  });

  it('3. Guarantees round-trip conversion without identity loss', () => {
    const testCases = [
      'sprint-18',
      'sprint-18-academic-test-1',
      'gt_set1_formal_repair',
      'cam18_writing_set1',
      'lis_s1_01'
    ];

    for (const legacyId of testCases) {
      const canonical = resolveLegacyId(legacyId);
      assert.ok(canonical, `Should resolve ${legacyId} to a canonical URN`);

      const recovered = toLegacyId(canonical);
      assert.strictEqual(
        recovered,
        legacyId,
        `Round-trip recovered ID "${recovered}" must match original "${legacyId}"`
      );
    }

    // Round-trip from URN to parsed to built URN
    const sampleUrn = 'urn:ielts:sprint_catalogue:sprint_test:sprint-16-academic-test-3';
    const parsed = parseURN(sampleUrn);
    const rebuilt = buildURN({
      provenance: parsed.provenance,
      family: parsed.family,
      setId: parsed.setId
    });
    assert.strictEqual(rebuilt, sampleUrn);
  });

  it('4. Rejects malformed and unsupported URNs safely', () => {
    // Non-string or empty
    assert.throws(() => parseURN(''), /must be a non-empty string/);
    assert.strictEqual(tryParseURN('').success, false);

    // Wrong prefix
    assert.throws(() => parseURN('urn:isbn:12345:mock:test'), /prefix must be "urn:ielts"/);

    // Insufficient segments
    assert.throws(() => parseURN('urn:ielts:mock_exam'), /insufficient segments/);

    // Invalid segment count (6 segments)
    assert.throws(() => parseURN('urn:ielts:sprint_original:mock_exam:cam18:orphan'), /invalid segment count/);

    // Invalid provenance
    assert.throws(() => parseURN('urn:ielts:fake_prov:mock_exam:cam18'), /invalid provenance/);

    // Invalid family
    assert.throws(() => parseURN('urn:ielts:sprint_original:unsupported_family:cam18'), /invalid content family/);

    // Invalid characters (e.g. spaces or colons in setId)
    assert.throws(() => parseURN('urn:ielts:sprint_original:mock_exam:cam 18 invalid'), /invalid or empty setId/);

    // Non-throwing tryParseURN
    const result = tryParseURN('invalid-urn-string');
    assert.strictEqual(result.success, false);
    assert.ok(result.error.length > 0);
  });

  it('5. Handles missing content explicitly without fabricating data', async () => {
    // Non-existent mock set
    const missingMock = await contentRegistry.resolve('urn:ielts:sprint_original:mock_exam:non_existent_set_99');
    assert.strictEqual(missingMock, null, 'Must return null for unknown set, never fabricate');

    // Non-existent Sprint volume (e.g. Volume 5 which does not exist in the 11-21 catalogue)
    const missingSprint = await contentRegistry.resolve(
      'urn:ielts:sprint_catalogue:sprint_test:sprint-5-academic-test-1'
    );
    assert.strictEqual(missingSprint, null, 'Must return null for unpopulated volume');

    // Missing module on a valid set (e.g. Speaking on a mock exam set)
    const mockSpeaking = await contentRegistry.getSpeaking('cam18_mock_test1');
    assert.strictEqual(mockSpeaking, null, 'Mock sets have no speaking; must return null explicitly');

    // Missing module on a writing set (e.g. Listening on a writing set)
    const writingListening = await contentRegistry.getListening('gt_set1_formal_repair');
    assert.strictEqual(writingListening, null, 'Writing sets have no listening; must return null explicitly');
  });

  it('6. Routes to correct adapters and returns typed envelopes', async () => {
    const service = new ContentRegistryService();
    const adapters = service.getRegisteredAdapters();

    assert.strictEqual(adapters.length, 5, 'Must have 5 default registered adapters');
    const adapterIds = adapters.map((a) => a.adapterId);
    assert.ok(adapterIds.includes('static_mock_adapter'));
    assert.ok(adapterIds.includes('static_sprint_adapter'));
    assert.ok(adapterIds.includes('static_writing_adapter'));
    assert.ok(adapterIds.includes('static_question_bank_adapter'));
    assert.ok(adapterIds.includes('private_pdf_vault_adapter'));

    // Resolve via mock adapter
    const mockResult = await service.resolve('sprint-18');
    assert.ok(mockResult);
    assert.strictEqual(mockResult.family, 'mock_exam');
    assert.strictEqual(mockResult.provenance, 'sprint_original');

    // Resolve via sprint adapter
    const camResult = await service.resolve('sprint-18-academic-test-1');
    assert.ok(camResult);
    assert.strictEqual(camResult.family, 'sprint_test');
    assert.strictEqual(camResult.provenance, 'sprint_catalogue');

    // Resolve via writing adapter
    const writingResult = await service.resolve('gt_set1_formal_repair');
    assert.ok(writingResult);
    assert.strictEqual(writingResult.family, 'writing_set');
    assert.strictEqual(writingResult.provenance, 'sprint_original');
  });

  it('7. Verifies existing Mock Exam and Writing Set compatibility', async () => {
    // 7.1 Mock Exam Set 1 (sprint-18)
    const listeningView = await contentRegistry.getListening('cam18_mock_test1');
    assert.ok(listeningView, 'Listening view must resolve');
    assert.strictEqual(listeningView.sections.length, 4, 'Must have 4 sections');
    assert.strictEqual(listeningView.sections[0].isAvailable, true, 'Section 1 must be available');
    assert.strictEqual(listeningView.sections[1].isAvailable, true, 'Section 2 must be available');

    const readingView = await contentRegistry.getReading('sprint-18');
    assert.ok(readingView, 'Reading view must resolve');
    assert.strictEqual(readingView.passages.length, 1);
    assert.ok(readingView.passages[0].questions.length > 0);

    // 7.2 Writing Set: General Training Set 1 (Formal Council Repair Letter)
    const writingView = await contentRegistry.getWriting('gt_set1_formal_repair');
    assert.ok(writingView, 'Writing view must resolve');
    assert.strictEqual(writingView.format, 'General Training');
    assert.strictEqual(writingView.task1.letterType, 'Formal');
    assert.strictEqual(writingView.task1.bulletPoints?.length, 3, 'Must have 3 bullet points');
    assert.strictEqual(writingView.task2.minimumWords, 250);

    // 7.3 Writing Set: Academic Set 1 (SVG renewable electricity bar chart)
    const academicWriting = await contentRegistry.getWriting('cam18_writing_set1');
    assert.ok(academicWriting);
    assert.strictEqual(academicWriting.format, 'Academic');
    assert.ok(academicWriting.task1.series && academicWriting.task1.series.length > 0);
  });

  it('8. Verifies existing Sprint catalogue compatibility', async () => {
    const camTest = await contentRegistry.resolve('sprint-18-academic-test-1');
    assert.ok(camTest);
    assert.ok(
      camTest.title.includes('Sprint Practice Set 18') && camTest.title.includes('Academic Test 1'),
      `Title "${camTest.title}" must match Sprint Practice Set 18 Academic Test 1`
    );

    const camSpeaking = await contentRegistry.getSpeaking('sprint-18-academic-test-1');
    assert.ok(camSpeaking);
    assert.ok(camSpeaking.part1?.questions.length, 'Must have Part 1 questions');
    assert.ok(camSpeaking.part2?.cueCardBulletPoints.length, 'Must have Part 2 cue card points');
    assert.ok(camSpeaking.part3?.questions.length, 'Must have Part 3 questions');

    const camReading = await contentRegistry.getReading('sprint-18-academic-test-1');
    assert.ok(camReading);
    assert.strictEqual(camReading.passages.length, 3, 'Academic test must have 3 reading passages');
  });

  it('9. Guarantees zero mutation of authoritative source content', async () => {
    // Snapshot original mock exam data
    const originalTitle = MOCK_EXAM_SETS[0].title;
    const originalQuestionCount = MOCK_EXAM_SETS[0].questions.length;
    const originalWritingSetsCount = ACADEMIC_WRITING_SETS.length;

    // Perform multiple read operations through the registry
    await contentRegistry.resolve('sprint-18');
    await contentRegistry.getListening('sprint-18');
    await contentRegistry.getReading('sprint-18');
    await contentRegistry.getWriting('sprint-18');
    await contentRegistry.resolve('cam18_writing_set1');
    await contentRegistry.getWriting('cam18_writing_set1');

    // Confirm zero side effects on original source arrays
    assert.strictEqual(MOCK_EXAM_SETS[0].title, originalTitle);
    assert.strictEqual(MOCK_EXAM_SETS[0].questions.length, originalQuestionCount);
    assert.strictEqual(ACADEMIC_WRITING_SETS.length, originalWritingSetsCount);
  });

  it('10. Lists all available canonical URNs indexed across adapters', () => {
    const urns = contentRegistry.listAvailableURNs();
    assert.ok(Array.isArray(urns));
    assert.ok(urns.length > 50, 'Must index available mock, Sprint, writing, and question bank URNs');

    // Verify format of all indexed URNs
    for (const urn of urns) {
      const parsed = parseURN(urn);
      assert.strictEqual(parsed.nid, 'ielts');
      assert.ok(['sprint_original', 'sprint_catalogue'].includes(parsed.provenance));
    }
  });

  it('11. Preserves requestedLegacyId, canonicalId, urn, and rawRef across all discovered mock exam aliases', async () => {
    const aliasExpectations: Array<{
      inputAlias: string;
      expectedCanonicalId: string;
      expectedURN: string;
    }> = [
      {
        inputAlias: 'cam18_mock_test1',
        expectedCanonicalId: 'sprint-18',
        expectedURN: 'urn:ielts:sprint_original:mock_exam:sprint-18'
      },
      {
        inputAlias: 'mock-set-1',
        expectedCanonicalId: 'sprint-18',
        expectedURN: 'urn:ielts:sprint_original:mock_exam:sprint-18'
      },
      {
        inputAlias: 'sprint-18',
        expectedCanonicalId: 'sprint-18',
        expectedURN: 'urn:ielts:sprint_original:mock_exam:sprint-18'
      },
      {
        inputAlias: 'cam17_mock_test2',
        expectedCanonicalId: 'sprint-17',
        expectedURN: 'urn:ielts:sprint_original:mock_exam:sprint-17'
      },
      {
        inputAlias: 'mock-set-2',
        expectedCanonicalId: 'sprint-17',
        expectedURN: 'urn:ielts:sprint_original:mock_exam:sprint-17'
      },
      {
        inputAlias: 'sprint-17',
        expectedCanonicalId: 'sprint-17',
        expectedURN: 'urn:ielts:sprint_original:mock_exam:sprint-17'
      },
      {
        inputAlias: 'cam16_mock_test3',
        expectedCanonicalId: 'sprint-16',
        expectedURN: 'urn:ielts:sprint_original:mock_exam:sprint-16'
      },
      {
        inputAlias: 'mock-set-4',
        expectedCanonicalId: 'sprint-16',
        expectedURN: 'urn:ielts:sprint_original:mock_exam:sprint-16'
      },
      {
        inputAlias: 'sprint-16',
        expectedCanonicalId: 'sprint-16',
        expectedURN: 'urn:ielts:sprint_original:mock_exam:sprint-16'
      },
      {
        inputAlias: 'mock-set-3',
        expectedCanonicalId: 'bc-authentic-3',
        expectedURN: 'urn:ielts:sprint_original:mock_exam:bc-authentic-3'
      },
      {
        inputAlias: 'bc-authentic-3',
        expectedCanonicalId: 'bc-authentic-3',
        expectedURN: 'urn:ielts:sprint_original:mock_exam:bc-authentic-3'
      },
      {
        inputAlias: 'mock-set-5',
        expectedCanonicalId: 'gt-test-1',
        expectedURN: 'urn:ielts:sprint_original:mock_exam:gt-test-1'
      },
      {
        inputAlias: 'gt-test-1',
        expectedCanonicalId: 'gt-test-1',
        expectedURN: 'urn:ielts:sprint_original:mock_exam:gt-test-1'
      }
    ];

    for (const { inputAlias, expectedCanonicalId, expectedURN } of aliasExpectations) {
      const result = await contentRegistry.resolve(inputAlias);
      assert.ok(result, `Alias "${inputAlias}" must resolve successfully`);
      assert.strictEqual(
        result.requestedLegacyId,
        inputAlias,
        `requestedLegacyId must exactly match input alias "${inputAlias}"`
      );
      assert.strictEqual(
        result.canonicalId,
        expectedCanonicalId,
        `canonicalId must be "${expectedCanonicalId}" for alias "${inputAlias}"`
      );
      assert.strictEqual(
        result.urn,
        expectedURN,
        `urn must be "${expectedURN}" for alias "${inputAlias}"`
      );
      assert.ok(result.rawRef, `rawRef must be populated for alias "${inputAlias}"`);
      assert.strictEqual(
        (result.rawRef as { id: string }).id,
        expectedCanonicalId,
        `rawRef.id must equal canonicalId "${expectedCanonicalId}"`
      );
    }
  });

  it('12. Validates historical session restoration with legacy aliases through testPersistenceService', async () => {
    const historicalSession: PersistentTestProgress = {
      sessionId: 'test_hist_session_001',
      testType: 'live_mock',
      testSetId: 'cam18_mock_test1', // Historical legacy alias stored in persistence
      activeSection: 1,
      currentQuestionIndex: 3,
      answers: { 1: 'National Park', 2: '45.50' },
      flagged: { 2: true },
      status: 'in_progress',
      updatedAt: Date.now() - 3600000
    };

    // Save historical progress
    await testPersistenceService.saveProgress(historicalSession);

    // Retrieve via persistence service
    const restored = await testPersistenceService.getProgress('test_hist_session_001');
    assert.ok(restored, 'Historical session must be restored from persistence');
    assert.strictEqual(restored.testSetId, 'cam18_mock_test1', 'Stored legacy alias must remain unmutated');

    // Resolve via ContentRegistryService using restored testSetId
    const resolved = await contentRegistry.resolve(restored.testSetId!);
    assert.ok(resolved, 'Restored session testSetId must resolve via ContentRegistry');
    assert.strictEqual(resolved.requestedLegacyId, 'cam18_mock_test1');
    assert.strictEqual(resolved.canonicalId, 'sprint-18');
    assert.strictEqual(resolved.urn, 'urn:ielts:sprint_original:mock_exam:sprint-18');

    // Clean up
    await testPersistenceService.clearProgress('test_hist_session_001');
  });

  it('13. Validates canonical URN resolution and direct URN queries', async () => {
    const canonicalUrn = 'urn:ielts:sprint_original:mock_exam:sprint-18';
    const result = await contentRegistry.resolve(canonicalUrn);
    assert.ok(result);
    assert.strictEqual(result.urn, canonicalUrn);
    assert.strictEqual(result.canonicalId, 'sprint-18');
    assert.strictEqual(result.requestedLegacyId, canonicalUrn);
    assert.strictEqual((result.rawRef as { id: string }).id, 'sprint-18');
  });

  it('14. Safely handles missing, invalid, and unsupported IDs without throwing', async () => {
    const invalidIds = [
      '',
      '   ',
      'non_existent_mock_alias',
      'unknown-set-404',
      'urn:ielts:sprint_original:mock_exam:non_existent_set_404',
      'malformed::urn:string',
      'null',
      'undefined'
    ];

    for (const invalidId of invalidIds) {
      const result = await contentRegistry.resolve(invalidId);
      assert.strictEqual(
        result,
        null,
        `Invalid or unsupported identifier "${invalidId}" must return null, never throw or fabricate data`
      );
    }
  });
});
