/**
 * BandSprint IELTS Spelling & Dictation Database
 * Combines 30 hand-crafted high-risk examiner spelling traps with all
 * single-word academic & everyday entries from BandSprint's vocabulary banks.
 */

import { VOCABULARY_DATA } from './vocabularyData';
import { EXTENDED_VOCAB_DATABASE } from './richVocabulary';
import { B2_IDIOMS_AND_WORDS } from './b2IdiomsWords';
import { C1_IDIOMS_AND_PHRASES } from './c1IdiomsAndPhrasesData';

export type SpellingCategory =
  | 'Double Letters'
  | 'Silent Letters'
  | 'Tricky Vowels'
  | 'Academic Writing'
  | 'Listening Traps';

export interface SpellingTrapItem {
  id: string;
  word: string;
  category: SpellingCategory;
  commonError: string;
  phonetic: string;
  meaning_bn: string;
  memoryTrick: string;
  memoryTrick_bn: string;
  dictationSentence: string;
  hint: string;
  cefr?: string;
  topic?: string;
  isCoreTrap?: boolean;
}

const CORE_SPELLING_TRAPS: SpellingTrapItem[] = [
  {
    id: 'sp_1',
    word: 'accommodation',
    category: 'Double Letters',
    commonError: 'accomodation / acommodation',
    phonetic: '/əˌkɒm.əˈdeɪ.ʃən/',
    meaning_bn: 'বাসস্থান বা থাকার জায়গা',
    memoryTrick: "Two Cats and Two Mice (2 C's and 2 M's)",
    memoryTrick_bn: 'মনে রাখুন: একটি ভালো বাসস্থানে ২টি C এবং ২টি M থাকার মতো জায়গা থাকে (ac-com-mo-da-tion)!',
    dictationSentence: 'The university offers guaranteed student accommodation for all first-year international scholars.',
    hint: 'Double C, Double M',
    cefr: 'B2',
    topic: 'Everyday English',
    isCoreTrap: true
  },
  {
    id: 'sp_2',
    word: 'environment',
    category: 'Silent Letters',
    commonError: 'enviroment',
    phonetic: '/ɪnˈvaɪ.rən.mənt/',
    meaning_bn: 'পরিবেশ',
    memoryTrick: 'Keep the "IRON" in the environment (envi-RON-ment)',
    memoryTrick_bn: 'মনে রাখুন: পরিবেশের ভেতরে "IRON" আছে! তাই মাঝের "n" কোনোমতেই বাদ দেওয়া যাবে না।',
    dictationSentence: 'Industrial pollutants pose an acute threat to the marine environment.',
    hint: 'Never forget the silent "n" before "ment"',
    cefr: 'B1',
    topic: 'Environment & Climate',
    isCoreTrap: true
  },
  {
    id: 'sp_3',
    word: 'definitely',
    category: 'Tricky Vowels',
    commonError: 'definately / defanitely',
    phonetic: '/ˈdef.ɪ.nət.li/',
    meaning_bn: 'নিশ্চিতভাবেই',
    memoryTrick: 'There is "FINITE" in definitely',
    memoryTrick_bn: 'ভিতরে "finite" (নির্দিষ্ট) শব্দটি লুকানো আছে, কোনো "a" নেই!',
    dictationSentence: "The research data will definitely substantiate the committee's initial hypothesis.",
    hint: 'd-e-f-I-n-I-t-e-l-y (No "a")',
    cefr: 'B2',
    topic: 'Academic English',
    isCoreTrap: true
  },
  {
    id: 'sp_4',
    word: 'government',
    category: 'Silent Letters',
    commonError: 'goverment',
    phonetic: '/ˈɡʌv.ən.mənt/',
    meaning_bn: 'সরকার',
    memoryTrick: 'Govern + ment (The government GOVERNS the country)',
    memoryTrick_bn: 'সরকারের কাজ হলো "GOVERN" করা, তাই "r"-এর পর "n" সবসময় থাকবে।',
    dictationSentence: 'The central government implemented a nationwide carbon taxation policy.',
    hint: 'Do not omit the "n" after "r"',
    cefr: 'B1',
    topic: 'Government & Policy',
    isCoreTrap: true
  },
  {
    id: 'sp_5',
    word: 'noticeable',
    category: 'Academic Writing',
    commonError: 'noticable',
    phonetic: '/ˈnəʊ.tɪ.sə.bəl/',
    meaning_bn: 'সহজেই লক্ষণীয়',
    memoryTrick: 'Keep the "E" so C stays soft (notice + able)',
    memoryTrick_bn: '"Notice"-এর "e" কাটবেন না, কারণ "e" ছাড়া "c"-এর উচ্চারণ শক্ত হয়ে যাবে!',
    dictationSentence: 'There was a noticeable upward trajectory in renewable energy adoption after 2015.',
    hint: 'Keep the whole word "notice" intact before "-able"',
    cefr: 'B2',
    topic: 'Academic English',
    isCoreTrap: true
  },
  {
    id: 'sp_6',
    word: 'necessary',
    category: 'Double Letters',
    commonError: 'neccessary / necesary',
    phonetic: '/ˈnes.ə.ser.i/',
    meaning_bn: 'প্রয়োজনীয় বা অত্যাবশ্যক',
    memoryTrick: "One Collar, Two Sleeves (1 C, 2 S's)",
    memoryTrick_bn: 'একটি শার্টে একটি কলার (1 C) আর দুটি হাতা (2 S) থাকে—শার্ট পরা যেমন necessary!',
    dictationSentence: 'It is strictly necessary to allocate substantial fiscal grants to scientific research.',
    hint: "One C, two S's",
    cefr: 'B1',
    topic: 'Academic English',
    isCoreTrap: true
  },
  {
    id: 'sp_7',
    word: 'questionnaire',
    category: 'Double Letters',
    commonError: 'questionaire / questionare',
    phonetic: '/ˌkwes.tʃəˈneər/',
    meaning_bn: 'প্রশ্নমালা বা জরিপ ফরম',
    memoryTrick: 'Question + N + aire (Double N like millionaire)',
    memoryTrick_bn: 'Question শব্দের সাথে "n-a-i-r-e" যুক্ত হবে, তাই ডাবল N হবে!',
    dictationSentence: 'Participants completed a comprehensive demographic questionnaire prior to the trial.',
    hint: 'Double N before "aire"',
    cefr: 'B2',
    topic: 'Science & Research',
    isCoreTrap: true
  },
  {
    id: 'sp_8',
    word: 'occurrence',
    category: 'Double Letters',
    commonError: 'occurence / ocurrence',
    phonetic: '/əˈkʌr.əns/',
    meaning_bn: 'ঘটনা বা সংঘটন',
    memoryTrick: 'Double C, Double R (Occur + rence)',
    memoryTrick_bn: '২টি C এবং ২টি R—দুটোই জোড়ায় জোড়ায় আসবে!',
    dictationSentence: 'The frequent occurrence of catastrophic flash floods disrupted regional agriculture.',
    hint: 'Double C and Double R',
    cefr: 'C1',
    topic: 'Academic English',
    isCoreTrap: true
  },
  {
    id: 'sp_9',
    word: 'hierarchy',
    category: 'Tricky Vowels',
    commonError: 'heirarchy / hierachy',
    phonetic: '/ˈhaɪə.rɑː.ki/',
    meaning_bn: 'স্তরবিন্যাস বা পদমর্যাদা ক্রম',
    memoryTrick: 'High Erarchy (H-I-E-R-A-R-C-H-Y)',
    memoryTrick_bn: 'I আগে আসবে, E পরে আসবে ("i" before "e") এবং মাঝের "r" ভুলবেন না।',
    dictationSentence: 'The organizational hierarchy within modern tech startups tends to be flat.',
    hint: 'H-i-e-r-a-r-c-h-y',
    cefr: 'C1',
    topic: 'Work & Career',
    isCoreTrap: true
  },
  {
    id: 'sp_10',
    word: 'gauge',
    category: 'Listening Traps',
    commonError: 'guage',
    phonetic: '/ɡeɪdʒ/',
    meaning_bn: 'পরিমাপক যন্ত্র বা পরিমাপ করা',
    memoryTrick: 'G-A-U-G-E (A before U)',
    memoryTrick_bn: 'বানানে "A" আগে বসবে, "U" পরে (G-A-U-G-E)।',
    dictationSentence: 'Sociologists utilize qualitative metrics to gauge consumer sentiment.',
    hint: '"a" before "u"',
    cefr: 'C1',
    topic: 'Science & Research',
    isCoreTrap: true
  },
  {
    id: 'sp_11',
    word: 'privilege',
    category: 'Academic Writing',
    commonError: 'priviledge / privelege',
    phonetic: '/ˈprɪv.əl.ɪdʒ/',
    meaning_bn: 'বিশেষ সুবিধা বা অধিকার',
    memoryTrick: 'No "D" in privilege (Leg, not Ledge)',
    memoryTrick_bn: 'বানানে কোনো "d" নেই! শেষে "l-e-g-e"।',
    dictationSentence: 'Access to clean potable water should be a universal right rather than an elitist privilege.',
    hint: 'No letter "d"',
    cefr: 'B2',
    topic: 'Society & Social Issues',
    isCoreTrap: true
  },
  {
    id: 'sp_12',
    word: 'maintenance',
    category: 'Academic Writing',
    commonError: 'maintainance',
    phonetic: '/ˈmeɪn.tən.əns/',
    meaning_bn: 'রক্ষণাবেক্ষণ',
    memoryTrick: 'Main-TEN-ance (not Maintain-ance)',
    memoryTrick_bn: 'যদিও মূল শব্দ maintain, কিন্তু বিশেষ্য করার সময় মাঝের বানানটি "ten" হয়ে যায় (main-TEN-ance)!',
    dictationSentence: 'Substantial municipal budget was dedicated to road maintenance.',
    hint: 'Spelled with "ten", not "tain"',
    cefr: 'B2',
    topic: 'Cities & Urban Planning',
    isCoreTrap: true
  },
  {
    id: 'sp_13',
    word: 'embarrass',
    category: 'Double Letters',
    commonError: 'embarass / emabarass',
    phonetic: '/ɪmˈbær.əs/',
    meaning_bn: 'অপ্রস্তুত বা লজ্জিত করা',
    memoryTrick: 'Double R, Double S (Really Red Strawberry)',
    memoryTrick_bn: 'লজ্জিত হলে গাল লাল হয়ে যায়: ২টি R আর ২টি S মনে রাখুন!',
    dictationSentence: 'Candidates are often embarrassed when speaking before an audience.',
    hint: 'Double R and Double S',
    cefr: 'B2',
    topic: 'Everyday English',
    isCoreTrap: true
  },
  {
    id: 'sp_14',
    word: 'vacuum',
    category: 'Double Letters',
    commonError: 'vaccuum / vacume',
    phonetic: '/ˈvæk.juːm/',
    meaning_bn: 'শূন্যস্থান বা ভ্যাকুয়াম',
    memoryTrick: "Only one C, but TWO U's (V-A-C-U-U-M)",
    memoryTrick_bn: 'ইংরেজি ভাষার বিরল শব্দ যেখানে একটি C কিন্তু ডাবল U (u-u) থাকে!',
    dictationSentence: 'The collapse of authoritarian regimes left a political vacuum in the region.',
    hint: "One C, two U's",
    cefr: 'B2',
    topic: 'Science & Research',
    isCoreTrap: true
  },
  {
    id: 'sp_15',
    word: 'leisure',
    category: 'Listening Traps',
    commonError: 'liesure / lesure',
    phonetic: '/ˈleʒ.ər/',
    meaning_bn: 'অবসর সময়',
    memoryTrick: 'L-E-I-S-U-R-E (Exception to I before E rule)',
    memoryTrick_bn: '"E" আগে, "I" পরে (L-E-I-S-U-R-E)। লিসেনিং সেকশন ১-এ এটি বারবার আসে!',
    dictationSentence: 'Modern urban citizens allocate fewer hours to recreational leisure activities.',
    hint: 'E before I',
    cefr: 'B1',
    topic: 'Lifestyle & Well-being',
    isCoreTrap: true
  },
  {
    id: 'sp_16',
    word: 'queue',
    category: 'Listening Traps',
    commonError: 'que / qeue',
    phonetic: '/kjuː/',
    meaning_bn: 'লাইন বা সারি',
    memoryTrick: 'Letter Q followed by four silent waiting vowels (ue-ue)',
    memoryTrick_bn: 'Q-এর পেছনে ৪টি অক্ষর লাইনে দাঁড়িয়ে আছে: U-E-U-E!',
    dictationSentence: 'Passengers were instructed to join the designated boarding queue.',
    hint: 'Q followed by "ueue"',
    cefr: 'B1',
    topic: 'Travel & Tourism',
    isCoreTrap: true
  },
  {
    id: 'sp_17',
    word: 'february',
    category: 'Listening Traps',
    commonError: 'febuary / febuarry',
    phonetic: '/ˈfeb.ru.ər.i/',
    meaning_bn: 'ফেব্রুয়ারি মাস',
    memoryTrick: 'Keep BOTH R letters: Feb-RU-a-RY',
    memoryTrick_bn: 'উচ্চারণে প্রথম "r" শোনা না গেলেও বানানে দুটি "r" থাকবে: Feb-ru-a-ry।',
    dictationSentence: 'The scholarship application deadline falls on the fourteenth of February.',
    hint: 'Two "r" letters: Feb-ru-ary',
    cefr: 'A2',
    topic: 'Everyday English',
    isCoreTrap: true
  },
  {
    id: 'sp_18',
    word: 'wednesday',
    category: 'Silent Letters',
    commonError: 'wensday / wednsday',
    phonetic: '/ˈwenz.deɪ/',
    meaning_bn: 'বুধবার',
    memoryTrick: 'Wed-NES-day (Do not drop the silent D)',
    memoryTrick_bn: 'তিন ভাগে মনে রাখুন: Wed + nes + day—মাঝের নিঃশব্দ "d" ভুলবেন না।',
    dictationSentence: 'The seminar room has been reserved for Wednesday afternoon.',
    hint: 'Silent "d" after "We"',
    cefr: 'A2',
    topic: 'Everyday English',
    isCoreTrap: true
  },
  {
    id: 'sp_19',
    word: 'restaurant',
    category: 'Listening Traps',
    commonError: 'resturant / restaraunt',
    phonetic: '/ˈres.trɒnt/',
    meaning_bn: 'রেস্তোরাঁ',
    memoryTrick: 'Rest + AU + rant (A-U in the middle, -ant at the end)',
    memoryTrick_bn: 'Rest + au + rant—মাঝখানে "au" এবং শেষে "rant"।',
    dictationSentence: 'The coastal restaurant is famous for its locally sourced seafood menu.',
    hint: 'Rest-au-rant',
    cefr: 'A2',
    topic: 'Food & Nutrition',
    isCoreTrap: true
  },
  {
    id: 'sp_20',
    word: 'separate',
    category: 'Tricky Vowels',
    commonError: 'seperate',
    phonetic: '/ˈsep.ər.ət/',
    meaning_bn: 'আলাদা বা পৃথক',
    memoryTrick: 'There is "A RAT" in sep-A-RAT-e',
    memoryTrick_bn: 'মাঝখানে "a" থাকবে ("e" নয়): sep-A-rate।',
    dictationSentence: 'Household recycling requires citizens to separate plastics from organic waste.',
    hint: 'Sep-A-rate (not sep-E-rate)',
    cefr: 'B1',
    topic: 'Academic English',
    isCoreTrap: true
  },
  {
    id: 'sp_21',
    word: 'recommend',
    category: 'Double Letters',
    commonError: 'reccommend / recomend',
    phonetic: '/ˌrek.əˈmend/',
    meaning_bn: 'সুপারিশ করা',
    memoryTrick: 'Re + commend (1 C, 2 M\'s)',
    memoryTrick_bn: 'Re + commend: একটি C এবং দুটি M।',
    dictationSentence: 'Public health specialists recommend at least thirty minutes of brisk walking daily.',
    hint: 'One C, double M',
    cefr: 'B1',
    topic: 'Academic English',
    isCoreTrap: true
  },
  {
    id: 'sp_22',
    word: 'committee',
    category: 'Double Letters',
    commonError: 'comittee / commitee',
    phonetic: '/kəˈmɪt.i/',
    meaning_bn: 'কমিটি বা পরিষদ',
    memoryTrick: 'Three double pairs: MM + TT + EE',
    memoryTrick_bn: 'তিন জোড়া ডাবল অক্ষর: com-mit-tee (mm, tt, ee)!',
    dictationSentence: 'An independent ethics committee reviewed the clinical trial protocol.',
    hint: 'Double M, Double T, Double E',
    cefr: 'B2',
    topic: 'Government & Policy',
    isCoreTrap: true
  },
  {
    id: 'sp_23',
    word: 'bureaucracy',
    category: 'Tricky Vowels',
    commonError: 'burocracy / beauracracy',
    phonetic: '/bjʊəˈrɒk.rə.si/',
    meaning_bn: 'আমলাতন্ত্র',
    memoryTrick: 'Bureau + cracy (E-A-U vowel trio)',
    memoryTrick_bn: 'শুরুতে "bureau" (b-u-r-e-a-u) তারপর "cracy"।',
    dictationSentence: 'Excessive bureaucracy often delays infrastructure approvals for years.',
    hint: 'Starts with "bureau" (e-a-u)',
    cefr: 'C1',
    topic: 'Government & Policy',
    isCoreTrap: true
  },
  {
    id: 'sp_24',
    word: 'parliament',
    category: 'Silent Letters',
    commonError: 'parlament / parliment',
    phonetic: '/ˈpɑː.lə.mənt/',
    meaning_bn: 'সংসদ',
    memoryTrick: 'Par-LIA-ment (Silent "i" before "a")',
    memoryTrick_bn: 'মাঝখানে "lia" থাকবে (par-LIA-ment)—নিঃশব্দ "i" ভুলবেন না।',
    dictationSentence: 'Members of parliament debated the proposed green energy subsidy bill.',
    hint: 'Silent "i" in par-lia-ment',
    cefr: 'B2',
    topic: 'Government & Policy',
    isCoreTrap: true
  },
  {
    id: 'sp_25',
    word: 'entrepreneur',
    category: 'Tricky Vowels',
    commonError: 'entrepeneur / enterpreneur',
    phonetic: '/ˌɒn.trə.prəˈnɜːr/',
    meaning_bn: 'উদ্যোক্তা',
    memoryTrick: 'En-tre-pre-neur (re-pre-neur, ends in -eur)',
    memoryTrick_bn: 'En-tre-pre-neur: দুবার "re" এবং শেষে ফরাসি "-eur"।',
    dictationSentence: 'A young social entrepreneur launched solar microgrids across rural districts.',
    hint: 'En-tre-pre-neur (ends in -eur)',
    cefr: 'C1',
    topic: 'Economy & Finance',
    isCoreTrap: true
  },
  {
    id: 'sp_26',
    word: 'conscientious',
    category: 'Academic Writing',
    commonError: 'consciencious / consentious',
    phonetic: '/ˌkɒn.ʃiˈen.ʃəs/',
    meaning_bn: 'বিবেকবান বা দায়িত্বশীল',
    memoryTrick: 'Con + SCIENCE + tious (swap -ce for -tious)',
    memoryTrick_bn: 'ভিতরে "scien" (science-এর মতো) আছে, তারপর "tious"।',
    dictationSentence: 'Conscientious students verify every citation before submitting their dissertation.',
    hint: 'Con-scien-tious',
    cefr: 'C1',
    topic: 'Work & Career',
    isCoreTrap: true
  },
  {
    id: 'sp_27',
    word: 'millennium',
    category: 'Double Letters',
    commonError: 'millenium / milennium',
    phonetic: '/mɪˈlen.i.əm/',
    meaning_bn: 'সহস্রাব্দ (১০০০ বছর)',
    memoryTrick: 'Double L, Double N (mille = thousand, annum = year)',
    memoryTrick_bn: 'দুটি L এবং দুটি N: mil-len-ni-um।',
    dictationSentence: 'Urban populations have expanded rapidly since the turn of the millennium.',
    hint: 'Double L and Double N',
    cefr: 'B2',
    topic: 'Culture & Heritage',
    isCoreTrap: true
  },
  {
    id: 'sp_28',
    word: 'psychology',
    category: 'Silent Letters',
    commonError: 'sychology / psycology',
    phonetic: '/saɪˈkɒl.ə.dʒi/',
    meaning_bn: 'মনোবিজ্ঞান',
    memoryTrick: 'Silent P + CH (Psy-cho-logy)',
    memoryTrick_bn: 'শুরুতে নিঃশব্দ "p" এবং মাঝে "ch" (psy-cho-logy)।',
    dictationSentence: 'Cognitive psychology explores how sleep deprivation impairs memory retention.',
    hint: 'Silent initial "p" and "ch"',
    cefr: 'B2',
    topic: 'Science & Research',
    isCoreTrap: true
  },
  {
    id: 'sp_29',
    word: 'library',
    category: 'Listening Traps',
    commonError: 'libary / librery',
    phonetic: '/ˈlaɪ.brər.i/',
    meaning_bn: 'গ্রন্থাগার বা লাইব্রেরি',
    memoryTrick: 'Keep BOTH R letters: Lib-RA-ry',
    memoryTrick_bn: 'দুটি "r" মনে রাখুন: lib-ra-ry (মাঝের প্রথম "r" বাদ দেবেন না)।',
    dictationSentence: 'All postgraduate journals are archived on the third floor of the central library.',
    hint: 'Lib-ra-ry (two "r"s)',
    cefr: 'A2',
    topic: 'Education & Learning',
    isCoreTrap: true
  },
  {
    id: 'sp_30',
    word: 'colleague',
    category: 'Tricky Vowels',
    commonError: 'collegue / coleague',
    phonetic: '/ˈkɒl.iːɡ/',
    meaning_bn: 'সহকর্মী',
    memoryTrick: 'Col + LEAGUE (double L + -eague)',
    memoryTrick_bn: 'Double L তারপর "league" (col-league)—শেষে "ue" ভুলবেন না।',
    dictationSentence: 'She collaborated with a senior colleague from the engineering faculty.',
    hint: 'Double L + "league"',
    cefr: 'B1',
    topic: 'Work & Career',
    isCoreTrap: true
  }
];

