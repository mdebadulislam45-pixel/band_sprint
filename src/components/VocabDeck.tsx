import React, { useState, useEffect } from 'react';
import {
  RotateCw,
  CheckCircle2,
  Bookmark,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Volume2,
  Search,
  BookOpen,
  Layers,
  Lightbulb,
  Copy,
  Check,
  Archive,
  Grid,
  CreditCard,
  Flame,
  ArrowUpRight,
  Filter,
  VolumeX,
  Sliders,
  RotateCcw,
  Award,
  X
} from 'lucide-react';
import { VocabCard } from '../types';
import { soundManager } from '../utils/audioEffects';
import { addMistake } from '../utils/vaultStorage';
import { speakBritish, stopSpeech } from '../utils/britishVoice';
import { audioService, AudioPlaybackState } from '../services/audioService';
import { AudioPlaybackWaveform } from './audio/AudioPlaybackWaveform';
import { VocabCardView } from './vocab/VocabCardView';
import { VocabVisualBanner } from './vocab/VocabVisualCue';
import { VocabSprintHeader } from './vocab/VocabSprintHeader';
import { VocabSprintView } from './vocab/VocabSprintView';
import { VocabQuizInteractive } from './vocab/VocabQuizInteractive';
import { C1C2FlashcardQuiz } from './vocab/C1C2FlashcardQuiz';
import { SavedVocabBanglaQuiz } from './vocab/SavedVocabBanglaQuiz';
import { VocabLearnerBoard } from './vocab/VocabLearnerBoard';
import { IdiomsView } from './vocab/IdiomsView';
import { PhrasesView } from './vocab/PhrasesView';
import { ReviewSessionView } from './vocab/ReviewSessionView';
import { VocabFilterSheet } from './vocab/VocabFilterSheet';
import {
  EXTENDED_VOCAB_DATABASE,
  RICH_PHRASES_DATABASE,
  RICH_IDIOMS_DATABASE
} from '../data/richVocabulary';
import { MASTER_1000_VOCAB_DATABASE } from '../data/masterVocabDatabase';
import { VOCABULARY_DATA_AS_CARDS } from '../data/vocabularyData';
import { BAND_7_9_AS_CARDS } from '../data/band7to9PhrasesAndIdioms';
import { C1_IDIOMS_AND_PHRASES } from '../data/c1IdiomsAndPhrasesData';
import { B2_IDIOMS_AND_WORDS } from '../data/b2IdiomsWords';

interface VocabDeckProps {
  onShowToast: (msg: string) => void;
}

