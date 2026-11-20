/**
 * Independent Validation Engine for AI Question Factory
 * Evaluates generated IELTS Academic Reading exams against strict structural, answer, evidence, and quality rules.
 */

export interface ValidationResult {
  passed: boolean;
  structuralOk: boolean;
  answersOk: boolean;
  evidenceOk: boolean;
  qualityOk: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    passageCount: number;
    totalQuestions: number;
    passageQuestions: number[];
    wordCounts: number[];
  };
}

const ALLOWED_QUESTION_TYPES = new Set([
  'true_false_not_given',
  'yes_no_not_given',
  'multiple_choice',
  'matching_headings',
  'matching_information',
  'sentence_completion',
  'summary_completion'
]);

/**
 * Normalizes text for evidence matching (lowercase, collapses whitespace & basic punctuation)
 */
function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function validateAcademicReadingExam(examData: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let structuralOk = true;
  let answersOk = true;
  let evidenceOk = true;
  let qualityOk = true;

  if (!examData || typeof examData !== 'object') {
    return {
      passed: false,
      structuralOk: false,
      answersOk: false,
      evidenceOk: false,
      qualityOk: false,
      errors: ['Exam data payload is empty or not an object.'],
      warnings: [],
      stats: { passageCount: 0, totalQuestions: 0, passageQuestions: [], wordCounts: [] }
    };
  }

  // 1. STRUCTURAL CHECKS
  const passages = Array.isArray(examData.passages) ? examData.passages : [];
  const passageCount = passages.length;
  const passageQuestions: number[] = [];
  const wordCounts: number[] = [];
  let totalQuestions = 0;

  if (passageCount !== 3) {
    errors.push(`Expected exactly 3 passages, but found ${passageCount}.`);
    structuralOk = false;
  }

  const seenIds = new Set<number>();
  const seenPrompts = new Set<string>();

  passages.forEach((p: any, pIdx: number) => {
    const pNum = pIdx + 1;
    const text = typeof p.text === 'string' ? p.text : '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    wordCounts.push(words);

    if (words < 500) {
      warnings.push(`Passage ${pNum} word count (${words} words) is below recommended IELTS range (750-1100 words).`);
    }

    const questions = Array.isArray(p.questions) ? p.questions : [];
    passageQuestions.push(questions.length);
    totalQuestions += questions.length;

    // Check individual questions
    questions.forEach((q: any) => {
      // ID check
      if (typeof q.id !== 'number') {
        errors.push(`Passage ${pNum} question ID is missing or not a number.`);
        structuralOk = false;
      } else {
        if (seenIds.has(q.id)) {
          errors.push(`Duplicate Question ID ${q.id} detected.`);
          structuralOk = false;
        }
        seenIds.add(q.id);
      }

      // Question type check
      if (!q.type || !ALLOWED_QUESTION_TYPES.has(q.type)) {
        errors.push(`Question ${q.id}: Invalid question type "${q.type}".`);
        structuralOk = false;
      }

      // Prompt check
      if (!q.prompt || typeof q.prompt !== 'string' || !q.prompt.trim()) {
        errors.push(`Question ${q.id}: Prompt is empty.`);
        structuralOk = false;
      } else {
        const normPrompt = normalizeText(q.prompt);
        if (seenPrompts.has(normPrompt)) {
          errors.push(`Question ${q.id}: Duplicate prompt text detected.`);
          qualityOk = false;
        }
        seenPrompts.add(normPrompt);
      }

      // 2. ANSWER CHECKS
      if (!q.correctAnswer || typeof q.correctAnswer !== 'string' || !q.correctAnswer.trim()) {
        errors.push(`Question ${q.id}: Correct answer is missing.`);
        answersOk = false;
      } else {
        const ansUpper = q.correctAnswer.trim().toUpperCase();

        if (q.type === 'true_false_not_given') {
          if (!['TRUE', 'FALSE', 'NOT GIVEN'].includes(ansUpper)) {
            errors.push(`Question ${q.id} (T/F/NG): Answer "${q.correctAnswer}" must be TRUE, FALSE, or NOT GIVEN.`);
            answersOk = false;
          }
        } else if (q.type === 'yes_no_not_given') {
          if (!['YES', 'NO', 'NOT GIVEN'].includes(ansUpper)) {
            errors.push(`Question ${q.id} (Y/N/NG): Answer "${q.correctAnswer}" must be YES, NO, or NOT GIVEN.`);
            answersOk = false;
          }
        } else if (q.type === 'multiple_choice') {
          if (!Array.isArray(q.options) || q.options.length < 2) {
            errors.push(`Question ${q.id} (MC): Multiple choice must have options array with at least 2 choices.`);
            answersOk = false;
          } else {
            // Check if correctAnswer matches one of the options or option letters (A, B, C, D)
            const optionTexts = q.options.map((o: string) => o.trim());
            const optionLetters = q.options.map((_o: string, idx: number) => String.fromCharCode(65 + idx)); // A, B, C, D
            const matchesOption = optionTexts.some((opt: string) => opt.toUpperCase().includes(ansUpper) || ansUpper.includes(opt.toUpperCase()));
            const matchesLetter = optionLetters.includes(ansUpper);

            if (!matchesOption && !matchesLetter) {
              errors.push(`Question ${q.id} (MC): Answer "${q.correctAnswer}" does not match options [${q.options.join(', ')}].`);
              answersOk = false;
            }
          }
        } else if (q.type === 'sentence_completion' || q.type === 'summary_completion') {
          // Check word limit if prompt specifies "NO MORE THAN X WORDS"
          const promptUpper = q.prompt.toUpperCase();
          let maxWords = 0;
          if (promptUpper.includes('ONE WORD')) maxWords = 1;
          else if (promptUpper.includes('TWO WORDS')) maxWords = 2;
          else if (promptUpper.includes('THREE WORDS')) maxWords = 3;

          if (maxWords > 0) {
            const ansWordCount = q.correctAnswer.trim().split(/\s+/).length;
            if (ansWordCount > maxWords) {
              errors.push(`Question ${q.id}: Answer "${q.correctAnswer}" (${ansWordCount} words) exceeds prompt limit of ${maxWords} word(s).`);
              answersOk = false;
            }
          }
        }
      }

      // 3. EVIDENCE CHECKS
      if (!q.passageEvidence || typeof q.passageEvidence !== 'string' || !q.passageEvidence.trim()) {
        errors.push(`Question ${q.id}: Supporting passage evidence is missing.`);
        evidenceOk = false;
      } else {
        const normPassage = normalizeText(text);
        const normEvidence = normalizeText(q.passageEvidence);

        // Substring check or phrase token overlap
        if (normEvidence.length > 5 && !normPassage.includes(normEvidence)) {
          // Check token overlap percentage for paraphrased evidence
          const evidenceWords = normEvidence.split(' ').filter(w => w.length > 3);
          const matchedWords = evidenceWords.filter(w => normPassage.includes(w));
          const overlapRatio = evidenceWords.length > 0 ? matchedWords.length / evidenceWords.length : 0;

          if (overlapRatio < 0.5) {
            warnings.push(`Question ${q.id}: Passage evidence quote has low direct overlap with passage text.`);
          }
        }
      }
    });
  });

  // Structural Question Count Checks: Expect 40 total, split 13/13/14 across 3 passages
  if (totalQuestions !== 40) {
    errors.push(`Expected exactly 40 questions total, but found ${totalQuestions}.`);
    structuralOk = false;
  }

  if (passageQuestions.length === 3) {
    if (passageQuestions[0] !== 13 || passageQuestions[1] !== 13 || passageQuestions[2] !== 14) {
      warnings.push(`Recommended passage question breakdown is 13, 13, 14. Observed breakdown: ${passageQuestions.join(', ')}.`);
    }
  }

  // Check sequential question IDs (1 to 40)
  for (let i = 1; i <= 40; i++) {
    if (!seenIds.has(i)) {
      errors.push(`Question ID ${i} is missing from sequential list (1-40).`);
      structuralOk = false;
    }
  }

  const passed = structuralOk && answersOk && evidenceOk && errors.length === 0;

  return {
    passed,
    structuralOk,
    answersOk,
    evidenceOk,
    qualityOk,
    errors,
    warnings,
    stats: {
      passageCount,
      totalQuestions,
      passageQuestions,
      wordCounts
    }
  };
}

