import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Headphones,
  BookOpen,
  PenTool,
  Mic,
  ArrowRight,
  CheckCircle2,
  Volume2,
  Square,
  ShieldCheck,
  ChevronDown,
  Menu,
  X,
  FileText,
  Mail,
  RotateCcw,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { soundManager } from '../../utils/audioEffects';
import { BandSprintMark } from '../common/BandSprintMark';
import { loadExamSetup, saveExamSetup } from '../../services/examSetupService';
import { loadOnboardingSurvey, saveOnboardingSurvey, computeExamDateFromTimeline } from '../../services/onboardingSurveyStore';
import { EASE_EDITORIAL, SPRING_SNAPPY } from '../common/MotionPrimitives';

let loadedAudioService: typeof import('../../services/audioService')['audioService'] | null = null;
async function getAudioService() {
  if (!loadedAudioService) {
    const mod = await import('../../services/audioService');
    loadedAudioService = mod.audioService;
  }
  return loadedAudioService;
}

export interface PreLoginLandingProps {
  onOpenGoogleAuth: (mode?: 'signin' | 'register', targetRoute?: string) => void;
  onStartOnboardingSurvey?: (targetRoute?: string) => void;
  onPreviewExamRoom: () => void;
  onShowToast?: (msg: string) => void;
  onOpenLegal?: (tab: 'terms' | 'privacy') => void;
  onOpenContact?: () => void;
}

type PreviewTabId = 'listening' | 'reading' | 'writing' | 'speaking';

interface ListeningTurn {
  speaker: string;
  accent: string;
  line: string;
}

const LISTENING_SAMPLE_TURNS: ListeningTurn[] = [
  {
    speaker: 'Receptionist',
    accent: 'British RP',
    line: 'Good morning, Westford Community Library. Are you calling about the weekend archival workshop?'
  },
  {
    speaker: 'Applicant',
    accent: 'Candidate',
    line: 'Yes, hello. Does the session still begin at nine-thirty on Saturday morning?'
  },
  {
    speaker: 'Receptionist',
    accent: 'British RP',
    line: 'We originally listed nine-thirty on the flyer, but the lead curator moved registration to ten-fifteen in Room B14.'
  }
];

const SPEAKING_SAMPLE_PARTS = [
  {
    part: 'Part 1 · Introduction & Interview',
    examiner: 'Prof. Arthur Pendelton (British RP)',
    prompt: 'Let us talk about reading habits. Do you prefer reading printed books or digital articles on a screen, and why?',
    sampleResponse:
      'For deep academic study I strongly prefer printed texts because physical page layout aids spatial memory, whereas for daily international news I rely on digital editions.',
    rubricNote:
      'Lexical Resource (Band 8.0 est.): Uses precise collocations ("spatial memory", "deep academic study") and clear contrastive subordination ("whereas") without hesitation.'
  },
  {
    part: 'Part 2 · Individual Long Turn (Cue Card)',
    examiner: 'Dr. Clara Sterling (British RP)',
    prompt: 'Describe a skill you learned outside formal education that proved practical in your daily life. You have 1 minute to prepare and up to 2 minutes to speak.',
    sampleResponse:
      'A pivotal skill I acquired independently was touch-typing and structured note-taking during university lectures, which doubled my drafting speed for timed essays.',
    rubricNote:
      'Coherence & Cohesion (Band 8.0 est.): Establishes clear context immediately and links the learned skill directly to measurable academic outcomes.'
  },
  {
    part: 'Part 3 · Two-Way Abstract Discussion',
    examiner: 'Prof. Arthur Pendelton (British RP)',
    prompt: 'To what extent should universities prioritize practical workplace communication over traditional written examinations?',
    sampleResponse:
      'Rather than treating them as mutually exclusive, curricula should integrate analytical writing with collaborative oral defense so graduates can articulate complex findings clearly.',
    rubricNote:
      'Grammatical Range & Accuracy (Band 8.5 est.): Employs non-finite framing ("Rather than treating...") and balanced complex clauses accurately.'
  }
];

const SAMPLE_BAND6_DRAFT =
  'Many people think public transport should be free in big cities. Firstly, it will reduce traffic jams on the road because car drivers will take buses. Secondly, it is good for the environment and stops air pollution.';

const SAMPLE_BAND8_DRAFT =
  'Subsidizing municipal transit offers a pragmatic remedy for metropolitan gridlock. By eliminating fare barriers, commuters are incentivized to shift from private vehicles to high-capacity rail networks, thereby curbing particulate emissions and easing peak-hour congestion.';

const ACADEMIC_LINKERS = [
  'however', 'therefore', 'consequently', 'whereas', 'although', 'moreover',
  'furthermore', 'thereby', 'nevertheless', 'conversely', 'subsequently',
  'by eliminating', 'rather than', 'in contrast', 'as a result', 'notwithstanding'
];

