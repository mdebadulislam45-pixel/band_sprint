import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Settings,
  UserCheck,
  Volume2,
  VolumeX,
  Palette,
  Camera,
  Gauge,
  Sparkles,
  ShieldCheck,
  Zap,
  Globe,
  Sliders
} from 'lucide-react';
import {
  BritishRegionalAccent,
  BRITISH_REGIONAL_ACCENT_LIST,
  BRITISH_REGIONAL_ACCENT_METADATA
} from '../../config/voiceConfig';

interface SpeakingSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCharacter?: 'clara' | 'arthur' | 'barnaby';
  onSwitchToBarnaby?: () => void;
  avatarGender: 'female' | 'male';
  onSwitchGender: (gender: 'female' | 'male') => void;
  regionalAccent: BritishRegionalAccent;
  onSwitchAccent: (accent: BritishRegionalAccent) => void;
  studioTheme: 'navy' | 'slate' | 'daylight';
  onSwitchTheme: (theme: 'navy' | 'slate' | 'daylight') => void;
  onOpenEtiquette?: () => void;
  isExaminerMuted?: boolean;
  onToggleMuteExaminer?: () => void;
  showCameraBooth?: boolean;
  onToggleCameraBooth?: () => void;
  showLiveHud?: boolean;
  onToggleLiveHud?: () => void;
  autoInstantFeedback?: boolean;
  onToggleInstantFeedback?: () => void;
}

/**
 * Accessible Slide-Over Settings Drawer for IELTS Speaking Studio:
 * - Full ARIA dialog semantics (role="dialog", aria-modal="true")
 * - Escape key listener & focus-trap management
 * - British Regional Accent Picker (London RP, Northern, Scottish, Welsh)
 * - Examiner Persona Switcher (Dr. Clara Sterling / Prof. Arthur Pendelton / Barnaby)
 * - Studio Visual Theme Switcher (Navy, Slate, Daylight)
 * - Etiquette Guide & Master Volume Toggles
 */
