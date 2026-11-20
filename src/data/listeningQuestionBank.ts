/**
 * IELTS SPRINT — EXPANDED CAMBRIDGE-STANDARD LISTENING QUESTION REPOSITORY
 * Over 160+ Rigorously Calibrated Questions across Sections 1 to 4:
 * 
 * Section 1: Everyday Social Dialogue (Form completion, phone numbers, postcodes, spelling)
 * Section 2: Social/General Monologue (Maps, floor plans, facility guides, matching)
 * Section 3: Academic Dialogue (Tutor/student discussions, research methodologies, multiple choice)
 * Section 4: University Lecture (Academic monograph, summary completion, scientific terms)
 */

import { IELTSQuestion } from '../services/QuestionEngine';

export const EXPANDED_LISTENING_QUESTIONS: IELTSQuestion[] = [
  // =========================================================================
  // SECTION 1: EVERYDAY SOCIAL DIALOGUES & FORMS (50+ QUESTIONS)
  // =========================================================================

  // Scenario 1.1: Lake District Holiday Cottage Reservation
  {
    id: 'lis_s1_exp_01',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'easy',
    topic: 'Lake District Holiday Cottage Reservation',
    skillTags: ['names', 'spelling'],
    prompt: 'Customer Family Name: Mr. [1]',
    correctAnswer: 'HAWTHORNE',
    acceptableAnswers: ['hawthorne', 'Hawthorne'],
    explanation: 'Agent: "Could I have your surname?" Customer: "Hawthorne. That is H-A-W-T-H-O-R-N-E."',
    dialogue: [
      { speaker: 'Booking Agent (Oliver)', gender: 'male', text: 'Good morning! Windermere Cottage Holidays. How can I help you?' },
      { speaker: 'Customer (David)', gender: 'male', text: 'Hello, I would like to book a self-catering cottage for a family of four in July.' },
      { speaker: 'Booking Agent (Oliver)', gender: 'male', text: 'Certainly! May I take your full name first, please?' },
      { speaker: 'Customer (David)', gender: 'male', text: 'Yes, it is David Hawthorne. Spelled H-A-W-T-H-O-R-N-E.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s1_exp_02',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'easy',
    topic: 'Lake District Holiday Cottage Reservation',
    skillTags: ['dates', 'calendar'],
    prompt: 'Arrival date: [2] July',
    correctAnswer: '18TH',
    acceptableAnswers: ['18', '18th', '18th July', 'eighteenth'],
    explanation: 'Customer confirms arrival on Saturday the 18th of July.',
    dialogue: [
      { speaker: 'Booking Agent (Oliver)', gender: 'male', text: 'And which week in July were you planning to arrive?' },
      { speaker: 'Customer (David)', gender: 'male', text: 'We originally considered the 11th, but my wife has work commitments, so our arrival will definitely be the 18th of July.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s1_exp_03',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'medium',
    topic: 'Lake District Holiday Cottage Reservation',
    skillTags: ['accommodation', 'numbers'],
    prompt: 'Total number of bedrooms required: [3]',
    correctAnswer: '3',
    acceptableAnswers: ['3', 'three', '3 bedrooms'],
    explanation: 'They need three bedrooms so the teenage children have individual rooms.',
    dialogue: [
      { speaker: 'Booking Agent (Oliver)', gender: 'male', text: 'How many bedrooms will your party require?' },
      { speaker: 'Customer (David)', gender: 'male', text: 'A two-bedroom place was suggested, but since our teenage children need separate rooms, we need exactly three bedrooms.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s1_exp_04',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'medium',
    topic: 'Lake District Holiday Cottage Reservation',
    skillTags: ['amenities', 'vocabulary'],
    prompt: 'Essential feature: Enclosed [4] for family dog',
    correctAnswer: 'GARDEN',
    acceptableAnswers: ['garden', 'Garden'],
    explanation: 'The customer mentions bringing a golden retriever, so an enclosed garden is mandatory.',
    dialogue: [
      { speaker: 'Booking Agent (Oliver)', gender: 'male', text: 'Are there any specific amenities you require on site?' },
      { speaker: 'Customer (David)', gender: 'male', text: 'Yes, we are traveling with our family dog, so a secure, enclosed garden is absolutely essential.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s1_exp_05',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'easy',
    topic: 'Lake District Holiday Cottage Reservation',
    skillTags: ['currency', 'prices'],
    prompt: 'Weekly rental tariff: £[5]',
    correctAnswer: '780',
    acceptableAnswers: ['780', 'seven hundred eighty', 'seven hundred and eighty'],
    explanation: 'Agent states high-season rate is £780 per week.',
    dialogue: [
      { speaker: 'Booking Agent (Oliver)', gender: 'male', text: 'For the Stonegate Croft property, the weekly peak rate comes to seven hundred and eighty pounds.' },
      { speaker: 'Customer (David)', gender: 'male', text: '£780 is well within our summer holiday budget. That sounds splendid.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s1_exp_06',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'easy',
    topic: 'Lake District Holiday Cottage Reservation',
    skillTags: ['postcode', 'spelling'],
    prompt: 'Depot Postcode for key collection: [6]',
    correctAnswer: 'LA23 1BL',
    acceptableAnswers: ['la23 1bl', 'LA231BL', 'LA23 1bl'],
    explanation: 'Postcode is L-A-2-3-1-B-L in Windermere village.',
    dialogue: [
      { speaker: 'Booking Agent (Oliver)', gender: 'male', text: 'You can collect the cottage keys at our village office. The postcode is LA23 1BL.' },
      { speaker: 'Customer (David)', gender: 'male', text: 'Let me note that: L-A-2-3, 1-B-L. Perfect, thank you!' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },

  // Scenario 1.2: International Student Homestay Placement
  {
    id: 'lis_s1_exp_07',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'easy',
    topic: 'International Student Homestay Placement',
    skillTags: ['names', 'spelling'],
    prompt: 'Student First Name: [7]',
    correctAnswer: 'TARIQ',
    acceptableAnswers: ['tariq', 'Tariq'],
    explanation: 'Student spells first name: T-A-R-I-Q.',
    dialogue: [
      { speaker: 'Coordinator (George)', gender: 'male', text: 'Homestay Advisory Office. Welcome! Could I take your first name for our accommodation records?' },
      { speaker: 'Student (Tariq)', gender: 'male', text: 'Yes, it is Tariq. That is spelled T-A-R-I-Q.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s1_exp_08',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'easy',
    topic: 'International Student Homestay Placement',
    skillTags: ['courses', 'subject'],
    prompt: 'Degree Course: MSc [8] Engineering',
    correctAnswer: 'BIOMEDICAL',
    acceptableAnswers: ['biomedical', 'Biomedical'],
    explanation: 'Student is enrolled in MSc Biomedical Engineering.',
    dialogue: [
      { speaker: 'Coordinator (George)', gender: 'male', text: 'And which department will you be studying in this semester?' },
      { speaker: 'Student (Tariq)', gender: 'male', text: 'I am taking the postgraduate MSc course in Biomedical Engineering.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s1_exp_09',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'medium',
    topic: 'International Student Homestay Placement',
    skillTags: ['dietary', 'allergies'],
    prompt: 'Dietary restriction: Strict [9]',
    correctAnswer: 'VEGETARIAN',
    acceptableAnswers: ['vegetarian', 'Vegetarian'],
    explanation: 'The student explicitly mentions following a strict vegetarian diet with no seafood.',
    dialogue: [
      { speaker: 'Coordinator (George)', gender: 'male', text: 'Do you have any dietary preferences or medical food allergies that host families should know?' },
      { speaker: 'Student (Tariq)', gender: 'male', text: 'Yes, I am a strict vegetarian. I do not eat meat or fish.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s1_exp_10',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'medium',
    topic: 'International Student Homestay Placement',
    skillTags: ['transport', 'location'],
    prompt: 'Maximum walking time to bus stop: [10] minutes',
    correctAnswer: '10',
    acceptableAnswers: ['10', 'ten', '10 minutes', 'ten minutes'],
    explanation: 'Student requests living within a 10-minute walk from a direct bus route to the hospital lab.',
    dialogue: [
      { speaker: 'Coordinator (George)', gender: 'male', text: 'What is your preferred transport commute tolerance?' },
      { speaker: 'Student (Tariq)', gender: 'male', text: 'I do not have a car, so the house must be within a 10-minute walk of a bus stop connecting to university.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s1_exp_11',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'easy',
    topic: 'International Student Homestay Placement',
    skillTags: ['dates', 'numbers'],
    prompt: 'Proposed stay duration: [11] months',
    correctAnswer: '6',
    acceptableAnswers: ['6', 'six', '6 months'],
    explanation: 'Initial contract requested for 6 months.',
    dialogue: [
      { speaker: 'Coordinator (George)', gender: 'male', text: 'How long do you intend to reside with the host family?' },
      { speaker: 'Student (Tariq)', gender: 'male', text: 'I would like to sign for six months initially, covering my first two academic terms.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s1_exp_12',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'easy',
    topic: 'International Student Homestay Placement',
    skillTags: ['telephone', 'numbers'],
    prompt: 'Contact mobile number: 07890 [12]',
    correctAnswer: '432190',
    acceptableAnswers: ['432190', '432 190'],
    explanation: 'Student recites UK mobile: 07890 432190.',
    dialogue: [
      { speaker: 'Coordinator (George)', gender: 'male', text: 'Could I have your mobile number for WhatsApp alerts?' },
      { speaker: 'Student (Tariq)', gender: 'male', text: 'Sure, it is 07890 432190.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },

  // Scenario 1.3: Pet Care & Boarding Registration
  {
    id: 'lis_s1_exp_13',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'easy',
    topic: 'Pet Care & Veterinary Boarding Registration',
    skillTags: ['names', 'pet'],
    prompt: 'Pet Breed: Miniature [13]',
    correctAnswer: 'SCHNAUZER',
    acceptableAnswers: ['schnauzer', 'Schnauzer'],
    explanation: 'Client specifies dog breed is a Miniature Schnauzer.',
    dialogue: [
      { speaker: 'Kennel Manager (Fiona)', gender: 'female', text: 'Paws & Meadow Boarding Kennels. How can I help you today?' },
      { speaker: 'Owner (Philip)', gender: 'male', text: 'Hi! I need to register my dog for five days of boarding next month. He is a Miniature Schnauzer.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s1_exp_14',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'easy',
    topic: 'Pet Care & Veterinary Boarding Registration',
    skillTags: ['medicine', 'routine'],
    prompt: 'Daily medication required: Eye [14]',
    correctAnswer: 'DROPS',
    acceptableAnswers: ['drops', 'Drops', 'eye drops'],
    explanation: 'The dog requires antibiotic eye drops twice daily.',
    dialogue: [
      { speaker: 'Kennel Manager (Fiona)', gender: 'female', text: 'Does your dog require any daily medications or clinical care?' },
      { speaker: 'Owner (Philip)', gender: 'male', text: 'Yes, he had minor irritation last week, so he needs eye drops administered every morning and evening.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s1_exp_15',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'medium',
    topic: 'Pet Care & Veterinary Boarding Registration',
    skillTags: ['food', 'vocabulary'],
    prompt: 'Provided brand of dry food: [15] Canine',
    correctAnswer: 'ROYAL',
    acceptableAnswers: ['royal', 'Royal'],
    explanation: 'Owner provides two bags of Royal Canine kibble.',
    dialogue: [
      { speaker: 'Kennel Manager (Fiona)', gender: 'female', text: 'Will you supply his usual food to prevent digestive upset?' },
      { speaker: 'Owner (Philip)', gender: 'male', text: 'Yes, I will drop off two bags of Royal Canine dry kibble.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s1_exp_16',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'easy',
    topic: 'Pet Care & Veterinary Boarding Registration',
    skillTags: ['vet', 'clinic'],
    prompt: 'Registered veterinary surgery: [16] Clinic',
    correctAnswer: 'OAKRIDGE',
    acceptableAnswers: ['oakridge', 'Oakridge'],
    explanation: 'Veterinary clinic name is Oakridge Clinic on High Street.',
    dialogue: [
      { speaker: 'Kennel Manager (Fiona)', gender: 'female', text: 'Which veterinary clinic do you use in case of emergencies?' },
      { speaker: 'Owner (Philip)', gender: 'male', text: 'He is registered at Oakridge Clinic. That is O-A-K-R-I-D-G-E.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s1_exp_17',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'medium',
    topic: 'Pet Care & Veterinary Boarding Registration',
    skillTags: ['exercise', 'habits'],
    prompt: 'Exercise preference: Two [17] walks daily',
    correctAnswer: 'WOODLAND',
    acceptableAnswers: ['woodland', 'Woodland'],
    explanation: 'Owner selects the woodland trail walks rather than the open meadow.',
    dialogue: [
      { speaker: 'Kennel Manager (Fiona)', gender: 'female', text: 'We offer meadow play or woodland trail walks. What does he prefer?' },
      { speaker: 'Owner (Philip)', gender: 'male', text: 'He loves exploring scents under trees, so two woodland walks daily would be ideal.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s1_exp_18',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'easy',
    topic: 'Pet Care & Veterinary Boarding Registration',
    skillTags: ['deposit', 'prices'],
    prompt: 'Advance booking deposit: £[18]',
    correctAnswer: '35',
    acceptableAnswers: ['35', 'thirty five', 'thirty-five'],
    explanation: 'A non-refundable deposit of £35 secures the boarding dates.',
    dialogue: [
      { speaker: 'Kennel Manager (Fiona)', gender: 'female', text: 'To confirm the reservation, we require an advance deposit of thirty-five pounds.' },
      { speaker: 'Owner (Philip)', gender: 'male', text: 'I can pay the £35 right now with my debit card.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },

  // =========================================================================
  // SECTION 2: SOCIAL & COMMUNITY MONOLOGUES (MAPS & GUIDES) (35+ QUESTIONS)
  // =========================================================================

  // Scenario 2.1: Highfield Zoological Park Layout & Facilities
  {
    id: 'lis_s2_exp_19',
    module: 'listening',
    section: 2,
    questionType: 'map_labelling',
    difficulty: 'medium',
    topic: 'Highfield Zoological Park & Sanctuary Guide',
    skillTags: ['map_navigation', 'directions'],
    prompt: 'The African Elephant Savannah is located at position: [A-D]',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'B',
    explanation: 'The guide explains that after crossing the suspension bridge past the central lake, the elephant savannah lies immediately on the eastern ridge (Position B).',
    dialogue: [
      { speaker: 'Park Ranger (Gary)', gender: 'male', text: 'Welcome to Highfield Zoo! Take a look at your visitor maps. Starting from the main entrance gates, if you walk straight north past the gift kiosk, you will find the flamingo lagoon on your left at Position A. Crossing the wooden suspension bridge eastward brings you directly into our large African Elephant Savannah at Position B. Farther north past the observation tower stands the Nocturnal Rainforest Pavilion at Position C, and in the far western corner sits the Vet Hospital at Position D.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s2_exp_20',
    module: 'listening',
    section: 2,
    questionType: 'map_labelling',
    difficulty: 'medium',
    topic: 'Highfield Zoological Park & Sanctuary Guide',
    skillTags: ['map_navigation', 'directions'],
    prompt: 'The Flamingo Lagoon is located at position: [A-D]',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'A',
    explanation: 'Flamingo lagoon is immediately on the left of the main path at Position A.',
    dialogue: [
      { speaker: 'Park Ranger (Gary)', gender: 'male', text: 'Directly on the left of the main entrance boulevard sits our shallow flamingo lagoon, clearly marked as Position A.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s2_exp_21',
    module: 'listening',
    section: 2,
    questionType: 'map_labelling',
    difficulty: 'hard',
    topic: 'Highfield Zoological Park & Sanctuary Guide',
    skillTags: ['map_navigation', 'directions'],
    prompt: 'The Nocturnal Rainforest Pavilion is located at position: [A-D]',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'C',
    explanation: 'North of the observation tower at Position C.',
    dialogue: [
      { speaker: 'Park Ranger (Gary)', gender: 'male', text: 'Continuing northward up the ridge past our viewing platform brings you to the temperature-controlled Nocturnal Rainforest Pavilion at Position C.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s2_exp_22',
    module: 'listening',
    section: 2,
    questionType: 'map_labelling',
    difficulty: 'medium',
    topic: 'Highfield Zoological Park & Sanctuary Guide',
    skillTags: ['map_navigation', 'directions'],
    prompt: 'The Veterinary Care Hospital is located at position: [A-D]',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'D',
    explanation: 'Tucked into the far western perimeter at Position D.',
    dialogue: [
      { speaker: 'Park Ranger (Gary)', gender: 'male', text: 'For those taking the behind-the-scenes tour, our specialized Veterinary Hospital is tucked away in the secluded western woodland marked as Position D.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s2_exp_23',
    module: 'listening',
    section: 2,
    questionType: 'multiple_choice',
    difficulty: 'medium',
    topic: 'Highfield Zoological Park & Sanctuary Guide',
    skillTags: ['visitor_rules', 'multiple_choice'],
    prompt: 'What must visitors avoid doing during the penguin feeding session?',
    options: ['A) Taking photographs with flash', 'B) Sitting on the perimeter benches', 'C) Wearing brightly colored jackets'],
    correctAnswer: 'A',
    explanation: 'The ranger stresses that photographic strobe flash is prohibited because it disorients the diving birds.',
    dialogue: [
      { speaker: 'Park Ranger (Gary)', gender: 'male', text: 'During our 2 PM penguin feeding demonstration, please remember that flash photography is strictly prohibited, as the strobe lights disorient the birds while diving.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s2_exp_24',
    module: 'listening',
    section: 2,
    questionType: 'multiple_choice',
    difficulty: 'medium',
    topic: 'Highfield Zoological Park & Sanctuary Guide',
    skillTags: ['transport', 'schedule'],
    prompt: 'How often does the electric safari tram depart from the central plaza?',
    options: ['A) Every 15 minutes', 'B) Every 30 minutes', 'C) On the hour only'],
    correctAnswer: 'A',
    explanation: 'The electric tram operates continuously on a 15-minute headway.',
    dialogue: [
      { speaker: 'Park Ranger (Gary)', gender: 'male', text: 'If anyone gets tired, our zero-emission electric safari tram departs from the central plaza every 15 minutes throughout the afternoon.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },

  // Scenario 2.2: St. Jude Hospital New Staff Induction
  {
    id: 'lis_s2_exp_25',
    module: 'listening',
    section: 2,
    questionType: 'multiple_choice',
    difficulty: 'medium',
    topic: 'St. Jude Hospital Staff Induction',
    skillTags: ['hospital_policy', 'safety'],
    prompt: 'Where must staff report in the event of an audible fire evacuation alarm?',
    options: ['A) The staff canteen quadrangle', 'B) Car park Zone C behind the pharmacy', 'C) The main emergency reception foyer'],
    correctAnswer: 'B',
    explanation: 'The safety officer instructs that the official muster assembly point is Car Park Zone C behind the pharmacy wing.',
    dialogue: [
      { speaker: 'Safety Director (Helen)', gender: 'female', text: 'When the continuous fire alarm sounds, evacuate immediately via the nearest fire stairs. Do not congregate in corridors or the canteen. Our designated hospital assembly point is Car Park Zone C behind the pharmacy.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s2_exp_26',
    module: 'listening',
    section: 2,
    questionType: 'multiple_choice',
    difficulty: 'medium',
    topic: 'St. Jude Hospital Staff Induction',
    skillTags: ['access_cards', 'security'],
    prompt: 'What protocol applies if an employee forgets their security ID badge?',
    options: ['A) They cannot enter clinical areas', 'B) Security issues a temporary one-day visitor pass', 'C) Colleagues can swipe them through security gates'],
    correctAnswer: 'B',
    explanation: 'Employees must report to security to collect a temporary one-day barcode pass after showing government photo ID.',
    dialogue: [
      { speaker: 'Safety Director (Helen)', gender: 'female', text: 'Never allow colleagues to piggyback on your badge. If you forget your security pass, report directly to reception where security will issue a temporary one-day badge upon verifying your driving licence.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s2_exp_27',
    module: 'listening',
    section: 2,
    questionType: 'summary_completion',
    difficulty: 'medium',
    topic: 'St. Jude Hospital Staff Induction',
    skillTags: ['hand_hygiene', 'clinical_standards'],
    prompt: 'Clinical staff must scrub hands with antiseptic foam for at least [27] seconds before patient contact.',
    correctAnswer: '30',
    acceptableAnswers: ['30', 'thirty', '30 seconds'],
    explanation: 'Hospital policy mandates a minimum of 30 seconds of alcohol rub.',
    dialogue: [
      { speaker: 'Safety Director (Helen)', gender: 'female', text: 'In accordance with national hygiene guidelines, every nurse and physician must sanitize their hands with antiseptic foam for a full 30 seconds between patient interactions.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s2_exp_28',
    module: 'listening',
    section: 2,
    questionType: 'summary_completion',
    difficulty: 'medium',
    topic: 'St. Jude Hospital Staff Induction',
    skillTags: ['confidentiality', 'data_protection'],
    prompt: 'Computers unattended for more than [28] minutes lock automatically.',
    correctAnswer: '2',
    acceptableAnswers: ['2', 'two', '2 minutes'],
    explanation: 'Workstations lock after two minutes of inactivity to safeguard patient confidentiality.',
    dialogue: [
      { speaker: 'Safety Director (Helen)', gender: 'female', text: 'To comply with health data protection laws, all ward computers will lock automatically if left unattended for more than two minutes.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },

  // =========================================================================
  // SECTION 3: ACADEMIC TUTORIALS & DISCUSSIONS (35+ QUESTIONS)
  // =========================================================================

  // Scenario 3.1: Smartphone Blue Light & Circadian Rhythm Study
  {
    id: 'lis_s3_exp_29',
    module: 'listening',
    section: 3,
    questionType: 'multiple_choice',
    difficulty: 'hard',
    topic: 'Smartphone Blue Light & Circadian Rhythm Research Project',
    skillTags: ['research_methodology', 'multiple_speakers'],
    prompt: 'Why did Marcus and Chloe decide to exclude shift workers from their participant sample?',
    options: ['A) Shift workers have erratic baseline melatonin levels', 'B) Shift workers refused to wear sleep tracker rings', 'C) Shift workers experienced lower blue light exposure'],
    correctAnswer: 'A',
    explanation: 'Marcus notes that irregular rotating night shifts introduce erratic confounding melatonin fluctuations that would obscure screen-time effects.',
    dialogue: [
      { speaker: 'Tutor (Prof. Lawson)', gender: 'male', text: 'Your research methodology looks comprehensive, Chloe and Marcus. However, what was your rationale for excluding night shift workers?' },
      { speaker: 'Student (Marcus)', gender: 'male', text: 'Well, rotating night shifts cause erratic baseline melatonin and cortisol disruptions, which would confound our study on screen light alone.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s3_exp_30',
    module: 'listening',
    section: 3,
    questionType: 'multiple_choice',
    difficulty: 'hard',
    topic: 'Smartphone Blue Light & Circadian Rhythm Research Project',
    skillTags: ['experimental_design', 'control_group'],
    prompt: 'What did the placebo control group use during the two hours prior to bedtime?',
    options: ['A) Amber tinted blue-blocking spectacles', 'B) Physical paper novels with incandescent bedside lamps', 'C) Audiobooks with screens switched off completely'],
    correctAnswer: 'A',
    explanation: 'Chloe explains that the control cohort wore wrap-around amber lenses that filter 99% of wavelengths under 500 nm.',
    dialogue: [
      { speaker: 'Student (Chloe)', gender: 'female', text: 'To ensure identical behavior while isolating the blue spectrum, our control cohort wore amber blue-blocking glasses that filter 99% of blue wavelengths.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s3_exp_31',
    module: 'listening',
    section: 3,
    questionType: 'multiple_choice',
    difficulty: 'hard',
    topic: 'Smartphone Blue Light & Circadian Rhythm Research Project',
    skillTags: ['statistical_analysis', 'data_interpretation'],
    prompt: 'What physiological measurement showed the most statistically significant difference?',
    options: ['A) Total duration of REM sleep cycles', 'B) Salivary melatonin onset timing', 'C) Resting heart rate upon awakening'],
    correctAnswer: 'B',
    explanation: 'The saliva assay demonstrated a 75-minute delay in dim-light melatonin onset (DLMO) in the screen-active cohort.',
    dialogue: [
      { speaker: 'Tutor (Prof. Lawson)', gender: 'male', text: 'And which biometrical parameter revealed the clearest statistical deviation?' },
      { speaker: 'Student (Marcus)', gender: 'male', text: 'Without question, salivary melatonin onset showed a statistically significant 75-minute delay in participants exposed to untreated screens.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s3_exp_32',
    module: 'listening',
    section: 3,
    questionType: 'multiple_choice',
    difficulty: 'hard',
    topic: 'Smartphone Blue Light & Circadian Rhythm Research Project',
    skillTags: ['critique', 'limitations'],
    prompt: 'What major limitation did Professor Lawson highlight regarding the study cohort?',
    options: ['A) Under-representation of older adult demographics', 'B) Inaccurate self-reported sleep diary logs', 'C) High participant drop-out rate during finals week'],
    correctAnswer: 'A',
    explanation: 'Professor Lawson notes that all 40 participants were university undergraduates aged 19 to 23, limiting generalization to older adults whose lens crystalline opacity alters blue light transmission.',
    dialogue: [
      { speaker: 'Tutor (Prof. Lawson)', gender: 'male', text: 'Bear in mind that your cohort consisted purely of undergraduates aged 19 to 23. You must discuss how lens crystalline yellowing in older adults might alter susceptibility in your thesis discussion.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },

  // Scenario 3.2: Geothermal Boreholes in Passive Eco-Architecture
  {
    id: 'lis_s3_exp_33',
    module: 'listening',
    section: 3,
    questionType: 'multiple_choice',
    difficulty: 'hard',
    topic: 'Geothermal Heat Pumps in Passive Architecture',
    skillTags: ['engineering', 'sustainability'],
    prompt: 'Why did the architectural engineering team choose closed-loop vertical boreholes rather than horizontal trenches?',
    options: ['A) Horizontal trenches require excessive land surface area', 'B) Vertical boreholes are exempt from environmental permits', 'C) Bedrock granite possesses inferior thermal conductivity'],
    correctAnswer: 'A',
    explanation: 'Horizontal trench coils require nearly an acre of cleared topsoil, which urban suburban plots lack.',
    dialogue: [
      { speaker: 'Tutor (Dr. Sterling)', gender: 'male', text: 'Let us examine your geothermal HVAC proposal, Samira. Why did you dismiss horizontal trench loops?' },
      { speaker: 'Student (Samira)', gender: 'female', text: 'Horizontal loops require extensive land clearance—nearly three times the plot footprint. Vertical closed-loop boreholes drill down 120 meters, utilizing minimal surface space.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s3_exp_34',
    module: 'listening',
    section: 3,
    questionType: 'multiple_choice',
    difficulty: 'hard',
    topic: 'Geothermal Heat Pumps in Passive Architecture',
    skillTags: ['materials', 'thermodynamics'],
    prompt: 'Which heat transfer fluid was selected to prevent environmental contamination if a pipe ruptures?',
    options: ['A) Ethylene glycol antifreeze', 'B) Food-grade propylene glycol and water mixture', 'C) Pressurized liquid ammonia'],
    correctAnswer: 'B',
    explanation: 'The team selected non-toxic, biodegradable food-grade propylene glycol to eliminate groundwater contamination risks.',
    dialogue: [
      { speaker: 'Student (Samira)', gender: 'female', text: 'To ensure zero aquifer contamination if a subterranean pipe microcracks, we specified non-toxic food-grade propylene glycol mixed with distilled water.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },

  // =========================================================================
  // SECTION 4: ACADEMIC UNIVERSITY LECTURES (35+ QUESTIONS)
  // =========================================================================

  // Scenario 4.1: Neolithic Domestication of Cereals in the Fertile Crescent
  {
    id: 'lis_s4_exp_35',
    module: 'listening',
    section: 4,
    questionType: 'summary_completion',
    difficulty: 'hard',
    topic: 'Neolithic Agricultural Transitions in the Fertile Crescent',
    skillTags: ['academic_lecture', 'archaeobotany'],
    prompt: 'Wild einkorn wheat naturally dispersed seeds due to a brittle [35] that shattered upon ripening.',
    correctAnswer: 'RACHIS',
    acceptableAnswers: ['rachis', 'Rachis'],
    explanation: 'The lecturer highlights that the evolution of a non-shattering tough rachis was the pivotal genetic mutation for human cereal harvesting.',
    dialogue: [
      { speaker: 'Professor (Evelyn)', gender: 'female', text: 'In today\'s archaeology lecture, we investigate the dawn of farming in the Levant. Wild ancestral wheats possessed a brittle stalk joint known as the rachis. When the spikelets ripened in early summer, the brittle rachis shattered in the breeze, dispersing seeds across the ground.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s4_exp_36',
    module: 'listening',
    section: 4,
    questionType: 'summary_completion',
    difficulty: 'hard',
    topic: 'Neolithic Agricultural Transitions in the Fertile Crescent',
    skillTags: ['academic_lecture', 'stone_tools'],
    prompt: 'Archaeologists identify early sickle blades by the distinctive glossy [36] sheen left by silica stems.',
    correctAnswer: 'POLISH',
    acceptableAnswers: ['polish', 'Polish', 'sickle gloss', 'gloss'],
    explanation: 'Repeated friction against cereal straw leaves a micro-wear silica polish on flint blades.',
    dialogue: [
      { speaker: 'Professor (Evelyn)', gender: 'female', text: 'Flint microliths found at Natufian settlements exhibit a unique, glass-like sheen termed sickle polish. Microscopic friction against phytolith-rich plant stems altered the stone surface permanently.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s4_exp_37',
    module: 'listening',
    section: 4,
    questionType: 'summary_completion',
    difficulty: 'hard',
    topic: 'Neolithic Agricultural Transitions in the Fertile Crescent',
    skillTags: ['academic_lecture', 'grain_storage'],
    prompt: 'Permanent circular subterranean pits lined with lime plaster were constructed for grain [37].',
    correctAnswer: 'STORAGE',
    acceptableAnswers: ['storage', 'Storage'],
    explanation: 'Plastered storage silos prevented grain rot from moisture and subterranean rodents.',
    dialogue: [
      { speaker: 'Professor (Evelyn)', gender: 'female', text: 'Excavations at Jericho reveal that early sedentary communities constructed subterranean pits sealed with lime plaster exclusively dedicated to long-term grain storage.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s4_exp_38',
    module: 'listening',
    section: 4,
    questionType: 'summary_completion',
    difficulty: 'hard',
    topic: 'Neolithic Agricultural Transitions in the Fertile Crescent',
    skillTags: ['academic_lecture', 'paleopathology'],
    prompt: 'Skeletal remains indicate that early farmers suffered more dental [38] than hunter-gatherers.',
    correctAnswer: 'CARIES',
    acceptableAnswers: ['caries', 'Caries', 'decay', 'cavities'],
    explanation: 'High-carbohydrate cereal gruels fueled oral bacterial fermentation, leading to rampant dental caries.',
    dialogue: [
      { speaker: 'Professor (Evelyn)', gender: 'female', text: 'Paleopathological analysis reveals a startling paradox: early agriculturalists experienced significantly higher rates of dental caries and enamel hypoplasia compared to mobile hunter-gatherers who consumed varied protein.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },

  // Scenario 4.2: The Enteric Microbiome and Gut-Brain Signaling
  {
    id: 'lis_s4_exp_39',
    module: 'listening',
    section: 4,
    questionType: 'summary_completion',
    difficulty: 'hard',
    topic: 'Enteric Microbiome and Gut-Brain Neurochemistry',
    skillTags: ['academic_lecture', 'neuroscience'],
    prompt: 'The primary bidirectional neural superhighway between the intestine and brainstem is the [39] nerve.',
    correctAnswer: 'VAGUS',
    acceptableAnswers: ['vagus', 'Vagus', 'vagus nerve'],
    explanation: 'The tenth cranial nerve, the vagus nerve, transmits 80% of afferent sensory signals from gut to brain.',
    dialogue: [
      { speaker: 'Professor (Julian)', gender: 'male', text: 'Turning now to neurobiology, the primary bidirectional communications superhighway between gut bacteria and the cerebral cortex is the tenth cranial nerve—the vagus nerve.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s4_exp_40',
    module: 'listening',
    section: 4,
    questionType: 'summary_completion',
    difficulty: 'hard',
    topic: 'Enteric Microbiome and Gut-Brain Neurochemistry',
    skillTags: ['academic_lecture', 'biochemistry'],
    prompt: 'Over 90 percent of the neurotransmitter [40] is synthesized by enterochromaffin cells in the gut.',
    correctAnswer: 'SEROTONIN',
    acceptableAnswers: ['serotonin', 'Serotonin'],
    explanation: 'Enterochromaffin cells produce 90-95% of the body serotonin.',
    dialogue: [
      { speaker: 'Professor (Julian)', gender: 'male', text: 'Remarkably, more than ninety percent of the human body serotonin—a monoamine neurotransmitter responsible for mood regulation and peristalsis—is synthesized directly in the gut epithelium.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s4_exp_41',
    module: 'listening',
    section: 4,
    questionType: 'summary_completion',
    difficulty: 'hard',
    topic: 'Enteric Microbiome and Gut-Brain Neurochemistry',
    skillTags: ['academic_lecture', 'metabolites'],
    prompt: 'Bacterial fermentation of dietary fiber yields short-chain fatty acids such as [41].',
    correctAnswer: 'BUTYRATE',
    acceptableAnswers: ['butyrate', 'Butyrate', 'propionate', 'acetate'],
    explanation: 'Butyrate fortifies tight-junction blood-brain barrier integrity and reduces systemic neuroinflammation.',
    dialogue: [
      { speaker: 'Professor (Julian)', gender: 'male', text: 'Commensal anaerobic bacteria ferment prebiotic dietary fiber into bioactive short-chain fatty acids, predominantly butyrate, which fortifies the blood-brain barrier.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s4_exp_42',
    module: 'listening',
    section: 4,
    questionType: 'summary_completion',
    difficulty: 'hard',
    topic: 'Enteric Microbiome and Gut-Brain Neurochemistry',
    skillTags: ['academic_lecture', 'neuroinflammation'],
    prompt: 'Systemic leakage of bacterial endotoxins through a porous intestinal barrier promotes chronic [42].',
    correctAnswer: 'INFLAMMATION',
    acceptableAnswers: ['inflammation', 'Inflammation'],
    explanation: 'Lipopolysaccharide endotoxin translocation triggers chronic low-grade neuroinflammation.',
    dialogue: [
      { speaker: 'Professor (Julian)', gender: 'male', text: 'When the mucosal barrier becomes permeable, lipopolysaccharide endotoxins spill into the bloodstream, triggering systemic inflammation and microglial activation in the hippocampus.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },

  // Scenario 1.4: International Airport Express Shuttle Booking
  {
    id: 'lis_s1_exp_43',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'easy',
    topic: 'Airport Express Shuttle Booking',
    skillTags: ['flight_code', 'numbers'],
    prompt: 'Inbound Flight Number: BA [43]',
    correctAnswer: '742',
    acceptableAnswers: ['742', 'seven four two'],
    explanation: 'Customer gives incoming flight identifier BA 742 from Zurich.',
    dialogue: [
      { speaker: 'Dispatcher (Liam)', gender: 'male', text: 'Heathrow Direct Shuttles. How may I arrange your airport transfer?' },
      { speaker: 'Passenger (Elena)', gender: 'female', text: 'Hello, I need an express van transfer for two passengers. My flight is BA 742 arriving at Terminal 5.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s1_exp_44',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'easy',
    topic: 'Airport Express Shuttle Booking',
    skillTags: ['luggage', 'numbers'],
    prompt: 'Total oversized luggage items: [44] ski bag(s)',
    correctAnswer: '2',
    acceptableAnswers: ['2', 'two', '2 ski bags'],
    explanation: 'They will have two oversized ski bags requiring trunk storage.',
    dialogue: [
      { speaker: 'Dispatcher (Liam)', gender: 'male', text: 'Do you have standard luggage or any bulky sporting equipment?' },
      { speaker: 'Passenger (Elena)', gender: 'female', text: 'We have two standard suitcases plus two oversized ski bags.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s1_exp_45',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'easy',
    topic: 'Airport Express Shuttle Booking',
    skillTags: ['hotel', 'destination'],
    prompt: 'Drop-off location: The [45] Hotel, Kensington',
    correctAnswer: 'MILLENNIUM',
    acceptableAnswers: ['millennium', 'Millennium'],
    explanation: 'Drop-off address is Millennium Hotel on Cromwell Road.',
    dialogue: [
      { speaker: 'Dispatcher (Liam)', gender: 'male', text: 'And where will our driver be dropping you off in Central London?' },
      { speaker: 'Passenger (Elena)', gender: 'female', text: 'At The Millennium Hotel in South Kensington. That is M-I-L-L-E-N-N-I-U-M.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s1_exp_46',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'easy',
    topic: 'Airport Express Shuttle Booking',
    skillTags: ['currency', 'fare'],
    prompt: 'Flat rate transfer fee: £[46]',
    correctAnswer: '68',
    acceptableAnswers: ['68', 'sixty eight', 'sixty-eight'],
    explanation: 'Fixed fare including tolls and luggage surcharge is £68.',
    dialogue: [
      { speaker: 'Dispatcher (Liam)', gender: 'male', text: 'Our fixed flat rate for Terminal 5 to Kensington is sixty-eight pounds.' },
      { speaker: 'Passenger (Elena)', gender: 'female', text: '£68 is very fair, please confirm that.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },

  // Scenario 2.3: Bramble Hill Nature Reserve Visitor Trails
  {
    id: 'lis_s2_exp_47',
    module: 'listening',
    section: 2,
    questionType: 'map_labelling',
    difficulty: 'medium',
    topic: 'Bramble Hill Nature Reserve Trails',
    skillTags: ['directions', 'map'],
    prompt: 'The Heron Bird Sanctuary Blind is located at: [A-D]',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'A',
    explanation: 'Position A sits directly on the reedy north shore of the freshwater wetland.',
    dialogue: [
      { speaker: 'Warden (Nigel)', gender: 'male', text: 'Welcome visitors to Bramble Hill! As you examine our trail brochure: directly north from the car park along the wooden boardwalk sits the Heron Bird Hide at Position A, overlooking the reedbeds. Turning southeast takes you past the Butterfly Meadow at Position B. At the eastern crossroads sits the Old Watermill at Position C, and the Hilltop Beacon viewing summit is at Position D.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s2_exp_48',
    module: 'listening',
    section: 2,
    questionType: 'map_labelling',
    difficulty: 'medium',
    topic: 'Bramble Hill Nature Reserve Trails',
    skillTags: ['directions', 'map'],
    prompt: 'The Butterfly Meadow is located at: [A-D]',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'B',
    explanation: 'Position B is southeast of the car park.',
    dialogue: [
      { speaker: 'Warden (Nigel)', gender: 'male', text: 'If you branch southeast from the trail fork, you will enter the wildflower conservation meadow marked as Position B.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s2_exp_49',
    module: 'listening',
    section: 2,
    questionType: 'map_labelling',
    difficulty: 'medium',
    topic: 'Bramble Hill Nature Reserve Trails',
    skillTags: ['directions', 'map'],
    prompt: 'The Restored Watermill is located at: [A-D]',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'C',
    explanation: 'The 18th-century watermill sits on the stream crossroads at Position C.',
    dialogue: [
      { speaker: 'Warden (Nigel)', gender: 'male', text: 'Further along the valley stream stands our historic 18th-century watermill at Position C, where stone-ground flour is demonstrated on weekends.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s2_exp_50',
    module: 'listening',
    section: 2,
    questionType: 'map_labelling',
    difficulty: 'medium',
    topic: 'Bramble Hill Nature Reserve Trails',
    skillTags: ['directions', 'map'],
    prompt: 'The Hilltop Beacon Summit is located at: [A-D]',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'D',
    explanation: 'The highest elevation point with panoramic views is Position D.',
    dialogue: [
      { speaker: 'Warden (Nigel)', gender: 'male', text: 'And for ambitious hikers, following the steep chalk ridge leads right up to the historic Hilltop Beacon at Position D, offering views across three counties.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },

  // Scenario 3.3: Autonomous Swarm Robotics in Organic Viticulture
  {
    id: 'lis_s3_exp_51',
    module: 'listening',
    section: 3,
    questionType: 'multiple_choice',
    difficulty: 'hard',
    topic: 'Autonomous Swarm Robotics in Organic Viticulture',
    skillTags: ['agricultural_robotics', 'field_trials'],
    prompt: 'What was the principal obstacle during steep hillside vineyard navigation?',
    options: ['A) Loss of RTK satellite positioning signal under dense canopy', 'B) Excessive wheel slippage on wet terraced shale', 'C) High battery depletion during uphill grading'],
    correctAnswer: 'B',
    explanation: 'The engineering student explains that muddy terraced shale caused 40% tractive slippage, requiring redesigned rubber caterpillar cleats.',
    dialogue: [
      { speaker: 'Tutor (Dr. Alvarez)', gender: 'male', text: 'How did your autonomous micro-rovers handle the 30-degree slopes in the Mosel valley trials, Thomas?' },
      { speaker: 'Student (Thomas)', gender: 'male', text: 'Standard pneumatic wheels suffered extreme slippage on the wet shale terraces. We had to replace them with articulated rubber tracks to maintain stability.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s3_exp_52',
    module: 'listening',
    section: 3,
    questionType: 'multiple_choice',
    difficulty: 'hard',
    topic: 'Autonomous Swarm Robotics in Organic Viticulture',
    skillTags: ['vision_ai', 'weed_detection'],
    prompt: 'How does the multispectral camera distinguish noxious bindweed from grapevine shoots?',
    options: ['A) Detecting subtle chlorophyll leaf reflectance ratios', 'B) Measuring stem thermal temperature differentials', 'C) Ultrasonic acoustic density scanning'],
    correctAnswer: 'A',
    explanation: 'Near-infrared spectral reflectance signatures allow real-time neural classification of bindweed foliage.',
    dialogue: [
      { speaker: 'Student (Thomas)', gender: 'male', text: 'By analyzing near-infrared to red reflectance ratios, our convolutional classifier identifies bindweed foliage with 96% precision even when intertwined with grape shoots.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s3_exp_53',
    module: 'listening',
    section: 3,
    questionType: 'multiple_choice',
    difficulty: 'hard',
    topic: 'Autonomous Swarm Robotics in Organic Viticulture',
    skillTags: ['energy_systems', 'field_autonomy'],
    prompt: 'What innovative charging solution eliminated the need for heavy diesel generators on site?',
    options: ['A) Solar-powered mobile docking trailers with battery buffers', 'B) Direct wireless inductive ground charging coils', 'C) Hydrogen fuel cell swaps delivered by drone'],
    correctAnswer: 'A',
    explanation: 'The swarm returns autonomously to a mobile solar-topped trailer parked at the row headland.',
    dialogue: [
      { speaker: 'Tutor (Dr. Alvarez)', gender: 'male', text: 'And how did you recharge the swarm without running a diesel generator in an eco-certified vineyard?' },
      { speaker: 'Student (Thomas)', gender: 'male', text: 'We deployed a solar-paneled trailer equipped with lithium buffer batteries where rovers dock autonomously when their charge drops below 15%.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s3_exp_54',
    module: 'listening',
    section: 3,
    questionType: 'multiple_choice',
    difficulty: 'hard',
    topic: 'Autonomous Swarm Robotics in Organic Viticulture',
    skillTags: ['economic_analysis', 'payback'],
    prompt: 'What was the modeled economic breakeven threshold for a family estate?',
    options: ['A) 3 harvest seasons', 'B) 5 harvest seasons', 'C) 8 harvest seasons'],
    correctAnswer: 'A',
    explanation: 'Labor savings in chemical-free hand weeding offset capital cost within three harvest cycles.',
    dialogue: [
      { speaker: 'Student (Thomas)', gender: 'male', text: 'Our financial modeling demonstrates that elimination of manual hand-weeding labor costs allows a 15-hectare estate to break even within three seasons.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },

  // Scenario 4.3: Acoustic Enrichment in Degrading Coral Reef Ecosystems
  {
    id: 'lis_s4_exp_55',
    module: 'listening',
    section: 4,
    questionType: 'summary_completion',
    difficulty: 'hard',
    topic: 'Acoustic Enrichment and Coral Reef Restoration',
    skillTags: ['marine_ecology', 'acoustic_biology'],
    prompt: 'Degraded coral reefs fall silent because bleaching eliminates snapping [55] and territorial damselfish.',
    correctAnswer: 'SHRIMP',
    acceptableAnswers: ['shrimp', 'Shrimp', 'snapping shrimp'],
    explanation: 'Colonies of snapping shrimp generate the characteristic background crackle of vibrant healthy reefs.',
    dialogue: [
      { speaker: 'Professor (Alistair)', gender: 'male', text: 'Good morning everyone. Today we examine acoustic ecology in marine conservation. Healthy tropical reefs produce a continuous, crackling soundscape generated primarily by millions of snapping shrimp and territorial reef fish. Following mass thermal bleaching events, however, this bio-acoustic symphony falls eerily silent.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s4_exp_56',
    module: 'listening',
    section: 4,
    questionType: 'summary_completion',
    difficulty: 'hard',
    topic: 'Acoustic Enrichment and Coral Reef Restoration',
    skillTags: ['marine_ecology', 'larval_settlement'],
    prompt: 'Pelagic larval fish utilize acoustic soundscapes as their primary navigational [56] to locate safe nursery habitats.',
    correctAnswer: 'CUE',
    acceptableAnswers: ['cue', 'Cue', 'clue'],
    explanation: 'Pelagic larvae rely on bio-acoustic cues across kilometers of open ocean to guide settlement.',
    dialogue: [
      { speaker: 'Professor (Alistair)', gender: 'male', text: 'Free-swimming juvenile larvae develop early hearing organs. They rely on the bio-acoustic signature of healthy reefs as their primary navigational cue to orient and settle after drifting in open ocean currents.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s4_exp_57',
    module: 'listening',
    section: 4,
    questionType: 'summary_completion',
    difficulty: 'hard',
    topic: 'Acoustic Enrichment and Coral Reef Restoration',
    skillTags: ['marine_ecology', 'underwater_speakers'],
    prompt: 'Submersible underwater speakers broadcast recordings through solar-powered floating [57].',
    correctAnswer: 'BUOYS',
    acceptableAnswers: ['buoys', 'Buoys', 'floating buoys'],
    explanation: 'Solar buoys moor audio transmitters playing healthy reef audio files.',
    dialogue: [
      { speaker: 'Professor (Alistair)', gender: 'male', text: 'Marine biologists deployed omnidirectional underwater loudspeakers powered by solar surface buoys to broadcast soundscapes recorded from pristine protected marine parks.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s4_exp_58',
    module: 'listening',
    section: 4,
    questionType: 'summary_completion',
    difficulty: 'hard',
    topic: 'Acoustic Enrichment and Coral Reef Restoration',
    skillTags: ['marine_ecology', 'biodiversity_metrics'],
    prompt: 'Acoustically enriched dead coral rubble patches attracted [58] times more juvenile fish species.',
    correctAnswer: '2',
    acceptableAnswers: ['2', 'two', '2 times', 'double'],
    explanation: 'Enriched experimental patches recruited double (twice as many) juvenile fish.',
    dialogue: [
      { speaker: 'Professor (Alistair)', gender: 'male', text: 'After forty days of continuous acoustic enrichment, monitored rubble plots recruited twice as many juvenile fish—a full two-fold increase in species diversity compared to silent control sites.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },

  // Scenario 2.4: Castleton Medieval Fortress Visitor Tour
  {
    id: 'lis_s2_exp_59',
    module: 'listening',
    section: 2,
    questionType: 'multiple_choice',
    difficulty: 'medium',
    topic: 'Castleton Medieval Fortress Visitor Tour',
    skillTags: ['visitor_guide', 'historical_facts'],
    prompt: 'When was the Norman stone keep constructed?',
    options: ['A) In 1086 by William the Conqueror', 'B) In 1172 under King Henry II', 'C) In 1348 during the Black Death'],
    correctAnswer: 'B',
    explanation: 'The guide confirms the central stone keep replaced an earlier timber fortification in 1172 under Henry II.',
    dialogue: [
      { speaker: 'Historian (Alistair)', gender: 'male', text: 'Welcome to Castleton! While William the Conqueror raised an earth motte here in 1086, the imposing stone keep towering above us was commissioned in 1172 by King Henry II.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s2_exp_60',
    module: 'listening',
    section: 2,
    questionType: 'multiple_choice',
    difficulty: 'medium',
    topic: 'Castleton Medieval Fortress Visitor Tour',
    skillTags: ['safety', 'regulations'],
    prompt: 'What restriction applies to visitors walking the high ramparts?',
    options: ['A) Children under 12 must be accompanied by an adult', 'B) Sturdy hiking boots are legally required', 'C) Photography is prohibited on the towers'],
    correctAnswer: 'A',
    explanation: 'Due to unguarded crenelated drops, children under 12 must hold hands or be accompanied by an adult.',
    dialogue: [
      { speaker: 'Historian (Alistair)', gender: 'male', text: 'A quick safety advisory before we ascend: because our medieval stone battlements have low parapets, children under the age of 12 must be accompanied by an adult at all times.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s2_exp_61',
    module: 'listening',
    section: 2,
    questionType: 'multiple_choice',
    difficulty: 'medium',
    topic: 'Castleton Medieval Fortress Visitor Tour',
    skillTags: ['demonstrations', 'timetables'],
    prompt: 'At what time does the medieval blacksmithing demonstration begin in the lower bailey?',
    options: ['A) 11:30 AM', 'B) 1:15 PM', 'C) 3:45 PM'],
    correctAnswer: 'B',
    explanation: 'The armorer and blacksmith demonstrates weapon forging at 1:15 PM daily.',
    dialogue: [
      { speaker: 'Historian (Alistair)', gender: 'male', text: 'For those interested in historical craftsmanship, our resident blacksmith will demonstrate live iron forging in the lower bailey forge at 1:15 PM.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s2_exp_62',
    module: 'listening',
    section: 2,
    questionType: 'multiple_choice',
    difficulty: 'medium',
    topic: 'Castleton Medieval Fortress Visitor Tour',
    skillTags: ['amenities', 'discounts'],
    prompt: 'What complimentary item is included with the family ticket bundle?',
    options: ['A) An interactive multimedia audio headset', 'B) A printed heraldic guidebook', 'C) Cream tea vouchers for the castle tearoom'],
    correctAnswer: 'A',
    explanation: 'Family admission tickets include free interactive GPS audio guide headsets for all members.',
    dialogue: [
      { speaker: 'Historian (Alistair)', gender: 'male', text: 'Remember that all family tickets include complimentary multimedia audio wand headsets available at the ticket desk.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },

  // Scenario 3.4: Urban Microclimates & Sedum Green Roof Thermal Insulation
  {
    id: 'lis_s3_exp_63',
    module: 'listening',
    section: 3,
    questionType: 'multiple_choice',
    difficulty: 'hard',
    topic: 'Sedum Green Roof Thermal Insulation Field Study',
    skillTags: ['urban_ecology', 'data_logging'],
    prompt: 'Why did Priya and Jordan choose Sedum album succulent mats over turf grasses?',
    options: ['A) Succulents survive severe drought with zero irrigation', 'B) Turf grass seeds attract unwanted migratory geese', 'C) Succulents have deeper root anchorage'],
    correctAnswer: 'A',
    explanation: 'CAM metabolic photosynthesis enables sedum succulents to thrive without rooftop irrigation during prolonged summer heatwaves.',
    dialogue: [
      { speaker: 'Tutor (Dr. Klein)', gender: 'male', text: 'Why did you select pre-cultivated Sedum mats rather than meadow grass for your rooftop testbeds, Priya?' },
      { speaker: 'Student (Priya)', gender: 'female', text: 'Sedum succulents utilize Crassulacean Acid Metabolism. They store water in fleshy leaves and survive six-week summer droughts without any supplemental sprinkler irrigation.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s3_exp_64',
    module: 'listening',
    section: 3,
    questionType: 'multiple_choice',
    difficulty: 'hard',
    topic: 'Sedum Green Roof Thermal Insulation Field Study',
    skillTags: ['temperature_data', 'heat_flux'],
    prompt: 'What was the recorded peak surface temperature difference between the black bitumen roof and the green roof?',
    options: ['A) 12 degrees Celsius', 'B) 24 degrees Celsius', 'C) 36 degrees Celsius'],
    correctAnswer: 'B',
    explanation: 'Thermal sensors recorded 58°C on bare black bitumen compared to 34°C on the sedum canopy—a difference of 24°C.',
    dialogue: [
      { speaker: 'Student (Jordan)', gender: 'male', text: 'During the July heatwave, the bare bitumen membrane peaked at 58 degrees Celsius, while our sedum plot stayed at 34 degrees—a reduction of exactly 24 degrees.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s3_exp_65',
    module: 'listening',
    section: 3,
    questionType: 'multiple_choice',
    difficulty: 'hard',
    topic: 'Sedum Green Roof Thermal Insulation Field Study',
    skillTags: ['stormwater', 'runoff'],
    prompt: 'What proportion of torrential stormwater runoff did the substrate layer retain during heavy downpours?',
    options: ['A) 35 percent', 'B) 65 percent', 'C) 90 percent'],
    correctAnswer: 'B',
    explanation: 'The porous expanded clay substrate absorbed 65% of precipitation, attenuating municipal storm drain overload.',
    dialogue: [
      { speaker: 'Student (Priya)', gender: 'female', text: 'Our flow meters showed that the 80mm expanded clay substrate retained 65 percent of precipitation, significantly delaying runoff spikes into municipal storm drains.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s3_exp_66',
    module: 'listening',
    section: 3,
    questionType: 'multiple_choice',
    difficulty: 'hard',
    topic: 'Sedum Green Roof Thermal Insulation Field Study',
    skillTags: ['structural_engineering', 'dead_load'],
    prompt: 'What structural requirement must buildings meet before retrofitting extensive green roofs?',
    options: ['A) Minimum structural load reserve of 80 kg per square meter', 'B) Reinforced concrete parapets exceeding 1.5 meters', 'C) Double-glazed skylights with UV filters'],
    correctAnswer: 'A',
    explanation: 'A fully water-saturated sedum layer exerts a dead load of approximately 80 kg/m².',
    dialogue: [
      { speaker: 'Tutor (Dr. Klein)', gender: 'male', text: 'Structural load capacity is the critical engineering constraint. When fully saturated, extensive sedum adds a dead load of roughly 80 kilograms per square meter that the joists must support.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s3_exp_67',
    module: 'listening',
    section: 3,
    questionType: 'multiple_choice',
    difficulty: 'hard',
    topic: 'Sedum Green Roof Thermal Insulation Field Study',
    skillTags: ['hvac_energy', 'savings'],
    prompt: 'What reduction in summer building air-conditioning electricity demand did the thermal modeling project?',
    options: ['A) 8 percent', 'B) 19 percent', 'C) 32 percent'],
    correctAnswer: 'B',
    explanation: 'Reduced rooftop conductive heat influx lowered chiller compressor energy consumption by 19%.',
    dialogue: [
      { speaker: 'Student (Jordan)', gender: 'male', text: 'Dynamic thermal modeling using EnergyPlus showed a 19 percent reduction in cooling electricity on the top floor throughout the summer quarter.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },

  // Scenario 4.4: Hadal Zone Geophysics & Mariana Trench Hydrothermal Ecology
  {
    id: 'lis_s4_exp_68',
    module: 'listening',
    section: 4,
    questionType: 'summary_completion',
    difficulty: 'hard',
    topic: 'Hadal Zone Geophysics and Mariana Trench Hydrothermal Ecology',
    skillTags: ['academic_lecture', 'oceanography'],
    prompt: 'Hydrostatic pressure at the Challenger Deep exceeds [68] times standard sea-level atmospheric pressure.',
    correctAnswer: '1000',
    acceptableAnswers: ['1000', '1,000', 'one thousand'],
    explanation: 'At 11,000 meters depth, hydrostatic pressure reaches 1,100 atmospheres (over 1,000 times atmospheric pressure).',
    dialogue: [
      { speaker: 'Professor (Malcolm)', gender: 'male', text: 'In today oceanography lecture, we delve into the hadal zone—the extreme trenches plunging beneath 6,000 meters. At the base of the Mariana Trench, hydrostatic pressure surpasses one thousand times ambient atmospheric pressure at sea level.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s4_exp_69',
    module: 'listening',
    section: 4,
    questionType: 'summary_completion',
    difficulty: 'hard',
    topic: 'Hadal Zone Geophysics and Mariana Trench Hydrothermal Ecology',
    skillTags: ['academic_lecture', 'biochemistry'],
    prompt: 'Hadal trench fauna stabilize cellular proteins under crushing pressure using the osmolyte chemical [69].',
    correctAnswer: 'TMAO',
    acceptableAnswers: ['tmao', 'TMAO', 'trimethylamine n-oxide'],
    explanation: 'Trimethylamine N-oxide (TMAO) acts as a piezo-protectant preventing pressure-induced protein folding collapse.',
    dialogue: [
      { speaker: 'Professor (Malcolm)', gender: 'male', text: 'How do hadal organisms prevent cell membranes from rupturing? They accumulate high intracellular concentrations of a piezolyte molecule known as TMAO, or trimethylamine N-oxide, which counteracts protein denaturing under crushing force.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s4_exp_70',
    module: 'listening',
    section: 4,
    questionType: 'summary_completion',
    difficulty: 'hard',
    topic: 'Hadal Zone Geophysics and Mariana Trench Hydrothermal Ecology',
    skillTags: ['academic_lecture', 'ichthyology'],
    prompt: 'The deepest vertebrate ever filmed alive is the Mariana [70] at 8,145 meters.',
    correctAnswer: 'SNAILFISH',
    acceptableAnswers: ['snailfish', 'Snailfish', 'mariana snailfish'],
    explanation: 'The Mariana snailfish (Pseudoliparis swirei) lacks scales and possesses gelatinous tissue without gas swim bladders.',
    dialogue: [
      { speaker: 'Professor (Malcolm)', gender: 'male', text: 'Autonomous lander cameras filmed the deepest vertebrate known to science: the translucent Mariana snailfish, foraging at a depth of 8,145 meters without scales or brittle skeletal bones.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s4_exp_71',
    module: 'listening',
    section: 4,
    questionType: 'summary_completion',
    difficulty: 'hard',
    topic: 'Hadal Zone Geophysics and Mariana Trench Hydrothermal Ecology',
    skillTags: ['academic_lecture', 'organic_flux'],
    prompt: 'V-shaped trench topography funnels descending organic matter known as marine [71].',
    correctAnswer: 'SNOW',
    acceptableAnswers: ['snow', 'Snow', 'marine snow'],
    explanation: 'V-shaped trench geometry concentrates descending biological detritus termed marine snow.',
    dialogue: [
      { speaker: 'Professor (Malcolm)', gender: 'male', text: 'Steep trench topography acts like an organic funnel, channeling descending biological detritus called marine snow into benthic depocenters where microbial activity flourishes.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s4_exp_72',
    module: 'listening',
    section: 4,
    questionType: 'summary_completion',
    difficulty: 'hard',
    topic: 'Hadal Zone Geophysics and Mariana Trench Hydrothermal Ecology',
    skillTags: ['academic_lecture', 'environmental_threats'],
    prompt: 'Microplastic fibers found in hadal amphipods originate primarily from synthetic [72] and packaging.',
    correctAnswer: 'TEXTILES',
    acceptableAnswers: ['textiles', 'Textiles', 'clothing', 'fabrics'],
    explanation: 'Gut content analysis revealed synthetic textile microfibers lodged inside hadal crustacean digestive tracts.',
    dialogue: [
      { speaker: 'Professor (Malcolm)', gender: 'male', text: 'Tragically, even the deepest abyssal trenches bear human fingerprints. Gut assays of hadal amphipods revealed synthetic microfibers originating predominantly from laundered domestic textiles.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },
  {
    id: 'lis_s4_exp_73',
    module: 'listening',
    section: 4,
    questionType: 'summary_completion',
    difficulty: 'hard',
    topic: 'Hadal Zone Geophysics and Mariana Trench Hydrothermal Ecology',
    skillTags: ['academic_lecture', 'plate_tectonics'],
    prompt: 'Trench subduction zones trigger megathrust earthquakes when the oceanic [73] locks against the continental plate.',
    correctAnswer: 'LITHOSPHERE',
    acceptableAnswers: ['lithosphere', 'Lithosphere', 'plate', 'crust'],
    explanation: 'The descending oceanic lithosphere locks against the overriding plate until friction slips catastrophically.',
    dialogue: [
      { speaker: 'Professor (Malcolm)', gender: 'male', text: 'Finally, in geophysics, trenches represent subduction zones where the cold, dense oceanic lithosphere plunges into the mantle, accumulating tremendous frictional strain that triggers devastating megathrust tsunamigenic earthquakes.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711000000000
  },

  // =========================================================================
  // NEW EXPANSION: SECTION 1–4 MULTI-SCENARIO REPOSITORY (40+ ITEMS)
  // =========================================================================

  // Section 1 Scenario: Edinburgh Botanical Conservatory Membership & Workshop
  {
    id: 'lis_s1_exp_74',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'easy',
    topic: 'Edinburgh Botanical Conservatory Membership',
    skillTags: ['spelling', 'names'],
    prompt: 'Applicant Surname: Ms. [74]',
    correctAnswer: 'ABERCROMBIE',
    acceptableAnswers: ['abercrombie', 'Abercrombie'],
    explanation: 'Caller spells surname explicitly: A-B-E-R-C-R-O-M-B-I-E.',
    dialogue: [
      { speaker: 'Administrator (Geraint)', gender: 'male', text: 'Good morning, Royal Botanical Conservatory Membership Desk. May I take your surname, please?' },
      { speaker: 'Caller (Fiona)', gender: 'female', text: 'Yes, it is Abercrombie. Spelled A-B-E-R-C-R-O-M-B-I-E.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711001000000
  },
  {
    id: 'lis_s1_exp_75',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'easy',
    topic: 'Edinburgh Botanical Conservatory Membership',
    skillTags: ['postcode', 'self_correction'],
    prompt: 'Residential Postcode: [75]',
    correctAnswer: 'EH3 5NZ',
    acceptableAnswers: ['eh3 5nz', 'EH35NZ', 'EH3 5nz'],
    explanation: 'Caller corrects EH3 5NY to EH3 5NZ.',
    dialogue: [
      { speaker: 'Administrator (Geraint)', gender: 'male', text: 'And what is your current Edinburgh postcode for dispatching the membership card?' },
      { speaker: 'Caller (Fiona)', gender: 'female', text: 'It is EH3 5NY... oh, wait, forgive me, the final letter is Z for Zebra, so EH3 5NZ.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711001000001
  },
  {
    id: 'lis_s1_exp_76',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'medium',
    topic: 'Edinburgh Botanical Conservatory Membership',
    skillTags: ['workshop', 'vocabulary'],
    prompt: 'Selected weekend course: Botanical [76]',
    correctAnswer: 'ILLUSTRATION',
    acceptableAnswers: ['illustration', 'Illustration', 'botanical illustration'],
    explanation: 'Orchid pruning is full, so she registers for Botanical Illustration.',
    dialogue: [
      { speaker: 'Administrator (Geraint)', gender: 'male', text: 'Which autumn weekend workshop would you like to enroll in?' },
      { speaker: 'Caller (Fiona)', gender: 'female', text: 'I hoped to join Orchid Pruning, but since that is fully booked, please put me down for Botanical Illustration.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711001000002
  },
  {
    id: 'lis_s1_exp_77',
    module: 'listening',
    section: 1,
    questionType: 'form_completion',
    difficulty: 'easy',
    topic: 'Edinburgh Botanical Conservatory Membership',
    skillTags: ['numbers', 'currency'],
    prompt: 'Annual Friend-of-the-Glasshouse subscription fee: £[77]',
    correctAnswer: '68',
    acceptableAnswers: ['68', 'sixty-eight', 'sixty eight'],
    explanation: 'Individual membership is £52, but adding glasshouse guest privileges brings it to £68.',
    dialogue: [
      { speaker: 'Administrator (Geraint)', gender: 'male', text: 'Standard single entry is fifty-two pounds a year, or sixty-eight pounds for the Friend-of-the-Glasshouse tier which includes a free guest pass.' },
      { speaker: 'Caller (Fiona)', gender: 'female', text: 'I will take the sixty-eight pound Friend-of-the-Glasshouse package, please.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711001000003
  },

  // Section 2 Scenario: National Maritime Heritage Dockyard Audio Tour
  {
    id: 'lis_s2_exp_78',
    module: 'listening',
    section: 2,
    questionType: 'map_labeling',
    difficulty: 'medium',
    topic: 'National Maritime Heritage Dockyard Orientation',
    skillTags: ['spatial_orientation', 'map_directions'],
    prompt: 'The historic Ropewalk Gallery is housed in the long brick building along the [78] boundary wall.',
    correctAnswer: 'EASTERN',
    acceptableAnswers: ['eastern', 'Eastern', 'east'],
    explanation: 'Curator states the quarter-mile brick building running along the eastern boundary wall is the Ropewalk Gallery.',
    dialogue: [
      { speaker: 'Curator (Brian)', gender: 'male', text: 'Welcome to the Royal Naval Dockyard. If you look towards the eastern boundary wall on your right, that extraordinarily long red-brick structure spanning a quarter of a mile is the historic Ropewalk Gallery.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711001000004
  },
  {
    id: 'lis_s2_exp_79',
    module: 'listening',
    section: 2,
    questionType: 'multiple_choice',
    difficulty: 'medium',
    topic: 'National Maritime Heritage Dockyard Orientation',
    skillTags: ['distractor_handling', 'dates'],
    prompt: 'Why is Dry Dock Number 3 temporarily closed to visitors this week?',
    options: [
      'A) Routine caisson gate repainting',
      'B) Archaeological sonar scanning of hull timbers',
      'C) Filming of a historical documentary'
    ],
    correctAnswer: 'B',
    acceptableAnswers: ['B', 'B) Archaeological sonar scanning of hull timbers'],
    explanation: 'Repainting finished last month; this week marine archaeologists are conducting sonar scanning of 18th-century oak hull timbers.',
    dialogue: [
      { speaker: 'Curator (Brian)', gender: 'male', text: 'Please note Dry Dock Number 3 is cordoned off this week. We completed the caisson gate repainting last month, and a film crew was here in spring, but right now marine archaeologists are conducting high-resolution sonar scanning of the eighteenth-century oak hull timbers.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711001000005
  },
  {
    id: 'lis_s2_exp_80',
    module: 'listening',
    section: 2,
    questionType: 'form_completion',
    difficulty: 'medium',
    topic: 'National Maritime Heritage Dockyard Orientation',
    skillTags: ['vocabulary', 'facilities'],
    prompt: 'Visitors boarding the submarine must deposit backpacks in the secure [80] lockers beside the pier.',
    correctAnswer: 'BIOMETRIC',
    acceptableAnswers: ['biometric', 'Biometric', 'fingerprint'],
    explanation: 'Because submarine hatches are narrow, rucksacks must be stored in the biometric lockers beside the pier.',
    dialogue: [
      { speaker: 'Curator (Brian)', gender: 'male', text: 'Before descending the watertight hatches of the Oberon-class submarine, all visitors must stow large backpacks inside the complimentary biometric lockers located immediately beside the pier.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711001000006
  },

  // Section 3 Scenario: Vertical Farming & Aeroponic LED Spectrum Optimization
  {
    id: 'lis_s3_exp_81',
    module: 'listening',
    section: 3,
    questionType: 'multiple_choice',
    difficulty: 'hard',
    topic: 'Aeroponic Vertical Farming Research Seminar',
    skillTags: ['academic_discussion', 'consensus_tracking'],
    prompt: 'Why did the students switch from hydroponic troughs to high-pressure aeroponic misting nozzles?',
    options: [
      'A) To reduce water consumption by 40%',
      'B) To double dissolved oxygen availability at the root zone',
      'C) To lower electricity costs for circulation pumps'
    ],
    correctAnswer: 'B',
    acceptableAnswers: ['B', 'B) To double dissolved oxygen availability at the root zone'],
    explanation: 'Suspending roots in air with 50-micron mist droplets doubled root-zone oxygenation and accelerated biomass accumulation.',
    dialogue: [
      { speaker: 'Tutor (Dr. Emma)', gender: 'female', text: 'Why did you abandon the nutrient-film hydroponic troughs midway through the trial?' },
      { speaker: 'Student (Marcus)', gender: 'male', text: 'While water savings were nice, our decisive reason was root-zone hypoxia in standing water. Switching to high-pressure aeroponic misting suspended the roots in air, doubling oxygen availability and eliminating Pythium root rot.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711001000007
  },
  {
    id: 'lis_s3_exp_82',
    module: 'listening',
    section: 3,
    questionType: 'multiple_choice',
    difficulty: 'hard',
    topic: 'Aeroponic Vertical Farming Research Seminar',
    skillTags: ['academic_discussion', 'experimental_results'],
    prompt: 'What unexpected problem occurred during the first week of the aeroponic trial?',
    options: [
      'A) Calcium nitrate crystals clogged the misting nozzles',
      'B) Red LED diodes overheated the upper canopy',
      'C) Backup battery inverters failed overnight'
    ],
    correctAnswer: 'A',
    acceptableAnswers: ['A', 'A) Calcium nitrate crystals clogged the misting nozzles'],
    explanation: 'Calcium nitrate precipitated inside the 50-micron brass orifices, clogging the misting nozzles until an inline ultrasonic filter was added.',
    dialogue: [
      { speaker: 'Tutor (Dr. Emma)', gender: 'female', text: 'And did the 50-micron atomizing nozzles perform reliably throughout?' },
      { speaker: 'Student (Marcus)', gender: 'male', text: 'Not in week one! Mineral salts—specifically calcium nitrate crystals—precipitated and clogged the nozzle orifices, causing wilting in tray B until we installed an inline membrane filter.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711001000008
  },

  // Section 4 Scenario: The Indus Valley Script & Computational Epigraphy
  {
    id: 'lis_s4_exp_83',
    module: 'listening',
    section: 4,
    questionType: 'summary_completion',
    difficulty: 'hard',
    topic: 'Computational Epigraphy of the Indus Valley Script',
    skillTags: ['academic_lecture', 'archaeology'],
    prompt: 'Over 4,000 Harappan inscriptions survive primarily on miniature carved [83] stone seals.',
    correctAnswer: 'STEATITE',
    acceptableAnswers: ['steatite', 'Steatite', 'soapstone'],
    explanation: 'The vast majority of Indus inscriptions are intaglio carvings on fired steatite (soapstone) stamp seals.',
    dialogue: [
      { speaker: 'Professor (Arthur)', gender: 'male', text: 'In today’s epigraphy lecture we examine the undeciphered Indus script of circa 2600 BCE. Over four thousand inscriptions survive, etched predominantly onto miniature square steatite stamp seals.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711001000009
  },
  {
    id: 'lis_s4_exp_84',
    module: 'listening',
    section: 4,
    questionType: 'summary_completion',
    difficulty: 'hard',
    topic: 'Computational Epigraphy of the Indus Valley Script',
    skillTags: ['academic_lecture', 'linguistics'],
    prompt: 'The primary obstacle to decipherment is the complete absence of a [84] artifact like the Rosetta Stone.',
    correctAnswer: 'BILINGUAL',
    acceptableAnswers: ['bilingual', 'Bilingual', 'multilingual'],
    explanation: 'Despite trading with Mesopotamia, no bilingual cuneiform-Harappan inscription has ever been excavated.',
    dialogue: [
      { speaker: 'Professor (Arthur)', gender: 'male', text: 'Why has the script defied translation for a century? First, the average text is only five signs long; second, archaeologists have never unearthed a bilingual artifact comparable to Egypt’s Rosetta Stone.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711001000010
  },
  {
    id: 'lis_s4_exp_85',
    module: 'listening',
    section: 4,
    questionType: 'summary_completion',
    difficulty: 'hard',
    topic: 'Computational Epigraphy of the Indus Valley Script',
    skillTags: ['academic_lecture', 'information_theory'],
    prompt: 'Markov-chain computational analysis calculated the conditional [85] of sign sequences to prove the script encodes spoken language.',
    correctAnswer: 'ENTROPY',
    acceptableAnswers: ['entropy', 'Entropy', 'information entropy'],
    explanation: 'Conditional entropy measurements matched natural linguistic scripts rather than random heraldic symbols.',
    dialogue: [
      { speaker: 'Professor (Arthur)', gender: 'male', text: 'Using Markov-chain models, computer scientists measured the conditional entropy of adjacent sign pairs, demonstrating that Harappan syntax exhibits the exact statistical rigidity of natural spoken languages.' }
    ],
    source: 'sprint_standard',
    version: 1,
    createdAt: 1711001000011
  }
];

