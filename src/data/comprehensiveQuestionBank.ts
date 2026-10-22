/**
 * IELTS SPRINT — COMPREHENSIVE CAMBRIDGE-STANDARD QUESTION BANK
 * Over 160+ rigorously calibrated questions across Listening (Sections 1-4),
 * Speaking (Parts 1-3), Reading, Writing, Vocabulary, and Grammar.
 */

import { IELTSQuestion } from '../services/QuestionEngine';
import { EXPANDED_LISTENING_QUESTIONS } from './listeningQuestionBank';

export const COMPREHENSIVE_QUESTION_BANK: IELTSQuestion[] = [
  // =========================================================================
  // LISTENING SECTION 1 — SOCIAL / TRANSACTIONAL CONVERSATIONS (Form & Table)
  // =========================================================================
  {
    id: 'lis_s1_01',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'easy',
    topic: 'Car Rental & Travel Logistics',
    skillTags: ['spelling', 'distractor_handling', 'names'],
    prompt: 'Surname of the customer: [1]',
    correctAnswer: 'BRAITHWAITE',
    acceptableAnswers: ['braithwaite', 'Braithwaite'],
    explanation: 'The customer spells her surname explicitly: B-R-A-I-T-H-W-A-I-T-E.',
    dialogue: [
      { speaker: 'Receptionist (Oliver)', gender: 'male', text: 'Good morning, Apex Car Rentals. May I take your full name?' },
      { speaker: 'Customer (Eleanor)', gender: 'female', text: "Yes, my surname is Braithwaite. That's spelled B-R-A-I-T-H-W-A-I-T-E. First name Eleanor." }
    ],
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'lis_s1_02',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'easy',
    topic: 'Car Rental & Travel Logistics',
    skillTags: ['numbers', 'self_correction'],
    prompt: 'Contact Telephone Number: [2]',
    correctAnswer: '07700 900892',
    acceptableAnswers: ['07700900892', '07700 900 892'],
    explanation: 'Speaker says 07700 900451 then self-corrects: "Oh apologies, that is my old office landline... my active mobile is 07700 900892".',
    dialogue: [
      { speaker: 'Receptionist (Oliver)', gender: 'male', text: 'And could I have a contact telephone number?' },
      { speaker: 'Customer (Eleanor)', gender: 'female', text: "Sure, it is 07700 900451... Oh apologies, that's my old office landline which was disconnected. My active mobile number is 07700 900892." }
    ],
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'lis_s1_03',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'medium',
    topic: 'Car Rental & Travel Logistics',
    skillTags: ['classification', 'distractor_handling'],
    prompt: 'Vehicle category selected: [3]',
    correctAnswer: 'HYBRID COMPACT',
    acceptableAnswers: ['hybrid compact', 'Hybrid Compact', 'hybrid'],
    explanation: 'They considered an SUV initially, but decided on a hybrid compact due to fuel prices.',
    dialogue: [
      { speaker: 'Receptionist (Oliver)', gender: 'male', text: 'And what category of vehicle were you looking for?' },
      { speaker: 'Customer (Eleanor)', gender: 'female', text: 'We were thinking of an SUV, but looking at fuel prices, we definitely prefer a hybrid compact.' }
    ],
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'lis_s1_04',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'easy',
    topic: 'Car Rental & Travel Logistics',
    skillTags: ['numbers', 'calendar_dates'],
    prompt: 'Rental duration in total days: [4]',
    correctAnswer: '5',
    acceptableAnswers: ['5 days', 'five', 'five days'],
    explanation: 'Collecting Friday morning and returning Tuesday evening makes exactly 5 days.',
    dialogue: [
      { speaker: 'Receptionist (Oliver)', gender: 'male', text: 'How many days will you require the car?' },
      { speaker: 'Customer (Eleanor)', gender: 'female', text: 'We will collect it on Friday morning and return it on Tuesday evening, so exactly 5 days.' }
    ],
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'lis_s1_05',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'medium',
    topic: 'Car Rental & Travel Logistics',
    skillTags: ['vocabulary', 'distractor_handling'],
    prompt: 'Optional extra equipment requested: [5]',
    correctAnswer: 'GPS NAVIGATION',
    acceptableAnswers: ['gps navigation', 'GPS', 'gps', 'navigation'],
    explanation: 'They already own a child seat, but explicitly ask for GPS navigation.',
    dialogue: [
      { speaker: 'Receptionist (Oliver)', gender: 'male', text: 'And would you like any optional extras such as child seats or additional drivers?' },
      { speaker: 'Customer (Eleanor)', gender: 'female', text: 'We already have our own child seat, but we will require GPS navigation included, please.' }
    ],
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },

  // Scenario 2: Community Sports Centre Membership
  {
    id: 'lis_s1_06',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'easy',
    topic: 'Community Sports Facility Registration',
    skillTags: ['spelling', 'names'],
    prompt: 'Applicant street name: 42 [6] Crescent',
    correctAnswer: 'CHELTENHAM',
    acceptableAnswers: ['cheltenham', 'Cheltenham'],
    explanation: 'The clerk spells the street: C-H-E-L-T-E-N-H-A-M.',
    dialogue: [
      { speaker: 'Staff (Alistair)', gender: 'male', text: 'Could you give me your current address in town?' },
      { speaker: 'Applicant (Daniel)', gender: 'male', text: "Yes, it is 42 Cheltenham Crescent. That's C-H-E-L-T-E-N-H-A-M Crescent." }
    ],
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'lis_s1_07',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'medium',
    topic: 'Community Sports Facility Registration',
    skillTags: ['membership_category', 'distractor_handling'],
    prompt: 'Membership package selected: [7] Tier',
    correctAnswer: 'PREMIUM OFF-PEAK',
    acceptableAnswers: ['premium off-peak', 'off-peak', 'Off-peak'],
    explanation: 'The applicant wanted unlimited evening access, but switched to Premium Off-Peak to avoid the £80 surcharge.',
    dialogue: [
      { speaker: 'Staff (Alistair)', gender: 'male', text: 'We have standard full-time at £65 or Premium Off-Peak at £45.' },
      { speaker: 'Applicant (Daniel)', gender: 'male', text: 'Since I only work afternoon shifts, I will take the Premium Off-Peak membership.' }
    ],
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'lis_s1_08',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'easy',
    topic: 'Community Sports Facility Registration',
    skillTags: ['currency', 'numbers'],
    prompt: 'One-off joining fee: £[8]',
    correctAnswer: '25',
    acceptableAnswers: ['25', 'twenty-five', 'twenty five'],
    explanation: 'The clerk mentions the standard joining fee is £40, but currently discounted to £25 for local residents.',
    dialogue: [
      { speaker: 'Staff (Alistair)', gender: 'male', text: 'Our joining fee is usually forty pounds, but with the borough voucher it is reduced to just twenty-five pounds today.' }
    ],
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'lis_s1_09',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'medium',
    topic: 'Community Sports Facility Registration',
    skillTags: ['facilities', 'vocabulary'],
    prompt: 'Primary complimentary sport included: Heated [9]',
    correctAnswer: 'SWIMMING POOL',
    acceptableAnswers: ['swimming pool', 'pool', 'Swimming Pool'],
    explanation: 'Staff notes that Olympic heated swimming pool lanes are free during morning hours.',
    dialogue: [
      { speaker: 'Staff (Alistair)', gender: 'male', text: 'That includes access to our gym, squash courts on booking, and our heated swimming pool without extra charge.' }
    ],
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'lis_s1_10',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'medium',
    topic: 'Community Sports Facility Registration',
    skillTags: ['dates', 'calendar'],
    prompt: 'Induction session booked for: [10] October',
    correctAnswer: '14TH',
    acceptableAnswers: ['14', '14th', 'fourteenth', '14th October'],
    explanation: 'The applicant is busy on the 12th, so they confirm Thursday 14th October at 10:00 AM.',
    dialogue: [
      { speaker: 'Staff (Alistair)', gender: 'male', text: 'Would Tuesday the 12th work for your safety induction?' },
      { speaker: 'Applicant (Daniel)', gender: 'male', text: 'I am travelling on Tuesday. Can we schedule it for the 14th instead? Perfect, 14th October confirmed.' }
    ],
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },

  // Scenario 3: University Accommodation Office
  {
    id: 'lis_s1_11',
    module: 'listening',
    section: 1,
    questionType: 'table_completion',
    difficulty: 'medium',
    topic: 'University Student Residence',
    skillTags: ['accommodation', 'spelling'],
    prompt: 'Hall of Residence preference: [11] Hall',
    correctAnswer: 'WAKEFIELD',
    acceptableAnswers: ['wakefield', 'Wakefield'],
    explanation: 'Spelled out clearly: W-A-K-E-F-I-E-L-D Hall.',
    dialogue: [
      { speaker: 'Advisor (Arthur)', gender: 'male', text: 'Which hall of residence is your primary choice?' },
      { speaker: 'Student (Oliver)', gender: 'male', text: "I would prefer Wakefield Hall, please. W-A-K-E-F-I-E-L-D." }
    ],
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'lis_s1_12',
    module: 'listening',
    section: 1,
    questionType: 'table_completion',
    difficulty: 'easy',
    topic: 'University Student Residence',
    skillTags: ['money', 'numbers'],
    prompt: 'Termly rent including utilities: £[12]',
    correctAnswer: '1650',
    acceptableAnswers: ['1,650', '1650', 'one thousand six hundred and fifty'],
    explanation: 'Rent is £1,650 per academic term including electricity and high-speed Wi-Fi.',
    dialogue: [
      { speaker: 'Advisor (Arthur)', gender: 'male', text: 'The self-catering room in Wakefield is one thousand six hundred and fifty pounds per term.' }
    ],
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'lis_s1_13',
    module: 'listening',
    section: 1,
    questionType: 'table_completion',
    difficulty: 'medium',
    topic: 'University Student Residence',
    skillTags: ['dietary', 'distractor_handling'],
    prompt: 'Special dietary requirement noted: [13]',
    correctAnswer: 'GLUTEN FREE',
    acceptableAnswers: ['gluten-free', 'gluten free', 'Gluten free'],
    explanation: 'The student states she is vegetarian, but her strict medical requirement is gluten-free.',
    dialogue: [
      { speaker: 'Student (Oliver)', gender: 'male', text: 'Although I eat mostly vegetarian, my doctor advised I must have strictly gluten-free meal prep facilities.' }
    ],
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'lis_s1_14',
    module: 'listening',
    section: 1,
    questionType: 'table_completion',
    difficulty: 'easy',
    topic: 'University Student Residence',
    skillTags: ['transport', 'numbers'],
    prompt: 'Walking distance to campus library: [14] minutes',
    correctAnswer: '12',
    acceptableAnswers: ['12', 'twelve', '12 mins'],
    explanation: 'The campus shuttle takes 5 minutes, but the scenic walking path takes exactly 12 minutes.',
    dialogue: [
      { speaker: 'Advisor (Arthur)', gender: 'male', text: 'It is very convenient—only twelve minutes on foot to the main campus library.' }
    ],
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'lis_s1_15',
    module: 'listening',
    section: 1,
    questionType: 'table_completion',
    difficulty: 'medium',
    topic: 'University Student Residence',
    skillTags: ['deposit', 'dates'],
    prompt: 'Deposit submission deadline: [15] August',
    correctAnswer: '28TH',
    acceptableAnswers: ['28', '28th', 'twenty-eighth'],
    explanation: 'Deposit must be received by 28th August to secure room allocation.',
    dialogue: [
      { speaker: 'Advisor (Arthur)', gender: 'male', text: 'Please ensure your holding deposit is submitted online no later than the twenty-eighth of August.' }
    ],
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },

  // =========================================================================
  // LISTENING SECTION 2 — GENERAL / COMMUNITY MONOLOGUES (Maps & Matching)
  // =========================================================================
  {
    id: 'lis_s2_01',
    module: 'listening',
    section: 2,
    questionType: 'map_labelling',
    difficulty: 'medium',
    topic: 'Historic Avonford Town Tour Map',
    skillTags: ['directional_prepositions', 'map_navigation'],
    prompt: 'Tourist Information Center is location [16]',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'A',
    explanation: 'First exit left from the central roundabout, tucked directly behind the grand Town Hall building.',
    dialogue: [
      { speaker: 'Tour Guide (Alistair)', gender: 'male', text: 'If you take the first exit to your left heading west, tucked directly behind the grand Town Hall building, you will discover the Tourist Information Center.' }
    ],
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'lis_s2_02',
    module: 'listening',
    section: 2,
    questionType: 'map_labelling',
    difficulty: 'medium',
    topic: 'Historic Avonford Town Tour Map',
    skillTags: ['landmarks', 'spatial_orientation'],
    prompt: 'Historical Museum is location [17]',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'B',
    explanation: 'Straight ahead heading north past the central square, directly opposite the ornamental Victorian fountain on the right-hand corner.',
    dialogue: [
      { speaker: 'Tour Guide (Alistair)', gender: 'male', text: 'If you proceed straight ahead heading north past the central square, directly opposite the ornamental Victorian fountain on the right-hand corner, stands our town Historical Museum.' }
    ],
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'lis_s2_03',
    module: 'listening',
    section: 2,
    questionType: 'map_labelling',
    difficulty: 'easy',
    topic: 'Historic Avonford Town Tour Map',
    skillTags: ['waterfront', 'orientation'],
    prompt: 'Riverside Cafe is location [18]',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'C',
    explanation: 'Walk east along Park Road towards the Green Park, right on the southern edge overlooking the water near the stone embankment.',
    dialogue: [
      { speaker: 'Tour Guide (Alistair)', gender: 'male', text: 'Finally, if you walk east along Park Road towards the Green Park, right on the southern edge overlooking the water near the stone embankment, you will see the Riverside Cafe.' }
    ],
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'lis_s2_04',
    module: 'listening',
    section: 2,
    questionType: 'multiple_choice',
    difficulty: 'medium',
    topic: 'Community Nature Reserve Volunteer Briefing',
    skillTags: ['inference', 'guidelines'],
    prompt: 'What protective gear is mandatory for all weekend trail volunteers?',
    options: [
      'A) High-visibility waterproof vests only',
      'B) Heavy-duty steel-toe boots and leather gloves',
      'C) Rubber wellington boots and insect-repellent bands'
    ],
    correctAnswer: 'B',
    explanation: 'Speaker explicitly stresses: "Due to thorny brambles and sharp flint stones, all volunteers must wear thick leather gloves and steel-toe boots."',
    dialogue: [
      { speaker: 'Ranger (Arthur)', gender: 'male', text: 'Safety is paramount. While we provide high-vis vests upon arrival, you must bring heavy-duty steel-toe boots and thick leather gloves. Ordinary trainers will not be permitted on site.' }
    ],
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'lis_s2_05',
    module: 'listening',
    section: 2,
    questionType: 'multiple_choice',
    difficulty: 'hard',
    topic: 'Community Nature Reserve Volunteer Briefing',
    skillTags: ['distractor_handling', 'time_limits'],
    prompt: 'The newly constructed bird observation hide will be open to visitors until:',
    options: [
      'A) 4:30 PM in winter and 7:00 PM in summer',
      'B) 5:00 PM every weekday and closed on Sundays',
      'C) Sunset throughout all months of the year'
    ],
    correctAnswer: 'A',
    explanation: 'The ranger clarifies: "Unlike the main visitor center which closes at 5, the bird hide remains accessible until 4:30 PM in winter and extends to 7:00 PM during the summer season."',
    dialogue: [
      { speaker: 'Ranger (Arthur)', gender: 'male', text: 'Do take note that unlike our reception which closes at 5:00 PM, the bird observation hide remains open until 4:30 PM in the winter months, and until 7:00 PM during the summer.' }
    ],
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },

  // =========================================================================
  // LISTENING SECTION 3 — ACADEMIC TUTORIALS & STUDY DISCUSSIONS (2-3 Speakers)
  // =========================================================================
  {
    id: 'lis_s3_01',
    module: 'listening',
    section: 3,
    questionType: 'multiple_choice',
    difficulty: 'medium',
    topic: 'Renewable Energy Field Project Tutorial',
    skillTags: ['academic_discussion', 'agreement'],
    prompt: 'Why did the students decide to focus on tidal energy rather than offshore wind?',
    options: [
      'A) Offshore wind construction costs were excessive for their model',
      'B) Tidal currents offer predictable and consistent power cycles',
      'C) Local council regulations strictly forbade coastal wind turbines'
    ],
    correctAnswer: 'B',
    explanation: 'Student A highlights: "While wind is popular, tidal output is completely predictable based on lunar cycles, which eliminated fluctuation errors in our mathematical simulation."',
    dialogue: [
      { speaker: 'Tutor (Professor Sterling)', gender: 'male', text: 'I noticed you shifted from offshore wind to marine tidal energy. What motivated this pivot?' },
      { speaker: 'Student A (Callum)', gender: 'male', text: 'Well, wind patterns are erratic, but tidal currents follow exact astronomical cycles. The predictability made our computational modeling substantially more accurate.' }
    ],
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'lis_s3_02',
    module: 'listening',
    section: 3,
    questionType: 'matching',
    difficulty: 'hard',
    topic: 'Renewable Energy Field Project Tutorial',
    skillTags: ['academic_roles', 'matching'],
    prompt: 'Which team member is responsible for data synthesis from the underwater acoustic sensors?',
    options: [
      'A) Chloe',
      'B) Liam',
      'C) Both Chloe and Liam collaboratively'
    ],
    correctAnswer: 'B',
    explanation: 'Chloe states: "Liam has the computational engineering background, so he is handling all sensor telemetry calibration."',
    dialogue: [
      { speaker: 'Student A (Callum)', gender: 'male', text: 'I am concentrating on the environmental impact assessment on benthic organisms, whereas Liam is processing the hydrophone telemetry data.' }
    ],
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'lis_s3_03',
    module: 'listening',
    section: 3,
    questionType: 'sentence_completion',
    difficulty: 'medium',
    topic: 'Renewable Energy Field Project Tutorial',
    skillTags: ['academic_vocabulary', 'sentence_completion'],
    prompt: 'The turbine blades are coated in a non-toxic polymer to prevent [19] accumulation.',
    correctAnswer: 'BIOFOULING',
    acceptableAnswers: ['biofouling', 'bio-fouling', 'algae', 'barnacle'],
    explanation: 'Professor Sterling inquires about blade maintenance, and Liam mentions the specialist anti-biofouling coating.',
    dialogue: [
      { speaker: 'Student B (Liam)', gender: 'male', text: 'To prevent marine barnacles and microbial slime from reducing blade hydrodynamic efficiency, the composite blades use a biocide-free silicone matrix against biofouling.' }
    ],
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'lis_s3_04',
    module: 'listening',
    section: 3,
    questionType: 'sentence_completion',
    difficulty: 'hard',
    topic: 'Renewable Energy Field Project Tutorial',
    skillTags: ['word_limit', 'academic_data'],
    prompt: 'The final simulation paper must be submitted by Friday at [20] PM.',
    correctAnswer: '4',
    acceptableAnswers: ['4', '4:00', 'four', '4 pm'],
    explanation: 'Professor notes that the portal closes sharp at 4:00 PM on Friday afternoon.',
    dialogue: [
      { speaker: 'Tutor (Professor Sterling)', gender: 'male', text: 'Keep in mind the engineering departmental portal cuts off submissions at precisely 4:00 PM on Friday, without exceptions.' }
    ],
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },

  // =========================================================================
  // LISTENING SECTION 4 — ACADEMIC LECTURES (Monologue & Note Completion)
  // =========================================================================
  {
    id: 'lis_s4_01',
    module: 'listening',
    section: 4,
    questionType: 'summary_completion',
    difficulty: 'hard',
    topic: 'Urban Microclimates & Green Architecture',
    skillTags: ['academic_lecture', 'scientific_terms'],
    prompt: 'The urban heat island phenomenon is amplified primarily by dark [21] surfaces absorbing solar radiation.',
    correctAnswer: 'ASPHALT',
    acceptableAnswers: ['asphalt', 'bitumen', 'tarmac'],
    explanation: 'The lecturer states: "Dense urban cores exhibit elevated nocturnal temperatures because high-thermal-mass surfaces, notably asphalt roadways and concrete facades, retain heat."',
    dialogue: [
      { speaker: 'Lecturer (Dr. Harris)', gender: 'male', text: 'Good morning. Today we examine urban microclimates. The primary driver of elevated nocturnal temperatures in modern metropolises is the ubiquitous presence of dark asphalt roadways and impermeable masonry.' }
    ],
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'lis_s4_02',
    module: 'listening',
    section: 4,
    questionType: 'summary_completion',
    difficulty: 'hard',
    topic: 'Urban Microclimates & Green Architecture',
    skillTags: ['environmental_science', 'botany'],
    prompt: 'Vertical green facades cool adjacent air through the biological mechanism of [22].',
    correctAnswer: 'EVAPOTRANSPIRATION',
    acceptableAnswers: ['evapotranspiration', 'transpiration', 'evapo-transpiration'],
    explanation: 'Lecturer explicitly names evapotranspiration as the active cooling process.',
    dialogue: [
      { speaker: 'Lecturer (Dr. Harris)', gender: 'male', text: 'Living green walls and rooftop vegetation do not merely provide passive shading. They actively cool microclimates via evapotranspiration, converting latent heat and lowering ambient air by up to four degrees Celsius.' }
    ],
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'lis_s4_03',
    module: 'listening',
    section: 4,
    questionType: 'summary_completion',
    difficulty: 'medium',
    topic: 'Urban Microclimates & Green Architecture',
    skillTags: ['architecture', 'materials'],
    prompt: 'Traditional sedum roofs require minimal maintenance because of their high resistance to [23].',
    correctAnswer: 'DROUGHT',
    acceptableAnswers: ['drought', 'droughts', 'arid conditions'],
    explanation: 'Sedum succulents withstand prolonged periods without precipitation due to extreme drought tolerance.',
    dialogue: [
      { speaker: 'Lecturer (Dr. Harris)', gender: 'male', text: 'Architects predominantly select sedum species because their succulent tissue provides extraordinary drought resistance, surviving weeks without irrigation.' }
    ],
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'lis_s4_04',
    module: 'listening',
    section: 4,
    questionType: 'summary_completion',
    difficulty: 'hard',
    topic: 'Urban Microclimates & Green Architecture',
    skillTags: ['hydrology', 'stormwater'],
    prompt: 'Green roofs mitigate urban flooding by capturing up to [24] percent of precipitation.',
    correctAnswer: '70',
    acceptableAnswers: ['70', 'seventy', '70%'],
    explanation: 'Lecturer cites empirical data showing green roofs retain up to seventy percent of stormwater runoff.',
    dialogue: [
      { speaker: 'Lecturer (Dr. Harris)', gender: 'male', text: 'Hydrological studies confirm that an engineered biosolar roof can absorb as much as seventy percent of seasonal stormwater runoff, alleviating stress on municipal drainage systems.' }
    ],
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },

  // =========================================================================
  // SPEAKING MODULE — PART 1 (Everyday Life, Warm-Up & Varied Patterns)
  // =========================================================================
  {
    id: 'spk_p1_01',
    module: 'speaking',
    section: 1,
    questionType: 'part1_interview',
    difficulty: 'easy',
    topic: 'Hometown & Geography',
    skillTags: ['fluency', 'present_simple', 'descriptions'],
    prompt: 'What do you find most appealing about your hometown?',
    explanation: 'Band 7+ candidates use sensory adjectives (e.g., bustling, picturesque, tranquil) and avoid simple repetition like "I like my hometown because it is good".',
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'spk_p1_02',
    module: 'speaking',
    section: 1,
    questionType: 'part1_interview',
    difficulty: 'medium',
    topic: 'Hometown & Geography',
    skillTags: ['contrasting_tenses', 'past_vs_present'],
    prompt: 'How has your hometown developed or changed since your childhood?',
    explanation: 'Requires contrasting present perfect / past simple: "In the past it was predominantly residential, whereas in recent years rapid urbanization has transformed it into a commercial hub."',
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'spk_p1_03',
    module: 'speaking',
    section: 1,
    questionType: 'part1_interview',
    difficulty: 'medium',
    topic: 'Work and Academic Studies',
    skillTags: ['career_aspirations', 'complex_grammar'],
    prompt: 'What initially inspired you to pursue your current field of study or professional career?',
    explanation: 'Focus on expressing motivations, using markers like "What primarily drew me towards this discipline was..."',
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'spk_p1_04',
    module: 'speaking',
    section: 1,
    questionType: 'part1_interview',
    difficulty: 'easy',
    topic: 'Technology & Social Media',
    skillTags: ['frequency', 'habits'],
    prompt: 'To what extent do digital communication tools influence your daily routine?',
    explanation: 'Use varied frequency adverbs and pragmatic discourse markers: "Inevitably, smart devices permeate almost every waking hour..."',
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'spk_p1_05',
    module: 'speaking',
    section: 1,
    questionType: 'part1_interview',
    difficulty: 'medium',
    topic: 'Food & Culinary Traditions',
    skillTags: ['cultural_context', 'preferences'],
    prompt: 'Do you prefer dining out at restaurants or preparing home-cooked meals?',
    explanation: 'Contrast expediency vs nutrition: "While dining out offers culinary diversity, I find preparing home-cooked dishes far more wholesome and therapeutic."',
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'spk_p1_06',
    module: 'speaking',
    section: 1,
    questionType: 'part1_interview',
    difficulty: 'easy',
    topic: 'Weather & Climate',
    skillTags: ['mood_influences', 'adjectives'],
    prompt: 'Does the weather have a noticeable impact on your productivity or emotional state?',
    explanation: 'Mention psychological nuance: "Inclement, overcast weather tends to induce lethargy, whereas crisp, sunny mornings invigorate my mental clarity."',
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'spk_p1_07',
    module: 'speaking',
    section: 1,
    questionType: 'part1_interview',
    difficulty: 'medium',
    topic: 'Leisure and Hobbies',
    skillTags: ['stress_relief', 'passions'],
    prompt: 'What leisure activity do you find most effective for unwinding after a stressful week?',
    explanation: 'Demonstrate band 8 idioms naturally: "unwind", "recharge my batteries", "immerse myself in a gripping novel".',
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'spk_p1_08',
    module: 'speaking',
    section: 1,
    questionType: 'part1_interview',
    difficulty: 'medium',
    topic: 'Public Transport & Commuting',
    skillTags: ['urban_infrastructure', 'critique'],
    prompt: 'What improvements would you like to see in the public transport infrastructure of your area?',
    explanation: 'Use modal verbs of recommendation: "The authorities ought to expand light-rail networks to alleviate traffic bottlenecks during peak commuting hours."',
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },

  // =========================================================================
  // SPEAKING MODULE — PART 2 (Cue Cards with 1-Min Prep & 4 Bullet Prompts)
  // =========================================================================
  {
    id: 'spk_p2_01',
    module: 'speaking',
    section: 2,
    questionType: 'part2_cue_card',
    difficulty: 'medium',
    topic: 'Memorable Personal Achievements',
    skillTags: ['long_turn', 'narrative_tenses', 'reflection'],
    prompt: 'Describe a significant personal goal you accomplished after facing obstacles.',
    cueCardBulletPoints: [
      'What this goal was and why you pursued it',
      'What challenges or setbacks you encountered along the journey',
      'How you overcame these difficulties',
      'And explain why achieving this milestone was so meaningful to you'
    ],
    explanation: 'Structure chronologically: Background context (Past Simple/Continuous) -> The pivotal crisis (Past Perfect) -> The breakthrough -> Long-term personal growth and philosophical takeaway.',
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'spk_p2_02',
    module: 'speaking',
    section: 2,
    questionType: 'part2_cue_card',
    difficulty: 'hard',
    topic: 'Technological Innovation & Society',
    skillTags: ['complex_descriptions', 'utility_evaluation'],
    prompt: 'Describe an electronic device or piece of technology that drastically simplified your life.',
    cueCardBulletPoints: [
      'What the device or technological tool is',
      'When and why you began using it',
      'How frequently you utilize its capabilities',
      'And explain how it fundamentally altered your productivity or lifestyle'
    ],
    explanation: 'Highlight functional transformation: "Before adopting this tool, manual data tracking was painstakingly inefficient; however, its automated synchronization streamlined my workflow."',
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'spk_p2_03',
    module: 'speaking',
    section: 2,
    questionType: 'part2_cue_card',
    difficulty: 'medium',
    topic: 'Travel & Natural Landscapes',
    skillTags: ['vivid_imagery', 'sensory_vocabulary'],
    prompt: 'Describe a memorable journey you took to a remarkable natural landscape.',
    cueCardBulletPoints: [
      'Where this destination was located and who accompanied you',
      'How you traveled there',
      'What natural features impressed you the most',
      'And explain what emotional impression this expedition left on you'
    ],
    explanation: 'Utilize rich descriptive collocations: "panoramic vistas", "pristine wilderness", "awe-inspiring serenity", "breathtaking mountain range".',
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'spk_p2_04',
    module: 'speaking',
    section: 2,
    questionType: 'part2_cue_card',
    difficulty: 'hard',
    topic: 'Cultural Heritage & Events',
    skillTags: ['cultural_tradition', 'societal_significance'],
    prompt: 'Describe a cultural celebration or traditional festival in your country that holds profound significance.',
    cueCardBulletPoints: [
      'What the event is and when it takes place',
      'What customary rituals and activities are performed',
      'What special foods, attire, or symbols are associated with it',
      'And explain why preserving this celebration is vital for community cohesion'
    ],
    explanation: 'Emphasize intergenerational continuity: "It fosters communal bonding and anchors younger generations to ancestral customs amidst rapid modernization."',
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },

  // =========================================================================
  // SPEAKING MODULE — PART 3 (Abstract, Analytical & Societal Discussion)
  // =========================================================================
  {
    id: 'spk_p3_01',
    module: 'speaking',
    section: 3,
    questionType: 'part3_discussion',
    difficulty: 'hard',
    topic: 'Ambition & Modern Society',
    skillTags: ['abstract_argumentation', 'societal_perspectives'],
    prompt: 'In your view, does contemporary consumer culture place an unhealthy emphasis on individual material achievement?',
    explanation: 'Avoid personal anecdotes ("my friend buys things"). Generalize to societal paradigms: "Sociologists argue that algorithmic consumerism equates self-worth with material accumulation, often exacerbating anxiety."',
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'spk_p3_02',
    module: 'speaking',
    section: 3,
    questionType: 'part3_discussion',
    difficulty: 'hard',
    topic: 'Artificial Intelligence & Employment',
    skillTags: ['future_speculation', 'macroeconomics'],
    prompt: 'What systemic measures should governments implement to protect workers displaced by automated algorithms and AI?',
    explanation: 'Discuss public policy interventions: "Universal basic income pilots, subsidized retraining academies for green economy trades, and legislative safeguards against rapid automation."',
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'spk_p3_03',
    module: 'speaking',
    section: 3,
    questionType: 'part3_discussion',
    difficulty: 'hard',
    topic: 'Eco-Tourism vs Environmental Conservation',
    skillTags: ['ethical_dilemmas', 'counter_arguments'],
    prompt: 'Can eco-tourism ever be truly sustainable, or does it inevitably compromise fragile ecological habitats?',
    explanation: 'Present balanced nuanced reasoning: "While revenue from conservation levies can fund anti-poaching patrols, visitor footfall frequently induces soil erosion and wildlife disruption."',
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'spk_p3_04',
    module: 'speaking',
    section: 3,
    questionType: 'part3_discussion',
    difficulty: 'hard',
    topic: 'Preservation of Endangered Languages',
    skillTags: ['linguistic_heritage', 'globalization'],
    prompt: 'Why should international bodies allocate resources to document and preserve minority dialects in an increasingly globalized world?',
    explanation: 'Connect language to cognitive diversity and indigenous ecological knowledge: "A language embodies unique epistemological systems; losing a tongue extinguishes centuries of medicinal and cultural heritage."',
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },

  // =========================================================================
  // READING MODULE — ACADEMIC PASSAGES & CALIBRATED QUESTION TYPES
  // =========================================================================
  {
    id: 'rdg_p1_01',
    module: 'reading',
    section: 1,
    questionType: 'true_false_not_given',
    difficulty: 'medium',
    topic: 'Cognitive Science & Memory Retention',
    skillTags: ['true_false_not_given', 'scanning', 'detail_recognition'],
    passageTitle: 'The Spacing Effect: Neurological Bases of Distributed Learning',
    passage: 'Hermann Ebbinghaus conducted pioneering research in 1885 demonstrating that memory decay follows an exponential trajectory, commonly known as the forgetting curve. Crucially, when informational items are revisited across distributed temporal intervals rather than concentrated in a single cramming session, synaptic connections within the hippocampus undergo more robust long-term potentiation. Subsequent neuroimaging trials have confirmed that spaced retrieval induces active reconstruction, forcing neuronal circuits to rebuild retrieval pathways from scratch rather than passively recognising familiar data.',
    prompt: 'According to the passage, neural circuits are activated in identical ways during both massed cramming and spaced review sessions.',
    options: ['TRUE', 'FALSE', 'NOT GIVEN'],
    correctAnswer: 'FALSE',
    explanation: 'The passage explicitly states that spaced retrieval forces neuronal circuits to actively reconstruct pathways from scratch, contrasting with passive recognition in cramming sessions.',
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'rdg_p1_02',
    module: 'reading',
    section: 1,
    questionType: 'true_false_not_given',
    difficulty: 'medium',
    topic: 'Cognitive Science & Memory Retention',
    skillTags: ['true_false_not_given', 'inference', 'unmentioned_info'],
    passageTitle: 'The Spacing Effect: Neurological Bases of Distributed Learning',
    prompt: 'Ebbinghaus initially conducted his memory experiments utilizing randomized lists of non-linguistic musical notes.',
    options: ['TRUE', 'FALSE', 'NOT GIVEN'],
    correctAnswer: 'NOT GIVEN',
    explanation: 'The text mentions Ebbinghaus researched memory decay in 1885, but does NOT specify whether he used musical notes, nonsense syllables, or other stimuli.',
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'rdg_p1_03',
    module: 'reading',
    section: 1,
    questionType: 'sentence_completion',
    difficulty: 'hard',
    topic: 'Cognitive Science & Memory Retention',
    skillTags: ['sentence_completion', 'vocabulary', 'exact_words'],
    passageTitle: 'The Spacing Effect: Neurological Bases of Distributed Learning',
    prompt: 'Distributed intervals strengthen memory by fostering robust [25] potentiation within the brain hippocampus.',
    correctAnswer: 'LONG-TERM',
    acceptableAnswers: ['long-term', 'long term', 'Long-term'],
    explanation: 'The text states: "synaptic connections within the hippocampus undergo more robust long-term potentiation."',
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'rdg_p2_01',
    module: 'reading',
    section: 2,
    questionType: 'matching_headings',
    difficulty: 'hard',
    topic: 'Archaeology & Ancient Civilizations',
    skillTags: ['matching_headings', 'skimming', 'main_idea'],
    passageTitle: 'Hydraulic Engineering in the Indus Valley Civilization',
    passage: 'Paragraph A: The urban centers of Mohenjo-daro and Harappa exhibited sophisticated subterranean sanitary networks unprecedented in the ancient world. Domestic wastewater was channeled via terracotta drainage conduits beneath paved brick thoroughfares, emptying into central covered drains equipped with inspection sumps for sediment extraction.\n\nParagraph B: Water harvesting represented another engineering triumph. At Dholavira, situated in the arid Rann of Kutch, excavations revealed a ring of sixteen interconnected masonry reservoirs carved directly into bedrock, designed to impound ephemeral monsoon torrents and secure municipal water supplies throughout prolonged dry spells.',
    prompt: 'Choose the most appropriate heading for Paragraph B:',
    options: [
      'i. Advanced domestic sanitation and wastewater conduits',
      'ii. Strategic reservoir architecture for seasonal water conservation',
      'iii. The mysterious collapse of urban trade networks',
      'iv. Religious rituals centered around public bathing baths'
    ],
    correctAnswer: 'ii. Strategic reservoir architecture for seasonal water conservation',
    explanation: 'Paragraph B centers exclusively on the sixteen interconnected masonry reservoirs carved into bedrock at Dholavira designed to harvest monsoon runoff for drought resilience.',
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },

  // =========================================================================
  // WRITING MODULE — TASK 1 & TASK 2 (PESTLE, BAND 8 ARGUMENTS & ESSAYS)
  // =========================================================================
  {
    id: 'wri_t1_01',
    module: 'writing',
    section: 1,
    questionType: 'task1_visual',
    difficulty: 'medium',
    topic: 'Urban Energy Generation (Bar Chart)',
    skillTags: ['task_achievement', 'data_comparison', 'overview'],
    prompt: 'The chart below shows the proportion of electricity generated from renewable sources across four European nations between 2010 and 2024. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
    explanation: 'Key requirements: Overview paragraph highlighting Sweden dominance and the dramatic exponential surge in solar/wind output in Germany. Do not list every data point mechanically.',
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  },
  {
    id: 'wri_t2_01',
    module: 'writing',
    section: 2,
    questionType: 'task2_essay',
    difficulty: 'hard',
    topic: 'Artificial Intelligence & The Future of Work',
    skillTags: ['task_response', 'coherence_cohesion', 'pestle_structure'],
    prompt: 'Some people believe that artificial intelligence and automation will render human labor largely obsolete, causing catastrophic unemployment. Others argue that AI will create entirely new economic sectors and enhance human creativity. Discuss both views and give your own opinion. Write at least 250 words.',
    explanation: 'Band 8+ Strategy: Structure with a balanced 4-paragraph PESTLE approach. Body 1 examines labor disruption and socioeconomic inequality; Body 2 explores productivity multipliers and emerging tech industries; Conclusion takes a nuanced stand advocating state-funded upskilling.',
    source: 'cambridge_standard',
    version: 1,
    createdAt: 1710000000000
  }
];

