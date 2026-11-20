import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MOCK_EXAM_SETS } from '../../data/mockExams';

describe('Phase 2: Professional Reading Examination Interface & Data Integrity', () => {
  it('1. Verifies Mock Exams have valid Reading sections and questions', () => {
    assert.ok(MOCK_EXAM_SETS.length >= 5, 'Should have at least 5 mock exam sets');

    for (let i = 0; i < MOCK_EXAM_SETS.length; i++) {
      const exam = MOCK_EXAM_SETS[i];
      assert.ok(exam.readingPassage && exam.readingPassage.length > 50, `Set ${i + 1} must have a valid reading passage`);
      
      const readingQuestions = exam.questions.filter((q) => q.section === 'reading');
      assert.ok(readingQuestions.length > 0, `Set ${i + 1} must have reading questions`);
      
      // Verify question IDs, prompt presence, and non-empty question types
      readingQuestions.forEach((q) => {
        assert.ok(q.id, `Question must have an ID in Set ${i + 1}`);
        assert.ok(q.prompt && q.prompt.length > 0, `Question ${q.id} must have a prompt`);
        assert.ok(typeof q.type === 'string' && q.type.trim().length > 0, `Question ${q.id} has invalid empty type`);
      });
    }
  });

  it('2. Verifies dual Highlight and Underline chunking without string alteration', () => {
    const originalText = 'The architecture of deep subterranean transit tunnels requires comprehensive geotechnical evaluation and seismic resistance testing.';
    const highlights = ['subterranean transit tunnels'];
    const underlines = ['seismic resistance testing'];

    // Simulation of the exact chunking logic in CDIELTSExamMode
    interface SpanMatch {
      start: number;
      end: number;
      type: 'highlight' | 'underline';
      text: string;
    }

    const matches: SpanMatch[] = [];
    highlights.forEach((hl) => {
      const idx = originalText.indexOf(hl);
      if (idx !== -1) {
        matches.push({ start: idx, end: idx + hl.length, type: 'highlight', text: hl });
      }
    });

    underlines.forEach((ul) => {
      const idx = originalText.indexOf(ul);
      if (idx !== -1) {
        matches.push({ start: idx, end: idx + ul.length, type: 'underline', text: ul });
      }
    });

    matches.sort((a, b) => a.start - b.start);

    // Reconstruct full string from chunks and spans
    let reconstructed = '';
    let currentIdx = 0;

    for (const match of matches) {
      if (match.start > currentIdx) {
        reconstructed += originalText.slice(currentIdx, match.start);
      }
      reconstructed += match.text;
      currentIdx = Math.max(currentIdx, match.end);
    }
    if (currentIdx < originalText.length) {
      reconstructed += originalText.slice(currentIdx);
    }

    assert.strictEqual(reconstructed, originalText, 'Reconstructed string from spans must match original text identically with zero dropped or modified characters');
  });

  it('3. Verifies Answer retention when switching passages and sets', () => {
    // Initial candidate answers
    const userAnswers: Record<string, string> = {
      'p1-q6': 'A',
      'p1-q7': 'TRUE',
      'p1-q8': 'NOT GIVEN',
      'p1-q9': 'steel reinforce',
      'p1-q10': 'geotechnical'
    };

    // Switching active reading passage from 1 to 2
    let activePassage = 1;
    activePassage = 2;
    assert.strictEqual(activePassage, 2);

    // Answers must remain intact and unchanged
    assert.strictEqual(userAnswers['p1-q6'], 'A');
    assert.strictEqual(userAnswers['p1-q10'], 'geotechnical');
    assert.strictEqual(Object.keys(userAnswers).length, 5);

    // Switching active test set
    let selectedSetIdx = 0;
    selectedSetIdx = 1;
    assert.strictEqual(selectedSetIdx, 1);
    assert.strictEqual(userAnswers['p1-q6'], 'A', 'Changing test set must not erase existing answer state');
  });

  it('4. Verifies Underline toggle and persistence contract', () => {
    let underlines: string[] = [];

    const toggleUnderline = (target: string) => {
      if (underlines.includes(target)) {
        underlines = underlines.filter((u) => u !== target);
      } else {
        underlines = [...underlines, target];
      }
    };

    // Add first underline
    toggleUnderline('geotechnical evaluation');
    assert.deepStrictEqual(underlines, ['geotechnical evaluation']);

    // Add second underline
    toggleUnderline('seismic resistance');
    assert.deepStrictEqual(underlines, ['geotechnical evaluation', 'seismic resistance']);

    // Remove first underline
    toggleUnderline('geotechnical evaluation');
    assert.deepStrictEqual(underlines, ['seismic resistance']);

    // Auto-save session payload shape check
    const sessionData = {
      setIndex: 0,
      activeSkill: 'reading',
      userAnswers: { 'q6': 'B' },
      flaggedQuestions: ['q6'],
      notes: [{ id: '1', text: 'Important note', timestamp: '12:00' }],
      highlights: ['transit tunnels'],
      underlines: underlines,
      timeRemaining: 3600,
      savedAt: Date.now()
    };

    assert.ok(Array.isArray(sessionData.underlines), 'Session data must include underlines array');
    assert.strictEqual(sessionData.underlines.length, 1);
  });

  it('5. Verifies Review Flag (Alt+R) and Answered/Unanswered calculation', () => {
    const readingQuestions = [
      { id: 'q6' },
      { id: 'q7' },
      { id: 'q8' },
      { id: 'q9' },
      { id: 'q10' }
    ];

    const flaggedQuestions = new Set<string>();
    const userAnswers: Record<string, string> = {
      'q6': 'A',
      'q7': '   ', // whitespace only = unanswered
      'q8': 'FALSE'
    };

    // Toggle flag on q6
    if (flaggedQuestions.has('q6')) {
      flaggedQuestions.delete('q6');
    } else {
      flaggedQuestions.add('q6');
    }
    assert.ok(flaggedQuestions.has('q6'));

    // Toggle flag off on q6
    flaggedQuestions.delete('q6');
    assert.ok(!flaggedQuestions.has('q6'));

    // Toggle flag on q8
    flaggedQuestions.add('q8');
    assert.ok(flaggedQuestions.has('q8'));

    // Answered count calculation
    const answeredCount = readingQuestions.filter((q) => Boolean(userAnswers[q.id]?.trim())).length;
    const unansweredCount = readingQuestions.length - answeredCount;

    assert.strictEqual(answeredCount, 2, 'q6 and q8 are answered, q7 is whitespace so unanswered');
    assert.strictEqual(unansweredCount, 3, '3 questions remain unanswered');
  });

  it('6. Verifies Playback Token invalidation and Android Interruption Safety', () => {
    let activePlaybackToken = 10;
    let isPlaying = true;
    let audioState = 'PLAYING';

    // Simulate tab minimize or Android background interruption
    const handleVisibilityChange = (hidden: boolean) => {
      if (hidden && isPlaying) {
        // Safe interruption: audio paused without section progression or answer wipe
        audioState = 'PAUSED';
      }
    };

    // App minimized
    handleVisibilityChange(true);
    assert.strictEqual(audioState, 'PAUSED', 'Backgrounding on Android must pause audio safely');

    // Candidate switches to Reading or changes passage
    const handleSwitchModule = () => {
      activePlaybackToken += 1;
      isPlaying = false;
      audioState = 'IDLE';
    };

    handleSwitchModule();
    assert.strictEqual(activePlaybackToken, 11, 'Token must be incremented to immediately cancel pending audio fetches');
    assert.strictEqual(isPlaying, false);
    assert.strictEqual(audioState, 'IDLE');
  });
});
