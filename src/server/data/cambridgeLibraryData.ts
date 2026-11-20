/**
 * Shikhor — Practice IELTS 11–21 Practice Library Database
 *
 * Provides the IELTS-style practice simulation catalogue for Volumes 11 through 21,
 * populated practice test sets across Listening, Reading, Writing, Speaking,
 * and a validated import pipeline for custom test content JSON.
 */

import {
  CambridgeVolumeCatalogueEntry,
  CambridgeTestSet,
  CambridgeContentImportValidation,
  CambridgeEdition,
  CambridgeVolumeNumber,
  CambridgeTestNumber,
  CambridgeQuestionItem
} from '../types/cambridgeLibrary';
import { getOrCreatePracticeTest, CAMBRIDGE_18_ACADEMIC_TEST_1_LISTENING } from './cambridgeTestGenerator';
import { audioManager } from '../services/AudioManager';
import { isListeningAnswerCorrect } from '../utils/listeningAnswerEvaluator';

// ============================================================================
// 1. VOLUMES 11–21 SIMULATION CATALOGUE
// ============================================================================

export const CAMBRIDGE_VOLUMES_CATALOGUE: CambridgeVolumeCatalogueEntry[] = [
  {
    volume: 21,
    title: 'Practice IELTS 21',
    publicationYear: 2026,
    availableEditions: ['Academic', 'General Training'],
    coverColor: 'from-amber-600 to-yellow-800',
    accentColor: '#F59E0B',
    difficultyRating: 'Band 6.5 – 9.0 (Contemporary)',
    testsCount: 4,
    description: 'Contemporary IELTS-style practice compilation featuring sociolinguistic listening dialogues, scientific research readings, and Task 1 visual infographics.',
    verifiedTests: {
      Academic: [1, 2, 3, 4],
      'General Training': [1, 2, 3, 4]
    }
  },
  {
    volume: 20,
    title: 'Practice IELTS 20',
    publicationYear: 2025,
    availableEditions: ['Academic', 'General Training'],
    coverColor: 'from-violet-600 to-purple-800',
    accentColor: '#8B5CF6',
    difficultyRating: 'Band 6.5 – 9.0',
    testsCount: 4,
    description: 'Includes academic simulation passages on artificial intelligence ethics, climate migration, and marine biodiversity conservation.',
    verifiedTests: {
      Academic: [1, 2, 3, 4],
      'General Training': [1, 2, 3, 4]
    }
  },
  {
    volume: 19,
    title: 'Practice IELTS 19',
    publicationYear: 2024,
    availableEditions: ['Academic', 'General Training'],
    coverColor: 'from-emerald-600 to-teal-800',
    accentColor: '#10B981',
    difficultyRating: 'Band 6.0 – 9.0',
    testsCount: 4,
    description: 'High-yield IELTS-style practice simulations reflecting standard computer-delivered exam formatting and multi-section question types.',
    verifiedTests: {
      Academic: [1, 2, 3, 4],
      'General Training': [1, 2, 3, 4]
    }
  },
  {
    volume: 18,
    title: 'Practice IELTS 18',
    publicationYear: 2023,
    availableEditions: ['Academic', 'General Training'],
    coverColor: 'from-blue-600 to-indigo-800',
    accentColor: '#2563EB',
    difficultyRating: 'Band 6.0 – 9.0',
    testsCount: 4,
    description: 'Comprehensive IELTS-style simulation volume with multi-accent audio scripts, full 40-question academic reading passages, and structured writing tasks.',
    verifiedTests: {
      Academic: [1, 2, 3, 4],
      'General Training': [1, 2, 3, 4]
    }
  },
  {
    volume: 17,
    title: 'Practice IELTS 17',
    publicationYear: 2022,
    availableEditions: ['Academic', 'General Training'],
    coverColor: 'from-red-600 to-rose-800',
    accentColor: '#E11D48',
    difficultyRating: 'Band 6.0 – 8.5',
    testsCount: 4,
    description: 'Comprehensive test sets featuring urban planning listening scenarios, neurobiology reading texts, and balanced Task 2 argumentative writing essays.',
    verifiedTests: {
      Academic: [1, 2, 3, 4],
      'General Training': [1, 2, 3, 4]
    }
  },
  {
    volume: 16,
    title: 'Practice IELTS 16',
    publicationYear: 2021,
    availableEditions: ['Academic', 'General Training'],
    coverColor: 'from-cyan-600 to-blue-800',
    accentColor: '#06B6D4',
    difficultyRating: 'Band 6.0 – 8.5',
    testsCount: 4,
    description: 'Essential practice volume incorporating post-pandemic test formats, university accommodation dialogues, and archaeology research papers.',
    verifiedTests: {
      Academic: [1, 2, 3, 4],
      'General Training': [1, 2, 3, 4]
    }
  },
  {
    volume: 15,
    title: 'Practice IELTS 15',
    publicationYear: 2020,
    availableEditions: ['Academic', 'General Training'],
    coverColor: 'from-teal-600 to-emerald-900',
    accentColor: '#0D9488',
    difficultyRating: 'Band 6.0 – 8.5',
    testsCount: 4,
    description: 'Classic Practice test compilation focusing on community services, renewable geothermal energy, and environmental biology.',
    verifiedTests: {
      Academic: [1, 2, 3, 4],
      'General Training': [1, 2, 3, 4]
    }
  },
  {
    volume: 14,
    title: 'Practice IELTS 14',
    publicationYear: 2019,
    availableEditions: ['Academic', 'General Training'],
    coverColor: 'from-orange-600 to-amber-800',
    accentColor: '#EA580C',
    difficultyRating: 'Band 5.5 – 8.5',
    testsCount: 4,
    description: 'Foundational 4-skill testing series with high frequency Academic Vocabulary List (AVL) coverage and structured speaking cue cards.',
    verifiedTests: {
      Academic: [1, 2, 3, 4],
      'General Training': [1, 2, 3, 4]
    }
  },
  {
    volume: 13,
    title: 'Practice IELTS 13',
    publicationYear: 2018,
    availableEditions: ['Academic', 'General Training'],
    coverColor: 'from-slate-700 to-slate-900',
    accentColor: '#475569',
    difficultyRating: 'Band 5.5 – 8.5',
    testsCount: 4,
    description: 'Rigorous academic reading passages on cognitive psychology, aviation safety, and global urbanization trends.',
    verifiedTests: {
      Academic: [1, 2, 3, 4],
      'General Training': [1, 2, 3, 4]
    }
  },
  {
    volume: 12,
    title: 'Practice IELTS 12',
    publicationYear: 2017,
    availableEditions: ['Academic', 'General Training'],
    coverColor: 'from-indigo-700 to-blue-950',
    accentColor: '#4338CA',
    difficultyRating: 'Band 5.5 – 8.0',
    testsCount: 4,
    description: 'Historical Practice edition featuring traditional British RP speakers, heritage conservation readings, and civic policy discussions.',
    verifiedTests: {
      Academic: [1, 2, 3, 4],
      'General Training': [1, 2, 3, 4]
    }
  },
  {
    volume: 11,
    title: 'Practice IELTS 11',
    publicationYear: 2016,
    availableEditions: ['Academic', 'General Training'],
    coverColor: 'from-zinc-700 to-slate-900',
    accentColor: '#52525B',
    difficultyRating: 'Band 5.5 – 8.0',
    testsCount: 4,
    description: 'The inaugural modern volume establishing the separate Academic and General Training 4-test annual publication standard.',
    verifiedTests: {
      Academic: [1, 2, 3, 4],
      'General Training': [1, 2, 3, 4]
    }
  }
];

// ============================================================================
// 2. POPULATED PRACTICE TEST SETS
// ============================================================================

export const NON_AFFILIATION_SIMULATION_NOTICE =
  'Original IELTS-style practice simulation created for Shikhor. Automated structural and rule-based evidence checks do not constitute human examiner validation or official Practice University Press, Coach, or IDP calibration.';

export interface PracticeCatalogueTestItem {
  id: string;
  volume: CambridgeVolumeNumber;
  edition: CambridgeEdition;
  testNumber: CambridgeTestNumber;
  title: string;
  provenance: 'ai_simulation' | 'curated_practice';
  humanReviewStatus: 'unverified_ai_simulation' | 'human_reviewed';
  nonAffiliationNotice: string;
}

export const CAMBRIDGE_COMPLETE_CATALOGUE: PracticeCatalogueTestItem[] = (() => {
  const items: PracticeCatalogueTestItem[] = [];
  for (let volume = 21; volume >= 11; volume--) {
    for (const edition of ['Academic', 'General Training'] as const) {
      for (let testNumber = 1; testNumber <= 4; testNumber++) {
        const slug = edition.toLowerCase().replace(/\s+/g, '-');
        items.push({
          id: `practice-${volume}-${slug}-test-${testNumber}`,
          volume: volume as CambridgeVolumeNumber,
          edition,
          testNumber: testNumber as CambridgeTestNumber,
          title: `Practice ${volume} · ${edition} Test ${testNumber}`,
          provenance: 'ai_simulation',
          humanReviewStatus: 'unverified_ai_simulation',
          nonAffiliationNotice: NON_AFFILIATION_SIMULATION_NOTICE
        });
      }
    }
  }
  return items;
})();

