export interface C1IdiomPhrase {
  id: number;
  phrase: string;
  cefrLevel?: 'C1' | 'C2';
  type:
    | 'Phrase'
    | 'Idiom'
    | 'Phrasal verb'
    | 'Phrasal idiom'
    | 'Verb/Idiom'
    | 'Adjective/Phrase'
    | 'Preposition/Conjunction'
    | 'Adverb'
    | 'Adjective'
    | 'C2 Vocabulary'
    | 'C1 Vocabulary'
    | 'Collocation';
  banglaMeaning: string;
  exampleSentence: string;
  ieltsSuitability: 'Speaking & Writing' | 'Speaking (Recommended)' | 'Writing Formal';
  category: 'Strategic' | 'Opinion & Argument' | 'Action & Problem' | 'Time & Outcome' | 'General C1' | 'C2 Band-9 Mastery';
}

export type C1IdiomEntry = C1IdiomPhrase;

export const C1_GUIDE_METADATA = {
  title: 'C1 & C2 Idioms, Phrases & Academic Vocabulary — Official Candidate Guide',
  purpose: '240 C1 & C2-level idioms, advanced phrases, and Band 8.5–9.0 academic vocabulary with natural Bangla meanings and Cambridge-calibrated example sentences.',
  columns: 'No. = serial number; Idiom / Vocabulary = target expression; Level = C1 or C2; বাংলা অর্থ = intended sense; Example Sentence = natural usage.',
  studyTip: 'Learn the meaning and the example together. Use C2 formal vocabulary and discourse phrases in Writing Task 2, and natural idiomatic expressions in Speaking Parts 2 & 3.',
  levelNote: 'Includes both C1 Advanced and C2 Mastery expressions for IELTS Band 7.5 to 9.0.'
};

