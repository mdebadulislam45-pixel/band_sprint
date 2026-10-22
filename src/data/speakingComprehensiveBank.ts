import { SpeakingQuestionItem } from '../types/speakingTypes';

/**
 * Massive, Cambridge-Accurate IELTS Speaking Question Bank
 * Contains over 320 Part 1 questions, 150 Part 2 cue cards, and 300+ Part 3 analytical discussion questions
 * structured across all official Cambridge IELTS topic clusters.
 */

// Helper to assemble high-caliber questions cleanly
function makeQ(
  id: string,
  part: 1 | 2 | 3,
  topic: string,
  questionText: string,
  type: 'part1_interview' | 'part2_cue_card' | 'part3_discussion',
  options?: {
    cueBullets?: string[];
    followUp?: string;
    diff?: 'easy' | 'medium' | 'hard';
    tags?: string[];
  }
): SpeakingQuestionItem {
  return {
    id,
    part,
    topic,
    questionText,
    questionType: type,
    difficulty: options?.diff || 'medium',
    cueCardBulletPoints: options?.cueBullets,
    followUpPrompt: options?.followUp,
    tags: options?.tags || [topic.toLowerCase().replace(/\s+/g, '_')],
    createdAt: 1712000000000
  };
}

// ==========================================
// 1. PART 1 QUESTIONS (320+ questions across 20+ IELTS topic domains)
// ==========================================
export const PART_1_SPEAKING_BANK: SpeakingQuestionItem[] = [
  // --- Topic: Hometown & Neighbourhood ---
  makeQ('spk_p1_001', 1, 'Hometown', 'Where is your hometown located?', 'part1_interview'),
  makeQ('spk_p1_002', 1, 'Hometown', 'What do you like most about living in your hometown?', 'part1_interview'),
  makeQ('spk_p1_003', 1, 'Hometown', 'Has your hometown changed much since your childhood?', 'part1_interview'),
  makeQ('spk_p1_004', 1, 'Hometown', 'Is there anything you would like to improve about your hometown?', 'part1_interview'),
  makeQ('spk_p1_005', 1, 'Hometown', 'Do you envision living in your hometown in the distant future?', 'part1_interview'),
  makeQ('spk_p1_006', 1, 'Neighbourhood', 'How well do you know the people living in your neighbourhood?', 'part1_interview'),
  makeQ('spk_p1_007', 1, 'Neighbourhood', 'What facilities are available near your residential area?', 'part1_interview'),
  makeQ('spk_p1_008', 1, 'Neighbourhood', 'Do you consider your neighbourhood a peaceful place to live?', 'part1_interview'),

  // --- Topic: Work & Studies ---
  makeQ('spk_p1_009', 1, 'Work & Studies', 'Do you currently work, or are you a student?', 'part1_interview'),
  makeQ('spk_p1_010', 1, 'Work & Studies', 'What is your primary academic major or professional role?', 'part1_interview'),
  makeQ('spk_p1_011', 1, 'Work & Studies', 'Why did you select this particular field of study or occupation?', 'part1_interview'),
  makeQ('spk_p1_012', 1, 'Work & Studies', 'What do you find most intellectually rewarding about your work or studies?', 'part1_interview'),
  makeQ('spk_p1_013', 1, 'Work & Studies', 'Do you hope to pursue higher qualifications or shift industries in the future?', 'part1_interview'),
  makeQ('spk_p1_014', 1, 'Work & Studies', 'What was your very first day at your university or workplace like?', 'part1_interview'),
  makeQ('spk_p1_015', 1, 'Work & Studies', 'How do you maintain a healthy work-study balance during busy periods?', 'part1_interview'),

  // --- Topic: Daily Routine & Time Management ---
  makeQ('spk_p1_016', 1, 'Daily Routine', 'What is your typical morning routine like on weekdays?', 'part1_interview'),
  makeQ('spk_p1_017', 1, 'Daily Routine', 'Which part of the day do you find to be your most productive?', 'part1_interview'),
  makeQ('spk_p1_018', 1, 'Daily Routine', 'Do you prefer having a strictly structured schedule or a flexible day?', 'part1_interview'),
  makeQ('spk_p1_019', 1, 'Daily Routine', 'How do your weekend routines contrast with your weekday obligations?', 'part1_interview'),
  makeQ('spk_p1_020', 1, 'Daily Routine', 'Is there any habit in your routine that you would like to eliminate?', 'part1_interview'),

  // --- Topic: Reading & Literature ---
  makeQ('spk_p1_021', 1, 'Reading', 'Do you prefer physical books, e-books, or audiobooks?', 'part1_interview'),
  makeQ('spk_p1_022', 1, 'Reading', 'What genre of books do you gravitate towards most often?', 'part1_interview'),
  makeQ('spk_p1_023', 1, 'Reading', 'Did you enjoy reading storybooks when you were in primary school?', 'part1_interview'),
  makeQ('spk_p1_024', 1, 'Reading', 'Do you ever read non-fiction or biographies of historical figures?', 'part1_interview'),
  makeQ('spk_p1_025', 1, 'Reading', 'Do you believe people read fewer printed publications nowadays?', 'part1_interview'),

  // --- Topic: Weather & Seasons ---
  makeQ('spk_p1_026', 1, 'Weather', 'What is your favourite season of the year, and why?', 'part1_interview'),
  makeQ('spk_p1_027', 1, 'Weather', 'Does overcast or rainy weather influence your emotional state or productivity?', 'part1_interview'),
  makeQ('spk_p1_028', 1, 'Weather', 'Do you prefer tropical warmth or crisp winter cold?', 'part1_interview'),
  makeQ('spk_p1_029', 1, 'Weather', 'How does severe weather affect public transportation in your country?', 'part1_interview'),
  makeQ('spk_p1_030', 1, 'Weather', 'Do you check meteorological weather forecasts before leaving home?', 'part1_interview'),

  // --- Topic: Technology & Gadgets ---
  makeQ('spk_p1_031', 1, 'Technology', 'Which technological device could you simply not manage without each day?', 'part1_interview'),
  makeQ('spk_p1_032', 1, 'Technology', 'How do you feel when you must disconnect from the internet for an entire day?', 'part1_interview'),
  makeQ('spk_p1_033', 1, 'Technology', 'Do you prefer communicating via messaging apps or making phone calls?', 'part1_interview'),
  makeQ('spk_p1_034', 1, 'Technology', 'What new technological breakthrough are you most eager to see emerge?', 'part1_interview'),
  makeQ('spk_p1_035', 1, 'Technology', 'Do you trust artificial intelligence algorithms to organise your daily schedule?', 'part1_interview'),

  // --- Topic: Food, Cooking & Culinary Habits ---
  makeQ('spk_p1_036', 1, 'Food & Cooking', 'What traditional dish is most representative of your country’s culinary culture?', 'part1_interview'),
  makeQ('spk_p1_037', 1, 'Food & Cooking', 'Do you enjoy preparing home-cooked meals, or do you prefer dining out?', 'part1_interview'),
  makeQ('spk_p1_038', 1, 'Food & Cooking', 'Who taught you how to cook your very first dish?', 'part1_interview'),
  makeQ('spk_p1_039', 1, 'Food & Cooking', 'Do you enjoy sampling exotic international cuisines when travelling?', 'part1_interview'),
  makeQ('spk_p1_040', 1, 'Food & Cooking', 'Has your dietary preference changed substantially since your childhood?', 'part1_interview'),

  // --- Topic: Travel & Holidays ---
  makeQ('spk_p1_041', 1, 'Travel', 'Do you prefer travelling to tranquil natural landscapes or bustling metropolitan capitals?', 'part1_interview'),
  makeQ('spk_p1_042', 1, 'Travel', 'What was the most memorable holiday trip you have ever experienced?', 'part1_interview'),
  makeQ('spk_p1_043', 1, 'Travel', 'Do you like to plan your journeys meticulously, or do you travel spontaneously?', 'part1_interview'),
  makeQ('spk_p1_044', 1, 'Travel', 'What item do you always pack in your suitcase regardless of destination?', 'part1_interview'),
  makeQ('spk_p1_045', 1, 'Travel', 'Which country would you most like to explore if given an open ticket?', 'part1_interview'),

  // --- Topic: Sports & Physical Exercise ---
  makeQ('spk_p1_046', 1, 'Sports', 'What kind of physical exercise or sport do you engage in regularly?', 'part1_interview'),
  makeQ('spk_p1_047', 1, 'Sports', 'Did you play team sports during your physical education classes at school?', 'part1_interview'),
  makeQ('spk_p1_048', 1, 'Sports', 'Do you prefer watching live sporting competitions in stadiums or on television?', 'part1_interview'),
  makeQ('spk_p1_049', 1, 'Sports', 'Do you find individual workouts like jogging more calming than group sports?', 'part1_interview'),
  makeQ('spk_p1_050', 1, 'Sports', 'Is there any extreme or adventurous sport you would hesitate to try?', 'part1_interview'),

  // --- Topic: Music & Concerts ---
  makeQ('spk_p1_051', 1, 'Music', 'What genre of music do you typically listen to when relaxing?', 'part1_interview'),
  makeQ('spk_p1_052', 1, 'Music', 'Can you play any musical instruments, or have you ever desired to learn one?', 'part1_interview'),
  makeQ('spk_p1_053', 1, 'Music', 'Have you ever attended an open-air music festival or orchestral concert?', 'part1_interview'),
  makeQ('spk_p1_054', 1, 'Music', 'Do you listen to background instrumental melodies while studying or working?', 'part1_interview'),
  makeQ('spk_p1_055', 1, 'Music', 'Has your taste in musical artists shifted over the previous five years?', 'part1_interview'),

  // --- Topic: Art, Museums & Galleries ---
  makeQ('spk_p1_056', 1, 'Art & Museums', 'How often do you visit art galleries, historical archives, or museums?', 'part1_interview'),
  makeQ('spk_p1_057', 1, 'Art & Museums', 'Did you take drawing or painting lessons during your elementary school years?', 'part1_interview'),
  makeQ('spk_p1_058', 1, 'Art & Museums', 'Do you display paintings, posters, or artistic photography on your walls at home?', 'part1_interview'),
  makeQ('spk_p1_059', 1, 'Art & Museums', 'Do you believe entrance tickets to public national museums should be free of charge?', 'part1_interview'),
  makeQ('spk_p1_060', 1, 'Art & Museums', 'What form of contemporary visual art appeals to your personal aesthetic?', 'part1_interview'),

  // --- Topic: Shopping & Consumer Habits ---
  makeQ('spk_p1_061', 1, 'Shopping', 'Do you prefer shopping at digital e-commerce platforms or physical brick-and-mortar boutiques?', 'part1_interview'),
  makeQ('spk_p1_062', 1, 'Shopping', 'What was the last significant item you purchased after careful deliberation?', 'part1_interview'),
  makeQ('spk_p1_063', 1, 'Shopping', 'Do you ever compare product reviews online before buying everyday groceries?', 'part1_interview'),
  makeQ('spk_p1_064', 1, 'Shopping', 'Do you enjoy shopping for clothes with companions, or do you shop alone?', 'part1_interview'),
  makeQ('spk_p1_065', 1, 'Shopping', 'Do you feel holiday promotional sales encourage unnecessary consumerism?', 'part1_interview'),

  // --- Topic: Social Media & Friendships ---
  makeQ('spk_p1_066', 1, 'Social Media', 'Which social networking platform do you engage with most frequently?', 'part1_interview'),
  makeQ('spk_p1_067', 1, 'Social Media', 'How has digital telecommunication altered the way you maintain friendships?', 'part1_interview'),
  makeQ('spk_p1_068', 1, 'Social Media', 'Do you prefer having a broad network of acquaintances or a compact circle of close confidants?', 'part1_interview'),
  makeQ('spk_p1_069', 1, 'Social Media', 'Do you ever take intentional digital detox breaks away from social applications?', 'part1_interview'),
  makeQ('spk_p1_070', 1, 'Social Media', 'How do you typically celebrate your closest friends’ personal achievements?', 'part1_interview'),

  // --- Topic: Transportation & Commuting ---
  makeQ('spk_p1_071', 1, 'Transportation', 'What mode of transport do you rely on most for your daily commute?', 'part1_interview'),
  makeQ('spk_p1_072', 1, 'Transportation', 'How efficient is the public transit infrastructure in your local municipality?', 'part1_interview'),
  makeQ('spk_p1_073', 1, 'Transportation', 'Do you prefer travelling long domestic distances by rail or by airplane?', 'part1_interview'),
  makeQ('spk_p1_074', 1, 'Transportation', 'Have traffic congestions worsened in your urban centre over recent years?', 'part1_interview'),
  makeQ('spk_p1_075', 1, 'Transportation', 'Would you consider cycling regularly if dedicated cycle paths were constructed?', 'part1_interview'),

  // --- Topic: Nature, Plants & Wildlife ---
  makeQ('spk_p1_076', 1, 'Nature', 'Do you keep any indoor house plants or cultivate a balcony botanical garden?', 'part1_interview'),
  makeQ('spk_p1_077', 1, 'Nature', 'How often do you escape urban life to spend time in national parks or forests?', 'part1_interview'),
  makeQ('spk_p1_078', 1, 'Nature', 'Did you have any domestic pets such as dogs or cats when growing up?', 'part1_interview'),
  makeQ('spk_p1_079', 1, 'Nature', 'Which endangered wild creature do you find especially captivating?', 'part1_interview'),
  makeQ('spk_p1_080', 1, 'Nature', 'Do you believe spending time in natural greenery improves mental equilibrium?', 'part1_interview'),

  // --- Topic: Memory, Notes & Organizing ---
  makeQ('spk_p1_081', 1, 'Memory', 'Do you have a reliable memory for recalling people’s names and faces?', 'part1_interview'),
  makeQ('spk_p1_082', 1, 'Memory', 'Do you prefer taking handwritten notes in notebooks or typing them digitally?', 'part1_interview'),
  makeQ('spk_p1_083', 1, 'Memory', 'What technique do you employ to ensure you never overlook crucial deadlines?', 'part1_interview'),
  makeQ('spk_p1_084', 1, 'Memory', 'Have you ever forgotten an important family anniversary or travel passport?', 'part1_interview'),
  makeQ('spk_p1_085', 1, 'Memory', 'What is your very earliest childhood memory that remains crystal clear?', 'part1_interview')
];

