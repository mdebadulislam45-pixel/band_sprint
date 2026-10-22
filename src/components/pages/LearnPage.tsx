import React from 'react';
import {
  BookOpen,
  MessageSquare,
  Lightbulb,
  Sparkles,
  ArrowRight,
  Flag,
  Compass,
  FileText,
  Bookmark,
  Layers,
  Award,
  Camera,
  Volume2
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';

interface LearnPageProps {
  onNavigate: (page: string) => void;
  onShowToast: (msg: string) => void;
}

export const LearnPage: React.FC<LearnPageProps> = ({ onNavigate, onShowToast }) => {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Learning Hub Header */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-md border border-purple-800/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-[11px] font-mono font-bold mb-2 border border-purple-400/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              LEXICAL RESOURCE & STRATEGY
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              IELTS Learning Hub
            </h1>
            <p className="text-xs sm:text-sm text-purple-200 mt-1 max-w-xl">
              Master Band 7–9 vocabulary, native discourse phrases, exam-safe idioms, collocations, and Bengali video guides.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white/10 px-4 py-2 rounded-2xl border border-white/10">
            <Layers className="w-5 h-5 text-purple-300" />
            <div className="text-left">
              <div className="text-[10px] text-purple-200 font-bold uppercase">Comprehensive Hub</div>
              <div className="text-xs font-black text-white">1,360+ Items</div>
            </div>
          </div>
        </div>

        {/* Featured 200 C1 Idioms Callout */}
        <div
          onClick={() => {
            soundManager.playBeep(650, 0.05);
            onNavigate('c1idioms');
          }}
          className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-blue-600/40 via-indigo-600/40 to-purple-600/40 border border-blue-400/40 hover:border-blue-300 transition cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 backdrop-blur-md group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition">
              C1
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>200 C1 Idioms & Advanced Phrases (Official Guide)</span>
                <span className="text-[9px] bg-emerald-500 text-white font-mono px-2 py-0.2 rounded-full uppercase">
                  Verified PDF
                </span>
              </div>
              <div className="text-xs text-blue-200">
                Complete Bangla meanings, Cambridge examples, flashcards, speed quiz & British audio.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 group-hover:text-amber-200 shrink-0">
            <span>Explore 200 Expressions</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Core Lexical & Grammar Cards (4-grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Vocabulary Lab */}
        <div
          onClick={() => {
            soundManager.playBeep(600, 0.05);
            onNavigate('vocab');
          }}
          className="group bg-white hover:bg-gradient-to-br hover:from-white hover:to-purple-50/50 rounded-3xl border-2 border-slate-200 hover:border-purple-500 p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 group-hover:bg-purple-600 text-purple-700 group-hover:text-white flex items-center justify-center transition shadow-xs">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                1,360+ Cards
              </span>
              <h2 className="text-base font-black text-slate-900 group-hover:text-purple-700 mt-1 transition">
                Vocabulary Lab
              </h2>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                A2 to C2 CEFR levels, topic filters, synonyms, collocations, and British audio.
              </p>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-purple-700">
            <span>Explore Words</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* 2. Useful Phrases */}
        <div
          onClick={() => {
            soundManager.playBeep(600, 0.05);
            onNavigate('phrases');
          }}
          className="group bg-white hover:bg-gradient-to-br hover:from-white hover:to-blue-50/50 rounded-3xl border-2 border-slate-200 hover:border-blue-500 p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 group-hover:bg-blue-600 text-blue-700 group-hover:text-white flex items-center justify-center transition shadow-xs">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                200+ Phrases
              </span>
              <h2 className="text-base font-black text-slate-900 group-hover:text-blue-700 mt-1 transition">
                Useful Phrases
              </h2>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                Discourse markers, opinion formulas, and cohesive transitions.
              </p>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-blue-700">
            <span>Browse Phrases</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* 3. Idiom Lab */}
        <div
          onClick={() => {
            soundManager.playBeep(600, 0.05);
            onNavigate('idioms');
          }}
          className="group bg-white hover:bg-gradient-to-br hover:from-white hover:to-amber-50/50 rounded-3xl border-2 border-slate-200 hover:border-amber-500 p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 group-hover:bg-amber-500 text-amber-800 group-hover:text-slate-950 flex items-center justify-center transition shadow-xs">
              <Lightbulb className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
                Spoken Idioms
              </span>
              <h2 className="text-base font-black text-slate-900 group-hover:text-amber-800 mt-1 transition">
                Idiom Lab
              </h2>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                Conversational idioms for Speaking Parts 1-3 with writing warnings.
              </p>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-amber-800">
            <span>Master Idioms</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* 4. Shadowing Practice Lab */}
        <div
          onClick={() => {
            soundManager.playBeep(600, 0.05);
            onNavigate('shadowing');
          }}
          className="group bg-white hover:bg-gradient-to-br hover:from-white hover:to-teal-50/50 rounded-3xl border-2 border-slate-200 hover:border-teal-500 p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 group-hover:bg-teal-600 text-teal-800 group-hover:text-white flex items-center justify-center transition shadow-xs">
              <Volume2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md">
                Pacing & Mic
              </span>
              <h2 className="text-base font-black text-slate-900 group-hover:text-teal-800 mt-1 transition">
                Shadowing Lab
              </h2>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                Sentence-by-sentence native British speech synchronization, live recording & WPM pacer.
              </p>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-teal-800">
            <span>Practice Shadowing</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Specialized Band 8-9 Master Tools */}
      <div className="space-y-3 pt-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 font-mono">
          Specialized Band 8–9 Master Tools
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Grammar Lab */}
          <div
            onClick={() => onNavigate('grammar')}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-teal-500 transition shadow-2xs cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Grammar Lab & Memory Tricks</div>
                <div className="text-[10px] text-slate-500">Formulas, inversion, hedging & Bengali tricks</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>
          {/* 1. Band 9 Model Answers */}
          <div
            onClick={() => onNavigate('modelanswers')}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-amber-500 transition shadow-2xs cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Band 9 Model Answers</div>
                <div className="text-[10px] text-slate-500">Task 1 & 2 with color annotations</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>

          {/* 2. Spelling Trap Lab */}
          <div
            onClick={() => onNavigate('spelling')}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-rose-500 transition shadow-2xs cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
                <Bookmark className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Spelling Trap & Dictation</div>
                <div className="text-[10px] text-slate-500">Audio tests with mnemonics</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>

          {/* 3. Academic Collocations */}
          <div
            onClick={() => onNavigate('collocations')}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 transition shadow-2xs cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Academic Collocations</div>
                <div className="text-[10px] text-slate-500">Natural Band 8-9 word pairings</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>

          {/* 4. Speaking Band 9 Vault */}
          <div
            onClick={() => onNavigate('speakingvault')}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-purple-500 transition shadow-2xs cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Speaking Band 9 Vault</div>
                <div className="text-[10px] text-slate-500">British audio & cue card transcripts</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>

          {/* 5. 30-Day Master Roadmap */}
          <div
            onClick={() => onNavigate('studyplan')}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 transition shadow-2xs cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">30-Day Study Roadmap</div>
                <div className="text-[10px] text-slate-500">Interactive daily tasks checklist</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>

          {/* 6. Band Descriptors Decoder */}
          <div
            onClick={() => onNavigate('banddescriptors')}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-teal-500 transition shadow-2xs cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Band Descriptors Decoder</div>
                <div className="text-[10px] text-slate-500">How examiners grade (Band 6 vs 9)</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>

          {/* 7. Question Bank & Photo Upload */}
          <div
            onClick={() => onNavigate('questionbank')}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-500 transition shadow-2xs cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5 text-indigo-700" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Question Bank & Photo Upload</div>
                <div className="text-[10px] text-slate-500">Real prompts · Snap handwritten answer</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>

          {/* 8. 200 C1 Idioms & Phrases */}
          <div
            onClick={() => onNavigate('c1idioms')}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 transition shadow-2xs cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">200 C1 Idioms & Phrases</div>
                <div className="text-[10px] text-slate-500">200 expressions · Bangla + Audio</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Secondary Learning Guides */}
      <div className="space-y-3 pt-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 font-mono">
          Interactive Study Guides & Strategies
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Speed Reading Pacer */}
          <div
            onClick={() => onNavigate('speedreading')}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-teal-500 transition shadow-2xs cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Speed Reading & Pacer</div>
                <div className="text-[10px] text-slate-500">200–300 WPM Skimming Drills</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>

          {/* Bangla Guide */}
          <div
            onClick={() => onNavigate('bangla')}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 transition shadow-2xs cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Flag className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">বাংলা মাস্টার গাইড</div>
                <div className="text-[10px] text-slate-500">IELTS A-to-Z Strategy in Bengali</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>

          {/* Beginner 101 */}
          <div
            onClick={() => onNavigate('beginner')}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-500 transition shadow-2xs cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Beginner 101 Roadmap</div>
                <div className="text-[10px] text-slate-500">Step-by-step foundation curriculum</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>

          {/* Interactive Slide Guide */}
          <div
            onClick={() => onNavigate('slides')}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-purple-500 transition shadow-2xs cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Visual Slide Master Guide</div>
                <div className="text-[10px] text-slate-500">Interactive presentations for all skills</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>

          {/* Argument Matrix */}
          <div
            onClick={() => onNavigate('arguments')}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 transition shadow-2xs cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                <Bookmark className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">PESTLE Idea Generator</div>
                <div className="text-[10px] text-slate-500">Ideas for Task 2 essay writing</div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>
    </div>
  );
};
