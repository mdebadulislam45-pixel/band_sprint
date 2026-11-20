// Realistic IELTS-style Live Mock Exam Database & Question Bank
// Features realistic exam sets, full 4-section listening simulations,
// academic reading passages, writing prompts, and speaking topic banks
// with dynamic anti-repetition selection.

import { selectFreshQuestions, recordSeenQuestion } from '../utils/antiRepetition';
import { canShowThirdPartyContent } from '../utils/thirdPartyAuth';
import { GT_TEST_1_SET } from './mockData/gtTest1';
import { SPRINT_16_SET } from './mockData/sprintMock16';
import { SPRINT_17_SET } from './mockData/sprintMock17';
import { SPRINT_18_SET } from './mockData/sprintMock18';
import { BC_PRACTICE_3_SET } from './mockData/bcPractice3';

export interface QuestionItem {
  id: number;
  section: 'listening' | 'reading';
  type: string;
  prompt: string;
  options?: string[];
  correctAnswer: string;
  acceptableAnswers?: string[];
  explanation: string;
  passage?: 1 | 2 | 3;
}

export interface ListeningSectionDetail {
  sectionNumber: 1 | 2 | 3 | 4;
  title: string;
  isAvailable: boolean;
  script?: string;
  missingReason?: string;
}

export interface MockExamSet {
  id: string;
  title: string;
  source: string;
  badge: string;
  level: string; // e.g. 'B1-B2', 'B2', 'B2-C1', 'C1'
  format: 'Academic' | 'General Training';
  listeningTitle: string;
  listeningScript: string;
  listeningSections?: Record<1 | 2 | 3 | 4, ListeningSectionDetail>;
  audioSrc?: string;
  readingTitle: string;
  readingPassage: string;
  writingPrompt: string;
  task1Type?: 'chart' | 'table' | 'process' | 'letter' | 'map';
  task1Prompt?: string;
  task1Model?: string;
  modelEssay: string;
  questions: QuestionItem[];
}

/**
 * Fallback helper to construct Listening Sections 1-4 for a set that ships
 * with only a Section 1 script. Sections 2-4 are honestly marked unavailable
 * here because no script exists for them. Do NOT use this for complete sets:
 * complete sets must define their own listeningSections with all 4 scripts,
 * as GT Test 1, Sprint 16/17/18 and BC Practice 3 do.
 */
export function buildMockListeningSections(
  section1Title: string,
  section1Script: string
): Record<1 | 2 | 3 | 4, ListeningSectionDetail> {
  return {
    1: {
      sectionNumber: 1,
      title: `Section 1: ${section1Title}`,
      isAvailable: true,
      script: section1Script,
    },
    2: {
      sectionNumber: 2,
      title: 'Section 2 (Monologue / Social Context)',
      isAvailable: false,
      missingReason: 'Realistic listening recording and dialogue for Section 2 are not available in this practice set.',
    },
    3: {
      sectionNumber: 3,
      title: 'Section 3 (Academic Discussion / Study Group)',
      isAvailable: false,
      missingReason: 'Realistic listening recording and dialogue for Section 3 are not available in this practice set.',
    },
    4: {
      sectionNumber: 4,
      title: 'Section 4 (Academic Lecture / Presentation)',
      isAvailable: false,
      missingReason: 'Realistic listening recording and dialogue for Section 4 are not available in this practice set.',
    },
  };
}

/**
 * Safely retrieves an independently mapped Listening Section.
 */
export function getExamListeningSection(
  examSet: MockExamSet,
  sectionNum: 1 | 2 | 3 | 4
): ListeningSectionDetail {
  if (examSet.listeningSections && examSet.listeningSections[sectionNum]) {
    return examSet.listeningSections[sectionNum];
  }
  if (sectionNum === 1 && examSet.listeningScript) {
    return {
      sectionNumber: 1,
      title: examSet.listeningTitle ? `Section 1: ${examSet.listeningTitle}` : 'Section 1 Dialogue',
      isAvailable: true,
      script: examSet.listeningScript,
    };
  }
  return {
    sectionNumber: sectionNum,
    title: `Section ${sectionNum}`,
    isAvailable: false,
    missingReason: `Realistic listening recording and dialogue for Section ${sectionNum} are not included in this practice set.`,
  };
}

export interface SpeakingTopicSet {
  id: string;
  topicName: string;
  part1Questions: {
    question: string;
    examinerTip: string;
  }[];
  part2CueCard: {
    prompt: string;
    bulletPoints: string[];
    followUp: string;
    examinerTip: string;
  };
  part3Questions: {
    question: string;
    examinerTip: string;
  }[];
}

// Complete Live Mock Examinations Registry (Original practice sets only for client build)
// All 5 sets ship with full Listening Sections 1-4 scripts and 40 listening questions each.
export const MOCK_EXAM_SETS: MockExamSet[] = [
  GT_TEST_1_SET,
  SPRINT_16_SET,
  SPRINT_17_SET,
  SPRINT_18_SET,
  BC_PRACTICE_3_SET,
];

/**
 * Returns mock exam sets available to the given user.
 */
