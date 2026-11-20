/**
 * BandSprint — IELTS 11–21 Complete Exam Engine & Test Generator
 *
 * Provides original IELTS-style, fully populated 4-module practice simulation content for
 * all Practice volumes 11 to 21 across Academic and General Training tracks.
 * Every test includes 40 Listening questions, 40 Reading questions,
 * Tasks 1 & 2 Writing with live word counters, and 3-part Speaking interviews.
 */

import {
  SprintTestSet,
  SprintVolumeNumber,
  SprintEdition,
  SprintTestNumber,
  SprintQuestionItem,
  SprintListeningContent,
  SprintReadingContent,
  SprintWritingContent,
  SprintSpeakingContent
} from '../types/sprintLibrary';

// Volume metadata topics for IELTS-style domain context
const VOLUME_THEMES: Record<
  number,
  {
    theme: string;
    listeningTopic: string;
    readingTopic1: string;
    readingTopic2: string;
    readingTopic3: string;
    writingAcademicT1: string;
    writingGtT1: string;
    writingT2: string;
    speakingTopic: string;
  }
> = {
  21: {
    theme: 'AI & Next-Generation Ecological Systems (2026)',
    listeningTopic: 'Global Symposium on Autonomous Clean Tech & Smart Grid Infrastructure',
    readingTopic1: 'The Proliferation of Urban Micro-Forests and Bio-Solar Roofs',
    readingTopic2: 'Neurological Pathways of Deep Sleep and Memory Consolidation',
    readingTopic3: 'Quantum Sensing in Deep-Sea Oceanography and Marine Geophysics',
    writingAcademicT1: 'The bar chart below illustrates clean energy capital investment (in billions USD) across six regions between 2018 and 2025.',
    writingGtT1: 'You recently attended a professional conference where your travel accommodations were disrupted. Write a letter to the conference organizers.',
    writingT2: 'As generative artificial intelligence becomes capable of producing creative literature and art, some argue that human artistic expression will lose its cultural value. To what extent do you agree or disagree?',
    speakingTopic: 'Sustainable living habits and next-generation smart tools'
  },
  20: {
    theme: 'Space Geodesy, Marine Biology & Global Urbanism (2025)',
    listeningTopic: 'International Oceanic Drone Research Cooperative',
    readingTopic1: 'Agricultural Resilience in Arid Climates: The Rediscovery of Ancient Millets',
    readingTopic2: 'Biomimetic Thermoregulation in High-Rise Architecture',
    readingTopic3: 'The Cognitive Architecture of Early Childhood Multilingualism',
    writingAcademicT1: 'The line graph shows electric and hydrogen bus deployment in five European capital cities from 2019 to 2024.',
    writingGtT1: 'You are moving to a new city for work and require assistance with local housing. Write a letter to a local estate agency.',
    writingT2: 'Some governments are considering implementing a four-day working week to enhance employee wellbeing. Others believe this will harm national economic productivity. Discuss both views and give your opinion.',
    speakingTopic: 'Public infrastructure and environmental planning'
  },
  19: {
    theme: 'Workplace Ergonomics & Cryogenic Engineering (2024)',
    listeningTopic: 'Riverside Community Health and Sports Center Enrollment',
    readingTopic1: 'Occupational Health and Airflow Dynamics in Modern Commercial Buildings',
    readingTopic2: 'Thermodynamic Principles of Liquid-Air Energy Storage',
    readingTopic3: 'Ethical Dilemmas in Autonomous Algorithmic Decision-Making',
    writingAcademicT1: 'The pie charts compare sources of municipal electricity generation in 2010 and 2023.',
    writingGtT1: 'You recently purchased an expensive electronic appliance that stopped functioning within a week. Write a formal letter of complaint to the store manager.',
    writingT2: 'Many employers now allow staff to work remotely permanently. Does this development bring more advantages or disadvantages for employees and society as a whole?',
    speakingTopic: 'Daily productivity habits and digital communication'
  },
  18: {
    theme: 'University Orientation, Forest Biodiversity & Sustainable Transit (2023)',
    listeningTopic: 'Postgraduate Admissions & Renewable Power Induction',
    readingTopic1: 'Mycorrhizal Fungal Networks in Old-Growth Temperate Forests',
    readingTopic2: 'The Evolution of High-Speed Intercity Rail Corridors',
    readingTopic3: 'Neuroplasticity and Language Rehabilitation in Adult Patients',
    writingAcademicT1: 'The table below details international student enrolment across four university faculties between 2016 and 2022.',
    writingGtT1: 'You want to take a leave of absence from your current job to attend a specialized university course. Write a letter to your employer.',
    writingT2: 'Some people argue that university education should focus strictly on equipping students with practical skills for employment. Others believe university should provide broad philosophical and scientific knowledge. Discuss both views.',
    speakingTopic: 'Higher education and career ambitions'
  },
  17: {
    theme: 'Autonomous Logistics & Biomaterials (2022)',
    listeningTopic: 'Municipal Autonomous Fleet Logistics & Charging Depot',
    readingTopic1: 'Industrial Cryogenics and Atmospheric Gas Liquefaction',
    readingTopic2: 'Bioclimatic Passive Solar Design in Sub-Zero Climates',
    readingTopic3: 'The Historiography of Early Maritime Navigation Instruments',
    writingAcademicT1: 'The process diagram illustrates the commercial extraction and purification of bioactive pharmaceutical compounds from seaweed.',
    writingGtT1: 'You have arranged to rent an apartment while studying abroad, but the move-in date has changed. Write a letter to the property landlord.',
    writingT2: 'In many countries, secondary schools are replacing physical education classes with extra academic coursework. Do you think this is a positive or negative trend?',
    speakingTopic: 'Physical health and technological automation'
  },
  16: {
    theme: 'Roman Engineering & Climate History (2021)',
    listeningTopic: 'Coastal Conservation & Maritime Bird Sanctuary Orientation',
    readingTopic1: 'Aqueduct Engineering and Hydraulic Mortar in Ancient Rome',
    readingTopic2: 'Glacial Ice-Core Sampling and Palaeoclimatic Variability',
    readingTopic3: 'Memory Consolidation During Rapid Eye Movement (REM) Sleep',
    writingAcademicT1: 'The line graph illustrates the percentage of household waste recycled in five British counties from 2010 to 2020.',
    writingGtT1: 'You are organizing a community charity sports event and need to reserve the local sports hall. Write a letter to the hall manager.',
    writingT2: 'Some people believe that tourism brings enormous economic benefits and cross-cultural understanding. Others argue it damages local environments and cultural heritage. Discuss both views.',
    speakingTopic: 'Historic architecture and memorable journeys'
  },
  15: {
    theme: 'Geothermal Energy & Cognitive Psychology (2020)',
    listeningTopic: 'Community Arts Center & Public Library Heritage Archive',
    readingTopic1: 'The Agronomy of Highland Tea Cultivation and Soil Chemistry',
    readingTopic2: 'Driverless Vehicles: Algorithmic Ethics and Liability Laws',
    readingTopic3: 'The Evolutionary Psychology of Humour and Group Social Bonding',
    writingAcademicT1: 'The bar chart compares the average number of hours worked per week by full-time employees in six countries in 2020.',
    writingGtT1: 'Your local public library is planning to reduce its operating hours. Write a letter to the chief librarian expressing your views.',
    writingT2: 'With the increasing cost of tertiary education, some feel governments should make all university courses free for all citizens. To what extent do you agree or disagree?',
    speakingTopic: 'Reading habits and educational mentors'
  },
  14: {
    theme: 'River Ecology & Marine Microplastics (2019)',
    listeningTopic: 'Holiday Nature Reserve Cottage Booking & River Ferry Services',
    readingTopic1: 'Megalithic Stone Temples of the Mediterranean Archipelago',
    readingTopic2: 'Cetacean Acoustic Communication and Deep Oceanic Foraging',
    readingTopic3: 'Intrinsic Motivation and Autonomy in Modern Work Environments',
    writingAcademicT1: 'The pie charts compare energy consumption by fuel type in residential homes in 2000 and 2018.',
    writingGtT1: 'You are invited to a former colleague’s farewell party but cannot attend. Write a letter apologizing and explaining why.',
    writingT2: 'Consumer culture has led people to purchase disposable products rather than durable goods. What are the causes of this trend, and what problems does it create?',
    speakingTopic: 'Natural parks and urban recreation'
  },
  13: {
    theme: 'Urban Green Spaces & Aviation Safety (2018)',
    listeningTopic: 'Urban Traffic Safety Survey & Coastal Hiking Expedition',
    readingTopic1: 'Primate Societal Structures and Conflict Resolution in Baboons',
    readingTopic2: 'Forensic Linguistics and Deception Detection in Interrogations',
    readingTopic3: 'The Psychological Benefits of Urban Canopy Cover and Public Parks',
    writingAcademicT1: 'The table compares average broadband download speeds (in Mbps) across seven cities between 2014 and 2018.',
    writingGtT1: 'You lost an important personal document while traveling on a municipal passenger train. Write a letter to the railway lost property office.',
    writingT2: 'Some people think that countries should spend public funds preserving traditional cultural practices. Others believe this money should be invested in modern scientific infrastructure. Discuss both views.',
    speakingTopic: 'Traditional arts, folklore, and music'
  },
  12: {
    theme: 'Heritage Architecture & Avian Migration (2017)',
    listeningTopic: 'Civic Museum Heritage Pass & Highland Cycling Expedition',
    readingTopic1: 'Reconstruction and Fire-Resistant Masonry After the Great Fire of London',
    readingTopic2: 'The Psychology of Risk Perception in High-Hazard Industries',
    readingTopic3: 'Magnetic Navigation and Celestial Cues in Long-Distance Bird Migration',
    writingAcademicT1: 'The bar chart shows municipal investment in green transport infrastructure in four European cities from 2012 to 2016.',
    writingGtT1: 'You recently stayed at a hotel and left a valuable item behind. Write a letter to the hotel manager.',
    writingT2: 'In many countries, governments allocate large budgets to space exploration while basic societal problems remain unsolved on Earth. Do you agree or disagree with this expenditure?',
    speakingTopic: 'Sports, outdoor activities, and lifestyle health'
  },
  11: {
    theme: 'Civil Engineering & Climate Adaptation (2016)',
    listeningTopic: 'National Park Wildlife Trail & Shuttle Transport Booking',
    readingTopic1: 'The Engineering Innovation of the Falkirk Rotating Boat Lift',
    readingTopic2: 'Vertical Hydroponic Agriculture in High-Density Metropolitan Centers',
    readingTopic3: 'Geoengineering Techniques for Solar Radiation Management',
    writingAcademicT1: 'The diagram below shows the industrial process of manufacturing clay building bricks for commercial construction.',
    writingGtT1: 'You recently started renting a residential flat and noticed several maintenance problems. Write a letter to your landlord.',
    writingT2: 'Many university graduates today struggle to find employment directly related to their field of study. What are the primary causes, and what measures can universities take to resolve this issue?',
    speakingTopic: 'Hometown heritage, family gatherings, and celebrations'
  }
};

/**
 * Complete, high-fidelity 3,082-word, 40-question IELTS Listening pilot test
 * for Practice Set 18 Academic Test 1 (Practice Library Pilot).
 */
