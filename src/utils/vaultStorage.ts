import { MistakeItem } from '../types';

const VAULT_KEY = 'ielts_sprint_mistake_vault_v1';

/**
 * Sanitizes and validates a mistake item to prevent any undefined/null field rendering crashes
 */
function sanitizeMistakeItem(raw: any, index: number): MistakeItem | null {
  if (!raw || typeof raw !== 'object') return null;

  const validModules = ['listening', 'reading', 'writing', 'speaking', 'vocab'] as const;
  let rawModule = typeof raw.module === 'string' ? raw.module.toLowerCase().trim() : 'vocab';
  if (!validModules.includes(rawModule as any)) {
    rawModule = 'vocab';
  }

  let parsedTimestamp = typeof raw.timestamp === 'number' && !isNaN(raw.timestamp) ? raw.timestamp : Date.now();
  if (parsedTimestamp <= 0) parsedTimestamp = Date.now();

  const isMastered = Boolean(raw.mastered) || raw.status === 'mastered';
  const rawUserAnswer = typeof raw.userAnswer === 'string' ? raw.userAnswer : (raw.userAnswer != null ? String(raw.userAnswer) : '—');

  const repetition = typeof raw.repetition === 'number' && !isNaN(raw.repetition) ? raw.repetition : 0;
  const intervalDays = typeof raw.intervalDays === 'number' && !isNaN(raw.intervalDays) ? raw.intervalDays : 0;
  const easeFactor = typeof raw.easeFactor === 'number' && !isNaN(raw.easeFactor) ? raw.easeFactor : 2.5;
  const nextReviewAt = typeof raw.nextReviewAt === 'number' && !isNaN(raw.nextReviewAt) ? raw.nextReviewAt : parsedTimestamp;
  const lastReviewedAt = typeof raw.lastReviewedAt === 'number' && !isNaN(raw.lastReviewedAt) ? raw.lastReviewedAt : undefined;

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `m_${Date.now()}_${index}`,
    timestamp: parsedTimestamp,
    module: rawModule as MistakeItem['module'],
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : 'IELTS Review Item',
    prompt: typeof raw.prompt === 'string' ? raw.prompt.trim() : undefined,
    questionType: typeof raw.questionType === 'string' ? raw.questionType.trim() : undefined,
    userAnswer: rawUserAnswer,
    userWrongAnswer: typeof raw.userWrongAnswer === 'string' ? raw.userWrongAnswer : rawUserAnswer,
    correctAnswer: typeof raw.correctAnswer === 'string' && raw.correctAnswer.trim() ? raw.correctAnswer.trim() : (raw.correctAnswer != null ? String(raw.correctAnswer) : 'Correct Form Required'),
    explanation: typeof raw.explanation === 'string' && raw.explanation.trim() ? raw.explanation.trim() : 'Review Sprint grammar / vocabulary guidelines for this question.',
    trapExplanationEn: typeof raw.trapExplanationEn === 'string' ? raw.trapExplanationEn.trim() : undefined,
    trapExplanationBn: typeof raw.trapExplanationBn === 'string' ? raw.trapExplanationBn.trim() : undefined,
    sourceContext: typeof raw.sourceContext === 'string' ? raw.sourceContext.trim() : undefined,
    status: isMastered ? 'mastered' : 'unresolved',
    mastered: isMastered,
    repetition,
    intervalDays,
    easeFactor,
    nextReviewAt,
    lastReviewedAt
  };
}

export function getMistakes(): MistakeItem[] {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return [];
    
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const sanitized: MistakeItem[] = [];
    parsed.forEach((item, idx) => {
      const clean = sanitizeMistakeItem(item, idx);
      if (clean) sanitized.push(clean);
    });

    return sanitized;
  } catch (err) {
    return [];
  }
}

export function saveMistakes(mistakes: MistakeItem[]): void {
  try {
    const safeList = Array.isArray(mistakes)
      ? mistakes
          .map((m, idx) => sanitizeMistakeItem(m, idx))
          .filter((m): m is MistakeItem => m !== null)
      : [];
    localStorage.setItem(VAULT_KEY, JSON.stringify(safeList));
    window.dispatchEvent(new CustomEvent('vault_updated', { detail: safeList }));
    window.dispatchEvent(new CustomEvent('ielts_mistakes_updated', { detail: safeList }));
  } catch (err) {
    console.warn('[MistakeVault] Storage write failed (quota or private mode):', err);
  }
}

