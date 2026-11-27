import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  Globe2,
  Briefcase,
  Award,
  Mic,
  PenTool,
  BookOpen,
  Headphones,
  CheckCircle2,
  XCircle,
  Clock,
  Wallet,
  Users,
  Calendar,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { BandSprintMark } from '../common/BandSprintMark';
import { BarnabyCrest } from '../common/BarnabyCrest';
import { BarnabyRig } from '../BarnabyRig';
import { BARNABY_CORE_TAGLINE } from '../../types/barnaby';
import { soundManager } from '../../utils/audioEffects';
import { correctAnswersNeeded } from '../../services/examSetupService';
import {
  OnboardingPurpose,
  OnboardingWeakSkill,
  CoachingPainPoint,
  ExamTimelineId,
  OnboardingSurveyData,
  PURPOSE_LABELS,
  WEAK_SKILL_META,
  PAIN_POINT_META,
  computeExamDateFromTimeline,
  loadOnboardingSurvey,
  saveOnboardingSurvey,
  buildPersonalizedSkillAllocation
} from '../../services/onboardingSurveyStore';
import { EASE_EDITORIAL } from '../common/MotionPrimitives';

export interface PreAuthOnboardingFunnelProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleteToAuth: (mode: 'register' | 'signin', data: OnboardingSurveyData) => void;
  onSkipToLogin: () => void;
}

const TOTAL_STEPS = 7;

interface MicroCheckItem {
  skill: OnboardingWeakSkill;
  kicker: string;
  question: string;
  context: string;
  options: { id: string; text: string; isCorrect: boolean }[];
  explanationEn: string;
  explanationBn: string;
}

const SKILL_MICRO_CHECKS: Record<OnboardingWeakSkill, MicroCheckItem> = {
  speaking: {
    skill: 'speaking',
    kicker: '20-Second Speaking Calibration · Lexical Resource',
    question: 'Which Part 1 answer scores Band 8.0+ for natural vocabulary and accuracy?',
    context: 'Examiner: "Do you enjoy living in your hometown?"',
    options: [
      {
        id: 'a',
        text: 'Yes, I am living there since childhood and it have many good places.',
        isCorrect: false
      },
      {
        id: 'b',
        text: 'I do — despite the traffic, it has a vibrant street-food culture and a real sense of community.',
        isCorrect: true
      },
      {
        id: 'c',
        text: 'Yes, my hometown is very nice and very big and I like it very much.',
        isCorrect: false
      }
    ],
    explanationEn:
      'Option B avoids tense errors ("am living... since") and uses natural collocations ("vibrant street-food culture", "sense of community") with clean contrast ("despite").',
    explanationBn:
      'Option B-তে সঠিক tense এবং প্রাকৃতিক ইংরেজি collocation ব্যবহার হয়েছে — মুখস্থ ভারী শব্দ ছাড়াই Band 8.0+ মানের উত্তর।'
  },
  writing: {
    skill: 'writing',
    kicker: '20-Second Writing Calibration · Coherence & Cohesion',
    question: 'Which sentence upgrade moves a Task 2 paragraph from Band 6.0 toward Band 8.0?',
    context: 'Draft: "Firstly, free buses are good because car drivers will use them. Secondly, pollution drops."',
    options: [
      {
        id: 'a',
        text: 'Firstly, free buses are very good for society. Secondly, air pollution becomes very less.',
        isCorrect: false
      },
      {
        id: 'b',
        text: 'Eliminating transit fares encourages motorists to switch to public transport, thereby curbing urban emissions.',
        isCorrect: true
      },
      {
        id: 'c',
        text: 'In this modern era, nowadays free buses are undeniably a pivotal phenomenon for all.',
        isCorrect: false
      }
    ],
    explanationEn:
      'Option B replaces mechanical linkers ("Firstly/Secondly") with causal subordination ("thereby curbing") and precise verbs without memorized templates.',
    explanationBn:
      'মুখস্থ template ("In this modern era") ব্যবহার করলে নম্বর কমে। Option B-তে cause-effect সংযোগ ("thereby curbing") পরিষ্কার ও natural।'
  },
  reading: {
    skill: 'reading',
    kicker: '20-Second Reading Calibration · TFNG Trap Check',
    question: 'Statement: "Courtyard corridors lowered both midday and night-time building temperatures."',
    context: 'Passage: "...ventilated corridors cut midday heat by 4°C, though night-time heat retention remained unchanged."',
    options: [
      { id: 'a', text: 'TRUE', isCorrect: false },
      { id: 'b', text: 'FALSE', isCorrect: true },
      { id: 'c', text: 'NOT GIVEN', isCorrect: false }
    ],
    explanationEn:
      'The statement claims BOTH dropped, while the text directly contradicts the night-time part ("remained unchanged") — making it FALSE, not NOT GIVEN.',
    explanationBn:
      'প্যাসেজে স্পষ্ট লেখা আছে রাতের তাপমাত্রা অপরিবর্তিত ছিল ("remained unchanged"), তাই "both" দাবিটি সরাসরি ভুল (FALSE)।'
  },
  listening: {
    skill: 'listening',
    kicker: '20-Second Listening Calibration · Section 1 Self-Correction',
    question: 'What registration time should you write on the answer sheet?',
    context: 'Audio script: "The brochure says 9:30 AM, oh wait — the curator just moved registration to 10:15 in Room B14."',
    options: [
      { id: 'a', text: '9:30 AM', isCorrect: false },
      { id: 'b', text: '10:15 AM', isCorrect: true },
      { id: 'c', text: '14:00', isCorrect: false }
    ],
    explanationEn:
      'Section 1 frequently states an initial time from a flyer before revising it immediately. Always wait for words like "actually", "oh wait", or "moved to".',
    explanationBn:
      'IELTS Listening-এ প্রথম তথ্য বলেই বক্তা সেটি সংশোধন করে দেন ("oh wait / moved to") — শেষ সংশোধিত সময় ১০:১৫ সঠিক।'
  }
};

