import 'dotenv/config';
import { contentPipelineService, setDailyAdminGenerationCap } from '../src/server/contentPipeline/pipelineService.ts';
import { serverDb } from '../src/server/db.ts';

async function main() {
  console.log('=====================================================');
  console.log('   IELTS SPRINT PHASE A: LIVE PILOT GENERATION PASS   ');
  console.log('=====================================================');

  // Requirement 5 & 6: Temporarily raise daily admin generation cap to 35 for the pilot
  setDailyAdminGenerationCap(35);
  console.log('[Pilot Setup] Admin cap raised to 35 for pilot execution.');

  const adminId = (process.env.ADMIN_EMAILS || '').split(',')[0]?.trim() || 'system_pipeline_runner';
  console.log(`[Pilot Setup] Running under Admin ID: ${adminId}`);

  const modelsConfig = contentPipelineService.getModelsConfig();
  console.log(`[Pilot Setup] Generator Model: ${modelsConfig.generatorModel}`);
  console.log(`[Pilot Setup] Solver Model:    ${modelsConfig.solverModel}`);

  const startTime = Date.now();
  const pilot = await contentPipelineService.runPilotGeneration(adminId);
  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);

  // Requirement 6: Set cap back to 25
  setDailyAdminGenerationCap(25);
  console.log(`\n[Pilot Complete] Admin cap reverted back to 25. Elapsed time: ${elapsedSec}s\n`);

  console.log('=====================================================');
  console.log('               RAW PILOT AUDIT EVIDENCE              ');
  console.log('=====================================================');

  // 1. Reading
  console.log('\n-----------------------------------------------------');
  console.log(' 1. ACADEMIC READING TEST (3 PASSAGES, 40 QUESTIONS) ');
  console.log('-----------------------------------------------------');
  const rd = pilot.reading.draft;
  const rs = pilot.reading.solverReport;
  console.log(`Draft ID:          ${rd.id}`);
  console.log(`Title:             ${rd.content?.title}`);
  console.log(`Is Live:           ${rd.isLive ? 'YES (Live API Call)' : 'NO'}`);
  console.log(`Generator Model:   ${rd.origin?.model}`);
  console.log(`Passage Calls:     ${rd.origin?.passageCallCount} (Passage-by-Passage generation)`);
  console.log(`Timestamp:         ${rd.origin?.date}`);
  console.log(`Token Usage:       Prompt=${rd.tokenUsage?.promptTokens}, Candidates=${rd.tokenUsage?.completionTokens}, Total=${rd.tokenUsage?.totalTokens}`);
  console.log(`Solver Model:      ${rs.solverModel}`);
  console.log(`Solver Agreement:  ${rs.matchCount}/${rs.totalQuestions} (${rs.passed ? '100% PERFECT MATCH' : `${rs.mismatchCount} MISMATCHES DETECTED`})`);
  console.log(`Review Status:     ${rd.pipelineStatus} (${rd.status})`);

  if (rs.mismatchCount > 0) {
    console.log('\n[SOLVER MISMATCHES DETECTED]:');
    rs.details.filter(d => !d.isMatch).forEach(m => {
      console.log(`  * Question ${m.qNum} (${m.questionType}):`);
      console.log(`    - Prompt:           ${m.prompt}`);
      console.log(`    - Generator Answer: "${m.generatorAnswer}"`);
      console.log(`    - Solver Derived:   "${m.solverAnswer}"`);
      console.log(`    - Solver Evidence:  "${m.solverEvidenceQuote}"`);
      console.log(`    - Solver Rationale: ${m.solverRationale}`);
    });
  } else {
    console.log('All 40 questions independently verified with 100% agreement.');
  }

  // 2. Writing Task 1
  console.log('\n-----------------------------------------------------');
  console.log(' 2. WRITING TASK 1 PROMPTS (5 ITEMS WITH CODE CHARTS) ');
  console.log('-----------------------------------------------------');
  pilot.writingTask1.forEach((w, idx) => {
    console.log(`\n[Task 1 Item #${idx + 1}]`);
    console.log(`  Draft ID:         ${w.draft.id}`);
    console.log(`  Title:            ${w.draft.content?.title}`);
    console.log(`  Is Live:          ${w.draft.isLive}`);
    console.log(`  Generator Model:  ${w.draft.origin?.model}`);
    console.log(`  Timestamp:        ${w.draft.origin?.date}`);
    console.log(`  Token Usage:      Prompt=${w.draft.tokenUsage?.promptTokens}, Candidates=${w.draft.tokenUsage?.completionTokens}, Total=${w.draft.tokenUsage?.totalTokens}`);
    console.log(`  Chart Type:       ${w.draft.content?.task1?.type} (Code-drawn SVG length: ${w.draft.content?.task1?.chartSvg?.length} chars)`);
    console.log(`  Data Table:       Headers: [${w.draft.content?.task1?.chartData?.headers?.join(', ')}]`);
    console.log(`  Solver Quality:   ${w.solverReport.passed ? 'PASSED' : 'FLAGGED'} (${w.solverReport.solverModel})`);
    console.log(`  Solver Rationale: ${w.solverReport.details[0]?.solverRationale || 'N/A'}`);
  });

  // 3. Writing Task 2
  console.log('\n-----------------------------------------------------');
  console.log(' 3. WRITING TASK 2 PROMPTS (5 ESSAY PROMPTS)         ');
  console.log('-----------------------------------------------------');
  pilot.writingTask2.forEach((w, idx) => {
    console.log(`\n[Task 2 Item #${idx + 1}]`);
    console.log(`  Draft ID:         ${w.draft.id}`);
    console.log(`  Title:            ${w.draft.content?.title}`);
    console.log(`  Is Live:          ${w.draft.isLive}`);
    console.log(`  Generator Model:  ${w.draft.origin?.model}`);
    console.log(`  Timestamp:        ${w.draft.origin?.date}`);
    console.log(`  Token Usage:      Prompt=${w.draft.tokenUsage?.promptTokens}, Candidates=${w.draft.tokenUsage?.completionTokens}, Total=${w.draft.tokenUsage?.totalTokens}`);
    console.log(`  Essay Type:       ${w.draft.content?.task2?.type}`);
    console.log(`  Word Count:       ${w.draft.content?.task2?.wordCount} words`);
    console.log(`  Solver Quality:   ${w.solverReport.passed ? 'PASSED' : 'FLAGGED'} (${w.solverReport.solverModel})`);
    console.log(`  Solver Feedback:  ${w.solverReport.details[0]?.solverEvidenceQuote || 'N/A'}`);
  });

  // 4. Speaking Part 1
  console.log('\n-----------------------------------------------------');
  console.log(' 4. SPEAKING PART 1 QUESTIONS (10 QUESTIONS)         ');
  console.log('-----------------------------------------------------');
  const sp = pilot.speakingPart1.draft;
  const ss = pilot.speakingPart1.solverReport;
  console.log(`Draft ID:         ${sp.id}`);
  console.log(`Title:            ${sp.content?.title}`);
  console.log(`Is Live:          ${sp.isLive}`);
  console.log(`Generator Model:  ${sp.origin?.model}`);
  console.log(`Timestamp:        ${sp.origin?.date}`);
  console.log(`Token Usage:      Prompt=${sp.tokenUsage?.promptTokens}, Candidates=${sp.tokenUsage?.completionTokens}, Total=${sp.tokenUsage?.totalTokens}`);
  console.log(`Question Count:   ${sp.content?.part1?.questions?.length}`);
  console.log(`Solver Quality:   ${ss.passed ? 'PASSED' : 'FLAGGED'} (${ss.solverModel})`);
  sp.content?.part1?.questions?.forEach((q: any, idx: number) => {
    console.log(`  Q${idx + 1}: "${q.question}"`);
  });

  // Requirement 7: Print the full Reading test as plain text so the user can copy it
  console.log('\n=====================================================');
  console.log('     FULL ACADEMIC READING TEST (PLAIN TEXT EXPORT)   ');
  console.log('=====================================================');
  const passages = rd.content?.passages || [];
  passages.forEach((p: any) => {
    console.log(`\n\n=====================================================`);
    console.log(`PASSAGE ${p.passageNumber}: ${p.title.toUpperCase()}`);
    console.log(`Word Count: ${p.wordCount || p.text?.split(/\s+/).length} words`);
    console.log(`=====================================================\n`);
    console.log(p.text);
    console.log(`\n--- QUESTIONS FOR PASSAGE ${p.passageNumber} ---\n`);
    (p.questions || []).forEach((q: any) => {
      console.log(`Question ${q.id} [${q.type}]`);
      console.log(`Prompt: ${q.prompt}`);
      if (Array.isArray(q.options) && q.options.length > 0) {
        console.log(`Options:\n${q.options.map((opt: string) => `  ${opt}`).join('\n')}`);
      }
      console.log(`Generator Answer: ${q.correctAnswer}`);
      if (Array.isArray(q.acceptableAnswers) && q.acceptableAnswers.length > 0) {
        console.log(`Acceptable Alternatives: ${q.acceptableAnswers.join(', ')}`);
      }
      console.log(`Passage Evidence Quote: "${q.passageEvidence}"`);
      const solverResult = rs.details.find(d => d.qNum === q.id);
      if (solverResult) {
        console.log(`Solver Answer: ${solverResult.solverAnswer} [${solverResult.isMatch ? 'MATCH' : 'MISMATCH'}]`);
        if (!solverResult.isMatch) {
          console.log(`Solver Evidence Quote: "${solverResult.solverEvidenceQuote}"`);
          console.log(`Solver Rationale: ${solverResult.solverRationale}`);
        }
      }
      console.log('');
    });
  });

  console.log('\n=====================================================');
  console.log('PILOT EXECUTION COMPLETE. ALL 12 ITEMS IN REVIEW QUEUE');
  console.log('=====================================================');
}

main().catch(err => {
  console.error('[FATAL PILOT RUNNER ERROR]:', err);
  process.exit(1);
});
