import React, { useEffect, useState } from 'react';
import {
  Check,
  Download,
  Globe,
  HardDrive,
  Loader2,
  Trash2,
  Volume2,
  VolumeX,
  WifiOff,
} from 'lucide-react';
import {
  ACCENT_METADATA,
  getPreferredAccent,
  getPreferredStudioSpeakerId,
  IELTS_ACCENTS,
  OfficialIELTSAccent,
  PROFESSIONAL_STUDIO_VOICES,
  setPreferredAccent,
  setPreferredStudioSpeakerId,
  StudioVoicePersona,
} from '../../config/voiceConfig';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';
import {
  clearOfflineStudyPack,
  downloadOfflineStudyPack,
  getOfflinePackStatus,
  OfflinePackStatus,
} from '../../services/offlinePackService';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface AccentAndVoiceStudioPanelProps {
  onShowToast: (msg: string) => void;
  compact?: boolean;
}

export const AccentAndVoiceStudioPanel: React.FC<AccentAndVoiceStudioPanelProps> = ({
  onShowToast,
  compact = false,
}) => {
  const [selectedAccent, setSelectedAccent] = useState<OfficialIELTSAccent>(() =>
    getPreferredAccent()
  );
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string>(() =>
    getPreferredStudioSpeakerId()
  );
  const [playingSpeakerId, setPlayingSpeakerId] = useState<string | null>(null);
  const [loadingSpeakerId, setLoadingSpeakerId] = useState<string | null>(null);

  // Offline-first Mobile PWA Pack state
  const [packStatus, setPackStatus] = useState<OfflinePackStatus>({
    isReady: false,
    accent: null,
    cachedDecksCount: 0,
    cachedAudioClipsCount: 0,
    updatedAt: null,
  });
  const [isCachingPack, setIsCachingPack] = useState(false);
  const [cacheProgress, setCacheProgress] = useState<{ done: number; total: number }>({
    done: 0,
    total: 0,
  });

  useEffect(() => {
    getOfflinePackStatus().then(setPackStatus).catch(() => {});
    const onAccentSync = () => {
      setSelectedAccent(getPreferredAccent());
      setSelectedSpeakerId(getPreferredStudioSpeakerId());
    };
    window.addEventListener('ielts_accent_changed', onAccentSync);
    return () => {
      stopSpeech();
      window.removeEventListener('ielts_accent_changed', onAccentSync);
    };
  }, []);

  const [voiceFilter, setVoiceFilter] = useState<'accent' | 'elder'>('accent');
  const elderVoices = PROFESSIONAL_STUDIO_VOICES.filter((v) => v.voiceCategory === 'elder');
  const voicesForAccent =
    voiceFilter === 'elder'
      ? elderVoices
      : PROFESSIONAL_STUDIO_VOICES.filter((v) => v.accent === selectedAccent);

  const handleSelectAccent = (accent: OfficialIELTSAccent) => {
    stopSpeech();
    setPlayingSpeakerId(null);
    setVoiceFilter('accent');
    setSelectedAccent(accent);
    setPreferredAccent(accent);
    const nextSpeaker = getPreferredStudioSpeakerId();
    setSelectedSpeakerId(nextSpeaker);
    soundManager.playBeep(580, 0.035);
    onShowToast(`Primary IELTS accent set to ${ACCENT_METADATA[accent].label}.`);
  };

  const handleSelectVoice = (voice: StudioVoicePersona) => {
    const saved = setPreferredStudioSpeakerId(voice.speakerId);
    if (saved) {
      setSelectedSpeakerId(saved.speakerId);
      setSelectedAccent(saved.accent);
      soundManager.playSuccess();
      onShowToast(`Active studio examiner locked: ${saved.name} (${saved.accent}).`);
    }
  };

  const handleAuditionVoice = (voice: StudioVoicePersona) => {
    soundManager.playBeep(520, 0.03);
    if (playingSpeakerId === voice.speakerId) {
      stopSpeech();
      setPlayingSpeakerId(null);
      setLoadingSpeakerId(null);
      return;
    }
    stopSpeech();
    setLoadingSpeakerId(voice.speakerId);
    speakBritish(voice.sampleLine, {
      speakerId: voice.speakerId,
      accent: voice.accent,
      gender: voice.gender,
      deliveryProfile: 'natural_conversation',
      onStart: () => {
        setLoadingSpeakerId(null);
        setPlayingSpeakerId(voice.speakerId);
      },
      onEnd: () => {
        setLoadingSpeakerId(null);
        setPlayingSpeakerId(null);
      },
      onError: () => {
        setLoadingSpeakerId(null);
        setPlayingSpeakerId(null);
        onShowToast(`Could not stream ${voice.name} right now—try tapping Play again.`);
      },
    });
  };

  const handleDownloadOfflinePack = async () => {
    if (isCachingPack) return;
    setIsCachingPack(true);
    setCacheProgress({ done: 0, total: 6 });
    try {
      const result = await downloadOfflineStudyPack((done, total) => {
        setCacheProgress({ done, total });
      });
      setPackStatus(result);
      soundManager.playSuccess();
      onShowToast(
        `Offline PWA pack cached (${result.cachedDecksCount} drills & ${result.cachedAudioClipsCount} ${selectedAccent} audio clips).`
      );
    } catch {
      onShowToast('Offline caching could not complete—check browser storage settings.');
    } finally {
      setIsCachingPack(false);
    }
  };

  const handleClearOfflinePack = async () => {
    await clearOfflineStudyPack();
    const fresh = await getOfflinePackStatus();
    setPackStatus(fresh);
    onShowToast('Offline study & audio pack cleared.');
  };

  const activePersona =
    PROFESSIONAL_STUDIO_VOICES.find((v) => v.speakerId === selectedSpeakerId) ||
    PROFESSIONAL_STUDIO_VOICES[0];

  return (
    <section
      data-testid="profile-accent-voice-studio"
      className="rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/35 p-5 space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-[#D3DDDA]/70 dark:border-[#1F8A70]/25">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[#0F4C45] dark:text-[#6EE7B7] font-bold">
            <Globe className="w-3.5 h-3.5 text-[#F4A62A]" />
            <span>Multi-Accent &amp; Studio Audio Profile</span>
          </div>
          <h2 className="font-display text-base sm:text-lg font-bold text-[#0E1F1E] dark:text-white">
            Choose Your IELTS Accent &amp; Professional Examiner Voice
          </h2>
          <p className="text-xs text-[#566664] dark:text-slate-400">
            Active across Listening labs, Speaking Part 1–3, Vocabulary audio, and Barnaby drills:{' '}
            <strong className="text-[#0E1F1E] dark:text-white">
              {activePersona.name} ({ACCENT_METADATA[activePersona.accent].label})
            </strong>
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleAuditionVoice(activePersona)}
          className="min-h-[38px] px-3.5 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition"
        >
          {playingSpeakerId === activePersona.speakerId ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-[#F4A62A]" />
              <span>Stop Preview</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-[#F4A62A]" />
              <span>Test Active Voice</span>
            </>
          )}
        </button>
      </div>

      {/* 6 Official IELTS Accent Selector + Deep Elder / Grandpa Voices Toggle */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#566664] dark:text-slate-400">
            1. Select Official IELTS Accent (6 Regions) or Deep Elder / Grandpa Voices
          </div>

          <button
            type="button"
            data-testid="profile-deep-elder-filter-btn"
            aria-pressed={voiceFilter === 'elder'}
            onClick={() => {
              soundManager.playBeep(540, 0.035);
              setVoiceFilter((prev) => (prev === 'elder' ? 'accent' : 'elder'));
            }}
            className={`min-h-[34px] px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              voiceFilter === 'elder'
                ? 'bg-[#F4A62A] text-[#0E1F1E]'
                : 'bg-[#FEF6E8] dark:bg-[#F4A62A]/15 border border-[#F4A62A]/50 text-[#8F5B0E] dark:text-[#F4A62A] hover:brightness-95'
            }`}
          >
            {voiceFilter === 'elder'
              ? `Showing Deep Grandpa Voices (${elderVoices.length})`
              : `Deep Grandpa & Elder Voices (${elderVoices.length})`}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {IELTS_ACCENTS.map((accent) => {
            const meta = ACCENT_METADATA[accent];
            const isActive = voiceFilter === 'accent' && selectedAccent === accent;
            const voiceCount = PROFESSIONAL_STUDIO_VOICES.filter((v) => v.accent === accent).length;
            return (
              <button
                key={accent}
                type="button"
                data-testid={`profile-accent-btn-${accent.toLowerCase().replace(/\s+/g, '-')}`}
                aria-pressed={isActive}
                onClick={() => handleSelectAccent(accent)}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  isActive
                    ? 'bg-[#0F4C45] border-[#0F4C45] text-white'
                    : 'bg-[#F7F9F8] dark:bg-[#0B1514] border-[#D3DDDA] dark:border-[#1F8A70]/25 text-[#0E1F1E] dark:text-slate-200 hover:border-[#0F4C45]'
                }`}
              >
                <div className="text-xs font-bold truncate">{meta.label}</div>
                <div
                  className={`text-[10px] font-mono mt-0.5 tabular-nums ${
                    isActive ? 'text-[#F4A62A]' : 'text-[#566664] dark:text-slate-400'
                  }`}
                >
                  {voiceCount} studio voices
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Professional Studio Voices Roster for Active Accent or Deep Elder Showcase */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#566664] dark:text-slate-400">
            {voiceFilter === 'elder'
              ? '2. Deep Grandpa & Distinguished Elder Studio Voices (Warm Bass Baritone)'
              : `2. Studio Examiner & Lecturer Voices (${ACCENT_METADATA[selectedAccent].label})`}
          </div>
          <span className="text-[11px] text-[#566664] dark:text-slate-400">
            24kHz broadcast mastered · {PROFESSIONAL_STUDIO_VOICES.length} total voices
          </span>
        </div>

        <div className={`grid grid-cols-1 ${compact ? 'md:grid-cols-2' : 'sm:grid-cols-2'} gap-3`}>
          {voicesForAccent.map((voice) => {
            const isSelected = selectedSpeakerId === voice.speakerId;
            const isPlaying = playingSpeakerId === voice.speakerId;
            const isLoading = loadingSpeakerId === voice.speakerId;

            return (
              <div
                key={voice.speakerId}
                data-testid={`studio-voice-card-${voice.speakerId}`}
                onClick={() => handleSelectVoice(voice)}
                className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-2.5 ${
                  isSelected
                    ? 'bg-[#0F4C45]/6 dark:bg-[#1F8A70]/15 border-[#0F4C45] dark:border-[#6EE7B7]'
                    : 'bg-[#F7F9F8] dark:bg-[#0B1514] border-[#D3DDDA] dark:border-[#1F8A70]/25 hover:border-[#0F4C45]/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-[#0E1F1E] dark:text-white truncate">
                        {voice.name}
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-[#0F4C45] dark:text-[#6EE7B7] shrink-0" />
                      )}
                    </div>
                    <div className="text-[11px] text-[#566664] dark:text-slate-400">
                      {voice.role} · {voice.gender === 'female' ? 'Female' : 'Male'} · {voice.styleTag}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAuditionVoice(voice);
                    }}
                    className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 shrink-0 transition cursor-pointer ${
                      isPlaying
                        ? 'bg-[#F4A62A] text-[#0E1F1E]'
                        : 'bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/35 text-[#0F4C45] dark:text-[#6EE7B7] hover:bg-[#EEF3F1]'
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : isPlaying ? (
                      <VolumeX className="w-3 h-3" />
                    ) : (
                      <Volume2 className="w-3 h-3" />
                    )}
                    <span>{isPlaying ? 'Stop' : 'Sample'}</span>
                  </button>
                </div>

                <p className="text-[11px] italic text-[#566664] dark:text-slate-400 line-clamp-2">
                  &ldquo;{voice.sampleLine}&rdquo;
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Offline-First Mobile PWA Pack Caching & Install Strip */}
      <div
        data-testid="offline-pwa-pack-card"
        className="pt-4 border-t border-[#D3DDDA]/70 dark:border-[#1F8A70]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0E1F1E] dark:text-white">
            <HardDrive className="w-4 h-4 text-[#0F4C45] dark:text-[#F4A62A] shrink-0" />
            <span>Offline Mobile PWA Study &amp; Audio Pack</span>
          </div>
          <p className="text-[11px] text-[#566664] dark:text-slate-400 leading-relaxed tabular-nums">
            {packStatus.isReady ? (
              <>
                Cached locally ({packStatus.cachedDecksCount} Daily Sprint drills ·{' '}
                {packStatus.cachedAudioClipsCount} {packStatus.accent || selectedAccent} audio clips
                ready offline).
              </>
            ) : (
              <>
                Cache Daily Sprint drills and {ACCENT_METADATA[selectedAccent].label} studio audio in
                IndexedDB for zero-signal mobile commuting.
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            data-testid="download-offline-pack-btn"
            disabled={isCachingPack}
            onClick={handleDownloadOfflinePack}
            className="min-h-[38px] px-3.5 py-2 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] hover:bg-[#D3DDDA] dark:hover:bg-[#17302C] border border-[#D3DDDA] dark:border-[#1F8A70]/35 text-[#0F4C45] dark:text-[#6EE7B7] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 transition"
          >
            {isCachingPack ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>
                  Caching {cacheProgress.done}/{cacheProgress.total}...
                </span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-[#F4A62A]" />
                <span>{packStatus.isReady ? 'Refresh Offline Pack' : 'Cache Offline Pack'}</span>
              </>
            )}
          </button>

          {packStatus.isReady && (
            <button
              type="button"
              onClick={handleClearOfflinePack}
              title="Clear offline study cache"
              className="min-h-[38px] px-2.5 py-2 rounded-xl border border-[#D3DDDA] dark:border-[#1F8A70]/25 text-[#566664] hover:text-rose-600 dark:hover:text-rose-400 text-xs inline-flex items-center gap-1 cursor-pointer transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <PWAInstallButton variant="drawer" />
        </div>
      </div>

      {typeof navigator !== 'undefined' && !navigator.onLine && (
        <div className="flex items-center gap-2 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline mode active — cached drills and audio clips remain available.</span>
        </div>
      )}
    </section>
  );
};
