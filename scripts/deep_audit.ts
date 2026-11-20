import { EXPANDED_LISTENING_QUESTIONS, LISTENING_PRACTICE_TESTS } from '../src/data/listeningQuestionBank.js';
import { MOCK_EXAM_SETS } from '../src/data/mockExams.js';
import { COMPREHENSIVE_QUESTION_BANK, ALL_INITIAL_QUESTIONS } from '../src/data/comprehensiveQuestionBank.js';
import { IELTS_QUESTION_BANK } from '../src/data/ieltsQuestionBankData.js';
import { CAMBRIDGE_COMPLETE_CATALOGUE, getAllSprintTests } from '../src/data/sprintLibraryData.js';
import { PART_1_SPEAKING_BANK, PART_2_CUE_CARD_BANK, PART_3_DISCUSSION_BANK } from '../src/data/speakingComprehensiveBank.js';
import { generateListeningModule, generateReadingModule, generateWritingModule, generateSpeakingModule } from '../src/data/sprintTestGenerator.js';

console.log("=== DEEP AUDIT OF IELTS SPRINT CONTENT SYSTEM ===");

// 1. LISTENING PRACTICE TESTS & MOCK EXAMS LISTENING
console.log("\n==========================================");
console.log("1. LISTENING AUDIO & SECTION DETAILED AUDIT");
console.log("==========================================");

console.log("\n--- A. Static Listening Practice Tests (LISTENING_PRACTICE_TESTS) ---");
LISTENING_PRACTICE_TESTS.forEach((t: any, idx: number) => {
  console.log(`\nTest #${idx + 1} | ID: "${t.id}" | Title: "${t.title}" | Track: ${t.track}`);
  let totalDur = 0;
  let totalQs = 0;
  t.sections.forEach((sec: any, sIdx: number) => {
    const qCount = sec.questions?.length || 0;
    const dur = sec.audioDuration || sec.durationSeconds || 0;
    totalDur += dur;
    totalQs += qCount;
    const scriptLen = sec.audioScript ? sec.audioScript.length : 0;
    const wordCount = sec.audioScript ? sec.audioScript.split(/\s+/).filter(Boolean).length : 0;
    console.log(`  Section ${sIdx + 1} (${sec.id}): ${qCount} Qs | Audio Dur: ${dur}s (${(dur/60).toFixed(1)}m) | Script: ${wordCount} words (${scriptLen} chars)`);
    if (sec.audioScript) {
      console.log(`    Script preview: "${sec.audioScript.substring(0, 80).replace(/\n/g, ' ')}..."`);
    } else {
      console.log(`    WARNING: No audio script attached!`);
    }
  });
  console.log(`  SUMMARY: ${totalQs} total Qs | ${(totalDur/60).toFixed(1)} min audio`);
});

console.log("\n--- B. Mock Exam Sets Listening (MOCK_EXAM_SETS) ---");
MOCK_EXAM_SETS.forEach((exam: any, idx: number) => {
  console.log(`\nMock Exam #${idx + 1} | ID: "${exam.id}" | Title: "${exam.title}"`);
  if (exam.listening) {
    let totalDur = 0;
    let totalQs = 0;
    exam.listening.sections?.forEach((sec: any, sIdx: number) => {
      const qCount = sec.questions?.length || 0;
      const dur = sec.audioDuration || sec.durationSeconds || 0;
      totalDur += dur;
      totalQs += qCount;
      const scriptLen = sec.audioScript ? sec.audioScript.length : 0;
      const wordCount = sec.audioScript ? sec.audioScript.split(/\s+/).filter(Boolean).length : 0;
      console.log(`  Section ${sIdx + 1} (${sec.id}): ${qCount} Qs | Audio Dur: ${dur}s (${(dur/60).toFixed(1)}m) | Script: ${wordCount} words`);
    });
    console.log(`  SUMMARY: ${totalQs} total Qs | ${(totalDur/60).toFixed(1)} min audio`);
  } else {
    console.log(`  WARNING: No Listening module present in Mock Exam`);
  }
});

