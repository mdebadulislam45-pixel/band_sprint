import React, { useState } from 'react';
import {
  ArrowLeft,
  Award,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Filter
} from 'lucide-react';
import { IELTS_BAND_DESCRIPTORS, DescriptorCriterion } from '../../data/bandDescriptorsData';
import { soundManager } from '../../utils/audioEffects';

interface BandDescriptorsPageProps {
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

export const BandDescriptorsPage: React.FC<BandDescriptorsPageProps> = ({ onBack, onShowToast }) => {
  const [selectedCriterionCode, setSelectedCriterionCode] = useState<string>('TR');
  const [selectedBand, setSelectedBand] = useState<number>(7);

  const activeCriterion: DescriptorCriterion =
    IELTS_BAND_DESCRIPTORS.find((c) => c.criterionCode === selectedCriterionCode) ||
    IELTS_BAND_DESCRIPTORS[0];

  const activeBandDescription =
    activeCriterion.bandDescriptions.find((b) => b.band === selectedBand) ||
    activeCriterion.bandDescriptions[1];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Learn</span>
        </button>

        <div className="text-right">
          <div className="text-xs font-bold text-slate-900 font-mono">BAND DESCRIPTORS</div>
          <div className="text-[10px] text-slate-400">Official Rubric Decoder</div>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-7 rounded-3xl shadow-md border border-purple-800/40">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold uppercase tracking-wider border border-purple-400/30">
            OFFICIAL IDP & Coach CRITERIA
          </span>
          <span className="text-[11px] text-purple-200">
            Learn How Examiners Score
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          IELTS Band Descriptors Decoder
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
          Decode what examiners look for at Band 6, 7, 8, and 9. Discover the exact linguistic leaps required to jump from Band 6.5 to 7.5+ in Writing and Speaking.
        </p>
      </div>

      {/* Criteria Selection Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {IELTS_BAND_DESCRIPTORS.map((crit) => {
          const isSelected = activeCriterion.criterionCode === crit.criterionCode;
          return (
            <button
              key={crit.criterionCode}
              onClick={() => {
                setSelectedCriterionCode(crit.criterionCode);
                soundManager.playBeep(600, 0.04);
              }}
              className={`p-3.5 rounded-2xl border text-left transition ${
                isSelected
                  ? 'bg-purple-900 text-white border-purple-800 shadow-md'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="text-[10px] font-mono font-bold uppercase opacity-80">
                {crit.module}
              </div>
              <div className="text-xs sm:text-sm font-black mt-0.5 truncate">
                {crit.criterionName}
              </div>
            </button>
          );
        })}
      </div>

      {/* Band Level Selector Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
        {[6, 7, 8, 9].map((bandNum) => {
          const isSelected = selectedBand === bandNum;
          return (
            <button
              key={bandNum}
              onClick={() => {
                setSelectedBand(bandNum);
                soundManager.playBeep(700, 0.04);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                isSelected
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Band {bandNum}.0
            </button>
          );
        })}
      </div>

      {/* Active Description Detail Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-900 font-mono font-bold text-xs">
              Band {selectedBand}.0 · {activeCriterion.criterionName}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed mt-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            "{activeBandDescription.description}"
          </p>
        </div>

        {/* Key Characteristics */}
        <div className="space-y-2">
          <div className="text-xs font-mono font-bold text-slate-400 uppercase">
            Examiner Checkmarks for Band {selectedBand}.0:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeBandDescription.keyCharacteristics.map((char, idx) => (
              <div
                key={idx}
                className="p-3 bg-purple-50/50 border border-purple-200/60 rounded-xl text-xs text-purple-950 flex items-start gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <span>{char}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 🚀 How to Jump to Band 7.5+ Blueprint */}
        <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 font-bold text-emerald-950 text-xs sm:text-sm font-mono uppercase">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>How to Jump from Band 6.5 to Band 7.5+ in {activeCriterion.criterionCode}</span>
          </div>

          <div className="space-y-2 text-xs text-emerald-950">
            {activeCriterion.howToJumpToBand7Plus.map((tip, idx) => (
              <div key={idx} className="flex items-start gap-2 font-medium">
                <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{tip}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ⚠️ Trap Alert Keeping Candidates at Band 6 */}
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-1 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-rose-900 font-mono">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>The Fatal Mistake Keeping Candidates at Band 6.0:</span>
          </div>
          <p className="text-rose-950 font-medium pl-5 leading-relaxed">
            {activeCriterion.commonMistakeThatKeepsYouAtBand6}
          </p>
        </div>
      </div>
    </div>
  );
};
