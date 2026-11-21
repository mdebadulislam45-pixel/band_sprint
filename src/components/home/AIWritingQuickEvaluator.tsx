import React, { useState } from 'react';
import {
  PenTool,
  Sparkles,
  ArrowRight,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ClipboardCheck
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import {
  runOfflineWritingStructuralPrecheck,
  WritingStructuralPrecheckResult
} from '../../services/WritingEvaluationService';

interface AIWritingQuickEvaluatorProps {
  onNavigate: (module: string) => void;
  onShowToast?: (msg: string) => void;
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
  const [isChecking, setIsChecking] = useState(false);
  const [precheck, setPrecheck] = useState<WritingStructuralPrecheckResult | null>(null);

  const minWords = taskType === 'task2' ? 250 : 150;
  const wordCount = essayText.trim().length > 0 ? essayText.trim().split(/\s+/).filter(Boolean).length : 0;
  const isWordCountSufficient = wordCount >= minWords;

  const handleLoadSample = () => {
    soundManager.playBeep(520, 0.03);
    setEssayText(SAMPLE_ESSAY);
    setPrecheck(null);
    if (onShowToast) onShowToast('Loaded Task 2 Sample Draft for Structural Pre-Check');
  };

  const handleRunPrecheck = () => {
    soundManager.playBeep(640, 0.04);
    setIsChecking(true);
    setPrecheck(null);

    const result = runOfflineWritingStructuralPrecheck(essayText, taskType);
    setIsChecking(false);
    setPrecheck(result);

    if (result.assessmentStatus === 'insufficient_evidence') {
      soundManager.playBeep(360, 0.08);
    } else {
      soundManager.playBeep(780, 0.05);
    }
  };

  const handleClear = () => {
    soundManager.playBeep(480, 0.02);
    setEssayText('');
    setPrecheck(null);
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
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                Writing Structural Pre-Check
              </h2>
              <span className="text-[10px] font-mono font-bold uppercase text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-500/30 px-1.5 py-0.5 rounded">
                Offline · Non-Scoring
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Instant offline word-count, paragraphing, repetition, and register check (does not assign an IELTS band)
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
                setPrecheck(null);
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
                setPrecheck(null);
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
            onChange={(e) => {
              setEssayText(e.target.value);
              if (precheck) setPrecheck(null);
            }}
            placeholder={`Paste or type your IELTS ${taskType === 'task2' ? 'Task 2 essay' : 'Task 1 response'} here for an instant offline structural pre-check...`}
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
              <span className="text-slate-400 font-normal">/ {minWords} target</span>
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
              onClick={handleRunPrecheck}
              disabled={isChecking || wordCount === 0}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer ${
                wordCount === 0
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 active:scale-95 text-white shadow-purple-500/20'
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Run Structural Pre-Check</span>
            </button>
          </div>
        </div>
      </div>

      {/* Offline Structural Pre-Check Result Box (Strictly Non-Scoring) */}
      {precheck && (
        precheck.assessmentStatus === 'insufficient_evidence' ? (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 space-y-2.5 animate-fade-in">
            <div className="flex items-center gap-2.5 text-rose-700 dark:text-rose-300 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{precheck.feedbackTitle} (Not Assessed · No Band Assigned)</span>
            </div>
            <p className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed font-semibold">
              {precheck.feedbackEn}
            </p>
            <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
              {precheck.feedbackBn}
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-3 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {precheck.feedbackTitle}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800 text-[10px] font-mono font-bold uppercase">
                    Non-Scoring Feedback · No IELTS Band
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {precheck.nonScoringNotice}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundManager.playBeep(640, 0.04);
                  onNavigate('writing');
                }}
                className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 self-start sm:self-auto shrink-0 cursor-pointer"
              >
                <span>Open Full Writing Studio for AI Scoring</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Observed Structural Metrics (Non-Band) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-lg bg-white dark:bg-[#0B1224] border border-slate-200/80 dark:border-slate-800">
                <div className="text-[10px] font-mono uppercase font-bold text-slate-400">Words</div>
                <div className="text-xs font-mono font-black text-slate-900 dark:text-white">
                  {precheck.wordCount} / {precheck.targetWords}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-[#0B1224] border border-slate-200/80 dark:border-slate-800">
                <div className="text-[10px] font-mono uppercase font-bold text-slate-400">Paragraphs</div>
                <div className="text-xs font-mono font-black text-slate-900 dark:text-white">
                  {precheck.paragraphCount}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-[#0B1224] border border-slate-200/80 dark:border-slate-800">
                <div className="text-[10px] font-mono uppercase font-bold text-slate-400">Linkers Found</div>
                <div className="text-xs font-mono font-black text-slate-900 dark:text-white">
                  {precheck.cohesiveMarkerCount}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-[#0B1224] border border-slate-200/80 dark:border-slate-800">
                <div className="text-[10px] font-mono uppercase font-bold text-slate-400">Lexical Variety</div>
                <div className="text-xs font-mono font-black text-slate-900 dark:text-white">
                  {precheck.lexicalDiversityPct}%
                </div>
              </div>
            </div>

            {/* Structural Checklist */}
            <div className="space-y-1.5">
              {precheck.checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2 text-[11px] bg-white dark:bg-[#0B1224] p-2 rounded-lg border border-slate-200/70 dark:border-slate-800"
                >
                  {item.status === 'pass' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{item.label}: </span>
                    <span className="text-slate-600 dark:text-slate-400">{item.detail}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Observed Grammar Pattern Alerts */}
            {precheck.grammarAlerts.length > 0 && (
              <div className="text-[11px] text-rose-800 dark:text-rose-200 bg-rose-50/70 dark:bg-rose-950/30 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Observed Draft Patterns ({precheck.grammarAlerts.length})</span>
                </div>
                {precheck.grammarAlerts.slice(0, 3).map((alert) => (
                  <div key={alert.id}>
                    <code className="font-mono bg-white/80 dark:bg-slate-900 px-1 rounded">"{alert.phrase}"</code>
                    {' → '}
                    <code className="font-mono font-bold text-emerald-700 dark:text-emerald-300">"{alert.suggestion}"</code>
                    {' · '}
                    <span>{alert.explanation}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Observed Register / Lexical Suggestions */}
            {precheck.lexicalSuggestions.length > 0 && (
              <div className="text-[11px] text-slate-700 dark:text-slate-300 bg-white dark:bg-[#0B1224] p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-purple-600 dark:text-purple-400">Register Suggestion: </span>
                  <span>
                    Consider replacing{' '}
                    <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200 font-mono text-[10px]">
                      "{precheck.lexicalSuggestions[0].from}"
                    </code>{' '}
                    with{' '}
                    <code className="bg-purple-100 dark:bg-purple-950/60 px-1 py-0.5 rounded text-purple-700 dark:text-purple-300 font-mono text-[10px]">
                      "{precheck.lexicalSuggestions[0].to}"
                    </code>
                    . {precheck.lexicalSuggestions[0].context}
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
