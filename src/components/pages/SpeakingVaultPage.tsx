import React, { useState } from 'react';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Mic,
  Award,
  Sparkles,
  BookOpen,
  Filter,
  CheckCircle2,
  Copy,
  Check,
  Clock
} from 'lucide-react';
import { SPEAKING_MODEL_VAULT, SpeakingModelItem } from '../../data/speakingVaultData';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';

interface SpeakingVaultPageProps {
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

export const SpeakingVaultPage: React.FC<SpeakingVaultPageProps> = ({ onBack, onShowToast }) => {
  const [selectedPart, setSelectedPart] = useState<'All' | 'Part 1' | 'Part 2' | 'Part 3'>('All');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredItems = SPEAKING_MODEL_VAULT.filter((item) => {
    return selectedPart === 'All' || item.part === selectedPart;
  });

  const handlePlayVoice = (item: SpeakingModelItem) => {
    if (playingId === item.id) {
      stopSpeech();
      setPlayingId(null);
      return;
    }
    setPlayingId(item.id);
    speakBritish(item.modelAnswerTranscript, {
      onEnd: () => setPlayingId(null),
      onError: () => setPlayingId(null)
    });
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    onShowToast('Transcript copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
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
          <span>Speaking</span>
        </button>

        <div className="text-right">
          <div className="text-xs font-bold text-slate-900 font-mono">SPEAKING BAND 9 VAULT</div>
          <div className="text-[10px] text-slate-400">Audio Monologues & Discourse</div>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-purple-950 text-white p-6 sm:p-7 rounded-3xl shadow-md border border-rose-800/40">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold uppercase tracking-wider border border-rose-400/30">
            NATIVE BRITISH FLUENCY & CADENCE
          </span>
          <span className="text-[11px] text-rose-200">
            Parts 1, 2 (Cue Card) & 3 Answers
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          IELTS Speaking Band 9 Audio Vault
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
          Listen to how Band 9 candidates handle actual Practice test prompts with natural hesitations, rhetorical discourse markers, and rich academic vocabulary.
        </p>
      </div>

      {/* Part Filter Strip */}
      <div className="flex items-center gap-2">
        {(['All', 'Part 1', 'Part 2', 'Part 3'] as const).map((part) => {
          const isActive = selectedPart === part;
          return (
            <button
              key={part}
              onClick={() => {
                setSelectedPart(part);
                soundManager.playBeep(600, 0.04);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${
                isActive
                  ? 'bg-rose-700 text-white border-rose-700 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {part}
            </button>
          );
        })}
      </div>

      {/* Speaking Cards */}
      <div className="space-y-5">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-xs space-y-4 hover:border-slate-300 transition"
          >
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 text-[10px] font-mono font-bold border border-rose-200">
                    {item.part}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                    Band {item.bandScore}
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {item.durationEstimate}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  {item.topic}
                </h2>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePlayVoice(item)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                >
                  {playingId === item.id ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                      <span>Stop Audio</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Play Band 9 Audio</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleCopy(item.modelAnswerTranscript, item.id)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                  title="Copy transcript"
                >
                  {copiedId === item.id ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Prompt or Cue Card Frame */}
            <div className="p-3.5 bg-rose-50/50 border border-rose-200/70 rounded-2xl text-xs space-y-2">
              <div className="font-bold text-rose-900 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-rose-600" />
                <span>Examiner Prompt: {item.promptOrCue}</span>
              </div>

              {item.cuePoints && (
                <div className="pl-5 space-y-1 text-slate-700">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">You should say:</div>
                  <ul className="list-disc space-y-0.5">
                    {item.cuePoints.map((pt, idx) => (
                      <li key={idx}>{pt}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Model Transcript */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs sm:text-sm text-slate-800 leading-relaxed font-serif whitespace-pre-line">
              {item.modelAnswerTranscript}
            </div>

            {/* High-Band Lexical Highlights */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold mr-1">
                Band 9 Collocations:
              </span>
              {item.highBandPhrases.map((p, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-lg bg-purple-50 text-purple-900 border border-purple-200 text-[11px]"
                  title={`Bangla: ${p.meaning_bn}`}
                >
                  <strong>{p.phrase}</strong> ({p.meaning_bn})
                </span>
              ))}
            </div>

            {/* Coach tip */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-2">
              <Award className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <strong>Examiner Secret: </strong>
                <span>{item.examinerNotes}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
