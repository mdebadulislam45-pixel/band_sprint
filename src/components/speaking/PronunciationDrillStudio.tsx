import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Volume2,
  Mic,
  MicOff,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  BookmarkPlus,
  Check,
  Sparkles,
  RotateCcw,
  Ear
} from 'lucide-react';
import { audioService } from '../../services/audioService';
import { soundManager } from '../../utils/audioEffects';
import { addMistake } from '../../utils/vaultStorage';
import { AudioWaveformVisualizer } from '../audio/AudioWaveformVisualizer';

export type PronunciationDrillTrack =
  | 'minimal_pairs'
  | 'word_stress'
  | 'stress_shift'
  | 'connected_speech';

export interface PronunciationDrillItem {
  id: string;
  track: PronunciationDrillTrack;
  label: string;
  targetPhrase: string;
  contrastPair?: [string, string];
  ipa: string;
  stressVisual: Array<{ syllable: string; stressed: boolean }>;
  practiceSentence: string;
  tipEn: string;
  tipBn: string;
  commonTrap: string;
}

export const PRONUNCIATION_DRILL_BANK: PronunciationDrillItem[] = [
  // 1. Minimal Pairs (High-impact for IELTS & South Asian / Bengali candidates)
  {
    id: 'mp_th_s',
    track: 'minimal_pairs',
    label: '/θ/ vs /s/ · Dental Fricative',
    targetPhrase: 'think — sink',
    contrastPair: ['think', 'sink'],
    ipa: '/θɪŋk/ vs /sɪŋk/',
    stressVisual: [
      { syllable: 'THINK', stressed: true },
      { syllable: '·', stressed: false },
      { syllable: 'SINK', stressed: true }
    ],
    practiceSentence: 'I think the kitchen sink needs thorough cleaning this Thursday.',
    tipEn: 'Place the tip of your tongue gently between your upper and lower front teeth and blow air softly for /θ/ ("think", "thorough", "Thursday"). Do not stop the air like /t/.',
    tipBn: '“think” বলার সময় জিহ্বার ডগা উপরের ও নিচের দাঁতের মাঝখানে হালকা রেখে বাতাস বের করুন—বাংলা “থ” বা “স”-এর মতো শক্ত করবেন না।',
    commonTrap: 'Replacing /θ/ with hard /tʰ/ ("tink") or /s/ ("sink").'
  },
  {
    id: 'mp_v_w',
    track: 'minimal_pairs',
    label: '/v/ vs /w/ · Labiodental vs Bilabial',
    targetPhrase: 'vest — west',
    contrastPair: ['vest', 'west'],
    ipa: '/vest/ vs /west/',
    stressVisual: [
      { syllable: 'VEST', stressed: true },
      { syllable: '·', stressed: false },
      { syllable: 'WEST', stressed: true }
    ],
    practiceSentence: 'Very few visitors venture west of the valley in winter.',
    tipEn: 'For /v/, touch your top teeth lightly onto your bottom lip and vibrate your voice. For /w/, round both lips forward like blowing a candle—teeth never touch the lip.',
    tipBn: '/v/ (very, vest) বলার সময় উপরের দাঁত নিচের ঠোঁটে হালকা ছোঁয়ান। আর /w/ (west, winter) বলার সময় দুই ঠোঁট গোল করুন—দাঁত ঠোঁটে লাগবে না।',
    commonTrap: 'Pronouncing both /v/ and /w/ identically as soft Bengali "ভ".'
  },
  {
    id: 'mp_long_short_i',
    track: 'minimal_pairs',
    label: '/iː/ vs /ɪ/ · Tense vs Lax Vowel',
    targetPhrase: 'sheep — ship',
    contrastPair: ['sheep', 'ship'],
    ipa: '/ʃiːp/ vs /ʃɪp/',
    stressVisual: [
      { syllable: 'SHEEP', stressed: true },
      { syllable: '·', stressed: false },
      { syllable: 'SHIP', stressed: true }
    ],
    practiceSentence: 'The researcher kept a detailed sheet of shipping data to leave no gaps.',
    tipEn: 'Stretch your lips into a wide smile and hold /iː/ longer ("sheet", "leave"). Keep /ɪ/ short, quick, and relaxed ("ship", "live").',
    tipBn: 'দীর্ঘ /iː/ (sheep, sheet, leave) বলার সময় ঠোঁট ছড়িয়ে সামান্য টেনে বলুন; আর হ্রস্ব /ɪ/ (ship, live) একদম ছোট ও দ্রুত উচ্চারণ করুন।',
    commonTrap: 'Shortening /iː/ so "leave" sounds like "live" or "sheet" sounds awkward.'
  },
  {
    id: 'mp_p_f',
    track: 'minimal_pairs',
    label: '/p/ vs /f/ · Plosive vs Fricative',
    targetPhrase: 'pool — fool',
    contrastPair: ['pool', 'fool'],
    ipa: '/puːl/ vs /fuːl/',
    stressVisual: [
      { syllable: 'POOL', stressed: true },
      { syllable: '·', stressed: false },
      { syllable: 'FOOL', stressed: true }
    ],
    practiceSentence: 'Public funding plays a pivotal role in protecting fertile farmland.',
    tipEn: 'For /p/, seal both lips and release a crisp puff of air. For /f/, rest upper teeth gently on the lower lip and push steady air—never close both lips.',
    tipBn: '/f/ (funding, fertile) বলার সময় দুই ঠোঁট বন্ধ করে বাংলা “ফ” বলবেন না; উপরের দাঁত নিচের ঠোঁটে ছুঁইয়ে হালকা বাতাস ছাড়ুন।',
    commonTrap: 'Pronouncing /f/ with both lips closed like aspirated /pʰ/.'
  },
  {
    id: 'mp_z_j',
    track: 'minimal_pairs',
    label: '/z/ vs /dʒ/ · Voiced Buzz vs Affricate',
    targetPhrase: 'zoo — jewel',
    contrastPair: ['zoo', 'jewel'],
    ipa: '/zuː/ vs /dʒuːəl/',
    stressVisual: [
      { syllable: 'ZOO', stressed: true },
      { syllable: '·', stressed: false },
      { syllable: 'JEWEL', stressed: true }
    ],
    practiceSentence: 'Zero-emission zones are gradually gaining major support in congested cities.',
    tipEn: 'Make a continuous bee-like buzzing vibration for /z/ ("zero", "zones") without blocking airflow. For /dʒ/ ("gradually", "major"), briefly touch the ridge behind your top teeth.',
    tipBn: '/z/ (zero, zones) বলার সময় বাংলা “জ” না বলে মৌমাছির মতো গুনগুন শব্দ (zzz) করে বাতাস চালু রাখুন।',
    commonTrap: 'Turning /z/ into /dʒ/ ("jero" instead of "zero").'
  },

  // 2. Academic Word Stress (Band 8.0+ Precision)
  {
    id: 'ws_development',
    track: 'word_stress',
    label: '4-Syllable Academic Noun',
    targetPhrase: 'de-VEL-op-ment',
    ipa: '/dɪˈvel.əp.mənt/',
    stressVisual: [
      { syllable: 'de', stressed: false },
      { syllable: 'VEL', stressed: true },
      { syllable: 'op', stressed: false },
      { syllable: 'ment', stressed: false }
    ],
    practiceSentence: 'Sustainable urban development requires long-term government investment.',
    tipEn: 'Punch the second syllable VEL strongly and reduce the last two syllables to soft schwa sounds (/ə/). Never stress the first syllable.',
    tipBn: 'দ্বিতীয় অংশ “VEL”-এ জোর দিন (ডি-ভেল-আপ-মেন্ট নয়, বরং ডি-ভেল্‌-অ্যাপ-মন্ট)। শেষের অংশ হালকা রাখুন।',
    commonTrap: 'Stressing the first syllable ("DE-ve-lop-ment").'
  },
  {
    id: 'ws_economic',
    track: 'word_stress',
    label: '-ic Suffix Stress Rule',
    targetPhrase: 'e-co-NOM-ic',
    ipa: '/ˌiː.kəˈnɒm.ɪk/',
    stressVisual: [
      { syllable: 'e', stressed: false },
      { syllable: 'co', stressed: false },
      { syllable: 'NOM', stressed: true },
      { syllable: 'ic', stressed: false }
    ],
    practiceSentence: 'Economic instability can disproportionately affect developing nations.',
    tipEn: 'Words ending in -ic almost always take primary stress on the syllable right before -ic: eco-NOM-ic, aca-DEM-ic, scien-TIF-ic.',
    tipBn: 'শব্দের শেষে -ic থাকলে ঠিক তার আগের সিলেবলে জোর পড়ে: eco-NOM-ic, aca-DEM-ic, scien-TIF-ic।',
    commonTrap: 'Putting stress on the first syllable ("E-co-no-mic").'
  },
  {
    id: 'ws_comfortable',
    track: 'word_stress',
    label: 'Silent Syllable Reduction',
    targetPhrase: 'COMF-tə-bəl',
    ipa: '/ˈkʌmf.tə.bəl/',
    stressVisual: [
      { syllable: 'COMF', stressed: true },
      { syllable: 'tə', stressed: false },
      { syllable: 'bəl', stressed: false }
    ],
    practiceSentence: 'Commuters feel far more comfortable when public trains run punctually.',
    tipEn: 'Native British speakers compress "comfortable" into 3 crisp syllables (/ˈkʌmf.tə.bəl/), never 4 ("com-for-ta-ble"). Same pattern for "vegetable" (VEG-tə-bəl).',
    tipBn: '“কম-ফর-টে-বল” চার সিলেবলে না বলে মাত্র তিন সিলেবলে “কাম্ফ্‌-টা-বল” বলুন। “vegetable”-ও একইভাবে “ভেজ্‌-টা-বল”।',
    commonTrap: 'Pronouncing "table" fully at the end ("com-for-TAY-bul").'
  },
  {
    id: 'ws_photography',
    track: 'word_stress',
    label: '-graphy Stress Shift',
    targetPhrase: 'pho-TOG-ra-phy',
    ipa: '/fəˈtɒɡ.rə.fi/',
    stressVisual: [
      { syllable: 'pho', stressed: false },
      { syllable: 'TOG', stressed: true },
      { syllable: 'ra', stressed: false },
      { syllable: 'phy', stressed: false }
    ],
    practiceSentence: 'Digital photography has transformed how ordinary people document history.',
    tipEn: 'Compare PHO-to (1st syllable) vs pho-TOG-ra-phy (2nd syllable) vs pho-to-GRAPH-ic (3rd syllable). Examiners love accurate stress shifts across word families.',
    tipBn: 'PHO-to বলার সময় প্রথমে জোর, কিন্তু pho-TOG-ra-phy বলার সময় “TOG” অংশে জোর দিন।',
    commonTrap: 'Keeping stress on "PHO" ("PHO-to-gra-phy").'
  },
  {
    id: 'ws_environmental',
    track: 'word_stress',
    label: '5-Syllable IELTS Core Word',
    targetPhrase: 'en-vi-ron-MEN-tal',
    ipa: '/ɪnˌvaɪ.rənˈmen.təl/',
    stressVisual: [
      { syllable: 'en', stressed: false },
      { syllable: 'vi', stressed: false },
      { syllable: 'ron', stressed: false },
      { syllable: 'MEN', stressed: true },
      { syllable: 'tal', stressed: false }
    ],
    practiceSentence: 'Environmental regulations must strike a balance between growth and conservation.',
    tipEn: 'Keep the "n" in "ron" light and land firmly on MEN before gliding swiftly over "-tal".',
    tipBn: 'চতুর্থ অংশ “MEN”-এ মূল জোর দিন: এন-ভাই-রন-মেন-টাল।',
    commonTrap: 'Flattening all five syllables with equal weight.'
  },

  // 3. Noun vs Verb Stress Shifts
  {
    id: 'ss_record',
    track: 'stress_shift',
    label: 'Noun (RE-cord) vs Verb (re-CORD)',
    targetPhrase: 'RE-cord · re-CORD',
    contrastPair: ['RE-cord (n.)', 're-CORD (v.)'],
    ipa: '/ˈrek.ɔːd/ vs /rɪˈkɔːd/',
    stressVisual: [
      { syllable: 'RE', stressed: true },
      { syllable: 'cord', stressed: false },
      { syllable: '→', stressed: false },
      { syllable: 're', stressed: false },
      { syllable: 'CORD', stressed: true }
    ],
    practiceSentence: 'Researchers plan to record a new record of annual Arctic temperatures.',
    tipEn: '2-syllable noun/verb pairs usually stress the 1st syllable as a NOUN (a RE-cord) and the 2nd syllable as a VERB (to re-CORD).',
    tipBn: 'বিশেষ্য (Noun) হলে প্রথম অংশে জোর (RE-cord), আর ক্রিয়া (Verb) হলে দ্বিতীয় অংশে জোর (re-CORD)।',
    commonTrap: 'Using identical stress for both noun and verb forms.'
  },
  {
    id: 'ss_increase',
    track: 'stress_shift',
    label: 'Noun (IN-crease) vs Verb (in-CREASE)',
    targetPhrase: 'IN-crease · in-CREASE',
    contrastPair: ['IN-crease (n.)', 'in-CREASE (v.)'],
    ipa: '/ˈɪŋ.kriːs/ vs /ɪnˈkriːs/',
    stressVisual: [
      { syllable: 'IN', stressed: true },
      { syllable: 'crease', stressed: false },
      { syllable: '→', stressed: false },
      { syllable: 'in', stressed: false },
      { syllable: 'CREASE', stressed: true }
    ],
    practiceSentence: 'Authorities want to increase funding after a sharp increase in student enrolment.',
    tipEn: 'Essential for Speaking Part 3 & Academic discussions: "a sharp IN-crease" vs "to in-CREASE". Also applies to DE-crease / de-CREASE and IM-pact / im-PACT.',
    tipBn: '“a sharp IN-crease” (প্রথমে জোর) বনাম “to in-CREASE” (শেষে জোর)—IELTS Part 3-এ প্রায়ই এই শব্দ লাগে।',
    commonTrap: 'Saying "in-CREASE" even when using it as a noun.'
  },
  {
    id: 'ss_present',
    track: 'stress_shift',
    label: 'Noun (PRE-sent) vs Verb (pre-SENT)',
    targetPhrase: 'PRE-sent · pre-SENT',
    contrastPair: ['PRE-sent (n.)', 'pre-SENT (v.)'],
    ipa: '/ˈprez.ənt/ vs /prɪˈzent/',
    stressVisual: [
      { syllable: 'PRE', stressed: true },
      { syllable: 'sent', stressed: false },
      { syllable: '→', stressed: false },
      { syllable: 'pre', stressed: false },
      { syllable: 'SENT', stressed: true }
    ],
    practiceSentence: 'At the present moment, artificial intelligence can present complex ethical dilemmas.',
    tipEn: 'Notice the vowel change too: /e/ in PRE-sent (now / gift) becomes light /ɪ/ in pre-SENT (to show / introduce).',
    tipBn: 'বর্তমান বা উপহার অর্থে PRE-sent (প্রথমে জোর), আর উপস্থাপন করা অর্থে pre-SENT (দ্বিতীয় অংশে জোর)।',
    commonTrap: 'Stressing "PRE" when saying "present an argument".'
  },

  // 4. Connected Speech, Linking & Weak Forms (Band 8.5+ Natural Flow)
  {
    id: 'cs_not_at_all',
    track: 'connected_speech',
    label: 'Consonant-to-Vowel Linking',
    targetPhrase: 'not at all → no-ta-tall',
    ipa: '/ˌnɒ.təˈtɔːl/',
    stressVisual: [
      { syllable: 'no', stressed: false },
      { syllable: 'ta', stressed: false },
      { syllable: 'TALL', stressed: true }
    ],
    practiceSentence: 'I do not mind commuting by train at all, provided the seats are comfortable.',
    tipEn: 'Link final consonants directly onto the next vowel so words flow like one smooth rhythm unit instead of choppy stops ("not · at · all").',
    tipBn: '“not · at · all” আলাদা ভেঙে না বলে একটানা যুক্ত করে বলুন: “ন-টা-টল”। এতে স্পিকিং অনেক স্বাভাবিক শোনায়।',
    commonTrap: 'Pausing sharply after every short function word.'
  },
  {
    id: 'cs_first_of_all',
    track: 'connected_speech',
    label: 'Weak Form "of" (/əv/)',
    targetPhrase: 'first of all → firs-tə-vall',
    ipa: '/ˈfɜːs.tə.vɔːl/',
    stressVisual: [
      { syllable: 'FIRS', stressed: true },
      { syllable: 'tə', stressed: false },
      { syllable: 'VALL', stressed: true }
    ],
    practiceSentence: 'First of all, remote working gives parents far greater flexibility.',
    tipEn: 'Reduce "of" to a super-light /əv/ and attach the /v/ straight onto "all". This weak-form rhythm is a hallmark of Band 8.0+ pronunciation.',
    tipBn: '“of” শব্দটি ভারী “অফ” না বলে হালকা “অ্যাভ” করে “all”-এর সাথে জুড়ে দিন: “ফার্স্ট-অ্যা-ভল”।',
    commonTrap: 'Over-pronouncing "OF" with full stress.'
  },
  {
    id: 'cs_would_have',
    track: 'connected_speech',
    label: 'Modal Contraction & Schwa',
    targetPhrase: 'would have been → wud-əv-bin',
    ipa: '/ˈwʊd.əv.bɪn/',
    stressVisual: [
      { syllable: 'WUD', stressed: true },
      { syllable: 'əv', stressed: false },
      { syllable: 'bin', stressed: false }
    ],
    practiceSentence: 'Without public scholarships, studying abroad would have been completely impossible for me.',
    tipEn: 'In conditional sentences, "have" drops its /h/ and reduces to /əv/, and "been" softens to /bɪn/. Keep the main pitch peak on "impossible".',
    tipBn: '“would have been” দ্রুত ও স্বাভাবিকভাবে “উড-অ্যাভ-বিন” উচ্চারণ করুন, “হ্যাভ” আলাদা করে টানবেন না।',
    commonTrap: 'Stressing "HAVE" and "BEEN" equally in 3rd conditionals.'
  }
];