export function getAvailableMockExamSets(user?: any): MockExamSet[] {
  const allowed = canShowThirdPartyContent(user);
  if (allowed) {
    // If admin requested via SHOW_THIRD_PARTY_CONTENT, fetch or include server sets if available
    return MOCK_EXAM_SETS;
  }
  return MOCK_EXAM_SETS;
}

// Ensure listeningSections 1-4 and reading passage associations are populated for every mock exam set
MOCK_EXAM_SETS.forEach((set) => {
  if (!set.listeningSections) {
    set.listeningSections = buildMockListeningSections(set.listeningTitle, set.listeningScript);
  }
  const readingQuestions = set.questions.filter((q) => q.section === 'reading');
  readingQuestions.forEach((q, rIdx) => {
    if (!q.passage) {
      q.passage = rIdx < 13 ? 1 : rIdx < 26 ? 2 : 3;
    }
  });
});

/**
 * Large Categorized IELTS Speaking Topic Bank
 * Includes Part 1, Part 2 Cue Cards, and Part 3 Abstract Discussion Questions
 * Supporting dynamic non-repeating topic selection across 12+ real IELTS domains
 */
export const SPEAKING_TOPIC_BANK: SpeakingTopicSet[] = [
  {
    id: 'spk_tech',
    topicName: 'Technology & Artificial Intelligence',
    part1Questions: [
      {
        question: 'Do you use any smart devices or applications to organise your daily schedule?',
        examinerTip: 'Answer in 2-3 sentences with natural British fillers: "To be perfectly frank, I rely quite heavily on..."'
      },
      {
        question: 'What kind of technological changes have taken place in your home over the last five years?',
        examinerTip: 'Contrast past with present using present perfect: "We used to have... whereas recently we have upgraded to..."'
      }
    ],
    part2CueCard: {
      prompt: 'Describe a useful electronic device or application you could not live without.',
      bulletPoints: [
        'What the device or app is',
        'How often you use it',
        'What specific tasks it helps you accomplish',
        'And explain why it is so indispensable to your daily life.'
      ],
      followUp: 'Do your friends also use this application as frequently as you do?',
      examinerTip: 'Speak for 90 to 120 seconds. Use temporal markers: "Initially when I downloaded it...", "Over time it became second nature..."'
    },
    part3Questions: [
      {
        question: 'To what extent do you believe autonomous artificial intelligence might displace white-collar professionals in the coming decade?',
        examinerTip: 'Adopt a balanced stance: "While there is no denying automation will streamline repetitive tasks, human creative intuition remains irreplaceable."'
      },
      {
        question: 'Do older generations face unfair digital exclusion in contemporary cashless societies?',
        examinerTip: 'Address societal equity: "That is a poignant issue because without intuitive public training, senior citizens risk losing autonomous access to banking."'
      }
    ]
  },
  {
    id: 'spk_env',
    topicName: 'Environment & Climate Responsibility',
    part1Questions: [
      {
        question: 'Are there many parks or public gardens near where you live?',
        examinerTip: 'Describe greenery vividly: "Fortunately, within walking distance there is a tranquil Victorian park with mature oak trees."'
      },
      {
        question: 'Do you make a conscious effort to recycle household waste?',
        examinerTip: 'Demonstrate routine collocations: "We consistently segregate paper and plastics into municipal curbside recycling bins."'
      }
    ],
    part2CueCard: {
      prompt: 'Describe an environmental law or initiative you think governments should introduce.',
      bulletPoints: [
        'What the law or initiative would be',
        'Which environmental issue it aims to solve',
        'How it would be enforced or funded',
        'And explain what positive difference it would make to society.'
      ],
      followUp: 'Do you think the public would willingly comply with such a regulation?',
      examinerTip: 'Structure your two minutes: identify the problem, propose the policy mechanism, evaluate public benefits.'
    },
    part3Questions: [
      {
        question: 'Should individual citizens or multinational corporations bear the primary financial burden of carbon emission reduction?',
        examinerTip: 'Use comparative weighting: "While individual lifestyle thrift matters, the sheer scale of industrial emissions means corporate accountability is paramount."'
      },
      {
        question: 'Why do you think some people remain indifferent to international climate summits?',
        examinerTip: 'Analyze psychological barriers: "A classic case in point is environmental fatigue, where non-binding declarations create public cynicism."'
      }
    ]
  },
  {
    id: 'spk_edu',
    topicName: 'Education, University & Career Aspirations',
    part1Questions: [
      {
        question: 'What subjects did you find most engaging when you were in secondary school?',
        examinerTip: 'Speak naturally: "Looking back, I had a particular affinity for world history because our tutor brought narratives to life."'
      },
      {
        question: 'Do you prefer studying alone in quiet environments or collaborating with peers?',
        examinerTip: 'Provide justification: "I am definitely inclined toward solitary study in libraries, as background chatter disrupts my analytical flow."'
      }
    ],
    part2CueCard: {
      prompt: 'Describe a teacher or mentor who had a profound influence on your life.',
      bulletPoints: [
        'Who this person was',
        'What subject or skill they taught you',
        'How their teaching method differed from other instructors',
        'And explain what enduring lessons you learned from them.'
      ],
      followUp: 'Have you stayed in touch with this mentor recently?',
      examinerTip: 'Use rich character adjectives: "meticulous", "inspirational", "patient", "demanding yet compassionate".'
    },
    part3Questions: [
      {
        question: 'Do you believe university education should focus strictly on vocational job training rather than abstract theoretical philosophy?',
        examinerTip: 'Synthesize both priorities: "While pragmatic employability is crucial, theoretical disciplines cultivate critical lateral thinking."'
      },
      {
        question: 'How has the emergence of open-source online degrees challenged traditional brick-and-mortar universities?',
        examinerTip: 'Evaluate democratization: "Online credentials democratize access for remote learners, yet campus immersion provides invaluable social soft skills."'
      }
    ]
  },
  {
    id: 'spk_trav',
    topicName: 'Travel, Culture & Tourism',
    part1Questions: [
      {
        question: 'Do you enjoy visiting historical landmarks or do you prefer natural landscapes?',
        examinerTip: 'Avoid one-word answers: "I have a distinct preference for dramatic natural coastlines rather than crowded historical monuments."'
      },
      {
        question: 'What is the most memorable mode of transport you have experienced while traveling?',
        examinerTip: 'Tell a micro-story: "I once took an overnight sleeper train across the Highlands, watching mist rise over lochs at dawn."'
      }
    ],
    part2CueCard: {
      prompt: 'Describe a trip or journey that did not go according to plan.',
      bulletPoints: [
        'Where you were traveling to',
        'What unexpected obstacle or delay occurred',
        'How you and your companions managed the situation',
        'And explain what you learned from this unexpected experience.'
      ],
      followUp: 'Would you ever revisit that same destination?',
      examinerTip: 'Use narrative past tenses: "We had barely departed when our ferry was cancelled due to gale-force winds..."'
    },
    part3Questions: [
      {
        question: 'Does mass international tourism ultimately erode or preserve authentic local traditions?',
        examinerTip: 'Weigh both edges: "It represents a double-edged sword: tourism injects heritage preservation capital, yet risks commercializing sacred rituals."'
      },
      {
        question: 'Do you agree that traveling abroad makes people more open-minded and tolerant?',
        examinerTip: 'Deepen the argument: "Immersing oneself in alien customs dismantles ethnocentric prejudices far more effectively than reading textbooks."'
      }
    ]
  },
  {
    id: 'spk_work',
    topicName: 'Workplace Dynamics, Career Mobility & Remote Employment',
    part1Questions: [
      {
        question: 'Do you currently work in a traditional office environment or remotely from home?',
        examinerTip: 'Answer using practical contrast: "I operate under a hybrid arrangement, spending two days on-site and the remainder in my home study."'
      },
      {
        question: 'What kinds of professions do you anticipate will become increasingly sought after in your country?',
        examinerTip: 'Speculate using modal verbs: "Given the acceleration of green energy transitions, renewable systems engineers will inevitably see surging demand."'
      }
    ],
    part2CueCard: {
      prompt: 'Describe an ambitious professional project or career milestone you hope to achieve in the future.',
      bulletPoints: [
        'What the professional project or milestone is',
        'What specific technical qualifications or interpersonal skills you will need',
        'What practical hurdles or obstacles you might encounter',
        'And explain why achieving this milestone is personally significant to you.'
      ],
      followUp: 'Have you discussed this career aspiration with any senior mentors or peers?',
      examinerTip: 'Structure your response chronologically: outline the objective, articulate the preparatory pathway, and reflect on the intrinsic fulfillment.'
    },
    part3Questions: [
      {
        question: 'To what extent has the widespread adoption of telecommuting altered corporate culture and team cohesion?',
        examinerTip: 'Evaluate both dimensions: "While remote arrangements afford unprecedented autonomy, they can inadvertently erode organic watercooler camaraderie."'
      },
      {
        question: 'Should national governments mandate a four-day working week to counter occupational burnout?',
        examinerTip: 'Address economic and societal feasibility: "Pilot trials indicate productivity gains, yet implementation across continuous manufacturing remains complex."'
      }
    ]
  }
];

/**
 * Intelligent Test Selector with Anti-Repetition
 * Chooses an unseen test set if available, otherwise cycles least-recently-seen
 */
export function getFreshMockExam(user?: any): MockExamSet {
  const available = getAvailableMockExamSets(user);
  const selected = selectFreshQuestions(available.length > 0 ? available : MOCK_EXAM_SETS, 1, { shuffle: true });
  const chosen = selected[0] || available[0] || MOCK_EXAM_SETS[0];
  recordSeenQuestion(chosen.id);
  return chosen;
}

/**
 * Intelligent Speaking Test Selector with Anti-Repetition
 * Selects an unseen speaking topic set
 */
export function getFreshSpeakingTopic(): SpeakingTopicSet {
  const selected = selectFreshQuestions(SPEAKING_TOPIC_BANK, 1, { shuffle: true });
  const chosen = selected[0] || SPEAKING_TOPIC_BANK[0];
  recordSeenQuestion(chosen.id);
  return chosen;
}
