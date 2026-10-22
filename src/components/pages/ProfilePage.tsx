import React, { useState } from 'react';
import {
  User,
  Settings,
  Award,
  Volume2,
  Globe,
  Bell,
  Sliders,
  Download,
  Archive,
  History,
  ShieldCheck,
  LogOut,
  LogIn,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Edit3,
  Save,
  Key,
  Calendar,
  Layers,
  BookOpen,
  RefreshCw,
  UserPlus,
  Trash2,
  Check,
  Crown
} from 'lucide-react';
import { UserProfile } from '../../types';
import {
  updateCurrentUserProfile,
  logoutUser,
  getAllUsers,
  switchActiveUser,
  saveUser,
  exportAllUserData
} from '../../utils/userStorage';
import { speakBritish, stopSpeech } from '../../utils/britishVoice';
import {
  getPreferredVoiceGender,
  setPreferredVoiceGender,
  getPreferredAccent,
  setPreferredAccent,
  OfficialIELTSAccent,
  IELTS_ACCENTS,
  ACCENT_METADATA
} from '../../config/voiceConfig';
import { soundManager } from '../../utils/audioEffects';
import { downloadStandaloneHtml } from '../../utils/exportSingleFileHtml';
import { logoutCandidate } from '../../services/authService';

interface ProfilePageProps {
  user?: UserProfile | null;
  mistakeCount: number;
  onOpenAuthModal: () => void;
  onOpenBandModal: () => void;
  onOpenVault: () => void;
  onNavigate: (page: string) => void;
  onShowToast: (msg: string) => void;
  onLogout?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  mistakeCount,
  onOpenAuthModal,
  onOpenBandModal,
  onOpenVault,
  onNavigate,
  onShowToast,
  onLogout
}) => {
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const effectiveUser: UserProfile = user || {
    id: 'guest_candidate',
    name: 'Candidate',
    email: 'guest@ieltssprint.com',
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

  // Edit fields
  const [editName, setEditName] = useState(safeName);
  const [editEmail, setEditEmail] = useState(safeEmail);
  const [editTargetBand, setEditTargetBand] = useState<number>(safeTargetBand);
  const [editFormat, setEditFormat] = useState<'Academic' | 'General Training'>(safeFormat);
  const [editCountry, setEditCountry] = useState(safeCountry);
  const [editExamDate, setEditExamDate] = useState(safeExamDate);
  const [newPassword, setNewPassword] = useState('');

  const allRegisteredUsers = getAllUsers();
  const [voiceGender, setVoiceGender] = useState<'male' | 'female'>(() => getPreferredVoiceGender());
  const [activeVoicePlaying, setActiveVoicePlaying] = useState<'male' | 'female' | null>(null);

  const handleSelectVoiceGender = (gender: 'male' | 'female') => {
    setVoiceGender(gender);
    setPreferredVoiceGender(gender);
    onShowToast(`Default examiner voice set to British ${gender === 'female' ? 'Female (Charlotte)' : 'Male (Arthur)'}.`);
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
        "Good afternoon. I am Charlotte, your official Cambridge IELTS examiner. Natural British Received Pronunciation is active with zero robotic distortion.",
        {
          speakerId: 'speaker_05',
          gender: 'female',
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
        "Good afternoon. I am Arthur, your Cambridge IELTS speaking examiner. Natural British English audio is active, featuring authentic Cambridge examination pacing.",
        {
          speakerId: 'speaker_04',
          gender: 'male',
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
  const [activeAccentPlaying, setActiveAccentPlaying] = useState<string | null>(null);

  const handleSelectAccent = (accent: OfficialIELTSAccent) => {
    setPreferredAccentState(accent);
    setPreferredAccent(accent);
    onShowToast(`Listening & practice accent set to ${accent} native English.`);
  };

  const handleTestAccent = (accent: OfficialIELTSAccent) => {
    if (activeAccentPlaying === accent) {
      stopSpeech();
      setActiveAccentPlaying(null);
      return;
    }
    stopSpeech();
    setActiveAccentPlaying(accent);
    const meta = ACCENT_METADATA[accent];
    const isFemale = voiceGender === 'female';
    const speakerLabel = isFemale ? meta.femaleSpeaker : meta.maleSpeaker;
    speakBritish(
      `Welcome to IELTS Sprint Listening Practice. You are listening to our authentic ${meta.label} native human voice test stream, spoken by ${speakerLabel}.`,
      {
        accent,
        gender: voiceGender,
        onEnd: () => setActiveAccentPlaying(null),
        onError: () => setActiveAccentPlaying(null)
      }
    );
  };

  const handleTestBarnabyCuteVoice = () => {
    if (activeAccentPlaying === 'barnaby') {
      stopSpeech();
      setActiveAccentPlaying(null);
      return;
    }
    stopSpeech();
    setActiveAccentPlaying('barnaby');
    speakBritish(
      "Hello there! I am Barnaby, your cute Cambridge AI study buddy! Ready to achieve Band 8.5 today? Let's practice together!",
      {
        speakerId: 'speaker_barnaby',
        gender: 'female',
        rate: 1.02,
        onEnd: () => setActiveAccentPlaying(null),
        onError: () => setActiveAccentPlaying(null)
      }
    );
  };

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
      onShowToast('Profile information successfully saved to local memory!');
    }
  };

  const handlePerformLogout = async () => {
    soundManager.playBeep(600, 0.04);
    await logoutCandidate();
    logoutUser();
    onShowToast('You have been logged out successfully. Sign in anytime to resume your progress.');
    if (onLogout) {
      onLogout();
    }
  };

  const handleSwitchToAccount = (userId: string) => {
    const switched = switchActiveUser(userId);
    if (switched) {
      soundManager.playSuccess();
      onShowToast(`Switched active profile to ${switched.name}`);
      setEditName(switched.name);
      setEditEmail(switched.email);
      setEditTargetBand(switched.progress.targetBand || 7.5);
      setEditFormat(switched.progress.intendedFormat || 'Academic');
      setEditCountry(switched.progress.targetCountry || 'Canada / UK / Australia');
      setEditExamDate(switched.progress.examDate || '');
    }
  };

  const latestExam =
    effectiveUser.progress.examHistory && effectiveUser.progress.examHistory.length > 0
      ? effectiveUser.progress.examHistory[0]
      : null;

  if (!user) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in pb-20">
        {/* Signed Out Authentication Banner */}
        <div className="bg-white dark:bg-[#101B32] rounded-3xl border border-slate-200/90 dark:border-slate-800 p-8 sm:p-10 shadow-md text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 flex items-center justify-center shadow-inner">
            <User className="w-10 h-10" />
          </div>
          <div className="space-y-2 max-w-lg mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-bold font-mono border border-amber-200 dark:border-amber-800">
              <span>Signed Out — Active Candidate Gateway</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Sign In or Register New Account
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Access your personalized IELTS band score targets, live exam attempt history, mistake vault, and study progress across sessions. All Cambridge practice materials remain fully open.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenAuthModal}
              className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition shadow-md cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In / Log In</span>
            </button>
            <button
              onClick={onOpenAuthModal}
              className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition shadow-md cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Candidate Profile</span>
            </button>
          </div>
        </div>

        {/* Global Settings & Examiner Voices (Accessible without login) */}
        <div className="bg-white dark:bg-[#101B32] rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Official Cambridge Examiner Voice & Accents</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Configure native British English pronunciation for speaking tests and listening labs</p>
              </div>
            </div>
          </div>

          {/* Voice Gender Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Examiner Gender & Voice Profile
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSelectVoiceGender('female')}
                className={`p-4 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                  voiceGender === 'female'
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'
                }`}
              >
                <div>
                  <div className="font-bold text-sm">Charlotte (British Female)</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Formal Cambridge Received Pronunciation</div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTestVoice('female');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-50 transition"
                >
                  {activeVoicePlaying === 'female' ? '⏹ Stop' : '🔊 Test'}
                </button>
              </button>

              <button
                type="button"
                onClick={() => handleSelectVoiceGender('male')}
                className={`p-4 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                  voiceGender === 'male'
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'
                }`}
              >
                <div>
                  <div className="font-bold text-sm">Arthur (British Male)</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Authoritative Cambridge Examiner Pacing</div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTestVoice('male');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-50 transition"
                >
                  {activeVoicePlaying === 'male' ? '⏹ Stop' : '🔊 Test'}
                </button>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in pb-20">
      {/* User Header Profile Card */}
      <div className="bg-white dark:bg-[#101B32] rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left w-full">
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-lg border-4 border-white dark:border-slate-800 ring-4 ring-indigo-50 dark:ring-indigo-950/40">
              {effectiveUser.name ? effectiveUser.name.slice(0, 2).toUpperCase() : 'ST'}
            </div>
            <span className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 rounded-full text-white ring-2 ring-white dark:ring-slate-900">
              <Check className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {effectiveUser.name || 'Candidate Student'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold border bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                Registered & Logged In
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{effectiveUser.email || 'student@ieltssprint.com'}</p>
            <div className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-medium text-[11px]">
                Format: <strong>{effectiveUser.progress.intendedFormat || 'Academic'}</strong>
              </span>
              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-medium text-[11px]">
                Destination: <strong>{effectiveUser.progress.targetCountry || 'Canada / UK'}</strong>
              </span>
              {effectiveUser.progress.examDate && (
                <span className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md font-medium text-[11px] border border-blue-200 dark:border-blue-800">
                  Exam: {effectiveUser.progress.examDate}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Scores & Action */}
        <div className="flex items-center gap-2.5 sm:gap-3 w-full md:w-auto justify-center">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-center min-w-[75px] sm:min-w-[85px]">
            <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">Streak</div>
            <div className="text-xl sm:text-2xl font-black text-amber-600 font-mono">
              {effectiveUser.progress.streakDays || 1} 🔥
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-center min-w-[75px] sm:min-w-[85px]">
            <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">Target</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
              {effectiveUser.progress.targetBand ? effectiveUser.progress.targetBand.toFixed(1) : '7.5'}
            </div>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-4 py-3 rounded-2xl border font-bold text-xs flex items-center gap-1.5 transition ${
              isEditing
                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
            }`}
            title="Edit Profile"
          >
            <Edit3 className="w-4 h-4" />
            <span className="hidden sm:inline">{isEditing ? 'Close' : 'Edit'}</span>
          </button>

          <button
            onClick={handlePerformLogout}
            className="p-3 rounded-2xl border border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Edit Profile Form Panel */}
      {isEditing && (
        <div className="bg-white rounded-3xl border-2 border-blue-200 p-6 sm:p-8 shadow-md space-y-5 animate-slide-down">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Edit3 className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Edit Candidate Profile & Preferences</h2>
            </div>
            <span className="text-xs text-slate-400">Stored in browser memory</span>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Band Score</label>
                <select
                  value={editTargetBand}
                  onChange={e => setEditTargetBand(parseFloat(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                >
                  <option value={6.5}>Band 6.5 (Competent User)</option>
                  <option value={7.0}>Band 7.0 (Good User)</option>
                  <option value={7.5}>Band 7.5 (High Achiever)</option>
                  <option value={8.0}>Band 8.0 (Very Good User)</option>
                  <option value={8.5}>Band 8.5 (Expert User)</option>
                  <option value={9.0}>Band 9.0 (Cambridge Native Master)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Exam Format</label>
                <select
                  value={editFormat}
                  onChange={e => setEditFormat(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Academic">Academic (University / Professional)</option>
                  <option value="General Training">General Training (Migration / Work)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Destination</label>
                <input
                  type="text"
                  value={editCountry}
                  onChange={e => setEditCountry(e.target.value)}
                  placeholder="e.g. Canada, UK, Australia"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Planned Exam Date</label>
                <input
                  type="date"
                  value={editExamDate}
                  onChange={e => setEditExamDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Change Password (optional)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep unchanged"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition"
              >
                <Save className="w-4 h-4" />
                <span>Save Profile Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}


      {/* Quick Action Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          onClick={onOpenVault}
          className="p-4 rounded-2xl bg-white dark:bg-[#101B32] border border-slate-200/90 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 shadow-2xs cursor-pointer transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center justify-center">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-800 dark:group-hover:text-amber-300 transition">
                Mistake Vault
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{mistakeCount} Saved Traps</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        <div
          onClick={() => onNavigate('mocktest')}
          className="p-4 rounded-2xl bg-white dark:bg-[#101B32] border border-slate-200/90 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 shadow-2xs cursor-pointer transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-800 dark:group-hover:text-indigo-300 transition">
                Test History
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                {effectiveUser.progress.examHistory?.length || 0} Simulations
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        <div
          onClick={() => onNavigate('c1idioms')}
          className="p-4 rounded-2xl bg-white dark:bg-[#101B32] border border-slate-200/90 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-500 shadow-2xs cursor-pointer transition flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-800 dark:group-hover:text-purple-300 transition">
                200 C1 Idioms & Phrases
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Full Bangla + Audio</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* Switch Between Saved Candidates on this device */}
      {allRegisteredUsers.length > 1 && (
        <div className="bg-white dark:bg-[#101B32] rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white font-mono uppercase tracking-wider">
                Switch Candidate Profile ({allRegisteredUsers.length} Saved in Memory)
              </h2>
            </div>
            <button
              onClick={onOpenAuthModal}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add New Candidate</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {allRegisteredUsers.map(u => (
              <div
                key={u.id}
                onClick={() => handleSwitchToAccount(u.id)}
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                  u.id === effectiveUser.id
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 ring-2 ring-blue-100 dark:ring-blue-900/30'
                    : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 dark:bg-slate-700 text-white font-bold text-xs flex items-center justify-center">
                    {u.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{u.name}</span>
                      {u.id === effectiveUser.id && (
                        <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.2 rounded font-mono">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{u.email}</div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    Target {u.progress.targetBand || 7.5}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* App Settings & Utilities */}
      <div className="bg-white dark:bg-[#101B32] rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white font-mono uppercase tracking-wider">
          Application Preferences & Utilities
        </h2>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {/* British Voice Selector & Test */}
          <div className="py-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 flex items-center justify-center shrink-0">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Cambridge British Voice Engine</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                      Zero Robotic Sound
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Official UK Received Pronunciation (en-GB) calibrated to natural human pitch (1.0)
                  </div>
                </div>
              </div>

              {/* Voice Gender Switcher */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl self-start sm:self-auto border border-slate-200 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => handleSelectVoiceGender('male')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    voiceGender === 'male'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  Arthur (Male)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectVoiceGender('female')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    voiceGender === 'female'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  Charlotte (Female)
                </button>
              </div>
            </div>

            {/* Quick Test Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1 pl-12">
              <button
                type="button"
                onClick={() => handleTestVoice('male')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                  activeVoicePlaying === 'male'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>{activeVoicePlaying === 'male' ? 'Playing Arthur...' : 'Test Arthur (UK Male) 🔊'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleTestVoice('female')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                  activeVoicePlaying === 'female'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>{activeVoicePlaying === 'female' ? 'Playing Charlotte...' : 'Test Charlotte (UK Female) 🔊'}</span>
              </button>

              <button
                type="button"
                onClick={handleTestBarnabyCuteVoice}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                  activeAccentPlaying === 'barnaby'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800'
                }`}
                title="Barnaby uses a cheerful, high-clarity cute British voice specially tuned for motivating Cambridge study sessions"
              >
                <span>{activeAccentPlaying === 'barnaby' ? 'Speaking Cute Barnaby...' : '✨ Test Cute AI Tutor (Barnaby) 🔊'}</span>
              </button>
            </div>

            {/* Multiple IELTS Accents Option */}
            <div className="pt-4 pl-12 space-y-2 border-t border-slate-100 dark:border-slate-800/80 mt-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Active Native English Accent</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Official Cambridge listening audio utilizes authentic international English native accents</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {preferredAccent}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {IELTS_ACCENTS.map((accent) => {
                  const meta = ACCENT_METADATA[accent];
                  const isSelected = preferredAccent === accent;
                  const isAuditioning = activeAccentPlaying === accent;

                  return (
                    <div
                      key={accent}
                      onClick={() => handleSelectAccent(accent)}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition flex flex-col justify-between ${
                        isSelected
                          ? 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-500 shadow-2xs'
                          : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">{meta.flag}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTestAccent(accent);
                          }}
                          className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold transition flex items-center gap-1 ${
                            isAuditioning
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                          title={`Listen to sample in ${meta.label} accent`}
                        >
                          {isAuditioning ? 'Playing...' : 'Audition 🔊'}
                        </button>
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{meta.label}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {voiceGender === 'female' ? meta.femaleSpeaker : meta.maleSpeaker}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Band Calculator & OSR */}
          <div className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Band Calculator & OSR Simulator</div>
                <div className="text-[11px] text-slate-500">Calculate IELTS average & One Skill Retake</div>
              </div>
            </div>

            <button
              onClick={onOpenBandModal}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition"
            >
              Open Tool →
            </button>
          </div>

          {/* Standalone HTML Export */}
          <div className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-amber-300 flex items-center justify-center">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Offline Single-File HTML Export</div>
                <div className="text-[11px] text-slate-500">Export complete app for offline mobile study</div>
              </div>
            </div>

            <button
              onClick={() => {
                downloadStandaloneHtml();
                onShowToast('Exporting standalone offline edition...');
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition"
            >
              Export HTML ↓
            </button>
          </div>

          {/* Log Out Button */}
          <div className="py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center">
                <LogOut className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-rose-900">Log Out of IELTS Sprint</div>
                <div className="text-[11px] text-slate-500">
                  Locks portal access. You can sign back in anytime with your password.
                </div>
              </div>
            </div>

            <button
              onClick={handlePerformLogout}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition"
            >
              Log Out Now
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
