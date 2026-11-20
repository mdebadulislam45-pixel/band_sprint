import fs from 'fs';
import path from 'path';

function buildValidReadingContent() {
  const counts = [13, 13, 14];
  let qCounter = 1;
  const passages = counts.map((count, pIdx) => {
    const pNum = pIdx + 1;
    const questions = Array.from({ length: count }, () => {
      const qId = qCounter++;
      return {
        id: qId,
        type: 'true_false_not_given',
        prompt: `Academic Reading statement ${qId} in passage ${pNum}.`,
        correctAnswer: 'TRUE',
        passageEvidence: `empirical climate data in passage ${pNum}`,
        explanation: `Confirmed by passage ${pNum} empirical findings.`
      };
    });
    return {
      id: `passage_qa_staging_${pNum}`,
      passageNumber: pNum,
      title: `Academic Reading Passage ${pNum} — Staging QA`,
      text: Array.from(
        { length: 70 },
        (_, i) =>
          `Paragraph ${(i % 5) + 1} sentence ${i + 1} presents empirical climate data in passage ${pNum} exploring urban hydrology and sustainable infrastructure.`
      ).join(' '),
      wordCount: 770,
      questions
    };
  });

  return {
    examId: 'rd_qa_staging_valid_12f12',
    title: 'Academic Reading Staging QA Practice Exam',
    format: 'Academic',
    difficulty: 'Band 6.5–7.5',
    targetBand: 7.5,
    passages
  };
}

function buildValidListeningContent() {
  let qCounter = 1;
  const sections = [1, 2, 3, 4].map((secNum) => {
    const questions = Array.from({ length: 10 }, () => {
      const qId = qCounter++;
      return {
        id: qId,
        type: 'form_completion',
        prompt: `Listening section ${secNum} item ${qId} form completion.`,
        correctAnswer: 'campus',
        scriptEvidence: `verified audio transcript evidence in section ${secNum}`,
        explanation: `Stated directly in section ${secNum} audio script.`
      };
    });
    return {
      id: `sec_qa_staging_${secNum}`,
      sectionNumber: secNum,
      title: `Listening Section ${secNum} — Student Housing`,
      speakers: ['Officer', 'Applicant'],
      script: Array.from(
        { length: 25 },
        (_, i) =>
          `Turn ${i + 1}: This dialogue provides verified audio transcript evidence in section ${secNum} regarding student accommodation and library facilities.`
      ).join(' '),
      wordCount: 260,
      questions
    };
  });

  return {
    examId: 'ls_qa_staging_valid_12f12',
    title: 'Listening Staging QA Practice Exam',
    format: 'Academic',
    difficulty: 'Band 6.5–7.5',
    targetBand: 7.5,
    sections
  };
}

function buildValidWritingContent() {
  return {
    examId: 'wrt_qa_staging_valid_12f12',
    schemaVersion: '1.0',
    title: 'Writing Staging QA Practice Exam — Academic',
    format: 'Academic',
    difficulty: 'Band 6.5–7.5',
    targetBand: 7.5,
    task1: {
      id: 'wrt_qa_staging_t1_12f12',
      schemaVersion: '1.0',
      format: 'Academic',
      taskCategory: 'task1',
      questionType: 'bar',
      prompt: 'The bar chart below shows solar power generation in three countries between 2015 and 2025. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
      instructions: 'Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
      suggestedTimeMinutes: 20,
      minWordLimit: 150,
      visualData: {
        chartType: 'bar',
        chartTitle: 'Solar Power Generation 2015-2025',
        units: 'GWh',
        xAxisLabel: 'Country',
        yAxisLabel: 'Generation (GWh)',
        categories: ['Country A', 'Country B', 'Country C'],
        series: [
          { name: '2015', data: [10, 15, 20] },
          { name: '2025', data: [80, 95, 110] }
        ]
      },
      keyFeaturesToReport: [
        'Generation increased across all three countries between 2015 and 2025',
        'Country C demonstrated the highest total production in both measured years'
      ]
    },
    task2: {
      id: 'wrt_qa_staging_t2_12f12',
      schemaVersion: '1.0',
      format: 'Academic',
      taskCategory: 'task2',
      questionType: 'discuss_both_views',
      topicCategory: 'environment',
      prompt: 'Some people argue that public transportation should be completely free, funded by general taxation. Others believe users should pay for the service they use. Discuss both views and give your own opinion.',
      questionText: 'Discuss both views and give your own opinion.',
      instructions: 'Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.',
      suggestedTimeMinutes: 40,
      minWordLimit: 250,
      keyArgumentsToConsider: {
        sideA: ['Reduced traffic congestion and accelerated emissions cuts through free transit'],
        sideB: ['Fiscal sustainability and quality of service maintenance via user fare recovery']
      }
    }
  };
}

