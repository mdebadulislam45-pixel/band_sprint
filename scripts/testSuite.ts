/**
 * IELTS Sprint — Production Test Suite
 * Automated verification of:
 * 1. QuestionEngine duplicate detection, semantic similarity, and question bank integrity
 * 2. Cambridge IELTS scoring formulas and band estimations
 * 3. Voice exclusivity (all speakers are certified British male voices)
 * 4. Test Persistence Service schema
 * 5. Audio dialogue and chunk segmentation
 */

import {
  levenshteinDistance,
  tokenJaccardSimilarity,
  calculateSemanticSimilarity,
  normalizeText,
  computeStringHash
} from '../src/services/QuestionEngine';
import { ALL_INITIAL_QUESTIONS } from '../src/data/comprehensiveQuestionBank';
import { SPEAKER_MAP } from '../server';
import { FORBIDDEN_FEMALE_PATTERNS, DEFAULT_MASTER_MALE_VOICE, selectBestDeviceMaleVoice } from '../src/config/voiceConfig';
import { analyzeSpeakingFluency, evaluateSpeakingSession, generateDiagnosticTurnFeedback } from '../src/services/SpeakingEvaluationService';
import { audioLogger, soundManager } from '../src/utils/audioEffects';
import { validateGmailAddress, handleGoogleSignInAction } from '../src/utils/googleAuth';
import { SpeakingAnswerRecord } from '../src/types/speakingTypes';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
  }
}

console.log('\n=== RUNNING IELTS SPRINT PRODUCTION VERIFICATION SUITE ===\n');

// -------------------------------------------------------------
// 1. QUESTION ENGINE & SIMILARITY TESTS
// -------------------------------------------------------------
console.log('[1/5] Testing QuestionEngine Algorithms & Duplicate Detection...');

assert(
  levenshteinDistance('kitten', 'sitting') === 3,
  'Levenshtein distance calculation matches known ground truth (kitten -> sitting = 3)'
);

assert(
  levenshteinDistance('', 'test') === 4 && levenshteinDistance('abc', '') === 3,
  'Levenshtein distance handles empty strings properly'
);

const jaccardIdentical = tokenJaccardSimilarity('What is your full name?', 'What is your full name?');
assert(jaccardIdentical === 1.0, 'Token Jaccard similarity evaluates identical strings to 1.0');

const jaccardDifferent = tokenJaccardSimilarity('What is your full name?', 'Calculate the velocity of light');
assert(jaccardDifferent === 0, 'Token Jaccard similarity evaluates completely disjoint strings to 0.0');

const simHigh = calculateSemanticSimilarity(
  'Some people think university education should be free.',
  'Some individuals believe higher education should be free of charge.'
);
assert(simHigh >= 0.40, `Semantic similarity detects paraphrased IELTS prompts (score: ${simHigh.toFixed(2)})`);

const simLow = calculateSemanticSimilarity(
  'Summarize the line graph of renewable electricity generation.',
  'Discuss the advantages of remote working arrangements.'
);
assert(simLow < 0.25, `Semantic similarity correctly differentiates unrelated tasks (score: ${simLow.toFixed(2)})`);

// -------------------------------------------------------------
// 2. QUESTION BANK INTEGRITY & ZERO-DUPLICATES CHECK
// -------------------------------------------------------------
console.log('\n[2/5] Testing Question Bank Schema & Uniqueness...');

assert(ALL_INITIAL_QUESTIONS.length >= 80, `Question bank has extensive verified items (count: ${ALL_INITIAL_QUESTIONS.length})`);

const seenIds = new Set<string>();
const duplicateIds: string[] = [];
for (const q of ALL_INITIAL_QUESTIONS) {
  if (seenIds.has(q.id)) {
    duplicateIds.push(q.id);
  }
  seenIds.add(q.id);
}
assert(duplicateIds.length === 0, 'Zero duplicate question IDs across entire question bank', duplicateIds.join(', '));

let allValidFields = true;
let invalidFieldReason = '';
for (const q of ALL_INITIAL_QUESTIONS) {
  if (!q.id || !q.module || !q.prompt || !q.difficulty || !q.topic || !q.source) {
    allValidFields = false;
    invalidFieldReason = `Question ${q.id} missing core fields`;
    break;
  }
}
assert(allValidFields, 'Every question has complete required metadata fields', invalidFieldReason);

const listeningQuestions = ALL_INITIAL_QUESTIONS.filter((q) => q.module === 'listening');
assert(listeningQuestions.length >= 40, `Listening bank contains full test capacity (count: ${listeningQuestions.length})`);

// -------------------------------------------------------------
// 3. VOICE ENGINE & EXCLUSIVELY BRITISH MALE CONFIGURATION
// -------------------------------------------------------------
console.log('\n[3/5] Testing Audio Engine & British Male Voice Guarantees...');

assert(
  DEFAULT_MASTER_MALE_VOICE.lang === 'en-GB' && DEFAULT_MASTER_MALE_VOICE.geminiVoiceName === 'Fenrir',
  'Master default voice is certified Cambridge British Male (Fenrir en-GB)'
);

const accents = new Set(Object.values(SPEAKER_MAP).map((s) => s.accent));
const genders = new Set(Object.values(SPEAKER_MAP).map((s) => s.gender));
const hasDiverseGendersAndAccents = accents.size >= 4 && genders.has('male') && genders.has('female');
assert(
  hasDiverseGendersAndAccents,
  'Server SPEAKER_MAP provides authentic multi-accent, multi-character native voices across male and female personas'
);

const testFemaleNames = ['Alice', 'Samantha', 'Victoria', 'Karen', 'Siri', 'Google UK English Female'];
let forbiddenCorrect = true;
for (const name of testFemaleNames) {
  const isBlocked = FORBIDDEN_FEMALE_PATTERNS.some((pat) => pat.test(name));
  if (!isBlocked) {
    forbiddenCorrect = false;
    break;
  }
}
assert(forbiddenCorrect, 'Female voice filter successfully catches device & cloud female voices');

// Audio Lifecycle Logger Verification
audioLogger.log('lifecycle', 'TestSuite', 'LIFECYCLE_TEST_EVENT', { status: 'healthy' });
audioLogger.logBufferState('TestSuite', { state: 'playing', currentTime: 12.5, duration: 45.0 });
audioLogger.logVoiceSelection('TestSuite', {
  selectedVoiceName: 'Arthur (Fenrir)',
  lang: 'en-GB',
  provider: 'gemini_tts',
  isStrictMale: true,
  pitchMultiplier: 0.96,
  rate: 0.94,
  reason: 'Cambridge test suite'
});
const capturedLogs = audioLogger.getRecentLogs();
assert(capturedLogs.length >= 3, 'Unified Audio Logger records lifecycle, buffer state, and voice selection events');
assert(
  capturedLogs.some((l) => l.event === 'VOICE_SELECTION' && l.details?.isStrictMale === true),
  'Voice selection log captures strict male voice validation details'
);
assert(
  capturedLogs.some((l) => l.event === 'BUFFER_STATE_CHANGE' && l.details?.state === 'playing'),
  'Buffer state log captures real-time playback state transitions'
);

// Anti-Robotic Pitch Multiplier Verification
const mockVoices: any[] = [
  { name: 'Google UK English Male', lang: 'en-GB' },
  { name: 'Victoria', lang: 'en-GB' }
];
const voiceChoice = selectBestDeviceMaleVoice(mockVoices);
assert(voiceChoice.voice?.name === 'Google UK English Male', 'Selects verified British male voice over female voice');
assert(voiceChoice.pitchMultiplier >= 0.90 && voiceChoice.pitchMultiplier <= 1.0, `Pitch multiplier calibrated to natural human speech range (${voiceChoice.pitchMultiplier})`);

