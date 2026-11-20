/**
 * BandSprint - Structured Grammar Rules Database
 * File: src/data/grammarData.ts
 *
 * Stores comprehensive IELTS Grammatical Range and Accuracy (GRA) rules,
 * complete with formulas, explanations, before/after examples,
 * and memorable mnemonic 'memory tricks' (in English and Bengali).
 */

export interface GrammarRule {
  id: string;
  title: string;
  title_bn: string;
  category:
    | 'Complex Sentences'
    | 'Inversion & Cleft'
    | 'Conditionals'
    | 'Academic Passive & Hedging'
    | 'Agreement & Traps'
    | 'Task 1 Specific'
    | 'Punctuation & Cohesion';
  bandTarget: 'Essential Accuracy' | 'Band 7.0+' | 'Band 7.5+' | 'Band 8.0+';
  formula: string;
  explanation_en: string;
  explanation_bn: string;
  weakExample: string;
  bandBoostExample: string;
  memoryTrick: string;
  memoryTrick_bn: string;
  commonTrap: string;
  moduleRelevance: 'Writing Task 1' | 'Writing Task 2' | 'Speaking' | 'All';
  practiceQuestion: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

export const GRAMMAR_CATEGORIES = [
  'All',
  'Complex Sentences',
  'Inversion & Cleft',
  'Conditionals',
  'Academic Passive & Hedging',
  'Agreement & Traps',
  'Task 1 Specific',
  'Punctuation & Cohesion'
];

export const IELTS_GRAMMAR_DATA: GrammarRule[] = [
  {
    id: 'gr_1',
    title: 'Subordinating Concession (Although / Whereas / While)',
    title_bn: 'কনসেশন বা বৈপরীত্য ক্লজ (Although / Even though)',
    category: 'Complex Sentences',
    bandTarget: 'Band 7.0+',
    formula: 'Although + Clause 1, Clause 2 (NEVER use "but" with Although)',
    explanation_en:
      'Subordinating conjunctions of concession connect an opposing idea directly to your main thesis. This single structure instantly elevates your sentence complexity score in Writing Task 2 and Speaking Part 3.',
    explanation_bn:
      'Although বা Even though দিয়ে দুটি বিপরীতধর্মী বাক্যকে যুক্ত করা হয়। মনে রাখবেন, একই বাক্যে Although এবং But কখনো একসাথে বসে না।',
    weakExample: 'Although technology saves time, but it causes distraction.',
    bandBoostExample:
      'Although digital automation undoubtedly enhances occupational productivity, it can inadvertently diminish interpersonal communication.',
    memoryTrick: 'One Captain on the Ship (এক জাহাজে দুই ক্যাপ্টেন নয়)',
    memoryTrick_bn:
      'Although এবং But দুটোই লিডার। এক বাক্যে যেকোনো একজন বসবে। Although বসলে মাঝখান থেকে But-কে কমা (,) দিয়ে বিদায় করে দিন!',
    commonTrap:
      'Double Conjunction Error: "Although... but..." লেখা ইংরেজি পরীক্ষার অন্যতম বড় নেগেটিভ মার্কিং ট্র্যাপ।',
    moduleRelevance: 'Writing Task 2',
    practiceQuestion: {
      question: 'Which sentence demonstrates correct Band 7+ grammatical range?',
      options: [
        'Although renewable energy is clean, but installation costs remain high.',
        'Although renewable energy is clean, installation costs remain exorbitant.',
        'Even though renewable energy is clean, so it costs high.',
        'Although renewable energy is clean, however initial expenses are high.'
      ],
      correctIndex: 1,
      explanation:
        'Options A, C, and D contain fatal double conjunctions ("but", "so", "however"). Option B correctly uses a comma separating the dependent concession clause from the main clause.'
    }
  },
  {
    id: 'gr_2',
    title: 'Negative Inversion for Emphatic Argumentation',
    title_bn: 'নেগেটিভ ইনভার্শন (বাক্যে জোর দেওয়া ও ব্যান্ড ৮ শৈলী)',
    category: 'Inversion & Cleft',
    bandTarget: 'Band 8.0+',
    formula:
      'Negative Adverb (Not only / Rarely / Seldom / Under no circumstances) + Auxiliary + Subject + Main Verb',
    explanation_en:
      'Negative inversion reverses the normal subject-verb order to place dramatic emphasis on an argument. Native academic examiners reward this structure with maximum Grammatical Range points.',
    explanation_bn:
      'বাক্যের শুরুতে Not only, Rarely, বা Under no circumstances থাকলে বাক্যের গঠন সাধারণ বর্ণনামূলক না হয়ে প্রশ্নবোধক বাক্যের মতো সাজাতে হয় (সহকারী ক্রিয়া আগে আসে)।',
    weakExample: 'Not only online education is flexible, but it is also cheap.',
    bandBoostExample:
      'Not only does tertiary distance learning afford geographical flexibility, but it also democratizes access to world-class educational curricula.',
    memoryTrick: 'Question Order Flip (Q-O-F)',
    memoryTrick_bn:
      'শুরুতে Not only বা Rarely দেখলে প্রশ্ন করার নিয়ম মনে করুন: "Does he go?" এর মতো "does + Subject + Verb" বসান, কিন্তু শেষে প্রশ্নবোধক চিহ্নের বদলে ফুলস্টপ (.) দিন!',
    commonTrap:
      'Auxiliary verb বাদ দিয়ে "Not only distance learning affords..." লিখে ফেলা। Auxiliary (does/is/can) ছাড়া ইনভার্শন অকার্যকর।',
    moduleRelevance: 'Writing Task 2',
    practiceQuestion: {
      question: 'Select the sentence with accurate negative inversion:',
      options: [
        'Rarely governments invest sufficiently in mental health initiatives.',
        'Rarely do municipal authorities allocate adequate funding to public mental health.',
        'Rarely municipal authorities do allocate funding.',
        'Under no circumstances people should compromise on hygiene.'
      ],
      correctIndex: 1,
      explanation:
        'In Option B, the auxiliary "do" correctly precedes the subject "municipal authorities" following the negative adverb "Rarely".'
    }
  },
  {
    id: 'gr_3',
    title: 'Non-Defining Relative Clauses (which + consequence)',
    title_bn: 'নন-ডিফাইনিং রিলেটিভ ক্লজ (কমা + which দিয়ে ফলাফল প্রকাশ)',
    category: 'Complex Sentences',
    bandTarget: 'Band 7.0+',
    formula: 'Main Independent Clause, which + verb + consequence / commentary',
    explanation_en:
      'Using a non-defining relative clause with "which" allows you to comment on the entire previous thought without clumsily starting a new sentence with "And this..." or "This means...".',
    explanation_bn:
      'আগের পুরো ঘটনার ফলাফল বা ব্যাখ্যা দিতে কমা (,) দিয়ে which ব্যবহার করুন। এতে দুটি পৃথক সাধারণ বাক্য এক নিমেষে একটি হাই-ব্যান্ড কমপ্লেক্স বাক্যে পরিণত হয়।',
    weakExample: 'The government subsidized electric cars and this reduced air pollution in cities.',
    bandBoostExample:
      'The municipal authority heavily subsidized electric vehicles, which contributed substantially to curbing urban particulate emissions.',
    memoryTrick: 'Comma + Which = Instant Complex Clause',
    memoryTrick_bn:
      '"And this..." মুছে দিয়ে তার জায়গায় ", which" বসিয়ে দিন। দুটি দুর্বল বাক্য মুহূর্তে ব্যান্ড ৭.৫ এর কমপ্লেক্স স্ট্রাকচার হয়ে যাবে!',
    commonTrap:
      'কমা (,) দিতে ভুলে যাওয়া। কমা ছাড়া which বসলে তা কেবল আগের শব্দটিকে নির্দেশ করে, পুরো বাক্যটিকে নয়।',
    moduleRelevance: 'All',
    practiceQuestion: {
      question: 'Identify the sentence with the correct commentary relative clause:',
      options: [
        'The factory adopted modern filters and this reduced toxic smoke.',
        'The factory adopted modern filtration systems, which drastically reduced toxic industrial effluents.',
        'The factory adopted modern filtration systems which drastically reduced toxic effluents without comma.',
        'The factory adopted modern filters that this helped the environment.'
      ],
      correctIndex: 1,
      explanation:
        'Option B correctly uses a comma followed by "which" to modify the entire action of adopting modern filtration systems.'
    }
  },
  {
    id: 'gr_4',
    title: 'Third & Mixed Conditionals (Retrospective Speculation)',
    title_bn: 'থার্ড ও মিক্সড কন্ডিশনাল (অতীতের কাল্পনিক পর্যালোচনা)',
    category: 'Conditionals',
    bandTarget: 'Band 8.0+',
    formula:
      'If + had + V3, Subject + would have + V3  |  Inverted: Had + Subject + V3, Subject + would have + V3',
    explanation_en:
      'Used for analyzing past historical failures, policy shortcomings, or missed societal opportunities in Writing Task 2 and Speaking Part 3.',
    explanation_bn:
      'অতীতে কোনো পদক্ষেপ নিলে ফলাফল কেমন ভিন্ন হতে পারতো তা প্রকাশ করতে থার্ড কন্ডিশনাল ব্যবহৃত হয়। "Had" দিয়ে শুরু করলে বাক্যটি আরো মার্জিত শোনায়।',
    weakExample: 'If governments took steps ten years ago, global warming was not a crisis.',
    bandBoostExample:
      'Had proactive environmental regulations been enacted two decades ago, renewable technologies would have achieved market parity much sooner.',
    memoryTrick: 'Had + Would Have (পাস্ট রিগ্রেট ফর্মুলা)',
    memoryTrick_bn:
      'If ক্লজে "Had + V3" এবং রেজাল্ট ক্লজে "would have + V3"। "If" ফেলে দিয়ে "Had" কে সামনে এনে দিলে বাক্য সরাসরি ব্যান্ড ৮.৫ এ উন্নীত হয়!',
    commonTrap:
      'If ক্লজের ভেতরে "would have" লিখে ফেলা (যেমন: "If the government would have acted..."), যা ব্যাকরণগতভাবে মারাত্মক ভুল।',
    moduleRelevance: 'Writing Task 2',
    practiceQuestion: {
      question: 'Which sentence correctly executes a third conditional inversion?',
      options: [
        'If the state had invested earlier, it would save money now.',
        'Had preventive healthcare been prioritized earlier, hospital wards would not have become overwhelmed.',
        'Had preventive healthcare prioritized earlier, hospital wards would be overwhelmed.',
        'If preventive healthcare would have been prioritized, hospitals had not been overwhelmed.'
      ],
      correctIndex: 1,
      explanation:
        'Option B perfectly executes conditional inversion with "Had [subject] been prioritized, [subject] would not have become overwhelmed".'
    }
  },
  {
    id: 'gr_5',
    title: 'Academic Hedging (Cautious Modals & Impersonal Evaluation)',
    title_bn: 'অ্যাকাডেমিক হেজিং (অতিরিক্ত দৃঢ় বা ভুল দাবি এড়িয়ে চলার কৌশল)',
    category: 'Academic Passive & Hedging',
    bandTarget: 'Band 7.0+',
    formula: 'Subject + tends to / appears to / is likely to + V1  OR  It is plausible that...',
    explanation_en:
      'Academic writers avoid sweeping dogmatic absolutes like "all", "always", or "never". Hedging softens claims so they reflect nuanced, defensible scholarly reality.',
    explanation_bn:
      'আইইএলটিএস এসেতে কখনোই চরম উক্তি (যেমন: "সোশ্যাল মিডিয়া সবাইকে ধ্বংস করছে") করবেন না। "Tends to", "is likely to", "appears to" ব্যবহার করে মধ্যমপন্থা অবলম্বন করুন।',
    weakExample: 'Social media always ruins teenage mental health and causes depression.',
    bandBoostExample:
      'Excessive engagement with algorithmic feeds appears to exacerbate depressive symptoms among emotionally susceptible adolescents.',
    memoryTrick: 'The Shield Rule (ঢাল নিয়ম)',
    memoryTrick_bn:
      'কখনই "always" বা "100%" বলবেন না। "Tends to" বা "Likely to" হলো আপনার ঢাল, যা আপনার যুক্তিকে সমালোচকের আঘাত থেকে সুরক্ষিত রাখে!',
    commonTrap:
      'Over-generalization: "Video games make children violent" লিখে ফেলা। পরীক্ষক একে অপরিণত যুক্তি হিসেবে টাস্ক রেসপন্সে কম মার্ক দেন।',
    moduleRelevance: 'Writing Task 2',
    practiceQuestion: {
      question: 'Which sentence exhibits appropriate academic hedging?',
      options: [
        'Remote working completely destroys company teamwork.',
        'Remote working is proven to make all employees lazy.',
        'Prolonged remote working tends to impede spontaneous workplace collaboration.',
        'Without any doubt, every employee hates commuting.'
      ],
      correctIndex: 2,
      explanation:
        '"Tends to impede" appropriately hedges the assertion, reflecting objective academic research rather than absolute hyperbole.'
    }
  },
  {
    id: 'gr_6',
    title: 'Reduced Participle Clauses (Economy & Native Cadence)',
    title_bn: 'পার্টিসিপল ক্লজ (বাক্য সংক্ষেপ করে উন্নত প্রবাহ সৃষ্টি)',
    category: 'Complex Sentences',
    bandTarget: 'Band 8.0+',
    formula:
      'V-ing / Having + V3 + [Object], Subject + Verb (Both actions share identical subject)',
    explanation_en:
      'Present and perfect participle clauses compress repetitive multi-clause sentences into elegant, rhythmic academic prose.',
    explanation_bn:
      '"Because they recognized..." বা "After they completed..." বারবার না লিখে মূল ভার্বকে V-ing বানিয়ে সরাসরি কমা দিয়ে মূল বাক্যের সাথে জুড়ে দিন।',
    weakExample: 'Because policymakers recognized the severe water shortage, they mandated rationing.',
    bandBoostExample:
      'Recognizing the severe consequences of acute groundwater depletion, agricultural regulators mandated rainwater harvesting mandates.',
    memoryTrick: 'Trim the Fat, Keep the Action',
    memoryTrick_bn:
      'Because / As / When বাদ দিয়ে ভার্বের গায়ে "-ing" লাগিয়ে দিন। খেয়াল রাখবেন কমার ঠিক পরেই যেন সেই ব্যক্তি বা প্রতিষ্ঠান বসে যে কাজটি করেছে!',
    commonTrap:
      'Dangling Participle: "Walking into the room, the window was broken." (জানলা নিজে হেঁটে ঘরে ঢোকেনি! কমার পরে সঠিক কর্তা থাকতে হবে)।',
    moduleRelevance: 'All',
    practiceQuestion: {
      question: 'Which sentence avoids a dangling participle modifier error?',
      options: [
        'Having reviewed the statistical anomalies, the final research paper was published by the team.',
        'Having reviewed the statistical anomalies, the research team published their definitive findings.',
        'Analyzing the budgetary figures, many discrepancies were noticed by the auditor.',
        'Faced with rising sea levels, sea walls were constructed by local engineers.'
      ],
      correctIndex: 1,
      explanation:
        'In Option B, "the research team" is the logical subject who performed the action of "Having reviewed".'
    }
  },
  {
    id: 'gr_7',
    title: 'Uncountable Noun Agreement (Advice, Information, Equipment)',
    title_bn: 'আনকাউন্টেবল নাউনের ভুল (Advice, Research, Information)',
    category: 'Agreement & Traps',
    bandTarget: 'Essential Accuracy',
    formula: 'Uncountable Noun + Singular Verb (NO plural "s", NO "an")',
    explanation_en:
      'Nouns like advice, research, information, equipment, furniture, evidence, and traffic are strictly uncountable in English. Adding an "s" or "an" is a fatal accuracy flaw.',
    explanation_bn:
      'Advice, Information, Research, Equipment, Evidence শব্দগুলোর সাথে কখনো "s" বা "es" যোগ হবে না এবং এদের আগে "an" বসবে না।',
    weakExample: 'The professor gave me many useful advices and an interesting research.',
    bandBoostExample:
      'The academic supervisor provided valuable advice and directed the student toward groundbreaking sociological research.',
    memoryTrick: 'AIR-FEET (এয়ার-ফিট নিয়ম)',
    memoryTrick_bn:
      'A = Advice, I = Information, R = Research, F = Furniture, E = Equipment, E = Evidence, T = Traffic — এদের কখনো বহুবচন (s) করবেন না!',
    commonTrap:
      'Writing Task 2-তে "Researches show that..." লেখা। সঠিক হলো: "Research shows that..." অথবা "Studies show that...".',
    moduleRelevance: 'All',
    practiceQuestion: {
      question: 'Choose the grammatically pristine sentence:',
      options: [
        'Recent researches have highlighted several useful advices for job applicants.',
        'A recent research has provided an equipment for rural clinics.',
        'Recent research has provided critical evidence regarding renewable feasibility.',
        'Multiple informations were collected from the field interviews.'
      ],
      correctIndex: 2,
      explanation:
        '"Research" and "evidence" are uncountable and correctly paired with a singular verb and zero plural "s".'
    }
  },
  {
    id: 'gr_8',
    title: '"The Number of" vs "A Number of" Agreement',
    title_bn: '"The number of" বনাম "A number of" এর সাবজেক্ট-ভার্ব এগ্রিমেন্ট',
    category: 'Agreement & Traps',
    bandTarget: 'Essential Accuracy',
    formula:
      'The number of + Plural Noun + SINGULAR Verb  |  A number of + Plural Noun + PLURAL Verb',
    explanation_en:
      '"The number of" refers to a singular metric and requires a singular verb (has/is). "A number of" means several/many and requires a plural verb (have/are).',
    explanation_bn:
      '"The number of" একটি নির্দিষ্ট সংখ্যা নির্দেশ করে, তাই এর ভার্ব হবে Singular (is/has)। অন্যদিকে "A number of" মানে অনেকগুলো, তাই ভার্ব হবে Plural (are/have)।',
    weakExample: 'The number of international students have increased in Australian universities.',
    bandBoostExample:
      'The number of international undergraduates enrolling in Australian universities has witnessed a marked resurgence.',
    memoryTrick: 'THE is ONE, A is MANY',
    memoryTrick_bn:
      'THE হলো একক (Singular: has/is)। A হলো অনেকে (Plural: have/are)। টাস্ক ১-এ এই একটি ভুলের কারণে অনেকের স্কোর ৬.০-এ আটকে যায়!',
    commonTrap:
      'Task 1-এ "The number of cars were increasing" লেখা। সঠিক হলো: "The number of cars WAS increasing".',
    moduleRelevance: 'Writing Task 1',
    practiceQuestion: {
      question: 'Select the sentence with impeccable Subject-Verb agreement:',
      options: [
        'The number of overseas applicants have declined substantially.',
        'The number of overseas applicants has declined substantially.',
        'A number of overseas applicant has registered.',
        'The numbers of applicant has grown.'
      ],
      correctIndex: 1,
      explanation:
        '"The number of" treats the overall statistical figure as a single singular concept, demanding the singular auxiliary "has".'
    }
  },
  {
    id: 'gr_9',
    title: 'Passive Voice for Academic Objectivity & Task 1 Processes',
    title_bn: 'প্যাসিভ ভয়েস (ব্যক্তিগত মতামত বাদ দিয়ে প্রাতিষ্ঠানিক গাম্ভীর্য)',
    category: 'Academic Passive & Hedging',
    bandTarget: 'Band 7.0+',
    formula: 'Subject + be (am/is/are/was/were/been) + V3 (Past Participle)',
    explanation_en:
      'Essential for IELTS Writing Task 1 process diagrams and Task 2 objective discourse. It focuses attention on the action rather than the actor.',
    explanation_bn:
      'টাস্ক ১-এর প্রসেস ডায়াগ্রামে এবং টাস্ক ২-এর যুক্তিতে "আমি" বা "তারা" না বলে কাজটি কীভাবে সম্পন্ন হয় বা সার্বিকভাবে কী বিশ্বাস করা হয় তা প্যাসিভে লিখুন।',
    weakExample: 'We can see that workers harvest the tea leaves and dry them under the sun.',
    bandBoostExample:
      'Mature tea leaves are manually harvested before being conveyed to ventilated sheds where they are dried under regulated ambient conditions.',
    memoryTrick: 'Object Becomes the Hero',
    memoryTrick_bn:
      'যে বস্তু বা বিষয়ের ওপর কাজ হচ্ছে তাকে বাক্যের সামনে এনে "Be verb + V3" বসিয়ে দিন। "I" বা "People" বলার প্রয়োজন নেই!',
    commonTrap:
      'Irregular past participle forms গুলিয়ে ফেলা (যেমন: "teas are sended" এর বদলে "sent" হবে)।',
    moduleRelevance: 'Writing Task 1',
    practiceQuestion: {
      question: 'Which option represents the optimal academic passive for a process diagram?',
      options: [
        'First workers dig the clay and put it in a container.',
        'Initially, raw clay is excavated and transferred to designated storage hoppers.',
        'Initially, raw clay excavates by workers and transfers.',
        'We initially excavate the clay and store it.'
      ],
      correctIndex: 1,
      explanation:
        'Option B accurately uses passive forms "is excavated" and "[is] transferred" to maintain academic impersonality.'
    }
  },
  {
    id: 'gr_10',
    title: 'Task 1 Trend Structure Switch (Verb-Adverb vs Adjective-Noun)',
    title_bn: 'টাস্ক ১ ট্রেন্ড পরিবর্তন (Verb+Adverb বনাম Adjective+Noun)',
    category: 'Task 1 Specific',
    bandTarget: 'Band 7.0+',
    formula:
      'Structure A: Subject + Verb + Adverb  |  Structure B: There was a + Adjective + Noun + in + Subject',
    explanation_en:
      'Repeating "increased sharply" three times traps you in Band 5. Alternating between Verb-Adverb and Adjective-Noun structures demonstrates flexible grammar control.',
    explanation_bn:
      'টাস্ক ১-এ একই শব্দ বারবার না লিখে একবার "climbed rapidly" লিখলে পরের বাক্যে "witnessed a rapid climb" বা "saw a dramatic surge" দিয়ে প্যারাফ্রেজ করুন।',
    weakExample: 'Oil prices increased dramatically in 2018 and car sales increased dramatically too.',
    bandBoostExample:
      'While crude petroleum prices increased dramatically in 2018, automobile dealerships witnessed an equally pronounced surge in overall turnover.',
    memoryTrick: 'The Seesaw Switch (দোলনা বদল)',
    memoryTrick_bn:
      'বাম পাশে Verb + Adverb (rose sharply) দিলে ডান পাশে Adjective + Noun (a sharp rise) দিন। প্যারাগ্রাফ একঘেয়ে হওয়া থেকে বেঁচে যাবে!',
    commonTrap:
      'Adverb এবং Adjective গুলিয়ে ফেলা (যেমন: "a dramatically increase" বা "increased dramatic")।',
    moduleRelevance: 'Writing Task 1',
    practiceQuestion: {
      question: 'Which pair correctly switches grammatical forms without error?',
      options: [
        'Emissions rose dramatic, followed by a sharply drop.',
        'Emissions rose dramatically, followed by a sharp drop.',
        'Emissions had a dramatically rise, followed by sharp dropping.',
        'Emissions rose sharply, followed by dropping dramatic.'
      ],
      correctIndex: 1,
      explanation:
        '"rose dramatically" (Verb + Adverb) followed by "a sharp drop" (Adjective + Noun) executes the alternation flawlessly.'
    }
  },
  {
    id: 'gr_11',
    title: 'Task 1 Preposition Mastery (At, By, To, In, Of)',
    title_bn: 'টাস্ক ১ প্রিপজিশন নির্ভুলতা (At, To, By এর সঠিক ব্যবহার)',
    category: 'Task 1 Specific',
    bandTarget: 'Essential Accuracy',
    formula:
      'stood AT [level] | increased TO [final figure] | increased BY [margin difference] | by [year with past perfect]',
    explanation_en:
      'Misusing prepositions in Task 1 creates severe factual ambiguity that costs points in both Task Achievement and Grammar.',
    explanation_bn:
      'TO হলো গন্তব্য (৫০ এ পৌঁছালো), BY হলো পার্থক্য (১০ বৃদ্ধি পেয়ে ৬০ হলো), এবং AT হলো নির্দিষ্ট অবস্থানে দাঁড়ানো (৪০ এ ছিল)।',
    weakExample: 'Unemployment dropped by 5% to stand in 5% in 2021.',
    bandBoostExample:
      'National unemployment contracted by 3 percentage points to stand at 5% by the conclusion of 2021.',
    memoryTrick: 'TO = Target, BY = Difference, AT = Anchor',
    memoryTrick_bn:
      'TO হলো টার্গেট (কোথায় পৌঁছাল), BY হলো ব্যবধান (কতটুকু বাড়ল বা কমল), AT হলো নোঙর (কোন বিন্দুতে স্থির ছিল)!',
    commonTrap:
      '"Increased by 10%" আর "Increased to 10%" এর মধ্যে পার্থক্য না বুঝে উল্টো অর্থ প্রকাশ করা।',
    moduleRelevance: 'Writing Task 1',
    practiceQuestion: {
      question: 'If solar power was 20% in 2010 and became 35% in 2020, which statement is true?',
      options: [
        'Solar power expanded by 35% in 2020.',
        'Solar power expanded to 15% in 2020.',
        'Solar power expanded by 15 percentage points to reach 35% in 2020.',
        'Solar power stood by 35% in 2020.'
      ],
      correctIndex: 2,
      explanation:
        'The difference is 15 percentage points (BY), and the final destination is 35% (TO).'
    }
  },
  {
    id: 'gr_12',
    title: 'Cleft Sentences for High-Band Argument Salience',
    title_bn: 'ক্লেফ্ট সেন্টেন্স (নির্দিষ্ট পয়েন্টে অখণ্ড দৃষ্টি আকর্ষণ)',
    category: 'Inversion & Cleft',
    bandTarget: 'Band 8.0+',
    formula:
      'What + subject + verb + is/was + complement  OR  It is + [Focused Noun] + that/who + clause',
    explanation_en:
      'Cleft sentences divide a single clause into two sections to highlight a particular premise or cause, commonly employed by native speakers in academic evaluations.',
    explanation_bn:
      'কোনো একটি কারণ বা বিষয়কে আলাদাভাবে গুরুত্ব দিতে সাধারণ বাক্যের বদলে "What concerns scientists is..." অথবা "It is parental neglect that..." কাঠামো ব্যবহার করুন।',
    weakExample: 'Uncontrolled greenhouse gas emission causes global climate shifts.',
    bandBoostExample:
      'What remains deeply troubling to climatologists is the irreversible thawing of subterranean Arctic permafrost.',
    memoryTrick: 'The Spotlight Beam',
    memoryTrick_bn:
      'যে কথাটিতে জোর দিতে চান, তাকে "What ... is [that]" এর স্পটলাইটে এনে দাঁড় করিয়ে দিন। পরীক্ষক মুগ্ধ হতে বাধ্য!',
    commonTrap:
      'Cleft বাক্যে Verb এর একবচন/বহুবচন রূপ গুলিয়ে ফেলা (যেমন: "What are troubling" এর বদলে "What is troubling" হবে)।',
    moduleRelevance: 'Writing Task 2',
    practiceQuestion: {
      question: 'Which sentence correctly implements a "What" cleft structure?',
      options: [
        'What the council needs is comprehensive recycling infrastructure.',
        'What the council needs are comprehensive recycling infrastructure.',
        'What needs the council is comprehensive recycling.',
        'That what the council needs is recycling.'
      ],
      correctIndex: 0,
      explanation:
        'Option A introduces the nominal relative clause "What the council needs" followed by the singular copula "is".'
    }
  },
  {
    id: 'gr_13',
    title: 'Parallelism in Compound Structures & Bullet Proof Lists',
    title_bn: 'প্যারালেলিজম বা সমান্তরাল বাক্য গঠন (ভারসাম্য রক্ষা)',
    category: 'Punctuation & Cohesion',
    bandTarget: 'Band 7.0+',
    formula:
      'All coordinate elements connected by and/or must share identical grammatical part of speech',
    explanation_en:
      'When listing reasons, recommendations, or processes, items must match in form (all gerunds, all infinitives, or all abstract noun phrases).',
    explanation_bn:
      'তালিকায় "and" দিয়ে ৩টি বিষয় যুক্ত করলে তিনটিই একই ব্যাকরণিক রূপের হতে হবে (সবগুলো V-ing অথবা সবগুলো Noun)। অন্যথায় বাক্য ভারসাম্যহীন হয়ে পড়ে।',
    weakExample: 'The course teaches students writing essays, how to speak clearly, and critical analysis.',
    bandBoostExample:
      'The curriculum aims at refining academic essay writing, cultivating articulate speech, and sharpening critical analytical reasoning.',
    memoryTrick: 'Train Tracks Rule (রেললাইন সোজা রাখুন)',
    memoryTrick_bn:
      'প্রথমটি V-ing হলে পরেরগুলোও V-ing হতে হবে। প্রথমটি Noun হলে বাকিগুলোও Noun হতে হবে। লাইন বাঁকা হলে ট্রেনের মতো বাক্যও লাইনচ্যুত হবে!',
    commonTrap:
      '"He likes swimming, running, and to bike." (সঠিক হলো: swimming, running, and biking).',
    moduleRelevance: 'All',
    practiceQuestion: {
      question: 'Which sentence maintains strict grammatical parallelism?',
      options: [
        'Governments should invest in public transit, discouraging car ownership, and tax reform.',
        'Effective leaders excel at listening empathetically, communicating clearly, and deciding decisively.',
        'The program involves reading journals, to write summaries, and debate topics.',
        'She demonstrated patience, understanding, and was very kind.'
      ],
      correctIndex: 1,
      explanation:
        'All three complementary elements ("listening...", "communicating...", "deciding...") share the identical present participle (-ing) adverbial form.'
    }
  },
  {
    id: 'gr_14',
    title: 'Semicolons & Conjunctive Adverbs (Eliminating Comma Splices)',
    title_bn: 'সেমিকোলন ও তবে/অতএব লিংকার্স (কমা স্প্লাইস পরিহার)',
    category: 'Punctuation & Cohesion',
    bandTarget: 'Band 7.5+',
    formula:
      'Independent Clause 1; however / consequently / furthermore, Independent Clause 2.',
    explanation_en:
      'A comma splice occurs when two independent sentences are glued together with merely a comma. Semicolons followed by transitional adverbs fix this error with academic sophistication.',
    explanation_bn:
      'However বা Therefore এর আগে কমা দিয়ে দুটি পূর্ণ বাক্য জোড়া দেওয়া ইংরেজি ব্যাকরণের মারাত্মক ভুল (Comma Splice)। সেখানে সেমিকোলন (;) দিতে হবে।',
    weakExample: 'Solar panels generate clean power, however cloudy days reduce their overall efficacy.',
    bandBoostExample:
      'Solar panels generate zero direct greenhouse emissions; however, intermittent cloud coverage inevitably diminishes diurnal yield.',
    memoryTrick: 'Comma is Too Weak for "However"',
    memoryTrick_bn:
      'However বা Therefore-এর ভার বহন করার ক্ষমতা দুর্বল কমার নেই। তাকে সামলাতে দরকার শক্ত সেমিকোলন (;)!',
    commonTrap:
      'Comma Splice: দুটি স্বাধীন বাক্যের মাঝে শুধু কমা দিয়ে লেখা। এটি ব্যান্ড ৭.০ পাওয়ার পথে প্রধান প্রতিবন্ধক।',
    moduleRelevance: 'Writing Task 2',
    practiceQuestion: {
      question: 'Select the punctuationally valid sentence:',
      options: [
        'Electric cars are silent, therefore urban noise pollution declines.',
        'Electric vehicles emit zero exhaust fumes; consequently, urban atmospheric purity is preserved.',
        'Electric vehicles emit zero exhaust fumes, consequently urban atmospheric purity is preserved.',
        'Electric vehicles emit zero fumes; therefore urban noise declines.'
      ],
      correctIndex: 1,
      explanation:
        'Option B correctly uses a semicolon prior to "consequently" followed by a comma before introducing the second independent clause.'
    }
  },
  {
    id: 'gr_15',
    title: 'Correlative Conjunctions (Either... Or / Neither... Nor)',
    title_bn: 'কো-রিলেটিভ কনজাংশন (Either/Neither এর নৈকট্য ভার্ব নীতি)',
    category: 'Agreement & Traps',
    bandTarget: 'Essential Accuracy',
    formula:
      'Neither Subject A nor Subject B + Verb (Verb agrees solely with Subject B, the nearest neighbor)',
    explanation_en:
      'In correlative pairings, the verb must match the number and person of the noun directly adjacent to it, not the first subject.',
    explanation_bn:
      'Neither... nor বা Either... or বাক্যে ভার্বটি তার সবচেয়ে কাছের সাবজেক্ট অনুযায়ী পরিবর্তিত হয়।',
    weakExample: 'Neither the municipal mayor nor the urban councilors was willing to endorse the tariff.',
    bandBoostExample:
      'Neither the municipal executive nor the elected councilors were inclined to endorse regressive public transport tariffs.',
    memoryTrick: 'Love Thy Neighbor (নিকটতম প্রতিবেশীকে দেখুন)',
    memoryTrick_bn:
      'ভার্ব সবসময় তার ঠিক বামের সাবজেক্টটিকে চেনে। দূরের সাবজেক্টের দিকে তাকাবেন না, ভার্বের ঠিক আগের শব্দটি বহুবচন হলে ভার্বও বহুবচন হবে!',
    commonTrap:
      '"Neither the teacher nor the students was..." লিখে ফেলা। যেহেতু "students" বহুবচন ও ভার্বের কাছে, তাই "were" হবে।',
    moduleRelevance: 'All',
    practiceQuestion: {
      question: 'Choose the sentence exhibiting the correct proximity agreement:',
      options: [
        'Either the chief engineer or his laboratory assistants has made a miscalculation.',
        'Either the chief engineer or his laboratory assistants have made a miscalculation.',
        'Neither the supervisors nor the manager are available today.',
        'Neither the books nor the journal are missing from the shelf.'
      ],
      correctIndex: 1,
      explanation:
        'Because "laboratory assistants" is plural and immediately precedes the verb, the plural auxiliary "have" is mandatory.'
    }
  },
  {
    id: 'gr_16',
    title: 'Hypothetical Problem-Solving (Second Conditional)',
    title_bn: 'সেকেন্ড কন্ডিশনাল (কাল্পনিক সমাধান ও সুদূরপ্রসারী প্রস্তাবনা)',
    category: 'Conditionals',
    bandTarget: 'Band 7.0+',
    formula: 'If + Past Simple, Subject + would / could / might + V1',
    explanation_en:
      'Used when recommending imaginative civic interventions or speculating on unreal present scenarios in Writing Task 2 and Speaking Part 3.',
    explanation_bn:
      'বর্তমানে প্রচলিত কোনো নিয়ম যদি কাল্পনিকভাবে পরিবর্তন করা হতো, তাহলে কী ঘটতো তা বোঝাতে If এর সাথে Past Simple এবং রেজাল্ট অংশে would + V1 বসে।',
    weakExample: 'If cities will ban petrol cars, the air will be clean immediately.',
    bandBoostExample:
      'If urban authorities prohibited private combustion vehicles within city limits, atmospheric particulate levels would experience an unprecedented plummet.',
    memoryTrick: 'Past in If, Would in Result',
    memoryTrick_bn:
      'If ক্লজের পেটে কখনোই "would" বা "will" ঢুকবে না! ইফ-এ থাকবে Past Simple (prohibited), আর রেজাল্টে থাকবে "would + V1" (would plummet)।',
    commonTrap:
      '"If the government would ban..." লেখা। ইফ-এর ভেতর would লেখা মারাত্মক কন্ডিশনাল ভুল।',
    moduleRelevance: 'Speaking',
    practiceQuestion: {
      question: 'Which second conditional sentence is grammatically sound?',
      options: [
        'If citizens would cycle more, greenhouse emissions would shrink.',
        'If citizens cycled more frequently, urban greenhouse emissions would shrink markedly.',
        'If citizens cycle more frequently, emissions would shrink.',
        'If citizens had cycled more frequently, emissions would shrink.'
      ],
      correctIndex: 1,
      explanation:
        'Option B accurately pairs the hypothetical past "cycled" in the protasis with the modal "would shrink" in the apodosis.'
    }
  }
];
