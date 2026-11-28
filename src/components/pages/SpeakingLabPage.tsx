import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Mic,
  Volume2,
  VolumeX,
  Sparkles,
  Award,
  FileText,
  Headphones,
  Activity,
  BookmarkPlus,
  Check,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Brain,
  ArrowUpRight,
  Globe
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  Legend
} from 'recharts';
import { VoiceExaminer } from '../VoiceExaminer';
import { CueScratchpad } from '../CueScratchpad';
import { ShadowingPractice } from '../speaking/ShadowingPractice';
import { SpeakingTranscriptHighlighter } from '../speaking/SpeakingTranscriptHighlighter';
import { LiveAvatarSpeakingPartner } from '../speaking/LiveAvatarSpeakingPartner';
import { Part23StressTestStudio } from '../speaking/Part23StressTestStudio';
import { soundManager } from '../../utils/audioEffects';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import {
  BritishRegionalAccent,
  BRITISH_REGIONAL_ACCENT_LIST,
  BRITISH_REGIONAL_ACCENT_METADATA,
  getPreferredBritishRegionalAccent,
  setPreferredBritishRegionalAccent,
  getPreferredVoiceGender,
  setPreferredVoiceGender
} from '../../config/voiceConfig';
import { addMistake } from '../../utils/vaultStorage';
import { getActiveUser } from '../../utils/userStorage';
import { evaluateSingleSpeakingTurn } from '../../services/SpeakingEvaluationService';
import { InstantSpeakingFeedback, SpeakingAnswerRecord } from '../../types/speakingTypes';
import { CandidateAiPilotPanel } from '../common/CandidateAiPilotPanel';
import { CDIELTSSpeakingSuite } from '../cdielts/CDIELTSSpeakingSuite';

interface SpeakingLabPageProps {
  onBack: () => void;
  onGradeInMock: (text: string, title: string) => void;
  onShowToast: (msg: string) => void;
  onNavigateToVault?: () => void;
}

interface DiagnosticPreset {
  id: string;
  label: string;
  part: 1 | 2 | 3;
  topic: string;
  questionText: string;
  transcript: string;
  wpm: number;
  durationSec: number;
  fillers: string[];
  fluencyScore: number;
  coherenceScore: number;
  hesitationControl: number;
  topicDevelopment: number;
  lexicalScore: number;
  grammarPronScore: number;
  overallBand: number;
  verdictEn: string;
  verdictBn: string;
  discourseUpgrade: {
    observed: string;
    upgraded: string;
    rule: string;
    explanationEn: string;
    explanationBn: string;
  };
}