function buildValidSpeakingContent() {
  return {
    examId: 'spk_qa_staging_valid_12f12',
    title: 'Speaking Staging QA Practice Exam — Civic Architecture',
    format: 'Academic',
    difficulty: 'Band 6.5–7.5',
    targetBand: 7.5,
    part1: {
      introFrame: 'Good afternoon. Can you tell me your full name, please?',
      durationMinutes: '4-5 minutes',
      topicGroups: [
        {
          topicId: 'tg_studies',
          title: 'Studies & Daily Routine',
          topic: 'Studies & Daily Routine',
          isCoreOpeningTopic: true,
          questions: [
            { id: 'sp1_1', prompt: 'Do you work or are you currently a student?' },
            { id: 'sp1_2', prompt: 'What part of your daily study or work schedule do you enjoy most?' },
            { id: 'sp1_3', prompt: 'How do you usually organise your tasks at the start of the week?' },
            { id: 'sp1_4', prompt: 'Would you prefer to study or work in the morning or in the evening?' }
          ]
        },
        {
          topicId: 'tg_architecture',
          title: 'Neighbourhood Architecture',
          topic: 'Neighbourhood Architecture',
          isCoreOpeningTopic: false,
          questions: [
            { id: 'sp1_5', prompt: 'What kind of public buildings are common in your neighbourhood?' },
            { id: 'sp1_6', prompt: 'Has the architecture in your town changed much in recent years?' },
            { id: 'sp1_7', prompt: 'Do you prefer spending time in modern or historic buildings?' },
            { id: 'sp1_8', prompt: 'How important are public parks in urban areas?' }
          ]
        }
      ]
    },
    part2: {
      id: 'sp2_cue_qa_staging_12f12',
      topic: 'Describe a well-designed public building or library you have visited.',
      instructions: 'You should say:',
      bulletPrompts: [
        'where the building is located',
        'what it looks like on the outside and inside',
        'what people use this building for',
        'and explain why you think its design is successful.'
      ],
      prepTimeSeconds: 60,
      talkTimeSeconds: 120,
      preparationTimeSeconds: 60,
      speakingTimeSeconds: 120,
      roundingOffQuestion: 'Would you recommend visiting this building to architecture students?',
      examinerIntro: 'Now I am going to give you a topic and I would like you to talk about it for one to two minutes.'
    },
    part3: {
      durationMinutes: '4-5 minutes',
      themes: [
        {
          themeId: 'th_civic',
          title: 'Civic Architecture & Community Identity',
          connectedPart2Theme: 'Public Buildings',
          questions: [
            {
              id: 'sp3_1',
              prompt: 'How does the design of public buildings influence civic pride in a city?',
              targetFunction: 'Analyze',
              examinerProbeNotes: 'Ask candidate to compare functional utility versus symbolic aesthetics.'
            },
            {
              id: 'sp3_2',
              prompt: 'Should municipal governments preserve historic structures even when maintenance is costly?',
              targetFunction: 'Evaluate',
              examinerProbeNotes: 'Probe economic trade-offs in rapidly growing cities.'
            }
          ]
        },
        {
          themeId: 'th_sustainable',
          title: 'Sustainable Urban Planning',
          connectedPart2Theme: 'Public Buildings',
          questions: [
            {
              id: 'sp3_3',
              prompt: 'Why do some high-density cities struggle to provide adequate green space?',
              targetFunction: 'Compare',
              examinerProbeNotes: 'Challenge candidate on land-value pressures.'
            },
            {
              id: 'sp3_4',
              prompt: 'Who should bear the cost of retrofitting older buildings for energy efficiency?',
              targetFunction: 'Speculate',
              examinerProbeNotes: 'Compare state subsidies versus developer mandates.'
            }
          ]
        }
      ]
    }
  };
}

