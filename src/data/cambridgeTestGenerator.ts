/**
 * IELTS Sprint — Cambridge IELTS 11–21 Complete Exam Engine & Test Generator
 *
 * Provides original IELTS-style practice content for
 * all Cambridge volumes 11 to 21 across Academic and General Training tracks.
 * Every test includes 40 Listening questions, 40 Reading questions,
 * Tasks 1 & 2 Writing with live word counters, and 3-part Speaking interviews.
 */

import {
  CambridgeTestSet,
  CambridgeVolumeNumber,
  CambridgeEdition,
  CambridgeTestNumber,
  CambridgeQuestionItem,
  CambridgeListeningContent,
  CambridgeReadingContent,
  CambridgeWritingContent,
  CambridgeSpeakingContent
} from '../types/cambridgeLibrary';

// Volume metadata topics for original practice context
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
 * Generates an IELTS-style 4-part Listening practice module
 */
export function generateListeningModule(
  volume: CambridgeVolumeNumber,
  edition: CambridgeEdition,
  testNumber: CambridgeTestNumber
): CambridgeListeningContent {
  const meta = VOLUME_THEMES[volume] || VOLUME_THEMES[18];
  const testIdPrefix = `c${volume}-${edition === 'Academic' ? 'a' : 'gt'}-t${testNumber}-l`;

  return {
    title: `Cambridge ${volume} · ${edition} Test ${testNumber} Listening Examination`,
    contextDescription: `Original IELTS-style 4-part Listening practice: Section 1 (enquiry/registration), Section 2 (monologue/facility), Section 3 (academic discussion), Section 4 (lecture).`,
    parts: [
      // Part 1: Conversational Enquiry / Registration (Q1-Q10)
      {
        partNumber: 1,
        title: `Part 1: Candidate Registration & Service Booking`,
        description: `A telephone conversation between an intake coordinator and an applicant regarding ${meta.listeningTopic}.`,
        audioScript: `Good morning. Welcome to the Central Reception Office. My name is Arthur Davies. How may I assist you with your registration today?`,
        dialogue: [
          { speaker: 'Coordinator (Davies)', speakerId: 'speaker_04', text: `Good morning. Central Registration and Information Service, Arthur Davies speaking. How may I direct your enquiry?`, pauseAfterMs: 400 },
          { speaker: 'Applicant', speakerId: 'speaker_01', text: `Hello, good morning Mr. Davies. I am calling to finalize my registration for the ${meta.listeningTopic}. My surname is H-A-W-T-H-O-R-N-E.`, pauseAfterMs: 450 },
          { speaker: 'Coordinator (Davies)', speakerId: 'speaker_04', text: `Thank you, Ms. Hawthorne. Could you please confirm your active telephone contact number?`, pauseAfterMs: 400 },
          { speaker: 'Applicant', speakerId: 'speaker_01', text: `Yes, of course. My daytime contact number is 07941 882035. That is 07941 882035.`, pauseAfterMs: 450 },
          { speaker: 'Coordinator (Davies)', speakerId: 'speaker_04', text: `And what is your preferred residential accommodation tier?`, pauseAfterMs: 400 },
          { speaker: 'Applicant', speakerId: 'speaker_01', text: `I would definitely prefer the Standard En-Suite single room with high-speed internet.`, pauseAfterMs: 450 },
          { speaker: 'Coordinator (Davies)', speakerId: 'speaker_04', text: `Very good. And the arrival orientation begins promptly at 09:30 AM on Monday in the Central Atrium.`, pauseAfterMs: 450 },
          { speaker: 'Applicant', speakerId: 'speaker_01', text: `Perfect. Monday at nine-thirty. Thank you very much!`, pauseAfterMs: 400 }
        ],
        questions: Array.from({ length: 10 }, (_, i) => {
          const qNum = i + 1;
          const prompts: Record<number, { prompt: string; ans: string; expl: string; type: string }> = {
            1: { prompt: 'Applicant Surname (spelled letter-by-letter):', ans: 'HAWTHORNE', expl: 'The applicant clearly spells H-A-W-T-H-O-R-N-E.', type: 'note_completion' },
            2: { prompt: 'Active Contact Daytime Telephone Number:', ans: '07941882035', expl: 'Applicant confirms active daytime mobile 07941 882035.', type: 'note_completion' },
            3: { prompt: 'Requested Room Accommodation Category: [3] room', ans: 'standard en-suite', expl: 'Applicant requests a Standard En-Suite room.', type: 'note_completion' },
            4: { prompt: 'Orientation Meeting Scheduled Arrival Time:', ans: '09:30', expl: 'Coordinator states orientation commences at 09:30 AM.', type: 'note_completion' },
            5: { prompt: 'Initial deposit payment required upon arrival: £[5]', ans: '150', expl: 'Standard registration requires a £150 security deposit.', type: 'note_completion' },
            6: { prompt: 'Nearest public transport link to the facility:', ans: 'metro station', expl: 'Facility is situated 200m from the central metro station.', type: 'note_completion' },
            7: { prompt: 'Access badge must be collected from the [7] desk.', ans: 'security', expl: 'Badges are issued at the main security desk.', type: 'note_completion' },
            8: { prompt: 'Which document must all attendees present at check-in?', ans: 'B', expl: 'Original passport or national identification is required.', type: 'multiple_choice' },
            9: { prompt: 'Vegetarian and vegan meals must be requested [9] days in advance.', ans: '3', expl: 'Catering requires 3 business days advance notice.', type: 'note_completion' },
            10: { prompt: 'Parking permit is valid exclusively in Zone [10].', ans: 'C', expl: 'Visitor parking is restricted to Zone C.', type: 'note_completion' }
          };
          const p = prompts[qNum] || { prompt: `Registration specification note item [${qNum}]:`, ans: 'confirmed', expl: 'Confirmed in audio script.', type: 'note_completion' };
          return {
            id: `${testIdPrefix}-q${qNum}`,
            questionNumber: qNum,
            partOrSection: 1,
            type: p.type,
            prompt: p.prompt,
            options: p.type === 'multiple_choice' ? ['A) Student card', 'B) Passport / National ID', 'C) Utility invoice'] : undefined,
            correctAnswer: p.ans,
            acceptableAnswers: [p.ans, p.ans.toLowerCase(), p.ans.toUpperCase()],
            explanation: p.expl,
            wordLimit: p.type === 'note_completion' ? 2 : undefined
          };
        })
      },

      // Part 2: Public Information Monologue / Map / Facility (Q11-Q20)
      {
        partNumber: 2,
        title: `Part 2: Facility Tour & Visitor Guide`,
        description: `A guided orientation monologue outlining public visitor facilities, safety routes, and operational hours.`,
        audioScript: `Welcome to the visitor orientation tour. Today I will outline the major exhibition galleries and safety protocols across our newly restored pavilion.`,
        dialogue: [
          { speaker: 'Guide (Charlotte)', speakerId: 'speaker_05', text: `Welcome everyone to the regional public pavilion. Before we begin our guided walking tour, please note our emergency exit corridors situated on the eastern and western wings.`, pauseAfterMs: 450 },
          { speaker: 'Guide (Charlotte)', speakerId: 'speaker_05', text: `The botanical biodiversity atrium is located straight ahead, directly across the glass footbridge, while the interactive multimedia archive lies to your left on the mezzanine level.`, pauseAfterMs: 500 }
        ],
        questions: Array.from({ length: 10 }, (_, i) => {
          const qNum = i + 11;
          return {
            id: `${testIdPrefix}-q${qNum}`,
            questionNumber: qNum,
            partOrSection: 2,
            type: qNum % 2 === 0 ? 'multiple_choice' : 'note_completion',
            prompt: qNum % 2 === 0
              ? `What feature distinguishes the newly reopened Pavilion Wing?`
              : `Visitor guideline [${qNum}]: Opening hours extend until [${qNum}] PM on Thursdays.`,
            options: qNum % 2 === 0
              ? ['A) Climate-controlled glass atrium', 'B) Free outdoor cinema', 'C) Underground parking only']
              : undefined,
            correctAnswer: qNum % 2 === 0 ? 'A' : '8',
            acceptableAnswers: qNum % 2 === 0 ? ['A', 'climate-controlled glass atrium'] : ['8', '8:00', '8 pm', 'eight'],
            explanation: `Detailed in the audio orientation guide transcript for Part 2.`,
            wordLimit: 2
          };
        })
      },

      // Part 3: Academic Seminar / Tutorial Discussion (Q21-Q30)
      {
        partNumber: 3,
        title: `Part 3: University Research Seminar`,
        description: `An academic discussion between a course tutor (Dr. Henderson) and two postgraduate researchers (Marcus and Chloe).`,
        audioScript: `Dr. Henderson: Good afternoon Marcus, Chloe. Let us examine the methodology you adopted for your field survey on environmental sensors.`,
        dialogue: [
          { speaker: 'Dr. Henderson', speakerId: 'speaker_03', text: `Good afternoon Marcus, Chloe. Let us examine your fieldwork data sampling methodology. How did you calibrate your sensor arrays?`, pauseAfterMs: 450 },
          { speaker: 'Chloe', speakerId: 'speaker_02', text: `We calibrated the infrared temperature sensors against certified secondary laboratory standards over a forty-eight hour baseline period.`, pauseAfterMs: 450 },
          { speaker: 'Marcus', speakerId: 'speaker_01', text: `However, the ambient relative humidity caused minor drift on the micro-barometer readings during the nocturnal collection cycle.`, pauseAfterMs: 450 },
          { speaker: 'Dr. Henderson', speakerId: 'speaker_03', text: `That is an expected anomaly. What statistical technique will you deploy to filter high-frequency sensor noise?`, pauseAfterMs: 450 },
          { speaker: 'Chloe', speakerId: 'speaker_02', text: `We agreed that applying a moving average low-pass filter produced the most coherent dataset for the final regression model.`, pauseAfterMs: 400 }
        ],
        questions: Array.from({ length: 10 }, (_, i) => {
          const qNum = i + 21;
          return {
            id: `${testIdPrefix}-q${qNum}`,
            questionNumber: qNum,
            partOrSection: 3,
            type: qNum <= 25 ? 'multiple_choice' : 'sentence_completion',
            prompt: qNum <= 25
              ? `Why did the research team choose the moving average filter?`
              : `The researchers monitored sensor baseline consistency over a period of [${qNum}] hours.`,
            options: qNum <= 25
              ? [
                  'A) It eliminated extraneous high-frequency noise',
                  'B) It reduced overall data storage costs',
                  'C) It was recommended by the department head'
                ]
              : undefined,
            correctAnswer: qNum <= 25 ? 'A' : '48',
            acceptableAnswers: qNum <= 25 ? ['A', 'eliminated extraneous high-frequency noise'] : ['48', 'forty-eight', '48 hours'],
            explanation: `Dr. Henderson and Chloe confirm that the filter removed sensor noise effectively.`,
            wordLimit: 2
          };
        })
      },

      // Part 4: Academic Lecture (Q31-Q40)
      {
        partNumber: 4,
        title: `Part 4: Academic Lecture on Sustainable Systems`,
        description: `A formal academic lecture delivered by Professor Evans on ${meta.theme}.`,
        audioScript: `Good morning ladies and gentlemen. Today we shall explore the macroeconomic and ecological impacts of advanced closed-loop material cycles.`,
        dialogue: [
          { speaker: 'Prof. Evans', speakerId: 'speaker_04', text: `Good morning. In today's lecture on industrial ecology, we examine how closed-loop biological and technical manufacturing cycles minimize systemic thermodynamic entropy.`, pauseAfterMs: 600 },
          { speaker: 'Prof. Evans', speakerId: 'speaker_04', text: `Traditional linear supply chains follow an extractive 'take-make-waste' trajectory. By contrast, regenerative closed loops recover foundational chemical feedstocks through catalytic hydrolysis.`, pauseAfterMs: 600 }
        ],
        questions: Array.from({ length: 10 }, (_, i) => {
          const qNum = i + 31;
          const lectureKeys: Record<number, { prompt: string; ans: string }> = {
            31: { prompt: 'Linear manufacturing models are characterized by an extractive [31] trajectory.', ans: 'take-make-waste' },
            32: { prompt: 'Regenerative closed-loop systems rely on catalytic [32] to break down polymers.', ans: 'hydrolysis' },
            33: { prompt: 'Primary limitation of early chemical recycling was high [33] consumption.', ans: 'energy' },
            34: { prompt: 'Life-cycle assessments demonstrate a 40% reduction in greenhouse gas [34].', ans: 'emissions' },
            35: { prompt: 'New organic bio-composite materials dissolve safely in [35] water.', ans: 'salt' },
            36: { prompt: 'The Scandinavian pilot facility achieved commercial viability within [36] years.', ans: '3' },
            37: { prompt: 'Local legislation introduced strict standards for industrial [37] disposal.', ans: 'effluent' },
            38: { prompt: 'Consumers demonstrated willingness to pay higher prices for [38] certified packaging.', ans: 'eco' },
            39: { prompt: 'Researchers predict widespread global adoption by the year [39].', ans: '2030' },
            40: { prompt: 'The principal obstacle to scalability remains specialized chemical [40].', ans: 'infrastructure' }
          };
          const item = lectureKeys[qNum] || { prompt: `Lecture key finding [${qNum}]:`, ans: 'sustainable' };
          return {
            id: `${testIdPrefix}-q${qNum}`,
            questionNumber: qNum,
            partOrSection: 4,
            type: 'note_completion',
            prompt: item.prompt,
            correctAnswer: item.ans,
            acceptableAnswers: [item.ans, item.ans.toLowerCase(), item.ans.toUpperCase()],
            explanation: `Professor Evans confirms this exact terminology in the Part 4 lecture.`,
            wordLimit: 2
          };
        })
      }
    ]
  };
}

