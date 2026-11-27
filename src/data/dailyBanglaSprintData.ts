export type SprintQuotaTier = 'standard' | 'light';

export interface DailySprintVocabItem {
  id: string;
  word: string;
  phonetic: string;
  pos: 'Verb' | 'Noun' | 'Adjective' | 'Adverb';
  bandLevel: 'Band 7.5' | 'Band 8.0' | 'Band 8.5' | 'Band 9.0';
  banglaMeaning: string;
  englishDefinition: string;
  synonyms: string[];
  exampleSentence: string;
  banglaTip: string;
}

export interface DailySprintIdiomItem {
  id: string;
  idiom: string;
  banglaMeaning: string;
  naturalMeaning: string;
  usageTip: string;
  exampleSentence: string;
  speakingPart: 'Part 1' | 'Part 2' | 'Part 3' | 'Parts 2 & 3';
}

export interface DailySprintPhraseItem {
  id: string;
  phrase: string;
  category: 'Writing Task 2' | 'Speaking Part 3' | 'Academic Collocation' | 'Writing Task 1';
  banglaMeaning: string;
  englishFunction: string;
  synonyms: string[];
  exampleSentence: string;
}

export interface DailySprintSpellingItem {
  id: string;
  word: string;
  phonetic: string;
  banglaMeaning: string;
  trapNote: string;
  sectionContext: 'Listening Sec 1' | 'Listening Sec 2' | 'Listening Sec 3' | 'Listening Sec 4' | 'Writing Task 2';
}

export interface DailySprintGrammarRule {
  id: string;
  title: string;
  bandImpact: string;
  englishExplanation: string;
  banglaExplanation: string;
  commonMistake: string;
  band8Correction: string;
  whyItMattersBangla: string;
  quickCheck: {
    question: string;
    options: string[];
    correctIndex: number;
    explanationBangla: string;
  };
}

export type MasteryExamSectionId = 'vocabulary' | 'idioms_phrases' | 'spelling' | 'grammar';

export interface DailyMasteryExamQuestion {
  id: string;
  section: MasteryExamSectionId;
  sectionLabel: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  targetTerm: string;
  banglaMeaning: string;
  explanationEnglish: string;
  explanationBangla: string;
}

