import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import type { ExamHistoryRecord, UserProfile } from '../../types.ts';
import {
  isValidHalfBand,
  validateOptionalHalfBand,
  extractValidSkillBand,
  extractValidFullMockOverallBand,
  evaluateExamHistoryRecord,
  filterRecordsByDateRange,
  paginateRecords,
  computeBandTrend,
  aggregateExamHistory,
  extractValidAnalyticsEventBand,
  buildSafeHistoryFallbackEvents,
  aggregateCandidateAnalyticsEvents,
  type CandidateAnalyticsEventLike
} from '../../utils/historyAggregation.ts';
import {
  isFullMockExamRecord,
  summarizeExamHistoryCounts,
  describeExamHistoryDisplay
} from '../../utils/userStorage.ts';
import { calculateFourSkillOverallBand } from '../../utils/ieltsBandConversion.ts';
import { HomeDashboard } from '../../components/HomeDashboard.tsx';
import { ProgressPage } from '../../components/pages/ProgressPage.tsx';
import { ProgressDonutCard } from '../../components/home/ProgressDonutCard.tsx';
import { AIBandScorecard } from '../../components/home/AIBandScorecard.tsx';
import { QuestionHistoryPage } from '../../components/pages/QuestionHistoryPage.tsx';
import { MockTestPage } from '../../components/pages/MockTestPage.tsx';
import { OfficialDiagnosticReportModal } from '../../components/analytics/OfficialDiagnosticReportModal.tsx';
import { DiagnosticScorecardModal } from '../../components/modals/DiagnosticScorecardModal.tsx';
import { PrintablePracticeReportModal } from '../../components/reports/PrintablePracticeReportModal.tsx';
import { CandidateAnalyticsPage } from '../../components/pages/CandidateAnalyticsPage.tsx';

function makeUser(examHistory: ExamHistoryRecord[], overrides: Partial<UserProfile['progress']> = {}): UserProfile {
  return {
    id: 'user_phase3b5_test',
    name: 'Amina Rahman',
    email: 'amina@example.com',
    avatarInitials: 'AR',
    createdAt: Date.now() - 86400000 * 30,
    progress: {
      completedModules: [],
      quizScores: {},
      vocabMastered: [],
      writingDrafts: [],
      streakDays: 0,
      lastActiveDate: new Date().toISOString().slice(0, 10),
      targetBand: 7.5,
      intendedFormat: 'Academic',
      examHistory,
      ...overrides
    }
  };
}

function makeCompleteFullMock(
  id: string,
  timestamp: number,
  bands: { l: number; r: number; w: number; s: number; overall: number }
): ExamHistoryRecord {
  return {
    id,
    timestamp,
    overallBand: bands.overall,
    listeningBand: bands.l,
    readingBand: bands.r,
    writingBand: bands.w,
    speakingBand: bands.s,
    correctCount: 30,
    totalQuestions: 40,
    wordCount: 430,
    submissionType: 'manual',
    examType: 'full_mock',
    completedSkills: {
      listening: true,
      reading: true,
      writing: true,
      speaking: true
    },
    speakingAssessmentStatus: 'evaluated',
    speakingPronunciationObservable: true
  };
}

function deepFreeze<T>(obj: T): T {
  if (obj && typeof obj === 'object') {
    Object.freeze(obj);
    for (const val of Object.values(obj as Record<string, unknown>)) {
      deepFreeze(val);
    }
  }
  return obj;
}