function evaluateWritingParagraphLive(text: string) {
  const cleaned = text.trim();
  if (!cleaned) {
    return {
      words: 0,
      sentences: 0,
      uniqueRatio: 0,
      linkersFound: [] as string[],
      scores: { tr: 0, cc: 0, lr: 0, gra: 0, overall: 0 },
      summary: 'Type or paste an IELTS Task 2 paragraph above to see an instant heuristic rubric estimate.'
    };
  }

  const wordTokens: string[] = cleaned.toLowerCase().match(/[a-z']+/g) ?? [];
  const words = wordTokens.length;
  const sentences = cleaned.split(/[.!?]+/).filter((s) => s.trim().length > 3).length || 1;
  const avgWordsPerSentence = words / sentences;
  const uniqueWords = new Set(wordTokens.filter((w) => w.length > 3));
  const contentWords = wordTokens.filter((w) => w.length > 3).length || 1;
  const uniqueRatio = Math.round((uniqueWords.size / contentWords) * 100);
  const longWords = wordTokens.filter((w) => w.length >= 8).length;
  const lower = cleaned.toLowerCase();
  const linkersFound = ACADEMIC_LINKERS.filter((l) => lower.includes(l));
  const mechanicalLinkers = ['firstly', 'secondly', 'thirdly', 'lastly'].filter((l) => lower.includes(l));

  const clampBand = (val: number) => Math.round(Math.min(8.5, Math.max(4.5, val)) * 2) / 2;

  const tr = clampBand(5.0 + (words >= 35 ? 1.5 : words / 25) + (longWords >= 4 ? 1.0 : longWords * 0.2));
  const cc = clampBand(5.5 + linkersFound.length * 0.7 - mechanicalLinkers.length * 0.4 + (sentences >= 2 ? 0.5 : 0));
  const lr = clampBand(5.0 + (uniqueRatio >= 75 ? 1.5 : uniqueRatio / 60) + Math.min(1.5, longWords * 0.25));
  const gra = clampBand(5.0 + (avgWordsPerSentence >= 16 && avgWordsPerSentence <= 28 ? 2.0 : 1.0) + (lower.includes(',') ? 0.5 : 0));
  const overall = clampBand((tr + cc + lr + gra) / 4);

  let summary = '';
  if (overall >= 7.5) {
    summary = 'Strong lexical precision and organic cohesion. Inside BandSprint Writing Lab, AI evaluation also checks full essay structure, thesis consistency, and exact sentence rewrites.';
  } else if (mechanicalLinkers.length > 0) {
    summary = `Detected mechanical enumerators (${mechanicalLinkers.join(', ')}). Replacing them with causal subordination ("thereby", "whereas") typically lifts Coherence & Cohesion above Band 6.5.`;
  } else if (words < 25) {
    summary = 'Expand this paragraph with a clear causal mechanism or concrete example (aim for 45–80 words per body paragraph) to demonstrate Task Response depth.';
  } else {
    summary = 'Clear meaning, with room to upgrade everyday verbs into academic collocations and vary subordinate clauses for Band 7.5+.';
  }

  return {
    words,
    sentences,
    uniqueRatio,
    linkersFound,
    scores: { tr, cc, lr, gra, overall },
    summary
  };
}

const FAQ_ITEMS = [
  {
    question: 'What is included in the free BandSprint account?',
    answer:
      'Candidate Free (৳0 BDT) includes the 10-minute 4-skill diagnostic test, a personalised daily study plan, 5 full original mock tests, the full Learn hub (Vocabulary with বাংলা meanings, Grammar Lab, Idioms & Phrases, Collocations, Spelling Lab, Bangla IELTS Guide, Beginner 101), 2 AI Speaking evaluations per day, and 1 AI Writing evaluation per day.'
  },
  {
    question: 'Does BandSprint support both Academic and General Training formats?',
    answer:
      'Yes. Inside your workspace you can switch between IELTS Academic and General Training modes. Academic mode focuses on Task 1 data/diagram reports and academic reading passages, while General Training provides Task 1 letter prompts and workplace/social reading texts.'
  },
  {
    question: 'How are Writing and Speaking responses evaluated?',
    answer:
      'Writing submissions and Speaking transcripts are analyzed against the four IELTS assessment criteria: Task Achievement / Task Response (or Fluency & Coherence in Speaking), Coherence & Cohesion, Lexical Resource, and Grammatical Range & Accuracy. You receive criterion-level estimates, grammar fixes, and model revisions.'
  },
  {
    question: 'How do the bilingual English and বাংলা explanations work?',
    answer:
      'Reading and Listening practice sets include distractor analysis in both English and বাংলা so candidates in Bangladesh can quickly identify why a trap answer (such as a time reversal, negation shift, or qualifier mismatch) is wrong, alongside B2–C2 vocabulary meanings.'
  },
  {
    question: 'Is BandSprint affiliated with Cambridge, the British Council, or IDP?',
    answer:
      'No. BandSprint is an independent exam preparation platform. All mocks are original Cambridge-style practice simulations — not the official IELTS test. BandSprint is not affiliated with Cambridge, British Council, or IDP.'
  }
];

export const PreLoginLanding: React.FC<PreLoginLandingProps> = ({
  onOpenGoogleAuth,
  onStartOnboardingSurvey,
  onPreviewExamRoom,
  onShowToast,
  onOpenLegal,
  onOpenContact
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Interactive Hero Band-Gap Planner state (IELTSly.ai + TestGlider style)
  const [plannerTrack, setPlannerTrack] = useState<'Academic' | 'General Training'>('Academic');
  const [currentBand, setCurrentBand] = useState<number>(6.0);
  const [targetBand, setTargetBand] = useState<number>(7.5);
  const [dailyMinutes, setDailyMinutes] = useState<30 | 60 | 90>(60);

  // Interactive 4-Skill Sandbox state
  const [activePreviewTab, setActivePreviewTab] = useState<PreviewTabId>('writing');
  const [selectedListeningAnswer, setSelectedListeningAnswer] = useState<string>('10:15 AM');
  const [isPlayingSampleAudio, setIsPlayingSampleAudio] = useState(false);
  const [selectedReadingAnswer, setSelectedReadingAnswer] = useState<'TRUE' | 'FALSE' | 'NOT GIVEN'>('FALSE');
  const [showReadingEvidence, setShowReadingEvidence] = useState(true);
  const [writingDraftMode, setWritingDraftMode] = useState<'band6' | 'band8' | 'custom'>('band8');
  const [customParagraph, setCustomParagraph] = useState<string>(SAMPLE_BAND8_DRAFT);
  const [selectedSpeakingPartIndex, setSelectedSpeakingPartIndex] = useState<number>(0);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Calculated study plan blueprint for the hero planner
  const studyBlueprint = useMemo(() => {
    const effectiveTarget = Math.max(currentBand + 0.5, targetBand);
    const bandGap = Math.max(0.5, Number((effectiveTarget - currentBand).toFixed(1)));
    // Practical study estimate: ~28 focused hours per +0.5 band step
    const totalHours = Math.round((bandGap / 0.5) * 28);
    const weeklyHours = (dailyMinutes * 6) / 60; // 6 study days/week
    const estimatedWeeks = Math.max(2, Math.min(24, Math.ceil(totalHours / weeklyHours)));

    const skillSplit =
      plannerTrack === 'Academic'
        ? [
            { skill: 'Writing (Task 1 & 2)', pct: 32, mins: Math.round(dailyMinutes * 0.32) },
            { skill: 'Reading (Academic)', pct: 26, mins: Math.round(dailyMinutes * 0.26) },
            { skill: 'Speaking (Parts 1–3)', pct: 22, mins: Math.round(dailyMinutes * 0.22) },
            { skill: 'Listening (Sections 1–4)', pct: 20, mins: Math.round(dailyMinutes * 0.2) }
          ]
        : [
            { skill: 'Writing (Letters & Essays)', pct: 30, mins: Math.round(dailyMinutes * 0.3) },
            { skill: 'Speaking (Parts 1–3)', pct: 28, mins: Math.round(dailyMinutes * 0.28) },
            { skill: 'Listening (Sections 1–4)', pct: 22, mins: Math.round(dailyMinutes * 0.22) },
            { skill: 'Reading (General)', pct: 20, mins: Math.round(dailyMinutes * 0.2) }
          ];

    return {
      effectiveTarget,
      bandGap,
      estimatedWeeks,
      weeklyHours: Number(weeklyHours.toFixed(1)),
      skillSplit
    };
  }, [currentBand, targetBand, dailyMinutes, plannerTrack]);

  // Live Writing paragraph evaluation
  const activeWritingText =
    writingDraftMode === 'band6'
      ? SAMPLE_BAND6_DRAFT
      : writingDraftMode === 'band8'
      ? SAMPLE_BAND8_DRAFT
      : customParagraph;

  const liveWritingEval = useMemo(
    () => evaluateWritingParagraphLive(activeWritingText),
    [activeWritingText]
  );

  const stopSampleAudio = useCallback(() => {
    try {
      loadedAudioService?.stop();
    } catch {
      // Ignore audio stop errors
    }
    setIsPlayingSampleAudio(false);
  }, []);

  useEffect(() => {
    return () => {
      stopSampleAudio();
    };
  }, [stopSampleAudio]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handlePlayListeningSample = async () => {
    soundManager.playBeep(560, 0.03);
    if (isPlayingSampleAudio) {
      stopSampleAudio();
      return;
    }
    setIsPlayingSampleAudio(true);
    try {
      const sampleScript = LISTENING_SAMPLE_TURNS.map((t) => t.line).join(' ');
      const svc = await getAudioService();
      await svc.speakText(sampleScript, 'speaker_05');
    } catch {
      onShowToast?.('Audio preview requires browser speech synthesis support.');
    } finally {
      setIsPlayingSampleAudio(false);
    }
  };

  const handlePlaySpeakingPrompt = async () => {
    soundManager.playBeep(560, 0.03);
    if (isPlayingSampleAudio) {
      stopSampleAudio();
      return;
    }
    setIsPlayingSampleAudio(true);
    try {
      const currentPart = SPEAKING_SAMPLE_PARTS[selectedSpeakingPartIndex];
      const speakerId = selectedSpeakingPartIndex === 1 ? 'speaker_05' : 'speaker_01';
      const svc = await getAudioService();
      await svc.speakText(currentPart.prompt, speakerId);
    } catch {
      onShowToast?.('Audio preview requires browser speech synthesis support.');
    } finally {
      setIsPlayingSampleAudio(false);
    }
  };

  const handleSignInClick = (targetRoute: string = '/') => {
    soundManager.playBeep(580, 0.04);
    setMobileMenuOpen(false);
    stopSampleAudio();
    onOpenGoogleAuth('signin', targetRoute);
  };

  const handleStartFreeClick = (targetRoute: string = '/') => {
    soundManager.playBeep(640, 0.04);
    setMobileMenuOpen(false);
    stopSampleAudio();
    if (onStartOnboardingSurvey) {
      onStartOnboardingSurvey(targetRoute);
    } else {
      onOpenGoogleAuth('register', targetRoute);
    }
  };

  const handleLockPlannerAndStart = () => {
    try {
      const existing = loadExamSetup();
      saveExamSetup({
        ...existing,
        examMode: plannerTrack,
        targetBand: studyBlueprint.effectiveTarget
      });
      const existingSurvey = loadOnboardingSurvey();
      const mappedDaily: 15 | 30 | 45 | 60 = dailyMinutes <= 30 ? 30 : 60;
      const timeline = existingSurvey?.examTimeline || '60_days';
      saveOnboardingSurvey({
        purpose: existingSurvey?.purpose || (plannerTrack === 'General Training' ? 'immigration_pr' : 'study_abroad'),
        examTrack: plannerTrack,
        currentBand,
        targetBand: studyBlueprint.effectiveTarget,
        weakestSkill: existingSurvey?.weakestSkill || 'speaking',
        coachingPainPoint: existingSurvey?.coachingPainPoint || 'slow_feedback',
        examTimeline: timeline,
        examDate: existingSurvey?.examDate || computeExamDateFromTimeline(timeline),
        dailyMinutes: mappedDaily,
        completedAt: Date.now()
      });
    } catch {
      // Non-fatal in private mode
    }
    handleStartFreeClick('/learn/diagnostic');
  };

  const handleLegalClick = (tab: 'terms' | 'privacy') => {
    soundManager.playBeep(520, 0.03);
    if (onOpenLegal) {
      onOpenLegal(tab);
    } else {
      window.dispatchEvent(new CustomEvent('open_legal_modal', { detail: tab }));
    }
  };

  const handleContactClick = () => {
    soundManager.playBeep(520, 0.03);
    if (onOpenContact) {
      onOpenContact();
    } else {
      window.dispatchEvent(new CustomEvent('open_contact_modal'));
    }
  };

  const focusRing =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C45] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F9F8]';

  return (
    <div className="min-h-screen bg-[#F7F9F8] text-[#0E1F1E] font-sans selection:bg-[#0F4C45] selection:text-white overflow-x-hidden">
      {/* =====================================================================
          1. CLEAN 3-ZONE TOP BAR
      ===================================================================== */}
      <header className="sticky top-0 z-40 border-b border-[#D3DDDA] bg-[#F7F9F8]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[72px] flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#top"
            className={`inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 rounded-lg py-1 ${focusRing}`}
            aria-label="BandSprint Home"
          >
            <BandSprintMark size={30} />
            <span className="font-display text-lg font-bold tracking-tight text-[#0E1F1E] whitespace-nowrap">
              BandSprint
            </span>
          </a>

          {/* Zone 2: Concise Single-Line Navigation Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#566664]"
          >
            <a
              href="#practice"
              className={`hover:text-[#0E1F1E] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${focusRing}`}
            >
              Live Demo
            </a>
            <a
              href="#how-it-works"
              className={`hover:text-[#0E1F1E] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${focusRing}`}
            >
              How It Works
            </a>
            <a
              href="#library"
              className={`hover:text-[#0E1F1E] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${focusRing}`}
            >
              Library
            </a>
            <a
              href="#why-bandsprint"
              className={`hover:text-[#0E1F1E] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${focusRing}`}
            >
              vs. Coaching
            </a>
            <a
              href="#pricing"
              className={`hover:text-[#0E1F1E] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${focusRing}`}
            >
              Plans
            </a>
          </nav>

          {/* Zone 3: Clear Pre-Login Account Actions (Log in + Start free) */}
          <div className="hidden md:flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => handleSignInClick('/')}
              className={`min-h-[42px] px-4 py-2 rounded-xl border border-[#D3DDDA] bg-white hover:bg-[#EEF3F1] text-[#0E1F1E] text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${focusRing}`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => handleStartFreeClick('/')}
              className={`min-h-[42px] px-5 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${focusRing}`}
            >
              <span>Start free</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </div>

          {/* Mobile Compact Controls */}
          <div className="flex md:hidden items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleSignInClick('/')}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold text-[#0E1F1E] border border-[#D3DDDA] bg-white whitespace-nowrap ${focusRing}`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-drawer"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border border-[#D3DDDA] bg-white text-[#0E1F1E] ${focusRing}`}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <nav
            id="mobile-nav-drawer"
            aria-label="Mobile Navigation"
            className="md:hidden border-t border-[#D3DDDA] bg-white px-4 pt-3 pb-5 space-y-3"
          >
            <div className="grid grid-cols-1 gap-1">
              {[
                { label: 'Live Feedback Demo', href: '#practice' },
                { label: 'How It Works', href: '#how-it-works' },
                { label: 'Free Learning Library', href: '#library' },
                { label: 'BandSprint vs. Coaching', href: '#why-bandsprint' },
                { label: 'Plans & Access', href: '#pricing' },
                { label: 'FAQ', href: '#faq' }
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-[#0E1F1E] hover:bg-[#EEF3F1] ${focusRing}`}
                >
                  <span>{item.label}</span>
                  <ArrowRight className="w-4 h-4 text-[#566664]" />
                </a>
              ))}
            </div>
            <div className="pt-2 border-t border-[#D3DDDA] grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleSignInClick('/')}
                className={`min-h-[44px] w-full rounded-xl border border-[#D3DDDA] bg-[#F7F9F8] text-[#0E1F1E] text-sm font-semibold ${focusRing}`}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => handleStartFreeClick('/')}
                className={`min-h-[44px] w-full rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-sm font-semibold flex items-center justify-center gap-1.5 ${focusRing}`}
              >
                <span>Start free</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </nav>
        )}
      </header>

      <main id="top">
        {/* =====================================================================
            2. HERO SECTION + INTERACTIVE BAND-GAP PLANNER
        ===================================================================== */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-16 sm:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            {/* Left Column: Value Proposition & Primary Actions */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, ease: EASE_EDITORIAL }}
              className="lg:col-span-7 flex flex-col justify-center space-y-6"
            >
              <p className="text-xs sm:text-sm font-medium text-[#0F4C45]">
                Academic &amp; General Training · Computer-Delivered Practice · English &amp; বাংলা
              </p>

              <h1
                className="font-display font-bold tracking-tight text-[#0E1F1E] leading-[1.08] max-w-2xl"
                style={{ fontSize: 'clamp(2.25rem, 4.4vw, 3.65rem)', textWrap: 'balance' }}
              >
                Aim for Band 9. Know what to fix next.
              </h1>

              <p className="text-[#566664] text-base sm:text-lg leading-relaxed max-w-xl">
                Take a real 10-minute diagnostic across Listening, Reading, Writing, and Speaking. Get a study plan built around your weakest skill, then practise daily with rubric feedback and বাংলা trap explanations.
              </p>

              {/* Primary & Secondary CTAs */}
              <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 max-w-xl">
                <button
                  type="button"
                  onClick={() => handleStartFreeClick('/')}
                  className={`min-h-[52px] px-6 py-3.5 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white font-semibold text-sm sm:text-base transition-colors flex items-center justify-center gap-2.5 whitespace-nowrap cursor-pointer ${focusRing}`}
                >
                  <span>Create my free account</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>

                <a
                  href="#practice"
                  className={`min-h-[52px] px-5 py-3.5 rounded-xl bg-white hover:bg-[#EEF3F1] text-[#0E1F1E] font-semibold text-sm sm:text-base border border-[#D3DDDA] transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${focusRing}`}
                >
                  <span>Try the feedback demo</span>
                </a>
              </div>

              {/* Honest Free-Tier Clarity */}
              <div className="space-y-2 pt-1">
                <p className="text-sm text-[#0E1F1E]">
                  <span className="font-semibold text-[#0F4C45]">Free — no card needed:</span>{' '}
                  5 full mock tests, 10-minute diagnostic, 2 AI Speaking + 1 AI Writing evaluation every day.
                </p>
                <p className="text-xs sm:text-sm text-[#566664]">
                  <button
                    type="button"
                    onClick={() => handleStartFreeClick('/learn/diagnostic')}
                    className={`font-semibold text-[#0F4C45] hover:underline underline-offset-4 cursor-pointer ${focusRing}`}
                  >
                    Take the free 10-minute diagnostic →
                  </button>{' '}
                  Start with your real baseline across all four skills instead of guessing what to study.
                </p>
              </div>

              {/* Clean Typographic Capability Summary (No pill chips, no nested boxes) */}
              <div className="pt-5 border-t border-[#D3DDDA] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm text-[#566664]">
                <div>
                  <div className="font-semibold text-[#0E1F1E]">5 Full Mock Sets</div>
                  <div className="mt-0.5">40-question Listening &amp; timed Reading rooms</div>
                </div>
                <div>
                  <div className="font-semibold text-[#0E1F1E]">4-Criteria Rubrics</div>
                  <div className="mt-0.5">TA/TR, Coherence, Lexical &amp; Grammar feedback</div>
                </div>
                <div>
                  <div className="font-semibold text-[#0E1F1E]">English + বাংলা Clarity</div>
                  <div className="mt-0.5">Trap explanations &amp; B2–C2 vocabulary decks</div>
                </div>
              </div>
            </motion.div>

            {/* Right Column: Interactive Live Band-Gap Study Planner */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.46, delay: 0.1, ease: EASE_EDITORIAL }}
              className="lg:col-span-5 flex"
            >
              <div className="w-full rounded-2xl bg-white border border-[#D3DDDA] p-5 sm:p-6 flex flex-col justify-between gap-5">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3 border-b border-[#EEF3F1] pb-4">
                    <div>
                      <p className="text-xs font-medium text-[#566664]">Interactive Study Planner</p>
                      <h2 className="font-display text-lg sm:text-xl font-bold text-[#0E1F1E] mt-0.5">
                        Preview your path to Band {studyBlueprint.effectiveTarget.toFixed(1)}
                      </h2>
                    </div>
                    <span className="font-mono text-xs font-semibold text-[#0F4C45] tabular-nums whitespace-nowrap pt-1">
                      +{studyBlueprint.bandGap.toFixed(1)} gap
                    </span>
                  </div>

                  {/* Track Segmented Selector */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#566664]">Test Track</label>
                    <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#EEF3F1]">
                      {(['Academic', 'General Training'] as const).map((track) => (
                        <button
                          key={track}
                          type="button"
                          onClick={() => {
                            soundManager.playBeep(520, 0.02);
                            setPlannerTrack(track);
                          }}
                          className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${focusRing} ${
                            plannerTrack === track
                              ? 'bg-white text-[#0E1F1E] shadow-2xs'
                              : 'text-[#566664] hover:text-[#0E1F1E]'
                          }`}
                        >
                          {track}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Current vs Target Band Controls */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label htmlFor="planner-current" className="block text-xs font-semibold text-[#566664]">
                        Current Band
                      </label>
                      <select
                        id="planner-current"
                        value={currentBand}
                        onChange={(e) => {
                          const next = Number(e.target.value);
                          setCurrentBand(next);
                          if (targetBand <= next) {
                            setTargetBand(Math.min(9.0, next + 0.5));
                          }
                        }}
                        className={`w-full min-h-[42px] px-3 rounded-xl border border-[#D3DDDA] bg-[#F7F9F8] text-sm font-mono font-semibold text-[#0E1F1E] tabular-nums cursor-pointer ${focusRing}`}
                      >
                        {[5.0, 5.5, 6.0, 6.5, 7.0, 7.5].map((b) => (
                          <option key={b} value={b}>
                            Band {b.toFixed(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="planner-target" className="block text-xs font-semibold text-[#566664]">
                        Target Band
                      </label>
                      <select
                        id="planner-target"
                        value={studyBlueprint.effectiveTarget}
                        onChange={(e) => setTargetBand(Number(e.target.value))}
                        className={`w-full min-h-[42px] px-3 rounded-xl border border-[#D3DDDA] bg-[#F7F9F8] text-sm font-mono font-semibold text-[#0F4C45] tabular-nums cursor-pointer ${focusRing}`}
                      >
                        {[6.5, 7.0, 7.5, 8.0, 8.5, 9.0]
                          .filter((b) => b > currentBand)
                          .map((b) => (
                            <option key={b} value={b}>
                              Band {b.toFixed(1)}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Daily Time Selector */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#566664]">Daily Study Time</label>
                    <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#EEF3F1]">
                      {([30, 60, 90] as const).map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => {
                            soundManager.playBeep(520, 0.02);
                            setDailyMinutes(mins);
                          }}
                          className={`min-h-[38px] px-2 py-1.5 rounded-lg text-xs font-semibold font-mono tabular-nums transition-colors whitespace-nowrap cursor-pointer ${focusRing} ${
                            dailyMinutes === mins
                              ? 'bg-white text-[#0E1F1E] shadow-2xs'
                              : 'text-[#566664] hover:text-[#0E1F1E]'
                          }`}
                        >
                          {mins} min/day
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Live Calculated Study Estimate */}
                  <div className="pt-3 border-t border-[#EEF3F1] space-y-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold text-[#566664]">Estimated prep pace</span>
                      <span className="font-mono text-sm font-bold text-[#0E1F1E] tabular-nums">
                        ~{studyBlueprint.estimatedWeeks} weeks · {studyBlueprint.weeklyHours} hrs/wk
                      </span>
                    </div>

                    <div className="space-y-2">
                      {studyBlueprint.skillSplit.map((row) => (
                        <div key={row.skill} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#0E1F1E] font-medium">{row.skill}</span>
                            <span className="font-mono text-[#566664] tabular-nums">{row.mins} min/day</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[#EEF3F1] overflow-hidden">
                            <div
                              className="h-full bg-[#0F4C45] rounded-full transition-all duration-300"
                              style={{ width: `${row.pct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleLockPlannerAndStart}
                    className={`min-h-[46px] w-full px-4 py-2.5 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer ${focusRing}`}
                  >
                    <span>Lock in this plan with 10-min diagnostic</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                  <p className="text-[11px] text-[#566664] text-center">
                    Planning estimate only · Exact allocation adapts after your 4-skill diagnostic.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* =====================================================================
            3. INTERACTIVE 4-SKILL LIVE FEEDBACK SANDBOX
        ===================================================================== */}
        <section id="practice" className="py-16 sm:py-24 border-t border-[#D3DDDA] bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2 max-w-2xl">
                <p className="text-xs font-semibold text-[#0F4C45]">
                  Interactive Feedback Sandbox · No account required
                </p>
                <h2 className="font-display text-2xl sm:text-4xl font-bold text-[#0E1F1E] tracking-tight">
                  Test all four IELTS modules before you sign up
                </h2>
              </div>
              <p className="text-sm text-[#566664] max-w-md">
                Try live Writing rubric scoring on your own paragraph, play British Listening &amp; Speaking prompts, or inspect split-screen Reading evidence.
              </p>
            </div>

            {/* Clean Segmented Module Switcher */}
            <div
              role="tablist"
              aria-label="IELTS Module Preview Switcher"
              className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 rounded-2xl bg-[#EEF3F1] border border-[#D3DDDA]"
            >
              {[
                { id: 'writing' as PreviewTabId, label: 'Writing', sub: 'Live Rubric Check', icon: PenTool },
                { id: 'listening' as PreviewTabId, label: 'Listening', sub: 'Trap Audio Drill', icon: Headphones },
                { id: 'reading' as PreviewTabId, label: 'Reading', sub: 'Evidence & TFNG', icon: BookOpen },
                { id: 'speaking' as PreviewTabId, label: 'Speaking', sub: 'Examiner Prompts', icon: Mic }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activePreviewTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`preview-tab-${tab.id}`}
                    aria-selected={isActive}
                    aria-controls={`preview-panel-${tab.id}`}
                    onClick={() => {
                      soundManager.playBeep(540, 0.03);
                      stopSampleAudio();
                      setActivePreviewTab(tab.id);
                    }}
                    className={`relative min-h-[52px] px-3.5 py-2.5 rounded-xl text-left transition-colors flex items-center gap-3 cursor-pointer ${focusRing} ${
                      isActive
                        ? 'text-white'
                        : 'bg-transparent text-[#0E1F1E] hover:bg-white/70'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="landing-preview-active-tab"
                        transition={SPRING_SNAPPY}
                        className="absolute inset-0 rounded-xl bg-[#0F4C45]"
                        aria-hidden="true"
                      />
                    )}
                    <Icon className={`relative z-10 w-4 h-4 shrink-0 ${isActive ? 'text-[#F4A62A]' : 'text-[#0F4C45]'}`} />
                    <div className="relative z-10 min-w-0">
                      <div className="text-xs sm:text-sm font-semibold truncate">{tab.label}</div>
                      <div className={`text-[11px] truncate ${isActive ? 'text-[#EEF3F1]/80' : 'text-[#566664]'}`}>
                        {tab.sub}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Sandbox Panel */}
            <div
              id={`preview-panel-${activePreviewTab}`}
              role="tabpanel"
              aria-labelledby={`preview-tab-${activePreviewTab}`}
              className="rounded-2xl bg-[#F7F9F8] border border-[#D3DDDA] overflow-hidden"
            >
              {/* Sub-header */}
              <div className="px-4 sm:px-6 py-3.5 bg-white border-b border-[#D3DDDA] flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="text-[#566664] font-medium">
                  <span className="font-semibold text-[#0E1F1E]">Interactive Preview</span>
                  <span aria-hidden="true" className="mx-2">·</span>
                  <span>
                    {activePreviewTab === 'writing' && 'Writing Task 2 · Live 4-Criteria Rubric Estimator'}
                    {activePreviewTab === 'listening' && 'Section 1 · Library Archival Workshop Dialogue'}
                    {activePreviewTab === 'reading' && 'Academic Passage 1 · TRUE / FALSE / NOT GIVEN'}
                    {activePreviewTab === 'speaking' && 'Speaking Parts 1–3 · British Examiner Prompts'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onPreviewExamRoom}
                  className={`font-semibold text-[#0F4C45] hover:underline underline-offset-4 inline-flex items-center gap-1 whitespace-nowrap cursor-pointer ${focusRing}`}
                >
                  <span>Open full exam simulator</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* TAB BODY WITH SMOOTH CROSS-FADE */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePreviewTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: EASE_EDITORIAL }}
                >
              {/* TAB 1: LIVE INTERACTIVE WRITING SANDBOX */}
              {activePreviewTab === 'writing' && (
                <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#566664]">
                        Prompt: Should public transport be free in major cities?
                      </span>
                      <div className="inline-flex rounded-xl bg-[#EEF3F1] p-1 border border-[#D3DDDA]">
                        {[
                          { id: 'band6' as const, label: 'Band 6.0 Draft' },
                          { id: 'band8' as const, label: 'Band 8.0 Revision' },
                          { id: 'custom' as const, label: 'Write Your Own' }
                        ].map((mode) => (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => {
                              setWritingDraftMode(mode.id);
                              if (mode.id === 'custom' && !customParagraph.trim()) {
                                setCustomParagraph(SAMPLE_BAND6_DRAFT);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${focusRing} ${
                              writingDraftMode === mode.id
                                ? 'bg-white text-[#0E1F1E] shadow-2xs'
                                : 'text-[#566664] hover:text-[#0E1F1E]'
                            }`}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {writingDraftMode === 'custom' ? (
                      <div className="space-y-2">
                        <textarea
                          value={customParagraph}
                          onChange={(e) => setCustomParagraph(e.target.value)}
                          rows={6}
                          placeholder="Write or paste a Task 2 body paragraph here to test live rubric scoring..."
                          className={`w-full p-4 rounded-xl bg-white border border-[#D3DDDA] text-sm text-[#0E1F1E] leading-relaxed resize-y ${focusRing}`}
                        />
                        <div className="flex items-center justify-between text-xs text-[#566664]">
                          <span className="font-mono tabular-nums">
                            {liveWritingEval.words} words · {liveWritingEval.sentences} sentences · {liveWritingEval.uniqueRatio}% lexical variety
                          </span>
                          <button
                            type="button"
                            onClick={() => setCustomParagraph(SAMPLE_BAND6_DRAFT)}
                            className="inline-flex items-center gap-1 text-[#0F4C45] font-semibold hover:underline cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reset sample</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-5 rounded-xl bg-white border border-[#D3DDDA] space-y-3">
                        <div className="flex items-center justify-between text-xs text-[#566664]">
                          <span className="font-semibold text-[#0F4C45]">
                            {writingDraftMode === 'band8'
                              ? 'Rubric-Upgraded Excerpt · C1 Lexical Precision'
                              : 'Candidate Draft · Mechanical Linking & General Lexis'}
                          </span>
                          <span className="font-mono tabular-nums">{liveWritingEval.words} words</span>
                        </div>
                        <p className="text-sm sm:text-base text-[#0E1F1E] leading-relaxed">
                          “{activeWritingText}”
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomParagraph(activeWritingText);
                            setWritingDraftMode('custom');
                          }}
                          className="text-xs font-semibold text-[#0F4C45] hover:underline cursor-pointer"
                        >
                          Edit this paragraph to watch the band breakdown update →
                        </button>
                      </div>
                    )}

                    <p className="text-xs text-[#566664] leading-relaxed">
                      Local heuristic preview for instant testing. Inside your free account, AI Writing Lab evaluates full Task 1 &amp; Task 2 essays with line-by-line grammar corrections and Band 9 rewrites.
                    </p>
                  </div>

                  {/* Right: Live 4-Criteria Score Breakdown */}
                  <div className="lg:col-span-5 p-5 rounded-xl bg-white border border-[#D3DDDA] flex flex-col justify-between gap-4">
                    <div className="space-y-4">
                      <div className="flex items-baseline justify-between border-b border-[#EEF3F1] pb-3">
                        <div>
                          <div className="text-xs font-semibold text-[#566664]">Estimated Paragraph Band</div>
                          <div className="text-[11px] text-[#566664] mt-0.5">Live heuristic preview</div>
                        </div>
                        <div className="font-mono text-2xl font-bold text-[#0F4C45] tabular-nums">
                          {liveWritingEval.scores.overall > 0 ? liveWritingEval.scores.overall.toFixed(1) : '—'}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { code: 'TR', label: 'Task Response', score: liveWritingEval.scores.tr },
                          { code: 'CC', label: 'Coherence', score: liveWritingEval.scores.cc },
                          { code: 'LR', label: 'Lexical Resource', score: liveWritingEval.scores.lr },
                          { code: 'GRA', label: 'Grammar Range', score: liveWritingEval.scores.gra }
                        ].map((crit) => (
                          <div key={crit.code} className="p-3 rounded-xl bg-[#F7F9F8] border border-[#EEF3F1]">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-semibold text-[#566664]">{crit.code}</span>
                              <span className="font-mono text-sm font-bold text-[#0E1F1E] tabular-nums">
                                {crit.score > 0 ? crit.score.toFixed(1) : '—'}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#566664] mt-1">{crit.label}</div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-[#EEF3F1] space-y-1.5">
                        <div className="text-xs font-semibold text-[#0E1F1E]">Diagnostic Feedback</div>
                        <p className="text-xs text-[#566664] leading-relaxed">{liveWritingEval.summary}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartFreeClick('/practice/writing')}
                      className={`min-h-[44px] w-full px-4 py-2.5 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer ${focusRing}`}
                    >
                      <span>Get 1 free full AI essay evaluation daily</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: LISTENING PREVIEW */}
              {activePreviewTab === 'listening' && (
                <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-white border border-[#D3DDDA]">
                      <div>
                        <div className="text-sm font-semibold text-[#0E1F1E]">Multi-Speaker Dialogue Preview</div>
                        <div className="text-xs text-[#566664]">
                          Listen for the speaker’s self-correction — a classic Section 1 distractor.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handlePlayListeningSample}
                        className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${focusRing} ${
                          isPlayingSampleAudio
                            ? 'bg-rose-700 hover:bg-rose-800 text-white'
                            : 'bg-[#0F4C45] hover:bg-[#0B3833] text-white'
                        }`}
                      >
                        {isPlayingSampleAudio ? (
                          <>
                            <Square className="w-3.5 h-3.5 fill-current" />
                            <span>Stop Audio</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-4 h-4" />
                            <span>Play Dialogue</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="divide-y divide-[#EEF3F1] rounded-xl bg-white border border-[#D3DDDA] overflow-hidden">
                      {LISTENING_SAMPLE_TURNS.map((turn, idx) => (
                        <div key={idx} className="p-4 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-[#0F4C45]">{turn.speaker}</span>
                            <span className="font-mono text-[#566664]">{turn.accent}</span>
                          </div>
                          <p className="text-sm text-[#0E1F1E] leading-relaxed">“{turn.line}”</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-5 p-5 rounded-xl bg-white border border-[#D3DDDA] space-y-4">
                    <div className="space-y-1">
                      <p className="text-xs font-mono text-[#566664]">Question 1 · Note Completion</p>
                      <h3 className="text-base font-bold text-[#0E1F1E]">
                        What time does Saturday registration actually begin?
                      </h3>
                    </div>

                    <div className="space-y-2">
                      {['9:30 AM (Original Flyer Time)', '10:15 AM (Revised Curator Time)', '11:00 AM'].map((option) => {
                        const shortVal = option.split(' ')[0] + ' ' + option.split(' ')[1];
                        const isSelected = selectedListeningAnswer === shortVal;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              soundManager.playBeep(520, 0.02);
                              setSelectedListeningAnswer(shortVal);
                            }}
                            className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-left text-sm font-medium border transition-colors flex items-center justify-between cursor-pointer ${focusRing} ${
                              isSelected
                                ? 'bg-[#EEF3F1] border-[#0F4C45] text-[#0E1F1E] font-semibold'
                                : 'bg-[#F7F9F8] border-[#D3DDDA] text-[#566664] hover:border-[#0F4C45]/50'
                            }`}
                          >
                            <span>{option}</span>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-[#0F4C45] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-3 border-t border-[#EEF3F1] space-y-1.5 text-xs">
                      <div className="font-semibold text-[#0E1F1E]">
                        {selectedListeningAnswer === '10:15 AM'
                          ? 'Correct — 10:15 AM avoids the self-correction trap.'
                          : 'Trap alert — 9:30 AM was superseded by the speaker.'}
                      </div>
                      <p className="text-[#566664] leading-relaxed">
                        In Section 1, speakers often mention an initial time or fee before revising it immediately afterward.
                      </p>
                      <p className="text-[#0F4C45] leading-relaxed font-medium">
                        বাংলা ব্যাখ্যা: ফ্লায়ারে ৯:৩০ লেখা থাকলেও কিউরেটর সময় পরিবর্তন করে ১০:১৫ করেছেন। তাই সঠিক উত্তর ১০:১৫।
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: READING PREVIEW */}
              {activePreviewTab === 'reading' && (
                <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 p-5 rounded-xl bg-white border border-[#D3DDDA] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#566664]">
                        Academic Reading Passage Excerpt
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowReadingEvidence((prev) => !prev)}
                        className={`min-h-[36px] text-xs font-semibold px-3 py-1 rounded-lg border transition-colors cursor-pointer ${focusRing} ${
                          showReadingEvidence
                            ? 'bg-[#FEF6E8] border-[#F4A62A] text-[#0E1F1E]'
                            : 'bg-[#F7F9F8] border-[#D3DDDA] text-[#566664]'
                        }`}
                      >
                        {showReadingEvidence ? 'Evidence Highlight: On' : 'Evidence Highlight: Off'}
                      </button>
                    </div>
                    <h3 className="font-display text-lg font-bold text-[#0E1F1E]">
                      Urban Micro-Climate Regulation in Early Stone Architecture
                    </h3>
                    <p className="text-sm text-[#566664] leading-relaxed">
                      Throughout the nineteenth century, municipal engineers assumed that dense limestone facades merely trapped solar radiation. However, archival thermal measurements from 1894 demonstrate that{' '}
                      <span
                        className={
                          showReadingEvidence
                            ? 'bg-[#FEF6E8] text-[#0E1F1E] px-1 py-0.5 rounded font-medium'
                            : 'text-[#0E1F1E]'
                        }
                      >
                        ventilated courtyard corridors reduced midday interior temperatures by up to four degrees Celsius compared with open boulevard structures, though night-time heat retention remained unchanged.
                      </span>
                    </p>
                  </div>

                  <div className="lg:col-span-5 p-5 rounded-xl bg-white border border-[#D3DDDA] space-y-4">
                    <div className="space-y-1">
                      <p className="text-xs font-mono text-[#566664]">Question 7 · TRUE / FALSE / NOT GIVEN</p>
                      <p className="text-sm font-semibold text-[#0E1F1E] leading-snug">
                        “Ventilated courtyard corridors lowered both midday and night-time temperatures inside stone buildings.”
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {(['TRUE', 'FALSE', 'NOT GIVEN'] as const).map((choice) => {
                        const isSelected = selectedReadingAnswer === choice;
                        return (
                          <button
                            key={choice}
                            type="button"
                            onClick={() => {
                              soundManager.playBeep(520, 0.02);
                              setSelectedReadingAnswer(choice);
                            }}
                            className={`min-h-[44px] px-2.5 py-2 rounded-xl font-mono text-xs font-semibold border transition-colors cursor-pointer ${focusRing} ${
                              isSelected
                                ? 'bg-[#0F4C45] text-white border-[#0F4C45]'
                                : 'bg-[#F7F9F8] text-[#0E1F1E] border-[#D3DDDA] hover:border-[#0F4C45]/50'
                            }`}
                          >
                            {choice}
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-3 border-t border-[#EEF3F1] space-y-1.5 text-xs">
                      <div className="font-semibold text-[#0E1F1E]">
                        {selectedReadingAnswer === 'FALSE'
                          ? 'Correct — FALSE (Direct Contradiction)'
                          : 'Check the qualifier — why the answer is FALSE'}
                      </div>
                      <p className="text-[#566664] leading-relaxed">
                        Midday temperatures dropped, but the passage states explicitly that{' '}
                        <strong className="text-[#0E1F1E]">night-time heat retention remained unchanged</strong>.
                      </p>
                      <p className="text-[#0F4C45] leading-relaxed font-medium">
                        বাংলা ব্যাখ্যা: প্যাসেজে স্পষ্ট বলা হয়েছে রাতের তাপমাত্রা অপরিবর্তিত ছিল (“remained unchanged”), তাই “both midday and night-time” দাবিটি FALSE।
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: SPEAKING PREVIEW */}
              {activePreviewTab === 'speaking' && (
                <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      {['Part 1 · Interview', 'Part 2 · Cue Card', 'Part 3 · Discussion'].map((label, idx) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => {
                            soundManager.playBeep(520, 0.02);
                            stopSampleAudio();
                            setSelectedSpeakingPartIndex(idx);
                          }}
                          className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${focusRing} ${
                            selectedSpeakingPartIndex === idx
                              ? 'bg-[#0F4C45] text-white border-[#0F4C45]'
                              : 'bg-white text-[#566664] border-[#D3DDDA] hover:text-[#0E1F1E]'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="p-5 rounded-xl bg-white border border-[#D3DDDA] space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-semibold text-[#0F4C45]">
                            {SPEAKING_SAMPLE_PARTS[selectedSpeakingPartIndex].part}
                          </div>
                          <div className="text-xs text-[#566664] mt-0.5">
                            Examiner: {SPEAKING_SAMPLE_PARTS[selectedSpeakingPartIndex].examiner}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handlePlaySpeakingPrompt}
                          className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${focusRing} ${
                            isPlayingSampleAudio
                              ? 'bg-rose-700 hover:bg-rose-800 text-white'
                              : 'bg-[#0F4C45] hover:bg-[#0B3833] text-white'
                          }`}
                        >
                          {isPlayingSampleAudio ? (
                            <>
                              <Square className="w-3.5 h-3.5 fill-current" />
                              <span>Stop Audio</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Hear Examiner Prompt</span>
                            </>
                          )}
                        </button>
                      </div>

                      <p className="text-sm sm:text-base font-semibold text-[#0E1F1E] leading-relaxed">
                        “{SPEAKING_SAMPLE_PARTS[selectedSpeakingPartIndex].prompt}”
                      </p>
                    </div>
                  </div>

                  <div className="lg:col-span-5 p-5 rounded-xl bg-white border border-[#D3DDDA] space-y-3">
                    <div className="text-xs font-semibold text-[#566664]">
                      Sample Band 8.0+ Response &amp; Criterion Note
                    </div>
                    <p className="text-sm text-[#0E1F1E] leading-relaxed">
                      “{SPEAKING_SAMPLE_PARTS[selectedSpeakingPartIndex].sampleResponse}”
                    </p>
                    <div className="pt-3 border-t border-[#EEF3F1] text-xs text-[#566664] leading-relaxed">
                      {SPEAKING_SAMPLE_PARTS[selectedSpeakingPartIndex].rubricNote}
                    </div>
                  </div>
                </div>
              )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* =====================================================================
            4. HOW IT WORKS — EDITORIAL 3-STEP LOOP
        ===================================================================== */}
        <section id="how-it-works" className="py-16 sm:py-24 border-t border-[#D3DDDA] bg-[#F7F9F8]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-semibold text-[#0F4C45]">One focused loop until exam day</p>
              <h2 className="font-display text-2xl sm:text-4xl font-bold text-[#0E1F1E] tracking-tight">
                Diagnostic → study plan → daily practice
              </h2>
              <p className="text-sm sm:text-base text-[#566664] leading-relaxed">
                Stop jumping between random YouTube playlists. Know your starting band first, then put your daily minutes where they move your score fastest.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  step: '01.',
                  title: 'Take the 10-minute diagnostic',
                  description:
                    'A real mini-test across Listening, Reading, Writing, and Speaking — not a personality quiz. Pinpoint your baseline band and weakest skill immediately.',
                  action: 'Start the diagnostic free',
                  onAction: () => handleStartFreeClick('/learn/diagnostic')
                },
                {
                  step: '02.',
                  title: 'Follow your personal study plan',
                  description:
                    'BandSprint allocates your daily study minutes around your target band, exam date, and weakest skill — with clear daily checklists you can finish on mobile or laptop.',
                  action: 'Build my study plan',
                  onAction: () => handleStartFreeClick('/learn/study-plan')
                },
                {
                  step: '03.',
                  title: 'Practise & fix mistakes with AI feedback',
                  description:
                    'Sit 5 full original mock tests, get 4-criteria Writing and Speaking evaluations every day, and review logged errors in your Mistake Vault.',
                  action: 'Try the feedback demo',
                  onAction: undefined
                }
              ].map((item) => (
                <div
                  key={item.step}
                  className="p-6 rounded-2xl bg-white border border-[#D3DDDA] flex flex-col justify-between gap-5"
                >
                  <div className="space-y-3">
                    <span className="font-mono text-sm font-bold text-[#0F4C45] tabular-nums">
                      {item.step}
                    </span>
                    <h3 className="font-display text-lg font-bold text-[#0E1F1E]">{item.title}</h3>
                    <p className="text-sm text-[#566664] leading-relaxed">{item.description}</p>
                  </div>
                  {item.onAction ? (
                    <button
                      type="button"
                      onClick={item.onAction}
                      className={`inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F4C45] hover:underline underline-offset-4 self-start cursor-pointer ${focusRing}`}
                    >
                      <span>{item.action}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <a
                      href="#practice"
                      className={`inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F4C45] hover:underline underline-offset-4 self-start ${focusRing}`}
                    >
                      <span>{item.action}</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================================
            5. FREE LEARNING LIBRARY — ASYMMETRIC BENTO SHOWCASE
        ===================================================================== */}
        <section id="library" className="py-16 sm:py-24 border-t border-[#D3DDDA] bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="max-w-2xl space-y-2">
                <p className="text-xs font-semibold text-[#0F4C45]">
                  Free learning library · Included with every account
                </p>
                <h2 className="font-display text-2xl sm:text-4xl font-bold text-[#0E1F1E] tracking-tight">
                  Learn the method before you sit the timer
                </h2>
              </div>
              <button
                type="button"
                onClick={() => handleStartFreeClick('/learn')}
                className={`min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-sm font-semibold transition-colors inline-flex items-center gap-2 whitespace-nowrap self-start md:self-auto cursor-pointer ${focusRing}`}
              >
                <span>Open the free library</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Featured Wide Card 1 */}
              <div className="md:col-span-7 p-6 sm:p-7 rounded-2xl bg-[#0F4C45] text-white flex flex-col justify-between gap-5">
                <div className="space-y-2.5">
                  <p className="text-xs font-medium text-[#F4A62A]">
                    B1–C2 Lexicon · English &amp; বাংলা
                  </p>
                  <h3 className="font-display text-xl sm:text-2xl font-bold">
                    Vocabulary Decks, Idioms &amp; Spelling Lab
                  </h3>
                  <p className="text-sm text-[#EEF3F1]/85 leading-relaxed max-w-xl">
                    Over 1,000 academic words, B2–C2 speaking idioms with clear Writing usage warnings, and British pronunciation audio — paired with natural বাংলা meanings so you remember nuance, not just translations.
                  </p>
                </div>
                <div className="pt-3 border-t border-white/15 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#EEF3F1]/90 font-medium">
                  <span>B2–C2 Idioms Lab</span>
                  <span>Topic Collocations</span>
                  <span>Spelling Trap Drills</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="md:col-span-5 p-6 sm:p-7 rounded-2xl bg-[#F7F9F8] border border-[#D3DDDA] flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[#0F4C45]">Writing &amp; Speaking Mechanics</p>
                  <h3 className="font-display text-xl font-bold text-[#0E1F1E]">Grammar Lab</h3>
                  <p className="text-sm text-[#566664] leading-relaxed">
                    Targeted structures that actually raise Grammatical Range &amp; Accuracy: inversion, relative clauses, conditionals, and article fixes for common South Asian error patterns.
                  </p>
                </div>
                <span className="text-xs font-medium text-[#566664]">
                  Examples · Band comparisons · Quick drills
                </span>
              </div>

              {/* Bottom 3 Clean Editorial Cards */}
              {[
                {
                  kicker: 'Task 2 & Part 3',
                  title: 'Collocations & Useful Phrases',
                  description:
                    'Natural academic verb-noun pairings and discourse frames organised by common IELTS themes.'
                },
                {
                  kicker: 'Bilingual Companion',
                  title: 'Bangla IELTS Guide',
                  description:
                    'Clear English and বাংলা walkthroughs of question formats, Reading/Listening distractors, and scoring rules.'
                },
                {
                  kicker: 'First-Time Candidates',
                  title: 'Beginner 101 & Band Descriptors',
                  description:
                    'Test timing rules, computer-delivered navigation tips, and plain-language explanations of Band 5 through Band 9.'
                }
              ].map((card) => (
                <div
                  key={card.title}
                  className="md:col-span-4 p-6 rounded-2xl bg-[#F7F9F8] border border-[#D3DDDA] space-y-2"
                >
                  <p className="text-xs font-medium text-[#0F4C45]">{card.kicker}</p>
                  <h3 className="font-display text-lg font-bold text-[#0E1F1E]">{card.title}</h3>
                  <p className="text-sm text-[#566664] leading-relaxed">{card.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================================
            5B. WHY CHOOSE BANDSPRINT OVER A TRADITIONAL COACHING CENTER
        ===================================================================== */}
        <section id="why-bandsprint" className="py-16 sm:py-24 border-t border-[#D3DDDA] bg-[#F7F9F8]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="max-w-2xl space-y-2">
                <p className="text-xs font-semibold text-[#0F4C45]">
                  Why candidates switch from offline coaching centers
                </p>
                <h2 className="font-display text-2xl sm:text-4xl font-bold text-[#0E1F1E] tracking-tight">
                  Everything a coaching center promises — without the ৳20,000 fee or 5-day wait
                </h2>
              </div>
              <button
                type="button"
                onClick={() => handleStartFreeClick('/')}
                className={`min-h-[46px] px-5 py-2.5 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-sm font-semibold transition-colors inline-flex items-center gap-2 whitespace-nowrap self-start md:self-auto cursor-pointer ${focusRing}`}
              >
                <span>Build my personal study plan (60 sec)</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>

            <div className="rounded-2xl bg-white border border-[#D3DDDA] overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-12 bg-[#EEF3F1] px-5 py-3.5 text-xs font-bold text-[#0E1F1E] border-b border-[#D3DDDA]">
                <div className="md:col-span-3">Comparison Factor</div>
                <div className="hidden md:block md:col-span-4 text-[#566664]">Traditional Coaching Center</div>
                <div className="hidden md:block md:col-span-5 text-[#0F4C45]">BandSprint AI Platform</div>
              </div>

              <div className="divide-y divide-[#EEF3F1]">
                {[
                  {
                    factor: 'Course Fee & Risk',
                    coaching: '৳15,000–৳25,000+ paid upfront for a fixed 2-month batch.',
                    bandsprint: 'Free Candidate Account (৳0) with 5 full mocks & daily AI feedback. Optional plans from ৳150/month.'
                  },
                  {
                    factor: 'Writing Essay Checking',
                    coaching: 'Wait 3–7 days for a teacher to write general comments like "improve cohesion".',
                    bandsprint: 'Instant 4-criteria IELTS rubric breakdown (TR, CC, LR, GRA), exact grammar fixes & Band 8+ rewrites.'
                  },
                  {
                    factor: 'Speaking Practice',
                    coaching: '5–10 minutes per week in front of 35 classmates, causing hesitation.',
                    bandsprint: 'Private 24/7 AI British Examiner (Parts 1–3), live grammar HUD & pronunciation shadowing drills.'
                  },
                  {
                    factor: 'Study Plan & Focus',
                    coaching: 'One-size-fits-all syllabus — Band 5.5 and Band 7.5 students sit through the same slides.',
                    bandsprint: 'Adaptive roadmap built around your Aim Band, exam countdown, and #1 weakest module.'
                  },
                  {
                    factor: 'Bilingual Trap Clarity',
                    coaching: 'Fast English-only answer keys without explaining why distractors trick candidates.',
                    bandsprint: 'Built-in English + বাংলা distractor explanations for Reading, Listening, and B2–C2 vocabulary.'
                  }
                ].map((row) => (
                  <div
                    key={row.factor}
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-5 py-4 text-sm items-start"
                  >
                    <div className="md:col-span-3 font-bold text-[#0E1F1E]">{row.factor}</div>
                    <div className="md:col-span-4 text-xs sm:text-sm text-[#566664] flex items-start gap-2 leading-relaxed">
                      <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{row.coaching}</span>
                    </div>
                    <div className="md:col-span-5 text-xs sm:text-sm text-[#0E1F1E] font-medium flex items-start gap-2 leading-relaxed">
                      <CheckCircle2 className="w-4 h-4 text-[#0F4C45] shrink-0 mt-0.5" />
                      <span>{row.bandsprint}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            6. TRANSPARENT PLANS & INDEPENDENT NOTICE
        ===================================================================== */}
        <section id="pricing" className="py-16 sm:py-24 border-t border-[#D3DDDA] bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-semibold text-[#0F4C45]">Transparent access</p>
              <h2 className="font-display text-2xl sm:text-4xl font-bold text-[#0E1F1E] tracking-tight">
                Start free — upgrade only for high-volume AI evaluations
              </h2>
              <p className="text-sm sm:text-base text-[#566664] leading-relaxed">
                Every account begins on Candidate Free with no card required.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Plan 1: Candidate Free */}
              <div className="p-6 sm:p-7 rounded-2xl bg-white border border-[#D3DDDA] flex flex-col justify-between gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-[#566664]">For self-paced preparation</p>
                    <h3 className="font-display text-xl font-bold text-[#0E1F1E] mt-1">Candidate Free</h3>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-3xl font-bold text-[#0E1F1E] tabular-nums">৳0</span>
                    <span className="text-xs text-[#566664]">BDT · No card required</span>
                  </div>
                  <ul className="space-y-2.5 pt-3 border-t border-[#EEF3F1] text-sm text-[#0E1F1E]">
                    {[
                      '10-minute 4-skill diagnostic & personal study plan',
                      '5 full original mock tests (Listening & Reading)',
                      'Full Learn Hub (Vocabulary, Grammar, Idioms, বাংলা Guide)',
                      '2 AI Speaking evaluations per day',
                      '1 AI Writing evaluation per day'
                    ].map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-[#0F4C45] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => handleStartFreeClick('/')}
                  className={`min-h-[48px] w-full rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-sm font-semibold transition-colors cursor-pointer ${focusRing}`}
                >
                  Create my free account
                </button>
              </div>

              {/* Plan 2: Sprint Premium */}
              <div className="p-6 sm:p-7 rounded-2xl bg-[#0F4C45] text-white border border-[#0F4C45] flex flex-col justify-between gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-[#F4A62A]">For active daily practice</p>
                    <h3 className="font-display text-xl font-bold text-white mt-1">Sprint Premium</h3>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-3xl font-bold text-white tabular-nums">৳150</span>
                    <span className="text-xs text-[#EEF3F1]/80">BDT / month · or ৳1,500 / year</span>
                  </div>
                  <ul className="space-y-2.5 pt-3 border-t border-white/15 text-sm text-[#EEF3F1]">
                    {[
                      'Everything in Candidate Free',
                      'Interactive 1-on-1 British Voice Examiner sessions',
                      'Up to 100 Speaking & 50 Writing evaluations per day',
                      'Task 1 & Task 2 deep rubric breakdowns',
                      'Band 9 model essay & speaking reference library'
                    ].map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-[#F4A62A] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => handleStartFreeClick('/')}
                  className={`min-h-[48px] w-full rounded-xl bg-[#F4A62A] hover:bg-[#d98f1d] text-[#0E1F1E] text-sm font-bold transition-colors cursor-pointer ${focusRing}`}
                >
                  Start free, upgrade anytime
                </button>
              </div>

              {/* Plan 3: Sprint Master */}
              <div className="p-6 sm:p-7 rounded-2xl bg-white border border-[#D3DDDA] flex flex-col justify-between gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-[#566664]">For intensive exam sprint</p>
                    <h3 className="font-display text-xl font-bold text-[#0E1F1E] mt-1">Sprint Master</h3>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-3xl font-bold text-[#0E1F1E] tabular-nums">৳300</span>
                    <span className="text-xs text-[#566664]">BDT / month · or ৳3,000 / year</span>
                  </div>
                  <ul className="space-y-2.5 pt-3 border-t border-[#EEF3F1] text-sm text-[#0E1F1E]">
                    {[
                      'Everything in Sprint Premium',
                      'Unlimited daily Speaking & Writing AI evaluations',
                      'Full timed exam simulations & diagnostic reports',
                      'Spaced-repetition Mistake Vault insights',
                      'Printable practice completion summaries'
                    ].map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-[#0F4C45] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => handleStartFreeClick('/')}
                  className={`min-h-[48px] w-full rounded-xl bg-[#EEF3F1] hover:bg-[#D3DDDA] text-[#0E1F1E] text-sm font-semibold transition-colors cursor-pointer ${focusRing}`}
                >
                  Create free account first
                </button>
              </div>
            </div>

            {/* Independent Non-Affiliation Disclaimer */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#D3DDDA] flex items-start gap-3 text-xs text-[#566664] leading-relaxed">
              <ShieldCheck className="w-5 h-5 text-[#0F4C45] shrink-0 mt-0.5" />
              <p>
                <strong className="text-[#0E1F1E]">Practice simulation notice:</strong> All mocks on BandSprint are original Cambridge-style practice simulations — not the official IELTS test. BandSprint is not affiliated with Cambridge, British Council, or IDP. Band scores and AI evaluations are practice estimates for self-study.
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================================
            7. ACCESSIBLE FAQ ACCORDION
        ===================================================================== */}
        <section id="faq" className="py-16 sm:py-24 border-t border-[#D3DDDA] bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#0F4C45]">Common questions</p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0E1F1E] tracking-tight">
                Frequently asked questions
              </h2>
            </div>

            <div className="divide-y divide-[#D3DDDA] border-t border-b border-[#D3DDDA]">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={item.question}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className={`w-full min-h-[56px] py-4 text-left flex items-center justify-between gap-4 text-sm sm:text-base font-semibold text-[#0E1F1E] hover:text-[#0F4C45] transition-colors cursor-pointer ${focusRing}`}
                    >
                      <span>{item.question}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-[#566664] shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-[#0F4C45]' : ''
                        }`}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.24, ease: EASE_EDITORIAL }}
                          className="overflow-hidden"
                        >
                          <div className="pb-5 pr-8 text-sm text-[#566664] leading-relaxed">
                            {item.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* =====================================================================
          8. QUIET EDITORIAL FOOTER
      ===================================================================== */}
      <footer className="border-t border-[#D3DDDA] bg-[#EEF3F1] text-[#566664] text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2">
                <BandSprintMark size={26} />
                <span className="font-display font-bold text-base text-[#0E1F1E]">BandSprint</span>
              </div>
              <p className="text-xs text-[#566664] leading-relaxed">
                Sprint to Band 9. Original IELTS-style practice labs, 4-criteria Writing and Speaking feedback, and bilingual English/বাংলা explanations.
              </p>
            </div>

            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold text-[#0E1F1E]">Platform</h3>
              <ul className="space-y-2">
                <li>
                  <a href="#practice" className={`hover:text-[#0E1F1E] transition-colors ${focusRing}`}>
                    Live Feedback Demo
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className={`hover:text-[#0E1F1E] transition-colors ${focusRing}`}>
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="#library" className={`hover:text-[#0E1F1E] transition-colors ${focusRing}`}>
                    Free Learning Library
                  </a>
                </li>
                <li>
                  <a href="#pricing" className={`hover:text-[#0E1F1E] transition-colors ${focusRing}`}>
                    Plans &amp; Free Access
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold text-[#0E1F1E]">Account</h3>
              <ul className="space-y-2">
                <li>
                  <button
                    type="button"
                    onClick={() => handleStartFreeClick('/')}
                    className={`hover:text-[#0E1F1E] transition-colors cursor-pointer ${focusRing}`}
                  >
                    Create my free account
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleSignInClick('/')}
                    className={`hover:text-[#0E1F1E] transition-colors cursor-pointer ${focusRing}`}
                  >
                    Sign in with Google or Email
                  </button>
                </li>
                <li>
                  <a href="#faq" className={`hover:text-[#0E1F1E] transition-colors ${focusRing}`}>
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold text-[#0E1F1E]">Legal &amp; Support</h3>
              <ul className="space-y-2">
                <li>
                  <button
                    type="button"
                    onClick={() => handleLegalClick('terms')}
                    className={`inline-flex items-center gap-1.5 hover:text-[#0E1F1E] transition-colors cursor-pointer ${focusRing}`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Terms of Service</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleLegalClick('privacy')}
                    className={`inline-flex items-center gap-1.5 hover:text-[#0E1F1E] transition-colors cursor-pointer ${focusRing}`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Privacy Policy</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handleContactClick}
                    className={`inline-flex items-center gap-1.5 hover:text-[#0E1F1E] transition-colors cursor-pointer ${focusRing}`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Contact Support</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-[#D3DDDA] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-[#566664]">
            <p>© {new Date().getFullYear()} BandSprint. All rights reserved.</p>
            <p>
              Practice simulation — not the official IELTS test. Not affiliated with Cambridge, British Council, or IDP.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
