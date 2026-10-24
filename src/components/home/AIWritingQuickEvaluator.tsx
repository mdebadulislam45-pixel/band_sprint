import React, { useState } from 'react';
import {
  PenTool,
  Sparkles,
  ArrowRight,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { checkWritingWordThreshold, evaluateWritingSubmission } from '../../services/WritingEvaluationService';

interface AIWritingQuickEvaluatorProps {
  onNavigate: (module: string) => void;
  onShowToast?: (msg: string) => void;
}

interface EvaluationResult {
  isValidAttempt: boolean;
  overallBand: number;
  wordCount: number;
  minWordCount: number;
  passedWordCount: boolean;
  trScore: number;
  ccScore: number;
  lrScore: number;
  graScore: number;
  feedbackTitle?: string;
  feedbackEn?: string;
  feedbackBn?: string;
  keyStrengths: string;
  lexicalUpgrade?: { from: string; to: string; explanation: string };
  pacingTip: string;
}

const SAMPLE_ESSAY = `In today's fast-paced society, higher education institutions are often expected to prepare students directly for employment. While some argue that universities should concentrate strictly on job-market competencies, others assert that higher learning should foster intellectual curiosity and research for its own sake. In my view, an optimal academic framework integrates rigorous vocational preparedness with profound theoretical grounding.

On the one hand, equipping graduates with pragmatic, industry-aligned skills is crucial for contemporary economic competitiveness. With rapid digital transformation and artificial intelligence reshaping professional landscapes, university curricula that incorporate hands-on technical training ensure smooth school-to-work transitions. For instance, engineering and computer science students must master modern toolchains rather than purely abstract mathematical theorems.

On the other hand, reducing universities to mere vocational workshops undermines their historic role as crucibles of critical thought. Academic philosophy, literature, and foundational scientific inquiry cultivate analytical thinking, ethical judgment, and creative problem-solving. These transferable intellectual virtues empower individuals to adapt to careers that do not yet exist today.

In conclusion, although practical career readiness is indispensable, universities must not sacrifice their broader mission of intellectual exploration. Striking a harmonious equilibrium between vocational relevance and pure academic scholarship best equips future generations.`;

export const AIWritingQuickEvaluator: React.FC<AIWritingQuickEvaluatorProps> = ({
  onNavigate,
  onShowToast
}) => {
  const [taskType, setTaskType] = useState<'task2' | 'task1'>('task2');
  const [essayText, setEssayText] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);

  const minWords = taskType === 'task2' ? 250 : 150;
  const wordCount = essayText.trim().length > 0 ? essayText.trim().split(/\s+/).length : 0;
  const isWordCountSufficient = wordCount >= minWords;

  const handleLoadSample = () => {
    soundManager.playBeep(520, 0.03);
    setEssayText(SAMPLE_ESSAY);
    setEvaluation(null);
    if (onShowToast) onShowToast('Loaded Cambridge 19 Task 2 Band 8.0 Sample Essay');
  };

  const handleEvaluate = () => {
    const gate = checkWritingWordThreshold(essayText, taskType);
    if (!gate.isValidAttempt) {
      soundManager.playBeep(360, 0.08);
      setEvaluation({
        isValidAttempt: false,
        overallBand: 0.0,
        wordCount: gate.wordCount,
        minWordCount: gate.minRequiredWords,
        passedWordCount: false,
        trScore: 0.0,
        ccScore: 0.0,
        lrScore: 0.0,
        graScore: 0.0,
        feedbackTitle: gate.feedbackTitle,
        feedbackEn: gate.feedbackEn,
        feedbackBn: gate.feedbackBn,
        keyStrengths: gate.feedbackEn,
        pacingTip: gate.feedbackBn
      });
      return;
    }

    soundManager.playBeep(640, 0.04);
    setIsEvaluating(true);
    setEvaluation(null);

    setTimeout(() => {
      setIsEvaluating(false);
      const report = evaluateWritingSubmission(essayText, taskType);

      setEvaluation({
        isValidAttempt: report.isValidAttempt,
        overallBand: report.overallBand,
        wordCount: report.wordCount,
        minWordCount: minWords,
        passedWordCount: report.wordCount >= minWords,
        trScore: report.taScore,
        ccScore: report.ccScore,
        lrScore: report.lrScore,
        graScore: report.graScore,
        feedbackTitle: report.feedbackTitle,
        feedbackEn: report.feedbackEn,
        feedbackBn: report.feedbackBn,
        keyStrengths: report.examinerSummary || report.feedbackEn,
        lexicalUpgrade: report.lexicalUpgrades[0]
          ? {
              from: report.lexicalUpgrades[0].from,
              to: report.lexicalUpgrades[0].to,
              explanation: report.lexicalUpgrades[0].context
            }
          : undefined,
        pacingTip: 'Remember to allocate 5 minutes at the end of the 40-minute window for article (a/the) and plural inflection checks.'
      });
      soundManager.playBeep(780, 0.05);
    }, 500);
  };

  const handleClear = () => {
    soundManager.playBeep(480, 0.02);
    setEssayText('');
    setEvaluation(null);
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-[#0B1224] border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <PenTool className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                AI Writing Quick-Evaluator
              </h2>
              <span className="text-[10px] font-mono font-bold uppercase text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border border-purple-500/20 px-1.5 py-0.5 rounded">
                Instant Rubric
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Paste your essay or paragraph for immediate Cambridge TR / CC / LR / GRA score prediction
            </p>
          </div>
        </div>

        {/* Task Switcher & Sample Loader */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl">
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(480, 0.02);
                setTaskType('task2');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                taskType === 'task2'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Task 2 Essay (250w)
            </button>
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(480, 0.02);
                setTaskType('task1');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                taskType === 'task1'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Task 1 (150w)
            </button>
          </div>

          <button
            type="button"
            onClick={handleLoadSample}
            className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline px-2 py-1 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer transition hidden sm:inline-block"
          >
            Load Sample
          </button>
        </div>
      </div>

      {/* Editor Box */}
      <div className="space-y-2">
        <div className="relative">
          <textarea
            value={essayText}
            onChange={(e) => setEssayText(e.target.value)}
            placeholder={`Paste or type your IELTS ${taskType === 'task2' ? 'Task 2 essay' : 'Task 1 response'} here to test against the official Cambridge examiner rubric...`}
            rows={4}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-purple-500 focus:outline-none transition resize-y font-sans leading-relaxed"
          />
        </div>

        {/* Meter and controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-3">
            <span
              className={`font-mono font-bold flex items-center gap-1.5 ${
                isWordCountSufficient
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : wordCount > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-400'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{wordCount} words</span>
              <span className="text-slate-400 font-normal">/ {minWords} required</span>
            </span>

            {wordCount > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleEvaluate}
              disabled={isEvaluating || wordCount === 0}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer ${
                wordCount === 0
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 active:scale-95 text-white shadow-purple-500/20'
              }`}
            >
              {isEvaluating ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Evaluating Cambridge Rubric...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>Evaluate Essay</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Instant Result Box */}
      {evaluation && (
        !evaluation.isValidAttempt || evaluation.overallBand <= 0 ? (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 space-y-2.5 animate-fade-in">
            <div className="flex items-center gap-2.5 text-rose-700 dark:text-rose-300 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{evaluation.feedbackTitle || 'Submission Too Short for Assessment'} (Overall Band: 0.0)</span>
            </div>
            <p className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed font-semibold">
              {evaluation.feedbackEn}
            </p>
            <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
              {evaluation.feedbackBn}
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/50 space-y-3 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-200/60 dark:border-purple-900/40 pb-2.5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-purple-600 text-white flex flex-col items-center justify-center font-mono font-black shadow-sm">
                  <span className="text-base leading-none">{evaluation.overallBand.toFixed(1)}</span>
                  <span className="text-[8px] uppercase tracking-wider font-sans font-bold opacity-80">Band</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Predicted Cambridge Rubric Score: Band {evaluation.overallBand.toFixed(1)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {evaluation.keyStrengths}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundManager.playBeep(640, 0.04);
                  onNavigate('writing');
                }}
                className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
              >
                <span>Open in Full Writing Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Sub-scores */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-lg bg-white dark:bg-[#0B1224] border border-slate-200/80 dark:border-slate-800">
                <div className="text-[10px] font-mono uppercase font-bold text-slate-400">Task Response</div>
                <div className="text-xs font-mono font-black text-purple-600 dark:text-purple-400">
                  {evaluation.trScore.toFixed(1)}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-[#0B1224] border border-slate-200/80 dark:border-slate-800">
                <div className="text-[10px] font-mono uppercase font-bold text-slate-400">Cohesion</div>
                <div className="text-xs font-mono font-black text-purple-600 dark:text-purple-400">
                  {evaluation.ccScore.toFixed(1)}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-[#0B1224] border border-slate-200/80 dark:border-slate-800">
                <div className="text-[10px] font-mono uppercase font-bold text-slate-400">Lexical</div>
                <div className="text-xs font-mono font-black text-purple-600 dark:text-purple-400">
                  {evaluation.lrScore.toFixed(1)}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-[#0B1224] border border-slate-200/80 dark:border-slate-800">
                <div className="text-[10px] font-mono uppercase font-bold text-slate-400">Grammar</div>
                <div className="text-xs font-mono font-black text-purple-600 dark:text-purple-400">
                  {evaluation.graScore.toFixed(1)}
                </div>
              </div>
            </div>

            {/* Lexical Upgrade recommendation */}
            {evaluation.lexicalUpgrade && (
              <div className="text-[11px] text-slate-700 dark:text-slate-300 bg-white dark:bg-[#0B1224] p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-purple-600 dark:text-purple-400">C1 Lexical Recommendation: </span>
                  <span>
                    Consider upgrading <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200 font-mono text-[10px]">"{evaluation.lexicalUpgrade.from}"</code> to <code className="bg-purple-100 dark:bg-purple-950/60 px-1 py-0.5 rounded text-purple-700 dark:text-purple-300 font-mono text-[10px]">"{evaluation.lexicalUpgrade.to}"</code>. {evaluation.lexicalUpgrade.explanation}
                  </span>
                </div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
};
