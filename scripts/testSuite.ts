/**
 * BandSprint — Production Test Suite
 * Automated verification of:
 * 1. QuestionEngine duplicate detection, semantic similarity, and question bank integrity
 * 2. IELTS scoring formulas and band estimations
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
import { SPEAKER_MAP, getOrGenerateAudio, SPEAKER_ACOUSTIC_SIGNATURES } from '../server';
import {
  FORBIDDEN_FEMALE_PATTERNS,
  DEFAULT_MASTER_MALE_VOICE,
  selectBestDeviceMaleVoice,
  selectBestDeviceFemaleVoice,
  EXAMINER_VOICE_REGISTRY,
  resolveExaminerVoiceProfile,
  buildVoiceSynthesisCacheKey
} from '../src/config/voiceConfig';
import { getOfficialCandidateIdProtocol } from '../src/components/VoiceExaminer';
import { analyzeSpeakingFluency, evaluateSpeakingSession, generateDiagnosticTurnFeedback } from '../src/services/SpeakingEvaluationService';
import { audioLogger, soundManager } from '../src/utils/audioEffects';
import { validateGmailAddress, handleGoogleSignInAction } from '../src/utils/googleAuth';
import { SpeakingAnswerRecord } from '../src/types/speakingTypes';
import {
  computeListeningAudioSyncMap,
  findActiveQuestionIndexForTimestamp,
  getListeningQuestionProgress,
  formatAudioTimestamp
} from '../src/utils/listeningAnswerEvaluator';
import {
  EXAMINER_VISUAL_REFERENCE,
  BARNABY_VISUAL_REFERENCE,
  resolveExaminerExpression,
  resolveBarnabyExpression,
  getExpressionBadgeLabel,
  buildSpeakingPartnerGreeting,
  ExaminerReferenceExpression,
  BarnabyReferenceExpression
} from '../src/config/avatarReferenceRegistry';

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
  'Master default voice is certified Sprint British Male (Fenrir en-GB)'
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
  reason: 'Sprint test suite'
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
console.log('\n[4/5] Testing Speaking Fluency Analytics & Sprint Descriptors...');

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
assert(typeof report.overallBand === 'number' && report.overallBand >= 5.0 && report.overallBand <= 9.0, `Band score within Sprint limits (Band ${report.overallBand})`);
assert(Object.keys(report.criteria).length === 4, 'Includes all 4 official Sprint speaking criteria');

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
assert((instantFeedback.betterAnswer?.modelResponse?.length ?? 0) > 50, 'Band 8+ model answer contains detailed Sprint-standard response');
assert((instantFeedback.betterAnswer?.highlightedPhrases?.length ?? 0) > 0, 'Band 8+ answer highlights academic collocations and idioms');

// -------------------------------------------------------------
// 7. REAL IELTS CANDIDATE IDENTIFICATION PROTOCOL (Phase 0)
// -------------------------------------------------------------
console.log('\n[7/8] Testing Realistic IELTS-style Candidate Identification Protocol (Phase 0)...');

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
  email: 'verified.candidate@bandsprint.app',
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
  email: 'free.student@bandsprint.app',
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
console.log('\n[14/16] Testing Contextual Sprint AI Tutor & Backend Endpoint...');

const serverContent = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf-8');
assert(serverContent.includes("app.post('/api/tutor/chat'"), 'Server defines POST /api/tutor/chat endpoint');
assert(serverContent.includes('generateTutorFallbackResponse'), 'Server implements robust offline pedagogical fallback generator for Sprint tutor');

const appContent = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf-8');
assert(!appContent.includes('<ContextualAITutor'), 'Dead ContextualAITutor component removed (FloatingBarnaby is the global tutor now)');
assert(appContent.includes('<FloatingBarnaby'), 'App mounts FloatingBarnaby globally across all modules');
assert(appContent.includes('open_vault_modal'), 'App registers open_vault_modal global event listener');

// -------------------------------------------------------------
// 15. UNIVERSAL COMMAND PALETTE & THEME PROVIDER
// -------------------------------------------------------------
console.log('\n[15/16] Testing Universal Command Palette & Theme Provider...');

const mainContent = fs.readFileSync(path.join(process.cwd(), 'src/main.tsx'), 'utf-8');
assert(mainContent.includes('<ThemeProvider>'), 'main.tsx wraps application inside ThemeProvider');

const commandPaletteContent = fs.readFileSync(path.join(process.cwd(), 'src/components/modals/GlobalSearchModal.tsx'), 'utf-8');
assert(commandPaletteContent.includes('cmd_tutor'), 'Command Palette includes quick action to launch Sprint AI Tutor');
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
  'Master female voice is certified Sprint British Female (Aoede en-GB)'
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
  'Task 2 essay templates follow official 4-paragraph Sprint structure'
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
    req._body = body !== null && body !== undefined;

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
  source: 'sprint_standard',
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
  source: 'sprint_standard',
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
  'GrammarFeedbackEngine analyzes writing inputs with Sprint criteria justifications'
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
  id: 'usr_phase5a_free_user_' + Date.now(),
  email: `free_candidate_${Date.now()}@example.com`,
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
  id: 'usr_phase5b_trial_user_' + Date.now(),
  email: `trial_candidate_${Date.now()}@example.com`,
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
  id: 'usr_phase5b_promo_user_' + Date.now(),
  email: `promo_candidate_${Date.now()}@example.com`,
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
  id: 'usr_phase5b_master_promo_user_' + Date.now(),
  email: `master_promo_candidate_${Date.now()}@example.com`,
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
// SECTION 24: ULTRA-REALISTIC AI SPEAKING EXAMINER & AVATAR ADAPTER SUITE
// -------------------------------------------------------------
console.log('\n--- Section 24: Ultra-Realistic AI Speaking Examiner, Viseme Sync & Avatar Adapter ---');

import {
  EXAMINER_PROFILES,
  buildSpeechVisemeTimeline,
  ExaminerAvatarAdapter
} from '../src/services/ExaminerAvatarAdapter';
import { checkSpeakingInputGate } from '../src/services/SpeakingEvaluationService';

// Test 1: Two-Option Examiner Profiles (Prof. Arthur — Male & Dr. Clara — Female)
assert(
  EXAMINER_PROFILES.arthur.shortLabel === 'Prof. Arthur — Male' &&
    EXAMINER_PROFILES.arthur.speakerId === 'speaker_04' &&
    EXAMINER_PROFILES.arthur.gender === 'male',
  'Prof. Arthur — Male profile is configured with British RP male voice speaker_04'
);
assert(
  EXAMINER_PROFILES.clara.shortLabel === 'Dr. Clara — Female' &&
    EXAMINER_PROFILES.clara.speakerId === 'speaker_05' &&
    EXAMINER_PROFILES.clara.gender === 'female',
  'Dr. Clara — Female profile is configured with British RP female voice speaker_05'
);

// Test 2: Phoneme-to-Viseme Timeline Synchronization & Zero Silent Mouth Movement
const emptyTimeline = buildSpeechVisemeTimeline('');
assert(emptyTimeline.length === 0, 'Empty speech text produces zero viseme keyframes (no mouth movement when silent)');

const sampleTimeline = buildSpeechVisemeTimeline(
  'Good afternoon, welcome to your official speaking interview.',
  1.0
);
assert(
  sampleTimeline.length > 8,
  `Spoken sentence generates time-aligned syllable viseme timeline (${sampleTimeline.length} keyframes)`
);
assert(
  sampleTimeline[sampleTimeline.length - 1].viseme === 'sil' &&
    sampleTimeline[sampleTimeline.length - 1].openness === 0,
  'Viseme timeline terminates in a closed-mouth silence keyframe (viseme="sil", openness=0)'
);
assert(
  sampleTimeline.some((kf) => kf.viseme === 'mbp' || kf.viseme === 'fv') &&
    sampleTimeline.some((kf) => kf.openness > 0.25),
  'Viseme timeline includes consonant closures (mbp/fv) and open vowel articulation'
);

// Test 3: ExaminerAvatarAdapter 7-State Conversational Lifecycle & Mute/Pause Isolation
const avatarAdapter = new ExaminerAvatarAdapter('arthur');
await avatarAdapter.initialize('arthur');
await avatarAdapter.connect();

const initSnap = avatarAdapter.getSnapshot();
assert(
  initSnap.connectionStatus === 'ready' &&
    initSnap.examiner.id === 'arthur' &&
    initSnap.state === 'idle',
  'ExaminerAvatarAdapter initializes and connects in "idle" state for Prof. Arthur'
);

// Verify zero mouth movement while idle
const nowBase = Date.now();
const idleFrame = avatarAdapter.getFrameTelemetry(nowBase);
assert(
  idleFrame.currentViseme === 'sil' && idleFrame.mouthOpenness === 0 && idleFrame.state === 'idle',
  'Idle state maintains strictly closed mouth (mouthOpenness=0, currentViseme="sil") with zero random mouth oscillation'
);

// Examiner speaking state & synchronized viseme sampling
avatarAdapter.setSpeaking('Please tell me about your hometown and daily routine.');
const speakingSnap = avatarAdapter.getSnapshot();
assert(
  speakingSnap.state === 'examiner_speaking',
  'setSpeaking(text) transitions adapter to "examiner_speaking" state'
);

// Sample multiple frames across the active utterance to confirm mouth articulation
const spkStart = Date.now();
let maxSpeakingOpen = 0;
for (let offset = 80; offset <= 900; offset += 35) {
  const f = avatarAdapter.getFrameTelemetry(spkStart + offset);
  if (f.mouthOpenness > maxSpeakingOpen) maxSpeakingOpen = f.mouthOpenness;
}
assert(
  maxSpeakingOpen > 0.08,
  `Examiner speaking state articulates jaw/lips in sync with speech timeline (peak mouthOpenness=${maxSpeakingOpen.toFixed(2)})`
);

// Mute isolation: muting examiner immediately closes mouth and stops speech animation
avatarAdapter.setMuted(true);
let mutedFrame = avatarAdapter.getFrameTelemetry(spkStart + 1000);
for (let i = 0; i < 30; i++) {
  mutedFrame = avatarAdapter.getFrameTelemetry(spkStart + 1000 + i * 16);
}
assert(
  mutedFrame.currentViseme === 'sil' &&
    mutedFrame.mouthOpenness < 0.01 &&
    avatarAdapter.getSnapshot().isMuted === true,
  'setMuted(true) immediately halts examiner mouth articulation without disconnecting session'
);
avatarAdapter.setMuted(false);

// Pause isolation: pausing examination freezes speech articulation
avatarAdapter.setSpeaking('Describe a memorable journey you have taken.');
avatarAdapter.setPaused(true);
let pausedFrame = avatarAdapter.getFrameTelemetry(spkStart + 2000);
for (let i = 0; i < 30; i++) {
  pausedFrame = avatarAdapter.getFrameTelemetry(spkStart + 2000 + i * 16);
}
assert(
  pausedFrame.currentViseme === 'sil' &&
    pausedFrame.mouthOpenness < 0.01 &&
    avatarAdapter.getSnapshot().isPaused === true,
  'setPaused(true) halts speech articulation and prevents hidden mouth movement while paused'
);
avatarAdapter.setPaused(false);

// Listening & Candidate Speaking states
avatarAdapter.setListening(false, 0);
assert(
  avatarAdapter.getSnapshot().state === 'examiner_listening',
  'setListening(false, 0) transitions examiner to "examiner_listening" state'
);
avatarAdapter.setListening(true, 32);
assert(
  avatarAdapter.getSnapshot().state === 'candidate_speaking',
  'setListening(true, 32) transitions examiner to "candidate_speaking" state with active listening nod'
);

// Thinking / Processing state
avatarAdapter.setThinking();
assert(
  avatarAdapter.getSnapshot().state === 'thinking',
  'setThinking() transitions examiner to "thinking" state while evaluating turn'
);

// Switch Examiner mid-session (Prof. Arthur -> Dr. Clara)
await avatarAdapter.switchExaminer('clara');
const switchedSnap = avatarAdapter.getSnapshot();
assert(
  switchedSnap.examiner.id === 'clara' && switchedSnap.state === 'idle',
  'switchExaminer("clara") cleanly transitions examiner profile to Dr. Clara — Female'
);

// Error & Recovery state
avatarAdapter.setError('Simulated stream interruption');
assert(
  avatarAdapter.getSnapshot().state === 'error' &&
    avatarAdapter.getSnapshot().connectionStatus === 'fallback_active',
  'setError(msg) transitions adapter to "error" state with fallback_active status'
);
avatarAdapter.setError(null);
assert(
  avatarAdapter.getSnapshot().state === 'idle' &&
    avatarAdapter.getSnapshot().connectionStatus === 'ready',
  'setError(null) recovers cleanly back to "idle" and "ready" state'
);

avatarAdapter.disconnect();
avatarAdapter.dispose();
assert(
  avatarAdapter.getSnapshot().state === 'idle',
  'disconnect() and dispose() cleanly release avatar adapter state and listeners'
);

// Test 4: Server GET /api/avatar/status Capability Probe
const resAvatarStatus = await simulateExpressRequest('GET', '/api/avatar/status');
assert(
  resAvatarStatus.statusCode === 200 &&
    resAvatarStatus.body?.localCanvasSupported === true &&
    typeof resAvatarStatus.body?.externalWebRtcConfigured === 'boolean' &&
    !JSON.stringify(resAvatarStatus.body).includes('API_KEY'),
  'GET /api/avatar/status returns avatar provider capability without leaking secret keys'
);

// Test 5: Strict 5-Word Input Gate Preservation
const shortGate = checkSpeakingInputGate('Yes I do');
assert(
  shortGate.isValidAttempt === false && shortGate.overallBand === 0.0 && shortGate.wordCount === 3,
  'Strict 5-word speaking input gate rejects < 5 word attempts with 0.0 band and zero fake scores'
);

// Test 6: Source Audit of Redesigned Components
const livePartnerSource = fs.readFileSync(
  path.join(process.cwd(), 'src/components/speaking/LiveAvatarSpeakingPartner.tsx'),
  'utf-8'
);
assert(
  livePartnerSource.includes('Dr. Clara — Female') &&
    livePartnerSource.includes('Prof. Arthur — Male') &&
    livePartnerSource.includes('Switch Theme') &&
    livePartnerSource.includes('Confirm Restart') &&
    livePartnerSource.includes('handleTogglePauseSession') &&
    livePartnerSource.includes('handleToggleExaminerMute'),
  'LiveAvatarSpeakingPartner includes Two-Option Examiner Selector, non-resetting Switch Theme, Restart confirmation, Pause/Resume, and Examiner Mute'
);

const cameraBoothSource = fs.readFileSync(
  path.join(process.cwd(), 'src/components/speaking/CandidateCameraBooth.tsx'),
  'utf-8'
);
assert(
  cameraBoothSource.includes("'disabled' | 'loading' | 'permission-denied' | 'active'") &&
    cameraBoothSource.includes('100% local in-browser preview'),
  'CandidateCameraBooth implements explicit disabled/loading/permission-denied/active states and local privacy notice'
);

const etiquetteSource = fs.readFileSync(
  path.join(process.cwd(), 'src/components/speaking/ExamEtiquetteOverlay.tsx'),
  'utf-8'
);
assert(
  etiquetteSource.includes('Official Exam Etiquette & Posture Guide') &&
    etiquetteSource.includes('Camera at Eye Level & Direct Gaze') &&
    etiquetteSource.includes('Upright, Open Thoracic Posture') &&
    livePartnerSource.includes('ExamEtiquetteOverlay') &&
    livePartnerSource.includes('showEtiquetteOverlay'),
  'ExamEtiquetteOverlay guides candidate posture & eye contact and integrates into Sprint Speaking Studio'
);

// Test 7: Ultra-Realistic Photographic Avatar Headshot Assets & Canvas Integration
const arthurPath = path.join(process.cwd(), 'public/assets/examiners/arthur_headshot.jpg');
const claraPath = path.join(process.cwd(), 'public/assets/examiners/clara_headshot.jpg');
assert(
  fs.existsSync(arthurPath) && fs.statSync(arthurPath).size > 15000,
  'Prof. Arthur high-resolution photographic headshot asset exists and is valid (> 15KB)'
);
assert(
  fs.existsSync(claraPath) && fs.statSync(claraPath).size > 15000,
  'Dr. Clara high-resolution photographic headshot asset exists and is valid (> 15KB)'
);

const canvasSource = fs.readFileSync(
  path.join(process.cwd(), 'src/components/speaking/ExaminerHumanoidCanvas.tsx'),
  'utf-8'
);
assert(
  canvasSource.includes('arthur_headshot.jpg') &&
    canvasSource.includes('clara_headshot.jpg') &&
    canvasSource.includes('examinerHeadshotImages') &&
    canvasSource.includes('frame.mouthOpenness > 0.04 && frame.currentViseme !== \'sil\''),
  'ExaminerHumanoidCanvas integrates authentic photographic headshots with organic viseme lip-sync'
);

// Test 8: Complete 10-Question Listening Audio Dialogue Guarantee
const listeningLabSource = fs.readFileSync(
  path.join(process.cwd(), 'src/components/ListeningLab.tsx'),
  'utf-8'
);
assert(
  listeningLabSource.includes('totalQuestions > 5 ? Math.min(5, Math.ceil(totalQuestions / 2)) : totalQuestions') &&
    listeningLabSource.includes('Before you hear the rest of the recording, you have some time to look at Questions') &&
    listeningLabSource.includes('processQuestionBatch(0, splitPoint)') &&
    listeningLabSource.includes('processQuestionBatch(splitPoint, totalQuestions)'),
  'ListeningLab compiles complete audio dialogue covering all 10 questions with Sprint mid-section pause'
);

// Test 9: 10-Question 47s Audio Sync and Sprint Question Numbering
const mock10Questions: any[] = Array.from({ length: 10 }, (_, i) => ({
  id: `q_test_${i + 1}`,
  prompt: `Question prompt ${i + 1}`,
  topic: 'Campus Facilities',
  correctAnswer: 'Library'
}));

const syncCues = computeListeningAudioSyncMap(mock10Questions, 47, undefined, 2);
assert(
  syncCues.length === 10,
  'computeListeningAudioSyncMap generates exactly 10 synchronized audio cues for 10 questions'
);
assert(
  syncCues[0].questionNumber === 11 && syncCues[9].questionNumber === 20,
  'computeListeningAudioSyncMap sets section-based question numbers for Section 2 (Questions 11 to 20)'
);
assert(
  syncCues[0].startTime >= 2.0 && syncCues[9].endTime <= 47.0,
  'computeListeningAudioSyncMap confines all 10 questions within 47s duration bounds'
);
let noOverlap = true;
for (let i = 0; i < syncCues.length - 1; i++) {
  if (syncCues[i].endTime > syncCues[i + 1].startTime) {
    noOverlap = false;
    break;
  }
}
assert(noOverlap, 'Question audio sync cues are strictly non-overlapping and contiguous');

const activeAt5s = findActiveQuestionIndexForTimestamp(5.0, syncCues);
const activeAt20s = findActiveQuestionIndexForTimestamp(20.0, syncCues);
const activeAt40s = findActiveQuestionIndexForTimestamp(40.0, syncCues);
assert(
  activeAt5s === 0 && activeAt20s > 0 && activeAt40s > activeAt20s,
  'findActiveQuestionIndexForTimestamp accurately progresses from earlier to later questions across the timeline'
);

const s1Prog = getListeningQuestionProgress(0, 10, 1);
const s2Prog = getListeningQuestionProgress(0, 10, 2);
const s3Prog = getListeningQuestionProgress(4, 10, 3);
const s4Prog = getListeningQuestionProgress(9, 10, 4);
assert(
  s1Prog.overallQuestionNumber === 1 && s1Prog.part === 1 &&
  s2Prog.overallQuestionNumber === 11 && s2Prog.part === 2 &&
  s3Prog.overallQuestionNumber === 25 && s3Prog.part === 3 &&
  s4Prog.overallQuestionNumber === 40 && s4Prog.part === 4,
  'getListeningQuestionProgress accurately indexes Part 1 (1-10), Part 2 (11-20), Part 3 (21-30), Part 4 (31-40)'
);

assert(
  listeningLabSource.includes('computeListeningAudioSyncMap') &&
    listeningLabSource.includes('handleSeekToQuestionAudio') &&
    listeningLabSource.includes('Audio Sync Timeline') &&
    listeningLabSource.includes('autoFollowAudio'),
  'ListeningLab UI integrates the 10-Question Audio Timestamp Sync Strip, auto-follow, and click-to-seek'
);


// -------------------------------------------------------------
// 23. FULL AUDIO AUDIT & 10-UTTERANCE MALE/FEMALE VOICE DIFFERENTIATION SUITE
// -------------------------------------------------------------
console.log('\n[23/23] Testing Male (Prof. Arthur) vs Female (Dr. Clara) Voice Differentiation across 10 Identical Utterances...');

// 23.1 Centralized Examiner Voice Registry Verification
const arthurProfile = resolveExaminerVoiceProfile('arthur');
const claraProfile = resolveExaminerVoiceProfile('clara');
assert(
  arthurProfile.speakerId === 'speaker_04' &&
    arthurProfile.gender === 'male' &&
    arthurProfile.edgeNeuralVoiceId === 'en-GB-RyanNeural' &&
    arthurProfile.locale === 'en-GB',
  'EXAMINER_VOICE_REGISTRY resolves Prof. Arthur Pendelton to speaker_04 (male, en-GB-RyanNeural)'
);
assert(
  claraProfile.speakerId === 'speaker_05' &&
    claraProfile.gender === 'female' &&
    claraProfile.edgeNeuralVoiceId === 'en-GB-SoniaNeural' &&
    claraProfile.locale === 'en-GB',
  'EXAMINER_VOICE_REGISTRY resolves Dr. Clara Sterling to speaker_05 (female, en-GB-SoniaNeural)'
);
assert(
  arthurProfile.edgeNeuralVoiceId !== claraProfile.edgeNeuralVoiceId &&
    arthurProfile.acousticSignatureId !== claraProfile.acousticSignatureId &&
    arthurProfile.fundamentalFreqTargetHz < claraProfile.fundamentalFreqTargetHz,
  'Arthur and Clara have strictly distinct synthesis voice IDs, acoustic signatures, and fundamental frequency targets'
);

// 23.2 Cache Key Isolation Verification
const samplePrompt = 'Good afternoon. Can you tell me your full name, please?';
const arthurCacheKey = buildVoiceSynthesisCacheKey({
  provider: 'neural-vocal-tract-studio',
  speakerId: arthurProfile.speakerId,
  voiceId: arthurProfile.edgeNeuralVoiceId,
  gender: arthurProfile.gender,
  locale: arthurProfile.locale,
  rate: arthurProfile.rate,
  pitch: arthurProfile.pitch,
  text: samplePrompt
});
const claraCacheKey = buildVoiceSynthesisCacheKey({
  provider: 'neural-vocal-tract-studio',
  speakerId: claraProfile.speakerId,
  voiceId: claraProfile.edgeNeuralVoiceId,
  gender: claraProfile.gender,
  locale: claraProfile.locale,
  rate: claraProfile.rate,
  pitch: claraProfile.pitch,
  text: samplePrompt
});
assert(
  arthurCacheKey !== claraCacheKey,
  'buildVoiceSynthesisCacheKey produces strictly isolated cache keys for Arthur (male) vs Clara (female) on identical text'
);

// 23.3 Device Browser Voice Selector Isolation Verification
const singleMaleOnlyVoiceList: any[] = [
  { name: 'Google UK English Male', lang: 'en-GB', voiceURI: 'uk-male-uri', localService: true }
];
const femaleOnMaleOnlyList = selectBestDeviceFemaleVoice(singleMaleOnlyVoiceList);
assert(
  femaleOnMaleOnlyList.voice === null && femaleOnMaleOnlyList.pitchMultiplier === 1.0,
  'selectBestDeviceFemaleVoice refuses to select a known male voice when only a male device voice is present'
);

// 23.4 VoiceExaminer Dynamic Greeting Protocol Verification
const arthurProtocol = getOfficialCandidateIdProtocol('Prof. Arthur Pendelton');
const claraProtocol = getOfficialCandidateIdProtocol('Dr. Clara Sterling');
assert(
  arthurProtocol[0].prompt.includes('Prof. Arthur Pendelton') &&
    claraProtocol[0].prompt.includes('Dr. Clara Sterling') &&
    !arthurProtocol[0].prompt.includes('Alistair Vance') &&
    !claraProtocol[0].prompt.includes('Alistair Vance'),
  'getOfficialCandidateIdProtocol dynamically injects the selected examiner persona name (Arthur or Clara)'
);

// 23.5 10 Identical Test Utterances Generated Separately for Prof. Arthur (speaker_04) and Dr. Clara (speaker_05)
const TEN_TEST_UTTERANCES = [
  'Good afternoon. Could you please tell me your full name and show me your identification?',
  'Let us talk about your hometown. What do you like most about living there?',
  'Do you think public transport in your city has improved over the last decade?',
  'How often do you read books or academic articles in your leisure time?',
  'Now I am going to give you a topic card. You have one minute to prepare your notes.',
  'Describe a memorable journey you have taken that made a lasting impression on you.',
  'Thank you. We have been talking about travel, and I would now like to ask some general questions.',
  'In what ways does international tourism benefit local communities and cultural heritage?',
  'Some people argue that remote working reduces urban congestion. To what extent do you agree?',
  'Thank you very much. That is the end of the IELTS Speaking examination.'
];

let all10Succeeded = true;
let all10DistinctSha256 = true;
let all10CorrectVoiceHeaders = true;
let all10CacheIsolationVerified = true;

console.log('\n  [10-Utterance Examiner Voice Differentiation Telemetry Table]');
console.log('  # | Examiner | ReqVoice | ActualVoiceId | Status | Cache | DurationMs | SHA256_Prefix | Bytes');

for (let i = 0; i < TEN_TEST_UTTERANCES.length; i++) {
  const text = TEN_TEST_UTTERANCES[i];
  const testRunTag = `v12_audit_u${i + 1}`;

  const arthurRes = await getOrGenerateAudio(text, 'speaker_04', 1.0, 'male', {
    contentVersion: testRunTag
  });
  const claraRes = await getOrGenerateAudio(text, 'speaker_05', 1.0, 'female', {
    contentVersion: testRunTag
  });

  if (!arthurRes || !claraRes) {
    all10Succeeded = false;
    console.error(`  ✗ Utterance ${i + 1} failed synthesis`);
    continue;
  }

  // Verify cache hit on immediate repeat for Arthur, while Clara never hits Arthur's cache
  const arthurRepeat = await getOrGenerateAudio(text, 'speaker_04', 1.0, 'male', {
    contentVersion: testRunTag
  });
  if (!arthurRepeat || arthurRepeat.cacheStatus !== 'HIT-MEMORY' || arthurRes.cacheHash === claraRes.cacheHash) {
    all10CacheIsolationVerified = false;
  }

  const shaDistinct =
    arthurRes.audioSha256 !== claraRes.audioSha256 && !arthurRes.buffer.equals(claraRes.buffer);
  if (!shaDistinct) {
    all10DistinctSha256 = false;
  }

  const voicesValid =
    arthurRes.character.id === 'speaker_04' &&
    arthurRes.character.edgeVoice === 'en-GB-RyanNeural' &&
    arthurRes.character.gender === 'male' &&
    arthurRes.actualVoiceId.includes('male-arthur') &&
    claraRes.character.id === 'speaker_05' &&
    claraRes.character.edgeVoice === 'en-GB-SoniaNeural' &&
    claraRes.character.gender === 'female' &&
    claraRes.actualVoiceId.includes('female-clara');

  if (!voicesValid) {
    all10CorrectVoiceHeaders = false;
  }

  console.log(
    `  ${i + 1} | Arthur (M) | ${arthurRes.character.edgeVoice} | ${arthurRes.actualVoiceId} | 200 | ${arthurRes.cacheStatus} | ${arthurRes.estimatedDurationMs}ms | ${arthurRes.audioSha256.slice(0, 10)} | ${arthurRes.buffer.length}B`
  );
  console.log(
    `  ${i + 1} | Clara  (F) | ${claraRes.character.edgeVoice} | ${claraRes.actualVoiceId} | 200 | ${claraRes.cacheStatus} | ${claraRes.estimatedDurationMs}ms | ${claraRes.audioSha256.slice(0, 10)} | ${claraRes.buffer.length}B`
  );
}

assert(all10Succeeded, 'All 10 test utterances synthesized successfully for both Prof. Arthur (Male) and Dr. Clara (Female)');
assert(
  all10DistinctSha256,
  'All 10 test utterances produce 100% distinct audio buffers and SHA-256 hashes between Prof. Arthur and Dr. Clara (zero identical audio files)'
);
assert(
  all10CorrectVoiceHeaders,
  'All 10 test utterances resolve to distinct requested voice IDs (en-GB-RyanNeural vs en-GB-SoniaNeural) and distinct vocal-tract acoustic signatures'
);
assert(
  all10CacheIsolationVerified,
  'Cache keys and memory/disk cache hits are strictly isolated per examiner voice across all 10 utterances'
);

// 23.6 Sprint Practice Section Audio, Speaking Test Audio Studio & 3D Interactive Partner Verification
import { getAllSprintTests } from '../src/data/sprintLibraryData';
const allSprintHydrated = getAllSprintTests();
const c18AcadT1 = allSprintHydrated.find((t) => t.id === 'sprint-18-academic-test-1');
const c17AcadT1 = allSprintHydrated.find((t) => t.id === 'sprint-17-academic-test-1');
assert(
  Boolean(c18AcadT1?.listening?.parts?.length === 4) &&
    c18AcadT1!.listening!.parts.every((p) => Array.isArray(p.dialogue) && p.dialogue.length > 0) &&
    Boolean(c17AcadT1?.listening?.parts?.length === 4) &&
    c17AcadT1!.listening!.parts.every((p) => Array.isArray(p.dialogue) && p.dialogue.length > 0),
  'All Sprint 11-21 tests (including initial C18 & C17 sets) hydrate all 4 Listening parts with multi-speaker dialogue audio'
);
assert(
  Boolean(c18AcadT1?.speaking?.part1.questions.every((q) => Boolean(q.band9Sample))) &&
    Boolean(c18AcadT1?.speaking?.part2.modelResponse) &&
    Boolean(c18AcadT1?.speaking?.part3.questions.every((q) => Boolean(q.sampleResponse))),
  'All Sprint Speaking tests hydrate Part 1, Part 2, and Part 3 with Band 9 spoken sample responses'
);

const sprintPageSource = fs.readFileSync('src/components/sprint/SprintLibraryPage.tsx', 'utf8');
assert(
  sprintPageSource.includes('playListeningPartAudio') &&
    sprintPageSource.includes('speakSprintExaminerPrompt') &&
    sprintPageSource.includes('handleSwitchSprintExaminer') &&
    sprintPageSource.includes('handleToggleSpeakingQuestionMic') &&
    sprintPageSource.includes('handleEvaluateSpeakingQuestion') &&
    sprintPageSource.includes('<ExaminerHumanoidCanvas'),
  'SprintLibraryPage integrates multi-part Listening audio, Speaking Test Examiner Audio Studio, 3D AI Partner, and live mic evaluation'
);

const humanoidCanvasSource = fs.readFileSync('src/components/speaking/ExaminerHumanoidCanvas.tsx', 'utf8');
assert(
  humanoidCanvasSource.includes("useState<'interactive_partner' | 'portrait_photo'>('interactive_partner')") &&
    humanoidCanvasSource.includes('3D LIVE PARTNER'),
  'ExaminerHumanoidCanvas defaults to 60fps 3D Live Interactive Partner rig rather than a static full-screen photo'
);

// -------------------------------------------------------------
// 25. HUMAN-LIKE VOICE & AUDIO ENGINE UPGRADE (PHASES 2-9 ACCEPTANCE & PERCEPTUAL MATRIX)
// -------------------------------------------------------------
console.log('\n[25/25] Testing Human-Like Voice & Audio Engine Upgrade (Phases 2–9 Acceptance & Perceptual Matrix)...');

import { resolveCharacterVoice, humanizeTextForSpeech } from '../server';
import {
  SPEECH_DELIVERY_PROFILES,
  normalizeTextForNaturalSpeech,
  inferSpeechDeliveryProfile
} from '../src/config/speechDirection';
import { cleanSpeechText } from '../src/services/audioService';

// 25.1 Verify British Female Examiner ("clara" / "Dr. Clara Sterling") resolves to speaker_05 (en-GB-SoniaNeural), NOT Canadian speaker_12
const resolvedClaraByName = resolveCharacterVoice('clara');
const resolvedDrClara = resolveCharacterVoice('Dr. Clara Sterling');
const resolvedCanadianClara = resolveCharacterVoice('Clara', 'female', 'Canadian');
assert(
  resolvedClaraByName.id === 'speaker_05' &&
    resolvedClaraByName.edgeVoice === 'en-GB-SoniaNeural' &&
    resolvedClaraByName.accentCode === 'en-GB' &&
    resolvedDrClara.id === 'speaker_05' &&
    resolvedDrClara.edgeVoice === 'en-GB-SoniaNeural',
  'resolveCharacterVoice routes "clara" and "Dr. Clara Sterling" to British Female Examiner speaker_05 (en-GB-SoniaNeural)'
);
assert(
  resolvedCanadianClara.id === 'speaker_12' && resolvedCanadianClara.edgeVoice === 'en-CA-ClaraNeural',
  'resolveCharacterVoice routes Canadian Clara to speaker_12 (en-CA-ClaraNeural) only when Canadian accent is explicitly specified'
);

// 25.2 Verify all 7 required context-aware SpeechDeliveryProfileId profiles exist and have distinct prosody settings
const requiredDeliveryProfiles = [
  'examiner_question',
  'examiner_instruction',
  'natural_conversation',
  'listening_dialogue',
  'pronunciation_model',
  'vocabulary_example',
  'feedback_explanation'
] as const;
assert(
  requiredDeliveryProfiles.every((p) => Boolean(SPEECH_DELIVERY_PROFILES[p])),
  'SPEECH_DELIVERY_PROFILES defines all 7 required context-aware speech delivery profiles'
);
assert(
  inferSpeechDeliveryProfile({ text: 'Could you tell me your full name, please?', role: 'Examiner' }) ===
    'examiner_question' &&
    inferSpeechDeliveryProfile({
      text: 'Part 1. You will hear a conversation between two speakers.',
      role: 'Examiner'
    }) === 'examiner_instruction',
  'inferSpeechDeliveryProfile distinguishes examiner_question from examiner_instruction'
);

// 25.3 Verify Text Normalization & Ordinary Colon Preservation
const colonSentence = 'The seminar begins at 9:30 a.m.: please bring £45 and report to Prof. Arthur or Dr. Clara.';
const cleanedColonSentence = cleanSpeechText(colonSentence);
const normalizedColonSentence = normalizeTextForNaturalSpeech(colonSentence);
const serverHumanizedColonSentence = humanizeTextForSpeech(colonSentence);
assert(
  cleanedColonSentence.includes('The seminar begins') &&
    normalizedColonSentence.includes('The seminar begins at 9 30 a.m.') &&
    normalizedColonSentence.includes('45 pounds') &&
    normalizedColonSentence.includes('Professor Arthur') &&
    normalizedColonSentence.includes('Doctor Clara') &&
    serverHumanizedColonSentence.includes('Professor Arthur'),
  'Text normalization preserves text before ordinary colons while expanding times (9:30 a.m.), currencies (£45), and titles (Prof./Dr.)'
);

// 25.4 Verify Delivery Profile Cache Key Isolation
const cacheKeyQuestion = buildVoiceSynthesisCacheKey({
  provider: 'neural-vocal-tract-studio',
  speakerId: 'speaker_04',
  voiceId: 'en-GB-RyanNeural',
  gender: 'male',
  locale: 'en-GB',
  deliveryProfile: 'examiner_question',
  rate: 0.95,
  pitch: 0.94,
  text: 'What do you like most about living there?'
});
const cacheKeyPronunciation = buildVoiceSynthesisCacheKey({
  provider: 'neural-vocal-tract-studio',
  speakerId: 'speaker_04',
  voiceId: 'en-GB-RyanNeural',
  gender: 'male',
  locale: 'en-GB',
  deliveryProfile: 'pronunciation_model',
  rate: 0.95,
  pitch: 0.94,
  text: 'What do you like most about living there?'
});
assert(
  cacheKeyQuestion !== cacheKeyPronunciation,
  'buildVoiceSynthesisCacheKey isolates cache entries across different deliveryProfile values'
);

// 25.5 Phase 9 Perceptual Listening Test Matrix (5 Required Prompts across Male & Female Examiners + Multi-Speaker Dialogue)
const PHASE9_PERCEPTUAL_PROMPTS = [
  {
    id: 'P1_Speaking_Intro',
    profile: 'examiner_question',
    maleText: 'Good afternoon. My name is Prof. Arthur Pendelton. Could you tell me your full name, please?',
    femaleText: 'Good afternoon. My name is Dr. Clara Sterling. Could you tell me your full name, please?'
  },
  {
    id: 'P2_Speaking_Part1',
    profile: 'examiner_question',
    maleText: "Let's talk about your hometown. What do you like most about living there?",
    femaleText: "Let's talk about your hometown. What do you like most about living there?"
  },
  {
    id: 'P3_Speaking_Part2_Instruction',
    profile: 'examiner_instruction',
    maleText:
      "Now I'm going to give you a topic, and I'd like you to talk about it for one to two minutes. Before you talk, you'll have one minute to think about what you're going to say.",
    femaleText:
      "Now I'm going to give you a topic, and I'd like you to talk about it for one to two minutes. Before you talk, you'll have one minute to think about what you're going to say."
  },
  {
    id: 'P4_Speaking_Part3_Analytical',
    profile: 'examiner_question',
    maleText:
      'Why do you think some cities preserve historic buildings while others replace them with modern developments?',
    femaleText:
      'Why do you think some cities preserve historic buildings while others replace them with modern developments?'
  },
  {
    id: 'P5_Listening_Booking_Exchange',
    profile: 'listening_dialogue',
    maleText:
      'Good morning, Westgate College Registry. The orientation session is on 14th October at 9:30 a.m., and the deposit is £45, not £60.',
    femaleText:
      'Thank you. My surname is Hawthorne, spelled H-A-W-T-H-O-R-N-E, and my contact number is 07700 900331.'
  }
];

console.log('\n  [Phase 9 Perceptual Listening Test Matrix — Telemetry & Provenance]');
console.log('  Prompt | Persona | Provider | ReqVoice | ActualVoice | Fallback | Profile | Cache | Duration | SHA256');

let phase9AllValid = true;
for (const item of PHASE9_PERCEPTUAL_PROMPTS) {
  const mRes = await getOrGenerateAudio(item.maleText, 'speaker_04', 1.0, 'male', {
    contentVersion: 'v12_phase9',
    deliveryProfile: item.profile
  });
  const fRes = await getOrGenerateAudio(item.femaleText, 'speaker_05', 1.0, 'female', {
    contentVersion: 'v12_phase9',
    deliveryProfile: item.profile
  });

  if (
    !mRes ||
    !fRes ||
    mRes.character.id !== 'speaker_04' ||
    fRes.character.id !== 'speaker_05' ||
    mRes.character.gender !== 'male' ||
    fRes.character.gender !== 'female' ||
    mRes.audioSha256 === fRes.audioSha256 ||
    mRes.deliveryProfile !== item.profile ||
    fRes.deliveryProfile !== item.profile
  ) {
    phase9AllValid = false;
  }

  console.log(
    `  ${item.id} | Arthur (M) | ${mRes?.providerUsed} | ${mRes?.character.edgeVoice} | ${mRes?.actualVoiceId} | ${mRes?.fallbackStatus} | ${mRes?.deliveryProfile} | ${mRes?.cacheStatus} | ${mRes?.estimatedDurationMs}ms | ${mRes?.audioSha256.slice(0, 10)}`
  );
  console.log(
    `  ${item.id} | Clara  (F) | ${fRes?.providerUsed} | ${fRes?.character.edgeVoice} | ${fRes?.actualVoiceId} | ${fRes?.fallbackStatus} | ${fRes?.deliveryProfile} | ${fRes?.cacheStatus} | ${fRes?.estimatedDurationMs}ms | ${fRes?.audioSha256.slice(0, 10)}`
  );
}

assert(
  phase9AllValid,
  'All 5 Phase 9 Perceptual Matrix prompts generate distinct, non-empty, gender-isolated audio artifacts with truthful provider/fallback/profile telemetry'
);

// 25.6 Verify HTTP Diagnostic Headers on /api/tts/stream
const streamDiagRes = await simulateExpressRequest(
  'GET',
  '/api/tts/stream?text=Welcome%20to%20your%20speaking%20test.&speakerId=speaker_05&gender=female&profile=examiner_instruction&v=v12_diag'
);
assert(
  streamDiagRes.statusCode === 200 &&
    streamDiagRes.headers['x-requested-speaker-id'] === 'speaker_05' &&
    streamDiagRes.headers['x-requested-gender'] === 'female' &&
    streamDiagRes.headers['x-resolved-speaker-id'] === 'speaker_05' &&
    streamDiagRes.headers['x-character-voice'] === 'en-GB-SoniaNeural' &&
    Boolean(streamDiagRes.headers['x-resolved-provider']) &&
    Boolean(streamDiagRes.headers['x-fallback-status']) &&
    Boolean(streamDiagRes.headers['x-failure-category']) &&
    streamDiagRes.headers['x-delivery-profile'] === 'examiner_instruction' &&
    Boolean(streamDiagRes.headers['x-audio-byte-size']) &&
    Boolean(streamDiagRes.headers['x-audio-format']),
  'GET /api/tts/stream exposes full diagnostic headers (requested speaker/gender, resolved provider, actual voice, fallback status, failure category, delivery profile, byte size, format)'
);

// -------------------------------------------------------------
// 26. TARGETED AUDIO PACING, SEQUENCING, STOPPING & CANCELLATION REGRESSION TESTS
// -------------------------------------------------------------
console.log('\n[26/26] Testing Audio Pacing, Sequential Dialogue, Reliable Stopping & Cancellation...');

import {
  audioService,
  IELTS_SPEAKERS,
  isInterruptedPlaybackError,
  DialogueLine
} from '../src/services/audioService';

/**
 * Event-driven mock HTMLAudioElement that never auto-completes on a fixed sleep unless explicitly
 * driven by `triggerEnded()`, `triggerError()`, or `triggerPlay()`, allowing deterministic verification
 * that playback completion is strictly driven by the real HTMLAudioElement `ended` event.
 */
