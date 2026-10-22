/**
 * IELTS Academic Collocations Database
 * High-yield Band 8.0-9.0 collocations for Writing Task 2 and Speaking Parts 2-3.
 * Divided into Verb+Noun, Adjective+Noun, and Adverb+Adjective.
 */

export interface CollocationItem {
  id: string;
  phrase: string;
  type: 'Verb + Noun' | 'Adjective + Noun' | 'Adverb + Adjective';
  meaning_bn: string;
  definition: string;
  ieltsExample: string;
  synonymAlternatives: string[];
  topic: 'Society & Culture' | 'Environment & Energy' | 'Technology & Science' | 'Education & Work' | 'Economy & Politics';
}

export const ACADEMIC_COLLOCATIONS: CollocationItem[] = [
  // Verb + Noun
  {
    id: 'col_1',
    phrase: 'pose a threat',
    type: 'Verb + Noun',
    meaning_bn: 'হুমকি বা বিপদের কারণ হওয়া',
    definition: 'To be a source of danger or potential harm to something.',
    ieltsExample: 'Uncontrolled industrial runoff poses a direct threat to local aquatic ecosystems.',
    synonymAlternatives: ['endanger', 'jeopardize', 'compromise'],
    topic: 'Environment & Energy'
  },
  {
    id: 'col_2',
    phrase: 'bridge the gap',
    type: 'Verb + Noun',
    meaning_bn: 'বৈষম্য বা দূরত্বের ব্যবধান কমানো',
    definition: 'To reduce differences or reconcile disparities between two opposing sides.',
    ieltsExample: 'Government scholarships aim to bridge the gap between affluent and underprivileged students.',
    synonymAlternatives: ['narrow the divide', 'reconcile disparities'],
    topic: 'Education & Work'
  },
  {
    id: 'col_3',
    phrase: 'shoulder responsibility',
    type: 'Verb + Noun',
    meaning_bn: 'দায়িত্ব নিজের কাঁধে নেওয়া',
    definition: 'To accept and bear an important duty or financial burden.',
    ieltsExample: 'Multinational corporations must shoulder the financial responsibility for carbon offsets.',
    synonymAlternatives: ['assume accountability', 'bear the onus'],
    topic: 'Society & Culture'
  },
  {
    id: 'col_4',
    phrase: 'stimulate economic growth',
    type: 'Verb + Noun',
    meaning_bn: 'অর্থনৈতিক প্রবৃদ্ধি ত্বরান্বিত করা',
    definition: 'To encourage greater economic activity, investment, and productivity.',
    ieltsExample: 'Targeted infrastructure investment can stimulate sustainable economic growth in rural areas.',
    synonymAlternatives: ['catalyze growth', 'boost fiscal productivity'],
    topic: 'Economy & Politics'
  },
  {
    id: 'col_5',
    phrase: 'exercise caution',
    type: 'Verb + Noun',
    meaning_bn: 'সতর্কতা অবলম্বন করা',
    definition: 'To act with careful deliberation to avoid unforeseen risks.',
    ieltsExample: 'Policymakers ought to exercise extreme caution before deploying unregulated artificial intelligence in healthcare.',
    synonymAlternatives: ['act prudently', 'maintain vigilance'],
    topic: 'Technology & Science'
  },
  {
    id: 'col_6',
    phrase: 'exert influence',
    type: 'Verb + Noun',
    meaning_bn: 'প্রভাব বিস্তার করা',
    definition: 'To use power or authority to affect people or outcomes.',
    ieltsExample: 'Algorithmic advertising exerts a profound psychological influence on young consumers.',
    synonymAlternatives: ['wield impact', 'shape attitudes'],
    topic: 'Technology & Science'
  },

  // Adjective + Noun
  {
    id: 'col_7',
    phrase: 'stark contrast',
    type: 'Adjective + Noun',
    meaning_bn: 'তীব্র বা স্পষ্ট বৈপরীত্য',
    definition: 'An obvious, striking, and undeniable difference between two things.',
    ieltsExample: 'The lavish wealth of inner-city high-rises stands in stark contrast to suburban deprivation.',
    synonymAlternatives: ['sharp divergence', 'dramatic disparity'],
    topic: 'Society & Culture'
  },
  {
    id: 'col_8',
    phrase: 'pivotal role',
    type: 'Adjective + Noun',
    meaning_bn: 'মূল বা কেন্দ্রীয় ভূমিকা',
    definition: 'A crucial, central function upon which the success of something depends.',
    ieltsExample: 'Early childhood educators play a pivotal role in shaping emotional resilience.',
    synonymAlternatives: ['crucial factor', 'central function'],
    topic: 'Education & Work'
  },
  {
    id: 'col_9',
    phrase: 'insurmountable obstacle',
    type: 'Adjective + Noun',
    meaning_bn: 'অনতিক্রম্য বা বিরাট বাধা',
    definition: 'A barrier or difficulty that appears impossible to overcome.',
    ieltsExample: 'Exorbitant tuition fees present an insurmountable obstacle for candidates from impoverished backgrounds.',
    synonymAlternatives: ['prohibitive barrier', 'formidable hurdle'],
    topic: 'Education & Work'
  },
  {
    id: 'col_10',
    phrase: 'compelling evidence',
    type: 'Adjective + Noun',
    meaning_bn: 'অকাট্য বা জোরালো প্রমাণ',
    definition: 'Convincing, undeniable scientific or empirical proof.',
    ieltsExample: 'Climatologists have provided compelling evidence linking greenhouse emissions to glacier recession.',
    synonymAlternatives: ['conclusive proof', 'irrefutable data'],
    topic: 'Environment & Energy'
  },
  {
    id: 'col_11',
    phrase: 'pressing issue',
    type: 'Adjective + Noun',
    meaning_bn: 'অতীব জরুরি বা জ্বলন্ত সমস্যা',
    definition: 'A problem that demands urgent, immediate attention and remedial policy.',
    ieltsExample: 'Urban air degradation represents the most pressing issue facing modern developing metropolises.',
    synonymAlternatives: ['urgent dilemma', 'critical challenge'],
    topic: 'Environment & Energy'
  },

  // Adverb + Adjective
  {
    id: 'col_12',
    phrase: 'deeply ingrained',
    type: 'Adverb + Adjective',
    meaning_bn: 'গভীরভাবে প্রোথিত বা বদ্ধমূল',
    definition: 'Firmly fixed and difficult to change or eradicate.',
    ieltsExample: 'Gender stereotypes in patriarchal societies remain deeply ingrained in the cultural fabric.',
    synonymAlternatives: ['firmly entrenched', 'deep-rooted'],
    topic: 'Society & Culture'
  },
  {
    id: 'col_13',
    phrase: 'heavily subsidized',
    type: 'Adverb + Adjective',
    meaning_bn: 'ব্যাপকভাবে সরকারি আর্থিক অনুদানপ্রাপ্ত',
    definition: 'Supported with large monetary contributions from government or public institutions.',
    ieltsExample: 'Clean electric mass transit should be heavily subsidized to discourage private automobile usage.',
    synonymAlternatives: ['state-funded', 'financially underwritten'],
    topic: 'Economy & Politics'
  },
  {
    id: 'col_14',
    phrase: 'widely debated',
    type: 'Adverb + Adjective',
    meaning_bn: 'ব্যাপকভাবে আলোচিত ও বিতর্কিত',
    definition: 'Discussed extensively by academics and the general public with diverse viewpoints.',
    ieltsExample: 'Whether universities should prioritize stem curricula over humanities remains a widely debated topic.',
    synonymAlternatives: ['hotly contested', 'fiercely disputed'],
    topic: 'Education & Work'
  },
  {
    id: 'col_15',
    phrase: 'remarkably resilient',
    type: 'Adverb + Adjective',
    meaning_bn: 'অসাধারণভাবে ঘাতসহনশীল বা প্রতিকূলতা জয়কারী',
    definition: 'Able to recover quickly and withstand severe hardship or trauma.',
    ieltsExample: 'Indigenous ecosystems are remarkably resilient when granted protection from extractive mining.',
    synonymAlternatives: ['exceptionally robust', 'highly adaptable'],
    topic: 'Environment & Energy'
  }
];