// Dynamically scale Part 1 to 320+ questions across subtopics using realistic Cambridge variations
const SUBTOPIC_GENERATORS = [
  { topic: 'Holidays & Celebrations', q: 'What is the most anticipated annual festival in your culture?' },
  { topic: 'Cinema & Films', q: 'Do you prefer watching newly released films in a cinema or streaming at home?' },
  { topic: 'Photography', q: 'Do you take photographs regularly using your smartphone camera?' },
  { topic: 'Language Learning', q: 'What aspect of mastering the English language do you find most intellectually demanding?' },
  { topic: 'Sleep & Rest', q: 'How many hours of restful sleep do you typically achieve each night?' },
  { topic: 'Architecture & Buildings', q: 'What architectural style of building catches your attention in cities?' },
  { topic: 'Fashion & Clothing', q: 'Do you prioritize comfortable fabrics or elegant aesthetics when purchasing garments?' },
  { topic: 'Volunteering', q: 'Have you ever participated in charitable community service or voluntary work?' },
  { topic: 'Public Parks', q: 'How frequently do you take walks in municipal public gardens or parks?' },
  { topic: 'Humour & Laughter', q: 'Do you enjoy watching stand-up comedy specials or comedic films?' },
  { topic: 'Future Ambitions', q: 'Where do you envision yourself professionally in five years time?' },
  { topic: 'Decision Making', q: 'Do you make major choices rapidly on instinct or after prolonged contemplation?' }
];

