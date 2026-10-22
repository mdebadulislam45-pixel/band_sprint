import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Award,
  Calendar,
  Layers,
  Clock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Target
} from 'lucide-react';
import { IELTSSprintLogo } from '../common/IELTSSprintLogo';
import { UserProfile } from '../../types';
import { updateCurrentUserProfile } from '../../utils/userStorage';

interface PersonalizationFlowProps {
  user: UserProfile;
  onComplete: () => void;
}

export const PersonalizationFlow: React.FC<PersonalizationFlowProps> = ({ user, onComplete }) => {
  // Screens: 1 (Target Band), 2 (Exam Timeline), 3 (Focus Area), 4 (Practice Daily), 5 (Ready Summary)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [targetBand, setTargetBand] = useState<number>(user.progress.targetBand || 7.5);
  const [examTimeline, setExamTimeline] = useState<string>('1–3 months');
  const [focusModule, setFocusModule] = useState<string>('Writing');
  const [dailyTime, setDailyTime] = useState<string>('30 minutes');

  const totalQuestions = 4;

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleFinish = () => {
    // Persist personalization in user profile
    updateCurrentUserProfile({
      targetBand,
      examDate: examTimeline
    });

    // Mark personalization complete in localStorage
    try {
      localStorage.setItem(`ielts_personalized_${user.id}`, 'true');
    } catch {}

    onComplete();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-5 sm:p-8 max-w-md mx-auto relative overflow-hidden select-none">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header with Progress Bar */}
      <header className="relative z-10 pt-2 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          {currentStep > 1 && currentStep < 5 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-8" />
          )}

          <IELTSSprintLogo variant="full" size="sm" className="brightness-125" />

          {currentStep < 5 ? (
            <span className="text-xs font-mono font-bold text-slate-400">
              {currentStep}/{totalQuestions}
            </span>
          ) : (
            <div className="w-8" />
          )}
        </div>

        {/* Linear Step Bar */}
        {currentStep < 5 && (
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <motion.div
              className="bg-blue-500 h-full rounded-full"
              initial={false}
              animate={{ width: `${(currentStep / totalQuestions) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}
      </header>

      {/* Dynamic Question Body */}
      <main className="relative z-10 flex-1 flex flex-col justify-center py-4">
        <AnimatePresence mode="wait">
          {/* Screen 1: Target Band */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-5 text-left"
            >
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400">
                  Step 1 of 4
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  What's your target band?
                </h1>
                <p className="text-xs sm:text-sm text-slate-400">
                  Most university and immigration visas require Band 6.5 to 8.0.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {[6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0].map(band => (
                  <button
                    key={band}
                    type="button"
                    onClick={() => {
                      setTargetBand(band);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between ${
                      targetBand === band
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <span className="text-lg font-black font-mono block">Band {band.toFixed(1)}</span>
                      <span className="text-[10px] text-slate-400">
                        {band >= 8.0 ? 'Expert' : band >= 7.0 ? 'Good User' : 'Competent'}
                      </span>
                    </div>
                    {targetBand === band && <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Screen 2: Timeline */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-5 text-left"
            >
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400">
                  Step 2 of 4
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  When are you planning to take IELTS?
                </h1>
                <p className="text-xs sm:text-sm text-slate-400">
                  This helps calibrate your daily revision frequency and mock cadence.
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  { id: 'Within 1 month', desc: 'Intensive daily sprints' },
                  { id: '1–3 months', desc: 'Recommended standard pacing' },
                  { id: '3–6 months', desc: 'Comprehensive foundation building' },
                  { id: '6+ months', desc: 'Long-term fluency & mastery' },
                  { id: 'Not decided', desc: 'General skill enhancement' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setExamTimeline(item.id)}
                    className={`w-full p-4 rounded-2xl border text-left transition flex items-center justify-between ${
                      examTimeline === item.id
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <span className="text-sm font-bold block text-white">{item.id}</span>
                      <span className="text-[11px] text-slate-400">{item.desc}</span>
                    </div>
                    {examTimeline === item.id && <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Screen 3: Weakness Focus Area */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-5 text-left"
            >
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400">
                  Step 3 of 4
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Which module needs the most improvement?
                </h1>
                <p className="text-xs sm:text-sm text-slate-400">
                  We will prioritize targeted diagnostic labs for this section.
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  { id: 'Writing', desc: 'Task 1 visual summaries & Task 2 essays' },
                  { id: 'Speaking', desc: 'Fluency, pronunciation & Part 2 cue cards' },
                  { id: 'Reading', desc: 'Speed reading & True/False/Not Given traps' },
                  { id: 'Listening', desc: 'Accents, spelling & Section 3/4 lectures' },
                  { id: 'Not sure', desc: 'Take initial diagnostic test across all 4' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFocusModule(item.id)}
                    className={`w-full p-4 rounded-2xl border text-left transition flex items-center justify-between ${
                      focusModule === item.id
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <span className="text-sm font-bold block text-white">{item.id}</span>
                      <span className="text-[11px] text-slate-400">{item.desc}</span>
                    </div>
                    {focusModule === item.id && <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Screen 4: Daily Commitment */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-5 text-left"
            >
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400">
                  Step 4 of 4
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  How much time can you practise each day?
                </h1>
                <p className="text-xs sm:text-sm text-slate-400">
                  Consistency builds long-term memory far more effectively than cramming.
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  { id: '15 minutes', desc: 'Quick vocabulary & 1 audio section' },
                  { id: '30 minutes', desc: '1 core module + daily mistake review' },
                  { id: '45 minutes', desc: 'Balanced multi-skill practice' },
                  { id: '1 hour', desc: 'Rigorous complete exam preparation' },
                  { id: '1+ hour', desc: 'Full mock simulation + deep analysis' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDailyTime(item.id)}
                    className={`w-full p-4 rounded-2xl border text-left transition flex items-center justify-between ${
                      dailyTime === item.id
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <span className="text-sm font-bold block text-white">{item.id}</span>
                      <span className="text-[11px] text-slate-400">{item.desc}</span>
                    </div>
                    {dailyTime === item.id && <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Screen 5: Plan Ready Summary */}
          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
              className="space-y-6 text-center"
            >
              <div className="w-16 h-16 rounded-3xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto shadow-inner">
                <Target className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Your IELTS plan is ready 🎯
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 max-w-xs mx-auto">
                  We've created a starting point based on your goals.
                </p>
              </div>

              {/* Summary Card */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 text-left space-y-3 shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                  <span className="text-slate-400">Target Score:</span>
                  <span className="font-mono font-bold text-white bg-blue-500/20 border border-blue-500/30 px-2.5 py-0.5 rounded-lg text-blue-300">
                    Band {targetBand.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                  <span className="text-slate-400">Timeline:</span>
                  <span className="font-bold text-white">{examTimeline}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                  <span className="text-slate-400">Primary Focus:</span>
                  <span className="font-bold text-emerald-400">{focusModule} Module</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Daily Goal:</span>
                  <span className="font-bold text-purple-400">{dailyTime}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer CTA */}
      <footer className="relative z-10 pt-4 pb-2">
        {currentStep < 5 ? (
          <button
            type="button"
            onClick={handleNext}
            className="w-full min-h-[50px] py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition active:scale-98"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            className="w-full min-h-[52px] py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition active:scale-98"
          >
            <span>Start Practising</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </footer>
    </div>
  );
};
