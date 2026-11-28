import type { IELTSQuestion } from '../services/QuestionEngine';

/**
 * BandSprint — Extra Official-Style Practice Pool (+24 Questions across all 4 modules)
 * - 8 Listening (Sections 1–4, multi-speaker official studio & deep elder voices)
 * - 6 Reading (Academic TFNG / MCQ / Short Answer)
 * - 5 Writing (Task 1 & Task 2 exam prompts)
 * - 5 Speaking (Parts 1, 2 & 3 exam prompts)
 */
export const EXTRA_COMPREHENSIVE_QUESTIONS: IELTSQuestion[] = [
  // =========================================================================
  // LISTENING (+8 Interactive Drills across Sections 1–4)
  // =========================================================================
  {
    id: 'lis_ext_s1_01',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'easy',
    topic: 'Community Sports Club Registration',
    skillTags: ['spelling', 'names', 'self_correction'],
    prompt: 'New member surname: [1]',
    correctAnswer: 'GALLAGHER',
    acceptableAnswers: ['gallagher', 'Gallagher'],
    explanation: 'The caller spells her surname clearly: G-A-L-L-A-G-H-E-R.',
    dialogue: [
      {
        speaker: 'Coordinator (Clara)',
        speakerId: 'speaker_01',
        gender: 'female',
        text: 'Good morning, Riverside Rowing and Tennis Club. Could I take your surname to open your membership file?'
      },
      {
        speaker: 'Applicant (Niamh)',
        speakerId: 'speaker_21',
        gender: 'female',
        text: 'Of course, it is Gallagher. That is spelled G-A-L-L-A-G-H-E-R.'
      }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1710012000001
  },
  {
    id: 'lis_ext_s1_02',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'medium',
    topic: 'Community Sports Club Registration',
    skillTags: ['fees', 'distractor_handling'],
    prompt: 'Monthly off-peak membership fee: £[2]',
    correctAnswer: '38',
    acceptableAnswers: ['38', '£38', '38 pounds'],
    explanation: 'Full all-day access is £54, while the off-peak morning membership she selects is £38.',
    dialogue: [
      {
        speaker: 'Coordinator (Clara)',
        speakerId: 'speaker_01',
        gender: 'female',
        text: 'Our full all-day tier is fifty-four pounds a month, whereas off-peak morning access before three o’clock is thirty-eight pounds.'
      },
      {
        speaker: 'Applicant (Niamh)',
        speakerId: 'speaker_21',
        gender: 'female',
        text: 'I only train before work anyway, so let’s go with the off-peak plan at thirty-eight pounds.'
      }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1710012000002
  },
  {
    id: 'lis_ext_s2_01',
    module: 'listening',
    section: 2,
    questionType: 'multiple_choice',
    difficulty: 'medium',
    topic: 'Historic Railway Museum Guided Tour',
    skillTags: ['detail_listening', 'distractor_elimination'],
    prompt: 'Why is the Steam Locomotive Shed temporarily closed to general visitors this morning?',
    options: [
      'A. A film crew is recording a period documentary inside',
      'B. Engineers are conducting annual boiler pressure inspections',
      'C. The roof glazing is being replaced after storm damage'
    ],
    correctAnswer: 'B',
    acceptableAnswers: ['B', 'Engineers are conducting annual boiler pressure inspections'],
    explanation: 'Grandpa Reginald clarifies that the film crew left yesterday and roof repairs finished in March; today’s closure is for boiler pressure inspections.',
    dialogue: [
      {
        speaker: 'Head Curator (Grandpa Reginald)',
        speakerId: 'speaker_23',
        gender: 'male',
        text: 'Welcome to the York Heritage Railway Museum. Before we head down to the platforms, one quick schedule note: the Steam Locomotive Shed is closed until one o’clock today. Several visitors asked if the television film crew is still shooting—they actually wrapped up yesterday afternoon, and our roof repairs were completed back in March. This morning’s closure is strictly for our mandatory annual boiler pressure inspections.'
      }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1710012000003
  },
  {
    id: 'lis_ext_s2_02',
    module: 'listening',
    section: 2,
    questionType: 'short_answer',
    difficulty: 'medium',
    topic: 'Coastal Marine Sanctuary Orientation',
    skillTags: ['location_tracking', 'specific_detail'],
    prompt: 'Where should volunteers report at 8:45 a.m. to collect waterproof boots and clipboards?',
    correctAnswer: 'THE BOATHOUSE',
    acceptableAnswers: ['the boathouse', 'boathouse', 'Boathouse'],
    explanation: 'Uncle Graham instructs volunteers to report to the Boathouse rather than the main Visitor Centre.',
    dialogue: [
      {
        speaker: 'Ranger (Uncle Graham)',
        speakerId: 'speaker_25',
        gender: 'male',
        text: 'G’day everyone, and thanks for joining our dawn reef survey. Please don’t queue up at the main Visitor Centre—it doesn’t unlock until nine-thirty. Instead, walk along the timber boardwalk to the Boathouse at eight forty-five sharp, where we’ve laid out your waterproof boots and waterproof clipboards.'
      }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1710012000004
  },
  {
    id: 'lis_ext_s3_01',
    module: 'listening',
    section: 3,
    questionType: 'multiple_choice',
    difficulty: 'hard',
    topic: 'Architectural Acoustics Dissertation Review',
    skillTags: ['speaker_agreement', 'academic_reasoning'],
    prompt: 'What do both students agree is the main weakness of their initial library noise survey?',
    options: [
      'A. The acoustic decibel meters were improperly calibrated',
      'B. Measurements were only recorded during quiet mid-term weeks',
      'C. Too few postgraduate students answered the questionnaire'
    ],
    correctAnswer: 'B',
    acceptableAnswers: ['B', 'Measurements were only recorded during quiet mid-term weeks'],
    explanation: 'Both Liam and Dr. Vance/Hannah agree that capturing readings only during quiet mid-term weeks skewed the data; they must re-measure during exam week.',
    dialogue: [
      {
        speaker: 'Liam',
        speakerId: 'speaker_05',
        gender: 'male',
        text: 'Hannah, I checked the acoustic meter calibration logs twice—the hardware readings are spotless, and we actually got plenty of postgraduate replies.'
      },
      {
        speaker: 'Hannah',
        speakerId: 'speaker_04',
        gender: 'female',
        text: 'True, the real flaw is our sampling window. Because we only measured ambient decibels during a quiet mid-term week, we completely missed the peak crowding of final exams.'
      },
      {
        speaker: 'Liam',
        speakerId: 'speaker_05',
        gender: 'male',
        text: 'Spot on—let’s schedule a second recording sweep during finals fortnight to make the dataset credible.'
      }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1710012000005
  },
  {
    id: 'lis_ext_s3_02',
    module: 'listening',
    section: 3,
    questionType: 'short_answer',
    difficulty: 'hard',
    topic: 'Urban Micro-Forest Ecology Project',
    skillTags: ['technical_vocabulary', 'paraphrase_recognition'],
    prompt: 'What Japanese planting method are the ecology students testing on their campus courtyard?',
    correctAnswer: 'MIYAWAKI',
    acceptableAnswers: ['Miyawaki', 'miyawaki', 'Miyawaki method'],
    explanation: 'Dr. Eleanor confirms the high-density native sapling approach is called the Miyawaki method.',
    dialogue: [
      {
        speaker: 'Tutor (Dr. Eleanor Vance)',
        speakerId: 'speaker_18',
        gender: 'female',
        text: 'Your courtyard biodiversity plot is coming along nicely. Remind the assessment panel what you call that dense native-species planting technique developed by Japanese botanist Akira Miyawaki?'
      },
      {
        speaker: 'Student (Ethan)',
        speakerId: 'speaker_08',
        gender: 'male',
        text: 'Yes, it’s the Miyawaki method—M-I-Y-A-W-A-K-I—where we plant three to four native saplings per square metre so they compete upward for light and mature ten times faster.'
      }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1710012000006
  },
  {
    id: 'lis_ext_s4_01',
    module: 'listening',
    section: 4,
    questionType: 'sentence_completion',
    difficulty: 'hard',
    topic: 'Ancient Roman Hydraulic Concrete',
    skillTags: ['lecture_comprehension', 'scientific_process'],
    prompt: 'When seawater penetrates Roman marine concrete, hot-mixed quicklime clasts recrystallize to heal tiny [1] automatically.',
    correctAnswer: 'CRACKS',
    acceptableAnswers: ['cracks', 'micro-cracks', 'microcracks', 'fissures'],
    explanation: 'Grandpa Roger explains that lime clasts dissolve upon seawater ingress and recrystallize to seal micro-cracks automatically.',
    dialogue: [
      {
        speaker: 'Professor Emeritus (Grandpa Roger)',
        speakerId: 'speaker_24',
        gender: 'male',
        text: 'Modern Portland cement breakwaters typically begin eroding after fifty years of saltwater exposure, yet Roman harbour piers have endured two millennia of Mediterranean storms. Recent MIT spectroscopy solved this riddle: Roman builders used hot-mixing, leaving tiny white quicklime clasts embedded inside the mortar. Whenever seawater infiltrates fresh cracks, those calcium-rich clasts dissolve and recrystallize, automatically sealing the cracks before structural collapse can occur.'
      }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1710012000007
  },
  {
    id: 'lis_ext_s4_02',
    module: 'listening',
    section: 4,
    questionType: 'short_answer',
    difficulty: 'hard',
    topic: 'Migratory Bird Magnetoreception',
    skillTags: ['lecture_comprehension', 'biology_terminology'],
    prompt: 'Which light-sensitive protein inside a robin’s eye is believed to help it sense Earth’s magnetic field?',
    correctAnswer: 'CRYPTOCHROME',
    acceptableAnswers: ['cryptochrome', 'Cryptochrome'],
    explanation: 'Grandpa Seamus names cryptochrome as the light-sensitive retinal protein linked to avian magnetoreception.',
    dialogue: [
      {
        speaker: 'Ornithologist (Grandpa Seamus)',
        speakerId: 'speaker_26',
        gender: 'male',
        text: 'How does a European robin weighing less than twenty grams navigate three thousand kilometres each autumn without a GPS? Biophysical research now points to quantum entanglement inside a light-sensitive retinal protein called cryptochrome. Under blue twilight, electron pairs inside cryptochrome respond subtly to the inclination angle of Earth’s magnetic field, effectively painting a compass overlay directly onto the bird’s visual field.'
      }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1710012000008
  },

  // =========================================================================
  // READING (+6 Academic Comprehension Drills)
  // =========================================================================
  {
    id: 'rd_ext_01',
    module: 'reading',
    section: 1,
    questionType: 'true_false_not_given',
    difficulty: 'medium',
    topic: 'Polynesian Wayfinding Navigation',
    skillTags: ['tfng', 'detail_verification'],
    passageTitle: 'Reading the Swells: Non-Instrument Pacific Navigation',
    passage:
      'Centuries before European vessels carried magnetic compasses across open oceans, Polynesian master navigators—known as wayfinders—sailed double-hulled voyaging canoes across thousands of kilometres of open Pacific water without charts or metallic instruments. Rather than relying solely on rising star paths near the horizon, wayfinders trained for decades to sense subtle ocean swell refractions bouncing off unseen islands up to fifty kilometres away, often lying flat inside the hull at night to feel the rhythmic pitch of colliding wave trains.',
    prompt: 'TRUE, FALSE, or NOT GIVEN: Polynesian wayfinders depended exclusively on star constellations to locate distant islands.',
    options: ['TRUE', 'FALSE', 'NOT GIVEN'],
    correctAnswer: 'FALSE',
    acceptableAnswers: ['FALSE', 'false'],
    explanation: 'The passage explicitly states "Rather than relying solely on rising star paths", they also read ocean swell refractions bouncing off unseen islands.',
    source: 'sprint_standard',
    version: 1,
    createdAt: 1710012000009
  },
  {
    id: 'rd_ext_02',
    module: 'reading',
    section: 2,
    questionType: 'multiple_choice',
    difficulty: 'medium',
    topic: 'Mycelium Packaging & Circular Materials',
    skillTags: ['inference', 'cause_and_effect'],
    passageTitle: 'Grown, Not Moulded: Fungal Packaging Innovations',
    passage:
      'Expanded polystyrene foam protects fragile electronics cheaply, yet persists in landfills for centuries and fragments into pervasive microplastics. Seeking a biodegradable replacement, material scientists combine agricultural husks—such as hemp hurds or rice chaff—with living fungal mycelium inside custom trays. Within seven days, microscopic root filaments bind the husks into a lightweight, shock-absorbent solid that is heat-cured to halt further growth. Once discarded in garden soil, mycelium foam decomposes completely within forty-five days, though higher manufacturing lead times still restrict its adoption among ultra-high-volume electronics distributors.',
    prompt: 'Why have ultra-high-volume electronics distributors been cautious about switching fully to mycelium packaging?',
    options: [
      'A. It fails to absorb shocks during long-distance shipping',
      'B. Its production requires longer manufacturing lead times',
      'C. Fungal filaments continue growing inside sealed shipping boxes'
    ],
    correctAnswer: 'B',
    acceptableAnswers: ['B'],
    explanation: 'The final sentence directly notes that "higher manufacturing lead times still restrict its adoption among ultra-high-volume electronics distributors".',
    source: 'sprint_standard',
    version: 1,
    createdAt: 1710012000010
  },
  {
    id: 'rd_ext_03',
    module: 'reading',
    section: 2,
    questionType: 'true_false_not_given',
    difficulty: 'hard',
    topic: 'Bilingual Executive Function',
    skillTags: ['tfng', 'scientific_hedging'],
    passageTitle: 'The Bilingual Brain & Cognitive Reserve',
    passage:
      'Early twentieth-century educators frequently discouraged immigrant families from raising children bilingually, fearing that juggling two lexicons would trigger chronic linguistic confusion. Contemporary neuroimaging has overturned that verdict. Because both languages remain simultaneously active in a bilingual mind, speakers continuously recruit the prefrontal cortex to inhibit the non-target language—a lifelong mental workout associated in several epidemiological studies with a four-to-five-year delay in the clinical onset of dementia symptoms, even though bilinguals show similar underlying brain pathology.',
    prompt: 'TRUE, FALSE, or NOT GIVEN: Bilingualism prevents physical dementia pathology from developing inside brain tissue.',
    options: ['TRUE', 'FALSE', 'NOT GIVEN'],
    correctAnswer: 'FALSE',
    acceptableAnswers: ['FALSE', 'false'],
    explanation: 'The passage specifies bilingualism delays clinical SYMPTOMS by 4–5 years "even though bilinguals show similar underlying brain pathology".',
    source: 'sprint_standard',
    version: 1,
    createdAt: 1710012000011
  },
  {
    id: 'rd_ext_04',
    module: 'reading',
    section: 3,
    questionType: 'short_answer',
    difficulty: 'hard',
    topic: 'Passive Radiative Cooling Coatings',
    skillTags: ['scanning', 'exact_noun_phrase'],
    passageTitle: 'Mirror-White Paint That Cools Below Ambient Air',
    passage:
      'Conventional white roof coatings reflect roughly 80% of incoming sunlight, slowing heat gain yet still remaining warmer than surrounding afternoon air. In 2021, Purdue University engineers formulated an ultra-white barium sulphate paint capable of reflecting 98.1% of solar radiation while simultaneously emitting mid-infrared heat straight through Earth’s atmospheric window into deep space. Because the coated surface radiates away more thermal energy than it absorbs, rooftop panels stayed up to 4.5 degrees Celsius cooler than ambient midday air without consuming a single watt of electricity.',
    prompt: 'What chemical compound is used in the Purdue ultra-white paint to achieve 98.1% solar reflectance? (NO MORE THAN TWO WORDS)',
    correctAnswer: 'BARIUM SULPHATE',
    acceptableAnswers: ['barium sulphate', 'barium sulfate', 'Barium sulphate', 'Barium sulfate'],
    explanation: 'The passage identifies the compound directly as "barium sulphate".',
    source: 'sprint_standard',
    version: 1,
    createdAt: 1710012000012
  },
  {
    id: 'rd_ext_05',
    module: 'reading',
    section: 3,
    questionType: 'true_false_not_given',
    difficulty: 'medium',
    topic: 'Vertical Farming & Urban Agronomy',
    skillTags: ['tfng', 'not_given_detection'],
    passageTitle: 'Skyscraper Farms: Promise and Thermodynamic Limits',
    passage:
      'Indoor hydroponic vertical farms recycle up to 95% of irrigation water and eliminate agricultural runoff by cultivating leafy greens beneath calibrated LED arrays inside urban warehouses. Critics nonetheless point out a stark thermodynamic constraint: while lettuce, basil, and strawberries flourish indoors, staple calorie crops such as wheat, rice, and maize demand vastly higher photon flux per kilogram, rendering indoor grain cultivation economically unviable under current electricity prices.',
    prompt: 'TRUE, FALSE, or NOT GIVEN: Singapore currently operates more commercial vertical farms than any other Asian country.',
    options: ['TRUE', 'FALSE', 'NOT GIVEN'],
    correctAnswer: 'NOT GIVEN',
    acceptableAnswers: ['NOT GIVEN', 'not given'],
    explanation: 'The passage never mentions Singapore or compares national counts of vertical farms.',
    source: 'sprint_standard',
    version: 1,
    createdAt: 1710012000013
  },
  {
    id: 'rd_ext_06',
    module: 'reading',
    section: 3,
    questionType: 'multiple_choice',
    difficulty: 'hard',
    topic: 'Behavioral Economics & Default Architecture',
    skillTags: ['main_idea', 'policy_analysis'],
    passageTitle: 'Choice Architecture & Opt-Out Pension Enrolment',
    passage:
      'Classical economic models assume workers rationally calculate retirement needs and enrol promptly in employer-matched savings plans. In reality, status-quo bias leads millions to postpone signing up indefinitely despite forfeiting generous employer contributions. When the United Kingdom shifted workplace pensions from voluntary opt-in to automatic opt-out enrolment in 2012—allowing employees to withdraw freely at any moment—participation among eligible private-sector staff surged from 42% to over 86% within a decade, demonstrating how subtle default design reshapes long-term financial security without restricting individual liberty.',
    prompt: 'What is the author’s primary point regarding the UK’s 2012 pension reform?',
    options: [
      'A. Workers should be legally prohibited from withdrawing from workplace pensions',
      'B. Changing default choice architecture dramatically boosts participation while preserving freedom of choice',
      'C. Employer matching contributions were the sole reason pension savings doubled'
    ],
    correctAnswer: 'B',
    acceptableAnswers: ['B'],
    explanation: 'The passage highlights that automatic opt-out doubled participation from 42% to >86% "without restricting individual liberty".',
    source: 'sprint_standard',
    version: 1,
    createdAt: 1710012000014
  },

  // =========================================================================
  // WRITING (+5 Official-Style Prompts for Adaptive Engine)
  // =========================================================================
  {
    id: 'wrt_ext_01',
    module: 'writing',
    section: 1,
    questionType: 'task1_process',
    difficulty: 'medium',
    topic: 'Geothermal District Heating Plant Process',
    skillTags: ['task1_overview', 'passive_voice', 'sequencing'],
    prompt:
      'The diagram shows how deep geothermal reservoirs are tapped to supply zero-carbon district heating to residential apartments in Reykjavik. Summarise the main stages in at least 150 words.',
    explanation:
      'Include a concise Overview noting the circular closed-loop flow (cold water injection -> fractured bedrock heating -> heat exchanger -> municipal pipes -> reinjection) and use passive academic verbs.',
    source: 'sprint_standard',
    version: 1,
    createdAt: 1710012000015
  },
  {
    id: 'wrt_ext_02',
    module: 'writing',
    section: 1,
    questionType: 'task1_chart',
    difficulty: 'medium',
    topic: 'Global Electric vs Petrol Passenger Car Sales (2019–2025)',
    skillTags: ['data_comparison', 'trend_vocabulary'],
    prompt:
      'The bar chart compares the market share (%) of battery-electric, plug-in hybrid, and internal-combustion passenger vehicles sold across Norway, China, Germany, and the United States in 2019 and 2025. Summarise the key trends and make relevant comparisons.',
    explanation:
      'Group leaders (Norway >85% EV, China rapid surge) versus laggards, highlight relative growth multiples, and avoid listing every number mechanically.',
    source: 'sprint_standard',
    version: 1,
    createdAt: 1710012000016
  },
  {
    id: 'wrt_ext_03',
    module: 'writing',
    section: 2,
    questionType: 'task2_opinion',
    difficulty: 'hard',
    topic: 'Four-Day Working Week Productivity',
    skillTags: ['argumentation', 'cohesion', 'lexical_precision'],
    prompt:
      'A growing number of companies are trialling a four-day working week with no reduction in pay. To what extent do you agree or disagree that shorter working weeks benefit both employers and society?',
    explanation:
      'Take a clear stance; balance reduced burnout and higher hourly focus in knowledge industries against shift-coverage constraints in hospitals and manufacturing.',
    source: 'sprint_standard',
    version: 1,
    createdAt: 1710012000017
  },
  {
    id: 'wrt_ext_04',
    module: 'writing',
    section: 2,
    questionType: 'task2_discussion',
    difficulty: 'hard',
    topic: 'Preserving Endangered Regional Languages',
    skillTags: ['balanced_discussion', 'cultural_lexis'],
    prompt:
      'Some linguists argue that governments should invest significant funds to preserve endangered minority languages, while others contend that having fewer global languages improves economic efficiency. Discuss both views and give your own opinion.',
    explanation:
      'Evaluate cultural heritage, ecological taxonomy, and cognitive diversity against administrative translation costs and cross-border commerce.',
    source: 'sprint_standard',
    version: 1,
    createdAt: 1710012000018
  },
  {
    id: 'wrt_ext_05',
    module: 'writing',
    section: 2,
    questionType: 'task2_problem_solution',
    difficulty: 'hard',
    topic: 'Right to Repair & Electronic Waste Crisis',
    skillTags: ['problem_solution', 'environmental_policy'],
    prompt:
      'Global electronic waste is rising sharply as consumers replace smartphones and appliances every few years rather than repairing them. What causes this throwaway culture, and what measures could encourage longer device lifespans?',
    explanation:
      'Address planned obsolescence, glued non-replaceable batteries, and steep repair pricing; propose right-to-repair legislation, modular spare parts, and repairability scores.',
    source: 'sprint_standard',
    version: 1,
    createdAt: 1710012000019
  },

  // =========================================================================
  // SPEAKING (+5 Official-Style Interactive Prompts across Parts 1–3)
  // =========================================================================
  {
    id: 'spk_ext_p1_01',
    module: 'speaking',
    section: 1,
    questionType: 'part1_interview',
    difficulty: 'easy',
    topic: 'Libraries & Quiet Study Spaces',
    skillTags: ['fluency', 'natural_collocations'],
    prompt: 'Do you prefer studying in a public library or in your own room at home, and why?',
    explanation: 'Compare ambient accountability and distraction-free desks in libraries against the comfort and late-night flexibility of home.',
    source: 'sprint_standard',
    version: 1,
    createdAt: 1710012000020
  },
  {
    id: 'spk_ext_p1_02',
    module: 'speaking',
    section: 1,
    questionType: 'part1_interview',
    difficulty: 'medium',
    topic: 'Historical Buildings & Architecture',
    skillTags: ['descriptive_vocabulary', 'fluency'],
    prompt: 'Are there any historic landmarks in your hometown that you enjoy showing to visitors?',
    explanation: 'Use architectural vocabulary like "weathered brickwork", "heritage facade", and "tangible link to local history".',
    source: 'sprint_standard',
    version: 1,
    createdAt: 1710012000021
  },
  {
    id: 'spk_ext_p2_01',
    module: 'speaking',
    section: 2,
    questionType: 'part2_cuecard',
    difficulty: 'hard',
    topic: 'Describe an older person whose wisdom or storytelling left a lasting impression on you',
    skillTags: ['narrative_coherence', 'extended_turn', 'idiomatic_range'],
    prompt: 'Describe an older person whose wisdom or storytelling left a lasting impression on you.',
    cueCardBulletPoints: [
      'Who this person is and how you know them',
      'What stories or life lessons they shared with you',
      'What made their voice or way of speaking memorable',
      'And explain how their advice still influences your decisions today'
    ],
    explanation: 'Blend vivid characterization ("unhurried cadence", "quiet gravitas") with a concrete anecdote and present-day takeaway.',
    source: 'sprint_standard',
    version: 1,
    createdAt: 1710012000022
  },
  {
    id: 'spk_ext_p3_01',
    module: 'speaking',
    section: 3,
    questionType: 'part3_discussion',
    difficulty: 'hard',
    topic: 'Algorithmic News Feeds & Critical Media Literacy',
    skillTags: ['abstract_reasoning', 'hedging', 'lexical_precision'],
    prompt: 'How has algorithm-curated news changed the way citizens form political and scientific opinions compared with traditional newspapers?',
    explanation: 'Contrast curated editorial balance against outrage-optimized echo chambers, and suggest media literacy curricula in secondary schools.',
    source: 'sprint_standard',
    version: 1,
    createdAt: 1710012000023
  },
  {
    id: 'spk_ext_p3_02',
    module: 'speaking',
    section: 3,
    questionType: 'part3_discussion',
    difficulty: 'hard',
    topic: 'Public Transit vs Autonomous Vehicles',
    skillTags: ['future_speculation', 'urban_policy'],
    prompt: 'Do you think driverless private cars will solve urban traffic congestion, or will cities still need high-capacity trains and buses?',
    explanation: 'Explain geometric street-space limits—driverless private cars still occupy road volume, whereas high-capacity metro and bus corridors move far more people per lane.',
    source: 'sprint_standard',
    version: 1,
    createdAt: 1710012000024
  }
];
