/**
 * BandSprint - Comprehensive Master Vocabulary Database
 * Contains 1080+ structured entries spanning words, phrases, and idioms.
 *
 * Each entry provides complete academic and conversational attributes:
 * - word: English term, phrase, or idiom
 * - meaning_bn: Complete Bengali translation and meaning
 * - definition: Concise English definition
 * - synonyms: Academic and colloquial equivalents
 * - antonyms: Opposing terms where applicable
 * - example: Realistic IELTS-style exam sentence
 * - level: CEFR difficulty level (A2, B1, B2, C1, C2)
 * - topic: Categorized topic for easy navigation
 * - category: 'word' | 'phrase' | 'idiom'
 */

import { VocabCard } from '../types';

export interface VocabularyEntry {
  id: string;
  word: string;
  category: 'word' | 'phrase' | 'idiom';
  part_of_speech?: string;
  meaning_bn: string;
  pronunciation_bn?: string;
  definition: string;
  synonyms: string[];
  antonyms: string[];
  example: string;
  level: 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  topic: string;
  collocations?: string[];
  warning?: string;
  ielts_usage?: string;
}

import { MASTER_1000_VOCAB_DATABASE } from './masterVocabDatabase';

const CORE_VOCABULARY_ENTRIES: VocabularyEntry[] = [
  {
    "id": "rv_env_1",
    "word": "Mitigate",
    "meaning_bn": "হ্রাস করা / উপশম করা / ক্ষতিকর তীব্রতা প্রশমিত করা",
    "pronunciation_bn": "মিটিগেট",
    "definition": "To make something less severe, harmful, unpleasant, or intense.",
    "synonyms": [
      "Alleviate",
      "Attenuate",
      "Moderate",
      "Cushion",
      "Diminish"
    ],
    "antonyms": [
      "Exacerbate",
      "Aggravate",
      "Intensify"
    ],
    "example": "National afforestation policies can effectively mitigate the catastrophic repercussions of extreme weather anomalies.",
    "level": "C1",
    "topic": "Environment & Climate",
    "category": "word",
    "part_of_speech": "Verb",
    "collocations": [
      "mitigate risks",
      "mitigate the impact",
      "mitigate climate change",
      "mitigate circumstances"
    ],
    "warning": "Do not use \"mitigate against\" as a synonym for prevent; \"mitigate\" directly takes an object (\"mitigate the effect\").",
    "ielts_usage": "Essential for Writing Task 2 when formulating problem-solution body paragraphs on environmental degradation."
  },
  {
    "id": "rv_env_2",
    "word": "Degradation",
    "meaning_bn": "অবনতি / পরিবেশের গুণমান বা উর্বরতা হ্রাস পাওয়া",
    "pronunciation_bn": "ডিগ্রেডেশন",
    "definition": "The process in which the quality, condition, or state of the natural environment deteriorates.",
    "synonyms": [
      "Deterioration",
      "Depletion",
      "Erosion",
      "Decline"
    ],
    "antonyms": [
      "Restoration",
      "Preservation",
      "Revitalization"
    ],
    "example": "Rapid industrial effluent discharge precipitates severe ecological degradation in fragile riparian zones.",
    "level": "C1",
    "topic": "Environment & Climate",
    "category": "word",
    "part_of_speech": "Noun",
    "collocations": [
      "environmental degradation",
      "land degradation",
      "soil degradation",
      "arrest degradation"
    ],
    "warning": "Distinguish from \"debasement\" (moral decline); use \"degradation\" for environmental or physical decay.",
    "ielts_usage": "High-frequency in Academic Reading passages analyzing ecosystems and in Task 2 essays discussing urban growth."
  },
  {
    "id": "rv_env_3",
    "word": "Biodiversity",
    "meaning_bn": "জীববৈচিত্র্য / কোনো বাস্তুতন্ত্রে বিভিন্ন প্রজাতির উদ্ভিদের ও প্রাণীর প্রাচুর্য",
    "pronunciation_bn": "বায়োডাইভার্সিটি",
    "definition": "The variety and variability of plant and animal life in a specific habitat or on Earth as a whole.",
    "synonyms": [
      "Biological variety",
      "Ecological diversity"
    ],
    "antonyms": [
      "Monoculture",
      "Homogeneity"
    ],
    "example": "Intensive agricultural practices threaten terrestrial biodiversity by eradicating endemic pollinator species.",
    "level": "B2",
    "topic": "Environment & Climate",
    "category": "word",
    "part_of_speech": "Noun",
    "collocations": [
      "loss of biodiversity",
      "conserve biodiversity",
      "rich biodiversity",
      "threat to biodiversity"
    ],
    "warning": "Avoid treating as plural; \"biodiversity\" is an uncountable collective noun: \"biodiversity is decreasing\".",
    "ielts_usage": "Mandatory vocabulary for Speaking Part 3 and Writing Task 2 questions regarding species extinction."
  },
  {
    "id": "rv_env_4",
    "word": "Depletion",
    "meaning_bn": "নিঃশেষকরণ / কোনো সম্পদের মজুত আশঙ্কাজনকভাবে কমে যাওয়া",
    "pronunciation_bn": "ডিপ্লিশন",
    "definition": "Reduction in the number, quantity, or reserve of something valuable.",
    "synonyms": [
      "Exhaustion",
      "Drain",
      "Diminution",
      "Consumption"
    ],
    "antonyms": [
      "Replenishment",
      "Augmentation",
      "Restoration"
    ],
    "example": "The unbridled depletion of subterranean aquifers threatens agrarian food security in South Asia.",
    "level": "B2",
    "topic": "Environment & Climate",
    "category": "word",
    "part_of_speech": "Noun",
    "collocations": [
      "resource depletion",
      "ozone depletion",
      "rapid depletion",
      "aquifer depletion"
    ],
    "warning": "Spell with \"tion\", not \"sion\". Verb form is \"deplete\".",
    "ielts_usage": "Band 8+ noun in Writing Task 2 when evaluating fossil fuel reliance and freshwater scarcity."
  },
  {
    "id": "rv_env_5",
    "word": "Sustainable",
    "meaning_bn": "টেকসই / পরিবেশের ক্ষতি না করে দীর্ঘকাল বজায় রাখা সম্ভব এমন",
    "pronunciation_bn": "সাস্টেইনেবল",
    "definition": "Able to be maintained at a certain rate or level without exhausting natural resources or causing ecological damage.",
    "synonyms": [
      "Viable",
      "Renewable",
      "Eco-friendly",
      "Maintainable"
    ],
    "antonyms": [
      "Unsustainable",
      "Depleting",
      "Destructive"
    ],
    "example": "Governments must incentivize sustainable public transit infrastructure to curb carbon emissions.",
    "level": "B1",
    "topic": "Environment & Climate",
    "category": "word",
    "part_of_speech": "Adjective",
    "collocations": [
      "sustainable development",
      "sustainable energy",
      "sustainable practices",
      "sustainable future"
    ],
    "warning": "Ensure correct adverb formation: \"sustainably\", noun: \"sustainability\".",
    "ielts_usage": "Core keyword across Listening Section 4 lectures and Academic Writing essays on green architecture."
  },
  {
    "id": "rv_tech_1",
    "word": "Ubiquitous",
    "meaning_bn": "সর্বব্যাপী / সর্বত্র বিরাজমান বা সহজেই দৃশ্যমান",
    "pronunciation_bn": "ইউবিক্যুইটাস",
    "definition": "Present, appearing, or found everywhere in global society simultaneously.",
    "synonyms": [
      "Omnipresent",
      "Pervasive",
      "Prevalent",
      "Widespread"
    ],
    "antonyms": [
      "Rare",
      "Scarce",
      "Localized",
      "Infrequent"
    ],
    "example": "Smartphones and autonomous cashless transactions have become ubiquitous even in remote agrarian districts.",
    "level": "C1",
    "topic": "Technology & AI",
    "category": "word",
    "part_of_speech": "Adjective",
    "collocations": [
      "become ubiquitous",
      "virtually ubiquitous",
      "ubiquitous presence",
      "ubiquitous technology"
    ],
    "warning": "Avoid saying \"very ubiquitous\"; since it already means found everywhere, it functions as an absolute adjective.",
    "ielts_usage": "Ideal in Writing Task 2 introductions to establish how prevalent internet technology has become."
  },
  {
    "id": "rv_tech_2",
    "word": "Obsolescence",
    "meaning_bn": "অপ্রচলিত বা সেকেলে হয়ে পড়া / কার্যকারিতা হারানো",
    "pronunciation_bn": "অবসোলেসেন্স",
    "definition": "The state or condition of being no longer used, useful, or modern because something newer has replaced it.",
    "synonyms": [
      "Antiquation",
      "Disuse",
      "Supersession",
      "Outmodedness"
    ],
    "antonyms": [
      "Modernity",
      "Currency",
      "Innovation"
    ],
    "example": "Planned obsolescence in consumer electronics generates tons of hazardous electronic waste annually.",
    "level": "C2",
    "topic": "Technology & AI",
    "category": "word",
    "part_of_speech": "Noun",
    "collocations": [
      "planned obsolescence",
      "built-in obsolescence",
      "rapid obsolescence",
      "fall into obsolescence"
    ],
    "warning": "Adjective is \"obsolete\". Do not spell with \"c\" at the beginning.",
    "ielts_usage": "Impressive Academic lexical term when discussing digital gadgets and manufacturing sustainability."
  },
  {
    "id": "rv_tech_3",
    "word": "Autonomous",
    "meaning_bn": "স্বয়ংক্রিয় / মানবীয় নিয়ন্ত্রণ ছাড়া স্বাধীনভাবে পরিচালিত",
    "pronunciation_bn": "অটোনমাস",
    "definition": "Acting independently or having the freedom to do so without continuous human oversight.",
    "synonyms": [
      "Self-governing",
      "Automated",
      "Independent",
      "Self-directed"
    ],
    "antonyms": [
      "Manual",
      "Dependent",
      "Subordinate"
    ],
    "example": "The deployment of autonomous vehicles promises to reduce traffic fatalities caused by driver fatigue.",
    "level": "B2",
    "topic": "Technology & AI",
    "category": "word",
    "part_of_speech": "Adjective",
    "collocations": [
      "autonomous vehicles",
      "autonomous systems",
      "autonomous decision-making",
      "act autonomously"
    ],
    "warning": "Pronounced /ɔːˈtɒn.ə.məs/ with emphasis on the second syllable.",
    "ielts_usage": "High-scoring vocabulary for Speaking Part 3 artificial intelligence and future transportation prompts."
  },
  {
    "id": "rv_tech_4",
    "word": "Disruptive",
    "meaning_bn": "আমূল পরিবর্তনকারী / প্রচলিত ধারাকে ভেঙে নতুন রূপ দেয় এমন",
    "pronunciation_bn": "ডিসরাপটিভ",
    "definition": "Innovatively altering or overturning an established industry, market, or technological paradigm.",
    "synonyms": [
      "Revolutionary",
      "Transformative",
      "Groundbreaking",
      "Radical"
    ],
    "antonyms": [
      "Conventional",
      "Traditional",
      "Orthodox"
    ],
    "example": "Generative AI represents a disruptive technology that is fundamentally restructuring the white-collar labor force.",
    "level": "C1",
    "topic": "Technology & AI",
    "category": "word",
    "part_of_speech": "Adjective",
    "collocations": [
      "disruptive technology",
      "disruptive innovation",
      "disruptive impact",
      "highly disruptive"
    ],
    "warning": "In everyday English \"disruptive\" can mean troublesome (a disruptive child); in IELTS economics/tech it refers to radical change.",
    "ielts_usage": "Perfect for Writing Task 2 essays examining the benefits vs. drawbacks of rapid automation."
  },
  {
    "id": "rv_edu_1",
    "word": "Pedagogy",
    "meaning_bn": "শিক্ষাদান পদ্ধতি / শিক্ষাতত্ত্ব ও শিক্ষণবিদ্যা",
    "pronunciation_bn": "পেডাগজি",
    "definition": "The method, principles, and practice of teaching, especially as an academic discipline.",
    "synonyms": [
      "Didactics",
      "Teaching method",
      "Educational theory",
      "Instruction"
    ],
    "antonyms": [],
    "example": "Progressive pedagogies emphasize collaborative student-centered inquiry rather than rote memorization.",
    "level": "C1",
    "topic": "Education",
    "category": "word",
    "part_of_speech": "Noun",
    "collocations": [
      "modern pedagogy",
      "innovative pedagogy",
      "critical pedagogy",
      "pedagogical methods"
    ],
    "warning": "Adjective is \"pedagogical\" (পেডাগজিক্যাল). Do not confuse with demagogy.",
    "ielts_usage": "Outstanding Band 8.5 term for academic essays critiquing traditional schooling regimes."
  },
  {
    "id": "rv_edu_2",
    "word": "Curriculum",
    "meaning_bn": "পাঠ্যক্রম / শিক্ষা প্রতিষ্ঠানের পূর্ণাঙ্গ অধ্যয়নসূচি",
    "pronunciation_bn": "কারিকুলাম",
    "definition": "The subjects comprising a course of study in a school or college.",
    "synonyms": [
      "Syllabus",
      "Course of study",
      "Program of instruction"
    ],
    "antonyms": [],
    "example": "Integrating financial literacy into the secondary school curriculum equips youngsters for adult responsibilities.",
    "level": "B1",
    "topic": "Education",
    "category": "word",
    "part_of_speech": "Noun",
    "collocations": [
      "national curriculum",
      "core curriculum",
      "extracurricular activities",
      "broad curriculum"
    ],
    "warning": "Plural can be either \"curricula\" (traditional Latin) or \"curriculums\". Avoid saying \"curriculum syllabus\".",
    "ielts_usage": "Ubiquitous throughout IELTS Speaking Part 1 & Writing Task 2 education prompts."
  },
  {
    "id": "rv_edu_3",
    "word": "Rote",
    "meaning_bn": "মুখস্থ বিদ্যা / অর্থ না বুঝে তোতাপাখির মতো মুখস্থ করা",
    "pronunciation_bn": "রোট",
    "definition": "Mechanical or habitual repetition of something to be learned without genuine comprehension.",
    "synonyms": [
      "Mechanical learning",
      "Memorization without understanding",
      "Drill"
    ],
    "antonyms": [
      "Conceptual learning",
      "Critical thinking"
    ],
    "example": "Excessive reliance on rote learning stifles children’s innate curiosity and lateral problem-solving capabilities.",
    "level": "B2",
    "topic": "Education",
    "category": "word",
    "part_of_speech": "Noun / Adjective",
    "collocations": [
      "rote memorization",
      "rote learning",
      "by rote",
      "learn by rote"
    ],
    "warning": "Always used with learning or memorization: \"learn by rote\", not \"by rote learn\".",
    "ielts_usage": "Superb phrase in Speaking Part 3 when comparing Asian and Western educational philosophies."
  },
  {
    "id": "rv_edu_4",
    "word": "Holistic",
    "meaning_bn": "সামগ্রিক / সবদিক বিবেচনা করে পরিচালিত",
    "pronunciation_bn": "হোলিস্টিক",
    "definition": "Characterized by the treatment of the whole person or system, taking into account mental and social factors rather than isolated parts.",
    "synonyms": [
      "Comprehensive",
      "Integrated",
      "All-encompassing",
      "Well-rounded"
    ],
    "antonyms": [
      "Narrow",
      "Fragmented",
      "Compartmentalized"
    ],
    "example": "A truly holistic education fosters emotional quotient, athletic prowess, and moral values alongside academic grades.",
    "level": "C1",
    "topic": "Education",
    "category": "word",
    "part_of_speech": "Adjective",
    "collocations": [
      "holistic approach",
      "holistic development",
      "holistic view",
      "holistic education"
    ],
    "warning": "Spelled with \"h\", not \"wh\". Adverb is \"holistically\".",
    "ielts_usage": "Favorite collocated term for Task 2 conclusions proposing well-balanced state education reforms."
  },
  {
    "id": "rv_med_1",
    "word": "Sedentary",
    "meaning_bn": "বসে বসে কাটানো / কায়িক পরিশ্রমহীন জীবনযাপন",
    "pronunciation_bn": "সিডেনটারি",
    "definition": "Tending to spend much time seated; somewhat inactive with negligible physical exercise.",
    "synonyms": [
      "Inactive",
      "Desk-bound",
      "Immobile",
      "Stationary"
    ],
    "antonyms": [
      "Active",
      "Vigorous",
      "Energetic",
      "Kinetic"
    ],
    "example": "Prolonged screen exposure encourages a sedentary lifestyle, elevating the incidence of juvenile obesity and cardiovascular disorders.",
    "level": "B2",
    "topic": "Health & Medicine",
    "category": "word",
    "part_of_speech": "Adjective",
    "collocations": [
      "sedentary lifestyle",
      "sedentary job",
      "sedentary habits",
      "remain sedentary"
    ],
    "warning": "Pronounced /ˈsed.ən.tər.i/ in British English with accent on the first syllable.",
    "ielts_usage": "Core lexical resource for Writing Task 2 health questions and Speaking Part 1 leisure discussions."
  },
  {
    "id": "rv_med_2",
    "word": "Preventative",
    "meaning_bn": "প্রতিরোধমূলক / রোগ বা সমস্যা ঘটার আগেই প্রতিরোধক ব্যবস্থা",
    "pronunciation_bn": "প্রিভেনটেটিভ",
    "definition": "Designed or used to prevent something from happening, especially sickness or physical illness.",
    "synonyms": [
      "Prophylactic",
      "Precautionary",
      "Preventive",
      "Deterrent"
    ],
    "antonyms": [
      "Curative",
      "Remedial",
      "Reactive"
    ],
    "example": "Investing state budgets in preventative medicine yields vastly superior long-term dividends compared to emergency therapeutics.",
    "level": "B2",
    "topic": "Health & Medicine",
    "category": "word",
    "part_of_speech": "Adjective / Noun",
    "collocations": [
      "preventative healthcare",
      "preventative measures",
      "preventative medicine",
      "take preventative action"
    ],
    "warning": "Both \"preventative\" and \"preventive\" are acceptable; \"preventive\" is slightly more common in British academic texts.",
    "ielts_usage": "High-scoring argument in public health funding debates in Writing Task 2."
  },
  {
    "id": "rv_med_3",
    "word": "Efficacy",
    "meaning_bn": "কার্যকারিতা / কাঙ্ক্ষিত ফলপ্রসূতা প্রদর্শনের ক্ষমতা",
    "pronunciation_bn": "এফিকেসি",
    "definition": "The ability to produce a desired or intended outcome or therapeutic effect.",
    "synonyms": [
      "Effectiveness",
      "Potency",
      "Productiveness",
      "Utility"
    ],
    "antonyms": [
      "Inefficacy",
      "Ineffectiveness",
      "Futility"
    ],
    "example": "Rigorous clinical peer reviews are imperative to substantiate the therapeutic efficacy of newly synthesized vaccines.",
    "level": "C1",
    "topic": "Health & Medicine",
    "category": "word",
    "part_of_speech": "Noun",
    "collocations": [
      "demonstrate efficacy",
      "clinical efficacy",
      "prove efficacy",
      "high efficacy"
    ],
    "warning": "Do not confuse with \"efficiency\" (speed/low waste); \"efficacy\" is the power to achieve the actual objective.",
    "ielts_usage": "Found in Academic Reading passages on pharmacology and scientific investigations."
  },
  {
    "id": "rv_soc_1",
    "word": "Gentrification",
    "meaning_bn": "শহুরে এলাকার রূপান্তর ও আভিজাতিকরণ / নিম্নবিত্ত পাড়ায় ধনী ব্যক্তিদের বসতি গড়ে ওঠা",
    "pronunciation_bn": "জেন্ট্রিফিকেশন",
    "definition": "The process whereby the character of a poor urban area is changed by wealthier people moving in, improving housing, and displacing original inhabitants.",
    "synonyms": [
      "Urban renewal",
      "Modernization",
      "Neighborhood upgrading"
    ],
    "antonyms": [],
    "example": "Uncontrolled gentrification elevates rental tariffs, inevitably displacing multi-generational low-income residents to peripheral suburbs.",
    "level": "C2",
    "topic": "Society & Cities",
    "category": "word",
    "part_of_speech": "Noun",
    "collocations": [
      "rapid gentrification",
      "urban gentrification",
      "resist gentrification",
      "neighborhood gentrification"
    ],
    "warning": "Pronounced /ˌdʒen.trɪ.fɪˈkeɪ.ʃən/. Verb is \"gentrify\".",
    "ielts_usage": "Superb C2 term for Writing Task 2 essays discussing urban housing shortages and city zoning."
  },
  {
    "id": "rv_soc_2",
    "word": "Infrastructure",
    "meaning_bn": "অবকাঠামো / রাস্তাঘাট, বিদ্যুৎ, যোগাযোগ ব্যবস্থার মতো মৌলিক ভিত্তি",
    "pronunciation_bn": "ইনফ্রাস্ট্রাকচার",
    "definition": "The basic physical and organizational structures and facilities needed for the operation of a society or enterprise.",
    "synonyms": [
      "Public utilities",
      "Foundations",
      "Framework",
      "Substructure"
    ],
    "antonyms": [],
    "example": "Substantial capital expenditure on electrified rail infrastructure mitigates urban vehicular congestion.",
    "level": "B1",
    "topic": "Society & Cities",
    "category": "word",
    "part_of_speech": "Noun",
    "collocations": [
      "transport infrastructure",
      "critical infrastructure",
      "modern infrastructure",
      "aging infrastructure"
    ],
    "warning": "Countable / uncountable; usually used in the singular: \"infrastructure is aging\", not \"infrastructures are\".",
    "ielts_usage": "Indispensable in Speaking Part 3 and Writing Task 2 urban development essays."
  },
  {
    "id": "rv_soc_3",
    "word": "Congestion",
    "meaning_bn": "যানজট / অতিরিক্ত ভিড় ও গতিহীনতা",
    "pronunciation_bn": "কনজেসশন",
    "definition": "The state of being overcrowded, packed, or blocked with traffic or human density.",
    "synonyms": [
      "Traffic jam",
      "Gridlock",
      "Bottleneck",
      "Overcrowding"
    ],
    "antonyms": [
      "Flow",
      "Clearance",
      "Fluency"
    ],
    "example": "Congestion pricing in central metropolitan zones has markedly curbed tailpipe emissions.",
    "level": "B1",
    "topic": "Society & Cities",
    "category": "word",
    "part_of_speech": "Noun",
    "collocations": [
      "traffic congestion",
      "congestion charge",
      "ease congestion",
      "relieve congestion"
    ],
    "warning": "Pronounce with soft \"g\" /kənˈdʒes.tʃən/. Adjective is \"congested\".",
    "ielts_usage": "High-frequency in Speaking Part 1 transportation questions and Task 2 town planning tasks."
  },
  {
    "id": "rv_econ_1",
    "word": "Remuneration",
    "meaning_bn": "পারিশ্রমিক / কাজের বিনিময়ে প্রাপ্য বেতন ও ভাতাদি",
    "pronunciation_bn": "রিমুয়ানেরেশন",
    "definition": "Money paid for work or a service rendered; comprehensive financial compensation.",
    "synonyms": [
      "Compensation",
      "Emolument",
      "Salary",
      "Recompense",
      "Wages"
    ],
    "antonyms": [],
    "example": "Competitive remuneration packages are instrumental in arresting the brain drain of elite scientific personnel.",
    "level": "C1",
    "topic": "Economy & Work",
    "category": "word",
    "part_of_speech": "Noun",
    "collocations": [
      "financial remuneration",
      "adequate remuneration",
      "receive remuneration",
      "remuneration committee"
    ],
    "warning": "Common misspelling: write \"re-mun-er-ation\", NOT \"renumeration\" (which does not exist).",
    "ielts_usage": "Replaces simple words like \"pay\" or \"salary\" to elevate Lexical Resource to Band 8.5."
  },
  {
    "id": "rv_econ_2",
    "word": "Fiscal",
    "meaning_bn": "রাজস্ব সংক্রান্ত / সরকারি আয়-ব্যয় বিষয়ক",
    "pronunciation_bn": "ফিসকাল",
    "definition": "Relating to government revenue, especially taxes and budgetary expenditures.",
    "synonyms": [
      "Monetary",
      "Financial",
      "Budgetary",
      "Economic"
    ],
    "antonyms": [],
    "example": "Sound fiscal governance requires trimming non-essential state subsidies during periods of inflationary pressure.",
    "level": "C1",
    "topic": "Economy & Work",
    "category": "word",
    "part_of_speech": "Adjective",
    "collocations": [
      "fiscal policy",
      "fiscal deficit",
      "fiscal year",
      "fiscal austerity"
    ],
    "warning": "Distinguish from \"physical\". Fiscal specifically relates to state public finance.",
    "ielts_usage": "Frequent in Academic Reading texts on macroeconomics and Writing Task 2 state funding debates."
  },
  {
    "id": "rv_econ_3",
    "word": "Automation",
    "meaning_bn": "স্বয়ংক্রিয়করণ / যন্ত্রের সাহায্যে মানুষের শ্রমের প্রতিস্থাপন",
    "pronunciation_bn": "অটোমেশন",
    "definition": "The use of largely automatic equipment in a system of manufacturing or other administrative processes.",
    "synonyms": [
      "Mechanization",
      "Computerization",
      "Industrial robotics"
    ],
    "antonyms": [
      "Manual labor",
      "Handicraft"
    ],
    "example": "While workplace automation accelerates manufacturing productivity, it presents acute displacement perils for unskilled laborers.",
    "level": "B2",
    "topic": "Economy & Work",
    "category": "word",
    "part_of_speech": "Noun",
    "collocations": [
      "industrial automation",
      "process automation",
      "rise of automation",
      "threat of automation"
    ],
    "warning": "Spell with \"tion\", not \"sion\". Verb is \"automate\".",
    "ielts_usage": "Topical staple in Task 2 essays discussing whether robots will replace human teachers or workers."
  },
  {
    "id": "rv_law_1",
    "word": "Deterrent",
    "meaning_bn": "প্রতিরোধক / অপরাধ বা ভুল কাজ থেকে নিরুৎসাহিত করার উপায় বা শাস্তি",
    "pronunciation_bn": "ডিটারেন্ট",
    "definition": "A thing that discourages, dissuades, or prevents someone from committing an offense or hostile action.",
    "synonyms": [
      "Disincentive",
      "Curtain",
      "Obstacle",
      "Preventative"
    ],
    "antonyms": [
      "Incentive",
      "Encouragement",
      "Stimulus"
    ],
    "example": "Substantial judicial penalties and visible street patrols function as an effective deterrent against petty larceny.",
    "level": "C1",
    "topic": "Crime, Law & Governance",
    "category": "word",
    "part_of_speech": "Noun / Adjective",
    "collocations": [
      "effective deterrent",
      "act as a deterrent",
      "strong deterrent",
      "nuclear deterrent"
    ],
    "warning": "Double \"r\" in spelling: \"deterrent\". Often takes the preposition \"to\": \"a deterrent to crime\".",
    "ielts_usage": "Essential keyword in Writing Task 2 debates on custodial sentencing vs. rehabilitation."
  },
  {
    "id": "rv_law_2",
    "word": "Rehabilitate",
    "meaning_bn": "পুনর্বাসন করা / অপরাধীকে সংশোধনের মাধ্যমে সমাজে স্বাভাবিক জীবনে ফিরিয়ে আনা",
    "pronunciation_bn": "রিহ্যাবিলিটেট",
    "definition": "To restore a convicted individual to purposeful life and positive community integration through therapy and vocational training.",
    "synonyms": [
      "Reform",
      "Reintegrate",
      "Recondition",
      "Restore"
    ],
    "antonyms": [],
    "example": "Progressive penal regimes prioritize vocational training in order to rehabilitate inmates before parole.",
    "level": "C1",
    "topic": "Crime, Law & Governance",
    "category": "word",
    "part_of_speech": "Verb",
    "collocations": [
      "rehabilitate offenders",
      "successfully rehabilitate",
      "rehabilitate prisoners"
    ],
    "warning": "Noun is \"rehabilitation\". Avoid confusing with punitive retaliation.",
    "ielts_usage": "Counter-argument against harsh imprisonment in criminal justice Task 2 questions."
  },
  {
    "id": "rv_law_3",
    "word": "Recidivism",
    "meaning_bn": "পুনরায় অপরাধে জড়িয়ে পড়ার প্রবণতা বা হার",
    "pronunciation_bn": "রিসিডিভিজম",
    "definition": "The tendency of a convicted criminal to reoffend and relapse into criminal behavior after release.",
    "synonyms": [
      "Relapse",
      "Reoffending",
      "Repeat offending"
    ],
    "antonyms": [],
    "example": "Investing in post-release community employment reduces national recidivism rates dramatically.",
    "level": "C2",
    "topic": "Crime, Law & Governance",
    "category": "word",
    "part_of_speech": "Noun",
    "collocations": [
      "rate of recidivism",
      "reduce recidivism",
      "combat recidivism",
      "high recidivism"
    ],
    "warning": "Academic and formal; pronounced /rɪˈsɪd.ɪ.vɪ.zəm/.",
    "ielts_usage": "Instantly identifies the candidate as possessing Band 8.5+ specific domain vocabulary in legal topics."
  },
  {
    "id": "rv_trav_1",
    "word": "Commercialization",
    "meaning_bn": "বাণিজ্যিকীকরণ / কোনো সাংস্কৃতিক বা প্রাকৃতিক বিষয়কে নিছক ব্যবসায়িক পণ্যে রূপান্তর",
    "pronunciation_bn": "কমার্শিয়েলাইজেশন",
    "definition": "The process of managing or exploiting something primarily for financial gain or commercial profit.",
    "synonyms": [
      "Monetization",
      "Merchandising",
      "Commoditization"
    ],
    "antonyms": [],
    "example": "Excessive commercialization of ancient heritage ruins diminishes their solemn archaeological sanctity.",
    "level": "C1",
    "topic": "Travel, Tourism & Globalization",
    "category": "word",
    "part_of_speech": "Noun",
    "collocations": [
      "creeping commercialization",
      "commercialization of culture",
      "rapid commercialization"
    ],
    "warning": "Can be spelled with -s- or -z- in British English (commercialisation / commercialization).",
    "ielts_usage": "Ideal in tourism essays warning about indigenous heritage becoming tourist traps."
  },
  {
    "id": "rv_trav_2",
    "word": "Pristine",
    "meaning_bn": "অনাবিল / আদিম পবিত্রতা অক্ষুণ্ণ / মানুষের ছোঁয়ায় কলুষিত হয়নি এমন",
    "pronunciation_bn": "প্রিস্টিন",
    "definition": "In its original, unspoiled condition; completely clean and immaculate without contamination.",
    "synonyms": [
      "Unspoiled",
      "Immaculate",
      "Untouched",
      "Virgin"
    ],
    "antonyms": [
      "Polluted",
      "Tainted",
      "Degraded",
      "Spoiled"
    ],
    "example": "Eco-tourists must exercise rigorous environmental responsibility to preserve Antarctica’s pristine glaciers.",
    "level": "C1",
    "topic": "Travel, Tourism & Globalization",
    "category": "word",
    "part_of_speech": "Adjective",
    "collocations": [
      "pristine condition",
      "pristine beaches",
      "pristine wilderness",
      "pristine environment"
    ],
    "warning": "Pronounced /ˈprɪs.tiːn/ with emphasis on the second syllable in British English.",
    "ielts_usage": "Superb descriptive adjective for Speaking Part 2 holiday destinations and Reading nature texts."
  },
  {
    "id": "rv_trav_3",
    "word": "Homogenization",
    "meaning_bn": "সমজাতীয়করণ / বৈচিত্র্য হারিয়ে সর্বত্র একই রূপ ধারণ করা",
    "pronunciation_bn": "হোমোজিনাইজেশন",
    "definition": "The process of making things uniform, similar, or identical across diverse regions.",
    "synonyms": [
      "Uniformity",
      "Standardization",
      "Monotony"
    ],
    "antonyms": [
      "Diversification",
      "Heterogeneity"
    ],
    "example": "The unchecked spread of multinational retail chains risks the cultural homogenization of historic European high streets.",
    "level": "C2",
    "topic": "Travel, Tourism & Globalization",
    "category": "word",
    "part_of_speech": "Noun",
    "collocations": [
      "cultural homogenization",
      "global homogenization",
      "resist homogenization"
    ],
    "warning": "British spelling \"homogenisation\" is widely accepted.",
    "ielts_usage": "Sophisticated term for globalization essays when discussing loss of local customs and culinary traditions."
  },
  {
    "id": "rv_media_1",
    "word": "Sensationalism",
    "meaning_bn": "উত্তেজনা ছড়ানো সাংবাদিকতা / খবর বিকৃত করে চমক সৃষ্টি",
    "pronunciation_bn": "সেনসেশনালাইজম",
    "definition": "The presentation of news stories in a way that is intended to provoke public interest or excitement, at the expense of accuracy.",
    "synonyms": [
      "Yellow journalism",
      "Tabloidization",
      "Melodrama"
    ],
    "antonyms": [
      "Objectivity",
      "Sobriety",
      "Factualism"
    ],
    "example": "Media outlets increasingly succumb to click-driven sensationalism rather than delivering measured investigative reportage.",
    "level": "C1",
    "topic": "Media & Culture",
    "category": "word",
    "part_of_speech": "Noun",
    "collocations": [
      "media sensationalism",
      "tabloid sensationalism",
      "accused of sensationalism"
    ],
    "warning": "Sensationalism refers to the style; \"sensational\" can sometimes mean extraordinary/wonderful.",
    "ielts_usage": "Crucial for Speaking Part 3 and Writing Task 2 questions evaluating trust in modern journalism."
  },
  {
    "id": "rv_media_2",
    "word": "Censorship",
    "meaning_bn": "সেন্সরশিপ / তথ্যের ওপর রাষ্ট্রীয় বা প্রাতিষ্ঠানিক নিয়ন্ত্রণ বা নিষেধাজ্ঞা",
    "pronunciation_bn": "সেন্সরশিপ",
    "definition": "The suppression or prohibition of any parts of books, films, news, etc. that are considered obscene, politically unacceptable, or a threat to security.",
    "synonyms": [
      "Suppression",
      "Blacking out",
      "Restriction",
      "Control"
    ],
    "antonyms": [
      "Freedom of speech",
      "Transparency",
      "Unrestricted press"
    ],
    "example": "Democracies must strike a delicate equilibrium between combating disinformation and upholding freedom from draconian censorship.",
    "level": "B2",
    "topic": "Media & Culture",
    "category": "word",
    "part_of_speech": "Noun",
    "collocations": [
      "strict censorship",
      "impose censorship",
      "internet censorship",
      "evade censorship"
    ],
    "warning": "Verb is \"censor\" (not censure, which means severe disapproval or condemnation).",
    "ielts_usage": "Key topic in social freedom essays and debates on state control of the internet."
  },
  {
    "id": "rv_life_1",
    "word": "Procrastinate",
    "meaning_bn": "টানাহ্যাঁচড়া করা / কাজ ফেলে রাখা বা কালক্ষেপণ করা",
    "pronunciation_bn": "প্রোক্রাস্টিনেট",
    "definition": "To delay or postpone action; put off doing something, especially out of habitual carelessness or laziness.",
    "synonyms": [
      "Dilly-dally",
      "Defer",
      "Postpone",
      "Stall"
    ],
    "antonyms": [
      "Expedite",
      "Execute",
      "Accelerate"
    ],
    "example": "Students who perpetually procrastinate over coursework endure acute psychological distress during exam weeks.",
    "level": "B2",
    "topic": "Everyday & Lifestyle",
    "category": "word",
    "part_of_speech": "Verb",
    "collocations": [
      "tendency to procrastinate",
      "stop procrastinating",
      "habitual procrastination"
    ],
    "warning": "Noun is \"procrastination\". Adjective is \"procrastinating\".",
    "ielts_usage": "Very natural for Speaking Part 1 & 2 when discussing study habits, routines, or past regrets."
  },
  {
    "id": "rv_life_2",
    "word": "Fastidious",
    "meaning_bn": "খুঁতখুঁতে / অত্যন্ত পরিপাটি ও খুঁটিনাটি বিষয়ে সতর্ক",
    "pronunciation_bn": "ফাসটিডিয়াস",
    "definition": "Very attentive to and concerned about accuracy and detail; excessively particular about cleanliness or precision.",
    "synonyms": [
      "Meticulous",
      "Punctilious",
      "Scrupulous",
      "Particular"
    ],
    "antonyms": [
      "Careless",
      "Sloppy",
      "Slipshod",
      "Lax"
    ],
    "example": "My grandfather was fastidious regarding his morning routine, never permitting even a creased napkin at breakfast.",
    "level": "C1",
    "topic": "Everyday & Lifestyle",
    "category": "word",
    "part_of_speech": "Adjective",
    "collocations": [
      "fastidious attention to detail",
      "fastidious about cleanliness",
      "fastidious standards"
    ],
    "warning": "Can carry a slightly negative connotation of being hard to please.",
    "ielts_usage": "Brilliant descriptive adjective for Speaking Part 2 describing an admired mentor, chef, or craftsman."
  },
  {
    "id": "rv_life_3",
    "word": "Nourishment",
    "meaning_bn": "পুষ্টি / শারীরিক স্বাস্থ্য ও বৃদ্ধির জন্য প্রয়োজনীয় খাদ্য উপাদান",
    "pronunciation_bn": "নারিশমেন্ট",
    "definition": "Food and other substances necessary for growth, health, and good condition.",
    "synonyms": [
      "Nutriment",
      "Sustenance",
      "Nutrition",
      "Alimentation"
    ],
    "antonyms": [],
    "example": "Wholesome organic produce provides the vital physiological nourishment required for active adolescents.",
    "level": "B2",
    "topic": "Everyday & Lifestyle",
    "category": "word",
    "part_of_speech": "Noun",
    "collocations": [
      "essential nourishment",
      "source of nourishment",
      "bodily nourishment",
      "proper nourishment"
    ],
    "warning": "Verb is \"nourish\", adjective is \"nourishing\".",
    "ielts_usage": "Upgrades conversational discussions of food, diet, and childhood vitality in Speaking Part 1."
  },
  {
    "id": "rp_fill_1",
    "word": "That is a rather intriguing question to consider...",
    "meaning_bn": "এটি সত্যি বেশ চিন্তাভাবনা করার মতো চমৎকার একটি প্রশ্ন...",
    "pronunciation_bn": "That is a rather intriguing question to consider...",
    "definition": "A polished, natural British response used when you need 2-3 seconds to formulate your answer without awkward silence.",
    "synonyms": [],
    "antonyms": [],
    "example": "That is a rather intriguing question to consider, because off the top of my head, public transport has transformed markedly in my city.",
    "level": "B2",
    "topic": "IELTS Speaking",
    "category": "phrase",
    "part_of_speech": "Phrase",
    "collocations": [],
    "warning": "Avoid in writing; exclusively intended for spoken discourse.",
    "ielts_usage": "Speaking: Prevents hesitation pauses (\"um\", \"uh\") and showcases natural conversational poise. | Writing: Avoid in writing; exclusively intended for spoken discourse."
  },
  {
    "id": "rp_fill_2",
    "word": "If I were to look at it from an objective perspective...",
    "meaning_bn": "আমি যদি বিষয়টি সম্পূর্ণ বস্তুনিষ্ঠ দৃষ্টিকোণ থেকে দেখি...",
    "pronunciation_bn": "If I were to look at it from an objective perspective...",
    "definition": "Used to transition from personal emotional gut-reaction into a balanced analytical response.",
    "synonyms": [],
    "antonyms": [],
    "example": "If I were to look at it from an objective perspective, remote employment offers distinct lifestyle flexibility, yet it diminishes social camaraderie.",
    "level": "B2",
    "topic": "Academic English",
    "category": "phrase",
    "part_of_speech": "Phrase",
    "collocations": [],
    "ielts_usage": "Speaking: Signals to the examiner that you are adopting an analytical Band 8+ stance. | Writing: Acceptable in Task 2 body paragraphs: \"From an objective perspective, ...\""
  },
  {
    "id": "rp_fill_3",
    "word": "I can’t say I’ve ever given it an enormous amount of thought, but...",
    "meaning_bn": "আমি কখনোই বিষয়টা নিয়ে গভীরভাবে ভাবিনি, তবে...",
    "pronunciation_bn": "I can’t say I’ve ever given it an enormous amount of thought, but...",
    "definition": "Utterly natural native phrasing for unexpected or rare topics in Speaking Part 1.",
    "synonyms": [],
    "antonyms": [],
    "example": "I can’t say I’ve ever given it an enormous amount of thought, but I suppose mirrors reflect more than just appearance—they alter spatial lighting.",
    "level": "B2",
    "topic": "IELTS Speaking",
    "category": "phrase",
    "part_of_speech": "Phrase",
    "collocations": [],
    "warning": "Strictly forbidden in Academic Writing.",
    "ielts_usage": "Speaking: Demonstrates authentic native British conversational rhythm rather than pre-memorized robotic scripts. | Writing: Strictly forbidden in Academic Writing."
  },
  {
    "id": "rp_op_1",
    "word": "I am firmly inclined to believe that...",
    "meaning_bn": "আমার দৃঢ় বিশ্বাস যে... / আমি বিশ্বাস করতে ঝুঁকে রয়েছি যে...",
    "pronunciation_bn": "I am firmly inclined to believe that...",
    "definition": "A sophisticated substitute for \"I strongly think that\" or \"In my opinion\".",
    "synonyms": [],
    "antonyms": [],
    "example": "I am firmly inclined to believe that early bilingualism endows children with lifelong neurological flexibility.",
    "level": "B2",
    "topic": "Academic English",
    "category": "phrase",
    "part_of_speech": "Phrase",
    "collocations": [],
    "ielts_usage": "Speaking: Adds gravitas and grammatical range (complex sentence structure). | Writing: High-yield phrase for thesis statements in Opinion Essays."
  },
  {
    "id": "rp_op_2",
    "word": "It is widely contended that..., whereas my own conviction is that...",
    "meaning_bn": "অনেকেই দাবি করেন যে..., অথচ আমার নিজস্ব বিশ্বাস হলো...",
    "pronunciation_bn": "It is widely contended that..., whereas my own conviction is that...",
    "definition": "Balances popular consensus with personal thesis, demonstrating high-level cohesive linkage.",
    "synonyms": [],
    "antonyms": [],
    "example": "It is widely contended that university should be tuition-free, whereas my own conviction is that targeted subsidies based on merit are more sustainable.",
    "level": "B2",
    "topic": "Academic English",
    "category": "phrase",
    "part_of_speech": "Phrase",
    "collocations": [],
    "ielts_usage": "Speaking: Shows contrastive fluency in debate questions. | Writing: Gold standard for Discussion + Opinion introduction paragraphs."
  },
  {
    "id": "rp_op_3",
    "word": "To a certain extent, yes, but there is another side to the coin...",
    "meaning_bn": "কিছুটা হলেও সত্য, কিন্তু মুদ্রার অন্য একটি দিকও রয়েছে...",
    "pronunciation_bn": "To a certain extent, yes, but there is another side to the coin...",
    "definition": "Used to show partial agreement before introducing substantial counter-arguments.",
    "synonyms": [],
    "antonyms": [],
    "example": "To a certain extent, yes, automated banking is faster, but there is another side to the coin regarding digital exclusion for senior citizens.",
    "level": "B2",
    "topic": "Academic English",
    "category": "phrase",
    "part_of_speech": "Phrase",
    "collocations": [],
    "ielts_usage": "Speaking: Prevents binary (black-or-white) answers and shows critical thinking. | Writing: Better phrased in writing as: \"While this premise holds some validity, significant counter-considerations exist.\""
  },
  {
    "id": "rp_ex_1",
    "word": "A classic case in point would be...",
    "meaning_bn": "একটি ধ্রুপদী বা যথার্থ উদাহরণ হতে পারে...",
    "pronunciation_bn": "A classic case in point would be...",
    "definition": "An elegant native British alternative to repeatedly saying \"For example\" or \"For instance\".",
    "synonyms": [],
    "antonyms": [],
    "example": "A classic case in point would be London’s Ultra Low Emission Zone, which drastically lowered central nitrogen dioxide levels.",
    "level": "B2",
    "topic": "Academic English",
    "category": "phrase",
    "part_of_speech": "Phrase",
    "collocations": [],
    "ielts_usage": "Speaking: Sounds natural, articulate, and authoritative. | Writing: Standard Band 8+ linking device for supporting paragraphs."
  },
  {
    "id": "rp_ex_2",
    "word": "To illustrate this more vividly...",
    "meaning_bn": "বিষয়টি আরও স্পষ্ট ও সচিত্রভাবে তুলে ধরতে...",
    "pronunciation_bn": "To illustrate this more vividly...",
    "definition": "Used when transitioning into a descriptive narrative or detailed real-world scenario.",
    "synonyms": [],
    "antonyms": [],
    "example": "To illustrate this more vividly, consider a rural student who gains access to global lectures via fiber-optic internet.",
    "level": "B2",
    "topic": "Academic English",
    "category": "phrase",
    "part_of_speech": "Phrase",
    "collocations": [],
    "ielts_usage": "Speaking: Helps sustain natural fluency across extended turns in Part 2 and Part 3. | Writing: Strong transitional phrase for Task 2 body paragraphs."
  },
  {
    "id": "rp_comp_1",
    "word": "Pale in comparison to...",
    "meaning_bn": "তুলনায় ম্লান বা তুচ্ছ হয়ে যাওয়া...",
    "pronunciation_bn": "Pale in comparison to...",
    "definition": "Used to state that one factor is far less important, impressive, or serious than another.",
    "synonyms": [],
    "antonyms": [],
    "example": "The transient economic costs of solar installation pale in comparison to the catastrophic long-term damages of rising sea levels.",
    "level": "B2",
    "topic": "Academic English",
    "category": "phrase",
    "part_of_speech": "Phrase",
    "collocations": [],
    "ielts_usage": "Speaking: Displays idiomatic mastery in complex comparative structures. | Writing: Superb phrase for Task 2 conclusions when weighing competing priorities."
  },
  {
    "id": "rp_comp_2",
    "word": "Strike a delicate balance between...",
    "meaning_bn": "দুই বিপরীত বিষয়ের মধ্যে সূক্ষ্ম ভারসাম্য রক্ষা করা...",
    "pronunciation_bn": "Strike a delicate balance between...",
    "definition": "Expresses the need to satisfy two competing demands simultaneously.",
    "synonyms": [],
    "antonyms": [],
    "example": "Urban municipal planners must strike a delicate balance between preserving green parklands and accommodating housing demands.",
    "level": "B2",
    "topic": "Academic English",
    "category": "phrase",
    "part_of_speech": "Phrase",
    "collocations": [],
    "ielts_usage": "Speaking: Standard high-scoring collocation in academic debates. | Writing: Very popular in conclusion sentences advocating moderate compromise."
  },
  {
    "id": "rp_clar_1",
    "word": "Could you possibly rephrase that question, please?",
    "meaning_bn": "দয়া করে প্রশ্নটি একটু অন্যভাবে বলবেন কি?",
    "pronunciation_bn": "Could you possibly rephrase that question, please?",
    "definition": "Polite, natural British way to request the examiner to rephrase a question without incurring any penalty.",
    "synonyms": [],
    "antonyms": [],
    "example": "I apologize, could you possibly rephrase that question, please? I want to ensure I capture your exact meaning.",
    "level": "B2",
    "topic": "Academic English",
    "category": "phrase",
    "part_of_speech": "Phrase",
    "collocations": [],
    "ielts_usage": "Speaking: Completely acceptable in the IELTS Speaking test; candidates are not penalized for polite requests. | Writing: Spoken only."
  },
  {
    "id": "rp_p2_1",
    "word": "The first instance that springs to mind is...",
    "meaning_bn": "প্রথম যে ঘটনা বা স্মৃতির কথা মনে পড়ছে তা হলো...",
    "pronunciation_bn": "The first instance that springs to mind is...",
    "definition": "Effortless opening for Speaking Part 2 cue cards, establishing immediate momentum.",
    "synonyms": [],
    "antonyms": [],
    "example": "The first instance that springs to mind is a trip I undertook to the Scottish Highlands three summers ago.",
    "level": "B2",
    "topic": "IELTS Speaking",
    "category": "phrase",
    "part_of_speech": "Phrase",
    "collocations": [],
    "ielts_usage": "Speaking: Avoids robotic memorized openings like \"Today I would like to talk about...\" | Writing: Spoken only."
  },
  {
    "id": "rp_p2_2",
    "word": "Looking back on it with hindsight...",
    "meaning_bn": "অতীতের দিকে ফিরে তাকালে বা পরবর্তী অভিজ্ঞতার আলোয় দেখলে...",
    "pronunciation_bn": "Looking back on it with hindsight...",
    "definition": "Introduces mature reflection and evaluation in the final 30 seconds of Speaking Part 2.",
    "synonyms": [],
    "antonyms": [],
    "example": "Looking back on it with hindsight, I realize that what felt like a disastrous mistake at the time was actually an invaluable learning curve.",
    "level": "B2",
    "topic": "IELTS Speaking",
    "category": "phrase",
    "part_of_speech": "Phrase",
    "collocations": [],
    "ielts_usage": "Speaking: Demonstrates deep grammatical control (past perfect and past narrative tenses). | Writing: Can be adapted for reflective Task 2 personal narrative styles if permitted."
  },
  {
    "id": "ri_1",
    "word": "Once in a blue moon",
    "meaning_bn": "কদাচিৎ / অতি বিরল কোনো ঘটনা",
    "pronunciation_bn": "Once in a blue moon",
    "definition": "Very rarely; almost never.",
    "synonyms": [],
    "antonyms": [],
    "example": "Because my sibling lives in Melbourne, we only manage to catch up in person once in a blue moon.",
    "level": "B1",
    "topic": "Everyday & Lifestyle",
    "category": "idiom",
    "part_of_speech": "Idiom",
    "collocations": [],
    "warning": "DO NOT use in Academic Writing Task 1 or Task 2. Write \"seldom\" or \"infrequently\" instead.",
    "ielts_usage": "Speaking: Excellent for Part 1 & 2 to show colloquial fluency."
  },
  {
    "id": "ri_2",
    "word": "Cost an arm and a leg",
    "meaning_bn": "অত্যধিক ব্যয়বহুল / আকাশচুম্বী দাম",
    "pronunciation_bn": "Cost an arm and a leg",
    "definition": "Extremely expensive; exorbitant.",
    "synonyms": [],
    "antonyms": [],
    "example": "Dining out at fine restaurants in central London can cost an arm and a leg, especially for a university student.",
    "level": "B1",
    "topic": "Everyday & Lifestyle",
    "category": "idiom",
    "part_of_speech": "Idiom",
    "collocations": [],
    "warning": "Unacceptable in Writing Task 1 or 2. Use \"prohibitively expensive\" or \"exorbitant\" in academic essays.",
    "ielts_usage": "Speaking: Very natural in informal conversational responses."
  },
  {
    "id": "ri_3",
    "word": "A double-edged sword",
    "meaning_bn": "দুমুখী তলোয়ার / যাতে একই সাথে সুবিধা ও মারাত্মক ক্ষতি উভয়ই রয়েছে",
    "pronunciation_bn": "A double-edged sword",
    "definition": "Something that has both beneficial and harmful consequences.",
    "synonyms": [],
    "antonyms": [],
    "example": "Social media algorithms are a double-edged sword: they democratize information access but amplify echo chambers.",
    "level": "B2",
    "topic": "Everyday & Lifestyle",
    "category": "idiom",
    "part_of_speech": "Idiom",
    "collocations": [],
    "warning": "Widely used, but ensure you explain both edges of the sword immediately afterward.",
    "ielts_usage": "Speaking: Outstanding for Part 3 abstract discussions."
  },
  {
    "id": "ri_4",
    "word": "At the eleventh hour",
    "meaning_bn": "একেবারে শেষ মুহূর্তে / একদম শেষ সীমানায় পৌঁছে",
    "pronunciation_bn": "At the eleventh hour",
    "definition": "At the last possible moment before a deadline or catastrophe.",
    "synonyms": [],
    "antonyms": [],
    "example": "The conference delegates finalized the climate communique at the eleventh hour after marathon night sessions.",
    "level": "B2",
    "topic": "Everyday & Lifestyle",
    "category": "idiom",
    "part_of_speech": "Idiom",
    "collocations": [],
    "warning": "Avoid in Academic Task 1 reports; in Task 2 write \"at the precipice of deadline\" or \"at the final moment\".",
    "ielts_usage": "Speaking: Vivid narrative idiom for storytelling."
  },
  {
    "id": "ri_5",
    "word": "Burn the midnight oil",
    "meaning_bn": "রাত জেগে কঠোর পড়াশোনা বা কাজ করা",
    "pronunciation_bn": "Burn the midnight oil",
    "definition": "To study or work until very late at night.",
    "synonyms": [],
    "antonyms": [],
    "example": "During my final undergraduate semester, I routinely had to burn the midnight oil in the university library.",
    "level": "B1",
    "topic": "Everyday & Lifestyle",
    "category": "idiom",
    "part_of_speech": "Idiom",
    "collocations": [],
    "warning": "Too conversational for Academic Task 2 body paragraphs. Use \"engage in rigorous nocturnal study\".",
    "ielts_usage": "Speaking: High-scoring idiom for Part 1 education questions."
  },
  {
    "id": "ri_6",
    "word": "Pave the way for",
    "meaning_bn": "পথ সুগম করা / নতুন অগ্রগতির ভিত্তি স্থাপন করা",
    "pronunciation_bn": "Pave the way for",
    "definition": "To create conditions that allow something else to happen or exist more easily.",
    "synonyms": [],
    "antonyms": [],
    "example": "Groundbreaking investments in solar photovoltaic technology have paved the way for decentralized rural electrification.",
    "level": "C1",
    "topic": "Everyday & Lifestyle",
    "category": "idiom",
    "part_of_speech": "Idiom",
    "collocations": [],
    "warning": "This idiom is fully acceptable in Academic Writing Task 2 essays!",
    "ielts_usage": "Speaking: Perfect for both Speaking and Writing."
  },
  {
    "id": "ri_7",
    "word": "Tip of the iceberg",
    "meaning_bn": "হিমশৈলের চূড়ামাত্র / কোনো বিশাল সমস্যার ক্ষুদ্রতম দৃশ্যমান অংশ",
    "pronunciation_bn": "Tip of the iceberg",
    "definition": "A small, visible part of a problem that is much larger and hidden beneath the surface.",
    "synonyms": [],
    "antonyms": [],
    "example": "The reported cases of digital fraud represent merely the tip of the iceberg, as many victims feel too ashamed to report losses.",
    "level": "B2",
    "topic": "Everyday & Lifestyle",
    "category": "idiom",
    "part_of_speech": "Idiom",
    "collocations": [],
    "warning": "Acceptable in Task 2 if followed by concrete statistics or analysis.",
    "ielts_usage": "Speaking: Very impactful in analytical answers."
  },
  {
    "id": "ri_8",
    "word": "Play devil’s advocate",
    "meaning_bn": "বিপরীত যুক্তি দাঁড় করানো / আলোচনার গভীরতা যাচাই করতে ভিন্ন মত গ্রহণ করা",
    "pronunciation_bn": "Play devil’s advocate",
    "definition": "To argue against an idea or proposition, not because you disagree with it, but to provoke debate or test its validity.",
    "synonyms": [],
    "antonyms": [],
    "example": "Just to play devil’s advocate for a moment, could high tuition fees actually encourage students to value their courses more seriously?",
    "level": "C1",
    "topic": "Everyday & Lifestyle",
    "category": "idiom",
    "part_of_speech": "Idiom",
    "collocations": [],
    "warning": "Rarely used in Task 2; strictly for dialogue and discussion.",
    "ielts_usage": "Speaking: Demonstrates exceptional conversational nuance and debate mastery."
  },
  {
    "id": "add_p_55",
    "word": "In stark contrast to",
    "meaning_bn": "তীব্র বৈপরীত্যে / সম্পূর্ণ বিপরীতে",
    "definition": "Used to introduce an extreme difference or comparison between two things or scenarios.",
    "synonyms": [
      "Unlike",
      "Conversely",
      "On the contrary",
      "In sharp comparison to"
    ],
    "antonyms": [
      "Similarly",
      "Likewise",
      "In parallel with"
    ],
    "example": "In stark contrast to private vehicles, mass electric transit minimizes per-capita emissions dramatically.",
    "level": "C1",
    "topic": "Academic English",
    "category": "phrase",
    "part_of_speech": "Prepositional phrase",
    "collocations": [
      "stand in stark contrast to",
      "in stark contrast to previous trends"
    ],
    "ielts_usage": "High-scoring comparative device for Academic Writing Task 1 and Task 2.",
    "warning": "Ensure both contrasted subjects are grammatically parallel.",
    "pronunciation_bn": "In stark contrast to"
  },
  {
    "id": "add_p_56",
    "word": "Play a pivotal role in",
    "meaning_bn": "অত্যন্ত গুরুত্বপূর্ণ বা কেন্দ্রীয় ভূমিকা পালন করা",
    "definition": "To have a central, decisive, and crucial effect on the success or development of something.",
    "synonyms": [
      "Be of paramount importance to",
      "Act as a cornerstone for",
      "Exercise significant influence on"
    ],
    "antonyms": [
      "Play a negligible role in",
      "Be inconsequential to"
    ],
    "example": "Nutritional education plays a pivotal role in curbing adolescent metabolic disorders.",
    "level": "B2",
    "topic": "Education",
    "category": "phrase",
    "part_of_speech": "Verbal phrase",
    "collocations": [
      "play a pivotal role in society",
      "play a pivotal role in development"
    ],
    "ielts_usage": "Standard Band 8+ academic collocation for Task 2 body paragraphs.",
    "warning": "Don't overuse; vary with 'serves as a primary catalyst for'.",
    "pronunciation_bn": "Play a pivotal role in"
  },
  {
    "id": "add_p_57",
    "word": "Give rise to",
    "meaning_bn": "সৃষ্টি করা / জন্ম দেওয়া / কোনো পরিস্থিতির উদ্ভব ঘটানো",
    "definition": "To cause something, especially a problem, trend, or development, to happen or exist.",
    "synonyms": [
      "Precipitate",
      "Trigger",
      "Generate",
      "Engender",
      "Bring about"
    ],
    "antonyms": [
      "Prevent",
      "Suppress",
      "Halt"
    ],
    "example": "Unregulated urban sprawl gives rise to acute traffic congestion and air pollution.",
    "level": "B2",
    "topic": "Cities & Nature",
    "category": "phrase",
    "part_of_speech": "Verbal phrase",
    "collocations": [
      "give rise to concerns",
      "give rise to complications",
      "give rise to speculation"
    ],
    "ielts_usage": "Excellent cause-and-effect transitional phrase for Task 2.",
    "warning": "Always followed by a noun phrase, not a full clause.",
    "pronunciation_bn": "Give rise to"
  },
  {
    "id": "add_p_58",
    "word": "Bear the brunt of",
    "meaning_bn": "সবচেয়ে বড় আঘাত বা ধাক্কা সামলানো",
    "definition": "To receive or suffer the worst part of an attack, difficulty, financial crisis, or misfortune.",
    "synonyms": [
      "Suffer the worst consequences of",
      "Endure the primary impact of"
    ],
    "antonyms": [
      "Escape unscathed",
      "Be shielded from"
    ],
    "example": "Impoverished coastal agrarian communities bear the brunt of sea-level rise and saltwater intrusion.",
    "level": "C1",
    "topic": "Environment & Climate",
    "category": "phrase",
    "part_of_speech": "Idiomatic phrase",
    "collocations": [
      "bear the brunt of the crisis",
      "bear the brunt of climate change"
    ],
    "ielts_usage": "Powerful phrase for highlighting vulnerable demographics in Task 2 essays.",
    "warning": "Formal enough for Writing Task 2 when analyzing socioeconomic effects.",
    "pronunciation_bn": "Bear the brunt of"
  },
  {
    "id": "add_p_59",
    "word": "Take into consideration",
    "meaning_bn": "বিবেচনায় নেওয়া / আমলে নেওয়া",
    "definition": "To keep something in mind or make allowances for something while making an evaluation or decision.",
    "synonyms": [
      "Account for",
      "Factor in",
      "Take into account",
      "Weigh up"
    ],
    "antonyms": [
      "Disregard",
      "Overlook",
      "Neglect"
    ],
    "example": "Municipal urban planners must take into consideration the needs of disabled commuters.",
    "level": "B1",
    "topic": "Everyday & Lifestyle",
    "category": "phrase",
    "part_of_speech": "Verbal phrase",
    "collocations": [
      "take all factors into consideration",
      "take into careful consideration"
    ],
    "ielts_usage": "Very natural in Speaking Part 3 and Writing conclusions.",
    "warning": "Can also be phrased as 'take into account'.",
    "pronunciation_bn": "Take into consideration"
  },
  {
    "id": "add_p_60",
    "word": "In the foreseeable future",
    "meaning_bn": "অদূর ভবিষ্যতে / যতদিন পর্যন্ত আন্দাজ করা যায়",
    "definition": "Near enough in time to be predicted, expected, or anticipated based on current circumstances.",
    "synonyms": [
      "In the near term",
      "In the impending future",
      "In the coming decades"
    ],
    "antonyms": [
      "In the remote future",
      "In the distant epoch"
    ],
    "example": "Fossil fuels are unlikely to be phased out entirely in the foreseeable future.",
    "level": "B2",
    "topic": "Technology & AI",
    "category": "phrase",
    "part_of_speech": "Adverbial phrase",
    "collocations": [
      "unlikely in the foreseeable future",
      "remain dominant for the foreseeable future"
    ],
    "ielts_usage": "Used when making qualified predictions in Task 2 essays.",
    "warning": "Avoid overconfidence; use qualifiers like 'unlikely' or 'probable'.",
    "pronunciation_bn": "In the foreseeable future"
  },
  {
    "id": "add_p_61",
    "word": "Exert a profound influence on",
    "meaning_bn": "গভীর প্রভাব বিস্তার করা",
    "definition": "To have a deep, lasting, and far-reaching effect on someone or something.",
    "synonyms": [
      "Impact significantly",
      "Shape decisively",
      "Transform radically"
    ],
    "antonyms": [
      "Have negligible impact on",
      "Leave untouched"
    ],
    "example": "Early childhood parental interaction exerts a profound influence on emotional resilience.",
    "level": "C1",
    "topic": "Society & Relationships",
    "category": "phrase",
    "part_of_speech": "Verbal phrase",
    "collocations": [
      "exert a profound influence on youth",
      "exert an indelible influence on policy"
    ],
    "ielts_usage": "High-scoring lexical resource collocation for Task 2 introductions and body paragraphs.",
    "warning": "Followed by the preposition 'on'.",
    "pronunciation_bn": "Exert a profound influence on"
  },
  {
    "id": "add_p_62",
    "word": "From another vantage point",
    "meaning_bn": "ভিন্ন একটি দৃষ্টিকোণ থেকে",
    "definition": "From a different perspective, angle of view, or analytical stance.",
    "synonyms": [
      "From an alternative viewpoint",
      "Conversely",
      "From another angle"
    ],
    "antonyms": [
      "From the same perspective",
      "Similarly"
    ],
    "example": "From another vantage point, higher tuition fees may prompt universities to offer superior facilities.",
    "level": "C1",
    "topic": "Academic English",
    "category": "phrase",
    "part_of_speech": "Prepositional phrase",
    "collocations": [
      "view from another vantage point",
      "evaluated from another vantage point"
    ],
    "ielts_usage": "Sophisticated transition to introduce opposing views in Discussion essays.",
    "warning": "Exclusively used in formal analytical writing and Speaking Part 3.",
    "pronunciation_bn": "From another vantage point"
  },
  {
    "id": "add_p_63",
    "word": "Strike a delicate balance between",
    "meaning_bn": "দুই বিপরীত চাহিদার মধ্যে সূক্ষ্ম ভারসাম্য রক্ষা করা",
    "definition": "To achieve a state in which two contrasting elements or requirements are satisfied equitably.",
    "synonyms": [
      "Reconcile competing demands",
      "Maintain equilibrium between",
      "Harmonize"
    ],
    "antonyms": [
      "Favor one at the expense of another",
      "Create disproportion"
    ],
    "example": "Governments must strike a delicate balance between industrial economic output and nature conservation.",
    "level": "C1",
    "topic": "Government & Law",
    "category": "phrase",
    "part_of_speech": "Verbal phrase",
    "collocations": [
      "strike a delicate balance between growth and ecology",
      "strike a delicate balance between liberty and security"
    ],
    "ielts_usage": "The ultimate Band 8.5+ phrase for conclusion recommendations in Task 2 essays.",
    "warning": "Requires 'between X and Y'.",
    "pronunciation_bn": "Strike a delicate balance between"
  },
  {
    "id": "add_i_64",
    "word": "See eye to eye with",
    "meaning_bn": "সম্পূর্ণ একমত হওয়া / সমমনোভাবাপন্ন হওয়া",
    "definition": "To agree fully with someone on a topic, philosophy, or course of action.",
    "synonyms": [
      "Concur with",
      "Share the same view as",
      "Be in total accord with"
    ],
    "antonyms": [
      "Disagree with",
      "Be at loggerheads with"
    ],
    "example": "My parents and I do not always see eye to eye regarding modern career paths, but we respect each other's opinions.",
    "level": "B1",
    "topic": "Society & Relationships",
    "category": "idiom",
    "part_of_speech": "Idiom",
    "collocations": [
      "rarely see eye to eye",
      "see eye to eye on key matters"
    ],
    "ielts_usage": "Speaking Part 1 and Part 2 family or friend questions.",
    "warning": "⚠️ Too informal for Academic Writing Task 2. Write 'concur with' or 'share a common consensus' instead.",
    "pronunciation_bn": "See eye to eye with"
  },
  {
    "id": "add_i_65",
    "word": "Bite off more than one can chew",
    "meaning_bn": "সাধ্যের অতিরিক্ত কাজ হাতে নেওয়া",
    "definition": "To take on a commitment, task, or responsibility that is too large or demanding to manage.",
    "synonyms": [
      "Overcommit",
      "Overextend oneself"
    ],
    "antonyms": [
      "Act with prudent restraint",
      "Pace oneself"
    ],
    "example": "When I registered for four advanced university modules simultaneously, I quickly realized I had bitten off more than I could chew.",
    "level": "B2",
    "topic": "Education",
    "category": "idiom",
    "part_of_speech": "Idiom",
    "collocations": [
      "bite off more than you can chew with work"
    ],
    "ielts_usage": "Speaking Part 2 storytelling cue card about a difficult challenge or mistake.",
    "warning": "⚠️ Strictly for spoken narrative. In writing, use 'overcommit oneself' or 'undertake an unsustainable workload'.",
    "pronunciation_bn": "Bite off more than one can chew"
  },
  {
    "id": "add_i_66",
    "word": "A drop in the ocean",
    "meaning_bn": "সমুদ্রে এক ফোঁটা জলের মতো / অতিক্ষুদ্র বা অপ্রতুল পরিমাণ",
    "definition": "A tiny amount that has little or no meaningful effect on a large problem or total demand.",
    "synonyms": [
      "A mere drop in the bucket",
      "Insignificant contribution",
      "Negligible fraction"
    ],
    "antonyms": [
      "A substantial share",
      "A monumental contribution"
    ],
    "example": "Voluntary domestic recycling is admirable, but it is merely a drop in the ocean compared to heavy industrial waste.",
    "level": "B2",
    "topic": "Environment & Climate",
    "category": "idiom",
    "part_of_speech": "Idiom",
    "collocations": [
      "merely a drop in the ocean",
      "represent a drop in the ocean"
    ],
    "ielts_usage": "Speaking Part 3 environmental debate and comparative arguments.",
    "warning": "⚠️ Acceptable in Speaking. In Academic Writing, prefer 'represents a negligible fraction of the aggregate total'.",
    "pronunciation_bn": "A drop in the ocean"
  },
  {
    "id": "add_i_67",
    "word": "Think outside the box",
    "meaning_bn": "গতানুগতিক ধারার বাইরে অভিনব বা সৃজনশীল উপায়ে ভাবা",
    "definition": "To think imaginatively using innovative, unorthodox, and creative approaches.",
    "synonyms": [
      "Think innovatively",
      "Adopt unconventional approaches",
      "Devise pioneering solutions"
    ],
    "antonyms": [
      "Conform to conventional orthodoxy",
      "Follow dogmatic thinking"
    ],
    "example": "Modern educational curricula must inspire students to think outside the box rather than passively memorize formulas.",
    "level": "B1",
    "topic": "Education",
    "category": "idiom",
    "part_of_speech": "Idiom",
    "collocations": [
      "encourage employees to think outside the box"
    ],
    "ielts_usage": "Speaking Part 1 & 3 education, workplace, and technology questions.",
    "warning": "⚠️ Cliché in academic writing. Use 'foster innovative problem-solving' or 'encourage creative ideation'.",
    "pronunciation_bn": "Think outside the box"
  }
];

