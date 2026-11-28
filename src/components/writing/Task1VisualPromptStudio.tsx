import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  BarChart3,
  CheckCircle2,
  Circle,
  Copy,
  Check,
  Map as MapIcon,
  Table2,
  GitBranch,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import {
  loadActiveLabDrafts,
  saveActiveLabDrafts
} from '../../services/adaptivePreferencesStore';

export type Task1VisualType = 'chart' | 'table' | 'map' | 'process';

export interface Task1VisualPrompt {
  id: string;
  type: Task1VisualType;
  label: string;
  title: string;
  instruction: string;
  requiredDataTokens: string[];
  extremeAnchors: string[];
  modelOverview: string;
  modelFullReport: string;
  band8TipBn: string;
}

export interface Task1CoverageCheck {
  wordCount: number;
  meetsWordTarget: boolean;
  hasOverview: boolean;
  hasComparisonsOrSequence: boolean;
  matchedDataTokens: string[];
  missingDataTokens: string[];
  hasExtremes: boolean;
  readinessScore: number;
}

export const RENEWABLE_CHART_DATA = [
  { year: '2000', Norway: 62, Germany: 6, UK: 3, Japan: 9 },
  { year: '2006', Norway: 58, Germany: 12, UK: 5, Japan: 10 },
  { year: '2012', Norway: 68, Germany: 24, UK: 11, Japan: 12 },
  { year: '2018', Norway: 78, Germany: 38, UK: 33, Japan: 17 },
  { year: '2024', Norway: 88, Germany: 52, UK: 46, Japan: 24 }
];

export const COMMUTE_TABLE_DATA = [
  { city: 'London', railPct: 44, busPct: 22, carPct: 24, cycleWalkPct: 10, avgMins: 46 },
  { city: 'Tokyo', railPct: 61, busPct: 11, carPct: 14, cycleWalkPct: 14, avgMins: 49 },
  { city: 'Melbourne', railPct: 19, busPct: 12, carPct: 60, cycleWalkPct: 9, avgMins: 38 },
  { city: 'Toronto', railPct: 28, busPct: 18, carPct: 45, cycleWalkPct: 9, avgMins: 42 }
];

