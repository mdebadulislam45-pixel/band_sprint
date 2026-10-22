/**
 * IELTS Sprint — Cambridge IELTS 11–21 Practice Library Database
 *
 * Provides a catalogue of volume-themed IELTS-style practice collections for volumes 11 through 21,
 * populated practice test sets across Listening, Reading, Writing, Speaking,
 * and a validated import pipeline for authorized test content JSON.
 */

import {
  CambridgeVolumeCatalogueEntry,
  CambridgeTestSet,
  CambridgeContentImportValidation,
  CambridgeEdition,
  CambridgeVolumeNumber,
  CambridgeTestNumber
} from '../types/cambridgeLibrary';
import { getOrCreateCambridgeTest } from './cambridgeTestGenerator';

// ============================================================================
// 1. VOLUME-THEMED IELTS-STYLE PRACTICE CATALOGUE
// ============================================================================

export const CAMBRIDGE_VOLUMES_CATALOGUE: CambridgeVolumeCatalogueEntry[] = [
  {
    volume: 21,
    title: 'Cambridge IELTS 21',
    publicationYear: 2026,
    availableEditions: ['Academic', 'General Training'],
    coverColor: 'from-amber-600 to-yellow-800',
    accentColor: '#F59E0B',
    difficultyRating: 'Band 6.5 – 9.0 (Contemporary)',
    testsCount: 4,
    description: 'A volume-themed collection of original IELTS-style practice activities and writing prompts.',
    availableTests: {
      Academic: [1, 2, 3, 4],
      'General Training': [1, 2, 3, 4]
    }
  },
  {
    volume: 20,
    title: 'Cambridge IELTS 20',
    publicationYear: 2025,
    availableEditions: ['Academic', 'General Training'],
    coverColor: 'from-violet-600 to-purple-800',
    accentColor: '#8B5CF6',
    difficultyRating: 'Band 6.5 – 9.0',
    testsCount: 4,
    description: 'Original IELTS-style practice themes include technology, climate, and marine biodiversity.',
    availableTests: {
      Academic: [1, 2, 3, 4],
      'General Training': [1, 2, 3, 4]
    }
  },
  {
    volume: 19,
    title: 'Cambridge IELTS 19',
    publicationYear: 2024,
    availableEditions: ['Academic', 'General Training'],
    coverColor: 'from-emerald-600 to-teal-800',
    accentColor: '#10B981',
    difficultyRating: 'Band 6.0 – 9.0',
    testsCount: 4,
    description: 'Original practice tests using a computer-delivered IELTS-style format.',
    availableTests: {
      Academic: [1, 2, 3, 4],
      'General Training': [1, 2, 3, 4]
    }
  },
  {
    volume: 18,
    title: 'Cambridge IELTS 18',
    publicationYear: 2023,
    availableEditions: ['Academic', 'General Training'],
    coverColor: 'from-blue-600 to-indigo-800',
    accentColor: '#2563EB',
    difficultyRating: 'Band 6.0 – 9.0',
    testsCount: 4,
    description: 'Original practice content designed to exercise IELTS-style Listening, Reading, Writing and Speaking skills.',
    availableTests: {
      Academic: [1, 2, 3, 4],
      'General Training': [1, 2, 3, 4]
    }
  },
  {
    volume: 17,
    title: 'Cambridge IELTS 17',
    publicationYear: 2022,
    availableEditions: ['Academic', 'General Training'],
    coverColor: 'from-red-600 to-rose-800',
    accentColor: '#E11D48',
    difficultyRating: 'Band 6.0 – 8.5',
    testsCount: 4,
    description: 'Original practice themes include urban planning, science, and argumentative writing.',
    availableTests: {
      Academic: [1, 2, 3, 4],
      'General Training': [1, 2, 3, 4]
    }
  },
  {
    volume: 16,
    title: 'Cambridge IELTS 16',
    publicationYear: 2021,
    availableEditions: ['Academic', 'General Training'],
    coverColor: 'from-cyan-600 to-blue-800',
    accentColor: '#06B6D4',
    difficultyRating: 'Band 6.0 – 8.5',
    testsCount: 4,
    description: 'Original IELTS-style practice covering accommodation, research, and academic reading.',
    availableTests: {
      Academic: [1, 2, 3, 4],
      'General Training': [1, 2, 3, 4]
    }
  },
  {
    volume: 15,
    title: 'Cambridge IELTS 15',
    publicationYear: 2020,
    availableEditions: ['Academic', 'General Training'],
    coverColor: 'from-teal-600 to-emerald-900',
    accentColor: '#0D9488',
    difficultyRating: 'Band 6.0 – 8.5',
    testsCount: 4,
    description: 'Original practice themes include community services, energy, and environmental science.',
    availableTests: {
      Academic: [1, 2, 3, 4],
      'General Training': [1, 2, 3, 4]
    }
  },
  {
    volume: 14,
    title: 'Cambridge IELTS 14',
    publicationYear: 2019,
    availableEditions: ['Academic', 'General Training'],
    coverColor: 'from-orange-600 to-amber-800',
    accentColor: '#EA580C',
    difficultyRating: 'Band 5.5 – 8.5',
    testsCount: 4,
    description: 'Foundational 4-skill testing series with high frequency Academic Vocabulary List (AVL) coverage and structured speaking cue cards.',
    availableTests: {
      Academic: [1, 2, 3, 4],
      'General Training': [1, 2, 3, 4]
    }
  },
  {
    volume: 13,
    title: 'Cambridge IELTS 13',
    publicationYear: 2018,
    availableEditions: ['Academic', 'General Training'],
    coverColor: 'from-slate-700 to-slate-900',
    accentColor: '#475569',
    difficultyRating: 'Band 5.5 – 8.5',
    testsCount: 4,
    description: 'Rigorous academic reading passages on cognitive psychology, aviation safety, and global urbanization trends.',
    availableTests: {
      Academic: [1, 2, 3, 4],
      'General Training': [1, 2, 3, 4]
    }
  },
  {
    volume: 12,
    title: 'Cambridge IELTS 12',
    publicationYear: 2017,
    availableEditions: ['Academic', 'General Training'],
    coverColor: 'from-indigo-700 to-blue-950',
    accentColor: '#4338CA',
    difficultyRating: 'Band 5.5 – 8.0',
    testsCount: 4,
    description: 'Historical Cambridge edition featuring traditional British RP speakers, heritage conservation readings, and civic policy discussions.',
    availableTests: {
      Academic: [1, 2, 3, 4],
      'General Training': [1, 2, 3, 4]
    }
  },
  {
    volume: 11,
    title: 'Cambridge IELTS 11',
    publicationYear: 2016,
    availableEditions: ['Academic', 'General Training'],
    coverColor: 'from-zinc-700 to-slate-900',
    accentColor: '#52525B',
    difficultyRating: 'Band 5.5 – 8.0',
    testsCount: 4,
    description: 'The inaugural modern volume establishing the separate Academic and General Training 4-test annual publication standard.',
    availableTests: {
      Academic: [1, 2, 3, 4],
      'General Training': [1, 2, 3, 4]
    }
  }
];

