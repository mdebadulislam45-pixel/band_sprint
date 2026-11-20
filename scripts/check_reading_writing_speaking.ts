import { generateReadingModule, generateWritingModule, generateSpeakingModule } from '../src/data/sprintTestGenerator.js';

console.log("=== CHECKING GENERATED READING, WRITING & SPEAKING ACROSS VOLUMES ===");

[11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].forEach(vol => {
  const rMod = generateReadingModule(vol, 'Academic', 1);
  const wMod = generateWritingModule(vol, 'Academic', 1);
  const sMod = generateSpeakingModule(vol, 1);

  console.log(`\n--- Volume ${vol} Academic Test 1 ---`);
  console.log(`Reading Passage 1 Title: "${rMod.passages[0]?.title}" | Passage 1 snippet: "${rMod.passages[0]?.content?.substring(0, 100)}..."`);
  console.log(`Reading Passage 1 Q1: "${rMod.passages[0]?.questions[0]?.question || rMod.passages[0]?.questions[0]?.prompt}"`);
  
  console.log(`Writing Task 1 Prompt: "${wMod.tasks[0]?.prompt?.substring(0, 100)}..."`);
  console.log(`Writing Task 2 Prompt: "${wMod.tasks[1]?.prompt?.substring(0, 100)}..."`);

  console.log(`Speaking Part 1 Q1: "${sMod.parts[0]?.questions[0]?.question || sMod.parts[0]?.questions[0]?.prompt}"`);
  console.log(`Speaking Part 2 Cue Card Topic: "${sMod.parts[1]?.questions[0]?.prompt || sMod.parts[1]?.questions[0]?.title}"`);
});