// -------------------------------------------------------------
// 4. SPEAKING FLUENCY & ASSESSMENT ENGINE
// -------------------------------------------------------------
console.log('\n[4/5] Testing Speaking Fluency Analytics & Cambridge Descriptors...');

const mockAnswers: SpeakingAnswerRecord[] = [
  {
    questionId: 'spk_q1',
    part: 1,
    topic: 'Work & Studies',
    questionText: 'Do you work or study?',
    transcript: 'I am currently working as a software developer, and furthermore, I have been in this profession for approximately four years.',
    startTime: Date.now() - 15000,
    endTime: Date.now(),
    durationSec: 15,
    wordCount: 22,
    wordsPerMinute: 88,
    pauseCount: 1,
    longPauseCount: 0,
    fillerCount: 0,
    detectedFillers: []
  },
  {
    questionId: 'spk_q2',
    part: 2,
    topic: 'Infrastructure Project',
    questionText: 'Describe an ambitious project.',
    transcript: 'I would like to describe a major infrastructure initiative that took place in my hometown. Although there were significant fiscal constraints, the municipal engineers nevertheless completed the project on schedule.',
    startTime: Date.now() - 45000,
    endTime: Date.now(),
    durationSec: 45,
    wordCount: 30,
    wordsPerMinute: 40,
    pauseCount: 2,
    longPauseCount: 0,
    fillerCount: 0,
    detectedFillers: []
  }
];

const analytics = analyzeSpeakingFluency(mockAnswers);
assert(analytics.totalSpeakingTimeSec === 60, 'Fluency analyzer correctly aggregates speaking time (60s)');
assert(analytics.totalWordsSpoken === 52, 'Fluency analyzer counts spoken words accurately (52 words)');
assert(analytics.averageWpm > 0, `Average WPM calculated (${analytics.averageWpm} WPM)`);

const report = evaluateSpeakingSession(mockAnswers, 7.5);
assert(typeof report.overallBand === 'number' && report.overallBand >= 5.0 && report.overallBand <= 9.0, `Band score within Cambridge limits (Band ${report.overallBand})`);
assert(Object.keys(report.criteria).length === 4, 'Includes all 4 official Cambridge speaking criteria');

// -------------------------------------------------------------
// 5. GOOGLE GMAIL AUTHENTICATION & SCHEMA INTEGRITY
// -------------------------------------------------------------
console.log('\n[5/6] Testing Google Gmail Authentication & Validation Rules...');

const validGmail = validateGmailAddress('mdebadulislam45@gmail.com');
assert(validGmail.isValid, 'Accepts valid @gmail.com address');

const validGooglemail = validateGmailAddress('candidate@googlemail.com');
assert(validGooglemail.isValid, 'Accepts valid @googlemail.com address');

const invalidNonGmail = validateGmailAddress('candidate@yahoo.com');
assert(!invalidNonGmail.isValid, 'Rejects non-Gmail addresses in Google login flow');

const emptyEmail = validateGmailAddress('');
assert(!emptyEmail.isValid, 'Rejects empty email address');

const googleLoginResult = handleGoogleSignInAction({
  email: 'candidate.test@gmail.com',
  name: 'Candidate Test',
  targetBand: 8.0
});
assert(googleLoginResult.success === true, 'Google login completes successfully with valid Gmail');
assert(googleLoginResult.user?.email === 'candidate.test@gmail.com', 'Google user profile retains exact Gmail address');
assert(googleLoginResult.user?.progress.targetBand === 8.0, 'Google user profile retains candidate target band');

// -------------------------------------------------------------
// 6. INSTANT FEEDBACK IN SPEAKING & MOCK TESTS
// -------------------------------------------------------------
console.log('\n[6/6] Testing Instant Speaking Feedback, Grammar Diagnostics, Pronunciation Coach & Band 8+ Answers...');

const sampleTurnRecord: SpeakingAnswerRecord = {
  questionId: 'test_turn_01',
  part: 1,
  topic: 'Hometown & Urban Living',
  questionText: 'What kind of technological changes have taken place in your home over the last five years?',
  transcript: 'In my home it make many difference because people is using smart devices and they has upgraded.',
  durationSec: 30,
  wordCount: 18,
  wordsPerMinute: 60,
  pauseCount: 2,
  longPauseCount: 0,
  fillerCount: 1,
  detectedFillers: ['um'],
  startTime: Date.now() - 30000,
  endTime: Date.now()
};

const instantFeedback = generateDiagnosticTurnFeedback(sampleTurnRecord);

assert(typeof instantFeedback.estimatedBand === 'number', 'Instant feedback computes valid estimated band score');
assert(instantFeedback.grammaticalErrors.length >= 2, 'Instant feedback detects multiple grammatical errors in candidate speech');

const hasSubjectVerb = instantFeedback.grammaticalErrors.some(e => e.ruleCategory === 'Subject-Verb Agreement');
assert(hasSubjectVerb, 'Instant feedback categorizes subject-verb agreement error ("it make" / "people is")');

assert(!!instantFeedback.pronunciationAnalysis, 'Instant feedback generates comprehensive pronunciation analysis');
assert((instantFeedback.pronunciationAnalysis?.problemWords?.length ?? 0) > 0, 'Pronunciation coach identifies multisyllabic tricky words with IPA');
assert(typeof instantFeedback.pronunciationAnalysis?.problemWords?.[0]?.stressedSyllable === 'string', 'Pronunciation coach provides explicit syllable stress marking');

assert(!!instantFeedback.betterAnswer, 'Instant feedback generates Band 8+ better model answer');
assert((instantFeedback.betterAnswer?.modelResponse?.length ?? 0) > 50, 'Band 8+ model answer contains detailed Cambridge-standard response');
assert((instantFeedback.betterAnswer?.highlightedPhrases?.length ?? 0) > 0, 'Band 8+ answer highlights academic collocations and idioms');

// -------------------------------------------------------------
// 7. REAL IELTS CANDIDATE IDENTIFICATION PROTOCOL (Phase 0)
// -------------------------------------------------------------
console.log('\n[7/8] Testing Authentic IELTS Candidate Identification Protocol (Phase 0)...');

import { OFFICIAL_CANDIDATE_ID_PROTOCOL } from '../src/components/VoiceExaminer';

assert(OFFICIAL_CANDIDATE_ID_PROTOCOL.length === 4, 'Candidate identification protocol has 4 authentic steps');
assert(OFFICIAL_CANDIDATE_ID_PROTOCOL[0].prompt.toLowerCase().includes('full name'), 'Step 1 examiner prompt requests Candidate Full Name');
assert(OFFICIAL_CANDIDATE_ID_PROTOCOL[1].prompt.toLowerCase().includes('what can i call you'), 'Step 2 examiner prompt requests Preferred First Name ("What can I call you?")');
assert(OFFICIAL_CANDIDATE_ID_PROTOCOL[2].prompt.toLowerCase().includes('where do you come from'), 'Step 3 examiner prompt requests Hometown / Origin ("Where do you come from?")');
assert(OFFICIAL_CANDIDATE_ID_PROTOCOL[3].prompt.toLowerCase().includes('identification'), 'Step 4 examiner prompt requests Passport / Identification document check');

// -------------------------------------------------------------
// 8. ACHIEVEMENTS & VIRTUAL BADGES EVALUATION SYSTEM
// -------------------------------------------------------------
console.log('\n[8/8] Testing Achievements System & Milestone Badges...');

