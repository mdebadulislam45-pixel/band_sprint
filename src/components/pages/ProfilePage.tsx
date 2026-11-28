import React, { useState } from 'react';
import {
  User,
  Settings,
  Crown,
  HelpCircle,
  Volume2,
  Globe,
  Bell,
  Sliders,
  Download,
  ShieldCheck,
  LogOut,
  LogIn,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Edit3,
  Save,
  Calendar,
  Layers,
  BookOpen,
  UserPlus,
  Trash2,
  Check,
  LucideIcon
} from 'lucide-react';
import { UserProfile } from '../../types';
import {
  updateCurrentUserProfile,
  logoutUser,
  getAllUsers,
  switchActiveUser,
  exportAllUserData
} from '../../utils/userStorage';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import {
  getPreferredVoiceGender,
  setPreferredVoiceGender,
  getPreferredAccent,
  setPreferredAccent,
  OfficialIELTSAccent,
  ACCENT_METADATA
} from '../../config/voiceConfig';
import { soundManager } from '../../utils/audioEffects';
import { logoutCandidate } from '../../services/authService';
import { firebaseSyncService } from '../../services/firebaseSyncService';
import { AccentAuditionModal } from '../audio/AccentAuditionModal';
import { CommercialShowcaseModal } from '../commercial/CommercialShowcaseModal';
import { TermsAndPrivacyModal } from '../commercial/TermsAndPrivacyModal';
import { ContactSupportModal } from '../commercial/ContactSupportModal';
import { getBarnabyVisibility, setBarnabyVisibility } from '../../utils/barnabyStateEngine';
import type { BarnabyVisibilitySetting } from '../../types/barnaby';
import { BarnabyCrest } from '../common/BarnabyCrest';
import {
  BandSprintAchievementsPanel,
  PinnedBadgesStrip
} from '../profile/BandSprintAchievementsPanel';
import { AccentAndVoiceStudioPanel } from '../profile/AccentAndVoiceStudioPanel';
import { DailyReminderSettingsPanel } from '../reminders/DailyReminderSettingsPanel';

interface ProfilePageProps {
  user?: UserProfile | null;
  mistakeCount?: number;
  onOpenAuthModal?: () => void;
  onOpenBandModal?: () => void;
  onOpenVault?: () => void;
  onNavigate: (path: string) => void;
  onShowToast: (msg: string) => void;
  onLogout?: () => void;
  subpage?: 'details' | 'settings' | 'subscription' | 'help';
}

