import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Columns,
  X,
  RefreshCw,
  AlertTriangle,
  FileText,
  Headphones,
  BookOpen,
  PenTool,
  Mic,
  Key,
  FileCheck,
  PanelRightOpen,
  PanelRightClose
} from 'lucide-react';
import { pdfVault } from '../../services/pdfVault';
import { PrivatePdfDocumentMetadata, DetectedTestBoundary } from '../../types/pdfVault';
import { PrivateResponseWorkspace } from './PrivateResponseWorkspace';

interface PrivatePdfViewerProps {
  docId: string;
  userId?: string;
  initialPage?: number;
  selectedTest?: DetectedTestBoundary | null;
  enableSplitWorkspace?: boolean;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
}

export const PrivatePdfViewer: React.FC<PrivatePdfViewerProps> = ({
  docId,
  userId = 'local_guest',
  initialPage = 1,
  selectedTest: propSelectedTest = null,
  enableSplitWorkspace = false,
  onClose,
  onShowToast
}) => {
  // Metadata & binary state
  const [metadata, setMetadata] = useState<PrivatePdfDocumentMetadata | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // PDF.js Document State
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Layout & Zoom State
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [isTwoPageMode, setIsTwoPageMode] = useState<boolean>(false);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [jumpPageInput, setJumpPageInput] = useState<string>(String(initialPage));

  // Split Response Workspace state
  const [showWorkspace, setShowWorkspace] = useState<boolean>(enableSplitWorkspace);
  const [workspaceModule, setWorkspaceModule] = useState<'listening' | 'reading' | 'writing' | 'speaking'>('listening');
  const [mobileTab, setMobileTab] = useState<'pdf' | 'workspace'>('pdf');

  // Canvas Refs
  const canvasRefLeft = useRef<HTMLCanvasElement | null>(null);
  const canvasRefRight = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Active Render Task Tracking
  const renderTaskLeftRef = useRef<any>(null);
  const renderTaskRightRef = useRef<any>(null);

  // Detect mobile viewport (under 768px always forces 1-page mode)
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  });

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileScreen(mobile);
      if (mobile && isTwoPageMode) {
        setIsTwoPageMode(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isTwoPageMode]);

  // Sync jump input with current page
  useEffect(() => {
    setJumpPageInput(String(currentPage));
  }, [currentPage]);

  // Sync initial page if provided
  useEffect(() => {
    if (initialPage && initialPage >= 1) {
      setCurrentPage(initialPage);
    }
  }, [initialPage]);

  // ============================================================================
  // LOAD DOCUMENT & INITIALIZE PDF.JS (Account switch & lifecycle safety)
  // ============================================================================
  useEffect(() => {
    let isCancelled = false;
    let localLoadingTask: any = null;
    let localPdfDoc: any = null;

    const handleAccountChange = () => {
      onClose();
    };
    window.addEventListener('sign_out_candidate', handleAccountChange);
    window.addEventListener('user_auth_updated', handleAccountChange);

    const loadPdfDocument = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const meta = await pdfVault.getMetadata(docId, userId);
        if (!meta) {
          if (!isCancelled) {
            setErrorMessage('Document not found in your vault partition, or access denied.');
            setIsLoading(false);
          }
          return;
        }
        if (!isCancelled) {
          setMetadata(meta);
        }

        const blob = await pdfVault.getBinaryBlob(docId, userId);
        if (!blob) {
          if (!isCancelled) {
            setErrorMessage('Unable to load document binary data from local vault storage.');
            setIsLoading(false);
          }
          return;
        }

        const pdfjsLib = await import('pdfjs-dist');
        if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
          try {
            pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
              'pdfjs-dist/build/pdf.worker.min.mjs',
              import.meta.url
            ).toString();
          } catch {}
        }

        const arrayBuffer = await blob.arrayBuffer();
        if (isCancelled) return;

        const loadingTask = pdfjsLib.getDocument({
          data: arrayBuffer,
          isEvalSupported: false
        });
        localLoadingTask = loadingTask;

        const loadedDoc = await loadingTask.promise;
        if (isCancelled) {
          await loadedDoc.destroy();
          return;
        }

        localPdfDoc = loadedDoc;
        setPdfDoc(loadedDoc);
        setTotalPages(loadedDoc.numPages);
        
        // Clamping initial page within total page count bounds
        const safeStartPage = Math.min(Math.max(1, initialPage), loadedDoc.numPages);
        setCurrentPage(safeStartPage);
        setIsLoading(false);
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error('[PrivatePdfViewer] Load error:', err);
          setErrorMessage(`Failed to initialize PDF: ${msg}`);
          setIsLoading(false);
        }
      }
    };

    void loadPdfDocument();

    return () => {
      isCancelled = true;
      window.removeEventListener('sign_out_candidate', handleAccountChange);
      window.removeEventListener('user_auth_updated', handleAccountChange);

      if (localLoadingTask) {
        try {
          void localLoadingTask.destroy();
        } catch {}
        localLoadingTask = null;
      }

      if (renderTaskLeftRef.current) {
        try {
          renderTaskLeftRef.current.cancel();
        } catch {}
        renderTaskLeftRef.current = null;
      }
      if (renderTaskRightRef.current) {
        try {
          renderTaskRightRef.current.cancel();
        } catch {}
        renderTaskRightRef.current = null;
      }
      if (localPdfDoc) {
        try {
          void localPdfDoc.cleanup();
          void localPdfDoc.destroy();
        } catch {}
        localPdfDoc = null;
      }
    };
  }, [docId, userId, onClose, initialPage]);

  // Clean up PDF.js document when component unmounts
  useEffect(() => {
    return () => {
      if (pdfDoc) {
        try {
          void pdfDoc.cleanup();
          void pdfDoc.destroy();
        } catch {}
      }
    };
  }, [pdfDoc]);

  // ============================================================================
  // RENDER CURRENT PAGE(S) TO CANVAS
  // ============================================================================
  const renderSinglePage = useCallback(
    async (pageNum: number, canvas: HTMLCanvasElement, taskRef: React.MutableRefObject<any>) => {
      if (!pdfDoc || !canvas) return;

      if (taskRef.current) {
        try {
          taskRef.current.cancel();
        } catch {}
        taskRef.current = null;
      }

      try {
        const page = await pdfDoc.getPage(pageNum);
        const unscaledViewport = page.getViewport({ scale: 1.0 });

        let effectiveScale = zoomScale;
        if (containerRef.current && isMobileScreen) {
          const containerWidth = containerRef.current.clientWidth - 24;
          if (containerWidth > 0 && unscaledViewport.width > 0) {
            const fitScale = containerWidth / unscaledViewport.width;
            effectiveScale = fitScale * zoomScale;
          }
        }

        const viewport = page.getViewport({ scale: effectiveScale });
        const outputScale = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

        const renderContext = {
          canvasContext: ctx,
          transform: transform || undefined,
          viewport
        };

        const renderTask = page.render(renderContext);
        taskRef.current = renderTask;
        await renderTask.promise;
        taskRef.current = null;
      } catch (err: unknown) {
        const errObj = err as { name?: string };
        if (errObj && errObj.name === 'RenderingCancelledException') {
          return;
        }
        console.warn(`[PrivatePdfViewer] Error rendering page ${pageNum}:`, err);
      }
    },
    [pdfDoc, zoomScale, isMobileScreen]
  );

  useEffect(() => {
    if (!pdfDoc || isLoading) return;

    let isSubscribed = true;
    setIsRendering(true);

    const renderPages = async () => {
      if (canvasRefLeft.current) {
        await renderSinglePage(currentPage, canvasRefLeft.current, renderTaskLeftRef);
      }

      if (isTwoPageMode && !isMobileScreen && currentPage + 1 <= totalPages && canvasRefRight.current) {
        await renderSinglePage(currentPage + 1, canvasRefRight.current, renderTaskRightRef);
      }

      if (isSubscribed) {
        setIsRendering(false);
      }
    };

    void renderPages();

    return () => {
      isSubscribed = false;
      if (renderTaskLeftRef.current) {
        try {
          renderTaskLeftRef.current.cancel();
        } catch {}
      }
      if (renderTaskRightRef.current) {
        try {
          renderTaskRightRef.current.cancel();
        } catch {}
      }
    };
  }, [pdfDoc, currentPage, zoomScale, isTwoPageMode, isMobileScreen, isLoading, totalPages, renderSinglePage]);

  // ============================================================================
  // NAVIGATION HANDLERS
  // ============================================================================
  const handlePrevPage = () => {
    const step = isTwoPageMode && !isMobileScreen ? 2 : 1;
    setCurrentPage((prev) => Math.max(1, prev - step));
  };

  const handleNextPage = () => {
    const step = isTwoPageMode && !isMobileScreen ? 2 : 1;
    setCurrentPage((prev) => Math.min(totalPages, prev + step));
  };

  const handleJumpToPage = (targetPage: number) => {
    if (targetPage >= 1 && targetPage <= totalPages) {
      setCurrentPage(targetPage);
    }
  };

  const handleJumpPageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
    } else {
      setJumpPageInput(String(currentPage));
    }
  };

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(2.5, Math.round((prev + 0.15) * 100) / 100));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(0.5, Math.round((prev - 0.15) * 100) / 100));
  };

  const handleResetZoom = () => {
    setZoomScale(1.0);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        handlePrevPage();
      } else if (e.key === 'ArrowRight') {
        handleNextPage();
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalPages, isTwoPageMode, isMobileScreen]);

  // Structural targets from metadata inventory or selected test boundary
  const inventory = metadata?.inspection?.inventory;
  const activeTest = propSelectedTest || inventory?.tests?.[0] || null;

  const listeningPage = activeTest?.modules?.listening?.pageRange?.start?.pageNumber;
  const readingPage = activeTest?.modules?.reading?.pageRange?.start?.pageNumber;
  const writingPage = activeTest?.modules?.writing?.pageRange?.start?.pageNumber;
  const speakingPage = activeTest?.modules?.speaking?.pageRange?.start?.pageNumber;
  const answerKeyPage = inventory?.answerKeySection?.pageRange?.start?.pageNumber;
  const audioscriptsPage = inventory?.listeningScriptsSection?.pageRange?.start?.pageNumber;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900 text-slate-100 select-none overflow-hidden animate-fade-in">
      {/* ================= TOP MAIN TOOLBAR ================= */}
      <header className="h-14 bg-slate-950/95 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0 z-10 backdrop-blur-md">
        {/* Left: Back & Document Info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
            title="Close Viewer and Return to Vault"
            aria-label="Close Viewer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex flex-col min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-[180px] sm:max-w-xs md:max-w-md">
              {metadata?.fileName || 'Private Document'}
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              {metadata?.detectedVolume ? (
                <span>Practice Book {metadata.detectedVolume}</span>
              ) : (
                <span>Private PDF</span>
              )}
              <span aria-hidden="true">·</span>
              <span>{totalPages} {totalPages === 1 ? 'page' : 'pages'}</span>
              {metadata?.inspection?.inspectionStatus === 'scanned_no_text' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-400 font-medium">Scanned PDF</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center: Page Navigation & Jump (Desktop) */}
        <div className="hidden sm:flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent text-slate-300 transition"
            title="Previous Page (Left Arrow)"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <form onSubmit={handleJumpPageSubmit} className="flex items-center gap-1">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={jumpPageInput}
              onChange={(e) => setJumpPageInput(e.target.value)}
              className="w-11 text-center py-1 bg-slate-950 border border-slate-700 rounded-md text-xs font-mono font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              title="Jump to Page"
              aria-label="Jump to page number"
            />
            <span className="text-xs text-slate-400 font-mono">/ {totalPages}</span>
          </form>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent text-slate-300 transition"
            title="Next Page (Right Arrow)"
            aria-label="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Controls & Response Workspace Toggle */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Split Workspace Toggle */}
          <button
            type="button"
            onClick={() => setShowWorkspace((prev) => !prev)}
            className={`min-h-[44px] px-3 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              showWorkspace
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
            title="Toggle Split Practice Response Workspace"
          >
            {showWorkspace ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            <span className="hidden md:inline">{showWorkspace ? 'Hide Workspace' : 'Response Sheet'}</span>
          </button>

          {/* Two-page spread toggle (desktop only) */}
          {!isMobileScreen && !showWorkspace && (
            <button
              type="button"
              onClick={() => setIsTwoPageMode((prev) => !prev)}
              className={`min-h-[44px] px-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition ${
                isTwoPageMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
              }`}
              title="Toggle Two-Page Spread"
            >
              <Columns className="w-4 h-4" />
              <span className="hidden md:inline">{isTwoPageMode ? 'Two Pages' : 'Single Page'}</span>
            </button>
          )}

          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoomScale <= 0.5}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800/80 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition cursor-pointer"
            title="Zoom Out (-)"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoomScale >= 2.5}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800/80 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition cursor-pointer"
            title="Zoom In (+)"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800/80 hover:bg-rose-900/40 hover:text-rose-300 text-slate-300 transition cursor-pointer"
            title="Close Viewer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ================= STRUCTURAL QUICK JUMP BAR ================= */}
      {(listeningPage || readingPage || writingPage || speakingPage || answerKeyPage || audioscriptsPage) && (
        <div className="bg-slate-950 border-b border-slate-800/80 px-3 py-1.5 flex items-center gap-2 overflow-x-auto scrollbar-none text-xs">
          <span className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider shrink-0 pr-1">
            Jump to Section:
          </span>

          {listeningPage && (
            <button
              type="button"
              onClick={() => {
                handleJumpToPage(listeningPage);
                setWorkspaceModule('listening');
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-blue-900/60 text-slate-300 hover:text-blue-300 border border-slate-800 hover:border-blue-700 font-medium transition flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Headphones className="w-3 h-3 text-blue-400" />
              <span>Listening (p.{listeningPage})</span>
            </button>
          )}

          {readingPage && (
            <button
              type="button"
              onClick={() => {
                handleJumpToPage(readingPage);
                setWorkspaceModule('reading');
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-blue-900/60 text-slate-300 hover:text-blue-300 border border-slate-800 hover:border-blue-700 font-medium transition flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <BookOpen className="w-3 h-3 text-blue-400" />
              <span>Reading (p.{readingPage})</span>
            </button>
          )}

          {writingPage && (
            <button
              type="button"
              onClick={() => {
                handleJumpToPage(writingPage);
                setWorkspaceModule('writing');
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-blue-900/60 text-slate-300 hover:text-blue-300 border border-slate-800 hover:border-blue-700 font-medium transition flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <PenTool className="w-3 h-3 text-blue-400" />
              <span>Writing (p.{writingPage})</span>
            </button>
          )}

          {speakingPage && (
            <button
              type="button"
              onClick={() => {
                handleJumpToPage(speakingPage);
                setWorkspaceModule('speaking');
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-blue-900/60 text-slate-300 hover:text-blue-300 border border-slate-800 hover:border-blue-700 font-medium transition flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Mic className="w-3 h-3 text-blue-400" />
              <span>Speaking (p.{speakingPage})</span>
            </button>
          )}

          {audioscriptsPage && (
            <button
              type="button"
              onClick={() => handleJumpToPage(audioscriptsPage)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-purple-900/60 text-slate-300 hover:text-purple-300 border border-slate-800 hover:border-purple-700 font-medium transition flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <FileCheck className="w-3 h-3 text-purple-400" />
              <span>Audioscripts (p.{audioscriptsPage})</span>
            </button>
          )}

          {answerKeyPage && (
            <button
              type="button"
              onClick={() => handleJumpToPage(answerKeyPage)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-emerald-900/60 text-slate-300 hover:text-emerald-300 border border-slate-800 hover:border-emerald-700 font-medium transition flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Key className="w-3 h-3 text-emerald-400" />
              <span>Answer Key (p.{answerKeyPage})</span>
            </button>
          )}
        </div>
      )}

      {/* ================= MOBILE VIEWPORT TAB SWITCHER ================= */}
      {isMobileScreen && showWorkspace && (
        <div className="bg-slate-950 p-2 border-b border-slate-800 grid grid-cols-2 gap-2 text-xs font-bold sm:hidden">
          <button
            type="button"
            onClick={() => setMobileTab('pdf')}
            className={`py-2 rounded-xl transition ${
              mobileTab === 'pdf' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400'
            }`}
          >
            PDF Viewer Reference
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('workspace')}
            className={`py-2 rounded-xl transition ${
              mobileTab === 'workspace' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400'
            }`}
          >
            Response Sheet Workspace
          </button>
        </div>
      )}

      {/* ================= MAIN SPLIT CONTENT AREA ================= */}
      <div className="flex-1 w-full flex overflow-hidden">
        {/* PDF VIEWPORT */}
        <main
          ref={containerRef}
          className={`flex-1 h-full overflow-auto bg-slate-950 p-2 sm:p-6 flex flex-col items-center justify-start relative scrollbar-thin scrollbar-thumb-slate-800 ${
            isMobileScreen && showWorkspace && mobileTab !== 'pdf' ? 'hidden' : 'flex'
          }`}
        >
          {/* Loading State */}
          {isLoading && (
            <div className="my-auto flex flex-col items-center gap-3 p-8">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm font-medium text-slate-300">
                Loading document from private local vault...
              </p>
              <span className="text-xs text-slate-500">
                Zero network transfer · Client-side rendering
              </span>
            </div>
          )}

          {/* Error State */}
          {errorMessage && !isLoading && (
            <div className="my-auto max-w-md p-6 bg-slate-900 rounded-2xl border border-red-500/40 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-500/40 flex items-center justify-center mx-auto text-red-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Document Display Error</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {errorMessage}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
              >
                Return to Vault Manager
              </button>
            </div>
          )}

          {/* Render Canvas Container */}
          {!isLoading && !errorMessage && (
            <div className="flex flex-col lg:flex-row items-center justify-center gap-4 my-auto">
              <div className="relative shadow-2xl rounded-sm overflow-hidden bg-white">
                <canvas ref={canvasRefLeft} className="block max-w-full" />
                {isRendering && (
                  <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1px] flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                  </div>
                )}
              </div>

              {isTwoPageMode && !isMobileScreen && !showWorkspace && currentPage + 1 <= totalPages && (
                <div className="relative shadow-2xl rounded-sm overflow-hidden bg-white">
                  <canvas ref={canvasRefRight} className="block max-w-full" />
                  {isRendering && (
                    <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1px] flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>

        {/* RESPONSE WORKSPACE PANEL */}
        {showWorkspace && (
          <aside
            className={`w-full sm:w-[420px] md:w-[460px] lg:w-[500px] h-full shrink-0 ${
              isMobileScreen && mobileTab !== 'workspace' ? 'hidden' : 'block'
            }`}
          >
            <PrivateResponseWorkspace
              documentTitle={metadata?.fileName || 'Private PDF'}
              selectedTest={activeTest}
              activeModule={workspaceModule}
              onModuleChange={setWorkspaceModule}
              onJumpToPdfPage={handleJumpToPage}
              onShowToast={onShowToast || (() => {})}
              onCloseWorkspace={() => setShowWorkspace(false)}
            />
          </aside>
        )}
      </div>

      {/* ================= MOBILE BOTTOM NAVIGATION ================= */}
      <footer className="sm:hidden h-14 bg-slate-950/95 border-t border-slate-800 px-3 flex items-center justify-between gap-2 shrink-0 z-10">
        <button
          type="button"
          onClick={handlePrevPage}
          disabled={currentPage <= 1}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-white disabled:opacity-30 transition cursor-pointer"
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <form onSubmit={handleJumpPageSubmit} className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 font-mono">Page</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={jumpPageInput}
            onChange={(e) => setJumpPageInput(e.target.value)}
            className="w-12 text-center py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            aria-label="Page number"
          />
          <span className="text-xs text-slate-400 font-mono">of {totalPages}</span>
        </form>

        <button
          type="button"
          onClick={handleNextPage}
          disabled={currentPage >= totalPages}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-white disabled:opacity-30 transition cursor-pointer"
          aria-label="Next Page"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </footer>
    </div>
  );
};
