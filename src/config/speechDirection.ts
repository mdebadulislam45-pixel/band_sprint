/**
 * BandSprint - Centralized Speech Direction & Delivery System
 *
 * Defines typed delivery profiles for conversational, expressive, and context-appropriate speech synthesis.
 * Fully compatible with Edge Neural TTS prosody controls (rate, pitch, volume, natural punctuation pauses).
 */

export type SpeechDeliveryProfileId =
  | 'examiner_question'
  | 'examiner_instruction'
  | 'natural_conversation'
  | 'listening_dialogue'
  | 'pronunciation_model'
  | 'vocabulary_example'
  | 'feedback_explanation'
  | 'friendly_conversation'
  | 'polite_enquiry'
  | 'curious_question'
  | 'thoughtful_response'
  | 'uncertain_student'
  | 'confident_explanation'
  | 'warm_tour_guide'
  | 'academic_discussion'
  | 'formal_lecture'
  | 'vocabulary_coaching'
  | 'barnaby_companion';

export interface SpeechDeliveryProfile {
  id: SpeechDeliveryProfileId;
  name: string;
  description: string;
  rateOffsetPercent: number;
  pitchOffsetHz: number;
  commaPauseMs: number;
  sentencePauseMs: number;
  punctuationEnhancement: boolean;
}

