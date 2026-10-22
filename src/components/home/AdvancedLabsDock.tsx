import React from 'react';
import {
  Monitor,
  PenTool,
  Compass,
  Repeat,
  Layers,
  Mic2,
  ArrowRight
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';
import { Icon3D, Icon3DVariant } from '../common/Icon3D';

interface AdvancedLabsDockProps {
  onNavigate: (module: string) => void;
  onOpenVault: () => void;
}

interface LabTool {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: typeof Monitor;
  variant: Icon3DVariant;
  route?: string;
  customAction?: () => void;
}

export const AdvancedLabsDock: React.FC<AdvancedLabsDockProps> = ({
  onNavigate
}) => {
  const tools: LabTool[] = [
    {
      id: 'cdielts',
      name: 'CD-IELTS Exam Simulator',
      category: 'Computer-Delivered',
      description: 'Official test screen with real highlight, notepad and question navigation',
      icon: Monitor,
      route: 'cdielts',
      variant: 'blue'
    },
    {
      id: 'essayarchitect',
      name: 'Band 9 Essay Architect',
      category: 'Academic Writing',
      description: 'Interactive 4-paragraph essay framing with academic cohesion linkers',
      icon: PenTool,
      route: 'essayarchitect',
      variant: 'purple'
    },
    {
      id: 'listeningmap',
      name: 'Directional Map Simulator',
      category: 'Listening Lab',
      description: 'Audio compass with interactive North/South campus spatial coordinates',
      icon: Compass,
      route: 'listeningmap',
      variant: 'indigo'
    },
    {
      id: 'sentencetransformer',
      name: 'Sentence Transformer Studio',
      category: 'Grammar C1/C2',
      description: 'Upgrade Band 6 simple sentences to Band 8+ inversions and cleft clauses',
      icon: Repeat,
      route: 'sentencetransformer',
      variant: 'emerald'
    },
    {
      id: 'vocabflashcards',
      name: 'Spaced Repetition Flashcards',
      category: 'Lexical Resource',
      description: '500+ high-frequency Cambridge Academic collocations with audio',
      icon: Layers,
      route: 'vocabflashcards',
      variant: 'amber'
    },
    {
      id: 'speaking',
      name: 'AI Speaking Interviewer',
      category: 'Oral Exam',
      description: 'Part 1, 2, 3 oral simulation with natural British voice examiner feedback',
      icon: Mic2,
      route: 'speaking',
      variant: 'rose'
    }
  ];

  return (
    <section className="space-y-3.5">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Specialized Practice Labs
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Interactive cognitive trainers designed specifically for tricky Cambridge question types
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('learn')}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 transition cursor-pointer"
        >
          <span>All Modules</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => {
              soundManager.playBeep(560, 0.04);
              if (tool.customAction) {
                tool.customAction();
              } else if (tool.route) {
                onNavigate(tool.route);
              }
            }}
            className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#0B1224] border border-slate-200/90 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 shadow-2xs hover:shadow-xs transition flex flex-col justify-between text-left group cursor-pointer min-h-[110px]"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Icon3D icon={tool.icon} variant={tool.variant} size="sm" animateHover={true} />
                <span className="text-[10px] text-slate-400 font-medium">
                  {tool.category}
                </span>
              </div>

              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {tool.name}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                  {tool.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};
