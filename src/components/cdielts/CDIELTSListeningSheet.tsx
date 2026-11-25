import React, { useEffect, useMemo, useRef } from 'react';
import { Flag } from 'lucide-react';
import type { QuestionItem } from '../../data/mockExams';
import type { ColorScheme, ZoomLevel } from './CDIELTSExamMode';
import { CDIELTSSVGMap } from './CDIELTSInteractiveVisuals';

interface CDIELTSListeningSheetProps {
  listeningSection: 1 | 2 | 3 | 4;
  allListeningQuestions: QuestionItem[];
  userAnswers: Record<number, string>;
  flaggedQuestions: Set<number>;
  activeQuestionId: number;
  isLocked: boolean;
  colorScheme: ColorScheme;
  zoomLevel: ZoomLevel;
  onAnswerChange: (questionId: number, value: string) => void;
  onToggleFlag: (questionId: number) => void;
  onFocusQuestion: (questionId: number, globalIndex: number) => void;
  onSwitchPart: (part: 1 | 2 | 3 | 4) => void;
  renderHighlightedText: (text: string) => React.ReactNode;
  scrollTrigger?: { questionId: number; nonce: number } | null;
}

type TaskGroupKind = 'map' | 'mcq' | 'matching' | 'completion';

interface ListeningTaskGroup {
  kind: TaskGroupKind;
  startNum: number;
  endNum: number;
  heading: string;
  instruction: string;
  wordLimitNote?: string;
  items: {
    question: QuestionItem;
    displayNum: number;
    globalIdx: number;
  }[];
}

function classifyQuestionKind(q: QuestionItem): TaskGroupKind {
  const t = (q.type || '').toLowerCase();
  const p = (q.prompt || '').toLowerCase();
  if (t.includes('map') || p.includes('floor plan') || p.includes('map pin')) {
    return 'map';
  }
  if (q.options && q.options.length > 0) {
    if (t.includes('matching') || p.includes('task assignment') || p.includes('assign')) {
      return 'matching';
    }
    return 'mcq';
  }
  return 'completion';
}

function stripLeadingNumber(prompt: string, displayNum: number): string {
  const regex = new RegExp(`^\\s*${displayNum}\\s*[\\.)\\-:]\\s*`);
  return prompt.replace(regex, '').trim();
}

function getGroupInstructions(
  kind: TaskGroupKind,
  startNum: number,
  endNum: number,
  partNum: number
): { heading: string; instruction: string; wordLimitNote?: string } {
  const range = startNum === endNum ? `Question ${startNum}` : `Questions ${startNum}–${endNum}`;
  switch (kind) {
    case 'map':
      return {
        heading: range,
        instruction: 'Label the plan below. Choose the correct letter for each location.'
      };
    case 'matching':
      return {
        heading: range,
        instruction: 'Choose the correct option for each item below.'
      };
    case 'mcq':
      return {
        heading: range,
        instruction: 'Choose the correct letter, A, B or C.'
      };
    case 'completion':
    default:
      return {
        heading: range,
        instruction:
          partNum === 1
            ? 'Complete the form and notes below.'
            : partNum === 4
            ? 'Complete the lecture notes below.'
            : 'Complete the notes below.',
        wordLimitNote: 'Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.'
      };
  }
}

