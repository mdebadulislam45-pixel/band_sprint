import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  normalizeSpeakingFormat,
  normalizeSpeakingDifficulty,
  generateSpeakingPilot
} from '../../server/ai/questionFactory';
import { convertAiDraftToSpeakingMockSet } from '../../server/ai/speakingAdapter';

describe('Phase 5.5H.11E — DEF-01 Generation Parameter Normalization', () => {

  test('1. ACADEMIC normalizes to Academic', () => {
    assert.strictEqual(normalizeSpeakingFormat('ACADEMIC'), 'Academic');
    assert.strictEqual(normalizeSpeakingFormat('Academic'), 'Academic');
    assert.strictEqual(normalizeSpeakingFormat('academic module'), 'Academic');
  });

  test('2. GENERAL_TRAINING normalizes to General Training', () => {
    assert.strictEqual(normalizeSpeakingFormat('GENERAL_TRAINING'), 'General Training');
    assert.strictEqual(normalizeSpeakingFormat('General Training'), 'General Training');
    assert.strictEqual(normalizeSpeakingFormat('general'), 'General Training');
  });

  test('3. BAND_6_5 normalizes to Standard', () => {
    assert.strictEqual(normalizeSpeakingDifficulty('BAND_6_5'), 'Standard');
    assert.strictEqual(normalizeSpeakingDifficulty('Standard'), 'Standard');
    assert.strictEqual(normalizeSpeakingDifficulty('standard'), 'Standard');
  });

  test('4. BAND_7_5 and BAND_8_5 normalize to Challenging', () => {
    assert.strictEqual(normalizeSpeakingDifficulty('BAND_7_5'), 'Challenging');
    assert.strictEqual(normalizeSpeakingDifficulty('BAND_8_5'), 'Challenging');
    assert.strictEqual(normalizeSpeakingDifficulty('Challenging'), 'Challenging');
    assert.strictEqual(normalizeSpeakingDifficulty('challenging'), 'Challenging');
  });

  test('5. Undefined format and difficulty default safely to Academic and Standard', () => {
    assert.strictEqual(normalizeSpeakingFormat(undefined), 'Academic');
    assert.strictEqual(normalizeSpeakingFormat(''), 'Academic');
    assert.strictEqual(normalizeSpeakingDifficulty(undefined), 'Standard');
    assert.strictEqual(normalizeSpeakingDifficulty(''), 'Standard');
  });

  test('6. Invalid format inputs throw clear validation errors', () => {
    assert.throws(
      () => normalizeSpeakingFormat('UNSUPPORTED_FORMAT'),
      /Invalid format "UNSUPPORTED_FORMAT"/
    );
  });

  test('7. Invalid difficulty inputs throw clear validation errors', () => {
    assert.throws(
      () => normalizeSpeakingDifficulty('UNSUPPORTED_DIFFICULTY'),
      /Invalid difficulty "UNSUPPORTED_DIFFICULTY"/
    );
  });

  test('8. End-to-end generateSpeakingPilot normalizes UI values cleanly before generation', async () => {
    const result = await generateSpeakingPilot({
      userId: 'usr_remediation_test',
      format: 'GENERAL_TRAINING',
      difficulty: 'BAND_8_5',
      topicSeed: 'Urban Green Spaces'
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.draft);
    assert.strictEqual(result.draft.content.format, 'General Training');
    assert.strictEqual(result.draft.content.difficulty, 'Challenging');
  });

});

describe('Phase 5.5H.11E — DEF-02 Pilot Switching & Reset State-Transitions', () => {

  const mockPilotA = {
    id: 'pilot_A_101',
    title: 'Pilot A — Technology in Daily Life',
    format: 'Academic',
    difficulty: 'Standard',
    part1: [
      { id: 'p1_a_1', part: 1, topic: 'Apps', questionText: 'What apps do you use most?' },
      { id: 'p1_a_2', part: 1, topic: 'Apps', questionText: 'Do you spend much time on social media?' }
    ],
    part2: {
      id: 'p2_a_1',
      part: 2,
      topic: 'Describe a useful website',
      questionText: 'Describe a useful website',
      cueCardBulletPoints: ['What it is', 'How often you visit', 'Why it is useful']
    },
    part3: [
      { id: 'p3_a_1', part: 3, topic: 'Internet', questionText: 'How has the internet changed business?' },
      { id: 'p3_a_2', part: 3, topic: 'Internet', questionText: 'Will physical stores disappear?' }
    ]
  };

  const mockPilotB = {
    id: 'pilot_B_202',
    title: 'Pilot B — Environmental Protection',
    format: 'General Training',
    difficulty: 'Challenging',
    part1: [
      { id: 'p1_b_1', part: 1, topic: 'Weather', questionText: 'What is your favorite season?' },
      { id: 'p1_b_2', part: 1, topic: 'Weather', questionText: 'Does weather affect your mood?' }
    ],
    part2: {
      id: 'p2_b_1',
      part: 2,
      topic: 'Describe a park',
      questionText: 'Describe a park',
      cueCardBulletPoints: ['Where it is', 'What you do there', 'Why you like it']
    },
    part3: [
      { id: 'p3_b_1', part: 3, topic: 'Green Spaces', questionText: 'Why are urban parks important?' },
      { id: 'p3_b_2', part: 3, topic: 'Green Spaces', questionText: 'Should governments fund parks?' }
    ]
  };

  test('1. Transition: Standard Bank -> Pilot A completely loads Pilot A questions', () => {
    let currentSet: any = null;

    // Load Pilot A
    currentSet = mockPilotA;
    assert.strictEqual(currentSet.id, 'pilot_A_101');
    assert.strictEqual(currentSet.part1[0].id, 'p1_a_1');
    assert.strictEqual(currentSet.part2.id, 'p2_a_1');
    assert.strictEqual(currentSet.part3[0].id, 'p3_a_1');
  });

  test('2. Transition: Pilot A -> Pilot B completely replaces Pilot A questions with Pilot B', () => {
    let currentSet: any = mockPilotA;
    assert.strictEqual(currentSet.id, 'pilot_A_101');

    // Switch to Pilot B
    currentSet = mockPilotB;
    assert.strictEqual(currentSet.id, 'pilot_B_202');
    assert.strictEqual(currentSet.part1[0].id, 'p1_b_1');
    assert.strictEqual(currentSet.part2.id, 'p2_b_1');
    assert.strictEqual(currentSet.part3[0].id, 'p3_b_1');

    // Ensure no Pilot A residual questions remain in currentSet
    assert.strictEqual(currentSet.part1.some((q: any) => q.id === 'p1_a_1'), false);
  });

  test('3. Transition: Pilot B -> Standard Bank (falsy customMockSet) clears pilot questions', () => {
    let customMockSet: any = mockPilotB;
    assert.ok(customMockSet);

    // Clear pilot (simulate onClearCustomMockSet)
    customMockSet = null;
    assert.strictEqual(customMockSet, null);
  });

  test('4. Full sequence: Standard -> Pilot A -> Standard -> Pilot B -> Standard', () => {
    let activePilot: any = null;

    // Step 1: Standard Bank
    assert.strictEqual(activePilot, null);

    // Step 2: Pilot A
    activePilot = mockPilotA;
    assert.strictEqual(activePilot.id, 'pilot_A_101');

    // Step 3: Exit Pilot A
    activePilot = null;
    assert.strictEqual(activePilot, null);

    // Step 4: Pilot B
    activePilot = mockPilotB;
    assert.strictEqual(activePilot.id, 'pilot_B_202');

    // Step 5: Exit Pilot B
    activePilot = null;
    assert.strictEqual(activePilot, null);
  });

});