export const SpeakingSettingsDrawer: React.FC<SpeakingSettingsDrawerProps> = ({
  isOpen,
  onClose,
  selectedCharacter,
  onSwitchToBarnaby,
  avatarGender,
  onSwitchGender,
  regionalAccent,
  onSwitchAccent,
  studioTheme,
  onSwitchTheme,
  onOpenEtiquette,
  isExaminerMuted = false,
  onToggleMuteExaminer,
  showCameraBooth = true,
  onToggleCameraBooth,
  showLiveHud = true,
  onToggleLiveHud,
  autoInstantFeedback = true,
  onToggleInstantFeedback
}) => {
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [masterVolume, setMasterVolume] = useState<number>(100);

  // Focus trap & Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    // Save previous active focus element to restore upon close
    previousFocusRef.current = document.activeElement as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Auto-focus first focusable element inside drawer
    const timer = setTimeout(() => {
      if (drawerRef.current) {
        const firstBtn = drawerRef.current.querySelector<HTMLElement>('button');
        firstBtn?.focus();
      }
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentAccentMeta = BRITISH_REGIONAL_ACCENT_METADATA[regionalAccent];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-drawer-title"
      className="fixed inset-0 z-50 overflow-hidden animate-fade-in select-none"
    >
      {/* Animated semi-transparent backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10" ref={drawerRef}>
        <div className="w-screen max-w-md bg-slate-900 text-white shadow-2xl border-l border-slate-800 flex flex-col justify-between">
          {/* Drawer Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 flex items-center justify-center">
                <Settings className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <h2 id="settings-drawer-title" className="text-base font-bold text-white tracking-tight">
                  Studio Controls & Settings
                </h2>
                <p className="text-[11px] font-mono text-slate-400">Configure examiner persona, accent & theme</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              aria-label="Close settings drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
            {/* 1. Examiner & Companion Persona Selection */}
            <div className="space-y-2.5 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-300 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-indigo-400" />
                  <span>Examiner / Companion</span>
                </span>
                <span className="text-[10px] font-mono text-indigo-300 font-semibold">
                  {selectedCharacter === 'barnaby'
                    ? 'Barnaby · AI Companion'
                    : avatarGender === 'female'
                    ? 'Dr. Clara Sterling'
                    : 'Prof. Arthur Pendelton'}
                </span>
              </div>

              <div
                role="radiogroup"
                aria-label="Select Examiner Persona"
                className={`grid ${onSwitchToBarnaby ? 'grid-cols-3' : 'grid-cols-2'} gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800`}
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedCharacter ? selectedCharacter === 'arthur' : avatarGender === 'male'}
                  onClick={() => onSwitchGender('male')}
                  className={`p-2.5 rounded-lg text-left transition cursor-pointer flex flex-col gap-0.5 ${
                    (selectedCharacter ? selectedCharacter === 'arthur' : avatarGender === 'male')
                      ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <span className="font-bold text-xs text-white">Prof. Arthur</span>
                  <span className="text-[10px] text-slate-300 font-mono">Male Examiner</span>
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedCharacter ? selectedCharacter === 'clara' : avatarGender === 'female'}
                  onClick={() => onSwitchGender('female')}
                  className={`p-2.5 rounded-lg text-left transition cursor-pointer flex flex-col gap-0.5 ${
                    (selectedCharacter ? selectedCharacter === 'clara' : avatarGender === 'female')
                      ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <span className="font-bold text-xs text-white">Dr. Clara</span>
                  <span className="text-[10px] text-slate-300 font-mono">Female Examiner</span>
                </button>

                {onSwitchToBarnaby && (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedCharacter === 'barnaby'}
                    onClick={() => onSwitchToBarnaby()}
                    className={`p-2.5 rounded-lg text-left transition cursor-pointer flex flex-col gap-0.5 ${
                      selectedCharacter === 'barnaby'
                        ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <span className="font-bold text-xs text-white">Barnaby 💬</span>
                    <span className="text-[10px] text-slate-300 font-mono">AI Companion</span>
                  </button>
                )}
              </div>
            </div>

            {/* 2. British Regional Accent Selection (Examiners Only; hidden when Barnaby is active) */}
            <div className="space-y-2.5 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-300 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-sky-400" />
                  <span>British Regional Accent</span>
                </span>
                <span className="text-[10px] font-mono text-sky-300 font-semibold">
                  {selectedCharacter === 'barnaby' ? 'Dedicated Companion Voice' : currentAccentMeta.shortLabel}
                </span>
              </div>

              {selectedCharacter === 'barnaby' ? (
                <div
                  data-testid="drawer-barnaby-voice-lock-notice"
                  className="p-3 rounded-xl bg-blue-950/60 border border-blue-800/70 text-[11px] text-blue-200 leading-relaxed"
                >
                  💬 <strong>Barnaby</strong> uses his own dedicated warm, playful AI companion voice profile (separate from official examiners). Select <strong>Prof. Arthur</strong> or <strong>Dr. Clara</strong> above to practice with regional UK examiner accents.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {BRITISH_REGIONAL_ACCENT_LIST.map((item) => {
                      const isSelected = regionalAccent === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onSwitchAccent(item.id)}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col gap-0.5 ${
                            isSelected
                              ? 'bg-sky-950/80 border-sky-500 text-white shadow-sm ring-1 ring-sky-400'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          <span className="font-bold text-xs text-white">{item.shortLabel}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{item.regionName}</span>
                        </button>
                      );
                    })}
                  </div>
                  {currentAccentMeta.fallbackDisclosure && (
                    <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-700/50 text-[10px] font-mono text-amber-300 leading-snug">
                      {currentAccentMeta.fallbackDisclosure}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 leading-snug">
                    Practice listening to British English examiner voices and regional prosody profiles.
                  </p>
                </>
              )}
            </div>

            {/* 3. Studio Visual Theme Switcher */}
            <div className="space-y-2.5 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-300 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-amber-400" />
                  <span>Studio Visual Theme</span>
                </span>
                <span className="text-[10px] font-mono text-amber-300 font-semibold capitalize">
                  {studioTheme} Studio
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(['navy', 'slate', 'daylight'] as const).map((themeKey) => {
                  const isSelected = studioTheme === themeKey;
                  const labels = {
                    navy: 'Royal Navy',
                    slate: 'Dark Slate',
                    daylight: 'Daylight'
                  };
                  return (
                    <button
                      key={themeKey}
                      type="button"
                      onClick={() => onSwitchTheme(themeKey)}
                      className={`p-2 rounded-xl border text-center font-bold text-[11px] transition cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {labels[themeKey]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Interactive Exam Etiquette & Posture Guide */}
            {onOpenEtiquette && (
              <div className="bg-gradient-to-r from-indigo-950/80 to-slate-900 p-4 rounded-2xl border border-indigo-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-200 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <span>Exam Etiquette & Posture Guide</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenEtiquette();
                    }}
                    className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition cursor-pointer"
                  >
                    Open Guide
                  </button>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  Review eye contact techniques, body posture, and formal speaking protocols recommended by Practice assessors.
                </p>
              </div>
            )}

            {/* 5. Toggles & Session Options */}
            <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <span className="font-mono font-bold text-slate-300 uppercase text-[11px] tracking-wider block mb-1">
                Audio & Interface Toggles
              </span>

              {onToggleMuteExaminer && (
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    {isExaminerMuted ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-sky-400" />
                    )}
                    <div>
                      <div className="font-bold text-white text-xs">Mute Examiner Voice</div>
                      <div className="text-[10px] text-slate-400">Silences examiner audio stream</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleMuteExaminer}
                    className={`w-11 h-6 rounded-full transition-colors p-0.5 relative cursor-pointer ${
                      isExaminerMuted ? 'bg-rose-600' : 'bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        isExaminerMuted ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )}

              {onToggleCameraBooth && (
                <div className="flex items-center justify-between py-1 border-t border-slate-800/80 pt-2">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-bold text-white text-xs">Candidate Self-View Booth</div>
                      <div className="text-[10px] text-slate-400">Show local video camera preview</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleCameraBooth}
                    className={`w-11 h-6 rounded-full transition-colors p-0.5 relative cursor-pointer ${
                      showCameraBooth ? 'bg-emerald-600' : 'bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        showCameraBooth ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )}

              {onToggleLiveHud && (
                <div className="flex items-center justify-between py-1 border-t border-slate-800/80 pt-2">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-sky-400" />
                    <div>
                      <div className="font-bold text-white text-xs">Live Telemetry HUD</div>
                      <div className="text-[10px] text-slate-400">Show WPM & real-time telemetry</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleLiveHud}
                    className={`w-11 h-6 rounded-full transition-colors p-0.5 relative cursor-pointer ${
                      showLiveHud ? 'bg-sky-600' : 'bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        showLiveHud ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )}

              {onToggleInstantFeedback && (
                <div className="flex items-center justify-between py-1 border-t border-slate-800/80 pt-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <div>
                      <div className="font-bold text-white text-xs">Instant Band 8+ Coach</div>
                      <div className="text-[10px] text-slate-400">Show diagnostic card after turns</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleInstantFeedback}
                    className={`w-11 h-6 rounded-full transition-colors p-0.5 relative cursor-pointer ${
                      autoInstantFeedback ? 'bg-amber-500' : 'bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        autoInstantFeedback ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-500">BandSprint · Speaking Studio</span>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer"
            >
              Done & Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
