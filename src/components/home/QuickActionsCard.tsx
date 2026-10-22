import React from 'react';
import {
  Zap,
  Lightbulb,
  BookMarked,
  Target,
  Sparkles,
  MoreHorizontal
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { Icon3D, Icon3DVariant } from '../common/Icon3D';

interface QuickActionsCardProps {
  onNavigate: (module: string) => void;
  onOpenVault: () => void;
  onShowMore: () => void;
}

export const QuickActionsCard: React.FC<QuickActionsCardProps> = ({
  onNavigate,
  onOpenVault,
  onShowMore
}) => {
  const actions: Array<{
    id: string;
    label: string;
    icon: typeof Zap;
    variant: Icon3DVariant;
    action: () => void;
  }> = [
    {
      id: 'mocktest',
      label: 'Mock Test',
      icon: Zap,
      variant: 'purple',
      action: () => onNavigate('mocktest')
    },
    {
      id: 'mistakes',
      label: 'Review Mistakes',
      icon: Lightbulb,
      variant: 'amber',
      action: () => onOpenVault()
    },
    {
      id: 'vocab',
      label: 'Saved Words',
      icon: BookMarked,
      variant: 'emerald',
      action: () => onNavigate('vocabflashcards')
    },
    {
      id: 'studyplan',
      label: 'Study Plan',
      icon: Target,
      variant: 'blue',
      action: () => onNavigate('studyplan')
    },
    {
      id: 'aitools',
      label: 'AI Tools',
      icon: Sparkles,
      variant: 'indigo',
      action: () => onNavigate('aitools')
    },
    {
      id: 'more',
      label: 'More',
      icon: MoreHorizontal,
      variant: 'slate',
      action: () => onShowMore()
    }
  ];

  return (
    <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0B1224] border border-slate-200/90 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-3">
      <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <span>Quick Actions</span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
        {actions.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              soundManager.playBeep(560, 0.04);
              item.action();
            }}
            className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 flex flex-col items-center justify-center text-center gap-2 group transition active:scale-95 cursor-pointer min-h-[88px]"
          >
            <Icon3D icon={item.icon} variant={item.variant} size="sm" animateHover={true} />
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-tight">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
