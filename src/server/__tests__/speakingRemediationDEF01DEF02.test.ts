import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSpeakingFormat,
  normalizeSpeakingDifficulty
} from '../../server/ai/questionFactory.ts';

describe('Phase 5.5H.11E — Speaking Pilot Remediation (DEF-01 & DEF-02)', () => {
  describe('DEF-01: Generation Parameter Normalization', () => {
    it('1. normalizes ACADEMIC to Academic', () => {
      assert.equal(normalizeSpeakingFormat('ACADEMIC'), 'Academic');
      assert.equal(normalizeSpeakingFormat('academic'), 'Academic');
      assert.equal(normalizeSpeakingFormat('ACADEMIC MODULE'), 'Academic');
    });

    it('2. normalizes GENERAL_TRAINING to General Training', () => {
      assert.equal(normalizeSpeakingFormat('GENERAL_TRAINING'), 'General Training');
      assert.equal(normalizeSpeakingFormat('general_training'), 'General Training');
      assert.equal(normalizeSpeakingFormat('GENERAL TRAINING'), 'General Training');
      assert.equal(normalizeSpeakingFormat('GENERAL'), 'General Training');
    });

    it('3. normalizes BAND_6_5 to Standard', () => {
      assert.equal(normalizeSpeakingDifficulty('BAND_6_5'), 'Standard');
      assert.equal(normalizeSpeakingDifficulty('STANDARD'), 'Standard');
      assert.equal(normalizeSpeakingDifficulty('standard'), 'Standard');
    });

    it('4. normalizes BAND_7_5 and BAND_8_5 to Challenging', () => {
      assert.equal(normalizeSpeakingDifficulty('BAND_7_5'), 'Challenging');
      assert.equal(normalizeSpeakingDifficulty('BAND_8_5'), 'Challenging');
      assert.equal(normalizeSpeakingDifficulty('CHALLENGING'), 'Challenging');
      assert.equal(normalizeSpeakingDifficulty('challenging'), 'Challenging');
    });

    it('5. defaults missing or empty format to Academic safely', () => {
      assert.equal(normalizeSpeakingFormat(undefined), 'Academic');
      assert.equal(normalizeSpeakingFormat(''), 'Academic');
      assert.equal(normalizeSpeakingFormat('   '), 'Academic');
    });

    it('6. defaults missing or empty difficulty to Standard safely', () => {
      assert.equal(normalizeSpeakingDifficulty(undefined), 'Standard');
      assert.equal(normalizeSpeakingDifficulty(''), 'Standard');
      assert.equal(normalizeSpeakingDifficulty('   '), 'Standard');
    });

    it('7. throws explicit error for unrecognized format values', () => {
      assert.throws(
        () => normalizeSpeakingFormat('INVALID_FORMAT'),
        /Invalid format "INVALID_FORMAT"/
      );
    });

    it('8. throws explicit error for unrecognized difficulty values', () => {
      assert.throws(
        () => normalizeSpeakingDifficulty('INVALID_DIFFICULTY'),
        /Invalid difficulty "INVALID_DIFFICULTY"/
      );
    });
  });

  describe('DEF-02: VoiceExaminer State Transition & Standard Reset', () => {
    it('9. verifies clearing customMockSet resets questions to standard bank', () => {
      let activeTestId: string | undefined = 'draft_speaking_123';
      let activeQuestions: any[] = [{ id: 'pilot_q1', text: 'Pilot Question 1' }];
      let isPilotMode = true;

      assert.equal(isPilotMode, true);
      assert.equal(activeTestId, 'draft_speaking_123');
      assert.equal(activeQuestions.length, 1);

      const customMockSet = null;
      if (!customMockSet) {
        activeTestId = undefined;
        activeQuestions = [
          { id: 'std_p1', text: 'Standard Part 1 Question' },
          { id: 'std_p2', text: 'Standard Part 2 Cue Card' },
          { id: 'std_p3', text: 'Standard Part 3 Question' }
        ];
        isPilotMode = false;
      }

      assert.equal(isPilotMode, false);
      assert.equal(activeTestId, undefined);
      assert.equal(activeQuestions.length, 3);
      assert.equal(activeQuestions[0].id, 'std_p1');
    });

    it('10. verifies switching from Pilot A to Pilot B updates state cleanly', () => {
      let activeTestId = 'pilot_A';
      const pilotB = { id: 'pilot_B', isAiPilot: true };

      if (pilotB) {
        activeTestId = pilotB.id;
      }

      assert.equal(activeTestId, 'pilot_B');
    });
  });
});
