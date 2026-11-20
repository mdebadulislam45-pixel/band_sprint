import React, { useState } from 'react';
import {
  BarChart3,
  History,
  BookmarkCheck,
  Calendar,
  ArrowRight,
  Target,
  Printer,
  LucideIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { soundManager } from '../../utils/audioEffects';
import { UserProfile } from '../../types';
import { loadDiagnosticResult } from '../../services/diagnosticResultStore';
import { PrintablePracticeReportModal } from '../reports/PrintablePracticeReportModal';
import {
  AnimatedNumber,
  StaggerGroup,
  StaggerItem,
  SPRING_SNAPPY,
  EASE_EDITORIAL
} from '../common/MotionPrimitives';

// Embedded Performance & Quick-Tool Widgets
import { AIBandScorecard } from '../home/AIBandScorecard';
import { AISpeakingPartnerCard } from '../home/AISpeakingPartnerCard';
import { AIWritingQuickEvaluator } from '../home/AIWritingQuickEvaluator';
import { ProgressDonutCard } from '../home/ProgressDonutCard';
import { SkillMasteryMatrix } from '../home/SkillMasteryMatrix';
import { BandProjectorCard } from '../home/BandProjectorCard';
import { MistakeVaultWidget } from '../home/MistakeVaultWidget';
import { ExamPacingStrategyCard } from '../home/ExamPacingStrategyCard';
import { AcademicCollocationFinder } from '../home/AcademicCollocationFinder';
import { PracticeHeatmap } from '../home/PracticeHeatmap';
import { AITutorWidget } from '../home/AITutorWidget';
import { SmartRecommendationBanner } from '../home/SmartRecommendationBanner';

interface ProgressItem {
  id: string;
  path: string;
  title: string;
  shortName: string;
  description: string;
  icon: LucideIcon;
  meta: string;
}

interface ProgressPageProps {
  onNavigate: (path: string) => void;
  onShowToast: (msg: string) => void;
  onOpenBandModal: () => void;
  onOpenVault?: () => void;
  user?: UserProfile | null;
  mistakeCount?: number;
}

type ProgressTab = 'readiness' | 'skills' | 'tools';

export const ProgressPage: React.FC<ProgressPageProps> = ({
  onNavigate,
  onShowToast,
  onOpenBandModal,
  onOpenVault,
  user,
  mistakeCount = 0
}) => {
  const [activeTab, setActiveTab] = useState<ProgressTab>('readiness');
  const [showPrintReport, setShowPrintReport] = useState(false);
  const diagnostic = loadDiagnosticResult();

  const examMode = user?.progress?.intendedFormat || 'Academic';
  const targetBand = user?.progress?.targetBand || 7.5;
  const streakDays = user?.progress?.streakDays || 1;
  const estimatedBand = diagnostic ? diagnostic.scores.overall : 0;

  const destinations: ProgressItem[] = [
    {
      id: 'analytics',
      path: '/progress/analytics',
      title: 'Candidate Analytics',
      shortName: 'Analytics',
      description: 'Skill-by-skill score breakdown across Listening, Reading, Writing & Speaking.',
      icon: BarChart3,
      meta: 'Band Trends'
    },
    {
      id: 'history',
      path: '/progress/history',
      title: 'Practice History',
      shortName: 'History',
      description: 'Archive of completed mock exams, drills, and AI evaluation feedback.',
      icon: History,
      meta: 'Attempt Log'
    },
    {
      id: 'saved',
      path: '/progress/saved',
      title: 'Mistake Vault',
      shortName: 'Vault',
      description: 'Spaced-repetition review queue of missed questions and weak grammar patterns.',
      icon: BookmarkCheck,
      meta: mistakeCount > 0 ? `${mistakeCount} Unmastered` : 'All Clear'
    },
    {
      id: 'calendar',
      path: '/progress/calendar',
      title: 'Sprint Calendar',
      shortName: 'Calendar',
      description: 'Daily study activity log, active streak history, and exam countdown.',
      icon: Calendar,
      meta: `${streakDays}d Streak`
    }
  ];

  const tabs: Array<{ id: ProgressTab; label: string }> = [
    { id: 'readiness', label: 'Band & Readiness' },
    { id: 'skills', label: 'Skills & Activity' },
    { id: 'tools', label: 'Quick AI & Drills' }
  ];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Unified BandSprint Pine Header */}
      <section className="rounded-2xl bg-[#0F4C45] text-white p-5 sm:p-7 border border-[#0B3833] space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#F4A62A] font-semibold">
              Progress &amp; Diagnostics · {examMode}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Track your gap to Band {targetBand.toFixed(1)}
            </h1>
            <p className="text-xs sm:text-sm text-[#EEF3F1]/80 leading-relaxed">
              Review score trends, revisit logged mistakes in your spaced-repetition vault, and keep daily momentum steady.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(620, 0.035);
                setShowPrintReport(true);
              }}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#F4A62A] hover:bg-[#D0891F] text-[#0E1F1E] font-bold text-xs transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              <span>Export Practice Report (PDF)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(600, 0.035);
                onOpenBandModal();
              }}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-xs transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Target className="w-4 h-4 text-[#F4A62A]" />
              <span>Update Target Band</span>
            </button>
          </div>
        </div>

        {/* Clean Tabular Summary Strip */}
        <div className="pt-4 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#EEF3F1]/65">
              Target Band
            </div>
            <div className="font-mono font-bold text-base text-[#F4A62A] tabular-nums">
              <AnimatedNumber value={targetBand} decimals={1} />
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#EEF3F1]/65">
              Diagnostic Est.
            </div>
            <div className="font-mono font-bold text-base text-white tabular-nums">
              {estimatedBand > 0 ? <AnimatedNumber value={estimatedBand} decimals={1} /> : 'Not taken'}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#EEF3F1]/65">
              Mistake Vault
            </div>
            <div className="font-mono font-bold text-base text-white tabular-nums">
              <AnimatedNumber value={mistakeCount} decimals={0} /> {mistakeCount === 1 ? 'item' : 'items'}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#EEF3F1]/65">
              Current Streak
            </div>
            <div className="font-mono font-bold text-base text-white tabular-nums">
              <AnimatedNumber value={streakDays} decimals={0} /> {streakDays === 1 ? 'day' : 'days'}
            </div>
          </div>
        </div>
      </section>

      {/* 4 Dedicated Progress Views */}
      <StaggerGroup className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5" stagger={0.055}>
        {destinations.map((item) => {
          const Icon = item.icon;
          return (
            <StaggerItem key={item.id}>
              <button
                type="button"
                onClick={() => {
                  soundManager.playBeep(600, 0.035);
                  onNavigate(item.path);
                }}
                className="w-full h-full p-4 rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 hover:border-[#0F4C45] dark:hover:border-[#F4A62A]/70 card-interactive text-left flex flex-col justify-between space-y-3 group cursor-pointer min-h-[136px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C45]"
              >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="w-9 h-9 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 flex items-center justify-center text-[#0F4C45] dark:text-[#F4A62A]">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-[#566664] dark:text-slate-400 tabular-nums">
                    {item.meta}
                  </span>
                </div>
                <div className="space-y-1">
                  <h2 className="font-display text-sm font-bold text-[#0E1F1E] dark:text-white group-hover:text-[#0F4C45] dark:group-hover:text-[#F4A62A] transition">
                    {item.title}
                  </h2>
                  <p className="text-xs text-[#566664] dark:text-slate-400 leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                </div>
              </div>
              <div className="text-xs font-semibold text-[#0F4C45] dark:text-[#F4A62A] flex items-center gap-1">
                <span>View {item.shortName}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
              </button>
            </StaggerItem>
          );
        })}
      </StaggerGroup>

      {/* Segmented Workspace for Embedded Diagnostic Widgets */}
      <section className="space-y-5 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D3DDDA] dark:border-[#1F8A70]/25 pb-3">
          <h2 className="font-display text-base font-bold text-[#0E1F1E] dark:text-white">
            Diagnostic Workspace
          </h2>
          <div className="inline-flex rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] p-1 border border-[#D3DDDA] dark:border-[#1F8A70]/25">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    soundManager.playBeep(560, 0.03);
                    setActiveTab(tab.id);
                  }}
                  className={`relative px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'text-white'
                      : 'text-[#566664] dark:text-slate-300 hover:text-[#0E1F1E] dark:hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="progress-workspace-tab-pill"
                      transition={SPRING_SNAPPY}
                      className="absolute inset-0 rounded-lg bg-[#0F4C45]"
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: EASE_EDITORIAL }}
          >

        {activeTab === 'readiness' && (
          <div className="space-y-5 animate-fade-in">
            <SmartRecommendationBanner
              onNavigate={onNavigate}
              onShowToast={onShowToast}
              targetBand={targetBand}
              estimatedBand={estimatedBand}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ProgressDonutCard onNavigate={onNavigate} />
              <AIBandScorecard
                onNavigate={onNavigate}
                onOpenBandModal={onOpenBandModal}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BandProjectorCard
                currentTargetBand={targetBand}
                examMode={examMode}
                onOpenBandModal={onOpenBandModal}
              />
              <MistakeVaultWidget
                onNavigate={onNavigate}
                onOpenVault={onOpenVault || (() => onNavigate('/progress/saved'))}
              />
            </div>
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="space-y-5 animate-fade-in">
            <SkillMasteryMatrix onNavigate={onNavigate} examMode={examMode} />
            <PracticeHeatmap onNavigate={onNavigate} />
            <ExamPacingStrategyCard
              onNavigate={onNavigate}
              onShowToast={onShowToast}
            />
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="space-y-5 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AISpeakingPartnerCard
                onNavigate={onNavigate}
                onShowToast={onShowToast}
              />
              <AIWritingQuickEvaluator
                onNavigate={onNavigate}
                onShowToast={onShowToast}
              />
            </div>

            <AcademicCollocationFinder
              onNavigate={onNavigate}
              onShowToast={onShowToast}
            />

            <AITutorWidget
              userName={user?.name || 'Candidate'}
              onNavigateToAITools={() => onNavigate('/practice/ai-tools')}
              onShowToast={onShowToast}
            />
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </section>

      <PrintablePracticeReportModal
        isOpen={showPrintReport}
        onClose={() => setShowPrintReport(false)}
        user={user}
        onShowToast={onShowToast}
      />
    </div>
  );
};