export const COMPREHENSIVE_VOCAB_ITEMS: VocabCard[] = [
  // ==================== 1. ACADEMIC WORDS (উচ্চমানের শব্দ) ====================
  {
    id: 'vc_w1',
    topic: 'Technology & AI',
    category: 'word',
    item: 'Ubiquitous',
    partOfSpeech: 'Adjective',
    banglaPronunciation: 'ইউবিক্যুইটাস',
    banglaMeaning: 'সর্বব্যাপী / সর্বত্র বিরাজমান বা সহজেই দৃশ্যমান',
    banglaExplanation: 'স্মার্টফোন, ইন্টারনেট বা এআই-এর মতো প্রযুক্তি যা সমাজের প্রতিটি স্তরে ছড়িয়ে পড়েছে তা বোঝাতে Writing Task 2-তে ব্যবহার করুন।',
    ieltsSkill: 'Writing Task 2',
    cefr: 'C1',
    definition: 'Present, appearing, or found everywhere in global society simultaneously.',
    beginnerPhrase: 'found everywhere / very common',
    exampleSentence: 'Smartphones and digital mobile payment portals have become virtually ubiquitous across metropolitan urban centers.',
    mastered: false
  },
  {
    id: 'vc_w2',
    topic: 'Environment',
    category: 'word',
    item: 'Mitigate',
    partOfSpeech: 'Verb',
    banglaPronunciation: 'মিটিগেট',
    banglaMeaning: 'হ্রাস করা / উপশম করা / ক্ষতিকর তীব্রতা কমানো',
    banglaExplanation: 'পরিবেশ দূষণ, অর্থনৈতিক সংকট বা ঝুঁকি প্রশমনের ক্ষেত্রে Writing Task 2 এবং Speaking Part 3-তে "reduce"-এর বদলে এটি লিখুন।',
    ieltsSkill: 'Writing Task 2',
    cefr: 'C1',
    definition: 'Make something bad, harmful, or severe less intense; alleviate or cushion negative impacts.',
    beginnerPhrase: 'reduce / make less bad',
    exampleSentence: 'Governments must introduce strict renewable subsidies to mitigate the severe ramifications of global climate shifts.',
    mastered: false
  },
  {
    id: 'vc_w3',
    topic: 'Psychology & Health',
    category: 'word',
    item: 'Resilient',
    partOfSpeech: 'Adjective',
    banglaPronunciation: 'রেজিলিয়েন্ট',
    banglaMeaning: 'প্রতিকূলতা জয় করে ঘুরে দাঁড়াতে সক্ষম / স্থিতিস্থাপক',
    banglaExplanation: 'কঠিন আঘাত বা অর্থনৈতিক বিপর্যয়ের পর যে ব্যক্তি বা জাতি দ্রুত স্বাভাবিক অবস্থায় ফিরতে পারে তাকে বোঝাতে ব্যবহৃত হয়।',
    ieltsSkill: 'Speaking Part 2',
    cefr: 'C1',
    definition: 'Able to withstand or recover quickly from difficult conditions, shocks, or acute stress.',
    beginnerPhrase: 'strong after problems / tough',
    exampleSentence: 'Children exposed to bilingual education develop remarkably resilient cognitive neural pathways.',
    mastered: false
  },
  {
    id: 'vc_w4',
    topic: 'Society & Culture',
    category: 'word',
    item: 'Predicament',
    partOfSpeech: 'Noun',
    banglaPronunciation: 'প্রেডিকামেন্ট',
    banglaMeaning: 'সংকটজনক বা কঠিন পরিস্থিতি / উভয়সংকট',
    banglaExplanation: '"Problem" শব্দের ক্লিশে পরিহার করে একটি গম্ভীর ও গভীর সংকট বোঝাতে Task 2 ইন্ট্রোডাকশনে দারুণ কার্যকর।',
    ieltsSkill: 'Writing Task 2',
    cefr: 'C1',
    definition: 'A difficult, unpleasant, or perplexing situation from which escape is arduous.',
    beginnerPhrase: 'big problem / dilemma',
    exampleSentence: 'Developing coastal economies face a grave ecological predicament due to rising tidal storm surges.',
    mastered: false
  },
  {
    id: 'vc_w5',
    topic: 'Society & Policy',
    category: 'word',
    item: 'Exacerbate',
    partOfSpeech: 'Verb',
    banglaPronunciation: 'এক্সাসারবেট',
    banglaMeaning: 'পরিস্থিতি আরও জটিল, মারাত্মক বা খারাপ করে তোলা',
    banglaExplanation: '"Make worse" এর উন্নত C1 একাডেমিক বিকল্প। ট্রাফিক জ্যাম, বেকারত্ব বা মুদ্রাস্ফীতির আলোচনায় ব্যবহারযোগ্য।',
    ieltsSkill: 'Writing Task 2',
    cefr: 'C1',
    definition: 'Make a problem, bad situation, or negative feeling significantly worse or more acute.',
    beginnerPhrase: 'make worse',
    exampleSentence: 'Unregulated urban congestion continues to exacerbate localized atmospheric air pollution.',
    mastered: false
  },
  {
    id: 'vc_w6',
    topic: 'Education & Policy',
    category: 'word',
    item: 'Pragmatic',
    partOfSpeech: 'Adjective',
    banglaPronunciation: 'প্র্যাগম্যাটিক',
    banglaMeaning: 'বাস্তবধর্মী / বাস্তবমুখী / তাত্ত্বিক নয় এমন ব্যবহারিক দৃষ্টিভঙ্গি',
    banglaExplanation: 'ভাবালুতার বদলে কোনো শিক্ষানীতি বা সরকারি পরিকল্পনার বাস্তবসম্মত দিক তুলে ধরতে ব্যবহৃত হয়।',
    ieltsSkill: 'Writing Task 2',
    cefr: 'C1',
    definition: 'Dealing with matters sensibly and realistically based on practical rather than theoretical considerations.',
    beginnerPhrase: 'practical / realistic',
    exampleSentence: 'Policy analysts urge administrators to adopt pragmatic vocational training frameworks over rote memorization.',
    mastered: false
  },
  {
    id: 'vc_w7',
    topic: 'Technology & AI',
    category: 'word',
    item: 'Proliferate',
    partOfSpeech: 'Verb',
    banglaPronunciation: 'প্রোলিফারেট',
    banglaMeaning: 'অত্যন্ত দ্রুত সংখ্যায় বা মাত্রায় বৃদ্ধি পাওয়া / ছড়িয়ে পড়া',
    banglaExplanation: '"Increase very fast" শব্দের আন্তর্জাতিক C2 লেভেলের প্রতিশব্দ।',
    ieltsSkill: 'Reading Academic',
    cefr: 'C2',
    definition: 'Increase rapidly in numbers or multiply at an accelerated exponential velocity.',
    beginnerPhrase: 'increase rapidly / multiply',
    exampleSentence: 'Automated synthetic intelligence tools continue to proliferate across global corporate workspaces.',
    mastered: false
  },
  {
    id: 'vc_w8',
    topic: 'Health & Well-being',
    category: 'word',
    item: 'Deteriorate',
    partOfSpeech: 'Verb',
    banglaPronunciation: 'ডিটেরিওরেট',
    banglaMeaning: 'ক্রমাগত অবনতি ঘটা / মানের অবক্ষয় হওয়া',
    banglaExplanation: 'শারীরিক স্বাস্থ্য, পরিবেশ বা আন্তর্জাতিক সম্পর্কের অবনতি বোঝাতে Task 1 & 2 তে নিয়মিত দেখা যায়।',
    ieltsSkill: 'Writing Task 2',
    cefr: 'C1',
    definition: 'Become progressively worse in structural quality, physical health, or operational integrity.',
    beginnerPhrase: 'get worse and worse',
    exampleSentence: 'Air quality in industrialized megacities tends to deteriorate sharply during dry winter months.',
    mastered: false
  },
  {
    id: 'vc_w9',
    topic: 'Health & Society',
    category: 'word',
    item: 'Detrimental',
    partOfSpeech: 'Adjective',
    banglaPronunciation: 'ডেট্রিমেণ্টাল',
    banglaMeaning: 'মারাত্মক ক্ষতিকর / অনিষ্টকারী / ধ্বংসাত্মক প্রভাবযুক্ত',
    banglaExplanation: '"Harmful" বা "bad" লেখার বদলে "detrimental effect" লিখলে লেক্সিক্যাল রিসোর্সে ৭.৫+ নিশ্চিত হয়।',
    ieltsSkill: 'Writing Task 2',
    cefr: 'C1',
    definition: 'Tending to cause definite harm, damage, or adverse disruption.',
    beginnerPhrase: 'very harmful / damaging',
    exampleSentence: 'Excessive sedentary screen time has proven distinctly detrimental to adolescent psychological well-being.',
    mastered: false
  },
  {
    id: 'vc_w10',
    topic: 'Education & Society',
    category: 'word',
    item: 'Paramount',
    partOfSpeech: 'Adjective',
    banglaPronunciation: 'প্যারামাউন্ট',
    banglaMeaning: 'সর্বাপেক্ষা গুরুত্বপূর্ণ / সর্বোচ্চ অগ্রাধিকারপ্রাপ্ত / প্রধানতম',
    banglaExplanation: '"Of paramount importance" ফ্রেজটি "very important" এর পরিবর্তে এসেই লেখার সময় অব্যর্থ অস্ত্র।',
    ieltsSkill: 'Writing Task 2',
    cefr: 'C2',
    definition: 'More important than anything else; supreme in rank, power, or authority.',
    beginnerPhrase: 'most important',
    exampleSentence: 'Fostering critical analytic thinking in modern curricula is of paramount importance for national progress.',
    mastered: false
  },
  {
    id: 'vc_w11',
    topic: 'Economy & Planning',
    category: 'word',
    item: 'Feasible',
    partOfSpeech: 'Adjective',
    banglaPronunciation: 'ফিজিবল',
    banglaMeaning: 'বাস্তবায়নযোগ্য / সহজে সম্ভবপর / যুক্তিযুক্ত',
    banglaExplanation: 'কোনো সরকারি প্রজেক্ট বা পরিবেশগত সমাধান বাস্তবে কার্যকরী করা সম্ভব কিনা তা বোঝাতে ব্যবহৃত হয়।',
    ieltsSkill: 'Writing Task 2',
    cefr: 'C1',
    definition: 'Possible to do easily or conveniently; capable of being carried out successfully.',
    beginnerPhrase: 'doable / possible',
    exampleSentence: 'Transitioning entirely to solar infrastructure by next year is economically desirable but scarcely feasible.',
    mastered: false
  },
  {
    id: 'vc_w12',
    topic: 'Academic Inquiry',
    category: 'word',
    item: 'Substantiate',
    partOfSpeech: 'Verb',
    banglaPronunciation: 'সাবস্ট্যানশিয়েট',
    banglaMeaning: 'যুক্তি, প্রমাণ বা তথ্য দিয়ে প্রতিষ্ঠা করা / সত্যতা প্রমাণ করা',
    banglaExplanation: 'রাইটিং এসেই-তে নিজের দাবির পক্ষে প্রমাণ হাজির করতে "substantiate this claim" ব্যবহার করুন।',
    ieltsSkill: 'Writing Task 2',
    cefr: 'C1',
    definition: 'Provide clear evidence to support or prove the truth of an assertion or hypothesis.',
    beginnerPhrase: 'prove with facts',
    exampleSentence: 'Academic researchers must provide longitudinal empirical metrics to substantiate their conclusions.',
    mastered: false
  },
  {
    id: 'vc_w13',
    topic: 'Society & Economics',
    category: 'word',
    item: 'Disparity',
    partOfSpeech: 'Noun',
    banglaPronunciation: 'ডিসপ্যারিটি',
    banglaMeaning: 'প্রকট বৈষম্য / সামাজিক বা অর্থনৈতিক বিরাট ফারাক',
    banglaExplanation: 'ধনী-দরিদ্রের আয়ের বৈষম্য (income disparity) কিংবা স্বাস্থ্যসেবার অসাম্য বোঝাতে আদর্শ শব্দ।',
    ieltsSkill: 'Writing Task 2',
    cefr: 'C1',
    definition: 'A noticeable, significant difference or inequality between groups, figures, or conditions.',
    beginnerPhrase: 'big difference / inequality',
    exampleSentence: 'The expanding economic disparity between rural agrarian laborers and urban professionals warrants urgent tax reform.',
    mastered: false
  },
  {
    id: 'vc_w14',
    topic: 'Science & Education',
    category: 'word',
    item: 'Elucidate',
    partOfSpeech: 'Verb',
    banglaPronunciation: 'ইলুসিডেট',
    banglaMeaning: 'স্পষ্ট বা প্রাঞ্জল ভাষায় ব্যাখ্যা করা / আলোকিত করা',
    banglaExplanation: '"Explain clearly" এর অভিজাত সি১ সমার্থক শব্দ। জটিল বৈজ্ঞানিক তত্ত্ব বা নীতি ব্যাখ্যার ক্ষেত্রে।',
    ieltsSkill: 'Reading Academic',
    cefr: 'C1',
    definition: 'Make something that is complicated clear and easy to understand through detailed explanation.',
    beginnerPhrase: 'explain clearly',
    exampleSentence: 'The visiting Practice professor gave an inspiring lecture to elucidate quantum computing principles.',
    mastered: false
  },
  {
    id: 'vc_w15',
    topic: 'Society & Innovation',
    category: 'word',
    item: 'Foster',
    partOfSpeech: 'Verb',
    banglaPronunciation: 'ফস্টার',
    banglaMeaning: 'উৎসাহিত করা / লালন করা / অনুকূল পরিবেশ তৈরি করে বিকাশ ঘটানো',
    banglaExplanation: '"Foster creativity" বা "foster international cooperation" হিসেবে অত্যন্ত জনপ্রিয় ও আকর্ষণীয়।',
    ieltsSkill: 'Speaking Part 3',
    cefr: 'C1',
    definition: 'Encourage or promote the development or growth of something desirable.',
    beginnerPhrase: 'encourage / help develop',
    exampleSentence: 'Progressive educational institutions intentionally foster collaborative teamwork among students.',
    mastered: false
  },

  // ==================== 2. PHRASES & COLLOCATIONS (একাডেমিক বাক্যাংশ) ====================
  {
    id: 'vc_p1',
    topic: 'Technology & AI',
    category: 'phrase',
    item: 'Catalyze rapid paradigm shifts',
    partOfSpeech: 'Collocation (Verb + Noun)',
    banglaPronunciation: 'ক্যাটালাইজ র‍্যাপিড প্যারাডাইম শিফটস',
    banglaMeaning: 'মৌলিক ধ্যান-ধারণা ও দৃষ্টিভঙ্গির দ্রুত বৈপ্লবিক রূপান্তর ঘটানো',
    banglaExplanation: 'প্রযুক্তির কারণে মানুষের কাজের ধরন কীভাবে পুরোপুরি বদলে যাচ্ছে তা ব্যাখ্যা করতে এই বাক্যবন্ধ অনবদ্য।',
    ieltsSkill: 'Writing Task 2',
    cefr: 'C2',
    definition: 'Accelerates fundamental changes in the basic concepts and operational practices of a field.',
    beginnerPhrase: 'changes things very quickly',
    exampleSentence: 'Generative machine learning catalyzes rapid paradigm shifts across modern computational research.',
    mastered: false
  },
  {
    id: 'vc_p2',
    topic: 'Education & Science',
    category: 'phrase',
    item: 'Conduct rigorous empirical inquiry',
    partOfSpeech: 'Collocation (Verb + Noun)',
    banglaPronunciation: 'কনডাক্ট রিগোরাস এম্পিরিক্যাল ইনকোয়ারি',
    banglaMeaning: 'যথাযথ পর্যবেক্ষণমূলক গভীর বৈজ্ঞানিক গবেষণা পরিচালনা করা',
    banglaExplanation: '"Do research thoroughly" না লিখে এই পরিচ্ছন্ন কোলোকেশন ব্যবহার করলে লেখার গভীরতা বহু গুণ বাড়ে।',
    ieltsSkill: 'Writing Task 2',
    cefr: 'C2',
    definition: 'Execute methodical investigation based on verifiable real-world observation rather than conjecture.',
    beginnerPhrase: 'do research thoroughly',
    exampleSentence: 'Postgraduate scholars are mandated to conduct rigorous empirical inquiry prior to publishing peer-reviewed papers.',
    mastered: false
  },
  {
    id: 'vc_p3',
    topic: 'Society & Views',
    category: 'phrase',
    item: 'Harbor sharply polarized perspectives',
    partOfSpeech: 'Collocation (Verb + Noun)',
    banglaPronunciation: 'হার্বার শার্পলি পোলারাইজড পারসপেক্টিভস',
    banglaMeaning: 'চরম বিভক্ত ও বিপরীতমুখী দৃষ্টিভঙ্গি বা মতামত পোষণ করা',
    banglaExplanation: '"Discuss both views" এসেই-এর ইন্ট্রোডাকশনে "People have different views" লেখার বদলে এটি ব্যবহার করুন।',
    ieltsSkill: 'Writing Task 2',
    cefr: 'C1',
    definition: 'Hold deeply divided viewpoints driven to opposite ideological extremes without common consensus.',
    beginnerPhrase: 'people have very different opinions',
    exampleSentence: 'Citizens harbor sharply polarized perspectives regarding municipal zoning restrictions and high-density housing.',
    mastered: false
  },
  {
    id: 'vc_p4',
    topic: 'Economy & Governance',
    category: 'phrase',
    item: 'Curb wasteful fiscal expenditure',
    partOfSpeech: 'Collocation (Verb + Noun)',
    banglaPronunciation: 'কার্ব ওয়েস্টফুল ফিসকাল এক্সপেনডিচার',
    banglaMeaning: 'অপব্যয়ী সরকারি আর্থিক ব্যয় কঠোরভাবে নিয়ন্ত্রণ বা সংকুচিত করা',
    banglaExplanation: 'সরকারি বাজেট বণ্টন বা করদাতাদের অর্থের সঠিক ব্যবহার নিশ্চিত করার প্রসঙ্গে এটি লিখুন।',
    ieltsSkill: 'Writing Task 2',
    cefr: 'C1',
    definition: 'Restrain or impose checks upon government or corporate spending that yields zero productive utility.',
    beginnerPhrase: 'stop wasting money',
    exampleSentence: 'Auditors recommend strict oversight to curb wasteful fiscal expenditure during inflationary spikes.',
    mastered: false
  },
  {
    id: 'vc_p5',
    topic: 'Health & Well-being',
    category: 'phrase',
    item: 'Exert a debilitating long-term toll',
    partOfSpeech: 'Collocation (Verb + Noun)',
    banglaPronunciation: 'এক্সার্ট আ ডেবিলিটেটিং লং-টার্ম টোল',
    banglaMeaning: 'দীর্ঘমেয়াদে শরীর বা মনের ওপর মারাত্মক দুর্বলকারী ক্ষতিকর প্রভাব ফেলা',
    banglaExplanation: 'দূষণ, স্ট্রেস বা অতিরিক্ত কাজের চাপ স্বাস্থ্যের কতটা ক্ষতি করে তা বোঝাতে দারুণ কার্যকর।',
    ieltsSkill: 'Writing Task 2',
    cefr: 'C2',
    definition: 'Progressively weakens bodily vitality, mental acuity, or chronic physical health over extended periods.',
    beginnerPhrase: 'makes health worse over time',
    exampleSentence: 'Chronic occupational burnout exerts a debilitating long-term toll on cardiovascular stability.',
    mastered: false
  },
  {
    id: 'vc_p6',
    topic: 'Environment',
    category: 'phrase',
    item: 'Pose a grave threat to biodiversity',
    partOfSpeech: 'Collocation (Verb + Noun)',
    banglaPronunciation: 'পোজ আ গ্রেভ থ্রেট টু বায়োডাইভারসিটি',
    banglaMeaning: 'জীববৈচিত্র্যের জন্য মারাত্মক ও গভীর হুমকি সৃষ্টি করা',
    banglaExplanation: '"Be dangerous for animals" বলার পরিবর্তে এই একাডেমিক কোলোকেশন ব্যবহার করলে ব্যান্ড স্কোর অনেক বাড়ে।',
    ieltsSkill: 'Writing Task 2',
    cefr: 'C1',
    definition: 'Present an imminent, dangerous risk to delicate animal habitats and ecosystem equilibrium.',
    beginnerPhrase: 'be dangerous for nature',
    exampleSentence: 'Deforestation and illicit industrial waste dumping pose a grave threat to endangered tropical biodiversity.',
    mastered: false
  },
  {
    id: 'vc_p7',
    topic: 'Education & Family',
    category: 'phrase',
    item: 'Play an indispensable role',
    partOfSpeech: 'Collocation (Verb + Noun)',
    banglaPronunciation: 'প্লে অ্যান ইনডিসপেন্সেবল রোল',
    banglaMeaning: 'অপরিহার্য, অনস্বীকার্য ও কেন্দ্রীয় ভূমিকা পালন করা',
    banglaExplanation: '"Very important" শব্দের পুনরাবৃত্তি দূর করার জন্য এটি একটি আন্তর্জাতিক মানসম্পন্ন বিকল্প।',
    ieltsSkill: 'Writing Task 2',
    cefr: 'C1',
    definition: 'Performs a vital, essential function that cannot be set aside, dismissed, or substituted.',
    beginnerPhrase: 'is very important',
    exampleSentence: 'Parental involvement plays an indispensable role in shaping early childhood literacy development.',
    mastered: false
  },
  {
    id: 'vc_p8',
    topic: 'Technology & Science',
    category: 'phrase',
    item: 'Pave the way for breakthrough innovations',
    partOfSpeech: 'Collocation (Verb + Noun)',
    banglaPronunciation: 'পেভ দ্য ওয়ে ফর ব্রেক-থ্রু ইনোভেশনস',
    banglaMeaning: 'যুগান্তকারী নতুন আবিষ্কারের পথ সুগম ও প্রশস্ত করা',
    banglaExplanation: 'নতুন গবেষণা বা আবিষ্কার মানবজাতির জন্য কেমন দিগন্ত উন্মোচন করছে তা প্রকাশ করতে ব্যবহার করুন।',
    ieltsSkill: 'Speaking Part 3',
    cefr: 'C1',
    definition: 'Creates conditions that facilitate future revolutionary discoveries or technological leaps.',
    beginnerPhrase: 'helps make new things',
    exampleSentence: 'Pioneering genomic research paves the way for personalized, breakthrough medical innovations.',
    mastered: false
  },
  {
    id: 'vc_p9',
    topic: 'Society & Ethics',
    category: 'phrase',
    item: 'Shift the burden of responsibility',
    partOfSpeech: 'Collocation (Verb + Noun)',
    banglaPronunciation: 'শিফট দ্য বার্ডেন অফ রেসপনসিবিলিটি',
    banglaMeaning: 'দায়িত্ব বা খরচের বোঝা অন্যের কাঁধে চাপিয়ে দেওয়া',
    banglaExplanation: 'পরিবেশ দূষণ বা চিকিৎসা ব্যয়ের দায় সরকার নাকি ব্যক্তি বহন করবে—এমন বিতর্কে এটি অব্যর্থ।',
    ieltsSkill: 'Writing Task 2',
    cefr: 'C1',
    definition: 'Transfer the duty or obligation of dealing with an arduous problem from one party to another.',
    beginnerPhrase: 'make someone else responsible',
    exampleSentence: 'Corporations must not shift the burden of responsibility for plastic recycling solely onto consumers.',
    mastered: false
  },
  {
    id: 'vc_p10',
    topic: 'Society & Policy',
    category: 'phrase',
    item: 'Reconcile conflicting viewpoints',
    partOfSpeech: 'Collocation (Verb + Noun)',
    banglaPronunciation: 'রেকনসাইল কনফ্লিক্টিং ভিউপয়েন্টস',
    banglaMeaning: 'দুই বিপরীতমুখী মত বা স্বার্থের মধ্যে সমন্বয় ও সমঝোতা স্থাপন করা',
    banglaExplanation: 'বিতর্কিত বিষয়ের কনক্লুশনে উভয় পক্ষের স্বার্থের মধ্যে ভারসাম্য টানতে দারুণ একটি ফ্রেজ।',
    ieltsSkill: 'Writing Task 2',
    cefr: 'C2',
    definition: 'Find a harmonious middle ground or agreement between mutually opposing opinions.',
    beginnerPhrase: 'bring two sides together',
    exampleSentence: 'A balanced civic policy must reconcile conflicting viewpoints between heritage conservation and urban expansion.',
    mastered: false
  },

  // ==================== 3. IDIOMS & FIGURATIVE EXPRESSIONS (বাগধারা ও প্রবাদ) ====================
  {
    id: 'vc_i1',
    topic: 'Technology & Society',
    category: 'idiom',
    item: 'A double-edged sword',
    partOfSpeech: 'Idiomatic Expression',
    banglaPronunciation: 'আ ডাবল-এজড সোর্ড',
    banglaMeaning: 'দোধারী তলোয়ার (যার সুফল ও কুফল উভয়ই বিদ্যমান)',
    banglaExplanation: 'সুবিধা এবং অসুবিধা উভয়ই বিদ্যমান এমন যেকোনো প্রযুক্তি বা সামাজিক পরিবর্তন বর্ণনায় অত্যন্ত জনপ্রিয়।',
    ieltsSkill: 'Speaking Part 3',
    cefr: 'B2',
    definition: 'Something that has both beneficial advantages and unfavorable, hazardous consequences.',
    beginnerPhrase: 'has both good and bad sides',
    exampleSentence: 'Social media is undeniably a double-edged sword: it connects communities globally yet triggers psychological isolation.',
    mastered: false
  },
  {
    id: 'vc_i2',
    topic: 'Society & Problems',
    category: 'idiom',
    item: 'The tip of the iceberg',
    partOfSpeech: 'Idiomatic Expression',
    banglaPronunciation: 'দ্য টিপ অফ দ্য আইসবার্গ',
    banglaMeaning: 'হিমশৈলের দৃশ্যমান চূড়া (বিশাল লুকায়িত সমস্যার সামান্যতম অংশ)',
    banglaExplanation: 'কোনো সংকটের গভীরতা ও বিস্তার কত ব্যাপক তা স্পিকিং বা রাইটিংয়ে ফুটিয়ে তুলতে মোক্ষম বাগধারা।',
    ieltsSkill: 'Speaking Part 3',
    cefr: 'B2',
    definition: 'A small, noticeable part of a much larger, more severe problem that remains hidden.',
    beginnerPhrase: 'just a small part of a big problem',
    exampleSentence: 'Reported cybercrime statistics represent merely the tip of the iceberg in current digital financial ecosystems.',
    mastered: false
  },
  {
    id: 'vc_i3',
    topic: 'Education & Work',
    category: 'idiom',
    item: 'Burn the midnight oil',
    partOfSpeech: 'Idiomatic Expression',
    banglaPronunciation: 'বার্ন দ্য মিডনাইট অয়েল',
    banglaMeaning: 'গভীর রাত জেগে একাগ্রচিত্তে পড়াশোনা বা কঠোর পরিশ্রম করা',
    banglaExplanation: 'Speaking Part 1 & 2 তে নিজের পরীক্ষার প্রস্তুতি, বিশ্ববিদ্যালয়ের থিসিস বা কাজের অভিজ্ঞতা বর্ণনায় ব্যবহার করুন।',
    ieltsSkill: 'Speaking Part 2',
    cefr: 'B2',
    definition: 'Work or study intensively late into the night until the early morning hours.',
    beginnerPhrase: 'study very late at night',
    exampleSentence: 'I had to burn the midnight oil for three consecutive weeks to complete my undergraduate engineering dissertation.',
    mastered: false
  },
  {
    id: 'vc_i4',
    topic: 'Education & Creativity',
    category: 'idiom',
    item: 'Think outside the box',
    partOfSpeech: 'Idiomatic Expression',
    banglaPronunciation: 'থিঙ্ক আউটসাইড দ্য বক্স',
    banglaMeaning: 'চিরাচরিত গণ্ডির বাইরে গিয়ে সৃজনশীল ও অভিনব উপায়ে চিন্তা করা',
    banglaExplanation: 'ক্রিয়েটিভ প্রবলেম সলভিং বা নতুন আইডিয়া তৈরির প্রসঙ্গে স্পিকিং পার্ট ১ ও ৩-তে আদর্শ।',
    ieltsSkill: 'Speaking Part 1/2',
    cefr: 'B2',
    definition: 'Formulate innovative, unconventional, and imaginative ideas rather than traditional ones.',
    beginnerPhrase: 'think creatively and differently',
    exampleSentence: 'Contemporary corporate recruiters prioritize young graduates who dare to think outside the box during unexpected crises.',
    mastered: false
  },
  {
    id: 'vc_i5',
    topic: 'Economy & Lifestyle',
    category: 'idiom',
    item: 'Cost an arm and a leg',
    partOfSpeech: 'Idiomatic Expression',
    banglaPronunciation: 'কস্ট অ্যান আর্ম অ্যান্ড আ লেগ',
    banglaMeaning: 'অত্যধিক ব্যয়বহুল / আকাশচুম্বী মূল্যের বিষয়',
    banglaExplanation: 'Speaking টেস্টে কোনো দামি শপিং, বিদেশে পড়ার খরচ বা বড় শহরের জীবনযাত্রার ব্যয় বোঝাতে ব্যবহার করুন।',
    ieltsSkill: 'Speaking Part 1/2',
    cefr: 'B2',
    definition: 'Extremely exorbitant, excessively expensive.',
    beginnerPhrase: 'is very expensive',
    exampleSentence: 'Renting a modest studio flat in central London can literally cost an arm and a leg for international scholars.',
    mastered: false
  },
  {
    id: 'vc_i6',
    topic: 'Lifestyle & Habits',
    category: 'idiom',
    item: 'Once in a blue moon',
    partOfSpeech: 'Idiomatic Expression',
    banglaPronunciation: 'ওয়ান্স ইন আ ব্লু মুন',
    banglaMeaning: 'কদাচিৎ / অতি বিরল ঘটনা / কালেভদ্রে',
    banglaExplanation: 'Speaking Part 1 এ "How often do you..." প্রশ্নের উত্তরে "rarely" না বলে এই ন্যাচারাল ইডিয়মটি বলুন।',
    ieltsSkill: 'Speaking Part 1',
    cefr: 'B2',
    definition: 'Very rarely; occurring only on infrequent special occasions.',
    beginnerPhrase: 'very rarely / almost never',
    exampleSentence: 'Due to my demanding postgraduate timetable, I only get to visit my native rural village once in a blue moon.',
    mastered: false
  },
  {
    id: 'vc_i7',
    topic: 'Society & Law',
    category: 'idiom',
    item: 'Face the music',
    partOfSpeech: 'Idiomatic Expression',
    banglaPronunciation: 'ফেস দ্য মিউজিক',
    banglaMeaning: 'নিজের কৃতকর্ম বা ভুলের অপ্রীতিকর পরিণাম মাথা পেতে মেনে নেওয়া',
    banglaExplanation: 'ভুল সিদ্ধান্তের ফল ভোগ করার প্রেক্ষিতে স্পিকিং ও রাইটিংয়ে ব্যবহারযোগ্য।',
    ieltsSkill: 'Speaking Part 2',
    cefr: 'C1',
    definition: 'Accept the unpleasant consequences, punishment, or criticism resulting from one’s own past actions.',
    beginnerPhrase: 'accept punishment for mistakes',
    exampleSentence: 'Industrial factories that deliberately bypass emission restrictions must eventually face the music in court.',
    mastered: false
  },
  {
    id: 'vc_i8',
    topic: 'Psychology & Life',
    category: 'idiom',
    item: 'A blessing in disguise',
    partOfSpeech: 'Idiomatic Expression',
    banglaPronunciation: 'আ ব্লেসিং ইন ডিসগাইজ',
    banglaMeaning: 'আপাতদৃষ্টিতে দুর্ভাগ্য মনে হলেও পরিণামে যা শুভ বা কল্যাণকর প্রমাণিত হয়',
    banglaExplanation: 'Speaking Part 2 তে অপ্রত্যাশিত অভিজ্ঞতার বর্ণনায় (e.g. কোনো পরীক্ষা ফেইল করা যা পরবর্তীতে বড় প্রেরণা হয়েছিল)।',
    ieltsSkill: 'Speaking Part 2',
    cefr: 'B2',
    definition: 'An apparent misfortune or setback that ultimately results in a beneficial outcome.',
    beginnerPhrase: 'something good that seemed bad at first',
    exampleSentence: 'Failing my initial visa interview was actually a blessing in disguise, as it gave me extra time to secure a full scholarship.',
    mastered: false
  },
  {
    id: 'vc_i9',
    topic: 'Communication & People',
    category: 'idiom',
    item: 'Break the ice',
    partOfSpeech: 'Idiomatic Expression',
    banglaPronunciation: 'ব্রেক দ্য আইস',
    banglaMeaning: 'অপরিচিত মানুষের সাথে আলোচনার প্রাথমিক জড়তা বা সংকোচ দূর করা',
    banglaExplanation: 'মিটিং, নতুন ক্লাসরুম বা অনুষ্ঠানে কথা শুরু করার প্রেক্ষিতে Speaking এ ব্যবহৃত হয়।',
    ieltsSkill: 'Speaking Part 1/2',
    cefr: 'B2',
    definition: 'Overcome initial tension, social stiffness, or hesitation in a gathering of unfamiliar people.',
    beginnerPhrase: 'start conversation easily',
    exampleSentence: 'The orientation tutor organized collaborative team games to help new international candidates break the ice.',
    mastered: false
  },
  {
    id: 'vc_i10',
    topic: 'Society & Relationships',
    category: 'idiom',
    item: 'See eye to eye',
    partOfSpeech: 'Idiomatic Expression',
    banglaPronunciation: 'সি আই টু আই',
    banglaMeaning: 'সম্পূর্ণ একমত হওয়া / দৃষ্টিভঙ্গির মিল থাকা',
    banglaExplanation: '"Agree with someone" এর সাবলীল বাগধারা। "My parents and I do not always see eye to eye" হিসেবে দারুণ শোনায়।',
    ieltsSkill: 'Speaking Part 1/3',
    cefr: 'B2',
    definition: 'Agree fully with another person on a particular issue or philosophy.',
    beginnerPhrase: 'agree completely',
    exampleSentence: 'Generational cohorts rarely see eye to eye regarding career priorities and remote digital employment.',
    mastered: false
  },
  {
    id: 'vc_i11',
    topic: 'Psychology & Challenge',
    category: 'idiom',
    item: 'Bite the bullet',
    partOfSpeech: 'Idiomatic Expression',
    banglaPronunciation: 'বাইট দ্য বুলেট',
    banglaMeaning: 'অনিচ্ছা থাকা সত্ত্বেও সাহস সঞ্চয় করে কোনো কঠিন পরিস্থিতি মেনে নেওয়া',
    banglaExplanation: 'Speaking Part 2 তে কোনো কঠিন সিদ্ধান্ত বা চ্যালেঞ্জের গল্প বর্ণনায় নিখুঁত ফিট।',
    ieltsSkill: 'Speaking Part 2',
    cefr: 'B2',
    definition: 'Face a painful or unpleasant situation that is unavoidable with resolute fortitude.',
    beginnerPhrase: 'force yourself to do something hard',
    exampleSentence: 'After postponing my IELTS preparation for months, I finally bit the bullet and enrolled in a rigorous mock schedule.',
    mastered: false
  },
  {
    id: 'vc_i12',
    topic: 'Academic Discussion',
    category: 'idiom',
    item: 'Hit the nail on the head',
    partOfSpeech: 'Idiomatic Expression',
    banglaPronunciation: 'হিট দ্য নেইল অন দ্য হেড',
    banglaMeaning: 'একদম সঠিক জায়গায় আঘাত করা / সমস্যার মূল কারণ নির্ভুলভাবে শনাক্ত করা',
    banglaExplanation: 'Speaking Part 3 তে পরীক্ষকের কোনো গভীর পর্যবেক্ষণের সাথে সহমত জানাতে এটি বলুন।',
    ieltsSkill: 'Speaking Part 3',
    cefr: 'B2',
    definition: 'Describe precisely what is causing a situation or state exactly the core truth.',
    beginnerPhrase: 'say exactly the right thing',
    exampleSentence: 'Your analysis of the rural-to-urban brain drain truly hits the nail on the head.',
    mastered: false
  },
  {
    id: 'vc_w15',
    topic: 'Technology & AI',
    category: 'word',
    item: 'Proliferation',
    partOfSpeech: 'Noun',
    banglaPronunciation: 'প্রোলিফারেশন',
    banglaMeaning: 'দ্রুত বিস্তার / আকস্মিক সংখ্যাবৃদ্ধি বা প্রসার',
    banglaExplanation: 'স্মার্টফোন, সোশ্যাল মিডিয়া বা নিউক্লিয়ার অস্ত্রের দ্রুত বিস্তার বোঝাতে Writing Task 2-তে অত্যন্ত আকর্ষণীয় শব্দ।',
    ieltsSkill: 'Writing Task 2',
    cefr: 'C1',
    definition: 'Rapid increase in the number or amount of something; explosive widespread reproduction.',
    beginnerPhrase: 'fast increase / quick spread',
    exampleSentence: 'The rapid proliferation of digital streaming platforms has revolutionized home entertainment consumption patterns.',
    mastered: false
  },
  {
    id: 'vc_w16',
    topic: 'Education & Society',
    category: 'word',
    item: 'Impediment',
    partOfSpeech: 'Noun',
    banglaPronunciation: 'ইমপেডিমেন্ট',
    banglaMeaning: 'অগ্রগতিতে অন্তরায় / প্রতিবন্ধকতা বা বাধার দেয়াল',
    banglaExplanation: '"Obstacle" বা "barrier" শব্দের পরিবর্তে সি১ মানের ফরমাল শব্দ। "A major impediment to progress" লিখুন।',
    ieltsSkill: 'Writing Task 2',
    cefr: 'C1',
    definition: 'A hindrance, obstruction, or barrier in doing something or achieving developmental progress.',
    beginnerPhrase: 'big obstacle / barrier',
    exampleSentence: 'Inadequate primary educational funding acts as a severe impediment to national economic self-sufficiency.',
    mastered: false
  },
  {
    id: 'vc_w17',
    topic: 'Environment & Climate',
    category: 'word',
    item: 'Exacerbate',
    partOfSpeech: 'Verb',
    banglaPronunciation: 'এক্সাসারবেট',
    banglaMeaning: 'খারাপ পরিস্থিতিকে আরও অবনতিশীল বা শোচনীয় করা',
    banglaExplanation: 'দূষণ, ট্রাফিক জ্যাম বা আর্থিক সংকটকে আরও খারাপ করা বোঝাতে "make worse"-এর বদলে ব্যবহৃত হয়।',
    ieltsSkill: 'Writing Task 2',
    cefr: 'C1',
    definition: 'Make a bad problem, bad situation, or negative feeling significantly worse or more severe.',
    beginnerPhrase: 'make worse',
    exampleSentence: 'Unchecked deforestation exacerbates the risk of catastrophic soil erosion and sudden landslides.',
    mastered: false
  },
  {
    id: 'vc_w18',
    topic: 'Society & Policy',
    category: 'word',
    item: 'Indispensable',
    partOfSpeech: 'Adjective',
    banglaPronunciation: 'ইনডিসপেনসিবল',
    banglaMeaning: 'অপরিহার্য / যার বিকল্প নেই বা যা ছাড়া চলা অসম্ভব',
    banglaExplanation: 'ইন্টারনেট, পাবলিক ট্রান্সপোর্ট বা শিক্ষার গুরুত্ব বোঝাতে "very important"-এর বদলে লিখুন।',
    ieltsSkill: 'Writing Task 2',
    cefr: 'C1',
    definition: 'Absolutely necessary, essential, or impossible to manage without.',
    beginnerPhrase: 'must have / completely necessary',
    exampleSentence: 'Subsidized public transportation systems are indispensable to reducing metropolitan carbon footprints.',
    mastered: false
  },
  {
    id: 'vc_w19',
    topic: 'Philosophy & Lifestyle',
    category: 'word',
    item: 'Ephemeral',
    partOfSpeech: 'Adjective',
    banglaPronunciation: 'ইফেমারাল',
    banglaMeaning: 'ক্ষণস্থায়ী / অতি দ্রুত বিলীন হয়ে যাওয়া',
    banglaExplanation: 'সোশ্যাল মিডিয়ার লাইক বা জনপ্রিয়তার ক্ষণস্থায়ী চরিত্র তুলে ধরতে Speaking Part 3 তে অত্যন্ত কার্যকর।',
    ieltsSkill: 'Speaking Part 3',
    cefr: 'C2',
    definition: 'Lasting for only a very brief, fleeting duration of time.',
    beginnerPhrase: 'lasting a short time',
    exampleSentence: 'Fame on viral internet algorithms is famously ephemeral, rarely surviving beyond a few fortnights.',
    mastered: false
  },
  {
    id: 'vc_p11',
    topic: 'Economy & Society',
    category: 'phrase',
    item: 'Bear the brunt of',
    partOfSpeech: 'Collocation (Verb + Noun)',
    banglaPronunciation: 'বেয়ার দ্য ব্রান্ট অফ',
    banglaMeaning: 'সবচেয়ে মারাত্মক ধাক্কা বা ক্ষতির প্রধান শিকার হওয়া',
    banglaExplanation: 'অর্থনৈতিক মন্দা বা জলবায়ু পরিবর্তনের প্রভাবে সাধারণ মানুষ কীভাবে সবচেয়ে বেশি ক্ষতিগ্রস্ত হয় তা প্রকাশে মোক্ষম।',
    ieltsSkill: 'Writing Task 2',
    cefr: 'C1',
    definition: 'Endure the worst, most direct, or main force of a negative shock or blow.',
    beginnerPhrase: 'take the worst damage',
    exampleSentence: 'Marginalized coastal communities continue to bear the brunt of rising sea levels and violent cyclones.',
    mastered: false
  },
  {
    id: 'vc_p12',
    topic: 'Education & Progress',
    category: 'phrase',
    item: 'Play a pivotal role in',
    partOfSpeech: 'Collocation (Verb + Noun)',
    banglaPronunciation: 'প্লে আ পিভোটাল রোল ইন',
    banglaMeaning: 'কেন্দ্রীয় ও অত্যন্ত গুরুত্বপূর্ণ ভূমিকা পালন করা',
    banglaExplanation: 'সরকার, শিক্ষক বা অভিভাবকদের ভূমিকা বর্ণনায় "plays a very important role"-এর বদলে লিখলে হাই স্কোর মেলে।',
    ieltsSkill: 'Writing Task 2',
    cefr: 'C1',
    definition: 'Have a central, crucial, and decisive importance in determining an outcome.',
    beginnerPhrase: 'be very central and important',
    exampleSentence: 'Early childhood educators play a pivotal role in instilling ethical and emotional intelligence.',
    mastered: false
  },
  {
    id: 'vc_p13',
    topic: 'Environment & Policy',
    category: 'phrase',
    item: 'Pave the way for sustainable development',
    partOfSpeech: 'Collocation (Verb + Preposition)',
    banglaPronunciation: 'পেভ দ্য ওয়ে ফর সাসটেইনেবল ডেভেলপমেন্ট',
    banglaMeaning: 'টেকসই ও দীর্ঘমেয়াদী উন্নয়নের পথ সুগম ও সহজ করা',
    banglaExplanation: 'পরিবেশ বা অর্থনৈতিক বিষয়ক রচনায় ইতিবাচক নীতি সুপারিশ করার কনক্লুশনে দারুণ মানানসই।',
    ieltsSkill: 'Writing Task 2',
    cefr: 'C1',
    definition: 'Create the necessary prerequisites and favorable conditions for long-term green progress.',
    beginnerPhrase: 'make green growth possible',
    exampleSentence: 'Investing in national grid electrification will pave the way for sustainable industrial development.',
    mastered: false
  },
  {
    id: 'vc_p14',
    topic: 'Academic Writing',
    category: 'phrase',
    item: 'Stem from the fact that',
    partOfSpeech: 'Cohesive Device',
    banglaPronunciation: 'স্টেম ফ্রম দ্য ফ্যাক্ট দ্যাট',
    banglaMeaning: 'এই সত্য বা কারণ থেকে উদ্ভূত হওয়া',
    banglaExplanation: '"Because of" লেখার ক্লিশে এড়িয়ে বৈজ্ঞানিক ও একাডেমিক যুক্তির কার্যকারণ তুলে ধরতে এটি ব্যবহার করুন।',
    ieltsSkill: 'Writing Task 2',
    cefr: 'C1',
    definition: 'Originate, derive, or directly result from a specific undeniable reality.',
    beginnerPhrase: 'comes from the reason that',
    exampleSentence: 'Urban traffic congestion largely stems from the fact that public bus routes remain underfunded.',
    mastered: false
  },
  {
    id: 'vc_i13',
    topic: 'Determination & Effort',
    category: 'idiom',
    item: 'Leave no stone unturned',
    partOfSpeech: 'Idiomatic Expression',
    banglaPronunciation: 'লিভ নো স্টোন আনটার্নড',
    banglaMeaning: 'লক্ষ্য অর্জনে চেষ্টার কোনো ত্রুটি না রাখা / সম্ভবপর সব উপায় প্রয়োগ করা',
    banglaExplanation: 'Speaking Part 2 তে নিজের কোনো কঠিন কাজের প্রস্তুতি বা কঠোর অধ্যবসায় বর্ণনায় চমৎকার ইডিয়ম।',
    ieltsSkill: 'Speaking Part 2',
    cefr: 'B2',
    definition: 'Do everything possible, investigating all avenues to achieve a desired outcome.',
    beginnerPhrase: 'try every possible way',
    exampleSentence: 'My tutors left no stone unturned to ensure every student understood complex academic grammar rules.',
    mastered: false
  },
  {
    id: 'vc_i14',
    topic: 'Life & Loyalty',
    category: 'idiom',
    item: 'Through thick and thin',
    partOfSpeech: 'Idiomatic Expression',
    banglaPronunciation: 'থ্রু থিক অ্যান্ড থিন',
    banglaMeaning: 'সুখ-দুঃখ ও বিপদের প্রতিটি মুহূর্তে পাশে থাকা / সকল প্রতিকূলতায় অটল থাকা',
    banglaExplanation: 'Speaking Part 1 বা 2 তে ঘনিষ্ঠ বন্ধু বা পরিবারের সাথে সম্পর্কের গভীরতা বোঝাতে ব্যবহৃত হয়।',
    ieltsSkill: 'Speaking Part 1/2',
    cefr: 'B2',
    definition: 'Support or remain loyal under all conditions, whether easy or very challenging.',
    beginnerPhrase: 'through good times and bad times',
    exampleSentence: 'My childhood companion has stood beside me through thick and thin during our university applications.',
    mastered: false
  },
  {
    id: 'vc_i15',
    topic: 'Society & Balance',
    category: 'idiom',
    item: 'At the expense of',
    partOfSpeech: 'Idiomatic Expression',
    banglaPronunciation: 'অ্যাট দ্য এক্সপেন্স অফ',
    banglaMeaning: 'কোনো কিছুর ত্যাগ বা ক্ষতির বিনিময়ে অন্য কিছু অর্জন করা',
    banglaExplanation: 'অর্থনৈতিক উন্নতির জন্য পরিবেশ ধ্বংসের মতো স্পর্শকাতর বিষয়ে রাইটিং টাস্ক ২-তে বহুল ব্যবহৃত।',
    ieltsSkill: 'Writing Task 2',
    cefr: 'C1',
    definition: 'So as to cause damage, sacrifice, or harm to something else.',
    beginnerPhrase: 'by damaging something else',
    exampleSentence: 'Economic growth must never be pursued at the expense of environmental conservation and clean air.',
    mastered: false
  },
  {
    id: 'vc_i16',
    topic: 'Efficiency & Action',
    category: 'idiom',
    item: 'Kill two birds with one stone',
    partOfSpeech: 'Idiomatic Expression',
    banglaPronunciation: 'কিল টু বার্ডস উইথ ওয়ান স্টোন',
    banglaMeaning: 'এক ঢিলে দুই পাখি মারা / একই প্রচেষ্টায় দুটি উদ্দেশ্য সফল করা',
    banglaExplanation: 'Speaking এ সাইকেল চালিয়ে অফিসে যাওয়া (শারীরিক ব্যায়াম + পরিবেশ রক্ষা) ইত্যাদি উদাহরণে অত্যন্ত জনপ্রিয়।',
    ieltsSkill: 'Speaking Part 1/2',
    cefr: 'B2',
    definition: 'Achieve two separate objectives or solve two problems simultaneously with a single action.',
    beginnerPhrase: 'do two things with one action',
    exampleSentence: 'Cycling to campus kills two birds with one stone: it guarantees daily cardiovascular workout and avoids transit fares.',
    mastered: false
  },
  {
    id: 'vc_i17',
    topic: 'Societal Trends',
    category: 'idiom',
    item: 'A snowball effect',
    partOfSpeech: 'Idiomatic Expression',
    banglaPronunciation: 'আ স্নোবল ইফেক্ট',
    banglaMeaning: 'একটি ছোট ঘটনার ক্রমশ পুঞ্জীভূত হয়ে দ্রুত বিশালাকার ধারণ করা',
    banglaExplanation: 'সোশ্যাল মিডিয়ার গুজব, মুদ্রাস্ফীতি বা পরিবেশ দূষণের ক্রমবর্ধমান প্রভাব বোঝাতে দারুণ প্রাসঙ্গিক।',
    ieltsSkill: 'Speaking Part 3',
    cefr: 'B2',
    definition: 'A situation in which something increases in size or importance at an accelerating pace.',
    beginnerPhrase: 'getting bigger and bigger quickly',
    exampleSentence: 'Early financial literacy for school students produces a positive snowball effect on national savings rates.',
    mastered: false
  }
];

