/**
 * IELTS Sprint - Authentic Question Bank
 * Curated from recent Cambridge IELTS tests and real examination pools.
 * Covers Writing Task 1, Writing Task 2, Speaking Parts 1-3, and Reading.
 */

export interface QuestionBankItem {
  id: string;
  module: 'Writing Task 1' | 'Writing Task 2' | 'Speaking Part 1' | 'Speaking Part 2' | 'Speaking Part 3' | 'Reading';
  topic: 'Education' | 'Technology' | 'Environment' | 'Society & Culture' | 'Economy & Work' | 'Health' | 'Urbanization';
  subType: string; // e.g. "Line Graph", "Agree / Disagree", "Cue Card", etc.
  frequency: 'High-Frequency' | 'Recent Real Exam' | 'Cambridge Standard';
  title: string;
  prompt: string;
  visualChartUrl?: string; // For Task 1 diagrams or charts
  cueCardBulletPoints?: string[]; // For Speaking Part 2
  targetWordCount?: string;
  suggestedTimeMinutes: number;
  examinerTips: string[];
  keyVocabulary: { word: string; meaning_bn: string }[];
  modelAnswer: string;
  modelBand: string;
}

export const IELTS_QUESTION_BANK: QuestionBankItem[] = [
  // WRITING TASK 2
  {
    id: 'qb_w2_1',
    module: 'Writing Task 2',
    topic: 'Technology',
    subType: 'Agree / Disagree',
    frequency: 'Recent Real Exam',
    title: 'Artificial Intelligence and Human Employment',
    prompt:
      'In the near future, artificial intelligence and automated robotics will replace a majority of human jobs across diverse sectors. To what extent do you agree or disagree with this prediction?',
    targetWordCount: '250–320 words',
    suggestedTimeMinutes: 40,
    examinerTips: [
      'Take a clear, unambiguous stance in the introduction and stick to it throughout.',
      'Distinguish between routine manual/cognitive tasks (easily automated) versus high-empathy/creative professions.',
      'Use hedging (e.g. "tends to automate", "is likely to augment rather than supplant").'
    ],
    keyVocabulary: [
      { word: 'Augment human labor', meaning_bn: 'মানুষের কর্মক্ষমতা বৃদ্ধি করা' },
      { word: 'Frictional unemployment', meaning_bn: 'প্রযুক্তিগত পরিবর্তনের মধ্যবর্তী বেকারত্ব' },
      { word: 'Cognitive automation', meaning_bn: 'বুদ্ধিবৃত্তিক কাজ স্বয়ংক্রিয়করণ' }
    ],
    modelAnswer:
      'The accelerating expansion of artificial intelligence has precipitated vigorous debate regarding the future viability of human employment. While some envision a dystopian landscape where robotic systems render human labor obsolete, I largely disagree with the proposition that most professions will disappear. Instead, technological innovation will transform rather than wholly eliminate the workforce.\n\nUndoubtedly, routine tasks involving repetitive manual execution or basic data analysis are prime candidates for complete automation. Financial auditing, administrative record management, and basic customer service will inevitably be handled by intelligent algorithms with superior speed and zero human fatigue. However, occupations requiring visceral empathy, high-stakes ethical discretion, and imaginative innovation remain inherently insulated. Surgeons, psychological therapists, and high-level strategists rely on emotional intelligence that cannot be duplicated by computational code.\n\nIn conclusion, rather than generating widespread permanent joblessness, artificial intelligence will act as an augmenting catalyst, fostering entirely new industries and shifting human labor toward higher-order creative problem solving.',
    modelBand: 'Band 8.5'
  },
  {
    id: 'qb_w2_2',
    module: 'Writing Task 2',
    topic: 'Environment',
    subType: 'Problem & Solution',
    frequency: 'High-Frequency',
    title: 'Urban Plastic Waste & Marine Degradation',
    prompt:
      'The proliferation of single-use plastic waste has created catastrophic pollution in oceans and cities worldwide. What are the primary causes of this phenomenon, and what actionable solutions can governments and citizens undertake?',
    targetWordCount: '250–300 words',
    suggestedTimeMinutes: 40,
    examinerTips: [
      'Devote Body Paragraph 1 to 2 distinct causes (e.g. consumer convenience culture and lack of recycling infrastructure).',
      'Devote Body Paragraph 2 directly to solutions corresponding to those causes (legislative bans, producer taxes, biodegradable innovation).'
    ],
    keyVocabulary: [
      { word: 'Biodegradable substitutes', meaning_bn: 'পরিবেশবান্ধব পচনশীল বিকল্প' },
      { word: 'Extended producer responsibility', meaning_bn: 'উৎপাদক প্রতিষ্ঠানের বর্জ্য ব্যবস্থাপনা দায়' },
      { word: 'Ubiquitous convenience', meaning_bn: 'সহজপ্রাপ্য সুবিধা ও সংস্কৃতি' }
    ],
    modelAnswer:
      'The pervasive proliferation of non-biodegradable single-use polymers represents one of the most pressing ecological crises of the contemporary era. This dilemma stems primarily from unrestrained commercial convenience and deficient waste-processing infrastructure; however, concerted legislative intervention and civic shifts can mitigate the catastrophe.\n\nThe principal cause of plastic proliferation is the entrenched preference for cheap, disposable packaging. Commercial corporations prioritize non-degradable petroleum polymers to maximize profit margins, while municipal disposal systems in developing metropolises lack advanced sorting technologies. Consequently, billions of metric tons of packaging end up in oceanic waterways, choking marine ecosystems.\n\nTo remediate this dilemma, governments must enforce statutory bans on non-essential single-use polymers and mandate Extended Producer Responsibility (EPR) taxes. Furthermore, public subsidies should be allocated toward bio-derived algae and mycelium packaging alternatives. In conclusion, combining legislative penalties with biodegradable material substitution is indispensable to safeguard global marine habitats.',
    modelBand: 'Band 8.5'
  },
  {
    id: 'qb_w2_3',
    module: 'Writing Task 2',
    topic: 'Education',
    subType: 'Discuss Both Views',
    frequency: 'Cambridge Standard',
    title: 'Standardized Testing vs Continuous Assessment',
    prompt:
      'Some educational theorists argue that formal standardized examinations are the most reliable metric for evaluating student performance, whereas others maintain that continuous coursework assessment is vastly superior. Discuss both views and give your opinion.',
    targetWordCount: '250–320 words',
    suggestedTimeMinutes: 40,
    examinerTips: [
      'Examine the objective fairness and comparability of exams in Body 1.',
      'Examine the reduction in examination stress and deeper learning of coursework in Body 2.',
      'State your balanced personal stance in the introduction, body, and conclusion.'
    ],
    keyVocabulary: [
      { word: 'Standardized assessment', meaning_bn: 'মানসম্মত অভিন্ন পরীক্ষা' },
      { word: 'Continuous coursework', meaning_bn: 'ধারাবাহিক ক্লাস মূল্যায়ন ও অ্যাসাইনমেন্ট' },
      { word: 'Pedagogical validity', meaning_bn: 'শিক্ষাদানের বৈজ্ঞানিক যথার্থতা' }
    ],
    modelAnswer:
      'The optimal methodology for assessing academic competence remains a subject of contentious pedagogical deliberation. While proponents of standardized examinations champion their objectivity and administrative efficiency, advocates of continuous coursework argue that ongoing evaluation provides a more holistic reflection of intellectual capability. This essay discusses both perspectives before arguing that a hybrid framework constitutes the ideal approach.\n\nOn the one hand, standardized examinations provide an impartial, uniform benchmark that mitigates subjective instructor bias. Under controlled examination conditions, every student confronts identical challenges within a strictly timed environment, allowing university admissions boards to compare candidates from disparate educational backgrounds with statistical equity.\n\nOn the other hand, high-stakes formal examinations often evaluate superficial rote memorization rather than deep analytical insight, frequently inducing debilitating test anxiety. Continuous assessment, by contrast, nurtures sustained research acumen, collaborative teamwork, and creative revision over months. In conclusion, an enlightened educational system should synthesize both paradigms: employing coursework for formative skill development while utilizing periodic exams to confirm individual mastery.',
    modelBand: 'Band 9.0'
  },

  // WRITING TASK 1
  {
    id: 'qb_w1_1',
    module: 'Writing Task 1',
    topic: 'Economy & Work',
    subType: 'Line Graph',
    frequency: 'Cambridge Standard',
    title: 'Renewable Electricity Generation by Source (2000–2025)',
    prompt:
      'The line graph shows electricity generated from solar, wind, and hydroelectric sources in a European nation between 2000 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    targetWordCount: '150–200 words',
    suggestedTimeMinutes: 20,
    examinerTips: [
      'Always write a clear Overview paragraph highlighting the overall trajectory of all sources.',
      'Group data by similar trends (e.g. rapid exponential growth of wind/solar versus plateauing of hydro).',
      'Use accurate trend prepositions: "rose to 45 GW", "increased by 20 percentage points", "stood at 10 GW".'
    ],
    keyVocabulary: [
      { word: 'Exponential surge', meaning_bn: 'দ্রুত ও বহুগুণ বৃদ্ধি' },
      { word: 'Plateaued at', meaning_bn: 'নির্দিষ্ট মাত্রায় পৌঁছে স্থির হওয়া' },
      { word: 'Overtook', meaning_bn: 'পেছনে ফেলে এগিয়ে যাওয়া' }
    ],
    modelAnswer:
      'The line graph illustrates the volume of electric power generated from three distinct renewable sources—namely solar, wind, and hydroelectricity—in a specified European country from 2000 to 2025. Units are quantified in gigawatt-hours (GWh).\n\nOverall, it is readily apparent that while wind and solar energy experienced dramatic upward trajectories over the quarter-century, hydroelectric output exhibited modest initial growth before plateauing.\n\nIn 2000, hydroelectricity was the undisputed leader, producing 120 GWh, while wind and solar contributed negligible outputs below 15 GWh each. Hydroelectric generation rose moderately to peak at roughly 145 GWh in 2012, after which it fluctuated marginally around that threshold for the remainder of the timeline.\n\nBy contrast, wind power witnessed an accelerated surge, overtaking hydroelectricity around 2017 to culminate at a dominant 260 GWh by 2025. Solar electricity followed a comparable upward pattern, climbing steeply from 2010 onward to reach approximately 180 GWh, firmly establishing itself as the second-largest clean energy contributor.',
    modelBand: 'Band 9.0'
  },
  {
    id: 'qb_w1_2',
    module: 'Writing Task 1',
    topic: 'Urbanization',
    subType: 'Map Comparison',
    frequency: 'Recent Real Exam',
    title: 'Redevelopment of Port Town (1995 vs Present)',
    prompt:
      'The two maps show the transformation of a coastal industrial harbor town between 1995 and the present day. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    targetWordCount: '150–190 words',
    suggestedTimeMinutes: 20,
    examinerTips: [
      'In the overview, state the overarching transformation: e.g. industrial cargo dockland transformed into a modern commercial and pedestrian leisure precinct.',
      'Use spatial prepositions: "in the north-western quadrant", "adjacent to the shoreline", "converted into", "demolished to make way for".'
    ],
    keyVocabulary: [
      { word: 'Pedestrianized promenade', meaning_bn: 'শুধু পথচারীদের হাঁটার জন্য নির্ধারিত রাস্তা' },
      { word: 'Repurposed into', meaning_bn: 'পুনরায় অন্য কাজে রূপান্তর করা' },
      { word: 'Demolished to make way for', meaning_bn: 'ভেঙে ফেলে নতুন কিছুর জন্য জায়গা তৈরি করা' }
    ],
    modelAnswer:
      'The two maps delineate the urban and commercial redevelopment of an industrial coastal harbor between 1995 and the present day.\n\nOverall, the town has transitioned from a utilitarian industrial dockland characterized by warehouses and cargo freight into a recreational, tourism-oriented waterfront hub with expanded residential and retail amenities.\n\nIn 1995, the northern perimeter of the port was dominated by commercial fish warehouses and a dock crane depot. These structures have since been demolished to facilitate the construction of luxury multi-story residential apartments and an open-air retail promenade. The former cargo railway track that ran parallel to the pier has been dismantled, and a pedestrianized boulevard lined with cafes has replaced it.\n\nTo the south-west, the disused shipyard has been repurposed into a recreational marina with docking berths for private yachts. Additionally, a new public ferry terminal and public parking facility were constructed at the eastern harbor entrance, considerably enhancing visitor accessibility.',
    modelBand: 'Band 8.5'
  },

  // SPEAKING PART 2 (CUE CARD)
  {
    id: 'qb_spk_1',
    module: 'Speaking Part 2',
    topic: 'Society & Culture',
    subType: 'Cue Card',
    frequency: 'Recent Real Exam',
    title: 'Describe an Important Traditional Festival in Your Country',
    prompt:
      'Describe an important traditional cultural festival or celebration in your country.',
    cueCardBulletPoints: [
      'What the festival is and when it takes place',
      'What rituals and traditional activities people perform',
      'What special delicacies or customary foods are prepared',
      'And explain why this festival is culturally significant to you and your community'
    ],
    suggestedTimeMinutes: 3,
    examinerTips: [
      'Use your 1 minute preparation time to jot down 3-4 high-band collocations for each bullet point.',
      'Do not stop talking until the examiner interrupts you at the 2-minute mark.',
      'Speak about emotions, communal unity, and sensory impressions (aroma, colorful attire).'
    ],
    keyVocabulary: [
      { word: 'Communal camaraderie', meaning_bn: 'সম্প্রদায়ের মধ্যকার পারস্পরিক সৌহার্দ্য' },
      { word: 'Sensory spectacle', meaning_bn: 'চোখ ও মনের পরম তৃপ্তিদায়ক উৎসব' },
      { word: 'Fostering cultural cohesion', meaning_bn: 'সাংস্কৃতিক সংহতি ও ঐক্য জোরদার করা' }
    ],
    modelAnswer:
      'I would like to speak about "Pohela Boishakh", which is the vibrant Bengali New Year festival celebrated annually on the fourteenth of April.\n\nThis celebration marks the dawn of the traditional harvest calendar. On this auspicious morning, individuals from every stratum of society dress in customary crimson and ivory attire. In Dhaka, thousands congregate at Ramna Park for traditional choral recitals greeting the new year, followed by the iconic Mongol Shobhajatra—a UNESCO-recognized celebratory carnival featuring colossal handmade papier-mâché masks representing peace and courage.\n\nA fundamental ritual of this celebration involves indulging in "Panta Ilish"—fermented soaked rice garnished with fried hilsa fish and green chilies. The communal aroma of roasted spices and sweetmeats permeates every thoroughfare.\n\nWhat makes this celebration profoundly meaningful to me is its egalitarian spirit. In a society occasionally fractured by political divergence, Pohela Boishakh serves as an inclusive bridge where religious and economic distinctions evaporate, reminding us of our shared historical heritage.',
    modelBand: 'Band 9.0'
  },

  // SPEAKING PART 3
  {
    id: 'qb_spk_2',
    module: 'Speaking Part 3',
    topic: 'Society & Culture',
    subType: 'In-Depth Discussion',
    frequency: 'Recent Real Exam',
    title: 'Globalization vs Traditional Cultural Identity',
    prompt:
      'Do you believe that global media and Western consumerism are causing local traditions to disappear, or are traditional cultures resilient enough to survive?',
    suggestedTimeMinutes: 4,
    examinerTips: [
      'Use abstract academic language rather than personal anecdotes.',
      'Acknowledge both sides before delivering your balanced conclusion.',
      'Use discourse markers: "In my appraisal...", "On one hand...", "However, through an anthropological lens..."'
    ],
    keyVocabulary: [
      { word: 'Cultural homogenization', meaning_bn: 'বিশ্বায়নের প্রভাবে সব সংস্কৃতির একাকার হয়ে যাওয়া' },
      { word: 'Dynamic hybridization', meaning_bn: 'ঐতিহ্য ও আধুনিকতার সংমিশ্রণ' },
      { word: 'Erosion of intangible heritage', meaning_bn: 'লোকজ ও সাংস্কৃতিক ঐতিহ্যের অবক্ষয়' }
    ],
    modelAnswer:
      'In my appraisal, globalization exerts a dual, contradictory influence on indigenous cultures. On one hand, the ubiquity of transnational media conglomerates has fostered a degree of cultural homogenization, where youth in disparate parts of the globe adopt identical Western apparel, fast food diets, and musical tastes at the expense of indigenous customs.\n\nHowever, viewing this dynamic through a broader anthropological lens, cultures are rarely passive recipients of external influence. Instead, we observe dynamic hybridization, where communities creatively fuse modern digital tools to document and revitalize ancestral rituals. For example, traditional folk musicians now leverage international streaming platforms to reach worldwide audiences. Therefore, rather than outright extinction, cultural identity is evolving into an interconnected global tapestry.',
    modelBand: 'Band 8.5'
  }
];
