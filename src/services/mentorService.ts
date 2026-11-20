/**
 * Client-side service for the contextual 'Ask Mentor' feature in Reading & Listening labs.
 * Communicates exclusively with the server-side Gemini endpoint (/api/mentor/explain).
 */

export interface MentorExplanationRequest {
  module: 'reading' | 'listening';
  questionPrompt: string;
  questionType?: string;
  topic?: string;
  evidenceContext?: string;
  userAnswer?: string;
  correctAnswer?: string;
  trapNote?: string;
  customQuery?: string;
  isAnswerRevealed?: boolean;
}

export interface MentorLexicalTakeaway {
  term: string;
  meaning: string;
}

export interface MentorExplanationResponse {
  headline: string;
  stepByStepExplanation: string;
  distractorTrapAnalysis: string;
  keyConceptRule: string;
  lexicalTakeaways: MentorLexicalTakeaway[];
  banglaSummary: string;
  modelUsed: string;
  isAiPowered: boolean;
}

export async function requestMentorExplanation(
  payload: MentorExplanationRequest
): Promise<MentorExplanationResponse> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('ielts_sprint_session_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('/api/mentor/explain', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error || `Mentor request failed (${response.status})`);
  }

  return response.json();
}