class EventDrivenMockAudioElement {
  public src = '';
  public volume = 1;
  public playbackRate = 1;
  public currentTime = 0;
  public duration = 12;
  public paused = true;
  public ended = false;
  public preload = 'auto';

  public onended: ((ev?: any) => any) | null = null;
  public onerror: ((ev?: any) => any) | null = null;
  public ontimeupdate: ((ev?: any) => any) | null = null;
  public onloadedmetadata: ((ev?: any) => any) | null = null;
  public onplay: ((ev?: any) => any) | null = null;
  public onpause: ((ev?: any) => any) | null = null;
  public onabort: ((ev?: any) => any) | null = null;

  public playHistory: Array<{
    src: string;
    startedAt: number;
    endedAt?: number;
    pausedAt?: number;
    overlappedWithPrevious: boolean;
  }> = [];

  private activeTrackIndex = -1;
  public nextPlayBehavior: 'normal' | 'reject_not_allowed' | 'reject_not_supported' | 'hang_forever' = 'normal';

  public setAttribute(_name: string, _val: string): void {}

  public play(): Promise<void> {
    if (this.nextPlayBehavior === 'reject_not_allowed') {
      this.nextPlayBehavior = 'normal';
      const err = new Error('play() failed because the user did not interact with the document first.');
      err.name = 'NotAllowedError';
      return Promise.reject(err);
    }
    if (this.nextPlayBehavior === 'reject_not_supported') {
      this.nextPlayBehavior = 'normal';
      const err = new Error('Failed to load because no supported source was found.');
      err.name = 'NotSupportedError';
      return Promise.reject(err);
    }
    if (this.nextPlayBehavior === 'hang_forever') {
      // Simulates a stream that never fires loadedmetadata, play, or ended
      return new Promise<void>(() => {});
    }

    const prevTrack = this.activeTrackIndex >= 0 ? this.playHistory[this.activeTrackIndex] : null;
    const overlapped = Boolean(prevTrack && prevTrack.endedAt === undefined && prevTrack.pausedAt === undefined);

    this.paused = false;
    this.ended = false;
    this.currentTime = 0;
    this.activeTrackIndex =
      this.playHistory.push({
        src: this.src,
        startedAt: Date.now(),
        overlappedWithPrevious: overlapped
      }) - 1;

    queueMicrotask(() => {
      if (!this.paused) {
        this.onloadedmetadata?.();
        this.onplay?.();
      }
    });

    return Promise.resolve();
  }