export const CORE_SPELLING_TRAPS_COUNT = CORE_SPELLING_TRAPS.length;

function classifySpellingCategory(word: string, topic = '', usage = ''): SpellingCategory {
  const lower = word.toLowerCase();
  if (/([a-z])\1/.test(lower)) {
    return 'Double Letters';
  }
  if (/^(kn|wr|ps|pn|gn|rh)|mb$|mn$|bt$|ght|sc[eiy]|gu[ei]|rnment/.test(lower)) {
    return 'Silent Letters';
  }
  if (/(ei|ie|eau|iou|eous|ious|ae|oe|ua|ui|eu|ao)/.test(lower)) {
    return 'Tricky Vowels';
  }
  const combinedContext = `${topic} ${usage}`.toLowerCase();
  if (
    combinedContext.includes('listening') ||
    combinedContext.includes('everyday') ||
    combinedContext.includes('travel') ||
    combinedContext.includes('food') ||
    combinedContext.includes('lifestyle') ||
    combinedContext.includes('cities')
  ) {
    return 'Listening Traps';
  }
  return 'Academic Writing';
}

function buildCommonError(word: string): string {
  const w = word.toLowerCase();
  const doubleMatch = w.match(/([a-z])\1/);
  if (doubleMatch && doubleMatch.index !== undefined) {
    return w.slice(0, doubleMatch.index) + w.slice(doubleMatch.index + 1);
  }
  if (w.includes('ie')) return w.replace('ie', 'ei');
  if (w.includes('ei')) return w.replace('ei', 'ie');
  if (w.endsWith('ance')) return `${w.slice(0, -4)}ence`;
  if (w.endsWith('ence')) return `${w.slice(0, -4)}ance`;
  if (w.endsWith('able')) return `${w.slice(0, -4)}ible`;
  if (w.endsWith('ible')) return `${w.slice(0, -4)}able`;
  if (w.endsWith('tion')) return `${w.slice(0, -4)}sion`;
  if (w.endsWith('sion')) return `${w.slice(0, -4)}tion`;
  if (w.endsWith('ment')) return `${w.slice(0, -4)}mant`;
  if (w.includes('ph')) return w.replace('ph', 'f');
  if (w.includes('sc')) return w.replace('sc', 's');
  if (w.includes('qu')) return w.replace('qu', 'kw');
  if (w.includes('ea')) return w.replace('ea', 'ee');
  if (w.includes('ou')) return w.replace('ou', 'o');
  if (w.includes('au')) return w.replace('au', 'o');
  if (w.length >= 6) {
    // Swap an internal vowel to simulate common vowel confusion
    const idx = w.slice(1, -1).search(/[aeiou]/);
    if (idx !== -1) {
      const pos = idx + 1;
      const swapMap: Record<string, string> = { a: 'e', e: 'a', i: 'e', o: 'u', u: 'o' };
      const ch = w[pos];
      return w.slice(0, pos) + (swapMap[ch] || 'e') + w.slice(pos + 1);
    }
  }
  return `${w.slice(0, -1)}${w[w.length - 1]}${w[w.length - 1]}`;
}

