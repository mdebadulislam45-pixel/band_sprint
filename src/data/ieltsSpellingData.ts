/**
 * IELTS High-Frequency Spelling Traps & Dictation Words
 * Curated from real examiner reports for Cambridge IELTS Listening & Writing.
 * Includes common candidate spelling mistakes, memory mnemonics, and test sentences.
 */

export interface SpellingTrapItem {
  id: string;
  word: string;
  category: 'Double Letters' | 'Silent Letters' | 'Tricky Vowels' | 'Academic Writing' | 'Listening Traps';
  commonError: string;
  phonetic: string;
  meaning_bn: string;
  memoryTrick: string;
  memoryTrick_bn: string;
  dictationSentence: string;
  hint: string;
}

export const IELTS_SPELLING_TRAPS: SpellingTrapItem[] = [
  {
    id: 'sp_1',
    word: 'accommodation',
    category: 'Double Letters',
    commonError: 'accomodation / acommodation',
    phonetic: '/əˌkɒm.əˈdeɪ.ʃən/',
    meaning_bn: 'বাসস্থান বা থাকার জায়গা',
    memoryTrick: 'Two Cats and Two Mice (2 C\'s and 2 M\'s)',
    memoryTrick_bn: 'মনে রাখুন: একটি ভালো বাসস্থানে ২ জন Cool Cat এবং ২ জন Mighty Mouse থাকার মতো যথেষ্ট বড় জায়গা থাকে (double C, double M)!',
    dictationSentence: 'The university offers guaranteed student accommodation for all first-year international scholars.',
    hint: 'Double C, Double M'
  },
  {
    id: 'sp_2',
    word: 'environment',
    category: 'Silent Letters',
    commonError: 'enviroment',
    phonetic: '/ɪnˈvaɪ.rən.mənt/',
    meaning_bn: 'পরিবেশ',
    memoryTrick: 'Keep the "IRON" in the environment (envi-RON-ment)',
    memoryTrick_bn: 'মনে রাখুন: পরিবেশের ভেতরে লোহা বা "IRON" আছে! তাই "n" কোনোমতেই বাদ দেওয়া যাবে না।',
    dictationSentence: 'Industrial pollutants pose an acute threat to the marine environment.',
    hint: 'Never forget the silent "n" before "ment"'
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
    dictationSentence: 'The research data will definitely substantiate the committee\'s initial hypothesis.',
    hint: 'd-e-f-I-n-I-t-e-l-y (No "a")'
  },
  {
    id: 'sp_4',
    word: 'government',
    category: 'Silent Letters',
    commonError: 'goverment',
    phonetic: '/ˈɡʌv.ən.mənt/',
    meaning_bn: 'সরকার',
    memoryTrick: 'Govern + ment (The government GOVERNS the country)',
    memoryTrick_bn: 'সরকারের কাজ হলো "GOVERN" করা, তাই "n" সবসময় থাকবে।',
    dictationSentence: 'The central government implemented a nationwide carbon taxation policy.',
    hint: 'Do not omit the "n" after "r"'
  },
  {
    id: 'sp_5',
    word: 'noticeable',
    category: 'Academic Writing',
    commonError: 'noticable',
    phonetic: '/ˈnəʊ.tɪ.sə.bəl/',
    meaning_bn: 'সহজেই লক্ষণীয়',
    memoryTrick: 'Keep the "E" so C stays soft (notice + able)',
    memoryTrick_bn: '"Notice" এর "e" কাটবেন না, কারণ "e" ছাড়া "c" এর উচ্চারণ শক্ত "ক" হয়ে যাবে!',
    dictationSentence: 'There was a noticeable upward trajectory in renewable energy adoption after 2015.',
    hint: 'Keep the whole word "notice" intact before "-able"'
  },
  {
    id: 'sp_6',
    word: 'necessary',
    category: 'Double Letters',
    commonError: 'neccessary / necesary',
    phonetic: '/ˈnes.ə.ser.i/',
    meaning_bn: 'প্রয়োজনীয় বা অত্যাবশ্যক',
    memoryTrick: 'One Collar, Two Sleeves (1 C, 2 S\'s)',
    memoryTrick_bn: 'একটি শার্টে একটি কলার (1 C) থাকে আর দুটি হাতা (2 S) থাকে—শার্ট পরা যেমন necessary!',
    dictationSentence: 'It is strictly necessary to allocate substantial fiscal grants to scientific research.',
    hint: 'One C, two S\'s'
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
    hint: 'Double N before "aire"'
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
    hint: 'Double C and Double R'
  },
  {
    id: 'sp_9',
    word: 'hierarchy',
    category: 'Tricky Vowels',
    commonError: 'heirarchy / hierachy',
    phonetic: '/ˈhaɪə.rɑː.ki/',
    meaning_bn: 'স্তরবিন্যাস বা পদমর্যাদা ক্রম',
    memoryTrick: 'High Erarchy (H-I-E-R-A-R-C-H-Y)',
    memoryTrick_bn: 'I আগে আসবে, E পরে আসবে ("i" comes before "e").',
    dictationSentence: 'The organizational hierarchy within modern tech startups tends to be flat.',
    hint: 'H-i-e-r-a-r-c-h-y'
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
    hint: '"a" before "u"'
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
    hint: 'No letter "d"'
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
    hint: 'Spelled with "ten", not "tain"'
  },
  {
    id: 'sp_13',
    word: 'embarrass',
    category: 'Double Letters',
    commonError: 'embarass / emabarass',
    phonetic: '/ɪmˈbær.əs/',
    meaning_bn: 'অপ্রস্তুত বা লজ্জিত করা',
    memoryTrick: 'Double R, Double S (Really Red Strawberry)',
    memoryTrick_bn: 'লজ্জিত হলে গাল লাল হয়ে যায়: ২টা R আর ২টা S মনে রাখুন!',
    dictationSentence: 'Candidates are often embarrassed when speaking before an audience.',
    hint: 'Double R and Double S'
  },
  {
    id: 'sp_14',
    word: 'vacuum',
    category: 'Double Letters',
    commonError: 'vaccuum / vacume',
    phonetic: '/ˈvæk.juːm/',
    meaning_bn: 'শূন্যস্থান বা ভ্যাকুয়াম',
    memoryTrick: 'Only one C, but TWO U\'s (V-A-C-U-U-M)',
    memoryTrick_bn: 'ইংরেজি ভাষার বিরল শব্দ যেখানে একটি C কিন্তু ডাবল U (u-u) থাকে!',
    dictationSentence: 'The collapse of authoritarian regimes left a political vacuum in the region.',
    hint: 'One C, two U\'s'
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
    hint: 'E before I'
  },
  {
    id: 'sp_16',
    word: 'queue',
    category: 'Listening Traps',
    commonError: 'que / qeue',
    phonetic: '/kjuː/',
    meaning_bn: 'লাইন বা সারি',
    memoryTrick: 'Letter Q followed by four silent waiting vowels (ue-ue)',
    memoryTrick_bn: 'Q এর পেছনে ৪ জন মানুষ সিরিয়ালে দাঁড়িয়ে আছে: U-E-U-E!',
    dictationSentence: 'Passengers were instructed to join the designated boarding queue.',
    hint: 'Q followed by "ueue"'
  }
];
