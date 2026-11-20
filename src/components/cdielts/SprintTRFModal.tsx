import React, { useRef } from 'react';
import {
  Award,
  Printer,
  Download,
  X,
  CheckCircle2,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  ExternalLink,
  HelpCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { roundIELTSBand } from '../../utils/cdieltsEvaluationEngine';
import { calculateFourSkillOverallBand } from '../../utils/ieltsBandConversion';

export interface TRFScoreData {
  candidateName: string;
  candidateId?: string;
  testTitle?: string;
  testDate?: string;
  centerNumber?: string;
  testType?: 'Academic' | 'General Training';
  examType?: 'full_mock' | 'listening_only' | 'partial_lrw' | 'reading_only' | 'writing_only' | 'speaking_only';
  isFullMock?: boolean;
  completedSkills?: {
    listening?: boolean;
    reading?: boolean;
    writing?: boolean;
    speaking?: boolean;
  };
  listeningBand?: number | null;
  readingBand?: number | null;
  writingBand?: number | null;
  speakingBand?: number | null;
  overallBand?: number | null;
  cefrLevel?: string;
  isOSR?: boolean;
  retakenModule?: 'listening' | 'reading' | 'writing' | 'speaking';
  originalOverallBand?: number;
}

interface SprintTRFModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: TRFScoreData;
  onLaunchOSR?: (module: 'listening' | 'reading' | 'writing' | 'speaking') => void;
}

