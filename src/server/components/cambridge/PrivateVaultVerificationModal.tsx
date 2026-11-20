import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RotateCcw,
  X,
  Search,
  BookOpen,
  FileText,
  Layers,
  ChevronDown,
  ChevronUp,
  FileCheck,
  ShieldAlert,
  Database
} from 'lucide-react';
import {
  VaultVerificationReport,
  VaultVerificationItem
} from '../../types/pdfVault';

interface PrivateVaultVerificationModalProps {
  report: VaultVerificationReport;
  onClose: () => void;
  onReverify: () => void;
  onShowToast: (msg: string) => void;
}

export const PrivateVaultVerificationModal: React.FC<PrivateVaultVerificationModalProps> = ({
  report,
  onClose,
  onReverify,
  onShowToast
}) => {
  const { summary, items } = report;
  const [activeTab, setActiveTab] = useState<'all' | 'verified' | 'issues'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedDocIds, setExpandedDocIds] = useState<Set<string>>(
    new Set(items.map((i) => i.docId)) // Default all expanded
  );

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const copyToClipboard = async (text: string, key: string, label: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedKey(key);
      onShowToast(`Copied ${label} to clipboard.`);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      onShowToast('Could not copy to clipboard.');
    }
  };

  const handleCopyJsonReport = () => {
    const jsonStr = JSON.stringify(report, null, 2);
    void copyToClipboard(jsonStr, 'json_report', 'Full JSON Verification Report');
  };

  const handleCopyMarkdownSummary = () => {
    let md = `# Practice Private PDF Vault Verification Report\n\n`;
    md += `- Partition: \`${summary.userPartition}\`\n`;
    md += `- Total Documents: ${summary.totalDocs}\n`;
    md += `- File Identity Verified: ${summary.identityVerifiedCount}/${summary.totalDocs}\n`;
    md += `- Practice Structural Verified: ${summary.structuralVerifiedCount}/${summary.totalDocs}\n`;
    md += `- Duplicates: ${summary.duplicateCount}\n`;
    md += `- Completed At: ${new Date(summary.completedAt).toISOString()}\n\n`;
    md += `| File Name | Size (Bytes) | SHA-256 | Pages | Volume | Track | Identity | Structure |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    items.forEach((item) => {
      const vol = item.detectedVolume ? `Book ${item.detectedVolume}` : 'Unknown';
      const hashShort = item.storedHash ? `${item.storedHash.slice(0, 12)}...` : 'N/A';
      md += `| ${item.fileName} | ${item.fileSize} | \`${hashShort}\` | ${item.actualPageCount} | ${vol} | ${item.track} | ${item.identityStatus} | ${item.structuralStatus} |\n`;
    });

    void copyToClipboard(md, 'markdown_report', 'Markdown Inventory Summary');
  };

  const toggleDocExpand = (docId: string) => {
    setExpandedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    if (activeTab === 'verified') {
      if (item.identityStatus !== 'verified' || item.structuralStatus !== 'verified') {
        return false;
      }
    } else if (activeTab === 'issues') {
      if (item.errors.length === 0 && item.warnings.length === 0 && item.identityStatus === 'verified') {
        return false;
      }
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = item.fileName.toLowerCase().includes(q);
    const hashMatch = item.storedHash.toLowerCase().includes(q);
    const volMatch = item.detectedVolume ? `practice ${item.detectedVolume}`.includes(q) : false;
    const trackMatch = item.track.toLowerCase().includes(q);
    return nameMatch || hashMatch || volMatch || trackMatch;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="vault-verification-title"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fade-in"
    >
      <div className="bg-white dark:bg-[#101B32] rounded-3xl border border-slate-200 dark:border-slate-800 max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* ================= MODAL HEADER ================= */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/70 dark:bg-slate-900/40">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2
                id="vault-verification-title"
                className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2"
              >
                <span>Private PDF Vault Verification</span>
                {summary.allPassed ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" /> All Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                    <AlertTriangle className="w-3.5 h-3.5" /> {summary.issuesCount} Discrepancy Note(s)
                  </span>
                )}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span>IndexedDB: <code className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">ielts_sprint_pdf_vault_v1</code></span>
                <span aria-hidden="true">·</span>
                <span>Partition: <strong className="text-slate-700 dark:text-slate-300">{summary.userPartition}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Client-Side Local Crypto</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition cursor-pointer"
            aria-label="Close verification report"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= METRICS CARDS ROW ================= */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#101B32]">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. Total Documents */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Total Stored</span>
              <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
                {summary.totalDocs}
              </div>
              <span className="text-[10px] text-slate-400">PDFs in Partition</span>
            </div>

            {/* 2. File Identity Verified */}
            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/70 dark:border-emerald-800/50">
              <span className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 block">Identity Verified</span>
              <div className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                {summary.identityVerifiedCount} / {summary.totalDocs}
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-500">SHA-256 & Blob Intact</span>
            </div>

            {/* 3. Structural Verified */}
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 rounded-2xl border border-blue-200/70 dark:border-blue-800/50">
              <span className="text-[11px] font-medium text-blue-800 dark:text-blue-300 block">Practice Verified</span>
              <div className="text-xl font-black font-mono text-blue-700 dark:text-blue-400 mt-0.5">
                {summary.structuralVerifiedCount} / {summary.totalDocs}
              </div>
              <span className="text-[10px] text-blue-600 dark:text-blue-500">Tests & Modules Classified</span>
            </div>

            {/* 4. Duplicates / Warnings */}
            <div className={`p-3 rounded-2xl border ${
              summary.issuesCount > 0
                ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60'
                : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800'
            }`}>
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block">Issues & Duplicates</span>
              <div className={`text-xl font-black font-mono mt-0.5 ${
                summary.issuesCount > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'
              }`}>
                {summary.issuesCount}
              </div>
              <span className="text-[10px] text-slate-400">
                {summary.duplicateCount} duplicate SHA-256
              </span>
            </div>
          </div>
        </div>

        {/* ================= CONTROLS & EXPORT TOOLBAR ================= */}
        <div className="p-3.5 sm:px-5 sm:py-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/30">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              All Documents ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('verified')}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'verified'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Verified ({summary.structuralVerifiedCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('issues')}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'issues'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Issues & Notes ({summary.issuesCount})
            </button>
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search verified items..."
                className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={handleCopyJsonReport}
              className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Copy verified report as raw JSON"
            >
              {copiedKey === 'json_report' ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>JSON</span>
            </button>

            <button
              type="button"
              onClick={handleCopyMarkdownSummary}
              className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Copy inventory as markdown table"
            >
              {copiedKey === 'markdown_report' ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>Markdown</span>
            </button>

            <button
              type="button"
              onClick={onReverify}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Run verification again"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Re-run</span>
            </button>
          </div>
        </div>

        {/* ================= VERIFIED DOCUMENTS SCROLLABLE LIST ================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 space-y-2">
              <FileCheck className="w-8 h-8 mx-auto text-slate-400" />
              <p>No documents match the current filter or search criteria.</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isExpanded = expandedDocIds.has(item.docId);
              const isIdentityOk = item.identityStatus === 'verified';
              const isStructuralOk = item.structuralStatus === 'verified';

              return (
                <div
                  key={item.docId}
                  className="bg-white dark:bg-[#101B32] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden transition-all"
                >
                  {/* Card Header / Summary Bar */}
                  <div
                    onClick={() => toggleDocExpand(item.docId)}
                    className="p-4 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-100/50 dark:hover:bg-slate-900/60 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {item.fileName}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          <span>{formatFileSize(item.fileSize)} ({item.fileSize.toLocaleString()} bytes)</span>
                          <span aria-hidden="true">·</span>
                          <span>{item.actualPageCount} pages</span>
                          <span aria-hidden="true">·</span>
                          <span>ID: {item.docId}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {/* Identity Badge */}
                      {isIdentityOk ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Identity Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800">
                          <XCircle className="w-3.5 h-3.5" /> Identity: {item.identityStatus}
                        </span>
                      )}

                      {/* Structural Badge */}
                      {isStructuralOk ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {item.detectedVolume ? `Practice ${item.detectedVolume} ${item.track}` : 'Structural Verified'}
                        </span>
                      ) : item.structuralStatus === 'partial' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          <AlertTriangle className="w-3.5 h-3.5" /> Partial Match
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                          Status: {item.structuralStatus}
                        </span>
                      )}

                      {/* Expand/Collapse Toggle */}
                      <button
                        type="button"
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        aria-label={isExpanded ? 'Collapse document details' : 'Expand document details'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Card Details */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 space-y-4 text-xs">
                      {/* Errors Alert */}
                      {item.errors.length > 0 && (
                        <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900/60 space-y-1">
                          <div className="font-bold text-red-900 dark:text-red-200 flex items-center gap-1.5">
                            <XCircle className="w-4 h-4 text-red-600" />
                            <span>Integrity Errors Detected ({item.errors.length}):</span>
                          </div>
                          <ul className="list-disc pl-5 text-red-700 dark:text-red-300 space-y-0.5">
                            {item.errors.map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Warnings Alert */}
                      {item.warnings.length > 0 && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60 space-y-1">
                          <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <span>Advisory Notes ({item.warnings.length}):</span>
                          </div>
                          <ul className="list-disc pl-5 text-amber-800 dark:text-amber-300 space-y-0.5">
                            {item.warnings.map((warn, i) => (
                              <li key={i}>{warn}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* SECTION 1: Forensic Identity Grid */}
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          1. Forensic Cryptographic Identity
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                          <div className="space-y-1 font-mono text-[11px]">
                            <div className="text-slate-400">Stored Full-File SHA-256 Digest:</div>
                            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 break-all select-all font-semibold">
                              <span>{item.storedHash}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void copyToClipboard(item.storedHash, `hash_${item.docId}`, 'SHA-256 Hash');
                                }}
                                className="p-1 rounded text-slate-400 hover:text-blue-600"
                                title="Copy full SHA-256 hash"
                              >
                                {copiedKey === `hash_${item.docId}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1 font-mono text-[11px]">
                            <div className="text-slate-400">Live Computed SHA-256 Digest:</div>
                            <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 break-all select-all">
                              <span>{item.computedHash || 'None (Binary Missing)'}</span>
                              {item.hashMatched && (
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold font-sans text-xs">
                                  ✓ Matches Stored
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                            <span>Page Verification: </span>
                            <strong className="text-slate-900 dark:text-white">
                              {item.actualPageCount} actual
                            </strong>{' '}
                            (stored: {item.storedPageCount}) {item.pageCountMatched ? '✓ Match' : '✗ Mismatch'}
                          </div>

                          <div className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                            <span>IndexedDB Partition: </span>
                            <strong className="text-slate-900 dark:text-white">{item.userPartition}</strong>
                          </div>
                        </div>
                      </div>

                      {/* SECTION 2: Practice Structural Classification */}
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          2. Practice Structural Classification
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Detected Volume</span>
                            <strong className="text-slate-900 dark:text-white">
                              {item.detectedVolume ? `Practice Book ${item.detectedVolume}` : 'Unknown'}
                            </strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Track</span>
                            <strong className="text-slate-900 dark:text-white">{item.track}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Document Type</span>
                            <strong className="text-slate-900 dark:text-white">{item.documentType}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Confidence</span>
                            <strong className="text-slate-900 dark:text-white capitalize">{item.confidence}</strong>
                          </div>
                        </div>
                      </div>

                      {/* SECTION 3: Detected Test Boundaries & Modules */}
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          3. Verified Module & Test Boundaries ({item.detectedTests.length} tests)
                        </div>

                        {item.detectedTests.length === 0 ? (
                          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs italic">
                            No discrete test boundaries were isolated in this PDF.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                            {item.detectedTests.map((t, idx) => (
                              <div
                                key={idx}
                                className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1.5"
                              >
                                <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                                  <span>{t.testLabel || `Test ${t.testNumber}`}</span>
                                  <span className="text-[10px] font-normal text-slate-500">{t.track}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                                  <div>L: {t.listeningStartPage ? `p.${t.listeningStartPage}` : '—'}</div>
                                  <div>R: {t.readingStartPage ? `p.${t.readingStartPage}` : '—'}</div>
                                  <div>W: {t.writingStartPage ? `p.${t.writingStartPage}` : '—'}</div>
                                  <div>S: {t.speakingStartPage ? `p.${t.speakingStartPage}` : '—'}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* SECTION 4: Reference Sections & Integrity Checks */}
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          4. Reference Sections & Page Bounds
                        </div>
                        <div className="flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 text-[11px]">
                          <div>
                            <span className="text-slate-400">Answer Key: </span>
                            <strong className="text-slate-800 dark:text-slate-200">
                              {item.answerKeyPage ? `p.${item.answerKeyPage}` : 'Not Detected'}
                            </strong>
                          </div>
                          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                          <div>
                            <span className="text-slate-400">Audioscripts: </span>
                            <strong className="text-slate-800 dark:text-slate-200">
                              {item.audioscriptsPage ? `p.${item.audioscriptsPage}` : 'Not Detected'}
                            </strong>
                          </div>
                          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                          <div>
                            <span className="text-slate-400">Writing Samples: </span>
                            <strong className="text-slate-800 dark:text-slate-200">
                              {item.candidateWritingSamplesPage ? `p.${item.candidateWritingSamplesPage}` : 'Not Detected'}
                            </strong>
                          </div>
                          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                          <div>
                            <span className="text-slate-400">Page Bounds: </span>
                            <strong className={item.pageBoundsValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}>
                              {item.pageBoundsValid ? `✓ Valid (1..${item.actualPageCount})` : '✗ Out of bounds'}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ================= MODAL FOOTER ================= */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/40 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Database className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Directly verified from IndexedDB object stores <code className="font-mono text-[11px]">pdf_documents_meta</code> & <code className="font-mono text-[11px]">pdf_binary_blobs</code>. Zero network transmission.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs cursor-pointer active:scale-95"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
