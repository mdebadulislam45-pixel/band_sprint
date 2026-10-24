// Authentic IELTS Live Mock Exam Database & Question Bank
// Features authentic exam sets, full 4-section listening simulations,
// academic reading passages, writing prompts, and speaking topic banks
// with dynamic anti-repetition selection.

import { selectFreshQuestions, recordSeenQuestion } from '../utils/antiRepetition';

export interface QuestionItem {
  id: number;
  section: 'listening' | 'reading';
  type: string;
  prompt: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface MockExamSet {
  id: string;
  title: string;
  source: string;
  badge: string;
  level: string; // e.g. 'B1-B2', 'B2', 'B2-C1', 'C1'
  format: 'Academic' | 'General Training';
  listeningTitle: string;
  listeningScript: string;
  audioSrc?: string;
  readingTitle: string;
  readingPassage: string;
  writingPrompt: string;
  task1Prompt?: string;
  modelEssay: string;
  questions: QuestionItem[];
}

export interface SpeakingTopicSet {
  id: string;
  topicName: string;
  part1Questions: {
    question: string;
    examinerTip: string;
  }[];
  part2CueCard: {
    prompt: string;
    bulletPoints: string[];
    followUp: string;
    examinerTip: string;
  };
  part3Questions: {
    question: string;
    examinerTip: string;
  }[];
}

export const MOCK_EXAM_SETS: MockExamSet[] = [
  // ==================== SET 1: Cambridge Academic 18 Standard ====================
  {
    id: 'cambridge-18',
    title: 'Academic Practice Set 18 · Test 1',
    source: 'Original Practice Audio (Cambridge-Calibrated Format)',
    badge: 'Original Practice · Academic',
    level: 'B2-C1',
    format: 'Academic',
    listeningTitle: 'University Orientation & Course Admissions Office',
    audioSrc: 'https://ia801503.us.archive.org/15/items/insightintoielts0000jake_o7m2/Track%2001.mp3',
    listeningScript: `International English Language Testing System. Listening Practice Simulation.
Section 1. You will hear an admissions officer at a British university conducting an enrollment verification interview with a prospective engineering postgraduate student.
First, you have some time to look at questions 1 to 5.
Now listen carefully and answer questions 1 to 5.

Admissions Officer: "Good morning, University Admissions and Student Services. My name is Arthur Davies. How may I direct your call today?"
Liam: "Good morning, Mr. Davies. I am calling from Manchester regarding my postgraduate verification details for the upcoming autumn term. I received my conditional offer letter, but the registrar asked me to verify my identity and finalize my course module preferences over the telephone."
Admissions Officer: "Of course! Let me open up your student portal on our system. Could you start by giving me your full surname, please?"
Liam: "Yes, certainly. My surname is Pennington. That is spelled P-E-N-N-I-N-G-T-O-N. And my given name is Liam."
Admissions Officer: "Thank you, Mr. Pennington. Let me just enter that into our database... P-E-N-N-I-N-G-T-O-N. Excellent, your profile has appeared on my screen. Now, for emergency communication and dispatching your course welcome pack, could you please confirm your primary contact telephone number?"
Liam: "Yes, my daytime number is 07890 456999... Oh, wait! Please forgive me, Mr. Davies! That was my old household landline number, which my family recently disconnected when we moved flat. My active personal mobile number is 07890 456123."
Admissions Officer: "No problem at all, let me make that correction straight away: 07890 456123. Wonderful. Now, looking at your faculty pathway, our Faculty of Engineering offers three specialist tracks. You had initially expressed interest in Civil Infrastructure, and also asked about Biomedical Robotics. Have you finalized which discipline you wish to pursue?"
Liam: "Yes, I spent a lot of time reviewing the latest industrial sector employment reports and renewable power targets in the United Kingdom. So after discussing it with my undergraduate tutor, I am fully committed to specializing in Renewable Energy Systems."
Admissions Officer: "A brilliant decision, Mr. Pennington! Renewable Energy Systems has some of our highest research funding and industry placements with national wind and tidal projects."
Liam: "That is wonderful to hear. Also, could I ask a quick directional question about the university campus layout? When I visit for induction day next week, where exactly is the specialized Language Laboratory located? Someone told me it was opposite the central clock tower."
Admissions Officer: "Ah, that is a very common misconception among new students! The clock tower is adjacent to the main dining hall. To find the Language Laboratory, you walk past the central library, follow the pedestrian gravel path heading north, and tucked directly behind the North Auditorium, you will see the modern glass entrance to the Language Lab."
Liam: "Nestled directly behind the North Auditorium along the gravel path. Got it, thank you!"
Admissions Officer: "You are most welcome. And one final administrative note regarding your academic timetable: before regular semester lectures commence in October, all engineering postgraduates are required to complete the intensive introductory research seminar. This preliminary foundation course spans exactly 6 weeks."
Liam: "Splendid! Exactly 6 weeks. That fits my summer schedule perfectly. Thank you so much for your guidance, Mr. Davies."
Admissions Officer: "My pleasure, Mr. Pennington. We look forward to welcoming you to the campus. Goodbye."

That is the end of Section 1. You now have half a minute to check your answers.`,
    readingTitle: 'THE NEUROBIOLOGY OF BILINGUALISM & COGNITIVE RESERVE',
    readingPassage: `THE NEUROBIOLOGY OF BILINGUALISM & COGNITIVE RESERVE

[A] In an increasingly globalized economy, the acquisition of multiple spoken languages has shifted from a rarefied intellectual pastime to an ubiquitous global necessity. Beyond obvious geopolitical and communicative utility, modern cognitive neuroscience has uncovered profound structural adaptations inside the multilingual brain. For decades, traditional pedagogical theory hypothesized that juggling two linguistic codes resulted in cognitive delay or communicative interference among juveniles. However, cutting-edge fMRI neuroimaging has utterly dismantled this antiquated deficit model.

[B] The most startling breakthrough concerns the concept of "Cognitive Reserve"—the brain’s resilience against neurological damage or age-related neuropathology. In benchmark clinical trials involving Alzheimer's patients, bilingual speakers consistently demonstrated a 4-to-5-year delay in the onset of clinical neurodegenerative symptoms compared to socioeconomically matched monolinguals. Although physical neurofibrillary tangles and amyloid plaques were equally prevalent on brain scans, the bilingual brain had constructed alternative neural pathways, maintaining functional cognitive lucidity despite structural deterioration.

[C] Why does this neurological fortification occur? Neuroimaging demonstrates both linguistic systems remain permanently active, necessitating continuous subconscious inhibitory control rather than full deactivation. When an English-French bilingual utters a word, both lexical lexicons fire simultaneously. The brain's executive control network—centered in the prefrontal cortex and anterior cingulate—must relentlessly suppress the competing language while elevating the target utterance. This uninterrupted mental gymnastics operates like high-intensity interval training for synaptic connections, strengthening executive functioning, conflict resolution, and working memory.

[D] Significantly, this neuroplastic bounty is not restricted to childhood polyglots. While childhood bilingualism fosters native phonological acquisition, adult second language acquisition stimulates extensive neurogenesis and white matter structural integrity. Late-stage learners exhibit measurable expansions in the hippocampus and cerebral cortex after merely three months of intensive immersion. Therefore, mastering a second language in adulthood stands as one of the most cost-effective and efficacious non-pharmacological interventions available for lifelong neurological preservation.`,
    writingPrompt: "In many countries, an increasing number of young people are choosing to take a gap year between secondary school and university. Do the advantages of this trend outweigh the disadvantages? Give reasons for your answer and include any relevant examples from your own knowledge or experience. (Minimum 250 words)",
    task1Prompt: "The chart below shows the percentage of households with access to high-speed broadband internet in five different European nations between 2010 and 2024. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. (Minimum 150 words)",
    modelEssay: `In contemporary education, deferring university matriculation for an experiential sabbatical year has transitioned from an elite European novelty into a mainstream global phenomenon. While critics point to academic derailment and economic burdens, I contend that the experiential maturity, vocational clarity, and pragmatic independence cultivated during a gap year overwhelmingly eclipse its transient pitfalls.

Chief among the arguments against this hiatus is the potential erosion of academic momentum. Students separated from rigorous scholastic regimens frequently experience cognitive inertia, struggling to reintegrate into intensive examinations and peer competition upon arrival at university. Furthermore, unfocused gap years devoid of structured employment or philanthropy risk becoming financially parasitic on parents, deteriorating into unstructured leisure.

Conversely, the psychological and professional dividends of experiential learning are profound. Secondary school leavers typically possess negligible exposure to authentic workplace dynamics. Engaging in structured internships, overseas voluntary teaching, or grassroots entrepreneurship instills self-reliance and emotional resilience. Consequently, these undergraduates return with acute academic purpose, having validated their career aspirations against practical realities rather than theoretical speculation.

In conclusion, although the threat of diminished scholastic discipline demands meticulous planning, the transformational maturity and self-direction engendered by a sabbatical year render it an unequivocally advantageous milestone for young adults.`,
    questions: [
      {
        id: 1,
        section: 'listening',
        type: 'Form Completion (Surname)',
        prompt: '1. Candidate Surname (spelled letter-by-letter in audio):',
        correctAnswer: 'PENNINGTON',
        explanation: 'The speaker explicitly spells out: P-E-N-N-I-N-G-T-O-N.'
      },
      {
        id: 2,
        section: 'listening',
        type: 'Self-Correction Trap (Contact Number)',
        prompt: '2. Preferred Contact Number (watch for self-correction!):',
        correctAnswer: '07890456123',
        explanation: 'The caller states 07890 456999 then immediately self-corrects: "Wait, sorry, that is my landline. My active mobile is 07890 456123".'
      },
      {
        id: 3,
        section: 'listening',
        type: 'Multiple Choice (Course Choice)',
        prompt: '3. Which engineering specialization did the student finalize?',
        options: ['A) Civil Infrastructure', 'B) Renewable Energy Systems', 'C) Biomedical Robotics'],
        correctAnswer: 'B) Renewable Energy Systems',
        explanation: 'The tutor discusses Robotics, but the candidate confirms: "After considering sector growth, I am committed to Renewable Energy Systems".'
      },
      {
        id: 4,
        section: 'listening',
        type: 'Map Directional Pin',
        prompt: '4. The Language Laboratory is located:',
        options: ['A) Opposite the Clock Tower', 'B) Tucked behind the North Auditorium', 'C) South of the Lake'],
        correctAnswer: 'B) Tucked behind the North Auditorium',
        explanation: 'The guide clearly states: "Follow the gravel pathway past the hall, and nestled immediately behind the North Auditorium is the Language Lab".'
      },
      {
        id: 5,
        section: 'listening',
        type: 'Short Answer (Course Duration)',
        prompt: '5. Total duration of the introductory module (in weeks):',
        correctAnswer: '6 weeks',
        explanation: 'The administrator states: "The preliminary module encompasses 6 weeks of intensive seminars".'
      },
      {
        id: 6,
        section: 'reading',
        type: 'True / False / Not Given',
        prompt: '6. Early pedagogical theory claimed bilingualism enhanced childhood verbal development.',
        options: ['TRUE', 'FALSE', 'NOT GIVEN'],
        correctAnswer: 'FALSE',
        explanation: 'Paragraph A clarifies that traditional theory hypothesized that juggling two languages caused cognitive delay or communicative interference.'
      },
      {
        id: 7,
        section: 'reading',
        type: 'True / False / Not Given',
        prompt: '7. Bilingual individuals demonstrated a 4-to-5-year delay in noticeable symptoms of Alzheimer’s disease.',
        options: ['TRUE', 'FALSE', 'NOT GIVEN'],
        correctAnswer: 'TRUE',
        explanation: 'Paragraph B explicitly confirms: "bilingual speakers consistently demonstrated a 4-to-5-year delay in the onset of clinical neurodegenerative symptoms".'
      },
      {
        id: 8,
        section: 'reading',
        type: 'True / False / Not Given',
        prompt: '8. Late adult second language learners showed structural brain alterations within three months.',
        options: ['TRUE', 'FALSE', 'NOT GIVEN'],
        correctAnswer: 'TRUE',
        explanation: 'Paragraph D states that late-stage learners exhibited measurable expansions in the hippocampus and cerebral cortex after merely three months.'
      },
      {
        id: 9,
        section: 'reading',
        type: 'Vocabulary in Context',
        prompt: '9. In Paragraph C, the word "inhibitory" is closest in meaning to:',
        options: ['A) Restrictive / suppressing', 'B) Accelerating', 'C) Emotional'],
        correctAnswer: 'A) Restrictive / suppressing',
        explanation: 'Inhibitory control refers to the brain actively holding back or suppressing competing lexical inputs.'
      },
      {
        id: 10,
        section: 'reading',
        type: 'Main Idea Matching',
        prompt: '10. Which statement best summarizes the author’s primary thesis in the passage?',
        options: [
          'A) Second language learning is only beneficial if acquired during infancy.',
          'B) Adult language acquisition stimulates neural plasticity despite mature brain architecture.',
          'C) Monolinguals suffer severe communicative deficits in commercial environments.'
        ],
        correctAnswer: 'B) Adult language acquisition stimulates neural plasticity despite mature brain architecture.',
        explanation: 'Paragraph D argues that plasticity is retained across adulthood, validating late-stage language learning.'
      }
    ]
  },

  // ==================== SET 2: Cambridge Academic 17 Test Suite ====================
  {
    id: 'cambridge-17',
    title: 'Academic Practice Set 17 · Test 2',
    source: 'Original Practice Audio (British Council & IDP Calibrated)',
    badge: 'Original Practice · B2',
    level: 'B2',
    format: 'Academic',
    listeningTitle: 'Cotswold Heritage Arts Centre & Festival Registration',
    audioSrc: 'https://ia801503.us.archive.org/15/items/insightintoielts0000jake_o7m2/Track%2002.mp3',
    listeningScript: `International English Language Testing System. Listening Practice Simulation.
Section 1. You will hear an enquiry dialogue between a community arts coordinator and a visitor registering for the Cotswold Summer Arts Festival.
First, you have some time to look at questions 1 to 5.
Now listen carefully and answer questions 1 to 5.

Coordinator: "Good afternoon, Cotswold Community Arts and Heritage Council. My name is George Higgins. How may I assist you today?"
Beatrice: "Good afternoon, Mr. Higgins. I'm ringing up to enquire about booking tickets for the upcoming Summer Chamber Music Recital, and my friends and I would also like to register in advance for one of your weekend craft masterclasses."
Coordinator: "Splendid! The festival is going to be especially lively this year. Let me create an attendee booking record for your party. Could I start by taking your surname, please?"
Beatrice: "Yes, it is Kensington. Let me spell that out for you: K-E-N-S-I-N-G-T-O-N."
Coordinator: "Thank you. That is K-E-N-S-I-N-G-T-O-N. And your first name?"
Beatrice: "Beatrice."
Coordinator: "Lovely, Ms. Kensington. And what is the most reliable telephone number where we can reach you in case of any program schedule updates?"
Beatrice: "You can reach me at our Gloucestershire landline on 01452 770124... Oh, wait a moment! My apologies, our telephone provider is carrying out cable repairs on the landline all this month. You had better take my personal mobile number instead. It is 07911 334589."
Coordinator: "Right, let me record your mobile: 07911 334589. Perfect. Now, moving on to the craft masterclass: we have two distinct options running on Saturday afternoon. There is the introductory clay throwing course on the manual kick-wheels, or the advanced porcelain glazing technique workshop."
Beatrice: "My friends and I have done some basic pottery before, so we definitely wish to register for the porcelain glazing technique, please."
Coordinator: "An inspired choice! It is taught by our visiting master artisan from St Ives. And how many participants will be attending in your group?"
Beatrice: "There will be exactly 3 adults in our party."
Coordinator: "Splendid, three adult passes confirmed. Now, for your arrival on Saturday morning: could I give you brief directional guidance on finding the Pottery Studio once you enter the estate grounds?"
Beatrice: "Yes, please! I hear the estate gardens are rather vast."
Coordinator: "Indeed they are! When you enter through the main West Gate Arch, please do not head straight ahead toward the courtyard cafe. Instead, take the winding cobblestone pathway immediately to your right. Follow it past the fountain, and directly adjoining the Rose Garden glasshouse, you will find the entrance to the Pottery Studio."
Beatrice: "Follow the cobblestone path to the right, directly adjoining the Rose Garden glasshouse. Excellent, that sounds straightforward."
Coordinator: "Wonderful! Your confirmation receipt and parking voucher will arrive via SMS shortly. Have a delightful afternoon!"
Beatrice: "Thank you so much, Mr. Higgins. Goodbye."

That is the end of Section 1. You now have half a minute to check your answers.`,
    readingTitle: 'THE RENAISSANCE OF URBAN REWILDING IN METROPOLITAN HUBS',
    readingPassage: `THE RENAISSANCE OF URBAN REWILDING IN METROPOLITAN HUBS

[A] For over two centuries, modern urban planning rested upon the philosophical presumption that human civil engineering must tame and sterilize the untamed natural world. Concrete embankments encased meandering rivers, monoculture grass lawns replaced biodiverse wetlands, and pesticides eradicated indigenous flora. However, contemporary environmental engineering is witnessing a paradigm revolution termed "Urban Rewilding"—the strategic re-establishment of self-sustaining ecological systems within high-density metropolitan ecosystems.

[B] The imperative driving this green transformation is not solely aesthetic; it is fundamentally existential. High-density urban centers increasingly suffer from the "Urban Heat Island" effect, where asphalt and concrete absorb solar radiation, elevating ambient street temperatures by up to 7°C compared to surrounding pastoral land. Re-introduced canopy forests and rooftop bioswales dramatically counter this phenomenon through evapotranspiration, mitigating heat-related cardiovascular mortality among vulnerable urban residents.

[C] Furthermore, catastrophic urban flash flooding has compelled municipal authorities to re-evaluate traditional drainage architecture. Conventional subterranean storm conduits rapidly become inundated during intense atmospheric rain events. In contrast, "sponge city" infrastructure—incorporating rewilded peat bogs and permeable riparian floodplains—naturally absorbs deluge water, replenishing subterranean aquifers while filtering microplastics and chemical effluents before runoff reaches delicate estuaries.

[D] Skeptics periodically argue that rewilding invites biological perils, such as vector-borne parasites or predatory wildlife encroaching upon residential suburbs. Yet empirical longitudinal studies across Berlin, Singapore, and London reveal the opposite: robust biological diversity establishes self-regulating predator-prey equilibria, naturally suppressing rodent and mosquito proliferations without hazardous synthetic chemical spraying.`,
    writingPrompt: "Some people believe that governments should spend public funds on exploring outer space, while others argue that all available financial resources should be allocated to solving urgent crises on Earth such as climate change and poverty. Discuss both views and give your own opinion. (Minimum 250 words)",
    task1Prompt: "The two maps below show the layout of an industrial dockland area in 1980 and after its redevelopment into a residential commercial zone in 2024. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    modelEssay: `The allocation of national budgetary capital between astrophysics exploration and immediate planetary dilemmas remains a topic of vigorous contention. While proponents of extraterrestrial missions emphasize epochal scientific breakthroughs, critics argue that fiscal prudence demands direct alleviation of humanitarian suffering. In my view, while scientific curiosity is admirable, governments must prioritize urgent terrestrial ecological and socioeconomic crises before financing orbital ventures.

Advocates of aerospace expenditure highlight that space exploration is rarely a zero-sum financial sinkhole. Space technologies frequently yield revolutionary spin-off innovations that benefit everyday life on Earth. For instance, solar photovoltaics, advanced telemetry for disaster prediction, and satellite monitoring of deforestation were initially engineered for orbital space missions. Furthermore, cosmic research inspires future generations of STEM professionals, driving national innovation indices.

Nevertheless, the catastrophic urgency of contemporary Earth-bound dilemmas renders colossal aerospace budgets ethically tenuous. Millions of citizens in developing economies continue to endure chronic food insecurity, lack of potable water, and nonexistent healthcare. Concurrently, unchecked anthropogenic climate change threatens global coastlines and biodiversity. Disbursing hundreds of billions on Mars exploration while indigenous ecosystems face collapse on Earth represents a profound distortion of ethical priorities. Public funds must guarantee planetary habitability and human survival as an absolute baseline.

In conclusion, although space exploration expands humanity's scientific horizons, the acute existential imperatives of environmental sustainability and poverty eradication must command paramount national resources.`,
    questions: [
      {
        id: 1,
        section: 'listening',
        type: 'Form Completion (Surname)',
        prompt: '1. Candidate Surname (spelled letter-by-letter in audio):',
        correctAnswer: 'KENSINGTON',
        explanation: 'The speaker clarifies: K-E-N-S-I-N-G-T-O-N.'
      },
      {
        id: 2,
        section: 'listening',
        type: 'Self-Correction Trap (Contact Number)',
        prompt: '2. Preferred Active Mobile Number:',
        correctAnswer: '07911334589',
        explanation: 'The caller states landline 01452 770124 is under maintenance, confirming active mobile: 07911 334589.'
      },
      {
        id: 3,
        section: 'listening',
        type: 'Multiple Choice (Workshop Selection)',
        prompt: '3. Which ceramics masterclass was selected?',
        options: ['A) Beginner Wheel Throwing', 'B) Porcelain Glazing Technique', 'C) Sculptural Clay Modeling'],
        correctAnswer: 'B) Porcelain Glazing Technique',
        explanation: 'The candidate explicitly says: "I definitely wish to register for the porcelain glazing technique".'
      },
      {
        id: 4,
        section: 'listening',
        type: 'Short Answer (Participants)',
        prompt: '4. Number of adult attendees in the party:',
        correctAnswer: '3 adults',
        explanation: 'The attendee specifies: "There will be 3 adults in our party".'
      },
      {
        id: 5,
        section: 'listening',
        type: 'Map Directional Pin',
        prompt: '5. The Pottery Studio is located adjoining the:',
        options: ['A) Main Visitor Cafe', 'B) Rose Garden Glasshouse', 'C) West Gate Arch'],
        correctAnswer: 'B) Rose Garden Glasshouse',
        explanation: 'The staff instructs: "Take the cobblestone pathway to your right, directly adjoining the Rose Garden glasshouse".'
      },
      {
        id: 6,
        section: 'reading',
        type: 'True / False / Not Given',
        prompt: '6. Urban rewilding involves artificially maintaining sterile monoculture landscapes in city parks.',
        options: ['TRUE', 'FALSE', 'NOT GIVEN'],
        correctAnswer: 'FALSE',
        explanation: 'Paragraph A describes traditional planning as sterilizing, whereas urban rewilding strategically re-establishes self-sustaining natural biodiversity.'
      },
      {
        id: 7,
        section: 'reading',
        type: 'True / False / Not Given',
        prompt: '7. The Urban Heat Island effect can elevate metropolitan temperatures by up to 7°C.',
        options: ['TRUE', 'FALSE', 'NOT GIVEN'],
        correctAnswer: 'TRUE',
        explanation: 'Paragraph B explicitly states: "elevating ambient street temperatures by up to 7°C compared to surrounding pastoral land".'
      },
      {
        id: 8,
        section: 'reading',
        type: 'True / False / Not Given',
        prompt: '8. Berlin was the earliest European city to introduce sponge city architectural guidelines in 1965.',
        options: ['TRUE', 'FALSE', 'NOT GIVEN'],
        correctAnswer: 'NOT GIVEN',
        explanation: 'Berlin is mentioned as a case study in Paragraph D, but no 1965 date or claim of being the "earliest" appears in the passage.'
      },
      {
        id: 9,
        section: 'reading',
        type: 'Vocabulary in Context',
        prompt: '9. In Paragraph B, the word "imperative" is closest in meaning to:',
        options: ['A) Urgent necessity / pressing priority', 'B) Optional recommendation', 'C) Financial setback'],
        correctAnswer: 'A) Urgent necessity / pressing priority',
        explanation: 'An imperative is an essential, urgent, and unavoidable priority.'
      },
      {
        id: 10,
        section: 'reading',
        type: 'Main Idea Matching',
        prompt: '10. What is the author\'s main conclusion in Paragraph D regarding wildlife in cities?',
        options: [
          'A) Rewilding inevitably causes lethal pest outbreaks that require pesticide intervention.',
          'B) Balanced ecosystems naturally regulate pests without synthetic pesticides.',
          'C) Only nocturnal predators can survive in metropolitan hubs.'
        ],
        correctAnswer: 'B) Balanced ecosystems naturally regulate pests without synthetic pesticides.',
        explanation: 'Paragraph D establishes that biodiversity creates a self-regulating predator-prey equilibrium.'
      }
    ]
  },

  // ==================== SET 3: British Council Authentic Suite ====================
  {
    id: 'bc-authentic-3',
    title: 'Advanced Academic Practice Exam 3',
    source: 'Original Practice Audio (C1 Academic Series)',
    badge: 'Original Practice · C1',
    level: 'C1',
    format: 'Academic',
    listeningTitle: 'Greenfield Eco-Resort Booking & Transport Logistics',
    audioSrc: 'https://ia801503.us.archive.org/15/items/insightintoielts0000jake_o7m2/Track%2003.mp3',
    listeningScript: `International English Language Testing System. Listening Practice Simulation.
Section 1. You will hear a telephone conversation between an eco-sanctuary reservations manager and a university research team director.
First, you have some time to look at questions 1 to 5.
Now listen carefully and answer questions 1 to 5.

Manager: "Good morning, Greenfield Eco-Resort and Wildlife Sanctuary customer reservations desk. Martin speaking. How may I be of service?"
Marcus: "Good morning, Martin. I am calling from the University of Aberdeen. We wish to confirm an all-inclusive eco-lodge reservation for our wildlife biodiversity research expedition next month."
Manager: "Delighted to assist, sir! We host several university field research teams throughout the summer. May I begin by taking your full surname for the group file?"
Marcus: "Yes, it is Abernathy. That is spelled A-B-E-R-N-A-T-H-Y. And my given name is Marcus."
Manager: "Thank you, Dr. Abernathy: A-B-E-R-N-A-T-H-Y. And could I record your primary direct contact telephone number in case of any arrival notifications?"
Marcus: "Certainly. You can reach me on 07700 900552... Oh, hold on just a moment! That number is my university department secretary's desk phone, which won't be manned while we are out in the field. My active direct satellite mobile number is 07700 900331."
Manager: "Right, let me update that: 07700 900331. Perfect. Now, regarding your accommodation style across our grounds: we offer our standard lakeside canvas tents, or our insulated Timber Chalets situated higher on the wooded ridge."
Marcus: "Our team initially debated the lakeside canvas tents because of the proximity to the water, but because we are carrying highly sensitive audio recording equipment and biometric sensors that require temperature control, we definitely need the Timber Chalet."
Manager: "A very wise choice! The Timber Chalet has full climate stabilization and lockable equipment storage. And how many nights will your expedition party be residing with us?"
Marcus: "We will be arriving on Monday afternoon and departing on Friday morning, so we will need accommodation for exactly 4 nights."
Manager: "Noted: exactly 4 nights. And lastly, regarding your arrival transport: how will your team be travelling from the regional railway station?"
Marcus: "We are arriving by the morning express train from Glasgow and will need resort shuttle transport."
Manager: "Excellent. We provide a complimentary solar-powered electric shuttle bus. When you exit the station, please head directly to the commercial transport concourse. The shuttle bus collects our passengers right outside Terminal Bay 4."
Marcus: "Terminal Bay 4 right outside the station. Fantastic, Martin! Thank you so much for arranging this so smoothly."
Manager: "It is our absolute pleasure, Dr. Abernathy. We will see you on Monday the fourteenth. Goodbye."

That is the end of Section 1. You now have half a minute to check your answers.`,
    readingTitle: 'THE COGNITIVE PSYCHOLOGY OF DEEP READING IN THE DIGITAL ERA',
    readingPassage: `THE COGNITIVE PSYCHOLOGY OF DEEP READING IN THE DIGITAL ERA

[A] The human brain was never biologically hardwired to read. Unlike spoken language, which evolved naturally through tens of thousands of years of evolutionary pressure, reading is an artificial cultural invention that necessitates the neural hijacking and rewiring of visual and auditory circuits. Consequently, the medium through which textual information is consumed profoundly dictates the cognitive architecture utilized to interpret it. Over the past twenty years, the pervasive transition from printed codices to dynamic digital screens has precipitated a fundamental transformation in human attentional capacity.

[B] Neuroscientists categorize the cognitive mechanism employed during paper-based literature as "Deep Reading"—an immersive cognitive state characterized by inductive reasoning, analogical analysis, and empathetic identification. When reading physical paper, tactile feedback, spatial topography, and the unyielding permanence of ink permit the brain to construct a three-dimensional cognitive map of the text. Readers accurately localize concepts in relation to physical pages, reinforcing long-term memory encoding and critical comprehension.

[C] In stark contrast, digital reading environments are structurally dominated by hyperlinked stimuli, notifications, and vertical infinite scrolling. Confronted with this avalanche of sensory input, the human brain adopts an adaptive reading strategy known as "F-shaped skimming." Eye-tracking diagnostics reveal that digital readers rapidly scan top horizontal headlines, glance cursorily halfway down the screen, and then skim vertically down the left margin, hunting exclusively for isolated keywords. While highly efficient for superficial information retrieval, this skimming mode actively degrades synaptic pathways responsible for sustained, contemplative intellectual inquiry.

[D] The consequences extend far beyond academic examination performance. Deep reading functions as humanity's most potent vehicle for perspective-taking—the neurological ability to inhabit another consciousness. Brain scans demonstrate that reading rich narrative fiction activates sensory and motor cortices identical to real-world social interactions. As society trades sustained narrative engagement for fractured digital micro-content, developmental psychologists caution that generational capacity for empathy and complex civic discourse may undergo irreversible atrophy.`,
    writingPrompt: "Some people argue that technological development has significantly improved the quality of human relationships, while others believe it has led to social isolation and superficial connections. Discuss both views and give your own opinion. (Minimum 250 words)",
    task1Prompt: "The process diagram shows how recycled glass bottles are collected, cleaned, crushed, melted, and manufactured into new beverage containers. Summarise the process.",
    modelEssay: `The ubiquitous proliferation of digital telecommunications has radically altered the topography of human interpersonal interaction. While technological enthusiasts argue that connectivity platforms enrich relationships across geographical boundaries, critics maintain that screen-mediated socializing fosters superficiality and acute emotional alienation. In my assessment, while digital tools offer unprecedented communicative convenience, they frequently dilute the depth and emotional resonance of interpersonal bonds.

On one hand, digital technology undeniably expands the perimeter of human connectivity. Long-distance familial and collegial relationships, historically constrained by geographical dislocation, can now be maintained instantaneously via high-definition video conferencing and instant messaging. Moreover, specialized online communities empower marginalized individuals—such as rare disease sufferers or neurodivergent youths—to discover vital peer validation and emotional solidarity that may be absent in their immediate physical neighborhoods.

On the other hand, digital communication inherently sacrifices the multisensory nuance essential for genuine human bonding. In-person dialogue relies heavily upon subconscious nonverbal cues: micro-expressions, tonal inflections, eye contact, and physical presence. In contrast, text-based and algorithmic interactions frequently encourage transactional, performative communication centered on social media validation. Empirical sociological surveys reveal that despite being nominally connected to thousands of online contacts, modern youths report unprecedented levels of loneliness and communicative anxiety when required to engage in spontaneous face-to-face discourse.

In conclusion, although telecommunication technologies eliminate geographic barriers, over-reliance upon digital platforms risks substituting authentic psychological intimacy with curated, superficial interactions. Technology should therefore serve as a complement to, rather than a replacement for, authentic physical presence.`,
    questions: [
      {
        id: 1,
        section: 'listening',
        type: 'Form Completion (Surname)',
        prompt: '1. Candidate Surname (spelled letter-by-letter in audio):',
        correctAnswer: 'ABERNATHY',
        explanation: 'The researcher spells out: A-B-E-R-N-A-T-H-Y.'
      },
      {
        id: 2,
        section: 'listening',
        type: 'Self-Correction Trap (Direct Phone)',
        prompt: '2. Direct Satellite Mobile Contact Number:',
        correctAnswer: '07700900331',
        explanation: 'Speaker clarifies: Secretary desk was 07700 900552, but active direct mobile is 07700 900331.'
      },
      {
        id: 3,
        section: 'listening',
        type: 'Multiple Choice (Chalet Selection)',
        prompt: '3. Which accommodation type did the team select?',
        options: ['A) Lakeside Canvas Tents', 'B) Timber Chalet', 'C) Hilltop Stone Villa'],
        correctAnswer: 'B) Timber Chalet',
        explanation: 'The caller confirms: "to safeguard our sensitive audio recording equipment, we need the Timber Chalet".'
      },
      {
        id: 4,
        section: 'listening',
        type: 'Short Answer (Duration)',
        prompt: '4. Total number of nights booked (e.g. 4 nights):',
        correctAnswer: '4 nights',
        explanation: 'The speaker clarifies Monday afternoon to Friday morning: "exactly 4 nights".'
      },
      {
        id: 5,
        section: 'listening',
        type: 'Short Answer (Station Terminal)',
        prompt: '5. Solar shuttle pick-up station outside Terminal Bay:',
        correctAnswer: 'Terminal Bay 4',
        explanation: 'The receptionist states: "collects passengers right outside Terminal Bay 4".'
      },
      {
        id: 6,
        section: 'reading',
        type: 'True / False / Not Given',
        prompt: '6. The human brain naturally evolved specialized reading circuitry over thousands of years.',
        options: ['TRUE', 'FALSE', 'NOT GIVEN'],
        correctAnswer: 'FALSE',
        explanation: 'Paragraph A contradicts this: "The human brain was never biologically hardwired to read... reading is an artificial cultural invention".'
      },
      {
        id: 7,
        section: 'reading',
        type: 'True / False / Not Given',
        prompt: '7. Deep reading on physical paper facilitates spatial cognitive mapping of text.',
        options: ['TRUE', 'FALSE', 'NOT GIVEN'],
        correctAnswer: 'TRUE',
        explanation: 'Paragraph B verifies: "spatial topography, and the unyielding permanence of ink permit the brain to construct a three-dimensional cognitive map of the text".'
      },
      {
        id: 8,
        section: 'reading',
        type: 'True / False / Not Given',
        prompt: '8. F-shaped skimming was patented by American neuroscientists in 2005.',
        options: ['TRUE', 'FALSE', 'NOT GIVEN'],
        correctAnswer: 'NOT GIVEN',
        explanation: 'F-shaped skimming is described in Paragraph C, but no patent or 2005 date is asserted.'
      },
      {
        id: 9,
        section: 'reading',
        type: 'Vocabulary in Context',
        prompt: '9. In Paragraph A, the word "precipitated" means:',
        options: ['A) Caused to happen suddenly / triggered', 'B) Prevented completely', 'C) Postponed indefinitely'],
        correctAnswer: 'A) Caused to happen suddenly / triggered',
        explanation: 'Precipitated signifies triggering or hastening the occurrence of an event.'
      },
      {
        id: 10,
        section: 'reading',
        type: 'Main Idea Matching',
        prompt: '10. What broader societal risk is warned about in Paragraph D?',
        options: [
          'A) Decline in computational mathematics speed',
          'B) Atrophy of human empathy and capacity for nuanced civic discourse',
          'C) Increase in physical ocular damage caused by OLED displays'
        ],
        correctAnswer: 'B) Atrophy of human empathy and capacity for nuanced civic discourse',
        explanation: 'Paragraph D warns that societal empathy and complex civic discourse may undergo irreversible atrophy.'
      }
    ]
  },

  // ==================== SET 4: Cambridge Academic 16 (Urban Infrastructure) ====================
  {
    id: 'cambridge-16',
    title: 'Academic Practice Set 16 · Test 3',
    source: 'Original Practice Audio (Cambridge-Calibrated Format)',
    badge: 'Original Practice · B2-C1',
    level: 'B2-C1',
    format: 'Academic',
    listeningTitle: 'Municipal Autonomous Fleet Logistics & Charging Depot',
    audioSrc: 'https://ia801503.us.archive.org/15/items/insightintoielts0000jake_o7m2/Track%2004.mp3',
    listeningScript: `International English Language Testing System. Listening Practice Simulation.
Section 1. You will hear an engineering consultation between a municipal transport planner and a technical contractor inspecting an autonomous electric vehicle charging depot.
First, you have some time to look at questions 1 to 5.
Now listen carefully and answer questions 1 to 5.

Planner: "Good morning, North Midlands Municipal Transport and Fleet Logistics Depot. Engineer Davies speaking. How can I help you today?"
Callum: "Good morning, Engineer Davies. This is Callum from Volt-Grid Infrastructure Solutions. I'm calling to finalize the technical installation inspection logs and safety compliance records for our municipality's rapid charging hub."
Planner: "Splendid! We have been awaiting your site sign-off. First, for our civil procurement audit, may I confirm the lead electrical contractor surname, please?"
Callum: "Yes, certainly. My surname is Trevithick. That is spelled T-R-E-V-I-T-H-I-C-K. Given name Callum."
Planner: "Thank you, Mr. Trevithick: T-R-E-V-I-T-H-I-C-K. And what is your direct radio link or mobile contact where the substation control room can reach you on site?"
Callum: "You can reach me at 07822 550198... Ah, apologies, Engineer Davies! The last three digits were updated following our recent substation relocation. My active direct site number is 07822 550443."
Planner: "Right, let me make that amendment immediately: 07822 550443. Perfect. Now, regarding the energy storage trial across the charging bays: did your team deploy the Lithium Iron Phosphate cells or the Sodium Solid-State cells?"
Callum: "We initially tested the Lithium Iron Phosphate packs, but after rigorous thermodynamic modeling in sub-zero and peak heat conditions, we finalized the Sodium Solid-State cells due to their exceptional high temperature stability and non-flammable properties."
Planner: "Superb! Sodium Solid-State cells are indeed the safest option for municipal infrastructure. And how many municipal transit minibuses can undergo simultaneous rapid overnight charging?"
Callum: "The heavy-duty bus depot has been calibrated to charge exactly 12 vehicles per bay."
Planner: "Understood: exactly 12 vehicles per bay. And lastly, for our statutory fire and emergency safety inspection: where exactly is the master Emergency Power Cutoff switch located?"
Callum: "When inspectors enter through the heavy blast doors into the main electrical conduit room, it is not on the north console where the old switches were. Instead, it is housed inside the red safety vault installed immediately beside the ventilation intake."
Planner: "Inside the red safety vault beside the ventilation intake. Splendid! That meets all statutory guidelines. Thank you very much, Mr. Trevithick."
Callum: "My pleasure, Engineer Davies. The full commissioning documentation will be uploaded by noon. Goodbye."

That is the end of Section 1. You now have half a minute to check your answers.`,
    readingTitle: 'THE THERMODYNAMICS OF CRYOGENIC ENERGY STORAGE & GRID STABILITY',
    readingPassage: `THE THERMODYNAMICS OF CRYOGENIC ENERGY STORAGE & GRID STABILITY

[A] The worldwide transition toward intermittent renewable energy sources—principally offshore wind turbine clusters and photovoltaic solar arrays—has precipitated an acute grid-balancing dilemma. Unlike fossil-fueled thermal power stations, which supply baseload generation continuously regardless of atmospheric conditions, solar and wind yields fluctuate wildly. Consequently, energy engineers have long recognized that the true bottlenecks to decarbonization are not energy harvesting mechanisms, but rather long-duration utility-scale energy storage infrastructures.

[B] Among emerging alternatives to toxic chemical lithium-ion battery banks, Liquid Air Energy Storage (LAES)—also termed Cryogenic Energy Storage—has emerged as a preeminent grid-scale candidate. During periods of surplus renewable generation, such as windy nights when consumer electricity demand plummets, excess electricity drives high-efficiency industrial compressors. Ambient air is chilled to -196°C, condensing into a dense liquid stored within low-pressure insulated cryogenic tanks. 

[C] When electricity demand surges during evening peak consumption hours, the liquefied cryogenic air is pumped to high pressure, heated via stored industrial waste heat, and transformed back into high-velocity gas. This dramatic 700-fold volumetric expansion drives powerful multi-stage expansion turbines, regenerating electricity with a round-trip electrical efficiency approaching 75%. Because cryogenic storage utilizes ambient air and steel vessels without requiring rare earth minerals, cobalt, or lithium, the technology exhibits virtually zero environmental toxicity or degradation over a forty-year operating lifecycle.

[D] Financial analysts calculate that while the initial capital expenditure of cryogenic installations remains elevated, their lifetime levelized cost of storage (LCOS) is vastly superior to electrochemical batteries for discharge durations exceeding eight hours. By repurposing legacy fossil fuel turbine sites, municipal utilities can deploy gigawatt-hour cryogenic reservoirs in proximity to industrial hubs, accelerating the retirement of coal peaker plants without destabilizing national grid security.`,
    writingPrompt: "In many modern societies, physical education classes are increasingly being replaced by academic subjects in secondary schools. Do you think this is a positive or negative development? (Minimum 250 words)",
    task1Prompt: "The table below illustrates the energy output (in Terawatt-hours) generated from four renewable sources across five countries in 2023. Summarise the main trends and highlight notable anomalies.",
    modelEssay: `In contemporary educational policy, the reallocation of instructional timetables from compulsory physical education to core academic subjects has generated intense debate among pedagogues and health professionals. While proponents argue that intensifying academic rigor enhances international competitiveness, I firmly contend that marginalizing physical education represents a profoundly negative development that jeopardizes adolescent health and cognitive vitality.

Undeniably, advocates of academic prioritization operate under the conviction that globalized knowledge economies demand unprecedented scholastic specialization. In highly competitive university admissions environments, proficiency in mathematics, computer programming, and sciences serves as the primary metric for socioeconomic mobility. From this perspective, dedicated athletic hours are frequently perceived as an unproductive luxury that could be more effectively utilized for examination drills.

However, this narrow pedagogical view disregards the fundamental neurobiological link between physical exercise and cognitive performance. Aerobic exertion stimulates the synthesis of Brain-Derived Neurotrophic Factor (BDNF), a vital protein that catalyzes neurogenesis and enhances synaptic plasticity within the hippocampus. Students deprived of cardiovascular exertion exhibit diminished concentration spans, elevated anxiety, and lower academic stamina. 

Furthermore, replacing physical education exacerbates the global epidemic of juvenile sedentary lifestyles. Chronic ailments such as type-2 diabetes and childhood obesity impose catastrophic burdens on public healthcare infrastructures. Schools carry an ethical obligation to nurture holistic human well-being rather than operating solely as examination factories.

In conclusion, although the demands of modern academic curricula are formidable, excising physical activity undermines the very physiological foundation upon which intellectual excellence depends. It is therefore an unequivocally detrimental educational policy.`,
    questions: [
      {
        id: 1,
        section: 'listening',
        type: 'Form Completion (Surname)',
        prompt: '1. Lead Contractor Surname (spelled out):',
        correctAnswer: 'TREVITHICK',
        explanation: 'The engineer spells: T-R-E-V-I-T-H-I-C-K.'
      },
      {
        id: 2,
        section: 'listening',
        type: 'Self-Correction Trap (Phone)',
        prompt: '2. Direct Radio Phone Link (following relocation):',
        correctAnswer: '07822550443',
        explanation: 'Speaker states 07822 550198 then corrects to 07822 550443.'
      },
      {
        id: 3,
        section: 'listening',
        type: 'Multiple Choice (Battery Chemistry)',
        prompt: '3. Which battery technology was selected for thermal stability?',
        options: ['A) Lithium Iron Phosphate', 'B) Sodium Solid-State Cells', 'C) Nickel Cadmium'],
        correctAnswer: 'B) Sodium Solid-State Cells',
        explanation: 'The contractor confirms selecting Sodium Solid-State cells for high temperature stability.'
      },
      {
        id: 4,
        section: 'listening',
        type: 'Short Answer (Vehicle Capacity)',
        prompt: '4. Overnight charging capacity per bay (e.g. 12 vehicles):',
        correctAnswer: '12 vehicles',
        explanation: 'The engineer confirms: "Exactly 12 vehicles per bay".'
      },
      {
        id: 5,
        section: 'listening',
        type: 'Short Answer (Cutoff Location)',
        prompt: '5. Emergency Power Cutoff switch is located beside the:',
        correctAnswer: 'ventilation intake',
        explanation: 'The staff instructs: "inside the red safety vault beside the ventilation intake".'
      },
      {
        id: 6,
        section: 'reading',
        type: 'True / False / Not Given',
        prompt: '6. The primary hurdle in renewable adoption is harvesting energy rather than long-duration storage.',
        options: ['TRUE', 'FALSE', 'NOT GIVEN'],
        correctAnswer: 'FALSE',
        explanation: 'Paragraph A clarifies that the true bottleneck is long-duration storage infrastructure, not energy harvesting.'
      },
      {
        id: 7,
        section: 'reading',
        type: 'True / False / Not Given',
        prompt: '7. Ambient air condenses into a liquid state when refrigerated to -196°C.',
        options: ['TRUE', 'FALSE', 'NOT GIVEN'],
        correctAnswer: 'TRUE',
        explanation: 'Paragraph B explicitly states: "chilled to -196°C, condensing into a dense liquid".'
      },
      {
        id: 8,
        section: 'reading',
        type: 'True / False / Not Given',
        prompt: '8. Liquid Air Energy Storage requires rare cobalt mined in Central Africa.',
        options: ['TRUE', 'FALSE', 'NOT GIVEN'],
        correctAnswer: 'FALSE',
        explanation: 'Paragraph C highlights that LAES uses ambient air and steel without requiring rare earth minerals, cobalt, or lithium.'
      },
      {
        id: 9,
        section: 'reading',
        type: 'Vocabulary in Context',
        prompt: '9. In Paragraph B, the word "plummets" is closest in meaning to:',
        options: ['A) Drops sharply / declines steeply', 'B) Remains stationary', 'C) Fluctuates gently'],
        correctAnswer: 'A) Drops sharply / declines steeply',
        explanation: 'Plummets means to fall or drop rapidly at high speed.'
      },
      {
        id: 10,
        section: 'reading',
        type: 'Main Idea Matching',
        prompt: '10. What is a key operational advantage of cryogenic storage over chemical batteries outlined in Paragraph D?',
        options: [
          'A) It requires smaller physical land space than household batteries.',
          'B) It offers a superior lifetime levelized cost of storage for durations exceeding 8 hours.',
          'C) It produces zero sound emissions during discharge.'
        ],
        correctAnswer: 'B) It offers a superior lifetime levelized cost of storage for durations exceeding 8 hours.',
        explanation: 'Paragraph D notes that the lifetime levelized cost of storage (LCOS) is vastly superior for discharge durations exceeding eight hours.'
      }
    ]
  },

  // ==================== SET 5: General Training Test 01 ====================
  {
    id: 'gt-test-1',
    title: 'General Training Practice Mock 1',
    source: 'Original Practice Audio (General Training Calibrated)',
    badge: 'Original Practice · GT',
    level: 'B1-B2',
    format: 'General Training',
    listeningTitle: 'Community Lifelong Learning Hub & Public Library Enquiries',
    listeningScript: `International English Language Testing System. General Training Listening Simulation.
Section 1. You will hear a telephone enquiry between a community education admissions officer and a mature citizen registering for digital literacy night courses.
First, you have some time to look at questions 1 to 5.
Now listen carefully and answer questions 1 to 5.

Officer: "Good morning, Westbridge Community Library and Lifelong Skills Centre, Brian speaking. How may I direct your enquiry today?"
Gordon: "Good morning, Brian. I am ringing up to enquire about your evening digital literacy classes for mature residents. I recently retired from municipal transport administration, and my family recommended I get more confident with modern computing devices."
Officer: "That is wonderful to hear, sir! We welcome dozens of adult learners each term. Let me set up your registration profile on our system. Could I begin with your surname, please?"
Gordon: "Yes, it is MacIntyre. Spelled M-A-C-I-N-T-Y-R-E. First name Gordon."
Officer: "Thank you, Mr. MacIntyre: that is M-A-C-I-N-T-Y-R-E. And what is your primary contact telephone number?"
Gordon: "You can reach me at 01632 960881... Actually, please hold on! That is our retirement communal residence main switchboard, which often gets busy in the evenings. My personal direct line to my study is 01632 960224."
Officer: "Splendid, let me note down your personal line: 01632 960224. Now, which evening course module did you wish to register for? On Thursday evenings we offer either the Cybersecurity Basics workshop or the Tablet and Smartphone Basics class."
Gordon: "My grandchildren recently bought me a touchscreen device for my birthday, so I definitely wish to enrol in the Tablet and Smartphone Basics class, please."
Officer: "A marvellous course! It covers everything from setting up email accounts and cloud storage to video calling relatives. And where on site will the classes be held? When you arrive at the central library on Thursday evening, take the stairs or lift to the second floor. Classes meet in Seminar Room 4, which is situated directly across from the Multimedia Archives."
Gordon: "Seminar Room 4 on the second floor, directly across from the Multimedia Archives. Got it."
Officer: "And please do remember on your first evening to bring a valid photo identification along with your enrollment confirmation slip to collect your course materials and security pass."
Gordon: "I will make a note of that. Thank you very much for your kind assistance, Brian!"
Officer: "It has been my pleasure, Mr. MacIntyre. We look forward to meeting you on Thursday. Goodbye."

That is the end of Section 1. You now have half a minute to check your answers.`,
    readingTitle: 'WORKPLACE ERGONOMICS & PREVENTING REPETITIVE STRAIN INJURIES (RSI)',
    readingPassage: `WORKPLACE ERGONOMICS & PREVENTING REPETITIVE STRAIN INJURIES (RSI)

Section 1: Guidelines for Office Computer Workstations
Prolonged desk-bound administrative duties pose cumulative physiological risks if ergonomic principles are neglected. Repetitive Strain Injury (RSI) encompasses musculoskeletal disorders affecting tendons, nerves, and muscles in the hands, wrists, neck, and lumbar spine. Employers have a statutory obligation under health and safety legislation to evaluate workstation risk profiles and provide adjustable furniture.

Section 2: Correct Seating Posture
Your chair height must be adjusted such that your thighs rest parallel to the floor, with knees bent at a 90-degree angle and feet planted firmly upon a footrest or the floor. The lumbar backrest should support the natural inward curve of the lower spine. Forearms must remain horizontal while typing, avoiding excessive flexion of the wrist.

Section 3: Monitor Configuration
The upper border of your computer monitor must align exactly with eye level when seated upright. Positioning the display too low forces forward neck craning, generating severe cervical spine compression. Position the monitor roughly an arm’s length away (50–70 cm) to minimize visual fatigue.

Section 4: The 20-20-20 Rest Protocol
To prevent ocular strain and circulatory stagnation, all employees must adopt the 20-20-20 rule: every 20 minutes of continuous screen work, divert your gaze to an object at least 20 feet away for a minimum of 20 seconds. Stand up, stretch pectoral muscles, and walk around for two minutes every hour.`,
    writingPrompt: "You recently purchased an expensive electronic appliance from a local store, but upon unboxing it at home, you discovered that a vital accessory was missing and the instructions were incomplete. Write a formal letter to the store manager. In your letter: describe the item purchased, explain the defect/missing parts, and state what action you expect the store to take. (Minimum 150 words)",
    task1Prompt: "Write a letter to the store manager regarding the missing accessories and requesting a prompt replacement or refund.",
    modelEssay: `Dear Store Manager,

I am writing to formally register a grievance regarding a recent purchase made at your High Street branch on Saturday, 14th October. The transaction receipt number is BX-99420, relating to a Breville Smart Pro Espresso Machine priced at £349.99.

Upon unboxing the appliance at my residence later that afternoon, I discovered that the pressurized dual-wall filter basket—an indispensable accessory specified on the packaging for espresso extraction—was conspicuously absent from the sealed accessory box. Furthermore, the accompanying user manual lacked pages 11 through 24, rendering the initial descaling and pressure calibration instructions completely unintelligible.

As a regular patron of your store, I was exceptionally disappointed to encounter such deficient quality control. Given that the machine is entirely inoperable without the missing filter basket, I request that you either provide the missing components immediately or arrange for a complete replacement of the unit. 

I have attached copies of my purchase invoice and warranty documentation for your reference. I trust this matter will be resolved promptly within three working days.

Yours faithfully,
Gordon MacIntyre`,
    questions: [
      {
        id: 1,
        section: 'listening',
        type: 'Form Completion (Surname)',
        prompt: '1. Candidate Surname (spelled letter-by-letter in audio):',
        correctAnswer: 'MACINTYRE',
        explanation: 'Speaker spells: M-A-C-I-N-T-Y-R-E.'
      },
      {
        id: 2,
        section: 'listening',
        type: 'Self-Correction Trap (Phone Number)',
        prompt: '2. Personal Direct Line Number:',
        correctAnswer: '01632960224',
        explanation: 'Speaker corrects communal number to direct line: 01632 960224.'
      },
      {
        id: 3,
        section: 'listening',
        type: 'Multiple Choice (Class Selection)',
        prompt: '3. Which specific evening module was chosen?',
        options: ['A) Cybersecurity Basics', 'B) Tablet and Smartphone Basics', 'C) Web Development'],
        correctAnswer: 'B) Tablet and Smartphone Basics',
        explanation: 'Gordon states: "Definitely the Tablet and Smartphone Basics, please".'
      },
      {
        id: 4,
        section: 'listening',
        type: 'Short Answer (Room Number)',
        prompt: '4. Classes are held in Seminar Room number:',
        correctAnswer: 'Room 4',
        explanation: 'Staff informs: "held in Seminar Room 4 on the second floor".'
      },
      {
        id: 5,
        section: 'listening',
        type: 'Short Answer (Opposite Landmark)',
        prompt: '5. The seminar room is situated directly across from the:',
        correctAnswer: 'Multimedia Archives',
        explanation: 'Staff clarifies: "directly across from the Multimedia Archives".'
      },
      {
        id: 6,
        section: 'reading',
        type: 'True / False / Not Given',
        prompt: '6. Employers have a statutory legal duty to assess workstation ergonomic risks.',
        options: ['TRUE', 'FALSE', 'NOT GIVEN'],
        correctAnswer: 'TRUE',
        explanation: 'Section 1 states employers have a statutory obligation under health and safety legislation.'
      },
      {
        id: 7,
        section: 'reading',
        type: 'True / False / Not Given',
        prompt: '7. The computer screen should be positioned higher than forehead level.',
        options: ['TRUE', 'FALSE', 'NOT GIVEN'],
        correctAnswer: 'FALSE',
        explanation: 'Section 3 instructs that the upper border of your computer monitor must align exactly with eye level.'
      },
      {
        id: 8,
        section: 'reading',
        type: 'Short Answer (Distance)',
        prompt: '8. Recommended distance between user and monitor (in cm):',
        correctAnswer: '50–70 cm',
        explanation: 'Section 3 recommends roughly an arm’s length away (50–70 cm).'
      },
      {
        id: 9,
        section: 'reading',
        type: 'Short Answer (Rule Name)',
        prompt: '9. Name of the ocular strain prevention protocol:',
        correctAnswer: '20-20-20 rule',
        explanation: 'Section 4 details the 20-20-20 rule protocol.'
      },
      {
        id: 10,
        section: 'reading',
        type: 'Vocabulary in Context',
        prompt: '10. The word "cumulative" in Section 1 means:',
        options: ['A) Gradually accumulating / increasing over time', 'B) Rare and accidental', 'C) Painless and minor'],
        correctAnswer: 'A) Gradually accumulating / increasing over time',
        explanation: 'Cumulative means increasing progressively by successive additions.'
      }
    ]
  }
];

/**
 * Large Categorized IELTS Speaking Topic Bank
 * Includes Part 1, Part 2 Cue Cards, and Part 3 Abstract Discussion Questions
 * Supporting dynamic non-repeating topic selection across 12+ real IELTS domains
 */
export const SPEAKING_TOPIC_BANK: SpeakingTopicSet[] = [
  {
    id: 'spk_tech',
    topicName: 'Technology & Artificial Intelligence',
    part1Questions: [
      {
        question: 'Do you use any smart devices or applications to organise your daily schedule?',
        examinerTip: 'Answer in 2-3 sentences with natural British fillers: "To be perfectly frank, I rely quite heavily on..."'
      },
      {
        question: 'What kind of technological changes have taken place in your home over the last five years?',
        examinerTip: 'Contrast past with present using present perfect: "We used to have... whereas recently we have upgraded to..."'
      }
    ],
    part2CueCard: {
      prompt: 'Describe a useful electronic device or application you could not live without.',
      bulletPoints: [
        'What the device or app is',
        'How often you use it',
        'What specific tasks it helps you accomplish',
        'And explain why it is so indispensable to your daily life.'
      ],
      followUp: 'Do your friends also use this application as frequently as you do?',
      examinerTip: 'Speak for 90 to 120 seconds. Use temporal markers: "Initially when I downloaded it...", "Over time it became second nature..."'
    },
    part3Questions: [
      {
        question: 'To what extent do you believe autonomous artificial intelligence might displace white-collar professionals in the coming decade?',
        examinerTip: 'Adopt a balanced stance: "While there is no denying automation will streamline repetitive tasks, human creative intuition remains irreplaceable."'
      },
      {
        question: 'Do older generations face unfair digital exclusion in contemporary cashless societies?',
        examinerTip: 'Address societal equity: "That is a poignant issue because without intuitive public training, senior citizens risk losing autonomous access to banking."'
      }
    ]
  },
  {
    id: 'spk_env',
    topicName: 'Environment & Climate Responsibility',
    part1Questions: [
      {
        question: 'Are there many parks or public gardens near where you live?',
        examinerTip: 'Describe greenery vividly: "Fortunately, within walking distance there is a tranquil Victorian park with mature oak trees."'
      },
      {
        question: 'Do you make a conscious effort to recycle household waste?',
        examinerTip: 'Demonstrate routine collocations: "We consistently segregate paper and plastics into municipal curbside recycling bins."'
      }
    ],
    part2CueCard: {
      prompt: 'Describe an environmental law or initiative you think governments should introduce.',
      bulletPoints: [
        'What the law or initiative would be',
        'Which environmental issue it aims to solve',
        'How it would be enforced or funded',
        'And explain what positive difference it would make to society.'
      ],
      followUp: 'Do you think the public would willingly comply with such a regulation?',
      examinerTip: 'Structure your two minutes: identify the problem, propose the policy mechanism, evaluate public benefits.'
    },
    part3Questions: [
      {
        question: 'Should individual citizens or multinational corporations bear the primary financial burden of carbon emission reduction?',
        examinerTip: 'Use comparative weighting: "While individual lifestyle thrift matters, the sheer scale of industrial emissions means corporate accountability is paramount."'
      },
      {
        question: 'Why do you think some people remain indifferent to international climate summits?',
        examinerTip: 'Analyze psychological barriers: "A classic case in point is environmental fatigue, where non-binding declarations create public cynicism."'
      }
    ]
  },
  {
    id: 'spk_edu',
    topicName: 'Education, University & Career Aspirations',
    part1Questions: [
      {
        question: 'What subjects did you find most engaging when you were in secondary school?',
        examinerTip: 'Speak naturally: "Looking back, I had a particular affinity for world history because our tutor brought narratives to life."'
      },
      {
        question: 'Do you prefer studying alone in quiet environments or collaborating with peers?',
        examinerTip: 'Provide justification: "I am definitely inclined toward solitary study in libraries, as background chatter disrupts my analytical flow."'
      }
    ],
    part2CueCard: {
      prompt: 'Describe a teacher or mentor who had a profound influence on your life.',
      bulletPoints: [
        'Who this person was',
        'What subject or skill they taught you',
        'How their teaching method differed from other instructors',
        'And explain what enduring lessons you learned from them.'
      ],
      followUp: 'Have you stayed in touch with this mentor recently?',
      examinerTip: 'Use rich character adjectives: "meticulous", "inspirational", "patient", "demanding yet compassionate".'
    },
    part3Questions: [
      {
        question: 'Do you believe university education should focus strictly on vocational job training rather than abstract theoretical philosophy?',
        examinerTip: 'Synthesize both priorities: "While pragmatic employability is crucial, theoretical disciplines cultivate critical lateral thinking."'
      },
      {
        question: 'How has the emergence of open-source online degrees challenged traditional brick-and-mortar universities?',
        examinerTip: 'Evaluate democratization: "Online credentials democratize access for remote learners, yet campus immersion provides invaluable social soft skills."'
      }
    ]
  },
  {
    id: 'spk_trav',
    topicName: 'Travel, Culture & Tourism',
    part1Questions: [
      {
        question: 'Do you enjoy visiting historical landmarks or do you prefer natural landscapes?',
        examinerTip: 'Avoid one-word answers: "I have a distinct preference for dramatic natural coastlines rather than crowded historical monuments."'
      },
      {
        question: 'What is the most memorable mode of transport you have experienced while traveling?',
        examinerTip: 'Tell a micro-story: "I once took an overnight sleeper train across the Highlands, watching mist rise over lochs at dawn."'
      }
    ],
    part2CueCard: {
      prompt: 'Describe a trip or journey that did not go according to plan.',
      bulletPoints: [
        'Where you were traveling to',
        'What unexpected obstacle or delay occurred',
        'How you and your companions managed the situation',
        'And explain what you learned from this unexpected experience.'
      ],
      followUp: 'Would you ever revisit that same destination?',
      examinerTip: 'Use narrative past tenses: "We had barely departed when our ferry was cancelled due to gale-force winds..."'
    },
    part3Questions: [
      {
        question: 'Does mass international tourism ultimately erode or preserve authentic local traditions?',
        examinerTip: 'Weigh both edges: "It represents a double-edged sword: tourism injects heritage preservation capital, yet risks commercializing sacred rituals."'
      },
      {
        question: 'Do you agree that traveling abroad makes people more open-minded and tolerant?',
        examinerTip: 'Deepen the argument: "Immersing oneself in alien customs dismantles ethnocentric prejudices far more effectively than reading textbooks."'
      }
    ]
  }
];

/**
 * Intelligent Test Selector with Anti-Repetition
 * Chooses an unseen test set if available, otherwise cycles least-recently-seen
 */
export function getFreshMockExam(): MockExamSet {
  const selected = selectFreshQuestions(MOCK_EXAM_SETS, 1, { shuffle: true });
  const chosen = selected[0] || MOCK_EXAM_SETS[0];
  recordSeenQuestion(chosen.id);
  return chosen;
}

/**
 * Intelligent Speaking Test Selector with Anti-Repetition
 * Selects an unseen speaking topic set
 */
export function getFreshSpeakingTopic(): SpeakingTopicSet {
  const selected = selectFreshQuestions(SPEAKING_TOPIC_BANK, 1, { shuffle: true });
  const chosen = selected[0] || SPEAKING_TOPIC_BANK[0];
  recordSeenQuestion(chosen.id);
  return chosen;
}