export const INITIAL_CAMBRIDGE_TESTS: CambridgeTestSet[] = [
  // --------------------------------------------------------------------------
  // Practice Set 18 · ACADEMIC TEST 1
  // --------------------------------------------------------------------------
  {
    id: 'practice-18-academic-test-1',
    volume: 18,
    edition: 'Academic',
    testNumber: 1,
    title: 'Practice Set 18 · Academic Test 1',
    description: 'Full 4-skill IELTS-style Academic practice simulation: university admissions interview, biodiversity passage, and economic impact essay.',
    provenance: 'original_practice',
    provenanceNote: NON_AFFILIATION_SIMULATION_NOTICE,
    version: 1,
    updatedAt: 1711200000000,
    availableModules: ['listening', 'reading', 'writing', 'speaking'],
    listening: CAMBRIDGE_18_ACADEMIC_TEST_1_LISTENING,
    reading: {
      title: 'Academic Reading: Neural Plasticity & Urban Biodiversity',
      passages: [
        {
          passageNumber: 1,
          title: 'Passage 1: The Neurobiology of Bilingualism & Cognitive Reserve',
          subheading: 'How lifelong second-language acquisition shields the brain against degenerative neuropathology.',
          text: `[A] In an increasingly interconnected global economy, the acquisition of multiple spoken languages has shifted from a rarefied intellectual accomplishment to an everyday necessity. Beyond obvious communicative utility, modern cognitive neuroscience has uncovered profound structural adaptations inside the multilingual brain. For decades, traditional pedagogical theory hypothesized that juggling two linguistic codes resulted in communicative interference among juveniles. However, modern neuroimaging has dismantled this deficit model.\n\n[B] The most startling breakthrough concerns "Cognitive Reserve"—the brain’s resilience against neurological damage. In clinical trials involving Alzheimer's patients, bilingual speakers consistently demonstrated a 4-to-5-year delay in the onset of clinical symptoms compared to socioeconomically matched monolinguals. Although physical amyloid plaques were equally prevalent on brain scans, the bilingual brain had constructed alternative neural pathways, maintaining functional cognitive lucidity despite structural deterioration.\n\n[C] Why does this neurological fortification occur? Neuroimaging demonstrates both linguistic systems remain permanently active, necessitating continuous subconscious inhibitory control. When an English-French bilingual utters a word, both lexicons fire simultaneously. The brain's executive control network must relentlessly suppress the competing language while elevating the target utterance. This uninterrupted mental gymnastics operates like high-intensity interval training for synaptic connections, strengthening executive functioning and conflict resolution.`,
          questions: [
            {
              id: 'c18-a-t1-r-q1',
              questionNumber: 1,
              partOrSection: 1,
              type: 'true_false_not_given',
              prompt: 'Bilingual Alzheimer’s patients exhibit significantly fewer physical amyloid plaques than monolinguals.',
              options: ['TRUE', 'FALSE', 'NOT GIVEN'],
              correctAnswer: 'FALSE',
              acceptableAnswers: ['FALSE', 'False'],
              explanation: 'Paragraph B explicitly states that physical amyloid plaques were equally prevalent on brain scans between both groups.',
              locationReference: 'Paragraph B'
            },
            {
              id: 'c18-a-t1-r-q2',
              questionNumber: 2,
              partOrSection: 1,
              type: 'true_false_not_given',
              prompt: 'The onset of observable Alzheimer’s symptoms is typically delayed by 4 to 5 years in bilingual speakers.',
              options: ['TRUE', 'FALSE', 'NOT GIVEN'],
              correctAnswer: 'TRUE',
              acceptableAnswers: ['TRUE', 'True'],
              explanation: 'Paragraph B confirms: "bilingual speakers consistently demonstrated a 4-to-5-year delay in the onset of clinical symptoms".',
              locationReference: 'Paragraph B'
            },
            {
              id: 'c18-a-t1-r-q3',
              questionNumber: 3,
              partOrSection: 1,
              type: 'multiple_choice',
              prompt: 'According to Paragraph C, why does multilingualism fortify the brain?',
              options: [
                'A) Multilinguals spend more hours reading complex literature',
                'B) Both language lexicons remain active, demanding continuous executive suppression',
                'C) Early language acquisition prevents synaptic pruning'
              ],
              correctAnswer: 'B',
              acceptableAnswers: ['B'],
              explanation: 'Paragraph C states that both linguistic systems remain permanently active, necessitating continuous subconscious inhibitory control.',
              locationReference: 'Paragraph C'
            }
          ]
        },
        {
          passageNumber: 2,
          title: 'Passage 2: The Cryogenic Energy Storage Revolution',
          subheading: 'Liquefied air technology offers utility-scale, non-toxic grid balancing.',
          text: `[A] The global transition toward intermittent renewable energy sources—principally offshore wind turbine clusters and photovoltaic arrays—has precipitated an acute grid-balancing dilemma. Unlike fossil-fueled thermal power stations, solar and wind yields fluctuate wildly. Consequently, energy engineers recognize that the true bottlenecks to decarbonization are not energy harvesting mechanisms, but rather long-duration utility-scale energy storage infrastructures.\n\n[B] Liquid Air Energy Storage (LAES)—also termed Cryogenic Energy Storage—has emerged as a preeminent grid-scale candidate. During periods of surplus renewable generation, ambient air is chilled to -196°C, condensing into a dense liquid stored in insulated cryogenic tanks. When electricity demand surges during evening peak hours, the liquefied air is pumped to high pressure, heated via industrial waste heat, and transformed back into high-velocity gas. This dramatic 700-fold expansion drives multi-stage expansion turbines, regenerating electricity with a round-trip efficiency approaching 75%.`,
          questions: [
            {
              id: 'c18-a-t1-r-q4',
              questionNumber: 4,
              partOrSection: 2,
              type: 'true_false_not_given',
              prompt: 'Cryogenic storage systems rely heavily on scarce lithium and cobalt reserves.',
              options: ['TRUE', 'FALSE', 'NOT GIVEN'],
              correctAnswer: 'FALSE',
              acceptableAnswers: ['FALSE', 'False'],
              explanation: 'Paragraph B notes that cryogenic systems use ambient air and steel vessels without requiring rare minerals or chemical lithium cells.',
              locationReference: 'Paragraph B'
            }
          ]
        },
        {
          passageNumber: 3,
          title: 'Passage 3: The Architecture of Urban Microclimates',
          subheading: 'Countering urban heat islands through reflective albedo and vertical biophilic canopies.',
          text: `[A] As urbanization accelerates, metropolitan centers generate localized thermal anomalies designated as Urban Heat Islands (UHIs). Dense concentrations of dark asphalt and thermal concrete absorb shortwave solar radiation during daylight hours, reradiating thermal heat throughout the nocturnal cycle.\n\n[B] Modern bioclimatic architects counter UHIs through cool-roof high-albedo coatings and vegetative green walls that cool ambient air through evapotranspiration.`,
          questions: [
            {
              id: 'c18-a-t1-r-q5',
              questionNumber: 5,
              partOrSection: 3,
              type: 'multiple_choice',
              prompt: 'The primary mechanism by which green vegetative walls cool urban air is:',
              options: [
                'A) Mechanical wind turbulence',
                'B) Evapotranspiration',
                'C) Subterranean geothermal conduction'
              ],
              correctAnswer: 'B',
              acceptableAnswers: ['B'],
              explanation: 'Paragraph B states that vegetative green walls cool ambient air through evapotranspiration.',
              locationReference: 'Paragraph B'
            }
          ]
        }
      ]
    },
    writing: {
      task1: {
        type: 'Academic Chart / Graph',
        prompt: 'The chart below shows the percentage of households with access to high-speed broadband internet in five different European nations between 2010 and 2024. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
        minimumWords: 150,
        chartDescription: 'Five European nations (UK, Germany, France, Sweden, Spain). Sweden leads throughout, rising from 72% in 2010 to 98% in 2024. Spain records the steepest increase, rising from 44% in 2010 to 94% in 2024.',
        bulletPoints: [
          'Overview: all five nations recorded marked increases across the 14-year timeframe.',
          'Sweden maintained the highest overall proportion throughout.',
          'Spain demonstrated the most dramatic surge, more than doubling its initial connectivity rate.'
        ],
        modelAnswer: 'The line graph delineates the proportion of households equipped with high-speed broadband access across five European countries over a fourteen-year period from 2010 to 2024.\n\nOverall, it is immediately apparent that internet connectivity experienced substantial upward trajectories in every surveyed nation. Sweden consistently retained the premier position throughout the entire timeframe, while Spain registered the most pronounced overall expansion.\n\nIn 2010, Sweden commanded the highest proportion of high-speed connectivity at roughly 72%, followed by the United Kingdom and Germany at 65% and 60% respectively. In stark contrast, Spain and France recorded considerably lower starting figures of approximately 44% and 48%.\n\nOver the subsequent years, connectivity expanded steadily. By 2024, Sweden had reached near-universal access at 98%. Notably, Spain underwent a dramatic surge, closing the initial divide to reach 94% and surpassing both Germany (91%) and France (89%). Consequently, the disparity between the leading and trailing nations narrowed from nearly 30 percentage points in 2010 to less than 10 points by the terminal year.'
      },
      task2: {
        topic: 'Tertiary Education & Gap Years',
        prompt: 'In many countries, an increasing number of young people are choosing to take a gap year between secondary school and university. Do the advantages of this trend outweigh the disadvantages? Give reasons for your answer and include relevant examples from your knowledge or experience.',
        minimumWords: 250,
        modelAnswer: 'In contemporary education, deferring university matriculation for an experiential sabbatical year has transitioned from an elite novelty into a global mainstream phenomenon. While critics cite academic derailment and economic burdens, I contend that the experiential maturity, vocational clarity, and pragmatic independence cultivated during a gap year overwhelmingly eclipse its transient pitfalls.\n\nChief among the arguments against this hiatus is the potential erosion of academic momentum. Students separated from rigorous scholastic regimens frequently experience cognitive inertia, struggling to reintegrate into intensive examinations and peer competition upon arrival at university. Furthermore, unfocused gap years devoid of structured employment or philanthropy risk becoming financially parasitic on parents, deteriorating into unstructured leisure.\n\nNevertheless, the pedagogical and personal dividends of a purposeful sabbatical are profound. Secondary school graduates frequently lack authentic exposure to professional workplace realities, choosing university majors based on superficial prestige rather than genuine aptitude. Engaging in structured internships, voluntary humanitarian service, or independent travel fosters emotional resilience, cultural adaptability, and pragmatic fiscal management. When these seasoned individuals eventually matriculate, their academic diligence is fueled by lucid career objectives rather than adolescent compliance.\n\nIn conclusion, although an unstructured gap year carries risks of procrastination, the advantages of self-discovery, professional clarity, and mature independence far outweigh the temporary pause in formal academic progression.'
      }
    },
    speaking: {
      part1: {
        topic: 'Hometown & Daily Routine',
        questions: [
          {
            question: 'Can you tell me about the town or city where you grew up?',
            suggestedIdeas: ['Location & geography', 'Historical landmarks', 'Atmosphere & neighborhood vibe']
          },
          {
            question: 'What do you typically like to do on weekend mornings?',
            suggestedIdeas: ['Recreation vs rest', 'Physical exercise / parks', 'Quiet reading or family meals']
          },
          {
            question: 'Has your daily routine changed much compared to when you were younger?',
            suggestedIdeas: ['Increased responsibility', 'Structured schedule', 'Academic vs leisure focus']
          }
        ]
      },
      part2: {
        cueCardTopic: 'Describe an environmental project or initiative in your community that you found inspiring.',
        bulletPoints: [
          'What the initiative was and who organized it',
          'Where and when it took place',
          'What activities or changes were implemented',
          'And explain why you found this project particularly inspiring'
        ],
        followUpQuestion: 'Do you believe local initiatives are more effective than government environmental policies?'
      },
      part3: {
        theme: 'Environmental Stewardship & Global Responsibility',
        questions: [
          {
            question: 'To what extent should individuals be held financially responsible for recycling and waste generation?'
          },
          {
            question: 'How can educational institutions effectively instill long-term ecological awareness in young learners?'
          },
          {
            question: 'Why do international treaties on climate change often face difficulties during domestic implementation?'
          }
        ]
      }
    }
  },

  // --------------------------------------------------------------------------
  // Practice Set 17 · ACADEMIC TEST 1
  // --------------------------------------------------------------------------
  {
    id: 'practice-17-academic-test-1',
    volume: 17,
    edition: 'Academic',
    testNumber: 1,
    title: 'Practice Set 17 · Academic Test 1',
    description: 'IELTS-style Academic practice simulation: autonomous logistics inspection, thermodynamics of renewable energy storage, and secondary education curricula.',
    provenance: 'original_practice',
    provenanceNote: NON_AFFILIATION_SIMULATION_NOTICE,
    version: 1,
    updatedAt: 1711200000000,
    availableModules: ['listening', 'reading', 'writing', 'speaking'],
    listening: {
      title: 'Municipal Autonomous Fleet Logistics & Charging Depot',
      contextDescription: 'Technical engineering inspection between a municipal planner (Davies) and electrical contractor (Callum).',
      parts: [
        {
          partNumber: 1,
          title: 'Part 1: Substation Inspection & Battery Safety',
          description: 'Callum Trevithick confirms rapid transit hub specifications and battery chemistry selection.',
          audioScript: 'Good morning, North Midlands Municipal Transport and Fleet Logistics Depot. Engineer Davies speaking.',
          dialogue: [
            { speaker: 'Engineer Davies', speakerId: 'speaker_04', text: 'Good morning, North Midlands Municipal Transport and Fleet Logistics Depot. Engineer Davies speaking.', pauseAfterMs: 400 },
            { speaker: 'Callum', speakerId: 'speaker_08', text: 'Good morning, Engineer Davies. My surname is Trevithick: T-R-E-V-I-T-H-I-C-K.', pauseAfterMs: 450 },
            { speaker: 'Engineer Davies', speakerId: 'speaker_04', text: 'And what is your active direct radio telephone contact number?', pauseAfterMs: 400 },
            { speaker: 'Callum', speakerId: 'speaker_08', text: 'My active direct site number is 07822 550443.', pauseAfterMs: 450 },
            { speaker: 'Engineer Davies', speakerId: 'speaker_04', text: 'Which battery technology was finalized for thermal stability?', pauseAfterMs: 400 },
            { speaker: 'Callum', speakerId: 'speaker_08', text: 'We finalized the Sodium Solid-State cells due to their exceptional high temperature stability.', pauseAfterMs: 450 }
          ],
          questions: [
            {
              id: 'c17-a-t1-l-q1',
              questionNumber: 1,
              partOrSection: 1,
              type: 'note_completion',
              prompt: 'Lead Contractor Surname (spelled letter-by-letter):',
              correctAnswer: 'TREVITHICK',
              acceptableAnswers: ['Trevithick', 'TREVITHICK'],
              explanation: 'Callum spells his surname: T-R-E-V-I-T-H-I-C-K.',
              wordLimit: 1
            },
            {
              id: 'c17-a-t1-l-q2',
              questionNumber: 2,
              partOrSection: 1,
              type: 'note_completion',
              prompt: 'Active Direct Site Telephone Number:',
              correctAnswer: '07822550443',
              acceptableAnswers: ['07822 550443', '07822550443'],
              explanation: 'Callum corrects from an old number to active number: 07822 550443.',
              wordLimit: 2
            },
            {
              id: 'c17-a-t1-l-q3',
              questionNumber: 3,
              partOrSection: 1,
              type: 'multiple_choice',
              prompt: 'Which battery technology was selected for thermal safety?',
              options: [
                'A) Lithium Iron Phosphate',
                'B) Sodium Solid-State Cells',
                'C) Nickel Cadmium'
              ],
              correctAnswer: 'B',
              acceptableAnswers: ['B', 'B) Sodium Solid-State Cells', 'Sodium Solid-State Cells'],
              explanation: 'The contractor confirms selecting Sodium Solid-State cells for high temperature stability.'
            }
          ]
        }
      ]
    },
    reading: {
      title: 'Academic Reading: Cryogenic Energy Storage & Bioclimatic Architecture',
      passages: [
        {
          passageNumber: 1,
          title: 'Passage 1: Thermodynamic Optimization in Industrial Cryogenics',
          text: 'Industrial compressors liquefy ambient air at -196°C to store potential energy during off-peak hours.',
          questions: [
            {
              id: 'c17-a-t1-r-q1',
              questionNumber: 1,
              partOrSection: 1,
              type: 'true_false_not_given',
              prompt: 'Ambient air transitions to a liquid state when refrigerated to -196°C.',
              options: ['TRUE', 'FALSE', 'NOT GIVEN'],
              correctAnswer: 'TRUE',
              acceptableAnswers: ['TRUE', 'True'],
              explanation: 'Passage confirms that air condenses into a liquid state at -196°C.'
            }
          ]
        }
      ]
    },
    writing: {
      task1: {
        type: 'Academic Chart / Graph',
        prompt: 'The table below illustrates renewable electricity output (in Terawatt-hours) across five nations in 2023. Summarise the main trends and highlight anomalies.',
        minimumWords: 150
      },
      task2: {
        topic: 'Physical Education vs Core Academic Subjects',
        prompt: 'In many modern societies, physical education classes are increasingly being replaced by academic subjects in secondary schools. Do you think this is a positive or negative development? (Minimum 250 words)',
        minimumWords: 250
      }
    },
    speaking: {
      part1: {
        topic: 'Technology in Daily Life',
        questions: [
          { question: 'What modern electronic device do you find most indispensable each day?' },
          { question: 'Do you prefer learning new skills online or through face-to-face instruction?' }
        ]
      },
      part2: {
        cueCardTopic: 'Describe a significant technological breakthrough that has changed your lifestyle.',
        bulletPoints: [
          'What the technology is',
          'When you first began utilizing it',
          'How it altered your daily productivity',
          'And explain why it had such a substantial impact'
        ]
      },
      part3: {
        theme: 'Automation & Future Employment',
        questions: [
          { question: 'How will automated machine learning algorithms alter traditional office professions in the coming decade?' }
        ]
      }
    }
  },

  // --------------------------------------------------------------------------
  // Practice Set 19 · GENERAL TRAINING TEST 1
  // --------------------------------------------------------------------------
  {
    id: 'practice-19-general-training-test-1',
    volume: 19,
    edition: 'General Training',
    testNumber: 1,
    title: 'Practice Set 19 · General Training Test 1',
    description: 'IELTS-style General Training practice simulation: workplace health and safety notices, employee relocation guidelines, and formal letter of enquiry.',
    provenance: 'original_practice',
    provenanceNote: NON_AFFILIATION_SIMULATION_NOTICE,
    version: 1,
    updatedAt: 1711200000000,
    availableModules: ['listening', 'reading', 'writing', 'speaking'],
    listening: {
      title: 'Community Sports Center Membership Enquiry',
      contextDescription: 'Customer enquiry regarding fitness club membership tiers and pool availability.',
      parts: [
        {
          partNumber: 1,
          title: 'Part 1: Fitness Club Membership Registration',
          description: 'An enquiry regarding family membership tiers and facilities.',
          audioScript: 'Good morning, Riverside Community Health and Fitness Club. How can I assist you?',
          dialogue: [
            { speaker: 'Receptionist (Charlotte)', speakerId: 'speaker_05', text: 'Good morning, Riverside Community Health and Fitness Club. How can I assist you today?', pauseAfterMs: 400 },
            { speaker: 'Caller (Thomas)', speakerId: 'speaker_01', text: 'Hello, I would like to enquire about your Gold Family Membership tier.', pauseAfterMs: 450 }
          ],
          questions: [
            {
              id: 'c19-gt-t1-l-q1',
              questionNumber: 1,
              partOrSection: 1,
              type: 'note_completion',
              prompt: 'Enquired Membership Package Category:',
              correctAnswer: 'Gold Family',
              acceptableAnswers: ['Gold Family', 'gold family'],
              explanation: 'The caller specifies interest in the Gold Family Membership tier.',
              wordLimit: 2
            }
          ]
        }
      ]
    },
    reading: {
      title: 'General Training Reading: Workplace Health & Safety Notices',
      passages: [
        {
          passageNumber: 1,
          title: 'Section 1: Fire Evacuation Protocols in Office Environments',
          text: 'Employees must assemble immediately at Assembly Point B located on the eastern lawn.',
          questions: [
            {
              id: 'c19-gt-t1-r-q1',
              questionNumber: 1,
              partOrSection: 1,
              type: 'true_false_not_given',
              prompt: 'In the event of an alarm, staff should congregate on the northern parking lot.',
              options: ['TRUE', 'FALSE', 'NOT GIVEN'],
              correctAnswer: 'FALSE',
              acceptableAnswers: ['FALSE', 'False'],
              explanation: 'The text states Assembly Point B is on the eastern lawn, not northern parking lot.'
            }
          ]
        }
      ]
    },
    writing: {
      task1: {
        type: 'General Training Letter',
        prompt: 'You recently ordered an electronic device online, but upon delivery you found it was damaged and missing critical accessories. Write a formal letter to the store manager. In your letter: describe the item purchased, explain the defect and missing parts, and state what action you expect the company to take. (Minimum 150 words)',
        minimumWords: 150
      },
      task2: {
        topic: 'Remote Work vs Traditional Office Environments',
        prompt: 'Some people believe that working from home brings more benefits to employees and society than working in traditional offices. To what extent do you agree or disagree? (Minimum 250 words)',
        minimumWords: 250
      }
    },
    speaking: {
      part1: {
        topic: 'Sports & Physical Health',
        questions: [
          { question: 'What sport or physical activity do you enjoy taking part in?' }
        ]
      },
      part2: {
        cueCardTopic: 'Describe a sporting event that you attended in person or watched on television.',
        bulletPoints: [
          'What the event was and where it took place',
          'Who was competing',
          'Why the outcome was memorable',
          'And explain how you felt during the event'
        ]
      },
      part3: {
        theme: 'Commercial Sponsorship in Sports',
        questions: [
          { question: 'Do large commercial sponsorships have an overall positive or negative impact on fair play in sports?' }
        ]
      }
    }
  }
];

