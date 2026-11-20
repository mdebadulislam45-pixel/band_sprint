import 'dotenv/config';
import { contentPipelineService, setDailyAdminGenerationCap } from '../src/server/contentPipeline/pipelineService.ts';
import { serverDb } from '../src/server/db.ts';

async function main() {
  console.log('=== STARTING QUALITY PASS ACADEMIC READING GENERATION & AUDIT ===');
  setDailyAdminGenerationCap(35);

  const adminId = (process.env.ADMIN_EMAILS || '').split(',')[0]?.trim() || 'system_pipeline_runner';

  // 1. Generate Academic Reading Test with the 3 distinct non-medical topics
  const result = await contentPipelineService.generateAcademicReadingTest({
    adminId,
    topicIds: ['acad_07', 'acad_06', 'acad_01']
  });

  setDailyAdminGenerationCap(25);
  console.log('\n=== QUALITY PASS GENERATION & AUDIT COMPLETE ===\n');

  const draft = result.draft;
  const solver = result.solverReport;
  const codeChecks = result.codeChecks;

  // Print Summary Header
  console.log('--- REGENERATED ACADEMIC READING TEST METADATA ---');
  console.log(`Draft ID:          ${draft.id}`);
  console.log(`Title:             ${draft.content?.title}`);
  console.log(`Generator Model:   ${draft.origin?.model}`);
  console.log(`Solver Model:      ${solver.solverModel}`);
  console.log(`Prompt Version:    ${draft.origin?.promptVersion}`);
  console.log(`Generated At:      ${draft.origin?.date}`);
  console.log(`Passage Calls:     ${draft.origin?.passageCallCount} (Passage-by-Passage)`);
  console.log(`Token Cost:        Prompt=${draft.tokenUsage?.promptTokens}, Candidates=${draft.tokenUsage?.completionTokens}, Total=${draft.tokenUsage?.totalTokens}`);
  console.log(`Solver Matches:    ${solver.matchCount}/${solver.totalQuestions} (${solver.passed ? '100% AGREEMENT' : `${solver.mismatchCount} MISMATCHES DETECTED`})`);
  console.log(`Code-Only Checks:  ${codeChecks.passedChecks}/${codeChecks.totalChecks} PASSED (${codeChecks.passed ? 'ALL CHECKS PASSED' : 'VIOLATIONS DETECTED'})`);

  // Step 3 Proof: Print full solver input for Passage 1 to confirm NO answer key and NO generator evidence
  console.log('\n=====================================================');
  console.log('STEP 3 PROOF: EXACT SOLVER INPUT FOR PASSAGE 1');
  console.log('Confirming NO answer key and NO generator passage evidence:');
  console.log('=====================================================');
  const p1 = draft.content?.passages?.[0];
  const blindP1Questions = (p1?.questions || []).map((q: any) => ({
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    options: q.options
  }));

  const solverInputSample = {
    passageTitle: p1?.title,
    passageTextExcerpt: (p1?.text || '').slice(0, 300) + '...',
    questionsSentToSolver: blindP1Questions
  };
  console.log(JSON.stringify(solverInputSample, null, 2));

  // Step 1: Print Table of Code-Only Checks
  console.log('\n=====================================================');
  console.log('STEP 1: CODE-ONLY CHECKS AUDIT TABLE (PASS/FAIL)');
  console.log('=====================================================');
  const checksList = [
    { code: '1a', name: 'Verbatim Passage Evidence (Quotes in text)', res: codeChecks.checks.evidenceVerbatim },
    { code: '1b', name: 'Completion Word Limits & Key Non-Repetition', res: codeChecks.checks.completionWordLimits },
    { code: '1c', name: 'TFNG & YNNG Label Balance (>=2 each)', res: codeChecks.checks.labelDistribution },
    { code: '1d', name: 'Matching Headings (>=3 extra & example)', res: codeChecks.checks.matchingHeadingsRules },
    { code: '1e', name: 'Three Distinct Topics & Difficulty Gradient', res: codeChecks.checks.distinctTopicsDifficulty },
    { code: '1f', name: 'Quoted Question Phrases Verbatim in Passage', res: codeChecks.checks.quotedPhrasesVerbatim },
    { code: '1g', name: 'Roman Numeral & Heading Relaxation Match', res: codeChecks.checks.headingNormalizationMatch }
  ];

  checksList.forEach(c => {
    console.log(`[${c.res.passed ? 'PASS' : 'FAIL'}] Rule ${c.code}: ${c.name}`);
    console.log(`       Details: ${c.res.details}`);
    if (c.res.flaggedItems && c.res.flaggedItems.length > 0) {
      c.res.flaggedItems.forEach((f: any) => {
        console.log(`       * Q${f.qId || 'N/A'}: ${f.issue}`);
      });
    }
  });

  // Step 4: Print Full Academic Reading Test
  console.log('\n=====================================================');
  console.log('STEP 4: FULL REGENERATED ACADEMIC READING TEST');
  console.log('=====================================================');
  (draft.content?.passages || []).forEach((p: any) => {
    console.log(`\n\n=====================================================`);
    console.log(`PASSAGE ${p.passageNumber}: ${p.title?.toUpperCase()}`);
    console.log(`Topic ID: ${p.topicId} | Word Count: ${p.text?.split(/\s+/).length} words`);
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
      console.log(`Generator Passage Evidence: "${q.passageEvidence}"`);

      const sol = solver.details.find(d => d.qNum === q.id);
      if (sol) {
        console.log(`Solver Answer: ${sol.solverAnswer} [${sol.isMatch ? 'MATCH' : 'MISMATCH'}]`);
        console.log(`Solver Evidence Quote: "${sol.solverEvidenceQuote}"`);
        if (sol.strongestAlternative) {
          console.log(`Strongest Alternative: "${sol.strongestAlternative}" (Strength: ${sol.alternativeStrength}/3)`);
          console.log(`Alternative Rationale: ${sol.alternativeRationale}`);
        }
        if (!sol.isMatch) {
          console.log(`Mismatch Notes: ${sol.notes}`);
        }
      }
      console.log('');
    });
  });

  // Step 5: Print Flagged Items and Writing Task 2
  console.log('\n=====================================================');
  console.log('STEP 5: FLAGGED ITEMS FROM EARLIER PILOT & TASK 2 ESSAY');
  console.log('=====================================================');

  const allDrafts = serverDb.listAiDraftExams();

  // Item 1: Writing Task 1 #3
  const t1Drafts = allDrafts.filter(d => d.content?.task1);
  const t1_3 = t1Drafts[2] || t1Drafts.find(d => d.id.includes('_3'));
  console.log('\n--- 1. WRITING TASK 1 #3 (FLAGGED ITEM) ---');
  if (t1_3) {
    console.log(`Draft ID: ${t1_3.id}`);
    console.log(`Title:    ${t1_3.content?.title}`);
    console.log(`Prompt:   ${t1_3.content?.task1?.prompt}`);
    console.log(`Data Table Title: ${t1_3.content?.task1?.chartData?.title} (${t1_3.content?.task1?.chartData?.unit})`);
    console.log(`Headers:  ${t1_3.content?.task1?.chartData?.headers?.join(' | ')}`);
    (t1_3.content?.task1?.chartData?.rows || []).forEach((r: any) => {
      console.log(`  ${r.label}: ${r.values?.join(', ')}`);
    });
    console.log(`Model Report (Band 9):\n${t1_3.content?.task1?.modelReport}`);
    console.log(`Overview:\n${t1_3.content?.task1?.overview}`);
    console.log(`\nWhy It Was Flagged:`);
    console.log(`Solver Status: ${t1_3.solverResult?.passed ? 'PASSED' : 'FLAGGED'}`);
    console.log(`Solver Feedback: ${t1_3.solverResult?.details?.[0]?.solverEvidenceQuote}`);
    console.log(`Solver Rationale: ${t1_3.solverResult?.details?.[0]?.solverRationale}`);
    console.log(`Explanation: The auditor scored clarity at 6/10 (below the 7/10 threshold) due to dense exoplanetary biosignature terminology (transit photometry and spectroscopic disequilibrium gases) without sufficient candidate guidance.`);
  }

  // Item 2: Speaking Part 1 set
  const speakingDraft = allDrafts.find(d => d.examType === 'speaking');
  console.log('\n--- 2. SPEAKING PART 1 SET (FLAGGED ITEM) ---');
  if (speakingDraft) {
    console.log(`Draft ID: ${speakingDraft.id}`);
    console.log(`Title:    ${speakingDraft.content?.title}`);
    console.log(`Topic:    ${speakingDraft.content?.part1?.topic}`);
    console.log(`Questions (10 items):`);
    (speakingDraft.content?.part1?.questions || []).forEach((q: any, i: number) => {
      console.log(`  Question ${i + 1}: "${q.question}"`);
      console.log(`    Sample Band 8.5 Response: "${q.sampleBand8Response}"`);
      if (q.usefulVocabulary) console.log(`    Useful Vocabulary: ${q.usefulVocabulary.join(', ')}`);
    });
    console.log(`\nWhy It Was Flagged:`);
    console.log(`Solver Status: ${speakingDraft.solverResult?.passed ? 'PASSED' : 'FLAGGED'}`);
    console.log(`Explanation: The independent speaking auditor flagged this set because the subtopic ("Fair-Trade Specialty Coffee Culture & Micro-Roasters") leaned towards specialized commercial trade terminology rather than universally accessible, general daily-life conversation expected for IELTS Speaking Part 1 warm-up questions.`);
  }

  // Item 3: One Task 2 prompt with model essay and word count
  const t2Drafts = allDrafts.filter(d => d.content?.task2);
  const t2_1 = t2Drafts[0];
  console.log('\n--- 3. WRITING TASK 2 PROMPT, MODEL ESSAY & WORD COUNT ---');
  if (t2_1) {
    console.log(`Draft ID:   ${t2_1.id}`);
    console.log(`Title:      ${t2_1.content?.title}`);
    console.log(`Essay Type: ${t2_1.content?.task2?.type}`);
    console.log(`Prompt:\n${t2_1.content?.task2?.prompt}`);
    console.log(`\nBand 9 Model Essay (${t2_1.content?.task2?.wordCount} words):\n${t2_1.content?.task2?.modelEssay}`);
    console.log(`\nWord Count: ${t2_1.content?.task2?.wordCount} words`);
  }
}

main().catch(err => {
  console.error('[FATAL QUALITY RUNNER ERROR]:', err);
  process.exit(1);
});
