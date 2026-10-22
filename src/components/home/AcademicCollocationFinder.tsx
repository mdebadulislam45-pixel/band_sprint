import React, { useState } from 'react';
import { BookMarked, Volume2, Copy, Check, Sparkles, ArrowRight } from 'lucide-react';
import { speakBritish } from '../../utils/britishVoice';
import { soundManager } from '../../utils/audioEffects';

interface AcademicCollocationFinderProps {
  onShowToast: (msg: string) => void;
  onNavigate: (module: string) => void;
}

type IELTSTheme = 'education' | 'environment' | 'technology' | 'economy' | 'society';

interface CollocationItem {
  phrase: string;
  meaning: string;
  example: string;
  cefr: 'C1' | 'C2';
  skill: string;
}

const THEME_COLLOCATIONS: Record<IELTSTheme, { label: string; icon: string; items: CollocationItem[] }> = {
  education: {
    label: 'Education & Academia',
    icon: '🎓',
    items: [
      {
        phrase: 'foster critical inquiry',
        meaning: 'encourage independent analytical thinking',
        example: 'Higher education institutions must foster critical inquiry rather than rote memorization.',
        cefr: 'C1',
        skill: 'Writing Task 2'
      },
      {
        phrase: 'egalitarian access to schooling',
        meaning: 'fair, equal educational opportunity for all social strata',
        example: 'Governments should safeguard egalitarian access to schooling regardless of socioeconomic status.',
        cefr: 'C2',
        skill: 'Speaking Part 3'
      },
      {
        phrase: 'pedagogical framework',
        meaning: 'the structured theory and methodology of teaching',
        example: 'A modern pedagogical framework blends asynchronous digital labs with interactive seminars.',
        cefr: 'C1',
        skill: 'Reading / Writing'
      }
    ]
  },
  environment: {
    label: 'Environment & Climate',
    icon: '🌿',
    items: [
      {
        phrase: 'irreversible ecological degradation',
        meaning: 'permanent damage to ecosystems that cannot be repaired',
        example: 'Deforestation triggers irreversible ecological degradation across fragile river basins.',
        cefr: 'C2',
        skill: 'Writing Task 2'
      },
      {
        phrase: 'mitigate anthropogenic impact',
        meaning: 'reduce environmental destruction caused by human activity',
        example: 'Transitioning to renewable grids is essential to mitigate anthropogenic impact on rising sea levels.',
        cefr: 'C1',
        skill: 'Task 2 / Speaking'
      },
      {
        phrase: 'depletion of finite resources',
        meaning: 'exhaustion of non-renewable fossil energy',
        example: 'Rapid industrialization accelerates the depletion of finite resources worldwide.',
        cefr: 'C1',
        skill: 'Academic Reading'
      }
    ]
  },
  technology: {
    label: 'Technology & AI',
    icon: '💻',
    items: [
      {
        phrase: 'ubiquitous technological integration',
        meaning: 'technology present everywhere in daily life',
        example: 'The ubiquitous technological integration of smartphones alters cognitive focus patterns.',
        cefr: 'C2',
        skill: 'Writing Task 2'
      },
      {
        phrase: 'ethical regulatory oversight',
        meaning: 'legal and moral supervision by governing bodies',
        example: 'Autonomous algorithms require strict ethical regulatory oversight to curb algorithmic bias.',
        cefr: 'C1',
        skill: 'Speaking Part 3'
      },
      {
        phrase: 'displace conventional labor',
        meaning: 'replace traditional human jobs through automation',
        example: 'Generative AI models threaten to displace conventional labor in administrative sectors.',
        cefr: 'C1',
        skill: 'Writing Task 2'
      }
    ]
  },
  economy: {
    label: 'Global Economy',
    icon: '🌐',
    items: [
      {
        phrase: 'precipitous economic contraction',
        meaning: 'sharp, sudden decline in commercial output and growth',
        example: 'Trade embargoes caused a precipitous economic contraction in import-dependent markets.',
        cefr: 'C2',
        skill: 'Writing Task 1 & 2'
      },
      {
        phrase: 'stimulate fiscal liquidity',
        meaning: 'increase the flow of money in financial markets',
        example: 'Central banks lowered lending rates to stimulate fiscal liquidity during the recession.',
        cefr: 'C1',
        skill: 'Academic Reading'
      },
      {
        phrase: 'disproportionate income disparity',
        meaning: 'unfair, severe inequality in wealth distribution',
        example: 'Unregulated real estate bubbles exacerbate disproportionate income disparity in metropolitan hubs.',
        cefr: 'C1',
        skill: 'Writing Task 2'
      }
    ]
  },
  society: {
    label: 'Society & Culture',
    icon: '🏛️',
    items: [
      {
        phrase: 'erode communal cohesion',
        meaning: 'weaken the social bonds that connect communities',
        example: 'Hyper-individualism in dense cities can gradually erode communal cohesion.',
        cefr: 'C2',
        skill: 'Speaking Part 3'
      },
      {
        phrase: 'preserve intangible cultural heritage',
        meaning: 'protect traditions, folklore, and spoken dialects',
        example: 'National endowments must preserve intangible cultural heritage from commercial dilution.',
        cefr: 'C1',
        skill: 'Writing Task 2'
      },
      {
        phrase: 'sociodemographic shift',
        meaning: 'large-scale change in population age or distribution',
        example: 'An aging population represents a major sociodemographic shift requiring healthcare overhauls.',
        cefr: 'C1',
        skill: 'Reading / Writing'
      }
    ]
  }
};