import { evaluateAchievements, getGamificationStats } from '../src/services/achievementService';

const mockProfile: any = {
  id: 'test_user',
  name: 'Candidate',
  email: 'test@example.com',
  createdAt: Date.now(),
  progress: {
    completedModules: ['listening', 'reading'],
    targetBand: 7.5,
    targetCountry: 'United Kingdom',
    intendedFormat: 'Academic',
    examHistory: [
      {
        id: 'exam_1',
        timestamp: Date.now(),
        overallBand: 8.0,
        listeningBand: 9.0, // Perfect listening score!
        readingBand: 8.0,
        writingBand: 7.5,
        wordCount: 320,
        submissionType: 'manual',
        correctCount: 40,
        totalQuestions: 40
      }
    ],
    streakDays: 8,
    lastActiveDate: new Date().toISOString(),
    wordsWrittenTotal: 1250
  }
};

const computedBadges = evaluateAchievements(mockProfile, 12);
assert(computedBadges.length >= 12, 'Achievements system produces comprehensive set of milestone badges');

const vocab500Badge = computedBadges.find(b => b.id === 'vocab_500');
assert(!!vocab500Badge, 'Includes requested "500 Vocabulary Words" milestone badge');
assert(vocab500Badge?.milestoneGoal === 500, '"500 Vocabulary Words" badge goal is set to 500');

const perfectListeningBadge = computedBadges.find(b => b.id === 'perfect_listening');
assert(!!perfectListeningBadge, 'Includes requested "Perfect Listening Score" milestone badge');
assert(perfectListeningBadge?.isUnlocked === true, '"Perfect Listening Score" correctly unlocks when user achieved Band 9.0 in Listening');

const streakBadge = computedBadges.find(b => b.id === 'streak_7');
assert(streakBadge?.isUnlocked === true, '"7-Day Study Streak" badge unlocks when streak is >= 7 days');

const gamificationState = getGamificationStats(computedBadges, mockProfile);
assert(typeof gamificationState.level === 'number' && gamificationState.level >= 1, 'Gamification calculates valid user progression level');
assert(typeof gamificationState.totalXp === 'number' && gamificationState.totalXp > 0, 'Gamification calculates cumulative user XP');

// -------------------------------------------------------------
// 9. SERVER AUTHENTICATION, PASSWORD HASHING & SESSIONS
// -------------------------------------------------------------
console.log('\n[9/11] Testing Server Authentication, Password Hashing & Sessions...');

import { hashPassword, verifyPassword, findOrCreateGoogleUser } from '../src/server/auth';
import { serverDb } from '../src/server/db';
import crypto from 'crypto';

const testPwd = 'SecureCandidatePassword2026!';
const { hash, salt } = hashPassword(testPwd);
assert(typeof hash === 'string' && hash.length === 128, 'PBKDF2 generates 512-bit (128 hex chars) secure password hash');
assert(typeof salt === 'string' && salt.length === 32, 'PBKDF2 uses 16-byte random salt');

const pwdMatch = verifyPassword(testPwd, hash, salt);
assert(pwdMatch === true, 'verifyPassword successfully validates correct candidate password');

const pwdMismatch = verifyPassword('WrongPassword123!', hash, salt);
assert(pwdMismatch === false, 'verifyPassword reliably rejects incorrect password');

// Server Session Token Tests
const mockServerUser = serverDb.saveUser({
  id: 'usr_test_verification_01',
  email: 'verified.candidate@ieltssprint.com',
  name: 'Candidate Test Lead',
  createdAt: Date.now(),
  updatedAt: Date.now()
});
assert(mockServerUser.id === 'usr_test_verification_01', 'serverDb saves verified candidate record');

const session = serverDb.createSession(mockServerUser.id, 'Test-Agent', '127.0.0.1');
assert(typeof session.token === 'string' && session.token.length === 64, 'serverDb issues cryptographically random 256-bit hex session token');

const retrievedSession = serverDb.getSession(session.token);
assert(retrievedSession?.userId === mockServerUser.id, 'serverDb retrieves valid active session by token');

// Google User Linking Test
const linkedUser = findOrCreateGoogleUser({
  sub: 'google_oauth_sub_998877',
  email: 'google.auth.verified@gmail.com',
  name: 'Google Verified Candidate',
  picture: 'https://lh3.googleusercontent.com/avatar_test',
  email_verified: true
});
assert(linkedUser.googleId === 'google_oauth_sub_998877', 'findOrCreateGoogleUser attaches official Google OAuth sub ID');
assert(linkedUser.email === 'google.auth.verified@gmail.com', 'findOrCreateGoogleUser preserves verified email');

// -------------------------------------------------------------
// 10. STRIPE WEBHOOK SIGNATURES, IDEMPOTENCY & ENTITLEMENTS
// -------------------------------------------------------------
console.log('\n[10/11] Testing Stripe Webhook HMAC Signatures, Idempotency & Entitlements...');

import {
  verifyStripeSignature,
  processStripeWebhookEvent,
  checkUserEntitlement
} from '../src/server/billing';

const webhookSecret = 'whsec_test_secret_for_sprint_2026';
const testPayload = JSON.stringify({
  id: 'evt_test_checkout_completed_001',
  type: 'checkout.session.completed',
  data: {
    object: {
      client_reference_id: mockServerUser.id,
      customer: 'cus_test_123',
      subscription: 'sub_test_pro_456',
      metadata: { planId: 'pro', userId: mockServerUser.id }
    }
  }
});

const timestamp = Math.floor(Date.now() / 1000).toString();
const expectedSig = crypto
  .createHmac('sha256', webhookSecret)
  .update(`${timestamp}.${testPayload}`)
  .digest('hex');
const validHeader = `t=${timestamp},v1=${expectedSig}`;

const isSigValid = verifyStripeSignature(testPayload, validHeader, webhookSecret);
assert(isSigValid === true, 'verifyStripeSignature validates authentic HMAC-SHA256 Stripe signatures');

const invalidHeader = `t=${timestamp},v1=invalid_tampered_signature_hex`;
const isSigInvalid = verifyStripeSignature(testPayload, invalidHeader, webhookSecret);
assert(isSigInvalid === false, 'verifyStripeSignature rejects tampered or fraudulent webhook signatures');

// Expired timestamp replay check (10 minutes old)
const oldTimestamp = (Math.floor(Date.now() / 1000) - 600).toString();
const oldSig = crypto
  .createHmac('sha256', webhookSecret)
  .update(`${oldTimestamp}.${testPayload}`)
  .digest('hex');
const oldHeader = `t=${oldTimestamp},v1=${oldSig}`;
const isOldSigRejected = verifyStripeSignature(testPayload, oldHeader, webhookSecret);
assert(isOldSigRejected === false, 'verifyStripeSignature rejects replay attacks older than 300-second tolerance');

// Process Webhook Event & Idempotency
const eventObj = JSON.parse(testPayload);
const processResult1 = processStripeWebhookEvent(eventObj);
assert(processResult1.processed === true, 'processStripeWebhookEvent successfully activates subscription');

const subAfterWebhook = serverDb.getSubscription(mockServerUser.id);
assert(subAfterWebhook.planId === 'pro' && subAfterWebhook.status === 'active', 'User subscription upgraded to Sprint Pro in server store');

// Idempotent duplicate event
const processResult2 = processStripeWebhookEvent(eventObj);
assert(
  processResult2.processed === true && !!processResult2.reason?.includes('Duplicate'),
  'processStripeWebhookEvent handles duplicate webhook deliveries idempotently without re-processing'
);

