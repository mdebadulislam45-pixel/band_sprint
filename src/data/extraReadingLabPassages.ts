import type { CefrTerm } from '../types';

export type ExtraReadingParagraphLetter = 'A' | 'B' | 'C' | 'D';

export interface ExtraReadingLabQuestion {
  num: 1 | 2 | 3 | 4;
  type: 'tfng' | 'matching';
  statement: string;
  correctAnswer: string;
  evidencePara: ExtraReadingParagraphLetter;
  trapTitle: string;
  explanationEn: string;
  explanationBn: string;
}

export interface ExtraReadingLabPassage {
  id: string;
  badge: string;
  title: string;
  topic: string;
  subtitle: string;
  paragraphs: Record<ExtraReadingParagraphLetter, string>;
  cefrTerms: Record<string, CefrTerm>;
  questions: [
    ExtraReadingLabQuestion,
    ExtraReadingLabQuestion,
    ExtraReadingLabQuestion,
    ExtraReadingLabQuestion
  ];
}

export const EXTRA_READING_LAB_PASSAGES: ExtraReadingLabPassage[] = [
  {
    id: 'passage_hydrothermal_vents',
    badge: 'BANDSPRINT PASSAGE 7 · MARINE BIOLOGY & ASTROBIOLOGY',
    title: 'Life Without Sunlight: Deep-Sea Hydrothermal Vents',
    topic: 'Chemosynthesis & Extremophile Ecosystems',
    subtitle: 'How pitch-black abyssal chimneys overturned textbook assumptions about the prerequisites for complex life.',
    paragraphs: {
      A: 'For nearly two centuries, biological orthodoxy held that every complex food web on Earth ultimately depended on solar radiation captured through photosynthesis. That foundational assumption collapsed in 1977 when the deep-sea submersible Alvin descended 2,500 metres along the Galápagos Rift. Instead of a barren, freezing desert, oceanographers discovered towering mineral chimneys—"black smokers"—belching superheated fluids exceeding 350 degrees Celsius, surrounded by thriving colonies of two-metre-long giant tube worms, blind shrimp, and translucent crabs.',
      B: 'At the base of this sunless oasis sits chemosynthesis rather than photosynthesis. Specialized extremophile bacteria oxidize hydrogen sulphide and methane emerging from Earth’s tectonic fissures to manufacture organic sugars from dissolved carbon dioxide. Remarkably, adult giant tube worms possess neither a mouth nor a digestive tract; instead, their crimson plumes absorb toxic sulphide ions and channel them directly to billions of symbiotic bacteria housed inside a specialized internal organ called the trophosome.',
      C: 'Beyond transforming marine ecology, hydrothermal vent ecosystems have reshaped theories concerning the origin of life itself. Geochemists note that alkaline vents—cooler cousins of volcanic black smokers—naturally generate microscopic iron-sulphur pores traversed by steep natural proton gradients. These mineral chambers mirror the exact electrochemical energy engines found inside every living cell today, suggesting primitive metabolism could have ignited in sheltered seafloor crevices long before early organisms evolved tolerance to harsh ultraviolet sunlight.',
      D: 'Today, these fragile abyssal oases face an unprecedented industrial threat from deep-sea polymetallic sulphide mining. Commercial consortia argue that harvesting cobalt, copper, and rare-earth nodules from inactive vent fields is essential to accelerate the global renewable-energy transition. Marine conservationists counter that sediment plumes stirred by robotic seabed harvesters could smother slow-growing benthic organisms hundreds of kilometres away, prompting growing calls for an international moratorium until ecological baselines are thoroughly mapped.'
    },
    cefrTerms: {
      orthodoxy: {
        word: 'Orthodoxy',
        level: 'C2',
        phonetic: '/ˈɔː.θə.dɒk.si/',
        banglaMeaning: 'প্রচলিত ও সর্বজনস্বীকৃত তাত্ত্বিক মতবাদ',
        definition: 'Authorized or generally accepted scientific, academic, or cultural theory or doctrine.',
        collocations: ['biological orthodoxy', 'challenge prevailing orthodoxy', 'scientific orthodoxy'],
        sample: 'The discovery of chemosynthetic ecosystems overturned decades of biological orthodoxy.'
      },
      chemosynthesis: {
        word: 'Chemosynthesis',
        level: 'C2',
        phonetic: '/ˌkiː.məʊˈsɪn.θə.sɪs/',
        banglaMeaning: 'সূর্যালোক ছাড়াই রাসায়নিক শক্তির মাধ্যমে খাদ্য উৎপাদন প্রক্রিয়া',
        definition: 'The synthesis of organic compounds by bacteria using energy derived from reactions involving inorganic chemicals, without sunlight.',
        collocations: ['bacterial chemosynthesis', 'chemosynthetic food web', 'deep-sea chemosynthesis'],
        sample: 'In the abyssal zone, chemosynthesis replaces photosynthesis as the primary engine of biomass.'
      },
      symbiotic: {
        word: 'Symbiotic',
        level: 'C1',
        phonetic: '/ˌsɪm.baɪˈɒt.ɪk/',
        banglaMeaning: 'পারস্পরিক উপকারী সহাবস্থানমূলক (মিথোজীবী)',
        definition: 'Involving close, mutually beneficial interaction between two different biological organisms.',
        collocations: ['symbiotic bacteria', 'symbiotic partnership', 'mutually symbiotic relationship'],
        sample: 'Giant tube worms survive through a tight symbiotic partnership with sulphide-oxidizing microbes.'
      },
      moratorium: {
        word: 'Moratorium',
        level: 'C2',
        phonetic: '/ˌmɒr.əˈtɔː.ri.əm/',
        banglaMeaning: 'কোনো কার্যক্রমের ওপর অস্থায়ী আনুষ্ঠানিক স্থগিতাদেশ',
        definition: 'A temporary formal prohibition or suspension of an activity pending further evaluation.',
        collocations: ['international moratorium', 'impose a moratorium', 'call for a moratorium'],
        sample: 'Marine scientists urged regulators to enact a decade-long moratorium on abyssal seabed mining.'
      }
    },
    questions: [
      {
        num: 1,
        type: 'tfng',
        statement: 'Adult giant tube worms hunt microscopic shrimp using a specialized mouth and stomach.',
        correctAnswer: 'FALSE',
        evidencePara: 'B',
        trapTitle: 'TFNG Contradiction: Anatomical Negation',
        explanationEn: 'Paragraph B explicitly states that adult giant tube worms possess "neither a mouth nor a digestive tract", relying instead on internal symbiotic bacteria.',
        explanationBn: '[B] অনুচ্ছেদে স্পষ্টভাবে বলা হয়েছে যে প্রাপ্তবয়স্ক জায়ান্ট টিউব ওয়ার্মের কোনো মুখ বা পরিপাকতন্ত্র নেই; তারা অভ্যন্তরীণ মিথোজীবী ব্যাকটেরিয়ার ওপর নির্ভর করে।'
      },
      {
        num: 2,
        type: 'tfng',
        statement: 'Alkaline hydrothermal vents emit water that is significantly hotter than volcanic black smokers.',
        correctAnswer: 'FALSE',
        evidencePara: 'C',
        trapTitle: 'TFNG Comparative Reversal: Cooler vs Hotter',
        explanationEn: 'Paragraph C describes alkaline vents as "cooler cousins of volcanic black smokers", directly contradicting the claim that they are hotter.',
        explanationBn: '[C] অনুচ্ছেদে অ্যালকালাইন ভেন্টকে ব্ল্যাক স্মোকারের তুলনায় "শীতলতর" (cooler cousins) বলা হয়েছে, তাই বেশি উত্তপ্ত হওয়ার দাবিটি ভুল (FALSE)।'
      },
      {
        num: 3,
        type: 'tfng',
        statement: 'The submersible Alvin was funded jointly by European and Japanese maritime agencies.',
        correctAnswer: 'NOT GIVEN',
        evidencePara: 'A',
        trapTitle: 'TFNG Trap: Unmentioned Funding Source',
        explanationEn: 'Paragraph A mentions the 1977 descent of the submersible Alvin along the Galápagos Rift, but gives no information about who funded its construction or expedition.',
        explanationBn: '[A] অনুচ্ছেদে ১৯৭৭ সালে অ্যালভিন সাবমার্সিবলের অভিযানের কথা থাকলেও এর অর্থায়ন কোন সংস্থা করেছিল তা কোথাও উল্লেখ নেই।'
      },
      {
        num: 4,
        type: 'matching',
        statement: 'Which paragraph outlines the competing economic and ecological arguments surrounding seabed mineral extraction?',
        correctAnswer: 'D',
        evidencePara: 'D',
        trapTitle: 'Paragraph Matching: Policy & Industrial Debate',
        explanationEn: 'Paragraph D contrasts commercial consortia arguing for battery-transition metals against marine conservationists warning of sediment plumes and calling for a moratorium.',
        explanationBn: '[D] অনুচ্ছেদে সমুদ্রতল থেকে খনিজ উত্তোলনের পক্ষে অর্থনৈতিক যুক্তি এবং পরিবেশবাদীদের পাল্টা সতর্কবার্তা ও স্থগিতাদেশের দাবি তুলে ধরা হয়েছে।'
      }
    ]
  },
  {
    id: 'passage_concert_hall_acoustics',
    badge: 'BANDSPRINT PASSAGE 8 · ARCHITECTURE & ACOUSTIC PHYSICS',
    title: 'Sculpting Silence and Resonance: The Science of Concert Halls',
    topic: 'Architectural Acoustics & Reverberation Engineering',
    subtitle: 'Why nineteenth-century rectangular "shoebox" halls still rival computer-modelled modern auditoriums.',
    paragraphs: {
      A: 'Long before digital ray-tracing software existed, nineteenth-century European architects constructed symphony halls—most notably Vienna’s Musikverein and Amsterdam’s Concertgebouw—whose acoustic warmth remains the global benchmark. Both auditoriums share a narrow, high-ceilinged rectangular geometry affectionately nicknamed the "shoebox". Because the parallel side walls sit relatively close together, sound waves bounce laterally toward listeners’ ears milliseconds after the direct orchestral note arrives, creating an enveloping sensation of spaciousness.',
      B: 'During the mid-twentieth century, civic authorities eager to maximize ticket revenue commissioned vast fan-shaped auditoriums seating over 3,000 patrons. Acousticians soon discovered a painful physical trade-off: as side walls splayed outward, early lateral reflections vanished, leaving musicians unable to hear fellow sections clearly on stage and making orchestral climaxes sound oddly thin and distant. Even meticulous ceiling panels could rarely compensate for missing side-wall reflections.',
      C: 'Modern acoustic design underwent a breakthrough in 1963 with Hans Scharoun’s Berlin Philharmonie, which introduced the "vineyard" layout. By placing the orchestra near the centre and surrounding it with terraced, asymmetrically angled seating blocks, the vertical risers between audience tiers act as miniature reflecting walls. This ingenious compromise achieves intimate sightlines for large audiences while restoring the crisp lateral reflections prized in classic shoebox halls.',
      D: 'Today’s acoustic engineers rarely rely on a single static geometry. Contemporary flagship halls integrate motorized overhead canopies, retractable velvet banners, and variable-volume reverberation chambers hidden behind perforated timber walls. Within minutes, technicians can tune reverberation decay from a crisp 1.2 seconds ideal for spoken lectures or chamber jazz to a lush 2.1 seconds tailored for late-Romantic symphonies—proving that acoustic mastery blends timeless spatial physics with adaptive precision.'
    },
    cefrTerms: {
      enveloping: {
        word: 'Enveloping',
        level: 'C1',
        phonetic: '/ɪnˈvel.ə.pɪŋ/',
        banglaMeaning: 'চারপাশ থেকে ঘিরে ধরে এমন (নিমগ্ন অভিজ্ঞতা)',
        definition: 'Completely surrounding or immersing the listener or observer in sound, warmth, or atmosphere.',
        collocations: ['enveloping acoustics', 'enveloping sensation of spaciousness', 'enveloping warmth'],
        sample: 'Early lateral reflections give classical auditoriums their enveloping acoustic signature.'
      },
      splayed: {
        word: 'Splayed',
        level: 'C2',
        phonetic: '/spleɪd/',
        banglaMeaning: 'বাইরের দিকে ছড়িয়ে বা প্রশস্ত হয়ে যাওয়া',
        definition: 'Spread apart or angled outward from a narrow origin toward a wider opening.',
        collocations: ['splayed side walls', 'outwardly splayed geometry', 'splayed auditorium'],
        sample: 'When auditorium walls are splayed too widely, early side reflections fail to reach central seats.'
      },
      reverberation: {
        word: 'Reverberation',
        level: 'C1',
        phonetic: '/rɪˌvɜː.bərˈeɪ.ʃən/',
        banglaMeaning: 'শব্দের প্রতিধ্বনি ও রেশ স্থায়িত্বকাল',
        definition: 'The persistence of sound in an enclosed space after the original sound source has stopped.',
        collocations: ['reverberation decay', 'reverberation chamber', 'optimal reverberation time'],
        sample: 'Spoken lectures demand short reverberation times so every consonant remains crisp.'
      },
      perforated: {
        word: 'Perforated',
        level: 'C1',
        phonetic: '/ˈpɜː.fə.reɪ.tɪd/',
        banglaMeaning: 'সূক্ষ্ম ছিদ্রযুক্ত',
        definition: 'Pierced with a pattern of small holes, often to control airflow or acoustic absorption.',
        collocations: ['perforated timber walls', 'perforated acoustic panels', 'micro-perforated surface'],
        sample: 'Acoustic chambers concealed behind perforated timber walls adjust hall resonance smoothly.'
      }
    },
    questions: [
      {
        num: 1,
        type: 'tfng',
        statement: 'In traditional shoebox halls, narrow parallel side walls help deliver early lateral sound reflections to the audience.',
        correctAnswer: 'TRUE',
        evidencePara: 'A',
        trapTitle: 'TFNG Paraphrase Match: Lateral Wave Geometry',
        explanationEn: 'Paragraph A confirms that close parallel side walls bounce sound waves laterally toward listeners’ ears milliseconds after the direct orchestral note.',
        explanationBn: '[A] অনুচ্ছেদে নিশ্চিত করা হয়েছে যে সুবিন্যস্ত ও কাছাকাছি থাকা সমান্তরাল দেয়াল শব্দতরঙ্গকে পাশ থেকে শ্রোতাদের কানে পৌঁছে দেয়।'
      },
      {
        num: 2,
        type: 'tfng',
        statement: 'Mid-twentieth-century fan-shaped halls were originally designed primarily to improve musicians’ ability to hear one another on stage.',
        correctAnswer: 'FALSE',
        evidencePara: 'B',
        trapTitle: 'TFNG Purpose Trap: Revenue vs Acoustic Clarity',
        explanationEn: 'Paragraph B notes fan-shaped halls were commissioned "to maximize ticket revenue", and actually impaired musicians’ ability to hear fellow sections.',
        explanationBn: '[B] অনুচ্ছেদে বলা হয়েছে ফ্যান-আকৃতির হলগুলো টিকিট বিক্রি বাড়ানোর জন্য তৈরি হয়েছিল এবং এতে বাদ্যযন্ত্রীদের একে অপরকে শুনতে বরং অসুবিধা হতো।'
      },
      {
        num: 3,
        type: 'tfng',
        statement: 'Hans Scharoun modelled the Berlin Philharmonie’s vineyard terraces directly after ancient Greek open-air amphitheatres.',
        correctAnswer: 'NOT GIVEN',
        evidencePara: 'C',
        trapTitle: 'TFNG Trap: Plausible Unstated Inspiration',
        explanationEn: 'Paragraph C credits Hans Scharoun with introducing the vineyard terraced layout in 1963, but makes no mention of ancient Greek amphitheatres.',
        explanationBn: '[C] অনুচ্ছেদে হ্যান্স শারুনের ভিনিয়ার্ড ডিজাইনের কথা বলা হলেও প্রাচীন গ্রিক অ্যাম্ফিথিয়েটার থেকে অনুপ্রাণিত হওয়ার কোনো তথ্য নেই।'
      },
      {
        num: 4,
        type: 'matching',
        statement: 'Which paragraph describes mechanical features that let technicians alter a hall’s acoustic decay for different genres?',
        correctAnswer: 'D',
        evidencePara: 'D',
        trapTitle: 'Paragraph Matching: Variable Acoustic Engineering',
        explanationEn: 'Paragraph D details motorized canopies, retractable velvet banners, and variable-volume chambers that adjust decay from 1.2s (lectures) to 2.1s (symphonies).',
        explanationBn: '[D] অনুচ্ছেদে মোটরচালিত ক্যানোপি, ভেলভেট ব্যানার ও ভ্যারিয়েবল রিভারবারেশন চেম্বারের মাধ্যমে বিভিন্ন অনুষ্ঠানের জন্য শব্দের স্থায়িত্ব পরিবর্তনের ব্যাখ্যা রয়েছে।'
      }
    ]
  }
];
