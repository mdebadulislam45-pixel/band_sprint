import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  BookOpen,
  MessageSquare,
  Lightbulb,
  Headphones,
  PenTool,
  Mic,
  ArrowRight,
  Sparkles,
  Command,
  Sun,
  Moon,
  GraduationCap,
  Archive,
  Sliders,
  Calendar,
  Layers,
  Check
} from 'lucide-react';
import { ALL_COMBINED_VOCAB } from '../VocabDeck';
import { soundManager } from '../../utils/audioEffects';
import { useTheme } from '../../context/ThemeContext';
import { getMistakes } from '../../utils/vaultStorage';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { resolvedTheme, toggleTheme } = useTheme();

  const mistakes = getMistakes();
  const unmasteredMistakes = mistakes.filter((m) => !m.mastered);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  // Primary Action Commands (Quick Launcher)
  const quickCommands = [
    {
      id: 'cmd_tutor',
      title: 'Ask Cambridge AI Tutor',
      sub: 'Open contextual IELTS tutor for questions & advice',
      icon: GraduationCap,
      action: () => {
        window.dispatchEvent(new CustomEvent('open_ai_tutor'));
        onClose();
      },
      category: 'AI Assistant',
      badge: 'Interactive'
    },
    {
      id: 'cmd_theme',
      title: `Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`,
      sub: 'Toggle dashboard appearance',
      icon: resolvedTheme === 'dark' ? Sun : Moon,
      action: () => {
        toggleTheme();
        soundManager.playBeep(640, 0.04);
        onClose();
      },
      category: 'Preferences',
      badge: 'Theme'
    },
    {
      id: 'cmd_listening',
      title: 'Listening Lab',
      sub: '40 Questions · Authentic British Audio · Auto-Check',
      icon: Headphones,
      action: () => {
        onNavigate('listening');
        onClose();
      },
      category: 'Practice Arena'
    },
    {
      id: 'cmd_reading',
      title: 'Reading Lab',
      sub: 'True/False/Not Given, Headings & Speed Reader',
      icon: BookOpen,
      action: () => {
        onNavigate('reading');
        onClose();
      },
      category: 'Practice Arena'
    },
    {
      id: 'cmd_speaking',
      title: 'Speaking Studio & Cue Cards',
      sub: 'Part 1, Part 2 Monologue & Part 3 Discussion',
      icon: Mic,
      action: () => {
        onNavigate('speaking');
        onClose();
      },
      category: 'Practice Arena'
    },
    {
      id: 'cmd_writing',
      title: 'Writing Suite (Task 1 & Task 2)',
      sub: 'Instant Criterion Evaluation & PESTLE Matrix',
      icon: PenTool,
      action: () => {
        onNavigate('writing');
        onClose();
      },
      category: 'Practice Arena'
    },
    {
      id: 'cmd_vault',
      title: `Mistake Vault (${unmasteredMistakes.length} Unmastered)`,
      sub: 'Spaced repetition drills on your past errors',
      icon: Archive,
      action: () => {
        window.dispatchEvent(new CustomEvent('open_vault_modal'));
        onClose();
      },
      category: 'Targeted Drills',
      badge: `${unmasteredMistakes.length}`
    },
    {
      id: 'cmd_shadowing',
      title: 'British Shadowing Lab',
      sub: 'Listen & repeat with waveform alignment',
      icon: Headphones,
      action: () => {
        onNavigate('shadowing');
        onClose();
      },
      category: 'English Fluency'
    },
    {
      id: 'cmd_modelanswers',
      title: 'Band 9 Model Answers',
      sub: 'Official examiner samples for Task 1 and Task 2',
      icon: BookOpen,
      action: () => {
        onNavigate('modelanswers');
        onClose();
      },
      category: 'Study Resources'
    },
    {
      id: 'cmd_roadmap',
      title: '30-Day Master Roadmap',
      sub: 'Day-by-day preparation schedule with checklist',
      icon: Calendar,
      action: () => {
        onNavigate('studyplan');
        onClose();
      },
      category: 'Study Resources'
    }
  ];

  // Filter commands
  const filteredCommands = quickCommands.filter(
    (c) =>
      !q ||
      c.title.toLowerCase().includes(q) ||
      c.sub.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
  );

  // Search lexical database
  const matchedVocab = q
    ? ALL_COMBINED_VOCAB.filter(
        (item) =>
          item.item.toLowerCase().includes(q) ||
          item.banglaMeaning.toLowerCase().includes(q) ||
          item.definition.toLowerCase().includes(q)
      ).slice(0, 8)
    : [];

  const allItemsCount = filteredCommands.length + matchedVocab.length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (allItemsCount || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItemsCount) % (allItemsCount || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex < filteredCommands.length) {
        filteredCommands[selectedIndex].action();
      } else {
        const vocabIdx = selectedIndex - filteredCommands.length;
        const item = matchedVocab[vocabIdx];
        if (item) {
          if (item.category === 'phrase') onNavigate('phrases');
          else if (item.category === 'idiom') onNavigate('idioms');
          else onNavigate('vocab');
          onClose();
        }
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-start justify-center p-3 sm:p-4 pt-16 sm:pt-24 overflow-y-auto animate-fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-4 sm:p-5 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 animate-fade-in text-slate-900 dark:text-slate-100"
      >
        {/* Search Input Bar */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, practice lab, or search vocabulary..."
            className="w-full pl-11 pr-12 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400"
          />
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] font-mono text-slate-400">
              ESC
            </kbd>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
          {/* Quick Action Commands */}
          {filteredCommands.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 py-0.5 flex items-center justify-between">
                <span>Quick Actions & Navigation</span>
                <span className="text-[9px] lowercase font-normal">use ↑↓ to navigate, ↵ to run</span>
              </div>

              <div className="space-y-1">
                {filteredCommands.map((cmd, idx) => {
                  const Icon = cmd.icon;
                  const isSelected = selectedIndex === idx;

                  return (
                    <button
                      key={cmd.id}
                      onClick={() => {
                        soundManager.playBeep(600, 0.04);
                        cmd.action();
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full p-2.5 rounded-2xl text-left transition flex items-center justify-between gap-3 border ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 shadow-2xs'
                          : 'bg-white dark:bg-slate-800/40 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {cmd.title}
                            </span>
                            {cmd.badge && (
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                                {cmd.badge}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {cmd.sub}
                          </div>
                        </div>
                      </div>

                      <ArrowRight
                        className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                          isSelected ? 'text-blue-600 dark:text-blue-400 translate-x-0.5' : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Lexical Matches */}
          {matchedVocab.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 py-0.5">
                Vocabulary, Phrases & Idioms ({matchedVocab.length})
              </div>

              <div className="space-y-1">
                {matchedVocab.map((item, idx) => {
                  const globalIdx = filteredCommands.length + idx;
                  const isSelected = selectedIndex === globalIdx;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        soundManager.playBeep(600, 0.04);
                        if (item.category === 'phrase') onNavigate('phrases');
                        else if (item.category === 'idiom') onNavigate('idioms');
                        else onNavigate('vocab');
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      className={`w-full p-2.5 rounded-2xl text-left transition flex items-center justify-between gap-3 border ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 shadow-2xs'
                          : 'bg-white dark:bg-slate-800/40 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                            {item.item}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {item.category}
                          </span>
                        </div>
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium truncate mt-0.5">
                          {item.banglaMeaning}
                        </div>
                      </div>

                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 shrink-0">
                        Open →
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {q && matchedVocab.length === 0 && filteredCommands.length === 0 && (
            <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <div className="font-bold text-slate-700 dark:text-slate-200">
                No matching tools or vocabulary found for "{query}".
              </div>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Try searching for "listening", "speaking", "tutor", "theme", or "collocations".
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
