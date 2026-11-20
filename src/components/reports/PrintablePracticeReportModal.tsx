import React, { useEffect } from 'react';
import {
  Printer,
  X,
  Target,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Calendar,
  Award,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import { UserProfile } from '../../types';
import { EASE_EDITORIAL } from '../common/MotionPrimitives';
import { loadDiagnosticResult } from '../../services/diagnosticResultStore';
import {
  loadExamSetup,
  daysUntilExam,
  formatExamDate,
  correctAnswersNeeded
} from '../../services/examSetupService';
import { loadSpellingProgress } from '../../utils/spellingProgressStore';
import {
  getVaultRetentionStats,
  getHighestFrequencyErrorCategory
} from '../../utils/vaultStorage';
import { getCurrentUser } from '../../utils/userStorage';

export interface LatestMockSummaryOverride {
  testTitle: string;
  overallBand: number;
  listeningBand?: number | null;
  readingBand?: number | null;
  writingBand?: number | null;
  speakingBand?: number | null;
  completedDateLabel?: string;
}

interface PrintablePracticeReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserProfile | null;
  latestMockOverride?: LatestMockSummaryOverride;
  onShowToast?: (msg: string) => void;
}

const TOTAL_SPELLING_WORDS = 683;

function formatBandDisplay(score: number | null | undefined): string {
  if (typeof score !== 'number' || !Number.isFinite(score) || score <= 0) return '—';
  return score.toFixed(1);
}

