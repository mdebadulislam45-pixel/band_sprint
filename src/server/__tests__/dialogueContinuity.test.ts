/**
 * BandSprint — STAGE D1 Focused Regression Test Suite:
 * Dialogue Continuity & Failure Recovery
 *
 * Verifies that a transient TTS failure on one dialogue turn does not
 * prematurely terminate an entire Listening examination.
 *
 * Requirements Covered:
 * 1. First dialogue turn succeeds.
 * 2. Middle dialogue turn fails once and succeeds on retry.
 * 3. Middle dialogue turn fails twice and is skipped safely.
 * 4. Remaining turns continue after a recoverable failure.
 * 5. A completed turn is never replayed.
 * 6. No duplicate turn is generated.
 * 7. Stop during retry cancels the retry.
 * 8. Restart invalidates callbacks from the previous generation.
 * 9. Component unmount does not restart playback.
 * 10. All-successful dialogue remains unchanged.
 */

import assert from 'node:assert/strict';
import { audioService, DialogueLine } from '../../services/audioService';
import { audioManager } from '../../services/AudioManager';

function createMockAudioElement(options: {
  durationSec?: number;
  autoCompleteAfterMs?: number;
  playImpl?: (audio: any) => Promise<void>;
} = {}) {
  const durationSec = options.durationSec ?? 2.0;
  const listeners: Record<string, Function[]> = {};

  const mock: any = {
    src: '',
    currentTime: 0,
    duration: durationSec,
    paused: true,
    ended: false,
    playbackRate: 1.0,
    defaultPlaybackRate: 1.0,
    volume: 1.0,
    muted: false,
    playCalls: 0,
    pauseCalls: 0,
    addEventListener(event: string, fn: Function) {
      listeners[event] = listeners[event] || [];
      listeners[event].push(fn);
    },
    removeEventListener(event: string, fn: Function) {
      if (!listeners[event]) return;
      listeners[event] = listeners[event].filter((f) => f !== fn);
    },
    _trigger(event: string, payload?: any) {
      if (typeof this['on' + event] === 'function') {
        this['on' + event](payload);
      }
      if (listeners[event]) {
        for (const fn of listeners[event]) {
          fn(payload);
        }
      }
    },
    load() {},
    pause() {
      this.paused = true;
      this.pauseCalls += 1;
      this._trigger('pause');
    },
    play() {
      this.playCalls += 1;
      this.paused = false;
      this.ended = false;

      if (options.playImpl) {
        return options.playImpl(this);
      }

      this._trigger('loadedmetadata');
      this._trigger('play');
      this.currentTime = 0.5;
      this._trigger('timeupdate');

      if (options.autoCompleteAfterMs !== undefined && options.autoCompleteAfterMs >= 0) {
        setTimeout(() => {
          if (!this.paused) {
            this.currentTime = this.duration;
            this.ended = true;
            this._trigger('timeupdate');
            this._trigger('ended');
          }
        }, options.autoCompleteAfterMs);
      }

      return Promise.resolve();
    }
  };

  return mock;
}

