import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Volume2, VolumeX, Loader2, CheckCircle2, Globe, ShieldCheck } from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import {
  OfficialIELTSAccent,
  ACCENT_METADATA,
  IELTS_ACCENTS,
  PROFESSIONAL_STUDIO_VOICES,
  setPreferredAccent,
  getPreferredAccent,
  getPreferredStudioSpeakerId,
  setPreferredStudioSpeakerId,
} from '../../config/voiceConfig';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';

interface AccentAuditionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const AccentAuditionModal: React.FC<AccentAuditionModalProps> = ({
  isOpen,
  onClose,
  onShowToast
}) => {
  const [playingSpeakerId, setPlayingSpeakerId] = useState<string | null>(null);
  const [loadingSpeakerId, setLoadingSpeakerId] = useState<string | null>(null);
  const [selectedAccent, setSelectedAccent] = useState<OfficialIELTSAccent>(() => getPreferredAccent());
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string>(() => getPreferredStudioSpeakerId());

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  if (!isOpen) return null;

  const handleAuditionVoice = (speakerId: string, accent: OfficialIELTSAccent, sampleLine: string, gender: 'male' | 'female') => {
    soundManager.playBeep(520, 0.03);
    if (playingSpeakerId === speakerId) {
      stopSpeech();
      setPlayingSpeakerId(null);
      setLoadingSpeakerId(null);
      return;
    }
    stopSpeech();
    setLoadingSpeakerId(speakerId);
    speakBritish(sampleLine, {
      speakerId,
      accent,
      gender,
      deliveryProfile: 'natural_conversation',
      onStart: () => {
        setLoadingSpeakerId(null);
        setPlayingSpeakerId(speakerId);
      },
      onEnd: () => {
        setLoadingSpeakerId(null);
        setPlayingSpeakerId(null);
      },
      onError: () => {
        setLoadingSpeakerId(null);
        setPlayingSpeakerId(null);
        onShowToast('Studio stream paused. Try tapping Audition again.');
      }
    });
  };

  const handleSaveAccent = (accent: OfficialIELTSAccent) => {
    setSelectedAccent(accent);
    setPreferredAccent(accent);
    setSelectedSpeakerId(getPreferredStudioSpeakerId());
    soundManager.playSuccess();
    onShowToast(`Locked ${ACCENT_METADATA[accent].label} as your primary IELTS exam accent.`);
  };

  const handleSelectStudioSpeaker = (speakerId: string) => {
    const updated = setPreferredStudioSpeakerId(speakerId);
    if (updated) {
      setSelectedSpeakerId(updated.speakerId);
      setSelectedAccent(updated.accent);
      soundManager.playSuccess();
      onShowToast(`Active studio voice set to ${updated.name} (${updated.accent}).`);
    }
  };

  return (
    <AnimatePresence>
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            stopSpeech();
            onClose();
          }
        }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1F1E]/75 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="accent-modal-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          className="relative w-full max-w-3xl bg-white dark:bg-[#0D1A19] border border-[#D3DDDA] dark:border-[#1F8A70]/35 rounded-2xl shadow-2xl overflow-hidden text-[#0E1F1E] dark:text-[#EEF3F1]"
        >
          {/* Top Header */}
          <div className="p-5 border-b border-[#D3DDDA] dark:border-[#1F8A70]/25 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#0F4C45] dark:text-[#F4A62A]" />
                <h3 id="accent-modal-title" className="font-display text-lg font-bold text-[#0E1F1E] dark:text-white">
                  Multi-Accent &amp; Studio Voice Audition Suite
                </h3>
              </div>
              <p className="text-xs text-[#566664] dark:text-slate-400">
                Live studio-mastered neural voices across all 6 official IELTS accents. Audition and lock your examiner voice.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                stopSpeech();
                onClose();
              }}
              aria-label="Close accent audition suite"
              className="p-2 rounded-xl bg-[#EEF3F1] dark:bg-[#11201E] text-[#566664] hover:text-[#0E1F1E] dark:hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Accent Filter Bar */}
          <div className="px-5 py-3 bg-[#F7F9F8] dark:bg-[#11201E] border-b border-[#D3DDDA] dark:border-[#1F8A70]/20 flex flex-wrap items-center gap-2">
            {IELTS_ACCENTS.map((accent) => {
              const active = selectedAccent === accent;
              return (
                <button
                  key={accent}
                  type="button"
                  onClick={() => handleSaveAccent(accent)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    active
                      ? 'bg-[#0F4C45] text-white'
                      : 'bg-white dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 text-[#0E1F1E] dark:text-slate-200 hover:border-[#0F4C45]'
                  }`}
                >
                  {ACCENT_METADATA[accent].label}
                </button>
              );
            })}
          </div>

          {/* Voices Grid for Active Accent */}
          <div className="p-5 max-h-[60vh] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {PROFESSIONAL_STUDIO_VOICES.filter((v) => v.accent === selectedAccent).map((voice) => {
              const isPlaying = playingSpeakerId === voice.speakerId;
              const isLoading = loadingSpeakerId === voice.speakerId;
              const isSelected = selectedSpeakerId === voice.speakerId;

              return (
                <div
                  key={voice.speakerId}
                  className={`p-4 rounded-xl border transition flex flex-col justify-between space-y-3 ${
                    isSelected
                      ? 'bg-[#0F4C45]/5 dark:bg-[#1F8A70]/15 border-[#0F4C45] dark:border-[#6EE7B7]'
                      : 'bg-[#F7F9F8] dark:bg-[#11201E] border-[#D3DDDA] dark:border-[#1F8A70]/25'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-[#0E1F1E] dark:text-white">{voice.name}</h4>
                      <p className="text-[11px] text-[#566664] dark:text-slate-400">
                        {voice.role} · {voice.styleTag}
                      </p>
                    </div>
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0F4C45] dark:text-[#6EE7B7]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs italic text-[#566664] dark:text-slate-300 leading-relaxed">
                    &ldquo;{voice.sampleLine}&rdquo;
                  </p>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#D3DDDA]/60 dark:border-[#1F8A70]/20">
                    <button
                      type="button"
                      onClick={() => handleAuditionVoice(voice.speakerId, voice.accent, voice.sampleLine, voice.gender)}
                      disabled={isLoading}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer ${
                        isPlaying
                          ? 'bg-[#F4A62A] text-[#0E1F1E]'
                          : 'bg-[#0E1F1E] dark:bg-[#162E2A] hover:bg-[#0F4C45] text-white'
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Loading...</span>
                        </>
                      ) : isPlaying ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Play Sample</span>
                        </>
                      )}
                    </button>

                    {!isSelected && (
                      <button
                        type="button"
                        onClick={() => handleSelectStudioSpeaker(voice.speakerId)}
                        className="px-3 py-1.5 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs font-bold transition cursor-pointer"
                      >
                        Set Active
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-4 bg-[#F7F9F8] dark:bg-[#11201E] border-t border-[#D3DDDA] dark:border-[#1F8A70]/25 flex items-center justify-between text-xs text-[#566664] dark:text-slate-400">
            <div className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-[#0F4C45] dark:text-[#6EE7B7]" />
              <span>24kHz Studio-Mastered Multi-Accent Neural Audio</span>
            </div>
            <button
              type="button"
              onClick={() => {
                stopSpeech();
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white font-bold text-xs transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
