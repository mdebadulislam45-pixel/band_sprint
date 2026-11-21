/**
 * IELTS SPRINT — GRAMMAR FEEDBACK ENGINE
 * Service layer integrating with Gemini API to analyze candidate speaking and writing inputs.
 * Specifically identifies:
 * 1. Pronunciation faults (IPA phonetics, syllable stress, cadence, connected speech)
 * 2. Grammatical errors (observed mistake, rule category, severity, correction)
 * 3. Band score justifications across official Sprint criteria
 * 4. Actionable improvements & Band 9 model answers
 */

import { getStoredSessionToken } from './authService';
import { validateClientWritingEvaluation } from '../utils/scoringIntegrity';

export interface GrammaticalErrorItem {
  observed: string;
  corrected: string;
  explanation: string;
  ruleCategory:
    | 'Tense & Aspect'
    | 'Subject-Verb Agreement'
    | 'Articles & Determiners'
    | 'Prepositions'
    | 'Word Form & Plurality'
    | 'Modals & Conditionals'
    | 'Sentence Structure'
    | 'Cohesion & Punctuation';
  severity: 'minor' | 'moderate' | 'critical';
}

export interface PronunciationFaultItem {
  word: string;
  ipa: string;
  syllableStress: string;
  observedFault?: string;
  tip: string;
}

export interface PronunciationAnalysis {
  clarityBand: number | null;
  cadenceWpm: number;
  trickyWords: PronunciationFaultItem[];
  connectedSpeechTips: string[];
  intonationPattern: string;
  rhythmVerdict: string;
}

export interface BandScoreJustification {
  criterion: 'fluency' | 'lexical' | 'grammar' | 'pronunciation' | 'task_achievement' | 'coherence';
  criterionLabel: string;
  estimatedBand: number | null;
  justification: string;
  keyStrengths: string[];
  keyWeaknesses: string[];
}

export interface SpeakingGrammarFeedbackParams {
  transcript: string;
  question?: string;
  part?: 1 | 2 | 3;
  topic?: string;
  cueCardBulletPoints?: string[];
  durationSec?: number;
  wordsPerMinute?: number;
}

export interface SpeakingGrammarFeedbackResult {
  questionId: string;
  questionText: string;
  part: 1 | 2 | 3;
  topic: string;
  candidateTranscript: string;
  wordCount: number;
  durationSec: number;
  wordsPerMinute: number;
  overallBand?: number | null;
  partialThreeCriterionIndex?: number | null;
  evidenceMode?: 'audio_and_transcript' | 'transcript_only';
  pronunciationObservable?: boolean;
  isPartialAssessment?: boolean;
  unassessedCriteria?: string[];
  disclaimer?: string;
  estimatedBands: {
    fluency: number | null;
    lexical: number | null;
    grammar: number | null;
    pronunciation: number | null;
    overall: number | null;
  };
  bandJustifications: BandScoreJustification[];
  grammaticalErrors: GrammaticalErrorItem[];
  pronunciation: PronunciationAnalysis;
  band8Answer: {
    bandScore: number;
    modelAnswer: string;
    highlightedCollocations: Array<{
      phrase: string;
      bandLevel: 'C1' | 'C2' | 'Band 8.5' | 'Band 9.0';
      meaning: string;
    }>;
    keyDiscourseMarkers: string[];
    examinerRationale: string;
    audioPromptText?: string;
  };
  actionableTips: string[];
  isEstimated: boolean;
  isValidAttempt?: boolean;
  assessmentStatus?: 'evaluated' | 'complete' | 'partial_transcript_only' | 'insufficient_evidence' | 'unavailable';
  error?: string;
}

export interface WritingGrammarFeedbackParams {
  essayText: string;
  prompt: string;
  testType?: 'task1' | 'task2';
}