export const DAILY_SPRINT_VOCABULARY: DailySprintVocabItem[] = [
  {
    id: 'v1',
    word: 'Mitigate',
    phonetic: '/ˈmɪt.ɪ.ɡeɪt/',
    pos: 'Verb',
    bandLevel: 'Band 8.0',
    banglaMeaning: 'প্রশমিত করা / ক্ষতির তীব্রতা কমানো',
    englishDefinition: 'To make something less harmful, unpleasant, or severe.',
    synonyms: ['Alleviate', 'Attenuate', 'Curb', 'Lessen'],
    exampleSentence: 'Governments must invest in green infrastructure to mitigate the impacts of climate change.',
    banglaTip: 'Writing Task 2-তে "reduce problem"-এর বদলে "mitigate the severity of" ব্যবহার করলে Lexical Resource স্কোর বাড়ে।'
  },
  {
    id: 'v2',
    word: 'Exacerbate',
    phonetic: '/ɪɡˈzæs.ə.beɪt/',
    pos: 'Verb',
    bandLevel: 'Band 8.5',
    banglaMeaning: 'আরও শোচনীয় বা খারাপ করা / বাড়িয়ে তোলা',
    englishDefinition: 'To make a bad situation, problem, or negative feeling much worse.',
    synonyms: ['Aggravate', 'Compound', 'Intensify', 'Worsen'],
    exampleSentence: 'Unplanned rapid urbanization can exacerbate traffic congestion in megacities like Dhaka.',
    banglaTip: '"Make worse"-এর উচ্চমানের একাডেমিক প্রতিশব্দ হলো exacerbate।'
  },
  {
    id: 'v3',
    word: 'Ubiquitous',
    phonetic: '/juːˈbɪk.wɪ.təs/',
    pos: 'Adjective',
    bandLevel: 'Band 8.5',
    banglaMeaning: 'সর্বব্যাপী / যা সব জায়গায় দেখা যায়',
    englishDefinition: 'Seeming to be present or found everywhere at the same time.',
    synonyms: ['Omnipresent', 'Pervasive', 'Universal', 'Widespread'],
    exampleSentence: 'Smartphones have become ubiquitous in modern classrooms across developing nations.',
    banglaTip: 'Technology বা Social Media নিয়ে Essay লেখার সময় "found everywhere"-এর বদলে ubiquitous দারুণ কার্যকর।'
  },
  {
    id: 'v4',
    word: 'Proliferation',
    phonetic: '/prəˌlɪf.əˈreɪ.ʃən/',
    pos: 'Noun',
    bandLevel: 'Band 8.5',
    banglaMeaning: 'দ্রুত বংশবৃদ্ধি বা সংখ্যায় ব্যাপক প্রসার',
    englishDefinition: 'A rapid increase in the number or amount of something.',
    synonyms: ['Escalation', 'Expansion', 'Multiplication', 'Surge'],
    exampleSentence: 'The proliferation of misinformation online poses a serious threat to public health.',
    banglaTip: 'কোনো কিছুর দ্রুত ছড়িয়ে পড়া বোঝাতে "the proliferation of + noun" ব্যবহার করুন।'
  },
  {
    id: 'v5',
    word: 'Detrimental',
    phonetic: '/ˌdet.rɪˈmen.təl/',
    pos: 'Adjective',
    bandLevel: 'Band 7.5',
    banglaMeaning: 'ক্ষতিকর / অনিষ্টকর',
    englishDefinition: 'Tending to cause harm or negative consequences.',
    synonyms: ['Adverse', 'Deleterious', 'Harmful', 'Pernicious'],
    exampleSentence: 'Excessive screen time has a detrimental effect on adolescents’ sleep quality.',
    banglaTip: 'মনে রাখবেন: detrimental-এর পরে সর্বদা preposition হিসেবে "to" বসে (detrimental to health)।'
  },
  {
    id: 'v6',
    word: 'Indispensable',
    phonetic: '/ˌɪn.dɪˈspen.sə.bəl/',
    pos: 'Adjective',
    bandLevel: 'Band 8.0',
    banglaMeaning: 'অপরিহার্য / যা ছাড়া চলা অসম্ভব',
    englishDefinition: 'Absolutely necessary; too important to be without.',
    synonyms: ['Essential', 'Imperative', 'Integral', 'Vital'],
    exampleSentence: 'Digital literacy has become an indispensable skill for today’s university graduates.',
    banglaTip: '"Very important"-এর পরিবর্তে indispensable ব্যবহার করলে বাক্য অনেক বেশি শক্তিশালী হয়।'
  },
  {
    id: 'v7',
    word: 'Pragmatic',
    phonetic: '/præɡˈmæt.ɪk/',
    pos: 'Adjective',
    bandLevel: 'Band 8.0',
    banglaMeaning: 'বাস্তবধর্মী / প্রয়োগিক',
    englishDefinition: 'Dealing with things sensibly and realistically in a practical way.',
    synonyms: ['Practical', 'Realistic', 'Sensible', 'Utilitarian'],
    exampleSentence: 'Policymakers need a pragmatic approach to balancing economic growth with environmental protection.',
    banglaTip: 'Task 2-এর Conclusion বা Solution প্যারাগ্রাফে "a pragmatic solution" ফ্রেজটি ব্যবহার করতে পারেন।'
  },
  {
    id: 'v8',
    word: 'Catalyst',
    phonetic: '/ˈkæt.əl.ɪst/',
    pos: 'Noun',
    bandLevel: 'Band 8.0',
    banglaMeaning: 'অনুঘটক / যা দ্রুত পরিবর্তন ঘটায়',
    englishDefinition: 'An event or factor that causes an important change or action to happen more quickly.',
    synonyms: ['Impetus', 'Incentive', 'Spark', 'Stimulus'],
    exampleSentence: 'Remote work acted as a catalyst for digital transformation across the banking sector.',
    banglaTip: '"Act as a catalyst for..." একটি চমৎকার Band 8+ Collocation।'
  },
  {
    id: 'v9',
    word: 'Disparity',
    phonetic: '/dɪˈspær.ə.ti/',
    pos: 'Noun',
    bandLevel: 'Band 8.0',
    banglaMeaning: 'বৈষম্য / বড় ব্যবধান বা অসামঞ্জস্য',
    englishDefinition: 'A noticeable and often unfair difference between two or more groups.',
    synonyms: ['Discrepancy', 'Gap', 'Imbalance', 'Inequality'],
    exampleSentence: 'There remains a stark disparity between urban and rural healthcare facilities.',
    banglaTip: 'ধনী-গরিব বা শহর-গ্রামের বৈষম্য বোঝাতে "socio-economic disparity" ব্যবহার করুন।'
  },
  {
    id: 'v10',
    word: 'Substantiate',
    phonetic: '/səbˈstæn.ʃi.eɪt/',
    pos: 'Verb',
    bandLevel: 'Band 8.5',
    banglaMeaning: 'প্রমাণ বা তথ্য দিয়ে সত্যতা প্রতিষ্ঠা করা',
    englishDefinition: 'To provide evidence to support or prove the truth of a claim.',
    synonyms: ['Corroborate', 'Validate', 'Verify', 'Confirm'],
    exampleSentence: 'The researchers failed to substantiate their hypothesis with empirical data.',
    banglaTip: 'Reading ও Writing-এ কোনো দাবি প্রমাণ করা অর্থে substantiate ব্যবহৃত হয়।'
  },
  {
    id: 'v11',
    word: 'Unprecedented',
    phonetic: '/ʌnˈpres.ɪ.den.tɪd/',
    pos: 'Adjective',
    bandLevel: 'Band 8.0',
    banglaMeaning: 'নজিরবিহীন / অভূতপূর্ব',
    englishDefinition: 'Never having happened or existed in the past.',
    synonyms: ['Unparalleled', 'Unmatched', 'Extraordinary', 'Novel'],
    exampleSentence: 'Technological innovation is advancing at an unprecedented pace in the twenty-first century.',
    banglaTip: '"At an unprecedented rate/pace" ফ্রেজটি Task 1 ও Task 2 উভয় জায়গায় ব্যবহারযোগ্য।'
  },
  {
    id: 'v12',
    word: 'Viable',
    phonetic: '/ˈvaɪ.ə.bəl/',
    pos: 'Adjective',
    bandLevel: 'Band 7.5',
    banglaMeaning: 'কার্যকর / বাস্তবে টিকে থাকতে বা সফল হতে সক্ষম',
    englishDefinition: 'Capable of working successfully; feasible.',
    synonyms: ['Feasible', 'Workable', 'Achievable', 'Sustainable'],
    exampleSentence: 'Solar power is now a financially viable alternative to fossil fuels.',
    banglaTip: 'বিকল্প সমাধান বোঝাতে "a viable alternative" একটি অত্যন্ত জনপ্রিয় IELTS Collocation।'
  },
  {
    id: 'v13',
    word: 'Jeopardize',
    phonetic: '/ˈdʒep.ə.daɪz/',
    pos: 'Verb',
    bandLevel: 'Band 8.0',
    banglaMeaning: 'বিপন্ন করা / ঝুঁকির মুখে ফেলা',
    englishDefinition: 'To put someone or something into a situation in which there is a danger of loss or harm.',
    synonyms: ['Endanger', 'Imperil', 'Threaten', 'Compromise'],
    exampleSentence: 'Cutting educational funding could jeopardize the future prosperity of the nation.',
    banglaTip: 'ব্রিটিশ বানানে "jeopardise" এবং আমেরিকান বানানে "jeopardize" উভয়ই IELTS-এ গ্রহণযোগ্য।'
  },
  {
    id: 'v14',
    word: 'Foster',
    phonetic: '/ˈfɒs.tər/',
    pos: 'Verb',
    bandLevel: 'Band 7.5',
    banglaMeaning: 'লালন করা / উৎসাহিত বা বিকশিত করা',
    englishDefinition: 'To encourage the development or growth of ideas or feelings.',
    synonyms: ['Cultivate', 'Encourage', 'Nurture', 'Promote'],
    exampleSentence: 'Collaborative school projects help foster critical thinking and teamwork among pupils.',
    banglaTip: 'ইতিবাচক গুণাবলি গড়ে তোলা বোঝাতে "foster innovation / foster social cohesion" ব্যবহার করুন।'
  },
  {
    id: 'v15',
    word: 'Sedentary',
    phonetic: '/ˈsed.ən.tər.i/',
    pos: 'Adjective',
    bandLevel: 'Band 8.0',
    banglaMeaning: 'শারীরিক পরিশ্রমহীন / বসে বসে কাটানো',
    englishDefinition: 'Involving little physical exercise or activity; spending much time seated.',
    synonyms: ['Inactive', 'Desk-bound', 'Stationary', 'Motionless'],
    exampleSentence: 'A sedentary lifestyle is one of the primary contributors to obesity and cardiovascular disease.',
    banglaTip: 'Health ও Modern Lifestyle টপিকে "a sedentary lifestyle" ফ্রেজটি প্রায় অপরিহার্য।'
  },
  {
    id: 'v16',
    word: 'Conducive',
    phonetic: '/kənˈdjuː.sɪv/',
    pos: 'Adjective',
    bandLevel: 'Band 8.5',
    banglaMeaning: 'সহায়ক / অনুকূল',
    englishDefinition: 'Making a certain situation or outcome likely or possible.',
    synonyms: ['Favorable', 'Beneficial', 'Helpful', 'Advantageous'],
    exampleSentence: 'A quiet library environment is highly conducive to deep academic concentration.',
    banglaTip: 'গঠনটি মনে রাখুন: "conducive to + Noun / V-ing" (যেমন: conducive to learning)।'
  },
  {
    id: 'v17',
    word: 'Deteriorate',
    phonetic: '/dɪˈtɪə.ri.ə.reɪt/',
    pos: 'Verb',
    bandLevel: 'Band 7.5',
    banglaMeaning: 'ক্রমশ অবনতি হওয়া বা খারাপ হয়ে যাওয়া',
    englishDefinition: 'To become progressively worse over time.',
    synonyms: ['Decline', 'Degenerate', 'Worsen', 'Degrade'],
    exampleSentence: 'Air quality in industrial zones continues to deteriorate due to unregulated emissions.',
    banglaTip: 'বানান খেয়াল রাখুন: de-te-ri-o-rate (অনেকে ভুল করে detoriate লেখেন)।'
  },
  {
    id: 'v18',
    word: 'Repercussion',
    phonetic: '/ˌriː.pəˈkʌʃ.ən/',
    pos: 'Noun',
    bandLevel: 'Band 8.5',
    banglaMeaning: 'বিরূপ প্রতিক্রিয়া বা সুদূরপ্রসারী ফলাফল',
    englishDefinition: 'An unintended, usually negative consequence occurring some time after an event.',
    synonyms: ['Ramification', 'Consequence', 'Fallout', 'Aftermath'],
    exampleSentence: 'Deforestation has severe ecological repercussions for biodiversity and rainfall patterns.',
    banglaTip: 'সাধারণত বহুবচনে ব্যবহৃত হয়: "far-reaching repercussions" (সুদূরপ্রসারী বিরূপ প্রভাব)।'
  },
  {
    id: 'v19',
    word: 'bolster',
    phonetic: '/ˈbəʊl.stər/',
    pos: 'Verb',
    bandLevel: 'Band 8.0',
    banglaMeaning: 'শক্তিশালী করা / সমর্থন জোগানো',
    englishDefinition: 'To support, strengthen, or improve something.',
    synonyms: ['Reinforce', 'Fortify', 'Strengthen', 'Buttress'],
    exampleSentence: 'Vocational training programs can bolster youth employment in emerging economies.',
    banglaTip: '"Bolster the economy" বা "bolster public confidence" খুবই স্বাভাবিক C1 ফ্রেজ।'
  },
  {
    id: 'v20',
    word: 'Paradigm',
    phonetic: '/ˈpær.ə.daɪm/',
    pos: 'Noun',
    bandLevel: 'Band 8.5',
    banglaMeaning: 'দৃষ্টান্ত / চিন্তাভাবনার প্রতিষ্ঠিত কাঠামো',
    englishDefinition: 'A typical example, pattern, or model of something.',
    synonyms: ['Framework', 'Model', 'Archetype', 'Standard'],
    exampleSentence: 'Artificial intelligence has triggered a paradigm shift in how students access knowledge.',
    banglaTip: '"A paradigm shift" (চিন্তা বা ব্যবস্থার আমূল পরিবর্তন) Speaking Part 3 ও Writing Task 2-তে দারুণ মানায়।'
  }
];