export const SPRINT_18_ACADEMIC_TEST_1_LISTENING: SprintListeningContent = {
  title: 'Practice Set 18 · Academic Test 1 Listening Examination',
  contextDescription: 'Full 4-part IELTS Listening test with 40 questions (Q1–Q40) and native British audio scripts across 3,082 transcript words.',
  parts: [
    {
      partNumber: 1,
      title: 'Part 1: Community Center Venue Hire & Facility Registration',
      description: 'A telephone enquiry dialogue between Eleanor Vance (Community Events Coordinator) and Julian Ross (Oakridge Fine Arts Guild).',
      audioScript: `International English Language Testing System. Listening Practice Simulation.
Section 1. You will hear an enquiry dialogue between a community events coordinator and a resident booking a venue for a charity art exhibition and workshop series.
First, you have some time to look at questions 1 to 5.
Now listen carefully and answer questions 1 to 5.

Coordinator: "Good morning, Oakridge Community Centre and Events Bureau. My name is Eleanor Vance. How can I assist you today?"
Julian: "Good morning, Mrs. Vance. My name is Julian Ross. I am calling on behalf of the Oakridge Fine Arts Guild to enquire about hiring one of your main function suites for a weekend charity art exhibition and community workshop series in the autumn."
Coordinator: "Splendid! We host a wide range of cultural exhibitions throughout the year. Let me open an event reservation application on our portal. May I take your full surname first, please?"
Julian: "Yes, certainly. My surname is Thornton. Let me spell that out for you: T-H-O-R-N-T-O-N."
Coordinator: "Thank you, Mr. Thornton. That is T-H-O-R-N-T-O-N. And what is the most reliable telephone number where our bookings team can reach you regarding contract confirmation and emergency updates?"
Julian: "You can reach me at my home landline on 01632 960882... Oh, wait! Please accept my apologies, Mrs. Vance! We are having our home landline rewired all this fortnight, so the line is currently disconnected. You had better record my personal mobile number instead. It is 07892 411503."
Coordinator: "Right, let me update that in our system: active mobile 07892 411503. Perfect. And what is the planned date for the exhibition weekend?"
Julian: "We have selected Saturday, the 14th of October."
Coordinator: "Saturday, 14th October recorded. And regarding the primary purpose of the gathering, you mentioned a charity art exhibition?"
Julian: "Yes, exactly. Local artists will showcase oil paintings, pottery, and sculpture, with all ticket sales and auction proceeds benefiting the regional children's hospice foundation."
Coordinator: "That is a wonderful local cause, Mr. Thornton. The council is always delighted to support charity initiatives. Now, will your exhibition require early access on Friday evening for setting up display boards and lighting tracks?"
Julian: "Yes, indeed! Having access on Friday evening from 18:00 to 21:00 would be enormously helpful for our volunteer staging crew."
Coordinator: "Splendid. I have added Friday evening staging access to your reservation notes."

Now look at questions 6 to 10.
Listen carefully and answer questions 6 to 10.

Coordinator: "Now, regarding our suite options: for an exhibition featuring artwork and workshops, we recommend our largest room, the Riverside Suite on the ground floor. It has flexible display panels, high ceilings, and abundant natural northern light."
Julian: "The Riverside Suite sounds ideal. And how many guests are you anticipating throughout the day?"
Coordinator: "We estimate approximately 85 attending guests during peak afternoon hours."
Julian: "Splendid. An 85-guest capacity fits comfortably within the Riverside Suite's official capacity threshold. Will your team require any specialized technical equipment, such as an overhead digital projector for artist talks?"
Coordinator: "Yes, please! An overhead digital projector and a portable wireless microphone would be wonderful for our scheduled afternoon panel discussions."
Julian: "Noted: digital projector and wireless microphone setup included in the room inventory. And will your caterers require access to our commercial kitchen, or just the tea and coffee refreshment counter in the foyer?"
Coordinator: "We will definitely need full access to the commercial kitchen, as our volunteers plan to prepare light buffet lunches and hot beverages throughout the exhibition."
Julian: "Full commercial kitchen access included. Now, regarding administrative fees: room hire for the full day is £280, and there is a mandatory refundable security deposit of £150, which is returned within three working days after our duty caretaker completes the post-event inspection."
Coordinator: "A £150 refundable security deposit is completely acceptable. And what time can our setup team collect the security keys on Saturday morning to begin arranging the display screens?"
Julian: "Key collection is available from our duty caretaker at 08:30 AM sharp at the main security office."
Coordinator: "08:30 AM. Excellent! And is there designated parking on site for our unloading van?"
Julian: "Yes, we reserve two loading bays adjacent to the rear kitchen entrance specifically for event organizers."
Coordinator: "Wonderful! Thank you so much for all your guidance, Mrs. Vance!"
Julian: "You are most welcome, Mr. Thornton. We look forward to receiving your deposit form. Have a wonderful day! Goodbye."

That is the end of Section 1. You now have half a minute to check your answers.`,
      dialogue: [
        { speaker: 'Coordinator (Eleanor Vance)', speakerId: 'speaker_05', gender: 'female', text: 'Good morning, Oakridge Community Centre and Events Bureau. My name is Eleanor Vance. How can I assist you today?', pauseAfterMs: 400 },
        { speaker: 'Julian Ross', speakerId: 'speaker_01', gender: 'male', text: 'Good morning, Mrs. Vance. My name is Julian Ross. I am calling on behalf of the Oakridge Fine Arts Guild to enquire about hiring one of your main function suites for a weekend charity art exhibition and community workshop series in the autumn.', pauseAfterMs: 450 },
        { speaker: 'Coordinator (Eleanor Vance)', speakerId: 'speaker_05', gender: 'female', text: 'Splendid! We host a wide range of cultural exhibitions throughout the year. Let me open an event reservation application on our portal. May I take your full surname first, please?', pauseAfterMs: 400 },
        { speaker: 'Julian Ross', speakerId: 'speaker_01', gender: 'male', text: 'Yes, certainly. My surname is Thornton. Let me spell that out for you: T-H-O-R-N-T-O-N.', pauseAfterMs: 450 },
        { speaker: 'Coordinator (Eleanor Vance)', speakerId: 'speaker_05', gender: 'female', text: 'Thank you, Mr. Thornton. That is T-H-O-R-N-T-O-N. And what is the most reliable telephone number where our bookings team can reach you regarding contract confirmation and emergency updates?', pauseAfterMs: 400 },
        { speaker: 'Julian Ross', speakerId: 'speaker_01', gender: 'male', text: 'You can reach me at my home landline on 01632 960882... Oh, wait! Please accept my apologies, Mrs. Vance! We are having our home landline rewired all this fortnight, so the line is currently disconnected. You had better record my personal mobile number instead. It is 07892 411503.', pauseAfterMs: 500 },
        { speaker: 'Coordinator (Eleanor Vance)', speakerId: 'speaker_05', gender: 'female', text: 'Right, let me update that in our system: active mobile 07892 411503. Perfect. And what is the planned date for the exhibition weekend?', pauseAfterMs: 400 },
        { speaker: 'Julian Ross', speakerId: 'speaker_01', gender: 'male', text: 'We have selected Saturday, the 14th of October.', pauseAfterMs: 450 },
        { speaker: 'Coordinator (Eleanor Vance)', speakerId: 'speaker_05', gender: 'female', text: 'Saturday, 14th October recorded. And regarding the primary purpose of the gathering, you mentioned a charity art exhibition?', pauseAfterMs: 400 },
        { speaker: 'Julian Ross', speakerId: 'speaker_01', gender: 'male', text: "Yes, exactly. Local artists will showcase oil paintings, pottery, and sculpture, with all ticket sales and auction proceeds benefiting the regional children's hospice foundation.", pauseAfterMs: 450 },
        { speaker: 'Coordinator (Eleanor Vance)', speakerId: 'speaker_05', gender: 'female', text: 'That is a wonderful local cause, Mr. Thornton. The council is always delighted to support charity initiatives. Now, will your exhibition require early access on Friday evening for setting up display boards and lighting tracks?', pauseAfterMs: 450 },
        { speaker: 'Julian Ross', speakerId: 'speaker_01', gender: 'male', text: 'Yes, indeed! Having access on Friday evening from 18:00 to 21:00 would be enormously helpful for our volunteer staging crew.', pauseAfterMs: 450 },
        { speaker: 'Coordinator (Eleanor Vance)', speakerId: 'speaker_05', gender: 'female', text: 'Now, regarding our suite options: for an exhibition featuring artwork and workshops, we recommend our largest room, the Riverside Suite on the ground floor. It has flexible display panels, high ceilings, and abundant natural northern light.', pauseAfterMs: 500 },
        { speaker: 'Julian Ross', speakerId: 'speaker_01', gender: 'male', text: 'The Riverside Suite sounds ideal. And how many guests are you anticipating throughout the day?', pauseAfterMs: 400 },
        { speaker: 'Coordinator (Eleanor Vance)', speakerId: 'speaker_05', gender: 'female', text: 'We estimate approximately 85 attending guests during peak afternoon hours.', pauseAfterMs: 450 },
        { speaker: 'Julian Ross', speakerId: 'speaker_01', gender: 'male', text: "Splendid. An 85-guest capacity fits comfortably within the Riverside Suite's official capacity threshold. Will your team require any specialized technical equipment, such as an overhead digital projector for artist talks?", pauseAfterMs: 450 },
        { speaker: 'Coordinator (Eleanor Vance)', speakerId: 'speaker_05', gender: 'female', text: 'Yes, please! An overhead digital projector and a portable wireless microphone would be wonderful for our scheduled afternoon panel discussions.', pauseAfterMs: 450 },
        { speaker: 'Julian Ross', speakerId: 'speaker_01', gender: 'male', text: 'Noted: digital projector and wireless microphone setup included in the room inventory. And will your caterers require access to our commercial kitchen, or just the tea and coffee refreshment counter in the foyer?', pauseAfterMs: 450 },
        { speaker: 'Coordinator (Eleanor Vance)', speakerId: 'speaker_05', gender: 'female', text: 'We will definitely need full access to the commercial kitchen, as our volunteers plan to prepare light buffet lunches and hot beverages throughout the exhibition.', pauseAfterMs: 450 },
        { speaker: 'Julian Ross', speakerId: 'speaker_01', gender: 'male', text: 'Full commercial kitchen access included. Now, regarding administrative fees: room hire for the full day is £280, and there is a mandatory refundable security deposit of £150, which is returned within three working days after our duty caretaker completes the post-event inspection.', pauseAfterMs: 500 },
        { speaker: 'Coordinator (Eleanor Vance)', speakerId: 'speaker_05', gender: 'female', text: 'A £150 refundable security deposit is completely acceptable. And what time can our setup team collect the security keys on Saturday morning to begin arranging the display screens?', pauseAfterMs: 450 },
        { speaker: 'Julian Ross', speakerId: 'speaker_01', gender: 'male', text: 'Key collection is available from our duty caretaker at 08:30 AM sharp at the main security office.', pauseAfterMs: 450 },
        { speaker: 'Coordinator (Eleanor Vance)', speakerId: 'speaker_05', gender: 'female', text: '08:30 AM. Excellent! And is there designated parking on site for our unloading van?', pauseAfterMs: 400 },
        { speaker: 'Julian Ross', speakerId: 'speaker_01', gender: 'male', text: 'Yes, we reserve two loading bays adjacent to the rear kitchen entrance specifically for event organizers.', pauseAfterMs: 450 },
        { speaker: 'Coordinator (Eleanor Vance)', speakerId: 'speaker_05', gender: 'female', text: 'Wonderful! Thank you so much for all your guidance, Mrs. Vance!', pauseAfterMs: 400 },
        { speaker: 'Julian Ross', speakerId: 'speaker_01', gender: 'male', text: 'You are most welcome, Mr. Thornton. We look forward to receiving your deposit form. Have a wonderful day! Goodbye.', pauseAfterMs: 500 }
      ],
      questions: [
        { id: 'c18-a-t1-l-q1', questionNumber: 1, partOrSection: 1, type: 'note_completion', prompt: 'Applicant Family Name (spelled in recording):', correctAnswer: 'THORNTON', acceptableAnswers: ['THORNTON', 'Thornton', 'thornton'], explanation: 'Julian explicitly spells out his surname: T-H-O-R-N-T-O-N.', wordLimit: 1 },
        { id: 'c18-a-t1-l-q2', questionNumber: 2, partOrSection: 1, type: 'note_completion', prompt: 'Primary Contact Mobile Number:', correctAnswer: '07892411503', acceptableAnswers: ['07892411503', '07892 411503'], explanation: 'Julian self-corrects from a disconnected landline to his active mobile: 07892 411503.', wordLimit: 2 },
        { id: 'c18-a-t1-l-q3', questionNumber: 3, partOrSection: 1, type: 'note_completion', prompt: 'Event Date (Day & Month):', correctAnswer: '14TH OCTOBER', acceptableAnswers: ['14TH OCTOBER', '14 OCTOBER', 'OCTOBER 14', '14TH OF OCTOBER', '14 October'], explanation: 'Julian confirms the selected date is Saturday, 14th of October.', wordLimit: 2 },
        { id: 'c18-a-t1-l-q4', questionNumber: 4, partOrSection: 1, type: 'note_completion', prompt: 'Primary Event Purpose:', correctAnswer: 'ART EXHIBITION', acceptableAnswers: ['ART EXHIBITION', 'art exhibition'], explanation: 'The event is a charity art exhibition and community workshop.', wordLimit: 2 },
        { id: 'c18-a-t1-l-q5', questionNumber: 5, partOrSection: 1, type: 'multiple_choice', prompt: 'Which function suite did the applicant reserve?', options: ['A) Oakridge Main Hall', 'B) Riverside Suite', 'C) Garden Pavilion'], correctAnswer: 'B', acceptableAnswers: ['B', 'B) Riverside Suite', 'Riverside Suite'], explanation: 'Eleanor Vance recommends the Riverside Suite on the ground floor.' },
        { id: 'c18-a-t1-l-q6', questionNumber: 6, partOrSection: 1, type: 'note_completion', prompt: 'Expected total attending guests:', correctAnswer: '85', acceptableAnswers: ['85', 'EIGHTY FIVE', 'EIGHTY-FIVE', 'eighty five'], explanation: 'Julian estimates approximately 85 attending guests during peak hours.', wordLimit: 2 },
        { id: 'c18-a-t1-l-q7', questionNumber: 7, partOrSection: 1, type: 'note_completion', prompt: 'Additional technical equipment requested:', correctAnswer: 'PROJECTOR', acceptableAnswers: ['PROJECTOR', 'projector', 'DIGITAL PROJECTOR'], explanation: 'Julian requests an overhead digital projector and wireless microphone.', wordLimit: 2 },
        { id: 'c18-a-t1-l-q8', questionNumber: 8, partOrSection: 1, type: 'note_completion', prompt: 'Ancillary facility access required:', correctAnswer: 'KITCHEN', acceptableAnswers: ['KITCHEN', 'kitchen', 'COMMERCIAL KITCHEN'], explanation: 'Full access to the commercial kitchen is needed for catering.', wordLimit: 2 },
        { id: 'c18-a-t1-l-q9', questionNumber: 9, partOrSection: 1, type: 'note_completion', prompt: 'Refundable security deposit amount (£):', correctAnswer: '150', acceptableAnswers: ['150', '£150'], explanation: 'The mandatory refundable security deposit is £150.', wordLimit: 2 },
        { id: 'c18-a-t1-l-q10', questionNumber: 10, partOrSection: 1, type: 'note_completion', prompt: 'Key collection time on Saturday morning:', correctAnswer: '08:30', acceptableAnswers: ['08:30', '8:30', '08:30 AM', '8:30 AM'], explanation: 'Key collection is available at 08:30 AM sharp at the security office.', wordLimit: 2 }
      ]
    },
    {
      partNumber: 2,
      title: 'Part 2: Riverside Heritage Park & Botanical Nature Reserve',
      description: 'An orientation talk given by Clara Hughes (Senior Park Ranger) to visitors and new volunteer guides.',
      audioScript: `International English Language Testing System. Listening Practice Simulation.
Section 2. You will hear an orientation talk given by Clara Hughes, Senior Park Ranger, to a group of visitors and new volunteer guides at the grand reopening of the Riverside Heritage Park and Botanical Reserve.
First, you have some time to look at questions 11 to 15.
Now listen carefully and answer questions 11 to 15.

Ranger Clara: "Good morning, everyone, and a warm welcome to the Riverside Heritage Park and Botanical Reserve! My name is Clara Hughes, and I am the Senior Park Ranger overseeing our ecological restoration project. Following an extensive eighteen-month conservation initiative funded by the National Heritage Lottery Fund and municipal environmental grants, we are absolutely thrilled to welcome members of the public back to our seventy-hectare reserve.

Before we embark on our guided walking tour along the riverbank, I would like to orient you using the park map displayed on your screens and printed on page three of your welcome brochures. If you look at the bottom left corner of the layout, you will see our main public entrance, marked as West Arch. Immediately after passing through West Arch, if you take the cobblestone path leading north, you will see Building A on your left—that is our Visitor Information Center, where you can pick up trail guides, purchase trail maps, and reserve high-power optical binoculars for bird watching along the river.

Moving along the central gravel avenue past the grand stone fountain, directly adjacent to the water basin at Point B, stands the newly renovated Riverside Cafe Terrace, offering organic refreshments and homemade light lunches produced by local regional farms. 

Now, for families visiting with young children, if you turn right at the central fountain and follow the timber boardwalk leading behind the Heritage Apple Orchard, tucked safely away from the deep water of the main riverbank, you will find Building C—our Children's Discovery Play Area, featuring interactive timber climbing structures, water-play channels, and bio-inspired sensory gardens.

If you continue along the main river path heading northeast toward the quiet wetlands, situated beside the North Marsh Pond at Point D, you will discover the Wildlife Observation Hide. This wooden structure features sound-dampened viewing slots and camouflage screening designed specifically for observing wintering waterfowl, nesting swans, and rare kingfishers without disturbing their delicate natural habitat.

Finally, along the far eastern perimeter fence at Point F, adjoining the native woodland trail, lies our Native Tree Nursery, where our botanical team cultivates indigenous oak, alder, hazel, and rowan saplings for regional reforestation and habitat restoration projects across the county."

Now look at questions 16 to 20.
Listen carefully and answer questions 16 to 20.

Ranger Clara: "Now, I would like to outline a few practical details regarding park access, ticketing, transportation, and our volunteer conservation stewardship programs. 

General admission to the main park grounds and woodland trails remains completely free for all members of the public throughout the year. However, for entry to our specialized tropical glasshouses and guided canopy walkway tours, standard adult day passes cost £8. I am delighted to announce that local senior citizens and university students qualify for our discounted rate of £5 upon presenting valid identification or student cards at the ticket desk.

Regarding seasonal park opening hours: during the spring and summer months, the perimeter gates remain open until 20:00 in the evening. However, during autumn, starting from the first of October, the main gates close strictly at 18:00 (6:00 PM) to protect nocturnal wildlife and ensure visitor safety along unlit riverbank paths.

For visitors arriving by private motor vehicle: while our primary West Arch car park comfortably accommodates weekday visitor traffic, weekend visitors are strictly required to park in the South Overflow Car Park, located just two hundred meters south of the main entrance along Meadow Lane.

Finally, for those interested in joining our volunteer stewardship program: we run two regular working sessions every month. Our Tree Planting and Woodland Care team meets on Saturdays only from 09:30 to 12:30. Volunteers assist with sapling protection and invasive species clearance. Conversely, our Stream Water Quality Monitoring team, which conducts ecological sampling and macro-invertebrate counts along the river, operates on the first Sunday of each month. Full training, equipment, and protective footwear are provided for all registered volunteers.

Should you wish to sign up for either stewardship team, please speak with my colleague Tom at the Information Center desk at the conclusion of our tour. Thank you very much for your attention today, and I hope you enjoy your visit to Riverside Heritage Park!"

That is the end of Section 2. You now have half a minute to check your answers.`,
      dialogue: [
        { speaker: 'Ranger Clara', speakerId: 'speaker_05', gender: 'female', text: 'Good morning, everyone, and a warm welcome to the Riverside Heritage Park and Botanical Reserve! My name is Clara Hughes, and I am the Senior Park Ranger overseeing our ecological restoration project. Following an extensive eighteen-month conservation initiative, we are thrilled to welcome members of the public back to our seventy-hectare reserve.', pauseAfterMs: 500 },
        { speaker: 'Ranger Clara', speakerId: 'speaker_05', gender: 'female', text: 'If you look at the bottom left corner, marked as West Arch: immediately after passing through West Arch, Building A on your left is our Visitor Information Center. Directly adjacent to the fountain basin at Point B stands the newly renovated Riverside Cafe Terrace. Behind the orchard, Building C is our Children’s Discovery Play Area.', pauseAfterMs: 500 },
        { speaker: 'Ranger Clara', speakerId: 'speaker_05', gender: 'female', text: 'Situated beside North Marsh Pond at Point D, you will discover the Wildlife Observation Hide. Finally, at Point F along the far eastern perimeter fence lies our Native Tree Nursery.', pauseAfterMs: 500 },
        { speaker: 'Ranger Clara', speakerId: 'speaker_05', gender: 'female', text: 'Entry to our glasshouses costs £8, but local senior citizens and university students qualify for our discounted £5 rate. During autumn, main gates close strictly at 18:00 (6:00 PM). Weekend visitors must park in the South Overflow Car Park.', pauseAfterMs: 500 },
        { speaker: 'Ranger Clara', speakerId: 'speaker_05', gender: 'female', text: 'Our Tree Planting and Woodland Care team meets on Saturdays only, while the Stream Water Quality Monitoring team operates on the first Sunday of each month.', pauseAfterMs: 500 }
      ],
      questions: [
        { id: 'c18-a-t1-l-q11', questionNumber: 11, partOrSection: 2, type: 'matching', prompt: 'Building A (near West Arch entrance):', options: ['A) Visitor Information Center', 'B) Riverside Cafe Terrace', "C) Children's Play Area", 'D) Wildlife Observation Hide'], correctAnswer: 'A', acceptableAnswers: ['A', 'A) Visitor Information Center', 'Visitor Information Center'], explanation: 'Building A immediately after West Arch is the Visitor Information Center.' },
        { id: 'c18-a-t1-l-q12', questionNumber: 12, partOrSection: 2, type: 'matching', prompt: 'Point D (beside North Marsh Pond):', options: ['A) Native Tree Nursery', 'B) Visitor Information Center', 'C) Wildlife Observation Hide', "D) Children's Play Area"], correctAnswer: 'C', acceptableAnswers: ['C', 'C) Wildlife Observation Hide', 'Wildlife Observation Hide'], explanation: 'Point D situated beside North Marsh Pond is the Wildlife Observation Hide.' },
        { id: 'c18-a-t1-l-q13', questionNumber: 13, partOrSection: 2, type: 'matching', prompt: 'Point F (along East Boundary fence):', options: ['A) Native Tree Nursery', 'B) Riverside Cafe Terrace', 'C) Heritage Orchard', 'D) Visitor Center'], correctAnswer: 'A', acceptableAnswers: ['A', 'A) Native Tree Nursery', 'Native Tree Nursery'], explanation: 'Point F along the far eastern boundary is the Native Tree Nursery.' },
        { id: 'c18-a-t1-l-q14', questionNumber: 14, partOrSection: 2, type: 'matching', prompt: 'Point B (adjacent to Central Fountain):', options: ["A) Children's Discovery Play Area", 'B) Riverside Cafe Terrace', 'C) Wildlife Observation Hide', 'D) West Arch Archway'], correctAnswer: 'B', acceptableAnswers: ['B', 'B) Riverside Cafe Terrace', 'Riverside Cafe Terrace'], explanation: 'Point B directly adjacent to the fountain basin is the Riverside Cafe Terrace.' },
        { id: 'c18-a-t1-l-q15', questionNumber: 15, partOrSection: 2, type: 'matching', prompt: 'Building C (behind Heritage Orchard):', options: ['A) Visitor Information Center', "B) Children's Discovery Play Area", 'C) Native Tree Nursery', 'D) Wildlife Hide'], correctAnswer: 'B', acceptableAnswers: ['B', "B) Children's Discovery Play Area", "Children's Discovery Play Area"], explanation: "Building C tucked behind the orchard is the Children's Discovery Play Area." },
        { id: 'c18-a-t1-l-q16', questionNumber: 16, partOrSection: 2, type: 'multiple_choice', prompt: 'Which visitor group qualifies for discounted £5 park passes?', options: ['A) School children under 12', 'B) Local senior citizens and university students', 'C) Registered military veterans'], correctAnswer: 'B', acceptableAnswers: ['B', 'B) Local senior citizens and university students'], explanation: 'Ranger Clara announces that local senior citizens and university students qualify for the £5 rate.' },
        { id: 'c18-a-t1-l-q17', questionNumber: 17, partOrSection: 2, type: 'multiple_choice', prompt: 'What time do the park gates close during autumn months (from 1st October)?', options: ['A) 17:00 (5:00 PM)', 'B) 19:30 (7:30 PM)', 'C) 18:00 (6:00 PM)'], correctAnswer: 'C', acceptableAnswers: ['C', 'C) 18:00 (6:00 PM)', '18:00'], explanation: 'During autumn starting 1st October, main gates close strictly at 18:00 (6:00 PM).' },
        { id: 'c18-a-t1-l-q18', questionNumber: 18, partOrSection: 2, type: 'multiple_choice', prompt: 'Where must weekend visitors park their private vehicles?', options: ['A) In the South Overflow Car Park', 'B) Along West Arch Cobblestone Avenue', 'C) At the Town Center Multistory'], correctAnswer: 'A', acceptableAnswers: ['A', 'A) In the South Overflow Car Park', 'South Overflow Car Park'], explanation: 'Ranger Clara clarifies that weekend visitors are strictly required to use the South Overflow Car Park.' },
        { id: 'c18-a-t1-l-q19', questionNumber: 19, partOrSection: 2, type: 'matching', prompt: 'Volunteer Activity: Tree Planting & Woodland Care', options: ['A) First Sunday of each month', 'B) Alternate Wednesdays', 'C) Saturdays only'], correctAnswer: 'C', acceptableAnswers: ['C', 'C) Saturdays only', 'Saturdays only'], explanation: 'The Tree Planting team meets on Saturdays only from 09:30 to 12:30.' },
        { id: 'c18-a-t1-l-q20', questionNumber: 20, partOrSection: 2, type: 'matching', prompt: 'Volunteer Activity: Stream Water Quality Monitoring', options: ['A) First Sunday of each month', 'B) Every Friday afternoon', 'C) Saturdays only'], correctAnswer: 'A', acceptableAnswers: ['A', 'A) First Sunday of each month', 'First Sunday of each month'], explanation: 'The Stream Water Quality team operates on the first Sunday of each month.' }
      ]
    },
    {
      partNumber: 3,
      title: 'Part 3: Academic Seminar on Sustainable Urban Micro-Grids',
      description: 'A university tutorial discussion between Dr. Arthur Pendelton (Senior Lecturer) and postgraduate students Hannah and Marcus.',
      audioScript: `International English Language Testing System. Listening Practice Simulation.
Section 3. You will hear a university tutorial discussion between a senior lecturer in renewable energy engineering, Dr. Arthur Pendelton, and two postgraduate energy systems students, Hannah and Marcus, reviewing their collaborative research project on urban micro-grids.
First, you have some time to look at questions 21 to 25.
Now listen carefully and answer questions 21 to 25.

Dr. Pendelton: "Good afternoon, Hannah, Marcus. Please come in and take a seat. Today we need to review your progress on the collaborative research paper regarding sustainable urban micro-grids before your presentation at the upcoming faculty symposium. To begin, Hannah, how would you summarize the core thermodynamic and economic advantage of decentralized micro-grids compared to conventional national power grids?"

Hannah: "Well, Dr. Pendelton, the most compelling finding in our literature review is the dramatic reduction in transmission and distribution losses. In traditional centralized grids, electricity generated at distant coal, gas, or nuclear power stations travels over hundreds of kilometers of high-voltage transmission lines, losing up to eight percent of total generated power as dissipated heat before reaching end consumers. Micro-grids generate electricity locally using rooftop solar arrays, small wind turbines, or ground-source heat pumps right where the energy is consumed, virtually eliminating long-distance transmission losses in high-density urban districts."

Dr. Pendelton: "An excellent synthesis, Hannah. And Marcus, what about the energy storage infrastructure? In your draft section on utility-scale battery technology, you raised several critical engineering reservations."

Marcus: "Yes, Dr. Pendelton. While lithium-ion battery banks provide essential frequency stabilization, voltage regulation, and grid buffering during peak demand periods, their overall environmental footprint cannot be ignored. The initial capital expenditure remains exorbitantly high for municipal utility providers. Furthermore, current industrial recycling infrastructure for end-of-life lithium and cobalt cells is still severely underdeveloped across Western Europe, creating a major secondary hazardous waste dilemma for local authorities."

Dr. Pendelton: "A very astute observation. Now, regarding your practical empirical case study: you originally proposed evaluating a residential suburb in Munich. However, following our last tutorial discussion, I strongly suggested focusing your empirical analysis on the Hamburg HafenCity commercial redevelopment project."

Hannah: "We reviewed the Hamburg dataset thoroughly last night, Dr. Pendelton, and we completely agree with your recommendation! HafenCity's smart micro-grid integrates real-time demand-response algorithms across thirty commercial buildings, providing much richer and more granular operational data than the Munich residential site."

Marcus: "Though we did notice one intriguing anomaly in the Hamburg winter dataset: during December and January, electrical power output from their building-integrated solar facades dropped by forty-five percent—far more than baseline solar irradiance models predicted."

Hannah: "Right! When we examined the architectural elevation schematics, we discovered that dense clusters of adjacent high-rise commercial towers cast extensive shadows across the solar facade panels during low-angle winter sun hours."

Dr. Pendelton: "Precisely! Architectural shading in high-density urban canyons is a classic design trap in solar building integration. Now, how do you intend to divide the presentation responsibilities for next week's faculty symposium?"

Hannah: "We decided that I will present the quantitative engineering data, empirical efficiency figures, and computational load simulations, while Marcus presents the municipal regulatory frameworks, policy interconnect standards, and financial payback models."

Now look at questions 26 to 30.
Listen carefully and answer questions 26 to 30.

Dr. Pendelton: "That sounds like a very logical and balanced division of labor. Now let us finalize the specific task assignments for completing the final manuscript before Friday's submission deadline. We have five remaining key tasks: the regulatory literature review, the computational load simulation, the municipal engineer interviews, the executive summary draft, and formatting the technical appendices. Who is taking lead on each?"

Marcus: "I have already completed the preliminary analysis for the regulatory literature review on national grid interconnect standards and feed-in tariff policies, so I will take full responsibility for writing that section."

Hannah: "And I am currently running the final Python script for the computational load simulation models and peak demand curve calculations, so I will draft that computational section and generate the statistical charts."

Dr. Pendelton: "Excellent. What about the qualitative field research—specifically interviewing the municipal grid engineers from the Hamburg Energy Bureau?"

Marcus: "Since both of us prepared the interview questionnaire together during our field trip, we agreed that we should conduct the remaining follow-up video interviews jointly and co-author that evaluation section."

Hannah: "Yes, that way neither of us misses key technical nuances during the discussions. As for drafting the overarching executive summary, since I synthesised the core empirical findings in our original abstract, I am happy to author the executive summary text."

Marcus: "Which leaves me with formatting the technical appendices, mathematical proof tables, and schematics to ensure full compliance with the engineering journal's publication style guide."

Dr. Pendelton: "Splendid! It sounds like you have structured your collaboration efficiently. I look forward to reviewing your full manuscript draft on Thursday afternoon. Good luck!"

Hannah & Marcus: "Thank you very much for your guidance, Dr. Pendelton!"

That is the end of Section 3. You now have half a minute to check your answers.`,
      dialogue: [
        { speaker: 'Dr. Pendelton', speakerId: 'speaker_03', gender: 'male', text: 'Good afternoon, Hannah, Marcus. Please come in and take a seat. Today we need to review your progress on the collaborative research paper regarding sustainable urban micro-grids before your presentation at the upcoming faculty symposium.', pauseAfterMs: 450 },
        { speaker: 'Hannah', speakerId: 'speaker_02', gender: 'female', text: 'Well, Dr. Pendelton, the most compelling finding in our literature review is the dramatic reduction in transmission and distribution losses. Micro-grids generate electricity locally, virtually eliminating long-distance losses.', pauseAfterMs: 450 },
        { speaker: 'Marcus', speakerId: 'speaker_01', gender: 'male', text: 'Regarding battery storage, high initial capital expenditure remains a hurdle, and industrial recycling infrastructure for end-of-life lithium cells is severely underdeveloped.', pauseAfterMs: 450 },
        { speaker: 'Hannah', speakerId: 'speaker_02', gender: 'female', text: 'We focused on the Hamburg HafenCity commercial redevelopment project. Shading from adjacent high-rise commercial towers caused a forty-five percent solar drop in winter.', pauseAfterMs: 450 },
        { speaker: 'Marcus', speakerId: 'speaker_01', gender: 'male', text: 'For our symposium division: Hannah will present quantitative engineering data while I present municipal regulatory frameworks and financial payback models.', pauseAfterMs: 450 }
      ],
      questions: [
        { id: 'c18-a-t1-l-q21', questionNumber: 21, partOrSection: 3, type: 'multiple_choice', prompt: 'What primary advantage of urban micro-grids does Hannah highlight?', options: ['A) Reduced reliance on lithium battery banks', 'B) Lower transmission and distribution energy losses', 'C) Cheaper initial installation costs'], correctAnswer: 'B', acceptableAnswers: ['B', 'B) Lower transmission and distribution energy losses'], explanation: 'Hannah emphasizes that local power generation virtually eliminates long-distance transmission losses.' },
        { id: 'c18-a-t1-l-q22', questionNumber: 22, partOrSection: 3, type: 'multiple_choice', prompt: 'What concern does Marcus raise regarding battery storage infrastructure?', options: ['A) High capital costs and recycling challenges', 'B) Excessive thermal heat generation', 'C) Short battery cell lifespans'], correctAnswer: 'A', acceptableAnswers: ['A', 'A) High capital costs and recycling challenges'], explanation: 'Marcus notes high initial capital expenditure and underdeveloped industrial recycling infrastructure.' },
        { id: 'c18-a-t1-l-q23', questionNumber: 23, partOrSection: 3, type: 'multiple_choice', prompt: 'Dr. Pendelton advises the students to focus their empirical case study on:', options: ['A) A residential suburb in Munich', 'B) A solar farm in Bavaria', 'C) The Hamburg HafenCity commercial redevelopment'], correctAnswer: 'C', acceptableAnswers: ['C', 'C) The Hamburg HafenCity commercial redevelopment'], explanation: 'Dr. Pendelton strongly recommends focusing analysis on the Hamburg HafenCity project.' },
        { id: 'c18-a-t1-l-q24', questionNumber: 24, partOrSection: 3, type: 'multiple_choice', prompt: 'What caused the 45% solar output drop in the Hamburg winter dataset?', options: ['A) Snow accumulation on solar panels', 'B) Shading from adjacent high-rise commercial towers', 'C) Electrical inverter malfunctions'], correctAnswer: 'B', acceptableAnswers: ['B', 'B) Shading from adjacent high-rise commercial towers'], explanation: 'Hannah explains that dense clusters of high-rise commercial towers cast extensive shadows during low winter sun hours.' },
        { id: 'c18-a-t1-l-q25', questionNumber: 25, partOrSection: 3, type: 'multiple_choice', prompt: 'How will Hannah and Marcus divide their upcoming symposium presentation?', options: ['A) Hannah presents technical data; Marcus covers policy and finance', 'B) Marcus presents computational models; Hannah covers regulatory history', 'C) Both students will present all slides jointly'], correctAnswer: 'A', acceptableAnswers: ['A', 'A) Hannah presents technical data; Marcus covers policy and finance'], explanation: 'Hannah presents quantitative engineering data while Marcus covers municipal regulatory frameworks.' },
        { id: 'c18-a-t1-l-q26', questionNumber: 26, partOrSection: 3, type: 'matching', prompt: 'Task Assignment: Regulatory Literature Review', options: ['A) Hannah', 'B) Marcus', 'C) Both Hannah and Marcus'], correctAnswer: 'B', acceptableAnswers: ['B', 'B) Marcus', 'Marcus'], explanation: 'Marcus states he has completed preliminary notes and takes full responsibility for the literature review.' },
        { id: 'c18-a-t1-l-q27', questionNumber: 27, partOrSection: 3, type: 'matching', prompt: 'Task Assignment: Computational Load Simulation Models', options: ['A) Hannah', 'B) Marcus', 'C) Both Hannah and Marcus'], correctAnswer: 'A', acceptableAnswers: ['A', 'A) Hannah', 'Hannah'], explanation: 'Hannah is running the Python script for the computational load simulation models.' },
        { id: 'c18-a-t1-l-q28', questionNumber: 28, partOrSection: 3, type: 'matching', prompt: 'Task Assignment: Interviewing Municipal Grid Engineers', options: ['A) Hannah', 'B) Marcus', 'C) Both Hannah and Marcus'], correctAnswer: 'C', acceptableAnswers: ['C', 'C) Both Hannah and Marcus', 'Both Hannah and Marcus'], explanation: 'Marcus and Hannah agree to conduct follow-up video interviews jointly.' },
        { id: 'c18-a-t1-l-q29', questionNumber: 29, partOrSection: 3, type: 'matching', prompt: 'Task Assignment: Drafting Executive Summary', options: ['A) Hannah', 'B) Marcus', 'C) Both Hannah and Marcus'], correctAnswer: 'A', acceptableAnswers: ['A', 'A) Hannah', 'Hannah'], explanation: 'Hannah synthesised the core empirical findings and authors the executive summary.' },
        { id: 'c18-a-t1-l-q30', questionNumber: 30, partOrSection: 3, type: 'matching', prompt: 'Task Assignment: Formatting Technical Appendices & Schematics', options: ['A) Hannah', 'B) Marcus', 'C) Both Hannah and Marcus'], correctAnswer: 'B', acceptableAnswers: ['B', 'B) Marcus', 'Marcus'], explanation: 'Marcus handles formatting technical appendices, mathematical proof tables, and schematics.' }
      ]
    },
    {
      partNumber: 4,
      title: 'Part 4: University Lecture on Biomimetic Materials & Marine Bio-Fouling',
      description: 'An academic lecture given by Professor Alistair Vance (Department of Materials Science) on biomimetic anti-fouling coatings.',
      audioScript: `International English Language Testing System. Listening Practice Simulation.
Section 4. You will hear an academic lecture given by Professor Alistair Vance from the Department of Materials Science and Marine Bio-Engineering on biomimetic anti-fouling coatings.
First, you have some time to look at questions 31 to 40.
Now listen carefully and answer questions 31 to 40.

Professor Vance: "Good morning, ladies and gentlemen. Welcome to today's lecture on advanced biomimetic materials. Today, we shall explore how nature-inspired surface engineering is solving one of maritime transportation's most persistent, expensive, and ecologically damaging dilemmas: marine bio-fouling.

Bio-fouling refers to the undesirable accumulation and colonization of marine microorganisms, micro-algae, barnacles, mussels, and tubeworms on artificial submerged structures—most notably commercial ship hulls. When a cargo vessel's hull becomes encrusted with marine biological growth, hydrodynamic drag increases dramatically. Empirical fluid dynamics studies demonstrate that severe bio-fouling can increase vessel fuel consumption by up to thirty percent, generating millions of tons of unnecessary greenhouse gas emissions annually and costing the global maritime shipping industry over thirty billion dollars in extra fuel and mechanical maintenance costs every single year.

Historically, maritime operators countered bio-fouling by painting ship hulls with toxic biocidal coatings. Throughout the mid-twentieth century, heavy industrial paints containing organotin compounds, tributyltin, and toxic copper oxide additives were universally deployed across commercial fleets. While highly effective at poisoning marine larvae before they could adhere, these toxic chemical compounds leached continuously into ocean waters, causing catastrophic endocrine disruption, shell deformation, and reproductive failure in oysters, mollusks, and coastal marine food chains. Consequently, international maritime conventions banned tributyltin globally and strictly restricted copper biocides, compelling materials scientists to engineer eco-friendly physical alternatives.

This brings us to the fascinating field of biomimetic surface engineering—specifically, studying marine organisms that naturally remain pristine and free of bio-fouling despite living in organism-dense ocean waters. 

Consider the fast-swimming pelagic shark. Unlike slow-moving sea turtles, whales, or manatees, which are frequently heavily encrusted with barnacles, shark skin remains impeccably clean and free of biological growth. When examined under high-resolution electron microscopes, shark skin is not smooth; rather, it is covered by millions of microscopic tooth-like structures termed dermal denticles. These tiny denticles feature longitudinal micro-grooves separated by microscopic riblets ranging from ten to eighty micrometers in width. 

This precise micro-topography disrupts the hydrodynamic boundary layer of water flowing over the skin, creating localized vortex micro-turbulence that makes it physically impossible for free-swimming barnacle cyprid larvae, algal spores, or bacterial colonies to establish a permanent attachment. Crucially, this bio-defense mechanism relies entirely on physical topography rather than chemical toxicity.

Inspired by this physiological phenomenon, materials engineers fabricated synthetic silicone elastomers embedded with microscopic riblet patterns modeled on dermal denticles. In rigorous laboratory flume trials, these micro-textured biomimetic surfaces reduced bacterial settlement by almost eighty-five percent and completely prevented barnacle adhesion without releasing a single toxic chemical molecule into the surrounding aquatic environment.

However, translating these laboratory successes to commercial supertankers presents significant engineering challenges. The chief hurdle remains long-term durability. Commercial cargo ships remain at sea for up to five years between dry-dock maintenance overhauls. Standard synthetic micro-textures exposed to turbulent ocean waves, floating debris, and harbor friction gradually suffer mechanical abrasion, smoothing out the microscopic riblets and diminishing their anti-fouling efficacy over time.

To overcome mechanical wear, researchers are currently combining shark-skin micro-textures with super-hydrophobic surface chemistry inspired by the lotus leaf. The lotus leaf achieves self-cleaning properties through a dual-scale hierarchy of microscopic bumps coated in hydrophobic wax crystals, causing water droplets to roll off smoothly while sweeping away surface dust and organic contaminants.

Beyond maritime shipping, these non-toxic anti-fouling surfaces are finding transformative commercial applications in medical engineering. Hospital equipment, urinary catheter tubes, and surgical instrument surfaces engineered with biomimetic micro-textures are currently undergoing clinical trials, demonstrating a remarkable ability to suppress bacterial biofilm formation without relying on heavy antibiotic chemical sterilization.

In conclusion, as international environmental regulations tighten, biomimetic surface engineering represents the future of sustainable material science: delivering non-toxic, highly effective, and environmentally harmonious solutions modeled on millions of years of evolutionary refinement.

Thank you very much for your attention today. In our next lecture, we shall examine self-healing bio-concrete materials."

That is the end of Section 4. You now have one minute to check your answers to the complete Listening Examination.`,
      dialogue: [
        { speaker: 'Professor Vance', speakerId: 'speaker_04', gender: 'male', text: 'Good morning, ladies and gentlemen. Today we explore how nature-inspired surface engineering is solving marine bio-fouling on commercial ship hulls. Severe bio-fouling increases vessel fuel consumption by up to thirty percent.', pauseAfterMs: 550 },
        { speaker: 'Professor Vance', speakerId: 'speaker_04', gender: 'male', text: 'Historically, paints contained toxic organotin compounds and copper oxide additives. Biomimetic surface engineering looks to nature—specifically shark skin, which is covered by millions of microscopic dermal denticles.', pauseAfterMs: 550 },
        { speaker: 'Professor Vance', speakerId: 'speaker_04', gender: 'male', text: 'In laboratory flume trials, silicone micro-textured surfaces reduced bacterial settlement by almost eighty-five percent without chemical toxicity. However, the chief hurdle for commercial cargo fleets remains long-term durability.', pauseAfterMs: 550 },
        { speaker: 'Professor Vance', speakerId: 'speaker_04', gender: 'male', text: 'Super-hydrophobic surface chemistry inspired by the lotus leaf provides self-cleaning properties. Furthermore, hospital equipment and surgical instrument surfaces engineered with these micro-textures are currently undergoing clinical trials.', pauseAfterMs: 600 }
      ],
      questions: [
        { id: 'c18-a-t1-l-q31', questionNumber: 31, partOrSection: 4, type: 'note_completion', prompt: 'Severe bio-fouling on commercial ship hulls increases fuel consumption by up to:', correctAnswer: '30%', acceptableAnswers: ['30%', '30 PERCENT', 'THIRTY PERCENT', '30 percent'], explanation: 'Professor Vance states empirical studies show bio-fouling increases fuel consumption by up to 30%.', wordLimit: 2 },
        { id: 'c18-a-t1-l-q32', questionNumber: 32, partOrSection: 4, type: 'note_completion', prompt: 'Traditional toxic biocidal coatings contained organotin compounds and:', correctAnswer: 'COPPER', acceptableAnswers: ['COPPER', 'copper', 'COPPER OXIDE'], explanation: 'Mid-twentieth century industrial paints contained organotin compounds and toxic copper oxide additives.', wordLimit: 2 },
        { id: 'c18-a-t1-l-q33', questionNumber: 33, partOrSection: 4, type: 'note_completion', prompt: 'Shark skin is covered by millions of microscopic tooth-like structures called dermal:', correctAnswer: 'DENTICLES', acceptableAnswers: ['DENTICLES', 'denticles'], explanation: 'Shark skin features microscopic tooth-like structures termed dermal denticles.', wordLimit: 2 },
        { id: 'c18-a-t1-l-q34', questionNumber: 34, partOrSection: 4, type: 'note_completion', prompt: 'Microscopic surface riblets prevent marine larvae from forming a permanent:', correctAnswer: 'ATTACHMENT', acceptableAnswers: ['ATTACHMENT', 'attachment'], explanation: 'Micro-topography makes it impossible for barnacle larvae to establish a permanent attachment.', wordLimit: 2 },
        { id: 'c18-a-t1-l-q35', questionNumber: 35, partOrSection: 4, type: 'note_completion', prompt: 'Unlike chemical additives, biomimetic surfaces rely purely on physical:', correctAnswer: 'TOPOGRAPHY', acceptableAnswers: ['TOPOGRAPHY', 'topography'], explanation: 'Biomimetic mechanisms rely entirely on physical topography rather than chemical toxicity.', wordLimit: 2 },
        { id: 'c18-a-t1-l-q36', questionNumber: 36, partOrSection: 4, type: 'note_completion', prompt: 'Laboratory flume trials demonstrated a bacteria settlement reduction of almost:', correctAnswer: '85%', acceptableAnswers: ['85%', '85 PERCENT', 'EIGHTY FIVE PERCENT', '85 percent'], explanation: 'Laboratory flume trials reduced bacterial settlement by almost 85%.', wordLimit: 2 },
        { id: 'c18-a-t1-l-q37', questionNumber: 37, partOrSection: 4, type: 'note_completion', prompt: 'The chief engineering challenge for commercial ship deployment remains long-term:', correctAnswer: 'DURABILITY', acceptableAnswers: ['DURABILITY', 'durability'], explanation: 'The chief hurdle for commercial supertanker deployment remains long-term durability.', wordLimit: 2 },
        { id: 'c18-a-t1-l-q38', questionNumber: 38, partOrSection: 4, type: 'multiple_choice', prompt: 'Which natural organism inspired the super-hydrophobic self-cleaning surface chemistry?', options: ['A) Marine sponge spicules', 'B) Lotus leaf microstructure', 'C) Gecko toe pads'], correctAnswer: 'B', acceptableAnswers: ['B', 'B) Lotus leaf microstructure', 'Lotus leaf'], explanation: 'Super-hydrophobic self-cleaning surface chemistry is inspired by the lotus leaf.' },
        { id: 'c18-a-t1-l-q39', questionNumber: 39, partOrSection: 4, type: 'multiple_choice', prompt: 'What additional commercial application is currently undergoing clinical trials?', options: ['A) Food packaging films', 'B) Water desalination membranes', 'C) Hospital equipment and surgical surfaces'], correctAnswer: 'C', acceptableAnswers: ['C', 'C) Hospital equipment and surgical surfaces', 'Hospital equipment'], explanation: 'Hospital equipment and surgical instrument surfaces are currently undergoing clinical trials.' },
        { id: 'c18-a-t1-l-q40', questionNumber: 40, partOrSection: 4, type: 'multiple_choice', prompt: 'The lecturer concludes that future biomimetic anti-fouling technologies will be:', options: ['A) Completely non-toxic and environmentally harmonious', 'B) Restricted exclusively to military submarines', 'C) More expensive than fossil fuels'], correctAnswer: 'A', acceptableAnswers: ['A', 'A) Completely non-toxic and environmentally harmonious'], explanation: 'Professor Vance concludes that biomimetic surface engineering delivers non-toxic, eco-harmonious solutions.' }
      ]
    }
  ]
};

