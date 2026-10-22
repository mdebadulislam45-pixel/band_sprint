import React, { useState } from 'react';
import {
  Headphones,
  BookOpen,
  PenTool,
  Mic,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { soundManager } from '../../utils/audioEffects';

interface SkillMasteryMatrixProps {
  onNavigate: (module: string) => void;
  examMode: 'Academic' | 'General Training';
  completedModules?: string[];
}

interface SkillCardData {
  id: string;
  name: string;
  shortDesc: string;
  route: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  badgeBg: string;
  badgeText: string;
  statusLabel: string;
  subskills: { name: string; focus: string }[];
}

export const SkillMasteryMatrix: React.FC<SkillMasteryMatrixProps> = ({
  onNavigate,
  examMode,
  completedModules = []
}) => {
  const [selectedSkill, setSelectedSkill] = useState<string>('listening');

  const skills: SkillCardData[] = [
    {
      id: 'listening',
      name: 'Listening',
      shortDesc: 'Dialogues, campus maps & academic lectures',
      route: 'listening',
      icon: Headphones,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/60',
      badgeBg: 'bg-blue-100 dark:bg-blue-900/40',
      badgeText: 'text-blue-700 dark:text-blue-300',
      statusLabel: completedModules.includes('listening') ? 'Completed' : 'Ready to Practice',
      subskills: [
        { name: 'Section 1: Daily Social Transactions', focus: 'Form filling, names, numbers & dates' },
        { name: 'Section 2: Public Monologues & Campus Maps', focus: 'Directional tracking & spatial layout' },
        { name: 'Section 3: Academic Discussion & Seminars', focus: 'Multiple speakers & agreement nuances' },
        { name: 'Section 4: University Monologue Lecture', focus: 'Note completion & rapid signposting' }
      ]
    },
    {
      id: 'reading',
      name: examMode === 'Academic' ? 'Academic Reading' : 'General Reading',
      shortDesc: 'Skimming, scanning, TFNG & headings',
      route: 'reading',
      icon: BookOpen,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/60',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-900/40',
      badgeText: 'text-emerald-700 dark:text-emerald-300',
      statusLabel: completedModules.includes('reading') ? 'Completed' : 'Ready to Practice',
      subskills: [
        { name: 'Passage 1: Factual & Descriptive Texts', focus: 'True / False / Not Given & Summary' },
        { name: 'Passage 2: Work & Educational Contexts', focus: 'Matching Headings & Information' },
        { name: 'Passage 3: Complex Argumentative Prose', focus: 'Writer opinion & multiple choice logic' }
      ]
    },
    {
      id: 'writing',
      name: examMode === 'Academic' ? 'Academic Writing' : 'General Writing',
      shortDesc: 'Task 1 visual reports & Task 2 discursive essays',
      route: 'writing',
      icon: PenTool,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950/60',
      badgeBg: 'bg-purple-100 dark:bg-purple-900/40',
      badgeText: 'text-purple-700 dark:text-purple-300',
      statusLabel: completedModules.includes('writing') ? 'Completed' : 'Ready to Practice',
      subskills: [
        { name: 'Task 1: Visual Trend Synthesis', focus: 'Overview, key features & data comparison' },
        { name: 'Task 2: Essay Architecture', focus: 'Clear thesis, balanced stance & examples' },
        { name: 'Band 9 Coherence & Cohesion', focus: 'Paragraph transitions & discourse markers' }
      ]
    },
    {
      id: 'speaking',
      name: 'Speaking',
      shortDesc: 'Parts 1-3 interview with AI pronunciation coach',
      route: 'speaking',
      icon: Mic,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/60',
      badgeBg: 'bg-amber-100 dark:bg-amber-900/40',
      badgeText: 'text-amber-700 dark:text-amber-300',
      statusLabel: completedModules.includes('speaking') ? 'Completed' : 'Ready to Practice',
      subskills: [
        { name: 'Part 1: Introduction & Familiar Topics', focus: 'Fluency, natural rhythm & confidence' },
        { name: 'Part 2: Long Turn Cue Card (2 mins)', focus: '1-minute notes & sustained narration' },
        { name: 'Part 3: Two-way Abstract Discussion', focus: 'Evaluating ideas, hypotheses & nuances' }
      ]
    }
  ];

  const activeSkill = skills.find(s => s.id === selectedSkill) || skills[0];

  return (
    <section className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            IELTS Skills
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Four core exam components according to Cambridge standards
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            soundManager.playBeep(520, 0.04);
            onNavigate('practice');
          }}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 transition cursor-pointer"
        >
          <span>All Drills</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4 Consistent Skill Cards (No fabricated percentages, clean indicators) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {skills.map((skill) => {
          const Icon = skill.icon;
          const isSelected = selectedSkill === skill.id;
          const isDone = completedModules.includes(skill.id);

          return (
            <div
              key={skill.id}
              onClick={() => {
                soundManager.playBeep(520, 0.04);
                setSelectedSkill(skill.id);
              }}
              className={`p-3 sm:p-3.5 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer group min-h-[120px] ${
                isSelected
                  ? 'bg-white dark:bg-[#13203D] border-blue-500 dark:border-blue-400 shadow-sm ring-1 ring-blue-500/20'
                  : 'bg-white dark:bg-[#101B32] border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-xl ${skill.bgColor} ${skill.color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {/* Subtle Progress Status Indicator without numerical percentage */}
                  <div className="flex items-center gap-1">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isDone ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                    />
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      {isDone ? 'Completed' : 'Practice'}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {skill.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                    {skill.shortDesc}
                  </p>
                </div>
              </div>

              {/* Direct Launch Link */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  soundManager.playBeep(600, 0.04);
                  onNavigate(skill.route);
                }}
                className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors cursor-pointer"
              >
                <span>Launch Lab</span>
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Selected Skill Sub-task Breakdown */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 dark:bg-[#0E1626] border border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg ${activeSkill.bgColor} ${activeSkill.color} flex items-center justify-center shrink-0`}>
              <activeSkill.icon className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {activeSkill.name} Structure & Sections
              </span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Official Cambridge format & evaluation criteria
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundManager.playBeep(640, 0.04);
              onNavigate(activeSkill.route);
            }}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[11px] font-bold shadow-xs transition flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>Start Practice</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {activeSkill.subskills.map((sub, i) => (
            <div
              key={i}
              className="p-2.5 rounded-xl bg-white dark:bg-[#101B32] border border-slate-200/70 dark:border-slate-800/70 text-left"
            >
              <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                {sub.name}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {sub.focus}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
