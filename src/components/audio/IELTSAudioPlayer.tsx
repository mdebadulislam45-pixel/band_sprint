import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Volume1,
  AlertCircle,
  RefreshCw,
  Headphones,
  Radio,
  ShieldCheck,
  Upload,
  CheckCircle2,
  Globe
} from 'lucide-react';
import { audioService, AudioPlaybackState, IELTS_SPEAKERS } from '../../services/audioService';
import { zeroRepetitionEngine } from '../../services/ZeroRepetitionEngine';
import {
  IELTS_ACCENTS,
  ACCENT_METADATA,
  getPreferredAccent,
  setPreferredAccent,
  OfficialIELTSAccent
} from '../../config/voiceConfig';
import { AudioPlaybackWaveform } from './AudioPlaybackWaveform';

interface IELTSAudioPlayerProps {
  title?: string;
  subtitle?: string;
  audioId?: string;
  questionId?: string;
  provenanceBadge?: string;
  isAuthorizedOfficial?: boolean;
  isMockExamMode?: boolean; // When true, speed is locked to 1.0x per IELTS exam rules
  onPlay?: () => void;
  onPause?: () => void;
  onRetry?: () => void;
  className?: string;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export const IELTSAudioPlayer: React.FC<IELTSAudioPlayerProps> = ({
  title = 'IELTS Listening Practice Audio',
  subtitle = 'Original Practice Audio · British RP Studio Synthesis (Cambridge-Calibrated)',
  audioId,
  questionId,
  provenanceBadge,
  isAuthorizedOfficial = false,
  isMockExamMode = false,
  onPlay,
  onPause,
  onRetry,
  className = ''
}) => {
  const [state, setState] = useState<AudioPlaybackState>(audioService.getState());
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const [accentMenuOpen, setAccentMenuOpen] = useState(false);
  const [currentAccentPref, setCurrentAccentPref] = useState<OfficialIELTSAccent>(() => getPreferredAccent());
  const [customOfficialFileUrl, setCustomOfficialFileUrl] = useState<string | null>(() => {
    if (questionId) {
      return zeroRepetitionEngine.getAuthorizedOfficialAudio(questionId)?.url || null;
    }
    return null;
  });
  const [customOfficialFileName, setCustomOfficialFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSelectAccent = (acc: OfficialIELTSAccent) => {
    setCurrentAccentPref(acc);
    setPreferredAccent(acc);
    setAccentMenuOpen(false);
    onRetry?.();
  };

  useEffect(() => {
    const unsubscribe = audioService.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (questionId) {
      const existing = zeroRepetitionEngine.getAuthorizedOfficialAudio(questionId);
      setCustomOfficialFileUrl(existing?.url || null);
    }
  }, [questionId]);

  const isOfficialActive = isAuthorizedOfficial || Boolean(customOfficialFileUrl);

  const handleAttachLicensedAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objUrl = URL.createObjectURL(file);
    setCustomOfficialFileUrl(objUrl);
    setCustomOfficialFileName(file.name);
    if (questionId) {
      zeroRepetitionEngine.registerAuthorizedOfficialAudio(
        questionId,
        objUrl,
        `Authorized Official Recording (${file.name})`
      );
    }
    audioService.playAuthorizedAudioUrl(objUrl);
  };

  const handleTogglePlay = () => {
    audioService.unlockAudio();
    if (state.isPlaying) {
      audioService.pause();
      onPause?.();
    } else if (state.isPaused) {
      audioService.resume();
      onPlay?.();
    } else if (customOfficialFileUrl) {
      audioService.playAuthorizedAudioUrl(customOfficialFileUrl);
    } else {
      onPlay?.();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    audioService.seek(val);
  };

  const handleSkip = (seconds: number) => {
    const next = Math.max(0, Math.min(state.duration || 0, state.currentTime + seconds));
    audioService.seek(next);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    audioService.setVolume(vol);
  };

  const handleToggleMute = () => {
    if (state.volume > 0) {
      audioService.setVolume(0);
    } else {
      audioService.setVolume(1);
    }
  };

  const handleSetSpeed = (rate: number) => {
    if (isMockExamMode) return;
    audioService.setPlaybackRate(rate);
    setSpeedMenuOpen(false);
  };

  const currentSpeaker = IELTS_SPEAKERS[state.currentSpeakerId] || IELTS_SPEAKERS['speaker_04'];
  const activeAccent = state.currentAccent || currentSpeaker.accent;
  const activeSpeakerName = state.currentSpeakerName || currentSpeaker.name;

  const getAccentFlag = (accentStr: string) => {
    const a = accentStr.toLowerCase();
    if (a.includes('australian') || a.includes('au')) return '🇦🇺 Australian';
    if (a.includes('canadian') || a.includes('ca')) return '🇨🇦 Canadian';
    if (a.includes('american') || a.includes('us')) return '🇺🇸 American';
    if (a.includes('zealand') || a.includes('nz')) return '🇳🇿 New Zealand';
    if (a.includes('irish') || a.includes('ie')) return '🇮🇪 Irish';
    return '🇬🇧 British RP';
  };

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs transition hover:border-blue-400 ${className}`}
    >
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 shadow-2xs">
            <Headphones className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">{title}</h4>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300/60 shrink-0">
                {getAccentFlag(activeAccent)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              <span className="truncate">
                {customOfficialFileName
                  ? `Licensed Recording: ${customOfficialFileName}`
                  : subtitle}
              </span>
              <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>
              <span className="text-[11px] font-mono font-semibold text-blue-700 dark:text-blue-300">
                {isOfficialActive
                  ? provenanceBadge || 'Authorized Official Audio'
                  : provenanceBadge || `Native Speaker: ${activeSpeakerName}`}
              </span>
              {audioId && (
                <>
                  <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400 shrink-0"
                    title={`Unique Audio Fingerprint ID: ${audioId}`}
                  >
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span className="truncate max-w-[130px]">{audioId}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Top Controls: Attach Licensed Official File, Ambience, Speed */}
        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/x-m4a"
            onChange={handleAttachLicensedAudio}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold border transition flex items-center gap-1.5 cursor-pointer ${
              customOfficialFileUrl
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
            title="Have a legally licensed Cambridge IELTS official audio file (.mp3/.wav)? Attach it here for authentic playback."
          >
            {customOfficialFileUrl ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Licensed Audio Active</span>
              </>
            ) : (
              <>
                <Upload className="w-3 h-3 text-slate-500" />
                <span>Load Licensed Audio</span>
              </>
            )}
          </button>

          {/* Subtle Studio Acoustics Toggle */}
          <button
            type="button"
            onClick={() => audioService.toggleAmbience()}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold border transition flex items-center gap-1.5 cursor-pointer ${
              state.isAmbienceEnabled
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
            }`}
            title="Toggle subtle studio room acoustics"
          >
            <Radio
              className={`w-3 h-3 ${
                state.isAmbienceEnabled ? 'text-emerald-600 animate-pulse' : 'text-slate-400'
              }`}
            />
            <span>{state.isAmbienceEnabled ? 'Acoustics ON' : 'Acoustics Off'}</span>
          </button>

          {/* Accent Switcher */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setAccentMenuOpen(!accentMenuOpen);
                setSpeedMenuOpen(false);
              }}
              className="px-2 sm:px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Switch IELTS listening accent"
            >
              <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline">{ACCENT_METADATA[currentAccentPref]?.flag || '🇬🇧'} {currentAccentPref}</span>
              <span className="sm:hidden">{ACCENT_METADATA[currentAccentPref]?.flag || '🇬🇧'}</span>
            </button>