export const SprintTRFModal: React.FC<SprintTRFModalProps> = ({
  isOpen,
  onClose,
  data,
  onLaunchOSR
}) => {
  const printRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  const candidateName = data.candidateName || 'CANDIDATE STUDENT';
  const candidateId = data.candidateId || '482910';
  const centerNumber = data.centerNumber || 'BD001';
  const testDate = data.testDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  const practiceRefNumber = `24${centerNumber}${candidateId.slice(-6)}ISPA`;

  // 1. Determine skill administration/completion strictly from metadata, NOT from "band > 0"
  const isListeningCompleted = data.completedSkills
    ? Boolean(data.completedSkills.listening)
    : data.examType
      ? (data.examType === 'full_mock' || data.examType === 'partial_lrw' || data.examType === 'listening_only')
      : Boolean(data.isFullMock || (data.listeningBand !== undefined && data.listeningBand !== null));

  const isReadingCompleted = data.completedSkills
    ? Boolean(data.completedSkills.reading)
    : data.examType
      ? (data.examType === 'full_mock' || data.examType === 'partial_lrw' || data.examType === 'reading_only')
      : Boolean(data.isFullMock || (data.readingBand !== undefined && data.readingBand !== null));

  const isWritingCompleted = data.completedSkills
    ? Boolean(data.completedSkills.writing)
    : data.examType
      ? (data.examType === 'full_mock' || data.examType === 'partial_lrw' || data.examType === 'writing_only')
      : Boolean(data.isFullMock || (data.writingBand !== undefined && data.writingBand !== null));

  const isSpeakingCompleted = data.completedSkills
    ? Boolean(data.completedSkills.speaking)
    : data.examType
      ? (data.examType === 'full_mock' || data.examType === 'speaking_only')
      : Boolean(data.isFullMock);

  const omittedSkills: string[] = [];
  if (!isListeningCompleted) omittedSkills.push('Listening');
  if (!isReadingCompleted) omittedSkills.push('Reading');
  if (!isWritingCompleted) omittedSkills.push('Writing');
  if (!isSpeakingCompleted) omittedSkills.push('Speaking');

  const isCompleteFourSkillAssessment =
    isListeningCompleted &&
    isReadingCompleted &&
    isWritingCompleted &&
    isSpeakingCompleted &&
    data.examType !== 'partial_lrw';

  // 2. Evaluated band values (must be valid evaluated numbers >= 1.0; 0 is unattempted, null is unavailable)
  const lBand = typeof data.listeningBand === 'number' && data.listeningBand >= 1.0 ? data.listeningBand : null;
  const rBand = typeof data.readingBand === 'number' && data.readingBand >= 1.0 ? data.readingBand : null;
  const wBand = typeof data.writingBand === 'number' && data.writingBand >= 1.0 ? data.writingBand : null;
  const sBand = typeof data.speakingBand === 'number' && data.speakingBand >= 1.0 ? data.speakingBand : null;

  const hasAllFourEvaluatedBands = lBand !== null && rBand !== null && wBand !== null && sBand !== null;

  // 3. Strict Overall Band: Requires genuine full 4-skill assessment AND all 4 evaluated bands
  const overallBand: number | null = isCompleteFourSkillAssessment && hasAllFourEvaluatedBands
    ? (typeof data.overallBand === 'number' && data.overallBand >= 1.0
        ? data.overallBand
        : calculateFourSkillOverallBand({
            listeningBand: lBand,
            readingBand: rBand,
            writingBand: wBand,
            speakingBand: sBand,
            examType: data.examType,
            completedSkills: data.completedSkills
          }))
    : null;

  // CEFR Determination
  const getCEFR = (band: number): { level: string; label: string; desc: string } => {
    if (band >= 8.5) return { level: 'C2', label: 'C2 Mastery', desc: 'Can understand with ease virtually everything heard or read. Fully fluent and precise.' };
    if (band >= 7.0) return { level: 'C1', label: 'C1 Effective Operational', desc: 'Can express ideas fluently and spontaneously without much obvious searching for expressions.' };
    if (band >= 5.5) return { level: 'B2', label: 'B2 Vantage', desc: 'Can understand the main ideas of complex text on both concrete and abstract topics.' };
    if (band >= 4.0) return { level: 'B1', label: 'B1 Threshold', desc: 'Can understand the main points of clear standard input on familiar matters.' };
    return { level: 'A2', label: 'A2 Waystage', desc: 'Basic user with limited operational command.' };
  };

  const cefr = overallBand !== null
    ? getCEFR(overallBand)
    : {
        level: 'Incomplete',
        label: 'Partial Assessment',
        desc: isCompleteFourSkillAssessment
          ? 'All four skills were administered, but one or more modules are awaiting evaluation. A complete four-skill evaluation is required for an Overall Band.'
          : `This examination is a partial assessment (${omittedSkills.join(', ')} omitted). An IELTS Overall Band requires all four skills.`
      };

  // Identify lowest module for One Skill Retake recommendation among completed & evaluated modules
  const completedAndEvaluatedModules = [
    { mod: 'writing' as const, name: 'Writing', completed: isWritingCompleted, band: wBand },
    { mod: 'speaking' as const, name: 'Speaking', completed: isSpeakingCompleted, band: sBand },
    { mod: 'listening' as const, name: 'Listening', completed: isListeningCompleted, band: lBand },
    { mod: 'reading' as const, name: 'Reading', completed: isReadingCompleted, band: rBand }
  ].filter((m): m is { mod: 'writing' | 'speaking' | 'listening' | 'reading'; name: string; completed: boolean; band: number } =>
    m.completed && m.band !== null
  );
  completedAndEvaluatedModules.sort((a, b) => a.band - b.band);
  const lowestModule = completedAndEvaluatedModules.length > 0 ? completedAndEvaluatedModules[0] : null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white text-slate-900 w-full max-w-4xl border-4 border-slate-900 shadow-2xl overflow-hidden flex flex-col my-auto print:border-none print:shadow-none print:max-w-none">
        {/* Modal Top Control Bar (Hidden on print) */}
        <div className="bg-[#002F6C] text-white px-4 py-2.5 flex items-center justify-between font-mono text-xs print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-bold tracking-wider uppercase">
              {isCompleteFourSkillAssessment
                ? 'IELTS PRACTICE TEST REPORT FORM · 4-SKILL SIMULATION'
                : 'IELTS PRACTICE ASSESSMENT REPORT · PARTIAL ASSESSMENT'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Print practice Test Report Form or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 text-white cursor-pointer"
              title="Close TRF"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= PRACTICE TEST REPORT FORM (A4 PRINTABLE PAPER) ================= */}
        <div
          ref={printRef}
          className="p-6 sm:p-10 space-y-6 font-serif relative bg-[#FCFDFE] border border-slate-300 print:p-8 print:border-none print:bg-white print:m-0"
        >
          {/* Subtle Watermark Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035] select-none">
            <span className="text-[120px] font-black tracking-widest text-[#002F6C] rotate-[-25deg]">
              IELTS
            </span>
          </div>

          {/* Practice Report Header: Document Title */}
          <div className="border-b-4 border-[#002F6C] pb-4 flex flex-wrap items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-black font-sans tracking-tight text-[#002F6C]">
                  IELTS
                </span>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600 px-2 py-0.5 border border-slate-400 bg-slate-100">
                  Computer-Delivered (CD)
                </span>
              </div>
              <p className="text-[11px] font-sans tracking-wider text-slate-500 uppercase">
                BandSprint · Practice Assessment
              </p>
            </div>

            <div className="text-right">
              <h1 className="text-lg sm:text-xl font-bold font-sans tracking-tight text-slate-900 uppercase">
                Practice Test Report Form
              </h1>
              <div className="text-[11px] font-mono font-bold text-slate-600">
                Practice Reference: <span className="text-slate-900 select-all">{practiceRefNumber}</span>
              </div>
            </div>
          </div>

          {/* Candidate Details & Identification Block */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border-2 border-slate-300 bg-slate-50/50 relative z-10 font-sans text-xs">
            {/* Candidate Photo Box */}
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-400 p-3 bg-white min-h-[140px] text-center">
              <div className="w-20 h-24 bg-slate-200 border border-slate-400 flex flex-col items-center justify-center text-slate-500 font-mono text-[10px]">
                <Award className="w-8 h-8 text-[#002F6C] mb-1" />
                <span>CANDIDATE</span>
                <span>PHOTO</span>
              </div>
              <span className="text-[9px] font-mono text-slate-400 mt-1 uppercase">Practice Exam ID</span>
            </div>

            {/* Candidate Data Columns */}
            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3 leading-tight">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-500">Candidate Name:</span>
                <div className="font-bold text-sm text-slate-900 font-mono uppercase">{candidateName}</div>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-500">Candidate Number:</span>
                <div className="font-bold text-sm text-slate-900 font-mono">{candidateId}</div>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-500">Centre Number:</span>
                <div className="font-mono text-xs text-slate-800">{centerNumber} (Dhaka / Global CD Workstation)</div>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-500">Date of Examination:</span>
                <div className="font-mono text-xs text-slate-800">{testDate}</div>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-500">Scheme of Assessment:</span>
                <div className="font-bold text-xs text-[#002F6C]">{data.testType || 'Academic Module'}</div>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-500">Test Administration:</span>
                <div className="text-xs text-slate-700">Standard Computer-Delivered with AI Assessment</div>
              </div>
            </div>
          </div>

          {/* Scheme of Assessment (Band Score Table) */}
          <div className="space-y-2 relative z-10">
            <h2 className="text-xs font-bold font-sans tracking-wider uppercase text-[#002F6C]">
              Test Results & Performance Band Scores:
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full border-2 border-slate-900 font-sans text-center text-xs">
                <thead>
                  <tr className="bg-[#002F6C] text-white uppercase text-[11px] font-bold">
                    <th className="p-2.5 border-r border-slate-700">Listening</th>
                    <th className="p-2.5 border-r border-slate-700">Reading</th>
                    <th className="p-2.5 border-r border-slate-700">Writing</th>
                    <th className="p-2.5 border-r border-slate-700">Speaking</th>
                    <th className="p-2.5 border-r border-slate-700 bg-[#001F4D]">Overall Band</th>
                    <th className="p-2.5 bg-[#001F4D]">CEFR Level</th>
                  </tr>
                </thead>
                <tbody className="font-mono font-bold text-sm bg-white">
                  <tr className="border-t-2 border-slate-900">
                    <td className="p-3 border-r-2 border-slate-300 tabular-nums">
                      {isListeningCompleted
                        ? (typeof data.listeningBand === 'number' && data.listeningBand >= 1.0
                            ? data.listeningBand.toFixed(1)
                            : data.listeningBand === 0
                              ? '0.0 (Unattempted)'
                              : '— (Band N/A)')
                        : '—'}
                    </td>
                    <td className="p-3 border-r-2 border-slate-300 tabular-nums">
                      {isReadingCompleted
                        ? (typeof data.readingBand === 'number' && data.readingBand >= 1.0
                            ? data.readingBand.toFixed(1)
                            : data.readingBand === 0
                              ? '0.0 (Unattempted)'
                              : '— (Band N/A)')
                        : '—'}
                    </td>
                    <td className="p-3 border-r-2 border-slate-300 tabular-nums">
                      {isWritingCompleted
                        ? (typeof data.writingBand === 'number' && data.writingBand >= 1.0
                            ? data.writingBand.toFixed(1)
                            : data.writingBand === 0
                              ? '0.0 (Unattempted)'
                              : '— (Unevaluated)')
                        : '—'}
                    </td>
                    <td className="p-3 border-r-2 border-slate-300 tabular-nums">
                      {isSpeakingCompleted
                        ? (typeof data.speakingBand === 'number' && data.speakingBand >= 1.0
                            ? data.speakingBand.toFixed(1)
                            : data.speakingBand === 0
                              ? '0.0 (Unattempted)'
                              : '— (Unevaluated)')
                        : '—'}
                    </td>
                    <td className="p-3 border-r-2 border-slate-900 bg-sky-50 text-[#002F6C] text-base font-black tabular-nums">
                      {overallBand !== null ? overallBand.toFixed(1) : '—'}
                    </td>
                    <td className="p-3 bg-sky-50 text-[#002F6C] font-black">
                      {cefr.level}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* CEFR Level Descriptor & Proficiency Summary */}
          <div className="p-3.5 border border-slate-300 bg-white space-y-1 text-xs font-sans relative z-10">
            <div className="flex items-center justify-between font-bold">
              <span className="text-[#002F6C]">
                {overallBand !== null
                  ? `CEFR Equivalent Level: ${cefr.label}`
                  : isCompleteFourSkillAssessment
                    ? 'Assessment Status: Complete · Module Evaluation in Progress'
                    : `Assessment Status: Partial Assessment (${omittedSkills.join(', ')} omitted)`}
              </span>
              <span className="font-mono text-slate-500">
                {overallBand !== null
                  ? `IELTS Band ${overallBand.toFixed(1)} = ${cefr.level}`
                  : 'Overall Band: — (All 4 evaluated skills required)'}
              </span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              {overallBand !== null
                ? `${cefr.desc} Practice simulation calibrated against standard published benchmark descriptors.`
                : isCompleteFourSkillAssessment
                  ? 'All four skills were administered. A completed four-skill evaluation is required for an Overall Band score.'
                  : `An IELTS Test Report Form requires completing all four test modules: Listening, Reading, Writing, and Speaking. ${omittedSkills.join(', ')} was not administered in this practice session.`}
            </p>
          </div>

          {/* Practice Report Signatures & Stamp Block — not an official IELTS Test Report Form */}
          <div className="pt-4 border-t-2 border-slate-300 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans relative z-10 items-end">
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-500">Practice Report Prepared By:</div>
              <div className="font-serif italic text-base text-[#002F6C] border-b border-slate-400 pb-1">
                BandSprint Practice Assessment
              </div>
              <div className="text-[10px] text-slate-500">Automated practice scoring — no examiner signature</div>
            </div>

            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 rounded-full border-4 border-double border-[#002F6C] flex flex-col items-center justify-center p-1 text-[8px] font-mono text-[#002F6C] uppercase font-bold tracking-tighter rotate-[-6deg]">
                <span>BANDSPRINT</span>
                <span>★ PRACTICE REPORT ★</span>
                <span>NOT AN OFFICIAL</span>
                <span className="text-[7px]">IELTS TRF</span>
              </div>
            </div>

            <div className="space-y-1 text-right sm:text-right">
              <div className="text-[10px] uppercase font-bold text-slate-500">Practice Reference Code:</div>
              <div className="font-mono text-xs font-bold text-slate-800">
                AUTH-{candidateId}-{testDate.replace(/\s+/g, '')}
              </div>
              <div className="text-[10px] text-emerald-700 font-bold flex items-center justify-end gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Practice result — not an official IELTS result</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= WEAKEST-MODULE PRACTICE RETAKE BANNER (Screen-Only) ================= */}
        {onLaunchOSR && lowestModule && overallBand !== null && (
          <div className="bg-amber-50 border-t-2 border-amber-300 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs print:hidden">
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-2 text-amber-900 font-bold uppercase">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Retake your weakest module</span>
              </div>
              <p className="text-slate-700 font-sans text-xs leading-relaxed">
                Want to raise your score? You can practise a single module again right now. Your lowest scoring module is <strong>{lowestModule.name} (Band {lowestModule.band.toFixed(1)})</strong>. Retaking it can boost your Overall Band to <strong>{roundIELTSBand(((lBand ?? 0) + (rBand ?? 0) + (lowestModule.mod === 'writing' ? Math.min(9, (wBand ?? 0) + 1.0) : (wBand ?? 0)) + (lowestModule.mod === 'speaking' ? Math.min(9, (sBand ?? 0) + 1.0) : (sBand ?? 0))) / 4).toFixed(1)}</strong>.
              </p>
            </div>

            <button
              onClick={() => {
                onClose();
                onLaunchOSR(lowestModule.mod);
              }}
              className="px-5 py-3 bg-[#002F6C] hover:bg-[#001F4D] text-white font-mono font-bold text-xs uppercase tracking-wider border-2 border-[#001F4D] flex items-center gap-2 cursor-pointer shadow-md shrink-0 active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>RETAKE {lowestModule.name.toUpperCase()} (PRACTICE)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