export const DAILY_SPRINT_IDIOMS: DailySprintIdiomItem[] = [
  {
    id: 'i1',
    idiom: 'A double-edged sword',
    banglaMeaning: 'দুধারী তলোয়ার (যার ভালো ও খারাপ উভয় দিকই আছে)',
    naturalMeaning: 'Something that has both significant advantages and drawbacks at the same time.',
    usageTip: 'Ideal for Speaking Part 3 when weighing pros and cons of technology or globalization.',
    exampleSentence: 'Social media is a double-edged sword; it connects people globally but can also fuel isolation.',
    speakingPart: 'Part 3'
  },
  {
    id: 'i2',
    idiom: 'The tip of the iceberg',
    banglaMeaning: 'বিশাল কোনো সমস্যার দৃশ্যমান ক্ষুদ্র অংশ',
    naturalMeaning: 'Only a small, noticeable part of a much larger hidden problem.',
    usageTip: 'Great for Speaking Part 3 discussions on environmental or social issues.',
    exampleSentence: 'Plastic litter on beaches is merely the tip of the iceberg when it comes to marine pollution.',
    speakingPart: 'Part 3'
  },
  {
    id: 'i3',
    idiom: 'Burn the midnight oil',
    banglaMeaning: 'রাত জেগে কঠোর পড়াশোনা বা কাজ করা',
    naturalMeaning: 'To read, study, or work late into the night.',
    usageTip: 'Natural for Speaking Part 1 or Part 2 when describing exam preparation or deadlines.',
    exampleSentence: 'Before my final university exams, I had to burn the midnight oil for two weeks straight.',
    speakingPart: 'Parts 2 & 3'
  },
  {
    id: 'i4',
    idiom: 'Once in a blue moon',
    banglaMeaning: 'কদাচিৎ / খুবই কম ঘটে এমন',
    naturalMeaning: 'Happening very rarely.',
    usageTip: 'Use in Speaking Part 1 when asked how often you do an uncommon hobby or activity.',
    exampleSentence: 'Since I moved to Dhaka for work, I only get to visit my ancestral village once in a blue moon.',
    speakingPart: 'Part 1'
  },
  {
    id: 'i5',
    idiom: 'Hit the nail on the head',
    banglaMeaning: 'একদম সঠিক বা মূল কথাটি বলা',
    naturalMeaning: 'To describe exactly what is causing a situation or problem.',
    usageTip: 'Use in Speaking Part 3 to agree strongly with a point or summarize an insight.',
    exampleSentence: 'My mentor hit the nail on the head when he said consistency matters more than cramming.',
    speakingPart: 'Parts 2 & 3'
  },
  {
    id: 'i6',
    idiom: 'A blessing in disguise',
    banglaMeaning: 'আপাতদৃষ্টিতে খারাপ মনে হলেও পরবর্তীতে যা মঙ্গলজনক প্রমাণিত হয়',
    naturalMeaning: 'An apparent misfortune that eventually has good results.',
    usageTip: 'High-scoring storytelling idiom for Speaking Part 2 cue cards about difficult experiences.',
    exampleSentence: 'Missing that train turned out to be a blessing in disguise because I met my future business partner at the station.',
    speakingPart: 'Part 2'
  },
  {
    id: 'i7',
    idiom: 'Cost an arm and a leg',
    banglaMeaning: 'অত্যন্ত ব্যয়বহুল বা চড়া মূল্যের হওয়া',
    naturalMeaning: 'To be extremely expensive.',
    usageTip: 'Use in Speaking Part 1/2 for shopping, travel, or housing costs (avoid in Academic Writing!).',
    exampleSentence: 'Renting an apartment in the diplomatic zone costs an arm and a leg nowadays.',
    speakingPart: 'Part 1'
  },
  {
    id: 'i8',
    idiom: 'Bridge the gap',
    banglaMeaning: 'ব্যবধান বা দূরত্ব ঘোচানো',
    naturalMeaning: 'To reduce the difference between two groups, generations, or situations.',
    usageTip: 'Versatile enough for both Speaking Part 3 and semi-formal Writing Task 2.',
    exampleSentence: ' Rural internet access can help bridge the gap between metropolitan and village schools.',
    speakingPart: 'Part 3'
  },
  {
    id: 'i9',
    idiom: 'Step out of one’s comfort zone',
    banglaMeaning: 'নিজের চেনা বা আরামদায়ক গণ্ডির বাইরে গিয়ে নতুন চ্যালেঞ্জ নেওয়া',
    naturalMeaning: 'To do something unfamiliar or challenging that pushes personal growth.',
    usageTip: 'Perfect for Speaking Part 2 prompts about learning a new skill or overcoming fear.',
    exampleSentence: 'Joining the university debate club forced me to step out of my comfort zone.',
    speakingPart: 'Part 2'
  },
  {
    id: 'i10',
    idiom: 'Food for thought',
    banglaMeaning: 'গভীরভাবে চিন্তা করার মতো বিষয়',
    naturalMeaning: 'Something that warrants serious consideration or reflection.',
    usageTip: 'Use in Speaking Part 2/3 when discussing books, documentaries, or lectures.',
    exampleSentence: 'The documentary on sustainable garment factories gave me plenty of food for thought.',
    speakingPart: 'Parts 2 & 3'
  }
];

export const DAILY_SPRINT_PHRASES: DailySprintPhraseItem[] = [
  {
    id: 'p1',
    phrase: 'Play a pivotal role in',
    category: 'Academic Collocation',
    banglaMeaning: 'অত্যন্ত গুরুত্বপূর্ণ বা কেন্দ্রীয় ভূমিকা পালন করা',
    englishFunction: 'Expresses central importance in Writing Task 2 and Speaking Part 3.',
    synonyms: ['Be instrumental in', 'Serve as a cornerstone of'],
    exampleSentence: 'Early childhood education plays a pivotal role in shaping cognitive development.'
  },
  {
    id: 'p2',
    phrase: 'While it is undeniably true that..., I contend that...',
    category: 'Writing Task 2',
    banglaMeaning: 'যদিও এটি অনস্বীকার্যভাবে সত্য যে..., আমি মনে করি যে...',
    englishFunction: 'Band 8+ concession + thesis frame for Discussion / Opinion essays.',
    synonyms: ['Granted that..., it remains clear that...'],
    exampleSentence: 'While it is undeniably true that tourism generates revenue, I contend that fragile ecosystems must be protected.'
  },
  {
    id: 'p3',
    phrase: 'Bear the brunt of',
    category: 'Academic Collocation',
    banglaMeaning: 'কোনো দুর্যোগ বা খারাপ পরিস্থিতির প্রধান আঘাত সহ্য করা',
    englishFunction: 'Describes who suffers the worst impact of a crisis or policy.',
    synonyms: ['Suffer the worst impact of', 'Endure the primary burden of'],
    exampleSentence: 'Low-lying coastal communities in Bangladesh often bear the brunt of rising sea levels.'
  },
  {
    id: 'p4',
    phrase: 'From a socioeconomic standpoint,',
    category: 'Speaking Part 3',
    banglaMeaning: 'আর্থ-সামাজিক দৃষ্টিকোণ থেকে বিচার করলে,',
    englishFunction: 'Frames an analytical argument clearly in Speaking Part 3 or Writing Task 2.',
    synonyms: ['From an economic perspective,', 'In terms of social welfare,'],
    exampleSentence: 'From a socioeconomic standpoint, investing in public transit benefits lower-income commuters most.'
  },
  {
    id: 'p5',
    phrase: 'A myriad of factors contribute to',
    category: 'Writing Task 2',
    banglaMeaning: 'অসংখ্য কারণ এর পেছনে অবদান রাখে',
    englishFunction: 'Replaces weak openers like "Many reasons cause..." in Cause/Effect essays.',
    synonyms: ['A multitude of variables drive', 'A wide array of factors underpin'],
    exampleSentence: 'A myriad of factors contribute to the brain drain of skilled engineers from developing countries.'
  },
  {
    id: 'p6',
    phrase: ' witnessed a pronounced upward trajectory',
    category: 'Writing Task 1',
    banglaMeaning: 'উল্লেখযোগ্য ঊর্ধ্বমুখী প্রবণতা প্রত্যক্ষ করেছে',
    englishFunction: 'High-band Task 1 line-graph trend description replacing "went up a lot".',
    synonyms: ['Experienced a substantial surge', 'Registered a marked increase'],
    exampleSentence: 'Between 2015 and 2023, renewable energy generation witnessed a pronounced upward trajectory.'
  },
  {
    id: 'p7',
    phrase: 'Strike a delicate balance between',
    category: 'Academic Collocation',
    banglaMeaning: 'দুটি বিষয়ের মধ্যে সূক্ষ্ম ভারসাম্য বজায় রাখা',
    englishFunction: 'Essential for Task 2 conclusions and balanced opinion paragraphs.',
    synonyms: ['Maintain an equilibrium between', 'Reconcile the demands of'],
    exampleSentence: 'Modern professionals struggle to strike a delicate balance between career ambition and family life.'
  },
  {
    id: 'p8',
    phrase: 'By the same token,',
    category: 'Writing Task 2',
    banglaMeaning: 'ঠিক একই কারণে / একইভাবে,',
    englishFunction: 'Cohesive discourse marker linking two parallel supporting arguments.',
    synonyms: ['Similarly,', 'In the same vein,', 'Correspondingly,'],
    exampleSentence: ' exercise strengthens physical stamina; by the same token, reading fortifies mental agility.'
  },
  {
    id: 'p9',
    phrase: 'Alleviate the burden on',
    category: 'Academic Collocation',
    banglaMeaning: 'কোনো ব্যবস্থা বা মানুষের ওপর থেকে চাপ কমানো',
    englishFunction: 'Used when discussing healthcare, traffic, or government budgets.',
    synonyms: ['Ease the pressure on', 'Relieve the strain on'],
    exampleSentence: 'Preventive healthcare campaigns can significantly alleviate the burden on public hospitals.'
  },
  {
    id: 'p10',
    phrase: 'That is a multifaceted question, but primarily...',
    category: 'Speaking Part 3',
    banglaMeaning: 'এটি একটি বহুমাত্রিক প্রশ্ন, তবে প্রধানত...',
    englishFunction: 'Buys 2 seconds of natural thinking time in Speaking Part 3 while demonstrating C1 fluency.',
    synonyms: ['There are several layers to this issue, yet first and foremost...'],
    exampleSentence: 'That is a multifaceted question, but primarily I believe urban migration is driven by job concentration.'
  }
];