console.log("\n--- C. Dynamically Generated Sprint Listening (sprintTestGenerator.ts) ---");
for (let vol = 1; vol <= 3; vol++) {
  const generatedL = generateListeningModule(vol, 1);
  console.log(`Generated Sprint Vol ${vol} Test 1 Listening:`);
  let gDur = 0;
  let gQs = 0;
  generatedL.sections.forEach((sec: any, sIdx: number) => {
    const qCount = sec.questions?.length || 0;
    const dur = sec.audioDuration || sec.durationSeconds || 0;
    gDur += dur;
    gQs += qCount;
    const wordCount = sec.audioScript ? sec.audioScript.split(/\s+/).filter(Boolean).length : 0;
    console.log(`  Section ${sIdx + 1}: ${qCount} Qs | Audio Dur: ${dur}s (${(dur/60).toFixed(1)}m) | Script: ${wordCount} words`);
  });
  console.log(`  SUMMARY: ${gQs} total Qs | ${(gDur/60).toFixed(1)} min audio`);
}

// 2. DUPLICATION & QUESTION REPETITION AUDIT
console.log("\n==========================================");
console.log("2. DUPLICATION & QUESTION REPETITION AUDIT");
console.log("==========================================");

function normalizeText(txt: string): string {
  return txt.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

function getNGrams(txt: string, n = 3): Set<string> {
  const words = normalizeText(txt).split(/\s+/).filter(Boolean);
  const nGrams = new Set<string>();
  for (let i = 0; i <= words.length - n; i++) {
    nGrams.add(words.slice(i, i + n).join(' '));
  }
  return nGrams;
}

function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  setA.forEach(item => {
    if (setB.has(item)) intersection++;
  });
  const union = setA.size + setB.size - intersection;
  return intersection / union;
}

// Collect all questions across all pools
interface ExtractedQuestion {
  source: string;
  id: string;
  question: string;
  passageOrContext?: string;
  options?: string[];
  answer?: string;
  type?: string;
}

const allQuestions: ExtractedQuestion[] = [];

// From MOCK_EXAM_SETS
MOCK_EXAM_SETS.forEach(exam => {
  exam.listening?.sections?.forEach((sec: any) => {
    sec.questions?.forEach((q: any) => {
      allQuestions.push({ source: `Mock:${exam.id}:L`, id: q.id, question: q.question || q.prompt || '', options: q.options, answer: q.answer, type: q.type });
    });
  });
  exam.reading?.passages?.forEach((p: any) => {
    p.questions?.forEach((q: any) => {
      allQuestions.push({ source: `Mock:${exam.id}:R`, id: q.id, question: q.question || q.prompt || '', passageOrContext: p.title, options: q.options, answer: q.answer, type: q.type });
    });
  });
});

// From LISTENING_PRACTICE_TESTS
LISTENING_PRACTICE_TESTS.forEach(t => {
  t.sections.forEach(sec => {
    sec.questions.forEach(q => {
      allQuestions.push({ source: `ListeningTest:${t.id}`, id: q.id, question: q.question || q.prompt || '', options: q.options, answer: q.answer, type: q.type });
    });
  });
});

// From COMPREHENSIVE_QUESTION_BANK
COMPREHENSIVE_QUESTION_BANK.forEach(q => {
  allQuestions.push({ source: 'ComprehensiveBank', id: q.id, question: q.question || q.prompt || '', options: q.options, answer: q.answer, type: q.type });
});

// From IELTS_QUESTION_BANK
IELTS_QUESTION_BANK.forEach(q => {
  allQuestions.push({ source: 'IeltsQuestionBank', id: q.id, question: q.question || q.prompt || '', options: q.options, answer: (q as any).correctAnswer, type: q.type });
});

