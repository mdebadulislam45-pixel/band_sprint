import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Apple, MessageCircle, Volume2, VolumeX } from 'lucide-react';
import {
  BARNABY_CORE_PHILOSOPHY,
  BARNABY_STATE_EVENT,
  BarnabyCompanionState,
  StudentContextSnapshot,
  feedBarnabyWordTreat,
  generateContextAwareCoachTip,
  getBondStage,
  getStudentContextSnapshot,
  loadBarnabyState,
  petBarnaby
} from '../../services/barnabyCompanionStore';
import {
  BARNABY_STATE_META,
  BarnabyDragonAvatar,
  mapBarnabyMoodToAvatarState
} from '../common/BarnabyDragonAvatar';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';

interface DashboardBarnabyCompanionProps {
  onNavigate: (path: string) => void;
  onShowToast: (msg: string) => void;
}

const DEFAULT_FALLBACK_STATE: BarnabyCompanionState = {
  mood: 'happy',
  activityText: 'Ready to help you sharpen your Band Sprint.',
  bondXp: 10,
  petsCount: 0,
  treatsFed: 0,
  quizzesSolved: 0,
  freeRoam: true,
  lastInteractionAt: 0,
  messages: []
};

const SSR_FALLBACK_CTX: StudentContextSnapshot = {
  userId: null,
  userName: 'Candidate',
  targetBand: 7.5,
  examMode: 'Academic',
  daysUntilExam: null,
  latestVerifiedOverallBand: null,
  completedFullMockCount: 0,
  evaluatedAttemptCount: 0,
  practiceAttemptCount: 0,
  skillBands: { listening: null, reading: null, writing: null, speaking: null },
  diagnosticEstimate: null,
  weakestSkill: null,
  weakestSkillSource: 'none',
  mistakeCount: 0,
  topMistake: '',
  recurringMistakePattern: null,
  currentActivity: 'Dashboard Overview',
  currentPage: '/'
};

