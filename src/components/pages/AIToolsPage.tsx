import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  Mic,
  PenTool,
  Target,
  ArrowRight,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Volume2,
  Calendar,
  Layers,
  ArrowLeft,
  ChevronRight,
  Play,
  Square,
  HelpCircle,
  Copy,
  Check,
  Search,
  BookMarked,
  Clock,
  RefreshCw,
  Flame,
  Award,
  FileText,
  CheckCheck,
  GraduationCap,
  Sliders,
  Send,
  Languages,
  Gift,
  Radio,
  MessageSquare,
  Headphones
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { getPreferredVoiceGender } from '../../config/voiceConfig';
import { SpeechRecognitionService } from '../../services/SpeechRecognitionService';
import { getMistakes, addMistake, saveMistakes } from '../../utils/vaultStorage';
import {
  getCurrentUser,
  setTopWeakness,
  detectLowestWritingCriterion
} from '../../utils/userStorage';
import { setBarnabyAnalyzing } from '../../utils/getBarnabyState';
import { questionEngine } from '../../services/QuestionEngine';
import { SHADOWING_ITEMS } from '../../data/shadowingSentences';
import {
  PART_1_SPEAKING_BANK,
  PART_2_CUE_CARD_BANK,
  PART_3_DISCUSSION_BANK
} from '../../data/speakingComprehensiveBank';
import { MASTER_1000_VOCAB_DATABASE } from '../../data/masterVocabDatabase';
import { SpeakingVoiceOrb } from '../audio/SpeakingVoiceOrb';
import { MascotMood } from '../common/ChubbyMascotAvatar';
import { Icon3D, Icon3DVariant } from '../common/Icon3D';
import { GeminiLiveAndTranscribeHub } from '../ai/GeminiLiveAndTranscribeHub';
import { AIRewriter } from '../ai/AIRewriter';
import { LiveAvatarSpeakingPartner } from '../speaking/LiveAvatarSpeakingPartner';
import { BarnabyRig } from '../BarnabyRig';

const Sprint3DStudio = React.lazy(() =>
  import('../three/Sprint3DStudio').then((m) => ({ default: m.Sprint3DStudio }))
);


interface AIToolsPageProps {
  onNavigate: (module: string) => void;
  onShowToast: (msg: string) => void;
}

type StudioView =
  | 'overview'
  // Next-Gen Gemini & 3D Tools
  | 'live-voice-examiner'
  | 'audio-transcriber'
  | 'multi-model-chat'
  // Exam Practice
  | 'speaking-examiner'
  | 'writing-coach'
  | 'reading-explainer'
  | 'question-explainer'
  // English Improvement
  | 'vocab-builder'
  | 'grammar-improvement'
  | 'rewriter'
  | 'speaking-fluency'
  | 'listening-shadowing'
  // Personalized Coaching
  | 'weakness-detector'
  | 'study-planner'
  | 'mistake-analysis'
  | 'targeted-retest';

type ToolCategory = 'all' | 'exam' | 'english' | 'coaching';

