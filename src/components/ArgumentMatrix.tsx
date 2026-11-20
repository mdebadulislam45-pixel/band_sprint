import React, { useState } from 'react';
import { Lightbulb, Copy, Check, ArrowRight, Sparkles, Layers, BookOpen } from 'lucide-react';
import { soundManager } from '../utils/audioEffects';

interface ArgumentMatrixProps {
  onTransferToMock: (paragraph: string) => void;
  onShowToast: (msg: string) => void;
}

export const ArgumentMatrix: React.FC<ArgumentMatrixProps> = ({ onTransferToMock, onShowToast }) => {
  const [selectedTopicIndex, setSelectedTopicIndex] = useState(0);
  const [selectedLens, setSelectedLens] = useState<'P' | 'E' | 'S' | 'T' | 'L' | 'Env'>('E');
  const [copied, setCopied] = useState(false);

  const essayPrompts = [
    {
      topic: 'Governments should impose punitive excise taxes on sugary beverages and fast foods to combat obesity.',
      type: 'Opinion / Agree or Disagree',
      lenses: {
        P: {
          lensName: 'Political & Policy',
          coreArgument: 'State intervention is justified as chronic lifestyle illnesses place an unsustainable burden on publicly funded healthcare systems.',
          collocations: ['fiscal intervention', 'subsidize healthier alternatives', 'public health mandate'],
          example: 'The UK Soft Drinks Industry Levy generated hundreds of millions while inducing manufacturers to reformulate sugar content.'
        },
        E: {
          lensName: 'Economic & Market',
          coreArgument: 'Higher retail prices alter consumer purchasing elasticity, making high-calorie junk foods financially deterrent.',
          collocations: ['price elasticity of demand', 'regressive taxation burden', 'economic deterrence'],
          example: 'Studies in Mexico demonstrated a 7.6% decline in purchases of taxed sugar-sweetened beverages within two years.'
        },
        S: {
          lensName: 'Social & Cultural',
          coreArgument: 'Such levies disproportionately affect lower-income demographics unless accompanied by subsidies on fresh agricultural produce.',
          collocations: ['socioeconomic disparity', 'dietary education', 'nutritional literacy'],
          example: 'Without community cooking programs and food access, low-income households simply pay more without healthier substitutions.'
        },
        T: {
          lensName: 'Technological & Industrial',
          coreArgument: 'Food biotechnology can synthesize natural low-calorie sugar substitutes, mitigating consumer sensory deprivation.',
          collocations: ['food reformulation', 'biotechnological sweeteners', 'industrial compliance'],
          example: 'Fermentation-derived allulose and stevia enable confectionery producers to maintain taste profiles without glycemic spikes.'
        },
        L: {
          lensName: 'Legal & Regulatory',
          coreArgument: 'Statutory advertising bans during children’s television broadcasting are legally complementary to tax policies.',
          collocations: ['statutory marketing restrictions', 'mandatory front-of-pack labeling', 'consumer protection laws'],
          example: 'Chile’s strict black-stop-sign warning labels and banning cartoon mascots drastically curbed juvenile junk food consumption.'
        },
        Env: {
          lensName: 'Environmental & Ecological',
          coreArgument: 'Industrial fast food cultivation drives intensive monoculture corn syrup production and environmental degradation.',
          collocations: ['carbon footprint of ultra-processed foods', 'monoculture depletion', 'packaging waste'],
          example: 'Reducing industrial soda consumption directly scales down aluminum can litter and industrial corn fertilizer runoff.'
        }
      }
    },
    {
      topic: 'Telecommuting and remote employment will permanently replace physical office spaces in the modern global economy.',
      type: 'Discuss Both Views & Give Opinion',
      lenses: {
        P: {
          lensName: 'Political & Urban',
          coreArgument: 'Decentralized remote work reduces vehicular gridlock in metropolitan capitals and redistributes wealth to rural communities.',
          collocations: ['regional economic revitalization', 'urban decentralization', 'municipal tax revenue'],
          example: 'Small towns in southern Italy and rural Portugal gained young professionals through digital nomad visa incentives.'
        },
        E: {
          lensName: 'Economic & Real Estate',
          coreArgument: 'Enterprises save millions in commercial real estate leases, yet central business district retail faces severe insolvency.',
          collocations: ['overhead expenditure reduction', 'commercial lease devaluation', 'productivity gains'],
          example: 'Major tech corporations downsized physical headquarters, reinvesting capital into cloud infrastructure and software tooling.'
        },
        S: {
          lensName: 'Social & Psychological',
          coreArgument: 'Workers gain autonomy and family time, but isolation and blurring between domestic and professional boundaries erode mental well-being.',
          collocations: ['work-life integration', 'occupational isolation', 'spontaneous collaborative serendipity'],
          example: 'Surveys indicate 40% of sustained remote workers report difficulties disconnecting after traditional working hours.'
        },
        T: {
          lensName: 'Technological & Cyber',
          coreArgument: 'Asynchronous collaboration suites and VR telepresence make physical proximity largely redundant for intellectual tasks.',
          collocations: ['asynchronous communication', 'high-throughput broadband', 'enterprise cybersecurity'],
          example: 'Platforms like Slack and Zoom facilitate cross-continental team sprints without requiring transatlantic business travel.'
        },
        L: {
          lensName: 'Legal & Jurisdiction',
          coreArgument: 'Cross-border telecommuting sparks complex legal ambiguities regarding payroll tax jurisdiction and worker compensation.',
          collocations: ['labor law compliance', 'jurisdictional ambiguity', 'remote worker rights'],
          example: 'The European Union had to formulate specific directives guaranteeing the "Right to Disconnect" outside contracted hours.'
        },
        Env: {
          lensName: 'Environmental Impact',
          coreArgument: 'The elimination of daily commuting produces immediate reductions in urban greenhouse gas emissions and fossil fuel consumption.',
          collocations: ['commuter carbon emissions', 'air quality improvements', 'energy expenditure shifting'],
          example: 'Metropolitan air monitoring showed notable drops in nitrogen dioxide levels when hybrid schedules took hold.'
        }
      }
    }
  ];

  const currentEssay = essayPrompts[selectedTopicIndex];
  const activeLensData = currentEssay.lenses[selectedLens];

  // Synthesized Premise-to-Conclusion Paragraph
  const builtParagraph = `From an ${activeLensData.lensName.toLowerCase()} perspective, ${activeLensData.coreArgument.toLowerCase()} Specifically, policymakers note that ${activeLensData.collocations.join(', ')} play a pivotal role. For instance, ${activeLensData.example} Consequently, addressing this dimension is imperative for any comprehensive societal strategy.`;

  const handleCopyParagraph = () => {
    navigator.clipboard.writeText(builtParagraph);
    setCopied(true);
    soundManager.playSuccess();
    onShowToast('Premise-to-Conclusion paragraph copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" /> Practice Argument Generation Engine
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            Module 8: Task 2 Essay Argument Generator (PESTLE Engine)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Never stare at a blank page. Deconstruct challenging Task 2 essay prompts through 6 macro-environmental lenses.
          </p>
        </div>

        {/* Topic Selector */}
        <div className="flex gap-2">
          {essayPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedTopicIndex(idx)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${selectedTopicIndex === idx ? 'bg-purple-700 border-purple-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'}`}
            >
              Prompt #{idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-sm space-y-2">
        <div className="flex items-center justify-between text-xs text-purple-300">
          <span className="font-mono uppercase font-bold tracking-wider">Practice Prompt</span>
          <span className="px-2 py-0.5 rounded bg-purple-950 border border-purple-700">{currentEssay.type}</span>
        </div>
        <h3 className="text-lg sm:text-xl font-bold font-serif leading-relaxed">
          "{currentEssay.topic}"
        </h3>
      </div>

      {/* PESTLE Lenses Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { id: 'P', label: 'Political', color: 'from-blue-600 to-blue-800' },
          { id: 'E', label: 'Economic', color: 'from-emerald-600 to-emerald-800' },
          { id: 'S', label: 'Social', color: 'from-amber-600 to-amber-800' },
          { id: 'T', label: 'Technological', color: 'from-purple-600 to-purple-800' },
          { id: 'L', label: 'Legal', color: 'from-indigo-600 to-indigo-800' },
          { id: 'Env', label: 'Environmental', color: 'from-teal-600 to-teal-800' },
        ].map((lens) => (
          <button
            key={lens.id}
            onClick={() => setSelectedLens(lens.id as any)}
            className={`p-3 rounded-2xl border text-center transition ${selectedLens === lens.id ? 'bg-white border-purple-600 shadow-md ring-2 ring-purple-600/20' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'}`}
          >
            <div className={`font-mono text-lg font-black ${selectedLens === lens.id ? 'text-purple-700' : 'text-slate-400'}`}>
              {lens.id}
            </div>
            <div className="text-xs font-bold text-slate-800 mt-0.5">{lens.label}</div>
          </button>
        ))}
      </div>

      {/* Deconstructed Idea & Builder Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Deconstructed Arguments */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
              {activeLensData.lensName} Deconstruction
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-800 font-bold">
              Band 8.5+ Architecture
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Core Actionable Argument:</span>
              <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                {activeLensData.coreArgument}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200">
              <span className="text-[11px] font-bold text-purple-800 uppercase block mb-1.5">Academic Collocations (LR Booster):</span>
              <div className="flex flex-wrap gap-2">
                {activeLensData.collocations.map((c, idx) => (
                  <span key={idx} className="text-xs px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-purple-900 font-medium">
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Concrete Real-World Evidence:</span>
              <p className="text-xs text-slate-700 leading-relaxed">
                {activeLensData.example}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Premise-to-Conclusion Builder */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Premise-to-Conclusion Paragraph Synthesizer
            </span>
            <span className="text-xs text-slate-500 font-mono">Ready to Paste</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 font-serif text-sm text-slate-800 leading-relaxed italic">
            "{builtParagraph}"
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={handleCopyParagraph}
              className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy Paragraph'}</span>
            </button>
            <button
              onClick={() => onTransferToMock(builtParagraph)}
              className="flex-1 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm"
            >
              <span>Transfer to AI Mock</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