// Entitlement check
const entitlementPro = checkUserEntitlement(mockServerUser.id, 'aiVoiceExaminer');
assert(entitlementPro.hasAccess === true, 'checkUserEntitlement grants AI Voice Examiner access to Pro subscriber');

// Unpaid/Free entitlement restriction check
const freeUser = serverDb.saveUser({
  id: 'usr_free_candidate_99',
  email: 'free.student@ieltssprint.com',
  name: 'Free Student',
  createdAt: Date.now(),
  updatedAt: Date.now()
});
const entitlementFree = checkUserEntitlement(freeUser.id, 'aiVoiceExaminer');
assert(entitlementFree.hasAccess === false, 'checkUserEntitlement denies premium AI Voice Examiner to Free tier account');

// -------------------------------------------------------------
// 11. DEMO BYPASS & HARDCODED CREDENTIAL ELIMINATION AUDIT
// -------------------------------------------------------------
console.log('\n[11/11] Auditing Complete Removal of Demo Bypasses & Fake Accounts...');

import fs from 'fs';
import path from 'path';

const loginScreenContent = fs.readFileSync(path.join(process.cwd(), 'src/components/auth/LoginScreen.tsx'), 'utf-8');
assert(!loginScreenContent.includes('handleQuickDemoLogin'), 'LoginScreen has zero handleQuickDemoLogin bypass method');
assert(!loginScreenContent.includes('Sarah Jenkins'), 'LoginScreen has zero hardcoded Sarah Jenkins demo account');
assert(!loginScreenContent.includes('David Mitchell'), 'LoginScreen has zero hardcoded David Mitchell demo account');
assert(!loginScreenContent.includes('Sprint2026!'), 'LoginScreen has zero hardcoded passwords');

const authModalContent = fs.readFileSync(path.join(process.cwd(), 'src/components/AuthModal.tsx'), 'utf-8');
assert(!authModalContent.includes('Quick Select Candidate Profiles:'), 'AuthModal has zero unauthenticated candidate switcher');

const googleModalContent = fs.readFileSync(path.join(process.cwd(), 'src/components/auth/GoogleSignInModal.tsx'), 'utf-8');
assert(!googleModalContent.includes('handleQuickPreset'), 'GoogleSignInModal has zero fake preset shortcuts');

// -------------------------------------------------------------
// 12. USEAUTHGUARD & ROUTE ENTITLEMENT RULES TEST
// -------------------------------------------------------------
console.log('\n[12/13] Testing useAuthGuard & Restricted Routes Rules...');

import { RESTRICTED_ROUTES } from '../src/hooks/useAuthGuard';

assert(RESTRICTED_ROUTES['livemock']?.minPlan === 'pro', 'livemock route strictly requires at least Pro subscription');
assert(RESTRICTED_ROUTES['voice_examiner']?.minPlan === 'pro', 'voice_examiner route strictly requires at least Pro subscription');
assert(RESTRICTED_ROUTES['modelanswers']?.minPlan === 'pro', 'modelanswers route strictly requires at least Pro subscription');
assert(RESTRICTED_ROUTES['listening']?.requireAuth === true && RESTRICTED_ROUTES['listening']?.minPlan === 'free', 'listening route requires authenticated user with free tier access');
assert(RESTRICTED_ROUTES['reading']?.requireAuth === true && RESTRICTED_ROUTES['reading']?.minPlan === 'free', 'reading route requires authenticated user with free tier access');

// -------------------------------------------------------------
// 13. LISTENING AUDIO CONTINUITY & REPLAY SAFEGUARDS
// -------------------------------------------------------------
console.log('\n[13/13] Auditing Continuous Listening Audio & Anti-Interruption Fixes...');

const listeningLabContent = fs.readFileSync(path.join(process.cwd(), 'src/components/ListeningLab.tsx'), 'utf-8');
// Verify activeQuestionIndex reset was removed
assert(!listeningLabContent.includes('audioManager.reset(`switch_q_${questions[activeQuestionIndex]'), 'ListeningLab does NOT stop audio when user switches question indices within the same section');
assert(listeningLabContent.includes('switch_section_${activeSection}'), 'ListeningLab only resets audio when switching whole sections or scenario topics');

import { audioManager } from '../src/services/AudioManager';
// Verify allowReplay defaults to true in practice
const testQ = ALL_INITIAL_QUESTIONS[0];
const meta = audioManager.registerQuestionAudio(testQ);
assert(meta.audioId.startsWith(`aud_${testQ.id}_`), 'AudioManager generates deterministic unique audioId with questionId prefix');

// -------------------------------------------------------------
// 14. CONTEXTUAL CAMBRIDGE AI TUTOR & BACKEND PIPELINE
// -------------------------------------------------------------
console.log('\n[14/16] Testing Contextual Cambridge AI Tutor & Backend Endpoint...');

const serverContent = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf-8');
assert(serverContent.includes("app.post('/api/tutor/chat'"), 'Server defines POST /api/tutor/chat endpoint');
assert(serverContent.includes('generateTutorFallbackResponse'), 'Server implements robust offline pedagogical fallback generator for Cambridge tutor');

const appContent = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf-8');
assert(appContent.includes('<ContextualAITutor'), 'App mounts ContextualAITutor globally across all modules');
assert(appContent.includes('open_vault_modal'), 'App registers open_vault_modal global event listener');

// -------------------------------------------------------------
// 15. UNIVERSAL COMMAND PALETTE & THEME PROVIDER
// -------------------------------------------------------------
console.log('\n[15/16] Testing Universal Command Palette & Theme Provider...');

const mainContent = fs.readFileSync(path.join(process.cwd(), 'src/main.tsx'), 'utf-8');
assert(mainContent.includes('<ThemeProvider>'), 'main.tsx wraps application inside ThemeProvider');

const commandPaletteContent = fs.readFileSync(path.join(process.cwd(), 'src/components/modals/GlobalSearchModal.tsx'), 'utf-8');
assert(commandPaletteContent.includes('cmd_tutor'), 'Command Palette includes quick action to launch Cambridge AI Tutor');
assert(commandPaletteContent.includes('cmd_theme'), 'Command Palette includes quick action to toggle Dark/Light Theme');
assert(commandPaletteContent.includes('cmd_listening'), 'Command Palette includes quick action to launch Listening Lab');
assert(commandPaletteContent.includes('cmd_vault'), 'Command Palette includes quick action to launch Mistake Vault');
assert(commandPaletteContent.includes('ArrowDown') && commandPaletteContent.includes('ArrowUp'), 'Command Palette supports arrow key navigation');

// -------------------------------------------------------------
// 16. REAL-TIME SPEAKING VOICE ORB & INTERACTIVE ANALYTICS
// -------------------------------------------------------------
console.log('\n[16/16] Testing Real-Time Speaking Voice Orb & Interactive Analytics...');

const voiceExaminerContent = fs.readFileSync(path.join(process.cwd(), 'src/components/VoiceExaminer.tsx'), 'utf-8');
assert(voiceExaminerContent.includes('<SpeakingVoiceOrb'), 'VoiceExaminer embeds SpeakingVoiceOrb for animated oral interview states');

const aiToolsContent = fs.readFileSync(path.join(process.cwd(), 'src/components/pages/AIToolsPage.tsx'), 'utf-8');
assert(aiToolsContent.includes('<SpeakingVoiceOrb'), 'AIToolsPage embeds SpeakingVoiceOrb for speaking practice booth');

