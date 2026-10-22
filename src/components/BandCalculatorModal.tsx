import React, { useState } from 'react';
import {
  Calculator,
  Sparkles,
  CheckCircle2,
  Table,
  Target,
  GraduationCap,
  Globe2,
  Award,
  ChevronRight,
  Info
} from 'lucide-react';
import { soundManager } from '../utils/audioEffects';
import { ResponsiveModal } from './common/ResponsiveModal';

interface BandCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'calculator' | 'matrix' | 'benchmarks';

interface RawScoreRange {
  band: number;
  listeningRaw: string;
  acadReadingRaw: string;
  gtReadingRaw: string;
}

const CAMBRIDGE_RAW_MATRIX: RawScoreRange[] = [
  { band: 9.0, listeningRaw: '39–40', acadReadingRaw: '39–40', gtReadingRaw: '40' },
  { band: 8.5, listeningRaw: '37–38', acadReadingRaw: '37–38', gtReadingRaw: '39' },
  { band: 8.0, listeningRaw: '35–36', acadReadingRaw: '35–36', gtReadingRaw: '37–38' },
  { band: 7.5, listeningRaw: '32–34', acadReadingRaw: '33–34', gtReadingRaw: '36' },
  { band: 7.0, listeningRaw: '30–31', acadReadingRaw: '30–32', gtReadingRaw: '34–35' },
  { band: 6.5, listeningRaw: '26–29', acadReadingRaw: '27–29', gtReadingRaw: '32–33' },
  { band: 6.0, listeningRaw: '23–25', acadReadingRaw: '23–26', gtReadingRaw: '30–31' },
  { band: 5.5, listeningRaw: '18–22', acadReadingRaw: '19–22', gtReadingRaw: '27–29' },
  { band: 5.0, listeningRaw: '16–17', acadReadingRaw: '15–18', gtReadingRaw: '23–26' },
  { band: 4.5, listeningRaw: '13–15', acadReadingRaw: '13–14', gtReadingRaw: '19–22' },
  { band: 4.0, listeningRaw: '10–12', acadReadingRaw: '10–12', gtReadingRaw: '15–18' },
];

