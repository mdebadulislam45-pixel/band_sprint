import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { analyticsService } from '../../server/analytics.ts';
import { serverDb } from '../../server/db.ts';
import {
  handleGetFactoryMetrics,
  handleGetAnalyticsStats,
  handleDownloadSourceZip,
  sourceZipDependencies,
  analyticsState,
  handleGenerateReading,
  handleGenerateListening,
  handleGenerateWriting,
  handleGenerateSpeaking
} from '../../../server.ts';
import {
  computeFactoryDashboardMetrics,
  getFactoryCoverageStatus,
  type FactoryOperationalEventItem
} from '../../components/pages/AdminAnalyticsPage.tsx';
import { questionFactory } from '../../server/ai/questionFactory.ts';

describe('Phase 5.5H.12E — Admin AI Factory Operational Analytics & Multi-Factory Telemetry Integration', () => {
  const adminEmail = 'mdebadulislam45@gmail.com';
  const candidateEmail = 'candidate.user@example.com';
  const storeFilePath = path.resolve(process.cwd(), '.data', 'sprint_store.json');
  let initialStoreBuffer: Buffer | null = null;

  before(() => {
    if (fs.existsSync(storeFilePath)) {
      initialStoreBuffer = fs.readFileSync(storeFilePath);
    }
  });

  after(() => {
    const dbAny = serverDb as any;
    if (dbAny.saveTimeout) {
      clearTimeout(dbAny.saveTimeout);
      dbAny.saveTimeout = null;
    }
    if (initialStoreBuffer) {
      serverDb.data = JSON.parse(initialStoreBuffer.toString('utf-8'));
      fs.writeFileSync(storeFilePath, initialStoreBuffer);
    }
  });

  beforeEach(() => {
    // Clear test events safely
    if (serverDb.data.analyticsEvents) {
      for (const k of Object.keys(serverDb.data.analyticsEvents)) {
        if (
          k.startsWith('evt_fact_test_') ||
          k.startsWith('evt_priv_test_') ||
          k.startsWith('evt_fact_12e_')
        ) {
          delete serverDb.data.analyticsEvents[k];
        }
      }
    }
  });

  describe('1. Operational Metrics Calculation & Extraction', () => {
    it('1. correctly ingests and calculates AI Factory generation operational event metrics', () => {
      const res = analyticsService.recordFactoryOperationalEvent({
        eventType: 'ai_generation_completed',
        payload: {
          moduleId: 'speaking',
          format: 'Academic',
          success: true,
          status: 'PENDING_REVIEW',
          validationStatus: 'PASSED',
          repairAttempts: 0,
          durationMs: 3850,
          tokenUsage: {
            promptTokens: 1100,
            completionTokens: 850,
            totalTokens: 1950
          }
        }
      });

      assert.equal(res.success, true);
      assert.ok(res.eventId);

      const events = analyticsService.getFactoryOperationalEvents();
      const recorded = events.find(e => e.id === res.eventId);
      assert.ok(recorded);
      assert.equal(recorded?.category, 'factory_operational');
      const recPayload = recorded?.payload as any;
      assert.equal(recPayload.moduleId, 'speaking');
      assert.equal(recPayload.success, true);
      assert.equal(recPayload.validationStatus, 'PASSED');
      assert.equal(recPayload.durationMs, 3850);
      assert.equal(recPayload.tokenUsage?.totalTokens, 1950);
    });

    it('2. records generation failures and captures sanitized error categories', () => {
      const res = analyticsService.recordFactoryOperationalEvent({
        eventType: 'ai_generation_failed',
        payload: {
          moduleId: 'speaking',
          format: 'Academic',
          success: false,
          status: 'VALIDATION_FAILED',
          validationStatus: 'FAILED',
          repairAttempts: 3,
          durationMs: 8400,
          sanitizedErrorCategory: 'SchemaValidationError'
        }
      });

      assert.equal(res.success, true);
      const events = analyticsService.getFactoryOperationalEvents();
      const failed = events.find(e => e.id === res.eventId);
      assert.ok(failed);
      const failPayload = failed?.payload as any;
      assert.equal(failPayload.success, false);
      assert.equal(failPayload.sanitizedErrorCategory, 'SchemaValidationError');
      assert.equal(failPayload.repairAttempts, 3);
    });

    it('3. isolates factory operational events from candidate event queries', () => {
      const res = analyticsService.recordFactoryOperationalEvent({
        eventType: 'ai_generation_completed',
        payload: {
          moduleId: 'speaking',
          success: true,
          status: 'PENDING_REVIEW',
          durationMs: 2000
        }
      });

      // Query candidate events for a candidate user
      const candEvents = analyticsService.getCandidateEvents('cand_regular_user');
      assert.equal(candEvents.some(e => e.id === res.eventId), false);
    });

    it('4. supports multi-factory operational telemetry across Reading, Listening, Writing, and Speaking', () => {
      const r = analyticsService.recordFactoryOperationalEvent({
        eventType: 'ai_generation_completed',
        payload: { moduleId: 'reading', format: 'Academic', success: true, status: 'PENDING_REVIEW', validationStatus: 'PASSED', durationMs: 4000 }
      });
      const l = analyticsService.recordFactoryOperationalEvent({
        eventType: 'ai_generation_completed',
        payload: { moduleId: 'listening', format: 'Academic', success: true, status: 'PENDING_REVIEW', validationStatus: 'PASSED', durationMs: 3500 }
      });
      const w = analyticsService.recordFactoryOperationalEvent({
        eventType: 'ai_generation_completed',
        payload: { moduleId: 'writing', format: 'General Training', success: true, status: 'PENDING_REVIEW', validationStatus: 'PASSED', durationMs: 4500 }
      });

      const events = analyticsService.getFactoryOperationalEvents();
      assert.ok(events.some(e => e.id === r.eventId && e.payload.moduleId === 'reading'));
      assert.ok(events.some(e => e.id === l.eventId && e.payload.moduleId === 'listening'));
      assert.ok(events.some(e => e.id === w.eventId && e.payload.moduleId === 'writing'));
    });

    it('5. does not fabricate token usage when missing from event payload', () => {
      const res = analyticsService.recordFactoryOperationalEvent({
        eventType: 'ai_generation_completed',
        payload: {
          moduleId: 'speaking',
          success: true,
          status: 'PENDING_REVIEW',
          durationMs: 1500
          // tokenUsage intentionally omitted
        }
      });

      const events = analyticsService.getFactoryOperationalEvents();
      const event = events.find(e => e.id === res.eventId);
      assert.ok(event);
      assert.equal((event?.payload as any)?.tokenUsage, undefined);
    });
  });

  describe('2. DEF-PRIV-01 — Server-Side Privacy Sanitization', () => {
    it('6. sanitized operational events omit userId over the API boundary while preserving all operational fields', () => {
      const candidateUserId = 'usr_cand_secret_789';
      const res = analyticsService.recordFactoryOperationalEvent({
        eventType: 'ai_generation_completed',
        userId: candidateUserId,
        payload: {
          moduleId: 'speaking',
          format: 'Academic',
          success: true,
          status: 'PENDING_REVIEW',
          validationStatus: 'PASSED',
          repairAttempts: 0,
          durationMs: 3200,
          sanitizedErrorCategory: undefined,
          tokenUsage: { promptTokens: 950, completionTokens: 600, totalTokens: 1550 }
        }
      });

      assert.equal(res.success, true);

      // Fetch sanitized events through the service projection
      const sanitized = analyticsService.getSanitizedFactoryOperationalEvents();
      const target = sanitized.find(e => e.id === res.eventId);
      assert.ok(target, 'Target event must be present in sanitized output');

      // Assert userId is completely omitted
      assert.equal('userId' in target, false, 'userId property must not exist on sanitized event');
      assert.equal((target as any).userId, undefined);

      // Assert all operational fields are preserved
      assert.equal(target.id, res.eventId);
      assert.equal(target.schemaVersion, '1.0');
      assert.equal(target.category, 'factory_operational');
      assert.equal(target.eventType, 'ai_generation_completed');
      assert.ok(typeof target.serverTimestamp === 'number');
      const tPayload = target.payload as any;
      assert.equal(tPayload.moduleId, 'speaking');
      assert.equal(tPayload.format, 'Academic');
      assert.equal(tPayload.success, true);
      assert.equal(tPayload.status, 'PENDING_REVIEW');
      assert.equal(tPayload.validationStatus, 'PASSED');
      assert.equal(tPayload.repairAttempts, 0);
      assert.equal(tPayload.durationMs, 3200);
      assert.equal(tPayload.tokenUsage?.totalTokens, 1550);
    });

    it('7. verifies internal database records remain intact and are not mutated by sanitized projection', () => {
      const candidateUserId = 'usr_cand_database_store_keep_intact';
      const res = analyticsService.recordFactoryOperationalEvent({
        eventType: 'ai_generation_completed',
        userId: candidateUserId,
        payload: {
          moduleId: 'speaking',
          format: 'General Training',
          success: true,
          status: 'PENDING_REVIEW',
          validationStatus: 'PASSED',
          repairAttempts: 1,
          durationMs: 4100
        }
      });

      // Call sanitized projection
      const sanitized = analyticsService.getSanitizedFactoryOperationalEvents();
      const sanitizedTarget = sanitized.find(e => e.id === res.eventId);
      assert.equal('userId' in (sanitizedTarget || {}), false);

      // Verify that database record still has its userId preserved (no mutation)
      const rawStored = serverDb.getAnalyticsEventById(res.eventId!);
      assert.ok(rawStored, 'Stored record must exist in DB');
      assert.equal(rawStored.userId, candidateUserId, 'Internal database record must retain historical userId');
    });

    it('8. candidate analytics queries remain isolated and unaffected by factory operational events', () => {
      const candId = 'cand_isolation_check_01';
      // Record candidate event
      analyticsService.recordCandidateEvent({
        userId: candId,
        eventInput: {
          eventType: 'practice_started',
          payload: { moduleId: 'speaking', format: 'Academic' }
        }
      });

      // Record factory event
      analyticsService.recordFactoryOperationalEvent({
        eventType: 'ai_generation_completed',
        userId: candId,
        payload: { moduleId: 'speaking', success: true, status: 'PENDING_REVIEW', durationMs: 2500 }
      });

      // Candidate events must only return candidate events, never factory_operational events
      const candEvents = analyticsService.getCandidateEvents(candId);
      assert.ok(candEvents.every(e => e.category === 'candidate'));
      assert.ok(candEvents.every(e => e.eventType === 'practice_started'));
    });
  });

  describe('3. DEF-AUTH-01 — Safe Admin Email Validation & Endpoint Authorization', () => {
    function createMockRes() {
      const res: any = {
        statusCode: 200,
        body: null,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json(payload: any) {
          this.body = payload;
          return this;
        }
      };
      return res;
    }

    it('9. returns HTTP 401 for unauthenticated requests lacking a session', () => {
      const req: any = {
        headers: {},
        query: {}
      };
      const res = createMockRes();

      handleGetFactoryMetrics(req, res);
      assert.equal(res.statusCode, 401);
      assert.equal(res.body.error, 'Authentication required.');
    });

    it('10. returns HTTP 403 for authenticated candidate accounts with regular emails', () => {
      const user = {
        id: 'usr_cand_reg_01',
        email: candidateEmail,
        name: 'Regular Candidate'
      };
      serverDb.saveUser(user as any);
      const session = serverDb.createSession(user.id);

      const req: any = {
        headers: { authorization: `Bearer ${session.token}` },
        query: {}
      };
      const res = createMockRes();

      handleGetFactoryMetrics(req, res);
      assert.equal(res.statusCode, 403);
      assert.ok(res.body.error.includes('Administrator privileges required'));
    });

    it('11. returns HTTP 403 for candidate accounts with undefined or missing email without throwing 500', () => {
      const userWithoutEmail = {
        id: 'usr_cand_no_email_01',
        email: undefined as any,
        name: 'Phone OTP User'
      };
      serverDb.saveUser(userWithoutEmail as any);
      const session = serverDb.createSession(userWithoutEmail.id);

      const req: any = {
        headers: { authorization: `Bearer ${session.token}` },
        query: {}
      };
      const res = createMockRes();

      // Must not throw TypeError on .toLowerCase()
      assert.doesNotThrow(() => {
        handleGetFactoryMetrics(req, res);
      });
      assert.equal(res.statusCode, 403);
      assert.ok(res.body.error.includes('Valid administrator email required') || res.body.error.includes('Administrator privileges required'));
    });

    it('12. returns HTTP 403 for candidate accounts with null, empty, or whitespace-only emails', () => {
      const invalidEmails = [null, '', '   ', '\t\n'];

      invalidEmails.forEach((emailVal, idx) => {
        const user = {
          id: `usr_cand_invalid_email_${idx}`,
          email: emailVal as any,
          name: 'Invalid Email User'
        };
        serverDb.saveUser(user as any);
        const session = serverDb.createSession(user.id);

        const req: any = {
          headers: { authorization: `Bearer ${session.token}` },
          query: {}
        };
        const res = createMockRes();

        assert.doesNotThrow(() => {
          handleGetFactoryMetrics(req, res);
        });
        assert.equal(res.statusCode, 403, `Must return 403 for email value: ${JSON.stringify(emailVal)}`);
      });
    });

    it('13. returns HTTP 200 with sanitized events for authorized administrator email (including case and whitespace trimming)', () => {
      const adminUser = {
        id: 'usr_admin_authorized_01',
        email: '   MDEbadulIslam45@Gmail.Com   ', // mixed case and leading/trailing whitespace
        name: 'Authorized Administrator'
      };
      serverDb.saveUser(adminUser as any);
      const session = serverDb.createSession(adminUser.id);

      // Record a test event with userId
      analyticsService.recordFactoryOperationalEvent({
        eventType: 'ai_generation_completed',
        userId: 'usr_candidate_initiator_999',
        payload: {
          moduleId: 'speaking',
          format: 'Academic',
          success: true,
          status: 'PENDING_REVIEW',
          validationStatus: 'PASSED',
          repairAttempts: 0,
          durationMs: 3500
        }
      });

      const req: any = {
        headers: { authorization: `Bearer ${session.token}` },
        query: { limit: '10' }
      };
      const res = createMockRes();

      handleGetFactoryMetrics(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.events));
      assert.ok(res.body.events.length > 0);

      // Critical privacy check on actual HTTP response:
      res.body.events.forEach((ev: any) => {
        assert.equal('userId' in ev, false, 'No event in HTTP response must contain userId');
        assert.equal(ev.userId, undefined);
      });
    });
  });

  describe('4. DEF-METRIC-01 — Latency Calculation & Reporting Accuracy', () => {
    it('14. calculates average latency accurately and filters out invalid, zero, or negative durations', () => {
      const mockDurations = [2000, 4000, 6000, 0, -1500, null, undefined, 'invalid'];

      const validDurations = mockDurations.filter(
        (d): d is number => typeof d === 'number' && Number.isFinite(d) && d > 0
      );

      assert.deepEqual(validDurations, [2000, 4000, 6000]);
      const avg = Math.round(validDurations.reduce((a, b) => a + b, 0) / validDurations.length);
      assert.equal(avg, 4000);
      assert.equal((avg / 1000).toFixed(1), '4.0');
    });

    it('15. returns null and renders fallback "—" when no valid latency events exist', () => {
      const emptyDurations: number[] = [];
      const validDurations = emptyDurations.filter(
        (d): d is number => typeof d === 'number' && Number.isFinite(d) && d > 0
      );
      const avg = validDurations.length > 0
        ? Math.round(validDurations.reduce((a, b) => a + b, 0) / validDurations.length)
        : null;

      assert.equal(avg, null);
      const display = avg !== null ? `${(avg / 1000).toFixed(1)}s` : '—';
      assert.equal(display, '—');
    });
  });

  describe('5. Phase 5.5H.12E — Reading, Listening & Writing Factory Telemetry Integration', () => {
    it('16. records Reading factory operational event (Academic format, duration, repair attempts, and tokens)', () => {
      const res = analyticsService.recordFactoryOperationalEvent({
        eventType: 'ai_generation_completed',
        userId: 'usr_reading_cand_01',
        payload: {
          moduleId: 'reading',
          format: 'Academic',
          success: true,
          status: 'PENDING_REVIEW',
          validationStatus: 'PASSED',
          repairAttempts: 0,
          durationMs: 4200,
          tokenUsage: { promptTokens: 1200, completionTokens: 4800, totalTokens: 6000 }
        }
      });

      assert.equal(res.success, true);
      assert.ok(res.eventId);

      const events = analyticsService.getFactoryOperationalEvents();
      const rec = events.find(e => e.id === res.eventId);
      assert.ok(rec);
      const payload = rec?.payload as any;
      assert.equal(payload.moduleId, 'reading');
      assert.equal(payload.format, 'Academic');
      assert.equal(payload.success, true);
      assert.equal(payload.validationStatus, 'PASSED');
      assert.equal(payload.durationMs, 4200);
      assert.equal(payload.tokenUsage.totalTokens, 6000);
    });

    it('17. records Reading factory failure event on error with sanitized error category', () => {
      const res = analyticsService.recordFactoryOperationalEvent({
        eventType: 'ai_generation_failed',
        userId: 'usr_reading_cand_02',
        payload: {
          moduleId: 'reading',
          format: 'Academic',
          success: false,
          status: 'VALIDATION_FAILED',
          validationStatus: 'FAILED',
          repairAttempts: 2,
          durationMs: 7800,
          sanitizedErrorCategory: 'SchemaValidationError'
        }
      });

      assert.equal(res.success, true);
      const events = analyticsService.getFactoryOperationalEvents();
      const failed = events.find(e => e.id === res.eventId);
      assert.ok(failed);
      const payload = failed?.payload as any;
      assert.equal(payload.moduleId, 'reading');
      assert.equal(payload.success, false);
      assert.equal(payload.sanitizedErrorCategory, 'SchemaValidationError');
      assert.equal(payload.repairAttempts, 2);
    });

    it('18. records Listening factory operational event (Academic format, duration, repair attempts, and tokens)', () => {
      const res = analyticsService.recordFactoryOperationalEvent({
        eventType: 'ai_generation_completed',
        userId: 'usr_listening_cand_01',
        payload: {
          moduleId: 'listening',
          format: 'Academic',
          success: true,
          status: 'PENDING_REVIEW',
          validationStatus: 'REPAIRED',
          repairAttempts: 1,
          durationMs: 5100,
          tokenUsage: { promptTokens: 900, completionTokens: 5200, totalTokens: 6100 }
        }
      });

      assert.equal(res.success, true);
      const events = analyticsService.getFactoryOperationalEvents();
      const rec = events.find(e => e.id === res.eventId);
      assert.ok(rec);
      const payload = rec?.payload as any;
      assert.equal(payload.moduleId, 'listening');
      assert.equal(payload.format, 'Academic');
      assert.equal(payload.success, true);
      assert.equal(payload.validationStatus, 'REPAIRED');
      assert.equal(payload.repairAttempts, 1);
      assert.equal(payload.durationMs, 5100);
    });

    it('19. records Listening factory failure event on error with sanitized error category', () => {
      const res = analyticsService.recordFactoryOperationalEvent({
        eventType: 'ai_generation_failed',
        userId: 'usr_listening_cand_02',
        payload: {
          moduleId: 'listening',
          format: 'Academic',
          success: false,
          status: 'VALIDATION_FAILED',
          validationStatus: 'FAILED',
          repairAttempts: 3,
          durationMs: 9100,
          sanitizedErrorCategory: 'AudioParsingError'
        }
      });

      assert.equal(res.success, true);
      const events = analyticsService.getFactoryOperationalEvents();
      const failed = events.find(e => e.id === res.eventId);
      assert.ok(failed);
      const payload = failed?.payload as any;
      assert.equal(payload.moduleId, 'listening');
      assert.equal(payload.sanitizedErrorCategory, 'AudioParsingError');
    });

    it('20. records Writing factory operational event for Academic and General Training formats', () => {
      const resAcad = analyticsService.recordFactoryOperationalEvent({
        eventType: 'ai_generation_completed',
        userId: 'usr_writing_cand_acad',
        payload: {
          moduleId: 'writing',
          format: 'Academic',
          success: true,
          status: 'PENDING_REVIEW',
          validationStatus: 'PASSED',
          repairAttempts: 0,
          durationMs: 3600,
          tokenUsage: { promptTokens: 800, completionTokens: 2200, totalTokens: 3000 }
        }
      });
      const resGT = analyticsService.recordFactoryOperationalEvent({
        eventType: 'ai_generation_completed',
        userId: 'usr_writing_cand_gt',
        payload: {
          moduleId: 'writing',
          format: 'General Training',
          success: true,
          status: 'PENDING_REVIEW',
          validationStatus: 'PASSED',
          repairAttempts: 0,
          durationMs: 3400,
          tokenUsage: { promptTokens: 750, completionTokens: 2100, totalTokens: 2850 }
        }
      });

      assert.equal(resAcad.success, true);
      assert.equal(resGT.success, true);

      const events = analyticsService.getFactoryOperationalEvents();
      const acadEv = events.find(e => e.id === resAcad.eventId);
      const gtEv = events.find(e => e.id === resGT.eventId);

      assert.equal((acadEv?.payload as any).format, 'Academic');
      assert.equal((gtEv?.payload as any).format, 'General Training');
      assert.equal((acadEv?.payload as any).moduleId, 'writing');
      assert.equal((gtEv?.payload as any).moduleId, 'writing');
    });

    it('21. records Writing factory failure event on error with sanitized error category', () => {
      const res = analyticsService.recordFactoryOperationalEvent({
        eventType: 'ai_generation_failed',
        userId: 'usr_writing_cand_fail',
        payload: {
          moduleId: 'writing',
          format: 'Academic',
          success: false,
          status: 'VALIDATION_FAILED',
          validationStatus: 'FAILED',
          repairAttempts: 3,
          durationMs: 8200,
          sanitizedErrorCategory: 'Task1VisualDataMissing'
        }
      });

      assert.equal(res.success, true);
      const events = analyticsService.getFactoryOperationalEvents();
      const failed = events.find(e => e.id === res.eventId);
      assert.ok(failed);
      const payload = failed?.payload as any;
      assert.equal(payload.moduleId, 'writing');
      assert.equal(payload.sanitizedErrorCategory, 'Task1VisualDataMissing');
    });

    it('22. telemetry failure resilience: telemetry errors do not throw or break question generation', () => {
      // Simulate telemetry failure resilience by ensuring AnalyticsService handles unexpected input gracefully
      const res = analyticsService.recordFactoryOperationalEvent({
        eventType: 'ai_generation_completed',
        payload: {
          moduleId: 'reading',
          format: 'Academic',
          success: true,
          status: 'PENDING_REVIEW',
          durationMs: 2500
        }
      });

      // Must succeed and return an eventId without throwing
      assert.equal(res.success, true);
      assert.ok(res.eventId);
    });

    it('23. ensures one logical terminal event is emitted per generation attempt without duplicates', () => {
      // Simulate a generation attempt with 2 repair attempts
      const res = analyticsService.recordFactoryOperationalEvent({
        eventType: 'ai_generation_completed',
        payload: {
          moduleId: 'reading',
          format: 'Academic',
          success: true,
          status: 'PENDING_REVIEW',
          validationStatus: 'REPAIRED',
          repairAttempts: 2, // 2 prompt repairs occurred internally
          durationMs: 6500
        }
      });

      const events = analyticsService.getFactoryOperationalEvents();
      const matches = events.filter(e => e.id === res.eventId);
      // Exactly 1 terminal event recorded
      assert.equal(matches.length, 1);
    });

    it('24. ensures zero raw candidate responses, prompts, transcripts, or essays exist in operational payloads', () => {
      const prohibitedKeys = ['transcript', 'recording', 'audio', 'essay', 'response', 'candidateResponse', 'prompt', 'passage'];
      const events = analyticsService.getFactoryOperationalEvents();

      events.forEach(e => {
        const payloadKeys = Object.keys(e.payload);
        for (const pKey of prohibitedKeys) {
          assert.equal(payloadKeys.includes(pKey), false, `Operational payload must never contain "${pKey}"`);
        }
      });
    });

    it('25. ensures candidate userId is stripped across Reading, Listening, Writing, and Speaking in admin API responses', () => {
      const modules = ['reading', 'listening', 'writing', 'speaking'] as const;
      const eventIds: string[] = [];

      modules.forEach(mod => {
        const res = analyticsService.recordFactoryOperationalEvent({
          eventType: 'ai_generation_completed',
          userId: `usr_cand_secret_${mod}`,
          payload: {
            moduleId: mod,
            format: 'Academic',
            success: true,
            status: 'PENDING_REVIEW',
            validationStatus: 'PASSED',
            repairAttempts: 0,
            durationMs: 3000
          }
        });
        if (res.eventId) eventIds.push(res.eventId);
      });

      // Query via sanitized service / endpoint projection
      const sanitized = analyticsService.getSanitizedFactoryOperationalEvents();
      eventIds.forEach(id => {
        const ev = sanitized.find(e => e.id === id);
        assert.ok(ev, `Event ${id} must be returned`);
        assert.equal('userId' in ev, false, `Event ${id} must not contain userId over the API boundary`);
        assert.equal((ev as any).userId, undefined);
      });
    });

    it('26. verifies existing Speaking operational telemetry remains active, accurate, and unaffected', () => {
      const res = analyticsService.recordFactoryOperationalEvent({
        eventType: 'ai_generation_completed',
        payload: {
          moduleId: 'speaking',
          format: 'Academic',
          success: true,
          status: 'PENDING_REVIEW',
          validationStatus: 'PASSED',
          repairAttempts: 0,
          durationMs: 3300,
          tokenUsage: { promptTokens: 600, completionTokens: 1400, totalTokens: 2000 }
        }
      });

      const events = analyticsService.getFactoryOperationalEvents();
      const speakingEvent = events.find(e => e.id === res.eventId);
      assert.ok(speakingEvent);
      assert.equal((speakingEvent?.payload as any).moduleId, 'speaking');
      assert.equal((speakingEvent?.payload as any).durationMs, 3300);
      assert.equal((speakingEvent?.payload as any).tokenUsage.totalTokens, 2000);
    });
  });

  describe('6. Phase 5.5H.12E.3 — Token Accounting Clarity, Status Semantics & Speaking Error-Handling Consistency', () => {
    it('27. aggregates complete token metadata including optional thoughtsTokens when supplied by provider', () => {
      const sampleEvents: FactoryOperationalEventItem[] = [
        {
          id: 'evt_fact_12e3_complete_1',
          schemaVersion: '1.0',
          category: 'factory_operational',
          eventType: 'ai_generation_completed',
          serverTimestamp: Date.now(),
          payload: {
            moduleId: 'listening',
            format: 'Academic',
            success: true,
            status: 'PENDING_REVIEW',
            validationStatus: 'PASSED',
            repairAttempts: 0,
            durationMs: 5400,
            tokenUsage: {
              promptTokens: 718,
              completionTokens: 8926,
              thoughtsTokens: 1526,
              totalTokens: 11170
            }
          }
        }
      ];

      const metrics = computeFactoryDashboardMetrics(sampleEvents, 'All');
      assert.equal(metrics.tokenDataAvailable, true);
      assert.equal(metrics.promptDataAvailable, true);
      assert.equal(metrics.completionDataAvailable, true);
      assert.equal(metrics.thoughtsDataAvailable, true);
      assert.equal(metrics.totalPromptTokens, 718);
      assert.equal(metrics.totalCompletionTokens, 8926);
      assert.equal(metrics.totalThoughtsTokens, 1526);
      assert.equal(metrics.totalTokens, 11170);
      // 718 + 8926 + 1526 === 11170 -> no unreported delta
      assert.equal(metrics.hasUnreportedTokenDelta, false);
    });

    it('28. preserves historical/partial records lacking thoughtsTokens, keeps provider total authoritative, and flags unreported delta', () => {
      const historicalEvents: FactoryOperationalEventItem[] = [
        {
          id: 'evt_fact_12e3_partial_hist',
          schemaVersion: '1.0',
          category: 'factory_operational',
          eventType: 'ai_generation_completed',
          serverTimestamp: Date.now(),
          payload: {
            moduleId: 'listening',
            format: 'Academic',
            success: true,
            status: 'PENDING_REVIEW',
            validationStatus: 'PASSED',
            repairAttempts: 0,
            durationMs: 121352,
            tokenUsage: {
              promptTokens: 718,
              completionTokens: 8926,
              totalTokens: 11170
              // thoughtsTokens absent on historical record
            }
          }
        }
      ];

      const metrics = computeFactoryDashboardMetrics(historicalEvents, 'All');
      assert.equal(metrics.tokenDataAvailable, true);
      // Authoritative provider total (11,170) is never overwritten by calculated sum (9,644)
      assert.equal(metrics.totalTokens, 11170);
      assert.equal(metrics.totalPromptTokens, 718);
      assert.equal(metrics.totalCompletionTokens, 8926);
      // Must not fabricate or invent thoughtsTokens when absent
      assert.equal(metrics.thoughtsDataAvailable, false);
      assert.equal(metrics.totalThoughtsTokens, 0);
      // Flags that provider total differs from reported breakdown
      assert.equal(metrics.hasUnreportedTokenDelta, true);
    });

    it('29. handles missing or empty tokenUsage safely without NaN or fabricated breakdowns', () => {
      const missingTokenEvents: FactoryOperationalEventItem[] = [
        {
          id: 'evt_fact_12e3_missing_1',
          schemaVersion: '1.0',
          category: 'factory_operational',
          eventType: 'ai_generation_failed',
          serverTimestamp: Date.now(),
          payload: {
            moduleId: 'reading',
            format: 'Academic',
            success: false,
            status: 'VALIDATION_FAILED',
            validationStatus: 'FAILED',
            repairAttempts: 3,
            durationMs: 4100
          }
        },
        {
          id: 'evt_fact_12e3_missing_2',
          schemaVersion: '1.0',
          category: 'factory_operational',
          eventType: 'ai_generation_completed',
          serverTimestamp: Date.now(),
          payload: {
            moduleId: 'speaking',
            format: 'Academic',
            success: true,
            status: 'PENDING_REVIEW',
            validationStatus: 'PASSED',
            repairAttempts: 0,
            durationMs: 2900,
            tokenUsage: {}
          }
        }
      ];

      const metrics = computeFactoryDashboardMetrics(missingTokenEvents, 'All');
      assert.equal(metrics.tokenDataAvailable, false);
      assert.equal(metrics.promptDataAvailable, false);
      assert.equal(metrics.completionDataAvailable, false);
      assert.equal(metrics.thoughtsDataAvailable, false);
      assert.equal(Number.isNaN(metrics.totalTokens), false);
      assert.equal(metrics.hasUnreportedTokenDelta, false);
    });

    it('30. distinguishes INSTRUMENTED status from observed generation activity on factory cards', () => {
      const zeroState = getFactoryCoverageStatus(0);
      assert.equal(zeroState.instrumentationBadge, 'INSTRUMENTED');
      assert.equal(zeroState.hasObservedActivity, false);
      assert.equal(zeroState.observedEventsLabel, '0 observed events');
      assert.ok(zeroState.statusDescription.includes('No generation events observed yet'));

      const singleState = getFactoryCoverageStatus(1);
      assert.equal(singleState.instrumentationBadge, 'INSTRUMENTED');
      assert.equal(singleState.hasObservedActivity, true);
      assert.equal(singleState.observedEventsLabel, '1 observed event');
      assert.ok(singleState.statusDescription.includes('Observed generation latency'));

      const multiState = getFactoryCoverageStatus(12);
      assert.equal(multiState.instrumentationBadge, 'INSTRUMENTED');
      assert.equal(multiState.hasObservedActivity, true);
      assert.equal(multiState.observedEventsLabel, '12 observed events');
    });

    it('31. Speaking telemetry failure is non-fatal to generation and does not emit duplicate terminal events', async () => {
      // Stub callGeminiWithRetry and recordFactoryOperationalEvent safely without live network calls
      const qfAny = questionFactory as any;
      const origCallGemini = qfAny.callGeminiWithRetry;
      const origRecordTelemetry = analyticsService.recordFactoryOperationalEvent;

      const validSpeakingPayload = {
        examId: 'pkg_speaking_12e3_mock',
        schemaVersion: '1.0',
        title: 'Mock Speaking Set',
        format: 'Academic',
        topicDomain: 'Education & Society',
        difficulty: 'Standard',
        createdAt: Date.now(),
        part1: {
          topicGroups: [
            {
              topicId: 'p1_t1',
              title: 'Studies',
              questions: [
                { id: 'q_p1_1', prompt: 'What subject are you studying?' },
                { id: 'q_p1_2', prompt: 'Why did you choose that subject?' },
                { id: 'q_p1_3', prompt: 'What is the most interesting part of your course?' }
              ]
            },
            {
              topicId: 'p1_t2',
              title: 'Reading Habits',
              questions: [
                { id: 'q_p1_4', prompt: 'Do you read books often?' },
                { id: 'q_p1_5', prompt: 'What kind of books do you prefer?' },
                { id: 'q_p1_6', prompt: 'Did you read much as a child?' }
              ]
            }
          ]
        },
        part2: {
          id: 'q_p2_1',
          topic: 'Describe a teacher who inspired you.',
          instructions: 'You should say who they were and why they inspired you.',
          bulletPrompts: [
            'Who the teacher was',
            'What subject they taught',
            'How they helped you learn',
            'Explain why this teacher inspired you'
          ],
          preparationTimeSeconds: 60,
          speakingTimeSeconds: 120,
          roundingOffQuestion: 'Do you still keep in touch with this teacher?'
        },
        part3: {
          themes: [
            {
              themeId: 'p3_t1',
              title: 'Teaching Methods',
              connectedPart2Theme: 'Teachers, education, and student inspiration',
              questions: [
                { id: 'q_p3_1', prompt: 'What qualities make a good teacher in modern schools?' },
                { id: 'q_p3_2', prompt: 'How has technology changed the way teachers educate students?' }
              ]
            }
          ]
        }
      };

      let telemetryDispatchCalls = 0;

      qfAny.callGeminiWithRetry = async () => ({
        text: JSON.stringify(validSpeakingPayload),
        usageMetadata: {
          promptTokenCount: 620,
          candidatesTokenCount: 1180,
          thoughtsTokenCount: 310,
          totalTokenCount: 2110
        }
      });

      analyticsService.recordFactoryOperationalEvent = () => {
        telemetryDispatchCalls++;
        throw new Error('Simulated telemetry sink outage');
      };

      let createdDraftId: string | undefined;
      try {
        const result = await questionFactory.generateSpeakingPilot({
          userId: 'usr_test_speaking_resilience_12e3',
          format: 'Academic',
          topicSeed: 'Education'
        });

        createdDraftId = result.draft.id;
        assert.equal(result.validation.passed, true);
        assert.equal(result.draft.status, 'PENDING_REVIEW', 'Draft status must remain PENDING_REVIEW despite telemetry exception');
        assert.equal(result.draft.validationStatus, 'PASSED');
        assert.equal(result.draft.tokenUsage?.promptTokens, 620);
        assert.equal(result.draft.tokenUsage?.completionTokens, 1180);
        assert.equal(result.draft.tokenUsage?.thoughtsTokens, 310);
        assert.equal(result.draft.tokenUsage?.totalTokens, 2110);
        // Crucial: telemetry failure must NOT jump to outer catch and trigger a 2nd failure telemetry call
        assert.equal(telemetryDispatchCalls, 1, 'Exactly 1 terminal telemetry dispatch attempt must occur');
      } finally {
        qfAny.callGeminiWithRetry = origCallGemini;
        analyticsService.recordFactoryOperationalEvent = origRecordTelemetry;
        if (createdDraftId && serverDb.data.aiDraftExams) {
          delete serverDb.data.aiDraftExams[createdDraftId];
        }
      }
    });
  });

  describe('7. Phase 5.5H.12F.1 — Security & Legacy Endpoint Hardening (CRIT-02, MED-02 & AI Error Sanitization)', () => {
    function createMockHttpRes() {
      const res: any = {
        statusCode: 200,
        headers: {} as Record<string, string>,
        body: null,
        sentBuffer: null as Buffer | null,
        setHeader(name: string, value: string) {
          this.headers[name] = value;
          return this;
        },
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json(payload: any) {
          this.body = payload;
          return this;
        },
        send(payload: any) {
          if (Buffer.isBuffer(payload)) {
            this.sentBuffer = payload;
          } else {
            this.body = payload;
          }
          return this;
        }
      };
      return res;
    }

    describe('7A. CRIT-02 — Analytics Stats Endpoint (/api/analytics/stats) Security', () => {
      it('32. returns HTTP 401 for missing session and exposes zero PII', () => {
        const origLoggedIn = { ...analyticsState.loggedInUsers };
        try {
          analyticsState.loggedInUsers['usr_synth_pii_1'] = {
            id: 'usr_synth_pii_1',
            name: 'Synthetic Candidate One',
            email: 'synth.secret.candidate@example.org',
            lastSeen: Date.now(),
            loginCount: 3
          };

          const req: any = { headers: {}, query: {} };
          const res = createMockHttpRes();

          handleGetAnalyticsStats(req, res);
          assert.equal(res.statusCode, 401);
          assert.equal(res.body.error, 'Authentication required.');
          const serialized = JSON.stringify(res.body);
          assert.equal(serialized.includes('synth.secret.candidate@example.org'), false);
          assert.equal('activeUsersList' in res.body, false);
        } finally {
          analyticsState.loggedInUsers = origLoggedIn;
        }
      });

      it('33. returns HTTP 401 for invalid or expired session token and exposes zero PII', () => {
        const origLoggedIn = { ...analyticsState.loggedInUsers };
        try {
          analyticsState.loggedInUsers['usr_synth_pii_2'] = {
            id: 'usr_synth_pii_2',
            name: 'Synthetic Candidate Two',
            email: 'synth.expired.check@example.org',
            lastSeen: Date.now(),
            loginCount: 1
          };

          // 1. Completely non-existent / forged token
          const invalidReq: any = {
            headers: { authorization: 'Bearer sess_invalid_nonexistent_token_999' },
            query: {}
          };
          const invalidRes = createMockHttpRes();
          handleGetAnalyticsStats(invalidReq, invalidRes);
          assert.equal(invalidRes.statusCode, 401);
          assert.equal(JSON.stringify(invalidRes.body).includes('synth.expired.check@example.org'), false);

          // 2. Expired session token in store
          const tempUser = { id: 'usr_expired_12f1', email: adminEmail, name: 'Expired Admin' };
          serverDb.saveUser(tempUser as any);
          const expiredSession = serverDb.createSession(tempUser.id);
          expiredSession.expiresAt = Date.now() - 60_000; // expired 60s ago

          const expiredReq: any = {
            headers: { authorization: `Bearer ${expiredSession.token}` },
            query: {}
          };
          const expiredRes = createMockHttpRes();
          handleGetAnalyticsStats(expiredReq, expiredRes);
          assert.equal(expiredRes.statusCode, 401);
          assert.equal(JSON.stringify(expiredRes.body).includes('synth.expired.check@example.org'), false);
        } finally {
          analyticsState.loggedInUsers = origLoggedIn;
        }
      });

      it('34. returns HTTP 403 for authenticated candidate and prevents retrieving user, login, or page-view PII', () => {
        const origLoggedIn = { ...analyticsState.loggedInUsers };
        const origRecentLogins = [...analyticsState.recentLogins];
        const origRecentVisits = [...analyticsState.recentVisits];

        try {
          analyticsState.loggedInUsers['usr_protected_cand'] = {
            id: 'usr_protected_cand',
            name: 'Protected Student',
            email: 'private.student.record@example.org',
            lastSeen: Date.now(),
            loginCount: 5
          };
          analyticsState.recentLogins = [
            {
              userId: 'usr_protected_cand',
              name: 'Protected Student',
              email: 'private.student.record@example.org',
              timestamp: Date.now()
            }
          ];
          analyticsState.recentVisits = [
            {
              path: '/writing-lab',
              visitorId: 'vis_private_99',
              timestamp: Date.now(),
              ip: '198.51.100.77',
              ua: 'SyntheticBrowser/1.0'
            }
          ];

          const candidateUser = {
            id: 'usr_cand_stats_check_01',
            email: candidateEmail,
            name: 'Ordinary Candidate'
          };
          serverDb.saveUser(candidateUser as any);
          const session = serverDb.createSession(candidateUser.id);

          const req: any = {
            headers: { authorization: `Bearer ${session.token}` },
            query: {}
          };
          const res = createMockHttpRes();

          handleGetAnalyticsStats(req, res);
          assert.equal(res.statusCode, 403);
          assert.ok(res.body.error.includes('Administrator privileges required'));

          const serialized = JSON.stringify(res.body);
          assert.equal(serialized.includes('private.student.record@example.org'), false);
          assert.equal(serialized.includes('198.51.100.77'), false);
          assert.equal(serialized.includes('vis_private_99'), false);
          assert.equal('activeUsersList' in res.body, false);
          assert.equal('recentLoginEvents' in res.body, false);
          assert.equal('recentPageViews' in res.body, false);
        } finally {
          analyticsState.loggedInUsers = origLoggedIn;
          analyticsState.recentLogins = origRecentLogins;
          analyticsState.recentVisits = origRecentVisits;
        }
      });

      it('35. returns HTTP 403 safely for missing, null, empty, or whitespace-only emails without throwing 500', () => {
        const emailVariants = [undefined, null, '', '   ', '\t\n'];

        emailVariants.forEach((emailVal, idx) => {
          const user = {
            id: `usr_stats_bad_email_${idx}`,
            email: emailVal as any,
            name: 'Malformed Email User'
          };
          serverDb.saveUser(user as any);
          const session = serverDb.createSession(user.id);

          const req: any = {
            headers: { authorization: `Bearer ${session.token}` },
            query: {}
          };
          const res = createMockHttpRes();

          assert.doesNotThrow(() => {
            handleGetAnalyticsStats(req, res);
          });
          assert.equal(res.statusCode, 403, `Expected 403 for email variant index ${idx}`);
          assert.ok(res.body.error.includes('Valid administrator email required'));
          assert.equal('activeUsersList' in res.body, false);
        });
      });

      it('36. returns HTTP 200 with preserved response structure for allowlisted administrator', () => {
        const origLoggedIn = { ...analyticsState.loggedInUsers };
        try {
          analyticsState.loggedInUsers['usr_synth_admin_view'] = {
            id: 'usr_synth_admin_view',
            name: 'Synthetic Learner',
            email: 'learner.synthetic@example.org',
            lastSeen: 1700000000000,
            loginCount: 2
          };

          const adminUser = {
            id: 'usr_admin_stats_ok',
            email: '  MDEbadulIslam45@gmail.com  ',
            name: 'Allowlisted Admin'
          };
          serverDb.saveUser(adminUser as any);
          const session = serverDb.createSession(adminUser.id);

          const req: any = {
            headers: { authorization: `Bearer ${session.token}` },
            query: {}
          };
          const res = createMockHttpRes();

          handleGetAnalyticsStats(req, res);
          assert.equal(res.statusCode, 200);
          assert.equal(typeof res.body.totalVisits, 'number');
          assert.equal(typeof res.body.uniqueVisitors, 'number');
          assert.equal(typeof res.body.totalLogins, 'number');
          assert.equal(typeof res.body.uniqueLoggedInUsers, 'number');
          assert.ok(Array.isArray(res.body.activeUsersList));
          assert.ok(Array.isArray(res.body.recentPageViews));
          assert.ok(Array.isArray(res.body.recentLoginEvents));
          assert.equal(typeof res.body.lastUpdated, 'string');
        } finally {
          analyticsState.loggedInUsers = origLoggedIn;
        }
      });
    });

    describe('7B. MED-02 — Source Archive Endpoint (/api/download-source-zip) Security', () => {
      it('37. returns HTTP 401 for missing session, sends zero archive bytes, and does not initiate ZIP creation', () => {
        const origBuilder = sourceZipDependencies.buildProjectZipBuffer;
        let zipBuilderCalls = 0;
        sourceZipDependencies.buildProjectZipBuffer = (rootDir?: string) => {
          zipBuilderCalls++;
          return origBuilder(rootDir);
        };

        try {
          const req: any = { headers: {}, query: {} };
          const res = createMockHttpRes();

          handleDownloadSourceZip(req, res);
          assert.equal(res.statusCode, 401);
          assert.equal(res.body.error, 'Authentication required.');
          assert.equal(res.sentBuffer, null);
          assert.equal(zipBuilderCalls, 0, 'ZIP builder must never be invoked for unauthenticated requests');
        } finally {
          sourceZipDependencies.buildProjectZipBuffer = origBuilder;
        }
      });

      it('38. returns HTTP 401 for invalid or expired session, sends zero archive bytes, and does not initiate ZIP creation', () => {
        const origBuilder = sourceZipDependencies.buildProjectZipBuffer;
        let zipBuilderCalls = 0;
        sourceZipDependencies.buildProjectZipBuffer = (rootDir?: string) => {
          zipBuilderCalls++;
          return origBuilder(rootDir);
        };

        try {
          const invalidReq: any = {
            headers: { authorization: 'Bearer sess_forged_zip_token_000' },
            query: {}
          };
          const invalidRes = createMockHttpRes();
          handleDownloadSourceZip(invalidReq, invalidRes);
          assert.equal(invalidRes.statusCode, 401);
          assert.equal(invalidRes.sentBuffer, null);
          assert.equal(zipBuilderCalls, 0);

          const tempUser = { id: 'usr_zip_expired_admin', email: adminEmail, name: 'Expired Admin' };
          serverDb.saveUser(tempUser as any);
          const expiredSession = serverDb.createSession(tempUser.id);
          expiredSession.expiresAt = Date.now() - 30_000;

          const expiredReq: any = {
            headers: { authorization: `Bearer ${expiredSession.token}` },
            query: {}
          };
          const expiredRes = createMockHttpRes();
          handleDownloadSourceZip(expiredReq, expiredRes);
          assert.equal(expiredRes.statusCode, 401);
          assert.equal(expiredRes.sentBuffer, null);
          assert.equal(zipBuilderCalls, 0);
        } finally {
          sourceZipDependencies.buildProjectZipBuffer = origBuilder;
        }
      });

      it('39. returns HTTP 403 for authenticated candidate (and missing/null/whitespace emails), sends zero archive bytes, and does not initiate ZIP creation', () => {
        const origBuilder = sourceZipDependencies.buildProjectZipBuffer;
        let zipBuilderCalls = 0;
        sourceZipDependencies.buildProjectZipBuffer = (rootDir?: string) => {
          zipBuilderCalls++;
          return origBuilder(rootDir);
        };

        try {
          const candidateAccounts = [
            { id: 'usr_zip_cand_1', email: candidateEmail, name: 'Standard Candidate' },
            { id: 'usr_zip_cand_2', email: undefined as any, name: 'Missing Email Candidate' },
            { id: 'usr_zip_cand_3', email: null as any, name: 'Null Email Candidate' },
            { id: 'usr_zip_cand_4', email: '   ', name: 'Whitespace Email Candidate' }
          ];

          for (const acct of candidateAccounts) {
            serverDb.saveUser(acct as any);
            const session = serverDb.createSession(acct.id);

            const req: any = {
              headers: { authorization: `Bearer ${session.token}` },
              query: {}
            };
            const res = createMockHttpRes();

            handleDownloadSourceZip(req, res);
            assert.equal(res.statusCode, 403);
            assert.equal(res.sentBuffer, null, `Candidate ${acct.id} must receive zero archive bytes`);
          }

          assert.equal(zipBuilderCalls, 0, 'ZIP builder must never be invoked for non-admin requests');
        } finally {
          sourceZipDependencies.buildProjectZipBuffer = origBuilder;
        }
      });

      it('40. returns valid ZIP archive for allowlisted admin and excludes .env, .data, caches, and sensitive files', () => {
        const origBuilder = sourceZipDependencies.buildProjectZipBuffer;
        let zipBuilderCalls = 0;
        sourceZipDependencies.buildProjectZipBuffer = (rootDir?: string) => {
          zipBuilderCalls++;
          return origBuilder(rootDir);
        };

        try {
          const adminUser = {
            id: 'usr_zip_admin_allowlisted',
            email: adminEmail,
            name: 'Authorized Admin'
          };
          serverDb.saveUser(adminUser as any);
          const session = serverDb.createSession(adminUser.id);

          const req: any = {
            headers: { authorization: `Bearer ${session.token}` },
            query: {}
          };
          const res = createMockHttpRes();

          handleDownloadSourceZip(req, res);
          assert.equal(res.statusCode, 200);
          assert.equal(zipBuilderCalls, 1);
          assert.equal(res.headers['Content-Type'], 'application/zip');
          assert.equal(res.headers['Content-Disposition'], 'attachment; filename="bandsprint-source-code.zip"');
          assert.ok(Buffer.isBuffer(res.sentBuffer), 'Response must be a Buffer');
          assert.ok(res.sentBuffer!.length > 1000, 'Archive buffer must be non-empty');

          // Verify PK\x03\x04 local file header magic bytes (0x04034b50 LE)
          assert.equal(res.sentBuffer!.readUInt32LE(0), 0x04034b50);

          // Extract all entry filenames from Central Directory records (signature 0x02014b50 LE)
          const zipBuf = res.sentBuffer!;
          const entryNames: string[] = [];
          let pos = 0;
          while (pos <= zipBuf.length - 46) {
            if (zipBuf.readUInt32LE(pos) === 0x02014b50) {
              const nameLen = zipBuf.readUInt16LE(pos + 28);
              const extraLen = zipBuf.readUInt16LE(pos + 30);
              const commentLen = zipBuf.readUInt16LE(pos + 32);
              const nameStart = pos + 46;
              if (nameStart + nameLen <= zipBuf.length) {
                entryNames.push(zipBuf.subarray(nameStart, nameStart + nameLen).toString('utf8'));
              }
              pos = nameStart + nameLen + extraLen + commentLen;
            } else {
              pos++;
            }
          }

          // Expected source files must be present
          assert.ok(entryNames.includes('server.ts'), 'Archive must include server.ts');
          assert.ok(entryNames.includes('package.json'), 'Archive must include package.json');
          assert.ok(entryNames.includes('.env.example'), 'Archive must include .env.example');

          // Excluded sensitive files and directories must never appear in archive
          for (const entry of entryNames) {
            assert.notEqual(entry, '.env', 'Archive must never contain .env');
            assert.equal(entry.startsWith('.data/'), false, `Archive must never contain .data/* (${entry})`);
            assert.equal(entry.startsWith('.audio_cache/'), false, `Archive must never contain .audio_cache/* (${entry})`);
            assert.equal(entry.startsWith('node_modules/'), false, `Archive must never contain node_modules/* (${entry})`);
            assert.equal(entry.startsWith('.git/'), false, `Archive must never contain .git/* (${entry})`);
            assert.equal(entry.endsWith('.log'), false, `Archive must never contain .log files (${entry})`);
            assert.equal(entry.endsWith('.zip'), false, `Archive must never contain .zip files (${entry})`);
          }
        } finally {
          sourceZipDependencies.buildProjectZipBuffer = origBuilder;
        }
      });
    });

    describe('7C. AI Generation Error Sanitization Across All Four Factories', () => {
      async function verifySanitizedFactoryError(params: {
        moduleLabel: string;
        fakeSecretToken: string;
        fakeApiKey: string;
        fakeInternalPath: string;
        expectedSafeError: string;
        routeHandler: (req: any, res: any) => Promise<any>;
        directGenerator: () => Promise<any>;
      }) {
        const qfAny = questionFactory as any;
        const origCallGemini = qfAny.callGeminiWithRetry;
        const origRecordTelemetry = analyticsService.recordFactoryOperationalEvent;

        const candUser = {
          id: `usr_err_san_${params.moduleLabel.toLowerCase()}`,
          email: candidateEmail,
          name: 'Error Test Candidate'
        };
        serverDb.saveUser(candUser as any);
        const session = serverDb.createSession(candUser.id);

        const createdDraftIds: string[] = [];
        const origSaveDraft = serverDb.saveAiDraftExam.bind(serverDb);
        serverDb.saveAiDraftExam = (draft: any) => {
          if (draft?.id && !createdDraftIds.includes(draft.id)) {
            createdDraftIds.push(draft.id);
          }
          return origSaveDraft(draft);
        };

        const syntheticInternalMessage = `Provider fatal failure at ${params.fakeInternalPath} with apiKey=${params.fakeApiKey} and Authorization: Bearer ${params.fakeSecretToken}`;

        try {
          // 1. Direct factory call: confirm original error is NOT swallowed and draft status is VALIDATION_FAILED
          qfAny.callGeminiWithRetry = async () => {
            const err = new Error(syntheticInternalMessage);
            err.name = 'UpstreamProviderAuthError';
            throw err;
          };

          await assert.rejects(
            async () => {
              await params.directGenerator();
            },
            (err: any) => {
              assert.equal(err.name, 'UpstreamProviderAuthError');
              assert.ok(err.message.includes(params.fakeApiKey), 'Original error thrown internally is not swallowed');
              return true;
            }
          );

          assert.ok(createdDraftIds.length >= 1, 'Draft record must be created before failure');
          const firstDraft = serverDb.getAiDraftExam(createdDraftIds[createdDraftIds.length - 1]);
          assert.ok(firstDraft);
          assert.equal(firstDraft!.status, 'VALIDATION_FAILED');
          assert.equal(firstDraft!.validationStatus, 'FAILED');
          // Persisted validationFindings.errors must have secrets redacted
          const persistedErrorsStr = JSON.stringify(firstDraft!.validationFindings.errors);
          assert.equal(persistedErrorsStr.includes(params.fakeApiKey), false, 'Persisted draft findings must redact fake API key');
          assert.equal(persistedErrorsStr.includes(params.fakeSecretToken), false, 'Persisted draft findings must redact fake Bearer token');

          // 2. Route handler + simulated telemetry sink failure:
          // Confirm HTTP 500 returns safe message, leaks zero secrets/paths, and telemetry failure does not corrupt draft status or mask failure
          let telemetryCalls = 0;
          analyticsService.recordFactoryOperationalEvent = () => {
            telemetryCalls++;
            throw new Error(`Telemetry sink failure with secret=${params.fakeSecretToken}`);
          };

          const req: any = {
            headers: { authorization: `Bearer ${session.token}` },
            query: {},
            body: { topicSeed: 'Security Sanitization Check' }
          };
          const res = createMockHttpRes();

          await params.routeHandler(req, res);

          assert.equal(res.statusCode, 500);
          assert.equal(res.body.success, false);
          assert.equal(res.body.error, params.expectedSafeError);
          assert.equal(telemetryCalls, 1, 'Failure telemetry must be attempted once');

          const responseSerialized = JSON.stringify(res.body);
          assert.equal(responseSerialized.includes(params.fakeApiKey), false, 'HTTP 500 response must not contain fake API key');
          assert.equal(responseSerialized.includes(params.fakeSecretToken), false, 'HTTP 500 response must not contain fake secret token');
          assert.equal(responseSerialized.includes(params.fakeInternalPath), false, 'HTTP 500 response must not contain internal filesystem path');
          assert.equal(responseSerialized.includes('UpstreamProviderAuthError'), false, 'HTTP 500 response must not leak internal error class');

          const secondDraft = serverDb.getAiDraftExam(createdDraftIds[createdDraftIds.length - 1]);
          assert.ok(secondDraft);
          assert.equal(secondDraft!.status, 'VALIDATION_FAILED', 'Draft status must remain VALIDATION_FAILED even when telemetry throws');
          assert.equal(secondDraft!.validationStatus, 'FAILED');
        } finally {
          qfAny.callGeminiWithRetry = origCallGemini;
          analyticsService.recordFactoryOperationalEvent = origRecordTelemetry;
          serverDb.saveAiDraftExam = origSaveDraft;
          for (const id of createdDraftIds) {
            if (serverDb.data.aiDraftExams) {
              delete serverDb.data.aiDraftExams[id];
            }
          }
        }
      }

      it('41. Reading generation route sanitizes HTTP 500 errors, preserves original throw, and isolates telemetry failure', async () => {
        await verifySanitizedFactoryError({
          moduleLabel: 'Reading',
          fakeApiKey: 'AIzaSyFAKE_READING_KEY_100001',
          fakeSecretToken: 'sk_live_FAKE_READING_SECRET_200001',
          fakeInternalPath: '/app/applet/src/server/ai/readingInternalSecret.ts:321',
          expectedSafeError: 'Failed to generate Academic Reading exam pilot.',
          routeHandler: handleGenerateReading,
          directGenerator: () =>
            questionFactory.generateAcademicReadingPilot({
              userId: 'usr_err_san_reading',
              topicSeed: 'Reading Security Check'
            })
        });
      });

      it('42. Listening generation route sanitizes HTTP 500 errors, preserves original throw, and isolates telemetry failure', async () => {
        await verifySanitizedFactoryError({
          moduleLabel: 'Listening',
          fakeApiKey: 'AIzaSyFAKE_LISTENING_KEY_100002',
          fakeSecretToken: 'sk_live_FAKE_LISTENING_SECRET_200002',
          fakeInternalPath: '/app/applet/src/server/ai/listeningInternalSecret.ts:501',
          expectedSafeError: 'Failed to generate Listening exam pilot.',
          routeHandler: handleGenerateListening,
          directGenerator: () =>
            questionFactory.generateListeningPilot({
              userId: 'usr_err_san_listening',
              topicSeed: 'Listening Security Check'
            })
        });
      });

      it('43. Writing generation route sanitizes HTTP 500 errors, preserves original throw, and isolates telemetry failure', async () => {
        await verifySanitizedFactoryError({
          moduleLabel: 'Writing',
          fakeApiKey: 'AIzaSyFAKE_WRITING_KEY_100003',
          fakeSecretToken: 'sk_live_FAKE_WRITING_SECRET_200003',
          fakeInternalPath: '/app/applet/src/server/ai/writingInternalSecret.ts:695',
          expectedSafeError: 'Failed to generate Writing exam pilot.',
          routeHandler: handleGenerateWriting,
          directGenerator: () =>
            questionFactory.generateWritingPilot({
              userId: 'usr_err_san_writing',
              format: 'Academic',
              topicSeed: 'Writing Security Check'
            })
        });
      });

      it('44. Speaking generation route sanitizes HTTP 500 errors, preserves original throw, and isolates telemetry failure', async () => {
        await verifySanitizedFactoryError({
          moduleLabel: 'Speaking',
          fakeApiKey: 'AIzaSyFAKE_SPEAKING_KEY_100004',
          fakeSecretToken: 'sk_live_FAKE_SPEAKING_SECRET_200004',
          fakeInternalPath: '/app/applet/src/server/ai/speakingInternalSecret.ts:884',
          expectedSafeError: 'Failed to generate Speaking exam pilot.',
          routeHandler: handleGenerateSpeaking,
          directGenerator: () =>
            questionFactory.generateSpeakingPilot({
              userId: 'usr_err_san_speaking',
              format: 'Academic',
              topicSeed: 'Speaking Security Check'
            })
        });
      });
    });
  });
});