export const SPEECH_DELIVERY_PROFILES: Record<SpeechDeliveryProfileId, SpeechDeliveryProfile> = {
  examiner_question: {
    id: 'examiner_question',
    name: 'Examiner Question',
    description: 'Calm, articulate, formal British RP examiner question with measured sentence-final inquiry intonation',
    rateOffsetPercent: -4,
    pitchOffsetHz: 0,
    commaPauseMs: 145,
    sentencePauseMs: 400,
    punctuationEnhancement: true
  },
  examiner_instruction: {
    id: 'examiner_instruction',
    name: 'Examiner Instruction',
    description: 'Measured, authoritative, crystal-clear CD-IELTS rubric and part transition delivery',
    rateOffsetPercent: -5,
    pitchOffsetHz: 0,
    commaPauseMs: 155,
    sentencePauseMs: 430,
    punctuationEnhancement: true
  },
  natural_conversation: {
    id: 'natural_conversation',
    name: 'Natural Conversation',
    description: 'Composed, professional conversational delivery for IELTS Speaking Examiner turns',
    rateOffsetPercent: -3,
    pitchOffsetHz: 0,
    commaPauseMs: 135,
    sentencePauseMs: 380,
    punctuationEnhancement: true
  },
  listening_dialogue: {
    id: 'listening_dialogue',
    name: 'Listening Dialogue',
    description: 'Realistic multi-speaker IELTS Listening dialogue pacing with natural turn-taking rhythm',
    rateOffsetPercent: -3,
    pitchOffsetHz: 0,
    commaPauseMs: 135,
    sentencePauseMs: 380,
    punctuationEnhancement: true
  },
  pronunciation_model: {
    id: 'pronunciation_model',
    name: 'Pronunciation Model',
    description: 'Deliberate, high-clarity Received Pronunciation for lexical headwords and shadowing sentences',
    rateOffsetPercent: -6,
    pitchOffsetHz: 0,
    commaPauseMs: 165,
    sentencePauseMs: 440,
    punctuationEnhancement: true
  },
  vocabulary_example: {
    id: 'vocabulary_example',
    name: 'Vocabulary Example',
    description: 'Articulate academic sentence delivery highlighting lexical collocations in context',
    rateOffsetPercent: -4,
    pitchOffsetHz: 0,
    commaPauseMs: 145,
    sentencePauseMs: 400,
    punctuationEnhancement: true
  },
  feedback_explanation: {
    id: 'feedback_explanation',
    name: 'Feedback Explanation',
    description: 'Authoritative, constructive Senior IELTS Examiner assessment and band descriptor coaching',
    rateOffsetPercent: -4,
    pitchOffsetHz: 0,
    commaPauseMs: 145,
    sentencePauseMs: 400,
    punctuationEnhancement: true
  },
  friendly_conversation: {
    id: 'friendly_conversation',
    name: 'Friendly Conversation',
    description: 'Composed, courteous cadence for Part 1 social dialogue',
    rateOffsetPercent: -3,
    pitchOffsetHz: 0,
    commaPauseMs: 130,
    sentencePauseMs: 370,
    punctuationEnhancement: true
  },
  polite_enquiry: {
    id: 'polite_enquiry',
    name: 'Polite Enquiry',
    description: 'Courteous applicant/officer enquiry cadence',
    rateOffsetPercent: -3,
    pitchOffsetHz: 0,
    commaPauseMs: 130,
    sentencePauseMs: 375,
    punctuationEnhancement: true
  },
  curious_question: {
    id: 'curious_question',
    name: 'Curious Question',
    description: 'Inquiring academic inflection for seminar questions',
    rateOffsetPercent: -3,
    pitchOffsetHz: 1,
    commaPauseMs: 130,
    sentencePauseMs: 370,
    punctuationEnhancement: true
  },
  thoughtful_response: {
    id: 'thoughtful_response',
    name: 'Thoughtful Response',
    description: 'Measured, reflective cadence for answering complex prompts',
    rateOffsetPercent: -4,
    pitchOffsetHz: -1,
    commaPauseMs: 150,
    sentencePauseMs: 410,
    punctuationEnhancement: true
  },
  uncertain_student: {
    id: 'uncertain_student',
    name: 'Uncertain Student',
    description: 'Measured student response in academic seminar',
    rateOffsetPercent: -4,
    pitchOffsetHz: 0,
    commaPauseMs: 155,
    sentencePauseMs: 415,
    punctuationEnhancement: true
  },
  confident_explanation: {
    id: 'confident_explanation',
    name: 'Confident Explanation',
    description: 'Clear, authoritative explanation from a Senior Academic Tutor',
    rateOffsetPercent: -4,
    pitchOffsetHz: -1,
    commaPauseMs: 140,
    sentencePauseMs: 390,
    punctuationEnhancement: true
  },
  warm_tour_guide: {
    id: 'warm_tour_guide',
    name: 'Warm Tour Guide',
    description: 'Clear, formal public presentation for Part 2 monologues',
    rateOffsetPercent: -3,
    pitchOffsetHz: 0,
    commaPauseMs: 140,
    sentencePauseMs: 390,
    punctuationEnhancement: true
  },
  academic_discussion: {
    id: 'academic_discussion',
    name: 'Academic Discussion',
    description: 'Thoughtful, articulate dialogue for Part 3 academic seminars',
    rateOffsetPercent: -4,
    pitchOffsetHz: 0,
    commaPauseMs: 145,
    sentencePauseMs: 400,
    punctuationEnhancement: true
  },
  formal_lecture: {
    id: 'formal_lecture',
    name: 'Formal Lecture',
    description: 'Authoritative, measured Received Pronunciation for Part 4 academic lectures',
    rateOffsetPercent: -5,
    pitchOffsetHz: -2,
    commaPauseMs: 160,
    sentencePauseMs: 430,
    punctuationEnhancement: true
  },
  vocabulary_coaching: {
    id: 'vocabulary_coaching',
    name: 'Vocabulary Coaching',
    description: 'Authoritative, measured British RP Senior IELTS Examiner academic guidance',
    rateOffsetPercent: -4,
    pitchOffsetHz: -1,
    commaPauseMs: 145,
    sentencePauseMs: 400,
    punctuationEnhancement: true
  },
  barnaby_companion: {
    id: 'barnaby_companion',
    name: 'Barnaby Duo Mascot',
    description: 'Snappy, cheerful, witty Duolingo-style mascot cadence—upbeat, motivating, and crisp',
    rateOffsetPercent: 5,
    pitchOffsetHz: 2,
    commaPauseMs: 100,
    sentencePauseMs: 300,
    punctuationEnhancement: true
  }
};

const CLIENT_SPOKEN_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

