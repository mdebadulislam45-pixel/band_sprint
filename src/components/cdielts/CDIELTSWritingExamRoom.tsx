import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  PenTool,
  BarChart3,
  FileText,
  Award,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Save,
  BookOpen,
  Layers,
  ChevronRight,
  Check,
  HelpCircle,
  Eye,
  EyeOff,
  SplitSquareVertical,
  ShieldAlert,
  Contrast,
  Type,
  Loader2
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { getCurrentUser, recordExamAttempt } from '../../utils/userStorage';
import { addMistake } from '../../utils/vaultStorage';
import { checkWritingWordThreshold } from '../../services/WritingEvaluationService';
import { getStoredSessionToken } from '../../services/authService';
import {
  formatNullableBand,
  validateClientWritingEvaluation,
  validateCriterionBand
} from '../../utils/scoringIntegrity';
import {
  CDIELTSColorScheme,
  CDIELTSZoomLevel,
  getCDIELTSThemeClasses,
  getCDIELTSFontSizeClass
} from './CDIELTSThemeContainer';
import { WritingBandDiffStudio } from '../writing/WritingBandDiffStudio';

export type WritingExamFormat = 'Academic' | 'General Training';

export interface WritingExamRoomProps {
  onExit: () => void;
  onShowToast: (msg: string) => void;
  initialTask?: 1 | 2;
  initialPrompt?: string;
  initialText?: string;
  initialFormat?: WritingExamFormat;
  customPilotSet?: WritingTestSet;
  pilotDraftId?: string;
  onExitPilot?: () => void;
  onOpenAiPilots?: () => void;
  onOpenAuxiliaryLabs?: () => void;
  embeddedInFullExam?: boolean;
}

export interface SentenceAnnotation {
  id: string;
  sentence: string;
  category: 'grammar' | 'lexical' | 'cohesion' | 'clean';
  errorTitle?: string;
  identifiedIssue?: string;
  suggestedCorrection?: string;
  rationaleEn?: string;
  rationaleBn?: string;
}

export type WritingDiagnosticStatus =
  | 'evaluated'
  | 'structural_precheck'
  | 'insufficient_evidence'
  | 'unavailable';

export interface WritingDiagnosticResult {
  isValidAttempt?: boolean;
  assessmentStatus?: WritingDiagnosticStatus;
  evaluationSource?: string;
  feedbackTitle?: string;
  feedbackEn?: string;
  feedbackBn?: string;
  error?: string;
  canRetry?: boolean;
  taskType: 1 | 2;
  wordCount: number;
  minWords: number;
  overallBand: number | null;
  targetBand: number;
  cefrLevel: string;
  taScore: number | null;
  taSummary: string;
  ccScore: number | null;
  ccSummary: string;
  lrScore: number | null;
  lrSummary: string;
  graScore: number | null;
  graSummary: string;
  annotations: SentenceAnnotation[];
  upgradedModelParagraphs: Array<{
    original: string;
    upgradedHtml: Array<{ text: string; isUpgrade: boolean }>;
  }>;
}

export interface WritingTestSet {
  id: string;
  format?: WritingExamFormat;
  title: string;
  badge?: string;
  task1Title: string;
  task1Prompt: string;
  task1BulletPoints?: string[];
  task1LetterType?: 'Formal' | 'Semi-Formal' | 'Informal';
  task1ChartTitle?: string;
  task1ChartSubtitle?: string;
  task1Unit?: string;
  task1Categories?: string[];
  task1Series?: Array<{
    name: string;
    color: string;
    values: number[];
  }>;
  task1TableSummary?: Array<{
    country: string;
    y2010: string;
    y2018: string;
    y2025: string;
    growth: string;
  }>;
  task1VisualData?: any;
  task1SampleCandidateDraft: string;
  task2Title: string;
  task2Prompt: string;
  task2SampleCandidateDraft: string;
}

/**
 * Adapter helper to convert an AI Writing Draft or MockExamSet payload into a WritingTestSet
 */
export function convertDraftToWritingTestSet(draft: any): WritingTestSet {
  const content = draft?.content || draft?.examSet || draft || {};
  const task1 = content.task1 || {};
  const task2 = content.task2 || {};
  const format = (content.format || 'Academic') as WritingExamFormat;

  let task1LetterType: 'Formal' | 'Semi-Formal' | 'Informal' | undefined = undefined;
  if (format === 'General Training' && task1.questionType) {
    const qType = String(task1.questionType).toLowerCase();
    if (qType.includes('semi')) task1LetterType = 'Semi-Formal';
    else if (qType.includes('informal')) task1LetterType = 'Informal';
    else if (qType.includes('formal')) task1LetterType = 'Formal';
  }

  const vd = task1.visualData || {};

  return {
    id: draft.id || content.examId || `draft_writing_${Date.now()}`,
    format,
    title: content.title || `AI Pilot Writing (${draft.id || 'draft'})`,
    badge: draft?.status === 'PENDING_REVIEW' ? 'AI PILOT DRAFT' : 'AI PILOT — APPROVED PRACTICE',
    task1Title: task1.prompt ? `Task 1: ${task1.questionType || (format === 'General Training' ? 'Letter' : 'Visual Overview')}` : (content.task1Type ? `Task 1: ${content.task1Type}` : 'Task 1 Visual Overview'),
    task1Prompt: task1.prompt || content.task1Prompt || 'Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    task1BulletPoints: Array.isArray(task1.bulletPoints) ? task1.bulletPoints : (Array.isArray(content.task1BulletPoints) ? content.task1BulletPoints : undefined),
    task1LetterType,
    task1ChartTitle: vd.chartTitle || task1.chartTitle || 'Task 1 Visual Data',
    task1ChartSubtitle: vd.units ? `Units: ${vd.units}` : 'AI Generated Visual Dataset',
    task1Unit: vd.units || '',
    task1Categories: Array.isArray(vd.categories) ? vd.categories : undefined,
    task1Series: Array.isArray(vd.series)
      ? vd.series.map((s: any, idx: number) => ({
          name: s.name || `Series ${idx + 1}`,
          color: s.color || (idx === 0 ? '#64748b' : idx === 1 ? '#2563eb' : '#10b981'),
          values: Array.isArray(s.data) ? s.data : []
        }))
      : undefined,
    task1VisualData: vd,
    task1SampleCandidateDraft: task1.sampleResponse || task1.sampleModelAnswerBand9 || content.task1Model || '',
    task2Title: task2.prompt ? `Task 2: ${task2.questionType || 'Essay'} (${task2.topicCategory || 'Topic'})` : 'Task 2 Essay',
    task2Prompt: task2.prompt
      ? `${task2.prompt}${task2.questionText ? `\n\n${task2.questionText}` : ''}`
      : (content.writingPrompt || task2.questionText || ''),
    task2SampleCandidateDraft: task2.sampleResponse || task2.sampleModelAnswerBand9 || content.modelEssay || ''
  };
}

export const ACADEMIC_WRITING_SETS: WritingTestSet[] = [
  {
    id: 'cam18_writing_set1',
    format: 'Academic',
    title: 'Practice Academic Writing Set 18',
    task1Title: 'Task 1: Renewable Electricity & Grid Modernisation',
    task1Prompt:
      'The bar chart and accompanying table below illustrate the percentage of total electricity generated from renewable sources across four nations between 2010 and 2025, alongside national grid storage investment. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    task1ChartTitle: 'Share of Electricity From Renewable Sources (%) · 2010–2025',
    task1ChartSubtitle: 'Comparative Energy & Eurostat Practice Dataset',
    task1Unit: '% of Total Grid Output',
    task1Categories: ['Norway', 'Germany', 'United Kingdom', 'Australia'],
    task1Series: [
      { name: '2010', color: '#64748b', values: [62, 17, 9, 11] },
      { name: '2018', color: '#2563eb', values: [74, 38, 33, 21] },
      { name: '2025', color: '#10b981', values: [88, 56, 49, 39] }
    ],
    task1TableSummary: [
      { country: 'Norway', y2010: '62%', y2018: '74%', y2025: '88%', growth: '+26% (Hydropower & Offshore Wind)' },
      { country: 'Germany', y2010: '17%', y2018: '38%', y2025: '56%', growth: '+39% (Solar PV & Onshore Wind)' },
      { country: 'United Kingdom', y2010: '9%', y2018: '33%', y2025: '49%', growth: '+40% (North Sea Wind Expansion)' },
      { country: 'Australia', y2010: '11%', y2018: '21%', y2025: '39%', growth: '+28% (Utility-Scale Solar)' }
    ],
    task1SampleCandidateDraft: `The bar chart and table shows the proportion of electricity produced from renewable energy in four different countries between 2010 and 2025. Overall, it is clear that renewable energy usage increase in all four countries over the period, with Norway having the highest percentage in every year.

Looking at the details, Norway started at 62% in 2010 and goes up steadily to 88% in 2025. Furthermore, Germany and the UK had a very big growth in green electricity. In 2010, the UK only produced 9% from renewable sources, which was the lowest figure on the chart. Moreover, by 2025 the UK number jumped to 49%, which is almost five times higher than 2010.

Furthermore, Germany increased from 17% in 2010 to 56% in 2025. Australia also shows an upward trend from 11% to 39%, although its growth was slower compare to Germany and Britain. In conclusion, all four nations invested a lot of money to make their electricity cleaner.`,
    task2Title: 'Task 2: Universal Free University Education',
    task2Prompt:
      'Some people believe that university education should be completely free for all citizens, regardless of their financial background. To what extent do you agree or disagree? Give reasons for your answer and include any relevant examples from your own knowledge or experience.',
    task2SampleCandidateDraft: `Nowadays, university tuition fees is becoming a huge debate in many countries. Many people think that higher education should be completely free for every students, while others argue that it is too expensive for the government. I partly agree with this view because free university helps poor students, but it can also create tax problems.

Firstly, making university free gives equal opportunity to talented young people from low-income families. Lots of smart students cannot go to college because the tuition fee is too high and they afraid of taking big bank loans. Furthermore, when more people get a degree, the country gets more doctors, engineers, and scientists, which is very good for the economy. Moreover, educated citizens pays more taxes in the future.

Furthermore, on the other hand, if university is 100% free for everyone, many students will not take their studies seriously. Moreover, rich families can easily afford to pay for their children education, so giving them free tuition is a waste of public money. Instead of making it free for everyone, governments should give scholarships to needy and meritorious students.

In conclusion, although free tertiary education has many benefits for social equality, I believe that a targeted scholarship system is more realistic and fair for taxpayers.`
  },
  {
    id: 'cam18_writing_set2',
    format: 'Academic',
    title: 'Practice Academic Writing Set 19',
    task1Title: 'Task 1: High-Speed Rail Passenger Volumes & Modal Shift',
    task1Prompt:
      'The chart and table below give information about annual high-speed rail passenger volumes (in millions) and domestic short-haul flight reductions across four corridors between 2010 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    task1ChartTitle: 'Annual High-Speed Rail Ridership (Millions of Passengers)',
    task1ChartSubtitle: 'International Transport Forum (ITF) Corridor Audit',
    task1Unit: 'Million Passengers / Year',
    task1Categories: ['Tokyo–Osaka', 'Paris–Lyon', 'Madrid–Barcelona', 'London–Paris'],
    task1Series: [
      { name: '2010', color: '#64748b', values: [138, 39, 16, 19] },
      { name: '2018', color: '#2563eb', values: [158, 44, 28, 24] },
      { name: '2025', color: '#10b981', values: [172, 53, 41, 31] }
    ],
    task1TableSummary: [
      { country: 'Tokyo–Osaka', y2010: '138M', y2018: '158M', y2025: '172M', growth: '-68% Short-Haul Flights' },
      { country: 'Paris–Lyon', y2010: '39M', y2018: '44M', y2025: '53M', growth: '-54% Short-Haul Flights' },
      { country: 'Madrid–Barcelona', y2010: '16M', y2018: '28M', y2025: '41M', growth: '-61% Short-Haul Flights' },
      { country: 'London–Paris', y2010: '19M', y2018: '24M', y2025: '31M', growth: '-49% Short-Haul Flights' }
    ],
    task1SampleCandidateDraft: `The bar chart illustrates how many passengers travelled by high-speed rail on four major routes between 2010 and 2025. Overall, passenger numbers increased on all four corridors, and Tokyo–Osaka remained by far the busiest route throughout the fifteen-year period.

In 2010, Tokyo–Osaka carried 138 million passengers, which was more than three times higher than Paris–Lyon at 39 million. Furthermore, by 2025, ridership on the Japanese route reached 172 million. Moreover, the Madrid–Barcelona line experienced the fastest proportional growth, rising from 16 million in 2010 to 41 million in 2025.

Furthermore, London–Paris and Paris–Lyon also saw steady increases in passenger numbers. Because more people used high-speed trains, domestic flights dropped significantly on all routes.`,
    task2Title: 'Task 2: Remote Work & Metropolitan Decentralisation',
    task2Prompt:
      'Many companies now allow employees to work from home permanently, leading some experts to predict the decline of major city centres. Do you think the advantages of remote working outweigh the disadvantages for individuals and society?',
    task2SampleCandidateDraft: `In recent years, working from home has become very popular all over the world. Many people believe that remote work brings huge benefits for workers, while others worry that big cities will lose their business. In my opinion, the advantages of remote work are bigger than the drawbacks.

Firstly, employees save a lot of time and money because they do not need to commute in heavy traffic every morning. Furthermore, this gives them better work-life balance and more time with their family. Moreover, companies can save money on expensive office rent in city centres.

Furthermore, there are some negative effects too. People who work from home every day often feel lonely and isolated from their team. Moreover, small coffee shops and restaurants in downtown areas lose customers when office workers stay at home.

In conclusion, even though remote work causes some challenges for city businesses, the benefits of lower stress and less traffic pollution are much more important.`
  },
  {
    id: 'cam20_writing_set3',
    format: 'Academic',
    title: 'Practice Academic Writing Set 20',
    task1Title: 'Task 1: Desalination & Potable Water Supply in Arid Regions',
    task1Prompt:
      'The chart and table below show the daily volume of potable water produced by reverse-osmosis desalination (in million cubic meters) and energy consumption per cubic meter across four nations between 2010 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    task1ChartTitle: 'Daily Desalinated Water Output (Million m³ / Day) · 2010–2025',
    task1ChartSubtitle: 'International Desalination Association (IDA) Benchmark Audit',
    task1Unit: 'Million m³ / Day',
    task1Categories: ['Saudi Arabia', 'UAE', 'Spain', 'Australia'],
    task1Series: [
      { name: '2010', color: '#64748b', values: [3.6, 2.8, 1.4, 0.7] },
      { name: '2018', color: '#2563eb', values: [5.4, 4.1, 1.9, 1.5] },
      { name: '2025', color: '#10b981', values: [7.9, 5.8, 2.5, 2.3] }
    ],
    task1TableSummary: [
      { country: 'Saudi Arabia', y2010: '3.6M m³', y2018: '5.4M m³', y2025: '7.9M m³', growth: '-38% kWh/m³ (Solar RO Integration)' },
      { country: 'UAE', y2010: '2.8M m³', y2018: '4.1M m³', y2025: '5.8M m³', growth: '-34% kWh/m³ (Thermal-to-Membrane Shift)' },
      { country: 'Spain', y2010: '1.4M m³', y2018: '1.9M m³', y2025: '2.5M m³', growth: '-29% kWh/m³ (Agricultural Irrigation)' },
      { country: 'Australia', y2010: '0.7M m³', y2018: '1.5M m³', y2025: '2.3M m³', growth: '-31% kWh/m³ (Wind-Powered Coastal Plants)' }
    ],
    task1SampleCandidateDraft: `The bar chart and table illustrate the daily production of desalinated drinking water in four countries between 2010 and 2025, along with energy efficiency improvements. Overall, desalinated water output increased in all four countries, with Saudi Arabia and the UAE producing far more water than Spain and Australia.

In 2010, Saudi Arabia produced 3.6 million cubic meters per day, and this figure more than doubled to reach 7.9 million in 2025. Furthermore, the UAE followed a similar pattern, rising from 2.8 million to 5.8 million cubic meters. Moreover, both Middle Eastern nations reduced their electricity consumption per cubic meter by over one third by switching to solar reverse-osmosis membranes.

Furthermore, Spain and Australia had lower total production, but Australia more than tripled its output from 0.7 million in 2010 to 2.3 million in 2025.`,
    task2Title: 'Task 2: Artificial Intelligence in Clinical Medical Diagnosis',
    task2Prompt:
      'In many modern hospitals, artificial intelligence software is now used to analyze medical scans and recommend treatments faster than human doctors. Do the advantages of relying on AI in healthcare outweigh the disadvantages?',
    task2SampleCandidateDraft: `Nowadays, artificial intelligence is transforming hospitals and medical care. Many experts believe that computer algorithms can diagnose diseases more accurately than human doctors, while others worry about safety and ethics. In my view, the benefits of medical AI clearly outweigh the drawbacks, provided human doctors make the final decision.

Firstly, AI algorithms can scan thousands of X-rays and MRI images in a few seconds without getting tired. Furthermore, this helps doctors detect cancer and heart disease at a very early stage, which saves many lives. Moreover, rural clinics in developing countries can use AI diagnostic tools when specialist doctors are not available.

Furthermore, on the other hand, relying completely on machines can be dangerous if the software has a bug. Moreover, patients need human empathy and emotional comfort when they receive bad news, which a computer cannot give.

In conclusion, AI is a powerful tool that makes healthcare faster and more accurate, as long as it supports human doctors rather than replacing them.`
  },
  {
    id: 'cam21_writing_set4',
    format: 'Academic',
    title: 'Practice Academic Writing Set 21',
    task1Title: 'Task 1: Semiconductor Wafer Fabrication & R&D Expenditure',
    task1Prompt:
      'The chart and table below compare the percentage share of global semiconductor manufacturing capacity across four territories between 2010 and 2025, alongside annual R&D reinvestment rates. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    task1ChartTitle: 'Share of Global Semiconductor Foundry Capacity (%) · 2010–2025',
    task1ChartSubtitle: 'World Semiconductor Trade Statistics (WSTS) Audit',
    task1Unit: '% of Global Wafer Capacity',
    task1Categories: ['Taiwan & S. Korea', 'China', 'United States', 'European Union'],
    task1Series: [
      { name: '2010', color: '#64748b', values: [39, 11, 18, 13] },
      { name: '2018', color: '#2563eb', values: [44, 19, 13, 10] },
      { name: '2025', color: '#10b981', values: [47, 24, 14, 9] }
    ],
    task1TableSummary: [
      { country: 'Taiwan & S. Korea', y2010: '39%', y2018: '44%', y2025: '47%', growth: 'Sub-3nm Extreme UV Lithography' },
      { country: 'China', y2010: '11%', y2018: '19%', y2025: '24%', growth: '+13% Share (Automotive & Legacy Nodes)' },
      { country: 'United States', y2010: '18%', y2018: '13%', y2025: '14%', growth: '22% of Revenue Reinvested in Chip Design' },
      { country: 'European Union', y2010: '13%', y2018: '10%', y2025: '9%', growth: 'Focus on Industrial Sensor Microchips' }
    ],
    task1SampleCandidateDraft: `The bar chart and table show how global semiconductor manufacturing capacity was divided among four major regions between 2010 and 2025. Overall, East Asian hubs expanded their dominant share of global microchip production, whereas the United States and the European Union saw their manufacturing proportions decline.

Taiwan and South Korea held the largest share throughout the period, climbing from 39% in 2010 to 47% in 2025. Furthermore, China experienced the fastest proportional rise, more than doubling its wafer fabrication share from 11% in 2010 to 24% by 2025.

Conversely, the United States dropped from 18% in 2010 to 13% in 2018 before recovering slightly to 14% in 2025. Moreover, the European Union declined steadily from 13% to 9% over the fifteen-year span.`,
    task2Title: 'Task 2: Compulsory Financial Literacy & Life Skills in Secondary Schools',
    task2Prompt:
      'Many young people leave secondary school with strong theoretical knowledge in subjects like history and literature, but lack practical skills such as managing personal finances or basic nutrition. To what extent should schools replace traditional academic subjects with practical life skills?',
    task2SampleCandidateDraft: `It is often argued that high schools focus too much on theoretical subjects and fail to teach practical life skills like managing money or cooking healthy food. While I agree that financial literacy should be taught at school, I strongly disagree that it should replace core academic subjects.

Firstly, learning how to budget money, understand bank interest, and prepare nutritious meals helps teenagers become independent adults. Furthermore, a short weekly workshop on personal finance can prevent young people from falling into credit card debt when they start working.

However, replacing foundational subjects like history, mathematics, and literature would be a big mistake. Studying history teaches students how to analyze evidence and understand society, while mathematics builds logical thinking needed for engineering and science.

In conclusion, schools should add practical life-skills classes as a supplement, rather than eliminating important academic disciplines.`
  }
];