export function generateCleanStagingStoreData() {
  const now = Date.now();
  const ADMIN_ID = 'usr_qa_admin_12f12';
  const CANDIDATE_A_ID = 'usr_qa_cand_a_12f12';
  const CANDIDATE_B_ID = 'usr_qa_cand_b_12f12';

  const ADMIN_TOKEN = 'token_qa_admin_session_12f12';
  const CAND_A_TOKEN = 'token_qa_cand_a_session_12f12';
  const CAND_B_TOKEN = 'token_qa_cand_b_session_12f12';

  const cleanStore = {
    users: {
      [ADMIN_ID]: {
        id: ADMIN_ID,
        email: 'qa.admin@bandsprint.test',
        name: 'QA Staging Administrator',
        createdAt: now,
        updatedAt: now
      },
      [CANDIDATE_A_ID]: {
        id: CANDIDATE_A_ID,
        email: 'qa.candidate.a@bandsprint.test',
        name: 'QA Candidate Alpha',
        createdAt: now,
        updatedAt: now
      },
      [CANDIDATE_B_ID]: {
        id: CANDIDATE_B_ID,
        email: 'qa.candidate.b@bandsprint.test',
        name: 'QA Candidate Beta',
        createdAt: now,
        updatedAt: now
      }
    },
    sessions: {
      [ADMIN_TOKEN]: {
        token: ADMIN_TOKEN,
        userId: ADMIN_ID,
        createdAt: now,
        expiresAt: now + 30 * 86400_000,
        userAgent: 'QA-Staging-Agent',
        ip: '127.0.0.1'
      },
      [CAND_A_TOKEN]: {
        token: CAND_A_TOKEN,
        userId: CANDIDATE_A_ID,
        createdAt: now,
        expiresAt: now + 30 * 86400_000,
        userAgent: 'QA-Staging-Agent',
        ip: '127.0.0.1'
      },
      [CAND_B_TOKEN]: {
        token: CAND_B_TOKEN,
        userId: CANDIDATE_B_ID,
        createdAt: now,
        expiresAt: now + 30 * 86400_000,
        userAgent: 'QA-Staging-Agent',
        ip: '127.0.0.1'
      }
    },
    subscriptions: {
      [CANDIDATE_A_ID]: {
        userId: CANDIDATE_A_ID,
        planId: 'pro',
        status: 'active',
        paymentMethod: 'stripe',
        currentPeriodStart: now,
        currentPeriodEnd: now + 30 * 86400_000,
        cancelAtPeriodEnd: false,
        updatedAt: now
      },
      [CANDIDATE_B_ID]: {
        userId: CANDIDATE_B_ID,
        planId: 'pro',
        status: 'active',
        paymentMethod: 'stripe',
        currentPeriodStart: now,
        currentPeriodEnd: now + 30 * 86400_000,
        cancelAtPeriodEnd: false,
        updatedAt: now
      }
    },
    processedWebhookEvents: {},
    dailyUsage: {},
    promoCodes: {},
    promoRedemptions: {},
    paymentOrders: {},
    otpChallenges: {},
    aiDraftExams: {
      syn_approved_reading_12f12: {
        id: 'syn_approved_reading_12f12',
        createdAt: now,
        updatedAt: now,
        userId: CANDIDATE_A_ID,
        model: 'gemini-3.8-flash',
        examType: 'academic_reading',
        status: 'APPROVED',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        validationFindings: {
          passed: true,
          structuralOk: true,
          answersOk: true,
          evidenceOk: true,
          qualityOk: true,
          errors: [],
          warnings: []
        },
        reviewedBy: ADMIN_ID,
        reviewedAt: now,
        content: buildValidReadingContent()
      },
      syn_approved_listening_12f12: {
        id: 'syn_approved_listening_12f12',
        createdAt: now,
        updatedAt: now,
        userId: CANDIDATE_A_ID,
        model: 'gemini-3.8-flash',
        examType: 'listening',
        status: 'APPROVED',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        validationFindings: {
          passed: true,
          structuralOk: true,
          answersOk: true,
          evidenceOk: true,
          qualityOk: true,
          errors: [],
          warnings: []
        },
        reviewedBy: ADMIN_ID,
        reviewedAt: now,
        content: buildValidListeningContent()
      },
      syn_approved_writing_12f12: {
        id: 'syn_approved_writing_12f12',
        createdAt: now,
        updatedAt: now,
        userId: CANDIDATE_A_ID,
        model: 'gemini-3.8-flash',
        examType: 'writing',
        status: 'APPROVED',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        validationFindings: {
          passed: true,
          structuralOk: true,
          answersOk: true,
          evidenceOk: true,
          qualityOk: true,
          errors: [],
          warnings: []
        },
        reviewedBy: ADMIN_ID,
        reviewedAt: now,
        content: buildValidWritingContent()
      },
      syn_approved_speaking_12f12: {
        id: 'syn_approved_speaking_12f12',
        createdAt: now,
        updatedAt: now,
        userId: CANDIDATE_A_ID,
        model: 'gemini-3.8-flash',
        examType: 'speaking',
        status: 'APPROVED',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        validationFindings: {
          passed: true,
          structuralOk: true,
          answersOk: true,
          evidenceOk: true,
          qualityOk: true,
          errors: [],
          warnings: []
        },
        reviewedBy: ADMIN_ID,
        reviewedAt: now,
        content: buildValidSpeakingContent()
      },
      syn_pending_reading_12f14: {
        id: 'syn_pending_reading_12f14',
        createdAt: now,
        updatedAt: now,
        userId: CANDIDATE_A_ID,
        model: 'gemini-3.8-flash',
        examType: 'academic_reading',
        status: 'PENDING_REVIEW',
        validationStatus: 'PASSED',
        repairAttempts: 0,
        validationFindings: {
          passed: true,
          structuralOk: true,
          answersOk: true,
          evidenceOk: true,
          qualityOk: true,
          errors: [],
          warnings: []
        },
        content: buildValidReadingContent()
      }
    },
    analyticsEvents: {},
    analyticsIdempotencyIndex: {}
  };

  return cleanStore;
}

if (process.argv[1] && process.argv[1].includes('generate-clean-qa-staging-store')) {
  const dataDir = path.join(process.cwd(), '.data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const stagingPath = path.join(dataDir, 'sprint_store_qa_staging.json');
  const storeData = generateCleanStagingStoreData();
  fs.writeFileSync(stagingPath, JSON.stringify(storeData, null, 2), 'utf-8');
  console.log(`[QA Staging] Clean synthetic store generated at ${stagingPath}`);
}