const DIAGNOSTIC_PRESETS: DiagnosticPreset[] = [
  {
    id: 'preset_part3_fast_incoherent',
    label: 'Part 3: High Speed / Low Coherence (Band 6.5)',
    part: 3,
    topic: 'Urbanisation & Architecture',
    questionText: 'Do you think modern cities prioritize economic efficiency over human well-being?',
    transcript:
      'Yes I think modern cities are very busy and people work all the time and there are many tall buildings. Also the traffic is very bad so people feel stressed and they do not have parks to relax and companies just want money so they build more offices every year.',
    wpm: 148,
    durationSec: 22,
    fillers: ['um', 'so', 'and'],
    fluencyScore: 7.5,
    coherenceScore: 5.5,
    hesitationControl: 7.0,
    topicDevelopment: 6.0,
    lexicalScore: 6.0,
    grammarPronScore: 6.5,
    overallBand: 6.5,
    verdictEn:
      'Fluency vs. Coherence Imbalance (+2.0 Band Gap): Your raw delivery speed (148 WPM) is fluent, but clauses are chained together with repetitive coordinating conjunctions ("and", "so") rather than subordinate C1 discourse markers.',
    verdictBn:
      'ফ্লুয়েন্সি বনাম কোহেরেন্স পার্থক্য: আপনার কথা বলার গতি ভালো (148 WPM), কিন্তু বাক্যগুলো বারবার "and" এবং "so" দিয়ে যুক্ত করার কারণে Coherence স্কোর কমে গেছে। Band 7.5+ পেতে "Notwithstanding this", "Consequently" এর মতো সংযোগকারী শব্দ ব্যবহার করুন।',
    discourseUpgrade: {
      observed: 'companies just want money so they build more offices every year',
      upgraded: 'commercial developers prioritize fiscal returns; consequently, green communal spaces are systematically displaced by high-density office blocks',
      rule: 'Cohesive Cause-Effect Subordination (Band 8.5)',
      explanationEn: 'Replaces informal "so" chaining with nominalisation and a formal resultative discourse marker ("consequently").',
      explanationBn: 'সাধারণ "so" এর পরিবর্তে আনুষ্ঠানিক "consequently" এবং উন্নত ভোকাবুলারি ব্যবহার করে যুক্তির ধারাবাহিকতা বাড়ানো হয়েছে।'
    }
  },
  {
    id: 'preset_part2_hesitant_coherent',
    label: 'Part 2: Structured / Hesitant Pace (Band 7.0)',
    part: 2,
    topic: 'Technological Innovation',
    questionText: 'Describe a piece of modern software or technology that has significantly improved your productivity.',
    transcript:
      'To begin with, the software that has fundamentally transformed my academic workflow is an automated spaced-repetition platform. Initially, I struggled to retain complex terminology. However, after integrating algorithmic flashcards into my daily routine, my long-term recall improved markedly.',
    wpm: 108,
    durationSec: 34,
    fillers: ['um', 'uh', 'er'],
    fluencyScore: 6.5,
    coherenceScore: 8.0,
    hesitationControl: 6.0,
    topicDevelopment: 7.5,
    lexicalScore: 7.5,
    grammarPronScore: 7.0,
    overallBand: 7.0,
    verdictEn:
      'Strong Logical Coherence (8.0) Held Back by Mid-Clause Hesitation (6.5): Your signposting ("To begin with", "Initially", "However") is Band 8 calibre, but lexical search pauses lowered your acoustic continuity.',
    verdictBn:
      'চমৎকার লজিক্যাল কোহেরেন্স (8.0) কিন্তু মধ্য-বাক্যে থেমে যাওয়ার প্রবণতা (6.5): আপনার ডিসকোর্স মার্কার ব্যবহার অত্যন্ত উন্নত, কিন্তু সঠিক শব্দ খোঁজার জন্য বাক্যের মাঝে থেমে যাওয়ায় Fluency স্কোর কিছুটা কমেছে।',
    discourseUpgrade: {
      observed: 'Initially, I struggled... um... to retain complex terminology',
      upgraded: 'At the outset, retaining dense technical nomenclature proved daunting, yet spaced-repetition algorithms swiftly bridged that gap',
      rule: 'Zero-Hesitation Lexical Chunking (Band 8.5)',
      explanationEn: 'Uses pre-assembled C1 collocations ("at the outset", "proved daunting") to eliminate mid-sentence lexical search pauses.',
      explanationBn: 'বাক্যের মাঝে থেমে যাওয়া এড়াতে "at the outset" এবং "proved daunting" এর মতো রেডিমেড ফ্রেজ ব্যবহার করা হয়েছে।'
    }
  },
  {
    id: 'preset_part3_band8_calibrated',
    label: 'Part 3: Calibrated C1/C2 Equilibrium (Band 8.5)',
    part: 3,
    topic: 'Globalisation & Cultural Identity',
    questionText: 'To what extent does globalisation erode indigenous cultural traditions?',
    transcript:
      'While it is undeniable that multinational media homogenises consumer habits among younger demographics, viewing globalisation purely as a destructive force overlooks its capacity to digitally preserve endangered heritage. In fact, many grassroots artisans now leverage global platforms to revitalize ancestral crafts.',
    wpm: 134,
    durationSec: 28,
    fillers: [],
    fluencyScore: 8.5,
    coherenceScore: 8.5,
    hesitationControl: 8.5,
    topicDevelopment: 8.5,
    lexicalScore: 8.5,
    grammarPronScore: 8.5,
    overallBand: 8.5,
    verdictEn:
      'Optimal Fluency-Coherence Equilibrium (Band 8.5): Speech rate sits squarely in the Practice native cadence zone (134 WPM) while concessive subordination ("While it is undeniable that...") frames a nuanced argument.',
    verdictBn:
      'ফ্লুয়েন্সি এবং কোহেরেন্সের আদর্শ ভারসাম্য (Band 8.5): আপনার কথা বলার গতি (134 WPM) এবং জটিল বাক্যের গঠন ("While it is undeniable that...") সম্পূর্ণভাবে ক্যামব্রিজ Band 8.5 মানদণ্ড পূরণ করেছে।',
    discourseUpgrade: {
      observed: 'While it is undeniable that multinational media homogenises consumer habits...',
      upgraded: 'Notwithstanding the homogenising pull of transnational media, digital connectivity empowers local communities to archive intangible heritage.',
      rule: 'C2 Concessive Framing & Nominalisation (Band 9.0)',
      explanationEn: 'Demonstrates effortless C2 register using "Notwithstanding" + noun phrase for maximum rhetorical authority.',
      explanationBn: '"Notwithstanding" ব্যবহার করে সর্বোচ্চ স্তরের (Band 9.0) একাডেমিক ও সাবলীল প্রকাশভঙ্গি নিশ্চিত করা হয়েছে।'
    }
  }
];