export const BandCalculatorModal: React.FC<BandCalculatorModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('calculator');
  const [listening, setListening] = useState<number>(7.5);
  const [reading, setReading] = useState<number>(7.0);
  const [writing, setWriting] = useState<number>(6.5);
  const [speaking, setSpeaking] = useState<number>(7.0);

  // Raw score lookup state
  const [interactiveModule, setInteractiveModule] = useState<'listening' | 'academic_reading' | 'gt_reading'>('listening');
  const [rawScoreInput, setRawScoreInput] = useState<number>(32);

  // One Skill Retake (OSR) Simulator State
  const [osrSkill, setOsrSkill] = useState<'listening' | 'reading' | 'writing' | 'speaking'>('writing');
  const [osrTarget, setOsrTarget] = useState<number>(7.5);

  if (!isOpen) return null;

  // Cambridge arithmetic rounding function
  const calculateCambridgeBand = (l: number, r: number, w: number, s: number) => {
    const raw = (l + r + w + s) / 4;
    const whole = Math.floor(raw);
    const frac = raw - whole;

    let rounded = whole;
    if (frac >= 0.75) {
      rounded = whole + 1.0;
    } else if (frac >= 0.25) {
      rounded = whole + 0.5;
    } else {
      rounded = whole;
    }
    return { raw, rounded };
  };

  const currentScore = calculateCambridgeBand(listening, reading, writing, speaking);

  // Recalculate with OSR
  const osrL = osrSkill === 'listening' ? osrTarget : listening;
  const osrR = osrSkill === 'reading' ? osrTarget : reading;
  const osrW = osrSkill === 'writing' ? osrTarget : writing;
  const osrS = osrSkill === 'speaking' ? osrTarget : speaking;
  const osrScore = calculateCambridgeBand(osrL, osrR, osrW, osrS);

  // Convert raw score to Band
  const getBandFromRaw = (score: number, moduleType: 'listening' | 'academic_reading' | 'gt_reading'): number => {
    if (moduleType === 'listening') {
      if (score >= 39) return 9.0;
      if (score >= 37) return 8.5;
      if (score >= 35) return 8.0;
      if (score >= 32) return 7.5;
      if (score >= 30) return 7.0;
      if (score >= 26) return 6.5;
      if (score >= 23) return 6.0;
      if (score >= 18) return 5.5;
      if (score >= 16) return 5.0;
      if (score >= 13) return 4.5;
      if (score >= 10) return 4.0;
      return 3.5;
    }
    if (moduleType === 'academic_reading') {
      if (score >= 39) return 9.0;
      if (score >= 37) return 8.5;
      if (score >= 35) return 8.0;
      if (score >= 33) return 7.5;
      if (score >= 30) return 7.0;
      if (score >= 27) return 6.5;
      if (score >= 23) return 6.0;
      if (score >= 19) return 5.5;
      if (score >= 15) return 5.0;
      if (score >= 13) return 4.5;
      if (score >= 10) return 4.0;
      return 3.5;
    }
    // GT Reading
    if (score >= 40) return 9.0;
    if (score >= 39) return 8.5;
    if (score >= 37) return 8.0;
    if (score >= 36) return 7.5;
    if (score >= 34) return 7.0;
    if (score >= 32) return 6.5;
    if (score >= 30) return 6.0;
    if (score >= 27) return 5.5;
    if (score >= 23) return 5.0;
    if (score >= 19) return 4.5;
    if (score >= 15) return 4.0;
    return 3.5;
  };

  const calculatedRawBand = getBandFromRaw(rawScoreInput, interactiveModule);

  // Benchmarks criteria
  const isClb9 = listening >= 8.0 && reading >= 7.0 && writing >= 7.0 && speaking >= 7.0;
  const isClb10 = listening >= 8.5 && reading >= 8.0 && writing >= 7.5 && speaking >= 7.5;
  const isAusSuperior = listening >= 8.0 && reading >= 8.0 && writing >= 8.0 && speaking >= 8.0;
  const isMastersEligible = currentScore.rounded >= 7.0 && Math.min(listening, reading, writing, speaking) >= 6.5;
  const isOxbridgeEligible = currentScore.rounded >= 7.5 && Math.min(listening, reading, writing, speaking) >= 7.0;

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="3xl"
      icon={
        <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
          <Calculator className="w-5 h-5" />
        </div>
      }
      title="Official Band Calculator & Cambridge Scoring Matrix"
      subtitle="Accurate Cambridge rounding rules, raw score to band conversion, and visa benchmarks."
    >
      <div className="space-y-5">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(520, 0.03);
              setActiveTab('calculator');
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'calculator'
                ? 'bg-white dark:bg-[#0B1224] text-blue-700 dark:text-blue-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Overall & OSR Simulator</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(520, 0.03);
              setActiveTab('matrix');
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'matrix'
                ? 'bg-white dark:bg-[#0B1224] text-blue-700 dark:text-blue-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Raw Score Matrix (/40)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(520, 0.03);
              setActiveTab('benchmarks');
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'benchmarks'
                ? 'bg-white dark:bg-[#0B1224] text-blue-700 dark:text-blue-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Target Visa & Uni Benchmarks</span>
          </button>
        </div>

        {/* TAB 1: OVERALL CALCULATOR & OSR */}
        {activeTab === 'calculator' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Current Band Banner */}
            <div className="bg-gradient-to-r from-[#0B1224] via-blue-900 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 flex items-center justify-between border border-blue-500/20 shadow-md">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-300">
                  Official Cambridge Overall
                </span>
                <div className="text-xs text-blue-100 mt-1">
                  Arithmetic Average: <span className="font-mono font-bold text-white text-sm">{currentScore.raw.toFixed(3)}</span>
                </div>
                <div className="text-[11px] text-blue-200/80 mt-0.5">
                  Rounding Rule: <span className="text-amber-300 font-semibold">{currentScore.raw.toFixed(2)} → {currentScore.rounded.toFixed(1)}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">Band Result</span>
                <div className="font-mono text-4xl sm:text-5xl font-black text-amber-300 drop-shadow-sm">
                  {currentScore.rounded.toFixed(1)}
                </div>
              </div>
            </div>

            {/* 4 Interactive Range Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">🎧 Listening</span>
                  <span className="font-mono font-black text-blue-700 dark:text-blue-400 text-sm">Band {listening.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="4.0"
                  max="9.0"
                  step="0.5"
                  value={listening}
                  onChange={(e) => setListening(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>Band 4.0</span>
                  <span>Band 9.0</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">📖 Reading</span>
                  <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">Band {reading.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="4.0"
                  max="9.0"
                  step="0.5"
                  value={reading}
                  onChange={(e) => setReading(parseFloat(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>Band 4.0</span>
                  <span>Band 9.0</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">✍️ Writing</span>
                  <span className="font-mono font-black text-purple-700 dark:text-purple-400 text-sm">Band {writing.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="4.0"
                  max="9.0"
                  step="0.5"
                  value={writing}
                  onChange={(e) => setWriting(parseFloat(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>Band 4.0</span>
                  <span>Band 9.0</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">🎙️ Speaking</span>
                  <span className="font-mono font-black text-amber-700 dark:text-amber-400 text-sm">Band {speaking.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="4.0"
                  max="9.0"
                  step="0.5"
                  value={speaking}
                  onChange={(e) => setSpeaking(parseFloat(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>Band 4.0</span>
                  <span>Band 9.0</span>
                </div>
              </div>
            </div>

            {/* One Skill Retake (OSR) Simulator Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200 text-xs uppercase tracking-wide">
                  <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Official One Skill Retake (OSR) Projection
                </div>
                <span className="text-[10px] font-mono text-amber-900 dark:text-amber-300 bg-amber-200/80 dark:bg-amber-900/60 px-2.5 py-0.5 rounded-full font-bold">
                  Valid 60 Days Post-Exam
                </span>
              </div>
              <p className="text-xs text-amber-950 dark:text-amber-300/90 leading-relaxed">
                Eligible candidates can retake just <strong>one single module</strong> (Listening, Reading, Writing, or Speaking) to boost their total band score without repeating the other three:
              </p>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <select
                  value={osrSkill}
                  onChange={(e) => setOsrSkill(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs"
                >
                  <option value="writing">Retake Writing Only</option>
                  <option value="listening">Retake Listening Only</option>
                  <option value="reading">Retake Reading Only</option>
                  <option value="speaking">Retake Speaking Only</option>
                </select>

                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs text-amber-900 dark:text-amber-300 font-semibold whitespace-nowrap">Retake Target:</span>
                  <input
                    type="range"
                    min="4.0"
                    max="9.0"
                    step="0.5"
                    value={osrTarget}
                    onChange={(e) => setOsrTarget(parseFloat(e.target.value))}
                    className="flex-1 accent-amber-600 cursor-pointer"
                  />
                  <span className="font-mono text-xs font-black text-amber-950 dark:text-amber-200 w-10 text-right">
                    {osrTarget.toFixed(1)}
                  </span>
                </div>

                <div className="bg-white dark:bg-[#0B1224] px-4 py-2 rounded-xl border border-amber-300 dark:border-amber-700/80 font-mono text-xs font-bold text-slate-800 dark:text-slate-200 shrink-0 shadow-2xs">
                  OSR Composite: <span className="text-blue-600 dark:text-blue-400 text-base font-black ml-1">{osrScore.rounded.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RAW SCORE MATRIX (/40) */}
        {activeTab === 'matrix' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Interactive Calculator by raw number */}
            <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 space-y-3">
              <span className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5 uppercase tracking-wide">
                <Table className="w-4 h-4 text-blue-600" />
                Raw Score Instant Converter
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Exam Component</label>
                  <select
                    value={interactiveModule}
                    onChange={(e) => setInteractiveModule(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200"
                  >
                    <option value="listening">Listening (Academic & GT)</option>
                    <option value="academic_reading">Academic Reading</option>
                    <option value="gt_reading">General Training Reading</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    <span>Correct Answers:</span>
                    <span className="font-mono font-black text-blue-700 dark:text-blue-400">{rawScoreInput} / 40</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="40"
                    step="1"
                    value={rawScoreInput}
                    onChange={(e) => setRawScoreInput(parseInt(e.target.value, 10))}
                    className="w-full accent-blue-600 mt-2 cursor-pointer"
                  />
                </div>

                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-between sm:justify-center sm:flex-col">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Equivalent Band:</span>
                  <span className="text-2xl sm:text-3xl font-mono font-black text-blue-600 dark:text-blue-400">
                    Band {calculatedRawBand.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Official Cambridge Table */}
            <div className="border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-[#0B1224]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Band Score</th>
                      <th className="py-2.5 px-3">Listening (40 Qs)</th>
                      <th className="py-2.5 px-3">Academic Reading (40 Qs)</th>
                      <th className="py-2.5 px-3">General Training Reading (40 Qs)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono">
                    {CAMBRIDGE_RAW_MATRIX.map((row) => (
                      <tr
                        key={row.band}
                        className={`hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors ${
                          row.band >= 7.0 ? 'font-bold' : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-blue-600 dark:text-blue-400 font-black">
                          Band {row.band.toFixed(1)}
                        </td>
                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{row.listeningRaw}</td>
                        <td className="py-2 px-3 text-emerald-700 dark:text-emerald-400">{row.acadReadingRaw}</td>
                        <td className="py-2 px-3 text-amber-700 dark:text-amber-400">{row.gtReadingRaw}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <span>
                <strong>Important IELTS Distinction:</strong> General Training Reading requires 34 correct answers for Band 7.0, whereas Academic Reading requires only 30. This is because Academic passages are longer and use technical scientific/humanities terminology.
              </span>
            </div>
          </div>
        )}

        {/* TAB 3: TARGET BENCHMARKS */}
        {activeTab === 'benchmarks' && (
          <div className="space-y-3.5 animate-in fade-in duration-200">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Live status based on your current inputs ({listening.toFixed(1)} / {reading.toFixed(1)} / {writing.toFixed(1)} / {speaking.toFixed(1)} = Overall {currentScore.rounded.toFixed(1)}):
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* CLB 9 */}
              <div className={`p-4 rounded-2xl border text-xs space-y-2 transition ${
                isClb9
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                  : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Globe2 className="w-4 h-4 text-emerald-600" />
                    Canada Express Entry (CLB 9)
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isClb9 ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {isClb9 ? 'QUALIFIED ✓' : 'NOT MET'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Grants maximum CRS points for skills transferability. Minimum requirements: <strong>L: 8.0, R: 7.0, W: 7.0, S: 7.0</strong>.
                </p>
              </div>

              {/* CLB 10 */}
              <div className={`p-4 rounded-2xl border text-xs space-y-2 transition ${
                isClb10
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                  : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-emerald-600" />
                    Canada CLB 10 (Gold Standard)
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isClb10 ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {isClb10 ? 'QUALIFIED ✓' : 'NOT MET'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Highest possible language bracket in Express Entry. Minimum requirements: <strong>L: 8.5, R: 8.0, W: 7.5, S: 7.5</strong>.
                </p>
              </div>

              {/* Oxbridge / Ivy League */}
              <div className={`p-4 rounded-2xl border text-xs space-y-2 transition ${
                isOxbridgeEligible
                  ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800'
                  : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-blue-600" />
                    Oxford, Cambridge & Ivy League
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isOxbridgeEligible ? 'bg-blue-200 text-blue-900' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {isOxbridgeEligible ? 'QUALIFIED ✓' : 'NOT MET'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Standard postgraduate requirement: <strong>Overall 7.5</strong> with no individual sub-band below <strong>7.0</strong>.
                </p>
              </div>

              {/* Australia Superior English */}
              <div className={`p-4 rounded-2xl border text-xs space-y-2 transition ${
                isAusSuperior
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                  : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Globe2 className="w-4 h-4 text-amber-600" />
                    Australia PR (Superior English)
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isAusSuperior ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {isAusSuperior ? '20 PR POINTS ✓' : 'NOT MET'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Awards 20 points for Australian Subclass 189/190 visas. Requires <strong>Band 8.0 in ALL FOUR modules</strong>.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </ResponsiveModal>
  );
};
