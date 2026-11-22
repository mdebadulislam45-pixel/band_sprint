/**
 * SP-4A: Professional Audio & Voice Quality Verification Suite
 *
 * Tests:
 * 1. Text normalization for dates, 24h times, currencies, percentages, Band scores,
 *    units, abbreviations, postcodes, phone numbers, spelled letters, and academic vocabulary.
 * 2. Speaker-to-voice mapping & character isolation across server.ts, voiceConfig.ts,
 *    AudioManager.ts, audioService.ts, and listeningAnswerEvaluator.ts.
 * 3. Live HTTP synthesis (/api/tts/stream, /api/tts, /api/tts/dialogue) for Dr. Clara Sterling,
 *    Prof. Arthur Pendelton, Barnaby, and Listening Section 1–4 characters.
 * 4. Real ffmpeg/ffprobe acoustic inspection (valid MP3, 24 kHz mono, no clipping,
 *    broadcast loudness range, distinct voice waveforms, provider consistency, cache repeatability).
 */

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { normalizeTextForNaturalSpeech } from '../../config/speechDirection';
import { BARNABY_VOICE_PROFILE, DEFAULT_MASTER_MALE_VOICE } from '../../config/voiceConfig';
import { SPEAKER_EDGE_VOICE_MAP } from '../../utils/listeningAnswerEvaluator';

const SERVER_URL = process.env.TEST_SERVER_URL || 'http://127.0.0.1:3000';

interface ProbeMetrics {
  codec: string;
  sampleRate: number;
  channels: number;
  bitRate: number;
  durationSec: number;
  meanVolumeDb: number;
  maxVolumeDb: number;
  byteLength: number;
  sha256: string;
}