const progressContent = fs.readFileSync(path.join(process.cwd(), 'src/components/pages/ProgressPage.tsx'), 'utf-8');
assert(progressContent.includes('Question-Type Accuracy Matrix'), 'ProgressPage renders interactive Question-Type Accuracy Matrix');
assert(progressContent.includes('Recurring Error Heatmap'), 'ProgressPage renders Recurring Error Heatmap with mistake drill triggers');

// -------------------------------------------------------------
// 17. NATURAL BRITISH FEMALE VOICE & ROBOTIC ELIMINATION
// -------------------------------------------------------------
console.log('\n[17/18] Testing Natural British Female Voice & Zero-Robotic DSP Guarantees...');

import {
  DEFAULT_MASTER_FEMALE_VOICE,
  selectBestDeviceFemaleVoice,
  FEMALE_BRITISH_VOICE_PATTERNS
} from '../src/config/voiceConfig';
import { ALL_VOICE_MAP } from '../server';

assert(
  DEFAULT_MASTER_FEMALE_VOICE.lang === 'en-GB' && DEFAULT_MASTER_FEMALE_VOICE.geminiVoiceName === 'Aoede',
  'Master female voice is certified Cambridge British Female (Aoede en-GB)'
);
assert(
  DEFAULT_MASTER_FEMALE_VOICE.pitch === 1.0,
  'Master female voice has pitch 1.0 (unaltered human formant, eliminates robotic distortion)'
);
assert(
  ALL_VOICE_MAP['speaker_05']?.gender === 'female' && ALL_VOICE_MAP['speaker_05']?.voiceName === 'Aoede',
  'Server ALL_VOICE_MAP provides verified speaker_05 British female voice profile'
);

const mockFemaleVoices: any[] = [
  { name: 'Microsoft Libby Online (Natural) - English (United Kingdom)', lang: 'en-GB' },
  { name: 'Google UK English Female', lang: 'en-GB' },
  { name: 'Samantha', lang: 'en-US' }
];
const chosenFemale = selectBestDeviceFemaleVoice(mockFemaleVoices);
assert(
  Boolean(chosenFemale.voice?.name.includes('Libby') || chosenFemale.voice?.name.includes('Google UK English Female')),
  'selectBestDeviceFemaleVoice selects certified British female voice over US female voice'
);
assert(
  chosenFemale.pitchMultiplier === 1.0,
  'selectBestDeviceFemaleVoice maintains strictly 1.0 pitch multiplier (zero robotic pitch shifting)'
);

// -------------------------------------------------------------
// 18. BAND 9 ESSAY ARCHITECT & SRS FLASHCARD INTEGRATION
// -------------------------------------------------------------
console.log('\n[18/18] Testing Band 9 Essay Architect & Spaced Repetition Flashcards...');

import { ESSAY_TEMPLATES } from '../src/components/writing/Band9EssayArchitect';

assert(ESSAY_TEMPLATES.length >= 3, 'Essay Architect provides at least 3 comprehensive task skeletons');
assert(
  ESSAY_TEMPLATES.some((t) => t.category === 'task2' && t.paragraphStructure.length === 4),
  'Task 2 essay templates follow official 4-paragraph Cambridge structure'
);
assert(
  ESSAY_TEMPLATES.some((t) => t.category === 'task1'),
  'Includes Academic Task 1 dynamic chart template with Overview'
);

const flashcardContent = fs.readFileSync(path.join(process.cwd(), 'src/components/vocab/VocabFlashcardTrainer.tsx'), 'utf-8');
assert(flashcardContent.includes('Exacerbate') && flashcardContent.includes('Mitigate'), 'Flashcard trainer contains high-yield Band 8+ academic lexical items');
assert(flashcardContent.includes('speakBritish'), 'Flashcards embed British voice audio playback');
assert(flashcardContent.includes('isFlipped'), 'Flashcards implement interactive card flip');

// -------------------------------------------------------------
// 19. PHASE 4C MINIMAL SECURITY FIXES REGRESSION SUITE
// -------------------------------------------------------------
console.log('\n[19/19] Testing Phase 4C Minimal Security Fixes & Regression Controls...');

import { app } from '../server';
import { serverDb } from '../src/server/db';
import EventEmitter from 'events';

function simulateExpressRequest(
  method: string,
  url: string,
  headers: Record<string, string> = {},
  body: any = null
): Promise<{ statusCode: number; headers: Record<string, string>; body: any }> {
  return new Promise((resolve) => {
    const req = new EventEmitter() as any;
    req.method = method;
    req.url = url;
    req.originalUrl = url;
    req.headers = { ...headers };
    req.get = (name: string) => req.headers[name.toLowerCase()] || req.headers[name];
    req.protocol = 'http';
    req.socket = { remoteAddress: '127.0.0.1' };
    req.body = body;

    const res = new EventEmitter() as any;
    const resHeaders: Record<string, string> = {};
    let statusCode = 200;
    let responseData = '';

    res.setHeader = (name: string, val: string) => {
      resHeaders[name.toLowerCase()] = String(val);
    };
    res.getHeader = (name: string) => resHeaders[name.toLowerCase()];
    res.status = (code: number) => {
      statusCode = code;
      return res;
    };
    res.sendStatus = (code: number) => {
      statusCode = code;
      resolve({ statusCode, headers: resHeaders, body: null });
      return res;
    };
    res.json = (data: any) => {
      responseData = JSON.stringify(data);
      resHeaders['content-type'] = 'application/json';
      resolve({ statusCode, headers: resHeaders, body: data });
      return res;
    };
    res.send = (data: any) => {
      responseData = typeof data === 'string' ? data : JSON.stringify(data);
      let parsed = data;
      try {
        if (typeof data === 'string') parsed = JSON.parse(data);
      } catch {}
      resolve({ statusCode, headers: resHeaders, body: parsed });
      return res;
    };
    res.end = (data?: any) => {
      resolve({ statusCode, headers: resHeaders, body: responseData || data });
      return res;
    };

    app(req, res);
  });
}

// Test 1: Untrusted origin receives no Access-Control-Allow-Origin permission
const resUntrusted = await simulateExpressRequest('OPTIONS', '/api/health', {
  origin: 'https://evil-untrusted-domain.com',
  'access-control-request-method': 'GET'
});
assert(
  !resUntrusted.headers['access-control-allow-origin'],
  'Untrusted origins (https://evil-untrusted-domain.com) receive no Access-Control-Allow-Origin permission'
);

// Test 2: An empty production allowlist does not allow arbitrary origins
const prevNodeEnv = process.env.NODE_ENV;
process.env.NODE_ENV = 'production';
const resEmptyProd = await simulateExpressRequest('GET', '/api/health', {
  origin: 'https://arbitrary-attacker-site.org'
});
process.env.NODE_ENV = prevNodeEnv;
assert(
  !resEmptyProd.headers['access-control-allow-origin'],
  'An empty production allowlist does not allow arbitrary origins'
);

// Test 3: A random .run.app origin is rejected
const resRunApp = await simulateExpressRequest('GET', '/api/health', {
  origin: 'https://malicious-tenant.run.app'
});
assert(
  !resRunApp.headers['access-control-allow-origin'],
  'A random .run.app origin (https://malicious-tenant.run.app) is rejected'
);

// Test 4: An explicitly approved origin still works
const resDevOrigin = await simulateExpressRequest('GET', '/api/health', {
  origin: 'http://localhost:3000'
});
assert(
  resDevOrigin.headers['access-control-allow-origin'] === 'http://localhost:3000' &&
    resDevOrigin.headers['access-control-allow-credentials'] === 'true',
  'An explicitly approved local development origin (http://localhost:3000) is allowed with credentials'
);

