import { saveExamSetup, loadExamSetup } from './examSetupService';

export type OnboardingPurpose =
  | 'study_abroad'
  | 'immigration_pr'
  | 'work_visa'
  | 'career_academic';

export type OnboardingWeakSkill = 'speaking' | 'writing' | 'reading' | 'listening';

export type CoachingPainPoint =
  | 'high_fees'
  | 'slow_feedback'
  | 'crowded_batch'
  | 'rigid_schedule'
  | 'speaking_fear';

export type ExamTimelineId = '30_days' | '60_days' | '90_days' | '180_days' | 'undecided';

export interface OnboardingSurveyData {
  purpose: OnboardingPurpose;
  examTrack: 'Academic' | 'General Training';
  currentBand: number | 'unsure';
  targetBand: number;
  weakestSkill: OnboardingWeakSkill;
  coachingPainPoint: CoachingPainPoint;
  examTimeline: ExamTimelineId;
  examDate: string | null;
  dailyMinutes: 15 | 30 | 45 | 60;
  miniCheckAnswered?: boolean;
  miniCheckCorrect?: boolean;
  completedAt: number;
}

export const ONBOARDING_SURVEY_STORAGE_KEY = 'bandsprint_onboarding_survey_v1';

export const PURPOSE_LABELS: Record<OnboardingPurpose, { label: string; short: string; countryHint: string }> = {
  study_abroad: {
    label: 'University Admission Abroad',
    short: 'Study Abroad',
    countryHint: 'UK / Canada / Australia / USA / Europe'
  },
  immigration_pr: {
    label: 'Immigration & Permanent Residency',
    short: 'Immigration / PR',
    countryHint: 'Canada Express Entry / Australia PR'
  },
  work_visa: {
    label: 'Healthcare or Skilled Work Visa',
    short: 'Work Visa',
    countryHint: 'UK Skilled Worker / Healthcare / Global'
  },
  career_academic: {
    label: 'Scholarship & Career Advancement',
    short: 'Career & Scholarship',
    countryHint: 'Global Universities & Employers'
  }
};

export const WEAK_SKILL_META: Record<
  OnboardingWeakSkill,
  { label: string; route: string; actionLabel: string; focusSummary: string }
> = {
  speaking: {
    label: 'Speaking',
    route: '/practice/speaking',
    actionLabel: 'Start Speaking Fluency Drill',
    focusSummary: 'Daily Part 1–3 voice simulations, pronunciation shadowing & Band 8+ upgrades'
  },
  writing: {
    label: 'Writing',
    route: '/practice/writing',
    actionLabel: 'Start Writing Rubric Practice',
    focusSummary: 'Timed Task 1 & Task 2 essays with instant 4-criteria feedback & sentence fixes'
  },
  reading: {
    label: 'Reading',
    route: '/practice/reading',
    actionLabel: 'Start Timed Reading Lab',
    focusSummary: 'Split-screen passage evidence highlighting & TFNG distractor drills'
  },
  listening: {
    label: 'Listening',
    route: '/practice/listening',
    actionLabel: 'Start Listening Audio Drill',
    focusSummary: 'Multi-accent Section 1–4 audio with self-correction & spelling trap practice'
  }
};

export const PAIN_POINT_META: Record<
  CoachingPainPoint,
  { label: string; coachingProblem: string; bandSprintFix: string }
> = {
  high_fees: {
    label: 'Expensive coaching fees (৳15,000–৳25,000+)',
    coachingProblem: 'Offline batches charge ৳15,000–৳25,000+ upfront for fixed 2-month lectures.',
    bandSprintFix: 'Start completely free with 5 full mocks + daily AI feedback, and optional plans from ৳150/month.'
  },
  slow_feedback: {
    label: 'Waiting days for essay or speaking feedback',
    coachingProblem: 'Teachers take 3–7 days to return essays with vague comments like "improve grammar".',
    bandSprintFix: 'Get instant 4-criteria Band breakdowns, exact grammar fixes, and Band 8+ rewrites in seconds.'
  },
  crowded_batch: {
    label: 'Crowded batches that ignore my weak skill',
    coachingProblem: '30–50 students sit through the same generic lecture whether they need Band 6.0 or 8.0.',
    bandSprintFix: 'Your study plan adapts directly to your current level, target band, and weakest module.'
  },
  rigid_schedule: {
    label: 'Traffic, commute & fixed class timings',
    coachingProblem: 'Hours wasted commuting in traffic for rigid evening or weekend slots.',
    bandSprintFix: 'Practise in focused 15–60 min mobile or desktop sprints whenever your schedule allows.'
  },
  speaking_fear: {
    label: 'Hesitation speaking in front of other students',
    coachingProblem: 'Limited 5-minute speaking turns in class create anxiety instead of real fluency.',
    bandSprintFix: 'Practise privately 24/7 with an AI British Examiner, live grammar HUD, and shadowing drills.'
  }
};

