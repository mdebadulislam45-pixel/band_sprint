import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  Sparkles,
  BookOpen,
  Layers,
  ArrowRight,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Zap,
  PenTool,
  BarChart3,
  AlertTriangle,
  TrendingUp,
  Award,
  Volume2,
  VolumeX,
  Sliders
} from 'lucide-react';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';

export interface EssayTemplate {
  id: string;
  category: 'task2' | 'task1';
  title: string;
  badge: string;
  description: string;
  paragraphStructure: {
    title: string;
    targetWords: number;
    purpose: string;
    starterPhrases: string[];
    band9Example: string;
  }[];
  academicCollocations: string[];
  commonPitfalls: string[];
}

export const ESSAY_TEMPLATES: EssayTemplate[] = [
  {
    id: 't2_opinion',
    category: 'task2',
    title: 'Opinion (Agree / Disagree)',
    badge: 'Task 2 · Most Frequent',
    description: 'Master structure for taking a clear, definitive stance with nuanced concessive reasoning.',
    paragraphStructure: [
      {
        title: 'Paragraph 1: Introduction & Thesis',
        targetWords: 45,
        purpose: 'Paraphrase the prompt prompt and provide an unequivocal thesis statement.',
        starterPhrases: [
          'It is increasingly asserted that...',
          'While proponents argue that [View A], I firmly believe that [View B].',
          'This essay will argue that [Stance] owing to [Reason 1] and [Reason 2].'
        ],
        band9Example:
          'It is frequently contended that tertiary education should be freely accessible to all citizens irrespective of socio-economic status. While financial accessibility is commendable, I firmly argue that state-funded university tuition imposes an unsustainable fiscal burden and diminishes institutional research quality.'
      },
      {
        title: 'Paragraph 2: First Core Argument',
        targetWords: 90,
        purpose: 'Flesh out the strongest supporting point with cause-and-effect progression and concrete evidence.',
        starterPhrases: [
          'A primary rationale for this viewpoint pertains to...',
          'First and foremost, it is demonstrable that...',
          'To substantiate this assertion, consider...'
        ],
        band9Example:
          'A primary rationale for this stance pertains to government budgetary allocation. When public expenditure is predominantly channeled into tertiary subsidies, foundational sectors such as primary education and healthcare frequently suffer severe deficits. For example, Scandinavian nations that offer tuition-free degrees offset this expenditure through exceptionally steep personal income taxation.'
      },
      {
        title: 'Paragraph 3: Second Core Argument / Rebuttal',
        targetWords: 90,
        purpose: 'Reinforce your thesis by analyzing quality ramifications or disproving opposing counterclaims.',
        starterPhrases: [
          'Furthermore, it is crucial to recognize that...',
          'From an economic standpoint, the ramifications are evident in...',
          'Detractors may maintain that..., yet this overlooks...'
        ],
        band9Example:
          'Furthermore, universities that rely exclusively on public subventions frequently experience infrastructure stagnation. Conversely, tuition-charging institutions in the United Kingdom and North America maintain competitive endowments that directly fund cutting-edge laboratory research and attract internationally acclaimed faculty.'
      },
      {
        title: 'Paragraph 4: Conclusion & Final Deduction',
        targetWords: 45,
        purpose: 'Synthesize the arguments without introducing novel evidence; rephrase the thesis definitively.',
        starterPhrases: [
          'In conclusion, whilst acknowledging that...',
          'To recapitulate, although...',
          'In light of the aforesaid analysis, it is manifest that...'
        ],
        band9Example:
          'In conclusion, whilst educational equity remains an admirable objective, blanket government funding compromises academic excellence and strains state coffers. Governments should instead implement targeted means-tested scholarships for underprivileged applicants.'
      }
    ],
    academicCollocations: [
      'unsustainable fiscal burden',
      'diminish institutional quality',
      'budgetary allocation',
      'infrastructure stagnation',
      'means-tested scholarships',
      'state coffers'
    ],
    commonPitfalls: [
      'Presenting a balanced 50/50 view when asked "To what extent do you agree or disagree?"',
      'Failing to introduce an explicit thesis in the opening paragraph',
      'Listing generic examples without explaining the underlying mechanism'
    ]
  },
  {
    id: 't2_discussion',
    category: 'task2',
    title: 'Discussion (Both Views + Opinion)',
    badge: 'Task 2 · High Distinction',
    description: 'Balanced critique evaluating two competing stances before offering an authoritative personal verdict.',
    paragraphStructure: [
      {
        title: 'Paragraph 1: Balanced Introduction',
        targetWords: 50,
        purpose: 'Map both sides of the discourse and state your calibrated verdict.',
        starterPhrases: [
          'The question of whether [View A] or [View B] remains deeply polarising.',
          'While a persuasive argument can be mounted for [View A], I contend that [View B].'
        ],
        band9Example:
          'The debate over whether artificial intelligence represents an unprecedented catalyst for human prosperity or an existential labor risk remains deeply polarising. While algorithmic automation inevitably displaces routine manual vocations, I contend that its net economic trajectory will generate higher-order creative industries.'
      },
      {
        title: 'Paragraph 2: Examination of View A',
        targetWords: 90,
        purpose: 'Fairly present the virtues and underlying logic of the side you ultimately disagree with.',
        starterPhrases: [
          'On the one hand, proponents of [View A] emphasize...',
          'The foremost justification underpinning this perspective is...',
          'This dynamic is clearly corroborated by...'
        ],
        band9Example:
          'On the one hand, skeptics point out that rapid mechanical automation disproportionately destabilizes low-skilled demographics. Manufacturing sectors across developing economies have witnessed millions of factory positions rendered redundant, exacerbating societal income inequality.'
      },
      {
        title: 'Paragraph 3: Examination of View B & Author Stance',
        targetWords: 100,
        purpose: 'Analyze the opposing view and demonstrate why its merits are stronger or more profound.',
        starterPhrases: [
          'On the other hand, a compelling case exists for...',
          'Nevertheless, I align with those who maintain that...',
          'Crucially, historical precedents demonstrate that...'
        ],
        band9Example:
          'On the other hand, technological revolutions have historically catalyzed net employment growth rather than aggregate obsolescence. As routine calculation and data compilation are automated, human talent is liberated toward strategic design, ethics governance, and scientific discovery.'
      },
      {
        title: 'Paragraph 4: Measured Conclusion',
        targetWords: 45,
        purpose: 'Synthesize both viewpoints and reiterate your verdict in authoritative terms.',
        starterPhrases: [
          'To synthesize, although [View A] warrants consideration, [View B]...',
          'In conclusion, while the immediate anxieties are legitimate, I remain convinced that...'
        ],
        band9Example:
          'To synthesize, although transitionary frictional unemployment presents tangible hardships, the overarching socioeconomic benefits of AI innovation will fundamentally enrich human civilization provided proactive vocational retraining is established.'
      }
    ],
    academicCollocations: [
      'deeply polarising discourse',
      'catalyst for prosperity',
      'frictional unemployment',
      'technological revolution',
      'aggregate obsolescence',
      'vocational retraining'
    ],
    commonPitfalls: [
      'Only discussing one view in depth while giving the other a superficial sentence',
      'Concealing your personal opinion until the very final sentence',
      'Using informal colloquialisms like "In a nutshell" or "Every coin has two sides"'
    ]
  },
  {
    id: 't1_dynamic_chart',
    category: 'task1',
    title: 'Task 1: Dynamic Line & Bar Charts',
    badge: 'Task 1 Academic · Trend Mastery',
    description: 'Systematic four-paragraph structure for illustrating shifts, fluctuations, and comparative growth rates over time.',
    paragraphStructure: [
      {
        title: 'Paragraph 1: Objective Paraphrase',
        targetWords: 25,
        purpose: 'Paraphrase the title, time frame, measurement units, and categorical parameters.',
        starterPhrases: [
          'The line graph delineates the fluctuating levels of...',
          'The chart illustrates comparative figures for [Topic] over a [N]-year epoch between [Year] and [Year].'
        ],
        band9Example:
          'The line graph delineates the fluctuating consumption of three renewable energy sources—solar, wind, and biomass—in the United Kingdom over a two-decade epoch spanning 2000 to 2020, calibrated in gigawatt-hours (GWh).'
      },
      {
        title: 'Paragraph 2: Strategic Overview (Crucial Band 7+ Criterion)',
        targetWords: 45,
        purpose: 'Highlight 2-3 prominent overarching trends, peak values, or crossovers with zero raw figures.',
        starterPhrases: [
          'Overall, it is readily apparent that...',
          'A salient feature of the data is that...',
          'Throughout the projected timeframe, [Category A] experienced an upward trajectory, whereas...'
        ],
        band9Example:
          'Overall, it is readily apparent that wind and solar power experienced marked upward trajectories throughout the period, with wind registering the most exponential surge. Conversely, biomass consumption exhibited a moderate initial plateau followed by a continuous decline.'
      },
      {
        title: 'Paragraph 3: Detailed Analysis of Trend 1',
        targetWords: 60,
        purpose: 'Present verified quantitative data, exact figures, milestone dates, and comparative multipliers.',
        starterPhrases: [
          'Turning to the specifics, in [Year], [Category] commenced at...',
          'This figure witnessed a twofold expansion, escalating from... to...',
          'By [Year], it had peaked at an all-time zenith of...'
        ],
        band9Example:
          'Turning to the specifics, in 2000, solar power generation stood at a negligible 50 GWh before embarking on steady incremental gains to reach 300 GWh by 2012. Thereafter, generation accelerated dramatically, culminating in an all-time peak of 1,450 GWh by the culmination of the recorded era.'
      },
      {
        title: 'Paragraph 4: Detailed Analysis of Trend 2 & Crossovers',
        targetWords: 60,
        purpose: 'Group remaining categories, highlight divergence, convergence, and final comparative standings.',
        starterPhrases: [
          'In stark contrast, [Category B] began at a substantial...',
          'Despite momentary fluctuations around [Year], the figure stabilized at...',
          'Meanwhile, [Category C] hovered between [X] and [Y] before...'
        ],
        band9Example:
          'In stark contrast, biomass began as the predominant energy source at 900 GWh in 2000. Despite minor fluctuations between 2005 and 2008, it steadily dwindled to under 400 GWh in 2020, having been overtaken by wind in 2011 and solar in 2016.'
      }
    ],
    academicCollocations: [
      'delineate the fluctuating levels',
      'exponential surge',
      'all-time zenith',
      'marked upward trajectory',
      'commence at a negligible figure',
      'culmination of the recorded era'
    ],
    commonPitfalls: [
      'Including raw statistics in the Overview paragraph (Overview must describe macro trends, not isolated numbers)',
      'Giving personal reasons or speculations for why figures changed (Task 1 requires strict objective reporting)',
      'Failing to specify measurement units (e.g. percentages, tonnes, GWh)'
    ]
  }
];