function splitChunks(word: string): string {
  if (word.length <= 5) return word.toUpperCase();
  const chunks: string[] = [];
  let i = 0;
  while (i < word.length) {
    const remaining = word.length - i;
    const size = remaining <= 4 ? remaining : 3;
    chunks.push(word.slice(i, i + size));
    i += size;
  }
  return chunks.join('-');
}

function buildHintAndTricks(
  word: string,
  category: SpellingCategory,
  meaningBn: string,
  pronunciationBn?: string,
  warning?: string
): { hint: string; memoryTrick: string; memoryTrick_bn: string } {
  const lower = word.toLowerCase();
  const chunked = splitChunks(lower);
  const doubleMatch = lower.match(/([a-z])\1/);
  const pronNote = pronunciationBn ? ` (উচ্চারণ: ${pronunciationBn})` : '';

  if (doubleMatch) {
    const dbl = doubleMatch[0].toUpperCase();
    return {
      hint: `Contains double "${dbl}" (${lower.length} letters)`,
      memoryTrick: warning
        ? `${chunked} — watch the double "${dbl}". ${warning}`
        : `Break into chunks: ${chunked} — remember the double "${dbl}".`,
      memoryTrick_bn: `বানানটি ভেঙে পড়ুন: ${chunked} — এখানে ডাবল "${dbl}" আছে${pronNote}। অর্থ: ${meaningBn}`
    };
  }

  if (category === 'Silent Letters') {
    return {
      hint: `Watch for silent consonant pattern (${lower.length} letters)`,
      memoryTrick: warning
        ? `${chunked} — check silent consonants. ${warning}`
        : `Break into chunks: ${chunked} — keep every silent letter intact.`,
      memoryTrick_bn: `বানানটি ভেঙে মনে রাখুন: ${chunked} — উচ্চারণে চাপা থাকলেও সব অক্ষর লিখুন${pronNote}। অর্থ: ${meaningBn}`
    };
  }

  if (category === 'Tricky Vowels') {
    const vowelPair = lower.match(/(ei|ie|eau|iou|eous|ious|ae|oe|ua|ui|eu|ao)/)?.[0]?.toUpperCase();
    return {
      hint: vowelPair
        ? `Watch the vowel sequence "${vowelPair}" (${lower.length} letters)`
        : `Watch vowel order (${lower.length} letters)`,
      memoryTrick: warning
        ? `${chunked} — focus on "${vowelPair || 'vowels'}". ${warning}`
        : `Break into chunks: ${chunked}${vowelPair ? ` — keep "${vowelPair}" in order` : ''}.`,
      memoryTrick_bn: `বানানটি ভেঙে পড়ুন: ${chunked}${vowelPair ? ` — "${vowelPair}" ক্রমটি খেয়াল রাখুন` : ''}${pronNote}। অর্থ: ${meaningBn}`
    };
  }

  const suffixMatch = lower.match(/(tion|sion|ment|ance|ence|able|ible|ious|eous|ology|graphy)$/);
  if (suffixMatch) {
    const suf = `-${suffixMatch[0]}`;
    return {
      hint: `Ends with "${suf}" (${lower.length} letters)`,
      memoryTrick: warning
        ? `${chunked} (ends in ${suf}). ${warning}`
        : `Chunk it as ${chunked} — remember the academic ending "${suf}".`,
      memoryTrick_bn: `বানানটি ভেঙে পড়ুন: ${chunked} — শেষে "${suf}" প্রত্যয় আছে${pronNote}। অর্থ: ${meaningBn}`
    };
  }

  return {
    hint: `Starts with "${lower[0].toUpperCase()}", ${lower.length} letters`,
    memoryTrick: warning
      ? `${chunked}. ${warning}`
      : `Chunk it as ${chunked} (${lower.length} letters).`,
    memoryTrick_bn: `বানানটি ভেঙে মনে রাখুন: ${chunked}${pronNote}। অর্থ: ${meaningBn}`
  };
}