export function addMistake(item: Omit<MistakeItem, 'id' | 'timestamp' | 'mastered' | 'status'> & { status?: 'unresolved' | 'mastered' }): MistakeItem {
  const current = getMistakes();
  
  const safeTitle = typeof item.title === 'string' ? item.title.trim() : 'IELTS Question';
  const safeModule = item.module || 'vocab';
  const safeUserAnswer = typeof item.userAnswer === 'string' ? item.userAnswer : String(item.userAnswer || '—');
  
  const existing = current.find(m => m.title === safeTitle && m.module === safeModule);
  if (existing) {
    existing.userAnswer = safeUserAnswer;
    existing.userWrongAnswer = item.userWrongAnswer || safeUserAnswer;
    existing.correctAnswer = typeof item.correctAnswer === 'string' ? item.correctAnswer : String(item.correctAnswer || '');
    if (item.explanation) existing.explanation = item.explanation;
    if (item.prompt) existing.prompt = item.prompt;
    if (item.questionType) existing.questionType = item.questionType;
    if (item.trapExplanationEn) existing.trapExplanationEn = item.trapExplanationEn;
    if (item.trapExplanationBn) existing.trapExplanationBn = item.trapExplanationBn;
    existing.mastered = false;
    existing.status = 'unresolved';
    existing.repetition = 0;
    existing.intervalDays = 0;
    existing.nextReviewAt = Date.now();
    saveMistakes(current);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bandsprint_mistake_upserted', { detail: existing }));
    }
    return existing;
  }

  const now = Date.now();
  const newMistake: MistakeItem = {
    id: 'm_' + now + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: now,
    module: safeModule,
    title: safeTitle,
    prompt: item.prompt,
    questionType: item.questionType,
    userAnswer: safeUserAnswer,
    userWrongAnswer: item.userWrongAnswer || safeUserAnswer,
    correctAnswer: typeof item.correctAnswer === 'string' ? item.correctAnswer : String(item.correctAnswer || ''),
    explanation: typeof item.explanation === 'string' ? item.explanation : 'Sprint exam review guidance.',
    trapExplanationEn: item.trapExplanationEn,
    trapExplanationBn: item.trapExplanationBn,
    sourceContext: item.sourceContext,
    status: 'unresolved',
    mastered: false,
    repetition: 0,
    intervalDays: 0,
    easeFactor: 2.5,
    nextReviewAt: now
  };

  saveMistakes([newMistake, ...current]);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bandsprint_mistake_upserted', { detail: newMistake }));
  }
  return newMistake;
}

/**
 * SuperMemo SM-2 Spaced Repetition Algorithm
 * quality: 1 (Again - reset), 3 (Hard - 1d), 4 (Good - 3d+), 5 (Easy - 7d+ / Graduate)
 */
