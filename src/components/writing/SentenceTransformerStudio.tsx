import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  RotateCcw,
  Volume2,
  Copy,
  Check,
  BookOpen,
  Zap,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Award
} from 'lucide-react';
import { speakBritish } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';

interface TransformationSample {
  topic: string;
  original: string;
  band7: string;
  band9: string;
  lexicalFeatures: string[];
  grammaticalFeatures: string[];
  nominalizationExplanation: string;
}

const PRESET_TRANSFORMATIONS: TransformationSample[] = [
  {
    topic: 'Environment & Climate Change',
    original: 'People are cutting down trees and burning fuels, so this makes global temperatures go up.',
    band7: 'The widespread clearance of forested areas combined with the combustion of fossil fuels substantially exacerbates global temperature increases.',
    band9: 'The relentless acceleration of anthropogenic deforestation, compounded by fossil fuel combustion, exerts profound and systemic upward pressure on global climatic stability.',
    lexicalFeatures: ['anthropogenic deforestation', 'compounded by', 'systemic upward pressure', 'climatic stability'],
    grammaticalFeatures: ['Complex noun phrase subject (Nominalization)', 'Non-finite participial modifier ("compounded by...")', 'Transitive verb with abstract prepositional complement'],
    nominalizationExplanation: 'Replaces the informal verb phrase "people are cutting down trees" with the dense academic noun phrase "The relentless acceleration of anthropogenic deforestation".'
  },
  {
    topic: 'Education & Technology',
    original: 'Students use computers for homework, and this helps them learn faster because they can search online.',
    band7: 'Digital tools significantly expedite student learning by facilitating immediate access to academic repositories.',
    band9: 'The pervasive integration of computational resources into pedagogical workflows fosters accelerated cognitive assimilation by democratizing access to scholarly databases.',
    lexicalFeatures: ['pedagogical workflows', 'cognitive assimilation', 'democratizing access', 'scholarly databases'],
    grammaticalFeatures: ['Double nominalization ("integration", "assimilation")', 'Gerund prepositional clause ("by democratizing...")', 'Academic abstract register'],
    nominalizationExplanation: 'Transforms active simple verbs ("use", "helps", "learn") into high-impact academic nouns ("integration", "assimilation"), demonstrating Band 9 Lexical Resource.'
  },
  {
    topic: 'Urbanization & Housing',
    original: 'A lot of people move to big cities because there are good jobs, but houses are too expensive.',
    band7: 'Substantial rural-to-urban migration is driven by lucrative employment prospects, despite escalating accommodation costs.',
    band9: 'Whilst burgeoning metropolitan migration is propelled by superior occupational prospects, acute housing unaffordability poses an acute socioeconomic bottleneck.',
    lexicalFeatures: ['burgeoning metropolitan migration', 'occupational prospects', 'acute socioeconomic bottleneck', 'unaffordability'],
    grammaticalFeatures: ['Concessive subordinate clause ("Whilst...")', 'Passive voice attribution ("propelled by...")', 'Metaphorical nominal predicate ("bottleneck")'],
    nominalizationExplanation: 'Converts simple sequential clauses joined with "because" and "but" into an inverted concessive construction with formal academic vocabulary.'
  },
  {
    topic: 'Health & Fast Food',
    original: 'Young people eat fast food every day, and this makes them obese and have heart problems later in life.',
    band7: 'Excessive consumption of processed meals among adolescents precipitates severe long-term cardiovascular disorders.',
    band9: 'The habitual ingestion of hyper-palatable ultra-processed foodstuffs among younger demographics irrevocably predisposes populations to chronic cardiovascular morbidity.',
    lexicalFeatures: ['hyper-palatable ultra-processed foodstuffs', 'younger demographics', 'irrevocably predisposes', 'cardiovascular morbidity'],
    grammaticalFeatures: ['Extended pre-modified noun phrase', 'Adverbial manner modification ("irrevocably")', 'Medical / academic precision ("morbidity" vs "problems")'],
    nominalizationExplanation: 'Replaces colloquial everyday phrasing with precise epidemiological terminology expected in C2 / Band 9 academic writing.'
  }
];