async function runContinuitySuite() {
  console.log('=== RUNNING STAGE D1 DIALOGUE CONTINUITY REGRESSION SUITE ===\n');

  // Test 1: All-successful dialogue remains unchanged
  {
    console.log('Test 1: All-successful dialogue remains unchanged');
    const mock = createMockAudioElement({ durationSec: 1.5, autoCompleteAfterMs: 15 });
    audioService.setAudioElementForTesting(mock as unknown as HTMLAudioElement);

    const testLines: DialogueLine[] = [
      { speakerId: 'speaker_04', gender: 'male', text: 'Turn zero announcement.', pauseAfterMs: 10 },
      { speakerId: 'speaker_05', gender: 'female', text: 'Turn one discussion.', pauseAfterMs: 10 },
      { speakerId: 'speaker_01', gender: 'male', text: 'Turn two conclusion.', pauseAfterMs: 0 }
    ];

    const startedIndices: number[] = [];
    let completed = false;
    let errorCaught: any = null;

    await audioService.playDialogueSequentially(testLines, {
      examId: 'test_d1_all_successful',
      onLineStart: (idx) => startedIndices.push(idx),
      onComplete: () => { completed = true; },
      onError: (err) => { errorCaught = err; }
    });

    assert.equal(completed, true, 'All-successful dialogue must call onComplete');
    assert.equal(errorCaught, null, 'No error must be reported for all-successful dialogue');
    assert.deepEqual(startedIndices, [0, 1, 2], 'All 3 turns must start in exact order');
    assert.equal(audioService.getSkippedDialogueTurns().length, 0, 'Zero turns must be skipped');
    assert.equal(audioService.getState().isPlaying, false, 'Engine must be stopped on complete');
    assert.equal(audioService.getState().error, null, 'State error must be null');
    console.log('  -> PASS: All 3 turns completed without skips or errors.\n');
  }

  // Test 2: First dialogue turn succeeds
  {
    console.log('Test 2: First dialogue turn succeeds');
    const mock = createMockAudioElement({ durationSec: 1.0, autoCompleteAfterMs: 10 });
    audioService.setAudioElementForTesting(mock as unknown as HTMLAudioElement);

    const testLines: DialogueLine[] = [
      { speakerId: 'speaker_04', gender: 'male', text: 'Opening examiner introduction.', pauseAfterMs: 10 },
      { speakerId: 'speaker_05', gender: 'female', text: 'Follow-up candidate response.', pauseAfterMs: 0 }
    ];

    const events: string[] = [];
    await audioService.playDialogueSequentially(testLines, {
      examId: 'test_d1_first_turn',
      onStart: () => events.push('dialogue_start'),
      onLineStart: (idx) => events.push(`turn_${idx}_start`),
      onComplete: () => events.push('dialogue_complete')
    });

    assert.equal(events[0], 'turn_0_start', 'First turn must start before other turns');
    assert.ok(events.includes('dialogue_start'), 'dialogue_start must fire on first play');
    assert.ok(events.includes('turn_1_start'), 'Second turn must start after first');
    console.log('  -> PASS: First dialogue turn executed and sequenced cleanly.\n');
  }

  // Test 3: Middle dialogue turn fails once and succeeds on retry
  {
    console.log('Test 3: Middle dialogue turn fails once and succeeds on retry');
    let line1Attempts = 0;
    let retryAttemptReported = 0;

    const mock = createMockAudioElement({
      durationSec: 1.0,
      playImpl: (audio) => {
        if (audioService.getCurrentPlaylistIndex() === 1) {
          line1Attempts += 1;
          if (line1Attempts === 1) {
            // Transient 429 rate limit or network glitch on attempt 1
            audio.paused = true;
            return Promise.reject(new Error('Transient EdgeTTS 429 Rate Limit drop'));
          }
        }
        audio._trigger('loadedmetadata');
        audio._trigger('play');
        audio.currentTime = 0.5;
        audio._trigger('timeupdate');
        setTimeout(() => {
          if (!audio.paused) {
            audio.currentTime = audio.duration;
            audio.ended = true;
            audio._trigger('timeupdate');
            audio._trigger('ended');
          }
        }, 15);
        return Promise.resolve();
      }
    });
    audioService.setAudioElementForTesting(mock as unknown as HTMLAudioElement);

    const testLines: DialogueLine[] = [
      { speakerId: 'speaker_04', gender: 'male', text: 'Turn 0 completes.', pauseAfterMs: 10 },
      { speakerId: 'speaker_05', gender: 'female', text: 'Turn 1 fails on attempt 1 then succeeds.', pauseAfterMs: 10 },
      { speakerId: 'speaker_01', gender: 'male', text: 'Turn 2 concludes.', pauseAfterMs: 0 }
    ];

    const startedIndices: number[] = [];
    let completed = false;

    await audioService.playDialogueSequentially(testLines, {
      examId: 'test_d1_retry_success',
      onLineStart: (idx) => startedIndices.push(idx),
      onLineRetry: (idx, _line, attempt) => {
        if (idx === 1) retryAttemptReported = attempt;
      },
      onComplete: () => { completed = true; }
    });

    assert.equal(completed, true, 'Dialogue must complete after successful retry');
    assert.equal(line1Attempts, 2, 'Line 1 must be attempted exactly twice (fail attempt 1, succeed attempt 2)');
    assert.equal(retryAttemptReported, 2, 'onLineRetry callback must report attempt 2');
    assert.deepEqual(startedIndices, [0, 1, 2], 'Started indices must remain strictly [0, 1, 2] without duplicate onLineStart');
    assert.equal(audioService.getSkippedDialogueTurns().length, 0, 'No turn must be marked as skipped when retry succeeded');
    console.log('  -> PASS: Turn 1 failed on attempt 1, retried, recovered, and full dialogue completed.\n');
  }

  // Test 4: Middle dialogue turn fails twice and is skipped safely
  {
    console.log('Test 4: Middle dialogue turn fails twice and is skipped safely');
    let line1Attempts = 0;
    let skippedLineIndex = -1;
    let skippedError: any = null;

    const mock = createMockAudioElement({
      durationSec: 1.0,
      playImpl: (audio) => {
        if (audioService.getCurrentPlaylistIndex() === 1) {
          line1Attempts += 1;
          // Fails both attempt 1 and retry attempt 2
          audio.paused = true;
          return Promise.reject(new Error('Persistent socket timeout on line 1'));
        }
        audio._trigger('loadedmetadata');
        audio._trigger('play');
        audio.currentTime = 0.5;
        audio._trigger('timeupdate');
        setTimeout(() => {
          if (!audio.paused) {
            audio.currentTime = audio.duration;
            audio.ended = true;
            audio._trigger('timeupdate');
            audio._trigger('ended');
          }
        }, 15);
        return Promise.resolve();
      }
    });
    audioService.setAudioElementForTesting(mock as unknown as HTMLAudioElement);

    const testLines: DialogueLine[] = [
      { speakerId: 'speaker_04', gender: 'male', text: 'Turn 0 completes.', pauseAfterMs: 10 },
      { speakerId: 'speaker_05', gender: 'female', text: 'Turn 1 unrecoverable glitch.', pauseAfterMs: 10 },
      { speakerId: 'speaker_01', gender: 'male', text: 'Turn 2 completes.', pauseAfterMs: 0 }
    ];

    const startedIndices: number[] = [];
    let completed = false;
    let errorCaught: any = null;

    await audioService.playDialogueSequentially(testLines, {
      examId: 'test_d1_skip_recovery',
      requireAllLinesComplete: false,
      onLineStart: (idx) => startedIndices.push(idx),
      onLineSkipped: (idx, _line, err) => {
        skippedLineIndex = idx;
        skippedError = err;
      },
      onComplete: () => { completed = true; },
      onError: (err) => { errorCaught = err; }
    });

    assert.equal(completed, true, 'Dialogue must complete despite Turn 1 skip');
    assert.equal(errorCaught, null, 'Recoverable single-turn failure must not trigger fatal onError for the whole exam');
    assert.equal(line1Attempts, 2, 'Line 1 must be attempted at most twice (attempt 1 + 1 retry)');
    assert.equal(skippedLineIndex, 1, 'Turn 1 must be reported as skipped via onLineSkipped');
    assert.ok(skippedError, 'onLineSkipped must provide the error details');
    const skippedList = audioService.getSkippedDialogueTurns();
    assert.equal(skippedList.length, 1, 'Exactly 1 turn must be in skipped dialogue list');
    assert.equal(skippedList[0].lineIndex, 1, 'Skipped turn index must be 1');
    assert.deepEqual(startedIndices, [0, 1, 2], 'All 3 turns must be visited, and Turn 2 must play after Turn 1 skip');
    console.log('  -> PASS: Turn 1 failed twice, was safely skipped, and Turn 2 played to completion.\n');
  }

  // Test 5: Remaining turns continue after a recoverable failure
  {
    console.log('Test 5: Remaining turns continue after a recoverable failure');
    let line1Attempts = 0;

    const mock = createMockAudioElement({
      durationSec: 1.0,
      playImpl: (audio) => {
        if (audioService.getCurrentPlaylistIndex() === 1) {
          line1Attempts += 1;
          audio.paused = true;
          return Promise.reject(new Error('Turn 1 audio decode error'));
        }
        audio._trigger('loadedmetadata');
        audio._trigger('play');
        setTimeout(() => {
          if (!audio.paused) {
            audio.ended = true;
            audio._trigger('ended');
          }
        }, 15);
        return Promise.resolve();
      }
    });
    audioService.setAudioElementForTesting(mock as unknown as HTMLAudioElement);

    const testLines: DialogueLine[] = [
      { speakerId: 'speaker_04', gender: 'male', text: 'Intro turn.', pauseAfterMs: 10 },
      { speakerId: 'speaker_05', gender: 'female', text: 'Skipped turn.', pauseAfterMs: 10 },
      { speakerId: 'speaker_01', gender: 'male', text: 'Subsequent turn A.', pauseAfterMs: 10 },
      { speakerId: 'speaker_02', gender: 'female', text: 'Subsequent turn B.', pauseAfterMs: 0 }
    ];

    const startedIndices: number[] = [];
    let completed = false;

    await audioService.playDialogueSequentially(testLines, {
      examId: 'test_d1_multi_continuation',
      requireAllLinesComplete: false,
      onLineStart: (idx) => startedIndices.push(idx),
      onComplete: () => { completed = true; }
    });

    assert.equal(completed, true, 'Must complete after skipping Turn 1');
    assert.deepEqual(startedIndices, [0, 1, 2, 3], 'All subsequent turns [2, 3] must execute after Turn 1 skip');
    console.log('  -> PASS: Turns 2 and 3 executed cleanly after Turn 1 was skipped.\n');
  }

  // Test 6: A completed turn is never replayed & No duplicate turn is generated
  {
    console.log('Test 6: A completed turn is never replayed & no duplicate turn is generated');
    const playCallsPerLine: Record<number, number> = { 0: 0, 1: 0, 2: 0 };

    const mock = createMockAudioElement({
      durationSec: 1.0,
      playImpl: (audio) => {
        const idx = audioService.getCurrentPlaylistIndex();
        playCallsPerLine[idx] = (playCallsPerLine[idx] || 0) + 1;
        audio._trigger('loadedmetadata');
        audio._trigger('play');
        setTimeout(() => {
          if (!audio.paused) {
            audio.ended = true;
            audio._trigger('ended');
          }
        }, 15);
        return Promise.resolve();
      }
    });
    audioService.setAudioElementForTesting(mock as unknown as HTMLAudioElement);

    const testLines: DialogueLine[] = [
      { speakerId: 'speaker_04', gender: 'male', text: 'Turn 0', pauseAfterMs: 10 },
      { speakerId: 'speaker_05', gender: 'female', text: 'Turn 1', pauseAfterMs: 10 },
      { speakerId: 'speaker_01', gender: 'male', text: 'Turn 2', pauseAfterMs: 0 }
    ];

    await audioService.playDialogueSequentially(testLines, { examId: 'test_d1_no_replay' });

    assert.equal(playCallsPerLine[0], 1, 'Turn 0 must be played exactly once');
    assert.equal(playCallsPerLine[1], 1, 'Turn 1 must be played exactly once');
    assert.equal(playCallsPerLine[2], 1, 'Turn 2 must be played exactly once');

    // Calling resume() after completion must be a strict no-op
    audioService.resume();
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(playCallsPerLine[0], 1, 'Turn 0 must never be replayed on post-complete resume()');
    assert.equal(playCallsPerLine[1], 1, 'Turn 1 must never be replayed on post-complete resume()');
    assert.equal(playCallsPerLine[2], 1, 'Turn 2 must never be replayed on post-complete resume()');
    console.log('  -> PASS: Turns played exactly once; completed turns never replayed.\n');
  }

  // Test 7: Stop during retry cancels the retry
  {
    console.log('Test 7: Stop during retry cancels the retry');
    let retryWasTriggered = false;
    let playCallCount = 0;

    const mock = createMockAudioElement({
      durationSec: 2.0,
      playImpl: (audio) => {
        playCallCount += 1;
        if (playCallCount === 1) {
          audio.paused = true;
          return Promise.reject(new Error('Initial line failure'));
        }
        retryWasTriggered = true;
        return Promise.resolve();
      }
    });
    audioService.setAudioElementForTesting(mock as unknown as HTMLAudioElement);

    const testLines: DialogueLine[] = [
      { speakerId: 'speaker_04', gender: 'male', text: 'Turn 0', pauseAfterMs: 10 }
    ];

    let completed = false;
    const playPromise = audioService.playDialogueSequentially(testLines, {
      examId: 'test_d1_stop_retry',
      onComplete: () => { completed = true; }
    });

    // Wait 50ms into the 200ms retry cooldown window and call stop()
    await new Promise((r) => setTimeout(r, 60));
    audioService.stop();

    await playPromise;

    assert.equal(completed, false, 'Stopped playback must never fire onComplete');
    assert.equal(retryWasTriggered, false, 'Retry must not execute after audioService.stop() was called');
    assert.equal(audioService.getState().isPlaying, false, 'Engine must be stopped');
    console.log('  -> PASS: Stop during retry cooldown cancelled playback cleanly.\n');
  }

  // Test 8: Restart invalidates callbacks from the previous generation
  {
    console.log('Test 8: Restart invalidates callbacks from the previous generation');
    const mock = createMockAudioElement({ durationSec: 1.0, autoCompleteAfterMs: 30 });
    audioService.setAudioElementForTesting(mock as unknown as HTMLAudioElement);

    const testLinesA: DialogueLine[] = [
      { speakerId: 'speaker_04', gender: 'male', text: 'Gen 1 turn A', pauseAfterMs: 20 },
      { speakerId: 'speaker_05', gender: 'female', text: 'Gen 1 turn B', pauseAfterMs: 0 }
    ];

    const testLinesB: DialogueLine[] = [
      { speakerId: 'speaker_01', gender: 'male', text: 'Gen 2 turn X', pauseAfterMs: 0 }
    ];

    let gen1Completed = false;
    let gen2Completed = false;

    // Start Generation 1
    const p1 = audioService.playDialogueSequentially(testLinesA, {
      examId: 'test_d1_gen1',
      onComplete: () => { gen1Completed = true; }
    });

    // Immediately start Generation 2 after 10ms
    await new Promise((r) => setTimeout(r, 10));
    const p2 = audioService.playDialogueSequentially(testLinesB, {
      examId: 'test_d1_gen2',
      onComplete: () => { gen2Completed = true; }
    });

    await Promise.all([p1, p2]);

    assert.equal(gen1Completed, false, 'Generation 1 onComplete must NOT fire after restart');
    assert.equal(gen2Completed, true, 'Generation 2 onComplete must fire');
    console.log('  -> PASS: Stale callbacks from previous generation discarded.\n');
  }

  // Test 9: Component unmount does not restart playback
  {
    console.log('Test 9: Component unmount does not restart playback');
    const mock = createMockAudioElement({ durationSec: 1.0, autoCompleteAfterMs: 50 });
    audioService.setAudioElementForTesting(mock as unknown as HTMLAudioElement);

    const testLines: DialogueLine[] = [
      { speakerId: 'speaker_04', gender: 'male', text: 'Turn 0', pauseAfterMs: 20 },
      { speakerId: 'speaker_05', gender: 'female', text: 'Turn 1', pauseAfterMs: 0 }
    ];

    let unmountCompleted = false;
    const playPromise = audioService.playDialogueSequentially(testLines, {
      examId: 'test_d1_unmount',
      onComplete: () => { unmountCompleted = true; }
    });

    // Simulate component unmount via audioManager.killAllAudio()
    await new Promise((r) => setTimeout(r, 15));
    audioManager.killAllAudio();

    await playPromise;

    assert.equal(unmountCompleted, false, 'Unmounted playback must never fire onComplete');
    assert.equal(audioService.getState().isPlaying, false, 'State must remain not playing');
    console.log('  -> PASS: Component unmount cleanly halts audio without reactivation.\n');
  }

  // Cleanup testing mock
  audioService.setAudioElementForTesting(null);
  console.log('=== ALL 10 STAGE D1 DIALOGUE CONTINUITY REGRESSION TESTS PASSED! ===');
}

runContinuitySuite().catch((err) => {
  console.error('STAGE D1 REGRESSION TEST FAILURE:', err);
  process.exit(1);
});
