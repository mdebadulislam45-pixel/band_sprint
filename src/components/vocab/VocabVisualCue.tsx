import React from 'react';
import {
  Sparkles,
  Zap,
  Globe,
  TrendingUp,
  Cpu,
  Leaf,
  Brain,
  Building,
  GraduationCap,
  Scale,
  Smile,
  Shield,
  Palette,
  Eye,
  Rocket,
  Compass,
  Award,
  AlertCircle,
  HelpCircle,
  Coffee,
  Heart,
  Briefcase,
  Layers,
  Lightbulb,
  BookOpen
} from 'lucide-react';

export interface VisualAsset {
  theme: string;
  gradient: string;
  bgTint: string;
  borderTint: string;
  iconBg: string;
  badgeBg: string;
  badgeText: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
  mnemonicHint: string;
}

/**
 * Returns a high-context visual theme, mnemonic visual cue, and symbolic iconography
 * for vocabulary words, idioms, and discourse phrases.
 */
export function getVisualAssetForVocab(item: string, topic?: string, category?: string): VisualAsset {
  const text = `${item} ${topic || ''} ${category || ''}`.toLowerCase();

  // 1. Technology, AI, Digital, Robotics
  if (
    text.includes('tech') ||
    text.includes('ai') ||
    text.includes('comput') ||
    text.includes('robot') ||
    text.includes('ubiquitous') ||
    text.includes('digital') ||
    text.includes('algorithm') ||
    text.includes('software') ||
    text.includes('virtual')
  ) {
    return {
      theme: 'Tech & Modernity',
      gradient: 'from-blue-600 via-indigo-600 to-cyan-500',
      bgTint: 'bg-blue-50/80',
      borderTint: 'border-blue-200',
      iconBg: 'bg-blue-600 text-white',
      badgeBg: 'bg-blue-100 text-blue-900 border-blue-200',
      badgeText: 'Technology & AI',
      icon: Cpu,
      tag: 'Digital Innovation',
      mnemonicHint: 'Think of seamless microchips & pervasive digital networks all around us'
    };
  }

  // 2. Environment, Climate, Sustainability, Nature
  if (
    text.includes('environ') ||
    text.includes('climat') ||
    text.includes('mitigat') ||
    text.includes('green') ||
    text.includes('ecolog') ||
    text.includes('pollut') ||
    text.includes('renew') ||
    text.includes('planet') ||
    text.includes('biodivers')
  ) {
    return {
      theme: 'Environment & Climate',
      gradient: 'from-emerald-600 via-teal-600 to-green-500',
      bgTint: 'bg-emerald-50/80',
      borderTint: 'border-emerald-200',
      iconBg: 'bg-emerald-600 text-white',
      badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-200',
      badgeText: 'Eco & Planet',
      icon: Leaf,
      tag: 'Sustainable Future',
      mnemonicHint: 'Picture carbon mitigation, lush forestry & climate action shields'
    };
  }

  // 3. Psychology, Mind, Resilience, Health, Emotion
  if (
    text.includes('psych') ||
    text.includes('health') ||
    text.includes('mind') ||
    text.includes('resilien') ||
    text.includes('stress') ||
    text.includes('cognit') ||
    text.includes('emot') ||
    text.includes('mental') ||
    text.includes('wellbeing')
  ) {
    return {
      theme: 'Psychology & Mind',
      gradient: 'from-violet-600 via-purple-600 to-fuchsia-500',
      bgTint: 'bg-purple-50/80',
      borderTint: 'border-purple-200',
      iconBg: 'bg-purple-600 text-white',
      badgeBg: 'bg-purple-100 text-purple-900 border-purple-200',
      badgeText: 'Cognition & Mind',
      icon: Brain,
      tag: 'Mental Agility',
      mnemonicHint: 'Imagine neural resilience springing back like a steel coil under pressure'
    };
  }

  // 4. Urban, Architecture, Society, City
  if (
    text.includes('urban') ||
    text.includes('city') ||
    text.includes('architect') ||
    text.includes('infrastruct') ||
    text.includes('build') ||
    text.includes('traffic') ||
    text.includes('housing')
  ) {
    return {
      theme: 'Urban Infrastructure',
      gradient: 'from-amber-600 via-orange-600 to-yellow-500',
      bgTint: 'bg-amber-50/80',
      borderTint: 'border-amber-200',
      iconBg: 'bg-amber-600 text-white',
      badgeBg: 'bg-amber-100 text-amber-900 border-amber-200',
      badgeText: 'City & Society',
      icon: Building,
      tag: 'Metropolitan Life',
      mnemonicHint: 'Visualize modern skyscrapers, sustainable urban planning and highways'
    };
  }

  // 5. Academic, Education, Research, Debate
  if (
    text.includes('academ') ||
    text.includes('educat') ||
    text.includes('scholar') ||
    text.includes('univers') ||
    text.includes('study') ||
    text.includes('theor') ||
    text.includes('hypothes') ||
    text.includes('lectur')
  ) {
    return {
      theme: 'Academic Scholarship',
      gradient: 'from-indigo-700 via-blue-700 to-sky-600',
      bgTint: 'bg-indigo-50/80',
      borderTint: 'border-indigo-200',
      iconBg: 'bg-indigo-700 text-white',
      badgeBg: 'bg-indigo-100 text-indigo-900 border-indigo-200',
      badgeText: 'Higher Education',
      icon: GraduationCap,
      tag: 'Rigorous Research',
      mnemonicHint: 'Picture university lecture halls, empirical citations and thesis evidence'
    };
  }

  // 6. Economy, Finance, Business, Trade
  if (
    text.includes('econom') ||
    text.includes('financ') ||
    text.includes('money') ||
    text.includes('market') ||
    text.includes('trade') ||
    text.includes('fiscal') ||
    text.includes('invest') ||
    text.includes('fund')
  ) {
    return {
      theme: 'Global Economy',
      gradient: 'from-teal-600 via-emerald-600 to-cyan-600',
      bgTint: 'bg-teal-50/80',
      borderTint: 'border-teal-200',
      iconBg: 'bg-teal-600 text-white',
      badgeBg: 'bg-teal-100 text-teal-900 border-teal-200',
      badgeText: 'Finance & Trade',
      icon: TrendingUp,
      tag: 'Economic Trends',
      mnemonicHint: 'Think of upward growth charts, market equilibria and commercial investments'
    };
  }

  // 7. Law, Crime, Governance, Justice, Policy
  if (
    text.includes('law') ||
    text.includes('crime') ||
    text.includes('govern') ||
    text.includes('justic') ||
    text.includes('polic') ||
    text.includes('regulat') ||
    text.includes('judic')
  ) {
    return {
      theme: 'Law & Governance',
      gradient: 'from-slate-700 via-zinc-700 to-slate-900',
      bgTint: 'bg-slate-50/80',
      borderTint: 'border-slate-300',
      iconBg: 'bg-slate-800 text-white',
      badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
      badgeText: 'Legal & Policy',
      icon: Scale,
      tag: 'Statutory Justice',
      mnemonicHint: 'Envision balancing the scales of justice and enacting constitutional laws'
    };
  }

  // 8. Idioms & Metaphors (e.g. break the ice, piece of cake, blue moon)
  if (
    category === 'idiom' ||
    text.includes('ice') ||
    text.includes('moon') ||
    text.includes('cake') ||
    text.includes('rain') ||
    text.includes('cloud') ||
    text.includes('feather') ||
    text.includes('stone')
  ) {
    return {
      theme: 'Idiomatic Expression',
      gradient: 'from-rose-600 via-pink-600 to-amber-500',
      bgTint: 'bg-rose-50/80',
      borderTint: 'border-rose-200',
      iconBg: 'bg-rose-600 text-white',
      badgeBg: 'bg-rose-100 text-rose-900 border-rose-200',
      badgeText: 'Idiomatic Flair',
      icon: Sparkles,
      tag: 'Speaking Band 8+',
      mnemonicHint: 'Vivid mental imagery: use naturally in IELTS Speaking for instant native cadence'
    };
  }

  // 9. Discourse Phrases & Connectors (e.g. from my perspective, on the other hand)
  if (
    category === 'phrase' ||
    text.includes('opinion') ||
    text.includes('perspect') ||
    text.includes('hand') ||
    text.includes('contrast') ||
    text.includes('further') ||
    text.includes('agree')
  ) {
    return {
      theme: 'Discourse Marker',
      gradient: 'from-sky-600 via-blue-600 to-indigo-600',
      bgTint: 'bg-sky-50/80',
      borderTint: 'border-sky-200',
      iconBg: 'bg-sky-600 text-white',
      badgeBg: 'bg-sky-100 text-sky-900 border-sky-200',
      badgeText: 'Cohesion & Coherence',
      icon: Compass,
      tag: 'Examiner Flow',
      mnemonicHint: 'Signpost formula that bridges ideas seamlessly across IELTS criteria'
    };
  }

  // Default Fallback
  return {
    theme: 'Band 8–9 Lexical Resource',
    gradient: 'from-indigo-600 via-purple-600 to-blue-500',
    bgTint: 'bg-indigo-50/80',
    borderTint: 'border-indigo-200',
    iconBg: 'bg-indigo-600 text-white',
    badgeBg: 'bg-indigo-100 text-indigo-900 border-indigo-200',
    badgeText: 'High-Yield Lexicon',
    icon: Lightbulb,
    tag: 'Practice Standard',
    mnemonicHint: 'Master accurate collocations, natural stress, and clear contextual nuance'
  };
}