/**
 * Normalizes raw text for natural, human-like British/Commonwealth IELTS speech synthesis:
 * - Expands titles & academic abbreviations (Prof., Dr., e.g., i.e., etc., vs., approx., dept., govt.)
 * - Formats currencies (£45.50 -> 45 pounds 50), British dates, 12h & 24h times, percentages, Band scores, and units
 * - Formats spelled-out letters, UK postcodes, and phone numbers with natural spoken grouping
 * - Preserves colons in ordinary text (never deletes text before a colon unless it is an explicit speaker tag)
 */
export function normalizeTextForNaturalSpeech(
  rawText: string,
  _deliveryProfile?: SpeechDeliveryProfileId
): string {
  if (!rawText) return '';
  return rawText
    .replace(/\[\s*(?:\d+|_+)\s*\]/g, ' ')
    .replace(/\bProf\.\s+/g, 'Professor ')
    .replace(/\bDr\.\s+/g, 'Doctor ')
    .replace(/\bMr\.\s+/g, 'Mister ')
    .replace(/\bMrs\.\s+/g, 'Missus ')
    .replace(/\bMs\.\s+/g, 'Miz ')
    .replace(/\be\.g\.,?\s*/gi, 'for example, ')
    .replace(/\bi\.e\.,?\s*/gi, 'that is, ')
    .replace(/\betc\.?(?=\s|$|[.,;!?])/gi, 'et cetera')
    .replace(/\bvs\.?\s+/gi, 'versus ')
    .replace(/\bapprox\.?\s+/gi, 'approximately ')
    .replace(/\bdept\.?\s+/gi, 'department ')
    .replace(/\bgovt\.?\s+/gi, 'government ')
    .replace(/£(\d+)\.(\d{2})\b/g, (_m, p: string, pence: string) =>
      pence === '00' ? `${p} pounds` : `${p} pounds ${pence}`
    )
    .replace(/£(\d+)\b/g, '$1 pounds')
    .replace(/\$(\d+)\.(\d{2})\b/g, (_m, d: string, cents: string) =>
      cents === '00' ? `${d} dollars` : `${d} dollars ${cents}`
    )
    .replace(/\$(\d+)\b/g, '$1 dollars')
    .replace(/€(\d+)\.(\d{2})\b/g, (_m, e: string, cents: string) =>
      cents === '00' ? `${e} euros` : `${e} euros ${cents}`
    )
    .replace(/€(\d+)\b/g, '$1 euros')
    .replace(/\b(0?[1-9]|[12]\d|3[01])\/(0?[1-9]|1[0-2])\/(19\d{2}|20\d{2})\b/g, (_m, d: string, mo: string, yr: string) => {
      const monthName = CLIENT_SPOKEN_MONTHS[parseInt(mo, 10) - 1] || mo;
      return `${parseInt(d, 10)} ${monthName} ${yr}`;
    })
    .replace(/\b(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)\b/gi, (_m, h: string, min: string, mer: string) =>
      min === '00' ? `${parseInt(h, 10)} ${mer}` : `${parseInt(h, 10)} ${min} ${mer}`
    )
    .replace(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g, (_m, h: string, min: string) => {
      const hourNum = parseInt(h, 10);
      return min === '00' ? `${hourNum} o'clock` : `${hourNum} ${min}`;
    })
    .replace(/\b(\d+(?:\.\d+)?)\s*[–—-]\s*(\d+(?:\.\d+)?)\s*%/g, '$1 to $2 percent')
    .replace(/\b(\d+(?:\.\d+)?)\s*%/g, '$1 percent')
    .replace(/\b(\d{2,4})\s*[–—]\s*(\d{2,4})\b/g, '$1 to $2')
    .replace(/\b(Band\s+)(\d)\.(\d)\b/gi, '$1$2 point $3')
    .replace(/\b(-?\d+(?:\.\d+)?)\s*°\s*C\b/g, '$1 degrees Celsius')
    .replace(/\b(-?\d+(?:\.\d+)?)\s*°\s*F\b/g, '$1 degrees Fahrenheit')
    .replace(/\b(\d+(?:\.\d+)?)\s*km\b/gi, '$1 kilometres')
    .replace(/\b(\d+(?:\.\d+)?)\s*m\b(?![a-zA-Z])/g, '$1 metres')
    .replace(/\b([A-Z])(?:-[A-Z]){2,}\b/g, (match) => match.split('-').join(', '))
    .replace(
      /\b([A-Z]{1,2})(\d{1,2}[A-Z]?)\s+(\d)([A-Z]{2})\b/g,
      (_m, area: string, district: string, sector: string, unit: string) =>
        `${area.split('').join(' ')} ${district}, ${sector} ${unit.split('').join(' ')}`
    )
    .replace(
      /\b(0\d{3,4})\s+(\d{3})(\d{3})\b/g,
      (_m, p1: string, p2: string, p3: string) =>
        `${p1.split('').join(' ')}, ${p2.split('').join(' ')}, ${p3.split('').join(' ')}`
    )
    .replace(/\s*—\s*/g, ', ')
    .replace(/\s*;\s*/g, '; ')
    .replace(/\.{3,}/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Infers the optimal SpeechDeliveryProfileId based on dialogue line context, speaker role, and section number.
 */
export function inferSpeechDeliveryProfile(
  line: { text: string; speaker?: string; speakerId?: string; role?: string },
  section?: number
): SpeechDeliveryProfileId {
  const text = (line.text || '').trim();
  const lowerText = text.toLowerCase();
  const lowerSpeaker = (line.speaker || '').toLowerCase();
  const lowerRole = (line.role || '').toLowerCase();

  if (line.speakerId === 'speaker_barnaby' || lowerSpeaker.includes('barnaby') || lowerRole.includes('companion')) {
    return 'barnaby_companion';
  }

  if (
    lowerRole.includes('vocab') ||
    lowerSpeaker.includes('vocab') ||
    /meaning:|definition:|example:|idiom:|phrase:/i.test(text)
  ) {
    return 'vocabulary_example';
  }

  if (text.split(/\s+/).length <= 3 && !text.endsWith('?')) {
    return 'pronunciation_model';
  }

  if (
    lowerText.startsWith('part ') ||
    lowerText.startsWith('section ') ||
    lowerText.includes('you will hear') ||
    lowerText.includes('you now have') ||
    lowerText.includes('first, you have some time')
  ) {
    return 'examiner_instruction';
  }

  const isQuestion =
    text.endsWith('?') ||
    /^(what|where|when|why|how|who|can|could|would|is|are|do|does|did|shall|should|may)\b/i.test(text);

  const isExaminer =
    line.speakerId === 'speaker_04' ||
    line.speakerId === 'speaker_05' ||
    line.speakerId === 'speaker_uk_northern_m' ||
    line.speakerId === 'speaker_uk_northern_f' ||
    line.speakerId === 'speaker_uk_scottish_m' ||
    line.speakerId === 'speaker_uk_scottish_f' ||
    lowerRole.includes('examiner') ||
    lowerSpeaker.includes('examiner');

  if (isExaminer) {
    return isQuestion ? 'examiner_question' : 'examiner_instruction';
  }

  if (section === 4 || lowerRole.includes('lecture')) {
    return 'formal_lecture';
  }

  if (section === 2 || lowerRole.includes('tour') || lowerRole.includes('guide') || lowerRole.includes('social monologue')) {
    return 'warm_tour_guide';
  }

  if (section === 3 || lowerRole.includes('tutor') || lowerRole.includes('seminar') || lowerRole.includes('student')) {
    if (lowerRole.includes('tutor') || lowerRole.includes('prof') || lowerRole.includes('dr.')) {
      return isQuestion ? 'curious_question' : 'confident_explanation';
    }
    if (/\b(well|actually|maybe|i think|i am not sure|perhaps|probably)\b/i.test(lowerText)) {
      return 'uncertain_student';
    }
    if (isQuestion) {
      return 'curious_question';
    }
    return 'academic_discussion';
  }

  // Part 1 / General
  if (isQuestion) {
    return lowerText.length < 40 ? 'curious_question' : 'polite_enquiry';
  }

  if (/\b(well|actually|indeed|yes|sure|certainly|i see|that is right)\b/i.test(lowerText)) {
    return 'friendly_conversation';
  }

  return 'listening_dialogue';
}