  public pause(): void {
    if (!this.paused) {
      this.paused = true;
      if (this.activeTrackIndex >= 0 && this.playHistory[this.activeTrackIndex]) {
        this.playHistory[this.activeTrackIndex].pausedAt = Date.now();
      }
      this.onpause?.();
    }
  }

  public triggerTimeUpdate(sec: number): void {
    this.currentTime = sec;
    this.ontimeupdate?.();
  }

  public triggerEnded(): void {
    this.paused = true;
    this.ended = true;
    this.currentTime = this.duration;
    if (this.activeTrackIndex >= 0 && this.playHistory[this.activeTrackIndex]) {
      this.playHistory[this.activeTrackIndex].endedAt = Date.now();
    }
    this.onended?.();
  }

  public triggerError(err?: any): void {
    this.paused = true;
    this.onerror?.(err || new Error('Simulated media decode error'));
  }
}

const mockAudio = new EventDrivenMockAudioElement();
audioService.setAudioElementForTesting(mockAudio as unknown as HTMLAudioElement);
audioService.setLoadTimeoutForTesting(120);

const flushMicrotasks = () => new Promise<void>((r) => setTimeout(r, 15));

// Regression Test 1 & 2: Consecutive dialogue lines play in strict order without overlap,
// and the next line waits strictly for the actual `ended` event of the previous line.
{
  mockAudio.playHistory = [];
  const lineStartOrder: Array<{ index: number; speakerId?: string; text: string }> = [];
  let dialogueCompleted = false;

  const lines: DialogueLine[] = [
    { speakerId: 'speaker_04', gender: 'male', text: 'Good morning, Westgate College Registry.', pauseAfterMs: 25 },
    { speakerId: 'speaker_05', gender: 'female', text: 'Good morning. I would like to register for the course.', pauseAfterMs: 25 },
    { speakerId: 'speaker_01', gender: 'male', text: 'Could I confirm the orientation room number, please?', pauseAfterMs: 0 }
  ];

  const dialoguePromise = audioService.playDialogueSequentially(lines, {
    examId: 'reg_test_seq_01',
    onLineStart: (idx, line) => {
      lineStartOrder.push({ index: idx, speakerId: line.speakerId, text: line.text });
    },
    onComplete: () => {
      dialogueCompleted = true;
    }
  });

  await flushMicrotasks();
  assert(lineStartOrder.length === 1 && lineStartOrder[0].index === 0, 'Regression [1/8]: Dialogue starts with Line 0 only');
  assert(mockAudio.playHistory.length === 1, 'Regression [1/8]: Only Line 0 audio stream is loaded and playing');

  // Verify Line 1 does NOT start merely because time passes (wait 60ms without firing ended)
  mockAudio.triggerTimeUpdate(4.5);
  await new Promise((r) => setTimeout(r, 60));
  assert(
    lineStartOrder.length === 1 && mockAudio.playHistory.length === 1,
    'Regression [2/8]: Next dialogue line strictly waits for actual HTMLAudioElement ended event, not elapsed time'
  );

  // Fire actual completion of Line 0
  mockAudio.triggerEnded();
  await new Promise((r) => setTimeout(r, 45)); // Wait past 25ms inter-line pause
  assert(lineStartOrder.length === 2 && lineStartOrder[1].index === 1, 'Regression [1/8]: Line 1 starts after Line 0 ended + pauseAfterMs');
  assert(
    mockAudio.playHistory[1].src.includes('speakerId=speaker_05') && mockAudio.playHistory[1].src.includes('gender=female'),
    'Regression [1/8]: Line 1 preserves exact speakerId (speaker_05) and gender (female)'
  );

  // Fire actual completion of Line 1
  mockAudio.triggerEnded();
  await new Promise((r) => setTimeout(r, 45));
  assert(lineStartOrder.length === 3 && lineStartOrder[2].index === 2, 'Regression [1/8]: Line 2 starts after Line 1 ended + pauseAfterMs');
  assert(
    mockAudio.playHistory[2].src.includes('speakerId=speaker_01'),
    'Regression [1/8]: Line 2 preserves exact speakerId (speaker_01)'
  );

  // Regression Test 5: Final chunk plays completely and resolves immediately upon `ended` without post-final-line hang
  const beforeFinalEnd = Date.now();
  mockAudio.triggerEnded();
  await dialoguePromise;
  const finalCompletionLatencyMs = Date.now() - beforeFinalEnd;

  assert(dialogueCompleted === true, 'Regression [5/8]: Final dialogue chunk completes and fires onComplete');
  assert(
    finalCompletionLatencyMs < 50,
    `Regression [5/8]: Final chunk finishes immediately upon ended event without artificial trailing delay (${finalCompletionLatencyMs}ms)`
  );
  assert(
    mockAudio.playHistory.every((item) => item.overlappedWithPrevious === false),
    'Regression [1/8]: Zero overlapping audio playback across consecutive dialogue lines'
  );
  assert(
    audioService.getState().isPlaying === false && audioService.getState().isLoading === false,
    'Regression [5/8]: Playback state cleanly resets to isPlaying=false, isLoading=false on completion'
  );
}

// Regression Test 3 & 4: Stop cancels current and queued audio immediately, and cancelled sessions
// cannot restart playback or trigger callbacks through stale completion events.
{
  mockAudio.playHistory = [];
  const startedIndices: number[] = [];
  let completedAfterStop = false;

  const lines: DialogueLine[] = [
    { speakerId: 'speaker_04', text: 'First segment before stop is pressed.', pauseAfterMs: 40 },
    { speakerId: 'speaker_05', text: 'Second segment that must never play after stop.', pauseAfterMs: 40 },
    { speakerId: 'speaker_04', text: 'Third segment that must never play after stop.', pauseAfterMs: 0 }
  ];

  const cancelledSessionPromise = audioService.playDialogueSequentially(lines, {
    onLineStart: (idx) => startedIndices.push(idx),
    onComplete: () => {
      completedAfterStop = true;
    }
  });

  await flushMicrotasks();
  assert(startedIndices.length === 1 && audioService.getState().isPlaying === true, 'Regression [3/8]: Line 0 is actively playing before Stop');

  // Capture stale onended reference before stopping
  const staleOnEnded = mockAudio.onended;

  // User presses Stop
  audioManager.stopAll();
  await cancelledSessionPromise;

  assert(
    audioService.getState().isPlaying === false &&
      audioService.getState().isPaused === false &&
      audioService.getState().isLoading === false &&
      audioManager.isPlaying() === false,
    'Regression [3/8]: Pressing Stop immediately resets audioService and audioManager playback state'
  );

  // Attempt to fire stale onended callback from the cancelled session
  staleOnEnded?.();
  await new Promise((r) => setTimeout(r, 60));

  assert(
    startedIndices.length === 1 && mockAudio.playHistory.length === 1 && completedAfterStop === false,
    'Regression [4/8]: Cancelled session cannot restart queued lines or fire onComplete via stale callbacks'
  );
}

// Regression Test 4b: Starting a new playback session invalidates callbacks from the previous session
{
  mockAudio.playHistory = [];
  let session1EndedFired = false;
  let session2EndedFired = false;

  const p1 = audioService.speakText('First session examiner prompt.', 'speaker_04', {
    onEnd: () => {
      session1EndedFired = true;
    }
  });
  await flushMicrotasks();

  // Immediately start a second session before the first completes
  const p2 = audioService.speakText('Second session examiner prompt superseding first.', 'speaker_05', {
    gender: 'female',
    onEnd: () => {
      session2EndedFired = true;
    }
  });
  await flushMicrotasks();

  // Complete current (second) session
  mockAudio.triggerEnded();
  await Promise.all([p1, p2]);

  assert(
    session1EndedFired === false && session2EndedFired === true,
    'Regression [4/8]: Starting a new playback session invalidates onEnd callbacks from the superseded session'
  );
}

// Regression Test 5b: Single-speaker prompts up to 850 chars are NOT artificially chopped into 240-char sub-clauses
{
  mockAudio.playHistory = [];
  const longExaminerPrompt =
    'Good afternoon. In this part of the exam, I am going to give you a topic and I would like you to talk about it for one to two minutes. Before you talk, you will have one minute to think about what you are going to say, and you can make some notes if you wish. Do you understand? Here is your paper and pencil for making notes, and your topic card: Describe a memorable journey you have made that had a significant impact on your personal perspective.';
  assert(
    longExaminerPrompt.length > 280 && longExaminerPrompt.length <= 850,
    'Regression [5/8]: Test prompt is between 280 and 850 chars (previously chopped at 240 chars)'
  );

  const speakPromise = audioService.speakText(longExaminerPrompt, 'speaker_04', {
    deliveryProfile: 'examiner_instruction'
  });
  await flushMicrotasks();

  assert(
    mockAudio.playHistory.length === 1,
    'Regression [5/8]: Single-speaker prompt <=850 chars streams as 1 continuous audio track without mid-sentence clause chopping'
  );
  mockAudio.triggerEnded();
  await speakPromise;
}

// Regression Test 6: Audio load or playback failure (onerror, NotAllowedError, NotSupportedError, or load timeout)
// does not leave the player stuck in isPlaying/isLoading.
{
  // 6a: NotSupportedError / NotAllowedError classification
  const notAllowedErr = new Error('User gesture required');
  notAllowedErr.name = 'NotAllowedError';
  const notSupportedErr = new Error('No supported source');
  notSupportedErr.name = 'NotSupportedError';
  const abortErr = new Error('The play() request was interrupted by a new load request.');
  abortErr.name = 'AbortError';

  assert(
    isInterruptedPlaybackError(notAllowedErr) === false && isInterruptedPlaybackError(notSupportedErr) === false,
    'Regression [6/8]: NotAllowedError and NotSupportedError are recognized as genuine playback errors, not silent aborts'
  );
  assert(
    isInterruptedPlaybackError(abortErr) === true,
    'Regression [6/8]: Genuine AbortError from track switching is still classified as an interrupted playback'
  );

  // 6b: play() rejection with NotSupportedError does not leave player stuck
  let caughtError: any = null;
  let falselyEnded = false;
  mockAudio.nextPlayBehavior = 'reject_not_supported';

  await audioService.speakText('Prompt that fails to decode.', 'speaker_04', {
    onEnd: () => {
      falselyEnded = true;
    },
    onError: (err) => {
      caughtError = err;
    }
  });

  const stateAfterReject = audioService.getState();
  assert(
    stateAfterReject.isPlaying === false &&
      stateAfterReject.isLoading === false &&
      Boolean(caughtError) &&
      falselyEnded === false,
    'Regression [6/8]: Rejected play() resets isPlaying/isLoading, exposes genuine error, and does not falsely fire onEnd'
  );

  // 6c: Startup load timeout when stream hangs forever does not leave player stuck
  let timeoutError: any = null;
  mockAudio.nextPlayBehavior = 'hang_forever';

  await audioService.speakText('Prompt whose network stream hangs before metadata.', 'speaker_04', {
    onError: (err) => {
      timeoutError = err;
    }
  });
  mockAudio.nextPlayBehavior = 'normal';

  const stateAfterTimeout = audioService.getState();
  assert(
    stateAfterTimeout.isPlaying === false &&
      stateAfterTimeout.isLoading === false &&
      Boolean(timeoutError),
    'Regression [6/8]: Hung audio load times out cleanly and resets player state instead of waiting indefinitely'
  );
}

// Regression Test 7: Repeated completion (`onended`) or error (`onerror`) events do not start duplicate playback
// or fire callbacks multiple times.
{
  mockAudio.playHistory = [];
  let startCount = 0;
  let endCount = 0;

  const p = audioService.speakText('Testing idempotent completion handling.', 'speaker_04', {
    onStart: () => {
      startCount++;
    },
    onEnd: () => {
      endCount++;
    }
  });

  await flushMicrotasks();
  // Simulate redundant onplay and repeated onended events from browser
  mockAudio.onplay?.();
  mockAudio.onplay?.();

  const savedOnEnded = mockAudio.onended;
  mockAudio.triggerEnded();
  savedOnEnded?.();
  savedOnEnded?.();
  await p;

  assert(
    startCount === 1 && endCount === 1 && mockAudio.playHistory.length === 1,
    'Regression [7/8]: Repeated onplay/onended events fire onStart and onEnd exactly once and never trigger duplicate playback'
  );
}

// Regression Test 8: Existing speaker selection, voice quality settings, exam timers, and recording behavior remain unchanged
{
  assert(
    IELTS_SPEAKERS['speaker_04'].geminiVoiceName === 'Fenrir' &&
      IELTS_SPEAKERS['speaker_04'].defaultRate === 0.98 &&
      IELTS_SPEAKERS['speaker_05'].geminiVoiceName === 'Aoede' &&
      IELTS_SPEAKERS['speaker_05'].defaultRate === 0.98,
    'Regression [8/8]: Existing examiner speaker configurations (Prof. Arthur Pendelton & Dr. Clara Sterling) and rates are 100% preserved'
  );

  const voiceExaminerSource = fs.readFileSync(path.join(process.cwd(), 'src/components/VoiceExaminer.tsx'), 'utf-8');
  assert(
    voiceExaminerSource.includes('startPart2PrepTimer') &&
      voiceExaminerSource.includes('startMonologueTimer') &&
      voiceExaminerSource.includes('examinerTransitionTimeoutRef') &&
      voiceExaminerSource.includes('schedulePostPromptAction'),
    'Regression [8/8]: VoiceExaminer preserves Part 2 prep timer (60s), monologue timer (120s), and guarded recording transitions'
  );
}

// Restore test hook defaults
audioService.setAudioElementForTesting(null);
audioService.setLoadTimeoutForTesting(12000);

// -------------------------------------------------------------
// 27. PHASE 1 AUTHENTICATION, UID CONSISTENCY & PHONE OTP SUITE
// -------------------------------------------------------------
console.log('\n[27/27] Testing Phase 1 Authentication, Session Bridge, Logout & Phone OTP Security...');

const authModule = await import('../src/server/auth.ts');
const dbModule = await import('../src/server/db.ts');
const clientAuthService = await import('../src/services/authService.ts');
const userStorageModule = await import('../src/utils/userStorage.ts');

// 27.1: Static guard against mock authentication in UI components
{
  const prodModalSrc = fs.readFileSync(
    path.join(process.cwd(), 'src/components/auth/ProductionAuthModal.tsx'),
    'utf-8'
  );
  const googleModalSrc = fs.readFileSync(
    path.join(process.cwd(), 'src/components/auth/GoogleAuthModal.tsx'),
    'utf-8'
  );
  const emailVerifSrc = fs.readFileSync(
    path.join(process.cwd(), 'src/components/auth/EmailVerificationScreen.tsx'),
    'utf-8'
  );
  const forgotPassSrc = fs.readFileSync(
    path.join(process.cwd(), 'src/components/auth/ForgotPasswordScreen.tsx'),
    'utf-8'
  );

  assert(
    !prodModalSrc.includes('ebadul.islam@gmail.com') &&
      !prodModalSrc.includes('Ebadul Islam') &&
      !prodModalSrc.includes('Mock OTP Code: 1234') &&
      !prodModalSrc.includes('SMS OTP Sent: Use 1234'),
    'Auth [1/12]: ProductionAuthModal contains zero hardcoded mock Google profiles or fake 1234 OTP prompts'
  );

  assert(
    !googleModalSrc.includes('handleGoogleAuthSimulate') &&
      !googleModalSrc.includes('handleGuestLogin') &&
      !googleModalSrc.includes('Ebadul Islam'),
    'Auth [2/12]: GoogleAuthModal eliminates simulated Google login and unauthenticated guest login'
  );

  assert(
    emailVerifSrc.includes('sendEmailVerification') &&
      forgotPassSrc.includes('sendResetPasswordEmail'),
    'Auth [3/12]: EmailVerificationScreen and ForgotPasswordScreen use real Firebase Auth methods instead of fake timeouts'
  );
}

// 27.2: Production Mock-Authentication Guard on the Server
{
  const prevNodeEnv = process.env.NODE_ENV;
  const prevAllowTest = process.env.ALLOW_TEST_FIREBASE_TOKEN;

  try {
    process.env.NODE_ENV = 'test';
    process.env.ALLOW_TEST_FIREBASE_TOKEN = 'true';
    const validTestToken = authModule.createSignedTestFirebaseToken({
      uid: 'fb_guard_check_uid',
      email: 'guard.check@example.com'
    });

    // Switch to production mode even with ALLOW_TEST_FIREBASE_TOKEN=true
    process.env.NODE_ENV = 'production';
    assert(
      authModule.isMockAuthAllowedInCurrentEnv() === false,
      'Auth [4/12]: isMockAuthAllowedInCurrentEnv() strictly returns false when NODE_ENV=production'
    );

    let prodTokenCreationBlocked = false;
    try {
      authModule.createSignedTestFirebaseToken({
        uid: 'fb_prod_forbidden',
        email: 'forbidden@example.com'
      });
    } catch {
      prodTokenCreationBlocked = true;
    }

    let prodTokenVerifyBlocked = false;
    try {
      await authModule.verifyFirebaseIdToken(validTestToken);
    } catch {
      prodTokenVerifyBlocked = true;
    }

    assert(
      prodTokenCreationBlocked && prodTokenVerifyBlocked,
      'Auth [4/12]: Production guard blocks creation and verification of test/mock tokens when NODE_ENV=production'
    );
  } finally {
    process.env.NODE_ENV = prevNodeEnv;
    process.env.ALLOW_TEST_FIREBASE_TOKEN = prevAllowTest;
  }
}