function buildCompleteVocabularyData(): VocabularyEntry[] {
  const seenWords = new Set(CORE_VOCABULARY_ENTRIES.map((e) => e.word.toLowerCase()));
  const mapped: VocabularyEntry[] = [...CORE_VOCABULARY_ENTRIES];
  for (const m of MASTER_1000_VOCAB_DATABASE) {
    if (!seenWords.has(m.item.toLowerCase())) {
      seenWords.add(m.item.toLowerCase());
      mapped.push({
        id: m.id,
        word: m.item,
        meaning_bn: m.banglaMeaning,
        pronunciation_bn: m.banglaPronunciation || m.item,
        definition: m.definition || '',
        synonyms: m.synonyms || [],
        antonyms: m.antonyms || [],
        example: m.exampleSentence,
        level: (m.cefr || 'B2') as VocabularyEntry['level'],
        topic: m.topic,
        category: m.category,
        ...(m.partOfSpeech ? { part_of_speech: m.partOfSpeech } : {}),
        ...(m.collocations ? { collocations: m.collocations } : {}),
        ...(m.commonMistakes ? { warning: m.commonMistakes } : {}),
        ...(m.ieltsUsage ? { ielts_usage: m.ieltsUsage } : {})
      });
    }
  }
  return mapped;
}

