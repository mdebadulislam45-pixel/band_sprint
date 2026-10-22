import React, { useState } from 'react';
import {
  Compass,
  Volume2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  MapPin,
  Play,
  Square,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';
import { AudioPlaybackWaveform } from '../audio/AudioPlaybackWaveform';

interface MapQuestion {
  id: string;
  label: string;
  correctLetter: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
  explanation: string;
}

const MAP_QUESTIONS: MapQuestion[] = [
  {
    id: 'q11',
    label: '11. Graduate Research Library',
    correctLetter: 'B',
    explanation: 'From the main reception rotunda, take the northern pathway past the fountain. The Graduate Library is located immediately adjacent to the rose gardens on your left.'
  },
  {
    id: 'q12',
    label: '12. Biological Sciences Laboratory',
    correctLetter: 'E',
    explanation: 'Head east along Willow Way. Immediately after crossing the footbridge, the laboratory is situated directly opposite the solar pavilion.'
  },
  {
    id: 'q13',
    label: '13. Campus Health Centre',
    correctLetter: 'A',
    explanation: 'Situated in the extreme northwest corner of the precinct, just beyond the student union building and overlooking the car park.'
  },
  {
    id: 'q14',
    label: '14. Multi-Faith Sanctuary',
    correctLetter: 'G',
    explanation: 'Proceed south toward River Cam. The sanctuary lies at the southern bend, nestled in the secluded copse of oak trees.'
  },
  {
    id: 'q15',
    label: '15. Career Placement Office',
    correctLetter: 'D',
    explanation: 'Right in the central quadrant, facing the clock tower and sharing the courtyard with the administrative block.'
  }
];

const AUDIO_SCRIPT = `Welcome to the Cambridge University South Precinct orientation. If you consult your campus map, we are currently standing at the Main Reception Rotunda at the southern entrance. 
Now, for those of you requiring the Graduate Research Library (Question 11), proceed directly north along the central avenue past the ornamental fountain. The library is the imposing brick structure located immediately adjacent to the rose gardens on your left—that corresponds to Letter B.
Next, if you are looking for the Biological Sciences Laboratory (Question 12), follow Willow Way heading east. Cross the pedestrian footbridge over the brook, and you will see the modern three-storey lab situated directly opposite the solar pavilion at Letter E.
For medical appointments, the Campus Health Centre (Question 13) is tucked away in the extreme northwest corner of the grounds, past the student union and overlooking the visitor car park at Letter A.
The Multi-Faith Sanctuary (Question 14) offers a quiet retreat down by the southern bend of the river, nestled quietly within the grove of trees marked by Letter G.
Finally, the Career Placement Office (Question 15) can be found in the central administrative court, facing directly toward the clock tower at Letter D.`;

export const ListeningMapLab: React.FC = () => {
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeHoverPin, setActiveHoverPin] = useState<string | null>(null);

  const handleSelectOption = (questionId: string, letter: string) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: letter }));
    soundManager.playBeep(560, 0.03);
  };

  const handlePlayAudio = () => {
    if (isPlayingAudio) {
      stopSpeech();
      setIsPlayingAudio(false);
      return;
    }
    setIsPlayingAudio(true);
    speakBritish(AUDIO_SCRIPT, {
      onEnd: () => setIsPlayingAudio(false),
      onError: () => setIsPlayingAudio(false)
    });
  };

  const handleSubmit = () => {
    setSubmitted(true);
    let correct = 0;
    MAP_QUESTIONS.forEach((q) => {
      if (userAnswers[q.id] === q.correctLetter) correct++;
    });
    if (correct >= 4) {
      soundManager.playSuccess();
    } else {
      soundManager.playBeep(440, 0.1);
    }
  };

  const handleReset = () => {
    setUserAnswers({});
    setSubmitted(false);
    stopSpeech();
    setIsPlayingAudio(false);
    soundManager.playBeep(480, 0.04);
  };

  const pinCoordinates: Record<string, { x: number; y: number; label: string }> = {
    A: { x: 75, y: 55, label: 'Northwest Pavilion' },
    B: { x: 190, y: 70, label: 'North Rose Garden Wing' },
    C: { x: 330, y: 60, label: 'Northeast Arena' },
    D: { x: 200, y: 155, label: 'Central Clock Courtyard' },
    E: { x: 340, y: 160, label: 'East Footbridge Sector' },
    F: { x: 90, y: 220, label: 'Southwest Arcade' },
    G: { x: 260, y: 250, label: 'Riverside Copse' },
    H: { x: 350, y: 260, label: 'Southeast Boat Sheds' }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-fade-in select-none">
      {/* ================= HEADER ================= */}
      <div className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-[#101B32] text-white border border-slate-700/80 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-mono font-bold border border-emerald-400/30">
            <Compass className="w-3.5 h-3.5 text-amber-300" />
            <span>IELTS LISTENING SECTION 2 LAB</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Interactive Directional Map & Diagram Simulator
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Master spatial prepositions, turning orientations, and campus diagram labeling—the #1 trap area in Cambridge Listening Section 2.
          </p>
        </div>
      </div>

      {/* ================= AUDIO PLAYER BAR ================= */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handlePlayAudio}
            className={`min-h-[44px] px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
              isPlayingAudio
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
            }`}
          >
            {isPlayingAudio ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                <span>Pause Recording</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Play British Audio Tour (01:25)</span>
              </>
            )}
          </button>

          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            {isPlayingAudio ? '🎙️ Playing Arthur (British Council RP)...' : '🎧 Listen carefully for spatial markers'}
          </span>
        </div>

        {/* Visual Frequency Waveform Animation */}
        <div className="flex items-center gap-2">
          <AudioPlaybackWaveform
            isPlaying={isPlayingAudio}
            isLoading={false}
            height={28}
            barCount={16}
            variant="compact"
            showLabel={true}
            label={isPlayingAudio ? 'Audio Guide Playing' : 'Audio Guide Ready'}
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline p-1"
          >
            {showTranscript ? 'Hide Transcript' : 'View Audio Transcript'}
          </button>
          <button
            onClick={handleReset}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="Reset answers"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Transcript Accordion */}
      {showTranscript && (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-serif space-y-2 animate-fade-in">
          <div className="font-bold text-[11px] uppercase font-mono text-blue-600">Official Recording Transcript:</div>
          <p>{AUDIO_SCRIPT}</p>
        </div>
      )}

      {/* ================= MAP + QUESTIONS WORKSPACE ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Vector Campus Map (SVG) */}
        <div className="lg:col-span-7 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Cambridge University South Precinct Map
            </span>
            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
              <Compass className="w-3.5 h-3.5 text-blue-500" />
              <span>North ▲</span>
            </div>
          </div>

          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
            {/* SVG Visual Layout */}
            <svg viewBox="0 0 420 300" className="w-full h-full">
              {/* Grass / Grounds */}
              <rect x="0" y="0" width="420" height="300" fill="#E8F4E8" className="dark:fill-[#0F1E17]" />

              {/* River Cam at South */}
              <path
                d="M 0 270 Q 150 240, 280 275 T 420 280 L 420 300 L 0 300 Z"
                fill="#C6E2FF"
                className="dark:fill-[#142A45]"
              />
              <text x="30" y="288" fontSize="10" fill="#3B82F6" fontWeight="bold">River Cam</text>

              {/* Pathways */}
              {/* Central Avenue */}
              <rect x="195" y="40" width="16" height="230" fill="#E2E8F0" className="dark:fill-[#1E293B]" />
              {/* Willow Way (East) */}
              <rect x="200" y="145" width="220" height="14" fill="#E2E8F0" className="dark:fill-[#1E293B]" />
              <text x="280" y="140" fontSize="9" fill="#64748B" fontWeight="bold">Willow Way →</text>
              {/* West Path */}
              <rect x="0" y="145" width="200" height="14" fill="#E2E8F0" className="dark:fill-[#1E293B]" />

              {/* Footbridge */}
              <rect x="280" y="143" width="16" height="18" fill="#94A3B8" />

              {/* Reception Rotunda (Start Point) */}
              <circle cx="203" cy="270" r="18" fill="#3B82F6" opacity="0.3" />
              <circle cx="203" cy="270" r="12" fill="#2563EB" />
              <text x="160" y="295" fontSize="9" fill="#1E293B" className="dark:fill-white" fontWeight="bold">
                You Are Here (Rotunda)
              </text>

              {/* Fountain */}
              <circle cx="203" cy="115" r="9" fill="#60A5FA" />
              <text x="215" y="118" fontSize="8" fill="#64748B">Fountain</text>

              {/* Rose Gardens */}
              <rect x="140" y="60" width="45" height="30" rx="4" fill="#FCE7F3" className="dark:fill-[#371B2F]" />
              <text x="143" y="78" fontSize="8" fill="#DB2777" fontWeight="bold">Rose Garden</text>

              {/* Interactive Pins A through H */}
              {Object.entries(pinCoordinates).map(([letter, coord]) => {
                const isHovered = activeHoverPin === letter;
                return (
                  <g
                    key={letter}
                    onMouseEnter={() => setActiveHoverPin(letter)}
                    onMouseLeave={() => setActiveHoverPin(null)}
                    className="cursor-pointer transition-transform"
                  >
                    <circle
                      cx={coord.x}
                      cy={coord.y}
                      r={isHovered ? 16 : 13}
                      fill={isHovered ? '#F59E0B' : '#2563EB'}
                      className="transition-all duration-150 drop-shadow-md"
                    />
                    <text
                      x={coord.x}
                      y={coord.y + 4.5}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="12"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {letter}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Hover over pin letters (A–H) to verify landmark locations.</span>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
              {activeHoverPin ? `Pin ${activeHoverPin}: ${pinCoordinates[activeHoverPin]?.label}` : 'Select pin'}
            </span>
          </div>
        </div>

        {/* Right: Question Answer Sheet */}
        <div className="lg:col-span-5 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#101B32] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-2.5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Questions 11–15: Campus Map Labeling
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select the correct letter, <strong>A–H</strong>, next to Questions 11–15.
            </p>
          </div>

          <div className="space-y-3.5">
            {MAP_QUESTIONS.map((q) => {
              const selected = userAnswers[q.id];
              const isCorrect = selected === q.correctLetter;

              return (
                <div key={q.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-100">
                    <span>{q.label}</span>
                    {submitted && (
                      <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isCorrect ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                      }`}>
                        {isCorrect ? '✓ Correct' : `✗ Correct: ${q.correctLetter}`}
                      </span>
                    )}
                  </div>

                  {/* Letter Selection Buttons */}
                  <div className="flex flex-wrap gap-1">
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((letter) => (
                      <button
                        key={letter}
                        onClick={() => handleSelectOption(q.id, letter)}
                        className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center border ${
                          selected === letter
                            ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 hover:border-blue-400 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {letter}
                      </button>
                    ))}
                  </div>

                  {submitted && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1 border-t border-slate-100 dark:border-slate-800">
                      💡 {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            {!submitted ? (
              <button
                onClick={handleSubmit}
                disabled={Object.keys(userAnswers).length === 0}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition disabled:opacity-40"
              >
                Submit & Check Map Answers
              </button>
            ) : (
              <button
                onClick={handleReset}
                className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