            {accentMenuOpen && (
              <div className="absolute right-0 top-8 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-1.5 flex flex-col gap-1 min-w-[155px] animate-fade-in">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  Select Native Accent
                </div>
                {IELTS_ACCENTS.map((acc) => (
                  <button
                    key={acc}
                    type="button"
                    onClick={() => handleSelectAccent(acc)}
                    className={`px-2.5 py-1.5 text-xs font-bold rounded-xl text-left transition flex items-center gap-2 ${
                      currentAccentPref === acc
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{ACCENT_METADATA[acc].flag}</span>
                    <span>{acc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Speed button (Practice mode only) */}
          {!isMockExamMode ? (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setSpeedMenuOpen(!speedMenuOpen)}
                className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-mono text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                title="Change audio speed (Practice mode only)"
              >
                <span>{state.playbackRate.toFixed(2).replace(/\.00$/, '')}×</span>
              </button>

              {speedMenuOpen && (
                <div className="absolute right-0 top-8 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-1.5 flex flex-col gap-1 min-w-[90px] animate-fade-in">
                  {[0.75, 1.0, 1.25, 1.5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSetSpeed(s)}
                      className={`px-3 py-1.5 text-xs font-mono font-bold rounded-xl text-left transition ${
                        state.playbackRate === s
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {s}× {s === 1.0 ? '(Standard)' : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300 px-2 py-1 shrink-0">
              Exam Speed Locked (1.0×)
            </span>
          )}
        </div>
      </div>

      {/* Error state if failed */}
      {state.error ? (
        <div className="my-2 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Audio stream encountered an issue. Tap retry to reconnect.</span>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          )}
        </div>
      ) : null}

      {/* Main Scrubber Progress Bar */}
      <div className="space-y-1 my-2">
        <div className="relative flex items-center">
          <input
            type="range"
            min={0}
            max={state.duration > 0 ? state.duration : 100}
            step={0.5}
            value={state.currentTime}
            onChange={handleSeek}
            disabled={state.duration <= 0}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            aria-label="Audio scrubber progress"
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 px-0.5">
          <span>{formatTime(state.currentTime)}</span>
          <span className="text-slate-500 dark:text-slate-400 font-sans font-medium text-[10px]">
            {state.isPlaying
              ? isOfficialActive
                ? '▶ Playing Authorized Licensed Recording'
                : '▶ Playing Original Practice Recording (British RP Studio)'
              : state.isPaused
              ? '⏸ Paused'
              : isOfficialActive
              ? 'Authorized Licensed Audio Ready'
              : 'Original Practice Audio Ready'}
          </span>
          <span>{state.duration > 0 ? formatTime(state.duration) : '--:--'}</span>
        </div>
      </div>

      {/* Visual Frequency Waveform Feedback Animation */}
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 my-2">
        <AudioPlaybackWaveform
          isPlaying={state.isPlaying}
          isLoading={state.isLoading}
          height={28}
          barCount={20}
          showLabel={true}
          label={
            state.isLoading
              ? 'Buffering British RP Studio Audio...'
              : state.isPlaying
              ? isOfficialActive
                ? 'Licensed Official Audio Stream'
                : 'Original Practice Audio Stream'
              : 'Audio Engine Ready'
          }
        />
        <div className="text-[10px] font-mono font-bold text-slate-400 tracking-wider uppercase hidden sm:block">
          {isOfficialActive ? 'Licensed Master' : 'Original Practice · British RP'}
        </div>
      </div>

      {/* Primary Player Controls */}
      <div className="flex items-center justify-between pt-1">
        {/* Play / Pause / Skip Touch Buttons */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={handleTogglePlay}
            disabled={state.isLoading}
            className={`min-w-[44px] min-h-[44px] sm:min-w-[48px] sm:min-h-[48px] rounded-2xl flex items-center justify-center font-bold text-white shadow-md transition transform active:scale-95 cursor-pointer ${
              state.isPlaying
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
            }`}
            title={state.isPlaying ? 'Pause Audio' : 'Play Audio'}
            aria-label={state.isPlaying ? 'Pause Audio' : 'Play Audio'}
          >
            {state.isLoading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : state.isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Quick -10s skip back */}
          {!isMockExamMode && (
            <button
              type="button"
              onClick={() => handleSkip(-10)}
              disabled={state.duration <= 0}
              className="min-w-[36px] min-h-[36px] rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-mono font-bold flex items-center justify-center transition disabled:opacity-40 cursor-pointer"
              title="Skip back 10 seconds"
            >
              -10s
            </button>
          )}

          {/* Quick +10s skip forward */}
          {!isMockExamMode && (
            <button
              type="button"
              onClick={() => handleSkip(10)}
              disabled={state.duration <= 0}
              className="min-w-[36px] min-h-[36px] rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-mono font-bold flex items-center justify-center transition disabled:opacity-40 cursor-pointer"
              title="Skip forward 10 seconds"
            >
              +10s
            </button>
          )}

          <button
            type="button"
            onClick={() => audioService.stop()}
            className="min-w-[38px] min-h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition cursor-pointer"
            title="Reset / Stop Audio"
            aria-label="Reset Audio"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Volume Slider Controls */}
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <button
            type="button"
            onClick={handleToggleMute}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title={state.volume === 0 ? 'Unmute' : 'Mute'}
            aria-label="Toggle mute"
          >
            {state.volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-500" />
            ) : state.volume < 0.5 ? (
              <Volume1 className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={state.volume}
            onChange={handleVolumeChange}
            className="w-16 sm:w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            title={`Volume: ${Math.round(state.volume * 100)}%`}
            aria-label="Volume slider"
          />
        </div>
      </div>
    </div>
  );
};