export const GENERAL_TRAINING_WRITING_SETS: WritingTestSet[] = [
  {
    id: 'gt_writing_set1',
    format: 'General Training',
    title: 'General Training Practice Set 1',
    task1Title: 'Task 1: Formal Letter to Local Council',
    task1LetterType: 'Formal',
    task1Prompt:
      "You recently noticed that a local public park and children's playground in your neighborhood is in poor condition and needs maintenance. Write a letter to the local municipal council.",
    task1BulletPoints: [
      "Describe the current condition of the park and damaged play equipment",
      "Explain the safety risks and inconvenience this is causing for local children and residents",
      "Suggest specific repairs and improvements that the council should prioritize"
    ],
    task1SampleCandidateDraft: `Dear Sir or Madam,

I am writing to bring to your urgent attention the deteriorating condition of Elmwood Memorial Park and its adjoining children's playground located on Saint Andrew's Road.

Over the past six months, several pieces of recreational equipment have fallen into severe disrepair. The primary timber climbing frame has developed large splintered fissures, and two of the three swings have snapped chains that have been haphazardly tied with wire. Furthermore, broken glass bottles and overflowing litter bins have accumulated around the picnic area, creating an unacceptable health and safety hazard.

This neglect is causing substantial distress among local families. Parents are no longer comfortable permitting their young children to play unsupervised, and several elderly residents have tripped on uneven paving slabs along the walking loop.

I respectfully urge the municipal council to dispatch an inspection team immediately. Specifically, the council should replace the hazardous swing chains, install tamper-proof waste receptacles, and repave the fractured pathways before a serious injury occurs.

I look forward to hearing your plan of action regarding these urgent repairs.

Yours faithfully,
Gordon MacIntyre`,
    task2Title: 'Task 2: Youth Gap Year Between School and University',
    task2Prompt:
      'In many countries, young people are encouraged to take a year off to work or travel before starting university education. Do you think the advantages of this trend outweigh the disadvantages for young adults?',
    task2SampleCandidateDraft: `In contemporary education, deferring university admission to take an experiential sabbatical year has become widely encouraged across many countries. While critics highlight the risk of academic procrastination and financial strain, I firmly believe that the maturity, practical life skills, and career clarity gained during a gap year far outweigh the potential drawbacks.

On the one hand, taking a gap year can present real challenges for students who lack clear goals. Secondary school leavers who spend an entire year without structured employment or volunteer work may lose their study momentum and find it difficult to readjust to demanding lecture schedules. Furthermore, travelling abroad can be expensive, placing an unnecessary financial burden on parents if the young person cannot earn their own living expenses.

On the other hand, the developmental dividends of structured gap years are undeniable. Most high school students have never experienced the realities of an authentic workplace. By undertaking internships or community projects, young adults develop essential independence, budgeting competence, and resilience. Consequently, they enter university with renewed academic direction and a far clearer understanding of which professional field they wish to pursue.

In conclusion, although an unstructured gap year may cause minor academic delays, the personal maturity and vocational purpose cultivated during a productive sabbatical year render it an overwhelmingly positive life stage.`
  },
  {
    id: 'gt_writing_set2',
    format: 'General Training',
    title: 'General Training Practice Set 2',
    task1Title: 'Task 1: Semi-Formal Letter to Rental Landlord',
    task1LetterType: 'Semi-Formal',
    task1Prompt:
      'You have been living in a rented apartment for the past six months. Recently, the central heating system stopped working and there is a water leak in the bathroom ceiling. Write a letter to your property landlord or letting agent.',
    task1BulletPoints: [
      'Remind them of your tenancy details and describe the specific problems',
      'Explain how these issues are affecting your health and living conditions',
      'State what corrective action you expect them to arrange and by what date'
    ],
    task1SampleCandidateDraft: `Dear Mr. Harrison,

I am writing regarding my tenancy at Flat 4B, Kensington Court, where I have been residing under a twelve-month agreement since May.

Unfortunately, two serious maintenance issues have developed in the property over the past week. First, the central boiler completely ceased operating on Thursday evening, leaving the radiators stone cold and cutting off all domestic hot water. Second, a damp yellow stain on the bathroom ceiling has now begun dripping dirty water steadily onto the tiled floor below.

These problems are significantly affecting my daily routine and well-being. With nighttime outdoor temperatures dropping below five degrees, the apartment has become uncomfortably cold, and the persistent damp smell in the bathroom is exacerbating my asthma.

As stipulated in Section 8 of our tenancy agreement, urgent heating repairs must be attended to within 48 hours. I therefore request that you arrange for a certified heating engineer and a plumber to inspect the flat no later than Monday, 4th November.

Please contact me on 07911 123456 to confirm the appointment time.

Yours sincerely,
Sarah Jenkins`,
    task2Title: 'Task 2: Government Expenditure on Sports Facilities vs Hospitals',
    task2Prompt:
      'Some people believe that governments should invest heavily in public sports facilities and recreation centres to prevent health problems. Others argue that national funds should be prioritized for hospitals and medical care for the sick. Discuss both views and give your own opinion.',
    task2SampleCandidateDraft: `Public healthcare allocation remains a contentious debate worldwide. While some argue that funding modern hospitals and specialized medical care must take precedence, others maintain that investing in community sports facilities prevents diseases before they arise. In my view, preventative sports infrastructure yields superior long-term health benefits, though emergency clinical services must always receive baseline support.

Proponents of hospital prioritization emphasize the immediacy of acute care. Cancer, cardiovascular emergencies, and traumatic injuries require sophisticated surgical equipment and highly trained medical specialists. Furthermore, when infectious pandemics strike, governments must have intensive care beds and pharmaceutical supplies available immediately. Neglecting hospital infrastructure to build community leisure centres would directly risk lives during health crises.

Conversely, preventative public investment produces substantial societal and economic returns. Modern sedentary lifestyles have caused epidemic levels of obesity, diabetes, and hypertension. By constructing free public swimming pools, cycling paths, and outdoor gymnasiums, governments encourage regular physical activity, drastically reducing the volume of preventable chronic patients entering hospitals. Ultimately, keeping citizens healthy through active recreation is far more cost-effective than managing lifelong illnesses.

In conclusion, although emergency hospital services are indispensable for acute illnesses, directing generous funding toward preventative sports amenities provides a far more sustainable healthcare strategy for the future.`
  },
  {
    id: 'gt_writing_set3',
    format: 'General Training',
    title: 'General Training Practice Set 3',
    task1Title: 'Task 1: Informal Letter to a Friend About Relocating',
    task1LetterType: 'Informal',
    task1Prompt:
      'You recently moved to a new city to start a new job. Write a letter to an English-speaking friend.',
    task1BulletPoints: [
      'Explain why you decided to move and how you are finding your new job',
      'Describe your new home and the neighborhood you live in',
      'Invite your friend to visit and suggest some activities you can do together'
    ],
    task1SampleCandidateDraft: `Dear Alex,

I hope you are doing really well and that work hasn't been keeping you too frantic lately! I am writing to finally catch you up on my big news—I've officially relocated to Edinburgh!

The main reason I decided to move was an exciting offer from an international renewable energy firm. I am working as a project coordinator for Scottish offshore wind farms. The onboarding has been intense, but my colleagues are genuinely supportive and the projects are fascinating.

I have managed to find a lovely two-bedroom apartment in the Stockbridge area. It has high ceilings, huge sash windows overlooking a cobbled street, and tons of natural daylight. The neighborhood itself is fantastic, packed with independent bakeries, quirky bookshops, and cozy weekend farmers' markets.

You absolutely have to come up and visit soon! I have a spare guest room ready, and we could hike up Arthur's Seat for panoramic views over the city and visit the historic castle. How about coming up for the second weekend of next month?

Let me know if those dates suit you. I can't wait to catch up properly!

Warm regards,
David`,
    task2Title: 'Task 2: International Migration & Cultural Adaptation Challenges',
    task2Prompt:
      'An increasing number of professionals and families are choosing to live and work in foreign countries. What are the main reasons for this trend, and what challenges do these individuals typically face when adapting to a new country?',
    task2SampleCandidateDraft: `In today's interconnected global economy, an unprecedented number of skilled professionals and families are relocating abroad. This essay will examine the primary motivators behind international migration—namely enhanced economic prospects and educational quality—before discussing the linguistic and cultural obstacles migrants typically encounter.

The foremost catalyst for international migration is the pursuit of superior socioeconomic mobility. Many developing countries offer limited career advancement and low wages for specialized sectors like engineering and healthcare. By relocating to nations such as Canada, Australia, or the United Kingdom, professionals can secure significantly higher remuneration, better working conditions, and access to world-class schooling for their children. Furthermore, geopolitical stability and cleaner urban environments often motivate families seeking safety and higher living standards.

However, moving to a foreign country introduces formidable psychological and practical challenges. Foremost among these is language barrier and communicative nuance. Even migrants with strong classroom English often struggle with regional dialects, colloquial idioms, and rapid workplace banter, leading to temporary professional marginalization. Moreover, cultural alienation and social isolation frequently impact newly arrived families who lack local support networks and must navigate unfamiliar administrative systems.

In conclusion, while higher earning potential and enhanced living standards continue to drive international migration, newcomers face steep hurdles regarding cultural integration and emotional dislocation before achieving full settlement.`
  }
];

export const CAMBRIDGE_WRITING_SETS: WritingTestSet[] = ACADEMIC_WRITING_SETS;

const DRAFT_STORAGE_KEY = 'cdielts_writing_draft';