describe('Phase 3B.5 — Dashboard, Progress & Historical Aggregation Integrity', () => {
  it('1. Missing scores remain null and never become 0, while genuine 0.0 objective scores are preserved', () => {
    const emptyRecord: ExamHistoryRecord = {
      id: 'empty_1',
      timestamp: 1_700_000_000_000,
      overallBand: null,
      listeningBand: null,
      readingBand: undefined,
      writingBand: null,
      speakingBand: null,
      correctCount: 0,
      totalQuestions: 0,
      wordCount: 0,
      submissionType: 'manual',
      examType: 'incomplete_mock'
    };

    const aggEmpty = aggregateExamHistory([emptyRecord]);
    assert.equal(aggEmpty.overall.latest, null);
    assert.equal(aggEmpty.overall.average, null);
    assert.equal(aggEmpty.overall.best, null);
    assert.equal(aggEmpty.skills.listening.latest, null);
    assert.equal(aggEmpty.skills.reading.latest, null);
    assert.equal(aggEmpty.skills.writing.latest, null);
    assert.equal(aggEmpty.skills.speaking.latest, null);

    // Genuine 0/40 Listening attempt (explicitly completed objective test with totalQuestions > 0)
    const genuineZeroListening: ExamHistoryRecord = {
      id: 'zero_l_1',
      timestamp: 1_700_000_050_000,
      overallBand: null,
      listeningBand: 0.0,
      readingBand: null,
      writingBand: null,
      speakingBand: null,
      correctCount: 0,
      totalQuestions: 40,
      wordCount: 0,
      submissionType: 'manual',
      examType: 'listening_only',
      completedSkills: {
        listening: true,
        reading: false,
        writing: false,
        speaking: false
      }
    };

    assert.equal(extractValidSkillBand(genuineZeroListening, 'listening'), 0.0);
    assert.equal(extractValidSkillBand(genuineZeroListening, 'reading'), null);

    const aggZero = aggregateExamHistory([genuineZeroListening]);
    assert.equal(aggZero.skills.listening.latest, 0.0);
    assert.equal(aggZero.skills.listening.average, 0.0);
    assert.equal(aggZero.skills.listening.best, 0.0);
    assert.equal(aggZero.skills.listening.sampleCount, 1);
    assert.equal(aggZero.skills.reading.latest, null);
    assert.equal(aggZero.overall.latest, null);
  });

  it('2. Invalid and non-half-band values are strictly excluded', () => {
    assert.equal(isValidHalfBand(6.5), true);
    assert.equal(isValidHalfBand(9.0), true);
    assert.equal(isValidHalfBand(6.3), false);
    assert.equal(isValidHalfBand(7.25), false);
    assert.equal(isValidHalfBand(9.5), false);
    assert.equal(isValidHalfBand(-1), false);
    assert.equal(isValidHalfBand(Number.NaN), false);
    assert.equal(isValidHalfBand(Number.POSITIVE_INFINITY), false);
    assert.equal(isValidHalfBand('7.0' as unknown), false);
    assert.equal(validateOptionalHalfBand(null), null);
    assert.equal(validateOptionalHalfBand(undefined), null);
    assert.equal(validateOptionalHalfBand(6.7), null);
    assert.equal(validateOptionalHalfBand(7.5), 7.5);

    const malformedRecord = {
      id: 'bad_1',
      timestamp: 1_700_000_100_000,
      overallBand: 6.3,
      listeningBand: 10.5,
      readingBand: -2,
      writingBand: Number.NaN,
      speakingBand: 7.2,
      correctCount: 0,
      totalQuestions: 40,
      wordCount: 300,
      submissionType: 'manual',
      examType: 'full_mock'
    } as ExamHistoryRecord;

    const ev = evaluateExamHistoryRecord(malformedRecord);
    assert.equal(ev.overallBand, null);
    assert.equal(ev.listeningBand, null);
    assert.equal(ev.readingBand, null);
    assert.equal(ev.writingBand, null);
    assert.equal(ev.speakingBand, null);
    assert.equal(ev.isCompletedFullMock, false);

    const desc = describeExamHistoryDisplay(malformedRecord, 1);
    assert.equal(desc.oBand, null);
    assert.equal(desc.lBand, null);
    assert.equal(desc.rBand, null);
    assert.equal(desc.wBand, null);
    assert.equal(desc.sBand, null);
    assert.equal(desc.badgeScore, 'INC');
  });

  it('3. Valid individual skill scores remain visible when other skills are incomplete (and overall is NOT inferred)', () => {
    const partialMock: ExamHistoryRecord = {
      id: 'partial_1',
      timestamp: 1_700_000_200_000,
      overallBand: null,
      listeningBand: 7.5,
      readingBand: 8.0,
      writingBand: null,
      speakingBand: null,
      correctCount: 34,
      totalQuestions: 40,
      wordCount: 0,
      submissionType: 'manual',
      examType: 'incomplete_mock',
      completedSkills: {
        listening: true,
        reading: true,
        writing: false,
        speaking: false
      },
      incompleteSkills: ['writing', 'speaking']
    };

    const agg = aggregateExamHistory([partialMock]);
    assert.equal(agg.skills.listening.latest, 7.5);
    assert.equal(agg.skills.reading.latest, 8.0);
    assert.equal(agg.skills.writing.latest, null);
    assert.equal(agg.skills.speaking.latest, null);
    assert.equal(agg.overall.latest, null);
    assert.equal(agg.completedFullMockCount, 0);
    assert.equal(agg.incompleteMockCount, 1);

    // Modals must NOT infer an overall band from only L+R
    const user = makeUser([partialMock]);
    const officialHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(OfficialDiagnosticReportModal, { isOpen: true, onClose: () => {}, user })
    );
    assert.match(officialHtml, /7\.5/);
    assert.match(officialHtml, /8\.0/);
    assert.match(officialHtml, /Not assessed/);

    const scorecardHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(DiagnosticScorecardModal, { isOpen: true, onClose: () => {}, user })
    );
    assert.match(scorecardHtml, /7\.5/);
    assert.match(scorecardHtml, /8\.0/);
    assert.match(scorecardHtml, /Not assessed/);
  });

  it('4. Incomplete Full Mocks do not count as completed even if examType says full_mock or writingTasksCompleted < 2', () => {
    const forgedMissingSpeaking: ExamHistoryRecord = {
      id: 'forged_1',
      timestamp: 1_700_000_300_000,
      overallBand: 7.0,
      listeningBand: 7.0,
      readingBand: 7.0,
      writingBand: 7.0,
      speakingBand: null,
      correctCount: 30,
      totalQuestions: 40,
      wordCount: 420,
      submissionType: 'manual',
      examType: 'full_mock'
    };

    const singleTaskWritingMock = {
      ...makeCompleteFullMock('one_task_mock', 1_700_000_350_000, {
        l: 7.0,
        r: 7.0,
        w: 6.5,
        s: 7.0,
        overall: 7.0
      }),
      writingTasksCompleted: 1
    } as ExamHistoryRecord;

    assert.equal(isFullMockExamRecord(forgedMissingSpeaking), false);
    assert.equal(extractValidFullMockOverallBand(forgedMissingSpeaking), null);
    assert.equal(extractValidFullMockOverallBand(singleTaskWritingMock), null);

    const agg = aggregateExamHistory([forgedMissingSpeaking, singleTaskWritingMock]);
    assert.equal(agg.completedFullMockCount, 0);
    assert.equal(agg.incompleteMockCount, 2);
    assert.equal(agg.overall.latest, null);
    assert.equal(agg.overall.sampleCount, 0);
  });

  it('5. Writing-only attempts never count as Full Mocks even when legacy record has an overallBand field', () => {
    const writingOnly: ExamHistoryRecord = {
      id: 'w_only_1',
      timestamp: 1_700_000_400_000,
      overallBand: 7.0, // legacy field present
      listeningBand: 0,
      readingBand: 0,
      writingBand: 7.0,
      speakingBand: null,
      correctCount: 0,
      totalQuestions: 0,
      wordCount: 440,
      submissionType: 'manual',
      examType: 'writing_only'
    };

    assert.equal(isFullMockExamRecord(writingOnly), false);
    assert.equal(extractValidFullMockOverallBand(writingOnly), null);

    const agg = aggregateExamHistory([writingOnly]);
    assert.equal(agg.completedFullMockCount, 0);
    assert.equal(agg.singleSkillEvaluatedCount, 1);
    assert.equal(agg.overall.latest, null);
    assert.equal(agg.skills.writing.latest, 7.0);
    assert.equal(agg.skills.listening.latest, null);
    assert.equal(agg.skills.reading.latest, null);

    const summary = summarizeExamHistoryCounts([writingOnly]);
    assert.equal(summary.completedFullMockCount, 0);
    assert.equal(summary.singleSkillCount, 1);
  });

  it('6. Transcript-only Speaking does not count as a valid evaluated Speaking score or Full Mock', () => {
    const transcriptOnlySpeaking: ExamHistoryRecord = {
      id: 'spk_tx_only',
      timestamp: 1_700_000_500_000,
      overallBand: 7.0,
      listeningBand: 7.5,
      readingBand: 7.5,
      writingBand: 6.5,
      speakingBand: 7.0,
      correctCount: 33,
      totalQuestions: 40,
      wordCount: 410,
      submissionType: 'manual',
      examType: 'full_mock',
      completedSkills: {
        listening: true,
        reading: true,
        writing: true,
        speaking: true
      },
      speakingAssessmentStatus: 'partial_transcript_only',
      speakingPronunciationObservable: false
    };

    assert.equal(extractValidSkillBand(transcriptOnlySpeaking, 'speaking'), null);
    assert.equal(extractValidFullMockOverallBand(transcriptOnlySpeaking), null);
    assert.equal(extractValidSkillBand(transcriptOnlySpeaking, 'listening'), 7.5);
    assert.equal(extractValidSkillBand(transcriptOnlySpeaking, 'reading'), 7.5);
    assert.equal(extractValidSkillBand(transcriptOnlySpeaking, 'writing'), 6.5);

    const agg = aggregateExamHistory([transcriptOnlySpeaking]);
    assert.equal(agg.completedFullMockCount, 0);
    assert.equal(agg.overall.latest, null);
    assert.equal(agg.skills.speaking.latest, null);
    assert.equal(agg.skills.listening.latest, 7.5);

    // Also verify analytics event validation blocks transcript-only Speaking
    const transcriptEvent: CandidateAnalyticsEventLike = {
      id: 'evt_spk_tx',
      eventType: 'module_evaluated',
      serverTimestamp: 1_700_000_500_000,
      payload: {
        moduleId: 'speaking',
        completionStatus: 'completed',
        overallBandScore: 7.5,
        criterionScores: { fc: 7.5, lr: 7.5, gra: 7.5, pr: 7.0 },
        pronunciationObservable: false,
        evidenceMode: 'transcript_only',
        assessmentStatus: 'partial_transcript_only'
      }
    };
    assert.equal(extractValidAnalyticsEventBand(transcriptEvent), null);
    const analyticsView = aggregateCandidateAnalyticsEvents([transcriptEvent]);
    assert.equal(analyticsView.evaluatedCount, 0);
    assert.equal(analyticsView.latestModuleBand.speaking, null);
    assert.equal(analyticsView.speakingCriteria.hasAnyCriterion, false);
  });

  it('7. Averages exclude unavailable, partial, and non-scoring/diagnostic assessments (including independent criterion denominators)', () => {
    const validMock1 = makeCompleteFullMock('fm_1', 1_700_001_000_000, {
      l: 6.0,
      r: 6.5,
      w: 6.0,
      s: 6.5,
      overall: 6.5
    });
    const validMock2 = makeCompleteFullMock('fm_2', 1_700_002_000_000, {
      l: 8.0,
      r: 7.5,
      w: 7.0,
      s: 7.5,
      overall: 7.5
    });
    const diagnosticPrecheck = {
      id: 'diag_pre_1',
      timestamp: 1_700_003_000_000,
      overallBand: 4.0,
      listeningBand: 4.0,
      readingBand: 4.0,
      writingBand: 4.0,
      speakingBand: 4.0,
      correctCount: 0,
      totalQuestions: 0,
      wordCount: 180,
      submissionType: 'manual',
      examType: 'writing_only',
      assessmentStatus: 'structural_precheck',
      isDiagnosticOnly: true
    } as unknown as ExamHistoryRecord;
    const unavailableWriting = {
      id: 'w_unavail_1',
      timestamp: 1_700_004_000_000,
      overallBand: null,
      writingBand: 5.0,
      correctCount: 0,
      totalQuestions: 0,
      wordCount: 250,
      submissionType: 'manual',
      examType: 'writing_only',
      writingAssessmentStatus: 'unavailable'
    } as unknown as ExamHistoryRecord;

    const agg = aggregateExamHistory([unavailableWriting, diagnosticPrecheck, validMock2, validMock1]);
    assert.equal(agg.completedFullMockCount, 2);
    assert.equal(agg.overall.sampleCount, 2);
    assert.equal(agg.overall.average, 7.0); // (6.5 + 7.5) / 2
    assert.equal(agg.skills.writing.sampleCount, 2);
    assert.equal(agg.skills.writing.average, 6.5); // (6.0 + 7.0) / 2, excludes diag 4.0 & unavail 5.0

    // Independent criterion denominators: one event missing `gra` must NOT drag `gra` average down
    const writingEvents: CandidateAnalyticsEventLike[] = [
      {
        id: 'w_evt_1',
        eventType: 'module_evaluated',
        serverTimestamp: 1_700_001_000_000,
        payload: {
          moduleId: 'writing',
          completionStatus: 'completed',
          overallBandScore: 7.0,
          criterionScores: { ta: 7.0, cc: 7.0, lr: 7.0, gra: 7.0 }
        }
      },
      {
        id: 'w_evt_2',
        eventType: 'module_evaluated',
        serverTimestamp: 1_700_002_000_000,
        payload: {
          moduleId: 'writing',
          completionStatus: 'completed',
          overallBandScore: 8.0,
          criterionScores: { ta: 8.0, cc: 8.0, lr: 8.0, gra: null }
        }
      }
    ];
    const analyticsView = aggregateCandidateAnalyticsEvents(writingEvents);
    assert.equal(analyticsView.writingCriteria.values.ta, 7.5);
    assert.equal(analyticsView.writingCriteria.values.gra, 7.0); // NOT 3.5!
    assert.equal(analyticsView.writingCriteria.counts.gra, 1);
  });

  it('8 & 9. Personal-best calculations preserve valid historical scores and incomplete newer attempts cannot overwrite them', () => {
    const strongHistoricalMock = makeCompleteFullMock('fm_best', 1_700_001_000_000, {
      l: 8.5,
      r: 8.0,
      w: 7.5,
      s: 8.0,
      overall: 8.0
    });
    const newerIncompleteMock: ExamHistoryRecord = {
      id: 'inc_newer',
      timestamp: 1_700_009_000_000,
      overallBand: null,
      listeningBand: null,
      readingBand: null,
      writingBand: null,
      speakingBand: null,
      correctCount: 0,
      totalQuestions: 0,
      wordCount: 0,
      submissionType: 'timer',
      examType: 'incomplete_mock',
      completedSkills: {
        listening: false,
        reading: false,
        writing: false,
        speaking: false
      },
      incompleteSkills: ['listening', 'reading', 'writing', 'speaking']
    };

    // Stored newest-first as userStorage does (unshift)
    const agg = aggregateExamHistory([newerIncompleteMock, strongHistoricalMock]);
    assert.equal(agg.overall.best, 8.0);
    assert.equal(agg.overall.latest, 8.0);
    assert.equal(agg.skills.listening.best, 8.5);
    assert.equal(agg.skills.listening.latest, 8.5);
    assert.equal(agg.skills.speaking.best, 8.0);
    assert.equal(agg.skills.speaking.latest, 8.0);

    // PrintablePracticeReportModal must still show Band 8.0 and Speaking 8.0 despite newer incomplete attempt at index 0
    const user = makeUser([newerIncompleteMock, strongHistoricalMock]);
    const reportHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(PrintablePracticeReportModal, {
        isOpen: true,
        onClose: () => {},
        user
      })
    );
    assert.match(reportHtml, /Band 8\.0/);
    assert.match(reportHtml, /8\.5/);
  });

  it('10. Trend calculations handle insufficient comparable data safely and never compare different skills', () => {
    assert.deepEqual(computeBandTrend([]), {
      status: 'insufficient_data',
      delta: null,
      previous: null,
      current: null,
      sampleCount: 0
    });
    assert.deepEqual(computeBandTrend([7.0]), {
      status: 'insufficient_data',
      delta: null,
      previous: null,
      current: 7.0,
      sampleCount: 1
    });
    assert.deepEqual(computeBandTrend([6.5, 7.5]), {
      status: 'up',
      delta: 1.0,
      previous: 6.5,
      current: 7.5,
      sampleCount: 2
    });

    // Cross-module events (Reading 8.0 then Writing 6.0) must NOT report a -2.0 decline!
    const crossSkillEvents: CandidateAnalyticsEventLike[] = [
      {
        id: 'e_read',
        eventType: 'module_evaluated',
        serverTimestamp: 1_700_001_000_000,
        payload: { moduleId: 'reading', completionStatus: 'completed', overallBandScore: 8.0 }
      },
      {
        id: 'e_write',
        eventType: 'module_evaluated',
        serverTimestamp: 1_700_002_000_000,
        payload: { moduleId: 'writing', completionStatus: 'completed', overallBandScore: 6.0 }
      }
    ];
    const view = aggregateCandidateAnalyticsEvents(crossSkillEvents);
    assert.equal(view.latestComparableTrend.latestBand, 6.0);
    assert.equal(view.latestComparableTrend.latestModule, 'WRITING');
    assert.equal(view.latestComparableTrend.trend.status, 'insufficient_data');
    assert.equal(view.latestComparableTrend.trend.delta, null);
  });

  it('11. Charts and dashboard widgets do not plot missing scores as zero or fabricate sparklines', () => {
    const readingOnly: ExamHistoryRecord = {
      id: 'r_only',
      timestamp: 1_700_001_000_000,
      overallBand: null,
      listeningBand: null,
      readingBand: 7.5,
      writingBand: null,
      speakingBand: null,
      correctCount: 33,
      totalQuestions: 40,
      wordCount: 0,
      submissionType: 'manual',
      examType: 'reading_only'
    };

    const agg = aggregateExamHistory([readingOnly]);
    assert.equal(agg.chartSeries.length, 1);
    assert.equal(agg.chartSeries[0].readingBand, 7.5);
    assert.equal(agg.chartSeries[0].listeningBand, null);
    assert.equal(agg.chartSeries[0].writingBand, null);
    assert.equal(agg.chartSeries[0].speakingBand, null);
    assert.equal(agg.chartSeries[0].overallBand, null);
    assert.equal(agg.fullMockSparklinePoints.length, 0);

    // Fallback analytics comparison data must keep unassessed modules as null, never 0
    const fallbackEvents = buildSafeHistoryFallbackEvents([readingOnly]);
    const analyticsView = aggregateCandidateAnalyticsEvents(fallbackEvents);
    const listeningBar = analyticsView.moduleComparisonData.find((m) => m.moduleId === 'listening');
    const readingBar = analyticsView.moduleComparisonData.find((m) => m.moduleId === 'reading');
    assert.equal(listeningBar?.latestBand, null);
    assert.equal(readingBar?.latestBand, 7.5);

    // ProgressDonutCard with 0 full mocks must NOT render the old hardcoded rising SVG path
    const donutHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(ProgressDonutCard, {
        overallPercentage: 0,
        estimatedBand: null,
        examHistory: [readingOnly]
      })
    );
    assert.ok(!donutHtml.includes('M0,23 Q25,21 48,16'), 'Hardcoded rising sparkline must be removed');
    assert.match(donutHtml, /Complete 2\+ full mocks to see band trend/);
    assert.match(donutHtml, /0%/);
    assert.match(donutHtml, /7\.5/);

    // AIBandScorecard with null scores shows '—' and 'Not assessed' and preserves genuine 0.0 L
    const scorecardHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(AIBandScorecard, {
        estimatedBand: null,
        skillBands: { listening: 0.0, reading: null, writing: null, speaking: null },
        onNavigate: () => {}
      })
    );
    assert.match(scorecardHtml, /0\.0/);
    assert.match(scorecardHtml, /Not assessed/);

    // QuestionHistoryPage at 0 attempts must NEVER fabricate "Band 6.0"
    const qHistoryHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(QuestionHistoryPage, {
        onBack: () => {},
        onNavigate: () => {},
        onShowToast: () => {}
      })
    );
    assert.ok(!qHistoryHtml.includes('Band 6.0'), 'QuestionHistoryPage must not fabricate Band 6.0 at 0 attempts');
    assert.match(qHistoryHtml, /Not assessed/);
  });

  it('12. History correctly distinguishes attempts, diagnostics, incomplete mocks, and completed evaluations', () => {
    const completeMock = makeCompleteFullMock('h_full', 1_700_004_000_000, {
      l: 7.5,
      r: 7.5,
      w: 7.0,
      s: 7.0,
      overall: 7.5
    });
    const incompleteMock: ExamHistoryRecord = {
      id: 'h_inc',
      timestamp: 1_700_003_000_000,
      overallBand: null,
      listeningBand: 7.0,
      readingBand: null,
      writingBand: null,
      speakingBand: null,
      correctCount: 30,
      totalQuestions: 40,
      wordCount: 0,
      submissionType: 'manual',
      examType: 'incomplete_mock'
    };
    const writingSingle: ExamHistoryRecord = {
      id: 'h_write',
      timestamp: 1_700_002_000_000,
      overallBand: null,
      writingBand: 6.5,
      correctCount: 0,
      totalQuestions: 0,
      wordCount: 410,
      submissionType: 'manual',
      examType: 'writing_only'
    };
    const diagCheck = {
      id: 'h_diag',
      timestamp: 1_700_001_000_000,
      overallBand: null,
      correctCount: 0,
      totalQuestions: 0,
      wordCount: 260,
      submissionType: 'manual',
      examType: 'writing_only',
      isDiagnosticOnly: true
    } as unknown as ExamHistoryRecord;

    const history = [completeMock, incompleteMock, writingSingle, diagCheck];
    const agg = aggregateExamHistory(history);
    assert.equal(agg.totalAttempts, 4);
    assert.equal(agg.completedFullMockCount, 1);
    assert.equal(agg.incompleteMockCount, 1);
    assert.equal(agg.singleSkillEvaluatedCount, 1);
    assert.equal(agg.diagnosticOrUnassessedCount, 1);

    assert.equal(describeExamHistoryDisplay(completeMock, 4).badgeScore, '7.5');
    assert.equal(describeExamHistoryDisplay(incompleteMock, 3).badgeScore, 'INC');
    assert.equal(describeExamHistoryDisplay(writingSingle, 2).badgeScore, '6.5');
    assert.equal(describeExamHistoryDisplay(diagCheck, 1).badgeScore, 'DIAG');

    const user = makeUser(history);
    const mockPageHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(MockTestPage, {
        user,
        onNavigate: () => {},
        onShowToast: () => {},
        onOpenBandModal: () => {}
      })
    );
    assert.match(mockPageHtml, /4-Skill Complete/);
    assert.match(mockPageHtml, /Incomplete/);
    assert.match(mockPageHtml, /Diagnostic Only/);
    assert.match(mockPageHtml, /1 Full Mock/);

    // HomeDashboard & ProgressPage & CandidateAnalyticsPage SSR sanity with mixed history
    const homeHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(HomeDashboard, {
        user,
        onNavigate: () => {},
        onShowToast: () => {},
        onOpenBandModal: () => {}
      })
    );
    assert.match(homeHtml, /Latest full mock/);

    const progressHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(ProgressPage, {
        user,
        onNavigate: () => {},
        onShowToast: () => {},
        onOpenBandModal: () => {}
      })
    );
    assert.match(progressHtml, /Full Mock Band/);

    const analyticsHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(CandidateAnalyticsPage, {
        user,
        onNavigate: () => {}
      })
    );
    assert.match(analyticsHtml, /Completed Full Mocks/);
    assert.match(analyticsHtml, /Recorded Assessment History/);
  });

  it('13. Date filtering and pagination preserve per-record score eligibility identically', () => {
    const t1 = 1_700_000_000_000;
    const t2 = 1_700_100_000_000;
    const t3 = 1_700_200_000_000;
    const t4 = 1_700_300_000_000;

    const records: ExamHistoryRecord[] = [
      makeCompleteFullMock('m4', t4, { l: 8.0, r: 8.0, w: 7.5, s: 7.5, overall: 8.0 }),
      {
        id: 'w3_bad',
        timestamp: t3,
        overallBand: 9.0,
        writingBand: 6.3, // invalid half-band
        correctCount: 0,
        totalQuestions: 0,
        wordCount: 300,
        submissionType: 'manual',
        examType: 'writing_only'
      },
      makeCompleteFullMock('m2', t2, { l: 7.0, r: 7.0, w: 6.5, s: 6.5, overall: 7.0 }),
      makeCompleteFullMock('m1', t1, { l: 6.0, r: 6.0, w: 6.0, s: 6.0, overall: 6.0 })
    ];

    const allAgg = aggregateExamHistory(records);
    assert.equal(allAgg.completedFullMockCount, 3);
    assert.equal(allAgg.overall.average, 7.0); // (6 + 7 + 8) / 3

    // Date range filter excluding t1 preserves eligibility rules (w3_bad still rejected!)
    const recentAgg = aggregateExamHistory(records, {
      dateRange: { fromTimestamp: t2, toTimestamp: t4 }
    });
    assert.equal(recentAgg.totalAttempts, 3);
    assert.equal(recentAgg.completedFullMockCount, 2);
    assert.equal(recentAgg.overall.average, 7.5); // (7 + 8) / 2
    assert.equal(recentAgg.skills.writing.latest, 7.5);
    assert.equal(recentAgg.diagnosticOrUnassessedCount, 1);

    // Direct filterRecordsByDateRange & paginateRecords preserve exact evaluated statuses
    const filtered = filterRecordsByDateRange(records, { fromTimestamp: t2 });
    assert.equal(filtered.length, 3);

    const page1 = paginateRecords(allAgg.evaluatedRecords, { page: 1, pageSize: 2 });
    const page2 = paginateRecords(allAgg.evaluatedRecords, { page: 2, pageSize: 2 });
    assert.equal(page1.totalPages, 2);
    assert.equal(page1.items.length, 2);
    assert.equal(page2.items.length, 2);
    assert.equal(page1.items[0].isCompletedFullMock, true);
    assert.equal(page1.items[1].writingBand, null); // invalid 6.3 remains null after pagination
    assert.equal(page2.items[0].overallBand, 7.0);
    assert.equal(page2.items[1].overallBand, 6.0);
  });

  it('14. Existing valid and legacy historical records remain completely immutable at read time', () => {
    const validRecord = makeCompleteFullMock('imm_valid', 1_700_005_000_000, {
      l: 7.5,
      r: 8.0,
      w: 7.0,
      s: 7.5,
      overall: 7.5
    });
    const malformedLegacy = {
      id: 'imm_legacy',
      timestamp: 1_700_006_000_000,
      overallBand: 6.3,
      listeningBand: 0,
      readingBand: 0,
      writingBand: 6.5,
      speakingBand: 7.0,
      speakingAssessmentStatus: 'partial_transcript_only',
      speakingPronunciationObservable: false,
      correctCount: 0,
      totalQuestions: 0,
      wordCount: 350,
      submissionType: 'manual',
      examType: 'full_mock'
    } as ExamHistoryRecord;

    const frozenHistory = deepFreeze([malformedLegacy, validRecord]);
    const snapshotBefore = JSON.stringify(frozenHistory);

    // Running every read-time helper on deep-frozen records must succeed without throwing or mutating
    const agg = aggregateExamHistory(frozenHistory);
    const counts = summarizeExamHistoryCounts(frozenHistory);
    const d1 = describeExamHistoryDisplay(frozenHistory[0], 2);
    const d2 = describeExamHistoryDisplay(frozenHistory[1], 1);
    const fallback = buildSafeHistoryFallbackEvents(frozenHistory);
    const analyticsView = aggregateCandidateAnalyticsEvents(fallback);

    assert.equal(JSON.stringify(frozenHistory), snapshotBefore);
    assert.equal(agg.completedFullMockCount, 1);
    assert.equal(agg.overall.latest, 7.5);
    assert.equal(counts.completedFullMockCount, 1);
    assert.equal(d1.isIncompleteMock, true);
    assert.equal(d2.isFullMock, true);
    assert.equal(analyticsView.latestModuleBand.speaking, 7.5);
  });

  it('14. Phase 3B.6: completedSkills[skill] === true alone NEVER qualifies 0.0 objective score without attempted-question evidence (totalQuestions > 0)', () => {
    const flagOnlyZeroMock: ExamHistoryRecord = {
      id: 'flag_only_zero_mock',
      timestamp: 1_700_007_000_000,
      overallBand: 3.5,
      listeningBand: 0.0,
      readingBand: 0.0,
      writingBand: 7.0,
      speakingBand: 7.0,
      correctCount: 0,
      totalQuestions: 0, // NO attempted-question evidence!
      wordCount: 440,
      submissionType: 'manual',
      examType: 'full_mock',
      writingTasksCompleted: 2,
      completedSkills: {
        listening: true,
        reading: true,
        writing: true,
        speaking: true
      },
      speakingAssessmentStatus: 'evaluated',
      speakingPronunciationObservable: true
    };

    assert.equal(extractValidSkillBand(flagOnlyZeroMock, 'listening'), null);
    assert.equal(extractValidSkillBand(flagOnlyZeroMock, 'reading'), null);
    assert.equal(isFullMockExamRecord(flagOnlyZeroMock), false);
    assert.equal(extractValidFullMockOverallBand(flagOnlyZeroMock), null);

    const desc = describeExamHistoryDisplay(flagOnlyZeroMock, 1);
    assert.equal(desc.lBand, null);
    assert.equal(desc.rBand, null);
    assert.equal(desc.isFullMock, false);
    assert.equal(desc.oBand, null);

    assert.equal(
      calculateFourSkillOverallBand({
        listeningBand: 0.0,
        readingBand: 0.0,
        writingBand: 7.0,
        speakingBand: 7.0,
        examType: 'full_mock',
        completedSkills: { listening: true, reading: true, writing: true, speaking: true },
        totalQuestions: 0
      }),
      null
    );

    // Genuine 0/40 attempted full mock (totalQuestions > 0) remains valid
    const genuineZeroMock: ExamHistoryRecord = {
      ...flagOnlyZeroMock,
      id: 'genuine_zero_mock',
      totalQuestions: 80
    };
    assert.equal(extractValidSkillBand(genuineZeroMock, 'listening'), 0.0);
    assert.equal(extractValidSkillBand(genuineZeroMock, 'reading'), 0.0);
    assert.equal(isFullMockExamRecord(genuineZeroMock), true);
    assert.equal(extractValidFullMockOverallBand(genuineZeroMock), 3.5);
  });

  it('15. Phase 3B.6: writingTasksCompleted < 2 or omitted with under-length combined words (< 400w) is rejected consistently across all Full Mock consumers', () => {
    const oneTaskMock: ExamHistoryRecord = {
      ...makeCompleteFullMock('one_task_consistent', 1_700_008_000_000, {
        l: 7.0,
        r: 7.5,
        w: 6.5,
        s: 7.0,
        overall: 7.0
      }),
      writingTasksCompleted: 1
    };

    // Previously isFullMockExamRecord disagreed with extractValidFullMockOverallBand
    assert.equal(isFullMockExamRecord(oneTaskMock), false);
    assert.equal(extractValidFullMockOverallBand(oneTaskMock), null);
    assert.equal(describeExamHistoryDisplay(oneTaskMock, 1).isFullMock, false);
    assert.equal(summarizeExamHistoryCounts([oneTaskMock]).completedFullMockCount, 0);

    // Omitted writingTasksCompleted with combined wordCount < 400 (cannot satisfy 150w Task 1 + 250w Task 2)
    const missingTaskCountShortWriting: ExamHistoryRecord = {
      ...makeCompleteFullMock('missing_tasks_short', 1_700_008_100_000, {
        l: 7.0,
        r: 7.5,
        w: 6.5,
        s: 7.0,
        overall: 7.0
      }),
      wordCount: 260
    };
    assert.equal(isFullMockExamRecord(missingTaskCountShortWriting), false);
    assert.equal(extractValidFullMockOverallBand(missingTaskCountShortWriting), null);
    assert.equal(describeExamHistoryDisplay(missingTaskCountShortWriting, 1).isFullMock, false);
    assert.equal(summarizeExamHistoryCounts([missingTaskCountShortWriting]).completedFullMockCount, 0);

    // calculateFourSkillOverallBand also rejects writingTasksCompleted < 2
    assert.equal(
      calculateFourSkillOverallBand({
        listeningBand: 7.0,
        readingBand: 7.5,
        writingBand: 6.5,
        speakingBand: 7.0,
        examType: 'full_mock',
        completedSkills: { listening: true, reading: true, writing: true, speaking: true },
        writingTasksCompleted: 1
      }),
      null
    );
  });
});