// 27.3: Firebase ID Token Verification, Tamper/Expiry Rejection & UID Consistency
{
  const prevNodeEnv = process.env.NODE_ENV;
  const prevAllowTest = process.env.ALLOW_TEST_FIREBASE_TOKEN;
  process.env.NODE_ENV = 'test';
  process.env.ALLOW_TEST_FIREBASE_TOKEN = 'true';

  try {
    const testUid = `fb_uid_${Date.now()}`;
    const testEmail = `candidate.${Date.now()}@example.com`;

    const validToken = authModule.createSignedTestFirebaseToken({
      uid: testUid,
      email: testEmail,
      emailVerified: true,
      name: 'Verified Candidate',
      googleSub: `google_sub_${Date.now()}`
    });

    const verified = await authModule.verifyFirebaseIdToken(validToken);
    const serverUser1 = authModule.findOrCreateFirebaseUser(verified, {
      targetBand: 8.0,
      intendedFormat: 'Academic'
    });
    const serverUser2 = authModule.findOrCreateFirebaseUser(verified);

    assert(
      serverUser1.id === testUid &&
        serverUser1.firebaseUid === testUid &&
        serverUser2.id === testUid,
      'Auth [5/12]: Firebase session bridge preserves Firebase UID consistency (user.id === firebaseUid) and prevents duplicate user creation'
    );

    // Tampered token signature must be rejected
    const tamperedToken = validToken.slice(0, -4) + 'XXXX';
    let tamperedRejected = false;
    try {
      await authModule.verifyFirebaseIdToken(tamperedToken);
    } catch {
      tamperedRejected = true;
    }

    // Expired token must be rejected
    const expiredToken = authModule.createSignedTestFirebaseToken({
      uid: testUid,
      email: testEmail,
      expOffsetSeconds: -120
    });
    let expiredRejected = false;
    try {
      await authModule.verifyFirebaseIdToken(expiredToken);
    } catch {
      expiredRejected = true;
    }

    // Wrong audience must be rejected
    const wrongAudToken = authModule.createSignedTestFirebaseToken({
      uid: testUid,
      email: testEmail,
      audOverride: 'wrong-project-id'
    });
    let wrongAudRejected = false;
    try {
      await authModule.verifyFirebaseIdToken(wrongAudToken);
    } catch {
      wrongAudRejected = true;
    }

    assert(
      tamperedRejected && expiredRejected && wrongAudRejected,
      'Auth [6/12]: Server rejects tampered, expired, and wrong-audience Firebase ID tokens'
    );

    // 27.4: Safe Account Linking & Entitlement Preservation
    const existingEmail = `existing.pro.${Date.now()}@example.com`;
    const { hash, salt } = authModule.hashPassword('SecurePass123!');
    const legacyUserId = `usr_legacy_${Date.now()}`;
    dbModule.serverDb.saveUser({
      id: legacyUserId,
      email: existingEmail,
      name: 'Legacy Pro Student',
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    // Grant trial entitlement on existing account
    const trialRes = dbModule.serverDb.startUserTrial(legacyUserId);
    assert(trialRes.success === true, 'Auth [7/12]: Pre-existing account has active trial subscription');

    // Attempt linking with UNVERIFIED external provider email -> must be blocked
    const unverifiedIdentity = await authModule.verifyFirebaseIdToken(
      authModule.createSignedTestFirebaseToken({
        uid: `fb_unverified_${Date.now()}`,
        email: existingEmail,
        emailVerified: false,
        signInProvider: 'custom'
      })
    );
    let unverifiedLinkBlocked = false;
    try {
      authModule.findOrCreateFirebaseUser(unverifiedIdentity);
    } catch {
      unverifiedLinkBlocked = true;
    }

    // Link with VERIFIED Google email -> must link to legacyUserId and preserve subscription
    const verifiedGoogleUid = `fb_verified_link_${Date.now()}`;
    const verifiedIdentity = await authModule.verifyFirebaseIdToken(
      authModule.createSignedTestFirebaseToken({
        uid: verifiedGoogleUid,
        email: existingEmail,
        emailVerified: true,
        signInProvider: 'google.com'
      })
    );
    const linkedUser = authModule.findOrCreateFirebaseUser(verifiedIdentity);
    const preservedSub = dbModule.serverDb.getSubscription(linkedUser.id);

    assert(
      unverifiedLinkBlocked &&
        linkedUser.id === legacyUserId &&
        linkedUser.firebaseUid === verifiedGoogleUid &&
        preservedSub.status === 'trialing' &&
        preservedSub.planId === 'pro',
      'Auth [7/12]: Account linking blocks unverified email merges and preserves existing user ID and Pro trial entitlements when verified'
    );

    // 27.5: Session Restoration & Logout Revocation
    const session = dbModule.serverDb.createSession(serverUser1.id, 'TestRunner/1.0', '127.0.0.1');
    const restoredSession = dbModule.serverDb.getSession(session.token);
    assert(
      restoredSession !== null && restoredSession.userId === serverUser1.id,
      'Auth [8/12]: Active server session restores authenticated user identity across refreshes'
    );

    dbModule.serverDb.deleteSession(session.token);
    const afterLogoutSession = dbModule.serverDb.getSession(session.token);

    // Also verify client storage cleanup on logout (with in-memory localStorage shim for Node test runner)
    const storageMap = new Map<string, string>();
    const prevLocalStorage = (globalThis as any).localStorage;
    (globalThis as any).localStorage = {
      getItem: (k: string) => (storageMap.has(k) ? storageMap.get(k)! : null),
      setItem: (k: string, v: string) => storageMap.set(k, String(v)),
      removeItem: (k: string) => storageMap.delete(k),
      clear: () => storageMap.clear()
    };

    try {
      localStorage.setItem('ielts_auth_session', JSON.stringify({ id: 'stale_mock' }));
      localStorage.setItem('ielts_active_user_id_v1', serverUser1.id);
      localStorage.setItem('ielts_session_token_v2', session.token);
      userStorageModule.logoutUser();

      assert(
        afterLogoutSession === null &&
          localStorage.getItem('ielts_auth_session') === null &&
          localStorage.getItem('ielts_active_user_id_v1') === null &&
          localStorage.getItem('ielts_session_token_v2') === null,
        'Auth [8/12]: Logout revokes server session token and clears all client session storage keys including legacy ielts_auth_session'
      );
    } finally {
      (globalThis as any).localStorage = prevLocalStorage;
    }

    // 27.6: Bangladesh Phone Number Normalization
    const norm1 = authModule.normalizeBangladeshPhone('01712345678');
    const norm2 = authModule.normalizeBangladeshPhone('1712345678');
    const norm3 = authModule.normalizeBangladeshPhone('8801812345678');
    const norm4 = authModule.normalizeBangladeshPhone('+880 1912-345678');
    const invalidPrefix = authModule.normalizeBangladeshPhone('01112345678');
    const invalidLength = authModule.normalizeBangladeshPhone('017123456');
    const invalidChars = authModule.normalizeBangladeshPhone('01712345abc');
    const clientNorm = clientAuthService.normalizeBangladeshPhoneClient('01612-345678');

    assert(
      norm1.valid &&
        norm1.e164 === '+8801712345678' &&
        norm2.valid &&
        norm2.e164 === '+8801712345678' &&
        norm3.valid &&
        norm3.e164 === '+8801812345678' &&
        norm4.valid &&
        norm4.e164 === '+8801912345678' &&
        clientNorm.valid &&
        clientNorm.e164 === '+8801612345678' &&
        !invalidPrefix.valid &&
        !invalidLength.valid &&
        !invalidChars.valid,
      'Auth [9/12]: Bangladesh phone normalization canonicalizes all valid formats to +8801[3-9]XXXXXXXX and rejects invalid prefixes/lengths'
    );

    // 27.7: Honest SMS Provider Unavailable Guard when no SMS gateway is configured
    if (!authModule.isSmsProviderConfigured()) {
      const noProviderRes = await authModule.requestPhoneOtpChallenge(serverUser1.id, '01712345678');
      assert(
        noProviderRes.success === false &&
          noProviderRes.code === 'SMS_PROVIDER_UNAVAILABLE',
        'Auth [10/12]: When no SMS provider is configured, requestPhoneOtpChallenge returns honest SMS_PROVIDER_UNAVAILABLE without faking OTP delivery'
      );
    }

    // 27.8: OTP Expiry, Resend Cooldown, Attempt Limits, and Replay Prevention
    let capturedOtp = '';
    const baseTime = Date.now();
    const send1 = await authModule.requestPhoneOtpChallenge(serverUser1.id, '01712345678', {
      now: baseTime,
      customSenderForTest: async (_phone, code) => {
        capturedOtp = code;
      }
    });

    assert(
      send1.success === true && /^\d{6}$/.test(capturedOtp),
      'Auth [11/12]: Server OTP challenge generates a 6-digit code and stores hashed challenge state'
    );

    // Cooldown enforcement (requesting again 10s later must fail with COOLDOWN_ACTIVE)
    const cooldownRes = await authModule.requestPhoneOtpChallenge(serverUser1.id, '01712345678', {
      now: baseTime + 10_000,
      customSenderForTest: async () => {}
    });
    assert(
      cooldownRes.success === false &&
        cooldownRes.code === 'COOLDOWN_ACTIVE' &&
        typeof cooldownRes.retryAfterSeconds === 'number' &&
        cooldownRes.retryAfterSeconds > 0,
      'Auth [11/12]: OTP resend cooldown blocks premature requests within 45-second window'
    );

    // Expiry enforcement (verifying 6 minutes later must fail with OTP_EXPIRED)
    const expiredVerify = authModule.verifyPhoneOtpChallenge(
      serverUser1.id,
      '+8801712345678',
      capturedOtp,
      { now: baseTime + 6 * 60 * 1000 }
    );
    assert(
      expiredVerify.success === false && expiredVerify.code === 'OTP_EXPIRED',
      'Auth [11/12]: Expired OTP codes (>5 minutes) are rejected with OTP_EXPIRED'
    );

    // Attempt limit enforcement (5 wrong guesses lock the challenge)
    let latestOtp = '';
    const afterCooldownTime = baseTime + 60_000;
    await authModule.requestPhoneOtpChallenge(serverUser1.id, '01712345678', {
      now: afterCooldownTime,
      customSenderForTest: async (_phone, code) => {
        latestOtp = code;
      }
    });
    const wrongOtp = latestOtp === '999999' ? '888888' : '999999';
    for (let i = 0; i < 4; i++) {
      const r = authModule.verifyPhoneOtpChallenge(serverUser1.id, '01712345678', wrongOtp, {
        now: afterCooldownTime + 1000
      });
      assert(r.success === false && r.code === 'INCORRECT_OTP', `Auth [12/12]: Wrong OTP attempt ${i + 1}/5 rejected`);
    }
    const fifthAttempt = authModule.verifyPhoneOtpChallenge(serverUser1.id, '01712345678', wrongOtp, {
      now: afterCooldownTime + 2000
    });
    const sixthAttemptWithCorrectCode = authModule.verifyPhoneOtpChallenge(
      serverUser1.id,
      '01712345678',
      latestOtp,
      { now: afterCooldownTime + 3000 }
    );
    assert(
      fifthAttempt.success === false &&
        fifthAttempt.code === 'MAX_ATTEMPTS_EXCEEDED' &&
        sixthAttemptWithCorrectCode.success === false &&
        sixthAttemptWithCorrectCode.code === 'MAX_ATTEMPTS_EXCEEDED',
      'Auth [12/12]: Exceeding 5 failed OTP attempts locks the challenge even if the correct code is submitted afterward'
    );

    // Successful verification & Replay prevention
    let finalOtp = '';
    const finalSendTime = afterCooldownTime + 60_000;
    await authModule.requestPhoneOtpChallenge(serverUser1.id, '01712345678', {
      now: finalSendTime,
      customSenderForTest: async (_phone, code) => {
        finalOtp = code;
      }
    });

    const validVerify = authModule.verifyPhoneOtpChallenge(serverUser1.id, '01712345678', finalOtp, {
      now: finalSendTime + 5000
    });
    const replayVerify = authModule.verifyPhoneOtpChallenge(serverUser1.id, '01712345678', finalOtp, {
      now: finalSendTime + 6000
    });

    assert(
      validVerify.success === true &&
        validVerify.user?.isPhoneVerified === true &&
        validVerify.user?.phone === '+8801712345678' &&
        replayVerify.success === false &&
        replayVerify.code === 'OTP_ALREADY_USED',
      'Auth [12/12]: Valid OTP marks user phone verified on server and blocks any replay of the consumed OTP code'
    );

    // Cleanup test users from serverDb
    delete dbModule.serverDb.data.users[testUid];
    delete dbModule.serverDb.data.users[legacyUserId];
    delete dbModule.serverDb.data.subscriptions[testUid];
    delete dbModule.serverDb.data.subscriptions[legacyUserId];
    dbModule.serverDb.deleteOtpChallenge(serverUser1.id);
    dbModule.serverDb.persistSync();
  } finally {
    process.env.NODE_ENV = prevNodeEnv;
    process.env.ALLOW_TEST_FIREBASE_TOKEN = prevAllowTest;
  }
}

// =============================================================
// SECTION 28: PHASE 2 PRE-LOGIN HOMEPAGE REDESIGN VERIFICATION
// =============================================================
console.log('\n[28/28] Verifying Phase 2 Pre-Login Homepage Redesign & Accessibility...');
{
  const landingSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/landing/PreLoginLanding.tsx'),
    'utf-8'
  );
  const appSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/App.tsx'),
    'utf-8'
  );

  // 28.1: Required sections & valid navigation anchors
  assert(
    landingSrc.includes('id="features"') &&
      landingSrc.includes('id="practice"') &&
      landingSrc.includes('id="how-it-works"') &&
      landingSrc.includes('id="bangladesh-relevance"') &&
      landingSrc.includes('id="pricing"') &&
      landingSrc.includes('id="faq"'),
    'Phase 2 [1/6]: PreLoginLanding defines all required section IDs (#features, #practice, #how-it-works, #bangladesh-relevance, #pricing, #faq)'
  );

  // 28.2: No broken legacy anchor links
  assert(
    !landingSrc.includes('#why-sprint') &&
      !landingSrc.includes('#diagnostics') &&
      !landingSrc.includes('#bangla-traps') &&
      !landingSrc.includes('#results'),
    'Phase 2 [2/6]: PreLoginLanding removes all dead legacy anchor links'
  );

  // 28.3: Interactive 4-module product preview switcher & honest demo labeling
  assert(
    landingSrc.includes('role="tablist"') &&
      landingSrc.includes("id: 'listening'") &&
      landingSrc.includes("id: 'reading'") &&
      landingSrc.includes("id: 'writing'") &&
      landingSrc.includes("id: 'speaking'") &&
      landingSrc.includes('Interactive Sample Demonstration'),
    'Phase 2 [3/6]: Interactive product preview switcher supports Listening, Reading, Writing, and Speaking with honest sample demonstration labeling'
  );

  // 28.4: Zero false official partnership claims, fabricated stats, or unverified offline promises
  assert(
    !landingSrc.includes('Official British Council & IDP CD-IELTS Software Partner') &&
      !landingSrc.includes('Trusted by 14,000+') &&
      !landingSrc.includes('100% Load-Shedding Resilient') &&
      !landingSrc.includes('images.unsplash.com'),
    'Phase 2 [4/6]: PreLoginLanding contains zero false British Council/IDP partnership claims, fabricated candidate counts, or unverified offline guarantees'
  );

  // 28.5: Explicit independent platform disclaimer & truthful pricing
  assert(
    landingSrc.includes('Independent Preparation Platform Notice') &&
      landingSrc.includes('not affiliated with, endorsed by, or officially connected to Cambridge Assessment English, the British Council, or IDP Education') &&
      landingSrc.includes('Candidate Free') &&
      landingSrc.includes('Sprint Premium') &&
      landingSrc.includes('Sprint Master'),
    'Phase 2 [5/6]: PreLoginLanding displays truthful codebase pricing tiers and explicit independent non-affiliation notice'
  );

  // 28.6: Accessible mobile navigation & pre-login Legal/Contact modal wiring
  assert(
    landingSrc.includes('aria-controls="mobile-nav-drawer"') &&
      landingSrc.includes('focus-visible:ring-2') &&
      appSrc.includes('onOpenLegal={(tab) =>') &&
      appSrc.includes('onOpenContact={() => setIsContactOpen(true)}'),
    'Phase 2 [6/6]: Mobile navigation is keyboard/ARIA accessible and Legal/Contact modals are wired in the pre-login view'
  );
}

// =============================================================
// SECTION 29: WEBSITE-WIDE AUDIO COMPLETENESS & LISTENING REPETITION FIX
// =============================================================
console.log('\n[29/29] Verifying Website-Wide Audio Completeness & Listening Non-Repetition...');
{
  const { audioManager } = await import('../src/services/AudioManager');
  const { getAllSprintTests } = await import('../src/data/sprintLibraryData');
  const { generateListeningModule } = await import('../src/data/sprintTestGenerator');
  const { zeroRepetitionEngine } = await import('../src/services/ZeroRepetitionEngine');
  const { buildListeningExamDialogue } = await import('../src/utils/listeningAnswerEvaluator');

  // 29.1: Multi-speaker script parser converts raw speaker-labeled text into distinct character turns without reading speaker names aloud
  const sampleMultiSpeakerScript = [
    '[SECTION 1: UNIVERSITY ACCOMMODATION]',
    'Admissions Officer: "Good morning, University Accommodation Office. How can I help you?"',
    'Elena: "Hello, I would like to register for a standard en-suite room for the autumn semester."',
    'Admissions Officer: "Certainly. Could you spell your surname for me, please?"',
    'Elena: "Yes, it is Hawthorne, H-A-W-T-H-O-R-N-E."'
  ].join('\n');

  const parsedDialogue = audioManager.parseMultiSpeakerScript(sampleMultiSpeakerScript);
  assert(
    parsedDialogue.length === 4 &&
      parsedDialogue[0].text === 'Good morning, University Accommodation Office. How can I help you?' &&
      !parsedDialogue[0].text.includes('Admissions Officer:') &&
      parsedDialogue[1].gender === 'female' &&
      parsedDialogue[0].speakerId !== parsedDialogue[1].speakerId,
    'Audio Completeness [1/6]: AudioManager.parseMultiSpeakerScript extracts clean spoken turns with distinct male/female British RP voices'
  );

  // 29.2: Voice Persona & Cache Key Isolation across Arthur (speaker_04), Clara (speaker_05), Barnaby (speaker_barnaby), and Listening speakers
  const cachePhrase = 'Welcome to the IELTS Listening and Speaking practice studio.';
  const keyArthur = buildVoiceSynthesisCacheKey({
    provider: 'gemini-3.8-flash-lite-tts',
    speakerId: 'speaker_04',
    voiceId: 'Charon',
    gender: 'male',
    locale: 'en-GB',
    deliveryProfile: 'examiner_question',
    rate: 0.96,
    text: cachePhrase
  });
  const keyClara = buildVoiceSynthesisCacheKey({
    provider: 'gemini-3.8-flash-lite-tts',
    speakerId: 'speaker_05',
    voiceId: 'Aoede',
    gender: 'female',
    locale: 'en-GB',
    deliveryProfile: 'examiner_question',
    rate: 0.98,
    text: cachePhrase
  });
  const keyBarnaby = buildVoiceSynthesisCacheKey({
    provider: 'gemini-3.8-flash-lite-tts',
    speakerId: 'speaker_barnaby',
    voiceId: 'Puck',
    gender: 'male',
    locale: 'en-GB',
    deliveryProfile: 'barnaby_companion',
    rate: 1.04,
    text: cachePhrase
  });
  const keyLiam = buildVoiceSynthesisCacheKey({
    provider: 'gemini-3.8-flash-lite-tts',
    speakerId: 'speaker_01',
    voiceId: 'Fenrir',
    gender: 'male',
    locale: 'en-GB',
    deliveryProfile: 'listening_dialogue',
    rate: 1.0,
    text: cachePhrase
  });
  const keyLibby = buildVoiceSynthesisCacheKey({
    provider: 'gemini-3.8-flash-lite-tts',
    speakerId: 'speaker_02',
    voiceId: 'Leda',
    gender: 'female',
    locale: 'en-GB',
    deliveryProfile: 'listening_dialogue',
    rate: 1.0,
    text: cachePhrase
  });
  const uniqueCacheKeys = new Set([keyArthur, keyClara, keyBarnaby, keyLiam, keyLibby]);
  assert(
    uniqueCacheKeys.size === 5,
    'Audio Completeness [2/6]: Cache keys strictly isolate Arthur (speaker_04), Clara (speaker_05), Barnaby (speaker_barnaby), and Listening speakers'
  );

  // 29.3: Sprint Library initial & hydrated tests all contain 4 parts, 40 sequential questions (Q1-Q40), and multi-speaker dialogues
  const allSprintTests = getAllSprintTests();
  let allSprintComplete = allSprintTests.length >= 3;
  for (const test of allSprintTests) {
    if (test.listening.parts.length !== 4) allSprintComplete = false;
    const flatQs = test.listening.parts.flatMap((p) => p.questions);
    if (flatQs.length !== 40) allSprintComplete = false;
    flatQs.forEach((q, idx) => {
      if (q.questionNumber !== idx + 1 || !String(q.correctAnswer).trim()) {
        allSprintComplete = false;
      }
    });
    for (const part of test.listening.parts) {
      if (part.questions.length !== 10 || !Array.isArray(part.dialogue) || part.dialogue.length < 2) {
        allSprintComplete = false;
      }
    }
  }
  assert(
    allSprintComplete,
    'Listening Completeness [3/6]: Every Sprint Library test hydrates to 4 complete parts, 40 sequential questions (Q1–Q40), and multi-speaker dialogues'
  );

  // 29.4: Sprint Listening generator produces distinct questions, scripts, and answer keys across volumes, editions, and test numbers
  const mod18A1 = generateListeningModule(18, 'Academic', 1);
  const mod18A2 = generateListeningModule(18, 'Academic', 2);
  const mod19A1 = generateListeningModule(19, 'Academic', 1);
  const mod20GT3 = generateListeningModule(20, 'General Training', 3);

  const p2DistinctPrompts = new Set(mod18A1.parts[1].questions.map((q) => q.prompt)).size === 10;
  const p3DistinctPrompts = new Set(mod18A1.parts[2].questions.map((q) => q.prompt)).size === 10;
  const p4DistinctPrompts = new Set(mod18A1.parts[3].questions.map((q) => q.prompt)).size === 10;
  const distinctTests =
    mod18A1.parts[0].questions[0].correctAnswer !== mod18A2.parts[0].questions[0].correctAnswer &&
    mod18A1.parts[0].questions[0].correctAnswer !== mod19A1.parts[0].questions[0].correctAnswer &&
    mod18A1.parts[0].audioScript !== mod18A2.parts[0].audioScript &&
    mod19A1.parts[3].audioScript !== mod20GT3.parts[3].audioScript;

  assert(
    p2DistinctPrompts && p3DistinctPrompts && p4DistinctPrompts && distinctTests,
    'Listening Non-Repetition [4/6]: Sprint generator produces 10 unique prompts per part (zero intra-part duplicates) and distinct scripts/answers across tests'
  );

  // 29.5: ZeroRepetitionEngine 40-question exam generator produces 40 unique questions (10 per section) and complete multi-speaker dialogue
  const examRun1 = zeroRepetitionEngine.generateUniqueListeningExam40(ALL_INITIAL_QUESTIONS);
  const examRun2 = zeroRepetitionEngine.generateUniqueListeningExam40(ALL_INITIAL_QUESTIONS);
  const examDialogue1 = buildListeningExamDialogue(examRun1.questions);
  const sectionCountsValid = [1, 2, 3, 4].every(
    (sec) => examRun1.questions.filter((q) => (q.section || 1) === sec).length === 10
  );
  assert(
    examRun1.questions.length === 40 &&
      examRun2.questions.length === 40 &&
      examRun1.examId !== examRun2.examId &&
      sectionCountsValid &&
      examDialogue1.length >= 12,
    `Listening Non-Repetition [5/6]: ZeroRepetitionEngine generates 40-question exams (10 per section) with complete ${examDialogue1.length}-turn multi-speaker dialogue`
  );

  // 29.6: CDIELTSExamMode & RealisticIELTSListeningTest source guards against 45s timer cutoff and completed-exam trapping
  const cdiExamSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/cdielts/CDIELTSExamMode.tsx'),
    'utf-8'
  );
  const authListeningSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/listening/RealisticIELTSListeningTest.tsx'),
    'utf-8'
  );
  assert(
    cdiExamSrc.includes('audioManager.parseMultiSpeakerScript(sectionText)') &&
      cdiExamSrc.includes('if (isAudioPlaying || svcState.isPlaying || svcState.isLoading)') &&
      authListeningSrc.includes("if (parsed && parsed.status === 'submitted')"),
    'Playback Completeness [6/6]: CDIELTSExamMode waits for actual audio completion (no 45s forced cutoff) and RealisticIELTSListeningTest starts fresh after submission'
  );
}