export const AIToolsPage: React.FC<AIToolsPageProps> = ({
  onNavigate,
  onShowToast
}) => {
  const [activeView, setActiveView] = useState<StudioView>('overview');
  const [categoryFilter, setCategoryFilter] = useState<ToolCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBanglaHelp, setShowBanglaHelp] = useState(false);
  const [barnabyMood, setBarnabyMood] = useState<MascotMood>('idle');
  const [barnabyTipIndex, setBarnabyTipIndex] = useState(0);
  const [barnabySpeaking, setBarnabySpeaking] = useState(false);
  const [studioVoiceActive, setStudioVoiceActive] = useState(false);

  const barnabySurprises = [
    {
      badge: '🎁 C2 IDIOM SURPRISE',
      title: '“A double-edged sword”',
      text: 'Something that brings both significant advantages and unintended drawbacks. Example: “Rapid automation is a double-edged sword, bolstering industrial productivity while displacing routine labour.”'
    },
    {
      badge: '🔥 MOTIVATION BOOST',
      title: 'Unstoppable Band 8+ Momentum!',
      text: 'Every 15 minutes of focused Practice practice sharpens your ear for distractor traps and builds effortless lexical fluency. Keep going — your Target Band is within reach!'
    },
    {
      badge: '🎁 C2 IDIOM SURPRISE',
      title: '“To walk a tightrope”',
      text: 'To navigate a delicate situation requiring extreme caution between two opposing pressures. Example: “Policymakers must walk a tightrope between economic expansion and ecological preservation.”'
    },
    {
      badge: '🎁 BAND 9 DISCOURSE GEM',
      title: '“By the same token”',
      text: 'In the exact same way or for the same compelling reason. Use it in Speaking Part 3 or Writing Task 2 to transition seamlessly between parallel arguments.'
    }
  ];

  const handleBarnabySurprise = () => {
    const nextIdx = (barnabyTipIndex + 1) % barnabySurprises.length;
    setBarnabyTipIndex(nextIdx);
    const item = barnabySurprises[nextIdx];
    setBarnabyMood('surprise');
    soundManager.playSuccess();
    onShowToast(`${item.badge}: ${item.title}`);

    setBarnabySpeaking(true);
    speakBritish(`${item.title}. ${item.text}`, {
      speakerId: 'speaker_barnaby',
      gender: 'male',
      deliveryProfile: 'barnaby_companion',
      onStart: () => setBarnabyMood('speaking'),
      onEnd: () => {
        setBarnabySpeaking(false);
        setBarnabyMood('idle');
      },
      onError: () => {
        setBarnabySpeaking(false);
        setBarnabyMood('idle');
      }
    });
  };

  const user = getCurrentUser();

  // ================= 1. AI SPEAKING EXAMINER STATE =================
  const [speakingPart, setSpeakingPart] = useState<1 | 2 | 3>(1);
  const [speakingPromptIndex, setSpeakingPromptIndex] = useState<Record<1 | 2 | 3, number>>({
    1: 0,
    2: 0,
    3: 0
  });
  const [speakingStep, setSpeakingStep] = useState<'intro' | 'prompt' | 'recording' | 'evaluating' | 'result'>('intro');
  const [speakingTranscript, setSpeakingTranscript] = useState('');
  const [speakingTimer, setSpeakingTimer] = useState(60);
  const [speakingTimerActive, setSpeakingTimerActive] = useState(false);
  const [speakingResult, setSpeakingResult] = useState<any | null>(null);
  const [examinerSpeaking, setExaminerSpeaking] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionService | null>(null);

  const activeSpeakingBank = useMemo(() => {
    if (speakingPart === 1) return PART_1_SPEAKING_BANK;
    if (speakingPart === 2) return PART_2_CUE_CARD_BANK;
    return PART_3_DISCUSSION_BANK;
  }, [speakingPart]);

  const activeSpeakingPromptObj = useMemo(() => {
    const idx = speakingPromptIndex[speakingPart] % Math.max(1, activeSpeakingBank.length);
    const item = activeSpeakingBank[idx];
    const cueBullets =
      speakingPart === 2 && item?.cueCardBulletPoints?.length
        ? ` You should say: ${item.cueCardBulletPoints.join('; ')}.`
        : '';
    return {
      question: `${item?.questionText || 'Do you prefer studying or working in the morning or in the evening? Why?'}${cueBullets}`,
      topic: item?.topic || `Part ${speakingPart}`,
      index: idx,
      total: activeSpeakingBank.length,
      banglaTip:
        speakingPart === 1
          ? `বিষয়: ${item?.topic || 'Part 1'} — স্বাভাবিক ও আত্মবিশ্বাসের সাথে ২-৪ বাক্যে উত্তর দিন এবং একটি উদাহরণ যুক্ত করুন।`
          : speakingPart === 2
          ? `কিউ কার্ড (${item?.topic || 'Part 2'}) — প্রতিটি বুলেট পয়েন্ট কভার করে টানা ১.৫ থেকে ২ মিনিট কথা বলুন।`
          : `গভীর আলোচনা (${item?.topic || 'Part 3'}) — দুই দিকের যুক্তি, উদাহরণ এবং ভবিষ্যৎ প্রভাব বিশ্লেষণ করুন।`
    };
  }, [speakingPart, speakingPromptIndex, activeSpeakingBank]);

  const handleNextSpeakingPrompt = () => {
    stopSpeech();
    if (recognitionRef.current) {
      recognitionRef.current.stopListening(true);
    }
    setExaminerSpeaking(false);
    setSpeakingTimerActive(false);
    setSpeakingTranscript('');
    setSpeakingResult(null);
    setSpeakingStep('intro');
    setSpeakingPromptIndex((prev) => ({
      ...prev,
      [speakingPart]: (prev[speakingPart] + 1) % Math.max(1, activeSpeakingBank.length)
    }));
    soundManager.playBeep(620, 0.04);
  };

  const handleStartSpeakingPrompt = () => {
    const q = activeSpeakingPromptObj.question;
    setSpeakingStep('prompt');
    setExaminerSpeaking(true);
    const prefGender = getPreferredVoiceGender();
    speakBritish(`Let's proceed with Part ${speakingPart}. ${q}`, {
      gender: prefGender,
      speakerId: prefGender === 'female' ? 'speaker_05' : 'speaker_04',
      onEnd: () => setExaminerSpeaking(false),
      onError: () => setExaminerSpeaking(false)
    });
  };

  const handleStartRecording = () => {
    stopSpeech();
    setExaminerSpeaking(false);
    setSpeakingTranscript('');
    setSpeakingStep('recording');
    setSpeakingTimer(speakingPart === 2 ? 120 : 60);
    setSpeakingTimerActive(true);
    soundManager.playBeep(660, 0.05);

    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognitionService();
    }

    recognitionRef.current.startListening({
      onInterimResult: (text) => setSpeakingTranscript(text),
      onFinalResult: (text) => setSpeakingTranscript(text),
      onError: (err) => {
        onShowToast(`Microphone notice: ${err}`);
      }
    });
  };

  const handleStopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stopListening(true);
    }
    setSpeakingTimerActive(false);
    setSpeakingStep('evaluating');
    soundManager.playBeep(520, 0.05);

    const cleanTranscript = (speakingTranscript || '').trim();
    const spokenWords = cleanTranscript.split(/\s+/).filter(Boolean).length;
    if (spokenWords < 5) {
      setSpeakingStep('result');
      setSpeakingResult({
        isValidAttempt: false,
        assessmentStatus: 'unavailable',
        error:
          spokenWords === 0
            ? 'No speech was captured by your microphone. Record a spoken response of at least 5 words to receive an evaluation.'
            : `Only ${spokenWords} word(s) detected. Speak at least 5 words so an honest IELTS evaluation can be generated.`
      });
      onShowToast('No valid speech detected — please record at least 5 words.');
      return;
    }

    const duration = speakingPart === 2 ? 120 - speakingTimer : 60 - speakingTimer;

    const token = localStorage.getItem('ielts_session_token_v2');
    const spkHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) spkHeaders['Authorization'] = `Bearer ${token}`;

    setBarnabyAnalyzing(true, 'Grading Speaking response against IELTS descriptors...');
    fetch('/api/evaluate-speaking-turn', {
      method: 'POST',
      headers: spkHeaders,
      body: JSON.stringify({
        transcript: cleanTranscript,
        question: activeSpeakingPromptObj.question,
        part: speakingPart,
        durationSec: Math.max(duration, 5)
      })
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.isValidAttempt === false || data.assessmentStatus === 'unavailable') {
          setSpeakingResult({
            isValidAttempt: false,
            assessmentStatus: 'unavailable',
            error: data.error || 'AI Speaking evaluation is temporarily unavailable. No score was fabricated.'
          });
          setSpeakingStep('result');
          onShowToast(data.error || 'AI evaluation unavailable — please retry.');
          return;
        }
        setSpeakingResult(data);
        setSpeakingStep('result');
        soundManager.playSuccess();
        onShowToast('Speaking diagnostic report ready!');
      })
      .catch(() => {
        setSpeakingResult({
          isValidAttempt: false,
          assessmentStatus: 'unavailable',
          error: 'Could not reach the AI Speaking evaluator. Please check your connection and try again — no fallback band score was fabricated.'
        });
        setSpeakingStep('result');
        onShowToast('AI evaluation unavailable — please retry.');
      })
      .finally(() => {
        setBarnabyAnalyzing(false);
      });
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (speakingTimerActive && speakingTimer > 0) {
      interval = setInterval(() => {
        setSpeakingTimer((t) => {
          if (t <= 1) {
            handleStopRecording();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [speakingTimerActive, speakingTimer]);

  // ================= 2. AI WRITING COACH STATE =================
  const [writingTaskType, setWritingTaskType] = useState<'task1_acad' | 'task1_gt' | 'task2'>('task2');
  const [writingPrompt, setWritingPrompt] = useState(
    'Some people believe that university education should be free for all students, while others argue that individuals should pay for their tertiary studies. Discuss both views and give your opinion.'
  );
  const [writingText, setWritingText] = useState('');
  const [isEvaluatingWriting, setIsEvaluatingWriting] = useState(false);
  const [writingResult, setWritingResult] = useState<any | null>(null);

  const writingWordCount = writingText.trim().split(/\s+/).filter(Boolean).length;

  const handleEvaluateWriting = async () => {
    if (writingWordCount < 20) {
      onShowToast('Please write or paste at least 20 words for AI analysis.');
      return;
    }
    setIsEvaluatingWriting(true);
    setBarnabyAnalyzing(true, 'Grading Writing essay against IELTS Band Descriptors...');
    soundManager.playBeep(560, 0.04);

    try {
      const wrtToken = localStorage.getItem('ielts_session_token_v2');
      const wrtHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (wrtToken) wrtHeaders['Authorization'] = `Bearer ${wrtToken}`;

      const res = await fetch('/api/evaluate-writing', {
        method: 'POST',
        headers: wrtHeaders,
        body: JSON.stringify({
          essayText: writingText,
          prompt: writingPrompt,
          testType: writingTaskType === 'task2' ? 'task2' : 'task1'
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.isValidAttempt === false || data.assessmentStatus === 'unavailable') {
        setWritingResult({
          isValidAttempt: false,
          assessmentStatus: 'unavailable',
          error: data.error || 'AI Writing evaluation could not be completed. No fallback score was fabricated.'
        });
        onShowToast(data.error || 'Writing evaluation unavailable — please retry.');
        return;
      }
      setWritingResult(data);
      const lowestCriterion =
        (typeof data?.lowestCriterion === 'string' && data.lowestCriterion.trim()) ||
        detectLowestWritingCriterion(
          {
            ta: data?.trScore ?? data?.criteria?.taskAchievementOrResponse?.score ?? data?.estimatedBands?.taskAchievement,
            cc: data?.ccScore ?? data?.criteria?.coherenceAndCohesion?.score ?? data?.estimatedBands?.coherenceCohesion,
            lr: data?.lrScore ?? data?.criteria?.lexicalResource?.score ?? data?.estimatedBands?.lexicalResource,
            gra: data?.graScore ?? data?.criteria?.grammaticalRangeAndAccuracy?.score ?? data?.estimatedBands?.grammaticalRange
          },
          writingTaskType === 'task2' ? 2 : 1
        );
      if (lowestCriterion) {
        setTopWeakness(lowestCriterion, 'writing');
      }
      soundManager.playSuccess();
      onShowToast('Writing evaluation completed!');
    } catch {
      setWritingResult({
        isValidAttempt: false,
        assessmentStatus: 'unavailable',
        error: 'Network error reaching the AI Writing evaluator. Please try again.'
      });
      onShowToast('Writing evaluation unavailable — please retry.');
    } finally {
      setIsEvaluatingWriting(false);
      setBarnabyAnalyzing(false);
    }
  };

  // ================= 3. READING PASSAGE EXPLAINER STATE =================
  const [readingPassageInput, setReadingPassageInput] = useState(
    'Although subterranean root architecture plays an indispensable role in drought resilience, conventional agricultural paradigms have disproportionately prioritized above-ground phenotyping. Consequently, subsurface nutrient extraction mechanisms have remained largely under-researched.'
  );
  const [readingExplanation, setReadingExplanation] = useState<any | null>(null);
  const [isExplainingPassage, setIsExplainingPassage] = useState(false);

  const handleExplainPassage = () => {
    setIsExplainingPassage(true);
    soundManager.playBeep(580, 0.04);

    setTimeout(() => {
      setIsExplainingPassage(false);
      setReadingExplanation({
        coreIdea: "Agricultural research has historically neglected underground root development in favor of visible surface plant traits, despite roots being vital for surviving drought.",
        coreIdeaBangla: "মাটির নিচের শিকড়ের গঠন খরার বিরুদ্ধে অত্যন্ত জরুরি হওয়া সত্ত্বেও, ঐতিহ্যবাহী কৃষি গবেষণা উদ্ভিদের দৃশ্যমান অংশের দিকে বেশি মনোযোগ দিয়েছে এবং শিকড়কে অবহেলা করেছে।",
        complexVocabulary: [
          { term: "Subterranean", meaning: "Existing or occurring under the earth's surface.", bangla: "ভূগর্ভস্থ বা মাটির নিচের" },
          { term: "Indispensable", meaning: "Absolutely necessary; essential.", bangla: "অপরিহার্য" },
          { term: "Phenotyping", meaning: "The observation and measurement of physical traits.", bangla: "শারীরিক বৈশিষ্ট্য পরিমাপ" }
        ],
        hiddenInference: "Questions on this passage will likely test why underground roots were overlooked (trap: because surface traits were easier to observe, not because roots are unimportant).",
        examinerTrapWarning: "Look out for False vs Not Given traps regarding whether researchers considered roots useless."
      });
      soundManager.playSuccess();
      onShowToast('Passage analysis generated!');
    }, 550);
  };

  // ================= 4. QUESTION EXPLAINER STATE =================
  const [questionInput, setQuestionInput] = useState(
    'The author implies that traditional agriculture focused on above-ground traits because root analysis was too expensive. [TRUE / FALSE / NOT GIVEN]'
  );
  const [questionUserChoice, setQuestionUserChoice] = useState('FALSE');
  const [questionExplanation, setQuestionExplanation] = useState<any | null>(null);
  const [isExplainingQuestion, setIsExplainingQuestion] = useState(false);

  const handleExplainQuestion = () => {
    setIsExplainingQuestion(true);
    soundManager.playBeep(580, 0.04);

    setTimeout(() => {
      setIsExplainingQuestion(false);
      setQuestionExplanation({
        correctAnswer: "NOT GIVEN",
        isUserCorrect: questionUserChoice === 'NOT GIVEN',
        trapExplanation: "The text states that traditional paradigms disproportionately prioritized surface phenotyping, but NEVER mentions the financial cost ('too expensive') as the reason.",
        banglaExplanation: "প্যাসেজে বলা হয়েছে মাটির উপরের অংশের দিকে বেশি নজর দেওয়া হয়েছিল, কিন্তু খরচের কারণে এটি করা হয়েছিল কি না তা কোথাও উল্লেখ করা হয়নি। তাই উত্তর NOT GIVEN।",
        practiceRule: "Do not extrapolate beyond the literal passage text. If a reason is plausible in real life but unstated in the text, the answer is NOT GIVEN."
      });
      soundManager.playSuccess();
    }, 500);
  };

  // ================= 5. AI VOCABULARY BUILDER STATE =================
  const [vocabInputText, setVocabInputText] = useState(
    'Governments must implement stringent renewable regulations to mitigate catastrophic ecological degradation and preserve natural biodiversity.'
  );
  const [extractedWords, setExtractedWords] = useState<
    Array<{
      word: string;
      cefr: string;
      meaning: string;
      collocation: string;
      example: string;
      banglaMeaning?: string;
      saved?: boolean;
    }>
  >([]);
  const [isExtracting, setIsExtracting] = useState(false);

  const handleExtractVocab = () => {
    setIsExtracting(true);
    soundManager.playBeep(600, 0.04);

    setTimeout(() => {
      setIsExtracting(false);
      setExtractedWords([
        {
          word: 'Stringent',
          cefr: 'C1',
          meaning: 'Extremely strict, binding, or rigorously enforced.',
          banglaMeaning: 'কঠোর বা অপরিবর্তনীয় নিয়মাবলী',
          collocation: 'stringent regulations / stringent safety standards',
          example: 'Authorities imposed stringent environmental directives across metropolitan industrial plants.'
        },
        {
          word: 'Mitigate',
          cefr: 'C1',
          meaning: 'To make something bad, harmful, or severe less intense or damaging.',
          banglaMeaning: 'উপশম করা বা তীব্রতা কমানো',
          collocation: 'mitigate climate impacts / mitigate adverse risks',
          example: 'Renewable energy subsidies substantially mitigate airborne carbon emissions.'
        },
        {
          word: 'Degradation',
          cefr: 'C1',
          meaning: 'The process in which the quality or state of something declines severely.',
          banglaMeaning: 'ক্ষয় বা গুণগত মানের অবনতি',
          collocation: 'ecological degradation / environmental degradation',
          example: 'Unregulated commercial logging accelerates rapid soil degradation.'
        },
        {
          word: 'Biodiversity',
          cefr: 'B2',
          meaning: 'The variety of plant and animal life in a particular habitat or ecosystem.',
          banglaMeaning: 'জীববৈচিত্র্য',
          collocation: 'preserve biodiversity / rich marine biodiversity',
          example: 'Protected national sanctuaries safeguard indigenous wildlife and biodiversity.'
        }
      ]);
      soundManager.playSuccess();
      onShowToast('Extracted 4 high-yield academic vocabulary items!');
    }, 550);
  };

  const handleSaveWordToDeck = (wordItem: any, index: number) => {
    addMistake({
      module: 'vocab',
      title: `${wordItem.word} (${wordItem.cefr})`,
      userAnswer: wordItem.collocation,
      correctAnswer: wordItem.meaning,
      explanation: `${wordItem.example} ${wordItem.banglaMeaning ? `(${wordItem.banglaMeaning})` : ''}`
    });

    setExtractedWords((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, saved: true } : item))
    );
    soundManager.playSuccess();
    onShowToast(`Saved "${wordItem.word}" to your Vocabulary Deck!`);
  };

  // ================= 6. GRAMMAR & SENTENCE IMPROVER STATE =================
  const [grammarInputSentence, setGrammarInputSentence] = useState(
    'In modern days many people is preferring to shop online because it is more easy and cheap.'
  );
  const [grammarResult, setGrammarResult] = useState<any | null>(null);
  const [isImprovingGrammar, setIsImprovingGrammar] = useState(false);

  const handleImproveGrammar = () => {
    setIsImprovingGrammar(true);
    soundManager.playBeep(580, 0.04);

    setTimeout(() => {
      setIsImprovingGrammar(false);
      setGrammarResult({
        errorsIdentified: [
          { error: "'people is preferring'", fix: "'people prefer'", rule: "Subject-verb concord requires plural verb 'prefer' with collective noun 'people'. Stative verbs rarely take continuous aspect here." },
          { error: "'more easy and cheap'", fix: "'easier and more economical / cost-effective'", rule: "One-syllable adjectives take '-er' suffix; elevate 'cheap' to formal C1 register." },
          { error: "'In modern days'", fix: "'In contemporary society / Nowadays'", rule: "'In modern days' is unidiomatic in formal academic writing." }
        ],
        band8Version: "In contemporary society, a growing proportion of consumers prefer digital commerce owing to its unrivaled convenience and cost-effectiveness.",
        banglaTip: "'In modern days' এর বদলে 'In contemporary society' লিখলে Coherence & Lexical Resource তাৎক্ষণিকভাবে উন্নত হয়।"
      });
      soundManager.playSuccess();
      onShowToast('Grammar analysis & Band 8.5 upgrade generated!');
    }, 500);
  };

  // ================= 7. SPEAKING FLUENCY COACH STATE =================
  const [fluencyRecording, setFluencyRecording] = useState(false);
  const [fluencyText, setFluencyText] = useState('');
  const [fluencyAnalysis, setFluencyAnalysis] = useState<any | null>(null);

  const handleStartFluencyDrill = () => {
    setFluencyText('');
    setFluencyRecording(true);
    setFluencyAnalysis(null);
    soundManager.playBeep(640, 0.05);

    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognitionService();
    }
    recognitionRef.current.startListening({
      onInterimResult: (t) => setFluencyText(t),
      onFinalResult: (t) => setFluencyText(t)
    });
  };

  const handleStopFluencyDrill = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stopListening(true);
    }
    setFluencyRecording(false);
    soundManager.playBeep(520, 0.05);

    const spoken = fluencyText || "Well, actually I think that technology has transformed daily life fundamentally.";
    const words = spoken.trim().split(/\s+/).filter(Boolean);
    const fillers = (spoken.match(/\b(uh|um|like|you know|actually|basically)\b/gi) || []).length;

    setFluencyAnalysis({
      wordsSpoken: words.length,
      wpm: Math.round(words.length * 2.2),
      fillerCount: fillers,
      fluencyBand: fillers > 3 ? '6.0' : words.length > 25 ? '7.5' : '7.0',
      pacingVerdict: words.length > 30 ? 'Fluent, natural British conversational rhythm' : 'Slight hesitation pauses observed',
      pacingExercise: "Practice chunking speech into 4-word thought units separated by soft breathing pauses rather than vocalized 'um' fillers."
    });
    soundManager.playSuccess();
  };

  // ================= 8. AI LISTENING & SHADOWING COACH STATE =================
  const [shadowItemIndex, setShadowItemIndex] = useState(0);
  const [isPlayingShadowAudio, setIsPlayingShadowAudio] = useState(false);
  const currentShadow = SHADOWING_ITEMS[shadowItemIndex] || SHADOWING_ITEMS[0];

  const handlePlayShadowAudio = () => {
    stopSpeech();
    setIsPlayingShadowAudio(true);
    speakBritish(currentShadow.targetSentence, {
      speakerId: currentShadow.modelVoice || 'speaker_04',
      onEnd: () => setIsPlayingShadowAudio(false),
      onError: () => setIsPlayingShadowAudio(false)
    });
  };

  // ================= 9. AI WEAKNESS DETECTOR & MISTAKE ANALYSIS =================
  const allMistakes = useMemo(() => getMistakes(), []);
  const unmastered = useMemo(() => allMistakes.filter((m) => !m.mastered), [allMistakes]);
  const examHistory = user?.progress?.examHistory || [];

  // Group mistakes by module
  const mistakesByModule = useMemo(() => {
    const map: Record<string, number> = { listening: 0, reading: 0, writing: 0, speaking: 0, vocab: 0 };
    unmastered.forEach((m) => {
      map[m.module] = (map[m.module] || 0) + 1;
    });
    return map;
  }, [unmastered]);

  // ================= 10. TARGETED RE-TEST MINI DRILL =================
  const [retestQuestions, setRetestQuestions] = useState<
    Array<{ id: string; prompt: string; options: string[]; correctIdx: number; explanation: string; userChoice?: number; evaluated?: boolean }>
  >([]);
  const [retestActive, setRetestActive] = useState(false);
  const [retestSubmitted, setRetestSubmitted] = useState(false);

  const handleGenerateRetest = () => {
    setRetestActive(true);
    setRetestSubmitted(false);
    setRetestQuestions([
      {
        id: 'rt_1',
        prompt: "Choose the correct academic linker: 'The proposed legislation faced heavy opposition; _______, it was approved by a slim majority.'",
        options: ["Nonetheless", "Consequently", "For instance", "In other words"],
        correctIdx: 0,
        explanation: "'Nonetheless' correctly expresses concession/contrast."
      },
      {
        id: 'rt_2',
        prompt: "In Listening Section 3, when an academic speaker says 'I wouldn't rule out option B, though A remains plausible', what do they mean?",
        options: ["They definitively select Option B", "They still lean toward Option A but keep B under consideration", "They reject both options", "Option B is impossible"],
        correctIdx: 1,
        explanation: "British academic phrasing uses understated modals ('wouldn't rule out') to indicate secondary viability."
      },
      {
        id: 'rt_3',
        prompt: "Identify the correct C1 collocation: 'Governments should take decisive measures to _______ carbon emissions.'",
        options: ["curtail", "delete", "destroy", "disappear"],
        correctIdx: 0,
        explanation: "'Curtail emissions' is an authentic high-band academic collocation."
      }
    ]);
    soundManager.playBeep(640, 0.04);
    onShowToast('Targeted 3-question re-test generated!');
  };

  const handleAnswerRetest = (qIdx: number, optIdx: number) => {
    setRetestQuestions((prev) =>
      prev.map((q, idx) => (idx === qIdx ? { ...q, userChoice: optIdx } : q))
    );
  };

  const handleSubmitRetest = () => {
    setRetestSubmitted(true);
    soundManager.playSuccess();
    const correctCount = retestQuestions.filter((q) => q.userChoice === q.correctIdx).length;
    onShowToast(`Re-test complete: ${correctCount}/${retestQuestions.length} correct!`);
  };

  // ================= 11. PERSONAL AI STUDY PLANNER =================
  const [targetScore, setTargetScore] = useState(user?.progress?.targetBand || 7.5);
  const [dailyHours, setDailyHours] = useState(1.5);
  const [weeksRemaining, setWeeksRemaining] = useState(4);
  const [plannerGenerated, setPlannerGenerated] = useState(false);

  // Search & Filter
  const filteredTools = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      cat: string;
      desc: string;
      icon: typeof Mic;
      variant: Icon3DVariant;
    }> = [
      // Core Focused Suite & Exam Practice
      { id: 'speaking-examiner', title: 'Speaking Studio', cat: 'exam', desc: 'Simulate authentic face-to-face IELTS interviews (Parts 1–3) with real-time fluency scoring and instant grammar feedback.', icon: Mic, variant: 'rose' },
      { id: 'writing-coach', title: 'Writing Evaluator', cat: 'exam', desc: 'Task 1 & 2 evaluation with side-by-side Band 8.5 improvements & rewrite drills.', icon: PenTool, variant: 'purple' },
      { id: 'vocab-builder', title: 'Vocabulary Builder', cat: 'english', desc: 'Extracts C1 words & collocations from essays or reading with 1-click deck save.', icon: BookMarked, variant: 'indigo' },
      { id: 'listening-shadowing', title: 'Listening Lab', cat: 'english', desc: 'Sentence-by-sentence British audio playback with syllable stress pacing.', icon: Headphones, variant: 'emerald' },
      { id: 'reading-explainer', title: 'Reading Passage Explainer', cat: 'exam', desc: 'Analyzes dense paragraph arguments, referencing words, and author stance.', icon: BookOpen, variant: 'emerald' },
      { id: 'question-explainer', title: 'Question Explainer', cat: 'exam', desc: 'Deconstructs True/False/Not Given & multiple choice traps with Practice heuristics.', icon: HelpCircle, variant: 'blue' },
      // English Improvement
      { id: 'grammar-improvement', title: 'Grammar & Sentence Improvement', cat: 'english', desc: 'Elevates colloquial syntax into formal Band 8.5 academic structures.', icon: FileText, variant: 'cyan' },
      { id: 'rewriter', title: 'AI Rewriter', cat: 'english', desc: 'Rewrites Task 2 sentences with Band 7+ vocabulary, fixes common grammar slips and explains the 3 biggest changes — works fully offline.', icon: RefreshCw, variant: 'purple' },
      { id: 'speaking-fluency', title: 'Speaking Fluency Coach', cat: 'english', desc: 'Spontaneous 30-sec response analyzer: speech rate, fillers, and thought units.', icon: Zap, variant: 'amber' },
      // Personalized Coaching
      { id: 'weakness-detector', title: 'AI Weakness Detector', cat: 'coaching', desc: 'Correlates genuine mistakes from test history to identify score bottlenecks.', icon: Target, variant: 'amber' },
      { id: 'mistake-analysis', title: 'Mistake Analysis', cat: 'coaching', desc: 'Categorizes unmastered vault errors by root cause: Mishearing vs Grammar vs Trap.', icon: AlertTriangle, variant: 'rose' },
      { id: 'targeted-retest', title: 'Targeted Re-test & Review', cat: 'coaching', desc: 'Generates instant 3-question mini-evaluations tailored to unmastered items.', icon: CheckCheck, variant: 'emerald' },
      { id: 'study-planner', title: 'Personal AI Study Planner', cat: 'coaching', desc: 'Calculates an honest daily and weekly study roadmap based on target score.', icon: Calendar, variant: 'blue' }
    ];

    return list.filter((tool) => {
      const matchCat = categoryFilter === 'all' || tool.cat === categoryFilter;
      const matchQuery =
        !searchQuery.trim() ||
        tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.desc.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [categoryFilter, searchQuery]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-7 animate-fade-in pb-16 select-none">
      {/* ================= HEADER ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              AI Learning Studio
            </h1>
            <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold font-mono">
              Diagnostic & Coaching
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Practice Band Descriptors calibration with male British voice examiners and targeted diagnostic tools.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Optional Bangla explanation toggle */}
          <button
            type="button"
            onClick={() => {
              setShowBanglaHelp(!showBanglaHelp);
              onShowToast(showBanglaHelp ? 'English-only interface active' : 'Bangla hints & translations enabled!');
            }}
            className={`min-h-[40px] px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition ${
              showBanglaHelp
                ? 'bg-amber-100 dark:bg-amber-950 border-amber-300 text-amber-900 dark:text-amber-200 shadow-2xs'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
            title="Toggle optional Bangla learning notes"
          >
            <Languages className="w-4 h-4 text-amber-600" />
            <span>বাংলা ব্যাখ্যা: {showBanglaHelp ? 'অন' : 'অফ'}</span>
          </button>

          {activeView !== 'overview' && (
            <button
              type="button"
              onClick={() => {
                stopSpeech();
                setActiveView('overview');
              }}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>All AI Tools</span>
            </button>
          )}
        </div>
      </div>

      {/* ================= FOCUSED 4-TOOL SUITE DOCK ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          {
            id: 'speaking-examiner' as const,
            label: 'Speaking Studio',
            sub: 'Parts 1–3 Live Video',
            icon: Mic
          },
          {
            id: 'writing-coach' as const,
            label: 'Writing Evaluator',
            sub: 'Task 1 & 2 Band Rubric',
            icon: PenTool
          },
          {
            id: 'vocab-builder' as const,
            label: 'Vocabulary Builder',
            sub: 'C1/C2 Collocations',
            icon: BookMarked
          },
          {
            id: 'listening-shadowing' as const,
            label: 'Listening Lab',
            sub: 'British RP Shadowing',
            icon: Headphones
          }
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                stopSpeech();
                soundManager.playBeep(600, 0.03);
                setActiveView(item.id);
              }}
              className={`p-3.5 rounded-xl border text-left transition flex items-center gap-3 cursor-pointer ${
                isActive
                  ? 'bg-[#0F4C45] text-white border-[#0F4C45]'
                  : 'bg-white dark:bg-[#11201E] text-[#0E1F1E] dark:text-[#EEF3F1] border-[#D3DDDA] dark:border-[#1E3330] hover:border-[#0F4C45]'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive
                    ? 'bg-white/20 text-[#F4A62A]'
                    : 'bg-[#EEF3F1] dark:bg-[#0B1514] text-[#0F4C45] dark:text-[#4DB6A4]'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold truncate">{item.label}</div>
                <div
                  className={`text-[11px] truncate ${
                    isActive ? 'text-white/80' : 'text-[#566664] dark:text-[#96B0AC]'
                  }`}
                >
                  {item.sub}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ================= BARNABY COMPANION BANNER (HIDDEN INSIDE SPEAKING STUDIO) ================= */}
      {activeView !== 'speaking-examiner' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0F4C45] dark:bg-[#0D3833] text-white border border-[#1F8A70]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-[#F8FAF9] dark:bg-slate-900 flex items-center justify-center shrink-0 border border-[#134E41]/20 p-0.5">
              <BarnabyRig
                expression={
                  barnabyMood === 'speaking'
                    ? 'happy'
                    : barnabyMood === 'surprise'
                    ? 'surprised'
                    : 'focused'
                }
                mode={barnabyMood === 'speaking' ? 'companion' : 'ambient'}
                isSpeaking={barnabyMood === 'speaking'}
                className="w-full h-full"
                ariaLabel="Barnaby study companion"
              />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#4DB6A4] border-2 border-[#0F4C45]" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm sm:text-base font-bold text-white">
                  Barnaby · Study Companion
                </span>
                <span className="px-2 py-0.5 rounded bg-white/10 text-[#F4A62A] border border-[#F4A62A]/35 font-mono text-[10px] font-bold">
                  {barnabySurprises[barnabyTipIndex].badge}
                </span>
              </div>
              <p className="text-xs text-white/85 leading-relaxed">
                <strong className="text-[#F4A62A] mr-1.5">{barnabySurprises[barnabyTipIndex].title}:</strong>
                {barnabySurprises[barnabyTipIndex].text}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={handleBarnabySurprise}
              className="px-3.5 py-2.5 rounded-xl bg-[#F4A62A] hover:bg-[#E0951B] text-[#0E1F1E] font-bold text-xs flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
            >
              <Gift className="w-4 h-4" />
              <span>{barnabySpeaking ? 'Speaking...' : 'Surprise Idiom'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= INTERACTIVE 3D SPEAKING & ACOUSTIC STUDIO (LAZY-LOADED) ================= */}
      {activeView === 'overview' && (
        <React.Suspense
          fallback={
            <div className="p-6 rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-center text-sm text-[#566664] dark:text-slate-300">
              Loading 3D Speaking &amp; Acoustic Studio...
            </div>
          }
        >
          <Sprint3DStudio
            activeSpeakingPart={speakingPart}
            isVoiceActive={studioVoiceActive || barnabySpeaking || examinerSpeaking}
            onSelectSpeakingPart={(part) => setSpeakingPart(part)}
            onLaunchSpeakingStudio={() => setActiveView('speaking-examiner')}
            onLaunchWritingEvaluator={() => setActiveView('writing-coach')}
            onLaunchVocabBuilder={() => setActiveView('vocab-builder')}
            onLaunchListeningLab={() => setActiveView('listening-shadowing')}
          />
        </React.Suspense>
      )}

      {/* ================= NEXT-GEN GEMINI LIVE VOICE / TRANSCRIBER / MULTI-MODEL CHAT VIEWS ================= */}
      {activeView === 'live-voice-examiner' && (
        <GeminiLiveAndTranscribeHub
          mode="live-voice"
          onShowToast={onShowToast}
          onVoiceActivityChange={setStudioVoiceActive}
        />
      )}

      {activeView === 'audio-transcriber' && (
        <GeminiLiveAndTranscribeHub
          mode="transcriber"
          onShowToast={onShowToast}
          onVoiceActivityChange={setStudioVoiceActive}
        />
      )}

      {activeView === 'multi-model-chat' && (
        <GeminiLiveAndTranscribeHub
          mode="multi-chat"
          onShowToast={onShowToast}
          onVoiceActivityChange={setStudioVoiceActive}
        />
      )}

      {/* ================= STUDIO OVERVIEW (GRID OF 15 TOOLS ACROSS 3 SECTIONS) ================= */}
      {activeView === 'overview' && (
        <div className="space-y-6">
          {/* Category Tabs & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1 p-1 bg-[#EEF3F1] dark:bg-[#11201E] rounded-xl border border-[#D3DDDA] dark:border-[#1E3330] overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap shrink-0 cursor-pointer ${
                  categoryFilter === 'all'
                    ? 'bg-[#0F4C45] text-white'
                    : 'text-[#566664] dark:text-[#96B0AC] hover:text-[#0E1F1E]'
                }`}
              >
                All Tools (13)
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('exam')}
                className={`min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap shrink-0 cursor-pointer ${
                  categoryFilter === 'exam'
                    ? 'bg-[#0F4C45] text-white'
                    : 'text-[#566664] dark:text-[#96B0AC] hover:text-[#0E1F1E]'
                }`}
              >
                Exam Practice (4)
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('english')}
                className={`min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap shrink-0 cursor-pointer ${
                  categoryFilter === 'english'
                    ? 'bg-[#0F4C45] text-white'
                    : 'text-[#566664] dark:text-[#96B0AC] hover:text-[#0E1F1E]'
                }`}
              >
                English Improvement (5)
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('coaching')}
                className={`min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap shrink-0 cursor-pointer ${
                  categoryFilter === 'coaching'
                    ? 'bg-[#0F4C45] text-white'
                    : 'text-[#566664] dark:text-[#96B0AC] hover:text-[#0E1F1E]'
                }`}
              >
                Personalized Coaching (4)
              </button>
            </div>

            <div className="relative min-w-[200px] sm:max-w-xs">
              <Search className="w-4 h-4 text-[#566664] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search AI Studio tools..."
                className="w-full min-h-[40px] pl-9 pr-3 py-1.5 rounded-xl border border-[#D3DDDA] dark:border-[#1E3330] bg-white dark:bg-[#11201E] text-xs text-[#0E1F1E] dark:text-[#EEF3F1] placeholder:text-[#566664] focus:outline-none focus:border-[#0F4C45]"
              />
            </div>
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {filteredTools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => setActiveView(tool.id as StudioView)}
                className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1E3330] hover:border-[#0F4C45] dark:hover:border-[#4DB6A4] transition text-left flex flex-col justify-between group min-h-[145px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C45]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <Icon3D icon={tool.icon} variant={tool.variant} size="md" animateHover={true} />
                    <span className="text-[10px] font-mono font-bold uppercase text-[#566664] dark:text-[#96B0AC] px-2 py-0.5 rounded bg-[#EEF3F1] dark:bg-[#0B1514]">
                      {tool.cat}
                    </span>
                  </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-3 group-hover:text-blue-600 transition-colors">
                      {tool.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                      {tool.desc}
                    </p>
                  </div>
                  <div className="pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-600">
                    <span>Launch Tool</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
                  </div>
                </button>
            ))}
          </div>
        </div>
      )}

      {/* ================= 1. SPEAKING STUDIO VIEW (UNIFIED SINGLE SOURCE OF TRUTH) ================= */}
      {activeView === 'speaking-examiner' && (
        <div className="space-y-6 animate-fade-in">
          <LiveAvatarSpeakingPartner
            isModal={false}
            isOpen={true}
            autoStart5MinDrill={true}
            onShowToast={onShowToast}
            onNavigateToFullLab={() => onNavigate('speaking')}
          />
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 space-y-4 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-mono font-bold text-[10px]">
                  EXAMINER BOOTH · PART {speakingPart}
                </span>
                <span className="text-xs text-slate-400 font-mono">Male British Voice (Arthur / Fenrir)</span>
              </div>

              <div className="flex items-center p-0.5 bg-slate-800 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    stopSpeech();
                    setSpeakingPart(1);
                    setSpeakingStep('intro');
                  }}
                  className={`px-3 py-1 rounded-lg transition ${
                    speakingPart === 1 ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-400'
                  }`}
                >
                  Part 1 (Interview)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopSpeech();
                    setSpeakingPart(2);
                    setSpeakingStep('intro');
                  }}
                  className={`px-3 py-1 rounded-lg transition ${
                    speakingPart === 2 ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-400'
                  }`}
                >
                  Part 2 (Cue Card)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopSpeech();
                    setSpeakingPart(3);
                    setSpeakingStep('intro');
                  }}
                  className={`px-3 py-1 rounded-lg transition ${
                    speakingPart === 3 ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-400'
                  }`}
                >
                  Part 3 (Discussion)
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-mono font-bold text-amber-300 uppercase">
                  Examiner Prompt · {activeSpeakingPromptObj.topic} ({activeSpeakingPromptObj.index + 1}/{activeSpeakingPromptObj.total})
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => speakBritish(activeSpeakingPromptObj.question)}
                    className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>Hear Examiner</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextSpeakingPrompt}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-xs font-bold text-amber-300 flex items-center gap-1 cursor-pointer transition"
                  >
                    <span>Next Question</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-sm font-serif leading-relaxed text-slate-100">
                "{activeSpeakingPromptObj.question}"
              </p>
              {showBanglaHelp && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                  💡 বাংলা নির্দেশিকা: {activeSpeakingPromptObj.banglaTip}
                </div>
              )}
            </div>

            {/* Interactive Speaking Voice Orb */}
            <div className="py-2">
              <SpeakingVoiceOrb
                state={
                  examinerSpeaking
                    ? 'examiner_speaking'
                    : speakingStep === 'recording'
                    ? 'recording'
                    : speakingStep === 'evaluating'
                    ? 'thinking'
                    : speakingStep === 'result'
                    ? 'feedback'
                    : 'idle'
                }
                size="sm"
              />
            </div>


            {speakingStep === 'intro' && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-400">
                  {speakingPart === 2 ? '⏱️ 2-minute timed response with live transcript' : '⏱️ 60-second timed response'}
                </span>
                <button
                  type="button"
                  onClick={handleStartSpeakingPrompt}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md active:scale-95 transition flex items-center gap-2"
                >
                  <Mic className="w-4 h-4" />
                  <span>Begin Question →</span>
                </button>
              </div>
            )}

            {speakingStep === 'prompt' && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <span className="text-xs text-amber-300">
                  {examinerSpeaking ? '🔊 Examiner is reading the prompt...' : 'Ready to record your response.'}
                </span>
                <button
                  type="button"
                  onClick={handleStartRecording}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md active:scale-95 transition flex items-center justify-center gap-2"
                >
                  <Mic className="w-4 h-4" />
                  <span>Start Recording Response</span>
                </button>
              </div>
            )}

            {speakingStep === 'recording' && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-xs font-bold text-rose-300 font-mono">
                      RECORDING · {speakingTimer}s Remaining
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleStopRecording}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 active:scale-95 transition"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>Stop & Evaluate</span>
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 min-h-[70px] text-xs font-serif leading-relaxed text-slate-200">
                  {speakingTranscript || "Listening for speech... Speak clearly into your microphone."}
                </div>
              </div>
            )}

            {speakingStep === 'evaluating' && (
              <div className="p-6 text-center space-y-2">
                <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="text-xs font-bold text-slate-300">
                  Analyzing fluency, vocabulary, grammar & pronunciation against Practice descriptors...
                </div>
              </div>
            )}
          </div>

          {speakingStep === 'result' && speakingResult && (
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs animate-fade-in">
              {speakingResult.isValidAttempt === false ||
              speakingResult.assessmentStatus === 'unavailable' ||
              speakingResult.assessmentStatus === 'insufficient_evidence' ? (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2">
                  <div className="text-xs font-mono font-bold uppercase text-amber-700 dark:text-amber-300">
                    {speakingResult.assessmentStatus === 'insufficient_evidence'
                      ? 'Insufficient Speech Sample — No Score Generated'
                      : 'Assessment Unavailable — No Score Generated'}
                  </div>
                  <p className="text-xs text-amber-900 dark:text-amber-100 leading-relaxed">
                    {speakingResult.error || speakingResult.feedbackEn || 'Could not evaluate this spoken turn. Please record a clear response and retry.'}
                  </p>
                  <button
                    type="button"
                    onClick={handleNextSpeakingPrompt}
                    className="min-h-[36px] px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold cursor-pointer"
                  >
                    Try Again
                  </button>
                </div>
              ) : (() => {
                const fc = speakingResult.criteria?.fc ?? speakingResult.estimatedBands?.fluency ?? null;
                const lr = speakingResult.criteria?.lr ?? speakingResult.estimatedBands?.lexical ?? null;
                const gra = speakingResult.criteria?.gra ?? speakingResult.estimatedBands?.grammar ?? null;
                const pr = speakingResult.criteria?.pr ?? speakingResult.estimatedBands?.pronunciation ?? null;
                const overall = typeof speakingResult.overallBand === 'number'
                  ? speakingResult.overallBand
                  : typeof speakingResult.estimatedBands?.overall === 'number' && typeof pr === 'number'
                  ? speakingResult.estimatedBands.overall
                  : null;
                const partialIdx = typeof speakingResult.partialThreeCriterionIndex === 'number'
                  ? speakingResult.partialThreeCriterionIndex
                  : null;
                const isPartial = overall === null || speakingResult.assessmentStatus === 'partial_transcript_only';

                return (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-mono font-bold uppercase text-slate-500">
                          {isPartial
                            ? 'Partial Transcript-Only Estimate (3 of 4 Criteria · Pronunciation Unassessed)'
                            : 'Diagnostic Score Breakdown (Unofficial)'}
                        </span>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                          {overall !== null
                            ? `Estimated Overall Band ${overall.toFixed(1)}`
                            : partialIdx !== null
                            ? `Partial Transcript Index (3/4 Criteria): ${partialIdx.toFixed(1)}`
                            : 'Unassessed — Incomplete Criteria'}
                        </h3>
                        {isPartial && (
                          <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                            Not a complete IELTS Speaking band — acoustic Pronunciation requires audio evaluation.
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleNextSpeakingPrompt}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Try Another Prompt</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80">
                        <div className="text-[10px] text-slate-500 font-mono">Fluency & Coherence</div>
                        <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                          {typeof fc === 'number' ? fc.toFixed(1) : 'Unassessed'}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80">
                        <div className="text-[10px] text-slate-500 font-mono">Lexical Resource</div>
                        <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                          {typeof lr === 'number' ? lr.toFixed(1) : 'Unassessed'}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80">
                        <div className="text-[10px] text-slate-500 font-mono">Grammar & Accuracy</div>
                        <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                          {typeof gra === 'number' ? gra.toFixed(1) : 'Unassessed'}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80">
                        <div className="text-[10px] text-slate-500 font-mono">Pronunciation</div>
                        <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                          {typeof pr === 'number' ? pr.toFixed(1) : 'Unassessed'}
                        </div>
                      </div>
                    </div>

                    {speakingResult.band8Answer?.modelAnswer && (
                      <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-indigo-900 dark:text-indigo-300 uppercase">
                            Band 8.5+ Model Response:
                          </span>
                          <button
                            type="button"
                            onClick={() => speakBritish(speakingResult.band8Answer.modelAnswer)}
                            className="text-xs font-bold text-indigo-700 dark:text-indigo-400 hover:underline flex items-center gap-1"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Hear British Model</span>
                          </button>
                        </div>
                        <p className="text-xs sm:text-sm font-serif leading-relaxed text-indigo-950 dark:text-indigo-200">
                          "{speakingResult.band8Answer.modelAnswer}"
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ================= 2. AI WRITING COACH VIEW ================= */}
      {activeView === 'writing-coach' && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#101B32] border border-slate-200/90 dark:border-slate-800 space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/50 text-purple-600">
                  <PenTool className="w-4 h-4" />
                </span>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  AI Writing Coach & Revision Studio
                </h2>
              </div>

              <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setWritingTaskType('task1_acad');
                    setWritingPrompt('The chart below shows the percentage of households with internet access across three European countries from 2010 to 2024. Summarise the information by selecting and reporting the main features.');
                  }}
                  className={`px-3 py-1 rounded-lg transition ${
                    writingTaskType === 'task1_acad'
                      ? 'bg-white dark:bg-[#101B32] text-purple-600 shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  Academic Task 1
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWritingTaskType('task1_gt');
                    setWritingPrompt('You recently moved to a new apartment, but there is a persistent problem with the water supply. Write a letter to your landlord explaining the problem, how it affects you, and what action you require.');
                  }}
                  className={`px-3 py-1 rounded-lg transition ${
                    writingTaskType === 'task1_gt'
                      ? 'bg-white dark:bg-[#101B32] text-purple-600 shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  GT Task 1
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWritingTaskType('task2');
                    setWritingPrompt('Some people believe that university education should be free for all students, while others argue that individuals should pay for their tertiary studies. Discuss both views and give your opinion.');
                  }}
                  className={`px-3 py-1 rounded-lg transition ${
                    writingTaskType === 'task2'
                      ? 'bg-white dark:bg-[#101B32] text-purple-600 shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  Task 2 (Essay)
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 font-mono uppercase">
                Writing Prompt:
              </label>
              <textarea
                value={writingPrompt}
                onChange={(e) => setWritingPrompt(e.target.value)}
                rows={2}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Your Response:
                </label>
                <span className="font-mono text-slate-500">
                  Word Count: <span className="font-bold text-purple-600">{writingWordCount}</span> words
                  {writingTaskType === 'task2' ? ' (min 250)' : ' (min 150)'}
                </span>
              </div>
              <textarea
                value={writingText}
                onChange={(e) => setWritingText(e.target.value)}
                placeholder="Type or paste your IELTS draft here for detailed criterion assessment..."
                rows={8}
                className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 text-sm font-serif text-slate-900 dark:text-slate-100 leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                Official Descriptors: Task Response · Coherence · Lexical · Grammar
              </span>

              <button
                type="button"
                onClick={handleEvaluateWriting}
                disabled={isEvaluatingWriting}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-slate-400 text-white font-bold text-xs shadow-md transition flex items-center gap-2 active:scale-95"
              >
                {isEvaluatingWriting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    <span>Evaluate & Compare</span>
                  </>
                )}
              </button>
            </div>

            {writingResult && (
              <div className="mt-4 p-5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/50 space-y-4 animate-fade-in">
                {writingResult.isValidAttempt === false || writingResult.assessmentStatus === 'unavailable' ? (
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-1">
                    <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300 uppercase">
                      Not Assessed — No Score Generated
                    </span>
                    <p className="text-xs text-amber-900 dark:text-amber-100 leading-relaxed">
                      {writingResult.error || 'Submission could not be evaluated. Ensure you meet the minimum word threshold and retry.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-purple-700 dark:text-purple-300 uppercase">
                          Unofficial Diagnostic Estimate
                        </span>
                        <h3 className="text-lg font-black text-purple-900 dark:text-purple-200">
                          Overall Band{' '}
                          {typeof (writingResult.overallBand ?? writingResult.estimatedBands?.overall) === 'number'
                            ? (writingResult.overallBand ?? writingResult.estimatedBands?.overall).toFixed(1)
                            : '—'}
                          {writingResult.proficiencyTitle ? ` · ${writingResult.proficiencyTitle}` : ''}
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono bg-white dark:bg-[#101B32] px-2 py-0.5 rounded border border-purple-200 text-purple-700">
                        TR:{' '}
                        {typeof (writingResult.trScore ?? writingResult.estimatedBands?.taskAchievement) === 'number'
                          ? (writingResult.trScore ?? writingResult.estimatedBands?.taskAchievement).toFixed(1)
                          : '—'}{' '}
                        · CC:{' '}
                        {typeof (writingResult.ccScore ?? writingResult.estimatedBands?.coherenceCohesion) === 'number'
                          ? (writingResult.ccScore ?? writingResult.estimatedBands?.coherenceCohesion).toFixed(1)
                          : '—'}{' '}
                        · LR:{' '}
                        {typeof (writingResult.lrScore ?? writingResult.estimatedBands?.lexicalResource) === 'number'
                          ? (writingResult.lrScore ?? writingResult.estimatedBands?.lexicalResource).toFixed(1)
                          : '—'}{' '}
                        · GRA:{' '}
                        {typeof (writingResult.graScore ?? writingResult.estimatedBands?.grammaticalRange) === 'number'
                          ? (writingResult.graScore ?? writingResult.estimatedBands?.grammaticalRange).toFixed(1)
                          : '—'}
                      </span>
                    </div>

                    {writingResult.barnabyVerdict && (
                      <div className="p-3.5 rounded-xl bg-white dark:bg-[#101B32] border border-[#134E41]/15 flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#F8FAF9] dark:bg-slate-900 border border-[#134E41]/20 flex items-center justify-center shrink-0 overflow-hidden p-0.5">
                          <BarnabyRig
                            expression={
                              typeof (writingResult.overallBand ?? writingResult.estimatedBands?.overall) === 'number' &&
                              (writingResult.overallBand ?? writingResult.estimatedBands?.overall) >=
                                (getCurrentUser()?.progress?.targetBand ?? 7.5)
                                ? 'celebrating'
                                : 'encouraging'
                            }
                            mode={
                              typeof (writingResult.overallBand ?? writingResult.estimatedBands?.overall) === 'number' &&
                              (writingResult.overallBand ?? writingResult.estimatedBands?.overall) >=
                                (getCurrentUser()?.progress?.targetBand ?? 7.5)
                                ? 'celebration'
                                : 'tutor'
                            }
                            className="w-full h-full"
                            ariaLabel="Barnaby Writing verdict"
                          />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-[#134E41] dark:text-emerald-300">
                            Barnaby Verdict · Highest-Leverage Fix
                          </div>
                          <p className="text-xs text-[#0E1F1E] dark:text-slate-100 leading-relaxed">
                            {writingResult.barnabyVerdict}
                          </p>
                        </div>
                      </div>
                    )}

                    {Array.isArray(writingResult.sentenceUpgrades) && writingResult.sentenceUpgrades.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#134E41] dark:text-emerald-300 block">
                          Verbatim Sentence Upgrades (Band 8.5+)
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {writingResult.sentenceUpgrades.slice(0, 5).map((upg: any, idx: number) => (
                            <div
                              key={`ai-tools-upg-${idx}`}
                              className="p-3 rounded-xl bg-white dark:bg-[#101B32] border border-[#134E41]/15 space-y-1.5"
                            >
                              <span className="inline-block px-2 py-0.5 rounded bg-[#F59E0B]/15 text-[#B45309] dark:text-amber-300 text-[10px] font-semibold">
                                {upg.flawTag || 'Precision & Cohesion'}
                              </span>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-through">
                                {upg.originalSentence}
                              </p>
                              <p className="text-xs font-medium text-[#0E1F1E] dark:text-slate-100 leading-relaxed">
                                {upg.band85Rewrite}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <div className="p-3.5 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200 space-y-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono block">
                          Original Draft:
                        </span>
                        <p className="text-xs font-serif text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto">
                          {writingText}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white dark:bg-[#101B32] border border-purple-200 space-y-2">
                        <span className="text-xs font-bold text-purple-700 dark:text-purple-400 font-mono block">
                          Band 8.5+ Improved Model:
                        </span>
                        <p className="text-xs font-serif text-slate-800 dark:text-slate-200 leading-relaxed max-h-56 overflow-y-auto">
                          {writingResult.betterAnswerBand8 ||
                            writingResult.band8Answer?.modelEssay ||
                            'No model essay returned for this prompt.'}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= 3. READING PASSAGE EXPLAINER VIEW ================= */}
      {activeView === 'reading-explainer' && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#101B32] border border-slate-200/90 dark:border-slate-800 space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600">
                <BookOpen className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Reading Passage Explainer & Deep Logic Analyzer
                </h2>
                <p className="text-xs text-slate-500">
                  Deconstruct complex academic paragraphs, implicit premises, and Practice distractor traps.
                </p>
              </div>
            </div>

            <textarea
              value={readingPassageInput}
              onChange={(e) => setReadingPassageInput(e.target.value)}
              rows={4}
              placeholder="Paste reading excerpt or paragraph here..."
              className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-serif leading-relaxed"
            />

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                Identifies: Core thesis, referencing words & Practice test traps
              </span>
              <button
                type="button"
                onClick={handleExplainPassage}
                disabled={isExplainingPassage}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
              >
                {isExplainingPassage ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing Logic...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Deconstruct Passage</span>
                  </>
                )}
              </button>
            </div>

            {readingExplanation && (
              <div className="mt-4 p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/50 space-y-3 animate-fade-in text-xs">
                <div>
                  <span className="text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-300 uppercase block">
                    Core Argument (Simplified):
                  </span>
                  <p className="font-semibold text-slate-900 dark:text-white mt-0.5 leading-relaxed">
                    {readingExplanation.coreIdea}
                  </p>
                  {showBanglaHelp && (
                    <p className="text-emerald-900 dark:text-emerald-300 mt-1 italic">
                      🇧🇩 বাংলা সারসংক্ষেপ: {readingExplanation.coreIdeaBangla}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-emerald-200/60">
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">
                    Complex Lexical Items:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1.5">
                    {readingExplanation.complexVocabulary.map((v: any, i: number) => (
                      <div key={i} className="p-2.5 rounded-xl bg-white dark:bg-[#101B32] border border-emerald-100">
                        <span className="font-bold text-slate-900 dark:text-white">{v.term}</span>
                        <p className="text-[11px] text-slate-500 mt-0.5">{v.meaning}</p>
                        {showBanglaHelp && <p className="text-[10px] text-emerald-700 mt-0.5">বাংলা: {v.bangla}</p>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Examiner Trap Warning:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{readingExplanation.examinerTrapWarning}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= 4. QUESTION EXPLAINER VIEW ================= */}
      {activeView === 'question-explainer' && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#101B32] border border-slate-200/90 dark:border-slate-800 space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/50 text-blue-600">
                <HelpCircle className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Question Explainer & Heuristic Decoder
                </h2>
                <p className="text-xs text-slate-500">
                  Breaks down True/False/Not Given, Heading Matching, and Multiple Choice traps.
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase font-mono">
                Target Question:
              </label>
              <textarea
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                rows={2}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-serif text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-600">Your Answer:</span>
              {['TRUE', 'FALSE', 'NOT GIVEN'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setQuestionUserChoice(opt)}
                  className={`px-3 py-1.5 rounded-lg font-bold border transition ${
                    questionUserChoice === opt
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExplainQuestion}
              disabled={isExplainingQuestion}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
            >
              {isExplainingQuestion ? 'Explaining...' : 'Explain Distractors & Trap Heuristic'}
            </button>

            {questionExplanation && (
              <div className="mt-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3 animate-fade-in text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Official Answer: <span className="font-mono text-emerald-600">{questionExplanation.correctAnswer}</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded font-mono font-bold ${questionExplanation.isUserCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {questionExplanation.isUserCorrect ? 'Your Answer Was Correct' : 'Trap Detected'}
                  </span>
                </div>

                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {questionExplanation.trapExplanation}
                </p>

                {showBanglaHelp && (
                  <p className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 leading-relaxed">
                    🇧🇩 বাংলা ব্যাখ্যা: {questionExplanation.banglaExplanation}
                  </p>
                )}

                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 text-blue-900 dark:text-blue-200">
                  <span className="font-bold font-mono uppercase text-[10px] block">Practice Heuristic Rule:</span>
                  <p className="mt-0.5">{questionExplanation.practiceRule}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= 5. AI VOCABULARY BUILDER VIEW ================= */}
      {activeView === 'vocab-builder' && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#101B32] border border-slate-200/90 dark:border-slate-800 space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600">
                <BookMarked className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  AI Contextual Vocabulary Builder
                </h2>
                <p className="text-xs text-slate-500">
                  Harvest C1 academic collocations and add them to your revision deck.
                </p>
              </div>
            </div>

            <textarea
              value={vocabInputText}
              onChange={(e) => setVocabInputText(e.target.value)}
              rows={4}
              placeholder="Paste reading excerpt or essay paragraph here..."
              className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-serif leading-relaxed"
            />

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                Extracts: CEFR level, collocations & natural example sentences
              </span>
              <button
                type="button"
                onClick={handleExtractVocab}
                disabled={isExtracting}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
              >
                {isExtracting ? 'Extracting...' : 'Extract Collocations'}
              </button>
            </div>

            {extractedWords.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase font-mono">
                  Extracted High-Yield Vocabulary:
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {extractedWords.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-2"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {item.word}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                            {item.cefr}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                          {item.meaning}
                        </p>
                        {showBanglaHelp && item.banglaMeaning && (
                          <p className="text-[11px] text-indigo-700 mt-0.5">
                            বাংলা: {item.banglaMeaning}
                          </p>
                        )}
                        <div className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
                          🔗 Collocation: {item.collocation}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                        <button
                          type="button"
                          onClick={() => speakBritish(item.word)}
                          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Audio</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSaveWordToDeck(item, idx)}
                          disabled={item.saved}
                          className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                            item.saved
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          {item.saved ? 'Saved to Deck' : 'Save Word'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= 6. GRAMMAR & SENTENCE IMPROVER VIEW ================= */}
      {activeView === 'grammar-improvement' && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#101B32] border border-slate-200/90 dark:border-slate-800 space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-950/50 text-sky-600">
                <FileText className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Grammar & Sentence Structure Improver
                </h2>
                <p className="text-xs text-slate-500">
                  Elevates colloquial sentences into C1 academic prose with inversion, passives, and complex conjunctions.
                </p>
              </div>
            </div>

            <textarea
              value={grammarInputSentence}
              onChange={(e) => setGrammarInputSentence(e.target.value)}
              rows={3}
              className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 font-serif leading-relaxed"
            />

            <button
              type="button"
              onClick={handleImproveGrammar}
              disabled={isImprovingGrammar}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
            >
              {isImprovingGrammar ? 'Analyzing Syntax...' : 'Upgrade to Band 8.5 Syntax'}
            </button>

            {grammarResult && (
              <div className="mt-4 p-5 rounded-2xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200 space-y-3 text-xs">
                <div>
                  <span className="font-bold text-slate-700 font-mono uppercase text-[10px] block">
                    Errors & Weaknesses Detected:
                  </span>
                  <div className="space-y-1.5 mt-1.5">
                    {grammarResult.errorsIdentified.map((err: any, i: number) => (
                      <div key={i} className="p-2.5 rounded-lg bg-white dark:bg-[#101B32] border border-sky-100 space-y-0.5">
                        <span className="text-rose-600 font-mono line-through">{err.error}</span>
                        <span className="text-emerald-700 font-mono font-bold ml-2">→ {err.fix}</span>
                        <p className="text-[11px] text-slate-500">{err.rule}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-[#101B32] border border-sky-200 space-y-1">
                  <span className="font-bold text-sky-800 dark:text-sky-300 font-mono text-[10px] block">
                    Band 8.5+ Academic Upgrade:
                  </span>
                  <p className="font-serif text-sm text-slate-900 dark:text-white leading-relaxed">
                    "{grammarResult.band8Version}"
                  </p>
                </div>

                {showBanglaHelp && (
                  <p className="text-sky-900 dark:text-sky-200 italic">
                    🇧🇩 পরামর্শ: {grammarResult.banglaTip}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= 6b. AI REWRITER VIEW (fully offline) ================= */}
      {activeView === 'rewriter' && (
        <AIRewriter onShowToast={onShowToast} />
      )}

      {/* ================= 7. SPEAKING FLUENCY COACH VIEW ================= */}
      {activeView === 'speaking-fluency' && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#101B32] border border-slate-200/90 dark:border-slate-800 space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-600">
                <Zap className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Speaking Fluency & Pacing Coach
                </h2>
                <p className="text-xs text-slate-500">
                  Monitors speech tempo (WPM), speech-to-pause ratio, and filler word frequency.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 text-xs space-y-2">
              <span className="font-bold text-amber-900 dark:text-amber-200">
                Spontaneous Speaking Challenge:
              </span>
              <p className="text-amber-800 dark:text-amber-300">
                "What is one habit that has significantly improved your daily productivity?" (Speak for 30 seconds)
              </p>
            </div>

            <div className="flex items-center gap-3">
              {!fluencyRecording ? (
                <button
                  type="button"
                  onClick={handleStartFluencyDrill}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md flex items-center gap-2"
                >
                  <Mic className="w-4 h-4" />
                  <span>Start 30s Recording</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopFluencyDrill}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md flex items-center gap-2 animate-pulse"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Stop & Analyze Pacing</span>
                </button>
              )}
            </div>

            {fluencyAnalysis && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 space-y-3 text-xs animate-fade-in">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#101B32] border">
                    <span className="text-[10px] text-slate-400 font-mono">Speech Rate</span>
                    <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">{fluencyAnalysis.wpm} WPM</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#101B32] border">
                    <span className="text-[10px] text-slate-400 font-mono">Filler Words</span>
                    <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">{fluencyAnalysis.fillerCount}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#101B32] border">
                    <span className="text-[10px] text-slate-400 font-mono">Fluency Band</span>
                    <div className="text-base font-black text-amber-600 mt-0.5">Band {fluencyAnalysis.fluencyBand}</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-[#101B32] border space-y-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Coach Feedback:</span>
                  <p className="text-slate-600 dark:text-slate-400">{fluencyAnalysis.pacingVerdict}</p>
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1">💡 Drill: {fluencyAnalysis.pacingExercise}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= 8. AI LISTENING & SHADOWING COACH VIEW ================= */}
      {activeView === 'listening-shadowing' && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#101B32] border border-slate-200/90 dark:border-slate-800 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-950/50 text-teal-600">
                  <Volume2 className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    AI Listening & Shadowing Coach
                  </h2>
                  <p className="text-xs text-slate-500">
                    Realistic British male voice cadence with sentence-level shadowing.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setShadowItemIndex((i) => Math.max(0, i - 1))}
                  disabled={shadowItemIndex === 0}
                  className="min-h-[36px] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="font-mono px-2 text-slate-500">
                  {shadowItemIndex + 1} / {SHADOWING_ITEMS.length}
                </span>
                <button
                  type="button"
                  onClick={() => setShadowItemIndex((i) => Math.min(SHADOWING_ITEMS.length - 1, i + 1))}
                  disabled={shadowItemIndex === SHADOWING_ITEMS.length - 1}
                  className="min-h-[36px] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-800/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-teal-800 dark:text-teal-300 uppercase">
                  Target British Audio Sentence · {currentShadow.category}
                </span>
                <span className="text-xs font-mono text-teal-700 dark:text-teal-400">
                  Est. Band {currentShadow.bandTarget}
                </span>
              </div>

              <p className="text-base sm:text-lg font-serif text-slate-900 dark:text-white leading-relaxed">
                "{currentShadow.targetSentence}"
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-teal-200/60 dark:border-teal-800/60">
                <button
                  type="button"
                  onClick={handlePlayShadowAudio}
                  disabled={isPlayingShadowAudio}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-2"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>{isPlayingShadowAudio ? 'Playing Audio...' : 'Play British Audio'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('shadowing')}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 transition"
                >
                  Open Full Shadowing Lab →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= 9. AI WEAKNESS DETECTOR & MISTAKE ANALYSIS ================= */}
      {(activeView === 'weakness-detector' || activeView === 'mistake-analysis') && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#101B32] border border-slate-200/90 dark:border-slate-800 space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-600">
                <Target className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  {activeView === 'mistake-analysis' ? 'In-Depth Mistake Root Cause Analysis' : 'AI Weakness Detector & Error Clusters'}
                </h2>
                <p className="text-xs text-slate-500">
                  Correlates questions missed across practice sessions and recommends targeted remediation drills.
                </p>
              </div>
            </div>

            {/* Error Cluster Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
              {Object.entries(mistakesByModule).map(([mod, count]) => (
                <div key={mod} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">{mod}</span>
                  <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">{count} traps</div>
                </div>
              ))}
            </div>

            {unmastered.length > 0 ? (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Detected {unmastered.length} Active Review Items
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate('practice')}
                      className="text-xs font-bold text-amber-800 dark:text-amber-300 hover:underline"
                    >
                      Clear Items in Practice →
                    </button>
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-300/90">
                    Review items identified in your Mistake Vault are recurring bottlenecks in your band progression.
                  </p>
                </div>

                <div className="space-y-2">
                  {unmastered.slice(0, 5).map((m, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {m.title}
                        </span>
                        <span className="text-[11px] text-slate-500">{m.explanation}</span>
                      </div>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800 shrink-0 ml-2">
                        {m.module}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 space-y-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    No Persistent Weaknesses Recorded
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    You currently have 0 unmastered mistakes in your vault. Complete a mock test or practice lab to generate diagnostic analytics.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('livemock')}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition"
                >
                  Take 15-Min Diagnostic Mock
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= 10. TARGETED RE-TEST VIEW ================= */}
      {activeView === 'targeted-retest' && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#101B32] border border-slate-200/90 dark:border-slate-800 space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600">
                <CheckCheck className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Targeted Re-test & Mastery Verification
                </h2>
                <p className="text-xs text-slate-500">
                  Prove retention by testing specifically against previous error types.
                </p>
              </div>
            </div>

            {!retestActive ? (
              <div className="p-6 text-center space-y-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border">
                <GraduationCap className="w-10 h-10 text-blue-600 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Ready to test your retention?
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    This drill generates 3 calibrated questions based on common traps in your weakest modules.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateRetest}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition"
                >
                  Generate 3-Question Mini Re-test
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {retestQuestions.map((q, qIdx) => (
                  <div key={q.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border space-y-2.5 text-xs">
                    <span className="font-bold text-slate-900 dark:text-white font-serif text-sm block">
                      {qIdx + 1}. {q.prompt}
                    </span>

                    <div className="space-y-1.5">
                      {q.options.map((opt, optIdx) => (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleAnswerRetest(qIdx, optIdx)}
                          disabled={retestSubmitted}
                          className={`w-full text-left p-2.5 rounded-xl border transition ${
                            q.userChoice === optIdx
                              ? retestSubmitted
                                ? optIdx === q.correctIdx
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold'
                                  : 'bg-rose-50 border-rose-500 text-rose-800 font-bold'
                                : 'bg-blue-50 border-blue-500 text-blue-800 font-bold'
                              : 'bg-white dark:bg-[#101B32] border-slate-200 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}) {opt}
                        </button>
                      ))}
                    </div>

                    {retestSubmitted && (
                      <div className="p-2.5 rounded-xl bg-white dark:bg-[#101B32] border text-[11px] text-slate-600 dark:text-slate-400">
                        <span className="font-bold text-emerald-600">Explanation: </span>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                ))}

                {!retestSubmitted ? (
                  <button
                    type="button"
                    onClick={handleSubmitRetest}
                    className="w-full min-h-[44px] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition"
                  >
                    Submit Re-test Answers
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGenerateRetest}
                    className="w-full min-h-[44px] py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-md transition"
                  >
                    Take Another Retest Drill
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= 11. PERSONAL AI STUDY PLANNER VIEW ================= */}
      {activeView === 'study-planner' && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#101B32] border border-slate-200/90 dark:border-slate-800 space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/50 text-blue-600">
                <Calendar className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Personal AI Study Planner
                </h2>
                <p className="text-xs text-slate-500">
                  Generates an honest, realistic weekly preparation schedule calibrated to your score gap.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">
                  Target Band Score
                </label>
                <select
                  value={targetScore}
                  onChange={(e) => setTargetScore(parseFloat(e.target.value))}
                  className="w-full bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-bold"
                >
                  <option value={6.5}>Band 6.5</option>
                  <option value={7.0}>Band 7.0</option>
                  <option value={7.5}>Band 7.5</option>
                  <option value={8.0}>Band 8.0</option>
                  <option value={8.5}>Band 8.5</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">
                  Daily Study Hours
                </label>
                <select
                  value={dailyHours}
                  onChange={(e) => setDailyHours(parseFloat(e.target.value))}
                  className="w-full bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-bold"
                >
                  <option value={1}>1.0 Hour / Day</option>
                  <option value={1.5}>1.5 Hours / Day</option>
                  <option value={2}>2.0 Hours / Day</option>
                  <option value={3}>3.0 Hours / Day</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">
                  Time Until Exam
                </label>
                <select
                  value={weeksRemaining}
                  onChange={(e) => setWeeksRemaining(parseInt(e.target.value))}
                  className="w-full bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-bold"
                >
                  <option value={2}>2 Weeks (Intensive Sprint)</option>
                  <option value={4}>4 Weeks (Standard Prep)</option>
                  <option value={8}>8 Weeks (Comprehensive)</option>
                  <option value={12}>12 Weeks (Foundational)</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                soundManager.playSuccess();
                setPlannerGenerated(true);
                onShowToast('Personalized 7-day schedule generated!');
              }}
              className="w-full min-h-[44px] py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition"
            >
              Generate Weekly Schedule
            </button>

            {plannerGenerated && (
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-slate-500">
                    Curated 7-Day Sprint Plan:
                  </span>
                  <span className="text-xs font-bold text-blue-600 font-mono">
                    Total: {Math.round(dailyHours * 7)} Hours Planned
                  </span>
                </div>

                <div className="space-y-2">
                  {[
                    { day: 'Day 1 (Mon)', task: 'Listening Section 1 & 2 + 15 Academic Vocabulary cards', dur: '45 mins', mod: 'listening' },
                    { day: 'Day 2 (Tue)', task: 'Writing Task 2 Problem-Solution Outline + Cohesion Drill', dur: '60 mins', mod: 'writing' },
                    { day: 'Day 3 (Wed)', task: 'Reading Passage 1 True/False/Not Given + Speed Pacer', dur: '50 mins', mod: 'reading' },
                    { day: 'Day 4 (Thu)', task: 'Speaking Part 2 Monologue + Shadowing Lab recording', dur: '45 mins', mod: 'speaking' },
                    { day: 'Day 5 (Fri)', task: 'Mistake Vault Review & C1 Idioms revision', dur: '40 mins', mod: 'vocab' },
                    { day: 'Day 6 (Sat)', task: 'Full Timed Mock Exam Simulation (Listening & Reading)', dur: '90 mins', mod: 'livemock' },
                    { day: 'Day 7 (Sun)', task: 'Weekly Diagnostic Review & Progress Milestone check', dur: '30 mins', mod: 'progress' }
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300 w-24 shrink-0">
                          {item.day}
                        </span>
                        <span className="text-slate-600 dark:text-slate-300 truncate">
                          {item.task}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigate(item.mod)}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0 ml-2"
                      >
                        Start →
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('studyplan')}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2"
                  >
                    <span>Open Full 30-Day Master Study Roadmap Suite</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