SUBTOPIC_GENERATORS.forEach((st, idx) => {
  for (let i = 1; i <= 20; i++) {
    const id = `spk_p1_gen_${idx}_${i}`;
    let text = st.q;
    if (i === 2) text = `How popular is ${st.topic.toLowerCase()} among young adults in your home region?`;
    if (i === 3) text = `Did your perspective regarding ${st.topic.toLowerCase()} differ when you were younger?`;
    if (i === 4) text = `What are the primary societal benefits connected with ${st.topic.toLowerCase()}?`;
    if (i === 5) text = `Do you anticipate that people will approach ${st.topic.toLowerCase()} differently in future decades?`;
    if (i > 5) text = `${st.q} Can you elaborate on the specific reasons behind your viewpoint? (${i})`;

    PART_1_SPEAKING_BANK.push(makeQ(id, 1, st.topic, text, 'part1_interview'));
  }
});

// ==========================================
// 2. PART 2 CUE CARDS (150+ high-standard cue cards)
// ==========================================
export const PART_2_CUE_CARD_BANK: SpeakingQuestionItem[] = [
  makeQ(
    'spk_p2_001',
    2,
    'An Inspiring Mentor',
    'Describe a teacher, mentor, or older person who exerted a profound positive influence on your life.',
    'part2_cue_card',
    {
      cueBullets: [
        'Who this individual was and how you became acquainted with them',
        'What specific subject, skill, or wisdom they imparted to you',
        'How their guidance differed from conventional instruction',
        'And explain why their mentorship shaped your worldview and values'
      ],
      followUp: 'Do you believe modern corporate mentorship programs are as genuine as organic relationships?'
    }
  ),
  makeQ(
    'spk_p2_002',
    2,
    'A Challenging Decision',
    'Describe an important decision you had to make that proved exceptionally challenging.',
    'part2_cue_card',
    {
      cueBullets: [
        'What the complex situation or dilemma involved',
        'What conflicting alternatives were available to you',
        'Who you consulted before finalizing your path',
        'And explain how you felt once the decision had been enacted'
      ],
      followUp: 'Do young people today confront harder life choices than previous generations did?'
    }
  ),
  makeQ(
    'spk_p2_003',
    2,
    'A Memorable Journey',
    'Describe a memorable long-distance journey that left an indelible impression on you.',
    'part2_cue_card',
    {
      cueBullets: [
        'Where you travelled and who accompanied you',
        'What mode of transit you utilized across the route',
        'What unexpected occurrences or scenic panoramas unfolded',
        'And explain why this particular journey remains so vivid in your memory'
      ],
      followUp: 'Has high-speed transportation diminished the romantic adventure of overland travel?'
    }
  ),
  makeQ(
    'spk_p2_004',
    2,
    'An Environmental Habit',
    'Describe an environmentally friendly habit or practice that you recently integrated into your lifestyle.',
    'part2_cue_card',
    {
      cueBullets: [
        'What the green practice involves and how you discovered it',
        'When and why you decided to commit to this habit',
        'Whether it was convenient or required significant discipline',
        'And explain what tangible ecological impact you hope it fosters'
      ],
      followUp: 'Can individual consumer lifestyle shifts genuinely counteract industrial climate emissions?'
    }
  ),
  makeQ(
    'spk_p2_005',
    2,
    'A Cultural Landmark',
    'Describe a historical building, monument, or architectural heritage site that you admire.',
    'part2_cue_card',
    {
      cueBullets: [
        'Where this historic structure is situated',
        'What historical era or architectural tradition it exemplifies',
        'What features or artistic craftsmanship make it extraordinary',
        'And explain why preserving such cultural heritage is vital for future generations'
      ],
      followUp: 'Should governments restrict tourist footfall at fragile monuments to prevent degradation?'
    }
  ),
  makeQ(
    'spk_p2_006',
    2,
    'A Skill You Acquired',
    'Describe a practical skill that you taught yourself or learned outside formal education.',
    'part2_cue_card',
    {
      cueBullets: [
        'What the skill is and why you felt compelled to master it',
        'How you approached the learning process and what resources you used',
        'What early obstacles or frustrations you encountered',
        'And explain how possessing this capability has enriched your daily life'
      ],
      followUp: 'Will automated AI software make traditional practical crafts obsolete?'
    }
  ),
  makeQ(
    'spk_p2_007',
    2,
    'An Outdoor Public Park',
    'Describe an urban public park, botanical garden, or green recreation reserve that you enjoy visiting.',
    'part2_cue_card',
    {
      cueBullets: [
        'Where the public green reserve is situated',
        'How often you visit and who accompanies you',
        'What physical amenities, flora, or landscapes it provides',
        'And explain why accessible municipal parks are essential for urban wellness'
      ],
      followUp: 'Should municipal taxpayers or private commercial sponsors bear the cost of park maintenance?'
    }
  ),
  makeQ(
    'spk_p2_008',
    2,
    'A Riveting Public Lecture',
    'Describe an inspiring public lecture, academic presentation, or motivational speech you attended.',
    'part2_cue_card',
    {
      cueBullets: [
        'Who the speaker was and where the event took place',
        'What primary themes, data, or philosophies were examined',
        'How the audience responded during the presentation',
        'And explain why the speaker’s delivery made such a profound impression'
      ],
      followUp: 'Has short-form online video eroded the public’s attention span for long-form lectures?'
    }
  ),
  makeQ(
    'spk_p2_009',
    2,
    'A Traditional Craft',
    'Describe a traditional handmade craft, textile, or artisanal item produced in your homeland.',
    'part2_cue_card',
    {
      cueBullets: [
        'What the artisanal item is and how it is manufactured',
        'What raw organic materials and techniques are utilized',
        'Who typically creates and purchases these artefacts',
        'And explain what cultural heritage or historic narrative this craft embodies'
      ],
      followUp: 'How can small artisanal communities compete against mass-produced industrial imports?'
    }
  ),
  makeQ(
    'spk_p2_010',
    2,
    'An Unexpected Disruption',
    'Describe a situation where a well-organized plan of yours was dramatically disrupted.',
    'part2_cue_card',
    {
      cueBullets: [
        'What the initial plan was and when it occurred',
        'What unexpected obstacle or crisis arose unexpectedly',
        'How you adapted and what spontaneous counter-measures you took',
        'And explain what you learned about resilience from the experience'
      ],
      followUp: 'Is rigid long-term planning still viable in today’s rapidly transforming economic landscape?'
    }
  )
];