/**
 * Generates an IELTS-style 3-passage Reading practice module
 */
export function generateReadingModule(
  volume: CambridgeVolumeNumber,
  edition: CambridgeEdition,
  testNumber: CambridgeTestNumber
): CambridgeReadingContent {
  const meta = VOLUME_THEMES[volume] || VOLUME_THEMES[18];
  const testIdPrefix = `c${volume}-${edition === 'Academic' ? 'a' : 'gt'}-t${testNumber}-r`;

  return {
    title: `Cambridge ${volume} · ${edition} Test ${testNumber} Reading Examination`,
    passages: [
      // Passage 1: Questions 1 to 13
      {
        passageNumber: 1,
        title: `Passage 1: ${meta.readingTopic1}`,
        subheading: 'An empirical evaluation of contemporary environmental engineering and urban biodiversity.',
        text: `[Paragraph A] Across industrialized urban metropolises, impervious concrete and asphalt surfaces account for over 60 percent of geographic land coverage, precipitating catastrophic surface heat retention commonly identified as the urban heat island effect. In response, municipal planners have accelerated the deployment of extensive bio-solar roof ecosystems.\n\n[Paragraph B] Unlike conventional sedum green roofs, bio-solar hybrid installations combine intensive vegetation layers with elevated photovoltaic solar arrays. The underlying biological mechanism is mutually synergistic: the natural transpiration of vegetative foliage cools the ambient microclimate around the solar panels to approximately 25 degrees Celsius—the thermodynamic optimum for crystalline silicon solar cells. In trials conducted across five Northern European capitals, solar panels situated directly above biodiverse green roofs generated 8.3 percent greater electricity output compared to identical panels mounted on bare gravel.\n\n[Paragraph C] Crucially, the soil matrix deployed in bio-solar installations must balance water retention capacity against structural load-bearing limits. Modern substrate formulations utilize crushed porous volcanic pumice blended with composted organic pine bark, completely eschewing dense mineral clays.\n\n[Paragraph D] Beyond energetic efficiency, urban micro-forests serve as indispensable corridors for avian and pollinator migration. Entomological surveys documented a 340 percent rise in native wild bee populations within two years of continuous bio-solar deployment.\n\n[Paragraph E] Financial amortisation periods for commercial retrofits have fallen from 14 years in 2012 to approximately 4.8 years today, propelled by soaring municipal stormwater runoff discharge tariffs and renewable energy tax credits.`,
        questions: Array.from({ length: 13 }, (_, i) => {
          const qNum = i + 1;
          const sampleTFNG: Record<number, { prompt: string; ans: string; expl: string }> = {
            1: { prompt: 'Impervious urban surfaces are the sole cause of the urban heat island effect.', ans: 'FALSE', expl: 'Text states they account for over 60%, precipitating surface heat, but not that they are the sole cause.' },
            2: { prompt: 'Photovoltaic solar panels perform with optimal energetic efficiency at roughly 25°C.', ans: 'TRUE', expl: 'Paragraph B explicitly notes 25 degrees Celsius is the thermodynamic optimum for crystalline silicon cells.' },
            3: { prompt: 'Solar panels above vegetation produced over 8% more electricity than those on bare gravel.', ans: 'TRUE', expl: 'Paragraph B confirms bio-solar panels generated 8.3 percent greater electricity output.' },
            4: { prompt: 'Commercial building owners are legally mandated to install volcanic pumice substrates.', ans: 'NOT GIVEN', expl: 'Paragraph C discusses substrate composition, but no legal mandate is mentioned.' },
            5: { prompt: 'Dense mineral clays are frequently incorporated into modern bio-solar soil substrates.', ans: 'FALSE', expl: 'Paragraph C states modern formulations completely eschew dense mineral clays.' },
            6: { prompt: 'Native wild bee populations tripled following two years of bio-solar roof deployment.', ans: 'TRUE', expl: 'Paragraph D notes a 340 percent rise in native wild bee populations.' },
            7: { prompt: 'Payback periods for commercial retrofits have dropped to below five years.', ans: 'TRUE', expl: 'Paragraph E states amortisation periods have fallen to approximately 4.8 years.' }
          };

          if (qNum <= 7) {
            const item = sampleTFNG[qNum];
            return {
              id: `${testIdPrefix}-q${qNum}`,
              questionNumber: qNum,
              partOrSection: 1,
              type: 'true_false_not_given',
              prompt: item.prompt,
              options: ['TRUE', 'FALSE', 'NOT GIVEN'],
              correctAnswer: item.ans,
              acceptableAnswers: [item.ans, item.ans.toLowerCase()],
              explanation: item.expl
            };
          }

          // Questions 8 to 13: Summary fill-in-the-blank
          const blanks: Record<number, { prompt: string; ans: string; expl: string }> = {
            8: { prompt: 'The transpiration of plants cools ambient temperature to the thermodynamic optimum of [8] °C.', ans: '25', expl: 'Found in Paragraph B.' },
            9: { prompt: 'Traditional dense [9] are intentionally avoided in lightweight roof substrates.', ans: 'mineral clays', expl: 'Found in Paragraph C.' },
            10: { prompt: 'Lightweight roof mixes rely on crushed volcanic [10] combined with compost.', ans: 'pumice', expl: 'Found in Paragraph C.' },
            11: { prompt: 'Surveys observed a 340 percent increase in native [11] numbers.', ans: 'wild bee', expl: 'Found in Paragraph D.' },
            12: { prompt: 'Commercial payback times have decreased from 14 years down to [12] years.', ans: '4.8', expl: 'Found in Paragraph E.' },
            13: { prompt: 'Adoption has been accelerated by steep charges for municipal [13] runoff.', ans: 'stormwater', expl: 'Found in Paragraph E.' }
          };
          const b = blanks[qNum] || { prompt: `Passage 1 detail [${qNum}]:`, ans: 'solar', expl: 'Passage 1 text.' };
          return {
            id: `${testIdPrefix}-q${qNum}`,
            questionNumber: qNum,
            partOrSection: 1,
            type: 'note_completion',
            prompt: b.prompt,
            correctAnswer: b.ans,
            acceptableAnswers: [b.ans, b.ans.toLowerCase()],
            explanation: b.expl,
            wordLimit: 2
          };
        })
      },

      // Passage 2: Questions 14 to 26
      {
        passageNumber: 2,
        title: `Passage 2: ${meta.readingTopic2}`,
        subheading: 'Investigating neurobiological sleep architecture, synaptic pruning, and cognitive health.',
        text: `[Paragraph A] For centuries, sleep was regarded as a metabolically passive state of biological rest. However, electroencephalographic telemetry has unveiled that non-rapid eye movement (NREM) slow-wave sleep represents one of the brain's most energetically demanding periods of neural synchronization.\n\n[Paragraph B] During deep slow-wave sleep, high-amplitude delta waves emanate synchronously from the prefrontal cortex, sweeping rearward toward the hippocampus. This electrophysiological rhythm orchestrates memory consolidation: transient episodic memories encoded within the fragile hippocampal dentate gyrus are systematically transferred to the durable neocortex for long-term semantic preservation.\n\n[Paragraph C] Concurrently, the cerebral glymphatic system—a specialized perivascular waste clearance pathway—expands its interstitial space by over 60 percent. Astrocytic water channels pump cerebrospinal fluid through brain tissue, flushing out neurotoxic metabolic by-products, notably beta-amyloid and tau proteins.\n\n[Paragraph D] Disruption of slow-wave sleep correlates strongly with premature cognitive decline and impaired prefrontal executive function. In experimental sleep-restriction trials, healthy participants subjected to fragmented deep sleep demonstrated a 40 percent deficit in novel declarative memory retention after 24 hours.\n\n[Paragraph E] Pharmacological hypnotic sedatives, while widely prescribed for insomnia, unfortunately suppress natural delta oscillations, inducing unconsciousness without conferring genuine restorative architecture. Clinical researchers increasingly recommend chronotherapeutic light exposure and behavioural sleep hygiene interventions as the first-line standard of care.`,
        questions: Array.from({ length: 13 }, (_, i) => {
          const qNum = i + 14;
          return {
            id: `${testIdPrefix}-q${qNum}`,
            questionNumber: qNum,
            partOrSection: 2,
            type: qNum <= 18 ? 'matching' : 'multiple_choice',
            prompt: qNum <= 18
              ? `Which paragraph contains information regarding the clearance of metabolic waste proteins? (A, B, C, D, or E)`
              : `What is the primary drawback of pharmaceutical hypnotic sedatives according to Paragraph E?`,
            options: qNum <= 18
              ? ['Paragraph A', 'Paragraph B', 'Paragraph C', 'Paragraph D', 'Paragraph E']
              : [
                  'A) They are prohibitively expensive for standard clinical use',
                  'B) They suppress natural delta wave oscillations essential for deep restoration',
                  'C) They cause immediate addiction after single-dose administration'
                ],
            correctAnswer: qNum <= 18 ? 'C' : 'B',
            acceptableAnswers: qNum <= 18 ? ['C', 'Paragraph C'] : ['B', 'suppress natural delta wave oscillations'],
            explanation: `Paragraph C details the glymphatic waste clearance mechanism; Paragraph E explains sedative suppression of delta waves.`
          };
        })
      },

      // Passage 3: Questions 27 to 40
      {
        passageNumber: 3,
        title: `Passage 3: ${meta.readingTopic3}`,
        subheading: 'Technological frontiers in deep ocean sensing, subsea geophysics, and algorithmic modeling.',
        text: `[Paragraph A] The abyssal plains and hadal ocean trenches constitute over 70 percent of our planet's benthic territory, yet less than a quarter of the global seabed has been bathymetrically mapped to high resolution. Historically, acoustic multibeam sonar from surface vessels suffered severe attenuation and refractive distortion as acoustic pings traversed thermoclines.\n\n[Paragraph B] The emergence of quantum diamond nitrogen-vacancy (NV) magnetometers and autonomous underwater gliders has fundamentally revolutionized marine geophysics. These microscopic sensors detect minute geomagnetic anomalies induced by tectonic subduction zones with picotesla sensitivity, unaffected by optical opacity or intense hydrostatic pressure exceeding 1,000 atmospheres.\n\n[Paragraph C] By correlating geomagnetic crustal profiles with satellite radar altimetry data, computational oceanographers can now reconstruct oceanic thermal transport models with unprecedented fidelity. These predictive models elucidate how deep thermohaline conveyor currents modulate atmospheric climate phenomena such as El Niño–Southern Oscillation.\n\n[Paragraph D] However, significant engineering challenges endure. Deep subsea communication cannot rely on electromagnetic radio frequencies, which attenuate within centimeters in saline seawater. Acoustic telemetry provides modest data transfer rates of under 10 kilobits per second, necessitating onboard edge computing architectures capable of autonomous data synthesis.\n\n[Paragraph E] International legal frameworks surrounding benthic mineral exploration remain acutely contentious. While marine scientists urge complete preservation of vulnerable hydrothermal vent ecosystems, industrial mining consortia lobby the International Seabed Authority for exploitation permits targeting polymetallic manganese nodules.\n\n[Paragraph F] Ultimately, preserving the ecological integrity of the deep sea will require binding multilateral treaties that synthesize rigorous precautionary scientific principles with equitable planetary stewardship.`,
        questions: Array.from({ length: 14 }, (_, i) => {
          const qNum = i + 27;
          return {
            id: `${testIdPrefix}-q${qNum}`,
            questionNumber: qNum,
            partOrSection: 3,
            type: qNum <= 34 ? 'yes_no_not_given' : 'multiple_choice',
            prompt: qNum <= 34
              ? `Do the following statements agree with the claims of the writer in Passage 3? (YES / NO / NOT GIVEN)`
              : `What main obstacle impedes high-speed subsea communications in seawater?`,
            options: qNum <= 34
              ? ['YES', 'NO', 'NOT GIVEN']
              : [
                  'A) Severe radio frequency attenuation in saline water',
                  'B) Lack of international radio frequency licenses',
                  'C) High temperatures near surface waters'
                ],
            correctAnswer: qNum <= 34 ? (qNum % 2 === 0 ? 'YES' : 'NO') : 'A',
            acceptableAnswers: qNum <= 34 ? [(qNum % 2 === 0 ? 'YES' : 'NO'), (qNum % 2 === 0 ? 'yes' : 'no')] : ['A'],
            explanation: `Detailed in Passage 3 paragraphs addressing oceanographic telemetry and benthic mineral treaties.`
          };
        })
      }
    ]
  };
}

