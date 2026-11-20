import { isListeningAnswerCorrect, normalizeCompletionAnswer, countAnswerWords } from '../src/utils/listeningAnswerEvaluator';
import { IELTSQuestion } from '../src/services/QuestionEngine';

console.log("=================================================");
console.log("IELTS SPRINT - PHASE 5.2A.2 EVALUATOR EDGE CASE AUDIT");
console.log("=================================================\n");

const baseCompletionQ: IELTSQuestion & { wordLimit?: number } = {
  id: 1,
  questionType: 'form_completion',
  prompt: 'Applicant Family Name (NO MORE THAN TWO WORDS):',
  correctAnswer: 'THORNTON',
  explanation: 'Applicant spells surname T-H-O-R-N-T-O-N.'
};

const baseDateQ: IELTSQuestion & { wordLimit?: number } = {
  id: 3,
  questionType: 'form_completion',
  prompt: 'Event Date (NO MORE THAN TWO WORDS AND/OR A NUMBER):',
  correctAnswer: '14TH OCTOBER',
  explanation: 'Selected date is 14th October.'
};

const baseNumberQ: IELTSQuestion = {
  id: 6,
  questionType: 'short_answer',
  prompt: 'Expected total attending guests:',
  correctAnswer: '85',
  explanation: 'Applicant estimates 85 guests.'
};

const basePercentQ: IELTSQuestion = {
  id: 31,
  questionType: 'note_completion',
  prompt: 'Fuel consumption increased by up to:',
  correctAnswer: '30%',
  explanation: 'Increases fuel consumption by up to 30%.'
};

const baseMcqQ: IELTSQuestion = {
  id: 5,
  questionType: 'multiple_choice',
  prompt: 'Which function suite did the applicant reserve?',
  options: ['A) Oakridge Main Hall', 'B) Riverside Suite', 'C) Garden Pavilion'],
  correctAnswer: 'B) Riverside Suite',
  explanation: 'Applicant selects Riverside Suite.'
};

const baseMultiAnsQ: IELTSQuestion = {
  id: 8,
  questionType: 'form_completion',
  prompt: 'Ancillary facility access required:',
  correctAnswer: 'KITCHEN',
  acceptableAnswers: ['COMMERCIAL KITCHEN', 'MAIN KITCHEN'],
  explanation: 'Access to commercial kitchen.'
};

const baseHyphenQ: IELTSQuestion = {
  id: 101,
  questionType: 'form_completion',
  prompt: 'Dietary menu preference:',
  correctAnswer: 'gluten-free',
  explanation: 'Gluten-free menu option.'
};

const baseSpellingQ: IELTSQuestion = {
  id: 102,
  questionType: 'form_completion',
  prompt: 'Venue location feature:',
  correctAnswer: 'TOWN CENTRE',
  acceptableAnswers: ['TOWN CENTER'],
  explanation: 'Located in town centre.'
};

interface TestResult {
  category: string;
  testCase: string;
  input: string;
  expected: boolean;
  actual: boolean;
  status: 'PASS' | 'FAIL' | 'AMBIGUOUS';
  note: string;
}

const results: TestResult[] = [];

function runCase(
  category: string,
  testCase: string,
  q: IELTSQuestion & { wordLimit?: number },
  input: string,
  expected: boolean,
  note: string = ''
) {
  const actual = isListeningAnswerCorrect(q, input);
  const pass = actual === expected;
  results.push({
    category,
    testCase,
    input,
    expected,
    actual,
    status: pass ? 'PASS' : 'FAIL',
    note
  });
}

// 1. Case-insensitive answers
runCase('1. Case-insensitive', 'Lowercase exact match', baseCompletionQ, 'thornton', true, 'Converts input & target to lowercase');
runCase('1. Case-insensitive', 'Mixed case exact match', baseCompletionQ, 'ThOrNtOn', true, 'Preserves letter identity regardless of case');
runCase('1. Case-insensitive', 'MCQ option letter lowercase', baseMcqQ, 'b', true, 'Matches option letter B in lowercase');

// 2. Leading/trailing and repeated whitespace
runCase('2. Whitespace', 'Leading/trailing spaces', baseCompletionQ, '   THORNTON   ', true, 'Trims outer whitespace');
runCase('2. Whitespace', 'Multiple internal spaces', baseMultiAnsQ, 'COMMERCIAL    KITCHEN', true, 'Collapses internal spaces');

// 3. Numeric digits vs number words
runCase('3. Digits vs Words', 'Exact digit string', baseNumberQ, '85', true, 'Matches digit string');
runCase('3. Digits vs Words', 'Spelled out number words', baseNumberQ, 'eighty five', false, 'Does not automatically convert words to digits without explicit acceptableAnswers');

