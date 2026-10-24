import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  RotateCcw,
  ArrowLeft,
  BookOpen,
  Headphones,
  FileText,
  Filter,
  Target,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Globe,
  Printer,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Zap,
  ShieldCheck,
  Brain,
  Volume2,
  BookmarkPlus
} from 'lucide-react';
import { QuestionItem } from '../../data/mockExams';
import { addMistake } from '../../utils/vaultStorage';
import { speakBritish } from '../../utils/britishVoice';

export interface SubmittedResultsPayload {
  listeningCorrect: number;
  listeningTotal: number;
  listeningBand: number;
  readingCorrect: number;
  readingTotal: number;
  readingBand: number;
  writingBand: number;
  overallBand: number;
  wordCount: number;
}

interface PostTestDiagnosticReportProps {
  candidateName: string;
  testTitle: string;
  testSetId: string;
  activeSkill: 'listening' | 'reading' | 'writing';
  results: SubmittedResultsPayload;
  questions: QuestionItem[];
  userAnswers: Record<number, string>;
  listeningScript?: string;
  readingPassage?: string;
  timeElapsedSec: number;
  onRetake: () => void;
  onBackToDashboard: () => void;
  onShowToast: (msg: string) => void;
}

/**
 * Authentic IELTS Band Conversion Logic with Official Rounding (.25 -> .5; .75 -> next whole)
 */
export function calculateOfficialIELTSBand(correct: number, total: number): { band: number; cefr: string } {
  if (total === 0) return { band: 0, cefr: 'N/A' };

  let band = 0;
  // Official 40-question boundary conversion table for Listening/Reading
  if (total === 40) {
    if (correct >= 39) band = 9.0;
    else if (correct >= 37) band = 8.5;
    else if (correct >= 35) band = 8.0;
    else if (correct >= 33) band = 7.5;
    else if (correct >= 30) band = 7.0;
    else if (correct >= 27) band = 6.5;
    else if (correct >= 23) band = 6.0;
    else if (correct >= 19) band = 5.5;
    else if (correct >= 15) band = 5.0;
    else if (correct >= 13) band = 4.5;
    else if (correct >= 10) band = 4.0;
    else band = 3.5;
  } else {
    // For 10-question practice drills: ratio-based conversion with official IELTS rounding
    const rawRatio = (correct / total) * 9;
    const intPart = Math.floor(rawRatio);
    const decimal = rawRatio - intPart;

    if (decimal < 0.25) band = intPart;
    else if (decimal < 0.75) band = intPart + 0.5;
    else band = intPart + 1.0;
    band = Math.min(9.0, Math.max(1.0, band));
  }

  let cefr = 'C2 - Native Mastery';
  if (band >= 8.5) cefr = 'C2 - Expert Operational';
  else if (band >= 7.5) cefr = 'C1 - Advanced Operational';
  else if (band >= 6.5) cefr = 'B2 - Competent Upper-Intermediate';
  else if (band >= 5.5) cefr = 'B2 - Intermediate User';
  else if (band >= 4.5) cefr = 'B1 - Modest User';
  else cefr = 'A2 - Basic User';

  return { band, cefr };
}

/**
 * Returns conversational Bengali trap explanation for any question type / prompt
 */