console.log(`Total questions extracted for cross-duplicate analysis: ${allQuestions.length}`);

// Check exact duplicate question strings
const questionMap = new Map<string, ExtractedQuestion[]>();
allQuestions.forEach(q => {
  const norm = normalizeText(q.question);
  if (!norm) return;
  if (!questionMap.has(norm)) {
    questionMap.clear; // no-op
    questionMap.set(norm, []);
  }
  questionMap.get(norm)!.push(q);
});

let exactDupCount = 0;
console.log("\n--- Exact Duplicate Question Strings Across Pools ---");
questionMap.forEach((qList, norm) => {
  if (qList.length > 1) {
    exactDupCount++;
    if (exactDupCount <= 15) {
      console.log(`\nDuplicate #${exactDupCount} (${qList.length} occurrences): "${qList[0].question}"`);
      qList.forEach(item => {
        console.log(`  - Source: ${item.source} | ID: ${item.id} | Answer: ${item.answer}`);
      });
    }
  }
});
console.log(`\nTotal Exact Duplicate Question Clusters: ${exactDupCount}`);

// 3. READING PASSAGES & QUESTION GENERATION AUDIT
console.log("\n==========================================");
console.log("3. READING PASSAGES & GENERATOR AUDIT");
console.log("==========================================");

MOCK_EXAM_SETS.forEach((exam, idx) => {
  if (exam.reading) {
    console.log(`\nMock Exam #${idx + 1} Reading Passages:`);
    exam.reading.passages.forEach((p, pIdx) => {
      const words = p.content ? p.content.split(/\s+/).filter(Boolean).length : 0;
      console.log(`  Passage ${pIdx + 1}: "${p.title}" | ${words} words | ${p.questions?.length || 0} Questions`);
    });
  }
});

for (let vol = 1; vol <= 3; vol++) {
  const genReading = generateReadingModule(vol, 1, 'academic');
  console.log(`\nGenerated Sprint Vol ${vol} Academic Test 1 Reading:`);
  genReading.passages.forEach((p: any, pIdx: number) => {
    const words = p.content ? p.content.split(/\s+/).filter(Boolean).length : 0;
    console.log(`  Passage ${pIdx + 1}: "${p.title}" | ${words} words | ${p.questions?.length || 0} Questions`);
  });
}

// 4. WRITING TASKS AUDIT
console.log("\n==========================================");
console.log("4. WRITING PROMPTS AUDIT");
console.log("==========================================");

MOCK_EXAM_SETS.forEach((exam, idx) => {
  if (exam.writing) {
    console.log(`\nMock Exam #${idx + 1} Writing Tasks:`);
    exam.writing.tasks.forEach((t, tIdx) => {
      console.log(`  Task ${tIdx + 1} (${t.type}): chartType="${t.chartType || 'N/A'}" | Prompt: "${t.prompt?.substring(0, 100)}..."`);
    });
  }
});

for (let vol = 1; vol <= 3; vol++) {
  const genWriting = generateWritingModule(vol, 1, 'academic');
  console.log(`\nGenerated Sprint Vol ${vol} Academic Writing:`);
  genWriting.tasks.forEach((t: any, tIdx: number) => {
    console.log(`  Task ${tIdx + 1} (${t.type}): chartType="${t.chartType || 'N/A'}" | Prompt: "${t.prompt?.substring(0, 100)}..."`);
  });
}

// 5. SPEAKING COMPREHENSIVE BANK AUDIT
console.log("\n==========================================");
console.log("5. SPEAKING COMPREHENSIVE BANK AUDIT");
console.log("==========================================");
console.log(`Part 1 Topics / Questions: ${PART_1_SPEAKING_BANK.length}`);
console.log(`Part 2 Cue Cards: ${PART_2_CUE_CARD_BANK.length}`);
console.log(`Part 3 Discussion Prompts: ${PART_3_DISCUSSION_BANK.length}`);