export const Band9EssayArchitect: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'skeletons' | 'evaluator'>('skeletons');
  const [selectedTemplate, setSelectedTemplate] = useState<EssayTemplate>(ESSAY_TEMPLATES[0]);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Live Essay Evaluator State
  const [essayTaskType, setEssayTaskType] = useState<'task2' | 'task1'>('task2');
  const [userEssay, setUserEssay] = useState<string>('');
  const [boostedEssay, setBoostedEssay] = useState<string | null>(null);

  // Vocabulary Enhancement Dictionary (Band 5/6 to Band 8/9 C1/C2)
  const VOCAB_UPGRADES: Record<string, string> = {
    'good': 'advantageous',
    'bad': 'detrimental',
    'big': 'substantial',
    'small': 'negligible',
    'important': 'paramount',
    'problem': 'predicament',
    'people': 'individuals',
    'show': 'demonstrate',
    'shows': 'delineates',
    'make': 'facilitate',
    'makes': 'facilitates',
    'help': 'assist',
    'many': 'a multitude of',
    'a lot of': 'a substantial volume of',
    'think': 'contend',
    'give': 'provide',
    'get': 'acquire'
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(label);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const handleReadSample = (text: string) => {
    if (isPlayingAudio) {
      stopSpeech();
      setIsPlayingAudio(false);
      return;
    }
    setIsPlayingAudio(true);
    speakBritish(text, {
      onEnd: () => setIsPlayingAudio(false),
      onError: () => setIsPlayingAudio(false)
    });
  };

  // Live Rubric Calculations
  const wordCount = userEssay.trim() ? userEssay.trim().split(/\s+/).filter(Boolean).length : 0;
  const paragraphCount = userEssay.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;
  const minRequired = essayTaskType === 'task2' ? 250 : 150;
  const isWordCountMet = wordCount >= minRequired;

  // Discourse Cohesion Markers
  const COHESIVE_MARKERS = [
    'furthermore', 'moreover', 'consequently', 'therefore', 'in contrast',
    'on the other hand', 'however', 'nonetheless', 'first and foremost',
    'subsequently', 'in conclusion', 'to illustrate', 'specifically',
    'while', 'whereas', 'although', 'despite'
  ];
  const detectedCohesiveMarkers = COHESIVE_MARKERS.filter((m) =>
    new RegExp(`\\b${m}\\b`, 'i').test(userEssay)
  );

  // Overused basic words detected
  const detectedBasicWords = Object.keys(VOCAB_UPGRADES).filter((w) =>
    new RegExp(`\\b${w}\\b`, 'i').test(userEssay)
  );

  // Academic Word List (AWL) Density Calculation
  const AWL_KEYWORDS = [
    'substantiate', 'paramount', 'detrimental', 'advantageous', 'predicament',
    'consequently', 'furthermore', 'predominantly', 'delineates', 'empirical',
    'perspective', 'unprecedented', 'hypothesis', 'correlation', 'paradigm',
    'diminish', 'fiscal', 'subsidize', 'societal', 'indispensable', 'comprehensive',
    'exponential', 'mitigate', 'disparity', 'prevalent', 'inequality', 'framework',
    'articulate', 'democratization', 'prerequisite', 'synthesis'
  ];
  const detectedAwlWords = AWL_KEYWORDS.filter((w) => new RegExp(`\\b${w}\\b`, 'i').test(userEssay));
  const awlDensityPercent = wordCount > 0 ? Math.min(100, Math.round((detectedAwlWords.length / wordCount) * 100)) : 0;

  const replaceSingleBasicWord = (basic: string) => {
    const advanced = VOCAB_UPGRADES[basic];
    if (!advanced) return;
    const regex = new RegExp(`\\b${basic}\\b`, 'gi');
    const updated = userEssay.replace(regex, (match) => {
      if (match[0] === match[0].toUpperCase()) {
        return advanced.charAt(0).toUpperCase() + advanced.slice(1);
      }
      return advanced;
    });
    setUserEssay(updated);
    soundManager.playSuccess();
  };

  // Estimate Rubric Scores
  const calculateScores = () => {
    if (wordCount === 0) return { tr: 0, cc: 0, lr: 0, gra: 0, overall: 0 };
    
    // 1. Task Response / Achievement
    let tr = 6.0;
    if (isWordCountMet) tr += 1.0;
    if (paragraphCount >= 4 && paragraphCount <= 5) tr += 0.5;
    if (userEssay.toLowerCase().includes('conclusion') || userEssay.toLowerCase().includes('summary')) tr += 0.5;
    tr = Math.min(9.0, tr);

    // 2. Coherence & Cohesion
    let cc = 6.0;
    if (detectedCohesiveMarkers.length >= 4) cc += 1.0;
    if (detectedCohesiveMarkers.length >= 7) cc += 1.0;
    if (paragraphCount >= 3) cc += 0.5;
    cc = Math.min(9.0, cc);

    // 3. Lexical Resource
    let lr = 6.0;
    if (wordCount > 100) {
      const uniqueWords = new Set(userEssay.toLowerCase().match(/[a-z']+/g) || []).size;
      const diversity = uniqueWords / wordCount;
      if (diversity > 0.45) lr += 1.0;
      if (detectedBasicWords.length === 0 && wordCount >= 100) lr += 1.0;
      else if (detectedBasicWords.length > 5) lr -= 0.5;
    }
    lr = Math.min(9.0, Math.max(5.0, lr));

    // 4. Grammatical Range & Accuracy
    let gra = 6.5;
    const complexSentences = (userEssay.match(/(although|which|that|whereas|while|because|if|unless|since|provided)/gi) || []).length;
    if (complexSentences >= 4) gra += 1.0;
    if (complexSentences >= 7) gra += 0.5;
    gra = Math.min(9.0, gra);

    const overall = Math.round(((tr + cc + lr + gra) / 4) * 2) / 2;
    return { tr, cc, lr, gra, overall };
  };

  const scores = calculateScores();

  // One-Click Academic Boost
  const handleBoostEssay = () => {
    if (!userEssay.trim()) return;
    let upgraded = userEssay;
    Object.entries(VOCAB_UPGRADES).forEach(([basic, advanced]) => {
      const regex = new RegExp(`\\b${basic}\\b`, 'gi');
      upgraded = upgraded.replace(regex, (match) => {
        // Preserve capitalization
        if (match[0] === match[0].toUpperCase()) {
          return advanced.charAt(0).toUpperCase() + advanced.slice(1);
        }
        return advanced;
      });
    });
    setBoostedEssay(upgraded);
    soundManager.playSuccess();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-lg relative overflow-hidden border border-blue-800/40">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-mono font-bold border border-blue-400/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Cambridge Band 9 Architecture</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            IELTS Band 9 Writing Architect & Live Scorer
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Eliminate guesswork in IELTS Writing. Explore proven sentence templates, cohesive paragraph formulas,
            and use our live examiner rubric evaluator to grade and boost your essays.
          </p>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 w-fit">
        <button
          onClick={() => {
            soundManager.playBeep(520, 0.04);
            setActiveMode('skeletons');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeMode === 'skeletons'
              ? 'bg-white dark:bg-[#101B32] text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>🏛️ Band 9 Essay Skeletons</span>
        </button>

        <button
          onClick={() => {
            soundManager.playBeep(580, 0.04);
            setActiveMode('evaluator');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeMode === 'evaluator'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>⚡ Live Cambridge Rubric Scorer & Word Enhancer</span>
        </button>
      </div>

      {/* Skeletons Mode View */}
      {activeMode === 'skeletons' && (
        <div className="space-y-6">
          {/* Template Selector Tabs */}
          <div className="flex flex-wrap gap-2">
            {ESSAY_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => setSelectedTemplate(tpl)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 border ${
                  selectedTemplate.id === tpl.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                    : 'bg-white dark:bg-[#101B32] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-blue-400'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{tpl.title}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    selectedTemplate.id === tpl.id
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {tpl.category === 'task2' ? 'Task 2' : 'Task 1'}
                </span>
              </button>
            ))}
          </div>

          {/* Active Template Overview */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#101B32] border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  {selectedTemplate.badge}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedTemplate.title}
                </h3>
              </div>
              <button
                onClick={() =>
                  handleCopy(
                    selectedTemplate.paragraphStructure.map((p) => `${p.title}\n${p.band9Example}`).join('\n\n'),
                    'full_essay'
                  )
                }
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-300 text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                {copiedSection === 'full_essay' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSection === 'full_essay' ? 'Copied Full Model!' : 'Copy Full Model Essay'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {selectedTemplate.description}
            </p>
          </div>

          {/* Paragraph Breakdown */}
          <div className="space-y-4">
            {selectedTemplate.paragraphStructure.map((p, idx) => (
              <div
                key={idx}
                className="p-5 rounded-3xl bg-white dark:bg-[#101B32] border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-mono font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{p.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-slate-400">Target: ~{p.targetWords} words</span>
                    <button
                      onClick={() => handleCopy(p.band9Example, `p_${idx}`)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      title="Copy Paragraph"
                    >
                      {copiedSection === `p_${idx}` ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{p.purpose}</span>
                </div>

                {/* High-Band Starter Phrases */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                    Band 8.5+ Cohesion Devices
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {p.starterPhrases.map((phrase, pIdx) => (
                      <div
                        key={pIdx}
                        onClick={() => handleCopy(phrase, `phrase_${idx}_${pIdx}`)}
                        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 font-mono flex items-center justify-between cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition group"
                      >
                        <span className="truncate">{phrase}</span>
                        <span className="text-[10px] text-slate-400 group-hover:text-blue-600 transition">
                          {copiedSection === `phrase_${idx}_${pIdx}` ? 'Copied!' : 'Click to copy'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Band 9 Example */}
                <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Cambridge Certified Model Paragraph</span>
                    </span>
                    <button
                      onClick={() => handleReadSample(p.band9Example)}
                      className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isPlayingAudio ? 'Stop ⏹' : 'Listen 🔊'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed italic">
                    "{p.band9Example}"
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Academic Collocations & Traps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-[#101B32] border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
              <div className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                High-Yield Academic Collocations
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedTemplate.academicCollocations.map((c, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-mono border border-blue-200/70 dark:border-blue-800/60"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-[#101B32] border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
              <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Critical Pitfalls to Avoid (Examiner Deductions)
              </div>
              <ul className="space-y-1.5">
                {selectedTemplate.commonPitfalls.map((pitfall, i) => (
                  <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                    <span className="text-rose-500 font-bold">✕</span>
                    <span>{pitfall}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Live Cambridge Rubric Scorer View */}
      {activeMode === 'evaluator' && (
        <div className="space-y-6 animate-fade-in">
          {/* Controls Bar */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#101B32] border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Exam Task:</span>
              <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setEssayTaskType('task2')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    essayTaskType === 'task2'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Writing Task 2 (250+ Words)
                </button>
                <button
                  onClick={() => setEssayTaskType('task1')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    essayTaskType === 'task1'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Writing Task 1 (150+ Words)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  setUserEssay(
                    essayTaskType === 'task2'
                      ? 'In contemporary society, it is frequently contended that tertiary education ought to be subsidized entirely by the state, whereas proponents of tuition fees assert that students must shoulder personal financial responsibility. While acknowledging that unfettered public expenditure poses fiscal challenges, I firmly believe that eliminating tuition barriers is paramount for fostering social mobility and long-term economic dynamism.\n\nThe principal argument in favor of universally free university schooling lies in the democratization of intellectual capital. When admission is determined strictly by cognitive aptitude rather than socioeconomic background, gifted students from impoverished households can access high-tier professions. Consequently, nations like Germany and Norway, which impose negligible or zero university fees, consistently register higher median social mobility metrics and reduced wealth inequality.\n\nFurthermore, from a macro-economic standpoint, a highly educated workforce is a prerequisite for competing in modern knowledge-driven economies. Had developing societies not expanded tertiary subsidies over past decades, their technical innovation capacity would have stagnated markedly. Graduates generate substantial tax revenues over their lifetime, thereby reimbursing state treasuries manifold.\n\nIn conclusion, although fiscal conservatism dictates caution, universal tuition waivers represent an indispensable investment in societal equity and intellectual progress. Governments should therefore prioritize education subsidies, funded perhaps through targeted corporate taxation.'
                      : 'The chart delineates the proportion of renewable electricity generation across Norway and Germany between 2000 and 2024.\n\nOverall, both nations witnessed an unmistakable upward progression in sustainable energy adoption, with Norway maintaining an overwhelming predominance throughout the examined timeframe. While Norway commenced from a commanding position, Germany exhibited the most pronounced rate of transformative growth.\n\nIn 2000, Norway initiated the period with a dominant renewable share of 68%. Despite minor interim fluctuations, Norwegian generation subsequently accelerated, ascending progressively to culminate at an all-time peak of 94% by 2024.\n\nIn stark contrast, Germany embarked from a modest 12% in 2000, remaining under 25% until 2012. However, the subsequent decade witnessed exponential expansion, with German clean power more than doubling to reach 52% at the close of the era.'
                  );
                  soundManager.playBeep(640, 0.04);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                Load Sample Prompt
              </button>

              <button
                onClick={() => {
                  setUserEssay('');
                  setBoostedEssay(null);
                  soundManager.playBeep(450, 0.04);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Main Writing Area & Real-Time Rubric Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Textarea & Controls */}
            <div className="lg:col-span-2 space-y-4">
              <div className="relative rounded-3xl bg-white dark:bg-[#101B32] border border-slate-200/90 dark:border-slate-800 shadow-xs p-5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">Candidate Draft Text</span>
                  </div>

                  {/* Word Count Indicator */}
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-500">Words:</span>
                    <span
                      className={`font-black text-sm px-2.5 py-0.5 rounded-lg ${
                        wordCount === 0
                          ? 'bg-slate-100 text-slate-500'
                          : isWordCountMet
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}
                    >
                      {wordCount} / {minRequired} min
                    </span>
                  </div>
                </div>

                <textarea
                  value={userEssay}
                  onChange={(e) => {
                    setUserEssay(e.target.value);
                    if (boostedEssay) setBoostedEssay(null);
                  }}
                  placeholder={
                    essayTaskType === 'task2'
                      ? 'Type or paste your complete IELTS Task 2 essay here... (Minimum 250 words recommended)'
                      : 'Type or paste your IELTS Task 1 report here... (Minimum 150 words recommended)'
                  }
                  rows={14}
                  className="w-full p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-sans text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                />

                {/* Essay Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBoostEssay}
                      disabled={wordCount < 20}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>⚡ Boost with Band 9 Collocations</span>
                    </button>

                    <button
                      onClick={() => handleReadSample(userEssay)}
                      disabled={wordCount < 10}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 disabled:opacity-40 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{isPlayingAudio ? 'Stop ⏹' : 'Listen 🔊'}</span>
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">
                    {paragraphCount} paragraphs detected
                  </span>
                </div>
              </div>

              {/* Boosted Preview if active */}
              {boostedEssay && (
                <div className="p-5 rounded-3xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 shadow-sm space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Band 9 Lexical Replacement Active</span>
                    </div>
                    <button
                      onClick={() => {
                        setUserEssay(boostedEssay);
                        setBoostedEssay(null);
                        soundManager.playSuccess();
                      }}
                      className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer"
                    >
                      Apply Upgrades to Editor ✓
                    </button>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900 text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                    {boostedEssay}
                  </div>
                </div>
              )}
            </div>

            {/* Right 1 Col: Live Cambridge 4-Criteria Scorecard */}
            <div className="space-y-4">
              <div className="p-6 rounded-3xl bg-white dark:bg-[#101B32] border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase text-blue-600 dark:text-blue-400 tracking-wider">
                      Examiner Evaluation
                    </span>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Estimated Band</h3>
                  </div>

                  <div className="text-center px-4 py-2 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md">
                    <div className="text-2xl font-black font-mono leading-none">
                      {scores.overall > 0 ? scores.overall.toFixed(1) : '—'}
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-blue-200 mt-0.5">
                      {scores.overall >= 8.0 ? 'Band 8+' : scores.overall >= 7.0 ? 'Band 7' : 'Band 6'}
                    </div>
                  </div>
                </div>

                {/* 4 Rubric Gauges */}
                <div className="space-y-3.5 text-xs">
                  {/* 1. Task Achievement / Response */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-700 dark:text-slate-300">Task Response (TR)</span>
                      <span className="font-mono text-blue-600 dark:text-blue-400">{scores.tr > 0 ? scores.tr.toFixed(1) : '—'}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                        style={{ width: `${(scores.tr / 9.0) * 100}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {wordCount === 0 ? 'Awaiting essay text' : isWordCountMet ? '✓ Meets official word limit' : `⚠ Under length (${minRequired - wordCount} words needed)`}
                    </div>
                  </div>

                  {/* 2. Coherence & Cohesion */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-700 dark:text-slate-300">Coherence & Cohesion (CC)</span>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400">{scores.cc > 0 ? scores.cc.toFixed(1) : '—'}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                        style={{ width: `${(scores.cc / 9.0) * 100}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {detectedCohesiveMarkers.length} discourse markers detected
                    </div>
                  </div>

                  {/* 3. Lexical Resource */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-700 dark:text-slate-300">Lexical Resource (LR)</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">{scores.lr > 0 ? scores.lr.toFixed(1) : '—'}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                        style={{ width: `${(scores.lr / 9.0) * 100}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {detectedBasicWords.length > 0 ? `⚠ ${detectedBasicWords.length} overused basic words found` : '✓ Strong vocabulary range'}
                    </div>
                  </div>

                  {/* 4. Grammatical Range */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-700 dark:text-slate-300">Grammar Range & Accuracy</span>
                      <span className="font-mono text-purple-600 dark:text-purple-400">{scores.gra > 0 ? scores.gra.toFixed(1) : '—'}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-purple-600 transition-all duration-300 rounded-full"
                        style={{ width: `${(scores.gra / 9.0) * 100}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Complex clause integration evaluated
                    </div>
                  </div>
                </div>

                {/* AWL Academic Word Density Meter */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">AWL Academic Density</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{awlDensityPercent}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, awlDensityPercent * 5)}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 flex justify-between">
                    <span>{detectedAwlWords.length} AWL terms</span>
                    <span>Target: ≥ 15%</span>
                  </div>
                </div>

                {/* Overused Words Replacement Recommendations with 1-Click Apply */}
                {detectedBasicWords.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                        Overused Basic Words ({detectedBasicWords.length}):
                      </span>
                      <span className="text-[10px] text-slate-400">Tap to upgrade</span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {detectedBasicWords.slice(0, 5).map((w) => (
                        <div key={w} className="flex items-center justify-between p-2 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-amber-950 dark:text-amber-200">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono line-through text-slate-400 text-[11px]">{w}</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs truncate">→ {VOCAB_UPGRADES[w]}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => replaceSingleBasicWord(w)}
                            className="px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition cursor-pointer shrink-0 shadow-2xs"
                            title={`Replace all instances of "${w}" with "${VOCAB_UPGRADES[w]}"`}
                          >
                            Replace
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
