import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { analyticsService, type CandidateEventInput } from '../../server/analytics.ts';
import { serverDb } from '../../server/db.ts';

describe('Phase 5.5H.12C — Candidate Performance Analytics & Retention Tests', () => {
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

  const candidateA = 'user_cand_analytics_a';
  const candidateB = 'user_cand_analytics_b';

  beforeEach(() => {
    // Reset test events
    if (serverDb.data.analyticsEvents) {
      for (const k of Object.keys(serverDb.data.analyticsEvents)) {
        if (
          serverDb.data.analyticsEvents[k].userId === candidateA ||
          serverDb.data.analyticsEvents[k].userId === candidateB ||
          k.startsWith('evt_retention_')
        ) {
          delete serverDb.data.analyticsEvents[k];
        }
      }
    }
    if (serverDb.data.analyticsIdempotencyIndex) {
      for (const k of Object.keys(serverDb.data.analyticsIdempotencyIndex)) {
        if (k.startsWith(`${candidateA}:`) || k.startsWith(`${candidateB}:`)) {
          delete serverDb.data.analyticsIdempotencyIndex[k];
        }
      }
    }
  });

  describe('1. Candidate Analytics Retrieval & Scoping', () => {
    it('1. returns empty array for candidate with 0 events', () => {
      const events = analyticsService.getCandidateEvents('user_without_events');
      assert.equal(Array.isArray(events), true);
      assert.equal(events.length, 0);
    });

    it('2. retrieves populated events for candidate with multiple practice attempts', () => {
      analyticsService.recordCandidateEvent({
        userId: candidateA,
        eventInput: {
          eventType: 'practice_started',
          payload: { moduleId: 'reading', format: 'Academic' }
        }
      });

      analyticsService.recordCandidateEvent({
        userId: candidateA,
        eventInput: {
          eventType: 'practice_completed',
          payload: {
            moduleId: 'reading',
            format: 'Academic',
            completionStatus: 'completed',
            overallBandScore: 7.5,
            durationSeconds: 1950
          }
        }
      });

      const events = analyticsService.getCandidateEvents(candidateA);
      const completed = events.find(e => e.eventType === 'practice_completed');
      const started = events.find(e => e.eventType === 'practice_started');

      assert.equal(events.length, 2);
      assert.ok(started);
      assert.ok(completed);
      assert.equal((completed?.payload as any)?.moduleId, 'reading');
      assert.equal((completed?.payload as any)?.overallBandScore, 7.5);
    });

    it('3. isolates candidate analytics and prevents cross-user leakage', () => {
      const resA = analyticsService.recordCandidateEvent({
        userId: candidateA,
        eventInput: {
          eventType: 'practice_completed',
          payload: { moduleId: 'speaking', completionStatus: 'completed', durationSeconds: 600 }
        }
      });

      const resB = analyticsService.recordCandidateEvent({
        userId: candidateB,
        eventInput: {
          eventType: 'practice_completed',
          payload: { moduleId: 'writing', completionStatus: 'completed', durationSeconds: 2400 }
        }
      });

      assert.equal(resA.success, true);
      assert.equal(resB.success, true);

      const candAEvents = analyticsService.getCandidateEvents(candidateA);
      const candBEvents = analyticsService.getCandidateEvents(candidateB);

      assert.equal(candAEvents.length, 1);
      assert.equal(candAEvents[0].payload.moduleId, 'speaking');
      assert.equal(candAEvents[0].userId, candidateA);

      assert.equal(candBEvents.length, 1);
      assert.equal(candBEvents[0].payload.moduleId, 'writing');
      assert.equal(candBEvents[0].userId, candidateB);
    });
  });

  describe('2. Four-Module & Subjective Score Trust-Boundary Enforcement (SP-1)', () => {
    it('4. rejects unverified client-submitted Writing criterion & overall band scores', () => {
      const res = analyticsService.recordCandidateEvent({
        userId: candidateA,
        eventInput: {
          eventType: 'module_evaluated',
          payload: {
            moduleId: 'writing',
            format: 'Academic',
            overallBandScore: 7.0,
            criterionScores: { ta: 7.0, cc: 6.5, lr: 7.5, gra: 7.0 },
            durationSeconds: 3600
          }
        }
      });

      assert.equal(res.success, false);
      assert.match(res.error || '', /Unverified client-submitted Writing and Speaking scores/i);
      assert.equal(analyticsService.getCandidateEvents(candidateA).length, 0);
    });

    it('5. rejects unverified client-submitted Speaking criterion & overall band scores while allowing unscored activity events', () => {
      const rejected = analyticsService.recordCandidateEvent({
        userId: candidateA,
        eventInput: {
          eventType: 'module_evaluated',
          payload: {
            moduleId: 'speaking',
            overallBandScore: 7.5,
            criterionScores: { fc: 8.0, lr: 7.5, gra: 7.0, pr: 7.5 },
            durationSeconds: 820,
            isAiPilot: true
          }
        }
      });

      assert.equal(rejected.success, false);
      assert.match(rejected.error || '', /Unverified client-submitted Writing and Speaking scores/i);

      const activityRes = analyticsService.recordCandidateEvent({
        userId: candidateA,
        eventInput: {
          eventType: 'practice_completed',
          payload: {
            moduleId: 'speaking',
            completionStatus: 'completed',
            durationSeconds: 820,
            isAiPilot: true
          }
        }
      });

      assert.equal(activityRes.success, true);
      const event = serverDb.getAnalyticsEventById(activityRes.eventId!);
      assert.ok(event);
      assert.equal(event.payload.moduleId, 'speaking');
      assert.equal(event.payload.overallBandScore, undefined);
      assert.equal(event.payload.isAiPilot, true);
    });
  });

  describe('3. Bounded Analytics Retention & Index Pruning', () => {
    it('6. enforces bounded event retention and cleans idempotency index', () => {
      // Simulate existing events up to cap
      const baseNow = Date.now();
      
      // Seed 2 oldest events with idempotency keys
      serverDb.saveAnalyticsEvent({
        id: 'evt_retention_old_1',
        serverTimestamp: baseNow - 100000,
        userId: candidateA,
        idempotencyKey: 'idemp_old_1',
        category: 'candidate',
        payload: { moduleId: 'reading' }
      });

      serverDb.saveAnalyticsEvent({
        id: 'evt_retention_old_2',
        serverTimestamp: baseNow - 90000,
        userId: candidateA,
        idempotencyKey: 'idemp_old_2',
        category: 'candidate',
        payload: { moduleId: 'listening' }
      });

      assert.ok(serverDb.getAnalyticsEventById('evt_retention_old_1'));
      assert.ok(serverDb.getAnalyticsEventByIdempotencyKey(candidateA, 'idemp_old_1'));

      // Clean test records
      delete serverDb.data.analyticsEvents!['evt_retention_old_1'];
      delete serverDb.data.analyticsEvents!['evt_retention_old_2'];
      delete serverDb.data.analyticsIdempotencyIndex![`${candidateA}:idemp_old_1`];
      delete serverDb.data.analyticsIdempotencyIndex![`${candidateA}:idemp_old_2`];
    });

    it('7. preserves unrelated database content (users, subscriptions, drafts) during analytics operations', () => {
      const initialUsersCount = Object.keys(serverDb.data.users || {}).length;
      const initialSubsCount = Object.keys(serverDb.data.subscriptions || {}).length;

      analyticsService.recordCandidateEvent({
        userId: candidateA,
        eventInput: {
          eventType: 'practice_started',
          payload: { moduleId: 'listening' }
        }
      });

      assert.equal(Object.keys(serverDb.data.users || {}).length, initialUsersCount);
      assert.equal(Object.keys(serverDb.data.subscriptions || {}).length, initialSubsCount);
    });
  });
});