const BAND_DESCRIPTIONS: Record<number, string> = {
  6.5: 'Solid undergraduate & general visa threshold',
  7.0: 'Most UK, Australian & Canadian Masters programs',
  7.5: 'Top-tier universities, healthcare & competitive PR',
  8.0: 'Maximum Express Entry CRS points & scholarships',
  8.5: 'Near-native academic command & fellowships',
  9.0: 'Expert user across all four IELTS criteria'
};

const COACHING_VS_BANDSPRINT = [
  {
    feature: 'Cost & Commitment',
    coaching: '৳15,000–৳25,000+ upfront for 2 months',
    bandsprint: 'Free to start (5 mocks + daily AI); optional ৳150/mo',
    painKey: 'high_fees' as CoachingPainPoint
  },
  {
    feature: 'Writing & Speaking Feedback',
    coaching: '3–7 days wait; short general remarks',
    bandsprint: 'Instant 4-criteria rubric, grammar fixes & Band 8+ rewrites',
    painKey: 'slow_feedback' as CoachingPainPoint
  },
  {
    feature: 'Study Personalization',
    coaching: 'Same lecture for 30–50 students at once',
    bandsprint: 'Adaptive plan weighted toward your exact weakest module',
    painKey: 'crowded_batch' as CoachingPainPoint
  },
  {
    feature: 'Schedule & Commute',
    coaching: 'Rigid batch hours & hours lost in traffic',
    bandsprint: '15–60 min focused sessions anytime on phone or laptop',
    painKey: 'rigid_schedule' as CoachingPainPoint
  },
  {
    feature: 'Speaking Practice Volume',
    coaching: '5–10 minutes per week in front of peers',
    bandsprint: 'Private 24/7 AI British Examiner, live HUD & shadowing drills',
    painKey: 'speaking_fear' as CoachingPainPoint
  }
];