interface ProfileHubItem {
  id: string;
  path: string;
  title: string;
  shortName: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
  color: string;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  mistakeCount = 0,
  onOpenAuthModal,
  onOpenBandModal,
  onNavigate,
  onShowToast,
  onLogout,
  subpage
}) => {
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAccentModalOpen, setIsAccentModalOpen] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalTab, setLegalTab] = useState<'terms' | 'privacy'>('terms');
  const [showContactModal, setShowContactModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  const effectiveUser: UserProfile = user || {
    id: 'guest_candidate',
    name: 'Candidate',
    email: 'guest@bandsprint.app',
    createdAt: Date.now(),
    progress: {
      completedModules: ['beginner'],
      targetBand: 7.5,
      targetCountry: 'Canada / UK / Australia',
      intendedFormat: 'Academic',
      examHistory: [],
      streakDays: 1,
      lastActiveDate: new Date().toISOString().split('T')[0],
      wordsWrittenTotal: 0
    }
  };

  const safeName = effectiveUser.name;
  const safeEmail = effectiveUser.email;
  const safeTargetBand = effectiveUser.progress.targetBand || 7.5;
  const safeFormat = effectiveUser.progress.intendedFormat || 'Academic';
  const safeCountry = effectiveUser.progress.targetCountry || 'Canada / UK / Australia';
  const safeExamDate = effectiveUser.progress.examDate || '';

  const [editName, setEditName] = useState(safeName);
  const [editEmail, setEditEmail] = useState(safeEmail);
  const [editTargetBand, setEditTargetBand] = useState<number>(safeTargetBand);
  const [editFormat, setEditFormat] = useState<'Academic' | 'General Training'>(safeFormat);
  const [editCountry, setEditCountry] = useState(safeCountry);
  const [editExamDate, setEditExamDate] = useState(safeExamDate);
  const [newPassword, setNewPassword] = useState('');

  const [voiceGender, setVoiceGender] = useState<'male' | 'female'>(() => getPreferredVoiceGender());
  const [activeVoicePlaying, setActiveVoicePlaying] = useState<'male' | 'female' | null>(null);
  const [barnabyVisibility, setBarnabyVisibilityState] = useState<BarnabyVisibilitySetting>(() =>
    getBarnabyVisibility()
  );

  const handleSelectBarnabyVisibility = (setting: BarnabyVisibilitySetting) => {
    setBarnabyVisibilityState(setting);
    setBarnabyVisibility(setting);
    soundManager.playBeep(560, 0.035);
    const label =
      setting === 'ambient_and_tutor'
        ? 'Ambient & Tutor'
        : setting === 'minimal_badge'
        ? 'Minimal Badge'
        : 'Hidden / Focus Only';
    onShowToast(`Barnaby Companion visibility set to ${label}.`);
  };

  const handleSelectVoiceGender = (gender: 'male' | 'female') => {
    setVoiceGender(gender);
    setPreferredVoiceGender(gender);
    onShowToast(`Default examiner voice set to British ${gender === 'female' ? 'Female (Dr. Clara Sterling)' : 'Male (Arthur Davies)'}.`);
  };

  const handleTestVoice = (overrideGender?: 'male' | 'female') => {
    const targetGender = overrideGender || voiceGender;
    if (activeVoicePlaying === targetGender) {
      stopSpeech();
      setActiveVoicePlaying(null);
      setIsPlayingVoice(false);
      return;
    }
    stopSpeech();
    setActiveVoicePlaying(targetGender);
    setIsPlayingVoice(true);

    if (targetGender === 'female') {
      speakBritish(
        "Good afternoon. I am Dr. Clara Sterling, your IELTS speaking examiner. Natural British Received Pronunciation is active with clear acoustic delivery.",
        {
          speakerId: 'speaker_05',
          gender: 'female',
          deliveryProfile: 'natural_conversation',
          onEnd: () => {
            setActiveVoicePlaying(null);
            setIsPlayingVoice(false);
          },
          onError: () => {
            setActiveVoicePlaying(null);
            setIsPlayingVoice(false);
          }
        }
      );
    } else {
      speakBritish(
        "Good afternoon. I am Arthur Davies, your AI IELTS speaking examiner. Natural British Received Pronunciation is active.",
        {
          speakerId: 'speaker_04',
          gender: 'male',
          deliveryProfile: 'natural_conversation',
          onEnd: () => {
            setActiveVoicePlaying(null);
            setIsPlayingVoice(false);
          },
          onError: () => {
            setActiveVoicePlaying(null);
            setIsPlayingVoice(false);
          }
        }
      );
    }
  };

  const [preferredAccent, setPreferredAccentState] = useState<OfficialIELTSAccent>(() => getPreferredAccent());

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      onShowToast('Candidate name cannot be empty.');
      return;
    }

    const updated = updateCurrentUserProfile({
      name: editName.trim(),
      email: editEmail.trim(),
      targetBand: editTargetBand,
      intendedFormat: editFormat,
      targetCountry: editCountry.trim(),
      examDate: editExamDate || undefined,
      password: newPassword.trim() ? newPassword.trim() : undefined
    });

    if (updated) {
      soundManager.playSuccess();
      setIsEditing(false);
      setNewPassword('');
      onShowToast('Profile information successfully saved!');
    }
  };

  const handlePerformLogout = async () => {
    soundManager.playBeep(600, 0.04);
    try {
      await firebaseSyncService.signOut();
    } catch {}
    await logoutCandidate();
    logoutUser();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sign_out_candidate'));
    }
    onShowToast('You have been logged out successfully.');
    if (onLogout) {
      onLogout();
    }
  };

  // If on `/profile` hub root, show grid of Hub Cards
  if (!subpage) {
    const hubItems: ProfileHubItem[] = [
      {
        id: 'details',
        path: '/profile/details',
        title: 'Candidate Profile',
        shortName: 'Profile',
        description: 'Target Band, exam date countdown, format track & personal details.',
        icon: User,
        badge: `Band ${safeTargetBand.toFixed(1)}`,
        color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
      },
      {
        id: 'settings',
        path: '/profile/settings',
        title: 'App, Voice & Daily Reminders',
        shortName: 'Settings',
        description: 'Recurring streak reminders, examiner accents, deep elder voices & Barnaby settings.',
        icon: Settings,
        badge: 'Voice & Alerts',
        color: 'bg-[#F59E0B]/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
      },
      {
        id: 'subscription',
        path: '/profile/subscription',
        title: 'Subscription & Billing',
        shortName: 'Subscription',
        description: 'Manage Sprint Premium plan, redeem promo codes & view active entitlements.',
        icon: Crown,
        badge: 'Sprint Premium',
        color: 'bg-[#F59E0B]/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
      },
      {
        id: 'help',
        path: '/profile/help',
        title: 'Help & Support',
        shortName: 'Help',
        description: 'Contact Practice support, read Terms of Service & Privacy Policy.',
        icon: HelpCircle,
        badge: 'Support',
        color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
      }
    ];

    return (
      <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in pb-16">
        {/* Unified BandSprint Pine Header */}
        <section className="p-5 sm:p-7 rounded-2xl bg-[#0F4C45] text-white border border-[#0B3833] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#F4A62A] font-semibold">
              Candidate Account · {safeFormat} Track
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {safeName}
            </h1>
            <p className="text-xs sm:text-sm text-[#EEF3F1]/80 leading-relaxed">
              {safeEmail} · Target Band {safeTargetBand.toFixed(1)}
            </p>
            <PinnedBadgesStrip user={effectiveUser} mistakeCount={mistakeCount} />
          </div>

          {user && user.id !== 'guest_candidate' && (
            <button
              type="button"
              onClick={handlePerformLogout}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-xs transition inline-flex items-center justify-center gap-2 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <LogOut className="w-4 h-4 text-[#F4A62A]" />
              <span>Sign Out</span>
            </button>
          )}
        </section>

        {/* BandSprint Achievements & Unlockable Badges */}
        <BandSprintAchievementsPanel
          user={effectiveUser}
          mistakeCount={mistakeCount}
          onShowToast={onShowToast}
          onNavigate={onNavigate}
        />

        {/* Recurring Daily BandSprint Browser Notifications */}
        <DailyReminderSettingsPanel
          onShowToast={onShowToast}
          onNavigate={onNavigate}
          targetBand={safeTargetBand}
        />

        {/* Multi-Accent & Professional Studio Audio + Offline PWA Study Pack */}
        <AccentAndVoiceStudioPanel onShowToast={onShowToast} />

        {/* Grid of Clean BandSprint Hub Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {hubItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  soundManager.playBeep(600, 0.035);
                  onNavigate(item.path);
                }}
                className="p-5 rounded-2xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1F8A70]/30 hover:border-[#0F4C45] dark:hover:border-[#F4A62A]/70 transition text-left flex flex-col justify-between space-y-4 group cursor-pointer min-h-[144px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F4C45]"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="w-10 h-10 rounded-xl bg-[#EEF3F1] dark:bg-[#0B1514] border border-[#D3DDDA] dark:border-[#1F8A70]/30 flex items-center justify-center text-[#0F4C45] dark:text-[#F4A62A]">
                      <Icon className="w-5 h-5" />
                    </div>
                    {item.badge && (
                      <span className="text-[11px] font-mono font-semibold text-[#566664] dark:text-slate-400">
                        {item.badge}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h2 className="font-display text-base font-bold text-[#0E1F1E] dark:text-white group-hover:text-[#0F4C45] dark:group-hover:text-[#F4A62A] transition">
                      {item.title}
                    </h2>
                    <p className="text-xs text-[#566664] dark:text-slate-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="text-xs font-semibold text-[#0F4C45] dark:text-[#F4A62A] flex items-center gap-1">
                  <span>Manage {item.shortName}</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Subpage: Details / Settings / Subscription / Help
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in pb-20 select-none">
      {/* Subpage Header Card */}
      <div className="bg-white dark:bg-[#101B32] rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">

        {subpage === 'details' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Candidate Profile & Target Goals</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Target Band score, test date countdown & intended exam format</p>
                </div>
              </div>
              {onOpenBandModal && (
                <button
                  type="button"
                  onClick={onOpenBandModal}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                >
                  Edit Targets
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <div className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase">Full Name</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{safeName}</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <div className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase">Email Address</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{safeEmail}</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <div className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase">Target Band Score</div>
                <div className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">Band {safeTargetBand.toFixed(1)}</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <div className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase">Exam Track Format</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">IELTS {safeFormat}</div>
              </div>
            </div>
          </div>
        )}

        {subpage === 'settings' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0F4C45]/10 dark:bg-[#1F8A70]/20 text-[#0F4C45] dark:text-[#F4A62A] flex items-center justify-center font-bold">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Examiner Accent, Studio Audio &amp; Companion Settings</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Choose from all 6 IELTS accents, 17 studio neural voices, offline audio packs, and Barnaby visibility</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAccentModalOpen(true)}
                className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white font-bold text-xs transition inline-flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Globe className="w-3.5 h-3.5 text-[#F4A62A]" />
                <span>Full Accent Audition</span>
              </button>
            </div>

            <DailyReminderSettingsPanel
              onShowToast={onShowToast}
              onNavigate={onNavigate}
              targetBand={safeTargetBand}
            />

            <AccentAndVoiceStudioPanel onShowToast={onShowToast} />

            {/* Barnaby Companion Visibility Setting */}
            <div className="pt-5 border-t border-slate-100 dark:border-slate-800 space-y-3" data-testid="barnaby-visibility-settings">
              <div className="flex items-center gap-2.5">
                <BarnabyCrest size={22} variant="badge" />
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Barnaby Companion Visibility
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Choose how Barnaby appears on Home, Learn, and Progress. Active timed exams always hide Barnaby automatically.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(
                  [
                    {
                      id: 'ambient_and_tutor' as BarnabyVisibilitySetting,
                      title: 'Ambient & Tutor',
                      desc: 'Full contextual briefings, floating physics & interactive hints',
                    },
                    {
                      id: 'minimal_badge' as BarnabyVisibilitySetting,
                      title: 'Minimal Badge',
                      desc: 'Compact crest strip with one-tap Ask Barnaby access',
                    },
                    {
                      id: 'hidden_focus_only' as BarnabyVisibilitySetting,
                      title: 'Hidden / Focus Only',
                      desc: 'Hide dashboard companion cards while keeping exam focus clean',
                    },
                  ] as const
                ).map((option) => {
                  const active = barnabyVisibility === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelectBarnabyVisibility(option.id)}
                      aria-pressed={active}
                      className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                        active
                          ? 'border-[#134E41] bg-[#134E41]/5 dark:bg-[#1F8A70]/15 text-[#0E1F1E] dark:text-[#EEF3F1]'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm">{option.title}</span>
                        {active && <Check className="w-4 h-4 text-[#134E41] dark:text-[#6EE7B7] shrink-0" />}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {option.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {subpage === 'subscription' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Sprint Premium Subscription & Billing</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Manage plan tier, bKash & Stripe payment methods, and promo code redemption</p>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 uppercase">Current Active Tier</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">Active</span>
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Sprint Master & Intensive Access</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Unlimited AI speaking evaluations, full mock exam diagnostic scorecards, Band 9 model answers & priority audio synthesis.
              </p>
            </div>
          </div>
        )}

        {subpage === 'help' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Help, Legal & Support Desk</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Contact Practice support, read Terms of Service & Privacy Policy</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setShowContactModal(true)}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 text-left transition cursor-pointer min-h-[44px]"
              >
                <div className="font-bold text-sm text-slate-900 dark:text-white">Contact Support</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Submit feedback or inquiry</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLegalTab('terms');
                  setShowLegalModal(true);
                }}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 text-left transition cursor-pointer min-h-[44px]"
              >
                <div className="font-bold text-sm text-slate-900 dark:text-white">Terms of Service</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Read candidate agreement</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLegalTab('privacy');
                  setShowLegalModal(true);
                }}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 text-left transition cursor-pointer min-h-[44px]"
              >
                <div className="font-bold text-sm text-slate-900 dark:text-white">Privacy Policy</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Data protection & security</div>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Commercial & Legal Modals */}
      <TermsAndPrivacyModal
        isOpen={showLegalModal}
        initialTab={legalTab}
        onClose={() => setShowLegalModal(false)}
      />

      <ContactSupportModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        onShowToast={onShowToast}
      />

      <CommercialShowcaseModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        onNavigateToPractice={() => onNavigate('/practice')}
      />

      <AccentAuditionModal
        isOpen={isAccentModalOpen}
        onClose={() => setIsAccentModalOpen(false)}
        onShowToast={onShowToast}
      />
    </div>
  );
};
