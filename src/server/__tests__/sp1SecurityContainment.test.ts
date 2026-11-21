import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Server } from 'node:http';
import { app } from '../../../server.ts';
import { serverDb } from '../db.ts';
import { validateCandidateEvent, analyticsService } from '../analytics.ts';
import {
  mapDeepWritingResponseToDiagnostic,
  type WritingDiagnosticResult
} from '../../components/cdielts/CDIELTSWritingExamRoom.tsx';
import { fetchCandidateAnalyticsEvents } from '../../components/pages/CandidateAnalyticsPage.tsx';
import { sendBarnabyChatMessage } from '../../services/barnabyCompanionStore.ts';
import { SESSION_TOKEN_KEY } from '../../services/authService.ts';

const SAMPLE_VALID_ESSAY = [
  'Urban transportation systems play a decisive role in shaping both economic productivity and environmental sustainability across modern metropolitan regions.',
  'In many rapidly expanding cities, reliance on private automobiles has led to severe traffic congestion, elevated carbon emissions, and longer daily commutes for working residents.',
  'Investing in reliable electric buses, dedicated cycling corridors, and high-frequency commuter rail lines offers a practical alternative that lowers household transport costs while improving air quality.',
  'Although large-scale transit infrastructure requires substantial upfront public funding, the long-term gains in public health, urban livability, and regional connectivity clearly outweigh initial capital expenditure.'
].join(' ');

function makeFallbackPrecheck(): WritingDiagnosticResult {
  return {
    isValidAttempt: false,
    assessmentStatus: 'not_evaluated',
    evaluationSource: 'local-precheck',
    taskType: 2,
    wordCount: 84,
    targetMinWords: 250,
    overallBand: null,
    taScore: null,
    ccScore: null,
    lrScore: null,
    graScore: null,
    taSummary: 'Pending live AI evaluation.',
    ccSummary: 'Pending live AI evaluation.',
    lrSummary: 'Pending live AI evaluation.',
    graSummary: 'Pending live AI evaluation.',
    cefrLevel: 'Not Yet Assessed',
    lexicalDiversityRatio: 0.72,
    academicWordCount: 12,
    cohesiveDeviceCount: 4,
    complexSentenceCount: 3,
    annotations: [
      {
        id: 'ann_1',
        sentence: 'Urban transportation systems play a decisive role.',
        category: 'clean',
        errorTitle: 'Strong Opening',
        identifiedIssue: 'Clear topic sentence.',
        suggestedCorrection: 'Urban transportation systems play a decisive role.',
        rationaleEn: 'Clear academic opening.',
        rationaleBn: 'স্পষ্ট একাডেমিক সূচনা।'
      }
    ],
    upgradedModelParagraphs: [],
    strengths: [],
    improvements: []
  };
}