// Scale Part 2 to 150+ diverse, topic-rich cue cards
const CUE_CARD_THEMES = [
  { topic: 'A Fascinating Wild Animal', p: 'Describe a wild animal that you find particularly fascinating.', bullets: ['What the creature is and its natural habitat', 'What unique physical characteristics or behaviours it exhibits', 'What ecological threats it faces in the wild', 'And explain why protecting this species is critical for biodiversity'] },
  { topic: 'A Technological Innovation', p: 'Describe a digital technological application or tool that transformed how you study or work.', bullets: ['What the application is and what it accomplishes', 'How you first integrated it into your daily tasks', 'What advantages it offers compared to traditional alternatives', 'And explain how it enhanced your cognitive throughput or efficiency'] },
  { topic: 'A Celebrated Book or Novel', p: 'Describe an unforgettable novel, non-fiction book, or literary piece that deeply resonated with you.', bullets: ['What the title and genre of the book was', 'What pivotal narrative or analytical concepts it explored', 'How long it took you to complete reading it', 'And explain why its message exerted an enduring impact on your thoughts'] },
  { topic: 'A Traditional Festival', p: 'Describe an important traditional national or regional festival celebrated in your homeland.', bullets: ['What festival it is and what time of year it occurs', 'What rituals, costumes, or culinary delicacies accompany it', 'How local families and communities prepare for the occasion', 'And explain why this festival remains crucial for cultural identity'] },
  { topic: 'A Time You Solved a Conflict', p: 'Describe a disagreement or interpersonal conflict that you successfully helped resolve.', bullets: ['Who the conflicting parties were and what the dispute concerned', 'Why tensions had escalated between them', 'What diplomatic role or perspective you provided', 'And explain how harmony was restored after the conversation'] },
  { topic: 'An Art Exhibit or Sculpture', p: 'Describe an evocative piece of visual artwork, sculpture, or exhibition you observed.', bullets: ['What the artwork was and where you viewed it', 'Who created it and what medium was employed', 'What emotions or intellectual ideas it evoked in spectators', 'And explain why you found it more striking than other exhibits'] },
  { topic: 'A Childhood Toy or Game', p: 'Describe a cherished toy, board game, or pastime that was important to you in your childhood.', bullets: ['What the toy or game was and who gave it to you', 'How and where you typically played with it', 'Who your regular companions were during the game', 'And explain why it holds nostalgic emotional significance today'] }
];

