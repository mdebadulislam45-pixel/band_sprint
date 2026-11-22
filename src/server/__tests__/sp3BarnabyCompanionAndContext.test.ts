import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  BARNABY_AVATAR_STATES,
  BARNABY_STATE_META,
  BarnabyDragonAvatar,
  mapBarnabyMoodToAvatarState,
  mapExaminerStateToAvatarState,
  mapMascotMoodToAvatarState
} from '../../components/common/BarnabyDragonAvatar';
import { ChubbyMascotAvatar } from '../../components/common/ChubbyMascotAvatar';
import {
  BARNABY_CORE_PHILOSOPHY,
  BARNABY_STATE_EVENT,
  answerBarnabyMiniQuiz,
  clearBarnabyChat,
  feedBarnabyWordTreat,
  generateContextAwareCoachTip,
  getBondStage,
  getContextualWhisper,
  getStudentContextSnapshot,
  loadBarnabyState,
  petBarnaby,
  rateBarnabyMessage,
  sendBarnabyChatMessage,
  startBarnabyMiniQuiz,
  toggleBarnabyFreeRoam
} from '../../services/barnabyCompanionStore';
import { ACTIVE_USER_KEY, USERS_DIR_KEY } from '../../utils/userStorage';
import { DIAGNOSTIC_STORAGE_KEY } from '../../services/diagnosticResultStore';
import { addMistake, clearMistakes } from '../../utils/vaultStorage';

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

const ROOT = process.cwd();
const readSrc = (relPath: string) => fs.readFileSync(path.join(ROOT, relPath), 'utf8');

