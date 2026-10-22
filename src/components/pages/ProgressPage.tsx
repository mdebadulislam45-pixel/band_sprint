import React, { useState } from 'react';
import {
  TrendingUp,
  Award,
  Headphones,
  BookOpen,
  Mic,
  PenTool,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Archive,
  Calendar,
  Sparkles,
  Target,
  BarChart3,
  Zap,
  Flame,
  Trophy
} from 'lucide-react';
import { UserProfile, ExamHistoryRecord } from '../../types';
import { questionEngine } from '../../services/QuestionEngine';
import { soundManager } from '../../utils/audioEffects';
import { getMistakes } from '../../utils/vaultStorage';
import { isFullMockExamRecord } from '../../utils/userStorage';

import {
  evaluateAchievements,
  getGamificationStats,
  AchievementBadge
} from '../../services/achievementService';
import { AchievementsSection } from '../progress/AchievementsSection';
import { IELTSSpeedBlitzModal } from '../progress/IELTSSpeedBlitzModal';

interface ProgressPageProps {
  user?: UserProfile | null;
  mistakeCount: number;
  onNavigate: (page: string) => void;
  onOpenVault: () => void;
  onOpenBandModal: () => void;
}

export const ProgressPage: React.FC<ProgressPageProps> = ({
  user,
  mistakeCount,
  onNavigate,
  onOpenVault,
  onOpenBandModal
}) => {
  const [isBlitzOpen, setIsBlitzOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Compute live achievement badges and user gamification XP/levels
  const badges: AchievementBadge[] = React.useMemo(() => {
    return evaluateAchievements(user, mistakeCount);
  }, [user, mistakeCount, refreshKey]);

  const gamification = React.useMemo(() => {
    return getGamificationStats(badges, user);
  }, [badges, user]);
  // recordExamAttempt() prepends with unshift(), so index 0 is the newest attempt
  const history: ExamHistoryRecord[] = user?.progress?.examHistory || [];
  const fullMockHistory = history.filter((h) => isFullMockExamRecord(h));
  const latestFullExam = fullMockHistory.length > 0 ? fullMockHistory[0] : null;
  const latestListeningExam =
    history.find((h) => typeof h.listeningBand === 'number' && h.listeningBand > 0) || null;
  const latestReadingExam =
    fullMockHistory.find((h) => typeof h.readingBand === 'number' && h.readingBand > 0) || null;
  const latestWritingExam =
    fullMockHistory.find((h) => typeof h.writingBand === 'number' && h.writingBand > 0) || null;
  const latestSpeakingExam =
    history.find((h) => typeof h.speakingBand === 'number' && h.speakingBand > 0) || null;

  // Retrieve real attempts and stats from QuestionEngine
  const qAttempts = questionEngine.getHistory();
  const listeningStats = questionEngine.getModuleStats('listening');
  const readingStats = questionEngine.getModuleStats('reading');
  const speakingStats = questionEngine.getModuleStats('speaking');
  const writingStats = questionEngine.getModuleStats('writing');

  // Total questions from both mock exams and practice labs
  const mockQuestionsCount = history.reduce((acc, h) => acc + (h.totalQuestions || 0), 0);
  const mockCorrectCount = history.reduce((acc, h) => acc + (h.correctCount || 0), 0);
  const practiceQuestionsCount = qAttempts.length;
  const practiceCorrectCount = qAttempts.filter((a) => a.isCorrect).length;

  const totalQuestionsAnswered = mockQuestionsCount + practiceQuestionsCount;
  const totalCorrect = mockCorrectCount + practiceCorrectCount;
  const hasAnyAttempts = totalQuestionsAnswered > 0;

  const accuracy = hasAnyAttempts ? Math.round((totalCorrect / totalQuestionsAnswered) * 100) : 0;

  // Calculate real skill band estimates without treating Listening-only attempts as fake 0 Reading/Writing scores
  const listeningBand =
    latestListeningExam?.listeningBand ??
    (listeningStats.totalAttempted > 0 ? listeningStats.estimatedBand : null);
  const readingBand =
    latestReadingExam?.readingBand ??
    (readingStats.totalAttempted > 0 ? readingStats.estimatedBand : null);
  const writingBand =
    latestWritingExam?.writingBand ??
    (writingStats.totalAttempted > 0 ? writingStats.estimatedBand : null);
  const speakingBand =
    latestSpeakingExam?.speakingBand ??
    (speakingStats.totalAttempted > 0 ? speakingStats.estimatedBand : null);

  const availableBands = [listeningBand, readingBand, writingBand, speakingBand].filter(
    (b): b is number => typeof b === 'number'
  );
  // Only display an overall IELTS band when a full mock exam was completed or all 4 skills have bands
  const overallBand =
    latestFullExam && typeof latestFullExam.overallBand === 'number' && latestFullExam.overallBand > 0
      ? latestFullExam.overallBand
      : availableBands.length === 4
      ? Math.round((availableBands.reduce((a, b) => a + b, 0) / 4) * 2) / 2
      : null;

  const targetBand = user?.progress?.targetBand || 7.5;

  const skills = [
    {
      name: 'Listening',
      band: listeningBand,
      attempted: listeningStats.totalAttempted,
      accuracy: listeningStats.overallAccuracy,
      icon: Headphones,
      color: 'text-blue-600',
      bg: 'bg-blue-500',
      route: 'listening'
    },
    {
      name: 'Reading',
      band: readingBand,
      attempted: readingStats.totalAttempted,
      accuracy: readingStats.overallAccuracy,
      icon: BookOpen,
      color: 'text-emerald-600',
      bg: 'bg-emerald-500',
      route: 'reading'
    },
    {
      name: 'Writing',
      band: writingBand,
      attempted: writingStats.totalAttempted,
      accuracy: writingStats.overallAccuracy,
      icon: PenTool,
      color: 'text-purple-600',
      bg: 'bg-purple-500',
      route: 'writing'
    },
    {
      name: 'Speaking',
      band: speakingBand,
      attempted: speakingStats.totalAttempted,
      accuracy: speakingStats.overallAccuracy,
      icon: Mic,
      color: 'text-rose-600',
      bg: 'bg-rose-500',
      route: 'speaking'
    }
  ];

  const testedSkills = skills.filter((s) => typeof s.band === 'number');
  const sortedSkills = [...testedSkills].sort((a, b) => (a.band || 0) - (b.band || 0));
  const weakestSkill = sortedSkills.length > 0 ? sortedSkills[0] : skills[0];
  const strongestSkill = sortedSkills.length > 0 ? sortedSkills[sortedSkills.length - 1] : skills[skills.length - 1];

  // Real Question-Type Performance Matrix
  const questionTypeStats = React.useMemo(() => {
    const defaultTypes = [
      { type: 'Multiple Choice (Distractor Traps)', module: 'listening', route: 'listening' },
      { type: 'True / False / Not Given', module: 'reading', route: 'reading' },
      { type: 'Matching Headings & Summary', module: 'reading', route: 'reading' },
      { type: 'Directional Map Labelling', module: 'listening', route: 'listening' },
      { type: 'Task 2 PESTLE Essay Matrix', module: 'writing', route: 'writing' },
      { type: 'Part 2 Cue Card Monologue', module: 'speaking', route: 'speaking' }
    ];

    const typeMap: Record<string, { attempted: number; correct: number; module: string; route: string }> = {};
    defaultTypes.forEach((t) => {
      typeMap[t.type] = { attempted: 0, correct: 0, module: t.module, route: t.route };
    });

    qAttempts.forEach((att) => {
      const key = att.questionType || 'Standard Item';
      if (!typeMap[key]) {
        typeMap[key] = { attempted: 0, correct: 0, module: att.module, route: att.module };
      }
      typeMap[key].attempted++;
      if (att.isCorrect) typeMap[key].correct++;
    });

    return Object.entries(typeMap).map(([name, data]) => {
      const rate = data.attempted > 0 ? Math.round((data.correct / data.attempted) * 100) : null;
      return {
        name,
        attempted: data.attempted,
        correct: data.correct,
        accuracy: rate,
        module: data.module,
        route: data.route
      };
    });
  }, [qAttempts]);

  // Real Mistake Vault Categorization
  const vaultMistakes = React.useMemo(() => getMistakes(), []);
  const unmasteredList = React.useMemo(() => vaultMistakes.filter((m) => !m.mastered), [vaultMistakes]);

  const mistakesByCategory = React.useMemo(() => {
    const cats: Record<string, { count: number; sampleTitle: string; route: string }> = {};
    unmasteredList.forEach((m) => {
      const category = m.module.toUpperCase();
      if (!cats[category]) {
        cats[category] = { count: 0, sampleTitle: m.title, route: m.module };
      }
      cats[category].count++;
    });
    return cats;
  }, [unmasteredList]);


  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Top Banner */}
      <div className="bg-[#101B32] text-white p-6 sm:p-8 rounded-3xl shadow-md border border-slate-700/80">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold uppercase tracking-wider mb-2 inline-block border border-blue-400/30">
              PERFORMANCE ANALYTICS
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              My IELTS Progress
            </h1>
            <p className="text-xs sm:text-sm text-blue-200 mt-1 max-w-md">
              Comprehensive analytics, band score breakdown, and personalized recommendations based on your test history.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-2xl border border-white/10 text-center min-w-[90px]">
              <div className="text-[10px] uppercase font-bold text-blue-200">Current Band</div>
              <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
                {overallBand ? overallBand.toFixed(1) : '—'}
              </div>
              <div className="text-[9px] text-blue-200/80 mt-0.5">
                {overallBand ? 'Diagnostic' : 'Untested'}
              </div>
            </div>
            <div className="p-3 bg-white/10 rounded-2xl border border-white/10 text-center min-w-[90px]">
              <div className="text-[10px] uppercase font-bold text-blue-200">Target Band</div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                {targetBand.toFixed(1)}
              </div>
              <div className="text-[9px] text-blue-200/80 mt-0.5">Target</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Skill Performance Bars */}
      <div className="bg-white dark:bg-[#101B32] rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              Skill-by-Skill Band Estimates
            </h2>
            <p className="text-xs text-slate-500">Based on recent simulations and diagnostic tests</p>
          </div>

          <button
            onClick={onOpenBandModal}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition"
          >
            OSR Calculator →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {skills.map((skill) => {
            const Icon = skill.icon;
            const hasBand = typeof skill.band === 'number';
            const percentage = hasBand ? (skill.band! / 9.0) * 100 : 0;
            return (
              <div
                key={skill.name}
                onClick={() => onNavigate(skill.route)}
                className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:border-slate-300 transition cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-white text-slate-800 flex items-center justify-center shadow-2xs">
                      <Icon className={`w-4 h-4 ${skill.color}`} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">{skill.name}</span>
                      <span className="text-[10px] text-slate-400">
                        {skill.attempted > 0 ? `${skill.attempted} practice items` : 'No attempts yet'}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-black text-sm text-slate-900">
                    {hasBand ? `Band ${skill.band!.toFixed(1)}` : 'Untested'}
                  </span>
                </div>

                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${skill.bg} rounded-full transition-all duration-700`}
                    style={{ width: `${Math.max(percentage, 5)}%` }}
                  ></div>
                </div>

                <div className="text-[10px] text-slate-400 flex justify-between font-mono pt-0.5">
                  <span>Band 0.0</span>
                  <span>Target: {targetBand.toFixed(1)}</span>
                  <span>Band 9.0</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white dark:bg-[#101B32] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs text-center space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            Tests Done
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
            {fullMockHistory.length}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">Full mock tests</div>
        </div>

        <div className="p-4 bg-white dark:bg-[#101B32] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs text-center space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            Questions Answered
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-700 dark:text-blue-400 font-mono">
            {totalQuestionsAnswered}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">Listening & Reading</div>
        </div>

        <div className="p-4 bg-white dark:bg-[#101B32] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs text-center space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            Accuracy Rate
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {accuracy}%
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">Correct answers</div>
        </div>

        <div
          onClick={onOpenVault}
          className="p-4 bg-amber-50/80 hover:bg-amber-100/70 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 rounded-2xl border border-amber-200 dark:border-amber-800 shadow-2xs text-center space-y-1 cursor-pointer transition"
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 font-mono">
            Mistake Vault
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-900 dark:text-amber-200 font-mono">
            {mistakeCount}
          </div>
          <div className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">Saved traps & mistakes →</div>
        </div>
      </div>

      {/* QUESTION-TYPE ACCURACY MATRIX */}
      <div className="bg-white dark:bg-[#101B32] rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Question-Type Accuracy Matrix
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Direct breakdown across Cambridge format types. Tap any type to launch targeted practice.
            </p>
          </div>
          <span className="text-[10px] font-mono text-slate-400 uppercase">
            {qAttempts.length} Total Logs
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {questionTypeStats.map((item) => (
            <button
              key={item.name}
              onClick={() => onNavigate(item.route)}
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 text-left transition flex flex-col justify-between space-y-2 group cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2 w-full">
                <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                  {item.name}
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 uppercase shrink-0">
                  {item.module}
                </span>
              </div>

              <div className="space-y-1 w-full">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-500 dark:text-slate-400">Accuracy</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {item.accuracy !== null ? `${item.accuracy}%` : 'Untested'}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.accuracy === null
                        ? 'bg-slate-300 dark:bg-slate-600'
                        : item.accuracy >= 75
                        ? 'bg-emerald-500'
                        : item.accuracy >= 50
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${item.accuracy !== null ? Math.max(item.accuracy, 8) : 0}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700/60 w-full">
                <span>{item.attempted} attempts ({item.correct} correct)</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold group-hover:underline">
                  Practice →
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* MISTAKE HEATMAP & PRIORITY REVISION */}
      <div className="bg-white dark:bg-[#101B32] rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4 text-amber-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Recurring Error Heatmap ({unmasteredList.length} Items to Master)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Spaced repetition review prioritized by failure frequency
              </p>
            </div>
          </div>
          <button
            onClick={onOpenVault}
            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline transition"
          >
            Open Vault →
          </button>
        </div>

        {Object.keys(mistakesByCategory).length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(mistakesByCategory).map(([cat, info]) => (
              <div
                key={cat}
                className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-900 dark:text-amber-200 uppercase font-mono">
                      {cat}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-mono font-bold text-[10px]">
                      {info.count} error{info.count > 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                    Recent: "{info.sampleTitle}"
                  </p>
                </div>

                <button
                  onClick={() => onNavigate(info.route)}
                  className="w-full mt-2 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition text-center"
                >
                  Drill {cat} Mistakes →
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-center space-y-1">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto" />
            <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
              Mistake Vault is 100% Clear!
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 max-w-sm mx-auto">
              You have mastered all previously saved traps. Continue practicing to discover fresh edge cases.
            </p>
          </div>
        )}
      </div>

      {/* ACHIEVEMENTS & VIRTUAL BADGES SECTION */}
      <AchievementsSection

        badges={badges}
        gamification={gamification}
        onNavigate={onNavigate}
        onRefreshBadges={() => setRefreshKey((k) => k + 1)}
        onOpenSpeedBlitz={() => setIsBlitzOpen(true)}
      />

      {/* Weakness & Recommended Practice */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 rounded-3xl border border-indigo-100 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">
            Recommended Practice Plan
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-bold uppercase">Focus Area: {weakestSkill.name}</span>
            </div>
            <p className="text-xs text-slate-600">
              Your lowest current estimated score is in <strong>{weakestSkill.name} ({typeof weakestSkill.band === 'number' ? `Band ${weakestSkill.band.toFixed(1)}` : 'Untested'})</strong>. Dedicated practice will give you the quickest jump toward Band {targetBand.toFixed(1)}.
            </p>
            <button
              onClick={() => onNavigate(weakestSkill.route)}
              className="mt-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition inline-flex items-center gap-1.5"
            >
              Start {weakestSkill.name} Lab →
            </button>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-bold uppercase">Strongest Area: {strongestSkill.name}</span>
            </div>
            <p className="text-xs text-slate-600">
              You are performing best in <strong>{strongestSkill.name} ({typeof strongestSkill.band === 'number' ? `Band ${strongestSkill.band.toFixed(1)}` : 'Untested'})</strong>. Maintain momentum by solving full-length mock tests.
            </p>
            <button
              onClick={() => onNavigate('mocktest')}
              className="mt-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition inline-flex items-center gap-1.5"
            >
              Take Full Mock Exam →
            </button>
          </div>
        </div>

        {/* Question History & Spaced Review Button */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-indigo-200/60">
          <span className="text-xs text-indigo-900 font-medium">
            Review every past answer, check accuracy, and practice spaced review questions:
          </span>
          <button
            onClick={() => onNavigate('history')}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
          >
            <span>Question Attempt History ({qAttempts.length}) →</span>
          </button>
        </div>
      </div>

      {/* Speed Blitz & Daily Examiner Trivia Modal */}
      <IELTSSpeedBlitzModal
        isOpen={isBlitzOpen}
        onClose={() => setIsBlitzOpen(false)}
        onRewardXp={() => {
          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
};