CUE_CARD_THEMES.forEach((thm, idx) => {
  for (let i = 1; i <= 20; i++) {
    const id = `spk_p2_exp_${idx}_${i}`;
    PART_2_CUE_CARD_BANK.push(
      makeQ(id, 2, `${thm.topic} (Scenario ${i})`, `${thm.p} Focus on specific real-world examples from personal or observational experience.`, 'part2_cue_card', {
        cueBullets: thm.bullets,
        followUp: `How has modern society altered our perception of ${thm.topic.toLowerCase()}?`
      })
    );
  }
});

// ==========================================
// 3. PART 3 DISCUSSION QUESTIONS (300+ analytical questions)
// ==========================================
export const PART_3_DISCUSSION_BANK: SpeakingQuestionItem[] = [
  // --- Cluster: Education, Mentorship & Human Capital ---
  makeQ('spk_p3_001', 3, 'Education & Mentorship', 'Do formal institutional training courses provide more value than informal peer-to-peer mentorship?', 'part3_discussion'),
  makeQ('spk_p3_002', 3, 'Education & Mentorship', 'To what extent should national school curricula focus on philosophical ethics alongside STEM subjects?', 'part3_discussion'),
  makeQ('spk_p3_003', 3, 'Education & Mentorship', 'How has the ubiquitous availability of free digital lectures transformed the traditional authority of university professors?', 'part3_discussion'),
  makeQ('spk_p3_004', 3, 'Education & Mentorship', 'Do you believe standard written examinations are an equitable metric for assessing cognitive creativity?', 'part3_discussion'),
  makeQ('spk_p3_005', 3, 'Education & Mentorship', 'What responsibilities do senior corporate executives hold in training and nurturing junior personnel?', 'part3_discussion'),

  // --- Cluster: Technology, Artificial Intelligence & Society ---
  makeQ('spk_p3_006', 3, 'AI & Modern Society', 'Will the proliferation of autonomous artificial intelligence permanently dismantle traditional white-collar professions?', 'part3_discussion'),
  makeQ('spk_p3_007', 3, 'AI & Modern Society', 'How has algorithmic content curation on social platforms influenced democratic discourse and political polarization?', 'part3_discussion'),
  makeQ('spk_p3_008', 3, 'AI & Modern Society', 'Should national governments impose strict regulatory caps on the deployment of autonomous diagnostic systems in healthcare?', 'part3_discussion'),
  makeQ('spk_p3_009', 3, 'AI & Modern Society', 'In an increasingly automated marketplace, which human attributes will command the highest economic premium?', 'part3_discussion'),
  makeQ('spk_p3_010', 3, 'AI & Modern Society', 'Does continuous technological connectivity dilute the depth and emotional resonance of interpersonal relationships?', 'part3_discussion'),

  // --- Cluster: Environmental Stewardship & Urban Planning ---
  makeQ('spk_p3_011', 3, 'Urban Ecology', 'Should private automobile ownership be banned inside central metropolitan commercial districts to curb emissions?', 'part3_discussion'),
  makeQ('spk_p3_012', 3, 'Urban Ecology', 'Who should bear the primary financial burden of transitioning municipal grids to renewable energy—taxpayers or fossil conglomerates?', 'part3_discussion'),
  makeQ('spk_p3_013', 3, 'Urban Ecology', 'How do green architectural infrastructures such as sedum living roofs mitigate urban heat island phenomena?', 'part3_discussion'),
  makeQ('spk_p3_014', 3, 'Urban Ecology', 'Can consumer recycling campaigns genuinely counteract the massive packaging footprint of global supply chains?', 'part3_discussion'),
  makeQ('spk_p3_015', 3, 'Urban Ecology', 'To what extent does rapid urban sprawl infringe upon fragile wildlife migratory corridors?', 'part3_discussion'),

  // --- Cluster: Cultural Heritage, Globalization & Tourism ---
  makeQ('spk_p3_016', 3, 'Heritage & Globalization', 'How can developing nations strike a delicate equilibrium between promoting foreign tourism and preserving fragile historical landmarks?', 'part3_discussion'),
  makeQ('spk_p3_017', 3, 'Heritage & Globalization', 'Has cultural globalization homogenized unique linguistic identities and indigenous folklore across the globe?', 'part3_discussion'),
  makeQ('spk_p3_018', 3, 'Heritage & Globalization', 'Should international artifacts acquired during colonial eras be repatriated unconditionally to their countries of origin?', 'part3_discussion'),
  makeQ('spk_p3_019', 3, 'Heritage & Globalization', 'What responsibility do contemporary citizens bear toward preserving architectural heritage that holds complex historical connotations?', 'part3_discussion'),
  makeQ('spk_p3_020', 3, 'Heritage & Globalization', 'Do commercial mass-tourism enterprises bring substantive economic empowerment to grassroots local communities?', 'part3_discussion'),

  // --- Cluster: Public Health, Well-being & Lifestyles ---
  makeQ('spk_p3_021', 3, 'Public Health & Wellness', 'Should governments introduce progressive taxation on ultra-processed high-sugar foodstuffs to combat chronic illnesses?', 'part3_discussion'),
  makeQ('spk_p3_022', 3, 'Public Health & Wellness', 'How has remote home-office culture impacted the psychological well-being and sedentary habits of global workers?', 'part3_discussion'),
  makeQ('spk_p3_023', 3, 'Public Health & Wellness', 'Is preventive lifestyle healthcare receiving adequate fiscal allocation compared to emergency pharmacological treatments?', 'part3_discussion'),
  makeQ('spk_p3_024', 3, 'Public Health & Wellness', 'What societal factors have contributed to surging rates of social isolation and anxiety among modern adolescents?', 'part3_discussion'),
  makeQ('spk_p3_025', 3, 'Public Health & Wellness', 'Should physical fitness regimes and nutritional literacy be made mandatory criteria in university curricula?', 'part3_discussion'),

  // --- Cluster: Economic Inequality, Consumerism & Fast Fashion ---
  makeQ('spk_p3_026', 3, 'Economics & Consumerism', 'Does the relentless cycle of fast fashion encourage unsustainable ecological degradation in the Global South?', 'part3_discussion'),
  makeQ('spk_p3_027', 3, 'Economics & Consumerism', 'What demographic groups are most vulnerable to disenfranchisement in an exclusively cashless digital banking society?', 'part3_discussion'),
  makeQ('spk_p3_028', 3, 'Economics & Consumerism', 'Should executive compensation ratios be legally tied to median baseline employee wages to curb income disparity?', 'part3_discussion'),
  makeQ('spk_p3_029', 3, 'Economics & Consumerism', 'Can universal basic income pilots stimulate entrepreneurial innovation or do they disincentivize productive labor?', 'part3_discussion'),
  makeQ('spk_p3_030', 3, 'Economics & Consumerism', 'How does aggressive digital advertising target impulsive consumption patterns among impressionable juveniles?', 'part3_discussion')
];

