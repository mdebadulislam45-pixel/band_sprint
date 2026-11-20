import React, { useState, useEffect, useMemo } from 'react';
import { Highlighter, Trash2, Sparkles, StickyNote, Compass, BookOpen, CheckCircle2, Clock, Play, Pause, RotateCcw, Gauge, Contrast, Type, Flag } from 'lucide-react';
import { CefrTerm } from '../types';
import { soundManager } from '../utils/audioEffects';
import { addMistake } from '../utils/vaultStorage';
import { questionEngine } from '../services/QuestionEngine';
import { AskMentorContextualWidget } from './common/AskMentorPanel';
import { CandidateAiPilotPanel } from './common/CandidateAiPilotPanel';
import { CDIELTSExamMode } from './cdielts/CDIELTSExamMode';
import {
  CDIELTSColorScheme,
  CDIELTSZoomLevel,
  getCDIELTSThemeClasses,
  getCDIELTSFontSizeClass
} from './cdielts/CDIELTSThemeContainer';
import type { MockExamSet } from '../data/mockExams';

interface ReadingLabProps {
  onShowToast: (msg: string) => void;
}

type HighlightColor = 'amber' | 'emerald' | 'rose';
type ParagraphLetter = 'A' | 'B' | 'C' | 'D';

interface HighlightEntry {
  text: string;
  color: HighlightColor;
}

interface PassageTimingState {
  elapsedSeconds: number;
  questionSeconds: Record<number, number>;
  completedAtSeconds?: number;
}

const READING_TIMER_STORAGE_KEY = 'ielts_reading_lab_timers_v1';
const TARGET_SECONDS_PER_QUESTION = 90; // Practice pace: ~90s per question (20m / 13 questions)
const TARGET_PASSAGE_SECONDS = TARGET_SECONDS_PER_QUESTION * 4; // 6:00 (360s) for 4-question drill

function formatTimerClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

interface ReadingLabQuestion {
  num: 1 | 2 | 3 | 4;
  type: 'tfng' | 'matching';
  statement: string;
  correctAnswer: string;
  evidencePara: ParagraphLetter;
  trapTitle: string;
  explanationEn: string;
  explanationBn: string;
}

interface ReadingLabPassage {
  id: string;
  badge: string;
  title: string;
  topic: string;
  subtitle: string;
  paragraphs: Record<ParagraphLetter, string>;
  cefrTerms: Record<string, CefrTerm>;
  questions: [ReadingLabQuestion, ReadingLabQuestion, ReadingLabQuestion, ReadingLabQuestion];
}

