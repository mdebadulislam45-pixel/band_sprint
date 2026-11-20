import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FolderLock,
  Upload,
  FileText,
  Trash2,
  BookOpen,
  HardDrive,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  X,
  Play,
  Layers,
  ChevronRight,
  Headphones,
  PenTool,
  Mic
} from 'lucide-react';
import { pdfVault, runVaultVerification } from '../../services/pdfVault';
import { PrivatePdfDocumentMetadata, VaultStorageEstimate, VaultVerificationReport, DetectedTestBoundary } from '../../types/pdfVault';
import { UserProfile } from '../../types';
import { PrivateVaultVerificationModal } from './PrivateVaultVerificationModal';

interface PrivateVaultManagerProps {
  user?: UserProfile | null;
  onOpenDocument: (doc: PrivatePdfDocumentMetadata, options?: { initialPage?: number; selectedTest?: DetectedTestBoundary; enableSplitWorkspace?: boolean }) => void;
  onShowToast: (msg: string) => void;
  onBack?: () => void;
}

export const PrivateVaultManager: React.FC<PrivateVaultManagerProps> = ({
  user,
  onOpenDocument,
  onShowToast,
  onBack
}) => {
  const activeUserId = user?.id || 'local_guest';

  // State
  const [documents, setDocuments] = useState<PrivatePdfDocumentMetadata[]>([]);
  const [storageEstimate, setStorageEstimate] = useState<VaultStorageEstimate | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Test Launcher Modal State
  const [launcherDoc, setLauncherDoc] = useState<PrivatePdfDocumentMetadata | null>(null);

  // Import State
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importStage, setImportStage] = useState<string>('');
  const [importPercent, setImportPercent] = useState<number>(0);
  const [importError, setImportError] = useState<string | null>(null);

  // Duplicate Resolution Modal State
  const [duplicateDoc, setDuplicateDoc] = useState<PrivatePdfDocumentMetadata | null>(null);
  const [pendingFileForOverwrite, setPendingFileForOverwrite] = useState<File | null>(null);

  // Delete Confirmation Modal State
  const [docToDelete, setDocToDelete] = useState<PrivatePdfDocumentMetadata | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Verification State (Phase 4.2B)
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationProgress, setVerificationProgress] = useState<{
    current: number;
    total: number;
    currentFileName: string;
    stage: string;
    percent: number;
  }>({
    current: 0,
    total: 0,
    currentFileName: '',
    stage: '',
    percent: 0
  });
  const [verificationReport, setVerificationReport] = useState<VaultVerificationReport | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState<boolean>(false);
  const verificationAbortControllerRef = useRef<AbortController | null>(null);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // ============================================================================
  // LOAD DOCUMENTS & STORAGE USAGE
  // ============================================================================
  const refreshVaultData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [docs, est] = await Promise.all([
        pdfVault.listDocuments(activeUserId),
        pdfVault.getStorageEstimate(activeUserId)
      ]);
      if (isMountedRef.current) {
        setDocuments(docs);
        setStorageEstimate(est);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('[PrivateVaultManager] Failed to load documents:', err);
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [activeUserId]);

  useEffect(() => {
    if (verificationAbortControllerRef.current) {
      verificationAbortControllerRef.current.abort();
      verificationAbortControllerRef.current = null;
    }
    setIsVerifying(false);
    setVerificationReport(null);
    setShowVerificationModal(false);
  }, [activeUserId]);

  useEffect(() => {
    isMountedRef.current = true;
    void refreshVaultData();

    const handleVaultUpdated = () => void refreshVaultData();
    const handleAuthUpdated = () => {
      if (verificationAbortControllerRef.current) {
        verificationAbortControllerRef.current.abort();
      }
      setIsVerifying(false);
      setVerificationReport(null);
      setShowVerificationModal(false);
      void refreshVaultData();
    };

    window.addEventListener('private_pdf_vault_updated', handleVaultUpdated);
    window.addEventListener('user_auth_updated', handleAuthUpdated);
    window.addEventListener('sign_out_candidate', handleAuthUpdated);

    return () => {
      isMountedRef.current = false;
      if (verificationAbortControllerRef.current) {
        verificationAbortControllerRef.current.abort();
      }
      window.removeEventListener('private_pdf_vault_updated', handleVaultUpdated);
      window.removeEventListener('user_auth_updated', handleAuthUpdated);
      window.removeEventListener('sign_out_candidate', handleAuthUpdated);
    };
  }, [refreshVaultData]);

  // Format bytes helper
  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatQuota = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  };

  const formatStageLabel = (stage: string): string => {
    switch (stage) {
      case 'validating': return 'Validating PDF magic bytes & signature...';
      case 'hashing': return 'Computing full-file SHA-256 fingerprint...';
      case 'inspecting': return 'Inspecting page count & volume structure...';
      case 'storing': return 'Writing encrypted blob to local IndexedDB...';
      default: return 'Processing PDF document...';
    }
  };

  // Import Execution
  const executeImport = async (file: File, overwrite: boolean = false) => {
    setIsImporting(true);
    setImportError(null);
    setImportStage('validating');
    setImportPercent(10);

    try {
      const result = await pdfVault.importPdf(file, {
        userId: activeUserId,
        fileName: file.name,
        overwriteDuplicate: overwrite,
        onProgress: (stage, percent) => {
          if (isMountedRef.current) {
            setImportStage(stage);
            setImportPercent(percent);
          }
        }
      });

      if (!result.success) {
        if (result.isDuplicate && result.existingDoc) {
          setDuplicateDoc(result.existingDoc);
          setPendingFileForOverwrite(file);
          setIsImporting(false);
          return;
        }

        setImportError(result.error || 'Failed to import PDF into vault.');
        setIsImporting(false);
        return;
      }

      onShowToast(`Imported "${result.metadata?.fileName || file.name}" to private vault.`);
      setIsImporting(false);
      setImportStage('');
      setImportPercent(0);
      void refreshVaultData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setImportError(`Import failed: ${msg}`);
      setIsImporting(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    void executeImport(file, false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmOverwrite = async () => {
    if (!pendingFileForOverwrite) return;
    const file = pendingFileForOverwrite;
    setDuplicateDoc(null);
    setPendingFileForOverwrite(null);
    await executeImport(file, true);
  };

  const handleCancelOverwrite = () => {
    setDuplicateDoc(null);
    setPendingFileForOverwrite(null);
    onShowToast('Import cancelled. Existing vault document was preserved.');
  };

  // Delete Execution
  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);

    try {
      const success = await pdfVault.deleteDocument(docToDelete.docId, activeUserId);
      if (success) {
        onShowToast(`Deleted "${docToDelete.fileName}" from private vault.`);
        setDocToDelete(null);
        void refreshVaultData();
      } else {
        onShowToast('Could not delete document. Ownership authorization failed.');
      }
    } catch (err) {
      onShowToast('Error deleting document from vault storage.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Verification Execution
  const handleStartVerification = async () => {
    if (isVerifying) return;
    if (documents.length === 0) {
      onShowToast('No private PDF documents in vault to verify.');
      return;
    }

    if (verificationAbortControllerRef.current) {
      verificationAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    verificationAbortControllerRef.current = controller;

    setIsVerifying(true);
    setVerificationProgress({
      current: 0,
      total: documents.length,
      currentFileName: documents[0]?.fileName || '',
      stage: 'Initializing local IndexedDB verification...',
      percent: 0
    });

    try {
      const report = await runVaultVerification({
        userId: activeUserId,
        signal: controller.signal,
        onProgress: (p) => {
          if (isMountedRef.current) {
            setVerificationProgress(p);
          }
        }
      });

      if (isMountedRef.current) {
        setVerificationReport(report);
        setIsVerifying(false);
        setShowVerificationModal(true);
        if (report.summary.cancelled) {
          onShowToast('Verification stopped by user request.');
        } else if (report.summary.allPassed) {
          onShowToast(`Verified all ${report.summary.totalDocs} private PDFs successfully.`);
        } else {
          onShowToast(`Verification complete: ${report.summary.identityVerifiedCount}/${report.summary.totalDocs} identity verified.`);
        }
        void refreshVaultData();
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setIsVerifying(false);
        const msg = err instanceof Error ? err.message : String(err);
        onShowToast(`Verification error: ${msg}`);
      }
    }
  };

  const handleCancelVerification = () => {
    if (verificationAbortControllerRef.current) {
      verificationAbortControllerRef.current.abort();
      verificationAbortControllerRef.current = null;
    }
    setIsVerifying(false);
    onShowToast('Verification cancelled.');
  };

  // Filtered documents by search
  const filteredDocuments = documents.filter((doc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = doc.fileName.toLowerCase().includes(q);
    const volMatch = doc.detectedVolume ? `practice ${doc.detectedVolume}`.includes(q) : false;
    return titleMatch || volMatch;
  });

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 sm:space-y-7 animate-fade-in pb-16 select-none">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,application/x-pdf"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* ================= HEADER SECTION ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Return to IELTS Practice Library"
              aria-label="Back"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <FolderLock className="w-6 h-6 text-blue-600" />
              Private PDF Vault
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span>Candidate-Owned Documents</span>
              <span aria-hidden="true">·</span>
              <span>Partition: {user?.name || 'Local Guest'}</span>
              <span aria-hidden="true">·</span>
              <span>Strict Client-Side Storage</span>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {verificationReport && !isVerifying && (
            <button
              type="button"
              onClick={() => setShowVerificationModal(true)}
              className="min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#101B32] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Verification Results</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleStartVerification}
            disabled={isVerifying || isImporting || documents.length === 0}
            className="min-h-[44px] px-3.5 py-2.5 rounded-xl border border-blue-600 dark:border-blue-500 bg-blue-50/80 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 disabled:opacity-40 text-xs font-bold transition flex items-center gap-2 shadow-2xs cursor-pointer active:scale-95"
          >
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Verify My Private PDFs</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting || isVerifying}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
          >
            <Upload className="w-4 h-4" />
            <span>Import PDF from Device</span>
          </button>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 rounded-2xl p-4 flex items-start gap-3 text-xs">
        <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-blue-950 dark:text-blue-200 block font-semibold">
            100% Client-Side Privacy Guarantee
          </strong>
          <p className="text-blue-800 dark:text-blue-300 leading-relaxed">
            Your imported PDFs are stored strictly inside your browser's local IndexedDB repository (<code className="font-mono text-[11px] bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">ielts_sprint_pdf_vault_v1</code>). They are never transmitted over the network and never uploaded to any server.
          </p>
        </div>
      </div>

      {/* Storage Estimate Card */}
      {storageEstimate && (
        <div className="bg-white dark:bg-[#101B32] p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">PDF Vault Storage</span>
              </div>
              <div className="text-xl font-mono font-black text-slate-900 dark:text-white">
                {formatFileSize(storageEstimate.vaultPdfBytes || 0)}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                <span>{storageEstimate.documentCount} documents stored</span>
                <span aria-hidden="true">·</span>
                <span>Isolated Client Storage</span>
              </div>
            </div>

            <div className="space-y-2 pt-3 sm:pt-0 sm:pl-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Browser Capacity</span>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  {formatFileSize(storageEstimate.usageBytes)} of {formatQuota(storageEstimate.quotaBytes)} ({storageEstimate.usagePercent}%)
                </span>
              </div>

              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${storageEstimate.usagePercent > 80 ? 'bg-amber-500' : 'bg-blue-600'}`}
                  style={{ width: `${Math.max(2, storageEstimate.usagePercent)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#101B32] p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 px-1">
          Vault Documents ({filteredDocuments.length})
        </div>

        <div className="relative min-w-[220px] sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vault documents..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Documents Grid */}
      {isLoading ? (
        <div className="p-12 text-center space-y-3">
          <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Querying local IndexedDB storage...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white dark:bg-[#101B32] p-8 sm:p-12 rounded-3xl border border-slate-200/90 dark:border-slate-800 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center mx-auto text-blue-600">
            <BookOpen className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Private PDFs in Your Vault</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Import your IELTS Book PDFs (Books 1–19) to read and study privately on this device.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition inline-flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
          >
            <Upload className="w-4 h-4" />
            <span>Select PDF to Import</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => {
            const hasVolume = typeof doc.detectedVolume === 'number';
            const isScanned = doc.inspection?.inspectionStatus === 'scanned_no_text';
            const verifiedTestsCount = doc.inspection?.inventory?.tests?.length || 0;

            return (
              <div
                key={doc.docId}
                className="group bg-white dark:bg-[#101B32] rounded-2xl border border-slate-200/90 dark:border-slate-800 hover:border-blue-500 p-4 shadow-2xs hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-medium">
                      {hasVolume ? `Practice Book ${doc.detectedVolume}` : 'Custom Document'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{formatFileSize(doc.fileSize)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{doc.pageCount} pages</span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                      {doc.fileName}
                    </h3>

                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {doc.detectedEdition && (
                        <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 text-[10px] font-bold border border-blue-200 dark:border-blue-800">
                          {doc.detectedEdition}
                        </span>
                      )}
                      {isScanned ? (
                        <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-800">
                          Scanned PDF
                        </span>
                      ) : verifiedTestsCount > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                          {verifiedTestsCount} Verified {verifiedTestsCount === 1 ? 'Test' : 'Tests'}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 font-mono truncate" title={`SHA-256: ${doc.fileHash}`}>
                    SHA-256: {doc.fileHash.substring(0, 16)}...
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setLauncherDoc(doc)}
                    className="min-h-[44px] flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Test Launcher</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenDocument(doc)}
                    className="min-h-[44px] px-3 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    title="Read PDF document in viewer"
                  >
                    <BookOpen className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDocToDelete(doc)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-500 hover:text-red-600 transition cursor-pointer"
                    title={`Delete "${doc.fileName}"`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= TEST LAUNCHER MODAL ================= */}
      {launcherDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#101B32] rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 shrink-0">
                  <Play className="w-5 h-5 fill-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Private Test Launcher
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-xs">
                    {launcherDoc.fileName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setLauncherDoc(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scanned PDF warning notice */}
            {launcherDoc.inspection?.inspectionStatus === 'scanned_no_text' && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Scanned PDF — Visual Page Navigation Only (Books 1–2 image scans).</span>
              </div>
            )}

            {/* Test Selection */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Select Verified Test & Module Start Page:
              </span>

              {launcherDoc.inspection?.inventory?.tests && launcherDoc.inspection.inventory.tests.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {launcherDoc.inspection.inventory.tests.map((test) => {
                    const listeningP = test.modules?.listening?.pageRange?.start?.pageNumber;
                    const readingP = test.modules?.reading?.pageRange?.start?.pageNumber;
                    const writingP = test.modules?.writing?.pageRange?.start?.pageNumber;

                    return (
                      <div
                        key={test.testLabel}
                        className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {test.testLabel}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300">
                            {test.track}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-500">
                          {listeningP && <span>L: p.{listeningP}</span>}
                          {readingP && <span>R: p.{readingP}</span>}
                          {writingP && <span>W: p.{writingP}</span>}
                        </div>

                        <div className="pt-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const targetPage = listeningP || readingP || test.pageRange.start.pageNumber;
                              setLauncherDoc(null);
                              onOpenDocument(launcherDoc, {
                                initialPage: targetPage,
                                selectedTest: test,
                                enableSplitWorkspace: true
                              });
                            }}
                            className="min-h-[36px] flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span>Launch Practice Workspace</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl text-center text-xs text-slate-500">
                  No automated test boundaries detected. Open directly in PDF viewer to study visually.
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setLauncherDoc(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  setLauncherDoc(null);
                  onOpenDocument(launcherDoc);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Open Document Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Modal & Delete Modal */}
      {duplicateDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#101B32] rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Duplicate Document Detected</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              A document with an identical SHA-256 hash already exists in your vault.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={handleCancelOverwrite} className="px-4 py-2 text-xs font-bold text-slate-600">Cancel</button>
              <button type="button" onClick={handleConfirmOverwrite} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">Overwrite</button>
            </div>
          </div>
        </div>
      )}

      {docToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#101B32] rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Permanently Delete Document?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">This will permanently remove "{docToDelete.fileName}" from local vault storage.</p>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setDocToDelete(null)} disabled={isDeleting} className="px-4 py-2 text-xs font-bold text-slate-600">Cancel</button>
              <button type="button" onClick={handleConfirmDelete} disabled={isDeleting} className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}

      {showVerificationModal && verificationReport && (
        <PrivateVaultVerificationModal
          report={verificationReport}
          onClose={() => setShowVerificationModal(false)}
          onReverify={handleStartVerification}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