/**
 * Non-scoring offline structural pre-check for candidate drafts.
 * Detects real sentence-level grammar, lexical, and mechanical linker patterns without
 * fabricating heuristic IELTS band scores. All IELTS band scores remain strictly null
 * until a verified live AI evaluation returns a valid four-criterion assessment.
 */
export function buildWritingStructuralPrecheck(
  rawText: string,
  taskType: 1 | 2,
  targetBand: number,
  _setConfig?: WritingTestSet
): WritingDiagnosticResult {
  const text = rawText.trim();
  const minWords = taskType === 1 ? 150 : 250;
  const gate = checkWritingWordThreshold(text, taskType === 1 ? 'task1' : 'task2');

  if (!gate.isValidAttempt) {
    return {
      isValidAttempt: false,
      assessmentStatus: 'insufficient_evidence',
      evaluationSource: 'threshold-gate',
      feedbackTitle: gate.feedbackTitle,
      feedbackEn: gate.feedbackEn,
      feedbackBn: gate.feedbackBn,
      taskType,
      wordCount: gate.wordCount,
      minWords,
      overallBand: null,
      targetBand,
      cefrLevel: 'Unassessed (Insufficient Evidence)',
      taScore: null,
      taSummary: gate.feedbackEn,
      ccScore: null,
      ccSummary: gate.feedbackBn,
      lrScore: null,
      lrSummary: gate.feedbackEn,
      graScore: null,
      graSummary: gate.feedbackBn,
      annotations: [],
      upgradedModelParagraphs: []
    };
  }

  const words = text ? text.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;

  // Split into sentences
  const rawSentences =
    text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) || [];

  // Count mechanical linkers ("furthermore", "moreover")
  const lowerText = text.toLowerCase();
  const furthermoreCount = (lowerText.match(/\bfurthermore\b/g) || []).length;
  const moreoverCount = (lowerText.match(/\bmoreover\b/g) || []).length;
  const mechanicalLinkerTotal = furthermoreCount + moreoverCount;

  const annotations: SentenceAnnotation[] = [];
  let grammarIssueCount = 0;
  let lexicalIssueCount = 0;
  let cohesionIssueCount = 0;

  // Inspect actual candidate sentences for real observable patterns (zero synthetic boilerplate injection)
  rawSentences.forEach((sentence, idx) => {
    const sLower = sentence.toLowerCase();

    // 1. Repetitive / mechanical linkers ("Furthermore" / "Moreover") -> AMBER (Cohesion)
    if (
      /\b(furthermore|moreover)\b/i.test(sentence) &&
      (mechanicalLinkerTotal >= 2 || sLower.includes('furthermore, on the other hand'))
    ) {
      cohesionIssueCount++;
      annotations.push({
        id: `sent_${idx}`,
        sentence,
        category: 'cohesion',
        errorTitle: 'Mechanical & Repetitive Discourse Marker (CC Note)',
        identifiedIssue: sLower.includes('furthermore, on the other hand')
          ? 'Contradictory linker stacking ("Furthermore, on the other hand")'
          : 'Over-reliance on sentence-initial "Furthermore / Moreover"',
        suggestedCorrection: sentence
          .replace(/Furthermore,\s*on the other hand,/i, 'Conversely, critics contend that')
          .replace(/^Furthermore,\s*/i, 'Compounding this trend, ')
          .replace(/^Moreover,\s*/i, 'Crucially, from an economic standpoint, '),
        rationaleEn:
          'Starting consecutive sentences with "Furthermore" or "Moreover" can appear mechanical. Vary cohesion naturally using demonstrative reference ("This trajectory...", "Compounding this...") or subordinate clauses.',
        rationaleBn:
          'বারবার বাক্যের শুরুতে "Furthermore" বা "Moreover" ব্যবহার করলে লেখা যান্ত্রিক মনে হতে পারে। স্বাভাবিক প্রবাহ বজায় রাখতে "Compounding this trend" বা "Crucially"-এর মতো রেফারেন্সিং ব্যবহার করুন।'
      });
      return;
    }

    // 2. Common Grammatical & Agreement slips -> RED (Grammar)
    if (
      /\b(chart and table shows|usage increase|goes up|compare to|fees is|every students|they afraid|citizens pays|children education|informations|peoples|discuss about|lack of|datas)\b/i.test(
        sentence
      ) ||
      /\b(is|are)\s+(becoming|having)\s+a\s+huge\b/i.test(sentence)
    ) {
      grammarIssueCount++;
      let issueDesc = 'Subject-verb agreement & tense consistency check';
      const corrected = sentence
        .replace(/chart and table shows/i, 'bar chart and accompanying table illustrate')
        .replace(/usage increase/i, 'generation expanded substantially')
        .replace(/goes up steadily/i, 'rose steadily')
        .replace(/compare to/i, 'compared with')
        .replace(/tuition fees is becoming/i, 'university tuition fees have become')
        .replace(/every students/i, 'all prospective students')
        .replace(/they afraid of/i, 'they are deterred by the prospect of')
        .replace(/citizens pays/i, 'graduates contribute substantially more in')
        .replace(/children education/i, "children's tertiary education");

      if (sLower.includes('every students')) {
        issueDesc = 'Quantifier agreement error ("every students" → "every student" / "all students")';
      } else if (sLower.includes('they afraid')) {
        issueDesc = 'Missing auxiliary copula verb ("they afraid" → "they are afraid / deterred")';
      } else if (
        sLower.includes('chart and table shows') ||
        sLower.includes('fees is') ||
        sLower.includes('citizens pays')
      ) {
        issueDesc = 'Plural subject with singular verb inflection (Subject-Verb Disagreement)';
      }

      annotations.push({
        id: `sent_${idx}`,
        sentence,
        category: 'grammar',
        errorTitle: 'Grammatical Range & Accuracy (GRA) Slip',
        identifiedIssue: issueDesc,
        suggestedCorrection: corrected,
        rationaleEn:
          'Check subject-verb agreement ("fees is", "citizens pays"), determiner-noun concord ("every students"), and auxiliary verbs to strengthen grammatical accuracy.',
        rationaleBn:
          'Subject-Verb Agreement-এর ভুল (যেমন "fees is", "citizens pays" বা "every students") এবং অক্সিলিয়ারি ভার্ব বাদ পড়া ("they afraid") সংশোধন করলে ব্যাকরণগত নির্ভুলতা বাড়বে।'
      });
      return;
    }

    // 3. Informal / Vague Vocabulary -> BLUE (Lexical Resource)
    if (
      /\b(very big|a lot of|lots of|good for|big bank|huge benefits|bigger than|very popular|jumped to)\b/i.test(
        sentence
      )
    ) {
      lexicalIssueCount++;
      const corrected = sentence
        .replace(/had a very big growth in green electricity/i, 'registered a dramatic surge in renewable output')
        .replace(/the UK number jumped to/i, 'the British proportion soared fivefold to')
        .replace(/invested a lot of money to make their electricity cleaner/i, 'allocated substantial capital toward grid decarbonisation')
        .replace(/Lots of smart students/i, 'Numerous academically gifted candidates')
        .replace(/big bank loans/i, 'burdensome student debt')
        .replace(/very good for the economy/i, 'a vital catalyst for macroeconomic productivity')
        .replace(/very popular all over the world/i, 'increasingly prevalent across global industries')
        .replace(/huge benefits/i, 'substantial socioeconomic dividends')
        .replace(/bigger than/i, 'far outweigh')
        .replace(/save a lot of time and money/i, 'curtail both commuting expenditure and unproductive transit hours');

      annotations.push({
        id: `sent_${idx}`,
        sentence,
        category: 'lexical',
        errorTitle: 'Informal Register & Low-Band Collocation (LR Upgrade)',
        identifiedIssue: 'Conversational phrasing ("a lot of", "very big", "lots of", "very good")',
        suggestedCorrection: corrected,
        rationaleEn:
          'In Academic Writing, conversational quantifiers ("a lot of", "lots of") and vague adjectives ("very big", "very good") weaken formal register. Replace them with precise academic collocations.',
        rationaleBn:
          'IELTS Academic Writing-এ কথ্য শব্দ যেমন "a lot of", "lots of", "very big", বা "very good"-এর পরিবর্তে সুনির্দিষ্ট একাডেমিক Collocation ব্যবহার করুন।'
      });
      return;
    }

    // Default clean sentence
    annotations.push({
      id: `sent_${idx}`,
      sentence,
      category: 'clean'
    });
  });

  // Reference model paragraphs (labeled as practice reference until live AI generates custom essay upgrades)
  const upgradedModelParagraphs =
    taskType === 1
      ? [
          {
            original:
              rawText.split(/\n\n+/)[0] ||
              'The bar chart and table shows the proportion of electricity produced from renewable energy in four different countries between 2010 and 2025.',
            upgradedHtml: [
              { text: 'The bar chart and accompanying statistical table ', isUpgrade: false },
              { text: 'delineate the proportion of national electricity generated from renewable sources', isUpgrade: true },
              { text: ' across four nations between 2010 and 2025. ', isUpgrade: false },
              { text: 'Overall, every surveyed country experienced a pronounced upward trajectory in clean energy adoption,', isUpgrade: true },
              { text: ' with Norway consistently maintaining an unassailable lead throughout the fifteen-year timeframe.', isUpgrade: true }
            ]
          },
          {
            original:
              rawText.split(/\n\n+/)[1] ||
              'Looking at the details, Norway started at 62% in 2010 and goes up steadily to 88% in 2025. Furthermore, Germany and the UK had a very big growth in green electricity.',
            upgradedHtml: [
              { text: 'Examining the specific national trajectories, Norway ', isUpgrade: false },
              { text: 'commenced at a commanding 62% in 2010 before ascending steadily to peak at 88% by 2025.', isUpgrade: true },
              { text: ' Meanwhile, both Germany and the United Kingdom ', isUpgrade: false },
              { text: 'registered dramatic structural surges in grid decarbonisation.', isUpgrade: true },
              { text: ' Despite generating a mere 9% from renewables in 2010, ', isUpgrade: false },
              { text: 'Britain’s renewable share soared more than fivefold to reach 49% in 2025.', isUpgrade: true }
            ]
          }
        ]
      : [
          {
            original:
              rawText.split(/\n\n+/)[0] ||
              'Nowadays, university tuition fees is becoming a huge debate in many countries. Many people think that higher education should be completely free for every students.',
            upgradedHtml: [
              { text: 'Whether tertiary education should be ', isUpgrade: false },
              { text: 'universally subsidised by the state regardless of a candidate’s socioeconomic standing', isUpgrade: true },
              { text: ' remains a fiercely contested fiscal question. While abolishing tuition fees ', isUpgrade: false },
              { text: 'fosters egalitarian social mobility, I contend that a targeted, means-tested scholarship framework is far more fiscally sustainable.', isUpgrade: true }
            ]
          },
          {
            original:
              rawText.split(/\n\n+/)[1] ||
              'Firstly, making university free gives equal opportunity to talented young people from low-income families. Furthermore, when more people get a degree, the country gets more doctors and engineers.',
            upgradedHtml: [
              { text: 'Proponents of tuition-free higher education rightly emphasise its capacity to ', isUpgrade: false },
              { text: 'dismantle financial barriers for academically gifted students from underprivileged backgrounds.', isUpgrade: true },
              { text: ' When prospective undergraduates are ', isUpgrade: false },
              { text: 'shielded from burdensome student debt, higher graduation rates cultivate a highly skilled workforce', isUpgrade: true },
              { text: ' of clinicians, engineers, and researchers, ', isUpgrade: false },
              { text: 'ultimately expanding the long-term national tax base.', isUpgrade: true }
            ]
          }
        ];

  return {
    isValidAttempt: true,
    assessmentStatus: 'structural_precheck',
    evaluationSource: 'offline-structural-precheck',
    taskType,
    wordCount,
    minWords,
    overallBand: null,
    targetBand,
    cefrLevel: 'Not Scored (Run Live AI Evaluation)',
    taScore: null,
    taSummary:
      wordCount < minWords
        ? `Offline structural check: under recommended length (${wordCount}/${minWords} words). Run Live AI Evaluation for a verified Task score.`
        : `Offline structural check: word count meets the ${minWords}-word target (${wordCount} words). Run Live AI Evaluation for a verified Task score.`,
    ccScore: null,
    ccSummary:
      mechanicalLinkerTotal >= 2
        ? `Offline structural check: detected ${mechanicalLinkerTotal} uses of "Furthermore / Moreover". Run Live AI Evaluation for a verified CC score.`
        : `Offline structural check: ${cohesionIssueCount} cohesion pattern note(s) flagged. Run Live AI Evaluation for a verified CC score.`,
    lrScore: null,
    lrSummary:
      lexicalIssueCount > 0
        ? `Offline structural check: flagged ${lexicalIssueCount} informal register pattern(s). Run Live AI Evaluation for a verified LR score.`
        : 'Offline structural check: no basic informal register traps detected. Run Live AI Evaluation for a verified LR score.',
    graScore: null,
    graSummary:
      grammarIssueCount > 0
        ? `Offline structural check: identified ${grammarIssueCount} common agreement/grammar slip(s). Run Live AI Evaluation for a verified GRA score.`
        : 'Offline structural check: no common agreement pattern slips detected. Run Live AI Evaluation for a verified GRA score.',
    annotations,
    upgradedModelParagraphs
  };
}

/**
 * Pure validator & mapper for POST /api/writing/deep-evaluate responses.
 * Preserves offline structural annotations for review while ensuring no invalid,
 * missing, or unavailable response ever fabricates numeric IELTS band scores.
 */
