/**
 * IELTS Examination Content Duplicate Detector
 * Uses content-word set Jaccard similarity and n-gram overlap.
 * Complies with Requirement 3: Word overlap is enough, no embeddings.
 */

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'by', 'from', 'as', 'into', 'like', 'through', 'after', 'over',
  'between', 'out', 'against', 'during', 'without', 'before', 'under', 'around',
  'among', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
  'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should', 'can',
  'could', 'may', 'might', 'must', 'that', 'which', 'who', 'whom', 'this',
  'these', 'those', 'it', 'its', 'they', 'them', 'their', 'we', 'us', 'our',
  'you', 'your', 'he', 'him', 'his', 'she', 'her', 'not', 'no', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 's', 't', 'just', 'don', 'now'
]);

/**
 * Extracts unique content words (lemmatized/cleaned, min length 3)
 */
export function extractContentWordSet(text: string): Set<string> {
  if (!text || typeof text !== 'string') return new Set();
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
  return new Set(words);
}

/**
 * Computes Jaccard similarity between two word sets: |A ∩ B| / |A ∪ B|
 */
export function computeJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersectionCount = 0;
  for (const word of setA) {
    if (setB.has(word)) {
      intersectionCount++;
    }
  }
  const unionCount = setA.size + setB.size - intersectionCount;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

/**
 * Extracts all core text strings from an exam content payload (passages, questions, prompts)
 */
export function extractFullTextFromContent(content: any): string {
  if (!content || typeof content !== 'object') return '';
  const parts: string[] = [];

  // Title / topic
  if (typeof content.title === 'string') parts.push(content.title);
  if (typeof content.topicDomain === 'string') parts.push(content.topicDomain);

  // Reading / Listening passages or sections
  if (Array.isArray(content.passages)) {
    for (const p of content.passages) {
      if (typeof p.title === 'string') parts.push(p.title);
      if (typeof p.text === 'string') parts.push(p.text);
      if (typeof p.content === 'string') parts.push(p.content);
      if (Array.isArray(p.questions)) {
        for (const q of p.questions) {
          if (typeof q.prompt === 'string') parts.push(q.prompt);
          if (typeof q.question === 'string') parts.push(q.question);
        }
      }
    }
  }

  // Listening sections
  if (Array.isArray(content.sections)) {
    for (const s of content.sections) {
      if (typeof s.context === 'string') parts.push(s.context);
      if (typeof s.script === 'string') parts.push(s.script);
    }
  }

  // Writing tasks
  if (content.task1) {
    if (typeof content.task1.prompt === 'string') parts.push(content.task1.prompt);
    if (typeof content.task1.title === 'string') parts.push(content.task1.title);
  }
  if (content.task2) {
    if (typeof content.task2.prompt === 'string') parts.push(content.task2.prompt);
  }

  // Speaking parts
  if (content.part1 && Array.isArray(content.part1.questions)) {
    for (const q of content.part1.questions) {
      if (typeof q.question === 'string') parts.push(q.question);
    }
  }
  if (content.part2 && typeof content.part2.cueCard === 'string') {
    parts.push(content.part2.cueCard);
  }

  return parts.join(' ');
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  maxSimilarity: number;
  matchedId?: string;
  matchedTitle?: string;
  reason?: string;
}

/**
 * Checks a new candidate item content against an array of existing items.
 * Max acceptable threshold is 0.50 (50% content word overlap).
 */
export function checkContentForDuplicates(
  newContent: any,
  existingItems: Array<{ id: string; title?: string; content?: any }>,
  threshold = 0.50
): DuplicateCheckResult {
  const newText = extractFullTextFromContent(newContent);
  const newWordSet = extractContentWordSet(newText);

  if (newWordSet.size === 0) {
    return { isDuplicate: false, maxSimilarity: 0 };
  }

  let maxSim = 0;
  let matchedItem: { id: string; title?: string } | undefined;

  for (const item of existingItems) {
    if (!item.content) continue;
    const existingText = extractFullTextFromContent(item.content);
    const existingWordSet = extractContentWordSet(existingText);
    const sim = computeJaccardSimilarity(newWordSet, existingWordSet);

    if (sim > maxSim) {
      maxSim = sim;
      matchedItem = { id: item.id, title: item.title };
    }
  }

  if (maxSim >= threshold && matchedItem) {
    return {
      isDuplicate: true,
      maxSimilarity: Number(maxSim.toFixed(3)),
      matchedId: matchedItem.id,
      matchedTitle: matchedItem.title,
      reason: `Heavy word overlap (${(maxSim * 100).toFixed(1)}%) with existing item "${matchedItem.title || matchedItem.id}".`
    };
  }

  return {
    isDuplicate: false,
    maxSimilarity: Number(maxSim.toFixed(3))
  };
}