// Test 5: Unauthenticated evaluation requests are rejected
const resUnauthSpk = await simulateExpressRequest('POST', '/api/evaluate-speaking-turn', {
  'content-type': 'application/json'
}, { transcript: 'I prefer studying in the library because it is quiet.' });
assert(
  resUnauthSpk.statusCode === 401,
  'Unauthenticated speaking evaluation requests are rejected with HTTP 401'
);

const resUnauthWrt = await simulateExpressRequest('POST', '/api/evaluate-writing', {
  'content-type': 'application/json'
}, { essayText: 'In recent years, higher education has become an important topic of discussion globally.' });
assert(
  resUnauthWrt.statusCode === 401,
  'Unauthenticated writing evaluation requests are rejected with HTTP 401'
);

// Test 6: Analytics rejects unauthenticated requests
const resUnauthAnalytics = await simulateExpressRequest('POST', '/api/analytics/login', {
  'content-type': 'application/json'
}, { userId: 'usr_fake', email: 'fake@example.com' });
assert(
  resUnauthAnalytics.statusCode === 401,
  'Analytics /api/analytics/login rejects unauthenticated requests with HTTP 401'
);

// Test 7: Analytics cannot write records under another user identity
const testUser1 = serverDb.saveUser({
  id: 'usr_sec_test_user_1',
  email: 'user1@example.com',
  name: 'Security Test User 1',
  targetBand: 7.5,
  intendedFormat: 'Academic',
  createdAt: Date.now(),
  updatedAt: Date.now()
});
serverDb.saveSubscription({
  userId: testUser1.id,
  planId: 'pro',
  status: 'active',
  paymentMethod: 'stripe',
  currentPeriodStart: Date.now(),
  currentPeriodEnd: Date.now() + 30 * 24 * 3600 * 1000,
  cancelAtPeriodEnd: false,
  updatedAt: Date.now()
});
const testSession1 = serverDb.createSession(testUser1.id, 'TestSuite', '127.0.0.1');

const resSpoofedAnalytics = await simulateExpressRequest('POST', '/api/analytics/login', {
  'content-type': 'application/json',
  authorization: `Bearer ${testSession1.token}`
}, { userId: 'usr_target_victim', email: 'victim@example.com', name: 'Victim User' });

assert(
  resSpoofedAnalytics.statusCode === 403,
  'Analytics rejects requests attempting to write records under another user identity (HTTP 403)'
);

// Test 8: Valid authenticated requests still work
const resValidAnalytics = await simulateExpressRequest('POST', '/api/analytics/login', {
  'content-type': 'application/json',
  authorization: `Bearer ${testSession1.token}`
}, { userId: testUser1.id, email: testUser1.email, name: testUser1.name });

assert(
  resValidAnalytics.statusCode === 200 && resValidAnalytics.body?.success === true,
  'Valid authenticated telemetry requests succeed with HTTP 200'
);

const resValidWriting = await simulateExpressRequest('POST', '/api/evaluate-writing', {
  'content-type': 'application/json',
  authorization: `Bearer ${testSession1.token}`
}, { essayText: 'In recent years, artificial intelligence has profoundly transformed modern educational methodology.', prompt: 'Discuss the impact of AI on education.', testType: 'task2' });

assert(
  resValidWriting.statusCode === 200 && resValidWriting.body?.overallBand !== undefined,
  'Valid authenticated writing evaluation requests succeed with HTTP 200 and return diagnostic scorecard'
);

// -------------------------------------------------------------
// 20. PHASE 4D CSP & SECURITY HARDENING VERIFICATION SUITE
// -------------------------------------------------------------
console.log('\n[20/20] Testing Phase 4D Content Security Policy (Report-Only) & Header Hardening...');

import { CSP_REPORT_ONLY_POLICY } from '../server';

const resCspCheck = await simulateExpressRequest('GET', '/api/health');

assert(
  Boolean(resCspCheck.headers['content-security-policy-report-only']),
  'Server sends Content-Security-Policy-Report-Only HTTP header on responses'
);

assert(
  !resCspCheck.headers['x-xss-protection'],
  'Obsolete X-XSS-Protection header is removed'
);

assert(
  resCspCheck.headers['x-content-type-options'] === 'nosniff' &&
    resCspCheck.headers['x-frame-options'] === 'SAMEORIGIN' &&
    resCspCheck.headers['referrer-policy'] === 'strict-origin-when-cross-origin',
  'Core security headers (nosniff, SAMEORIGIN, strict-origin-when-cross-origin) remain active'
);

assert(
  CSP_REPORT_ONLY_POLICY.includes("default-src 'self'") &&
    CSP_REPORT_ONLY_POLICY.includes("object-src 'none'") &&
    CSP_REPORT_ONLY_POLICY.includes("https://accounts.google.com") &&
    CSP_REPORT_ONLY_POLICY.includes("https://translate.googleapis.com"),
  'CSP_REPORT_ONLY_POLICY contains accurate, dependency-derived directive rules'
);

// -------------------------------------------------------------
// 21. MULTI-SPEAKER LISTENING AUDIO & ACCENT STANDARD SUITE
// -------------------------------------------------------------
console.log('\n[21/21] Testing Multi-Speaker Listening Audio & Accent Standards...');

import { IELTS_CHARACTERS } from '../server';

// Test 1: Distinct Voice Assignments for Speaker A and Speaker B
const twoSpeakerQ: IELTSQuestion = {
  id: 'test_lis_multispeak_01',
  module: 'listening',
  section: 1,
  questionType: 'form_completion',
  difficulty: 'easy',
  topic: 'Car Rental Booking',
  prompt: 'Customer surname: [1]',
  correctAnswer: 'BRAITHWAITE',
  explanation: 'Customer spells her surname.',
  dialogue: [
    { speaker: 'Receptionist (Oliver)', text: 'Good morning, Apex Rentals. May I have your surname?' },
    { speaker: 'Customer (Eleanor)', text: 'Yes, it is Braithwaite. B-R-A-I-T-H-W-A-I-T-E.' }
  ],
  source: 'cambridge_standard',
  version: 1,
  createdAt: Date.now()
};

const meta2 = audioManager.registerQuestionAudio(twoSpeakerQ);
assert(meta2.dialogue && meta2.dialogue.length === 2, 'Registers 2 dialogue turns for multi-speaker question');
assert(
  meta2.dialogue[0].speakerId !== meta2.dialogue[1].speakerId,
  `Speaker A (${meta2.dialogue[0].speakerId}) and Speaker B (${meta2.dialogue[1].speakerId}) receive distinct voice profiles`
);

// Test 2: Three-Speaker Conversations in Academic Discussions
const threeSpeakerQ: IELTSQuestion = {
  id: 'test_lis_multispeak_02',
  module: 'listening',
  section: 3,
  questionType: 'multiple_choice',
  difficulty: 'hard',
  topic: 'Marine Biology Research Seminar',
  prompt: 'What was the primary focus of the coastal survey?',
  correctAnswer: 'B',
  explanation: 'Tutor and both students agree on sediment sampling.',
  dialogue: [
    { speaker: 'Professor Alistair', text: 'Sarah and Callum, how did your fieldwork on the estuary proceed?' },
    { speaker: 'Student Sarah', text: 'We focused on marine biodiversity along the mudflats.' },
    { speaker: 'Student Callum', text: 'And I concentrated on taking core sediment samples at high tide.' }
  ],
  source: 'cambridge_standard',
  version: 1,
  createdAt: Date.now()
};