describe('SP-3 — Barnaby 2.5D Dragon Companion & Intelligent IELTS Mentor', () => {
  const originalLocalStorage = (globalThis as any).localStorage;
  const originalWindow = (globalThis as any).window;
  const originalFetch = globalThis.fetch;
  let dispatchedEvents: Array<{ type: string; detail: unknown }> = [];

  beforeEach(() => {
    dispatchedEvents = [];
    const mem = new MemoryStorage();
    (globalThis as any).localStorage = mem;
    (globalThis as any).window = {
      localStorage: mem,
      dispatchEvent: (ev: any) => {
        dispatchedEvents.push({ type: ev?.type, detail: ev?.detail });
        return true;
      },
      addEventListener: () => {},
      removeEventListener: () => {}
    };
  });

  afterEach(() => {
    (globalThis as any).localStorage = originalLocalStorage;
    (globalThis as any).window = originalWindow;
    globalThis.fetch = originalFetch;
  });

  describe('1. Unified Blue Dragon Identity Across All Companion & Studio Surfaces', () => {
    it('uses BarnabyDragonAvatar in FloatingBarnaby, AITutorWidget, ChubbyMascotAvatar, and Speaking Studio', () => {
      const floatingSrc = readSrc('src/components/common/FloatingBarnaby.tsx');
      const widgetSrc = readSrc('src/components/home/AITutorWidget.tsx');
      const mascotSrc = readSrc('src/components/common/ChubbyMascotAvatar.tsx');
      const contextualSrc = readSrc('src/components/common/ContextualAITutor.tsx');
      const studioSrc = readSrc('src/components/speaking/CuteChubbyExaminerAvatar.tsx');
      const registrySrc = readSrc('src/config/avatarReferenceRegistry.ts');

      assert.match(floatingSrc, /import\s*\{[\s\S]*BarnabyDragonAvatar[\s\S]*\}\s*from\s*'\.\/BarnabyDragonAvatar'/);
      assert.match(widgetSrc, /import\s*\{[\s\S]*BarnabyDragonAvatar[\s\S]*\}\s*from\s*'\.\.\/common\/BarnabyDragonAvatar'/);
      assert.match(mascotSrc, /import\s*\{[\s\S]*BarnabyDragonAvatar[\s\S]*\}\s*from\s*'\.\/BarnabyDragonAvatar'/);
      assert.match(studioSrc, /import\s*\{[\s\S]*BarnabyDragonAvatar[\s\S]*\}\s*from\s*'\.\.\/common\/BarnabyDragonAvatar'/);

      // Legacy anime-boy Barnaby drawing must be removed from ChubbyMascotAvatar and Speaking Studio Barnaby branch
      assert.doesNotMatch(mascotSrc, /barnabyBoySkin|barnabyBoyHair|anime boy/i);
      assert.doesNotMatch(studioSrc, /barnaby-reference-anime-rig|CUTE CHUBBY ANIME BOY/i);

      // ContextualAITutor wires real TTS audio playback state into ChubbyMascotAvatar
      assert.match(contextualSrc, /<ChubbyMascotAvatar[^>]*isSpeaking=\{isPlayingAudio\}/);

      // Visual reference registry reflects sky-blue baby dragon and core philosophy
      assert.match(registrySrc, /sky-blue baby dragon/i);
      assert.match(registrySrc, /become better than yesterday/i);
    });

    it('preserves speaker_barnaby voice routing across FloatingBarnaby, AITutorWidget, ContextualAITutor, and Speaking Studio', () => {
      const floatingSrc = readSrc('src/components/common/FloatingBarnaby.tsx');
      const widgetSrc = readSrc('src/components/home/AITutorWidget.tsx');
      const contextualSrc = readSrc('src/components/common/ContextualAITutor.tsx');
      const registrySrc = readSrc('src/config/avatarReferenceRegistry.ts');

      assert.match(floatingSrc, /speakerId:\s*'speaker_barnaby'/);
      assert.match(widgetSrc, /speakerId:\s*'speaker_barnaby'/);
      assert.match(contextualSrc, /'speaker_barnaby'/);
      assert.match(registrySrc, /speakerId:\s*'speaker_barnaby'/);
    });
  });

  describe('2. All 10 Character States, Strict TTS Mouth Sync & Pause / Reduced-Motion Safety', () => {
    it('defines and renders all 10 required expressive states with distinct state attributes', () => {
      const expectedStates = [
        'idle',
        'greeting',
        'listening',
        'thinking',
        'speaking',
        'teaching',
        'celebrating',
        'encouraging',
        'correcting',
        'sleeping'
      ];
      assert.deepEqual([...BARNABY_AVATAR_STATES], expectedStates);

      const start = performance.now();
      for (const st of BARNABY_AVATAR_STATES) {
        assert.ok(BARNABY_STATE_META[st]?.label, `Missing metadata label for ${st}`);
        const html = renderToStaticMarkup(
          React.createElement(BarnabyDragonAvatar, {
            state: st,
            isSpeaking: st === 'speaking'
          })
        );
        assert.match(html, new RegExp(`data-avatar-state="${st}"`));
        assert.match(html, /data-character="barnaby-dragon"/);
        // Verify lightweight SVG structure (no heavy mesh/canvas/Three.js nodes)
        assert.doesNotMatch(html, /<canvas|<webgl/i);
      }
      const elapsedMs = performance.now() - start;
      // 10 SSR renders of lightweight SVG should easily finish in well under 250ms
      assert.ok(elapsedMs < 250, `Expected lightweight 10-state render < 250ms, got ${elapsedMs.toFixed(1)}ms`);
    });

    it('strictly gates speaking mouth animation on actual TTS isSpeaking === true', () => {
      // Even if state="speaking" is passed with isSpeaking=false, mouth must NOT run active speech animation
      const silentHtml = renderToStaticMarkup(
        React.createElement(BarnabyDragonAvatar, {
          state: 'speaking',
          isSpeaking: false
        })
      );
      assert.match(silentHtml, /data-is-speaking="false"/);
      assert.doesNotMatch(silentHtml, /data-mouth-state="speaking-active"/);
      assert.doesNotMatch(silentHtml, /barnaby-rig-speak-jaw/);

      // When real TTS is playing (isSpeaking=true, not paused), speaking mouth activates
      const speakingHtml = renderToStaticMarkup(
        React.createElement(BarnabyDragonAvatar, {
          state: 'idle',
          isSpeaking: true
        })
      );
      assert.match(speakingHtml, /data-avatar-state="speaking"/);
      assert.match(speakingHtml, /data-is-speaking="true"/);
      assert.match(speakingHtml, /data-mouth-state="speaking-active"/);
      assert.match(speakingHtml, /barnaby-rig-speak-jaw/);

      // When paused=true (e.g. exam pause), autonomous & speech animation pauses cleanly
      const pausedHtml = renderToStaticMarkup(
        React.createElement(BarnabyDragonAvatar, {
          state: 'speaking',
          isSpeaking: true,
          paused: true
        })
      );
      assert.match(pausedHtml, /data-paused="true"/);
      assert.match(pausedHtml, /barnaby-anim-paused/);
      assert.doesNotMatch(pausedHtml, /data-mouth-state="speaking-active"/);
    });

    it('renders unified blue dragon through ChubbyMascotAvatar and maps all companion/studio states', () => {
      const html = renderToStaticMarkup(
        React.createElement(ChubbyMascotAvatar, { mood: 'thinking', isSpeaking: false, size: 'md' })
      );
      assert.match(html, /data-testid="barnaby-companion-avatar"/);
      assert.match(html, /data-character="barnaby-dragon"/);
      assert.match(html, /data-avatar-state="thinking"/);
      assert.match(html, /data-is-speaking="false"/);

      assert.equal(mapBarnabyMoodToAvatarState('sleepy'), 'sleeping');
      assert.equal(mapBarnabyMoodToAvatarState('happy', { isSpeaking: true }), 'speaking');
      assert.equal(mapBarnabyMoodToAvatarState('happy', { isCorrecting: true }), 'correcting');
      assert.equal(mapBarnabyMoodToAvatarState('proud'), 'celebrating');
      assert.equal(mapBarnabyMoodToAvatarState('curious'), 'teaching');
      assert.equal(mapBarnabyMoodToAvatarState('petted'), 'encouraging');
      assert.equal(mapBarnabyMoodToAvatarState('playful'), 'greeting');

      assert.equal(mapMascotMoodToAvatarState('listening'), 'listening');
      assert.equal(mapMascotMoodToAvatarState('surprise'), 'correcting');
      assert.equal(mapMascotMoodToAvatarState('idle', { isSpeaking: true }), 'speaking');

      assert.equal(mapExaminerStateToAvatarState('listening'), 'listening');
      assert.equal(mapExaminerStateToAvatarState('processing'), 'thinking');
      assert.equal(mapExaminerStateToAvatarState('completed'), 'celebrating');
      assert.equal(mapExaminerStateToAvatarState('paused'), 'sleeping');
      assert.equal(mapExaminerStateToAvatarState('error'), 'correcting');
      assert.equal(mapExaminerStateToAvatarState('idle', { isSpeaking: true }), 'speaking');
    });

    it('enforces GPU-composited CSS animations, prefers-reduced-motion, zero Three.js, and responsive mobile bounds', () => {
      const css = readSrc('src/index.css');
      const avatarSrc = readSrc('src/components/common/BarnabyDragonAvatar.tsx');
      const floatingSrc = readSrc('src/components/common/FloatingBarnaby.tsx');
      const widgetSrc = readSrc('src/components/home/AITutorWidget.tsx');

      // Zero Three.js or Sprint3DStudio imports in Barnaby stack
      for (const src of [avatarSrc, floatingSrc, widgetSrc]) {
        assert.doesNotMatch(src, /from\s+['"]three['"]|Sprint3DStudio/i);
      }

      // FloatingBarnaby uses GPU translate3d positioning instead of layout-triggering left/top transitions
      assert.match(floatingSrc, /translate3d\(\$\{pos\.x\}px,\s*\$\{pos\.y\}px,\s*0\)/);
      assert.match(floatingSrc, /visibilitychange/);
      assert.match(floatingSrc, /prefers-reduced-motion: reduce/);
      // Mobile 360-430px safe responsive drawer sizing
      assert.match(floatingSrc, /w-\[calc\(100vw-1rem\)\]/);

      // CSS reduced-motion disables all Barnaby rig keyframes and .barnaby-anim-paused pauses playback
      assert.match(css, /\.barnaby-anim-paused/);
      assert.match(css, /animation-play-state:\s*paused\s*!important/);
      assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.barnaby-rig-breathe[\s\S]*\.barnaby-rig-speak-jaw[\s\S]*animation:\s*none\s*!important/);
    });
  });

  describe('3. Intelligent Student Context, Score Honesty & Per-User Isolation', () => {
    it('never invents band scores or claims absent weaknesses for a brand-new student', () => {
      const ctx = getStudentContextSnapshot('/practice/reading');

      assert.equal(ctx.latestVerifiedOverallBand, null);
      assert.equal(ctx.completedFullMockCount, 0);
      assert.equal(ctx.skillBands.listening, null);
      assert.equal(ctx.skillBands.reading, null);
      assert.equal(ctx.skillBands.writing, null);
      assert.equal(ctx.skillBands.speaking, null);
      assert.equal(ctx.weakestSkill, null);
      assert.equal(ctx.weakestSkillSource, 'none');
      assert.equal(ctx.recurringMistakePattern, null);
      assert.equal(ctx.currentActivity, 'Reading Practice');

      const coach = generateContextAwareCoachTip(ctx);
      assert.match(coach.text, /No verified IELTS score/i);
      assert.ok(coach.text.includes(BARNABY_CORE_PHILOSOPHY));
      // Must NOT falsely claim the student struggles with TFNG when vault is empty
      assert.doesNotMatch(coach.text, /True\s*\/\s*False|TFNG/i);
    });

    it('strictly distinguishes practice diagnostic estimates from verified Full Mock scores', () => {
      localStorage.setItem(
        DIAGNOSTIC_STORAGE_KEY,
        JSON.stringify({
          id: 'diag_1',
          createdAt: Date.now(),
          targetBand: 7.5,
          examDate: '2027-01-15',
          dailyMinutes: 30,
          examType: 'Academic',
          scores: { listening: 6.5, reading: 6.0, writing: 5.5, speaking: 6.0, overall: 6.0 },
          correct: { listening: 26, reading: 24 },
          weakest: 'writing',
          writingWords: 220,
          speakingRecorded: true
        })
      );

      const ctx = getStudentContextSnapshot('/');
      assert.equal(ctx.latestVerifiedOverallBand, null);
      assert.equal(ctx.diagnosticEstimate?.overall, 6.0);
      assert.equal(ctx.weakestSkill, 'writing');
      assert.equal(ctx.weakestSkillSource, 'diagnostic_estimate');

      const coach = generateContextAwareCoachTip(ctx);
      assert.match(coach.text, /practice diagnostic estimate/i);
      assert.match(coach.text, /not a verified Full Mock/i);
      assert.equal(coach.suggestedAction.route, '/practice/writing');
    });

    it('uses genuine verified exam history and recurring Mistake Vault patterns accurately', () => {
      const studentA = {
        id: 'student_alpha',
        name: 'Amina Rahman',
        email: 'amina@example.com',
        createdAt: Date.now() - 86400_000,
        progress: {
          completedModules: ['beginner'],
          targetBand: 8.0,
          targetCountry: 'United Kingdom',
          intendedFormat: 'Academic',
          streakDays: 4,
          lastActiveDate: '2026-11-21',
          wordsWrittenTotal: 650,
          examHistory: [
            {
              id: 'mock_verified_1',
              timestamp: Date.now() - 10_000,
              examType: 'full_mock',
              examTitle: 'Practice Set 16',
              overallBand: 7.0,
              listeningBand: 7.5,
              readingBand: 7.0,
              writingBand: 6.0,
              speakingBand: 7.5,
              wordCount: 460,
              writingTasksCompleted: 2,
              totalQuestions: 40,
              completedSkills: {
                listening: true,
                reading: true,
                writing: true,
                speaking: true
              }
            },
            // Incomplete newer attempt must NEVER overwrite verified scores
            {
              id: 'mock_incomplete_2',
              timestamp: Date.now(),
              examType: 'incomplete_mock',
              examTitle: 'Practice Set 17',
              overallBand: 0,
              listeningBand: null,
              readingBand: null,
              writingBand: null,
              speakingBand: null
            }
          ]
        }
      };

      const studentB = {
        id: 'student_beta',
        name: 'Karim Hasan',
        email: 'karim@example.com',
        createdAt: Date.now() - 86400_000,
        progress: {
          completedModules: ['beginner'],
          targetBand: 6.5,
          targetCountry: 'Canada',
          intendedFormat: 'General Training',
          streakDays: 1,
          lastActiveDate: '2026-11-21',
          wordsWrittenTotal: 0,
          examHistory: []
        }
      };

      localStorage.setItem(USERS_DIR_KEY, JSON.stringify([studentA, studentB]));
      localStorage.setItem(ACTIVE_USER_KEY, studentA.id);

      const ctxA = getStudentContextSnapshot('/progress');
      assert.equal(ctxA.userId, 'student_alpha');
      assert.equal(ctxA.userName, 'Amina');
      assert.equal(ctxA.latestVerifiedOverallBand, 7.0);
      assert.equal(ctxA.completedFullMockCount, 1);
      assert.equal(ctxA.skillBands.writing, 6.0);
      assert.equal(ctxA.weakestSkill, 'writing');
      assert.equal(ctxA.weakestSkillSource, 'verified_history');

      const coachVerified = generateContextAwareCoachTip(ctxA);
      assert.match(coachVerified.text, /Band 7\.0/);
      assert.match(coachVerified.text, /Writing is currently your lowest verified skill \(Band 6\.0\)/);
      assert.equal(coachVerified.suggestedAction.route, '/practice/writing');

      // Now add real unresolved TFNG mistakes to Vault and verify targeted coaching triggers
      clearMistakes();
      addMistake({
        module: 'reading',
        title: 'TFNG Trap 1',
        questionType: 'True / False / Not Given',
        userAnswer: 'TRUE',
        correctAnswer: 'FALSE',
        explanation: 'Passage contradicts claim.'
      });
      addMistake({
        module: 'reading',
        title: 'TFNG Trap 2',
        questionType: 'True / False / Not Given',
        userAnswer: 'FALSE',
        correctAnswer: 'NOT GIVEN',
        explanation: 'Not mentioned in passage.'
      });

      const ctxWithTfng = getStudentContextSnapshot('/practice/reading');
      assert.equal(ctxWithTfng.recurringMistakePattern?.category, 'True / False / Not Given');
      assert.equal(ctxWithTfng.recurringMistakePattern?.count, 2);

      const tfngTip = generateContextAwareCoachTip(ctxWithTfng);
      assert.match(tfngTip.text, /2 unresolved True \/ False \/ Not Given items/);
      assert.match(tfngTip.text, /FALSE means the passage contradicts/);
      assert.equal(tfngTip.suggestedAction.route, '/learn/vault');

      const whisper = getContextualWhisper('/home', ctxWithTfng);
      assert.match(whisper.text, /2 unresolved True \/ False \/ Not Given items/);

      // Switch to studentB: strict per-user isolation must NOT leak studentA's verified band or companion state
      petBarnaby();
      const stateA = loadBarnabyState('/');
      assert.equal(stateA.petsCount, 1);

      localStorage.setItem(ACTIVE_USER_KEY, studentB.id);
      const ctxB = getStudentContextSnapshot('/');
      assert.equal(ctxB.userId, 'student_beta');
      assert.equal(ctxB.userName, 'Karim');
      assert.equal(ctxB.latestVerifiedOverallBand, null);
      assert.equal(ctxB.completedFullMockCount, 0);
      assert.equal(ctxB.skillBands.writing, null);
      assert.equal(ctxB.examMode, 'General Training');

      const stateB = loadBarnabyState('/');
      assert.equal(stateB.petsCount, 0);
    });
  });

  describe('4. Preservation of Existing Companion Features & Authenticated Chat', () => {
    it('preserves Bond XP, Pet, Word Treats, 15s Trap Quiz, Ratings, Free Roam, and BARNABY_STATE_EVENT sync', () => {
      const initial = loadBarnabyState('/');
      assert.equal(initial.bondXp, 10);
      assert.equal(getBondStage(initial.bondXp).level, 1);

      const afterPet = petBarnaby();
      assert.equal(afterPet.state.bondXp, 15);
      assert.equal(afterPet.state.petsCount, 1);

      const afterTreat = feedBarnabyWordTreat();
      assert.equal(afterTreat.state.bondXp, 25);
      assert.equal(afterTreat.state.treatsFed, 1);
      assert.ok(afterTreat.treat.word.length > 0);

      const quizStart = startBarnabyMiniQuiz();
      assert.ok(quizStart.message.quiz);
      const quizAnswer = answerBarnabyMiniQuiz(
        quizStart.message.id,
        quizStart.message.quiz!.correctIndex
      );
      assert.equal(quizAnswer.isCorrect, true);
      assert.equal(quizAnswer.state.bondXp, 40);
      assert.equal(quizAnswer.state.quizzesSolved, 1);

      const rated = rateBarnabyMessage(afterTreat.message.id, 'up');
      assert.equal(rated.bondXp, 43);

      const toggled = toggleBarnabyFreeRoam();
      assert.equal(toggled.freeRoam, false);

      const cleared = clearBarnabyChat('/');
      assert.equal(cleared.messages.length, 1);
      assert.ok(cleared.messages[0].text.includes(BARNABY_CORE_PHILOSOPHY));

      assert.ok(
        dispatchedEvents.some((ev) => ev.type === BARNABY_STATE_EVENT),
        'Expected BARNABY_STATE_EVENT to be dispatched for cross-widget sync'
      );
    });

    it('preserves SP-1 Bearer token and sends enriched honest context to /api/tutor/chat', async () => {
      localStorage.setItem('ielts_session_token_v2', 'sp3_test_bearer_token');
      let capturedAuth = '';
      let capturedBody: any = null;

      globalThis.fetch = (async (_url: any, init: any) => {
        capturedAuth = init?.headers?.Authorization || '';
        capturedBody = JSON.parse(init?.body || '{}');
        return {
          ok: true,
          status: 200,
          json: async () => ({
            reply: 'Let us tighten your paragraph topic sentences together.',
            mood: 'curious',
            isAiPowered: true
          })
        } as any;
      }) as typeof fetch;

      const { replyMessage } = await sendBarnabyChatMessage('What should I focus on next?', '/practice/writing');

      assert.equal(capturedAuth, 'Bearer sp3_test_bearer_token');
      assert.equal(capturedBody.persona, 'lexical_barnaby');
      assert.equal(capturedBody.model, undefined); // Preserves SP-2 server-owned model policy
      assert.equal(capturedBody.context.latestVerifiedOverallBand, null);
      assert.equal(capturedBody.context.currentActivity, 'Writing Studio');
      assert.equal(replyMessage.badge, 'BARNABY AI TUTOR');

      // Verify server.ts embeds Barnaby's core philosophy and honest score rules
      const serverSrc = readSrc('server.ts');
      assert.ok(serverSrc.includes(BARNABY_CORE_PHILOSOPHY));
      assert.match(serverSrc, /Never invent or fabricate an IELTS band score/);
    });
  });

  describe('5. SP-3.1 — Dashboard Full-Body Dragon Presentation & Framing', () => {
    it('renders full-body dragon anatomy (legs, clawed feet, hoodie, belly, wings, tail) without circular clipping', () => {
      const fullHtml = renderToStaticMarkup(
        React.createElement(BarnabyDragonAvatar, {
          variant: 'full',
          framed: 'none',
          size: 'studio',
          state: 'idle',
          isSpeaking: false,
          testId: 'dashboard-barnaby-avatar'
        })
      );

      assert.match(fullHtml, /data-variant="full"/);
      assert.match(fullHtml, /data-anatomy="full-body"/);
      assert.match(fullHtml, /data-anatomy-part="legs-and-feet"/);
      assert.match(fullHtml, /data-anatomy-part="hoodie-and-belly"/);
      assert.match(fullHtml, /data-anatomy-part="arms-and-paws"/);
      assert.match(fullHtml, /data-anatomy-part="tail"/);
      assert.match(fullHtml, /viewBox="-18 6 244 256"/);
      assert.match(fullHtml, /BandSprint/);
      assert.match(fullHtml, /overflow-visible/);
      assert.doesNotMatch(fullHtml, /rounded-full overflow-hidden/);
      assert.doesNotMatch(fullHtml, /data-mouth-state="speaking-active"/);

      // Verify TTS speaking gates mouth animation in full-body variant too
      const fullSpeakingHtml = renderToStaticMarkup(
        React.createElement(BarnabyDragonAvatar, {
          variant: 'full',
          framed: 'none',
          state: 'idle',
          isSpeaking: true
        })
      );
      assert.match(fullSpeakingHtml, /data-is-speaking="true"/);
      assert.match(fullSpeakingHtml, /data-mouth-state="speaking-active"/);
    });

    it('renders Barnaby as an independent floating full-body companion rather than boxed inside a HomeDashboard card', async () => {
      const { HomeDashboard } = await import('../../components/HomeDashboard');
      const dashHtml = renderToStaticMarkup(
        React.createElement(HomeDashboard, {
          user: null,
          onNavigate: () => {},
          onShowToast: () => {},
          onOpenBandModal: () => {}
        })
      );

      // Barnaby must NOT be trapped inside a static HomeDashboard card
      assert.doesNotMatch(dashHtml, /data-testid="dashboard-barnaby-section"/);
      assert.doesNotMatch(dashHtml, /data-testid="dashboard-barnaby-avatar"/);

      // FloatingBarnaby renders the unclipped full-body dragon in an independent floating layer across the Dashboard too
      const floatingSrc = readSrc('src/components/common/FloatingBarnaby.tsx');
      assert.match(floatingSrc, /data-testid="barnaby-floating-layer"/);
      assert.match(floatingSrc, /variant="full"/);
      assert.match(floatingSrc, /framed="none"/);
      assert.match(floatingSrc, /speakerId:\s*'speaker_barnaby'/);
      assert.match(floatingSrc, /barnaby-float-open/);
      assert.doesNotMatch(floatingSrc, /!isDashboardRoute &&/);
    });
  });
});