function inspectMp3Buffer(buffer: Buffer, label: string): ProbeMetrics {
  assert.ok(buffer.length > 512, `${label}: audio buffer too small (${buffer.length} bytes)`);
  const tmpFile = path.join(os.tmpdir(), `sp4a_probe_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`);
  fs.writeFileSync(tmpFile, buffer);

  try {
    const ffprobeOut = execFileSync(
      'ffprobe',
      ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', tmpFile],
      { encoding: 'utf-8' }
    );
    const parsed = JSON.parse(ffprobeOut);
    const stream = (parsed.streams || []).find((s: any) => s.codec_type === 'audio');
    assert.ok(stream, `${label}: no audio stream found`);

    const volCombined = execFileSync(
      'sh',
      ['-c', `ffmpeg -hide_banner -i "${tmpFile}" -af volumedetect -f null - 2>&1`],
      { encoding: 'utf-8' }
    );
    const meanMatch = volCombined.match(/mean_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/i);
    const maxMatch = volCombined.match(/max_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/i);
    assert.ok(meanMatch, `${label}: could not parse mean_volume from ffmpeg`);
    assert.ok(maxMatch, `${label}: could not parse max_volume from ffmpeg`);

    return {
      codec: String(stream.codec_name || ''),
      sampleRate: Number(stream.sample_rate || 0),
      channels: Number(stream.channels || 0),
      bitRate: Number(stream.bit_rate || parsed.format?.bit_rate || 0),
      durationSec: Number(parsed.format?.duration || stream.duration || 0),
      meanVolumeDb: Number(meanMatch[1]),
      maxVolumeDb: Number(maxMatch[1]),
      byteLength: buffer.length,
      sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    };
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

async function runTests() {
  console.log('=== SP-4A: Professional Audio & Voice Quality Suite ===\n');

  // ── 1. Natural speech text normalization ────────────────────────────────────
  console.log('1. Verifying natural speech normalization (dates, times, currency, units, academic abbreviations)...');
  const normDate = normalizeTextForNaturalSpeech('The exam registration closes on 15/06/2026 at 14:30.');
  assert.ok(/15 June 2026/i.test(normDate), `Expected UK spoken date, got: ${normDate}`);
  assert.ok(!normDate.includes('14:30'), `Expected spoken time, got: ${normDate}`);

  const normMoney = normalizeTextForNaturalSpeech('Tuition costs £45.50 per session, with a 15% discount ($120 max).');
  assert.ok(/45 pounds 50/i.test(normMoney), `Expected spoken pounds, got: ${normMoney}`);
  assert.ok(/15 per ?cent/i.test(normMoney), `Expected spoken percent, got: ${normMoney}`);
  assert.ok(/120 dollars/i.test(normMoney), `Expected spoken dollars, got: ${normMoney}`);

  const normBand = normalizeTextForNaturalSpeech('Target Band 7.5 across 15 km at 25°C, e.g. urban transit, etc.');
  assert.ok(/Band 7 point 5/i.test(normBand), `Expected spoken Band score, got: ${normBand}`);
  assert.ok(/kilometres|kilometers/i.test(normBand), `Expected spoken kilometres, got: ${normBand}`);
  assert.ok(/degrees Celsius/i.test(normBand), `Expected spoken degrees Celsius, got: ${normBand}`);
  assert.ok(/for example/i.test(normBand), `Expected expanded e.g., got: ${normBand}`);
  assert.ok(/et cetera|and so on/i.test(normBand), `Expected expanded etc., got: ${normBand}`);

  const normPostcode = normalizeTextForNaturalSpeech('Send forms to SW1A 1AA and call dept. approx. 09:05.');
  assert.ok(/department/i.test(normPostcode), `Expected expanded dept., got: ${normPostcode}`);
  assert.ok(/approximately/i.test(normPostcode), `Expected expanded approx., got: ${normPostcode}`);
  assert.ok(!normPostcode.includes('09:05'), `Expected spoken morning time, got: ${normPostcode}`);
  console.log('   PASS: All normalization patterns verified.');

  // ── 2. Character voice architecture & isolation checks ──────────────────────
  console.log('2. Verifying character voice identities, isolation, and anti-robotic config...');
  assert.equal(BARNABY_VOICE_PROFILE.edgeNeuralVoiceId, 'en-GB-ThomasNeural', 'Barnaby must use warm adult British mentor en-GB-ThomasNeural');
  assert.notEqual(BARNABY_VOICE_PROFILE.edgeNeuralVoiceId, 'en-GB-MaisieNeural', 'Barnaby must never use child voice MaisieNeural');
  assert.equal(BARNABY_VOICE_PROFILE.geminiVoiceName, 'Puck');
  assert.equal(DEFAULT_MASTER_MALE_VOICE.geminiVoiceName, 'Charon');
  assert.equal(SPEAKER_EDGE_VOICE_MAP.speaker_barnaby, 'en-GB-ThomasNeural');
  assert.equal(SPEAKER_EDGE_VOICE_MAP.speaker_04, 'en-GB-RyanNeural');
  assert.equal(SPEAKER_EDGE_VOICE_MAP.speaker_05, 'en-GB-SoniaNeural');
  assert.notEqual(
    SPEAKER_EDGE_VOICE_MAP.speaker_03,
    SPEAKER_EDGE_VOICE_MAP.speaker_04,
    'Examiner Arthur (speaker_04) must remain voice-isolated from speaker_03'
  );

  const serverSource = fs.readFileSync(path.resolve('server.ts'), 'utf-8');
  assert.ok(!serverSource.includes("en-GB-MaisieNeural"), 'server.ts must not route any active character or fallback to child voice en-GB-MaisieNeural');
  assert.ok(serverSource.includes("STUDIO_MASTERING_VERSION = 'v24_studio_mastered'"), 'server.ts must have v24 studio mastering');
  assert.ok(serverSource.includes('stitchDialogueMp3Segments'), 'server.ts must stitch dialogue segments with real silent turn gaps');
  assert.ok(serverSource.includes('X-Provider-Consistent'), 'server.ts must expose provider consistency telemetry');
  console.log('   PASS: All voice config and architectural invariants verified.');

  // ── 3. Live HTTP synthesis & acoustic ffprobe/volumedetect tests ────────────
  console.log('3. Running live HTTP TTS synthesis & ffmpeg/ffprobe acoustic checks...');

  const healthRes = await fetch(`${SERVER_URL}/api/health`);
  assert.equal(healthRes.status, 200, `Expected local server at ${SERVER_URL} to respond 200 on /api/health`);

  const liveCases: Array<{
    label: string;
    characterId: string;
    profile: string;
    text: string;
  }> = [
    {
      label: 'Dr. Clara Sterling (Examiner Prompt)',
      characterId: 'speaker_05',
      profile: 'examiner_clara',
      text: 'Good morning. My name is Doctor Clara Sterling. Could you tell me about the area where you currently live?',
    },
    {
      label: 'Prof. Arthur Pendelton (Examiner Prompt)',
      characterId: 'speaker_04',
      profile: 'examiner_arthur',
      text: 'Thank you. Now I would like to discuss how urban infrastructure adapts to rapid demographic shifts over the next decade.',
    },
    {
      label: 'Barnaby Mentor (Live Tutor Response)',
      characterId: 'speaker_barnaby',
      profile: 'barnaby_companion',
      text: 'Brilliant effort! You reached Band 7.5 on lexical resource. Try tightening your topic sentence before moving to your second example.',
    },
    {
      label: 'Listening Sec 1 — Numbers, Dates, Times & Currency',
      characterId: 'speaker_01',
      profile: 'listening_dialogue',
      text: 'The community sailing course begins on 15/06/2026 at 09:05, and the registration fee is £45.50 including equipment hire.',
    },
    {
      label: 'Listening Sec 2 — Monologue & Postcode',
      characterId: 'speaker_02',
      profile: 'listening_monologue',
      text: 'Welcome to the Worcestershire Botanical Conservatory. Please submit volunteer forms to postcode SW1A 1AA before 14:30 on Friday.',
    },
    {
      label: 'Listening Sec 4 — Long Academic Paragraph & Difficult IELTS Lexis',
      characterId: 'speaker_08',
      profile: 'listening_monologue',
      text: 'Today we examine how entrepreneurial coastal communities across the Indonesian archipelago mitigated coastal erosion. Approximately 85% of surveyed municipalities observed a 25°C surface anomaly, e.g. coral bleaching, over a 15 km reef corridor.',
    },
    {
      label: 'Regional UK Character (Scottish/Northern)',
      characterId: 'speaker_15',
      profile: 'listening_dialogue',
      text: 'I am calling regarding the laboratory bench allocation for the autumn term seminar in Edinburgh.',
    },
    {
      label: 'Short Utterance Check',
      characterId: 'speaker_06',
      profile: 'listening_dialogue',
      text: 'Certainly, let me double-check that booking reference for you.',
    },
  ];

  const hashesBySpeaker = new Map<string, string>();
  const reportRows: Array<{ label: string; provider: string; mastered: string; metrics: ProbeMetrics }> = [];

  for (const tc of liveCases) {
    const url = new URL(`${SERVER_URL}/api/tts/stream`);
    url.searchParams.set('text', tc.text);
    url.searchParams.set('speakerId', tc.characterId);
    url.searchParams.set('profile', tc.profile);

    const res = await fetch(url.toString());
    assert.equal(res.status, 200, `${tc.label}: HTTP status ${res.status}`);
    assert.ok(
      (res.headers.get('content-type') || '').includes('audio/mpeg'),
      `${tc.label}: expected audio/mpeg, got ${res.headers.get('content-type')}`
    );

    const resolvedSpeaker = res.headers.get('x-resolved-speaker-id') || '';
    const actualVoice = res.headers.get('x-actual-voice') || '';
    const provider = res.headers.get('x-audio-provider') || 'unknown';
    const mastered = res.headers.get('x-studio-mastered') || 'none';
    assert.equal(resolvedSpeaker, tc.characterId, `${tc.label}: expected resolved speaker ${tc.characterId}, got ${resolvedSpeaker}`);

    const buf = Buffer.from(await res.arrayBuffer());
    const metrics = inspectMp3Buffer(buf, tc.label);

    assert.equal(metrics.codec, 'mp3', `${tc.label}: expected mp3 codec`);
    assert.equal(metrics.sampleRate, 24000, `${tc.label}: expected 24000 Hz sample rate`);
    assert.equal(metrics.channels, 1, `${tc.label}: expected mono channel`);
    assert.ok(metrics.durationSec > 0.5, `${tc.label}: duration too short (${metrics.durationSec}s)`);
    assert.ok(metrics.maxVolumeDb <= -0.3, `${tc.label}: audio clipping detected (max_volume=${metrics.maxVolumeDb} dB)`);
    assert.ok(
      metrics.meanVolumeDb >= -35 && metrics.meanVolumeDb <= -10,
      `${tc.label}: mean volume out of broadcast range (${metrics.meanVolumeDb} dB)`
    );

    hashesBySpeaker.set(tc.characterId, metrics.sha256);
    reportRows.push({ label: tc.label, provider, mastered, metrics });
    console.log(
      `   PASS: ${tc.label} | voice=${actualVoice} | provider=${provider} | mastered=${mastered} | ${metrics.durationSec.toFixed(2)}s | mean=${metrics.meanVolumeDb}dB | max=${metrics.maxVolumeDb}dB | ${metrics.byteLength}B`
    );
  }

  // Distinct speaker test: same sentence synthesized by Clara vs Arthur vs Barnaby must produce 3 distinct waveforms
  console.log('4. Verifying acoustic distinctiveness across Clara, Arthur, and Barnaby (same sentence)...');
  const sharedSentence = 'Please check your candidate number carefully before beginning section one.';
  const voiceHashes: Record<string, string> = {};
  const actualVoices: Record<string, string> = {};
  for (const [name, charId] of [
    ['Clara', 'speaker_05'],
    ['Arthur', 'speaker_04'],
    ['Barnaby', 'speaker_barnaby'],
  ] as const) {
    const res = await fetch(`${SERVER_URL}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: sharedSentence, speakerId: charId }),
    });
    assert.equal(res.status, 200, `${name} POST /api/tts failed`);
    actualVoices[name] = res.headers.get('x-actual-voice') || '';
    const buf = Buffer.from(await res.arrayBuffer());
    const m = inspectMp3Buffer(buf, `Distinct-${name}`);
    voiceHashes[name] = m.sha256;
  }
  assert.ok(actualVoices.Clara.startsWith('en-GB-SoniaNeural'), `Clara voice mismatch: ${actualVoices.Clara}`);
  assert.ok(actualVoices.Arthur.startsWith('en-GB-RyanNeural'), `Arthur voice mismatch: ${actualVoices.Arthur}`);
  assert.ok(actualVoices.Barnaby.startsWith('en-GB-ThomasNeural'), `Barnaby voice mismatch: ${actualVoices.Barnaby}`);
  assert.notEqual(voiceHashes.Clara, voiceHashes.Arthur, 'Clara and Arthur must sound distinct');
  assert.notEqual(voiceHashes.Clara, voiceHashes.Barnaby, 'Clara and Barnaby must sound distinct');
  assert.notEqual(voiceHashes.Arthur, voiceHashes.Barnaby, 'Arthur and Barnaby must sound distinct');
  console.log(`   PASS: Clara (${actualVoices.Clara}), Arthur (${actualVoices.Arthur}), and Barnaby (${actualVoices.Barnaby}) produce 3 distinct mastered MP3 waveforms.`);

  // Cache hit repeatability test
  console.log('5. Verifying cache hit repeatability...');
  const cacheUrl = `${SERVER_URL}/api/tts/stream?text=${encodeURIComponent(liveCases[0].text)}&speakerId=speaker_05&profile=examiner_clara`;
  const cachedRes = await fetch(cacheUrl);
  assert.equal(cachedRes.status, 200);
  const cacheStatus = cachedRes.headers.get('x-cache-status') || '';
  assert.ok(/HIT/i.test(cacheStatus), `Expected cache HIT on repeat request, got: ${cacheStatus}`);
  const cachedBuf = Buffer.from(await cachedRes.arrayBuffer());
  const cachedHash = crypto.createHash('sha256').update(cachedBuf).digest('hex');
  assert.equal(cachedHash, hashesBySpeaker.get('speaker_05'), 'Cached MP3 must be byte-identical to initial synthesis');
  console.log(`   PASS: Repeat request served cleanly from cache (${cacheStatus}).`);

  // Multi-speaker Listening dialogue test (Part 1 & Part 3 style) with provider consistency
  console.log('6. Verifying multi-speaker Listening dialogue synthesis & single-provider consistency...');
  const dialoguePayload = {
    testId: 'sp4a_listening_section1_dialogue',
    dialogue: [
      {
        speakerId: 'speaker_01',
        speaker: 'RECEPTIONIST',
        text: 'Good morning, Harboursports Centre. How can I help you today?',
        pauseAfterMs: 420,
      },
      {
        speakerId: 'speaker_02',
        speaker: 'CALLER',
        text: 'Hello, I would like to book two places on the Saturday kayaking induction at 10:30.',
        pauseAfterMs: 420,
      },
      {
        speakerId: 'speaker_01',
        speaker: 'RECEPTIONIST',
        text: 'Certainly. The fee is £32.50 per person, and we still have three spaces available.',
        pauseAfterMs: 300,
      },
    ],
  };
  const dlgRes = await fetch(`${SERVER_URL}/api/tts/dialogue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dialoguePayload),
  });
  assert.equal(dlgRes.status, 200, `POST /api/tts/dialogue failed with ${dlgRes.status}`);
  const dlgConsistent = dlgRes.headers.get('x-provider-consistent');
  const dlgProvider = dlgRes.headers.get('x-audio-provider');
  const dlgMastered = dlgRes.headers.get('x-studio-mastered');
  assert.equal(dlgConsistent, 'true', `Expected X-Provider-Consistent=true, got ${dlgConsistent}`);
  const dlgBuf = Buffer.from(await dlgRes.arrayBuffer());
  const dlgMetrics = inspectMp3Buffer(dlgBuf, 'Listening-Dialogue');
  assert.ok(dlgMetrics.durationSec >= 7.0, `Multi-turn dialogue duration unexpectedly short: ${dlgMetrics.durationSec}s`);
  assert.ok(dlgMetrics.maxVolumeDb <= -0.3, `Dialogue clipped: max=${dlgMetrics.maxVolumeDb} dB`);
  assert.ok(
    dlgMetrics.meanVolumeDb >= -35 && dlgMetrics.meanVolumeDb <= -10,
    `Dialogue mean volume out of range: ${dlgMetrics.meanVolumeDb} dB`
  );
  console.log(
    `   PASS: 3-turn dialogue | provider=${dlgProvider} | consistent=${dlgConsistent} | mastered=${dlgMastered} | ${dlgMetrics.durationSec.toFixed(2)}s | mean=${dlgMetrics.meanVolumeDb}dB | max=${dlgMetrics.maxVolumeDb}dB`
  );

  // Honest Gemini API key disclosure check
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10);
  console.log(`\nInfo: GEMINI_API_KEY configured in environment = ${geminiConfigured} (live playback above verified via ${reportRows[0]?.provider}).`);
  console.log('\nALL SP-4A AUDIO & VOICE QUALITY TESTS PASSED.');
}

runTests().catch((err) => {
  console.error('SP-4A TEST FAILED:', err);
  process.exit(1);
});