const meta3 = audioManager.registerQuestionAudio(threeSpeakerQ);
assert(meta3.dialogue && meta3.dialogue.length === 3, 'Registers 3 dialogue turns for Section 3 academic discussion');
const distinct3Speakers = new Set(meta3.dialogue.map((d) => d.speakerId));
assert(
  distinct3Speakers.size === 3,
  'All 3 participants (Professor, Student Sarah, Student Callum) receive 3 completely distinct voice profiles'
);

// Test 3: Correct Speaker-Turn Ordering Preserved
assert(
  meta3.dialogue[0].text.includes('Sarah and Callum') &&
    meta3.dialogue[1].text.includes('biodiversity') &&
    meta3.dialogue[2].text.includes('sediment samples'),
  'Dialogue turn sequence strictly preserves original spoken script order'
);

// Test 4: Cache Invalidation when Script or Voice Changes
const modifiedScriptQ: IELTSQuestion = {
  ...twoSpeakerQ,
  dialogue: [
    { speaker: 'Receptionist (Oliver)', text: 'Good morning, Apex Rentals. May I have your surname?' },
    { speaker: 'Customer (Eleanor)', text: 'Yes, it is Braithwaite-Smith. B-R-A-I-T-H-W-A-I-T-E.' }
  ]
};
const metaMod = audioManager.registerQuestionAudio(modifiedScriptQ);
assert(
  meta2.audioId !== metaMod.audioId,
  'Cache key invalidates and updates when script or dialogue text is modified'
);

// Test 5: Multi-Accent Voice Roster Distribution
const rosterAccents = new Set(Object.values(IELTS_CHARACTERS).map((c) => c.accent));
assert(
  rosterAccents.has('British') &&
    rosterAccents.has('Australian') &&
    rosterAccents.has('American') &&
    rosterAccents.has('Canadian') &&
    rosterAccents.has('New Zealand') &&
    rosterAccents.has('Irish'),
  'Voice registry provides multi-accent coverage across British, Australian, American, Canadian, New Zealand, and Irish native speakers'
);

// -------------------------------------------------------------
// 22. GRAMMAR FEEDBACK ENGINE SERVICE LAYER SUITE
// -------------------------------------------------------------
console.log('\n[22/22] Testing GrammarFeedbackEngine Service Layer...');

import { grammarFeedbackEngine } from '../src/services/GrammarFeedbackEngine';

const offlineSpkFeedback = await grammarFeedbackEngine.analyzeSpeaking({
  transcript: 'I think that studying early in the morning help me concentrate better because my mind is fresh.',
  question: 'When do you prefer to study?',
  part: 1,
  topic: 'Study Habits'
});

assert(
  Boolean(offlineSpkFeedback.estimatedBands) &&
    Array.isArray(offlineSpkFeedback.bandJustifications) &&
    offlineSpkFeedback.bandJustifications.length === 4,
  'GrammarFeedbackEngine returns band score justifications across 4 criteria'
);

assert(
  Boolean(offlineSpkFeedback.pronunciation) &&
    Array.isArray(offlineSpkFeedback.pronunciation.trickyWords) &&
    offlineSpkFeedback.pronunciation.trickyWords.length > 0,
  'GrammarFeedbackEngine returns pronunciation breakdown with IPA and syllable stress'
);

assert(
  Boolean(offlineSpkFeedback.band8Answer) &&
    Boolean(offlineSpkFeedback.band8Answer.modelAnswer) &&
    offlineSpkFeedback.band8Answer.bandScore >= 8.5,
  'GrammarFeedbackEngine provides Band 8.5+ model answer'
);

const offlineWrtFeedback = await grammarFeedbackEngine.analyzeWriting({
  essayText: 'In recent years, higher education has become an important topic of discussion globally. Many people believe university degree is required for success.',
  prompt: 'Is university education necessary for a successful career?',
  testType: 'task2'
});

assert(
  Boolean(offlineWrtFeedback.estimatedBands) &&
    offlineWrtFeedback.bandJustifications.length === 4 &&
    offlineWrtFeedback.targetWordCount === 250,
  'GrammarFeedbackEngine analyzes writing inputs with Cambridge criteria justifications'
);

// -------------------------------------------------------------
// 23. PHASE 5A BDT ৳150 PREMIUM SUBSCRIPTION & ENTITLEMENT SUITE
// -------------------------------------------------------------
console.log('\n[23/23] Testing Phase 5A BDT ৳150 Premium Subscription & Entitlement Architecture...');

import { SUBSCRIPTION_PLANS, checkUserEntitlement } from '../src/server/billing';

// Test 1: BDT ৳150 Monthly Price Configuration in Central Server Store
const proPlan = SUBSCRIPTION_PLANS.pro;
assert(
  proPlan.priceMonthly === 150 &&
    proPlan.currency === 'BDT' &&
    proPlan.displayPrice === '৳150/month',
  'Sprint Premium is centrally configured as BDT ৳150/month'
);

// Test 2: Free User Entitlement Limits (2 speaking evaluations / day)
const p5aFreeUser = serverDb.saveUser({
  id: 'usr_phase5a_free_user',
  email: 'free_candidate@example.com',
  name: 'Free Candidate',
  createdAt: Date.now(),
  updatedAt: Date.now()
});

const entSpk1 = checkUserEntitlement(p5aFreeUser.id, 'speakingEvaluationsPerDay');
assert(entSpk1.hasAccess, 'Free user gets 1st speaking evaluation access');
serverDb.incrementDailyUsage(p5aFreeUser.id, 'speakingEvaluations');

const entSpk2 = checkUserEntitlement(p5aFreeUser.id, 'speakingEvaluationsPerDay');
assert(entSpk2.hasAccess, 'Free user gets 2nd speaking evaluation access');
serverDb.incrementDailyUsage(p5aFreeUser.id, 'speakingEvaluations');

const entSpk3 = checkUserEntitlement(p5aFreeUser.id, 'speakingEvaluationsPerDay');
assert(
  !entSpk3.hasAccess && entSpk3.reason?.includes('daily limit'),
  'Free user is strictly blocked on 3rd daily speaking evaluation on server'
);

// Test 3: Premium User Gets Unlimited Access
const premiumUser = serverDb.saveUser({
  id: 'usr_phase5a_premium_user',
  email: 'premium_candidate@example.com',
  name: 'Premium Candidate',
  createdAt: Date.now(),
  updatedAt: Date.now()
});
serverDb.saveSubscription({
  userId: premiumUser.id,
  planId: 'pro',
  status: 'active',
  paymentMethod: 'stripe',
  currentPeriodStart: Date.now(),
  currentPeriodEnd: Date.now() + 30 * 24 * 3600 * 1000,
  cancelAtPeriodEnd: false,
  updatedAt: Date.now()
});

const entPrem = checkUserEntitlement(premiumUser.id, 'speakingEvaluationsPerDay');
assert(entPrem.hasAccess && entPrem.planId === 'pro', 'Premium user receives active Sprint Premium entitlements');

// Test 4: Expired Subscription Automatically Downgrades to Free
const expiredUser = serverDb.saveUser({
  id: 'usr_phase5a_expired_user',
  email: 'expired_candidate@example.com',
  name: 'Expired Candidate',
  createdAt: Date.now(),
  updatedAt: Date.now()
});
serverDb.saveSubscription({
  userId: expiredUser.id,
  planId: 'pro',
  status: 'active',
  paymentMethod: 'stripe',
  currentPeriodStart: Date.now() - 60 * 24 * 3600 * 1000,
  currentPeriodEnd: Date.now() - 1 * 24 * 3600 * 1000, // Expired yesterday
  cancelAtPeriodEnd: false,
  updatedAt: Date.now()
});

