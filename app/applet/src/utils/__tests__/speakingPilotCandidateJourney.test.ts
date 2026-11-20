import { test, describe } from 'node.js:test';
import assert from 'node.js:assert';
import { generateSpeakingPilot } from '../../server/ai/questionFactory';
import { convertAiDraftToSpeakingMockSet } from '../../server/ai/speakingAdapter';
import {
  PART_1_SPEAKING_BANK,
  PART_2_CUE_CARD_BANK,
  PART_3_DISCUSSION_BANK
} from '../../data/speakingComprehensiveBank';
import { evaluateSingleSpeakingTurn } from '../../services/SpeakingEvaluationService';
import { SpeakingAnswerRecord } from '../../types/speakingTypes';

describe('AI Speaking Pilot — End-to-End Candidate Journey Verification', () => {

  describe('1. Draft Discovery & Adapter Mapping', () => {
    test('generateSpeakingPilot returns validated draft and adapter converts to complete SpeakingMockSet', async () => {
      const result = await generateSpeakingPilot({
        topicSeed: 'Future Urban Transport & Smart Infrastructure',
        format: 'ACADEMIC',
        difficulty: 'BAND_7_5',
        userId: 'usr_candidate_journey_test'
      });

      assert.strictEqual(result.success, true);
      assert.ok(result.draft);
      assert.strictEqual(result.draft.status, 'PENDING_REVIEW');
      assert.strictEqual(result.draft.userId, 'usr_candidate_journey_test');

      const mockSet = convertAiDraftToSpeakingMockSet(result.draft);

      assert.strictEqual(mockSet.id, result.draft.id);
      assert.strictEqual(mockSet.isAiGenerated, true);
      assert.strictEqual(mockSet.status, 'PENDING_REVIEW');
      assert.strictEqual(mockSet.part1.length, 4, 'Part 1 must have exactly 4 questions');
      assert.strictEqual(mockSet.part3.length, 3, 'Part 3 must have exactly 3 questions');
      assert.ok(mockSet.part2.id, 'Part 2 must have an ID');
      assert.strictEqual(mockSet.part2.cueCardBulletPoints.length, 3, 'Part 2 cue card must have 3 bullet points');
    });

    test('Draft question structure preserves evaluationFocus and model answers', async () => {
      const result = await generateSpeakingPilot({
        topicSeed: 'Artificial Intelligence & Labor Dynamics',
        format: 'GENERAL_TRAINING',
        difficulty: 'BAND_8_5',
        userId: 'usr_candidate_journey_test'
      });

      const mockSet = convertAiDraftToSpeakingMockSet(result.draft!);

      // Verify Part 1 items
      for (const q of mockSet.part1) {
        assert.strictEqual(q.part, 1);
        assert.ok(q.questionText && q.questionText.length > 5);
        assert.ok(q.modelAnswerBand9 && q.modelAnswerBand9.length > 10);
        assert.ok(q.evaluationFocus);
      }

      // Verify Part 2 item
      assert.strictEqual(mockSet.part2.part, 2);
      assert.ok(mockSet.part2.questionText.length > 5);
      assert.strictEqual(mockSet.part2.cueCardBulletPoints.length, 3);
      assert.ok(mockSet.part2.modelAnswerBand9.length > 15);

      // Verify Part 3 items
      for (const q of mockSet.part3) {
        assert.strictEqual(q.part, 3);
        assert.ok(q.questionText && q.questionText.length > 5);
        assert.ok(q.modelAnswerBand9 && q.modelAnswerBand9.length > 10);
        assert.ok(q.evaluationFocus);
      }
    });
  });

  describe('2. Voice Examiner Prompt & Spoken Turn Integrity', () => {
    test('Candidate spoken turns map to AI pilot question IDs', async () => {
      const result = await generateSpeakingPilot({
        topicSeed: 'Environmental Sustainability',
        format: 'ACADEMIC',
        difficulty: 'BAND_7_5',
        userId: 'usr_candidate_journey_test'
      });

      const mockSet = convertAiDraftToSpeakingMockSet(result.draft!);
      const p1FirstQ = mockSet.part1[0];

      // Simulate a candidate turn response for Part 1 Question 1
      const record: SpeakingAnswerRecord = {
        questionId: p1FirstQ.id,
        part: 1,
        topic: p1FirstQ.topic,
        questionText: p1FirstQ.questionText,
        transcript: 'I come from a small coastal city where environmental conservation is extremely important. We have numerous recycling initiatives and public parks.',
        startTime: Date.now() - 15000,
        endTime: Date.now(),
        durationSec: 15,
        wordCount: 22,
        wordsPerMinute: 88,
        pauseCount: 1,
        longPauseCount: 0,
        fillerCount: 0,
        detectedFillers: []
      };

      const feedback = await evaluateSingleSpeakingTurn(record);
      assert.ok(feedback);
      assert.strictEqual(feedback.questionId, p1FirstQ.id);
      assert.ok(feedback.estimatedBands.overall >= 5.0 && feedback.estimatedBands.overall <= 9.0);
    });

    test('Part 2 Monologue turn evaluates against AI pilot cue card bullets', async () => {
      const result = await generateSpeakingPilot({
        topicSeed: 'Cultural Heritage & Tourism',
        format: 'ACADEMIC',
        difficulty: 'BAND_7_5',
        userId: 'usr_candidate_journey_test'
      });

      const mockSet = convertAiDraftToSpeakingMockSet(result.draft!);
      const p2Card = mockSet.part2;

      // Simulate candidate Part 2 monologue response
      const record: SpeakingAnswerRecord = {
        questionId: p2Card.id,
        part: 2,
        topic: p2Card.topic,
        questionText: p2Card.questionText,
        transcript: 'I would like to describe an ancient historical site in my home country. It was constructed over five hundred years ago and attracts thousands of international visitors annually. I visited this venue last summer with my extended family.',
        startTime: Date.now() - 90000,
        endTime: Date.now(),
        durationSec: 90,
        wordCount: 38,
        wordsPerMinute: 25,
        pauseCount: 3,
        longPauseCount: 1,
        fillerCount: 1,
        detectedFillers: ['um']
      };

      const feedback = await evaluateSingleSpeakingTurn(record, p2Card.cueCardBulletPoints);
      assert.ok(feedback);
      assert.strictEqual(feedback.questionId, p2Card.id);
      assert.strictEqual(feedback.part, 2);
    });
  });

  describe('3. Non-Interference Regression Check', () => {
    test('Static speaking question banks remain unmodified', () => {
      const p1CountInitial = PART_1_SPEAKING_BANK.length;
      const p2CountInitial = PART_2_CUE_CARD_BANK.length;
      const p3CountInitial = PART_3_DISCUSSION_BANK.length;

      assert.ok(p1CountInitial >= 4, 'Part 1 static bank must contain questions');
      assert.ok(p2CountInitial >= 1, 'Part 2 static bank must contain cue cards');
      assert.ok(p3CountInitial >= 3, 'Part 3 static bank must contain questions');

      // Ensure no static bank item is marked as AI generated
      for (const item of PART_1_SPEAKING_BANK) {
        assert.strictEqual((item as any).isAiGenerated, undefined);
      }
      for (const item of PART_2_CUE_CARD_BANK) {
        assert.strictEqual((item as any).isAiGenerated, undefined);
      }
      for (const item of PART_3_DISCUSSION_BANK) {
        assert.strictEqual((item as any).isAiGenerated, undefined);
      }
    });
  });

});