// ============================================================================
// 3. PERSISTENT STORAGE & TEST RETRIEVAL HELPERS
// ============================================================================

const CUSTOM_TESTS_STORAGE_KEY = 'ielts_sprint_practice_custom_tests_v1';

export function getRawInitialPracticeTests(): CambridgeTestSet[] {
  return JSON.parse(JSON.stringify(INITIAL_CAMBRIDGE_TESTS));
}

export function hydrateTestSetWithCompleteAudioAndParts(test: CambridgeTestSet): CambridgeTestSet {
  const generated = getOrCreatePracticeTest(test.volume, test.edition, test.testNumber);

  // 1. Hydrate Listening parts so all 4 parts exist, every part has 10 questions (Q1–Q40 total),
  // and every part has a complete multi-speaker dialogue covering all 10 questions while preserving seed questions.
  const hydratedParts = ([1, 2, 3, 4] as const).map((pNum) => {
    const existingPart = test.listening?.parts?.find((p) => p.partNumber === pNum);
    const genPart = generated.listening?.parts?.find((p) => p.partNumber === pNum);
    if (!existingPart) return genPart!;

    const baseOffset = (pNum - 1) * 10;
    const existingQuestions = Array.isArray(existingPart.questions) ? existingPart.questions : [];
    const genQuestions = Array.isArray(genPart?.questions) ? genPart!.questions : [];

    // Ensure exactly 10 questions (baseOffset + 1 .. baseOffset + 10) for this part
    const mergedQuestions = Array.from({ length: 10 }, (_, idx) => {
      const targetQNum = baseOffset + idx + 1;
      const directMatch = existingQuestions.find((q) => q.questionNumber === targetQNum);
      const positionalMatch = !directMatch && idx < existingQuestions.length ? existingQuestions[idx] : null;
      const foundExisting = directMatch || positionalMatch;

      if (foundExisting) {
        const hydratedItem: CambridgeTestSet['listening'] extends { parts: Array<{ questions: Array<infer Q> }> } ? Q & { seedQuestionNumber?: number } : any = {
          ...foundExisting,
          id: foundExisting.id || `${test.id}-l-q${targetQNum}`,
          questionNumber: targetQNum,
          partOrSection: pNum,
          seedQuestionNumber: foundExisting.questionNumber
        };
        return hydratedItem;
      }
      const fallbackGen = genQuestions[idx];
      return {
        ...fallbackGen,
        id: `${test.id}-l-q${targetQNum}`,
        questionNumber: targetQNum,
        partOrSection: pNum
      };
    });

    const normalizedExistingDialogue = Array.isArray(existingPart.dialogue)
      ? existingPart.dialogue.map((d, idx) => ({
          ...d,
          speakerId: d.speakerId || (idx % 2 === 0 ? 'speaker_04' : 'speaker_05'),
          gender:
            d.gender ||
            (d.speakerId === 'speaker_05' || d.speakerId === 'speaker_02'
              ? ('female' as const)
              : ('male' as const)),
          pauseAfterMs: d.pauseAfterMs || 450
        }))
      : [];

    const normalizedGenDialogue = Array.isArray(genPart?.dialogue)
      ? genPart!.dialogue!.map((d, idx) => ({
          ...d,
          speakerId: d.speakerId || (idx % 2 === 0 ? 'speaker_04' : 'speaker_05'),
          gender:
            d.gender ||
            (d.speakerId === 'speaker_05' || d.speakerId === 'speaker_02'
              ? ('female' as const)
              : ('male' as const)),
          pauseAfterMs: d.pauseAfterMs || 450
        }))
      : [];

    // Preserve any seed audioScript when existingPart has no dialogue array (never injecting question explanations into the script),
    // then append genPart's dialogue turns so hydrated questions have multi-speaker audio.
    let dialogue = normalizedExistingDialogue;
    if (normalizedExistingDialogue.length < 2) {
      const seedScriptLines: typeof normalizedGenDialogue = [];
      if (existingPart.audioScript && existingPart.audioScript.trim()) {
        seedScriptLines.push({
          speaker: pNum === 2 ? 'Guide (Charlotte)' : pNum === 3 ? 'Dr. Sterling' : 'Prof. Evans',
          speakerId: pNum === 2 ? 'speaker_05' : pNum === 3 ? 'speaker_03' : 'speaker_04',
          gender: pNum === 2 ? ('female' as const) : ('male' as const),
          text: existingPart.audioScript.trim(),
          pauseAfterMs: 450
        });
      }
      dialogue =
        normalizedGenDialogue.length > 0
          ? [...seedScriptLines, ...normalizedGenDialogue]
          : seedScriptLines;
    } else if (existingQuestions.length < 10 && normalizedGenDialogue.length > 0) {
      const existingTexts = new Set(normalizedExistingDialogue.map((d) => d.text.trim()));
      const extraLines = normalizedGenDialogue.filter((d) => !existingTexts.has(d.text.trim()));
      dialogue = [...normalizedExistingDialogue, ...extraLines];
    }

    const combinedAudioScript = dialogue.map((d) => `${d.speaker}: "${d.text}"`).join('\n');
    const existingScriptLength = existingPart.audioScript ? existingPart.audioScript.trim().length : 0;
    const combinedScriptLength = combinedAudioScript ? combinedAudioScript.trim().length : 0;
    const finalAudioScript = existingScriptLength >= combinedScriptLength ? existingPart.audioScript : (combinedAudioScript || existingPart.audioScript);

    return {
      ...existingPart,
      audioScript: finalAudioScript,
      dialogue,
      questions: mergedQuestions
    };
  });

  // 2. Hydrate Reading passages so all 3 passages exist:
  //    Passage 1: Q1–Q13 (13 questions, partOrSection: 1)
  //    Passage 2: Q14–Q26 (13 questions, partOrSection: 2)
  //    Passage 3: Q27–Q40 (14 questions, partOrSection: 3)
  //    Preserves every seed question's id, prompt, options, correctAnswer, acceptableAnswers, explanation, and locationReference,
  //    while aligning questionNumber to the passage's canonical range (1..13, 14..26, 27..40) required by PracticeLibraryPage.jumpToQuestion.
  const passageConfigs: Array<{ passageNumber: 1 | 2 | 3; baseOffset: number; count: number }> = [
    { passageNumber: 1, baseOffset: 0, count: 13 },
    { passageNumber: 2, baseOffset: 13, count: 13 },
    { passageNumber: 3, baseOffset: 26, count: 14 }
  ];

  const hydratedPassages = passageConfigs.map(({ passageNumber, baseOffset, count }) => {
    const existingPassage = test.reading?.passages?.find((p) => p.passageNumber === passageNumber);
    const genPassage = generated.reading?.passages?.find((p) => p.passageNumber === passageNumber);

    if (!existingPassage && genPassage) {
      return {
        ...genPassage,
        questions: genPassage.questions.map((q, idx) => {
          const targetQNum = baseOffset + idx + 1;
          return {
            ...q,
            id: q.id || `${test.id}-r-q${targetQNum}`,
            questionNumber: targetQNum,
            partOrSection: passageNumber
          };
        })
      };
    }

    const existingQuestions = Array.isArray(existingPassage?.questions) ? existingPassage!.questions : [];
    const genQuestions = Array.isArray(genPassage?.questions) ? genPassage!.questions : [];

    const mergedReadingQuestions = Array.from({ length: count }, (_, idx) => {
      const targetQNum = baseOffset + idx + 1;
      const directMatch = existingQuestions.find((q) => q.questionNumber === targetQNum);
      const positionalMatch = !directMatch && idx < existingQuestions.length ? existingQuestions[idx] : null;
      const foundExisting = directMatch || positionalMatch;

      if (foundExisting) {
        return {
          ...foundExisting,
          id: foundExisting.id || `${test.id}-r-q${targetQNum}`,
          questionNumber: targetQNum,
          partOrSection: passageNumber,
          seedQuestionNumber: foundExisting.questionNumber
        };
      }

      const fallbackGen = genQuestions[idx];
      return {
        ...fallbackGen,
        id: `${test.id}-r-q${targetQNum}`,
        questionNumber: targetQNum,
        partOrSection: passageNumber
      };
    });

    // Preserve original seed passage text intact at the start, and append generated passage paragraphs
    // when additional questions are hydrated into the passage so all 13/14 questions have passage evidence.
    const existingText = existingPassage?.text?.trim() || '';
    const genText = genPassage?.text?.trim() || '';
    const combinedPassageText =
      existingQuestions.length < count && existingText && genText && !existingText.includes(genText)
        ? `${existingText}\n\n${genText}`
        : existingText || genText;

    return {
      passageNumber,
      title: existingPassage?.title || genPassage?.title || `Passage ${passageNumber}`,
      subheading: existingPassage?.subheading || genPassage?.subheading,
      text: combinedPassageText,
      questions: mergedReadingQuestions
    };
  });

  // 3. Hydrate Speaking so every Part 1, Part 2, and Part 3 item has Band 9 sample audio text
  const genSpk = generated.speaking;
  const hydratedSpeaking = test.speaking
    ? {
        part1: {
          topic: test.speaking.part1.topic,
          questions: test.speaking.part1.questions.map((q, idx) => ({
            ...q,
            suggestedIdeas:
              q.suggestedIdeas ||
              genSpk?.part1.questions[idx % (genSpk.part1.questions.length || 1)]?.suggestedIdeas || [
                'Provide a direct personal viewpoint',
                'Support with a concrete real-life example'
              ],
            band9Sample:
              q.band9Sample ||
              genSpk?.part1.questions[idx % (genSpk.part1.questions.length || 1)]?.band9Sample ||
              'From my perspective, maintaining a balanced approach in daily life allows me to stay both productive and mentally refreshed.'
          }))
        },
        part2: {
          ...test.speaking.part2,
          followUpQuestion:
            test.speaking.part2.followUpQuestion ||
            genSpk?.part2.followUpQuestion ||
            'Do you think other people in your community share the same perspective on this topic?',
          modelResponse:
            test.speaking.part2.modelResponse ||
            genSpk?.part2.modelResponse ||
            'I would like to talk about a particularly meaningful initiative I experienced recently. Not only did it bring tangible benefits to everyone involved, but it also fundamentally shifted how I approach long-term planning and collaboration.'
        },
        part3: {
          theme: test.speaking.part3.theme,
          questions: test.speaking.part3.questions.map((q, idx) => ({
            ...q,
            sampleResponse:
              q.sampleResponse ||
              genSpk?.part3.questions[idx % (genSpk.part3.questions.length || 1)]?.sampleResponse ||
              'When analyzing this issue from a broader societal standpoint, it becomes evident that balanced policy regulation and public education must work in tandem to achieve sustainable outcomes.',
            keyCollocations:
              q.keyCollocations ||
              genSpk?.part3.questions[idx % (genSpk.part3.questions.length || 1)]?.keyCollocations || [
                'Broader societal standpoint',
                'Sustainable outcomes',
                'Work in tandem'
              ]
          }))
        }
      }
    : genSpk;

  return {
    ...test,
    provenance: test.provenance === 'authentic_calibrated' ? 'original_practice' : test.provenance,
    provenanceNote: NON_AFFILIATION_SIMULATION_NOTICE,
    listening: test.listening
      ? {
          ...test.listening,
          parts: hydratedParts
        }
      : generated.listening,
    reading: {
      title: test.reading?.title || generated.reading?.title || `${test.title} Reading`,
      passages: hydratedPassages
    },
    speaking: hydratedSpeaking
  };
}