export const VOCABULARY_DATA: VocabularyEntry[] = buildCompleteVocabularyData();

export const VOCABULARY_DATA_AS_CARDS: VocabCard[] = VOCABULARY_DATA.map((entry) => ({
  id: entry.id,
  topic: entry.topic,
  category: entry.category,
  item: entry.word,
  banglaMeaning: entry.meaning_bn,
  banglaPronunciation: entry.pronunciation_bn,
  definition: entry.definition,
  synonyms: entry.synonyms,
  antonyms: entry.antonyms,
  exampleSentence: entry.example,
  cefr: entry.level,
  partOfSpeech: entry.part_of_speech,
  collocations: entry.collocations,
  commonMistakes: entry.warning,
  ieltsUsage: entry.ielts_usage,
  mastered: false
}));

import { BAND_7_9_PHRASES_AND_IDIOMS, BAND_7_9_AS_CARDS } from './band7to9PhrasesAndIdioms';
export { BAND_7_9_PHRASES_AND_IDIOMS, BAND_7_9_AS_CARDS };

/**
 * Complete Master Database including all 200 IELTS Band 7-9 Phrases & Idioms
 */
export const COMPLETE_VOCABULARY_DATA: VocabularyEntry[] = [
  ...VOCABULARY_DATA,
  ...BAND_7_9_PHRASES_AND_IDIOMS
];