export function getBilingualBengaliTrapExplanation(question: QuestionItem): string {
  const typeLower = question.type.toLowerCase();
  const promptLower = question.prompt.toLowerCase();
  const exp = question.explanation || '';

  if (typeLower.includes('self-correction') || promptLower.includes('self-correction')) {
    return `স্পিকার প্রথমে একটি সংখ্যা বা তথ্য উল্লেখ করলেও পরক্ষণেই 'Wait, sorry' বা 'Actually' বলে নিজেকে শুধরে নেন। সাধারণ পরীক্ষার্থীরা প্রথম ভুল তথ্যটি শুনে তাড়াহুড়ো করে লিখে ফেলে। তাই সব সময় আত্ম-সংশোধিত (self-corrected) চূড়ান্ত উত্তরটিই সঠিক।`;
  }

  if (typeLower.includes('surname') || promptLower.includes('surname')) {
    return `অডিওতে পদবি বা Surname স্পেলিং ধরে ধরে (P-E-N-N-I-N-G-T-O-N) বলা হয়। স্পেলিং শোনার সময় দ্বৈত লেটার (যেমন NN) ভালোভাবে খেয়াল করুন এবং অবশ্যই ক্যাপিটাল লেটারে লিখুন।`;
  }

  if (typeLower.includes('map') || typeLower.includes('directional') || promptLower.includes('located')) {
    return `ম্যাপ টাইপ প্রশ্নে স্পিকার শুরুর পয়েন্ট থেকে দিকনির্দেশনা দেন (যেমন: 'head north', 'nestled directly behind'). ভুল ডিরেকশন বা বিভ্রান্তিকর ল্যান্ডমার্কের ফাঁদে না পড়ে স্পিকারের শেষ লোকেশন টার্গেট করুন।`;
  }

  if (typeLower.includes('true') || typeLower.includes('false') || typeLower.includes('not given')) {
    return `প্যাসেজের সাথে তথ্য সরাসরি মিললে TRUE, প্যাসেজের বিপরীত তথ্য দিলে FALSE, এবং প্যাসেজে আদৌ কোনো উল্লেখ না থাকলে NOT GIVEN হবে। নিজের বাইরে কোনো অনুমান বা ধারণা প্রয়োগ করা যাবে না।`;
  }

  if (typeLower.includes('multiple choice') || typeLower.includes('choice')) {
    return `অপশনগুলোর সবগুলো শব্দই প্রায় অডিও বা প্যাসেজে থাকে, কিন্তু কেবল একটি অপশন মূল প্রশ্নের শর্ত পূরণ করে। বাকি অপশনগুলো হলো 'Distractors' বা বিভ্রান্তিকর ফাঁদ।`;
  }

  if (typeLower.includes('vocabulary') || typeLower.includes('meaning')) {
    return `শব্দটির আক্ষরিক অর্থের চেয়ে প্যাসেজের বাক্যে এর সঠিক ব্যবহার ও কনটেক্সট খেয়াল করুন।Synonym (সমার্থক শব্দ) চেনার মাধ্যমে সঠিক উত্তরটি বের করা সহজ হয়।`;
  }

  return `উত্তরটি অডিও/প্যাসেজের সঠিক লাইনের অর্থ ও গ্রামার মিলিয়ে নির্ধারণ করা হয়েছে: ${exp}`;
}

