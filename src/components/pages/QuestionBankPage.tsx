import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  BookOpen,
  Camera,
  CheckCircle2,
  Trash2,
  Award,
  Clock,
  Sparkles,
  Filter,
  FileText,
  Copy,
  Check,
  Maximize2,
  X,
  Volume2,
  VolumeX,
  ShieldCheck,
  Lock,
  Loader2,
  EyeOff,
  Eye,
  Play,
  Flag,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { IELTS_QUESTION_BANK, QuestionBankItem } from '../../data/ieltsQuestionBankData';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';
import {
  CompletedRecord,
  VerifiedExamTrack,
  VerifiedModule,
  VerifiedQuestionSet,
  fetchSharedVerifiedQuestions,
  generateVerifiedDrillViaApi,
  getCompletedQuestionMap,
  markQuestionCompleted,
  reportVerifiedQuestionIssue
} from '../../services/verifiedQuestionBankService';
import { VerifiedDrillPlayer } from '../questions/VerifiedDrillPlayer';
import { PrivatePdfExamRoom } from '../questions/PrivatePdfExamRoom';

interface QuestionBankPageProps {
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

export interface UserSubmission {
  id: string;
  questionId: string;
  questionTitle: string;
  module: string;
  submissionType: 'text' | 'photo' | 'both';
  textAnswer?: string;
  photoUrl?: string;
  wordCount: number;
  submittedAt: string;
  selfAssessedBand?: string;
}

const STORAGE_SUBMISSIONS_KEY = 'ielts_qb_submissions_v1';

const QUESTION_TYPES_BY_MODULE: Record<VerifiedModule, string[]> = {
  reading: [
    'True / False / Not Given',
    'Yes / No / Not Given',
    'Multiple Choice (A–D)',
    'Summary / Note Completion',
    'Matching Headings & Information'
  ],
  listening: [
    'Part 1 Form & Note Completion (Distractors)',
    'Part 2 Local Map / Multiple Choice',
    'Part 3 Academic Tutorial Discussion (MCQ)',
    'Part 4 University Lecture Note Completion'
  ],
  writing: [
    'Task 1 Academic Bar / Line Chart Data Report',
    'Task 2 Opinion (Agree or Disagree) Essay',
    'Task 2 Discuss Both Views & Give Opinion',
    'Task 2 Problem & Solution Essay',
    'Task 1 General Training Formal Letter'
  ],
  speaking: [
    'Part 2 Cue Card + Part 3 Analytical Follow-up',
    'Part 1 Everyday Fluency & Paraphrasing',
    'Part 3 Abstract Debate & Hedging'
  ]
};

const TOPIC_PRESETS = [
  'Urban Sustainability',
  'Artificial Intelligence & Work',
  'Marine Ecology & Climate',
  'Public Health & Nutrition',
  'Higher Education & Remote Learning',
  'Cultural Heritage & Architecture',
  'Renewable Energy Transition',
  'Behavioural Psychology'
];

export const QuestionBankPage: React.FC<QuestionBankPageProps> = ({ onBack: _onBack, onShowToast }) => {
  const [activeViewTab, setActiveViewTab] = useState<'bank' | 'factory' | 'private-pdf' | 'submissions'>('bank');

  // Shared Verified Bank & No-Repeat State
  const [cloudDrills, setCloudDrills] = useState<VerifiedQuestionSet[]>([]);
  const [isLoadingCloud, setIsLoadingCloud] = useState<boolean>(true);
  const [completedMap, setCompletedMap] = useState<Record<string, CompletedRecord>>(() =>
    getCompletedQuestionMap()
  );
  const [hideCompleted, setHideCompleted] = useState<boolean>(false);
  const [activeVerifiedDrill, setActiveVerifiedDrill] = useState<VerifiedQuestionSet | null>(null);

  // Curated Bank Filters
  const [selectedModule, setSelectedModule] = useState<string>('All');
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuestion, setActiveQuestion] = useState<QuestionBankItem | null>(null);

  // Curated Question Answer State
  const [typedAnswer, setTypedAnswer] = useState('');
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [photoPreviewModal, setPhotoPreviewModal] = useState<string | null>(null);
  const [answerTab, setAnswerTab] = useState<'type' | 'photo'>('type');
  const [showModelAnswer, setShowModelAnswer] = useState(false);
  const [isPlayingModelAudio, setIsPlayingModelAudio] = useState(false);
  const [copiedModel, setCopiedModel] = useState(false);
  const [reportingCuratedId, setReportingCuratedId] = useState<string | null>(null);

