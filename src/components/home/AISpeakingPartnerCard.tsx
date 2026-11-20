import React, { useState, useEffect } from 'react';
import { Mic, Volume2, ArrowRight } from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { getPreferredVoiceGender, setPreferredVoiceGender } from '../../config/voiceConfig';
import {
  LiveAvatarSpeakingPartner,
  COMMON_PART1_DRILL_TOPICS
} from '../speaking/LiveAvatarSpeakingPartner';
import type { SpeechDeliveryProfileId } from '../../config/speechDirection';

interface AISpeakingPartnerCardProps {
  onNavigate: (module: string) => void;
  onShowToast?: (msg: string) => void;
}

type StudioCharacter = 'clara' | 'arthur' | 'barnaby';

interface SpeakingPersona {
  id: string;
  name: string;
  role: string;
  tagline: string;
  banglaLine: string;
  bestFor: string;
  gender: 'male' | 'female';
  speakerId: string;
  studioCharacter: StudioCharacter;
  deliveryProfile: SpeechDeliveryProfileId;
  greeting: string;
}

/**
 * Six named AI speaking partners. They are AI personas, not real people —
 * no photos, no credentials, no invented qualifications. Each persona maps
 * onto one of the three existing studio characters (Clara / Arthur /
 * Barnaby) and the existing British voice system, with its own greeting,
 * role and drill focus.
 */
const SPEAKING_PARTNERS: SpeakingPersona[] = [
  {
    id: 'barnaby',
    name: 'Barnaby',
    role: 'Friendly Tutor',
    tagline: 'Your little dragon, your big IELTS dreams. Every mistake makes you stronger — Barnaby explains every correction in simple English and Bangla, no pressure, no scoring.',
    banglaLine: 'ভুল নিয়ে চিন্তা করবেন না — আমি বাংলায় বুঝিয়ে দেব।',
    bestFor: 'First conversations & confidence',
    gender: 'male',
    speakerId: 'speaker_barnaby',
    studioCharacter: 'barnaby',
    deliveryProfile: 'barnaby_companion',
    greeting: "Hi! I'm Barnaby, your friendly speaking partner. Don't worry about mistakes — we will fix them together!"
  },
  {
    id: 'clara',
    name: 'Dr. Clara Sterling',
    role: 'Strict Examiner',
    tagline: 'Real IELTS-style Part 1–3 questions, examiner timing and honest scoring — just like test day.',
    banglaLine: 'পরীক্ষার মতো কঠিন প্রশ্ন ও সৎ মূল্যায়ন।',
    bestFor: 'Exam simulation',
    gender: 'female',
    speakerId: 'speaker_05',
    studioCharacter: 'clara',
    deliveryProfile: 'examiner_question',
    greeting: 'Good day. I am Doctor Clara Sterling, your IELTS Speaking examiner. Let us begin with Part One.'
  },
  {
    id: 'arif',
    name: 'Arif Hossain',
    role: 'Easy Conversation Partner',
    tagline: 'Slow, relaxed chats about everyday topics. No scoring, no pressure — just talk and get comfortable.',
    banglaLine: 'ধীরে ধীরে, চাপ ছাড়া কথা বলুন।',
    bestFor: 'Speaking for the first time',
    gender: 'male',
    speakerId: 'speaker_04',
    studioCharacter: 'arthur',
    deliveryProfile: 'friendly_conversation',
    greeting: "Hello, I'm Arif. Let's just chat — tell me about your day, your family, anything you like."
  },
  {
    id: 'zara',
    name: 'Zara Ahmed',
    role: 'High-Energy Coach',
    tagline: 'Fast two-minute drills and quick-fire questions that build speed, energy and confidence.',
    banglaLine: 'দ্রুত ড্রিল — গতি ও আত্মবিশ্বাস বাড়ান।',
    bestFor: 'Daily quick drills',
    gender: 'female',
    speakerId: 'speaker_05',
    studioCharacter: 'clara',
    deliveryProfile: 'natural_conversation',
    greeting: "Hi, I'm Zara! Ready for a quick drill? Two minutes, full energy — let's go!"
  },
  {
    id: 'arthur',
    name: 'Prof. Arthur Pendelton',
    role: 'Grammar Coach',
    tagline: 'Listens for grammar slips, corrects them on the spot and makes you say the sentence again — properly.',
    banglaLine: 'ব্যাকরণের ভুল সাথে সাথে শুধরে দেওয়া হয়।',
    bestFor: 'Accuracy & grammar',
    gender: 'male',
    speakerId: 'speaker_04',
    studioCharacter: 'arthur',
    deliveryProfile: 'feedback_explanation',
    greeting: 'Good day. I am Professor Arthur Pendelton. I shall listen carefully to your grammar — and correct it.'
  },
  {
    id: 'noor',
    name: 'Noor Rahman',
    role: 'Part 2 & 3 Specialist',
    tagline: 'Cue cards and deep discussion questions. Trains you to speak for the full two minutes without running dry.',
    banglaLine: 'Part 2 ও 3-এর দীর্ঘ উত্তরের অনুশীলন।',
    bestFor: 'Part 2 & 3 long answers',
    gender: 'female',
    speakerId: 'speaker_05',
    studioCharacter: 'clara',
    deliveryProfile: 'examiner_instruction',
    greeting: "Hello, I'm Noor. Today we will practise long answers — cue cards and discussion. Take your time, and speak for the full two minutes."
  }
];