// Adapt rich phrases to VocabCard format
const PHRASE_VOCAB_ITEMS: VocabCard[] = RICH_PHRASES_DATABASE.map(p => ({
  id: p.id,
  topic: `Phrases: ${p.category}`,
  category: 'phrase',
  item: p.phrase,
  banglaMeaning: p.banglaMeaning,
  banglaExplanation: `${p.explanation} — ${p.situation}`,
  definition: p.explanation,
  exampleSentence: p.exampleSentence,
  ieltsSkill: 'IELTS Speaking',
  ieltsUsage: `Speaking: ${p.ieltsSpeakingUsefulness}${p.ieltsWritingUsefulness ? ` | Writing: ${p.ieltsWritingUsefulness}` : ''}`,
  cefr: 'B2',
  mastered: false
}));

// Adapt rich idioms to VocabCard format
const IDIOM_VOCAB_ITEMS: VocabCard[] = RICH_IDIOMS_DATABASE.map(i => ({
  id: i.id,
  topic: 'Idioms & Spoken Collocations',
  category: 'idiom',
  item: i.idiom,
  banglaMeaning: i.banglaMeaning,
  banglaExplanation: i.englishMeaning,
  definition: `${i.englishMeaning} (Context: ${i.context})`,
  exampleSentence: i.exampleSentence,
  commonMistakes: i.warning,
  ieltsUsage: `Speaking: ${i.ieltsSpeakingSuitability}. WARNING: ${i.warning || 'Use moderately in natural conversation.'}`,
  cefr: i.difficulty,
  mastered: false
}));

