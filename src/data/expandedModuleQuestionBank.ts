import type { QuestionBankItem } from './ieltsQuestionBankData';

/**
 * BandSprint — Expanded Official-Style IELTS Question Bank (+35 Curated Items)
 * Adds 5 high-caliber, Cambridge-style questions to EVERY module:
 * - Listening (Sections 1–4)
 * - Reading (Academic Passages)
 * - Writing Task 1 (Academic Charts, Maps & Process Diagrams)
 * - Writing Task 2 (Opinion, Discussion, Problem/Solution & Two-Part)
 * - Speaking Part 1 (Interview)
 * - Speaking Part 2 (Cue Card)
 * - Speaking Part 3 (Abstract Discussion)
 */
export const EXPANDED_MODULE_QB_ITEMS: QuestionBankItem[] = [
  // =========================================================================
  // LISTENING (+5 Official-Style Exam Scripts & Questions)
  // =========================================================================
  {
    id: 'qb_lis_7',
    module: 'Listening',
    topic: 'Urbanization',
    subType: 'Section 1 · Municipal Library Membership Form',
    frequency: 'Recent Real Exam',
    title: 'Westbrook Civic Library & Archive Registration',
    prompt:
      'READ OR LISTEN TO THE SECTION 1 CONVERSATION & ANSWER QUESTIONS 1–4:\n\nLibrarian (Claire): "Good afternoon, Westbrook Civic Library. Are you applying for a full borrowing card or a reading-room archive pass today?"\nApplicant (Tariq): "A full borrowing card, please, plus access to the evening study booths."\nLibrarian: "Certainly. Could I take your surname and current residential street?"\nApplicant: "My surname is Chowdhury — C-H-O-W-D-H-U-R-Y. I moved last week from 14 Elm Close to 82 Sycamore Avenue."\nLibrarian: "Thank you. Notice there is a refundable deposit of £18 for non-residents, though students pay only £12 once we verify a university ID. Do you have your student card?"\nApplicant: "Yes, right here — I am doing my master’s in urban planning. When does the quiet archive room close on Thursdays?"\nLibrarian: "On Mondays through Wednesdays we shut at 7:00 p.m., but Thursdays have late opening until 9:30 p.m."\n\nQUESTIONS:\n1. What is the applicant’s current street address?\n2. How much refundable deposit must the applicant pay?\n3. What subject is the applicant studying for his master’s degree?\n4. What time does the archive room close on Thursdays?',
    suggestedTimeMinutes: 8,
    examinerTips: [
      'Watch for address distractors: "14 Elm Close" is the previous address, whereas "82 Sycamore Avenue" is current.',
      'Listen carefully for conditional fee tiers: £18 is for non-residents, £12 applies after verifying his student ID.'
    ],
    keyVocabulary: [
      { word: 'Refundable deposit', meaning_bn: 'ফেরতযোগ্য জামানত' },
      { word: 'Archive pass', meaning_bn: 'সংরক্ষণাগার ব্যবহারের অনুমতিপত্র' },
      { word: 'Late opening', meaning_bn: 'রাত পর্যন্ত খোলা থাকার সময়সূচি' }
    ],
    modelAnswer:
      'OFFICIAL ANSWER KEY:\n\n1. 82 Sycamore Avenue\n2. £12\n3. Urban planning\n4. 9:30 p.m.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_lis_8',
    module: 'Listening',
    topic: 'Environment',
    subType: 'Section 2 · Heritage Botanical Garden Briefing',
    frequency: 'High-Frequency',
    title: 'Kew Moorland Glasshouse Restoration Tour',
    prompt:
      'READ OR LISTEN TO THE SECTION 2 MONOLOGUE & ANSWER QUESTIONS 1–4:\n\nGuide (Grandpa Reginald): "Welcome, ladies and gentlemen, to the newly restored Victorian Palm Conservatory. Built originally in 1864 using cast-iron ribs, the dome was closed for three years so engineers could replace corroded glazing with triple-laminated solar glass. Before we enter the tropical canopy walkway, please note that rucksacks larger than cabin size must be left in the lockers beside the Courtyard Café—not at the ticket kiosk as in previous seasons. Inside the East Wing, you will find our rarest specimen: a 140-year-old Madagascar cycad that survived the winter freeze of 1947. At 2:15 p.m., our senior botanist will host a complimentary seed-banking demonstration inside the Heritage Pavilion."\n\nQUESTIONS:\n1. In what year was the Victorian Palm Conservatory originally built?\n2. Where must visitors store large rucksacks today?\n3. Which country does the 140-year-old cycad specimen come from?\n4. What activity takes place in the Heritage Pavilion at 2:15 p.m.?',
    suggestedTimeMinutes: 8,
    examinerTips: [
      'Section 2 spatial briefings frequently include a "not at X anymore" distractor—ignore "ticket kiosk" and record "Courtyard Café".',
      'Check hyphenated spelling and exact nouns ("seed-banking demonstration").'
    ],
    keyVocabulary: [
      { word: 'Corroded glazing', meaning_bn: 'মরিচা বা ক্ষয়প্রাপ্ত কাঁচের আবরণ' },
      { word: 'Canopy walkway', meaning_bn: 'গাছের উপরিভাগের ঝুলন্ত হাঁটার পথ' },
      { word: 'Seed-banking', meaning_bn: 'দুর্লভ উদ্ভিদের বীজ সংরক্ষণ পদ্ধতি' }
    ],
    modelAnswer:
      'OFFICIAL ANSWER KEY:\n\n1. 1864\n2. Lockers beside the Courtyard Café\n3. Madagascar\n4. A complimentary seed-banking demonstration',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_lis_9',
    module: 'Listening',
    topic: 'Health',
    subType: 'Section 3 · Academic Research Tutorial',
    frequency: 'Recent Real Exam',
    title: 'Circadian Rhythm & Shift-Worker Nutrition Study',
    prompt:
      'READ OR LISTEN TO THE SECTION 3 DISCUSSION & ANSWER QUESTIONS 1–4:\n\nTutor (Dr. Eleanor Vance): "Daniel and Mei, let’s review your draft methodology for the hospital night-shift nutrition study. Your sample of 90 nurses looks solid, though I noticed you planned to rely solely on self-reported food diaries."\nMei: "Yes, we thought paper logs would be less intrusive during busy shifts. However, Daniel pointed out that fatigued nurses often under-report late-night snacks by up to 30%."\nDaniel: "So we’re adding wrist-worn actigraphy monitors to track sleep duration alongside timestamped meal photos uploaded through a secure app."\nDr. Vance: "Smart revision. What about your control group? You originally wanted daytime office administrators."\nMei: "We scrapped that idea because their physical workload differs too sharply. Instead, our control group will consist of daytime ward nurses from the same cardiology department."\n\nQUESTIONS:\n1. How many nurses are included in the research sample?\n2. Why did the students decide not to rely solely on paper food diaries?\n3. What device will track the participants’ sleep duration?\n4. Who will form the revised control group?',
    suggestedTimeMinutes: 10,
    examinerTips: [
      'In Section 3, track decisions that are rejected ("scrapped that idea") versus final agreed methodology.',
      'Pay close attention to who proposes which revision when answering opinion/agreement questions.'
    ],
    keyVocabulary: [
      { word: 'Actigraphy monitor', meaning_bn: 'ঘুম ও নড়াচড়া পরিমাপক কব্জির যন্ত্র' },
      { word: 'Under-report', meaning_bn: 'প্রকৃত পরিমাণের চেয়ে কম তথ্য দেওয়া' },
      { word: 'Control group', meaning_bn: 'তুলনামূলক গবেষণার নিয়ন্ত্রিত দল' }
    ],
    modelAnswer:
      'OFFICIAL ANSWER KEY:\n\n1. 90 nurses\n2. Fatigued nurses often under-report late-night snacks (by up to 30%)\n3. Wrist-worn actigraphy monitors\n4. Daytime ward nurses from the same cardiology department',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_lis_10',
    module: 'Listening',
    topic: 'Technology',
    subType: 'Section 4 · University Lecture',
    frequency: 'High-Frequency',
    title: 'Subsea Fibre-Optic Cables & Global Data Resilience',
    prompt:
      'READ OR LISTEN TO THE SECTION 4 LECTURE & ANSWER QUESTIONS 1–4:\n\nLecturer (Prof. Alistair): "Despite popular belief that international internet traffic travels predominantly via orbital satellites, over 98% of intercontinental data actually traverses hair-thin glass fibres laid along the ocean floor. A modern transatlantic cable is surprisingly slender—roughly the diameter of a garden hose—with polyethylene insulation and copper conductors that power optical repeaters spaced every 60 to 80 kilometres. While shark bites attract sensational headlines, maritime statistics demonstrate that over 70% of cable faults stem from commercial fishing trawlers and dragged ship anchors in shallow continental shelves. Consequently, engineers now bury coastal segments up to three metres beneath the seabed using hydro-jet ploughs."\n\nQUESTIONS:\n1. Approximately what percentage of intercontinental data travels through undersea cables?\n2. How far apart are optical repeaters typically spaced along a cable?\n3. What causes more than 70% of subsea cable faults?\n4. What equipment do engineers use to bury coastal cables beneath the seabed?',
    suggestedTimeMinutes: 10,
    examinerTips: [
      'Beware popular-myth distractors: satellites and shark bites are mentioned specifically to be refuted.',
      'Listen for comparative/statistical phrasing ("over 98%", "over 70%") and exact technical nouns.'
    ],
    keyVocabulary: [
      { word: 'Optical repeater', meaning_bn: 'আলোক সংকেত শক্তিশালীকারী যন্ত্র' },
      { word: 'Continental shelf', meaning_bn: 'মহীসোপান (অগভীর সমুদ্রতল)' },
      { word: 'Hydro-jet plough', meaning_bn: 'পানির চাপে সমুদ্রতল খননযন্ত্র' }
    ],
    modelAnswer:
      'OFFICIAL ANSWER KEY:\n\n1. Over 98%\n2. Every 60 to 80 kilometres\n3. Commercial fishing trawlers and dragged ship anchors\n4. Hydro-jet ploughs',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_lis_11',
    module: 'Listening',
    topic: 'Economy & Work',
    subType: 'Section 4 · Economic History Lecture',
    frequency: 'Practice Standard',
    title: 'The Rise of Cooperative Credit Unions in Rural Europe',
    prompt:
      'READ OR LISTEN TO THE SECTION 4 LECTURE & ANSWER QUESTIONS 1–4:\n\nLecturer (Grandpa Roger): "In the mid-nineteenth century, smallholder farmers across rural Germany faced catastrophic interest rates from private moneylenders whenever harvests failed. In 1864, Friedrich Wilhelm Raiffeisen pioneered a self-governing rural credit cooperative grounded in three principles: local membership, democratic one-member-one-vote governance, and unlimited mutual liability. Because borrowers were neighbours who knew one another’s farming reputations intimately, default rates plummeted below 1%—far lower than commercial urban banks. Rather than distributing profits to outside shareholders, surpluses were reinvested into a permanent indivisible reserve fund that financed shared grain mills and agricultural insurance."\n\nQUESTIONS:\n1. In what year did Raiffeisen establish his rural credit cooperative model?\n2. Why were loan default rates exceptionally low in these cooperatives?\n3. Below what percentage did default rates fall?\n4. Where were financial surpluses reinvested instead of being paid to external shareholders?',
    suggestedTimeMinutes: 10,
    examinerTips: [
      'Section 4 historical lectures follow chronological cause-and-effect signposts ("In 1864", "Because", "Rather than").',
      'Copy exact noun phrases accurately without exceeding word limits.'
    ],
    keyVocabulary: [
      { word: 'Mutual liability', meaning_bn: 'পারস্পরিক আর্থিক দায়বদ্ধতা' },
      { word: 'Default rate', meaning_bn: 'ঋণ খেলাপির হার' },
      { word: 'Indivisible reserve fund', meaning_bn: 'অবিভাজ্য স্থায়ী সঞ্চিত তহবিল' }
    ],
    modelAnswer:
      'OFFICIAL ANSWER KEY:\n\n1. 1864\n2. Borrowers were neighbours who knew one another’s farming reputations intimately\n3. Below 1%\n4. A permanent indivisible reserve fund',
    modelBand: 'Band 9.0'
  },

  // =========================================================================
  // READING (+5 Academic IELTS Passages & Questions)
  // =========================================================================
  {
    id: 'qb_rd_7',
    module: 'Reading',
    topic: 'Environment',
    subType: 'True / False / Not Given + Short Answer',
    frequency: 'Recent Real Exam',
    title: 'Biochar & Terra Preta: Ancient Amazonian Carbon Sinks',
    prompt:
      'READ THE PASSAGE & ANSWER QUESTIONS 1–4:\n\n[A] Conventional tropical soils across the Amazon basin are notoriously acidic and nutrient-poor because torrential rainfall rapidly leaches essential minerals below root depth. Yet scattered along ancient river bluffs lie distinct patches of jet-black earth known as Terra Preta de Índio, engineered by pre-Columbian indigenous societies between 450 BCE and 950 CE. Remarkably, even after centuries of tropical downpours, these dark soils retain up to three times more nitrogen and phosphorus than adjacent rainforest clay.\n\n[B] The secret behind Terra Preta’s extraordinary fertility is biochar—a porous charcoal produced by smouldering agricultural waste and wood in low-oxygen pits, a process called pyrolysis. Under an electron microscope, biochar resembles a microscopic honeycomb whose vast internal surface area traps moisture, binds soluble minerals, and provides shelter for beneficial mycorrhizal fungi. Crucially, unlike raw compost that decomposes within a few seasons and releases carbon dioxide back into the atmosphere, biochar locks carbon into recalcitrant aromatic rings that persist in soil for over a millennium.\n\nQUESTIONS:\n1. TRUE / FALSE / NOT GIVEN: Standard Amazonian rainforest soils naturally contain high concentrations of phosphorus.\n2. TRUE / FALSE / NOT GIVEN: Biochar is created by burning wood rapidly in open high-oxygen fires.\n3. TRUE / FALSE / NOT GIVEN: Pre-Columbian societies traded Terra Preta soil with Andean civilizations.\n4. SHORT ANSWER: What kind of fungi thrive inside the microscopic honeycomb pores of biochar?',
    suggestedTimeMinutes: 12,
    examinerTips: [
      'Check exact modifiers: "low-oxygen pits" directly contradicts "open high-oxygen fires" (FALSE).',
      'Do not infer historical trade if the passage never mentions Andean civilizations (NOT GIVEN).'
    ],
    keyVocabulary: [
      { word: 'Leach minerals', meaning_bn: 'বৃষ্টির পানিতে মাটির খনিজ ধুয়ে যাওয়া' },
      { word: 'Pyrolysis', meaning_bn: 'স্বল্প-অক্সিজেনে জৈব পদার্থ তাপ-বিয়োজন প্রক্রিয়া' },
      { word: 'Recalcitrant carbon', meaning_bn: 'দীর্ঘস্থায়ী ও সহজে ক্ষয় না হওয়া কার্বন' }
    ],
    modelAnswer:
      'OFFICIAL ANSWER KEY:\n\n1. FALSE (Paragraph A states conventional tropical soils are notoriously acidic and nutrient-poor; Terra Preta retains up to 3x more phosphorus.)\n2. FALSE (Paragraph B explains biochar is produced by smouldering biomass in low-oxygen pits.)\n3. NOT GIVEN (Andean trade is never mentioned.)\n4. Mycorrhizal fungi (Paragraph B)',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_rd_8',
    module: 'Reading',
    topic: 'Urbanization',
    subType: 'Summary Completion & Inference',
    frequency: 'High-Frequency',
    title: 'Sponge Cities: Rethinking Urban Flood Engineering',
    prompt:
      'READ THE PASSAGE & ANSWER QUESTIONS 1–4:\n\n[A] Throughout the twentieth century, municipal planners combated urban flooding using "grey infrastructure"—impermeable asphalt roads, subterranean concrete storm drains, and towering river levees designed to expel rainwater as rapidly as possible. Paradoxically, this approach intensifies downstream surges while depriving cities of local groundwater recharge during summer droughts.\n\n[B] Pioneered by landscape architect Kongjian Yu, the "sponge city" paradigm replaces rigid concrete channels with permeable pavements, sunken bioswales, restored wetlands, and green rooftops. Instead of fighting precipitation, a sponge city absorbs, filters, and stores up to 70% of annual rainfall where it falls. Pilot districts in Wuhan and Shenzhen recorded a 65% decline in severe street inundation alongside measurably cooler summer microclimates. Critics nonetheless warn that sponge retrofits alone cannot neutralize once-in-a-century typhoon cloudbursts and must be integrated with upgraded underground retention tunnels.\n\nQUESTIONS:\n1. What term describes twentieth-century concrete drains and levees?\n2. Up to what percentage of annual rainfall is a sponge city designed to absorb locally?\n3. Besides reducing street flooding, what additional climatic benefit was observed in Wuhan and Shenzhen?\n4. According to critics, what must sponge retrofits be combined with to handle extreme typhoons?',
    suggestedTimeMinutes: 12,
    examinerTips: [
      'Look for quotation marks ("grey infrastructure", "sponge city")—IELTS frequently tests coined terminology.',
      'Locate the concession marker ("Critics nonetheless warn") to answer limitation questions rapidly.'
    ],
    keyVocabulary: [
      { word: 'Impermeable asphalt', meaning_bn: 'পানি ভেদ করতে পারে না এমন পিচঢালা রাস্তা' },
      { word: 'Bioswale', meaning_bn: 'বৃষ্টির পানি শোষণ ও পরিশোধনের প্রাকৃতিক নালা' },
      { word: 'Inundation', meaning_bn: 'প্লাবন বা জলাবদ্ধতা' }
    ],
    modelAnswer:
      'OFFICIAL ANSWER KEY:\n\n1. Grey infrastructure (Paragraph A)\n2. 70% (Paragraph B)\n3. Measurably cooler summer microclimates (Paragraph B)\n4. Upgraded underground retention tunnels (Paragraph B)',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_rd_9',
    module: 'Reading',
    topic: 'Education',
    subType: 'True / False / Not Given',
    frequency: 'Recent Real Exam',
    title: 'The Testing Effect & Retrieval Practice in Cognitive Science',
    prompt:
      'READ THE PASSAGE & ANSWER QUESTIONS 1–4:\n\n[A] When university students prepare for high-stakes examinations, survey data shows that over 80% rely primarily on rereading highlighted textbook chapters. Rereading induces a seductive cognitive illusion termed "fluency bias": because familiar phrasing feels effortless to process on a second pass, learners mistakenly equate recognition with durable mastery.\n\n[B] Decades of cognitive psychology experiments led by Henry Roediger and Jeffrey Karpicke reveal that active retrieval—forcing the brain to reconstruct information from memory via low-stakes quizzes or blank-sheet recall—yields dramatically superior long-term retention. Although students who repeatedly reread passages slightly outperformed quizzed peers on an immediate five-minute test, the retrieval group retained 50% more material one week later. Importantly, the testing effect operates even when initial recall fails, provided learners receive prompt corrective feedback afterward.\n\nQUESTIONS:\n1. TRUE / FALSE / NOT GIVEN: Fluency bias makes students underestimate how much material they actually understand.\n2. TRUE / FALSE / NOT GIVEN: On an immediate five-minute test, students who reread passages scored slightly higher than those who used retrieval practice.\n3. TRUE / FALSE / NOT GIVEN: Failing to recall an answer during a practice quiz completely eliminates the memory benefit of retrieval.\n4. TRUE / FALSE / NOT GIVEN: Roediger and Karpicke conducted their retrieval experiments exclusively on medical students.',
    suggestedTimeMinutes: 12,
    examinerTips: [
      'Watch directionality verbs: "mistakenly equate recognition with durable mastery" means students OVERESTIMATE mastery, making Q1 FALSE.',
      'Spot conditional clauses ("provided learners receive prompt corrective feedback") for Q3.'
    ],
    keyVocabulary: [
      { word: 'Fluency bias', meaning_bn: 'চেনা লেখাকে গভীরভাবে শেখা বলে ভুল ধারণা করা' },
      { word: 'Active retrieval', meaning_bn: 'স্মৃতি থেকে সক্রিয়ভাবে তথ্য পুনরুদ্ধার অনুশীলন' },
      { word: 'Durable mastery', meaning_bn: 'দীর্ঘস্থায়ী ও দৃঢ় দক্ষতা' }
    ],
    modelAnswer:
      'OFFICIAL ANSWER KEY:\n\n1. FALSE (Fluency bias causes learners to overestimate mastery by confusing easy recognition with durable retention.)\n2. TRUE (Paragraph B confirms rereading slightly outperformed quizzed peers on an immediate five-minute test.)\n3. FALSE (Paragraph B states the testing effect still operates even when initial recall fails, given corrective feedback.)\n4. NOT GIVEN (The passage never specifies that participants were exclusively medical students.)',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_rd_10',
    module: 'Reading',
    topic: 'Technology',
    subType: 'Matching Features & Short Answer',
    frequency: 'High-Frequency',
    title: 'Neuromorphic Chips: Mimicking Biological Synapses',
    prompt:
      'READ THE PASSAGE & ANSWER QUESTIONS 1–4:\n\n[A] Conventional digital processors follow the 1945 von Neumann architecture, in which memory units and arithmetic processing cores remain physically separated. Shuttling massive neural-network weights back and forth across this memory bus creates the "von Neumann bottleneck", consuming megawatts of electricity in modern AI data centres. By contrast, the human brain executes astonishing perceptual reasoning on roughly 20 watts—less power than a dim household bulb.\n\n[B] Neuromorphic engineering seeks to close this energy chasm by embedding computation directly inside silicon synapses. Rather than running continuous global clock cycles, spiking neural chips remain electrically silent until an incoming sensory event crosses a voltage threshold, firing sparse microsecond pulses. Early laboratory prototypes from Intel and ETH Zurich demonstrate a 100-fold reduction in energy consumption for edge-computing tasks such as drone obstacle avoidance and prosthetic limb control, though programming tools remain far less mature than standard GPU ecosystems.\n\nQUESTIONS:\n1. What causes the "von Neumann bottleneck" in conventional processors?\n2. Approximately how many watts of power does the human brain use?\n3. When do spiking neural chips emit electrical pulses?\n4. What current limitation slows widespread adoption of neuromorphic chips?',
    suggestedTimeMinutes: 12,
    examinerTips: [
      'Differentiate structural cause (shuttling data between separate memory and processing units) from consequence (megawatt power usage).',
      'Spot contrast markers ("though") to locate limitations cleanly.'
    ],
    keyVocabulary: [
      { word: 'Memory bottleneck', meaning_bn: 'মেমোরি ও প্রসেসরের ডেটা আদান-প্রদানের সীমাবদ্ধতা' },
      { word: 'Voltage threshold', meaning_bn: 'বৈদ্যুতিক সংকেত চালু হওয়ার ন্যূনতম সীমা' },
      { word: 'Edge computing', meaning_bn: 'সরাসরি ডিভাইসে তাৎক্ষণিক ডেটা প্রক্রিয়াকরণ' }
    ],
    modelAnswer:
      'OFFICIAL ANSWER KEY:\n\n1. Shuttling data/weights back and forth between physically separated memory units and processing cores (Paragraph A)\n2. Roughly 20 watts (Paragraph A)\n3. Only when an incoming sensory event crosses a voltage threshold (Paragraph B)\n4. Programming tools are far less mature than standard GPU ecosystems (Paragraph B)',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_rd_11',
    module: 'Reading',
    topic: 'Health',
    subType: 'True / False / Not Given + Cause/Effect',
    frequency: 'Practice Standard',
    title: 'Bacteriophage Therapy & The Post-Antibiotic Era',
    prompt:
      'READ THE PASSAGE & ANSWER QUESTIONS 1–4:\n\n[A] Decades before Alexander Fleming discovered penicillin in 1928, microbiologist Félix d’Hérelle identified naturally occurring viruses called bacteriophages—literally "bacteria eaters"—capable of hunting down and lysing lethal bacterial pathogens. While Western medicine largely abandoned phages once cheap broad-spectrum antibiotics emerged in the 1940s, research institutes in Georgia and Poland continued refining clinical phage libraries for stubborn surgical infections.\n\n[B] With antimicrobial resistance now linked to over one million annual deaths globally, phage therapy is experiencing an urgent scientific renaissance. Unlike broad-spectrum antibiotics that wipe out beneficial gut flora alongside harmful microbes, each phage targets a single bacterial strain with sniper-like specificity and multiplies automatically at the infection site until the pathogen is eradicated. However, this extreme precision is also a regulatory hurdle: doctors must match a bespoke phage cocktail to each patient’s exact bacterial isolate, complicating standardized mass clinical trials.\n\nQUESTIONS:\n1. TRUE / FALSE / NOT GIVEN: Bacteriophages were discovered after Alexander Fleming identified penicillin.\n2. TRUE / FALSE / NOT GIVEN: Phage therapy destroys helpful gut bacteria at the same rate as broad-spectrum antibiotics.\n3. SHORT ANSWER: Which two countries maintained clinical phage research after the 1940s?\n4. SHORT ANSWER: Why is phage precision considered a regulatory hurdle for mass clinical trials?',
    suggestedTimeMinutes: 12,
    examinerTips: [
      'Compare timeline words carefully: "Decades before" directly contradicts "after" (Q1 is FALSE).',
      'Watch contrast conjunctions ("Unlike broad-spectrum antibiotics") to distinguish phage behavior from antibiotic side effects.'
    ],
    keyVocabulary: [
      { word: 'Antimicrobial resistance', meaning_bn: 'জীবাণুর অ্যান্টিবায়োটিক-প্রতিরোধী হয়ে ওঠা' },
      { word: 'Broad-spectrum', meaning_bn: 'বহু ধরনের জীবাণুর ওপর কাজ করে এমন' },
      { word: 'Regulatory hurdle', meaning_bn: 'আইনগত বা অনুমোদন সংক্রান্ত জটিলতা' }
    ],
    modelAnswer:
      'OFFICIAL ANSWER KEY:\n\n1. FALSE (Paragraph A states Félix d’Hérelle identified bacteriophages decades before Fleming discovered penicillin in 1928.)\n2. FALSE (Paragraph B contrasts phages with broad-spectrum antibiotics, noting phages target a single strain without wiping out beneficial gut flora.)\n3. Georgia and Poland (Paragraph A)\n4. Because doctors must match a bespoke phage cocktail to each patient’s exact bacterial isolate (Paragraph B)',
    modelBand: 'Band 9.0'
  },

  // =========================================================================
  // WRITING TASK 1 (+5 Academic Task 1 Prompts & Band 8.5–9.0 Models)
  // =========================================================================
  {
    id: 'qb_w1_13',
    module: 'Writing Task 1',
    topic: 'Environment',
    subType: 'Process Diagram',
    frequency: 'Recent Real Exam',
    title: 'Closed-Loop Lithium-Ion Battery Recycling Process',
    prompt:
      'The diagram illustrates the closed-loop industrial process used to recycle spent electric vehicle lithium-ion batteries into cathode materials for new battery cells. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nKEY STAGES:\n1. Collection & Safety Discharge (residual voltage drained to 0V)\n2. Mechanical Dismantling & Shredding (casings, copper, and aluminium foil separated magnetically)\n3. Thermal Sieving into "Black Mass" (concentrated lithium, cobalt, nickel, and manganese powder)\n4. Hydrometallurgical Acid Leaching & Precipitation (pure metal salts extracted with 95% recovery)\n5. Cathode Precursor Synthesis & Re-entry into New EV Battery Assembly',
    targetWordCount: '160–200 words',
    suggestedTimeMinutes: 20,
    examinerTips: [
      'Always state total stage count and emphasize the circular ("closed-loop") nature in your Overview.',
      'Use crisp passive voice ("is drained", "are separated", "is converted") and sequencing linkers ("Following this", "Subsequently").'
    ],
    keyVocabulary: [
      { word: 'Closed-loop cycle', meaning_bn: 'পুনরাবৃত্তিমূলক বদ্ধ চক্র' },
      { word: 'Hydrometallurgical leaching', meaning_bn: 'রাসায়নিক দ্রবণের মাধ্যমে ধাতু নিষ্কাশন' },
      { word: 'Residual voltage', meaning_bn: 'অবশিষ্ট বৈদ্যুতিক চার্জ' }
    ],
    modelAnswer:
      'The diagram outlines the five-stage closed-loop process through which depleted electric vehicle lithium-ion batteries are transformed into high-purity materials for manufacturing new cells.\n\nOverall, the cyclical sequence progresses from initial safety preparation and mechanical separation to chemical purification, ultimately recovering 95% of critical battery metals for industrial reuse.\n\nIn the first stage, exhausted battery packs are collected and safely discharged to zero volts to prevent thermal hazards. Once neutralized, the modules undergo mechanical dismantling and shredding, during which outer casings, copper wiring, and aluminium foils are sorted via magnetic separators. The remaining electrode material is then thermally sieved to yield a dense powder known as "black mass", rich in lithium, cobalt, nickel, and manganese.\n\nDuring the chemical refinement phase, this black mass undergoes hydrometallurgical acid leaching and selective precipitation, isolating battery-grade metal salts at a 95% recovery rate. Finally, these purified salts are synthesized into fresh cathode precursors and fed directly back into electric vehicle battery assembly, completing the sustainable manufacturing loop.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_w1_14',
    module: 'Writing Task 1',
    topic: 'Urbanization',
    subType: 'Map Comparison (Before & After)',
    frequency: 'High-Frequency',
    title: 'Redevelopment of Harbourfront Industrial Wharf (1995 vs Present)',
    prompt:
      'The two maps show the transformation of the Northport Harbourfront Wharf between 1995 and the present day. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\n1995 LAYOUT: Two freight warehouses along the west pier, a coal-loading rail spur in the north, an open container yard in the centre, and a single lorry access road in the south.\nPRESENT LAYOUT: West warehouses converted into a Maritime Museum and Waterfront Food Hall; rail spur replaced by a tram terminus and cycleway; container yard transformed into a landscaped coastal park with an amphitheatre; pedestrian footbridge built across the harbour mouth; lorry road pedestrianized with underground parking.',
    targetWordCount: '165–200 words',
    suggestedTimeMinutes: 20,
    examinerTips: [
      'Group changes spatially (west pier, northern corridor, central zone, southern access) instead of listing items randomly.',
      'Use precise change verbs: "converted into", "demolished to make way for", "pedestrianized", "retained and repurposed".'
    ],
    keyVocabulary: [
      { word: 'Adaptive reuse', meaning_bn: 'পুরনো স্থাপনাকে নতুন কাজে রূপান্তর' },
      { word: 'Pedestrianized promenade', meaning_bn: 'যানবাহনমুক্ত হাঁটার প্রশস্ত পথ' },
      { word: 'Civic amenity', meaning_bn: 'নাগরিক বিনোদন ও সেবামূলক সুবিধা' }
    ],
    modelAnswer:
      'The maps illustrate the extensive regeneration of the Northport Harbourfront Wharf from 1995 to the present day.\n\nOverall, the district has undergone a wholesale shift from a heavy maritime freight terminal into a pedestrian-oriented cultural and recreational precinct, with industrial transport links entirely replaced by public transit and green space.\n\nAlong the western pier, the two original freight warehouses have been preserved structurally but repurposed into a Maritime Museum and a Waterfront Food Hall. To the north, the former coal-loading railway spur has been dismantled to accommodate a modern tram terminus running parallel to a dedicated cycleway. Meanwhile, the expansive central container yard has been cleared and landscaped into a coastal park incorporating an open-air amphitheatre.\n\nAccess and connectivity have also been radically reconfigured. In the south, the sole lorry access road has been pedestrianized, with vehicular traffic diverted into new underground parking. Finally, a newly constructed pedestrian footbridge now spans the harbour mouth, linking the revitalized wharf directly to the opposite shoreline.',
    modelBand: 'Band 8.5'
  },
  {
    id: 'qb_w1_15',
    module: 'Writing Task 1',
    topic: 'Economy & Work',
    subType: 'Line Graph (Multi-Series)',
    frequency: 'Recent Real Exam',
    title: 'Remote vs Hybrid vs On-Site Work Arrangements (2018–2026)',
    prompt:
      'The line graph compares the percentage of full-time knowledge workers in four OECD economies working fully on-site, in hybrid schedules, or fully remotely between 2018 and 2026.\n\nDATA SUMMARY:\n- Fully On-Site: 84% (2018) → plunges to 22% (2020) → stabilizes at 34% (2026)\n- Hybrid (2–3 days office): 11% (2018) → 26% (2020) → surges to become dominant at 48% (2026)\n- Fully Remote: 5% (2018) → peaks sharply at 52% (2020) → moderates steadily to 18% (2026)',
    targetWordCount: '160–195 words',
    suggestedTimeMinutes: 20,
    examinerTips: [
      'Highlight the structural crossover: fully on-site dominated in 2018, fully remote spiked briefly in 2020, and hybrid emerged as the long-term norm by 2026.',
      'Avoid describing every single year—anchor turning points (2018, 2020, 2026) with crisp comparative ratios.'
    ],
    keyVocabulary: [
      { word: 'Structural crossover', meaning_bn: 'পরিসংখ্যানগত অবস্থানের মৌলিক পরিবর্তন' },
      { word: 'Precipitous drop', meaning_bn: 'আকস্মিক ও তীব্র পতন' },
      { word: 'Plateau / stabilize', meaning_bn: 'স্থিতিশীল অবস্থায় পৌঁছানো' }
    ],
    modelAnswer:
      'The line graph tracks shifts in the proportion of full-time knowledge workers across four OECD economies operating under on-site, hybrid, and fully remote arrangements from 2018 to 2026.\n\nOverall, the eight-year period witnessed a dramatic departure from traditional office attendance. Whereas fully on-site employment overwhelmingly predominated in 2018, hybrid schedules overtook both alternatives to become the single largest working model by 2026.\n\nIn 2018, 84% of surveyed professionals worked exclusively on-site, compared with just 11% on hybrid rosters and a marginal 5% working fully remotely. The year 2020 marked an abrupt inflection point: on-site attendance plummeted by 62 percentage points to 22%, while fully remote work soared more than tenfold to peak at 52%.\n\nBetween 2020 and 2026, however, full-time remote arrangements steadily receded to 18%, remaining more than triple their 2018 baseline. Concurrently, on-site work recovered modestly to stabilize at 34%, while hybrid arrangements climbed continuously from 26% to 48%, establishing themselves as the prevailing workplace norm.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_w1_16',
    module: 'Writing Task 1',
    topic: 'Health',
    subType: 'Table Comparison',
    frequency: 'High-Frequency',
    title: 'Public Healthcare Expenditure & Life Expectancy Across Five Nations',
    prompt:
      'The table presents data on healthcare spending per capita (USD), share of GDP allocated to health, physician density (per 1,000 residents), and average life expectancy in five countries in 2024.\n\nDATA:\n- Japan: $4,950 | 11.1% GDP | 2.6 doctors | 84.5 yrs\n- Switzerland: $8,120 | 11.8% GDP | 4.4 doctors | 83.9 yrs\n- United Kingdom: $5,490 | 11.3% GDP | 3.2 doctors | 81.2 yrs\n- United States: $12,550 | 16.6% GDP | 2.7 doctors | 77.5 yrs\n- South Korea: $4,190 | 9.3% GDP | 2.5 doctors | 83.7 yrs',
    targetWordCount: '165–200 words',
    suggestedTimeMinutes: 20,
    examinerTips: [
      'Do not read the table row by row mechanically. Spot the headline paradox: the US spends the most by far yet records the lowest life expectancy, whereas Japan and South Korea achieve the highest longevity on moderate spending.'
    ],
    keyVocabulary: [
      { word: 'Diminishing returns', meaning_bn: 'ব্যয় বাড়লেও আনুপাতিক সুফল কমে যাওয়া' },
      { word: 'Per capita expenditure', meaning_bn: 'মাথাপিছু ব্যয়' },
      { word: 'Outlier', meaning_bn: 'অন্যদের তুলনায় ব্যতিক্রমী পরিসংখ্যান' }
    ],
    modelAnswer:
      'The table compares five developed nations across four healthcare metrics in 2024: per capita spending, GDP share, physician density, and average life expectancy.\n\nOverall, higher financial outlay does not guarantee superior longevity. The United States stands out as a striking outlier—allocating by far the highest expenditure yet posting the lowest life expectancy—whereas Japan and South Korea achieve the longest lifespans at roughly one-third of American per capita cost.\n\nSpecifically, the US devoted $12,550 per person (16.6% of GDP) to healthcare, more than 50% above second-ranked Switzerland ($8,120; 11.8% of GDP). Despite this unprecedented budget, American life expectancy lagged at 77.5 years alongside a relatively modest 2.7 physicians per 1,000 residents. By contrast, Switzerland paired the highest physician density (4.4 per 1,000) with 83.9 years of longevity.\n\nAmong the remaining nations, Japan topped the table in longevity at 84.5 years on $4,950 per capita (11.1% of GDP), closely followed by South Korea at 83.7 years despite spending the lowest share of GDP (9.3%). The United Kingdom occupied the middle ground at $5,490 per capita and 81.2 years.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_w1_17',
    module: 'Writing Task 1',
    topic: 'Education',
    subType: 'Stacked Bar Chart',
    frequency: 'Practice Standard',
    title: 'Postgraduate Field of Study by Gender & International Intake (2025)',
    prompt:
      'The chart illustrates the breakdown of master’s degree enrolments across five academic disciplines (Data Science, Public Health, Civil Engineering, Finance, and Education) by domestic vs international students at a British university in 2025.\n\nDATA SUMMARY:\n- Data Science: 1,200 total (78% international, 22% domestic)\n- Finance: 950 total (72% international, 28% domestic)\n- Civil Engineering: 640 total (60% international, 40% domestic)\n- Public Health: 710 total (45% international, 55% domestic)\n- Education: 580 total (18% international, 82% domestic)',
    targetWordCount: '160–195 words',
    suggestedTimeMinutes: 20,
    examinerTips: [
      'Report both absolute scale (total enrolment) and proportional split (% international vs domestic) cleanly.',
      'Contrast STEM/quantitative programmes (heavily international) against domestic-skewed Education.'
    ],
    keyVocabulary: [
      { word: 'Enrolment composition', meaning_bn: 'শিক্ষার্থী ভর্তির অনুপাত ও কাঠামো' },
      { word: 'Quantitative disciplines', meaning_bn: 'গণিত ও তথ্য-বিশ্লেষণভিত্তিক বিষয়' },
      { word: 'Predominantly domestic', meaning_bn: 'প্রধানত দেশীয় শিক্ষার্থীনির্ভর' }
    ],
    modelAnswer:
      'The chart compares total master’s enrolments and the proportional balance between domestic and international candidates across five faculties at a UK university in 2025.\n\nOverall, quantitative and technical programmes attracted both the largest cohorts and the highest concentrations of overseas students, whereas Education was both the smallest faculty and overwhelmingly domestic.\n\nData Science led all departments with 1,200 enrolled postgraduates, nearly four-fifths of whom (78%) came from abroad. Finance ranked second in overall volume at 950 students and exhibited a similarly international profile at 72%. Civil Engineering recorded a mid-sized intake of 640 candidates, maintaining a 60% international majority.\n\nConversely, domestic learners formed the majority in the remaining two disciplines. Public Health drew 710 students with a relatively balanced split of 55% domestic to 45% international. Education stood at the opposite extreme from Data Science: out of 580 postgraduates, 82% were domestic residents while international scholars accounted for less than one-fifth (18%).',
    modelBand: 'Band 8.5'
  },

  // =========================================================================
  // WRITING TASK 2 (+5 Band 8.5–9.0 Essays Across Core Essay Types)
  // =========================================================================
  {
    id: 'qb_w2_21',
    module: 'Writing Task 2',
    topic: 'Urbanization',
    subType: 'Advantages & Disadvantages',
    frequency: 'Recent Real Exam',
    title: 'Congestion Pricing & Car-Free City Centres',
    prompt:
      'Many major cities are introducing daily congestion charges and banning private petrol vehicles from central districts. Do the advantages of these policies outweigh the disadvantages?',
    targetWordCount: '260–320 words',
    suggestedTimeMinutes: 40,
    examinerTips: [
      'For "outweigh" prompts, explicitly evaluate BOTH sides and state clearly why one outweighs the other in your thesis and conclusion.',
      'Avoid vague claims about "less pollution"—specify particulate emissions (PM2.5), bus timetable reliability, and regressive impacts on low-income commuters.'
    ],
    keyVocabulary: [
      { word: 'Regressive financial burden', meaning_bn: 'স্বল্প আয়ের মানুষের ওপর তুলনামূলক বেশি আর্থিক চাপ' },
      { word: 'Modal shift', meaning_bn: 'ব্যক্তিগত গাড়ি ছেড়ে গণপরিবহনে স্থানান্তর' },
      { word: 'Ring-fenced revenue', meaning_bn: 'নির্দিষ্ট খাতে ব্যয়ের জন্য সংরক্ষিত আয়' }
    ],
    modelAnswer:
      'As metropolitan populations swell, municipal authorities from London to Singapore have implemented daily congestion levies and low-emission zones restricting private petrol cars. Although such measures impose tangible short-term hardships on suburban commuters and small tradespeople, I contend that their long-term environmental, public-health, and urban-mobility benefits decisively outweigh these drawbacks.\n\nCritics legitimately highlight the regressive economic nature of flat road-use charges. Essential workers living in outer suburbs with sparse rail connections—such as night-shift nurses or independent plumbers transporting heavy tools—may face steep daily fees they can ill afford, while affluent motorists absorb the surcharge effortlessly. Furthermore, downtown retailers sometimes fear that limiting curbside parking could depress footfall in favour of out-of-town retail parks.\n\nNevertheless, empirical evidence from congestion-priced capitals indicates that the structural gains are far more consequential. Removing non-essential private vehicles immediately slashes nitrogen dioxide and fine particulate concentrations, cutting childhood asthma hospitalizations. Simultaneously, clearer arterial roads accelerate bus speeds by up to 30%, making public transport punctual and attractive. Crucially, when municipalities ring-fence congestion revenues to subsidize electric buses, protected cycle corridors, and targeted exemptions for low-income or disabled drivers, the initial equity concern is substantially neutralized—and pedestrianized high streets consistently report higher retail spending.\n\nIn conclusion, while congestion pricing requires thoughtful exemptions to protect vulnerable commuters, its capacity to deliver breathable air, rapid transit, and thriving street life clearly outweighs its transitional inconveniences.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_w2_22',
    module: 'Writing Task 2',
    topic: 'Education',
    subType: 'Discussion (Both Views + Opinion)',
    frequency: 'High-Frequency',
    title: 'University Tuition: Free Higher Education vs Graduate Contributions',
    prompt:
      'Some people argue that university education should be completely free for all citizens, funded entirely through taxation. Others believe students should contribute toward tuition costs because graduates earn higher lifetime incomes. Discuss both views and give your own opinion.',
    targetWordCount: '270–320 words',
    suggestedTimeMinutes: 40,
    examinerTips: [
      'Give fair intellectual weight to BOTH viewpoints before landing on a nuanced Band 8.5+ position (e.g., progressive income-contingent models or means-tested grants).',
      'Use crisp topic sentences that signal each side without clichéd openers like "In this modern era".'
    ],
    keyVocabulary: [
      { word: 'Social mobility', meaning_bn: 'শিক্ষা ও দক্ষতার মাধ্যমে আর্থসামাজিক উন্নতি' },
      { word: 'Income-contingent repayment', meaning_bn: 'আয়ের নির্দিষ্ট সীমা অতিক্রম করলে কিস্তি পরিশোধ ব্যবস্থা' },
      { word: 'Fiscal sustainability', meaning_bn: 'রাষ্ট্রীয় বাজেটের দীর্ঘমেয়াদি সক্ষমতা' }
    ],
    modelAnswer:
      'The question of whether higher education should be financed solely by taxpayers or partially borne by students remains a cornerstone of fiscal and educational policy. While both perspectives rest on compelling principles of fairness, I believe a hybrid model—combining tuition waivers for low-income scholars with income-contingent graduate contributions—strikes the most equitable balance.\n\nAdvocates of entirely free university tuition contend that education is a public good rather than a private commodity. Removing upfront fees dismantles financial anxiety for talented students from disadvantaged households, accelerating social mobility and expanding the national pool of doctors, engineers, and educators. Moreover, societies already recoup public educational investments indirectly because university graduates tend to pay higher progressive income taxes over their careers.\n\nConversely, proponents of student cost-sharing observe that universal free tuition can inadvertently become a regressive subsidy. In many nations, students from affluent families are disproportionately represented at elite universities; funding their degrees exclusively through general taxation effectively asks non-graduate workers to subsidize peers who will command a substantial lifetime earnings premium. Additionally, constrained public budgets often force fee-free university systems to cap enrolments or underfund research laboratories.\n\nIn my view, neither pure taxpayer funding nor commercial upfront fees is optimal. By guaranteeing full grants for lower-income students while asking higher-earning graduates to repay a modest proportion of tuition only once their salaries cross a comfortable threshold, governments can protect equal access without compromising university quality.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_w2_23',
    module: 'Writing Task 2',
    topic: 'Health',
    subType: 'Problem & Solution',
    frequency: 'Recent Real Exam',
    title: 'Ultra-Processed Diets & Rising Adolescent Metabolic Illness',
    prompt:
      'Across both wealthy and developing nations, adolescents are consuming increasing quantities of ultra-processed foods, leading to rising rates of obesity and metabolic disorders. What are the principal drivers of this trend, and what measures can effectively reverse it?',
    targetWordCount: '260–310 words',
    suggestedTimeMinutes: 40,
    examinerTips: [
      'Ensure solutions directly address the causes you identified (structural pricing/marketing causes require fiscal/regulatory solutions, not just "telling teens to eat healthy").'
    ],
    keyVocabulary: [
      { word: 'Hyper-palatable', meaning_bn: 'অতিরিক্ত লোভনীয় ও আসক্তি সৃষ্টিকারী স্বাদযুক্ত' },
      { word: 'Obesogenic environment', meaning_bn: 'স্থূলতা বৃদ্ধিতে সহায়ক খাদ্য ও জীবনযাপন পরিবেশ' },
      { word: 'Front-of-pack warning label', meaning_bn: 'প্যাকেটের সামনে স্পষ্ট পুষ্টি সতর্কতা চিহ্ন' }
    ],
    modelAnswer:
      'The rapid displacement of freshly cooked meals by ultra-processed snacks and sugary beverages has precipitated an alarming rise in adolescent obesity and early-onset metabolic disease worldwide. This shift is driven primarily by aggressive commercial engineering and economic convenience, and reversing it demands coordinated fiscal regulation alongside school-level culinary reform.\n\nTwo structural factors account for the ubiquity of ultra-processed diets among teenagers. First, food conglomerates engineer products to be hyper-palatable—combining refined starches, emulsifiers, and excess sodium—while targeting adolescents relentlessly through algorithmically curated social media sponsorships. Second, in urbanized households where both parents work extended hours, shelf-stable packaged meals are routinely cheaper per calorie and vastly faster to prepare than fresh produce.\n\nBecause the root causes are systemic rather than merely failures of teenage willpower, public health interventions must reshape the food environment itself. Governments should pair tiered sugar-and-salt levies on ultra-processed manufacturers with direct subsidies that lower the retail price of fruit, legumes, and whole grains. Evidence from Chile demonstrates that mandatory black octagonal front-of-pack warning labels and bans on youth-targeted junk-food advertising swiftly curb adolescent consumption. Concurrently, secondary schools should replace vending-machine contracts with freshly prepared nutritious lunches and mandatory practical cooking classes.\n\nUltimately, curbing adolescent metabolic illness requires making wholesome food the most affordable, visible, and convenient default rather than relying on individual dietary restraint.',
    modelBand: 'Band 8.5'
  },
  {
    id: 'qb_w2_24',
    module: 'Writing Task 2',
    topic: 'Society & Culture',
    subType: 'Two-Part Question',
    frequency: 'High-Frequency',
    title: 'Declining Intergenerational Living & Elderly Loneliness',
    prompt:
      'In many societies, fewer young adults live with or near their ageing parents compared with previous generations. Why is this change occurring, and is it a positive or negative development overall?',
    targetWordCount: '265–320 words',
    suggestedTimeMinutes: 40,
    examinerTips: [
      'Two-part questions require clear, balanced coverage of BOTH questions: (1) Why it is happening, and (2) Positive vs Negative verdict.'
    ],
    keyVocabulary: [
      { word: 'Geographic labour mobility', meaning_bn: 'কর্মসংস্থানের জন্য এক শহর থেকে অন্য শহরে স্থানান্তর' },
      { word: 'Filial cohesion', meaning_bn: 'প্রজন্মের মধ্যে পারিবারিক বন্ধন ও দায়িত্ববোধ' },
      { word: 'Co-housing model', meaning_bn: 'স্বাধীনতা বজায় রেখে যৌথ প্রতিবেশী আবাসন ব্যবস্থা' }
    ],
    modelAnswer:
      'The traditional multi-generational household is steadily giving way to smaller, geographically dispersed nuclear residences across both Western and Asian societies. While this evolution stems largely from economic migration and changing urban housing design, I consider it a predominantly negative development unless offset by intentional community support structures.\n\nTwo intertwined forces explain why younger generations increasingly live far from ageing parents. Economically, modern knowledge industries cluster heavily in a handful of metropolitan hubs, compelling university graduates to relocate hundreds of kilometres from hometowns to secure viable careers. Architecturally and culturally, contemporary city apartments are rarely sized to accommodate extended families comfortably, while younger cohorts place greater emphasis on personal autonomy and independent household management.\n\nAlthough living independently can reduce domestic friction and foster self-reliance among young adults, the broader societal costs are deeply troubling. Older citizens frequently suffer acute social isolation, which epidemiological studies link to accelerated cognitive decline and cardiovascular risk. Simultaneously, young working parents forfeit invaluable informal childcare and emotional grounding previously offered by grandparents, straining household budgets and weakening cultural continuity across generations.\n\nIn conclusion, the decline of multi-generational proximity is an understandable by-product of modern labour markets, yet its toll on elderly well-being and family resilience makes it largely detrimental. Societies would benefit from encouraging innovative urban co-housing designs that preserve privacy while keeping generations within walking distance.',
    modelBand: 'Band 8.5'
  },
  {
    id: 'qb_w2_25',
    module: 'Writing Task 2',
    topic: 'Technology',
    subType: 'Agree / Disagree',
    frequency: 'Recent Real Exam',
    title: 'Open-Source Scientific Publishing vs Subscription Journals',
    prompt:
      'All scientific research funded by public taxes should be published free of charge for anyone in the world to read, rather than locked behind expensive journal paywalls. To what extent do you agree or disagree?',
    targetWordCount: '260–315 words',
    suggestedTimeMinutes: 40,
    examinerTips: [
      'Address the counterargument (editorial curation & peer-review administration costs) and explain how institutional open-access funding resolves it.'
    ],
    keyVocabulary: [
      { word: 'Paywalled scholarship', meaning_bn: 'অর্থের বিনিময়ে সীমাবদ্ধ গবেষণাপত্র' },
      { word: 'Epistemic equity', meaning_bn: 'জ্ঞানে সবার সমান প্রবেশাধিকার' },
      { word: 'Peer-review rigour', meaning_bn: 'বিশেষজ্ঞদের দ্বারা গবেষণার কঠোর মান যাচাই' }
    ],
    modelAnswer:
      'For decades, publicly financed discoveries have paradoxically remained inaccessible to the very citizens, clinicians, and developing-world scholars whose taxes underwrote them, confined behind costly commercial journal subscriptions. I strongly agree that all taxpayer-funded research ought to be published open-access without reader fees, provided rigorous peer-review funding is sustainably maintained.\n\nThe ethical and practical case for universal open access is overwhelming. When taxpayers finance laboratory grants, restricting the resulting findings forces universities and hospitals to pay twice—first to conduct the study and again to purchase access from publishing conglomerates. Removing paywalls dramatically accelerates scientific progress: during recent global public-health emergencies, immediate open sharing of genomic sequences shaved months off diagnostic and vaccine development. Equally important, open repositories democratize knowledge for physicians, engineers, and educators in lower-income countries whose institutions cannot afford multimillion-dollar journal bundles.\n\nSkeptics rightly caution that scholarly publishing incurs genuine operational expenses—including managing impartial peer review, statistical verification, and long-term digital archiving—and warn that shifting fees onto authors can spawn predatory low-quality journals. However, these risks do not justify keeping paywalls intact; instead, national research councils can fund transparent, non-profit diamond open-access platforms directly as a modest percentage of every research grant.\n\nIn summary, public funding should yield public knowledge. Transitioning decisively to rigorously curated, taxpayer-backed open publishing maximizes both scientific velocity and global intellectual equity.',
    modelBand: 'Band 9.0'
  },

  // =========================================================================
  // SPEAKING PART 1 (+5 Recent Real-Exam Interview Sets)
  // =========================================================================
  {
    id: 'qb_sp1_6',
    module: 'Speaking Part 1',
    topic: 'Urbanization',
    subType: 'Part 1 Interview · Public Parks & Quiet Spaces',
    frequency: 'Recent Real Exam',
    title: 'Public Parks, Walks & Urban Quiet Spaces',
    prompt:
      'EXAMINER QUESTIONS:\n1. Are there many public parks or green spaces near where you live?\n2. Do you prefer visiting a park early in the morning or later in the evening?\n3. How have public parks in your city changed over the past ten years?\n4. Do you think cities should spend more money on building parks than on shopping malls?',
    suggestedTimeMinutes: 5,
    examinerTips: [
      'Aim for 2–3 natural sentences per answer: Direct Answer → Sensory Detail/Reason → Short Personal Example.',
      'Use natural British/international discourse markers: "To be completely honest", "What I appreciate most is..."'
    ],
    keyVocabulary: [
      { word: 'Lush greenery', meaning_bn: 'ঘন সবুজ প্রকৃতি' },
      { word: 'Unwind after a hectic day', meaning_bn: 'ব্যস্ত দিনের পর মানসিক প্রশান্তি লাভ করা' },
      { word: 'Pedestrian-friendly', meaning_bn: 'পথচারীবান্ধব' }
    ],
    modelAnswer:
      '1. "Thankfully, yes—there’s a leafy lakeside park about a ten-minute walk from my flat. It has shaded jogging tracks and a small botanical corner, so it feels like a welcome pocket of calm amid city traffic."\n\n2. "I’m definitely a morning person when it comes to parks. Around six-thirty, the air is noticeably cooler, you can hear birdsong rather than car horns, and watching elderly neighbours practise stretching routines puts me in a grounded mood for the day."\n\n3. "They’ve become far more inclusive and better lit. A decade ago, most local parks were just bare patches of grass, whereas now they feature outdoor calisthenics stations, wheelchair ramps, and proper benches."\n\n4. "Without a doubt, yes. Shopping malls already saturate most urban districts, whereas free green spaces safeguard both mental well-being and community cohesion regardless of a person’s income."',
    modelBand: 'Band 8.5'
  },
  {
    id: 'qb_sp1_7',
    module: 'Speaking Part 1',
    topic: 'Technology',
    subType: 'Part 1 Interview · Podcasts & Audiobooks',
    frequency: 'High-Frequency',
    title: 'Listening to Podcasts & Audiobooks',
    prompt:
      'EXAMINER QUESTIONS:\n1. Do you often listen to podcasts or audiobooks?\n2. When and where do you usually listen to audio content?\n3. Do you prefer listening to an audiobook or reading a printed book?\n4. What kind of voice makes an audio programme enjoyable to listen to?',
    suggestedTimeMinutes: 5,
    examinerTips: [
      'Connect Question 4 to vocal delivery vocabulary (warm baritone, unhurried cadence, articulate diction) for effortless lexical resource.'
    ],
    keyVocabulary: [
      { word: 'Unhurried cadence', meaning_bn: 'ধীরস্থির ও শ্রুতিমধুর বলার ছন্দ' },
      { word: 'Multitask effortlessly', meaning_bn: 'অনায়াসে একসাথে একাধিক কাজ করা' },
      { word: 'Articulate diction', meaning_bn: 'স্পষ্ট ও শুদ্ধ উচ্চারণ' }
    ],
    modelAnswer:
      '1. "Quite regularly, actually—especially documentary-style podcasts covering history, economics, and science. They’re a brilliant way to stay intellectually curious without staring at yet another screen."\n\n2. "Mostly during my morning commute or while cooking dinner. Turning mundane chores into learning time makes the evening feel far more productive."\n\n3. "It depends on the material. For dense non-fiction where I want to underline arguments, I still favour print; for biographies and storytelling, however, a well-narrated audiobook brings the characters vividly to life."\n\n4. "I’m drawn to narrators with a calm, resonant tone and an unhurried cadence—almost like a seasoned broadcaster or a wise grandfather telling a story—because crisp diction lets you absorb nuance without straining."',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_sp1_8',
    module: 'Speaking Part 1',
    topic: 'Society & Culture',
    subType: 'Part 1 Interview · Neighbourhood & Community',
    frequency: 'Recent Real Exam',
    title: 'Neighbours, Local Shops & Community Spirit',
    prompt:
      'EXAMINER QUESTIONS:\n1. Do you know most of the neighbours in your street or apartment building?\n2. How do neighbours usually help one another in your area?\n3. Do you prefer buying everyday groceries from a local corner shop or a large supermarket?\n4. What makes a neighbourhood feel genuinely welcoming?',
    suggestedTimeMinutes: 5,
    examinerTips: [
      'Avoid overly formal essay words in Part 1—keep idioms idiomatic ("on first-name terms", "pop down to the corner shop").'
    ],
    keyVocabulary: [
      { word: 'On first-name terms', meaning_bn: 'ঘনিষ্ঠ ও সহজ পরিচয়ের সম্পর্ক' },
      { word: 'Look out for one another', meaning_bn: 'একে অপরের খোঁজখবর ও খেয়াল রাখা' },
      { word: 'Sense of belonging', meaning_bn: 'আপনজন বা সমাজের অংশ হওয়ার অনুভূতি' }
    ],
    modelAnswer:
      '1. "I wouldn’t say I know everyone on the whole block, but I’m on first-name terms with the families on my floor. We always exchange a quick chat in the stairwell."\n\n2. "It’s mostly small, thoughtful gestures—taking in a parcel when someone is at work, sharing homemade dishes during festivals, or checking on elderly residents during heavy monsoon storms."\n\n3. "For fresh vegetables and tea leaves, I love popping down to our neighbourhood grocer because the owner remembers what we like. I only head to a big supermarket once a fortnight for bulk household supplies."\n\n4. "Safety and everyday warmth—well-lit pavements, clean streets, and people who actually make eye contact and smile rather than rushing past with headphones on."',
    modelBand: 'Band 8.5'
  },
  {
    id: 'qb_sp1_9',
    module: 'Speaking Part 1',
    topic: 'Economy & Work',
    subType: 'Part 1 Interview · Time Management & Routines',
    frequency: 'High-Frequency',
    title: 'Daily Schedules, Alarms & Punctuality',
    prompt:
      'EXAMINER QUESTIONS:\n1. Are you generally good at managing your daily schedule?\n2. Do you use a paper planner or digital reminders to stay organized?\n3. How do you feel when someone arrives late for an appointment with you?\n4. Is it easier to stick to a routine on weekdays or weekends?',
    suggestedTimeMinutes: 5,
    examinerTips: [
      'Show range of tenses (present habit, past shift, hypothetical) cleanly within 2–3 sentences per prompt.'
    ],
    keyVocabulary: [
      { word: 'Time-blocking', meaning_bn: 'নির্দিষ্ট কাজের জন্য আলাদা সময় ভাগ করে নেওয়া' },
      { word: 'Courteous heads-up', meaning_bn: 'ভদ্রতাসূচক অগ্রিম জানানো' },
      { word: 'Fall off track', meaning_bn: 'রুটিন থেকে বিচ্যুত হয়ে পড়া' }
    ],
    modelAnswer:
      '1. "I’ve become much more disciplined over the last year. I break my day into focused morning study blocks so that essential tasks are finished before afternoon distractions creep in."\n\n2. "I rely on a mix of both—digital calendar notifications for recurring study sessions and a small pocket notebook for ticking off my top three daily priorities."\n\n3. "If they send a quick message beforehand, I’m completely relaxed about a ten-minute delay because traffic happens. What genuinely frustrates me is radio silence when someone is half an hour late."\n\n4. "Weekdays are noticeably easier because work and study create a natural scaffold. On weekends, I deliberately leave room to rest, though I still keep a brief morning habit so I don’t lose momentum."',
    modelBand: 'Band 8.5'
  },
  {
    id: 'qb_sp1_10',
    module: 'Speaking Part 1',
    topic: 'Environment',
    subType: 'Part 1 Interview · Weather & Seasons',
    frequency: 'Practice Standard',
    title: 'Seasonal Changes, Rain & Outdoor Plans',
    prompt:
      'EXAMINER QUESTIONS:\n1. Which season of the year do you enjoy the most?\n2. Does sudden rain usually affect your daily routine?\n3. What activities do people in your country enjoy during cooler winter months?\n4. Have you noticed weather patterns changing where you live?',
    suggestedTimeMinutes: 5,
    examinerTips: [
      'Use vivid weather collocations ("torrential downpour", "crisp winter mornings", "sweltering humidity") instead of basic "hot/cold/rainy".'
    ],
    keyVocabulary: [
      { word: 'Crisp autumn breeze', meaning_bn: 'সতেজ ও মৃদু শরতের বাতাস' },
      { word: 'Torrential downpour', meaning_bn: 'প্রবল মুষলধারে বৃষ্টি' },
      { word: 'Sweltering humidity', meaning_bn: 'অসহনীয় ভ্যাপসা গরম' }
    ],
    modelAnswer:
      '1. "Hands down, late autumn and early winter. The sweltering humidity finally lifts, skies turn a brilliant clear blue, and you can walk outdoors for hours without breaking a sweat."\n\n2. "Occasionally, yes—a sudden monsoon downpour can bring city traffic to a standstill. That said, I actually find steady evening rain quite soothing when I’m indoors studying with a cup of hot tea."\n\n3. "Cooler months are prime season for family picnics, street-food fairs featuring warm winter rice cakes, and weekend badminton matches set up in neighbourhood courtyards."\n\n4. "Noticeably so. Summers feel noticeably longer and hotter than when I was a child, and rainfall arrives in much shorter, heavier bursts rather than gentle steady spells."',
    modelBand: 'Band 8.5'
  },

  // =========================================================================
  // SPEAKING PART 2 (+5 Recent Real-Exam Cue Cards)
  // =========================================================================
  {
    id: 'qb_sp2_7',
    module: 'Speaking Part 2',
    topic: 'Society & Culture',
    subType: 'Cue Card · Person',
    frequency: 'Recent Real Exam',
    title: 'An Older Person Whose Stories or Wisdom You Deeply Admire',
    prompt: 'Describe an older person whose life experience, stories, or wisdom you deeply admire.',
    cueCardBulletPoints: [
      'Who this person is and how you know them',
      'What kind of stories or advice they share with you',
      'How their manner of speaking or personality influences others',
      'And explain why you respect this person so deeply'
    ],
    suggestedTimeMinutes: 3,
    examinerTips: [
      'Spend 1 minute jotting sensory hooks (voice tone, specific anecdote, lasting lesson) so you speak effortlessly for the full 2 minutes.',
      'Weave past narrative ("used to sit on the veranda") with present reflection ("even today, whenever I feel rushed...").'
    ],
    keyVocabulary: [
      { word: 'Quiet gravitas', meaning_bn: 'শান্ত ও গভীর ব্যক্তিত্বের গাম্ভীর্য' },
      { word: 'Hard-won perspective', meaning_bn: 'দীর্ঘ জীবনের অভিজ্ঞতায় অর্জিত প্রজ্ঞা' },
      { word: 'Measured tone', meaning_bn: 'ধীরস্থির ও সুচিন্তিত কণ্ঠস্বর' }
    ],
    modelAnswer:
      'The older person I admire most is my maternal grandfather, a retired civil engineer who spent nearly four decades designing rural bridges and irrigation embankments. Whenever I visit my hometown, we still sit on his veranda at dusk with two cups of spiced tea, and listening to him feels like opening a living archive of patience and resilience.\n\nWhat makes his stories unforgettable isn’t grand bragging, but his eye for human detail. He often recounts how, during the 1988 floods, his field team worked round the clock alongside local villagers using bamboo reinforcement when steel supplies were cut off. Rather than lecturing me with clichés, he weaves practical wisdom into anecdotes—reminding me that careful preparation during calm seasons is what saves you when a storm hits.\n\nHis manner of speaking amplifies that wisdom. He has a deep, unhurried voice filled with quiet gravitas; he never interrupts anyone, listens with genuine curiosity, and chooses every word carefully. Whenever extended family members argue over stressful decisions, his calm presence immediately lowers the temperature in the room.\n\nI respect him so deeply because he embodies integrity without arrogance. Watching him stay intellectually curious well into his seventies—still reading history journals and tending his mango orchard—has completely reshaped how I think about ageing and lifelong purpose.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_sp2_8',
    module: 'Speaking Part 2',
    topic: 'Education',
    subType: 'Cue Card · Skill / Learning Experience',
    frequency: 'High-Frequency',
    title: 'A Challenging Skill You Learned Through Daily Practice',
    prompt: 'Describe a difficult skill you successfully learned through consistent daily practice.',
    cueCardBulletPoints: [
      'What the skill was and why you decided to learn it',
      'How you structured your daily practice routine',
      'What obstacles nearly made you give up',
      'And explain how mastering this skill has benefited you'
    ],
    suggestedTimeMinutes: 3,
    examinerTips: [
      'Use clear chronological progression: initial struggle → turning point → disciplined habit → concrete payoff.'
    ],
    keyVocabulary: [
      { word: 'Steep learning curve', meaning_bn: 'শুরুর দিকে শেখার কঠিন ধাপ' },
      { word: 'Deliberate practice', meaning_bn: 'লক্ষ্যনির্দিষ্ট ও মনোযোগী অনুশীলন' },
      { word: 'Compounding progress', meaning_bn: 'ধীরে ধীরে জমে ওঠা বড় অগ্রগতি' }
    ],
    modelAnswer:
      'One demanding skill that genuinely transformed my confidence was learning to speak clearly and persuasively in academic English under strict time pressure. Two years ago, although I could read complex textbooks effortlessly, my mind would go blank whenever I had to organize an impromptu two-minute response aloud.\n\nTo overcome that barrier, I stopped cramming passively and committed to twenty minutes of deliberate practice every evening at eight o’clock. I recorded myself answering structured prompts, listened back critically to spot filler words and flat intonation, and shadowed professional radio broadcasters to refine my rhythm and word stress.\n\nThe hardest stretch was the first three weeks. Hearing recordings of my own hesitations was humbling, and on exhausting days I was sorely tempted to skip the drill. What kept me going was tracking tiny daily milestones—celebrating a clean streak rather than chasing instant perfection.\n\nWithin three months, the compounding progress became unmistakable. Not only did I stop freezing during university seminar discussions, I actually began enjoying debates. More broadly, the experience proved to me that consistency beats raw talent almost every single time.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_sp2_9',
    module: 'Speaking Part 2',
    topic: 'Environment',
    subType: 'Cue Card · Place',
    frequency: 'Recent Real Exam',
    title: 'A Natural Place Where You Felt Completely Restored',
    prompt: 'Describe a natural place you visited where you felt completely calm and refreshed.',
    cueCardBulletPoints: [
      'Where this place is located and how you travelled there',
      'What the landscape, sounds, and atmosphere were like',
      'What you did while you were there',
      'And explain why this visit left such a lasting impression on you'
    ],
    suggestedTimeMinutes: 3,
    examinerTips: [
      'Appeal to at least three senses (visual light, acoustic stillness, cool scent of foliage) to elevate descriptive range.'
    ],
    keyVocabulary: [
      { word: 'Unspoiled sanctuary', meaning_bn: 'অকৃত্রিম ও শান্ত প্রাকৃতিক আশ্রয়স্থল' },
      { word: 'Mist-shrouded hills', meaning_bn: 'কুয়াশাচ্ছন্ন পাহাড়শ্রেণি' },
      { word: 'Mental recalibration', meaning_bn: 'মানসিক সতেজতা ও ভারসাম্য ফিরে পাওয়া' }
    ],
    modelAnswer:
      'A natural place that completely reset my mind was the tea valleys of Srimangal during a quiet November weekend. My cousin and I caught an early dawn train out of the city, watching concrete suburbs gradually dissolve into emerald wetlands and mist-shrouded hills.\n\nWhen we stepped onto a footpath winding through the terraced tea gardens just after sunrise, the stillness was extraordinary. Fine silver dew clung to every leaf, the air smelled faintly of damp earth and crushed citrus blossom, and the only sounds were distant birdsong and the crunch of gravel beneath our trainers. Unlike crowded coastal resorts, there were no loudspeakers or neon signs competing for attention.\n\nWe spent the morning walking slowly along the forest reserve trail, photographing hornbills in the upper canopy, and later sharing freshly brewed seven-layer tea at a tiny wooden cabin overlooking the valley. I left my phone on airplane mode for almost eight hours straight.\n\nThat trip stayed with me because it served as a genuine mental recalibration. Living in a dense metropolis makes you forget how deeply constant noise drains your focus; stepping into an unspoiled sanctuary reminded me how essential periodic contact with nature is for clarity and creativity.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_sp2_10',
    module: 'Speaking Part 2',
    topic: 'Technology',
    subType: 'Cue Card · Object / Invention',
    frequency: 'High-Frequency',
    title: 'A Piece of Everyday Technology You Would Struggle to Live Without',
    prompt: 'Describe a piece of modern technology (other than a smartphone) that makes your daily life significantly easier.',
    cueCardBulletPoints: [
      'What the device or tool is and when you first started using it',
      'How frequently you use it in your daily routine',
      'What specific problems it solves for you',
      'And explain why you find it more helpful than older alternatives'
    ],
    suggestedTimeMinutes: 3,
    examinerTips: [
      'Picking a specific, non-cliché tool (e.g., noise-cancelling headphones or an e-ink reader) lets you use concrete, authentic vocabulary.'
    ],
    keyVocabulary: [
      { word: 'Active noise cancellation', meaning_bn: 'বাইরের অবাঞ্ছিত শব্দ স্বয়ংক্রিয়ভাবে কমানোর প্রযুক্তি' },
      { word: 'Acoustic cocoon', meaning_bn: 'নীরব ও মনোযোগী কাজের পরিবেশ' },
      { word: 'Deep focus', meaning_bn: 'গভীর ও নিরবচ্ছিন্ন মনোযোগ' }
    ],
    modelAnswer:
      'Aside from my phone, the piece of technology I rely on most is a pair of over-ear active noise-cancelling headphones that I bought two years ago while preparing for major university exams. Living along a bustling main road, constant traffic hum and construction drills used to fracture my concentration every few minutes.\n\nI wear them virtually every single day—whether I’m completing timed listening drills at my desk, reviewing lecture recordings on a noisy bus, or writing essays in a busy library. With a single tap, their internal microphones counteract low-frequency engine rumble and create an instant acoustic cocoon.\n\nCompared with traditional foam earplugs or cheap earbuds, the difference is night and day. Earplugs only muffle ambient din slightly and become uncomfortable after half an hour, whereas noise-cancelling headphones deliver crystal-clear speech fidelity at safe, moderate volumes without straining my ears.\n\nUltimately, they’ve bought me back hours of uninterrupted deep focus every week, turning otherwise chaotic environments into productive study spaces.',
    modelBand: 'Band 8.5'
  },
  {
    id: 'qb_sp2_11',
    module: 'Speaking Part 2',
    topic: 'Economy & Work',
    subType: 'Cue Card · Event / Achievement',
    frequency: 'Practice Standard',
    title: 'A Team Project That Succeeded Despite a Tight Deadline',
    prompt: 'Describe a time when you worked with a team to complete an important task under a tight deadline.',
    cueCardBulletPoints: [
      'What the project was and who was on your team',
      'Why the deadline was so demanding',
      'What role you played to keep everyone aligned',
      'And explain how you felt once the project was completed'
    ],
    suggestedTimeMinutes: 3,
    examinerTips: [
      'Use crisp project-management and collaboration lexis ("delegate clearly", "bottleneck", "pull together under pressure").'
    ],
    keyVocabulary: [
      { word: 'Clear division of labour', meaning_bn: 'কাজের সুস্পষ্ট বণ্টন' },
      { word: 'Crunch time', meaning_bn: 'চূড়ান্ত ও চাপপূর্ণ সময়সীমা' },
      { word: 'Collective pride', meaning_bn: 'দলগত সাফল্যের যৌথ গর্ব' }
    ],
    modelAnswer:
      'Last spring, three classmates and I entered a national sustainability case competition where we had just 48 hours to design a flood-resilient micro-grid proposal for coastal schools. Two days sounds generous until you realize we had to combine financial modelling, engineering schematics, and a live ten-minute pitch deck.\n\nInitially, we wasted three hours debating minor aesthetic details until I suggested stepping back to establish a clear division of labour. Since I was strongest in data synthesis and public speaking, I took charge of the cost-benefit spreadsheet and final narrative arc, while our engineering teammates drafted the solar-battery diagrams and risk assessment.\n\nWe set short two-hour check-ins so nobody worked in a silo, and when a key dataset failed to load on the second evening, everyone pulled together calmly to cross-verify alternative government figures instead of panicking.\n\nSubmitting the deck with twenty minutes to spare—and eventually placing second out of forty universities—gave me an unforgettable rush of collective pride. It taught me that calm structure is the greatest antidote to deadline stress.',
    modelBand: 'Band 8.5'
  },

  // =========================================================================
  // SPEAKING PART 3 (+5 Abstract Band 8.5–9.0 Discussion Sets)
  // =========================================================================
  {
    id: 'qb_sp3_6',
    module: 'Speaking Part 3',
    topic: 'Society & Culture',
    subType: 'Part 3 · Intergenerational Knowledge & Ageing Societies',
    frequency: 'Recent Real Exam',
    title: 'Intergenerational Wisdom & Ageing Populations',
    prompt:
      'EXAMINER FOLLOW-UP QUESTIONS:\n1. Why do younger generations sometimes dismiss advice from older family members?\n2. How can modern societies make better use of the skills and experience of retired citizens?\n3. Will rising life expectancy fundamentally change the traditional age of retirement?',
    suggestedTimeMinutes: 6,
    examinerTips: [
      'Shift smoothly from personal anecdotes (Part 2) to broader societal patterns ("Across many fast-digitizing economies...").',
      'Use balanced concession structures ("While rapid technological change can make specific technical advice feel dated, foundational judgement about human nature remains timeless").'
    ],
    keyVocabulary: [
      { word: 'Institutional memory', meaning_bn: 'দীর্ঘ অভিজ্ঞতালব্ধ প্রাতিষ্ঠানিক জ্ঞান' },
      { word: 'Phased retirement', meaning_bn: 'ধাপে ধাপে অবসরে যাওয়ার নমনীয় ব্যবস্থা' },
      { word: 'Reverse mentoring', meaning_bn: 'নবীন ও প্রবীণের পারস্পরিক জ্ঞান বিনিময়' }
    ],
    modelAnswer:
      '1. "I think the friction usually arises because the pace of technological disruption makes older operational experience appear obsolete on the surface. A twenty-year-old navigating remote digital careers may assume a grandparent’s career advice doesn’t translate. Yet what younger people sometimes overlook is that while tools evolve every five years, principles like negotiation, emotional restraint, and long-term patience rarely expire."\n\n2. "Communities could create structured part-time mentorship programmes pairing retired engineers, accountants, and teachers with community colleges or small startups. That preserves invaluable institutional memory while simultaneously giving retirees a strong sense of civic purpose and social connection."\n\n3. "Almost inevitably, yes. Fixed retirement at sixty was designed when average lifespans hovered around seventy. As people routinely live healthily into their eighties, we are likely to see phased retirement—where seasoned professionals transition to advisory three-day weeks rather than stepping off a career cliff overnight."',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_sp3_7',
    module: 'Speaking Part 3',
    topic: 'Education',
    subType: 'Part 3 · Lifelong Learning & Habit Science',
    frequency: 'High-Frequency',
    title: 'Self-Directed Learning & Attention Spans in the Digital Age',
    prompt:
      'EXAMINER FOLLOW-UP QUESTIONS:\n1. Why do so many adults struggle to maintain consistent self-study habits compared with school students?\n2. Has constant exposure to short-form social media damaged people’s capacity for deep concentration?\n3. Should employers provide paid weekly study hours so staff can continually reskill?',
    suggestedTimeMinutes: 6,
    examinerTips: [
      'Give concrete mechanisms (external accountability, dopamine reward loops, ROI on talent retention) to demonstrate Band 9 abstract reasoning.'
    ],
    keyVocabulary: [
      { word: 'External accountability', meaning_bn: 'বাহ্যিক তদারকি ও জবাবদিহিতা' },
      { word: 'Cognitive stamina', meaning_bn: 'দীর্ঘ সময় মনোযোগ ধরে রাখার মানসিক সক্ষমতা' },
      { word: 'Strategic talent retention', meaning_bn: 'দক্ষ কর্মী ধরে রাখার দীর্ঘমেয়াদি কৌশল' }
    ],
    modelAnswer:
      '1. "In school, your entire environment provides external accountability—fixed bells, graded exams, and peers moving at the same tempo. Adults, by contrast, have to juggle jobs, family responsibilities, and decision fatigue, so without deliberate scheduling and gentle reminders, self-study is always the first habit squeezed out."\n\n2. "To a considerable extent, yes. Endless vertical video feeds train the brain to expect novelty every fifteen seconds, which makes reading a dense thirty-page report feel artificially uncomfortable. Fortunately, attention works like a muscle: people who deliberately set distraction-free intervals can rebuild deep cognitive stamina remarkably quickly."\n\n3. "Forward-thinking employers absolutely should. In fields reshaped rapidly by software and automation, carving out even three paid hours a week for structured upskilling is far more economical than firing staff and paying steep recruitment costs to hire replacements."',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_sp3_8',
    module: 'Speaking Part 3',
    topic: 'Environment',
    subType: 'Part 3 · Eco-Tourism & Conservation Trade-Offs',
    frequency: 'Recent Real Exam',
    title: 'Balancing Nature Tourism with Ecological Preservation',
    prompt:
      'EXAMINER FOLLOW-UP QUESTIONS:\n1. Can tourism ever genuinely help protect fragile natural habitats, or does it inevitably harm them?\n2. Should governments cap daily visitor numbers at famous national parks?\n3. Who bears greater responsibility for environmental conservation—governments, corporations, or individual travellers?',
    suggestedTimeMinutes: 6,
    examinerTips: [
      'Evaluate nuance rather than taking a simplistic "tourism is bad" stance—mention permit revenue funding anti-poaching rangers versus unchecked mass resort construction.'
    ],
    keyVocabulary: [
      { word: 'Carrying capacity', meaning_bn: 'পরিবেশের ক্ষতি ছাড়া সর্বোচ্চ পর্যটক ধারণক্ষমতা' },
      { word: 'Economic incentive for stewardship', meaning_bn: 'প্রকৃতি সংরক্ষণের আর্থিক প্রণোদনা' },
      { word: 'Regulatory guardrails', meaning_bn: 'আইনগত সুরক্ষা ও সীমারেখা' }
    ],
    modelAnswer:
      '1. "Done responsibly, low-impact eco-tourism can actually be a lifeline for conservation. When local communities earn stable livelihoods as wildlife guides and lodge owners, they gain a powerful economic incentive to protect forests from illegal logging. The danger arises only when unregulated mass tourism exceeds a habitat’s ecological carrying capacity."\n\n2. "Yes, daily visitor caps paired with advance timed permits are a proven safeguard. Places like the Galápagos Islands and Bhutan demonstrate that restricting volume preserves both fragile wildlife corridors and the serenity visitors travelled to experience in the first place."\n\n3. "All three play interdependent roles, though governments hold the decisive lever. Individual travellers can certainly avoid single-use plastics, yet without binding regulatory guardrails and emissions standards on airlines and developers, voluntary goodwill alone rarely shifts industry-wide behaviour."',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_sp3_9',
    module: 'Speaking Part 3',
    topic: 'Urbanization',
    subType: 'Part 3 · Urban Acoustic Design & Public Health',
    frequency: 'Practice Standard',
    title: 'Noise Pollution & Architectural Well-Being in Megacities',
    prompt:
      'EXAMINER FOLLOW-UP QUESTIONS:\n1. Why is urban noise pollution often overlooked compared with air or water pollution?\n2. How does the physical design of a city influence residents’ daily stress levels?\n3. Do you think future megacities will become quieter as electric vehicles replace petrol engines?',
    suggestedTimeMinutes: 6,
    examinerTips: [
      'Notice the subtle scientific counter-point for Q3: electric motors are quiet at low speeds, but tyre-road friction still dominates above 50 km/h—impressive analytical depth!'
    ],
    keyVocabulary: [
      { word: 'Chronic acoustic stress', meaning_bn: 'দীর্ঘমেয়াদি শব্দদূষণজনিত মানসিক ও শারীরিক চাপ' },
      { word: 'Biophilic urban design', meaning_bn: 'প্রকৃতির সাথে সামঞ্জস্যপূর্ণ নগর পরিকল্পনা' },
      { word: 'Sound-absorbing foliage', meaning_bn: 'শব্দ শোষণে সক্ষম গাছপালা ও সবুজ বেষ্টনী' }
    ],
    modelAnswer:
      '1. "Largely because noise leaves no visible smog or chemical residue, so city dwellers gradually normalize it as the background soundtrack of urban prosperity. Yet public-health research shows chronic acoustic stress elevates cortisol levels, disrupts deep sleep, and raises hypertension risk just as tangibly as other pollutants."\n\n2. "Immense amounts of everyday anxiety stem directly from urban geometry. Narrow pavements squeezed beside roaring six-lane highways keep pedestrians constantly on edge, whereas biophilic layouts featuring tree-lined walkways, pocket parks, and mixed-use courtyards noticeably lower heart rates and invite spontaneous neighbourly interaction."\n\n3. "Electric vehicles will certainly soften low-speed engine roar in residential side streets. On major ring roads, however, tyre friction against asphalt accounts for most traffic noise above fifty kilometres an hour—so genuinely quieter cities will also require porous sound-absorbing road surfaces and fewer private cars overall."',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_sp3_10',
    module: 'Speaking Part 3',
    topic: 'Economy & Work',
    subType: 'Part 3 · Collaboration & Modern Leadership',
    frequency: 'High-Frequency',
    title: 'Teamwork, Remote Collaboration & Workplace Culture',
    prompt:
      'EXAMINER FOLLOW-UP QUESTIONS:\n1. What qualities distinguish an effective team leader from an overly controlling manager?\n2. Is it harder to build genuine trust within remote international teams than in shared offices?\n3. Should university grades rely more heavily on group projects or individual examinations?',
    suggestedTimeMinutes: 6,
    examinerTips: [
      'Address trade-offs cleanly (e.g., free-rider problem in group grading vs real-world collaborative readiness).'
    ],
    keyVocabulary: [
      { word: 'Psychological safety', meaning_bn: 'ভয় ছাড়া মতামত ও ভুল প্রকাশের নিরাপদ কর্মপরিবেশ' },
      { word: 'Micromanagement', meaning_bn: 'প্রতিটি ক্ষুদ্র কাজে অপ্রয়োজনীয় হস্তক্ষেপ' },
      { word: 'Free-rider problem', meaning_bn: 'দলীয় কাজে পরিশ্রম না করে অন্যের ওপর নির্ভরশীলতা' }
    ],
    modelAnswer:
      '1. "An effective leader defines crystal-clear objectives and then trusts specialists to choose how best to execute them, cultivating psychological safety so team members flag risks early. A controlling manager, by contrast, fixates on minor procedural compliance, which breeds resentment and stifles initiative."\n\n2. "Initially, yes, because casual micro-interactions—like grabbing coffee after a meeting—are missing online, and written messages easily lose subtle vocal warmth. That said, remote teams can cultivate deep trust when they establish transparent norms, celebrate milestones visibly, and meet in person once or twice a year."\n\n3. "A calibrated blend works best. Individual exams remain indispensable for verifying core mastery and preventing the classic free-rider problem, yet well-designed group projects with peer accountability mirror how modern engineering, medical, and business teams actually operate."',
    modelBand: 'Band 9.0'
  }
];