export const SpeakingLabPage: React.FC<SpeakingLabPageProps> = ({
  onBack,
  onGradeInMock,
  onShowToast,
  onNavigateToVault
}) => {
  const [activeTab, setActiveTab] = useState<'interview' | 'stress_test' | 'avatar_partner' | 'cuecard' | 'shadowing' | 'feedback' | 'ai_pilots'>('interview');
  const [examinerGender, setExaminerGender] = useState<'male' | 'female'>(() =>
    getPreferredVoiceGender()
  );
  const [regionalAccent, setRegionalAccent] = useState<BritishRegionalAccent>(() =>
    getPreferredBritishRegionalAccent()
  );
  const [isPreviewingRegionalAccent, setIsPreviewingRegionalAccent] = useState<boolean>(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(DIAGNOSTIC_PRESETS[0].id);
  const [customTranscript, setCustomTranscript] = useState<string>('');
  const [customQuestion, setCustomQuestion] = useState<string>(
    'Do you believe artificial intelligence will fundamentally reshape university education?'
  );
  const [liveEvaluation, setLiveEvaluation] = useState<InstantSpeakingFeedback | null>(null);
  const [isEvaluatingCustom, setIsEvaluatingCustom] = useState<boolean>(false);
  const [isPlayingUpgradeAudio, setIsPlayingUpgradeAudio] = useState<boolean>(false);
  const [savedUpgradeIds, setSavedUpgradeIds] = useState<Record<string, boolean>>({});

  // Primary full-screen CD-IELTS Speaking Examination vs Auxiliary Practice Labs
  const [showPracticeLabs, setShowPracticeLabs] = useState<boolean>(false);

  // AI Speaking Pilot State (launched only from APPROVED drafts)
  const [activePilotSet, setActivePilotSet] = useState<any | null>(null);

  useEffect(() => {
    const handleRegionalSync = (e: Event) => {
      const custom = e as CustomEvent<{ accent: BritishRegionalAccent }>;
      if (custom.detail?.accent) {
        setRegionalAccent(custom.detail.accent);
      }
    };
    const handleGenderSync = (e: Event) => {
      const custom = e as CustomEvent<{ gender: 'male' | 'female' }>;
      if (custom.detail?.gender === 'male' || custom.detail?.gender === 'female') {
        setExaminerGender(custom.detail.gender);
      }
    };
    window.addEventListener('ielts_british_regional_accent_changed', handleRegionalSync);
    window.addEventListener('ielts_voice_gender_changed', handleGenderSync);
    return () => {
      window.removeEventListener('ielts_british_regional_accent_changed', handleRegionalSync);
      window.removeEventListener('ielts_voice_gender_changed', handleGenderSync);
    };
  }, []);

  const handleSelectExaminerGender = (nextGender: 'male' | 'female') => {
    soundManager.playBeep(600, 0.04);
    stopSpeech();
    setExaminerGender(nextGender);
    setPreferredVoiceGender(nextGender);
    const cfg = BRITISH_REGIONAL_ACCENT_METADATA[regionalAccent];
    const personaName = nextGender === 'female' ? 'Examiner Clara, AI (Female)' : 'Examiner Arthur, AI (Practice Male)';
    onShowToast(`Examiner Voice set to ${personaName} · ${cfg.label}`);
    setIsPreviewingRegionalAccent(true);
    speakBritish(
      `Good day. I am ${nextGender === 'female' ? 'Doctor Clara Sterling' : 'Professor Arthur Pendelton'}, your Practice IELTS Speaking examiner.`,
      {
        speakerId: nextGender === 'female' ? 'speaker_05' : 'speaker_04',
        gender: nextGender,
        regionalAccent,
        rate: cfg.defaultRate,
        deliveryProfile: 'examiner_instruction',
        onEnd: () => setIsPreviewingRegionalAccent(false),
        onError: () => setIsPreviewingRegionalAccent(false)
      }
    );
  };

  const handleSelectRegionalAccent = (nextAccent: BritishRegionalAccent) => {
    soundManager.playBeep(620, 0.04);
    stopSpeech();
    setIsPreviewingRegionalAccent(false);
    setRegionalAccent(nextAccent);
    setPreferredBritishRegionalAccent(nextAccent);
    const cfg = BRITISH_REGIONAL_ACCENT_METADATA[nextAccent];
    onShowToast(`Examiner Regional Accent set to ${cfg.label} (${cfg.regionName})`);
  };

  const handlePreviewRegionalAccent = () => {
    if (isPreviewingRegionalAccent) {
      stopSpeech();
      setIsPreviewingRegionalAccent(false);
      return;
    }
    const cfg = BRITISH_REGIONAL_ACCENT_METADATA[regionalAccent];
    soundManager.playBeep(660, 0.04);
    setIsPreviewingRegionalAccent(true);
    speakBritish(cfg.sampleGreeting, {
      gender: examinerGender,
      regionalAccent,
      rate: cfg.defaultRate,
      deliveryProfile: 'examiner_instruction',
      onEnd: () => setIsPreviewingRegionalAccent(false),
      onError: () => setIsPreviewingRegionalAccent(false)
    });
  };

  // Check if user has a recent speaking session in localStorage to hydrate live feedback
  useEffect(() => {
    try {
      const raw = localStorage.getItem('ielts_speaking_exam_session_v4');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.completedAnswers) && parsed.completedAnswers.length > 0) {
          const lastAns: SpeakingAnswerRecord = parsed.completedAnswers[parsed.completedAnswers.length - 1];
          if (lastAns?.instantFeedback) {
            setLiveEvaluation(lastAns.instantFeedback);
          }
        }
      }
    } catch {
      // Ignore storage read errors
    }
  }, [activeTab]);

  const activePreset = useMemo(
    () => DIAGNOSTIC_PRESETS.find((p) => p.id === selectedPresetId) || DIAGNOSTIC_PRESETS[0],
    [selectedPresetId]
  );

  // Build Recharts RadarChart data for Fluency vs. Coherence breakdown (null-safe; never coerces null pronunciation to 0)
  const radarData = useMemo(() => {
    if (liveEvaluation && selectedPresetId === 'live_session') {
      const f = liveEvaluation.estimatedBands?.fluency ?? null;
      const l = liveEvaluation.estimatedBands?.lexical ?? null;
      const g = liveEvaluation.estimatedBands?.grammar ?? null;
      const p =
        typeof liveEvaluation.estimatedBands?.pronunciation === 'number' &&
        liveEvaluation.estimatedBands.pronunciation > 0
          ? liveEvaluation.estimatedBands.pronunciation
          : null;

      if (
        liveEvaluation.isValidAttempt === false ||
        liveEvaluation.assessmentStatus === 'unavailable' ||
        typeof f !== 'number' ||
        typeof l !== 'number' ||
        typeof g !== 'number'
      ) {
        return [];
      }

      const wpm = liveEvaluation.wordsPerMinute || 0;
      const paceScore =
        wpm >= 115 && wpm <= 150
          ? f
          : wpm > 0
          ? Math.max(1.0, Number((f - 0.5).toFixed(1)))
          : f;
      const discourseCoherence = Number(Math.max(1.0, Math.min(9.0, f * 0.6 + l * 0.4)).toFixed(1));

      return [
        {
          metric: 'Speech Flow (Fluency)',
          candidate: Number(f.toFixed(1)),
          benchmark: 8.0,
          fullMark: 9.0
        },
        {
          metric: 'Logical Coherence',
          candidate: Number(discourseCoherence.toFixed(1)),
          benchmark: 8.0,
          fullMark: 9.0
        },
        {
          metric: 'Pace Control',
          candidate: Number(paceScore.toFixed(1)),
          benchmark: 8.0,
          fullMark: 9.0
        },
        {
          metric: 'Topic Expansion',
          candidate: Number(((f + l) / 2).toFixed(1)),
          benchmark: 8.0,
          fullMark: 9.0
        },
        {
          metric: 'Lexical Precision',
          candidate: Number(l.toFixed(1)),
          benchmark: 8.0,
          fullMark: 9.0
        },
        {
          metric: p !== null ? 'Grammar & Pronunciation' : 'Grammar Accuracy',
          candidate: p !== null ? Number(((g + p) / 2).toFixed(1)) : Number(g.toFixed(1)),
          benchmark: 8.0,
          fullMark: 9.0
        }
      ];
    }

    return [
      {
        metric: 'Speech Flow (Fluency)',
        candidate: activePreset.fluencyScore,
        benchmark: 8.0,
        fullMark: 9.0
      },
      {
        metric: 'Logical Coherence',
        candidate: activePreset.coherenceScore,
        benchmark: 8.0,
        fullMark: 9.0
      },
      {
        metric: 'Hesitation Control',
        candidate: activePreset.hesitationControl,
        benchmark: 8.0,
        fullMark: 9.0
      },
      {
        metric: 'Topic Expansion',
        candidate: activePreset.topicDevelopment,
        benchmark: 8.0,
        fullMark: 9.0
      },
      {
        metric: 'Lexical Precision',
        candidate: activePreset.lexicalScore,
        benchmark: 8.0,
        fullMark: 9.0
      },
      {
        metric: 'Grammar & Cadence',
        candidate: activePreset.grammarPronScore,
        benchmark: 8.0,
        fullMark: 9.0
      }
    ];
  }, [activePreset, liveEvaluation, selectedPresetId]);

  const currentFluencyScore = radarData[0]?.candidate ?? 0;
  const currentCoherenceScore = radarData[1]?.candidate ?? 0;
  const fluencyCoherenceGap =
    radarData.length >= 2
      ? Number((currentFluencyScore - currentCoherenceScore).toFixed(1))
      : 0;

  const handleAnalyzeCustomSpeech = async () => {
    const trimmed = customTranscript.trim();
    if (!trimmed || trimmed.split(/\s+/).length < 6) {
      onShowToast('Please enter at least 6 words of a spoken response to run the Fluency vs. Coherence radar.');
      return;
    }

    setIsEvaluatingCustom(true);
    soundManager.playBeep(620, 0.05);

    const words = trimmed.split(/\s+/).length;
    const durationSec = Math.max(15, Math.round(words / 2.2));
    const wpm = Math.round((words / durationSec) * 60);
    const fillers = trimmed.match(/\b(um|uh|er|like|you know|basically)\b/gi) || [];

    const record: SpeakingAnswerRecord = {
      questionId: 'custom_radar_' + Date.now(),
      part: 3,
      topic: 'AI Speech Lab Diagnostic',
      questionText: customQuestion,
      transcript: trimmed,
      startTime: Date.now() - durationSec * 1000,
      endTime: Date.now(),
      durationSec,
      wordCount: words,
      wordsPerMinute: wpm,
      pauseCount: null,
      longPauseCount: null,
      fillerCount: fillers.length,
      detectedFillers: fillers
    };

    try {
      const result = await evaluateSingleSpeakingTurn(record);
      if (result.isValidAttempt === false || result.assessmentStatus === 'unavailable') {
        onShowToast(result.feedbackEn || result.error || 'AI speaking assessment is currently unavailable. No score was generated.');
        return;
      }
      setLiveEvaluation(result);
      setSelectedPresetId('live_session');
      soundManager.playSuccess();
      onShowToast(
        result.overallBand !== null
          ? 'Updated Fluency vs. Coherence Spider Chart with your speech analysis!'
          : 'Updated Spider Chart with partial transcript analysis (3/4 criteria; Pronunciation unassessed).'
      );
    } catch {
      onShowToast('AI speaking evaluation unavailable. Please sign in and retry.');
    } finally {
      setIsEvaluatingCustom(false);
    }
  };

  const handlePlayModelPhrase = (text: string) => {
    if (isPlayingUpgradeAudio) {
      stopSpeech();
      setIsPlayingUpgradeAudio(false);
      return;
    }
    soundManager.playBeep(660, 0.04);
    setIsPlayingUpgradeAudio(true);
    speakBritish(text, {
      regionalAccent,
      rate: BRITISH_REGIONAL_ACCENT_METADATA[regionalAccent].defaultRate,
      onEnd: () => setIsPlayingUpgradeAudio(false),
      onError: () => setIsPlayingUpgradeAudio(false)
    });
  };

  const handleSaveUpgradeToVault = () => {
    const isLive = selectedPresetId === 'live_session' && liveEvaluation;
    const key = isLive ? `live_${liveEvaluation.questionId}` : activePreset.id;
    if (savedUpgradeIds[key]) return;

    if (isLive && liveEvaluation) {
      const firstErr = liveEvaluation.grammaticalErrors[0];
      const fluencyLabel =
        typeof liveEvaluation.estimatedBands?.fluency === 'number'
          ? liveEvaluation.estimatedBands.fluency.toFixed(1)
          : 'Unassessed';
      addMistake({
        module: 'speaking',
        title: `Speaking Fluency & Coherence: ${liveEvaluation.topic}`,
        prompt: liveEvaluation.questionText,
        questionType: `Part ${liveEvaluation.part} Discourse & Coherence`,
        userAnswer: firstErr ? firstErr.observed : liveEvaluation.candidateTranscript.slice(0, 120),
        correctAnswer: firstErr ? firstErr.corrected : liveEvaluation.band8Answer.modelAnswer.slice(0, 180),
        explanation: liveEvaluation.band8Answer.examinerRationale,
        trapExplanationEn: `Fluency (${fluencyLabel}) vs Coherence optimization using C1 discourse markers: ${liveEvaluation.band8Answer.keyDiscourseMarkers.join(', ')}.`,
        trapExplanationBn: 'স্পিকিংয়ে শুধুমাত্র দ্রুত কথা বললেই Band 8 পাওয়া যায় না; সঠিক ডিসকোর্স মার্কার ও লজিক্যাল সংযোগ (Coherence) বজায় রাখা জরুরি।',
        sourceContext: `Speaking Lab AI Feedback · Part ${liveEvaluation.part}`
      });
    } else {
      addMistake({
        module: 'speaking',
        title: `Speaking Coherence Upgrade: ${activePreset.discourseUpgrade.rule}`,
        prompt: activePreset.questionText,
        questionType: `Part ${activePreset.part} Fluency vs. Coherence`,
        userAnswer: activePreset.discourseUpgrade.observed,
        correctAnswer: activePreset.discourseUpgrade.upgraded,
        explanation: activePreset.discourseUpgrade.explanationEn,
        trapExplanationEn: activePreset.verdictEn,
        trapExplanationBn: activePreset.discourseUpgrade.explanationBn,
        sourceContext: `Speaking Lab Spider Chart Diagnostic · ${activePreset.topic}`
      });
    }

    setSavedUpgradeIds((prev) => ({ ...prev, [key]: true }));
    soundManager.playSuccess();
    onShowToast('Saved Fluency & Coherence upgrade to SuperMemo SM-2 Mistake Vault!');
  };

  const activeRegionConfig = BRITISH_REGIONAL_ACCENT_METADATA[regionalAccent];

  if (!showPracticeLabs) {
    return (
      <div className="fixed inset-0 z-40 bg-[#EAEEF2] overflow-hidden">
        <CDIELTSSpeakingSuite
          onExit={onBack}
          onShowToast={onShowToast}
          onOpenPracticeLabs={() => setShowPracticeLabs(true)}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 animate-fade-in pb-24 md:pb-12">
      {/* Top Bar with Back Button & Sticky Module Switcher */}
      <div className="sticky top-0 z-30 bg-[#F7F9F8]/95 dark:bg-[#0B1514]/95 backdrop-blur-md p-2 rounded-xl border border-[#D3DDDA] dark:border-[#1E3330] flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowPracticeLabs(false)}
            className="min-h-[40px] px-3 py-1.5 rounded-md bg-[#0F4C45] hover:bg-[#145E55] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>CD-IELTS Speaking Exam</span>
          </button>
          <button
            type="button"
            onClick={onBack}
            className="min-h-[40px] min-w-[40px] px-3 py-1.5 rounded-md bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1E3330] hover:border-[#0F4C45] text-[#0E1F1E] dark:text-[#EEF3F1] text-xs font-semibold transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span className="hidden sm:inline">Practice Hub</span>
            <span className="sm:hidden">Exit</span>
          </button>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#EEF3F1] dark:bg-[#11201E] rounded-lg border border-[#D3DDDA] dark:border-[#1E3330] overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setActiveTab('interview');
              soundManager.playBeep(600, 0.04);
            }}
            className={`min-h-[36px] px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
              activeTab === 'interview'
                ? 'bg-[#0F4C45] text-white'
                : 'text-[#566664] dark:text-[#96B0AC] hover:text-[#0E1F1E] dark:hover:text-[#EEF3F1]'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Examiner Interview</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('stress_test');
              soundManager.playBeep(640, 0.04);
            }}
            className={`min-h-[36px] px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
              activeTab === 'stress_test'
                ? 'bg-[#0F4C45] text-white'
                : 'text-[#566664] dark:text-[#96B0AC] hover:text-[#0E1F1E] dark:hover:text-[#EEF3F1]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-[#F4A62A]" />
            <span>Part 2/3 Stress-Test</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('avatar_partner');
              soundManager.playBeep(620, 0.04);
            }}
            className={`min-h-[36px] px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
              activeTab === 'avatar_partner'
                ? 'bg-[#0F4C45] text-white'
                : 'text-[#566664] dark:text-[#96B0AC] hover:text-[#0E1F1E] dark:hover:text-[#EEF3F1]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F4A62A]" />
            <span>Live Video Examiner</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('feedback');
              soundManager.playBeep(600, 0.04);
            }}
            className={`min-h-[36px] px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
              activeTab === 'feedback'
                ? 'bg-[#0F4C45] text-white'
                : 'text-[#566664] dark:text-[#96B0AC] hover:text-[#0E1F1E] dark:hover:text-[#EEF3F1]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>AI Radar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('shadowing');
              soundManager.playBeep(600, 0.04);
            }}
            className={`min-h-[36px] px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
              activeTab === 'shadowing'
                ? 'bg-[#0F4C45] text-white'
                : 'text-[#566664] dark:text-[#96B0AC] hover:text-[#0E1F1E] dark:hover:text-[#EEF3F1]'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Shadowing &amp; Pronunciation</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('cuecard');
              soundManager.playBeep(600, 0.04);
            }}
            className={`min-h-[36px] px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
              activeTab === 'cuecard'
                ? 'bg-[#0F4C45] text-white'
                : 'text-[#566664] dark:text-[#96B0AC] hover:text-[#0E1F1E] dark:hover:text-[#EEF3F1]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Cue Card Scratchpad</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('ai_pilots');
              soundManager.playBeep(640, 0.04);
            }}
            className={`min-h-[36px] px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
              activeTab === 'ai_pilots'
                ? 'bg-[#0F4C45] text-white'
                : 'text-[#0F4C45] dark:text-[#4DB6A4] hover:text-[#0B3833]'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>AI Pilots</span>
          </button>
        </div>
      </div>

      {/* Practice Examiner Voice Persona & British Regional Accent Toggle Bar */}
      <div className="bg-white dark:bg-[#11201E] rounded-xl border border-[#D3DDDA] dark:border-[#1E3330] p-3.5 sm:px-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-[#0F4C45] dark:text-[#4DB6A4]">
              <Globe className="w-3.5 h-3.5" />
              <span>Practice Examiner Voice &amp; Regional Accent</span>
            </span>
            <span className="text-[11px] font-semibold text-[#0E1F1E] dark:text-[#EEF3F1] bg-[#EEF3F1] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1E3330] px-2 py-0.5 rounded-md">
              {examinerGender === 'male' ? 'Prof. Arthur (Male)' : 'Dr. Clara (Female)'} · {activeRegionConfig.regionName}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {activeRegionConfig.phoneticNote}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Practice Male / Female Examiner Toggle */}
          <div
            role="radiogroup"
            aria-label="Select Practice Male or Female Examiner Voice"
            className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
          >
            <button
              type="button"
              role="radio"
              aria-checked={examinerGender === 'male'}
              onClick={() => handleSelectExaminerGender('male')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                examinerGender === 'male'
                  ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Prof. Arthur (Male)
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={examinerGender === 'female'}
              onClick={() => handleSelectExaminerGender('female')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                examinerGender === 'female'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Dr. Clara (Female)
            </button>
          </div>

          {/* Regional Accent Toggle */}
          <div
            role="radiogroup"
            aria-label="Select British Regional Accent for AI Examiner"
            className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex-wrap"
          >
            {BRITISH_REGIONAL_ACCENT_LIST.map((item) => {
              const isSelected = regionalAccent === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleSelectRegionalAccent(item.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {item.shortLabel}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handlePreviewRegionalAccent}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap border ${
              isPreviewingRegionalAccent
                ? 'bg-rose-600 text-white border-rose-500'
                : 'bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/80'
            }`}
            title={`Hear a sample greeting in ${activeRegionConfig.label}`}
          >
            {isPreviewingRegionalAccent ? (
              <>
                <VolumeX className="w-3.5 h-3.5 animate-pulse" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>Test {activeRegionConfig.shortLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Mode View */}
      {activeTab === 'interview' ? (
        <VoiceExaminer
          onGradeInMock={onGradeInMock}
          onShowToast={onShowToast}
          customMockSet={activePilotSet}
          onClearCustomMockSet={() => setActivePilotSet(null)}
        />
      ) : activeTab === 'stress_test' ? (
        <Part23StressTestStudio onShowToast={onShowToast} />
      ) : activeTab === 'ai_pilots' ? (
        <div className="space-y-6 animate-fade-in">
          <CandidateAiPilotPanel
            module="speaking"
            moduleTitle="Speaking"
            onLaunchApprovedPilot={(examSet) => {
              setActivePilotSet(examSet);
              soundManager.playSuccess();
              onShowToast(
                `Launched Approved AI Speaking Pilot: "${examSet.title || 'Speaking Pilot'}"`
              );
              setActiveTab('interview');
            }}
          />
        </div>
      ) : activeTab === 'avatar_partner' ? (
        <LiveAvatarSpeakingPartner
          isModal={false}
          isOpen={true}
          autoStart5MinDrill={true}
          initialGender={examinerGender}
          initialCharacter={examinerGender === 'male' ? 'arthur' : 'clara'}
          onShowToast={onShowToast}
        />
      ) : activeTab === 'feedback' ? (
        <div className="space-y-6 animate-fade-in">
          {/* Top Telemetry Header */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-md space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="space-y-1">
                <div className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Practice ACOUSTIC & DISCOURSE TELEMETRY</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Fluency vs. Coherence AI Performance Spider Chart
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
                  Visualizes the critical equilibrium between raw acoustic speech continuity (Fluency) and logical clause architecture (Coherence) against the Band 8.0 benchmark.
                </p>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
                <div className="p-3.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-center min-w-[115px]">
                  <div className="text-[10px] font-mono uppercase text-slate-400">
                    {selectedPresetId === 'live_session' && liveEvaluation && liveEvaluation.overallBand === null
                      ? 'Partial Index (3/4)'
                      : 'Overall Band'}
                  </div>
                  <div className="text-2xl font-black font-mono text-amber-400 tabular-nums mt-0.5">
                    {selectedPresetId === 'live_session' && liveEvaluation
                      ? typeof liveEvaluation.overallBand === 'number'
                        ? liveEvaluation.overallBand.toFixed(1)
                        : typeof liveEvaluation.partialThreeCriterionIndex === 'number'
                        ? liveEvaluation.partialThreeCriterionIndex.toFixed(1)
                        : 'N/A'
                      : activePreset.overallBand.toFixed(1)}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-center min-w-[125px]">
                  <div className="text-[10px] font-mono uppercase text-slate-400">F/C Delta Gap</div>
                  <div
                    className={`text-2xl font-black font-mono tabular-nums mt-0.5 ${
                      Math.abs(fluencyCoherenceGap) <= 0.5
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {fluencyCoherenceGap > 0 ? `+${fluencyCoherenceGap}` : fluencyCoherenceGap}
                  </div>
                </div>
              </div>
            </div>

            {/* Diagnostic Profile Selector */}
            <div className="space-y-2">
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Select Speech Diagnostic Profile or Latest Recorded Turn:
              </div>
              <div className="flex flex-wrap gap-2">
                {liveEvaluation && liveEvaluation.isValidAttempt !== false && (
                  <button
                    onClick={() => {
                      setSelectedPresetId('live_session');
                      soundManager.playBeep(640, 0.04);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      selectedPresetId === 'live_session'
                        ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>
                      {typeof liveEvaluation.overallBand === 'number'
                        ? `Your Latest Evaluated Speech (Band ${liveEvaluation.overallBand.toFixed(1)})`
                        : typeof liveEvaluation.partialThreeCriterionIndex === 'number'
                        ? `Your Latest Evaluated Speech (Partial 3/4 Index ${liveEvaluation.partialThreeCriterionIndex.toFixed(1)})`
                        : 'Your Latest Evaluated Speech (Unassessed)'}
                    </span>
                  </button>
                )}

                {DIAGNOSTIC_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setSelectedPresetId(preset.id);
                      soundManager.playBeep(600, 0.04);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      selectedPresetId === preset.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Grid: Recharts Spider Chart + Sub-Skill Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Cols: Recharts Spider Chart */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-600">
                    6-Axis Multi-Dimensional Speech Polygon
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                    Fluency vs. Coherence Spider Chart
                  </h2>
                </div>
                <span className="text-xs font-mono text-slate-500 tabular-nums">
                  Scale: Band 0.0 – 9.0
                </span>
              </div>

              <div className="w-full h-[320px] sm:h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="74%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fill: '#1e293b', fontSize: 11, fontWeight: 700 }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 9]}
                      tickCount={6}
                      tick={{ fill: '#64748b', fontSize: 10 }}
                    />
                    <Radar
                      name="Target Band 8.0 Benchmark"
                      dataKey="benchmark"
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      fill="#10b981"
                      fillOpacity={0.12}
                    />
                    <Radar
                      name="Candidate Speech Profile"
                      dataKey="candidate"
                      stroke="#4f46e5"
                      strokeWidth={2.5}
                      fill="#4f46e5"
                      fillOpacity={0.32}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#f8fafc',
                        fontSize: '12px',
                        fontWeight: 600
                      }}
                    />
                    <Legend
                      wrapperStyle={{
                        fontSize: '12px',
                        fontWeight: 700,
                        paddingTop: '8px'
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Acoustic Metric Strip */}
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-center font-mono">
                <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] uppercase text-slate-500 font-bold">Speech Rate</div>
                  <div className="text-sm sm:text-base font-black text-slate-900 tabular-nums mt-0.5">
                    {selectedPresetId === 'live_session' && liveEvaluation
                      ? `${liveEvaluation.wordsPerMinute} WPM`
                      : `${activePreset.wpm} WPM`}
                  </div>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] uppercase text-slate-500 font-bold">Fluency Axis</div>
                  <div className="text-sm sm:text-base font-black text-indigo-700 tabular-nums mt-0.5">
                    Band {currentFluencyScore.toFixed(1)}
                  </div>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] uppercase text-slate-500 font-bold">Coherence Axis</div>
                  <div className="text-sm sm:text-base font-black text-emerald-700 tabular-nums mt-0.5">
                    Band {currentCoherenceScore.toFixed(1)}
                  </div>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Fluency vs. Coherence Diagnostic & SM-2 Vault Integration */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-600">
                    Examiner Diagnostic Verdict
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-0.5">
                    Why Fluency ≠ Coherence in IELTS Speaking
                  </h3>
                </div>

                {/* Bilingual Examiner Diagnosis */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {selectedPresetId === 'live_session' && liveEvaluation
                      ? liveEvaluation.band8Answer.examinerRationale
                      : activePreset.verdictEn}
                  </p>
                  {selectedPresetId !== 'live_session' && (
                    <p className="text-slate-600 leading-relaxed pt-1 border-t border-slate-200/80">
                      {activePreset.verdictBn}
                    </p>
                  )}
                </div>

                {/* Observed vs Band 8.5+ Cohesive Rewrite */}
                <div className="space-y-2.5">
                  <div className="text-[11px] font-mono font-bold uppercase text-slate-500">
                    Targeted Discourse & Coherence Upgrade
                  </div>

                  <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-xs space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-rose-700 block">
                      Observed Candidate Clause:
                    </span>
                    <p className="font-mono text-rose-950 line-through">
                      "
                      {selectedPresetId === 'live_session' && liveEvaluation
                        ? liveEvaluation.grammaticalErrors[0]?.observed || liveEvaluation.candidateTranscript
                        : activePreset.discourseUpgrade.observed}
                      "
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase text-emerald-800">
                        Band 8.5+ Cohesive Architecture:
                      </span>
                      <button
                        onClick={() =>
                          handlePlayModelPhrase(
                            selectedPresetId === 'live_session' && liveEvaluation
                              ? liveEvaluation.band8Answer.modelAnswer
                              : activePreset.discourseUpgrade.upgraded
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        {isPlayingUpgradeAudio ? (
                          <>
                            <VolumeX className="w-3 h-3 animate-pulse" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3" />
                            <span>Hear British RP</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="font-serif text-emerald-950 font-semibold leading-relaxed">
                      "
                      {selectedPresetId === 'live_session' && liveEvaluation
                        ? liveEvaluation.band8Answer.modelAnswer
                        : activePreset.discourseUpgrade.upgraded}
                      "
                    </p>
                  </div>
                </div>
              </div>

              {/* Save to SM-2 Mistake Vault Action */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <button
                  onClick={handleSaveUpgradeToVault}
                  disabled={
                    savedUpgradeIds[
                      selectedPresetId === 'live_session' && liveEvaluation
                        ? `live_${liveEvaluation.questionId}`
                        : activePreset.id
                    ]
                  }
                  className={`w-full min-h-[42px] px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    savedUpgradeIds[
                      selectedPresetId === 'live_session' && liveEvaluation
                        ? `live_${liveEvaluation.questionId}`
                        : activePreset.id
                    ]
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                  }`}
                >
                  {savedUpgradeIds[
                    selectedPresetId === 'live_session' && liveEvaluation
                      ? `live_${liveEvaluation.questionId}`
                      : activePreset.id
                  ] ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Scheduled in SuperMemo SM-2 Mistake Vault</span>
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="w-4 h-4 text-amber-400" />
                      <span>Save Coherence Upgrade to SM-2 Mistake Vault</span>
                    </>
                  )}
                </button>

                {onNavigateToVault && (
                  <button
                    onClick={onNavigateToVault}
                    className="w-full py-2 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Brain className="w-3.5 h-3.5" />
                    <span>Open SM-2 Spaced Repetition Vault</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Custom Speech Evaluator to Plot on Radar Chart */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-600">
                  Instant Diagnostic Sandbox
                </span>
                <h3 className="text-base font-black text-slate-900">
                  Plot Any Spoken Transcript on the Fluency vs. Coherence Spider Chart
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                Evaluates discourse markers, clause density, and speech pacing
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Examiner Prompt:
                </label>
                <input
                  type="text"
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Your Spoken Response Transcript:
                </label>
                <textarea
                  rows={3}
                  value={customTranscript}
                  onChange={(e) => setCustomTranscript(e.target.value)}
                  placeholder="Paste or type a spoken response here (e.g., 'In my view, university education is undergoing a paradigm shift because artificial intelligence automates routine grading, thereby allowing professors to focus on critical mentorship...')"
                  className="w-full p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end">
                <button
                  onClick={handleAnalyzeCustomSpeech}
                  disabled={isEvaluatingCustom}
                  className="px-5 py-2.5 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] disabled:bg-slate-400 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#F4A62A]" />
                  <span>
                    {isEvaluatingCustom
                      ? 'Computing 6-Axis Radar...'
                      : 'Generate Fluency vs. Coherence Spider Chart'}
                  </span>
                </button>
              </div>

              {(customTranscript.trim() || (selectedPresetId === 'live_session' && liveEvaluation?.candidateTranscript)) && (
                <SpeakingTranscriptHighlighter
                  transcript={
                    customTranscript.trim() ||
                    (selectedPresetId === 'live_session' && liveEvaluation?.candidateTranscript
                      ? liveEvaluation.candidateTranscript
                      : '')
                  }
                  contextLabel={customQuestion || 'Speaking Lab AI Radar Audit'}
                  onShowToast={onShowToast}
                />
              )}
            </div>
          </div>
        </div>
      ) : activeTab === 'shadowing' ? (
        <ShadowingPractice
          onShowToast={onShowToast}
          onNavigateToVault={onNavigateToVault}
        />
      ) : (
        <CueScratchpad
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
