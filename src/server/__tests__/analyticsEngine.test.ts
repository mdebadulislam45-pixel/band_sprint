import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  validateCandidateEvent,
  analyticsService,
  type CandidateEventInput
} from '../../server/analytics.ts';
import { serverDb } from '../../server/db.ts';

describe('Phase 5.5H.12B — Privacy-First Analytics Event Collector & Persistence Engine', () => {
  const storePath = path.join(process.cwd(), '.data', 'sprint_store.json');
  let storeBackup: string | null = null;

  before(() => {
    if (fs.existsSync(storePath)) {
      storeBackup = fs.readFileSync(storePath, 'utf-8');
    }
  });

  after(() => {
    try {
      const dbAny = serverDb as any;
      if (dbAny.saveTimeout) {
        clearTimeout(dbAny.saveTimeout);
        dbAny.saveTimeout = null;
      }
    } finally {
      if (storeBackup !== null) {
        serverDb.data = JSON.parse(storeBackup);
        fs.writeFileSync(storePath, storeBackup, 'utf-8');
      }
    }
  });

  const testUserId = 'user_test_analytics_123';
  const otherUserId = 'user_test_analytics_999';

  beforeEach(() => {
    // Reset/clear in-memory test events safely without wiping general db
    if (serverDb.data.analyticsEvents) {
      for (const k of Object.keys(serverDb.data.analyticsEvents)) {
        if (k.startsWith('evt_test_') || serverDb.data.analyticsEvents[k].userId === testUserId) {
          delete serverDb.data.analyticsEvents[k];
        }
      }
    }
  });

  describe('1. Schema & Validation Rules', () => {
    it('1. accepts a valid candidate practice_completed event', () => {
      const input: CandidateEventInput = {
        eventType: 'practice_completed',
        idempotencyKey: 'idemp_key_001',
        payload: {
          moduleId: 'speaking',
          format: 'Academic',
          completionStatus: 'completed',
          overallBandScore: 7.5,
          criterionScores: { fc: 7.5, lr: 7.0, gra: 7.5, pr: 8.0 },
          durationSeconds: 840,
          isAiPilot: true
        }
      };

      const result = validateCandidateEvent(input);
      assert.equal(result.valid, true);
      assert.equal(result.error, undefined);
    });

    it('2. rejects invalid eventType', () => {
      const input = {
        eventType: 'candidate_clicked_button',
        payload: { moduleId: 'reading' }
      };
      const result = validateCandidateEvent(input);
      assert.equal(result.valid, false);
      assert.match(result.error || '', /Invalid candidate eventType/);
    });

    it('3. rejects factory operational event submitted to candidate validator', () => {
      const input = {
        eventType: 'ai_generation_completed',
        payload: { moduleId: 'writing' }
      };
      const result = validateCandidateEvent(input);
      assert.equal(result.valid, false);
      assert.match(result.error || '', /Factory operational events cannot be submitted/);
    });

    it('4. rejects invalid moduleId', () => {
      const input = {
        eventType: 'practice_started',
        payload: { moduleId: 'biology_module' }
      };
      const result = validateCandidateEvent(input);
      assert.equal(result.valid, false);
      assert.match(result.error || '', /Invalid moduleId/);
    });

    it('5. rejects invalid overallBandScore (> 9.0 or < 0)', () => {
      const input = {
        eventType: 'module_evaluated',
        payload: { moduleId: 'writing', overallBandScore: 10.5 }
      };
      const result = validateCandidateEvent(input);
      assert.equal(result.valid, false);
      assert.match(result.error || '', /Must be a number between 0.0 and 9.0/);
    });

    it('6. rejects invalid durationSeconds (> 86400)', () => {
      const input = {
        eventType: 'practice_completed',
        payload: { moduleId: 'listening', durationSeconds: 100000 }
      };
      const result = validateCandidateEvent(input);
      assert.equal(result.valid, false);
      assert.match(result.error || '', /Invalid "durationSeconds"/);
    });
  });

  describe('2. Privacy Enforcement & Prohibited Field Exclusion', () => {
    it('7. strictly rejects payloads containing audio recordings or urls', () => {
      const input = {
        eventType: 'practice_completed',
        payload: {
          moduleId: 'speaking',
          audioUrl: 'https://cdn.example.com/audio/cand_voice.mp3'
        }
      };
      const result = validateCandidateEvent(input);
      assert.equal(result.valid, false);
      assert.match(result.error || '', /Prohibited field "audioUrl" detected/);
    });

    it('8. strictly rejects payloads containing raw spoken transcripts or text', () => {
      const input = {
        eventType: 'module_evaluated',
        payload: {
          moduleId: 'speaking',
          transcript: 'Well, in my hometown there are several prominent parks...'
        }
      };
      const result = validateCandidateEvent(input);
      assert.equal(result.valid, false);
      assert.match(result.error || '', /Prohibited field "transcript" detected/);
    });

    it('9. strictly rejects payloads containing full Writing essays', () => {
      const input = {
        eventType: 'module_evaluated',
        payload: {
          moduleId: 'writing',
          essay: 'In recent years, the question of whether globalization benefits developing economies...'
        }
      };
      const result = validateCandidateEvent(input);
      assert.equal(result.valid, false);
      assert.match(result.error || '', /Prohibited field "essay" detected/);
    });

    it('10. strictly rejects payloads containing PII (email, phone, token, password)', () => {
      const input = {
        eventType: 'practice_started',
        payload: {
          moduleId: 'reading',
          email: 'candidate@example.com'
        }
      };
      const result = validateCandidateEvent(input);
      assert.equal(result.valid, false);
      assert.match(result.error || '', /Prohibited field "email" detected/);
    });

    it('11. rejects oversized payloads (> 4KB)', () => {
      const bigString = 'x'.repeat(5000);
      const input = {
        eventType: 'practice_started',
        payload: {
          moduleId: 'reading',
          customBlob: bigString
        }
      };
      const result = validateCandidateEvent(input);
      assert.equal(result.valid, false);
      assert.match(result.error || '', /Payload size exceeds the 4KB maximum limit/);
    });
  });

  describe('3. Ownership Isolation & Server-Authoritative Timestamps', () => {
    it('12. derives ownership from authenticated session, not client payload', () => {
      const res = analyticsService.recordCandidateEvent({
        userId: testUserId,
        eventInput: {
          eventType: 'practice_started',
          payload: { moduleId: 'reading', format: 'Academic' }
        }
      });

      assert.equal(res.success, true);
      assert.ok(res.eventId);

      const record = serverDb.getAnalyticsEventById(res.eventId!);
      assert.equal(record.userId, testUserId);
      assert.ok(record.serverTimestamp > 0);
      assert.equal(record.schemaVersion, '1.0');
    });

    it('13. prevents cross-user analytics access', () => {
      // Create event for testUserId
      const resA = analyticsService.recordCandidateEvent({
        userId: testUserId,
        eventInput: {
          eventType: 'practice_started',
          payload: { moduleId: 'reading' }
        }
      });

      // Create event for otherUserId
      const resB = analyticsService.recordCandidateEvent({
        userId: otherUserId,
        eventInput: {
          eventType: 'practice_started',
          payload: { moduleId: 'writing' }
        }
      });

      const userAEvents = analyticsService.getCandidateEvents(testUserId);
      const userBEvents = analyticsService.getCandidateEvents(otherUserId);

      assert.ok(userAEvents.some(e => e.id === resA.eventId));
      assert.ok(!userAEvents.some(e => e.id === resB.eventId));

      assert.ok(userBEvents.some(e => e.id === resB.eventId));
      assert.ok(!userBEvents.some(e => e.id === resA.eventId));
    });
  });

  describe('4. Duplicate Event Prevention & Idempotency', () => {
    it('14. handles duplicate submission with identical idempotencyKey gracefully', () => {
      const eventInput: CandidateEventInput = {
        eventType: 'practice_completed',
        idempotencyKey: 'idemp_unique_test_100',
        payload: {
          moduleId: 'listening',
          completionStatus: 'completed',
          overallBandScore: 8.0,
          durationSeconds: 1800
        }
      };

      const firstAttempt = analyticsService.recordCandidateEvent({
        userId: testUserId,
        eventInput
      });

      assert.equal(firstAttempt.success, true);
      assert.equal(firstAttempt.isDuplicate, false);
      const firstEventId = firstAttempt.eventId;

      // Resubmit with same key
      const secondAttempt = analyticsService.recordCandidateEvent({
        userId: testUserId,
        eventInput
      });

      assert.equal(secondAttempt.success, true);
      assert.equal(secondAttempt.isDuplicate, true);
      assert.equal(secondAttempt.eventId, firstEventId);
    });
  });

  describe('5. Factory Operational Event Ingestion', () => {
    it('15. records trusted server-side factory operational metrics', () => {
      const res = analyticsService.recordFactoryOperationalEvent({
        eventType: 'ai_generation_completed',
        payload: {
          moduleId: 'speaking',
          format: 'Academic',
          success: true,
          status: 'PENDING_REVIEW',
          validationStatus: 'PASSED',
          repairAttempts: 0,
          durationMs: 4250,
          tokenUsage: { promptTokens: 1200, completionTokens: 850, totalTokens: 2050 }
        },
        userId: testUserId
      });

      assert.equal(res.success, true);
      assert.ok(res.eventId);

      const opEvents = analyticsService.getFactoryOperationalEvents();
      assert.ok(opEvents.some(e => e.id === res.eventId));
      const op = opEvents.find(e => e.id === res.eventId);
      assert.equal(op.category, 'factory_operational');
      assert.equal((op.payload as any).durationMs, 4250);
      assert.equal((op.payload as any).success, true);
    });
  });
});
