/**
 * IELTS SPRINT — STATIC CAMBRIDGE CATALOGUE ADAPTER
 *
 * Connects the Central Content Registry to Cambridge 11–21 catalogue test sets
 * in `src/data/cambridgeLibraryData.ts` and `src/data/cambridgeTestGenerator.ts`
 * without mutating or duplicating existing payloads.
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
import {
  getCambridgeTestById,
  CAMBRIDGE_VOLUMES_CATALOGUE
} from '../../../data/cambridgeLibraryData';
import {
  CambridgeTestSet,
  CambridgeVolumeNumber,
  CambridgeEdition,
  CambridgeTestNumber
} from '../../../types/cambridgeLibrary';

export class StaticCambridgeAdapter implements IContentAdapter {
  readonly adapterId = 'static_cambridge_adapter';

  public canHandle(urn: ParsedURN): boolean {
    return urn.provenance === 'cambridge_catalogue' && urn.family === 'cambridge_test';
  }

  private parseCambridgeSlug(
    setId: string
  ): { volume: CambridgeVolumeNumber; edition: CambridgeEdition; testNumber: CambridgeTestNumber } | null {
    // Expected pattern: cambridge-{volume}-{academic|general-training}-test-{testNumber}
    const match = setId.match(/^cambridge-(\d+)-(academic|general-training)-test-([1-4])$/);
    if (!match) return null;

    const volume = parseInt(match[1], 10) as CambridgeVolumeNumber;
    // Current codebase catalogue only supports volumes 11 to 21
    if (volume < 11 || volume > 21) return null;

    const edition: CambridgeEdition = match[2] === 'academic' ? 'Academic' : 'General Training';
    const testNumber = parseInt(match[3], 10) as CambridgeTestNumber;

    return { volume, edition, testNumber };
  }

  private getTest(setId: string): CambridgeTestSet | null {
    // 1. Try direct lookup from static store
    const direct = getCambridgeTestById(setId);
    if (direct) return direct;

    // 2. Validate if the slug represents a supported volume in the active catalogue
    const parsed = this.parseCambridgeSlug(setId);
    if (!parsed) return null;

    // Re-attempt by ID in case it was lazy-loaded
    return getCambridgeTestById(setId) || null;
  }

  public async resolve(urn: ParsedURN): Promise<RegistryResolutionResult<CambridgeTestSet> | null> {
    const test = this.getTest(urn.setId);
    if (!test) return null;

    return {
      urn: urn.raw,
      canonicalId: test.id,
      requestedLegacyId: urn.requestedLegacyId || urn.setId,
      provenance: 'cambridge_catalogue',
      family: 'cambridge_test',
      setId: test.id,
      title: test.title,
      format: test.edition,
      level: 'B2-C1',
      supportedModules: test.availableModules,
      rawRef: test
    };
  }

  public async getListening(urn: ParsedURN): Promise<AdaptedListeningView | null> {
    const test = this.getTest(urn.setId);
    if (!test || !test.listening) return null;

    return {
      urn: urn.raw,
      title: test.listening.title || `${test.title} - Listening`,
      sections: test.listening.parts.map((p) => ({
        sectionNumber: p.partNumber,
        title: p.title,
        isAvailable: true,
        audioScript: p.audioScript,
        dialogue: p.dialogue,
        questions: p.questions
      }))
    };
  }

  public async getReading(urn: ParsedURN): Promise<AdaptedReadingView | null> {
    const test = this.getTest(urn.setId);
    if (!test || !test.reading) return null;

    return {
      urn: urn.raw,
      title: test.reading.title || `${test.title} - Reading`,
      passages: test.reading.passages.map((p) => ({
        passageNumber: p.passageNumber,
        title: p.title,
        subheading: p.subheading,
        text: p.text,
        questions: p.questions
      }))
    };
  }

  public async getWriting(urn: ParsedURN): Promise<AdaptedWritingView | null> {
    const test = this.getTest(urn.setId);
    if (!test || !test.writing) return null;

    return {
      urn: urn.raw,
      title: `${test.title} - Writing`,
      format: test.edition,
      task1: {
        prompt: test.writing.task1.prompt,
        type: test.writing.task1.type,
        minimumWords: test.writing.task1.minimumWords,
        bulletPoints: test.writing.task1.bulletPoints,
        sampleDraft: test.writing.task1.modelAnswer
      },
      task2: {
        prompt: test.writing.task2.prompt,
        title: test.writing.task2.topic,
        minimumWords: test.writing.task2.minimumWords,
        sampleDraft: test.writing.task2.modelAnswer
      }
    };
  }

  public async getSpeaking(urn: ParsedURN): Promise<AdaptedSpeakingView | null> {
    const test = this.getTest(urn.setId);
    if (!test || !test.speaking) return null;

    return {
      urn: urn.raw,
      title: `${test.title} - Speaking`,
      part1: {
        topic: test.speaking.part1.topic,
        questions: test.speaking.part1.questions.map((q) => ({
          question: q.question,
          suggestedIdeas: q.suggestedIdeas
        }))
      },
      part2: {
        topic: test.speaking.part2.cueCardTopic,
        cueCardBulletPoints: test.speaking.part2.bulletPoints,
        followUpPrompt: test.speaking.part2.followUpQuestion
      },
      part3: {
        theme: test.speaking.part3.theme,
        questions: test.speaking.part3.questions.map((q) => ({
          question: q.question,
          sampleResponse: q.sampleResponse
        }))
      }
    };
  }

  public listAvailableURNs(): CanonicalURN[] {
    const urns: CanonicalURN[] = [];
    for (const vol of CAMBRIDGE_VOLUMES_CATALOGUE) {
      for (const ed of vol.availableEditions) {
        const slug = ed.toLowerCase().replace(/\s+/g, '-');
        for (let t = 1; t <= vol.testsCount; t++) {
          urns.push(`urn:ielts:cambridge_catalogue:cambridge_test:cambridge-${vol.volume}-${slug}-test-${t}`);
        }
      }
    }
    return urns;
  }
}