export const TASK1_VISUAL_PROMPTS: Task1VisualPrompt[] = [
  {
    id: 'renewable_chart',
    type: 'chart',
    label: 'Line / Bar Chart',
    title: 'Renewable Electricity Share Across 4 Nations (2000–2024)',
    instruction:
      'The chart compares the percentage of total electricity generated from renewable sources in Norway, Germany, the UK, and Japan between 2000 and 2024. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    requiredDataTokens: ['62', '88', '52', '46', '24', '2000', '2024'],
    extremeAnchors: ['norway', 'japan', '88', '3%', '6%'],
    modelOverview:
      'Overall, all four nations increased their reliance on renewable electricity over the 24-year period. Norway remained the undisputed leader throughout, whereas Germany and the UK recorded the steepest proportional expansions, leaving Japan with the smallest share by 2024.',
    modelFullReport:
      'The chart illustrates the proportion of electricity produced from renewable energy across Norway, Germany, the United Kingdom, and Japan between 2000 and 2024.\n\nOverall, all four nations increased their reliance on renewable electricity over the 24-year period. Norway remained the undisputed leader throughout, whereas Germany and the UK recorded the steepest proportional expansions, leaving Japan with the smallest share by 2024.\n\nIn 2000, Norway already generated 62% of its electricity from renewables, far exceeding Japan (9%), Germany (6%), and the UK (3%). Despite a brief dip to 58% in 2006, Norway climbed steadily to reach a peak of 88% in 2024.\n\nBy contrast, Germany and the UK experienced rapid acceleration after 2012. Germany expanded from 24% in 2012 to 52% in 2024, while the UK surged more than fourfold over the same span, rising from 11% to 46%. Japan followed a more gradual trajectory, edging upward from 9% in 2000 to 24% by the end of the timeframe.',
    band8TipBn:
      'চার্টের প্রতিটি সাল না লিখে শুরু (2000), বাঁক নেওয়ার বছর (2012) এবং শেষের সর্বোচ্চ/সর্বনিম্ন মান (88% বনাম 24%) তুলনা করে লিখুন।'
  },
  {
    id: 'commute_table',
    type: 'table',
    label: 'Comparison Table',
    title: 'Urban Commuter Mode Share & Average Travel Time (4 Global Cities)',
    instruction:
      'The table presents the percentage of commuters using four modes of transport alongside average one-way journey times in London, Tokyo, Melbourne, and Toronto. Summarise the main features and make relevant comparisons.',
    requiredDataTokens: ['61', '60', '44', '45', '49', '38'],
    extremeAnchors: ['tokyo', 'melbourne', '61', '60', '49', '38'],
    modelOverview:
      'Overall, rail dominated urban commuting in Tokyo and London, whereas private cars accounted for the largest share in Melbourne and Toronto. Notably, the two rail-heavy cities also recorded longer average commute times than car-oriented Melbourne.',
    modelFullReport:
      'The table compares commuter transport modes and average one-way travel durations across London, Tokyo, Melbourne, and Toronto.\n\nOverall, rail dominated urban commuting in Tokyo and London, whereas private cars accounted for the largest share in Melbourne and Toronto. Notably, the two rail-heavy cities also recorded longer average commute times than car-oriented Melbourne.\n\nTokyo had the highest rail dependency at 61%, followed by London at 44%. Conversely, car commuting was comparatively low in both capitals, standing at 14% in Tokyo and 24% in London. Bus travel was most prominent in London (22%), while active commuting (cycling and walking) peaked in Tokyo at 14%.\n\nIn sharp contrast, 60% of Melbourne commuters relied on cars, with rail representing just 19%. Toronto showed a similar car-led profile at 45%, alongside 28% rail and 18% bus usage. Average journey times ranged from a low of 38 minutes in Melbourne to 49 minutes in Tokyo, with Toronto (42 minutes) and London (46 minutes) sitting in between.',
    band8TipBn:
      'টেবিলের সারি ধরে না লিখে দুটি স্পষ্ট গ্রুপে ভাগ করুন: Rail-dominant (Tokyo & London) বনাম Car-dominant (Melbourne & Toronto)।'
  },
  {
    id: 'waterfront_map',
    type: 'map',
    label: 'Before & After Map',
    title: 'Harbourford Waterfront Redevelopment (1995 vs. 2025)',
    instruction:
      'The two maps illustrate how the Harbourford waterfront district changed between 1995 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    requiredDataTokens: ['1995', '2025', 'museum', 'marina', 'promenade', 'apartments'],
    extremeAnchors: ['north', 'south', 'warehouse', 'factory', 'replaced', 'converted'],
    modelOverview:
      'Overall, the Harbourford waterfront underwent a complete transformation from an industrial shipping zone into a pedestrian-friendly cultural and residential precinct, with heavy industry and coastal road traffic removed.',
    modelFullReport:
      'The two maps depict the redevelopment of the Harbourford waterfront between 1995 and 2025.\n\nOverall, the Harbourford waterfront underwent a complete transformation from an industrial shipping zone into a pedestrian-friendly cultural and residential precinct, with heavy industry and coastal road traffic removed.\n\nIn the north-western sector, the 1995 shipping warehouse was converted into a Cultural Museum, while the adjacent factory to the east was demolished and replaced by Eco-Apartments overlooking a new public park. The freight railway spur running across the northern boundary was completely dismantled.\n\nAlong the southern shoreline, the former coastal highway was pedestrianised into a landscaped Promenade. Similarly, the old cargo dock extending south into the bay was rebuilt as a modern Marina and Ferry Pier, reinforcing the area’s shift toward leisure and civic tourism.',
    band8TipBn:
      'ম্যাপে অবশ্যই কম্পাসের দিক (north-west, southern shoreline) এবং পরিবর্তনের passive verb ("was converted into", "was demolished and replaced by") ব্যবহার করুন।'
  },
  {
    id: 'geothermal_process',
    type: 'process',
    label: 'Process Diagram',
    title: 'How a Geothermal Power Plant Generates Electricity',
    instruction:
      'The diagram shows how geothermal energy is used to produce electricity. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    requiredDataTokens: ['4.5', 'injection', 'steam', 'condenser', 'turbine', 'generator'],
    extremeAnchors: ['cold water', 'hot rocks', 'turbine', 'grid'],
    modelOverview:
      'Overall, geothermal power generation is a six-stage linear process that pumps cold water deep underground to absorb subterranean heat before using the resulting steam to drive an above-ground turbine and generator.',
    modelFullReport:
      'The diagram illustrates the sequence of stages involved in generating electricity at a geothermal power station.\n\nOverall, geothermal power generation is a six-stage linear process that pumps cold water deep underground to absorb subterranean heat before using the resulting steam to drive an above-ground turbine and generator.\n\nThe process begins on the surface, where cold water stored in a holding tank is pumped downward through an injection well reaching a depth of 4.5 km. Below ground, the water flows through a geothermal zone composed of fractured hot rocks, which rapidly raise its temperature.\n\nNext, the superheated water is drawn back to the surface via a production well and enters a condenser, where it is converted into high-pressure steam. This steam then powers a mechanical turbine linked directly to an electrical generator. Finally, the electricity produced by the generator is transmitted to a step-up tower and distributed across the national power grid.',
    band8TipBn:
      'প্রসেস ডায়াগ্রামে Overview-এ মোট ধাপের সংখ্যা (6 stages) এবং শুরু থেকে শেষের রূপান্তর (cold water → electricity) লিখুন; বডি প্যারাগ্রাফে Present Simple Passive ("is pumped", "is converted") ব্যবহার করুন।'
  }
];