export const SentenceTransformerStudio: React.FC = () => {
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [customInput, setCustomInput] = useState('');
  const [copiedBand, setCopiedBand] = useState<string | null>(null);

  const activeSample = PRESET_TRANSFORMATIONS[selectedPresetIndex];

  const handleCopy = (text: string, band: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBand(band);
    soundManager.playSuccess();
    setTimeout(() => setCopiedBand(null), 2000);
  };

  const handleSpeak = (text: string) => {
    speakBritish(text, { rate: 0.95 });
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-fade-in select-none">
      {/* ================= HEADER ================= */}
      <div className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-[#101B32] text-white border border-slate-700/80 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-mono font-bold border border-blue-400/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>IELTS WRITING BAND 9 ENGINE</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Academic Sentence Transformer & Nominalization Studio
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Master the single most powerful writing secret in IELTS Task 2: transforming informal spoken clauses into high-density academic nominalizations that examiners award Band 9.0.
          </p>
        </div>
      </div>

      {/* ================= TOPIC PRESET SELECTOR ================= */}
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 flex items-center justify-between">
          <span>Select an IELTS Essay Topic Preset</span>
          <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400">
            {selectedPresetIndex + 1} of {PRESET_TRANSFORMATIONS.length} Models
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESET_TRANSFORMATIONS.map((sample, idx) => (
            <button
              key={sample.topic}
              onClick={() => {
                setSelectedPresetIndex(idx);
                soundManager.playBeep(560, 0.03);
              }}
              className={`p-3 rounded-xl sm:rounded-2xl border text-left transition flex flex-col justify-between min-h-[70px] ${
                selectedPresetIndex === idx
                  ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                  : 'bg-white dark:bg-[#101B32] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-blue-400'
              }`}
            >
              <div className="text-[10px] font-mono font-bold uppercase opacity-80">Preset {idx + 1}</div>
              <div className="text-xs font-bold truncate mt-1">{sample.topic}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ================= 3-TIER COMPARISON WORKBENCH ================= */}
      <div className="space-y-3.5">
        {/* Tier 1: Band 6.0 (Baseline) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold font-mono border border-amber-500/20">
              <span>Band 6.0 Baseline</span>
              <span className="text-[10px] opacity-75">(Informal / Spoken English)</span>
            </span>
            <button
              onClick={() => handleSpeak(activeSample.original)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Listen to British voice"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium italic">
            "{activeSample.original}"
          </p>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <span>⚠️ Relies on basic coordinated clauses ("and", "so") and conversational verbs ("makes", "go up").</span>
          </div>
        </div>

        {/* Tier 2: Band 7.5 (Academic Progression) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#101B32] border border-blue-200 dark:border-blue-900/60 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-bold font-mono border border-blue-500/20">
              <TrendingUp className="w-3 h-3 text-blue-500" />
              <span>Band 7.5 Academic Progression</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleCopy(activeSample.band7, 'band7')}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Copy Band 7.5 revision"
              >
                {copiedBand === 'band7' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => handleSpeak(activeSample.band7)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Listen to British voice"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-900 dark:text-white font-medium">
            "{activeSample.band7}"
          </p>
          <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
            ✓ Introduces accurate academic collocations ("combustion of fossil fuels", "substantially exacerbates").
          </div>
        </div>

        {/* Tier 3: Band 9.0 (Cambridge Mastery) */}
        <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-50 via-indigo-50/30 to-purple-50/20 dark:from-[#101B32] dark:via-[#162340] dark:to-[#1a2035] border-2 border-blue-500/80 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-black font-mono shadow-xs">
              <Award className="w-3.5 h-3.5 text-amber-300" />
              <span>Band 9.0 Cambridge Mastery</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleCopy(activeSample.band9, 'band9')}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition flex items-center gap-1"
                title="Copy Band 9.0 revision"
              >
                {copiedBand === 'band9' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedBand === 'band9' ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={() => handleSpeak(activeSample.band9)}
                className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                title="Listen to British voice"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <blockquote className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-relaxed pl-3 border-l-4 border-blue-600">
            "{activeSample.band9}"
          </blockquote>

          {/* Nominalization Secret Callout */}
          <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-blue-200 dark:border-blue-900/60 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-300 font-mono text-[11px] uppercase">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>The Nominalization Transformation Secret:</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              {activeSample.nominalizationExplanation}
            </p>
          </div>

          {/* Lexical & Grammatical Chips */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Lexical Resource Upgrades (C1 / C2):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeSample.lexicalFeatures.map((lex) => (
                  <span
                    key={lex}
                    className="px-2 py-0.5 rounded-md bg-blue-100/80 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-mono text-[11px] font-semibold border border-blue-200 dark:border-blue-800"
                  >
                    {lex}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Grammatical Range Mastery:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeSample.grammaticalFeatures.map((gram) => (
                  <span
                    key={gram}
                    className="px-2 py-0.5 rounded-md bg-purple-100/80 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-mono text-[11px] font-semibold border border-purple-200 dark:border-purple-800"
                  >
                    {gram}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
