import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  LogIn,
  UserPlus,
  Flame,
  Award,
  Target,
  Calendar,
  Globe,
  CheckCircle2,
  Clock,
  Download,
  Upload,
  ArrowRight,
  BookOpen,
  Sparkles,
  LogOut,
  Sliders,
  FileText,
  ShieldCheck,
  Lock,
  Mail,
  Check,
  Loader2
} from 'lucide-react';
import { UserProfile } from '../types';
import {
  getCurrentUser,
  getAllUsers,
  loginUser,
  registerUser,
  switchActiveUser,
  saveUser,
  exportAllUserData,
  importUserData
} from '../utils/userStorage';
import { soundManager } from '../utils/audioEffects';
import { handleGoogleSignInAction } from '../utils/googleAuth';
import { GoogleSignInModal } from './auth/GoogleSignInModal';
import { firebaseSyncService } from '../services/firebaseSyncService';
import { loginCandidateWithServer, registerCandidateWithServer } from '../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
  onNavigateToModule?: (modId: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  onNavigateToModule
}) => {
  const currentUser = getCurrentUser();
  const [user, setUser] = useState<UserProfile | null>(currentUser);
  const [activeTab, setActiveTab] = useState<'profile' | 'login' | 'register'>(currentUser ? 'profile' : 'login');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Verifying Candidate Profile...');

  const allUsers = getAllUsers();
  const activeUser = user;

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regBand, setRegBand] = useState<number>(7.5);
  const [regFormat, setRegFormat] = useState<'Academic' | 'General Training'>('Academic');
  const [regCountry, setRegCountry] = useState('Canada / UK / Australia');
  const [regDate, setRegDate] = useState('');
  const [regPass, setRegPass] = useState('');

  // Edit target band state
  const [editingGoal, setEditingGoal] = useState(false);
  const [tempTargetBand, setTempTargetBand] = useState<number>(activeUser?.progress.targetBand || 7.5);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  useEffect(() => {
    const curr = getCurrentUser();
    setUser(curr);
    if (!curr && activeTab === 'profile') {
      setActiveTab('login');
    }
    const handleAuth = () => {
      const updated = getCurrentUser();
      setUser(updated);
      if (!updated && activeTab === 'profile') {
        setActiveTab('login');
      }
    };
    window.addEventListener('user_auth_updated', handleAuth);
    return () => window.removeEventListener('user_auth_updated', handleAuth);
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading && !isGoogleModalOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, isGoogleModalOpen, onClose]);

  if (!isOpen) return null;

  const refreshUser = () => {
    setUser(getCurrentUser());
  };

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 1, label: 'Weak (দুর্বল)', color: 'bg-rose-500 text-rose-500' };
    if (score === 2) return { score: 2, label: 'Fair (মোটামুটি)', color: 'bg-amber-500 text-amber-500' };
    if (score === 3) return { score: 3, label: 'Good (ভালো)', color: 'bg-blue-500 text-blue-500' };
    return { score: 4, label: 'Strong (শক্তিশালী)', color: 'bg-emerald-500 text-emerald-500' };
  };

  const passwordStrength = getPasswordStrength(regPass);

  const handleGoogleSuccess = (candidateInfo: {
    uid: string;
    email: string;
    name?: string;
    targetBand?: number;
    verifiedByFirebase: boolean;
  }) => {
    setLoadingText('Connecting Verified Google Account...');
    setIsLoading(true);
    setTimeout(() => {
      const res = handleGoogleSignInAction(candidateInfo);
      setIsLoading(false);
      if (res.success && res.user) {
        setUser(res.user);
        setActiveTab('profile');
        soundManager.playSuccess();
        onShowToast(res.message);
      } else {
        soundManager.playWarning();
        onShowToast(res.message);
      }
    }, 300);
  };

  const handleForgotPassword = async () => {
    const trimmed = loginEmail.trim();
    if (!trimmed || !trimmed.includes('@')) {
      soundManager.playWarning();
      onShowToast('Please enter your registered email address first to receive a password reset link.');
      return;
    }
    setLoadingText('Sending Password Reset Email...');
    setIsLoading(true);
    try {
      await firebaseSyncService.sendResetPasswordEmail(trimmed);
      setIsLoading(false);
      soundManager.playSuccess();
      onShowToast(`Password reset instructions sent to ${trimmed}.`);
    } catch (err: any) {
      setIsLoading(false);
      soundManager.playWarning();
      onShowToast(err?.message || 'Could not send reset email. Verify your email address.');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = loginEmail.trim();
    if (!identifier) {
      onShowToast('Please enter your email or candidate name.');
      return;
    }
    setLoadingText('Authenticating Candidate Credentials...');
    setIsLoading(true);

    try {
      // 1. If email + password provided, try Firebase Auth first
      if (identifier.includes('@') && loginPass.length >= 6) {
        try {
          const fbProfile = await firebaseSyncService.loginWithEmail(identifier, loginPass);
          setIsLoading(false);
          setUser(fbProfile);
          setActiveTab('profile');
          soundManager.playSuccess();
          onShowToast(`Welcome back, ${fbProfile.name}! Cloud sync active.`);
          return;
        } catch {
          // Fall through to server/local check if account was created locally
        }
      }

      // 2. Try Express server auth
      if (loginPass) {
        const srvRes = await loginCandidateWithServer({ email: identifier, password: loginPass });
        if (srvRes.success && srvRes.user) {
          setIsLoading(false);
          setUser(srvRes.user);
          setActiveTab('profile');
          soundManager.playSuccess();
          onShowToast(srvRes.message || `Welcome back, ${srvRes.user.name}!`);
          return;
        }
      }

      // 3. Fallback to local userStorage for backward compatibility with existing local profiles
      const res = loginUser(identifier, loginPass);
      setIsLoading(false);
      if (res.success && res.user) {
        setUser(res.user);
        setActiveTab('profile');
        soundManager.playSuccess();
        onShowToast(res.message);
      } else {
        soundManager.playWarning();
        onShowToast(res.message);
      }
    } catch (err: any) {
      setIsLoading(false);
      soundManager.playWarning();
      onShowToast(err?.message || 'Sign-in failed. Please check your credentials.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) {
      onShowToast('Please enter both name and email.');
      return;
    }
    if (regPass && regPass.length > 0 && regPass.length < 6) {
      onShowToast('Please use at least 6 characters for your password.');
      return;
    }

    setLoadingText('Registering Candidate Profile & Cloud Sync...');
    setIsLoading(true);

    try {
      // 1. Register in Firebase Auth if password >= 6 chars
      if (regPass && regPass.length >= 6) {
        try {
          const fbProfile = await firebaseSyncService.registerWithEmail(
            regName.trim(),
            regEmail.trim(),
            regPass,
            regBand,
            regFormat,
            regCountry,
            regDate
          );
          // Also register on Express backend for session token compatibility
          await registerCandidateWithServer({
            name: regName.trim(),
            email: regEmail.trim(),
            password: regPass,
            targetBand: regBand,
            intendedFormat: regFormat,
            targetCountry: regCountry
          }).catch(() => {});

          setIsLoading(false);
          setUser(fbProfile);
          setActiveTab('profile');
          soundManager.playSuccess();
          onShowToast(`Account created and synced to cloud! Welcome, ${fbProfile.name}.`);
          return;
        } catch (fbErr: any) {
          if (fbErr?.code === 'auth/email-already-in-use') {
            setIsLoading(false);
            soundManager.playWarning();
            onShowToast('An account with this email already exists. Please switch to Sign In.');
            setActiveTab('login');
            setLoginEmail(regEmail.trim());
            return;
          }
        }
      }

      // 2. Fallback to local registration
      const res = registerUser(
        regName,
        regEmail,
        regBand,
        regFormat,
        regCountry,
        regDate,
        regPass
      );
      setIsLoading(false);
      if (res.success && res.user) {
        setUser(res.user);
        setActiveTab('profile');
        soundManager.playSuccess();
        onShowToast(res.message);
      } else {
        soundManager.playWarning();
        onShowToast(res.message);
      }
    } catch (err: any) {
      setIsLoading(false);
      soundManager.playWarning();
      onShowToast(err?.message || 'Registration could not be completed.');
    }
  };

  const handleSaveGoal = () => {
    if (!activeUser) return;
    const updated = {
      ...activeUser,
      progress: {
        ...activeUser.progress,
        targetBand: tempTargetBand
      }
    };
    saveUser(updated);
    setUser(updated);
    setEditingGoal(false);
    soundManager.playSuccess();
    onShowToast(`Target band updated to ${tempTargetBand.toFixed(1)}!`);
  };

  const handleExportData = () => {
    if (!activeUser) return;
    const jsonStr = exportAllUserData();
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonStr);
    const exportFileDefaultName = `ielts_progress_backup_${activeUser.name.replace(/\s+/g, '_')}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    soundManager.playSuccess();
    onShowToast('Progress backup downloaded successfully!');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        const content = event.target?.result as string;
        const ok = importUserData(content);
        if (ok) {
          refreshUser();
          soundManager.playSuccess();
          onShowToast('Progress restored from backup file!');
        } else {
          soundManager.playWarning();
          onShowToast('Invalid backup file format.');
        }
      };
    }
  };

  // Modules list for checklist
  const allModulesList = [
    { id: 'beginner', label: '1. Beginner 101' },
    { id: 'slides', label: '2. Slide Guide' },
    { id: 'listening', label: '3. Listening Lab & Maps' },
    { id: 'reading', label: '4. Reading Lab & CEFR' },
    { id: 'task1', label: '5. Task 1 Visualizer' },
    { id: 'examiner', label: '6. Voice Examiner' },
    { id: 'scratchpad', label: '7. Part 2 Cue Scratchpad' },
    { id: 'arguments', label: '8. PESTLE Matrix' },
    { id: 'livemock', label: '9. Live Mock Test' },
    { id: 'mock', label: '10. AI Mock & Heatmap' },
    { id: 'vocab', label: '11. Band 8+ Vocab Deck' },
    { id: 'studyplan', label: '12. AI Study Plan' },
    { id: 'vault', label: '13. Mistake Vault' },
    { id: 'bangla', label: '14. IELTS A-Z বাংলা গাইড' },
  ];

  const completedCount = activeUser?.progress.completedModules.length || 0;
  const completionPercentage = Math.round((completedCount / allModulesList.length) * 100);

  let daysUntilExam = null;
  if (activeUser?.progress.examDate) {
    const examTime = new Date(activeUser.progress.examDate).getTime();
    const now = Date.now();
    const diff = Math.ceil((examTime - now) / (1000 * 3600 * 24));
    if (diff >= 0) daysUntilExam = diff;
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
      className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden my-auto max-h-[90vh] flex flex-col animate-fade-in"
      >
        {/* Explicit Loading Overlay during Sign-In / Registration */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-900/85 dark:bg-slate-900/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 space-y-4 animate-fade-in text-white">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-blue-400">
                🎓
              </div>
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-extrabold text-base">{loadingText}</h4>
              <p className="text-xs text-slate-400">Synchronizing Cambridge Secure Candidate Profile...</p>
            </div>
          </div>
        )}

        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-2xl text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-lg border border-white/20">
              {activeUser?.name ? activeUser.name.charAt(0).toUpperCase() : '🎓'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black">{activeUser ? activeUser.name : 'IELTS Sprint Global'}</h3>
                {activeUser && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-bold font-mono">
                    <Flame className="w-3 h-3 text-amber-400" />
                    {activeUser.progress.streakDays || 1} Day Streak
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-200 font-mono mt-0.5">
                {activeUser ? activeUser.email : 'International Candidate Portal & Progress Sync'}
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 pt-3 border-t border-white/10 mt-2">
            {activeUser && (
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'profile'
                    ? 'bg-white text-slate-900 shadow-md'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Profile & Progress</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('login')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In (লগইন)</span>
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account (রেজিস্ট্রেশন)</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Profile & Progress */}
        {activeTab === 'profile' && activeUser && (
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between text-[11px] font-bold text-blue-900 dark:text-blue-300 uppercase">
                  <span>Target Band</span>
                  <Target className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="font-mono text-2xl font-black text-blue-950 dark:text-blue-100 mt-1">
                  Band {(activeUser.progress.targetBand || 7.5).toFixed(1)}
                </div>
                <button
                  onClick={() => setEditingGoal(!editingGoal)}
                  className="text-[10px] text-blue-700 dark:text-blue-400 font-bold hover:underline mt-1 block cursor-pointer"
                >
                  {editingGoal ? 'Close Edit' : 'Edit Target ✏️'}
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 dark:text-amber-300 uppercase">
                  <span>Exam Countdown</span>
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="font-mono text-2xl font-black text-amber-950 dark:text-amber-100 mt-1">
                  {daysUntilExam !== null ? `${daysUntilExam}d` : 'Set Date'}
                </div>
                <span className="text-[10px] text-amber-800 dark:text-amber-300 font-medium truncate block">
                  {activeUser.progress.examDate || 'No date set'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between text-[11px] font-bold text-purple-900 dark:text-purple-300 uppercase">
                  <span>Format</span>
                  <Globe className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <div className="font-bold text-sm text-purple-950 dark:text-purple-100 mt-1 truncate">
                  {activeUser.progress.intendedFormat || 'Academic'}
                </div>
                <span className="text-[10px] text-purple-700 dark:text-purple-300 truncate block mt-0.5">
                  {activeUser.progress.targetCountry || 'Global'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900 dark:text-emerald-300 uppercase">
                  <span>Modules</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="font-mono text-2xl font-black text-emerald-950 dark:text-emerald-100 mt-1">
                  {completedCount}/{allModulesList.length}
                </div>
                <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-medium">
                  {completionPercentage}% Mastered
                </span>
              </div>
            </div>

            {/* Goal Editor Popdown */}
            {editingGoal && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Select Target IELTS Band Score:</span>
                  <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-sm">{tempTargetBand.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="5.0"
                  max="9.0"
                  step="0.5"
                  value={tempTargetBand}
                  onChange={(e) => setTempTargetBand(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setEditingGoal(false)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveGoal}
                    className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm hover:bg-blue-700 cursor-pointer"
                  >
                    Save Target
                  </button>
                </div>
              </div>
            )}

            {/* Syllabus Progress Bar */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">Sprint Syllabus Readiness</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{completionPercentage}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>

            {/* Exam History */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-600" />
                  <span>Exam Attempt History & Scorecards</span>
                </h4>
                <span className="text-xs font-mono text-slate-500">
                  {(activeUser.progress.examHistory || []).length} Test Sessions
                </span>
              </div>

              {(activeUser.progress.examHistory || []).length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(activeUser.progress.examHistory || []).map((rec) => (
                    <div
                      key={rec.id}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-2xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                            {new Date(rec.timestamp).toLocaleDateString()}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rec.submissionType === 'timer' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'}`}>
                            {rec.submissionType === 'timer' ? '⏱️ Timer Ended' : '🏁 Finished'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          L: {rec.listeningBand.toFixed(1)} | R: {rec.readingBand.toFixed(1)} | W: {rec.writingBand.toFixed(1)} ({rec.wordCount}w)
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Overall</span>
                        <span className="font-mono text-lg font-black text-amber-500">
                          Band {rec.overallBand.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
                  <p>No full mock exams completed yet.</p>
                  {onNavigateToModule && (
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateToModule('livemock');
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition cursor-pointer shadow-sm"
                    >
                      <span>Take 30-Min Live Mock Test</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Backup / Export & Switch */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportData}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                  title="Export full test history, essays and mistake vault to JSON"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>Backup Progress</span>
                </button>

                <label className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 transition flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Restore</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </label>
              </div>

              {allUsers.length > 1 && (
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-slate-500">Switch:</span>
                  <select
                    value={activeUser.id}
                    onChange={(e) => {
                      const switched = switchActiveUser(e.target.value);
                      if (switched) {
                        setUser(switched);
                        soundManager.playSuccess();
                        onShowToast(`Switched to candidate profile: ${switched.name}`);
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 cursor-pointer"
                  >
                    {allUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: International Sign In (Login) */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="p-6 space-y-5 animate-fade-in">
            <div className="space-y-1">
              <h4 className="font-black text-slate-900 dark:text-white text-lg">Candidate Sign In (লগইন)</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter your registered candidate email or name to resume your IELTS Sprint training.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Candidate Email or Name (ইমেইল বা নাম) *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="e.g. ebadul@example.com or Md. Ebadul Islam"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Password / PIN (পাসওয়ার্ড)
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    placeholder="Enter your security password"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
              >
                Need a new account? Register
              </button>

              <button
                type="submit"
                className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In (লগইন)</span>
              </button>
            </div>

            {/* Social Google Auth */}
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              <span className="flex-shrink mx-4 text-slate-400 text-[11px] font-mono uppercase tracking-wider">or international auth</span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => {
                  soundManager.playBeep(600, 0.04);
                  setIsGoogleModalOpen(true);
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs sm:text-sm border border-slate-300 dark:border-slate-700 flex items-center justify-between transition shadow-xs cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google (Gmail)</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
                  Instant
                </span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: International Register New Account */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto animate-fade-in">
            <div className="space-y-1">
              <h4 className="font-black text-slate-900 dark:text-white text-lg">Create Candidate Profile (রেজিস্ট্রেশন)</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Setup your target band and country to unlock personalized Cambridge AI diagnostic milestones.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Full Name (সম্পূর্ণ নাম) *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Md. Tanvir Ahmed"
                    className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Email Address (ইমেইল) *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. tanvir@example.com"
                    className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Target Band Score (লক্ষ্য ব্যান্ড)
                </label>
                <select
                  value={regBand}
                  onChange={(e) => setRegBand(parseFloat(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                >
                  <option value="6.0">Band 6.0 (Competent)</option>
                  <option value="6.5">Band 6.5 (University Standard)</option>
                  <option value="7.0">Band 7.0 (Good User)</option>
                  <option value="7.5">Band 7.5 (Top Tier / Canada PR)</option>
                  <option value="8.0">Band 8.0 (Expert)</option>
                  <option value="8.5">Band 8.5 (Near Native)</option>
                  <option value="9.0">Band 9.0 (Mastery)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Test Format (পরীক্ষার ধরন)
                </label>
                <select
                  value={regFormat}
                  onChange={(e) => setRegFormat(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                >
                  <option value="Academic">Academic (উচ্চশিক্ষা / Degree)</option>
                  <option value="General Training">General Training (ইমিগ্রেশন / PR)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Target Destination (উদ্দেশ্য দেশ)
                </label>
                <input
                  type="text"
                  value={regCountry}
                  onChange={(e) => setRegCountry(e.target.value)}
                  placeholder="e.g. Canada / UK / Australia / USA"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Anticipated Test Date (পরীক্ষার তারিখ)
                </label>
                <input
                  type="date"
                  value={regDate}
                  onChange={(e) => setRegDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Security Password / PIN (পাসওয়ার্ড)
                </label>
                {regPass && (
                  <span className={`text-[11px] font-bold ${passwordStrength.color}`}>
                    {passwordStrength.label}
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                  placeholder="Create a secure password"
                  className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                />
              </div>
              {/* Password strength visual indicator bars */}
              {regPass && (
                <div className="grid grid-cols-4 gap-1.5 pt-1.5">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        passwordStrength.score >= level
                          ? passwordStrength.score === 1
                            ? 'bg-rose-500'
                            : passwordStrength.score === 2
                            ? 'bg-amber-500'
                            : passwordStrength.score === 3
                            ? 'bg-blue-500'
                            : 'bg-emerald-500'
                          : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
              >
                Already registered? Sign In
              </button>

              <button
                type="submit"
                className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Profile (প্রোফাইল তৈরি করুন)</span>
              </button>
            </div>
          </form>
        )}
      </div>

      <GoogleSignInModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        onSuccess={handleGoogleSuccess}
      />
    </div>
  );
};
