import React, { useState } from 'react';
import {
  Sparkles,
  Headphones,
  BookOpen,
  Mic,
  PenTool,
  ArrowRight,
  CheckCircle2,
  Award,
  ShieldCheck,
  Zap,
  Play,
  Globe,
  Clock,
  CheckCircle
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { IELTSSprintLogo } from '../common/IELTSSprintLogo';
import { CommercialFooter } from '../commercial/CommercialFooter';

interface PreLoginLandingProps {
  onOpenGoogleAuth: () => void;
  onPreviewExamRoom: () => void;
  onShowToast: (msg: string) => void;
}

export const PreLoginLanding: React.FC<PreLoginLandingProps> = ({
  onOpenGoogleAuth,
  onPreviewExamRoom,
  onShowToast
}) => {
  const [activeFeatureTab, setActiveFeatureTab] = useState<1 | 2 | 3>(1);
  const [bilingualTrapTab, setBilingualTrapTab] = useState<'en' | 'bn'>('en');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between select-none">
      {/* Crisp Cambridge Navy Gradient Line at Very Top */}
      <div className="w-full h-1 bg-gradient-to-r from-[#0f172a] via-[#1d4ed8] to-[#38bdf8]" />

      {/* ================= 1. GLASSMORPHIC TOP NAVIGATION ================= */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-slate-950/85 border-b border-slate-800/80 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left: Logo & Official Badge */}
          <div className="flex items-center gap-3">
            <IELTSSprintLogo variant="full" size="md" showBadge={true} />
            <span className="hidden md:inline-flex px-3 py-1 rounded-full bg-gradient-to-r from-blue-900/40 to-indigo-900/40 text-blue-300 border border-blue-500/30 text-[10px] font-mono font-extrabold uppercase tracking-widest shadow-inner">
              Academic & GT Suite · Official CD Ergonomics
            </span>
          </div>

          {/* Center Nav Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <a href="#why-sprint" onClick={(e) => { e.preventDefault(); document.getElementById('why-sprint')?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-white transition">
              Why Sprint
            </a>
            <a href="#exam-demo" onClick={(e) => { e.preventDefault(); document.getElementById('exam-demo')?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-white transition">
              Exam Room Demo
            </a>
            <a href="#diagnostics" onClick={(e) => { e.preventDefault(); document.getElementById('diagnostics')?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-white transition">
              Score Diagnostics
            </a>
            <a href="#bangla-traps" onClick={(e) => { e.preventDefault(); document.getElementById('bangla-traps')?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-white transition">
              Bangla Traps
            </a>
            <a href="#results" onClick={(e) => { e.preventDefault(); document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-white transition">
              Student Results
            </a>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => {
                soundManager.playBeep(600, 0.04);
                onOpenGoogleAuth();
              }}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-sm transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              {/* Google G SVG */}
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Student Sign In</span>
            </button>

            <button
              onClick={() => {
                soundManager.playSuccess();
                onOpenGoogleAuth();
              }}
              className="hidden sm:inline-flex px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Launch Diagnostic Mock</span>
            </button>
          </div>
        </div>
      </header>

      {/* ================= 2. HIGH-IMPACT SIDE-BY-SIDE HERO SECTION ================= */}
      <section className="relative overflow-hidden pt-12 pb-20 px-4 sm:px-8">
        <div className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] pointer-events-none rounded-full" />
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Left Hero Copy */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-mono font-bold tracking-wide uppercase">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Official British Council & IDP CD-IELTS Software Partner</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
              Master the Real Computer-Delivered IELTS <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-amber-300">Before Test Day.</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
              Authentic 1:1 British Council & IDP exam software ergonomics. Real multi-accent audio, automated 4-criteria writing & speaking evaluation, and bilingual trap notes engineered for Bangladeshi candidates.
            </p>

            {/* Primary Action Hub */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={() => {
                  soundManager.playSuccess();
                  onOpenGoogleAuth();
                }}
                className="w-full sm:w-auto h-14 px-8 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm shadow-xl shadow-blue-600/25 transition flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Begin Candidate Verification & Diagnostic</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  soundManager.playBeep(520, 0.04);
                  onPreviewExamRoom();
                }}
                className="w-full sm:w-auto h-14 px-7 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs border border-slate-700/80 transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Preview Live CD Exam Room</span>
              </button>
            </div>

            {/* Social Proof Pill with Avatar Stack */}
            <div className="pt-4 flex items-center gap-3">
              <div className="flex -space-x-2">
                <img className="w-8 h-8 rounded-full border-2 border-slate-900 object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" alt="Candidate" />
                <img className="w-8 h-8 rounded-full border-2 border-slate-900 object-cover" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80" alt="Candidate" />
                <img className="w-8 h-8 rounded-full border-2 border-slate-900 object-cover" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80" alt="Candidate" />
              </div>
              <div className="text-xs text-slate-300 font-medium">
                Trusted by <strong className="text-white">14,000+ candidates</strong> in Dhaka, Chittagong & Sylhet
              </div>
            </div>

            {/* Trust & Credibility Badges Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-slate-800/80">
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                <span>🛡️</span>
                </div>
                <span>100% Load-Shedding Resilient (Offline-First)</span>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                  <Headphones className="w-3.5 h-3.5" />
                </div>
                <span>Authentic Multi-Speaker Cambridge Streams</span>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                  <Globe className="w-3.5 h-3.5" />
                </div>
                <span>Bilingual Bengali/English Distractor Analysis</span>
              </div>
            </div>
          </div>

          {/* Right Floating Interactive Mockup Card */}
          <div className="lg:col-span-5">
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-700/80 shadow-2xl backdrop-blur-xl relative overflow-hidden space-y-4">
              <div className="absolute top-0 right-0 px-3 py-1 bg-blue-600 text-white text-[10px] font-mono font-bold rounded-bl-xl">
                LIVE CD-IELTS SIMULATOR
              </div>

              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                </div>
                <div className="flex items-center gap-1 text-xs font-mono text-amber-400 font-bold bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  <Clock className="w-3.5 h-3.5" /> 58:12 REMAINING
                </div>
              </div>

              <div className="space-y-3 font-serif">
                <div className="text-[11px] font-sans font-extrabold text-blue-400 uppercase tracking-wide">Reading Passage 3 · Academic</div>
                <h4 className="text-sm font-bold text-white">The Phenomenon of Urban Microclimates</h4>
                <p className="text-xs text-slate-300 leading-relaxed font-serif">
                  "Urban heat islands (UHIs) represent a significant departure from surrounding rural temperatures. The thermal capacity of asphalt and concrete absorbs solar radiation during peak hours..."
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2 font-sans">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Question Palette</span>
                  <span className="text-emerald-400 font-mono font-bold">24 / 40 Answered</span>
                </div>
                <div className="grid grid-cols-8 gap-1">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className={`h-7 rounded flex items-center justify-center text-[10px] font-mono font-bold ${i < 12 ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={onOpenGoogleAuth}
                className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <span>Take Full Practice Test Now →</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 3. VISUAL INTERACTIVE PRODUCT SHOWCASE ================= */}
      <section id="exam-demo" className="py-16 px-4 sm:px-8 bg-slate-900/60 border-t border-slate-800/80">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">
              1:1 Exam Simulation Environment
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              Experience the Official Computer-Delivered Interface
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              Switch between Reading, Listening, Writing, and Speaking with exact typography, color schemes, and timer countdowns.
            </p>
          </div>

          {/* Interactive Feature Spotlights Tabs */}
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => { soundManager.playBeep(500, 0.03); setActiveFeatureTab(1); }}
              className={`px-4 py-3 rounded-2xl font-bold text-xs transition cursor-pointer flex items-center gap-2 ${
                activeFeatureTab === 1
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/50'
              }`}
            >
              <Headphones className="w-4 h-4 text-amber-300" />
              <span>1. Pixel-Perfect CD IELTS Room</span>
            </button>

            <button
              onClick={() => { soundManager.playBeep(520, 0.03); setActiveFeatureTab(2); }}
              className={`px-4 py-3 rounded-2xl font-bold text-xs transition cursor-pointer flex items-center gap-2 ${
                activeFeatureTab === 2
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/50'
              }`}
            >
              <Globe className="w-4 h-4 text-amber-300" />
              <span>2. Bilingual Trap Analysis</span>
            </button>

            <button
              onClick={() => { soundManager.playBeep(540, 0.03); setActiveFeatureTab(3); }}
              className={`px-4 py-3 rounded-2xl font-bold text-xs transition cursor-pointer flex items-center gap-2 ${
                activeFeatureTab === 3
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/50'
              }`}
            >
              <PenTool className="w-4 h-4 text-amber-300" />
              <span>3. Automated Band 8+ Evaluator</span>
            </button>
          </div>

          {/* Feature Showcase Card */}
          <div className="p-6 sm:p-10 rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl relative overflow-hidden">
            {activeFeatureTab === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                  <div>
                    <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase">Feature Spotlight #1</span>
                    <h3 className="text-xl font-bold text-white mt-0.5">Pixel-Perfect CD IELTS Room Ergonomics</h3>
                    <p className="text-xs text-slate-400">Disabled browser auto-correct, exact font sizes, highlight tools, and 60-minute countdown timers.</p>
                  </div>
                  <button
                    onClick={onPreviewExamRoom}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                  >
                    <span>Launch Live Demo →</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 font-serif">
                    <div className="text-xs font-sans font-bold text-slate-400 uppercase">Reading Passage Sample</div>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                      "The architectural marvel of Roman concrete lies in its unique reactive components. Unlike modern Portland cement, ancient builders mixed volcanic ash, known as <mark className="bg-yellow-500/30 text-yellow-200 px-1 rounded">pulvis puteolanus</mark>, with lime..."
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 font-sans">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">Question Palette (1 – 40)</span>
                      <span className="text-xs font-mono text-emerald-400 font-bold">28 Answered</span>
                    </div>
                    <div className="grid grid-cols-8 gap-1.5">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <div key={i} className={`h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold ${i < 18 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                          {i + 1}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeFeatureTab === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                  <div>
                    <span className="text-[11px] font-mono font-bold text-amber-400 uppercase">Feature Spotlight #2</span>
                    <h3 className="text-xl font-bold text-white mt-0.5">Bilingual Trap Analysis (🇬🇧 English | 🇧🇩 বাংলা)</h3>
                    <p className="text-xs text-slate-400">Instantly toggle between English distractor analysis and natural Bengali trap explanations.</p>
                  </div>

                  {/* English / বাংলা Toggle */}
                  <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setBilingualTrapTab('en')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${bilingualTrapTab === 'en' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                      🇬🇧 English
                    </button>
                    <button
                      onClick={() => setBilingualTrapTab('bn')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${bilingualTrapTab === 'bn' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                      🇧🇩 বাংলা
                    </button>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  {bilingualTrapTab === 'en' ? (
                    <div className="space-y-2 animate-fade-in">
                      <span className="text-xs font-bold text-blue-400 uppercase font-mono">English Distractor Trap</span>
                      <p className="text-sm text-slate-200 leading-relaxed">
                        "Speaker A initially mentions the meeting is at 2:00 PM, but immediately self-corrects: 'Wait, actually, let's make it 3:30 PM.' Candidates who rush to write down the first time fail this self-correction trap."
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 animate-fade-in font-bengali">
                      <span className="text-xs font-bold text-amber-400 uppercase font-mono">বাংলা ব্যাখ্যা (Trap Analysis)</span>
                      <p className="text-sm text-slate-200 leading-relaxed">
                        "স্পিকার প্রথমে দুপুর ২:০০ টার কথা বললেও পরক্ষণেই 'Wait, actually, let's make it 3:30 PM' বলে সংশোধন করেছেন। প্রথম ভুল সময়টি শুনে উত্তর লিখলে কাটা যাবে। সঠিক উত্তর হলো ৩:৩০।"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeFeatureTab === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                  <div>
                    <span className="text-[11px] font-mono font-bold text-purple-400 uppercase">Feature Spotlight #3</span>
                    <h3 className="text-xl font-bold text-white mt-0.5">Automated Band 8+ Writing & Speaking Evaluator</h3>
                    <p className="text-xs text-slate-400">Instant 4-criteria scoring across TA/TR, CC, LR, and GRA with grammatical error correction.</p>
                  </div>
                  <button
                    onClick={onOpenGoogleAuth}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Test Writing Evaluator →</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Task Achievement</div>
                    <div className="text-xl font-black text-emerald-400">Band 8.0</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Coherence & Cohesion</div>
                    <div className="text-xl font-black text-emerald-400">Band 7.5</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Lexical Resource</div>
                    <div className="text-xl font-black text-blue-400">Band 8.0</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Grammar Accuracy</div>
                    <div className="text-xl font-black text-blue-400">Band 7.5</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================= COMMERCIAL FOOTER ================= */}
      <CommercialFooter
        onOpenShowcase={() => window.dispatchEvent(new CustomEvent('open_commercial_showcase'))}
        onOpenLegal={(tab) => window.dispatchEvent(new CustomEvent('open_legal_modal', { detail: { tab } }))}
        onOpenContact={() => window.dispatchEvent(new CustomEvent('open_contact_modal'))}
        onOpenSeoGuide={() => window.dispatchEvent(new CustomEvent('open_seo_guide'))}
        onNavigate={(page) => onOpenGoogleAuth()}
      />
    </div>
  );
};
