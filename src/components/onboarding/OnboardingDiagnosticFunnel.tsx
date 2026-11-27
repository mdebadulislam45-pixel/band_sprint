import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ArrowRight,
  ArrowLeft,
  Target,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Award,
  Clock,
  Compass,
  DollarSign,
  TrendingUp,
  Brain,
  Globe,
  Lock,
  Layers,
  ChevronRight,
  Flame,
  Check
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { saveUser, getCurrentUser, createDefaultProgress, ACTIVE_USER_KEY } from '../../utils/userStorage';
import { UserProfile } from '../../types';
import { BarnabyCrest } from '../common/BarnabyCrest';
import { BARNABY_CORE_TAGLINE } from '../../types/barnaby';

interface OnboardingDiagnosticFunnelProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted: (userProfile: UserProfile) => void;
  onOpenAuthModal: () => void;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const OnboardingDiagnosticFunnel: React.FC<OnboardingDiagnosticFunnelProps> = ({
  isOpen,
  onClose,
  onCompleted,
  onOpenAuthModal
}) => {
  const [step, setStep] = useState<Step>(1);

  // Survey Data State
  const [purpose, setPurpose] = useState<string>('study');
  const [intendedFormat, setIntendedFormat] = useState<'Academic' | 'General Training'>('Academic');
  const [targetCountry, setTargetCountry] = useState<string>('United Kingdom');
  const [currentLevel, setCurrentLevel] = useState<number>(6.0);
  const [targetBand, setTargetBand] = useState<number>(7.5);
  const [timeline, setTimeline] = useState<string>('1-3months');
  const [painPoints, setPainPoints] = useState<string[]>(['writing_task2', 'speaking_fluency']);
  const [prepMethod, setPrepMethod] = useState<string>('coaching');

  // Calculation Animation State
  const [calcPhase, setCalcPhase] = useState<number>(0);
  const [calcDone, setCalcDone] = useState<boolean>(false);

  // Candidate quick details for profile activation
  const [candidateName, setCandidateName] = useState<string>('');
  const [candidateEmail, setCandidateEmail] = useState<string>('');
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    if (step === 6) {
      setCalcPhase(1);
      const t1 = setTimeout(() => {
        setCalcPhase(2);
        soundManager.playBeep(480, 0.05);
      }, 1000);
      const t2 = setTimeout(() => {
        setCalcPhase(3);
        soundManager.playBeep(560, 0.05);
      }, 2000);
      const t3 = setTimeout(() => {
        setCalcPhase(4);
        setCalcDone(true);
        soundManager.playSuccess();
        setTimeout(() => setStep(7), 800);
      }, 3100);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [step]);

  if (!isOpen) return null;

  const handleNext = () => {
    soundManager.playBeep(520, 0.03);
    if (step < 7) {
      setStep((prev) => (prev + 1) as Step);
    }
  };

  const handleBack = () => {
    soundManager.playBeep(440, 0.03);
    if (step > 1) {
      setStep((prev) => (prev - 1) as Step);
    }
  };

  const togglePainPoint = (point: string) => {
    soundManager.playBeep(500, 0.02);
    setPainPoints((prev) =>
      prev.includes(point) ? prev.filter((p) => p !== point) : [...prev, point]
    );
  };

  const handleActivatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = candidateEmail.trim().toLowerCase();

    if (!cleanEmail) {
      setEmailError('Please enter your email to save your study roadmap.');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setEmailError(null);
    soundManager.playSuccess();

    const finalName =
      candidateName.trim() ||
      cleanEmail
        .split('@')[0]
        .replace(/[._]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

    const existing = getCurrentUser();
    if (!existing || !existing.id || existing.id === 'default_candidate') {
      setEmailError('Please sign in with Google or your candidate password before activating a study plan.');
      return;
    }

    const updatedProfile: UserProfile = {
      ...existing,
      name: finalName || existing.name,
      progress: {
        ...createDefaultProgress(targetBand, finalName || existing.name),
        ...existing.progress,
        targetBand,
        intendedFormat,
        targetCountry,
        examDate:
          timeline === '1month'
            ? 'Within 30 Days'
            : timeline === '1-3months'
            ? 'Within 90 Days'
            : 'Within 6 Months',
        streakDays: Math.max(1, existing.progress?.streakDays || 1),
        lastActiveDate: new Date().toISOString().split('T')[0]
      }
    };

    saveUser(updatedProfile);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_USER_KEY, updatedProfile.id);
      localStorage.setItem('ielts_exam_mode', intendedFormat);
      localStorage.setItem('ielts_onboarding_completed', 'true');
    }

    window.dispatchEvent(new CustomEvent('user_auth_updated', { detail: updatedProfile }));
    window.dispatchEvent(new CustomEvent('ielts_exam_mode_changed', { detail: intendedFormat }));

    onCompleted(updatedProfile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto animate-fade-in text-slate-900 dark:text-slate-100">
        {/* Top Progress Track */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5">
          <div
            className="bg-blue-600 h-1.5 transition-all duration-300 ease-out"
            style={{ width: `${(step / 7) * 100}%` }}
          />
        </div>

        {/* Modal Header */}
        <div className="px-5 sm:px-8 pt-5 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
            <BarnabyCrest size={20} variant="badge" />
            <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
              STEP {step} OF 7
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {step === 1 && 'Purpose & Objectives'}
              {step === 2 && 'Exam Format & Destination'}
              {step === 3 && 'Band Targets & Timeline'}
              {step === 4 && 'Identify Specific Weaknesses'}
              {step === 5 && 'Benchmark & Cost Analysis'}
              {step === 6 && 'Synthesizing Custom Sprint'}
              {step === 7 && 'Your Personalized Sprint Roadmap'}
            </span>
            <span className="hidden sm:inline text-[11px] text-slate-400 dark:text-slate-500 italic">
              · {BARNABY_CORE_TAGLINE}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-8">
          <AnimatePresence mode="wait">
            {/* ================= STEP 1: PURPOSE ================= */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    What is your primary goal for taking the IELTS?
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    This tailors your simulation modules to meet official immigration or university standards.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {[
                    {
                      id: 'study',
                      title: 'Higher Education / Master’s',
                      desc: 'University admission (UK, Canada, Australia, USA, Germany)',
                      icon: '🎓'
                    },
                    {
                      id: 'immigration',
                      title: 'Permanent Residency (PR)',
                      desc: 'Express Entry (Canada), Subclass 189/190 (Australia)',
                      icon: '🍁'
                    },
                    {
                      id: 'job',
                      title: 'Professional Licensing & Work',
                      desc: 'Medical / Nursing (OET/IELTS 7.0+), Engineering, Corporate',
                      icon: '💼'
                    },
                    {
                      id: 'exploring',
                      title: 'Personal Benchmark',
                      desc: 'Evaluating current English proficiency with Practice standards',
                      icon: '📈'
                    }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setPurpose(item.id);
                        soundManager.playBeep(520, 0.02);
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        purpose === item.id
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="text-2xl mb-2">{item.icon}</div>
                      <div className="text-sm font-bold">{item.title}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {item.desc}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handleNext}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition flex items-center gap-1.5"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ================= STEP 2: MODULE & DESTINATION ================= */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Select Your Exam Module & Target Destination
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Academic and General Training use different Reading passages and Writing Task 1 criteria.
                  </p>
                </div>

                {/* Module Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Exam Format
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setIntendedFormat('Academic')}
                      className={`p-3.5 rounded-xl border text-left transition ${
                        intendedFormat === 'Academic'
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 font-bold text-blue-700 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="text-sm font-bold">Academic</div>
                      <div className="text-xs opacity-75 mt-0.5">Graphs/Charts Task 1 + Academic Texts</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIntendedFormat('General Training')}
                      className={`p-3.5 rounded-xl border text-left transition ${
                        intendedFormat === 'General Training'
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 font-bold text-blue-700 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="text-sm font-bold">General Training</div>
                      <div className="text-xs opacity-75 mt-0.5">Formal/Informal Letter + Workplace Texts</div>
                    </button>
                  </div>
                </div>

                {/* Destination Country */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Target Destination
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {[
                      { name: 'United Kingdom', flag: '🇬🇧' },
                      { name: 'Canada', flag: '🇨🇦' },
                      { name: 'Australia', flag: '🇦🇺' },
                      { name: 'United States', flag: '🇺🇸' },
                      { name: 'Germany / Europe', flag: '🇩🇪' },
                      { name: 'New Zealand / Ireland', flag: '🇳🇿' }
                    ].map((c) => (
                      <button
                        key={c.name}
                        onClick={() => setTargetCountry(c.name)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-medium flex items-center gap-2 transition ${
                          targetCountry === c.name
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-lg">{c.flag}</span>
                        <span className="truncate">{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <button
                    onClick={handleBack}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    onClick={handleNext}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition flex items-center gap-1.5"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ================= STEP 3: BAND TARGET & TIMELINE ================= */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    What is your target band and preparation timeline?
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    We will calibrate the difficulty of your daily Practice mock sessions accordingly.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Current Estimated Level */}
                  <div className="space-y-2 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Estimated Current Level
                    </label>
                    <div className="flex items-center justify-between font-mono font-bold text-2xl text-blue-600">
                      <span>Band {currentLevel.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="4.5"
                      max="7.5"
                      step="0.5"
                      value={currentLevel}
                      onChange={(e) => setCurrentLevel(parseFloat(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>4.5 (Modest)</span>
                      <span>6.0 (Competent)</span>
                      <span>7.5 (Good)</span>
                    </div>
                  </div>

                  {/* Target Band Goal */}
                  <div className="space-y-2 p-4 rounded-2xl border border-blue-500/40 bg-blue-50/20 dark:bg-blue-950/20">
                    <label className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      Target Band Goal
                    </label>
                    <div className="flex items-center justify-between font-mono font-bold text-2xl text-emerald-600 dark:text-emerald-400">
                      <span>Band {targetBand.toFixed(1)}</span>
                      <Award className="w-6 h-6" />
                    </div>
                    <input
                      type="range"
                      min="6.5"
                      max="9.0"
                      step="0.5"
                      value={targetBand}
                      onChange={(e) => setTargetBand(parseFloat(e.target.value))}
                      className="w-full accent-emerald-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>6.5 (Standard)</span>
                      <span>7.5 (Oxford / PR)</span>
                      <span>9.0 (Expert)</span>
                    </div>
                  </div>
                </div>

                {/* Timeline Selection */}
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Target Exam Timeline
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: '1month', label: 'Within 30 Days', badge: 'Intensive Sprint' },
                      { id: '1-3months', label: '1 to 3 Months', badge: 'Recommended' },
                      { id: '3-6months', label: '3 to 6 Months', badge: 'Foundation' }
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTimeline(t.id)}
                        className={`p-3 rounded-xl border text-center transition ${
                          timeline === t.id
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-xs font-bold">{t.label}</div>
                        <div className="text-[10px] opacity-75 mt-0.5">{t.badge}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <button
                    onClick={handleBack}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    onClick={handleNext}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition flex items-center gap-1.5"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ================= STEP 4: CURRENT HURDLES & PAIN POINTS ================= */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Which areas are holding you back from your target band?
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Select all that apply. We will configure your diagnostic focus drills.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      id: 'writing_task2',
                      title: 'Writing Task 2 Ideation & Structure',
                      desc: 'Struggling to organize essays, coherence and topic development'
                    },
                    {
                      id: 'speaking_fluency',
                      title: 'Speaking Fluency & Nervousness',
                      desc: 'Pauses, hesitation during Part 2 cue cards, limited idioms'
                    },
                    {
                      id: 'listening_section4',
                      title: 'Listening Part 4 Fast Speech',
                      desc: 'Losing track during academic lectures and multi-accent speakers'
                    },
                    {
                      id: 'reading_time_mgmt',
                      title: 'Reading Timing & TFNG Traps',
                      desc: 'Running out of time on Passage 3; confusing False vs Not Given'
                    },
                    {
                      id: 'vocab_range',
                      title: 'C1/C2 Academic Collocations',
                      desc: 'Repeating basic words (good, bad, increase, important)'
                    },
                    {
                      id: 'exam_anxiety',
                      title: 'Computer-Delivered Interface Unfamiliarity',
                      desc: 'Unsure how official Coach screen split and flags work'
                    }
                  ].map((item) => {
                    const isSelected = painPoints.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => togglePainPoint(item.id)}
                        className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-md mt-0.5 flex items-center justify-center border shrink-0 transition ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-bold">{item.title}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                            {item.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <button
                    onClick={handleBack}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    onClick={handleNext}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition flex items-center gap-1.5"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ================= STEP 5: COMPARISON & FINANCIAL LOSS AUDIT ================= */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    The Smart Way to Avoid IELTS Retake Traps
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Every missed 0.5 band costs thousands in retake fees and delays intake deadlines.
                  </p>
                </div>

                {/* Financial Loss-Aversion Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold text-xs uppercase font-mono tracking-wider text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Financial Loss-Aversion Audit</span>
                    </div>
                    <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      IELTS Registration Fee: <span className="text-rose-600 dark:text-rose-400">25,500+ BDT</span> per attempt
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Failing by just 0.5 band forces a complete retake or One Skill Retake (17,000+ BDT) + missing your university visa intake cycle.
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                      BandSprint: Free Tier — No Card Needed
                    </span>
                  </div>
                </div>

                {/* Dynamic Comparison Matrix */}
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 font-semibold border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="p-3">Method</th>
                        <th className="p-3">Cost</th>
                        <th className="p-3">CD-IELTS Practice Environment</th>
                        <th className="p-3">Speaking & Writing Scoring</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      <tr>
                        <td className="p-3 font-bold text-slate-500">Coaching Centers</td>
                        <td className="p-3 text-rose-600 font-mono">18,000–30,000 BDT</td>
                        <td className="p-3">Paper sheets only</td>
                        <td className="p-3">Slow (5–7 days return)</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-500">YouTube & PDFs</td>
                        <td className="p-3 font-mono">Free</td>
                        <td className="p-3">Static video, no timer</td>
                        <td className="p-3">Zero evaluation</td>
                      </tr>
                      <tr className="bg-blue-50/60 dark:bg-blue-950/40 font-bold text-blue-900 dark:text-blue-100">
                        <td className="p-3 flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                          <Sparkles className="w-4 h-4" />
                          <span>BandSprint</span>
                        </td>
                        <td className="p-3 text-emerald-600 dark:text-emerald-400 font-mono">Free Tier</td>
                        <td className="p-3 text-emerald-600 dark:text-emerald-400">1:1 Coach Simulation</td>
                        <td className="p-3 text-emerald-600 dark:text-emerald-400">Instant AI British Examiner</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <button
                    onClick={handleBack}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    onClick={handleNext}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition flex items-center gap-1.5"
                  >
                    <span>Generate My Sprint Plan</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ================= STEP 6: ANIMATED SYNTHESIS ================= */}
            {step === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 flex flex-col items-center justify-center text-center space-y-6"
              >
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-200 dark:border-blue-950 animate-ping opacity-25" />
                  <div className="w-full h-full rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
                  <Brain className="w-8 h-8 text-blue-600 absolute inset-0 m-auto" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Synthesizing Your Custom Sprint...
                  </h3>
                  <div className="text-xs sm:text-sm font-mono text-blue-600 dark:text-blue-400">
                    {calcPhase === 1 && 'Analyzing diagnostic profile and gap to Band ' + targetBand.toFixed(1) + '...'}
                    {calcPhase === 2 && 'Calibrating IELTS Practice Library Academic and General Training suites...'}
                    {calcPhase === 3 && 'Generating prioritized 8-Week sprint curriculum...'}
                    {calcPhase === 4 && 'Curriculum ready! Finalizing roadmap snapshot...'}
                  </div>
                </div>

                <div className="w-full max-w-xs bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-700"
                    style={{ width: `${(calcPhase / 4) * 100}%` }}
                  />
                </div>
              </motion.div>
            )}

            {/* ================= STEP 7: PERSONALIZED PLAN SNAPSHOT & ACTIVATION ================= */}
            {step === 7 && (
              <motion.div
                key="step7"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold font-mono uppercase tracking-wider mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Plan Calibrated for Band {targetBand.toFixed(1)}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Your {timeline === '1month' ? '4-Week Intensive' : '8-Week Target'} BandSprint Roadmap
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Structured specifically for {intendedFormat} to qualify for {targetCountry}.
                  </p>
                </div>

                {/* Milestone Roadmap Snapshot */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <div className="text-[10px] font-mono font-bold text-blue-600 uppercase">Phase 1: Baseline</div>
                    <div className="text-xs font-bold mt-1">Diagnostic Full-Mock</div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Identify exact question types causing loss in Reading & Listening.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <div className="text-[10px] font-mono font-bold text-amber-600 uppercase">Phase 2: Leverage</div>
                    <div className="text-xs font-bold mt-1">Writing & Speaking Drills</div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Master Part 2 cue cards and Band 9 Task 2 cohesion formulas.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20">
                    <div className="text-[10px] font-mono font-bold text-emerald-600 uppercase">Phase 3: Peak</div>
                    <div className="text-xs font-bold mt-1">1:1 CD-IELTS Simulation</div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Full exam room pacing under strict Coach timers.
                    </p>
                  </div>
                </div>

                {/* Fast Activation Form */}
                <form
                  onSubmit={handleActivatePlan}
                  className="p-5 rounded-2xl border border-blue-500/30 bg-blue-50/30 dark:bg-blue-950/30 space-y-3.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                      Activate & Save Your Personalized Sprint
                    </div>
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      Free Tier · Instant Access
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Candidate Full Name
                      </label>
                      <input
                        type="text"
                        value={candidateName}
                        onChange={(e) => setCandidateName(e.target.value)}
                        placeholder="e.g. Md Ebadul Islam"
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Gmail / Candidate Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={candidateEmail}
                        onChange={(e) => {
                          setCandidateEmail(e.target.value);
                          if (emailError) setEmailError(null);
                        }}
                        placeholder="candidate@gmail.com"
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  {emailError && (
                    <div className="text-xs text-rose-600 font-medium">{emailError}</div>
                  )}

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Zero spam. Progress synced securely to Firebase Cloud.</span>
                    </div>

                    <button
                      type="submit"
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-1.5"
                    >
                      <span>Activate & Start Sprint</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
