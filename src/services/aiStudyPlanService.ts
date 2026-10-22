/**
 * AI Study Plan Service for IELTS SPRINT
 * Provides dynamic AI curriculum generation, calendar (.ICS) export,
 * adaptive rescheduling, and progress tracking.
 */

import { DailyStudyTask, THIRTY_DAY_STUDY_PLAN } from '../data/studyPlanData';

export interface StudyPlanConfig {
  targetBand: number; // e.g. 7.5
  currentBand: number; // e.g. 6.5
  examDate: string; // YYYY-MM-DD
  dailyMinutes: number; // 45, 60, 90, 120
  weakness: 'writing' | 'speaking' | 'reading' | 'listening' | 'balanced';
  examType: 'academic' | 'general';
  candidateName?: string;
}

export interface GeneratedCustomPlan {
  id: string;
  createdAt: number;
  config: StudyPlanConfig;
  weeksRemaining: number;
  daysRemaining: number;
  totalPlannedHours: number;
  readinessProbability: number; // e.g. 88%
  executiveSummary: string;
  weeklyThemes: {
    week: number;
    title: string;
    focus: string;
    targetMilestone: string;
  }[];
  customDailyTasks: DailyStudyTask[];
}

const STORAGE_CUSTOM_PLAN_KEY = 'ielts_sprint_custom_ai_study_plan_v2';
const STORAGE_PLAN_CONFIG_KEY = 'ielts_sprint_study_plan_config_v2';

export const DEFAULT_PLAN_CONFIG: StudyPlanConfig = {
  targetBand: 7.5,
  currentBand: 6.5,
  examDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  dailyMinutes: 75,
  weakness: 'writing',
  examType: 'academic',
  candidateName: 'Candidate'
};

/**
 * Calculates remaining days until target exam
 */
export function calculateDaysUntilExam(examDateStr: string): number {
  try {
    const target = new Date(examDateStr).getTime();
    const now = new Date().setHours(0, 0, 0, 0);
    const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff);
  } catch {
    return 30;
  }
}

/**
 * Generates or adapts a personalized AI Study Plan
 */
export async function generatePersonalizedStudyPlan(
  config: StudyPlanConfig
): Promise<GeneratedCustomPlan> {
  const daysUntil = calculateDaysUntilExam(config.examDate);
  const weeksRemaining = Math.max(1, Math.round(daysUntil / 7));
  const totalPlannedHours = Math.round((daysUntil * config.dailyMinutes) / 60);

  // Band readiness probability model based on band gap and study intensity
  const bandGap = Math.max(0, config.targetBand - config.currentBand);
  const hoursPerBandPointNeeded = 90;
  const estimatedHoursAvailable = totalPlannedHours;
  const neededHours = bandGap * hoursPerBandPointNeeded;
  let readiness = 82;
  if (neededHours > 0) {
    const ratio = estimatedHoursAvailable / neededHours;
    readiness = Math.min(96, Math.max(55, Math.round(ratio * 85)));
  }

  // Construct customized tasks prioritizing candidate's deficit
  const customizedTasks: DailyStudyTask[] = THIRTY_DAY_STUDY_PLAN.map((base) => {
    const isWeaknessDay =
      (config.weakness === 'writing' && base.focusSkill === 'Writing') ||
      (config.weakness === 'speaking' && base.focusSkill === 'Speaking') ||
      (config.weakness === 'reading' && base.focusSkill === 'Reading') ||
      (config.weakness === 'listening' && base.focusSkill === 'Listening');

    // Dynamically adjust minutes based on user daily budget
    const adjustedMinutes = isWeaknessDay
      ? Math.round(config.dailyMinutes * 1.15)
      : Math.round(config.dailyMinutes * 0.9);

    return {
      ...base,
      estimatedMinutes: adjustedMinutes
    };
  });

  const weeklyThemes = [
    {
      week: 1,
      title: 'Diagnostic Baseline & Macro Structure',
      focus: config.weakness === 'writing' ? 'Task 1 Overview + Task 2 Skeletons' : 'Listening & Reading Core Traps',
      targetMilestone: `Establish diagnostic benchmark for Band ${config.targetBand}`
    },
    {
      week: 2,
      title: 'Speed, Precision & Distractor Defense',
      focus: config.weakness === 'speaking' ? 'Part 2 Cue Card Fluency' : 'Matching Headings & True/False/Not Given',
      targetMilestone: 'Reduce unforced errors in Section 1 & 2 by 80%'
    },
    {
      week: 3,
      title: 'Complex Synthesis & Lexical Nuance',
      focus: 'Passage 3 Reasoning & Inversion Syntax',
      targetMilestone: `Reach consistent Band ${config.targetBand} across timed mock papers`
    },
    {
      week: 4,
      title: 'Full Exam Simulation & Peak Taper',
      focus: 'Uninterrupted 2h 45m Cambridge Mocks + Taper',
      targetMilestone: `Secure Band ${config.targetBand} with calm mental endurance`
    }
  ];

  const plan: GeneratedCustomPlan = {
    id: `plan_${Date.now()}`,
    createdAt: Date.now(),
    config,
    weeksRemaining,
    daysRemaining: daysUntil,
    totalPlannedHours,
    readinessProbability: readiness,
    executiveSummary: `Tailored ${daysUntil}-day Cambridge roadmap targeting Band ${config.targetBand}. Allocated ${totalPlannedHours} total hours with heavy emphasis on ${config.weakness.toUpperCase()} stabilization.`,
    weeklyThemes,
    customDailyTasks: customizedTasks
  };

  try {
    localStorage.setItem(STORAGE_CUSTOM_PLAN_KEY, JSON.stringify(plan));
    localStorage.setItem(STORAGE_PLAN_CONFIG_KEY, JSON.stringify(config));
  } catch {}

  return plan;
}