export function mapDeepWritingResponseToDiagnostic(params: {
  httpOk: boolean;
  httpStatus: number;
  data: any;
  fallbackPrecheck: WritingDiagnosticResult;
}): WritingDiagnosticResult {
  const { httpOk, httpStatus, data, fallbackPrecheck } = params;

  if (data && typeof data === 'object' && data.assessmentStatus === 'insufficient_evidence') {
    const msg =
      typeof data.feedbackEn === 'string' && data.feedbackEn.trim()
        ? data.feedbackEn
        : typeof data.error === 'string' && data.error.trim()
        ? data.error
        : fallbackPrecheck.feedbackEn ||
          'Submission did not contain sufficient assessable writing evidence.';
    return {
      ...fallbackPrecheck,
      isValidAttempt: false,
      assessmentStatus: 'insufficient_evidence',
      evaluationSource: 'threshold-gate',
      feedbackTitle: data.feedbackTitle || 'Submission Too Short for Assessment',
      feedbackEn: msg,
      feedbackBn: data.feedbackBn || fallbackPrecheck.feedbackBn,
      error: msg,
      canRetry: false,
      overallBand: null,
      taScore: null,
      ccScore: null,
      lrScore: null,
      graScore: null,
      cefrLevel: 'Unassessed (Insufficient Evidence)',
      annotations: [],
      upgradedModelParagraphs: []
    };
  }

  if (!httpOk) {
    const errorMsg =
      data && typeof data === 'object' && typeof data.error === 'string' && data.error.trim()
        ? data.error
        : httpStatus === 401
        ? 'Please sign in to run live AI Writing evaluation. Your essay draft is safely preserved and your offline structural notes remain available below.'
        : httpStatus === 403
        ? 'Your daily AI Writing evaluation limit has been reached. Your essay draft is safely preserved.'
        : `Live AI Writing evaluation is unavailable (HTTP ${httpStatus}). No IELTS band was assigned.`;
    return {
      ...fallbackPrecheck,
      isValidAttempt: false,
      assessmentStatus: 'unavailable',
      evaluationSource: 'unavailable',
      error: errorMsg,
      canRetry: true,
      overallBand: null,
      taScore: null,
      ccScore: null,
      lrScore: null,
      graScore: null,
      cefrLevel: 'Evaluation Unavailable'
    };
  }

  const validated = validateClientWritingEvaluation(data);
  if (!validated.valid) {
    const isInsufficient = validated.assessmentStatus === 'insufficient_evidence';
    return {
      ...fallbackPrecheck,
      isValidAttempt: false,
      assessmentStatus: validated.assessmentStatus,
      evaluationSource: isInsufficient ? 'threshold-gate' : 'unavailable',
      error:
        validated.reason ||
        'Live AI Writing evaluation returned an incomplete or invalid payload. No fallback band was assigned.',
      canRetry: !isInsufficient,
      overallBand: null,
      taScore: null,
      ccScore: null,
      lrScore: null,
      graScore: null,
      cefrLevel: isInsufficient ? 'Unassessed (Insufficient Evidence)' : 'Evaluation Unavailable'
    };
  }

  const resolvedAnnotations =
    Array.isArray(data?.annotations) && data.annotations.length > 0
      ? (data.annotations as SentenceAnnotation[])
      : fallbackPrecheck.annotations;
  const resolvedParagraphs =
    Array.isArray(data?.upgradedModelParagraphs) && data.upgradedModelParagraphs.length > 0
      ? data.upgradedModelParagraphs
      : fallbackPrecheck.upgradedModelParagraphs;

  return {
    ...fallbackPrecheck,
    isValidAttempt: true,
    assessmentStatus: 'evaluated',
    evaluationSource:
      typeof data?.evaluationSource === 'string' && data.evaluationSource.trim()
        ? data.evaluationSource
        : 'gemini-deep-examiner',
    error: undefined,
    canRetry: false,
    wordCount:
      typeof data?.wordCount === 'number' && Number.isFinite(data.wordCount)
        ? data.wordCount
        : fallbackPrecheck.wordCount,
    overallBand: validated.overallBand,
    taScore: validated.criteria.ta,
    ccScore: validated.criteria.cc,
    lrScore: validated.criteria.lr,
    graScore: validated.criteria.gra,
    taSummary:
      typeof data?.taSummary === 'string' && data.taSummary.trim()
        ? data.taSummary
        : fallbackPrecheck.taSummary,
    ccSummary:
      typeof data?.ccSummary === 'string' && data.ccSummary.trim()
        ? data.ccSummary
        : fallbackPrecheck.ccSummary,
    lrSummary:
      typeof data?.lrSummary === 'string' && data.lrSummary.trim()
        ? data.lrSummary
        : fallbackPrecheck.lrSummary,
    graSummary:
      typeof data?.graSummary === 'string' && data.graSummary.trim()
        ? data.graSummary
        : fallbackPrecheck.graSummary,
    cefrLevel:
      typeof data?.cefrLevel === 'string' && data.cefrLevel.trim()
        ? data.cefrLevel
        : validated.overallBand !== null && validated.overallBand >= 8.0
        ? 'C2 - Mastery'
        : validated.overallBand !== null && validated.overallBand >= 7.0
        ? 'C1 - Effective Operational Proficiency'
        : validated.overallBand !== null && validated.overallBand >= 6.0
        ? 'B2 - Vantage Upper-Intermediate'
        : 'B1 - Threshold Intermediate',
    annotations: resolvedAnnotations,
    upgradedModelParagraphs: resolvedParagraphs
  };
}

/**
 * Persistence safeguard: only verified, complete four-criterion AI Writing evaluations
 * may be persisted into exam history. Offline structural pre-checks, insufficient
 * evidence results, and unavailable responses are never persisted as completed bands.
 */
export function shouldPersistWritingDiagnostic(
  result: WritingDiagnosticResult | null | undefined
): boolean {
  if (!result) return false;
  if (result.assessmentStatus !== 'evaluated') return false;
  if (result.isValidAttempt === false) return false;
  return (
    validateCriterionBand(result.overallBand) !== null &&
    validateCriterionBand(result.taScore) !== null &&
    validateCriterionBand(result.ccScore) !== null &&
    validateCriterionBand(result.lrScore) !== null &&
    validateCriterionBand(result.graScore) !== null
  );
}

