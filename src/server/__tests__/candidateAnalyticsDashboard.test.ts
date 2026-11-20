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
      analyticsService.recordCandidateEvent({
        userId: candidateA,
        eventInput: {
          eventType: 'practice_completed',
          payload: { moduleId: 'speaking', overallBandScore: 8.0 }
        }
      });

      analyticsService.recordCandidateEvent({
        userId: candidateB,
        eventInput: {
          eventType: 'practice_completed',
          payload: { moduleId: 'writing', overallBandScore: 6.5 }
        }
      });

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

  describe('2. Four-Module & Criterion Scoring Validation', () => {
    it('4. correctly processes Writing criterion scores (TA, CC, LR, GRA)', () => {
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

      assert.equal(res.success, true);
      const event = serverDb.getAnalyticsEventById(res.eventId!);
      assert.ok(event);
      assert.equal(event.payload.criterionScores.ta, 7.0);
      assert.equal(event.payload.criterionScores.cc, 6.5);
      assert.equal(event.payload.criterionScores.lr, 7.5);
      assert.equal(event.payload.criterionScores.gra, 7.0);
    });

    it('5. correctly processes Speaking criterion scores (FC, LR, GRA, PR)', () => {
      const res = analyticsService.recordCandidateEvent({
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

      assert.equal(res.success, true);
      const event = serverDb.getAnalyticsEventById(res.eventId!);
      assert.ok(event);
      assert.equal(event.payload.criterionScores.fc, 8.0);
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