const ALLOWED_LISTENING_QUESTION_TYPES = new Set([
  'form_completion',
  'note_completion',
  'table_completion',
  'sentence_completion',
  'multiple_choice',
  'matching',
  'map_labelling',
  'short_answer'
]);

export function validateListeningExam(examData: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let structuralOk = true;
  let answersOk = true;
  let evidenceOk = true;
  let qualityOk = true;

  if (!examData || typeof examData !== 'object') {
    return {
      passed: false,
      structuralOk: false,
      answersOk: false,
      evidenceOk: false,
      qualityOk: false,
      errors: ['Exam data payload is empty or not an object.'],
      warnings: [],
      stats: { passageCount: 0, totalQuestions: 0, passageQuestions: [], wordCounts: [] }
    };
  }

  const sections = Array.isArray(examData.sections) ? examData.sections : [];
  const sectionCount = sections.length;
  const sectionQuestions: number[] = [];
  const wordCounts: number[] = [];
  let totalQuestions = 0;

  if (sectionCount !== 4) {
    errors.push(`Expected exactly 4 listening sections, but found ${sectionCount}.`);
    structuralOk = false;
  }

  const seenIds = new Set<number>();
  const seenPrompts = new Set<string>();

  sections.forEach((sec: any, secIdx: number) => {
    const secNum = secIdx + 1;
    const scriptText = typeof sec.script === 'string' ? sec.script : '';
    const words = scriptText.trim() ? scriptText.trim().split(/\s+/).length : 0;
    wordCounts.push(words);

    if (words < 400) {
      warnings.push(`Section ${secNum} script word count (${words} words) is below recommended IELTS range (650-850 words).`);
    }

    const questions = Array.isArray(sec.questions) ? sec.questions : [];
    sectionQuestions.push(questions.length);
    totalQuestions += questions.length;

    if (questions.length !== 10) {
      errors.push(`Section ${secNum} expected exactly 10 questions, but found ${questions.length}.`);
      structuralOk = false;
    }

    questions.forEach((q: any) => {
      // ID check
      if (typeof q.id !== 'number') {
        errors.push(`Section ${secNum} question ID is missing or not a number.`);
        structuralOk = false;
      } else {
        if (seenIds.has(q.id)) {
          errors.push(`Duplicate Question ID ${q.id} detected.`);
          structuralOk = false;
        }
        seenIds.add(q.id);
      }

      // Question type check
      if (!q.type || !ALLOWED_LISTENING_QUESTION_TYPES.has(q.type)) {
        errors.push(`Question ${q.id}: Invalid listening question type "${q.type}".`);
        structuralOk = false;
      }

      // Prompt check
      if (!q.prompt || typeof q.prompt !== 'string' || !q.prompt.trim()) {
        errors.push(`Question ${q.id}: Prompt is empty.`);
        structuralOk = false;
      } else {
        const normPrompt = normalizeText(q.prompt);
        if (seenPrompts.has(normPrompt)) {
          errors.push(`Question ${q.id}: Duplicate prompt text detected.`);
          qualityOk = false;
        }
        seenPrompts.add(normPrompt);
      }

      // Answer check
      if (!q.correctAnswer || typeof q.correctAnswer !== 'string' || !q.correctAnswer.trim()) {
        errors.push(`Question ${q.id}: Correct answer is missing.`);
        answersOk = false;
      } else {
        const ansUpper = q.correctAnswer.trim().toUpperCase();

        if (q.type === 'multiple_choice' || q.type === 'matching') {
          if (!Array.isArray(q.options) || q.options.length < 2) {
            errors.push(`Question ${q.id} (${q.type}): Must have options array with at least 2 choices.`);
            answersOk = false;
          } else {
            const optionTexts = q.options.map((o: string) => o.trim().toUpperCase());
            const optionLetters = q.options.map((_o: string, idx: number) => String.fromCharCode(65 + idx));
            const matchesOption = optionTexts.some((opt: string) => opt.includes(ansUpper) || ansUpper.includes(opt));
            const matchesLetter = optionLetters.includes(ansUpper);

            if (!matchesOption && !matchesLetter) {
              errors.push(`Question ${q.id} (${q.type}): Answer "${q.correctAnswer}" does not match options [${q.options.join(', ')}].`);
              answersOk = false;
            }
          }
        } else if (q.type.includes('completion')) {
          const promptUpper = q.prompt.toUpperCase();
          let maxWords = 0;
          if (promptUpper.includes('ONE WORD')) maxWords = 1;
          else if (promptUpper.includes('TWO WORDS')) maxWords = 2;
          else if (promptUpper.includes('THREE WORDS')) maxWords = 3;

          if (maxWords > 0) {
            const ansWordCount = q.correctAnswer.trim().split(/\s+/).length;
            if (ansWordCount > maxWords) {
              errors.push(`Question ${q.id}: Answer "${q.correctAnswer}" (${ansWordCount} words) exceeds prompt limit of ${maxWords} word(s).`);
              answersOk = false;
            }
          }
        }
      }

      // Evidence check
      if (!q.scriptEvidence || typeof q.scriptEvidence !== 'string' || !q.scriptEvidence.trim()) {
        errors.push(`Question ${q.id}: Supporting script evidence is missing.`);
        evidenceOk = false;
      } else {
        const normScript = normalizeText(scriptText);
        const normEvidence = normalizeText(q.scriptEvidence);

        if (normEvidence.length > 5 && !normScript.includes(normEvidence)) {
          const evidenceWords = normEvidence.split(' ').filter(w => w.length > 3);
          const matchedWords = evidenceWords.filter(w => normScript.includes(w));
          const overlapRatio = evidenceWords.length > 0 ? matchedWords.length / evidenceWords.length : 0;

          if (overlapRatio < 0.5) {
            warnings.push(`Question ${q.id}: Script evidence quote has low direct overlap with section transcript.`);
          }
        }
      }
    });
  });

  if (totalQuestions !== 40) {
    errors.push(`Expected exactly 40 listening questions total, but found ${totalQuestions}.`);
    structuralOk = false;
  }

  for (let i = 1; i <= 40; i++) {
    if (!seenIds.has(i)) {
      errors.push(`Question ID ${i} is missing from sequential list (1-40).`);
      structuralOk = false;
    }
  }

  const passed = structuralOk && answersOk && evidenceOk && errors.length === 0;

  return {
    passed,
    structuralOk,
    answersOk,
    evidenceOk,
    qualityOk,
    errors,
    warnings,
    stats: {
      passageCount: sectionCount,
      totalQuestions,
      passageQuestions: sectionQuestions,
      wordCounts
    }
  };
}

