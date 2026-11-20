import React, { useState } from 'react';
import {
  X,
  Globe2,
  Search,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Server,
  Share2,
  Code2,
  Rocket
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';

interface LaunchSeoGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const LaunchSeoGuideModal: React.FC<LaunchSeoGuideModalProps> = ({
  isOpen,
  onClose,
  onShowToast
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    soundManager.playBeep(700, 0.04);
    onShowToast(`Copied "${key}" to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="launch-guide-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-[#0B1224] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h2 id="launch-guide-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                How to Rank "BandSprint" on Google & Launch Commercial Domain
              </h2>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Official Production Deployment & Search Engine Indexing Blueprint
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(450, 0.03);
              onClose();
            }}
            className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
            aria-label="Close Guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {/* Step 1: Custom Domain */}
          <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-blue-700 dark:text-blue-300">
                <Globe2 className="w-4 h-4 shrink-0" />
                <span>Step 1: Point Your Domain (e.g. bandsprint.app)</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-blue-200/70 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-[10px] font-mono font-bold">
                2 Mins
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Deploy this applet to <strong>Vercel</strong>, <strong>Netlify</strong>, or <strong>Firebase Hosting</strong>. Connect your custom domain with DNS records:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400">Type:</span> <strong>A Record</strong><br />
                  <span className="text-slate-400">Value:</span> 76.76.21.21
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('76.76.21.21', 'A Record')}
                  className="p-1.5 text-slate-400 hover:text-blue-600 transition"
                  title="Copy IP"
                >
                  {copiedKey === 'A Record' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400">Type:</span> <strong>CNAME (www)</strong><br />
                  <span className="text-slate-400">Value:</span> cname.vercel-dns.com
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('cname.vercel-dns.com', 'CNAME')}
                  className="p-1.5 text-slate-400 hover:text-blue-600 transition"
                  title="Copy CNAME"
                >
                  {copiedKey === 'CNAME' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Step 2: Google Search Console */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-indigo-700 dark:text-indigo-300">
                <Search className="w-4 h-4 shrink-0" />
                <span>Step 2: Submit to Google Search Console</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-indigo-200/70 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-[10px] font-mono font-bold">
                Indexing
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Open <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 underline font-bold">Google Search Console</a> and add your domain. Then submit your automated sitemap URL:
            </p>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-slate-800 flex items-center justify-between font-mono text-[11px]">
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">https://bandsprint.app/sitemap.xml</span>
              <button
                type="button"
                onClick={() => handleCopy('https://bandsprint.app/sitemap.xml', 'Sitemap URL')}
                className="p-1.5 text-slate-400 hover:text-indigo-600 transition"
                title="Copy Sitemap"
              >
                {copiedKey === 'Sitemap URL' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="text-[11px] text-slate-500">
              ✓ Googlebot will crawl and index all 10 core pages (Speaking, Listening, Reading, Writing, Vocab) within 24 to 48 hours.
            </div>
          </div>

          {/* Step 3: What We Pre-Configured for You */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Already Configured in Code for You
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span><strong>public/robots.txt</strong> allows Googlebot</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span><strong>public/sitemap.xml</strong> with priorities</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span><strong>Schema.org JSON-LD</strong> rich snippets</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span><strong>OpenGraph & Twitter Cards</strong> for social shares</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span><strong>PWA Manifest</strong> for installable mobile app</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span><strong>Free Tier</strong> (5 full mocks, 2 AI Speaking + 1 AI Writing/day, no card)</span>
              </div>
            </div>
          </div>

          {/* Step 4: SEO Ranking Accelerator Tips */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1.5 text-amber-900 dark:text-amber-200">
            <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
              <Share2 className="w-4 h-4" />
              <span>How to Rank #1 for "BandSprint" Quickly</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
              <li>Share your domain in Bangladeshi IELTS preparation Facebook groups (e.g. "IELTS Preparation Bangladesh", "GRE & IELTS Bangladesh").</li>
              <li>Create a simple YouTube / Facebook video showing the AI British examiner in action with the title "Free IELTS Speaking Practice with AI on BandSprint".</li>
              <li>Encourage 50–100 students to complete a practice test—Google rewards websites with real engagement and low bounce rates!</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-5 sm:px-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Target Keywords: BandSprint, IELTS prep, AI Speaking</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition cursor-pointer"
          >
            Got it, Let's Launch!
          </button>
        </div>
      </div>
    </div>
  );
};
