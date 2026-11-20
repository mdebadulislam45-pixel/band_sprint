import React, { useMemo, useState } from 'react';
import {
  ShieldAlert,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { DiagnosticSkill } from '../../services/diagnosticResultStore';

interface AIWeaknessDetectorProps {
  onNavigate: (module: string) => void;
  onShowToast?: (msg: string) => void;
  weakestSkill?: DiagnosticSkill | null;
}

interface TrapItem {
  id: string;
  skill: DiagnosticSkill;
  route: string;
  moduleName: string;
  trapTitle: string;
  description: string;
  bandImpact: string;
  remedy: string;
  drillTitle: string;
}

const IELTS_TRAPS: TrapItem[] = [
  {
    id: 'reading_tfng_trap',
    skill: 'reading',
    route: '/practice/reading',
    moduleName: 'Reading',
    trapTitle: 'FALSE vs. NOT GIVEN inference trap',
    description:
      'Marking a statement as FALSE simply because it sounds unlikely, when the passage never actually contradicts it.',
    bandImpact: 'Common Band 6.5 → 7.5 blocker',
    remedy:
      'FALSE requires a direct contradiction in the passage. If the author never confirms or refutes the claim, choose NOT GIVEN.',
    drillTitle: 'Practise Reading TFNG'
  },
  {
    id: 'listening_distractor_trap',
    skill: 'listening',
    route: '/practice/listening',
    moduleName: 'Listening',
    trapTitle: 'Speaker self-correction & reversal trap',
    description:
      'Writing down the first date, price, or room number mentioned before the speaker revises it moments later.',
    bandImpact: 'Frequent Section 1–3 pitfall',
    remedy:
      'Stay alert past the initial answer for pivot signals like "actually", "originally we planned", or "hang on, that changed".',
    drillTitle: 'Practise Listening Lab'
  },
  {
    id: 'writing_linker_trap',
    skill: 'writing',
    route: '/practice/writing',
    moduleName: 'Writing Task 2',
    trapTitle: 'Mechanical sentence-start linkers',
    description:
      'Stacking "Firstly", "Moreover", and "Furthermore" at the start of every sentence instead of linking ideas organically.',
    bandImpact: 'Caps Coherence & Cohesion near 6.5',
    remedy:
      'Use referencing ("this policy", "such measures") and cause-effect clauses ("thereby reducing...") for Band 7.5+ cohesion.',
    drillTitle: 'Open Writing Lab'
  },
  {
    id: 'speaking_pacing_trap',
    skill: 'speaking',
    route: '/practice/speaking',
    moduleName: 'Speaking Part 2',
    trapTitle: 'Running out of ideas before 2 minutes',
    description:
      'Rushing through cue-card bullet points in 60 seconds and repeating the same vocabulary to fill time.',
    bandImpact: 'Limits Fluency & Lexical Range',
    remedy:
      'Divide your talk into 3 beats: past background context, the core event with concrete detail, and what it taught you.',
    drillTitle: 'Open Speaking Lab'
  }
];

export const AIWeaknessDetector: React.FC<AIWeaknessDetectorProps> = ({
  onNavigate,
  onShowToast,
  weakestSkill = null
}) => {
  const orderedTraps = useMemo(() => {
    if (!weakestSkill) return IELTS_TRAPS;
    return [...IELTS_TRAPS].sort((a, b) => {
      if (a.skill === weakestSkill && b.skill !== weakestSkill) return -1;
      if (b.skill === weakestSkill && a.skill !== weakestSkill) return 1;
      return 0;
    });
  }, [weakestSkill]);

  const [expandedTrapId, setExpandedTrapId] = useState<string | null>(
    orderedTraps[0]?.id ?? null
  );

  const handleLaunchDrill = (trap: TrapItem) => {
    soundManager.playBeep(640, 0.04);
    onShowToast?.(`Opening ${trap.moduleName}: ${trap.trapTitle}`);
    onNavigate(trap.route);
  };

  return (
    <section className="rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#EEF3F1] dark:border-[#1F8A70]/25">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] text-[#0F4C45] dark:text-[#1F8A70] flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
              High-Frequency IELTS Exam Traps
            </h2>
            <p className="text-xs text-[#566664] dark:text-slate-400">
              {weakestSkill
                ? `Sorted with your diagnostic priority (${weakestSkill}) first — expand any trap for the exact fix.`
                : 'Common Band 6.5 → 8.0 score blockers across all four skills, with direct practice drills.'}
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-[#EEF3F1] dark:divide-[#1F8A70]/20">
        {orderedTraps.map((trap) => {
          const isExpanded = expandedTrapId === trap.id;
          const isPriority = weakestSkill === trap.skill;

          return (
            <div key={trap.id} className="py-3 first:pt-1 last:pb-1">
              <button
                type="button"
                aria-expanded={isExpanded}
                onClick={() => {
                  soundManager.playBeep(480, 0.02);
                  setExpandedTrapId(isExpanded ? null : trap.id);
                }}
                className="w-full text-left flex items-center justify-between gap-3 cursor-pointer py-1"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 text-xs text-[#566664] dark:text-slate-400 flex-wrap">
                    <span className="font-semibold text-[#0F4C45] dark:text-[#1F8A70]">
                      {trap.moduleName}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{trap.bandImpact}</span>
                    {isPriority && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-[#9B6314] dark:text-[#F4A62A]">
                          Matches your weakest skill
                        </span>
                      </>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-[#0E1F1E] dark:text-[#EEF3F1]">
                    {trap.trapTitle}
                  </div>
                </div>

                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-[#566664] shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#566664] shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="mt-2.5 pt-2.5 border-t border-[#EEF3F1] dark:border-[#1F8A70]/20 space-y-2.5 text-xs">
                  <p className="text-[#566664] dark:text-slate-300 leading-relaxed">
                    {trap.description}
                  </p>
                  <p className="text-[#0E1F1E] dark:text-[#EEF3F1] leading-relaxed">
                    <strong className="text-[#0F4C45] dark:text-[#1F8A70]">Examiner fix: </strong>
                    {trap.remedy}
                  </p>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => handleLaunchDrill(trap)}
                      className="min-h-[38px] px-3.5 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{trap.drillTitle}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