export const PostTestDiagnosticReport: React.FC<PostTestDiagnosticReportProps> = ({
  candidateName,
  testTitle,
  testSetId,
  activeSkill,
  results,
  questions,
  userAnswers,
  listeningScript,
  readingPassage,
  timeElapsedSec,
  onRetake,
  onBackToDashboard,
  onShowToast
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'incorrect' | 'correct'>('all');
  const [langPreference, setLangPreference] = useState<Record<number, 'en' | 'bn'>>({});
  const [globalLang, setGlobalLang] = useState<'en' | 'bn'>('en');
  const [locatedQuestion, setLocatedQuestion] = useState<QuestionItem | null>(null);
  const [expandedQuestionId, setExpandedQuestionId] = useState<number | null>(null);
  const [savedToVaultIds, setSavedToVaultIds] = useState<Set<number>>(new Set());

  const totalQuestions = questions.length;
  let correctCount = 0;

  const normalize = (s?: string) => (s || '').trim().toUpperCase().replace(/\s+/g, ' ');

  questions.forEach((q) => {
    const userVal = normalize(userAnswers[q.id]);
    const correctVal = normalize(q.correctAnswer);
    if (userVal === correctVal || (userVal && userVal.replace(/\s+/g, '') === correctVal.replace(/\s+/g, ''))) {
      correctCount++;
    }
  });

  const accuracyPercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const { band: officialBand, cefr } = calculateOfficialIELTSBand(correctCount, totalQuestions);

  // Question Categories Grouping for Weakness Radar
  const categoryStats: Record<string, { total: number; correct: number; questions: QuestionItem[] }> = {};

  questions.forEach((q) => {
    const cat = q.type || 'General Format';
    if (!categoryStats[cat]) {
      categoryStats[cat] = { total: 0, correct: 0, questions: [] };
    }
    categoryStats[cat].total++;
    categoryStats[cat].questions.push(q);

    const userVal = normalize(userAnswers[q.id]);
    const correctVal = normalize(q.correctAnswer);
    if (userVal === correctVal || (userVal && userVal.replace(/\s+/g, '') === correctVal.replace(/\s+/g, ''))) {
      categoryStats[cat].correct++;
    }
  });

  // Identify Weakest Category
  let weakestCategory = '';
  let lowestAccuracy = 101;

  Object.entries(categoryStats).forEach(([catName, stat]) => {
    const acc = (stat.correct / stat.total) * 100;
    if (acc < lowestAccuracy) {
      lowestAccuracy = acc;
      weakestCategory = catName;
    }
  });

  // Filter questions for the review list
  const filteredQuestions = questions.filter((q) => {
    const userVal = normalize(userAnswers[q.id]);
    const correctVal = normalize(q.correctAnswer);
    const isCorrect = userVal === correctVal || (userVal && userVal.replace(/\s+/g, '') === correctVal.replace(/\s+/g, ''));

    if (filterMode === 'correct') return isCorrect;
    if (filterMode === 'incorrect') return !isCorrect;
    return true;
  });

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  const handleToggleLang = (qId: number) => {
    setLangPreference((prev) => {
      const current = prev[qId] || globalLang;
      return { ...prev, [qId]: current === 'en' ? 'bn' : 'en' };
    });
  };

  const handleGlobalLangToggle = (lang: 'en' | 'bn') => {
    setGlobalLang(lang);
    const updated: Record<number, 'en' | 'bn'> = {};
    questions.forEach((q) => {
      updated[q.id] = lang;
    });
    setLangPreference(updated);
  };

  const handleSaveQuestionToVault = (q: QuestionItem) => {
    const userVal = (userAnswers[q.id] || '').trim() || '(Unanswered)';
    addMistake({
      module: activeSkill === 'listening' ? 'listening' : activeSkill === 'reading' ? 'reading' : 'writing',
      questionType: q.type || 'CD-IELTS Item',
      title: `Q${q.id}: ${q.prompt}`,
      userAnswer: userVal,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || 'Review official Cambridge distractor cue.',
      trapExplanationBn: getBilingualBengaliTrapExplanation(q),
      sourceContext: testTitle
    });
    setSavedToVaultIds((prev) => new Set(prev).add(q.id));
    onShowToast(`Saved Q${q.id} to SuperMemo SM-2 Spaced Repetition Vault`);
  };

  const handleSaveAllIncorrectToVault = () => {
    let added = 0;
    questions.forEach((q) => {
      const userVal = normalize(userAnswers[q.id]);
      const correctVal = normalize(q.correctAnswer);
      const isCorrect =
        userVal === correctVal ||
        (userVal && userVal.replace(/\s+/g, '') === correctVal.replace(/\s+/g, ''));
      if (!isCorrect && !savedToVaultIds.has(q.id)) {
        addMistake({
          module: activeSkill === 'listening' ? 'listening' : activeSkill === 'reading' ? 'reading' : 'writing',
          questionType: q.type || 'CD-IELTS Item',
          title: `Q${q.id}: ${q.prompt}`,
          userAnswer: (userAnswers[q.id] || '').trim() || '(Unanswered)',
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || 'Review official Cambridge distractor cue.',
          trapExplanationBn: getBilingualBengaliTrapExplanation(q),
          sourceContext: testTitle
        });
        added++;
      }
    });
    if (added > 0) {
      const nextSet = new Set(savedToVaultIds);
      questions.forEach((q) => nextSet.add(q.id));
      setSavedToVaultIds(nextSet);
      onShowToast(`Added ${added} missed item${added > 1 ? 's' : ''} to SM-2 Spaced Repetition Vault`);
    } else {
      onShowToast('All incorrect items are already in your SM-2 Mistake Vault');
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-8 font-sans">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-400 uppercase tracking-widest">
            <Sparkles className="w-4 h-4 text-blue-400" />
            IELTS SPRINT · PSYCHOMETRIC PERFORMANCE REPORT
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Exam Performance & Diagnostic Report
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Candidate: <span className="text-white font-bold">{candidateName}</span> · {testTitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {totalQuestions - correctCount > 0 && (
            <button
              onClick={handleSaveAllIncorrectToVault}
              className="px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Brain className="w-4 h-4 text-amber-400" />
              <span>Save {totalQuestions - correctCount} Mistakes to SM-2 Vault</span>
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Print Statement</span>
          </button>
          <button
            onClick={onRetake}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-4 h-4 text-blue-400" />
            <span>Retake Test</span>
          </button>
          <button
            onClick={onBackToDashboard}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: OFFICIAL IELTS BAND SCORE CERTIFICATION CARD */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-blue-950/80 border-2 border-blue-500/30 p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Background Decorative Seals */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-6 relative z-10">
          {/* Certificate Title & Candidate info */}
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              Official IELTS Sprint Band Conversion · Verified
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-serif">
              Statement of Results
            </h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-slate-300 font-mono">
              <div>
                <span className="text-slate-500 block">Candidate:</span>
                <span className="font-bold text-white text-sm">{candidateName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Test Module:</span>
                <span className="font-bold text-white text-sm truncate block max-w-xs">{testTitle}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Verification ID:</span>
                <span className="font-bold text-blue-400">IS-894021-{testSetId}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Time Taken:</span>
                <span className="font-bold text-white">{formatTime(timeElapsedSec)}</span>
              </div>
            </div>
          </div>

          {/* Official Large Band Badge */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-950/80 border border-blue-500/40 text-center space-y-2 min-w-[200px] shadow-inner">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
              Overall Band Score
            </span>
            <div className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-amber-300 font-mono">
              Band {officialBand.toFixed(1)}
            </div>
            <span className="px-3 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold font-mono">
              {cefr}
            </span>
          </div>
        </div>

        {/* Stats Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80 relative z-10 text-center">
          <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Raw Marks</span>
            <span className="text-xl font-black text-white font-mono">{correctCount} / {totalQuestions}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Accuracy</span>
            <span className={`text-xl font-black font-mono ${accuracyPercent >= 80 ? 'text-emerald-400' : accuracyPercent >= 60 ? 'text-blue-400' : 'text-amber-400'}`}>
              {accuracyPercent}%
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Pacing Efficiency</span>
            <span className="text-xl font-black text-white font-mono">
              {(timeElapsedSec / Math.max(1, totalQuestions)).toFixed(0)}s / q
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Status</span>
            <span className="text-xl font-black text-emerald-400 font-mono">GRADED</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: DIAGNOSTIC WEAKNESS RADAR & SPRINT RECOMMENDATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Accuracy Breakdown (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-bold text-white">Diagnostic Category Performance</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {Object.keys(categoryStats).length} Formats Analyzed
            </span>
          </div>

          <div className="space-y-4">
            {Object.entries(categoryStats).map(([catName, stat]) => {
              const acc = Math.round((stat.correct / stat.total) * 100);
              const isStrong = acc >= 80;
              const isModerate = acc >= 60 && acc < 80;

              return (
                <div key={catName} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-slate-200">{catName}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">
                        {stat.correct} / {stat.total} Correct
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${
                          isStrong
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : isModerate
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {acc}%
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        isStrong ? 'bg-emerald-500' : isModerate ? 'bg-blue-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${acc}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sprint Action Recommendation Card (1 col) */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950/80 border border-indigo-500/30 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider">
              <Lightbulb className="w-4 h-4 fill-current" />
              Sprint Action Recommendation
            </div>
            <h3 className="text-xl font-black text-white">Targeted Weakness Focus</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Based on your psychometric response profile, your primary growth area is{' '}
              <span className="text-amber-300 font-bold underline">{weakestCategory || 'General Accuracy'}</span>.
            </p>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-500/30 space-y-2 text-xs">
              <span className="font-bold text-indigo-300 flex items-center gap-1.5 font-mono">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Actionable Focus Tip:
              </span>
              <p className="text-slate-300 leading-relaxed font-serif italic">
                {weakestCategory.toLowerCase().includes('map') || weakestCategory.toLowerCase().includes('directional')
                  ? 'Focus on spatial prepositions and directional cues (e.g., "adjoining", "nestled behind", "opposite"). Track the speaker\'s starting anchor point continuously.'
                  : weakestCategory.toLowerCase().includes('self-correction') || weakestCategory.toLowerCase().includes('trap')
                  ? 'Watch out for distractor turn-around phrases like "actually", "Wait, no", or "please forgive me". Always record the final corrected answer.'
                  : weakestCategory.toLowerCase().includes('true') || weakestCategory.toLowerCase().includes('false')
                  ? 'Remember: FALSE means the text explicitly contradicts the statement. NOT GIVEN means zero evidence exists—do not assume outside facts.'
                  : 'Review distractor keywords carefully before submitting. Ensure your written answers strictly comply with word count limits.'}
              </p>
            </div>
          </div>

          <button
            onClick={onRetake}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-md inline-flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Launch Targeted Sprint Drill</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: INTERACTIVE ANSWER REVIEW & BILINGUAL TRAP ANALYSIS */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
        {/* Review Toolbar & Language Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Interactive Answer Key & Bilingual Trap Analysis
            </h3>
            <p className="text-xs text-slate-400">
              Review every item, locate answers in transcript, and toggle Bengali distractor explanations.
            </p>
          </div>

          {/* Filters & Global Bilingual Toggle */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Filter Mode */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-bold ${
                  filterMode === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({totalQuestions})
              </button>
              <button
                onClick={() => setFilterMode('incorrect')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-bold ${
                  filterMode === 'incorrect' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Incorrect ({totalQuestions - correctCount})
              </button>
              <button
                onClick={() => setFilterMode('correct')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-bold ${
                  filterMode === 'correct' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Correct ({correctCount})
              </button>
            </div>

            {/* Global Language Toggle */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
              <span className="text-[10px] text-slate-500 px-2 flex items-center gap-1">
                <Globe className="w-3 h-3 text-blue-400" /> Explanations:
              </span>
              <button
                onClick={() => handleGlobalLangToggle('en')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  globalLang === 'en' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                🇬🇧 English
              </button>
              <button
                onClick={() => handleGlobalLangToggle('bn')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  globalLang === 'bn' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                🇧🇩 বাংলা
              </button>
            </div>
          </div>
        </div>

        {/* Question Items Review Grid */}
        <div className="space-y-4">
          {filteredQuestions.map((q) => {
            const userVal = (userAnswers[q.id] || '').trim();
            const normUser = normalize(userVal);
            const normCorrect = normalize(q.correctAnswer);
            const isCorrect = normUser === normCorrect || (normUser && normUser.replace(/\s+/g, '') === normCorrect.replace(/\s+/g, ''));
            const lang = langPreference[q.id] || globalLang;
            const isExpanded = expandedQuestionId === q.id;

            return (
              <div
                key={q.id}
                className={`p-5 rounded-2xl border transition-all duration-200 space-y-4 ${
                  isCorrect
                    ? 'bg-slate-950/60 border-slate-800 hover:border-emerald-500/40'
                    : 'bg-slate-950/80 border-rose-500/30 hover:border-rose-500/50'
                }`}
              >
                {/* Item Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-black text-xs text-white ${
                        isCorrect ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}
                    >
                      {q.id}
                    </span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {q.type}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Save to SM-2 Vault Button */}
                    {!isCorrect && (
                      <button
                        onClick={() => handleSaveQuestionToVault(q)}
                        disabled={savedToVaultIds.has(q.id)}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold transition flex items-center gap-1 cursor-pointer ${
                          savedToVaultIds.has(q.id)
                            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                            : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-300'
                        }`}
                      >
                        <BookmarkPlus className="w-3 h-3" />
                        <span>{savedToVaultIds.has(q.id) ? 'Saved in SM-2 Vault' : '+ SM-2 Vault'}</span>
                      </button>
                    )}

                    {/* Bilingual Toggle Button */}
                    <button
                      onClick={() => handleToggleLang(q.id)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-mono font-bold text-slate-300 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Globe className="w-3 h-3 text-blue-400" />
                      <span>{lang === 'en' ? 'Switch to 🇧🇩 বাংলা' : 'Switch to 🇬🇧 English'}</span>
                    </button>

                    {/* Locate in Transcript Button */}
                    {(listeningScript || readingPassage) && (
                      <button
                        onClick={() => {
                          setLocatedQuestion(q);
                          onShowToast(`Highlighting answer location for Question ${q.id}`);
                        }}
                        className="px-3 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Locate in {activeSkill === 'listening' ? 'Transcript' : 'Passage'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Question Prompt */}
                <p className="text-sm sm:text-base font-semibold text-slate-100 font-serif">
                  {q.prompt}
                </p>

                {/* Candidate Input vs Official Correct Answer */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  {/* Candidate Input */}
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      isCorrect
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Your Answer:</span>
                      <span className="font-bold text-sm">{userVal || '(Unanswered)'}</span>
                    </div>
                    {isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    )}
                  </div>

                  {/* Official Correct Answer */}
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Official Correct Answer:</span>
                      <span className="font-bold text-sm text-emerald-300">{q.correctAnswer}</span>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  </div>
                </div>

                {/* Explanation Block (Bilingual English / Bengali) */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-mono font-bold text-slate-400">
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <Sparkles className="w-3.5 h-3.5" />
                      {lang === 'bn' ? '🇧🇩 বাংলা ট্র্যাপ বিশ্লেষণ (Distractor Note)' : '🇬🇧 Official English Explanation'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {lang === 'bn' ? 'Bengali Notes' : 'Cambridge Calibrated'}
                    </span>
                  </div>

                  <p className={`leading-relaxed ${lang === 'bn' ? 'text-emerald-300 font-sans text-sm' : 'text-slate-300 font-serif'}`}>
                    {lang === 'bn' ? getBilingualBengaliTrapExplanation(q) : q.explanation}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* LOCATE IN TRANSCRIPT / PASSAGE DRAWER MODAL */}
      {locatedQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-3xl w-full max-h-[85vh] flex flex-col space-y-4 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold text-white">
                  Answer Location · Question {locatedQuestion.id}
                </h3>
              </div>
              <button
                onClick={() => setLocatedQuestion(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs sm:text-sm text-slate-300 font-serif leading-relaxed">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-200 font-mono text-xs">
                <span className="font-bold text-white block mb-0.5">Question Prompt:</span>
                "{locatedQuestion.prompt}" — <span className="text-emerald-400 font-bold">Answer: {locatedQuestion.correctAnswer}</span>
              </div>

              {activeSkill === 'listening' && listeningScript ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 font-serif text-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400 uppercase font-bold">
                      Full Audio Transcript Excerpt (Click any line for British RP Audio):
                    </span>
                    <button
                      onClick={() => speakBritish(locatedQuestion.correctAnswer, { rate: 0.92 })}
                      className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Pronounce "{locatedQuestion.correctAnswer}"</span>
                    </button>
                  </div>
                  <div className="whitespace-pre-line leading-relaxed space-y-1">
                    {listeningScript.split('\n').map((line, idx) => {
                      const isTarget = line.toLowerCase().includes(locatedQuestion.correctAnswer.toLowerCase()) ||
                        line.toLowerCase().includes(locatedQuestion.prompt.toLowerCase().slice(0, 15));
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (line.trim()) {
                              speakBritish(line.replace(/^[A-Za-z\s]+:\s*/, ''), { rate: 0.94 });
                            }
                          }}
                          className={`p-2 rounded-lg transition cursor-pointer flex items-start justify-between gap-2 ${
                            isTarget
                              ? 'bg-amber-500/20 text-amber-200 border-l-4 border-amber-400 font-bold'
                              : 'hover:bg-slate-900'
                          }`}
                        >
                          <span>{line}</span>
                          {line.trim() && (
                            <Volume2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-1 opacity-75 hover:opacity-100" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : activeSkill === 'reading' && readingPassage ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 font-serif text-slate-200">
                  <span className="text-xs font-mono text-slate-400 block uppercase font-bold">Reading Passage Excerpt:</span>
                  <div className="whitespace-pre-line leading-relaxed">
                    {readingPassage.split('\n\n').map((para, idx) => {
                      const isTarget = para.toLowerCase().includes(locatedQuestion.correctAnswer.toLowerCase()) ||
                        para.toLowerCase().includes(locatedQuestion.prompt.toLowerCase().slice(0, 15));
                      return (
                        <p
                          key={idx}
                          className={`p-2 rounded transition mb-2 ${
                            isTarget ? 'bg-amber-500/20 text-amber-200 border-l-4 border-amber-400 font-bold' : ''
                          }`}
                        >
                          {para}
                        </p>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 italic">No transcript or passage excerpt available for this item.</p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setLocatedQuestion(null)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer"
              >
                Close Location View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