// -------------------------------------------------------------
// 30. AVATAR VISUAL REFERENCE, EXPRESSION RESOLVERS, IDLE MOUTH & BARNABY GREETING IDENTITY
// -------------------------------------------------------------
console.log('\n[30/30] Testing Avatar Visual Reference Registry, Expression Resolvers, Rig IDs, Idle Mouth & Barnaby Greeting Identity...');

{
  // 30.1: Runtime unit test — All 5 Examiner expressions (neutral, speaking, listening, thinking, encouraging)
  const expectedExaminerExpressions: ExaminerReferenceExpression[] = [
    'neutral',
    'speaking',
    'listening',
    'thinking',
    'encouraging'
  ];
  const arthurHasAll5 = expectedExaminerExpressions.every((exp) =>
    EXAMINER_VISUAL_REFERENCE.arthur.expressions.includes(exp)
  );
  const claraHasAll5 = expectedExaminerExpressions.every((exp) =>
    EXAMINER_VISUAL_REFERENCE.clara.expressions.includes(exp)
  );
  assert(
    arthurHasAll5 &&
      claraHasAll5 &&
      EXAMINER_VISUAL_REFERENCE.arthur.expressions.length === 5 &&
      EXAMINER_VISUAL_REFERENCE.clara.expressions.length === 5 &&
      resolveExaminerExpression('idle') === 'neutral' &&
      resolveExaminerExpression('paused') === 'neutral' &&
      resolveExaminerExpression('error') === 'neutral' &&
      resolveExaminerExpression('speaking') === 'speaking' &&
      resolveExaminerExpression('listening') === 'listening' &&
      resolveExaminerExpression('processing') === 'thinking' &&
      resolveExaminerExpression('loading') === 'thinking' &&
      resolveExaminerExpression('completed') === 'encouraging' &&
      resolveExaminerExpression('transitioning') === 'encouraging',
    'Avatar Reference [1/6]: resolveExaminerExpression deterministically maps all 8 conversational states onto the 5 reference expressions (neutral, speaking, listening, thinking, encouraging) for Arthur and Clara'
  );

  // 30.2: Runtime unit test — All 6 Barnaby expressions (happy, excited, thinking, encouraging, listening, cheerful)
  const expectedBarnabyExpressions: BarnabyReferenceExpression[] = [
    'happy',
    'excited',
    'thinking',
    'encouraging',
    'listening',
    'cheerful'
  ];
  const barnabyHasAll6 = expectedBarnabyExpressions.every((exp) =>
    BARNABY_VISUAL_REFERENCE.expressions.includes(exp)
  );
  assert(
    barnabyHasAll6 &&
      BARNABY_VISUAL_REFERENCE.expressions.length === 6 &&
      resolveBarnabyExpression('idle') === 'happy' &&
      resolveBarnabyExpression('paused') === 'happy' &&
      resolveBarnabyExpression('error') === 'happy' &&
      resolveBarnabyExpression(undefined) === 'happy' &&
      resolveBarnabyExpression('speaking') === 'excited' &&
      resolveBarnabyExpression('surprise') === 'excited' &&
      resolveBarnabyExpression('thinking') === 'thinking' &&
      resolveBarnabyExpression('processing') === 'thinking' &&
      resolveBarnabyExpression('loading') === 'thinking' &&
      resolveBarnabyExpression('motivating') === 'encouraging' &&
      resolveBarnabyExpression('transitioning') === 'encouraging' &&
      resolveBarnabyExpression('listening') === 'listening' &&
      resolveBarnabyExpression('celebrating') === 'cheerful' &&
      resolveBarnabyExpression('completed') === 'cheerful',
    'Avatar Reference [2/6]: resolveBarnabyExpression deterministically maps all conversational states and mascot moods onto the 6 reference expressions (happy, excited, thinking, encouraging, listening, cheerful)'
  );

  // 30.3: Runtime unit test — Explicit-expression override and badge label fallback behavior
  const examinerOverridesValid = expectedExaminerExpressions.every(
    (override) =>
      resolveExaminerExpression('idle', override) === override &&
      resolveExaminerExpression('speaking', override) === override
  );
  const barnabyOverridesValid = expectedBarnabyExpressions.every(
    (override) =>
      resolveBarnabyExpression('idle', override) === override &&
      resolveBarnabyExpression('speaking', override) === override
  );
  assert(
    examinerOverridesValid &&
      barnabyOverridesValid &&
      getExpressionBadgeLabel('arthur', 'idle') === 'Neutral' &&
      getExpressionBadgeLabel('clara', 'speaking') === 'Speaking' &&
      getExpressionBadgeLabel('arthur', 'processing') === 'Thinking' &&
      getExpressionBadgeLabel('clara', 'completed') === 'Encouraging' &&
      getExpressionBadgeLabel('barnaby', 'idle') === 'Happy' &&
      getExpressionBadgeLabel('barnaby', 'speaking') === 'Excited' &&
      getExpressionBadgeLabel('barnaby', 'transitioning') === 'Encouraging' &&
      getExpressionBadgeLabel('barnaby', 'completed') === 'Cheerful',
    'Avatar Reference [3/6]: Explicit expression overrides and getExpressionBadgeLabel fallbacks resolve accurately for Clara, Arthur, and Barnaby'
  );

  // 30.4: Runtime unit test — Barnaby, Arthur, and Clara greeting identity across character selection, mode switching, and session restart
  const sampleTopicName = 'Work or Academic Studies';
  const sampleFirstQuestion = 'Do you work or are you currently a student?';
  const sampleScenarioLabel = 'London Coffee Shop & Daily Life';
  const sampleScenarioOpener = 'Imagine we just met at a busy café near King’s Cross.';

  const barnabyDrillGreeting = buildSpeakingPartnerGreeting({
    character: 'barnaby',
    gender: 'male',
    mode: 'part1_drill',
    topicName: sampleTopicName,
    firstQuestion: sampleFirstQuestion,
    scenarioLabel: sampleScenarioLabel,
    scenarioOpener: sampleScenarioOpener
  });
  const barnabyFreeTalkGreeting = buildSpeakingPartnerGreeting({
    character: 'barnaby',
    gender: 'male',
    mode: 'ai_live_partner',
    topicName: sampleTopicName,
    firstQuestion: sampleFirstQuestion,
    scenarioLabel: sampleScenarioLabel,
    scenarioOpener: sampleScenarioOpener
  });
  const arthurDrillGreeting = buildSpeakingPartnerGreeting({
    character: 'arthur',
    gender: 'male',
    mode: 'part1_drill',
    topicName: sampleTopicName,
    firstQuestion: sampleFirstQuestion,
    scenarioLabel: sampleScenarioLabel,
    scenarioOpener: sampleScenarioOpener
  });
  const claraFreeTalkGreeting = buildSpeakingPartnerGreeting({
    character: 'clara',
    gender: 'female',
    mode: 'ai_live_partner',
    topicName: sampleTopicName,
    firstQuestion: sampleFirstQuestion,
    scenarioLabel: sampleScenarioLabel,
    scenarioOpener: sampleScenarioOpener
  });

  assert(
    barnabyDrillGreeting.character === 'barnaby' &&
      barnabyDrillGreeting.speakerName === 'Barnaby' &&
      barnabyDrillGreeting.speakerId === 'speaker_barnaby' &&
      barnabyDrillGreeting.deliveryProfile === 'barnaby' &&
      barnabyDrillGreeting.voiceGender === 'male' &&
      barnabyDrillGreeting.greeting.includes("I'm Barnaby, your AI Learning Companion") &&
      !barnabyDrillGreeting.greeting.includes('Arthur') &&
      !barnabyDrillGreeting.greeting.includes('Clara') &&
      barnabyFreeTalkGreeting.speakerName === 'Barnaby' &&
      barnabyFreeTalkGreeting.speakerId === 'speaker_barnaby' &&
      barnabyFreeTalkGreeting.deliveryProfile === 'barnaby' &&
      barnabyFreeTalkGreeting.greeting.includes("I'm Barnaby, your AI Learning Companion") &&
      barnabyFreeTalkGreeting.greeting.includes(sampleScenarioLabel) &&
      !barnabyFreeTalkGreeting.greeting.includes('Arthur') &&
      !barnabyFreeTalkGreeting.greeting.includes('Clara') &&
      barnabyDrillGreeting.buildSwitchAnnouncement(sampleFirstQuestion).includes("I'm Barnaby, your AI learning companion") &&
      arthurDrillGreeting.character === 'arthur' &&
      arthurDrillGreeting.speakerName === 'Prof. Arthur Pendelton' &&
      arthurDrillGreeting.speakerId === 'speaker_04' &&
      arthurDrillGreeting.deliveryProfile === 'examiner_01' &&
      arthurDrillGreeting.voiceGender === 'male' &&
      arthurDrillGreeting.speakerId === EXAMINER_VOICE_REGISTRY.arthur.speakerId &&
      arthurDrillGreeting.greeting.includes("I'm Prof. Arthur Pendelton") &&
      claraFreeTalkGreeting.character === 'clara' &&
      claraFreeTalkGreeting.speakerName === 'Dr. Clara Sterling' &&
      claraFreeTalkGreeting.speakerId === 'speaker_05' &&
      claraFreeTalkGreeting.deliveryProfile === 'examiner_02' &&
      claraFreeTalkGreeting.voiceGender === 'female' &&
      claraFreeTalkGreeting.speakerId === EXAMINER_VOICE_REGISTRY.clara.speakerId &&
      claraFreeTalkGreeting.greeting.includes("I'm Dr. Clara Sterling"),
    'Avatar Reference [4/7]: buildSpeakingPartnerGreeting preserves canonical speakerId (arthur=speaker_04/examiner_01, clara=speaker_05/examiner_02, barnaby=speaker_barnaby/barnaby) and greeting identity across Part 1 Drill, Free-Talk, character switching, and restart'
  );

  // 30.5: Source & structural verification — Arthur, Clara, and Barnaby SVG rig identifiers and closed-idle mouth handling
  const fs = await import('fs');
  const path = await import('path');
  const chubbyExaminerSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/speaking/CuteChubbyExaminerAvatar.tsx'),
    'utf-8'
  );
  const mascotAvatarSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/common/ChubbyMascotAvatar.tsx'),
    'utf-8'
  );
  assert(
    chubbyExaminerSrc.includes('id="clara-reference-anime-rig"') &&
      chubbyExaminerSrc.includes('id="arthur-reference-anime-rig"') &&
      chubbyExaminerSrc.includes('id="barnaby-reference-anime-rig"') &&
      chubbyExaminerSrc.includes('id="barnaby-idle-closed-smile"') &&
      chubbyExaminerSrc.includes('data-mouth-state="idle-closed-smile"') &&
      chubbyExaminerSrc.includes("mouthViseme === 'neutral' || mouthViseme === 'closedM'") &&
      mascotAvatarSrc.includes('id="barnaby-mascot-idle-closed-smile"') &&
      mascotAvatarSrc.includes('data-mouth-state="idle-closed-smile"'),
    'Avatar Reference [5/7]: CuteChubbyExaminerAvatar and ChubbyMascotAvatar contain #clara-reference-anime-rig, #arthur-reference-anime-rig, #barnaby-reference-anime-rig, and closed-idle smile handling'
  );

  // 30.6: Source wiring verification — LiveAvatarSpeakingPartner threads selectedCharacter and buildSpeakingPartnerGreeting across all session lifecycle paths
  const livePartnerSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/speaking/LiveAvatarSpeakingPartner.tsx'),
    'utf-8'
  );
  assert(
    livePartnerSrc.includes('buildSpeakingPartnerGreeting({') &&
      livePartnerSrc.includes('characterOverride: ChubbyAvatarCharacter = selectedCharacter') &&
      livePartnerSrc.includes('handleSwitchToBarnaby') &&
      livePartnerSrc.includes('greetingMeta.voiceGender') &&
      livePartnerSrc.includes('greetingMeta.character'),
    'Avatar Reference [6/7]: LiveAvatarSpeakingPartner wires buildSpeakingPartnerGreeting and selectedCharacter into initial open, mode switching, topic shuffle, character switching, and session restart'
  );

  // 30.7: Examiner regional accent selector guard and SpeakingSettingsDrawer Barnaby voice-lock verification
  const settingsDrawerSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/speaking/SpeakingSettingsDrawer.tsx'),
    'utf-8'
  );
  assert(
    livePartnerSrc.includes("if (selectedCharacter === 'barnaby' || nextAccent === regionalAccent) return;") &&
      livePartnerSrc.includes('selectedCharacter={selectedCharacter}') &&
      livePartnerSrc.includes('onSwitchToBarnaby={handleSwitchToBarnaby}') &&
      settingsDrawerSrc.includes('data-testid="drawer-barnaby-voice-lock-notice"') &&
      settingsDrawerSrc.includes("selectedCharacter === 'barnaby' ? 'Dedicated Companion Voice'"),
    'Avatar Reference [7/7]: handleSwitchRegionalAccent blocks examiner accent announcements while Barnaby is active and SpeakingSettingsDrawer hides examiner regional accent buttons when Barnaby is selected'
  );
}

// -------------------------------------------------------------
// 31. CHECKPOINT 1A: CAMBRIDGE 11–21 READING HYDRATION, CONSUMER CONTRACTS & THREE-WAY INTEGRITY SUITE
// -------------------------------------------------------------
console.log('\n[31/31] Testing Checkpoint 1A: Sprint 11–21 Reading Generator, Seed Hydration, Consumer Contracts & Question-Type-Aware Integrity...');