/**
 * Generates an IELTS-style 4-part Listening simulation module (40 questions)
 * Deterministically parameterized by (volume, edition, testNumber) so every test across
 * Volumes 11–21 (Academic & General Training, Tests 1–4) has unique dialogues, scripts, and Q1–Q40 items.
 */
export function generateListeningModule(
  volume: SprintVolumeNumber,
  edition: SprintEdition,
  testNumber: SprintTestNumber
): SprintListeningContent {
  if (volume === 18 && edition === 'Academic' && testNumber === 1) {
    return SPRINT_18_ACADEMIC_TEST_1_LISTENING;
  }

  const meta = VOLUME_THEMES[volume] || VOLUME_THEMES[18];
  const testIdPrefix = `c${volume}-${edition === 'Academic' ? 'a' : 'gt'}-t${testNumber}-l`;
  const seed = Math.max(0, (volume - 11) * 8 + (edition === 'Academic' ? 0 : 4) + (testNumber - 1));

  // Part 1 parameterized data pools
  const surnames = [
    'HAWTHORNE', 'PEMBERTON', 'CAVENDISH', 'THORNTON', 'WHITAKER', 'KENSINGTON',
    'BLACKWOOD', 'LANGLEY', 'MONTGOMERY', 'TREVELYAN', 'ASHWORTH', 'HARGREAVES'
  ];
  const phones = [
    '07941882035', '07812449106', '07753910482', '07904628193', '07865331940', '07729504816',
    '07930118574', '07849762031', '07781205943', '07956834120', '07823907415', '07764192850'
  ];
  const rooms = [
    'standard en-suite', 'deluxe studio', 'executive twin', 'premier balcony',
    'garden pavilion', 'superior loft', 'courtyard single', 'scholar suite'
  ];
  const times = ['09:30', '10:15', '08:45', '11:00', '14:30', '09:15', '10:45', '13:30'];
  const deposits = ['150', '180', '220', '125', '250', '175', '200', '140', '165', '195'];
  const transports = [
    'metro station', 'ferry terminal', 'central tramway', 'express bus hub',
    'railway concourse', 'shuttle stop', 'harbour pier', 'parkway station'
  ];
  const desks = ['security', 'reception', 'concierge', 'admissions', 'registry', 'information'];
  const noticeDays = ['3', '5', '7', '4', '2', '6'];
  const zones = ['C', 'B', 'D', 'A', 'E', 'F'];

  const p1Surname = surnames[seed % surnames.length];
  const p1Spelled = p1Surname.split('').join('-');
  const p1Phone = phones[seed % phones.length];
  const p1PhoneSpoken = `${p1Phone.slice(0, 5)} ${p1Phone.slice(5)}`;
  const p1Room = rooms[seed % rooms.length];
  const p1Time = times[seed % times.length];
  const p1Deposit = deposits[seed % deposits.length];
  const p1Transport = transports[seed % transports.length];
  const p1Desk = desks[seed % desks.length];
  const p1Days = noticeDays[seed % noticeDays.length];
  const p1Zone = zones[seed % zones.length];
  const p1DocOptionIdx = seed % 3; // 0 -> A, 1 -> B, 2 -> C
  const p1DocLetter = ['A', 'B', 'C'][p1DocOptionIdx];
  const p1DocSpoken = ['validated Student Card', 'valid Passport or National ID', 'official Sponsor Letter'][p1DocOptionIdx];

  // Part 2 parameterized data pools
  const facilities = [
    {
      wing: 'Botanical Glasshouse Wing',
      feature: 'climate-controlled glass atrium',
      featureLetter: 'A',
      mezzanineRoom: 'multimedia archive',
      thursdayHour: '8',
      audioChannel: '4',
      cafeLocation: 'west terrace',
      lockerFee: '2',
      groupLimit: '15',
      reopenMonth: 'October',
      assemblyPoint: 'north courtyard'
    },
    {
      wing: 'Maritime Heritage Pavilion',
      feature: 'suspended acoustic dome',
      featureLetter: 'B',
      mezzanineRoom: 'cartography studio',
      thursdayHour: '9',
      audioChannel: '6',
      cafeLocation: 'harbour deck',
      lockerFee: '3',
      groupLimit: '20',
      reopenMonth: 'November',
      assemblyPoint: 'clocktower square'
    },
    {
      wing: 'Contemporary Sculpture Rotunda',
      feature: 'panoramic skylight gallery',
      featureLetter: 'C',
      mezzanineRoom: 'restoration workshop',
      thursdayHour: '7',
      audioChannel: '3',
      cafeLocation: 'sculpture garden',
      lockerFee: '5',
      groupLimit: '12',
      reopenMonth: 'September',
      assemblyPoint: 'fountain plaza'
    },
    {
      wing: 'Planetarium Science Annex',
      feature: 'climate-controlled glass atrium',
      featureLetter: 'A',
      mezzanineRoom: 'telemetry gallery',
      thursdayHour: '9',
      audioChannel: '5',
      cafeLocation: 'solar conservatory',
      lockerFee: '4',
      groupLimit: '18',
      reopenMonth: 'August',
      assemblyPoint: 'observatory lawn'
    }
  ];
  const p2 = facilities[(seed + testNumber) % facilities.length];

  // Part 3 parameterized data pools
  const seminars = [
    {
      filterReasonLetter: 'A',
      filterReasonText: 'eliminated extraneous high-frequency noise',
      driftFactorLetter: 'B',
      driftFactorText: 'nocturnal relative humidity fluctuations',
      sampleStrategyLetter: 'C',
      sampleStrategyText: 'stratified coastal transect intervals',
      archiveSourceLetter: 'A',
      archiveSourceText: 'digitized meteorological station logs',
      chartFormatLetter: 'B',
      chartFormatText: 'logarithmic spectral density plots',
      hours: '48',
      sampleCount: '120',
      presentationMins: '15',
      deadlineDay: 'Friday',
      controlLocation: 'estuary'
    },
    {
      filterReasonLetter: 'B',
      filterReasonText: 'reduced telemetry packet transmission latency',
      driftFactorLetter: 'A',
      driftFactorText: 'thermal expansion of the sensor housing',
      sampleStrategyLetter: 'B',
      sampleStrategyText: 'randomized grid quadrant sampling',
      archiveSourceLetter: 'C',
      archiveSourceText: 'satellite oceanography repository records',
      chartFormatLetter: 'A',
      chartFormatText: 'multivariate regression heatmaps',
      hours: '72',
      sampleCount: '240',
      presentationMins: '20',
      deadlineDay: 'Wednesday',
      controlLocation: 'valley'
    },
    {
      filterReasonLetter: 'C',
      filterReasonText: 'preserved transient micro-barometer spikes',
      driftFactorLetter: 'C',
      driftFactorText: 'electromagnetic interference from nearby turbines',
      sampleStrategyLetter: 'A',
      sampleStrategyText: 'continuous automated hourly logging',
      archiveSourceLetter: 'B',
      archiveSourceText: 'municipal hydrological survey bulletins',
      chartFormatLetter: 'C',
      chartFormatText: 'cumulative frequency histograms',
      hours: '36',
      sampleCount: '180',
      presentationMins: '12',
      deadlineDay: 'Thursday',
      controlLocation: 'plateau'
    },
    {
      filterReasonLetter: 'A',
      filterReasonText: 'eliminated extraneous high-frequency noise',
      driftFactorLetter: 'B',
      driftFactorText: 'nocturnal relative humidity fluctuations',
      sampleStrategyLetter: 'A',
      sampleStrategyText: 'continuous automated hourly logging',
      archiveSourceLetter: 'C',
      archiveSourceText: 'satellite oceanography repository records',
      chartFormatLetter: 'B',
      chartFormatText: 'logarithmic spectral density plots',
      hours: '60',
      sampleCount: '150',
      presentationMins: '18',
      deadlineDay: 'Monday',
      controlLocation: 'reservoir'
    }
  ];
  const p3 = seminars[(seed + volume) % seminars.length];

  // Part 4 parameterized data pools
  const lectures = [
    {
      domain: 'Closed-Loop Industrial Ecology',
      q31: 'take-make-waste',
      q32: 'hydrolysis',
      q33: 'energy',
      q34: 'emissions',
      q35: 'salt',
      q36: '3',
      q37: 'effluent',
      q38: 'eco',
      q39: '2030',
      q40: 'infrastructure'
    },
    {
      domain: 'Urban Microclimate & Bioclimatic Architecture',
      q31: 'heat-island',
      q32: 'ventilation',
      q33: 'concrete',
      q34: 'humidity',
      q35: 'rain',
      q36: '5',
      q37: 'drainage',
      q38: 'solar',
      q39: '2035',
      q40: 'zoning'
    },
    {
      domain: 'Deep-Ocean Hydrothermal Geochemistry',
      q31: 'tectonic-rift',
      q32: 'chemosynthesis',
      q33: 'pressure',
      q34: 'methane',
      q35: 'acidic',
      q36: '4',
      q37: 'sediment',
      q38: 'thermal',
      q39: '2028',
      q40: 'submersibles'
    },
    {
      domain: 'Grid-Scale Cryogenic Energy Storage',
      q31: 'peak-demand',
      q32: 'liquefaction',
      q33: 'insulation',
      q34: 'nitrogen',
      q35: 'ambient',
      q36: '6',
      q37: 'turbine',
      q38: 'grid',
      q39: '2032',
      q40: 'pipelines'
    }
  ];
  const p4 = lectures[(seed + testNumber * 2) % lectures.length];

  const p1Dialogue = [
    { speaker: 'Coordinator (Davies)', speakerId: 'speaker_04', gender: 'male' as const, text: `Good morning. Central Registration and Information Service for Volume ${volume} Test ${testNumber}, Arthur Davies speaking. How may I direct your enquiry?`, pauseAfterMs: 400 },
    { speaker: 'Applicant (Elena)', speakerId: 'speaker_05', gender: 'female' as const, text: `Hello, good morning Mr. Davies. I am calling to finalize my registration for the ${meta.listeningTopic}. My surname is ${p1Surname}, spelled ${p1Spelled}.`, pauseAfterMs: 450 },
    { speaker: 'Coordinator (Davies)', speakerId: 'speaker_04', gender: 'male' as const, text: `Thank you, Ms. ${p1Surname.charAt(0) + p1Surname.slice(1).toLowerCase()}. Could you please confirm your active daytime telephone contact number?`, pauseAfterMs: 400 },
    { speaker: 'Applicant (Elena)', speakerId: 'speaker_05', gender: 'female' as const, text: `Yes, of course. My daytime contact number is ${p1PhoneSpoken}. That is ${p1PhoneSpoken}.`, pauseAfterMs: 450 },
    { speaker: 'Coordinator (Davies)', speakerId: 'speaker_04', gender: 'male' as const, text: `And what is your preferred residential accommodation tier?`, pauseAfterMs: 400 },
    { speaker: 'Applicant (Elena)', speakerId: 'speaker_05', gender: 'female' as const, text: `I would definitely prefer the ${p1Room} room with high-speed internet.`, pauseAfterMs: 450 },
    { speaker: 'Coordinator (Davies)', speakerId: 'speaker_04', gender: 'male' as const, text: `Very good. The arrival orientation begins promptly at ${p1Time} in the Central Atrium. Please note that an initial deposit payment of ${p1Deposit} pounds is required upon arrival.`, pauseAfterMs: 450 },
    { speaker: 'Applicant (Elena)', speakerId: 'speaker_05', gender: 'female' as const, text: `Understood, ${p1Deposit} pounds deposit. And what is the nearest public transport link to the facility?`, pauseAfterMs: 400 },
    { speaker: 'Coordinator (Davies)', speakerId: 'speaker_04', gender: 'male' as const, text: `We are located just two hundred metres from the nearest ${p1Transport}. When you arrive, your access badge must be collected from the ${p1Desk} desk, and all attendees must present a ${p1DocSpoken} at check-in.`, pauseAfterMs: 500 },
    { speaker: 'Applicant (Elena)', speakerId: 'speaker_05', gender: 'female' as const, text: `Great. I also require vegetarian meals and a visitor parking permit.`, pauseAfterMs: 400 },
    { speaker: 'Coordinator (Davies)', speakerId: 'speaker_04', gender: 'male' as const, text: `Vegetarian and vegan meals must be requested ${p1Days} days in advance, and your visitor parking permit is valid exclusively in Zone ${p1Zone}.`, pauseAfterMs: 450 }
  ];

  const p2Dialogue = [
    { speaker: 'Guide (Charlotte)', speakerId: 'speaker_05', gender: 'female' as const, text: `Welcome everyone to the ${p2.wing}. Before we begin our guided walking tour, please note that our emergency assembly point is located in the ${p2.assemblyPoint}.`, pauseAfterMs: 450 },
    { speaker: 'Guide (Charlotte)', speakerId: 'speaker_05', gender: 'female' as const, text: `The newly reopened ${p2.wing} is distinguished by its ${p2.feature} located straight ahead, while the specialist ${p2.mezzanineRoom} lies to your left on the mezzanine level.`, pauseAfterMs: 500 },
    { speaker: 'Guide (Charlotte)', speakerId: 'speaker_05', gender: 'female' as const, text: `Please remember our updated visitor guidelines: on Thursdays, our extended evening opening hours continue until ${p2.thursdayHour} PM. If you are using a digital headset, switch to channel ${p2.audioChannel} for the curator commentary.`, pauseAfterMs: 500 },
    { speaker: 'Guide (Charlotte)', speakerId: 'speaker_05', gender: 'female' as const, text: `Refreshments are served at the café on the ${p2.cafeLocation}, and heavy backpacks may be stored in the ground-floor lockers for a refundable fee of ${p2.lockerFee} pounds.`, pauseAfterMs: 450 },
    { speaker: 'Guide (Charlotte)', speakerId: 'speaker_05', gender: 'female' as const, text: `For conservation safety, guided groups are restricted to a maximum of ${p2.groupLimit} visitors at a time, and the upper conservation gallery will reopen to the public in ${p2.reopenMonth}.`, pauseAfterMs: 500 }
  ];

  const p3Dialogue = [
    { speaker: 'Dr. Henderson', speakerId: 'speaker_03', gender: 'male' as const, text: `Good afternoon Marcus, Chloe. Let us examine your fieldwork methodology on ${meta.theme}. Why did your team select that signal processing filter?`, pauseAfterMs: 450 },
    { speaker: 'Chloe', speakerId: 'speaker_02', gender: 'female' as const, text: `We selected that specific filter because it ${p3.filterReasonText} across our entire telemetry stream.`, pauseAfterMs: 450 },
    { speaker: 'Marcus', speakerId: 'speaker_01', gender: 'male' as const, text: `However, during the overnight trials we noticed unexpected instrument drift caused by ${p3.driftFactorText}.`, pauseAfterMs: 450 },
    { speaker: 'Dr. Henderson', speakerId: 'speaker_03', gender: 'male' as const, text: `Interesting. And how did you structure your spatial field collection protocol?`, pauseAfterMs: 400 },
    { speaker: 'Chloe', speakerId: 'speaker_02', gender: 'female' as const, text: `We adopted ${p3.sampleStrategyText}, and we cross-referenced our measurements against ${p3.archiveSourceText}.`, pauseAfterMs: 450 },
    { speaker: 'Marcus', speakerId: 'speaker_01', gender: 'male' as const, text: `For the visual presentation, we decided to display the variance using ${p3.chartFormatText}. In total, we monitored baseline sensor stability over a period of ${p3.hours} hours and analysed ${p3.sampleCount} discrete field samples.`, pauseAfterMs: 500 },
    { speaker: 'Dr. Henderson', speakerId: 'speaker_03', gender: 'male' as const, text: `Please remember that your seminar presentation is strictly limited to ${p3.presentationMins} minutes, and your revised methodology draft must be uploaded by ${p3.deadlineDay} after you verify the control readings at the ${p3.controlLocation}.`, pauseAfterMs: 500 }
  ];

  const p4Dialogue = [
    { speaker: 'Prof. Evans', speakerId: 'speaker_04', gender: 'male' as const, text: `Good morning. In today's university lecture on ${p4.domain}, we examine how modern systemic engineering addresses resource efficiency across ${meta.theme}.`, pauseAfterMs: 550 },
    { speaker: 'Prof. Evans', speakerId: 'speaker_04', gender: 'male' as const, text: `Conventional twentieth-century frameworks were dominated by a ${p4.q31} pattern. By contrast, next-generation facilities rely on controlled ${p4.q32} to stabilize output.`, pauseAfterMs: 550 },
    { speaker: 'Prof. Evans', speakerId: 'speaker_04', gender: 'male' as const, text: `Historically, the principal engineering bottleneck was excessive ${p4.q33} loss. However, empirical audits now confirm a substantial reduction in atmospheric ${p4.q34}, while secondary by-products neutralize safely under ${p4.q35} conditions.`, pauseAfterMs: 550 },
    { speaker: 'Prof. Evans', speakerId: 'speaker_04', gender: 'male' as const, text: `Notably, the northern demonstration plant achieved full cost recovery within ${p4.q36} years after regional authorities enforced strict regulations on ${p4.q37} management. Industry surveys also show strong demand for ${p4.q38} certified systems, with projected international standardization by the year ${p4.q39}, although the chief barrier to rapid deployment remains specialized ${p4.q40}.`, pauseAfterMs: 600 }
  ];

  const part2Items: Array<{ prompt: string; ans: string; accept: string[]; type: string; options?: string[] }> = [
    {
      prompt: `What architectural feature distinguishes the newly reopened ${p2.wing}?`,
      ans: p2.featureLetter,
      accept: [p2.featureLetter, p2.feature],
      type: 'multiple_choice',
      options: [
        'A) Climate-controlled glass atrium',
        'B) Suspended acoustic dome',
        'C) Panoramic skylight gallery'
      ]
    },
    {
      prompt: 'Emergency assembly point location: the [12]',
      ans: p2.assemblyPoint,
      accept: [p2.assemblyPoint, p2.assemblyPoint.toLowerCase()],
      type: 'note_completion'
    },
    {
      prompt: 'Specialist room situated on the mezzanine level: the [13]',
      ans: p2.mezzanineRoom,
      accept: [p2.mezzanineRoom, p2.mezzanineRoom.toLowerCase()],
      type: 'note_completion'
    },
    {
      prompt: 'Extended Thursday evening opening hours continue until [14] PM.',
      ans: p2.thursdayHour,
      accept: [p2.thursdayHour, `${p2.thursdayHour}:00`, `${p2.thursdayHour} pm`],
      type: 'note_completion'
    },
    {
      prompt: 'Digital headset channel for curator commentary: Channel [15]',
      ans: p2.audioChannel,
      accept: [p2.audioChannel],
      type: 'note_completion'
    },
    {
      prompt: 'Visitor café location within the complex: the [16]',
      ans: p2.cafeLocation,
      accept: [p2.cafeLocation, p2.cafeLocation.toLowerCase()],
      type: 'note_completion'
    },
    {
      prompt: 'Refundable fee for ground-floor storage lockers: £[17]',
      ans: p2.lockerFee,
      accept: [p2.lockerFee, `£${p2.lockerFee}`],
      type: 'note_completion'
    },
    {
      prompt: 'Maximum number of visitors permitted per guided group: [18]',
      ans: p2.groupLimit,
      accept: [p2.groupLimit],
      type: 'note_completion'
    },
    {
      prompt: 'Month when the upper conservation gallery reopens: [19]',
      ans: p2.reopenMonth,
      accept: [p2.reopenMonth, p2.reopenMonth.toLowerCase()],
      type: 'note_completion'
    },
    {
      prompt: 'Which wing is the primary focus of today’s guided orientation tour?',
      ans: p2.wing,
      accept: [p2.wing, p2.wing.toLowerCase()],
      type: 'note_completion'
    }
  ];

  const part3Items: Array<{ prompt: string; ans: string; accept: string[]; type: string; options?: string[] }> = [
    {
      prompt: 'Why did the research team select their signal processing filter?',
      ans: p3.filterReasonLetter,
      accept: [p3.filterReasonLetter, p3.filterReasonText],
      type: 'multiple_choice',
      options: [
        'A) It eliminated extraneous high-frequency noise',
        'B) It reduced telemetry packet transmission latency',
        'C) It preserved transient micro-barometer spikes'
      ]
    },
    {
      prompt: 'What caused the unexpected instrument drift during overnight trials?',
      ans: p3.driftFactorLetter,
      accept: [p3.driftFactorLetter, p3.driftFactorText],
      type: 'multiple_choice',
      options: [
        'A) Thermal expansion of the sensor housing',
        'B) Nocturnal relative humidity fluctuations',
        'C) Electromagnetic interference from nearby turbines'
      ]
    },
    {
      prompt: 'Which spatial sampling protocol did Chloe and Marcus adopt?',
      ans: p3.sampleStrategyLetter,
      accept: [p3.sampleStrategyLetter, p3.sampleStrategyText],
      type: 'multiple_choice',
      options: [
        'A) Continuous automated hourly logging',
        'B) Randomized grid quadrant sampling',
        'C) Stratified coastal transect intervals'
      ]
    },
    {
      prompt: 'Which historical dataset was used to cross-reference the field measurements?',
      ans: p3.archiveSourceLetter,
      accept: [p3.archiveSourceLetter, p3.archiveSourceText],
      type: 'multiple_choice',
      options: [
        'A) Digitized meteorological station logs',
        'B) Municipal hydrological survey bulletins',
        'C) Satellite oceanography repository records'
      ]
    },
    {
      prompt: 'How will the team display variance in their seminar presentation?',
      ans: p3.chartFormatLetter,
      accept: [p3.chartFormatLetter, p3.chartFormatText],
      type: 'multiple_choice',
      options: [
        'A) Multivariate regression heatmaps',
        'B) Logarithmic spectral density plots',
        'C) Cumulative frequency histograms'
      ]
    },
    {
      prompt: 'The researchers monitored baseline sensor stability over a period of [26] hours.',
      ans: p3.hours,
      accept: [p3.hours, `${p3.hours} hours`],
      type: 'sentence_completion'
    },
    {
      prompt: 'The team analysed a total of [27] discrete field samples.',
      ans: p3.sampleCount,
      accept: [p3.sampleCount],
      type: 'sentence_completion'
    },
    {
      prompt: 'The seminar presentation is strictly limited to [28] minutes.',
      ans: p3.presentationMins,
      accept: [p3.presentationMins, `${p3.presentationMins} minutes`],
      type: 'sentence_completion'
    },
    {
      prompt: 'The revised methodology draft must be uploaded by [29].',
      ans: p3.deadlineDay,
      accept: [p3.deadlineDay, p3.deadlineDay.toLowerCase()],
      type: 'sentence_completion'
    },
    {
      prompt: 'Control readings must be verified at the [30] station.',
      ans: p3.controlLocation,
      accept: [p3.controlLocation, p3.controlLocation.toLowerCase()],
      type: 'sentence_completion'
    }
  ];

  return {
    title: `Practice ${volume} · ${edition} Test ${testNumber} Listening Examination`,
    contextDescription: `IELTS-style 4-part Listening practice simulation with 40 questions: Section 1 (${meta.listeningTopic}), Section 2 (${p2.wing}), Section 3 (${meta.theme} Seminar), Section 4 (${p4.domain}).`,
    parts: [
      // Part 1: Conversational Enquiry / Registration (Q1-Q10)
      {
        partNumber: 1,
        title: `Part 1: Candidate Registration & Service Booking`,
        description: `A telephone conversation between an intake coordinator and an applicant regarding ${meta.listeningTopic}.`,
        audioScript: p1Dialogue.map((d) => `${d.speaker}: "${d.text}"`).join('\n'),
        dialogue: p1Dialogue,
        questions: Array.from({ length: 10 }, (_, i) => {
          const qNum = i + 1;
          const prompts: Record<number, { prompt: string; ans: string; expl: string; type: string }> = {
            1: { prompt: 'Applicant Surname (spelled letter-by-letter):', ans: p1Surname, expl: `The applicant clearly spells ${p1Spelled}.`, type: 'note_completion' },
            2: { prompt: 'Active Contact Daytime Telephone Number:', ans: p1Phone, expl: `Applicant confirms active daytime mobile ${p1PhoneSpoken}.`, type: 'note_completion' },
            3: { prompt: 'Requested Room Accommodation Category: [3] room', ans: p1Room, expl: `Applicant requests a ${p1Room} room.`, type: 'note_completion' },
            4: { prompt: 'Orientation Meeting Scheduled Arrival Time:', ans: p1Time, expl: `Coordinator states orientation commences at ${p1Time}.`, type: 'note_completion' },
            5: { prompt: 'Initial deposit payment required upon arrival: £[5]', ans: p1Deposit, expl: `Registration requires a £${p1Deposit} security deposit.`, type: 'note_completion' },
            6: { prompt: 'Nearest public transport link to the facility:', ans: p1Transport, expl: `Facility is situated 200m from the nearest ${p1Transport}.`, type: 'note_completion' },
            7: { prompt: 'Access badge must be collected from the [7] desk.', ans: p1Desk, expl: `Badges are issued at the ${p1Desk} desk.`, type: 'note_completion' },
            8: { prompt: 'Which document must all attendees present at check-in?', ans: p1DocLetter, expl: `Attendees must present a ${p1DocSpoken} at check-in.`, type: 'multiple_choice' },
            9: { prompt: 'Vegetarian and vegan meals must be requested [9] days in advance.', ans: p1Days, expl: `Catering requires ${p1Days} days advance notice.`, type: 'note_completion' },
            10: { prompt: 'Parking permit is valid exclusively in Zone [10].', ans: p1Zone, expl: `Visitor parking is restricted to Zone ${p1Zone}.`, type: 'note_completion' }
          };
          const p = prompts[qNum];
          return {
            id: `${testIdPrefix}-q${qNum}`,
            questionNumber: qNum,
            partOrSection: 1,
            type: p.type,
            prompt: p.prompt,
            options: p.type === 'multiple_choice' ? ['A) Validated Student Card', 'B) Passport / National ID', 'C) Official Sponsor Letter'] : undefined,
            correctAnswer: p.ans,
            acceptableAnswers: [p.ans, p.ans.toLowerCase(), p.ans.toUpperCase()],
            explanation: p.expl,
            wordLimit: p.type === 'note_completion' ? 3 : undefined
          };
        })
      },

      // Part 2: Public Information Monologue / Map / Facility (Q11-Q20)
      {
        partNumber: 2,
        title: `Part 2: ${p2.wing} Tour & Visitor Guide`,
        description: `A guided orientation monologue outlining visitor facilities, safety routes, and operational hours at the ${p2.wing}.`,
        audioScript: p2Dialogue.map((d) => `${d.speaker}: "${d.text}"`).join('\n'),
        dialogue: p2Dialogue,
        questions: part2Items.map((item, i) => {
          const qNum = i + 11;
          return {
            id: `${testIdPrefix}-q${qNum}`,
            questionNumber: qNum,
            partOrSection: 2,
            type: item.type,
            prompt: item.prompt,
            options: item.options,
            correctAnswer: item.ans,
            acceptableAnswers: item.accept,
            explanation: `Confirmed by Guide Charlotte during the Part 2 orientation tour of the ${p2.wing}.`,
            wordLimit: 3
          };
        })
      },

      // Part 3: Academic Seminar / Tutorial Discussion (Q21-Q30)
      {
        partNumber: 3,
        title: `Part 3: University Research Seminar (${meta.theme})`,
        description: `An academic discussion between a course tutor (Dr. Henderson) and two postgraduate researchers (Marcus and Chloe).`,
        audioScript: p3Dialogue.map((d) => `${d.speaker}: "${d.text}"`).join('\n'),
        dialogue: p3Dialogue,
        questions: part3Items.map((item, i) => {
          const qNum = i + 21;
          return {
            id: `${testIdPrefix}-q${qNum}`,
            questionNumber: qNum,
            partOrSection: 3,
            type: item.type,
            prompt: item.prompt,
            options: item.options,
            correctAnswer: item.ans,
            acceptableAnswers: item.accept,
            explanation: `Discussed by Dr. Henderson, Chloe, and Marcus in the Part 3 academic seminar.`,
            wordLimit: 3
          };
        })
      },

      // Part 4: Academic Lecture (Q31-Q40)
      {
        partNumber: 4,
        title: `Part 4: Academic Lecture on ${p4.domain}`,
        description: `A formal academic lecture delivered by Professor Evans on ${p4.domain} (${meta.theme}).`,
        audioScript: p4Dialogue.map((d) => `${d.speaker}: "${d.text}"`).join('\n'),
        dialogue: p4Dialogue,
        questions: Array.from({ length: 10 }, (_, i) => {
          const qNum = i + 31;
          const lectureKeys: Record<number, { prompt: string; ans: string }> = {
            31: { prompt: `Conventional frameworks were dominated by a [31] pattern.`, ans: p4.q31 },
            32: { prompt: `Next-generation facilities rely on controlled [32] to stabilize output.`, ans: p4.q32 },
            33: { prompt: `The principal engineering bottleneck was excessive [33] loss.`, ans: p4.q33 },
            34: { prompt: `Empirical audits confirm a substantial reduction in atmospheric [34].`, ans: p4.q34 },
            35: { prompt: `Secondary by-products neutralize safely under [35] conditions.`, ans: p4.q35 },
            36: { prompt: `The northern demonstration plant achieved full cost recovery within [36] years.`, ans: p4.q36 },
            37: { prompt: `Regional authorities enforced strict regulations on [37] management.`, ans: p4.q37 },
            38: { prompt: `Industry surveys show strong demand for [38] certified systems.`, ans: p4.q38 },
            39: { prompt: `Projected international standardization is expected by the year [39].`, ans: p4.q39 },
            40: { prompt: `The chief barrier to rapid deployment remains specialized [40].`, ans: p4.q40 }
          };
          const item = lectureKeys[qNum];
          return {
            id: `${testIdPrefix}-q${qNum}`,
            questionNumber: qNum,
            partOrSection: 4,
            type: 'note_completion',
            prompt: item.prompt,
            correctAnswer: item.ans,
            acceptableAnswers: [item.ans, item.ans.toLowerCase(), item.ans.toUpperCase()],
            explanation: `Professor Evans states this finding in the Part 4 lecture on ${p4.domain}.`,
            wordLimit: 2
          };
        })
      }
    ]
  };
}