const C1_C2_AS_CARDS: VocabCard[] = C1_IDIOMS_AND_PHRASES.map((entry) => ({
  id: `c1c2_${entry.id}`,
  topic: entry.category || 'C1/C2 Mastery',
  category:
    entry.type === 'Idiom'
      ? 'idiom'
      : entry.type === 'C1 Vocabulary' || entry.type === 'C2 Vocabulary' || entry.type === 'Adjective' || entry.type === 'Adverb'
      ? 'word'
      : 'phrase',
  item: entry.phrase.replace(/\s*\(C[12] Vocabulary\)\s*/i, ''),
  partOfSpeech: entry.type,
  banglaMeaning: entry.banglaMeaning,
  banglaExplanation: `${entry.banglaMeaning} — Suitability: ${entry.ieltsSuitability}`,
  definition: `${entry.type} (${entry.cefrLevel || (entry.category === 'C2 Band-9 Mastery' ? 'C2' : 'C1')}) for IELTS ${entry.ieltsSuitability}`,
  exampleSentence: entry.exampleSentence,
  ieltsSkill: entry.ieltsSuitability,
  cefr: entry.cefrLevel || (entry.category === 'C2 Band-9 Mastery' ? 'C2' : 'C1'),
  mastered: false
}));

// B2 ladder: the same card format, so all 200 new B2 idioms, words and
// phrases appear in the Vocabulary Deck with the existing B2 filter.
const B2_AS_CARDS: VocabCard[] = B2_IDIOMS_AND_WORDS.map((entry) => ({
  id: `b2_${entry.id}`,
  topic: entry.category || 'B2 Intermediate',
  category:
    entry.type === 'Idiom'
      ? 'idiom'
      : entry.type === 'B2 Vocabulary' || entry.type === 'Adjective' || entry.type === 'Adverb'
      ? 'word'
      : 'phrase',
  item: entry.phrase.replace(/\s*\(B2 Vocabulary\)\s*/i, ''),
  partOfSpeech: entry.type,
  banglaMeaning: entry.banglaMeaning,
  banglaExplanation: `${entry.banglaMeaning} — Suitability: ${entry.ieltsSuitability}`,
  definition: `${entry.type} (B2) for IELTS ${entry.ieltsSuitability}`,
  exampleSentence: entry.exampleSentence,
  ieltsSkill: entry.ieltsSuitability,
  cefr: 'B2',
  mastered: false
}));