export const PrintablePracticeReportModal: React.FC<PrintablePracticeReportModalProps> = ({
  isOpen,
  onClose,
  user: propUser,
  latestMockOverride,
  onShowToast
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeUser = propUser || getCurrentUser();
  const diagnostic = loadDiagnosticResult();
  const examSetup = loadExamSetup();
  const spelling = loadSpellingProgress();
  const vaultStats = getVaultRetentionStats();
  const topTrap = getHighestFrequencyErrorCategory();

  const candidateName = activeUser?.name || 'BandSprint Candidate';
  const candidateEmail = activeUser?.email || 'Guest Practice Session';
  const examMode = examSetup.examMode || activeUser?.progress?.intendedFormat || 'Academic';
  const targetBand = examSetup.targetBand || activeUser?.progress?.targetBand || 7.5;
  const examDateLabel = formatExamDate(examSetup.examDate);
  const daysLeft = daysUntilExam(examSetup.examDate);

  const history = activeUser?.progress?.examHistory || [];
  const latestHistory = history[0];

  // Resolve 4-skill estimated bands (prioritise explicit mock override -> latest mock -> diagnostic)
  const listeningBand =
    latestMockOverride?.listeningBand ??
    (latestHistory?.listeningBand && latestHistory.listeningBand > 0 ? latestHistory.listeningBand : null) ??
    diagnostic?.scores.listening ??
    null;

  const readingBand =
    latestMockOverride?.readingBand ??
    (latestHistory?.readingBand && latestHistory.readingBand > 0 ? latestHistory.readingBand : null) ??
    diagnostic?.scores.reading ??
    null;

  const writingBand =
    latestMockOverride?.writingBand ??
    (latestHistory?.writingBand && latestHistory.writingBand > 0 ? latestHistory.writingBand : null) ??
    diagnostic?.scores.writing ??
    null;

  const speakingBand =
    latestMockOverride?.speakingBand ??
    diagnostic?.scores.speaking ??
    null;

  const overallBand =
    latestMockOverride?.overallBand ??
    (latestHistory?.overallBand && latestHistory.overallBand > 0 ? latestHistory.overallBand : null) ??
    diagnostic?.scores.overall ??
    null;

  const bandGap =
    overallBand && overallBand > 0 ? Math.max(0, Number((targetBand - overallBand).toFixed(1))) : null;

  const skillRows = [
    { key: 'listening', label: 'Listening', band: listeningBand, note: `Target ${correctAnswersNeeded(targetBand)} / 40 raw` },
    { key: 'reading', label: `Reading (${examMode})`, band: readingBand, note: `Target ${correctAnswersNeeded(targetBand)} / 40 raw` },
    { key: 'writing', label: 'Writing (Tasks 1 & 2)', band: writingBand, note: 'TA/TR · CC · LR · GRA' },
    { key: 'speaking', label: 'Speaking (Parts 1–3)', band: speakingBand, note: 'FC · LR · GRA · PR' }
  ];

  const scoredSkills = skillRows.filter((s) => typeof s.band === 'number' && s.band > 0);
  const weakestSkill =
    scoredSkills.length > 0
      ? scoredSkills.reduce((min, cur) => ((cur.band as number) < (min.band as number) ? cur : min))
      : null;

  // Dynamic 7-day priority checklist
  const priorities: string[] = [];
  if (weakestSkill) {
    priorities.push(
      `Dedicate 40% of this week's sessions to ${weakestSkill.label} (currently est. Band ${(weakestSkill.band as number).toFixed(1)} vs target Band ${targetBand.toFixed(1)}).`
    );
  } else {
    priorities.push(
      `Complete the 12-minute 4-skill Diagnostic Test to establish your baseline band score across all four modules.`
    );
  }
  if (vaultStats.dueCount > 0) {
    priorities.push(
      `Clear ${vaultStats.dueCount} overdue item${vaultStats.dueCount === 1 ? '' : 's'} in your Spaced-Repetition Mistake Vault before taking another timed mock.`
    );
  } else {
    priorities.push(
      `Log every missed Reading, Listening, and Writing sentence into your Mistake Vault so spaced repetition locks in corrections.`
    );
  }
  if (topTrap) {
    priorities.push(
      `Drill your #1 recurring error trap: "${topTrap.category}" (${topTrap.count} unresolved instance${topTrap.count === 1 ? '' : 's'} in ${topTrap.module}).`
    );
  }
  priorities.push(
    `Master 15–20 words/day in the 683-Word Listening Spelling Lab (currently ${spelling.masteredWords.length}/${TOTAL_SPELLING_WORDS} mastered).`
  );
  priorities.push(
    `Complete 1 timed full or single-skill CD-IELTS mock simulation this week and review the Side-by-Side Band 8.5+ Writing Diff.`
  );

  const generatedDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const handlePrint = () => {
    if (onShowToast) {
      onShowToast('Opening print dialog — choose "Save as PDF" to export your Practice Report.');
    }
    window.print();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="fixed inset-0 z-[100] bg-[#0B1514]/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-5 overflow-y-auto print:static print:inset-auto print:bg-white print:p-0 print:block print:!opacity-100"
      role="dialog"
      aria-modal="true"
      aria-label="BandSprint Printable Practice Score Report"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.24, ease: EASE_EDITORIAL }}
        className="bandsprint-print-report-root w-full max-w-4xl bg-white text-[#0E1F1E] rounded-2xl border border-[#D3DDDA] shadow-2xl overflow-hidden flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:border-0 print:rounded-none print:!transform-none print:!opacity-100"
      >
        {/* Non-Print Action Toolbar */}
        <div className="no-print px-5 py-3.5 bg-[#0F4C45] text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-bold text-[#F4A62A]">
            <Award className="w-4 h-4" />
            <span>Practice Score &amp; Readiness Report (Print / PDF Ready)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-[#F4A62A] hover:bg-[#D0891F] text-[#0E1F1E] font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              aria-label="Close Practice Score Report"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Sheet Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-white text-[#0E1F1E] print:overflow-visible print:p-4">
          {/* Editorial Masthead */}
          <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b-2 border-[#0F4C45]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-xs bg-[#0F4C45]" />
                <span className="font-display text-lg font-bold tracking-tight text-[#0F4C45]">
                  BandSprint
                </span>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#566664]">
                  · Practice Readiness Statement
                </span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0E1F1E] tracking-tight">
                IELTS {examMode} Practice Score Report
              </h1>
              <p className="text-xs text-[#566664]">
                Generated on <strong className="text-[#0E1F1E]">{generatedDate}</strong>
                {latestMockOverride ? ` · Session: ${latestMockOverride.testTitle}` : ''}
              </p>
            </div>

            {/* Overall Band Stamp */}
            <div className="px-5 py-3 rounded-xl bg-[#F7F9F8] border-2 border-[#0F4C45] text-right min-w-[160px]">
              <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#566664]">
                Estimated Overall
              </div>
              <div className="font-mono text-3xl font-bold text-[#0F4C45] tabular-nums leading-tight">
                {overallBand ? `Band ${overallBand.toFixed(1)}` : 'Pending'}
              </div>
              <div className="text-[11px] font-mono text-[#566664] tabular-nums">
                Target: <strong className="text-[#0E1F1E]">{targetBand.toFixed(1)}</strong>
                {bandGap !== null && (
                  <span> · {bandGap === 0 ? 'On target' : `Gap -${bandGap.toFixed(1)}`}</span>
                )}
              </div>
            </div>
          </div>

          {/* Explicit Non-Affiliation Notice */}
          <div className="px-4 py-2.5 rounded-xl bg-[#FEF6E8] border border-[#F9D590] text-[11px] text-[#66410B] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-[#D0891F] shrink-0 mt-0.5" />
            <span>
              <strong>BandSprint Practice Report — Not an official IELTS Test Report Form (TRF).</strong> Band estimates are calculated from your practice simulations for self-study tracking. BandSprint is an independent learning platform and is not affiliated with Cambridge, British Council, or IDP.
            </span>
          </div>

          {/* Candidate Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-[#F7F9F8] border border-[#D3DDDA] text-xs">
            <div>
              <div className="text-[10px] font-mono uppercase text-[#566664]">Candidate</div>
              <div className="font-bold text-[#0E1F1E] truncate">{candidateName}</div>
              <div className="text-[11px] text-[#566664] truncate">{candidateEmail}</div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-[#566664]">Exam Stream</div>
              <div className="font-bold text-[#0E1F1E]">IELTS {examMode}</div>
              <div className="text-[11px] text-[#566664]">Computer-Delivered Prep</div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-[#566664]">Target Band</div>
              <div className="font-mono font-bold text-[#0F4C45] tabular-nums">Band {targetBand.toFixed(1)}</div>
              <div className="text-[11px] text-[#566664]">L/R goal: {correctAnswersNeeded(targetBand)}/40</div>
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase text-[#566664]">Exam Date</div>
              <div className="font-bold text-[#0E1F1E] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#0F4C45]" />
                <span>{examDateLabel}</span>
              </div>
              <div className="text-[11px] text-[#566664] tabular-nums">
                {daysLeft !== null ? `${daysLeft} days remaining` : 'Flexible schedule'}
              </div>
            </div>
          </div>

          {/* 4-Skill Breakdown Table */}
          <div className="space-y-2.5">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-[#0F4C45] flex items-center gap-1.5">
              <Target className="w-4 h-4" />
              <span>4-Skill Estimated Band Profile</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {skillRows.map((skill) => {
                const score = skill.band;
                const pct = score ? Math.min(100, (score / 9) * 100) : 0;
                const isWeakest = weakestSkill?.key === skill.key;
                return (
                  <div
                    key={skill.key}
                    className={`p-3.5 rounded-xl border space-y-2 ${
                      isWeakest
                        ? 'bg-[#FEF6E8]/60 border-[#F4A62A]'
                        : 'bg-white border-[#D3DDDA]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#0E1F1E]">{skill.label}</span>
                      {isWeakest && (
                        <span className="text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 rounded bg-[#F4A62A]/25 text-[#66410B]">
                          Focus
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-2xl font-bold text-[#0F4C45] tabular-nums">
                      {formatBandDisplay(score)}
                      <span className="text-xs font-normal text-[#566664]"> / 9.0</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#EEF3F1] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.55, ease: EASE_EDITORIAL }}
                        className="h-full bg-[#0F4C45]"
                      />
                    </div>
                    <div className="text-[10px] font-mono text-[#566664]">{skill.note}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Study Health: Mistake Vault & 683-Word Spelling Lab */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-[#F7F9F8] border border-[#D3DDDA] space-y-1">
              <div className="text-[10px] font-mono uppercase text-[#566664] flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-[#0F4C45]" />
                <span>Mistake Vault (SM-2)</span>
              </div>
              <div className="font-mono text-lg font-bold text-[#0E1F1E] tabular-nums">
                {vaultStats.dueCount} due · {vaultStats.masteredCount}/{vaultStats.total} mastered
              </div>
              <div className="text-[11px] text-[#566664]">
                Estimated retention rate: <strong className="text-[#0F4C45]">{vaultStats.retentionRate}%</strong>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F7F9F8] border border-[#D3DDDA] space-y-1">
              <div className="text-[10px] font-mono uppercase text-[#566664] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#0F4C45]" />
                <span>Listening Spelling Lab</span>
              </div>
              <div className="font-mono text-lg font-bold text-[#0E1F1E] tabular-nums">
                {spelling.masteredWords.length} / {TOTAL_SPELLING_WORDS} words
              </div>
              <div className="text-[11px] text-[#566664]">
                High-frequency IELTS dictation accuracy:{' '}
                <strong className="text-[#0F4C45]">
                  {spelling.attemptedCount > 0
                    ? `${Math.round((spelling.correctCount / spelling.attemptedCount) * 100)}%`
                    : 'Not started'}
                </strong>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F7F9F8] border border-[#D3DDDA] space-y-1">
              <div className="text-[10px] font-mono uppercase text-[#566664]">
                Primary Error Pattern
              </div>
              <div className="text-sm font-bold text-[#0E1F1E] truncate">
                {topTrap ? topTrap.category : 'No recurring traps logged'}
              </div>
              <div className="text-[11px] text-[#566664]">
                {topTrap
                  ? `${topTrap.count} unresolved in ${topTrap.module}`
                  : 'Keep logging mistakes to unlock pattern analysis'}
              </div>
            </div>
          </div>

          {/* Recent Mock & Practice Attempts Table */}
          <div className="space-y-2.5">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-[#0F4C45]">
              Recent Practice &amp; Mock History ({history.length} total recorded)
            </h2>
            {history.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-[#D3DDDA] text-xs text-[#566664]">
                No completed mock exams logged yet. Complete a timed Reading, Listening, or Writing simulation to populate your official-style progress log.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#D3DDDA]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#EEF3F1] text-[#384543] font-mono text-[10px] uppercase">
                      <th className="py-2.5 px-3 border-b border-[#D3DDDA]">Date</th>
                      <th className="py-2.5 px-3 border-b border-[#D3DDDA]">Practice Set</th>
                      <th className="py-2.5 px-3 border-b border-[#D3DDDA]">Module</th>
                      <th className="py-2.5 px-3 border-b border-[#D3DDDA] text-right">Est. Band</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D3DDDA]/60">
                    {history.slice(0, 6).map((rec) => {
                      const typeLabel = (rec.examType || 'practice_mock')
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, (c) => c.toUpperCase());
                      const detailLabel =
                        rec.totalQuestions > 0
                          ? `${rec.correctCount}/${rec.totalQuestions} correct`
                          : rec.wordCount > 0
                          ? `${rec.wordCount} words written`
                          : 'Timed practice';
                      return (
                        <tr key={rec.id} className="bg-white">
                          <td className="py-2 px-3 font-mono text-[#566664] whitespace-nowrap">
                            {new Date(rec.timestamp).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="py-2 px-3 font-semibold text-[#0E1F1E]">
                            {typeLabel}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-[#566664]">
                            {detailLabel}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-[#0F4C45] text-right tabular-nums">
                            {typeof rec.overallBand === 'number' && rec.overallBand > 0
                              ? rec.overallBand.toFixed(1)
                              : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Personalized Next 7-Day Action Plan */}
          <div className="space-y-2.5">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-[#0F4C45]">
              Next 7-Day Study Priorities
            </h2>
            <div className="p-4 rounded-xl bg-[#F7F9F8] border border-[#D3DDDA] space-y-2">
              {priorities.map((step, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-[#0E1F1E] leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-[#1F8A70] shrink-0 mt-0.5" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Sign-off */}
          <div className="pt-3 border-t border-[#D3DDDA] flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-[#566664]">
            <span>BandSprint · Independent Computer-Delivered IELTS Practice Platform</span>
            <span>Practice Report ID: BS-{Date.now().toString(36).toUpperCase().slice(-6)}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
