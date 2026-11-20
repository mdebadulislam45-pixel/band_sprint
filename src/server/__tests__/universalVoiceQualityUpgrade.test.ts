import assert from 'node:assert/strict';
import { IELTS_CHARACTERS } from '../../../server';
import { EXAMINER_VOICE_REGISTRY, resolveRegionalExaminerSpeaker } from '../../config/voiceConfig';
import { inferSpeechDeliveryProfile, SPEECH_DELIVERY_PROFILES } from '../../config/speechDirection';

console.log('[Test Suite] Running Stage D2 Universal Premium Voice Quality Upgrade Tests...');

// 1. Full Character Inventory Check (17 Characters)
console.log('1. Verifying 21 character identities, clean pitch contours (+0Hz), and rate offsets...');
const characterIds = Object.keys(IELTS_CHARACTERS);
assert.equal(characterIds.length, 21, `Expected 21 distinct characters, found ${characterIds.length}`);

for (const [id, char] of Object.entries(IELTS_CHARACTERS)) {
  assert.ok(char.name, `Character ${id} must have a non-empty name`);
  assert.ok(char.edgeVoice, `Character ${id} must have an assigned Edge voice`);
  assert.equal(
    char.defaultPitch,
    '+0Hz',
    `Character ${id} (${char.name}) must have clean +0Hz pitch contour to prevent robotic metallic warping`
  );
  assert.equal(
    char.defaultRateOffset,
    0,
    `Character ${id} (${char.name}) must have 0 rate offset`
  );
  assert.ok(
    char.gender === 'male' || char.gender === 'female',
    `Character ${id} must have a valid gender`
  );
}

// 2. Female Examiner Voice Registry Calibration (Fixing Clara's 1.18 pitch defect)
console.log('2. Verifying Clara & Arthur pitch preferences in voiceConfig.ts...');
const claraConfig = EXAMINER_VOICE_REGISTRY.clara;
assert.ok(claraConfig, 'Clara examiner configuration must exist');
assert.equal(
  claraConfig.pitchPreference,
  1.0,
  `Clara pitchPreference must be 1.0 (got ${claraConfig.pitchPreference})`
);
assert.equal(
  claraConfig.pitch,
  1.0,
  `Clara pitch must be 1.0 (got ${claraConfig.pitch})`
);

const arthurConfig = EXAMINER_VOICE_REGISTRY.arthur;
assert.ok(arthurConfig, 'Arthur examiner configuration must exist');
assert.equal(arthurConfig.pitchPreference, 1.0, 'Arthur pitchPreference must be 1.0');
assert.equal(arthurConfig.pitch, 1.0, 'Arthur pitch must be 1.0');

// 3. Regional Examiners Pitch Verification
console.log('3. Verifying Regional UK Examiners pitch settings...');
for (const region of ['northern', 'scottish'] as const) {
  for (const gender of ['male', 'female'] as const) {
    const regionalSpeaker = resolveRegionalExaminerSpeaker(gender, region);
    assert.ok(regionalSpeaker.speakerId, `Regional speaker ${gender} ${region} must have speakerId`);
    const char = IELTS_CHARACTERS[regionalSpeaker.speakerId];
    assert.ok(char, `Character for ${regionalSpeaker.speakerId} must exist in IELTS_CHARACTERS`);
    assert.equal(char.defaultPitch, '+0Hz', `Regional character ${char.name} must have +0Hz pitch`);
  }
}

// 4. Delivery Profile Heuristics Verification
console.log('4. Verifying delivery profile heuristics...');
const vocabProfile = inferSpeechDeliveryProfile({
  text: 'Break a leg. Meaning: Good luck. Example: Break a leg tonight at the recital!',
  speakerId: 'speaker_04'
});
assert.equal(vocabProfile, 'vocabulary_example', 'Vocabulary text with meaning/example must map to vocabulary_example');

const questionProfile = inferSpeechDeliveryProfile({
  text: 'What do you think is the main advantage of public transport in metropolitan areas?',
  speakerId: 'speaker_04'
});
assert.equal(questionProfile, 'examiner_question', 'Questions must map to examiner_question');

const shortWordProfile = inferSpeechDeliveryProfile({
  text: 'Ubiquitous',
  speakerId: 'speaker_04'
});
assert.equal(shortWordProfile, 'pronunciation_model', 'Short single words must map to pronunciation_model');

const conversationProfile = inferSpeechDeliveryProfile({
  text: 'I really enjoyed walking along the riverbank on sunny Sunday afternoons.',
  speakerId: 'speaker_01'
});
assert.equal(conversationProfile, 'listening_dialogue', 'Standard dialogue must map to listening_dialogue');

const barnabyProfile = inferSpeechDeliveryProfile({
  text: 'Great work! Let us practice the next question together.',
  speaker: 'Barnaby',
  speakerId: 'speaker_barnaby'
});
assert.equal(barnabyProfile, 'barnaby_companion', 'Barnaby speech must map to barnaby_companion');

// 5. Speech Delivery Profiles Integrity Check
console.log('5. Verifying speech delivery profile tuning parameters...');
const barnabyTune = SPEECH_DELIVERY_PROFILES.barnaby_companion;
assert.ok(barnabyTune, 'barnaby_companion profile must exist');
assert.equal(barnabyTune.rateOffsetPercent, 2, 'Barnaby rate offset should be slightly upbeat (+2%)');
assert.equal(barnabyTune.pitchOffsetHz, 2, 'Barnaby pitch offset should be gentle (+2Hz) to remain clear and educational');

const examQuestionTune = SPEECH_DELIVERY_PROFILES.examiner_question;
assert.ok(examQuestionTune, 'examiner_question profile must exist');
assert.equal(examQuestionTune.pitchOffsetHz, 0, 'Examiner question pitch offset must be 0Hz');

const examInstructionTune = SPEECH_DELIVERY_PROFILES.examiner_instruction;
assert.ok(examInstructionTune, 'examiner_instruction profile must exist');
assert.equal(examInstructionTune.pitchOffsetHz, 0, 'Examiner instruction pitch offset must be 0Hz');

console.log('✅ ALL Stage D2 Universal Voice Quality Upgrade automated tests PASSED!');
process.exit(0);