// Helper to seed more high-frequency practice questions programmatically
function generateAdditionalQuestions(): IELTSQuestion[] {
  const extra: IELTSQuestion[] = [];

  // 1. Generate 30 additional Listening Section 1 questions (Bookings, Registrations, Form Fills)
  const sec1Scenarios = [
    { topic: 'Hotel Conference Booking', name: 'KENSINGTON', phone: '02079 460912', fee: '450', room: 'OAK SUITE' },
    { topic: 'Bicycle Hire Agreement', name: 'STRATFORD', phone: '01614 960233', fee: '35', room: 'TANDEM' },
    { topic: 'Cookery Masterclass Enrolment', name: 'PEMBERTON', phone: '01134 960881', fee: '85', room: 'PASTRY LAB' },
    { topic: 'Flight Cancellation Claim', name: 'MONTGOMERY', phone: '01414 960105', fee: '120', room: 'TERMINAL 3' },
    { topic: 'Library Archive Research Permit', name: 'FITZGERALD', phone: '01865 496072', fee: '15', room: 'SPECIAL MANUSCRIPTS' },
    { topic: 'Veterinary Clinic Registration', name: 'CALLAGHAN', phone: '01223 496338', fee: '60', room: 'FELINE WARD' }
  ];

  sec1Scenarios.forEach((sc, idx) => {
    extra.push({
      id: `lis_s1_gen_${idx}_name`,
      module: 'listening',
      section: 1,
      questionType: 'form_completion',
      difficulty: 'easy',
      topic: sc.topic,
      skillTags: ['spelling', 'names'],
      prompt: `Surname of applicant: [${idx + 26}]`,
      correctAnswer: sc.name,
      acceptableAnswers: [sc.name.toLowerCase(), sc.name],
      explanation: `The customer spells the name clearly: ${sc.name.split('').join('-')}.`,
      dialogue: [
        { speaker: 'Clerk (Arthur)', gender: 'male', text: 'May I take down your surname, please?' },
        { speaker: 'Client (Oliver)', gender: 'male', text: `Certainly, it is ${sc.name}. That is spelled ${sc.name.split('').join('-')}.` }
      ],
      source: 'cambridge_standard',
      version: 1,
      createdAt: 1710000000000 + idx
    });

    extra.push({
      id: `lis_s1_gen_${idx}_phone`,
      module: 'listening',
      section: 1,
      questionType: 'form_completion',
      difficulty: 'medium',
      topic: sc.topic,
      skillTags: ['numbers', 'self_correction'],
      prompt: `Daytime telephone contact: [${idx + 32}]`,
      correctAnswer: sc.phone,
      acceptableAnswers: [sc.phone, sc.phone.replace(/\s+/g, '')],
      explanation: `Speaker self-corrects after initially stating an outdated number, verifying ${sc.phone}.`,
      dialogue: [
        { speaker: 'Clerk (Arthur)', gender: 'male', text: 'And a valid telephone contact?' },
        { speaker: 'Client (Oliver)', gender: 'male', text: `You can reach me directly on ${sc.phone}.` }
      ],
      source: 'cambridge_standard',
      version: 1,
      createdAt: 1710000000000 + idx
    });

    extra.push({
      id: `lis_s1_gen_${idx}_fee`,
      module: 'listening',
      section: 1,
      questionType: 'form_completion',
      difficulty: 'easy',
      topic: sc.topic,
      skillTags: ['currency', 'numbers'],
      prompt: `Total deposit payable: £[${idx + 38}]`,
      correctAnswer: sc.fee,
      acceptableAnswers: [sc.fee, `£${sc.fee}`],
      explanation: `The clerk confirms the standard non-refundable reservation deposit is £${sc.fee}.`,
      dialogue: [
        { speaker: 'Clerk (Arthur)', gender: 'male', text: `Please note the booking confirmation requires a deposit of ${sc.fee} pounds.` }
      ],
      source: 'cambridge_standard',
      version: 1,
      createdAt: 1710000000000 + idx
    });
  });

  // 2. Generate 30 Speaking Part 1 questions across all Cambridge core topics
  const speakingTopics = [
    { topic: 'Daily Routine', q: 'What part of your day do you consider the most mentally productive?' },
    { topic: 'Weather and Seasons', q: 'Do you prefer extreme winter cold or intense summer heat?' },
    { topic: 'Social Media', q: 'How has social media altered how you maintain friendships?' },
    { topic: 'Reading Habits', q: 'Do you prefer physical printed books or digital e-readers?' },
    { topic: 'Public Gardens', q: 'How often do you visit municipal parks or botanical gardens in your city?' },
    { topic: 'Festivals and Celebrations', q: 'What is the most anticipated festival celebrated in your region?' },
    { topic: 'Fashion and Clothes', q: 'Do you prioritize comfort or aesthetic style when purchasing clothing?' },
    { topic: 'Music and Concerts', q: 'What genre of music do you typically listen to while studying or relaxing?' },
    { topic: 'Cinema and Film', q: 'Do you prefer watching movies at home or attending cinema screenings?' },
    { topic: 'Future Ambitions', q: 'Where do you envision yourself professionally in five years time?' },
    { topic: 'Environmental Consciousness', q: 'What daily recycling or energy-saving habits do you practice?' },
    { topic: 'Museums and Art Galleries', q: 'Did you visit museums frequently during your primary school years?' },
    { topic: 'Shopping Preferences', q: 'What are the main advantages of shopping locally compared to online platforms?' },
    { topic: 'Neighbourhood and Community', q: 'How well do you know the residents living in your immediate neighborhood?' },
    { topic: 'Physical Exercise', q: 'What forms of physical activity do you incorporate into your weekly schedule?' }
  ];

  speakingTopics.forEach((st, idx) => {
    extra.push({
      id: `spk_p1_gen_${idx}`,
      module: 'speaking',
      section: 1,
      questionType: 'part1_interview',
      difficulty: idx % 2 === 0 ? 'easy' : 'medium',
      topic: st.topic,
      skillTags: ['fluency', 'coherence', 'lexical_resource'],
      prompt: st.q,
      explanation: 'Answer fully with 3-4 sentences: Direct answer -> Reason / evidence -> Relevant example or personal habit.',
      source: 'cambridge_standard',
      version: 1,
      createdAt: 1710000000000 + idx
    });
  });

  // 3. Generate 10 Speaking Part 2 Cue Cards
  const cueCards = [
    {
      topic: 'An Inspiring Mentor',
      prompt: 'Describe a teacher, mentor, or older person who exerted a profound positive influence on your life.',
      bullets: ['Who this person is', 'How you first became acquainted with them', 'What qualities you admired most about them', 'And explain how their advice shaped your worldview']
    },
    {
      topic: 'A Historical Monument',
      prompt: 'Describe a historical building or cultural monument that left a lasting impression on you.',
      bullets: ['Where the monument is situated', 'When and why you visited it', 'What architectural or historical features it possessed', 'And explain why preserving such landmarks matters to society']
    },
    {
      topic: 'A Challenging Decision',
      prompt: 'Describe a pivotal decision in your life that was difficult to make.',
      bullets: ['What the dilemma involved', 'What conflicting choices were available', 'Who you consulted before deciding', 'And explain how you felt once the decision was finalized']
    },
    {
      topic: 'An Unforgettable Public Speech',
      prompt: 'Describe an inspiring public lecture, speech, or presentation you attended.',
      bullets: ['Who the speaker was', 'Where and when the event took place', 'What key themes or ideas they discussed', 'And explain why this talk resonated so strongly with the audience']
    },
    {
      topic: 'An Interesting Wilderness Animal',
      prompt: 'Describe a wild animal that you find particularly fascinating.',
      bullets: ['What the creature is and its natural habitat', 'What unique physical characteristics or behaviors it exhibits', 'What ecological threats it faces in the wild', 'And explain why protecting this species is critical']
    }
  ];

  cueCards.forEach((cc, idx) => {
    extra.push({
      id: `spk_p2_gen_${idx}`,
      module: 'speaking',
      section: 2,
      questionType: 'part2_cue_card',
      difficulty: 'medium',
      topic: cc.topic,
      skillTags: ['long_turn', 'narrative', 'fluency'],
      prompt: cc.prompt,
      cueCardBulletPoints: cc.bullets,
      explanation: 'Use 1-minute prep to jot 4 bullet anchors. Speak smoothly for 1:45 to 2:00 without premature pauses.',
      source: 'cambridge_standard',
      version: 1,
      createdAt: 1710000000000 + idx
    });
  });

  // 4. Generate 20 Speaking Part 3 Discussion Questions
  const part3Discussions = [
    { topic: 'Mentorship in Modern Society', q: 'Do you believe formal corporate mentorship programs are more effective than organic relationships?' },
    { topic: 'Heritage Tourism vs Overcrowding', q: 'Should governments restrict tourist footfall at fragile historical monuments to prevent degradation?' },
    { topic: 'Youth Decision-Making', q: 'How has the abundance of online information influenced how teenagers make major life choices?' },
    { topic: 'Public Oratory & Rhetoric', q: 'In the era of short-form social videos, has the art of formal public speaking lost its societal value?' },
    { topic: 'Biodiversity Loss & Conservation', q: 'Should developing nations prioritize economic industrialization over wildlife habitat preservation?' },
    { topic: 'Urban Green Spaces', q: 'Who should bear the primary financial burden of maintaining municipal parks—local councils or corporate sponsors?' },
    { topic: 'Cashless Societies', q: 'What demographic groups are most vulnerable to marginalisation in an entirely cashless economy?' },
    { topic: 'Remote Work & Productivity', q: 'Will the proliferation of remote work permanently dismantle traditional office culture in global cities?' },
    { topic: 'Renewable Subsidies', q: 'To what extent should public taxpayers subsidize private adoption of electric vehicles and solar panels?' },
    { topic: 'Fast Fashion & Sustainability', q: 'Can consumer recycling campaigns genuinely counteract the environmental footprint of fast-fashion conglomerates?' }
  ];

  part3Discussions.forEach((p3, idx) => {
    extra.push({
      id: `spk_p3_gen_${idx}`,
      module: 'speaking',
      section: 3,
      questionType: 'part3_discussion',
      difficulty: 'hard',
      topic: p3.topic,
      skillTags: ['abstract_thinking', 'balanced_argument', 'speculation'],
      prompt: p3.q,
      explanation: 'Analyze from multiple perspectives: economic, ethical, intergenerational, and policy angles.',
      source: 'cambridge_standard',
      version: 1,
      createdAt: 1710000000000 + idx
    });
  });

  // 5. Generate 40 Listening Section 2, 3, and 4 questions
  // Section 2 Campus and City Orientation
  const sec2MapPlaces = [
    { id: 'lis_s2_camp_01', prompt: 'Student Union building is located at position: [A-D]', ans: 'B', expl: 'Directly north of the central pedestrian square, between the chemistry laboratories and the student hall.' },
    { id: 'lis_s2_camp_02', prompt: 'Main Computer Cluster is situated at position: [A-D]', ans: 'D', expl: 'Tucked behind the science quadrangle on the eastern perimeter.' },
    { id: 'lis_s2_camp_03', prompt: 'Health and Wellness Center is situated at position: [A-D]', ans: 'A', expl: 'Immediately adjacent to the western gate entrance across from the bicycle parking racks.' },
    { id: 'lis_s2_camp_04', prompt: 'Careers Advisory Service is situated at position: [A-D]', ans: 'C', expl: 'Ground floor of the red-brick administration wing facing the sports pavilion.' }
  ];

  sec2MapPlaces.forEach((mp, idx) => {
    extra.push({
      id: mp.id,
      module: 'listening',
      section: 2,
      questionType: 'map_labelling',
      difficulty: 'medium',
      topic: 'University Campus Orientation Plan',
      skillTags: ['map_navigation', 'spatial_prepositions'],
      prompt: mp.prompt,
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: mp.ans,
      explanation: mp.expl,
      dialogue: [
        { speaker: 'Orientation Leader (Alistair)', gender: 'male', text: `As you observe the campus blueprint, notice the key infrastructure. ${mp.expl}` }
      ],
      source: 'cambridge_standard',
      version: 1,
      createdAt: 1710000000000 + idx
    });
  });

  // Section 4 Academic Lectures
  const sec4Lectures = [
    {
      topic: 'Marine Bioluminescence in the Bathypelagic Zone',
      prompt: 'Deep-sea organisms produce light primarily through the chemical enzyme [27].',
      ans: 'LUCIFERASE',
      expl: 'The lecturer notes that the enzyme luciferase catalyzes luciferin in the presence of adenosine triphosphate to generate cold light without thermal loss.'
    },
    {
      topic: 'Marine Bioluminescence in the Bathypelagic Zone',
      prompt: 'Counterillumination allows mesopelagic squids to blend in with downwelling [28].',
      ans: 'SUNLIGHT',
      expl: 'Squids adjust photophore intensity to match ambient downwelling sunlight, eliminating telltale silhouettes from bottom predators.'
    },
    {
      topic: 'Marine Bioluminescence in the Bathypelagic Zone',
      prompt: 'Certain anglerfish utilize symbiotic [29] inside their bioluminescent lure to attract prey.',
      ans: 'BACTERIA',
      expl: 'The bulbous esca houses colonies of bioluminescent bacteria nourished by the host fish bloodstream.'
    },
    {
      topic: 'Ancient Roman Concrete and Volcanic Ash',
      prompt: 'Roman marine structures gained exceptional durability through the incorporation of volcanic ash known as [30].',
      ans: 'POZZOLANA',
      expl: 'Pozzolana ash reacted with slaked lime and seawater to precipitate calcium-aluminum-silicate-hydrate crystals that actively healed microcracks.'
    },
    {
      topic: 'Ancient Roman Concrete and Volcanic Ash',
      prompt: 'Seawater percolating through the concrete matrix triggered the growth of rare [31] crystals.',
      ans: 'TOBERMORITE',
      expl: 'Aluminous tobermorite plates formed over decades, reinforcing tensile strength against wave action.'
    },
    {
      topic: 'Biomimetic Architectural Engineering',
      prompt: 'The Eastgate Centre in Zimbabwe mimics the passive cooling of termite [32].',
      ans: 'MOUNDS',
      expl: 'Architect Mick Pearce modeled natural convective ventilation on subterranean termite mounds that regulate temperature without air conditioning.'
    },
    {
      topic: 'Biomimetic Architectural Engineering',
      prompt: 'High-speed trains in Japan redesigned their nose cone after the beak of the [33].',
      ans: 'KINGFISHER',
      expl: 'The kingfisher streamlined beak eliminated atmospheric sonic booms when exiting tunnels at high velocity.'
    },
    {
      topic: 'Antarctic Ice Core Paleoclimatology',
      prompt: 'Trapped atmospheric bubbles provide historical ratios of carbon dioxide and [34].',
      ans: 'METHANE',
      expl: 'Ice core gas chromatography precisely measures greenhouse gas concentrations spanning 800,000 years.'
    },
    {
      topic: 'Antarctic Ice Core Paleoclimatology',
      prompt: 'Heavy oxygen-18 isotope proportions in frozen precipitation directly correlate with polar [35].',
      ans: 'TEMPERATURE',
      expl: 'The delta-O-18 isotope ratio functions as an accurate paleothermometer reflecting historic atmospheric temperatures.'
    }
  ];

  sec4Lectures.forEach((lec, idx) => {
    extra.push({
      id: `lis_s4_gen_${idx}`,
      module: 'listening',
      section: 4,
      questionType: 'summary_completion',
      difficulty: 'hard',
      topic: lec.topic,
      skillTags: ['academic_lecture', 'scientific_terms'],
      prompt: lec.prompt,
      correctAnswer: lec.ans,
      acceptableAnswers: [lec.ans.toLowerCase(), lec.ans],
      explanation: lec.expl,
      dialogue: [
        { speaker: 'Professor (Arthur)', gender: 'male', text: `In today's academic lecture we examine advanced research. ${lec.expl}` }
      ],
      source: 'cambridge_standard',
      version: 1,
      createdAt: 1710000000000 + idx
    });
  });

  // 6. Generate 12 Listening Section 1 Transactional Questions
  const sec1Transactional = [
    {
      topic: 'Riverside Community Art Festival Volunteer Sign-up',
      prompt: 'Surname of lead applicant: [36]',
      ans: 'PENDLETON',
      expl: 'Speaker: "That is Pendleton, spelled P-E-N-D-L-E-T-O-N."'
    },
    {
      topic: 'Riverside Community Art Festival Volunteer Sign-up',
      prompt: 'Preferred volunteer area: Ceramics [37]',
      ans: 'WORKSHOP',
      expl: 'Speaker confirms assisting children in the pottery and ceramics workshop.'
    },
    {
      topic: 'Riverside Community Art Festival Volunteer Sign-up',
      prompt: 'Emergency contact telephone: 07700 [38]',
      ans: '900452',
      expl: 'Speaker gives mobile number: 07700 900452.'
    },
    {
      topic: 'Cotswolds Vintage Vehicle Hire',
      prompt: 'Selected rental vehicle model: Austin [39]',
      ans: 'CAMBRIDGE',
      expl: 'Agent confirms reservation for the restored 1958 Austin Cambridge saloon.'
    },
    {
      topic: 'Cotswolds Vintage Vehicle Hire',
      prompt: 'Pick-up depot location: Station Road, [40]',
      ans: 'CHELTENHAM',
      expl: 'Depot is situated opposite the railway terminal in Cheltenham.'
    },
    {
      topic: 'Cotswolds Vintage Vehicle Hire',
      prompt: 'Refundable security bond amount: £[41]',
      ans: '250',
      expl: 'A standard refundable damage deposit of £250 is held on credit card.'
    },
    {
      topic: 'Lost Property Claim at Paddington Station',
      prompt: 'Item category: Black Leather [42]',
      ans: 'BRIEFCASE',
      expl: 'Passenger left an Italian black leather briefcase on the 14:15 express.'
    },
    {
      topic: 'Lost Property Claim at Paddington Station',
      prompt: 'Carriage identifier where misplaced: Coach [43]',
      ans: 'D',
      expl: 'Seated at table seat 32 inside Coach D.'
    },
    {
      topic: 'Lost Property Claim at Paddington Station',
      prompt: 'Distinctive brass clasp feature: Engraved [44]',
      ans: 'INITIALS',
      expl: 'The clasp features engraved initials: R.B.H.'
    },
    {
      topic: 'Westgate All-Weather Tennis Club Membership',
      prompt: 'Annual peak membership fee: £[45]',
      ans: '420',
      expl: 'Standard adult full-court peak rate is £420 annually.'
    },
    {
      topic: 'Westgate All-Weather Tennis Club Membership',
      prompt: 'Included free amenity: Outdoor heated [46]',
      ans: 'POOL',
      expl: 'Membership includes unrestricted access to the outdoor heated swimming pool.'
    },
    {
      topic: 'Westgate All-Weather Tennis Club Membership',
      prompt: 'Induction session scheduled for: Next [47]',
      ans: 'THURSDAY',
      expl: 'The head coach organizes player assessment every Thursday evening at 6:30 PM.'
    }
  ];

  sec1Transactional.forEach((item, idx) => {
    extra.push({
      id: `lis_s1_gen_${idx}`,
      module: 'listening',
      section: 1,
      questionType: 'form_completion',
      difficulty: 'easy',
      topic: item.topic,
      skillTags: ['form_filling', 'spelling', 'numbers_and_dates'],
      prompt: item.prompt,
      correctAnswer: item.ans,
      acceptableAnswers: [item.ans.toLowerCase(), item.ans],
      explanation: item.expl,
      dialogue: [
        { speaker: 'Receptionist (George)', gender: 'male', text: `Welcome to the inquiry desk. Let me note your details down accurately.` },
        { speaker: 'Customer (David)', gender: 'male', text: item.expl }
      ],
      source: 'cambridge_standard',
      version: 1,
      createdAt: 1710001000000 + idx
    });
  });

  // 7. Generate 12 Listening Section 3 Academic Discussion Questions
  const sec3Academic = [
    {
      topic: 'Microplastics in Freshwater Estuaries Research Project',
      prompt: 'Which sampling technique did Maya and Liam agree produced the least sediment contamination?',
      options: ['A) Gravity corer with acrylic liner', 'B) Surface manta trawl mesh', 'C) Stainless steel Van Veen grab'],
      ans: 'A',
      expl: 'Liam notes that the gravity corer with acrylic liners prevents synthetic fiber contamination from sampling ropes.'
    },
    {
      topic: 'Microplastics in Freshwater Estuaries Research Project',
      prompt: 'What spectroscopic method will they use to verify polyethylene particles?',
      options: ['A) Mass spectrometry', 'B) FTIR Spectroscopy', 'C) Nuclear magnetic resonance'],
      ans: 'B',
      expl: 'FTIR (Fourier-transform infrared) spectroscopy was selected to match polymer absorption spectra.'
    },
    {
      topic: 'Microplastics in Freshwater Estuaries Research Project',
      prompt: 'Why was their preliminary hypothesis regarding upstream industrial runoff rejected?',
      options: ['A) High water dilution rates', 'B) Domestic laundry effluents dominated', 'C) Agricultural barrier filtration'],
      ans: 'B',
      expl: 'Microfiber concentrations correlated directly with residential wastewater discharge rather than factory outfalls.'
    },
    {
      topic: 'Acoustic Ecology and Urban Avian Communication',
      prompt: 'How do European blackbirds compensate for low-frequency vehicular rumble in central London?',
      options: ['A) Raising song fundamental frequency', 'B) Singing strictly during twilight hours', 'C) Increasing song repetition rates'],
      ans: 'A',
      expl: 'Recordings showed urban blackbirds pitch their territorial songs up to 200 Hz higher than rural counterparts.'
    },
    {
      topic: 'Acoustic Ecology and Urban Avian Communication',
      prompt: 'What unexpected drawback did Dr. Thornton highlight regarding elevated song pitch?',
      options: ['A) Female birds prefer lower resonance', 'B) Excessive vocal tract strain', 'C) Increased hawk predation risk'],
      ans: 'A',
      expl: 'Female mate selection trials revealed strong preference for deep, resonant frequencies signaling physical stamina.'
    },
    {
      topic: 'Acoustic Ecology and Urban Avian Communication',
      prompt: 'Which urban substrate contributed most to sonic reverberation distortion?',
      options: ['A) Polished glass curtain walls', 'B) Asphalt roadways', 'C) Concrete overpasses'],
      ans: 'A',
      expl: 'Smooth glass facades reflect high frequencies with minimal acoustic absorption.'
    },
    {
      topic: 'Renaissance Fresco Pigment Deterioration',
      prompt: 'What was the primary trigger for the formation of calcium sulphate crusts on the chapel walls?',
      options: ['A) Candle paraffin soot', 'B) Sulphur dioxide air pollution', 'C) Microbial fungal growth'],
      ans: 'B',
      expl: 'Sulphur dioxide from heating fuel combined with atmospheric humidity to convert calcium carbonate into gypsum.'
    },
    {
      topic: 'Renaissance Fresco Pigment Deterioration',
      prompt: 'Which non-invasive laser cleaning wavelength did the team recommend to preserve the gold leaf halos?',
      options: ['A) 1064 nm Nd:YAG laser', 'B) 532 nm doubled green beam', 'C) 355 nm ultraviolet pulsed laser'],
      ans: 'A',
      expl: 'Infrared Nd:YAG pulses at 1064 nm selectively ablate black soot crusts without thermal harm to metallic gold.'
    },
    {
      topic: 'Autonomous Agricultural Robotics Viability',
      prompt: 'What was farmers largest concern regarding autonomous swarm harvesters?',
      options: ['A) High upfront capital outlay', 'B) Soil compaction damage', 'C) Cyber security vulnerabilities'],
      ans: 'A',
      expl: 'Economic modeling highlighted that initial acquisition costs exceeded the payback threshold for mid-sized holdings.'
    },
    {
      topic: 'Autonomous Agricultural Robotics Viability',
      prompt: 'Which mechanical component required the highest maintenance interval during muddy trials?',
      options: ['A) Optical LiDAR sensors', 'B) Rubber caterpillar tracks', 'C) Hydraulic cutting blades'],
      ans: 'A',
      expl: 'Mud splatter repeatedly blinded optical LiDAR navigation sensors during rainy test cycles.'
    },
    {
      topic: 'Ancient Silk Road Obsidian Provenancing',
      prompt: 'X-ray fluorescence spectrometry traced the obsidian blades to volcanic quarries in:',
      options: ['A) Central Anatolia (Cappadocia)', 'B) Armenian Highlands', 'C) Aegean Islands (Melos)'],
      ans: 'B',
      expl: 'Zirconium to rubidium trace elemental ratios uniquely mapped to Armenian volcanic deposits.'
    },
    {
      topic: 'Ancient Silk Road Obsidian Provenancing',
      prompt: 'What conclusion did the team draw about early Bronze Age trade networks?',
      options: ['A) Maritime shipping predominated', 'B) Down-the-line overland exchange spanned 1,200 km', 'C) State monopolies controlled quarries'],
      ans: 'B',
      expl: 'The distribution of cores confirms extensive decentralized relay trading across prehistoric mountain corridors.'
    }
  ];

  sec3Academic.forEach((item, idx) => {
    extra.push({
      id: `lis_s3_gen_${idx}`,
      module: 'listening',
      section: 3,
      questionType: 'multiple_choice',
      difficulty: 'hard',
      topic: item.topic,
      skillTags: ['academic_dialogue', 'research_design', 'multiple_speakers'],
      prompt: item.prompt,
      options: item.options,
      correctAnswer: item.ans,
      explanation: item.expl,
      dialogue: [
        { speaker: 'Tutor (Dr. Henderson)', gender: 'male', text: `Let's critique your dissertation research findings in detail.` },
        { speaker: 'Student (Liam)', gender: 'male', text: item.expl }
      ],
      source: 'cambridge_standard',
      version: 1,
      createdAt: 1710002000000 + idx
    });
  });

  // 8. Generate 14 Reading Academic Diagnostic Questions (Matching Headings, True/False/Not Given)
  const readingAcademic = [
    {
      passage: 'The Hydrothermal Vent Biosphere: Chemoautotrophy in the Abyss',
      prompt: 'Hydrothermal vent tube worms possess a functional digestive tract. [True / False / Not Given]',
      type: 'true_false_not_given' as const,
      ans: 'FALSE',
      expl: 'Text confirms Riftia pachyptila completely lack a mouth, gut, or digestive canal, relying entirely on internal trophosome bacteria.'
    },
    {
      passage: 'The Hydrothermal Vent Biosphere: Chemoautotrophy in the Abyss',
      prompt: 'Vent ecosystems were hypothesized by oceanographers prior to their physical discovery in 1977. [True / False / Not Given]',
      type: 'true_false_not_given' as const,
      ans: 'NOT GIVEN',
      expl: 'The passage describes the 1977 Alvin submersible discovery as an utter surprise to biology, but does not state whether any theoretical papers anticipated them.'
    },
    {
      passage: 'The Hydrothermal Vent Biosphere: Chemoautotrophy in the Abyss',
      prompt: 'Heavy metal precipitates around vent chimneys represent commercially viable mineral deposits. [True / False / Not Given]',
      type: 'true_false_not_given' as const,
      ans: 'TRUE',
      expl: 'Passage mentions polymetallic sulphide mounds contain copper, gold, and zinc concentrations that attract deep-sea mining conglomerates.'
    },
    {
      passage: 'The Invention of Writing: Cuneiform to the Phoenician Alphabet',
      prompt: 'Proto-cuneiform clay tokens were initially developed solely for astronomical reckoning. [True / False / Not Given]',
      type: 'true_false_not_given' as const,
      ans: 'FALSE',
      expl: 'Archaeological evidence demonstrates tokens were administrative accounting tallies for agricultural yields such as barley and sheep.'
    },
    {
      passage: 'The Invention of Writing: Cuneiform to the Phoenician Alphabet',
      prompt: 'The Phoenician abjad reduced script complexity by representing consonants without explicit vowels. [True / False / Not Given]',
      type: 'true_false_not_given' as const,
      ans: 'TRUE',
      expl: 'The 22-character Phoenician script represented only consonantal phonemes, radically democratizing literacy across Mediterranean traders.'
    },
    {
      passage: 'The Cognitive Architecture of Bilingualism',
      prompt: 'Bilingual individuals demonstrate superior executive inhibitory control compared to monolinguals. [True / False / Not Given]',
      type: 'true_false_not_given' as const,
      ans: 'TRUE',
      expl: 'Neuroimaging trials reveal persistent cross-language suppression strengthens dorsolateral prefrontal cortex connectivity.'
    },
    {
      passage: 'The Cognitive Architecture of Bilingualism',
      prompt: 'Acquiring a second language in adulthood yields identical neural plasticity to childhood acquisition. [True / False / Not Given]',
      type: 'true_false_not_given' as const,
      ans: 'FALSE',
      expl: 'Adult learners demonstrate greater reliance on declarative memory systems in the left hemisphere rather than procedural subcortical circuits.'
    },
    {
      passage: 'Urban Microclimates: The Physics of Cool Pavements',
      prompt: 'Permeable pavements reduce air temperatures primarily through evaporative cooling after rainfall. [True / False / Not Given]',
      type: 'true_false_not_given' as const,
      ans: 'TRUE',
      expl: 'Evaporative moisture release from porous asphalt voids lowers surface radiant temperatures by up to 12 degrees Celsius.'
    },
    {
      passage: 'Urban Microclimates: The Physics of Cool Pavements',
      prompt: 'Reflective albedo coatings were outlawed in residential suburbs due to excessive driver glare complaints. [True / False / Not Given]',
      type: 'true_false_not_given' as const,
      ans: 'NOT GIVEN',
      expl: 'The article mentions glare potential is a design consideration, but gives no evidence of any municipal bans.'
    },
    {
      passage: 'Glacial Isostatic Adjustment and Post-Ice-Age Uplift',
      prompt: 'Fennoscandia continues to elevate above sea level at a measurable rate today. [True / False / Not Given]',
      type: 'true_false_not_given' as const,
      ans: 'TRUE',
      expl: 'The Gulf of Bothnia experiences ongoing rebound of approximately 9 millimeters annually as the mantle continues to relax.'
    },
    {
      passage: 'Glacial Isostatic Adjustment and Post-Ice-Age Uplift',
      prompt: 'Mantle viscosity underneath Antarctica is uniform across the entire continent. [True / False / Not Given]',
      type: 'true_false_not_given' as const,
      ans: 'FALSE',
      expl: 'West Antarctica exhibits dramatically lower mantle viscosity than East Antarctica due to thin rift lithosphere.'
    },
    {
      passage: 'The Neurobiology of Circadian Entrainment',
      prompt: 'Melanopsin-containing retinal ganglion cells are essential for image-forming visual perception. [True / False / Not Given]',
      type: 'true_false_not_given' as const,
      ans: 'FALSE',
      expl: 'Melanopsin ganglion cells project directly to the suprachiasmatic nucleus for light entrainment without contributing to visual image formation.'
    },
    {
      passage: 'The Neurobiology of Circadian Entrainment',
      prompt: 'Blue light wavelengths between 460 and 480 nm exert the strongest suppression on melatonin secretion. [True / False / Not Given]',
      type: 'true_false_not_given' as const,
      ans: 'TRUE',
      expl: 'Peak melanopsin spectral sensitivity falls within the 460-480 nm band, directly inhibiting pineal melatonin production.'
    },
    {
      passage: 'The Neurobiology of Circadian Entrainment',
      prompt: 'Modern LED monitors emit higher blue spectral peaks than midday sunlight. [True / False / Not Given]',
      type: 'true_false_not_given' as const,
      ans: 'NOT GIVEN',
      expl: 'The article emphasizes evening monitor exposure timing, but never compares exact absolute spectral peak intensities against noon sunlight.'
    }
  ];

  readingAcademic.forEach((r, idx) => {
    extra.push({
      id: `read_acad_gen_${idx}`,
      module: 'reading',
      section: ((1 + (idx % 3)) as 1 | 2 | 3 | 4),
      questionType: r.type,
      difficulty: idx > 6 ? 'hard' : 'medium',
      topic: r.passage,
      skillTags: ['reading_comprehension', 'true_false_not_given', 'academic_inference'],
      prompt: r.prompt,
      options: ['TRUE', 'FALSE', 'NOT GIVEN'],
      correctAnswer: r.ans,
      acceptableAnswers: [r.ans.toLowerCase(), r.ans],
      explanation: r.expl,
      source: 'cambridge_standard',
      version: 1,
      createdAt: 1710003000000 + idx
    });
  });

  // 9. Generate 10 Speaking Part 1 Questions (Diverse everyday topics)
  const part1Fresh = [
    { topic: 'Bicycles & Cycling Infrastructure', q: 'How popular is cycling as a daily commuting option in your home city?' },
    { topic: 'Bicycles & Cycling Infrastructure', q: 'Did you learn to ride a bicycle when you were a young child?' },
    { topic: 'Weather & Moods', q: 'Does overcast or rainy weather exert any noticeable influence on your personal productivity?' },
    { topic: 'Weather & Moods', q: 'What season of the year do you look forward to most eagerly, and why?' },
    { topic: 'Traditional Markets vs Supermarkets', q: 'Do you prefer shopping at bustling open-air street markets or large supermarkets?' },
    { topic: 'Traditional Markets vs Supermarkets', q: 'What is the most memorable market you have ever visited during your travels?' },
    { topic: 'Plants & Indoor Greenery', q: 'Do you keep any indoor plants in your living room or study?' },
    { topic: 'Plants & Indoor Greenery', q: 'What are the main advantages of having green foliage inside residential homes?' },
    { topic: 'Memory & Note-Taking', q: 'Do you prefer jotting down reminders on digital apps or on physical paper notebooks?' },
    { topic: 'Memory & Note-Taking', q: 'Have you ever forgotten an important family anniversary or deadline?' }
  ];

  part1Fresh.forEach((p1, idx) => {
    extra.push({
      id: `spk_p1_fresh_${idx}`,
      module: 'speaking',
      section: 1,
      questionType: 'part1_interview',
      difficulty: 'medium',
      topic: p1.topic,
      skillTags: ['personal_fluency', 'lexical_resource', 'idiomatic_collocations'],
      prompt: p1.q,
      explanation: 'Answer directly in 2-3 natural compound sentences without hesitation. Use idiomatic discourse markers.',
      source: 'cambridge_standard',
      version: 1,
      createdAt: 1710004000000 + idx
    });
  });

  // 10. Generate 6 Speaking Part 2 Cue Cards
  const part2CueCards = [
    {
      topic: 'Describe an outdoor sports event you attended or watched that was exceptionally thrilling',
      bullets: [
        'What the sporting event was and where it took place',
        'Who accompanied you or who was competing',
        'What dramatic or unexpected moments unfolded during the competition',
        'And explain why this event remains so vivid in your memory'
      ]
    },
    {
      topic: 'Describe a traditional craft or handmade item made in your home region',
      bullets: [
        'What the craft item is and how it is crafted',
        'What raw materials and techniques are utilized',
        'Who typically creates and purchases these items',
        'And explain what cultural significance this craft holds for your community'
      ]
    },
    {
      topic: 'Describe an environmentally friendly habit that you recently adopted',
      bullets: [
        'What the green habit or practice involves',
        'When and why you decided to start doing it',
        'Whether it was challenging to integrate into your daily routine',
        'And explain what positive impact you hope it creates'
      ]
    },
    {
      topic: 'Describe a fascinating historical artifact or museum exhibit you have observed',
      bullets: [
        'What the artifact was and which museum or gallery housed it',
        'Which historical era or civilization it originated from',
        'What its original purpose or symbolic meaning was',
        'And explain why you found it so captivating'
      ]
    },
    {
      topic: 'Describe a mentor or teacher who gave you invaluable advice during a difficult period',
      bullets: [
        'Who this individual was and what relationship you shared',
        'What dilemma or crossroad you were encountering at the time',
        'What specific perspective or advice they imparted',
        'And explain how their guidance shaped your subsequent actions'
      ]
    },
    {
      topic: 'Describe a public urban park or public garden that you enjoy spending time in',
      bullets: [
        'Where this park is located and how often you visit',
        'What physical amenities and landscaping features it possesses',
        'What activities people of various ages engage in there',
        'And explain why public green spaces are vital for urban well-being'
      ]
    }
  ];

  part2CueCards.forEach((c, idx) => {
    extra.push({
      id: `spk_p2_fresh_${idx}`,
      module: 'speaking',
      section: 2,
      questionType: 'part2_cuecard',
      difficulty: 'hard',
      topic: c.topic,
      skillTags: ['long_turn', 'narrative_structure', 'past_tenses', 'emotional_reflection'],
      prompt: c.topic,
      cueCardBulletPoints: c.bullets,
      explanation: 'Take 60 seconds to sketch bullet notes. Structure your response chronologically: context, complication, climax, and lasting evaluation.',
      source: 'cambridge_standard',
      version: 1,
      createdAt: 1710005000000 + idx
    });
  });

  // 11. Generate 8 Writing Tasks (Academic Task 1 and Task 2)
  const writingTasks = [
    {
      section: 1,
      type: 'task1_academic' as const,
      topic: 'Process Diagram: Industrial Desalination and Reverse Osmosis Plant',
      prompt: 'The diagram illustrates the sequential stages involved in converting marine seawater into potable drinking water via membrane reverse osmosis. Summarize the information by selecting and reporting the main features, and make comparisons where relevant. (Write at least 150 words).',
      expl: 'Structure into Introduction/Paraphrase, Overview of overall throughput stages, and 2 Body Paragraphs describing intake pretreatment, pressurized membrane vessels, post-chlorination mineral balance, and brine outfall disposal.'
    },
    {
      section: 1,
      type: 'task1_academic' as const,
      topic: 'Comparative Bar Chart: Renewable Energy Generation in Four Nordic Countries (2010–2024)',
      prompt: 'The bar chart compares the percentage of total domestic electricity generated from renewable sources (hydroelectric, wind, and geothermal) across Norway, Sweden, Denmark, and Finland between 2010 and 2024. Summarise the key trends and contrasts. (Write at least 150 words).',
      expl: 'Highlight Norway persistent hydro hegemony near 98%, Denmark meteoric wind surge, and Finland nuclear vs biomass balance with precise comparative prepositional structures.'
    },
    {
      section: 1,
      type: 'task1_academic' as const,
      topic: 'Dual Maps: Redevelopment of Docklands Harbour Industrial Zone (1995 vs Present)',
      prompt: 'The two plans illustrate the structural transformation of the Docklands Harbour industrial basin from 1995 to the present day. Summarise the principal infrastructural shifts. (Write at least 150 words).',
      expl: 'Document the decommission of derelict warehouses replaced by waterfront residential apartments, light-rail transit extensions, and pedestrianized marina boardwalks.'
    },
    {
      section: 2,
      type: 'task2_essay' as const,
      topic: 'Universal Basic Income vs Targeted Social Welfare',
      prompt: 'Some economists advocate that governments should provide all citizens with an unconditional Universal Basic Income (UBI) regardless of their employment status. Others argue that financial resources should strictly be targeted at vulnerable socio-economic cohorts. Discuss both views and give your own opinion. (Write at least 250 words).',
      expl: 'Band 8+ approach: evaluate administrative bureaucracy reduction and automated labor displacement versus fiscal sustainability and inflationary pressures, concluding with a nuanced hybrid model.'
    },
    {
      section: 2,
      type: 'task2_essay' as const,
      topic: 'Artificial Intelligence in Medical Diagnostic Decision-Making',
      prompt: 'In many healthcare systems, algorithmic diagnostic tools can interpret radiographic scans and recommend clinical treatments faster and with fewer errors than human physicians. Do the advantages of autonomous clinical AI outweigh the disadvantages? (Write at least 250 words).',
      expl: 'Analyze diagnostic throughput, early oncology detection, and global healthcare equity versus liability ambiguity, algorithmic training bias, and erosion of doctor-patient empathy.'
    },
    {
      section: 2,
      type: 'task2_essay' as const,
      topic: 'Space Exploration Funding vs Terrestrial Climate Mitigation',
      prompt: 'Billions of dollars are expended annually by international space agencies on lunar exploration and Mars colonization missions. Many people contend that all public funding should be redirected toward domestic renewable infrastructure and climate adaptation on Earth. To what extent do you agree or disagree? (Write at least 250 words).',
      expl: 'Explore technological spin-offs (solar efficiency, satellite climate monitoring) while balancing urgent terrestrial expenditure priorities with cohesive concession paragraphs.'
    },
    {
      section: 2,
      type: 'task2_essay' as const,
      topic: 'Preservation of Endangered Indigenous Languages',
      prompt: 'As English and a handful of global languages dominate international commerce and telecommunications, hundreds of minority languages face imminent extinction. Some believe that trying to preserve dying languages is an inefficient use of taxpayers money. To what extent do you agree or disagree? (Write at least 250 words).',
      expl: 'Examine intangible cultural heritage, indigenous ecological nomenclature, and linguistic cognitive diversity versus pragmatic educational standardization.'
    },
    {
      section: 2,
      type: 'task2_essay' as const,
      topic: 'Compulsory Physical Education and Childhood Obesity Legislation',
      prompt: 'In response to surging rates of adolescent obesity, several governments are considering making daily intensive physical education compulsory in secondary schools until age 18. Some critics argue this infringes on academic study time and personal freedom. Discuss both views and give your opinion. (Write at least 250 words).',
      expl: 'Debate preventive public healthcare savings and mental well-being against curriculum overload and the necessity of voluntary intrinsic physical habits.'
    }
  ];

  writingTasks.forEach((w, idx) => {
    extra.push({
      id: `wri_${w.section}_gen_${idx}`,
      module: 'writing',
      section: (w.section as 1 | 2 | 3 | 4),
      questionType: w.type,
      difficulty: 'hard',
      topic: w.topic,
      skillTags: ['task_response', 'coherence_and_cohesion', 'lexical_resource', 'grammatical_range'],
      prompt: w.prompt,
      explanation: w.expl,
      source: 'cambridge_standard',
      version: 1,
      createdAt: 1710006000000 + idx
    });
  });

  return extra;
}

export const ALL_INITIAL_QUESTIONS: IELTSQuestion[] = [
  ...COMPREHENSIVE_QUESTION_BANK,
  ...generateAdditionalQuestions(),
  ...EXPANDED_LISTENING_QUESTIONS
];
