import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CAMBRIDGE_VOLUMES_CATALOGUE,
  INITIAL_CAMBRIDGE_TESTS,
  getAllCambridgeTests,
  getCambridgeTestById,
  validateCambridgeTestContent,
  importCambridgeTestContent,
  resolveCambridgeListeningPartAudio,
  evaluateCambridgeQuestionAnswer
} from '../../data/cambridgeLibraryData';
import { CambridgeTestSet } from '../../types/cambridgeLibrary';
import { audioManager } from '../../services/AudioManager';
import { audioService } from '../../services/audioService';
import { MOCK_EXAM_SETS, getExamListeningSection } from '../../data/mockExams';
import {
  CDIELTS_PRE_READ_SECONDS,
  CDIELTS_SECTION_REVIEW_SECONDS,
  CDIELTS_FINAL_CHECK_SECONDS,
  CDIELTS_TOTAL_BUFFER_SECONDS,
  CAMBRIDGE_18_PART_AUDIO_SECONDS,
  CAMBRIDGE_18_LIBRARY_MEASURED_AUDIO_SECONDS,
  CAMBRIDGE_18_MOCK_EXAM_AUDIO_SECONDS,
  CAMBRIDGE_17_PART_AUDIO_SECONDS,
  BC_AUTHENTIC_3_PART_AUDIO_SECONDS,
  CAMBRIDGE_16_PART_AUDIO_SECONDS,
  GT_TEST_1_PART_AUDIO_SECONDS,
  EXAM_SECTION_AUDIO_DURATIONS,
  getExamSectionAudioDurations,
  CDIELTS_LISTENING_AUDIO_TOTAL_SECONDS,
  CDIELTS_LISTENING_EXACT_TOTAL_SECONDS,
  CDIELTS_LISTENING_INITIAL_CLOCK_SECONDS,
  calculateListeningTotalDurationSec,
  getCDIELTSSkillDurationSec,
  calculateSynchronizedListeningRemainingSec,
  createInitialListeningTimerState,
  stepListeningPhaseState,
  completeListeningSectionAudioState,
  skipListeningPreReadState,
  advanceListeningSectionState,
  submitListeningExamOnce
} from '../../utils/cdieltsEvaluationEngine';

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

  it('should verify populated authentic-calibrated tests', () => {
    const allTests = getAllCambridgeTests();
    assert.ok(allTests.length >= 3, 'Should have at least 3 pre-populated calibrated tests');

    const c18Test1 = getCambridgeTestById('cambridge-18-academic-test-1');
    assert.ok(c18Test1, 'Cambridge 18 Academic Test 1 must exist');
    assert.strictEqual(c18Test1.volume, 18);
    assert.strictEqual(c18Test1.edition, 'Academic');
    assert.ok(
      c18Test1.provenance === 'authentic_calibrated' || c18Test1.provenance === 'original_practice',
      'c18Test1 provenance must be authentic_calibrated or original_practice'
    );

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
    assert.strictEqual(test.listening.parts.length, 4, 'Listening module must have 4 parts');
    
    // Phase 5.2B: Verify 40 total questions (10 per part) and 3000+ transcript words
    const allListeningQuestions = test.listening.parts.flatMap((p) => p.questions);
    assert.strictEqual(allListeningQuestions.length, 40, 'Listening module must contain exactly 40 questions');
    
    for (let p = 1; p <= 4; p++) {
      const part = test.listening.parts.find((pt) => pt.partNumber === p);
      assert.ok(part, `Part ${p} must exist`);
      assert.strictEqual(part.questions.length, 10, `Part ${p} must contain exactly 10 questions`);
    }

    // Verify question IDs c18-a-t1-l-q1 through q40
    for (let i = 1; i <= 40; i++) {
      const q = allListeningQuestions.find((item) => item.id === `c18-a-t1-l-q${i}`);
      assert.ok(q, `Listening Question c18-a-t1-l-q${i} must exist`);
      assert.strictEqual(q.questionNumber, i, `Question number for Q${i} must match`);
    }

    // Verify audio script length (>= 3000 total words)
    const totalWords = test.listening.parts.reduce((sum, p) => {
      const words = p.audioScript ? p.audioScript.split(/\s+/).filter(Boolean).length : 0;
      return sum + words;
    }, 0);
    assert.ok(totalWords >= 3000, `Total listening transcript words (${totalWords}) must be >= 3000 for pilot realism`);

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

  // ============================================================================
  // PHASE 5.5H: FULL-LENGTH LISTENING PLAYBACK RESTORATION & CROSS-ROUTE INTEGRITY
  // ============================================================================
  it('Phase 5.5H (Cases 1–6): Cambridge 18 Academic Test 1 Parts 1–4 resolve to full audioScript, sub-chunk <=90w/<=550c, and contain all 10 Part 4 answer cues', () => {
    const c18 = getCambridgeTestById('cambridge-18-academic-test-1')!;
    assert.ok(c18.listening, 'Cambridge 18 Academic Test 1 listening must exist');

    // Case 6: Parts 1, 2, 3, and 4 all use authoritative full audioScript (>650 spoken words each)
    for (const partNum of [1, 2, 3, 4] as const) {
      const partObj = c18.listening.parts.find((p) => p.partNumber === partNum)!;
      const abridgedDialogueWords = (partObj.dialogue || []).reduce(
        (sum, d) => sum + d.text.split(/\s+/).filter(Boolean).length,
        0
      );
      const resolved = resolveCambridgeListeningPartAudio(partObj);
      assert.strictEqual(resolved.ok, true, `Part ${partNum} resolution must succeed`);
      assert.strictEqual(resolved.source, 'audioScript', `Part ${partNum} must resolve from full audioScript`);
      assert.ok(
        resolved.totalWords > abridgedDialogueWords,
        `Part ${partNum} resolved words (${resolved.totalWords}) must exceed abridged dialogue words (${abridgedDialogueWords})`
      );
      assert.ok(
        resolved.totalWords > 650,
        `Part ${partNum} resolved words (${resolved.totalWords}) must be > 650 words`
      );

      // Case 3: Every sub-chunk is <= 90 words and <= 550 characters
      resolved.lines.forEach((line, idx) => {
        const wc = line.text.split(/\s+/).filter(Boolean).length;
        assert.ok(wc <= 90, `Part ${partNum} line ${idx} exceeds 90 words (${wc})`);
        assert.ok(line.text.length <= 550, `Part ${partNum} line ${idx} exceeds 550 chars (${line.text.length})`);
      });
    }

    // Case 1, 2, 4, 5: Detailed inspection of Cambridge 18 Part 4
    const part4 = c18.listening.parts.find((p) => p.partNumber === 4)!;
    const resolvedP4 = resolveCambridgeListeningPartAudio(part4);
    assert.strictEqual(resolvedP4.source, 'audioScript');
    assert.strictEqual(resolvedP4.lines.length, 14, 'Part 4 must resolve to 14 sub-chunks (1 intro + 12 lecture + 1 closing)');
    assert.ok(resolvedP4.totalWords > 650, `Part 4 total spoken words (${resolvedP4.totalWords}) must exceed 650 (not 113)`);

    // Case 4a: Verify all 10 Part 4 answer cues in cambridge-18-academic-test-1 exist in the spoken payload
    // (including Q34 'attachment', Q35 'topography', and Q40 'environmentally harmonious' which were missing from the 113-word dialogue!)
    const combinedSpokenLower = resolvedP4.lines.map((l) => l.text).join(' ').toLowerCase();
    const requiredLibraryPart4Cues = [
      'thirty percent', // Q31: 30%
      'copper', // Q32: COPPER
      'denticles', // Q33: DENTICLES
      'attachment', // Q34: ATTACHMENT (missing from 113-word dialogue)
      'topography', // Q35: TOPOGRAPHY (missing from 113-word dialogue)
      'eighty-five percent', // Q36: 85%
      'durability', // Q37: DURABILITY
      'lotus leaf', // Q38: B (Lotus leaf microstructure)
      'hospital equipment', // Q39: C (Hospital equipment and surgical surfaces)
      'environmentally harmonious' // Q40: A (Completely non-toxic and environmentally harmonious — missing from 113-word dialogue)
    ];
    for (const cue of requiredLibraryPart4Cues) {
      assert.ok(
        combinedSpokenLower.includes(cue),
        `Cambridge Library Part 4 spoken audio payload must contain answer cue "${cue}"`
      );
    }

    // Case 4b: Also verify mockExams cambridge-18 Section 4 script resolved through resolveCambridgeListeningPartAudio contains all 10 cues
    const mockC18 = MOCK_EXAM_SETS.find((e) => e.id === 'cambridge-18')!;
    const mockSec4 = getExamListeningSection(mockC18, 4);
    const resolvedMockSec4 = resolveCambridgeListeningPartAudio({
      audioScript: mockSec4.script,
      dialogue: []
    });
    assert.strictEqual(resolvedMockSec4.ok, true);
    assert.ok(resolvedMockSec4.totalWords > 650);
    const mockSpokenLower = resolvedMockSec4.lines.map((l) => l.text).join(' ').toLowerCase();
    for (const cue of requiredLibraryPart4Cues) {
      assert.ok(
        mockSpokenLower.includes(cue),
        `Mock Exam cambridge-18 Part 4 spoken payload must contain cue "${cue}"`
      );
    }

    // Case 5: Transcript modal uses the exact same resolveCambridgeListeningPartAudio(p) output
    const transcriptLines = resolveCambridgeListeningPartAudio(part4).lines;
    assert.deepStrictEqual(
      transcriptLines,
      resolvedP4.lines,
      'Transcript modal source must match playback source turn-for-turn and speaker-for-speaker'
    );

    // Case 9 & 10: Professor Vance -> speaker_03 (Dr. Alistair Sterling), Examiner -> speaker_04 (Arthur)
    assert.strictEqual(resolvedP4.lines[0].speakerId, 'speaker_04', 'Opening examiner must be speaker_04');
    for (let i = 1; i <= 12; i++) {
      assert.strictEqual(
        resolvedP4.lines[i].speakerId,
        'speaker_03',
        `Professor Vance sub-chunk ${i} must use speaker_03 (Dr. Alistair Sterling)`
      );
    }
    assert.strictEqual(resolvedP4.lines[13].speakerId, 'speaker_04', 'Closing examiner must be speaker_04');

    // Never silently fall back to abridged dialogue when a complete script fails to parse
    const origParse = audioManager.parseMultiSpeakerScript.bind(audioManager);
    try {
      (audioManager as any).parseMultiSpeakerScript = () => [];
      const failedRes = resolveCambridgeListeningPartAudio(part4);
      assert.strictEqual(failedRes.ok, false, 'Must return ok: false when complete script parsing fails');
      assert.strictEqual(failedRes.lines.length, 0, 'Must NOT silently fall back to 4-turn abridged dialogue');
      assert.ok(failedRes.error, 'Must provide a recoverable error message');
    } finally {
      (audioManager as any).parseMultiSpeakerScript = origParse;
    }

    // Safe compatibility fallback when an object genuinely has no audioScript and only provides dialogue
    const dialogueOnlyPart = {
      audioScript: '',
      dialogue: part4.dialogue
    };
    const fallbackRes = resolveCambridgeListeningPartAudio(dialogueOnlyPart);
    assert.strictEqual(fallbackRes.ok, true);
    assert.strictEqual(fallbackRes.source, 'dialogue');
    assert.strictEqual(fallbackRes.lines.length, 4);
  });

  it('Phase 5.5H (Cases 15–17): Canonical answer evaluation in Cambridge Library accepts valid answers and rejects prefix/substring false positives & word-limit violations', () => {
    // 1. Test Cambridge Library cambridge-18-academic-test-1 Part 4 questions (Q31–Q40)
    const c18 = getCambridgeTestById('cambridge-18-academic-test-1')!;
    const libPart4Questions = c18.listening!.parts.find((p) => p.partNumber === 4)!.questions;
    assert.strictEqual(libPart4Questions.length, 10);

    const libCanonical: Record<number, string[]> = {
      31: ['30%', '30 percent', 'thirty percent'],
      32: ['COPPER', 'copper', 'COPPER OXIDE'],
      33: ['DENTICLES', 'denticles'],
      34: ['ATTACHMENT', 'attachment'],
      35: ['TOPOGRAPHY', 'topography'],
      36: ['85%', '85 percent', 'eighty-five percent'],
      37: ['DURABILITY', 'durability'],
      38: ['B', 'b', 'B) Lotus leaf microstructure'],
      39: ['C', 'c', 'C) Hospital equipment and surgical surfaces'],
      40: ['A', 'a', 'A) Completely non-toxic and environmentally harmonious']
    };

    for (const q of libPart4Questions) {
      for (const v of libCanonical[q.questionNumber]) {
        assert.strictEqual(
          evaluateCambridgeQuestionAnswer(q, v),
          true,
          `Cambridge Library Q${q.questionNumber} must accept "${v}"`
        );
      }
    }

    const libFalsePositives: Record<number, string[]> = {
      31: ['300%', '3%'],
      32: ['COP', 'COPPERY'],
      33: ['DENT', 'DENTICLE'],
      34: ['ATTACH', 'ATTACHMENTS'],
      35: ['TOPO', 'TOPOGRAPHIC'],
      36: ['850%', '8%'],
      37: ['DURABLE', 'DURA'],
      38: ['A', 'C'],
      39: ['A', 'B'],
      40: ['B', 'C']
    };

    for (const q of libPart4Questions) {
      for (const bad of libFalsePositives[q.questionNumber]) {
        assert.strictEqual(
          evaluateCambridgeQuestionAnswer(q, bad),
          false,
          `Cambridge Library Q${q.questionNumber} must REJECT false positive "${bad}"`
        );
      }
    }

    // Word-limit violations on Cambridge 18 Part 4 (wordLimit: 2)
    const libWordLimitViolations: Record<number, string> = {
      31: 'up to thirty percent',
      32: 'toxic copper oxide additives',
      33: 'microscopic dermal denticles',
      34: 'permanent mechanical attachment',
      35: 'physical surface topography',
      36: 'almost eighty five percent',
      37: 'long term mechanical durability'
    };

    for (const [qNumStr, multiWordAns] of Object.entries(libWordLimitViolations)) {
      const q = libPart4Questions.find((item) => item.questionNumber === Number(qNumStr))!;
      assert.strictEqual(
        evaluateCambridgeQuestionAnswer(q, multiWordAns),
        false,
        `Cambridge Library Q${qNumStr} (wordLimit=${q.wordLimit}) must REJECT word-limit violation "${multiWordAns}"`
      );
    }

    // 2. Test Section 10 reference fixture items (SYMBIOSIS, 50, HEAT, CLAY, WATER, SUGAR, B, C, A, B)
    // and prefix/substring false positives ("SYM", "500", "HEATWAVE", "CLAYEY", "WATERFALL", "SUGARY")
    const referencePart4Questions = [
      { id: 'ref-q31', questionNumber: 31, partOrSection: 4, type: 'note_completion' as const, prompt: 'Fungal networks operate via [31]', correctAnswer: 'SYMBIOSIS', acceptableAnswers: ['SYMBIOSIS', 'symbiosis'], explanation: '', wordLimit: 1 },
      { id: 'ref-q32', questionNumber: 32, partOrSection: 4, type: 'note_completion' as const, prompt: 'Hyphae extend up to [32] meters', correctAnswer: '50', acceptableAnswers: ['50', 'fifty'], explanation: '', wordLimit: 1 },
      { id: 'ref-q33', questionNumber: 33, partOrSection: 4, type: 'note_completion' as const, prompt: 'Protects roots against extreme [33]', correctAnswer: 'HEAT', acceptableAnswers: ['HEAT', 'heat'], explanation: '', wordLimit: 1 },
      { id: 'ref-q34', questionNumber: 34, partOrSection: 4, type: 'note_completion' as const, prompt: 'Binds heavy [34] particles', correctAnswer: 'CLAY', acceptableAnswers: ['CLAY', 'clay'], explanation: '', wordLimit: 1 },
      { id: 'ref-q35', questionNumber: 35, partOrSection: 4, type: 'note_completion' as const, prompt: 'Improves soil [35] retention', correctAnswer: 'WATER', acceptableAnswers: ['WATER', 'water'], explanation: '', wordLimit: 1 },
      { id: 'ref-q36', questionNumber: 36, partOrSection: 4, type: 'note_completion' as const, prompt: 'Trees supply liquid [36]', correctAnswer: 'SUGAR', acceptableAnswers: ['SUGAR', 'sugar'], explanation: '', wordLimit: 1 },
      { id: 'ref-q37', questionNumber: 37, partOrSection: 4, type: 'multiple_choice' as const, prompt: 'Carbon share:', options: ['A) 5%', 'B) About 15% of its total output', 'C) 40%'], correctAnswer: 'B', acceptableAnswers: ['B'], explanation: '' },
      { id: 'ref-q38', questionNumber: 38, partOrSection: 4, type: 'multiple_choice' as const, prompt: 'Defense:', options: ['A) Thorns', 'B) Bark', 'C) They release chemical warning signals against predators'], correctAnswer: 'C', acceptableAnswers: ['C'], explanation: '' },
      { id: 'ref-q39', questionNumber: 39, partOrSection: 4, type: 'multiple_choice' as const, prompt: 'Threat:', options: ['A) Elevated soil acidity from acid rain', 'B) Frost', 'C) Wind'], correctAnswer: 'A', acceptableAnswers: ['A'], explanation: '' },
      { id: 'ref-q40', questionNumber: 40, partOrSection: 4, type: 'multiple_choice' as const, prompt: 'Beneficiary:', options: ['A) Loggers', 'B) Commercial farmers wishing to reduce synthetic fertilizer use', 'C) Miners'], correctAnswer: 'B', acceptableAnswers: ['B'], explanation: '' }
    ];

    const canonicalAnswers: Record<number, string[]> = {
      31: ['SYMBIOSIS', 'symbiosis', '  Symbiosis '],
      32: ['50', 'fifty', 'FIFTY'],
      33: ['HEAT', 'heat'],
      34: ['CLAY', 'clay'],
      35: ['WATER', 'water'],
      36: ['SUGAR', 'sugar'],
      37: ['B', 'b', 'B) About 15% of its total output'],
      38: ['C', 'c', 'C) They release chemical warning signals against predators'],
      39: ['A', 'a', 'A) Elevated soil acidity from acid rain'],
      40: ['B', 'b', 'B) Commercial farmers wishing to reduce synthetic fertilizer use']
    };

    for (const q of referencePart4Questions) {
      for (const variant of canonicalAnswers[q.questionNumber]) {
        assert.strictEqual(
          evaluateCambridgeQuestionAnswer(q, variant),
          true,
          `Q${q.questionNumber} must accept canonical/acceptable variant "${variant}"`
        );
      }
    }

    const falsePositives: Record<number, string[]> = {
      31: ['SYM', 'SYMBIOSISX', 'SYMBIOTIC'],
      32: ['500', '5', '50s'],
      33: ['HEATWAVE', 'HEATING', 'HEA'],
      34: ['CLAYEY', 'CLA', 'CLAYS'],
      35: ['WATERFALL', 'WATERY', 'WAT'],
      36: ['SUGARY', 'SUG', 'SUGARS'],
      37: ['A', 'C'],
      38: ['A', 'B'],
      39: ['B', 'C'],
      40: ['A', 'C']
    };

    for (const q of referencePart4Questions) {
      for (const bad of falsePositives[q.questionNumber]) {
        assert.strictEqual(
          evaluateCambridgeQuestionAnswer(q, bad),
          false,
          `Q${q.questionNumber} must REJECT false positive "${bad}"`
        );
      }
    }

    const wordLimitViolations: Record<number, string> = {
      31: 'mycorrhizal symbiosis',
      32: 'fifty meters',
      33: 'excessive heat',
      34: 'dense clay',
      35: 'clean water',
      36: 'liquid sugar'
    };

    for (const [qNumStr, multiWordAns] of Object.entries(wordLimitViolations)) {
      const q = referencePart4Questions.find((item) => item.questionNumber === Number(qNumStr))!;
      assert.strictEqual(
        evaluateCambridgeQuestionAnswer(q, multiWordAns),
        false,
        `Q${qNumStr} (wordLimit=${q.wordLimit}) must REJECT word-limit violation "${multiWordAns}"`
      );
    }
  });

  it('Phase 5.5H.2 (Objectives 1 & 2): Multi-person speaker label "Hannah & Marcus:" parsing and Reading TFNG/YNNG positional letter rejection', () => {
    // Objective 1: Verify extractValidSpeakerTurn() and Part 3 resolution
    const hmTurn = audioManager.extractValidSpeakerTurn(
      'Hannah & Marcus: "Thank you very much for your guidance, Dr. Pendelton!"'
    );
    assert.ok(hmTurn, 'Must recognize "Hannah & Marcus:" as a valid speaker turn');
    assert.strictEqual(hmTurn.speaker, 'Hannah & Marcus');
    assert.strictEqual(hmTurn.text, 'Thank you very much for your guidance, Dr. Pendelton!');

    const dpTurn = audioManager.extractValidSpeakerTurn(
      'Dr. Pendelton: "Good afternoon, Hannah, Marcus."'
    );
    assert.ok(dpTurn, 'Must recognize "Dr. Pendelton:" as a valid speaker turn');
    assert.strictEqual(dpTurn.speaker, 'Dr. Pendelton');

    // Reject prose prefixes, hyphenated terms, and timestamps
    assert.strictEqual(
      audioManager.extractValidSpeakerTurn('In closed-loop systems: plant roots are misted.'),
      null,
      'Must NOT classify "In closed-loop systems:" as a speaker label'
    );
    assert.strictEqual(
      audioManager.extractValidSpeakerTurn('06:00 AM is the opening time.'),
      null,
      'Must NOT classify "06:00" as a speaker label'
    );
    assert.strictEqual(
      audioManager.extractValidSpeakerTurn('Post-pubescent: language acquisition relies on declarative memory.'),
      null,
      'Must NOT classify "Post-pubescent:" as a speaker label'
    );
    assert.strictEqual(
      audioManager.extractValidSpeakerTurn('Bio-fouling: refers to the undesirable accumulation of marine growth.'),
      null,
      'Must NOT classify "Bio-fouling:" as a speaker label'
    );

    // Verify Cambridge 18 Part 3 resolves "Hannah & Marcus" as its own turn with stripped label and preserved voice
    const c18 = getCambridgeTestById('cambridge-18-academic-test-1')!;
    const part3 = c18.listening!.parts.find((p) => p.partNumber === 3)!;
    const resolvedP3 = resolveCambridgeListeningPartAudio(part3);
    assert.strictEqual(resolvedP3.ok, true);
    assert.strictEqual(resolvedP3.totalWords, 813, 'Part 3 spoken words must be 813 (with "Hannah & Marcus:" stripped)');
    const jointTurn = resolvedP3.lines.find((l) => l.speaker === 'Hannah & Marcus');
    assert.ok(jointTurn, 'Part 3 resolved lines must contain the "Hannah & Marcus" turn');
    assert.strictEqual(jointTurn.text, 'Thank you very much for your guidance, Dr. Pendelton!');
    assert.strictEqual(jointTurn.speakerId, 'speaker_05', 'Joint turn "Hannah & Marcus" must reuse Hannah voice (speaker_05)');
    assert.ok(
      !resolvedP3.lines.some((l) => l.text.includes('Hannah & Marcus:')),
      'No spoken chunk in Part 3 may contain the raw label "Hannah & Marcus:"'
    );

    // Objective 2: Verify TFNG / YNNG positional letter rejection vs normal Multiple Choice
    const tfngFalseQ = {
      id: 'tfng-false-q',
      questionNumber: 1,
      partOrSection: 1,
      type: 'true_false_not_given' as const,
      prompt: 'The researchers used synthetic fertilizers.',
      options: ['TRUE', 'FALSE', 'NOT GIVEN'],
      correctAnswer: 'FALSE',
      acceptableAnswers: ['FALSE', 'False'],
      explanation: ''
    };
    assert.strictEqual(evaluateCambridgeQuestionAnswer(tfngFalseQ, 'FALSE'), true, 'Correct FALSE must be accepted');
    assert.strictEqual(evaluateCambridgeQuestionAnswer(tfngFalseQ, 'false'), true, 'Lowercase false must be accepted');
    assert.strictEqual(evaluateCambridgeQuestionAnswer(tfngFalseQ, 'TRUE'), false, 'Incorrect TRUE must be rejected');
    assert.strictEqual(evaluateCambridgeQuestionAnswer(tfngFalseQ, 'B'), false, 'Positional "B" must be REJECTED for unprefixed TFNG option set');
    assert.strictEqual(evaluateCambridgeQuestionAnswer(tfngFalseQ, 'b'), false, 'Positional "b" must be REJECTED for unprefixed TFNG option set');
    assert.strictEqual(evaluateCambridgeQuestionAnswer(tfngFalseQ, 'A'), false, 'Positional "A" must be REJECTED for unprefixed TFNG option set');
    assert.strictEqual(evaluateCambridgeQuestionAnswer(tfngFalseQ, 'C'), false, 'Positional "C" must be REJECTED for unprefixed TFNG option set');

    const tfngNotGivenQ = {
      id: 'tfng-ng-q',
      questionNumber: 2,
      partOrSection: 1,
      type: 'true_false_not_given' as const,
      prompt: 'The project received private corporate funding.',
      options: ['TRUE', 'FALSE', 'NOT GIVEN'],
      correctAnswer: 'NOT GIVEN',
      acceptableAnswers: ['NOT GIVEN', 'Not Given'],
      explanation: ''
    };
    assert.strictEqual(evaluateCambridgeQuestionAnswer(tfngNotGivenQ, 'NOT GIVEN'), true, 'Correct NOT GIVEN must be accepted');
    assert.strictEqual(evaluateCambridgeQuestionAnswer(tfngNotGivenQ, 'not given'), true, 'Lowercase not given must be accepted');
    assert.strictEqual(evaluateCambridgeQuestionAnswer(tfngNotGivenQ, 'C'), false, 'Positional "C" must be REJECTED for NOT GIVEN');

    const ynngNoQ = {
      id: 'ynng-no-q',
      questionNumber: 3,
      partOrSection: 3,
      type: 'yes_no_not_given' as const,
      prompt: 'The author agrees with the traditional hypothesis.',
      options: ['YES', 'NO', 'NOT GIVEN'],
      correctAnswer: 'NO',
      acceptableAnswers: ['NO', 'No'],
      explanation: ''
    };
    assert.strictEqual(evaluateCambridgeQuestionAnswer(ynngNoQ, 'NO'), true, 'Correct NO must be accepted');
    assert.strictEqual(evaluateCambridgeQuestionAnswer(ynngNoQ, 'B'), false, 'Positional "B" must be REJECTED for YNNG');

    // Normal Multiple Choice option "B" must still be accepted
    const normalMcq = {
      id: 'mcq-b-q',
      questionNumber: 4,
      partOrSection: 1,
      type: 'multiple_choice' as const,
      prompt: 'Which structure inspired the self-cleaning chemistry?',
      options: [
        'A) Coral reef calcium carbonate',
        'B) Lotus leaf microstructure',
        'C) Whale baleen plates'
      ],
      correctAnswer: 'B',
      acceptableAnswers: ['B', 'B) Lotus leaf microstructure'],
      explanation: ''
    };
    assert.strictEqual(evaluateCambridgeQuestionAnswer(normalMcq, 'B'), true, 'Normal multiple-choice option "B" must still be accepted');
    assert.strictEqual(evaluateCambridgeQuestionAnswer(normalMcq, 'b'), true, 'Normal multiple-choice option "b" must still be accepted');
    assert.strictEqual(evaluateCambridgeQuestionAnswer(normalMcq, 'B) Lotus leaf microstructure'), true, 'Full option string must still be accepted');
    assert.strictEqual(evaluateCambridgeQuestionAnswer(normalMcq, 'A'), false, 'Wrong multiple-choice option "A" must be rejected');
  });

  // ============================================================================
  // PHASE 5.5H.2.2 — FIX H-01: HYPHENATED SPEAKER NAMES REGRESSION SUITE
  // ============================================================================
  it('Phase 5.5H.2.2 (Fix H-01): Production parser recognizes valid hyphenated names, rejects hyphenated prose, preserves timestamps/joint speakers, and strips speaker labels exactly once', () => {
    // 1. Jean-Pierre: "Welcome to the seminar."
    const case1 = audioManager.extractValidSpeakerTurn('Jean-Pierre: "Welcome to the seminar."');
    assert.deepStrictEqual(case1, {
      speaker: 'Jean-Pierre',
      text: 'Welcome to the seminar.'
    });

    // 2. Mary-Jane: "Please take your seats."
    const case2 = audioManager.extractValidSpeakerTurn('Mary-Jane: "Please take your seats."');
    assert.deepStrictEqual(case2, {
      speaker: 'Mary-Jane',
      text: 'Please take your seats.'
    });

    // 3. Bio-fouling: marine organisms attach to the hull.
    const case3 = audioManager.extractValidSpeakerTurn('Bio-fouling: marine organisms attach to the hull.');
    assert.strictEqual(case3, null, 'Bio-fouling must be rejected as a speaker label');

    // 4. Post-pubescent development varies.
    const case4 = audioManager.extractValidSpeakerTurn('Post-pubescent development varies.');
    assert.strictEqual(case4, null, 'Post-pubescent prose must be rejected');
    assert.strictEqual(
      audioManager.extractValidSpeakerTurn('Post-pubescent: development varies.'),
      null,
      'Post-pubescent with colon must also be rejected'
    );

    // 5. In closed-loop systems, feedback is essential.
    const case5 = audioManager.extractValidSpeakerTurn('In closed-loop systems, feedback is essential.');
    assert.strictEqual(case5, null, 'In closed-loop systems must be rejected');
    assert.strictEqual(
      audioManager.extractValidSpeakerTurn('In closed-loop: feedback is essential.'),
      null,
      'In closed-loop with colon must also be rejected'
    );

    // 6. Hannah & Marcus: "Yes, Dr. Vance!"
    const case6 = audioManager.extractValidSpeakerTurn('Hannah & Marcus: "Yes, Dr. Vance!"');
    assert.deepStrictEqual(case6, {
      speaker: 'Hannah & Marcus',
      text: 'Yes, Dr. Vance!'
    });

    // 7. Dr. Pendelton: "Good morning."
    const case7 = audioManager.extractValidSpeakerTurn('Dr. Pendelton: "Good morning."');
    assert.deepStrictEqual(case7, {
      speaker: 'Dr. Pendelton',
      text: 'Good morning.'
    });

    // 8. The train departs at 06:00 from platform 2.
    const case8 = audioManager.extractValidSpeakerTurn('The train departs at 06:00 from platform 2.');
    assert.strictEqual(case8, null, 'Timestamp 06:00 sentence must be rejected as speaker turn');

    // Verify end-to-end production parseMultiSpeakerScript strips labels once and preserves prose/timestamps intact
    const multiScript = [
      'Jean-Pierre: "Welcome to the seminar."',
      'Bio-fouling: marine organisms attach to the hull.',
      'Mary-Jane: "Please take your seats."',
      'Post-pubescent development varies.',
      'In closed-loop systems, feedback is essential.',
      'The train departs at 06:00 from platform 2.',
      'Hannah: "We are ready."',
      'Dr. Pendelton: "Good morning."',
      'Hannah & Marcus: "Yes, Dr. Vance!"'
    ].join('\n');

    const turns = audioManager.parseMultiSpeakerScript(multiScript);
    assert.strictEqual(turns.length, 5, 'Should produce 5 distinct speaker turns with prose lines attached as continuations');

    assert.strictEqual(turns[0].speakerName, 'Jean-Pierre');
    assert.strictEqual(
      turns[0].text,
      'Welcome to the seminar. Bio-fouling: marine organisms attach to the hull.',
      'Jean-Pierre label stripped once and Bio-fouling prose preserved'
    );
    assert.ok(!turns[0].text.includes('Jean-Pierre'), 'Spoken text must not contain "Jean-Pierre"');

    assert.strictEqual(turns[1].speakerName, 'Mary-Jane');
    assert.strictEqual(
      turns[1].text,
      'Please take your seats. Post-pubescent development varies. In closed-loop systems, feedback is essential. The train departs at 06:00 from platform 2.',
      'Mary-Jane label stripped once and Post-pubescent, closed-loop, and 06:00 preserved intact'
    );
    assert.ok(!turns[1].text.includes('Mary-Jane'), 'Spoken text must not contain "Mary-Jane"');

    assert.strictEqual(turns[2].speakerName, 'Hannah');
    assert.strictEqual(turns[2].text, 'We are ready.');

    assert.strictEqual(turns[3].speakerName, 'Dr. Pendelton');
    assert.strictEqual(turns[3].text, 'Good morning.');

    assert.strictEqual(turns[4].speakerName, 'Hannah & Marcus');
    assert.strictEqual(turns[4].text, 'Yes, Dr. Vance!');
    assert.strictEqual(turns[4].speakerId, turns[2].speakerId, 'Hannah & Marcus must reuse Hannah assigned speakerId');
  });

  // ============================================================================
  // PHASE 5.5H.2.2 — FIX H-02: CD-IELTS LISTENING TIMER & PHASE STATE MACHINE
  // ============================================================================
  it('Phase 5.5H.2.2 (Fix H-02): Reconciles Cambridge 18 Listening duration (30m 53.73s), executes all 4 pre-read, 4 audio, 4 section-review, and 1 final 2-minute check transitions without early or duplicate submission', () => {
    // 1. Verify exact Cambridge 18 durations and skill timer initializations
    assert.strictEqual(CDIELTS_PRE_READ_SECONDS, 35);
    assert.strictEqual(CDIELTS_SECTION_REVIEW_SECONDS, 60);
    assert.strictEqual(CDIELTS_FINAL_CHECK_SECONDS, 120);
    assert.strictEqual(CDIELTS_TOTAL_BUFFER_SECONDS, 500, '4*35s (140s) + 4*60s (240s) + 120s = 500s (8m 20s)');
    assert.strictEqual(Number(CDIELTS_LISTENING_AUDIO_TOTAL_SECONDS.toFixed(2)), 1353.73, 'Cambridge 18 audio + pauses = 1353.73s (22m 33.73s)');
    assert.strictEqual(CDIELTS_LISTENING_EXACT_TOTAL_SECONDS, 1853.73, '1353.73s + 500s = 1853.73s (30m 53.73s)');
    assert.strictEqual(calculateListeningTotalDurationSec(CAMBRIDGE_18_PART_AUDIO_SECONDS), 1853.73);
    assert.strictEqual(CDIELTS_LISTENING_INITIAL_CLOCK_SECONDS, 1854, 'Initial Listening clock is 1854s (30:54), never 3600s (60:00)');

    // Verify no regression in Reading, Writing, or Speaking timers
    assert.strictEqual(getCDIELTSSkillDurationSec('listening'), 1854);
    assert.strictEqual(getCDIELTSSkillDurationSec('reading'), 3600);
    assert.strictEqual(getCDIELTSSkillDurationSec('writing'), 3600);
    assert.strictEqual(getCDIELTSSkillDurationSec('speaking'), 840);

    // 2. Controlled clock simulation through all 4 sections + final 2-minute check
    let state = createInitialListeningTimerState(CAMBRIDGE_18_PART_AUDIO_SECONDS);
    assert.strictEqual(state.section, 1);
    assert.strictEqual(state.phase, 'pre_read');
    assert.strictEqual(state.phaseCountdownSec, 35);
    assert.strictEqual(state.timeRemainingSec, 1854);

    const observedPhases: string[] = [];
    let preReadCount = 0;
    let audioStartCount = 0;
    let sectionReviewCount = 0;
    let finalCheckCount = 0;
    let completeAndSubmitEvents = 0;

    for (const secNum of [1, 2, 3, 4] as const) {
      assert.strictEqual(state.section, secNum, `Must be on Section ${secNum}`);
      assert.strictEqual(state.phase, 'pre_read', `Section ${secNum} must start in pre_read`);
      assert.strictEqual(state.phaseCountdownSec, 35, `Section ${secNum} pre_read must be 35s`);
      observedPhases.push(`sec${secNum}:pre_read`);
      preReadCount++;

      // Step 35 ticks of pre_read: first 34 ticks decrement countdown, 35th tick transitions to 'playing'
      for (let t = 1; t <= 34; t++) {
        const res = stepListeningPhaseState(state);
        state = res.nextState;
        assert.strictEqual(res.action, 'none');
        assert.strictEqual(state.phase, 'pre_read');
        assert.strictEqual(state.phaseCountdownSec, 35 - t);
        assert.strictEqual(state.hasSubmitted, false, 'Must never submit during pre_read');
      }
      const startAudioStep = stepListeningPhaseState(state);
      state = startAudioStep.nextState;
      assert.strictEqual(startAudioStep.action, 'start_audio');
      assert.strictEqual(state.phase, 'playing');
      observedPhases.push(`sec${secNum}:playing`);
      audioStartCount++;

      // Simulate audio playing for longer than nominal duration (e.g. +15 extra seconds) to verify
      // timer NEVER stops valid audio playback prematurely and NEVER transitions out of 'playing' on its own
      const audioTicks = Math.ceil(CAMBRIDGE_18_PART_AUDIO_SECONDS[secNum]) + 15;
      for (let t = 1; t <= audioTicks; t++) {
        const res = stepListeningPhaseState(state, { isAudioActiveOrLoading: true });
        state = res.nextState;
        assert.strictEqual(res.action, 'none', `Audio tick ${t} in Section ${secNum} must not prematurely end playback`);
        assert.strictEqual(state.phase, 'playing', `Section ${secNum} must remain in 'playing' until audio onComplete fires`);
        assert.strictEqual(state.hasSubmitted, false, 'Must never submit during audio playback');
        assert.ok(state.timeRemainingSec >= 180, 'Overall countdown must hold remaining review + final check buffer while audio plays');
      }

      // Complete section audio via production handler
      const completeRes = completeListeningSectionAudioState(state, secNum, 1000 + secNum);
      assert.strictEqual(completeRes.transitioned, true, `Section ${secNum} audio completion must transition to section_check`);
      state = completeRes.nextState;
      assert.strictEqual(state.phase, 'section_check');
      assert.strictEqual(state.phaseCountdownSec, 60);
      observedPhases.push(`sec${secNum}:section_check`);
      sectionReviewCount++;

      // Verify duplicate audio completion callback is strictly ignored (never creates duplicate review period)
      const duplicateCompleteRes = completeListeningSectionAudioState(state, secNum, 2000 + secNum);
      assert.strictEqual(duplicateCompleteRes.transitioned, false, 'Duplicate onComplete callback must not trigger a second review period');

      // Step 60 ticks of section_check
      for (let t = 1; t <= 59; t++) {
        const res = stepListeningPhaseState(state);
        state = res.nextState;
        assert.strictEqual(res.action, 'none');
        assert.strictEqual(state.phase, 'section_check');
        assert.strictEqual(state.phaseCountdownSec, 60 - t);
        assert.strictEqual(state.hasSubmitted, false, 'Must never submit during section_check');
      }

      const endReviewStep = stepListeningPhaseState(state);
      state = endReviewStep.nextState;
      if (secNum < 4) {
        assert.strictEqual(endReviewStep.action, 'next_section_pre_read');
        assert.strictEqual(state.section, secNum + 1);
        assert.strictEqual(state.phase, 'pre_read');
        assert.strictEqual(state.phaseCountdownSec, 35);
      } else {
        // Part 4 review (60s) must be followed by the separate final 2-minute (120s) answer check
        assert.strictEqual(endReviewStep.action, 'start_final_check');
        assert.strictEqual(state.section, 4);
        assert.strictEqual(state.phase, 'end_of_test_buffer');
        assert.strictEqual(state.phaseCountdownSec, 120);
        assert.strictEqual(state.timeRemainingSec, 120);
        observedPhases.push('final:end_of_test_buffer');
        finalCheckCount++;
      }
    }

    // Verify 120-second final answer-checking period
    assert.strictEqual(state.phase, 'end_of_test_buffer');
    assert.strictEqual(state.hasSubmitted, false, 'Must not auto-submit before final 2-minute check period ends');

    for (let t = 1; t <= 119; t++) {
      const res = stepListeningPhaseState(state);
      state = res.nextState;
      assert.strictEqual(res.action, 'none');
      assert.strictEqual(state.phase, 'end_of_test_buffer');
      assert.strictEqual(state.phaseCountdownSec, 120 - t);
      assert.strictEqual(state.timeRemainingSec, 120 - t, 'Overall countdown must match final check countdown 1:1');
      assert.strictEqual(state.hasSubmitted, false, `Must not auto-submit at ${120 - t}s remaining`);
    }

    // 120th tick of final answer-checking period completes and submits once
    const finalTick = stepListeningPhaseState(state);
    state = finalTick.nextState;
    if (finalTick.action === 'complete_and_submit') {
      completeAndSubmitEvents++;
    }
    observedPhases.push('final:completed');

    assert.strictEqual(preReadCount, 4, 'Must execute exactly 4 pre-read phases');
    assert.strictEqual(audioStartCount, 4, 'Must execute exactly 4 single-play audio phases');
    assert.strictEqual(sectionReviewCount, 4, 'Must execute exactly 4 section-review phases');
    assert.strictEqual(finalCheckCount, 1, 'Must execute exactly 1 separate final 2-minute check phase');
    assert.strictEqual(state.phase, 'completed');
    assert.strictEqual(state.phaseCountdownSec, 0);
    assert.strictEqual(state.timeRemainingSec, 0);
    assert.strictEqual(state.isListeningLocked, true);
    assert.strictEqual(state.hasSubmitted, true);
    assert.strictEqual(state.submissionCount, 1, 'Must submit exactly once');
    assert.strictEqual(completeAndSubmitEvents, 1);

    // Verify extra ticks or manual submit calls after completion never submit a second time
    const extraTick = stepListeningPhaseState(state);
    assert.strictEqual(extraTick.action, 'none');
    assert.strictEqual(extraTick.nextState.submissionCount, 1);

    const manualAfterComplete = submitListeningExamOnce(state);
    assert.strictEqual(manualAfterComplete.submitted, false, 'Duplicate submission must be blocked');
    assert.strictEqual(manualAfterComplete.nextState.submissionCount, 1);

    // Expected exact sequence of phases
    assert.deepStrictEqual(observedPhases, [
      'sec1:pre_read',
      'sec1:playing',
      'sec1:section_check',
      'sec2:pre_read',
      'sec2:playing',
      'sec2:section_check',
      'sec3:pre_read',
      'sec3:playing',
      'sec3:section_check',
      'sec4:pre_read',
      'sec4:playing',
      'sec4:section_check',
      'final:end_of_test_buffer',
      'final:completed'
    ]);

    // 3. Verify skip pre-read, manual section advance, and audio error pause/recovery
    let recoveryState = createInitialListeningTimerState(CAMBRIDGE_18_PART_AUDIO_SECONDS);
    const skipRes = skipListeningPreReadState(recoveryState);
    assert.strictEqual(skipRes.transitioned, true);
    recoveryState = skipRes.nextState;
    assert.strictEqual(recoveryState.phase, 'playing');
    assert.strictEqual(
      recoveryState.timeRemainingSec,
      1854 - 35,
      'Skipping 35s pre-read must immediately synchronize overall countdown'
    );

    // Simulate audio error pause: audioPlaybackSec must freeze while error is active
    const errTick1 = stepListeningPhaseState(recoveryState, { hasAudioError: true });
    assert.strictEqual(errTick1.nextState.audioPlaybackSec, 0, 'Audio playback clock must pause during error state');

    // Recover and complete Section 1 audio, then manually advance Section 1 review
    const recComplete = completeListeningSectionAudioState(errTick1.nextState, 1, 5000);
    assert.strictEqual(recComplete.transitioned, true);
    const advRes = advanceListeningSectionState(recComplete.nextState);
    assert.strictEqual(advRes.action, 'next_section_pre_read');
    assert.strictEqual(advRes.nextState.section, 2);
    assert.strictEqual(advRes.nextState.phase, 'pre_read');
    assert.strictEqual(advRes.nextState.phaseCountdownSec, 35);
  });

  // ============================================================================
  // PHASE 5.5H.3 — EXAM-SPECIFIC LISTENING TIMER INTEGRATION & VERIFICATION
  // ============================================================================
  it('Phase 5.5H.3: Exam-specific Listening countdown resolution across all 5 mock exams and Cambridge Library, session clamping, retake, and module isolation', () => {
    // 1. Verify exact audio durations, total exact seconds, and initial countdowns for all 5 exams + Library
    const expectedExamDurations: Record<
      string,
      { audioSec: number; exactTotalSec: number; clockSec: number; parts: Record<1 | 2 | 3 | 4, number> }
    > = {
      'cambridge-18': {
        audioSec: 1487.96,
        exactTotalSec: 1987.96,
        clockSec: 1988,
        parts: CAMBRIDGE_18_MOCK_EXAM_AUDIO_SECONDS
      },
      'cambridge-17': {
        audioSec: 1391.33,
        exactTotalSec: 1891.33,
        clockSec: 1892,
        parts: CAMBRIDGE_17_PART_AUDIO_SECONDS
      },
      'bc-authentic-3': {
        audioSec: 1297.65,
        exactTotalSec: 1797.65,
        clockSec: 1798,
        parts: BC_AUTHENTIC_3_PART_AUDIO_SECONDS
      },
      'cambridge-16': {
        audioSec: 1330.42,
        exactTotalSec: 1830.42,
        clockSec: 1831,
        parts: CAMBRIDGE_16_PART_AUDIO_SECONDS
      },
      'gt-test-1': {
        audioSec: 1267.66,
        exactTotalSec: 1767.66,
        clockSec: 1768,
        parts: GT_TEST_1_PART_AUDIO_SECONDS
      },
      'cambridge-18-academic-test-1': {
        audioSec: 1353.73,
        exactTotalSec: 1853.73,
        clockSec: 1854,
        parts: CAMBRIDGE_18_LIBRARY_MEASURED_AUDIO_SECONDS
      }
    };

    for (const [examId, expected] of Object.entries(expectedExamDurations)) {
      const resolvedDurations = getExamSectionAudioDurations(examId);
      assert.deepStrictEqual(resolvedDurations, expected.parts, `Parts for ${examId} must match expected`);

      const audioSum = Number(
        (
          resolvedDurations[1] +
          resolvedDurations[2] +
          resolvedDurations[3] +
          resolvedDurations[4]
        ).toFixed(2)
      );
      assert.strictEqual(audioSum, expected.audioSec, `Audio total for ${examId} must equal ${expected.audioSec}`);

      const totalExact = calculateListeningTotalDurationSec(resolvedDurations);
      assert.strictEqual(totalExact, expected.exactTotalSec, `Exact total for ${examId} must equal ${expected.exactTotalSec}`);

      const initialClock = getCDIELTSSkillDurationSec('listening', resolvedDurations);
      assert.strictEqual(initialClock, expected.clockSec, `Initial clock for ${examId} must equal ${expected.clockSec}`);

      // Verify createInitialListeningTimerState initializes to exam-specific clock
      const initState = createInitialListeningTimerState(resolvedDurations);
      assert.strictEqual(initState.timeRemainingSec, expected.clockSec);
      assert.strictEqual(initState.section, 1);
      assert.strictEqual(initState.phase, 'pre_read');
      assert.strictEqual(initState.phaseCountdownSec, 35);

      // Verify all 4 sections + final check step through and submit once
      let simState = initState;
      for (const s of [1, 2, 3, 4] as const) {
        // Step pre-read to playing
        for (let t = 0; t < 35; t++) {
          simState = stepListeningPhaseState(simState, { isAudioActiveOrLoading: false }).nextState;
        }
        assert.strictEqual(simState.section, s);
        assert.strictEqual(simState.phase, 'playing');

        // Complete audio
        simState = completeListeningSectionAudioState(simState, s, resolvedDurations[s] * 1000).nextState;
        assert.strictEqual(simState.phase, 'section_check');

        // Step section review
        for (let r = 0; r < 60; r++) {
          simState = stepListeningPhaseState(simState, { isAudioActiveOrLoading: false }).nextState;
        }
        if (s < 4) {
          assert.strictEqual(simState.section, s + 1);
          assert.strictEqual(simState.phase, 'pre_read');
        } else {
          assert.strictEqual(simState.phase, 'end_of_test_buffer');
        }
      }

      // Step final 120s buffer to completion
      for (let b = 0; b < 120; b++) {
        simState = stepListeningPhaseState(simState, { isAudioActiveOrLoading: false }).nextState;
      }
      assert.strictEqual(simState.phase, 'completed');
      assert.strictEqual(simState.isListeningLocked, true);
      assert.strictEqual(simState.hasSubmitted, true);
      assert.strictEqual(simState.submissionCount, 1);

      // Subsequent step must not double submit
      const extraStep = stepListeningPhaseState(simState, { isAudioActiveOrLoading: false });
      assert.strictEqual(extraStep.action, 'none');
      assert.strictEqual(extraStep.nextState.submissionCount, 1);
    }

    // 2. Fallback for unknown exam ID defaults to 1854s
    const fallbackDurations = getExamSectionAudioDurations('unknown-exam');
    assert.strictEqual(getCDIELTSSkillDurationSec('listening', fallbackDurations), 1854);
    assert.strictEqual(getCDIELTSSkillDurationSec('listening'), 1854);

    // 3. Strict Module Duration Isolation: Reading, Writing, Speaking remain unaffected by audio durations
    for (const [examId] of Object.entries(expectedExamDurations)) {
      const resolved = getExamSectionAudioDurations(examId);
      assert.strictEqual(getCDIELTSSkillDurationSec('reading', resolved), 3600);
      assert.strictEqual(getCDIELTSSkillDurationSec('writing', resolved), 3600);
      assert.strictEqual(getCDIELTSSkillDurationSec('speaking', resolved), 840);
    }

    // 4. Session restoration clamping verification
    // Valid cached state within range is preserved
    const c17Durations = getExamSectionAudioDurations('cambridge-17');
    const c17Max = getCDIELTSSkillDurationSec('listening', c17Durations); // 1892
    const validCachedSec = 1200;
    const restoredValid =
      typeof validCachedSec === 'number' && validCachedSec > 0 && validCachedSec <= c17Max
        ? validCachedSec
        : c17Max;
    assert.strictEqual(restoredValid, 1200, 'Valid cached session time must be preserved');

    // Corrupted or stale cached state exceeding exam duration is clamped
    const corruptedCachedSec = 9999;
    const restoredClamped =
      typeof corruptedCachedSec === 'number' && corruptedCachedSec > 0 && corruptedCachedSec <= c17Max
        ? corruptedCachedSec
        : c17Max;
    assert.strictEqual(restoredClamped, 1892, 'Corrupted cached time must clamp to exam duration');

    // Stale Cambridge 18 duration (1988s) applied to shorter exam (e.g. gt-test-1: 1768s) is clamped
    const gtDurations = getExamSectionAudioDurations('gt-test-1');
    const gtMax = getCDIELTSSkillDurationSec('listening', gtDurations); // 1768
    const staleFromC18 = 1988;
    const restoredGtClamped =
      typeof staleFromC18 === 'number' && staleFromC18 > 0 && staleFromC18 <= gtMax
        ? staleFromC18
        : gtMax;
    assert.strictEqual(restoredGtClamped, 1768, 'Stale cross-exam cache must clamp to target exam duration');
  });
});