export const C1_IDIOMS_AND_PHRASES: C1IdiomPhrase[] = [
  {
    id: 1,
    phrase: 'Get to grips with',
    type: 'Phrase',
    banglaMeaning: 'কোনো বিষয় ভালোভাবে বুঝে আয়ত্ত করা',
    exampleSentence: 'It took me a few weeks to get to grips with the new software.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Action & Problem'
  },
  {
    id: 2,
    phrase: 'Bear in mind',
    type: 'Phrase',
    banglaMeaning: 'মনে রাখা বা বিবেচনায় রাখা',
    exampleSentence: 'Bear in mind that the deadline cannot be extended.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 3,
    phrase: 'By and large',
    type: 'Idiom',
    banglaMeaning: 'সামগ্রিকভাবে; মোটের ওপর',
    exampleSentence: 'By and large, the project was a success.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Opinion & Argument'
  },
  {
    id: 4,
    phrase: 'On the whole',
    type: 'Phrase',
    banglaMeaning: 'সামগ্রিকভাবে',
    exampleSentence: 'On the whole, I was satisfied with the service.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Opinion & Argument'
  },
  {
    id: 5,
    phrase: 'In light of',
    type: 'Phrase',
    banglaMeaning: 'কোনো তথ্য বা পরিস্থিতি বিবেচনায়',
    exampleSentence: 'In light of the evidence, the committee changed its decision.',
    ieltsSuitability: 'Writing Formal',
    category: 'Strategic'
  },
  {
    id: 6,
    phrase: 'In the wake of',
    type: 'Phrase',
    banglaMeaning: 'কোনো ঘটনার পরবর্তী সময়ে',
    exampleSentence: 'In the wake of the storm, several roads were closed.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Time & Outcome'
  },
  {
    id: 7,
    phrase: 'In the long run',
    type: 'Phrase',
    banglaMeaning: 'দীর্ঘমেয়াদে',
    exampleSentence: 'In the long run, investing in education pays off.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Time & Outcome'
  },
  {
    id: 8,
    phrase: 'In the short term',
    type: 'Phrase',
    banglaMeaning: 'স্বল্পমেয়াদে',
    exampleSentence: 'The measure may be costly in the short term.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Time & Outcome'
  },
  {
    id: 9,
    phrase: 'At odds with',
    type: 'Phrase',
    banglaMeaning: 'কারও/কিছু র সঙ্গে বিরোধপূর্ণ',
    exampleSentence: "His proposal is at odds with the company's policy.",
    ieltsSuitability: 'Speaking & Writing',
    category: 'Opinion & Argument'
  },
  {
    id: 10,
    phrase: 'At the expense of',
    type: 'Phrase',
    banglaMeaning: 'কোনো কিছুর ক্ষতির বিনিময়ে',
    exampleSentence: 'Economic growth should not come at the expense of public health.',
    ieltsSuitability: 'Writing Formal',
    category: 'Strategic'
  },
  {
    id: 11,
    phrase: 'At stake',
    type: 'Idiom',
    banglaMeaning: 'ঝুঁকির মধ্যে; নির্ভর করছে এমন',
    exampleSentence: 'Thousands of jobs are at stake.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 12,
    phrase: 'A far cry from',
    type: 'Idiom',
    banglaMeaning: 'অনেক আলাদা বা দূরে',
    exampleSentence: 'The new office is a far cry from our old one.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Opinion & Argument'
  },
  {
    id: 13,
    phrase: 'A double-edged sword',
    type: 'Idiom',
    banglaMeaning: 'যার ভালো ও খারাপ উভয় দিক আছে',
    exampleSentence: 'Social media can be a double-edged sword.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 14,
    phrase: 'A grey area',
    type: 'Idiom',
    banglaMeaning: 'যে বিষয়ে স্পষ্ট নিয়ম বা উত্তর নেই',
    exampleSentence: 'Data privacy remains a grey area in some industries.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 15,
    phrase: 'A level playing field',
    type: 'Idiom',
    banglaMeaning: 'সবার জন্য সমান সুযোগের পরিবেশ',
    exampleSentence: 'The policy aims to create a level playing field.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 16,
    phrase: 'A stumbling block',
    type: 'Idiom',
    banglaMeaning: 'অগ্রগতির পথে বাধা',
    exampleSentence: 'Cost has become a major stumbling block.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Action & Problem'
  },
  {
    id: 17,
    phrase: 'A turning point',
    type: 'Idiom',
    banglaMeaning: 'গুরুত্বপূর্ণ মোড়বদলের ঘটনা',
    exampleSentence: 'Winning that match was a turning point in her career.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Time & Outcome'
  },
  {
    id: 18,
    phrase: 'A wake-up call',
    type: 'Idiom',
    banglaMeaning: 'সতর্ক করে দেওয়ার মতো গুরুত্বপূর্ণ ঘটনা',
    exampleSentence: 'The flood was a wake-up call for local authorities.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Strategic'
  },
  {
    id: 19,
    phrase: 'A blessing in disguise',
    type: 'Idiom',
    banglaMeaning: 'দেখতে খারাপ হলেও শেষ পর্যন্ত উপকারী বিষয়',
    exampleSentence: 'Losing that job was a blessing in disguise.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Time & Outcome'
  },
  {
    id: 20,
    phrase: 'A matter of time',
    type: 'Phrase',
    banglaMeaning: 'শুধু সময়ের ব্যাপার',
    exampleSentence: 'It is only a matter of time before demand increases.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Time & Outcome'
  },
  {
    id: 21,
    phrase: 'A means to an end',
    type: 'Phrase',
    banglaMeaning: 'শেষ লক্ষ্য অর্জনের উপায়',
    exampleSentence: 'For him, the internship was a means to an end.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 22,
    phrase: 'A matter of principle',
    type: 'Phrase',
    banglaMeaning: 'নীতির বিষয়',
    exampleSentence: 'I refused on a matter of principle.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Opinion & Argument'
  },
  {
    id: 23,
    phrase: 'A matter of concern',
    type: 'Phrase',
    banglaMeaning: 'উদ্বেগের বিষয়',
    exampleSentence: 'The decline in standards is a matter of concern.',
    ieltsSuitability: 'Writing Formal',
    category: 'Strategic'
  },
  {
    id: 24,
    phrase: 'A foregone conclusion',
    type: 'Idiom',
    banglaMeaning: 'আগেই প্রায় নিশ্চিত ফল',
    exampleSentence: 'The result seemed a foregone conclusion.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Opinion & Argument'
  },
  {
    id: 25,
    phrase: 'A point of contention',
    type: 'Phrase',
    banglaMeaning: 'বিতর্কের বিষয়',
    exampleSentence: 'Funding remains a point of contention.',
    ieltsSuitability: 'Writing Formal',
    category: 'Opinion & Argument'
  },
  {
    id: 26,
    phrase: 'A source of contention',
    type: 'Phrase',
    banglaMeaning: 'বিরোধের কারণ',
    exampleSentence: 'Land ownership has been a source of contention.',
    ieltsSuitability: 'Writing Formal',
    category: 'Opinion & Argument'
  },
  {
    id: 27,
    phrase: 'A wealth of',
    type: 'Phrase',
    banglaMeaning: 'প্রচুর পরিমাণে',
    exampleSentence: 'The website offers a wealth of useful resources.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'General C1'
  },
  {
    id: 28,
    phrase: 'Abide by',
    type: 'Phrase',
    banglaMeaning: 'মেনে চলা',
    exampleSentence: 'All employees must abide by the safety rules.',
    ieltsSuitability: 'Writing Formal',
    category: 'Action & Problem'
  },
  {
    id: 29,
    phrase: 'Account for',
    type: 'Phrase',
    banglaMeaning: 'ব্যাখ্যা করা; মোটের অংশ হওয়া',
    exampleSentence: 'How do you account for the sudden decline?',
    ieltsSuitability: 'Writing Formal',
    category: 'Strategic'
  },
  {
    id: 30,
    phrase: 'Act on',
    type: 'Phrase',
    banglaMeaning: 'কোনো তথ্য/পরামর্শ অনুযায়ী ব্যবস্থা নেওয়া',
    exampleSentence: 'The manager acted on the complaint immediately.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Action & Problem'
  },
  {
    id: 31,
    phrase: 'Add up',
    type: 'Phrasal idiom',
    banglaMeaning: 'যুক্তিসংগত মনে হওয়া',
    exampleSentence: 'His explanation simply does not add up.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Opinion & Argument'
  },
  {
    id: 32,
    phrase: 'All things considered',
    type: 'Idiom',
    banglaMeaning: 'সবকিছু বিবেচনায়',
    exampleSentence: 'All things considered, the proposal is worthwhile.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Opinion & Argument'
  },
  {
    id: 33,
    phrase: 'Around the clock',
    type: 'Idiom',
    banglaMeaning: 'দিন-রাত অবিরাম',
    exampleSentence: 'The emergency team worked around the clock.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Time & Outcome'
  },
  {
    id: 34,
    phrase: 'As a rule',
    type: 'Phrase',
    banglaMeaning: 'সাধারণত; নিয়ম হিসেবে',
    exampleSentence: 'As a rule, I avoid making decisions in haste.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'General C1'
  },
  {
    id: 35,
    phrase: 'At all costs',
    type: 'Idiom',
    banglaMeaning: 'যে কোনো মূল্যে',
    exampleSentence: 'We must avoid delays at all costs.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Action & Problem'
  },
  {
    id: 36,
    phrase: 'At first glance',
    type: 'Phrase',
    banglaMeaning: 'প্রথম দেখায়',
    exampleSentence: 'At first glance, the figures appear convincing.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 37,
    phrase: 'At face value',
    type: 'Phrase',
    banglaMeaning: 'বাহ্যিক অর্থে সরলভাবে গ্রহণ করা',
    exampleSentence: 'You should not take every claim at face value.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Opinion & Argument'
  },
  {
    id: 38,
    phrase: 'At length',
    type: 'Phrase',
    banglaMeaning: 'অবশেষে; বিস্তারিতভাবে',
    exampleSentence: 'They discussed the proposal at length.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'General C1'
  },
  {
    id: 39,
    phrase: 'At short notice',
    type: 'Phrase',
    banglaMeaning: 'অল্প সময়ের নোটিশে',
    exampleSentence: 'Thank you for helping at such short notice.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Time & Outcome'
  },
  {
    id: 40,
    phrase: 'Backfire',
    type: 'Verb/Idiom',
    banglaMeaning: 'উল্টো ফল দেওয়া',
    exampleSentence: 'The campaign may backfire if the message seems dishonest.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Time & Outcome'
  },
  {
    id: 41,
    phrase: 'Back down',
    type: 'Phrasal verb',
    banglaMeaning: 'দাবি বা অবস্থান থেকে সরে আসা',
    exampleSentence: 'The company refused to back down.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Action & Problem'
  },
  {
    id: 42,
    phrase: 'Back up',
    type: 'Phrasal verb',
    banglaMeaning: 'সমর্থন করা',
    exampleSentence: 'The data backs up her argument.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Opinion & Argument'
  },
  {
    id: 43,
    phrase: 'Bear the brunt of',
    type: 'Idiom',
    banglaMeaning: 'সবচেয়ে বেশি ক্ষতির শিকার হওয়া',
    exampleSentence: 'Small businesses bore the brunt of the downturn.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 44,
    phrase: 'Beat around the bush',
    type: 'Idiom',
    banglaMeaning: 'মূল কথা এড়িয়ে ঘুরিয়ে কথা বলা',
    exampleSentence: 'Stop beating around the bush and tell me the truth.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Action & Problem'
  },
  {
    id: 45,
    phrase: 'Behind the scenes',
    type: 'Idiom',
    banglaMeaning: 'গোপনে বা আড়ালে',
    exampleSentence: 'A great deal of work happens behind the scenes.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'General C1'
  },
  {
    id: 46,
    phrase: 'Bend the rules',
    type: 'Idiom',
    banglaMeaning: 'কিছুটা নিয়মের ব্যতিক্রম করা',
    exampleSentence: 'They bent the rules to help a loyal customer.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Action & Problem'
  },
  {
    id: 47,
    phrase: 'Bite the bullet',
    type: 'Idiom',
    banglaMeaning: 'কঠিন বিষয় সাহস করে মেনে নেওয়া',
    exampleSentence: 'I decided to bite the bullet and pay for the repairs.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Action & Problem'
  },
  {
    id: 48,
    phrase: 'Blow out of proportion',
    type: 'Idiom',
    banglaMeaning: 'বিষয়কে অতিরঞ্জিত করা',
    exampleSentence: 'The media blew the incident out of proportion.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Opinion & Argument'
  },
  {
    id: 49,
    phrase: 'Break new ground',
    type: 'Idiom',
    banglaMeaning: 'নতুন ক্ষেত্রে পথিকৃৎ হওয়া',
    exampleSentence: 'The research could break new ground.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Time & Outcome'
  },
  {
    id: 50,
    phrase: 'Break the ice',
    type: 'Idiom',
    banglaMeaning: 'প্রথম অস্বস্তি দূর করে স্বাভাবিক পরিবেশ তৈরি করা',
    exampleSentence: 'He told a joke to break the ice.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Action & Problem'
  },
  {
    id: 51,
    phrase: 'Bring about',
    type: 'Phrase',
    banglaMeaning: 'ঘটিয়ে তোলা',
    exampleSentence: 'The reforms brought about significant changes.',
    ieltsSuitability: 'Writing Formal',
    category: 'Time & Outcome'
  },
  {
    id: 52,
    phrase: 'Bring to light',
    type: 'Idiom',
    banglaMeaning: 'প্রকাশ্যে নিয়ে আসা',
    exampleSentence: 'The investigation brought several problems to light.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 53,
    phrase: 'Bring home',
    type: 'Phrase',
    banglaMeaning: 'বাস্তবতার গুরুত্ব স্পষ্ট করে দেওয়া',
    exampleSentence: 'The figures bring home the scale of the problem.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 54,
    phrase: 'Brush aside',
    type: 'Phrasal verb',
    banglaMeaning: 'গুরুত্ব না দেওয়া; উড়িয়ে দেওয়া',
    exampleSentence: 'The minister brushed aside the criticism.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Action & Problem'
  },
  {
    id: 55,
    phrase: 'Call into question',
    type: 'Phrase',
    banglaMeaning: 'সন্দেহের মধ্যে ফেলা',
    exampleSentence: 'The findings call into question the original theory.',
    ieltsSuitability: 'Writing Formal',
    category: 'Opinion & Argument'
  },
  {
    id: 56,
    phrase: 'Call the shots',
    type: 'Idiom',
    banglaMeaning: 'সিদ্ধান্ত নেওয়ার নিয়ন্ত্রণ থাকা',
    exampleSentence: 'Who actually calls the shots here?',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Action & Problem'
  },
  {
    id: 57,
    phrase: 'Capable of',
    type: 'Phrase',
    banglaMeaning: 'সক্ষম',
    exampleSentence: 'She is capable of handling complex tasks.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'General C1'
  },
  {
    id: 58,
    phrase: 'Carry weight',
    type: 'Idiom',
    banglaMeaning: 'প্রভাব বা গুরুত্ব থাকা',
    exampleSentence: 'His opinion carries considerable weight.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 59,
    phrase: 'Carry out',
    type: 'Phrase',
    banglaMeaning: 'কার্যকর করা; সম্পন্ন করা',
    exampleSentence: 'The researchers carried out a detailed survey.',
    ieltsSuitability: 'Writing Formal',
    category: 'Action & Problem'
  },
  {
    id: 60,
    phrase: 'Cast doubt on',
    type: 'Phrase',
    banglaMeaning: 'সন্দেহ সৃষ্টি করা',
    exampleSentence: 'The new evidence casts doubt on the report.',
    ieltsSuitability: 'Writing Formal',
    category: 'Opinion & Argument'
  },
  {
    id: 61,
    phrase: 'Change of heart',
    type: 'Idiom',
    banglaMeaning: 'মত পরিবর্তন',
    exampleSentence: 'He had a change of heart and accepted the offer.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Time & Outcome'
  },
  {
    id: 62,
    phrase: 'Come under fire',
    type: 'Idiom',
    banglaMeaning: 'তীব্র সমালোচনার মুখে পড়া',
    exampleSentence: 'The policy came under fire from opposition groups.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Opinion & Argument'
  },
  {
    id: 63,
    phrase: 'Come to terms with',
    type: 'Phrase',
    banglaMeaning: 'কঠিন বাস্তবতা মেনে নেওয়া',
    exampleSentence: 'She eventually came to terms with the loss.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Action & Problem'
  },
  {
    id: 64,
    phrase: 'Come in handy',
    type: 'Idiom',
    banglaMeaning: 'প্রয়োজনে কাজে লাগা',
    exampleSentence: 'This guide will come in handy during the trip.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'General C1'
  },
  {
    id: 65,
    phrase: 'Come out of the blue',
    type: 'Idiom',
    banglaMeaning: 'হঠাৎ ও অপ্রত্যাশিতভাবে আসা',
    exampleSentence: 'The resignation came out of the blue.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Time & Outcome'
  },
  {
    id: 66,
    phrase: 'Common ground',
    type: 'Idiom',
    banglaMeaning: 'অভিন্ন মত বা ভিত্তি',
    exampleSentence: 'The two sides finally found common ground.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Opinion & Argument'
  },
  {
    id: 67,
    phrase: 'Conducive to',
    type: 'Phrase',
    banglaMeaning: 'অনুকূল',
    exampleSentence: 'A quiet room is conducive to concentration.',
    ieltsSuitability: 'Writing Formal',
    category: 'Strategic'
  },
  {
    id: 68,
    phrase: 'Conform to',
    type: 'Phrase',
    banglaMeaning: 'নিয়ম বা মান অনুযায়ী হওয়া',
    exampleSentence: 'All products must conform to safety standards.',
    ieltsSuitability: 'Writing Formal',
    category: 'Strategic'
  },
  {
    id: 69,
    phrase: 'Consistent with',
    type: 'Phrase',
    banglaMeaning: 'সামঞ্জস্যপূর্ণ',
    exampleSentence: 'The results are consistent with previous research.',
    ieltsSuitability: 'Writing Formal',
    category: 'Opinion & Argument'
  },
  {
    id: 70,
    phrase: 'Contrary to',
    type: 'Phrase',
    banglaMeaning: 'বিপরীত',
    exampleSentence: 'Contrary to expectations, sales increased.',
    ieltsSuitability: 'Writing Formal',
    category: 'Opinion & Argument'
  },
  {
    id: 71,
    phrase: 'Count on',
    type: 'Phrasal verb',
    banglaMeaning: 'ভরসা করা',
    exampleSentence: 'You can count on me to help.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Action & Problem'
  },
  {
    id: 72,
    phrase: 'Curb the enthusiasm',
    type: 'Idiom',
    banglaMeaning: 'অতিরিক্ত উৎসাহ কমিয়ে রাখা',
    exampleSentence: 'We need to curb our enthusiasm until the figures are confirmed.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Action & Problem'
  },
  {
    id: 73,
    phrase: 'Cut corners',
    type: 'Idiom',
    banglaMeaning: 'কাজ বাঁচাতে মান কমানো',
    exampleSentence: 'The contractor was accused of cutting corners.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Action & Problem'
  },
  {
    id: 74,
    phrase: 'Cut no ice',
    type: 'Idiom',
    banglaMeaning: 'কোনো প্রভাব না ফেলা',
    exampleSentence: 'His excuses cut no ice with the judge.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Opinion & Argument'
  },
  {
    id: 75,
    phrase: 'Cut to the chase',
    type: 'Idiom',
    banglaMeaning: 'ঘুরিয়ে না বলে মূল কথায় আসা',
    exampleSentence: "Let's cut to the chase and discuss the budget.",
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Action & Problem'
  },
  {
    id: 76,
    phrase: "Devil's advocate",
    type: 'Idiom',
    banglaMeaning: 'ইচ্ছাকৃতভাবে বিপরীত মত তুলে ধরা ব্যক্তি',
    exampleSentence: "I'll play devil's advocate and challenge the proposal.",
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Opinion & Argument'
  },
  {
    id: 77,
    phrase: 'Draw a distinction',
    type: 'Phrase',
    banglaMeaning: 'পার্থক্য স্পষ্ট করা',
    exampleSentence: 'We must draw a distinction between risk and uncertainty.',
    ieltsSuitability: 'Writing Formal',
    category: 'Strategic'
  },
  {
    id: 78,
    phrase: 'Draw the line',
    type: 'Idiom',
    banglaMeaning: 'একটি সীমা নির্ধারণ করা',
    exampleSentence: "I don't mind helping, but I draw the line at doing your work.",
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Action & Problem'
  },
  {
    id: 79,
    phrase: 'Drive home',
    type: 'Phrase',
    banglaMeaning: 'কোনো বিষয় জোরালোভাবে বোঝানো',
    exampleSentence: 'The report drives home the need for reform.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 80,
    phrase: 'Easier said than done',
    type: 'Idiom',
    banglaMeaning: 'বলা সহজ, করা কঠিন',
    exampleSentence: 'Reducing waste is easier said than done.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Action & Problem'
  },
  {
    id: 81,
    phrase: 'End up',
    type: 'Phrasal verb',
    banglaMeaning: 'শেষ পর্যন্ত কোনো অবস্থায় পৌঁছানো',
    exampleSentence: 'We ended up staying longer than planned.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Time & Outcome'
  },
  {
    id: 82,
    phrase: 'Enter into',
    type: 'Phrase',
    banglaMeaning: 'কোনো চুক্তি/আলোচনায় প্রবেশ করা',
    exampleSentence: 'The two companies entered into a partnership.',
    ieltsSuitability: 'Writing Formal',
    category: 'Action & Problem'
  },
  {
    id: 83,
    phrase: 'Equate with',
    type: 'Phrase',
    banglaMeaning: 'সমতুল্য মনে করা',
    exampleSentence: 'High income should not be equated with happiness.',
    ieltsSuitability: 'Writing Formal',
    category: 'Opinion & Argument'
  },
  {
    id: 84,
    phrase: 'Exception to the rule',
    type: 'Phrase',
    banglaMeaning: 'সাধারণ নিয়মের ব্যতিক্রম',
    exampleSentence: 'There are always exceptions to the rule.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'General C1'
  },
  {
    id: 85,
    phrase: 'Face up to',
    type: 'Phrasal verb',
    banglaMeaning: 'সাহস করে মোকাবিলা করা',
    exampleSentence: 'We need to face up to the financial reality.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Action & Problem'
  },
  {
    id: 86,
    phrase: 'Fall short of',
    type: 'Phrase',
    banglaMeaning: 'প্রত্যাশা বা মান পূরণে ব্যর্থ হওয়া',
    exampleSentence: 'The results fell short of expectations.',
    ieltsSuitability: 'Writing Formal',
    category: 'Time & Outcome'
  },
  {
    id: 87,
    phrase: 'Far-reaching',
    type: 'Adjective/Phrase',
    banglaMeaning: 'ব্যাপক প্রভাবশালী',
    exampleSentence: 'The reform could have far-reaching consequences.',
    ieltsSuitability: 'Writing Formal',
    category: 'Strategic'
  },
  {
    id: 88,
    phrase: "Feather one's own nest",
    type: 'Idiom',
    banglaMeaning: 'নিজের লাভের ব্যবস্থা করা',
    exampleSentence: 'The official was accused of feathering his own nest.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Action & Problem'
  },
  {
    id: 89,
    phrase: 'Find fault with',
    type: 'Phrase',
    banglaMeaning: 'দোষ খোঁজা',
    exampleSentence: "He is always finding fault with other people's work.",
    ieltsSuitability: 'Speaking & Writing',
    category: 'Opinion & Argument'
  },
  {
    id: 90,
    phrase: 'First and foremost',
    type: 'Phrase',
    banglaMeaning: 'সবার আগে এবং সবচেয়ে গুরুত্বপূর্ণভাবে',
    exampleSentence: 'First and foremost, we need to protect public safety.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 91,
    phrase: 'Fit the bill',
    type: 'Idiom',
    banglaMeaning: 'প্রয়োজনের সঙ্গে পুরোপুরি মানানসই হওয়া',
    exampleSentence: 'This candidate seems to fit the bill.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'General C1'
  },
  {
    id: 92,
    phrase: 'For all intents and purposes',
    type: 'Idiom',
    banglaMeaning: 'কার্যত; বাস্তব অর্থে',
    exampleSentence: 'For all intents and purposes, the deal is complete.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Opinion & Argument'
  },
  {
    id: 93,
    phrase: 'For the time being',
    type: 'Phrase',
    banglaMeaning: 'এই মুহূর্তে; আপাতত',
    exampleSentence: 'For the time being, the road will remain closed.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Time & Outcome'
  },
  {
    id: 94,
    phrase: 'From scratch',
    type: 'Idiom',
    banglaMeaning: 'শুরু থেকে',
    exampleSentence: 'They built the business from scratch.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Time & Outcome'
  },
  {
    id: 95,
    phrase: 'Gain ground',
    type: 'Idiom',
    banglaMeaning: 'অগ্রগতি করা; জনপ্রিয়তা বাড়ানো',
    exampleSentence: 'The party is gaining ground among younger voters.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Time & Outcome'
  },
  {
    id: 96,
    phrase: 'Get carried away',
    type: 'Idiom',
    banglaMeaning: 'অতিরিক্ত উত্তেজিত হয়ে যাওয়া',
    exampleSentence: "Don't get carried away by early success.",
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Action & Problem'
  },
  {
    id: 97,
    phrase: 'Get the hang of',
    type: 'Idiom',
    banglaMeaning: 'কাজটির কৌশল রপ্ত করা',
    exampleSentence: "You'll soon get the hang of the new system.",
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Action & Problem'
  },
  {
    id: 98,
    phrase: 'Give rise to',
    type: 'Phrase',
    banglaMeaning: 'ঘটনা/সমস্যার সৃষ্টি করা',
    exampleSentence: 'The decision gave rise to several complaints.',
    ieltsSuitability: 'Writing Formal',
    category: 'Time & Outcome'
  },
  {
    id: 99,
    phrase: 'Give way to',
    type: 'Phrase',
    banglaMeaning: 'জায়গা ছেড়ে দেওয়া; পরিবর্তিত হওয়া',
    exampleSentence: 'Old traditions gradually gave way to new customs.',
    ieltsSuitability: 'Writing Formal',
    category: 'Time & Outcome'
  },
  {
    id: 100,
    phrase: 'Go to great lengths',
    type: 'Idiom',
    banglaMeaning: 'অনেক চেষ্টা করা',
    exampleSentence: 'She went to great lengths to verify the information.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Action & Problem'
  },
  {
    id: 101,
    phrase: 'Go hand in hand',
    type: 'Idiom',
    banglaMeaning: 'ঘনিষ্ঠভাবে একসঙ্গে সম্পর্কিত হওয়া',
    exampleSentence: 'Economic growth and employment often go hand in hand.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 102,
    phrase: "Go out of one's way",
    type: 'Idiom',
    banglaMeaning: 'বিশেষভাবে অতিরিক্ত চেষ্টা করা',
    exampleSentence: 'He went out of his way to help us.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Action & Problem'
  },
  {
    id: 103,
    phrase: 'Go the extra mile',
    type: 'Idiom',
    banglaMeaning: 'প্রত্যাশার চেয়ে বেশি চেষ্টা করা',
    exampleSentence: 'The staff went the extra mile for their customers.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Action & Problem'
  },
  {
    id: 104,
    phrase: 'Have a bearing on',
    type: 'Phrase',
    banglaMeaning: 'প্রভাব ফেলা',
    exampleSentence: 'The decision may have a bearing on future policy.',
    ieltsSuitability: 'Writing Formal',
    category: 'Strategic'
  },
  {
    id: 105,
    phrase: 'Have a say',
    type: 'Idiom',
    banglaMeaning: 'মতামত দেওয়ার অধিকার থাকা',
    exampleSentence: 'Employees should have a say in major decisions.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Opinion & Argument'
  },
  {
    id: 106,
    phrase: "Have one's hands full",
    type: 'Idiom',
    banglaMeaning: 'অনেক কাজে ব্যস্ত থাকা',
    exampleSentence: 'I have my hands full this week.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'General C1'
  },
  {
    id: 107,
    phrase: 'Hold accountable',
    type: 'Phrase',
    banglaMeaning: 'জবাবদিহির আওতায় আনা',
    exampleSentence: 'Leaders must be held accountable for their actions.',
    ieltsSuitability: 'Writing Formal',
    category: 'Strategic'
  },
  {
    id: 108,
    phrase: "Hold one's ground",
    type: 'Idiom',
    banglaMeaning: 'নিজের অবস্থানে অটল থাকা',
    exampleSentence: 'She held her ground despite strong opposition.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Opinion & Argument'
  },
  {
    id: 109,
    phrase: 'In accordance with',
    type: 'Phrase',
    banglaMeaning: 'অনুযায়ী',
    exampleSentence: 'The work was completed in accordance with the guidelines.',
    ieltsSuitability: 'Writing Formal',
    category: 'Strategic'
  },
  {
    id: 110,
    phrase: 'In any event',
    type: 'Phrase',
    banglaMeaning: 'যাই হোক; যে পরিস্থিতিই হোক',
    exampleSentence: 'In any event, we need a backup plan.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 111,
    phrase: 'In essence',
    type: 'Phrase',
    banglaMeaning: 'মূলত',
    exampleSentence: 'In essence, the two proposals are very similar.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 112,
    phrase: 'In favour of',
    type: 'Phrase',
    banglaMeaning: 'পক্ষে',
    exampleSentence: 'Most voters were in favour of the change.',
    ieltsSuitability: 'Writing Formal',
    category: 'Opinion & Argument'
  },
  {
    id: 113,
    phrase: 'In jeopardy',
    type: 'Phrase',
    banglaMeaning: 'বিপদের মধ্যে',
    exampleSentence: 'Thousands of jobs are in jeopardy.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 114,
    phrase: 'In no time',
    type: 'Idiom',
    banglaMeaning: 'অতি অল্প সময়ে',
    exampleSentence: "You'll finish the task in no time.",
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Time & Outcome'
  },
  {
    id: 115,
    phrase: 'In retrospect',
    type: 'Phrase',
    banglaMeaning: 'পরে ফিরে দেখলে',
    exampleSentence: 'In retrospect, we should have acted sooner.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 116,
    phrase: 'In tandem with',
    type: 'Phrase',
    banglaMeaning: 'সমন্বয় করে',
    exampleSentence: 'The training was delivered in tandem with practical sessions.',
    ieltsSuitability: 'Writing Formal',
    category: 'Strategic'
  },
  {
    id: 117,
    phrase: 'In the midst of',
    type: 'Phrase',
    banglaMeaning: 'মাঝখানে; চলমান অবস্থায়',
    exampleSentence: 'The announcement came in the midst of a crisis.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Time & Outcome'
  },
  {
    id: 118,
    phrase: 'Invariably',
    type: 'Adverb',
    banglaMeaning: 'প্রায় সবসময়; ব্যতিক্রমহীনভাবে',
    exampleSentence: 'He invariably arrives early.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'General C1'
  },
  {
    id: 119,
    phrase: 'It goes without saying',
    type: 'Idiom',
    banglaMeaning: 'এটা না বললেও স্পষ্ট',
    exampleSentence: 'It goes without saying that safety comes first.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Strategic'
  },
  {
    id: 120,
    phrase: 'Jump to conclusions',
    type: 'Idiom',
    banglaMeaning: 'তাড়াহুড়ো করে সিদ্ধান্তে পৌঁছানো',
    exampleSentence: "Don't jump to conclusions before hearing both sides.",
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Opinion & Argument'
  },
  {
    id: 121,
    phrase: 'Keep tabs on',
    type: 'Idiom',
    banglaMeaning: 'নজর রাখা',
    exampleSentence: 'We keep tabs on changes in the market.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Strategic'
  },
  {
    id: 122,
    phrase: 'Keep something at bay',
    type: 'Idiom',
    banglaMeaning: 'দূরে বা নিয়ন্ত্রণে রাখা',
    exampleSentence: 'Exercise can help keep stress at bay.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Action & Problem'
  },
  {
    id: 123,
    phrase: 'Lay the groundwork',
    type: 'Idiom',
    banglaMeaning: 'ভিত্তি প্রস্তুত করা',
    exampleSentence: 'The agreement laid the groundwork for future cooperation.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Time & Outcome'
  },
  {
    id: 124,
    phrase: 'Leave no stone unturned',
    type: 'Idiom',
    banglaMeaning: 'কোনো চেষ্টা বাদ না দেওয়া',
    exampleSentence: 'Investigators left no stone unturned.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Action & Problem'
  },
  {
    id: 125,
    phrase: 'Let the cat out of the bag',
    type: 'Idiom',
    banglaMeaning: 'গোপন কথা ফাঁস করে দেওয়া',
    exampleSentence: 'Someone let the cat out of the bag about the surprise.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Action & Problem'
  },
  {
    id: 126,
    phrase: 'Level-headed',
    type: 'Adjective',
    banglaMeaning: 'শান্ত ও বাস্তববুদ্ধিসম্পন্ন',
    exampleSentence: 'She remained level-headed during the crisis.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'General C1'
  },
  {
    id: 127,
    phrase: 'Live up to',
    type: 'Phrase',
    banglaMeaning: 'প্রত্যাশা অনুযায়ী হওয়া',
    exampleSentence: 'The product failed to live up to its promise.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Time & Outcome'
  },
  {
    id: 128,
    phrase: 'Lose sight of',
    type: 'Phrase',
    banglaMeaning: 'দৃষ্টি/মনোযোগ হারানো',
    exampleSentence: 'We must not lose sight of the main objective.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 129,
    phrase: 'Make allowances for',
    type: 'Phrase',
    banglaMeaning: 'পরিস্থিতি বিবেচনায় ছাড় দেওয়া',
    exampleSentence: 'We should make allowances for his lack of experience.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 130,
    phrase: 'Make a case for',
    type: 'Phrase',
    banglaMeaning: 'কোনো বিষয়ের পক্ষে যুক্তি দেখানো',
    exampleSentence: 'The report makes a strong case for reform.',
    ieltsSuitability: 'Writing Formal',
    category: 'Opinion & Argument'
  },
  {
    id: 131,
    phrase: 'Make ends meet',
    type: 'Idiom',
    banglaMeaning: 'আয় দিয়ে খরচ চালানো',
    exampleSentence: 'Many families struggle to make ends meet.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'General C1'
  },
  {
    id: 132,
    phrase: 'Make headway',
    type: 'Idiom',
    banglaMeaning: 'অগ্রগতি করা',
    exampleSentence: 'The team is finally making headway.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Time & Outcome'
  },
  {
    id: 133,
    phrase: 'Meet the criteria',
    type: 'Phrase',
    banglaMeaning: 'নির্ধারিত শর্ত পূরণ করা',
    exampleSentence: 'Applicants must meet the criteria to qualify.',
    ieltsSuitability: 'Writing Formal',
    category: 'Strategic'
  },
  {
    id: 134,
    phrase: 'Miss the point',
    type: 'Idiom',
    banglaMeaning: 'মূল বিষয়টি বুঝতে ব্যর্থ হওয়া',
    exampleSentence: 'You are missing the point of the argument.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Opinion & Argument'
  },
  {
    id: 135,
    phrase: 'Notwithstanding',
    type: 'Preposition/Conjunction',
    banglaMeaning: 'সত্ত্বেও',
    exampleSentence: 'Notwithstanding these challenges, the project succeeded.',
    ieltsSuitability: 'Writing Formal',
    category: 'Opinion & Argument'
  },
  {
    id: 136,
    phrase: 'Off the record',
    type: 'Idiom',
    banglaMeaning: 'আনুষ্ঠানিকভাবে প্রকাশের জন্য নয়',
    exampleSentence: 'Off the record, the manager admitted the plan was risky.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'General C1'
  },
  {
    id: 137,
    phrase: 'On balance',
    type: 'Phrase',
    banglaMeaning: 'সব দিক বিচার করে',
    exampleSentence: 'On balance, the benefits outweigh the costs.',
    ieltsSuitability: 'Writing Formal',
    category: 'Strategic'
  },
  {
    id: 138,
    phrase: 'On behalf of',
    type: 'Phrase',
    banglaMeaning: 'কারও পক্ষে বা প্রতিনিধিত্ব করে',
    exampleSentence: 'I am writing on behalf of the committee.',
    ieltsSuitability: 'Writing Formal',
    category: 'General C1'
  },
  {
    id: 139,
    phrase: 'On the brink of',
    type: 'Phrase',
    banglaMeaning: 'দোরগোড়ায়; প্রায় ঘটতে যাচ্ছে',
    exampleSentence: 'The company was on the brink of collapse.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Time & Outcome'
  },
  {
    id: 140,
    phrase: 'On the contrary',
    type: 'Phrase',
    banglaMeaning: 'বরং বিপরীতভাবে',
    exampleSentence: 'On the contrary, the evidence supports her view.',
    ieltsSuitability: 'Writing Formal',
    category: 'Opinion & Argument'
  },
  {
    id: 141,
    phrase: 'On the grounds that',
    type: 'Phrase',
    banglaMeaning: 'এই যুক্তিতে যে',
    exampleSentence: 'They rejected the request on the grounds that it was incomplete.',
    ieltsSuitability: 'Writing Formal',
    category: 'Opinion & Argument'
  },
  {
    id: 142,
    phrase: 'On the same wavelength',
    type: 'Idiom',
    banglaMeaning: 'একইভাবে চিন্তা করা',
    exampleSentence: "We are on the same wavelength about the project's goals.",
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Opinion & Argument'
  },
  {
    id: 143,
    phrase: 'Out of hand',
    type: 'Idiom',
    banglaMeaning: 'সঙ্গে সঙ্গে; নিয়ন্ত্রণের বাইরে',
    exampleSentence: 'The proposal was rejected out of hand.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Action & Problem'
  },
  {
    id: 144,
    phrase: 'Out of the question',
    type: 'Idiom',
    banglaMeaning: 'একেবারেই অসম্ভব বা অগ্রহণযোগ্য',
    exampleSentence: 'A refund is out of the question.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Opinion & Argument'
  },
  {
    id: 145,
    phrase: 'Overstep the mark',
    type: 'Idiom',
    banglaMeaning: 'সীমা অতিক্রম করা',
    exampleSentence: 'His comments clearly overstepped the mark.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Action & Problem'
  },
  {
    id: 146,
    phrase: 'Pay lip service to',
    type: 'Idiom',
    banglaMeaning: 'মুখে সমর্থন দেখানো কিন্তু বাস্তবে না করা',
    exampleSentence: 'Many firms pay lip service to sustainability.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Action & Problem'
  },
  {
    id: 147,
    phrase: 'Pick up on',
    type: 'Phrasal verb',
    banglaMeaning: 'বুঝতে বা লক্ষ্য করতে পারা',
    exampleSentence: 'She quickly picked up on the tension in the room.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 148,
    phrase: 'Play a role in',
    type: 'Phrase',
    banglaMeaning: 'ভূমিকা পালন করা',
    exampleSentence: 'Education plays a key role in social mobility.',
    ieltsSuitability: 'Writing Formal',
    category: 'Strategic'
  },
  {
    id: 149,
    phrase: 'Play down',
    type: 'Phrasal verb',
    banglaMeaning: 'গুরুত্ব কমিয়ে দেখানো',
    exampleSentence: 'The government played down the severity of the issue.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 150,
    phrase: 'Point out',
    type: 'Phrasal verb',
    banglaMeaning: 'উল্লেখ করে দেখানো',
    exampleSentence: 'She pointed out several inconsistencies.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Opinion & Argument'
  },
  {
    id: 151,
    phrase: 'Put forward',
    type: 'Phrasal verb',
    banglaMeaning: 'প্রস্তাব করা',
    exampleSentence: 'The committee put forward a series of recommendations.',
    ieltsSuitability: 'Writing Formal',
    category: 'Strategic'
  },
  {
    id: 152,
    phrase: 'Put into perspective',
    type: 'Phrase',
    banglaMeaning: 'যথাযথ প্রেক্ষাপটে দেখা',
    exampleSentence: 'The figures help put the problem into perspective.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 153,
    phrase: "Put one's foot down",
    type: 'Idiom',
    banglaMeaning: 'দৃঢ়ভাবে না বলা',
    exampleSentence: 'Her parents put their foot down about the trip.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Action & Problem'
  },
  {
    id: 154,
    phrase: 'Put up with',
    type: 'Phrasal verb',
    banglaMeaning: 'সহ্য করা',
    exampleSentence: 'I cannot put up with this level of noise.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Action & Problem'
  },
  {
    id: 155,
    phrase: 'Read between the lines',
    type: 'Idiom',
    banglaMeaning: 'অন্তর্নিহিত অর্থ বুঝতে পারা',
    exampleSentence: 'If you read between the lines, the report is quite critical.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Strategic'
  },
  {
    id: 156,
    phrase: 'Red flag',
    type: 'Idiom',
    banglaMeaning: 'সতর্কসংকেত',
    exampleSentence: 'The missing documents were a major red flag.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Strategic'
  },
  {
    id: 157,
    phrase: 'Rule out',
    type: 'Phrasal verb',
    banglaMeaning: 'সম্ভাবনা বাতিল করা',
    exampleSentence: 'Doctors have ruled out an infection.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 158,
    phrase: 'Run the risk of',
    type: 'Phrase',
    banglaMeaning: 'ঝুঁকি নেওয়া',
    exampleSentence: 'We run the risk of losing public trust.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 159,
    phrase: 'Run into',
    type: 'Phrasal verb',
    banglaMeaning: 'সমস্যা বা বাধার সম্মুখীন হওয়া',
    exampleSentence: 'We ran into several technical problems.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Action & Problem'
  },
  {
    id: 160,
    phrase: 'See eye to eye',
    type: 'Idiom',
    banglaMeaning: 'সম্পূর্ণ একমত হওয়া',
    exampleSentence: 'We do not always see eye to eye.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Opinion & Argument'
  },
  {
    id: 161,
    phrase: 'Set the stage for',
    type: 'Idiom',
    banglaMeaning: 'পরবর্তী কিছুর ভিত্তি তৈরি করা',
    exampleSentence: 'The agreement set the stage for further talks.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Time & Outcome'
  },
  {
    id: 162,
    phrase: 'Settle for',
    type: 'Phrasal verb',
    banglaMeaning: 'কম পছন্দের কিছু মেনে নেওয়া',
    exampleSentence: "Don't settle for mediocre results.",
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Action & Problem'
  },
  {
    id: 163,
    phrase: 'Sit on the fence',
    type: 'Idiom',
    banglaMeaning: 'সিদ্ধান্ত না নিয়ে মাঝামাঝি থাকা',
    exampleSentence: 'You cannot sit on the fence forever.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Opinion & Argument'
  },
  {
    id: 164,
    phrase: 'Speak volumes',
    type: 'Idiom',
    banglaMeaning: 'অনেক কিছু প্রকাশ করা',
    exampleSentence: 'Her silence spoke volumes.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 165,
    phrase: 'Stand to reason',
    type: 'Idiom',
    banglaMeaning: 'যুক্তিসংগতভাবে স্বাভাবিক মনে হওয়া',
    exampleSentence: 'It stands to reason that prices will rise.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Opinion & Argument'
  },
  {
    id: 166,
    phrase: "Stand one's ground",
    type: 'Idiom',
    banglaMeaning: 'নিজের অবস্থানে অটল থাকা',
    exampleSentence: 'The residents stood their ground.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Opinion & Argument'
  },
  {
    id: 167,
    phrase: "Step up one's game",
    type: 'Idiom',
    banglaMeaning: 'নিজের দক্ষতা বা প্রচেষ্টা বাড়ানো',
    exampleSentence: 'If you want to compete, you need to step up your game.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Action & Problem'
  },
  {
    id: 168,
    phrase: 'Strike a balance',
    type: 'Idiom',
    banglaMeaning: 'ভারসাম্য বজায় রাখা',
    exampleSentence: 'We need to strike a balance between work and leisure.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 169,
    phrase: 'Take into account',
    type: 'Phrase',
    banglaMeaning: 'বিবেচনায় নেওয়া',
    exampleSentence: 'The plan takes local conditions into account.',
    ieltsSuitability: 'Writing Formal',
    category: 'Strategic'
  },
  {
    id: 170,
    phrase: 'Take issue with',
    type: 'Phrase',
    banglaMeaning: 'কোনো বিষয়ের সঙ্গে আপত্তি/অসম্মতি জানানো',
    exampleSentence: 'I take issue with the way the figures were presented.',
    ieltsSuitability: 'Writing Formal',
    category: 'Opinion & Argument'
  },
  {
    id: 171,
    phrase: 'Take for granted',
    type: 'Phrase',
    banglaMeaning: 'মূল্য না বুঝে স্বাভাবিক ধরে নেওয়া',
    exampleSentence: 'We often take clean water for granted.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 172,
    phrase: 'Take precedence over',
    type: 'Phrase',
    banglaMeaning: 'অগ্রাধিকার পাওয়া',
    exampleSentence: 'Public safety must take precedence over convenience.',
    ieltsSuitability: 'Writing Formal',
    category: 'Strategic'
  },
  {
    id: 173,
    phrase: 'Take the initiative',
    type: 'Phrase',
    banglaMeaning: 'নিজে থেকে উদ্যোগ নেওয়া',
    exampleSentence: 'She took the initiative and contacted the client.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Action & Problem'
  },
  {
    id: 174,
    phrase: 'Take its toll',
    type: 'Idiom',
    banglaMeaning: 'ধীরে ধীরে ক্ষতিকর প্রভাব ফেলা',
    exampleSentence: 'Long hours can take their toll on your health.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Time & Outcome'
  },
  {
    id: 175,
    phrase: 'Take into consideration',
    type: 'Phrase',
    banglaMeaning: 'বিবেচনায় রাখা',
    exampleSentence: 'We must take cost into consideration.',
    ieltsSuitability: 'Writing Formal',
    category: 'Strategic'
  },
  {
    id: 176,
    phrase: 'The bottom line',
    type: 'Idiom',
    banglaMeaning: 'মূল ফলাফল বা সবচেয়ে গুরুত্বপূর্ণ বিষয়',
    exampleSentence: 'The bottom line is that we need more time.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Opinion & Argument'
  },
  {
    id: 177,
    phrase: 'The tip of the iceberg',
    type: 'Idiom',
    banglaMeaning: 'বড় সমস্যার সামান্য দৃশ্যমান অংশ',
    exampleSentence: 'These complaints are just the tip of the iceberg.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 178,
    phrase: 'Through thick and thin',
    type: 'Idiom',
    banglaMeaning: 'সুখে-দুঃখে; সব পরিস্থিতিতে',
    exampleSentence: 'She supported me through thick and thin.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'General C1'
  },
  {
    id: 179,
    phrase: 'Throw light on',
    type: 'Idiom',
    banglaMeaning: 'কোনো বিষয় স্পষ্ট করা',
    exampleSentence: 'The study throws light on the causes of unemployment.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 180,
    phrase: 'To a large extent',
    type: 'Phrase',
    banglaMeaning: 'অনেকাংশে',
    exampleSentence: 'The outcome depends, to a large extent, on funding.',
    ieltsSuitability: 'Writing Formal',
    category: 'Strategic'
  },
  {
    id: 181,
    phrase: 'To some extent',
    type: 'Phrase',
    banglaMeaning: 'কিছুটা মাত্রায়',
    exampleSentence: 'I agree with the argument to some extent.',
    ieltsSuitability: 'Writing Formal',
    category: 'Opinion & Argument'
  },
  {
    id: 182,
    phrase: 'Turn a blind eye to',
    type: 'Idiom',
    banglaMeaning: 'ইচ্ছাকৃতভাবে উপেক্ষা করা',
    exampleSentence: 'We cannot turn a blind eye to corruption.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Action & Problem'
  },
  {
    id: 183,
    phrase: 'Turn out',
    type: 'Phrasal verb',
    banglaMeaning: 'শেষ পর্যন্ত প্রমাণিত হওয়া',
    exampleSentence: 'The event turned out to be a great success.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Time & Outcome'
  },
  {
    id: 184,
    phrase: 'Under no circumstances',
    type: 'Phrase',
    banglaMeaning: 'কোনো পরিস্থিতিতেই নয়',
    exampleSentence: 'Under no circumstances should you share the password.',
    ieltsSuitability: 'Writing Formal',
    category: 'Strategic'
  },
  {
    id: 185,
    phrase: 'Under the impression that',
    type: 'Phrase',
    banglaMeaning: 'এই ধারণায় যে',
    exampleSentence: 'I was under the impression that the meeting had been cancelled.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Opinion & Argument'
  },
  {
    id: 186,
    phrase: 'Up in the air',
    type: 'Idiom',
    banglaMeaning: 'এখনও অনিশ্চিত',
    exampleSentence: 'Our travel plans are still up in the air.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'General C1'
  },
  {
    id: 187,
    phrase: 'Upset the apple cart',
    type: 'Idiom',
    banglaMeaning: 'চলমান পরিকল্পনা বা ব্যবস্থা নষ্ট করে দেওয়া',
    exampleSentence: 'His sudden resignation upset the apple cart.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Action & Problem'
  },
  {
    id: 188,
    phrase: 'Up to scratch',
    type: 'Idiom',
    banglaMeaning: 'প্রয়োজনীয় মানে পৌঁছানো',
    exampleSentence: 'The final draft is not quite up to scratch.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Strategic'
  },
  {
    id: 189,
    phrase: 'Wear many hats',
    type: 'Idiom',
    banglaMeaning: 'একাধিক ভূমিকা পালন করা',
    exampleSentence: 'In a small company, employees often wear many hats.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'General C1'
  },
  {
    id: 190,
    phrase: 'Widespread concern',
    type: 'Phrase',
    banglaMeaning: 'ব্যাপক উদ্বেগ',
    exampleSentence: 'There is widespread concern about rising costs.',
    ieltsSuitability: 'Writing Formal',
    category: 'Strategic'
  },
  {
    id: 191,
    phrase: 'With hindsight',
    type: 'Phrase',
    banglaMeaning: 'পরে ফিরে চিন্তা করলে',
    exampleSentence: 'With hindsight, the decision was clearly a mistake.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 192,
    phrase: 'With regard to',
    type: 'Phrase',
    banglaMeaning: 'সম্পর্কে; বিষয়ে',
    exampleSentence: 'With regard to your request, we need more information.',
    ieltsSuitability: 'Writing Formal',
    category: 'Strategic'
  },
  {
    id: 193,
    phrase: 'Without a doubt',
    type: 'Phrase',
    banglaMeaning: 'নিঃসন্দেহে',
    exampleSentence: 'She is without a doubt the strongest candidate.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Opinion & Argument'
  },
  {
    id: 194,
    phrase: 'Word of mouth',
    type: 'Idiom',
    banglaMeaning: 'মুখে মুখে প্রচার',
    exampleSentence: 'The restaurant became popular through word of mouth.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'General C1'
  },
  {
    id: 195,
    phrase: "Worth one's while",
    type: 'Idiom',
    banglaMeaning: 'সময় ও পরিশ্রমের মূল্য পাওয়ার মতো',
    exampleSentence: 'It may be worth your while to compare prices.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'General C1'
  },
  {
    id: 196,
    phrase: 'Zero in on',
    type: 'Phrasal verb',
    banglaMeaning: 'কোনো নির্দিষ্ট বিষয়ের দিকে মনোযোগ কেন্দ্রীভূত করা',
    exampleSentence: 'The investigation zeroed in on financial records.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 197,
    phrase: 'A case in point',
    type: 'Idiom',
    banglaMeaning: 'উদাহরণ হিসেবে প্রাসঙ্গিক ঘটনা',
    exampleSentence: 'The recent outage is a case in point.',
    ieltsSuitability: 'Writing Formal',
    category: 'Strategic'
  },
  {
    id: 198,
    phrase: 'A chain reaction',
    type: 'Idiom',
    banglaMeaning: 'একটি ঘটনার ফলে ধারাবাহিক প্রতিক্রিয়া',
    exampleSentence: 'The price rise triggered a chain reaction.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Time & Outcome'
  },
  {
    id: 199,
    phrase: 'A close call',
    type: 'Idiom',
    banglaMeaning: 'অল্পের জন্য বিপদ এড়ানো',
    exampleSentence: 'Missing the train was a close call.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'General C1'
  },
  {
    id: 200,
    phrase: 'A cut above',
    cefrLevel: 'C1',
    type: 'Idiom',
    banglaMeaning: 'অন্যদের তুলনায় উৎকৃষ্ট',
    exampleSentence: 'Her latest work is a cut above the rest.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'General C1'
  },
  // ==================== NEW C2 & C1 IDIOMS & ACADEMIC VOCABULARY (201–240) ====================
  {
    id: 201,
    phrase: 'A double-edged sword',
    cefrLevel: 'C2',
    type: 'Idiom',
    banglaMeaning: 'যার ইতিবাচক ও নেতিবাচক উভয় দিকই রয়েছে',
    exampleSentence: 'Rapid artificial intelligence automation represents a quintessential double-edged sword for global employment.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 202,
    phrase: 'By the same token',
    cefrLevel: 'C2',
    type: 'Phrase',
    banglaMeaning: 'ঠিক একই যুক্তিতে / একই কারণে',
    exampleSentence: ' High-density cities reduce per-capita carbon emissions; by the same token, they intensify localized noise pollution.',
    ieltsSuitability: 'Writing Formal',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 203,
    phrase: 'A watershed moment',
    cefrLevel: 'C2',
    type: 'Idiom',
    banglaMeaning: 'যুগান্তকারী বা মোড় ঘুরিয়ে দেওয়া মুহূর্ত',
    exampleSentence: 'The commercialization of renewable battery storage marked a watershed moment in modern energy policy.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 204,
    phrase: 'Stem the tide of',
    cefrLevel: 'C2',
    type: 'Idiom',
    banglaMeaning: 'কোনো নেতিবাচক প্রবণতার প্রবাহ রোধ করা বা থামানো',
    exampleSentence: 'Stringent municipal legislation is required to stem the tide of single-use plastic waste.',
    ieltsSuitability: 'Writing Formal',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 205,
    phrase: 'Pave the way for',
    cefrLevel: 'C1',
    type: 'Idiom',
    banglaMeaning: 'কোনো কিছুর পথ সুগম করা বা ক্ষেত্র প্রস্তুত করা',
    exampleSentence: 'Universal digital literacy programmes pave the way for inclusive economic mobility.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 206,
    phrase: 'Hang in the balance',
    cefrLevel: 'C2',
    type: 'Idiom',
    banglaMeaning: 'অনিশ্চিত ও সংকটাপন্ন অবস্থায় ঝুলে থাকা',
    exampleSentence: 'The survival of fragile coral reef ecosystems hangs in the balance as ocean temperatures rise.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 207,
    phrase: 'Strike a chord with',
    cefrLevel: 'C2',
    type: 'Idiom',
    banglaMeaning: 'মানুষের মনে গভীর সাড়া জাগানো বা আবেগ স্পর্শ করা',
    exampleSentence: 'Environmental documentaries often strike a profound chord with younger demographics.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 208,
    phrase: 'Take precedence over',
    cefrLevel: 'C2',
    type: 'Phrase',
    banglaMeaning: 'অন্য কিছুর চেয়ে বেশি অগ্রাধিকার পাওয়া',
    exampleSentence: 'Public preventative healthcare must take precedence over short-term fiscal austerity.',
    ieltsSuitability: 'Writing Formal',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 209,
    phrase: 'In the grand scheme of things',
    cefrLevel: 'C2',
    type: 'Idiom',
    banglaMeaning: 'সামগ্রিক ও বৃহত্তর প্রেক্ষাপটে বিবেচনা করলে',
    exampleSentence: 'In the grand scheme of things, minor examination setbacks teach invaluable intellectual resilience.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 210,
    phrase: 'Leave a lot to be desired',
    cefrLevel: 'C2',
    type: 'Idiom',
    banglaMeaning: 'মানের দিক থেকে অত্যন্ত অসন্তোষজনক বা ঘাটতিপূর্ণ হওয়া',
    exampleSentence: 'Rural public transport infrastructure in many developing regions still leaves a lot to be desired.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 211,
    phrase: 'Turn a blind eye to',
    cefrLevel: 'C1',
    type: 'Idiom',
    banglaMeaning: 'দেখেও না দেখার ভান করা বা উপেক্ষা করা',
    exampleSentence: 'Regulatory authorities can no longer afford to turn a blind eye to industrial river contamination.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Action & Problem'
  },
  {
    id: 212,
    phrase: 'Weather the storm',
    cefrLevel: 'C2',
    type: 'Idiom',
    banglaMeaning: 'কঠিন সংকট বা প্রতিকূল পরিস্থিতি সাফল্যের সাথে মোকাবিলা করে টিকে থাকা',
    exampleSentence: 'Diversified local economies are far better equipped to weather the storm of global recessions.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 213,
    phrase: 'Stand the test of time',
    cefrLevel: 'C1',
    type: 'Idiom',
    banglaMeaning: 'দীর্ঘকাল ধরে টিকে থাকা ও কার্যকর প্রমাণিত হওয়া',
    exampleSentence: 'Classical architectural monuments have stood the test of time across centuries of urban change.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Time & Outcome'
  },
  {
    id: 214,
    phrase: 'Par for the course',
    cefrLevel: 'C2',
    type: 'Idiom',
    banglaMeaning: 'স্বাভাবিক বা প্রত্যাশিত বিষয় (বিশেষত কোনো চ্যালেঞ্জিং পরিস্থিতিতে)',
    exampleSentence: 'Initial teething problems are par for the course when deploying nationwide digital transit systems.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 215,
    phrase: 'Come to fruition',
    cefrLevel: 'C2',
    type: 'Phrase',
    banglaMeaning: 'বাস্তবে রূপ লাভ করা বা সফলভাবে ফলপ্রসূ হওয়া',
    exampleSentence: 'Decades of genetic research finally came to fruition with targeted mRNA therapies.',
    ieltsSuitability: 'Writing Formal',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 216,
    phrase: 'Wreak havoc on',
    cefrLevel: 'C2',
    type: 'Idiom',
    banglaMeaning: 'মারাত্মক ধ্বংসযজ্ঞ বা বিশৃঙ্খলা সৃষ্টি করা',
    exampleSentence: 'Unchecked deforestation continues to wreak havoc on indigenous biodiversity.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 217,
    phrase: 'Bridge the chasm between',
    cefrLevel: 'C2',
    type: 'Phrase',
    banglaMeaning: 'দুই পক্ষের মধ্যকার বিশাল ব্যবধান বা দূরত্ব ঘোচানো',
    exampleSentence: 'Equitable scholarship funding helps bridge the chasm between affluent and underprivileged learners.',
    ieltsSuitability: 'Writing Formal',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 218,
    phrase: 'Food for thought',
    cefrLevel: 'C1',
    type: 'Idiom',
    banglaMeaning: 'গভীরভাবে চিন্তা করার মতো গুরুত্বপূর্ণ বিষয়',
    exampleSentence: 'The keynote lecture offered compelling food for thought regarding ethical urban planning.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Opinion & Argument'
  },
  {
    id: 219,
    phrase: 'Bode well for',
    cefrLevel: 'C2',
    type: 'Phrase',
    banglaMeaning: 'ভবিষ্যতের জন্য শুভ লক্ষণ বা ইতিবাচক ইঙ্গিত বহন করা',
    exampleSentence: 'Declining solar manufacturing costs bode well for clean energy adoption in emerging markets.',
    ieltsSuitability: 'Writing Formal',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 220,
    phrase: 'Grapple with',
    cefrLevel: 'C1',
    type: 'Phrasal verb',
    banglaMeaning: 'কঠিন কোনো সমস্যার সাথে লড়াই করা বা সমাধানের চেষ্টা করা',
    exampleSentence: 'Metropolitan municipalities are grappling with acute housing affordability crises.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Action & Problem'
  },
  {
    id: 221,
    phrase: 'Ubiquitous (C2 Vocabulary)',
    cefrLevel: 'C2',
    type: 'C2 Vocabulary',
    banglaMeaning: 'সর্বব্যাপী / যা সর্বত্র একই সাথে বিদ্যমান',
    exampleSentence: 'Algorithmic recommendation engines have become ubiquitous in modern digital commerce.',
    ieltsSuitability: 'Writing Formal',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 222,
    phrase: 'Exacerbate (C2 Vocabulary)',
    cefrLevel: 'C2',
    type: 'C2 Vocabulary',
    banglaMeaning: 'কোনো খারাপ পরিস্থিতি বা সংকটকে আরও তীব্র ও জটিল করে তোলা',
    exampleSentence: 'Speculative real-estate investment tends to exacerbate urban wealth disparities.',
    ieltsSuitability: 'Writing Formal',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 223,
    phrase: 'Ameliorate (C2 Vocabulary)',
    cefrLevel: 'C2',
    type: 'C2 Vocabulary',
    banglaMeaning: 'অসহনীয় বা খারাপ অবস্থার উন্নতি সাধন করা / লাঘব করা',
    exampleSentence: 'Targeted micro-finance initiatives can ameliorate rural poverty across agrarian regions.',
    ieltsSuitability: 'Writing Formal',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 224,
    phrase: 'Quintessential (C2 Vocabulary)',
    cefrLevel: 'C2',
    type: 'C2 Vocabulary',
    banglaMeaning: 'সবচেয়ে নিখুঁত ও আদর্শ উদাহরণস্বরূপ',
    exampleSentence: 'Public libraries remain the quintessential civic institution for lifelong self-directed learning.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 225,
    phrase: 'Conundrum (C2 Vocabulary)',
    cefrLevel: 'C2',
    type: 'C2 Vocabulary',
    banglaMeaning: 'অত্যন্ত জটিল ও বিভ্রান্তিকর সমস্যা যার সমাধান সহজ নয়',
    exampleSentence: 'Balancing industrial expansion with ecological preservation poses a perennial policy conundrum.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 226,
    phrase: 'Ephemeral (C2 Vocabulary)',
    cefrLevel: 'C2',
    type: 'C2 Vocabulary',
    banglaMeaning: 'ক্ষণস্থায়ী / অতি অল্প সময় স্থায়ী হয় এমন',
    exampleSentence: 'Viral social media trends are notoriously ephemeral compared to enduring literary classics.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 227,
    phrase: 'Dichotomy (C2 Vocabulary)',
    cefrLevel: 'C2',
    type: 'C2 Vocabulary',
    banglaMeaning: 'দুটি সম্পূর্ণ বিপরীত বিষয় বা ধারণার মধ্যকার স্পষ্ট বিভাজন',
    exampleSentence: 'Modern educators reject the false dichotomy between vocational training and liberal arts.',
    ieltsSuitability: 'Writing Formal',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 228,
    phrase: 'Pervasive (C2 Vocabulary)',
    cefrLevel: 'C2',
    type: 'C2 Vocabulary',
    banglaMeaning: 'সমাজের প্রতিটি স্তরে গভীরভাবে ছড়িয়ে পড়া (প্রায়শই নেতিবাচক অর্থে)',
    exampleSentence: 'The pervasive influence of targeted advertising shapes adolescent consumption habits.',
    ieltsSuitability: 'Writing Formal',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 229,
    phrase: 'Ostensibly (C2 Vocabulary)',
    cefrLevel: 'C2',
    type: 'C2 Vocabulary',
    banglaMeaning: 'দৃশ্যত বা বাহ্যিকভাবে (যদিও প্রকৃত সত্য ভিন্ন হতে পারে)',
    exampleSentence: 'The policy was ostensibly designed to simplify taxation, yet it burdened small enterprises.',
    ieltsSuitability: 'Writing Formal',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 230,
    phrase: 'Paradigm shift (C2 Vocabulary)',
    cefrLevel: 'C2',
    type: 'C2 Vocabulary',
    banglaMeaning: 'চিন্তাধারা বা কর্মপদ্ধতিতে মৌলিক ও বৈপ্লবিক পরিবর্তন',
    exampleSentence: 'Remote cloud collaboration has triggered a permanent paradigm shift in corporate architecture.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 231,
    phrase: 'Mitigate (C1 Vocabulary)',
    cefrLevel: 'C1',
    type: 'C1 Vocabulary',
    banglaMeaning: 'ক্ষতিকর প্রভাব বা তীব্রতা হ্রাস করা / প্রশমন করা',
    exampleSentence: 'Coastal mangrove restoration helps mitigate the destructive impact of cyclonic storm surges.',
    ieltsSuitability: 'Writing Formal',
    category: 'Strategic'
  },
  {
    id: 232,
    phrase: 'Pragmatic (C1 Vocabulary)',
    cefrLevel: 'C1',
    type: 'C1 Vocabulary',
    banglaMeaning: 'বাস্তবসম্মত ও ব্যবহারিক ফলপ্রসূতার ওপর ভিত্তি করে গৃহীত',
    exampleSentence: 'City planners must adopt a pragmatic approach to integrating cycling lanes into historic districts.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Strategic'
  },
  {
    id: 233,
    phrase: 'Unprecedented (C1 Vocabulary)',
    cefrLevel: 'C1',
    type: 'C1 Vocabulary',
    banglaMeaning: 'অভূতপূর্ব / যা ইতিপূর্বে কখনো ঘটেনি বা দেখা যায়নি',
    exampleSentence: 'Humanity is currently witnessing an unprecedented acceleration in computational processing power.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Time & Outcome'
  },
  {
    id: 234,
    phrase: 'Catalyst (C1 Vocabulary)',
    cefrLevel: 'C1',
    type: 'C1 Vocabulary',
    banglaMeaning: 'দ্রুত পরিবর্তন বা অগ্রগতির অনুঘটক',
    exampleSentence: 'High-speed rail connectivity acted as a powerful catalyst for regional economic regeneration.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Action & Problem'
  },
  {
    id: 235,
    phrase: 'Empirical (C1 Vocabulary)',
    cefrLevel: 'C1',
    type: 'C1 Vocabulary',
    banglaMeaning: 'তত্ত্বের বদলে বাস্তব পর্যবেক্ষণ ও প্রমাণের ওপর ভিত্তি করে প্রতিষ্ঠিত',
    exampleSentence: 'Public health interventions must be grounded in rigorous empirical evidence.',
    ieltsSuitability: 'Writing Formal',
    category: 'Opinion & Argument'
  },
  {
    id: 236,
    phrase: 'Bolster (C1 Vocabulary)',
    cefrLevel: 'C1',
    type: 'C1 Vocabulary',
    banglaMeaning: 'শক্তিশালী করা / সমর্থন বা ভিত্তি মজবুত করা',
    exampleSentence: 'Apprenticeship subsidies bolster youth employment across manufacturing sectors.',
    ieltsSuitability: 'Writing Formal',
    category: 'Action & Problem'
  },
  {
    id: 237,
    phrase: 'Disparity (C1 Vocabulary)',
    cefrLevel: 'C1',
    type: 'C1 Vocabulary',
    banglaMeaning: 'বৈষম্য বা অসম ব্যবধান',
    exampleSentence: 'Addressing the broadband access disparity between urban and rural schools is essential.',
    ieltsSuitability: 'Writing Formal',
    category: 'Opinion & Argument'
  },
  {
    id: 238,
    phrase: 'Ramification (C2 Vocabulary)',
    cefrLevel: 'C2',
    type: 'C2 Vocabulary',
    banglaMeaning: 'কোনো সিদ্ধান্তের জটিল ও সুদূরপ্রসারী ফলাফল বা পরিণতি',
    exampleSentence: 'Lawmakers must weigh the long-term ethical ramifications of biometric surveillance.',
    ieltsSuitability: 'Writing Formal',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 239,
    phrase: 'Detrimental (C1 Vocabulary)',
    cefrLevel: 'C1',
    type: 'C1 Vocabulary',
    banglaMeaning: 'ক্ষতিকর বা অনিষ্টকর',
    exampleSentence: 'Chronic sleep deprivation is demonstrably detrimental to adolescent cognitive retention.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Action & Problem'
  },
  {
    id: 240,
    phrase: 'Indispensable (C2 Vocabulary)',
    cefrLevel: 'C2',
    type: 'C2 Vocabulary',
    banglaMeaning: 'অপরিহার্য / যা ছাড়া চলা অসম্ভব',
    exampleSentence: 'Critical source evaluation has become an indispensable skill in the digital information era.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 241,
    phrase: 'A watershed moment',
    cefrLevel: 'C2',
    type: 'Idiom',
    banglaMeaning: 'যুগান্তকারী মোড় / ইতিহাসের একটি নির্ধারণী সন্ধিক্ষণ যা সবকিছু বদলে দেয়',
    exampleSentence: 'The 2015 Paris Climate Accord represented a watershed moment in multilateral environmental diplomacy.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 242,
    phrase: 'Walk a tightrope',
    cefrLevel: 'C2',
    type: 'Idiom',
    banglaMeaning: 'দুই বিপরীতমুখী চাপের মধ্যে অত্যন্ত সতর্কতার সাথে সূক্ষ্ম ভারসাম্য রক্ষা করা',
    exampleSentence: 'Central banks must walk a tightrope between curbing inflation and sustaining employment growth.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 243,
    phrase: 'The elephant in the room',
    cefrLevel: 'C1',
    type: 'Idiom',
    banglaMeaning: 'এমন একটি সুস্পষ্ট ও গুরুতর সমস্যা যা সবাই জানে কিন্তু সচেতনভাবে এড়িয়ে চলছে',
    exampleSentence: 'During the housing summit, speculative land hoarding remained the elephant in the room.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Opinion & Argument'
  },
  {
    id: 244,
    phrase: 'Put something on the back burner',
    cefrLevel: 'C1',
    type: 'Idiom',
    banglaMeaning: 'কোনো কাজ বা পরিকল্পনাকে আপাতত স্থগিত রাখা বা কম গুরুত্ব দেওয়া',
    exampleSentence: 'Many municipalities put cultural heritage preservation on the back burner during fiscal recessions.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Action & Problem'
  },
  {
    id: 245,
    phrase: 'Weather the storm',
    cefrLevel: 'C1',
    type: 'Idiom',
    banglaMeaning: 'চরম সংকট বা প্রতিকূল পরিস্থিতি সফলভাবে মোকাবিলা করে টিকে থাকা',
    exampleSentence: 'Diversified small enterprises were far better equipped to weather the storm of supply-chain disruptions.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Action & Problem'
  },
  {
    id: 246,
    phrase: 'Cut corners',
    cefrLevel: 'C1',
    type: 'Idiom',
    banglaMeaning: 'খরচ বা সময় বাঁচাতে গিয়ে কাজের মান, নিরাপত্তা বা নিয়মকানুনের সাথে আপস করা',
    exampleSentence: 'When construction contractors cut corners on structural materials, public safety is severely compromised.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Action & Problem'
  },
  {
    id: 247,
    phrase: 'Nip something in the bud',
    cefrLevel: 'C2',
    type: 'Idiom',
    banglaMeaning: 'কোনো সমস্যা বড় আকার ধারণ করার আগেই একদম অঙ্কুরেই বিনষ্ট বা সমাধান করা',
    exampleSentence: 'Preventative community healthcare nips chronic metabolic illnesses in the bud before hospitalisation is required.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 248,
    phrase: 'Bridging the chasm',
    cefrLevel: 'C2',
    type: 'Collocation',
    banglaMeaning: 'দুই দল বা অবস্থার মধ্যকার বিশাল ব্যবধান বা দূরত্ব ঘুচিয়ে সংযোগ স্থাপন করা',
    exampleSentence: 'Universal digital literacy programmes are essential for bridging the chasm between affluent and marginalised learners.',
    ieltsSuitability: 'Writing Formal',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 249,
    phrase: 'Move the goalposts',
    cefrLevel: 'C1',
    type: 'Idiom',
    banglaMeaning: 'প্রক্রিয়া চলাকালীন অন্যায়ভাবে শর্ত বা লক্ষ্যমাত্রা পরিবর্তন করে কাজ কঠিন করে তোলা',
    exampleSentence: 'Frequent regulatory revisions effectively move the goalposts for renewable energy investors.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Strategic'
  },
  {
    id: 250,
    phrase: 'A knee-jerk reaction',
    cefrLevel: 'C1',
    type: 'Idiom',
    banglaMeaning: 'গভীরভাবে চিন্তা না করে তাৎক্ষণিক ও আবেগপ্রসূত প্রতিক্রিয়া',
    exampleSentence: 'Banning artificial intelligence tools in universities is a knee-jerk reaction rather than a pedagogical solution.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Opinion & Argument'
  },
  {
    id: 251,
    phrase: 'Strike a chord',
    cefrLevel: 'C1',
    type: 'Idiom',
    banglaMeaning: 'মানুষের মনে গভীরভাবে দাগ কাটা বা আবেগের সাথে মিলে যাওয়া',
    exampleSentence: 'The documentary on marine plastic pollution struck a powerful chord with younger voters.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Opinion & Argument'
  },
  {
    id: 252,
    phrase: 'Turn a blind eye to',
    cefrLevel: 'C1',
    type: 'Idiom',
    banglaMeaning: 'জেনেশুনেও না দেখার ভান করা বা কোনো অন্যায় উপেক্ষা করা',
    exampleSentence: 'International regulators can no longer afford to turn a blind eye to industrial river contamination.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Action & Problem'
  },
  {
    id: 253,
    phrase: 'Stem the tide of',
    cefrLevel: 'C2',
    type: 'Idiom',
    banglaMeaning: 'কোনো নেতিবাচক প্রবণতার প্রবল স্রোত বা বিস্তার রোধ করা',
    exampleSentence: 'Targeted rural investment is required to stem the tide of youth migration into congested megacities.',
    ieltsSuitability: 'Writing Formal',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 254,
    phrase: 'Pave the way for',
    cefrLevel: 'C1',
    type: 'Idiom',
    banglaMeaning: 'কোনো নতুন উন্নয়ন বা পরিবর্তনের পথ সুগম ও প্রশস্ত করা',
    exampleSentence: 'Decentralised solar microgrids have paved the way for clean electrification in remote archipelago communities.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'Time & Outcome'
  },
  {
    id: 255,
    phrase: 'In the grand scheme of things',
    cefrLevel: 'C1',
    type: 'Idiom',
    banglaMeaning: 'সামগ্রিক ও বৃহত্তর প্রেক্ষাপটে বিচার করলে',
    exampleSentence: 'In the grand scheme of things, short-term transition costs are negligible compared to planetary ecological stability.',
    ieltsSuitability: 'Speaking (Recommended)',
    category: 'Strategic'
  },
  {
    id: 256,
    phrase: 'Ubiquitous (C2 Vocabulary)',
    cefrLevel: 'C2',
    type: 'C2 Vocabulary',
    banglaMeaning: 'সর্বব্যাপী / যা একই সাথে সব জায়গায় বিদ্যমান দেখা যায়',
    exampleSentence: 'Algorithmic recommendation engines have become ubiquitous across contemporary media platforms.',
    ieltsSuitability: 'Writing Formal',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 257,
    phrase: 'Exacerbate (C1 Vocabulary)',
    cefrLevel: 'C1',
    type: 'C1 Vocabulary',
    banglaMeaning: 'কোনো খারাপ পরিস্থিতি বা সংকটকে আরও তীব্র ও শোচনীয় করে তোলা',
    exampleSentence: 'Unregulated groundwater extraction exacerbates seasonal agricultural drought across delta regions.',
    ieltsSuitability: 'Writing Formal',
    category: 'Action & Problem'
  },
  {
    id: 258,
    phrase: 'Ephemeral (C2 Vocabulary)',
    cefrLevel: 'C2',
    type: 'C2 Vocabulary',
    banglaMeaning: 'ক্ষণস্থায়ী / যা খুব অল্প সময়ের জন্য স্থায়ী হয়',
    exampleSentence: 'Viral consumer trends are notoriously ephemeral, whereas foundational academic literacy endures for a lifetime.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 259,
    phrase: 'Pernicious (C2 Vocabulary)',
    cefrLevel: 'C2',
    type: 'C2 Vocabulary',
    banglaMeaning: 'নীরবে বা সূক্ষ্মভাবে মারাত্মক ক্ষতিকর প্রভাব বিস্তারকারী',
    exampleSentence: 'Misinformation campaigns exert a pernicious influence on public trust in scientific institutions.',
    ieltsSuitability: 'Writing Formal',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 260,
    phrase: 'Alleviate (C1 Vocabulary)',
    cefrLevel: 'C1',
    type: 'C1 Vocabulary',
    banglaMeaning: 'কষ্ট, দারিদ্র্য বা সমস্যার তীব্রতা লাঘব বা উপশম করা',
    exampleSentence: 'Expanding affordable commuter rail networks can significantly alleviate metropolitan traffic gridlock.',
    ieltsSuitability: 'Writing Formal',
    category: 'Action & Problem'
  },
  {
    id: 261,
    phrase: 'Conundrum (C2 Vocabulary)',
    cefrLevel: 'C2',
    type: 'C2 Vocabulary',
    banglaMeaning: 'জটিল ও দুরূহ ধাঁধা বা সমস্যা যার সহজ কোনো সমাধান নেই',
    exampleSentence: 'Balancing data privacy with national cybersecurity poses an enduring regulatory conundrum.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 262,
    phrase: 'Delineate (C2 Vocabulary)',
    cefrLevel: 'C2',
    type: 'C2 Vocabulary',
    banglaMeaning: 'কোনো কিছুর সীমারেখা বা বৈশিষ্ট্য সূক্ষ্ম ও স্পষ্টভাবে বর্ণনা বা চিহ্নিত করা',
    exampleSentence: 'The ethics charter clearly delineates the responsibilities of clinical researchers when handling genomic data.',
    ieltsSuitability: 'Writing Formal',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 263,
    phrase: 'Equitable (C1 Vocabulary)',
    cefrLevel: 'C1',
    type: 'C1 Vocabulary',
    banglaMeaning: 'ন্যায়সঙ্গত ও পক্ষপাতহীন / সবার জন্য সমানভাবে ন্যায্য',
    exampleSentence: 'A progressive taxation framework ensures a more equitable distribution of municipal healthcare resources.',
    ieltsSuitability: 'Writing Formal',
    category: 'Opinion & Argument'
  },
  {
    id: 264,
    phrase: 'Insurmountable (C2 Vocabulary)',
    cefrLevel: 'C2',
    type: 'C2 Vocabulary',
    banglaMeaning: 'অজেয় বা অতিক্রম করা অসম্ভব এমন (বাধা বা সংকট)',
    exampleSentence: 'Without subsidized childcare, returning to full-time postgraduate study presents an insurmountable barrier for many parents.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 265,
    phrase: 'Juxtapose (C2 Vocabulary)',
    cefrLevel: 'C2',
    type: 'C2 Vocabulary',
    banglaMeaning: 'তুলনা বা বৈপরীত্য ফুটিয়ে তোলার জন্য দুটি বিষয়কে পাশাপাশি স্থাপন করা',
    exampleSentence: 'The exhibition juxtaposes nineteenth-century industrial sketches with contemporary satellite imagery of urban sprawl.',
    ieltsSuitability: 'Writing Formal',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 266,
    phrase: 'Lucrative (C1 Vocabulary)',
    cefrLevel: 'C1',
    type: 'C1 Vocabulary',
    banglaMeaning: 'অত্যন্ত লাভজনক বা প্রচুর অর্থ উপার্জনকারী',
    exampleSentence: 'Eco-tourism has emerged as a lucrative yet sustainable alternative to commercial logging.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'General C1'
  },
  {
    id: 267,
    phrase: 'Ostensibly (C2 Vocabulary)',
    cefrLevel: 'C2',
    type: 'C2 Vocabulary',
    banglaMeaning: 'দৃশ্যত বা বাহ্যিকভাবে যা মনে হয় (যদিও প্রকৃত উদ্দেশ্য ভিন্ন হতে পারে)',
    exampleSentence: 'The corporate wellness app was ostensibly designed to reduce burnout, yet employees felt it monitored their productivity.',
    ieltsSuitability: 'Writing Formal',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 268,
    phrase: 'Proliferation (C1 Vocabulary)',
    cefrLevel: 'C1',
    type: 'C1 Vocabulary',
    banglaMeaning: 'দ্রুত সংখ্যাবৃদ্ধি বা ব্যাপক প্রসার',
    exampleSentence: 'The rapid proliferation of single-use packaging has overwhelmed municipal recycling facilities.',
    ieltsSuitability: 'Writing Formal',
    category: 'Time & Outcome'
  },
  {
    id: 269,
    phrase: 'Quintessential (C2 Vocabulary)',
    cefrLevel: 'C2',
    type: 'C2 Vocabulary',
    banglaMeaning: 'কোনো কিছুর সবচেয়ে নিখুঁত, আদর্শ বা ধ্রুপদী উদাহরণ',
    exampleSentence: 'Cambridge remains the quintessential collegiate town, blending medieval architecture with frontier scientific laboratories.',
    ieltsSuitability: 'Speaking & Writing',
    category: 'C2 Band-9 Mastery'
  },
  {
    id: 270,
    phrase: 'Unilateral (C2 Vocabulary)',
    cefrLevel: 'C2',
    type: 'C2 Vocabulary',
    banglaMeaning: 'একতরফা / অন্য পক্ষের সম্মতি ছাড়াই কেবল এক পক্ষ কর্তৃক গৃহীত',
    exampleSentence: 'Unilateral trade tariffs rarely resolve structural imbalances in global manufacturing.',
    ieltsSuitability: 'Writing Formal',
    category: 'C2 Band-9 Mastery'
  }
];

