/**
 * IELTS Sprint - Centralized Speech Direction & Delivery System
 *
 * Defines typed delivery profiles for conversational, expressive, and context-appropriate speech synthesis.
 * Fully compatible with Edge Neural TTS prosody controls (rate, pitch, volume, natural punctuation pauses).
 */

export type SpeechDeliveryProfileId =
  | 'friendly_conversation'
  | 'polite_enquiry'
  | 'curious_question'
  | 'thoughtful_response'
  | 'uncertain_student'
  | 'confident_explanation'
  | 'warm_tour_guide'
  | 'academic_discussion'
  | 'formal_lecture'
  | 'vocabulary_coaching';

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
  friendly_conversation: {
    id: 'friendly_conversation',
    name: 'Friendly Conversation',
    description: 'Warm, natural conversational cadence for Part 1 social dialogue',
    rateOffsetPercent: -2,
    pitchOffsetHz: 1,
    commaPauseMs: 120,
    sentencePauseMs: 350,
    punctuationEnhancement: true
  },
  polite_enquiry: {
    id: 'polite_enquiry',
    name: 'Polite Enquiry',
    description: 'Courteous customer/applicant enquiry cadence',
    rateOffsetPercent: -2,
    pitchOffsetHz: 1,
    commaPauseMs: 120,
    sentencePauseMs: 360,
    punctuationEnhancement: true
  },
  curious_question: {
    id: 'curious_question',
    name: 'Curious Question',
    description: 'Inquiring, slightly rising inflection for student questions',
    rateOffsetPercent: -1,
    pitchOffsetHz: 2,
    commaPauseMs: 110,
    sentencePauseMs: 340,
    punctuationEnhancement: true
  },
  thoughtful_response: {
    id: 'thoughtful_response',
    name: 'Thoughtful Response',
    description: 'Measured, reflective cadence for answering complex prompts',
    rateOffsetPercent: -4,
    pitchOffsetHz: -1,
    commaPauseMs: 150,
    sentencePauseMs: 400,
    punctuationEnhancement: true
  },
  uncertain_student: {
    id: 'uncertain_student',
    name: 'Uncertain Student',
    description: 'Slightly slower, hesitant student response in seminar',
    rateOffsetPercent: -5,
    pitchOffsetHz: 1,
    commaPauseMs: 160,
    sentencePauseMs: 420,
    punctuationEnhancement: true
  },
  confident_explanation: {
    id: 'confident_explanation',
    name: 'Confident Explanation',
    description: 'Clear, authoritative explanation from an advisor or lead',
    rateOffsetPercent: -2,
    pitchOffsetHz: -1,
    commaPauseMs: 120,
    sentencePauseMs: 360,
    punctuationEnhancement: true
  },
  warm_tour_guide: {
    id: 'warm_tour_guide',
    name: 'Warm Tour Guide',
    description: 'Welcoming, clear presentation for Part 2 social monologues',
    rateOffsetPercent: -2,
    pitchOffsetHz: 1,
    commaPauseMs: 130,
    sentencePauseMs: 380,
    punctuationEnhancement: true
  },
  academic_discussion: {
    id: 'academic_discussion',
    name: 'Academic Discussion',
    description: 'Thoughtful, articulate dialogue for Part 3 academic seminars',
    rateOffsetPercent: -3,
    pitchOffsetHz: 0,
    commaPauseMs: 140,
    sentencePauseMs: 380,
    punctuationEnhancement: true
  },
  formal_lecture: {
    id: 'formal_lecture',
    name: 'Formal Lecture',
    description: 'Authoritative, measured Received Pronunciation for Part 4 academic lectures',
    rateOffsetPercent: -4,
    pitchOffsetHz: -2,
    commaPauseMs: 150,
    sentencePauseMs: 420,
    punctuationEnhancement: true
  },
  vocabulary_coaching: {
    id: 'vocabulary_coaching',
    name: 'Vocabulary Coaching',
    description: 'Upbeat, clear enunciation for Barnaby AI study buddy',
    rateOffsetPercent: 1,
    pitchOffsetHz: 2,
    commaPauseMs: 100,
    sentencePauseMs: 300,
    punctuationEnhancement: true
  }
};

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

  if (line.speakerId === 'speaker_barnaby' || lowerSpeaker.includes('barnaby')) {
    return 'vocabulary_coaching';
  }

  if (section === 4 || lowerRole.includes('lecture') || lowerRole.includes('examiner')) {
    return 'formal_lecture';
  }

  if (section === 2 || lowerRole.includes('tour') || lowerRole.includes('guide') || lowerRole.includes('social monologue')) {
    return 'warm_tour_guide';
  }

  const isQuestion = text.endsWith('?') || /^(what|where|when|why|how|who|can|could|would|is|are|do|does|did|shall|should|may)\b/i.test(text);

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

  return 'friendly_conversation';
}
