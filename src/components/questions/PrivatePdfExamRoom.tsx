import React, { useEffect, useRef, useState } from 'react';
import {
  FileText,
  Lock,
  Play,
  Sparkles,
  Trash2,
  Upload,
  AlertCircle,
  Loader2,
  Clock
} from 'lucide-react';
import {
  PrivatePdfExam,
  VerifiedModule,
  convertPrivatePdfToExam,
  deletePrivatePdfExam,
  extractTextFromPdfFile,
  inspectPdfFile,
  loadPrivatePdfExams,
  savePrivatePdfExam
} from '../../services/verifiedQuestionBankService';
import { VerifiedDrillPlayer } from './VerifiedDrillPlayer';
import { soundManager } from '../../utils/audioEffects';

interface PrivatePdfExamRoomProps {
  onShowToast: (msg: string) => void;
}

export const PrivatePdfExamRoom: React.FC<PrivatePdfExamRoomProps> = ({ onShowToast }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [startPage, setStartPage] = useState<number>(1);
  const [endPage, setEndPage] = useState<number>(3);
  const [moduleHint, setModuleHint] = useState<VerifiedModule | 'auto'>('auto');

  const [isInspecting, setIsInspecting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [statusStep, setStatusStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [savedExams, setSavedExams] = useState<PrivatePdfExam[]>([]);
  const [activeExam, setActiveExam] = useState<PrivatePdfExam | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setSavedExams(loadPrivatePdfExams());
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMsg('Please choose a valid .pdf file.');
      return;
    }

    if (file.size > 45 * 1024 * 1024) {
      setErrorMsg('PDF exceeds 45MB browser memory limit. Please select a single book volume or smaller excerpt.');
      return;
    }

    setIsInspecting(true);
    try {
      const meta = await inspectPdfFile(file);
      setSelectedFile(file);
      setTotalPages(meta.pageCount);
      setStartPage(1);
      setEndPage(Math.min(3, meta.pageCount));
      onShowToast(`Loaded "${meta.fileName}" (${meta.pageCount} pages) locally in your browser.`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not read this PDF file. Ensure it is not password-protected.');
      setSelectedFile(null);
      setTotalPages(0);
    } finally {
      setIsInspecting(false);
    }
  };

  const handleConvertPdf = async () => {
    if (!selectedFile || isConverting) return;
    setErrorMsg(null);
    setIsConverting(true);

    const safeStart = Math.max(1, Math.min(totalPages || 1, startPage));
    const safeEnd = Math.max(safeStart, Math.min(totalPages || safeStart, endPage));
    const cappedEnd = Math.min(safeEnd, safeStart + 7);

    try {
      setStatusStep(`Extracting text from pages ${safeStart}–${cappedEnd} on your device...`);
      const extracted = await extractTextFromPdfFile(selectedFile, safeStart, cappedEnd);

      if (extracted.text.trim().length < 120) {
        throw new Error(
          `Pages ${safeStart}–${cappedEnd} contained very little selectable text. If this PDF is a scanned image book, try a text-searchable PDF or another page range.`
        );
      }

      setStatusStep('Building your Split-Screen Computer-Delivered IELTS Exam Room...');
      const exam = await convertPrivatePdfToExam({
        extractedText: extracted.text,
        fileName: selectedFile.name,
        pageRangeLabel: `Pages ${safeStart}–${cappedEnd}`,
        moduleHint
      });

      const updated = savePrivatePdfExam(exam);
      setSavedExams(updated);
      setActiveExam(exam);
      soundManager.playSuccess();
      onShowToast(`Private CD-IELTS room ready (${exam.questions.length} interactive questions).`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not convert this PDF range. Please try 2–4 pages of a single passage.');
    } finally {
      setIsConverting(false);
      setStatusStep('');
    }
  };

  const handleDeleteExam = (id: string) => {
    const updated = deletePrivatePdfExam(id);
    setSavedExams(updated);
    setConfirmDeleteId(null);
    onShowToast('Private PDF test removed from this device.');
  };

  if (activeExam) {
    return (
      <VerifiedDrillPlayer
        privateExam={activeExam}
        onBack={() => setActiveExam(null)}
        onShowToast={onShowToast}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Privacy & Personal Use Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#11201E] border border-[#0F4C45]/25 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#0F4C45]/10 dark:bg-[#0F4C45]/30 text-[#0F4C45] dark:text-[#7CD4C4] flex items-center justify-center shrink-0">
          <Lock className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm sm:text-base font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
            Private "Practice Your Own PDF" Exam Room
          </h3>
          <p className="text-xs text-[#566664] dark:text-[#96B0AC] leading-relaxed">
            Have personal Cambridge 7–21 PDFs or coaching handouts on your device? Select a passage (2–5 pages at a time) to turn it into an interactive <strong className="text-[#0E1F1E] dark:text-[#EEF3F1]">Split-Screen Computer-Delivered IELTS</strong> test with timer, highlighter, and instant checking. Your files stay <strong className="text-[#0E1F1E] dark:text-[#EEF3F1]">strictly private on your browser</strong> and are never shared or published to the public question bank.
          </p>
        </div>
      </div>

      {/* Upload & Page Range Card */}
      <div className="bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1E3330] rounded-2xl p-5 sm:p-6 space-y-5">
        <div
          onClick={() => !isConverting && fileInputRef.current?.click()}
          className="p-7 border-2 border-dashed border-[#0F4C45]/35 hover:border-[#0F4C45] rounded-2xl bg-[#F7F9F8] dark:bg-[#0B1716] text-center cursor-pointer transition space-y-2.5"
        >
          <div className="w-12 h-12 rounded-xl bg-[#0F4C45]/10 dark:bg-[#0F4C45]/30 text-[#0F4C45] dark:text-[#7CD4C4] flex items-center justify-center mx-auto">
            {isInspecting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
          </div>
          <div className="text-sm font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
            {selectedFile ? selectedFile.name : 'Choose a Personal IELTS PDF from Your Device'}
          </div>
          <p className="text-xs text-[#566664] dark:text-[#96B0AC]">
            {selectedFile
              ? `${totalPages} pages detected · Click to pick a different PDF`
              : 'Text-searchable .PDF files up to 45MB · Runs client-side via pdf.js'}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Page Range & Module Hint Controls */}
        {selectedFile && totalPages > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-[#0E1F1E] dark:text-[#EEF3F1]">
                Start Page (1–{totalPages})
              </span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={startPage}
                onChange={(e) => {
                  const val = Math.max(1, Math.min(totalPages, Number(e.target.value) || 1));
                  setStartPage(val);
                  if (endPage < val) setEndPage(Math.min(totalPages, val + 2));
                }}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#D3DDDA] dark:border-[#1E3330] bg-[#F7F9F8] dark:bg-[#0B1716] text-sm font-mono text-[#0E1F1E] dark:text-[#EEF3F1]"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-[#0E1F1E] dark:text-[#EEF3F1]">
                End Page (max 8 pages per room)
              </span>
              <input
                type="number"
                min={startPage}
                max={Math.min(totalPages, startPage + 7)}
                value={endPage}
                onChange={(e) => {
                  const val = Math.max(startPage, Math.min(totalPages, Number(e.target.value) || startPage));
                  setEndPage(Math.min(val, startPage + 7));
                }}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#D3DDDA] dark:border-[#1E3330] bg-[#F7F9F8] dark:bg-[#0B1716] text-sm font-mono text-[#0E1F1E] dark:text-[#EEF3F1]"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-[#0E1F1E] dark:text-[#EEF3F1]">
                Section Type
              </span>
              <select
                value={moduleHint}
                onChange={(e) => setModuleHint(e.target.value as VerifiedModule | 'auto')}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#D3DDDA] dark:border-[#1E3330] bg-[#F7F9F8] dark:bg-[#0B1716] text-xs sm:text-sm text-[#0E1F1E] dark:text-[#EEF3F1]"
              >
                <option value="auto">Auto-Detect Section</option>
                <option value="reading">Reading Passage</option>
                <option value="listening">Listening Script</option>
                <option value="writing">Writing Prompt</option>
                <option value="speaking">Speaking Cue Card</option>
              </select>
            </label>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#566664] dark:text-[#96B0AC]">
            Tip: For a Cambridge book, select just 1 Reading passage (e.g., pages 18–21) for the cleanest CD-IELTS layout.
          </div>

          <button
            type="button"
            disabled={!selectedFile || isConverting || isInspecting}
            onClick={handleConvertPdf}
            className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#0F4C45] hover:bg-[#0D3833] text-white text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConverting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{statusStep || 'Converting...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#F4A62A]" />
                <span>Launch Split-Screen CD-IELTS Room</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Private Saved PDF Tests List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
            Your Private Converted PDF Tests ({savedExams.length})
          </h4>
          <span className="text-[11px] font-mono text-[#566664] dark:text-[#96B0AC]">
            Stored only on this device
          </span>
        </div>

        {savedExams.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1E3330] text-center space-y-2">
            <FileText className="w-9 h-9 text-[#566664]/50 mx-auto" />
            <div className="text-sm font-semibold text-[#0E1F1E] dark:text-[#EEF3F1]">
              No private PDF tests converted yet
            </div>
            <p className="text-xs text-[#566664] dark:text-[#96B0AC] max-w-md mx-auto">
              Upload any study PDF above and pick a 2–5 page range to practice it inside a timed, highlightable IELTS exam interface.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedExams.map((exam) => (
              <div
                key={exam.id}
                className="p-5 rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1E3330] flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-[#566664] dark:text-[#96B0AC]">
                    <span className="uppercase font-bold text-[#0F4C45] dark:text-[#7CD4C4]">
                      {exam.module} · {exam.pageRangeLabel}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {exam.suggestedMinutes}m
                    </span>
                  </div>
                  <h5 className="text-sm font-bold text-[#0E1F1E] dark:text-[#EEF3F1] line-clamp-2">
                    {exam.title}
                  </h5>
                  <div className="text-[11px] text-[#566664] dark:text-[#96B0AC] truncate">
                    Source: {exam.sourceFileName} · {exam.questions.length} interactive questions
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#D3DDDA]/60 dark:border-[#1E3330]">
                  <button
                    type="button"
                    onClick={() => setActiveExam(exam)}
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0D3833] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Open Exam Room</span>
                  </button>

                  {confirmDeleteId === exam.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDeleteExam(exam.id)}
                        className="min-h-[36px] px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold cursor-pointer"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="min-h-[36px] px-2.5 py-1 rounded-lg border border-[#D3DDDA] text-[11px] text-[#566664] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(exam.id)}
                      className="min-h-[40px] px-2.5 py-2 rounded-xl text-[#566664] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                      title="Delete private PDF test"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