const TRACK_TABS: Array<{ id: PronunciationDrillTrack; label: string; shortLabel: string }> = [
  { id: 'minimal_pairs', label: 'Minimal Pairs (/θ/, /v/-/w/)', shortLabel: 'Minimal Pairs' },
  { id: 'word_stress', label: 'Academic Word Stress', shortLabel: 'Word Stress' },
  { id: 'stress_shift', label: 'Noun vs Verb Shifts', shortLabel: 'Stress Shifts' },
  { id: 'connected_speech', label: 'Linking & Weak Forms', shortLabel: 'Connected Speech' }
];

interface PronunciationDrillStudioProps {
  onShowToast: (msg: string) => void;
}

export const PronunciationDrillStudio: React.FC<PronunciationDrillStudioProps> = ({
  onShowToast
}) => {
  const [activeTrack, setActiveTrack] = useState<PronunciationDrillTrack>('minimal_pairs');
  const [itemIndex, setItemIndex] = useState(0);
  const [speed, setSpeed] = useState<0.75 | 1.0>(1.0);
  const [isPlayingModel, setIsPlayingModel] = useState(false);

  // Recording & compare playback state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isPlayingUser, setIsPlayingUser] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState('');
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const [completedIds, setCompletedIds] = useState<Record<string, boolean>>({});

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const userAudioRef = useRef<HTMLAudioElement | null>(null);

  const trackItems = useMemo(
    () => PRONUNCIATION_DRILL_BANK.filter((item) => item.track === activeTrack),
    [activeTrack]
  );

  const currentItem = trackItems[itemIndex] || trackItems[0];

  useEffect(() => {
    setItemIndex(0);
  }, [activeTrack]);

  useEffect(() => {
    // Reset recording state when switching items
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
    }
    setRecordedAudioUrl(null);
    setSpokenTranscript('');
    setMatchScore(null);
    setIsPlayingUser(false);
    audioService.stop();
    setIsPlayingModel(false);
  }, [currentItem?.id]);

  useEffect(() => {
    return () => {
      audioService.stop();
      try {
        recognitionRef.current?.abort();
      } catch {}
      try {
        mediaRecorderRef.current?.stop();
      } catch {}
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
    };
  }, []);

  const handlePlayModel = (textToSpeak: string, rate: 0.75 | 1.0 = speed) => {
    if (isPlayingModel) {
      audioService.stop();
      setIsPlayingModel(false);
      return;
    }
    setSpeed(rate);
    setIsPlayingModel(true);
    audioService.setPlaybackRate(rate);
    soundManager.playBeep(600, 0.03);

    audioService.speak(textToSpeak, {
      speakerId: 'speaker_04',
      gender: 'male',
      deliveryProfile: 'pronunciation_model',
      onStart: () => setIsPlayingModel(true),
      onEnd: () => setIsPlayingModel(false),
      onError: () => {
        setIsPlayingModel(false);
        onShowToast('Audio playback reconnecting. Please tap Listen again.');
      }
    });
  };

  const scoreMatch = (targetSentence: string, spoken: string): number => {
    const norm = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(Boolean);
    const targetWords = norm(targetSentence);
    const spokenSet = new Set(norm(spoken));
    if (targetWords.length === 0) return 0;
    let hits = 0;
    targetWords.forEach((w) => {
      if (spokenSet.has(w)) hits += 1;
    });
    return Math.min(100, Math.round((hits / targetWords.length) * 100));
  };

  const handleStartRecord = async () => {
    if (isRecording) return;
    audioService.stop();
    setIsPlayingModel(false);
    setSpokenTranscript('');
    setMatchScore(null);
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }

    soundManager.playBeep(520, 0.06);
    setIsRecording(true);

    // 1. Capture candidate audio via MediaRecorder for instant playback comparison
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        audioChunksRef.current = [];
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (ev) => {
          if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          if (blob.size > 0) {
            const url = URL.createObjectURL(blob);
            setRecordedAudioUrl(url);
          }
          stream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        };
        recorder.start();
      }
    } catch {
      // Mic recording fallback: still allow SpeechRecognition if available
    }

    // 2. Live Web Speech Recognition for phoneme/word accuracy scoring
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const rec = new SpeechRecognition();
        recognitionRef.current = rec;
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-GB';
        let finalStr = '';
        rec.onresult = (e: any) => {
          let interim = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const chunk = e.results[i][0].transcript;
            if (e.results[i].isFinal) finalStr += ' ' + chunk;
            else interim += chunk;
          }
          setSpokenTranscript((finalStr + ' ' + interim).trim());
        };
        rec.onerror = () => {};
        rec.start();
      } catch {}
    }
  };

  const handleStopRecord = () => {
    if (!isRecording) return;
    setIsRecording(false);
    soundManager.playBeep(660, 0.05);

    try {
      recognitionRef.current?.stop();
    } catch {}
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    } catch {}

    setTimeout(() => {
      setSpokenTranscript((latest) => {
        const score = latest.trim() ? scoreMatch(currentItem.practiceSentence, latest) : 0;
        setMatchScore(score);
        if (score >= 75) {
          setCompletedIds((prev) => ({ ...prev, [currentItem.id]: true }));
          soundManager.playSuccess();
        }
        return latest;
      });
    }, 350);
  };

  const handleToggleUserPlayback = () => {
    const el = userAudioRef.current;
    if (!el) return;
    if (isPlayingUser) {
      el.pause();
      setIsPlayingUser(false);
    } else {
      el.currentTime = 0;
      el.play().catch(() => {});
      setIsPlayingUser(true);
    }
  };

  const handleSaveDrillToVault = () => {
    if (savedIds[currentItem.id]) return;
    addMistake({
      module: 'speaking',
      title: `Pronunciation Drill: ${currentItem.targetPhrase} (${currentItem.ipa})`,
      prompt: currentItem.practiceSentence,
      questionType: currentItem.label,
      userAnswer: spokenTranscript || currentItem.commonTrap,
      userWrongAnswer: spokenTranscript || currentItem.commonTrap,
      correctAnswer: `${currentItem.targetPhrase} · ${currentItem.ipa}`,
      explanation: currentItem.tipEn,
      trapExplanationEn: currentItem.tipEn,
      trapExplanationBn: currentItem.tipBn
    });
    setSavedIds((prev) => ({ ...prev, [currentItem.id]: true }));
    soundManager.playSuccess();
    onShowToast('Saved pronunciation target to your Mistake Vault.');
  };

  const completedCount = Object.keys(completedIds).length;

  return (
    <div className="space-y-5">
      {/* Track Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl bg-[#EEF3F1] dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/35">
        <div className="flex flex-wrap items-center gap-1.5">
          {TRACK_TABS.map((tab) => {
            const active = activeTrack === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTrack(tab.id);
                  soundManager.playBeep(580, 0.03);
                }}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  active
                    ? 'bg-[#0F4C45] text-white'
                    : 'bg-white dark:bg-[#0B1514] text-[#566664] dark:text-slate-300 border border-[#D3DDDA] dark:border-[#1F8A70]/25 hover:border-[#0F4C45]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="text-[11px] font-mono font-bold text-[#0F4C45] dark:text-[#4DB6A4] px-2.5 py-1 rounded-lg bg-white dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 tabular-nums">
          Mastered: {completedCount} / {PRONUNCIATION_DRILL_BANK.length}
        </div>
      </div>

      {/* Main Pronunciation Drill Card */}
      <div className="rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/35 p-5 sm:p-6 space-y-5">
        {/* Item Meta Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-[#EEF3F1] dark:border-[#1F8A70]/25">
          <div className="space-y-0.5">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#0F4C45] dark:text-[#4DB6A4]">
              {currentItem.label} · Drill {itemIndex + 1} of {trackItems.length}
            </span>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0E1F1E] dark:text-[#EEF3F1] tracking-tight">
              {currentItem.targetPhrase}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/35 font-mono text-xs sm:text-sm font-bold text-[#0F4C45] dark:text-[#F4A62A]">
              {currentItem.ipa}
            </span>
            <button
              type="button"
              onClick={handleSaveDrillToVault}
              disabled={savedIds[currentItem.id]}
              className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                savedIds[currentItem.id]
                  ? 'bg-[#EEF3F1] dark:bg-[#0F4C45]/40 text-[#0F4C45] dark:text-emerald-300 border-[#9EBEB8]'
                  : 'bg-white dark:bg-[#0B1514] hover:bg-[#EEF3F1] text-[#0E1F1E] dark:text-[#EEF3F1] border-[#D3DDDA] dark:border-[#1F8A70]/35'
              }`}
            >
              {savedIds[currentItem.id] ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-3.5 h-3.5 text-[#0F4C45] dark:text-[#F4A62A]" />
                  <span>Save to Vault</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Visual Syllable Stress Map + Contrast Pair Audio Buttons */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 p-4 rounded-2xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#566664] dark:text-slate-400">
                Syllable Stress Blueprint
              </span>
              <span className="text-[10px] font-mono text-[#566664] dark:text-slate-400">
                Gold = Primary Stress Peak
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {currentItem.stressVisual.map((s, idx) => (
                <span
                  key={idx}
                  className={`px-3.5 py-2 rounded-xl font-mono text-sm sm:text-base font-bold transition ${
                    s.stressed
                      ? 'bg-[#0F4C45] text-[#F4A62A] border border-[#1F8A70] shadow-xs scale-[1.03]'
                      : 'bg-white dark:bg-[#11201E] text-[#566664] dark:text-slate-400 border border-[#D3DDDA] dark:border-[#1F8A70]/25'
                  }`}
                >
                  {s.syllable}
                </span>
              ))}
            </div>

            {/* Individual Contrast Word Tap-to-Hear buttons if minimal pair */}
            {currentItem.contrastPair && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-semibold text-[#566664] dark:text-slate-400">
                  Compare side-by-side:
                </span>
                {currentItem.contrastPair.map((word) => (
                  <button
                    key={word}
                    type="button"
                    onClick={() => handlePlayModel(word.replace(/\s*\(.*?\)\s*/g, ''), 0.75)}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#11201E] hover:bg-[#EEF3F1] dark:hover:bg-[#182C29] border border-[#D3DDDA] dark:border-[#1F8A70]/35 text-xs font-bold text-[#0F4C45] dark:text-[#EEF3F1] flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Ear className="w-3.5 h-3.5 text-[#F4A62A]" />
                    <span>{word}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Target Sentence Box */}
            <div className="pt-3 border-t border-[#D3DDDA]/70 dark:border-[#1F8A70]/25 space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#566664] dark:text-slate-400">
                IELTS Exam Context Sentence
              </span>
              <p className="font-display text-base sm:text-lg font-bold text-[#0E1F1E] dark:text-[#EEF3F1] leading-snug">
                “{currentItem.practiceSentence}”
              </p>
            </div>
          </div>

          {/* Right: Bilingual Articulation Coaching */}
          <div className="lg:col-span-5 p-4 rounded-2xl bg-[#EEF3F1]/70 dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 space-y-3 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F4C45] dark:text-[#4DB6A4]">
                <Sparkles className="w-4 h-4 text-[#F4A62A]" />
                <span>Articulation &amp; Mouth Position Guide</span>
              </div>
              <p className="text-xs text-[#0E1F1E] dark:text-[#EEF3F1] leading-relaxed">
                {currentItem.tipEn}
              </p>
              <p className="text-xs text-[#384543] dark:text-slate-300 leading-relaxed pt-2 border-t border-[#D3DDDA] dark:border-[#1F8A70]/25 font-sans">
                {currentItem.tipBn}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-[#FDF2F2] dark:bg-rose-950/35 border border-[#F5B8B8] dark:border-rose-900/50 text-[11px] text-[#8C1D18] dark:text-rose-200">
              <strong>Common IELTS Trap:</strong> {currentItem.commonTrap}
            </div>
          </div>
        </div>

        {/* Action Strip: Slow 0.75x Model · Normal 1.0x Model · Record & Compare */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => handlePlayModel(currentItem.practiceSentence, 0.75)}
            className={`min-h-[46px] px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer border ${
              isPlayingModel && speed === 0.75
                ? 'bg-[#F4A62A] text-[#0E1F1E] border-[#F4A62A]'
                : 'bg-[#EEF3F1] dark:bg-[#0B1514] hover:bg-[#E1ECE9] dark:hover:bg-[#182C29] text-[#0E1F1E] dark:text-[#EEF3F1] border-[#D3DDDA] dark:border-[#1F8A70]/35'
            }`}
          >
            <Volume2 className="w-4 h-4 text-[#0F4C45] dark:text-[#F4A62A]" />
            <span>Slow Model (0.75×)</span>
          </button>

          <button
            type="button"
            onClick={() => handlePlayModel(currentItem.practiceSentence, 1.0)}
            className={`min-h-[46px] px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              isPlayingModel && speed === 1.0
                ? 'bg-[#F4A62A] text-[#0E1F1E]'
                : 'bg-[#0F4C45] hover:bg-[#0B3833] text-white'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>British RP Model (1.0×)</span>
          </button>

          <button
            type="button"
            onClick={isRecording ? handleStopRecord : handleStartRecord}
            className={`min-h-[46px] px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              isRecording
                ? 'bg-[#CC3333] hover:bg-[#A62828] text-white animate-pulse'
                : 'bg-[#F4A62A] hover:bg-[#d98f1d] text-[#0E1F1E]'
            }`}
          >
            {isRecording ? (
              <>
                <MicOff className="w-4 h-4" />
                <span>Stop &amp; Check Pronunciation</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Record &amp; Compare Voice</span>
              </>
            )}
          </button>
        </div>

        {/* Live Recording Waveform */}
        {isRecording && (
          <div className="p-3 rounded-xl bg-[#FDF2F2] dark:bg-rose-950/30 border border-[#F5B8B8] dark:border-rose-900/50 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#8C1D18] dark:text-rose-200">
              <span>Listening to your pronunciation — speak the sentence clearly...</span>
              <span className="font-mono text-[10px]">LIVE MIC</span>
            </div>
            <AudioWaveformVisualizer isRecording={isRecording} height={36} showMetrics={false} />
          </div>
        )}

        {/* Compare Playback & Score Result */}
        {(recordedAudioUrl || matchScore !== null) && !isRecording && (
          <div className="p-4 rounded-2xl bg-[#EEF3F1]/70 dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {matchScore !== null && (
                <div
                  className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center font-mono font-black text-white shrink-0 ${
                    matchScore >= 80
                      ? 'bg-[#0F4C45]'
                      : matchScore >= 55
                      ? 'bg-[#D0891F]'
                      : 'bg-[#CC3333]'
                  }`}
                >
                  <span className="text-base leading-none tabular-nums">{matchScore}%</span>
                  <span className="text-[9px] uppercase opacity-80 mt-0.5">Match</span>
                </div>
              )}
              <div className="space-y-1">
                <div className="text-xs font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                  {matchScore !== null && matchScore >= 80
                    ? 'Crisp articulation! Your stress and phoneme contrast registered cleanly.'
                    : 'Compare your playback with the 0.75× British model and try one more pass.'}
                </div>
                {spokenTranscript && (
                  <p className="text-xs text-[#566664] dark:text-slate-400 italic">
                    Heard: “{spokenTranscript}”
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {recordedAudioUrl && (
                <>
                  <audio
                    ref={userAudioRef}
                    src={recordedAudioUrl}
                    onEnded={() => setIsPlayingUser(false)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={handleToggleUserPlayback}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                  >
                    {isPlayingUser ? (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>Pause Yours</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Play Your Voice</span>
                      </>
                    )}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleStartRecord}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/35 text-[#0E1F1E] dark:text-[#EEF3F1] text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-[#EEF3F1] transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        )}

        {/* Navigation Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#EEF3F1] dark:border-[#1F8A70]/25">
          <button
            type="button"
            onClick={() => {
              setItemIndex((prev) => (prev > 0 ? prev - 1 : trackItems.length - 1));
              soundManager.playBeep(560, 0.03);
            }}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] hover:bg-[#E1ECE9] dark:hover:bg-[#182C29] text-[#0E1F1E] dark:text-[#EEF3F1] font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <span className="text-xs font-mono text-[#566664] dark:text-slate-400 tabular-nums">
            {itemIndex + 1} / {trackItems.length}
          </span>

          <button
            type="button"
            onClick={() => {
              setItemIndex((prev) => (prev < trackItems.length - 1 ? prev + 1 : 0));
              soundManager.playBeep(620, 0.03);
            }}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
          >
            <span>Next Drill</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