export const DAILY_SPRINT_SPELLING_TARGETS: DailySprintSpellingItem[] = [
  { id: 's1', word: 'accommodation', phonetic: '/əˌkɒm.əˈdeɪ.ʃən/', banglaMeaning: 'আবাসন / থাকার ব্যবস্থা', trapNote: 'ডাবল C এবং ডাবল M (a-CC-o-MM-odation) — Listening Sec 1-এর সবচেয়ে কমন ট্র্যাপ!', sectionContext: 'Listening Sec 1' },
  { id: 's2', word: 'questionnaire', phonetic: '/ˌkwes.tʃəˈneər/', banglaMeaning: 'প্রশ্নমালা / জরিপের প্রশ্নপত্র', trapNote: 'ডাবল N এবং শেষে -aire (question-NN-aire)', sectionContext: 'Listening Sec 3' },
  { id: 's3', word: 'entrepreneur', phonetic: '/ˌɒn.trə.prəˈnɜːr/', banglaMeaning: 'উদ্যোক্তা', trapNote: 'শুরুতে en- (on নয়) এবং শেষে -neur (entre-pre-neur)', sectionContext: 'Listening Sec 4' },
  { id: 's4', word: 'environment', phonetic: '/ɪnˈvaɪ.rən.mənt/', banglaMeaning: 'পরিবেশ', trapNote: 'মাঝখানে উচ্চারণ না হওয়া N ভুলবেন না: enviro-N-ment', sectionContext: 'Writing Task 2' },
  { id: 's5', word: 'government', phonetic: '/ˈɡʌv.ən.mənt/', banglaMeaning: 'সরকার', trapNote: 'মাঝখানে অবশ্যই N থাকবে: gover-N-ment', sectionContext: 'Writing Task 2' },
  { id: 's6', word: 'curriculum', phonetic: '/kəˈrɪk.jə.ləm/', banglaMeaning: 'পাঠ্যক্রম', trapNote: 'ডাবল R এবং একক L (cu-RR-icu-L-um)', sectionContext: 'Listening Sec 3' },
  { id: 's7', word: 'colleague', phonetic: '/ˈkɒl.iːɡ/', banglaMeaning: 'সহকর্মী', trapNote: 'ডাবল L এবং শেষে -gue (co-LL-ea-GUE)', sectionContext: 'Listening Sec 2' },
  { id: 's8', word: 'maintenance', phonetic: '/ˈmeɪn.tən.əns/', banglaMeaning: 'রক্ষণাবেক্ষণ', trapNote: 'মাঝখানে -ten- (maintain-এর মতো -tain- নয়!): main-TEN-ance', sectionContext: 'Listening Sec 1' },
  { id: 's9', word: 'occurrence', phonetic: '/əˈkʌr.əns/', banglaMeaning: 'ঘটনা / সংঘটন', trapNote: 'ডাবল C, ডাবল R এবং শেষে -ence (o-CC-u-RR-ence)', sectionContext: 'Writing Task 2' },
  { id: 's10', word: 'privilege', phonetic: '/ˈprɪv.əl.ɪdʒ/', banglaMeaning: 'বিশেষ সুবিধা বা অধিকার', trapNote: 'কোনো d নেই এবং মাঝখানে i-l-e: priv-I-L-E-ge', sectionContext: 'Writing Task 2' },
  { id: 's11', word: 'millennium', phonetic: '/mɪˈlen.i.əm/', banglaMeaning: 'সহস্রাব্দ (১০০০ বছর)', trapNote: 'ডাবল L এবং ডাবল N (mi-LL-e-NN-ium)', sectionContext: 'Listening Sec 4' },
  { id: 's12', word: 'conscientious', phonetic: '/ˌkɒn.ʃiˈen.ʃəs/', banglaMeaning: 'বিবেকবান ও কর্তব্যনিষ্ঠ', trapNote: 'মাঝখানে science-এর মতো scien থাকে: con-SCIEN-tious', sectionContext: 'Writing Task 2' },
  { id: 's13', word: 'indispensable', phonetic: '/ˌɪn.dɪˈspen.sə.bəl/', banglaMeaning: 'অপরিহার্য', trapNote: 'শেষে -sable (-sible নয়!): indispen-SABLE', sectionContext: 'Writing Task 2' },
  { id: 's14', word: 'hierarchy', phonetic: '/ˈhaɪə.rɑː.ki/', banglaMeaning: 'পদসোপান / স্তরবিন্যাস', trapNote: 'I আগে, E পরে: h-IE-rarchy', sectionContext: 'Listening Sec 4' },
  { id: 's15', word: 'bureaucracy', phonetic: '/bjʊəˈrɒk.rə.si/', banglaMeaning: 'আমলাতন্ত্র', trapNote: 'মাঝখানে -eau- ভাওয়েল ট্রিপলেট: bur-EAU-cracy', sectionContext: 'Writing Task 2' },
  { id: 's16', word: 'guarantee', phonetic: '/ˌɡær.ənˈtiː/', banglaMeaning: 'নিশ্চয়তা / গ্যারান্টি', trapNote: 'G-এর পরে U তারপর A এবং শেষে ডাবল E: g-UA-rant-EE', sectionContext: 'Listening Sec 1' },
  { id: 's17', word: 'embarrassment', phonetic: '/ɪmˈbær.əs.mənt/', banglaMeaning: 'বিব্রতকর অবস্থা', trapNote: 'ডাবল R এবং ডাবল S (emba-RR-a-SS-ment)', sectionContext: 'Writing Task 2' },
  { id: 's18', word: 'committee', phonetic: '/kəˈmɪt.i/', banglaMeaning: 'কমিটি / পর্ষদ', trapNote: 'ডাবল M, ডাবল T এবং ডাবল E (co-MM-i-TT-EE)', sectionContext: 'Listening Sec 2' },
  { id: 's19', word: 'surveillance', phonetic: '/səˈveɪ.ləns/', banglaMeaning: 'নজরদারি', trapNote: 'মাঝখানে -eil- এবং ডাবল L: surv-EIL-L-ance', sectionContext: 'Listening Sec 4' },
  { id: 's20', word: 'pharmaceutical', phonetic: '/ˌfɑː.məˈsuː.tɪ.kəl/', banglaMeaning: 'ওষুধ সংক্রান্ত', trapNote: 'শুরুতে ph- এবং মাঝখানে -ceu-: pharma-CEU-tical', sectionContext: 'Listening Sec 4' },
  { id: 's21', word: 'itinerary', phonetic: '/aɪˈtɪn.ər.ər.i/', banglaMeaning: 'ভ্রমণসূচি', trapNote: 'মাঝখানে -ner-ar-y (itin-ER-AR-Y)', sectionContext: 'Listening Sec 1' },
  { id: 's22', word: 'miscellaneous', phonetic: '/ˌmɪs.əlˈeɪ.ni.əs/', banglaMeaning: 'বিবিধ / হরেক রকম', trapNote: 'sc একসাথে এবং ডাবল L: mi-SC-e-LL-aneous', sectionContext: 'Listening Sec 2' },
  { id: 's23', word: 'refrigerator', phonetic: '/rɪˈfrɪdʒ.ər.eɪ.tər/', banglaMeaning: 'রেফ্রিজারেটর / ফ্রিজ', trapNote: 'fridge-এ d থাকলেও refrigerator-এ কোনো d নেই!', sectionContext: 'Listening Sec 1' },
  { id: 's24', word: 'liaison', phonetic: '/liˈeɪ.zɒn/', banglaMeaning: 'যোগাযোগ বা সমন্বয়', trapNote: 'দুই পাশে i এবং মাঝখানে a: l-IAI-son', sectionContext: 'Listening Sec 3' },
  { id: 's25', word: 'exaggerate', phonetic: '/ɪɡˈzædʒ.ə.reɪt/', banglaMeaning: 'অতিরঞ্জিত করা / বাড়িয়ে বলা', trapNote: 'ডাবল G এবং একক R: exa-GG-e-R-ate', sectionContext: 'Writing Task 2' },
  { id: 's26', word: 'phenomenon', phonetic: '/fəˈnɒm.ɪ.nən/', banglaMeaning: 'প্রপঞ্চ / বিশেষ ঘটনা', trapNote: 'একবচনে শেষে -non (বহুবচনে phenomena)', sectionContext: 'Writing Task 2' },
  { id: 's27', word: 'sustainability', phonetic: '/səˌsteɪ.nəˈbɪl.ə.ti/', banglaMeaning: 'টেকসই স্থায়িত্ব', trapNote: 'মাঝখানে -stain-a-bility: su-STAIN-ability', sectionContext: 'Listening Sec 4' },
  { id: 's28', word: 'infrastructure', phonetic: '/ˈɪn.frəˌstrʌk.tʃər/', banglaMeaning: 'অবকাঠামো', trapNote: 'infra + structure একসাথে যুক্ত শব্দ', sectionContext: 'Writing Task 2' },
  { id: 's29', word: 'deteriorate', phonetic: '/dɪˈtɪə.ri.ə.reɪt/', banglaMeaning: 'অবনতি হওয়া', trapNote: 'মাঝখানে -teri-o-rate (detoriate ভুল!)', sectionContext: 'Writing Task 2' },
  { id: 's30', word: 'unprecedented', phonetic: '/ʌnˈpres.ɪ.den.tɪd/', banglaMeaning: 'নজিরবিহীন', trapNote: 'un-pre-ce-den-ted (মাঝখানে c, s নয়)', sectionContext: 'Writing Task 2' },
  { id: 's31', word: 'meteorological', phonetic: '/ˌmiː.ti.ər.əˈlɒdʒ.ɪ.kəl/', banglaMeaning: 'আবহাওয়া সংক্রান্ত', trapNote: 'me-te-o-ro-logical (eo + ro খেয়াল রাখুন)', sectionContext: 'Listening Sec 4' },
  { id: 's32', word: 'archaeology', phonetic: '/ˌɑː.kiˈɒl.ə.dʒi/', banglaMeaning: 'প্রত্নতত্ত্ব', trapNote: 'ব্রিটিশ বানানে মাঝখানে -aeo-: arch-AEO-logy', sectionContext: 'Listening Sec 4' },
  { id: 's33', word: 'simultaneously', phonetic: '/ˌsɪm.əlˈteɪ.ni.əs.li/', banglaMeaning: 'একই সাথে / যুগপৎভাবে', trapNote: 'শেষে -eously: simultan-EOUS-ly', sectionContext: 'Writing Task 2' },
  { id: 's34', word: 'vulnerability', phonetic: '/ˌvʌl.nər.əˈbɪl.ə.ti/', banglaMeaning: 'ঝুঁকিপ্রবণতা / অরক্ষিত অবস্থা', trapNote: 'মাঝখানে l এবং n উভয়ই আছে: vu-L-N-erability', sectionContext: 'Listening Sec 4' },
  { id: 's35', word: 'rehabilitation', phonetic: '/ˌriː.həˌbɪl.ɪˈteɪ.ʃən/', banglaMeaning: 'পুনর্বাসন', trapNote: 're-H-abilitation (উচ্চারণ না হওয়া h বাদ দেবেন না)', sectionContext: 'Listening Sec 2' },
  { id: 's36', word: 'Mediterranean', phonetic: '/ˌmed.ɪ.tərˈeɪ.ni.ən/', banglaMeaning: 'ভূমধ্যসাগরীয়', trapNote: 'একক T, ডাবল R এবং বড় হাতের M: Medi-T-e-RR-anean', sectionContext: 'Listening Sec 1' },
  { id: 's37', word: 'chauffeur', phonetic: '/ˈʃəʊ.fər/', banglaMeaning: 'পেশাদার ব্যক্তিগত গাড়িচালক', trapNote: 'মাঝখানে -au- ও ডাবল F এবং শেষে -eur: ch-AU-FF-EUR', sectionContext: 'Listening Sec 1' },
  { id: 's38', word: 'acquaintance', phonetic: '/əˈkweɪn.təns/', banglaMeaning: 'পরিচিত ব্যক্তি', trapNote: 'c-এর পরে q এবং শেষে -ance: a-CQ-uaint-ANCE', sectionContext: 'Listening Sec 2' },
  { id: 's39', word: 'recommendation', phonetic: '/ˌrek.ə.menˈdeɪ.ʃən/', banglaMeaning: 'সুপারিশ / পরামর্শ', trapNote: 'একক C এবং ডাবল M: re-C-o-MM-endation', sectionContext: 'Listening Sec 3' },
  { id: 's40', word: 'correspondence', phonetic: '/ˌkɒr.ɪˈspɒn.dəns/', banglaMeaning: 'চিঠিপত্র বা বার্তা আদান-প্রদান', trapNote: 'ডাবল R এবং শেষে -ence (-ance নয়!): co-RR-espond-ENCE', sectionContext: 'Listening Sec 1' }
];