export const COMPLETE_VOCABULARY_AS_CARDS: VocabCard[] = [
  ...VOCABULARY_DATA_AS_CARDS,
  ...BAND_7_9_AS_CARDS
];

/**
 * Filter helpers for efficient lookups across the database
 */
export function getVocabularyByTopic(topic: string): VocabularyEntry[] {
  if (!topic || topic === 'All') return COMPLETE_VOCABULARY_DATA;
  const t = topic.toLowerCase();
  return COMPLETE_VOCABULARY_DATA.filter(
    (item) => item.topic.toLowerCase().includes(t) || t.includes(item.topic.toLowerCase())
  );
}

export function getVocabularyByCategory(category: 'word' | 'phrase' | 'idiom'): VocabularyEntry[] {
  return COMPLETE_VOCABULARY_DATA.filter((item) => item.category === category);
}

export function getVocabularyByLevel(level: 'A2' | 'B1' | 'B2' | 'C1' | 'C2'): VocabularyEntry[] {
  return COMPLETE_VOCABULARY_DATA.filter((item) => item.level === level);
}

export function searchVocabulary(query: string): VocabularyEntry[] {
  if (!query.trim()) return COMPLETE_VOCABULARY_DATA;
  const q = query.trim().toLowerCase();
  return COMPLETE_VOCABULARY_DATA.filter(
    (item) =>
      item.word.toLowerCase().includes(q) ||
      item.meaning_bn.toLowerCase().includes(q) ||
      item.definition.toLowerCase().includes(q) ||
      (item.synonyms && item.synonyms.some((s) => s.toLowerCase().includes(q)))
  );
}