const ALLOWED_ACADEMIC_TASK1_TYPES = new Set(['line', 'bar', 'pie', 'table', 'map', 'process', 'mixed']);
const ALLOWED_GT_TASK1_LETTER_TYPES = new Set(['formal', 'semi_formal', 'informal']);
const ALLOWED_GT_SCENARIOS = new Set(['complaint', 'request', 'enquiry', 'apology', 'invitation', 'explanation']);
const ALLOWED_TASK2_ESSAY_TYPES = new Set(['opinion', 'discuss_both_views', 'advantages_disadvantages', 'problem_solution', 'two_part', 'positive_negative']);
const ALLOWED_TASK2_TOPICS = new Set(['technology', 'education', 'environment', 'society', 'health', 'culture', 'work', 'economy']);

export function validateWritingQuestion(q: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let structuralOk = true;
  let answersOk = true;
  let evidenceOk = true;
  let qualityOk = true;

  if (!q || typeof q !== 'object') {
    return {
      passed: false,
      structuralOk: false,
      answersOk: false,
      evidenceOk: false,
      qualityOk: false,
      errors: ['Writing question payload is empty or not an object.'],
      warnings: [],
      stats: { passageCount: 0, totalQuestions: 0, passageQuestions: [], wordCounts: [] }
    };
  }

  // 1. Basic Metadata Checks
  if (!q.id || typeof q.id !== 'string' || !q.id.trim()) {
    errors.push('Question ID is missing or empty.');
    structuralOk = false;
  }

  if (q.schemaVersion && q.schemaVersion !== '1.0') {
    warnings.push(`Expected schemaVersion '1.0', observed '${q.schemaVersion}'.`);
  }

  if (!['Academic', 'General Training'].includes(q.format)) {
    errors.push(`Invalid format "${q.format}". Must be 'Academic' or 'General Training'.`);
    structuralOk = false;
  }

  if (!['task1', 'task2'].includes(q.taskCategory)) {
    errors.push(`Invalid taskCategory "${q.taskCategory}". Must be 'task1' or 'task2'.`);
    structuralOk = false;
  }

  if (!q.prompt || typeof q.prompt !== 'string' || !q.prompt.trim()) {
    errors.push('Prompt statement is empty.');
    structuralOk = false;
  }

  // 2. Task 1 Validation
  if (q.taskCategory === 'task1') {
    if (q.suggestedTimeMinutes && q.suggestedTimeMinutes !== 20) {
      warnings.push(`Task 1 recommended time is 20 minutes (observed ${q.suggestedTimeMinutes}).`);
    }
    if (q.minWordLimit && q.minWordLimit !== 150) {
      warnings.push(`Task 1 standard minimum word limit is 150 (observed ${q.minWordLimit}).`);
    }

    if (q.format === 'Academic') {
      if (!ALLOWED_ACADEMIC_TASK1_TYPES.has(q.questionType)) {
        errors.push(`Invalid Academic Task 1 questionType "${q.questionType}".`);
        structuralOk = false;
      }

      // Visual Data Checks
      const vd = q.visualData;
      if (!vd || typeof vd !== 'object') {
        errors.push('Academic Task 1 requires a valid visualData payload with structured chart/map/process data.');
        answersOk = false;
      } else {
        if (!vd.chartTitle || typeof vd.chartTitle !== 'string' || !vd.chartTitle.trim()) {
          errors.push('Academic Task 1 visualData requires a non-empty chartTitle.');
          answersOk = false;
        }

        if (['line', 'bar'].includes(q.questionType)) {
          if (!Array.isArray(vd.categories) || vd.categories.length < 2) {
            errors.push(`Academic Task 1 (${q.questionType}): visualData.categories must be an array with at least 2 categories.`);
            answersOk = false;
          }
          if (!Array.isArray(vd.series) || vd.series.length < 1) {
            errors.push(`Academic Task 1 (${q.questionType}): visualData.series must be an array with at least 1 data series.`);
            answersOk = false;
          } else {
            vd.series.forEach((s: any, sIdx: number) => {
              if (!s.name || !Array.isArray(s.data)) {
                errors.push(`Series index ${sIdx} is missing a name or data array.`);
                answersOk = false;
              } else if (Array.isArray(vd.categories) && s.data.length !== vd.categories.length) {
                errors.push(`Series "${s.name}" data length (${s.data.length}) does not match categories count (${vd.categories.length}).`);
                answersOk = false;
              }
            });
          }
        } else if (q.questionType === 'pie') {
          if (!Array.isArray(vd.labels) || vd.labels.length < 2) {
            errors.push('Pie chart visualData.labels must have at least 2 items.');
            answersOk = false;
          }
          if (!Array.isArray(vd.values) || vd.values.length < 2) {
            errors.push('Pie chart visualData.values must have at least 2 numbers.');
            answersOk = false;
          } else if (Array.isArray(vd.labels) && vd.values.length !== vd.labels.length) {
            errors.push(`Pie chart values length (${vd.values.length}) does not match labels length (${vd.labels.length}).`);
            answersOk = false;
          }
        } else if (q.questionType === 'table') {
          if (!Array.isArray(vd.tableHeaders) || vd.tableHeaders.length < 2) {
            errors.push('Table visualData.tableHeaders must have at least 2 column headers.');
            answersOk = false;
          }
          if (!Array.isArray(vd.tableRows) || vd.tableRows.length < 1) {
            errors.push('Table visualData.tableRows must have at least 1 data row.');
            answersOk = false;
          } else if (Array.isArray(vd.tableHeaders)) {
            vd.tableRows.forEach((row: any, rIdx: number) => {
              if (!Array.isArray(row) || row.length !== vd.tableHeaders.length) {
                errors.push(`Table row index ${rIdx} length does not match tableHeaders count (${vd.tableHeaders.length}).`);
                answersOk = false;
              }
            });
          }
        } else if (q.questionType === 'map') {
          if (!Array.isArray(vd.mapFeatures) || vd.mapFeatures.length < 1) {
            errors.push('Map comparison visualData.mapFeatures must have at least 1 feature detail.');
            answersOk = false;
          } else {
            vd.mapFeatures.forEach((f: any, fIdx: number) => {
              if (!f.name || !f.pastState || !f.presentState) {
                errors.push(`Map feature index ${fIdx} is missing name, pastState, or presentState.`);
                answersOk = false;
              }
            });
          }
        } else if (q.questionType === 'process') {
          if (!Array.isArray(vd.processSteps) || vd.processSteps.length < 2) {
            errors.push('Process diagram visualData.processSteps must have at least 2 ordered steps.');
            answersOk = false;
          } else {
            vd.processSteps.forEach((st: any, stIdx: number) => {
              if (typeof st.stepNumber !== 'number' || !st.title || !st.description) {
                errors.push(`Process step index ${stIdx} is missing stepNumber, title, or description.`);
                answersOk = false;
              }
            });
          }
        } else if (q.questionType === 'mixed') {
          if (!Array.isArray(vd.mixedComponents) || vd.mixedComponents.length < 2) {
            errors.push('Mixed visual data requires at least 2 distinct visual components in visualData.mixedComponents.');
            answersOk = false;
          }
        }
      }
    } else if (q.format === 'General Training') {
      if (!ALLOWED_GT_TASK1_LETTER_TYPES.has(q.questionType)) {
        errors.push(`Invalid General Training letterType "${q.questionType}".`);
        structuralOk = false;
      }
      if (!ALLOWED_GT_SCENARIOS.has(q.scenarioCategory)) {
        errors.push(`Invalid GT scenarioCategory "${q.scenarioCategory}".`);
        structuralOk = false;
      }
      if (!q.salutationInstruction || typeof q.salutationInstruction !== 'string' || !q.salutationInstruction.trim()) {
        errors.push('GT Task 1 letter requires a valid salutationInstruction (e.g. "Dear Sir or Madam,").');
        answersOk = false;
      }
      if (!Array.isArray(q.bulletPoints) || q.bulletPoints.length !== 3) {
        errors.push(`GT Task 1 letter requires EXACTLY 3 mandatory bullet points (observed ${Array.isArray(q.bulletPoints) ? q.bulletPoints.length : 0}).`);
        answersOk = false;
      } else {
        q.bulletPoints.forEach((bp: any, bpIdx: number) => {
          if (typeof bp !== 'string' || !bp.trim()) {
            errors.push(`GT Task 1 bullet point index ${bpIdx} is empty.`);
            answersOk = false;
          }
        });
      }
    }
  }

  // 3. Task 2 Validation
  if (q.taskCategory === 'task2') {
    if (q.suggestedTimeMinutes && q.suggestedTimeMinutes !== 40) {
      warnings.push(`Task 2 recommended time is 40 minutes (observed ${q.suggestedTimeMinutes}).`);
    }
    if (q.minWordLimit && q.minWordLimit !== 250) {
      warnings.push(`Task 2 standard minimum word limit is 250 (observed ${q.minWordLimit}).`);
    }

    if (!ALLOWED_TASK2_ESSAY_TYPES.has(q.questionType)) {
      errors.push(`Invalid Task 2 essayType "${q.questionType}".`);
      structuralOk = false;
    }

    if (!ALLOWED_TASK2_TOPICS.has(q.topicCategory)) {
      warnings.push(`Unrecognized Task 2 topicCategory "${q.topicCategory}".`);
    }

    if (!q.questionText || typeof q.questionText !== 'string' || !q.questionText.trim()) {
      errors.push('Task 2 questionText is missing or empty (e.g. "To what extent do you agree or disagree?").');
      answersOk = false;
    }
  }

  // 4. Model Answer Check (Optional)
  if (q.sampleModelAnswerBand9) {
    const words = q.sampleModelAnswerBand9.trim().split(/\s+/).length;
    const minWords = q.taskCategory === 'task1' ? 150 : 250;
    if (words < minWords) {
      warnings.push(`Sample Band 9 model answer length (${words} words) is below recommended ${minWords} words.`);
    }
  }

  const passed = structuralOk && answersOk && evidenceOk && errors.length === 0;

  return {
    passed,
    structuralOk,
    answersOk,
    evidenceOk,
    qualityOk,
    errors,
    warnings,
    stats: {
      passageCount: 1,
      totalQuestions: 1,
      passageQuestions: [1],
      wordCounts: [q.prompt ? q.prompt.trim().split(/\s+/).length : 0]
    }
  };
}

