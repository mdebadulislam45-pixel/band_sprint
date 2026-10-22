import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMBRIDGE_VOLUMES_CATALOGUE,
  INITIAL_CAMBRIDGE_TESTS,
  getAllCambridgeTests,
  getCambridgeTestById,
  validateCambridgeTestContent,
  importCambridgeTestContent
} from '../../data/cambridgeLibraryData';
import { CambridgeTestSet } from '../../types/cambridgeLibrary';

describe('Phase 6A: Cambridge IELTS 11–21 Practice Library', () => {
  it('should enumerate all 11 volumes from Cambridge 11 to 21 (2016–2026)', () => {
    assert.strictEqual(CAMBRIDGE_VOLUMES_CATALOGUE.length, 11);

    const volumes = CAMBRIDGE_VOLUMES_CATALOGUE.map((v) => v.volume);
    for (let v = 11; v <= 21; v++) {
      assert.ok(volumes.includes(v as any), `Volume ${v} should exist in catalogue`);
    }

    // Verify publication release years span 2016 to 2026
    const years = CAMBRIDGE_VOLUMES_CATALOGUE.map((v) => v.publicationYear);
    assert.strictEqual(Math.min(...years), 2016);
    assert.strictEqual(Math.max(...years), 2026);
  });

  it('should support both Academic and General Training editions', () => {
    const academicVolumes = CAMBRIDGE_VOLUMES_CATALOGUE.filter((v) =>
      v.availableEditions.includes('Academic')
    );
    const gtVolumes = CAMBRIDGE_VOLUMES_CATALOGUE.filter((v) =>
      v.availableEditions.includes('General Training')
    );

    assert.strictEqual(academicVolumes.length, 11, 'All 11 volumes should support Academic edition');
    assert.strictEqual(gtVolumes.length, 11, 'All 11 volumes should support General Training edition');
  });

  it('should expose populated original IELTS-style practice sets', () => {
    const allTests = getAllCambridgeTests();
    assert.ok(allTests.length >= 3, 'Should have at least 3 pre-populated calibrated tests');

    const c18Test1 = getCambridgeTestById('cambridge-18-academic-test-1');
    assert.ok(c18Test1, 'Cambridge 18 Academic Test 1 must exist');
    assert.strictEqual(c18Test1.volume, 18);
    assert.strictEqual(c18Test1.edition, 'Academic');
    assert.strictEqual(c18Test1.testNumber, 1);
    assert.strictEqual(c18Test1.provenance, 'original_practice');

    const c17Test1 = getCambridgeTestById('cambridge-17-academic-test-1');
    assert.ok(c17Test1, 'Cambridge 17 Academic Test 1 must exist');
    assert.strictEqual(c17Test1.volume, 17);

    const c19GtTest1 = getCambridgeTestById('cambridge-19-general-training-test-1');
    assert.ok(c19GtTest1, 'Cambridge 19 General Training Test 1 must exist');
    assert.strictEqual(c19GtTest1.edition, 'General Training');
  });

  it('should provide complete 4-module structure for populated tests', () => {
    const test = getCambridgeTestById('cambridge-18-academic-test-1')!;

    // 1. Listening module
    assert.ok(test.listening, 'Listening module must exist');
    assert.strictEqual(test.listening.parts.length, 4);
    assert.ok(test.listening.parts[0].dialogue && test.listening.parts[0].dialogue.length > 0, 'Part 1 must have dialogue lines');
    assert.ok(test.listening.parts[0].questions.length > 0, 'Part 1 must have questions');

    // 2. Reading module
    assert.ok(test.reading, 'Reading module must exist');
    assert.strictEqual(test.reading.passages.length, 3);
    assert.ok(test.reading.passages[0].text.length > 100, 'Reading passage 1 must have text');
    assert.ok(test.reading.passages[0].questions.length > 0, 'Reading passage 1 must have questions');

    // 3. Writing module
    assert.ok(test.writing, 'Writing module must exist');
    assert.ok(test.writing.task1.prompt.length > 10, 'Writing Task 1 prompt must exist');
    assert.strictEqual(test.writing.task1.minimumWords, 150);
    assert.ok(test.writing.task2.prompt.length > 10, 'Writing Task 2 prompt must exist');
    assert.strictEqual(test.writing.task2.minimumWords, 250);

    // 4. Speaking module
    assert.ok(test.speaking, 'Speaking module must exist');
    assert.ok(test.speaking.part1.questions.length > 0, 'Speaking Part 1 must have questions');
    assert.ok(test.speaking.part2.cueCardTopic.length > 0, 'Speaking Part 2 must contain a cue card topic');
    assert.ok(test.speaking.part3.questions.length > 0, 'Speaking Part 3 must have questions');
  });

  it('should provide complete 40-question Listening and Reading sets across the generated catalogue', () => {
    const allTests = getAllCambridgeTests();
    assert.strictEqual(allTests.length, 11 * 2 * 4, 'Expected one generated set for each volume, edition and test number');

    for (const test of allTests) {
      assert.strictEqual(test.provenance, 'original_practice', `${test.id} must be labelled as original practice`);
      assert.deepStrictEqual(
        test.availableModules.slice().sort(),
        ['listening', 'reading', 'speaking', 'writing'],
        `${test.id} must advertise all four practice modules`
      );

      assert.ok(test.listening, `${test.id} must include Listening`);
      assert.strictEqual(test.listening.parts.length, 4, `${test.id} must contain four Listening parts`);
      const listeningQuestions = test.listening.parts.flatMap((part) => part.questions);
      assert.strictEqual(listeningQuestions.length, 40, `${test.id} must contain 40 Listening questions`);
      assert.strictEqual(new Set(listeningQuestions.map((question) => question.id)).size, 40, `${test.id} Listening question IDs must be unique`);

      assert.ok(test.reading, `${test.id} must include Reading`);
      assert.strictEqual(test.reading.passages.length, 3, `${test.id} must contain three Reading passages`);
      const readingQuestions = test.reading.passages.flatMap((passage) => passage.questions);
      assert.strictEqual(readingQuestions.length, 40, `${test.id} must contain 40 Reading questions`);
      assert.strictEqual(new Set(readingQuestions.map((question) => question.id)).size, 40, `${test.id} Reading question IDs must be unique`);

      assert.ok(test.writing?.task1?.prompt && test.writing?.task2?.prompt, `${test.id} must include both Writing tasks`);
      assert.ok(test.speaking?.part1?.questions?.length, `${test.id} must include Speaking Part 1`);
      assert.ok(test.speaking?.part2?.cueCardTopic, `${test.id} must include a Speaking Part 2 cue card`);
      assert.ok(test.speaking?.part3?.questions?.length, `${test.id} must include Speaking Part 3`);
    }
  });

  it('should validate valid Cambridge test imports correctly', () => {
    const sampleValidTest = {
      volume: 15,
      edition: 'Academic',
      testNumber: 2,
      title: 'Cambridge 15 · Academic Test 2',
      listening: {
        title: 'Cambridge 15 Academic Test 2 Listening',
        contextDescription: 'Student accommodation and campus facilities orientation',
        parts: [
          {
            partNumber: 1,
            title: 'Part 1: University Accommodation Registration',
            description: 'A student speaks with the university accommodation coordinator.',
            audioScript: 'Coordinator: Good morning, accommodation office.\nStudent: Hello, I would like to confirm my room booking.',
            dialogue: [
              { speaker: 'Coordinator', text: 'Good morning, accommodation office.' },
              { speaker: 'Student', text: 'Hello, I would like to confirm my room booking.' }
            ],
            questions: [
              {
                id: 'c15-a-t2-l-q1',
                questionNumber: 1,
                partOrSection: 1,
                type: 'fill_in_blank',
                prompt: 'Preferred room type: [1] room',
                correctAnswer: 'single',
                explanation: 'The student states they want a single room.'
              }
            ]
          }
        ]
      }
    };

    const validation = validateCambridgeTestContent(sampleValidTest);
    assert.strictEqual(validation.valid, true);
    assert.strictEqual(validation.errors.length, 0);
    assert.ok(validation.metadata);
    assert.strictEqual(validation.metadata.volume, 15);
    assert.strictEqual(validation.metadata.edition, 'Academic');
    assert.strictEqual(validation.metadata.testNumber, 2);

    const importResult = importCambridgeTestContent(JSON.stringify(sampleValidTest));
    assert.strictEqual(importResult.success, true);
    assert.ok(importResult.testId);
  });

  it('should reject malformed or incomplete Cambridge test imports', () => {
    // Missing required fields
    const invalidTest1 = {
      volume: 99, // invalid volume
      edition: 'Academic'
    };

    const res1 = validateCambridgeTestContent(invalidTest1);
    assert.strictEqual(res1.valid, false);
    assert.ok(res1.errors.length > 0);

    // Non-object
    const res2 = validateCambridgeTestContent(null);
    assert.strictEqual(res2.valid, false);

    // Invalid module structure (no modules)
    const invalidTest3 = {
      volume: 12,
      edition: 'Academic',
      testNumber: 1,
      title: 'Cambridge 12 Test 1'
    };

    const res3 = validateCambridgeTestContent(invalidTest3);
    assert.strictEqual(res3.valid, false);
    assert.ok(res3.errors.some((e) => e.includes('must contain at least one module')));

    // Invalid JSON string
    const importBadJson = importCambridgeTestContent('{ corrupt json ...');
    assert.strictEqual(importBadJson.success, false);
    assert.ok(importBadJson.error?.includes('JSON parse'));
  });
});
