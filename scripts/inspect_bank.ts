import { EXPANDED_LISTENING_QUESTIONS } from '../src/data/listeningQuestionBank.js';
import { MOCK_EXAM_SETS } from '../src/data/mockExams.js';
import { COMPREHENSIVE_QUESTION_BANK, ALL_INITIAL_QUESTIONS } from '../src/data/comprehensiveQuestionBank.js';
import { IELTS_QUESTION_BANK } from '../src/data/ieltsQuestionBankData.js';
import { CAMBRIDGE_VOLUMES_CATALOGUE, CAMBRIDGE_COMPLETE_CATALOGUE, getAllSprintTests } from '../src/data/sprintLibraryData.js';
import { PART_1_SPEAKING_BANK, PART_2_CUE_CARD_BANK, PART_3_DISCUSSION_BANK } from '../src/data/speakingComprehensiveBank.js';

console.log("=== COMPREHENSIVE DATASETS INSPECTION ===");

// 1. Mock Exams Analysis
console.log("\n==========================================");
console.log("1. MOCK_EXAM_SETS (src/data/mockExams.ts)");
console.log("==========================================");
console.log(`Total Mock Exam Sets: ${MOCK_EXAM_SETS.length}`);

MOCK_EXAM_SETS.forEach((exam, idx) => {
  console.log(`\n--- Exam ${idx + 1}: ID "${exam.id}" | "${exam.title}" ---`);
  
  // Listening
  if (exam.listening) {
    const l = exam.listening;
    console.log(`  [LISTENING] Title: "${l.title}" | Total Sections: ${l.sections?.length || 0}`);
    let totalQs = 0;
    let totalSecAudioDur = 0;
    l.sections?.forEach((sec: any, sIdx: number) => {
      const qCount = sec.questions?.length || 0;
      totalQs += qCount;
      const dur = sec.audioDuration || sec.durationSeconds || 0;
      totalSecAudioDur += dur;
      console.log(`    Section ${sIdx + 1} (${sec.id}): ${qCount} Qs | Audio Duration: ${dur}s (${(dur/60).toFixed(1)} min) | Audio URL/Path: ${sec.audioUrl || sec.audioPath || 'None'}`);
      console.log(`      Title: "${sec.title}" | Format: ${sec.format || 'N/A'}`);
      if (sec.audioScript) {
        console.log(`      Script length: ${sec.audioScript.length} chars | Words ~ ${sec.audioScript.split(/\s+/).length}`);
      } else {
        console.log(`      Script: MISSING`);
      }
    });
    console.log(`    -> TOTAL LISTENING: ${totalQs} Questions | ${(totalSecAudioDur/60).toFixed(1)} Minutes Audio`);
  } else {
    console.log(`  [LISTENING] MISSING`);
  }

  // Reading
  if (exam.reading) {
    const r = exam.reading;
    console.log(`  [READING] Title: "${r.title}" | Passages: ${r.passages?.length || 0}`);
    let totalQs = 0;
    r.passages?.forEach((p: any, pIdx: number) => {
      const qCount = p.questions?.length || 0;
      totalQs += qCount;
      const wordCount = p.content ? p.content.split(/\s+/).length : 0;
      console.log(`    Passage ${pIdx + 1}: ${qCount} Qs | Word Count: ${wordCount} words | Title: "${p.title}"`);
    });
    console.log(`    -> TOTAL READING: ${totalQs} Questions`);
  } else {
    console.log(`  [READING] MISSING`);
  }

  // Writing
  if (exam.writing) {
    const w = exam.writing;
    console.log(`  [WRITING] Tasks: ${w.tasks?.length || 0}`);
    w.tasks?.forEach((t: any, tIdx: number) => {
      console.log(`    Task ${tIdx + 1}: type="${t.type}" | prompt length=${t.prompt?.length || 0} chars | chartType=${t.chartType || 'N/A'}`);
    });
  } else {
    console.log(`  [WRITING] MISSING`);
  }

  // Speaking
  if (exam.speaking) {
    const s = exam.speaking;
    console.log(`  [SPEAKING] Parts: ${s.parts?.length || 0}`);
    s.parts?.forEach((pt: any, ptIdx: number) => {
      console.log(`    Part ${ptIdx + 1}: ${pt.questions?.length || 0} Qs / cues`);
    });
  } else {
    console.log(`  [SPEAKING] MISSING`);
  }
});

// 2. Sprint Complete Catalogue & Tests
console.log("\n==========================================");
console.log("2. CAMBRIDGE LIBRARY (src/data/sprintLibraryData.ts)");
console.log("==========================================");
const allCambTests = getAllSprintTests();
console.log(`Total Sprint Test Sets in Library: ${allCambTests.length}`);

allCambTests.forEach((ct, idx) => {
  console.log(`\n--- Sprint Test ${idx + 1}: ID "${ct.id}" | "${ct.title}" ---`);
  ['listening', 'reading', 'writing', 'speaking'].forEach(modKey => {
    const mod = (ct as any)[modKey];
    if (mod) {
      const sections = mod.sections || mod.passages || mod.tasks || mod.parts || [];
      console.log(`  Module [${modKey}]: ${sections.length} sub-units`);
      if (modKey === 'listening') {
        let totalQs = 0;
        let totalDur = 0;
        sections.forEach((sec: any, sIdx: number) => {
          const qCount = sec.questions?.length || 0;
          totalQs += qCount;
          const dur = sec.audioDuration || sec.durationSeconds || 0;
          totalDur += dur;
          console.log(`      Section ${sIdx + 1}: ${qCount} Qs | Audio Duration: ${dur}s (${(dur/60).toFixed(1)}m) | audioUrl=${sec.audioUrl || sec.audioPath || 'None'}`);
        });
        console.log(`      -> TOTAL LISTENING: ${totalQs} Qs | ${(totalDur/60).toFixed(1)} min audio`);
      }
    }
  });
});

// 3. Flat Question Banks Analysis
console.log("\n==========================================");
console.log("3. FLAT QUESTION BANKS");
console.log("==========================================");
console.log(`EXPANDED_LISTENING_QUESTIONS: ${EXPANDED_LISTENING_QUESTIONS?.length || 0} items`);
console.log(`IELTS_QUESTION_BANK: ${IELTS_QUESTION_BANK?.length || 0} items`);
console.log(`COMPREHENSIVE_QUESTION_BANK: ${COMPREHENSIVE_QUESTION_BANK?.length || 0} items`);
console.log(`ALL_INITIAL_QUESTIONS: ${ALL_INITIAL_QUESTIONS?.length || 0} items`);
console.log(`PART_1_SPEAKING_BANK: ${PART_1_SPEAKING_BANK?.length || 0} items`);
console.log(`PART_2_CUE_CARD_BANK: ${PART_2_CUE_CARD_BANK?.length || 0} items`);
console.log(`PART_3_DISCUSSION_BANK: ${PART_3_DISCUSSION_BANK?.length || 0} items`);