export const DAILY_SPRINT_GRAMMAR_RULES: DailySprintGrammarRule[] = [
  {
    id: 'g1',
    title: '1. Concession Clauses (Although vs. Despite)',
    bandImpact: 'GRA Band 7.5 → 8.5',
    englishExplanation: 'Never use "Although" and "but" in the same sentence. Follow "Although / Even though" with a full Subject + Verb clause, and follow "Despite / In spite of" with a Noun phrase or V-ing.',
    banglaExplanation: 'বাংলায় আমরা "যদিও... তবুও..." একসাথে বলি, কিন্তু ইংরেজিতে Although দিলে একই বাক্যে কখনোই "but" বসবে না! এছাড়া Although-এর পরে Subject + Verb বসে, আর Despite-এর পরে সরাসরি Noun বা V-ing বসে (Despite of কখনোই হবে না)।',
    commonMistake: 'Although the government built new flyovers, but traffic congestion still persists.',
    band8Correction: 'Although the government has constructed new flyovers, severe traffic congestion still persists.',
    whyItMattersBangla: 'বাংলাদেশি শিক্ষার্থীদের Writing Task 2-তে সবচেয়ে বেশি নম্বর কাটা যায় "Although... but..." এবং "Despite of..." ভুলের কারণে।',
    quickCheck: {
      question: 'Choose the grammatically accurate Band 8.5 sentence:',
      options: [
        'Although online courses are convenient, but they lack face-to-face mentorship.',
        'Despite of being convenient, online courses lack face-to-face mentorship.',
        'Despite their convenience, online courses often lack face-to-face mentorship.',
        'Even though convenient, but online courses lack mentorship.'
      ],
      correctIndex: 2,
      explanationBangla: 'সঠিক উত্তর ৩ নম্বরটি: "Despite + Noun phrase (their convenience)" এবং পরের ক্লজে কোনো "but" নেই।'
    }
  },
  {
    id: 'g2',
    title: '2. Band 8+ Inverted Conditionals (Were / Had / Should)',
    bandImpact: 'GRA Band 8.0 → 9.0',
    englishExplanation: 'Elevate academic essays by inverting conditional clauses: replace "If governments invested..." with "Were governments to invest...", or "If authorities had acted..." with "Had authorities acted...".',
    banglaExplanation: 'Writing Task 2-তে বারবার সাধারণ "If..." দিয়ে বাক্য শুরু না করে Inverted Conditional ("Were governments to..." বা "Had policymakers acted...") ব্যবহার করলে এক্সামিনার সাথে সাথে আপনাকে C1/C2 Grammatical Range-এর ক্রেডিট দেন।',
    commonMistake: 'If governments will invest more in rural broadband, the digital divide would shrink.',
    band8Correction: 'Were governments to invest more heavily in rural broadband, the digital divide would shrink significantly.',
    whyItMattersBangla: '"If"-যুক্ত ক্লজে কখনোই "will" বসে না; আর "Were + Subject + to + Base Verb" গঠনটি একটি নিশ্চিত Band 8.5 স্ট্রাকচার।',
    quickCheck: {
      question: 'Which inverted conditional structure is accurate for a formal Task 2 essay?',
      options: [
        'Were authorities to subsidize public transport, carbon emissions would decline.',
        'Were authorities subsidize public transport, carbon emissions will decline.',
        'Had authorities subsidize public transport, carbon emissions would decline.',
        'If authorities would subsidize public transport, carbon emissions declined.'
      ],
      correctIndex: 0,
      explanationBangla: '২য় কন্ডিশনালের ইনভার্সন: "Were + Subject + to + V1, Subject + would + V1"।'
    }
  },
  {
    id: 'g3',
    title: '3. Participle Clauses for Concise Cause & Effect',
    bandImpact: 'GRA & CC Band 8.0+',
    englishExplanation: 'Combine two repetitive sentences or result clauses using a present participle (", thereby reducing..." / ", prompting...") instead of starting a new sentence with "And this reduces...".',
    banglaExplanation: 'দুটি ছোট বাক্যকে আলাদা না লিখে কমা + V-ing (", thereby reducing..." বা ", leading to...") দিয়ে যুক্ত করলে বাক্য অনেক বেশি একাডেমিক ও সংহত (cohesive) হয়।',
    commonMistake: 'Factories dump untreated waste into rivers. And this destroys aquatic ecosystems.',
    band8Correction: 'Factories frequently discharge untreated waste into rivers, thereby devastating aquatic ecosystems.',
    whyItMattersBangla: 'Task 1 এবং Task 2 উভয় জায়গায় ফলাফল বা প্রভাব দেখাতে ", thereby + V-ing" গঠনটি অত্যন্ত কার্যকর।',
    quickCheck: {
      question: 'Select the best participle clause revision:',
      options: [
        'Universities digitized their libraries, thereby allowing remote students instant access.',
        'Universities digitized their libraries, thereby allowed remote students instant access.',
        'Universities digitized their libraries, which thereby allowing remote access.',
        'Universities digitized their libraries and thereby to allow remote access.'
      ],
      correctIndex: 0,
      explanationBangla: 'কমার পরে "thereby + V-ing (allowing)" পুরো পূর্ববর্তী ঘটনার স্বাভাবিক ফলাফল প্রকাশ করে।'
    }
  },
  {
    id: 'g4',
    title: '4. Uncountable Academic Nouns & Article Precision',
    bandImpact: 'GRA Band 7.0 → 8.0',
    englishExplanation: 'Words like information, research, equipment, infrastructure, evidence, advice, and traffic are UNCOUNTABLE. Never add "-s" or "an" directly to them.',
    banglaExplanation: 'Information, research, equipment, evidence, advice, luggage, traffic, 소프트웨어/infrastructure — এই শব্দগুলো Uncountable। এদের সাথে কখনোই "-s" যোগ করবেন না (informations বা researches সম্পূর্ণ ভুল!) এবং বহুবচন ভার্ব দেবেন না।',
    commonMistake: 'Many recent researches show that modern equipments improve medical diagnoses.',
    band8Correction: 'Extensive recent research demonstrates that modern medical equipment significantly improves diagnoses.',
    whyItMattersBangla: 'Listening ও Writing-এ অযথা "-s" যোগ করলে সরাসরি ব্যাকরণ ও বানান উভয় ক্ষেত্রেই নম্বর কাটা যায়।',
    quickCheck: {
      question: 'Identify the sentence with zero uncountable-noun errors:',
      options: [
        'Several new informations were uncovered during the police investigation.',
        'Compelling empirical evidence suggests that early intervention prevents chronic illness.',
        'The laboratory purchased three new scientific equipments last month.',
        'Many recent researches confirm this environmental trend.'
      ],
      correctIndex: 1,
      explanationBangla: '"Empirical evidence" (Uncountable) একবচন ভার্ব "suggests" গ্রহণ করেছে—এখানে কোনো ভুল নেই।'
    }
  },
  {
    id: 'g5',
    title: '5. Present Perfect vs. Past Simple Time Anchors',
    bandImpact: 'GRA Task 1 & Speaking',
    englishExplanation: 'Use Present Perfect ("has risen / have transformed") with unfinished time spans like "over the past decade / since 2010", and Past Simple ("rose / transformed") with finished past dates like "in 2015 / between 2000 and 2010".',
    banglaExplanation: 'যখন সময়ের ব্যাপ্তি এখনো চলমান ("over the last two decades", "since 2015", "in recent years"), তখন Present Perfect (has/have + V3) হবে। কিন্তু নির্দিষ্ট অতীত সাল ("in 2018", "from 2005 to 2015") থাকলে অবশ্যই Past Simple (V2) হবে।',
    commonMistake: 'Over the past two decades, internet penetration in Bangladesh increased dramatically.',
    band8Correction: 'Over the past two decades, internet penetration in Bangladesh has increased dramatically.',
    whyItMattersBangla: 'Writing Task 1 ও Task 2-এর ভূমিকা (Introduction) লেখার সময় এই নিয়মটি ১০০% নির্ভুল রাখা জরুরি।',
    quickCheck: {
      question: 'Choose the correct tense matching the time expression:',
      options: [
        'Since the turn of the century, global urban populations have expanded rapidly.',
        'Since the turn of the century, global urban populations expanded rapidly.',
        'In 2012, renewable energy output has reached a record high.',
        'Over the last decade, smartphone ownership was skyrocketed.'
      ],
      correctIndex: 0,
      explanationBangla: '"Since the turn of the century" অতীত থেকে শুরু হয়ে বর্তমান পর্যন্ত বিস্তৃত, তাই Present Perfect ("have expanded") সঠিক।'
    }
  },
  {
    id: 'g6',
    title: '6. Preposition "to" Followed by V-ing (contribute to / lead to)',
    bandImpact: 'GRA & LR Band 8.0+',
    englishExplanation: 'In phrases where "to" is a preposition—such as "contribute to", "lead to", "be conducive to", "be accustomed to", and "look forward to"—always follow "to" with a Noun or Gerund (V-ing), never a base verb.',
    banglaExplanation: 'যেসব ফ্রেজে "to" একটি Preposition হিসেবে কাজ করে (যেমন: contribute to, lead to, be conducive to, object to, be used to), সেগুলোর পরে ভার্ব বসলে অবশ্যই তার সাথে "-ing" যুক্ত হবে (contribute to reducing, কখনোই contribute to reduce নয়)।',
    commonMistake: ' strict traffic laws can contribute to reduce road accidents.',
    band8Correction: 'Strict enforcement of traffic laws can significantly contribute to reducing road accidents.',
    whyItMattersBangla: '"Contribute to + V-ing" এবং "Lead to + V-ing" নির্ভুলভাবে লিখলে এক্সামিনারের কাছে আপনার ব্যাকরণের গভীরতা প্রকাশ পায়।',
    quickCheck: {
      question: 'Which sentence uses "contribute to" or "conducive to" accurately?',
      options: [
        ' Green spaces contribute to improve mental well-being in dense cities.',
        'Interactive workshops are highly conducive to developing speaking confidence.',
        'Subsidies can lead to lower the cost of electric vehicles.',
        'Students are not accustomed to write academic reports.'
      ],
      correctIndex: 1,
      explanationBangla: '"Conducive to"-এর পরে Gerund "developing" বসেছে, যা শতভাগ ব্যাকরণসম্মত।'
    }
  }
];