export function getAllCambridgeTests(): CambridgeTestSet[] {
  let customTests: CambridgeTestSet[] = [];
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(CUSTOM_TESTS_STORAGE_KEY);
      if (raw) {
        customTests = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[PracticeLibrary] Failed to load custom tests from localStorage:', e);
    }
  }

  // Merge built-in initial tests with any user-imported custom tests (custom overrides by ID)
  const map = new Map<string, CambridgeTestSet>();
  INITIAL_CAMBRIDGE_TESTS.forEach((t) => map.set(t.id, hydrateTestSetWithCompleteAudioAndParts(t)));
  customTests.forEach((t) => map.set(t.id, t));

  // Ensure all Practice Set 11 to 21 tests (1 to 4) are populated and available in the library map
  for (let v = 11; v <= 21; v++) {
    for (let t = 1; t <= 4; t++) {
      const acadId = `practice-${v}-academic-test-${t}`;
      if (!map.has(acadId)) {
        map.set(acadId, getOrCreatePracticeTest(v as CambridgeVolumeNumber, 'Academic', t as CambridgeTestNumber));
      }
      const gtId = `practice-${v}-general-training-test-${t}`;
      if (!map.has(gtId)) {
        map.set(gtId, getOrCreatePracticeTest(v as CambridgeVolumeNumber, 'General Training', t as CambridgeTestNumber));
      }
    }
  }

  return Array.from(map.values());
}

export function getCambridgeTestById(testId: string): CambridgeTestSet | null {
  const all = getAllCambridgeTests();
  const direct = all.find((t) => t.id === testId);
  if (direct) return direct;

  const match = testId.match(/practice-(\d+)-(academic|general-training)-test-(\d+)/i);
  if (match) {
    const vol = parseInt(match[1], 10) as CambridgeVolumeNumber;
    const edition: CambridgeEdition = match[2].toLowerCase() === 'academic' ? 'Academic' : 'General Training';
    const testNum = parseInt(match[3], 10) as CambridgeTestNumber;
    if (vol >= 11 && vol <= 21 && testNum >= 1 && testNum <= 4) {
      return getOrCreatePracticeTest(vol, edition, testNum);
    }
  }

  return null;
}

export function getPracticeTestsByVolumeAndEdition(
  volume: CambridgeVolumeNumber,
  edition: CambridgeEdition
): CambridgeTestSet[] {
  const tests: CambridgeTestSet[] = [];
  for (let tNum = 1; tNum <= 4; tNum++) {
    const id = `practice-${volume}-${edition.toLowerCase().replace(/\s+/g, '-')}-test-${tNum}`;
    const found = getCambridgeTestById(id) || getOrCreatePracticeTest(volume, edition, tNum as CambridgeTestNumber);
    tests.push(found);
  }
  return tests;
}

export { getOrCreatePracticeTest };

/**
 * Resolves a displayed question number (1..40) in Listening or Reading to the actual question object
 * in the active CambridgeTestSet. Ensures UI consumers (such as the bottom 40-question ribbon and
 * Review checkbox) always use the real `q.id` rather than synthesizing IDs that differ from
 * preserved seed IDs (e.g. `c18-a-t1-r-q4` at Q14, `c18-a-t1-r-q5` at Q27) or hydrated fallback IDs.
 */
export function resolveModuleQuestionByNumber(
  testSet: CambridgeTestSet | null | undefined,
  module: 'listening' | 'reading' | string,
  questionNumber: number
): CambridgeQuestionItem | null {
  if (!testSet) return null;
  if (module === 'listening' && testSet.listening?.parts) {
    for (const part of testSet.listening.parts) {
      const found = (part.questions || []).find((q) => q.questionNumber === questionNumber);
      if (found) return found;
    }
  } else if (module === 'reading' && testSet.reading?.passages) {
    for (const passage of testSet.reading.passages) {
      const found = (passage.questions || []).find((q) => q.questionNumber === questionNumber);
      if (found) return found;
    }
  }
  return null;
}

export function resolveQuestionIdForModuleQuestionNumber(
  testSet: CambridgeTestSet | null | undefined,
  module: 'listening' | 'reading' | string,
  questionNumber: number
): string | null {
  const q = resolveModuleQuestionByNumber(testSet, module, questionNumber);
  return q?.id ?? null;
}