export function validateWritingExam(examData: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let structuralOk = true;
  let answersOk = true;
  let evidenceOk = true;
  let qualityOk = true;

  if (!examData || typeof examData !== 'object') {
    return {
      passed: false,
      structuralOk: false,
      answersOk: false,
      evidenceOk: false,
      qualityOk: false,
      errors: ['Writing exam package is empty or not an object.'],
      warnings: [],
      stats: { passageCount: 0, totalQuestions: 0, passageQuestions: [], wordCounts: [] }
    };
  }

  if (!examData.examId || typeof examData.examId !== 'string' || !examData.examId.trim()) {
    errors.push('Exam Package examId is missing or empty.');
    structuralOk = false;
  }

  if (!['Academic', 'General Training'].includes(examData.format)) {
    errors.push(`Invalid Exam Package format "${examData.format}". Must be 'Academic' or 'General Training'.`);
    structuralOk = false;
  }

  // Validate Task 1
  if (!examData.task1) {
    errors.push('Writing Exam Package is missing task1.');
    structuralOk = false;
  } else {
    const t1Val = validateWritingQuestion(examData.task1);
    if (!t1Val.passed) {
      errors.push(...t1Val.errors.map(e => `Task 1: ${e}`));
      warnings.push(...t1Val.warnings.map(w => `Task 1: ${w}`));
      answersOk = answersOk && t1Val.answersOk;
      structuralOk = structuralOk && t1Val.structuralOk;
    }
    if (examData.task1.format !== examData.format) {
      errors.push(`Task 1 format "${examData.task1.format}" does not match exam package format "${examData.format}".`);
      structuralOk = false;
    }
  }

  // Validate Task 2
  if (!examData.task2) {
    errors.push('Writing Exam Package is missing task2.');
    structuralOk = false;
  } else {
    const t2Val = validateWritingQuestion(examData.task2);
    if (!t2Val.passed) {
      errors.push(...t2Val.errors.map(e => `Task 2: ${e}`));
      warnings.push(...t2Val.warnings.map(w => `Task 2: ${w}`));
      answersOk = answersOk && t2Val.answersOk;
      structuralOk = structuralOk && t2Val.structuralOk;
    }
  }

  // Check unique IDs between task1 and task2
  if (examData.task1?.id && examData.task2?.id && examData.task1.id === examData.task2.id) {
    errors.push(`Duplicate Question ID "${examData.task1.id}" shared between Task 1 and Task 2.`);
    structuralOk = false;
  }

  const passed = structuralOk && answersOk && evidenceOk && errors.length === 0;

  return {
    passed,
    structuralOk,
    answersOk,
    evidenceOk,
    qualityOk,
    errors,
    warnings,
    stats: {
      passageCount: 2,
      totalQuestions: 2,
      passageQuestions: [1, 1],
      wordCounts: [
        examData.task1?.prompt ? examData.task1.prompt.trim().split(/\s+/).length : 0,
        examData.task2?.prompt ? examData.task2.prompt.trim().split(/\s+/).length : 0
      ]
    }
  };
}

