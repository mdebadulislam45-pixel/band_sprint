import React, { useState } from 'react';
import { DIDStreamingExaminerVideo } from './DIDStreamingExaminerVideo';
import { ExaminerAvatarAdapter } from '../../services/ExaminerAvatarAdapter';

export type ExaminerArtStyle = 'cute_chubby' | 'webrtc' | 'humanoid' | 'anime';
export type ExaminerStudioTheme = 'navy' | 'slate' | 'daylight';

export const examinerHeadshotImages: Record<'arthur' | 'clara', string> = {
  arthur: '/assets/examiners/arthur_headshot.jpg',
  clara: '/assets/examiners/clara_headshot.jpg'
};

export const PERSONA_CONFIG = {
  clara: {
    name: 'Dr. Clara Sterling',
    role: 'Female Examiner · Warm & Supportive',
    cert: 'Senior Examiner',
    accent: 'British RP (Received Pronunciation)'
  },
  arthur: {
    name: 'Prof. Arthur Pendelton',
    role: 'Male Examiner · Calm & Professional',
    cert: 'Senior Examiner',
    accent: 'British RP (Oxbridge Male)'
  },
  barnaby: {
    name: 'Barnaby',
    role: 'Your AI Learning Companion',
    cert: 'AI Companion',
    accent: 'British English (Warm & Playful Companion)'
  }
};

export interface ExaminerHumanoidCanvasProps {
  gender: 'female' | 'male';
  characterOverride?: 'clara' | 'arthur' | 'barnaby';
  artStyle?: ExaminerArtStyle;
  isSpeaking: boolean;
  isListening: boolean;
  isThinking?: boolean;
  isMuted?: boolean;
  isPaused?: boolean;
  spokenText?: string;
  speechRate?: number;
  candidateVolumeRms?: number;
  mouthOpenness?: number;
  examinerName?: string;
  activePartLabel?: string;
  compact?: boolean;
  studioTheme?: ExaminerStudioTheme;
  adapter?: ExaminerAvatarAdapter | null;
  errorMessage?: string | null;
}

/**
 * BandSprint Speaking Examiner & Companion Canvas
 * Defaults to the interactive anime speaking partner rig ('3D LIVE PARTNER')
 * with real-time viseme lip-sync, natural blinking, and graceful fallback.
 */
export const ExaminerHumanoidCanvas: React.FC<ExaminerHumanoidCanvasProps> = ({
  gender,
  characterOverride,
  isSpeaking,
  isListening,
  isThinking = false,
  isMuted = false,
  isPaused = false,
  spokenText,
  candidateVolumeRms = 0,
  mouthOpenness = 0,
  examinerName,
  activePartLabel = 'IELTS Speaking Room',
  compact = false,
  studioTheme = 'navy',
  adapter = null,
  errorMessage = null
}) => {
  const [renderMode] = useState<'interactive_partner' | 'portrait_photo'>('interactive_partner');
  const frame = adapter ? adapter.getFrameTelemetry(Date.now()) : null;
  const isAdapterArticulating = Boolean(
    frame && frame.mouthOpenness > 0.04 && frame.currentViseme !== 'sil'
  );
  const resolvedMouthOpenness =
    mouthOpenness > 0 ? mouthOpenness : isAdapterArticulating && frame ? frame.mouthOpenness : 0;

  return (
    <div className="w-full" data-render-mode={renderMode} data-partner-badge="3D LIVE PARTNER">
      <DIDStreamingExaminerVideo
        gender={gender}
        characterOverride={characterOverride}
        isSpeaking={isSpeaking}
        isListening={isListening}
        isThinking={isThinking}
        isMuted={isMuted}
        isPaused={isPaused}
        spokenText={spokenText}
        mouthOpenness={resolvedMouthOpenness}
        candidateVolumeRms={candidateVolumeRms}
        examinerName={examinerName}
        activePartLabel={activePartLabel}
        compact={compact}
        studioTheme={studioTheme}
        errorMessage={errorMessage}
      />
    </div>
  );
};