export function resolveRibbonQuestionStatus(params: {
  testSet: CambridgeTestSet | null | undefined;
  module: 'listening' | 'reading' | string;
  questionNumber: number;
  activeQuestionNumber: number;
  userAnswers: Record<string, string>;
  flaggedQuestions: Record<string, boolean>;
}): {
  questionId: string | null;
  isAnswered: boolean;
  isFlagged: boolean;
  isActive: boolean;
} {
  const questionId = resolveQuestionIdForModuleQuestionNumber(
    params.testSet,
    params.module,
    params.questionNumber
  );
  const isAnswered = Boolean(questionId && (params.userAnswers[questionId] || '').trim());
  const isFlagged = Boolean(questionId && params.flaggedQuestions[questionId]);
  const isActive = params.activeQuestionNumber === params.questionNumber;
  return { questionId, isAnswered, isFlagged, isActive };
}

// ============================================================================
// 4. VALIDATED CONTENT IMPORT PIPELINE
// ============================================================================

export function validateCambridgeTestContent(raw: any): CambridgeContentImportValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Input is not a valid JSON object'], warnings: [] };
  }

  // Volume validation (11-21)
  const volume = Number(raw.volume);
  if (!volume || volume < 11 || volume > 21) {
    errors.push('Volume must be an integer between 11 and 21 (inclusive).');
  }

  // Edition validation
  if (raw.edition !== 'Academic' && raw.edition !== 'General Training') {
    errors.push('Edition must be either "Academic" or "General Training".');
  }

  // Test number validation (1-4)
  const testNumber = Number(raw.testNumber);
  if (!testNumber || testNumber < 1 || testNumber > 4) {
    errors.push('Test number must be an integer between 1 and 4.');
  }

  // Title validation
  if (!raw.title || typeof raw.title !== 'string' || !raw.title.trim()) {
    errors.push('Test title is required.');
  }

  const modulesDetected: ('listening' | 'reading' | 'writing' | 'speaking')[] = [];
  let totalQuestions = 0;
  const seenQuestionIds = new Set<string>();

  // Listening validation
  if (raw.listening) {
    modulesDetected.push('listening');
    if (!Array.isArray(raw.listening.parts) || raw.listening.parts.length === 0) {
      errors.push('Listening module must contain an array of parts.');
    } else {
      raw.listening.parts.forEach((part: any, pIdx: number) => {
        if (!part.partNumber || part.partNumber < 1 || part.partNumber > 4) {
          warnings.push(`Listening part at index ${pIdx} is missing a valid partNumber (1-4).`);
        }
        if (Array.isArray(part.questions)) {
          part.questions.forEach((q: any) => {
            totalQuestions++;
            if (!q.id) errors.push(`A question in Listening Part ${part.partNumber} is missing an "id".`);
            else if (seenQuestionIds.has(q.id)) errors.push(`Duplicate question ID detected: "${q.id}".`);
            else seenQuestionIds.add(q.id);

            if (!q.prompt) errors.push(`Question "${q.id}" is missing a prompt.`);
            if (q.correctAnswer == null || q.correctAnswer === '') {
              errors.push(`Question "${q.id}" is missing a correctAnswer.`);
            }
          });
        }
      });
    }
  }

  // Reading validation
  if (raw.reading) {
    modulesDetected.push('reading');
    if (!Array.isArray(raw.reading.passages) || raw.reading.passages.length === 0) {
      errors.push('Reading module must contain an array of passages.');
    } else {
      raw.reading.passages.forEach((psg: any) => {
        if (!psg.text || !psg.text.trim()) {
          warnings.push(`Reading passage ${psg.passageNumber} has empty text.`);
        }
        if (Array.isArray(psg.questions)) {
          psg.questions.forEach((q: any) => {
            totalQuestions++;
            if (!q.id) errors.push(`A reading question is missing an "id".`);
            else if (seenQuestionIds.has(q.id)) errors.push(`Duplicate question ID detected: "${q.id}".`);
            else seenQuestionIds.add(q.id);

            if (!q.prompt) errors.push(`Question "${q.id}" is missing a prompt.`);
            if (q.correctAnswer == null || q.correctAnswer === '') {
              errors.push(`Question "${q.id}" is missing a correctAnswer.`);
            }
          });
        }
      });
    }
  }

  // Writing validation
  if (raw.writing) {
    modulesDetected.push('writing');
    if (!raw.writing.task1?.prompt) warnings.push('Writing module is missing Task 1 prompt.');
    if (!raw.writing.task2?.prompt) warnings.push('Writing module is missing Task 2 prompt.');
  }

  // Speaking validation
  if (raw.speaking) {
    modulesDetected.push('speaking');
    if (!raw.speaking.part1?.questions?.length) warnings.push('Speaking Part 1 has no questions.');
    if (!raw.speaking.part2?.cueCardTopic) warnings.push('Speaking Part 2 has no cueCardTopic.');
  }

  if (modulesDetected.length === 0) {
    errors.push('Import file must contain at least one module (listening, reading, writing, or speaking).');
  }

  const valid = errors.length === 0;

  return {
    valid,
    errors,
    warnings,
    metadata: valid
      ? {
          volume: volume as CambridgeVolumeNumber,
          edition: raw.edition as CambridgeEdition,
          testNumber: testNumber as CambridgeTestNumber,
          modulesDetected,
          totalQuestions
        }
      : undefined
  };
}

export function importCambridgeTestContent(jsonString: string): {
  success: boolean;
  testId?: string;
  error?: string;
  diagnostics?: CambridgeContentImportValidation;
} {
  try {
    const parsed = JSON.parse(jsonString);
    const validation = validateCambridgeTestContent(parsed);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join('; '),
        diagnostics: validation
      };
    }

    const testId =
      parsed.id ||
      `practice-${validation.metadata!.volume}-${validation.metadata!.edition.toLowerCase().replace(/\s+/g, '-')}-test-${validation.metadata!.testNumber}`;

    const newTestSet: CambridgeTestSet = {
      ...parsed,
      id: testId,
      volume: validation.metadata!.volume,
      edition: validation.metadata!.edition,
      testNumber: validation.metadata!.testNumber,
      availableModules: validation.metadata!.modulesDetected,
      version: (parsed.version || 0) + 1,
      updatedAt: Date.now()
    };

    if (typeof window !== 'undefined') {
      const existing = getAllCambridgeTests().filter((t) => t.id !== testId);
      existing.push(newTestSet);
      localStorage.setItem(CUSTOM_TESTS_STORAGE_KEY, JSON.stringify(existing));
      window.dispatchEvent(new CustomEvent('practice_library_updated', { detail: { testId } }));
    }

    return {
      success: true,
      testId,
      diagnostics: validation
    };
  } catch (err: any) {
    return {
      success: false,
      error: `JSON parse exception: ${err?.message || 'Invalid format'}`
    };
  }
}

// ============================================================================
// 5. QUESTION-TYPE-AWARE INTEGRITY VALIDATION & THREE-WAY VERIFICATION REPORT
// ============================================================================

export interface QuestionIntegrityDiagnostic {
  module: 'listening' | 'reading' | 'writing' | 'speaking';
  questionId: string;
  questionNumber?: number;
  partOrSection?: number;
  questionType: string;
  /**
   * 'verified_by_rule' means ONLY that deterministic structural, answer-format, and source-lexical
   * checks passed. It never proves semantic correctness or answer-key truth.
   */
  status: 'verified_by_rule' | 'needs_review' | 'invalid';
  reasons: string[];
}

export interface TestIntegrityReport {
  testId: string;
  volume: CambridgeVolumeNumber;
  edition: CambridgeEdition;
  testNumber: CambridgeTestNumber;
  /** 1. Structural Completeness: 4 Listening parts (Q1-40), 3 Reading passages (Q1-13, Q14-26, Q27-40), 2 Writing tasks, 3 Speaking parts */
  structuralStatus: 'pass' | 'fail';
  structuralIssues: string[];
  /** 2. Automated Evidence & Defect Check (Conservative, Question-Type-Aware; does NOT prove semantic correctness) */
  automatedEvidenceStatus: 'verified_by_rule' | 'needs_review' | 'invalid';
  questionDiagnostics: {
    totalObjectiveQuestions: number;
    verifiedByRuleCount: number;
    needsReviewCount: number;
    invalidCount: number;
    duplicatePromptCount: number;
    missingStatementCount: number;
    invalidAnswerFormatCount: number;
  };
  itemIssues: QuestionIntegrityDiagnostic[];
  /** 3. Human Content Review & Provenance: Never implied by automated checks */
  humanReviewStatus: 'unverified_ai_simulation' | 'human_reviewed';
  semanticCorrectnessGuarantee: 'none_requires_human_review';
  provenance: 'ai_simulation' | 'curated_practice';
  nonAffiliationNotice: string;
}

export interface CatalogueIntegritySummary {
  totalCatalogueTests: number;
  structuralPassCount: number;
  structuralFailCount: number;
  testsWithZeroInvalidItems: number;
  testsWithInvalidItems: number;
  aggregateQuestions: {
    totalObjectiveQuestions: number;
    verifiedByRuleCount: number;
    needsReviewCount: number;
    invalidCount: number;
    duplicatePromptCount: number;
    missingStatementCount: number;
    invalidAnswerFormatCount: number;
  };
  humanReviewStatus: 'unverified_ai_simulation';
  semanticCorrectnessGuarantee: 'none_requires_human_review';
  nonAffiliationNotice: string;
  reports: TestIntegrityReport[];
}

const VALIDATOR_STOPWORDS = new Set([
  'the', 'and', 'for', 'that', 'with', 'this', 'from', 'have', 'has', 'had', 'are', 'was', 'were',
  'been', 'being', 'which', 'what', 'when', 'where', 'who', 'whom', 'whose', 'why', 'how', 'into',
  'onto', 'upon', 'over', 'under', 'above', 'below', 'between', 'among', 'through', 'during',
  'before', 'after', 'since', 'until', 'while', 'about', 'against', 'following', 'according',
  'passage', 'paragraph', 'section', 'part', 'statement', 'statements', 'writer', 'claims',
  'information', 'contains', 'mentions', 'describes', 'reports', 'contrasts', 'correct', 'letter',
  'choose', 'select', 'true', 'false', 'yes', 'not', 'given', 'more', 'less', 'than', 'most',
  'some', 'such', 'only', 'also', 'very', 'much', 'many', 'each', 'every', 'other', 'another',
  'their', 'there', 'they', 'them', 'these', 'those', 'your', 'will', 'would', 'could', 'should',
  'appropriate', 'heading', 'headings', 'list', 'match', 'researcher', 'researchers', 'credited',
  'finding', 'observation', 'recorded', 'primary', 'main'
]);

const ROMAN_NUMERALS = [
  'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'
];

