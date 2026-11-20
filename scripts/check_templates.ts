import { generateListeningModule, generateReadingModule, generateWritingModule, generateSpeakingModule } from '../src/data/sprintTestGenerator.js';

console.log("=== CHECKING GENERATED QUESTION TEMPLATES ACROSS VOLUMES ===");

[11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].forEach(vol => {
  const lMod = generateListeningModule(vol, 'Academic', 1);
  console.log(`\n--- Volume ${vol} Academic Test 1 Listening ---`);
  
  // Part 1 Questions 1 to 3
  if (lMod.parts && lMod.parts[0]) {
    const p1 = lMod.parts[0];
    console.log(`Part 1 Title: "${p1.title}"`);
    console.log(`Part 1 Q1: "${p1.questions[0]?.question}" | Answer: "${p1.questions[0]?.correctAnswer}"`);
    console.log(`Part 1 Q2: "${p1.questions[1]?.question}" | Answer: "${p1.questions[1]?.correctAnswer}"`);
    console.log(`Part 1 Dialogue Line 1: "${p1.dialogue[0]?.text}"`);
    console.log(`Part 1 Dialogue Line 2: "${p1.dialogue[1]?.text}"`);
  } else if (lMod.sections && lMod.sections[0]) {
    const s1 = lMod.sections[0];
    console.log(`Section 1 Title: "${s1.title}"`);
    console.log(`Section 1 Q1: "${s1.questions[0]?.question}" | Answer: "${s1.questions[0]?.correctAnswer}"`);
    console.log(`Section 1 Script snippet: "${s1.audioScript?.substring(0, 120)}..."`);
  }
});

