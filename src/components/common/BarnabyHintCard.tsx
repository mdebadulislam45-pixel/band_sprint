import React from 'react';
import { CheckCircle2, Loader2, RotateCcw, XCircle } from 'lucide-react';
import { BarnabyPoseState } from '../../utils/getBarnabyState';
import { BarnabyExpression } from '../../types/barnaby';
import { getBarnabyExpressionConfig } from '../../utils/barnabyStateEngine';
import { BarnabyRig } from '../BarnabyRig';

export type HintLoopPhase = 'analyzing' | 'hint_attempt_1' | 'recovered_attempt_2' | 'revealed_attempt_2';

export interface BarnabyHintCardProps {
  phase: HintLoopPhase;
  module: 'reading' | 'listening';
  attempt1Answer: string;
  attempt2Answer?: string;
  correctAnswerDisplay: string;
  hintHeadline?: string;
  hintBody?: string;
  distractorAnalysis?: string;
  revealExplanation?: string;
  partialXpAwarded?: number;
  onDismiss?: () => void;
}

export const BarnabyHintCard: React.FC<BarnabyHintCardProps> = ({
  phase,
  module,
  attempt1Answer,
  attempt2Answer,
  correctAnswerDisplay,
  hintHeadline,
  hintBody,
  distractorAnalysis,
  revealExplanation,
  partialXpAwarded = 15,
  onDismiss,
}) => {
  const expression: BarnabyExpression =
    phase === 'analyzing'
      ? 'analytical'
      : phase === 'recovered_attempt_2'
      ? 'celebrating'
      : phase === 'revealed_attempt_2'
      ? 'empathetic'
      : 'curious';

  const exprConfig = getBarnabyExpressionConfig(expression);
  const pose: BarnabyPoseState = exprConfig.pose;
  const isCelebrating = phase === 'recovered_attempt_2';

  const badgeLabel =
    phase === 'analyzing'
      ? 'Analyzing trap'
      : phase === 'hint_attempt_1'
      ? 'Attempt 1 · Strategic Hint'
      : phase === 'recovered_attempt_2'
      ? `Attempt 2 Correct · +${partialXpAwarded} XP`
      : 'Attempt 2 · Answer Revealed';

  const badgeTone =
    phase === 'recovered_attempt_2'
      ? 'bg-emerald-100 text-[#134E41] dark:bg-emerald-950/60 dark:text-emerald-300'
      : phase === 'revealed_attempt_2'
      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
      : 'bg-[#F59E0B]/15 text-[#B45309] dark:text-[#FBBF24]';

  return (
    <div
      data-testid="barnaby-hint-card"
      data-barnaby-mode="tutor"
      data-barnaby-expression={expression}
      data-hint-phase={phase}
      data-barnaby-pose={pose}
      role="status"
      aria-live="polite"
      className="rounded-2xl bg-white dark:bg-[#11201E] border border-[#134E41]/15 dark:border-[#1F8A70]/35 p-4 space-y-3 transition-colors"
    >
      {/* Top Bar: Identity + Expression + Explicit Phase Label */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-display font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
            Barnaby
          </span>
          <span className="text-[#566664] dark:text-slate-400">
            · {module === 'listening' ? 'Listening' : 'Reading'} Practice Tutor
          </span>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap ${exprConfig.pillClasses}`}>
            {exprConfig.statusLabel}
          </span>
        </div>

        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap ${badgeTone}`}>
          {phase === 'analyzing' && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
          {phase === 'recovered_attempt_2' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
          {phase === 'revealed_attempt_2' && <XCircle className="w-3.5 h-3.5 shrink-0" />}
          {phase === 'hint_attempt_1' && <RotateCcw className="w-3 h-3 shrink-0" />}
          <span>{badgeLabel}</span>
        </span>
      </div>

      {/* Main Content: Articulated Vector Rig + Strategic Coaching */}
      <div className="flex items-start gap-3.5">
        <div
          className={`relative w-16 h-16 rounded-xl bg-[#F8FAF9] dark:bg-[#10201E] border ${exprConfig.ringClasses} flex items-center justify-center shrink-0 overflow-visible`}
          aria-hidden="true"
        >
          <BarnabyRig
            expression={expression}
            mode={isCelebrating ? 'celebration' : 'tutor'}
            isSpeaking={phase === 'hint_attempt_1'}
            interactive
            className="w-full h-full p-0.5"
            testId="barnaby-hint-rig"
          />
        </div>

        <div className="min-w-0 flex-1 space-y-1.5 text-xs">
          {phase === 'analyzing' && (
            <>
              <div className="font-semibold text-[#0E1F1E] dark:text-[#EEF3F1]">
                Checking why "{attempt1Answer}" fell into the distractor trap...
              </div>
              <p className="text-[#566664] dark:text-slate-300 leading-relaxed">
                Locating the exact paraphrase shift in the {module === 'listening' ? 'audio transcript' : 'passage'} without spoiling the answer.
              </p>
            </>
          )}

          {phase === 'hint_attempt_1' && (
            <>
              <div className="font-semibold text-[#0E1F1E] dark:text-[#EEF3F1]">
                {hintHeadline || `Hold on — "${attempt1Answer}" matches a common distractor trap`}
              </div>
              {hintBody && (
                <p className="text-[#334155] dark:text-slate-200 leading-relaxed">
                  {hintBody}
                </p>
              )}
              {distractorAnalysis && (
                <p className="text-[11px] text-[#566664] dark:text-slate-400 leading-relaxed">
                  Trap clue: {distractorAnalysis}
                </p>
              )}
              <div className="pt-1 text-[11px] font-semibold text-[#134E41] dark:text-emerald-300">
                Try Attempt 2 now — select or enter a revised answer above.
              </div>
            </>
          )}

          {phase === 'recovered_attempt_2' && (
            <>
              <div className="font-semibold text-[#134E41] dark:text-emerald-300">
                Recovered on Attempt 2 — "{attempt2Answer || correctAnswerDisplay}" is verified!
              </div>
              <p className="text-[#334155] dark:text-slate-200 leading-relaxed">
                {revealExplanation ||
                  'You spotted the paraphrase shift on your second pass and earned partial practice XP.'}
              </p>
            </>
          )}

          {phase === 'revealed_attempt_2' && (
            <>
              <div className="font-semibold text-[#0E1F1E] dark:text-[#EEF3F1]">
                Verified Answer:{' '}
                <span className="font-mono text-[#134E41] dark:text-emerald-300">
                  {correctAnswerDisplay}
                </span>
              </div>
              <p className="text-[#334155] dark:text-slate-200 leading-relaxed">
                {revealExplanation ||
                  `Your second selection ("${attempt2Answer || attempt1Answer}") still triggered the distractor. Compare the wording directly against the evidence clue.`}
              </p>
              {distractorAnalysis && (
                <p className="text-[11px] text-[#566664] dark:text-slate-400 leading-relaxed">
                  Why the distractor failed: {distractorAnalysis}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {onDismiss && (phase === 'recovered_attempt_2' || phase === 'revealed_attempt_2') && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onDismiss}
            className="text-[11px] font-semibold text-[#566664] hover:text-[#134E41] dark:text-slate-400 dark:hover:text-emerald-300 transition cursor-pointer"
          >
            Dismiss note
          </button>
        </div>
      )}
    </div>
  );
};
