import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Shuffle,
  Clock,
  Sparkles,
  CheckCircle2,
  BookmarkPlus,
  Check,
  Send,
  RotateCcw,
  Play,
  Pause,
  MessageSquare,
  Wand2,
  X,
  ArrowRight,
  ShieldAlert,
  Camera,
  Gauge
} from 'lucide-react';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';
import { addMistake } from '../../utils/vaultStorage';
import { evaluateSingleSpeakingTurn, checkSpeakingInputGate } from '../../services/SpeakingEvaluationService';
import { speechRecognitionService } from '../../services/SpeechRecognitionService';
import { SpeakingAnswerRecord, AcousticTelemetry } from '../../types/speakingTypes';
import { ExaminerHumanoidCanvas } from './ExaminerHumanoidCanvas';
import { CandidateCameraBooth, CameraPresenceMetrics } from './CandidateCameraBooth';
import { LiveSpeakingPartnerHUD } from './LiveSpeakingPartnerHUD';

export interface Part1DrillTopic {
  id: string;
  topic: string;
  category: string;
  questions: string[];
  sampleResponses: string[];
}

export const COMMON_PART1_DRILL_TOPICS: Part1DrillTopic[] = [
  {
    id: 'hometown',
    topic: 'Hometown & Accommodation',
    category: 'Cambridge Part 1 Core',
    questions: [
      'Let’s talk about your hometown. Where do you come from, and what do you like most about living there?',
      'Has your hometown changed much over the past ten years?',
      'Would you say your hometown is a good place for young people to build a career?',
      'In the future, would you prefer to live in a bustling metropolis or a quiet countryside town?'
    ],
    sampleResponses: [
      'I come from Dhaka, which is a very lively city. Actually I am living there since my childhood and it have many historical places and great street food.',
      'Yes, my city has changed dramatically over the last decade. New metro rail lines and commercial high-rises have transformed the skyline.',
      'Definitely, because the concentration of universities and technology startups provides abundant career opportunities for ambitious graduates.'
    ]
  },
  {
    id: 'work_studies',
    topic: 'Work & Academic Studies',
    category: 'Cambridge Part 1 Core',
    questions: [
      'Do you currently work, or are you a student? Tell me a little about what your daily routine involves.',
      'Why did you choose this particular field of study or profession?',
      'What is the most challenging aspect of your current studies or job?',
      'How do you think artificial intelligence or automation might affect your field in the coming years?'
    ],
    sampleResponses: [
      'Currently I am a final-year university student studying computer science. Every day I goes to the campus lab and work on software algorithms.',
      'I chose software engineering because I have always been fascinated by how scalable code can solve real-world healthcare and logistical problems.',
      'The most demanding aspect is balancing rigorous academic deadlines with practical project work.'
    ]
  },
  {
    id: 'daily_routine',
    topic: 'Daily Routine & Free Time',
    category: 'Cambridge Part 1 Core',
    questions: [
      'What is your favourite part of the day, and how do you usually spend it?',
      'Do you prefer to follow a strict daily schedule, or do you like keeping your days flexible?',
      'How do you usually unwind after a stressful day of work or study?',
      'If you had an extra two hours of free time every day, how would you use it?'
    ],
    sampleResponses: [
      'My favourite time of day is early morning because the neighbourhood is peaceful and I can concentrate on my reading without any distractions.',
      'Yesterday I wake up very late so I didn’t had enough time to finish my morning exercise routine.',
      'To unwind after a demanding day, I usually brew a cup of green tea and listen to acoustic instrumental music.'
    ]
  },
  {
    id: 'technology_apps',
    topic: 'Technology & Mobile Apps',
    category: 'Cambridge Part 1 Core',
    questions: [
      'What mobile application do you use most frequently in your daily life, and why?',
      'Do you think people nowadays rely too heavily on smartphones for simple tasks?',
      'Have you ever tried taking a digital detox or limiting your screen time?',
      'What kind of technological invention would make your daily life easier?'
    ],
    sampleResponses: [
      'The app I use most frequently is Notion because it helps me organize my academic lecture notes and spaced-repetition flashcards.',
      'Many people is addicted to social media nowadays and they spends too much hours scrolling on their phones.',
      'Yes, I recently disabled non-essential push notifications, which noticeably improved my reading focus.'
    ]
  },
  {
    id: 'reading_books',
    topic: 'Reading & Literature',
    category: 'Cambridge Part 1 Core',
    questions: [
      'Do you enjoy reading books in your leisure time, or do you prefer digital articles and podcasts?',
      'What kinds of books or genres do you find most engaging?',
      'Did your reading habits change as you transitioned from childhood to adulthood?',
      'Do you prefer reading a physical hardcover book or using an e-reader?'
    ],
    sampleResponses: [
      'I genuinely enjoy reading non-fiction biographies and popular science books before going to sleep.',
      'When I was a child I use to read adventure comic books, but now I prefers analytical history and economics.',
      'Although e-readers are convenient for commuting, I still prefer the tactile experience of a physical book.'
    ]
  },
  {
    id: 'food_cooking',
    topic: 'Food, Cooking & Dining',
    category: 'Cambridge Part 1 Core',
    questions: [
      'Do you enjoy cooking meals at home, or do you prefer eating out with friends?',
      'What is a traditional dish from your country that you would recommend to a foreign visitor?',
      'Have people’s dietary habits in your country changed in recent years?',
      'Do you think schools should teach practical nutrition and cooking skills to children?'
    ],
    sampleResponses: [
      'I enjoy cooking at home on weekends because it allows me to experiment with fresh spices and control the nutritional balance.',
      'In my country, peoples loves eating traditional biryani during festivals, which is cooked with fragrant basmati rice.',
      'Definitely, teaching culinary literacy in schools equips children with lifelong health habits.'
    ]
  },
  {
    id: 'weather_seasons',
    topic: 'Weather & Seasons',
    category: 'Cambridge Part 1 Core',
    questions: [
      'What is the weather like in your country during different seasons of the year?',
      'Does the weather ever affect your mood or your productivity?',
      'Do you prefer hot summer days or crisp winter mornings, and why?',
      'Have you noticed any unusual weather patterns in your region recently?'
    ],
    sampleResponses: [
      'My country experiences a tropical monsoon climate, so summers are quite humid while winter mornings are pleasantly cool.',
      'If the weather is very rainy and dark, I feels sleepy and cannot able to focus properly on my tasks.',
      'I much prefer crisp winter mornings because the cool breeze makes outdoor jogging invigorating.'
    ]
  },
  {
    id: 'music_art',
    topic: 'Music & Cultural Arts',
    category: 'Cambridge Part 1 Core',
    questions: [
      'What kind of music do you listen to when you want to focus or relax?',
      'Have you ever learned to play a musical instrument, or would you like to learn one?',
      'Do you prefer listening to recorded music on headphones or attending a live concert?',
      'Why do you think traditional folk music remains important in modern society?'
    ],
    sampleResponses: [
      'When I am studying complex material, I listen to classical piano or lo-fi instrumental tracks because lyrics can distract me.',
      'I tried learning acoustic guitar two years ago, although it was much more harder than I expected.',
      'Traditional folk music preserves the collective memory and storytelling heritage of a nation.'
    ]
  }
];