export const CDIELTSListeningSheet: React.FC<CDIELTSListeningSheetProps> = ({
  listeningSection,
  allListeningQuestions,
  userAnswers,
  flaggedQuestions,
  activeQuestionId,
  isLocked,
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

  const partOffset = (listeningSection - 1) * 10;
  const partQuestions = useMemo(
    () => allListeningQuestions.slice(partOffset, partOffset + 10),
    [allListeningQuestions, partOffset]
  );

  // Scroll to top smoothly whenever candidate switches Parts
  useEffect(() => {
    sheetTopRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, [listeningSection]);

  // Scroll and focus when bottom palette square or Prev/Next arrow triggers a jump
  useEffect(() => {
    if (!scrollTrigger) return;
    const rowEl = questionRowRefs.current[scrollTrigger.questionId];
    if (rowEl) {
      rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    const inputEl = inputRefs.current[scrollTrigger.questionId];
    if (inputEl && !isLocked) {
      setTimeout(() => {
        inputEl.focus({ preventScroll: true });
      }, 120);
    }
  }, [scrollTrigger, isLocked]);

  // Group consecutive questions in the active Part into official IELTS task blocks
  const taskGroups = useMemo<ListeningTaskGroup[]>(() => {
    const groups: ListeningTaskGroup[] = [];
    partQuestions.forEach((q, idx) => {
      const displayNum = partOffset + idx + 1;
      const globalIdx = partOffset + idx;
      const kind = classifyQuestionKind(q);

      const prev = groups[groups.length - 1];
      if (prev && prev.kind === kind) {
        prev.endNum = displayNum;
        prev.items.push({ question: q, displayNum, globalIdx });
        const updatedMeta = getGroupInstructions(kind, prev.startNum, prev.endNum, listeningSection);
        prev.heading = updatedMeta.heading;
      } else {
        const meta = getGroupInstructions(kind, displayNum, displayNum, listeningSection);
        groups.push({
          kind,
          startNum: displayNum,
          endNum: displayNum,
          heading: meta.heading,
          instruction: meta.instruction,
          wordLimitNote: meta.wordLimitNote,
          items: [{ question: q, displayNum, globalIdx }]
        });
      }
    });
    return groups;
  }, [partQuestions, partOffset, listeningSection]);

  // Sequential completion input IDs for crisp Tab / Shift+Tab navigation inside the sheet
  const completionQuestionIds = useMemo(
    () =>
      partQuestions
        .filter((q) => !q.options || q.options.length === 0)
        .map((q) => q.id),
    [partQuestions]
  );

  // Theme tokens tailored to official IELTS on Computer contrast modes
  const palette = useMemo(() => {
    switch (colorScheme) {
      case 'black-on-yellow':
        return {
          pageBg: 'bg-[#FFF100]',
          sheetBg: 'bg-[#FFF777] text-black border-black',
          bannerBg: 'bg-[#FFE600] text-black border-black',
          groupTitle: 'text-black',
          rowBorder: 'border-black/40',
          rowActive: 'bg-[#FFEE33]',
          input: 'bg-white text-black border-black focus:ring-black',
          optionDefault: 'border-black/50 bg-[#FFF999] hover:bg-[#FFEE33]',
          optionSelected: 'border-black bg-black text-[#FFF100]',
          muted: 'text-black/80',
          wordNote: 'text-black'
        };
      case 'yellow-on-black':
        return {
          pageBg: 'bg-black',
          sheetBg: 'bg-[#0D0D0D] text-[#FFF100] border-[#FFF100]',
          bannerBg: 'bg-[#1A1A1A] text-[#FFF100] border-[#FFF100]',
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
          groupTitle: 'text-[#111827]',
          rowBorder: 'border-[#E2E8F0]',
          rowActive: 'bg-[#F8FAFC]',
          input: 'bg-white text-[#111827] border-[#94A3B8] focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]/20',
          optionDefault: 'border-[#CBD5E1] bg-white hover:bg-[#F8FAFC]',
          optionSelected: 'border-[#0066CC] bg-[#EBF3FE] text-[#0F172A]',
          muted: 'text-[#475569]',
          wordNote: 'text-[#111827]'
        };
    }
  }, [colorScheme]);

  const textScaleClass =
    zoomLevel === '150%' ? 'text-lg' : zoomLevel === '125%' ? 'text-[17px]' : 'text-[15px]';

  const startQ = partOffset + 1;
  const endQ = Math.min(allListeningQuestions.length, partOffset + partQuestions.length);

  return (
    <div className={`w-full min-h-full ${palette.pageBg} py-4 sm:py-6 px-3 sm:px-6 font-sans ${textScaleClass}`}>
      <div ref={sheetTopRef} />

      {/* Main Official Paper Sheet */}
      <div className={`max-w-[920px] mx-auto border ${palette.sheetBg} shadow-2xs`}>
        {/* Official Inspera Part Banner */}
        <div className={`px-5 sm:px-7 py-3.5 border-b ${palette.bannerBg}`}>
          <h2 className="text-base sm:text-lg font-bold tracking-tight">
            Part {listeningSection}
          </h2>
          <p className={`text-xs sm:text-sm mt-0.5 ${palette.muted}`}>
            Listen and answer questions {startQ}–{endQ}.
          </p>
        </div>

        {/* Grouped IELTS Task Blocks */}
        <div className="p-5 sm:p-7 space-y-8 select-text">
          {taskGroups.map((group, gIdx) => {
            const hasMapVisual = group.kind === 'map';

            return (
              <section key={`${group.startNum}-${gIdx}`} className="space-y-4">
                {/* Official Task Group Header */}
                <div className="space-y-1">
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
                </div>

                {/* Shared Map Diagram for Map Labelling Group */}
                {hasMapVisual && (
                  <div className="my-3">
                    <CDIELTSSVGMap
                      currentAnswer={
                        userAnswers[activeQuestionId] ||
                        userAnswers[group.items[0]?.question.id] ||
                        ''
                      }
                      onSelectPin={(pin) => {
                        const targetId =
                          group.items.find((it) => it.question.id === activeQuestionId)?.question.id ||
                          group.items[0]?.question.id;
                        if (targetId && !isLocked) {
                          onAnswerChange(targetId, pin);
                        }
                      }}
                      disabled={isLocked}
                    />
                  </div>
                )}

                {/* Completion / Short-Answer Table-Style Rows (Authentic Inspera Form Boxes) */}
                {group.kind === 'completion' ? (
                  <div className={`border ${palette.rowBorder} divide-y ${palette.rowBorder}`}>
                    {group.items.map(({ question, displayNum, globalIdx }) => {
                      const isFlagged = flaggedQuestions.has(question.id);
                      const isFocused = activeQuestionId === question.id;
                      const cleanPrompt = stripLeadingNumber(question.prompt, displayNum);
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
                              htmlFor={`listening-input-${question.id}`}
                              className="leading-snug cursor-pointer font-normal"
                            >
                              {renderHighlightedText(cleanPrompt)}
                            </label>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 pl-9 sm:pl-0">
                            <input
                              id={`listening-input-${question.id}`}
                              ref={(el) => {
                                inputRefs.current[question.id] = el;
                              }}
                              type="text"
                              disabled={isLocked}
                              value={val}
                              onFocus={() => onFocusQuestion(question.id, globalIdx)}
                              onChange={(e) => onAnswerChange(question.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Tab') {
                                  const pos = completionQuestionIds.indexOf(question.id);
                                  if (pos !== -1) {
                                    const nextPos = e.shiftKey ? pos - 1 : pos + 1;
                                    if (nextPos >= 0 && nextPos < completionQuestionIds.length) {
                                      e.preventDefault();
                                      const nextId = completionQuestionIds[nextPos];
                                      inputRefs.current[nextId]?.focus();
                                    }
                                  }
                                }
                              }}
                              placeholder={isLocked ? 'Locked' : `${displayNum}`}
                              aria-label={`Question ${displayNum} answer`}
                              className={`w-full sm:w-[230px] px-3 py-1.5 text-sm font-medium border rounded-[3px] outline-none transition placeholder:text-center placeholder:font-bold placeholder:opacity-55 disabled:opacity-60 ${palette.input}`}
                            />

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleFlag(question.id);
                              }}
                              title={isFlagged ? `Unflag Question ${displayNum}` : `Flag Question ${displayNum} for review (Alt+R)`}
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
                  /* Multiple Choice, Matching, and Map Option Blocks */
                  <div className="space-y-6">
                    {group.items.map(({ question, displayNum, globalIdx }) => {
                      const isFlagged = flaggedQuestions.has(question.id);
                      const isFocused = activeQuestionId === question.id;
                      const cleanPrompt = stripLeadingNumber(question.prompt, displayNum);

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
                              title={isFlagged ? `Unflag Question ${displayNum}` : `Flag Question ${displayNum} for review (Alt+R)`}
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
                            <div className="pl-9 space-y-1.5">
                              {question.options.map((opt) => {
                                const optionLetter = opt.split(/[).]/)[0]?.trim() || opt;
                                const isSelected =
                                  userAnswers[question.id] === opt ||
                                  userAnswers[question.id] === optionLetter;
                                const optionText = opt.replace(/^[A-Z][).]\s*/, '');

                                return (
                                  <label
                                    key={opt}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onFocusQuestion(question.id, globalIdx);
                                      if (isLocked) return;
                                      onAnswerChange(question.id, optionLetter);
                                    }}
                                    className={`flex items-center gap-3 px-3.5 py-2.5 border rounded-[3px] transition ${
                                      isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                                    } ${isSelected ? palette.optionSelected : palette.optionDefault}`}
                                  >
                                    <input
                                      type="radio"
                                      name={`listening_q_${question.id}`}
                                      disabled={isLocked}
                                      checked={isSelected}
                                      onChange={() => {}}
                                      className="w-4 h-4 accent-[#0066CC] cursor-pointer shrink-0"
                                    />
                                    <span className="font-bold text-xs w-5 shrink-0">
                                      {optionLetter}
                                    </span>
                                    <span className="text-sm leading-snug">{optionText}</span>
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
