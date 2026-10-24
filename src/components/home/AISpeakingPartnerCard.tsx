import React, { useState } from 'react';
import { Mic, ArrowRight } from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { stopSpeech } from '../../utils/britishVoice';
import {
  LiveAvatarSpeakingPartner,
  COMMON_PART1_DRILL_TOPICS
} from '../speaking/LiveAvatarSpeakingPartner';

interface AISpeakingPartnerCardProps {
  onNavigate: (module: string) => void;
  onShowToast?: (msg: string) => void;
}

const STUDIO_EXAMINERS = [
  {
    id: 'female' as const,
    label: 'Dr. Clara (Female)',
    fullName: 'Dr. Clara Sterling',
    role: 'Senior Cambridge Oral Assessor'
  },
  {
    id: 'male' as const,
    label: 'Prof. Arthur (Male)',
    fullName: 'Prof. Arthur Pendelton',
    role: 'Principal Oxbridge Oral Assessor'
  }
];

export const AISpeakingPartnerCard: React.FC<AISpeakingPartnerCardProps> = ({
  onNavigate,
  onShowToast
}) => {
  const [selectedGender, setSelectedGender] = useState<'female' | 'male'>('female');
  const [isStudioModalOpen, setIsStudioModalOpen] = useState<boolean>(false);
  const [topicId, setTopicId] = useState<string>(() => COMMON_PART1_DRILL_TOPICS[0].id);

  const activeExaminer =
    STUDIO_EXAMINERS.find((e) => e.id === selectedGender) || STUDIO_EXAMINERS[0];

  const handleEnterStudio = () => {
    stopSpeech();
    soundManager.playBeep(640, 0.04);
    const randomTopic =
      COMMON_PART1_DRILL_TOPICS[Math.floor(Math.random() * COMMON_PART1_DRILL_TOPICS.length)];
    setTopicId(randomTopic.id);
    setIsStudioModalOpen(true);
    if (onShowToast) {
      onShowToast(`Entered Cambridge AI Speaking Studio with ${activeExaminer.fullName}`);
    }
  };

  return (
    <>
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0E1526] border border-stone-200/90 dark:border-slate-800/90 shadow-2xs flex flex-col justify-between space-y-4">
        <div className="space-y-2.5">
          {/* Top Metadata & Minimal Examiner Segmented Pill */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-blue-700 dark:text-blue-400">
                British Council Video Assessment
              </span>
              <span aria-hidden="true">·</span>
              <span>Parts 1–3</span>
            </div>

            {/* Minimal, Elegant Segmented Pill: [ Dr. Clara (Female) | Prof. Arthur (Male) ] */}
            <div
              className="inline-flex p-1 rounded-xl bg-stone-200/70 dark:bg-slate-800/90 border border-stone-200/90 dark:border-slate-700"
              role="group"
              aria-label="Select Examiner"
            >
              {STUDIO_EXAMINERS.map((ex) => {
                const isSelected = selectedGender === ex.id;
                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      soundManager.playBeep(540, 0.02);
                      setSelectedGender(ex.id);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {ex.label}
                  </button>
                );
              })}
            </div>
          </div>

          <h3 className="font-display text-lg sm:text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Cambridge AI Speaking Studio
          </h3>
          <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">
            Simulate authentic face-to-face IELTS interviews (Parts 1–3) with real-time fluency scoring and instant grammar feedback.
          </p>
        </div>

        <div className="pt-2 border-t border-stone-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
            Examiner: <strong className="text-slate-800 dark:text-slate-200">{activeExaminer.fullName}</strong>
          </span>

          <button
            type="button"
            onClick={handleEnterStudio}
            data-testid="enter-speaking-studio-btn"
            className="min-h-[42px] px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 active:scale-95 text-white font-semibold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Enter Speaking Studio →</span>
          </button>
        </div>
      </div>

      {/* Unified Cambridge AI Speaking Studio Modal */}
      <LiveAvatarSpeakingPartner
        isModal={true}
        isOpen={isStudioModalOpen}
        onClose={() => setIsStudioModalOpen(false)}
        initialTopicId={topicId}
        initialGender={selectedGender}
        autoStart5MinDrill={true}
        onShowToast={onShowToast}
        onNavigateToFullLab={() => onNavigate('speaking')}
      />
    </>
  );
};