  // Layer 2: Fresh Drill Factory State
  const [genModule, setGenModule] = useState<VerifiedModule>('reading');
  const [genTrack, setGenTrack] = useState<VerifiedExamTrack>('Academic');
  const [genType, setGenType] = useState<string>(QUESTION_TYPES_BY_MODULE.reading[0]);
  const [genTopic, setGenTopic] = useState<string>(TOPIC_PRESETS[0]);
  const [genTargetBand, setGenTargetBand] = useState<number>(7.5);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStage, setGenerationStage] = useState<string>('');
  const [genElapsedSec, setGenElapsedSec] = useState<number>(0);
  const [genError, setGenError] = useState<string | null>(null);
  const genAbortRef = useRef<AbortController | null>(null);

  // Submissions history
  const [submissions, setSubmissions] = useState<UserSubmission[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SUBMISSIONS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadCloudDrills = async () => {
    setIsLoadingCloud(true);
    try {
      const items = await fetchSharedVerifiedQuestions();
      setCloudDrills(items);
    } finally {
      setIsLoadingCloud(false);
    }
  };

  useEffect(() => {
    loadCloudDrills();
    setCompletedMap(getCompletedQuestionMap());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SUBMISSIONS_KEY, JSON.stringify(submissions));
    } catch {}
  }, [submissions]);

  useEffect(() => {
    return () => {
      stopSpeech();
      genAbortRef.current?.abort();
    };
  }, []);

  const handleSelectGenModule = (mod: VerifiedModule) => {
    setGenModule(mod);
    setGenType(QUESTION_TYPES_BY_MODULE[mod][0]);
  };

  const handleCancelGeneration = () => {
    genAbortRef.current?.abort();
  };

  const handleGenerateFreshDrill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGenerating) return;
    setGenError(null);
    setIsGenerating(true);
    setGenElapsedSec(0);
    setGenerationStage('Pass 1 of 2: Drafting original Cambridge 15–21 blueprint drill...');

    const controller = new AbortController();
    genAbortRef.current = controller;

    const elapsedInterval = window.setInterval(() => {
      setGenElapsedSec((sec) => sec + 1);
    }, 1000);

    const stageTimer = window.setTimeout(() => {
      setGenerationStage('Pass 2 of 2: Independent Blind Examiner verifying every answer...');
    }, 4500);

    try {
      const savedDrill = await generateVerifiedDrillViaApi(
        {
          module: genModule,
          examTrack: genTrack,
          questionType: genType,
          topic: genTopic.trim() || 'Global Innovation',
          targetBand: genTargetBand
        },
        controller.signal
      );
      setCloudDrills((prev) => [savedDrill, ...prev.filter((d) => d.id !== savedDrill.id)]);
      soundManager.playSuccess();
      onShowToast(
        `Blind-Verified drill ready (${savedDrill.qualityScore}/100)! ${
          savedDrill._isCloudSynced ? 'Synced to shared Question Bank.' : 'Saved locally.'
        }`
      );
      setActiveVerifiedDrill(savedDrill);
    } catch (err: any) {
      if (err?.message === 'Drill generation cancelled.') {
        onShowToast('Drill generation cancelled.');
      } else {
        setGenError(err?.message || 'Could not generate a verified drill right now. Please try again.');
      }
    } finally {
      window.clearInterval(elapsedInterval);
      window.clearTimeout(stageTimer);
      genAbortRef.current = null;
      setIsGenerating(false);
      setGenerationStage('');
      setGenElapsedSec(0);
    }
  };

  const modules = [
    'All',
    'Reading',
    'Listening',
    'Writing Task 2',
    'Writing Task 1',
    'Speaking Part 1',
    'Speaking Part 2',
    'Speaking Part 3'
  ];

  const topics = [
    'All',
    'Technology',
    'Environment',
    'Education',
    'Society & Culture',
    'Economy & Work',
    'Health',
    'Urbanization'
  ];

  const matchesModuleFilter = (modStr: string): boolean => {
    if (selectedModule === 'All') return true;
    const normSel = selectedModule.toLowerCase();
    const normItem = modStr.toLowerCase();
    if (normSel === normItem) return true;
    if (normSel.startsWith('writing') && normItem === 'writing') return true;
    if (normSel.startsWith('speaking') && normItem === 'speaking') return true;
    return false;
  };

  const filteredCloudDrills = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return cloudDrills.filter((drill) => {
      if (hideCompleted && completedMap[drill.id]) return false;
      if (!matchesModuleFilter(drill.module)) return false;
      const matchTopic =
        selectedTopic === 'All' || drill.topic.toLowerCase().includes(selectedTopic.toLowerCase());
      const matchSearch =
        !q ||
        drill.title.toLowerCase().includes(q) ||
        drill.topic.toLowerCase().includes(q) ||
        drill.questionType.toLowerCase().includes(q) ||
        drill.prompt.toLowerCase().includes(q);
      return matchTopic && matchSearch;
    });
  }, [cloudDrills, hideCompleted, completedMap, selectedModule, selectedTopic, searchQuery]);

  const filteredCuratedQuestions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return IELTS_QUESTION_BANK.filter((item) => {
      if (hideCompleted && completedMap[item.id]) return false;
      const matchModule = selectedModule === 'All' || item.module === selectedModule;
      const matchTopic = selectedTopic === 'All' || item.topic === selectedTopic;
      const matchSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.prompt.toLowerCase().includes(q) ||
        item.subType.toLowerCase().includes(q);
      return matchModule && matchTopic && matchSearch;
    });
  }, [hideCompleted, completedMap, selectedModule, selectedTopic, searchQuery]);

  const totalBankCount = cloudDrills.length + IELTS_QUESTION_BANK.length;
  const completedCount = Object.keys(completedMap).length;
  const wordCount = typedAnswer.trim() ? typedAnswer.trim().split(/\s+/).length : 0;

  const handleMarkCompleted = (id: string, scorePercent?: number) => {
    const updated = markQuestionCompleted(id, scorePercent);
    setCompletedMap(updated);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      onShowToast('Image size exceeds 5MB limit. Please choose a smaller photo.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setUploadedPhotoUrl(base64);
      soundManager.playSuccess();
      onShowToast('Photo of handwritten answer sheet uploaded.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setUploadedPhotoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onShowToast('Photo removed.');
  };

  const handleSaveSubmission = () => {
    if (!activeQuestion) return;
    if (!typedAnswer.trim() && !uploadedPhotoUrl) {
      onShowToast('Please type your response or upload a photo of your answer sheet.');
      return;
    }

    const submissionType: 'text' | 'photo' | 'both' =
      typedAnswer.trim() && uploadedPhotoUrl ? 'both' : uploadedPhotoUrl ? 'photo' : 'text';

    const newSub: UserSubmission = {
      id: 'sub_' + Date.now(),
      questionId: activeQuestion.id,
      questionTitle: activeQuestion.title,
      module: activeQuestion.module,
      submissionType,
      textAnswer: typedAnswer.trim() || undefined,
      photoUrl: uploadedPhotoUrl || undefined,
      wordCount: wordCount > 0 ? wordCount : 250,
      submittedAt: new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    setSubmissions((prev) => [newSub, ...prev]);
    handleMarkCompleted(activeQuestion.id);
    soundManager.playSuccess();
    onShowToast('Answer saved & question marked completed!');
    setShowModelAnswer(true);
  };

  const handlePlayModelAudio = () => {
    if (!activeQuestion) return;
    if (isPlayingModelAudio) {
      stopSpeech();
      setIsPlayingModelAudio(false);
      return;
    }
    setIsPlayingModelAudio(true);
    speakBritish(activeQuestion.modelAnswer, {
      onEnd: () => setIsPlayingModelAudio(false),
      onError: () => setIsPlayingModelAudio(false)
    });
  };

  const handleCopyModel = () => {
    if (!activeQuestion) return;
    navigator.clipboard.writeText(activeQuestion.modelAnswer);
    setCopiedModel(true);
    onShowToast('Model answer copied.');
    setTimeout(() => setCopiedModel(false), 2000);
  };

  const handleQuickReportCurated = async (qItem: QuestionBankItem) => {
    setReportingCuratedId(qItem.id);
    try {
      const res = await reportVerifiedQuestionIssue({
        questionId: qItem.id,
        module: qItem.module.toLowerCase().split(' ')[0] || 'writing',
        title: qItem.title,
        issueType: 'Content Review Requested',
        isCloudSynced: false
      });
      onShowToast(res.message);
    } catch (err: any) {
      onShowToast(err?.message || 'Could not report issue right now.');
    } finally {
      setReportingCuratedId(null);
    }
  };

  const handleDeleteSubmission = (subId: string) => {
    setSubmissions((prev) => prev.filter((s) => s.id !== subId));
    onShowToast('Submission deleted.');
  };

  // Full Split-Screen CD-IELTS Runner for any Blind-Verified Drill
  if (activeVerifiedDrill) {
    return (
      <div className="w-full max-w-6xl mx-auto">
        <VerifiedDrillPlayer
          drill={activeVerifiedDrill}
          onBack={() => setActiveVerifiedDrill(null)}
          onComplete={(id, pct) => handleMarkCompleted(id, pct)}
          onShowToast={onShowToast}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Editorial Pine Hero Banner */}
      <div className="bg-[#0F4C45] dark:bg-[#0D3833] text-white p-6 sm:p-7 rounded-2xl border border-[#1F8A70]/35 shadow-sm flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="text-[#F4A62A] font-bold uppercase tracking-wider">
              CAMBRIDGE 15–21 BLUEPRINT QUALITY
            </span>
            <span className="text-white/40">·</span>
            <span className="text-white/80">
              {totalBankCount} Verified &amp; Curated Items · {completedCount} Completed
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
            IELTS Question Bank &amp; Private Exam Room
          </h1>
          <p className="text-xs sm:text-sm text-white/80 max-w-2xl leading-relaxed">
            Practice shared <strong className="text-white">2-Pass Blind-Verified</strong> drills with zero repeats, generate fresh Cambridge-level passages &amp; Task 1 charts on demand, or convert your own personal study PDFs privately into a timed split-screen exam room.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveViewTab('factory')}
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#F4A62A] hover:bg-[#E0951F] text-[#0E1F1E] text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition"
        >
          <Sparkles className="w-4 h-4" />
          <span>Generate Fresh Drill</span>
        </button>
      </div>

      {/* 4 Main Mode Tabs */}
      <div className="flex border-b border-[#D3DDDA] dark:border-[#1E3330] gap-4 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveViewTab('bank')}
          className={`min-h-[44px] pb-3 px-2 text-xs font-semibold whitespace-nowrap transition border-b-2 -mb-[1px] flex items-center gap-1.5 cursor-pointer ${
            activeViewTab === 'bank'
              ? 'border-[#0F4C45] dark:border-[#F4A62A] text-[#0F4C45] dark:text-[#EEF3F1] font-bold'
              : 'border-transparent text-[#566664] dark:text-[#96B0AC] hover:text-[#0E1F1E]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Verified Bank ({totalBankCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveViewTab('factory')}
          className={`min-h-[44px] pb-3 px-2 text-xs font-semibold whitespace-nowrap transition border-b-2 -mb-[1px] flex items-center gap-1.5 cursor-pointer ${
            activeViewTab === 'factory'
              ? 'border-[#0F4C45] dark:border-[#F4A62A] text-[#0F4C45] dark:text-[#EEF3F1] font-bold'
              : 'border-transparent text-[#566664] dark:text-[#96B0AC] hover:text-[#0E1F1E]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Generate Fresh Drill (2-Pass)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveViewTab('private-pdf')}
          className={`min-h-[44px] pb-3 px-2 text-xs font-semibold whitespace-nowrap transition border-b-2 -mb-[1px] flex items-center gap-1.5 cursor-pointer ${
            activeViewTab === 'private-pdf'
              ? 'border-[#0F4C45] dark:border-[#F4A62A] text-[#0F4C45] dark:text-[#EEF3F1] font-bold'
              : 'border-transparent text-[#566664] dark:text-[#96B0AC] hover:text-[#0E1F1E]'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Private PDF Exam Room</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveViewTab('submissions')}
          className={`min-h-[44px] pb-3 px-2 text-xs font-semibold whitespace-nowrap transition border-b-2 -mb-[1px] flex items-center gap-1.5 cursor-pointer ${
            activeViewTab === 'submissions'
              ? 'border-[#0F4C45] dark:border-[#F4A62A] text-[#0F4C45] dark:text-[#EEF3F1] font-bold'
              : 'border-transparent text-[#566664] dark:text-[#96B0AC] hover:text-[#0E1F1E]'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>My Submissions ({submissions.length})</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: VERIFIED BANK + CURATED ITEMS + NO-REPEAT TRACKER              */}
      {/* ===================================================================== */}
      {activeViewTab === 'bank' && (
        <div className="space-y-6">
          {/* Search + No-Repeat Toggle + Refresh */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#566664] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search prompt, topic, or question type (e.g. True/False/Not Given, Chart, AI)..."
                  className="w-full min-h-[44px] pl-9 pr-4 py-2 rounded-xl border border-[#D3DDDA] dark:border-[#1E3330] text-xs sm:text-sm bg-white dark:bg-[#11201E] text-[#0E1F1E] dark:text-[#EEF3F1] focus:outline-none focus:border-[#0F4C45]"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setHideCompleted((v) => !v);
                  soundManager.playBeep(640, 0.03);
                }}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition shrink-0 ${
                  hideCompleted
                    ? 'bg-[#0F4C45] text-white border-[#0F4C45]'
                    : 'bg-white dark:bg-[#11201E] text-[#0E1F1E] dark:text-[#EEF3F1] border-[#D3DDDA] dark:border-[#1E3330] hover:border-[#0F4C45]'
                }`}
              >
                {hideCompleted ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{hideCompleted ? 'Hiding Completed' : 'Hide Completed'} ({completedCount})</span>
              </button>

              <button
                type="button"
                onClick={loadCloudDrills}
                disabled={isLoadingCloud}
                className="min-h-[44px] px-3 py-2 rounded-xl border border-[#D3DDDA] dark:border-[#1E3330] bg-white dark:bg-[#11201E] text-[#566664] dark:text-[#96B0AC] hover:border-[#0F4C45] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                title="Refresh cloud blind-verified sets"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingCloud ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Module Filter Row */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {modules.map((mod) => {
                const isActive = selectedModule === mod;
                return (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => {
                      setSelectedModule(mod);
                      soundManager.playBeep(600, 0.03);
                    }}
                    className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border cursor-pointer ${
                      isActive
                        ? 'bg-[#0F4C45] text-white border-[#0F4C45]'
                        : 'bg-white dark:bg-[#11201E] text-[#566664] dark:text-[#96B0AC] border-[#D3DDDA] dark:border-[#1E3330] hover:border-[#0F4C45]'
                    }`}
                  >
                    {mod}
                  </button>
                );
              })}
            </div>

            {/* Topic Filter Row */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#566664] dark:text-[#96B0AC] font-bold mr-1 flex items-center gap-1 shrink-0">
                <Filter className="w-3 h-3" /> Topic:
              </span>
              {topics.map((top) => {
                const isActive = selectedTopic === top;
                return (
                  <button
                    key={top}
                    type="button"
                    onClick={() => {
                      setSelectedTopic(top);
                      soundManager.playBeep(620, 0.03);
                    }}
                    className={`min-h-[34px] px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition border cursor-pointer ${
                      isActive
                        ? 'bg-[#0E1F1E] dark:bg-[#F4A62A] text-white dark:text-[#0E1F1E] border-[#0E1F1E] dark:border-[#F4A62A]'
                        : 'bg-[#F7F9F8] dark:bg-[#0B1716] text-[#566664] dark:text-[#96B0AC] border-[#D3DDDA] dark:border-[#1E3330] hover:border-[#0F4C45]'
                    }`}
                  >
                    {top}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION A: Shared Cloud Blind-Verified Drills */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#0F4C45] dark:text-[#7CD4C4]" />
                <h2 className="text-sm sm:text-base font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                  Shared 2-Pass Blind-Verified Drills ({filteredCloudDrills.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveViewTab('factory')}
                className="text-xs font-bold text-[#0F4C45] dark:text-[#F4A62A] hover:underline cursor-pointer"
              >
                + Create New Drill
              </button>
            </div>

            {isLoadingCloud && cloudDrills.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1E3330] flex items-center gap-3 text-xs text-[#566664]">
                <Loader2 className="w-4 h-4 animate-spin text-[#0F4C45]" />
                <span>Syncing blind-verified drills from shared question bank...</span>
              </div>
            ) : filteredCloudDrills.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white dark:bg-[#11201E] border border-dashed border-[#0F4C45]/35 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                    {cloudDrills.length === 0
                      ? 'Ready to mint your first 2-Pass Blind-Verified Drill'
                      : 'No shared drills match your current filters'}
                  </div>
                  <p className="text-xs text-[#566664] dark:text-[#96B0AC]">
                    Generate a fresh Cambridge-blueprint Reading, Listening, Writing (with live Task 1 charts), or Speaking drill — Pass 2 verifies every answer blind and saves it permanently to the shared bank.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveViewTab('factory')}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0D3833] text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#F4A62A]" />
                  <span>Open Fresh Drill Studio</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCloudDrills.map((drill) => {
                  const done = completedMap[drill.id];
                  return (
                    <div
                      key={drill.id}
                      onClick={() => setActiveVerifiedDrill(drill)}
                      className="bg-white dark:bg-[#11201E] rounded-2xl border border-[#D3DDDA] dark:border-[#1E3330] hover:border-[#0F4C45] p-5 transition cursor-pointer flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                          <span className="font-bold uppercase text-[#0F4C45] dark:text-[#7CD4C4]">
                            {drill.module} · {drill.examTrack} · Band {drill.targetBand.toFixed(1)}
                          </span>
                          <span className="font-bold text-[#0F4C45] dark:text-[#F4A62A] flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {drill.qualityScore}/100
                          </span>
                        </div>

                        <div>
                          <h3 className="text-sm sm:text-base font-bold text-[#0E1F1E] dark:text-[#EEF3F1] line-clamp-1">
                            {drill.title}
                          </h3>
                          <p className="text-xs text-[#566664] dark:text-[#96B0AC] line-clamp-2 mt-1 leading-relaxed">
                            {drill.prompt}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[#566664] dark:text-[#96B0AC]">
                          <span>{drill.questionType}</span>
                          <span>·</span>
                          <span>{drill.questions?.length || 0} Qs</span>
                          {drill.chartData && (
                            <>
                              <span>·</span>
                              <span className="text-[#0F4C45] dark:text-[#F4A62A] font-semibold">Live SVG Chart</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#D3DDDA]/60 dark:border-[#1E3330] flex items-center justify-between">
                        <span className="text-xs font-bold text-[#0F4C45] dark:text-[#7CD4C4] flex items-center gap-1.5">
                          <Play className="w-3.5 h-3.5" />
                          <span>Launch Split-Screen Drill</span>
                        </span>
                        {done ? (
                          <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {done.scorePercent !== undefined ? `${done.scorePercent}%` : 'Done'}
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-[#566664] dark:text-[#96B0AC]">New</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION B: Curated Exam Prompts & Handwritten Upload */}
          <div className="space-y-3 pt-2">
            <h2 className="text-sm sm:text-base font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
              Curated High-Yield Exam Prompts ({filteredCuratedQuestions.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCuratedQuestions.map((qItem) => {
                const isSelected = activeQuestion?.id === qItem.id;
                const done = completedMap[qItem.id];
                return (
                  <div
                    key={qItem.id}
                    onClick={() => {
                      setActiveQuestion(qItem);
                      setShowModelAnswer(false);
                      setTypedAnswer('');
                      setUploadedPhotoUrl(null);
                      soundManager.playBeep(700, 0.03);
                    }}
                    className={`bg-white dark:bg-[#11201E] rounded-2xl border p-5 transition cursor-pointer flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'border-[#0F4C45] ring-2 ring-[#0F4C45]/15'
                        : 'border-[#D3DDDA] dark:border-[#1E3330] hover:border-[#0F4C45]'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                        <span className="font-bold text-[#0F4C45] dark:text-[#7CD4C4] uppercase">
                          {qItem.module}
                        </span>
                        <span className="text-[#B45309] dark:text-[#F4A62A] font-semibold">
                          {qItem.frequency}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-[#0E1F1E] dark:text-[#EEF3F1] line-clamp-1">
                          {qItem.title}
                        </h3>
                        <p className="text-xs text-[#566664] dark:text-[#96B0AC] line-clamp-2 mt-1 leading-relaxed">
                          "{qItem.prompt}"
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 text-[11px] text-[#566664] dark:text-[#96B0AC] font-mono">
                        <span>{qItem.subType}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          ~{qItem.suggestedTimeMinutes}m
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#D3DDDA]/60 dark:border-[#1E3330] flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0F4C45] dark:text-[#7CD4C4]">
                        Practice / Handwritten Upload
                      </span>
                      {done ? (
                        <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Done
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-[#566664]">→</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Workspace for Selected Curated Prompt */}
          {activeQuestion && (
            <div className="bg-white dark:bg-[#11201E] rounded-2xl border border-[#0F4C45]/35 p-5 sm:p-7 shadow-sm space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#D3DDDA] dark:border-[#1E3330] pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1 text-[11px] font-mono text-[#566664] dark:text-[#96B0AC]">
                    <span className="font-bold text-[#0F4C45] dark:text-[#7CD4C4] uppercase">
                      {activeQuestion.module} · {activeQuestion.subType}
                    </span>
                    <span>·</span>
                    <span>Benchmark {activeQuestion.modelBand}</span>
                    <span>·</span>
                    <span>Target: {activeQuestion.targetWordCount || '250 words'}</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                    {activeQuestion.title}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModelAnswer((prev) => !prev)}
                    className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1716] border border-[#D3DDDA] dark:border-[#1E3330] hover:border-[#0F4C45] text-[#0E1F1E] dark:text-[#EEF3F1] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5 text-[#F4A62A]" />
                    <span>{showModelAnswer ? 'Hide Model Answer' : 'View Model Answer'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={reportingCuratedId === activeQuestion.id}
                    onClick={() => handleQuickReportCurated(activeQuestion)}
                    className="min-h-[40px] px-3 py-2 rounded-xl border border-[#D3DDDA] dark:border-[#1E3330] text-[#566664] hover:text-rose-600 hover:border-rose-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Report</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveQuestion(null)}
                    className="min-h-[40px] px-2.5 py-2 rounded-xl text-[#566664] hover:text-[#0E1F1E] cursor-pointer"
                    aria-label="Close prompt workspace"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Prompt Box */}
              <div className="p-4 bg-[#F7F9F8] dark:bg-[#0B1716] border border-[#D3DDDA] dark:border-[#1E3330] rounded-xl text-xs sm:text-sm space-y-2">
                <div className="text-[11px] font-mono font-bold uppercase text-[#566664] dark:text-[#96B0AC]">
                  Exam Prompt
                </div>
                <p className="text-[#0E1F1E] dark:text-[#EEF3F1] font-medium leading-relaxed italic">
                  "{activeQuestion.prompt}"
                </p>

                {activeQuestion.cueCardBulletPoints && (
                  <div className="pl-4 pt-1 space-y-1 text-[#0E1F1E] dark:text-[#EEF3F1] text-xs">
                    <div className="text-[10px] font-mono font-bold text-[#566664] uppercase">
                      You should say:
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {activeQuestion.cueCardBulletPoints.map((pt, idx) => (
                        <li key={idx}>{pt}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Examiner Tips */}
              <div className="p-4 bg-[#F4A62A]/10 border border-[#F4A62A]/35 rounded-xl text-xs space-y-1">
                <div className="font-bold text-[#0E1F1E] dark:text-[#FEF3C7] flex items-center gap-1.5 font-mono">
                  <Sparkles className="w-3.5 h-3.5 text-[#D97706] dark:text-[#F4A62A]" />
                  <span>Examiner Scoring Strategy</span>
                </div>
                <ul className="list-disc pl-5 text-[#0E1F1E] dark:text-[#EEF3F1] space-y-0.5 leading-relaxed">
                  {activeQuestion.examinerTips.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>

              {/* Type vs Photo Upload */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D3DDDA] dark:border-[#1E3330] pb-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAnswerTab('type')}
                      className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        answerTab === 'type'
                          ? 'bg-[#0F4C45] text-white'
                          : 'bg-[#F7F9F8] dark:bg-[#0B1716] text-[#566664] dark:text-[#96B0AC]'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Type Response</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAnswerTab('photo')}
                      className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        answerTab === 'photo'
                          ? 'bg-[#0F4C45] text-white'
                          : 'bg-[#F7F9F8] dark:bg-[#0B1716] text-[#566664] dark:text-[#96B0AC]'
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Handwritten Photo</span>
                    </button>
                  </div>

                  <span className="text-xs font-mono text-[#566664] dark:text-[#96B0AC]">
                    Word Count: <strong className="text-[#0E1F1E] dark:text-[#EEF3F1]">{wordCount}</strong>
                  </span>
                </div>

                {answerTab === 'type' && (
                  <textarea
                    value={typedAnswer}
                    onChange={(e) => setTypedAnswer(e.target.value)}
                    placeholder="Type your IELTS response here... (250+ words for Task 2, 150+ for Task 1)"
                    rows={9}
                    className="w-full p-4 rounded-xl border border-[#D3DDDA] dark:border-[#1E3330] bg-[#F7F9F8] dark:bg-[#0B1716] text-[#0E1F1E] dark:text-[#EEF3F1] focus:border-[#0F4C45] focus:outline-none text-xs sm:text-sm leading-relaxed"
                  />
                )}

                {answerTab === 'photo' && (
                  <div className="space-y-4">
                    {!uploadedPhotoUrl ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="p-8 border-2 border-dashed border-[#0F4C45]/35 hover:border-[#0F4C45] rounded-2xl bg-[#F7F9F8] dark:bg-[#0B1716] text-center cursor-pointer transition space-y-3"
                      >
                        <div className="w-12 h-12 rounded-xl bg-[#0F4C45]/10 text-[#0F4C45] dark:text-[#7CD4C4] flex items-center justify-center mx-auto">
                          <Camera className="w-6 h-6" />
                        </div>
                        <div className="text-sm font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                          Snap a Photo or Upload Handwritten Answer Sheet
                        </div>
                        <p className="text-xs text-[#566664] dark:text-[#96B0AC]">
                          PNG, JPG, or HEIC up to 5MB
                        </p>
                      </div>
                    ) : (
                      <div className="bg-[#F7F9F8] dark:bg-[#0B1716] border border-[#D3DDDA] dark:border-[#1E3330] rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Handwritten Answer Sheet Uploaded</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPhotoPreviewModal(uploadedPhotoUrl)}
                              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#11201E] border border-[#D3DDDA] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                              <span>Zoom</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleRemovePhoto}
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="rounded-xl overflow-hidden border border-[#D3DDDA] bg-black/5 max-h-72 flex items-center justify-center">
                          <img
                            src={uploadedPhotoUrl}
                            alt="Handwritten Answer Sheet"
                            className="object-contain max-h-72 w-full"
                          />
                        </div>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleSaveSubmission}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0F4C45] hover:bg-[#0D3833] text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit, Save &amp; Mark Completed</span>
                  </button>
                  <span className="text-xs text-[#566664] dark:text-[#96B0AC]">
                    Saved locally to your Submission Vault
                  </span>
                </div>
              </div>

              {showModelAnswer && (
                <div className="p-5 sm:p-6 bg-[#0E1F1E] text-[#EEF3F1] rounded-2xl space-y-4 border border-[#1F8A70]/35">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <span className="font-mono font-bold text-xs text-[#F4A62A] uppercase">
                      Official-Style {activeQuestion.modelBand} Model Response
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePlayModelAudio}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        {isPlayingModelAudio ? (
                          <VolumeX className="w-3.5 h-3.5 text-[#F4A62A]" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                        <span>{isPlayingModelAudio ? 'Stop Audio' : 'Listen (UK Audio)'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyModel}
                        className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white transition cursor-pointer"
                        title="Copy model answer"
                      >
                        {copiedModel ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="text-xs sm:text-sm text-[#EEF3F1]/90 font-serif leading-relaxed whitespace-pre-line">
                    {activeQuestion.modelAnswer}
                  </div>

                  <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase text-white/60">
                      Key Collocations:
                    </span>
                    {activeQuestion.keyVocabulary.map((v, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-white/10 text-white/90 text-[11px]"
                      >
                        <strong>{v.word}</strong> ({v.meaning_bn})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: LAYER 1 & 2 — 2-PASS BLIND-VERIFIED FRESH DRILL STUDIO         */}
      {/* ===================================================================== */}
      {activeViewTab === 'factory' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1E3330] rounded-2xl p-5 sm:p-7 space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-[#0F4C45] dark:text-[#F4A62A]">
                <ShieldCheck className="w-4 h-4" />
                <span>2-Pass Blind Examiner Auto-Verification</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                Generate a Fresh Cambridge-Blueprint Drill
              </h2>
              <p className="text-xs sm:text-sm text-[#566664] dark:text-[#96B0AC] leading-relaxed">
                Pass 1 writes a 100% original IELTS drill modelled on Cambridge 15–21 difficulty and distractor patterns. Pass 2 solves your questions <strong className="text-[#0E1F1E] dark:text-[#EEF3F1]">blind without seeing the answer key</strong> to catch ambiguity before saving it to the shared Question Bank.
              </p>
            </div>

            <form onSubmit={handleGenerateFreshDrill} className="space-y-5">
              {/* Module Picker */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                  1. Choose IELTS Module
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(['reading', 'listening', 'writing', 'speaking'] as VerifiedModule[]).map((mod) => (
                    <button
                      key={mod}
                      type="button"
                      onClick={() => handleSelectGenModule(mod)}
                      className={`min-h-[46px] px-3 py-2.5 rounded-xl border text-xs sm:text-sm font-bold capitalize transition cursor-pointer ${
                        genModule === mod
                          ? 'bg-[#0F4C45] text-white border-[#0F4C45]'
                          : 'bg-[#F7F9F8] dark:bg-[#0B1716] text-[#0E1F1E] dark:text-[#EEF3F1] border-[#D3DDDA] dark:border-[#1E3330] hover:border-[#0F4C45]'
                      }`}
                    >
                      {mod}
                    </button>
                  ))}
                </div>
              </div>

              {/* Track, Question Type, Target Band */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                    2. Exam Track
                  </span>
                  <select
                    value={genTrack}
                    onChange={(e) => setGenTrack(e.target.value as VerifiedExamTrack)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#D3DDDA] dark:border-[#1E3330] bg-[#F7F9F8] dark:bg-[#0B1716] text-xs sm:text-sm text-[#0E1F1E] dark:text-[#EEF3F1]"
                  >
                    <option value="Academic">Academic</option>
                    <option value="General Training">General Training</option>
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                    3. Question Type Focus
                  </span>
                  <select
                    value={genType}
                    onChange={(e) => setGenType(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#D3DDDA] dark:border-[#1E3330] bg-[#F7F9F8] dark:bg-[#0B1716] text-xs sm:text-sm text-[#0E1F1E] dark:text-[#EEF3F1]"
                  >
                    {QUESTION_TYPES_BY_MODULE[genModule].map((qt) => (
                      <option key={qt} value={qt}>
                        {qt}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                    4. Target Band Difficulty
                  </span>
                  <select
                    value={genTargetBand}
                    onChange={(e) => setGenTargetBand(Number(e.target.value))}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-[#D3DDDA] dark:border-[#1E3330] bg-[#F7F9F8] dark:bg-[#0B1716] text-xs sm:text-sm font-mono text-[#0E1F1E] dark:text-[#EEF3F1]"
                  >
                    {[6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0].map((b) => (
                      <option key={b} value={b}>
                        Band {b.toFixed(1)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Topic Picker */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                  5. Topic Domain (Pick a high-yield IELTS topic or type your own)
                </label>
                <input
                  type="text"
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  maxLength={100}
                  placeholder="e.g., Microplastics in Coastal Agriculture, Remote Work Productivity..."
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[#D3DDDA] dark:border-[#1E3330] bg-[#F7F9F8] dark:bg-[#0B1716] text-xs sm:text-sm text-[#0E1F1E] dark:text-[#EEF3F1] focus:outline-none focus:border-[#0F4C45]"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {TOPIC_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setGenTopic(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer transition ${
                        genTopic === preset
                          ? 'bg-[#0F4C45] text-white border-[#0F4C45]'
                          : 'bg-[#F7F9F8] dark:bg-[#0B1716] text-[#566664] dark:text-[#96B0AC] border-[#D3DDDA] dark:border-[#1E3330] hover:border-[#0F4C45]'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {genError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{genError}</span>
                </div>
              )}

              <div className="space-y-3 pt-2 border-t border-[#D3DDDA] dark:border-[#1E3330]">
                {isGenerating && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono text-[#0F4C45] dark:text-[#7CD4C4]">
                      <span>{generationStage}</span>
                      <span className="tabular-nums">{genElapsedSec}s elapsed</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#EEF3F1] dark:bg-[#0B1716] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#0F4C45] dark:bg-[#F4A62A] transition-all duration-700"
                        style={{ width: `${Math.min(92, 18 + genElapsedSec * 6)}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-[#566664] dark:text-[#96B0AC]">
                    {isGenerating
                      ? 'Auto-opens in the split-screen exam room as soon as verification completes.'
                      : 'Includes verbatim evidence quotes, EN + বাংলা trap breakdowns, and auto-saves to your shared bank.'}
                  </div>
                  <div className="flex items-center gap-2">
                    {isGenerating && (
                      <button
                        type="button"
                        onClick={handleCancelGeneration}
                        className="min-h-[48px] px-4 py-2.5 rounded-xl border border-[#D3DDDA] dark:border-[#1E3330] bg-white dark:bg-[#0B1716] text-[#566664] dark:text-[#96B0AC] hover:text-rose-600 text-xs font-semibold cursor-pointer transition"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isGenerating}
                      className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[#0F4C45] hover:bg-[#0D3833] text-white text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer transition disabled:opacity-60"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Generating ({genElapsedSec}s)...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-[#F4A62A]" />
                          <span>Generate &amp; Blind-Verify Drill</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: LAYER 3 — PRIVATE "PRACTICE YOUR OWN PDF" EXAM ROOM            */}
      {/* ===================================================================== */}
      {activeViewTab === 'private-pdf' && <PrivatePdfExamRoom onShowToast={onShowToast} />}

      {/* ===================================================================== */}
      {/* TAB 4: MY SUBMISSIONS VAULT                                           */}
      {/* ===================================================================== */}
      {activeViewTab === 'submissions' && (
        <div className="space-y-4">
          {submissions.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#11201E] rounded-2xl border border-[#D3DDDA] dark:border-[#1E3330] space-y-3">
              <Camera className="w-10 h-10 text-[#566664]/50 mx-auto" />
              <div className="text-base font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                No Handwritten or Typed Submissions Yet
              </div>
              <p className="text-xs text-[#566664] dark:text-[#96B0AC] max-w-sm mx-auto">
                Practice any prompt from the Question Bank and type your response or upload a photo of your handwritten answer sheet.
              </p>
              <button
                type="button"
                onClick={() => setActiveViewTab('bank')}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#0F4C45] text-white font-bold text-xs cursor-pointer"
              >
                Browse Question Bank
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-white dark:bg-[#11201E] rounded-2xl border border-[#D3DDDA] dark:border-[#1E3330] p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D3DDDA]/60 dark:border-[#1E3330] pb-3">
                    <div>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-[#566664] dark:text-[#96B0AC]">
                        <span className="font-bold text-[#0F4C45] dark:text-[#7CD4C4] uppercase">
                          {sub.module}
                        </span>
                        <span>·</span>
                        <span>{sub.submittedAt}</span>
                      </div>
                      <h3 className="text-sm font-bold text-[#0E1F1E] dark:text-[#EEF3F1] mt-1">
                        {sub.questionTitle}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#566664] dark:text-[#96B0AC]">
                        {sub.submissionType === 'photo'
                          ? 'Photo Only'
                          : sub.submissionType === 'both'
                          ? 'Photo + Text'
                          : 'Text'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteSubmission(sub.id)}
                        className="p-2 rounded-xl text-[#566664] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                        title="Delete submission"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {sub.photoUrl && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono text-[#566664] uppercase font-bold">
                        Handwritten Answer Sheet
                      </div>
                      <div
                        onClick={() => setPhotoPreviewModal(sub.photoUrl!)}
                        className="cursor-pointer max-h-56 overflow-hidden rounded-xl border border-[#D3DDDA] relative group bg-black/5 flex items-center justify-center"
                      >
                        <img
                          src={sub.photoUrl}
                          alt="Handwritten Answer"
                          className="object-contain max-h-56 w-full"
                        />
                        <div className="absolute inset-0 bg-[#0E1F1E]/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-bold text-xs gap-1.5">
                          <Maximize2 className="w-4 h-4" />
                          <span>Click to Zoom</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {sub.textAnswer && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono text-[#566664] uppercase font-bold">
                        Typed Response ({sub.wordCount} words)
                      </div>
                      <p className="text-xs text-[#0E1F1E] dark:text-[#EEF3F1] bg-[#F7F9F8] dark:bg-[#0B1716] p-3.5 rounded-xl border border-[#D3DDDA]/60 dark:border-[#1E3330] leading-relaxed font-serif whitespace-pre-line">
                        {sub.textAnswer}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Full-screen Photo Zoom Modal */}
      {photoPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full max-h-[90vh] bg-[#0E1F1E] rounded-2xl p-4 overflow-hidden border border-[#1E3330] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setPhotoPreviewModal(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="overflow-auto w-full h-full flex items-center justify-center p-2">
              <img
                src={photoPreviewModal}
                alt="Full Answer Preview"
                className="max-h-[80vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