export function recordSM2Review(id: string, quality: 1 | 3 | 4 | 5): MistakeItem | null {
  if (!id) return null;
  const current = getMistakes();
  let updatedItem: MistakeItem | null = null;
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  const updated = current.map((m) => {
    if (m.id !== id) return m;

    let rep = m.repetition ?? 0;
    let interval = m.intervalDays ?? 0;
    let ef = m.easeFactor ?? 2.5;

    if (quality < 3) {
      rep = 0;
      interval = 0;
    } else {
      if (rep === 0) {
        interval = quality === 5 ? 4 : quality === 4 ? 2 : 1;
      } else if (rep === 1) {
        interval = quality === 5 ? 7 : quality === 4 ? 4 : 2;
      } else {
        interval = Math.round(interval * ef);
      }
      rep += 1;
    }

    ef = Math.max(1.3, ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
    const nextReviewAt = interval === 0 ? now + 60 * 1000 : now + interval * DAY_MS;
    const isGraduated = rep >= 3 || (quality === 5 && rep >= 2);

    updatedItem = {
      ...m,
      repetition: rep,
      intervalDays: interval,
      easeFactor: Number(ef.toFixed(2)),
      lastReviewedAt: now,
      nextReviewAt,
      mastered: isGraduated,
      status: isGraduated ? 'mastered' : 'unresolved'
    };
    return updatedItem;
  });

  saveMistakes(updated);
  if (updatedItem && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bandsprint_mistake_upserted', { detail: updatedItem }));
  }
  return updatedItem;
}

export function getDueMistakes(): MistakeItem[] {
  const now = Date.now();
  return getMistakes().filter((m) => !m.mastered && (m.nextReviewAt ?? 0) <= now);
}

export function seedHighYieldSampleMistakes(): MistakeItem[] {
  const samples: Array<Omit<MistakeItem, 'id' | 'timestamp' | 'mastered' | 'status'>> = [
    {
      module: 'listening',
      title: 'Section 1 Self-Correction Trap: Postcode & Number Reversal',
      prompt: 'Customer says: "My postcode is MK4 9TJ... oh wait, apologies, that was my previous flat—it is MK4 8TR."',
      questionType: 'Form Completion (Self-Correction)',
      userAnswer: 'MK4 9TJ',
      userWrongAnswer: 'MK4 9TJ',
      correctAnswer: 'MK4 8TR',
      explanation: 'In IELTS Listening Part 1, speakers frequently state an initial number or postcode and immediately self-correct using signal words like "apologies" or "actually". Always wait for confirmation.',
      trapExplanationEn: 'Sprint Section 1 examiners test whether you prematurely write the first code you hear ("MK4 9TJ"). Listen for contrast markers ("oh wait, apologies") that invalidate the distractor.',
      trapExplanationBn: 'IELTS Listening Section 1-এ বক্তা প্রায়ই প্রথমে একটি ভুল নম্বর বা পোস্টকোড বলে পরক্ষণেই "oh wait, apologies" বা "actually" বলে সঠিক উত্তরটি দেন। তাই প্রথম তথ্যটি শুনেই তাড়াহুড়ো করবেন না!'
    },
    {
      module: 'reading',
      title: 'TFNG Extreme Qualifier Trap: "Exclusively" vs "Primarily"',
      prompt: 'Statement: "Rewilding projects exclusively focus on reintroducing apex predators into rural habitats."',
      questionType: 'True / False / Not Given',
      userAnswer: 'TRUE',
      userWrongAnswer: 'TRUE',
      correctAnswer: 'FALSE',
      explanation: 'The passage states rewilding is "far from being limited to apex predators" and encompasses dam removal and reforestation. Extreme qualifiers ("exclusively", "solely", "never") usually signal a FALSE trap.',
      trapExplanationEn: 'Watch out for absolute adverbs like "exclusively", "only", or "universally". Because the passage explicitly lists other methods (dam removal, river meanders), the statement directly contradicts the text → FALSE.',
      trapExplanationBn: 'প্রশ্নে "exclusively" (শুধুমাত্র) বা "only" থাকলে সতর্ক হোন! প্যাসেজে স্পষ্টভাবে বলা আছে যে রিউইল্ডিং কেবল শিকারি প্রাণী ফিরিয়ে আনার মধ্যে সীমাবদ্ধ নয়—তাই তথ্যটি সরাসরি বিরোধী এবং সঠিক উত্তর FALSE।'
    },
    {
      module: 'writing',
      title: 'Coherence & Cohesion Trap: Mechanical Linker Stacking',
      prompt: 'Candidate sentence: "Furthermore, on the other hand, if university is free for every students, taxpayers will suffer."',
      questionType: 'Grammatical Range & Cohesion (CC/GRA)',
      userAnswer: 'Furthermore, on the other hand, if university is free for every students...',
      userWrongAnswer: 'Furthermore, on the other hand, if university is free for every students...',
      correctAnswer: 'Conversely, unconditional state funding for all prospective undergraduates imposes a heavy fiscal burden on taxpayers.',
      explanation: 'Never combine additive linkers ("Furthermore") with contrastive linkers ("on the other hand"), and remember "every" takes a singular noun ("every student").',
      trapExplanationEn: 'Stacking "Furthermore" + "on the other hand" is a contradictory discourse error that caps Coherence & Cohesion at Band 6.0. Use "Conversely," and fix "every students" to "all prospective undergraduates".',
      trapExplanationBn: '"Furthermore" (যোগসূত্র) এবং "on the other hand" (বিপরীত সূত্র) একসাথে বসানো মারাত্মক ভুল। এছাড়া "every"-র পরে সিঙ্গুলার নাউন ("every student") বসে। Band 8+ পেতে "Conversely," ব্যবহার করুন।'
    },
    {
      module: 'speaking',
      title: 'Part 3 Lexical Register: Upgrading Conversational Quantifiers',
      prompt: 'Examiner: "How has remote working affected metropolitan city centres?"',
      questionType: 'Lexical Resource (LR C1/C2)',
      userAnswer: 'It has a lot of big effects on small shops in big cities.',
      userWrongAnswer: 'It has a lot of big effects on small shops in big cities.',
      correctAnswer: 'Widespread telecommuting has triggered a profound structural shift across metropolitan retail ecosystems.',
      explanation: 'Replacing vague B1 words ("a lot of big effects", "big cities") with precise C1 collocations ("profound structural shift", "metropolitan retail ecosystems") lifts Lexical Resource from Band 6.0 to Band 8.0+.',
      trapExplanationEn: 'In Speaking Part 3, examiners assess your ability to discuss abstract economic and social phenomena using idiomatic C1/C2 collocations rather than repetitive conversational words like "big" or "a lot of".',
      trapExplanationBn: 'Speaking Part 3-এ সাধারণ "a lot of big effects" না বলে "profound structural shift" এবং "metropolitan retail ecosystems"-এর মতো উন্নত একাডেমিক Collocation ব্যবহার করলে সহজেই Band 8.0+ পাওয়া যায়।'
    }
  ];

  samples.forEach((s) => addMistake(s));
  return getMistakes();
}

export const seedHighYieldMistakes = seedHighYieldSampleMistakes;

export function getVaultRetentionStats(): {
  total: number;
  dueCount: number;
  masteredCount: number;
  learningCount: number;
  retentionRate: number;
} {
  const list = getMistakes();
  const total = list.length;
  if (total === 0) {
    return { total: 0, dueCount: 0, masteredCount: 0, learningCount: 0, retentionRate: 100 };
  }
  const now = Date.now();
  const masteredCount = list.filter((m) => m.mastered).length;
  const dueCount = list.filter((m) => !m.mastered && (m.nextReviewAt ?? 0) <= now).length;
  const learningCount = total - masteredCount;

  const totalRetentionWeight = list.reduce((sum, m) => {
    if (m.mastered) return sum + 1;
    const rep = m.repetition ?? 0;
    if (rep >= 2) return sum + 0.8;
    if (rep === 1) return sum + 0.55;
    return sum + 0.25;
  }, 0);

  const retentionRate = Math.min(100, Math.round((totalRetentionWeight / total) * 100));
  return { total, dueCount, masteredCount, learningCount, retentionRate };
}

export function toggleMastery(id: string): void {
  if (!id) return;
  const current = getMistakes();
  let toggledItem: MistakeItem | null = null;
  const updated = current.map(m => {
    if (m.id === id) {
      const nextMastered = !m.mastered;
      toggledItem = {
        ...m,
        mastered: nextMastered,
        status: nextMastered ? ('mastered' as const) : ('unresolved' as const),
        repetition: nextMastered ? Math.max(3, m.repetition ?? 3) : 0,
        intervalDays: nextMastered ? Math.max(7, m.intervalDays ?? 7) : 0
      };
      return toggledItem;
    }
    return m;
  });
  saveMistakes(updated);
  if (toggledItem && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bandsprint_mistake_upserted', { detail: toggledItem }));
  }
}

export function deleteMistake(id: string): void {
  if (!id) return;
  const current = getMistakes();
  saveMistakes(current.filter(m => m.id !== id));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bandsprint_mistake_deleted', { detail: { id } }));
  }
}

export function clearMistakes(): void {
  saveMistakes([]);
}

export function getUnresolvedMistakesCount(): number {
  const current = getMistakes();
  return current.filter(m => !m.mastered).length;
}

export function getHighestFrequencyErrorCategory(): { category: string; count: number; module: string } | null {
  const unresolved = getMistakes().filter(m => !m.mastered);
  if (unresolved.length === 0) return null;

  const freqMap: Record<string, { count: number; module: string }> = {};

  unresolved.forEach((m) => {
    const categoryName = m.questionType || m.title || 'General Format Trap';
    if (!freqMap[categoryName]) {
      freqMap[categoryName] = { count: 0, module: m.module };
    }
    freqMap[categoryName].count++;
  });

  let topCategory: string | null = null;
  let maxCount = 0;
  let topModule = 'listening';

  Object.entries(freqMap).forEach(([cat, data]) => {
    if (data.count > maxCount) {
      maxCount = data.count;
      topCategory = cat;
      topModule = data.module;
    }
  });

  if (!topCategory) return null;

  return { category: topCategory, count: maxCount, module: topModule };
}

