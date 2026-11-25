import React, { useEffect, useMemo, useRef } from 'react';
import { Flag } from 'lucide-react';
import type { QuestionItem } from '../../data/mockExams';
import type { ColorScheme, ZoomLevel } from './CDIELTSExamMode';

interface CDIELTSReadingSheetProps {
  readingPart: 1 | 2 | 3;
  allReadingQuestions: QuestionItem[];
  examFormat?: 'Academic' | 'General Training';
  userAnswers: Record<number, string>;
  flaggedQuestions: Set<number>;
  activeQuestionId: number;
  colorScheme: ColorScheme;
  zoomLevel: ZoomLevel;
  onAnswerChange: (questionId: number, value: string) => void;
  onToggleFlag: (questionId: number) => void;
  onFocusQuestion: (questionId: number, globalIndex: number) => void;
  renderHighlightedText: (text: string) => React.ReactNode;
  scrollTrigger?: { questionId: number; nonce: number } | null;
}

type ReadingTaskGroupKind =
  | 'tfng'
  | 'ynng'
  | 'headings'
  | 'matching'
  | 'mcq'
  | 'short_answer'
  | 'completion';

interface ReadingQuestionEntry {
  question: QuestionItem;
  displayNum: number;
  globalIdx: number;
}

interface ReadingTaskGroup {
  kind: ReadingTaskGroupKind;
  startNum: number;
  endNum: number;
  heading: string;
  instruction: string;
  legendLines?: { label: string; desc: string }[];
  wordLimitNote?: string;
  items: ReadingQuestionEntry[];
}

function classifyReadingQuestionKind(q: QuestionItem): ReadingTaskGroupKind {
  const t = (q.type || '').toLowerCase();
  const hasOptions = Array.isArray(q.options) && q.options.length > 0;

  if (t.includes('true / false') || t.includes('true/false')) {
    return 'tfng';
  }
  if (t.includes('yes / no') || t.includes('yes/no')) {
    return 'ynng';
  }
  if (t.includes('heading') && hasOptions) {
    return 'headings';
  }
  if (hasOptions && (t.includes('matching') || t.includes('main idea'))) {
    return 'matching';
  }
  if (hasOptions) {
    return 'mcq';
  }
  if (t.includes('short answer')) {
    return 'short_answer';
  }
  return 'completion';
}

function stripLeadingQuestionNumber(prompt: string): string {
  return (prompt || '').replace(/^\s*\d+\s*[\.\)\-:]\s*/, '').trim();
}

function parseReadingOption(opt: string): { badge: string; text: string; isTfng: boolean } {
  const trimmed = (opt || '').trim();
  const tfngUpper = trimmed.toUpperCase();
  if (
    tfngUpper === 'TRUE' ||
    tfngUpper === 'FALSE' ||
    tfngUpper === 'YES' ||
    tfngUpper === 'NO' ||
    tfngUpper === 'NOT GIVEN'
  ) {
    return { badge: tfngUpper, text: tfngUpper, isTfng: true };
  }

  // Matches standard letters (A) ...) or Roman numerals (i) ..., ii) ..., iv) ...)
  const prefixMatch = trimmed.match(/^([A-Za-z]+|[ivxlcdmIVXLCDM]+)[\)\.\:\-]\s*(.+)$/);
  if (prefixMatch) {
    return {
      badge: prefixMatch[1],
      text: prefixMatch[2].trim(),
      isTfng: false
    };
  }

  return { badge: '', text: trimmed, isTfng: false };
}

