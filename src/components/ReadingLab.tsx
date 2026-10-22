import React, { useState } from 'react';
import { Highlighter, Trash2, CheckCircle2, XCircle, Info, Sparkles, HelpCircle } from 'lucide-react';
import { CefrTerm } from '../types';
import { soundManager } from '../utils/audioEffects';
import { addMistake } from '../utils/vaultStorage';
import { questionEngine } from '../services/QuestionEngine';

interface ReadingLabProps {
  onShowToast: (msg: string) => void;
}

export const ReadingLab: React.FC<ReadingLabProps> = ({ onShowToast }) => {
  const [activeTooltip, setActiveTooltip] = useState<CefrTerm | null>(null);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [q1, setQ1] = useState<string>('');
  const [q2, setQ2] = useState<string>('');
  const [q3, setQ3] = useState<string>('');
  const [q4, setQ4] = useState<string>('');
  const [checked, setChecked] = useState(false);

  const cefrTerms: { [key: string]: CefrTerm } = {
    anthropogenic: {
      word: 'Anthropogenic',
      level: 'C2',
      phonetic: '/ˌæn.θrə.pəˈdʒen.ɪk/',
      banglaMeaning: 'মানুষের কর্মকাণ্ডের ফলে সৃষ্ট (মানবসৃষ্ট পরিবেশ দূষণ বা জলবায়ু পরিবর্তন)',
      definition: 'Originating in human activity; chiefly referring to environmental pollution, greenhouse emissions, and ecological degradation.',
      collocations: ['anthropogenic emissions', 'anthropogenic climate change', 'anthropogenic pressure'],
      sample: 'Scientists attribute the accelerated decline of aquatic ecosystems directly to anthropogenic disturbances.'
    },
    'keystone species': {
      word: 'Keystone Species',
      level: 'C1',
      phonetic: '/ˈkiː.stəʊn ˈspiː.ʃiːz/',
      banglaMeaning: 'বাস্তুতন্ত্রের ভিত্তিপ্রস্তর প্রজাতি (যাদের অনুপস্থিতিতে পুরো ইকোসিস্টেম বিপন্ন হয়)',
      definition: 'A species on which other species in an ecosystem largely depend, such that if it were removed the ecosystem would change drastically.',
      collocations: ['apex keystone species', 'reintroduce keystone species', 'keystone ecological role'],
      sample: 'The grey wolf operates as a classic keystone species, regulating ungulate populations.'
    },
    biodiversity: {
      word: 'Biodiversity',
      level: 'B2',
      phonetic: '/ˌbaɪ.əʊ.daɪˈvɜː.sə.ti/',
      banglaMeaning: 'জীববৈচিত্র্য (একটি নির্দিষ্ট প্রাকৃতিক আবাসে উদ্ভিদ ও প্রাণীর বৈচিত্র্যময় সহাবস্থান)',
      definition: 'The variety of plant and animal life in the world or in a particular habitat, considered vital for ecological stability.',
      collocations: ['preserve biodiversity', 'biodiversity hotspot', 'loss of biodiversity'],
      sample: 'Restoring ancient riverbeds significantly fosters local biodiversity.'
    },
    mitigate: {
      word: 'Mitigate',
      level: 'C1',
      phonetic: '/ˈmɪt.ɪ.ɡeɪt/',
      banglaMeaning: 'হ্রাস করা / উপশম করা / ক্ষতিকর প্রভাব লাঘব করা',
      definition: 'Make something bad less severe, serious, or painful; alleviate or cushion negative impacts.',
      collocations: ['mitigate risks', 'mitigate climate impacts', 'mitigate flood damage'],
      sample: 'Restoring wetlands helps mitigate catastrophic downstream flooding during seasonal storms.'
    },
    resilience: {
      word: 'Resilience',
      level: 'C1',
      phonetic: '/rɪˈzɪl.jəns/',
      banglaMeaning: 'প্রতিকূলতা সহ্য করে ঘুরে দাঁড়ানোর ক্ষমতা / স্থিতিস্থাপকতা',
      definition: 'The capacity of an ecosystem or organism to recover quickly from difficulties, shocks, or climatic extremes.',
      collocations: ['ecological resilience', 'foster resilience', 'climate resilience'],
      sample: 'Healthy mixed forests demonstrate far greater resilience against drought and wildfire than commercial monocultures.'
    }
  };

  const handleHighlightSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 0) {
      const selectedText = sel.toString().trim();
      setHighlights(prev => [...prev, selectedText]);
      onShowToast(`Highlighted: "${selectedText.substring(0, 30)}..."`);
    }
  };

  const handleClearHighlights = () => {
    setHighlights([]);
    onShowToast('Highlights cleared.');
  };

  const handleCheckAnswers = () => {
    setChecked(true);
    soundManager.playSuccess();

    // Rationale:
    // Q1: "Rewilding projects exclusively focus on reintroducing apex predators into agricultural landscapes."
    // Passage says: "Far from being limited to the dramatic reintroduction of apex predators, contemporary rewilding encompasses multifaceted strategies including dam removal, natural reforestation, and reviving river meanders." -> FALSE (exclusively vs multifaceted)
    const isQ1Correct = q1 === 'FALSE';

    // Q2: "Anthropogenic disturbance has contributed to severe ecological destabilization."
    // Passage says: "Across the globe, ecosystems have suffered catastrophic degradation caused by anthropogenic expansion and monoculture farming." -> TRUE
    const isQ2Correct = q2 === 'TRUE';

    // Q3: "The reintroduction of European beavers has universally lowered regional flood insurance premiums."
    // Passage mentions: "Beavers build natural dams which buffer river basins against extreme deluge, mitigating flood risk." But says NOTHING about "flood insurance premiums"! -> NOT GIVEN
    const isQ3Correct = q3 === 'NOT GIVEN';

    // Q4 Paragraph Matching: Which paragraph analyzes the economic implications and policy debate?
    // Paragraph D explicitly discusses: "Critics argue that rewilding conflicts with agricultural food security... necessitating compensation schemes." -> D
    const isQ4Correct = q4 === 'D';

    // Save mistakes
    if (!isQ1Correct) {
      addMistake({
        module: 'reading',
        title: 'TFNG Trap: Qualifying Words (Exclusively vs. Multifaceted)',
        userAnswer: q1 || '(empty)',
        correctAnswer: 'FALSE',
        explanation: 'The passage explicitly says rewilding is "far from being limited to" apex predators and includes dam removal and reforestation.'
      });
    }
    if (!isQ2Correct) {
      addMistake({
        module: 'reading',
        title: 'TFNG Agreement: Anthropogenic Impact',
        userAnswer: q2 || '(empty)',
        correctAnswer: 'TRUE',
        explanation: 'Passage affirms ecosystems suffered catastrophic degradation caused by anthropogenic expansion.'
      });
    }
    if (!isQ3Correct) {
      addMistake({
        module: 'reading',
        title: 'TFNG Trap: Extrapolated Information (Insurance Premiums)',
        userAnswer: q3 || '(empty)',
        correctAnswer: 'NOT GIVEN',
        explanation: 'The passage notes beavers mitigate flood risk, but makes ZERO mention of insurance costs or premiums. Never assume!'
      });
    }
    if (!isQ4Correct) {
      addMistake({
        module: 'reading',
        title: 'Paragraph Matching: Economic & Policy Debate',
        userAnswer: q4 || '(empty)',
        correctAnswer: 'Paragraph D',
        explanation: 'Paragraph D analyzes farmer opposition, land subsidies, and national agricultural food security policies.'
      });
    }

    // Record in QuestionEngine
    const attempts = [
      { id: 'rdg_q1', ans: q1, isCor: isQ1Correct, prompt: 'TFNG: Exclusively apex predators', type: 'true_false_not_given' },
      { id: 'rdg_q2', ans: q2, isCor: isQ2Correct, prompt: 'TFNG: Anthropogenic disturbance impact', type: 'true_false_not_given' },
      { id: 'rdg_q3', ans: q3, isCor: isQ3Correct, prompt: 'TFNG: Insurance premiums reduction', type: 'true_false_not_given' },
      { id: 'rdg_q4', ans: q4, isCor: isQ4Correct, prompt: 'Matching Paragraph: Economic implications', type: 'matching_headings' }
    ];

    attempts.forEach(a => {
      questionEngine.recordAttempt({
        questionId: a.id,
        module: 'reading',
        questionType: a.type,
        topic: 'Ecosystem Rewilding & Biodiversity',
        userAnswer: a.ans || '(empty)',
        isCorrect: a.isCor,
        explanation: 'Academic Reading diagnostic analysis',
        skipMistakeVault: true
      });
    });

    onShowToast('Reading scored! Errors logged into Mistake Vault.');
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" /> Computer-Delivered Reading Lab
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            Module 4: Reading Lab & In-Situ CEFR Scanner
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Practice split-pane scanning, live highlighting, and click underlined vocabulary to inspect CEFR B2–C2 academic credentials.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleHighlightSelection}
            className="px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs flex items-center gap-1.5 transition border border-amber-300"
            title="Highlight selected text"
          >
            <Highlighter className="w-4 h-4 text-amber-700" />
            <span>Highlight Selection</span>
          </button>
          <button
            onClick={handleClearHighlights}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition border border-slate-300"
            title="Clear all highlights"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Split Pane Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Authentic Academic Reading Passage */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4 max-h-[750px] overflow-y-auto">
          <div className="border-b border-slate-200 pb-3">
            <span className="text-[11px] font-bold text-slate-400 font-mono">ACADEMIC PASSAGE 1 · 450 WORDS</span>
            <h3 className="text-xl font-extrabold text-slate-900 mt-1">
              The Rise of Rewilding: Restoring Natural Ecosystems
            </h3>
            <p className="text-xs text-slate-500 italic mt-0.5">Click any underlined vocabulary for Cambridge CEFR definitions and collocations.</p>
          </div>

          <div className="space-y-4 text-sm text-slate-700 leading-relaxed font-serif">
            <p>
              <strong className="text-slate-900 font-sans font-bold">[A]</strong> Across the globe, native wilderness has suffered catastrophic degradation caused by{' '}
              <button
                onClick={() => setActiveTooltip(cefrTerms['anthropogenic'])}
                className="underline decoration-emerald-500 decoration-2 font-bold text-emerald-800 hover:bg-emerald-100 rounded px-0.5 transition"
              >
                anthropogenic
              </button>{' '}
              expansion, deforestation, and industrial agriculture. In response, a revolutionary conservation paradigm termed "rewilding" has rapidly ascended within international ecological policy. Rather than managing habitats through artificial human intervention, rewilding advocates stepping back to let natural processes repair degraded environments autonomously.
            </p>

            <p>
              <strong className="text-slate-900 font-sans font-bold">[B]</strong> Far from being limited to the dramatic reintroduction of apex predators into rural landscapes, contemporary rewilding encompasses multifaceted strategies. These include the removal of obsolete hydroelectric dams, restoring natural river meanders, and the reintroduction of essential{' '}
              <button
                onClick={() => setActiveTooltip(cefrTerms['keystone species'])}
                className="underline decoration-indigo-500 decoration-2 font-bold text-indigo-800 hover:bg-indigo-100 rounded px-0.5 transition"
              >
                keystone species
              </button>{' '}
              such as the European beaver. Beavers act as ecosystem engineers; their wood dams decelerate water flow, creating sprawling wetland networks that dramatically boost regional{' '}
              <button
                onClick={() => setActiveTooltip(cefrTerms['biodiversity'])}
                className="underline decoration-blue-500 decoration-2 font-bold text-blue-800 hover:bg-blue-100 rounded px-0.5 transition"
              >
                biodiversity
              </button>.
            </p>

            <p>
              <strong className="text-slate-900 font-sans font-bold">[C]</strong> Crucially, these revitalized wetlands act as natural buffers against severe climatic disruption. During seasonal deluges, beaver ponds absorb excessive precipitation, which serves to{' '}
              <button
                onClick={() => setActiveTooltip(cefrTerms['mitigate'])}
                className="underline decoration-amber-500 decoration-2 font-bold text-amber-800 hover:bg-amber-100 rounded px-0.5 transition"
              >
                mitigate
              </button>{' '}
              catastrophic downstream flash floods. Furthermore, during periods of prolonged summer heatwaves, the stored water replenishes subterranean aquifers, reinforcing broader ecological{' '}
              <button
                onClick={() => setActiveTooltip(cefrTerms['resilience'])}
                className="underline decoration-rose-500 decoration-2 font-bold text-rose-800 hover:bg-rose-100 rounded px-0.5 transition"
              >
                resilience
              </button>{' '}
              against arid conditions and wildfires.
            </p>

            <p>
              <strong className="text-slate-900 font-sans font-bold">[D]</strong> Nonetheless, the approach is not without substantial controversy. Pastoral farmers argue that expanding wild habitats poses an existential threat to livestock grazing and national food sovereignty. Policy debates currently center on whether governments should redirect agricultural subsidy schemes to compensate rural landowners who convert productive farmland into rewilded biological corridors.
            </p>
          </div>
        </div>

        {/* Right Pane: Question Suite & Vocabulary Modal */}
        <div className="lg:col-span-5 space-y-4">
          {/* CEFR Floating Tooltip Card */}
          {activeTooltip && (
            <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-xl border border-slate-700 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-amber-300">{activeTooltip.word}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-600 text-white">
                    CEFR {activeTooltip.level}
                  </span>
                </div>
                <button
                  onClick={() => setActiveTooltip(null)}
                  className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 bg-slate-800 rounded-lg"
                >
                  Close
                </button>
              </div>
              <div className="mt-2 text-xs font-mono text-slate-400">{activeTooltip.phonetic}</div>
              
              {/* Bangla Meaning Box */}
              <div className="mt-2 p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-start gap-1.5">
                <span className="font-bold text-amber-300 shrink-0">বাংলা অর্থ:</span>
                <span>{activeTooltip.banglaMeaning}</span>
              </div>

              <p className="mt-2 text-xs text-slate-200 leading-relaxed">{activeTooltip.definition}</p>
              <div className="mt-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Academic Collocations:</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {activeTooltip.collocations.map((col, idx) => (
                    <span key={idx} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-emerald-300 border border-slate-700">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Questions Container */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded">Questions 1-3</span>
              <h4 className="text-base font-bold text-slate-900 mt-1">True / False / Not Given</h4>
              <p className="text-xs text-slate-500">Do the following statements agree with the information in the passage?</p>
            </div>

            {/* Q1 */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <p className="text-xs font-medium text-slate-800">
                <strong>1.</strong> Rewilding projects exclusively focus on reintroducing apex predators into agricultural landscapes.
              </p>
              <div className="flex gap-2">
                {['TRUE', 'FALSE', 'NOT GIVEN'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => setQ1(opt)}
                    className={`flex-1 min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold border transition ${q1 === opt ? 'bg-blue-700 text-white border-blue-700 shadow-xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {checked && (
                <div className={`text-xs p-2 rounded-lg ${q1 === 'FALSE' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                  {q1 === 'FALSE' ? '✓ Correct: FALSE' : '✗ Incorrect: FALSE'}
                  <div className="text-[11px] mt-0.5 text-slate-600">
                    <strong>Evidence:</strong> Paragraph B states it is "far from being limited to apex predators... encompasses multifaceted strategies".
                  </div>
                </div>
              )}
            </div>

            {/* Q2 */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <p className="text-xs font-medium text-slate-800">
                <strong>2.</strong> Anthropogenic disturbance has contributed to severe ecological destabilization.
              </p>
              <div className="flex gap-2">
                {['TRUE', 'FALSE', 'NOT GIVEN'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => setQ2(opt)}
                    className={`flex-1 min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold border transition ${q2 === opt ? 'bg-blue-700 text-white border-blue-700 shadow-xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {checked && (
                <div className={`text-xs p-2 rounded-lg ${q2 === 'TRUE' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                  {q2 === 'TRUE' ? '✓ Correct: TRUE' : '✗ Incorrect: TRUE'}
                  <div className="text-[11px] mt-0.5 text-slate-600">
                    <strong>Evidence:</strong> Paragraph A affirms wilderness suffered catastrophic degradation caused by anthropogenic expansion.
                  </div>
                </div>
              )}
            </div>

            {/* Q3 */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <p className="text-xs font-medium text-slate-800">
                <strong>3.</strong> The reintroduction of European beavers has universally lowered regional flood insurance premiums.
              </p>
              <div className="flex gap-2">
                {['TRUE', 'FALSE', 'NOT GIVEN'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => setQ3(opt)}
                    className={`flex-1 min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold border transition ${q3 === opt ? 'bg-blue-700 text-white border-blue-700 shadow-xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {checked && (
                <div className={`text-xs p-2 rounded-lg ${q3 === 'NOT GIVEN' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                  {q3 === 'NOT GIVEN' ? '✓ Correct: NOT GIVEN' : '✗ Incorrect: NOT GIVEN'}
                  <div className="text-[11px] mt-0.5 text-slate-600">
                    <strong>Evidence:</strong> Paragraph C mentions flood mitigation, but insurance premiums are never mentioned!
                  </div>
                </div>
              )}
            </div>

            {/* Q4 Paragraph Matching */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold text-indigo-700 uppercase">Question 4: Paragraph Matching</span>
              <p className="text-xs font-medium text-slate-800">
                Which paragraph highlights financial debates and friction with the agricultural sector?
              </p>
              <div className="flex gap-2">
                {['A', 'B', 'C', 'D'].map(p => (
                  <button
                    key={p}
                    onClick={() => setQ4(p)}
                    className={`flex-1 min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold border transition ${q4 === p ? 'bg-indigo-700 text-white border-indigo-700 shadow-xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}`}
                  >
                    Paragraph {p}
                  </button>
                ))}
              </div>
              {checked && (
                <div className={`text-xs p-2 rounded-lg ${q4 === 'D' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                  {q4 === 'D' ? '✓ Correct: Paragraph D' : '✗ Incorrect: Paragraph D'}
                </div>
              )}
            </div>

            <button
              onClick={handleCheckAnswers}
              className="w-full min-h-[44px] py-3.5 px-4 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition active:scale-95"
            >
              Verify Reading Answers & Log Vault
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