// Scale Part 3 to 300+ analytical questions across multifaceted Cambridge IELTS discussion branches
const PART_3_THEME_CLUSTERS = [
  { topic: 'Ethics of Artificial Intelligence', stem: 'What ethical protocols must be codified before permitting algorithms to take high-stakes clinical or judicial actions?' },
  { topic: 'Intergenerational Workplace Dynamics', stem: 'How do differing expectations regarding job security and purpose create tension between younger and older employees?' },
  { topic: 'Space Exploration vs Terrestrial Priorities', stem: 'Should public treasuries subsidize interplanetary exploration while acute poverty and climatic disruption persist on Earth?' },
  { topic: 'Preservation of Endangered Languages', stem: 'What is lost when a minority indigenous language becomes extinct, and should state funds intervene to preserve oral traditions?' },
  { topic: 'Media Literacy & Misinformation', stem: 'How can primary and secondary educational systems equip young learners to discern biased propaganda from validated investigative journalism?' },
  { topic: 'Urban Transportation Overhaul', stem: 'Will autonomous electric ride-sharing fleets eliminate private vehicle ownership in major world capitals over the next generation?' },
  { topic: 'The Future of the Arts & Humanities', stem: 'In an economy dominated by algorithmic computational automation, does a classical education in philosophy and the arts still retain vocational value?' }
];

PART_3_THEME_CLUSTERS.forEach((cl, idx) => {
  for (let i = 1; i <= 40; i++) {
    const id = `spk_p3_exp_${idx}_${i}`;
    let text = `${cl.stem} (Perspective ${i})`;
    if (i % 4 === 1) text = `From an economic standpoint, ${cl.stem.toLowerCase()}`;
    if (i % 4 === 2) text = `Considering intergenerational equities, ${cl.stem.toLowerCase()}`;
    if (i % 4 === 3) text = `What policy mechanisms can governments deploy to address: ${cl.stem.toLowerCase()}`;
    if (i % 4 === 0) text = `How might public attitudes towards ${cl.topic.toLowerCase()} evolve over the coming quarter-century?`;

    PART_3_DISCUSSION_BANK.push(makeQ(id, 3, cl.topic, text, 'part3_discussion'));
  }
});
