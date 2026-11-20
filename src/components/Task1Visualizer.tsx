import React, { useState } from 'react';
import { Copy, Check, BarChart2, TrendingUp, Sparkles, BookOpen } from 'lucide-react';
import { soundManager } from '../utils/audioEffects';

interface Task1VisualizerProps {
  onShowToast: (msg: string) => void;
}

export const Task1Visualizer: React.FC<Task1VisualizerProps> = ({ onShowToast }) => {
  const [selectedMilestone, setSelectedMilestone] = useState<'2000' | '2012' | '2024'>('2012');
  const [copied, setCopied] = useState(false);

  // Data for Norway and Germany renewable percentage 2000-2024
  // 2000: Norway 62%, Germany 6%
  // 2006: Norway 58%, Germany 12%
  // 2012: Norway 68%, Germany 24%
  // 2018: Norway 78%, Germany 38%
  // 2024: Norway 88%, Germany 52%

  const milestoneClauses = {
    '2000': {
      title: '2000 Baseline Initiation Clause',
      clause: 'Commencing at an impressive baseline of 62% in 2000, Norway maintained an undisputed predominance in renewable electricity generation, dwarfing Germany’s modest starting figure of merely 6% by more than tenfold.',
      band: 'Band 8.5+',
      focus: 'Opening baseline contrast with extreme proportion vocabulary ("predominance", "dwarfing tenfold").'
    },
    '2012': {
      title: '2012 Inflection Point Clause',
      clause: 'By 2012, while Norway experienced a steady resurgence reaching approximately 68% after a brief dip in 2006, Germany demonstrated accelerated momentum, quadrupling its renewable output to eclipse the one-quarter threshold (24%).',
      band: 'Band 9.0',
      focus: 'Concession clause ("while Norway experienced...") coupled with multiplication dynamic ("quadrupling to eclipse").'
    },
    '2024': {
      title: '2024 Culmination Clause',
      clause: 'Over the subsequent twelve years, both nations sustained an upward trajectory, culminating in 2024 peaks of 88% and 52% for Norway and Germany respectively, thereby narrowing the initial disparity between the two European nations.',
      band: 'Band 9.0',
      focus: 'Synthesis participle clause ("culminating in...", "thereby narrowing the initial disparity").'
    }
  };

  const band9ModelEssay = `The line graph delineates the proportion of electricity generated from renewable sources in Norway and Germany across a 24-year timeframe from 2000 to 2024.

Overall, it is readily apparent that both nations experienced a pronounced upward trajectory in clean energy generation throughout the period. While Norway maintained an unequivocal lead at every recorded milestone, Germany exhibited the most dramatic rate of proportional growth, effectively closing the gap between the two countries.

In 2000, Norway initiated the period with a dominant renewable share of 62%. Despite a marginal contraction to 58% in 2006, Norwegian generation subsequently accelerated, ascending progressively to 68% in 2012 and 78% in 2018. By 2024, the figure had attained a historic peak of 88%, consolidating its clean energy status.

Conversely, Germany commenced at a negligible 6% in 2000. Over the ensuing years, the country experienced consistent expansion, doubling to 12% by 2006 before quadrupling its baseline to 24% in 2012. This brisk acceleration persisted over the final decade, with renewable generation surging to 38% in 2018 and ultimately surpassing the half-way benchmark to reach 52% by 2024.`;

  const handleCopyEssay = () => {
    navigator.clipboard.writeText(band9ModelEssay);
    setCopied(true);
    soundManager.playSuccess();
    onShowToast('Band 9.0 Model Response copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" /> Academic Task 1 Data Visualizer
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            Module 5: Writing Task 1 Interactive Visualizer
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Click data milestones on the graph to inspect generated Band 8.5+ reporting clauses and master the Practice Set 4-paragraph structure.
          </p>
        </div>

        <button
          onClick={handleCopyEssay}
          className="px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-sm flex items-center gap-2 transition"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Copied to Clipboard' : 'Copy Band 9.0 Model Report'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Interactive SVG Chart */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 font-mono">CAMBRIDGE VISUAL TASK</span>
              <h3 className="text-base font-bold text-slate-900">
                Renewable Energy as % of Total Electricity (2000–2024)
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span> Norway</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-600 inline-block"></span> Germany</span>
            </div>
          </div>

          {/* SVG Multi-Line Graph */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 relative">
            <svg viewBox="0 0 540 280" className="w-full h-auto select-none font-mono">
              {/* Gridlines */}
              {[0, 20, 40, 60, 80, 100].map((val, idx) => {
                const y = 230 - (val / 100) * 190;
                return (
                  <g key={idx}>
                    <line x1="50" y1={y} x2="510" y2={y} stroke="#e2e8f0" strokeDasharray="3,3" />
                    <text x="40" y={y + 4} fill="#94a3b8" fontSize="10" textAnchor="end">{val}%</text>
                  </g>
                );
              })}

              {/* X-axis labels */}
              {[
                { year: '2000', x: 80 },
                { year: '2006', x: 180 },
                { year: '2012', x: 280 },
                { year: '2018', x: 380 },
                { year: '2024', x: 480 },
              ].map((pt, idx) => (
                <text key={idx} x={pt.x} y="255" fill="#64748b" fontSize="11" fontWeight="bold" textAnchor="middle">{pt.year}</text>
              ))}

              {/* Norway Path (62 -> 58 -> 68 -> 78 -> 88) */}
              {/* y = 230 - (pct/100)*190.
                  62% => 230 - 117.8 = 112.2
                  58% => 230 - 110.2 = 119.8
                  68% => 230 - 129.2 = 100.8
                  78% => 230 - 148.2 = 81.8
                  88% => 230 - 167.2 = 62.8
              */}
              <path
                d="M 80,112 L 180,120 L 280,101 L 380,82 L 480,63"
                stroke="#2563eb"
                strokeWidth="4"
                fill="none"
              />

              {/* Germany Path (6 -> 12 -> 24 -> 38 -> 52) */}
              {/*
                  6%  => 230 - 11.4  = 218.6
                  12% => 230 - 22.8  = 207.2
                  24% => 230 - 45.6  = 184.4
                  38% => 230 - 72.2  = 157.8
                  52% => 230 - 98.8  = 131.2
              */}
              <path
                d="M 80,219 L 180,207 L 280,184 L 380,158 L 480,131"
                stroke="#059669"
                strokeWidth="4"
                fill="none"
              />

              {/* Interactive Milestone Click Targets */}
              {/* 2000 Target */}
              <g
                className="cursor-pointer group"
                onClick={() => setSelectedMilestone('2000')}
              >
                <circle cx="80" cy="112" r={selectedMilestone === '2000' ? "8" : "5"} fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                <circle cx="80" cy="219" r={selectedMilestone === '2000' ? "8" : "5"} fill="#059669" stroke="#ffffff" strokeWidth="2" />
                <rect x="60" y="20" width="40" height="20" rx="4" fill={selectedMilestone === '2000' ? '#1e3a8a' : '#94a3b8'} />
                <text x="80" y="34" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">2000</text>
              </g>

              {/* 2012 Target */}
              <g
                className="cursor-pointer group"
                onClick={() => setSelectedMilestone('2012')}
              >
                <circle cx="280" cy="101" r={selectedMilestone === '2012' ? "8" : "5"} fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                <circle cx="280" cy="184" r={selectedMilestone === '2012' ? "8" : "5"} fill="#059669" stroke="#ffffff" strokeWidth="2" />
                <rect x="260" y="20" width="40" height="20" rx="4" fill={selectedMilestone === '2012' ? '#1e3a8a' : '#94a3b8'} />
                <text x="280" y="34" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">2012</text>
              </g>

              {/* 2024 Target */}
              <g
                className="cursor-pointer group"
                onClick={() => setSelectedMilestone('2024')}
              >
                <circle cx="480" cy="63" r={selectedMilestone === '2024' ? "8" : "5"} fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                <circle cx="480" cy="131" r={selectedMilestone === '2024' ? "8" : "5"} fill="#059669" stroke="#ffffff" strokeWidth="2" />
                <rect x="460" y="20" width="40" height="20" rx="4" fill={selectedMilestone === '2024' ? '#1e3a8a' : '#94a3b8'} />
                <text x="480" y="34" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">2024</text>
              </g>
            </svg>
          </div>

          {/* Interactive Milestone Reporting Clause Box */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-700" />
                {milestoneClauses[selectedMilestone].title}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-700 text-white font-mono">
                {milestoneClauses[selectedMilestone].band}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-serif italic bg-white p-3 rounded-xl border border-blue-200">
              "{milestoneClauses[selectedMilestone].clause}"
            </p>
            <div className="text-[11px] text-blue-800">
              <strong>Grammatical Focus:</strong> {milestoneClauses[selectedMilestone].focus}
            </div>
          </div>
        </div>

        {/* Right Pane: 4-Paragraph Structural Blueprint */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Formula</span>
            <h3 className="text-lg font-bold text-slate-900 mt-1">The 4-Paragraph Practice Architecture</h3>
            <p className="text-xs text-slate-500">Master this blueprint to guarantee Band 7.0+ in Task Achievement.</p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-900 block mb-1">1. Introduction (Paraphrase)</span>
              <p className="text-slate-600">Rephrase the prompt question using synonyms: "The line graph delineates the proportion of electricity generated from renewable sources in Norway and Germany across a 24-year timeframe from 2000 to 2024."</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-300">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-amber-900">2. The Overview (Mandatory for Band 7+)</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-mono">NO NUMBERS!</span>
              </div>
              <p className="text-amber-800">Summarize 2 key overarching trends: "Overall, both nations experienced a pronounced upward trajectory... Norway maintained an unequivocal lead, while Germany exhibited the most dramatic rate of proportional growth."</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-900 block mb-1">3. Body Paragraph 1 (Norway Focus)</span>
              <p className="text-slate-600">Provide chronological data for group 1: Starts at 62%, dips to 58% in 2006, then accelerates to 68% in 2012, 78% in 2018, and reaches 88% in 2024.</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-900 block mb-1">4. Body Paragraph 2 (Germany & Contrasts)</span>
              <p className="text-slate-600">Emphasize comparisons: Commenced at a negligible 6%, quadrupled to 24% by 2012, and surged to 52% in 2024, closing the initial disparity.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