export const DashboardBarnabyCompanion: React.FC<DashboardBarnabyCompanionProps> = ({
  onNavigate,
  onShowToast
}) => {
  const [state, setState] = useState<BarnabyCompanionState>(() =>
    typeof window !== 'undefined' ? loadBarnabyState('/') : DEFAULT_FALLBACK_STATE
  );
  const [contextTick, setContextTick] = useState(0);
  const [isAudioSpeaking, setIsAudioSpeaking] = useState(false);
  const [activeTreatNote, setActiveTreatNote] = useState<{
    word: string;
    bangla?: string;
    example: string;
  } | null>(null);
  const [isDocumentHidden, setIsDocumentHidden] = useState<boolean>(() =>
    typeof document !== 'undefined' ? document.hidden : false
  );
  const [isExamPaused, setIsExamPaused] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncBarnaby = (e: Event) => {
      const detail = (e as CustomEvent<BarnabyCompanionState>).detail;
      if (detail) setState(detail);
      else setState(loadBarnabyState('/'));
    };
    const refreshContext = () => {
      setState(loadBarnabyState('/'));
      setContextTick((n) => n + 1);
    };
    const onPause = () => setIsExamPaused(true);
    const onResume = () => setIsExamPaused(false);
    const onVisibility = () => setIsDocumentHidden(document.hidden);

    window.addEventListener(BARNABY_STATE_EVENT, syncBarnaby);
    window.addEventListener('bandsprint_cloud_sync_updated', refreshContext);
    window.addEventListener('bandsprint_diagnostic_saved', refreshContext);
    window.addEventListener('bandsprint_onboarding_survey_saved', refreshContext);
    window.addEventListener('barnaby-float-hide', onPause);
    window.addEventListener('barnaby-float-show', onResume);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener(BARNABY_STATE_EVENT, syncBarnaby);
      window.removeEventListener('bandsprint_cloud_sync_updated', refreshContext);
      window.removeEventListener('bandsprint_diagnostic_saved', refreshContext);
      window.removeEventListener('bandsprint_onboarding_survey_saved', refreshContext);
      window.removeEventListener('barnaby-float-hide', onPause);
      window.removeEventListener('barnaby-float-show', onResume);
      document.removeEventListener('visibilitychange', onVisibility);
      stopSpeech();
    };
  }, []);

  const studentCtx = useMemo<StudentContextSnapshot>(() => {
    void contextTick;
    return typeof window !== 'undefined' ? getStudentContextSnapshot('/') : SSR_FALLBACK_CTX;
  }, [contextTick]);

  const coachTip = useMemo(() => generateContextAwareCoachTip(studentCtx), [studentCtx]);
  const bond = useMemo(() => getBondStage(state.bondXp), [state.bondXp]);

  const avatarState = mapBarnabyMoodToAvatarState(state.mood, {
    isSpeaking: isAudioSpeaking
  });
  const stateMeta = BARNABY_STATE_META[avatarState];

  const handlePet = () => {
    const { state: next, quip } = petBarnaby();
    setState(next);
    soundManager.playSuccess();
    onShowToast(`Barnaby (+5 Bond XP): ${quip}`);
  };

  const handleSpeakBriefing = () => {
    if (isAudioSpeaking) {
      stopSpeech();
      setIsAudioSpeaking(false);
      return;
    }
    const spokenText = activeTreatNote
      ? `Word treat: ${activeTreatNote.word}. ${activeTreatNote.example}`
      : coachTip.text;
    setIsAudioSpeaking(true);
    speakBritish(spokenText, {
      speakerId: 'speaker_barnaby',
      onEnd: () => setIsAudioSpeaking(false),
      onError: () => setIsAudioSpeaking(false)
    });
  };

  const handleWordTreat = () => {
    const { state: next, treat } = feedBarnabyWordTreat();
    setState(next);
    setActiveTreatNote({
      word: treat.word,
      bangla: treat.bengali,
      example: treat.example
    });
    soundManager.playSuccess();
    onShowToast(`Barnaby enjoyed "${treat.word}" (+10 Bond XP)`);
  };

  const handleOpenChatDrawer = () => {
    soundManager.playBeep(560, 0.04);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('barnaby-float-open', { detail: { focusInput: true } }));
    }
  };

  return (
    <section
      data-testid="dashboard-barnaby-section"
      aria-label="Barnaby IELTS Study Companion"
      className="rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 p-4 sm:p-6 overflow-visible"
    >
      <div className="flex flex-col sm:flex-row items-center sm:items-center gap-5 sm:gap-7">
        {/* Left Stage: Unclipped Full-Body 2.5D Dragon Companion */}
        <div className="relative flex flex-col items-center justify-center shrink-0 overflow-visible">
          <button
            type="button"
            onClick={handlePet}
            title="Tap Barnaby to say hello (+5 Bond XP)"
            aria-label={`Barnaby the blue dragon — ${stateMeta.ariaStatus}. Tap to pet.`}
            className="group relative flex items-center justify-center p-2 overflow-visible cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C45] dark:focus-visible:ring-[#F4A62A] transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.98]"
          >
            {/* Soft radial floor spotlight (open & seamless, no inner box frame) */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_54%,rgba(215,238,252,0.72),transparent_70%)] dark:bg-[radial-gradient(circle_at_50%_54%,rgba(31,138,112,0.18),transparent_70%)]"
            />
            <BarnabyDragonAvatar
              variant="full"
              state={avatarState}
              isSpeaking={isAudioSpeaking}
              paused={isDocumentHidden || isExamPaused}
              size="dashboard"
              framed="none"
              className="relative z-10"
              testId="dashboard-barnaby-avatar"
            />
          </button>
        </div>

        {/* Right Mentor Content: Honest Context Briefing + Single-Line Controls */}
        <div className="flex-1 min-w-0 w-full space-y-3 text-center sm:text-left">
          {/* Clean Unboxed Editorial Metadata Header */}
          <div className="flex flex-wrap items-center justify-center sm:justify-between gap-x-4 gap-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-[#566664] dark:text-[#9AAEA9]">
              <span className="font-display text-base font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                Barnaby
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-[#0F4C45] dark:text-[#F4A62A]">
                Lv.{bond.level} {bond.title}
              </span>
              <span aria-hidden="true">·</span>
              <span>{stateMeta.label}</span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-[#566664] dark:text-[#9AAEA9]">
              <span>Bond XP</span>
              <div className="w-20 h-1.5 rounded-full bg-[#EEF3F1] dark:bg-[#0B1514] overflow-hidden">
                <div
                  className="h-full bg-[#F4A62A] rounded-full transition-all duration-300"
                  style={{ width: `${bond.progressPct}%` }}
                />
              </div>
              <span className="font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">{bond.currentXp}</span>
            </div>
          </div>

          {/* Mentor Guidance / Live Word Treat Note */}
          <div className="space-y-1.5">
            {activeTreatNote ? (
              <div className="space-y-1">
                <p className="text-sm sm:text-[15px] font-medium text-[#0E1F1E] dark:text-[#EEF3F1] leading-relaxed">
                  Word Treat — <span className="font-bold text-[#0F4C45] dark:text-[#F4A62A]">{activeTreatNote.word}</span>: {activeTreatNote.example}
                </p>
                {activeTreatNote.bangla && (
                  <p className="text-xs font-bengali text-[#0F4C45] dark:text-[#7CD4C4]">
                    {activeTreatNote.bangla}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm sm:text-[15px] text-[#0E1F1E] dark:text-[#EEF3F1] leading-relaxed whitespace-pre-line">
                {coachTip.text.replace(BARNABY_CORE_PHILOSOPHY, '').replace(/["“”\s]+$/, '').trim()}
              </p>
            )}
            <p className="text-xs italic text-[#566664] dark:text-[#9AAEA9]">
              “{BARNABY_CORE_PHILOSOPHY}”
            </p>
          </div>

          {/* Action Strip: Real IELTS Workflow & Companion Controls */}
          <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(520, 0.04);
                onNavigate(coachTip.suggestedAction.route);
              }}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4A62A]"
            >
              <span>{coachTip.suggestedAction.label}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>

            <button
              type="button"
              onClick={handleSpeakBriefing}
              className={`min-h-[44px] px-4 py-2 rounded-xl border text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C45] ${
                isAudioSpeaking
                  ? 'bg-[#F4A62A] text-[#0E1F1E] border-[#F4A62A]'
                  : 'bg-[#F7F9F8] dark:bg-[#0B1514] hover:bg-[#EEF3F1] dark:hover:bg-[#172B29] border-[#D3DDDA] dark:border-[#1E3533] text-[#0E1F1E] dark:text-[#EEF3F1]'
              }`}
            >
              {isAudioSpeaking ? (
                <>
                  <VolumeX className="w-4 h-4 shrink-0" />
                  <span>Stop Voice</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-[#0F4C45] dark:text-[#F4A62A] shrink-0" />
                  <span>Hear Tip</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleWordTreat}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#FEF6E8] dark:bg-[#F4A62A]/15 hover:bg-[#F4A62A]/25 border border-[#F4A62A]/45 text-[#8A5A0A] dark:text-[#F4A62A] text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4A62A]"
            >
              <Apple className="w-4 h-4 shrink-0" />
              <span>Word Treat</span>
            </button>

            <button
              type="button"
              onClick={handleOpenChatDrawer}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#F7F9F8] dark:bg-[#0B1514] hover:bg-[#EEF3F1] dark:hover:bg-[#172B29] border border-[#D3DDDA] dark:border-[#1E3533] text-[#0E1F1E] dark:text-[#EEF3F1] text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C45]"
            >
              <MessageCircle className="w-4 h-4 text-[#0F4C45] dark:text-[#7CD4C4] shrink-0" />
              <span>Chat with Barnaby</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
