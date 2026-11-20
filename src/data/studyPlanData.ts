/**
 * BandSprint - Structured Study Roadmap (30-Day Sprint & 60-Day Comprehensive)
 * Covers balanced daily targets across Listening, Reading, Writing, Speaking, Lexical Resource & Grammar.
 * Calibrated to Practice English & Coach test specifications.
 */

export interface DailyStudyTask {
  day: number;
  phase: string;
  focusSkill: 'Listening' | 'Reading' | 'Writing' | 'Speaking' | 'Vocabulary & Grammar' | 'Full Mock';
  title: string;
  title_bn: string;
  estimatedMinutes: number;
  morningRoutine?: string;
  eveningDrill?: string;
  tasks: {
    description: string;
    actionModule?: string;
    isCore?: boolean;
  }[];
  tipOfDay: string;
  examinerInsight?: string;
  milestoneGoal?: string;
}

export const THIRTY_DAY_STUDY_PLAN: DailyStudyTask[] = [
  // ==========================================
  // PHASE 1: FOUNDATION & DIAGNOSTIC (DAYS 1-7)
  // ==========================================
  {
    day: 1,
    phase: 'Phase 1: Foundation & Diagnostic',
    focusSkill: 'Listening',
    title: 'Listening Section 1 Mastery & Diagnostic Baseline',
    title_bn: 'লিসেনিং সেকশন ১ এবং বেসিক ডায়াগনস্টিক টেস্ট',
    estimatedMinutes: 65,
    morningRoutine: '20m: Form-filling and number/date spelling calibration',
    eveningDrill: '45m: Complete official Listening diagnostic and log errors into Mistake Vault',
    tasks: [
      { description: 'Complete a full authentic Listening diagnostic test (Sections 1–4)', actionModule: 'listening', isCore: true },
      { description: 'Practice 20 high-frequency spelling trap words (e.g. accommodation, environment, separate)', actionModule: 'spelling', isCore: true },
      { description: 'Review Grammar Rule 1: Subordinating Concession (Although vs But)', actionModule: 'grammar' }
    ],
    tipOfDay: 'Listening Section 1 focuses on numbers, addresses, and dates. Always double check singular/plural forms and hyphenated compound nouns!',
    examinerInsight: 'Band 8 candidates rarely miss Section 1 questions; achieving 10/10 in Section 1 creates a safe score buffer for Section 3 & 4.',
    milestoneGoal: 'Establish baseline score across all 4 sections.'
  },
  {
    day: 2,
    phase: 'Phase 1: Foundation & Diagnostic',
    focusSkill: 'Reading',
    title: 'Academic Reading Skimming & TFNG Decision Tree',
    title_bn: 'রিডিং স্কিমিং টেকনিক ও ট্রু/ফলস/নট গিভেন কৌশল',
    estimatedMinutes: 70,
    morningRoutine: '25m: Rapid paragraph scanning and topic sentence extraction',
    eveningDrill: '45m: 13-question True/False/Not Given timed drill with keyword matching table',
    tasks: [
      { description: 'Read Passage 1 with 250 WPM pacer and identify main topic sentences', actionModule: 'speedreading', isCore: true },
      { description: 'Solve 13 True / False / Not Given questions with systematic keyword tracking', actionModule: 'reading', isCore: true },
      { description: 'Master 15 Academic Collocations (Environment & Climate Change)', actionModule: 'collocations' }
    ],
    tipOfDay: 'If the passage does NOT contradict the statement and simply provides no evidence for the specific relationship, the answer is NOT GIVEN.',
    examinerInsight: 'Do not rely on outside knowledge. Every answer must be strictly verifiable from the printed passage text.',
    milestoneGoal: 'Zero True vs Not Given confusion on Passage 1.'
  },
  {
    day: 3,
    phase: 'Phase 1: Foundation & Diagnostic',
    focusSkill: 'Writing',
    title: 'Task 1 Line Graph & Overview Formula',
    title_bn: 'টাস্ক ১ লাইন গ্রাফ ও ওভারভিউ লেখার অব্যর্থ ফর্মুলা',
    estimatedMinutes: 75,
    morningRoutine: '25m: Overview formula drills without mentioning specific data figures',
    eveningDrill: '50m: Timed 20-minute Task 1 draft with lexical trend variations',
    tasks: [
      { description: 'Deconstruct a Band 9 model report for Energy Production Line Graph', actionModule: 'modelanswers', isCore: true },
      { description: 'Practice Grammar Rule 10: Trend variation (Verb+Adverb vs Adj+Noun patterns)', actionModule: 'grammar' },
      { description: 'Write a full 150-word Task 1 line graph report and review with AI feedback', actionModule: 'writing', isCore: true }
    ],
    tipOfDay: 'Never insert personal opinions or external world causes into Task 1. Report strictly what the graph displays!',
    examinerInsight: 'An overview is mandatory for Band 7+. If you omit the overall trend, Task Achievement is capped at Band 5.',
    milestoneGoal: 'Produce a flawless 2-sentence Overview within 3 minutes.'
  },
  {
    day: 4,
    phase: 'Phase 1: Foundation & Diagnostic',
    focusSkill: 'Speaking',
    title: 'Speaking Part 1 Fluency & Natural Extensions',
    title_bn: 'স্পিকিং পার্ট ১ সাবলীলতা ও অতিরিক্ত তথ্য যুক্ত করার কৌশল',
    estimatedMinutes: 55,
    morningRoutine: '20m: Shadowing drill with British male voice examiner',
    eveningDrill: '35m: Record answers for 8 Part 1 prompts (Hometown, Daily Routine, Hobbies)',
    tasks: [
      { description: 'Listen to 3 Band 9 Part 1 audio answers in the Speaking Vault', actionModule: 'speakingvault', isCore: true },
      { description: 'Record yourself answering Part 1 prompts using the Answer + Extend + Reason formula', actionModule: 'speaking', isCore: true },
      { description: 'Learn 12 natural discourse markers for conversational coherence', actionModule: 'phrases' }
    ],
    tipOfDay: 'Avoid robotic one-word answers. Aim for 2 to 3 sentences per Part 1 question with natural rhythm.',
    examinerInsight: 'Fluency does not mean talking fast without breathing; it means speaking smoothly with natural pauses between clauses.',
    milestoneGoal: 'Eliminate hesitation pauses on common personal topics.'
  },
  {
    day: 5,
    phase: 'Phase 1: Foundation & Diagnostic',
    focusSkill: 'Writing',
    title: 'Task 2 Essay Skeleton & PESTLE Idea Generation',
    title_bn: 'টাস্ক ২ এসে রূপরেখা ও দ্রুত আইডিয়া জেনারেশন (PESTLE)',
    estimatedMinutes: 80,
    morningRoutine: '25m: Rapid brainstorming using Political, Economic, Social, and Tech lenses',
    eveningDrill: '55m: Draft a 280-word Agree/Disagree essay on Education Funding',
    tasks: [
      { description: 'Use PESTLE Matrix to brainstorm arguments for university tuition fees', actionModule: 'arguments', isCore: true },
      { description: 'Study Band 9 Education model essay and examiner commentary', actionModule: 'modelanswers', isCore: true },
      { description: 'Practice Grammar Rule 2: Negative Inversion (Not only does...)', actionModule: 'grammar' }
    ],
    tipOfDay: 'Spend the first 5 minutes planning paragraph 2 and 3 before writing. Unplanned essays almost always lose coherence.',
    examinerInsight: 'One fully developed argument with an authentic example scores higher than three superficial points.',
    milestoneGoal: 'Generate 4 strong arguments within 3 minutes using PESTLE.'
  },
  {
    day: 6,
    phase: 'Phase 1: Foundation & Diagnostic',
    focusSkill: 'Listening',
    title: 'Listening Section 2 (Maps & Directions)',
    title_bn: 'লিসেনিং সেকশন ২ ম্যাপ লেবেলিং ও দিকনির্দেশনা',
    estimatedMinutes: 65,
    morningRoutine: '20m: Spatial preposition drills (adjacent, opposite, north-west quadrant)',
    eveningDrill: '45m: Complete 2 full Section 2 Map & Plan sets under exam timing',
    tasks: [
      { description: 'Complete 2 Map Labeling sets with real-time directional tracking', actionModule: 'listening', isCore: true },
      { description: 'Review spatial navigation vocabulary in Academic Collocations', actionModule: 'collocations' },
      { description: 'Practice Spelling Trap Quiz: Double consonants and silent letters', actionModule: 'spelling', isCore: true }
    ],
    tipOfDay: 'Keep your pencil tip on the map starting point (e.g. Main Entrance) and follow the speaker step-by-step.',
    examinerInsight: 'Beware of distractors: speakers often say "we originally intended to place it next to... but instead..."',
    milestoneGoal: 'Accurately orient cardinal directions (N/S/E/W) on complex maps.'
  },
  {
    day: 7,
    phase: 'Phase 1: Foundation & Diagnostic',
    focusSkill: 'Full Mock',
    title: 'Weekly Milestone 1: Mini Mock & Weakness Diagnostic',
    title_bn: 'মিনি মক টেস্ট এবং মিস্টেক ভল্ট পর্যালোচনা',
    estimatedMinutes: 90,
    morningRoutine: '60m: Timed combined Sectional Mock (Listening + Reading)',
    eveningDrill: '30m: Error triage and Mistake Vault logging',
    tasks: [
      { description: 'Complete a timed 60-minute combined Listening + Reading mock simulation', actionModule: 'mocktest', isCore: true },
      { description: 'Transfer all incorrect questions into the Mistake Vault for root-cause tagging', actionModule: 'vault', isCore: true },
      { description: 'Calculate projected band score and identify primary deficit module', actionModule: 'bandcalculator' }
    ],
    tipOfDay: 'Reviewing why you got a question wrong yields twice the score improvement of taking another test without analysis.',
    examinerInsight: 'Categorize your errors: was it vocabulary unknown, keyword trap, spelling, or time pressure?',
    milestoneGoal: 'Pass Phase 1 evaluation with clear deficit benchmark.'
  },

  // ==========================================
  // PHASE 2: SPEED, PRECISION & TRAP DEFENSE (DAYS 8-14)
  // ==========================================
  {
    day: 8,
    phase: 'Phase 2: Speed, Precision & Trap Defense',
    focusSkill: 'Reading',
    title: 'Matching Headings & Distractor Elimination',
    title_bn: 'ম্যাচিং হেডিংস ও অপশন এলিমিনেশন টেকনিক',
    estimatedMinutes: 70,
    morningRoutine: '25m: Skim-reading for overarching paragraph purpose vs specific detail',
    eveningDrill: '45m: Complete 2 challenging Passage 2 Matching Headings sets',
    tasks: [
      { description: 'Solve 8 Matching Headings questions identifying purpose vs detail distractors', actionModule: 'reading', isCore: true },
      { description: 'Study 20 Academic Words for technological and scientific passages', actionModule: 'vocab', isCore: true },
      { description: 'Review Grammar Rule 4: Cleft sentences for emphasis (It was... that...)', actionModule: 'grammar' }
    ],
    tipOfDay: 'Do Matching Headings FIRST before detail questions. Skimming the whole passage for headings gives you a mental map.',
    examinerInsight: 'Headings summarize the ENTIRE paragraph. Avoid picking a heading just because it contains a word found in one sentence.',
    milestoneGoal: 'Solve a 7-paragraph Matching Headings set in under 12 minutes.'
  },
  {
    day: 9,
    phase: 'Phase 2: Speed, Precision & Trap Defense',
    focusSkill: 'Listening',
    title: 'Section 3 Academic Discussion & Multiple Choice Traps',
    title_bn: 'লিসেনিং সেকশন ৩ একাডেমিক ডিসকাশন ও এমসিকিউ ফাঁদ',
    estimatedMinutes: 65,
    morningRoutine: '20m: Multi-speaker voice identification and agreement/disagreement cues',
    eveningDrill: '45m: Complete Section 3 research project dialogue test',
    tasks: [
      { description: 'Listen to a university tutorial dialogue with 3 speakers and track turn-taking', actionModule: 'listening', isCore: true },
      { description: 'Master 10 academic conversation discourse markers', actionModule: 'phrases' },
      { description: 'Review Grammar Rule 6: Reduced Relative Clauses', actionModule: 'grammar' }
    ],
    tipOfDay: 'Underline key differences between options A, B, and C during the 30-second preparation time.',
    examinerInsight: 'The speaker will often mention all three options! Listen for concession markers like "I thought so too at first, however..."',
    milestoneGoal: 'Distinguish between speaker consensus and individual suggestion.'
  },
  {
    day: 10,
    phase: 'Phase 2: Speed, Precision & Trap Defense',
    focusSkill: 'Writing',
    title: 'Writing Task 2 Body Paragraphs: The PEEL Method',
    title_bn: 'টাস্ক ২ বডি প্যারাগ্রাফ: পিইইএল (PEEL) মেথড',
    estimatedMinutes: 75,
    morningRoutine: '25m: Point -> Explanation -> Example -> Link outline drills',
    eveningDrill: '50m: Write 2 fully developed body paragraphs on Environmental Taxation',
    tasks: [
      { description: 'Draft two PEEL body paragraphs with authentic evidence and consequence chains', actionModule: 'writing', isCore: true },
      { description: 'Explore Band 9 Global Warming and Climate model essays', actionModule: 'modelanswers', isCore: true },
      { description: 'Practice 15 C1 Academic Idioms and figurative collocations', actionModule: 'c1idioms' }
    ],
    tipOfDay: 'Ensure your example proves the explanation, not just the general topic.',
    examinerInsight: 'Band 8 requires an extended, supported point. Avoid listing 4 separate weak points in one paragraph.',
    milestoneGoal: 'Achieve 90+ words per body paragraph with clear logical cohesion.'
  },
  {
    day: 11,
    phase: 'Phase 2: Speed, Precision & Trap Defense',
    focusSkill: 'Speaking',
    title: 'Speaking Part 2: The 1-Minute Bullet Scratchpad System',
    title_bn: 'স্পিকিং পার্ট ২: ১ মিনিটের নোট টেকিং সিস্টেম',
    estimatedMinutes: 60,
    morningRoutine: '20m: 1-minute cue card brainstorming drills using bullet shorthand',
    eveningDrill: '40m: Deliver full 2-minute uninterrupted monologue with timer',
    tasks: [
      { description: 'Practice 3 recent Part 2 Cue Cards (Describe a historical building, an impactful mentor)', actionModule: 'speaking', isCore: true },
      { description: 'Review Band 9 model speech recordings in Speaking Vault', actionModule: 'speakingvault' },
      { description: 'Learn 10 storytelling sequencing phrases (initially, subsequently, in retrospect)', actionModule: 'phrases', isCore: true }
    ],
    tipOfDay: 'Write keywords and collocations on your paper, NEVER complete sentences. Complete sentences waste your 60 seconds.',
    examinerInsight: 'Do not panic if the examiner stops you at 2 minutes. That means you fulfilled the time requirement successfully.',
    milestoneGoal: 'Speak fluently for 1 minute 50 seconds without running out of ideas.'
  },
  {
    day: 12,
    phase: 'Phase 2: Speed, Precision & Trap Defense',
    focusSkill: 'Reading',
    title: 'Summary Completion & Strict Word Limit Discipline',
    title_bn: 'সামারি কমপ্লিশন ও শব্দসীমা নিয়ন্ত্রণ',
    estimatedMinutes: 65,
    morningRoutine: '20m: Grammatical part-of-speech prediction (noun, adjective, verb form)',
    eveningDrill: '45m: Complete 2 passage summaries under timed pressure',
    tasks: [
      { description: 'Solve 2 Summary Completion sets with and without word box options', actionModule: 'reading', isCore: true },
      { description: 'Practice 25 High-Frequency Academic Words with spelling drills', actionModule: 'spelling', isCore: true },
      { description: 'Learn 15 Lexical Resource Collocations for Education & Careers', actionModule: 'collocations' }
    ],
    tipOfDay: 'Check the word count instruction! "NO MORE THAN TWO WORDS" means three words is an automatic zero, even if the fact is true.',
    examinerInsight: 'Predict the part of speech before searching the text. If the gap needs a plural noun, eliminate singular candidates.',
    milestoneGoal: '100% accuracy on grammatical gap prediction.'
  },
  {
    day: 13,
    phase: 'Phase 2: Speed, Precision & Trap Defense',
    focusSkill: 'Writing',
    title: 'Task 1 Bar Charts, Tables & Percentage Traps',
    title_bn: 'টাস্ক ১ বার চার্ট ও পারসেন্টেজ সংক্রান্ত ফাঁদ',
    estimatedMinutes: 70,
    morningRoutine: '25m: Percentage vs Percentage Point distinction drills',
    eveningDrill: '45m: Write full 150-word report for a multi-category Bar Chart',
    tasks: [
      { description: 'Deconstruct model answers for a complex Table and Bar Chart report', actionModule: 'modelanswers', isCore: true },
      { description: 'Write a full 150-word Task 1 report with grouping by category', actionModule: 'writing', isCore: true },
      { description: 'Review Grammar Rule 9: Passive reporting voice (was recorded, witnessed a surge)', actionModule: 'grammar' }
    ],
    tipOfDay: 'Never describe bar charts bar-by-bar. Group categories logically into two main body paragraphs.',
    examinerInsight: 'Distinguish clearly between "increased by 20%" and "increased to 20%". Misreporting data drops Task Achievement to Band 6.',
    milestoneGoal: 'Group 8 data categories into 2 coherent analytical paragraphs.'
  },
  {
    day: 14,
    phase: 'Phase 2: Speed, Precision & Trap Defense',
    focusSkill: 'Full Mock',
    title: 'Weekly Milestone 2: Timed Sectional Sprint',
    title_bn: 'উইকলি মাইলস্টোন ২: টাইমিং টেস্ট ও রিডিং-লিসেনিং স্প্রিন্ট',
    estimatedMinutes: 85,
    morningRoutine: '55m: Complete Section 1–4 Listening with standard pause discipline',
    eveningDrill: '30m: Audit mistake log and update adaptive personal study targets',
    tasks: [
      { description: 'Complete an authentic 40-question Listening test with Practice British audio', actionModule: 'listening', isCore: true },
      { description: 'Complete 1 Passage of Reading under strict 20-minute timer', actionModule: 'reading', isCore: true },
      { description: 'Log all missed items into the Mistake Vault and check error trends', actionModule: 'vault', isCore: true }
    ],
    tipOfDay: 'Track your pacing: on Reading, Passage 1 should take 17 mins, Passage 2 takes 20 mins, Passage 3 takes 23 mins.',
    examinerInsight: 'Notice which question types cause the most errors. Dedicate week 3 specifically to those deficits.',
    milestoneGoal: 'Listening raw score >= 32/40 (Band 7.5+).'
  },

  // ==========================================
  // PHASE 3: ADVANCED SYNTHESIS & BAND 8+ (DAYS 15-21)
  // ==========================================
  {
    day: 15,
    phase: 'Phase 3: Advanced Synthesis & Band 8.0+',
    focusSkill: 'Listening',
    title: 'Section 4 Academic Lecture Monologue Mastery',
    title_bn: 'লিসেনিং সেকশন ৪ একাডেমিক লেকচার ও নোট টেকিং',
    estimatedMinutes: 65,
    morningRoutine: '20m: Signposting recognition (turning to, in contrast to earlier hypotheses)',
    eveningDrill: '45m: Complete Section 4 biology/archaeology lecture test without pause',
    tasks: [
      { description: 'Listen to an authentic university lecture and complete 10 sentence completion items', actionModule: 'listening', isCore: true },
      { description: 'Practice 20 scientific and academic spelling trap words', actionModule: 'spelling', isCore: true },
      { description: 'Review 15 C1 Academic Idioms for natural language comprehension', actionModule: 'c1idioms' }
    ],
    tipOfDay: 'Section 4 has NO mid-way pause! Read all 10 questions in the opening 60 seconds.',
    examinerInsight: 'Speakers often paraphrase bullet headers. Listen for synonyms of the header text to know where the speaker is.',
    milestoneGoal: 'Score at least 8/10 on Section 4.'
  },
  {
    day: 16,
    phase: 'Phase 3: Advanced Synthesis & Band 8.0+',
    focusSkill: 'Reading',
    title: 'Passage 3: Abstract Views, Claims & Yes/No/Not Given',
    title_bn: 'প্যাসেজ ৩: জটিল দার্শনিক প্রবন্ধ ও ইয়েস/নো/নট গিভেন',
    estimatedMinutes: 75,
    morningRoutine: '25m: Differentiating writer claims vs established factual reality',
    eveningDrill: '50m: Timed 20-minute drill on a challenging Passage 3 scientific paper',
    tasks: [
      { description: 'Solve 14 Yes/No/Not Given questions focusing on writer perspective', actionModule: 'reading', isCore: true },
      { description: 'Train rapid text scanning at 280 WPM with comprehension checkpoint', actionModule: 'speedreading', isCore: true },
      { description: 'Review Grammar Rule 3: Mixed Conditionals in academic prose', actionModule: 'grammar' }
    ],
    tipOfDay: 'YES/NO/NOT GIVEN tests the WRITER\'S OPINION, whereas TRUE/FALSE/NOT GIVEN tests FACTUAL INFORMATION.',
    examinerInsight: 'Be alert to modal qualifiers: "may potentially suggest" is NOT the same as "definitively proves".',
    milestoneGoal: 'Differentiate nuanced claims from objective facts in under 20 minutes.'
  },
  {
    day: 17,
    phase: 'Phase 3: Advanced Synthesis & Band 8.0+',
    focusSkill: 'Writing',
    title: 'Task 2 Complex Sentence Structures & Cohesion',
    title_bn: 'টাস্ক ২ কমপ্লেক্স সেন্টেন্স ও কোহেশন অপ্টিমাইজেশন',
    estimatedMinutes: 80,
    morningRoutine: '25m: Inversion, participle clauses, and compound-complex sentence drills',
    eveningDrill: '55m: Write a complete Discussion Essay (Discuss Both Views and Give Opinion)',
    tasks: [
      { description: 'Draft a full 270-word Discuss Both Views essay on Automation and Employment', actionModule: 'writing', isCore: true },
      { description: 'Evaluate sentence complexity and cohesion with the Band Descriptor decoder', actionModule: 'banddescriptors', isCore: true },
      { description: 'Study Band 9 Artificial Intelligence model essay and examiner breakdown', actionModule: 'modelanswers' }
    ],
    tipOfDay: 'Use varied cohesive devices: not just "Furthermore" and "Moreover", but referencing pronouns, ellipsis, and lexical substitution.',
    examinerInsight: 'Overusing mechanical linking words at the start of every sentence restricts Coherence and Cohesion to Band 7.',
    milestoneGoal: 'Incorporate at least 4 distinct complex sentence structures naturally.'
  },
  {
    day: 18,
    phase: 'Phase 3: Advanced Synthesis & Band 8.0+',
    focusSkill: 'Speaking',
    title: 'Speaking Part 3: Abstract Evaluation & Concession Formulas',
    title_bn: 'স্পিকিং পার্ট ৩: গভীর বিশ্লেষণ ও কনসেশন টেকনিক',
    estimatedMinutes: 65,
    morningRoutine: '20m: Concession formulas (While it is undeniably true that..., one cannot overlook...)',
    eveningDrill: '45m: Complete a full simulated interview with the AI Voice Examiner',
    tasks: [
      { description: 'Practice 6 abstract Part 3 questions on Social Media, Heritage, and Globalization', actionModule: 'speaking', isCore: true },
      { description: 'Analyze Band 9 Part 3 responses in the Speaking Vault for nuance', actionModule: 'speakingvault' },
      { description: 'Learn 12 Advanced Collocations for societal discussions', actionModule: 'collocations', isCore: true }
    ],
    tipOfDay: 'Part 3 questions are NOT about you personally. Use societal, generational, and global perspectives ("From a broader societal standpoint...").',
    examinerInsight: 'Conceding the counter-argument before defending your stance immediately signals Band 8+ Lexical and Grammatical control.',
    milestoneGoal: 'Speak for 45-60 seconds per Part 3 question with societal frameworks.'
  },
  {
    day: 19,
    phase: 'Phase 3: Advanced Synthesis & Band 8.0+',
    focusSkill: 'Writing',
    title: 'Task 1 Process Diagrams & Natural Life Cycles',
    title_bn: 'টাস্ক ১ প্রসেস ডায়াগ্রাম ও ম্যানুফ্যাকচারিং ফ্লো',
    estimatedMinutes: 70,
    morningRoutine: '25m: Passive voice conversion and sequential time connectors',
    eveningDrill: '45m: Draft full 160-word report for a Water Purification or Glass Recycling process',
    tasks: [
      { description: 'Deconstruct a Band 9 Process Diagram model report (Man-made vs Natural)', actionModule: 'modelanswers', isCore: true },
      { description: 'Write a full Task 1 report describing a manufacturing sequence', actionModule: 'writing', isCore: true },
      { description: 'Review Grammar Rule 9: Passive Voice with modal auxiliaries', actionModule: 'grammar' }
    ],
    tipOfDay: 'In process diagrams, count the number of stages and state it clearly in your Overview: "The process comprises six sequential stages, commencing with... and concluding with..."',
    examinerInsight: 'Process diagrams require almost exclusively the PASSIVE voice because the agent performing the action is irrelevant.',
    milestoneGoal: 'Correctly identify and sequence all stages without omitting steps.'
  },
  {
    day: 20,
    phase: 'Phase 3: Advanced Synthesis & Band 8.0+',
    focusSkill: 'Reading',
    title: 'Multiple Choice Distractors & Trap Elimination',
    title_bn: 'রিডিং মাল্টিপল চয়েস ও ফাঁদ এলিমিনেশন টেকনিক',
    estimatedMinutes: 70,
    morningRoutine: '25m: Analyzing why the 3 incorrect options are wrong (too broad, too narrow, contradictory)',
    eveningDrill: '45m: 10-question Passage 3 Multiple Choice drill under exam time limit',
    tasks: [
      { description: 'Solve 10 tricky Multiple Choice questions with explicit distractor labeling', actionModule: 'reading', isCore: true },
      { description: 'Review 20 Academic Collocations for Business & Economics', actionModule: 'collocations', isCore: true },
      { description: 'Test speed and accuracy with the 300 WPM text pacer', actionModule: 'speedreading' }
    ],
    tipOfDay: 'Cross out options that are "half-true" — if the first half matches the text but the second half is unsupported, it is a distractor!',
    examinerInsight: 'Correct options almost always rephrase the passage using sophisticated synonyms rather than verbatim text matching.',
    milestoneGoal: 'Achieve 85%+ accuracy on Passage 3 Multiple Choice.'
  },
  {
    day: 21,
    phase: 'Phase 3: Advanced Synthesis & Band 8.0+',
    focusSkill: 'Full Mock',
    title: 'Weekly Milestone 3: Full Diagnostic Writing & Speaking Review',
    title_bn: 'উইকলি মাইলস্টোন ৩: রাইটিং ও স্পিকিং গভীর মূল্যায়ন',
    estimatedMinutes: 90,
    morningRoutine: '60m: Timed Writing Simulation (Task 1: 20m + Task 2: 40m strict)',
    eveningDrill: '30m: Speaking interview recorded and analyzed against Band 8 descriptors',
    tasks: [
      { description: 'Complete a full timed Writing test (Task 1 + Task 2 in 60 minutes sharp)', actionModule: 'writing', isCore: true },
      { description: 'Conduct a full 14-minute speaking interview with AI Examiner', actionModule: 'speaking', isCore: true },
      { description: 'Audit lexical range against Practice Band Descriptors', actionModule: 'banddescriptors', isCore: true }
    ],
    tipOfDay: 'Time allocation is non-negotiable: exactly 20 minutes for Task 1 and 40 minutes for Task 2. Never steal time from Task 2!',
    examinerInsight: 'Task 2 is worth twice as many marks as Task 1 toward your overall Writing band score.',
    milestoneGoal: 'Complete both writing tasks within 60 minutes with 2 minutes to spare for proofreading.'
  },

  // ==========================================
  // PHASE 4: EXAM SPRINT & FINAL READINESS (DAYS 22-30)
  // ==========================================
  {
    day: 22,
    phase: 'Phase 4: Exam Sprint & Final Readiness',
    focusSkill: 'Writing',
    title: 'Task 1 Maps: Past vs Present Spatial Transformations',
    title_bn: 'টাস্ক ১ ম্যাপ: অতীত বনাম বর্তমান অবকাঠামো পরিবর্তন',
    estimatedMinutes: 65,
    morningRoutine: '20m: Verbs of expansion, demolition, and renovation (demolished to make way for, erected, converted)',
    eveningDrill: '45m: Complete full 150-word report for a town redevelopment map',
    tasks: [
      { description: 'Study Band 9 Town Center Redevelopment map report', actionModule: 'modelanswers', isCore: true },
      { description: 'Write a full 150-word Task 1 map comparison report', actionModule: 'writing', isCore: true },
      { description: 'Review Grammar Rule 8: Prepositional phrases of location', actionModule: 'grammar' }
    ],
    tipOfDay: 'Organize by area (e.g. Northern section in Body 1, Southern section in Body 2) rather than jumping haphazardly between dates.',
    examinerInsight: 'Use precise verbs: buildings are "erected", trees are "cleared", facilities are "repurposed".',
    milestoneGoal: 'Flawlessly describe spatial changes across 2 time periods.'
  },
  {
    day: 23,
    phase: 'Phase 4: Exam Sprint & Final Readiness',
    focusSkill: 'Listening',
    title: 'Listening Speed-Drill (1.25x Audio Playback & Spelling Audit)',
    title_bn: 'লিসেনিং স্পিড-ড্রিল ও বানান পরীক্ষা',
    estimatedMinutes: 60,
    morningRoutine: '20m: Section 2 & 3 playback at 1.25x speed to stretch auditory processing',
    eveningDrill: '40m: Rapid 40-word spelling challenge targeting common exam traps',
    tasks: [
      { description: 'Complete a full Listening practice test with 1.2x playback speed', actionModule: 'listening', isCore: true },
      { description: 'Score 100% on the Top 50 IELTS Spelling Traps drill', actionModule: 'spelling', isCore: true },
      { description: 'Review Mistake Vault and purge resolved spelling errors', actionModule: 'vault' }
    ],
    tipOfDay: 'Training at 1.2x speed makes the actual exam audio at 1.0x sound calm, clear, and easy to follow.',
    examinerInsight: 'Every misspelled word is marked completely incorrect, even if only one letter is missing (e.g. "embarassment" vs "embarrassment").',
    milestoneGoal: 'Zero spelling errors across 40 questions.'
  },
  {
    day: 24,
    phase: 'Phase 4: Exam Sprint & Final Readiness',
    focusSkill: 'Writing',
    title: 'Writing Task 2 Problem-Solution & Direct Question Essays',
    title_bn: 'টাস্ক ২ প্রবলেম-সল্যুশন ও ডিরেক্ট কোয়েশ্চেন এসে',
    estimatedMinutes: 75,
    morningRoutine: '25m: Two-part question planning and topic-focus checking',
    eveningDrill: '50m: Write a full 260-word Problem-Solution essay on Urban Congestion',
    tasks: [
      { description: 'Brainstorm causes and viable solutions using the PESTLE Matrix', actionModule: 'arguments', isCore: true },
      { description: 'Write a full Task 2 essay answering both questions equally', actionModule: 'writing', isCore: true },
      { description: 'Study Band 9 Urban Living and Megacities model essay', actionModule: 'modelanswers' }
    ],
    tipOfDay: 'In two-part question essays, give equal weight to both parts: Body 1 answers Question 1, Body 2 answers Question 2.',
    examinerInsight: 'If the prompt asks for "solutions" (plural), you must provide at least two distinct solutions to achieve Band 7+ Task Response.',
    milestoneGoal: 'Answer all prompt prompts with balanced, fully developed paragraphs.'
  },
  {
    day: 25,
    phase: 'Phase 4: Exam Sprint & Final Readiness',
    focusSkill: 'Full Mock',
    title: 'Practice Full Mock Exam 1 (Strict 2h 45m Timed Simulation)',
    title_bn: 'পূর্ণাঙ্গ কেমব্রিজ মক টেস্ট ১ (২ ঘণ্টা ৪৫ মিনিট সিমুলেশন)',
    estimatedMinutes: 165,
    morningRoutine: '10m: Quiet mental centering, hydration, and workspace preparation',
    eveningDrill: '155m: Complete Listening (30m) + Reading (60m) + Writing (60m) uninterrupted',
    tasks: [
      { description: 'Execute full authentic Computer-Delivered IELTS Listening Test (40 items)', actionModule: 'listening', isCore: true },
      { description: 'Execute full 60-minute Academic Reading Test (Passages 1–3, 40 items)', actionModule: 'reading', isCore: true },
      { description: 'Execute full 60-minute Writing Test (Task 1 + Task 2 under strict timing)', actionModule: 'writing', isCore: true }
    ],
    tipOfDay: 'Simulate the exact conditions: no pauses, no phone, no dictionary, and continuous 2 hours 45 minutes of focus.',
    examinerInsight: 'Stamina is a skill. The final 30 minutes of Writing Task 2 is where fatigue causes unforced grammar and spelling errors.',
    milestoneGoal: 'Complete the entire paper under real-time exam stamina.'
  },
  {
    day: 26,
    phase: 'Phase 4: Exam Sprint & Final Readiness',
    focusSkill: 'Vocabulary & Grammar',
    title: 'Post-Mortem Diagnostics & Mistake Vault Zero-Tolerance Clearing',
    title_bn: 'পোস্ট-মর্টেম ডায়াগনস্টিক ও মিস্টেক ভল্ট ক্লিয়ারিং',
    estimatedMinutes: 70,
    morningRoutine: '25m: Systematic review of all incorrect questions from Mock 1',
    eveningDrill: '45m: Targeted grammar and vocabulary drills on identified weak spots',
    tasks: [
      { description: 'Tag and categorize all Mock 1 errors in the Mistake Vault', actionModule: 'vault', isCore: true },
      { description: 'Run targeted exercises for the 2 most frequent error categories', actionModule: 'grammar', isCore: true },
      { description: 'Review high-yield C1 Idioms and Collocations flashcards', actionModule: 'collocations' }
    ],
    tipOfDay: 'Don\'t feel disheartened by mock errors. Every mistake caught today is a point saved on the real exam.',
    examinerInsight: 'Top performers don\'t take more tests; they extract deeper lessons from the tests they\'ve already taken.',
    milestoneGoal: 'Zero unresolved entries in the Mistake Vault.'
  },
  {
    day: 27,
    phase: 'Phase 4: Exam Sprint & Final Readiness',
    focusSkill: 'Full Mock',
    title: 'Practice Full Mock Exam 2 & Score Stabilization',
    title_bn: 'পূর্ণাঙ্গ কেমব্রিজ মক টেস্ট ২ ও স্কোর স্থিতিশীলকরণ',
    estimatedMinutes: 165,
    morningRoutine: '10m: Breathing protocol and quick review of personal error checklists',
    eveningDrill: '155m: Complete Mock 2 uninterrupted with refined pacing strategy',
    tasks: [
      { description: 'Take full authentic Computer-Delivered IELTS Listening Test 2', actionModule: 'listening', isCore: true },
      { description: 'Take full authentic Academic Reading Test 2 with keyword mapping', actionModule: 'reading', isCore: true },
      { description: 'Write Task 1 and Task 2 with strict 5-minute planning time', actionModule: 'writing', isCore: true }
    ],
    tipOfDay: 'Apply the lessons learned from Mock 1: watch spelling in Section 1, keep to 17 mins on Reading Passage 1, and write your Task 2 Overview first.',
    examinerInsight: 'Score consistency across two consecutive full mocks is the most reliable predictor of your test-day band score.',
    milestoneGoal: 'Achieve target band score across all 3 written modules.'
  },
  {
    day: 28,
    phase: 'Phase 4: Exam Sprint & Final Readiness',
    focusSkill: 'Speaking',
    title: 'Speaking Master Interview & Self-Correction Lab',
    title_bn: 'স্পিকিং মাস্টার ইন্টারভিউ ও সেলফ-কারেকশন ল্যাব',
    estimatedMinutes: 60,
    morningRoutine: '20m: Warm up with British Examiner voice shadowing and vowel clarity',
    eveningDrill: '40m: Complete 2 full Speaking Tests (Parts 1, 2, and 3) with voice analysis',
    tasks: [
      { description: 'Complete a full 14-minute speaking test with the AI Examiner', actionModule: 'speaking', isCore: true },
      { description: 'Analyze your recorded WPM, hesitation frequency, and grammar self-corrections', actionModule: 'speakingvault', isCore: true },
      { description: 'Practice 10 high-impact C1 idiomatic expressions', actionModule: 'c1idioms', isCore: true }
    ],
    tipOfDay: 'Natural self-correction is permitted and rewarded: "He went... or rather, he had already gone". It shows grammatical awareness.',
    examinerInsight: 'Maintain steady eye contact and positive conversational posture. Examiner rapport builds mutual communicative ease.',
    milestoneGoal: 'Speak with effortless pacing between 130 and 150 words per minute.'
  },
  {
    day: 29,
    phase: 'Phase 4: Exam Sprint & Final Readiness',
    focusSkill: 'Vocabulary & Grammar',
    title: 'Final Taper: High-Yield Collocations & Mindset Calibration',
    title_bn: 'ফাইনাল টেপার: গুরুত্বপূর্ণ কলোকেশন ও মানসিক প্রস্তুতি',
    estimatedMinutes: 50,
    morningRoutine: '20m: Light flashcard review of 30 favorite C1 collocations and discourse markers',
    eveningDrill: '30m: Review Band Descriptors checklist and pack exam essentials',
    tasks: [
      { description: 'Rapidly review your personalized Mistake Vault for final mental reinforcement', actionModule: 'vault', isCore: true },
      { description: 'Review the 12 Universal Grammar Rules and concession formulas', actionModule: 'grammar', isCore: true },
      { description: 'Confirm test venue location, arrival time, and required ID documents', actionModule: 'banddescriptors' }
    ],
    tipOfDay: 'Do NOT take a full mock today. Taper your brain just like an athlete before a championship marathon.',
    examinerInsight: 'A well-rested, alert candidate consistently scores 0.5 bands higher than an exhausted candidate who crammed until 2 AM.',
    milestoneGoal: 'Mental calm, high confidence, and complete administrative readiness.'
  },
  {
    day: 30,
    phase: 'Phase 4: Exam Sprint & Final Readiness',
    focusSkill: 'Full Mock',
    title: 'Exam Day Protocol: Calm Confidence & Precision Execution',
    title_bn: 'পরীক্ষার দিন: স্থির মানসিকতা ও সফল সম্পাদন',
    estimatedMinutes: 30,
    morningRoutine: '15m: 5-minute English warm-up reading or listening to warm up your brain',
    eveningDrill: '15m: Celebrate completing 30 days of disciplined preparation!',
    tasks: [
      { description: 'Perform 5-minute vocal warm-up to prepare your speaking articulators', actionModule: 'speaking', isCore: true },
      { description: 'Review your 3 golden rules for each test section', actionModule: 'banddescriptors', isCore: true },
      { description: 'Enter the exam hall with quiet confidence — you are fully prepared!', actionModule: 'bandcalculator', isCore: true }
    ],
    tipOfDay: 'Focus on one question at a time. If you miss a listening item, let it go immediately — protect the next 5 points!',
    examinerInsight: 'You have done the work. Trust your training, maintain steady pacing, and execute your strategy with precision.',
    milestoneGoal: 'Achieve your target Band Score and secure your future!'
  }
];