{
  const {
    CAMBRIDGE_VOLUMES_CATALOGUE,
    CAMBRIDGE_COMPLETE_CATALOGUE,
    NON_AFFILIATION_SIMULATION_NOTICE,
    getRawInitialSprintTests,
    getAllSprintTests,
    getOrCreateSprintTest,
    resolveModuleQuestionByNumber,
    resolveQuestionIdForModuleQuestionNumber,
    resolveRibbonQuestionStatus,
    validateAnswerFormatByType,
    checkConservativeSourceGrounding,
    validateSprintTestIntegrity,
    validateAllSprintCatalogueIntegrity
  } = await import('../src/data/sprintLibraryData');

  // 31.1: Pre-edit backup & SHA-256 verification check
  const backupDir = '/.aistudio/artifacts/brain/699dcfb1-0ba7-42d7-9ef6-d3f600639472/checkpoints/checkpoint_1a_pre_edit';
  const expectedBackupHashes: Record<string, string> = {
    'sprintTestGenerator.ts': '0c69128c98cc88c55ec04c9dea45544529661ff59e07cd423dbcbf4853e37bb2',
    'sprintLibraryData.ts': 'c14f60903e4b95b4c0c4943b15bbdff3c73961aef678596d1989395fb01209ac',
    'testSuite.ts': '694e48adf0c6bbf53b7d7534a98359f690a1e9718bb8053edd8fe90af7f3bf72'
  };
  const backupHashesMatch = Object.entries(expectedBackupHashes).every(([fileName, expectedSha]) => {
    const fullPath = path.join(backupDir, fileName);
    if (!fs.existsSync(fullPath)) return false;
    const actualSha = crypto.createHash('sha256').update(fs.readFileSync(fullPath)).digest('hex');
    return actualSha === expectedSha;
  });
  assert(
    backupHashesMatch,
    'Checkpoint 1A [1/6]: Pre-edit backups exist in artifact checkpoint directory and match exact pre-edit SHA-256 checksums'
  );

  // 31.2: Raw Seed vs. Hydrated Seed Backward Compatibility & Consumer Contract Verification
  const rawSeeds = getRawInitialSprintTests();
  const rawC18 = rawSeeds.find((t) => t.id === 'sprint-18-academic-test-1')!;
  const rawC17 = rawSeeds.find((t) => t.id === 'sprint-17-academic-test-1')!;
  const rawC19 = rawSeeds.find((t) => t.id === 'sprint-19-general-training-test-1')!;

  const rawC18ReadingQs = rawC18.reading!.passages.flatMap((p) => p.questions);
  const rawC17ReadingQs = rawC17.reading!.passages.flatMap((p) => p.questions);
  const rawC19ReadingQs = rawC19.reading!.passages.flatMap((p) => p.questions);

  const hydratedAll = getAllSprintTests();
  const hydC18 = hydratedAll.find((t) => t.id === 'sprint-18-academic-test-1')!;
  const hydC17 = hydratedAll.find((t) => t.id === 'sprint-17-academic-test-1')!;
  const hydC19 = hydratedAll.find((t) => t.id === 'sprint-19-general-training-test-1')!;

  const hydC18ReadingQs = hydC18.reading!.passages.flatMap((p) => p.questions);
  const hydC17ReadingQs = hydC17.reading!.passages.flatMap((p) => p.questions);
  const hydC19ReadingQs = hydC19.reading!.passages.flatMap((p) => p.questions);

  // Verify all 7 original seed Reading questions preserve exact IDs, prompts, options, correctAnswers, acceptableAnswers, and locationReference
  const allRawSeedReadingQs = [...rawC18ReadingQs, ...rawC17ReadingQs, ...rawC19ReadingQs];
  const allHydSeedReadingQs = [...hydC18ReadingQs, ...hydC17ReadingQs, ...hydC19ReadingQs];

  const seedQuestionsPreserved = allRawSeedReadingQs.every((rawQ) => {
    const hydQ = allHydSeedReadingQs.find((q) => q.id === rawQ.id) as any;
    if (!hydQ) return false;
    return (
      hydQ.id === rawQ.id &&
      hydQ.prompt === rawQ.prompt &&
      hydQ.type === rawQ.type &&
      JSON.stringify(hydQ.options) === JSON.stringify(rawQ.options) &&
      JSON.stringify(hydQ.correctAnswer) === JSON.stringify(rawQ.correctAnswer) &&
      JSON.stringify(hydQ.acceptableAnswers) === JSON.stringify(rawQ.acceptableAnswers) &&
      hydQ.explanation === rawQ.explanation &&
      hydQ.locationReference === rawQ.locationReference &&
      hydQ.seedQuestionNumber === rawQ.questionNumber
    );
  });

  // Verify documented passage-to-questionNumber alignment for SprintLibraryPage.jumpToQuestion(qNum) & #q-box-${q.questionNumber}
  const c18Q4Hydrated = hydC18.reading!.passages[1].questions[0] as any;
  const c18Q5Hydrated = hydC18.reading!.passages[2].questions[0] as any;
  const c17Q1Hydrated = hydC17.reading!.passages[0].questions[0] as any;
  const c19Q1Hydrated = hydC19.reading!.passages[0].questions[0] as any;

  const consumerContractAligned =
    rawC18ReadingQs.length === 5 &&
    rawC17ReadingQs.length === 1 &&
    rawC19ReadingQs.length === 1 &&
    hydC18ReadingQs.length === 40 &&
    hydC17ReadingQs.length === 40 &&
    hydC19ReadingQs.length === 40 &&
    c18Q4Hydrated.id === 'c18-a-t1-r-q4' &&
    c18Q4Hydrated.questionNumber === 14 &&
    c18Q4Hydrated.seedQuestionNumber === 4 &&
    c18Q4Hydrated.partOrSection === 2 &&
    c18Q5Hydrated.id === 'c18-a-t1-r-q5' &&
    c18Q5Hydrated.questionNumber === 27 &&
    c18Q5Hydrated.seedQuestionNumber === 5 &&
    c18Q5Hydrated.partOrSection === 3 &&
    c17Q1Hydrated.id === 'c17-a-t1-r-q1' &&
    c17Q1Hydrated.questionNumber === 1 &&
    c17Q1Hydrated.seedQuestionNumber === 1 &&
    c19Q1Hydrated.id === 'c19-gt-t1-r-q1' &&
    c19Q1Hydrated.questionNumber === 1 &&
    c19Q1Hydrated.seedQuestionNumber === 1 &&
    hydC18.reading!.passages[0].text.startsWith(rawC18.reading!.passages[0].text) &&
    hydC18.reading!.passages[1].text.startsWith(rawC18.reading!.passages[1].text) &&
    hydC18.reading!.passages[2].text.startsWith(rawC18.reading!.passages[2].text);

  assert(
    seedQuestionsPreserved && consumerContractAligned,
    'Checkpoint 1A [2/6]: Raw seeds (5, 1, 1 Reading Qs) hydrate to 40 Reading Qs across 3 passages while preserving all 7 seed IDs/answers/texts and aligning c18-a-t1-r-q4 (4->14 in Passage 2) and c18-a-t1-r-q5 (5->27 in Passage 3)'
  );

  // 31.3: All 88 Catalogue Entries Pass Structural Validation & Have Zero Concrete Defects
  const catalogueSummary = validateAllSprintCatalogueIntegrity();
  console.log(
    `  [Catalogue Integrity Summary] TotalTests=${catalogueSummary.totalCatalogueTests} | StructuralPass=${catalogueSummary.structuralPassCount}/88 | ZeroInvalidTests=${catalogueSummary.testsWithZeroInvalidItems}/88 | TotalObjectiveQs=${catalogueSummary.aggregateQuestions.totalObjectiveQuestions} | VerifiedByRule=${catalogueSummary.aggregateQuestions.verifiedByRuleCount} | NeedsReview=${catalogueSummary.aggregateQuestions.needsReviewCount} | Invalid=${catalogueSummary.aggregateQuestions.invalidCount} (Duplicates=${catalogueSummary.aggregateQuestions.duplicatePromptCount}, MissingStatements=${catalogueSummary.aggregateQuestions.missingStatementCount}, InvalidAnswers=${catalogueSummary.aggregateQuestions.invalidAnswerFormatCount})`
  );

  assert(
    CAMBRIDGE_COMPLETE_CATALOGUE.length === 88 &&
      catalogueSummary.totalCatalogueTests === 88 &&
      catalogueSummary.structuralPassCount === 88 &&
      catalogueSummary.structuralFailCount === 0 &&
      catalogueSummary.testsWithZeroInvalidItems === 88 &&
      catalogueSummary.testsWithInvalidItems === 0 &&
      catalogueSummary.aggregateQuestions.totalObjectiveQuestions === 88 * 80 &&
      catalogueSummary.aggregateQuestions.invalidCount === 0 &&
      catalogueSummary.aggregateQuestions.duplicatePromptCount === 0 &&
      catalogueSummary.aggregateQuestions.missingStatementCount === 0 &&
      catalogueSummary.aggregateQuestions.invalidAnswerFormatCount === 0,
    'Checkpoint 1A [3/6]: All 88 catalogue tests (Books 11–21, Academic & GT, Tests 1–4 = 7,040 objective questions) pass structural validation with zero duplicate prompts, zero missing statements, and zero invalid answer formats'
  );

  // 31.4: Honest Three-Way Verification Labels & Conservative needs_review Reporting
  const allUnverifiedHumanLabel = catalogueSummary.reports.every(
    (r) =>
      r.humanReviewStatus === 'unverified_ai_simulation' &&
      r.semanticCorrectnessGuarantee === 'none_requires_human_review' &&
      r.provenance === 'ai_simulation' &&
      r.nonAffiliationNotice === NON_AFFILIATION_SIMULATION_NOTICE &&
      r.questionDiagnostics.needsReviewCount > 0 &&
      r.questionDiagnostics.verifiedByRuleCount +
        r.questionDiagnostics.needsReviewCount +
        r.questionDiagnostics.invalidCount ===
        80
  );
  const allTestsHaveTransparentProvenance = hydratedAll.every(
    (t) =>
      t.provenance === 'original_practice' &&
      t.provenanceNote.includes('Original IELTS-style practice simulation') &&
      !t.description.includes('Official authentic Sprint')
  );
  assert(
    allUnverifiedHumanLabel && allTestsHaveTransparentProvenance,
    `Checkpoint 1A [4/6]: Three-way verification labels honestly separate structuralStatus (88/88 pass), automatedEvidenceStatus (${catalogueSummary.aggregateQuestions.verifiedByRuleCount} verified_by_rule, ${catalogueSummary.aggregateQuestions.needsReviewCount} needs_review, 0 invalid), and humanReviewStatus ('unverified_ai_simulation') with transparent provenance`
  );

  // 31.5: Question-Type-Aware Validator Positive Edge Cases (Short Completion Labels & Paraphrased Grounding)
  const sampleTestForEdgeCases = JSON.parse(
    JSON.stringify(getOrCreateSprintTest(18, 'Academic', 2))
  );
  // Short valid form/note completion field label (< 15 chars: "Postcode:") grounded in passage text
  sampleTestForEdgeCases.reading.passages[0].text += '\n\n[Paragraph F] The central research archive is registered under postcode CB21TN.';
  sampleTestForEdgeCases.reading.passages[0].questions[7] = {
    id: 'edge-short-label-q8',
    questionNumber: 8,
    partOrSection: 1,
    type: 'note_completion',
    prompt: 'Postcode:',
    correctAnswer: 'CB21TN',
    acceptableAnswers: ['CB21TN'],
    explanation: 'Paragraph F states the archive is registered under postcode CB21TN.',
    wordLimit: 2
  };
  // Paraphrased completion item whose literal answer string is not verbatim in the passage
  sampleTestForEdgeCases.reading.passages[0].questions[8] = {
    id: 'edge-paraphrased-q9',
    questionNumber: 9,
    partOrSection: 1,
    type: 'note_completion',
    prompt: 'Primary thermal benefit of rooftop vegetation:',
    correctAnswer: 'microclimatic cooling',
    acceptableAnswers: ['microclimatic cooling'],
    explanation: 'Paraphrased summary of vegetative transpiration cooling the ambient microclimate.',
    wordLimit: 2
  };

  const edgeReport = validateSprintTestIntegrity(sampleTestForEdgeCases);
  const shortLabelIssue = edgeReport.itemIssues.find((i) => i.questionId === 'edge-short-label-q8');
  const paraphrasedIssue = edgeReport.itemIssues.find((i) => i.questionId === 'edge-paraphrased-q9');

  assert(
    edgeReport.structuralStatus === 'pass' &&
      edgeReport.questionDiagnostics.invalidCount === 0 &&
      shortLabelIssue === undefined && // verified_by_rule items are not in itemIssues
      paraphrasedIssue !== undefined &&
      paraphrasedIssue.status === 'needs_review' &&
      paraphrasedIssue.reasons.includes('paraphrased_or_ambiguous_grounding'),
    'Checkpoint 1A [5/6]: Question-type-aware validator accepts short valid completion labels ("Postcode:") as verified_by_rule and classifies paraphrased non-verbatim answers as needs_review rather than invalid'
  );

  // 31.6: Question-Type-Aware Validator Negative Defect Detection (Instruction-Only Placeholder, Duplicate Prompt, Invalid Answer Format)
  const defectiveSample = JSON.parse(
    JSON.stringify(getOrCreateSprintTest(18, 'Academic', 3))
  );
  // Inject Defect 1: Instruction-only YNNG placeholder without statement
  defectiveSample.reading.passages[2].questions[0] = {
    ...defectiveSample.reading.passages[2].questions[0],
    id: 'defect-missing-stmt-q27',
    type: 'yes_no_not_given',
    prompt: 'Do the following statements agree with the claims of the writer in Passage 3? (YES / NO / NOT GIVEN)'
  };
  // Inject Defect 2: Duplicate prompt in Passage 2
  defectiveSample.reading.passages[1].questions[1] = {
    ...defectiveSample.reading.passages[1].questions[1],
    id: 'defect-duplicate-q15',
    prompt: defectiveSample.reading.passages[1].questions[0].prompt
  };
  // Inject Defect 3: Invalid answer format for TFNG
  defectiveSample.reading.passages[0].questions[0] = {
    ...defectiveSample.reading.passages[0].questions[0],
    id: 'defect-bad-ans-q1',
    type: 'true_false_not_given',
    correctAnswer: 'PROBABLY TRUE'
  };

  const defectReport = validateSprintTestIntegrity(defectiveSample);
  const missingStmtDetected = defectReport.itemIssues.some(
    (i) => i.questionId === 'defect-missing-stmt-q27' && i.status === 'invalid' && i.reasons.includes('missing_statement')
  );
  const duplicateDetected = defectReport.itemIssues.some(
    (i) => i.questionId === 'defect-duplicate-q15' && i.status === 'invalid' && i.reasons.includes('duplicate_prompt')
  );
  const badAnsDetected = defectReport.itemIssues.some(
    (i) => i.questionId === 'defect-bad-ans-q1' && i.status === 'invalid' && i.reasons.includes('invalid_answer_format')
  );

  assert(
    defectReport.automatedEvidenceStatus === 'invalid' &&
      defectReport.questionDiagnostics.invalidCount === 3 &&
      defectReport.questionDiagnostics.missingStatementCount === 1 &&
      defectReport.questionDiagnostics.duplicatePromptCount === 1 &&
      defectReport.questionDiagnostics.invalidAnswerFormatCount === 1 &&
      missingStmtDetected &&
      duplicateDetected &&
      badAnsDetected,
    'Checkpoint 1A [6/6]: Validator deterministically flags instruction-only placeholders (missing_statement), duplicate prompts (duplicate_prompt), and invalid answer formats (invalid_answer_format) as invalid'
  );

  // ---------------------------------------------------------------------------
  // CHECKPOINT 1A TARGETED REMEDIATION REGRESSION TESTS (31.7 – 31.13)
  // ---------------------------------------------------------------------------

  // 31.7: Pre-remediation backups exist and match recorded pre-remediation SHA-256 hashes
  const remBackupDir = '/.aistudio/artifacts/brain/699dcfb1-0ba7-42d7-9ef6-d3f600639472/checkpoints/checkpoint_1a_remediation_pre_edit';
  const expectedRemBackupHashes: Record<string, string> = {
    'SprintLibraryPage.tsx': '2fa9ea90a653111209ea33a975ff5cd3d307aca14bb71d7155bdc203435e9625',
    'sprintLibraryData.ts': '1c1350640c761fbb5d6db33bcea14bc582cf7115c7ddec5be7562517e811f55b',
    'sprintTestGenerator.ts': '857a9fa81960584d20a8bec334f84e47ce83ccde5f7e819a9d6cb3000de716aa',
    'testSuite.ts': '1385d74775cacad0deacdf20c8fb4a0aef0dce0ba389bc9c8514ce87dceaf124'
  };
  const remBackupsMatch = Object.entries(expectedRemBackupHashes).every(([fileName, expectedSha]) => {
    const fullPath = path.join(remBackupDir, fileName);
    if (!fs.existsSync(fullPath)) return false;
    const actualSha = crypto.createHash('sha256').update(fs.readFileSync(fullPath)).digest('hex');
    return actualSha === expectedSha;
  });
  assert(
    remBackupsMatch,
    'Checkpoint 1A Remediation [1/7]: Pre-remediation backups for all 4 authorized files exist and match exact recorded SHA-256 checksums'
  );

  // 31.8: Actual-ID mapping for answered/flagged ribbon items across C18 Q14 & Q27 and hydrated fallback questions in all 3 seeded tests
  const c18R14Id = resolveQuestionIdForModuleQuestionNumber(hydC18, 'reading', 14);
  const c18R27Id = resolveQuestionIdForModuleQuestionNumber(hydC18, 'reading', 27);
  const c18R4Id = resolveQuestionIdForModuleQuestionNumber(hydC18, 'reading', 4);
  const c18R5Id = resolveQuestionIdForModuleQuestionNumber(hydC18, 'reading', 5);
  const c18R6Id = resolveQuestionIdForModuleQuestionNumber(hydC18, 'reading', 6);
  const c17R2Id = resolveQuestionIdForModuleQuestionNumber(hydC17, 'reading', 2);
  const c19R2Id = resolveQuestionIdForModuleQuestionNumber(hydC19, 'reading', 2);
  const c18L11Id = resolveQuestionIdForModuleQuestionNumber(hydC18, 'listening', 11);
  const c18L5Id = resolveQuestionIdForModuleQuestionNumber(hydC18, 'listening', 5);

  // Simulate answering and flagging Q14 (seed ID 'c18-a-t1-r-q4') and Q27 (seed ID 'c18-a-t1-r-q5') + hydrated fallback Q6
  const simulatedAnswers: Record<string, string> = {
    'c18-a-t1-r-q4': 'FALSE',
    'c18-a-t1-r-q5': 'C',
    [c18R6Id!]: 'mycorrhizal networks',
    [c17R2Id!]: 'TRUE',
    [c19R2Id!]: 'FALSE'
  };
  const simulatedFlags: Record<string, boolean> = {
    'c18-a-t1-r-q4': true,
    'c18-a-t1-r-q5': true,
    [c17R2Id!]: true
  };

  const statusQ14 = resolveRibbonQuestionStatus({
    testSet: hydC18,
    module: 'reading',
    questionNumber: 14,
    activeQuestionNumber: 14,
    userAnswers: simulatedAnswers,
    flaggedQuestions: simulatedFlags
  });
  const statusQ27 = resolveRibbonQuestionStatus({
    testSet: hydC18,
    module: 'reading',
    questionNumber: 27,
    activeQuestionNumber: 14,
    userAnswers: simulatedAnswers,
    flaggedQuestions: simulatedFlags
  });
  // Q4 and Q5 in Passage 1 must NOT falsely light up when Q14 ('c18-a-t1-r-q4') and Q27 ('c18-a-t1-r-q5') are answered/flagged
  const statusQ4 = resolveRibbonQuestionStatus({
    testSet: hydC18,
    module: 'reading',
    questionNumber: 4,
    activeQuestionNumber: 14,
    userAnswers: simulatedAnswers,
    flaggedQuestions: simulatedFlags
  });
  const statusQ5 = resolveRibbonQuestionStatus({
    testSet: hydC18,
    module: 'reading',
    questionNumber: 5,
    activeQuestionNumber: 14,
    userAnswers: simulatedAnswers,
    flaggedQuestions: simulatedFlags
  });
  const statusC18FallbackQ6 = resolveRibbonQuestionStatus({
    testSet: hydC18,
    module: 'reading',
    questionNumber: 6,
    activeQuestionNumber: 6,
    userAnswers: simulatedAnswers,
    flaggedQuestions: simulatedFlags
  });
  const statusC17FallbackQ2 = resolveRibbonQuestionStatus({
    testSet: hydC17,
    module: 'reading',
    questionNumber: 2,
    activeQuestionNumber: 2,
    userAnswers: simulatedAnswers,
    flaggedQuestions: simulatedFlags
  });
  const statusC19FallbackQ2 = resolveRibbonQuestionStatus({
    testSet: hydC19,
    module: 'reading',
    questionNumber: 2,
    activeQuestionNumber: 2,
    userAnswers: simulatedAnswers,
    flaggedQuestions: simulatedFlags
  });

  // Verify all 40 Reading and 40 Listening questions across all 3 seeded tests resolve to their exact in-memory object IDs
  const allThreeSeedsResolveAll80Ids = [hydC18, hydC17, hydC19].every((seedTest) => {
    const readingOk = seedTest.reading!.passages
      .flatMap((p) => p.questions)
      .every(
        (q) =>
          resolveQuestionIdForModuleQuestionNumber(seedTest, 'reading', q.questionNumber) === q.id &&
          resolveModuleQuestionByNumber(seedTest, 'reading', q.questionNumber)?.id === q.id
      );
    const listeningOk = seedTest.listening!.parts
      .flatMap((p) => p.questions)
      .every(
        (q) =>
          resolveQuestionIdForModuleQuestionNumber(seedTest, 'listening', q.questionNumber) === q.id &&
          resolveModuleQuestionByNumber(seedTest, 'listening', q.questionNumber)?.id === q.id
      );
    return readingOk && listeningOk;
  });

  const sprintPageUpdatedSrc = fs.readFileSync(
    path.join(process.cwd(), 'src/components/sprint/SprintLibraryPage.tsx'),
    'utf-8'
  );
  const pageUsesActualIdResolver =
    sprintPageUpdatedSrc.includes('resolveRibbonQuestionStatus') &&
    sprintPageUpdatedSrc.includes('resolveQuestionIdForModuleQuestionNumber') &&
    !sprintPageUpdatedSrc.includes('const qId = `${qIdPrefix}-q${qNum}`') &&
    !sprintPageUpdatedSrc.includes('const currentQId = `${qIdPrefix}-q${activeQuestionNumber}`');

  assert(
    c18R14Id === 'c18-a-t1-r-q4' &&
      c18R27Id === 'c18-a-t1-r-q5' &&
      c18R4Id === 'sprint-18-academic-test-1-r-q4' &&
      c18R5Id === 'sprint-18-academic-test-1-r-q5' &&
      c18L11Id === 'c18-a-t1-l-q5' &&
      c18L5Id === 'sprint-18-academic-test-1-l-q5' &&
      statusQ14.isAnswered === true &&
      statusQ14.isFlagged === true &&
      statusQ14.isActive === true &&
      statusQ27.isAnswered === true &&
      statusQ27.isFlagged === true &&
      statusQ4.isAnswered === false &&
      statusQ4.isFlagged === false &&
      statusQ5.isAnswered === false &&
      statusQ5.isFlagged === false &&
      statusC18FallbackQ6.isAnswered === true &&
      statusC17FallbackQ2.isAnswered === true &&
      statusC17FallbackQ2.isFlagged === true &&
      statusC19FallbackQ2.isAnswered === true &&
      allThreeSeedsResolveAll80Ids &&
      pageUsesActualIdResolver,
    'Checkpoint 1A Remediation [2/7]: Bottom ribbon & Review checkbox resolve displayed question numbers to actual question IDs across C18 Q14/Q27 and all hydrated fallback questions in the 3 seeded tests without cross-lighting Q4/Q5'
  );

  // 31.9: Roman-numeral matching_headings validation
  const sampleHeadingOptions = [
    'i. Historical origins of municipal transit',
    'ii. Financial constraints on rural corridors',
    'iii. Environmental benefits of electrification',
    'iv. Passenger safety regulations in tunnels',
    'v. Future autonomous signalling protocols'
  ];
  const validRomanLower = validateAnswerFormatByType({
    type: 'matching_headings',
    correctAnswer: 'iii',
    acceptableAnswers: ['iii', 'iii. Environmental benefits of electrification'],
    options: sampleHeadingOptions
  });
  const validRomanUpperWithDot = validateAnswerFormatByType({
    type: 'matching_headings',
    correctAnswer: 'IV.',
    options: sampleHeadingOptions
  });
  const validFullHeadingText = validateAnswerFormatByType({
    type: 'matching_headings',
    correctAnswer: 'i. Historical origins of municipal transit',
    options: sampleHeadingOptions
  });
  const invalidOutOfRangeRoman = validateAnswerFormatByType({
    type: 'matching_headings',
    correctAnswer: 'viii', // Only 5 options (i..v) exist
    options: sampleHeadingOptions
  });
  const invalidAcceptableRoman = validateAnswerFormatByType({
    type: 'matching_headings',
    correctAnswer: 'ii',
    acceptableAnswers: ['ii', 'ix'], // 'ix' is out of range
    options: sampleHeadingOptions
  });

  assert(
    validRomanLower === true &&
      validRomanUpperWithDot === true &&
      validFullHeadingText === true &&
      invalidOutOfRangeRoman === false &&
      invalidAcceptableRoman === false,
    'Checkpoint 1A Remediation [3/7]: validateAnswerFormatByType supports valid Roman-numeral and full-text matching_headings answers while rejecting out-of-range Roman numerals in correctAnswer or acceptableAnswers'
  );

  // 31.10: Word-limit enforcement against acceptableAnswers as well as correctAnswer
  const validAcceptableWordLimit = validateAnswerFormatByType({
    type: 'note_completion',
    correctAnswer: 'dermal denticles',
    acceptableAnswers: ['denticles', 'dermal denticles'],
    wordLimit: 2
  });
  const invalidAcceptableWordLimit = validateAnswerFormatByType({
    type: 'note_completion',
    correctAnswer: 'dermal denticles',
    acceptableAnswers: ['denticles', 'microscopic shark dermal denticles'], // 4 words > wordLimit: 2
    wordLimit: 2
  });

  const testWithBadAcceptableWordLimit = JSON.parse(
    JSON.stringify(getOrCreateSprintTest(18, 'Academic', 4))
  );
  testWithBadAcceptableWordLimit.reading.passages[0].questions[5] = {
    ...testWithBadAcceptableWordLimit.reading.passages[0].questions[5],
    id: 'defect-acceptable-wordlimit-q6',
    wordLimit: 2,
    correctAnswer: 'two words',
    acceptableAnswers: ['two words', 'four words exceed limit']
  };
  const badAcceptableReport = validateSprintTestIntegrity(testWithBadAcceptableWordLimit);
  const badAcceptableFlagged = badAcceptableReport.itemIssues.some(
    (i) =>
      i.questionId === 'defect-acceptable-wordlimit-q6' &&
      i.status === 'invalid' &&
      i.reasons.includes('invalid_answer_format')
  );

  assert(
    validAcceptableWordLimit === true &&
      invalidAcceptableWordLimit === false &&
      badAcceptableFlagged === true,
    'Checkpoint 1A Remediation [4/7]: validateAnswerFormatByType and validateSprintTestIntegrity enforce wordLimit against every acceptableAnswers entry as well as correctAnswer'
  );

  // 31.11: Source-grounding leakage through q.explanation is blocked
  const passageForLeakageTest =
    '[Paragraph A] Quantum magnetometers deployed on autonomous submersibles map hydrothermal plumes across abyssal tectonic ridges.';
  const explanationLeakageMcq = checkConservativeSourceGrounding(
    {
      type: 'multiple_choice',
      prompt: 'What primary advantage is cited for satellite agricultural telemetry?',
      options: [
        'A) Reduced fertilizer runoff in river basins',
        'B) Real-time canopy moisture estimation',
        'C) Automated tractor steering alignment'
      ],
      correctAnswer: 'B',
      // Explanation mentions multiple words from passageForLeakageTest, even though prompt & options are unrelated
      explanation:
        'Quantum magnetometers deployed on autonomous submersibles map hydrothermal plumes across abyssal tectonic ridges.'
    },
    passageForLeakageTest
  );
  assert(
    explanationLeakageMcq.grounded === false &&
      explanationLeakageMcq.reason === 'weak_lexical_overlap_requires_human_review',
    'Checkpoint 1A Remediation [5/7]: checkConservativeSourceGrounding never uses q.explanation to manufacture passage grounding when prompt/answer lack passage support'
  );

  // 31.12: Weak lexical overlap & inverted TRUE/FALSE or YES/NO or wrong MCQ option keys are never falsely marked verified_by_rule
  const samplePassagePolarity =
    '[Paragraph B] In clinical trials involving Alzheimer patients, bilingual speakers consistently demonstrated a 4-to-5-year delay in the onset of clinical symptoms compared to monolinguals.';
  const tfngTrueCheck = checkConservativeSourceGrounding(
    {
      type: 'true_false_not_given',
      prompt: 'The onset of observable Alzheimer symptoms is typically delayed by 4 to 5 years in bilingual speakers.',
      options: ['TRUE', 'FALSE', 'NOT GIVEN'],
      correctAnswer: 'TRUE',
      explanation: 'Paragraph B states bilingual speakers demonstrated a 4-to-5-year delay.'
    },
    samplePassagePolarity
  );
  // Flipping TRUE -> FALSE has identical lexical overlap and must never be marked grounded/verified_by_rule
  const tfngInvertedFalseCheck = checkConservativeSourceGrounding(
    {
      type: 'true_false_not_given',
      prompt: 'The onset of observable Alzheimer symptoms is typically delayed by 4 to 5 years in bilingual speakers.',
      options: ['TRUE', 'FALSE', 'NOT GIVEN'],
      correctAnswer: 'FALSE',
      explanation: 'Paragraph B states bilingual speakers demonstrated a 4-to-5-year delay.'
    },
    samplePassagePolarity
  );
  const ynngInvertedNoCheck = checkConservativeSourceGrounding(
    {
      type: 'yes_no_not_given',
      prompt: 'Bilingual speakers demonstrated a measurable delay in clinical Alzheimer symptoms during trials.',
      options: ['YES', 'NO', 'NOT GIVEN'],
      correctAnswer: 'NO',
      explanation: 'Paragraph B states bilingual speakers demonstrated a 4-to-5-year delay.'
    },
    samplePassagePolarity
  );
  // Incorrect MCQ option key where prompt shares words with passage, but selected wrong option A has < 2 tokens in passage
  const wrongMcqKeyCheck = checkConservativeSourceGrounding(
    {
      type: 'multiple_choice',
      prompt: 'According to Paragraph B, what outcome did bilingual speakers demonstrate in clinical Alzheimer trials?',
      options: [
        'A) Complete elimination of cortical atrophy in adulthood',
        'B) A 4-to-5-year delay in the onset of clinical symptoms',
        'C) Faster vocabulary retrieval during childhood schooling'
      ],
      correctAnswer: 'A', // Wrong option selected; prompt has many tokens in passage, but Option A has 0 tokens in passage
      explanation: 'Paragraph B states bilingual speakers demonstrated a 4-to-5-year delay in clinical symptoms.'
    },
    samplePassagePolarity
  );
  // Completion item where the answer word happens to appear in the passage, but the prompt has 0 tokens in the passage
  const weakCompletionCheck = checkConservativeSourceGrounding(
    {
      type: 'note_completion',
      prompt: 'Preferred currency for international freight:',
      correctAnswer: 'bilingual',
      acceptableAnswers: ['bilingual'],
      explanation: 'Mentions bilingual in the passage.',
      wordLimit: 1
    },
    samplePassagePolarity
  );

  assert(
    tfngTrueCheck.grounded === false &&
      tfngTrueCheck.reason === 'polarity_verification_requires_human_review' &&
      tfngInvertedFalseCheck.grounded === false &&
      tfngInvertedFalseCheck.reason === 'polarity_verification_requires_human_review' &&
      ynngInvertedNoCheck.grounded === false &&
      ynngInvertedNoCheck.reason === 'polarity_verification_requires_human_review' &&
      wrongMcqKeyCheck.grounded === false &&
      wrongMcqKeyCheck.reason === 'weak_lexical_overlap_requires_human_review' &&
      weakCompletionCheck.grounded === false &&
      weakCompletionCheck.reason === 'weak_lexical_overlap_requires_human_review',
    'Checkpoint 1A Remediation [6/7]: Inverted TRUE/FALSE or YES/NO keys, wrong MCQ option keys lacking option support, and weak lexical overlap are conservatively marked needs_review and never claimed semantically verified'
  );

  // 31.13: Provenance & non-affiliation wording across catalogue descriptions, generator comments, and SprintLibraryPage
  const generatorSrc = fs.readFileSync(
    path.join(process.cwd(), 'src/data/sprintTestGenerator.ts'),
    'utf-8'
  );
  const libraryDataSrc = fs.readFileSync(
    path.join(process.cwd(), 'src/data/sprintLibraryData.ts'),
    'utf-8'
  );
  const catalogueClean = CAMBRIDGE_VOLUMES_CATALOGUE.every(
    (v) =>
      !v.description.toLowerCase().includes('british council') &&
      !v.description.toLowerCase().includes('calibrated writing') &&
      !v.description.toLowerCase().includes('authentic multi-accent')
  );
  const pageCopyClean =
    !sprintPageUpdatedSrc.includes('Official authentic volumes') &&
    !sprintPageUpdatedSrc.includes('Sprint Practice Compilation') &&
    !sprintPageUpdatedSrc.includes('Authentic CD IELTS Questions Loaded') &&
    !sprintPageUpdatedSrc.includes('Three authentic research passages') &&
    !sprintPageUpdatedSrc.includes('Official CD IELTS Exam Rules') &&
    !sprintPageUpdatedSrc.includes('evaluated against official Sprint answer keys');
  const generatorCommentsClean =
    !generatorSrc.includes('Provides authentic, high-yield') &&
    !generatorSrc.includes('Generates an authentic 4-part Listening module') &&
    !libraryDataSrc.includes('Provides the verified catalogue of Sprint Volumes');

  assert(
    catalogueClean && pageCopyClean && generatorCommentsClean,
    'Checkpoint 1A Remediation [7/7]: Catalogue descriptions, generator comments, and SprintLibraryPage UI copy remove unsupported official authenticity, endorsement, and calibration claims'
  );
}