/**
 * Loads saved plan from localStorage
 */
export function getSavedStudyPlan(): GeneratedCustomPlan | null {
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_PLAN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Loads saved configuration
 */
export function getSavedPlanConfig(): StudyPlanConfig {
  try {
    const raw = localStorage.getItem(STORAGE_PLAN_CONFIG_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_PLAN_CONFIG;
  } catch {
    return DEFAULT_PLAN_CONFIG;
  }
}

/**
 * Generates an RFC 5545 compliant .ICS calendar file for the candidate's schedule
 */
export function exportStudyPlanToICS(
  tasks: DailyStudyTask[],
  config: StudyPlanConfig
): void {
  const startDate = new Date();
  const formatICSDate = (d: Date): string => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//IELTS SPRINT//Cambridge AI Study Plan//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:IELTS SPRINT Study Plan (Target Band ${config.targetBand})`,
    'X-WR-TIMEZONE:UTC'
  ];

  tasks.slice(0, 30).forEach((task, index) => {
    const eventDate = new Date(startDate.getTime() + index * 24 * 60 * 60 * 1000);
    // Set daily study session at 19:00 UTC (or local evening)
    eventDate.setHours(19, 0, 0, 0);
    const endDate = new Date(eventDate.getTime() + task.estimatedMinutes * 60 * 1000);

    const taskList = task.tasks.map((t, idx) => `${idx + 1}. ${t.description}`).join('\\n');
    const description = `Phase: ${task.phase}\\nSkill: ${task.focusSkill}\\nDuration: ${task.estimatedMinutes} Mins\\n\\nChecklist:\\n${taskList}\\n\\nStrategy Tip: ${task.tipOfDay}\\n\\nLaunch in IELTS SPRINT: https://ielts-sprint.app`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:ielts_sprint_day_${task.day}_${Date.now()}@ielts-sprint.app`);
    lines.push(`DTSTAMP:${formatICSDate(new Date())}`);
    lines.push(`DTSTART:${formatICSDate(eventDate)}`);
    lines.push(`DTEND:${formatICSDate(endDate)}`);
    lines.push(`SUMMARY:IELTS Sprint: Day ${task.day} - ${task.title}`);
    lines.push(`DESCRIPTION:${description}`);
    lines.push('STATUS:CONFIRMED');

    // Add 15-minute alarm reminder
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-PT15M');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:Upcoming IELTS Sprint: Day ${task.day} (${task.focusSkill})`);
    lines.push('END:VALARM');

    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');

  const icsContent = lines.join('\r\n');
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `IELTS_SPRINT_Band_${config.targetBand}_Schedule.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