export const FREE_TALK_SCENARIOS = [
  {
    id: 'free_career_future',
    label: 'Global Career & AI Future',
    opener:
      'Let’s have an open conversation about your future ambitions and technology. What kind of impact do you hope to make in your career over the next five years?'
  },
  {
    id: 'free_travel_culture',
    label: 'World Travel & Cultural Exchange',
    opener:
      'I would love to hear your perspective on travel and culture. If you could live in any foreign city for a year to study or work, where would you go and why?'
  },
  {
    id: 'free_daily_life',
    label: 'Modern Lifestyle & Well-Being',
    opener:
      'Let’s chat naturally about modern life. How do you balance high academic or professional ambition with personal mental well-being?'
  },
  {
    id: 'free_environment_cities',
    label: 'Sustainable Cities & Society',
    opener:
      'Let’s discuss how cities are evolving. What is one major improvement you think urban planners should prioritize in your city?'
  }
];

export interface DetectedGrammarMistake {
  id: string;
  observed: string;
  corrected: string;
  category: string;
  explanationEn: string;
  explanationBn: string;
  severity: 'major' | 'minor';
}

export interface ConversationTurn {
  id: string;
  role: 'examiner' | 'candidate';
  speakerName: string;
  text: string;
  timestamp: number;
  isValidAttempt?: boolean;
  wordCount?: number;
  feedbackTitle?: string;
  feedbackEn?: string;
  feedbackBn?: string;
  wpm?: number;
  grammarErrors?: DetectedGrammarMistake[];
  band8Upgrade?: string;
  estimatedBand?: number;
}

interface LiveAvatarSpeakingPartnerProps {
  isModal?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  initialTopicId?: string;
  initialGender?: 'female' | 'male';
  autoStart5MinDrill?: boolean;
  onShowToast?: (msg: string) => void;
  onNavigateToFullLab?: () => void;
}

/**
 * Generates an adaptive, contextual conversational response + Socratic follow-up
 * based on the candidate's actual spoken words in AI Live Speaking Partner (Free-Talk) mode.
 */
