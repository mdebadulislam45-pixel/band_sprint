/**
 * IELTS SPRINT — STATIC MOCK EXAM ADAPTER
 *
 * Connects the Central Content Registry to authoritative mock exam sets in `src/data/mockExams.ts`
 * without copying or mutating existing test and question structures.
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
import { MOCK_EXAM_SETS, MockExamSet, getExamListeningSection } from '../../../data/mockExams';

// Legacy ID alias map (maps historical aliases to authoritative set IDs)
const MOCK_SET_ALIAS_MAP: Record<string, string> = {
  cam18_mock_test1: 'sprint-18',
  cam17_mock_test2: 'sprint-17',
  cam16_mock_test3: 'sprint-16',
  'bc-authentic-3': 'bc-authentic-3',
  'gt-test-1': 'gt-test-1',
  'mock-set-1': 'sprint-18',
  'mock-set-2': 'sprint-17',
  'mock-set-3': 'bc-authentic-3',
  'mock-set-4': 'sprint-16',
  'mock-set-5': 'gt-test-1'
};

export class StaticMockAdapter implements IContentAdapter {
  readonly adapterId = 'static_mock_adapter';

  public canHandle(urn: ParsedURN): boolean {
    return (
      urn.provenance === 'sprint_original' &&
      urn.family === 'mock_exam' &&
      (MOCK_EXAM_SETS.some((s) => s.id === urn.setId) || urn.setId in MOCK_SET_ALIAS_MAP)
    );
  }

  private findSet(setId: string): MockExamSet | null {
    const resolvedId = MOCK_SET_ALIAS_MAP[setId] || setId;
    return MOCK_EXAM_SETS.find((s) => s.id === resolvedId) || null;
  }

  public async resolve(urn: ParsedURN): Promise<RegistryResolutionResult<MockExamSet> | null> {
    const mock = this.findSet(urn.setId);
    if (!mock) return null;

    return {
      urn: urn.raw,
      canonicalId: mock.id,
      requestedLegacyId: urn.requestedLegacyId || urn.setId,
      provenance: 'sprint_original',
      family: 'mock_exam',
      setId: mock.id,
      title: mock.title,
      format: mock.format,
      level: mock.level,
      supportedModules: ['listening', 'reading', 'writing'],
      rawRef: mock
    };
  }

  public async getListening(urn: ParsedURN): Promise<AdaptedListeningView | null> {
    const mock = this.findSet(urn.setId);
    if (!mock) return null;

    const sections: AdaptedListeningView['sections'] = ([1, 2, 3, 4] as const).map((secNum) => {
      const detail = getExamListeningSection(mock, secNum);
      const questionsForSec = mock.questions.filter((q) => {
        if (q.section !== 'listening') return false;
        if (secNum === 1) return q.id >= 1 && q.id <= 10;
        if (secNum === 2) return q.id >= 11 && q.id <= 20;
        if (secNum === 3) return q.id >= 21 && q.id <= 30;
        if (secNum === 4) return q.id >= 31 && q.id <= 40;
        return false;
      });

      return {
        sectionNumber: secNum,
        title: detail.title,
        isAvailable: detail.isAvailable,
        audioScript: detail.script,
        missingReason: detail.missingReason,
        questions: questionsForSec
      };
    });

    return {
      urn: urn.raw,
      title: mock.listeningTitle || `${mock.title} - Listening`,
      sections
    };
  }

  public async getReading(urn: ParsedURN): Promise<AdaptedReadingView | null> {
    const mock = this.findSet(urn.setId);
    if (!mock) return null;

    const readingQuestions = mock.questions.filter((q) => q.section === 'reading');

    return {
      urn: urn.raw,
      title: mock.readingTitle || `${mock.title} - Reading`,
      passages: [
        {
          passageNumber: 1,
          title: mock.readingTitle,
          text: mock.readingPassage,
          questions: readingQuestions
        }
      ]
    };
  }

  public async getWriting(urn: ParsedURN): Promise<AdaptedWritingView | null> {
    const mock = this.findSet(urn.setId);
    if (!mock) return null;

    return {
      urn: urn.raw,
      title: `${mock.title} - Writing`,
      format: mock.format,
      task1: {
        prompt: mock.task1Prompt || 'Task 1 visual data interpretation.',
        type: mock.format === 'Academic' ? 'Academic Chart / Graph' : 'General Training Letter',
        minimumWords: 150
      },
      task2: {
        prompt: mock.writingPrompt,
        minimumWords: 250,
        sampleDraft: mock.modelEssay
      }
    };
  }

  public async getSpeaking(_urn: ParsedURN): Promise<AdaptedSpeakingView | null> {
    // MockExamSets in mockExams.ts do not contain speaking items. Return explicit null (never fabricate data).
    return null;
  }

  public listAvailableURNs(): CanonicalURN[] {
    return MOCK_EXAM_SETS.map((s) => `urn:ielts:sprint_original:mock_exam:${s.id}`);
  }
}
