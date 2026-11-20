import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Award,
  BookmarkPlus,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Flag,
  Highlighter,
  Lock,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Volume2,
  VolumeX,
  X,
  XCircle
} from 'lucide-react';
import {
  PrivatePdfExam,
  Task1ChartData,
  VerifiedQuestionSet,
  VerifiedSubQuestion,
  reportVerifiedQuestionIssue
} from '../../services/verifiedQuestionBankService';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';
import { addMistake } from '../../utils/vaultStorage';

export interface VerifiedDrillPlayerProps {
  drill?: VerifiedQuestionSet;
  privateExam?: PrivatePdfExam;
  onBack: () => void;
  onComplete?: (id: string, scorePercent: number) => void;
  onShowToast: (msg: string) => void;
}

function normalizeAnswer(val: string): string {
  return String(val || '')
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:'"()]/g, '')
    .replace(/\s+/g, ' ');
}

function isAnswerMatch(userVal: string, q: VerifiedSubQuestion): boolean {
  const normUser = normalizeAnswer(userVal);
  if (!normUser) return false;

  const candidates = [q.correctAnswer, ...(q.acceptableAnswers || [])]
    .map(normalizeAnswer)
    .filter(Boolean);

  if (candidates.includes(normUser)) return true;

  // Handle MCQ letter matching (e.g., user picked "B) Solar thermal" and key is "B" or vice versa)
  if (q.type === 'mcq') {
    const userLetter = normUser.match(/^([a-f])\b/)?.[1];
    for (const c of candidates) {
      const keyLetter = c.match(/^([a-f])\b/)?.[1];
      if (userLetter && keyLetter && userLetter === keyLetter) {
        return true;
      }
      if (c.length > 2 && normUser.includes(c)) return true;
      if (normUser.length > 2 && c.includes(normUser)) return true;
    }
  }
  return false;
}

const CHART_COLORS = ['#0F4C45', '#F4A62A', '#2B7A78'];

