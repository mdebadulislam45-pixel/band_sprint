import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateSpeakingExam } from '../../server/ai/validationEngine';
import { SpeakingExamPackage } from '../../server/ai/schemas/speakingSchema';
import { SPEAKING_SYSTEM_INSTRUCTION, buildSpeakingPrompt, buildSpeakingRepairPrompt } from '../../server/ai/prompts/speakingPrompts';

function createValidSpeakingPackage(): SpeakingExamPackage {
  return {
    examId: 'pkg_speaking_acad_01',
    schemaVersion: '1.0',
    title: 'IELTS Academic Speaking Practice Exam — Urban Life & Technology',
    format: 'Academic',
    topicDomain: 'Technology & Urban Living',
    difficulty: 'Standard',
    createdAt: Date.now(),
    part1: {
      topicGroups: [
        {
          topicId: 'p1_topic_hometown',
          title: 'Hometown & Local Area',
          questions: [
            { id: 'q_p1_01', prompt: 'Where is your hometown located?' },
            { id: 'q_p1_02', prompt: 'What do you like most about living in your town?' },
            { id: 'q_p1_03', prompt: 'Has your hometown changed much in recent years?' }
          ]
        },
        {
          topicId: 'p1_topic_technology',
          title: 'Daily Technology Use',
          questions: [
            { id: 'q_p1_04', prompt: 'How often do you use a computer or smartphone?' },
            { id: 'q_p1_05', prompt: 'Did you use much technology when you were a child?' },
            { id: 'q_p1_06', prompt: 'Do you think modern technology saves people time?' }
          ]
        }
      ]
    },
    part2: {
      id: 'q_p2_cue_01',
      topic: 'Describe a public park or garden you enjoy visiting.',
      instructions: 'You should say where it is, what you do when you visit, who you go there with, and explain why you like visiting this park.',
      bulletPrompts: [
        'Where the park or garden is located',
        'What activities you enjoy doing there',
        'Who usually accompanies you when you visit',
        'Explain why this park is special or enjoyable to you'
      ],
      preparationTimeSeconds: 60,
      speakingTimeSeconds: 120,
      roundingOffQuestion: 'Do many other people visit this park?',
      examinerIntro: 'Now, I would like you to speak for one to two minutes on a topic.'
    },
    part3: {
      themes: [
        {
          themeId: 'p3_theme_public_spaces',
          title: 'Importance of Public Green Spaces',
          connectedPart2Theme: 'Public parks, gardens, and urban green spaces',
          questions: [
            { id: 'q_p3_01', prompt: 'Why is it important for cities to have public parks and gardens?', examinerProbeNotes: 'Probe health and community aspects' },
            { id: 'q_p3_02', prompt: 'Do you think governments should invest more money in creating green spaces in urban areas?', examinerProbeNotes: 'Probe budget prioritization' },
            { id: 'q_p3_03', prompt: 'How might public parks change in the future as cities become more densely populated?', examinerProbeNotes: 'Probe future trends' }
          ]
        },
        {
          themeId: 'p3_theme_recreation_lifestyle',
          title: 'Leisure and Quality of Life',
          connectedPart2Theme: 'Outdoor leisure and urban park recreation',
          questions: [
            { id: 'q_p3_04', prompt: 'How have people’s outdoor leisure habits changed over the past few decades?' },
            { id: 'q_p3_05', prompt: 'Compare the recreational facilities available in rural areas with those in major cities.' }
          ]
        }
      ]
    }
  };
}