export const DAILY_MASTERY_EXAM_QUESTIONS: DailyMasteryExamQuestion[] = [
  // Section 1: Vocabulary & Synonym Matching / Context (4 questions)
  {
    id: 'me_v1',
    section: 'vocabulary',
    sectionLabel: 'Vocabulary & Synonyms',
    prompt: 'Select the best Band 8+ academic verb to complete the sentence: "Coastal mangrove forests help _______ the destructive impact of tropical cyclones."',
    options: ['Exacerbate', 'Mitigate', 'Substantiate', 'Proliferate'],
    correctIndex: 1,
    targetTerm: 'Mitigate',
    banglaMeaning: 'প্রশমিত করা / ক্ষতির তীব্রতা কমানো',
    explanationEnglish: '"Mitigate" means to lessen or reduce the severity of something harmful (synonyms: alleviate, attenuate). "Exacerbate" means the opposite (to make worse).',
    explanationBangla: '"Mitigate" অর্থ ক্ষতির তীব্রতা কমানো বা প্রশমিত করা। ঘূর্ণিঝড়ের ধ্বংসাত্মক প্রভাব কমাতে ম্যানগ্রোভ বন সাহায্য করে, তাই Mitigate সঠিক।'
  },
  {
    id: 'me_v2',
    section: 'vocabulary',
    sectionLabel: 'Vocabulary & Synonyms',
    prompt: 'Which word is the closest academic synonym for "Omnipresent / Found everywhere" in the context of modern digital technology?',
    options: ['Sedentary', 'Detrimental', 'Ubiquitous', 'Pragmatic'],
    correctIndex: 2,
    targetTerm: 'Ubiquitous',
    banglaMeaning: 'সর্বব্যাপী / যা সব জায়গায় বিদ্যমান',
    explanationEnglish: '"Ubiquitous" means seeming to be everywhere at once (omnipresent, pervasive).',
    explanationBangla: '"Ubiquitous" অর্থ সর্বব্যাপী বা যা সব জায়গায় দেখা যায় (যেমন: আধুনিক জীবনে স্মার্টফোন)।'
  },
  {
    id: 'me_v3',
    section: 'vocabulary',
    sectionLabel: 'Vocabulary & Synonyms',
    prompt: 'Choose the correct word for this Writing Task 2 sentence: "Unregulated industrial waste disposal has _______ effects on river ecosystems."',
    options: ['Conducive', 'Detrimental', 'Viable', 'Pragmatic'],
    correctIndex: 1,
    targetTerm: 'Detrimental',
    banglaMeaning: 'ক্ষতিকর / অনিষ্টকর',
    explanationEnglish: '"Detrimental" means harmful or damaging (synonyms: deleterious, adverse).',
    explanationBangla: '"Detrimental" অর্থ ক্ষতিকর। শিল্পবর্জ্য নদীর বাস্তুসংস্থানের ওপর ক্ষতিকর প্রভাব ফেলে।'
  },
  {
    id: 'me_v4',
    section: 'vocabulary',
    sectionLabel: 'Vocabulary & Synonyms',
    prompt: 'What does "Disparity" mean in "There is a growing economic disparity between metropolitan hubs and rural districts"?',
    options: [
      'A rapid multiplication in population',
      'A noticeable and unfair gap or inequality',
      'A practical and realistic agreement',
      'A scientific proof backed by evidence'
    ],
    correctIndex: 1,
    targetTerm: 'Disparity',
    banglaMeaning: 'বৈষম্য / বড় ব্যবধান বা অসামঞ্জস্য',
    explanationEnglish: '"Disparity" refers to an imbalance, discrepancy, or inequality between two groups.',
    explanationBangla: '"Disparity" অর্থ বৈষম্য বা বড় ব্যবধান (synonyms: inequality, discrepancy, gap)।'
  },

  // Section 2: Idioms & Phrases in Context (4 questions)
  {
    id: 'me_ip1',
    section: 'idioms_phrases',
    sectionLabel: 'Idioms & Collocations',
    prompt: 'In IELTS Speaking Part 3, which idiom naturally describes an innovation that brings both major benefits and serious risks?',
    options: [
      'Once in a blue moon',
      'A double-edged sword',
      'Cost an arm and a leg',
      'Burn the midnight oil'
    ],
    correctIndex: 1,
    targetTerm: 'A double-edged sword',
    banglaMeaning: 'দুধারী তলোয়ার (যার ভালো ও খারাপ উভয় দিকই আছে)',
    explanationEnglish: '"A double-edged sword" refers to something that has both favorable and unfavorable consequences.',
    explanationBangla: 'যার ভালো এবং খারাপ উভয় দিকই রয়েছে (যেমন: AI বা সোশ্যাল মিডিয়া), তাকে "A double-edged sword" বলা হয়।'
  },
  {
    id: 'me_ip2',
    section: 'idioms_phrases',
    sectionLabel: 'Idioms & Collocations',
    prompt: 'Complete the academic collocation: "Vulnerable island nations often _______ the brunt of global climate change."',
    options: ['Play', 'Bear', 'Strike', 'Bridge'],
    correctIndex: 1,
    targetTerm: 'Bear the brunt of',
    banglaMeaning: 'কোনো দুর্যোগ বা সংকটের প্রধান আঘাত সহ্য করা',
    explanationEnglish: 'The fixed C1 collocation is "bear the brunt of" (to suffer the worst impact of a bad situation).',
    explanationBangla: '"Bear the brunt of" একটি স্থায়ী Collocation, যার অর্থ কোনো দুর্যোগের সবচেয়ে বড় আঘাত বা ক্ষতি সহ্য করা।'
  },
  {
    id: 'me_ip3',
    section: 'idioms_phrases',
    sectionLabel: 'Idioms & Collocations',
    prompt: 'Which phrase best completes a balanced Task 2 conclusion? "Policymakers must _______ a delicate balance between economic expansion and ecological preservation."',
    options: ['Hit', 'Burn', 'Strike', 'Foster'],
    correctIndex: 2,
    targetTerm: 'Strike a delicate balance between',
    banglaMeaning: 'দুটি বিষয়ের মধ্যে সূক্ষ্ম ভারসাম্য বজায় রাখা',
    explanationEnglish: '"Strike a balance between X and Y" is the standard high-band English collocation.',
    explanationBangla: 'ভারসাম্য বজায় রাখা অর্থে সর্বদা "Strike a (delicate) balance between..." ব্যবহৃত হয়।'
  },
  {
    id: 'me_ip4',
    section: 'idioms_phrases',
    sectionLabel: 'Idioms & Collocations',
    prompt: 'If a bad event initially seemed unfortunate but later led to a wonderful opportunity, it is called:',
    options: [
      'The tip of the iceberg',
      'A blessing in disguise',
      'Food for thought',
      'A myriad of factors'
    ],
    correctIndex: 1,
    targetTerm: 'A blessing in disguise',
    banglaMeaning: 'ছদ্মবেশী আশীর্বাদ (শুরুতে খারাপ মনে হলেও যা পরে মঙ্গলজনক হয়)',
    explanationEnglish: '"A blessing in disguise" is an apparent setback that results in an unexpectedly positive outcome.',
    explanationBangla: 'শুরুতে দুর্ভাগ্যজনক মনে হলেও যা পরবর্তীতে ভালো ফলাফল বয়ে আনে, তাকে "A blessing in disguise" বলে।'
  },

  // Section 3: Spelling Accuracy from Today's 30-50 Word List (4 questions)
  {
    id: 'me_sp1',
    section: 'spelling',
    sectionLabel: 'IELTS Spelling Accuracy',
    prompt: 'Choose the 100% accurate IELTS Listening Section 1 spelling for housing/lodging:',
    options: ['Accomodation', 'Accommodation', 'Acommodation', 'Acomodation'],
    correctIndex: 1,
    targetTerm: 'accommodation',
    banglaMeaning: 'আবাসন / থাকার ব্যবস্থা',
    explanationEnglish: '"Accommodation" has double C and double M: a-CC-o-MM-odation.',
    explanationBangla: 'মনে রাখবেন: Accommodation শব্দে দুটি C এবং দুটি M থাকে (a-CC-o-MM-odation)।'
  },
  {
    id: 'me_sp2',
    section: 'spelling',
    sectionLabel: 'IELTS Spelling Accuracy',
    prompt: 'Select the correct spelling of the high-frequency Listening Section 3 research word:',
    options: ['Questionaire', 'Questionnare', 'Questionnaire', 'Questioneer'],
    correctIndex: 2,
    targetTerm: 'questionnaire',
    banglaMeaning: 'প্রশ্নমালা / জরিপের প্রশ্নপত্র',
    explanationEnglish: '"Questionnaire" is spelled with double N and "-aire": question-NN-aire.',
    explanationBangla: 'Questionnaire বানানে ডাবল N এবং শেষে -aire থাকে (question-NN-aire)।'
  },
  {
    id: 'me_sp3',
    section: 'spelling',
    sectionLabel: 'IELTS Spelling Accuracy',
    prompt: 'Which spelling of the noun meaning "upkeep / servicing of buildings or machinery" is correct?',
    options: ['Maintainance', 'Maintenance', 'Maintanance', 'Mainteinance'],
    correctIndex: 1,
    targetTerm: 'maintenance',
    banglaMeaning: 'রক্ষণাবেক্ষণ',
    explanationEnglish: 'Even though the verb is "maintain", the noun changes to "-ten-": main-TEN-ance.',
    explanationBangla: 'Verb-টি maintain হলেও Noun করার সময় মাঝখানে -ten- হয়ে যায়: main-TEN-ance।'
  },
  {
    id: 'me_sp4',
    section: 'spelling',
    sectionLabel: 'IELTS Spelling Accuracy',
    prompt: 'Identify the correctly spelled academic noun meaning "a committee / board of members":',
    options: ['Comittee', 'Commitee', 'Committee', 'Committe'],
    correctIndex: 2,
    targetTerm: 'committee',
    banglaMeaning: 'কমিটি / পর্ষদ',
    explanationEnglish: '"Committee" has double M, double T, and double E: co-MM-i-TT-EE.',
    explanationBangla: 'Committee বানানে ডাবল M, ডাবল T এবং ডাবল E থাকে (co-MM-i-TT-EE)।'
  },

  // Section 4: IELTS Grammar Correction & Sentence Completion (4 questions)
  {
    id: 'me_gr1',
    section: 'grammar',
    sectionLabel: 'IELTS Grammar Mastery',
    prompt: 'Choose the sentence that avoids the common Bangladeshi IELTS concession error:',
    options: [
      'Although public buses are affordable, but they are often overcrowded.',
      'Despite of being affordable, public buses are often overcrowded.',
      'Although public buses are affordable, they remain severely overcrowded during peak hours.',
      'Even though public buses are affordable, yet they are but overcrowded.'
    ],
    correctIndex: 2,
    targetTerm: 'Concession Clause (Although without "but")',
    banglaMeaning: 'যদিও... তবুও... (ইংরেজিতে Although-এর সাথে কখনোই but বসে না)',
    explanationEnglish: 'Subordinating conjunction "Although" already contrasts the two clauses; adding "but" creates a double-conjunction error.',
    explanationBangla: 'Although দিয়ে বাক্য শুরু করলে পরের অংশে কখনোই "but" বসে না, শুধু একটি কমা (,) বসে।'
  },
  {
    id: 'me_gr2',
    section: 'grammar',
    sectionLabel: 'IELTS Grammar Mastery',
    prompt: 'Complete the sentence with the accurate grammatical form: "Expanding urban green belts can significantly contribute to _______ ambient city temperatures."',
    options: ['lower', 'lowering', 'lowered', 'be lower'],
    correctIndex: 1,
    targetTerm: 'contribute to + V-ing (Gerund)',
    banglaMeaning: 'কোনো কিছুতে অবদান রাখা (contribute to-এর পরে সর্বদা V-ing বসে)',
    explanationEnglish: 'In "contribute to", the word "to" is a preposition, so it must be followed by a noun or gerund (V-ing: "lowering").',
    explanationBangla: '"Contribute to"-তে "to" হলো Preposition, তাই এর পরে ভার্ব বসলে অবশ্যই তার সাথে -ing যুক্ত হবে (lowering)।'
  },
  {
    id: 'me_gr3',
    section: 'grammar',
    sectionLabel: 'IELTS Grammar Mastery',
    prompt: 'Select the sentence with 100% accurate uncountable noun usage:',
    options: [
      'Recent scientific researches prove that air pollution harms cognitive focus.',
      'Extensive scientific research proves that air pollution harms cognitive focus.',
      'Many new equipments were installed in the hospital wing.',
      'The counselor gave me several useful advices for my interview.'
    ],
    correctIndex: 1,
    targetTerm: 'Uncountable Nouns (research / equipment / advice)',
    banglaMeaning: 'অগণনযোগ্য বিশেষ্য (এদের সাথে কখনোই -s বা বহুবচন ভার্ব বসে না)',
    explanationEnglish: '"Research", "equipment", and "advice" are uncountable nouns in English and never take a plural "-s".',
    explanationBangla: 'Research, equipment, advice, information—এগুলো Uncountable Noun; এদের সাথে কখনোই -s যুক্ত হয় না এবং একবচন ভার্ব (proves) বসে।'
  },
  {
    id: 'me_gr4',
    section: 'grammar',
    sectionLabel: 'IELTS Grammar Mastery',
    prompt: 'Choose the Band 8.5 inverted conditional sentence:',
    options: [
      'Were policymakers to prioritize vocational education, youth unemployment would fall sharply.',
      'If policymakers will prioritize vocational education, youth unemployment would fall.',
      'Were policymakers prioritize vocational education, youth unemployment will fall.',
      'Had policymakers prioritize vocational education, youth unemployment falls.'
    ],
    correctIndex: 0,
    targetTerm: 'Inverted Conditional (Were + Subject + to + V1)',
    banglaMeaning: 'উচ্চমানের শর্তবাচক বাক্য (If-এর পরিবর্তে Were + Subject + to + Verb)',
    explanationEnglish: '"Were + subject + to + base verb, subject + would + base verb" is the formal second-conditional inversion.',
    explanationBangla: 'Formal Task 2 রাইটিংয়ে "If policymakers prioritized..."-এর বদলে "Were policymakers to prioritize..." ব্যবহার করলে GRA স্কোর ৮.৫+ স্তরে উন্নীত হয়।'
  }
];

