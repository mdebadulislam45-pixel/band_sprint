/**
 * IELTS SPRINT — CENTRAL CONTENT REGISTRY SERVICE
 *
 * Implements the centralized, non-mutating content index and resolution engine:
 * - Validates and parses Canonical URNs (RFC 8141 compliant: urn:ielts:<prov>:<fam>:<set>[:<subType>:<subId>])
 * - Preserves 100% backward compatibility for all legacy ID families
 * - Routes resolution to specialized read-only adapters
 * - Guarantees zero duplication and zero mutation of authoritative existing content
 */

import {
  CanonicalURN,
  ParsedURN,
  ContentProvenance,
  ContentFamily,
  IContentAdapter,
  RegistryResolutionResult,
  AdaptedListeningView,
  AdaptedReadingView,
  AdaptedWritingView,
  AdaptedSpeakingView
} from '../../types/contentRegistry';
import { StaticMockAdapter } from './adapters/StaticMockAdapter';
import { StaticWritingAdapter } from './adapters/StaticWritingAdapter';
import { StaticQuestionBankAdapter } from './adapters/StaticQuestionBankAdapter';
import { PrivatePdfVaultAdapter } from './adapters/PrivatePdfVaultAdapter';

const VALID_PROVENANCES: ReadonlySet<ContentProvenance> = new Set([
  'sprint_original',
  'sprint_catalogue',
  'sprint_private',
  'public_authorized'
]);

const VALID_FAMILIES: ReadonlySet<ContentFamily> = new Set([
  'mock_exam',
  'writing_set',
  'sprint_test',
  'question_bank',
  'speaking_bank'
]);

const IDENTIFIER_REGEX = /^[A-Za-z0-9_-]+$/;

/**
 * Parses and strictly validates a Canonical URN string.
 * Throws a descriptive Error if the URN is malformed.
 */
export function parseURN(raw: string): ParsedURN {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error('Malformed URN: input must be a non-empty string');
  }

  const trimmed = raw.trim();
  const segments = trimmed.split(':');

  if (segments.length < 5) {
    throw new Error(`Malformed URN: insufficient segments in "${trimmed}". Expected at least 5 segments.`);
  }

  if (segments.length === 6 || segments.length > 7) {
    throw new Error(
      `Malformed URN: invalid segment count (${segments.length}) in "${trimmed}". Expected 5 segments (urn:ielts:<prov>:<fam>:<set>) or 7 segments (urn:ielts:<prov>:<fam>:<set>:<subType>:<subId>).`
    );
  }

  if (segments[0] !== 'urn' || segments[1] !== 'ielts') {
    throw new Error(`Malformed URN: prefix must be "urn:ielts" in "${trimmed}"`);
  }

  const provenance = segments[2] as ContentProvenance;
  if (!VALID_PROVENANCES.has(provenance)) {
    throw new Error(
      `Malformed URN: invalid provenance "${segments[2]}". Allowed: ${Array.from(VALID_PROVENANCES).join(', ')}`
    );
  }

  const family = segments[3] as ContentFamily;
  if (!VALID_FAMILIES.has(family)) {
    throw new Error(
      `Malformed URN: invalid content family "${segments[3]}". Allowed: ${Array.from(VALID_FAMILIES).join(', ')}`
    );
  }

  const setId = segments[4];
  if (!setId || !IDENTIFIER_REGEX.test(setId)) {
    throw new Error(`Malformed URN: invalid or empty setId "${setId}". Must contain only alphanumeric, _ or -.`);
  }

  let subType: string | undefined;
  let subId: string | undefined;

  if (segments.length === 7) {
    subType = segments[5];
    subId = segments[6];

    if (!subType || !IDENTIFIER_REGEX.test(subType)) {
      throw new Error(`Malformed URN: invalid subType "${subType}"`);
    }
    if (!subId || !IDENTIFIER_REGEX.test(subId)) {
      throw new Error(`Malformed URN: invalid subId "${subId}"`);
    }
  }

  return {
    raw: trimmed,
    nid: 'ielts',
    provenance,
    family,
    setId,
    subType,
    subId
  };
}

/**
 * Safe parser that returns a success/error object instead of throwing.
 */
