import React from 'react';
import { Task1VisualPromptStudio } from './writing/Task1VisualPromptStudio';

interface Task1VisualizerProps {
  onShowToast: (msg: string) => void;
}

export const Task1Visualizer: React.FC<Task1VisualizerProps> = ({ onShowToast }) => {
  return (
    <div className="space-y-6">
      <Task1VisualPromptStudio onShowToast={onShowToast} />

      {/* 4-Paragraph Academic Architecture Reference */}
      <section className="rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/35 p-5 sm:p-6 space-y-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#9B6314] dark:text-[#F4A62A]">
            Band 8.0+ Structural Blueprint
          </div>
          <h3 className="font-display text-lg font-bold text-[#0E1F1E] dark:text-[#EEF3F1] mt-0.5">
            The 4-Paragraph Academic Task 1 Architecture
          </h3>
          <p className="text-xs text-[#566664] dark:text-slate-400">
            Follow this exact four-paragraph sequence for charts, tables, before/after maps, and process diagrams.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-4 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/25 space-y-1">
            <span className="font-bold text-[#0E1F1E] dark:text-[#EEF3F1] block">
              1. Introduction (Paraphrase)
            </span>
            <p className="text-[#566664] dark:text-slate-400 leading-relaxed">
              Rephrase the prompt in 1–2 sentences using accurate reporting verbs (&ldquo;illustrates&rdquo;, &ldquo;compares&rdquo;, &ldquo;depicts the stages of&rdquo;) and exact units/timeframes.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FEF6E8]/70 dark:bg-[#F4A62A]/10 border border-[#F4A62A]/50 space-y-1">
            <span className="font-bold text-[#9B6314] dark:text-[#F4A62A] block">
              2. The Overview (Mandatory · Zero Raw Numbers)
            </span>
            <p className="text-[#0E1F1E] dark:text-slate-300 leading-relaxed">
              Begin with &ldquo;Overall, ...&rdquo; and summarise 2–3 dominant trends, highest/lowest leaders, or total stage count without listing detailed statistics.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/25 space-y-1">
            <span className="font-bold text-[#0E1F1E] dark:text-[#EEF3F1] block">
              3. Body Paragraph 1 (Leading Group / First Half)
            </span>
            <p className="text-[#566664] dark:text-slate-400 leading-relaxed">
              Group logically similar categories (or initial map zones / stages 1–3) and anchor claims with exact percentages, years, or compass directions.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/25 space-y-1">
            <span className="font-bold text-[#0E1F1E] dark:text-[#EEF3F1] block">
              4. Body Paragraph 2 (Contrasts &amp; Convergence)
            </span>
            <p className="text-[#566664] dark:text-slate-400 leading-relaxed">
              Use active comparative structures (&ldquo;whereas&rdquo;, &ldquo;by contrast&rdquo;, &ldquo;surpassed&rdquo;, &ldquo;was converted into&rdquo;) to highlight notable gaps or final outcomes.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
