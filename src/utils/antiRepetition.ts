// Anti-Repetition & Dynamic Question Selection Engine for BandSprint
// Tracks question history across sessions to ensure every test attempt features fresh content

const SEEN_QUESTIONS_KEY = 'ielts_seen_question_ids_v1';
const QUESTION_TIMESTAMP_KEY = 'ielts_question_history_timestamps_v1';

export interface QuestionHistoryEntry {
  questionId: string;
  timestamp: number;
  timesSeen: number;
}

/**
 * Retrieves the list of question IDs previously attempted by the candidate
 */
export function getSeenQuestionIds(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_QUESTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Records that a question was viewed / attempted by the user
 */
export function recordSeenQuestion(questionId: string): void {
  try {
    const seen = new Set(getSeenQuestionIds());
    seen.add(questionId);
    localStorage.setItem(SEEN_QUESTIONS_KEY, JSON.stringify(Array.from(seen)));

    // Track timestamp history for least-recently-used recycling
    const timestampsRaw = localStorage.getItem(QUESTION_TIMESTAMP_KEY);
    const history: Record<string, { lastSeen: number; count: number }> = timestampsRaw
      ? JSON.parse(timestampsRaw)
      : {};

    const prev = history[questionId] || { lastSeen: 0, count: 0 };
    history[questionId] = {
      lastSeen: Date.now(),
      count: prev.count + 1
    };
    localStorage.setItem(QUESTION_TIMESTAMP_KEY, JSON.stringify(history));
  } catch (err) {
    console.error('Failed to record question view:', err);
  }
}

/**
 * Bulk records an array of seen question IDs
 */
export function recordSeenQuestions(questionIds: string[]): void {
  questionIds.forEach(id => recordSeenQuestion(id));
}

/**
 * Intelligently selects fresh, non-repetitive items from a pool
 * Prioritizes:
 * 1. Completely unseen questions
 * 2. Questions seen the least number of times
 * 3. Least-recently-seen questions
 */
export function selectFreshQuestions<T extends { id: string }>(
  pool: T[],
  count: number,
  options?: {
    balanceTopic?: (item: T) => string;
    shuffle?: boolean;
  }
): T[] {
  if (!pool || pool.length === 0) return [];
  if (pool.length <= count) {
    return options?.shuffle ? shuffleArray([...pool]) : [...pool];
  }

  const seenIds = new Set(getSeenQuestionIds());
  let timestamps: Record<string, { lastSeen: number; count: number }> = {};
  try {
    const raw = localStorage.getItem(QUESTION_TIMESTAMP_KEY);
    if (raw) timestamps = JSON.parse(raw);
  } catch {}

  // Partition into unseen and seen
  const unseen = pool.filter(item => !seenIds.has(item.id));
  const seen = pool.filter(item => seenIds.has(item.id));

  // Sort seen by least seen count, then oldest timestamp
  seen.sort((a, b) => {
    const statA = timestamps[a.id] || { lastSeen: 0, count: 0 };
    const statB = timestamps[b.id] || { lastSeen: 0, count: 0 };
    if (statA.count !== statB.count) {
      return statA.count - statB.count;
    }
    return statA.lastSeen - statB.lastSeen;
  });

  const selected: T[] = [];

  // If topic balancing is requested
  if (options?.balanceTopic) {
    const topicExtractor = options.balanceTopic;
    const poolByTopic: Record<string, T[]> = {};

    // Group unseen by topic
    shuffleArray(unseen).forEach(item => {
      const topic = topicExtractor(item) || 'general';
      if (!poolByTopic[topic]) poolByTopic[topic] = [];
      poolByTopic[topic].push(item);
    });

    const topics = Object.keys(poolByTopic);
    let topicIdx = 0;

    while (selected.length < count && topics.length > 0) {
      const currentTopic = topics[topicIdx % topics.length];
      const itemsInTopic = poolByTopic[currentTopic];

      if (itemsInTopic && itemsInTopic.length > 0) {
        selected.push(itemsInTopic.pop()!);
      } else {
        topics.splice(topicIdx % topics.length, 1);
        continue;
      }
      topicIdx++;
    }
  } else {
    // Take as many unseen as available
    selected.push(...shuffleArray(unseen).slice(0, count));
  }

  // If we still need more questions, recycle least-recently-seen
  if (selected.length < count) {
    const needed = count - selected.length;
    selected.push(...seen.slice(0, needed));
  }

  return options?.shuffle !== false ? shuffleArray(selected) : selected;
}

/**
 * Standard Fisher-Yates array shuffler
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Resets candidate question history if requested
 */
export function resetQuestionHistory(): void {
  try {
    localStorage.removeItem(SEEN_QUESTIONS_KEY);
    localStorage.removeItem(QUESTION_TIMESTAMP_KEY);
  } catch {}
}