const OVERVIEW_MARKERS = [
  'overall',
  'in summary',
  'in general',
  'to summarise',
  'to summarize',
  'it is clear that',
  'broadly speaking',
  'as an overview'
];

const COMPARISON_OR_SEQUENCE_MARKERS = [
  'whereas',
  'while',
  'compared to',
  'in contrast',
  'by contrast',
  'conversely',
  'higher than',
  'lower than',
  'surpassed',
  'exceeded',
  'replaced by',
  'converted into',
  'demolished',
  'subsequently',
  'next,',
  'finally',
  'followed by',
  'stage',
  'transformed'
];

export function analyzeTask1DraftCoverage(
  draft: string,
  prompt: Task1VisualPrompt
): Task1CoverageCheck {
  const clean = (draft || '').trim();
  const words = clean ? clean.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const lower = clean.toLowerCase();

  const hasOverview = OVERVIEW_MARKERS.some((m) => lower.includes(m));
  const hasComparisonsOrSequence = COMPARISON_OR_SEQUENCE_MARKERS.some((m) => lower.includes(m));

  const matchedDataTokens: string[] = [];
  const missingDataTokens: string[] = [];
  for (const token of prompt.requiredDataTokens) {
    if (lower.includes(token.toLowerCase())) {
      matchedDataTokens.push(token);
    } else {
      missingDataTokens.push(token);
    }
  }

  const extremeHits = prompt.extremeAnchors.filter((anchor) =>
    lower.includes(anchor.toLowerCase())
  ).length;
  const hasExtremes = extremeHits >= 2;
  const meetsWordTarget = wordCount >= 150;

  let score = 0;
  if (meetsWordTarget) score += 25;
  else if (wordCount >= 80) score += 12;
  if (hasOverview) score += 25;
  if (hasComparisonsOrSequence) score += 20;
  if (hasExtremes) score += 15;
  if (prompt.requiredDataTokens.length > 0) {
    score += Math.round((matchedDataTokens.length / prompt.requiredDataTokens.length) * 15);
  }

  return {
    wordCount,
    meetsWordTarget,
    hasOverview,
    hasComparisonsOrSequence,
    matchedDataTokens,
    missingDataTokens,
    hasExtremes,
    readinessScore: Math.min(100, score)
  };
}