export const AISpeakingPartnerCard: React.FC<AISpeakingPartnerCardProps> = ({
  onNavigate,
  onShowToast
}) => {
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(() =>
    getPreferredVoiceGender() === 'male' ? 'arthur' : 'clara'
  );
  const [isStudioModalOpen, setIsStudioModalOpen] = useState<boolean>(false);
  const [topicId, setTopicId] = useState<string>(() => COMMON_PART1_DRILL_TOPICS[0].id);

  useEffect(() => {
    const onGenderSync = (e: Event) => {
      const custom = e as CustomEvent<{ gender?: 'male' | 'female' }>;
      const nextG = custom.detail?.gender || getPreferredVoiceGender();
      setSelectedPersonaId((prev) => {
        const current = SPEAKING_PARTNERS.find((p) => p.id === prev);
        if (!current || current.id === 'barnaby') return prev;
        if (current.gender === nextG) return prev;
        const match = SPEAKING_PARTNERS.find((p) => p.gender === nextG && p.id !== 'barnaby');
        return match ? match.id : prev;
      });
    };
    window.addEventListener('ielts_voice_gender_changed', onGenderSync);
    return () => window.removeEventListener('ielts_voice_gender_changed', onGenderSync);
  }, []);

  const activePersona =
    SPEAKING_PARTNERS.find((p) => p.id === selectedPersonaId) || SPEAKING_PARTNERS[0];

  const previewGreeting = (persona: SpeakingPersona) => {
    stopSpeech();
    soundManager.playBeep(540, 0.02);
    speakBritish(persona.greeting, {
      speakerId: persona.speakerId,
      gender: persona.gender,
      deliveryProfile: persona.deliveryProfile
    });
  };

  const handleEnterStudio = (persona: SpeakingPersona) => {
    stopSpeech();
    soundManager.playBeep(640, 0.04);
    setSelectedPersonaId(persona.id);
    if (persona.id !== 'barnaby') {
      setPreferredVoiceGender(persona.gender);
    }
    const randomTopic =
      COMMON_PART1_DRILL_TOPICS[Math.floor(Math.random() * COMMON_PART1_DRILL_TOPICS.length)];
    setTopicId(randomTopic.id);
    setIsStudioModalOpen(true);
    if (onShowToast) {
      onShowToast(`Entered Practice AI Speaking Studio with ${persona.name}`);
    }
  };

  return (
    <>
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0E1526] border border-stone-200/90 dark:border-slate-800/90 shadow-2xs space-y-4">
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-blue-700 dark:text-blue-400">
                Coach Video Assessment
              </span>
              <span aria-hidden="true">·</span>
              <span>Parts 1–3</span>
              <span aria-hidden="true">·</span>
              <span>6 AI partners</span>
            </div>
          </div>

          <h3 className="font-display text-lg sm:text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Practice AI Speaking Studio
          </h3>
          <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">
            Simulate authentic face-to-face IELTS interviews (Parts 1–3) with real-time fluency scoring and instant grammar feedback.
            Pick a partner — each one speaks and coaches differently. They are AI personas, not real examiners.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SPEAKING_PARTNERS.map((persona) => {
            const isSelected = selectedPersonaId === persona.id;
            return (
              <div
                key={persona.id}
                className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition ${
                  isSelected
                    ? 'border-blue-500 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 shadow-2xs'
                    : 'border-stone-200/90 dark:border-slate-800 bg-white dark:bg-[#0E1526]'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{persona.name}</div>
                      <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">{persona.role}</div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {persona.gender === 'female' ? 'Female voice' : 'Male voice'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{persona.tagline}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">{persona.banglaLine}</p>
                  <span className="inline-block text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/60 rounded-full px-2 py-0.5">
                    Best for: {persona.bestFor}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => previewGreeting(persona)}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                    aria-label={`Hear ${persona.name}'s greeting`}
                  >
                    <Volume2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Hear greeting</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEnterStudio(persona)}
                    className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 active:scale-95 text-white font-semibold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Start with {persona.name.split(' ')[0]}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2 border-t border-stone-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
            Selected: <strong className="text-slate-800 dark:text-slate-200">{activePersona.name}</strong>
            <span className="text-slate-400"> · {activePersona.role}</span>
          </span>
          <button
            type="button"
            onClick={() => handleEnterStudio(activePersona)}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 active:scale-95 text-white font-semibold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <span>Enter Speaking Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Unified Practice AI Speaking Studio Modal */}
      <LiveAvatarSpeakingPartner
        isModal={true}
        isOpen={isStudioModalOpen}
        onClose={() => setIsStudioModalOpen(false)}
        initialTopicId={topicId}
        initialGender={activePersona.gender}
        initialCharacter={activePersona.studioCharacter}
        autoStart5MinDrill={true}
        onShowToast={onShowToast}
        onNavigateToFullLab={() => onNavigate('speaking')}
      />
    </>
  );
};
