export interface ShadowingItem {
  id: string;
  category: 'part1_fluency' | 'part2_narrative' | 'part3_academic' | 'collocations_markers' | 'pronunciation_drills';
  topic: string;
  bandTarget: '7.0' | '7.5' | '8.0' | '8.5' | '9.0';
  targetSentence: string;
  focusTip: string;
  phoneticKeyWords: string[];
  intonationPattern: 'rising-falling' | 'falling' | 'listing-rising-falling';
  contextNote?: string;
  modelVoice?: 'speaker_04' | 'speaker_01' | 'speaker_02' | 'speaker_03';
}

export const SHADOWING_ITEMS: ShadowingItem[] = [
  // 1. Part 1: Fluency & Everyday Topics
  {
    id: 'shad_p1_01',
    category: 'part1_fluency',
    topic: 'Hometown & Urban Life',
    bandTarget: '8.0',
    targetSentence: 'To be completely honest, I live in a bustling metropolitan area that offers a remarkable variety of cultural amenities.',
    focusTip: 'Link "bustling" directly with "area", and emphasize the clear /m/ and /t/ in "metropolitan".',
    phoneticKeyWords: ['bustling', 'metropolitan', 'variety', 'amenities'],
    intonationPattern: 'rising-falling',
    contextNote: 'Part 1 intro question about your hometown.',
    modelVoice: 'speaker_04'
  },
  {
    id: 'shad_p1_02',
    category: 'part1_fluency',
    topic: 'Studies & Work Routine',
    bandTarget: '7.5',
    targetSentence: 'What fascinates me most about my profession is the opportunity to solve intricate problems collaboratively.',
    focusTip: 'Keep stress on the first syllable of "fascinates" and the second syllable of "collaboratively".',
    phoneticKeyWords: ['fascinates', 'profession', 'intricate', 'collaboratively'],
    intonationPattern: 'falling',
    contextNote: 'Part 1 question regarding what you like about your job or degree.',
    modelVoice: 'speaker_01'
  },
  {
    id: 'shad_p1_03',
    category: 'part1_fluency',
    topic: 'Leisure & Unwinding',
    bandTarget: '8.0',
    targetSentence: 'Whenever I find myself overwhelmed by deadlines, I usually recharge my batteries by going on brisk walks in the park.',
    focusTip: 'Notice the natural idiom "recharge my batteries" spoken without hesitation.',
    phoneticKeyWords: ['overwhelmed', 'deadlines', 'recharge', 'brisk'],
    intonationPattern: 'rising-falling',
    contextNote: 'Natural answer for how you relax on weekends.',
    modelVoice: 'speaker_02'
  },
  {
    id: 'shad_p1_04',
    category: 'part1_fluency',
    topic: 'Technology & Daily Life',
    bandTarget: '8.5',
    targetSentence: 'Smartphones have undeniably streamlined our everyday communication, although they can occasionally be somewhat distracting.',
    focusTip: 'Deliver "undeniably streamlined" smoothly with soft linking /r/ between our and everyday.',
    phoneticKeyWords: ['undeniably', 'streamlined', 'occasionally', 'distracting'],
    intonationPattern: 'rising-falling',
    contextNote: 'Expressing a balanced opinion in Part 1.',
    modelVoice: 'speaker_04'
  },
  {
    id: 'shad_p1_05',
    category: 'part1_fluency',
    topic: 'Transportation',
    bandTarget: '7.5',
    targetSentence: 'Public transit in my city is reasonably punctual, which spares me the frustration of navigating morning gridlock.',
    focusTip: 'Pronounce "punctual" with a crisp /tʃ/ sound, and stress "gridlock" on the first syllable.',
    phoneticKeyWords: ['reasonably', 'punctual', 'frustration', 'gridlock'],
    intonationPattern: 'falling',
    contextNote: 'Describing commuting habits.',
    modelVoice: 'speaker_03'
  },

  // 2. Part 2: Long Turn & Descriptive Narratives
  {
    id: 'shad_p2_01',
    category: 'part2_narrative',
    topic: 'Memorable Journey',
    bandTarget: '8.5',
    targetSentence: 'The moment we crested the ridge, we were greeted by a breathtaking panorama of snow-capped peaks illuminated by the morning sun.',
    focusTip: 'Use dynamic pacing: slow down slightly on "breathtaking panorama" to emphasize vivid imagery.',
    phoneticKeyWords: ['crested', 'breathtaking', 'panorama', 'illuminated'],
    intonationPattern: 'rising-falling',
    contextNote: 'Describing a scenic view in Part 2.',
    modelVoice: 'speaker_04'
  },
  {
    id: 'shad_p2_02',
    category: 'part2_narrative',
    topic: 'Admired Person',
    bandTarget: '8.0',
    targetSentence: 'What stands out most prominently about her character is her unwavering dedication to empowering disadvantaged children.',
    focusTip: 'Emphasize "prominently" and "unwavering" with steady, authoritative intonation.',
    phoneticKeyWords: ['prominently', 'unwavering', 'dedication', 'disadvantaged'],
    intonationPattern: 'falling',
    contextNote: 'Speaking about a mentor or influential person.',
    modelVoice: 'speaker_03'
  },
  {
    id: 'shad_p2_03',
    category: 'part2_narrative',
    topic: 'An Achievement',
    bandTarget: '8.5',
    targetSentence: 'Overcoming that initial hurdle required immense perseverance, but the sense of fulfillment afterwards was truly exhilarating.',
    focusTip: 'Link "required immense" naturally and articulate the /ks/ in "exhilarating" (/ɪɡˈzɪl.ə.reɪ.tɪŋ/).',
    phoneticKeyWords: ['hurdle', 'perseverance', 'fulfillment', 'exhilarating'],
    intonationPattern: 'rising-falling',
    contextNote: 'Concluding an achievement narrative in Part 2.',
    modelVoice: 'speaker_01'
  },
  {
    id: 'shad_p2_04',
    category: 'part2_narrative',
    topic: 'A Memorable Event',
    bandTarget: '8.0',
    targetSentence: 'Looking back on the experience, it fundamentally transformed my outlook on resilience and interpersonal relationships.',
    focusTip: 'Stress "fundamentally" on the third syllable and maintain clear sentence-final falling tone.',
    phoneticKeyWords: ['fundamentally', 'transformed', 'resilience', 'interpersonal'],
    intonationPattern: 'falling',
    contextNote: 'Reflecting on an experience in the conclusion of Part 2.',
    modelVoice: 'speaker_02'
  },

  // 3. Part 3: Academic & Abstract Discussion
  {
    id: 'shad_p3_01',
    category: 'part3_academic',
    topic: 'Artificial Intelligence & Labor',
    bandTarget: '9.0',
    targetSentence: 'While automation will undoubtedly displace repetitive manual tasks, it will simultaneously foster novel opportunities that necessitate nuanced human empathy.',
    focusTip: 'Master the contrast between "displace repetitive manual tasks" and "necessitate nuanced human empathy".',
    phoneticKeyWords: ['undoubtedly', 'displace', 'simultaneously', 'necessitate', 'empathy'],
    intonationPattern: 'rising-falling',
    contextNote: 'Part 3 complex perspective on technology and jobs.',
    modelVoice: 'speaker_04'
  },
  {
    id: 'shad_p3_02',
    category: 'part3_academic',
    topic: 'Environmental Sustainability',
    bandTarget: '8.5',
    targetSentence: 'Governmental subsidies should be redirected towards renewable infrastructure to mitigate irreversible ecological consequences.',
    focusTip: 'Keep rhythm measured: "subsidies" -> "renewable" -> "mitigate" -> "irreversible".',
    phoneticKeyWords: ['subsidies', 'redirected', 'mitigate', 'irreversible', 'ecological'],
    intonationPattern: 'falling',
    contextNote: 'Proposing policy solutions in Part 3.',
    modelVoice: 'speaker_03'
  },
  {
    id: 'shad_p3_03',
    category: 'part3_academic',
    topic: 'Cultural Heritage & Modernity',
    bandTarget: '9.0',
    targetSentence: 'Preserving tangible cultural landmarks is paramount because they serve as tangible anchors connecting modern generations to their collective past.',
    focusTip: 'Articulate the crisp /t/ and /g/ in "tangible" and the falling cadence on "collective past".',
    phoneticKeyWords: ['preserving', 'landmarks', 'paramount', 'tangible', 'collective'],
    intonationPattern: 'falling',
    contextNote: 'Discussing national heritage in Part 3.',
    modelVoice: 'speaker_04'
  },
  {
    id: 'shad_p3_04',
    category: 'part3_academic',
    topic: 'Education Systems',
    bandTarget: '8.5',
    targetSentence: 'Rote memorization ought to be superseded by experiential learning methodologies that nurture analytical inquiry.',
    focusTip: 'Pronounce "superseded" as /ˌsuː.pəˈsiː.dɪd/ and ensure "experiential" flows smoothly.',
    phoneticKeyWords: ['memorization', 'superseded', 'experiential', 'methodologies', 'inquiry'],
    intonationPattern: 'rising-falling',
    contextNote: 'Evaluating pedagogical methods in Part 3.',
    modelVoice: 'speaker_03'
  },

  // 4. Band 8-9 Collocations & Discourse Markers
  {
    id: 'shad_col_01',
    category: 'collocations_markers',
    topic: 'Expressing Nuanced Stance',
    bandTarget: '8.5',
    targetSentence: 'From my vantage point, it is imperative that policymakers take immediate, decisive action.',
    focusTip: 'Pause for a micro-beat after "vantage point" to establish confident Practice speaker rhythm.',
    phoneticKeyWords: ['vantage', 'imperative', 'policymakers', 'decisive'],
    intonationPattern: 'rising-falling',
    contextNote: 'Band 8+ starter phrase to introduce your opinion.',
    modelVoice: 'speaker_04'
  },
  {
    id: 'shad_col_02',
    category: 'collocations_markers',
    topic: 'Hedging & Conceding',
    bandTarget: '9.0',
    targetSentence: 'Having said that, one cannot overlook the potential ramifications of implementing such drastic measures.',
    focusTip: 'Deliver "Having said that" quickly as a cohesive discourse chunk, stressing "ramifications".',
    phoneticKeyWords: ['overlook', 'potential', 'ramifications', 'drastic'],
    intonationPattern: 'rising-falling',
    contextNote: 'Hedging or introducing a counter-argument.',
    modelVoice: 'speaker_04'
  },
  {
    id: 'shad_col_03',
    category: 'collocations_markers',
    topic: 'Comparing Perspectives',
    bandTarget: '8.5',
    targetSentence: 'On the one hand, traditional media maintains rigorous journalistic standards; on the other hand, digital platforms provide instantaneous accessibility.',
    focusTip: 'Use a listing intonation pattern: rise on "journalistic standards", fall on "instantaneous accessibility".',
    phoneticKeyWords: ['rigorous', 'journalistic', 'digital', 'instantaneous', 'accessibility'],
    intonationPattern: 'listing-rising-falling',
    contextNote: 'Demonstrating parallel complex sentence structures.',
    modelVoice: 'speaker_03'
  },
  {
    id: 'shad_col_04',
    category: 'collocations_markers',
    topic: 'Summarizing Complex Views',
    bandTarget: '8.5',
    targetSentence: 'To put it into perspective, striking a harmonious equilibrium between economic prosperity and social welfare remains indispensable.',
    focusTip: 'Pronounce "equilibrium" as /ˌek.wɪˈlɪb.ri.əm/ and "indispensable" cleanly.',
    phoneticKeyWords: ['perspective', 'harmonious', 'equilibrium', 'prosperity', 'indispensable'],
    intonationPattern: 'falling',
    contextNote: 'Masterful discourse conclusion.',
    modelVoice: 'speaker_04'
  },

  // 5. Targeted Pronunciation Drills
  {
    id: 'shad_pron_01',
    category: 'pronunciation_drills',
    topic: 'Consonant Clusters & Linked Speech',
    bandTarget: '8.0',
    targetSentence: 'Scientists frequently inspect six structured projects throughout their research cycles.',
    focusTip: 'Practice the /s/ and /kts/ consonant clusters in "inspect six structured projects".',
    phoneticKeyWords: ['scientists', 'frequently', 'inspect', 'structured', 'projects'],
    intonationPattern: 'falling',
    contextNote: 'Articulation workout for consonant clusters.',
    modelVoice: 'speaker_01'
  },
  {
    id: 'shad_pron_02',
    category: 'pronunciation_drills',
    topic: 'Weak Forms & Schwa Sounds',
    bandTarget: '8.5',
    targetSentence: 'The majority of the population would prefer to receive the information as soon as possible.',
    focusTip: 'Keep "of the" and "would prefer to" light with reduced schwa /ə/ vowels, focusing energy on key content words.',
    phoneticKeyWords: ['majority', 'population', 'prefer', 'information'],
    intonationPattern: 'rising-falling',
    contextNote: 'Rhythm and English stress-timing exercise.',
    modelVoice: 'speaker_02'
  }
];