export const PreAuthOnboardingFunnel: React.FC<PreAuthOnboardingFunnelProps> = ({
  isOpen,
  onClose,
  onCompleteToAuth,
  onSkipToLogin
}) => {
  const existing = useMemo(() => loadOnboardingSurvey(), []);

  const [step, setStep] = useState<number>(1);
  const [direction, setDirection] = useState<number>(1);

  // Survey state
  const [purpose, setPurpose] = useState<OnboardingPurpose>(existing?.purpose || 'study_abroad');
  const [examTrack, setExamTrack] = useState<'Academic' | 'General Training'>(
    existing?.examTrack || 'Academic'
  );
  const [currentBand, setCurrentBand] = useState<number | 'unsure'>(existing?.currentBand ?? 6.0);
  const [targetBand, setTargetBand] = useState<number>(existing?.targetBand || 7.5);
  const [weakestSkill, setWeakestSkill] = useState<OnboardingWeakSkill>(
    existing?.weakestSkill || 'speaking'
  );
  const [coachingPainPoint, setCoachingPainPoint] = useState<CoachingPainPoint>(
    existing?.coachingPainPoint || 'slow_feedback'
  );
  const [examTimeline, setExamTimeline] = useState<ExamTimelineId>(
    existing?.examTimeline || '60_days'
  );
  const [dailyMinutes, setDailyMinutes] = useState<15 | 30 | 45 | 60>(
    existing?.dailyMinutes || 30
  );
  const [selectedMicroOption, setSelectedMicroOption] = useState<string | null>(null);
  const [step6Error, setStep6Error] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [isOpen, step]);

  useEffect(() => {
    if (!isOpen) return;
    const latest = loadOnboardingSurvey();
    if (latest) {
      setPurpose(latest.purpose);
      setExamTrack(latest.examTrack);
      setCurrentBand(latest.currentBand);
      setTargetBand(latest.targetBand);
      setWeakestSkill(latest.weakestSkill);
      setCoachingPainPoint(latest.coachingPainPoint);
      setExamTimeline(latest.examTimeline);
      setDailyMinutes(latest.dailyMinutes);
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const microCheck = SKILL_MICRO_CHECKS[weakestSkill];
  const selectedMicroObj = microCheck.options.find((o) => o.id === selectedMicroOption) || null;

  const progressPct = Math.round((step / TOTAL_STEPS) * 100);

  const estimatedGap = useMemo(() => {
    const base = typeof currentBand === 'number' ? currentBand : 5.5;
    return Math.max(0.5, Number((targetBand - base).toFixed(1)));
  }, [currentBand, targetBand]);

  const skillAllocation = useMemo(
    () => buildPersonalizedSkillAllocation(weakestSkill, dailyMinutes),
    [weakestSkill, dailyMinutes]
  );

  const timelineDaysLabel = useMemo(() => {
    const map: Record<ExamTimelineId, string> = {
      '30_days': '30-Day Intensive Sprint',
      '60_days': '60-Day Balanced Plan',
      '90_days': '90-Day Deep Mastery',
      '180_days': '6-Month Steady Build',
      undecided: 'Flexible Self-Paced Plan'
    };
    return map[examTimeline];
  }, [examTimeline]);

  if (!isOpen) return null;

  const goNext = () => {
    if (step === 6 && !selectedMicroOption) {
      soundManager.playBeep(320, 0.04);
      setStep6Error('Please select one answer in the 20-second calibration above before generating your plan.');
      return;
    }
    setStep6Error('');
    soundManager.playBeep(620, 0.03);
    setDirection(1);
    setStep((prev) => Math.min(TOTAL_STEPS, prev + 1));
  };

  const goBack = () => {
    soundManager.playBeep(480, 0.025);
    if (step === 1) {
      onClose();
      return;
    }
    setDirection(-1);
    setStep((prev) => Math.max(1, prev - 1));
  };

  const buildPayload = (): OnboardingSurveyData => ({
    purpose,
    examTrack,
    currentBand,
    targetBand,
    weakestSkill,
    coachingPainPoint,
    examTimeline,
    examDate: computeExamDateFromTimeline(examTimeline),
    dailyMinutes,
    miniCheckAnswered: Boolean(selectedMicroOption),
    miniCheckCorrect: Boolean(selectedMicroObj?.isCorrect),
    completedAt: Date.now()
  });

  const handleFinish = (mode: 'register' | 'signin') => {
    soundManager.playSuccess();
    const payload = buildPayload();
    saveOnboardingSurvey(payload);
    onCompleteToAuth(mode, payload);
  };

  const barnabyTip = (() => {
    switch (step) {
      case 1:
        return 'Tell me your goal and track — I will filter every mock and writing prompt to match.';
      case 2:
        return `To score Band ${targetBand.toFixed(1)}, aim for ${correctAnswersNeeded(targetBand)}/40 in Listening & Reading.`;
      case 3:
        return 'We will dedicate 40% of your daily sprint to fixing your biggest bottleneck first.';
      case 4:
        return 'Most candidates join BandSprint after trying crowded coaching batches or random YouTube videos.';
      case 5:
        return `Here is how BandSprint solves "${PAIN_POINT_META[coachingPainPoint].label.toLowerCase()}" from day one.`;
      case 6:
        return 'Quick 20-second calibration — try one real IELTS trap before we generate your roadmap.';
      default:
        return `Your Band ${targetBand.toFixed(1)} roadmap is ready. Save it to your free account to start immediately.`;
    }
  })();

  const sortedComparison = [
    ...COACHING_VS_BANDSPRINT.filter((r) => r.painKey === coachingPainPoint),
    ...COACHING_VS_BANDSPRINT.filter((r) => r.painKey !== coachingPainPoint)
  ];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#F7F9F8] text-[#0E1F1E] flex flex-col overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Personalize your IELTS study plan"
    >
      {/* Top Progress Header */}
      <header className="sticky top-0 z-20 bg-[#F7F9F8]/95 backdrop-blur-sm border-b border-[#D3DDDA]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            className="min-h-[42px] px-2.5 -ml-2 rounded-xl text-xs sm:text-sm font-semibold text-[#566664] hover:text-[#0E1F1E] hover:bg-[#EEF3F1] inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{step === 1 ? 'Home' : 'Back'}</span>
          </button>

          {/* Animated Step Progress Bar */}
          <div className="flex-1 max-w-xs sm:max-w-sm flex flex-col items-center gap-1.5">
            <div className="w-full h-2 rounded-full bg-[#DCE6E3] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-[#0F4C45]"
                initial={false}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.32, ease: EASE_EDITORIAL }}
              />
            </div>
            <span className="text-[11px] font-mono font-semibold text-[#566664] tabular-nums">
              Step {step} of {TOTAL_STEPS}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(520, 0.03);
              onSkipToLogin();
            }}
            className="min-h-[42px] px-3 rounded-xl text-xs sm:text-sm font-semibold text-[#0F4C45] hover:bg-[#EEF3F1] transition-colors whitespace-nowrap cursor-pointer shrink-0"
          >
            Log in
          </button>
        </div>
      </header>

      {/* Main Centered Survey Canvas */}
      <main className="flex-1 flex flex-col items-center justify-start sm:justify-center px-4 sm:px-6 py-6 sm:py-10">
        <div className="w-full max-w-2xl space-y-5">
          {/* Barnaby Compact Context Bar */}
          <div className="flex items-center gap-3.5 px-4 py-3 rounded-2xl bg-white border border-[#134E41]/15">
            <div className="w-12 h-12 rounded-xl bg-transparent flex items-center justify-center shrink-0 overflow-hidden p-0.5">
              <BarnabyRig
                expression="welcoming"
                mode="ambient"
                interactive={false}
                className="w-full h-full"
                ariaLabel="Barnaby companion greeting"
              />
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#134E41]">
                <BarnabyCrest size={15} variant="inline" />
                <span>Barnaby · {BARNABY_CORE_TAGLINE}</span>
              </div>
              <p className="text-xs sm:text-sm text-[#0E1F1E] leading-snug font-medium">
                {barnabyTip}
              </p>
            </div>
          </div>

          {/* Step Slide Container */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 22 : -22 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -18 : 18 }}
              transition={{ duration: 0.24, ease: EASE_EDITORIAL }}
              className="rounded-2xl bg-white border border-[#D3DDDA] p-5 sm:p-8 shadow-sm space-y-6"
            >
              {/* STEP 1: GOAL & IELTS TRACK */}
              {step === 1 && (
                <>
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-[#0F4C45]">Personalize Your Plan</p>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0E1F1E] tracking-tight">
                      What are you taking IELTS for?
                    </h1>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        id: 'study_abroad' as OnboardingPurpose,
                        title: 'Study Abroad',
                        sub: 'Bachelors, Masters, or PhD admission',
                        icon: GraduationCap,
                        defaultTrack: 'Academic' as const
                      },
                      {
                        id: 'immigration_pr' as OnboardingPurpose,
                        title: 'Immigration / PR',
                        sub: 'Canada Express Entry, Australia, NZ',
                        icon: Globe2,
                        defaultTrack: 'General Training' as const
                      },
                      {
                        id: 'work_visa' as OnboardingPurpose,
                        title: 'Skilled Work Visa',
                        sub: 'UK Healthcare, Nursing, or Global jobs',
                        icon: Briefcase,
                        defaultTrack: 'Academic' as const
                      },
                      {
                        id: 'career_academic' as OnboardingPurpose,
                        title: 'Scholarship & Career',
                        sub: 'Merit scholarships & international resume',
                        icon: Award,
                        defaultTrack: 'Academic' as const
                      }
                    ].map((opt) => {
                      const Icon = opt.icon;
                      const active = purpose === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            soundManager.playBeep(560, 0.025);
                            setPurpose(opt.id);
                            setExamTrack(opt.defaultTrack);
                          }}
                          className={`min-h-[74px] p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                            active
                              ? 'border-[#0F4C45] bg-[#EEF3F1] ring-1 ring-[#0F4C45]'
                              : 'border-[#D3DDDA] bg-[#F7F9F8] hover:border-[#0F4C45]/50 hover:bg-white'
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              active ? 'bg-[#0F4C45] text-[#F4A62A]' : 'bg-white text-[#0F4C45] border border-[#D3DDDA]'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-[#0E1F1E]">{opt.title}</div>
                            <div className="text-xs text-[#566664] mt-0.5 leading-snug">{opt.sub}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Academic vs General Training Track */}
                  <div className="pt-3 border-t border-[#EEF3F1] space-y-2">
                    <label className="block text-xs font-semibold text-[#566664]">
                      IELTS Exam Track (auto-matched, adjust if needed)
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {(['Academic', 'General Training'] as const).map((track) => {
                        const active = examTrack === track;
                        return (
                          <button
                            key={track}
                            type="button"
                            onClick={() => {
                              soundManager.playBeep(520, 0.02);
                              setExamTrack(track);
                            }}
                            className={`min-h-[48px] px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                              active
                                ? 'bg-[#0F4C45] text-white border-[#0F4C45]'
                                : 'bg-[#F7F9F8] text-[#0E1F1E] border-[#D3DDDA] hover:border-[#0F4C45]/50'
                            }`}
                          >
                            IELTS {track}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* STEP 2: AIM BAND & CURRENT LEVEL */}
              {step === 2 && (
                <>
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-[#0F4C45]">Aim Band &amp; Baseline</p>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0E1F1E] tracking-tight">
                      What is your target IELTS band?
                    </h1>
                  </div>

                  {/* Target Band Tap Grid */}
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {[6.5, 7.0, 7.5, 8.0, 8.5, 9.0].map((band) => {
                        const active = targetBand === band;
                        return (
                          <button
                            key={band}
                            type="button"
                            onClick={() => {
                              soundManager.playBeep(580, 0.025);
                              setTargetBand(band);
                              if (typeof currentBand === 'number' && currentBand >= band) {
                                setCurrentBand(Math.max(4.5, band - 0.5));
                              }
                            }}
                            className={`min-h-[54px] rounded-xl border font-mono text-base font-bold tabular-nums transition-all cursor-pointer ${
                              active
                                ? 'bg-[#0F4C45] text-white border-[#0F4C45] shadow-sm'
                                : 'bg-[#F7F9F8] text-[#0E1F1E] border-[#D3DDDA] hover:border-[#0F4C45]/50'
                            }`}
                          >
                            {band.toFixed(1)}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-[#0F4C45] font-medium">
                      Band {targetBand.toFixed(1)} — {BAND_DESCRIPTIONS[targetBand]}
                    </p>
                  </div>

                  {/* Current Level Selector */}
                  <div className="pt-3 border-t border-[#EEF3F1] space-y-2.5">
                    <label className="block text-xs font-semibold text-[#566664]">
                      Where is your English level right now?
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { val: 'unsure' as const, label: 'Not sure yet', sub: 'Take 10-min diagnostic' },
                        { val: 5.0, label: 'Band 5.0', sub: 'Basic structure' },
                        { val: 5.5, label: 'Band 5.5', sub: 'Frequent slips' },
                        { val: 6.0, label: 'Band 6.0', sub: 'Competent user' },
                        { val: 6.5, label: 'Band 6.5', sub: 'Almost at 7.0' },
                        { val: 7.0, label: 'Band 7.0+', sub: 'Pushing for 8.0+' }
                      ].map((lvl) => {
                        const active = currentBand === lvl.val;
                        const disabled = typeof lvl.val === 'number' && lvl.val >= targetBand;
                        return (
                          <button
                            key={String(lvl.val)}
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                              soundManager.playBeep(520, 0.02);
                              setCurrentBand(lvl.val);
                            }}
                            className={`min-h-[56px] p-3 rounded-xl border text-left transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              active
                                ? 'bg-[#EEF3F1] border-[#0F4C45] ring-1 ring-[#0F4C45]'
                                : 'bg-[#F7F9F8] border-[#D3DDDA] hover:border-[#0F4C45]/50'
                            }`}
                          >
                            <div className="text-xs sm:text-sm font-bold text-[#0E1F1E]">
                              {lvl.label}
                            </div>
                            <div className="text-[11px] text-[#566664] mt-0.5">{lvl.sub}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Live Band Gap Summary Strip */}
                  <div className="p-3.5 rounded-xl bg-[#0F4C45] text-white flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] text-[#EEF3F1]/75 font-medium">Target Milestone</div>
                      <div className="text-sm font-bold mt-0.5">
                        {typeof currentBand === 'number'
                          ? `Band ${currentBand.toFixed(1)} → Band ${targetBand.toFixed(1)} (+${estimatedGap.toFixed(1)} climb)`
                          : `Aiming for Band ${targetBand.toFixed(1)} (${examTrack})`}
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-[11px] text-[#F4A62A] font-semibold">L/R Raw Target</div>
                      <div className="text-sm font-bold tabular-nums">
                        {correctAnswersNeeded(targetBand)} / 40 correct
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* STEP 3: WEAKEST SKILL / BIGGEST BOTTLENECK */}
              {step === 3 && (
                <>
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-[#0F4C45]">Score Bottleneck</p>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0E1F1E] tracking-tight">
                      Which module holds your score back most?
                    </h1>
                    <p className="text-xs sm:text-sm text-[#566664]">
                      We will weight 40% of your daily sprint toward fixing this skill first.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        id: 'speaking' as OnboardingWeakSkill,
                        title: 'Speaking',
                        sub: 'Hesitation, Part 2 cue cards, grammar slips, or pronunciation',
                        icon: Mic
                      },
                      {
                        id: 'writing' as OnboardingWeakSkill,
                        title: 'Writing',
                        sub: 'Task 2 structure, lexical precision, or stuck at Band 6.0',
                        icon: PenTool
                      },
                      {
                        id: 'reading' as OnboardingWeakSkill,
                        title: 'Reading',
                        sub: 'Running out of time or losing marks on TRUE / FALSE / NOT GIVEN',
                        icon: BookOpen
                      },
                      {
                        id: 'listening' as OnboardingWeakSkill,
                        title: 'Listening',
                        sub: 'Missing fast British/Australian accents, distractors, or spelling',
                        icon: Headphones
                      }
                    ].map((mod) => {
                      const Icon = mod.icon;
                      const active = weakestSkill === mod.id;
                      return (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() => {
                            soundManager.playBeep(580, 0.025);
                            setWeakestSkill(mod.id);
                            setSelectedMicroOption(null);
                          }}
                          className={`min-h-[82px] p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                            active
                              ? 'border-[#0F4C45] bg-[#EEF3F1] ring-1 ring-[#0F4C45]'
                              : 'border-[#D3DDDA] bg-[#F7F9F8] hover:border-[#0F4C45]/50 hover:bg-white'
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              active ? 'bg-[#0F4C45] text-[#F4A62A]' : 'bg-white text-[#0F4C45] border border-[#D3DDDA]'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-[#0E1F1E]">{mod.title}</div>
                            <div className="text-xs text-[#566664] mt-0.5 leading-snug">{mod.sub}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* STEP 4: WHY NOT COACHING CENTER — PAIN POINT SURVEY */}
              {step === 4 && (
                <>
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-[#0F4C45]">Smarter Than Coaching Centers</p>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0E1F1E] tracking-tight">
                      What frustrates you most about coaching centers or self-study?
                    </h1>
                    <p className="text-xs sm:text-sm text-[#566664]">
                      Pick your #1 frustration so we can tailor how BandSprint supports you.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      {
                        id: 'high_fees' as CoachingPainPoint,
                        title: 'High coaching fees (৳15,000–৳25,000+ per batch)',
                        sub: 'Paying huge upfront fees before even seeing if the method works',
                        icon: Wallet
                      },
                      {
                        id: 'slow_feedback' as CoachingPainPoint,
                        title: 'Waiting days for essay or speaking feedback',
                        sub: 'Getting vague remarks like "improve grammar" with no Band 8 rewrite',
                        icon: Clock
                      },
                      {
                        id: 'crowded_batch' as CoachingPainPoint,
                        title: 'Crowded batches that teach everyone the same thing',
                        sub: '30–50 students in one room while your specific weak area gets skipped',
                        icon: Users
                      },
                      {
                        id: 'rigid_schedule' as CoachingPainPoint,
                        title: 'Traffic, commuting & fixed class timings',
                        sub: 'Hard to balance university, job, and rigid offline schedules',
                        icon: Calendar
                      },
                      {
                        id: 'speaking_fear' as CoachingPainPoint,
                        title: 'Nervous speaking English in front of other students',
                        sub: 'Barely 5 minutes of real speaking time per class — not enough to build fluency',
                        icon: Mic
                      }
                    ].map((pain) => {
                      const Icon = pain.icon;
                      const active = coachingPainPoint === pain.id;
                      return (
                        <button
                          key={pain.id}
                          type="button"
                          onClick={() => {
                            soundManager.playBeep(580, 0.025);
                            setCoachingPainPoint(pain.id);
                          }}
                          className={`w-full min-h-[64px] p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                            active
                              ? 'border-[#0F4C45] bg-[#EEF3F1] ring-1 ring-[#0F4C45]'
                              : 'border-[#D3DDDA] bg-[#F7F9F8] hover:border-[#0F4C45]/50 hover:bg-white'
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              active ? 'bg-[#0F4C45] text-[#F4A62A]' : 'bg-white text-[#0F4C45] border border-[#D3DDDA]'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold text-[#0E1F1E] leading-snug">{pain.title}</div>
                            <div className="text-xs text-[#566664] mt-0.5 leading-snug">{pain.sub}</div>
                          </div>
                          {active && <CheckCircle2 className="w-5 h-5 text-[#0F4C45] shrink-0 mt-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* STEP 5: PERSONALIZED COACHING CENTER VS BANDSPRINT PROOF */}
              {step === 5 && (
                <>
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-[#0F4C45]">Why Candidates Choose BandSprint</p>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0E1F1E] tracking-tight">
                      Built to beat traditional coaching centers — especially for you
                    </h1>
                  </div>

                  {/* Highlighted Direct Answer to Their Chosen Pain Point */}
                  <div className="p-4 rounded-xl bg-[#0F4C45] text-white space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#F4A62A]">
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>Your #1 Priority Solved</span>
                    </div>
                    <p className="text-sm font-bold leading-snug">
                      {PAIN_POINT_META[coachingPainPoint].bandSprintFix}
                    </p>
                    <p className="text-xs text-[#EEF3F1]/75 leading-relaxed">
                      Instead of: {PAIN_POINT_META[coachingPainPoint].coachingProblem}
                    </p>
                  </div>

                  {/* Side-by-Side Comparison Matrix */}
                  <div className="rounded-xl border border-[#D3DDDA] overflow-hidden">
                    <div className="grid grid-cols-12 bg-[#EEF3F1] px-3.5 py-2.5 text-[11px] font-bold text-[#0E1F1E] border-b border-[#D3DDDA]">
                      <div className="col-span-4">What Matters</div>
                      <div className="col-span-4 text-[#566664]">Coaching Center</div>
                      <div className="col-span-4 text-[#0F4C45]">BandSprint AI</div>
                    </div>
                    <div className="divide-y divide-[#EEF3F1]">
                      {sortedComparison.map((row) => {
                        const isHighlighted = row.painKey === coachingPainPoint;
                        return (
                          <div
                            key={row.feature}
                            className={`grid grid-cols-12 gap-2 px-3.5 py-3 text-xs items-start ${
                              isHighlighted ? 'bg-[#FDF6E7]/60' : 'bg-white'
                            }`}
                          >
                            <div className="col-span-4 font-semibold text-[#0E1F1E] leading-snug">
                              {row.feature}
                            </div>
                            <div className="col-span-4 text-[#566664] flex items-start gap-1.5 leading-snug">
                              <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                              <span>{row.coaching}</span>
                            </div>
                            <div className="col-span-4 text-[#0E1F1E] font-medium flex items-start gap-1.5 leading-snug">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#0F4C45] shrink-0 mt-0.5" />
                              <span>{row.bandsprint}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* STEP 6: TIMELINE + DAILY PACE + 20-SEC LIVE IELTS MICRO-CHECK */}
              {step === 6 && (
                <>
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-[#0F4C45]">Schedule &amp; 20-Second Calibration</p>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0E1F1E] tracking-tight">
                      Set your exam pace &amp; test 1 real IELTS trap
                    </h1>
                  </div>

                  {/* Timeline & Daily Minutes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-[#566664]">
                        When is your target exam?
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: '30_days' as ExamTimelineId, label: 'Within 30 days' },
                          { id: '60_days' as ExamTimelineId, label: '2 months' },
                          { id: '90_days' as ExamTimelineId, label: '3 months' },
                          { id: '180_days' as ExamTimelineId, label: '6+ months' }
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              soundManager.playBeep(520, 0.02);
                              setExamTimeline(t.id);
                            }}
                            className={`min-h-[42px] px-2.5 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                              examTimeline === t.id
                                ? 'bg-[#0F4C45] text-white border-[#0F4C45]'
                                : 'bg-[#F7F9F8] text-[#0E1F1E] border-[#D3DDDA] hover:border-[#0F4C45]/50'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-[#566664]">
                        Daily study commitment
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {([15, 30, 45, 60] as const).map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => {
                              soundManager.playBeep(520, 0.02);
                              setDailyMinutes(mins);
                            }}
                            className={`min-h-[42px] px-2.5 py-2 rounded-xl border font-mono text-xs font-semibold tabular-nums transition-colors cursor-pointer ${
                              dailyMinutes === mins
                                ? 'bg-[#0F4C45] text-white border-[#0F4C45]'
                                : 'bg-[#F7F9F8] text-[#0E1F1E] border-[#D3DDDA] hover:border-[#0F4C45]/50'
                            }`}
                          >
                            {mins} min / day
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Interactive 1-Question Skill Micro-Check (ELSA/Duolingo Value Taste) */}
                  <div className="pt-4 border-t border-[#EEF3F1] space-y-3">
                    <div className="space-y-1">
                      <p className="text-[11px] font-mono font-bold text-[#0F4C45]">
                        {microCheck.kicker}
                      </p>
                      <p className="text-xs text-[#566664] italic">{microCheck.context}</p>
                      <p className="text-sm font-bold text-[#0E1F1E]">{microCheck.question}</p>
                    </div>

                    <div className="space-y-2">
                      {microCheck.options.map((opt) => {
                        const isPicked = selectedMicroOption === opt.id;
                        const reveal = selectedMicroOption !== null;
                        let style =
                          'bg-[#F7F9F8] border-[#D3DDDA] text-[#0E1F1E] hover:border-[#0F4C45]/50';
                        if (reveal) {
                          if (opt.isCorrect) {
                            style = 'bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold';
                          } else if (isPicked) {
                            style = 'bg-rose-50 border-rose-400 text-rose-900';
                          } else {
                            style = 'bg-[#F7F9F8] border-[#EEF3F1] text-[#566664] opacity-70';
                          }
                        }
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setSelectedMicroOption(opt.id);
                              setStep6Error('');
                              if (opt.isCorrect) {
                                soundManager.playSuccess();
                              } else {
                                soundManager.playBeep(360, 0.04);
                              }
                            }}
                            className={`w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border text-left text-xs sm:text-sm transition-colors flex items-start justify-between gap-2.5 cursor-pointer ${style}`}
                          >
                            <span className="leading-snug">{opt.text}</span>
                            {reveal && opt.isCorrect && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            )}
                            {reveal && isPicked && !opt.isCorrect && (
                              <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {selectedMicroObj && (
                      <div className="p-3.5 rounded-xl bg-[#EEF3F1] border border-[#D3DDDA] space-y-1.5 text-xs">
                        <div className="font-bold text-[#0E1F1E]">
                          {selectedMicroObj.isCorrect
                            ? 'Sharp eye! You spotted the Band 8+ pattern.'
                            : 'Good catch to learn now — this is a classic Band 6.0 trap.'}
                        </div>
                        <p className="text-[#566664] leading-relaxed">{microCheck.explanationEn}</p>
                        <p className="text-[#0F4C45] font-medium leading-relaxed">
                          বাংলা ব্যাখ্যা: {microCheck.explanationBn}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* STEP 7: PERSONALIZED ROADMAP REVEAL + SAVE ACCOUNT GATE */}
              {step === 7 && (
                <>
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-[#0F4C45]">Your Custom Blueprint Is Ready</p>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0E1F1E] tracking-tight">
                      Your {timelineDaysLabel} to Band {targetBand.toFixed(1)}
                    </h1>
                    <p className="text-xs sm:text-sm text-[#566664]">
                      Built for {PURPOSE_LABELS[purpose].short} ({examTrack}) · Save your plan to start immediately.
                    </p>
                  </div>

                  {/* Key Targets Strip */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="p-3.5 rounded-xl bg-[#0F4C45] text-white">
                      <div className="text-[11px] text-[#EEF3F1]/75 font-medium">Aim Band</div>
                      <div className="font-mono text-xl font-bold text-[#F4A62A] tabular-nums mt-0.5">
                        {targetBand.toFixed(1)}
                      </div>
                      <div className="text-[10px] text-[#EEF3F1]/75 truncate">{examTrack}</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#F7F9F8] border border-[#D3DDDA]">
                      <div className="text-[11px] text-[#566664] font-medium">Priority #1</div>
                      <div className="text-base sm:text-lg font-bold text-[#0E1F1E] mt-0.5 truncate">
                        {WEAK_SKILL_META[weakestSkill].label}
                      </div>
                      <div className="text-[10px] text-[#0F4C45] font-semibold">40% daily focus</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#F7F9F8] border border-[#D3DDDA]">
                      <div className="text-[11px] text-[#566664] font-medium">Daily Sprint</div>
                      <div className="font-mono text-xl font-bold text-[#0E1F1E] tabular-nums mt-0.5">
                        {dailyMinutes}m
                      </div>
                      <div className="text-[10px] text-[#566664]">Zero commute</div>
                    </div>
                  </div>

                  {/* Weekly Allocation Bars */}
                  <div className="p-4 rounded-xl bg-[#F7F9F8] border border-[#D3DDDA] space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#0E1F1E]">Daily Time Allocation</span>
                      <span className="font-mono text-[#566664] tabular-nums">
                        {dailyMinutes} min/day
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      {skillAllocation.map((row) => (
                        <div key={row.skill} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className={row.isPriority ? 'font-bold text-[#0F4C45]' : 'font-medium text-[#0E1F1E]'}>
                              {row.label} {row.isPriority ? '· Priority Focus' : ''}
                            </span>
                            <span className="font-mono text-[#566664] tabular-nums">
                              {row.minsPerDay} min ({row.pct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-[#DCE6E3] overflow-hidden">
                            <div
                              className={`h-full rounded-full ${row.isPriority ? 'bg-[#F4A62A]' : 'bg-[#0F4C45]'}`}
                              style={{ width: `${row.pct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Savings & Coaching Advantage Reminder */}
                  <div className="p-3.5 rounded-xl bg-[#FDF6E7] border border-[#F4A62A]/40 flex items-start gap-2.5 text-xs text-[#6B4200]">
                    <ShieldCheck className="w-4 h-4 text-[#C27D0E] shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>Free Candidate Account included (৳0):</strong> 5 full mocks, 10-min 4-skill diagnostic, 2 daily AI Speaking + 1 AI Writing evaluation, and বাংলা trap explanations — save ৳15,000+ vs. offline coaching batches.
                    </p>
                  </div>

                  {/* Final Unlock CTA */}
                  <div className="space-y-3 pt-1">
                    <button
                      type="button"
                      onClick={() => handleFinish('register')}
                      className="w-full min-h-[52px] px-5 py-3 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white font-bold text-sm sm:text-base transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                    >
                      <span>Save My Plan &amp; Create Free Account</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleFinish('signin')}
                      className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-[#D3DDDA] bg-white hover:bg-[#EEF3F1] text-[#0E1F1E] text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                    >
                      Already have an account? Log in &amp; apply this plan
                    </button>
                  </div>
                </>
              )}

              {step === 6 && step6Error && (
                <p role="alert" className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5">
                  {step6Error}
                </p>
              )}

              {/* Bottom Step Navigation (Steps 1–6) */}
              {step < TOTAL_STEPS && (
                <div className="pt-2 flex items-center justify-between gap-3">
                  <div className="hidden sm:flex items-center gap-2 text-xs text-[#566664]">
                    <BandSprintMark size={18} />
                    <span>Takes under 60 seconds · No card needed</span>
                  </div>
                  <button
                    type="button"
                    onClick={goNext}
                    className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  >
                    <span>
                      {step === 5
                        ? 'Looks great — set my schedule'
                        : step === 6
                        ? 'Generate My Study Plan'
                        : 'Continue'}
                    </span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