/**
 * Generates a complete 3-passage IELTS-style Reading simulation module (40 questions: Q1-13, Q14-26, Q27-40).
 * Every question has a unique statement/stem, valid option/answer format, passage location reference,
 * and deterministic grounding in the passage text.
 */
export function generateReadingModule(
  volume: SprintVolumeNumber,
  edition: SprintEdition,
  testNumber: SprintTestNumber
): SprintReadingContent {
  const meta = VOLUME_THEMES[volume] || VOLUME_THEMES[18];
  const testIdPrefix = `c${volume}-${edition === 'Academic' ? 'a' : 'gt'}-t${testNumber}-r`;
  const seed = Math.max(0, (volume - 11) * 8 + (edition === 'Academic' ? 0 : 4) + (testNumber - 1));

  // Parameterized Passage 1 variables
  const p1TempOpt = ['25', '24', '26', '23'][seed % 4];
  const p1Substrate = ['volcanic pumice', 'expanded slate', 'recycled basalt', 'calcined clay'][seed % 4];
  const p1Pollinator = ['wild bee', 'hoverfly', 'moth', 'butterfly'][(seed + 1) % 4];
  const p1Payback = ['4.8', '5.2', '4.5', '5.6'][seed % 4];
  const p1Runoff = ['stormwater', 'meltwater', 'greywater', 'surface'][(seed + 2) % 4];

  const passage1Text = `[Paragraph A] Across industrialized urban metropolises, impervious concrete and asphalt surfaces account for over 60 percent of geographic land coverage, precipitating severe surface heat retention commonly identified as the urban heat island effect. In response to rising municipal temperatures, urban planners researching ${meta.readingTopic1} have accelerated the deployment of extensive bio-solar roof ecosystems.\n\n[Paragraph B] Unlike conventional single-layer sedum roofs, bio-solar hybrid installations combine intensive vegetation layers with elevated photovoltaic solar arrays. The underlying biological mechanism is mutually synergistic: the natural transpiration of vegetative foliage cools the ambient microclimate around the solar panels to approximately ${p1TempOpt} degrees Celsius—the thermodynamic optimum for crystalline silicon solar cells. In multi-year trials conducted across five Northern European capitals, solar panels situated directly above biodiverse green roofs generated 8.3 percent greater electricity output compared to identical panels mounted on bare bitumen gravel.\n\n[Paragraph C] Crucially, the soil matrix deployed in bio-solar installations must balance moisture retention capacity against structural load-bearing limits. Modern substrate formulations utilize crushed porous ${p1Substrate} blended with composted organic pine bark, completely eschewing dense mineral clays that waterlog roof membranes.\n\n[Paragraph D] Beyond energetic efficiency, elevated urban micro-forests serve as indispensable ecological corridors for avian and insect migration. Entomological field surveys documented a 340 percent rise in native ${p1Pollinator} populations within two years of continuous bio-solar deployment across commercial districts.\n\n[Paragraph E] Financial amortisation periods for commercial rooftop retrofits have fallen from 14 years in 2012 to approximately ${p1Payback} years today, propelled by steep municipal ${p1Runoff} runoff discharge tariffs and targeted renewable energy tax credits.`;

  const passage1Questions: SprintQuestionItem[] = [
    {
      id: `${testIdPrefix}-q1`,
      questionNumber: 1,
      partOrSection: 1,
      type: 'true_false_not_given',
      prompt: 'Impervious concrete and asphalt surfaces cover less than 40 percent of land in industrialized cities.',
      options: ['TRUE', 'FALSE', 'NOT GIVEN'],
      correctAnswer: 'FALSE',
      acceptableAnswers: ['FALSE', 'false'],
      explanation: 'Paragraph A states that impervious concrete and asphalt surfaces account for over 60 percent of geographic land coverage, not less than 40 percent.',
      locationReference: 'Paragraph A'
    },
    {
      id: `${testIdPrefix}-q2`,
      questionNumber: 2,
      partOrSection: 1,
      type: 'true_false_not_given',
      prompt: `Crystalline silicon solar cells operate at their thermodynamic optimum at around ${p1TempOpt} degrees Celsius.`,
      options: ['TRUE', 'FALSE', 'NOT GIVEN'],
      correctAnswer: 'TRUE',
      acceptableAnswers: ['TRUE', 'true'],
      explanation: `Paragraph B explicitly notes that vegetative transpiration cools the microclimate to approximately ${p1TempOpt} degrees Celsius, the thermodynamic optimum for crystalline silicon solar cells.`,
      locationReference: 'Paragraph B'
    },
    {
      id: `${testIdPrefix}-q3`,
      questionNumber: 3,
      partOrSection: 1,
      type: 'true_false_not_given',
      prompt: 'Solar arrays mounted above biodiverse green roofs produced 8.3 percent more electricity than those on bare bitumen gravel.',
      options: ['TRUE', 'FALSE', 'NOT GIVEN'],
      correctAnswer: 'TRUE',
      acceptableAnswers: ['TRUE', 'true'],
      explanation: 'Paragraph B confirms that solar panels situated directly above biodiverse green roofs generated 8.3 percent greater electricity output.',
      locationReference: 'Paragraph B'
    },
    {
      id: `${testIdPrefix}-q4`,
      questionNumber: 4,
      partOrSection: 1,
      type: 'true_false_not_given',
      prompt: 'Private residential homeowners receive larger tax credits for bio-solar roofs than commercial corporations.',
      options: ['TRUE', 'FALSE', 'NOT GIVEN'],
      correctAnswer: 'NOT GIVEN',
      acceptableAnswers: ['NOT GIVEN', 'not given', 'NG'],
      explanation: 'Paragraph E mentions commercial rooftop retrofits and renewable energy tax credits, but makes no comparison with private residential homeowners.',
      locationReference: 'Paragraph E'
    },
    {
      id: `${testIdPrefix}-q5`,
      questionNumber: 5,
      partOrSection: 1,
      type: 'true_false_not_given',
      prompt: 'Dense mineral clays are routinely included in modern bio-solar roof soil substrates to increase weight.',
      options: ['TRUE', 'FALSE', 'NOT GIVEN'],
      correctAnswer: 'FALSE',
      acceptableAnswers: ['FALSE', 'false'],
      explanation: 'Paragraph C states that modern substrate formulations completely eschew dense mineral clays that waterlog roof membranes.',
      locationReference: 'Paragraph C'
    },
    {
      id: `${testIdPrefix}-q6`,
      questionNumber: 6,
      partOrSection: 1,
      type: 'true_false_not_given',
      prompt: `Field surveys recorded a 340 percent increase in native ${p1Pollinator} populations after two years of bio-solar installation.`,
      options: ['TRUE', 'FALSE', 'NOT GIVEN'],
      correctAnswer: 'TRUE',
      acceptableAnswers: ['TRUE', 'true'],
      explanation: `Paragraph D documents a 340 percent rise in native ${p1Pollinator} populations within two years of continuous deployment.`,
      locationReference: 'Paragraph D'
    },
    {
      id: `${testIdPrefix}-q7`,
      questionNumber: 7,
      partOrSection: 1,
      type: 'true_false_not_given',
      prompt: 'The amortisation period for commercial rooftop retrofits has increased steadily since 2012.',
      options: ['TRUE', 'FALSE', 'NOT GIVEN'],
      correctAnswer: 'FALSE',
      acceptableAnswers: ['FALSE', 'false'],
      explanation: `Paragraph E states that financial amortisation periods have fallen from 14 years in 2012 to approximately ${p1Payback} years today.`,
      locationReference: 'Paragraph E'
    },
    {
      id: `${testIdPrefix}-q8`,
      questionNumber: 8,
      partOrSection: 1,
      type: 'note_completion',
      prompt: 'Plant transpiration cools the microclimate around solar arrays to [8] degrees Celsius.',
      correctAnswer: p1TempOpt,
      acceptableAnswers: [p1TempOpt],
      explanation: `Paragraph B states that foliage cools the ambient microclimate to approximately ${p1TempOpt} degrees Celsius.`,
      wordLimit: 2,
      locationReference: 'Paragraph B'
    },
    {
      id: `${testIdPrefix}-q9`,
      questionNumber: 9,
      partOrSection: 1,
      type: 'note_completion',
      prompt: 'Heavy [9] are excluded from modern rooftop soil matrices to prevent membrane waterlogging.',
      correctAnswer: 'mineral clays',
      acceptableAnswers: ['mineral clays', 'clays'],
      explanation: 'Paragraph C notes that modern formulations completely eschew dense mineral clays.',
      wordLimit: 2,
      locationReference: 'Paragraph C'
    },
    {
      id: `${testIdPrefix}-q10`,
      questionNumber: 10,
      partOrSection: 1,
      type: 'note_completion',
      prompt: 'Lightweight rooftop substrates blend composted pine bark with crushed porous [10].',
      correctAnswer: p1Substrate,
      acceptableAnswers: [p1Substrate, p1Substrate.split(' ')[1] || p1Substrate],
      explanation: `Paragraph C specifies crushed porous ${p1Substrate} blended with composted organic pine bark.`,
      wordLimit: 2,
      locationReference: 'Paragraph C'
    },
    {
      id: `${testIdPrefix}-q11`,
      questionNumber: 11,
      partOrSection: 1,
      type: 'note_completion',
      prompt: 'Entomological surveys tracked a 340 percent surge in native [11] populations.',
      correctAnswer: p1Pollinator,
      acceptableAnswers: [p1Pollinator, `${p1Pollinator}s`],
      explanation: `Paragraph D highlights a 340 percent rise in native ${p1Pollinator} populations.`,
      wordLimit: 2,
      locationReference: 'Paragraph D'
    },
    {
      id: `${testIdPrefix}-q12`,
      questionNumber: 12,
      partOrSection: 1,
      type: 'note_completion',
      prompt: 'Commercial retrofit payback durations have dropped from 14 years down to [12] years.',
      correctAnswer: p1Payback,
      acceptableAnswers: [p1Payback],
      explanation: `Paragraph E states that amortisation periods have fallen to approximately ${p1Payback} years.`,
      wordLimit: 2,
      locationReference: 'Paragraph E'
    },
    {
      id: `${testIdPrefix}-q13`,
      questionNumber: 13,
      partOrSection: 1,
      type: 'note_completion',
      prompt: 'Commercial adoption has been accelerated by rising municipal [13] runoff discharge tariffs.',
      correctAnswer: p1Runoff,
      acceptableAnswers: [p1Runoff],
      explanation: `Paragraph E attributes faster payback to soaring municipal ${p1Runoff} runoff discharge tariffs.`,
      wordLimit: 2,
      locationReference: 'Paragraph E'
    }
  ];

  // Parameterized Passage 2 variables
  const p2ExpansionPct = ['60', '65', '55', '70'][seed % 4];
  const p2DeficitPct = ['40', '35', '45', '38'][(seed + 1) % 4];
  const p2Protein = ['beta-amyloid', 'alpha-synuclein', 'tau-peptide', 'neuro-fibril'][seed % 4];
  const p2BrainRegion = ['neocortex', 'cerebral cortex', 'temporal cortex', 'parietal cortex'][(seed + 2) % 4];

  const passage2Text = `[Paragraph A] Within the domain of ${meta.readingTopic2}, sleep was historically regarded as a metabolically passive state of biological dormancy. However, high-density electroencephalographic telemetry has unveiled that non-rapid eye movement (NREM) slow-wave sleep represents one of the brain's most energetically demanding intervals of neural synchronization.\n\n[Paragraph B] During deep slow-wave sleep, high-amplitude delta waves emanate synchronously from the prefrontal cortex, sweeping rearward toward the hippocampus. This electrophysiological rhythm orchestrates declarative memory consolidation: transient episodic traces encoded within the fragile hippocampal dentate gyrus are systematically transferred to the durable ${p2BrainRegion} for long-term semantic preservation.\n\n[Paragraph C] Concurrently, the cerebral glymphatic system—a specialized perivascular waste clearance pathway—expands its interstitial space by over ${p2ExpansionPct} percent during slow-wave sleep. Astrocytic aquaporin water channels pump cerebrospinal fluid through neural tissue, flushing out neurotoxic metabolic by-products, most notably ${p2Protein} plaques and phosphorylated tau proteins.\n\n[Paragraph D] Chronic disruption of slow-wave sleep correlates strongly with premature cognitive decline and impaired prefrontal executive function. In controlled sleep-restriction trials, healthy adult participants subjected to fragmented deep sleep demonstrated a ${p2DeficitPct} percent deficit in novel declarative memory retention after 24 hours.\n\n[Paragraph E] Pharmacological hypnotic sedatives, while widely prescribed for acute insomnia, unfortunately suppress natural delta wave oscillations, inducing behavioural unconsciousness without conferring genuine restorative sleep architecture. Consequently, clinical researchers increasingly recommend chronotherapeutic dawn light exposure and cognitive behavioural sleep hygiene interventions as the first-line standard of care.`;

  const passage2Questions: SprintQuestionItem[] = [
    {
      id: `${testIdPrefix}-q14`,
      questionNumber: 14,
      partOrSection: 2,
      type: 'matching',
      prompt: 'Which paragraph (A–E) contains information about the perivascular clearance of neurotoxic metabolic proteins via cerebrospinal fluid?',
      options: ['Paragraph A', 'Paragraph B', 'Paragraph C', 'Paragraph D', 'Paragraph E'],
      correctAnswer: 'C',
      acceptableAnswers: ['C', 'Paragraph C'],
      explanation: `Paragraph C describes how the cerebral glymphatic system pumps cerebrospinal fluid to flush out neurotoxic metabolic by-products including ${p2Protein}.`,
      locationReference: 'Paragraph C'
    },
    {
      id: `${testIdPrefix}-q15`,
      questionNumber: 15,
      partOrSection: 2,
      type: 'matching',
      prompt: 'Which paragraph (A–E) mentions the historical misconception that sleep is a metabolically passive state of dormancy?',
      options: ['Paragraph A', 'Paragraph B', 'Paragraph C', 'Paragraph D', 'Paragraph E'],
      correctAnswer: 'A',
      acceptableAnswers: ['A', 'Paragraph A'],
      explanation: 'Paragraph A opens by noting that sleep was historically regarded as a metabolically passive state of biological dormancy.',
      locationReference: 'Paragraph A'
    },
    {
      id: `${testIdPrefix}-q16`,
      questionNumber: 16,
      partOrSection: 2,
      type: 'matching',
      prompt: `Which paragraph (A–E) describes the transfer of transient episodic memories from the hippocampus to the ${p2BrainRegion}?`,
      options: ['Paragraph A', 'Paragraph B', 'Paragraph C', 'Paragraph D', 'Paragraph E'],
      correctAnswer: 'B',
      acceptableAnswers: ['B', 'Paragraph B'],
      explanation: `Paragraph B explains how delta waves orchestrate the transfer of episodic memories from the hippocampal dentate gyrus to the durable ${p2BrainRegion}.`,
      locationReference: 'Paragraph B'
    },
    {
      id: `${testIdPrefix}-q17`,
      questionNumber: 17,
      partOrSection: 2,
      type: 'matching',
      prompt: 'Which paragraph (A–E) reports quantitative findings from experimental trials on fragmented deep sleep and memory retention?',
      options: ['Paragraph A', 'Paragraph B', 'Paragraph C', 'Paragraph D', 'Paragraph E'],
      correctAnswer: 'D',
      acceptableAnswers: ['D', 'Paragraph D'],
      explanation: `Paragraph D details controlled sleep-restriction trials showing a ${p2DeficitPct} percent deficit in novel declarative memory retention.`,
      locationReference: 'Paragraph D'
    },
    {
      id: `${testIdPrefix}-q18`,
      questionNumber: 18,
      partOrSection: 2,
      type: 'matching',
      prompt: 'Which paragraph (A–E) contrasts prescription sleep medications with non-pharmacological chronotherapeutic interventions?',
      options: ['Paragraph A', 'Paragraph B', 'Paragraph C', 'Paragraph D', 'Paragraph E'],
      correctAnswer: 'E',
      acceptableAnswers: ['E', 'Paragraph E'],
      explanation: 'Paragraph E contrasts pharmacological hypnotic sedatives with chronotherapeutic dawn light exposure and behavioural sleep hygiene.',
      locationReference: 'Paragraph E'
    },
    {
      id: `${testIdPrefix}-q19`,
      questionNumber: 19,
      partOrSection: 2,
      type: 'sentence_completion',
      prompt: 'During slow-wave sleep, transient episodic memories are transferred from the hippocampus to the durable [19].',
      correctAnswer: p2BrainRegion,
      acceptableAnswers: [p2BrainRegion],
      explanation: `Paragraph B states that episodic traces are systematically transferred to the durable ${p2BrainRegion}.`,
      wordLimit: 2,
      locationReference: 'Paragraph B'
    },
    {
      id: `${testIdPrefix}-q20`,
      questionNumber: 20,
      partOrSection: 2,
      type: 'sentence_completion',
      prompt: 'The cerebral glymphatic system expands its interstitial volume by more than [20] percent during slow-wave sleep.',
      correctAnswer: p2ExpansionPct,
      acceptableAnswers: [p2ExpansionPct, `${p2ExpansionPct}%`, `${p2ExpansionPct} percent`],
      explanation: `Paragraph C states that the glymphatic system expands its interstitial space by over ${p2ExpansionPct} percent.`,
      wordLimit: 2,
      locationReference: 'Paragraph C'
    },
    {
      id: `${testIdPrefix}-q21`,
      questionNumber: 21,
      partOrSection: 2,
      type: 'sentence_completion',
      prompt: 'Astrocytic water channels flush out phosphorylated tau proteins and neurotoxic [21] plaques.',
      correctAnswer: p2Protein,
      acceptableAnswers: [p2Protein],
      explanation: `Paragraph C identifies ${p2Protein} plaques and phosphorylated tau proteins as key metabolic waste products cleared during deep sleep.`,
      wordLimit: 2,
      locationReference: 'Paragraph C'
    },
    {
      id: `${testIdPrefix}-q22`,
      questionNumber: 22,
      partOrSection: 2,
      type: 'sentence_completion',
      prompt: 'Participants exposed to fragmented deep sleep showed a [22] percent reduction in novel declarative memory retention.',
      correctAnswer: p2DeficitPct,
      acceptableAnswers: [p2DeficitPct, `${p2DeficitPct}%`, `${p2DeficitPct} percent`],
      explanation: `Paragraph D reports a ${p2DeficitPct} percent deficit in novel declarative memory retention after 24 hours.`,
      wordLimit: 2,
      locationReference: 'Paragraph D'
    },
    {
      id: `${testIdPrefix}-q23`,
      questionNumber: 23,
      partOrSection: 2,
      type: 'multiple_choice',
      prompt: 'What has electroencephalographic telemetry revealed about non-rapid eye movement (NREM) slow-wave sleep?',
      options: [
        'A) It is a completely inactive period of metabolic dormancy',
        'B) It is one of the brain’s most energetically demanding phases of neural synchronization',
        'C) It occurs exclusively in the brainstem rather than the prefrontal cortex',
        'D) It eliminates the need for hippocampal memory encoding during waking hours'
      ],
      correctAnswer: 'B',
      acceptableAnswers: ['B', 'B) It is one of the brain’s most energetically demanding phases of neural synchronization'],
      explanation: 'Paragraph A states that NREM slow-wave sleep represents one of the brain’s most energetically demanding intervals of neural synchronization.',
      locationReference: 'Paragraph A'
    },
    {
      id: `${testIdPrefix}-q24`,
      questionNumber: 24,
      partOrSection: 2,
      type: 'multiple_choice',
      prompt: 'From which brain region do high-amplitude delta waves originate during deep slow-wave sleep?',
      options: [
        'A) The prefrontal cortex',
        'B) The hippocampal dentate gyrus',
        'C) The astrocytic perivascular canal',
        'D) The optic chiasm'
      ],
      correctAnswer: 'A',
      acceptableAnswers: ['A', 'A) The prefrontal cortex', 'prefrontal cortex'],
      explanation: 'Paragraph B states that high-amplitude delta waves emanate synchronously from the prefrontal cortex, sweeping rearward toward the hippocampus.',
      locationReference: 'Paragraph B'
    },
    {
      id: `${testIdPrefix}-q25`,
      questionNumber: 25,
      partOrSection: 2,
      type: 'multiple_choice',
      prompt: 'What is the primary clinical drawback of pharmacological hypnotic sedatives according to Paragraph E?',
      options: [
        'A) They are prohibitively expensive for routine clinical prescription',
        'B) They suppress natural delta wave oscillations required for restorative sleep architecture',
        'C) They permanently damage astrocytic aquaporin water channels',
        'D) They accelerate interstitial fluid expansion beyond safe limits'
      ],
      correctAnswer: 'B',
      acceptableAnswers: ['B', 'B) They suppress natural delta wave oscillations required for restorative sleep architecture'],
      explanation: 'Paragraph E explains that pharmacological hypnotic sedatives suppress natural delta wave oscillations, inducing unconsciousness without genuine restorative architecture.',
      locationReference: 'Paragraph E'
    },
    {
      id: `${testIdPrefix}-q26`,
      questionNumber: 26,
      partOrSection: 2,
      type: 'multiple_choice',
      prompt: 'Which first-line clinical intervention is recommended by researchers in Paragraph E to restore natural sleep architecture?',
      options: [
        'A) High-dose synthetic hypnotic administration',
        'B) Daytime naps exceeding three hours',
        'C) Chronotherapeutic dawn light exposure and cognitive behavioural sleep hygiene',
        'D) Surgical decompression of perivascular pathways'
      ],
      correctAnswer: 'C',
      acceptableAnswers: ['C', 'C) Chronotherapeutic dawn light exposure and cognitive behavioural sleep hygiene'],
      explanation: 'Paragraph E states that clinical researchers recommend chronotherapeutic dawn light exposure and cognitive behavioural sleep hygiene interventions as the first-line standard of care.',
      locationReference: 'Paragraph E'
    }
  ];

  // Parameterized Passage 3 variables
  const p3PressureAtm = ['1,000', '1,100', '1,200', '950'][seed % 4];
  const p3BitrateKbps = ['10', '12', '8', '15'][(seed + 1) % 4];
  const p3SensorType = ['diamond magnetometer', 'quantum gravimeter', 'optical interferometer', 'proton magnetometer'][seed % 4];
  const p3Mineral = ['manganese nodules', 'cobalt crusts', 'sulfide deposits', 'silicate nodules'][(seed + 2) % 4];

  const passage3Text = `[Paragraph A] The abyssal plains and hadal ocean trenches constitute over 70 percent of our planet's benthic territory, yet less than a quarter of the global seabed has been bathymetrically mapped to high resolution. In studies of ${meta.readingTopic3}, researchers note that conventional acoustic multibeam sonar deployed from surface vessels historically suffered severe signal attenuation and refractive distortion as sound pulses traversed thermal thermoclines.\n\n[Paragraph B] The emergence of autonomous underwater gliders equipped with solid-state ${p3SensorType} arrays has fundamentally transformed marine geophysics. These microscopic sensors detect minute geomagnetic anomalies induced by tectonic subduction zones with picotesla sensitivity, operating unaffected by optical turbidity or intense hydrostatic pressures exceeding ${p3PressureAtm} atmospheres.\n\n[Paragraph C] By correlating deep geomagnetic crustal profiles with satellite radar altimetry measurements, computational oceanographers can now reconstruct abyssal thermal transport models with unprecedented fidelity. These predictive simulations elucidate how deep thermohaline conveyor currents modulate macro-scale atmospheric climate phenomena such as the El Niño–Southern Oscillation.\n\n[Paragraph D] Nevertheless, formidable subsea telemetry constraints endure. Deep oceanic communication cannot rely on electromagnetic radio frequencies, which attenuate within centimeters in conductive saline seawater. Because acoustic modems provide modest data transfer rates of under ${p3BitrateKbps} kilobits per second, autonomous gliders require onboard edge-computing processors capable of real-time data compression.\n\n[Paragraph E] Meanwhile, international legal frameworks governing benthic mineral exploration remain acutely contentious. While marine biologists urge a binding moratorium to protect fragile hydrothermal vent ecosystems, commercial mining consortia lobby the International Seabed Authority for extraction licenses targeting polymetallic ${p3Mineral}.\n\n[Paragraph F] Ultimately, safeguarding the ecological integrity of the deep ocean will require multilateral treaties that integrate precautionary scientific thresholds with transparent international oversight.`;

  const passage3Questions: SprintQuestionItem[] = [
    {
      id: `${testIdPrefix}-q27`,
      questionNumber: 27,
      partOrSection: 3,
      type: 'yes_no_not_given',
      prompt: 'More than half of the global seabed has already been bathymetrically mapped to high resolution.',
      options: ['YES', 'NO', 'NOT GIVEN'],
      correctAnswer: 'NO',
      acceptableAnswers: ['NO', 'no'],
      explanation: 'Paragraph A states that less than a quarter (under 25%, not more than half) of the global seabed has been bathymetrically mapped to high resolution.',
      locationReference: 'Paragraph A'
    },
    {
      id: `${testIdPrefix}-q28`,
      questionNumber: 28,
      partOrSection: 3,
      type: 'yes_no_not_given',
      prompt: 'Acoustic multibeam sonar signals from surface ships experience refractive distortion when passing through ocean thermoclines.',
      options: ['YES', 'NO', 'NOT GIVEN'],
      correctAnswer: 'YES',
      acceptableAnswers: ['YES', 'yes'],
      explanation: 'Paragraph A confirms that surface multibeam sonar suffered severe signal attenuation and refractive distortion as sound pulses traversed thermal thermoclines.',
      locationReference: 'Paragraph A'
    },
    {
      id: `${testIdPrefix}-q29`,
      questionNumber: 29,
      partOrSection: 3,
      type: 'yes_no_not_given',
      prompt: `Solid-state ${p3SensorType} arrays lose sensitivity when hydrostatic pressure exceeds ${p3PressureAtm} atmospheres.`,
      options: ['YES', 'NO', 'NOT GIVEN'],
      correctAnswer: 'NO',
      acceptableAnswers: ['NO', 'no'],
      explanation: `Paragraph B explicitly states that these sensors operate unaffected by optical turbidity or intense hydrostatic pressures exceeding ${p3PressureAtm} atmospheres.`,
      locationReference: 'Paragraph B'
    },
    {
      id: `${testIdPrefix}-q30`,
      questionNumber: 30,
      partOrSection: 3,
      type: 'yes_no_not_given',
      prompt: 'Autonomous underwater gliders are significantly cheaper to manufacture than geostationary radar satellites.',
      options: ['YES', 'NO', 'NOT GIVEN'],
      correctAnswer: 'NOT GIVEN',
      acceptableAnswers: ['NOT GIVEN', 'not given', 'NG'],
      explanation: 'Paragraphs B and C mention both autonomous underwater gliders and satellite radar altimetry, but never compare their manufacturing costs.',
      locationReference: 'Paragraph C'
    },
    {
      id: `${testIdPrefix}-q31`,
      questionNumber: 31,
      partOrSection: 3,
      type: 'yes_no_not_given',
      prompt: 'Electromagnetic radio waves can travel hundreds of kilometers through conductive saline seawater without attenuation.',
      options: ['YES', 'NO', 'NOT GIVEN'],
      correctAnswer: 'NO',
      acceptableAnswers: ['NO', 'no'],
      explanation: 'Paragraph D states that electromagnetic radio frequencies attenuate within centimeters in conductive saline seawater.',
      locationReference: 'Paragraph D'
    },
    {
      id: `${testIdPrefix}-q32`,
      questionNumber: 32,
      partOrSection: 3,
      type: 'yes_no_not_given',
      prompt: 'Marine biologists and commercial mining consortia hold conflicting views regarding deep-sea mineral extraction.',
      options: ['YES', 'NO', 'NOT GIVEN'],
      correctAnswer: 'YES',
      acceptableAnswers: ['YES', 'yes'],
      explanation: 'Paragraph E contrasts marine biologists urging a moratorium to protect hydrothermal vents with mining consortia lobbying for extraction licenses.',
      locationReference: 'Paragraph E'
    },
    {
      id: `${testIdPrefix}-q33`,
      questionNumber: 33,
      partOrSection: 3,
      type: 'sentence_completion',
      prompt: 'Autonomous underwater gliders detect geomagnetic anomalies using solid-state [33] arrays.',
      correctAnswer: p3SensorType,
      acceptableAnswers: [p3SensorType, p3SensorType.split(' ')[1] || p3SensorType],
      explanation: `Paragraph B notes that gliders are equipped with solid-state ${p3SensorType} arrays.`,
      wordLimit: 2,
      locationReference: 'Paragraph B'
    },
    {
      id: `${testIdPrefix}-q34`,
      questionNumber: 34,
      partOrSection: 3,
      type: 'sentence_completion',
      prompt: 'Deep-sea sensors continue functioning beneath hydrostatic pressures above [34] atmospheres.',
      correctAnswer: p3PressureAtm,
      acceptableAnswers: [p3PressureAtm, p3PressureAtm.replace(',', '')],
      explanation: `Paragraph B states that sensors operate unaffected by hydrostatic pressures exceeding ${p3PressureAtm} atmospheres.`,
      wordLimit: 2,
      locationReference: 'Paragraph B'
    },
    {
      id: `${testIdPrefix}-q35`,
      questionNumber: 35,
      partOrSection: 3,
      type: 'sentence_completion',
      prompt: 'Subsea acoustic modems achieve modest data transmission speeds below [35] kilobits per second.',
      correctAnswer: p3BitrateKbps,
      acceptableAnswers: [p3BitrateKbps],
      explanation: `Paragraph D states that acoustic modems provide modest data transfer rates of under ${p3BitrateKbps} kilobits per second.`,
      wordLimit: 2,
      locationReference: 'Paragraph D'
    },
    {
      id: `${testIdPrefix}-q36`,
      questionNumber: 36,
      partOrSection: 3,
      type: 'sentence_completion',
      prompt: 'Industrial mining consortia seek permits to harvest polymetallic [36] from the seabed.',
      correctAnswer: p3Mineral,
      acceptableAnswers: [p3Mineral, p3Mineral.split(' ')[0]],
      explanation: `Paragraph E states that mining consortia lobby for extraction licenses targeting polymetallic ${p3Mineral}.`,
      wordLimit: 2,
      locationReference: 'Paragraph E'
    },
    {
      id: `${testIdPrefix}-q37`,
      questionNumber: 37,
      partOrSection: 3,
      type: 'multiple_choice',
      prompt: 'Why did historical surface-vessel multibeam sonar struggle to map deep ocean trenches accurately?',
      options: [
        'A) Acoustic pulses suffered attenuation and refractive distortion across thermoclines',
        'B) Surface vessels were prohibited from entering international waters',
        'C) Sonar transducers could only operate in freshwater lakes',
        'D) Satellite altimetry blocked acoustic frequencies'
      ],
      correctAnswer: 'A',
      acceptableAnswers: ['A', 'A) Acoustic pulses suffered attenuation and refractive distortion across thermoclines'],
      explanation: 'Paragraph A explains that surface acoustic multibeam sonar suffered severe signal attenuation and refractive distortion across thermal thermoclines.',
      locationReference: 'Paragraph A'
    },
    {
      id: `${testIdPrefix}-q38`,
      questionNumber: 38,
      partOrSection: 3,
      type: 'multiple_choice',
      prompt: 'How do computational oceanographers reconstruct high-fidelity abyssal thermal transport models in Paragraph C?',
      options: [
        'A) By deploying deep-sea radio frequency towers',
        'B) By correlating geomagnetic crustal profiles with satellite radar altimetry measurements',
        'C) By measuring surface wind velocity from coastal lighthouses',
        'D) By harvesting polymetallic nodules from hydrothermal vents'
      ],
      correctAnswer: 'B',
      acceptableAnswers: ['B', 'B) By correlating geomagnetic crustal profiles with satellite radar altimetry measurements'],
      explanation: 'Paragraph C states that oceanographers correlate deep geomagnetic crustal profiles with satellite radar altimetry measurements.',
      locationReference: 'Paragraph C'
    },
    {
      id: `${testIdPrefix}-q39`,
      questionNumber: 39,
      partOrSection: 3,
      type: 'multiple_choice',
      prompt: 'Why must autonomous underwater gliders incorporate onboard edge-computing processors?',
      options: [
        'A) Because acoustic telemetry bandwidth is limited to under ' + p3BitrateKbps + ' kilobits per second',
        'B) Because solar panels operate efficiently on the abyssal plain',
        'C) Because international law bans data storage on surface vessels',
        'D) Because hydrostatic pressure accelerates radio wave propagation'
      ],
      correctAnswer: 'A',
      acceptableAnswers: ['A', `A) Because acoustic telemetry bandwidth is limited to under ${p3BitrateKbps} kilobits per second`],
      explanation: `Paragraph D explains that radio frequencies attenuate within centimeters and acoustic modems transfer under ${p3BitrateKbps} kbps, requiring onboard edge-computing compression.`,
      locationReference: 'Paragraph D'
    },
    {
      id: `${testIdPrefix}-q40`,
      questionNumber: 40,
      partOrSection: 3,
      type: 'multiple_choice',
      prompt: 'What does the writer conclude in Paragraph F is essential for protecting deep-sea ecosystems?',
      options: [
        'A) Expanding unregulated commercial seabed mining',
        'B) Replacing all autonomous gliders with manned submarines',
        'C) Multilateral treaties combining precautionary scientific thresholds with international oversight',
        'D) Abandoning satellite oceanography research entirely'
      ],
      correctAnswer: 'C',
      acceptableAnswers: ['C', 'C) Multilateral treaties combining precautionary scientific thresholds with international oversight'],
      explanation: 'Paragraph F concludes that safeguarding the deep ocean requires multilateral treaties integrating precautionary scientific thresholds with transparent international oversight.',
      locationReference: 'Paragraph F'
    }
  ];

  return {
    title: `Practice ${volume} · ${edition} Test ${testNumber} Reading Examination`,
    passages: [
      {
        passageNumber: 1,
        title: `Passage 1: ${meta.readingTopic1}`,
        subheading: 'An empirical evaluation of contemporary environmental engineering and urban biodiversity.',
        text: passage1Text,
        questions: passage1Questions
      },
      {
        passageNumber: 2,
        title: `Passage 2: ${meta.readingTopic2}`,
        subheading: 'Investigating neurobiological sleep architecture, synaptic pruning, and cognitive health.',
        text: passage2Text,
        questions: passage2Questions
      },
      {
        passageNumber: 3,
        title: `Passage 3: ${meta.readingTopic3}`,
        subheading: 'Technological frontiers in deep ocean sensing, subsea geophysics, and algorithmic modeling.',
        text: passage3Text,
        questions: passage3Questions
      }
    ]
  };
}