export function computeExamDateFromTimeline(timeline: ExamTimelineId): string | null {
  if (timeline === 'undecided') return null;
  const daysMap: Record<Exclude<ExamTimelineId, 'undecided'>, number> = {
    '30_days': 30,
    '60_days': 60,
    '90_days': 90,
    '180_days': 180
  };
  const target = new Date(Date.now() + daysMap[timeline] * 24 * 60 * 60 * 1000);
  return target.toISOString().split('T')[0];
}

export function loadOnboardingSurvey(): OnboardingSurveyData | null {
  try {
    const raw = localStorage.getItem(ONBOARDING_SURVEY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OnboardingSurveyData>;
    if (!parsed || typeof parsed.targetBand !== 'number') return null;
    return {
      purpose: parsed.purpose || 'study_abroad',
      examTrack: parsed.examTrack === 'General Training' ? 'General Training' : 'Academic',
      currentBand: typeof parsed.currentBand === 'number' ? parsed.currentBand : 'unsure',
      targetBand: Math.min(9, Math.max(5.5, Math.round(parsed.targetBand * 2) / 2)),
      weakestSkill: parsed.weakestSkill || 'speaking',
      coachingPainPoint: parsed.coachingPainPoint || 'slow_feedback',
      examTimeline: parsed.examTimeline || '60_days',
      examDate: parsed.examDate || computeExamDateFromTimeline(parsed.examTimeline || '60_days'),
      dailyMinutes: ([15, 30, 45, 60].includes(Number(parsed.dailyMinutes))
        ? parsed.dailyMinutes
        : 30) as 15 | 30 | 45 | 60,
      miniCheckAnswered: Boolean(parsed.miniCheckAnswered),
      miniCheckCorrect: Boolean(parsed.miniCheckCorrect),
      completedAt: parsed.completedAt || Date.now()
    };
  } catch {
    return null;
  }
}

export function saveOnboardingSurvey(data: OnboardingSurveyData): void {
  try {
    localStorage.setItem(ONBOARDING_SURVEY_STORAGE_KEY, JSON.stringify(data));
    // Also mirror track, targetBand, and examDate into examSetupService immediately
    const existingSetup = loadExamSetup();
    saveExamSetup({
      ...existingSetup,
      examMode: data.examTrack,
      targetBand: data.targetBand,
      examDate: data.examDate || existingSetup.examDate
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bandsprint_onboarding_survey_saved', { detail: data }));
    }
  } catch {
    // Non-fatal in private browsing
  }
}

export function clearOnboardingSurvey(): void {
  try {
    localStorage.removeItem(ONBOARDING_SURVEY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Computes a personalized weekly focus breakdown (percentages summing to 100)
 * anchored on the candidate's selected weakest skill.
 */
export function buildPersonalizedSkillAllocation(weakest: OnboardingWeakSkill, dailyMinutes: number) {
  const weights: Record<OnboardingWeakSkill, number> = {
    speaking: 20,
    writing: 20,
    reading: 20,
    listening: 20
  };
  weights[weakest] = 40;
  // Rebalance the remaining three to sum to 100
  const others = (Object.keys(weights) as OnboardingWeakSkill[]).filter((k) => k !== weakest);
  weights[others[0]] = 22;
  weights[others[1]] = 20;
  weights[others[2]] = 18;

  const order: OnboardingWeakSkill[] = [weakest, ...others];
  return order.map((skill) => ({
    skill,
    label: WEAK_SKILL_META[skill].label,
    pct: weights[skill],
    minsPerDay: Math.max(5, Math.round((dailyMinutes * weights[skill]) / 100)),
    isPriority: skill === weakest
  }));
}