export const CDIELTSWritingExamRoom: React.FC<WritingExamRoomProps> = ({
  onExit,
  onShowToast,
  initialTask = 2,
  initialText,
  initialFormat = 'Academic',
  customPilotSet,
  pilotDraftId,
  onExitPilot,
  onOpenAiPilots,
  onOpenAuxiliaryLabs,
  embeddedInFullExam = false
}) => {
  const activeUser = getCurrentUser();
  const candidateName = activeUser?.name || 'Ebadul Islam';
  const candidateId = activeUser?.id ? activeUser.id.slice(-6).toUpperCase() : '894021';
  const targetBand = activeUser?.progress?.targetBand || 7.5;

  // Load persisted draft from localStorage ('cdielts_writing_draft')
  const savedDraft = useMemo(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore storage errors
    }
    return null;
  }, []);

  const [examFormat, setExamFormat] = useState<WritingExamFormat>(() => customPilotSet?.format || savedDraft?.examFormat || initialFormat || 'Academic');
  useEffect(() => {
    if (customPilotSet?.format) {
      setExamFormat(customPilotSet.format);
      setSelectedSetIdx(0);
    }
  }, [customPilotSet]);
  const activeSets = useMemo(
    () => (customPilotSet ? [customPilotSet] : (examFormat === 'Academic' ? ACADEMIC_WRITING_SETS : GENERAL_TRAINING_WRITING_SETS)),
    [examFormat, customPilotSet]
  );

  const [selectedSetIdx, setSelectedSetIdx] = useState<number>(() => {
    const saved = savedDraft?.selectedSetIdx ?? 0;
    return saved >= 0 && saved < activeSets.length ? saved : 0;
  });
  const currentSet = activeSets[selectedSetIdx] || activeSets[0];

  const [activeTask, setActiveTask] = useState<1 | 2>(() => savedDraft?.activeTask ?? initialTask);
  const [mobilePane, setMobilePane] = useState<'prompt' | 'editor'>('editor');

  const [task1Text, setTask1Text] = useState<string>(
    () => savedDraft?.task1Text ?? ''
  );
  const [task2Text, setTask2Text] = useState<string>(
    () => initialText || savedDraft?.task2Text || ''
  );

  // Undo & Clear Protection
  const [undoBuffer, setUndoBuffer] = useState<{ task: 1 | 2; text: string; wordCount: number } | null>(null);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState<boolean>(false);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState<boolean>(false);
  const [evaluatingTask, setEvaluatingTask] = useState<1 | 2>(initialTask);

  // 60:00 Official Countdown Timer (3600 seconds) with 10m and 5m alerts
  const [timeRemainingSec, setTimeRemainingSec] = useState<number>(() => savedDraft?.timeRemainingSec ?? 60 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const [isTimeHidden, setIsTimeHidden] = useState<boolean>(false);
  const [hasShown10mAlert, setHasShown10mAlert] = useState<boolean>(false);
  const [hasShown5mAlert, setHasShown5mAlert] = useState<boolean>(false);
  const [timerAlertBanner, setTimerAlertBanner] = useState<string | null>(null);
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string>('Just now');

  // Resizable Split-Pane (50/50 default on Desktop)
  const [leftPanePercent, setLeftPanePercent] = useState<number>(50);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState<boolean>(false);
  const splitContainerRef = useRef<HTMLDivElement | null>(null);

  // Diagnostic Evaluation Modal State
  const [diagnosticResult, setDiagnosticResult] = useState<WritingDiagnosticResult | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [rationaleLang, setRationaleLang] = useState<'en' | 'bn'>('en');
  const [diagnosticTab, setDiagnosticTab] = useState<'interactive_review' | 'band8_diff'>('band8_diff');
  const [vaultSynced, setVaultSynced] = useState<boolean>(false);

  // CD-IELTS Authentic Accessibility Controls (Contrast Theme & Text Size Zoom)
  const [colorScheme, setColorScheme] = useState<CDIELTSColorScheme>(() => {
    try {
      const saved = localStorage.getItem('cdielts_theme_color');
      if (saved && ['standard', 'black-on-yellow', 'yellow-on-black', 'white-on-black'].includes(saved)) {
        return saved as CDIELTSColorScheme;
      }
    } catch {}
    return 'standard';
  });
  const [zoomLevel, setZoomLevel] = useState<CDIELTSZoomLevel>(() => {
    try {
      const saved = localStorage.getItem('cdielts_theme_zoom');
      if (saved && ['100%', '125%', '150%'].includes(saved)) {
        return saved as CDIELTSZoomLevel;
      }
    } catch {}
    return '100%';
  });

  const handleSetColorScheme = (scheme: CDIELTSColorScheme) => {
    setColorScheme(scheme);
    try {
      localStorage.setItem('cdielts_theme_color', scheme);
    } catch {}
  };

  const handleSetZoomLevel = (zoom: CDIELTSZoomLevel) => {
    setZoomLevel(zoom);
    try {
      localStorage.setItem('cdielts_theme_zoom', zoom);
    } catch {}
  };

  const cdTheme = useMemo(() => getCDIELTSThemeClasses(colorScheme), [colorScheme]);
  const cdFontSizeClass = useMemo(() => getCDIELTSFontSizeClass(zoomLevel), [zoomLevel]);
  const isHighContrast = colorScheme !== 'standard';

  // Live Word Count Calculation on every keystroke
  const currentText = activeTask === 1 ? task1Text : task2Text;
  const currentWordCount = useMemo(() => {
    const trimmed = currentText.trim();
    return trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  }, [currentText]);

  const task1WordCount = useMemo(() => {
    const t = task1Text.trim();
    return t ? t.split(/\s+/).filter(Boolean).length : 0;
  }, [task1Text]);

  const task2WordCount = useMemo(() => {
    const t = task2Text.trim();
    return t ? t.split(/\s+/).filter(Boolean).length : 0;
  }, [task2Text]);

  const minWordThreshold = activeTask === 1 ? 150 : 250;
  const isBelowThreshold = currentWordCount < minWordThreshold;

  // Real-Time Non-Scoring Structural Pre-Check as candidate types (zero live IELTS band fabrication)
  const liveDiagnostic = useMemo(() => {
    return buildWritingStructuralPrecheck(currentText, activeTask, targetBand, currentSet);
  }, [currentText, activeTask, targetBand, currentSet]);
  const liveIssueCount = useMemo(
    () => liveDiagnostic.annotations.filter((a) => a.category !== 'clean').length,
    [liveDiagnostic]
  );

  // Auto-save draft every 5 seconds to 'cdielts_writing_draft' in localStorage
  const saveDraftToStorage = useCallback(() => {
    try {
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          examFormat,
          selectedSetIdx,
          activeTask,
          task1Text,
          task2Text,
          timeRemainingSec,
          updatedAt: Date.now()
        })
      );
      setLastSavedTimestamp(nowStr);
    } catch {
      // ignore quota errors
    }
  }, [examFormat, selectedSetIdx, activeTask, task1Text, task2Text, timeRemainingSec]);

  useEffect(() => {
    const interval = setInterval(() => {
      saveDraftToStorage();
    }, 5000);
    return () => clearInterval(interval);
  }, [saveDraftToStorage]);

  // Hide floating Barnaby launcher while inside distraction-free Writing exam room
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event('barnaby-float-hide'));
    return () => {
      window.dispatchEvent(new Event('barnaby-float-show'));
    };
  }, []);

  // Accidental refresh / tab close protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      saveDraftToStorage();
      if (task1Text.trim().length > 0 || task2Text.trim().length > 0) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [task1Text, task2Text, saveDraftToStorage]);

  // Format Switcher
  const handleSwitchFormat = (newFormat: WritingExamFormat) => {
    if (newFormat === examFormat) return;
    saveDraftToStorage();
    setExamFormat(newFormat);
    setSelectedSetIdx(0);
    soundManager.playBeep(520, 0.03);
    onShowToast(`Switched to IELTS ${newFormat} Writing Examination.`);
  };

  // Also save immediately when switching tasks
  const handleSwitchTask = (taskNum: 1 | 2) => {
    saveDraftToStorage();
    setActiveTask(taskNum);
    soundManager.playBeep(560, 0.03);
  };

  // 60:00 Countdown Timer with 10m and 5m Coach Alerts
  useEffect(() => {
    if (!isTimerRunning) return;
    const timer = setInterval(() => {
      setTimeRemainingSec((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          soundManager.playBeep(440, 0.4);
          setTimerAlertBanner('TIME EXPIRED: 60:00 Academic Writing duration has concluded. Evaluating your response...');
          return 0;
        }
        const next = prev - 1;
        if (next === 600 && !hasShown10mAlert) {
          setHasShown10mAlert(true);
          setIsTimeHidden(false);
          soundManager.playBeep(520, 0.2);
          setTimerAlertBanner('10-MINUTE ALERT: You have 10 minutes remaining. Ensure Task 2 (worth 2/3 of your Writing score) is well-developed.');
        } else if (next === 300 && !hasShown5mAlert) {
          setHasShown5mAlert(true);
          setIsTimeHidden(false);
          soundManager.playBeep(580, 0.25);
          setTimerAlertBanner('5-MINUTE ALERT: 5 minutes remaining. Proofread for subject-verb agreement and mechanical linkers.');
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isTimerRunning, hasShown10mAlert, hasShown5mAlert]);

  // Splitter Dragging Handlers
  const handleSplitterMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplitter(true);
  }, []);

  useEffect(() => {
    if (!isDraggingSplitter) return;
    const handleMove = (e: MouseEvent) => {
      if (!splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      if (pct >= 30 && pct <= 70) {
        setLeftPanePercent(pct);
      }
    };
    const handleUp = () => setIsDraggingSplitter(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDraggingSplitter]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Open authentic submission confirmation modal
  const handleFinishAndEvaluate = () => {
    saveDraftToStorage();
    setEvaluatingTask(activeTask);
    setShowSubmitConfirmModal(true);
    soundManager.playBeep(520, 0.03);
  };

  const [isRunningGeminiEval, setIsRunningGeminiEval] = useState(false);
  const [geminiEvalError, setGeminiEvalError] = useState<string | null>(null);

  const requestDeepWritingEvaluation = async (
    taskNum: 1 | 2,
    essayText: string,
    fallbackPrecheck: WritingDiagnosticResult
  ) => {
    const trimmed = essayText.trim();
    const gate = checkWritingWordThreshold(trimmed, taskNum === 1 ? 'task1' : 'task2');
    if (!gate.isValidAttempt) {
      const insufficientResult: WritingDiagnosticResult = {
        ...fallbackPrecheck,
        isValidAttempt: false,
        assessmentStatus: 'insufficient_evidence',
        evaluationSource: 'threshold-gate',
        feedbackTitle: gate.feedbackTitle,
        feedbackEn: gate.feedbackEn,
        feedbackBn: gate.feedbackBn,
        overallBand: null,
        taScore: null,
        ccScore: null,
        lrScore: null,
        graScore: null,
        cefrLevel: 'Unassessed (Insufficient Evidence)',
        annotations: [],
        upgradedModelParagraphs: []
      };
      setDiagnosticResult(insufficientResult);
      setGeminiEvalError(gate.feedbackEn);
      soundManager.playBeep(360, 0.12);
      return;
    }

    setIsRunningGeminiEval(true);
    setGeminiEvalError(null);
    saveDraftToStorage();
    soundManager.playBeep(620, 0.04);

    try {
      const promptText = taskNum === 1 ? currentSet.task1Prompt : currentSet.task2Prompt;
      const token = getStoredSessionToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch('/api/writing/deep-evaluate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          essayText: trimmed,
          taskType: taskNum,
          examFormat,
          promptText,
          targetBand
        })
      });

      const data = await response.json().catch(() => null);
      const mapped = mapDeepWritingResponseToDiagnostic({
        httpOk: response.ok,
        httpStatus: response.status,
        data,
        fallbackPrecheck
      });

      setDiagnosticResult(mapped);
      setVaultSynced(false);
      const firstFlagged =
        mapped.annotations.find((a) => a.category !== 'clean') || mapped.annotations[0];
      if (firstFlagged) {
        setSelectedAnnotationId(firstFlagged.id);
      }

      if (shouldPersistWritingDiagnostic(mapped)) {
        recordExamAttempt({
          examType: 'writing_only',
          writingBand: mapped.overallBand,
          readingBand: null,
          listeningBand: null,
          speakingBand: null,
          overallBand: null,
          completedSkills: { writing: true },
          wordCount: mapped.wordCount,
          correctCount: 0,
          totalQuestions: 0,
          submissionType: 'manual'
        });
        soundManager.playSuccess();
        onShowToast(
          `Live AI Examiner evaluated Band ${formatNullableBand(mapped.overallBand)} across all 4 IELTS criteria.`
        );
      } else if (mapped.assessmentStatus === 'insufficient_evidence') {
        setGeminiEvalError(mapped.error || mapped.feedbackEn || null);
        soundManager.playBeep(360, 0.12);
      } else {
        const message =
          mapped.error ||
          'Live AI Writing evaluation is unavailable. No IELTS band was assigned.';
        setGeminiEvalError(message);
        soundManager.playBeep(340, 0.09);
        onShowToast(message);
      }
    } catch {
      const unavailableResult: WritingDiagnosticResult = {
        ...fallbackPrecheck,
        isValidAttempt: false,
        assessmentStatus: 'unavailable',
        evaluationSource: 'unavailable',
        overallBand: null,
        taScore: null,
        ccScore: null,
        lrScore: null,
        graScore: null,
        cefrLevel: 'Evaluation Unavailable',
        error:
          'Unable to reach the live AI Writing evaluation service. Please retry — no fallback IELTS band was assigned.',
        canRetry: true
      };
      setDiagnosticResult(unavailableResult);
      setGeminiEvalError(unavailableResult.error || null);
      soundManager.playBeep(340, 0.09);
      onShowToast(unavailableResult.error || 'Live AI evaluation unavailable.');
    } finally {
      setIsRunningGeminiEval(false);
    }
  };

  // Run Live AI 4-Criteria Evaluation strictly on chosen candidate task text (no fabricated local scores)
  const executeEvaluation = async (taskToScore: 1 | 2 = activeTask) => {
    saveDraftToStorage();
    setShowSubmitConfirmModal(false);
    setGeminiEvalError(null);

    const textToEvaluate = taskToScore === 1 ? task1Text : task2Text;
    const precheck = buildWritingStructuralPrecheck(textToEvaluate, taskToScore, targetBand, currentSet);
    setDiagnosticResult(precheck);
    setVaultSynced(false);

    if (precheck.assessmentStatus === 'insufficient_evidence') {
      soundManager.playBeep(360, 0.12);
      return;
    }

    const firstFlagged =
      precheck.annotations.find((a) => a.category !== 'clean') || precheck.annotations[0];
    if (firstFlagged) {
      setSelectedAnnotationId(firstFlagged.id);
    }

    await requestDeepWritingEvaluation(taskToScore, textToEvaluate, precheck);
  };

  // Re-run Live Server-Side Gemini Deep Evaluation on candidate's exact essay
  const handleRunGeminiDeepEvaluation = async () => {
    if (!diagnosticResult || isRunningGeminiEval) return;
    const taskNum = diagnosticResult.taskType;
    const essayText = taskNum === 1 ? task1Text : task2Text;
    const fallbackPrecheck = buildWritingStructuralPrecheck(essayText, taskNum, targetBand, currentSet);
    await requestDeepWritingEvaluation(taskNum, essayText, fallbackPrecheck);
  };

  // Clear Text with Confirmation and Undo Protection (Never silently erase candidate text)
  const handleRequestClear = () => {
    const text = activeTask === 1 ? task1Text : task2Text;
    if (!text.trim()) {
      onShowToast('Editor is already empty.');
      return;
    }
    setShowClearConfirmModal(true);
  };

  const handleConfirmClear = () => {
    const text = activeTask === 1 ? task1Text : task2Text;
    const words = activeTask === 1 ? task1WordCount : task2WordCount;
    setUndoBuffer({ task: activeTask, text, wordCount: words });
    if (activeTask === 1) setTask1Text('');
    else setTask2Text('');
    setShowClearConfirmModal(false);
    soundManager.playBeep(480, 0.04);
    onShowToast(`Cleared Task ${activeTask} text (${words} words). Click "Undo Clear" to restore.`);
  };

  const handleUndoClear = () => {
    if (!undoBuffer) return;
    if (undoBuffer.task === 1) setTask1Text(undoBuffer.text);
    else setTask2Text(undoBuffer.text);
    soundManager.playSuccess();
    onShowToast(`Restored Task ${undoBuffer.task} response (${undoBuffer.wordCount} words).`);
    setUndoBuffer(null);
  };

  // Optional Tutorial Mode loader for candidates who want to inspect a sample response
  const handleLoadTutorialSample = () => {
    if (activeTask === 1) {
      setTask1Text(currentSet.task1SampleCandidateDraft);
    } else {
      setTask2Text(currentSet.task2SampleCandidateDraft);
    }
    soundManager.playBeep(540, 0.04);
    onShowToast(`Tutorial Walkthrough Mode: Loaded Task ${activeTask} sample essay.`);
  };

  // Sync identified writing mistakes to Mistake Vault
  const handleSyncToMistakeVault = () => {
    if (!diagnosticResult) return;
    const flaggedAnnotations = diagnosticResult.annotations.filter((a) => a.category !== 'clean');

    flaggedAnnotations.forEach((ann) => {
      const qTypeLabel =
        ann.category === 'grammar'
          ? 'Grammatical Range & Accuracy (GRA)'
          : ann.category === 'lexical'
          ? 'Lexical Resource & Collocation (LR)'
          : 'Coherence & Linker Trap (CC)';

      addMistake({
        module: 'writing',
        title: ann.errorTitle || qTypeLabel,
        prompt: `${currentSet.title} · Task ${diagnosticResult.taskType}: "${ann.identifiedIssue || 'Academic Writing Error'}"`,
        questionType: qTypeLabel,
        userAnswer: ann.sentence,
        userWrongAnswer: ann.sentence,
        correctAnswer: ann.suggestedCorrection || ann.sentence,
        explanation: ann.rationaleEn || 'Examiner diagnostic correction.',
        trapExplanationEn: ann.rationaleEn,
        trapExplanationBn: ann.rationaleBn,
        status: 'unresolved'
      });
    });

    setVaultSynced(true);
    soundManager.playSuccess();
    onShowToast(`Synced ${flaggedAnnotations.length} writing errors & bilingual rationales to your Mistake Vault!`);
  };

  // Apply a single sentence-level fix directly to the draft and refresh non-scoring structural check
  const handleApplySingleFix = (ann: SentenceAnnotation) => {
    if (!ann.suggestedCorrection || ann.category === 'clean') return;
    const targetTask = diagnosticResult?.taskType ?? activeTask;
    const baseText = targetTask === 1 ? task1Text : task2Text;
    const updatedText = baseText.includes(ann.sentence)
      ? baseText.replace(ann.sentence, ann.suggestedCorrection)
      : `${baseText.trim()} ${ann.suggestedCorrection}`;

    if (targetTask === 1) setTask1Text(updatedText);
    else setTask2Text(updatedText);

    const refreshed = buildWritingStructuralPrecheck(updatedText, targetTask, targetBand, currentSet);
    setDiagnosticResult(refreshed);
    const nextFlagged = refreshed.annotations.find((a) => a.category !== 'clean') || refreshed.annotations[0];
    if (nextFlagged) setSelectedAnnotationId(nextFlagged.id);

    soundManager.playSuccess();
    onShowToast('Applied suggested revision to your draft. Re-run Live AI Evaluation to obtain an updated band estimate.');
  };

  // Apply all suggested sentence fixes in one click and refresh non-scoring structural check
  const handleApplyAllFixes = () => {
    if (!diagnosticResult) return;
    const targetTask = diagnosticResult.taskType;
    let updatedText = targetTask === 1 ? task1Text : task2Text;
    let appliedCount = 0;

    diagnosticResult.annotations.forEach((ann) => {
      if (ann.category !== 'clean' && ann.suggestedCorrection && updatedText.includes(ann.sentence)) {
        updatedText = updatedText.replace(ann.sentence, ann.suggestedCorrection);
        appliedCount++;
      }
    });

    if (appliedCount === 0) {
      onShowToast('All detected sentence upgrades have already been applied!');
      return;
    }

    if (targetTask === 1) setTask1Text(updatedText);
    else setTask2Text(updatedText);

    const refreshed = buildWritingStructuralPrecheck(updatedText, targetTask, targetBand, currentSet);
    setDiagnosticResult(refreshed);
    const nextFlagged = refreshed.annotations.find((a) => a.category !== 'clean') || refreshed.annotations[0];
    if (nextFlagged) setSelectedAnnotationId(nextFlagged.id);

    soundManager.playSuccess();
    onShowToast(`Applied ${appliedCount} suggested revision(s) to your draft. Re-run Live AI Evaluation for an updated band estimate.`);
  };

  const activeAnnotation = useMemo(() => {
    if (!diagnosticResult) return null;
    return (
      diagnosticResult.annotations.find((a) => a.id === selectedAnnotationId) ||
      diagnosticResult.annotations.find((a) => a.category !== 'clean') ||
      diagnosticResult.annotations[0] ||
      null
    );
  }, [diagnosticResult, selectedAnnotationId]);

  return (
    <div
      className={`h-screen w-full overflow-hidden flex flex-col select-none font-sans transition-colors duration-150 ${
        isHighContrast ? cdTheme.bg : 'bg-[#F7F9F8] dark:bg-[#0B1514] text-[#0E1F1E] dark:text-slate-100'
      }`}
    >
      {/* ================= 1. CD-IELTS TOP EXAMINATION BAR ================= */}
      <header
        className={`h-14 shrink-0 px-3 sm:px-5 border-b flex items-center justify-between gap-2 z-30 ${
          isHighContrast
            ? `${cdTheme.headerBg} ${cdTheme.border}`
            : 'bg-[#0F4C45] text-white border-[#0B3833]'
        }`}
      >
        {/* Left: Candidate Identity & Module Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => {
              saveDraftToStorage();
              onExit();
            }}
            className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 border border-white/15"
            title="Save draft and exit examination room"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exit Room</span>
          </button>

          <div className="h-5 w-px bg-white/20 hidden sm:block" />

          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold truncate">
              <span className="text-[#F4A62A] font-mono uppercase tracking-wider">CD-IELTS PRACTICE</span>
              <span aria-hidden="true" className="opacity-50">·</span>
              <span className="truncate">{examFormat} Writing · Tasks 1 &amp; 2</span>
            </div>
            <div className="text-[11px] opacity-80 font-mono truncate">
              Candidate: <strong className="opacity-100">{candidateName}</strong> · ID: <strong className="text-[#F4A62A]">{candidateId}</strong>
            </div>
          </div>
        </div>

        {/* Center: Format Switcher, 60:00 Countdown Timer & Task 1 / Task 2 Tabs */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Academic / General Training Stream Toggle */}
          <div className="hidden lg:flex items-center p-1 bg-black/25 rounded-xl border border-white/15 text-xs font-bold">
            <button
              onClick={() => handleSwitchFormat('Academic')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                examFormat === 'Academic' ? 'bg-[#F4A62A] text-[#0E1F1E] shadow-xs' : 'text-white/75 hover:text-white'
              }`}
            >
              Academic
            </button>
            <button
              onClick={() => handleSwitchFormat('General Training')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                examFormat === 'General Training' ? 'bg-[#F4A62A] text-[#0E1F1E] shadow-xs' : 'text-white/75 hover:text-white'
              }`}
            >
              General Training
            </button>
          </div>

          {/* Task Switcher Segmented Control */}
          <div className="flex items-center p-1 bg-black/25 rounded-xl border border-white/15">
            <button
              onClick={() => handleSwitchTask(1)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTask === 1
                  ? 'bg-[#F4A62A] text-[#0E1F1E] shadow-xs'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{examFormat === 'General Training' ? 'Task 1: Letter' : 'Task 1: Report'}</span>
              <span className="hidden md:inline text-[10px] font-mono tabular-nums opacity-85">({task1WordCount}w)</span>
            </button>
            <button
              onClick={() => handleSwitchTask(2)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTask === 2
                  ? 'bg-[#F4A62A] text-[#0E1F1E] shadow-xs'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Task 2: Essay</span>
              <span className="hidden md:inline text-[10px] font-mono tabular-nums opacity-85">({task2WordCount}w)</span>
            </button>
          </div>

          {/* 60:00 Timed Countdown Clock */}
          <div
            className={`px-3 py-1.5 rounded-xl border font-mono text-xs sm:text-sm font-black tabular-nums flex items-center gap-2 ${
              timeRemainingSec <= 300
                ? 'bg-rose-950/90 border-rose-400 text-rose-200 animate-pulse'
                : timeRemainingSec <= 600
                ? 'bg-amber-950/90 border-[#F4A62A] text-[#F4A62A]'
                : 'bg-black/30 border-white/20 text-white'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0 text-[#F4A62A]" />
            <span>{isTimeHidden ? '••:••' : formatTimer(timeRemainingSec)}</span>
            <button
              onClick={() => setIsTimeHidden(!isTimeHidden)}
              className="text-white/70 hover:text-white ml-1 cursor-pointer"
              title={isTimeHidden ? 'Show countdown timer' : 'Hide countdown timer'}
            >
              {isTimeHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Right: CD-IELTS Accessibility Controls, Auxiliary Labs & Finish CTA */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Compact CD-IELTS Accessibility Contrast & Text Size Controls */}
          <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-xl bg-black/25 border border-white/15">
            <Contrast className="w-3.5 h-3.5 text-[#F4A62A] shrink-0" />
            <select
              aria-label="CD-IELTS Display Contrast"
              value={colorScheme}
              onChange={(e) => handleSetColorScheme(e.target.value as CDIELTSColorScheme)}
              className="bg-transparent text-white text-[11px] font-mono font-semibold outline-none cursor-pointer pr-1"
            >
              <option value="standard" className="text-slate-900 bg-white">Standard</option>
              <option value="black-on-yellow" className="text-black bg-[#FFF100]">Black / Yellow</option>
              <option value="yellow-on-black" className="text-[#FFF100] bg-black">Yellow / Black</option>
              <option value="white-on-black" className="text-white bg-black">White / Black</option>
            </select>
            <span className="w-px h-3.5 bg-white/20" />
            <Type className="w-3 h-3 text-[#F4A62A] shrink-0" />
            <div className="flex items-center gap-0.5">
              {(['100%', '125%', '150%'] as CDIELTSZoomLevel[]).map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => handleSetZoomLevel(z)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                    zoomLevel === z
                      ? 'bg-[#F4A62A] text-[#0E1F1E]'
                      : 'text-white/75 hover:text-white'
                  }`}
                  title={`Set exam text size to ${z}`}
                >
                  {z}
                </button>
              ))}
            </div>
          </div>

          {!embeddedInFullExam && (
            <button
              onClick={handleLoadTutorialSample}
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-[11px] font-semibold transition cursor-pointer"
              title="Tutorial Mode: Load Sample Candidate Draft"
            >
              <FileText className="w-3.5 h-3.5 text-[#F4A62A]" />
              <span>Sample Draft</span>
            </button>
          )}
          {onOpenAiPilots && !embeddedInFullExam && (
            <button
              onClick={onOpenAiPilots}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-semibold transition cursor-pointer"
              title="Open AI Writing Pilot Practice"
            >
              <span>AI Pilots</span>
            </button>
          )}
          {onOpenAuxiliaryLabs && !embeddedInFullExam && (
            <button
              onClick={onOpenAuxiliaryLabs}
              className="hidden 2xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-semibold transition cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-[#F4A62A]" />
              <span>Labs</span>
            </button>
          )}

          <button
            onClick={handleFinishAndEvaluate}
            className="px-3.5 sm:px-4 py-2 rounded-xl bg-[#F4A62A] hover:bg-[#D0891F] text-[#0E1F1E] font-bold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Award className="w-4 h-4" />
            <span>Finish &amp; Evaluate</span>
          </button>
        </div>
      </header>

      {/* AI PILOT — APPROVED PRACTICE Banner when customPilotSet is active */}
      {customPilotSet && (
        <div className="bg-emerald-900 text-emerald-100 border-b border-emerald-700 px-4 py-2 text-xs font-mono font-semibold flex items-center justify-between gap-3 shrink-0 z-20">
          <div className="flex items-center gap-2 truncate">
            <span className="font-bold uppercase tracking-wider text-emerald-300">
              AI PILOT — APPROVED PRACTICE
            </span>
            <span aria-hidden="true">·</span>
            <span className="truncate">
              {customPilotSet.title} ({customPilotSet.format || 'Academic'})
            </span>
          </div>
          {onExitPilot && (
            <button
              type="button"
              onClick={() => {
                setTask1Text('');
                setTask2Text('');
                setTimeRemainingSec(60 * 60);
                setDiagnosticResult(null);
                onExitPilot();
              }}
              className="px-3 py-1 rounded-lg bg-emerald-950 hover:bg-slate-900 text-white border border-emerald-600 text-[11px] font-bold transition cursor-pointer shrink-0"
            >
              Exit AI Pilot &amp; Return to Standard Sets
            </button>
          )}
        </div>
      )}

      {/* Optional 10m / 5m Alert Strip */}
      {timerAlertBanner && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between gap-3 shrink-0 z-20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{timerAlertBanner}</span>
          </div>
          <button
            onClick={() => setTimerAlertBanner(null)}
            className="px-2.5 py-0.5 rounded bg-slate-950 text-white text-[11px] font-bold cursor-pointer"
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* Mobile Stream & Pane Switcher (<md, 360px-430px optimized) */}
      <div className="md:hidden flex flex-col border-b border-[#D3DDDA] dark:border-slate-800 bg-white dark:bg-[#11201E] shrink-0">
        <div className="flex items-center justify-between px-3 py-2 bg-[#F5F7F6] dark:bg-[#0B1514] border-b border-[#D3DDDA] dark:border-slate-800 text-xs font-bold">
          <span className="text-[#4A5E5B] dark:text-slate-400 font-mono text-[11px]">FORMAT:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleSwitchFormat('Academic')}
              className={`min-h-[34px] px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                examFormat === 'Academic' ? 'bg-[#0F4C45] text-white' : 'text-[#4A5E5B] dark:text-slate-300 bg-white border border-[#D3DDDA] dark:bg-slate-800'
              }`}
            >
              Academic
            </button>
            <button
              onClick={() => handleSwitchFormat('General Training')}
              className={`min-h-[34px] px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                examFormat === 'General Training' ? 'bg-[#0F4C45] text-white' : 'text-[#4A5E5B] dark:text-slate-300 bg-white border border-[#D3DDDA] dark:bg-slate-800'
              }`}
            >
              General Training
            </button>
          </div>
        </div>

        <div className="flex">
          <button
            onClick={() => setMobilePane('prompt')}
            className={`flex-1 min-h-[44px] py-2.5 text-xs font-bold border-b-2 transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mobilePane === 'prompt'
                ? 'border-[#0F4C45] text-[#0F4C45] bg-[#0F4C45]/5 dark:text-[#F4A62A] dark:border-[#F4A62A]'
                : 'border-transparent text-slate-500'
            }`}
          >
            <span>1. Prompt &amp; Task</span>
          </button>
          <button
            onClick={() => setMobilePane('editor')}
            className={`flex-1 min-h-[44px] py-2.5 text-xs font-bold border-b-2 transition flex items-center justify-center gap-1.5 cursor-pointer ${
              mobilePane === 'editor'
                ? 'border-[#0F4C45] text-[#0F4C45] bg-[#0F4C45]/5 dark:text-[#F4A62A] dark:border-[#F4A62A]'
                : 'border-transparent text-slate-500'
            }`}
          >
            <span className="tabular-nums">2. Response ({currentWordCount}w / {minWordThreshold}m)</span>
          </button>
        </div>
      </div>

      {/* ================= 2. 50/50 SPLIT-SCREEN EXAMINATION WORKSPACE ================= */}
      <div ref={splitContainerRef} className="flex-1 flex w-full overflow-hidden relative">
        {/* LEFT PANE: Practice Prompt Card + Data Graphic */}
        <div
          style={{
            width: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${leftPanePercent}%` : '100%'
          }}
          className={`${
            mobilePane === 'prompt' ? 'flex' : 'hidden md:flex'
          } h-full flex-col overflow-y-auto border-r p-5 sm:p-7 space-y-5 select-text transition-colors duration-150 ${cdFontSizeClass} ${
            isHighContrast
              ? `${cdTheme.cardBg} ${cdTheme.border} ${cdTheme.text}`
              : 'bg-white dark:bg-[#11201E] border-[#D3DDDA] dark:border-[#1F8A70]/30'
          }`}
        >
          {/* Set Selector & Task Instructions Header */}
          <div className={`flex flex-wrap items-center justify-between gap-2 pb-3 border-b ${isHighContrast ? cdTheme.border : 'border-[#D3DDDA] dark:border-[#1F8A70]/25'}`}>
            <div>
              <div className={`text-[11px] font-mono font-bold uppercase tracking-wider ${isHighContrast ? cdTheme.subtext : 'text-[#0F4C45] dark:text-[#F4A62A]'}`}>
                BANDSPRINT PRACTICE PROMPT · {examFormat.toUpperCase()} · {activeTask === 1 ? 'TASK 1' : 'TASK 2'}
              </div>
              <h1 className={`font-display text-lg sm:text-xl font-bold mt-0.5 ${isHighContrast ? cdTheme.text : 'text-[#0E1F1E] dark:text-white'}`}>
                {activeTask === 1 ? currentSet.task1Title : currentSet.task2Title}
              </h1>
            </div>

            <select
              value={selectedSetIdx}
              onChange={(e) => {
                const idx = Number(e.target.value);
                setSelectedSetIdx(idx);
                const nextSet = activeSets[idx] || activeSets[0];
                setTask1Text(nextSet.task1SampleCandidateDraft);
                setTask2Text(nextSet.task2SampleCandidateDraft);
                onShowToast(`Switched to ${nextSet.title}`);
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            >
              {activeSets.map((s, idx) => (
                <option key={s.id} value={idx}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          {/* Official Timing & Threshold Instruction Box */}
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-300 dark:border-slate-700 space-y-2">
            <div className="text-xs font-mono font-bold uppercase text-slate-600 dark:text-slate-300">
              {activeTask === 1
                ? 'You should spend about 20 minutes on this task.'
                : 'You should spend about 40 minutes on this task.'}
            </div>
            <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-relaxed font-serif">
              {activeTask === 1 ? currentSet.task1Prompt : currentSet.task2Prompt}
            </p>
            <div className="pt-1 text-xs font-bold text-blue-700 dark:text-blue-400 font-mono">
              {activeTask === 1
                ? `Write at least 150 words. (Worth 1/3 of total ${examFormat} Writing score)`
                : `Write at least 250 words. (Worth 2/3 of total ${examFormat} Writing score)`}
            </div>
          </div>

          {/* TASK 1 / TASK 2 INSTRUCTION & VISUAL PROMPTS */}
          {activeTask === 1 ? (
            examFormat === 'Academic' && currentSet.task1Series && currentSet.task1Categories ? (
              <div className="space-y-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                        {currentSet.task1ChartTitle}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-mono">{currentSet.task1ChartSubtitle}</p>
                    </div>
                    {/* Legend */}
                    <div className="flex items-center gap-3 text-xs font-mono font-bold">
                      {currentSet.task1Series.map((s) => (
                        <span key={s.name} className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-xs inline-block" style={{ backgroundColor: s.color }} />
                          <span>{s.name}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Precision SVG Bar Chart */}
                  <svg viewBox="0 0 560 240" className="w-full h-auto overflow-visible">
                    {/* Horizontal Grid Lines */}
                    {[0, 25, 50, 75, 100].map((tick, i) => {
                      const y = 195 - (tick / 100) * 160;
                      const labelVal =
                        currentSet.id === 'cam18_writing_set2' ? Math.round((tick / 100) * 180) : `${tick}%`;
                      return (
                        <g key={i}>
                          <line
                            x1="48"
                            y1={y}
                            x2="540"
                            y2={y}
                            stroke="currentColor"
                            className="text-slate-200 dark:text-slate-800"
                            strokeDasharray="4 4"
                            strokeWidth="1"
                          />
                          <text
                            x="40"
                            y={y + 4}
                            textAnchor="end"
                            className="fill-slate-500 font-mono text-[10px]"
                          >
                            {labelVal}
                          </text>
                        </g>
                      );
                    })}

                    {/* Grouped Bars */}
                    {currentSet.task1Categories.map((cat, cIdx) => {
                      const groupX = 75 + cIdx * 118;
                      const maxScale = currentSet.id === 'cam18_writing_set2' ? 180 : 100;
                      return (
                        <g key={cat}>
                          {currentSet.task1Series?.map((serie, sIdx) => {
                            const val = serie.values[cIdx] || 0;
                            const barHeight = Math.max(4, (val / maxScale) * 160);
                            const barX = groupX + sIdx * 26;
                            const barY = 195 - barHeight;
                            return (
                              <g key={serie.name}>
                                <rect
                                  x={barX}
                                  y={barY}
                                  width="22"
                                  height={barHeight}
                                  rx="3"
                                  fill={serie.color}
                                />
                                <text
                                  x={barX + 11}
                                  y={barY - 5}
                                  textAnchor="middle"
                                  className="fill-slate-700 dark:fill-slate-300 font-mono text-[9px] font-bold"
                                >
                                  {val}
                                </text>
                              </g>
                            );
                          })}
                          <text
                            x={groupX + 37}
                            y="216"
                            textAnchor="middle"
                            className="fill-slate-800 dark:fill-slate-200 font-sans text-[11px] font-bold"
                          >
                            {cat}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Accompanying Statistical Table */}
                {currentSet.task1TableSummary && currentSet.task1TableSummary.length > 0 && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono uppercase text-[10px]">
                          <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700">Nation / Corridor</th>
                          <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700">2010</th>
                          <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700">2018</th>
                          <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700">2025</th>
                          <th className="py-2.5 px-3 border-b border-slate-200 dark:border-slate-700">Net Shift &amp; Key Driver</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {currentSet.task1TableSummary.map((row) => (
                          <tr key={row.country} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">{row.country}</td>
                            <td className="py-2 px-3 font-mono">{row.y2010}</td>
                            <td className="py-2 px-3 font-mono">{row.y2018}</td>
                            <td className="py-2 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">{row.y2025}</td>
                            <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{row.growth}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Structured Visual Data Fallback for maps, processes, tables, pie charts, mixed diagrams */}
                {currentSet.task1VisualData && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                        {currentSet.task1VisualData.chartTitle || currentSet.task1ChartTitle || 'Task 1 Visual Diagram'}
                      </h3>
                      {currentSet.task1VisualData.units && (
                        <span className="text-[11px] font-mono text-slate-500">
                          Units: {currentSet.task1VisualData.units}
                        </span>
                      )}
                    </div>

                    {/* Table headers & rows if present */}
                    {currentSet.task1VisualData.tableHeaders && currentSet.task1VisualData.tableRows && (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px]">
                              {currentSet.task1VisualData.tableHeaders.map((th: string, idx: number) => (
                                <th key={idx} className="py-2 px-3 border-b border-slate-200 dark:border-slate-700">{th}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                            {currentSet.task1VisualData.tableRows.map((row: string[], rIdx: number) => (
                              <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                {row.map((cell: string, cIdx: number) => (
                                  <td key={cIdx} className="py-2 px-3 font-semibold text-slate-900 dark:text-white">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Map Features if present */}
                    {currentSet.task1VisualData.mapFeatures && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Map Development ({currentSet.task1VisualData.pastYear || 'Past'} vs {currentSet.task1VisualData.presentYear || 'Present'}):
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {currentSet.task1VisualData.mapFeatures.map((mf: any, idx: number) => (
                            <div key={idx} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                              <span className="font-bold text-blue-600 dark:text-blue-400 block">{mf.name}</span>
                              <div className="text-[11px] text-slate-500">
                                <span className="line-through mr-1">{mf.pastState}</span> &rarr; <span className="font-semibold text-slate-800 dark:text-slate-200">{mf.presentState}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Process Steps if present */}
                    {currentSet.task1VisualData.processSteps && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Process Lifecycle Steps ({currentSet.task1VisualData.processTitle || 'Diagram Steps'}):
                        </div>
                        <div className="space-y-2">
                          {currentSet.task1VisualData.processSteps.map((step: any) => (
                            <div key={step.stepNumber} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                              <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                {step.stepNumber}
                              </span>
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block">{step.title}</span>
                                <span className="text-[11px] text-slate-500">{step.description}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* GENERAL TRAINING TASK 1: Letter Format with 3 Explicit Bullet Points */
              <div className="space-y-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                      General Training Task 1 · {currentSet.task1LetterType || 'Letter'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">150 words minimum</span>
                  </div>

                  <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    You should spend about 20 minutes on this task. Write a letter in response to the scenario above. You do NOT need to write any postal addresses.
                  </div>

                  {currentSet.task1BulletPoints && currentSet.task1BulletPoints.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        In your letter, you must address all three points:
                      </div>
                      <div className="space-y-2">
                        {currentSet.task1BulletPoints.map((bp, bpIdx) => (
                          <div
                            key={bpIdx}
                            className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200"
                          >
                            <span className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                              {bpIdx + 1}
                            </span>
                            <span className="leading-relaxed">{bp}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Salutation & Sign-off Guideline */}
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
                    <strong className="block font-bold mb-0.5">Tone &amp; Letter Conventions:</strong>
                    {currentSet.task1LetterType === 'Formal' && (
                      <span>Open with <em>Dear Sir or Madam,</em> and conclude with <em>Yours faithfully,</em> followed by your name. Maintain an objective, professional register.</span>
                    )}
                    {currentSet.task1LetterType === 'Semi-Formal' && (
                      <span>Open with <em>Dear Mr/Ms [Surname],</em> and conclude with <em>Yours sincerely,</em> followed by your full name. Professional yet personal tone.</span>
                    )}
                    {currentSet.task1LetterType === 'Informal' && (
                      <span>Open with <em>Dear [First Name],</em> and conclude with <em>Warm wishes,</em> or <em>Best regards,</em> followed by your first name. Natural, friendly register.</span>
                    )}
                    {!currentSet.task1LetterType && (
                      <span>Match your greeting and sign-off to the relationship with the recipient (Formal, Semi-Formal, or Informal).</span>
                    )}
                  </div>
                </div>
              </div>
            )
          ) : (
            /* TASK 2 ARGUMENTATIVE ASSESSMENT RUBRIC REMINDER */
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="text-xs font-mono font-bold uppercase text-slate-500">
                IELTS Task 2 Structural Blueprint ({examFormat})
              </div>
              <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <strong className="text-slate-900 dark:text-white block">1. Introduction (40–50 words)</strong>
                  Paraphrase the prompt using academic nominalisation and state a clear thesis position addressing all prompt dimensions.
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <strong className="text-slate-900 dark:text-white block">2. Body Paragraph 1 &amp; 2 (160–180 words)</strong>
                  Develop one central idea per paragraph with explanation and concrete examples. Maintain cohesion without repetitive mechanical connectors.
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <strong className="text-slate-900 dark:text-white block">3. Conclusion (35–45 words)</strong>
                  Synthesise your main points and restate your final judgment without introducing extraneous arguments.
                </div>
              </div>
            </div>
          )}

          {/* Mobile Jump to Editor CTA */}
          <div className="pt-4 md:hidden border-t border-[#D3DDDA] dark:border-slate-800">
            <button
              onClick={() => setMobilePane('editor')}
              className="w-full py-3 px-4 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <span>Go to Response Editor ({currentWordCount} words)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* DRAGGABLE & KEYBOARD-ACCESSIBLE SPLITTER BAR (Desktop) */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize prompt and writing editor panes"
          aria-valuemin={30}
          aria-valuemax={70}
          aria-valuenow={Math.round(leftPanePercent)}
          tabIndex={0}
          onMouseDown={handleSplitterMouseDown}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              setLeftPanePercent((p) => Math.max(30, p - 5));
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              setLeftPanePercent((p) => Math.min(70, p + 5));
            }
          }}
          className={`hidden md:flex w-2 hover:w-3 bg-[#D3DDDA] dark:bg-slate-800 focus:bg-[#0F4C45] focus:outline-none cursor-col-resize items-center justify-center transition-all shrink-0 ${
            isDraggingSplitter ? 'bg-[#0F4C45] w-3' : ''
          }`}
          title="Drag or press Left/Right arrow keys to resize Prompt & Editor panes"
        >
          <div className="w-0.5 h-10 bg-[#0F4C45]/60 rounded-full" />
        </div>

        {/* RIGHT PANE: Plain Text Exam Editor (Spellcheck Disabled) */}
        <div
          style={{
            width: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${100 - leftPanePercent}%` : '100%'
          }}
          className={`${
            mobilePane === 'editor' ? 'flex' : 'hidden md:flex'
          } h-full flex-col ${isHighContrast ? cdTheme.bg : 'bg-[#F5F7F6] dark:bg-[#0B1514]'} p-5 sm:p-7 justify-between overflow-y-auto`}
        >
          {/* Mobile Back to Prompt Bar */}
          <div className="md:hidden pb-3 border-b border-[#D3DDDA] dark:border-slate-800 shrink-0">
            <button
              onClick={() => setMobilePane('prompt')}
              className="w-full py-2.5 px-3 rounded-lg bg-white dark:bg-slate-800 border border-[#D3DDDA] dark:border-slate-700 text-[#0F4C45] dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>← View Task {activeTask} Prompt &amp; Instructions</span>
            </button>
          </div>

          {/* Editor Top Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#D3DDDA] dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono font-bold uppercase text-[#0F4C45] dark:text-[#F4A62A]">
                PLAIN-TEXT EXAM SHEET · TASK {activeTask}
              </span>
              <span aria-hidden="true" className="text-slate-400">·</span>
              <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                <Save className="w-3 h-3 text-emerald-600" />
                Auto-saved ({lastSavedTimestamp})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (activeTask === 1) {
                    setTask1Text(currentSet.task1SampleCandidateDraft);
                  } else {
                    setTask2Text(currentSet.task2SampleCandidateDraft);
                  }
                  onShowToast(`Loaded realistic Band 6.5 candidate draft for Task ${activeTask}.`);
                }}
                className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                title="Populate realistic candidate essay with intentional GRA, LR, and CC errors to test the 4-Criteria Evaluator"
              >
                Reset Sample Essay
              </button>
              {undoBuffer && undoBuffer.task === activeTask && (
                <button
                  onClick={handleUndoClear}
                  className="px-2.5 py-1 rounded-lg border border-amber-400/60 bg-amber-500/10 hover:bg-amber-500/20 text-[11px] font-bold text-amber-700 dark:text-amber-300 transition cursor-pointer flex items-center gap-1"
                  title="Restore recently cleared text"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Undo Clear ({undoBuffer.wordCount}w)</span>
                </button>
              )}
              <button
                onClick={handleRequestClear}
                className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 text-[11px] font-semibold text-slate-500 transition cursor-pointer"
                title="Clear editor text with confirmation safeguard"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Real-Time Non-Scoring Structural Readiness Bar */}
          <div className="mt-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
              <span className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Live Check: <strong className="text-slate-600 dark:text-slate-300">Non-Scoring</strong>
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="text-slate-600 dark:text-slate-400">
                AI Band: <strong className="text-slate-900 dark:text-slate-200">Not Scored Yet</strong>
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="text-slate-600 dark:text-slate-400">
                Target: <strong className="text-slate-900 dark:text-slate-200">{currentWordCount}/{minWordThreshold}w</strong>
              </span>
            </div>

            <button
              onClick={handleFinishAndEvaluate}
              className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
              title="Submit for Live AI 4-Criteria Evaluation & Red-Pen Review"
            >
              <span>
                {liveIssueCount > 0
                  ? `${liveIssueCount} Draft Pattern Note${liveIssueCount > 1 ? 's' : ''} · Run Live AI →`
                  : 'Submit for Live AI Evaluation →'}
              </span>
            </button>
          </div>

          {/* CD-IELTS Textarea (spellCheck="false" autoCorrect="off" autoCapitalize="off") */}
          <div className="flex-1 flex flex-col my-3 min-h-[300px]">
            <textarea
              value={currentText}
              onChange={(e) => {
                const val = e.target.value;
                if (activeTask === 1) setTask1Text(val);
                else setTask2Text(val);
              }}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              autoComplete="off"
              data-gramm="false"
              placeholder={`Type your ${examFormat} Writing Task ${activeTask} practice response here...\n\n• Spell-check and auto-correct are disabled to mirror CD-IELTS exam conditions.\n• Minimum word threshold: ${minWordThreshold} words.`}
              className={`flex-1 w-full p-4 sm:p-5 rounded-xl border leading-relaxed font-sans outline-none focus:ring-2 focus:ring-[#0F4C45] resize-none shadow-2xs select-text ${cdFontSizeClass} ${
                isHighContrast
                  ? `${cdTheme.inputBg} ${cdTheme.border}`
                  : 'border-[#D3DDDA] dark:border-[#1F8A70]/30 bg-white dark:bg-[#11201E] text-[#0E1F1E] dark:text-slate-100'
              }`}
            />
          </div>

          {/* Editor Bottom Bar: Live Dynamic Word Counter + Threshold Warning + Evaluate CTA */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex flex-wrap items-center gap-3">
              <div
                className={`px-3 py-1.5 rounded-lg border font-mono text-xs font-bold flex items-center gap-2 ${
                  isBelowThreshold
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300'
                    : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {isBelowThreshold ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                )}
                <span>
                  Words: {currentWordCount} / {minWordThreshold} minimum
                </span>
              </div>

              {isBelowThreshold ? (
                <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  Under threshold by {minWordThreshold - currentWordCount} words (Task Achievement penalty applies below {minWordThreshold}w)
                </span>
              ) : (
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  Minimum word threshold satisfied · Spell-check OFF
                </span>
              )}
            </div>

            <button
              onClick={handleFinishAndEvaluate}
              className="px-5 py-2.5 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white font-bold text-xs shadow-sm transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Award className="w-4 h-4 text-[#F4A62A]" />
              <span>Finish &amp; Evaluate Essay</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= 3. 4-CRITERIA EXAMINER DIAGNOSTIC SCORECARD MODAL ================= */}
      {diagnosticResult && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in select-text">
          {diagnosticResult.assessmentStatus === 'insufficient_evidence' ? (
            <div className="w-full max-w-xl bg-white dark:bg-slate-900 border-2 border-rose-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
              <div className="p-6 bg-gradient-to-r from-rose-950 via-slate-900 to-slate-950 text-white border-b border-rose-500/30 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-rose-300 font-bold block">
                      Submission Unassessed · No Band Assigned
                    </span>
                    <h2 className="text-lg sm:text-xl font-black text-white">
                      {diagnosticResult.feedbackTitle || 'Submission Too Short for Assessment'}
                    </h2>
                  </div>
                </div>
                <button
                  onClick={() => setDiagnosticResult(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-rose-800 dark:text-rose-300">
                    <span>Words Written: {diagnosticResult.wordCount} words</span>
                    <span>Minimum Assessment Gate: {diagnosticResult.taskType === 1 ? '30 words' : '50 words'}</span>
                  </div>
                  <p className="text-sm font-bold text-rose-950 dark:text-rose-200 leading-relaxed">
                    {diagnosticResult.feedbackEn ||
                      `Submission Too Short for Assessment (${diagnosticResult.wordCount} words written). Academic essays require sustained argument development to evaluate.`}
                  </p>
                  <p className="text-xs font-medium text-rose-800 dark:text-rose-300 leading-relaxed pt-2 border-t border-rose-200/70 dark:border-rose-800/50">
                    {diagnosticResult.feedbackBn ||
                      'প্রয়োজনীয় ন্যূনতম শব্দসংখ্যা পূরণ হয়নি। মূল্যায়ন পেতে পর্যাপ্ত বাক্য লিখুন।'}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    onClick={() => setDiagnosticResult(null)}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Return &amp; Continue Writing</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-6xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/35 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
              {/* Modal Header: Band Score & Target Band Comparison */}
              <div className="p-5 sm:p-6 bg-[#0F4C45] text-white border-b border-[#0B3833] flex flex-wrap items-center justify-between gap-4 shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-[#F4A62A] font-mono font-bold uppercase tracking-wider">
                    <Award className="w-4 h-4" />
                    <span>
                      {diagnosticResult.assessmentStatus === 'evaluated'
                        ? 'BANDSPRINT WRITING DIAGNOSTIC · LIVE AI 4-CRITERIA ESTIMATE'
                        : diagnosticResult.assessmentStatus === 'unavailable'
                        ? 'BANDSPRINT WRITING DIAGNOSTIC · AI EVALUATION UNAVAILABLE'
                        : 'BANDSPRINT WRITING DIAGNOSTIC · STRUCTURAL PRE-CHECK (NON-SCORING)'}
                    </span>
                  </div>
                  <h2 className="font-display text-xl sm:text-2xl font-bold">
                    {currentSet.title} · Task {diagnosticResult.taskType} ({examFormat}) Review
                  </h2>
                  <div className="text-xs text-slate-300 flex flex-wrap items-center gap-2 font-mono">
                    <span>Candidate: {candidateName}</span>
                    <span aria-hidden="true">·</span>
                    <span>Format: {examFormat}</span>
                    <span aria-hidden="true">·</span>
                    <span>Word Count: {diagnosticResult.wordCount} words (Min {diagnosticResult.minWords})</span>
                    <span aria-hidden="true">·</span>
                    <span>Status: {diagnosticResult.cefrLevel}</span>
                  </div>
                  <div className="text-[11px] text-slate-300 italic">
                    *AI diagnostic estimate aligned with IELTS 9-band public descriptors. Educational practice feedback; not an official test report form (TRF).
                  </div>
                </div>

                {/* Overall Band vs Target Band Comparison Card (Null-Safe) */}
                <div className="flex items-center gap-4 bg-slate-800/90 border border-slate-700 rounded-2xl px-4 py-3">
                  <div className="text-center pr-4 border-r border-slate-700">
                    <div className="text-[10px] font-mono uppercase text-slate-400">
                      {diagnosticResult.assessmentStatus === 'evaluated'
                        ? 'AI Diagnostic Band'
                        : isRunningGeminiEval
                        ? 'Evaluating'
                        : 'Band Status'}
                    </div>
                    <div className="text-3xl font-black font-mono text-amber-400 flex items-center justify-center gap-2">
                      {isRunningGeminiEval ? (
                        <Loader2 className="w-6 h-6 animate-spin text-amber-300" />
                      ) : diagnosticResult.assessmentStatus === 'evaluated' &&
                        diagnosticResult.overallBand !== null ? (
                        `Band ${formatNullableBand(diagnosticResult.overallBand)}`
                      ) : (
                        'Band —'
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] font-mono uppercase text-slate-400">Target Band</div>
                    <div className="text-xl font-black font-mono text-emerald-400">
                      Band {diagnosticResult.targetBand.toFixed(1)}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      {diagnosticResult.assessmentStatus === 'evaluated' &&
                      diagnosticResult.overallBand !== null
                        ? diagnosticResult.overallBand >= diagnosticResult.targetBand
                          ? 'Target Achieved'
                          : `Gap: -${(diagnosticResult.targetBand - diagnosticResult.overallBand).toFixed(1)} Band`
                        : isRunningGeminiEval
                        ? 'Running Live AI...'
                        : diagnosticResult.assessmentStatus === 'unavailable'
                        ? 'Evaluation Unavailable'
                        : 'Not Scored Yet'}
                    </div>
                  </div>
                  <button
                    onClick={() => setDiagnosticResult(null)}
                    className="ml-2 p-2 rounded-xl bg-slate-700/70 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                    title="Return to Essay Editor"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                {/* Explicit Non-Scoring / Unavailable Status Banner */}
                {diagnosticResult.assessmentStatus !== 'evaluated' && (
                  <div
                    className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
                      diagnosticResult.assessmentStatus === 'unavailable'
                        ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
                        : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-200'
                    }`}
                  >
                    <div className="space-y-1 max-w-2xl">
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        {isRunningGeminiEval ? (
                          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                        )}
                        <span>
                          {isRunningGeminiEval
                            ? 'Live AI Writing Evaluation in Progress...'
                            : diagnosticResult.assessmentStatus === 'unavailable'
                            ? 'Live AI Writing Evaluation Unavailable — No Band Assigned'
                            : 'Offline Structural Pre-Check Active — Not Yet Scored'}
                        </span>
                      </div>
                      <p className="text-xs opacity-90 leading-relaxed">
                        {isRunningGeminiEval
                          ? 'Review your draft structural notes below while the live AI examiner completes all four IELTS criteria.'
                          : diagnosticResult.error ||
                            'No IELTS band has been assigned to this draft. Your structural pattern notes remain reviewable below, and you can run or retry Live AI Evaluation anytime.'}
                      </p>
                    </div>

                    {!isRunningGeminiEval && (
                      <button
                        type="button"
                        onClick={handleRunGeminiDeepEvaluation}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>
                          {diagnosticResult.assessmentStatus === 'unavailable'
                            ? 'Retry Live AI Evaluation'
                            : 'Run Live AI Evaluation'}
                        </span>
                      </button>
                    )}
                  </div>
                )}

                {/* SECTION A: 4 IELTS Descriptors with Individual Null-Safe Band Scores & Progress Bars */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    code: diagnosticResult.taskType === 1 ? 'TA' : 'TR',
                    title: diagnosticResult.taskType === 1 ? 'Task Achievement (TA)' : 'Task Response (TR)',
                    score: diagnosticResult.taScore,
                    summary: diagnosticResult.taSummary,
                    barColor: 'bg-blue-600'
                  },
                  {
                    code: 'CC',
                    title: 'Coherence & Cohesion (CC)',
                    score: diagnosticResult.ccScore,
                    summary: diagnosticResult.ccSummary,
                    barColor: 'bg-amber-500'
                  },
                  {
                    code: 'LR',
                    title: 'Lexical Resource (LR)',
                    score: diagnosticResult.lrScore,
                    summary: diagnosticResult.lrSummary,
                    barColor: 'bg-indigo-600'
                  },
                  {
                    code: 'GRA',
                    title: 'Grammatical Range (GRA)',
                    score: diagnosticResult.graScore,
                    summary: diagnosticResult.graSummary,
                    barColor: 'bg-rose-600'
                  }
                ].map((crit) => (
                  <div
                    key={crit.code}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{crit.title}</span>
                        <span className="text-sm font-black font-mono text-blue-600 dark:text-blue-400">
                          {formatNullableBand(crit.score)} / 9.0
                        </span>
                      </div>
                      {/* Visual Progress Bar (0.0 - 9.0) */}
                      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className={`h-full ${crit.barColor} transition-all duration-500`}
                          style={{
                            width:
                              typeof crit.score === 'number'
                                ? `${Math.min(100, (crit.score / 9) * 100)}%`
                                : '0%'
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{crit.summary}</p>
                  </div>
                ))}
              </div>

              {/* Navigation Switcher: Side-by-Side Band 8.5+ Diff Studio vs Interactive Sentence Inspector */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D3DDDA] dark:border-[#1F8A70]/25 pb-3">
                <div className="flex items-center gap-1 p-1 bg-[#EEF3F1] dark:bg-[#0B1514] rounded-xl border border-[#D3DDDA] dark:border-[#1F8A70]/25">
                  <button
                    onClick={() => setDiagnosticTab('band8_diff')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      diagnosticTab === 'band8_diff'
                        ? 'bg-[#0F4C45] text-white'
                        : 'text-[#566664] dark:text-slate-400 hover:text-[#0E1F1E]'
                    }`}
                  >
                    <SplitSquareVertical className="w-3.5 h-3.5" />
                    <span>1. Side-by-Side Band 8.5+ Diff Studio</span>
                  </button>
                  <button
                    onClick={() => setDiagnosticTab('interactive_review')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      diagnosticTab === 'interactive_review'
                        ? 'bg-[#0F4C45] text-white'
                        : 'text-[#566664] dark:text-slate-400 hover:text-[#0E1F1E]'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>2. Interactive Sentence Inspector</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Apply All Examiner Fixes CTA */}
                  {diagnosticResult.annotations.some((a) => a.category !== 'clean') && (
                    <button
                      onClick={handleApplyAllFixes}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        Apply All Band 8.5 Fixes ({diagnosticResult.annotations.filter((a) => a.category !== 'clean').length})
                      </span>
                    </button>
                  )}

                  {/* Add Common Mistakes to Mistake Vault CTA */}
                  <button
                    onClick={handleSyncToMistakeVault}
                    disabled={vaultSynced}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      vaultSynced
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 text-white shadow-xs'
                    }`}
                  >
                    {vaultSynced ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Synced to Mistake Vault</span>
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-4 h-4" />
                        <span>Add Common Mistakes to Mistake Vault</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* TAB 1: INTERACTIVE SENTENCE-BY-SENTENCE REVIEW & BILINGUAL EXPLANATION DRAWER */}
              {diagnosticTab === 'interactive_review' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left 7 Cols: Annotated Candidate Essay with Color-Coded Highlights */}
                  <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-bold uppercase font-mono text-slate-500">
                        Click Any Highlighted Sentence to Open Examiner Breakdown
                      </span>
                      <div className="flex items-center gap-3 text-[11px] font-semibold">
                        <span className="flex items-center gap-1 text-rose-700 dark:text-rose-400">
                          <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" /> Red: Grammar (GRA)
                        </span>
                        <span className="flex items-center gap-1 text-blue-700 dark:text-blue-400">
                          <span className="w-2.5 h-2.5 rounded-xs bg-blue-500 inline-block" /> Blue: Vocabulary (LR)
                        </span>
                        <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                          <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" /> Amber: Cohesion (CC)
                        </span>
                      </div>
                    </div>

                    <div className="leading-relaxed text-sm sm:text-base font-serif space-x-1.5 space-y-2">
                      {diagnosticResult.annotations.map((ann) => {
                        const isSelected = activeAnnotation?.id === ann.id;
                        if (ann.category === 'clean') {
                          return (
                            <span
                              key={ann.id}
                              onClick={() => setSelectedAnnotationId(ann.id)}
                              className="inline leading-loose text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded px-1 py-0.5 cursor-pointer transition"
                            >
                              {ann.sentence}{' '}
                            </span>
                          );
                        }

                        const highlightStyles =
                          ann.category === 'grammar'
                            ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-950 dark:text-rose-200 border-b-2 border-rose-500'
                            : ann.category === 'lexical'
                            ? 'bg-blue-500/15 hover:bg-blue-500/25 text-blue-950 dark:text-blue-200 border-b-2 border-blue-500'
                            : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-amber-200 border-b-2 border-amber-500';

                        return (
                          <span
                            key={ann.id}
                            onClick={() => {
                              setSelectedAnnotationId(ann.id);
                              soundManager.playBeep(580, 0.02);
                            }}
                            className={`inline leading-loose rounded-md px-1.5 py-0.5 cursor-pointer transition font-medium ${highlightStyles} ${
                              isSelected ? 'ring-2 ring-slate-900 dark:ring-white font-bold' : ''
                            }`}
                          >
                            {ann.sentence}{' '}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right 5 Cols: Interactive Sentence Explanation Drawer with [🇬🇧 English | 🇧🇩 বাংলা] Toggle */}
                  <div className="lg:col-span-5 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-md space-y-4 sticky top-0">
                    {activeAnnotation && activeAnnotation.category !== 'clean' ? (
                      <>
                        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-700">
                          <div>
                            <div
                              className={`text-[11px] font-mono font-bold uppercase ${
                                activeAnnotation.category === 'grammar'
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : activeAnnotation.category === 'lexical'
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-amber-600 dark:text-amber-400'
                              }`}
                            >
                              {activeAnnotation.category === 'grammar'
                                ? 'GRAMMATICAL RANGE & ACCURACY (RED)'
                                : activeAnnotation.category === 'lexical'
                                ? 'LEXICAL RESOURCE COLLOCATION (BLUE)'
                                : 'COHERENCE & COHESION LINKER (AMBER)'}
                            </div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                              {activeAnnotation.errorTitle}
                            </h4>
                          </div>

                          {/* Bilingual Toggle [🇬🇧 English | 🇧🇩 বাংলা] */}
                          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shrink-0">
                            <button
                              onClick={() => setRationaleLang('en')}
                              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                                rationaleLang === 'en'
                                  ? 'bg-slate-900 dark:bg-blue-600 text-white'
                                  : 'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              🇬🇧 English
                            </button>
                            <button
                              onClick={() => setRationaleLang('bn')}
                              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                                rationaleLang === 'bn'
                                  ? 'bg-emerald-700 text-white'
                                  : 'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              🇧🇩 বাংলা
                            </button>
                          </div>
                        </div>

                        {/* Error Identified */}
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-mono font-bold uppercase text-slate-400">
                            1. Error Identified in Your Sentence:
                          </div>
                          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-900 dark:text-rose-200">
                            <div className="font-bold mb-1">{activeAnnotation.identifiedIssue}</div>
                            <div className="italic opacity-90">&ldquo;{activeAnnotation.sentence}&rdquo;</div>
                          </div>
                        </div>

                        {/* Suggested Band 8+ Correction */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[11px] font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400">
                              2. Suggested Band 8.5 Correction:
                            </div>
                            <button
                              onClick={() => handleApplySingleFix(activeAnnotation)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <Check className="w-3 h-3" />
                              <span>Apply Fix to Essay</span>
                            </button>
                          </div>
                          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold text-emerald-950 dark:text-emerald-200">
                            &ldquo;{activeAnnotation.suggestedCorrection}&rdquo;
                          </div>
                        </div>

                        {/* Examiner Rationale (English / বাংলা) */}
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-mono font-bold uppercase text-blue-600 dark:text-blue-400">
                            3. Examiner Rationale ({rationaleLang === 'en' ? 'English Breakdown' : 'বাংলা ব্যাখ্যা'}):
                          </div>
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs leading-relaxed text-slate-700 dark:text-slate-200">
                            {rationaleLang === 'bn'
                              ? activeAnnotation.rationaleBn
                              : activeAnnotation.rationaleEn}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2 py-6 text-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          Well-Constructed Academic Sentence
                        </h4>
                        <p className="text-xs text-slate-500">
                          Click any Red (Grammar), Blue (Vocabulary), or Amber (Cohesion) sentence on the left to inspect its bilingual error breakdown.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: SIDE-BY-SIDE BAND 8.5+ DIFF & INLINE CORRECTIONS STUDIO */}
              {diagnosticTab === 'band8_diff' && (
                <WritingBandDiffStudio
                  diagnosticResult={diagnosticResult}
                  examFormat={examFormat}
                  testTitle={currentSet.title}
                  onApplySingleFix={handleApplySingleFix}
                  onApplyAllFixes={handleApplyAllFixes}
                  onShowToast={onShowToast}
                  onRunGeminiDeepEvaluation={handleRunGeminiDeepEvaluation}
                  isRunningGeminiEval={isRunningGeminiEval}
                  geminiEvalError={geminiEvalError}
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                onClick={handleSyncToMistakeVault}
                disabled={vaultSynced}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  vaultSynced
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-900 dark:bg-slate-800 hover:bg-slate-700 text-white'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>
                  {vaultSynced
                    ? 'Mistakes Saved to Mistake Vault'
                    : 'Add Common Mistakes to Mistake Vault'}
                </span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDiagnosticResult(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Continue Editing Essay
                </button>
                <button
                  onClick={() => {
                    setDiagnosticResult(null);
                    onExit();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Save &amp; Return to Dashboard
                </button>
              </div>
            </div>
          </div>
          )}
        </div>
      )}

      {/* ================= 4. CLEAR CONFIRMATION MODAL (UNDO-PROTECTED) ================= */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Clear Task {activeTask} Editor?</h3>
                <p className="text-xs text-slate-500 font-mono">
                  {currentWordCount} words written currently
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to clear this sheet? Don't worry — an <strong>Undo Clear</strong> button will remain available in the toolbar so you can restore your writing at any time.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowClearConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Keep Writing
              </button>
              <button
                onClick={handleConfirmClear}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <span>Yes, Clear Text</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 5. EXAM SUBMISSION REVIEW MODAL ================= */}
      {showSubmitConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-5 bg-[#0F4C45] text-white border-b border-[#0B3833] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#F4A62A]/20 border border-[#F4A62A]/40 flex items-center justify-center text-[#F4A62A] shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#F4A62A] font-bold block">
                    CD-IELTS Submission Review
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    Submit {examFormat} Writing Exam
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setShowSubmitConfirmModal(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Candidate & Word Count Verification */}
            <div className="p-6 space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">Candidate</span>
                  <strong className="text-slate-900 dark:text-white font-bold">{candidateName}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">Format</span>
                  <strong className="text-blue-600 dark:text-blue-400 font-mono font-bold">{examFormat}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">Time Left</span>
                  <strong className="text-slate-900 dark:text-white font-mono font-bold">
                    {Math.floor(timeRemainingSec / 60)}:{(timeRemainingSec % 60).toString().padStart(2, '0')}
                  </strong>
                </div>
              </div>

              {/* Task Breakdown Cards */}
              <div className="space-y-3">
                {/* Task 1 Card */}
                <div
                  onClick={() => setEvaluatingTask(1)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    evaluatingTask === 1
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-600/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={evaluatingTask === 1}
                        onChange={() => setEvaluatingTask(1)}
                        className="cursor-pointer text-blue-600"
                      />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Task 1 ({examFormat === 'Academic' ? 'Report' : 'Letter'})
                      </span>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                        task1WordCount >= 150
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {task1WordCount} / 150 words
                    </span>
                  </div>
                  {task1WordCount < 150 && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      Under 150 words threshold. Task Achievement penalty applies.
                    </p>
                  )}
                </div>

                {/* Task 2 Card */}
                <div
                  onClick={() => setEvaluatingTask(2)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    evaluatingTask === 2
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-600/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={evaluatingTask === 2}
                        onChange={() => setEvaluatingTask(2)}
                        className="cursor-pointer text-blue-600"
                      />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Task 2 (Discursive Essay)
                      </span>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                        task2WordCount >= 250
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {task2WordCount} / 250 words
                    </span>
                  </div>
                  {task2WordCount < 250 && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      Under 250 words threshold. Task Response penalty applies.
                    </p>
                  )}
                </div>
              </div>

              {/* Official AI Assessment Disclaimer */}
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-blue-500" />
                  <span>AI 4-Criteria Diagnostic Simulation</span>
                </div>
                <p>
                  Evaluation is calculated using IELTS 9-band public descriptors (TA/TR, CC, LR, GRA) for practice and diagnostic feedback. Not an official IELTS certificate.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  onClick={() => setShowSubmitConfirmModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Return to Writing
                </button>
                <button
                  onClick={() => executeEvaluation(evaluatingTask)}
                  className="px-5 py-2.5 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs font-bold shadow-sm cursor-pointer flex items-center gap-2 active:scale-95"
                >
                  <span>Confirm &amp; Evaluate Task {evaluatingTask}</span>
                  <ArrowRight className="w-4 h-4 text-[#F4A62A]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