function extractCleanSingleWord(raw: string): string | null {
  const cleaned = raw
    .replace(/\s*\([^)]*\)\s*/g, '')
    .trim()
    .toLowerCase();
  if (!/^[a-z]{4,24}$/.test(cleaned)) return null;
  return cleaned;
}

function buildFullSpellingBank(): SpellingTrapItem[] {
  const result: SpellingTrapItem[] = [...CORE_SPELLING_TRAPS];
  const seen = new Set<string>(CORE_SPELLING_TRAPS.map((item) => item.word.toLowerCase()));
  let counter = CORE_SPELLING_TRAPS.length + 1;

  const tryAdd = (params: {
    rawWord: string;
    meaningBn?: string;
    pronunciationBn?: string;
    example?: string;
    cefr?: string;
    topic?: string;
    warning?: string;
    usage?: string;
  }) => {
    const word = extractCleanSingleWord(params.rawWord);
    if (!word || seen.has(word)) return;
    seen.add(word);

    const meaningBn = (params.meaningBn || '').trim() || 'একাডেমিক ইংরেজি শব্দ';
    const category = classifySpellingCategory(word, params.topic, params.usage);
    const commonError = buildCommonError(word);
    const { hint, memoryTrick, memoryTrick_bn } = buildHintAndTricks(
      word,
      category,
      meaningBn,
      params.pronunciationBn,
      params.warning
    );
    const sentence =
      (params.example || '').trim() ||
      `Academic candidates should accurately spell and apply the word ${word} in formal responses.`;

    result.push({
      id: `sp_${counter++}`,
      word,
      category,
      commonError,
      phonetic: params.pronunciationBn ? `উচ্চারণ: ${params.pronunciationBn}` : `/${word}/`,
      meaning_bn: meaningBn,
      memoryTrick,
      memoryTrick_bn,
      dictationSentence: sentence,
      hint,
      cefr: params.cefr,
      topic: params.topic,
      isCoreTrap: false
    });
  };

  // 1. Primary curated + master 1,000+ vocabulary database
  for (const entry of VOCABULARY_DATA) {
    if (entry.category === 'word') {
      tryAdd({
        rawWord: entry.word,
        meaningBn: entry.meaning_bn,
        pronunciationBn: entry.pronunciation_bn,
        example: entry.example,
        cefr: entry.level,
        topic: entry.topic,
        warning: entry.warning,
        usage: entry.ielts_usage
      });
    }
  }

  // 2. Extended rich vocabulary database
  for (const card of EXTENDED_VOCAB_DATABASE) {
    if (card.category === 'word') {
      tryAdd({
        rawWord: card.item,
        meaningBn: card.banglaMeaning,
        pronunciationBn: card.banglaPronunciation,
        example: card.exampleSentence,
        cefr: card.cefr,
        topic: card.topic,
        warning: card.commonMistakes,
        usage: card.ieltsUsage
      });
    }
  }

  // 3. Classic IELTS Listening & Writing high-frequency single-word traps (British spelling)
  const EXTRA_EXAM_TRAPS: Array<{
    word: string;
    bn: string;
    topic: string;
    cefr: string;
    example: string;
  }> = [
    { word: 'architecture', bn: 'স্থাপত্যকলা', topic: 'Cities & Urban Planning', cefr: 'B2', example: 'The coastal museum blends traditional stone masonry with modern glass architecture.' },
    { word: 'archaeology', bn: 'প্রত্নতত্ত্ব', topic: 'Culture & Heritage', cefr: 'C1', example: 'Recent excavations in the river valley reshaped regional archaeology.' },
    { word: 'exhibition', bn: 'প্রদর্শনী', topic: 'Media, Arts & Entertainment', cefr: 'B1', example: 'Tickets for the photography exhibition must be booked twenty-four hours in advance.' },
    { word: 'itinerary', bn: 'ভ্রমণসূচি', topic: 'Travel & Tourism', cefr: 'B2', example: 'The tour operator emailed a revised itinerary covering all four national parks.' },
    { word: 'laboratory', bn: 'গবেষণাগার', topic: 'Science & Research', cefr: 'B1', example: 'All soil samples were analysed inside the university environmental laboratory.' },
    { word: 'curriculum', bn: 'পাঠ্যক্রম', topic: 'Education & Learning', cefr: 'B2', example: 'Secondary schools are updating the national curriculum to include financial literacy.' },
    { word: 'schedule', bn: 'সময়সূচি', topic: 'Everyday English', cefr: 'B1', example: 'Construction remained on schedule despite three weeks of heavy monsoon rain.' },
    { word: 'receipt', bn: 'রশিদ', topic: 'Everyday English', cefr: 'B1', example: 'Please retain your printed receipt in case you request a refund.' },
    { word: 'guarantee', bn: 'নিশ্চয়তা বা গ্যারান্টি', topic: 'Economy & Finance', cefr: 'B2', example: 'Every certified appliance carries a two-year manufacturer guarantee.' },
    { word: 'brochure', bn: 'তথ্যপুস্তিকা বা ব্রোশিওর', topic: 'Travel & Tourism', cefr: 'B1', example: 'A detailed campus map is printed on the back cover of the welcome brochure.' },
    { word: 'refrigerator', bn: 'রেফ্রিজারেটর বা ফ্রিজ', topic: 'Everyday English', cefr: 'B1', example: 'Energy-efficient models reduce electricity consumed by a household refrigerator.' },
    { word: 'caffeine', bn: 'ক্যাফেইন', topic: 'Food & Nutrition', cefr: 'B2', example: 'Consuming caffeine late in the afternoon can delay deep sleep cycles.' },
    { word: 'cholesterol', bn: 'কোলেস্টেরল', topic: 'Health & Medicine', cefr: 'B2', example: 'A diet rich in soluble fibre helps regulate blood cholesterol levels.' },
    { word: 'hygiene', bn: 'স্বাস্থ্যবিধি', topic: 'Health & Medicine', cefr: 'B2', example: 'Strict food hygiene inspections are mandatory for all street vendors.' },
    { word: 'souvenir', bn: 'স্মারক উপহার', topic: 'Travel & Tourism', cefr: 'B1', example: 'Visitors often purchase handmade pottery as a souvenir of the historic district.' },
    { word: 'catalogue', bn: 'তালিকা বা ক্যাটালগ', topic: 'Education & Learning', cefr: 'B2', example: 'Students can search the digital library catalogue from any campus terminal.' },
    { word: 'dialogue', bn: 'সংলাপ', topic: 'Communication & Languages', cefr: 'B1', example: 'Constructive dialogue between residents and planners prevented project delays.' },
    { word: 'programme', bn: 'কর্মসূচি (ব্রিটিশ বানান)', topic: 'Education & Learning', cefr: 'B1', example: 'The mentorship programme pairs first-year undergraduates with industry engineers.' },
    { word: 'surveillance', bn: 'নজরদারি', topic: 'Technology & AI', cefr: 'C1', example: 'Urban surveillance cameras raise ongoing debates between safety and privacy.' },
    { word: 'phenomenon', bn: 'বিস্ময়কর ঘটনা বা প্রাকৃতিক প্রপঞ্চ', topic: 'Science & Research', cefr: 'C1', example: 'Urban heat islands are a well-documented meteorological phenomenon.' }
  ];

  for (const trap of EXTRA_EXAM_TRAPS) {
    tryAdd({
      rawWord: trap.word,
      meaningBn: trap.bn,
      example: trap.example,
      cefr: trap.cefr,
      topic: trap.topic
    });
  }

  // 4. B2 & C1 single words
  for (const item of B2_IDIOMS_AND_WORDS) {
    tryAdd({
      rawWord: item.phrase,
      meaningBn: item.banglaMeaning,
      example: item.exampleSentence,
      cefr: item.cefrLevel,
      topic: item.category
    });
  }

  for (const item of C1_IDIOMS_AND_PHRASES) {
    tryAdd({
      rawWord: item.phrase,
      meaningBn: item.banglaMeaning,
      example: item.exampleSentence,
      cefr: item.cefrLevel,
      topic: item.category
    });
  }

  // 5. Unique academic single-word synonyms & antonyms from BandSprint's vocabulary banks
  for (const entry of VOCABULARY_DATA) {
    if (entry.synonyms) {
      for (const syn of entry.synonyms) {
        tryAdd({
          rawWord: syn,
          meaningBn: `${entry.meaning_bn} (${entry.word}-এর সমার্থক)`,
          example: `In formal IELTS writing, "${syn.toLowerCase()}" can serve as an academic equivalent to "${entry.word.toLowerCase()}".`,
          cefr: entry.level,
          topic: entry.topic
        });
      }
    }
    if (entry.antonyms) {
      for (const ant of entry.antonyms) {
        tryAdd({
          rawWord: ant,
          meaningBn: `${entry.word}-এর বিপরীত শব্দ`,
          example: `Examiners reward lexical contrast when candidates distinguish "${ant.toLowerCase()}" from "${entry.word.toLowerCase()}".`,
          cefr: entry.level,
          topic: entry.topic
        });
      }
    }
  }

  for (const card of EXTENDED_VOCAB_DATABASE) {
    if (card.synonyms) {
      for (const syn of card.synonyms) {
        tryAdd({
          rawWord: syn,
          meaningBn: `${card.banglaMeaning} (${card.item}-এর সমার্থক)`,
          example: `Strong Band 8 essays vary vocabulary by using "${syn.toLowerCase()}" alongside "${card.item.toLowerCase()}".`,
          cefr: card.cefr,
          topic: card.topic
        });
      }
    }
  }

  return result;
}

export const IELTS_SPELLING_TRAPS: SpellingTrapItem[] = buildFullSpellingBank();
