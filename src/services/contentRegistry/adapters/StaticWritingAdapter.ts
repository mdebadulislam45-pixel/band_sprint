/**
 * IELTS SPRINT — STATIC WRITING ROOM ADAPTER
 *
 * Connects the Central Content Registry to authoritative writing examination sets
 * in `src/components/cdielts/CDIELTSWritingExamRoom.tsx` (Academic SVG chart sets and
 * General Training authentic letter sets) without duplicating payloads.
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
  ACADEMIC_WRITING_SETS,
  GENERAL_TRAINING_WRITING_SETS,
  WritingTestSet
} from '../../../components/cdielts/CDIELTSWritingExamRoom';

const WRITING_SET_ALIAS_MAP: Record<string, string> = {
  gt_set1_formal_repair: 'gt_writing_set1',
  gt_set2_semiformal_landlord: 'gt_writing_set2',
  gt_set3_informal_relocation: 'gt_writing_set3'
};

export class StaticWritingAdapter implements IContentAdapter {
  readonly adapterId = 'static_writing_adapter';

  private getAllSets(): WritingTestSet[] {
    return [...ACADEMIC_WRITING_SETS, ...GENERAL_TRAINING_WRITING_SETS];
  }

  public canHandle(urn: ParsedURN): boolean {
    const targetId = WRITING_SET_ALIAS_MAP[urn.setId] || urn.setId;
    return (
      urn.provenance === 'sprint_original' &&
      urn.family === 'writing_set' &&
      this.getAllSets().some((s) => s.id === targetId)
    );
  }

  private findSet(setId: string): WritingTestSet | null {
    const targetId = WRITING_SET_ALIAS_MAP[setId] || setId;
    return this.getAllSets().find((s) => s.id === targetId) || null;
  }

  public async resolve(urn: ParsedURN): Promise<RegistryResolutionResult<WritingTestSet> | null> {
    const set = this.findSet(urn.setId);
    if (!set) return null;

    return {
      urn: urn.raw,
      canonicalId: set.id,
      requestedLegacyId: urn.requestedLegacyId || urn.setId,
      provenance: 'sprint_original',
      family: 'writing_set',
      setId: set.id,
      title: set.title,
      format: set.format || 'Academic',
      level: 'B2-C1',
      supportedModules: ['writing'],
      rawRef: set
    };
  }

  public async getListening(_urn: ParsedURN): Promise<AdaptedListeningView | null> {
    // Writing sets do not contain listening items.
    return null;
  }

  public async getReading(_urn: ParsedURN): Promise<AdaptedReadingView | null> {
    // Writing sets do not contain reading items.
    return null;
  }

  public async getWriting(urn: ParsedURN): Promise<AdaptedWritingView | null> {
    const set = this.findSet(urn.setId);
    if (!set) return null;

    const format = set.format || 'Academic';

    return {
      urn: urn.raw,
      title: set.title,
      format,
      task1: {
        prompt: set.task1Prompt,
        type: format === 'Academic' ? 'Academic Chart / Graph' : 'General Training Letter',
        minimumWords: 150,
        bulletPoints: set.task1BulletPoints,
        letterType: set.task1LetterType,
        chartTitle: set.task1ChartTitle,
        chartSubtitle: set.task1ChartSubtitle,
        sampleDraft: set.task1SampleCandidateDraft,
        series: set.task1Series,
        categories: set.task1Categories,
        tableSummary: set.task1TableSummary
      },
      task2: {
        prompt: set.task2Prompt,
        title: set.task2Title,
        minimumWords: 250,
        sampleDraft: set.task2SampleCandidateDraft
      }
    };
  }

  public async getSpeaking(_urn: ParsedURN): Promise<AdaptedSpeakingView | null> {
    // Writing sets do not contain speaking items.
    return null;
  }

  public listAvailableURNs(): CanonicalURN[] {
    return this.getAllSets().map((s) => `urn:ielts:sprint_original:writing_set:${s.id}`);
  }
}
