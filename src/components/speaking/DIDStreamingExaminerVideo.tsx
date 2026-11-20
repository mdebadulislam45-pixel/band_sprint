import React, { useState, useEffect, useRef, useCallback } from 'react';
import { didStreamService } from '../../services/DIDStreamService';
import { CuteChubbyExaminerAvatar, ChubbyAvatarCharacter } from './CuteChubbyExaminerAvatar';
import { Video, Sparkles, Smile, HelpCircle } from 'lucide-react';

export type ExaminerVisualMode = 'cute_chubby' | 'webrtc';

export interface DIDStreamingExaminerVideoProps {
  gender: 'female' | 'male';
  characterOverride?: ChubbyAvatarCharacter;
  isSpeaking: boolean;
  isListening: boolean;
  isThinking?: boolean;
  isMuted?: boolean;
  isPaused?: boolean;
  spokenText?: string;
  mouthOpenness?: number;
  candidateVolumeRms?: number;
  examinerName?: string;
  activePartLabel?: string;
  compact?: boolean;
  studioTheme?: 'navy' | 'slate' | 'daylight';
  errorMessage?: string | null;
  onStreamStatusChange?: (status: 'idle' | 'connecting' | 'connected' | 'error', msg?: string) => void;
}

/**
 * Modern AI Speaking Partner Canvas
 * 
 * Primary: BandSprint Visual Reference Anime Avatar (Prof. Arthur, Dr. Clara, Companion Barnaby)
 * Optional: D-ID Real-Time WebRTC Streaming Video (when D_ID_API_KEY is configured in backend environment)
 */
