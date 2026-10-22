import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Award,
  BookOpen,
  Headphones,
  Mic,
  PenTool,
  RotateCcw,
  Trash2,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Archive
} from 'lucide-react';
import { questionEngine, QuestionAttempt, IELTSModuleType } from '../../services/QuestionEngine';
import { addMistake } from '../../utils/vaultStorage';
import { soundManager } from '../../utils/audioEffects';

interface QuestionHistoryPageProps {
  onBack: () => void;
  onNavigate: (module: string) => void;
  onShowToast: (msg: string) => void;
}

export const QuestionHistoryPage: React.FC<QuestionHistoryPageProps> = ({
  onBack,
  onNavigate,
  onShowToast
}) => {
  const [attempts, setAttempts] = useState<QuestionAttempt[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedResult, setSelectedResult] = useState<'all' | 'correct' | 'incorrect'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadHistory = () => {
    const list = questionEngine.getHistory();
    setAttempts(list);
  };

  useEffect(() => {
    loadHistory();
    const handleUpdate = () => loadHistory();
    window.addEventListener('question_attempt_recorded', handleUpdate);
    return () => window.removeEventListener('question_attempt_recorded', handleUpdate);
  }, []);

  // Filtered attempts
  const filtered = attempts.filter((a) => {
    if (selectedModule !== 'all' && a.module !== selectedModule) return false;
    if (selectedResult === 'correct' && !a.isCorrect) return false;
    if (selectedResult === 'incorrect' && a.isCorrect) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTopic = a.topic.toLowerCase().includes(q);
      const matchAns = String(a.userAnswer).toLowerCase().includes(q);
      const matchExp = (a.explanation || '').toLowerCase().includes(q);
      if (!matchTopic && !matchAns && !matchExp) return false;
    }
    return true;
  });

  // Calculate high-level metrics
  const totalAttempted = attempts.length;
  const totalCorrect = attempts.filter((a) => a.isCorrect).length;
  const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;
  const incorrectCount = totalAttempted - totalCorrect;

  const handleAddToMistakes = (attempt: QuestionAttempt) => {
    addMistake({
      module: attempt.module === 'vocabulary' ? 'vocab' : (attempt.module as any),
      title: `${attempt.topic} (${attempt.questionType})`,
      userAnswer: Array.isArray(attempt.userAnswer) ? attempt.userAnswer.join(', ') : String(attempt.userAnswer || '(blank)'),
      correctAnswer: attempt.explanation ? 'Review explanation' : 'See answer key',
      explanation: attempt.explanation || 'Reviewed from Question History.'
    });
    soundManager.playSuccess();
    onShowToast('Saved question to Mistake Vault!');
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear your local question attempt history?')) {
      questionEngine.clearHistory();
      setAttempts([]);
      soundManager.playBeep(440, 0.1);
      onShowToast('Question attempt history cleared.');
    }
  };

  const getModuleIcon = (mod: IELTSModuleType) => {
    switch (mod) {
      case 'listening':
        return <Headphones className="w-4 h-4 text-blue-600" />;
      case 'reading':
        return <BookOpen className="w-4 h-4 text-emerald-600" />;
      case 'speaking':
        return <Mic className="w-4 h-4 text-rose-600" />;
      case 'writing':
        return <PenTool className="w-4 h-4 text-purple-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-amber-600" />;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-xs font-bold transition inline-flex items-center gap-1.5 shadow-2xs self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <div className="flex items-center gap-2">
          {attempts.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="px-3.5 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Attempted</span>
          <div className="text-2xl font-black text-slate-900 font-mono">{totalAttempted}</div>
          <span className="text-[11px] text-slate-400">Questions across all modules</span>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Overall Accuracy</span>
          <div className="text-2xl font-black text-emerald-700 font-mono">{accuracy}%</div>
          <span className="text-[11px] text-slate-400">{totalCorrect} correct answers</span>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Mistakes Logged</span>
          <div className="text-2xl font-black text-rose-700 font-mono">{incorrectCount}</div>
          <span className="text-[11px] text-slate-400">Scheduled for spaced review</span>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Adaptive Status</span>
          <div className="text-2xl font-black text-blue-700 font-mono">
            {accuracy >= 80 ? 'Band 8.0' : accuracy >= 65 ? 'Band 7.0' : 'Band 6.0'}
          </div>
          <span className="text-[11px] text-slate-400">Computer-delivered index</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Module Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'All Modules' },
              { id: 'listening', label: 'Listening' },
              { id: 'reading', label: 'Reading' },
              { id: 'speaking', label: 'Speaking' },
              { id: 'writing', label: 'Writing' }
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedModule(m.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                  selectedModule === m.id
                    ? 'bg-blue-700 text-white border-blue-800 shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Correct / Incorrect filter */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
            <button
              onClick={() => setSelectedResult('all')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                selectedResult === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedResult('correct')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                selectedResult === 'correct' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Correct</span>
            </button>
            <button
              onClick={() => setSelectedResult('incorrect')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                selectedResult === 'incorrect' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <XCircle className="w-3 h-3" />
              <span>Mistakes</span>
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search question history by topic, candidate answer, or explanation..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Attempt History Feed */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200 space-y-3">
            <Archive className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">No Historical Question Attempts Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Answer practice questions in Listening Lab, Speaking Studio, or Reading Lab. Every attempt is logged here with full Cambridge diagnostics.
            </p>
            <button
              onClick={() => onNavigate('listening')}
              className="mt-2 px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-2xs transition inline-flex items-center gap-1.5"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Start Listening Practice</span>
            </button>
          </div>
        ) : (
          filtered.map((att) => {
            const isExpanded = expandedId === att.id;
            const dateStr = new Date(att.timestamp).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={att.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs transition hover:border-slate-300 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-slate-100">{getModuleIcon(att.module)}</span>
                    <span className="text-xs font-bold text-slate-900">{att.topic}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold">
                      {att.questionType}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{dateStr}</span>
                    </span>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border ${
                        att.isCorrect
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {att.isCorrect ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span>{att.isCorrect ? 'Correct' : 'Needs Review'}</span>
                    </span>
                  </div>
                </div>

                {/* Candidate Answer Banner */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Your Submitted Answer:</span>
                    <div className="font-mono text-slate-800 font-semibold truncate">
                      "{Array.isArray(att.userAnswer) ? att.userAnswer.join(', ') : String(att.userAnswer || '(blank)')}"
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : att.id)}
                      className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold text-[11px] hover:bg-slate-100 transition flex items-center gap-1"
                    >
                      <span>{isExpanded ? 'Hide Details' : 'See Explanation'}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    <button
                      onClick={() => onNavigate(att.module)}
                      className="px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-bold text-[11px] hover:bg-blue-100 transition flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Practice Again</span>
                    </button>
                  </div>
                </div>

                {/* Expanded Explanation Accordion */}
                {isExpanded && (
                  <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-slate-800 space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-900">Cambridge Examiner Guidance & Explanation:</span>
                      {!att.isCorrect && (
                        <button
                          onClick={() => handleAddToMistakes(att)}
                          className="text-[11px] font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1"
                        >
                          <Archive className="w-3 h-3" />
                          <span>Save to Mistake Vault</span>
                        </button>
                      )}
                    </div>
                    <p className="text-slate-700 leading-relaxed font-serif italic">
                      "{att.explanation || 'Refer to Cambridge transcript indicators and spelling standards.'}"
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
