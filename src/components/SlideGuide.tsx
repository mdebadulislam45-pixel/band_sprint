import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Headphones, BookOpen, PenTool, Mic, AlertCircle, ArrowRight, Play, CheckCircle } from 'lucide-react';
import { soundManager } from '../utils/audioEffects';
import { speakBritish, stopSpeech } from '../utils/britishVoice';

interface SlideGuideProps {
  onNavigate: (module: string) => void;
}

export const SlideGuide: React.FC<SlideGuideProps> = ({ onNavigate }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [distractorPlayed, setDistractorPlayed] = useState(false);

  const totalSlides = 5;

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const playDistractorDemo = () => {
    soundManager.playBeep(440, 0.1);
    stopSpeech();
    speakBritish(
      "Please meet me at 14 Elm Street... oh wait, forgive me, they relocated to 40 Elm Street last Tuesday! So that's four zero Elm Street.",
      {
        rate: 0.94,
        onEnd: () => setDistractorPlayed(true),
        onError: () => setDistractorPlayed(true)
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header controls & dots */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
              Interactive Slide Deck
            </span>
            <span className="text-xs text-slate-500 font-mono">Use Keyboard ← / →</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Slide {currentSlide + 1} of {totalSlides}: {
              [
                'Global Test Framework & Timings',
                'Listening Structure & Self-Correction Traps',
                'Reading 3-Passage Strategy & TFNG Decision Tree',
                'Writing Task 1 & 2 Blueprint & Rubric',
                'Speaking 3-Part Architecture & Monologue Prep'
              ][currentSlide]
            }
          </h2>
        </div>

        {/* Navigation Buttons and Dots */}
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5 mr-2">
            {Array.from({ length: totalSlides }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2.5 rounded-full transition-all ${idx === currentSlide ? 'w-8 bg-blue-700' : 'w-2.5 bg-slate-300 hover:bg-slate-400'}`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
          <button
            onClick={prevSlide}
            className="p-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 transition"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextSlide}
            className="p-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white transition shadow-sm"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Slide Content Box */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm min-h-[460px] flex flex-col justify-between">
        {/* Slide 1 */}
        {currentSlide === 0 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="max-w-2xl">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-widest">Architecture</span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                The 2 Hour 45 Minute IELTS Lifecycle
              </h3>
              <p className="text-sm text-slate-600 mt-2">
                Listening, Reading, and Writing are taken back-to-back in one continuous morning session with zero breaks between papers. Speaking is held either on the same afternoon or within 7 days.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-blue-800 mb-2">
                    <Headphones className="w-6 h-6" />
                    <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-blue-200">30 Mins</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-base">Listening</h4>
                  <p className="text-xs text-slate-600 mt-1">4 parts, 40 questions. Played ONCE only. (+10m transfer on paper, 2m review on computer).</p>
                </div>
                <button
                  onClick={() => onNavigate('listening')}
                  className="mt-4 text-xs font-bold text-blue-700 flex items-center gap-1 hover:underline"
                >
                  Enter Listening Lab <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-emerald-800 mb-2">
                    <BookOpen className="w-6 h-6" />
                    <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-emerald-200">60 Mins</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-base">Reading</h4>
                  <p className="text-xs text-slate-600 mt-1">3 passages, 40 questions. Exactly 60 minutes with NO additional transfer time.</p>
                </div>
                <button
                  onClick={() => onNavigate('reading')}
                  className="mt-4 text-xs font-bold text-emerald-700 flex items-center gap-1 hover:underline"
                >
                  Enter Reading Lab <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-amber-800 mb-2">
                    <PenTool className="w-6 h-6" />
                    <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-amber-200">60 Mins</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-base">Writing</h4>
                  <p className="text-xs text-slate-600 mt-1">Task 1 (150 words, 20m) + Task 2 (250 words, 40m). Task 2 carries double the marks!</p>
                </div>
                <button
                  onClick={() => onNavigate('task1')}
                  className="mt-4 text-xs font-bold text-amber-700 flex items-center gap-1 hover:underline"
                >
                  Visualizer & Mock <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-rose-800 mb-2">
                    <Mic className="w-6 h-6" />
                    <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-rose-200">11-14 Mins</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-base">Speaking</h4>
                  <p className="text-xs text-slate-600 mt-1">1-on-1 interview with certified examiner. Part 1 Intro, Part 2 Long Turn, Part 3 Deep discussion.</p>
                </div>
                <button
                  onClick={() => onNavigate('examiner')}
                  className="mt-4 text-xs font-bold text-rose-700 flex items-center gap-1 hover:underline"
                >
                  Voice Examiner <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Slide 2: Listening Distractor */}
        {currentSlide === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-bold text-blue-700 uppercase tracking-widest">Listening Traps</span>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
                The Self-Correction Distractor Blueprint
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Practice examiners use intentional conversational misdirection to catch inattentive candidates.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Interactive Audio Trap Demonstration</span>
                <button
                  onClick={playDistractorDemo}
                  className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-2 transition"
                >
                  <Play className="w-4 h-4 fill-white" /> Play Spoken Distractor
                </button>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 font-mono text-xs sm:text-sm text-slate-700 leading-relaxed">
                "Please meet me at <span className="bg-rose-100 text-rose-800 font-bold px-1 rounded line-through">14 Elm Street</span>... oh wait, forgive me, they relocated to <span className="bg-emerald-100 text-emerald-800 font-bold px-1 rounded">40 Elm Street</span> last Tuesday! So that's four zero Elm Street."
              </div>

              {distractorPlayed && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>Analysis:</strong> 64% of unprepared candidates write "14" immediately upon hearing it and stop listening. The correct answer is "40 Elm Street".</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50">
                <h5 className="font-bold text-rose-800 text-xs uppercase mb-1">Common Trap Words</h5>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Listen keenly whenever a speaker utters: <em>"actually...", "wait a second...", "mind you...", "on second thought...", "I used to, but now..."</em>.
                </p>
              </div>
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
                <h5 className="font-bold text-emerald-800 text-xs uppercase mb-1">Defense Strategy</h5>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Keep your pencil/cursor hovering. Do not commit your answer until the sentence ends or the speaker advances to the subsequent topic.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Slide 3: Reading TFNG Logic */}
        {currentSlide === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Reading Masterclass</span>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
                The Definitive TFNG Decision Tree
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Stop guessing. Follow the mathematical logic path for True, False, and Not Given.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-400">
                <div className="font-mono font-extrabold text-emerald-800 text-lg mb-1">TRUE</div>
                <div className="text-xs font-bold text-emerald-700 mb-2">Exact Agreement</div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  The passage explicitly confirms the statement using direct synonyms or identical logical assertions. Every key element matches without contradiction.
                </p>
                <div className="mt-3 p-2 bg-white rounded border border-emerald-200 text-[11px] text-slate-600">
                  <strong>Text:</strong> "Solar generation climbed substantially."<br />
                  <strong>Claim:</strong> "Solar energy increased." ➔ <strong>TRUE</strong>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-400">
                <div className="font-mono font-extrabold text-rose-800 text-lg mb-1">FALSE</div>
                <div className="text-xs font-bold text-rose-700 mb-2">Direct Contradiction</div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  The passage explicitly states the factual opposite. If the statement says "A is greater than B", the passage asserts "B is greater than A" or "they are equal".
                </p>
                <div className="mt-3 p-2 bg-white rounded border border-rose-200 text-[11px] text-slate-600">
                  <strong>Text:</strong> "All participants were volunteers."<br />
                  <strong>Claim:</strong> "Participants were paid." ➔ <strong>FALSE</strong>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-400">
                <div className="font-mono font-extrabold text-amber-800 text-lg mb-1">NOT GIVEN</div>
                <div className="text-xs font-bold text-amber-700 mb-2">Missing Information</div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  The text mentions the topic, but does NOT supply enough factual information to confirm or deny the specific claim. Do not invent assumptions!
                </p>
                <div className="mt-3 p-2 bg-white rounded border border-amber-200 text-[11px] text-slate-600">
                  <strong>Text:</strong> "The company built 50 turbines."<br />
                  <strong>Claim:</strong> "The turbines were expensive." ➔ <strong>NOT GIVEN</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Slide 4: Writing Blueprint */}
        {currentSlide === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">Writing Strategy</span>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
                Writing 60-Minute Allocation & The 4-Criterion Rubric
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Task 2 counts for 66.6% of your final Writing band score. Manage your clock ruthlessly.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-slate-900 text-base">Task 1: Academic Report</h4>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">20 Mins · 150 Words</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li><strong>Paragraph 1:</strong> Paraphrase the question prompt (1 sentence).</li>
                  <li><strong>Paragraph 2 (Overview):</strong> State 2-3 main trends or key features without data numbers (Band 7+ mandatory requirement!).</li>
                  <li><strong>Paragraphs 3 & 4 (Details):</strong> Group data logically, cite exact percentages, and make sharp comparisons.</li>
                </ul>
              </div>

              <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-slate-900 text-base">Task 2: Discursive Essay</h4>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">40 Mins · 250 Words</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li><strong>Paragraph 1 (Intro):</strong> Background paraphrase + Clear thesis statement with your explicit stance.</li>
                  <li><strong>Paragraph 2 (Body 1):</strong> First main argument + explanation + concrete real-world example.</li>
                  <li><strong>Paragraph 3 (Body 2):</strong> Counter-perspective or second argument + explanation + implication.</li>
                  <li><strong>Paragraph 4 (Conclusion):</strong> Rephrase thesis without introducing brand-new points.</li>
                </ul>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 flex flex-wrap gap-4 justify-between">
              <div><strong>TR/TA (25%):</strong> Answering all prompts fully</div>
              <div><strong>CC (25%):</strong> Smooth linkers & paragraphing</div>
              <div><strong>LR (25%):</strong> Academic collocations & precision</div>
              <div><strong>GRA (25%):</strong> Complex grammar & zero punctuation slip-ups</div>
            </div>
          </div>
        )}

        {/* Slide 5: Speaking Architecture */}
        {currentSlide === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <span className="text-xs font-bold text-rose-700 uppercase tracking-widest">Speaking Mastery</span>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
                Speaking 3-Part Architecture & The 1-Minute Cue Card Drill
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                The examiner assesses your communication across three progressively challenging formats.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">Part 1 (4-5 Mins)</span>
                  <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">Warm-Up</span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Familiar Personal Topics</h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Questions regarding your hometown, accommodation, study/work, hobbies, weather, or daily routine. Aim for 2-3 natural sentences per response with supporting reasons.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-300">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-rose-700 uppercase">Part 2 (3-4 Mins)</span>
                  <span className="text-xs font-mono bg-rose-200 text-rose-900 px-2 py-0.5 rounded font-bold">Crucial</span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm">The 2-Minute Monologue</h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  You receive a cue card with a topic and paper pencil. You have exactly 60 seconds to prepare, followed by speaking uninterrupted for 1 to 2 minutes until stopped.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-indigo-700 uppercase">Part 3 (4-5 Mins)</span>
                  <span className="text-xs font-mono bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-bold">Abstract</span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Two-Way Discussion</h4>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Deep, abstract questions linked to your Part 2 topic (e.g. societal trends, ethics, future predictions, technology impact). Move beyond personal stories to universal societal perspectives.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => onNavigate('scratchpad')}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
              >
                Launch Part 2 Cue Scratchpad <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Module 2: Slide Guide & Trap Blueprints</span>
          <span>Click next or use arrow keys</span>
        </div>
      </div>
    </div>
  );
};
