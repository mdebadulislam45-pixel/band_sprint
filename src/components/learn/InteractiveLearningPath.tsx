import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  BookOpen,
  Check,
  Compass,
  Layers,
  Mic,
  PenTool,
  Target,
  Trophy,
} from 'lucide-react';
import type { UserProfile } from '../../types';
import type { DiagnosticResult } from '../../services/diagnosticResultStore';
import {
  DAILY_SPRINT_SAVED_EVENT,
  DAILY_SPRINT_SYNCED_EVENT,
  DailySprintProgressState,
  loadDailySprintProgress,
} from '../../utils/dailySprintProgressStore';
import { triggerBarnabyCelebration } from '../../utils/barnabyStateEngine';
import { audioManager } from '../../services/AudioManager';

export const LEARNING_PATH_STORAGE_KEY = 'bandsprint_learning_path_completed_v1';
export const LEARNING_PATH_UPDATED_EVENT = 'bandsprint_learning_path_updated';

export type LearningPathNodeStatus = 'completed' | 'in_progress' | 'upcoming';

export interface LearningPathNode {
  id: string;
  stepNumber: number;
  title: string;
  shortTitle: string;
  bandMilestone: string;
  path: string;
  status: LearningPathNodeStatus;
  progressPct: number;
  summary: string;
  criterionFocus: string;
  actionLabel: string;
  canManualToggle: boolean;
  /** SVG coordinates in 960 x 240 viewBox */
  x: number;
  y: number;
}

export interface ComputeLearningPathInput {
  diagnostic: DiagnosticResult | null;
  user: UserProfile | null;
  sprint: DailySprintProgressState;
  currentEstimate: number | null;
  targetBand: number;
  manualCompletedIds: string[];
}

export function loadManualLearningPathIds(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LEARNING_PATH_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string')
      : [];
  } catch {
    return [];
  }
}

export function saveManualLearningPathIds(ids: string[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LEARNING_PATH_STORAGE_KEY, JSON.stringify(ids));
    }
  } catch {
    // ignore storage errors
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<string[]>(LEARNING_PATH_UPDATED_EVENT, { detail: ids })
    );
  }
}

/**
 * Pure computation of the 7-stage evolving Band 8.0 Learning Path map.
 * Derives live completion from Diagnostic, Daily Sprint progress, Exam History,
 * and manually confirmed milestones so the Framer Motion line reflects real mastery.
 */