// 4. Percentage formatting
runCase('4. Percentage', 'Exact percentage string', basePercentQ, '30%', true, 'Matches percentage symbol');
runCase('4. Percentage', 'Percentage with space', basePercentQ, '30 %', true, 'Matches percentage symbol with normalized space');
runCase('4. Percentage', 'Spelled out percent word', basePercentQ, '30 percent', false, 'Requires 30% symbol unless percent word is in acceptableAnswers');

// 5. Dates and time formatting
runCase('5. Dates & Times', 'Exact ordinal date', baseDateQ, '14TH OCTOBER', true, 'Matches exact ordinal date');
runCase('5. Dates & Times', 'Lowercase ordinal date', baseDateQ, '14th october', true, 'Matches lowercase ordinal date');
runCase('5. Dates & Times', 'Cardinals without ordinal', baseDateQ, '14 OCTOBER', false, 'Requires ordinal suffix or explicit acceptableAnswers list');

// 6. Hyphenated words
runCase('6. Hyphenated', 'Hyphenated match', baseHyphenQ, 'gluten-free', true, 'Matches hyphenated form');
runCase('6. Hyphenated', 'Space-separated match', baseHyphenQ, 'gluten free', true, 'Normalizer converts hyphens to spaces so both match');

// 7. British/American spelling
runCase('7. UK/US Spelling', 'British spelling match', baseSpellingQ, 'TOWN CENTRE', true, 'Matches main correctAnswer');
runCase('7. UK/US Spelling', 'American spelling via acceptableAnswers', baseSpellingQ, 'TOWN CENTER', true, 'Matches via acceptableAnswers list');
runCase('7. UK/US Spelling', 'Unconfigured American spelling', baseCompletionQ, 'CENTER', false, 'Fails if US spelling is not configured in acceptableAnswers');

// 8. Extra words and word-limit violations
runCase('8. Word Limit', 'Within word limit (2 words)', baseCompletionQ, 'MR THORNTON', false, 'Wrong value even if within limit');
runCase('8. Word Limit', 'Exceeds word limit (3 words)', baseCompletionQ, 'THE THORNTON FAMILY', false, 'Fails because word count (3) exceeds prompt limit of 2');

// 9. MC letters vs full option text
runCase('9. Option Letters/Text', 'Bare option letter', baseMcqQ, 'B', true, 'Matches option letter');
runCase('9. Option Letters/Text', 'Full option label without prefix', baseMcqQ, 'Riverside Suite', true, 'Matches full option label');
runCase('9. Option Letters/Text', 'Prefixed option label string', baseMcqQ, 'B) Riverside Suite', true, 'Matches prefixed full option string');

// 10. Incorrect answers that partially contain correct answer
runCase('10. Partial Containment', 'Prefix truncation', baseCompletionQ, 'THORN', false, 'Substring match rejected (strict token equality)');
runCase('10. Partial Containment', 'Numeric truncation', baseNumberQ, '8', false, 'Partial number rejected');

// 11. Empty answers
runCase('11. Empty Answers', 'Empty string', baseCompletionQ, '', false, 'Rejects empty string');
runCase('11. Empty Answers', 'Whitespace-only string', baseCompletionQ, '    ', false, 'Rejects whitespace-only string');

// 12. Alternative accepted answers
runCase('12. Acceptable Answers', 'Primary answer', baseMultiAnsQ, 'KITCHEN', true, 'Matches primary correctAnswer');
runCase('12. Acceptable Answers', 'Alternative 1', baseMultiAnsQ, 'COMMERCIAL KITCHEN', true, 'Matches acceptableAnswers[0]');
runCase('12. Acceptable Answers', 'Alternative 2', baseMultiAnsQ, 'MAIN KITCHEN', true, 'Matches acceptableAnswers[1]');

console.log("-------------------------------------------------");
console.log("EVALUATOR EDGE CASE TEST RESULTS:");
console.log("-------------------------------------------------");
results.forEach((r, idx) => {
  console.log(`[${String(idx + 1).padStart(2, '0')}] ${r.category.padEnd(22)} | ${r.testCase.padEnd(35)} | Input: "${r.input}" => Status: ${r.status} (Actual: ${r.actual}, Exp: ${r.expected})`);
  if (r.note) console.log(`     Note: ${r.note}`);
});

console.log("\n=================================================");
console.log("AUDIT SCRIPT COMPLETE");
console.log("=================================================");