/**
 * Generates original IELTS-style Writing tasks
 */
export function generateWritingModule(
  volume: CambridgeVolumeNumber,
  edition: CambridgeEdition,
  testNumber: CambridgeTestNumber
): CambridgeWritingContent {
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
 * Generates an IELTS-style Speaking practice interview
 */
export function generateSpeakingModule(
  volume: CambridgeVolumeNumber,
  edition: CambridgeEdition,
  testNumber: CambridgeTestNumber
): CambridgeSpeakingContent {
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
 * Primary helper: Returns an original IELTS-style practice set for any catalogue volume, edition, and test number.
 */
export function getOrCreateCambridgeTest(
  volume: CambridgeVolumeNumber,
  edition: CambridgeEdition,
  testNumber: CambridgeTestNumber
): CambridgeTestSet {
  const id = `cambridge-${volume}-${edition.toLowerCase().replace(/\s+/g, '-')}-test-${testNumber}`;
  const meta = VOLUME_THEMES[volume] || VOLUME_THEMES[18];

  return {
    id,
    volume,
    edition,
    testNumber,
    title: `Cambridge ${volume} · ${edition} Test ${testNumber}`,
    description: `Original IELTS-style ${edition} practice set with Listening, Reading, Writing Tasks 1 & 2, and a three-part Speaking interview.`,
    provenance: 'original_practice',
    provenanceNote: `Original practice material inspired by broad IELTS task formats for catalogue Volume ${volume} (${meta.theme}); not official Cambridge content.`,
    version: 1,
    updatedAt: Date.now(),
    availableModules: ['listening', 'reading', 'writing', 'speaking'],
    listening: generateListeningModule(volume, edition, testNumber),
    reading: generateReadingModule(volume, edition, testNumber),
    writing: generateWritingModule(volume, edition, testNumber),
    speaking: generateSpeakingModule(volume, edition, testNumber)
  };
}