function normalizePromptForDuplicateCheck(prompt: string): string {
  return (prompt || '')
    .toLowerCase()
    .replace(/\[\d+\]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDistinctivePromptTokens(prompt: string, minLen = 4): string[] {
  const strippedLeadIn = (prompt || '')
    .toLowerCase()
    .replace(/^which\s+paragraph\s*(\([a-z0-9\s–-]+\))?\s*(contains|mentions|describes|reports|contrasts)\s*(the\s+following\s+)?(information\s*(about|regarding)?)?/i, ' ')
    .replace(/^according\s+to\s+paragraph\s+[a-z0-9]+/i, ' ')
    .replace(/^select\s+the\s+most\s+appropriate\s+heading\s+for\s+paragraph\s+[a-z0-9]+\s+from\s+the\s+list\s+of\s+headings\.?/i, ' ')
    .replace(/^[a-z]\)\s*/i, ' ')
    .replace(/^(i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii)\.\s*/i, ' ')
    .replace(/\[\d+\]/g, ' ');
  return Array.from(
    new Set(
      strippedLeadIn
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((tok) => tok.length >= minLen && !VALIDATOR_STOPWORDS.has(tok))
    )
  );
}

function computeTokenJaccard(tokensA: string[], tokensB: string[]): number {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function isMissingOrInstructionOnlyPrompt(prompt: string, questionType: string): boolean {
  const raw = (prompt || '').trim();
  if (!raw) return true;
  if (/^[0-9\s.,:;?!()[\]\-_/#£$%]+$/.test(raw)) return true;

  const qType = (questionType || '').toLowerCase();
  const words = raw.replace(/\[\d+\]/g, ' ').trim().split(/\s+/).filter(Boolean);

  // Generic placeholder pattern (e.g. "Passage 1 detail [8]:")
  if (/^(passage|section|part)\s*\d+\s*detail\s*(\[\d+\])?:?$/i.test(raw)) {
    return true;
  }

  if (qType === 'true_false_not_given' || qType === 'yes_no_not_given') {
    if (/^do\s+the\s+following\s+statements\s+agree\s+with/i.test(raw)) return true;
    if (/^(write|choose|select)\s+(true|false|yes|no|not\s+given)/i.test(raw)) return true;
    if (/^(true\s*\/\s*false|yes\s*\/\s*no)[\s/:.()-]*$/i.test(raw)) return true;
    if (/^statement\s*\d*[\s:.-]*$/i.test(raw)) return true;
    return words.length < 4;
  }

  if (qType === 'multiple_choice' || qType === 'choose_two_letters') {
    if (/^(choose|select)\s+the\s+correct\s+letter[\s.,:()a-z-]*$/i.test(raw)) return true;
    return words.length < 4;
  }

  if (qType.includes('matching') || qType === 'map_labelling') {
    if (/^which\s+paragraph\s*(\([a-z0-9,\s–-]+\))?\s*contains\s+the\s+following\s+information\??\s*(\([a-z0-9,\s–-]+\))?$/i.test(raw)) {
      return true;
    }
    if (/^(match\s+each|choose\s+the\s+correct\s+heading\s+for\s+each\s+paragraph\.?)$/i.test(raw)) {
      return true;
    }
    return words.length < 3;
  }

  // Completion / short-answer items: allow short valid field labels like "Postcode:" or "Surname:" (>= 4 chars with alphabetic word >= 3 chars)
  const nonWsLen = raw.replace(/\s+/g, '').length;
  const hasAlphaWord = /[a-zA-Z]{3,}/.test(raw);
  return nonWsLen < 4 || !hasAlphaWord;
}

function isSingleMatchingValueValid(
  val: string,
  qType: string,
  options: string[]
): boolean {
  const trimmed = val.trim();
  if (!trimmed) return false;
  const upperVal = trimmed.toUpperCase();
  const lowerVal = trimmed.toLowerCase();
  const validLetters = options.map((_, idx) => String.fromCharCode(65 + idx));

  if (qType === 'matching_headings') {
    const cleanRoman = lowerVal.replace(/\.$/, '').trim();
    const romanIdx = ROMAN_NUMERALS.indexOf(cleanRoman);
    if (romanIdx >= 0 && romanIdx < options.length) {
      return true;
    }
    const matchesFullHeading = options.some((opt) => {
      const normOpt = opt.trim().toLowerCase();
      const strippedOpt = normOpt.replace(/^[ivxlcdm]+\.\s*/i, '').trim();
      return normOpt === lowerVal || (strippedOpt.length >= 3 && strippedOpt === lowerVal);
    });
    if (matchesFullHeading) return true;
    if (validLetters.includes(upperVal)) return true;
    return false;
  }

  // Other matching types (matching_features, matching_information, matching_sentence_endings, matching)
  if (validLetters.includes(upperVal) || /^[A-H]$/.test(upperVal)) {
    return true;
  }
  return options.some((opt) => {
    const normOpt = opt.trim().toLowerCase();
    const strippedOpt = normOpt.replace(/^[a-z][).]\s*/i, '').trim();
    return (
      normOpt === lowerVal ||
      (strippedOpt.length >= 3 && strippedOpt === lowerVal) ||
      opt.trim().toUpperCase().startsWith(`${upperVal})`) ||
      opt.trim().toUpperCase().startsWith(`${upperVal}.`)
    );
  });
}

export function validateAnswerFormatByType(q: {
  type: string;
  correctAnswer: string | string[];
  acceptableAnswers?: string[];
  options?: string[];
  wordLimit?: number;
}): boolean {
  const primaryVariants = Array.isArray(q.correctAnswer)
    ? q.correctAnswer.map((x) => String(x ?? '').trim())
    : [String(q.correctAnswer ?? '').trim()];
  if (primaryVariants.length === 0 || primaryVariants.some((v) => !v)) {
    return false;
  }

  const acceptableVariants = Array.isArray(q.acceptableAnswers)
    ? q.acceptableAnswers.map((x) => String(x ?? '').trim())
    : [];
  if (acceptableVariants.some((v) => !v)) {
    return false;
  }

  const ansStr = primaryVariants.join(' ').trim();
  const qType = (q.type || '').toLowerCase();
  const upperAns = ansStr.toUpperCase();

  if (qType === 'true_false_not_given') {
    const validPrimary = new Set(['TRUE', 'FALSE', 'NOT GIVEN']);
    const validAcceptable = new Set(['TRUE', 'FALSE', 'NOT GIVEN', 'T', 'F', 'NG']);
    if (!validPrimary.has(upperAns)) return false;
    return acceptableVariants.every((a) => validAcceptable.has(a.toUpperCase()));
  }

  if (qType === 'yes_no_not_given') {
    const validPrimary = new Set(['YES', 'NO', 'NOT GIVEN']);
    const validAcceptable = new Set(['YES', 'NO', 'NOT GIVEN', 'Y', 'N', 'NG']);
    if (!validPrimary.has(upperAns)) return false;
    return acceptableVariants.every((a) => validAcceptable.has(a.toUpperCase()));
  }

  if (qType === 'multiple_choice') {
    if (!Array.isArray(q.options) || q.options.length < 3) return false;
    const distinctOpts = new Set(q.options.map((o) => String(o).trim().toLowerCase()).filter(Boolean));
    if (distinctOpts.size < 3) return false;
    const validLetters = q.options.map((_, idx) => String.fromCharCode(65 + idx));
    const isMcqPrimaryValid = (val: string) => {
      const up = val.toUpperCase();
      const low = val.toLowerCase();
      return (
        validLetters.includes(up) ||
        q.options!.some((opt) => {
          const normOpt = opt.trim().toLowerCase();
          const strippedOpt = normOpt.replace(/^[a-z][).]\s*/i, '').trim();
          return (
            normOpt === low ||
            (strippedOpt.length >= 3 && strippedOpt === low) ||
            opt.trim().toUpperCase().startsWith(`${up})`)
          );
        })
      );
    };
    const isMcqAcceptableValid = (val: string) => {
      if (isMcqPrimaryValid(val)) return true;
      const low = val.trim().toLowerCase();
      if (low.length < 3) return false;
      return q.options!.some((opt) => opt.trim().toLowerCase().includes(low));
    };
    return isMcqPrimaryValid(ansStr) && acceptableVariants.every(isMcqAcceptableValid);
  }

  if (qType.includes('matching')) {
    if (!Array.isArray(q.options) || q.options.length < 2) return false;
    const distinctOpts = new Set(q.options.map((o) => String(o).trim().toLowerCase()).filter(Boolean));
    if (distinctOpts.size < 2) return false;
    return (
      isSingleMatchingValueValid(ansStr, qType, q.options) &&
      acceptableVariants.every((a) => isSingleMatchingValueValid(a, qType, q.options!))
    );
  }

  // Completion / short-answer word limit check: enforce against correctAnswer AND every acceptableAnswers entry
  if (typeof q.wordLimit === 'number' && q.wordLimit > 0) {
    const allVariantsToCheck = [...primaryVariants, ...acceptableVariants];
    for (const variant of allVariantsToCheck) {
      const wordCount = variant.split(/\s+/).filter(Boolean).length;
      if (wordCount === 0 || wordCount > q.wordLimit) {
        return false;
      }
    }
  }

  return true;
}

function resolveOptionTextForQuestion(
  q: {
    type: string;
    correctAnswer: string | string[];
     acceptableAnswers?: string[];
    options?: string[];
  },
  ansStr: string
): string {
  if (!Array.isArray(q.options) || q.options.length === 0) return '';
  const trimmed = ansStr.trim();
  const upperAns = trimmed.toUpperCase();
  const lowerAns = trimmed.toLowerCase();

  // 1. Direct full option match
  const directOpt = q.options.find((opt) => opt.trim().toLowerCase() === lowerAns);
  if (directOpt) return directOpt;

  // 2. Roman numeral heading match (i .. xii)
  const cleanRoman = lowerAns.replace(/\.$/, '').trim();
  const romanIdx = ROMAN_NUMERALS.indexOf(cleanRoman);
  if (romanIdx >= 0 && romanIdx < q.options.length) {
    const prefixOpt = q.options.find((opt) =>
      opt.trim().toLowerCase().startsWith(`${cleanRoman}.`)
    );
    return prefixOpt || q.options[romanIdx] || '';
  }

  // 3. Single letter option match (A .. Z)
  if (/^[A-Z]$/.test(upperAns)) {
    const prefixOpt = q.options.find(
      (opt) =>
        opt.trim().toUpperCase().startsWith(`${upperAns})`) ||
        opt.trim().toUpperCase().startsWith(`${upperAns}.`) ||
        opt.trim().toUpperCase().startsWith(`${upperAns} `)
    );
    if (prefixOpt) return prefixOpt;
    const idx = upperAns.charCodeAt(0) - 65;
    if (idx >= 0 && idx < q.options.length) {
      return q.options[idx];
    }
  }

  return '';
}

/**
 * Conservative source-grounding check.
 * IMPORTANT SAFEGUARDS:
 * 1. Never uses `q.explanation` as evidence that the answer or prompt is grounded in `sourceText`.
 * 2. Never claims that `true_false_not_given` or `yes_no_not_given` polarity (`TRUE`/`FALSE`/`YES`/`NO`)
 *    is semantically verified by keyword overlap — marks all TFNG/YNNG items as requiring human review.
 * 3. Requires both prompt context and answer/option lexical grounding for objective items; weak lexical
 *    overlap is marked as requiring human review (`grounded: false`).
 */
export function checkConservativeSourceGrounding(
  q: {
    type: string;
    prompt: string;
    correctAnswer: string | string[];
    acceptableAnswers?: string[];
    options?: string[];
    explanation?: string;
    locationReference?: string;
  },
  sourceText: string
): { grounded: boolean; reason?: string } {
  const ansStr = Array.isArray(q.correctAnswer)
    ? q.correctAnswer.join(' ').trim()
    : String(q.correctAnswer ?? '').trim();
  const qType = (q.type || '').toLowerCase();
  const upperAns = ansStr.toUpperCase();

  const normSource = (sourceText || '').toLowerCase();
  const normSourceDigits = normSource.replace(/[^0-9]/g, '');
  const hasExplanation = Boolean(q.explanation && q.explanation.trim().length >= 12);

  // 1. TRUE/FALSE/NOT GIVEN & YES/NO/NOT GIVEN:
  // Deterministic token overlap cannot prove absence ('NOT GIVEN') OR logical polarity ('TRUE' vs 'FALSE', 'YES' vs 'NO').
  // Flipping TRUE to FALSE leaves prompt tokens unchanged, so all TFNG/YNNG items require human review for semantic truth.
  if (qType === 'true_false_not_given' || qType === 'yes_no_not_given') {
    if (upperAns === 'NOT GIVEN') {
      return {
        grounded: false,
        reason: 'not_given_absence_check_requires_human_review'
      };
    }
    const stmtTokens = extractDistinctivePromptTokens(q.prompt, 4);
    const matchedStmtTokens = stmtTokens.filter((tok) => normSource.includes(tok));
    if (matchedStmtTokens.length < 2) {
      return {
        grounded: false,
        reason: 'ungrounded_statement_requires_human_review'
      };
    }
    return {
      grounded: false,
      reason: 'polarity_verification_requires_human_review'
    };
  }

  const candidateAnswers = [
    ansStr,
    ...(Array.isArray(q.acceptableAnswers) ? q.acceptableAnswers : [])
  ]
    .map((a) => String(a || '').trim().toLowerCase())
    .filter(Boolean);

  // 2. Completion / short-answer items:
  // Require both direct answer presence in sourceText AND prompt context token overlap in sourceText (never using q.explanation).
  if (
    qType === 'note_completion' ||
    qType === 'sentence_completion' ||
    qType === 'summary_completion' ||
    qType === 'form_completion' ||
    qType === 'table_completion' ||
    qType === 'short_answer'
  ) {
    const directAnswerMatch = candidateAnswers.some((cand) => {
      if (normSource.includes(cand)) return true;
      const candDigits = cand.replace(/[^0-9]/g, '');
      if (candDigits.length >= 6 && normSourceDigits.includes(candDigits)) return true;
      return false;
    });

    if (!directAnswerMatch) {
      return {
        grounded: false,
        reason: 'paraphrased_or_ambiguous_grounding'
      };
    }

    // Verify prompt context (allow 3+ char tokens so short labels like "Postcode:" match "postcode" in sourceText)
    const promptContextTokens = extractDistinctivePromptTokens(q.prompt, 3);
    const matchedPromptTokens = promptContextTokens.filter((tok) => normSource.includes(tok));
    if (matchedPromptTokens.length === 0 || !hasExplanation) {
      return {
        grounded: false,
        reason: 'weak_lexical_overlap_requires_human_review'
      };
    }

    return { grounded: true };
  }

  // 3. Objective selection items (Multiple Choice, Matching Headings, Matching Features, Map Labelling):
  // Evaluate prompt tokens and selected option tokens strictly from q.prompt and the resolved option text (NEVER q.explanation).
  const selectedOptionText = resolveOptionTextForQuestion(q, ansStr);
  const promptTokens = extractDistinctivePromptTokens(q.prompt, 4);
  const optionTokens = extractDistinctivePromptTokens(selectedOptionText || ansStr, 4);

  const matchedPromptTokens = promptTokens.filter((tok) => normSource.includes(tok));
  const matchedOptionTokens = optionTokens.filter((tok) => normSource.includes(tok));

  if (qType === 'matching_headings') {
    if (matchedOptionTokens.length >= 2 && hasExplanation) {
      return { grounded: true };
    }
    return {
      grounded: false,
      reason: 'weak_lexical_overlap_requires_human_review'
    };
  }

  // For multiple_choice and other matching types, require both prompt grounding (>= 1 token)
  // AND selected option grounding (>= 2 tokens, or >= 1 token when the option itself only has 1 distinctive token and prompt has >= 2)
  const hasSufficientOptionSupport =
    matchedOptionTokens.length >= 2 ||
    (optionTokens.length === 1 && matchedOptionTokens.length === 1 && matchedPromptTokens.length >= 2);

  if (matchedPromptTokens.length >= 1 && hasSufficientOptionSupport && hasExplanation) {
    return { grounded: true };
  }

  return {
    grounded: false,
    reason: 'weak_lexical_overlap_requires_human_review'
  };
}

export function validatePracticeTestIntegrity(test: CambridgeTestSet): TestIntegrityReport {
  const structuralIssues: string[] = [];
  const itemIssues: QuestionIntegrityDiagnostic[] = [];
  const seenIds = new Set<string>();

  // 1. Structural checks — Listening
  if (!test.listening || !Array.isArray(test.listening.parts) || test.listening.parts.length !== 4) {
    structuralIssues.push('Listening module must contain exactly 4 parts.');
  } else {
    test.listening.parts.forEach((part, pIdx) => {
      const expectedPartNum = pIdx + 1;
      if (part.partNumber !== expectedPartNum) {
        structuralIssues.push(`Listening part at index ${pIdx} has partNumber ${part.partNumber}, expected ${expectedPartNum}.`);
      }
      if (!part.audioScript || !part.audioScript.trim()) {
        structuralIssues.push(`Listening Part ${expectedPartNum} has an empty audioScript.`);
      }
      if (!Array.isArray(part.dialogue) || part.dialogue.length < 2) {
        structuralIssues.push(`Listening Part ${expectedPartNum} must have at least 2 spoken dialogue turns.`);
      }
      if (!Array.isArray(part.questions) || part.questions.length !== 10) {
        structuralIssues.push(
          `Listening Part ${expectedPartNum} has ${part.questions?.length ?? 0} questions, expected 10.`
        );
      } else {
        part.questions.forEach((q, qIdx) => {
          const expectedQNum = pIdx * 10 + qIdx + 1;
          if (q.questionNumber !== expectedQNum) {
            structuralIssues.push(
              `Listening Part ${expectedPartNum} question index ${qIdx} has questionNumber ${q.questionNumber}, expected ${expectedQNum}.`
            );
          }
          if (q.partOrSection !== expectedPartNum) {
            structuralIssues.push(
              `Listening question Q${q.questionNumber} has partOrSection ${q.partOrSection}, expected ${expectedPartNum}.`
            );
          }
          if (!q.id) {
            structuralIssues.push(`Listening question Q${expectedQNum} is missing an id.`);
          } else if (seenIds.has(q.id)) {
            structuralIssues.push(`Duplicate question ID "${q.id}" detected.`);
          } else {
            seenIds.add(q.id);
          }
        });
      }
    });
  }

  // 2. Structural checks — Reading (Passage 1: Q1-13, Passage 2: Q14-26, Passage 3: Q27-40)
  const expectedReadingRanges: Array<{ passageNumber: 1 | 2 | 3; startQ: number; endQ: number; count: number }> = [
    { passageNumber: 1, startQ: 1, endQ: 13, count: 13 },
    { passageNumber: 2, startQ: 14, endQ: 26, count: 13 },
    { passageNumber: 3, startQ: 27, endQ: 40, count: 14 }
  ];

  if (!test.reading || !Array.isArray(test.reading.passages) || test.reading.passages.length !== 3) {
    structuralIssues.push('Reading module must contain exactly 3 passages.');
  } else {
    expectedReadingRanges.forEach((range, pIdx) => {
      const passage = test.reading!.passages[pIdx];
      if (!passage) {
        structuralIssues.push(`Reading Passage ${range.passageNumber} is missing.`);
        return;
      }
      if (passage.passageNumber !== range.passageNumber) {
        structuralIssues.push(
          `Reading passage at index ${pIdx} has passageNumber ${passage.passageNumber}, expected ${range.passageNumber}.`
        );
      }
      if (!passage.text || !passage.text.trim()) {
        structuralIssues.push(`Reading Passage ${range.passageNumber} has empty passage text.`);
      }
      if (!Array.isArray(passage.questions) || passage.questions.length !== range.count) {
        structuralIssues.push(
          `Reading Passage ${range.passageNumber} has ${passage.questions?.length ?? 0} questions, expected ${range.count} (Q${range.startQ}–Q${range.endQ}).`
        );
      } else {
        passage.questions.forEach((q, qIdx) => {
          const expectedQNum = range.startQ + qIdx;
          if (q.questionNumber !== expectedQNum) {
            structuralIssues.push(
              `Reading Passage ${range.passageNumber} question index ${qIdx} has questionNumber ${q.questionNumber}, expected ${expectedQNum}.`
            );
          }
          if (q.partOrSection !== range.passageNumber) {
            structuralIssues.push(
              `Reading question Q${q.questionNumber} has partOrSection ${q.partOrSection}, expected ${range.passageNumber}.`
            );
          }
          if (!q.id) {
            structuralIssues.push(`Reading question Q${expectedQNum} is missing an id.`);
          } else if (seenIds.has(q.id)) {
            structuralIssues.push(`Duplicate question ID "${q.id}" detected.`);
          } else {
            seenIds.add(q.id);
          }
        });
      }
    });
  }

  // 3. Structural checks — Writing
  if (!test.writing?.task1?.prompt?.trim() || test.writing.task1.minimumWords < 150) {
    structuralIssues.push('Writing Task 1 must include a non-empty prompt and minimumWords >= 150.');
  }
  if (!test.writing?.task2?.prompt?.trim() || test.writing.task2.minimumWords < 250) {
    structuralIssues.push('Writing Task 2 must include a non-empty prompt and minimumWords >= 250.');
  }

  // 4. Structural checks — Speaking
  if (!test.speaking?.part1?.questions?.length) {
    structuralIssues.push('Speaking Part 1 must contain at least 1 question.');
  }
  if (!test.speaking?.part2?.cueCardTopic?.trim() || (test.speaking?.part2?.bulletPoints?.length ?? 0) < 3) {
    structuralIssues.push('Speaking Part 2 must contain a cueCardTopic and at least 3 bulletPoints.');
  }
  if (!test.speaking?.part3?.questions?.length) {
    structuralIssues.push('Speaking Part 3 must contain at least 1 discussion question.');
  }

  // 5. Question-Type-Aware Objective Item Validation (Listening + Reading)
  let verifiedByRuleCount = 0;
  let needsReviewCount = 0;
  let invalidCount = 0;
  let duplicatePromptCount = 0;
  let missingStatementCount = 0;
  let invalidAnswerFormatCount = 0;
  let totalObjectiveQuestions = 0;

  const evaluateModuleQuestions = (
    moduleName: 'listening' | 'reading',
    itemsWithSource: Array<{ q: any; sourceText: string }>
  ) => {
    const seenNormalizedPrompts = new Map<string, number>();
    const priorGroupTokens: Array<{ partOrSection: number; type: string; tokens: string[]; qNum: number }> = [];

    for (const { q, sourceText } of itemsWithSource) {
      totalObjectiveQuestions++;
      const reasons: string[] = [];
      let isInvalid = false;

      // Check 1: Missing source text
      if (!sourceText || !sourceText.trim()) {
        reasons.push('missing_passage_or_script');
        isInvalid = true;
      }

      // Check 2: Question-type-aware missing statement / instruction-only placeholder
      if (isMissingOrInstructionOnlyPrompt(q.prompt, q.type)) {
        reasons.push('missing_statement');
        missingStatementCount++;
        isInvalid = true;
      }

      // Check 3: Exact or near-duplicate prompt within the same module
      const normPrompt = normalizePromptForDuplicateCheck(q.prompt);
      const distinctTokens = extractDistinctivePromptTokens(q.prompt, 4);
      let isDuplicate = false;

      if (normPrompt && seenNormalizedPrompts.has(normPrompt)) {
        isDuplicate = true;
      } else if (distinctTokens.length >= 4) {
        for (const prev of priorGroupTokens) {
          if (
            prev.partOrSection === q.partOrSection &&
            prev.type === (q.type || '').toLowerCase() &&
            prev.tokens.length >= 4 &&
            computeTokenJaccard(distinctTokens, prev.tokens) >= 0.85
          ) {
            isDuplicate = true;
            break;
          }
        }
      }

      if (normPrompt) {
        seenNormalizedPrompts.set(normPrompt, q.questionNumber);
      }
      priorGroupTokens.push({
        partOrSection: q.partOrSection,
        type: (q.type || '').toLowerCase(),
        tokens: distinctTokens,
        qNum: q.questionNumber
      });

      if (isDuplicate) {
        reasons.push('duplicate_prompt');
        duplicatePromptCount++;
        isInvalid = true;
      }

      // Check 4: Question-type-aware answer format & wordLimit across correctAnswer and acceptableAnswers
      if (!validateAnswerFormatByType(q)) {
        reasons.push('invalid_answer_format');
        invalidAnswerFormatCount++;
        isInvalid = true;
      }

      if (isInvalid) {
        invalidCount++;
        itemIssues.push({
          module: moduleName,
          questionId: q.id || `${moduleName}-q${q.questionNumber}`,
          questionNumber: q.questionNumber,
          partOrSection: q.partOrSection,
          questionType: q.type,
          status: 'invalid',
          reasons
        });
        continue;
      }

      // Check 5: Conservative source grounding (never uses q.explanation; marks all TFNG/YNNG polarity & weak overlap as needs_review)
      const grounding = checkConservativeSourceGrounding(q, sourceText);
      if (grounding.grounded) {
        verifiedByRuleCount++;
      } else {
        needsReviewCount++;
        itemIssues.push({
          module: moduleName,
          questionId: q.id || `${moduleName}-q${q.questionNumber}`,
          questionNumber: q.questionNumber,
          partOrSection: q.partOrSection,
          questionType: q.type,
          status: 'needs_review',
          reasons: [grounding.reason || 'paraphrased_or_ambiguous_grounding']
        });
      }
    }
  };

  const listeningItems: Array<{ q: any; sourceText: string }> = [];
  if (test.listening?.parts) {
    for (const part of test.listening.parts) {
      const partSource = [
        part.audioScript || '',
        ...(Array.isArray(part.dialogue) ? part.dialogue.map((d) => d.text) : [])
      ].join('\n');
      for (const q of part.questions || []) {
        listeningItems.push({ q, sourceText: partSource });
      }
    }
  }
  evaluateModuleQuestions('listening', listeningItems);

  const readingItems: Array<{ q: any; sourceText: string }> = [];
  if (test.reading?.passages) {
    for (const passage of test.reading.passages) {
      for (const q of passage.questions || []) {
        readingItems.push({ q, sourceText: passage.text || '' });
      }
    }
  }
  evaluateModuleQuestions('reading', readingItems);

  const structuralStatus: 'pass' | 'fail' =
    structuralIssues.length === 0 && totalObjectiveQuestions === 80 ? 'pass' : 'fail';

  const automatedEvidenceStatus: 'verified_by_rule' | 'needs_review' | 'invalid' =
    structuralStatus === 'fail' || invalidCount > 0
      ? 'invalid'
      : needsReviewCount > 0
      ? 'needs_review'
      : 'verified_by_rule';

  return {
    testId: test.id,
    volume: test.volume,
    edition: test.edition,
    testNumber: test.testNumber,
    structuralStatus,
    structuralIssues,
    automatedEvidenceStatus,
    questionDiagnostics: {
      totalObjectiveQuestions,
      verifiedByRuleCount,
      needsReviewCount,
      invalidCount,
      duplicatePromptCount,
      missingStatementCount,
      invalidAnswerFormatCount
    },
    itemIssues,
    humanReviewStatus: 'unverified_ai_simulation',
    semanticCorrectnessGuarantee: 'none_requires_human_review',
    provenance: 'ai_simulation',
    nonAffiliationNotice: NON_AFFILIATION_SIMULATION_NOTICE
  };
}

export function validateAllPracticeCatalogueIntegrity(): CatalogueIntegritySummary {
  const allTests = getAllCambridgeTests();
  const byId = new Map<string, CambridgeTestSet>(allTests.map((t) => [t.id, t]));

  const reports: TestIntegrityReport[] = CAMBRIDGE_COMPLETE_CATALOGUE.map((catItem) => {
    const test =
      byId.get(catItem.id) ||
      getOrCreatePracticeTest(catItem.volume, catItem.edition, catItem.testNumber);
    return validatePracticeTestIntegrity(test);
  });

  let structuralPassCount = 0;
  let structuralFailCount = 0;
  let testsWithZeroInvalidItems = 0;
  let testsWithInvalidItems = 0;
  let totalObjectiveQuestions = 0;
  let verifiedByRuleCount = 0;
  let needsReviewCount = 0;
  let invalidCount = 0;
  let duplicatePromptCount = 0;
  let missingStatementCount = 0;
  let invalidAnswerFormatCount = 0;

  for (const r of reports) {
    if (r.structuralStatus === 'pass') structuralPassCount++;
    else structuralFailCount++;

    if (r.questionDiagnostics.invalidCount === 0 && r.structuralStatus === 'pass') {
      testsWithZeroInvalidItems++;
    } else {
      testsWithInvalidItems++;
    }

    totalObjectiveQuestions += r.questionDiagnostics.totalObjectiveQuestions;
    verifiedByRuleCount += r.questionDiagnostics.verifiedByRuleCount;
    needsReviewCount += r.questionDiagnostics.needsReviewCount;
    invalidCount += r.questionDiagnostics.invalidCount;
    duplicatePromptCount += r.questionDiagnostics.duplicatePromptCount;
    missingStatementCount += r.questionDiagnostics.missingStatementCount;
    invalidAnswerFormatCount += r.questionDiagnostics.invalidAnswerFormatCount;
  }

  return {
    totalCatalogueTests: reports.length,
    structuralPassCount,
    structuralFailCount,
    testsWithZeroInvalidItems,
    testsWithInvalidItems,
    aggregateQuestions: {
      totalObjectiveQuestions,
      verifiedByRuleCount,
      needsReviewCount,
      invalidCount,
      duplicatePromptCount,
      missingStatementCount,
      invalidAnswerFormatCount
    },
    humanReviewStatus: 'unverified_ai_simulation',
    semanticCorrectnessGuarantee: 'none_requires_human_review',
    nonAffiliationNotice: NON_AFFILIATION_SIMULATION_NOTICE,
    reports
  };
}

export interface ResolvedPracticeListeningPartAudio {
  ok: boolean;
  source: 'audioScript' | 'dialogue' | 'empty';
  lines: Array<{
    speaker: string;
    speakerName: string;
    speakerId: string;
    gender: 'male' | 'female';
    text: string;
    pauseAfterMs: number;
  }>;
  totalWords: number;
  error?: string;
}

/**
 * Authoritative resolver for Practice Library Listening part audio and transcript turns.
 * - When a complete `audioScript` exists, parses it through `audioManager.parseMultiSpeakerScript()`
 *   (which applies Phase 5.5G `subSplitLongMonologueTurns()`).
 * - Never plays or falls back to an abridged `dialogue` summary when `audioScript` exists;
 *   surfaces a recoverable error if parsing a complete script fails.
 * - Provides a safe compatibility fallback for objects that genuinely have no `audioScript`
 *   and only provide `dialogue` (applying `assignDistinctSpeakerProfiles` + `subSplitLongMonologueTurns`).
 */
export function resolveCambridgeListeningPartAudio(
  partObj:
    | {
        audioScript?: string;
        dialogue?: Array<{
          speaker: string;
          text: string;
          speakerId?: string;
          gender?: 'male' | 'female';
          pauseAfterMs?: number;
        }>;
      }
    | null
    | undefined
): ResolvedPracticeListeningPartAudio {
  if (!partObj) {
    return {
      ok: false,
      source: 'empty',
      lines: [],
      totalWords: 0,
      error: 'Listening part not found.'
    };
  }

  const rawScript = typeof partObj.audioScript === 'string' ? partObj.audioScript.trim() : '';
  if (rawScript.length > 0) {
    const scriptWordCount = rawScript.split(/\s+/).filter(Boolean).length;
    try {
      const parsedTurns = audioManager.parseMultiSpeakerScript(rawScript);
      const lines = (parsedTurns || [])
        .filter((t) => Boolean(t && t.text && t.text.trim()))
        .map((t) => {
          const speakerLabel = t.speakerName || t.speaker || 'Speaker';
          const speakerId = t.speakerId || 'speaker_04';
          const gender: 'male' | 'female' =
            t.gender ||
            (speakerId === 'speaker_05' ||
            speakerId === 'speaker_02' ||
            speakerId === 'speaker_07' ||
            speakerId === 'speaker_10' ||
            speakerId === 'speaker_12' ||
            speakerId === 'speaker_14' ||
            speakerId === 'speaker_16'
              ? 'female'
              : 'male');
          return {
            speaker: speakerLabel,
            speakerName: speakerLabel,
            speakerId,
            gender,
            text: t.text.trim(),
            pauseAfterMs: t.pauseAfterMs ?? 260
          };
        });

      const totalWords = lines.reduce(
        (sum, l) => sum + l.text.split(/\s+/).filter(Boolean).length,
        0
      );

      // Guard against silent truncation or failed parsing of a complete script
      if (lines.length === 0 || (scriptWordCount >= 50 && totalWords < Math.floor(scriptWordCount * 0.5))) {
        return {
          ok: false,
          source: 'audioScript',
          lines: [],
          totalWords: 0,
          error: 'Failed to prepare the complete listening audio script for this section. Please retry.'
        };
      }

      return {
        ok: true,
        source: 'audioScript',
        lines,
        totalWords
      };
    } catch (err: any) {
      return {
        ok: false,
        source: 'audioScript',
        lines: [],
        totalWords: 0,
        error:
          typeof err?.message === 'string' && err.message.trim()
            ? err.message
            : 'Failed to prepare the complete listening audio script for this section. Please retry.'
      };
    }
  }

  // Compatibility fallback ONLY for objects that genuinely have no audioScript and only provide dialogue
  if (Array.isArray(partObj.dialogue) && partObj.dialogue.length > 0) {
    const assigned = audioManager.assignDistinctSpeakerProfiles(partObj.dialogue);
    const chunked = audioManager.subSplitLongMonologueTurns(assigned);
    const lines = chunked
      .filter((t) => Boolean(t && t.text && t.text.trim()))
      .map((t, idx) => {
        const speakerLabel = t.speakerName || t.speaker || 'Speaker';
        const speakerId = t.speakerId || (idx % 2 === 0 ? 'speaker_04' : 'speaker_05');
        const gender: 'male' | 'female' =
          t.gender ||
          (speakerId === 'speaker_05' ||
          speakerId === 'speaker_02' ||
          speakerId === 'speaker_07' ||
          speakerId === 'speaker_10' ||
          speakerId === 'speaker_12' ||
          speakerId === 'speaker_14' ||
          speakerId === 'speaker_16'
            ? 'female'
            : 'male');
        return {
          speaker: speakerLabel,
          speakerName: speakerLabel,
          speakerId,
          gender,
          text: t.text.trim(),
          pauseAfterMs: t.pauseAfterMs ?? 450
        };
      });

    const totalWords = lines.reduce(
      (sum, l) => sum + l.text.split(/\s+/).filter(Boolean).length,
      0
    );

    if (lines.length === 0) {
      return {
        ok: false,
        source: 'dialogue',
        lines: [],
        totalWords: 0,
        error: 'No valid dialogue turns found for this listening section.'
      };
    }

    return {
      ok: true,
      source: 'dialogue',
      lines,
      totalWords
    };
  }

  return {
    ok: false,
    source: 'empty',
    lines: [],
    totalWords: 0,
    error: 'No listening audio script or dialogue available for this section.'
  };
}

/**
 * Evaluates a Practice Library Listening or Reading question answer using the canonical
 * `isListeningAnswerCorrect()` evaluator (preventing prefix/substring false positives and enforcing word limits).
 */
export function evaluateCambridgeQuestionAnswer(
  q: CambridgeQuestionItem | (Omit<CambridgeQuestionItem, 'partOrSection'> & { partOrSection?: number }),
  userAnswer: string
): boolean {
  return isListeningAnswerCorrect(
    {
      ...(q as any),
      questionType: (q as any).questionType || q.type || 'fill_in_blank'
    },
    userAnswer || ''
  );
}
