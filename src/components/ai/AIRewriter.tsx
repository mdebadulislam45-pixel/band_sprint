import React, { useState } from 'react';
import { RefreshCw, Copy, Check, Sparkles, AlertTriangle, ArrowRight, BookOpen } from 'lucide-react';
import { rewriteText, type RewriteResult } from '../../services/rewriterEngine';
import { soundManager } from '../../utils/audioEffects';

interface AIRewriterProps {
  onShowToast?: (msg: string) => void;
}

const SAMPLE_TEXT =
  'In modern days, many people think university education should be free. I think this is a very important issue because a lot of students cannot pay the fees. For example, many poor families have big problems. The government should help them because education is very important for the future. In conclusion, I think free education is good for all people.';

export const AIRewriter: React.FC<AIRewriterProps> = ({ onShowToast }) => {
  const [input, setInput] = useState(SAMPLE_TEXT);
  const [result, setResult] = useState<RewriteResult | null>(null);
  const [copied, setCopied] = useState(false);

  const wordCount = input.trim().split(/\s+/).filter(Boolean).length;

  const handleRewrite = () => {
    if (wordCount < 5) {
      onShowToast?.('Please write or paste at least a sentence to rewrite.');
      return;
    }
    soundManager.playBeep(580, 0.04);
    setResult(rewriteText(input));
    soundManager.playSuccess();
    onShowToast?.('Rewrite ready — works fully offline, no server needed.');
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.improved);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onShowToast?.('Improved version copied to clipboard.');
    } catch {
      onShowToast?.('Copy is not available in this browser — select the text manually.');
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#101B32] border border-slate-200/90 dark:border-slate-800 space-y-4 shadow-xs animate-fade-in">
      <div className="flex items-center gap-2">
        <span className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/50 text-purple-600">
          <RefreshCw className="w-4 h-4" />
        </span>
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white">AI Rewriter — Band 7+ Upgrade</h2>
          <p className="text-xs text-slate-500">
            Paste a Task 2 paragraph or sentence. The rewriter upgrades everyday words to academic
            vocabulary, fixes common grammar slips, and explains its 3 biggest changes — entirely
            on your device, no internet or server needed.
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <label className="font-bold text-slate-700 dark:text-slate-300">Your text:</label>
          <span className="font-mono text-slate-500">
            Word Count: <span className="font-bold text-purple-600">{wordCount}</span> words
          </span>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={7}
          placeholder="Type or paste your Task 2 essay or a single sentence here…"
          className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 text-sm font-serif text-slate-900 dark:text-slate-100 leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] text-slate-400">
          Offline engine · every change is shown, nothing is hidden
        </span>
        <button
          type="button"
          onClick={handleRewrite}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2 active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Rewrite My Text</span>
        </button>
      </div>

      {result && (
        <div className="mt-2 space-y-4 animate-fade-in">
          {/* Band estimate */}
          <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-mono font-bold text-purple-700 dark:text-purple-300 uppercase">
                Estimated Band (after rewrite)
              </span>
              <div className="text-2xl font-black text-purple-900 dark:text-purple-200">
                Band {result.bandEstimate.toFixed(1)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-md">
                {result.bandNote}
              </p>
            </div>
            <div className="flex gap-2 text-center text-xs shrink-0">
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#101B32] border">
                <span className="text-[10px] text-slate-400 font-mono block">Upgrades</span>
                <span className="font-black text-slate-900 dark:text-white">{result.stats.upgradesApplied}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#101B32] border">
                <span className="text-[10px] text-slate-400 font-mono block">Fixes</span>
                <span className="font-black text-slate-900 dark:text-white">{result.stats.correctionsApplied}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#101B32] border">
                <span className="text-[10px] text-slate-400 font-mono block">Words</span>
                <span className="font-black text-slate-900 dark:text-white">{result.stats.words}</span>
              </div>
            </div>
          </div>

          {/* Improved version */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#101B32] border border-purple-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-700 dark:text-purple-400 font-mono">
                Improved version:
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="min-h-[36px] px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy improved text'}</span>
              </button>
            </div>
            <p className="text-sm font-serif text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">
              {result.improved}
            </p>
          </div>

          {/* Top 3 changes */}
          {result.topChanges.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono uppercase">
                The 3 biggest changes:
              </span>
              <ol className="space-y-2">
                {result.topChanges.map((change, i) => (
                  <li key={i} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    <span className="font-black text-purple-700 dark:text-purple-400 mr-1.5">{i + 1}.</span>
                    <span className="font-mono line-through text-rose-600">{change.original}</span>
                    <ArrowRight className="w-3 h-3 inline mx-1.5 text-slate-400" />
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{change.replacement}</span>
                    <span className="block text-slate-500 dark:text-slate-400 mt-0.5 ml-5">{change.explanation}</span>
                  </li>
                ))}
              </ol>
              {result.changes.length > 3 && (
                <p className="text-[11px] text-slate-500">
                  + {result.changes.length - 3} more small change{result.changes.length - 3 === 1 ? '' : 's'} applied
                  ({result.changes.filter((c) => c.type === 'lexical').length} vocabulary upgrades,{' '}
                  {result.changes.filter((c) => c.type === 'grammar').length} grammar fixes).
                </p>
              )}
            </div>
          )}

          {/* Linking suggestions */}
          {result.linkingSuggestions.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-2">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-amber-600" />
                Linking words your text is missing:
              </span>
              <ul className="space-y-1.5">
                {result.linkingSuggestions.map((s, i) => (
                  <li key={i} className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                    • {s.suggestion}
                    <span className="block text-amber-700 dark:text-amber-300/80 mt-0.5">বাংলা: {s.bangla}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.changes.length === 0 && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>No upgrades or fixes found — this text already reads at a strong academic level. Try a longer paragraph to see more suggestions.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
