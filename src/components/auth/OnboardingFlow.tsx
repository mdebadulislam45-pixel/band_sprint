import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Headphones,
  BookOpen,
  PenTool,
  Mic,
  TrendingUp,
  Target,
  BarChart2,
  CheckCircle,
  Repeat,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Award,
  Zap,
  BookmarkCheck
} from 'lucide-react';
import { IELTSSprintLogo } from '../common/IELTSSprintLogo';

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface StepContent {
  headline: string;
  supportingText: string;
  visualType: 'modules' | 'analytics' | 'repetition';
  ctaText: string;
}

const STEPS: StepContent[] = [
  {
    headline: 'Practice with purpose.',
    supportingText:
      'Master Listening, Reading, Writing and Speaking with structured IELTS practice designed around your goals.',
    visualType: 'modules',
    ctaText: 'Continue'
  },
  {
    headline: 'Know exactly where you stand.',
    supportingText:
      'Track your performance, discover weak areas and understand your progress with clear Band 9 analytics.',
    visualType: 'analytics',
    ctaText: 'Continue'
  },
  {
    headline: 'Turn mistakes into progress.',
    supportingText:
      'Review difficult questions, strengthen vocabulary and practise smarter with intelligent repetition.',
    visualType: 'repetition',
    ctaText: 'Get Started'
  }
];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [direction, setDirection] = useState<number>(1);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  };

  const stepData = STEPS[currentStep];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-5 sm:p-8 max-w-md mx-auto relative overflow-hidden select-none">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-0 w-72 h-72 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header: Logo + Skip */}
      <header className="relative z-10 flex items-center justify-between pt-2">
        <IELTSSprintLogo variant="full" size="sm" className="text-white brightness-125" />
        <button
          type="button"
          onClick={onSkip}
          className="text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-full hover:bg-slate-800/60 transition active:scale-95"
        >
          Skip
        </button>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col justify-center py-6 my-auto">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
            className="flex flex-col items-center text-center space-y-6"
          >
            {/* Visual Container */}
            <div className="w-full max-w-xs mx-auto py-2">
              {stepData.visualType === 'modules' && <ModulesVisual />}
              {stepData.visualType === 'analytics' && <AnalyticsVisual />}
              {stepData.visualType === 'repetition' && <RepetitionVisual />}
            </div>

            {/* Typography */}
            <div className="space-y-2.5 max-w-sm px-2">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                {stepData.headline}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                {stepData.supportingText}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Controls: Dots Progress & Action CTAs */}
      <footer className="relative z-10 pt-4 pb-2 space-y-5">
        {/* Progress Indicator Dots */}
        <div className="flex items-center justify-center gap-2" role="tablist" aria-label="Onboarding Steps">
          {STEPS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              role="tab"
              aria-selected={idx === currentStep}
              aria-label={`Step ${idx + 1} of ${STEPS.length}`}
              onClick={() => {
                setDirection(idx > currentStep ? 1 : -1);
                setCurrentStep(idx);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentStep
                  ? 'w-7 bg-blue-500 shadow-sm shadow-blue-500/50'
                  : 'w-2 bg-slate-700 hover:bg-slate-600'
              }`}
            />
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={handlePrev}
              className="px-4 py-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs sm:text-sm border border-slate-700/60 transition active:scale-95"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 min-h-[50px] py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition active:scale-98"
          >
            <span>{stepData.ctaText}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
};

/**
 * Screen 1 Visual: 4 Cambridge IELTS Module Cards + Live progress
 */
function ModulesVisual() {
  const modules = [
    { name: 'Listening', icon: Headphones, band: 'Band 8.0', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30', text: 'text-blue-400' },
    { name: 'Reading', icon: BookOpen, band: 'Band 7.5', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
    { name: 'Writing', icon: PenTool, band: 'Band 7.0', color: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/30', text: 'text-purple-400' },
    { name: 'Speaking', icon: Mic, band: 'Band 8.5', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30', text: 'text-amber-400' }
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3 text-[11px] font-semibold text-slate-400">
        <span className="flex items-center gap-1.5 text-blue-400">
          <Sparkles className="w-3.5 h-3.5" /> Official Cambridge Model
        </span>
        <span className="font-mono text-emerald-400">Active Sprint</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {modules.map((m, idx) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * idx, duration: 0.3 }}
              className={`p-3 rounded-2xl bg-gradient-to-br ${m.color} border ${m.border} flex flex-col text-left`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-1.5 rounded-lg bg-slate-900/80 ${m.text}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-300">{m.band}</span>
              </div>
              <span className="text-xs font-bold text-white">{m.name}</span>
              <div className="w-full bg-slate-900/80 rounded-full h-1 mt-2 overflow-hidden">
                <div className="bg-white/80 h-full rounded-full" style={{ width: `${75 + idx * 6}%` }} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Screen 2 Visual: Band 9 Analytics Preview Card
 */
function AnalyticsVisual() {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl backdrop-blur-md text-left space-y-3">
      {/* Top Band Estimate Banner */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-slate-900 p-3 rounded-2xl border border-blue-500/30">
        <div>
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-blue-400">Estimated Band</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white">8.0</span>
            <span className="text-[11px] font-semibold text-emerald-400">+0.5 this week</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center font-black text-sm">
          C1
        </div>
      </div>

      {/* Micro-bars representing 4 skill diagnostics */}
      <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 text-[11px]">
        <div className="flex justify-between text-slate-400 mb-1">
          <span>Diagnostic Strengths</span>
          <span className="font-mono text-white">Target 8.5</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-300">Listening (Section 3 & 4)</span>
            <span className="text-emerald-400 font-mono font-bold">92%</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full w-[92%]" />
          </div>

          <div className="flex items-center justify-between text-[10px] pt-1">
            <span className="text-slate-300">Lexical Resource (Task 2)</span>
            <span className="text-blue-400 font-mono font-bold">85%</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full rounded-full w-[85%]" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Screen 3 Visual: Mistake Vault & Intelligent Spaced Repetition
 */
function RepetitionVisual() {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl backdrop-blur-md text-left space-y-2.5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-xs font-bold text-white flex items-center gap-1.5">
          <Repeat className="w-3.5 h-3.5 text-blue-400" /> Mistake Vault & Spaced Review
        </span>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
          3 Ready Today
        </span>
      </div>

      <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/80 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase text-blue-400 font-bold">C1 Collocation</span>
          <span className="text-[10px] text-slate-400">Review Interval: 3d</span>
        </div>
        <p className="text-xs font-bold text-white">«substantial contribution»</p>
        <p className="text-[10px] text-slate-300 italic">"make a substantial contribution to sustainable urban planning"</p>
      </div>

      <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 font-medium">
        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>Adaptive algorithm eliminates repeat errors</span>
      </div>
    </div>
  );
}