function getReadingGroupMeta(
  kind: ReadingTaskGroupKind,
  startNum: number,
  endNum: number,
  isGT: boolean
): Omit<ReadingTaskGroup, 'kind' | 'startNum' | 'endNum' | 'items'> {
  const range = startNum === endNum ? `Question ${startNum}` : `Questions ${startNum}–${endNum}`;
  const passageWord = isGT ? 'text' : 'reading passage';

  switch (kind) {
    case 'tfng':
      return {
        heading: range,
        instruction: `Do the following statements agree with the information given in the ${passageWord}?`,
        legendLines: [
          { label: 'TRUE', desc: 'if the statement agrees with the information' },
          { label: 'FALSE', desc: 'if the statement contradicts the information' },
          { label: 'NOT GIVEN', desc: 'if there is no information on this' }
        ]
      };
    case 'ynng':
      return {
        heading: range,
        instruction: 'Do the following statements agree with the claims of the writer?',
        legendLines: [
          { label: 'YES', desc: 'if the statement agrees with the claims of the writer' },
          { label: 'NO', desc: 'if the statement contradicts the claims of the writer' },
          { label: 'NOT GIVEN', desc: 'if it is impossible to say what the writer thinks about this' }
        ]
      };
    case 'headings':
      return {
        heading: range,
        instruction: 'Choose the correct heading for each paragraph from the list of headings below.'
      };
    case 'matching':
      return {
        heading: range,
        instruction: 'Choose the correct letter, A, B or C, for each item below.'
      };
    case 'mcq':
      return {
        heading: range,
        instruction: 'Choose the correct letter, A, B or C.'
      };
    case 'short_answer':
      return {
        heading: range,
        instruction: 'Answer the questions below.',
        wordLimitNote: `Choose NO MORE THAN THREE WORDS AND/OR A NUMBER from the ${passageWord} for each answer.`
      };
    case 'completion':
    default:
      return {
        heading: range,
        instruction: 'Complete the notes and summary below.',
        wordLimitNote: `Choose NO MORE THAN THREE WORDS AND/OR A NUMBER from the ${passageWord} for each answer.`
      };
  }
}

