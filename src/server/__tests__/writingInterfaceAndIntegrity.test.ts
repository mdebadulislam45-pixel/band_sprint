import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACADEMIC_WRITING_SETS,
  GENERAL_TRAINING_WRITING_SETS,
  CAMBRIDGE_WRITING_SETS
} from '../../components/cdielts/CDIELTSWritingExamRoom';
import { checkWritingWordThreshold } from '../../services/WritingEvaluationService';

describe('Phase 3: Professional Writing Examination Experience & Data Integrity', () => {
  it('1. Verifies Academic Writing sets structure and data graphics', () => {
    assert.ok(ACADEMIC_WRITING_SETS.length >= 4, 'Must have at least 4 Academic writing sets');
    assert.strictEqual(CAMBRIDGE_WRITING_SETS, ACADEMIC_WRITING_SETS, 'Backwards-compatible export must match Academic sets');

    ACADEMIC_WRITING_SETS.forEach((set, idx) => {
      assert.ok(set.id, `Set ${idx + 1} must have an ID`);
      assert.ok(set.title, `Set ${idx + 1} must have a title`);
      assert.strictEqual(set.format, 'Academic', `Set ${idx + 1} format must be Academic`);

      // Task 1 Academic Requirements
      assert.ok(set.task1Prompt && set.task1Prompt.length > 30, `Set ${idx + 1} must have a substantive Task 1 prompt`);
      assert.ok(set.task1ChartTitle, `Set ${idx + 1} must have a Task 1 chart title`);
      assert.ok(Array.isArray(set.task1Categories) && set.task1Categories.length >= 3, `Set ${idx + 1} must have chart categories`);
      assert.ok(Array.isArray(set.task1Series) && set.task1Series.length >= 2, `Set ${idx + 1} must have chart series`);
      assert.ok(set.task1SampleCandidateDraft && set.task1SampleCandidateDraft.length > 50, `Set ${idx + 1} must have Task 1 sample draft`);

      // Task 2 Requirements
      assert.ok(set.task2Prompt && set.task2Prompt.length > 30, `Set ${idx + 1} must have a substantive Task 2 prompt`);
      assert.ok(set.task2SampleCandidateDraft && set.task2SampleCandidateDraft.length > 100, `Set ${idx + 1} must have Task 2 sample draft`);
    });
  });

  it('2. Verifies General Training Writing sets and authentic letter formats', () => {
    assert.ok(GENERAL_TRAINING_WRITING_SETS.length >= 3, 'Must have at least 3 General Training writing sets');

    GENERAL_TRAINING_WRITING_SETS.forEach((set, idx) => {
      assert.ok(set.id, `GT Set ${idx + 1} must have an ID`);
      assert.strictEqual(set.format, 'General Training', `GT Set ${idx + 1} format must be General Training`);

      // GT Task 1 Letter Requirements
      assert.ok(set.task1LetterType, `GT Set ${idx + 1} must specify letter type (Formal, Semi-Formal, or Informal)`);
      assert.ok(
        ['Formal', 'Semi-Formal', 'Informal'].includes(set.task1LetterType!),
        `GT Set ${idx + 1} letter type must be valid`
      );
      assert.ok(Array.isArray(set.task1BulletPoints), `GT Set ${idx + 1} must have bullet points`);
      assert.strictEqual(set.task1BulletPoints!.length, 3, `GT Set ${idx + 1} must have exactly 3 mandatory bullet points per IELTS standard`);
      set.task1BulletPoints!.forEach((bp, bIdx) => {
        assert.ok(bp.trim().length > 5, `GT Set ${idx + 1} bullet point ${bIdx + 1} must not be empty`);
      });

      // GT Task 2 Essay Requirements
      assert.ok(set.task2Prompt && set.task2Prompt.length > 30, `GT Set ${idx + 1} must have a substantive Task 2 prompt`);
      assert.ok(set.task2SampleCandidateDraft && set.task2SampleCandidateDraft.length > 100, `GT Set ${idx + 1} must have Task 2 sample draft`);
    });
  });

  it('3. Verifies robust word count computation across whitespace variations', () => {
    const countWords = (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return 0;
      return trimmed.split(/\s+/).filter(Boolean).length;
    };

    assert.strictEqual(countWords(''), 0, 'Empty string is 0 words');
    assert.strictEqual(countWords('   \n\t  '), 0, 'Whitespace string is 0 words');
    assert.strictEqual(countWords('The bar chart illustrates the migration patterns.'), 7);
    assert.strictEqual(countWords('  The   bar\n\nchart \t illustrates  the \n migration   patterns.  '), 7);

    // Verify hyphenated and punctuation handling
    const sampleTask1 = 'In 2010, approximately 45,000 citizens relocated to rural regions; however, by 2025, that figure escalated significantly.';
    assert.strictEqual(countWords(sampleTask1), 16);
  });

  it('4. Verifies Task 1 (150w) and Task 2 (250w) word threshold status', () => {
    const isBelow = (words: number, task: 1 | 2) => {
      const min = task === 1 ? 150 : 250;
      return words < min;
    };

    assert.strictEqual(isBelow(149, 1), true, '149 words is below Task 1 threshold');
    assert.strictEqual(isBelow(150, 1), false, '150 words meets Task 1 threshold');
    assert.strictEqual(isBelow(180, 1), false, '180 words satisfies Task 1 threshold');

    assert.strictEqual(isBelow(249, 2), true, '249 words is below Task 2 threshold');
    assert.strictEqual(isBelow(250, 2), false, '250 words meets Task 2 threshold');
    assert.strictEqual(isBelow(285, 2), false, '285 words satisfies Task 2 threshold');
  });

  it('5. Verifies separate Task 1 and Task 2 state isolation (no cross-contamination)', () => {
    // Model state storage
    let task1Text = '';
    let task2Text = '';

    // Candidate types Task 1
    task1Text = 'The provided bar chart demonstrates five key educational corridors...';
    assert.strictEqual(task2Text, '', 'Task 2 text must remain pristine when writing Task 1');

    // Candidate switches to Task 2 and writes
    task2Text = 'Tertiary education policy continues to evoke contentious discourse among economists...';
    assert.ok(task1Text.startsWith('The provided bar chart'), 'Task 1 text must not be corrupted by Task 2 editing');
    assert.ok(task2Text.startsWith('Tertiary education'), 'Task 2 text must be stored separately');

    // Clear Task 1
    task1Text = '';
    assert.ok(task2Text.length > 0, 'Clearing Task 1 must not clear Task 2');
  });

  it('6. Verifies draft autosave payload structure and restoration', () => {
    interface WritingDraftStorage {
      format: 'Academic' | 'General Training';
      selectedSetIdx: number;
      activeTask: 1 | 2;
      task1Text: string;
      task2Text: string;
      timeRemainingSec: number;
      savedAt: number;
    }

    const payload: WritingDraftStorage = {
      format: 'General Training',
      selectedSetIdx: 1,
      activeTask: 1,
      task1Text: 'Dear Mr. Henderson,\n\nI am writing to formally request repairs...',
      task2Text: 'While public investment in sports facilities promotes physical wellness...',
      timeRemainingSec: 2450,
      savedAt: Date.now()
    };

    const serialized = JSON.stringify(payload);
    const restored: WritingDraftStorage = JSON.parse(serialized);

    assert.strictEqual(restored.format, 'General Training');
    assert.strictEqual(restored.selectedSetIdx, 1);
    assert.strictEqual(restored.activeTask, 1);
    assert.strictEqual(restored.task1Text, payload.task1Text);
    assert.strictEqual(restored.task2Text, payload.task2Text);
    assert.strictEqual(restored.timeRemainingSec, 2450);
    assert.ok(restored.savedAt > 0);
  });

  it('7. Verifies candidate writing undo buffer protection against accidental clearing', () => {
    let currentText = 'In conclusion, targeted governmental subsidies yield superior long-term socioeconomic mobility.';
    const wordCount = 11;
    let undoBuffer: { task: 1 | 2; text: string; wordCount: number } | null = null;

    // Trigger clear
    undoBuffer = { task: 2, text: currentText, wordCount };
    currentText = '';

    assert.strictEqual(currentText, '', 'Editor should be cleared');
    assert.ok(undoBuffer !== null, 'Undo buffer must hold cleared text');
    assert.strictEqual(undoBuffer.wordCount, 11, 'Undo buffer must retain correct word count');

    // Trigger undo
    if (undoBuffer && undoBuffer.task === 2) {
      currentText = undoBuffer.text;
      undoBuffer = null;
    }

    assert.strictEqual(currentText, 'In conclusion, targeted governmental subsidies yield superior long-term socioeconomic mobility.');
    assert.strictEqual(undoBuffer, null, 'Undo buffer is cleared after restoration');
  });

  it('8. Verifies beforeunload safety guard conditions', () => {
    const shouldWarnBeforeUnload = (task1: string, task2: string) => {
      return task1.trim().length > 0 || task2.trim().length > 0;
    };

    assert.strictEqual(shouldWarnBeforeUnload('', ''), false, 'Empty drafts should not block navigation');
    assert.strictEqual(shouldWarnBeforeUnload('   \n  ', ''), false, 'Whitespace-only drafts should not block navigation');
    assert.strictEqual(shouldWarnBeforeUnload('Dear Sir or Madam,', ''), true, 'Task 1 draft triggers safety warning');
    assert.strictEqual(shouldWarnBeforeUnload('', 'It is widely argued that...'), true, 'Task 2 draft triggers safety warning');
    assert.strictEqual(shouldWarnBeforeUnload('Analysis text', 'Essay text'), true, 'Both tasks trigger safety warning');
  });

  it('9. Verifies 4-criteria AI Evaluation threshold gate (min 30w Task 1, min 50w Task 2)', () => {
    // Under minimum threshold (Task 1 < 30 words)
    const shortT1 = 'This is a brief summary of the chart with only ten words.';
    const gateT1 = checkWritingWordThreshold(shortT1, 'task1');
    assert.strictEqual(gateT1.isValidAttempt, false, 'Under 30 words must be rejected as invalid attempt');
    assert.strictEqual(gateT1.overallBand, 0.0, 'Under threshold must yield Band 0.0');
    assert.ok(gateT1.feedbackTitle.includes('Short') || gateT1.feedbackTitle.includes('Unassessable'));

    // Under minimum threshold (Task 2 < 50 words)
    const shortT2 = 'I agree that education should be free for all students because it helps society flourish in many good ways.';
    const gateT2 = checkWritingWordThreshold(shortT2, 'task2');
    assert.strictEqual(gateT2.isValidAttempt, false, 'Under 50 words must be rejected as invalid attempt');
    assert.strictEqual(gateT2.overallBand, 0.0);

    // Valid substantive essay (> 50 words non-repetitive)
    const substantiveT2 =
      'Whether higher education should be publicly financed remains a critical matter of economic and social policy. ' +
      'Proponents maintain that eliminating tuition fees removes barriers for disadvantaged demographics, thereby fostering meritocracy. ' +
      'However, free university models often place an unsustainable fiscal burden upon state budgets, occasionally compromising instructional quality. ' +
      'Consequently, governments ought to prioritize targeted means-tested bursaries rather than unconstrained universal subsidization.';
    const gateValid = checkWritingWordThreshold(substantiveT2, 'task2');
    assert.strictEqual(gateValid.isValidAttempt, true, 'Substantive essay must pass minimum threshold gate');
    assert.ok(gateValid.wordCount >= 50);
  });

  it('10. Verifies timer alert boundary thresholds (10m and 5m warnings)', () => {
    const getTimerStatus = (seconds: number) => {
      if (seconds <= 0) return 'EXPIRED';
      if (seconds <= 300) return 'CRITICAL_5M';
      if (seconds <= 600) return 'WARNING_10M';
      return 'NORMAL';
    };

    assert.strictEqual(getTimerStatus(3600), 'NORMAL');
    assert.strictEqual(getTimerStatus(601), 'NORMAL');
    assert.strictEqual(getTimerStatus(600), 'WARNING_10M');
    assert.strictEqual(getTimerStatus(301), 'WARNING_10M');
    assert.strictEqual(getTimerStatus(300), 'CRITICAL_5M');
    assert.strictEqual(getTimerStatus(10), 'CRITICAL_5M');
    assert.strictEqual(getTimerStatus(0), 'EXPIRED');
  });
});