/**
 * Generates an IELTS-style Writing simulation module (Tasks 1 & 2)
 */
export function generateWritingModule(
  volume: SprintVolumeNumber,
  edition: SprintEdition,
  testNumber: SprintTestNumber
): SprintWritingContent {
  const meta = VOLUME_THEMES[volume] || VOLUME_THEMES[18];

  if (edition === 'Academic') {
    return {
      task1: {
        type: 'Academic Chart / Graph',
        prompt: `${meta.writingAcademicT1} Summarise the information by selecting and reporting the main features, and make comparisons where relevant. (Write at least 150 words).`,
        minimumWords: 150,
        chartDescription: `The graphic details data points spanning regional categories. Clear trendlines indicate significant proportional shifts between the base year and terminal year.`,
        bulletPoints: [
          'Identify overall trends and overarching macro-patterns',
          'Highlight key anomalies, intersections, and maximum values',
          'Avoid subjective speculation; report factual comparative metrics only'
        ],
        modelAnswer: `The provided graphic illustrates substantive shifts across the surveyed categories over the documented timeframe. Overall, category A demonstrated a marked upward trajectory, whilst category B experienced a moderate decline. Notably, total aggregate output peaked during the final documented year.`,
        examinerComments: `Band 9 criteria: Addresses all requirements of Task Achievement with an articulate overview; cohesive paragraphing with varied cohesive devices; high-accuracy sophisticated lexical choice.`
      },
      task2: {
        topic: meta.theme,
        prompt: `${meta.writingT2} Give reasons for your answer and include any relevant examples from your own knowledge or experience. (Write at least 250 words).`,
        minimumWords: 250,
        modelAnswer: `The rapid maturation of contemporary technological and societal paradigms has prompted intense debate regarding its overarching cultural ramifications. In this essay, I shall examine both perspectives before articulating why a nuanced, balanced regulatory synthesis is paramount.`,
        examinerComments: `Band 8.5–9.0 model structure: Clear introduction with explicit thesis statement, two well-developed body paragraphs with topic sentences and extended supporting logic, and a concise concluding synthesis.`
      }
    };
  }

  // General Training Writing
  return {
    task1: {
      type: 'General Training Letter',
      prompt: `${meta.writingGtT1} In your letter: explain the situation clearly, describe what problems occurred, and state what specific resolution you expect. (Write at least 150 words).`,
      minimumWords: 150,
      bulletPoints: [
        'Open with an appropriate formal salutation (e.g., Dear Sir or Madam,)',
        'Address all three bullet points thoroughly with realistic contextual details',
        'Adopt an assertive yet courteous and professional tone'
      ],
      modelAnswer: `Dear Sir or Madam,\n\nI am writing to formally express my concerns regarding the service provided during the recent event. The arrangements made fell significantly short of the promised standards.\n\nI look forward to your prompt response regarding compensation.\n\nYours faithfully,\nCandidate`,
      examinerComments: `Demonstrates precise register, natural tone, clear purpose, and comprehensive coverage of all prompt requirements.`
    },
    task2: {
      topic: meta.theme,
      prompt: `${meta.writingT2} Give reasons for your answer and include any relevant examples from your everyday observations or career experience. (Write at least 250 words).`,
      minimumWords: 250,
      modelAnswer: `In modern society, balancing work arrangements with broader community wellbeing represents a central priority. While some argue that personal autonomy must take precedence, I believe that institutional collective standards are equally essential.`,
      examinerComments: `Full Task Achievement with balanced argumentative analysis, varied sentence structures, and disciplined coherence.`
    }
  };
}