/**
 * Reusable Visual Banner / Badge for flashcards and list items
 */
export const VocabVisualBanner: React.FC<{
  item: string;
  topic?: string;
  category?: string;
  compact?: boolean;
}> = ({ item, topic, category, compact = false }) => {
  const asset = getVisualAssetForVocab(item, topic, category);
  const Icon = asset.icon;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border ${asset.bgTint} ${asset.borderTint}`}>
        <div className={`w-6 h-6 rounded-lg ${asset.iconBg} flex items-center justify-center shrink-0 shadow-2xs`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="truncate">
          <span className="text-[11px] font-bold text-slate-800 truncate block">
            {asset.theme}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${asset.bgTint} ${asset.borderTint} p-3 sm:p-3.5 transition-all`}>
      {/* Subtle background glow */}
      <div
        className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-gradient-to-br ${asset.gradient} opacity-15 blur-xl pointer-events-none`}
      />

      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${asset.gradient} text-white flex items-center justify-center shadow-xs shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full border ${asset.badgeBg}`}>
                {asset.badgeText}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {asset.tag}
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-0.5 max-w-sm line-clamp-1">
              💡 {asset.mnemonicHint}
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-white/80 px-2 py-1 rounded-lg border border-slate-200/80 shadow-2xs shrink-0">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Visual Cue</span>
        </div>
      </div>
    </div>
  );
};
