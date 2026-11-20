import { audioManager } from '../../services/AudioManager';
import { audioService } from '../../services/audioService';
import { MOCK_EXAM_SETS, getExamListeningSection } from '../../data/mockExams';

console.log('=== RUNNING PHASE 5.5G MONOLOGUE CHUNKING & SILENT-SKIP ELIMINATION SUITE ===');

async function runSuite() {
  audioManager.reset('test_reset');
  (audioService as any).stopActiveSync();

  // Test 1: Short multi-speaker dialogue
  console.log('[Test 1]: Short multi-speaker dialogue parsing & turn ordering...');
  const rawScript1 = `
Student: Excuse me, where is the university library?
Librarian: It's located right behind the main administration building.
Student: Thank you very much!
`;
  const turns1 = audioManager.parseMultiSpeakerScript(rawScript1);
  if (turns1.length !== 3) throw new Error(`Expected 3 turns, got ${turns1.length}`);
  if (!turns1[0].text.includes('university library')) throw new Error('Turn 0 text mismatch');
  if (!turns1[1].text.includes('administration building')) throw new Error('Turn 1 text mismatch');
  console.log('  ✓ Test 1 Passed');

  // Test 2: 600–700 word monologue (Sprint Practice Set 18 Sec 4) sub-split into sentence sub-chunks
  console.log('[Test 2]: 600–700 word monologue (Sprint Practice Set 18 Sec 4) sub-chunking...');
  const sprint18 = MOCK_EXAM_SETS.find((e) => e.id === 'sprint-18')!;
  const sec4 = getExamListeningSection(sprint18, 4);
  if (!sec4.script) throw new Error('Sprint Practice Set 18 Sec 4 script missing');

  const turns2 = audioManager.parseMultiSpeakerScript(sec4.script);
  if (turns2.length <= 5) throw new Error(`Expected > 5 sub-chunks, got ${turns2.length}`);

  turns2.forEach((t, idx) => {
    const wordCount = t.text.split(/\s+/).filter(Boolean).length;
    if (wordCount > 90) throw new Error(`Line ${idx + 1} exceeds 90 words: ${wordCount}`);
    if (t.text.length > 550) throw new Error(`Line ${idx + 1} exceeds 550 chars: ${t.text.length}`);
  });
  console.log(`  ✓ Test 2 Passed: Sub-split into ${turns2.length} manageable sub-chunks (all <= 90 words)`);

  // Test 3: Monologue sub-chunks preserve speaker identity, gender, and sequence
  console.log('[Test 3]: Monologue sub-chunks speaker identity & sentence sequence...');
  const professorTurns = turns2.slice(1, turns2.length - 1);
  const expectedSpeakerId = professorTurns[0].speakerId;
  const expectedGender = professorTurns[0].gender;

  professorTurns.forEach((t) => {
    if (t.speakerId !== expectedSpeakerId) throw new Error(`Expected ${expectedSpeakerId}, got ${t.speakerId}`);
    if (t.gender !== expectedGender) throw new Error(`Expected ${expectedGender}, got ${t.gender}`);
  });
  if (!professorTurns[0].text.includes('Good morning, ladies and gentlemen.')) {
    throw new Error('Professor Vance opening line missing');
  }
  if (!professorTurns[professorTurns.length - 1].text.includes('In conclusion')) {
    throw new Error('Professor Vance closing line missing');
  }
  console.log('  ✓ Test 3 Passed: All sub-chunks preserved speaker identity, gender, and order');

  // Test 4: Silent-skip elimination
  console.log('[Test 4]: Silent-skip elimination on required dialogue line failure...');
  const testLines4 = [
    { text: 'First valid sentence.', speakerId: 'speaker_01', gender: 'male' as const },
    { text: 'Failing sentence that will throw error.', speakerId: 'speaker_02', gender: 'female' as const },
    { text: 'Third sentence.', speakerId: 'speaker_01', gender: 'male' as const }
  ];

  let completeFired4 = false;
  let errorFired4 = false;

  const originalPlaySingle = (audioService as any).playSingleLineOnSharedAudio.bind(audioService);
  (audioService as any).playSingleLineOnSharedAudio = async (
    text: string,
    speakerId: string,
    gender: any,
    myGen: number,
    onTick: any,
    meta: any
  ) => {
    if (text.includes('Failing sentence')) {
      meta?.onError?.(new Error('Simulated network timeout on line 1'));
      return Promise.resolve();
    }
    return originalPlaySingle(text, speakerId, gender, myGen, onTick, meta);
  };

  await audioService.playDialogueSequentially(testLines4, {
    onComplete: () => {
      completeFired4 = true;
    },
    onError: () => {
      errorFired4 = true;
    }
  });

  (audioService as any).playSingleLineOnSharedAudio = originalPlaySingle;

  if (completeFired4) throw new Error('Silent-skip defect detected: onComplete was fired when a line failed!');
  if (!errorFired4) throw new Error('onError was not fired on required line failure!');
  console.log('  ✓ Test 4 Passed: Silent-skip ELIMINATED (onComplete blocked, onError fired)');

  // Test 5: Duration aggregation across sub-chunks (> 320 seconds initial estimate for Sprint Practice Set 18 Part 4)
  console.log('[Test 5]: Total duration aggregation across sub-chunks (> 320s initial estimate)...');
  const estimatedDur = turns2.reduce((acc, t, idx) => {
    const words = t.text.split(/\s+/).filter(Boolean).length;
    const pauseSec = idx === turns2.length - 1 ? 0 : (t.pauseAfterMs ?? 220) / 1000;
    return acc + Math.max(2, Math.ceil(words / 2.05)) + pauseSec;
  }, 0);
  if (estimatedDur <= 320) throw new Error(`Estimated duration too low (< 320s): ${estimatedDur}s`);
  console.log(`  ✓ Test 5 Passed: Total initial estimated duration = ${estimatedDur.toFixed(1)}s (> 320 seconds)`);

  // Test 6: Section completion on success
  console.log('[Test 6]: Section completion requirement when all sub-chunks succeed...');
  const testLines6 = [
    { text: 'Line A', speakerId: 'speaker_01', gender: 'male' as const },
    { text: 'Line B', speakerId: 'speaker_02', gender: 'female' as const }
  ];

  let isCompleted6 = false;
  (audioService as any).playSingleLineOnSharedAudio = async (
    _t: any,
    _s: any,
    _g: any,
    _m: any,
    _onTick: any,
    meta: any
  ) => {
    meta?.onLineCompleted?.(5);
    return Promise.resolve();
  };

  await audioService.playDialogueSequentially(testLines6, {
    onComplete: () => {
      isCompleted6 = true;
    }
  });

  (audioService as any).playSingleLineOnSharedAudio = originalPlaySingle;
  if (!isCompleted6) throw new Error('Section failed to complete when all lines succeeded');
  console.log('  ✓ Test 6 Passed: Section completes cleanly when all required sub-chunks finish');

  // Test 7 (Phase 5.5H Cases 7 & 8 & 11): registerQuestionAudio() sub-chunks long q.dialogue turns & subSplitLongMonologueTurns() is idempotent
  console.log('[Test 7]: Universal registerQuestionAudio() q.dialogue sub-chunking & idempotency...');
  const longLectureText = professorTurns.map((t) => t.text).join(' ');
  const mockLongDialogueQuestion: any = {
    id: 'test_long_dialogue_q31',
    module: 'listening',
    section: 4,
    questionType: 'note_completion',
    topic: 'Mycorrhizal Fungal Networks',
    prompt: 'Complete the notes below.',
    correctAnswer: 'SYMBIOSIS',
    dialogue: [
      {
        speaker: 'Sprint Examiner (Arthur)',
        speakerId: 'speaker_04',
        gender: 'male',
        text: turns2[0].text
      },
      {
        speaker: 'Professor Vance',
        speakerId: 'speaker_03',
        gender: 'male',
        text: longLectureText
      }
    ]
  };

  const regMeta = audioManager.registerQuestionAudio(mockLongDialogueQuestion);
  if (regMeta.dialogue.length <= 5) {
    throw new Error(`Expected registerQuestionAudio to sub-chunk long q.dialogue turn into >5 chunks, got ${regMeta.dialogue.length}`);
  }
  regMeta.dialogue.forEach((line, idx) => {
    const wc = line.text.split(/\s+/).filter(Boolean).length;
    if (wc > 90) throw new Error(`registerQuestionAudio chunk ${idx} exceeds 90 words (${wc})`);
    if (line.text.length > 550) throw new Error(`registerQuestionAudio chunk ${idx} exceeds 550 chars (${line.text.length})`);
  });
  if (regMeta.dialogue[0].speakerId !== 'speaker_04') {
    throw new Error(`Explicit speaker_04 on turn 0 was not preserved: got ${regMeta.dialogue[0].speakerId}`);
  }
  for (let i = 1; i < regMeta.dialogue.length; i++) {
    if (regMeta.dialogue[i].speakerId !== 'speaker_03') {
      throw new Error(`Explicit speaker_03 on Professor Vance turn ${i} was not preserved: got ${regMeta.dialogue[i].speakerId}`);
    }
  }

  // Verify idempotency of subSplitLongMonologueTurns on already-chunked turns
  const reChunked = audioManager.subSplitLongMonologueTurns(regMeta.dialogue);
  if (reChunked.length !== regMeta.dialogue.length) {
    throw new Error(`subSplitLongMonologueTurns is not idempotent: ${regMeta.dialogue.length} -> ${reChunked.length}`);
  }
  reChunked.forEach((line, idx) => {
    if (line.text !== regMeta.dialogue[idx].text || line.speakerId !== regMeta.dialogue[idx].speakerId) {
      throw new Error(`Idempotency mismatch at chunk ${idx}`);
    }
  });
  console.log(`  ✓ Test 7 Passed: registerQuestionAudio sub-chunked 633-word q.dialogue into ${regMeta.dialogue.length} chunks; subSplitLongMonologueTurns is idempotent`);

  // Test 8 (Phase 5.5H Cases 9 & 10): Professor Vance -> speaker_03, Sprint Examiner (Arthur) -> speaker_04
  console.log('[Test 8]: Professor Vance -> speaker_03 (Dr. Alistair Sterling) & Examiner -> speaker_04...');
  if (turns2[0].speakerId !== 'speaker_04') {
    throw new Error(`Expected opening examiner to be speaker_04, got ${turns2[0].speakerId}`);
  }
  if (professorTurns[0].speakerId !== 'speaker_03') {
    throw new Error(`Expected Professor Vance to resolve to speaker_03 (Dr. Alistair Sterling), got ${professorTurns[0].speakerId}`);
  }
  if (turns2[turns2.length - 1].speakerId !== 'speaker_04') {
    throw new Error(`Expected closing examiner to be speaker_04, got ${turns2[turns2.length - 1].speakerId}`);
  }
  console.log('  ✓ Test 8 Passed: Professor Vance resolves to speaker_03 and Examiner resolves to speaker_04');

  // Test 9 (Phase 5.5H Cases 12, 13, 14): Initial duration >320s in audioService, default rate 1.0, and explicit rate forwarding
  console.log('[Test 9]: audioService initial duration >320s, default rate 1.0, and rate forwarding...');
  if (audioService.getState().playbackRate !== 1.0) {
    throw new Error(`Expected default playbackRate 1.0, got ${audioService.getState().playbackRate}`);
  }

  const forwardedRates: number[] = [];
  let initialObservedDuration = 0;
  (audioService as any).playSingleLineOnSharedAudio = async (
    _t: any,
    _s: any,
    _g: any,
    _m: any,
    _onTick: any,
    meta: any
  ) => {
    if (initialObservedDuration === 0) {
      initialObservedDuration = audioService.getState().duration;
    }
    forwardedRates.push(meta?.rate);
    meta?.onLineCompleted?.(2);
    return Promise.resolve();
  };

  await audioService.playDialogueSequentially(turns2, {
    rate: 1.15
  });

  (audioService as any).playSingleLineOnSharedAudio = originalPlaySingle;

  if (initialObservedDuration <= 320) {
    throw new Error(`Expected audioService initial estimated duration for Sprint Practice Set 18 Part 4 > 320s, got ${initialObservedDuration}s`);
  }
  if (forwardedRates.length !== turns2.length || forwardedRates.some((r) => r !== 1.15)) {
    throw new Error(`Expected rate 1.15 forwarded to all ${turns2.length} chunks, got ${JSON.stringify(forwardedRates)}`);
  }
  console.log(`  ✓ Test 9 Passed: audioService initial duration = ${initialObservedDuration.toFixed(1)}s (>320s) and rate=1.15 forwarded cleanly`);

  console.log('\n=== ALL PHASE 5.5G & 5.5H MONOLOGUE CHUNKING, VOICE & DURATION TESTS PASSED! ===');
}

runSuite().catch((err) => {
  console.error('\n❌ PHASE 5.5G/5.5H SUITE FAILED:', err);
  process.exit(1);
});

