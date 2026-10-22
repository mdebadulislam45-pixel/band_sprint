/**
 * IELTS Speaking Band 9 Vault
 * Real Cambridge test topics across Part 1 (Short Q&A), Part 2 (Cue Card Monologues),
 * and Part 3 (Abstract In-depth Discussion) with British voice-ready transcripts.
 */

export interface SpeakingModelItem {
  id: string;
  part: 'Part 1' | 'Part 2' | 'Part 3';
  topic: string;
  promptOrCue: string;
  cuePoints?: string[];
  durationEstimate: string;
  bandScore: '9.0';
  modelAnswerTranscript: string;
  examinerNotes: string;
  highBandPhrases: { phrase: string; meaning_bn: string }[];
}

export const SPEAKING_MODEL_VAULT: SpeakingModelItem[] = [
  // Part 1
  {
    id: 'spk_1',
    part: 'Part 1',
    topic: 'Hometown & Urban Living',
    promptOrCue: 'What do you like most about your hometown?',
    durationEstimate: '45 seconds',
    bandScore: '9.0',
    modelAnswerTranscript:
      'What I find most captivating about my hometown is its vibrant juxtaposition of historical heritage and contemporary dynamism. On one hand, we have tranquil centuries-old Mughal architecture, yet within a short stroll, one encounters bustling tech hubs and eclectic street cafes. The local community also possesses an exceptionally welcoming warmth, which makes returning home after prolonged travels genuinely heartwarming.',
    examinerNotes:
      'Avoids simplistic one-sentence replies. Uses sophisticated lexical contrast ("vibrant juxtaposition", "contemporary dynamism") while sounding spontaneous and conversational.',
    highBandPhrases: [
      { phrase: 'Vibrant juxtaposition', meaning_bn: 'দুটি ভিন্ন বিষয়ের আকর্ষণীয় সহাবস্থান' },
      { phrase: 'Contemporary dynamism', meaning_bn: 'আধুনিক প্রাণচাঞ্চল্য ও গতিশীলতা' },
      { phrase: 'Prolonged travels', meaning_bn: 'দীর্ঘমেয়াদী সফর বা ভ্রমণ' }
    ]
  },
  {
    id: 'spk_2',
    part: 'Part 1',
    topic: 'Reading Habits',
    promptOrCue: 'Do you prefer reading physical books or electronic books?',
    durationEstimate: '40 seconds',
    bandScore: '9.0',
    modelAnswerTranscript:
      'To be completely honest, I have a profound sensory affection for physical paperbacks. There is an irreplaceable tactile satisfaction in flipping through textured pages and smelling fresh print. That being said, for daily commuting, I inevitably gravitate toward an e-reader purely for its unmatched portability and built-in dictionary capability.',
    examinerNotes:
      'Uses idiomatic hedging ("To be completely honest", "That being said") with sensory vocabulary ("tactile satisfaction", "textured pages").',
    highBandPhrases: [
      { phrase: 'Tactile satisfaction', meaning_bn: 'স্পর্শানুভূতিজাত পরম তৃপ্তি' },
      { phrase: 'Gravitate toward', meaning_bn: 'স্বভাবতই কোনো কিছুর প্রতি আকৃষ্ট হওয়া' },
      { phrase: 'Unmatched portability', meaning_bn: 'অতুলনীয় বহনযোগ্যতা' }
    ]
  },

  // Part 2 Cue Card
  {
    id: 'spk_3',
    part: 'Part 2',
    topic: 'An Influential Mentor',
    promptOrCue: 'Describe a teacher or mentor who had a profound influence on your life.',
    cuePoints: [
      'Who this individual was and how you met them',
      'What subject or discipline they taught you',
      'How their teaching methodology differed from conventional instructors',
      'And explain why their guidance made such a lasting impression on your worldview'
    ],
    durationEstimate: '2 minutes',
    bandScore: '9.0',
    modelAnswerTranscript:
      'I would like to speak about my high school literature tutor, Dr. Christopher, who fundamentally reshaped my intellectual trajectory.\n\nI first crossed paths with him during my sophomore year, an era when I regarded literature as merely an obligatory chore of memorizing historical dates. Dr. Christopher, however, possessed an extraordinary pedagogical flair. Rather than lecturing from dusty anthologies, he would transform the seminar room into a vibrant philosophical forum. He challenged us to dissect classic tragedies through the prism of contemporary geopolitical dilemmas and human psychology.\n\nWhat set his methodology apart was his relentless insistence on critical independent inquiry. He never accepted a superficial answer; instead, he would gently probe with provocative follow-up questions that compelled us to substantiate our arguments with concrete textual evidence.\n\nThe reason his mentorship left an indelible imprint on me is that he instilled an enduring intellectual curiosity. Beyond merely passing exams with flying colors, he taught me to question preconceived dogmas and appreciate nuanced perspectives. Even today, whenever I confront complex ethical decisions in my professional career, I often reflect on the analytical rigor he championed with such boundless passion.',
    examinerNotes:
      'Full 2-minute sustained narrative without repetition or hesitation. Exemplary fluency and cohesion with native rhetorical devices ("profound influence", "extraordinary pedagogical flair", "indelible imprint").',
    highBandPhrases: [
      { phrase: 'Intellectual trajectory', meaning_bn: 'বুদ্ধিবৃত্তিক অগ্রযাত্রার গতিপথ' },
      { phrase: 'Pedagogical flair', meaning_bn: 'শিক্ষাদানের অনন্য নৈপুণ্য ও মাধুর্য' },
      { phrase: 'Indelible imprint', meaning_bn: 'চিরস্থায়ী বা অমলিন ছাপ' },
      { phrase: 'Preconceived dogmas', meaning_bn: 'পূর্বনির্ধারিত অন্ধ বিশ্বাস বা সংস্কার' }
    ]
  },

  // Part 3
  {
    id: 'spk_4',
    part: 'Part 3',
    topic: 'Artificial Intelligence & Future Employment',
    promptOrCue: 'How might artificial intelligence alter the nature of professional careers in the coming decades?',
    durationEstimate: '1 minute',
    bandScore: '9.0',
    modelAnswerTranscript:
      'In my appraisal, artificial intelligence will likely act as a double-edged sword across global labor markets. On one front, routine cognitive tasks—such as administrative document drafting, financial data auditing, and basic legal discovery—will almost certainly become automated. This will undoubtedly cause short-term frictional unemployment for white-collar personnel.\n\nHowever, viewing this transformation through a broader socio-economic lens, AI is far more likely to augment rather than completely supplant human labor. Occupations requiring visceral empathy, high-stakes ethical judgment, and imaginative artistic vision will remain largely insulated. The real challenge for educational policymakers is to transition national curricula away from rote memorization toward adaptive problem-solving and emotional intelligence.',
    examinerNotes:
      'Demonstrates native-speaker fluency with academic discourse markers ("In my appraisal", "double-edged sword", "viewing through a broader socio-economic lens", "frictional unemployment").',
    highBandPhrases: [
      { phrase: 'Double-edged sword', meaning_bn: 'দুমুখো তলোয়ার (সুবিধা ও অসুবিধা উভয়ই)' },
      { phrase: 'Frictional unemployment', meaning_bn: 'সাময়িক পরিবর্তনকালীন বেকারত্ব' },
      { phrase: 'Supplant human labor', meaning_bn: 'মানুষের শ্রমকে সম্পূর্ণরূপে প্রতিস্থাপন করা' },
      { phrase: 'Visceral empathy', meaning_bn: 'গভীর ও আন্তরিক সহানুভূতি' }
    ]
  }
];