// ============================================================================
// 2. POPULATED PRACTICE TEST SETS
// ============================================================================

export const INITIAL_CAMBRIDGE_TESTS: CambridgeTestSet[] = [
  // --------------------------------------------------------------------------
  // CAMBRIDGE 18 · ACADEMIC TEST 1
  // --------------------------------------------------------------------------
  {
    id: 'cambridge-18-academic-test-1',
    volume: 18,
    edition: 'Academic',
    testNumber: 1,
    title: 'Cambridge 18 · Academic Test 1',
    description: 'Full 4-skill Cambridge Academic practice examination: university admissions interview, biodiversity passage, and economic impact essay.',
    provenance: 'original_practice',
    provenanceNote: 'Original IELTS-style practice material; not official Cambridge test content.',
    version: 1,
    updatedAt: 1711200000000,
    availableModules: ['listening', 'reading', 'writing', 'speaking'],
    listening: {
      title: 'University Admissions & Marine Research Station',
      contextDescription: 'Standard 4-part IELTS Listening test with 40 questions and native British audio scripts.',
      parts: [
        {
          partNumber: 1,
          title: 'Part 1: University Orientation & Course Registration',
          description: 'A conversation between a university admissions officer (Arthur) and a prospective postgraduate student (Liam).',
          audioScript: 'Good morning, University Admissions. My name is Arthur Davies. How may I direct your call today?',
          dialogue: [
            { speaker: 'Admissions Officer (Arthur)', speakerId: 'speaker_04', text: 'Good morning, University Admissions and Student Services. My name is Arthur Davies. How may I direct your call today?', pauseAfterMs: 450 },
            { speaker: 'Liam', speakerId: 'speaker_01', text: 'Good morning, Mr. Davies. I am calling from Manchester regarding my postgraduate verification details for the upcoming autumn term. My surname is Pennington. That is spelled P-E-N-N-I-N-G-T-O-N.', pauseAfterMs: 450 },
            { speaker: 'Admissions Officer (Arthur)', speakerId: 'speaker_04', text: 'Thank you, Mr. Pennington. And could you confirm your active contact telephone number?', pauseAfterMs: 400 },
            { speaker: 'Liam', speakerId: 'speaker_01', text: 'Yes, my daytime number is 07890 456123. My active mobile is 07890 456123.', pauseAfterMs: 450 },
            { speaker: 'Admissions Officer (Arthur)', speakerId: 'speaker_04', text: 'Which engineering specialist track have you finalized?', pauseAfterMs: 400 },
            { speaker: 'Liam', speakerId: 'speaker_01', text: 'I am fully committed to specializing in Renewable Energy Systems.', pauseAfterMs: 450 },
            { speaker: 'Admissions Officer (Arthur)', speakerId: 'speaker_04', text: 'Excellent. To find the Language Laboratory on induction day, walk past the central library heading north, tucked directly behind the North Auditorium.', pauseAfterMs: 500 },
            { speaker: 'Liam', speakerId: 'speaker_01', text: 'Directly behind the North Auditorium along the gravel path. Got it, thank you!', pauseAfterMs: 450 }
          ],
          questions: [
            {
              id: 'c18-a-t1-l-q1',
              questionNumber: 1,
              partOrSection: 1,
              type: 'note_completion',
              prompt: 'Candidate Surname (spelled letter-by-letter):',
              correctAnswer: 'PENNINGTON',
              acceptableAnswers: ['Pennington', 'PENNINGTON'],
              explanation: 'Liam spells his surname clearly: P-E-N-N-I-N-G-T-O-N.',
              wordLimit: 1
            },
            {
              id: 'c18-a-t1-l-q2',
              questionNumber: 2,
              partOrSection: 1,
              type: 'note_completion',
              prompt: 'Active mobile telephone contact number:',
              correctAnswer: '07890456123',
              acceptableAnswers: ['07890 456123', '07890456123'],
              explanation: 'Liam initially mentions an old landline, then clarifies his active mobile number: 07890 456123.',
              wordLimit: 2
            },
            {
              id: 'c18-a-t1-l-q3',
              questionNumber: 3,
              partOrSection: 1,
              type: 'multiple_choice',
              prompt: 'Liam has selected which engineering specialist track?',
              options: [
                'A) Civil Infrastructure',
                'B) Biomedical Robotics',
                'C) Renewable Energy Systems'
              ],
              correctAnswer: 'C',
              acceptableAnswers: ['C', 'C) Renewable Energy Systems', 'Renewable Energy Systems'],
              explanation: 'Liam confirms: "I am fully committed to specializing in Renewable Energy Systems."'
            },
            {
              id: 'c18-a-t1-l-q4',
              questionNumber: 4,
              partOrSection: 1,
              type: 'note_completion',
              prompt: 'The Language Laboratory is situated behind the:',
              correctAnswer: 'North Auditorium',
              acceptableAnswers: ['north auditorium', 'North Auditorium', 'Auditorium'],
              explanation: 'The admissions officer advises that it is tucked directly behind the North Auditorium.',
              wordLimit: 2
            }
          ]
        },
        {
          partNumber: 2,
          title: 'Part 2: Community Nature Reserve & Trail Guide',
          description: 'A local wildlife coordinator (Charlotte) introduces visitor guidelines for the estuary nature sanctuary.',
          audioScript: 'Welcome everyone to the Blackwood Estuary Nature Sanctuary. Before we begin our guided tour of the salt marsh, please note our visitor guidelines.',
          questions: [
            {
              id: 'c18-a-t1-l-q5',
              questionNumber: 5,
              partOrSection: 2,
              type: 'multiple_choice',
              prompt: 'Visitors wishing to access the outer wetland boardwalk must:',
              options: [
                'A) Book an accredited guide in advance',
                'B) Display a valid visitor pass badge',
                'C) Wear protective footwear at all times'
              ],
              correctAnswer: 'B',
              acceptableAnswers: ['B', 'B) Display a valid visitor pass badge'],
              explanation: 'The guide emphasizes that everyone must display a valid visitor pass badge.'
            }
          ]
        },
        {
          partNumber: 3,
          title: 'Part 3: Academic Seminar on Coastal Geomorphology',
          description: 'A university tutor (Dr. Sterling) reviews field research methodology with two postgraduate students.',
          audioScript: 'Dr. Sterling: Let us review your field measurements from the coastal spit survey last Thursday.',
          questions: [
            {
              id: 'c18-a-t1-l-q6',
              questionNumber: 6,
              partOrSection: 3,
              type: 'matching',
              prompt: 'What observation was recorded regarding sediment accumulation in Zone B?',
              options: [
                'A) Exceeded historical baseline averages',
                'B) Remained constant across seasons',
                'C) Decreased due to offshore dredging'
              ],
              correctAnswer: 'A',
              acceptableAnswers: ['A'],
              explanation: 'The students noted that sediment deposition exceeded all prior historical baselines.'
            }
          ]
        },
        {
          partNumber: 4,
          title: 'Part 4: Academic Lecture on Marine Biomimicry',
          description: 'A lecture on how shark denticles and whale flippers inspire aerodynamic engineering.',
          audioScript: 'In today’s lecture on bio-inspired propulsion, we explore how natural adaptations in pelagic marine species inform high-speed fluid dynamics.',
          questions: [
            {
              id: 'c18-a-t1-l-q7',
              questionNumber: 7,
              partOrSection: 4,
              type: 'sentence_completion',
              prompt: 'Shark skin reduces drag primarily through microscopic riblet structures called:',
              correctAnswer: 'dermal denticles',
              acceptableAnswers: ['denticles', 'dermal denticles'],
              explanation: 'The lecturer highlights the microscopic ridges known as dermal denticles.',
              wordLimit: 2
            }
          ]
        }
      ]
    },
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
  // CAMBRIDGE 17 · ACADEMIC TEST 1
  // --------------------------------------------------------------------------
  {
    id: 'cambridge-17-academic-test-1',
    volume: 17,
    edition: 'Academic',
    testNumber: 1,
    title: 'Cambridge 17 · Academic Test 1',
    description: 'Autonomous logistics inspection, thermodynamics of renewable energy storage, and secondary education curricula.',
    provenance: 'original_practice',
    provenanceNote: 'Original IELTS-style practice material; not official Cambridge test content.',
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
  // CAMBRIDGE 19 · GENERAL TRAINING TEST 1
  // --------------------------------------------------------------------------
  {
    id: 'cambridge-19-general-training-test-1',
    volume: 19,
    edition: 'General Training',
    testNumber: 1,
    title: 'Cambridge 19 · General Training Test 1',
    description: 'Workplace health and safety notices, employee relocation guidelines, and formal letter of enquiry.',
    provenance: 'original_practice',
    provenanceNote: 'Original IELTS-style practice material; not official Cambridge test content.',
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

const CUSTOM_TESTS_STORAGE_KEY = 'ielts_sprint_cambridge_custom_tests_v1';

export function getAllCambridgeTests(): CambridgeTestSet[] {
  let customTests: CambridgeTestSet[] = [];
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(CUSTOM_TESTS_STORAGE_KEY);
      if (raw) {
        customTests = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[CambridgeLibrary] Failed to load custom tests from localStorage:', e);
    }
  }

  // Merge built-in initial tests with any user-imported custom tests (custom overrides by ID)
  const map = new Map<string, CambridgeTestSet>();
  INITIAL_CAMBRIDGE_TESTS.forEach((t) => map.set(t.id, t));
  customTests.forEach((t) => map.set(t.id, t));

  // Generate original IELTS-style practice sets for each catalogue volume, edition and test number
  for (let v = 11; v <= 21; v++) {
    for (let t = 1; t <= 4; t++) {
      const acadId = `cambridge-${v}-academic-test-${t}`;
      if (!map.has(acadId)) {
        map.set(acadId, getOrCreateCambridgeTest(v as CambridgeVolumeNumber, 'Academic', t as CambridgeTestNumber));
      }
      const gtId = `cambridge-${v}-general-training-test-${t}`;
      if (!map.has(gtId)) {
        map.set(gtId, getOrCreateCambridgeTest(v as CambridgeVolumeNumber, 'General Training', t as CambridgeTestNumber));
      }
    }
  }

  return Array.from(map.values());
}

export function getCambridgeTestById(testId: string): CambridgeTestSet | null {
  const all = getAllCambridgeTests();
  const direct = all.find((t) => t.id === testId);
  if (direct) return direct;

  const match = testId.match(/cambridge-(\d+)-(academic|general-training)-test-(\d+)/i);
  if (match) {
    const vol = parseInt(match[1], 10) as CambridgeVolumeNumber;
    const edition: CambridgeEdition = match[2].toLowerCase() === 'academic' ? 'Academic' : 'General Training';
    const testNum = parseInt(match[3], 10) as CambridgeTestNumber;
    if (vol >= 11 && vol <= 21 && testNum >= 1 && testNum <= 4) {
      return getOrCreateCambridgeTest(vol, edition, testNum);
    }
  }

  return null;
}

export function getCambridgeTestsByVolumeAndEdition(
  volume: CambridgeVolumeNumber,
  edition: CambridgeEdition
): CambridgeTestSet[] {
  const tests: CambridgeTestSet[] = [];
  for (let tNum = 1; tNum <= 4; tNum++) {
    const id = `cambridge-${volume}-${edition.toLowerCase().replace(/\s+/g, '-')}-test-${tNum}`;
    const found = getCambridgeTestById(id) || getOrCreateCambridgeTest(volume, edition, tNum as CambridgeTestNumber);
    tests.push(found);
  }
  return tests;
}

export { getOrCreateCambridgeTest };

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
      `cambridge-${validation.metadata!.volume}-${validation.metadata!.edition.toLowerCase().replace(/\s+/g, '-')}-test-${validation.metadata!.testNumber}`;

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
      window.dispatchEvent(new CustomEvent('cambridge_library_updated', { detail: { testId } }));
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