export const CDIELTSReadingSheet: React.FC<CDIELTSReadingSheetProps> = ({
  readingPart,
  allReadingQuestions,
  examFormat = 'Academic',
  userAnswers,
  flaggedQuestions,
  activeQuestionId,
  colorScheme,
  zoomLevel,
  onAnswerChange,
  onToggleFlag,
  onFocusQuestion,
  renderHighlightedText,
  scrollTrigger
}) => {
  const questionRowRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const sheetTopRef = useRef<HTMLDivElement | null>(null);

  const isGT = examFormat === 'General Training';

  // Extract questions belonging to the viewed Part (1–13, 14–26, 27–40) with 1–40 display numbering
  const partEntries = useMemo<ReadingQuestionEntry[]>(() => {
    const entries: ReadingQuestionEntry[] = [];
    allReadingQuestions.forEach((q, globalIdx) => {
      const qPart: 1 | 2 | 3 =
        q.passage === 1 || q.passage === 2 || q.passage === 3
          ? q.passage
          : globalIdx < 13
          ? 1
          : globalIdx < 26
          ? 2
          : 3;

      if (qPart === readingPart) {
        entries.push({
          question: q,
          displayNum: globalIdx + 1,
          globalIdx
        });
      }
    });
    return entries;
  }, [allReadingQuestions, readingPart]);

  // Reset scroll to top of right question sheet when switching Reading Parts
  useEffect(() => {
    sheetTopRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, [readingPart]);

  // Smoothly scroll & focus when candidate clicks bottom square or Prev/Next arrow
  useEffect(() => {
    if (!scrollTrigger) return;
    const rowEl = questionRowRefs.current[scrollTrigger.questionId];
    if (rowEl) {
      rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    const inputEl = inputRefs.current[scrollTrigger.questionId];
    if (inputEl) {
      setTimeout(() => {
        inputEl.focus({ preventScroll: true });
      }, 120);
    }
  }, [scrollTrigger]);

  // Group consecutive questions within this Part by task type
  const taskGroups = useMemo<ReadingTaskGroup[]>(() => {
    const groups: ReadingTaskGroup[] = [];
    partEntries.forEach((entry) => {
      const kind = classifyReadingQuestionKind(entry.question);
      const prev = groups[groups.length - 1];
      if (prev && prev.kind === kind) {
        prev.endNum = entry.displayNum;
        prev.items.push(entry);
        const updated = getReadingGroupMeta(kind, prev.startNum, prev.endNum, isGT);
        prev.heading = updated.heading;
      } else {
        const meta = getReadingGroupMeta(kind, entry.displayNum, entry.displayNum, isGT);
        groups.push({
          kind,
          startNum: entry.displayNum,
          endNum: entry.displayNum,
          heading: meta.heading,
          instruction: meta.instruction,
          legendLines: meta.legendLines,
          wordLimitNote: meta.wordLimitNote,
          items: [entry]
        });
      }
    });
    return groups;
  }, [partEntries, isGT]);

  // Sequential Tab / Shift+Tab across text inputs in this Part
  const textInputIds = useMemo(
    () =>
      partEntries
        .filter((e) => !e.question.options || e.question.options.length === 0)
        .map((e) => e.question.id),
    [partEntries]
  );

  // Official CD-IELTS paper & high-contrast color schemes
  const palette = useMemo(() => {
    switch (colorScheme) {
      case 'black-on-yellow':
        return {
          pageBg: 'bg-[#FFF100]',
          sheetBg: 'bg-[#FFF777] text-black border-black',
          bannerBg: 'bg-[#FFE600] text-black border-black',
          legendBg: 'bg-[#FFEE33] border-black/45',
          groupTitle: 'text-black',
          rowBorder: 'border-black/35',
          rowActive: 'bg-[#FFEE33]',
          input: 'bg-white text-black border-black focus:ring-black',
          optionDefault: 'border-black/45 bg-[#FFF999] hover:bg-[#FFEE33]',
          optionSelected: 'border-black bg-black text-[#FFF100]',
          muted: 'text-black/80',
          wordNote: 'text-black'
        };
      case 'yellow-on-black':
        return {
          pageBg: 'bg-black',
          sheetBg: 'bg-[#0D0D0D] text-[#FFF100] border-[#FFF100]',
          bannerBg: 'bg-[#1A1A1A] text-[#FFF100] border-[#FFF100]',
          legendBg: 'bg-[#141400] border-[#FFF100]/45',
          groupTitle: 'text-[#FFF100]',
          rowBorder: 'border-[#FFF100]/35',
          rowActive: 'bg-[#1F1F00]',
          input: 'bg-[#1A1A1A] text-[#FFF100] border-[#FFF100] focus:ring-[#FFF100]',
          optionDefault: 'border-[#FFF100]/45 bg-[#111111] hover:bg-[#1E1E00]',
          optionSelected: 'border-[#FFF100] bg-[#FFF100] text-black',
          muted: 'text-[#FFF100]/80',
          wordNote: 'text-[#FFF100]'
        };
      case 'white-on-black':
        return {
          pageBg: 'bg-black',
          sheetBg: 'bg-[#111111] text-white border-white',
          bannerBg: 'bg-[#1D1D1D] text-white border-white',
          legendBg: 'bg-[#1A1A1A] border-white/40',
          groupTitle: 'text-white',
          rowBorder: 'border-white/30',
          rowActive: 'bg-[#1F2937]',
          input: 'bg-[#1F1F1F] text-white border-white focus:ring-white',
          optionDefault: 'border-white/40 bg-[#141414] hover:bg-[#242424]',
          optionSelected: 'border-white bg-white text-black',
          muted: 'text-white/75',
          wordNote: 'text-white'
        };
      case 'standard':
      default:
        return {
          pageBg: 'bg-[#EAEEF2]',
          sheetBg: 'bg-white text-[#111827] border-[#CBD5E1]',
          bannerBg: 'bg-[#F1F3F5] text-[#111827] border-[#CBD5E1]',
          legendBg: 'bg-[#F8FAFC] border-[#CBD5E1]',
          groupTitle: 'text-[#111827]',
          rowBorder: 'border-[#E2E8F0]',
          rowActive: 'bg-[#F8FAFC]',
          input:
            'bg-white text-[#111827] border-[#94A3B8] focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/20',
          optionDefault: 'border-[#CBD5E1] bg-white hover:bg-[#F8FAFC]',
          optionSelected: 'border-[#0066CC] bg-[#EBF3FE] text-[#0F172A]',
          muted: 'text-[#475569]',
          wordNote: 'text-[#111827]'
        };
    }
  }, [colorScheme]);

  const textScaleClass =
    zoomLevel === '150%' ? 'text-lg' : zoomLevel === '125%' ? 'text-[17px]' : 'text-[15px]';

  const startQ = partEntries[0]?.displayNum ?? 1;
  const endQ = partEntries[partEntries.length - 1]?.displayNum ?? 13;

  return (
    <div className={`w-full min-h-full ${palette.pageBg} py-4 sm:py-5 px-3 sm:px-5 font-sans ${textScaleClass}`}>
      <div ref={sheetTopRef} />

      <div className={`max-w-[760px] mx-auto border ${palette.sheetBg} shadow-2xs`}>
        {/* Part Questions Header Strip */}
        <div className={`px-5 py-3 border-b ${palette.bannerBg}`}>
          <div className="text-sm sm:text-base font-bold tracking-tight">
            Questions {startQ}–{endQ}
          </div>
        </div>

        {/* Grouped Task Blocks */}
        <div className="p-5 sm:p-6 space-y-8 select-text">
          {taskGroups.map((group, gIdx) => {
            const isTextGroup = group.kind === 'completion' || group.kind === 'short_answer';
            const isTfngGroup = group.kind === 'tfng' || group.kind === 'ynng';

            return (
              <section key={`${group.startNum}-${gIdx}`} className="space-y-4">
                {/* Official Task Block Heading & Instructions */}
                <div className="space-y-1.5">
                  <h3 className={`text-sm sm:text-base font-bold ${palette.groupTitle}`}>
                    {group.heading}
                  </h3>
                  <p className={`text-xs sm:text-sm leading-relaxed ${palette.muted}`}>
                    {group.instruction}
                  </p>
                  {group.wordLimitNote && (
                    <p className={`text-xs sm:text-sm font-bold ${palette.wordNote}`}>
                      {group.wordLimitNote}
                    </p>
                  )}
                  {group.legendLines && (
                    <div className={`mt-2 p-3 border rounded-[3px] text-xs space-y-1 ${palette.legendBg}`}>
                      {group.legendLines.map((line) => (
                        <div key={line.label} className="flex items-baseline gap-3">
                          <span className="font-bold w-24 shrink-0">{line.label}</span>
                          <span className={palette.muted}>{line.desc}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {isTextGroup ? (
                  /* Completion & Short-Answer Rows with Crisp White Input Boxes */
                  <div className={`border ${palette.rowBorder} divide-y ${palette.rowBorder}`}>
                    {group.items.map(({ question, displayNum, globalIdx }) => {
                      const isFlagged = flaggedQuestions.has(question.id);
                      const isFocused = activeQuestionId === question.id;
                      const cleanPrompt = stripLeadingQuestionNumber(question.prompt);
                      const val = userAnswers[question.id] || '';

                      return (
                        <div
                          key={question.id}
                          ref={(el) => {
                            questionRowRefs.current[question.id] = el;
                          }}
                          onClick={() => onFocusQuestion(question.id, globalIdx)}
                          className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                            isFocused ? palette.rowActive : ''
                          }`}
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <span
                              className={`inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 text-xs font-bold border tabular-nums shrink-0 mt-0.5 ${
                                isFocused
                                  ? 'border-[#0066CC] bg-[#0066CC] text-white'
                                  : `${palette.rowBorder} ${palette.muted}`
                              }`}
                            >
                              {displayNum}
                            </span>
                            <label
                              htmlFor={`reading-input-${question.id}`}
                              className="leading-snug cursor-pointer font-normal"
                            >
                              {renderHighlightedText(cleanPrompt)}
                            </label>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 pl-9 sm:pl-0">
                            <input
                              id={`reading-input-${question.id}`}
                              ref={(el) => {
                                inputRefs.current[question.id] = el;
                              }}
                              type="text"
                              value={val}
                              onFocus={() => onFocusQuestion(question.id, globalIdx)}
                              onChange={(e) => onAnswerChange(question.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Tab') {
                                  const pos = textInputIds.indexOf(question.id);
                                  if (pos !== -1) {
                                    const nextPos = e.shiftKey ? pos - 1 : pos + 1;
                                    if (nextPos >= 0 && nextPos < textInputIds.length) {
                                      e.preventDefault();
                                      const nextId = textInputIds[nextPos];
                                      inputRefs.current[nextId]?.focus();
                                    }
                                  }
                                }
                              }}
                              placeholder={`${displayNum}`}
                              aria-label={`Question ${displayNum} answer`}
                              className={`w-full sm:w-[215px] px-3 py-1.5 text-sm font-medium border rounded-[3px] outline-none transition placeholder:text-center placeholder:font-bold placeholder:opacity-55 ${palette.input}`}
                            />

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleFlag(question.id);
                              }}
                              title={
                                isFlagged
                                  ? `Unflag Question ${displayNum}`
                                  : `Flag Question ${displayNum} for review (Alt+R)`
                              }
                              aria-label={`Flag Question ${displayNum} for review`}
                              className={`p-1.5 rounded border cursor-pointer transition shrink-0 ${
                                isFlagged
                                  ? 'border-[#D97706] bg-amber-50 text-[#B45309]'
                                  : `border-transparent hover:border-slate-300 ${palette.muted} opacity-65 hover:opacity-100`
                              }`}
                            >
                              <Flag className={`w-3.5 h-3.5 ${isFlagged ? 'fill-current' : ''}`} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* TFNG / YNNG / Matching Headings / MCQ / Vocabulary Blocks */
                  <div className="space-y-5">
                    {group.items.map(({ question, displayNum, globalIdx }) => {
                      const isFlagged = flaggedQuestions.has(question.id);
                      const isFocused = activeQuestionId === question.id;
                      const cleanPrompt = stripLeadingQuestionNumber(question.prompt);

                      return (
                        <div
                          key={question.id}
                          ref={(el) => {
                            questionRowRefs.current[question.id] = el;
                          }}
                          onClick={() => onFocusQuestion(question.id, globalIdx)}
                          className={`pb-5 border-b last:border-b-0 ${palette.rowBorder} space-y-2.5`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <span
                                className={`inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 text-xs font-bold border tabular-nums shrink-0 mt-0.5 ${
                                  isFocused
                                    ? 'border-[#0066CC] bg-[#0066CC] text-white'
                                    : `${palette.rowBorder} ${palette.muted}`
                                }`}
                              >
                                {displayNum}
                              </span>
                              <div className="font-medium leading-snug">
                                {renderHighlightedText(cleanPrompt)}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleFlag(question.id);
                              }}
                              title={
                                isFlagged
                                  ? `Unflag Question ${displayNum}`
                                  : `Flag Question ${displayNum} for review (Alt+R)`
                              }
                              aria-label={`Flag Question ${displayNum} for review`}
                              className={`p-1.5 rounded border cursor-pointer transition shrink-0 ${
                                isFlagged
                                  ? 'border-[#D97706] bg-amber-50 text-[#B45309]'
                                  : `border-transparent hover:border-slate-300 ${palette.muted} opacity-65 hover:opacity-100`
                              }`}
                            >
                              <Flag className={`w-3.5 h-3.5 ${isFlagged ? 'fill-current' : ''}`} />
                            </button>
                          </div>

                          {question.options && question.options.length > 0 && (
                            <div
                              className={
                                isTfngGroup
                                  ? 'pl-9 grid grid-cols-1 sm:grid-cols-3 gap-2'
                                  : 'pl-9 space-y-1.5'
                              }
                            >
                              {question.options.map((opt) => {
                                const parsed = parseReadingOption(opt);
                                const storedAns = (userAnswers[question.id] || '').trim();
                                const isSelected =
                                  storedAns === opt ||
                                  (parsed.badge.length > 0 &&
                                    storedAns.toLowerCase() === parsed.badge.toLowerCase());

                                return (
                                  <label
                                    key={opt}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onFocusQuestion(question.id, globalIdx);
                                      onAnswerChange(question.id, opt);
                                    }}
                                    className={`flex items-center gap-2.5 px-3 py-2 border rounded-[3px] cursor-pointer transition ${
                                      isSelected ? palette.optionSelected : palette.optionDefault
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`reading_q_${question.id}`}
                                      checked={isSelected}
                                      onChange={() => {}}
                                      className="w-4 h-4 accent-[#0066CC] cursor-pointer shrink-0"
                                    />
                                    {!parsed.isTfng && parsed.badge && (
                                      <span className="font-bold text-xs min-w-[20px] shrink-0">
                                        {parsed.badge}
                                      </span>
                                    )}
                                    <span
                                      className={`text-sm leading-snug ${
                                        parsed.isTfng ? 'font-semibold text-xs tracking-wide' : ''
                                      }`}
                                    >
                                      {parsed.text}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};