export const ALL_COMBINED_VOCAB: VocabCard[] = (() => {
  const map = new Map<string, VocabCard>();
  [
    ...C1_C2_AS_CARDS,
    ...B2_AS_CARDS,
    ...BAND_7_9_AS_CARDS,
    ...EXTENDED_VOCAB_DATABASE,
    ...COMPREHENSIVE_VOCAB_ITEMS,
    ...PHRASE_VOCAB_ITEMS,
    ...IDIOM_VOCAB_ITEMS,
    ...VOCABULARY_DATA_AS_CARDS,
    ...MASTER_1000_VOCAB_DATABASE
  ].forEach((card) => {
    if (!map.has(card.id)) {
      map.set(card.id, card);
    }
  });
  return Array.from(map.values());
})();

export const VocabDeck: React.FC<VocabDeckProps> = ({ onShowToast }) => {
  const [cards, setCards] = useState<VocabCard[]>(() => {
    try {
      const saved = localStorage.getItem('ielts_vocab_cards_v5') || localStorage.getItem('ielts_vocab_cards_v4');
      if (saved) {
        const parsed: VocabCard[] = JSON.parse(saved);
        const existingMastered = new Map(parsed.map(c => [c.id, c.mastered]));
        return ALL_COMBINED_VOCAB.map(item => ({
          ...item,
          mastered: existingMastered.has(item.id) ? !!existingMastered.get(item.id) : item.mastered
        }));
      }
      return ALL_COMBINED_VOCAB;
    } catch {
      return ALL_COMBINED_VOCAB;
    }
  });

  const [activeTab, setActiveTab] = useState<'sprint' | 'vocab' | 'quiz' | 'savedQuiz' | 'idioms' | 'phrases' | 'review'>('sprint');
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ielts_saved_vocab_ids');
      if (saved) return JSON.parse(saved);
    } catch {}
    return ['vc_w1', 'vc_w2', 'vc_w3', 'vc_w4', 'vc_w5'];
  });

  const handleToggleSave = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSavedIds((prev) => {
      const exists = prev.includes(id);
      const updated = exists ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem('ielts_saved_vocab_ids', JSON.stringify(updated));
      } catch {}
      if (exists) {
        soundManager.playBeep(450, 0.05);
        if (onShowToast) onShowToast('Removed from Saved Vocab List');
      } else {
        soundManager.playSuccess();
        if (onShowToast) onShowToast('Saved to Vocab Quiz List!');
      }
      return updated;
    });
  };
  const [viewMode, setViewMode] = useState<'card' | 'list' | 'quiz'>('card');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'word' | 'phrase' | 'idiom'>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [selectedLevel, setSelectedLevel] = useState<'all' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pronouncingItem, setPronouncingItem] = useState<string | null>(null);
  const [audioPlaybackState, setAudioPlaybackState] = useState<AudioPlaybackState>(audioService.getState());

  const [selectedDetailCard, setSelectedDetailCard] = useState<VocabCard | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedDetailCard(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const unsub = audioService.subscribe((s) => {
      setAudioPlaybackState(s);
      if (!s.isPlaying && !s.isLoading) {
        setPronouncingItem(null);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('ielts_vocab_cards_v5', JSON.stringify(cards));
    } catch {}
  }, [cards]);

  const topics = [
    'All',
    'Academic English',
    'Everyday & Lifestyle',
    'IELTS Speaking',
    'IELTS Writing',
    'IELTS Reading',
    'IELTS Listening',
    'Education',
    'Environment & Climate',
    'Technology & AI',
    'Health & Medicine',
    'Science',
    'Society & Relationships',
    'Government & Law',
    'Economy & Work',
    'Travel & Globalisation',
    'Culture & Media',
    'Crime, Law & Governance',
    'Food & Nutrition',
    'Cities & Nature'
  ];

  const difficultyLevels: { id: 'all' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'; label: string; desc: string }[] = [
    { id: 'all', label: 'সব লেভেল', desc: 'All' },
    { id: 'A2', label: 'A2', desc: 'Elem' },
    { id: 'B1', label: 'B1', desc: 'Inter' },
    { id: 'B2', label: 'B2', desc: 'Band 6.5–7.0' },
    { id: 'C1', label: 'C1', desc: 'Band 7.5–8.0' },
    { id: 'C2', label: 'C2', desc: 'Band 8.5–9.0' }
  ];

  const filteredCards = cards.filter((c) => {
    const matchCategory = selectedCategory === 'all' || c.category === selectedCategory;
    const matchLevel = selectedLevel === 'all' || c.cefr === selectedLevel;
    const matchTopic =
      selectedTopic === 'All' ||
      c.topic.toLowerCase().includes(selectedTopic.toLowerCase()) ||
      selectedTopic.toLowerCase().includes(c.topic.toLowerCase()) ||
      selectedTopic
        .toLowerCase()
        .split(/[&, ]+/)
        .some((part) => part.length > 3 && c.topic.toLowerCase().includes(part));

    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      c.item.toLowerCase().includes(q) ||
      c.banglaMeaning.toLowerCase().includes(q) ||
      (c.banglaExplanation && c.banglaExplanation.toLowerCase().includes(q)) ||
      (c.banglaPronunciation && c.banglaPronunciation.toLowerCase().includes(q)) ||
      (c.beginnerPhrase && c.beginnerPhrase.toLowerCase().includes(q)) ||
      c.definition.toLowerCase().includes(q) ||
      (c.exampleSentence && c.exampleSentence.toLowerCase().includes(q));

    return matchCategory && matchLevel && matchTopic && matchSearch;
  });

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedTopic('All');
    setSelectedLevel('all');
    setSearchQuery('');
    setCurrentIndex(0);
    setIsFlipped(false);
    soundManager.playBeep(500, 0.05);
  };

  const hasActiveFilters =
    selectedCategory !== 'all' || selectedTopic !== 'All' || selectedLevel !== 'all' || !!searchQuery.trim();

  // Clamp index if filtered list changes
  const activeCard = filteredCards[currentIndex] || filteredCards[0];

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    soundManager.playBeep(isFlipped ? 500 : 700, 0.08);
  };

  const nextCard = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % (filteredCards.length || 1));
  };

  const prevCard = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + filteredCards.length) % (filteredCards.length || 1));
  };

  const toggleMastery = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCards((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const nextState = !c.mastered;
          if (nextState) soundManager.playSuccess();
          else soundManager.playBeep(450, 0.05);
          return { ...c, mastered: nextState };
        }
        return c;
      })
    );
  };

  const handlePronounce = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    stopSpeech();
    setPronouncingItem(text);
    speakBritish(text, {
      onEnd: () => setPronouncingItem(null),
      onError: () => setPronouncingItem(null)
    });
    soundManager.playBeep(560, 0.06);
  };

  const handleCopyCard = (card: VocabCard, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const textToCopy = `${card.item} (${card.cefr})
বাংলা উচ্চারণ: [${card.banglaPronunciation || card.item}]
বাংলা অর্থ: ${card.banglaMeaning}
সংজ্ঞা: ${card.definition}
উদাহরণ: "${card.exampleSentence}"`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedId(card.id);
      setTimeout(() => setCopiedId(null), 2200);
      onShowToast(`Copied "${card.item}" with Bangla meaning!`);
      soundManager.playSuccess();
    }
  };

  const handleSendToVault = (card: VocabCard, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    addMistake({
      module: 'vocab',
      title: `${card.item} (${card.banglaMeaning})`,
      userAnswer: card.beginnerPhrase ? `Replaces: ${card.beginnerPhrase}` : 'Need to practice for IELTS',
      correctAnswer: card.exampleSentence,
      explanation: `${card.banglaMeaning} — ${card.banglaExplanation || card.definition}`
    });
    onShowToast(`Saved "${card.item}" to Mistake Vault for active recall!`);
    soundManager.playSuccess();
  };

  const masteredCount = cards.filter((c) => c.mastered).length;
  const c1c2MasteredCount = cards.filter((c) => c.mastered && (c.cefr === 'C1' || c.cefr === 'C2')).length;
  const wordCount = cards.filter((c) => c.category === 'word').length;
  const phraseCount = cards.filter((c) => c.category === 'phrase').length;
  const idiomCount = cards.filter((c) => c.category === 'idiom').length;
  const reviewDueCount = cards.filter((c) => !c.mastered).length;
  const todayTarget = 18;
  const todayCompleted = Math.min(todayTarget, cards.filter((c) => c.mastered).length % 18 || 7);

  return (
    <div className="w-full max-w-full space-y-6 animate-fadeIn pb-12 overflow-x-hidden">
      {/* Universal Vocab Sprint Header with Progress & 5 Primary Segment Tabs */}
      <VocabSprintHeader
        todayCompleted={todayCompleted}
        todayTarget={todayTarget}
        reviewDueCount={reviewDueCount}
        masteredCount={masteredCount}
        totalCards={cards.length}
        weakAreaNote="Academic Collocations & Linking Fillers"
        onStartSprint={() => setActiveTab('sprint')}
        onStartReview={() => setActiveTab('review')}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'idioms') setSelectedCategory('idiom');
          else if (tab === 'phrases') setSelectedCategory('phrase');
          else if (tab === 'vocab') setSelectedCategory('all');
        }}
      />

      {/* Local Top 5 Learner Board (Persisted in localStorage) */}
      <VocabLearnerBoard
        masteredCount={masteredCount}
        c1c2MasteredCount={c1c2MasteredCount}
        totalCards={cards.length}
        onStartQuiz={() => setActiveTab('quiz')}
        onStartSprint={() => setActiveTab('sprint')}
        onShowToast={onShowToast}
      />

      {/* 1. TODAY'S SPRINT VIEW */}
      {activeTab === 'sprint' && (
        <VocabSprintView
          cards={cards}
          onToggleMastery={toggleMastery}
          onSendToVault={handleSendToVault}
          onShowToast={onShowToast}
          onFinishSprint={() => {
            setActiveTab('vocab');
            onShowToast("🏆 Great job! Today's Sprint completed.");
          }}
        />
      )}

      {/* 2. DEDICATED IDIOMS VIEW */}
      {activeTab === 'idioms' && (
        <IdiomsView
          idioms={cards.filter((c) => c.category === 'idiom')}
          onToggleMastery={toggleMastery}
          onSendToVault={handleSendToVault}
          onCopy={handleCopyCard}
          copiedId={copiedId}
        />
      )}

      {/* 3. DEDICATED PHRASES VIEW */}
      {activeTab === 'phrases' && (
        <PhrasesView
          phrases={cards.filter((c) => c.category === 'phrase')}
          onToggleMastery={toggleMastery}
          onSendToVault={handleSendToVault}
          onCopy={handleCopyCard}
          copiedId={copiedId}
        />
      )}

      {/* 4. SPACED REVIEW SESSION */}
      {activeTab === 'review' && (
        <ReviewSessionView
          cards={cards}
          onToggleMastery={toggleMastery}
          onShowToast={onShowToast}
          onExitReview={() => setActiveTab('vocab')}
        />
      )}

      {/* 5. SAVED VOCAB BANGLA-TO-ENGLISH QUIZ VIEW */}
      {activeTab === 'savedQuiz' && (
        <SavedVocabBanglaQuiz
          allCards={cards}
          savedIds={savedIds}
          onToggleSave={handleToggleSave}
          onToggleMastery={toggleMastery}
          onShowToast={onShowToast}
        />
      )}

      {/* 6. DEDICATED C1/C2 FLASHCARD QUIZ VIEW */}
      {activeTab === 'quiz' && (
        <C1C2FlashcardQuiz
          cards={cards}
          onToggleMastery={toggleMastery}
          onSendToVault={handleSendToVault}
          onShowToast={onShowToast}
          onPronounce={handlePronounce}
        />
      )}

      {/* 6. GENERAL VOCABULARY & ALL ITEMS EXPLORER */}
      {activeTab === 'vocab' && (
        <div className="space-y-6">
          {/* ================= Native Mobile App Header Card ================= */}
          <div className="w-full bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* App Squircle Icon */}
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-md shrink-0 border border-white/20">
              <Sparkles className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse"></span>
                <span>শব্দ, বাক্যাংশ ও বাগধারা বাংলা অর্থসহ</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                Band 8+ Vocab, Collocations & Idioms
              </h2>
              <p className="text-xs text-slate-500 max-w-xl">
                প্রতিটি শব্দ ও বাগধারার স্পষ্ট বাংলা অর্থ, ব্রিটিশ উচ্চারণ, পরীক্ষায় ব্যবহারের নিয়ম ও সাধারণ ভুলের সমাধান।
              </p>
            </div>
          </div>

          {/* Right Status Stats & View Switcher */}
          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            {/* View Mode Toggle (Flashcard vs List vs C1/C2 Quiz) */}
            <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => {
                  setViewMode('card');
                  soundManager.playBeep(600, 0.04);
                }}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'card'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="3D Flip Flashcards"
              >
                <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                <span className="hidden sm:inline">ফ্ল্যাশ কার্ড</span>
              </button>

              <button
                onClick={() => {
                  setViewMode('list');
                  soundManager.playBeep(600, 0.04);
                }}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Searchable App Library Grid"
              >
                <Grid className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">তালিকা ভিউ</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('savedQuiz');
                  soundManager.playBeep(640, 0.04);
                }}
                className="px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200"
                title="Saved Vocabulary Bangla-to-English Practice Quiz"
              >
                <Bookmark className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                <span>সেভ করা কুইজ</span>
              </button>

              <button
                onClick={() => {
                  setViewMode('quiz');
                  soundManager.playBeep(620, 0.04);
                }}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'quiz'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Interactive C1/C2 Vocabulary & Bangla Meaning Flashcard Quiz"
              >
                <Award className={`w-3.5 h-3.5 ${viewMode === 'quiz' ? 'text-amber-300' : 'text-indigo-600'}`} />
                <span>C1/C2 কুইজ (Quiz)</span>
              </button>
            </div>

            {/* Mastered Progress Badge */}
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-2xl">
              <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-[9px] text-emerald-800 font-bold uppercase tracking-wider">মুখস্থ সম্পন্ন</div>
                <div className="text-xs font-mono font-black text-emerald-950">
                  {masteredCount}/{cards.length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="pt-2 flex flex-col md:flex-row gap-3 items-stretch">
          {/* Dual-Language Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentIndex(0);
              }}
              placeholder="ইংরেজি শব্দ বা বাংলা অর্থ দিয়ে খুঁজুন (e.g. Ubiquitous, হ্রাস করা, দোধারী তলোয়ার, mitigate)..."
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-slate-50/80"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Tabs with App Badges */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl overflow-x-auto border border-slate-200/80">
            {[
              { id: 'all', label: 'সব আইটেম', count: cards.length, icon: Layers },
              { id: 'word', label: 'উচ্চমানের শব্দ', count: wordCount, icon: BookOpen },
              { id: 'phrase', label: 'বাক্যাংশ', count: phraseCount, icon: Sparkles },
              { id: 'idiom', label: 'বাগধারা (Idiom)', count: idiomCount, icon: Lightbulb }
            ].map((cat) => {
              const Icon = cat.icon;
              const isCatActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id as any);
                    setCurrentIndex(0);
                    setIsFlipped(false);
                    soundManager.playBeep(600, 0.04);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                    isCatActive
                      ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isCatActive ? 'text-purple-600' : 'text-slate-400'}`} />
                  <span>{cat.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isCatActive ? 'bg-purple-100 text-purple-800' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 1. Difficulty Level Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-0.5">
          <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap shrink-0 flex items-center gap-1 font-mono uppercase">
            <Sliders className="w-3.5 h-3.5 text-purple-600" />
            লেভেল / Level:
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {difficultyLevels.map((lvl) => {
              const isLvlActive = selectedLevel === lvl.id;
              const count =
                lvl.id === 'all'
                  ? cards.length
                  : cards.filter((c) => c.cefr === lvl.id).length;
              return (
                <button
                  key={lvl.id}
                  onClick={() => {
                    setSelectedLevel(lvl.id);
                    setCurrentIndex(0);
                    setIsFlipped(false);
                    soundManager.playBeep(600, 0.04);
                  }}
                  className={`px-2.5 sm:px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1.5 border ${
                    isLvlActive
                      ? 'bg-purple-700 text-white border-purple-700 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{lvl.label}</span>
                  <span className={`text-[10px] ${isLvlActive ? 'text-purple-200' : 'text-slate-400'}`}>
                    ({lvl.desc})
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                      isLvlActive ? 'bg-purple-900/60 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Topic Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none">
          <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap shrink-0 flex items-center gap-1 font-mono uppercase">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            বিষয় / Topic:
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {topics.map((t) => {
              const isTopicActive = selectedTopic === t;
              return (
                <button
                  key={t}
                  onClick={() => {
                    setSelectedTopic(t);
                    setCurrentIndex(0);
                    setIsFlipped(false);
                    soundManager.playBeep(600, 0.04);
                  }}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition border ${
                    isTopicActive
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Filter Summary & Active Filter Tags / Reset Button */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500 gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="font-bold text-slate-800">
              {filteredCards.length} টি আইটেম পাওয়া গেছে
            </span>
            {hasActiveFilters && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {searchQuery && (
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-[10px] font-mono border border-purple-200 flex items-center gap-1">
                    খুঁজছেন: "{searchQuery}"
                    <button onClick={() => setSearchQuery('')} className="hover:text-purple-900">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                )}
                {selectedCategory !== 'all' && (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-mono border border-blue-200 flex items-center gap-1">
                    ক্যাটাগরি: {selectedCategory}
                    <button onClick={() => setSelectedCategory('all')} className="hover:text-blue-900">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                )}
                {selectedLevel !== 'all' && (
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-mono border border-emerald-200 flex items-center gap-1">
                    লেভেল: {selectedLevel}
                    <button onClick={() => setSelectedLevel('all')} className="hover:text-emerald-900">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                )}
                {selectedTopic !== 'All' && (
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md text-[10px] font-mono border border-amber-200 flex items-center gap-1">
                    বিষয়: {selectedTopic}
                    <button onClick={() => setSelectedTopic('All')} className="hover:text-amber-950">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 transition shrink-0 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200"
            >
              <RotateCcw className="w-3 h-3" />
              <span>ফিল্টার রিসেট</span>
            </button>
          )}
        </div>
      </div>

      {/* Empty State when no card matches filter */}
      {filteredCards.length === 0 && (
        <div className="w-full bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
            <Search className="w-7 h-7 text-amber-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">কোনো ফলাফল পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            আপনার নির্বাচিত ফিল্টার বা অনুসন্ধানের ("{searchQuery || selectedTopic || selectedLevel}") সাথে মেলে এমন কোনো শব্দ বা বাগধারা পাওয়া যায়নি।
          </p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition shadow-sm inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            সব ফিল্টার রিসেট করুন
          </button>
        </div>
      )}

      {/* ================= VIEW MODE 1: 3D FLASHCARD STAGE ================= */}
      {viewMode === 'card' && activeCard && (
        <div className="w-full max-w-2xl mx-auto space-y-4 min-w-0">
          <div onClick={handleFlip} className="perspective-1000 cursor-pointer min-h-[430px] w-full">
            <div
              className={`relative w-full h-[430px] rounded-3xl transition-transform duration-500 transform-style-3d shadow-lg ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
            >
              {/* FRONT OF CARD */}
              <div className="absolute inset-0 w-full h-full bg-white rounded-3xl border-2 border-slate-200 p-4 sm:p-8 flex flex-col justify-between backface-hidden">
                {/* Card Top bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 ${
                        activeCard.category === 'idiom'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : activeCard.category === 'phrase'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {activeCard.category === 'idiom' ? (
                        <>
                          <Lightbulb className="w-3 h-3 text-purple-700" />
                          <span>বাগধারা (Idiom)</span>
                        </>
                      ) : activeCard.category === 'phrase' ? (
                        <>
                          <Sparkles className="w-3 h-3 text-blue-700" />
                          <span>একাডেমিক বাক্যাংশ</span>
                        </>
                      ) : (
                        <>
                          <BookOpen className="w-3 h-3 text-emerald-700" />
                          <span>উচ্চমানের শব্দ</span>
                        </>
                      )}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">Topic: {activeCard.topic}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Bookmark for Quiz */}
                    <button
                      onClick={(e) => handleToggleSave(activeCard.id, e)}
                      className={`p-2 rounded-xl transition border shadow-2xs ${
                        savedIds.includes(activeCard.id)
                          ? 'bg-amber-50 text-amber-700 border-amber-300'
                          : 'text-slate-600 hover:text-amber-600 hover:bg-amber-50 border-slate-200'
                      }`}
                      title={savedIds.includes(activeCard.id) ? 'Remove from Saved Vocab List' : 'Bookmark/Save for Bangla Quiz'}
                    >
                      <Bookmark className={`w-4 h-4 ${savedIds.includes(activeCard.id) ? 'fill-amber-500 text-amber-500' : ''}`} />
                    </button>

                    {/* Audio pronunciation */}
                    <button
                      onClick={(e) => handlePronounce(activeCard.item, e)}
                      className="p-2 rounded-xl text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition border border-slate-200 shadow-2xs"
                      title="Listen to British Pronunciation"
                    >
                      <Volume2 className="w-4 h-4 text-blue-600" />
                    </button>

                    {/* Copy button */}
                    <button
                      onClick={(e) => handleCopyCard(activeCard, e)}
                      className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition border border-slate-200 shadow-2xs"
                      title="Copy Term & Bangla Meaning"
                    >
                      {copiedId === activeCard.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    {/* Save to Mistake Vault button */}
                    <button
                      onClick={(e) => handleSendToVault(activeCard, e)}
                      className="p-2 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition border border-slate-200 shadow-2xs"
                      title="Save to Mistake Vault for Active Practice"
                    >
                      <Archive className="w-4 h-4 text-rose-500" />
                    </button>

                    {/* Toggle Mastered */}
                    <button
                      onClick={(e) => toggleMastery(activeCard.id, e)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                        activeCard.mastered
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {activeCard.mastered ? '✓ Mastered' : 'Mark Mastered'}
                    </button>
                  </div>
                </div>

                {/* Card Center Content */}
                <div className="text-center my-auto space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                      {activeCard.category === 'idiom'
                        ? 'Practice Band 8.0 Idiom'
                        : activeCard.partOfSpeech
                        ? `${activeCard.partOfSpeech} · Band 8.5+`
                        : 'High-Yield Practice Term'}
                    </span>
                    {activeCard.cefr && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono font-bold">
                        CEFR {activeCard.cefr}
                      </span>
                    )}
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    "{activeCard.item}"
                  </h3>

                  {/* Visual Frequency Waveform during pronunciation */}
                  {(pronouncingItem === activeCard.item || (audioPlaybackState.isPlaying && pronouncingItem === activeCard.item)) && (
                    <div className="flex justify-center py-1 animate-fade-in">
                      <AudioPlaybackWaveform
                        isPlaying={audioPlaybackState.isPlaying}
                        isLoading={audioPlaybackState.isLoading}
                        height={28}
                        barCount={20}
                        showLabel={true}
                        label={audioPlaybackState.isLoading ? 'Buffering Pronunciation...' : 'British RP Voice'}
                      />
                    </div>
                  )}

                  {/* Bangla Phonetic Pronunciation */}
                  {activeCard.banglaPronunciation && (
                    <div className="text-xs font-mono text-purple-700 font-semibold">
                      উচ্চারণ: [{activeCard.banglaPronunciation}]
                    </div>
                  )}

                  {/* PROMINENT BANGLA MEANING CALLOUT BADGE */}
                  <div className="inline-block px-4 py-2.5 rounded-2xl bg-amber-50/90 border border-amber-300 text-amber-950 font-bold text-sm sm:text-base shadow-xs max-w-lg">
                    <span className="text-amber-800 text-xs mr-1 font-mono uppercase font-bold">বাংলা অর্থ:</span>
                    <span className="text-slate-900 font-extrabold">{activeCard.banglaMeaning}</span>
                  </div>

                  {activeCard.beginnerPhrase && (
                    <p className="text-xs text-slate-400">
                      সাধারণ শব্দের উন্নত বিকল্প: <span className="font-semibold text-rose-600 line-through">"{activeCard.beginnerPhrase}"</span>
                    </p>
                  )}
                </div>

                {/* Card Bottom hint */}
                <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-3">
                  <span className="font-mono">
                    কার্ড {currentIndex + 1} / {filteredCards.length}
                  </span>
                  <span className="flex items-center gap-1.5 font-bold text-purple-700">
                    <RotateCw className="w-3.5 h-3.5" /> উল্টে অর্থ ও উদাহরণ দেখতে ক্লিক করুন
                  </span>
                </div>
              </div>

              {/* BACK OF CARD (Definition, Detailed Bangla Usage, Example) - Bright High-Contrast Styling */}
              <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-white via-indigo-50/60 to-purple-50/60 text-slate-900 rounded-3xl border-2 border-indigo-300 p-5 sm:p-7 flex flex-col justify-between backface-hidden rotate-y-180 shadow-xl overflow-y-auto">
                {/* Back Top Bar */}
                <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold font-mono">
                      CEFR {activeCard.cefr} · Band 8.5+
                    </span>
                    {activeCard.ieltsSkill && (
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 text-xs font-medium">
                        {activeCard.ieltsSkill}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => handlePronounce(activeCard.exampleSentence, e)}
                      className="p-2 rounded-xl text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100 transition border border-indigo-200 bg-indigo-50/80 shadow-2xs"
                      title="Read Example Sentence Aloud"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => toggleMastery(activeCard.id, e)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold border transition ${
                        activeCard.mastered
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {activeCard.mastered ? '✓ Mastered' : 'Mark Mastered'}
                    </button>
                  </div>
                </div>

                {/* Back Center Body */}
                <div className="space-y-3 my-auto py-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                      "{activeCard.item}"
                    </h3>
                  </div>

                  {/* Bangla Meaning Callout */}
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-slate-900 text-xs sm:text-sm font-medium space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900 text-[11px] uppercase font-mono">
                        বাংলা অর্থ ও ব্যবহারের নিয়ম:
                      </span>
                      {activeCard.banglaPronunciation && (
                        <span className="text-[10px] text-purple-700 font-mono font-semibold">
                          [{activeCard.banglaPronunciation}]
                        </span>
                      )}
                    </div>
                    <div className="font-extrabold text-slate-900 text-sm sm:text-base">{activeCard.banglaMeaning}</div>
                    {activeCard.banglaExplanation && (
                      <p className="text-[11px] text-slate-700 leading-relaxed pt-0.5">
                        {activeCard.banglaExplanation}
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    <strong className="text-slate-900 font-bold">Definition:</strong> {activeCard.definition}
                  </p>

                  {/* Example sentence */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-serif italic text-slate-800 leading-relaxed">
                    "{activeCard.exampleSentence}"
                  </div>

                  {/* Visual Frequency Waveform during example pronunciation */}
                  {(pronouncingItem === activeCard.exampleSentence || (audioPlaybackState.isPlaying && pronouncingItem === activeCard.exampleSentence)) && (
                    <div className="flex justify-center py-1 animate-fade-in">
                      <AudioPlaybackWaveform
                        isPlaying={audioPlaybackState.isPlaying}
                        isLoading={audioPlaybackState.isLoading}
                        height={26}
                        barCount={18}
                        showLabel={true}
                        label={audioPlaybackState.isLoading ? 'Buffering Example...' : 'British Audio Example'}
                      />
                    </div>
                  )}

                  {/* Synonyms & Antonyms */}
                  {((activeCard.synonyms && activeCard.synonyms.length > 0) || (activeCard.antonyms && activeCard.antonyms.length > 0)) && (
                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-700 pt-1">
                      {activeCard.synonyms && activeCard.synonyms.length > 0 && (
                        <span>
                          <strong className="text-emerald-700 font-bold">Synonyms:</strong> {activeCard.synonyms.slice(0, 4).join(', ')}
                        </span>
                      )}
                      {activeCard.antonyms && activeCard.antonyms.length > 0 && (
                        <span>
                          <strong className="text-rose-700 font-bold">Antonyms:</strong> {activeCard.antonyms.slice(0, 3).join(', ')}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Collocations */}
                  {activeCard.collocations && activeCard.collocations.length > 0 && (
                    <div className="flex flex-wrap gap-1 text-[10px] pt-1">
                      <span className="font-bold text-slate-700 font-mono">Collocations:</span>
                      {activeCard.collocations.map((col, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-medium">
                          {col}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Common Mistakes & Warnings */}
                  {activeCard.commonMistakes && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-800 leading-snug">
                      <strong className="text-rose-900 font-bold">⚠️ সতর্কতা / Warning:</strong> {activeCard.commonMistakes}
                    </div>
                  )}

                  {/* IELTS Usage Advice */}
                  {activeCard.ieltsUsage && (
                    <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-[11px] text-indigo-900 leading-snug">
                      <strong className="text-indigo-950 font-bold">🎯 IELTS Band 8+ Usage:</strong> {activeCard.ieltsUsage}
                    </div>
                  )}
                </div>

                {/* Back Bottom bar */}
                <div className="flex items-center justify-between text-xs text-slate-400 border-t border-indigo-100 pt-3">
                  <span className="text-slate-500 font-medium">Topic: {activeCard.topic}</span>
                  <span className="flex items-center gap-1 font-bold text-indigo-700 hover:text-indigo-900">
                    <RotateCw className="w-3.5 h-3.5" /> উল্টাতে ক্লিক করুন (Flip Back)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              onClick={prevCard}
              className="px-4 sm:px-5 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center gap-1.5 transition shadow-xs active:scale-95 min-h-[44px] cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> আগের কার্ড (Previous)
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(640, 0.04);
                setSelectedDetailCard(activeCard);
              }}
              className="px-3.5 py-2 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold text-xs font-bengali flex items-center gap-1.5 transition shadow-xs active:scale-95 min-h-[44px] cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-purple-700" />
              <span>বিস্তারিত বিবরণ ও নিয়মাবলী</span>
            </button>

            <button
              onClick={nextCard}
              className="px-5 sm:px-6 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs active:scale-95 min-h-[44px] cursor-pointer"
            >
              পরবর্তী কার্ড (Next) <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= VIEW MODE 2: COMPREHENSIVE APP LIST GRID ================= */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCards.map((card, idx) => (
            <div
              key={card.id}
              className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition space-y-3.5 flex flex-col justify-between"
            >
              {/* Card Header with Badges & Action Buttons */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shadow-2xs ${
                      card.category === 'idiom'
                        ? 'bg-purple-100 text-purple-700'
                        : card.category === 'phrase'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {card.category === 'idiom' ? (
                      <Lightbulb className="w-4 h-4" />
                    ) : card.category === 'phrase' ? (
                      <Sparkles className="w-4 h-4" />
                    ) : (
                      <BookOpen className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase ${
                          card.category === 'idiom'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : card.category === 'phrase'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {card.category === 'idiom'
                          ? 'বাগধারা'
                          : card.category === 'phrase'
                          ? 'বাক্যাংশ'
                          : 'শব্দ'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{card.topic}</span>
                    </div>
                    <h3 className="font-extrabold text-base text-slate-900 tracking-tight mt-0.5">
                      {card.item}
                    </h3>
                  </div>
                </div>

                {/* Right Action Icons */}
                <div className="flex items-center gap-1.5">
                  {(pronouncingItem === card.item || (audioPlaybackState.isPlaying && pronouncingItem === card.item)) && (
                    <div className="animate-fade-in mr-1">
                      <AudioPlaybackWaveform
                        isPlaying={audioPlaybackState.isPlaying}
                        isLoading={audioPlaybackState.isLoading}
                        height={24}
                        barCount={10}
                        variant="compact"
                      />
                    </div>
                  )}
                  <button
                    onClick={(e) => handleToggleSave(card.id, e)}
                    className={`p-1.5 rounded-lg transition ${
                      savedIds.includes(card.id)
                        ? 'text-amber-600 bg-amber-50'
                        : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                    }`}
                    title={savedIds.includes(card.id) ? 'Remove from Saved' : 'Save/Bookmark for Quiz'}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${savedIds.includes(card.id) ? 'fill-amber-500 text-amber-500' : ''}`} />
                  </button>
                  <button
                    onClick={() => handlePronounce(card.item)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                    title="Pronounce"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleCopyCard(card)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                    title="Copy"
                  >
                    {copiedId === card.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleSendToVault(card)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Add to Vault"
                  >
                    <Archive className="w-3.5 h-3.5 text-rose-500" />
                  </button>
                  <button
                    onClick={() => toggleMastery(card.id)}
                    className={`p-1.5 rounded-lg transition ${
                      card.mastered
                        ? 'text-emerald-700 bg-emerald-50'
                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                    title={card.mastered ? 'Mastered' : 'Mark Mastered'}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Bangla Meaning Box */}
              <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/90 text-xs text-amber-950 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-amber-900">বাংলা অর্থ:</span>
                  {card.banglaPronunciation && (
                    <span className="text-[10px] text-purple-700 font-mono font-semibold">
                      [{card.banglaPronunciation}]
                    </span>
                  )}
                </div>
                <div className="font-bold text-slate-900 text-xs sm:text-sm">{card.banglaMeaning}</div>
                {card.banglaExplanation && (
                  <p className="text-[11px] text-slate-600 pt-0.5">{card.banglaExplanation}</p>
                )}
              </div>

              {/* English Definition & Example Sentence */}
              <div className="space-y-1.5 text-xs">
                <p className="text-slate-600 leading-relaxed">
                  <strong className="text-slate-900">Definition:</strong> {card.definition}
                </p>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-serif italic text-slate-700 text-[11px] leading-relaxed">
                  "{card.exampleSentence}"
                </div>

                {/* Collocations */}
                {card.collocations && card.collocations.length > 0 && (
                  <div className="flex flex-wrap gap-1 text-[10px] pt-1">
                    <span className="font-bold text-slate-500 font-mono">Collocations:</span>
                    {card.collocations.map((col, cIdx) => (
                      <span key={cIdx} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                        {col}
                      </span>
                    ))}
                  </div>
                )}

                {/* Common Mistakes & Warnings */}
                {card.commonMistakes && (
                  <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-[10px] text-rose-800 leading-snug">
                    <strong className="font-bold">⚠️ সতর্কতা / Warning:</strong> {card.commonMistakes}
                  </div>
                )}

                {/* IELTS Usage Advice */}
                {card.ieltsUsage && (
                  <div className="p-2 rounded-xl bg-purple-50 border border-purple-200 text-[10px] text-purple-900 leading-snug">
                    <strong className="font-bold">🎯 IELTS Usage:</strong> {card.ieltsUsage}
                  </div>
                )}
              </div>

              {/* Card Footer with Details Button & Beginner Comparison */}
              <div className="pt-2.5 border-t border-slate-150 flex items-center justify-between text-xs gap-2">
                <div className="text-[10px] text-slate-400">
                  {card.beginnerPhrase ? (
                    <span>
                      বিকল্প: <span className="line-through text-rose-600">"{card.beginnerPhrase}"</span>
                    </span>
                  ) : (
                    <span>CEFR {card.cefr || 'B2'}</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundManager.playBeep(640, 0.04);
                    setSelectedDetailCard(card);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold font-bengali flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs shrink-0"
                >
                  <BookOpen className="w-3.5 h-3.5 text-purple-700" />
                  <span>বিস্তারিত ও উচ্চারণ →</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= VIEW MODE 3: INTERACTIVE C1/C2 FLASHCARD QUIZ ================= */}
      {viewMode === 'quiz' && (
        <C1C2FlashcardQuiz
          cards={filteredCards.length >= 4 ? filteredCards : cards}
          onToggleMastery={toggleMastery}
          onSendToVault={handleSendToVault}
          onShowToast={onShowToast}
          onPronounce={handlePronounce}
        />
      )}

      {/* Empty Search State */}
      {filteredCards.length === 0 && viewMode !== 'quiz' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
          <p className="text-sm font-semibold">কোনো শব্দ, বাক্যাংশ বা বাগধারা খুঁজে পাওয়া যায়নি।</p>
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSelectedTopic('All');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-bold transition"
          >
            ফিল্টার রিসেট করুন
          </button>
        </div>
      )}
        </div>
      )}

      {/* ================= COMPREHENSIVE LEXICAL DETAILS MODAL ================= */}
      {selectedDetailCard && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedDetailCard(null);
          }}
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 space-y-4 shadow-2xl border-2 border-purple-200 relative my-auto animate-fade-in text-slate-900"
          >
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-150">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 text-xs font-mono font-black border border-purple-200">
                  {selectedDetailCard.cefr || 'B2'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-mono font-semibold">
                  {selectedDetailCard.category === 'idiom'
                    ? 'বাগধারা / Idiom'
                    : selectedDetailCard.category === 'phrase'
                    ? 'বাক্যাংশ / Collocation'
                    : 'উচ্চমানের শব্দ / Vocabulary'}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {selectedDetailCard.topic}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDetailCard(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition active:scale-95 cursor-pointer"
                title="Close dialog"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Word Header with Audio */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {selectedDetailCard.item}
                  </h2>
                  {selectedDetailCard.partOfSpeech && (
                    <span className="text-xs font-mono font-bold text-slate-400 italic">
                      ({selectedDetailCard.partOfSpeech.toLowerCase()})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handlePronounce(selectedDetailCard.item)}
                    className="p-2.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition shadow-2xs active:scale-95 cursor-pointer"
                    title="Listen to British Pronunciation"
                    aria-label="Listen to British Pronunciation"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyCard(selectedDetailCard)}
                    className="p-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition shadow-2xs active:scale-95 cursor-pointer"
                    title="Copy word and meaning"
                  >
                    {copiedId === selectedDetailCard.id ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendToVault(selectedDetailCard)}
                    className="p-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition shadow-2xs active:scale-95 cursor-pointer"
                    title="Add to Review Vault"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Bangla Pronunciation pill */}
              {selectedDetailCard.banglaPronunciation && (
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-purple-50 text-purple-800 text-xs font-semibold border border-purple-200 font-bengali">
                  <span>উচ্চারণ:</span>
                  <span className="font-bold">[{selectedDetailCard.banglaPronunciation}]</span>
                </div>
              )}

              {/* Audio playback animation */}
              {(pronouncingItem === selectedDetailCard.item || (audioPlaybackState.isPlaying && pronouncingItem === selectedDetailCard.item)) && (
                <div className="py-1 animate-fade-in">
                  <AudioPlaybackWaveform
                    isPlaying={audioPlaybackState.isPlaying}
                    isLoading={audioPlaybackState.isLoading}
                    height={26}
                    barCount={16}
                    showLabel={true}
                    label="British RP Audio Playing"
                  />
                </div>
              )}

              {/* Visual Concept Banner */}
              <VocabVisualBanner
                item={selectedDetailCard.item}
                topic={selectedDetailCard.topic}
                category={selectedDetailCard.category}
              />
            </div>

            {/* Details Content Scroll Area */}
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 text-xs sm:text-sm">
              {/* Highlighted Bangla Meaning Box */}
              <div className="p-4 rounded-2xl bg-amber-50/90 border-2 border-amber-300 text-slate-900 shadow-2xs space-y-1.5">
                <div className="font-mono text-[11px] uppercase font-bold text-amber-900 flex items-center justify-between">
                  <span>বাংলা অর্থ ও ব্যাখ্যা:</span>
                  <span className="text-[10px] text-amber-700 font-sans">সহজ ভাষায়</span>
                </div>
                <div className="font-bengali text-base sm:text-lg font-bold text-slate-950 leading-relaxed">
                  {selectedDetailCard.banglaMeaning}
                </div>
                {selectedDetailCard.banglaExplanation && (
                  <p className="font-bengali text-xs sm:text-sm text-slate-800 leading-relaxed pt-1 border-t border-amber-200/80">
                    {selectedDetailCard.banglaExplanation}
                  </p>
                )}
              </div>

              {/* English Definition */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed">
                <strong className="text-slate-900 font-bold block mb-0.5 font-mono text-[10px] uppercase">
                  Practice Definition & Nuance:
                </strong>
                {selectedDetailCard.definition}
              </div>

              {/* Example in Context with Audio */}
              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold uppercase text-blue-800">
                    Practice Example Sentence
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePronounce(selectedDetailCard.exampleSentence)}
                    className="text-blue-700 hover:text-blue-900 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>শুনুন (Listen)</span>
                  </button>
                </div>
                <p className="text-slate-800 italic font-serif leading-relaxed text-xs sm:text-sm">
                  "{selectedDetailCard.exampleSentence}"
                </p>
              </div>

              {/* Upgrade everyday phrase */}
              {selectedDetailCard.beginnerPhrase && (
                <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 text-xs space-y-0.5">
                  <div className="font-bold text-[10px] uppercase font-mono text-emerald-800">
                    🎯 সাধারণ শব্দের উন্নত Band 8+ বিকল্প:
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="line-through text-rose-600 font-medium">"{selectedDetailCard.beginnerPhrase}"</span>
                    <span className="text-slate-400">→</span>
                    <span className="text-emerald-900 font-bold font-mono text-xs sm:text-sm">"{selectedDetailCard.item}"</span>
                  </div>
                </div>
              )}

              {/* Collocations */}
              {selectedDetailCard.collocations && selectedDetailCard.collocations.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-500 block">
                    High-Frequency Academic Collocations:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDetailCard.collocations.map((col, cIdx) => (
                      <span
                        key={cIdx}
                        className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 text-xs font-medium font-mono"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* IELTS Strategy */}
              {selectedDetailCard.ieltsUsage && (
                <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950 font-bengali text-xs leading-relaxed">
                  <strong className="text-indigo-800 font-bold block mb-0.5 font-sans text-[11px] uppercase font-mono">
                    🎯 IELTS Band 8+ পরীক্ষায় ব্যবহারের পরামর্শ:
                  </strong>
                  {selectedDetailCard.ieltsUsage}
                </div>
              )}

              {/* Warnings / Common Mistakes */}
              {selectedDetailCard.commonMistakes && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 font-bengali text-xs leading-relaxed">
                  <strong className="text-rose-800 font-bold block mb-0.5 font-sans text-[11px] uppercase font-mono">
                    ⚠️ পরীক্ষার্থীদের সাধারণ ভুল ও সতর্কতা:
                  </strong>
                  {selectedDetailCard.commonMistakes}
                </div>
              )}

              {/* Synonyms & Antonyms */}
              {((selectedDetailCard.synonyms && selectedDetailCard.synonyms.length > 0) || (selectedDetailCard.antonyms && selectedDetailCard.antonyms.length > 0)) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  {selectedDetailCard.synonyms && selectedDetailCard.synonyms.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="font-bold text-emerald-700 block mb-0.5 text-[10px] font-mono uppercase">
                        Synonyms (সমার্থক শব্দ):
                      </span>
                      <span className="text-slate-800">{selectedDetailCard.synonyms.join(', ')}</span>
                    </div>
                  )}
                  {selectedDetailCard.antonyms && selectedDetailCard.antonyms.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="font-bold text-rose-700 block mb-0.5 text-[10px] font-mono uppercase">
                        Antonyms (বিপরীত শব্দ):
                      </span>
                      <span className="text-slate-800">{selectedDetailCard.antonyms.join(', ')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="pt-3 border-t border-slate-150 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => toggleMastery(selectedDetailCard.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 cursor-pointer border ${
                  selectedDetailCard.mastered
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 ${selectedDetailCard.mastered ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>{selectedDetailCard.mastered ? 'মুখস্থ সম্পন্ন (Mastered)' : 'মার্ক করুন (Mark Mastered)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDetailCard(null)}
                className="px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
              >
                বন্ধ করুন (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
