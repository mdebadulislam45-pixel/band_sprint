import React from 'react';
import {
  Play,
  Clock,
  Headphones,
  BookOpen,
  PenTool,
  Mic,
  Award,
  ArrowRight,
  Sliders,
  History,
  Sparkles,
  Cloud
} from 'lucide-react';
import { UserProfile, ExamHistoryRecord } from '../../types';
import { soundManager } from '../../utils/audioEffects';
import {
  summarizeExamHistoryCounts,
  describeExamHistoryDisplay
} from '../../utils/userStorage';

interface MockTestPageProps {
  user: UserProfile;
  onNavigate: (page: string) => void;
  onShowToast: (msg: string) => void;
  onOpenBandModal: () => void;
}

export const MockTestPage: React.FC<MockTestPageProps> = ({
  user,
  onNavigate,
  onOpenBandModal
}) => {
  const history: ExamHistoryRecord[] = user.progress.examHistory || [];
  const historySummary = summarizeExamHistoryCounts(history);

  const launchMockPreflight = (module: 'full_mock' | 'listening' | 'reading' | 'writing' | 'speaking') => {
    soundManager.playBeep(560, 0.035);
    window.dispatchEvent(new CustomEvent('open_cdielts_preflight', { detail: { module } }));
  };

  const skillMocks = [
    {
      module: 'listening' as const,
      title: 'Listening CD-IELTS Mock',
      meta: '40 Questions · 30 mins · Single-play British audio',
      icon: Headphones
    },
    {
      module: 'reading' as const,
      title: 'Reading CD-IELTS Mock',
      meta: '3 Passages · 60 mins · Split-screen exam view',
      icon: BookOpen
    },
    {
      module: 'writing' as const,
      title: 'Writing CD-IELTS Mock',
      meta: 'Task 1 & Task 2 · 60 mins · 4-Criteria AI audit',
      icon: PenTool
    },
    {
      module: 'speaking' as const,
      title: 'Speaking Mock Interview',
      meta: 'Parts 1, 2 & 3 · 11–14 mins · Voice examiner',
      icon: Mic
    }
  ];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* 1. Full Mock Hero — BandSprint Pine */}
      <section className="rounded-2xl bg-[#0F4C45] dark:bg-[#0D3833] text-white p-6 sm:p-8 border border-[#1F8A70]/35 shadow-sm">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-white/80">
            <span className="uppercase tracking-wider font-semibold text-[#F4A62A]">
              Computer-Delivered Practice Simulation
            </span>
            <span className="inline-flex items-center gap-1.5 text-white/80">
              <Cloud className="w-3.5 h-3.5 text-[#F4A62A]" />
              Scores synced to your account
            </span>
          </div>

          <div className="space-y-1.5">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Full IELTS Mock Test Room
            </h1>
            <p className="text-sm text-white/80 max-w-2xl leading-relaxed">
              Timed practice simulation covering Listening, Reading, Writing, and Speaking under computer-delivered test conditions. Practice simulation — not the official IELTS test.
            </p>
          </div>

          {/* 4-Skill Blueprint Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {[
              { label: 'Listening', value: '40 Qs · 30m', icon: Headphones },
              { label: 'Reading', value: '40 Qs · 60m', icon: BookOpen },
              { label: 'Writing', value: '2 Tasks · 60m', icon: PenTool },
              { label: 'Speaking', value: '3 Parts · 14m', icon: Mic }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="p-3 rounded-xl bg-white/10 border border-white/15 flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-lg bg-white/15 text-[#F4A62A] flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-white/75 font-medium">{item.label}</div>
                    <div className="text-xs font-bold text-white tabular-nums truncate">
                      {item.value}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Timing & Scale Row */}
          <div className="flex flex-wrap items-center gap-5 text-xs text-white/85 font-mono tabular-nums">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#F4A62A]" />
              Total duration: <strong className="text-white">2h 45m</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#F4A62A]" />
              Estimated Band Scale: <strong className="text-white">0.0 – 9.0</strong>
            </span>
          </div>

          {/* Primary Actions */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => {
                soundManager.playSuccess();
                launchMockPreflight('full_mock');
              }}
              className="min-h-[48px] px-6 py-3 rounded-xl bg-[#F4A62A] hover:bg-[#E0951B] text-[#0E1F1E] font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Timed CD-IELTS Mock</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playBeep(560, 0.03);
                onNavigate('/learn/diagnostic');
              }}
              className="min-h-[46px] px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/25 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#F4A62A]" />
              <span>10-Min Quick Diagnostic</span>
            </button>

            <button
              type="button"
              onClick={onOpenBandModal}
              className="min-h-[46px] px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/25 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sliders className="w-4 h-4 text-[#F4A62A]" />
              <span>Band Calculator &amp; OSR</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Individual Skill Simulations */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#566664] dark:text-[#96B0AC]">
            Single-Skill Timed Mocks
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('/practice')}
            className="text-xs font-semibold text-[#0F4C45] dark:text-[#4DB6A4] hover:underline cursor-pointer"
          >
            Open Practice Hub →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {skillMocks.map((skill) => {
            const Icon = skill.icon;
            return (
              <button
                key={skill.module}
                type="button"
                onClick={() => launchMockPreflight(skill.module)}
                className="p-4 rounded-xl bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1E3330] hover:border-[#0F4C45] dark:hover:border-[#4DB6A4] transition text-left cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#EEF3F1] dark:bg-[#0B1514] text-[#0F4C45] dark:text-[#4DB6A4] border border-[#D3DDDA] dark:border-[#1E3330] flex items-center justify-center shrink-0 group-hover:bg-[#0F4C45] group-hover:text-white transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#0E1F1E] dark:text-[#EEF3F1] truncate">
                      {skill.title}
                    </div>
                    <div className="text-xs text-[#566664] dark:text-[#96B0AC] truncate mt-0.5">
                      {skill.meta}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#566664] group-hover:text-[#0F4C45] dark:group-hover:text-[#4DB6A4] shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Recent Test Attempts */}
      <section className="bg-white dark:bg-[#11201E] rounded-2xl border border-[#D3DDDA] dark:border-[#1E3330] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#EEF3F1] dark:bg-[#0B1514] text-[#0F4C45] dark:text-[#4DB6A4] flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                Recent Mock Attempts
              </h2>
              <p className="text-xs text-[#566664] dark:text-[#96B0AC]">
                Automatically backed up across your signed-in devices
              </p>
            </div>
          </div>
          {history.length > 0 && (
            <span className="text-xs font-mono font-semibold text-[#566664] dark:text-[#96B0AC] tabular-nums">
              {historySummary.headerBadgeText}
            </span>
          )}
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center bg-[#F7F9F8] dark:bg-[#0B1514] rounded-xl border border-dashed border-[#D3DDDA] dark:border-[#1E3330] space-y-3">
            <Award className="w-8 h-8 text-[#0F4C45] dark:text-[#4DB6A4] mx-auto" />
            <div className="text-sm font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
              No mock tests recorded yet
            </div>
            <p className="text-xs text-[#566664] dark:text-[#96B0AC] max-w-md mx-auto leading-relaxed">
              Complete your first timed mock simulation to calculate your estimated band score and track weak question types.
            </p>
            <button
              type="button"
              onClick={() => launchMockPreflight('full_mock')}
              className="mt-1 px-4 py-2.5 rounded-xl bg-[#0F4C45] hover:bg-[#0B3833] text-white font-semibold text-xs transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Start First Mock Exam</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {history.slice(0, 6).map((test, index) => {
              const attemptNumber = history.length - index;
              const desc = describeExamHistoryDisplay(test, attemptNumber);
              const testDate = new Date(test.timestamp).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              });

              return (
                <div
                  key={test.id || index}
                  className="p-3.5 rounded-xl border border-[#D3DDDA] dark:border-[#1E3330] bg-[#F7F9F8] dark:bg-[#0B1514] flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-lg flex items-center justify-center font-mono font-bold text-sm tabular-nums shrink-0 ${
                        desc.isIncompleteMock
                          ? 'bg-[#FDF6E7] dark:bg-[#2A2010] text-[#9A5B00] dark:text-[#F4A62A] border border-[#F4A62A]/40 text-xs'
                          : 'bg-[#0F4C45] text-white'
                      }`}
                    >
                      {desc.badgeScore}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#0E1F1E] dark:text-[#EEF3F1]">
                          {desc.title}
                        </span>
                        {desc.isIncompleteMock && (
                          <span className="px-2 py-0.5 rounded bg-[#FDF6E7] dark:bg-[#2A2010] text-[#9A5B00] dark:text-[#F4A62A] border border-[#F4A62A]/40 text-[10px] font-mono font-semibold">
                            Incomplete
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#566664] dark:text-[#96B0AC] font-mono tabular-nums flex flex-wrap items-center gap-2 mt-0.5">
                        <span>{testDate}</span>
                        <span>•</span>
                        {desc.skillSummaryParts.map((part, pIdx) => (
                          <span key={pIdx}>{part}</span>
                        ))}
                        {desc.statusNote && (
                          <>
                            <span>•</span>
                            <span className="text-[#9A5B00] dark:text-[#F4A62A] font-medium">
                              {desc.statusNote}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigate('/progress/history')}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#11201E] border border-[#D3DDDA] dark:border-[#1E3330] hover:border-[#0F4C45] text-[#0E1F1E] dark:text-[#EEF3F1] text-xs font-semibold transition cursor-pointer"
                  >
                    View History
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