describe('SP-1 Security Containment & Authentication Hygiene', () => {
  const storePath = path.join(process.cwd(), '.data', 'sprint_store.json');
  let storeBackup: string | null = null;
  let server: Server | null = null;
  let baseUrl = '';

  const freeUserId = 'sp1_test_free_user';
  const proUserId = 'sp1_test_pro_user';
  let freeToken = '';
  let proToken = '';
  let originalGeminiKey: string | undefined;
  let originalApiKey: string | undefined;

  before(async () => {
    originalGeminiKey = process.env.GEMINI_API_KEY;
    originalApiKey = process.env.API_KEY;

    if (fs.existsSync(storePath)) {
      storeBackup = fs.readFileSync(storePath, 'utf-8');
    }

    const now = Date.now();
    serverDb.data.users[freeUserId] = {
      id: freeUserId,
      email: 'sp1.free@example.com',
      name: 'SP1 Free Candidate',
      role: 'user',
      createdAt: now,
      updatedAt: now
    };
    serverDb.data.users[proUserId] = {
      id: proUserId,
      email: 'sp1.pro@example.com',
      name: 'SP1 Pro Candidate',
      role: 'user',
      createdAt: now,
      updatedAt: now
    };
    serverDb.saveSubscription({
      userId: proUserId,
      planId: 'pro',
      status: 'active',
      cancelAtPeriodEnd: false,
      currentPeriodStart: now - 86_400_000,
      currentPeriodEnd: now + 29 * 86_400_000,
      updatedAt: now
    });

    freeToken = serverDb.createSession(freeUserId, 'sp1-test-agent', '127.0.0.1').token;
    proToken = serverDb.createSession(proUserId, 'sp1-test-agent', '127.0.0.1').token;

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server?.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalGeminiKey;
    if (originalApiKey === undefined) delete process.env.API_KEY;
    else process.env.API_KEY = originalApiKey;

    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }

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

  describe('1. POST /api/writing/deep-evaluate authentication & entitlement enforcement', () => {
    it('denies anonymous requests with HTTP 401, null scores, and actionable sign-in message', async () => {
      const res = await fetch(`${baseUrl}/api/writing/deep-evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          essayText: SAMPLE_VALID_ESSAY,
          taskType: 2,
          examFormat: 'Academic'
        })
      });

      assert.equal(res.status, 401);
      const body = await res.json();
      assert.equal(body.isValidAttempt, false);
      assert.equal(body.assessmentStatus, 'unavailable');
      assert.equal(body.authRequired, true);
      assert.equal(body.overallBand, null);
      assert.equal(body.taScore, null);
      assert.equal(body.ccScore, null);
      assert.equal(body.lrScore, null);
      assert.equal(body.graScore, null);
      assert.match(String(body.error || ''), /sign in/i);
    });

    it('rejects forged/invalid Bearer tokens with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/writing/deep-evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer invalid_forged_token_sp1'
        },
        body: JSON.stringify({
          essayText: SAMPLE_VALID_ESSAY,
          taskType: 2,
          examFormat: 'Academic'
        })
      });

      assert.equal(res.status, 401);
      const body = await res.json();
      assert.equal(body.overallBand, null);
      assert.equal(body.authRequired, true);
    });

    it('allows authenticated entitled users past auth/entitlement checks (and fails cleanly when Gemini key is absent without burning quota)', async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.API_KEY;

      const beforeUsage = serverDb.getDailyUsage(proUserId).writingEvaluations;
      const res = await fetch(`${baseUrl}/api/writing/deep-evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${proToken}`
        },
        body: JSON.stringify({
          essayText: SAMPLE_VALID_ESSAY,
          taskType: 2,
          examFormat: 'Academic'
        })
      });

      assert.equal(res.status, 503);
      const body = await res.json();
      assert.equal(body.isValidAttempt, false);
      assert.equal(body.assessmentStatus, 'unavailable');
      assert.equal(body.overallBand, null);
      assert.equal(serverDb.getDailyUsage(proUserId).writingEvaluations, beforeUsage);
    });

    it('enforces existing checkUserEntitlement writingEvaluationsPerDay limit with HTTP 403', async () => {
      // Exhaust free-tier daily quota (limit is 1/day)
      serverDb.incrementDailyUsage(freeUserId, 'writingEvaluations');

      const res = await fetch(`${baseUrl}/api/writing/deep-evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${freeToken}`
        },
        body: JSON.stringify({
          essayText: SAMPLE_VALID_ESSAY,
          taskType: 2,
          examFormat: 'Academic'
        })
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.isValidAttempt, false);
      assert.equal(body.assessmentStatus, 'unavailable');
      assert.equal(body.upgradeRequired, true);
      assert.equal(body.overallBand, null);
      assert.equal(body.taScore, null);
      assert.match(String(body.error || ''), /limit|upgrade|subscription/i);
    });
  });

  describe('2. Writing UI draft preservation on authentication/entitlement failure', () => {
    it('maps 401 and 403 responses to unavailable with null scores and draft-preservation guidance', () => {
      const precheck = makeFallbackPrecheck();

      const unauth = mapDeepWritingResponseToDiagnostic({
        httpOk: false,
        httpStatus: 401,
        data: {
          authRequired: true,
          error: 'Please sign in to run live AI Writing evaluation. Your essay draft is safely preserved.'
        },
        fallbackPrecheck: precheck
      });

      assert.equal(unauth.isValidAttempt, false);
      assert.equal(unauth.assessmentStatus, 'unavailable');
      assert.equal(unauth.overallBand, null);
      assert.equal(unauth.taScore, null);
      assert.equal(unauth.ccScore, null);
      assert.equal(unauth.lrScore, null);
      assert.equal(unauth.graScore, null);
      assert.equal(unauth.annotations.length, 1);
      assert.match(unauth.error || '', /sign in/i);
      assert.match(unauth.error || '', /preserved/i);

      const forbiddenFallback = mapDeepWritingResponseToDiagnostic({
        httpOk: false,
        httpStatus: 403,
        data: null,
        fallbackPrecheck: precheck
      });
      assert.equal(forbiddenFallback.overallBand, null);
      assert.match(forbiddenFallback.error || '', /draft is safely preserved/i);
    });

    it('persists essay draft before sending deep evaluation request and never clears task text on error', () => {
      const src = fs.readFileSync(
        path.join(process.cwd(), 'src/components/cdielts/CDIELTSWritingExamRoom.tsx'),
        'utf-8'
      );
      const fnStart = src.indexOf('const requestDeepWritingEvaluation = async');
      const fnEnd = src.indexOf('const executeEvaluation = async', fnStart);
      assert.ok(fnStart > 0 && fnEnd > fnStart);
      const body = src.slice(fnStart, fnEnd);

      assert.ok(body.includes('saveDraftToStorage();'), 'Must persist essay draft before API request');
      assert.ok(body.includes('headers.Authorization = `Bearer ${token}`'), 'Must forward Bearer session token');
      assert.ok(!body.includes("setTask1Text('')") && !body.includes("setTask2Text('')"), 'Must never clear essay draft on auth failure');
    });
  });

  describe('3. CandidateAnalyticsPage Bearer authentication & safe local fallback', () => {
    const localFallback = [
      {
        id: 'local_1',
        eventType: 'practice_completed' as const,
        serverTimestamp: Date.now() - 1000,
        payload: { moduleId: 'reading' as const, overallBandScore: 7.5 }
      }
    ];

    it('attaches Authorization Bearer header when stored session token exists and returns server events', async () => {
      let capturedUrl = '';
      let capturedHeaders: Record<string, string> | undefined;

      const serverEvents = [
        {
          id: 'srv_evt_1',
          eventType: 'practice_completed' as const,
          serverTimestamp: Date.now(),
          payload: { moduleId: 'listening' as const, overallBandScore: 8.0 }
        }
      ];

      const result = await fetchCandidateAnalyticsEvents({
        fallbackEvents: localFallback,
        getToken: () => 'tok_analytics_123',
        fetcher: (async (url: any, init?: any) => {
          capturedUrl = String(url);
          capturedHeaders = init?.headers as Record<string, string>;
          return {
            ok: true,
            status: 200,
            json: async () => ({ success: true, events: serverEvents })
          } as Response;
        }) as typeof fetch
      });

      assert.equal(capturedUrl, '/api/analytics/candidate/events?limit=200');
      assert.equal(capturedHeaders?.Authorization, 'Bearer tok_analytics_123');
      assert.equal(result.usedFallback, false);
      assert.equal(result.unauthorized, false);
      assert.deepEqual(result.events, serverEvents);
    });

    it('skips unauthenticated network calls when token is missing and preserves local fallback', async () => {
      let fetchCalled = false;
      const result = await fetchCandidateAnalyticsEvents({
        fallbackEvents: localFallback,
        getToken: () => null,
        fetcher: (async () => {
          fetchCalled = true;
          throw new Error('Should not be called without a session token');
        }) as typeof fetch
      });

      assert.equal(fetchCalled, false);
      assert.equal(result.usedFallback, true);
      assert.deepEqual(result.events, localFallback);
    });

    it('falls back safely to local history on HTTP 401 expired session', async () => {
      const result = await fetchCandidateAnalyticsEvents({
        fallbackEvents: localFallback,
        getToken: () => 'expired_token_xyz',
        fetcher: (async () => ({
          ok: false,
          status: 401,
          json: async () => ({ error: 'Authentication required.' })
        }) as Response) as typeof fetch
      });

      assert.equal(result.usedFallback, true);
      assert.equal(result.unauthorized, true);
      assert.deepEqual(result.events, localFallback);
    });

    it('live GET /api/analytics/candidate/events succeeds with Bearer token and denies unauthenticated calls', async () => {
      const unauthRes = await fetch(`${baseUrl}/api/analytics/candidate/events?limit=200`);
      assert.equal(unauthRes.status, 401);

      const authRes = await fetch(`${baseUrl}/api/analytics/candidate/events?limit=200`, {
        headers: { Authorization: `Bearer ${proToken}` }
      });
      assert.equal(authRes.status, 200);
      const data = await authRes.json();
      assert.equal(data.success, true);
      assert.ok(Array.isArray(data.events));
    });
  });

  describe('4. Barnaby tutor chat Bearer authentication & preserved companion behavior', () => {
    it('attaches stored-session Bearer token to POST /api/tutor/chat and preserves offline fallback on failure', async () => {
      const originalFetch = globalThis.fetch;
      const originalLocalStorage = (globalThis as any).localStorage;
      const storageMap = new Map<string, string>();
      storageMap.set(SESSION_TOKEN_KEY, 'tok_barnaby_session_456');

      (globalThis as any).localStorage = {
        getItem: (k: string) => storageMap.get(k) ?? null,
        setItem: (k: string, v: string) => storageMap.set(k, String(v)),
        removeItem: (k: string) => storageMap.delete(k)
      };

      const capturedHeaders: Array<Record<string, string>> = [];

      try {
        // Case A: Authenticated request succeeds
        globalThis.fetch = (async (_url: any, init?: any) => {
          capturedHeaders.push((init?.headers || {}) as Record<string, string>);
          return {
            ok: true,
            status: 200,
            json: async () => ({
              reply: 'Focus on cohesive topic sentences.',
              mood: 'happy',
              isAiPowered: true
            })
          } as Response;
        }) as typeof fetch;

        const okResult = await sendBarnabyChatMessage('How do I improve Task 2 cohesion?', '/practice/writing');
        assert.equal(capturedHeaders.length, 1);
        assert.equal(capturedHeaders[0].Authorization, 'Bearer tok_barnaby_session_456');
        assert.equal(okResult.replyMessage.sender, 'barnaby');
        assert.ok(okResult.replyMessage.text.includes('cohesive topic sentences'));
        assert.ok(okResult.state.messages.some((m) => m.sender === 'barnaby' && m.text.includes('cohesive topic sentences')));

        // Case B: Server returns error -> preserves graceful offline fallback
        globalThis.fetch = (async (_url: any, init?: any) => {
          capturedHeaders.push((init?.headers || {}) as Record<string, string>);
          return {
            ok: false,
            status: 503,
            json: async () => ({ error: 'Unavailable' })
          } as Response;
        }) as typeof fetch;

        const fallbackResult = await sendBarnabyChatMessage('Give me a reading strategy', '/practice/reading');
        assert.equal(capturedHeaders.length, 2);
        assert.equal(capturedHeaders[1].Authorization, 'Bearer tok_barnaby_session_456');
        assert.equal(fallbackResult.replyMessage.sender, 'barnaby');
        assert.equal(fallbackResult.replyMessage.badge, 'BARNABY GUIDE');

        // Case C: No stored token -> omits Authorization header cleanly
        storageMap.delete(SESSION_TOKEN_KEY);
        await sendBarnabyChatMessage('Quick tip please', '/');
        assert.equal(capturedHeaders.length, 3);
        assert.equal(capturedHeaders[2].Authorization, undefined);
      } finally {
        globalThis.fetch = originalFetch;
        (globalThis as any).localStorage = originalLocalStorage;
      }
    });
  });

  describe('5. Analytics score integrity & historical record preservation', () => {
    it('rejects unverified client-submitted Writing and Speaking scores over POST /api/analytics/events', async () => {
      const payloads = [
        {
          eventType: 'module_evaluated',
          payload: {
            moduleId: 'writing',
            format: 'Academic',
            overallBandScore: 8.5,
            criterionScores: { ta: 8.5, cc: 8.5, lr: 8.5, gra: 8.5 }
          }
        },
        {
          eventType: 'practice_completed',
          payload: {
            moduleId: 'writing',
            completionStatus: 'completed',
            overallBandScore: 8.0
          }
        },
        {
          eventType: 'module_evaluated',
          payload: {
            moduleId: 'speaking',
            overallBandScore: 9.0,
            criterionScores: { fc: 9.0, lr: 9.0, gra: 9.0, pr: 9.0 }
          }
        },
        {
          eventType: 'practice_completed',
          payload: {
            moduleId: 'speaking',
            completionStatus: 'completed',
            overallBandScore: 7.5
          }
        },
        {
          eventType: 'module_evaluated',
          payload: {
            moduleId: 'writing'
          }
        }
      ];

      for (const body of payloads) {
        const res = await fetch(`${baseUrl}/api/analytics/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${proToken}`
          },
          body: JSON.stringify(body)
        });
        assert.equal(res.status, 400, `Expected 400 for ${JSON.stringify(body)}`);
        const data = await res.json();
        assert.equal(data.success, false);
        assert.match(String(data.error || ''), /Unverified client-submitted Writing and Speaking scores/i);
      }
    });

    it('preserves non-scoring Writing and Speaking lifecycle events', async () => {
      const lifecyclePayloads = [
        { eventType: 'practice_started', payload: { moduleId: 'writing', format: 'Academic' } },
        { eventType: 'practice_exited', payload: { moduleId: 'writing', completionStatus: 'abandoned', durationSeconds: 180 } },
        { eventType: 'practice_completed', payload: { moduleId: 'speaking', completionStatus: 'completed', durationSeconds: 720 } }
      ];

      for (const body of lifecyclePayloads) {
        const res = await fetch(`${baseUrl}/api/analytics/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${proToken}`
          },
          body: JSON.stringify(body)
        });
        assert.equal(res.status, 201, `Expected 201 for ${JSON.stringify(body)}`);
        const data = await res.json();
        assert.equal(data.success, true);
        assert.ok(data.eventId);
      }
    });

    it('preserves valid objective Reading and Listening score events and rejects non-half-band malformed scores', async () => {
      const validReading = await fetch(`${baseUrl}/api/analytics/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${proToken}`
        },
        body: JSON.stringify({
          eventType: 'practice_completed',
          payload: {
            moduleId: 'reading',
            format: 'Academic',
            completionStatus: 'completed',
            overallBandScore: 7.5,
            questionCount: 40,
            answeredCount: 40,
            durationSeconds: 3200
          }
        })
      });
      assert.equal(validReading.status, 201);

      const validListening = await fetch(`${baseUrl}/api/analytics/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${proToken}`
        },
        body: JSON.stringify({
          eventType: 'module_evaluated',
          payload: {
            moduleId: 'listening',
            format: 'Academic',
            overallBandScore: 8.0,
            sectionScores: { sec1: 9, sec2: 8, sec3: 9, sec4: 9 },
            questionCount: 40,
            answeredCount: 40
          }
        })
      });
      assert.equal(validListening.status, 201);

      const malformed = validateCandidateEvent({
        eventType: 'practice_completed',
        payload: {
          moduleId: 'reading',
          overallBandScore: 7.37
        }
      });
      assert.equal(malformed.valid, false);
      assert.match(malformed.error || '', /0\.5 IELTS band increments/i);
    });

    it('does not alter or delete pre-existing historical analytics records', () => {
      const historicalId = 'evt_hist_sp1_preserve';
      const historicalRecord = {
        id: historicalId,
        schemaVersion: '1.0' as const,
        category: 'candidate' as const,
        eventType: 'module_evaluated' as const,
        userId: freeUserId,
        serverTimestamp: Date.now() - 86_400_000,
        payload: {
          moduleId: 'writing' as const,
          overallBandScore: 7.0,
          criterionScores: { ta: 7.0, cc: 7.0, lr: 7.0, gra: 7.0 }
        }
      };

      serverDb.saveAnalyticsEvent(historicalRecord);

      // Submit a rejected new writing score and verify historical record remains intact
      const rejected = analyticsService.recordCandidateEvent({
        userId: freeUserId,
        eventInput: {
          eventType: 'module_evaluated',
          payload: { moduleId: 'writing', overallBandScore: 9.0 }
        }
      });
      assert.equal(rejected.success, false);

      const events = analyticsService.getCandidateEvents(freeUserId, 50);
      const found = events.find((e) => e.id === historicalId);
      assert.ok(found, 'Pre-existing historical record must remain unaltered');
      assert.deepEqual(found.payload, historicalRecord.payload);
    });
  });
});
