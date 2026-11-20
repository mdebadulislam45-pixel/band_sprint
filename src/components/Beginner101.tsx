import React, { useState } from 'react';
import { BookOpen, GraduationCap, Laptop, Award, ShieldAlert, Search, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

interface Beginner101Props {
  onNavigate: (module: string) => void;
}

export const Beginner101: React.FC<Beginner101Props> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'comparison' | 'scale' | 'glossary' | 'rules'>('comparison');
  const [formatSubTab, setFormatSubTab] = useState<'acad_gt' | 'cd_paper'>('acad_gt');
  const [glossarySearch, setGlossarySearch] = useState('');
  const [glossaryFilter, setGlossaryFilter] = useState<'all' | 'scoring' | 'structure' | 'strategy'>('all');

  const glossaryItems = [
    {
      term: 'TFNG (True / False / Not Given)',
      category: 'structure',
      banglaMeaning: 'True (হুবহু একমত), False (সরাসরি বিপরীত), Not Given (তথ্য অনুপস্থিত)',
      def: 'Academic Reading question type. TRUE = exact match of fact; FALSE = direct opposite or factual contradiction; NOT GIVEN = passage neither confirms nor denies the claim.',
      tip: 'Never assume outside common sense! If it cannot be proven from the text, it is NOT GIVEN.'
    },
    {
      term: 'Self-Correction Distractor',
      category: 'strategy',
      banglaMeaning: 'সেলফ-কারেকশন ফাঁদ (বক্তা প্রথমে একটি তথ্য দিয়ে পরে নিজেই শুধরে নেওয়া)',
      def: 'A deliberate trap in Listening Part 1 & 2 where the speaker states an initial piece of info, then immediately corrects themselves (e.g. "Meet me at 14 Elm... wait, they moved to 40 Elm").',
      tip: 'Always wait for the speaker to finalize the sentence before writing your answer.'
    },
    {
      term: 'Cue Card (Candidate Task Card)',
      category: 'structure',
      banglaMeaning: 'কিউ কার্ড (স্পিকিং পার্ট ২ এর ১ মিনিট প্রস্তুতি ও ২ মিনিট বলার টপিক কার্ড)',
      def: 'Speaking Part 2 prompt card containing a central topic with 3-4 bullet point prompts. The candidate has exactly 60 seconds to prepare and up to 2 minutes to speak.',
      tip: 'Do not write full sentences in the 1 minute prep! Write rapid shorthand keywords.'
    },
    {
      term: 'Transfer Time (10m vs 2m)',
      category: 'structure',
      banglaMeaning: 'উত্তর স্থানান্তরের সময় (পেপার টেস্টে ১০ মিনিট বনাম কম্পিউটারে মাত্র ২ মিনিট)',
      def: 'In Paper-based Listening, you get 10 minutes at the end to transfer answers from the question sheet to the answer sheet. In Computer-delivered, you only get 2 minutes to review on screen!',
      tip: 'On Computer, type answers directly into the input boxes during the audio.'
    },
    {
      term: 'TR / TA (Task Response / Task Achievement)',
      category: 'scoring',
      banglaMeaning: 'টাস্ক রেসপন্স / অ্যাচিভমেন্ট (প্রশ্নের সকল অংশের সুনির্দিষ্ট ও পর্যাপ্ত জবাব)',
      def: 'Writing evaluation criterion (25%). TR applies to Task 2 (answering all parts of the prompt with a clear position throughout). TA applies to Task 1 (presenting an overview with accurate data).',
      tip: 'Failing to include a clear Overview in Task 1 caps your score at Band 5.0 for TA.'
    },
    {
      term: 'CC (Coherence & Cohesion)',
      category: 'scoring',
      banglaMeaning: 'কোহেরেন্স ও কোহেশন (যুক্তির স্পষ্ট ধারাবাহিকতা ও সঠিক প্যারাগ্রাফিং)',
      def: 'Writing evaluation criterion (25%). Assesses logical progression of ideas, cohesive linking devices (furthermore, conversely), and clear paragraphing with one central topic per paragraph.',
      tip: 'Avoid mechanical or forced linkers at the start of every single sentence.'
    },
    {
      term: 'LR (Lexical Resource)',
      category: 'scoring',
      banglaMeaning: 'লেক্সিক্যাল রিসোর্স (উচ্চমানের শব্দভাণ্ডার ও প্রাসঙ্গিক কোলোকেশন)',
      def: 'Evaluates the range and precision of vocabulary, academic collocations, and the rarity of spelling errors in both Writing and Speaking.',
      tip: 'Precision beats obscure thesaurus words. Collocations like "conduct research" or "pressing dilemma" yield Band 8+.'
    },
    {
      term: 'GRA (Grammatical Range & Accuracy)',
      category: 'scoring',
      banglaMeaning: 'গ্রামাটিক্যাল রেঞ্জ ও নির্ভুলতা (জটিল ও নির্ভুল বাক্য গঠনের অনুপাত)',
      def: 'Evaluates your balance of simple, compound, and complex sentence structures, tense consistency, and error-free sentences.',
      tip: 'You need a high proportion of completely error-free sentences to reach Band 7.0+.'
    },
    {
      term: 'OSR (One Skill Retake)',
      category: 'strategy',
      banglaMeaning: 'ওয়ান স্কিল রিটেক (কম্পিউটার টেস্টে ৬০ দিনের মধ্যে যেকোনো একটি মডিউল পুনরায় দেওয়ার সুবিধা)',
      def: 'A modern IELTS innovation enabling candidates who took Computer-delivered IELTS to retake only ONE of the four skills (L, R, W, or S) within 60 days if one score was disappointing.',
      tip: 'Accepted by many universities and immigration bodies in Canada, UK, and Australia.'
    },
    {
      term: 'UPPERCASE Strategy',
      category: 'strategy',
      banglaMeaning: 'সব বড় হাতের অক্ষরে লেখার কৌশল (স্পেলিং ও হাতের লেখার মার্ক সুরক্ষিত রাখা)',
      def: 'The technique of writing all Listening and Reading answers in ALL CAPITAL LETTERS (e.g., "PARKING LOT").',
      tip: 'Eliminates deductions caused by poor handwriting or ambiguous capitalization (e.g. capitalizing proper nouns).'
    }
  ];

  const filteredGlossary = glossaryItems.filter(item => {
    const matchesSearch = item.term.toLowerCase().includes(glossarySearch.toLowerCase()) || item.def.toLowerCase().includes(glossarySearch.toLowerCase());
    const matchesFilter = glossaryFilter === 'all' || item.category === glossaryFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="w-full max-w-full space-y-6 sm:space-y-8 animate-fadeIn overflow-x-hidden">
      {/* Hero Onboarding Card */}
      <div className="w-full max-w-full bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 rounded-3xl p-5 sm:p-8 md:p-10 text-white shadow-xl relative overflow-hidden box-border">
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 w-full min-w-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-700/60 border border-blue-500/30 text-blue-200 text-xs font-semibold mb-3 sm:mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            Zero-Knowledge Foundation & Launchpad
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight break-words">
            Master the IELTS Framework. <br />
            <span className="text-amber-300">From Zero to Band 8.5+.</span>
          </h1>
          <p className="mt-3 sm:mt-4 text-blue-100 text-xs sm:text-sm md:text-base leading-relaxed break-words">
            The International English Language Testing System (IELTS) is jointly managed by the <strong>British Council</strong>, <strong>IDP: IELTS Australia</strong>, and <strong>Cambridge Assessment English</strong>. Recognized by over 11,500 institutions and governments across 140+ countries. Valid for 2 full years.
          </p>
          <div className="mt-5 sm:mt-6 flex flex-wrap gap-2.5 sm:gap-3">
            <button
              onClick={() => onNavigate('slides')}
              className="min-h-[44px] px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition flex items-center gap-2 active:scale-95"
            >
              Start Slide Guide <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className="min-h-[44px] px-5 py-3 rounded-xl bg-blue-800/80 hover:bg-blue-700 border border-blue-400/30 text-white font-semibold text-xs sm:text-sm transition active:scale-95"
            >
              Test-Day Survival Rules
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="w-full max-w-full overflow-x-auto scrollbar-none border-b border-slate-200 pb-2 box-border">
        <div className="flex items-center gap-2 w-max flex-nowrap min-w-0">
          <button
            onClick={() => setActiveTab('comparison')}
            className={`min-h-[44px] px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap transition ${activeTab === 'comparison' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Format Comparisons
          </button>
          <button
            onClick={() => setActiveTab('scale')}
            className={`min-h-[44px] px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap transition ${activeTab === 'scale' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Band 1.0 - 9.0 Scale Demystified
          </button>
          <button
            onClick={() => setActiveTab('glossary')}
            className={`min-h-[44px] px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap transition ${activeTab === 'glossary' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Interactive Jargon Glossary
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`min-h-[44px] px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap transition ${activeTab === 'rules' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Test-Day Survival Rules
          </button>
        </div>
      </div>

      {/* Tab 1: Comparison Matrix */}
      {activeTab === 'comparison' && (
        <div className="space-y-5 sm:space-y-6 w-full min-w-0">
          <div className="flex flex-col sm:flex-row gap-2.5 w-full">
            <button
              onClick={() => setFormatSubTab('acad_gt')}
              className={`min-h-[44px] flex-1 py-3 px-4 text-xs sm:text-sm font-bold rounded-xl border text-center transition ${formatSubTab === 'acad_gt' ? 'bg-blue-50 border-blue-600 text-blue-800 shadow-2xs' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Academic vs. General Training (GT)
            </button>
            <button
              onClick={() => setFormatSubTab('cd_paper')}
              className={`min-h-[44px] flex-1 py-3 px-4 text-xs sm:text-sm font-bold rounded-xl border text-center transition ${formatSubTab === 'cd_paper' ? 'bg-blue-50 border-blue-600 text-blue-800 shadow-2xs' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Computer-Delivered vs. Paper-Based
            </button>
          </div>

          {formatSubTab === 'acad_gt' && (
            <div className="space-y-4 w-full">
              {/* Critical Callout */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3 w-full">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm leading-relaxed min-w-0">
                  <span className="font-bold">CRITICAL EXAM FACT:</span> Listening and Speaking tests are <strong>100% IDENTICAL</strong> in both Academic and General Training! The scoring, timings, and question pools are completely shared. Only Reading passages (longer academic journals vs. shorter workplace texts) and Writing Task 1 (academic chart/process report vs. formal/informal letter) differ.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm w-full min-w-0">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold shrink-0">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 text-base sm:text-lg truncate">IELTS Academic</h3>
                      <p className="text-xs text-slate-500 truncate">For Higher Education & Professional Licensing</p>
                    </div>
                  </div>
                  <ul className="space-y-3 text-xs sm:text-sm text-slate-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="min-w-0 break-words"><strong>Purpose:</strong> Undergraduate, Master's, PhD admissions, and medical/nursing regulatory councils (GMC, NMC, AHPRA).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="min-w-0 break-words"><strong>Reading:</strong> 3 long academic texts sourced from scientific journals, books, and analytical magazines. Dense academic vocabulary.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="min-w-0 break-words"><strong>Writing Task 1:</strong> 150-word analytical report summarizing visual data (bar graphs, line charts, pie charts, tables, maps, or manufacturing processes).</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm w-full min-w-0">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 text-base sm:text-lg truncate">IELTS General Training (GT)</h3>
                      <p className="text-xs text-slate-500 truncate">For Permanent Residency & Skilled Migration</p>
                    </div>
                  </div>
                  <ul className="space-y-3 text-xs sm:text-sm text-slate-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="min-w-0 break-words"><strong>Purpose:</strong> Immigration visas (Canada Express Entry / CLB points, Australia PR Subclass 189/190, New Zealand, UK Skilled Worker).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="min-w-0 break-words"><strong>Reading:</strong> Everyday texts (employee handbooks, job descriptions, advertisements, public notices) with one longer narrative in Section 3.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="min-w-0 break-words"><strong>Writing Task 1:</strong> 150-word letter (formal, semi-formal, or informal) addressing a realistic social scenario (e.g. complaining to a landlord, inquiring about a job).</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {formatSubTab === 'cd_paper' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm w-full min-w-0">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold shrink-0">
                    <Laptop className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-base sm:text-lg truncate">Computer-Delivered IELTS</h3>
                    <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">Recommended for Fast Typists</span>
                  </div>
                </div>
                <ul className="space-y-3 text-xs sm:text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-slate-800 w-24 shrink-0">Results:</span>
                    <span className="min-w-0 break-words">Lightning fast — available in <strong>1 to 5 calendar days</strong> online.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-slate-800 w-24 shrink-0">Writing:</span>
                    <span className="min-w-0 break-words">Live automatic word counter on screen. Easy cut/copy/paste editing. Zero hand cramps or eraser smudges.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-slate-800 w-24 shrink-0">Listening:</span>
                    <span className="min-w-0 break-words">High-fidelity private over-ear noise-canceling headphones with volume knob at your desk.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-slate-800 w-24 shrink-0">One Skill Retake:</span>
                    <span className="min-w-0 break-words">Eligible for OSR within 60 days if a single module score needs improvement.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm w-full min-w-0">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-base sm:text-lg truncate">Paper-Based IELTS</h3>
                    <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">Traditional Format</span>
                  </div>
                </div>
                <ul className="space-y-3 text-xs sm:text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-slate-800 w-24 shrink-0">Results:</span>
                    <span className="min-w-0 break-words">Requires exactly <strong>13 calendar days</strong> from the test date.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-slate-800 w-24 shrink-0">Writing:</span>
                    <span className="min-w-0 break-words">Written by hand with 2B pencil. You must count your words manually or estimate lines.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-slate-800 w-24 shrink-0">Listening:</span>
                    <span className="min-w-0 break-words">Audio played via room loudspeakers in some centers (potential echo), with 10 minutes transfer time at the end.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-slate-800 w-24 shrink-0">One Skill Retake:</span>
                    <span className="min-w-0 break-words">NOT available for paper format. If you miss your target by 0.5, you must retake all 4 modules.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Band Scale */}
      {activeTab === 'scale' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Practice Band 1.0 – 9.0 Descriptor Grid</h2>
            <p className="text-sm text-slate-500 mt-1">There is no "Pass" or "Fail" in IELTS. Each institution establishes their bespoke threshold.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Expert & Very Good</span>
                <span className="font-mono text-xl font-extrabold text-blue-900">8.0 - 9.0</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                Full operational command with only occasional unsystematic inaccuracies. Handles complex detailed argumentation with effortless fluency. Required for Oxbridge, Ivy League, and medical residency.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Good & Competent</span>
                <span className="font-mono text-xl font-extrabold text-emerald-900">6.5 - 7.5</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                Operational command despite occasional inappropriate collocations or misunderstandings in complex situations. Canada Express Entry CLB 9 target (L:8.0, R:7.0, W:7.0, S:7.0).
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Modest & Borderline</span>
                <span className="font-mono text-xl font-extrabold text-amber-900">5.0 - 6.0</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                Partial command; copes with overall meaning in familiar contexts. Frequent grammatical errors and lexical repetition. Accepted for foundation courses or vocational diplomas.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span><strong>Practice Rounding Rule:</strong> Overall band is the arithmetic average of the 4 sub-scores. Fractions ending in .25 round UP to .5 (e.g. 6.25 ➔ 6.5). Fractions ending in .75 round UP to next whole band (e.g. 6.75 ➔ 7.0).</span>
          </div>
        </div>
      )}

      {/* Tab 3: Jargon Glossary */}
      {activeTab === 'glossary' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Interactive IELTS Jargon Glossary</h2>
              <p className="text-sm text-slate-500">Every examiner acronym, testing convention, and scoring code defined.</p>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={glossarySearch}
                onChange={(e) => setGlossarySearch(e.target.value)}
                placeholder="Search acronyms or rules..."
                className="pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 w-full sm:w-64"
              />
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {(['all', 'scoring', 'structure', 'strategy'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setGlossaryFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize border transition ${glossaryFilter === filter ? 'bg-blue-700 border-blue-700 text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'}`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGlossary.map((item, idx) => (
              <div key={idx} className="p-4 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">{item.term}</h4>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">
                    {item.category}
                  </span>
                </div>
                {item.banglaMeaning && (
                  <div className="mt-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold text-xs">
                    <span className="text-[10px] font-mono text-emerald-700 uppercase mr-1">বাংলা অর্থ:</span>
                    <span>{item.banglaMeaning}</span>
                  </div>
                )}
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">{item.def}</p>
                <div className="mt-3 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800">
                  <strong>Examiner Pro-Tip:</strong> {item.tip}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Survival Rules */}
      {activeTab === 'rules' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Test-Day Survival Regulations</h2>
            <p className="text-sm text-slate-500">Strict invigilator guidelines. Infringing any of these rules causes immediate cancellation without appeal.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/50">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm mb-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                1. Original Physical ID / Passport Mandate
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                You must present the <strong>exact physical passport or national ID card</strong> used during registration. Digital copies on your phone, notarized photocopies, or student IDs are rejected on sight.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-blue-200 bg-blue-50/50">
              <div className="flex items-center gap-2 text-blue-800 font-bold text-sm mb-2">
                <Award className="w-5 h-5 text-blue-600" />
                2. Transparent Water Bottle Protocol
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Only completely transparent, clear plastic bottles are permitted inside the examination hall. All brand labels, stickers, and plastic wrappers must be peeled off before entry.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/50">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                3. The UPPERCASE Capitalization Hack
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                In both Listening and Reading, answers written in <strong>ALL CAPITAL LETTERS</strong> (e.g., <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-300">SUNFLOWER</code>) are 100% permitted. This completely protects you from losing marks due to ambiguous handwriting or forgetting to capitalize proper nouns!
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/50">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm mb-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                4. Bathroom Break Timing Restrictions
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                The test clock never stops for bathroom breaks. Breaks are strictly <strong>prohibited</strong> during test instructions, throughout the entire Listening test, and during the first and last 10 minutes of Reading and Writing.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
