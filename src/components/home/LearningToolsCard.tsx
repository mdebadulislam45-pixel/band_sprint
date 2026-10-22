import React from 'react';
import {
  BookMarked,
  MessageSquare,
  Sparkles,
  BookOpen,
  Mic2,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { Icon3D, Icon3DVariant } from '../common/Icon3D';

interface LearningToolsCardProps {
  onNavigate: (module: string) => void;
}

export const LearningToolsCard: React.FC<LearningToolsCardProps> = ({ onNavigate }) => {
  const tools: Array<{
    id: string;
    name: string;
    desc: string;
    route: string;
    icon: typeof BookMarked;
    variant: Icon3DVariant;
    border: string;
  }> = [
    {
      id: 'vocab',
      name: 'Vocabulary',
      desc: 'Lexical resource & flashcards',
      route: 'vocab',
      icon: BookMarked,
      variant: 'emerald',
      border: 'hover:border-emerald-400'
    },
    {
      id: 'phrases',
      name: 'Useful Phrases',
      desc: 'High-frequency transitions',
      route: 'phrases',
      icon: MessageSquare,
      variant: 'blue',
      border: 'hover:border-blue-400'
    },
    {
      id: 'idioms',
      name: 'Idioms',
      desc: 'C1/C2 natural expressions',
      route: 'idioms',
      icon: Sparkles,
      variant: 'purple',
      border: 'hover:border-purple-400'
    },
    {
      id: 'grammar',
      name: 'Grammar',
      desc: 'Complex structures & rules',
      route: 'grammar',
      icon: BookOpen,
      variant: 'amber',
      border: 'hover:border-amber-400'
    },
    {
      id: 'shadowing',
      name: 'Shadowing',
      desc: 'Connected speech & rhythm',
      route: 'shadowing',
      icon: Mic2,
      variant: 'cyan',
      border: 'hover:border-cyan-400'
    }
  ];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            Learning Tools
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Core lexical and grammatical development tools
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(520, 0.04);
            onNavigate('learn');
          }}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 transition cursor-pointer"
        >
          <span>All Tools</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5">
        {tools.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              soundManager.playBeep(560, 0.04);
              onNavigate(t.route);
            }}
            className={`p-3 rounded-2xl bg-white dark:bg-[#101B32] border border-slate-200/90 dark:border-slate-800 ${t.border} text-left transition flex flex-col justify-between group active:scale-95 shadow-2xs hover:shadow-xs min-h-[96px] cursor-pointer`}
          >
            <div className="flex items-center justify-between">
              <Icon3D icon={t.icon} variant={t.variant} size="sm" animateHover={true} />
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition" />
            </div>
            <div className="mt-2">
              <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {t.name}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {t.desc}
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};
