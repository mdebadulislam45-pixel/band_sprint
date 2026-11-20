import { MOCK_EXAM_SETS } from '../src/data/mockExams.js';

console.log("=== MOCK_EXAM_SETS BREAKDOWN ===");
MOCK_EXAM_SETS.forEach((m, idx) => {
  console.log(`\n[Mock Exam ${idx + 1}] ID: "${m.id}" | Title: "${m.title}"`);
  console.log(`  Total Questions in questions array: ${m.questions?.length || 0}`);
  
  const lisQs = m.questions?.filter((q: any) => q.section === 'listening') || [];
  const readQs = m.questions?.filter((q: any) => q.section === 'reading') || [];
  
  console.log(`  - Listening Qs: ${lisQs.length} (IDs: ${lisQs.map((q: any) => q.id).join(', ')})`);
  console.log(`  - Reading Qs: ${readQs.length} (IDs: ${readQs.map((q: any) => q.id).join(', ')})`);
  console.log(`  - Listening Script length: ${m.listeningScript ? m.listeningScript.length : 0} chars (~${m.listeningScript ? m.listeningScript.split(/\s+/).length : 0} words)`);
  console.log(`  - Reading Passage length: ${m.readingPassage ? m.readingPassage.length : 0} chars (~${m.readingPassage ? m.readingPassage.split(/\s+/).length : 0} words)`);
  console.log(`  - Writing Task 1 Prompt: ${m.task1Prompt ? 'Present' : 'Missing'}`);
  console.log(`  - Writing Task 2 Prompt: ${m.writingPrompt ? 'Present' : 'Missing'}`);
  console.log(`  - Speaking Topics in set: ${m.speakingTopics ? m.speakingTopics.length : 0}`);
});