interface Task1VisualPromptStudioProps {
  externalDraft?: string;
  onExternalDraftChange?: (text: string) => void;
  onPromptSelect?: (promptText: string, promptId: string) => void;
  onShowToast?: (msg: string) => void;
  compact?: boolean;
}

export const Task1VisualPromptStudio: React.FC<Task1VisualPromptStudioProps> = ({
  externalDraft,
  onExternalDraftChange,
  onPromptSelect,
  onShowToast,
  compact = false
}) => {
  const persisted = useMemo(() => loadActiveLabDrafts(), []);
  const [selectedPromptId, setSelectedPromptId] = useState<string>(
    TASK1_VISUAL_PROMPTS.some((p) => p.id === persisted.writingTask1PromptId)
      ? persisted.writingTask1PromptId
      : 'renewable_chart'
  );
  const [chartStyle, setChartStyle] = useState<'line' | 'bar'>('line');
  const [localDraft, setLocalDraft] = useState<string>(persisted.writingTask1Draft || '');
  const [showModel, setShowModel] = useState(false);
  const [copiedModel, setCopiedModel] = useState(false);

  const activePrompt = useMemo(
    () => TASK1_VISUAL_PROMPTS.find((p) => p.id === selectedPromptId) || TASK1_VISUAL_PROMPTS[0],
    [selectedPromptId]
  );

  const activeDraft = externalDraft !== undefined ? externalDraft : localDraft;

  const handleDraftChange = (val: string) => {
    if (onExternalDraftChange) {
      onExternalDraftChange(val);
    } else {
      setLocalDraft(val);
    }
  };

  // Debounced cross-device draft sync for Writing Task 1
  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveActiveLabDrafts({
        activeModule: 'writing',
        writingTask1PromptId: selectedPromptId,
        writingTask1Draft: activeDraft
      });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [activeDraft, selectedPromptId]);

  const coverage = useMemo(
    () => analyzeTask1DraftCoverage(activeDraft, activePrompt),
    [activeDraft, activePrompt]
  );

  const handleSelectPrompt = (p: Task1VisualPrompt) => {
    setSelectedPromptId(p.id);
    setShowModel(false);
    soundManager.playBeep(560, 0.04);
    onPromptSelect?.(p.instruction, p.id);
  };

  const handleCopyModel = () => {
    navigator.clipboard.writeText(activePrompt.modelFullReport).catch(() => {});
    setCopiedModel(true);
    soundManager.playSuccess();
    onShowToast?.(`Copied Band 8.5+ model report for "${activePrompt.label}".`);
    window.setTimeout(() => setCopiedModel(false), 2000);
  };

  const renderVisual = () => {
    if (activePrompt.type === 'chart') {
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#566664] dark:text-slate-400">
              Interactive Recharts Data Visual (% of Total Electricity)
            </span>
            <div className="inline-flex rounded-lg border border-[#D3DDDA] dark:border-[#1F8A70]/35 bg-[#F7F9F8] dark:bg-[#0B1514] p-0.5 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setChartStyle('line')}
                className={`px-2.5 py-1 rounded-md cursor-pointer transition ${
                  chartStyle === 'line'
                    ? 'bg-[#0F4C45] text-white'
                    : 'text-[#566664] dark:text-slate-300'
                }`}
              >
                Line Graph
              </button>
              <button
                type="button"
                onClick={() => setChartStyle('bar')}
                className={`px-2.5 py-1 rounded-md cursor-pointer transition ${
                  chartStyle === 'bar'
                    ? 'bg-[#0F4C45] text-white'
                    : 'text-[#566664] dark:text-slate-300'
                }`}
              >
                Bar Chart
              </button>
            </div>
          </div>

          <div className="h-[260px] w-full rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/25 p-3">
            <ResponsiveContainer width="100%" height="100%">
              {chartStyle === 'line' ? (
                <LineChart data={RENEWABLE_CHART_DATA} margin={{ top: 10, right: 16, left: -12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #1F8A70',
                      backgroundColor: '#0E1F1E',
                      color: '#EEF3F1',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="Norway" stroke="#0F4C45" strokeWidth={2.8} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Germany" stroke="#F4A62A" strokeWidth={2.8} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="UK" stroke="#1F8A70" strokeWidth={2.4} dot={{ r: 3.5 }} />
                  <Line type="monotone" dataKey="Japan" stroke="#64748b" strokeWidth={2.2} strokeDasharray="4 3" dot={{ r: 3 }} />
                </LineChart>
              ) : (
                <BarChart data={RENEWABLE_CHART_DATA} margin={{ top: 10, right: 16, left: -12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #1F8A70',
                      backgroundColor: '#0E1F1E',
                      color: '#EEF3F1',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="Norway" fill="#0F4C45" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Germany" fill="#F4A62A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="UK" fill="#1F8A70" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Japan" fill="#64748b" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      );
    }

    if (activePrompt.type === 'table') {
      return (
        <div className="overflow-x-auto rounded-xl border border-[#D3DDDA] dark:border-[#1F8A70]/30 bg-[#F7F9F8] dark:bg-[#0B1514]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#0F4C45] text-white font-mono">
                <th className="py-2.5 px-3 font-bold">City</th>
                <th className="py-2.5 px-3 font-bold text-right">Rail (%)</th>
                <th className="py-2.5 px-3 font-bold text-right">Bus (%)</th>
                <th className="py-2.5 px-3 font-bold text-right">Private Car (%)</th>
                <th className="py-2.5 px-3 font-bold text-right">Walk / Cycle (%)</th>
                <th className="py-2.5 px-3 font-bold text-right">Avg. Time (min)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D3DDDA]/60 dark:divide-[#1F8A70]/20 font-mono tabular-nums">
              {COMMUTE_TABLE_DATA.map((row) => (
                <tr key={row.city} className="hover:bg-white dark:hover:bg-[#11201E] transition">
                  <td className="py-2.5 px-3 font-sans font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                    {row.city}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-[#0F4C45] dark:text-[#6EE7B7]">
                    {row.railPct}%
                  </td>
                  <td className="py-2.5 px-3 text-right text-[#566664] dark:text-slate-300">
                    {row.busPct}%
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-[#9B6314] dark:text-[#F4A62A]">
                    {row.carPct}%
                  </td>
                  <td className="py-2.5 px-3 text-right text-[#566664] dark:text-slate-300">
                    {row.cycleWalkPct}%
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                    {row.avgMins} min
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (activePrompt.type === 'map') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* 1995 Before Map */}
          <div className="p-3 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[#566664] dark:text-slate-300">
              <span>HARBOURFORD — 1995</span>
              <span>N ↑</span>
            </div>
            <svg viewBox="0 0 320 190" className="w-full h-auto rounded-lg bg-[#EEF3F1] dark:bg-[#11201E]">
              <line x1="12" y1="20" x2="308" y2="20" stroke="#64748b" strokeWidth="3" strokeDasharray="6 4" />
              <text x="160" y="14" fontSize="9" textAnchor="middle" fill="#64748b" fontWeight="bold">Freight Railway Line</text>
              <rect x="24" y="34" width="110" height="54" rx="6" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
              <text x="79" y="64" fontSize="10" textAnchor="middle" fill="#1e293b" fontWeight="bold">Shipping Warehouse</text>
              <rect x="166" y="34" width="128" height="54" rx="6" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
              <text x="230" y="64" fontSize="10" textAnchor="middle" fill="#1e293b" fontWeight="bold">Industrial Factory</text>
              <rect x="12" y="102" width="296" height="22" fill="#475569" />
              <text x="160" y="116" fontSize="9.5" textAnchor="middle" fill="#ffffff" fontWeight="bold">Coastal Highway (Heavy Traffic)</text>
              <rect x="12" y="132" width="296" height="50" fill="#bae6fd" />
              <rect x="122" y="124" width="76" height="44" rx="3" fill="#64748b" />
              <text x="160" y="149" fontSize="9.5" textAnchor="middle" fill="#ffffff" fontWeight="bold">Cargo Dock</text>
              <text x="54" y="168" fontSize="9" fill="#0369a1" fontWeight="bold">HARBOUR BAY</text>
            </svg>
          </div>

          {/* 2025 After Map */}
          <div className="p-3 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#0F4C45]/40 dark:border-[#1F8A70]/45 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[#0F4C45] dark:text-[#6EE7B7]">
              <span>HARBOURFORD — 2025</span>
              <span>N ↑</span>
            </div>
            <svg viewBox="0 0 320 190" className="w-full h-auto rounded-lg bg-[#EEF3F1] dark:bg-[#11201E]">
              <rect x="24" y="26" width="110" height="60" rx="6" fill="#0F4C45" />
              <text x="79" y="54" fontSize="10" textAnchor="middle" fill="#ffffff" fontWeight="bold">Cultural</text>
              <text x="79" y="67" fontSize="10" textAnchor="middle" fill="#F4A62A" fontWeight="bold">Museum</text>
              <rect x="152" y="26" width="78" height="60" rx="6" fill="#1F8A70" />
              <text x="191" y="59" fontSize="9.5" textAnchor="middle" fill="#ffffff" fontWeight="bold">Public Park</text>
              <rect x="238" y="26" width="68" height="60" rx="6" fill="#F4A62A" />
              <text x="272" y="53" fontSize="9" textAnchor="middle" fill="#0E1F1E" fontWeight="bold">Eco-</text>
              <text x="272" y="66" fontSize="9" textAnchor="middle" fill="#0E1F1E" fontWeight="bold">Apartments</text>
              <rect x="12" y="100" width="296" height="22" rx="4" fill="#d1fae5" stroke="#0F4C45" strokeWidth="1.2" />
              <text x="160" y="114" fontSize="9.5" textAnchor="middle" fill="#0F4C45" fontWeight="bold">Pedestrian Promenade &amp; Cycle Path</text>
              <rect x="12" y="132" width="296" height="50" fill="#bae6fd" />
              <rect x="114" y="124" width="94" height="44" rx="4" fill="#0F4C45" />
              <text x="161" y="144" fontSize="9" textAnchor="middle" fill="#ffffff" fontWeight="bold">Marina &amp;</text>
              <text x="161" y="156" fontSize="9" textAnchor="middle" fill="#F4A62A" fontWeight="bold">Ferry Pier</text>
              <text x="54" y="168" fontSize="9" fill="#0369a1" fontWeight="bold">HARBOUR BAY</text>
            </svg>
          </div>
        </div>
      );
    }

    // 6-Stage Geothermal Process Diagram
    const stages = [
      { step: '1', title: 'Cold Water Tank', sub: 'Surface intake' },
      { step: '2', title: 'Injection Well', sub: 'Pumped 4.5 km down' },
      { step: '3', title: 'Geothermal Zone', sub: 'Fractured hot rocks' },
      { step: '4', title: 'Production Well', sub: 'Hot water rises' },
      { step: '5', title: 'Condenser', sub: 'Converts to steam' },
      { step: '6', title: 'Turbine & Generator', sub: 'Power to national grid' }
    ];

    return (
      <div className="p-4 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 space-y-3">
        <div className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#0F4C45] dark:text-[#6EE7B7]">
          6-Stage Geothermal Electricity Production Flow
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {stages.map((st, idx) => (
            <div
              key={st.step}
              className="relative p-3 rounded-xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="w-5 h-5 rounded-md bg-[#0F4C45] text-[#F4A62A] font-mono text-[11px] font-bold flex items-center justify-center">
                  {st.step}
                </span>
                {idx < stages.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-[#1F8A70] shrink-0" />
                )}
              </div>
              <div className="text-xs font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                {st.title}
              </div>
              <div className="text-[11px] text-[#566664] dark:text-slate-400">
                {st.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const tabIcon = (type: Task1VisualType) => {
    if (type === 'chart') return BarChart3;
    if (type === 'table') return Table2;
    if (type === 'map') return MapIcon;
    return GitBranch;
  };

  return (
    <div
      data-testid="task1-visual-prompt-studio"
      className="rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/35 p-5 sm:p-6 space-y-5"
    >
      {/* Header + Visual Type Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#EEF3F1] dark:border-[#1F8A70]/25">
        <div className="space-y-1">
          <div className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#0F4C45] dark:text-[#6EE7B7]">
            Academic Writing Task 1 · Visual Data Studio
          </div>
          <h3 className="font-display text-lg sm:text-xl font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
            {activePrompt.title}
          </h3>
          <p className="text-xs text-[#566664] dark:text-slate-400 leading-relaxed max-w-2xl">
            {activePrompt.instruction}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {TASK1_VISUAL_PROMPTS.map((p) => {
            const Icon = tabIcon(p.type);
            const active = p.id === activePrompt.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPrompt(p)}
                className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border transition cursor-pointer ${
                  active
                    ? 'bg-[#0F4C45] text-white border-[#0F4C45]'
                    : 'bg-[#F7F9F8] dark:bg-[#0B1514] text-[#0E1F1E] dark:text-slate-200 border-[#D3DDDA] dark:border-[#1F8A70]/30 hover:border-[#0F4C45]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-[#F4A62A]' : 'text-[#0F4C45] dark:text-[#6EE7B7]'}`} />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Visual + Live Key-Trend & Data-Citation Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 space-y-4">
          {renderVisual()}

          <div className="p-3.5 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-xs space-y-1.5">
            <div className="font-bold text-[#0F4C45] dark:text-[#6EE7B7]">
              বাংলা Band 8+ টিপস
            </div>
            <p className="text-[#0E1F1E] dark:text-slate-300 leading-relaxed">
              {activePrompt.band8TipBn}
            </p>
          </div>
        </div>

        {/* Right: Live Task Achievement & Data-Citation Checklist */}
        <div className="lg:col-span-5 p-4 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#0F4C45] dark:text-[#6EE7B7]">
                Live Key-Trend Checklist
              </div>
              <div className="text-xs text-[#566664] dark:text-slate-400">
                Checks your draft against real visual data
              </div>
            </div>
            <div className="text-right font-mono tabular-nums">
              <div className="text-lg font-bold text-[#0F4C45] dark:text-[#F4A62A] leading-none">
                {coverage.readinessScore}%
              </div>
              <div className="text-[10px] text-[#566664] dark:text-slate-400">
                {coverage.wordCount}/150w
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            {[
              {
                label: 'Minimum 150 words reached',
                ok: coverage.meetsWordTarget,
                detail: `${coverage.wordCount} words`
              },
              {
                label: 'Clear Overview paragraph ("Overall...")',
                ok: coverage.hasOverview,
                detail: coverage.hasOverview ? 'Detected' : 'Add "Overall, ..."'
              },
              {
                label: 'Comparisons or stage sequencing used',
                ok: coverage.hasComparisonsOrSequence,
                detail: coverage.hasComparisonsOrSequence ? 'Detected' : 'Use whereas / next'
              },
              {
                label: 'Key extremes / landmarks highlighted',
                ok: coverage.hasExtremes,
                detail: coverage.hasExtremes ? 'Cited' : 'Cite highest & lowest'
              }
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-2 py-1.5 border-b border-[#D3DDDA]/50 dark:border-[#1F8A70]/20 last:border-b-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {row.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-[#566664] dark:text-slate-500 shrink-0" />
                  )}
                  <span
                    className={`truncate ${
                      row.ok
                        ? 'font-semibold text-[#0E1F1E] dark:text-[#EEF3F1]'
                        : 'text-[#566664] dark:text-slate-400'
                    }`}
                  >
                    {row.label}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-[#566664] dark:text-slate-400 shrink-0">
                  {row.detail}
                </span>
              </div>
            ))}
          </div>

          {/* Real Data Anchors Citation Tracker */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-semibold text-[#0E1F1E] dark:text-[#EEF3F1]">
              Visual Data Citations ({coverage.matchedDataTokens.length}/{activePrompt.requiredDataTokens.length})
            </div>
            <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
              {activePrompt.requiredDataTokens.map((tok) => {
                const hit = coverage.matchedDataTokens.includes(tok);
                return (
                  <span
                    key={tok}
                    className={`px-2 py-0.5 rounded-md border ${
                      hit
                        ? 'bg-[#0F4C45] text-white border-[#0F4C45] font-bold'
                        : 'bg-white dark:bg-[#11201E] text-[#566664] dark:text-slate-400 border-[#D3DDDA] dark:border-[#1F8A70]/30'
                    }`}
                  >
                    {tok}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowModel((prev) => !prev)}
              className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 hover:border-[#0F4C45] text-xs font-bold text-[#0F4C45] dark:text-[#6EE7B7] inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F4A62A]" />
              <span>{showModel ? 'Hide Model Report' : 'Inspect Band 8.5+ Model'}</span>
            </button>
            <button
              type="button"
              onClick={handleCopyModel}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              title="Copy Band 8.5+ model report"
            >
              {copiedModel ? <Check className="w-3.5 h-3.5 text-[#F4A62A]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedModel ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Standalone Draft Editor when not controlled externally */}
      {!compact && externalDraft === undefined && (
        <div className="space-y-2 pt-2 border-t border-[#EEF3F1] dark:border-[#1F8A70]/25">
          <div className="flex items-center justify-between text-xs">
            <label
              htmlFor="task1-studio-draft"
              className="font-bold text-[#0E1F1E] dark:text-[#EEF3F1]"
            >
              Write Your 150+ Word Task 1 Report (Auto-synced across devices)
            </label>
            <span className="font-mono tabular-nums text-[#566664] dark:text-slate-400">
              {coverage.wordCount} words
            </span>
          </div>
          <textarea
            id="task1-studio-draft"
            value={activeDraft}
            onChange={(e) => handleDraftChange(e.target.value)}
            rows={6}
            placeholder="Start with a paraphrased introduction, then write a clear 'Overall, ...' paragraph highlighting the main trends without raw numbers, followed by two data-rich body paragraphs..."
            className="w-full p-3.5 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-sm text-[#0E1F1E] dark:text-[#EEF3F1] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0F4C45]"
          />
        </div>
      )}

      {/* Expandable Band 8.5+ Model Response */}
      {showModel && (
        <div className="p-4 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] border border-[#0F4C45]/30 space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#0F4C45] dark:text-[#6EE7B7]">
            Band 8.5+ Exemplar Report · {activePrompt.label}
          </div>
          <p className="text-xs sm:text-sm text-[#0E1F1E] dark:text-slate-200 leading-relaxed whitespace-pre-line font-serif">
            {activePrompt.modelFullReport}
          </p>
        </div>
      )}
    </div>
  );
};