export const AcademicCollocationFinder: React.FC<AcademicCollocationFinderProps> = ({
  onShowToast,
  onNavigate
}) => {
  const [activeTheme, setActiveTheme] = useState<IELTSTheme>('education');
  const [playingPhrase, setPlayingPhrase] = useState<string | null>(null);
  const [copiedPhrase, setCopiedPhrase] = useState<string | null>(null);

  const themeData = THEME_COLLOCATIONS[activeTheme];

  const handleSpeak = (phrase: string, example: string) => {
    if (playingPhrase === phrase) return;
    setPlayingPhrase(phrase);
    soundManager.playBeep(640, 0.04);
    speakBritish(`${phrase}. ${example}`, {
      onEnd: () => setPlayingPhrase(null),
      onError: () => setPlayingPhrase(null)
    });
  };

  const handleCopy = (phrase: string) => {
    try {
      navigator.clipboard.writeText(phrase);
      setCopiedPhrase(phrase);
      soundManager.playSuccess();
      onShowToast(`Copied "${phrase}" to essay scratchpad!`);
      setTimeout(() => setCopiedPhrase(null), 2000);
    } catch {
      onShowToast(`Selected "${phrase}"`);
    }
  };

  return (
    <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0B1224] border border-slate-200/90 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-3.5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <BookMarked className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Band 8.5+ Topic Collocation Explorer
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cambridge lexical items categorized by official IELTS Task 2 essay domains
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('collocations')}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 transition self-start sm:self-auto cursor-pointer"
        >
          <span>Full 500+ Dictionary</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Theme Selection Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {(Object.keys(THEME_COLLOCATIONS) as IELTSTheme[]).map((themeKey) => {
          const item = THEME_COLLOCATIONS[themeKey];
          const isSelected = activeTheme === themeKey;
          return (
            <button
              key={themeKey}
              onClick={() => {
                setActiveTheme(themeKey);
                soundManager.playBeep(520, 0.04);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition cursor-pointer ${
                isSelected
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Collocations Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {themeData.items.map((col, idx) => {
          const isPlaying = playingPhrase === col.phrase;
          const isCopied = copiedPhrase === col.phrase;
          return (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-50/80 dark:bg-[#0D182E] border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between space-y-3 group"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                    {col.cefr} · {col.skill}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSpeak(col.phrase, col.example)}
                      className={`p-1.5 rounded-lg border transition cursor-pointer ${
                        isPlaying
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-purple-600 border-slate-200 dark:border-slate-700'
                      }`}
                      title="Listen with British RP Voice"
                    >
                      <Volume2 className={`w-3.5 h-3.5 ${isPlaying ? 'animate-pulse' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleCopy(col.phrase)}
                      className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-purple-600 transition cursor-pointer"
                      title="Copy phrase"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  "{col.phrase}"
                </h4>

                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {col.meaning}
                </div>
              </div>

              <div className="text-[11px] text-slate-600 dark:text-slate-300 italic pt-2 border-t border-slate-200/50 dark:border-slate-800">
                "{col.example}"
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