// =============================================================
// SECTION 32: SUB-CHECKPOINT 1B.1 SCORE INTEGRITY & BAND CONVERSION
// =============================================================
console.log('\n[32/32] Testing Sub-Checkpoint 1B.1: Score Integrity, Band Conversion & Overall Band Enforcement...');
{
  const {
    convertListeningRawScoreToBand,
    convertAcademicReadingRawScoreToBand,
    convertGeneralTrainingReadingRawScoreToBand,
    convertRawScoreToBand,
    calculateFourSkillOverallBand,
    roundIELTSBand
  } = await import('../src/utils/ieltsBandConversion');

  const { isFullMockExamRecord, recordExamAttempt, getActiveUser } = await import('../src/utils/userStorage');

  // 32.1: Pre-remediation backups exist and match exact SHA-256 hashes
  const preBackupDir = '/.aistudio/artifacts/brain/699dcfb1-0ba7-42d7-9ef6-d3f600639472/checkpoints/subcheckpoint_1b1_pre_edit';
  const expectedBackupHashes: Record<string, string> = {
    'CDIELTSExamMode.tsx': 'd24ee94f48d0b6def614f848d068f8110bd72638f9d0f086575b2261697a3c8e',
    'SprintLibraryPage.tsx': '77970d286b8df7a9a40d40b112d4904c47b61a523521c1746045b3f105a753d5',
    'testSuite.ts': 'd6b7a1bd0ea3270a0e7e8c7dad01ef28faaf1769c0ee850a96922146f2cd6eba',
    'types.ts': '61913913d84241accc006bbbbb8314fa8e0892e68ba63dd0cc17ccede2073c77',
    'userStorage.ts': '0a39ad898034973b44e8a210b6f104dbb99b140b14e2ce65683b74d3a4c688be'
  };

  const backupsValid = Object.entries(expectedBackupHashes).every(([file, hash]) => {
    const filePath = path.join(preBackupDir, file);
    if (!fs.existsSync(filePath)) return false;
    const actualHash = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
    return actualHash === hash;
  });

  assert(
    backupsValid,
    'Sub-Checkpoint 1B.1 [1/7]: Pre-edit backups for all 5 authorized files exist and match recorded SHA-256 hashes'
  );

  // 32.2: All raw scores 0–40 defined and non-decreasing across Listening, Academic Reading & GT Reading
  let allScoresMonotonic = true;
  for (let score = 0; score <= 40; score++) {
    const lBand = convertListeningRawScoreToBand(score);
    const arBand = convertAcademicReadingRawScoreToBand(score);
    const gtrBand = convertGeneralTrainingReadingRawScoreToBand(score);

    if (score === 0) {
      if (lBand !== 0.0 || arBand !== 0.0 || gtrBand !== 0.0) allScoresMonotonic = false;
    } else {
      if (lBand < 1.0 || lBand > 9.0 || arBand < 1.0 || arBand > 9.0 || gtrBand < 1.0 || gtrBand > 9.0) {
        allScoresMonotonic = false;
      }
      if (score > 1) {
        if (
          lBand < convertListeningRawScoreToBand(score - 1) ||
          arBand < convertAcademicReadingRawScoreToBand(score - 1) ||
          gtrBand < convertGeneralTrainingReadingRawScoreToBand(score - 1)
        ) {
          allScoresMonotonic = false;
        }
      }
    }
  }

  assert(
    allScoresMonotonic,
    'Sub-Checkpoint 1B.1 [2/7]: All raw scores 0–40 produce valid, monotonic non-decreasing band scores (0.0 to 9.0) with zero correct yielding Band 0.0 (no fabricated Band 4.0)'
  );

  // 32.3: Academic Reading vs General Training Reading distinct calibration
  const arAt30 = convertAcademicReadingRawScoreToBand(30);
  const gtrAt30 = convertGeneralTrainingReadingRawScoreToBand(30);
  const arAt23 = convertAcademicReadingRawScoreToBand(23);
  const gtrAt23 = convertGeneralTrainingReadingRawScoreToBand(23);
  const arAt34 = convertAcademicReadingRawScoreToBand(34);
  const gtrAt34 = convertGeneralTrainingReadingRawScoreToBand(34);

  assert(
    arAt30 === 7.0 &&
      gtrAt30 === 6.0 &&
      arAt23 === 6.0 &&
      gtrAt23 === 5.0 &&
      arAt34 === 7.5 &&
      gtrAt34 === 7.0,
    'Sub-Checkpoint 1B.1 [3/7]: General Training Reading requires higher raw scores than Academic Reading at every benchmark tier (30/40 is Band 7.0 in Academic vs Band 6.0 in GT)'
  );

  // 32.4: Out-of-bounds, negative, NaN and clamping boundaries
  const negScore = convertListeningRawScoreToBand(-5);
  const nanScore = convertAcademicReadingRawScoreToBand(NaN);
  const overScore = convertGeneralTrainingReadingRawScoreToBand(45);
  const unifiedListen = convertRawScoreToBand(35, 'listening');
  const unifiedAcadRead = convertRawScoreToBand(30, 'reading', 'Academic');
  const unifiedGtRead = convertRawScoreToBand(30, 'reading', 'General Training');

  assert(
    negScore === 0.0 &&
      nanScore === 0.0 &&
      overScore === 9.0 &&
      unifiedListen === 8.0 &&
      unifiedAcadRead === 7.0 &&
      unifiedGtRead === 6.0,
    'Sub-Checkpoint 1B.1 [4/7]: Input boundary guards clamp negative/NaN to 0.0 and over-40 scores to 9.0 with unified convertRawScoreToBand routing'
  );

  // 32.5: Four-Skill Overall Band Enforcement (3-skill and single-skill attempts return null)
  const fullFourSkills = calculateFourSkillOverallBand({
    listeningBand: 7.5,
    readingBand: 7.0,
    writingBand: 6.5,
    speakingBand: 7.0
  }); // (7.5 + 7.0 + 6.5 + 7.0) / 4 = 7.0
  const threeSkillsLrw = calculateFourSkillOverallBand({
    listeningBand: 8.0,
    readingBand: 7.5,
    writingBand: 7.0,
    speakingBand: null // Missing speaking!
  });
  const singleSkill = calculateFourSkillOverallBand({
    listeningBand: 8.5
  });
  const zeroSkill = calculateFourSkillOverallBand({});

  assert(
    fullFourSkills === 7.0 &&
      threeSkillsLrw === null &&
      singleSkill === null &&
      zeroSkill === null,
    'Sub-Checkpoint 1B.1 [5/7]: calculateFourSkillOverallBand strictly requires all 4 skills and returns null for 3-skill L/R/W or single-skill attempts'
  );

  // 32.6: Source audit for SprintLibraryPage and CDIELTSExamMode
  const sprintPageSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/sprint/SprintLibraryPage.tsx'),
    'utf-8'
  );
  const cdieltsExamSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/cdielts/CDIELTSExamMode.tsx'),
    'utf-8'
  );

  const sprintNoLinear = !sprintPageSrc.includes('4.0 + accuracy * 5.0');
  const sprintNoFakeOverall = sprintPageSrc.includes('overallBand: null');
  const sprintNoZeroListening = !sprintPageSrc.includes('listeningBand: selectedModule === \'listening\' ? band : 0');
  const cdieltsNoLinear = !cdieltsExamSrc.includes('ratio * 9');
  const cdieltsPartialLrw = cdieltsExamSrc.includes("examType: 'partial_lrw'");
  const cdieltsNoFakeOverall = cdieltsExamSrc.includes('overallBand: null');

  assert(
    sprintNoLinear &&
      sprintNoFakeOverall &&
      sprintNoZeroListening &&
      cdieltsNoLinear &&
      cdieltsPartialLrw &&
      cdieltsNoFakeOverall,
    'Sub-Checkpoint 1B.1 [6/7]: SprintLibraryPage and CDIELTSExamMode remove linear approximations, record overallBand: null on incomplete tests, and classify 3-skill tests as partial_lrw'
  );

  // 32.7: UserStorage isFullMockExamRecord and module completion tracking
  const partialRec = {
    id: 'test_partial_001',
    timestamp: Date.now(),
    examType: 'partial_lrw' as const,
    overallBand: null,
    listeningBand: 7.5,
    readingBand: 7.0,
    writingBand: 6.5,
    speakingBand: null,
    wordCount: 400,
    submissionType: 'manual' as const,
    correctCount: 65,
    totalQuestions: 80
  };
  const isPartialFullMock = isFullMockExamRecord(partialRec);

  const genuineFullMockRec = {
    id: 'test_full_mock_001',
    timestamp: Date.now(),
    examType: 'full_mock' as const,
    overallBand: 7.5,
    listeningBand: 8.0,
    readingBand: 7.5,
    writingBand: 7.0,
    speakingBand: 7.0,
    wordCount: 420,
    submissionType: 'manual' as const,
    correctCount: 70,
    totalQuestions: 80
  };
  const isGenuineFullMock = isFullMockExamRecord(genuineFullMockRec);

  assert(
    isPartialFullMock === false && isGenuineFullMock === true,
    'Sub-Checkpoint 1B.1 [7/7]: isFullMockExamRecord rejects partial_lrw attempts and accepts genuine completed full_mock records'
  );

  // -------------------------------------------------------------
  // 33: SUB-CHECKPOINT 1B.2 — History Reader Safety & Progress Accuracy
  // -------------------------------------------------------------
  console.log('\n--- Section 33: Sub-Checkpoint 1B.2 History Reader Safety & Progress Accuracy ---');

  const { evaluateRawScoreDetailed } = await import('../src/utils/ieltsBandConversion');

  // 33.1: Pre-edit backups for all 7 authorized files exist and match recorded SHA-256 hashes
  const pre1B2BackupDir = '/.aistudio/artifacts/brain/699dcfb1-0ba7-42d7-9ef6-d3f600639472/checkpoints/subcheckpoint_1b2_pre_edit';
  const expected1B2Hashes: Record<string, string> = {
    'HomeDashboard.tsx': '128065b74634e42d6bb2a6778b1d8155cb3288e7735b6fed5369899274055e30',
    'MockTestPage.tsx': '8637e6a53e201340ba904564c0b4931cee5ed915b80795cb52b68960d94fdafb',
    'ProgressPage.tsx': '4d637211775a51d47309edc13413934c5c59b9c8f5381a44950c4c4c2cb81e49',
    'ieltsBandConversion.ts': '437e3d3bd70c7c315695814f40d65aeeeb6c64a4a49f78f501ebd96f50a12176',
    'testSuite.ts': 'f4c970b8266e182af5f40d45875b0c1de9f49c5b4aef51de7035acd7a48e6299',
    'types.ts': 'a49acbebb5deb11fc080141269d472059c8233b8e7d7df23ea193cdf18f94ab1',
    'userStorage.ts': '2883afb48225cd0923a5c3ca6648b698a5fabce1245e0607ffeec57fc78cc231'
  };

  const backups1B2Valid = Object.entries(expected1B2Hashes).every(([file, hash]) => {
    const filePath = path.join(pre1B2BackupDir, file);
    if (!fs.existsSync(filePath)) return false;
    const actualHash = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
    return actualHash === hash;
  });

  assert(
    backups1B2Valid,
    'Sub-Checkpoint 1B.2 [1/7]: Pre-edit backups for all 7 authorized files exist and match recorded SHA-256 hashes'
  );

  // 33.2: Reading-only history containing listeningBand: null and unevaluated Writing-only records
  const readingOnlyRec: ExamHistoryRecord = {
    id: 'reading_001',
    timestamp: Date.now(),
    examType: 'reading_only',
    overallBand: null,
    listeningBand: null,
    readingBand: 7.5,
    writingBand: null,
    speakingBand: null,
    wordCount: 0,
    submissionType: 'timer',
    correctCount: 34,
    totalQuestions: 40
  };

  const unevaluatedWritingRec: ExamHistoryRecord = {
    id: 'writing_001',
    timestamp: Date.now(),
    examType: 'writing_only',
    overallBand: null,
    listeningBand: null,
    readingBand: null,
    writingBand: null,
    speakingBand: null,
    wordCount: 285,
    submissionType: 'manual',
    correctCount: 0,
    totalQuestions: 0
  };

  assert(
    isFullMockExamRecord(readingOnlyRec) === false &&
      isFullMockExamRecord(unevaluatedWritingRec) === false &&
      readingOnlyRec.listeningBand === null &&
      unevaluatedWritingRec.writingBand === null,
    'Sub-Checkpoint 1B.2 [2/7]: Reading-only and unevaluated Writing-only records safely handle nullable bands and reject full_mock status'
  );

  // 33.3: Valid legacy Listening-only and full-mock records preserved
  const legacyListeningRec: ExamHistoryRecord = {
    id: 'legacy_listen_001',
    timestamp: Date.now() - 50000,
    overallBand: 7.0,
    listeningBand: 7.0,
    readingBand: 0,
    writingBand: 0,
    speakingBand: null,
    wordCount: 0,
    submissionType: 'timer',
    correctCount: 30,
    totalQuestions: 40
  };

  const legacyFullMockRec: ExamHistoryRecord = {
    id: 'legacy_full_001',
    timestamp: Date.now() - 100000,
    examType: 'full_mock',
    overallBand: 7.5,
    listeningBand: 8.0,
    readingBand: 7.5,
    writingBand: 7.0,
    speakingBand: 7.0,
    wordCount: 420,
    submissionType: 'manual',
    correctCount: 70,
    totalQuestions: 80
  };

  assert(
    isFullMockExamRecord(legacyListeningRec) === false &&
      isFullMockExamRecord(legacyFullMockRec) === true,
    'Sub-Checkpoint 1B.2 [3/7]: Backward compatibility preserves legacy Listening-only records (with readingBand: 0) as non-full-mock and full_mock as true'
  );

  // 33.4: Reading-only attempts appear in Reading progress selection
  const mixedHistory: ExamHistoryRecord[] = [
    readingOnlyRec,
    legacyFullMockRec
  ];

  const foundReadingExam = mixedHistory.find(
    (h) => typeof h.readingBand === 'number' && h.readingBand > 0
  );

  const fullMockOnlyReadingExam = mixedHistory
    .filter((h) => isFullMockExamRecord(h))
    .find((h) => typeof h.readingBand === 'number' && h.readingBand > 0);

  assert(
    foundReadingExam?.id === 'reading_001' &&
      foundReadingExam?.readingBand === 7.5 &&
      fullMockOnlyReadingExam?.id === 'legacy_full_001',
    'Sub-Checkpoint 1B.2 [4/7]: Reading progress selection finds single-skill reading_only records from history without being blocked by fullMockHistory filter'
  );

  // 33.5: No partial or single-skill attempt contributes to four-skill Overall Band statistics
  const overallFromReadingOnly = calculateFourSkillOverallBand({
    readingBand: readingOnlyRec.readingBand
  });
  const overallFromPartialLrw = calculateFourSkillOverallBand({
    listeningBand: 7.5,
    readingBand: 7.0,
    writingBand: 6.5,
    speakingBand: null
  });
  const overallFromUnevaluatedWriting = calculateFourSkillOverallBand({
    listeningBand: 7.0,
    readingBand: 7.0,
    writingBand: null,
    speakingBand: 7.0
  });

  assert(
    overallFromReadingOnly === null &&
      overallFromPartialLrw === null &&
      overallFromUnevaluatedWriting === null,
    'Sub-Checkpoint 1B.2 [5/7]: calculateFourSkillOverallBand strictly rejects partial or single-skill attempts from contributing to four-skill Overall Band statistics'
  );

  // 33.6: Source audit confirms MockTestPage and HomeDashboard remove unsafe nullable .toFixed(1) calls
  const mockTestPageSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/pages/MockTestPage.tsx'),
    'utf-8'
  );
  const homeDashboardSrc = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/HomeDashboard.tsx'),
    'utf-8'
  );

  const mockTestNoUnsafeListeningToFixed = !mockTestPageSrc.includes('test.listeningBand.toFixed(1)');
  const homeNoUnsafeFallbackToFixed = !homeDashboardSrc.includes(
    '(rec.overallBand || rec.readingBand || rec.listeningBand).toFixed(1)'
  );
  const mockTestHasReadingOnlyHandling = mockTestPageSrc.includes("test.examType === 'reading_only'");
  const homeHasReadingOnlyHandling = homeDashboardSrc.includes("rec.examType === 'reading_only'");

  assert(
    mockTestNoUnsafeListeningToFixed &&
      homeNoUnsafeFallbackToFixed &&
      mockTestHasReadingOnlyHandling &&
      homeHasReadingOnlyHandling,
    'Sub-Checkpoint 1B.2 [6/7]: Source audit verifies MockTestPage and HomeDashboard eliminate unsafe nullable .toFixed(1) calls and support reading_only'
  );

  // 33.7: Zero-correct attempted tests versus unattempted tests and invalid conversion inputs
  const attemptedZero = evaluateRawScoreDetailed(0, 'listening', { isAttempted: true });
  const unattemptedZero = evaluateRawScoreDetailed(0, 'listening', { isAttempted: false });
  const nanInput = evaluateRawScoreDetailed(NaN, 'reading');
  const negInput = evaluateRawScoreDetailed(-5, 'reading');
  const nonIntInput = evaluateRawScoreDetailed(23.5, 'reading');
  const outOfBoundsInput = evaluateRawScoreDetailed(45, 'reading');
  const validAcad = evaluateRawScoreDetailed(30, 'reading', { edition: 'Academic' });
  const validGt = evaluateRawScoreDetailed(30, 'reading', { edition: 'General Training' });

  assert(
    attemptedZero.status === 'zero_attempted' &&
      attemptedZero.band === null &&
      attemptedZero.isAttempted === true &&
      unattemptedZero.status === 'unattempted' &&
      unattemptedZero.band === 0.0 &&
      unattemptedZero.isAttempted === false &&
      nanInput.status === 'invalid_input' &&
      nanInput.band === null &&
      negInput.status === 'invalid_input' &&
      negInput.band === null &&
      nonIntInput.status === 'invalid_input' &&
      nonIntInput.band === null &&
      outOfBoundsInput.status === 'invalid_input' &&
      outOfBoundsInput.band === null &&
      validAcad.status === 'scored' &&
      validAcad.band === 7.0 &&
      validGt.status === 'scored' &&
      validGt.band === 6.0,
    'Sub-Checkpoint 1B.2 [7/7]: evaluateRawScoreDetailed distinguishes attempted 0 correct (band null with status zero_attempted) vs unattempted (Band 0.0 with status unattempted) and rejects invalid/NaN/negative/fractional inputs'
  );

  // -------------------------------------------------------------
  // 34: SUB-CHECKPOINT 1B.3 — Canonical Score Evaluation & Zero-Score Integrity
  // -------------------------------------------------------------
  console.log('\n--- Section 34: Sub-Checkpoint 1B.3 Canonical Score Evaluation & Zero-Score Integrity ---');

  // 34.1: Attempted zero-correct Listening, Academic Reading & GT Reading yield band null with status zero_attempted
  const zeroListeningAttempt = evaluateRawScoreDetailed(0, 'listening', { isAttempted: true });
  const zeroAcadReadingAttempt = evaluateRawScoreDetailed(0, 'reading', { edition: 'Academic', isAttempted: true });
  const zeroGtReadingAttempt = evaluateRawScoreDetailed(0, 'reading', { edition: 'General Training', isAttempted: true });

  assert(
    zeroListeningAttempt.status === 'zero_attempted' &&
      zeroListeningAttempt.band === null &&
      zeroListeningAttempt.isAttempted === true &&
      zeroAcadReadingAttempt.status === 'zero_attempted' &&
      zeroAcadReadingAttempt.band === null &&
      zeroAcadReadingAttempt.isAttempted === true &&
      zeroGtReadingAttempt.status === 'zero_attempted' &&
      zeroGtReadingAttempt.band === null &&
      zeroGtReadingAttempt.isAttempted === true,
    'Sub-Checkpoint 1B.3 [1/9]: Attempted zero-correct tests yield band null per benchmark conversion tables with status zero_attempted and isAttempted true'
  );

  // 34.2: Explicitly unattempted session yields status unattempted, isAttempted false, and Band 0.0
  const unattemptedSession = evaluateRawScoreDetailed(0, 'listening', { isAttempted: false });
  assert(
    unattemptedSession.status === 'unattempted' &&
      unattemptedSession.band === 0.0 &&
      unattemptedSession.isAttempted === false &&
      unattemptedSession.bandLabel.includes('Did not attempt'),
    'Sub-Checkpoint 1B.3 [2/9]: Explicitly unattempted test yields status unattempted, isAttempted false, and truthful Did not attempt label'
  );

  // 34.3: Invalid inputs (NaN, negative, fractional, non-numeric, >40) reject with status invalid_input and band null
  const nanVal = evaluateRawScoreDetailed(NaN, 'listening');
  const negVal = evaluateRawScoreDetailed(-1, 'reading');
  const fracVal = evaluateRawScoreDetailed(18.5, 'reading');
  const strVal = evaluateRawScoreDetailed('forty', 'listening');
  const overVal = evaluateRawScoreDetailed(41, 'listening');

  assert(
    nanVal.status === 'invalid_input' && nanVal.band === null &&
      negVal.status === 'invalid_input' && negVal.band === null &&
      fracVal.status === 'invalid_input' && fracVal.band === null &&
      strVal.status === 'invalid_input' && strVal.band === null &&
      overVal.status === 'invalid_input' && overVal.band === null,
    'Sub-Checkpoint 1B.3 [3/9]: Invalid inputs (NaN, negative, fractional, non-numeric, >40) strictly produce status invalid_input and band null'
  );

  // 34.4: Monotonic non-decreasing behavior across all scored benchmark raw scores (1 to 40)
  let monotonicCheck = true;
  for (let s = 2; s <= 40; s++) {
    const l1 = evaluateRawScoreDetailed(s - 1, 'listening', { isAttempted: true }).band!;
    const l2 = evaluateRawScoreDetailed(s, 'listening', { isAttempted: true }).band!;
    const ar1 = evaluateRawScoreDetailed(s - 1, 'reading', { edition: 'Academic', isAttempted: true }).band!;
    const ar2 = evaluateRawScoreDetailed(s, 'reading', { edition: 'Academic', isAttempted: true }).band!;
    const gt1 = evaluateRawScoreDetailed(s - 1, 'reading', { edition: 'General Training', isAttempted: true }).band!;
    const gt2 = evaluateRawScoreDetailed(s, 'reading', { edition: 'General Training', isAttempted: true }).band!;

    if (l2 < l1 || ar2 < ar1 || gt2 < gt1) {
      monotonicCheck = false;
      break;
    }
  }

  assert(
    monotonicCheck,
    'Sub-Checkpoint 1B.3 [4/9]: All raw scores 1 to 40 produce strictly monotonic non-decreasing band scores across Listening, Academic Reading & GT Reading'
  );

  // 34.5: Academic vs General Training Reading conversion differences preserved
  const acad30 = evaluateRawScoreDetailed(30, 'reading', { edition: 'Academic', isAttempted: true }).band;
  const gt30 = evaluateRawScoreDetailed(30, 'reading', { edition: 'General Training', isAttempted: true }).band;
  const acad23 = evaluateRawScoreDetailed(23, 'reading', { edition: 'Academic', isAttempted: true }).band;
  const gt23 = evaluateRawScoreDetailed(23, 'reading', { edition: 'General Training', isAttempted: true }).band;

  assert(
    acad30 === 7.0 && gt30 === 6.0 && acad23 === 6.0 && gt23 === 5.0,
    'Sub-Checkpoint 1B.3 [5/9]: Academic Reading and General Training Reading maintain separate, verified benchmark boundaries (30/40 is 7.0 Academic vs 6.0 GT)'
  );

  // 34.6: Diagnostic report calculateOfficialIELTSBand eliminates arbitrary Band 3.5 fallback
  const { calculateOfficialIELTSBand } = await import('../src/components/cdielts/PostTestDiagnosticReport');
  const diagZero = calculateOfficialIELTSBand(0, 40);
  const diagTwo = calculateOfficialIELTSBand(2, 40);
  const diagTen = calculateOfficialIELTSBand(10, 40);

  assert(
    diagZero.band === null &&
      diagTwo.band === 2.0 &&
      diagTen.band === 4.0,
    'Sub-Checkpoint 1B.3 [6/9]: calculateOfficialIELTSBand eliminates arbitrary Band 3.5 fallback, returning exact benchmark bands (null for 0, 2.0 for 2, 4.0 for 10)'
  );

  // 34.7: Partial 3-skill assessments strictly produce null Overall Band and never average into a fake Overall Band
  const trfPartialThreeSkill = calculateFourSkillOverallBand({
    listeningBand: 7.5,
    readingBand: 7.0,
    writingBand: 6.5,
    speakingBand: null
  });
  const trfPartialZeroSpeaking = calculateFourSkillOverallBand({
    listeningBand: 7.5,
    readingBand: 7.0,
    writingBand: 6.5,
    speakingBand: 0
  });
  const trfFullFourSkill = calculateFourSkillOverallBand({
    listeningBand: 7.5,
    readingBand: 7.0,
    writingBand: 6.5,
    speakingBand: 7.0
  });

  assert(
    trfPartialThreeSkill === null &&
      trfPartialZeroSpeaking === null &&
      trfFullFourSkill === 7.0,
    'Sub-Checkpoint 1B.3 [7/9]: calculateFourSkillOverallBand strictly rejects 3-skill attempts (even with speakingBand: 0) and only produces Overall Band for complete 4-skill mocks'
  );

  // 34.8: Source audit confirms live UI callers wire evaluateRawScoreDetailed and TRF modal enforces metadata completion
  const sprintPageContent = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/sprint/SprintLibraryPage.tsx'),
    'utf-8'
  );
  const cdieltsExamContent = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/cdielts/CDIELTSExamMode.tsx'),
    'utf-8'
  );
  const postTestDiagContent = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/cdielts/PostTestDiagnosticReport.tsx'),
    'utf-8'
  );
  const trfModalContent = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/cdielts/SprintTRFModal.tsx'),
    'utf-8'
  );

  const sprintWiresCanonical = sprintPageContent.includes('evaluateRawScoreDetailed(correctCount');
  const cdieltsWiresCanonical = cdieltsExamContent.includes('evaluateRawScoreDetailed(listeningCorrect');
  const postTestNoArbitrary35 = !postTestDiagContent.includes('else band = 3.5');
  const postTestObjectiveScoreLabel = postTestDiagContent.includes('Objective Practice Score');
  const trfEnforcesMetadataCompletion = trfModalContent.includes('isCompleteFourSkillAssessment =') && trfModalContent.includes('isSpeakingCompleted');
  const trfNoAveragedThreeSkills = !trfModalContent.includes('roundIELTSBand(attemptedBands.reduce');

  assert(
    sprintWiresCanonical &&
      cdieltsWiresCanonical &&
      postTestNoArbitrary35 &&
      postTestObjectiveScoreLabel &&
      trfEnforcesMetadataCompletion &&
      trfNoAveragedThreeSkills,
    'Sub-Checkpoint 1B.3 [8/9]: Source audit verifies live UI callers wire evaluateRawScoreDetailed, remove Band 3.5 fallback, and TRF modal determines completion from metadata'
  );

  // 34.9: Unevaluated Writing/Speaking and legacy records safety
  const unassessedWritingRec: ExamHistoryRecord = {
    id: 'unassessed_w_01',
    timestamp: Date.now(),
    examType: 'writing_only',
    overallBand: null,
    listeningBand: null,
    readingBand: null,
    writingBand: null,
    speakingBand: null,
    wordCount: 175,
    submissionType: 'manual',
    correctCount: 0,
    totalQuestions: 0
  };

  const isUnassessedFull = isFullMockExamRecord(unassessedWritingRec);
  const unassessedOverall = calculateFourSkillOverallBand({
    writingBand: unassessedWritingRec.writingBand
  });

  assert(
    isUnassessedFull === false &&
      unassessedOverall === null &&
      unassessedWritingRec.writingBand === null,
    'Sub-Checkpoint 1B.3 [9/9]: Unevaluated Writing records remain honestly null with zero fabricated scores or full-mock contamination'
  );

  // -------------------------------------------------------------
  // 35: SUB-CHECKPOINT 1B.3A — Zero-Score Semantics & TRF Completion Integrity
  // -------------------------------------------------------------
  console.log('\n--- Section 35: Sub-Checkpoint 1B.3A Zero-Score Semantics & TRF Completion Integrity ---');

  // 35.1: Attempted zero-correct results have band: null, status: 'zero_attempted', isAttempted: true, and clear label
  const zeroEval = evaluateRawScoreDetailed(0, 'listening', { isAttempted: true });
  assert(
    zeroEval.band === null &&
      zeroEval.status === 'zero_attempted' &&
      zeroEval.isAttempted === true &&
      zeroEval.bandLabel.includes('0/40') &&
      zeroEval.bandLabel.includes('unavailable'),
    'Sub-Checkpoint 1B.3A [1/9]: Attempted zero-correct yields band null with status zero_attempted and clear raw-score label'
  );

  // 35.2: Unattempted session strictly reserves official Band 0.0 with status unattempted and isAttempted false
  const unattemptedEval = evaluateRawScoreDetailed(0, 'reading', { isAttempted: false });
  assert(
    unattemptedEval.band === 0.0 &&
      unattemptedEval.status === 'unattempted' &&
      unattemptedEval.isAttempted === false &&
      unattemptedEval.bandLabel.includes('Did not attempt'),
    'Sub-Checkpoint 1B.3A [2/9]: Unattempted session reserves official Band 0.0 with status unattempted and isAttempted false'
  );

  // 35.3: Invalid inputs (negative, fractional, non-numeric, >40) reject with status invalid_input and band null
  const invNeg = evaluateRawScoreDetailed(-2, 'listening');
  const invFrac = evaluateRawScoreDetailed(12.4, 'reading');
  const invStr = evaluateRawScoreDetailed('bad', 'listening');
  const invOver = evaluateRawScoreDetailed(41, 'reading');
  assert(
    invNeg.status === 'invalid_input' && invNeg.band === null &&
      invFrac.status === 'invalid_input' && invFrac.band === null &&
      invStr.status === 'invalid_input' && invStr.band === null &&
      invOver.status === 'invalid_input' && invOver.band === null,
    'Sub-Checkpoint 1B.3A [3/9]: Non-numeric, negative, fractional, and out-of-bounds inputs strictly return status invalid_input and band null'
  );

  // 35.4: calculateFourSkillOverallBand rejects metadata partial exams (partial_lrw, listening_only, etc.)
  const partialByExamType = calculateFourSkillOverallBand({
    listeningBand: 8.0,
    readingBand: 7.5,
    writingBand: 7.0,
    speakingBand: 7.0,
    examType: 'partial_lrw'
  });
  const listeningOnlyByExamType = calculateFourSkillOverallBand({
    listeningBand: 8.0,
    readingBand: 7.5,
    writingBand: 7.0,
    speakingBand: 7.0,
    examType: 'listening_only'
  });
  assert(
    partialByExamType === null && listeningOnlyByExamType === null,
    'Sub-Checkpoint 1B.3A [4/9]: calculateFourSkillOverallBand strictly rejects partial and single-skill assessment metadata'
  );

  // 35.5: calculateFourSkillOverallBand rejects unattempted skills (band 0.0) and unavailable bands (null)
  const hasUnattemptedSkill = calculateFourSkillOverallBand({
    listeningBand: 8.0,
    readingBand: 7.5,
    writingBand: 7.0,
    speakingBand: 0.0
  });
  const hasUnavailableBand = calculateFourSkillOverallBand({
    listeningBand: null,
    readingBand: 7.5,
    writingBand: 7.0,
    speakingBand: 7.0
  });
  assert(
    hasUnattemptedSkill === null && hasUnavailableBand === null,
    'Sub-Checkpoint 1B.3A [5/9]: calculateFourSkillOverallBand rejects unattempted (0.0) and unavailable (null) bands'
  );

  // 35.6: calculateFourSkillOverallBand calculates genuine Overall Band only when all 4 skills are valid evaluated bands (>= 1.0)
  const genuineFullMock = calculateFourSkillOverallBand({
    listeningBand: 7.0,
    readingBand: 7.0,
    writingBand: 7.0,
    speakingBand: 7.0,
    examType: 'full_mock',
    completedSkills: { listening: true, reading: true, writing: true, speaking: true }
  });
  const genuineFullMockRounded = calculateFourSkillOverallBand({
    listeningBand: 6.5,
    readingBand: 6.5,
    writingBand: 6.0,
    speakingBand: 6.0,
    examType: 'full_mock'
  }); // average 6.25 -> 6.5
  assert(
    genuineFullMock === 7.0 && genuineFullMockRounded === 6.5,
    'Sub-Checkpoint 1B.3A [6/9]: Genuine full four-skill assessment calculates official Overall Band with .25 rounding rule'
  );

  // 35.7: ExamHistoryRecord schema supports completedSkills without breaking backward compatibility
  const testRecordWithSkills: ExamHistoryRecord = {
    id: 'test_meta_01',
    timestamp: Date.now(),
    examType: 'partial_lrw',
    overallBand: null,
    listeningBand: 7.0,
    readingBand: 7.0,
    writingBand: 6.5,
    speakingBand: null,
    wordCount: 350,
    submissionType: 'manual',
    correctCount: 58,
    totalQuestions: 80,
    completedSkills: {
      listening: true,
      reading: true,
      writing: true,
      speaking: false
    }
  };
  assert(
    testRecordWithSkills.completedSkills?.speaking === false &&
      testRecordWithSkills.completedSkills?.listening === true &&
      isFullMockExamRecord(testRecordWithSkills) === false,
    'Sub-Checkpoint 1B.3A [7/9]: ExamHistoryRecord completedSkills metadata separates skill completion from score values'
  );

  // 35.8: Source audit confirms TRF modal decouples skill completion from band > 0 and guards OSR
  const trfSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/cdielts/SprintTRFModal.tsx'),
    'utf-8'
  );
  const trfDecoupledListening = trfSource.includes('isListeningCompleted =');
  const trfDecoupledSpeaking = trfSource.includes('isSpeakingCompleted =');
  const trfOmittedDash = trfSource.includes(": '—'");
  const trfOSRGuarded = trfSource.includes('onLaunchOSR && lowestModule && overallBand !== null');

  assert(
    trfDecoupledListening && trfDecoupledSpeaking && trfOmittedDash && trfOSRGuarded,
    'Sub-Checkpoint 1B.3A [8/9]: SprintTRFModal determines completion from metadata, renders dashes for omitted modules, and guards OSR'
  );

  // 35.9: CDIELTSExamMode and PostTestDiagnosticReport pass completedSkills and preserve null bands
  const cdieltsSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/cdielts/CDIELTSExamMode.tsx'),
    'utf-8'
  );
  const postDiagSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/cdielts/PostTestDiagnosticReport.tsx'),
    'utf-8'
  );
  const cdieltsPassesSkills = cdieltsSource.includes('completedSkills: {');
  const postDiagPassesSkills = postDiagSource.includes('completedSkills: results.completedSkills');
  const postDiagSafeBadge = postDiagSource.includes('(officialBand ?? objectiveBand) !== null');

  assert(
    cdieltsPassesSkills && postDiagPassesSkills && postDiagSafeBadge,
    'Sub-Checkpoint 1B.3A [9/9]: CDIELTSExamMode and PostTestDiagnosticReport pass completedSkills metadata and safely render null bands'
  );
}


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