/**
 * Generates an IELTS-style Speaking simulation module (Parts 1, 2, 3)
 */
export function generateSpeakingModule(
  volume: SprintVolumeNumber,
  edition: SprintEdition,
  testNumber: SprintTestNumber
): SprintSpeakingContent {
  const meta = VOLUME_THEMES[volume] || VOLUME_THEMES[18];

  return {
    part1: {
      topic: meta.speakingTopic,
      questions: [
        {
          question: `Do you prefer living in a bustling urban environment or in a quieter rural area? Why?`,
          suggestedIdeas: ['Access to cultural venues & transit', 'Pace of life and air quality', 'Community connectivity'],
          band9Sample: `To be entirely honest, I find the dynamism of a metropolitan center invigorating. Having immediate proximity to world-class libraries and public transit corridors greatly enhances my productivity.`
        },
        {
          question: `How have technological devices altered the way you organize your daily work or studies?`,
          suggestedIdeas: ['Digital calendar synchronization', 'Cloud-based note archives', 'Automated reminders'],
          band9Sample: `They have fundamentally streamlined my daily workflow. Through cloud synchronization, I can instantly cross-reference academic articles and coordinate group research projects seamlessly.`
        },
        {
          question: `Do you think people spend enough time outdoors engaging with nature nowadays?`,
          suggestedIdeas: ['Sedentary screen time vs outdoor recreation', 'Mental rejuvenation in green spaces'],
          band9Sample: `Regrettably, modern professional life tends to tether people to indoor workstations. Immersing oneself in nature offers restorative psychological benefits that screens simply cannot replicate.`
        },
        {
          question: `What kind of hobbies or creative activities do you turn to when you need to unwind?`,
          suggestedIdeas: ['Playing musical instruments', 'Landscape photography', 'Long-distance running'],
          band9Sample: `I often engage in acoustic guitar fingerpicking. It requires intense manual focus which effectively clears mental clutter after a demanding day of research.`
        }
      ]
    },
    part2: {
      cueCardTopic: `Describe an innovative tool, technology, or initiative that you believe has improved everyday life.`,
      bulletPoints: [
        'What the innovation is and how you first learned about it',
        'How it functions in practical daily situations',
        'What specific advantages it offers compared to traditional methods',
        'And explain why you regard this innovation as particularly significant'
      ],
      followUpQuestion: `Do you think older generations find this technology straightforward to adopt?`,
      modelResponse: `I would like to speak about high-speed intercity electric rail networks coupled with contactless smart ticketing. I first encountered this system during an academic internship in Tokyo. Unlike fossil-fueled automotive transport, modern electric transit reduces atmospheric emissions exponentially while offering passengers reliable, punctual travel. It epitomizes how sustainable public infrastructure can elevate quality of life on a nationwide scale.`
    },
    part3: {
      theme: `Technological Evolution, Ethics, and Society`,
      questions: [
        {
          question: `How might automated machine intelligence change the nature of professional careers over the coming decades?`,
          sampleResponse: `I anticipate that routine analytical and clerical duties will increasingly be automated, compelling human professionals to pivot toward creative problem-solving, ethical oversight, and interpersonal diplomacy.`,
          keyCollocations: ['Paradigm shift', 'Creative problem-solving', 'Ethical oversight', 'Exponential velocity']
        },
        {
          question: `Should governments intervene to regulate technological monopolies, or should market forces dictate innovation?`,
          sampleResponse: `A laissez-faire approach risks entrenching anticompetitive barriers to entry. Judicious state regulation is vital to foster competition, protect individual privacy, and safeguard consumer welfare.`,
          keyCollocations: ['Anticompetitive barriers', 'Consumer welfare', 'Judicious state regulation']
        },
        {
          question: `In what ways can educational institutions better prepare students for an increasingly digital future?`,
          sampleResponse: `Rather than emphasizing rote memorization, schools should nurture algorithmic literacy, critical source evaluation, and adaptive cognitive resilience.`,
          keyCollocations: ['Critical source evaluation', 'Adaptive resilience', 'Algorithmic literacy']
        }
      ]
    }
  };
}