export const DIDStreamingExaminerVideo: React.FC<DIDStreamingExaminerVideoProps> = ({
  gender,
  characterOverride: propCharacterOverride,
  isSpeaking,
  isListening,
  isThinking = false,
  isMuted = false,
  isPaused = false,
  spokenText,
  mouthOpenness = 0,
  candidateVolumeRms = 0,
  examinerName,
  activePartLabel = 'Practice Speaking Lab',
  compact = false,
  studioTheme = 'navy',
  errorMessage = null,
  onStreamStatusChange
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [streamStatus, setStreamStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [isDidConfigured, setIsDidConfigured] = useState<boolean>(false);
  const [visualMode, setVisualMode] = useState<ExaminerVisualMode>('cute_chubby');
  const [characterOverride, setCharacterOverride] = useState<ChubbyAvatarCharacter | undefined>(propCharacterOverride);

  useEffect(() => {
    if (propCharacterOverride) {
      setCharacterOverride(propCharacterOverride);
    }
  }, [propCharacterOverride]);

  const lastSpokenTextRef = useRef<string>('');

  // Check backend D-ID API configuration status
  useEffect(() => {
    let isMounted = true;
    didStreamService.checkConfig().then((configured) => {
      if (isMounted) {
        setIsDidConfigured(configured);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync default character on external gender prop changes when not explicitly overridden to barnaby
  useEffect(() => {
    if (propCharacterOverride === 'barnaby') return;
    setCharacterOverride(gender === 'female' ? 'clara' : 'arthur');
  }, [gender, propCharacterOverride]);

  // Handle D-ID WebRTC stream connection lifecycle
  const connectStream = useCallback(async () => {
    if (!videoRef.current) return;
    const configured = await didStreamService.checkConfig();
    if (!configured) {
      setStreamStatus('idle');
      return;
    }

    setStreamStatus('connecting');
    onStreamStatusChange?.('connecting', 'Connecting D-ID WebRTC stream...');

    const success = await didStreamService.startStream(
      videoRef.current,
      gender,
      (status, message) => {
        setStreamStatus(status);
        onStreamStatusChange?.(status, message);
      }
    );

    if (success) {
      setStreamStatus('connected');
      setVisualMode('webrtc');
    }
  }, [gender, onStreamStatusChange]);

  useEffect(() => {
    if (isDidConfigured && visualMode === 'webrtc') {
      void connectStream();
    }
    return () => {
      void didStreamService.closeStream();
    };
  }, [isDidConfigured, visualMode, connectStream]);

  // Dispatch speech to D-ID stream when examiner speaks
  useEffect(() => {
    if (isSpeaking && !isPaused && streamStatus === 'connected' && visualMode === 'webrtc' && spokenText) {
      if (spokenText !== lastSpokenTextRef.current) {
        lastSpokenTextRef.current = spokenText;
        const voiceId = gender === 'female' ? 'en-GB-SoniaNeural' : 'en-GB-RyanNeural';
        didStreamService.speakText(spokenText, voiceId);
      }
    }
  }, [isSpeaking, isPaused, streamStatus, visualMode, spokenText, gender]);

  return (
    <div className="w-full flex flex-col gap-2">
      {/* MAIN EXAMINER VIEWPORT CONTAINER */}
      <div
        className={`relative w-full overflow-hidden rounded-2xl select-none transition-all duration-300 border shadow-2xl flex items-center justify-center ${
          compact
            ? 'h-[230px] sm:h-[300px] max-h-[32vh] sm:max-h-[35vh]'
            : 'h-[250px] sm:h-[350px] lg:h-[400px] max-h-[32vh] sm:max-h-[35vh]'
        } ${
          studioTheme === 'daylight'
            ? 'bg-slate-200 border-slate-300 text-slate-800'
            : 'bg-[#090D16] border-slate-800 text-slate-100 ring-1 ring-white/10'
        }`}
      >
        {/* ================= PRIMARY AVATAR DISPLAY LAYER ================= */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden z-10 max-h-[35vh]">
          {/* 1. BandSprint Visual Reference Avatar (Dr. Clara, Prof. Arthur, Companion Barnaby) */}
          {visualMode === 'cute_chubby' && (
            <CuteChubbyExaminerAvatar
              gender={gender}
              characterOverride={propCharacterOverride ?? characterOverride}
              isSpeaking={isSpeaking}
              isListening={isListening}
              isThinking={isThinking}
              isMuted={isMuted}
              isPaused={isPaused}
              spokenText={spokenText}
              mouthOpenness={mouthOpenness}
              candidateVolumeRms={candidateVolumeRms}
              examinerName={examinerName}
              activePartLabel={activePartLabel}
              compact={compact}
              showPersonaSwitcher={false}
              studioTheme={studioTheme}
              errorMessage={errorMessage}
              onCharacterChange={(c) => setCharacterOverride(c)}
            />
          )}

          {/* 2. Optional D-ID Real-Time WebRTC Video Stream Mode (if configured) */}
          {visualMode === 'webrtc' && (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isMuted}
                className={`w-full h-full object-cover object-top transition-opacity duration-500 ${
                  streamStatus === 'connected' ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
                }`}
              />
              {streamStatus !== 'connected' && (
                <div className="flex flex-col items-center justify-center gap-3 p-6 text-center text-slate-300">
                  <div className="w-10 h-10 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                  <div className="text-sm font-semibold text-white">Connecting D-ID WebRTC Stream...</div>
                  <button
                    type="button"
                    onClick={() => setVisualMode('cute_chubby')}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer shadow-md"
                  >
                    Switch to Cute Chubby Examiner
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ================= D-ID STREAM TOGGLE (Only shown if user configured D-ID) ================= */}
        {isDidConfigured && (
          <div className="absolute top-3 left-3 z-30">
            <button
              type="button"
              onClick={() => {
                if (visualMode === 'cute_chubby') {
                  setVisualMode('webrtc');
                  if (streamStatus !== 'connected') {
                    void connectStream();
                  }
                } else {
                  setVisualMode('cute_chubby');
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition cursor-pointer backdrop-blur-md border ${
                visualMode === 'webrtc'
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                  : 'bg-slate-950/80 text-slate-300 border-white/10 hover:text-white'
              }`}
            >
              <Video className="w-3 h-3 text-indigo-300" />
              <span>{visualMode === 'webrtc' ? 'D-ID Live Active' : 'Enable D-ID'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
