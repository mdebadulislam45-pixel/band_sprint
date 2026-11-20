/**
 * IELTS SPRINT — STATIC QUESTION BANK ADAPTER
 *
 * Connects the Central Content Registry to curated questions in
 * `src/data/comprehensiveQuestionBank.ts` without duplicating items.
 */

import {
  IContentAdapter,
  ParsedURN,
  RegistryResolutionResult,
  AdaptedListeningView,
  AdaptedReadingView,
  AdaptedWritingView,
  AdaptedSpeakingView,
  CanonicalURN
} from '../../../types/contentRegistry';
import { COMPREHENSIVE_QUESTION_BANK } from '../../../data/comprehensiveQuestionBank';
import { IELTSQuestion } from '../../QuestionEngine';

export class StaticQuestionBankAdapter implements IContentAdapter {
  readonly adapterId = 'static_question_bank_adapter';

  public canHandle(urn: ParsedURN): boolean {
    return (
      urn.provenance === 'sprint_original' &&
      urn.family === 'question_bank' &&
      (urn.setId === 'comprehensive' ||
        COMPREHENSIVE_QUESTION_BANK.some((q) => q.id === (urn.subId || urn.setId)))
    );
  }

  private findQuestion(urn: ParsedURN): IELTSQuestion | null {
    const targetId = urn.subId || urn.setId;
    return COMPREHENSIVE_QUESTION_BANK.find((q) => q.id === targetId) || null;
  }

  public async resolve(urn: ParsedURN): Promise<RegistryResolutionResult<IELTSQuestion> | null> {
    const q = this.findQuestion(urn);
    if (!q) return null;

    const moduleMapping: Record<string, 'listening' | 'reading' | 'writing' | 'speaking'> = {
      listening: 'listening',
      reading: 'reading',
      writing: 'writing',
      speaking: 'speaking'
    };
    const mod = moduleMapping[q.module] || 'listening';

    return {
      urn: urn.raw,
      canonicalId: q.id,
      requestedLegacyId: urn.requestedLegacyId || urn.setId,
      provenance: 'sprint_original',
      family: 'question_bank',
      setId: q.id,
      title: q.topic || `IELTS Question ${q.id}`,
      format: 'Universal',
      level: q.difficulty === 'hard' ? 'C1' : q.difficulty === 'medium' ? 'B2' : 'B1',
      supportedModules: [mod],
      rawRef: q
    };
  }

  public async getListening(urn: ParsedURN): Promise<AdaptedListeningView | null> {
    const q = this.findQuestion(urn);
    if (!q || q.module !== 'listening') return null;

    return {
      urn: urn.raw,
      title: q.topic || `Listening Item ${q.id}`,
      sections: [
        {
          sectionNumber: (q.section || 1) as 1 | 2 | 3 | 4,
          title: `Section ${q.section || 1}: ${q.topic}`,
          isAvailable: true,
          audioScript: q.audioScript,
          dialogue: q.dialogue,
          questions: [
            {
              id: 1,
              section: 'listening',
              type: q.questionType,
              prompt: q.prompt,
              options: q.options,
              correctAnswer: Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer || '',
              explanation: q.explanation || ''
            }
          ]
        }
      ]
    };
  }

  public async getReading(urn: ParsedURN): Promise<AdaptedReadingView | null> {
    const q = this.findQuestion(urn);
    if (!q || q.module !== 'reading') return null;

    return {
      urn: urn.raw,
      title: q.passageTitle || q.topic || `Reading Item ${q.id}`,
      passages: [
        {
          passageNumber: 1,
          title: q.passageTitle || q.topic,
          text: q.passage || '',
          questions: [
            {
              id: 1,
              section: 'reading',
              type: q.questionType,
              prompt: q.prompt,
              options: q.options,
              correctAnswer: Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer || '',
              explanation: q.explanation || ''
            }
          ]
        }
      ]
    };
  }

  public async getWriting(urn: ParsedURN): Promise<AdaptedWritingView | null> {
    const q = this.findQuestion(urn);
    if (!q || q.module !== 'writing') return null;

    return {
      urn: urn.raw,
      title: q.topic || `Writing Task ${q.id}`,
      format: 'Academic',
      task1: {
        prompt: q.prompt,
        type: 'Academic Chart / Graph',
        minimumWords: 150
      },
      task2: {
        prompt: q.prompt,
        title: q.topic,
        minimumWords: 250
      }
    };
  }

  public async getSpeaking(urn: ParsedURN): Promise<AdaptedSpeakingView | null> {
    const q = this.findQuestion(urn);
    if (!q || q.module !== 'speaking') return null;

    return {
      urn: urn.raw,
      title: q.topic || `Speaking Question ${q.id}`,
      part1:
        q.questionType === 'part1_interview'
          ? {
              topic: q.topic,
              questions: [{ question: q.prompt }]
            }
          : undefined,
      part2:
        q.questionType === 'part2_cue_card'
          ? {
              topic: q.topic,
              cueCardBulletPoints: q.cueCardBulletPoints || []
            }
          : undefined,
      part3:
        q.questionType === 'part3_discussion'
          ? {
              theme: q.topic,
              questions: [{ question: q.prompt }]
            }
          : undefined
    };
  }

  public listAvailableURNs(): CanonicalURN[] {
    return COMPREHENSIVE_QUESTION_BANK.map(
      (q) => `urn:ielts:sprint_original:question_bank:comprehensive:item:${q.id}`
    );
  }
}