export interface DailySpeakingConfidenceCard {
  id: string;
  partLabel: string;
  topicTitle: string;
  cuePrompt: string;
  bulletPoints: string[];
  band8OpenerEnglish: string;
  banglaConfidenceTip: string;
  banglaPronunciationFocus: string;
  englishTipFallback: string;
  targetPhrases: string[];
}

export const DAILY_SPEAKING_CONFIDENCE_CARDS: DailySpeakingConfidenceCard[] = [
  {
    id: 'sc1',
    partLabel: 'Speaking Part 2 · Cue Card',
    topicTitle: 'Describe a practical skill you learned outside school',
    cuePrompt: 'Describe a useful skill you learned without formal classes. You should say: what the skill is, how you learned it, why it was challenging, and how you feel about it now.',
    bulletPoints: [
      'What skill it was and when you started',
      'How you practised on your own',
      'What obstacle tested your patience',
      'How this skill helps your daily life today'
    ],
    band8OpenerEnglish:
      'One genuinely transformative skill I picked up outside the classroom is structured storytelling in English, which initially forced me to step out of my comfort zone.',
    banglaConfidenceTip:
      'শুরুতে তাড়াহুড়ো করবেন না বা "Actually / Basically" বারবার বলবেন না। ২ সেকেন্ড শ্বাস নিয়ে একটি প্রাকৃতিক গল্পের সূচনা দিয়ে বলুন — এতে Fluency ও Coherence দুটোই তাৎক্ষণিক বাড়ে।',
    banglaPronunciationFocus:
      'V এবং W-এর উচ্চারণ আলাদা রাখুন (যেমন: very বনাম wary), আর শব্দের শেষের -ed ও -s স্পষ্টভাবে উচ্চারণ করুন।',
    englishTipFallback:
      'Pause for two seconds before starting, avoid overusing actually or basically, and keep V and W sounds crisp.',
    targetPhrases: ['step out of my comfort zone', 'burn the midnight oil', 'a blessing in disguise']
  },
  {
    id: 'sc2',
    partLabel: 'Speaking Part 2 · People & Mentors',
    topicTitle: 'Describe a teacher or mentor who inspired your confidence',
    cuePrompt: 'Describe an educator or mentor who positively influenced your mindset. You should say: who this person is, how you met them, what advice they gave you, and why you remember them.',
    bulletPoints: [
      'Who the mentor was and your first impression',
      'A specific moment they encouraged you',
      'What exact mindset shift happened',
      'Why their guidance still matters today'
    ],
    band8OpenerEnglish:
      'Thinking back to my university years, my debate coach played a pivotal role in reshaping how I handle pressure under timed conditions.',
    banglaConfidenceTip:
      'অতীতের ঘটনা বলার সময় মাঝখানে অজান্তেই Present Tense-এ চলে যাবেন না। ১ মিনিটের নোট কার্ডে শুধু ৩টি Verb-এর V2 রূপ লিখে রাখুন (inspired, guided, transformed)।',
    banglaPronunciationFocus:
      'P এবং F উচ্চারণের পার্থক্য পরিষ্কার রাখুন (যেমন: pivotal, confidence) এবং প্রতিটি Clause শেষে হালকা বিরতি নিন।',
    englishTipFallback:
      'Keep all past events anchored in past simple verbs and pause cleanly after each clause.',
    targetPhrases: ['played a pivotal role', 'hit the nail on the head', 'food for thought']
  },
  {
    id: 'sc3',
    partLabel: 'Speaking Part 3 · Deep Opinion',
    topicTitle: 'How does technology change face-to-face communication?',
    cuePrompt: 'In Part 3, examiners expect abstract analysis—not personal stories alone. Frame a balanced two-sided viewpoint within 35–45 seconds.',
    bulletPoints: [
      'Start with a poised academic concession marker',
      'Explain one concrete societal benefit',
      'Contrast with one measurable drawback',
      'End with a pragmatic forward-looking conclusion'
    ],
    band8OpenerEnglish:
      'That is a multifaceted question, but from a socioeconomic standpoint, digital messaging is undeniably a double-edged sword for modern communities.',
    banglaConfidenceTip:
      'Part 3 প্রশ্ন কঠিন হলে "I don’t know" বা দীর্ঘ নীরবতা না রেখে "That is a multifaceted question, but primarily..." দিয়ে ২ সেকেন্ড সময় কিনে নিন — এক্সামিনার একে C1 Fluency ধরেন!',
    banglaPronunciationFocus:
      '"Socioeconomic" এবং "multifaceted"-এর মতো বড় শব্দ ভেঙে ভেঙে পরিষ্কার Stress দিয়ে বলুন।',
    englishTipFallback:
      'Buy thinking time naturally with "That is a multifaceted question" and stress key academic words steadily.',
    targetPhrases: ['a multifaceted question', 'from a socioeconomic standpoint', 'a double-edged sword']
  },
  {
    id: 'sc4',
    partLabel: 'Listening & Spelling Trap Alert',
    topicTitle: 'Avoiding Silent-Letter & Double-Consonant Dictation Traps',
    cuePrompt: 'Bangladeshi candidates frequently lose 0.5–1.0 Listening band on Section 1 & 3 spellings even when they hear the answer clearly.',
    bulletPoints: [
      'Listen carefully when speakers self-correct numbers or surnames',
      'Watch double letters: accommodation, committee, embarrassment',
      'Check plural -s and uncountable nouns (research, equipment)',
      'Verify final letters during the 2-minute transfer review'
    ],
    band8OpenerEnglish:
      'Whenever you hear a speaker pause or say "Oh, excuse me, actually it’s spelled...", immediately switch focus because the real Section 1 answer follows right after.',
    banglaConfidenceTip:
      'Listening অডিওতে স্পিকার প্রায়ই প্রথমে ভুল তথ্য বলে তারপর "Sorry, I meant..." বলে সঠিকটা দেন। প্রথম শব্দ শুনেই কলম থামাবেন না — পরবর্তী ৩ সেকেন্ড মনোযোগ দিয়ে শুনুন।',
    banglaPronunciationFocus:
      'Accommodation (a-CC-o-MM-odation), Maintenance (main-TEN-ance), এবং Environment (enviro-N-ment) বানান ৩ বার জোরে বলে অনুশীলন করুন।',
    englishTipFallback:
      'Watch for speaker self-corrections in Section 1 and double-check silent letters like N in environment and C-C M-M in accommodation.',
    targetPhrases: ['accommodation', 'maintenance', 'questionnaire']
  }
];