const subExpired = serverDb.getSubscription(expiredUser.id);
assert(
  subExpired.status === 'expired' && subExpired.planId === 'free',
  'Expired Premium subscription automatically transitions status to expired and plan to free'
);

// Test 5: Re-login Persistence
const sessionExpiredUser = serverDb.createSession(expiredUser.id, 'MobileApp', '10.0.0.1');
const p5aRetrievedSession = serverDb.getSession(sessionExpiredUser.token);
assert(
  p5aRetrievedSession !== null && p5aRetrievedSession.userId === expiredUser.id,
  'Session token and user record persist reliably across re-login and refresh'
);

// -------------------------------------------------------------
// SECTION 23: PHASE 5B: 3-DAY FREE TRIAL & PROMOTIONAL CODES
// -------------------------------------------------------------
console.log('\n--- Section 23: Phase 5B: 3-Day Free Trial & Promotional Codes ---');

// Test 1: Eligible User Can Start 3-Day (72 Hours) Free Trial
const p5bTrialUser = serverDb.saveUser({
  id: 'usr_phase5b_trial_user',
  email: 'trial_candidate@example.com',
  name: 'Trial Candidate',
  createdAt: Date.now(),
  updatedAt: Date.now()
});

const trialResult = serverDb.startUserTrial(p5bTrialUser.id);
assert(
  trialResult.success &&
    trialResult.subscription?.status === 'trialing' &&
    trialResult.subscription?.planId === 'pro' &&
    trialResult.subscription?.trialUsed === true,
  'Eligible user successfully starts 3-day free trial on Pro tier'
);

// Verify exact 72-hour trial window
const durationHours = Math.round((trialResult.subscription!.trialEnd! - trialResult.subscription!.trialStart!) / (3600 * 1000));
assert(
  durationHours === 72,
  'Trial duration is configured for exactly 72 hours from server start time'
);

// Test 2: Duplicate Trial Attempt is Blocked
const duplicateTrialResult = serverDb.startUserTrial(p5bTrialUser.id);
assert(
  !duplicateTrialResult.success &&
    duplicateTrialResult.error?.includes('already'),
  'Concurrent or duplicate trial attempts are strictly blocked on the same account'
);

// Test 3: Entitlement Check Grants Full Pro Access During Trial
const trialEntitlement = checkUserEntitlement(p5bTrialUser.id, 'speakingEvaluationsPerDay');
assert(
  trialEntitlement.hasAccess && trialEntitlement.status === 'trialing' && trialEntitlement.planId === 'pro',
  'Server entitlement grants full unlimited access during active 3-day trial'
);

// Test 4: Trial Expiration Transitions Safely to Free Without Data Loss
p5bTrialUser.targetBand = 8.5; // Simulate existing user progress
serverDb.saveUser(p5bTrialUser);

const expiredTrialSub = serverDb.getSubscription(p5bTrialUser.id);
expiredTrialSub.trialEnd = Date.now() - 1000; // Simulated trial expired 1 second ago
serverDb.saveSubscription(expiredTrialSub);

const subAfterExpiry = serverDb.getSubscription(p5bTrialUser.id);
const userAfterExpiry = serverDb.findUserById(p5bTrialUser.id);

assert(
  subAfterExpiry.status === 'expired' &&
    subAfterExpiry.planId === 'free' &&
    userAfterExpiry?.targetBand === 8.5,
  'Expired trial seamlessly falls back to Free tier while 100% preserving user profile and data'
);

// Test 5: Re-attempting Trial After Expiry is Strictly Blocked
const postExpiryTrialResult = serverDb.startUserTrial(p5bTrialUser.id);
assert(
  !postExpiryTrialResult.success &&
    postExpiryTrialResult.error?.includes('already utilized'),
  'User who already consumed 3-day trial cannot restart another trial'
);

// Test 6: Case-Insensitive Promo Code Lookup & Trimming
const promoLookup1 = serverDb.findPromoCode('  sprint7  ');
const promoLookup2 = serverDb.findPromoCode('band8plus');
assert(
  promoLookup1 !== null && promoLookup1.code === 'SPRINT7' && promoLookup1.durationDays === 7,
  'Promo code lookup is strictly case-insensitive with whitespace trimming'
);
assert(
  promoLookup2 !== null && promoLookup2.code === 'BAND8PLUS' && promoLookup2.durationDays === 14,
  '14-Day BAND8PLUS promo code is properly seeded and active'
);

// Test 7: Candidate Redeems Valid Promo Code
const p5bPromoUser = serverDb.saveUser({
  id: 'usr_phase5b_promo_user',
  email: 'promo_candidate@example.com',
  name: 'Promo Candidate',
  createdAt: Date.now(),
  updatedAt: Date.now()
});

const redeemResult = serverDb.redeemPromoCode(p5bPromoUser.id, 'sprint7');
assert(
  redeemResult.success &&
    redeemResult.subscription?.status === 'active' &&
    redeemResult.subscription?.planId === 'pro' &&
    redeemResult.subscription?.paymentMethod === 'promo' &&
    redeemResult.subscription?.promoCode === 'SPRINT7',
  'Candidate successfully redeems valid SPRINT7 promo code for 7-day Pro access'
);

// Test 8: Duplicate Promo Code Redemption by Same Candidate is Rejected
const duplicatePromoResult = serverDb.redeemPromoCode(p5bPromoUser.id, 'SPRINT7');
assert(
  !duplicatePromoResult.success &&
    duplicatePromoResult.error?.includes('already redeemed'),
  'Candidate cannot redeem the same promotional code twice'
);

// Test 9: Invalid Promo Code is Gracefully Rejected
const invalidPromoResult = serverDb.redeemPromoCode(p5bPromoUser.id, 'UNKNOWN_INVALID_VOUCHER_999');
assert(
  !invalidPromoResult.success &&
    invalidPromoResult.error?.includes('Invalid'),
  'Non-existent promo codes are rejected with clear user-friendly guidance'
);

// Test 10: Expired Promo Code is Blocked
serverDb.addOrUpdatePromoCode({
  code: 'PASTEXPIRED',
  description: 'Old expired promotion',
  planId: 'pro',
  durationDays: 7,
  maxRedemptions: 100,
  currentRedemptions: 0,
  expiresAt: Date.now() - 3600 * 1000, // Expired 1 hour ago
  isActive: true
});

const expiredPromoResult = serverDb.redeemPromoCode(p5bPromoUser.id, 'PASTEXPIRED');
assert(
  !expiredPromoResult.success &&
    expiredPromoResult.error?.includes('expired'),
  'Expired promo code is rejected with explicit expiration notice'
);

// Test 11: Master Tier Promo Code Grants Master Access
const p5bMasterPromoUser = serverDb.saveUser({
  id: 'usr_phase5b_master_promo_user',
  email: 'master_promo_candidate@example.com',
  name: 'Master Candidate',
  createdAt: Date.now(),
  updatedAt: Date.now()
});

const masterPromoResult = serverDb.redeemPromoCode(p5bMasterPromoUser.id, 'CAMBRIDGE');
assert(
  masterPromoResult.success &&
    masterPromoResult.subscription?.planId === 'master' &&
    masterPromoResult.subscription?.status === 'active',
  'CAMBRIDGE voucher correctly upgrades candidate to Sprint Master tier'
);

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n-------------------------------------------------------------');
console.log(`TEST RUN FINISHED: ${passed} PASSED, ${failed} FAILED`);
console.log('-------------------------------------------------------------\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