export function validateSpeakingExam(examData: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let structuralOk = true;
  let answersOk = true;
  let evidenceOk = true;
  let qualityOk = true;

  if (!examData || typeof examData !== 'object') {
    return {
      passed: false,
      structuralOk: false,
      answersOk: false,
      evidenceOk: false,
      qualityOk: false,
      errors: ['Speaking exam package is empty or not an object.'],
      warnings: [],
      stats: { passageCount: 0, totalQuestions: 0, passageQuestions: [], wordCounts: [] }
    };
  }

  // 1. Exam Package Common Metadata
  if (!examData.examId || typeof examData.examId !== 'string' || !examData.examId.trim()) {
    errors.push('Speaking Exam Package examId is missing or empty.');
    structuralOk = false;
  }

  if (examData.schemaVersion && examData.schemaVersion !== '1.0') {
    warnings.push(`Expected schemaVersion '1.0', observed '${examData.schemaVersion}'.`);
  }

  if (!['Academic', 'General Training'].includes(examData.format)) {
    errors.push(`Invalid Exam Package format "${examData.format}". Must be 'Academic' or 'General Training'.`);
    structuralOk = false;
  }

  const seenIds = new Set<string>();
  const seenPrompts = new Set<string>();

  let part1QuestionCount = 0;
  let part1WordCount = 0;
  let part2QuestionCount = 0;
  let part2WordCount = 0;
  let part3QuestionCount = 0;
  let part3WordCount = 0;

  // 2. Validate Part 1
  if (!examData.part1 || typeof examData.part1 !== 'object') {
    errors.push('Part 1 section is missing or invalid.');
    structuralOk = false;
  } else {
    const topicGroups = Array.isArray(examData.part1.topicGroups) ? examData.part1.topicGroups : [];
    if (topicGroups.length === 0) {
      errors.push('Part 1 must contain at least one topic group in topicGroups array.');
      structuralOk = false;
    }

    topicGroups.forEach((tg: any, tgIdx: number) => {
      const tgName = tg.title || `Topic Group ${tgIdx + 1}`;
      const questions = Array.isArray(tg.questions) ? tg.questions : [];

      if (questions.length === 0) {
        errors.push(`Part 1 ${tgName}: Topic group questions array is empty.`);
        structuralOk = false;
      }

      questions.forEach((q: any, qIdx: number) => {
        part1QuestionCount++;
        // ID check
        if (!q.id || typeof q.id !== 'string' || !q.id.trim()) {
          errors.push(`Part 1 ${tgName} question index ${qIdx}: Question ID is missing or empty.`);
          structuralOk = false;
        } else {
          if (seenIds.has(q.id)) {
            errors.push(`Part 1 ${tgName}: Duplicate Question ID "${q.id}" detected.`);
            structuralOk = false;
          }
          seenIds.add(q.id);
        }

        // Prompt check
        if (!q.prompt || typeof q.prompt !== 'string' || !q.prompt.trim()) {
          errors.push(`Part 1 ${tgName} question ${q.id || qIdx}: Question prompt is empty.`);
          structuralOk = false;
        } else {
          part1WordCount += q.prompt.trim().split(/\s+/).length;
          const normPrompt = normalizeText(q.prompt);
          if (seenPrompts.has(normPrompt)) {
            errors.push(`Part 1 ${tgName} question ${q.id || qIdx}: Duplicate question prompt text detected.`);
            qualityOk = false;
          }
          seenPrompts.add(normPrompt);
        }
      });
    });
  }

  // 3. Validate Part 2
  if (!examData.part2 || typeof examData.part2 !== 'object') {
    errors.push('Part 2 section (Cue Card task) is missing or invalid.');
    structuralOk = false;
  } else {
    const p2 = examData.part2;
    part2QuestionCount = 1;

    if (!p2.id || typeof p2.id !== 'string' || !p2.id.trim()) {
      errors.push('Part 2 cue card ID is missing or empty.');
      structuralOk = false;
    } else {
      if (seenIds.has(p2.id)) {
        errors.push(`Part 2: Duplicate Question ID "${p2.id}" detected.`);
        structuralOk = false;
      }
      seenIds.add(p2.id);
    }

    if (!p2.topic || typeof p2.topic !== 'string' || !p2.topic.trim()) {
      errors.push('Part 2 cue card topic is missing or empty.');
      structuralOk = false;
    } else {
      part2WordCount += p2.topic.trim().split(/\s+/).length;
    }

    if (!p2.instructions || typeof p2.instructions !== 'string' || !p2.instructions.trim()) {
      errors.push('Part 2 candidate instructions are missing or empty.');
      structuralOk = false;
    } else {
      part2WordCount += p2.instructions.trim().split(/\s+/).length;
    }

    // Bullet Prompts Check
    if (!Array.isArray(p2.bulletPrompts) || p2.bulletPrompts.length === 0) {
      errors.push('Part 2 cue card must contain a non-empty bulletPrompts array.');
      answersOk = false;
    } else {
      if (p2.bulletPrompts.length < 3 || p2.bulletPrompts.length > 4) {
        warnings.push(`Part 2 recommended bullet prompt count is 3 to 4 (observed ${p2.bulletPrompts.length}).`);
      }
      p2.bulletPrompts.forEach((bp: any, bpIdx: number) => {
        if (typeof bp !== 'string' || !bp.trim()) {
          errors.push(`Part 2 bullet prompt index ${bpIdx} is empty.`);
          answersOk = false;
        } else {
          part2WordCount += bp.trim().split(/\s+/).length;
        }
      });
    }

    // Timing Check
    if (typeof p2.preparationTimeSeconds === 'number' && p2.preparationTimeSeconds !== 60) {
      warnings.push(`Part 2 standard preparation time is 60 seconds (observed ${p2.preparationTimeSeconds}s).`);
    }
    if (typeof p2.speakingTimeSeconds === 'number' && p2.speakingTimeSeconds !== 120) {
      warnings.push(`Part 2 standard speaking time is 120 seconds (observed ${p2.speakingTimeSeconds}s).`);
    }
  }

  // 4. Validate Part 3
  if (!examData.part3 || typeof examData.part3 !== 'object') {
    errors.push('Part 3 section is missing or invalid.');
    structuralOk = false;
  } else {
    const themes = Array.isArray(examData.part3.themes) ? examData.part3.themes : [];
    if (themes.length === 0) {
      errors.push('Part 3 must contain at least one discussion theme in themes array.');
      structuralOk = false;
    }

    const p2TopicNorm = normalizeText(examData.part2?.topic || '');

    themes.forEach((th: any, thIdx: number) => {
      const thName = th.title || `Theme ${thIdx + 1}`;
      const questions = Array.isArray(th.questions) ? th.questions : [];

      if (!th.connectedPart2Theme || typeof th.connectedPart2Theme !== 'string' || !th.connectedPart2Theme.trim()) {
        warnings.push(`Part 3 ${thName}: Theme connectedPart2Theme description is missing.`);
      } else if (p2TopicNorm && p2TopicNorm.length > 5) {
        const thConnNorm = normalizeText(th.connectedPart2Theme);
        const p2Tokens = p2TopicNorm.split(' ').filter(w => w.length > 3);
        const matchCount = p2Tokens.filter(t => thConnNorm.includes(t));
        if (p2Tokens.length > 0 && matchCount.length === 0) {
          warnings.push(`Part 3 ${thName}: Theme connection "${th.connectedPart2Theme}" does not share key theme terms with Part 2 topic.`);
        }
      }

      if (questions.length === 0) {
        errors.push(`Part 3 ${thName}: Theme questions array is empty.`);
        structuralOk = false;
      }

      questions.forEach((q: any, qIdx: number) => {
        part3QuestionCount++;
        // ID check
        if (!q.id || typeof q.id !== 'string' || !q.id.trim()) {
          errors.push(`Part 3 ${thName} question index ${qIdx}: Question ID is missing or empty.`);
          structuralOk = false;
        } else {
          if (seenIds.has(q.id)) {
            errors.push(`Part 3 ${thName}: Duplicate Question ID "${q.id}" detected.`);
            structuralOk = false;
          }
          seenIds.add(q.id);
        }

        // Prompt check
        if (!q.prompt || typeof q.prompt !== 'string' || !q.prompt.trim()) {
          errors.push(`Part 3 ${thName} question ${q.id || qIdx}: Question prompt is empty.`);
          structuralOk = false;
        } else {
          part3WordCount += q.prompt.trim().split(/\s+/).length;
          const normPrompt = normalizeText(q.prompt);
          if (seenPrompts.has(normPrompt)) {
            errors.push(`Part 3 ${thName} question ${q.id || qIdx}: Duplicate question prompt text detected.`);
            qualityOk = false;
          }
          seenPrompts.add(normPrompt);
        }
      });
    });
  }

  const totalQuestions = part1QuestionCount + part2QuestionCount + part3QuestionCount;
  const passed = structuralOk && answersOk && evidenceOk && qualityOk && errors.length === 0;

  return {
    passed,
    structuralOk,
    answersOk,
    evidenceOk,
    qualityOk,
    errors,
    warnings,
    stats: {
      passageCount: 3,
      totalQuestions,
      passageQuestions: [part1QuestionCount, part2QuestionCount, part3QuestionCount],
      wordCounts: [part1WordCount, part2WordCount, part3WordCount]
    }
  };
}

