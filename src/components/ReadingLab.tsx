import React, { useState } from 'react';
import { Highlighter, Trash2, Sparkles, StickyNote, Compass, BookOpen, CheckCircle2 } from 'lucide-react';
import { CefrTerm } from '../types';
import { soundManager } from '../utils/audioEffects';
import { addMistake } from '../utils/vaultStorage';
import { questionEngine } from '../services/QuestionEngine';

interface ReadingLabProps {
  onShowToast: (msg: string) => void;
}

type HighlightColor = 'amber' | 'emerald' | 'rose';
type ParagraphLetter = 'A' | 'B' | 'C' | 'D';

interface HighlightEntry {
  text: string;
  color: HighlightColor;
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
  }
];

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const ReadingLab: React.FC<ReadingLabProps> = ({ onShowToast }) => {
  const [selectedPassageId, setSelectedPassageId] = useState<string>(READING_LAB_PASSAGES[0].id);
  const activePassage =
    READING_LAB_PASSAGES.find((p) => p.id === selectedPassageId) || READING_LAB_PASSAGES[0];

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

  const currentHighlights = highlightsByPassage[activePassage.id] || [];
  const currentAnswers = answersByPassage[activePassage.id] || {};
  const isChecked = Boolean(checkedByPassage[activePassage.id]);

  const handleSelectAnswer = (qNum: number, val: string) => {
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
      `Reading Scored: ${currentPassageScore.correct}/${currentPassageScore.total} Correct · Official Band ${currentPassageScore.band.toFixed(1)}`
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

  return (
    <div className="space-y-6">
      {/* Top Header, Passage Switcher & CD-IELTS 3-Color Highlighter Controls */}
      <div className="bg-[#FAF8F5] dark:bg-slate-900 rounded-3xl border border-[#E6E1D6] dark:border-slate-800 p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#1E3A8A]/10 dark:bg-blue-950/60 border border-[#1E3A8A]/20 text-[#1E3A8A] dark:text-blue-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-[#B45309]" /> Cambridge CD-IELTS Academic Reading Studio
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] dark:text-white mt-1.5 font-serif tracking-tight">
              Reading Lab & In-Situ CEFR Vocabulary Scanner
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Select any text in the passage to highlight inline, add paragraph gist notes, and click underlined terms for CEFR B2–C2 bilingual analysis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
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
                {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
              </button>
            );
          })}
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
        {/* Left Pane: Authentic Academic Reading Passage on Warm Ivory Paper */}
        <div className="lg:col-span-7 bg-[#FAF8F5] dark:bg-slate-900 rounded-3xl border border-[#E6E1D6] dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-5 max-h-[820px] overflow-y-auto">
          <div className="border-b border-[#E6E1D6] dark:border-slate-800 pb-4">
            <span className="text-[11px] font-bold text-[#B45309] font-mono uppercase tracking-wider">
              {activePassage.badge}
            </span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] dark:text-white mt-1 font-serif leading-snug">
              {activePassage.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 italic mt-1">
              {activePassage.subtitle}
            </p>
          </div>

          <div className="space-y-4 text-[15px] text-[#0F172A] dark:text-slate-200 leading-relaxed font-serif">
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
                  Cambridge Academic Collocations:
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

              return (
                <div
                  key={q.num}
                  className="p-4 rounded-2xl bg-[#FAF8F5] dark:bg-slate-800/70 border border-[#E6E1D6] dark:border-slate-800 space-y-2.5"
                >
                  {q.type === 'matching' && (
                    <span className="text-[10px] font-mono font-bold text-[#B45309] uppercase tracking-wider block">
                      Question 4 · Paragraph Information Matching
                    </span>
                  )}
                  <p className="text-xs sm:text-[13px] font-semibold text-[#0F172A] dark:text-slate-100 leading-relaxed">
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
                </div>
              );
            })}

            {isChecked && (
              <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                    Official Cambridge Reading Conversion
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