function buildAdaptiveLivePartnerReply(
  candidateText: string,
  grammarErrors: DetectedGrammarMistake[],
  scenarioLabel: string
): string {
  const lower = candidateText.toLowerCase();

  const coachingPrefix =
    grammarErrors.length > 0
      ? `Quick Band 8.5 tip: instead of "${grammarErrors[0].observed}", try saying "${grammarErrors[0].corrected}". `
      : 'That was expressed with very clear grammatical control! ';

  // Extract salient content concepts from the candidate's utterance
  if (lower.includes('software') || lower.includes('computer') || lower.includes('ai') || lower.includes('technology') || lower.includes('code')) {
    return `${coachingPrefix}Your point about technology and digital innovation is fascinating. Do you think rapid automation will create more creative roles for graduates, or will it make entry-level positions much more competitive?`;
  }
  if (lower.includes('city') || lower.includes('dhaka') || lower.includes('traffic') || lower.includes('metro') || lower.includes('urban')) {
    return `${coachingPrefix}That gives a vivid picture of urban life. In your view, can public infrastructure projects alone solve urban congestion, or should companies encourage remote working instead?`;
  }
  if (lower.includes('book') || lower.includes('read') || lower.includes('study') || lower.includes('university') || lower.includes('learn')) {
    return `${coachingPrefix}I really appreciate how thoughtfully you approach learning. How do you personally decide which ideas or skills are worth investing deep focus into?`;
  }
  if (lower.includes('food') || lower.includes('cook') || lower.includes('biryani') || lower.includes('health') || lower.includes('exercise')) {
    return `${coachingPrefix}That sounds wonderful! Do you think fast-paced modern schedules make it harder for younger generations to preserve traditional culinary and health habits?`;
  }
  if (lower.includes('morning') || lower.includes('music') || lower.includes('relax') || lower.includes('time') || lower.includes('schedule')) {
    return `${coachingPrefix}Having a deliberate daily rhythm makes a huge difference. When your schedule gets unexpectedly hectic, how do you protect your focus and energy?`;
  }

  // Extract a meaningful 3+ letter keyword from candidate speech to echo naturally
  const stopWords = new Set([
    'that', 'this', 'with', 'from', 'have', 'been', 'were', 'they', 'their', 'what', 'when',
    'where', 'which', 'while', 'about', 'would', 'could', 'should', 'because', 'really',
    'very', 'much', 'many', 'some', 'more', 'most', 'also', 'usually', 'actually', 'think', 'prefer'
  ]);
  const words = candidateText
    .replace(/[^a-zA-Z\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 5 && !stopWords.has(w.toLowerCase()));
  const keyword = words.length > 0 ? words[Math.floor(words.length / 2)].toLowerCase() : scenarioLabel.toLowerCase();

  return `${coachingPrefix}Building on what you mentioned regarding ${keyword}, how do you think attitudes toward this will evolve in your country over the next decade, and why?`;
}

/**
 * Real-time client-side + service-backed Grammatical Error Finder
 */
function detectLiveSpokenGrammarErrors(transcript: string): DetectedGrammarMistake[] {
  const results: DetectedGrammarMistake[] = [];
  const text = transcript.trim();
  if (!text) return results;

  const rules: Array<{
    regex: RegExp;
    category: string;
    getFix: (match: RegExpMatchArray) => { observed: string; corrected: string; en: string; bn: string; severity: 'major' | 'minor' };
  }> = [
    {
      regex: /\b(I|we|they|you)\s+(is|was|has|goes|prefers|feels|spends|loves|wants|needs|works|makes|takes)\b/i,
      category: 'Subject–Verb Agreement',
      getFix: (m) => {
        const subj = m[1];
        const verb = m[2].toLowerCase();
        const map: Record<string, string> = {
          is: subj.toLowerCase() === 'i' ? 'am' : 'are',
          was: subj.toLowerCase() === 'i' ? 'was' : 'were',
          has: 'have',
          goes: 'go',
          prefers: 'prefer',
          feels: 'feel',
          spends: 'spend',
          loves: 'love',
          wants: 'want',
          needs: 'need',
          works: 'work',
          makes: 'make',
          takes: 'take'
        };
        return {
          observed: m[0],
          corrected: `${subj} ${map[verb] || verb.replace(/s$/, '')}`,
          en: `Plural/first-person subject "${subj}" requires the base verb form "${map[verb] || verb.replace(/s$/, '')}", not third-person singular "-s".`,
          bn: `"${subj}" এর সাথে verb-এর শেষে 's/es' যুক্ত হয় না; সঠিক রূপ হলো "${subj} ${map[verb] || verb.replace(/s$/, '')}"।`,
          severity: 'major'
        };
      }
    },
    {
      regex: /\b(he|she|it|everybody|everyone)\s+(are|were|have|go|prefer|feel|spend|love|want|need|work)\b/i,
      category: '3rd-Person Singular Agreement',
      getFix: (m) => {
        const subj = m[1];
        const verb = m[2].toLowerCase();
        const map: Record<string, string> = {
          are: 'is',
          were: 'was',
          have: 'has',
          go: 'goes',
          prefer: 'prefers',
          feel: 'feels',
          spend: 'spends',
          love: 'loves',
          want: 'wants',
          need: 'needs',
          work: 'works'
        };
        return {
          observed: m[0],
          corrected: `${subj} ${map[verb] || verb + 's'}`,
          en: `Singular subject "${subj}" requires a singular verb ("${map[verb] || verb + 's'}").`,
          bn: `একবচন কর্তা "${subj}" এর সাথে একবচন ক্রিয়া ("${map[verb] || verb + 's'}") ব্যবহৃত হয়।`,
          severity: 'major'
        };
      }
    },
    {
      regex: /\b(I am|he is|she is|we are|they are)\s+(living|working|studying|staying)\s+([a-z\s]{0,20}?)\b(since|for)\s+/i,
      category: 'Present Perfect Continuous Tense',
      getFix: (m) => {
        const subj = m[1].split(' ')[0];
        const aux = /^(he|she|it)$/i.test(subj) ? 'has been' : 'have been';
        const verb = m[2];
        const mid = m[3] || '';
        const prep = m[4];
        return {
          observed: m[0].trim(),
          corrected: `${subj} ${aux} ${verb} ${mid}${prep}`.replace(/\s+/g, ' ').trim(),
          en: 'When describing an action that started in the past and continues up to the present with "since" or "for", use the Present Perfect Continuous ("have/has been + V-ing").',
          bn: 'অতীতে শুরু হয়ে এখনো চলছে এমন কাজের ক্ষেত্রে "since" বা "for" থাকলে "am/is/are + V-ing" না হয়ে "have/has been + V-ing" হয়।',
          severity: 'major'
        };
      }
    },
    {
      regex: /\b(didn't|did not)\s+(had|went|saw|took|made|came|knew|got|thought|bought)\b/i,
      category: 'Double Past Tense Error',
      getFix: (m) => {
        const neg = m[1];
        const past = m[2].toLowerCase();
        const baseMap: Record<string, string> = {
          had: 'have',
          went: 'go',
          saw: 'see',
          took: 'take',
          made: 'make',
          came: 'come',
          knew: 'know',
          got: 'get',
          thought: 'think',
          bought: 'buy'
        };
        return {
          observed: m[0],
          corrected: `${neg} ${baseMap[past] || past}`,
          en: `After the past auxiliary "${neg}", always use the base infinitive form ("${baseMap[past] || past}"), never the past tense form.`,
          bn: `"${neg}" এর পরে verb-এর মূল রূপ (base form "${baseMap[past] || past}") বসে, past form বসে না।`,
          severity: 'major'
        };
      }
    },
    {
      regex: /\b(Yesterday|Last\s+\w+|Two\s+years\s+ago)\s+I\s+(wake|go|see|take|make|come|eat|buy)\b/i,
      category: 'Past Time Marker Tense Shift',
      getFix: (m) => {
        const marker = m[1];
        const v = m[2].toLowerCase();
        const pastMap: Record<string, string> = {
          wake: 'woke',
          go: 'went',
          see: 'saw',
          take: 'took',
          make: 'made',
          come: 'came',
          eat: 'ate',
          buy: 'bought'
        };
        return {
          observed: m[0],
          corrected: `${marker} I ${pastMap[v] || v + 'ed'}`,
          en: `Finished past time expressions ("${marker}") require the Simple Past tense ("${pastMap[v] || v + 'ed'}").`,
          bn: `অতীত সময় নির্দেশক শব্দের ("${marker}") সাথে Simple Past tense ("${pastMap[v] || v + 'ed'}") ব্যবহার করতে হবে।`,
          severity: 'major'
        };
      }
    },
    {
      regex: /\b(peoples|informations|advices|furnitures|equipments|homeworks|knowledges)\b/i,
      category: 'Uncountable / Irregular Noun Plural',
      getFix: (m) => {
        const raw = m[1].toLowerCase();
        const fixed = raw === 'peoples' ? 'people' : raw.replace(/s$/, '');
        return {
          observed: m[1],
          corrected: fixed,
          en: `"${fixed}" is already plural or an uncountable noun in English and does not take a plural "-s" in standard usage.`,
          bn: `"${fixed}" শব্দটি uncountable বা বহুবচন হওয়ায় এর সাথে অতিরিক্ত 's' যুক্ত হয় না।`,
          severity: 'major'
        };
      }
    },
    {
      regex: /\b(more\s+better|more\s+harder|more\s+easier|more\s+faster|more\s+higher)\b/i,
      category: 'Double Comparative Redundancy',
      getFix: (m) => {
        const comp = m[1].split(/\s+/)[1];
        return {
          observed: m[1],
          corrected: `much ${comp}`,
          en: `Avoid combining "more" with an "-er" comparative adjective. Use "much ${comp}" or "considerably ${comp}" instead.`,
          bn: `Comparative শব্দের ("${comp}") আগে "more" বসে না; জোর দিতে চাইলে "much ${comp}" ব্যবহার করুন।`,
          severity: 'minor'
        };
      }
    },
    {
      regex: /\b(cannot\s+able\s+to|can't\s+able\s+to)\b/i,
      category: 'Modal Redundancy ("Can" + "Able To")',
      getFix: (m) => ({
        observed: m[1],
        corrected: 'am unable to / cannot',
        en: 'Do not combine modal "cannot" with "able to". Say "I am unable to" or simply "I cannot".',
        bn: '"cannot" এবং "able to" একসাথে ব্যবহৃত হয় না; "I am unable to" অথবা শুধু "I cannot" বলুন।',
        severity: 'major'
      })
    },
    {
      regex: /\b(use\s+to)\s+(read|go|play|live|work|study|eat)\b/i,
      category: 'Past Habit ("Used to + Infinitive")',
      getFix: (m) => ({
        observed: m[0],
        corrected: `used to ${m[2]}`,
        en: 'For past habits or states that no longer happen, use "used to + base verb" with a "-d".',
        bn: 'অতীতের অভ্যাস বোঝাতে "use to" নয়, "used to + verb" ব্যবহৃত হয়।',
        severity: 'minor'
      })
    },
    {
      regex: /\b(too\s+much)\s+(hours|people|cars|books|things|problems|places|students)\b/i,
      category: 'Quantifier Countability ("Too Many" vs "Too Much")',
      getFix: (m) => ({
        observed: m[0],
        corrected: `too many ${m[2]}`,
        en: `Since "${m[2]}" is a plural countable noun, use "too many ${m[2]}" instead of "too much".`,
        bn: `"${m[2]}" গণনাযোগ্য (countable) বহুবচন হওয়ায় এর আগে "too much" না বসে "too many" বসবে।`,
        severity: 'minor'
      })
    },
    {
      regex: /\b(married\s+with|discuss\s+about|comprise\s+of|despite\s+of)\b/i,
      category: 'Preposition Collocation Trap',
      getFix: (m) => {
        const phrase = m[1].toLowerCase();
        const fixMap: Record<string, string> = {
          'married with': 'married to',
          'discuss about': 'discuss',
          'comprise of': 'comprise / consist of',
          'despite of': 'despite / in spite of'
        };
        return {
          observed: m[1],
          corrected: fixMap[phrase] || phrase,
          en: `In formal Cambridge English, use "${fixMap[phrase]}" without the redundant preposition.`,
          bn: `সঠিক Preposition Collocation হলো "${fixMap[phrase]}"।`,
          severity: 'minor'
        };
      }
    }
  ];

  rules.forEach((rule, idx) => {
    const match = text.match(rule.regex);
    if (match) {
      const fix = rule.getFix(match);
      results.push({
        id: `live_gram_${idx}_${Date.now()}`,
        observed: fix.observed,
        corrected: fix.corrected,
        category: rule.category,
        explanationEn: fix.en,
        explanationBn: fix.bn,
        severity: fix.severity
      });
    }
  });

  return results;
}

export const LiveAvatarSpeakingPartner: React.FC<LiveAvatarSpeakingPartnerProps> = ({
  isModal = false,
  isOpen = true,
  onClose,
  initialTopicId,
  initialGender = 'female',
  autoStart5MinDrill = true,
  onShowToast,
  onNavigateToFullLab
}) => {
  // Select Female ('female' - Dr. Clara Sterling) or Male ('male' - Prof. Arthur Pendelton)
  const [avatarGender, setAvatarGender] = useState<'female' | 'male'>(initialGender);
  // Select Partner Mode ('part1_drill' - 5-Min Structured Drill | 'ai_live_partner' - Adaptive Free-Talk Partner)
  const [partnerMode, setPartnerMode] = useState<'part1_drill' | 'ai_live_partner'>('part1_drill');
  const [freeTalkScenarioIndex, setFreeTalkScenarioIndex] = useState<number>(0);
  // Non-occluding Live Speaking Partner HUD Overlay Toggle
  const [showLiveHud, setShowLiveHud] = useState<boolean>(true);

  // Camera Booth Visibility & Telemetry
  const [showCameraBooth, setShowCameraBooth] = useState<boolean>(true);
  const [cameraMetrics, setCameraMetrics] = useState<CameraPresenceMetrics>({
    isCameraActive: false,
    eyeContactScore: 92,
    postureStatus: 'Camera Off',
    studioLighting: true
  });

  // Randomized Part 1 Topic State
  const [activeTopic, setActiveTopic] = useState<Part1DrillTopic>(() => {
    if (initialTopicId) {
      const found = COMMON_PART1_DRILL_TOPICS.find((t) => t.id === initialTopicId);
      if (found) return found;
    }
    const randomIndex = Math.floor(Math.random() * COMMON_PART1_DRILL_TOPICS.length);
    return COMMON_PART1_DRILL_TOPICS[randomIndex];
  });

  const [questionIndex, setQuestionIndex] = useState<number>(0);

  // 5-Minute (300 seconds) Focused Speaking Drill Timer
  const [remainingSeconds, setRemainingSeconds] = useState<number>(300);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(autoStart5MinDrill);

  // Avatar Speech & Lip-Sync State
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState<boolean>(false);
  const [mouthOpenness, setMouthOpenness] = useState<number>(0);

  // Candidate Live Microphone / Text Input State
  const [isListeningMic, setIsListeningMic] = useState<boolean>(false);
  const [candidateInput, setCandidateInput] = useState<string>('');
  const [isAnalyzingTurn, setIsAnalyzingTurn] = useState<boolean>(false);
  const [liveAcoustic, setLiveAcoustic] = useState<AcousticTelemetry>({
    volumeRms: 0,
    pitchHz: 0,
    pitchVarianceHz: 24,
    expressivenessScore: 76,
    energyDropOffs: 0
  });

  // Conversation History & Live Grammar Error Log
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [allGrammarErrors, setAllGrammarErrors] = useState<DetectedGrammarMistake[]>([]);
  const [savedErrorIds, setSavedErrorIds] = useState<Record<string, boolean>>({});

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const turnStartTimeRef = useRef<number>(Date.now());

  const examinerProfile =
    avatarGender === 'female'
      ? {
          name: 'Dr. Clara Sterling',
          role: 'Senior Cambridge Oral Assessor',
          speakerId: 'speaker_05',
          accent: 'British RP (Female)'
        }
      : {
          name: 'Prof. Arthur Pendelton',
          role: 'Principal Oxbridge Oral Assessor',
          speakerId: 'speaker_04',
          accent: 'British RP (Male)'
        };

  // Lip-sync mouth oscillator while examiner is speaking
  useEffect(() => {
    if (!isAvatarSpeaking) {
      setMouthOpenness(0);
      return;
    }
    const interval = window.setInterval(() => {
      setMouthOpenness(0.25 + Math.random() * 0.75);
    }, 95);
    return () => clearInterval(interval);
  }, [isAvatarSpeaking]);

  // 5-Minute Drill Countdown Timer
  useEffect(() => {
    if (!isOpen || !isTimerRunning) return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          soundManager.playSuccess();
          if (onShowToast) {
            onShowToast('5-Minute Speaking Session Completed! Review your grammar & fluency report below.');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, isTimerRunning, onShowToast]);

  const speakExaminerTurn = useCallback(
    (text: string, genderOverride?: 'female' | 'male') => {
      const targetGender = genderOverride || avatarGender;
      stopSpeech();
      setIsAvatarSpeaking(true);
      speakBritish(text, {
        speakerId: targetGender === 'female' ? 'speaker_05' : 'speaker_04',
        gender: targetGender,
        rate: 0.98,
        onEnd: () => {
          setIsAvatarSpeaking(false);
          turnStartTimeRef.current = Date.now();
        },
        onError: () => {
          setIsAvatarSpeaking(false);
        }
      });
    },
    [avatarGender]
  );

  // Initialize or reset conversation when topic or mode changes
  const startTopicSession = useCallback(
    (
      topic: Part1DrillTopic,
      gender: 'female' | 'male',
      mode: 'part1_drill' | 'ai_live_partner' = partnerMode,
      scenarioIdx: number = freeTalkScenarioIndex,
      speakNow = true
    ) => {
      stopSpeech();
      const exName = gender === 'female' ? 'Dr. Clara Sterling' : 'Prof. Arthur Pendelton';
      const scenario = FREE_TALK_SCENARIOS[scenarioIdx] || FREE_TALK_SCENARIOS[0];

      const greeting =
        mode === 'ai_live_partner'
          ? `Hello! I'm ${exName}, your AI Live Speaking Partner. We are in Adaptive Free-Talk mode (${scenario.label}). ${scenario.opener}`
          : `Hello! I'm ${exName}. Welcome to your 5-minute IELTS Part 1 focus drill on ${topic.topic}. ${topic.questions[0]}`;

      setQuestionIndex(0);
      setConversation([
        {
          id: 'ex_init_' + Date.now(),
          role: 'examiner',
          speakerName: exName,
          text: greeting,
          timestamp: Date.now()
        }
      ]);
      setCandidateInput('');
      turnStartTimeRef.current = Date.now();

      if (speakNow && isOpen) {
        speakExaminerTurn(greeting, gender);
      }
    },
    [isOpen, partnerMode, freeTalkScenarioIndex, speakExaminerTurn]
  );

  // Sync initialGender when prop changes and notify global Barnaby companion to hide while inside Speaking Studio
  useEffect(() => {
    setAvatarGender(initialGender);
  }, [initialGender]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('speaking_studio_visibility', { detail: { open: Boolean(isOpen) } })
    );
    if (isOpen && conversation.length === 0) {
      startTopicSession(activeTopic, initialGender, partnerMode, freeTalkScenarioIndex, true);
    }
    return () => {
      stopSpeech();
      window.dispatchEvent(
        new CustomEvent('speaking_studio_visibility', { detail: { open: false } })
      );
    };
  }, [isOpen]);

  // Auto-scroll conversation
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Switch between 5-Min Part 1 Drill & AI Live Speaking Partner (Adaptive Free-Talk)
  const handleSwitchPartnerMode = (nextMode: 'part1_drill' | 'ai_live_partner') => {
    if (nextMode === partnerMode) return;
    soundManager.playBeep(620, 0.04);
    setPartnerMode(nextMode);
    startTopicSession(activeTopic, avatarGender, nextMode, freeTalkScenarioIndex, true);
    if (onShowToast) {
      onShowToast(
        nextMode === 'ai_live_partner'
          ? 'Switched to AI Live Speaking Partner (Adaptive Free-Talk Conversation)'
          : `Switched to 5-Minute Part 1 Drill (${activeTopic.topic})`
      );
    }
  };

  // Randomize Topic or Scenario Handler
  const handleShuffleRandomTopic = () => {
    soundManager.playBeep(640, 0.04);
    if (partnerMode === 'ai_live_partner') {
      const nextIdx = (freeTalkScenarioIndex + 1) % FREE_TALK_SCENARIOS.length;
      setFreeTalkScenarioIndex(nextIdx);
      startTopicSession(activeTopic, avatarGender, 'ai_live_partner', nextIdx, true);
      if (onShowToast) {
        onShowToast(`New Live Conversation Theme: ${FREE_TALK_SCENARIOS[nextIdx].label}`);
      }
      return;
    }

    const otherTopics = COMMON_PART1_DRILL_TOPICS.filter((t) => t.id !== activeTopic.id);
    const nextTopic = otherTopics[Math.floor(Math.random() * otherTopics.length)] || COMMON_PART1_DRILL_TOPICS[0];
    setActiveTopic(nextTopic);
    setRemainingSeconds(300);
    setIsTimerRunning(true);
    startTopicSession(nextTopic, avatarGender, 'part1_drill', freeTalkScenarioIndex, true);
    if (onShowToast) {
      onShowToast(`New Part 1 Drill Topic: ${nextTopic.topic} (5:00 Timer Reset)`);
    }
  };

  // Toggle Avatar Gender (Woman vs Man)
  const handleSwitchAvatarGender = (newGender: 'female' | 'male') => {
    if (newGender === avatarGender) return;
    soundManager.playBeep(580, 0.03);
    setAvatarGender(newGender);
    const newName = newGender === 'female' ? 'Dr. Clara Sterling' : 'Prof. Arthur Pendelton';
    const currentQ =
      partnerMode === 'ai_live_partner'
        ? FREE_TALK_SCENARIOS[freeTalkScenarioIndex]?.opener
        : activeTopic.questions[questionIndex] || activeTopic.questions[0];
    speakExaminerTurn(`Hello, I am ${newName}. Let's continue: ${currentQ}`, newGender);
  };

  // Toggle Live Web Speech API + Web Audio Acoustic Telemetry Microphone
  const handleToggleMic = () => {
    if (isListeningMic) {
      speechRecognitionService.stopListening(true);
      setIsListeningMic(false);
      return;
    }

    stopSpeech();
    setIsAvatarSpeaking(false);

    const basePrefix = candidateInput ? candidateInput + ' ' : '';
    const started = speechRecognitionService.startListening({
      onStatusChange: (status) => {
        if (status === 'listening') {
          soundManager.playBeep(680, 0.04);
          setIsListeningMic(true);
          turnStartTimeRef.current = Date.now();
        } else if (status === 'stopped' || status === 'error') {
          setIsListeningMic(false);
        }
      },
      onInterimResult: (transcript) => {
        setCandidateInput((basePrefix + transcript).trim());
      },
      onFinalResult: (transcript) => {
        setCandidateInput((basePrefix + transcript).trim());
      },
      onAcousticMetrics: (metrics) => {
        setLiveAcoustic(metrics);
      },
      onError: (err) => {
        setIsListeningMic(false);
        if (onShowToast) {
          onShowToast(err);
        }
      }
    });

    if (!started && onShowToast) {
      onShowToast('Browser voice recognition unavailable in this frame. Type or click a sample spoken response below!');
    }
  };

  // Submit Candidate Spoken Response -> Run Strict 5-Word Input Gate -> Live Grammatical Error Finder -> Examiner Replies & Advances
  const handleSubmitCandidateResponse = async (overrideText?: string) => {
    const rawText = (overrideText ?? candidateInput).trim();

    if (isListeningMic) {
      speechRecognitionService.stopListening(true);
      setIsListeningMic(false);
    }

    stopSpeech();
    setIsAvatarSpeaking(false);

    // STRICT 5-WORD INPUT GATE
    const gate = checkSpeakingInputGate(rawText);
    if (!gate.isValidAttempt) {
      soundManager.playBeep(380, 0.06);
      const invalidTurn: ConversationTurn = {
        id: 'cand_unassessed_' + Date.now(),
        role: 'candidate',
        speakerName: 'You (Candidate)',
        text: rawText || '(No audible speech captured)',
        timestamp: Date.now(),
        isValidAttempt: false,
        wordCount: gate.wordCount,
        feedbackTitle: gate.feedbackTitle,
        feedbackEn: gate.feedbackEn,
        feedbackBn: gate.feedbackBn,
        estimatedBand: 0.0
      };

      const retryPrompt = `I could only hear ${gate.wordCount} word${gate.wordCount === 1 ? '' : 's'}. In the IELTS Speaking test, you need to provide a sustained spoken response of at least five words so I can assess your fluency, vocabulary, and grammar. Please press Speak Now and try answering again.`;
      const examinerRetryTurn: ConversationTurn = {
        id: 'ex_retry_' + (Date.now() + 1),
        role: 'examiner',
        speakerName: examinerProfile.name,
        text: retryPrompt,
        timestamp: Date.now() + 1
      };

      setConversation((prev) => [...prev, invalidTurn, examinerRetryTurn]);
      setCandidateInput('');
      if (onShowToast) {
        onShowToast(`${gate.feedbackTitle}: ${gate.feedbackEn}`);
      }
      speakExaminerTurn(retryPrompt);
      return;
    }

    setIsAnalyzingTurn(true);
    soundManager.playBeep(620, 0.04);

    const elapsedSec = Math.max(8, Math.round((Date.now() - turnStartTimeRef.current) / 1000));
    const words = gate.wordCount;
    const wpm = Math.min(185, Math.max(85, Math.round((words / Math.max(6, elapsedSec)) * 60)));

    // 1. Run instant client-side Spoken Grammar Detector
    const instantLocalErrors = detectLiveSpokenGrammarErrors(rawText);

    // 2. Also run SpeakingEvaluationService for deep Band 8 rephrasing & additional grammar traps
    const currentPromptText =
      partnerMode === 'ai_live_partner'
        ? [...conversation].reverse().find((c) => c.role === 'examiner')?.text ||
          FREE_TALK_SCENARIOS[freeTalkScenarioIndex].opener
        : activeTopic.questions[questionIndex] || activeTopic.questions[0];

    const record: SpeakingAnswerRecord = {
      questionId: `part1_drill_${activeTopic.id}_${questionIndex}`,
      part: partnerMode === 'ai_live_partner' ? 3 : 1,
      topic: partnerMode === 'ai_live_partner' ? FREE_TALK_SCENARIOS[freeTalkScenarioIndex].label : activeTopic.topic,
      questionText: currentPromptText,
      transcript: rawText,
      startTime: Date.now() - elapsedSec * 1000,
      endTime: Date.now(),
      durationSec: elapsedSec,
      wordCount: words,
      wordsPerMinute: wpm,
      pauseCount: 1,
      longPauseCount: 0,
      fillerCount: 0,
      detectedFillers: [],
      acousticMetrics: speechRecognitionService.getLastAcousticTelemetry()
    };

    let mergedErrors: DetectedGrammarMistake[] = [...instantLocalErrors];
    let band8Model = '';
    let estBand = 0.0;

    try {
      const evalResult = await evaluateSingleSpeakingTurn(record);
      estBand = evalResult.estimatedBands.overall;
      band8Model = evalResult.band8Answer.modelAnswer;

      if (Array.isArray(evalResult.grammaticalErrors)) {
        evalResult.grammaticalErrors.forEach((err, idx) => {
          const duplicate = mergedErrors.some(
            (existing) => existing.observed.toLowerCase() === err.observed.toLowerCase()
          );
          if (!duplicate) {
            mergedErrors.push({
              id: `eval_gram_${idx}_${Date.now()}`,
              observed: err.observed,
              corrected: err.corrected,
              category: err.ruleCategory || 'Grammatical Range & Accuracy',
              explanationEn:
                (err as any).explanationEn ||
                err.explanation ||
                'Maintain accurate Cambridge grammatical agreement and tense consistency.',
              explanationBn:
                (err as any).explanationBn || 'স্পিকিংয়ে সঠিক Tense এবং Subject-Verb Agreement বজায় রাখুন।',
              severity: 'major'
            });
          }
        });
      }
    } catch {
      estBand = words >= 25 ? 6.5 : 5.5;
    }

    const candidateTurn: ConversationTurn = {
      id: 'cand_' + Date.now(),
      role: 'candidate',
      speakerName: 'You (Candidate)',
      text: rawText,
      timestamp: Date.now(),
      isValidAttempt: true,
      wordCount: words,
      wpm,
      grammarErrors: mergedErrors,
      band8Upgrade: band8Model,
      estimatedBand: estBand
    };

    if (mergedErrors.length > 0) {
      setAllGrammarErrors((prev) => [...mergedErrors, ...prev]);
    }

    // Prepare Examiner's live conversational follow-up based on active mode
    let examinerReplyText = '';
    if (partnerMode === 'ai_live_partner') {
      examinerReplyText = buildAdaptiveLivePartnerReply(
        rawText,
        mergedErrors,
        FREE_TALK_SCENARIOS[freeTalkScenarioIndex].label
      );
    } else {
      const nextQIndex = (questionIndex + 1) % activeTopic.questions.length;
      const nextQuestion = activeTopic.questions[nextQIndex];
      const grammarCoachingNote =
        mergedErrors.length > 0
          ? `Quick grammar note: instead of saying "${mergedErrors[0].observed}", a Band 8 speaker would say "${mergedErrors[0].corrected}". `
          : 'Your grammatical structure there was clean and natural! ';
      examinerReplyText = `${grammarCoachingNote}Now, let's build on that: ${nextQuestion}`;
      setQuestionIndex(nextQIndex);
    }

    const examinerTurn: ConversationTurn = {
      id: 'ex_' + (Date.now() + 1),
      role: 'examiner',
      speakerName: examinerProfile.name,
      text: examinerReplyText,
      timestamp: Date.now() + 1
    };

    setConversation((prev) => [...prev, candidateTurn, examinerTurn]);
    setCandidateInput('');
    setIsAnalyzingTurn(false);

    speakExaminerTurn(examinerReplyText);
  };

  const handleSaveGrammarErrorToVault = (err: DetectedGrammarMistake) => {
    if (savedErrorIds[err.id]) return;
    addMistake({
      module: 'speaking',
      title: `Spoken Grammar Fix: ${err.category}`,
      prompt: `Part 1 Speaking Drill (${activeTopic.topic})`,
      questionType: `Part 1 Live Grammar Finder`,
      userAnswer: err.observed,
      correctAnswer: err.corrected,
      explanation: err.explanationEn,
      trapExplanationEn: err.explanationEn,
      trapExplanationBn: err.explanationBn,
      sourceContext: `AI Speaking Partner (${examinerProfile.name}) · ${activeTopic.topic}`
    });
    setSavedErrorIds((prev) => ({ ...prev, [err.id]: true }));
    soundManager.playSuccess();
    if (onShowToast) {
      onShowToast('Saved spoken grammar correction to your SM-2 Mistake Vault!');
    }
  };

  const handleApplyInlineGrammarFix = (observed: string, corrected: string) => {
    if (!candidateInput.trim()) return;
    const escaped = observed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const updated = candidateInput.replace(new RegExp(escaped, 'i'), corrected);
    setCandidateInput(updated);
    soundManager.playSuccess();
    if (onShowToast) {
      onShowToast(`Applied Band 8.5 Grammar Fix: "${observed}" → "${corrected}"`);
    }
  };

  // Real-time grammar error detection on the live candidate input buffer
  const liveInputGrammarErrors = useMemo(
    () => detectLiveSpokenGrammarErrors(candidateInput),
    [candidateInput]
  );

  const lastCandidateTurn = useMemo(
    () => [...conversation].reverse().find((c) => c.role === 'candidate'),
    [conversation]
  );

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (isModal && !isOpen) return null;

  const currentQuestionDisplay =
    partnerMode === 'ai_live_partner'
      ? [...conversation].reverse().find((c) => c.role === 'examiner')?.text ||
        FREE_TALK_SCENARIOS[freeTalkScenarioIndex].opener
      : activeTopic.questions[questionIndex];

  const content = (
    <div className="bg-white dark:bg-[#0B1224] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
      {/* Top Studio Bar */}
      <div className="bg-slate-900 text-white px-4 sm:px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shrink-0">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-black tracking-tight text-white">
                Cambridge AI Speaking Studio
              </h2>
              <span className="text-xs text-emerald-300 font-mono font-semibold">
                · {partnerMode === 'ai_live_partner' ? 'Adaptive Free-Talk Mode' : 'IELTS Part 1 Active'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {partnerMode === 'ai_live_partner' ? (
                <>
                  Theme: <strong className="text-amber-300">{FREE_TALK_SCENARIOS[freeTalkScenarioIndex].label}</strong> · Contextual follow-ups & live grammar coaching
                </>
              ) : (
                <>
                  Topic: <strong className="text-amber-300">{activeTopic.topic}</strong> · Real-time British conversation & grammar correction
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right Controls: Mode Switcher + 5-Min Countdown + Camera Toggle + Random Topic + Close */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Practice Mode Segmented Switcher */}
          <div className="inline-flex p-1 rounded-xl bg-slate-800 border border-slate-700">
            <button
              type="button"
              onClick={() => handleSwitchPartnerMode('part1_drill')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                partnerMode === 'part1_drill'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              5-Min Part 1 Drill
            </button>
            <button
              type="button"
              onClick={() => handleSwitchPartnerMode('ai_live_partner')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                partnerMode === 'ai_live_partner'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3 h-3" />
              <span>AI Free-Talk Partner</span>
            </button>
          </div>

          {/* HUD Overlay Toggle */}
          <button
            type="button"
            onClick={() => setShowLiveHud(!showLiveHud)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer whitespace-nowrap ${
              showLiveHud
                ? 'bg-sky-950/90 text-sky-300 border-sky-500/50'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Toggle Non-Occluding Grammar & Fluency HUD Overlay"
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>{showLiveHud ? 'Live HUD: ON' : 'Live HUD'}</span>
          </button>

          {/* Camera Booth Toggle */}
          <button
            type="button"
            onClick={() => setShowCameraBooth(!showCameraBooth)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer whitespace-nowrap ${
              showCameraBooth
                ? 'bg-slate-800 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Toggle Candidate Video Call Camera Booth"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{showCameraBooth ? 'Camera Booth: ON' : 'Camera Booth'}</span>
          </button>

          {/* 5-Minute Drill Countdown */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700">
            <Clock className={`w-3.5 h-3.5 ${remainingSeconds < 60 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`} />
            <span className="font-mono text-xs sm:text-sm font-black text-white tabular-nums">
              {formatTimer(remainingSeconds)}
            </span>
            <button
              type="button"
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="ml-1 text-slate-300 hover:text-white p-0.5 cursor-pointer"
              title={isTimerRunning ? 'Pause timer' : 'Resume timer'}
            >
              {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setRemainingSeconds(300);
                setIsTimerRunning(true);
              }}
              className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
              title="Reset 5:00 timer"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Shuffle Random Topic / Theme */}
          <button
            type="button"
            onClick={handleShuffleRandomTopic}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>{partnerMode === 'ai_live_partner' ? 'Switch Theme' : 'New Topic'}</span>
          </button>

          {isModal && onClose && (
            <button
              type="button"
              onClick={() => {
                stopSpeech();
                onClose();
              }}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              aria-label="Close speaking partner modal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main 12-Column Interactive Video-Call Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
        {/* LEFT COLUMN (lg:col-span-5): British Council Video-Call Examiner + Candidate Camera Booth */}
        <div className="lg:col-span-5 p-5 sm:p-6 bg-slate-50/70 dark:bg-[#0D1528] flex flex-col justify-between space-y-4">
          <div className="space-y-3.5">
            {/* Examiner Switcher & High-Contrast Replay Prompt Control */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 border border-slate-300/70 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => handleSwitchAvatarGender('female')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    avatarGender === 'female'
                      ? 'bg-white dark:bg-blue-600 text-blue-700 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Dr. Clara (Female)
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchAvatarGender('male')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    avatarGender === 'male'
                      ? 'bg-white dark:bg-blue-600 text-blue-700 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Prof. Arthur (Male)
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (isAvatarSpeaking) {
                    stopSpeech();
                    setIsAvatarSpeaking(false);
                  } else {
                    speakExaminerTurn(currentQuestionDisplay);
                  }
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs ${
                  isAvatarSpeaking
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white'
                }`}
              >
                {isAvatarSpeaking ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>Mute Voice</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Replay Prompt</span>
                  </>
                )}
              </button>
            </div>

            {/* Balanced 50/50 Video-Call Split on Desktop (or Single Full Examiner Tile when Camera Booth is hidden) */}
            <div
              className={`grid grid-cols-1 ${
                showCameraBooth ? 'sm:grid-cols-2' : ''
              } gap-3.5 items-stretch`}
            >
              <ExaminerHumanoidCanvas
                gender={avatarGender}
                isSpeaking={isAvatarSpeaking}
                isListening={isListeningMic}
                mouthOpenness={mouthOpenness}
                examinerName={examinerProfile.name}
                activePartLabel={
                  partnerMode === 'ai_live_partner'
                    ? 'IELTS Speaking Active'
                    : 'IELTS Part 1 Active'
                }
                compact={showCameraBooth}
              />

              {showCameraBooth && (
                <CandidateCameraBooth
                  candidateName="You"
                  isCandidateSpeaking={isListeningMic}
                  compact={true}
                  onMetricsUpdate={setCameraMetrics}
                  onShowToast={onShowToast}
                />
              )}
            </div>

            {/* Examiner Identity Subtitle */}
            <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {examinerProfile.name} · {examinerProfile.role}
              </span>
              <span className="font-mono text-[11px]">{examinerProfile.accent}</span>
            </div>
          </div>

          {/* Current Prompt Box */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="font-bold uppercase text-indigo-600 dark:text-indigo-400">
                {partnerMode === 'ai_live_partner'
                  ? `AI Live Partner · ${FREE_TALK_SCENARIOS[freeTalkScenarioIndex].label}`
                  : `Question ${questionIndex + 1} of ${activeTopic.questions.length} · ${activeTopic.topic}`}
              </span>
              <span className="text-slate-400">Target: 20–40s</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
              “{currentQuestionDisplay}”
            </p>
          </div>

          {/* Quick-Test Spoken Answers */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">
              Quick-Test Spoken Answer (Click to simulate & scan grammar):
            </div>
            <div className="flex flex-col gap-1.5">
              {activeTopic.sampleResponses.slice(0, 2).map((sample, sIdx) => (
                <button
                  key={sIdx}
                  type="button"
                  onClick={() => handleSubmitCandidateResponse(sample)}
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-indigo-50/70 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-left text-[11px] text-slate-700 dark:text-slate-300 transition flex items-start gap-2 cursor-pointer group"
                >
                  <Wand2 className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5 group-hover:scale-110 transition" />
                  <span className="line-clamp-2">“{sample}”</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (lg:col-span-7): Non-Occluding Live HUD Overlay + Conversation Stream + Grammatical Error Finder */}
        <div className="lg:col-span-7 flex flex-col justify-between bg-white dark:bg-[#0B1224]">
          {/* Non-Occluding Real-Time Grammar Error Markers & Fluency Metrics HUD */}
          {showLiveHud && (
            <LiveSpeakingPartnerHUD
              partnerMode={partnerMode}
              onSwitchToLivePartner={() => handleSwitchPartnerMode('ai_live_partner')}
              candidateInput={candidateInput}
              lastCandidateTranscript={lastCandidateTurn?.text || ''}
              liveInputErrors={liveInputGrammarErrors}
              recentTurnErrors={lastCandidateTurn?.grammarErrors || []}
              allSessionErrorsCount={allGrammarErrors.length}
              liveAcoustic={liveAcoustic}
              isListeningMic={isListeningMic}
              turnStartTimeMs={turnStartTimeRef.current}
              lastTurnWpm={lastCandidateTurn?.wpm}
              savedErrorIds={savedErrorIds}
              onApplyInlineGrammarFix={handleApplyInlineGrammarFix}
              onSaveErrorToVault={handleSaveGrammarErrorToVault}
              onLoadDemoStream={(sampleText) => {
                turnStartTimeRef.current = Date.now() - 11000;
                setCandidateInput(sampleText);
                soundManager.playBeep(660, 0.04);
                if (onShowToast) {
                  onShowToast('Loaded live speech stream into HUD! Click any grammar marker to apply a Band 8.5 fix.');
                }
              }}
            />
          )}

          {/* Conversation & Inline Grammar Finder Feed */}
          <div className="p-4 sm:p-6 space-y-4 max-h-[440px] overflow-y-auto">
            {conversation.map((turn) => (
              <div key={turn.id} className="space-y-2.5">
                <div
                  className={`flex flex-col ${
                    turn.role === 'candidate' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] font-mono text-slate-400">
                    <span className="font-bold">{turn.speakerName}</span>
                    {turn.wpm && turn.isValidAttempt !== false && (
                      <>
                        <span>·</span>
                        <span className="tabular-nums text-slate-600 dark:text-slate-300">{turn.wpm} WPM</span>
                      </>
                    )}
                    {turn.estimatedBand && turn.estimatedBand > 0 && turn.isValidAttempt !== false && (
                      <>
                        <span>·</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          Est. Band {turn.estimatedBand.toFixed(1)}
                        </span>
                      </>
                    )}
                  </div>

                  <div
                    className={`max-w-[90%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                      turn.role === 'candidate'
                        ? turn.isValidAttempt === false
                          ? 'bg-rose-950/90 text-rose-100 border border-rose-700/80 rounded-br-xs shadow-xs'
                          : 'bg-blue-600 text-white rounded-br-xs shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 rounded-bl-xs border border-slate-200/80 dark:border-slate-700'
                    }`}
                  >
                    {turn.text}
                  </div>
                </div>

                {/* Unattempted / Audio Inaudible Warning Card when < 5 words */}
                {turn.role === 'candidate' && turn.isValidAttempt === false && (
                  <div className="ml-auto max-w-[94%] rounded-2xl border border-rose-300 dark:border-rose-800/80 bg-rose-50/90 dark:bg-rose-950/40 p-4 space-y-2.5 shadow-sm">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span className="text-xs font-mono font-black uppercase text-rose-800 dark:text-rose-300">
                          Unattempted / Audio Inaudible · {turn.feedbackTitle || 'No Candidate Speech Detected'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-200/80 dark:bg-rose-900 text-rose-950 dark:text-rose-100">
                        {turn.wordCount ?? 0} words spoken (Min 5 required)
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-rose-900 dark:text-rose-100 leading-relaxed">
                      {turn.feedbackEn ||
                        'You spoke fewer than 5 words. The examiner cannot assess your English without audible, sustained speech.'}
                    </p>
                    <p className="text-[11px] text-rose-800 dark:text-rose-300 leading-relaxed">
                      {turn.feedbackBn ||
                        'পর্যাপ্ত শব্দ শনাক্ত করা যায়নি (কমপক্ষে ৫টি শব্দ প্রয়োজন)। অনুগ্রহ করে মাইক্রোফোন অন করে স্পষ্টভাবে কথা বলুন।'}
                    </p>
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={handleToggleMic}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Try Again / Re-record</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Live Grammatical Error Finder Result Card for Candidate Turn */}
                {turn.role === 'candidate' && turn.isValidAttempt !== false && turn.grammarErrors && (
                  <div className="ml-auto max-w-[94%] rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/25 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {turn.grammarErrors.length > 0 ? (
                          <>
                            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span className="text-[11px] font-mono font-bold uppercase text-amber-800 dark:text-amber-300">
                              Grammatical Error Finder: {turn.grammarErrors.length} Issue{turn.grammarErrors.length > 1 ? 's' : ''} Detected
                            </span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="text-[11px] font-mono font-bold uppercase text-emerald-700 dark:text-emerald-300">
                              Grammatical Error Finder: Zero Grammar Errors Detected!
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {turn.grammarErrors.length > 0 && (
                      <div className="space-y-2">
                        {turn.grammarErrors.map((err) => {
                          const isSaved = Boolean(savedErrorIds[err.id]);
                          return (
                            <div
                              key={err.id}
                              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-slate-800 space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-[10px] font-mono font-bold text-rose-700 dark:text-rose-300">
                                  {err.category}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleSaveGrammarErrorToVault(err)}
                                  disabled={isSaved}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                                    isSaved
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700'
                                  }`}
                                >
                                  {isSaved ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      <span>Saved to Vault</span>
                                    </>
                                  ) : (
                                    <>
                                      <BookmarkPlus className="w-3 h-3 text-amber-400" />
                                      <span>Save to Vault</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-0.5">
                                <div className="p-2 rounded-lg bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/50">
                                  <div className="text-[9px] font-mono uppercase text-rose-500 font-bold">
                                    Spoken Error
                                  </div>
                                  <div className="font-semibold text-rose-900 dark:text-rose-200 line-through">
                                    “{err.observed}”
                                  </div>
                                </div>
                                <div className="p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/50">
                                  <div className="text-[9px] font-mono uppercase text-emerald-600 font-bold">
                                    Band 8.5 Correction
                                  </div>
                                  <div className="font-bold text-emerald-900 dark:text-emerald-200">
                                    “{err.corrected}”
                                  </div>
                                </div>
                              </div>

                              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                                {err.explanationEn}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                💡 {err.explanationBn}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {turn.band8Upgrade && (
                      <div className="pt-1 border-t border-amber-200/60 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          Band 8.5 Natural Upgrade:{' '}
                        </span>
                        “{turn.band8Upgrade}”
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Live Microphone & Spoken Response Input Bar */}
          <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              {/* Live Voice Mic Button */}
              <button
                type="button"
                onClick={handleToggleMic}
                className={`px-4 py-3 rounded-2xl font-bold text-xs transition flex items-center gap-2 shrink-0 cursor-pointer shadow-sm whitespace-nowrap ${
                  isListeningMic
                    ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {isListeningMic ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>Stop Mic</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>Speak Now</span>
                  </>
                )}
              </button>

              {/* Spoken Transcript Input / Editor */}
              <input
                type="text"
                value={candidateInput}
                onChange={(e) => setCandidateInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitCandidateResponse();
                  }
                }}
                placeholder={
                  isListeningMic
                    ? 'Listening to your voice... speak naturally now!'
                    : 'Speak via mic or type your spoken answer to scan grammar...'
                }
                className="flex-1 px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />

              {/* Send & Check Grammar Button */}
              <button
                type="button"
                onClick={() => handleSubmitCandidateResponse()}
                disabled={isAnalyzingTurn || !candidateInput.trim()}
                className="px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-bold text-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {isAnalyzingTurn ? 'Checking...' : 'Reply & Coach'}
                </span>
              </button>
            </div>

            {/* Bottom Summary & Web Audio + Camera Presence Telemetry Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Grammar Finder Active</span>
                </span>
                <span>·</span>
                <span>
                  Errors Caught: <strong className="text-slate-800 dark:text-white tabular-nums">{allGrammarErrors.length}</strong>
                </span>
                <span>·</span>
                <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300 tabular-nums">
                  Intonation: <strong>{liveAcoustic.pitchVarianceHz || 24} Hz</strong> ({liveAcoustic.expressivenessScore}%)
                </span>
                {cameraMetrics.isCameraActive && (
                  <>
                    <span>·</span>
                    <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
                      Eye Contact: {cameraMetrics.eyeContactScore}% ({cameraMetrics.postureStatus})
                    </span>
                  </>
                )}
              </div>

              {onNavigateToFullLab && (
                <button
                  type="button"
                  onClick={() => {
                    stopSpeech();
                    if (onClose) onClose();
                    onNavigateToFullLab();
                  }}
                  className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <span>Open Full Speaking Lab & Spider Chart</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
        <div className="w-full max-w-6xl my-auto">{content}</div>
      </div>
    );
  }

  return content;
};