/**
 * Primary helper: Returns an IELTS-style practice simulation SprintTestSet for ANY volume, edition, and test number.
 */
export function getOrCreatePracticeTest(
  volume: SprintVolumeNumber,
  edition: SprintEdition,
  testNumber: SprintTestNumber
): SprintTestSet {
  const id = `practice-${volume}-${edition.toLowerCase().replace(/\s+/g, '-')}-test-${testNumber}`;
  const meta = VOLUME_THEMES[volume] || VOLUME_THEMES[18];

  return {
    id,
    volume,
    edition,
    testNumber,
    title: `Practice ${volume} · ${edition} Test ${testNumber}`,
    description: `IELTS-style ${edition} practice simulation for Volume ${volume} (${meta.theme}). Includes 40-question Listening simulation with multi-speaker audio, 3-passage Reading (40 questions), Tasks 1 & 2 Writing, and 3-part Speaking interview.`,
    provenance: 'original_practice',
    provenanceNote: `Original IELTS-style practice simulation created for BandSprint (Volume ${volume}: ${meta.theme}). Automated structural and rule-based evidence checks do not constitute human examiner validation or official Cambridge University Press & Assessment, British Council, or IDP calibration.`,
    version: 1,
    updatedAt: Date.now(),
    availableModules: ['listening', 'reading', 'writing', 'speaking'],
    listening: generateListeningModule(volume, edition, testNumber),
    reading: generateReadingModule(volume, edition, testNumber),
    writing: generateWritingModule(volume, edition, testNumber),
    speaking: generateSpeakingModule(volume, edition, testNumber)
  };
}