export function computeLearningPathNodes(
  input: ComputeLearningPathInput
): {
  nodes: LearningPathNode[];
  completedCount: number;
  /** 0..1 fraction along the full SVG curve representing the furthest continuous/earned progress */
  lineProgress: number;
  goalBand: number;
} {
  const goalBand = Math.max(8.0, Number((input.targetBand || 8.0).toFixed(1)));
  const manualSet = new Set(input.manualCompletedIds);
  const completedMods = new Set(input.user?.progress?.completedModules || []);
  const examHistory = input.user?.progress?.examHistory || [];
  const sprint = input.sprint;

  const diagDone = Boolean(input.diagnostic) || manualSet.has('diagnostic');

  const vocabAndPhraseCount =
    sprint.masteredVocabIds.length +
    sprint.masteredPhraseIds.length +
    sprint.masteredIdiomIds.length;
  const vocabTarget = sprint.quotaTier === 'standard' ? 20 : 10;
  const vocabPct = Math.min(100, Math.round((vocabAndPhraseCount / vocabTarget) * 100));
  const vocabDone =
    vocabPct >= 100 ||
    manualSet.has('vocabulary') ||
    completedMods.has('vocabulary') ||
    Boolean(sprint.lastExamSummary);

  const grammarTarget = sprint.quotaTier === 'standard' ? 6 : 4;
  const grammarPct = Math.min(100, Math.round((sprint.masteredGrammarIds.length / grammarTarget) * 100));
  const grammarDone =
    grammarPct >= 100 || manualSet.has('grammar') || completedMods.has('grammar');

  const spellingTarget = sprint.quotaTier === 'standard' ? 20 : 12;
  const spellingPct = Math.min(100, Math.round((sprint.masteredSpellingIds.length / spellingTarget) * 100));
  const spellingDone =
    spellingPct >= 100 || manualSet.has('spelling') || completedMods.has('spelling');

  const speakingSessions = examHistory.filter(
    (e) =>
      e.examType === 'speaking_only' ||
      e.examType === 'full_mock' ||
      Boolean(e.completedSkills?.speaking) ||
      typeof e.speakingBand === 'number'
  ).length;
  const shadowingPct = Math.min(
    100,
    Math.round(
      ((Math.min(6, sprint.masteredIdiomIds.length) / 6) * 50) +
        (speakingSessions > 0 ? 50 : 0)
    )
  );
  const shadowingDone =
    shadowingPct >= 100 || manualSet.has('shadowing') || completedMods.has('shadowing');

  const writingSessions = examHistory.filter(
    (e) =>
      e.examType === 'writing_only' ||
      e.examType === 'full_mock' ||
      Boolean(e.completedSkills?.writing) ||
      typeof e.writingBand === 'number'
  ).length;
  const modelPct = writingSessions >= 2 ? 100 : writingSessions === 1 ? 55 : 0;
  const modelDone =
    modelPct >= 100 || manualSet.has('model-answers') || completedMods.has('model-answers');

  const currentBand = input.currentEstimate ?? 0;
  const band8Pct =
    input.currentEstimate !== null
      ? Math.min(100, Math.round((currentBand / goalBand) * 100))
      : 0;
  const band8Done =
    (input.currentEstimate !== null && input.currentEstimate >= goalBand) ||
    manualSet.has('band8-goal');

  const rawDefs: Array<Omit<LearningPathNode, 'status'> & { isDone: boolean }> = [
    {
      id: 'diagnostic',
      stepNumber: 1,
      title: 'Baseline Diagnostic',
      shortTitle: 'Diagnostic',
      bandMilestone: '5.5',
      path: '/learn/diagnostic',
      isDone: diagDone,
      progressPct: diagDone ? 100 : 0,
      summary: input.diagnostic
        ? `Calibrated at Band ${input.diagnostic.scores.overall.toFixed(1)} · Priority focus: ${input.diagnostic.weakest}.`
        : 'Take the 10-minute 4-skill diagnostic to map your starting band and weakest criterion.',
      criterionFocus: '4-Skill Baseline & Target Calibration',
      actionLabel: diagDone ? 'Review Diagnostic' : 'Start Diagnostic',
      canManualToggle: true,
      x: 72,
      y: 168,
    },
    {
      id: 'vocabulary',
      stepNumber: 2,
      title: 'Daily Sprint & Vocabulary',
      shortTitle: 'Vocab Core',
      bandMilestone: '6.5',
      path: '/learn/daily-sprint',
      isDone: vocabDone,
      progressPct: vocabDone ? 100 : vocabPct,
      summary:
        vocabAndPhraseCount > 0
          ? `${vocabAndPhraseCount} lexical targets mastered in your Daily Sprint deck.`
          : 'Build B2–C2 academic words, collocations, and Bangla-supported active recall.',
      criterionFocus: 'Lexical Resource (LR)',
      actionLabel: 'Open Daily Sprint',
      canManualToggle: true,
      x: 210,
      y: 84,
    },
    {
      id: 'grammar',
      stepNumber: 3,
      title: 'Complex Grammar Lab',
      shortTitle: 'Grammar',
      bandMilestone: '7.0',
      path: '/learn/grammar',
      isDone: grammarDone,
      progressPct: grammarDone ? 100 : grammarPct,
      summary:
        sprint.masteredGrammarIds.length > 0
          ? `${sprint.masteredGrammarIds.length} Band 8+ grammar structures locked in.`
          : 'Master inversion, complex conditionals, and error-free subordinate clauses.',
      criterionFocus: 'Grammatical Range & Accuracy (GRA)',
      actionLabel: 'Open Grammar Lab',
      canManualToggle: true,
      x: 356,
      y: 170,
    },
    {
      id: 'spelling',
      stepNumber: 4,
      title: 'Spelling & Listening Precision',
      shortTitle: 'Spelling',
      bandMilestone: '7.0+',
      path: '/learn/spelling',
      isDone: spellingDone,
      progressPct: spellingDone ? 100 : spellingPct,
      summary:
        sprint.masteredSpellingIds.length > 0
          ? `${sprint.masteredSpellingIds.length} high-trap Listening spelling words verified.`
          : 'Eliminate easy mark losses from double consonants, plurals, and dictation traps.',
      criterionFocus: 'Listening Orthography & Accuracy',
      actionLabel: 'Open Spelling Lab',
      canManualToggle: true,
      x: 502,
      y: 82,
    },
    {
      id: 'shadowing',
      stepNumber: 5,
      title: 'Shadowing & Speaking Fluency',
      shortTitle: 'Shadowing',
      bandMilestone: '7.5',
      path: '/learn/shadowing',
      isDone: shadowingDone,
      progressPct: shadowingDone ? 100 : shadowingPct,
      summary:
        speakingSessions > 0
          ? `${speakingSessions} Speaking sitting(s) logged with cadence & idiom drills.`
          : 'Train connected speech, natural idioms, and Part 2/3 stress-test stamina.',
      criterionFocus: 'Fluency, Coherence & Pronunciation',
      actionLabel: 'Open Shadowing Lab',
      canManualToggle: true,
      x: 648,
      y: 170,
    },
    {
      id: 'model-answers',
      stepNumber: 6,
      title: 'Band 9 Model Answers',
      shortTitle: 'Models',
      bandMilestone: '7.5+',
      path: '/learn/model-answers',
      isDone: modelDone,
      progressPct: modelDone ? 100 : modelPct,
      summary:
        writingSessions > 0
          ? `${writingSessions} timed Writing submission(s) benchmarked against examiner rubrics.`
          : 'Dissect Task 1 overviews, Task 2 cohesive progression, and Band 9 lexical upgrades.',
      criterionFocus: 'Task Response & Coherence (TR / CC)',
      actionLabel: 'Study Model Answers',
      canManualToggle: true,
      x: 786,
      y: 84,
    },
    {
      id: 'band8-goal',
      stepNumber: 7,
      title: `Band ${goalBand.toFixed(1)} Exam Mastery`,
      shortTitle: `Band ${goalBand.toFixed(1)}`,
      bandMilestone: goalBand.toFixed(1),
      path: '/practice/mock-tests',
      isDone: band8Done,
      progressPct: band8Done ? 100 : band8Pct,
      summary:
        input.currentEstimate !== null
          ? input.currentEstimate >= goalBand
            ? `Goal achieved at Band ${input.currentEstimate.toFixed(1)}—keep razor sharp with timed mocks.`
            : `Currently at Band ${input.currentEstimate.toFixed(1)} (${Math.max(
                0,
                goalBand - input.currentEstimate
              ).toFixed(1)} band to Band ${goalBand.toFixed(1)}).`
          : `Complete a full CD-IELTS mock sitting to validate Band ${goalBand.toFixed(1)} readiness.`,
      criterionFocus: 'Full 4-Skill Timed Exam Readiness',
      actionLabel: 'Launch Full Mock',
      canManualToggle: false,
      x: 896,
      y: 146,
    },
  ];

  // Assign status: first non-completed node becomes 'in_progress' frontier
  let frontierAssigned = false;
  const nodes: LearningPathNode[] = rawDefs.map((def) => {
    let status: LearningPathNodeStatus;
    if (def.isDone) {
      status = 'completed';
    } else if (!frontierAssigned || def.progressPct > 0) {
      status = 'in_progress';
      frontierAssigned = true;
    } else {
      status = 'upcoming';
    }
    const { isDone: _ignored, ...node } = def;
    return { ...node, status };
  });

  const completedCount = nodes.filter((n) => n.status === 'completed').length;

  // Determine how far the Framer Motion connecting line should draw (0..1):
  // Connects seamlessly through the furthest completed node plus partial advance into the active frontier.
  const segmentsTotal = Math.max(1, nodes.length - 1);
  let furthestCompletedIdx = -1;
  nodes.forEach((n, idx) => {
    if (n.status === 'completed') furthestCompletedIdx = idx;
  });

  const activeFrontierIdx = nodes.findIndex((n) => n.status === 'in_progress');
  let progressSegments = Math.max(0, furthestCompletedIdx);
  if (activeFrontierIdx > furthestCompletedIdx && activeFrontierIdx > 0) {
    const frontierFrac = Math.min(0.85, Math.max(0.15, nodes[activeFrontierIdx].progressPct / 100));
    progressSegments = Math.min(
      segmentsTotal,
      Math.max(progressSegments, activeFrontierIdx - 1 + frontierFrac)
    );
  } else if (furthestCompletedIdx === 0 && nodes.length > 1) {
    progressSegments = 0.25;
  }

  const lineProgress = Math.max(
    0,
    Math.min(1, Number((progressSegments / segmentsTotal).toFixed(3)))
  );

  return { nodes, completedCount, lineProgress, goalBand };
}