export function tryParseURN(raw: string): { success: true; urn: ParsedURN } | { success: false; error: string } {
  try {
    const urn = parseURN(raw);
    return { success: true, urn };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Builds a validated Canonical URN from individual segments.
 */
export function buildURN(params: {
  provenance: ContentProvenance;
  family: ContentFamily;
  setId: string;
  subType?: string;
  subId?: string;
}): CanonicalURN {
  const { provenance, family, setId, subType, subId } = params;

  if (!VALID_PROVENANCES.has(provenance)) {
    throw new Error(`Cannot build URN: invalid provenance "${provenance}"`);
  }
  if (!VALID_FAMILIES.has(family)) {
    throw new Error(`Cannot build URN: invalid family "${family}"`);
  }
  if (!setId || !IDENTIFIER_REGEX.test(setId)) {
    throw new Error(`Cannot build URN: invalid setId "${setId}"`);
  }

  if ((subType && !subId) || (!subType && subId)) {
    throw new Error('Cannot build URN: both subType and subId must be provided together');
  }

  if (subType && subId) {
    if (!IDENTIFIER_REGEX.test(subType) || !IDENTIFIER_REGEX.test(subId)) {
      throw new Error(`Cannot build URN: invalid sub-identifiers "${subType}:${subId}"`);
    }
    return `urn:ielts:${provenance}:${family}:${setId}:${subType}:${subId}`;
  }

  return `urn:ielts:${provenance}:${family}:${setId}`;
}

/**
 * Resolves any legacy local identifier to its canonical URN.
 * If the input is already a valid canonical URN, it returns it unchanged.
 * Returns null if the identifier is unrecognized.
 */
export function resolveLegacyId(input: string): CanonicalURN | null {
  if (typeof input !== 'string' || !input.trim()) return null;
  const clean = input.trim();

  // 1. Direct Canonical URN
  if (clean.startsWith('urn:ielts:')) {
    const parsed = tryParseURN(clean);
    return parsed.success ? parsed.urn.raw : null;
  }

  // 2. Mock Exam Sets (both canonical set IDs and historical aliases)
  const MOCK_SET_DIRECT_MATCH = [
    'sprint-18',
    'sprint-17',
    'bc-authentic-3',
    'sprint-16',
    'gt-test-1'
  ];
  if (MOCK_SET_DIRECT_MATCH.includes(clean)) {
    return `urn:ielts:sprint_original:mock_exam:${clean}`;
  }

  const MOCK_ALIAS_MAP: Record<string, string> = {
    cam18_mock_test1: 'sprint-18',
    cam17_mock_test2: 'sprint-17',
    cam16_mock_test3: 'sprint-16',
    'mock-set-1': 'sprint-18',
    'mock-set-2': 'sprint-17',
    'mock-set-3': 'bc-authentic-3',
    'mock-set-4': 'sprint-16',
    'mock-set-5': 'gt-test-1'
  };
  if (clean in MOCK_ALIAS_MAP) {
    return `urn:ielts:sprint_original:mock_exam:${MOCK_ALIAS_MAP[clean]}`;
  }

  // 3. Sprint Catalogue Test Sets (e.g. sprint-18-academic-test-1)
  if (/^sprint-\d+-(academic|general-training)-test-[1-4]$/.test(clean)) {
    return `urn:ielts:sprint_catalogue:sprint_test:${clean}`;
  }

  // 4. Writing Room Sets (Academic & General Training)
  if (
    clean.startsWith('cam') &&
    clean.includes('_writing_set')
  ) {
    return `urn:ielts:sprint_original:writing_set:${clean}`;
  }
  if (clean.startsWith('gt_set') || clean === 'gt_set1_formal_repair' || clean === 'gt_set2_semiformal_landlord' || clean === 'gt_set3_informal_relocation') {
    return `urn:ielts:sprint_original:writing_set:${clean}`;
  }

  // 5. Question Bank item identifiers (lis_s1_01, spk_p1_01, rea_acad_01, etc.)
  if (/^(lis|spk|rea|wri|voc|grm)_[a-zA-Z0-9]+_\d+$/.test(clean) || clean.startsWith('lis_') || clean.startsWith('spk_')) {
    return `urn:ielts:sprint_original:question_bank:comprehensive:item:${clean}`;
  }

  return null;
}

/**
 * Reverses a Canonical URN back to its primary legacy local ID.
 */
export function toLegacyId(urnOrParsed: CanonicalURN | ParsedURN): string | null {
  const parsed = typeof urnOrParsed === 'string' ? tryParseURN(urnOrParsed) : { success: true as const, urn: urnOrParsed };
  if (!parsed.success) return null;

  const { family, setId, subType, subId } = parsed.urn;

  // Question bank item
  if (family === 'question_bank') {
    return subId || setId;
  }

  // Mock exam, writing set, or sprint test
  return setId;
}

/**
 * Central Content Registry Service:
 * Manages registered adapters and provides unified content resolution.
 */
export class ContentRegistryService {
  private adapters: IContentAdapter[] = [];

  constructor(autoRegisterDefaults = true) {
    if (autoRegisterDefaults) {
      this.registerAdapter(new StaticMockAdapter());
      this.registerAdapter(new StaticWritingAdapter());
      this.registerAdapter(new StaticQuestionBankAdapter());
      this.registerAdapter(new PrivatePdfVaultAdapter());
    }
  }

  public registerAdapter(adapter: IContentAdapter): void {
    // Avoid duplicate adapter IDs
    this.adapters = this.adapters.filter((a) => a.adapterId !== adapter.adapterId);
    this.adapters.push(adapter);
  }

  public getRegisteredAdapters(): readonly IContentAdapter[] {
    return this.adapters;
  }

  /**
   * Resolves an identifier (either Canonical URN or Legacy local ID) to its ParsedURN.
   */
  public resolveToParsedURN(identifier: string): ParsedURN | null {
    const urnStr = resolveLegacyId(identifier);
    if (!urnStr) return null;
    const parsed = tryParseURN(urnStr);
    if (!parsed.success) return null;
    return {
      ...parsed.urn,
      requestedLegacyId: identifier
    };
  }

  /**
   * Finds the adapter capable of handling the parsed URN.
   */
  private findAdapter(urn: ParsedURN): IContentAdapter | null {
    for (const adapter of this.adapters) {
      if (adapter.canHandle(urn)) {
        return adapter;
      }
    }
    return null;
  }

  /**
   * Resolves high-level metadata for any content set or item.
   * Explicitly distinguishes:
   * - requestedLegacyId: exact identifier supplied by the caller
   * - canonicalId: authoritative content identifier
   * - urn: canonical registry identifier
   * - rawRef: authoritative source reference
   */
  public async resolve(identifier: string): Promise<RegistryResolutionResult | null> {
    const parsed = this.resolveToParsedURN(identifier);
    if (!parsed) return null;

    const adapter = this.findAdapter(parsed);
    if (!adapter) return null;

    const result = await adapter.resolve(parsed);
    if (!result) return null;

    return {
      ...result,
      canonicalId: result.canonicalId || result.setId,
      requestedLegacyId: identifier
    };
  }

  /**
   * Resolves standardized Listening content.
   */
  public async getListening(identifier: string): Promise<AdaptedListeningView | null> {
    const parsed = this.resolveToParsedURN(identifier);
    if (!parsed) return null;

    const adapter = this.findAdapter(parsed);
    if (!adapter) return null;

    return adapter.getListening(parsed);
  }

  /**
   * Resolves standardized Reading content.
   */
  public async getReading(identifier: string): Promise<AdaptedReadingView | null> {
    const parsed = this.resolveToParsedURN(identifier);
    if (!parsed) return null;

    const adapter = this.findAdapter(parsed);
    if (!adapter) return null;

    return adapter.getReading(parsed);
  }

  /**
   * Resolves standardized Writing content.
   */
  public async getWriting(identifier: string): Promise<AdaptedWritingView | null> {
    const parsed = this.resolveToParsedURN(identifier);
    if (!parsed) return null;

    const adapter = this.findAdapter(parsed);
    if (!adapter) return null;

    return adapter.getWriting(parsed);
  }

  /**
   * Resolves standardized Speaking content.
   */
  public async getSpeaking(identifier: string): Promise<AdaptedSpeakingView | null> {
    const parsed = this.resolveToParsedURN(identifier);
    if (!parsed) return null;

    const adapter = this.findAdapter(parsed);
    if (!adapter) return null;

    return adapter.getSpeaking(parsed);
  }

  /**
   * Lists all available canonical URNs indexed across all registered adapters.
   */
  public listAvailableURNs(): CanonicalURN[] {
    const set = new Set<CanonicalURN>();
    for (const adapter of this.adapters) {
      for (const urn of adapter.listAvailableURNs()) {
        set.add(urn);
      }
    }
    return Array.from(set);
  }
}

// Global default singleton instance
export const contentRegistry = new ContentRegistryService();