describe('Phase 5.5H.11B — AI Speaking Factory Foundation & Independent Validation', () => {

  it('1. valid complete Speaking package passes schema validation', () => {
    const validPkg = createValidSpeakingPackage();
    const result = validateSpeakingExam(validPkg);
    assert.equal(result.passed, true, 'Valid Speaking package must pass validation');
    assert.equal(result.errors.length, 0);
    assert.equal(result.stats.passageCount, 3);
  });

  it('2. missing Part 1 fails validation', () => {
    const pkg: any = createValidSpeakingPackage();
    delete pkg.part1;
    const result = validateSpeakingExam(pkg);
    assert.equal(result.passed, false);
    assert.ok(result.errors.some(e => e.includes('Part 1 section is missing')));
  });

  it('3. missing Part 2 fails validation', () => {
    const pkg: any = createValidSpeakingPackage();
    delete pkg.part2;
    const result = validateSpeakingExam(pkg);
    assert.equal(result.passed, false);
    assert.ok(result.errors.some(e => e.includes('Part 2 section')));
  });

  it('4. missing Part 3 fails validation', () => {
    const pkg: any = createValidSpeakingPackage();
    delete pkg.part3;
    const result = validateSpeakingExam(pkg);
    assert.equal(result.passed, false);
    assert.ok(result.errors.some(e => e.includes('Part 3 section is missing')));
  });

  it('5. duplicate question IDs are detected', () => {
    const pkg = createValidSpeakingPackage();
    // Re-use Part 1 question ID in Part 3
    pkg.part3.themes[0].questions[0].id = 'q_p1_01';
    const result = validateSpeakingExam(pkg);
    assert.equal(result.passed, false);
    assert.ok(result.errors.some(e => e.includes('Duplicate Question ID "q_p1_01"')));
  });

  it('6. empty question text is rejected', () => {
    const pkg = createValidSpeakingPackage();
    pkg.part1.topicGroups[0].questions[0].prompt = '  ';
    const result = validateSpeakingExam(pkg);
    assert.equal(result.passed, false);
    assert.ok(result.errors.some(e => e.includes('Question prompt is empty')));
  });

  it('7. invalid cue-card structure is rejected', () => {
    const pkg = createValidSpeakingPackage();
    pkg.part2.topic = '';
    const result = validateSpeakingExam(pkg);
    assert.equal(result.passed, false);
    assert.ok(result.errors.some(e => e.includes('cue card topic is missing')));
  });

  it('8. missing Part 2 bullet prompts are rejected', () => {
    const pkg = createValidSpeakingPackage();
    pkg.part2.bulletPrompts = [];
    const result = validateSpeakingExam(pkg);
    assert.equal(result.passed, false);
    assert.ok(result.errors.some(e => e.includes('bulletPrompts array')));
  });

  it('9. Part 3 theme mismatch is flagged as warning', () => {
    const pkg = createValidSpeakingPackage();
    pkg.part3.themes[0].connectedPart2Theme = 'Deep sea marine biology and submarine exploration';
    const result = validateSpeakingExam(pkg);
    assert.ok(result.warnings.some(w => w.includes('does not share key theme terms')));
  });

  it('10. duplicate or near-duplicate questions are flagged', () => {
    const pkg = createValidSpeakingPackage();
    pkg.part3.themes[0].questions[1].prompt = 'Where is your hometown located?'; // Duplicate of Part 1 q1
    const result = validateSpeakingExam(pkg);
    assert.equal(result.passed, false);
    assert.ok(result.errors.some(e => e.includes('Duplicate question prompt text detected')));
  });

  it('11. invalid timing metadata triggers warnings', () => {
    const pkg = createValidSpeakingPackage();
    pkg.part2.preparationTimeSeconds = 30; // Non-standard prep time
    pkg.part2.speakingTimeSeconds = 90;    // Non-standard speaking time
    const result = validateSpeakingExam(pkg);
    assert.ok(result.warnings.some(w => w.includes('60 seconds')));
    assert.ok(result.warnings.some(w => w.includes('120 seconds')));
  });

  it('12. valid Part 1 / Part 2 / Part 3 progression passes', () => {
    const validPkg = createValidSpeakingPackage();
    const result = validateSpeakingExam(validPkg);
    assert.equal(result.passed, true);
    assert.equal(result.stats.totalQuestions, 12); // 6 (Part 1) + 1 (Part 2) + 5 (Part 3)
    assert.deepEqual(result.stats.passageQuestions, [6, 1, 5]);
  });

  it('13. repair findings identify the relevant section and issue', () => {
    const invalidPkg: any = createValidSpeakingPackage();
    delete invalidPkg.part1.topicGroups[0].questions[0].prompt; // empty prompt
    invalidPkg.part2.bulletPrompts = []; // empty bullets

    const validation = validateSpeakingExam(invalidPkg);
    assert.equal(validation.passed, false);
    
    const repairPrompt = buildSpeakingRepairPrompt(invalidPkg, validation.errors);
    assert.ok(repairPrompt.includes('ERRORS DETECTED:'));
    assert.ok(repairPrompt.includes('Part 1'));
    assert.ok(repairPrompt.includes('Part 2'));
  });

  it('14. validation does not mutate the supplied exam package', () => {
    const originalPkg = createValidSpeakingPackage();
    const pkgCopy = JSON.parse(JSON.stringify(originalPkg));
    validateSpeakingExam(pkgCopy);
    assert.deepEqual(pkgCopy, originalPkg, 'Validation must be pure and not mutate input object');
  });

  it('15. verifies speaking prompt builder functions', () => {
    assert.ok(SPEAKING_SYSTEM_INSTRUCTION.includes('Senior IELTS Speaking Test Item Writer'));
    
    const prompt = buildSpeakingPrompt({ format: 'Academic', topicSeed: 'Urban Transport', difficulty: 'Standard' });
    assert.ok(prompt.includes('Format: Academic'));
    assert.ok(prompt.includes('Urban Transport'));
    assert.ok(prompt.includes('JSON Schema'));
  });
});