/** Builds a smooth cubic Bézier path passing cleanly through every node coordinate. */
function buildSmoothPathD(nodes: LearningPathNode[]): string {
  if (nodes.length === 0) return '';
  let d = `M ${nodes[0].x} ${nodes[0].y}`;
  for (let i = 0; i < nodes.length - 1; i++) {
    const p0 = nodes[i];
    const p1 = nodes[i + 1];
    const midX = (p0.x + p1.x) / 2;
    d += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

const NODE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  diagnostic: Target,
  vocabulary: BookOpen,
  grammar: PenTool,
  spelling: Layers,
  shadowing: Mic,
  'model-answers': Award,
  'band8-goal': Trophy,
};

interface InteractiveLearningPathProps {
  diagnostic: DiagnosticResult | null;
  user: UserProfile | null;
  currentEstimate: number | null;
  targetBand: number;
  onNavigate: (path: string) => void;
  onShowToast?: (msg: string) => void;
}

export const InteractiveLearningPath: React.FC<InteractiveLearningPathProps> = ({
  diagnostic,
  user,
  currentEstimate,
  targetBand,
  onNavigate,
  onShowToast,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [sprintState, setSprintState] = useState<DailySprintProgressState>(() =>
    loadDailySprintProgress()
  );
  const [manualCompletedIds, setManualCompletedIds] = useState<string[]>(() =>
    loadManualLearningPathIds()
  );

  useEffect(() => {
    const refreshSprint = () => setSprintState(loadDailySprintProgress());
    const refreshManual = () => setManualCompletedIds(loadManualLearningPathIds());
    window.addEventListener(DAILY_SPRINT_SAVED_EVENT, refreshSprint);
    window.addEventListener(DAILY_SPRINT_SYNCED_EVENT, refreshSprint);
    window.addEventListener(LEARNING_PATH_UPDATED_EVENT, refreshManual);
    return () => {
      window.removeEventListener(DAILY_SPRINT_SAVED_EVENT, refreshSprint);
      window.removeEventListener(DAILY_SPRINT_SYNCED_EVENT, refreshSprint);
      window.removeEventListener(LEARNING_PATH_UPDATED_EVENT, refreshManual);
    };
  }, []);

  const { nodes, completedCount, lineProgress, goalBand } = useMemo(
    () =>
      computeLearningPathNodes({
        diagnostic,
        user,
        sprint: sprintState,
        currentEstimate,
        targetBand,
        manualCompletedIds,
      }),
    [diagnostic, user, sprintState, currentEstimate, targetBand, manualCompletedIds]
  );

  const defaultSelectedId = useMemo(() => {
    const frontier = nodes.find((n) => n.status === 'in_progress');
    return frontier ? frontier.id : nodes[nodes.length - 1]?.id || 'diagnostic';
  }, [nodes]);

  const [selectedNodeId, setSelectedNodeId] = useState<string>(defaultSelectedId);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || nodes[0],
    [nodes, selectedNodeId]
  );

  const pathD = useMemo(() => buildSmoothPathD(nodes), [nodes]);
  const overallMapPct = Math.round((completedCount / nodes.length) * 100);

  const handleToggleManualComplete = (node: LearningPathNode) => {
    if (!node.canManualToggle) return;
    const exists = manualCompletedIds.includes(node.id);
    const next = exists
      ? manualCompletedIds.filter((id) => id !== node.id)
      : [...manualCompletedIds, node.id];
    setManualCompletedIds(next);
    saveManualLearningPathIds(next);
    audioManager.playUiClick(exists ? 'soft' : 'check');
    if (!exists) {
      triggerBarnabyCelebration(`Milestone cleared: ${node.title}`);
      onShowToast?.(`"${node.title}" marked complete — your Band ${goalBand.toFixed(1)} path advanced.`);
    } else {
      onShowToast?.(`"${node.title}" moved back to active practice.`);
    }
  };

  return (
    <section
      data-testid="interactive-learning-path"
      aria-label={`Interactive Learning Path to Band ${goalBand.toFixed(1)}`}
      className="rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/35 p-5 sm:p-6 space-y-5"
    >
      {/* Header Zone: Clean Editorial Title + Tabular Progress Summary (Zero Pill Clutter) */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-[#EEF3F1] dark:border-[#1F8A70]/25">
        <div className="space-y-1">
          <div className="text-xs font-medium text-[#0F4C45] dark:text-[#F4A62A] flex items-center gap-2">
            <span>Band {goalBand.toFixed(1)} Roadmap</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {completedCount}/{nodes.length} milestones complete
            </span>
          </div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-[#0E1F1E] dark:text-white tracking-tight text-balance">
            Your Evolving Learning Path to Band {goalBand.toFixed(1)}
          </h2>
          <p className="text-xs text-[#566664] dark:text-slate-400 max-w-2xl leading-relaxed">
            Select any milestone node on the map to inspect criteria focus, launch the module, or log completion as your line advances toward Band {goalBand.toFixed(1)}.
          </p>
        </div>

        <div className="flex items-baseline gap-4 shrink-0 text-right">
          <div>
            <div className="text-[11px] text-[#566664] dark:text-slate-400">Path Completion</div>
            <div className="font-mono text-xl font-bold text-[#0F4C45] dark:text-[#6EE7B7] tabular-nums">
              {overallMapPct}%
            </div>
          </div>
          <div className="h-7 w-px bg-[#D3DDDA] dark:bg-[#1F8A70]/30" aria-hidden="true" />
          <div>
            <div className="text-[11px] text-[#566664] dark:text-slate-400">Current Est.</div>
            <div className="font-mono text-xl font-bold text-[#0E1F1E] dark:text-[#F4A62A] tabular-nums">
              {currentEstimate !== null ? currentEstimate.toFixed(1) : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Zone 1: Desktop Interactive SVG Serpentine Map with Framer Motion Drawn Line */}
      <div className="hidden md:block relative rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#E2EAE7] dark:border-[#1F8A70]/25 px-3 py-4 overflow-hidden">
        <div className="relative w-full" style={{ aspectRatio: '960 / 245' }}>
          <svg
            viewBox="0 0 960 245"
            className="w-full h-full overflow-visible"
            role="img"
            aria-label={`Learning path curve showing ${completedCount} of ${nodes.length} completed milestones toward Band ${goalBand.toFixed(1)}`}
          >
            <defs>
              <linearGradient id="bandsprintPathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0F4C45" />
                <stop offset="68%" stopColor="#1F8A70" />
                <stop offset="100%" stopColor="#F4A62A" />
              </linearGradient>
            </defs>

            {/* Subtle horizontal band elevation reference guides */}
            <line
              x1="36"
              y1="84"
              x2="924"
              y2="84"
              stroke="currentColor"
              className="text-[#D3DDDA]/60 dark:text-[#1F8A70]/20"
              strokeWidth="1"
              strokeDasharray="3 6"
            />
            <line
              x1="36"
              y1="170"
              x2="924"
              y2="170"
              stroke="currentColor"
              className="text-[#D3DDDA]/60 dark:text-[#1F8A70]/20"
              strokeWidth="1"
              strokeDasharray="3 6"
            />

            {/* Uncompleted Track Base Line */}
            <path
              d={pathD}
              fill="none"
              stroke="currentColor"
              className="text-[#CBD8D4] dark:text-[#1F8A70]/35"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="6 7"
            />

            {/* Framer Motion Animated Connecting Progress Line */}
            <motion.path
              data-testid="learning-path-animated-line"
              d={pathD}
              fill="none"
              stroke="url(#bandsprintPathGrad)"
              strokeWidth="5"
              strokeLinecap="round"
              initial={{ pathLength: prefersReducedMotion ? lineProgress : 0 }}
              animate={{ pathLength: lineProgress }}
              transition={{
                duration: prefersReducedMotion ? 0 : 1.05,
                ease: [0.16, 1, 0.3, 1],
              }}
            />

            {/* Soft outer luminous halo along completed segment */}
            <motion.path
              d={pathD}
              fill="none"
              stroke="url(#bandsprintPathGrad)"
              strokeOpacity="0.22"
              strokeWidth="12"
              strokeLinecap="round"
              initial={{ pathLength: prefersReducedMotion ? lineProgress : 0 }}
              animate={{ pathLength: lineProgress }}
              transition={{
                duration: prefersReducedMotion ? 0 : 1.15,
                ease: [0.16, 1, 0.3, 1],
              }}
            />
          </svg>

          {/* Interactive HTML Milestone Buttons anchored cleanly to exact SVG node percentages */}
          {nodes.map((node, index) => {
            const Icon = NODE_ICONS[node.id] || Compass;
            const isSelected = selectedNode.id === node.id;
            const isCompleted = node.status === 'completed';
            const isInProgress = node.status === 'in_progress';
            const leftPct = `${(node.x / 960) * 100}%`;
            const topPct = `${(node.y / 245) * 100}%`;
            const labelAbove = node.y > 130;

            return (
              <motion.button
                key={node.id}
                type="button"
                data-testid={`learning-path-node-${node.id}`}
                data-node-status={node.status}
                onClick={() => {
                  audioManager.playUiClick('soft');
                  setSelectedNodeId(node.id);
                }}
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.3,
                  delay: prefersReducedMotion ? 0 : index * 0.055,
                  ease: [0.16, 1, 0.3, 1],
                }}
                whileHover={prefersReducedMotion ? undefined : { scale: 1.08 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.96 }}
                style={{ left: leftPct, top: topPct }}
                aria-pressed={isSelected}
                aria-label={`Step ${node.stepNumber}: ${node.title}, Band ${node.bandMilestone}, ${
                  isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Up Next'
                }`}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer focus-visible:outline-none"
              >
                {/* Node Circle */}
                <div
                  className={`relative w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors ${
                    isCompleted
                      ? 'bg-[#0F4C45] border-[#0F4C45] text-white'
                      : isInProgress
                      ? 'bg-white dark:bg-[#11201E] border-[#F4A62A] text-[#0F4C45] dark:text-[#F4A62A]'
                      : 'bg-white dark:bg-[#11201E] border-[#CBD8D4] dark:border-[#1F8A70]/45 text-[#566664] dark:text-slate-400'
                  } ${
                    isSelected
                      ? 'ring-4 ring-[#F4A62A]/35 shadow-md'
                      : 'group-hover:border-[#0F4C45] dark:group-hover:border-[#F4A62A]'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5 stroke-[2.5] text-[#F4A62A]" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>

                {/* Unboxed Label & Band Numeral */}
                <div
                  className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center pointer-events-none ${
                    labelAbove ? '-top-11' : 'top-14'
                  }`}
                >
                  <div className="font-mono text-[10px] font-bold text-[#0F4C45] dark:text-[#F4A62A] tabular-nums">
                    Band {node.bandMilestone}
                  </div>
                  <div
                    className={`text-xs font-semibold leading-tight ${
                      isSelected
                        ? 'text-[#0E1F1E] dark:text-white'
                        : 'text-[#566664] dark:text-slate-300'
                    }`}
                  >
                    {node.shortTitle}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Mobile / Small Screen Vertical Animated Timeline */}
      <div className="md:hidden relative pl-6 space-y-3">
        <div
          className="absolute left-2.5 top-3 bottom-3 w-0.5 bg-[#D3DDDA] dark:bg-[#1F8A70]/30 rounded-full"
          aria-hidden="true"
        />
        <motion.div
          aria-hidden="true"
          className="absolute left-2.5 top-3 bottom-3 w-0.5 bg-gradient-to-b from-[#0F4C45] via-[#1F8A70] to-[#F4A62A] rounded-full origin-top"
          initial={{ scaleY: prefersReducedMotion ? lineProgress : 0 }}
          animate={{ scaleY: lineProgress }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.9, ease: [0.16, 1, 0.3, 1] }}
        />

        {nodes.map((node) => {
          const isSelected = selectedNode.id === node.id;
          const isCompleted = node.status === 'completed';
          const isInProgress = node.status === 'in_progress';
          return (
            <button
              key={node.id}
              type="button"
              onClick={() => {
                audioManager.playUiClick('soft');
                setSelectedNodeId(node.id);
              }}
              className={`relative w-full text-left p-3 rounded-xl border transition cursor-pointer ${
                isSelected
                  ? 'bg-[#EEF3F1] dark:bg-[#0B1514] border-[#0F4C45] dark:border-[#F4A62A]'
                  : 'bg-[#FAFBF9] dark:bg-[#0B1514]/70 border-[#D3DDDA] dark:border-[#1F8A70]/25'
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute -left-[22px] top-4 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  isCompleted
                    ? 'bg-[#0F4C45] border-[#0F4C45] text-[#F4A62A]'
                    : isInProgress
                    ? 'bg-white dark:bg-[#11201E] border-[#F4A62A]'
                    : 'bg-white dark:bg-[#11201E] border-[#CBD8D4] dark:border-[#1F8A70]/45'
                }`}
              >
                {isCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </span>

              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#0E1F1E] dark:text-white">
                  0{node.stepNumber}. {node.title}
                </span>
                <span className="font-mono text-[11px] font-bold text-[#0F4C45] dark:text-[#F4A62A] tabular-nums shrink-0">
                  Band {node.bandMilestone}
                </span>
              </div>
              <div className="text-[11px] text-[#566664] dark:text-slate-400 mt-0.5">
                {isCompleted ? 'Completed' : isInProgress ? `In Progress · ${node.progressPct}%` : 'Up Next'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Zone 2: Selected Milestone Inspector & Direct Action Deck */}
      <AnimatePresence mode="wait">
        {selectedNode && (
          <motion.div
            key={selectedNode.id}
            data-testid="learning-path-inspector"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="pt-4 border-t border-[#EEF3F1] dark:border-[#1F8A70]/25 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
          >
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#566664] dark:text-slate-400">
                <span className="font-mono font-bold text-[#0F4C45] dark:text-[#F4A62A] tabular-nums">
                  Milestone 0{selectedNode.stepNumber} · Band {selectedNode.bandMilestone}
                </span>
                <span aria-hidden="true">·</span>
                <span>{selectedNode.criterionFocus}</span>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-[#0E1F1E] dark:text-white">
                  {selectedNode.status === 'completed'
                    ? 'Completed'
                    : selectedNode.status === 'in_progress'
                    ? `In Progress (${selectedNode.progressPct}%)`
                    : 'Up Next'}
                </span>
              </div>
              <h3 className="font-display text-base font-bold text-[#0E1F1E] dark:text-white">
                {selectedNode.title}
              </h3>
              <p className="text-xs text-[#566664] dark:text-slate-300 leading-relaxed max-w-2xl">
                {selectedNode.summary}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {selectedNode.canManualToggle && (
                <button
                  type="button"
                  data-testid="learning-path-toggle-complete"
                  onClick={() => handleToggleManualComplete(selectedNode)}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[#D3DDDA] dark:border-[#1F8A70]/35 bg-[#F7F9F8] dark:bg-[#0B1514] hover:border-[#0F4C45] dark:hover:border-[#F4A62A] text-[#0E1F1E] dark:text-[#EEF3F1] text-xs font-semibold transition inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 text-[#0F4C45] dark:text-[#F4A62A]" />
                  <span>
                    {manualCompletedIds.includes(selectedNode.id)
                      ? 'Unmark Complete'
                      : 'Mark Milestone Complete'}
                  </span>
                </button>
              )}

              <button
                type="button"
                data-testid="learning-path-launch-btn"
                onClick={() => {
                  audioManager.playUiClick('check');
                  onNavigate(selectedNode.path);
                }}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs font-semibold transition inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <span>{selectedNode.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#F4A62A]" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