const Task1SvgChart: React.FC<{ data: Task1ChartData }> = ({ data }) => {
  const allValues = data.series.flatMap((s) => s.values.map((v) => Number(v) || 0));
  const rawMax = Math.max(...allValues, 10);
  const maxVal = Math.ceil((rawMax * 1.15) / 10) * 10;

  const svgWidth = 560;
  const svgHeight = 250;
  const padLeft = 48;
  const padRight = 20;
  const padTop = 24;
  const padBottom = 42;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(maxVal * t));
  const labelCount = Math.max(data.labels.length, 1);

  return (
    <div className="p-4 rounded-2xl bg-[#F7F9F8] dark:bg-[#0B1716] border border-[#D3DDDA] dark:border-[#1E3330] space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs sm:text-sm font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
          {data.title}
        </div>
        <div className="text-[11px] font-mono text-[#566664] dark:text-[#96B0AC]">
          Unit: {data.unit}
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full min-w-[340px] h-auto select-none"
          role="img"
          aria-label={data.title}
        >
          {/* Gridlines & Y-axis labels */}
          {yTicks.map((tick, idx) => {
            const y = padTop + plotH - (tick / maxVal) * plotH;
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke="#D3DDDA"
                  strokeOpacity={0.65}
                  strokeDasharray={idx === 0 ? undefined : '3 3'}
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#566664"
                  fontFamily="monospace"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Bar Chart */}
          {data.chartType === 'bar' &&
            data.labels.map((label, lIdx) => {
              const groupWidth = plotW / labelCount;
              const groupX = padLeft + lIdx * groupWidth;
              const seriesCount = Math.max(data.series.length, 1);
              const barGap = 4;
              const barW = Math.max(
                10,
                Math.min(32, (groupWidth * 0.68 - barGap * (seriesCount - 1)) / seriesCount)
              );
              const totalBarsW = barW * seriesCount + barGap * (seriesCount - 1);
              const startX = groupX + (groupWidth - totalBarsW) / 2;

              return (
                <g key={lIdx}>
                  {data.series.map((series, sIdx) => {
                    const val = Number(series.values[lIdx]) || 0;
                    const barH = Math.max(2, (val / maxVal) * plotH);
                    const x = startX + sIdx * (barW + barGap);
                    const y = padTop + plotH - barH;
                    const fill = CHART_COLORS[sIdx % CHART_COLORS.length];
                    return (
                      <g key={sIdx}>
                        <rect x={x} y={y} width={barW} height={barH} rx={3} fill={fill} />
                        <text
                          x={x + barW / 2}
                          y={y - 4}
                          textAnchor="middle"
                          fontSize="9"
                          fontWeight="600"
                          fill="#0E1F1E"
                        >
                          {val}
                        </text>
                      </g>
                    );
                  })}
                  <text
                    x={groupX + groupWidth / 2}
                    y={svgHeight - 14}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#566664"
                  >
                    {label}
                  </text>
                </g>
              );
            })}

          {/* Line Chart */}
          {data.chartType === 'line' && (
            <>
              {data.labels.map((label, lIdx) => {
                const x =
                  labelCount === 1
                    ? padLeft + plotW / 2
                    : padLeft + (lIdx / (labelCount - 1)) * plotW;
                return (
                  <text
                    key={lIdx}
                    x={x}
                    y={svgHeight - 14}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#566664"
                  >
                    {label}
                  </text>
                );
              })}

              {data.series.map((series, sIdx) => {
                const color = CHART_COLORS[sIdx % CHART_COLORS.length];
                const pts = data.labels.map((_, lIdx) => {
                  const val = Number(series.values[lIdx]) || 0;
                  const x =
                    labelCount === 1
                      ? padLeft + plotW / 2
                      : padLeft + (lIdx / (labelCount - 1)) * plotW;
                  const y = padTop + plotH - (val / maxVal) * plotH;
                  return { x, y, val };
                });
                const polylinePoints = pts.map((p) => `${p.x},${p.y}`).join(' ');

                return (
                  <g key={sIdx}>
                    <polyline
                      fill="none"
                      stroke={color}
                      strokeWidth={2.5}
                      points={polylinePoints}
                    />
                    {pts.map((p, idx) => (
                      <g key={idx}>
                        <circle cx={p.x} cy={p.y} r={4} fill={color} stroke="#FFFFFF" strokeWidth={1.5} />
                        <text
                          x={p.x}
                          y={p.y - 8}
                          textAnchor="middle"
                          fontSize="9"
                          fontWeight="600"
                          fill="#0E1F1E"
                        >
                          {p.val}
                        </text>
                      </g>
                    ))}
                  </g>
                );
              })}
            </>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-[#D3DDDA]/60 dark:border-[#1E3330]">
        {data.series.map((s, idx) => (
          <div key={idx} className="flex items-center gap-1.5 text-xs text-[#0E1F1E] dark:text-[#EEF3F1]">
            <span
              className="w-3 h-3 rounded-xs shrink-0"
              style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
            />
            <span className="font-medium">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const VerifiedDrillPlayer: React.FC<VerifiedDrillPlayerProps> = ({
  drill,
  privateExam,
  onBack,
  onComplete,
  onShowToast
}) => {
  const isPrivate = Boolean(privateExam);
  const activeId = privateExam ? privateExam.id : drill!.id;
  const activeTitle = privateExam ? privateExam.title : drill!.title;
  const activeModule = privateExam ? privateExam.module : drill!.module;
  const activePassage = privateExam ? privateExam.passageOrScript : drill?.passageOrScript || '';
  const activePrompt = privateExam ? privateExam.instructions : drill?.prompt || '';
  const activeQuestions = useMemo(
    () => (privateExam ? privateExam.questions : drill?.questions || []),
    [privateExam, drill]
  );
  const defaultMinutes = privateExam
    ? privateExam.suggestedMinutes
    : activeModule === 'writing'
    ? 25
    : activeModule === 'reading'
    ? 12
    : 8;

  // Timer state
  const [secondsLeft, setSecondsLeft] = useState(defaultMinutes * 60);
  const [timerRunning, setTimerRunning] = useState(true);

  // Interactive CD-IELTS states
  const [highlighterOn, setHighlighterOn] = useState(false);
  const [highlightedIndices, setHighlightedIndices] = useState<Set<number>>(new Set());
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [savedMistakeNums, setSavedMistakeNums] = useState<Set<number>>(new Set());

  // Writing / Speaking free-response + model answer
  const [writtenDraft, setWrittenDraft] = useState('');
  const [showModelAnswer, setShowModelAnswer] = useState(false);
  const [showListeningTranscript, setShowListeningTranscript] = useState(activeModule !== 'listening');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Inline report modal state (only for shared drills)
  const [showReportPanel, setShowReportPanel] = useState(false);
  const [reportIssueType, setReportIssueType] = useState('Ambiguous Answer Key');
  const [reportComment, setReportComment] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [hasReported, setHasReported] = useState(false);

  useEffect(() => {
    setSecondsLeft(defaultMinutes * 60);
    setTimerRunning(true);
    setAnswers({});
    setIsSubmitted(false);
    setHighlightedIndices(new Set());
    setSavedMistakeNums(new Set());
    setWrittenDraft('');
    setShowModelAnswer(false);
    setShowListeningTranscript(activeModule !== 'listening');
    stopSpeech();
    setIsPlayingAudio(false);
  }, [activeId, defaultMinutes, activeModule]);

  useEffect(() => {
    if (!timerRunning || isSubmitted) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning, isSubmitted]);

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  const formattedTime = useMemo(() => {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [secondsLeft]);

  // Split passage into paragraphs and sentences so users can click to highlight sentences
  const passageParagraphs = useMemo(() => {
    if (!activePassage) return [];
    let sentenceCounter = 0;
    return activePassage
      .split(/\n{2,}|\n(?=(?:Paragraph\s+[A-Z]|Section\s+\d|[A-Z][a-z]+:))/g)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((para) => {
        const sentences = para.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [para];
        return sentences.map((text) => ({
          idx: sentenceCounter++,
          text: text.trim()
        }));
      });
  }, [activePassage]);

  // Collect verified evidence quotes after grading to highlight in passage
  const activeEvidenceQuotes = useMemo(() => {
    if (!isSubmitted) return [];
    return activeQuestions
      .map((q) => q.evidenceQuote?.trim().toLowerCase())
      .filter((q): q is string => Boolean(q && q.length >= 12));
  }, [isSubmitted, activeQuestions]);

  const toggleHighlightSentence = (idx: number) => {
    if (!highlighterOn) return;
    setHighlightedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleToggleAudio = (textToSpeak: string) => {
    if (isPlayingAudio) {
      stopSpeech();
      setIsPlayingAudio(false);
      return;
    }
    if (!textToSpeak.trim()) return;
    setIsPlayingAudio(true);
    speakBritish(textToSpeak, {
      onEnd: () => setIsPlayingAudio(false),
      onError: () => setIsPlayingAudio(false)
    });
  };

  const results = useMemo(() => {
    if (!isSubmitted) return null;
    const total = activeQuestions.length;
    if (total === 0) return { correct: 0, total: 0, percent: 100 };
    let correct = 0;
    for (const q of activeQuestions) {
      if (isAnswerMatch(answers[q.number] || '', q)) {
        correct += 1;
      }
    }
    return {
      correct,
      total,
      percent: Math.round((correct / total) * 100)
    };
  }, [isSubmitted, activeQuestions, answers]);

  const handleCheckAnswers = () => {
    setIsSubmitted(true);
    setTimerRunning(false);
    setShowListeningTranscript(true);
    const total = activeQuestions.length;
    let correct = 0;
    for (const q of activeQuestions) {
      if (isAnswerMatch(answers[q.number] || '', q)) correct += 1;
    }
    const percent = total > 0 ? Math.round((correct / total) * 100) : 100;
    soundManager.playSuccess();
    if (onComplete) {
      onComplete(activeId, percent);
    }
    onShowToast(
      total > 0
        ? `Graded: ${correct}/${total} correct (${percent}%). Verbatim evidence highlighted.`
        : 'Practice session marked complete!'
    );
  };

  const handleResetDrill = () => {
    setAnswers({});
    setIsSubmitted(false);
    setSecondsLeft(defaultMinutes * 60);
    setTimerRunning(true);
    setSavedMistakeNums(new Set());
  };

  const handleSaveToMistakeVault = (q: VerifiedSubQuestion) => {
    const userAns = answers[q.number]?.trim() || '(Unanswered)';
    addMistake({
      module: activeModule,
      title: `${activeTitle} · Q${q.number}`,
      prompt: q.prompt,
      questionType: drill?.questionType || q.type.toUpperCase(),
      userAnswer: userAns,
      correctAnswer: q.correctAnswer,
      explanation: q.explanationEn,
      trapExplanationEn: q.explanationEn,
      trapExplanationBn: q.explanationBn,
      sourceContext: q.evidenceQuote
    });
    setSavedMistakeNums((prev) => new Set(prev).add(q.number));
    soundManager.playSuccess();
    onShowToast(`Question ${q.number} saved to your Mistake Vault.`);
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drill || isSubmittingReport) return;
    setIsSubmittingReport(true);
    try {
      const res = await reportVerifiedQuestionIssue({
        questionId: drill.id,
        module: drill.module,
        title: drill.title,
        issueType: reportIssueType,
        comment: reportComment.trim() || undefined,
        currentReportCount: drill.reportCount,
        isCloudSynced: drill._isCloudSynced
      });
      setHasReported(true);
      setShowReportPanel(false);
      setReportComment('');
      onShowToast(res.message);
    } catch (err: any) {
      onShowToast(err?.message || 'Could not submit issue report.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const draftWordCount = writtenDraft.trim() ? writtenDraft.trim().split(/\s+/).length : 0;

  return (
    <div className="w-full space-y-4 animate-fade-in pb-16">
      {/* Sticky Computer-Delivered IELTS Top Bar */}
      <div className="sticky top-2 z-20 bg-white/95 dark:bg-[#11201E]/95 backdrop-blur-sm border border-[#D3DDDA] dark:border-[#1E3330] rounded-2xl px-4 py-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              stopSpeech();
              onBack();
            }}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1716] border border-[#D3DDDA] dark:border-[#1E3330] hover:border-[#0F4C45] text-[#0E1F1E] dark:text-[#EEF3F1] text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit Room</span>
          </button>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
              {isPrivate ? (
                <span className="inline-flex items-center gap-1 text-[#0F4C45] dark:text-[#F4A62A] font-bold uppercase">
                  <Lock className="w-3.5 h-3.5" />
                  Private PDF Room · {privateExam?.pageRangeLabel}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[#0F4C45] dark:text-[#7CD4C4] font-bold uppercase">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Blind-Verified {drill?.qualityScore}/100
                </span>
              )}
              <span className="text-[#566664] dark:text-[#96B0AC]">·</span>
              <span className="text-[#566664] dark:text-[#96B0AC] uppercase">{activeModule}</span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-[#0E1F1E] dark:text-[#EEF3F1] truncate">
              {activeTitle}
            </h2>
          </div>
        </div>

        {/* CD-IELTS Exam Tools: Highlighter, Timer, Report */}
        <div className="flex flex-wrap items-center gap-2">
          {activePassage && (
            <button
              type="button"
              onClick={() => setHighlighterOn((v) => !v)}
              className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 cursor-pointer transition ${
                highlighterOn
                  ? 'bg-[#F4A62A]/20 border-[#F4A62A] text-[#0E1F1E] dark:text-[#FEF3C7]'
                  : 'bg-[#F7F9F8] dark:bg-[#0B1716] border-[#D3DDDA] dark:border-[#1E3330] text-[#566664] dark:text-[#96B0AC] hover:border-[#0F4C45]'
              }`}
              title="Click any sentence in the passage to highlight it"
            >
              <Highlighter className="w-4 h-4" />
              <span className="hidden sm:inline">{highlighterOn ? 'Highlighter On' : 'Highlight'}</span>
            </button>
          )}

          <div className="min-h-[44px] px-3 py-2 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1716] border border-[#D3DDDA] dark:border-[#1E3330] flex items-center gap-2">
            <Clock className={`w-4 h-4 ${secondsLeft < 60 ? 'text-rose-600' : 'text-[#0F4C45] dark:text-[#F4A62A]'}`} />
            <span className="font-mono text-xs sm:text-sm font-bold text-[#0E1F1E] dark:text-[#EEF3F1] tabular-nums">
              {formattedTime}
            </span>
            <button
              type="button"
              onClick={() => setTimerRunning((r) => !r)}
              className="p-1 text-[#566664] hover:text-[#0F4C45] dark:text-[#96B0AC] cursor-pointer"
              aria-label={timerRunning ? 'Pause timer' : 'Resume timer'}
            >
              {timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
          </div>

          {!isPrivate && drill && (
            <button
              type="button"
              onClick={() => setShowReportPanel((v) => !v)}
              disabled={hasReported}
              className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 cursor-pointer transition ${
                hasReported
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-white dark:bg-[#11201E] border-[#D3DDDA] dark:border-[#1E3330] text-[#566664] dark:text-[#96B0AC] hover:border-rose-400 hover:text-rose-600'
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{hasReported ? 'Flagged' : 'Report Issue'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Inline Report Question Issue Form */}
      {showReportPanel && !isPrivate && drill && (
        <form
          onSubmit={handleReportSubmit}
          className="p-4 rounded-2xl bg-white dark:bg-[#11201E] border border-rose-200 dark:border-rose-900/50 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-[#0E1F1E] dark:text-[#EEF3F1] flex items-center gap-1.5">
              <Flag className="w-4 h-4 text-rose-600" />
              <span>Report Question Quality Issue</span>
            </div>
            <button
              type="button"
              onClick={() => setShowReportPanel(false)}
              className="p-1 text-[#566664] hover:text-[#0E1F1E] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={reportIssueType}
              onChange={(e) => setReportIssueType(e.target.value)}
              className="min-h-[44px] px-3 py-2 rounded-xl border border-[#D3DDDA] dark:border-[#1E3330] bg-[#F7F9F8] dark:bg-[#0B1716] text-xs text-[#0E1F1E] dark:text-[#EEF3F1]"
            >
              <option value="Ambiguous Answer Key">Ambiguous Answer Key</option>
              <option value="Evidence Quote Mismatch">Evidence Quote Mismatch</option>
              <option value="Typo or Formatting Issue">Typo or Formatting Issue</option>
              <option value="Difficulty Calibration">Difficulty Calibration</option>
            </select>
            <input
              type="text"
              value={reportComment}
              onChange={(e) => setReportComment(e.target.value)}
              placeholder="Optional note (e.g., Q3 could also be Not Given)..."
              maxLength={400}
              className="min-h-[44px] px-3 py-2 rounded-xl border border-[#D3DDDA] dark:border-[#1E3330] bg-[#F7F9F8] dark:bg-[#0B1716] text-xs text-[#0E1F1E] dark:text-[#EEF3F1]"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowReportPanel(false)}
              className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[#D3DDDA] text-xs font-semibold text-[#566664] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingReport}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
            >
              {isSubmittingReport ? 'Sending...' : 'Submit Report'}
            </button>
          </div>
        </form>
      )}

      {/* Pass-2 Blind Verification Summary Banner */}
      {!isPrivate && drill?.verificationNotes && (
        <div className="px-4 py-3 rounded-xl bg-[#0F4C45]/5 dark:bg-[#0F4C45]/20 border border-[#0F4C45]/20 flex flex-wrap items-center justify-between gap-2 text-xs text-[#0E1F1E] dark:text-[#EEF3F1]">
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0F4C45] dark:text-[#7CD4C4] shrink-0 mt-0.5" />
            <span>
              <strong className="font-semibold">Examiner Pass-2 Verification:</strong> {drill.verificationNotes}
            </span>
          </div>
          <span className="font-mono text-[11px] text-[#566664] dark:text-[#96B0AC]">
            Target Band {drill.targetBand.toFixed(1)} · {drill.examTrack}
          </span>
        </div>
      )}

      {/* Score Banner after Grading */}
      {isSubmitted && results && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0F4C45] text-white flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#F4A62A] font-bold">
              Drill Graded · Evidence Unlocked
            </div>
            <div className="text-xl sm:text-2xl font-display font-bold">
              {results.total > 0
                ? `${results.correct} / ${results.total} Correct (${results.percent}%)`
                : 'Practice Session Completed'}
            </div>
            <p className="text-xs text-white/80">
              Review the English + বাংলা explanations below and save any missed traps to your Mistake Vault.
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetDrill}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-white text-[#0F4C45] text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-[#F7F9F8] transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry Drill</span>
          </button>
        </div>
      )}

      {/* Split-Screen CD-IELTS Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT PANE: Passage / Listening Audio / Chart / Writing Prompt */}
        <div className="lg:col-span-7 bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1E3330] rounded-2xl p-5 sm:p-6 space-y-5 lg:max-h-[76vh] lg:overflow-y-auto">
          {/* Prompt / Instructions Header */}
          {activePrompt && (
            <div className="p-4 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1716] border border-[#D3DDDA] dark:border-[#1E3330] space-y-1.5">
              <div className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#0F4C45] dark:text-[#F4A62A]">
                {activeModule === 'writing'
                  ? 'Official-Style Writing Prompt'
                  : activeModule === 'speaking'
                  ? 'Examiner Speaking Prompt / Cue Card'
                  : 'Task Instructions'}
              </div>
              <p className="text-xs sm:text-sm text-[#0E1F1E] dark:text-[#EEF3F1] leading-relaxed whitespace-pre-line font-medium">
                {activePrompt}
              </p>
            </div>
          )}

          {/* Optional SVG Chart for Academic Writing Task 1 */}
          {!isPrivate && drill?.chartData && <Task1SvgChart data={drill.chartData} />}

          {/* Listening Audio Deck */}
          {activeModule === 'listening' && activePassage && (
            <div className="p-4 rounded-xl bg-[#0F4C45]/5 dark:bg-[#0B1716] border border-[#0F4C45]/25 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                    British / Commonwealth Listening Audio
                  </div>
                  <div className="text-[11px] text-[#566664] dark:text-[#96B0AC]">
                    Listen carefully for self-corrections and Cambridge distractors before checking the script.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleAudio(activePassage)}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0D3833] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                  >
                    {isPlayingAudio ? (
                      <>
                        <VolumeX className="w-4 h-4 text-[#F4A62A]" />
                        <span>Stop Audio</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4" />
                        <span>Play Audio</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowListeningTranscript((v) => !v)}
                    className="min-h-[44px] px-3 py-2 rounded-xl border border-[#D3DDDA] dark:border-[#1E3330] bg-white dark:bg-[#11201E] text-xs font-semibold text-[#0E1F1E] dark:text-[#EEF3F1] flex items-center gap-1.5 cursor-pointer"
                  >
                    {showListeningTranscript ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span>{showListeningTranscript ? 'Hide Script' : 'Show Script'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Passage / Script Viewer with Click-to-Highlight & Auto Evidence Match */}
          {activePassage && (activeModule !== 'listening' || showListeningTranscript) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#566664] dark:text-[#96B0AC] border-b border-[#D3DDDA] dark:border-[#1E3330] pb-2">
                <span className="uppercase font-bold">
                  {activeModule === 'listening'
                    ? 'Audio Transcript'
                    : activeModule === 'speaking'
                    ? 'Examiner Strategy & Fluency Notes'
                    : 'Reading Passage'}
                </span>
                {highlighterOn && (
                  <span className="text-[#B45309] dark:text-[#F4A62A] font-semibold">
                    Click any sentence to highlight
                  </span>
                )}
              </div>

              <div className="space-y-4 text-sm sm:text-[15px] leading-7 text-[#0E1F1E] dark:text-[#EEF3F1] font-serif">
                {passageParagraphs.map((sentences, pIdx) => (
                  <p key={pIdx}>
                    {sentences.map((s) => {
                      const isUserHighlighted = highlightedIndices.has(s.idx);
                      const lowerSentence = s.text.toLowerCase();
                      const isEvidenceMatch =
                        isSubmitted &&
                        activeEvidenceQuotes.some(
                          (q) =>
                            lowerSentence.includes(q.slice(0, 32)) ||
                            q.includes(lowerSentence.slice(0, 32))
                        );

                      return (
                        <span
                          key={s.idx}
                          onClick={() => toggleHighlightSentence(s.idx)}
                          className={`transition rounded px-0.5 ${
                            highlighterOn ? 'cursor-pointer hover:bg-[#F4A62A]/20' : ''
                          } ${
                            isEvidenceMatch
                              ? 'bg-emerald-200/75 dark:bg-emerald-800/60 font-medium'
                              : isUserHighlighted
                              ? 'bg-[#F4A62A]/35 dark:bg-[#F4A62A]/25'
                              : ''
                          }`}
                        >
                          {s.text}{' '}
                        </span>
                      );
                    })}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Writing / Speaking Practice Box + Model Answer */}
          {(activeModule === 'writing' || activeModule === 'speaking') && (
            <div className="space-y-4 pt-2 border-t border-[#D3DDDA] dark:border-[#1E3330]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                  {activeModule === 'writing' ? 'Your Timed Response' : 'Speaking Notes / Draft Outline'}
                </span>
                <span className="text-xs font-mono text-[#566664] dark:text-[#96B0AC]">
                  {draftWordCount} words
                </span>
              </div>
              <textarea
                value={writtenDraft}
                onChange={(e) => setWrittenDraft(e.target.value)}
                rows={7}
                placeholder={
                  activeModule === 'writing'
                    ? 'Draft your overview and body paragraphs here under exam timing...'
                    : 'Jot down 1-minute Part 2 cue card bullet keywords here...'
                }
                className="w-full p-3.5 rounded-xl border border-[#D3DDDA] dark:border-[#1E3330] bg-[#F7F9F8] dark:bg-[#0B1716] text-xs sm:text-sm text-[#0E1F1E] dark:text-[#EEF3F1] focus:outline-none focus:border-[#0F4C45]"
              />

              {!isPrivate && drill?.modelAnswer && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowModelAnswer((v) => !v)}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0D3833] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                    >
                      <Award className="w-4 h-4 text-[#F4A62A]" />
                      <span>{showModelAnswer ? 'Hide Band 8.5+ Model' : 'Reveal Band 8.5+ Model Answer'}</span>
                    </button>

                    {showModelAnswer && (
                      <button
                        type="button"
                        onClick={() => handleToggleAudio(drill.modelAnswer || '')}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#D3DDDA] dark:border-[#1E3330] bg-[#F7F9F8] dark:bg-[#0B1716] text-xs font-semibold text-[#0E1F1E] dark:text-[#EEF3F1] flex items-center gap-1.5 cursor-pointer"
                      >
                        {isPlayingAudio ? <VolumeX className="w-4 h-4 text-[#F4A62A]" /> : <Volume2 className="w-4 h-4" />}
                        <span>{isPlayingAudio ? 'Stop Audio' : 'Listen (UK Voice)'}</span>
                      </button>
                    )}
                  </div>

                  {showModelAnswer && (
                    <div className="p-4 rounded-xl bg-[#0E1F1E] text-[#EEF3F1] space-y-3 border border-[#1F8A70]/35">
                      <div className="text-[11px] font-mono uppercase font-bold text-[#F4A62A]">
                        Band 8.5–9.0 Exemplar Response
                      </div>
                      <div className="text-xs sm:text-sm leading-relaxed font-serif whitespace-pre-line">
                        {drill.modelAnswer}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Key Collocations / Vocabulary Box */}
          {!isPrivate && drill?.keyVocab && drill.keyVocab.length > 0 && (
            <div className="pt-3 border-t border-[#D3DDDA] dark:border-[#1E3330] space-y-2">
              <div className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#566664] dark:text-[#96B0AC]">
                High-Yield Band 8+ Vocabulary (EN + বাংলা)
              </div>
              <ul className="space-y-1.5 text-xs text-[#0E1F1E] dark:text-[#EEF3F1]">
                {drill.keyVocab.map((item, i) => (
                  <li key={i} className="p-2 rounded-lg bg-[#F7F9F8] dark:bg-[#0B1716] border border-[#D3DDDA]/60 dark:border-[#1E3330]">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* RIGHT PANE: Interactive Questions + Grading & Evidence */}
        <div className="lg:col-span-5 bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1E3330] rounded-2xl p-5 sm:p-6 space-y-5 lg:max-h-[76vh] lg:overflow-y-auto">
          <div className="flex items-center justify-between border-b border-[#D3DDDA] dark:border-[#1E3330] pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                {activeModule === 'writing' || activeModule === 'speaking'
                  ? 'Examiner Strategy Check'
                  : `Interactive Questions (${activeQuestions.length})`}
              </h3>
              <p className="text-[11px] text-[#566664] dark:text-[#96B0AC]">
                {Object.values(answers).filter((v) => v.trim()).length} of {activeQuestions.length} answered
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {activeQuestions.map((q) => {
              const userVal = answers[q.number] || '';
              const correct = isSubmitted ? isAnswerMatch(userVal, q) : null;
              const isSavedMistake = savedMistakeNums.has(q.number);

              const choiceList =
                q.type === 'tfng'
                  ? ['TRUE', 'FALSE', 'NOT GIVEN']
                  : q.type === 'ynng'
                  ? ['YES', 'NO', 'NOT GIVEN']
                  : q.options && q.options.length > 0
                  ? q.options
                  : [];

              return (
                <div
                  key={q.number}
                  className={`p-4 rounded-xl border space-y-3 transition ${
                    isSubmitted
                      ? correct
                        ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20'
                        : 'border-rose-300 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20'
                      : 'border-[#D3DDDA] dark:border-[#1E3330] bg-[#F7F9F8]/60 dark:bg-[#0B1716]/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs sm:text-sm font-semibold text-[#0E1F1E] dark:text-[#EEF3F1] leading-snug">
                      <span className="font-mono text-[#0F4C45] dark:text-[#F4A62A] mr-1.5">
                        Q{q.number}.
                      </span>
                      {q.prompt}
                    </div>
                    {isSubmitted &&
                      (correct ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      ))}
                  </div>

                  {/* Choice Buttons OR Text Input */}
                  {choiceList.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {choiceList.map((opt) => {
                        const selected = userVal === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            disabled={isSubmitted}
                            onClick={() => {
                              setAnswers((prev) => ({ ...prev, [q.number]: opt }));
                              soundManager.playBeep(660, 0.03);
                            }}
                            className={`min-h-[44px] text-left px-3.5 py-2.5 rounded-xl border text-xs font-medium transition cursor-pointer disabled:cursor-default ${
                              selected
                                ? 'bg-[#0F4C45] text-white border-[#0F4C45] font-semibold'
                                : 'bg-white dark:bg-[#11201E] text-[#0E1F1E] dark:text-[#EEF3F1] border-[#D3DDDA] dark:border-[#1E3330] hover:border-[#0F4C45]'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      type="text"
                      disabled={isSubmitted}
                      value={userVal}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.number]: e.target.value }))}
                      placeholder="Type your exact answer..."
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#D3DDDA] dark:border-[#1E3330] bg-white dark:bg-[#11201E] text-xs sm:text-sm text-[#0E1F1E] dark:text-[#EEF3F1] focus:outline-none focus:border-[#0F4C45]"
                    />
                  )}

                  {/* Post-Grading Evidence + Bilingual Trap Explanation */}
                  {isSubmitted && (
                    <div className="pt-2.5 border-t border-[#D3DDDA]/70 dark:border-[#1E3330] space-y-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-mono text-[#566664] dark:text-[#96B0AC]">Verified Answer: </span>
                          <strong className="text-[#0F4C45] dark:text-[#7CD4C4]">{q.correctAnswer}</strong>
                        </div>
                        {!correct && (
                          <button
                            type="button"
                            disabled={isSavedMistake}
                            onClick={() => handleSaveToMistakeVault(q)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition ${
                              isSavedMistake
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : 'bg-white dark:bg-[#11201E] border border-[#0F4C45] text-[#0F4C45] dark:text-[#7CD4C4] hover:bg-[#0F4C45] hover:text-white'
                            }`}
                          >
                            {isSavedMistake ? <Check className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                            <span>{isSavedMistake ? 'Saved to Vault' : 'Save to Mistake Vault'}</span>
                          </button>
                        )}
                      </div>

                      {q.evidenceQuote && (
                        <div className="p-2.5 rounded-lg bg-white dark:bg-[#11201E] border-l-2 border-[#0F4C45] text-[#0E1F1E] dark:text-[#EEF3F1] italic">
                          "{q.evidenceQuote}"
                        </div>
                      )}

                      <p className="text-[#0E1F1E] dark:text-[#EEF3F1] leading-relaxed">
                        <strong className="font-semibold">Why:</strong> {q.explanationEn}
                      </p>

                      {q.explanationBn && (
                        <p className="text-[#0F4C45] dark:text-[#7CD4C4] leading-relaxed bg-[#0F4C45]/5 dark:bg-[#0F4C45]/20 p-2 rounded-lg">
                          <strong>বাংলা ব্যাখ্যা:</strong> {q.explanationBn}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!isSubmitted && (
            <button
              type="button"
              onClick={handleCheckAnswers}
              className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#0F4C45] hover:bg-[#0D3833] text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Check Answers &amp; Reveal Evidence</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