const READING_LAB_PASSAGES: ReadingLabPassage[] = [
  {
    id: 'passage_rewilding',
    badge: 'CAMBRIDGE PASSAGE 1 · ECOLOGY & CONSERVATION',
    title: 'The Rise of Rewilding: Restoring Natural Ecosystems',
    topic: 'Ecosystem Rewilding & Biodiversity',
    subtitle: 'How autonomous trophic cascades and keystone engineers are reshaping European environmental policy.',
    paragraphs: {
      A: 'Across the globe, native wilderness has suffered catastrophic degradation caused by anthropogenic expansion, deforestation, and industrial agriculture. In response, a revolutionary conservation paradigm termed "rewilding" has rapidly ascended within international ecological policy. Rather than managing habitats through artificial human intervention, rewilding advocates stepping back to let natural processes repair degraded environments autonomously.',
      B: 'Far from being limited to the dramatic reintroduction of apex predators into rural landscapes, contemporary rewilding encompasses multifaceted strategies. These include the removal of obsolete hydroelectric dams, restoring natural river meanders, and the reintroduction of essential keystone species such as the European beaver. Beavers act as ecosystem engineers; their wood dams decelerate water flow, creating sprawling wetland networks that dramatically boost regional biodiversity.',
      C: 'Crucially, these revitalized wetlands act as natural buffers against severe climatic disruption. During seasonal deluges, beaver ponds absorb excessive precipitation, which serves to mitigate catastrophic downstream flash floods. Furthermore, during periods of prolonged summer heatwaves, the stored water replenishes subterranean aquifers, reinforcing broader ecological resilience against arid conditions and wildfires.',
      D: 'Nonetheless, the approach is not without substantial controversy. Pastoral farmers argue that expanding wild habitats poses an existential threat to livestock grazing and national food sovereignty. Policy debates currently center on whether governments should redirect agricultural subsidy schemes to compensate rural landowners who convert productive farmland into rewilded biological corridors.'
    },
    cefrTerms: {
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
    },
    questions: [
      {
        num: 1,
        type: 'tfng',
        statement: 'Rewilding projects exclusively focus on reintroducing apex predators into agricultural landscapes.',
        correctAnswer: 'FALSE',
        evidencePara: 'B',
        trapTitle: 'TFNG Trap: Qualifying Words (Exclusively vs. Multifaceted)',
        explanationEn: 'Paragraph B states rewilding is "far from being limited to apex predators" and explicitly encompasses dam removal and beaver reintroduction. Watch out for absolute qualifiers like "exclusively"!',
        explanationBn: 'প্রশ্নে "exclusively" (শুধুমাত্র) শব্দটি ব্যবহার করা হয়েছে, কিন্তু প্যাসেজের [B] অনুচ্ছেদে বলা হয়েছে রিউইল্ডিং কেবল শিকারি প্রাণী ফিরিয়ে আনার মধ্যে সীমাবদ্ধ নয় ("far from being limited to")।'
      },
      {
        num: 2,
        type: 'tfng',
        statement: 'Anthropogenic disturbance has contributed to severe ecological destabilization.',
        correctAnswer: 'TRUE',
        evidencePara: 'A',
        trapTitle: 'TFNG Agreement: Anthropogenic Impact',
        explanationEn: 'Paragraph A directly affirms that native wilderness has suffered catastrophic degradation caused by anthropogenic expansion.',
        explanationBn: 'প্যাসেজের [A] অনুচ্ছেদে সরাসরি বলা হয়েছে মানবসৃষ্ট ("anthropogenic") সম্প্রসারণের ফলে প্রকৃতি মারাত্মক ক্ষতির সম্মুখীন হয়েছে।'
      },
      {
        num: 3,
        type: 'tfng',
        statement: 'The reintroduction of European beavers has universally lowered regional flood insurance premiums.',
        correctAnswer: 'NOT GIVEN',
        evidencePara: 'C',
        trapTitle: 'TFNG Trap: Extrapolated Information (Insurance Premiums)',
        explanationEn: 'Paragraph C notes flood mitigation, but insurance premiums are NEVER mentioned in the text. Never extrapolate from real-world assumptions!',
        explanationBn: 'প্যাসেজের [C] অনুচ্ছেদে বন্যা ঝুঁকি হ্রাসের কথা বলা হলেও বীমা খরচ বা "insurance premiums" কমার কোনো উল্লেখ নেই।'
      },
      {
        num: 4,
        type: 'matching',
        statement: 'Which paragraph highlights financial debates and friction with the agricultural sector?',
        correctAnswer: 'D',
        evidencePara: 'D',
        trapTitle: 'Paragraph Matching: Economic & Policy Debate',
        explanationEn: 'Paragraph D analyzes pastoral farmer opposition, agricultural land subsidies, and national food sovereignty policy debates.',
        explanationBn: '[D] অনুচ্ছেদে কৃষকদের বিরোধিতা, খাদ্য নিরাপত্তা এবং সরকারি ভর্তুকি ("subsidy schemes") সংক্রান্ত নীতিগত বিতর্ক আলোচনা করা হয়েছে।'
      }
    ]
  },
  {
    id: 'passage_bilingual_brain',
    badge: 'CAMBRIDGE PASSAGE 2 · COGNITIVE NEUROLINGUISTICS',
    title: 'The Bilingual Executive: Neuroplasticity and Cognitive Reserve',
    topic: 'Neurolinguistics & The Bilingual Brain',
    subtitle: 'How lifelong dual-language arbitration rewires prefrontal executive control and delays neurodegeneration.',
    paragraphs: {
      A: 'For much of the twentieth century, developmental psychologists harbored a profound misconception that exposing young children to two languages simultaneously would induce linguistic confusion and cognitive delay. However, modern neuroimaging technologies—particularly functional magnetic resonance imaging (fMRI)—have comprehensively dismantled this archaic hypothesis. Far from overwhelming neural circuitry, managing two active linguistic systems continuously exercises the dorsolateral prefrontal cortex.',
      B: 'Unlike monolingual speakers, bilingual individuals experience constant parallel activation: both languages remain neurobiologically active even when only one is being articulated. Consequently, the brain must deploy an intricate inhibitory mechanism known as executive arbitration to suppress the non-target lexicon. This relentless mental gymnastics fortifies neural pathways governing selective attention, task-switching, and conflict resolution.',
      C: 'Perhaps the most compelling empirical findings emerge from longitudinal geriatric studies investigating neurodegenerative resilience. Clinical cohorts led by cognitive neuroscientists demonstrate that lifelong bilinguals manifest clinical symptoms of Alzheimer’s pathology an average of four to five years later than demographically matched monolinguals. Crucially, post-mortem examinations reveal that bilingual brains still accumulate physical amyloid plaques, yet their fortified synaptic networks—termed cognitive reserve—compensate for the structural damage.',
      D: 'Nevertheless, contemporary replication trials have prompted methodological scrutiny regarding publication bias. Several large-scale laboratory studies involving young university undergraduates have failed to detect a statistically significant bilingual advantage on standardized reaction-time tasks. Researchers now posit that executive enhancements peak primarily during early developmental windows and advanced senescence, whereas young adults already operate at a physiological ceiling of processing speed.'
    },
    cefrTerms: {
      misconception: {
        word: 'Misconception',
        level: 'B2',
        phonetic: '/ˌmɪs.kənˈsep.ʃən/',
        banglaMeaning: 'ভ্রান্ত ধারণা / ভুল বিশ্বাস (তথ্যপ্রমাণের অভাবে গড়ে ওঠা ভুল মত)',
        definition: 'A view or opinion that is incorrect because it is based on faulty thinking or understanding.',
        collocations: ['profound misconception', 'dispelling misconceptions', 'common misconception'],
        sample: 'Modern empirical studies have dispelled a widespread misconception regarding childhood bilingualism.'
      },
      'executive arbitration': {
        word: 'Executive Arbitration',
        level: 'C2',
        phonetic: '/ɪɡˈzek.jə.tɪv ˌɑː.bɪˈtreɪ.ʃən/',
        banglaMeaning: 'মস্তিষ্কের নির্বাহী নিয়ন্ত্রণ ও ভাষার দ্বন্দ্ব নিরসন প্রক্রিয়া',
        definition: 'The cognitive control process by which the prefrontal cortex selects relevant neural signals while actively inhibiting competing interference.',
        collocations: ['deploy executive arbitration', 'prefrontal arbitration', 'cognitive inhibition'],
        sample: 'Seamless code-switching relies on rapid executive arbitration within the prefrontal cortex.'
      },
      'cognitive reserve': {
        word: 'Cognitive Reserve',
        level: 'C1',
        phonetic: '/ˈkɒɡ.nə.tɪv rɪˈzɜːv/',
        banglaMeaning: 'মস্তিষ্কের স্নায়বিক সক্ষমতার সঞ্চয় (যা বার্ধক্যজনিত ক্ষয় প্রতিরোধ করে)',
        definition: 'The mind’s resistance to neuropathological damage of the brain, built up through lifelong intellectual and linguistic stimulation.',
        collocations: ['bolster cognitive reserve', 'neurodegenerative resilience', 'synaptic compensation'],
        sample: 'Lifelong multilingualism significantly bolsters cognitive reserve in aging populations.'
      },
      'publication bias': {
        word: 'Publication Bias',
        level: 'C1',
        phonetic: '/ˌpʌb.lɪˈkeɪ.ʃən ˈbaɪ.əs/',
        banglaMeaning: 'প্রকাশনা পক্ষপাত (কেবল ইতিবাচক গবেষণার ফলাফল প্রকাশের প্রবণতা)',
        definition: 'A phenomenon in academic literature where studies with positive or dramatic findings are more likely to be published than null or inconclusive trials.',
        collocations: ['methodological scrutiny', 'combat publication bias', 'replication crisis'],
        sample: 'Meta-analyses must account for publication bias when evaluating psychological claims.'
      },
      senescence: {
        word: 'Senescence',
        level: 'C2',
        phonetic: '/sɪˈnes.əns/',
        banglaMeaning: 'বার্ধক্য প্রক্রিয়া / বয়স বৃদ্ধির সাথে কোষের স্বাভাবিক ক্ষয়',
        definition: 'The condition or process of deterioration with age; biological aging at the cellular or organismal level.',
        collocations: ['advanced senescence', 'cellular senescence', 'delay senescence'],
        sample: 'Synaptic plasticity remains remarkably adaptable even during advanced senescence.'
      }
    },
    questions: [
      {
        num: 1,
        type: 'tfng',
        statement: 'When a bilingual person speaks in one language, their second language is completely deactivated in the brain.',
        correctAnswer: 'FALSE',
        evidencePara: 'B',
        trapTitle: 'TFNG Trap: Direct Contradiction (Parallel Activation)',
        explanationEn: 'Paragraph B explicitly states that "both languages remain neurobiologically active even when only one is being articulated."',
        explanationBn: '[B] অনুচ্ছেদে স্পষ্টভাবে বলা হয়েছে যে একটি ভাষায় কথা বলার সময়ও মস্তিষ্কে দুটি ভাষাই সক্রিয় থাকে ("both languages remain neurobiologically active")।'
      },
      {
        num: 2,
        type: 'tfng',
        statement: 'Lifelong bilingualism prevents the physical formation of amyloid plaques associated with Alzheimer’s disease.',
        correctAnswer: 'FALSE',
        evidencePara: 'C',
        trapTitle: 'TFNG Trap: Symptom Delay vs. Physical Plaque Prevention',
        explanationEn: 'Paragraph C states that bilingual brains "still accumulate physical amyloid plaques", though cognitive reserve delays outward clinical symptoms.',
        explanationBn: '[C] অনুচ্ছেদে বলা হয়েছে দ্বিভাষিকদের মস্তিষ্কে অ্যামাইলয়েড প্লাক জমা হয় ("still accumulate physical amyloid plaques"), কেবল রোগের লক্ষণ প্রকাশ পেতে দেরি হয়।'
      },
      {
        num: 3,
        type: 'tfng',
        statement: 'Bilingual children consistently outperform monolingual peers in musical pitch recognition tests.',
        correctAnswer: 'NOT GIVEN',
        evidencePara: 'B',
        trapTitle: 'TFNG Trap: Unmentioned Domain (Musical Pitch)',
        explanationEn: 'The passage discusses selective attention and task-switching, but makes zero mention of musical pitch recognition.',
        explanationBn: 'প্যাসেজে মনোযোগ ও টাস্ক-সুইচিং নিয়ে আলোচনা করা হলেও সংগীতের সুর বা "musical pitch recognition" সম্পর্কে কোনো তথ্য দেওয়া হয়নি।'
      },
      {
        num: 4,
        type: 'matching',
        statement: 'Which paragraph explains why recent studies on university students sometimes fail to show a bilingual advantage?',
        correctAnswer: 'D',
        evidencePara: 'D',
        trapTitle: 'Paragraph Matching: Replication & Physiological Ceiling',
        explanationEn: 'Paragraph D examines replication trials on undergraduates and explains that young adults already operate at a physiological ceiling of processing speed.',
        explanationBn: '[D] অনুচ্ছেদে বিশ্ববিদ্যালয়ের তরুণ শিক্ষার্থীদের ওপর গবেষণার ফলাফল এবং তাদের মস্তিষ্কের গতির সর্বোচ্চ সীমা ("physiological ceiling") ব্যাখ্যা করা হয়েছে।'
      }
    ]
  },
  {
    id: 'passage_quantum_crypto',
    badge: 'CAMBRIDGE PASSAGE 3 · QUANTUM COMPUTING & SECURITY',
    title: 'Post-Silicon Horizons: Quantum Key Distribution and Cryptographic Resilience',
    topic: 'Quantum Cryptography & Post-Silicon Computing',
    subtitle: 'Why subatomic superposition threatens classical RSA encryption and how photonic networks guarantee tamper-proof security.',
    paragraphs: {
      A: 'Modern global commerce, sovereign communications, and financial clearinghouses rely overwhelmingly on asymmetric public-key cryptography—most notably the RSA algorithm. The security of classical encryption rests upon computational asymmetry: while multiplying two massive prime numbers is trivial for conventional silicon processors, factoring their resulting product back into primes would require millennia. Yet the rapid maturation of fault-tolerant quantum computers threatens to render this mathematical fortress obsolete.',
      B: 'Unlike classical bits constrained to binary states of zero or one, quantum bits—or qubits—exploit subatomic superposition to inhabit linear combinations of both states simultaneously. By harnessing quantum entanglement and executing Shor’s factoring algorithm, a sufficiently scaled quantum processor could theoretically decrypt standard 2048-bit RSA keys in a matter of hours. Intelligence agencies have consequently warned of "harvest now, decrypt later" espionage, wherein adversaries archive encrypted state secrets today awaiting quantum decryption.',
      C: 'To counter this impending vulnerability, physicists have pioneered Quantum Key Distribution (QKD), a hardware-based paradigm rooted in fundamental laws of quantum mechanics rather than computational complexity. In a QKD fiber-optic link, cryptographic keys are encoded into the polarization states of single photons. Because the Heisenberg uncertainty principle dictates that measuring a quantum system irreversibly perturbs its state, any clandestine eavesdropper attempting to intercept the photons inevitably introduces detectable bit-error anomalies.',
      D: 'Despite its theoretical invulnerability, commercial QKD deployment confronts formidable infrastructural bottlenecks. Single photons cannot be amplified by conventional optical repeaters without destroying their quantum coherence, restricting terrestrial fiber transmissions to roughly one hundred kilometers. Consequently, cybersecurity standards bodies are simultaneously standardizing post-quantum lattice algorithms that can execute seamlessly on existing classical internet hardware without costly photonic overhauls.'
    },
    cefrTerms: {
      obsolete: {
        word: 'Obsolete',
        level: 'B2',
        phonetic: '/ˌɒb.səˈliːt/',
        banglaMeaning: 'সেকেলে / অপ্রচলিত / অকেজো (নতুন প্রযুক্তির কারণে যা আর ব্যবহৃত হয় না)',
        definition: 'No longer produced or used; out of date and replaced by superior technological innovation.',
        collocations: ['render obsolete', 'technologically obsolete', 'obsolete infrastructure'],
        sample: 'Fault-tolerant quantum processors could render classical encryption protocols obsolete.'
      },
      superposition: {
        word: 'Superposition',
        level: 'C2',
        phonetic: '/ˌsuː.pə.pəˈzɪʃ.ən/',
        banglaMeaning: 'উপাত্তপাত / কোয়ান্টাম কণার একই সাথে একাধিক অবস্থায় থাকার সক্ষমতা',
        definition: 'The ability of a quantum system to be in multiple states at the same time until it is measured.',
        collocations: ['subatomic superposition', 'quantum superposition', 'maintain superposition'],
        sample: 'Qubits leverage subatomic superposition to evaluate vast probability matrices in parallel.'
      },
      clandestine: {
        word: 'Clandestine',
        level: 'C2',
        phonetic: '/klænˈdes.tɪn/',
        banglaMeaning: 'গোপন / গুপ্ত (বিশেষত গোয়েন্দা নজরদারি বা অননুমোদিত কার্যক্রম)',
        definition: 'Kept secret or done secretively, especially because illicit or involving unauthorized surveillance.',
        collocations: ['clandestine eavesdropper', 'clandestine interception', 'clandestine operations'],
        sample: 'Quantum key distribution immediately exposes any clandestine eavesdropper on the fiber line.'
      },
      perturbs: {
        word: 'Perturbs',
        level: 'C1',
        phonetic: '/pəˈtɜːbz/',
        banglaMeaning: 'বিচ্যুত করা / স্বাভাবিক অবস্থা বিঘ্নিত বা পরিবর্তিত করা',
        definition: 'Subject a system or state to an alteration or disturbance from its original equilibrium.',
        collocations: ['irreversibly perturbs', 'external perturbation', 'perturb quantum states'],
        sample: 'Observing a polarized photon irreversibly perturbs its delicate quantum state.'
      },
      bottlenecks: {
        word: 'Bottlenecks',
        level: 'C1',
        phonetic: '/ˈbɒt.əl.neks/',
        banglaMeaning: 'প্রতিবন্ধকতা / গতিরোধক সংকট (যা পুরো ব্যবস্থার অগ্রগতি থামিয়ে দেয়)',
        definition: 'Points of congestion or technical limitation that severely slow down or restrict broader system performance.',
        collocations: ['infrastructural bottlenecks', 'eliminate bottlenecks', 'supply bottlenecks'],
        sample: 'Signal attenuation remains one of the primary infrastructural bottlenecks in terrestrial quantum networks.'
      }
    },
    questions: [
      {
        num: 1,
        type: 'tfng',
        statement: 'Classical RSA encryption relies on the fact that multiplying two large prime numbers is computationally difficult for silicon computers.',
        correctAnswer: 'FALSE',
        evidencePara: 'A',
        trapTitle: 'TFNG Trap: Reversed Operation (Multiplying vs. Factoring)',
        explanationEn: 'Paragraph A states that multiplying two large primes is "trivial" for conventional processors; it is factoring the product back into primes that takes millennia.',
        explanationBn: '[A] অনুচ্ছেদে বলা হয়েছে দুটি মৌলিক সংখ্যা গুণ করা সাধারণ কম্পিউটারের জন্য খুবই সহজ ("trivial"); বরং গুণফল থেকে মূল সংখ্যা দুটি বের করা (factoring) কঠিন।'
      },
      {
        num: 2,
        type: 'tfng',
        statement: 'Attempting to intercept photons in a Quantum Key Distribution link alters their quantum state and alerts the network.',
        correctAnswer: 'TRUE',
        evidencePara: 'C',
        trapTitle: 'TFNG Agreement: Heisenberg Uncertainty Detection',
        explanationEn: 'Paragraph C confirms that measuring a quantum system irreversibly perturbs its state, causing any eavesdropper to introduce detectable bit-error anomalies.',
        explanationBn: '[C] অনুচ্ছেদে নিশ্চিত করা হয়েছে যে ফোটন ইন্টারসেপ্ট করার চেষ্টা করলে তার কোয়ান্টাম অবস্থা পরিবর্তিত হয়ে যায় এবং তা সাথে সাথে ধরা পড়ে।'
      },
      {
        num: 3,
        type: 'tfng',
        statement: 'Satellite-based quantum relays are currently cheaper to maintain than subsea fiber-optic cables.',
        correctAnswer: 'NOT GIVEN',
        evidencePara: 'D',
        trapTitle: 'TFNG Trap: Unmentioned Comparison (Satellite Relay Costs)',
        explanationEn: 'Paragraph D discusses terrestrial fiber distance limits and post-quantum lattice algorithms, but never mentions satellite relays or subsea cable maintenance costs.',
        explanationBn: '[D] অনুচ্ছেদে ফাইবার অপটিক কেবলের দূরত্বের সীমাবদ্ধতা নিয়ে বলা হলেও স্যাটেলাইট বা সাবসি কেবলের খরচের কোনো তুলনা দেওয়া হয়নি।'
      },
      {
        num: 4,
        type: 'matching',
        statement: 'Which paragraph describes the strategy where intelligence actors store encrypted data now to decode it in the future?',
        correctAnswer: 'B',
        evidencePara: 'B',
        trapTitle: 'Paragraph Matching: Harvest Now, Decrypt Later',
        explanationEn: 'Paragraph B details Shor’s algorithm and warns of "harvest now, decrypt later" espionage.',
        explanationBn: '[B] অনুচ্ছেদে "harvest now, decrypt later" কৌশল—অর্থাৎ এখন এনক্রিপ্টেড তথ্য জমা রেখে ভবিষ্যতে কোয়ান্টাম কম্পিউটার দিয়ে তা ডিকোড করার ঝুঁকি বর্ণনা করা হয়েছে।'
      }
    ]
  },
  {
    id: 'passage_mycorrhizal',
    badge: 'CAMBRIDGE PASSAGE 4 · FOREST BOTANY & MYCOLOGY',
    title: 'The Subterranean Wood-Wide Web: Mycorrhizal Symbiosis',
    topic: 'Forest Mycorrhizal Networks',
    subtitle: 'How subterranean fungal lattices redistribute carbon isotopes and biochemical defense signals across boreal forests.',
    paragraphs: {
      A: 'Beneath the decomposing needles of boreal forest floors lies an intricate subterranean telecommunications lattice composed of mycorrhizal fungi. Far from functioning as parasitic saprophytes, these microscopic fungal mycelia fuse symbiotically with the root tips of towering conifers. In a mutually advantageous biological barter, trees photosynthesize atmospheric carbon into hexose sugars and channel up to thirty percent of this carbohydrate yield downward to nourish the fungi. In reciprocation, the fungal hyphae—which boast an absorptive surface area orders of magnitude greater than coarse tree roots—mine the mineral soil for recalcitrant phosphorus and nitrogen.',
      B: 'Pioneering radioactive carbon-isotope tracing experiments conducted by forest ecologist Dr. Suzanne Simard overturned the classical Darwinian assumption that forest trees engage solely in ruthless solitary competition for sunlight. Her team demonstrated that towering "hub trees" occupying the sunlit upper canopy actively shunt surplus carbon, water, and nitrogen through interconnected fungal conduits to shaded understory seedlings struggling to survive.',
      C: 'Even more remarkably, the mycorrhizal lattice serves as an early-warning immunological defense grid. When a mature Douglas fir is infested by defoliating spruce budworms or bark beetles, it transmits volatile biochemical distress signals through the mycelial network within twenty-four hours. Neighboring uninfested conifers receive these subterranean cues and preemptively synthesize bitter phenolic compounds and defensive resins prior to insect arrival.',
      D: 'Despite this cooperative sophistication, commercial forestry practices routinely sever these ancient fungal architectures. Clear-cut logging and heavy mechanical soil compaction pulverize delicate mycelial mats, leaving replanted monoculture saplings vulnerable to drought and blight. Contemporary silviculture researchers now advocate selective retention harvesting—preserving veteran hub trees intact so their mycorrhizal legacy can inoculate the next generation of forest growth.'
    },
    cefrTerms: {
      symbiotically: {
        word: 'Symbiotically',
        level: 'C1',
        phonetic: '/ˌsɪm.baɪˈɒt.ɪ.kəl.i/',
        banglaMeaning: 'পারস্পরিক নির্ভরশীল ও উপকারী সম্পর্কের ভিত্তিতে (মিথোজীবী প্রক্রিয়ায়)',
        definition: 'In a manner that involves a mutually beneficial relationship between different organisms living in close physical association.',
        collocations: ['fuse symbiotically', 'symbiotically linked', 'evolve symbiotically'],
        sample: 'Nitrogen-fixing bacteria live symbiotically within the root nodules of leguminous plants.'
      },
      recalcitrant: {
        word: 'Recalcitrant',
        level: 'C2',
        phonetic: '/rɪˈkæl.sɪ.trənt/',
        banglaMeaning: 'সহজে গলে না বা নিষ্কাশন করা কঠিন এমন (দুর্ভেদ্য খনিজ বা অবাধ্য উপাদান)',
        definition: 'Resisting conventional treatment, extraction, or chemical breakdown; difficult to process or manage.',
        collocations: ['recalcitrant soil minerals', 'recalcitrant pollutants', 'recalcitrant compounds'],
        sample: 'Fungal enzymes dissolve recalcitrant rock phosphate that plant roots cannot absorb directly.'
      },
      conduits: {
        word: 'Conduits',
        level: 'C1',
        phonetic: '/ˈkɒn.dwɪts/',
        banglaMeaning: 'পরিবহন নালি বা মাধ্যম (যার ভেতর দিয়ে পানি, পুষ্টি বা তথ্য প্রবাহিত হয়)',
        definition: 'Channels, tubes, or pathways through which fluids, nutrients, or information are conveyed.',
        collocations: ['fungal conduits', 'underground conduits', 'vital conduits'],
        sample: 'Mycelial threads act as biological conduits linking dozens of trees across the woodland.'
      },
      preemptively: {
        word: 'Preemptively',
        level: 'C1',
        phonetic: '/priːˈemp.tɪv.li/',
        banglaMeaning: 'বিপদ আসার আগেই সতর্কতামূলক ব্যবস্থা হিসেবে (আগাম প্রতিরোধমূলকভাবে)',
        definition: 'Acting in advance to prevent an anticipated attack, crisis, or negative outcome before it occurs.',
        collocations: ['act preemptively', 'preemptively synthesize', 'strike preemptively'],
        sample: 'Alerted by chemical signals, neighboring trees preemptively produce toxic tannins to deter pests.'
      }
    },
    questions: [
      {
        num: 1,
        type: 'tfng',
        statement: 'Mycorrhizal fungi act as harmful parasites that drain carbohydrates from conifer roots without offering any nutritional return.',
        correctAnswer: 'FALSE',
        evidencePara: 'A',
        trapTitle: 'TFNG Trap: Direct Antonym (Parasitic vs. Symbiotic Barter)',
        explanationEn: 'Paragraph A explicitly refutes this, stating they are "far from functioning as parasitic saprophytes" and instead engage in a "mutually advantageous biological barter," trading soil phosphorus and nitrogen for sugars.',
        explanationBn: '[A] অনুচ্ছেদে স্পষ্ট বলা হয়েছে যে ছত্রাকগুলো পরজীবী নয় ("far from parasitic"), বরং তারা গাছকে ফসফরাস ও নাইট্রোজেন দিয়ে পারস্পরিক উপকারী বিনিময় ("symbiotic barter") করে।'
      },
      {
        num: 2,
        type: 'tfng',
        statement: 'Conifers alerted through the fungal network can produce chemical defenses before bark beetles physically reach them.',
        correctAnswer: 'TRUE',
        evidencePara: 'C',
        trapTitle: 'TFNG Agreement: Preemptive Phenolic Defense',
        explanationEn: 'Paragraph C confirms that neighboring trees receive subterranean cues and "preemptively synthesize bitter phenolic compounds and defensive resins prior to insect arrival."',
        explanationBn: '[C] অনুচ্ছেদে নিশ্চিত করা হয়েছে যে পোকামাকড় পৌঁছানোর আগেই ("prior to insect arrival") পাশের গাছগুলো রাসায়নিক সংকেত পেয়ে প্রতিরক্ষামূলক ফেনোলিক যৌগ তৈরি করে।'
      },
      {
        num: 3,
        type: 'tfng',
        statement: 'Synthetic chemical fungicides are more destructive to mycorrhizal networks than mechanical clear-cut logging.',
        correctAnswer: 'NOT GIVEN',
        evidencePara: 'D',
        trapTitle: 'TFNG Trap: Unmentioned Comparison (Chemical Fungicides)',
        explanationEn: 'Paragraph D discusses clear-cut logging and mechanical soil compaction, but never mentions chemical fungicides or compares their relative destructiveness.',
        explanationBn: '[D] অনুচ্ছেদে গাছ কাটা ও মাটির সংকোচনের কথা বলা হলেও রাসায়নিক ছত্রাকনাশকের (fungicides) কোনো উল্লেখ বা তুলনা করা হয়নি।'
      },
      {
        num: 4,
        type: 'matching',
        statement: 'Which paragraph describes isotope experiments that challenged the traditional view of solitary tree competition?',
        correctAnswer: 'B',
        evidencePara: 'B',
        trapTitle: 'Paragraph Matching: Simard’s Isotope Tracing',
        explanationEn: 'Paragraph B details Dr. Suzanne Simard’s radioactive carbon-isotope tracing experiments that overturned the classical Darwinian assumption of solitary competition.',
        explanationBn: '[B] অনুচ্ছেদে ড. সুজান সিমার্ডের রেডিওঅ্যাক্টিভ কার্বন-আইসোটোপ পরীক্ষার কথা বলা হয়েছে যা একক প্রতিযোগিতার পুরনো ধারণা বদলে দিয়েছে।'
      }
    ]
  },
  {
    id: 'passage_biomimicry',
    badge: 'CAMBRIDGE PASSAGE 5 · SUSTAINABLE ARCHITECTURE',
    title: 'Biomimetic Engineering: Learning Thermal Physics from Termites',
    topic: 'Biomimetic Architecture & Cooling',
    subtitle: 'How evolutionary adaptations in savannah insects and desert beetles are revolutionizing zero-carbon skyscraper design.',
    paragraphs: {
      A: 'Twentieth-century metropolitan skylines were defined by sealed glass-curtain skyscrapers that functioned as solar thermal traps, demanding colossal HVAC air-conditioning loads to remain habitable. Confronted with stringent decarbonization mandates, contemporary structural engineers are increasingly turning to biomimicry—the discipline of emulating anatomical and physiological survival mechanisms refined over millions of years of biological evolution.',
      B: 'A landmark triumph of architectural biomimicry is the Eastgate Centre in Harare, Zimbabwe. Designed by architect Mick Pearce, the commercial complex models its climate control directly on the earthen mounds constructed by Macrotermes michaelseni termites. Although ambient savannah temperatures oscillate between 40°C by day and 5°C at night, termites maintain their subterranean fungus-cultivation chambers at a precise 30.5°C by continuously opening and closing convective air vents.',
      C: 'Replicating this passive stack-ventilation geometry, the Eastgate Centre eschews conventional air-conditioning reciprocating compressors altogether. Cool night air is drawn into the building’s lower plenums and absorbed by high-thermal-mass concrete floor slabs. During the scorching afternoon, radiant body and equipment heat rises and vents upward through forty-eight rooftop masonry chimneys, slashing total energy consumption by ninety percent compared to neighbouring office blocks.',
      D: 'Beyond thermal convection, biomimetic engineers are adapting the hydrophilic-hydrophobic carapace of the Namib Desert stenocara beetle to harvest atmospheric fog atop arid coastal towers. While skeptics caution that biological geometries cannot always be scaled up linearly due to structural load codes, hybrid bio-inspired facades are rapidly redefining sustainable urbanism.'
    },
    cefrTerms: {
      emulating: {
        word: 'Emulating',
        level: 'C1',
        phonetic: '/ˈem.jə.leɪ.tɪŋ/',
        banglaMeaning: 'অনুকরণ করা বা কোনো সফল আদর্শ অনুসরণ করে সমমানের কিছু তৈরি করা',
        definition: 'Matching or surpassing a person, system, or natural process by closely imitating its underlying principles.',
        collocations: ['emulating natural processes', 'worth emulating', 'capable of emulating'],
        sample: 'By emulating the hydrodynamic skin of sharks, engineers reduced hull drag on cargo vessels.'
      },
      oscillate: {
        word: 'Oscillate',
        level: 'C1',
        phonetic: '/ˈɒs.ɪ.leɪt/',
        banglaMeaning: 'দুই প্রান্তের মধ্যে ওঠানামা করা বা দোদুল্যমান হওয়া',
        definition: 'Vary or fluctuate regularly between two extreme values, temperatures, or states.',
        collocations: ['temperatures oscillate', 'oscillate wildly', 'oscillate between extremes'],
        sample: 'Desert temperatures oscillate dramatically between blistering midday heat and freezing nights.'
      },
      eschews: {
        word: 'Eschews',
        level: 'C2',
        phonetic: '/ɪsˈtʃuːz/',
        banglaMeaning: 'সচেতনভাবে বর্জন করা বা এড়িয়ে চলা',
        definition: 'Deliberately avoid, abstain from, or give up using a conventional method or substance.',
        collocations: ['eschews conventional methods', 'deliberately eschews', 'eschews ornamentation'],
        sample: 'The passive solar residence eschews mechanical air conditioning in favor of cross-ventilation.'
      },
      carapace: {
        word: 'Carapace',
        level: 'C2',
        phonetic: '/ˈkær.ə.peɪs/',
        banglaMeaning: 'পোকামাকড় বা কচ্ছপের শরীরের উপরের শক্ত খোলস বা আবরণ',
        definition: 'The hard upper shell or dorsal exoskeleton of a tortoise, crustacean, or arachnid/beetle.',
        collocations: ['chitinous carapace', 'protective carapace', 'beetle carapace'],
        sample: 'Microscopic bumps on the beetle’s carapace condense morning desert mist into drinkable water droplets.'
      }
    },
    questions: [
      {
        num: 1,
        type: 'tfng',
        statement: 'Macrotermes termites maintain a constant subterranean chamber temperature despite wide external savannah temperature swings.',
        correctAnswer: 'TRUE',
        evidencePara: 'B',
        trapTitle: 'TFNG Agreement: Homeostatic Termite Mound Temperature',
        explanationEn: 'Paragraph B states that although external savannah temperatures oscillate between 40°C and 5°C, termites keep their chambers at a precise 30.5°C.',
        explanationBn: '[B] অনুচ্ছেদে বলা হয়েছে বাইরে তাপমাত্রা ৪০ ডিগ্রি থেকে ৫ ডিগ্রিতে ওঠানামা করলেও উইপোকা তাদের ভেতরের কক্ষ ৩০.৫ ডিগ্রি সেলসিয়াসে স্থির রাখে।'
      },
      {
        num: 2,
        type: 'tfng',
        statement: 'The Eastgate Centre relies on imported high-powered reciprocating air-conditioning compressors during the summer.',
        correctAnswer: 'FALSE',
        evidencePara: 'C',
        trapTitle: 'TFNG Trap: Lexical Negation ("Eschews Altogether")',
        explanationEn: 'Paragraph C explicitly states that the Eastgate Centre "eschews conventional air-conditioning reciprocating compressors altogether," relying on passive stack ventilation.',
        explanationBn: '[C] অনুচ্ছেদে স্পষ্ট বলা হয়েছে যে ইস্টগেট সেন্টার প্রচলিত এয়ার-কন্ডিশনিং কমপ্রেসর সম্পূর্ণ বর্জন করেছে ("eschews altogether")।'
      },
      {
        num: 3,
        type: 'tfng',
        statement: 'The Namib Desert beetle facade system has already been installed on more than fifty skyscrapers in Harare.',
        correctAnswer: 'NOT GIVEN',
        evidencePara: 'D',
        trapTitle: 'TFNG Trap: Fabricated Quantification',
        explanationEn: 'Paragraph D mentions adapting the Namib beetle carapace for arid coastal towers, but gives no number of buildings or claim of installation in Harare.',
        explanationBn: '[D] অনুচ্ছেদে নামিব মরুভূমির গুবরে পোকার খোলস থেকে কুয়াশা সংগ্রহের প্রযুক্তির কথা বলা হলেও হারারেতে ৫০টি ভবনে তা বসানোর কোনো তথ্য নেই।'
      },
      {
        num: 4,
        type: 'matching',
        statement: 'Which paragraph explains how concrete floor slabs absorb cool night air to regulate daytime indoor heat?',
        correctAnswer: 'C',
        evidencePara: 'C',
        trapTitle: 'Paragraph Matching: Thermal Mass & Rooftop Chimneys',
        explanationEn: 'Paragraph C details how cool night air is absorbed by high-thermal-mass concrete floor slabs and vented through 48 rooftop chimneys.',
        explanationBn: '[C] অনুচ্ছেদে বর্ণনা করা হয়েছে কীভাবে রাতের ঠান্ডা বাতাস কংক্রিটের স্ল্যাবে শোষিত হয় এবং দিনের গরম বাতাস ৪৮টি চিমনি দিয়ে বেরিয়ে যায়।'
      }
    ]
  },
  {
    id: 'passage_antikythera',
    badge: 'CAMBRIDGE PASSAGE 6 · ARCHAEOLOGY & HISTORY OF SCIENCE',
    title: 'The Antikythera Mechanism: Antiquity’s Analog Cosmos',
    topic: 'Hellenistic Astronomical Computing',
    subtitle: 'How micro-focus X-ray tomography decoded a 2,100-year-old bronze geared computer salvaged from an Aegean shipwreck.',
    paragraphs: {
      A: 'In the spring of 1901, Greek sponge divers sheltering from a gale off the island of Antikythera stumbled upon a sunken Roman merchant vessel dating to circa 70 BCE. Alongside marble statues and amphorae, salvagers retrieved a corroded, shoebox-sized lump of calcified bronze. Initially dismissed as an ornamental astrolabe, the artifact fractured open months later to expose interlocking bronze gearwheels etched with microscopic Greek astronomical inscriptions.',
      B: 'For over a century, marine encrustation and brittle metal corrosion thwarted efforts to reconstruct the device’s internal architecture. The decisive breakthrough arrived in 2005 when an international consortium subjected the eighty-two surviving fragments to micro-focus X-ray computed tomography (CT). Generating three-dimensional radiographic slices at sub-millimeter resolution, researchers identified at least thirty precision-cut triangular-toothed bronze gears housed inside a wooden frame.',
      C: 'By rotating a lateral hand crank, Hellenistic astronomers could dial any past or future calendar date and simultaneously compute the zodiacal positions of the Sun and Moon, lunar phases, and the synodic cycles of the five classical planets. Most astonishingly, a pin-and-slot epicyclic differential gear at the rear modeled Hipparchus’s theory of lunar anomaly—automatically accelerating and decelerating the Moon’s pointer to reflect its elliptical orbital velocity.',
      D: 'The existence of such mechanical virtuosity in the second century BCE shattered the prevailing historical consensus that complex geared clockwork only emerged in fourteenth-century medieval European cathedrals. Presumably, when the Roman Empire collapsed, the artisanal metallurgical guild knowledge required to cast and file differential gears vanished for well over a millennium, surviving only in fragmentary Arabic and Byzantine manuscripts.'
    },
    cefrTerms: {
      thwarted: {
        word: 'Thwarted',
        level: 'C1',
        phonetic: '/θwɔː.tɪd/',
        banglaMeaning: 'ব্যর্থ করে দেওয়া বা অগ্রগতিতে বাধা সৃষ্টি করা',
        definition: 'Prevented someone or a scientific effort from accomplishing a goal; frustrated or obstructed.',
        collocations: ['thwarted efforts', 'repeatedly thwarted', 'thwarted ambitions'],
        sample: 'Heavy cloud cover thwarted astronomers’ attempts to photograph the solar eclipse.'
      },
      consortium: {
        word: 'Consortium',
        level: 'C1',
        phonetic: '/kənˈsɔː.ti.əm/',
        banglaMeaning: 'যৌথ গবেষণার বা প্রকল্পের জন্য গঠিত একাধিক প্রতিষ্ঠানের জোট',
        definition: 'An association or coalition of several universities, companies, or institutions pooling resources for a common scientific objective.',
        collocations: ['international consortium', 'research consortium', 'aerospace consortium'],
        sample: 'An international consortium of physicists collaborated to build the particle accelerator.'
      },
      elliptical: {
        word: 'Elliptical',
        level: 'C1',
        phonetic: '/ɪˈlɪp.tɪ.kəl/',
        banglaMeaning: 'উপবৃত্তাকার (ডিম্বাকৃতির কক্ষপথ সংক্রান্ত)',
        definition: 'Having an oval or ellipse-shaped geometric trajectory rather than a perfect circle.',
        collocations: ['elliptical orbit', 'elliptical galaxy', 'elliptical velocity'],
        sample: 'Kepler proved that planetary orbits are elliptical rather than perfectly circular.'
      },
      virtuosity: {
        word: 'Virtuosity',
        level: 'C2',
        phonetic: '/ˌvɜː.tʃuˈɒs.ə.ti/',
        banglaMeaning: 'অনন্যসাধারণ কারিগরি দক্ষতা ও শৈল্পিক নৈপুণ্য',
        definition: 'Great technical skill, mastery, and artistic brilliance in engineering, music, or craftsmanship.',
        collocations: ['mechanical virtuosity', 'technical virtuosity', 'sheer virtuosity'],
        sample: 'The miniature bronze gears demonstrate a level of mechanical virtuosity unmatched in antiquity.'
      }
    },
    questions: [
      {
        num: 1,
        type: 'tfng',
        statement: 'Archaeologists immediately recognized the full computational complexity of the Antikythera Mechanism on the day it was raised from the seabed.',
        correctAnswer: 'FALSE',
        evidencePara: 'A',
        trapTitle: 'TFNG Trap: Temporal Contradiction ("Initially Dismissed")',
        explanationEn: 'Paragraph A states the corroded lump was "initially dismissed as an ornamental astrolabe" and only revealed its gears when it fractured open months later.',
        explanationBn: '[A] অনুচ্ছেদে বলা হয়েছে প্রথমে এটিকে সাধারণ অ্যাস্ট্রোলেব ভেবে উপেক্ষা করা হয়েছিল ("initially dismissed"); কয়েক মাস পরে এটি ফেটে গেলে ভেতরের গিয়ারগুলো দেখা যায়।'
      },
      {
        num: 2,
        type: 'tfng',
        statement: 'The mechanism used a pin-and-slot gear assembly to account for variations in the Moon’s orbital speed.',
        correctAnswer: 'TRUE',
        evidencePara: 'C',
        trapTitle: 'TFNG Agreement: Lunar Elliptical Velocity',
        explanationEn: 'Paragraph C confirms that a pin-and-slot epicyclic gear modeled lunar anomaly by accelerating and decelerating the Moon’s pointer.',
        explanationBn: '[C] অনুচ্ছেদে নিশ্চিত করা হয়েছে যে পিন-অ্যান্ড-স্লট গিয়ারের মাধ্যমে চাঁদের উপবৃত্তাকার কক্ষপথের গতির হ্রাস-বৃদ্ধি নিখুঁতভাবে দেখানো হতো।'
      },
      {
        num: 3,
        type: 'tfng',
        statement: 'The Roman merchant ship was transporting the Antikythera Mechanism as personal war booty for Julius Caesar.',
        correctAnswer: 'NOT GIVEN',
        evidencePara: 'A',
        trapTitle: 'TFNG Trap: Unstated Historical Speculation',
        explanationEn: 'Paragraph A mentions a Roman merchant vessel dating to circa 70 BCE carrying statues and amphorae, but never mentions Julius Caesar.',
        explanationBn: '[A] অনুচ্ছেদে রোমান বাণিজ্য জাহাজের কথা বলা হলেও জুলিয়াস সিজারের নাম বা গন্তব্য সম্পর্কে কোনো তথ্য দেওয়া হয়নি।'
      },
      {
        num: 4,
        type: 'matching',
        statement: 'Which paragraph explains how the artifact disproved the belief that complex geared machinery originated in medieval Europe?',
        correctAnswer: 'D',
        evidencePara: 'D',
        trapTitle: 'Paragraph Matching: Revision of Technological History',
        explanationEn: 'Paragraph D states that the device shattered the consensus that complex geared clockwork only emerged in 14th-century medieval European cathedrals.',
        explanationBn: '[D] অনুচ্ছেদে ব্যাখ্যা করা হয়েছে কীভাবে এই যন্ত্রটি চতুর্দশ শতাব্দীর ইউরোপেই প্রথম জটিল গিয়ার ঘড়ি তৈরি হয়েছিল—এমন ঐতিহাসিক ধারণা ভেঙে দেয়।'
      }
    ]
  }
];

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const ReadingLab: React.FC<ReadingLabProps> = ({ onShowToast }) => {
  const [selectedPassageId, setSelectedPassageId] = useState<string>(READING_LAB_PASSAGES[0].id);
  const activePassage =
    READING_LAB_PASSAGES.find((p) => p.id === selectedPassageId) || READING_LAB_PASSAGES[0];
  const [showAiPilotPanel, setShowAiPilotPanel] = useState<boolean>(false);
  const [activeReadingPilotSet, setActiveReadingPilotSet] = useState<MockExamSet | null>(null);

  const [activeTooltip, setActiveTooltip] = useState<CefrTerm | null>(null);
  const [highlightColor, setHighlightColor] = useState<HighlightColor>('amber');
  const [highlightsByPassage, setHighlightsByPassage] = useState<Record<string, HighlightEntry[]>>({});
  const [stickyNotes, setStickyNotes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('ielts_reading_sticky_notes_v1');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [openNotePara, setOpenNotePara] = useState<string | null>(null);
  const [pulsingParagraph, setPulsingParagraph] = useState<string | null>(null);
  const [answersByPassage, setAnswersByPassage] = useState<Record<string, Record<number, string>>>({});
  const [checkedByPassage, setCheckedByPassage] = useState<Record<string, boolean>>({});
  const [bilingualLang, setBilingualLang] = useState<Record<string, 'en' | 'bn'>>({});

  // Persistent per-passage & per-question timer state
  const [timersByPassage, setTimersByPassage] = useState<Record<string, PassageTimingState>>(() => {
    try {
      const raw = localStorage.getItem(READING_TIMER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const [activeQuestionNum, setActiveQuestionNum] = useState<1 | 2 | 3 | 4>(1);
  const [flaggedByPassage, setFlaggedByPassage] = useState<Record<string, Record<number, boolean>>>({});

  // Authentic CD-IELTS Contrast & Text-Size Accessibility Controls (persisted across Writing & Reading)
  const [colorScheme, setColorScheme] = useState<CDIELTSColorScheme>(() => {
    try {
      const saved = localStorage.getItem('cdielts_theme_color');
      if (saved && ['standard', 'black-on-yellow', 'yellow-on-black', 'white-on-black'].includes(saved)) {
        return saved as CDIELTSColorScheme;
      }
    } catch {}
    return 'standard';
  });
  const [zoomLevel, setZoomLevel] = useState<CDIELTSZoomLevel>(() => {
    try {
      const saved = localStorage.getItem('cdielts_theme_zoom');
      if (saved && ['100%', '125%', '150%'].includes(saved)) {
        return saved as CDIELTSZoomLevel;
      }
    } catch {}
    return '100%';
  });

  const handleSetColorScheme = (scheme: CDIELTSColorScheme) => {
    setColorScheme(scheme);
    try {
      localStorage.setItem('cdielts_theme_color', scheme);
    } catch {}
  };

  const handleSetZoomLevel = (zoom: CDIELTSZoomLevel) => {
    setZoomLevel(zoom);
    try {
      localStorage.setItem('cdielts_theme_zoom', zoom);
    } catch {}
  };

  const cdTheme = useMemo(() => getCDIELTSThemeClasses(colorScheme), [colorScheme]);
  const cdFontSizeClass = useMemo(() => getCDIELTSFontSizeClass(zoomLevel), [zoomLevel]);
  const isHighContrast = colorScheme !== 'standard';

  const currentHighlights = highlightsByPassage[activePassage.id] || [];
  const currentAnswers = answersByPassage[activePassage.id] || {};
  const currentFlags = flaggedByPassage[activePassage.id] || {};
  const isChecked = Boolean(checkedByPassage[activePassage.id]);
  const currentTiming: PassageTimingState = timersByPassage[activePassage.id] || {
    elapsedSeconds: 0,
    questionSeconds: { 1: 0, 2: 0, 3: 0, 4: 0 }
  };

  const handleToggleFlagQuestion = (qNum: number) => {
    soundManager.playBeep(660, 0.025);
    setFlaggedByPassage((prev) => ({
      ...prev,
      [activePassage.id]: {
        ...(prev[activePassage.id] || {}),
        [qNum]: !prev[activePassage.id]?.[qNum]
      }
    }));
  };

  const handleJumpToQuestion = (qNum: 1 | 2 | 3 | 4) => {
    setActiveQuestionNum(qNum);
    const el = document.getElementById(`reading-question-${qNum}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  // Persist timer state to localStorage whenever it updates
  useEffect(() => {
    try {
      localStorage.setItem(READING_TIMER_STORAGE_KEY, JSON.stringify(timersByPassage));
    } catch {
      // ignore storage quota errors
    }
  }, [timersByPassage]);

  // Tick timer every second for the active passage while running and not yet checked
  useEffect(() => {
    if (!isTimerRunning || isChecked) return;

    const interval = window.setInterval(() => {
      setTimersByPassage((prev) => {
        const existing = prev[activePassage.id] || {
          elapsedSeconds: 0,
          questionSeconds: { 1: 0, 2: 0, 3: 0, 4: 0 }
        };
        const prevQSecs = existing.questionSeconds?.[activeQuestionNum] || 0;
        return {
          ...prev,
          [activePassage.id]: {
            ...existing,
            elapsedSeconds: existing.elapsedSeconds + 1,
            questionSeconds: {
              1: existing.questionSeconds?.[1] || 0,
              2: existing.questionSeconds?.[2] || 0,
              3: existing.questionSeconds?.[3] || 0,
              4: existing.questionSeconds?.[4] || 0,
              [activeQuestionNum]: prevQSecs + 1
            }
          }
        };
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [activePassage.id, isTimerRunning, isChecked, activeQuestionNum]);

  const handleResetPassageTimer = () => {
    soundManager.playBeep(520, 0.03);
    setTimersByPassage((prev) => ({
      ...prev,
      [activePassage.id]: {
        elapsedSeconds: 0,
        questionSeconds: { 1: 0, 2: 0, 3: 0, 4: 0 }
      }
    }));
    setCheckedByPassage((prev) => ({ ...prev, [activePassage.id]: false }));
    setActiveQuestionNum(1);
    setIsTimerRunning(true);
    onShowToast(`Timer reset for ${activePassage.topic}.`);
  };

  const handleSelectAnswer = (qNum: 1 | 2 | 3 | 4, val: string) => {
    setActiveQuestionNum((prev) => {
      // Auto-advance active question timer focus to the next unanswered question
      const nextUnanswered = ([1, 2, 3, 4] as const).find(
        (n) => n !== qNum && !(answersByPassage[activePassage.id]?.[n])
      );
      return nextUnanswered || qNum || prev;
    });
    setAnswersByPassage((prev) => ({
      ...prev,
      [activePassage.id]: {
        ...(prev[activePassage.id] || {}),
        [qNum]: val
      }
    }));
  };

  const handleHighlightSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 0) {
      const selectedText = sel.toString().trim();
      setHighlightsByPassage((prev) => ({
        ...prev,
        [activePassage.id]: [
          ...(prev[activePassage.id] || []),
          { text: selectedText, color: highlightColor }
        ]
      }));
      sel.removeAllRanges();
      soundManager.playBeep(620, 0.03);
      onShowToast(`Highlighted inline (${highlightColor}): "${selectedText.substring(0, 32)}..."`);
    } else {
      onShowToast('Select any phrase inside the passage first, then click Highlight Selection.');
    }
  };

  const handleClearHighlights = () => {
    setHighlightsByPassage((prev) => ({
      ...prev,
      [activePassage.id]: []
    }));
    onShowToast('Inline highlights cleared for this passage.');
  };

  const handleRemoveSingleHighlight = (index: number) => {
    setHighlightsByPassage((prev) => ({
      ...prev,
      [activePassage.id]: (prev[activePassage.id] || []).filter((_, i) => i !== index)
    }));
  };

  const handleSaveStickyNote = (para: ParagraphLetter, val: string) => {
    const noteKey = `${activePassage.id}_${para}`;
    const next = { ...stickyNotes, [noteKey]: val };
    setStickyNotes(next);
    try {
      localStorage.setItem('ielts_reading_sticky_notes_v1', JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  };

  const handleLocateEvidence = (paraLetter: ParagraphLetter) => {
    setPulsingParagraph(paraLetter);
    soundManager.playBeep(660, 0.04);
    const el = document.getElementById(`reading-para-${paraLetter}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => {
      setPulsingParagraph((prev) => (prev === paraLetter ? null : prev));
    }, 3200);
  };

  const currentPassageScore = React.useMemo(() => {
    const total = activePassage.questions.length;
    let correct = 0;
    let unanswered = 0;
    activePassage.questions.forEach((q) => {
      const userAns = (currentAnswers[q.num] || '').trim();
      if (!userAns) {
        unanswered++;
      } else if (userAns === q.correctAnswer) {
        correct++;
      }
    });
    const scaledRaw = total > 0 ? Math.round((correct / total) * 40) : 0;
    let band = 0.0;
    if (correct <= 0 || total <= 0) band = 0.0;
    else if (scaledRaw >= 39) band = 9.0;
    else if (scaledRaw >= 37) band = 8.5;
    else if (scaledRaw >= 35) band = 8.0;
    else if (scaledRaw >= 33) band = 7.5;
    else if (scaledRaw >= 30) band = 7.0;
    else if (scaledRaw >= 27) band = 6.5;
    else if (scaledRaw >= 23) band = 6.0;
    else if (scaledRaw >= 16) band = 5.5;
    else if (scaledRaw >= 13) band = 5.0;
    else if (scaledRaw >= 10) band = 4.5;
    else if (scaledRaw >= 8) band = 4.0;
    else if (scaledRaw >= 6) band = 3.5;
    else if (scaledRaw >= 4) band = 3.0;
    else if (scaledRaw >= 2) band = 2.5;
    else band = 2.0;

    return { correct, total, unanswered, band };
  }, [activePassage, currentAnswers]);

  const handleCheckAnswers = () => {
    setTimersByPassage((prev) => {
      const existing = prev[activePassage.id] || {
        elapsedSeconds: 0,
        questionSeconds: { 1: 0, 2: 0, 3: 0, 4: 0 }
      };
      return {
        ...prev,
        [activePassage.id]: {
          ...existing,
          completedAtSeconds: existing.elapsedSeconds
        }
      };
    });
    setCheckedByPassage((prev) => ({ ...prev, [activePassage.id]: true }));
    soundManager.playSuccess();

    activePassage.questions.forEach((q) => {
      const userAns = (currentAnswers[q.num] || '').trim();
      const isUnanswered = userAns.length === 0;
      const isCorrect = !isUnanswered && userAns === q.correctAnswer;

      if (!isCorrect && !isUnanswered) {
        addMistake({
          module: 'reading',
          title: q.trapTitle,
          userAnswer: userAns,
          correctAnswer: q.type === 'matching' ? `Paragraph ${q.correctAnswer}` : q.correctAnswer,
          explanation: q.explanationEn,
          trapExplanationBn: q.explanationBn
        });
      }

      questionEngine.recordAttempt({
        questionId: `rdg_${activePassage.id}_q${q.num}`,
        module: 'reading',
        questionType: q.type === 'tfng' ? 'true_false_not_given' : 'matching_headings',
        topic: activePassage.topic,
        userAnswer: isUnanswered ? 'unanswered' : userAns,
        isCorrect,
        score: isCorrect ? 1 : 0,
        explanation: q.explanationEn,
        skipMistakeVault: true
      });
    });

    onShowToast(
      `Reading Scored: ${currentPassageScore.correct}/${currentPassageScore.total} Correct · Band ${currentPassageScore.band.toFixed(1)}`
    );
  };

  /**
   * Renders paragraph text with both clickable CEFR B2-C2 vocabulary buttons
   * AND live inline 3-color user text highlights.
   */
  const renderAnnotatedParagraph = (rawText: string) => {
    const termKeys = Object.keys(activePassage.cefrTerms);
    const highlightPhrases = currentHighlights
      .map((h) => h.text.trim())
      .filter((t) => t.length >= 2);

    const patterns: string[] = [
      ...highlightPhrases.map((p) => escapeRegExp(p)),
      ...termKeys.map((k) => `\\b${escapeRegExp(k)}\\b`)
    ];

    if (patterns.length === 0) return rawText;

    // Sort longer patterns first so multi-word highlights and phrases match cleanly
    patterns.sort((a, b) => b.length - a.length);
    const combinedRegex = new RegExp(`(${patterns.join('|')})`, 'gi');
    const segments = rawText.split(combinedRegex);

    return segments.map((seg, idx) => {
      if (!seg) return null;
      const lowerSeg = seg.toLowerCase();

      // 1. Check if segment matches a CEFR vocabulary term
      const matchedTermKey = termKeys.find((k) => k.toLowerCase() === lowerSeg);
      if (matchedTermKey) {
        const term = activePassage.cefrTerms[matchedTermKey];
        return (
          <button
            key={`cefr_${idx}`}
            type="button"
            onClick={() => {
              soundManager.playBeep(680, 0.03);
              setActiveTooltip(term);
            }}
            className="underline decoration-[#B45309] decoration-2 underline-offset-4 font-bold text-[#1E3A8A] dark:text-amber-300 hover:bg-amber-100/80 dark:hover:bg-amber-950/60 rounded px-1 transition cursor-pointer"
            title={`Click for CEFR ${term.level} definition & Bangla meaning`}
          >
            {seg}
          </button>
        );
      }

      // 2. Check if segment matches a user inline highlight
      const matchedHighlight = [...currentHighlights]
        .reverse()
        .find((h) => h.text.trim().toLowerCase() === lowerSeg);

      if (matchedHighlight) {
        const colorClasses =
          matchedHighlight.color === 'amber'
            ? 'bg-amber-200/85 text-amber-950 border-b-2 border-amber-500'
            : matchedHighlight.color === 'emerald'
            ? 'bg-emerald-200/85 text-emerald-950 border-b-2 border-emerald-500'
            : 'bg-rose-200/85 text-rose-950 border-b-2 border-rose-500';
        return (
          <mark key={`hl_${idx}`} className={`px-1 py-0.5 rounded-xs font-medium ${colorClasses}`}>
            {seg}
          </mark>
        );
      }

      return <React.Fragment key={`txt_${idx}`}>{seg}</React.Fragment>;
    });
  };

  if (activeReadingPilotSet) {
    return (
      <div className="fixed inset-0 z-40 bg-slate-100 dark:bg-slate-950 overflow-hidden">
        <CDIELTSExamMode
          customPilotSet={activeReadingPilotSet}
          initialSkill="reading"
          onShowToast={onShowToast}
          onExit={() => {
            setActiveReadingPilotSet(null);
            onShowToast('Exited Academic Reading AI Pilot and returned to Reading Lab.');
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header, Passage Switcher & CD-IELTS 3-Color Highlighter Controls */}
      <div className="bg-[#FAF8F5] dark:bg-slate-900 rounded-3xl border border-[#E6E1D6] dark:border-slate-800 p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#1E3A8A]/10 dark:bg-blue-950/60 border border-[#1E3A8A]/20 text-[#1E3A8A] dark:text-blue-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-[#B45309]" /> Practice CD-IELTS Academic Reading Studio
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] dark:text-white mt-1.5 font-serif tracking-tight">
              Reading Lab & In-Situ CEFR Vocabulary Scanner
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Select any text in the passage to highlight inline, add paragraph gist notes, and click underlined terms for CEFR B2–C2 bilingual analysis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setShowAiPilotPanel((prev) => !prev);
                soundManager.playBeep(620, 0.04);
              }}
              className={`px-3.5 py-2 min-h-[44px] rounded-xl font-bold text-xs flex items-center gap-1.5 transition border cursor-pointer ${
                showAiPilotPanel
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
              }`}
              title="Open Academic Reading AI Pilot Practice"
            >
              <Sparkles className="w-4 h-4" />
              <span>{showAiPilotPanel ? 'Hide AI Pilots' : 'AI Reading Pilots'}</span>
            </button>

            {/* 3-Color Selector */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-slate-800 border border-[#E6E1D6] dark:border-slate-700">
              {(
                [
                  { id: 'amber', label: 'Key Claim', dot: 'bg-amber-400' },
                  { id: 'emerald', label: 'Evidence', dot: 'bg-emerald-500' },
                  { id: 'rose', label: 'Trap Word', dot: 'bg-rose-500' }
                ] as const
              ).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setHighlightColor(c.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    highlightColor === c.id
                      ? 'bg-[#0F172A] text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                  <span>{c.label}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleHighlightSelection}
              className="px-3.5 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-xs flex items-center gap-1.5 transition border border-amber-300 cursor-pointer"
              title="Highlight selected text inline inside the passage"
            >
              <Highlighter className="w-4 h-4 text-amber-800" />
              <span>Highlight Selection</span>
            </button>
            <button
              type="button"
              onClick={handleClearHighlights}
              className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition border border-[#E6E1D6] dark:border-slate-700 cursor-pointer"
              title="Clear all inline highlights"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {showAiPilotPanel && (
          <div className="pt-3 border-t border-[#E6E1D6] dark:border-slate-800">
            <CandidateAiPilotPanel
              module="academic_reading"
              moduleTitle="Academic Reading"
              onLaunchApprovedPilot={(examSet) => {
                setActiveReadingPilotSet(examSet);
                soundManager.playSuccess();
                onShowToast(`Launched Approved Academic Reading AI Pilot: "${examSet.title}"`);
              }}
            />
          </div>
        )}

        {/* Multi-Passage Selector Tabs */}
        <div className="pt-3 border-t border-[#E6E1D6] dark:border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-500 mr-1 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-[#B45309]" />
            <span>Select Reading Passage:</span>
          </span>
          {READING_LAB_PASSAGES.map((passage, idx) => {
            const isSelected = passage.id === activePassage.id;
            const isDone = Boolean(checkedByPassage[passage.id]);
            return (
              <button
                key={passage.id}
                type="button"
                onClick={() => {
                  soundManager.playBeep(600, 0.03);
                  setSelectedPassageId(passage.id);
                  setActiveTooltip(null);
                  setOpenNotePara(null);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
                  isSelected
                    ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-[#E6E1D6] dark:border-slate-700 hover:border-slate-400'
                }`}
              >
                <span className="font-mono text-[10px] opacity-80">P{idx + 1}</span>
                <span>{passage.topic}</span>
                {timersByPassage[passage.id]?.elapsedSeconds > 0 && (
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {formatTimerClock(timersByPassage[passage.id].elapsedSeconds)}
                  </span>
                )}
                {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Persistent Passage Timer & Pacing Bar */}
        <div className="pt-3 border-t border-[#E6E1D6] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-[#E6E1D6] dark:border-slate-700 shadow-2xs">
              <Clock
                className={`w-4 h-4 ${
                  currentTiming.elapsedSeconds > TARGET_PASSAGE_SECONDS
                    ? 'text-rose-600'
                    : isTimerRunning && !isChecked
                    ? 'text-[#1E3A8A] dark:text-blue-400 animate-pulse'
                    : 'text-slate-500'
                }`}
              />
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500">
                  Passage Timer:
                </span>
                <span
                  className={`font-mono text-sm font-black ${
                    currentTiming.elapsedSeconds > TARGET_PASSAGE_SECONDS
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-[#0F172A] dark:text-white'
                  }`}
                >
                  {formatTimerClock(currentTiming.elapsedSeconds)}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  / {formatTimerClock(TARGET_PASSAGE_SECONDS)} target
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {!isChecked && (
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playBeep(580, 0.03);
                    setIsTimerRunning((prev) => !prev);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-[#E6E1D6] dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title={isTimerRunning ? 'Pause reading timer' : 'Resume reading timer'}
                >
                  {isTimerRunning ? (
                    <>
                      <Pause className="w-3.5 h-3.5 text-amber-600" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Resume</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={handleResetPassageTimer}
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-[#E6E1D6] dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="Reset timer for this passage"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Timer</span>
              </button>
            </div>
          </div>

          {/* Active Question Navigator & Flag-for-Review Strip */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-[#0F4C45] dark:text-[#F4A62A]" />
              <span>Question Navigator:</span>
            </span>
            {([1, 2, 3, 4] as const).map((qNum) => {
              const qSecs = currentTiming.questionSeconds?.[qNum] || 0;
              const isFocused = activeQuestionNum === qNum && !isChecked;
              const isAnswered = Boolean(currentAnswers[qNum]);
              const isFlagged = Boolean(currentFlags[qNum]);
              return (
                <button
                  key={qNum}
                  type="button"
                  onClick={() => handleJumpToQuestion(qNum)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition flex items-center gap-1 border cursor-pointer ${
                    isFlagged
                      ? 'bg-[#FEF6E8] dark:bg-amber-950/60 text-[#9B6314] dark:text-amber-300 border-[#F4A62A]'
                      : isFocused
                      ? 'bg-[#0F4C45] text-white border-[#0F4C45]'
                      : isAnswered
                      ? 'bg-[#EEF3F1] dark:bg-[#0F4C45]/30 text-[#0F4C45] dark:text-emerald-300 border-[#9EBEB8] dark:border-[#1F8A70]/40'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-[#D3DDDA] dark:border-slate-700 hover:border-[#0F4C45]'
                  }`}
                  title={`Jump to Question ${qNum}${isFlagged ? ' (Flagged for Review)' : isAnswered ? ' (Answered)' : ''}`}
                >
                  {isFlagged && <Flag className="w-3 h-3 fill-current text-[#D0891F]" />}
                  <span>Q{qNum}</span>
                  <span className={isFocused ? 'text-[#F4A62A]' : 'opacity-70'}>
                    {qSecs}s
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Authentic CD-IELTS Accessibility Bar: Contrast Schemes & Font-Size Zoom */}
        <div className="pt-3 border-t border-[#E6E1D6] dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#566664] dark:text-slate-400 flex items-center gap-1">
              <Contrast className="w-3.5 h-3.5 text-[#0F4C45] dark:text-[#F4A62A]" />
              <span>CD-IELTS Contrast:</span>
            </span>
            {(
              [
                { id: 'standard', label: 'Standard' },
                { id: 'black-on-yellow', label: 'Black on Yellow' },
                { id: 'yellow-on-black', label: 'Yellow on Black' },
                { id: 'white-on-black', label: 'White on Black' }
              ] as const
            ).map((scheme) => (
              <button
                key={scheme.id}
                type="button"
                onClick={() => handleSetColorScheme(scheme.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border cursor-pointer ${
                  colorScheme === scheme.id
                    ? 'bg-[#0F4C45] text-white border-[#0F4C45]'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-[#D3DDDA] dark:border-slate-700 hover:border-[#0F4C45]'
                }`}
              >
                {scheme.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#566664] dark:text-slate-400 flex items-center gap-1 mr-1">
              <Type className="w-3.5 h-3.5 text-[#0F4C45] dark:text-[#F4A62A]" />
              <span>Text Size:</span>
            </span>
            {(['100%', '125%', '150%'] as CDIELTSZoomLevel[]).map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => handleSetZoomLevel(z)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition border cursor-pointer ${
                  zoomLevel === z
                    ? 'bg-[#0F4C45] text-white border-[#0F4C45]'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-[#D3DDDA] dark:border-slate-700 hover:border-[#0F4C45]'
                }`}
              >
                {z}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Saved Highlights Tray */}
      {currentHighlights.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E6E1D6] dark:border-slate-800 p-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono font-bold uppercase text-slate-500 mr-1">
            Active Inline Highlights ({currentHighlights.length}):
          </span>
          {currentHighlights.map((h, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleRemoveSingleHighlight(i)}
              title="Click to remove this highlight"
              className={`text-xs px-2.5 py-1 rounded-lg border font-serif italic flex items-center gap-1.5 cursor-pointer transition hover:opacity-80 ${
                h.color === 'amber'
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : h.color === 'emerald'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-rose-50 border-rose-300 text-rose-950'
              }`}
            >
              <span>&ldquo;{h.text}&rdquo;</span>
              <span className="text-[10px] font-sans font-bold opacity-60">×</span>
            </button>
          ))}
        </div>
      )}

      {/* Split Pane Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Realistic Academic Reading Passage (respects CD-IELTS Contrast & Zoom) */}
        <div
          className={`lg:col-span-7 rounded-3xl border p-6 sm:p-8 shadow-xs space-y-5 max-h-[820px] overflow-y-auto transition-colors duration-150 ${
            isHighContrast
              ? `${cdTheme.bg} ${cdTheme.border}`
              : 'bg-[#FAF8F5] dark:bg-slate-900 border-[#E6E1D6] dark:border-slate-800'
          }`}
        >
          <div className={`border-b pb-4 ${isHighContrast ? cdTheme.border : 'border-[#E6E1D6] dark:border-slate-800'}`}>
            <span className={`text-[11px] font-bold font-mono uppercase tracking-wider ${isHighContrast ? cdTheme.subtext : 'text-[#0F4C45] dark:text-[#F4A62A]'}`}>
              {activePassage.badge}
            </span>
            <h3 className={`text-xl sm:text-2xl font-extrabold mt-1 font-serif leading-snug ${isHighContrast ? cdTheme.text : 'text-[#0E1F1E] dark:text-white'}`}>
              {activePassage.title}
            </h3>
            <p className={`text-xs italic mt-1 ${isHighContrast ? cdTheme.subtext : 'text-slate-600 dark:text-slate-400'}`}>
              {activePassage.subtitle}
            </p>
          </div>

          <div className={`space-y-4 leading-relaxed font-serif ${cdFontSizeClass} ${isHighContrast ? cdTheme.text : 'text-[#0E1F1E] dark:text-slate-200'}`}>
            {(['A', 'B', 'C', 'D'] as ParagraphLetter[]).map((paraLetter) => {
              const noteKey = `${activePassage.id}_${paraLetter}`;
              const hasNote = Boolean(stickyNotes[noteKey]);
              const isNoteOpen = openNotePara === paraLetter || hasNote;

              return (
                <div
                  key={paraLetter}
                  id={`reading-para-${paraLetter}`}
                  className={`p-4 rounded-2xl transition-all duration-300 border ${
                    pulsingParagraph === paraLetter
                      ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/40 shadow-sm'
                      : isHighContrast
                      ? `${cdTheme.cardBg} ${cdTheme.border}`
                      : 'bg-white/80 dark:bg-slate-800/60 border-[#E6E1D6]/80 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2 font-sans">
                    <span className="text-[11px] font-mono font-bold text-[#1E3A8A] dark:text-blue-400">
                      PARAGRAPH [{paraLetter}]
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenNotePara(openNotePara === paraLetter ? null : paraLetter)}
                      className="text-[11px] font-semibold text-slate-500 hover:text-[#1E3A8A] flex items-center gap-1 cursor-pointer"
                    >
                      <StickyNote className="w-3.5 h-3.5 text-[#B45309]" />
                      <span>{hasNote ? 'Edit Gist Note' : '+ Gist Note'}</span>
                    </button>
                  </div>

                  <p className="selection:bg-amber-200 selection:text-slate-900">
                    <strong className="text-[#1E3A8A] dark:text-blue-400 font-sans font-bold mr-1.5">
                      [{paraLetter}]
                    </strong>
                    {renderAnnotatedParagraph(activePassage.paragraphs[paraLetter])}
                  </p>

                  {isNoteOpen && (
                    <div className="mt-3 font-sans">
                      <input
                        type="text"
                        value={stickyNotes[noteKey] || ''}
                        onChange={(e) => handleSaveStickyNote(paraLetter, e.target.value)}
                        placeholder={`Paragraph [${paraLetter}] heading / main idea note...`}
                        className="w-full px-3 py-2 rounded-xl bg-amber-50/90 dark:bg-slate-900 border border-amber-200 dark:border-slate-700 text-xs text-amber-950 dark:text-amber-200 outline-none focus:border-amber-500"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Question Suite & CEFR Vocabulary Inspector */}
        <div className="lg:col-span-5 space-y-4">
          {/* CEFR Floating Tooltip Card */}
          {activeTooltip && (
            <div className="p-5 rounded-3xl bg-[#0F172A] text-white shadow-xl border border-slate-800 animate-fadeIn">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-amber-300 font-serif">{activeTooltip.word}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1E3A8A] text-white border border-blue-400/30">
                    CEFR {activeTooltip.level}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTooltip(null)}
                  className="text-slate-400 hover:text-white text-xs font-bold px-2.5 py-1 bg-slate-800 rounded-lg cursor-pointer"
                >
                  Close
                </button>
              </div>
              <div className="mt-2 text-xs font-mono text-slate-400">{activeTooltip.phonetic}</div>

              {/* Bangla Meaning Box */}
              <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-start gap-1.5">
                <span className="font-bold text-amber-300 shrink-0">বাংলা অর্থ:</span>
                <span>{activeTooltip.banglaMeaning}</span>
              </div>

              <p className="mt-2.5 text-xs text-slate-200 leading-relaxed">{activeTooltip.definition}</p>
              <div className="mt-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                  Practice Academic Collocations:
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {activeTooltip.collocations.map((col, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] px-2.5 py-0.5 rounded-md bg-slate-800 text-amber-200 border border-slate-700"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800">
                <AskMentorContextualWidget
                  module="reading"
                  questionPrompt={`Clarify the C1/C2 concept and academic usage of "${activeTooltip.word}" (${activeTooltip.level}) in "${activePassage.title}"`}
                  questionType="lexical_concept"
                  topic={activePassage.topic}
                  evidenceContext={`${activeTooltip.word}: ${activeTooltip.definition}. Sample: ${activeTooltip.sample}`}
                  buttonLabel="Ask Mentor to Clarify Concept"
                  compact={true}
                />
              </div>
            </div>
          )}

          {/* Questions Container */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#E6E1D6] dark:border-slate-800 p-6 shadow-xs space-y-5">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1E3A8A] dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-md">
                Questions 1–3 · True / False / Not Given
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                Do the following statements agree with the information given in the reading passage?
              </p>
            </div>

            {activePassage.questions.map((q) => {
              const userVal = currentAnswers[q.num] || '';
              const isRight = userVal === q.correctAnswer;
              const langKey = `${activePassage.id}_${q.num}`;
              const activeLang = bilingualLang[langKey] || 'en';
              const options = q.type === 'tfng' ? ['TRUE', 'FALSE', 'NOT GIVEN'] : ['A', 'B', 'C', 'D'];

              const qSecs = currentTiming.questionSeconds?.[q.num] || 0;
              const isFocusedQ = activeQuestionNum === q.num && !isChecked;
              const isFlaggedQ = Boolean(currentFlags[q.num]);

              return (
                <div
                  key={q.num}
                  id={`reading-question-${q.num}`}
                  onClick={() => {
                    if (!isChecked) setActiveQuestionNum(q.num);
                  }}
                  className={`p-4 rounded-2xl border transition space-y-2.5 ${
                    isHighContrast
                      ? `${cdTheme.cardBg} ${cdTheme.border} ${cdTheme.text}`
                      : isFlaggedQ
                      ? 'bg-[#FEF6E8]/70 dark:bg-amber-950/25 border-[#F4A62A]'
                      : isFocusedQ
                      ? 'bg-[#FAF8F5] dark:bg-slate-800/70 border-[#0F4C45]/50 dark:border-[#1F8A70]/60 ring-1 ring-[#0F4C45]/15'
                      : 'bg-[#FAF8F5] dark:bg-slate-800/70 border-[#E6E1D6] dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    {q.type === 'matching' ? (
                      <span className="text-[10px] font-mono font-bold text-[#9B6314] dark:text-[#F4A62A] uppercase tracking-wider block">
                        Question 4 · Paragraph Information Matching
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider">
                        Question {q.num} · True / False / Not Given
                      </span>
                    )}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFlagQuestion(q.num);
                        }}
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 transition cursor-pointer ${
                          isFlaggedQ
                            ? 'bg-[#F4A62A] text-[#0E1F1E] border-[#D0891F]'
                            : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-[#F4A62A]'
                        }`}
                        title={isFlaggedQ ? 'Remove review flag' : 'Flag question for review'}
                      >
                        <Flag className={`w-3 h-3 ${isFlaggedQ ? 'fill-current' : ''}`} />
                        <span>{isFlaggedQ ? 'Flagged' : 'Flag'}</span>
                      </button>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                          qSecs > TARGET_SECONDS_PER_QUESTION
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            : isFocusedQ
                            ? 'bg-[#EEF3F1] dark:bg-[#0F4C45]/50 text-[#0F4C45] dark:text-emerald-300 border-[#9EBEB8] dark:border-[#1F8A70]'
                            : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        ⏱ {qSecs}s
                      </span>
                    </div>
                  </div>
                  <p className={`font-semibold leading-relaxed ${zoomLevel === '150%' ? 'text-base' : zoomLevel === '125%' ? 'text-sm' : 'text-xs sm:text-[13px]'} ${isHighContrast ? cdTheme.text : 'text-[#0E1F1E] dark:text-slate-100'}`}>
                    <strong>{q.num}.</strong> {q.statement}
                  </p>

                  <div className="flex gap-2">
                    {options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleSelectAnswer(q.num, opt)}
                        className={`flex-1 min-h-[42px] py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          userVal === opt
                            ? 'bg-[#1E3A8A] text-white border-[#1E3A8A] shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {q.type === 'matching' ? `Para ${opt}` : opt}
                      </button>
                    ))}
                  </div>

                    {isChecked && (
                    <div
                      className={`text-xs p-3.5 rounded-xl border space-y-2 ${
                        isRight
                          ? 'bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-200 text-emerald-950 dark:text-emerald-200'
                          : 'bg-rose-50/90 dark:bg-rose-950/30 border-rose-200 text-rose-950 dark:text-rose-200'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 font-bold">
                        <span>
                          {isRight
                            ? `✓ Correct (1 pt): ${q.type === 'matching' ? `Paragraph ${q.correctAnswer}` : q.correctAnswer}`
                            : !userVal
                            ? `○ Unanswered (0 pts): Correct Answer is ${q.type === 'matching' ? `Paragraph ${q.correctAnswer}` : q.correctAnswer}`
                            : `✗ Incorrect (0 pts): Answer is ${q.type === 'matching' ? `Paragraph ${q.correctAnswer}` : q.correctAnswer}`}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleLocateEvidence(q.evidencePara)}
                            className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[#1E3A8A] dark:text-blue-300 hover:bg-blue-50 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Compass className="w-3 h-3" />
                            <span>Locate [Para {q.evidencePara}]</span>
                          </button>
                          <div className="flex items-center gap-1 bg-white/90 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px]">
                            <button
                              type="button"
                              onClick={() => setBilingualLang((p) => ({ ...p, [langKey]: 'en' }))}
                              className={`px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                                activeLang === 'en'
                                  ? 'bg-[#0F172A] text-white'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              🇬🇧 EN
                            </button>
                            <button
                              type="button"
                              onClick={() => setBilingualLang((p) => ({ ...p, [langKey]: 'bn' }))}
                              className={`px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                                activeLang === 'bn'
                                  ? 'bg-emerald-700 text-white'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              🇧🇩 বাং
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                        {activeLang === 'bn' ? (
                          <p>
                            <strong>ফাঁদ বিশ্লেষণ (Bengali Trap Note):</strong> {q.explanationBn}
                          </p>
                        ) : (
                          <p>
                            <strong>Evidence & Examiner Logic:</strong> {q.explanationEn}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Contextual Gemini 'Ask Mentor' Button & On-Demand Explanation Panel */}
                  <div className="pt-1">
                    <AskMentorContextualWidget
                      module="reading"
                      questionPrompt={q.statement}
                      questionType={q.type}
                      topic={`${activePassage.title} (${activePassage.topic})`}
                      evidenceContext={`Paragraph [${q.evidencePara}]: ${activePassage.paragraphs[q.evidencePara]}`}
                      userAnswer={userVal}
                      correctAnswer={q.type === 'matching' ? `Paragraph ${q.correctAnswer}` : q.correctAnswer}
                      trapNote={`${q.trapTitle} — ${q.explanationEn}`}
                      isAnswerRevealed={isChecked}
                      buttonLabel={isChecked ? 'Ask Mentor Why' : 'Ask Mentor'}
                      compact={true}
                    />
                  </div>
                </div>
              );
            })}

            {isChecked && (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                      Practice Reading Conversion
                    </div>
                    <div className="text-xs font-bold mt-0.5">
                      Raw Score: {currentPassageScore.correct} / {currentPassageScore.total} Correct
                      {currentPassageScore.unanswered > 0 && ` (${currentPassageScore.unanswered} unanswered = 0 pts)`}
                    </div>
                  </div>
                  <div className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 text-right shrink-0">
                    <div className="text-[9px] font-mono uppercase text-slate-300">Band Score</div>
                    <div className="text-lg font-mono font-black text-amber-300">
                      Band {currentPassageScore.band.toFixed(1)}
                    </div>
                  </div>
                </div>

                {/* End-of-Session Time-Per-Question Pacing Analysis */}
                <div className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-slate-800/90 border border-[#E6E1D6] dark:border-slate-700 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-[#1E3A8A] dark:text-blue-400" />
                      <span className="text-xs font-extrabold uppercase tracking-wider text-[#0F172A] dark:text-white font-mono">
                        Time-Per-Question Pacing Analysis
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
                      Total: {formatTimerClock(currentTiming.elapsedSeconds)} · Avg:{' '}
                      {Math.round(currentTiming.elapsedSeconds / activePassage.questions.length)}s / question
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {activePassage.questions.map((q) => {
                      const qSecs = currentTiming.questionSeconds?.[q.num] || 0;
                      const userVal = currentAnswers[q.num] || '';
                      const isRight = userVal === q.correctAnswer;
                      const paceStatus =
                        qSecs <= 60 ? 'Fast' : qSecs <= TARGET_SECONDS_PER_QUESTION ? 'Optimal' : 'Over Target';
                      const paceBadgeClass =
                        qSecs <= 60
                          ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : qSecs <= TARGET_SECONDS_PER_QUESTION
                          ? 'bg-blue-100 text-[#1E3A8A] dark:bg-blue-950/60 dark:text-blue-300'
                          : 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300';

                      return (
                        <div
                          key={q.num}
                          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[#E6E1D6] dark:border-slate-800 space-y-1"
                        >
                          <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                            <span className="text-slate-700 dark:text-slate-200">Q{q.num}</span>
                            <span className={isRight ? 'text-emerald-600' : 'text-rose-600'}>
                              {isRight ? '✓ Correct' : !userVal ? '○ Blank' : '✗ Miss'}
                            </span>
                          </div>
                          <div className="text-sm font-mono font-black text-[#0F172A] dark:text-white">
                            {qSecs}s
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${paceBadgeClass}`}>
                              {paceStatus}
                            </span>
                            <span className="text-[9px] font-mono text-slate-400">
                              /{TARGET_SECONDS_PER_QUESTION}s
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    <strong>Practice Pacing Benchmark:</strong> Aim for ≤ {TARGET_SECONDS_PER_QUESTION}s per question
                    ({formatTimerClock(TARGET_PASSAGE_SECONDS)} per 4-question sprint) to complete all 40 Academic Reading questions within 60 minutes.
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleCheckAnswers}
              className="w-full min-h-[46px] py-3.5 px-4 rounded-2xl bg-[#1E3A8A] hover:bg-[#172E6E] text-white font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer"
            >
              Verify {activePassage.topic} Answers &amp; Log to SM-2 Vault
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

