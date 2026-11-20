import { LISTENING_PRACTICE_TESTS, LISTENING_SECTIONS_DATA } from './src/data/listeningQuestionBank.js';
import { MOCK_EXAMS } from './src/data/mockExams.js';
import { COMPREHENSIVE_QUESTION_BANK } from './src/data/comprehensiveQuestionBank.js';
import { IELTS_QUESTION_BANK_DATA } from './src/data/ieltsQuestionBankData.js';
import { CAMBRIDGE_TESTS_INDEX, CAMBRIDGE_BOOKS } from './src/data/cambridgeLibraryData.js';
import { SPEAKING_CUE_CARDS, SPEAKING_PART_1_TOPICS } from './src/data/speakingComprehensiveBank.js';

console.log("=== DATASETS INSPECTION ===");

// 1. Listening Question Bank
console.log("\n--- listeningQuestionBank.ts ---");
console.log("LISTENING_PRACTICE_TESTS count:", LISTENING_PRACTICE_TESTS ? LISTENING_PRACTICE_TESTS.length : 0);
if (LISTENING_PRACTICE_TESTS) {
  LISTENING_PRACTICE_TESTS.forEach((t: any, idx: number) => {
    console.log(`Test ${idx + 1}: id=${t.id}, title="${t.title}", track=${t.track || 'N/A'}`);
    console.log(`  Sections count: ${t.sections ? t.sections.length : 0}`);
    let totalQuestions = 0;
    let totalDurationSeconds = 0;
    if (t.sections) {
      t.sections.forEach((s: any, sIdx: number) => {
        const qCount = s.questions ? s.questions.length : (s.questionCount || 0);
        totalQuestions += qCount;
        const dur = s.audioDuration || s.durationSeconds || 0;
        totalDurationSeconds += dur;
        console.log(`    Sec ${sIdx + 1} (${s.id || s.title}): ${qCount} questions, audioDuration=${dur}s (${(dur/60).toFixed(1)}m), speakers=${s.speakers ? s.speakers.length : 'unspecified'}`);
      });
    }
    console.log(`  TOTAL: ${totalQuestions} questions, ${(totalDurationSeconds/60).toFixed(1)} min audio`);
  });
}

console.log("\nLISTENING_SECTIONS_DATA count:", LISTENING_SECTIONS_DATA ? Object.keys(LISTENING_SECTIONS_DATA).length : 0);

// 2. Mock Exams
console.log("\n--- mockExams.ts ---");
console.log("MOCK_EXAMS count:", MOCK_EXAMS ? MOCK_EXAMS.length : 0);
if (MOCK_EXAMS) {
  MOCK_EXAMS.forEach((exam: any, idx: number) => {
    console.log(`Exam ${idx + 1}: id=${exam.id}, title="${exam.title}"`);
    ['listening', 'reading', 'writing', 'speaking'].forEach(moduleKey => {
      const mod = exam[moduleKey];
      if (mod) {
        console.log(`  Module [${moduleKey}]: title="${mod.title || ''}", sections/passages/parts=${mod.sections?.length || mod.passages?.length || mod.tasks?.length || mod.parts?.length || 0}`);
        if (moduleKey === 'listening' && mod.sections) {
          let totalLQs = 0;
          let totalLDur = 0;
          mod.sections.forEach((s: any, sIdx: number) => {
            const qCount = s.questions ? s.questions.length : 0;
            totalLQs += qCount;
            totalLDur += s.audioDuration || s.durationSeconds || 0;
            console.log(`      Sec ${sIdx + 1}: ${qCount} Qs, dur=${s.audioDuration || s.durationSeconds || 0}s, audioUrl=${s.audioUrl || s.audioPath || 'none'}`);
          });
          console.log(`      Total Listening: ${totalLQs} Qs, ${(totalLDur/60).toFixed(1)} min audio`);
        }
      } else {
        console.log(`  Module [${moduleKey}]: MISSING`);
      }
    });
  });
}

// 3. Comprehensive Question Bank
console.log("\n--- comprehensiveQuestionBank.ts ---");
console.log("Keys:", Object.keys(COMPREHENSIVE_QUESTION_BANK || {}));
Object.keys(COMPREHENSIVE_QUESTION_BANK || {}).forEach(k => {
  const item = (COMPREHENSIVE_QUESTION_BANK as any)[k];
  console.log(`  Bank [${k}]: count=${Array.isArray(item) ? item.length : typeof item}`);
});

// 4. IELTS Question Bank Data
console.log("\n--- ieltsQuestionBankData.ts ---");
console.log("Keys:", Object.keys(IELTS_QUESTION_BANK_DATA || {}));
Object.keys(IELTS_QUESTION_BANK_DATA || {}).forEach(k => {
  const item = (IELTS_QUESTION_BANK_DATA as any)[k];
  console.log(`  Bank [${k}]: count=${Array.isArray(item) ? item.length : typeof item}`);
});