export interface WritingGrammarFeedbackResult {
  essayId: string;
  testType: 'task1' | 'task2';
  promptText: string;
  candidateEssay: string;
  wordCount: number;
  targetWordCount: number;
  estimatedBands: {
    taskAchievement: number | null;
    coherenceCohesion: number | null;
    lexicalResource: number | null;
    grammaticalRange: number | null;
    overall: number | null;
  };
  bandJustifications: BandScoreJustification[];
  grammaticalErrors: GrammaticalErrorItem[];
  lexicalFaults: Array<{
    phrase: string;
    suggestion: string;
    reason: string;
  }>;
  band8Answer: {
    bandScore: number;
    modelEssay: string;
    structuralBreakdown: string[];
    keyVocabulary?: Array<{ phrase: string; bandLevel: string; meaning: string }>;
    highImpactVocabulary?: Array<{
      word: string;
      bandLevel: string;
      meaning: string;
    }>;
    examinerRationale: string;
  };
  actionableTips: string[];
  isEstimated: boolean;
  isValidAttempt?: boolean;
  assessmentStatus?: 'evaluated' | 'complete' | 'insufficient_evidence' | 'unavailable';
  error?: string;
}

class GrammarFeedbackEngineService {
  /**
   * Analyzes candidate speaking input (transcript, audio metrics) via Gemini AI backend
   */
  public async analyzeSpeaking(
    params: SpeakingGrammarFeedbackParams
  ): Promise<SpeakingGrammarFeedbackResult> {
    const {
      transcript,
      question = 'IELTS Speaking Question',
      part = 1,
      topic = 'General',
      cueCardBulletPoints = [],
      durationSec = 20,
      wordsPerMinute = 120
    } = params;

    const token = getStoredSessionToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const baseUrl = typeof window !== 'undefined' ? '' : (process.env.APP_URL || 'http://127.0.0.1:3000');
    try {
      const response = await fetch(`${baseUrl}/api/grammar-feedback/speaking`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          transcript,
          question,
          part,
          topic,
          cueCardBulletPoints,
          durationSec,
          wordsPerMinute
        })
      });

      if (!response.ok) {
        // Fallback to /api/evaluate-speaking-turn if grammar-feedback endpoint is redirecting
        const fallbackRes = await fetch(`${baseUrl}/api/evaluate-speaking-turn`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            transcript,
            question,
            part,
            topic,
            cueCardBulletPoints,
            durationSec,
            wordsPerMinute
          })
        });

        if (!fallbackRes.ok) {
          const errJson = await fallbackRes.json().catch(() => ({}));
          throw new Error(errJson.error || `Server responded with status ${fallbackRes.status}`);
        }

        const data = await fallbackRes.json();
        return this.formatSpeakingResult(data, question, part, topic, transcript, durationSec, wordsPerMinute);
      }

      const data = await response.json();
      return this.formatSpeakingResult(data, question, part, topic, transcript, durationSec, wordsPerMinute);
    } catch (error: any) {
      return this.buildUnavailableSpeakingResult(
        transcript,
        question,
        part,
        topic,
        durationSec,
        wordsPerMinute,
        error?.message || 'AI speaking assessment is temporarily unavailable. No band score was generated.'
      );
    }
  }

  /**
   * Analyzes candidate writing input (essay text, prompt, task type) via Gemini AI backend
   */
  public async analyzeWriting(
    params: WritingGrammarFeedbackParams
  ): Promise<WritingGrammarFeedbackResult> {
    const { essayText, prompt, testType = 'task2' } = params;

    const token = getStoredSessionToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const baseUrl = typeof window !== 'undefined' ? '' : (process.env.APP_URL || 'http://127.0.0.1:3000');
    try {
      const response = await fetch(`${baseUrl}/api/grammar-feedback/writing`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          essayText,
          prompt,
          testType
        })
      });

      if (!response.ok) {
        // Fallback to /api/evaluate-writing
        const fallbackRes = await fetch(`${baseUrl}/api/evaluate-writing`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            essayText,
            prompt,
            testType
          })
        });

        if (!fallbackRes.ok) {
          const errJson = await fallbackRes.json().catch(() => ({}));
          throw new Error(errJson.error || `Server responded with status ${fallbackRes.status}`);
        }

        const data = await fallbackRes.json();
        return this.formatWritingResult(data, prompt, testType, essayText);
      }

      const data = await response.json();
      return this.formatWritingResult(data, prompt, testType, essayText);
    } catch (error: any) {
      return this.buildUnavailableWritingResult(
        essayText,
        prompt,
        testType,
        error?.message || 'AI writing assessment is temporarily unavailable. No band score was generated.'
      );
    }
  }

  private buildUnavailableSpeakingResult(
    transcript: string,
    questionText: string,
    part: 1 | 2 | 3,
    topic: string,
    durationSec: number,
    wordsPerMinute: number,
    reason: string,
    status: 'unavailable' | 'insufficient_evidence' = 'unavailable'
  ): SpeakingGrammarFeedbackResult {
    const wordCount = (transcript || '').trim().split(/\s+/).filter(Boolean).length;
    return {
      isValidAttempt: false,
      assessmentStatus: status,
      evidenceMode: 'transcript_only',
      pronunciationObservable: false,
      isPartialAssessment: true,
      unassessedCriteria: [
        'Fluency & Coherence',
        'Lexical Resource',
        'Grammatical Range & Accuracy',
        'Pronunciation'
      ],
      overallBand: null,
      partialThreeCriterionIndex: null,
      error: reason,
      questionId: 'spk_unavail_' + Date.now(),
      questionText,
      part,
      topic,
      candidateTranscript: transcript,
      wordCount,
      durationSec,
      wordsPerMinute,
      estimatedBands: {
        fluency: null,
        lexical: null,
        grammar: null,
        pronunciation: null,
        overall: null
      },
      bandJustifications: [],
      grammaticalErrors: [],
      pronunciation: {
        clarityBand: null,
        cadenceWpm: wordsPerMinute,
        trickyWords: [],
        connectedSpeechTips: [],
        intonationPattern: 'Unassessed — AI evaluation service unavailable.',
        rhythmVerdict: 'Assessment unavailable'
      },
      band8Answer: {
        bandScore: 8.5,
        modelAnswer: '',
        highlightedCollocations: [],
        keyDiscourseMarkers: [],
        examinerRationale: ''
      },
      actionableTips: [reason],
      isEstimated: true
    };
  }

  private buildUnavailableWritingResult(
    essayText: string,
    promptText: string,
    testType: 'task1' | 'task2',
    reason: string,
    status: 'unavailable' | 'insufficient_evidence' = 'unavailable'
  ): WritingGrammarFeedbackResult {
    const wordCount = (essayText || '').trim().split(/\s+/).filter(Boolean).length;
    const targetWordCount = testType === 'task2' ? 250 : 150;
    return {
      isValidAttempt: false,
      assessmentStatus: status,
      error: reason,
      essayId: 'wrt_unavail_' + Date.now(),
      testType,
      promptText,
      candidateEssay: essayText,
      wordCount,
      targetWordCount,
      estimatedBands: {
        taskAchievement: null,
        coherenceCohesion: null,
        lexicalResource: null,
        grammaticalRange: null,
        overall: null
      },
      bandJustifications: [],
      grammaticalErrors: [],
      lexicalFaults: [],
      band8Answer: {
        bandScore: 8.5,
        modelEssay: '',
        structuralBreakdown: [],
        examinerRationale: ''
      },
      actionableTips: [reason],
      isEstimated: true
    };
  }

  private formatSpeakingResult(
    data: any,
    questionText: string,
    part: 1 | 2 | 3,
    topic: string,
    transcript: string,
    durationSec: number,
    wordsPerMinute: number
  ): SpeakingGrammarFeedbackResult {
    if (!data || data.isValidAttempt === false || !data.estimatedBands) {
      const status = data?.assessmentStatus === 'insufficient_evidence' ? 'insufficient_evidence' : 'unavailable';
      return this.buildUnavailableSpeakingResult(
        transcript,
        questionText,
        part,
        topic,
        durationSec,
        wordsPerMinute,
        data?.error || data?.feedbackEn || 'Speaking assessment could not be completed. No band score was assigned.',
        status
      );
    }

    const fc = typeof data.estimatedBands.fluency === 'number' ? data.estimatedBands.fluency : null;
    const lr = typeof data.estimatedBands.lexical === 'number' ? data.estimatedBands.lexical : null;
    const gra = typeof data.estimatedBands.grammar === 'number' ? data.estimatedBands.grammar : null;
    const pr = typeof data.estimatedBands.pronunciation === 'number' ? data.estimatedBands.pronunciation : null;

    if (fc === null || lr === null || gra === null) {
      return this.buildUnavailableSpeakingResult(
        transcript,
        questionText,
        part,
        topic,
        durationSec,
        wordsPerMinute,
        'Assessment service returned incomplete speaking criteria. No fallback score was fabricated.'
      );
    }

    const pronunciationObservable = Boolean(data.pronunciationObservable) && pr !== null;
    const overallBand = pronunciationObservable && typeof data.overallBand === 'number'
      ? data.overallBand
      : (pronunciationObservable && typeof data.estimatedBands.overall === 'number' ? data.estimatedBands.overall : null);
    const partialThreeCriterionIndex = !pronunciationObservable
      ? (typeof data.partialThreeCriterionIndex === 'number'
        ? data.partialThreeCriterionIndex
        : Math.round(((fc + lr + gra) / 3) * 2) / 2)
      : null;

    const estimatedBands = {
      fluency: fc,
      lexical: lr,
      grammar: gra,
      pronunciation: pr,
      overall: overallBand
    };

    const bandJustifications: BandScoreJustification[] = [
      {
        criterion: 'fluency',
        criterionLabel: 'Fluency & Coherence',
        estimatedBand: estimatedBands.fluency,
        justification: `Evaluated from transcript coherence and flow (${wordsPerMinute} WPM recorded).`,
        keyStrengths: ['Observable discourse progression in transcript'],
        keyWeaknesses: ['Review pacing and cohesive variety across extended responses']
      },
      {
        criterion: 'lexical',
        criterionLabel: 'Lexical Resource',
        estimatedBand: estimatedBands.lexical,
        justification: 'Evaluated on topic-appropriate vocabulary range, precision, and collocations.',
        keyStrengths: ['Observable lexical selection in transcript'],
        keyWeaknesses: ['Upgrade recurring general vocabulary with precise C1 collocations']
      },
      {
        criterion: 'grammar',
        criterionLabel: 'Grammatical Range & Accuracy',
        estimatedBand: estimatedBands.grammar,
        justification: 'Evaluated on sentence variety, clause complexity, and grammatical accuracy.',
        keyStrengths: ['Observable syntactic range in transcript'],
        keyWeaknesses: ['Address recurring tense, agreement, or article errors highlighted below']
      },
      {
        criterion: 'pronunciation',
        criterionLabel: 'Pronunciation',
        estimatedBand: estimatedBands.pronunciation,
        justification: pronunciationObservable
          ? 'Assessed from audio intelligibility, stress, and intonation patterns.'
          : 'Unassessed — acoustic audio recording is required to evaluate pronunciation, stress, and intonation.',
        keyStrengths: pronunciationObservable ? ['Assessed from audio recording'] : [],
        keyWeaknesses: pronunciationObservable
          ? ['Refine syllable stress and connected speech']
          : ['Acoustic audio analysis not available for transcript-only input']
      }
    ];

    return {
      isValidAttempt: true,
      assessmentStatus: data.assessmentStatus || (pronunciationObservable ? 'evaluated' : 'partial_transcript_only'),
      evidenceMode: data.evidenceMode || (pronunciationObservable ? 'audio_and_transcript' : 'transcript_only'),
      pronunciationObservable,
      isPartialAssessment: typeof data.isPartialAssessment === 'boolean' ? data.isPartialAssessment : !pronunciationObservable,
      unassessedCriteria: Array.isArray(data.unassessedCriteria)
        ? data.unassessedCriteria
        : (pronunciationObservable ? [] : ['Pronunciation']),
      overallBand,
      partialThreeCriterionIndex,
      disclaimer:
        data.disclaimer ||
        (pronunciationObservable
          ? 'AI diagnostic estimate based on public IELTS Speaking descriptors. Not an official IELTS score.'
          : 'Partial transcript-only estimate (3 of 4 criteria). Acoustic Pronunciation was not assessed; not a complete IELTS Speaking band.'),
      questionId: data.questionId || 'spk_fdbk_' + Date.now(),
      questionText: data.questionText || questionText,
      part: (data.part || part) as any,
      topic: data.topic || topic,
      candidateTranscript: data.candidateTranscript || transcript,
      wordCount: data.wordCount || transcript.trim().split(/\s+/).filter(Boolean).length,
      durationSec: data.durationSec || durationSec,
      wordsPerMinute: data.wordsPerMinute || wordsPerMinute,
      estimatedBands,
      bandJustifications: data.bandJustifications || bandJustifications,
      grammaticalErrors: data.grammaticalErrors || [],
      pronunciation: data.pronunciation
        ? {
            ...data.pronunciation,
            clarityBand: pr
          }
        : {
            clarityBand: pr,
            cadenceWpm: wordsPerMinute,
            trickyWords: [],
            connectedSpeechTips: [],
            intonationPattern: pronunciationObservable
              ? 'Assessed from audio recording.'
              : 'Not observable from transcript-only input.',
            rhythmVerdict: pronunciationObservable
              ? 'Assessed from audio recording.'
              : 'Unassessed — audio recording analysis required for acoustic pronunciation scoring.'
          },
      band8Answer: data.band8Answer || {
        bandScore: 8.5,
        modelAnswer: '',
        highlightedCollocations: [],
        keyDiscourseMarkers: [],
        examinerRationale: ''
      },
      actionableTips: data.actionableTips || [],
      isEstimated: true
    };
  }

  private formatWritingResult(
    data: any,
    promptText: string,
    testType: 'task1' | 'task2',
    essayText: string
  ): WritingGrammarFeedbackResult {
    const validated = validateClientWritingEvaluation(data);
    if (!validated.valid || validated.overallBand === null) {
      return this.buildUnavailableWritingResult(
        essayText,
        promptText,
        testType,
        validated.reason ||
          data?.error ||
          data?.verdict ||
          'Writing assessment could not be completed. No band score was assigned.',
        validated.assessmentStatus === 'insufficient_evidence' ? 'insufficient_evidence' : 'unavailable'
      );
    }

    const estimatedBands = {
      taskAchievement: validated.criteria.ta,
      coherenceCohesion: validated.criteria.cc,
      lexicalResource: validated.criteria.lr,
      grammaticalRange: validated.criteria.gra,
      overall: validated.overallBand
    };

    const wordCount = essayText.trim().split(/\s+/).filter(Boolean).length;
    const targetWordCount = testType === 'task2' ? 250 : 150;

    const bandJustifications: BandScoreJustification[] = [
      {
        criterion: 'task_achievement',
        criterionLabel: testType === 'task2' ? 'Task Response' : 'Task Achievement',
        estimatedBand: estimatedBands.taskAchievement,
        justification:
          data.trComment ||
          `Word count (${wordCount}/${targetWordCount}) evaluated against IELTS Task ${testType === 'task2' ? 'Response' : 'Achievement'} descriptors.`,
        keyStrengths: Array.isArray(data.strengths) ? data.strengths.slice(0, 2) : [],
        keyWeaknesses: Array.isArray(data.weaknesses) ? data.weaknesses.slice(0, 2) : []
      },
      {
        criterion: 'coherence',
        criterionLabel: 'Coherence & Cohesion',
        estimatedBand: estimatedBands.coherenceCohesion,
        justification: data.ccComment || 'Evaluated on paragraph progression and cohesive referencing.',
        keyStrengths: [],
        keyWeaknesses: []
      },
      {
        criterion: 'lexical',
        criterionLabel: 'Lexical Resource',
        estimatedBand: estimatedBands.lexicalResource,
        justification: data.lrComment || 'Evaluated on vocabulary range, collocation accuracy, and register.',
        keyStrengths: [],
        keyWeaknesses: []
      },
      {
        criterion: 'grammar',
        criterionLabel: 'Grammatical Range & Accuracy',
        estimatedBand: estimatedBands.grammaticalRange,
        justification: data.graComment || 'Evaluated on sentence variety and grammatical accuracy.',
        keyStrengths: [],
        keyWeaknesses: []
      }
    ];

    return {
      isValidAttempt: true,
      assessmentStatus: 'evaluated',
      essayId: data.essayId || 'wrt_fdbk_' + Date.now(),
      testType,
      promptText,
      candidateEssay: essayText,
      wordCount,
      targetWordCount,
      estimatedBands,
      bandJustifications: data.bandJustifications || bandJustifications,
      grammaticalErrors: data.grammaticalErrors || [],
      lexicalFaults: data.lexicalFaults || [],
      band8Answer: data.band8Answer || {
        bandScore: 9.0,
        modelEssay: '',
        structuralBreakdown: [],
        keyVocabulary: [],
        examinerRationale: ''
      },
      actionableTips: data.actionableTips || [],
      isEstimated: true
    };
  }

}

export const grammarFeedbackEngine = new GrammarFeedbackEngineService();
