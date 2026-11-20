import assert from 'node:assert/strict';
import { MOCK_EXAM_SETS, SPEAKING_TOPIC_BANK } from '../../data/mockExams';
import { SPRINT_17_SET } from '../../data/mockData/sprint17';
import {
  calculateOfficialListeningBand,
  calculateOfficialAcademicReadingBand,
  calculateOfficialGeneralTrainingReadingBand,
  isAnswerCorrect,
  isListeningAnswerCorrect
} from '../listeningAnswerEvaluator';
import { audioManager } from '../../services/AudioManager';
import { deriveActiveReadingHeading, extractActiveReadingPassage } from '../mockExamScoring';

function runReconstructedMockExamsTests() {
  console.log('=== Running BandSprint Phase 5.4B Reconstructed Mock Exam Verification Suite ===\n');

  assert.equal(MOCK_EXAM_SETS.length, 5, `Expected 5 mock exam sets in MOCK_EXAM_SETS, found ${MOCK_EXAM_SETS.length}`);

  const targetIds = ['sprint-18', 'sprint-17', 'bc-authentic-3', 'sprint-16', 'gt-test-1'];
  
  for (const id of targetIds) {
    const exam = MOCK_EXAM_SETS.find(e => e.id === id);
    assert.ok(exam, `Mock exam ${id} must exist in MOCK_EXAM_SETS`);

    console.log(`[Testing Exam]: ${exam.title} (${exam.id})`);

    // 1. Listening Sections & Scripts (No '...' placeholders, each section >= 600 words, synchronized with listeningScript)
    assert.ok(exam.listeningSections, `${id}: listeningSections must be defined`);
    for (let s = 1; s <= 4; s++) {
      const section = exam.listeningSections[s as 1 | 2 | 3 | 4];
      assert.ok(section.isAvailable, `${id}: Section ${s} must be available`);
      assert.notEqual(section.script.trim(), '...', `${id}: Section ${s} script must not be dummy placeholder '...'`);
      const secWords = section.script.trim().split(/\s+/).length;
      assert.ok(secWords >= 600, `${id}: Section ${s} script must be >= 600 words (found ${secWords})`);
      assert.ok(exam.listeningScript.includes(section.script.trim()), `${id}: Section ${s} script must be synchronized with full listeningScript`);
    }

    // 2. Listening Script Word Count
    const scriptWords = (exam.listeningScript || '').trim().split(/\s+/).length;
    assert.ok(scriptWords >= 2800, `${id}: Listening script must contain at least 2800 words (found ${scriptWords})`);
    console.log(`  ✓ Listening Script Word Count: ${scriptWords} words across 4 synchronized sections (PASSED)`);

    // 3. Questions Inventory
    const listeningQs = exam.questions.filter(q => q.section === 'listening');
    const readingQs = exam.questions.filter(q => q.section === 'reading');

    assert.equal(listeningQs.length, 40, `${id}: Must contain exactly 40 Listening questions (found ${listeningQs.length})`);
    assert.equal(readingQs.length, 40, `${id}: Must contain exactly 40 Reading questions (found ${readingQs.length})`);

    console.log(`  ✓ Question Inventory: 40 Listening Qs + 40 Reading Qs = 80 Total Qs (PASSED)`);

    // 4. Reading Passages Word Count (total >= 2150 words, each of the 3 passages/sections >= 700 words)
    const readingWords = (exam.readingPassage || '').trim().split(/\s+/).length;
    assert.ok(readingWords >= 2150, `${id}: Reading text must contain at least 2150 words (found ${readingWords})`);
    const rawPassages = exam.readingPassage
      .split(/(?=(?:READING\s+)?PASSAGE\s+[123]\b|SECTION\s+[123]\b)/i)
      .map(p => p.trim())
      .filter(Boolean);
    assert.equal(rawPassages.length, 3, `${id}: Reading text must contain 3 distinct passages/sections (found ${rawPassages.length})`);
    rawPassages.forEach((pText, idx) => {
      const pWords = pText.split(/\s+/).length;
      assert.ok(pWords >= 700, `${id}: Reading Passage/Section ${idx + 1} must contain >= 700 words (found ${pWords})`);
    });
    console.log(`  ✓ Reading Text Word Count: ${readingWords} words across 3 passages/sections (${rawPassages.map(p => p.split(/\s+/).length).join('w / ')}w) (PASSED)`);

    // 5. Answer Key Completeness & Acceptable Answers
    exam.questions.forEach((q) => {
      assert.ok(q.correctAnswer && q.correctAnswer.trim().length > 0, `${id}: Question ${q.id} must have a non-empty correctAnswer`);
      assert.ok(q.explanation && q.explanation.trim().length > 0, `${id}: Question ${q.id} must have a non-empty explanation`);
      // Test isAnswerCorrect with exact answer
      assert.ok(isAnswerCorrect(q as any, q.correctAnswer), `${id}: Question ${q.id} must evaluate to correct with exact answer`);
      // If acceptable answers exist, verify isAnswerCorrect recognizes them
      if (q.acceptableAnswers && q.acceptableAnswers.length > 0) {
        for (const alt of q.acceptableAnswers) {
          assert.ok(isAnswerCorrect(q as any, alt), `${id}: Question ${q.id} must evaluate to correct with acceptable alternative "${alt}"`);
        }
      }
    });
    console.log(`  ✓ Answer Keys & Acceptable Answers: 80/80 Complete (PASSED)`);

    // 6. Writing Configuration: Tasks 1 & 2 Prompts, task1Type, and Model Answers
    assert.ok(exam.writingPrompt && exam.writingPrompt.trim().length > 20, `${id}: Must have valid Task 2 writing prompt`);
    assert.ok(exam.task1Prompt && exam.task1Prompt.trim().length > 15, `${id}: Must have valid Task 1 prompt`);
    assert.ok(exam.task1Type && ['chart', 'table', 'process', 'letter', 'map'].includes(exam.task1Type), `${id}: Must have valid task1Type`);
    
    // Model Essay >= 250 words
    assert.ok(exam.modelEssay, `${id}: Must have modelEssay defined`);
    const modelEssayWords = exam.modelEssay.trim().split(/\s+/).length;
    assert.ok(modelEssayWords >= 250, `${id}: Task 2 modelEssay must contain at least 250 words (found ${modelEssayWords})`);

    // Task 1 Model >= 150 words
    assert.ok(exam.task1Model, `${id}: Must have task1Model defined`);
    const task1ModelWords = exam.task1Model.trim().split(/\s+/).length;
    assert.ok(task1ModelWords >= 150, `${id}: Task 1 task1Model must contain at least 150 words (found ${task1ModelWords})`);

    console.log(`  ✓ Writing Tasks 1 (${exam.task1Type}) & 2 Configured (Task 1: ${task1ModelWords}w, Task 2: ${modelEssayWords}w) (PASSED)`);

    // 7. Band Score Psychometric Calculations
    const fullListeningScore = calculateOfficialListeningBand(40, 40);
    assert.equal(fullListeningScore, 9.0, `${id}: Perfect Listening 40/40 must yield Band 9.0 (got ${fullListeningScore})`);
    const halfListeningScore = calculateOfficialListeningBand(23, 40);
    assert.ok(halfListeningScore >= 6.0 && halfListeningScore <= 6.5, `${id}: 23/40 Listening score must yield Band 6.0 - 6.5 (got ${halfListeningScore})`);

    if (exam.format === 'General Training') {
      const fullGTRScore = calculateOfficialGeneralTrainingReadingBand(40, 40);
      assert.equal(fullGTRScore, 9.0, `${id}: Perfect GT Reading 40/40 must yield Band 9.0 (got ${fullGTRScore})`);
      const raw30Score = calculateOfficialGeneralTrainingReadingBand(30, 40);
      assert.equal(raw30Score, 6.0, `${id}: GT Reading 30/40 must yield Band 6.0 (got ${raw30Score})`);
    } else {
      const fullReadingScore = calculateOfficialAcademicReadingBand(40, 40);
      assert.equal(fullReadingScore, 9.0, `${id}: Perfect Reading 40/40 must yield Band 9.0 (got ${fullReadingScore})`);
    }

    console.log(`  ✓ Psychometric Band Calculation Validated (PASSED)\n`);
  }

  // 8. Unique Content / Zero Duplicate Prompts Across All 400 Questions
  const scriptsSet = new Set(MOCK_EXAM_SETS.map(e => e.listeningScript));
  assert.equal(scriptsSet.size, 5, 'All 5 mock exam listening scripts must be distinct');

  const readingSet = new Set(MOCK_EXAM_SETS.map(e => e.readingPassage));
  assert.equal(readingSet.size, 5, 'All 5 mock exam reading passages must be distinct');

  const allNormalizedPrompts = new Map<string, string>();
  for (const exam of MOCK_EXAM_SETS) {
    for (const q of exam.questions) {
      const norm = q.prompt.trim().toLowerCase().replace(/\s+/g, ' ');
      assert.ok(
        !allNormalizedPrompts.has(norm),
        `Duplicate question prompt detected between ${allNormalizedPrompts.get(norm)} and ${exam.id} Q${q.id}: "${q.prompt}"`
      );
      allNormalizedPrompts.set(norm, `${exam.id} Q${q.id}`);
    }
  }
  assert.equal(allNormalizedPrompts.size, 400, 'All 400 questions across the 5 mock exams must have unique prompts');

  // Verify GT Test 1 has no cross-module duplication between listening and reading and no overlap with Sprint Practice Set 16 Section 2
  const gtExam = MOCK_EXAM_SETS.find(e => e.id === 'gt-test-1')!;
  assert.ok(!gtExam.readingPassage.includes('automated guided vehicles'), 'GT Test 1 Reading must not duplicate Listening robotics content');
  assert.ok(!gtExam.listeningSections![2].script.includes('Riverside Eco-Park'), 'GT Test 1 Section 2 must not overlap with Sprint Practice Set 16 Section 2 Riverside Eco-Park storyline');

  // 9. Speaking Topic Bank
  assert.equal(SPEAKING_TOPIC_BANK.length, 5, `Expected 5 unique speaking topics, found ${SPEAKING_TOPIC_BANK.length}`);
  const topicIds = new Set(SPEAKING_TOPIC_BANK.map(t => t.id));
  assert.equal(topicIds.size, 5, 'All 5 speaking topics must have unique IDs');

  // 10. PHASE 5.5A — Reading Question Order & Passage Association (P1: Q41-53, P2: Q54-66, P3: Q67-80)
  for (const exam of MOCK_EXAM_SETS) {
    const rQs = exam.questions.filter(q => q.section === 'reading');
    assert.equal(rQs.length, 40, `${exam.id}: must have 40 reading questions`);
    rQs.forEach((q, idx) => {
      const expectedId = 41 + idx;
      const expectedPassage = idx < 13 ? 1 : idx < 26 ? 2 : 3;
      assert.equal(q.id, expectedId, `${exam.id}: reading question at index ${idx} must have id ${expectedId}`);
      assert.ok(
        q.prompt.startsWith(`${expectedId}. `),
        `${exam.id} Q${q.id}: prompt must start with "${expectedId}. ", found "${q.prompt}"`
      );
      assert.equal(
        q.passage,
        expectedPassage,
        `${exam.id} Q${q.id}: expected passage ${expectedPassage}, found ${q.passage}`
      );
    });
  }
  console.log('✓ Reading Question Order & Passage Mapping (Q41-53 P1, Q54-66 P2, Q67-80 P3) Verified Across All 5 Exams (PASSED)');

  // 11. PHASE 5.5A — P0 Reading & Listening Answer-Key & Acceptable Alternatives Verification
  const c18 = MOCK_EXAM_SETS.find(e => e.id === 'sprint-18')!;
  const c17 = MOCK_EXAM_SETS.find(e => e.id === 'sprint-17')!;
  const bc3 = MOCK_EXAM_SETS.find(e => e.id === 'bc-authentic-3')!;
  const c16 = MOCK_EXAM_SETS.find(e => e.id === 'sprint-16')!;
  const gt1 = MOCK_EXAM_SETS.find(e => e.id === 'gt-test-1')!;

  const verifyQuestionVariants = (
    examSet: typeof c18,
    qId: number,
    validResponses: string[],
    invalidResponses: string[]
  ) => {
    const q = examSet.questions.find(item => item.id === qId);
    assert.ok(q, `${examSet.id} Q${qId} must exist`);
    for (const valid of validResponses) {
      assert.equal(
        isListeningAnswerCorrect(q! as any, valid),
        true,
        `${examSet.id} Q${qId} ("${q!.prompt}") must ACCEPT "${valid}"`
      );
    }
    for (const invalid of invalidResponses) {
      assert.equal(
        isListeningAnswerCorrect(q! as any, invalid),
        false,
        `${examSet.id} Q${qId} ("${q!.prompt}") must REJECT "${invalid}"`
      );
    }
  };

  // Sprint Practice Set 18: Q36, Q47 (physical degradation), Q52 (adult brain regions), Q53 (childhood polyglot advantage)
  verifyQuestionVariants(
    c18,
    36,
    ['85%', '85', '85 percent', 'eighty-five percent', 'eighty five percent'],
    ['75%', '850%', '£85', '15%']
  );
  verifyQuestionVariants(
    c18,
    47,
    ['DEGRADATION', 'physical degradation', 'atrophy', 'pathology', 'damage'],
    ['DETERIORATION', 'GROWTH', 'IMPROVEMENT', '45%']
  );
  verifyQuestionVariants(
    c18,
    49,
    ['DORSOLATERAL PREFRONTAL CORTEX', 'prefrontal cortex', 'caudate nucleus', 'basal ganglia'],
    ['ANTERIOR CINGULATE CORTEX', 'anterior cingulate', 'hippocampus']
  );
  verifyQuestionVariants(
    c18,
    52,
    [
      'hippocampus and superior temporal gyrus',
      'hippocampus, superior temporal gyrus',
      'hippocampus and inferior frontal cortex',
      'superior temporal gyrus and inferior frontal cortex'
    ],
    ['hippocampus and cerebral cortex', 'hippocampus, cerebral cortex', 'amygdala and cerebellum', 'visual cortex only']
  );
  verifyQuestionVariants(
    c18,
    53,
    [
      'native-like phonological acquisition',
      'native phonological acquisition',
      'effortless native-like phonological acquisition',
      'phonological acquisition',
      'automated intuitive grammar parsing',
      'grammar parsing'
    ],
    ['slower vocabulary growth', 'communicative interference']
  );

  // Sprint Practice Set 17: Q62 (vent bacteria compounds), Q70 (magma chamber migration), Q79 (gravitational masses), Q80 (earthquakes)
  verifyQuestionVariants(
    c17,
    62,
    [
      'hydrogen sulfide and methane',
      'hydrogen sulphide and methane',
      'hydrogen sulfide and dissolved hydrogen',
      'dissolved hydrogen and methane',
      'hydrogen and methane'
    ],
    ['oxygen and nitrogen', 'sodium chloride']
  );
  verifyQuestionVariants(
    c17,
    70,
    ['chamber migration', 'migration'],
    ['chamber monitoring', 'monitoring', 'solidification', 'ocean cooling']
  );
  verifyQuestionVariants(
    c17,
    79,
    ['gravitational masses', 'gravitational mass'],
    ['gravity', 'magnetic fields']
  );
  verifyQuestionVariants(
    c17,
    80,
    ['earthquakes', 'megathrust earthquakes', 'megathrust earthquakes and tsunami genesis', 'tsunami genesis', 'tsunamis'],
    ['earthquake systems', 'earthquake early warning', 'volcanic eruptions']
  );

  // BC Authentic 3: Q33 (24%), Q48 (left margin/margins), Q54 (40% construction CO2), Q58 (three weeks / 3 weeks), Q71 (25% cafeteria fruit)
  verifyQuestionVariants(
    bc3,
    33,
    ['24%', '24', '24 percent', 'twenty-four percent', 'twenty four percent'],
    ['42%', '240%', '$24']
  );
  verifyQuestionVariants(
    bc3,
    48,
    ['margin', 'margins', 'left margin', 'left margins'],
    ['footer', 'right column']
  );
  verifyQuestionVariants(
    bc3,
    54,
    ['40%', '40', '40 percent', 'forty percent', 'forty'],
    ['25%', '45%', '4%', '£40']
  );
  verifyQuestionVariants(
    bc3,
    58,
    ['three weeks', '3 weeks', 'within three weeks', 'within 3 weeks'],
    ['three months', '3 days']
  );
  verifyQuestionVariants(
    bc3,
    71,
    ['25%', '25', '25 percent', 'twenty-five percent', 'twenty five percent'],
    ['40%', '15%', '25 kg']
  );

  // Sprint Practice Set 16: Q31 (70%), Q32 (95%), Q34 (200%), Q47 (75%), Q48 (forty years / 40 years / four decades), Q61 (ganglion photoreceptor cells)
  verifyQuestionVariants(
    c16,
    31,
    ['70%', '70', '70 percent', 'seventy percent', 'seventy'],
    ['95%', '7%', '$70']
  );
  verifyQuestionVariants(
    c16,
    32,
    ['95%', '95', '95 percent', 'ninety-five percent', 'ninety five percent'],
    ['70%', '85%', '95 liters']
  );
  verifyQuestionVariants(
    c16,
    34,
    ['200%', '200', '200 percent', 'two hundred percent', 'two hundred'],
    ['20%', '100%', '£200']
  );
  verifyQuestionVariants(
    c16,
    47,
    ['75%', '75', '75 percent', 'seventy-five percent'],
    ['55%', '95%']
  );
  verifyQuestionVariants(
    c16,
    48,
    ['forty years', '40 years', 'forty-year', '40-year', 'four decades', '4 decades'],
    ['twenty years', '8 hours']
  );
  verifyQuestionVariants(
    c16,
    61,
    [
      'ganglion photoreceptor cells',
      'ganglion cells',
      'retinal ganglion photoreceptor cells',
      'retinal ganglion cells',
      'photoreceptor cells'
    ],
    ['motor neurons', 'olfactory bulbs']
  );

  // General Training 1: Q32 (300%), Q48 (20 seconds / twenty seconds), Q68 (pushing feet against ground)
  verifyQuestionVariants(
    gt1,
    32,
    ['300%', '300', '300 percent', 'three hundred percent'],
    ['30%', '200%']
  );
  verifyQuestionVariants(
    gt1,
    48,
    ['20 seconds', 'twenty seconds', '20', 'twenty'],
    ['20 minutes', '5 seconds']
  );
  verifyQuestionVariants(
    gt1,
    68,
    [
      'pushing feet against ground',
      'pushing their feet directly against the ground',
      'pushing feet directly against the ground',
      'pushing their feet against the ground',
      'pushing feet against the ground'
    ],
    ['pedaling a rear chain', 'steam engine']
  );

  // Safeguard: non-percentage count questions (e.g. Sprint Practice Set 18 Q6: 85 guests) must reject "85%"
  verifyQuestionVariants(
    c18,
    6,
    ['85', '85 people', '85 guests', 'eighty-five'],
    ['85%', '85 percent', '£85', '75']
  );
  console.log('✓ P0 Reading & Listening Answer Keys, Percentage Normalization, and Strict Safeguards Verified (PASSED)');

  // 12. PHASE 5.5A — AudioManager Speaker-Parser Regression Suite
  const forbiddenBogusLabels = new Set([
    'Bio',
    'Consider the fast',
    'This precise micro',
    'Post',
    '06',
    'In closed',
    'For high'
  ]);

  for (const exam of MOCK_EXAM_SETS) {
    for (const secNum of [1, 2, 3, 4] as const) {
      const sec = exam.listeningSections![secNum];
      const turns = audioManager.parseMultiSpeakerScript(sec.script!);
      assert.ok(turns.length >= 2, `${exam.id} Section ${secNum}: must produce at least 2 turns (opening narrator + speaker)`);

      // Opening narrator instructions must be preserved on Turn 0
      assert.equal(
        turns[0].speakerId,
        'speaker_04',
        `${exam.id} Section ${secNum}: first turn must be Examiner Arthur (speaker_04)`
      );
      assert.ok(
        /Section \d|International English Language Testing System/i.test(turns[0].text),
        `${exam.id} Section ${secNum}: opening narrator instruction must be preserved`
      );

      // Every speakerName must be a valid character/examiner, never a hyphenated word fragment or timestamp
      for (const t of turns) {
        const label = t.speakerName || '';
        assert.ok(label.length >= 2, `${exam.id} Section ${secNum}: speakerName must be non-empty`);
        assert.ok(!forbiddenBogusLabels.has(label), `${exam.id} Section ${secNum}: bogus speakerName "${label}" detected`);
        assert.ok(!/^\d+$/.test(label), `${exam.id} Section ${secNum}: numeric/timestamp speakerName "${label}" detected`);
        assert.ok(!/-/.test(label), `${exam.id} Section ${secNum}: hyphenated fragment "${label}" detected as speakerName`);
      }
    }
  }

  // Direct unit tests on hyphenated words, timestamps, and unlabeled monologues
  const c18s4Turns = audioManager.parseMultiSpeakerScript(c18.listeningSections![4].script!);
  const c18s4Combined = c18s4Turns.map(t => t.text).join(' ');
  assert.ok(c18s4Combined.includes('Bio-fouling refers to the undesirable accumulation'), 'Must preserve "Bio-fouling refers to the undesirable accumulation" intact');
  assert.ok(c18s4Combined.includes('Consider the fast-swimming pelagic shark'), 'Must preserve "Consider the fast-swimming pelagic shark" intact');
  assert.ok(c18s4Combined.includes('This precise micro-topography disrupts'), 'Must preserve "This precise micro-topography disrupts" intact');

  const c17s4Turns = audioManager.parseMultiSpeakerScript(c17.listeningSections![4].script!);
  const c17s4Combined = c17s4Turns.map(t => t.text).join(' ');
  assert.ok(c17s4Combined.includes('Post-pubescent language acquisition'), 'Must preserve "Post-pubescent language acquisition" intact');

  const c16s2Turns = audioManager.parseMultiSpeakerScript(c16.listeningSections![2].script!);
  const c16s2Combined = c16s2Turns.map(t => t.text).join(' ');
  assert.ok(c16s2Combined.includes('The complex opens daily from 06:00 AM'), 'Must preserve timestamp "06:00 AM" intact without splitting');

  const c16s4Turns = audioManager.parseMultiSpeakerScript(c16.listeningSections![4].script!);
  const c16s4Combined = c16s4Turns.map(t => t.text).join(' ');
  assert.ok(c16s4Combined.includes('In closed-loop aeroponic cultivation chambers'), 'Must preserve "In closed-loop aeroponic cultivation chambers" intact');

  const gt1s4Turns = audioManager.parseMultiSpeakerScript(gt1.listeningSections![4].script!);
  const gt1s4Combined = gt1s4Turns.map(t => t.text).join(' ');
  assert.ok(gt1s4Combined.includes('For high-bay vertical storage optimization'), 'Must preserve "For high-bay vertical storage optimization" intact');

  // Unlabeled paragraphs fallback test
  const unlabeledMonologue = 'First paragraph with hyphenated bio-fouling terms.\n\nSecond paragraph discussing 06:00 horarios and closed-loop systems.';
  const unlabeledParsed = audioManager.parseMultiSpeakerScript(unlabeledMonologue);
  assert.equal(unlabeledParsed.length, 1, 'Unlabeled narrative paragraphs must stay intact as 1 narrator turn');
  assert.ok(unlabeledParsed[0].text.includes('bio-fouling') && unlabeledParsed[0].text.includes('06:00'));
  assert.deepEqual(audioManager.parseMultiSpeakerScript('   \n  '), [], 'Empty/whitespace input must return empty array');

  // Phase 5.5H.2: Direct speaker-label vs prose/hyphen/timestamp classification assertions
  const c18s3Turns = audioManager.parseMultiSpeakerScript(c18.listeningSections![3].script!);
  assert.ok(
    c18s3Turns.some((t) => t.speakerName === 'Dr. Pendelton' && t.speakerId === 'speaker_03'),
    'Must recognize "Dr. Pendelton:" and assign speaker_03'
  );
  assert.ok(
    c18s3Turns.some((t) => t.speakerName === 'Hannah & Marcus' && t.speakerId === 'speaker_05' && t.text === 'Thank you very much for your guidance, Dr. Pendelton!'),
    'Must recognize "Hannah & Marcus:" in Section 3 and preserve voice assignment'
  );
  assert.strictEqual(audioManager.extractValidSpeakerTurn('In closed-loop systems: plant roots are misted.'), null);
  assert.strictEqual(audioManager.extractValidSpeakerTurn('06:00: the complex opens daily.'), null);
  assert.strictEqual(audioManager.extractValidSpeakerTurn('Post-pubescent: language acquisition relies on declarative memory.'), null);
  assert.strictEqual(audioManager.extractValidSpeakerTurn('Bio-fouling: undesirable accumulation on ship hulls.'), null);

  console.log('✓ AudioManager Speaker-Parser Regression Suite Verified Across All 20 Sections & Edge Cases (PASSED)');

  // 13. PHASE 5.5A.2 — Targeted Answer-Key Hygiene & Raw/Runtime Passage Metadata Verification
  const hygieneChecks: Array<{
    exam: typeof c18;
    qId: number;
    expectedCanonical: string;
    expectedPreservedAlts: string[];
    removedInvalidAlts: string[];
  }> = [
    {
      exam: c18,
      qId: 47,
      expectedCanonical: 'DEGRADATION',
      expectedPreservedAlts: ['PHYSICAL DEGRADATION', 'ATROPHY', 'PATHOLOGY', 'DAMAGE'],
      removedInvalidAlts: ['DETERIORATION']
    },
    {
      exam: c18,
      qId: 49,
      expectedCanonical: 'DORSOLATERAL PREFRONTAL CORTEX',
      expectedPreservedAlts: ['PREFRONTAL CORTEX', 'CAUDATE NUCLEUS', 'BASAL GANGLIA'],
      removedInvalidAlts: ['ANTERIOR CINGULATE CORTEX', 'ANTERIOR CINGULATE']
    },
    {
      exam: c18,
      qId: 52,
      expectedCanonical: 'HIPPOCAMPUS AND SUPERIOR TEMPORAL GYRUS',
      expectedPreservedAlts: [
        'HIPPOCAMPUS, SUPERIOR TEMPORAL GYRUS',
        'HIPPOCAMPUS AND INFERIOR FRONTAL CORTEX',
        'HIPPOCAMPUS, INFERIOR FRONTAL CORTEX',
        'SUPERIOR TEMPORAL GYRUS AND INFERIOR FRONTAL CORTEX',
        'SUPERIOR TEMPORAL GYRUS, INFERIOR FRONTAL CORTEX'
      ],
      removedInvalidAlts: ['HIPPOCAMPUS AND CEREBRAL CORTEX', 'HIPPOCAMPUS, CEREBRAL CORTEX']
    },
    {
      exam: c17,
      qId: 70,
      expectedCanonical: 'CHAMBER MIGRATION',
      expectedPreservedAlts: ['MIGRATION'],
      removedInvalidAlts: ['CHAMBER MONITORING', 'MONITORING']
    },
    {
      exam: c17,
      qId: 79,
      expectedCanonical: 'GRAVITATIONAL MASSES',
      expectedPreservedAlts: ['GRAVITATIONAL MASS'],
      removedInvalidAlts: ['GRAVITY']
    },
    {
      exam: c17,
      qId: 80,
      expectedCanonical: 'EARTHQUAKES',
      expectedPreservedAlts: [
        'MEGATHRUST EARTHQUAKES',
        'MEGATHRUST EARTHQUAKES AND TSUNAMI GENESIS',
        'TSUNAMI GENESIS',
        'TSUNAMIS'
      ],
      removedInvalidAlts: ['EARTHQUAKE SYSTEMS', 'EARTHQUAKE EARLY WARNING']
    },
    {
      exam: c16,
      qId: 66,
      expectedCanonical: 'CLUSTER N',
      expectedPreservedAlts: [],
      removedInvalidAlts: ['N']
    },
    {
      exam: gt1,
      qId: 25,
      expectedCanonical: 'MISE EN PLACE',
      expectedPreservedAlts: [],
      removedInvalidAlts: ['MIS EN PLACE']
    }
  ];

  for (const check of hygieneChecks) {
    const q = check.exam.questions.find((item) => item.id === check.qId);
    assert.ok(q, `${check.exam.id} Q${check.qId} must exist`);
    assert.equal(
      q!.correctAnswer,
      check.expectedCanonical,
      `${check.exam.id} Q${check.qId}: canonical correctAnswer must remain "${check.expectedCanonical}"`
    );
    const actualAlts = q!.acceptableAnswers || [];
    assert.deepEqual(
      actualAlts,
      check.expectedPreservedAlts,
      `${check.exam.id} Q${check.qId}: preserved acceptableAnswers mismatch`
    );
    for (const removed of check.removedInvalidAlts) {
      assert.ok(
        !actualAlts.includes(removed),
        `${check.exam.id} Q${check.qId}: invalid alternative "${removed}" must be absent from acceptableAnswers`
      );
      assert.equal(
        isListeningAnswerCorrect(q! as any, removed),
        false,
        `${check.exam.id} Q${check.qId}: production evaluator must REJECT removed invalid alternative "${removed}"`
      );
    }
    assert.equal(
      isListeningAnswerCorrect(q! as any, check.expectedCanonical),
      true,
      `${check.exam.id} Q${check.qId}: production evaluator must ACCEPT canonical "${check.expectedCanonical}"`
    );
    for (const preserved of check.expectedPreservedAlts) {
      assert.equal(
        isListeningAnswerCorrect(q! as any, preserved),
        true,
        `${check.exam.id} Q${check.qId}: production evaluator must ACCEPT preserved alternative "${preserved}"`
      );
    }
  }

  // Verify Sprint Practice Set 17 raw source Q41-Q80 explicit passage assignments and runtime passage resolution
  const rawC17Reading = SPRINT_17_SET.questions.filter((q) => q.section === 'reading');
  assert.equal(rawC17Reading.length, 40, 'SPRINT_17_SET must have 40 Reading questions');
  for (const q of rawC17Reading) {
    const expectedPassage: 1 | 2 | 3 = q.id <= 53 ? 1 : q.id <= 66 ? 2 : 3;
    assert.equal(
      q.passage,
      expectedPassage,
      `sprint17.ts raw Q${q.id}: expected explicit passage ${expectedPassage}, found ${q.passage}`
    );
    const heading = deriveActiveReadingHeading(SPRINT_17_SET, q);
    const extracted = extractActiveReadingPassage(SPRINT_17_SET, q);
    assert.equal(heading.passageNumber, expectedPassage, `sprint-17 Q${q.id} runtime heading passageNumber must be ${expectedPassage}`);
    assert.equal(extracted.passageNumber, expectedPassage, `sprint-17 Q${q.id} runtime extracted passageNumber must be ${expectedPassage}`);
    assert.ok(
      extracted.activePassageText.startsWith(`PASSAGE ${expectedPassage}:`),
      `sprint-17 Q${q.id} activePassageText must start with PASSAGE ${expectedPassage}:`
    );
  }

  // Verify all 5 exams retain 40 Listening + 40 Reading questions and zero duplicate question IDs
  for (const exam of MOCK_EXAM_SETS) {
    const lQs = exam.questions.filter((q) => q.section === 'listening');
    const rQs = exam.questions.filter((q) => q.section === 'reading');
    assert.equal(lQs.length, 40, `${exam.id}: must retain 40 Listening questions`);
    assert.equal(rQs.length, 40, `${exam.id}: must retain 40 Reading questions`);
    const uniqueIds = new Set(exam.questions.map((q) => q.id));
    assert.equal(uniqueIds.size, 80, `${exam.id}: must have 80 unique question IDs with zero duplicates`);
  }

  console.log('✓ Phase 5.5A.2 Answer-Key Hygiene & Raw/Runtime Sprint Practice Set 17 Passage Metadata Verified (PASSED)');
  console.log('✓ All 400 Questions Across 5 Mock Exam Sets Have Unique Prompts (PASSED)');
  console.log('✓ All 5 Mock Exam Sets are unique and distinct (PASSED)');
  console.log('✓ Speaking Topic Bank contains 5 distinct topics (PASSED)');
  console.log('\n=== ALL PHASE 5.4B, PHASE 5.5, PHASE 5.5A & PHASE 5.5A.2 RECONSTRUCTED MOCK EXAM TESTS PASSED SUCCESSFULLY ===');
}

runReconstructedMockExamsTests();

