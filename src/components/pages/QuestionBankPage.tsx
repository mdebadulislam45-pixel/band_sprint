import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Search,
  BookOpen,
  Camera,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Eye,
  Award,
  Clock,
  Sparkles,
  Filter,
  FileText,
  AlertCircle,
  Copy,
  Check,
  Maximize2,
  X,
  Volume2,
  VolumeX
} from 'lucide-react';
import { IELTS_QUESTION_BANK, QuestionBankItem } from '../../data/ieltsQuestionBankData';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';

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
  photoUrl?: string; // base64 data URL
  wordCount: number;
  submittedAt: string;
  selfAssessedBand?: string;
}

const STORAGE_SUBMISSIONS_KEY = 'ielts_qb_submissions_v1';

export const QuestionBankPage: React.FC<QuestionBankPageProps> = ({ onBack, onShowToast }) => {
  const [selectedModule, setSelectedModule] = useState<string>('All');
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuestion, setActiveQuestion] = useState<QuestionBankItem>(IELTS_QUESTION_BANK[0]);
  const [practiceMode, setPracticeMode] = useState<'browse' | 'practice'>('browse');

  // Answer state
  const [typedAnswer, setTypedAnswer] = useState('');
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [photoPreviewModal, setPhotoPreviewModal] = useState<string | null>(null);
  const [answerTab, setAnswerTab] = useState<'type' | 'photo'>('type');
  const [showModelAnswer, setShowModelAnswer] = useState(false);
  const [isPlayingModelAudio, setIsPlayingModelAudio] = useState(false);
  const [copiedModel, setCopiedModel] = useState(false);

  // Submissions history
  const [submissions, setSubmissions] = useState<UserSubmission[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SUBMISSIONS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeViewTab, setActiveViewTab] = useState<'bank' | 'submissions'>('bank');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SUBMISSIONS_KEY, JSON.stringify(submissions));
    } catch {}
  }, [submissions]);

  const modules = [
    'All',
    'Writing Task 2',
    'Writing Task 1',
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
    'Urbanization'
  ];

  const filteredQuestions = IELTS_QUESTION_BANK.filter((item) => {
    const matchModule = selectedModule === 'All' || item.module === selectedModule;
    const matchTopic = selectedTopic === 'All' || item.topic === selectedTopic;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.prompt.toLowerCase().includes(q) ||
      item.subType.toLowerCase().includes(q);

    return matchModule && matchTopic && matchSearch;
  });

  // Calculate live word count
  const wordCount = typedAnswer.trim() ? typedAnswer.trim().split(/\s+/).length : 0;

  // Handle Photo Upload (Convert to base64)
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      onShowToast('Image size exceeds 5MB limit. Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setUploadedPhotoUrl(base64);
      soundManager.playSuccess();
      onShowToast('Photo of answer sheet uploaded successfully!');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setUploadedPhotoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onShowToast('Photo removed.');
  };

  const handleSaveSubmission = () => {
    if (!typedAnswer.trim() && !uploadedPhotoUrl) {
      onShowToast('Please type your response or upload a photo of your answer sheet.');
      return;
    }

    const submissionType: 'text' | 'photo' | 'both' =
      typedAnswer.trim() && uploadedPhotoUrl
        ? 'both'
        : uploadedPhotoUrl
        ? 'photo'
        : 'text';

    const newSub: UserSubmission = {
      id: 'sub_' + Date.now(),
      questionId: activeQuestion.id,
      questionTitle: activeQuestion.title,
      module: activeQuestion.module,
      submissionType,
      textAnswer: typedAnswer.trim() || undefined,
      photoUrl: uploadedPhotoUrl || undefined,
      wordCount: wordCount > 0 ? wordCount : 250, // estimated if photo
      submittedAt: new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    setSubmissions((prev) => [newSub, ...prev]);
    soundManager.playSuccess();
    onShowToast('Answer submitted and saved to your submission history!');
    setShowModelAnswer(true);
  };

  const handlePlayModelAudio = () => {
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
    navigator.clipboard.writeText(activeQuestion.modelAnswer);
    setCopiedModel(true);
    onShowToast('Model answer copied!');
    setTimeout(() => setCopiedModel(false), 2000);
  };

  const handleDeleteSubmission = (subId: string) => {
    setSubmissions((prev) => prev.filter((s) => s.id !== subId));
    onShowToast('Submission deleted.');
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Practice</span>
        </button>

        <div className="text-right">
          <div className="text-xs font-bold text-slate-900 font-mono">IELTS QUESTION BANK</div>
          <div className="text-[10px] text-slate-400">Real Exam Prompts & Photo Upload</div>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 text-white p-6 sm:p-7 rounded-3xl shadow-md border border-indigo-800/40">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold uppercase tracking-wider border border-blue-400/30">
            OFFICIAL CAMBRIDGE & REAL EXAM BANK
          </span>
          <span className="text-[11px] text-blue-200">
            Writing & Speaking Authentic Questions
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          IELTS Authentic Question Bank
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
          Practice high-yield exam prompts. Write on-screen or <strong>upload a photo of your handwritten paper answer sheet</strong> for comparison with Band 8.5–9.0 benchmark responses.
        </p>
      </div>

      {/* Main Mode Tabs: Bank vs My Submissions */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveViewTab('bank')}
          className={`pb-3 px-2 text-xs font-bold transition border-b-2 -mb-[2px] flex items-center gap-1.5 ${
            activeViewTab === 'bank'
              ? 'border-indigo-600 text-indigo-950 font-black'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Question Bank ({IELTS_QUESTION_BANK.length})</span>
        </button>

        <button
          onClick={() => setActiveViewTab('submissions')}
          className={`pb-3 px-2 text-xs font-bold transition border-b-2 -mb-[2px] flex items-center gap-1.5 ${
            activeViewTab === 'submissions'
              ? 'border-indigo-600 text-indigo-950 font-black'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>My Submissions ({submissions.length})</span>
        </button>
      </div>

      {/* VIEW TAB 1: QUESTION BANK */}
      {activeViewTab === 'bank' && (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prompt, topic, or question type (e.g. Artificial Intelligence, Renewable Energy, Cue Card)..."
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              />
            </div>

            {/* Module Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {modules.map((mod) => {
                const isActive = selectedModule === mod;
                return (
                  <button
                    key={mod}
                    onClick={() => {
                      setSelectedModule(mod);
                      soundManager.playBeep(600, 0.04);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                      isActive
                        ? 'bg-indigo-700 text-white border-indigo-700 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {mod}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question List Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredQuestions.map((qItem) => {
              const isSelected = activeQuestion.id === qItem.id;
              return (
                <div
                  key={qItem.id}
                  onClick={() => {
                    setActiveQuestion(qItem);
                    setShowModelAnswer(false);
                    setTypedAnswer('');
                    setUploadedPhotoUrl(null);
                    setPracticeMode('practice');
                    soundManager.playBeep(700, 0.04);
                  }}
                  className={`bg-white rounded-3xl border p-5 shadow-xs transition cursor-pointer flex flex-col justify-between hover:border-indigo-400 ${
                    isSelected
                      ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-md'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 text-[10px] font-mono font-bold border border-indigo-200">
                        {qItem.module}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                        {qItem.frequency}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-black text-slate-900 line-clamp-1">
                        {qItem.title}
                      </h3>
                      <p className="text-xs text-slate-600 line-clamp-3 mt-1 leading-relaxed">
                        "{qItem.prompt}"
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                      <span>{qItem.subType}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        ~{qItem.suggestedTimeMinutes} mins
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-700">
                      Practice / Upload Photo
                    </span>
                    <span className="text-xs font-bold text-slate-400">→</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Workspace Modal / Drawer */}
          {activeQuestion && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-md space-y-6">
              {/* Question Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 text-[10px] font-mono font-bold">
                      {activeQuestion.module} · {activeQuestion.subType}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                      Benchmark {activeQuestion.modelBand}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Target: {activeQuestion.targetWordCount || '250 words'}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900">
                    {activeQuestion.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowModelAnswer((prev) => !prev)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                    <span>{showModelAnswer ? 'Hide Model Answer' : 'View Model Answer'}</span>
                  </button>
                </div>
              </div>

              {/* Prompt Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm space-y-2">
                <div className="text-[10px] font-mono font-bold uppercase text-slate-400">
                  Exam Prompt:
                </div>
                <p className="text-slate-900 font-medium leading-relaxed italic">
                  "{activeQuestion.prompt}"
                </p>

                {activeQuestion.cueCardBulletPoints && (
                  <div className="pl-4 pt-1 space-y-1 text-slate-700 text-xs">
                    <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">You should say:</div>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {activeQuestion.cueCardBulletPoints.map((pt, idx) => (
                        <li key={idx}>{pt}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Examiner Secret Tips */}
              <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-2xl text-xs space-y-1">
                <div className="font-bold text-amber-900 flex items-center gap-1.5 font-mono">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Examiner Scoring Strategy:</span>
                </div>
                <ul className="list-disc pl-5 text-amber-950 space-y-0.5 font-medium leading-relaxed">
                  {activeQuestion.examinerTips.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>

              {/* Answer Mode Tabs: Type vs Photo Upload */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAnswerTab('type')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        answerTab === 'type'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Type Response</span>
                    </button>

                    <button
                      onClick={() => setAnswerTab('photo')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        answerTab === 'photo'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5 text-rose-500" />
                      <span>Upload Photo of Handwritten Answer</span>
                      {uploadedPhotoUrl && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                    </button>
                  </div>

                  <span className="text-xs font-mono font-bold text-slate-400">
                    Word Count: <strong className="text-slate-900">{wordCount}</strong>
                  </span>
                </div>

                {/* Option A: Type Answer */}
                {answerTab === 'type' && (
                  <div className="space-y-2">
                    <textarea
                      value={typedAnswer}
                      onChange={(e) => setTypedAnswer(e.target.value)}
                      placeholder="Type your IELTS response here... (Examiners recommend 250+ words for Task 2, 150+ for Task 1)"
                      rows={10}
                      className="w-full p-4 rounded-2xl border border-slate-300 focus:border-indigo-500 focus:outline-none text-xs sm:text-sm font-sans leading-relaxed shadow-inner"
                    />
                  </div>
                )}

                {/* Option B: Upload Photo of Handwritten Answer */}
                {answerTab === 'photo' && (
                  <div className="space-y-4">
                    {!uploadedPhotoUrl ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="p-8 border-2 border-dashed border-indigo-300 hover:border-indigo-500 rounded-3xl bg-indigo-50/40 text-center cursor-pointer transition space-y-3 group"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-indigo-100 group-hover:bg-indigo-600 text-indigo-700 group-hover:text-white flex items-center justify-center mx-auto transition shadow-xs">
                          <Camera className="w-7 h-7" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">
                            Snap a Photo or Upload Handwritten Answer Sheet
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Take a picture with your phone camera or select an image file (PNG, JPG, HEIC up to 5MB)
                          </p>
                        </div>
                        <span className="inline-block px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-2xs group-hover:bg-indigo-700">
                          Browse Image / Open Camera
                        </span>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 sm:p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-bold text-slate-900">
                              Handwritten Answer Sheet Uploaded
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setPhotoPreviewModal(uploadedPhotoUrl)}
                              className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1 shadow-2xs"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                              <span>Zoom View</span>
                            </button>

                            <button
                              onClick={handleRemovePhoto}
                              className="p-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
                              title="Delete photo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Image Preview Thumbnail */}
                        <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-black/5 max-h-72 flex items-center justify-center">
                          <img
                            src={uploadedPhotoUrl}
                            alt="Handwritten Answer Sheet"
                            className="object-contain max-h-72 w-full"
                          />
                        </div>

                        <p className="text-[11px] text-slate-500 italic">
                          💡 You can also type notes or a transcription in the "Type Response" tab to save alongside your photo.
                        </p>
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

                {/* Submit Action Button */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveSubmission}
                      className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Submit & Save Answer</span>
                    </button>
                  </div>

                  <span className="text-xs text-slate-400">
                    Saves to your local submission vault with timestamp
                  </span>
                </div>
              </div>

              {/* Reveal Model Answer Section */}
              {showModelAnswer && (
                <div className="p-5 sm:p-6 bg-slate-900 text-white rounded-3xl space-y-4 animate-fade-in border border-indigo-800/40">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono font-bold text-[10px] border border-amber-400/30">
                        OFFICIAL {activeQuestion.modelBand} MODEL
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePlayModelAudio}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center gap-1.5"
                      >
                        {isPlayingModelAudio ? (
                          <VolumeX className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                        <span>Listen (UK Audio)</span>
                      </button>

                      <button
                        onClick={handleCopyModel}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition"
                        title="Copy model answer"
                      >
                        {copiedModel ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Model Answer Text */}
                  <div className="text-xs sm:text-sm text-slate-200 font-serif leading-relaxed whitespace-pre-line">
                    {activeQuestion.modelAnswer}
                  </div>

                  {/* Key Vocabulary Highlights */}
                  <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                      Key Collocations:
                    </span>
                    {activeQuestion.keyVocabulary.map((v, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-lg bg-indigo-900/60 text-indigo-200 border border-indigo-700 text-[10px]"
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

      {/* VIEW TAB 2: MY SUBMISSIONS */}
      {activeViewTab === 'submissions' && (
        <div className="space-y-4">
          {submissions.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <Camera className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="text-base font-bold text-slate-800">
                No Submissions Yet
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Practice any prompt from the Question Bank and type your response or upload a photo of your handwritten answer sheet!
              </p>
              <button
                onClick={() => setActiveViewTab('bank')}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
              >
                Browse Question Bank
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 text-[10px] font-mono font-bold">
                          {sub.module}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {sub.submittedAt}
                        </span>
                      </div>
                      <h3 className="text-sm font-black text-slate-900 mt-1">
                        {sub.questionTitle}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono font-bold">
                        {sub.submissionType === 'photo'
                          ? '📸 Photo Only'
                          : sub.submissionType === 'both'
                          ? '📸 Photo + Text'
                          : '📝 Text'}
                      </span>

                      <button
                        onClick={() => handleDeleteSubmission(sub.id)}
                        className="p-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
                        title="Delete submission"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Photo Display if available */}
                  {sub.photoUrl && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                        Handwritten Answer Sheet:
                      </div>
                      <div
                        onClick={() => setPhotoPreviewModal(sub.photoUrl!)}
                        className="cursor-pointer max-h-56 overflow-hidden rounded-2xl border border-slate-200 relative group bg-black/5 flex items-center justify-center"
                      >
                        <img
                          src={sub.photoUrl}
                          alt="Handwritten Answer"
                          className="object-contain max-h-56 w-full"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-bold text-xs gap-1.5">
                          <Maximize2 className="w-4 h-4" />
                          <span>Click to Zoom</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Text Display if available */}
                  {sub.textAnswer && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                        Typed Response ({sub.wordCount} words):
                      </div>
                      <p className="text-xs text-slate-800 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 leading-relaxed font-serif whitespace-pre-line">
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
          <div className="relative max-w-3xl w-full max-h-[90vh] bg-slate-900 rounded-3xl p-4 overflow-hidden border border-slate-800 flex flex-col items-center">
            <button
              onClick={() => setPhotoPreviewModal(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-white hover:bg-slate-700 transition"
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
